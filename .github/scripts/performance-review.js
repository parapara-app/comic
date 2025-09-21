#!/usr/bin/env node

/**
 * Performance Review Script using OpenAI
 */

import { readFileSync, writeFileSync } from 'fs';
import { Octokit } from '@octokit/rest';
import OpenAI from 'openai';

// Initialize clients
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

// Environment variables
const prNumber = parseInt(process.env.PR_NUMBER);
const [owner, repo] = process.env.REPOSITORY.split('/');

// Performance patterns to check
const PERFORMANCE_PATTERNS = {
  react: {
    inefficient: [
      /\.map\([^)]*\)\.map\(/g, // Chained maps
      /\.filter\([^)]*\)\.map\(/g, // Filter then map (could be reduced)
      /useState.*\[\]/g, // Empty array in useState without type
      /useEffect\([^,]*\)/g, // useEffect without deps
    ],
    optimization: [
      /useMemo/g,
      /useCallback/g,
      /React\.memo/g,
      /lazy/g,
    ],
  },
  general: {
    loops: [
      /for.*in\s/g, // for-in loops (slow for arrays)
      /\.\.\./g, // Spread operator in loops
      /concat\(/g, // Array concat in loops
    ],
    memory: [
      /new Array\(\d{5,}\)/g, // Large array allocations
      /\.slice\(\)/g, // Array copying
      /JSON\.parse.*JSON\.stringify/g, // Deep cloning
    ],
  },
  database: {
    queries: [
      /SELECT \*/g, // Select all columns
      /N\+1/gi, // N+1 query pattern
      /JOIN.*JOIN.*JOIN/g, // Multiple joins
    ],
  },
};

/**
 * Get changed files from PR
 */
async function getChangedFiles() {
  const { data: files } = await octokit.pulls.listFiles({
    owner,
    repo,
    pull_number: prNumber,
  });

  return files.filter(file =>
    file.status !== 'removed' &&
    file.patch &&
    (file.filename.endsWith('.js') ||
     file.filename.endsWith('.ts') ||
     file.filename.endsWith('.jsx') ||
     file.filename.endsWith('.tsx') ||
     file.filename.endsWith('.rs'))
  );
}

/**
 * Check for performance patterns
 */
function checkPerformancePatterns(file) {
  const findings = {
    react: { inefficient: [], optimization: [] },
    general: { loops: [], memory: [] },
    database: { queries: [] },
  };

  const isReact = file.filename.includes('.tsx') || file.filename.includes('.jsx');
  const lines = file.patch.split('\n');

  lines.forEach((line, index) => {
    // Only check added lines
    if (!line.startsWith('+')) return;

    const lineContent = line.substring(1);
    const lineNumber = index + 1;

    // Check React patterns
    if (isReact) {
      for (const [key, patterns] of Object.entries(PERFORMANCE_PATTERNS.react)) {
        for (const pattern of patterns) {
          if (pattern.test(lineContent)) {
            findings.react[key].push({
              line: lineNumber,
              content: lineContent.trim(),
              pattern: pattern.source,
            });
          }
        }
      }
    }

    // Check general patterns
    for (const [key, patterns] of Object.entries(PERFORMANCE_PATTERNS.general)) {
      for (const pattern of patterns) {
        if (pattern.test(lineContent)) {
          findings.general[key].push({
            line: lineNumber,
            content: lineContent.trim(),
            pattern: pattern.source,
          });
        }
      }
    }

    // Check database patterns
    if (file.filename.includes('.rs') || lineContent.includes('query') || lineContent.includes('SELECT')) {
      for (const pattern of PERFORMANCE_PATTERNS.database.queries) {
        if (pattern.test(lineContent)) {
          findings.database.queries.push({
            line: lineNumber,
            content: lineContent.trim(),
            pattern: pattern.source,
          });
        }
      }
    }
  });

  return findings;
}

/**
 * Analyze performance with OpenAI
 */
async function analyzeWithOpenAI(file, findings) {
  const prompt = `You are a performance optimization expert. Review the following code changes and provide performance recommendations.

File: ${file.filename}
Language: ${file.filename.split('.').pop()}
Changes: +${file.additions} -${file.deletions}

Code Diff:
\`\`\`diff
${file.patch}
\`\`\`

Initial findings:
- React inefficiencies: ${findings.react.inefficient.length}
- React optimizations used: ${findings.react.optimization.length}
- Loop issues: ${findings.general.loops.length}
- Memory concerns: ${findings.general.memory.length}
- Database query issues: ${findings.database.queries.length}

Please analyze for:
1. **Algorithm Complexity**: O(n²) or worse patterns
2. **Memory Usage**: Unnecessary allocations, memory leaks
3. **Rendering Performance**: React re-render issues, virtual DOM thrashing
4. **Network Optimization**: Redundant API calls, missing caching
5. **Bundle Size**: Large imports, tree-shaking issues
6. **Database Performance**: Query optimization, indexing needs

Provide:
- **Performance Impact**: Critical/High/Medium/Low
- **Bottlenecks Found**: Specific performance issues
- **Optimization Suggestions**: Concrete improvements with code examples
- **Benchmarking Recommendations**: What to measure

Focus on measurable performance improvements, not micro-optimizations.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are a performance engineer specializing in web application optimization.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 1500,
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error(`Error analyzing ${file.filename}:`, error);
    return null;
  }
}

/**
 * Generate performance metrics suggestions
 */
function generateMetricsSuggestions(files) {
  const suggestions = [];

  const hasReact = files.some(f => f.filename.includes('.tsx') || f.filename.includes('.jsx'));
  const hasBackend = files.some(f => f.filename.includes('.rs') || f.filename.includes('.py'));
  const hasDatabase = files.some(f => f.patch && f.patch.includes('query'));

  if (hasReact) {
    suggestions.push('- **Frontend Metrics**: LCP, FID, CLS, TTI');
    suggestions.push('- **React Metrics**: Component render count, render time');
    suggestions.push('- **Bundle Size**: Before/after comparison');
  }

  if (hasBackend) {
    suggestions.push('- **API Metrics**: Response time (P50, P95, P99)');
    suggestions.push('- **Throughput**: Requests per second');
    suggestions.push('- **Resource Usage**: CPU, Memory, I/O');
  }

  if (hasDatabase) {
    suggestions.push('- **Query Performance**: Execution time, rows examined');
    suggestions.push('- **Connection Pool**: Active connections, wait time');
    suggestions.push('- **Cache Hit Rate**: Query cache, application cache');
  }

  return suggestions;
}

/**
 * Main execution
 */
async function main() {
  console.log(`Starting performance review for PR #${prNumber}`);

  try {
    const files = await getChangedFiles();
    console.log(`Found ${files.length} files to analyze`);

    if (files.length === 0) {
      writeFileSync('performance_results.md', '## ⚡ Performance Review\n\nNo files requiring performance analysis.\n');
      return;
    }

    const results = [];
    let hasHighImpact = false;

    for (const file of files) {
      console.log(`Analyzing ${file.filename}...`);

      // Check for patterns
      const findings = checkPerformancePatterns(file);

      // Get AI analysis
      const aiAnalysis = await analyzeWithOpenAI(file, findings);

      // Check impact level
      if (aiAnalysis && (aiAnalysis.includes('Critical') || aiAnalysis.includes('High'))) {
        hasHighImpact = true;
      }

      results.push({
        file,
        findings,
        aiAnalysis,
      });
    }

    // Generate report
    const report = [];
    report.push('## ⚡ Performance Review\n');
    report.push(`**Pull Request:** #${prNumber}`);
    report.push(`**Files Analyzed:** ${files.length}\n`);

    if (hasHighImpact) {
      report.push('### ⚠️ High Impact Performance Issues Detected\n');
      report.push('This PR contains performance issues that should be addressed.\n');
    } else {
      report.push('### ✅ No Critical Performance Issues\n');
    }

    // Add metrics suggestions
    report.push('## 📊 Recommended Performance Metrics\n');
    const metrics = generateMetricsSuggestions(files);
    if (metrics.length > 0) {
      metrics.forEach(m => report.push(m));
    } else {
      report.push('No specific metrics recommendations for this change.');
    }
    report.push('');

    // Add individual file results
    report.push('## 📝 Detailed Analysis\n');
    for (const result of results) {
      report.push(`### ${result.file.filename}\n`);

      // Show pattern findings summary
      const totalFindings =
        result.findings.react.inefficient.length +
        result.findings.general.loops.length +
        result.findings.general.memory.length +
        result.findings.database.queries.length;

      if (totalFindings > 0) {
        report.push(`**Pattern Detection:** ${totalFindings} potential issues found\n`);
      }

      // Show AI analysis
      if (result.aiAnalysis) {
        report.push(result.aiAnalysis);
      } else {
        report.push('*Analysis pending or skipped*');
      }

      report.push('\n---\n');
    }

    // Add performance tips
    report.push('## 💡 General Performance Tips\n');
    report.push('1. **Measure First**: Use profiling tools before optimizing');
    report.push('2. **User Impact**: Focus on user-perceived performance');
    report.push('3. **Progressive Enhancement**: Optimize critical paths first');
    report.push('4. **Caching Strategy**: Implement appropriate caching layers');
    report.push('5. **Lazy Loading**: Defer non-critical resource loading\n');

    // Add footer
    report.push('---');
    report.push('*Performance analysis powered by OpenAI GPT-4.*');
    report.push('*Always benchmark changes to verify improvements.*');

    writeFileSync('performance_results.md', report.join('\n'));
    console.log('Performance review completed');

  } catch (error) {
    console.error('Error during performance review:', error);
    process.exit(1);
  }
}

main();
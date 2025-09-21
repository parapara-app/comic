#!/usr/bin/env node

/**
 * Security Review Script using OpenAI
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

// Security patterns to check
const SECURITY_PATTERNS = {
  secrets: [
    /api[_-]?key/gi,
    /secret/gi,
    /token/gi,
    /password/gi,
    /private[_-]?key/gi,
    /access[_-]?key/gi,
  ],
  vulnerabilities: [
    /eval\(/g,
    /exec\(/g,
    /innerHTML/g,
    /dangerouslySetInnerHTML/g,
    /document\.write/g,
    /\.raw\(/g, // SQL raw queries
  ],
  dataExposure: [
    /console\.(log|error|warn|info)/g,
    /process\.env/g,
    /localStorage/g,
    /sessionStorage/g,
    /document\.cookie/g,
  ],
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
     file.filename.endsWith('.rs') ||
     file.filename.endsWith('.py'))
  );
}

/**
 * Check for security patterns in code
 */
function checkSecurityPatterns(patch) {
  const findings = {
    secrets: [],
    vulnerabilities: [],
    dataExposure: [],
  };

  const lines = patch.split('\n');

  lines.forEach((line, index) => {
    // Only check added lines
    if (!line.startsWith('+')) return;

    const lineContent = line.substring(1);
    const lineNumber = index + 1;

    // Check for secrets
    for (const pattern of SECURITY_PATTERNS.secrets) {
      if (pattern.test(lineContent)) {
        findings.secrets.push({
          line: lineNumber,
          content: lineContent.trim(),
          pattern: pattern.source,
        });
      }
    }

    // Check for vulnerabilities
    for (const pattern of SECURITY_PATTERNS.vulnerabilities) {
      if (pattern.test(lineContent)) {
        findings.vulnerabilities.push({
          line: lineNumber,
          content: lineContent.trim(),
          pattern: pattern.source,
        });
      }
    }

    // Check for data exposure
    for (const pattern of SECURITY_PATTERNS.dataExposure) {
      if (pattern.test(lineContent)) {
        findings.dataExposure.push({
          line: lineNumber,
          content: lineContent.trim(),
          pattern: pattern.source,
        });
      }
    }
  });

  return findings;
}

/**
 * Analyze security with OpenAI
 */
async function analyzeWithOpenAI(file, findings) {
  const prompt = `You are a security expert reviewing code changes. Analyze the following information and provide security recommendations.

File: ${file.filename}
Language: ${file.filename.split('.').pop()}

Code Diff:
\`\`\`diff
${file.patch}
\`\`\`

Pattern-based findings:
- Potential secrets: ${findings.secrets.length} occurrences
- Vulnerability patterns: ${findings.vulnerabilities.length} occurrences
- Data exposure risks: ${findings.dataExposure.length} occurrences

Please analyze for:
1. **Critical Security Issues**: Immediate vulnerabilities that must be fixed
2. **High-Risk Patterns**: Dangerous code patterns that could lead to security issues
3. **Data Protection**: Issues with handling sensitive data
4. **Authentication/Authorization**: Problems with access control
5. **Input Validation**: Missing or inadequate input sanitization
6. **Cryptography**: Weak or misused cryptographic functions

Format your response as:
- **Risk Level**: Critical/High/Medium/Low
- **Issues Found**: List of specific security problems
- **Recommendations**: How to fix each issue
- **Security Best Practices**: Additional suggestions for this type of code

Focus on actual security risks, not style or minor issues.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are a security expert specializing in application security and vulnerability assessment.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.2,
      max_tokens: 1500,
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error(`Error analyzing ${file.filename}:`, error);
    return null;
  }
}

/**
 * Format security findings
 */
function formatFindings(file, findings, aiAnalysis) {
  const sections = [];

  // Add file header
  sections.push(`### 🔍 ${file.filename}\n`);

  // Add pattern-based findings
  if (findings.secrets.length > 0) {
    sections.push('#### ⚠️ Potential Secrets Detected');
    findings.secrets.forEach(f => {
      sections.push(`- Line ${f.line}: \`${f.content.substring(0, 100)}...\``);
    });
    sections.push('');
  }

  if (findings.vulnerabilities.length > 0) {
    sections.push('#### 🔴 Vulnerability Patterns');
    findings.vulnerabilities.forEach(f => {
      sections.push(`- Line ${f.line}: \`${f.content.substring(0, 100)}...\``);
    });
    sections.push('');
  }

  if (findings.dataExposure.length > 0) {
    sections.push('#### 📊 Data Exposure Risks');
    findings.dataExposure.forEach(f => {
      sections.push(`- Line ${f.line}: \`${f.content.substring(0, 100)}...\``);
    });
    sections.push('');
  }

  // Add AI analysis
  if (aiAnalysis) {
    sections.push('#### 🤖 AI Security Analysis\n');
    sections.push(aiAnalysis);
  }

  sections.push('\n---\n');
  return sections.join('\n');
}

/**
 * Main execution
 */
async function main() {
  console.log(`Starting security review for PR #${prNumber}`);

  try {
    const files = await getChangedFiles();
    console.log(`Found ${files.length} files to analyze`);

    if (files.length === 0) {
      writeFileSync('security_results.md', '## 🔒 Security Review\n\nNo files requiring security analysis.\n');
      return;
    }

    const results = [];
    let hasCriticalIssues = false;

    for (const file of files) {
      console.log(`Analyzing ${file.filename}...`);

      // Check for patterns
      const findings = checkSecurityPatterns(file.patch);

      // Get AI analysis
      const aiAnalysis = await analyzeWithOpenAI(file, findings);

      // Check if critical
      if (aiAnalysis && (aiAnalysis.includes('Critical') || aiAnalysis.includes('🔴'))) {
        hasCriticalIssues = true;
      }

      results.push({
        file,
        findings,
        aiAnalysis,
      });
    }

    // Generate report
    const report = [];
    report.push('## 🔒 Security Review\n');
    report.push(`**Pull Request:** #${prNumber}`);
    report.push(`**Files Analyzed:** ${files.length}`);

    if (hasCriticalIssues) {
      report.push('\n### ⚠️ CRITICAL SECURITY ISSUES DETECTED\n');
      report.push('This PR contains security issues that must be addressed before merging.\n');
    } else {
      report.push('\n### ✅ No Critical Security Issues\n');
    }

    // Add individual file results
    report.push('## Detailed Analysis\n');
    for (const result of results) {
      report.push(formatFindings(result.file, result.findings, result.aiAnalysis));
    }

    // Add footer
    report.push('\n---');
    report.push('*Security analysis powered by OpenAI GPT-4 and pattern matching.*');
    report.push('*Always perform manual security review for critical changes.*');

    writeFileSync('security_results.md', report.join('\n'));
    console.log('Security review completed');

  } catch (error) {
    console.error('Error during security review:', error);
    process.exit(1);
  }
}

main();
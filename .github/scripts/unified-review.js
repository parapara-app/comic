#!/usr/bin/env node

/**
 * Unified AI Review Script - Code, Security, and Performance in one request
 */

import { Octokit } from '@octokit/rest';
import { writeFileSync } from 'fs';
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
    /\.raw\(/g,
  ],
  dataExposure: [
    /console\.(log|error|warn|info)/g,
    /process\.env/g,
    /localStorage/g,
    /sessionStorage/g,
    /document\.cookie/g,
  ],
};

// Performance patterns to check
const PERFORMANCE_PATTERNS = {
  react: [
    /\.map\([^)]*\)\.map\(/g,
    /\.filter\([^)]*\)\.map\(/g,
    /useState.*\[\]/g,
    /useEffect\([^,]*\)/g,
  ],
  loops: [
    /for.*in\s/g,
    /\.\.\./g,
    /concat\(/g,
  ],
  database: [
    /SELECT \*/g,
    /N\+1/gi,
    /JOIN.*JOIN.*JOIN/g,
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
  ).slice(0, 20); // Max 20 files
}

/**
 * Check for patterns in code
 */
function checkPatterns(patch) {
  const securityFindings = {
    secrets: 0,
    vulnerabilities: 0,
    dataExposure: 0,
  };
  const performanceFindings = {
    react: 0,
    loops: 0,
    database: 0,
  };

  const lines = patch.split('\n');

  lines.forEach(line => {
    if (!line.startsWith('+')) return;
    const lineContent = line.substring(1);

    // Security checks
    SECURITY_PATTERNS.secrets.forEach(pattern => {
      if (pattern.test(lineContent)) securityFindings.secrets++;
    });
    SECURITY_PATTERNS.vulnerabilities.forEach(pattern => {
      if (pattern.test(lineContent)) securityFindings.vulnerabilities++;
    });
    SECURITY_PATTERNS.dataExposure.forEach(pattern => {
      if (pattern.test(lineContent)) securityFindings.dataExposure++;
    });

    // Performance checks
    PERFORMANCE_PATTERNS.react.forEach(pattern => {
      if (pattern.test(lineContent)) performanceFindings.react++;
    });
    PERFORMANCE_PATTERNS.loops.forEach(pattern => {
      if (pattern.test(lineContent)) performanceFindings.loops++;
    });
    PERFORMANCE_PATTERNS.database.forEach(pattern => {
      if (pattern.test(lineContent)) performanceFindings.database++;
    });
  });

  return { security: securityFindings, performance: performanceFindings };
}

/**
 * Analyze all files with a single OpenAI request
 */
async function analyzeWithOpenAI(filesData) {
  // Prepare file summaries
  const filesSummary = filesData.map(({ file, patterns }) => {
    // Limit patch to added lines only (max 100 lines per file)
    const patchLines = file.patch.split('\n');
    const addedLines = patchLines
      .filter(line => line.startsWith('+'))
      .slice(0, 100)
      .join('\n');

    return `
📁 **${file.filename}** (${file.additions}+ ${file.deletions}-)
\`\`\`diff
${addedLines}
\`\`\`
패턴 검출:
- 보안: 시크릿(${patterns.security.secrets}), 취약점(${patterns.security.vulnerabilities}), 데이터노출(${patterns.security.dataExposure})
- 성능: React(${patterns.performance.react}), 루프(${patterns.performance.loops}), DB(${patterns.performance.database})
`;
  }).join('\n---\n');

  const prompt = `Pull Request #${prNumber}의 변경사항을 종합적으로 검토해주세요. **한국어로 답변해주세요.**

총 ${filesData.length}개 파일 변경:
${filesSummary}

다음 관점에서 **통합 리뷰**를 작성해주세요:

## 1. 코드 품질
- 가독성과 유지보수성
- 베스트 프랙티스 준수
- 아키텍처 일관성

## 2. 보안 분석
- 심각한 보안 취약점
- 데이터 보호 문제
- 인증/인가 이슈

## 3. 성능 최적화
- 알고리즘 복잡도 문제
- 메모리 누수 가능성
- 렌더링 성능 (React)
- 데이터베이스 쿼리 효율성

## 4. 종합 평가

응답 형식:
### 🎯 전체 요약
(PR의 주요 변경사항과 목적)

### ✅ 잘한 점
(칭찬할 만한 코드 작성 사례)

### 🚨 반드시 수정 필요
(머지 전 반드시 해결해야 할 심각한 문제)

### ⚠️ 개선 권장사항
(품질 향상을 위한 제안)

### 📊 리스크 레벨
전반적 위험도: 낮음/중간/높음/심각

간결하고 실행 가능한 피드백을 제공하되, 사소한 스타일 이슈는 무시하세요.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-5-mini',
      messages: [
        {
          role: 'system',
          content: '당신은 코드 리뷰, 보안, 성능 최적화를 전문으로 하는 시니어 엔지니어입니다. 실용적이고 구체적인 피드백을 제공합니다.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.2,
      max_completion_tokens: 2500,
    });

    return { success: true, content: completion.choices[0].message.content };
  } catch (error) {
    console.error('Error analyzing with OpenAI:', error);
    const errorMessage = error?.response?.data?.error?.message || error?.message || 'Unknown error';
    return { success: false, error: errorMessage };
  }
}

/**
 * Main execution
 */
async function main() {
  console.log(`Starting unified AI review for PR #${prNumber}`);

  try {
    // Get changed files
    const files = await getChangedFiles();
    console.log(`Found ${files.length} files to review`);

    if (files.length === 0) {
      writeFileSync('unified_review.md', '## 🤖 AI 통합 리뷰\n\n리뷰할 파일이 없습니다.\n');
      return;
    }

    // Analyze patterns for each file
    const filesData = files.map(file => {
      const patterns = checkPatterns(file.patch || '');
      return { file, patterns };
    });

    // Calculate totals
    const totalPatterns = filesData.reduce((acc, { patterns }) => {
      acc.security += patterns.security.secrets + patterns.security.vulnerabilities + patterns.security.dataExposure;
      acc.performance += patterns.performance.react + patterns.performance.loops + patterns.performance.database;
      return acc;
    }, { security: 0, performance: 0 });

    console.log(`Pattern detection: Security(${totalPatterns.security}), Performance(${totalPatterns.performance})`);
    console.log('Sending single API request to OpenAI...');

    // Make single API call
    const aiResult = await analyzeWithOpenAI(filesData);

    // Generate report
    const report = [];
    report.push('## 🤖 AI 통합 리뷰\n');
    report.push(`**Pull Request:** #${prNumber}`);
    report.push(`**분석된 파일:** ${files.length}개`);
    report.push(`**패턴 검출:** 보안(${totalPatterns.security}개), 성능(${totalPatterns.performance}개)`);

    if (aiResult && aiResult.success) {
      report.push(aiResult.content);
    } else {
      report.push('### ⚠️ 리뷰 실패\n');
      report.push('AI 분석을 완료할 수 없습니다.');
      report.push(`\n**오류 내용:** ${aiResult?.error || 'Unknown error'}`);
      report.push('\n**가능한 원인:**');
      report.push('- OpenAI API 키가 올바르게 설정되지 않음');
      report.push('- 모델 접근 권한 부족 (gpt-5-mini)');
      report.push('- API 요청 한도 초과');
      report.push('- 네트워크 연결 문제');
    }

    report.push('\n---');
    report.push('*OpenAI GPT-5-mini 기반 통합 리뷰 (코드/보안/성능)*');
    report.push('*이 리뷰는 참고용이며, 최종 판단은 개발자가 내려주세요.*');

    writeFileSync('unified_review.md', report.join('\n'));
    console.log('Unified review completed successfully');

  } catch (error) {
    console.error('Error during unified review:', error);
    process.exit(1);
  }
}

main();
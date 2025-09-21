#!/usr/bin/env node

/**
 * OpenAI Code Review Script for GitHub Pull Requests
 */

import { readFileSync, writeFileSync } from 'fs';
import { Octokit } from '@octokit/rest';
import OpenAI from 'openai';

// Configuration
const MAX_FILE_SIZE = 50000; // Maximum file size to review (in bytes)
const MAX_FILES_PER_REVIEW = 20; // Maximum number of files to review at once
const OPENAI_MODEL = 'gpt-4-turbo-preview'; // Model to use for code review

// Initialize clients
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

// Get environment variables
const prNumber = parseInt(process.env.PR_NUMBER);
const [owner, repo] = process.env.REPOSITORY.split('/');

/**
 * Determine the programming language based on file extension
 */
function getFileLanguage(filename) {
  const extMap = {
    '.ts': 'TypeScript',
    '.tsx': 'TypeScript React',
    '.js': 'JavaScript',
    '.jsx': 'JavaScript React',
    '.rs': 'Rust',
    '.py': 'Python',
    '.yml': 'YAML',
    '.yaml': 'YAML',
    '.json': 'JSON',
    '.md': 'Markdown',
    '.toml': 'TOML',
    '.sh': 'Shell',
    '.sql': 'SQL',
    '.html': 'HTML',
    '.css': 'CSS',
    '.scss': 'SCSS',
    '.sass': 'SASS',
  };

  const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();
  return extMap[ext] || 'Unknown';
}

/**
 * Get list of changed files in the PR
 */
async function getChangedFiles() {
  try {
    const { data: files } = await octokit.pulls.listFiles({
      owner,
      repo,
      pull_number: prNumber,
    });

    const changedFiles = [];

    for (const file of files) {
      // Skip deleted files
      if (file.status === 'removed') continue;

      // Skip large files
      if (file.additions > 1000) {
        console.log(`Skipping large file: ${file.filename}`);
        continue;
      }

      // Skip files without changes
      if (file.additions + file.deletions === 0) continue;

      changedFiles.push({
        filename: file.filename,
        patch: file.patch,
        additions: file.additions,
        deletions: file.deletions,
        status: file.status,
        language: getFileLanguage(file.filename),
      });

      // Limit number of files to review
      if (changedFiles.length >= MAX_FILES_PER_REVIEW) break;
    }

    return changedFiles;
  } catch (error) {
    console.error('Error fetching changed files:', error);
    throw error;
  }
}

/**
 * Create a prompt for OpenAI to review the code
 */
function createReviewPrompt(fileInfo) {
  return `당신은 전문 코드 리뷰어입니다. 다음 코드 변경사항을 검토하고 건설적인 피드백을 제공해주세요.

파일: ${fileInfo.filename}
언어: ${fileInfo.language}
상태: ${fileInfo.status}
변경사항: +${fileInfo.additions} -${fileInfo.deletions}

코드 변경:
\`\`\`diff
${fileInfo.patch}
\`\`\`

다음 항목들을 분석해주세요:
1. **코드 품질**: 가독성, 유지보수성, 베스트 프랙티스 준수
2. **잠재적 버그**: 논리 오류, 엣지 케이스, 런타임 이슈
3. **보안 이슈**: 취약점, 데이터 노출, 인젝션 리스크
4. **성능**: 비효율성 또는 최적화 기회
5. **테스트**: 누락된 테스트 커버리지 또는 테스트 가능성 문제
6. **문서화**: 누락되거나 불명확한 주석/문서

다음 형식으로 응답해주세요:
- **요약**: 변경사항의 간략한 개요
- **장점**: 잘 작성된 부분
- **문제점**: 수정이 필요한 문제 (있는 경우)
- **제안사항**: 개선을 위한 권고사항
- **위험 수준**: 낮음/중간/높음

건설적이고 구체적으로 작성하세요. 스타일 선호보다는 중요한 이슈에 집중하세요.`;
}

/**
 * Review a single file using OpenAI
 */
async function reviewFile(fileInfo) {
  try {
    const prompt = createReviewPrompt(fileInfo);

    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: 'system',
          content: '당신은 코드 리뷰를 수행하는 시니어 소프트웨어 엔지니어입니다. 한국어로 리뷰를 작성해주세요.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 1500,
    });

    const reviewText = completion.choices[0].message.content;

    return {
      filename: fileInfo.filename,
      language: fileInfo.language,
      review: reviewText,
      status: 'success',
    };
  } catch (error) {
    console.error(`Error reviewing ${fileInfo.filename}:`, error);
    return {
      filename: fileInfo.filename,
      language: fileInfo.language,
      review: null,
      status: 'error',
      error: error.message,
    };
  }
}

/**
 * Create a prompt for generating an overall summary
 */
function createSummaryPrompt(reviews) {
  const reviewsText = reviews
    .filter(r => r.status === 'success')
    .map(r => `파일: ${r.filename}\n${r.review}`)
    .join('\n\n');

  return `다음 개별 파일 리뷰를 바탕으로 Pull Request의 전체 요약을 제공해주세요:

${reviewsText}

다음 내용을 제공해주세요:
1. **전체 평가**: PR의 전반적인 품질과 머지 준비 상태
2. **주요 장점**: 모든 변경사항에서의 주요 긍정적 측면
3. **중요 이슈**: 해결해야 할 가장 중요한 문제들 (있는 경우)
4. **권장 조치사항**: 우선순위가 정해진 작업 목록
5. **승인 권고사항**: 머지 가능 / 사소한 변경 필요 / 주요 변경 필요

간결하고 실행 가능하게 작성해주세요.`;
}

/**
 * Generate an overall summary of the code review
 */
async function generateSummary(reviews) {
  try {
    const prompt = createSummaryPrompt(reviews);

    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: 'system',
          content: '당신은 코드 리뷰 결과를 요약하는 시니어 소프트웨어 엔지니어입니다. 한국어로 요약을 작성해주세요.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.2,
      max_tokens: 1000,
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error('Error generating summary:', error);
    return 'Unable to generate summary due to an error.';
  }
}

/**
 * Format a single file review for markdown output
 */
function formatReviewComment(review) {
  if (review.status === 'error') {
    return `### 📄 ${review.filename}\n\n⚠️ Review could not be completed: ${review.error || 'Unknown error'}\n`;
  }

  return `### 📄 ${review.filename} (${review.language})

${review.review}

---
`;
}

/**
 * Save review results to a markdown file
 */
function saveReviewResults(reviews, summary) {
  const content = [];

  // Write header
  content.push(`## 🤖 AI 코드 리뷰\n`);
  content.push(`**Pull Request:** #${prNumber}`);
  content.push(`**검토한 파일 수:** ${reviews.length}`);
  content.push(`**모델:** ${OPENAI_MODEL}\n`);

  // Write overall summary
  content.push(`## 📊 전체 요약\n`);
  content.push(summary);
  content.push('\n');

  // Write individual file reviews
  content.push(`## 📝 상세 파일 리뷰\n`);
  for (const review of reviews) {
    content.push(formatReviewComment(review));
  }

  // Write footer
  content.push('\n---');
  content.push('*이 리뷰는 OpenAI GPT-4에 의해 자동으로 생성되었습니다. ');
  content.push('피드백을 처리할 때는 제안사항으로 참고하시고 여러분의 판단을 우선해주세요.*');

  writeFileSync('review_results.md', content.join('\n'));
}

/**
 * Post inline comments on specific lines if critical issues are found
 */
async function postInlineComments(reviews) {
  for (const review of reviews) {
    if (review.status !== 'success') continue;

    // Check for high-risk issues in the review
    const hasHighRisk = ['critical', 'security', 'vulnerability', 'high risk'].some(
      word => review.review.toLowerCase().includes(word)
    );

    if (hasHighRisk) {
      try {
        // Get the pull request data
        const { data: pr } = await octokit.pulls.get({
          owner,
          repo,
          pull_number: prNumber,
        });

        // Create a review comment
        await octokit.pulls.createReviewComment({
          owner,
          repo,
          pull_number: prNumber,
          body: `🚨 **AI 리뷰 경고**\n\n잠재적 이슈가 감지되었습니다. 이 파일에 대한 AI 분석을 검토해주세요.`,
          commit_id: pr.head.sha,
          path: review.filename,
          line: 1, // In production, parse the actual line from the diff
        });
      } catch (error) {
        console.error(`Could not post inline comment: ${error.message}`);
      }
    }
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log(`Starting AI code review for PR #${prNumber}`);

  try {
    // Get changed files
    const changedFiles = await getChangedFiles();
    console.log(`Found ${changedFiles.length} files to review`);

    if (changedFiles.length === 0) {
      console.log('No files to review');
      writeFileSync(
        'review_results.md',
        '## 🤖 AI Code Review\n\nNo reviewable files found in this pull request.\n'
      );
      return;
    }

    // Review each file
    const reviews = [];
    for (let i = 0; i < changedFiles.length; i++) {
      console.log(`Reviewing file ${i + 1}/${changedFiles.length}: ${changedFiles[i].filename}`);
      const review = await reviewFile(changedFiles[i]);
      reviews.push(review);
    }

    // Generate overall summary
    console.log('Generating overall summary...');
    const summary = await generateSummary(reviews);

    // Save results
    saveReviewResults(reviews, summary);

    // Post inline comments for critical issues
    await postInlineComments(reviews);

    console.log('Code review completed successfully');
  } catch (error) {
    console.error('Error during code review:', error);
    process.exit(1);
  }
}

// Run the script
main();
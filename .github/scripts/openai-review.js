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
  return `You are an expert code reviewer. Please review the following code changes and provide constructive feedback.

File: ${fileInfo.filename}
Language: ${fileInfo.language}
Status: ${fileInfo.status}
Changes: +${fileInfo.additions} -${fileInfo.deletions}

Code Diff:
\`\`\`diff
${fileInfo.patch}
\`\`\`

Please analyze the code for:
1. **Code Quality**: Readability, maintainability, and adherence to best practices
2. **Potential Bugs**: Logic errors, edge cases, or runtime issues
3. **Security Issues**: Vulnerabilities, data exposure, or injection risks
4. **Performance**: Inefficiencies or optimization opportunities
5. **Testing**: Missing test coverage or testability concerns
6. **Documentation**: Missing or unclear comments/documentation

Format your response as:
- **Summary**: Brief overview of the changes
- **Strengths**: What's done well
- **Issues**: Problems that need fixing (if any)
- **Suggestions**: Recommendations for improvement
- **Risk Level**: Low/Medium/High

Be constructive and specific. Focus on important issues rather than style preferences.`;
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
          content: 'You are a senior software engineer performing code review.',
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
    .map(r => `File: ${r.filename}\n${r.review}`)
    .join('\n\n');

  return `Based on the following individual file reviews, provide an overall summary of the pull request:

${reviewsText}

Please provide:
1. **Overall Assessment**: General quality and readiness of the PR
2. **Key Strengths**: Main positive aspects across all changes
3. **Critical Issues**: Most important problems to address (if any)
4. **Recommended Actions**: Prioritized list of what needs to be done
5. **Approval Recommendation**: Ready to merge / Needs minor changes / Needs major changes

Keep the summary concise and actionable.`;
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
          content: 'You are a senior software engineer summarizing code review findings.',
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
  content.push(`## 🤖 AI Code Review\n`);
  content.push(`**Pull Request:** #${prNumber}`);
  content.push(`**Files Reviewed:** ${reviews.length}`);
  content.push(`**Model:** ${OPENAI_MODEL}\n`);

  // Write overall summary
  content.push(`## 📊 Overall Summary\n`);
  content.push(summary);
  content.push('\n');

  // Write individual file reviews
  content.push(`## 📝 Detailed File Reviews\n`);
  for (const review of reviews) {
    content.push(formatReviewComment(review));
  }

  // Write footer
  content.push('\n---');
  content.push('*This review was generated automatically by OpenAI GPT-4. ');
  content.push('Please consider it as suggestions and use your judgment when addressing the feedback.*');

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
          body: `🚨 **AI Review Alert**\n\nPotential issue detected. Please review the AI analysis for this file.`,
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
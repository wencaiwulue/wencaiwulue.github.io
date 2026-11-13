#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const MAX_RECENT_POSTS = 4;

/**
 * Extract title from Markdown file
 * Priority: front matter title -> first H1 -> cleaned filename
 * @param {string} filePath - Path to Markdown file
 * @param {string} content - File content
 * @returns {string} Extracted title
 */
export function extractTitle(filePath, content) {
  const { data } = matter(content);

  // 1. Front matter title
  if (data.title) {
    return data.title;
  }

  // 2. First H1
  const h1Match = content.match(/^#\s+(.+)$/m);
  if (h1Match) {
    return h1Match[1].trim();
  }

  // 3. Cleaned filename
  const basename = path.basename(filePath, '.md');
  // Remove date prefix if present (YYYY-MM-DD-)
  const withoutDate = basename.replace(/^\d{4}-\d{2}-\d{2}-/, '');
  // Replace hyphens with spaces
  return withoutDate.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Extract date from filename (YYYY-MM-DD prefix)
 * @param {string} filePath - Path to Markdown file
 * @returns {string} Date in YYYY-MM-DD format
 */
export function extractDate(filePath) {
  const basename = path.basename(filePath);
  const match = basename.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : '';
}

/**
 * Generate permalink from file path and front matter
 * @param {string} filePath - Full path to Markdown file
 * @param {string} docsDir - Root docs directory
 * @param {object} frontMatter - Parsed front matter
 * @returns {string} Permalink
 */
export function generatePermalink(filePath, docsDir, frontMatter) {
  // Handle slug if present
  if (frontMatter.slug) {
    const slug = frontMatter.slug;
    // Absolute slug (starts with /)
    if (slug.startsWith('/')) {
      return slug;
    }
    // Relative slug - resolve within section
    const relativePath = path.relative(docsDir, filePath);
    const section = path.dirname(relativePath);
    if (section === '.') {
      return `/${slug}`;
    }
    return `/${section}/${slug}`;
  }

  // No slug - use relative path without .md, URL slashes
  const relativePath = path.relative(docsDir, filePath);
  const withoutExt = relativePath.replace(/\.md$/, '');
  return '/' + withoutExt.split(path.sep).join('/');
}

/**
 * Check if a file should be included based on path and front matter
 * @param {string} filePath - Path to Markdown file (relative to docsDir)
 * @param {object} frontMatter - Parsed front matter
 * @returns {boolean} True if file should be included
 */
export function shouldIncludeFile(filePath, frontMatter) {
  const basename = path.basename(filePath);

  // Exclude quickstart.md
  if (filePath === 'quickstart.md' || filePath.endsWith('/quickstart.md')) {
    return false;
  }

  // Only include files with YYYY-MM-DD prefix
  if (!/^\d{4}-\d{2}-\d{2}/.test(basename)) {
    return false;
  }

  // Check front matter for draft/unlisted
  if (frontMatter.draft === true || frontMatter.unlisted === true) {
    return false;
  }

  return true;
}

/**
 * Sort posts: date descending, then permalink/to ascending (deterministic)
 * @param {Array<{date: string, permalink?: string, to?: string, title: string}>} posts - Posts to sort
 * @returns {Array<{date: string, permalink?: string, to?: string, title: string}>} Sorted posts
 */
export function sortPosts(posts) {
  return [...posts].sort((a, b) => {
    // Date descending
    if (a.date !== b.date) {
      return b.date.localeCompare(a.date);
    }
    // Permalink or to ascending for ties
    const aKey = a.permalink || a.to || '';
    const bKey = b.permalink || b.to || '';
    return aKey.localeCompare(bKey);
  });
}

/**
 * Select top N posts (default MAX_RECENT_POSTS)
 * @param {Array} posts - Sorted posts
 * @param {number} count - Number to select (optional)
 * @returns {Array} Top N posts
 */
export function selectTopPosts(posts, count = MAX_RECENT_POSTS) {
  return posts.slice(0, count);
}

/**
 * Find all Markdown files in a directory recursively
 * @param {string} dir - Directory to search
 * @returns {Promise<string[]>} Array of file paths
 */
async function findMarkdownFiles(dir) {
  const files = [];

  async function traverse(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await traverse(fullPath);
      } else if (entry.name.endsWith('.md')) {
        files.push(fullPath);
      }
    }
  }

  await traverse(dir);
  return files;
}

/**
 * Generate content metadata and write to src/generated/recent-posts.json
 * @param {string} docsDir - Root docs directory
 * @param {string} outputPath - Output JSON file path
 */
export async function generateContentMetadata(docsDir, outputPath) {
  // Find all Markdown files
  const allFiles = await findMarkdownFiles(docsDir);

  // Process each file (read once per file)
  const posts = [];
  for (const fullPath of allFiles) {
    const content = await fs.readFile(fullPath, 'utf-8');
    const { data: frontMatter } = matter(content);
    const relativePath = path.relative(docsDir, fullPath);

    // Check if should include
    if (!shouldIncludeFile(relativePath, frontMatter)) {
      continue;
    }

    // Extract metadata
    const title = extractTitle(fullPath, content);
    const date = extractDate(fullPath);
    const to = generatePermalink(fullPath, docsDir, frontMatter);

    posts.push({ title, date, to });
  }

  // Sort and select top posts
  const sortedPosts = sortPosts(posts);
  const topPosts = selectTopPosts(sortedPosts);

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  await fs.mkdir(outputDir, { recursive: true });

  // Write JSON
  await fs.writeFile(outputPath, JSON.stringify(topPosts, null, 2), 'utf-8');

  return topPosts;
}

// If called directly, run generation
if (import.meta.url === `file://${process.argv[1]}`) {
  const docsDir = path.join(__dirname, '..', 'docs');
  const outputPath = path.join(__dirname, '..', 'src', 'generated', 'recent-posts.json');

  generateContentMetadata(docsDir, outputPath)
    .then(() => {
      console.log('Generated recent-posts.json successfully');
    })
    .catch((err) => {
      console.error('Error generating content metadata:', err);
      process.exit(1);
    });
}

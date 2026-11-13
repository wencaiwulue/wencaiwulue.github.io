import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import {
  extractTitle,
  extractDate,
  generatePermalink,
  shouldIncludeFile,
  sortPosts,
  selectTopPosts,
  generateContentMetadata,
  MAX_RECENT_POSTS
} from './generate-content-metadata.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('content metadata generation', () => {
  let tempDir;
  let docsDir;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'content-test-'));
    docsDir = path.join(tempDir, 'docs');
    await fs.mkdir(docsDir);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('extractTitle', () => {
    it('should use front matter title if available', async () => {
      const content = `---
title: Front Matter Title
---
# H1 Title
content`;
      const filePath = path.join(docsDir, '2024-01-01-test.md');
      await fs.writeFile(filePath, content);

      const result = extractTitle(filePath, content);
      assert.strictEqual(result, 'Front Matter Title');
    });

    it('should use first H1 if no front matter title', async () => {
      const content = `---
authors: naison
---
# H1 Title
content`;
      const filePath = path.join(docsDir, '2024-01-01-test.md');
      await fs.writeFile(filePath, content);

      const result = extractTitle(filePath, content);
      assert.strictEqual(result, 'H1 Title');
    });

    it('should use cleaned filename if no front matter or H1', async () => {
      const content = 'content without header';
      const filePath = path.join(docsDir, '2024-01-01-My-Test-Post.md');
      await fs.writeFile(filePath, content);

      const result = extractTitle(filePath, content);
      assert.strictEqual(result, 'My Test Post');
    });

    it('should handle filename with Chinese characters', async () => {
      const content = 'content';
      const filePath = path.join(docsDir, '2024-01-01-我的-测试-文章.md');
      await fs.writeFile(filePath, content);

      const result = extractTitle(filePath, content);
      assert.strictEqual(result, '我的 测试 文章');
    });
  });

  describe('extractDate', () => {
    it('should extract date from filename', async () => {
      const filePath = path.join(docsDir, '2024-01-01-test.md');
      const result = extractDate(filePath);
      assert.strictEqual(result, '2024-01-01');
    });

    it('should handle different date formats in filename', async () => {
      const filePath1 = path.join(docsDir, '2024-01-01-test.md');
      const filePath2 = path.join(docsDir, '2023-12-31-test.md');

      assert.strictEqual(extractDate(filePath1), '2024-01-01');
      assert.strictEqual(extractDate(filePath2), '2023-12-31');
    });
  });

  describe('generatePermalink', () => {
    it('should generate permalink from relative path without .md', async () => {
      const blogDir = path.join(docsDir, 'blog');
      await fs.mkdir(blogDir);
      const filePath = path.join(blogDir, '2024-01-01-test.md');
      const frontMatter = {};

      const result = generatePermalink(filePath, docsDir, frontMatter);
      assert.strictEqual(result, '/blog/2024-01-01-test');
    });

    it('should use URL slashes for permalink', async () => {
      const llmDir = path.join(docsDir, 'llm');
      await fs.mkdir(llmDir);
      const filePath = path.join(llmDir, '2024-01-01-test.md');
      const frontMatter = {};

      const result = generatePermalink(filePath, docsDir, frontMatter);
      assert.strictEqual(result, '/llm/2024-01-01-test');
    });

    it('should handle relative slug within section', async () => {
      const ideDir = path.join(docsDir, 'ide');
      await fs.mkdir(ideDir);
      const filePath = path.join(ideDir, '2024-01-01-test.md');
      const frontMatter = { slug: 'ot' };

      const result = generatePermalink(filePath, docsDir, frontMatter);
      assert.strictEqual(result, '/ide/ot');
    });

    it('should handle absolute slug', async () => {
      const blogDir = path.join(docsDir, 'blog');
      await fs.mkdir(blogDir);
      const filePath = path.join(blogDir, '2024-01-01-test.md');
      const frontMatter = { slug: '/absolute/path' };

      const result = generatePermalink(filePath, docsDir, frontMatter);
      assert.strictEqual(result, '/absolute/path');
    });

    it('should handle relative slug in root section', async () => {
      const filePath = path.join(docsDir, '2024-01-01-test.md');
      const frontMatter = { slug: 'root-slug' };

      const result = generatePermalink(filePath, docsDir, frontMatter);
      assert.strictEqual(result, '/root-slug');
    });
  });

  describe('shouldIncludeFile', () => {
    it('should exclude quickstart.md', async () => {
      const result = shouldIncludeFile('quickstart.md', {});
      assert.strictEqual(result, false);
    });

    it('should exclude quickstart.md in subdir', async () => {
      const result = shouldIncludeFile('blog/quickstart.md', {});
      assert.strictEqual(result, false);
    });

    it('should exclude files without date prefix', async () => {
      const result = shouldIncludeFile('no-date.md', {});
      assert.strictEqual(result, false);
    });

    it('should include files with YYYY-MM-DD prefix', async () => {
      const result = shouldIncludeFile('2024-01-01-test.md', {});
      assert.strictEqual(result, true);
    });

    it('should exclude files with draft: true in front matter', async () => {
      const result = shouldIncludeFile('2024-01-01-draft.md', { draft: true });
      assert.strictEqual(result, false);
    });

    it('should exclude files with unlisted: true in front matter', async () => {
      const result = shouldIncludeFile('2024-01-01-unlisted.md', { unlisted: true });
      assert.strictEqual(result, false);
    });

    it('should include files with draft: false or no draft field', async () => {
      const result1 = shouldIncludeFile('2024-01-01-test1.md', { title: 'Test' });
      const result2 = shouldIncludeFile('2024-01-01-test2.md', { draft: false });
      assert.strictEqual(result1, true);
      assert.strictEqual(result2, true);
    });
  });

  describe('sortPosts', () => {
    it('should sort by date descending', async () => {
      const posts = [
        { date: '2024-01-01', title: 'Oldest', to: '/blog/1', permalink: '/blog/1' },
        { date: '2024-03-01', title: 'Middle', to: '/blog/3', permalink: '/blog/3' },
        { date: '2024-02-01', title: 'Newer', to: '/blog/2', permalink: '/blog/2' },
      ];

      const result = sortPosts(posts);
      assert.strictEqual(result[0].title, 'Middle');
      assert.strictEqual(result[1].title, 'Newer');
      assert.strictEqual(result[2].title, 'Oldest');
    });

    it('should sort by permalink ascending for same date (deterministic)', async () => {
      const posts = [
        { date: '2024-01-01', title: 'Z', to: '/blog/z-post', permalink: '/blog/z-post' },
        { date: '2024-01-01', title: 'A', to: '/blog/a-post', permalink: '/blog/a-post' },
        { date: '2024-01-01', title: 'M', to: '/blog/m-post', permalink: '/blog/m-post' },
      ];

      const result = sortPosts(posts);
      assert.strictEqual(result[0].title, 'A');
      assert.strictEqual(result[1].title, 'M');
      assert.strictEqual(result[2].title, 'Z');
    });
  });

  describe('selectTopPosts', () => {
    it('should use MAX_RECENT_POSTS constant', async () => {
      assert.strictEqual(MAX_RECENT_POSTS, 4);
    });

    it('should select exactly first MAX_RECENT_POSTS posts after sorting', async () => {
      const posts = Array.from({ length: 10 }, (_, i) => ({
        date: `2024-${String(10 - i).padStart(2, '0')}-01`,
        title: `Post ${10 - i}`,
        to: `/blog/post-${10 - i}`,
        permalink: `/blog/post-${10 - i}`,
      }));

      const result = selectTopPosts(posts);
      assert.strictEqual(result.length, MAX_RECENT_POSTS);
      assert.strictEqual(result[0].title, 'Post 10');
      assert.strictEqual(result[1].title, 'Post 9');
      assert.strictEqual(result[2].title, 'Post 8');
      assert.strictEqual(result[3].title, 'Post 7');
    });

    it('should handle fewer than MAX_RECENT_POSTS posts', async () => {
      const posts = [
        { date: '2024-01-01', title: 'Post 1', to: '/blog/post-1', permalink: '/blog/post-1' },
        { date: '2024-01-02', title: 'Post 2', to: '/blog/post-2', permalink: '/blog/post-2' },
      ];

      const result = selectTopPosts(posts);
      assert.strictEqual(result.length, 2);
    });

    it('should accept custom count parameter', async () => {
      const posts = Array.from({ length: 5 }, (_, i) => ({
        date: `2024-${String(5 - i).padStart(2, '0')}-01`,
        title: `Post ${5 - i}`,
        to: `/blog/post-${5 - i}`,
      }));

      const result = selectTopPosts(posts, 2);
      assert.strictEqual(result.length, 2);
      assert.strictEqual(result[0].title, 'Post 5');
      assert.strictEqual(result[1].title, 'Post 4');
    });
  });

  describe('generateContentMetadata', () => {
    it('should generate valid metadata from test docs', async () => {
      // Create test files
      const blogDir = path.join(docsDir, 'blog');
      await fs.mkdir(blogDir);

      const file1 = path.join(blogDir, '2024-05-01-post1.md');
      const file2 = path.join(blogDir, '2024-04-01-post2.md');
      const file3 = path.join(blogDir, '2024-03-01-post3.md');
      const file4 = path.join(blogDir, '2024-02-01-post4.md');
      const file5 = path.join(blogDir, '2024-01-01-post5.md');

      await fs.writeFile(file1, `---
title: Post 1 - Latest
---
# Post 1
content`);
      await fs.writeFile(file2, '# Post 2\ncontent');
      await fs.writeFile(file3, '# Post 3\ncontent');
      await fs.writeFile(file4, '# Post 4\ncontent');
      await fs.writeFile(file5, '# Post 5\ncontent');

      const outputPath = path.join(tempDir, 'recent-posts.json');
      const result = await generateContentMetadata(docsDir, outputPath);

      assert.strictEqual(result.length, MAX_RECENT_POSTS);
      assert.strictEqual(result[0].title, 'Post 1 - Latest');
      assert.strictEqual(result[0].to, '/blog/2024-05-01-post1');

      // Verify file was written
      const written = await fs.readFile(outputPath, 'utf-8');
      const parsed = JSON.parse(written);
      assert.strictEqual(parsed.length, MAX_RECENT_POSTS);
    });

    it('should work with real docs directory', async () => {
      const realDocsDir = path.join(__dirname, '..', 'docs');
      const outputPath = path.join(tempDir, 'real-recent-posts.json');

      // This should not throw
      const result = await generateContentMetadata(realDocsDir, outputPath);
      assert.ok(Array.isArray(result));
      assert.ok(result.length <= MAX_RECENT_POSTS);

      // Verify each post has required fields
      for (const post of result) {
        assert.ok(post.title);
        assert.ok(post.date);
        assert.ok(post.to);
      }
    });

    it('should handle files with slug correctly', async () => {
      const ideDir = path.join(docsDir, 'ide');
      await fs.mkdir(ideDir);
      const slugFile = path.join(ideDir, '2024-06-01-with-slug.md');
      await fs.writeFile(slugFile, `---
title: With Slug
slug: custom-slug
---
Content`);

      const outputPath = path.join(tempDir, 'slug-test.json');
      const result = await generateContentMetadata(docsDir, outputPath);

      assert.ok(result.some(p => p.to === '/ide/custom-slug'));
    });
  });
});

// Regression tests for file extensions and content
describe('file extension regression tests', () => {
  it('should not have any .mdx files in docs directory', async () => {
    const realDocsDir = path.join(__dirname, '..', 'docs');

    // Recursively check for .mdx files
    const mdxFiles = [];
    async function findMdxFiles(dir) {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await findMdxFiles(fullPath);
        } else if (entry.name.endsWith('.mdx')) {
          mdxFiles.push(fullPath);
        }
      }
    }

    await findMdxFiles(realDocsDir);

    assert.strictEqual(mdxFiles.length, 0, `Found ${mdxFiles.length} .mdx file(s): ${mdxFiles.join(', ')}`);
  });

  it('should have the specific blog post as .md file', async () => {
    const blogFile = path.join(__dirname, '..', 'docs', 'blog', '2026-01-19-豆包app博客-agent-应用经验.md');
    const exists = await fs.access(blogFile).then(() => true).catch(() => false);
    assert.strictEqual(exists, true, 'Blog post should exist as .md file');
  });

  it('should have consistent filename in manifest as .md', async () => {
    const manifestPath = path.join(__dirname, 'url-migration.json');
    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8'));

    const entry = manifest.find(e =>
      e.newFile === 'docs/blog/2026-01-19-豆包app博客-agent-应用经验.md'
    );

    assert.ok(entry, 'Entry should exist in manifest');
    assert.strictEqual(entry.newFile.endsWith('.md'), true, 'Entry should have .md extension');
  });
});

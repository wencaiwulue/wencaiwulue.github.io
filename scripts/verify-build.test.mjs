import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import {
  validateManifestRedirects,
  validateIndexHtml,
  validateRobotsTxt,
  validateSocialCard,
  validateSitemap,
  validateLocalAssets,
  validateSearchIndex,
  verifyBuild
} from './verify-build.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to create a minimal manifest for testing
function createTestManifest() {
  return [
    {
      oldFile: 'docs/blog/2024-01-01 test.md',
      newFile: 'docs/blog/2024-01-01-test.md',
      from: '/blog/2024-01-01 test',
      to: '/blog/2024-01-01-test'
    }
  ];
}

describe('verify-build', () => {
  let tempDir;
  let buildDir;
  let manifestPath;
  let recentPostsPath;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'verify-build-test-'));
    buildDir = path.join(tempDir, 'build');
    await fs.mkdir(buildDir);
    manifestPath = path.join(tempDir, 'manifest.json');
    recentPostsPath = path.join(tempDir, 'recent-posts.json');
    await fs.writeFile(manifestPath, JSON.stringify(createTestManifest(), null, 2));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('validateManifestRedirects', () => {
    it('should fail when missing redirect HTML at old path', async () => {
      const result = await validateManifestRedirects(buildDir, manifestPath);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('Missing redirect HTML')));
    });

    it('should fail when missing destination HTML at new path', async () => {
      // Create the old redirect but not the new destination
      const oldDir = path.join(buildDir, 'blog', '2024-01-01 test');
      await fs.mkdir(oldDir, { recursive: true });
      const oldPath = path.join(oldDir, 'index.html');
      await fs.writeFile(oldPath, `<!DOCTYPE html><html><head>
<link rel="canonical" href="https://wencaiwulue.github.io/blog/2024-01-01-test">
<meta http-equiv="refresh" content="0; url=https://wencaiwulue.github.io/blog/2024-01-01-test">
</head>
<script>
window.location.href = 'https://wencaiwulue.github.io/blog/2024-01-01-test' + window.location.search + window.location.hash;
</script></html>`);

      const result = await validateManifestRedirects(buildDir, manifestPath);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('Missing destination HTML')));
    });

    it('should fail when meta refresh is missing', async () => {
      // Create both old and new but missing meta refresh
      const oldDir = path.join(buildDir, 'blog', '2024-01-01 test');
      await fs.mkdir(oldDir, { recursive: true });
      const oldPath = path.join(oldDir, 'index.html');
      await fs.writeFile(oldPath, `<!DOCTYPE html><html><head>
<link rel="canonical" href="/blog/2024-01-01-test">
</head>
<script>
window.location.href = '/blog/2024-01-01-test' + window.location.search + window.location.hash;
</script></html>`);

      const newDir = path.join(buildDir, 'blog', '2024-01-01-test');
      await fs.mkdir(newDir, { recursive: true });
      const newPath = path.join(newDir, 'index.html');
      await fs.writeFile(newPath, '<!DOCTYPE html><html></html>');

      const result = await validateManifestRedirects(buildDir, manifestPath);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('missing meta refresh')));
    });

    it('should fail when window.location.href is missing', async () => {
      // Create both old and new but missing window.location.href
      const oldDir = path.join(buildDir, 'blog', '2024-01-01 test');
      await fs.mkdir(oldDir, { recursive: true });
      const oldPath = path.join(oldDir, 'index.html');
      await fs.writeFile(oldPath, `<!DOCTYPE html><html><head>
<link rel="canonical" href="/blog/2024-01-01-test">
<meta http-equiv="refresh" content="0; url=/blog/2024-01-01-test">
</head></html>`);

      const newDir = path.join(buildDir, 'blog', '2024-01-01-test');
      await fs.mkdir(newDir, { recursive: true });
      const newPath = path.join(newDir, 'index.html');
      await fs.writeFile(newPath, '<!DOCTYPE html><html></html>');

      const result = await validateManifestRedirects(buildDir, manifestPath);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('missing window.location.href')));
    });

    it('should fail when target is incorrect', async () => {
      // Create both old and new but with incorrect target
      const oldDir = path.join(buildDir, 'blog', '2024-01-01 test');
      await fs.mkdir(oldDir, { recursive: true });
      const oldPath = path.join(oldDir, 'index.html');
      await fs.writeFile(oldPath, `<!DOCTYPE html><html><head>
<link rel="canonical" href="/blog/wrong-target">
<meta http-equiv="refresh" content="0; url=/blog/wrong-target">
</head>
<script>
window.location.href = '/blog/wrong-target' + window.location.search + window.location.hash;
</script></html>`);

      const newDir = path.join(buildDir, 'blog', '2024-01-01-test');
      await fs.mkdir(newDir, { recursive: true });
      const newPath = path.join(newDir, 'index.html');
      await fs.writeFile(newPath, '<!DOCTYPE html><html></html>');

      const result = await validateManifestRedirects(buildDir, manifestPath);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('incorrect target')));
    });

    it('should fail when URL is double-encoded', async () => {
      // Create both old and new but with double-encoded URL
      const oldDir = path.join(buildDir, 'blog', '2024-01-01 test');
      await fs.mkdir(oldDir, { recursive: true });
      const oldPath = path.join(oldDir, 'index.html');
      await fs.writeFile(oldPath, `<!DOCTYPE html><html><head>
<link rel="canonical" href="/blog/2024-01-01-test%2520">
<meta http-equiv="refresh" content="0; url=/blog/2024-01-01-test">
</head>
<script>
window.location.href = '/blog/2024-01-01-test' + window.location.search + window.location.hash;
</script></html>`);

      const newDir = path.join(buildDir, 'blog', '2024-01-01-test');
      await fs.mkdir(newDir, { recursive: true });
      const newPath = path.join(newDir, 'index.html');
      await fs.writeFile(newPath, '<!DOCTYPE html><html></html>');

      const result = await validateManifestRedirects(buildDir, manifestPath);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('double-encoded URL')));
    });

    it('should accept both relative and absolute canonical URLs', async () => {
      // Create both old and new with relative canonical
      const oldDir = path.join(buildDir, 'blog', '2024-01-01 test');
      await fs.mkdir(oldDir, { recursive: true });
      const oldPath = path.join(oldDir, 'index.html');
      await fs.writeFile(oldPath, `<!DOCTYPE html><html><head>
<link rel="canonical" href="/blog/2024-01-01-test">
<meta http-equiv="refresh" content="0; url=/blog/2024-01-01-test">
</head>
<script>
window.location.href = '/blog/2024-01-01-test' + window.location.search + window.location.hash;
</script></html>`);

      const newDir = path.join(buildDir, 'blog', '2024-01-01-test');
      await fs.mkdir(newDir, { recursive: true });
      const newPath = path.join(newDir, 'index.html');
      await fs.writeFile(newPath, '<!DOCTYPE html><html></html>');

      const result = await validateManifestRedirects(buildDir, manifestPath);
      assert.strictEqual(result.valid, true);
    });

    it('should accept encoded URLs', async () => {
      // Create both old and new with encoded URLs
      const oldDir = path.join(buildDir, 'blog', '2024-01-01 test');
      await fs.mkdir(oldDir, { recursive: true });
      const oldPath = path.join(oldDir, 'index.html');
      await fs.writeFile(oldPath, `<!DOCTYPE html><html><head>
<link rel="canonical" href="${encodeURI('/blog/2024-01-01-test')}">
<meta http-equiv="refresh" content="0; url=${encodeURI('/blog/2024-01-01-test')}">
</head>
<script>
window.location.href = '${encodeURI('/blog/2024-01-01-test')}' + window.location.search + window.location.hash;
</script></html>`);

      const newDir = path.join(buildDir, 'blog', '2024-01-01-test');
      await fs.mkdir(newDir, { recursive: true });
      const newPath = path.join(newDir, 'index.html');
      await fs.writeFile(newPath, '<!DOCTYPE html><html></html>');

      const result = await validateManifestRedirects(buildDir, manifestPath);
      assert.strictEqual(result.valid, true);
    });

    it('should pass when all manifest entries have valid redirects', async () => {
      // Create both old and new
      const oldDir = path.join(buildDir, 'blog', '2024-01-01 test');
      await fs.mkdir(oldDir, { recursive: true });
      const oldPath = path.join(oldDir, 'index.html');
      await fs.writeFile(oldPath, `<!DOCTYPE html><html><head>
<link rel="canonical" href="https://wencaiwulue.github.io/blog/2024-01-01-test">
<meta http-equiv="refresh" content="0; url=https://wencaiwulue.github.io/blog/2024-01-01-test">
</head>
<script>
window.location.href = 'https://wencaiwulue.github.io/blog/2024-01-01-test' + window.location.search + window.location.hash;
</script></html>`);

      const newDir = path.join(buildDir, 'blog', '2024-01-01-test');
      await fs.mkdir(newDir, { recursive: true });
      const newPath = path.join(newDir, 'index.html');
      await fs.writeFile(newPath, '<!DOCTYPE html><html></html>');

      const result = await validateManifestRedirects(buildDir, manifestPath);
      assert.strictEqual(result.valid, true);
    });
  });

  describe('validateIndexHtml', () => {
    it('should fail when index.html is missing', async () => {
      const result = await validateIndexHtml(buildDir, recentPostsPath);
      assert.strictEqual(result.valid, false);
    });

    it('should fail when recent-posts.json is missing', async () => {
      const indexPath = path.join(buildDir, 'index.html');
      await fs.writeFile(indexPath, '<!DOCTYPE html><html><head><link rel="canonical" href="https://wencaiwulue.github.io"><meta property="og:url" content="https://wencaiwulue.github.io"></head><body></body></html>');
      const result = await validateIndexHtml(buildDir, recentPostsPath);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('recent-posts.json is missing')));
    });

    it('should fail when recent-posts.json is empty', async () => {
      await fs.writeFile(recentPostsPath, '[]');
      const indexPath = path.join(buildDir, 'index.html');
      await fs.writeFile(indexPath, '<!DOCTYPE html><html><head><link rel="canonical" href="https://wencaiwulue.github.io"><meta property="og:url" content="https://wencaiwulue.github.io"></head><body></body></html>');
      const result = await validateIndexHtml(buildDir, recentPostsPath);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('recent-posts.json is missing or empty')));
    });

    it('should fail when recent post link is missing', async () => {
      await fs.writeFile(recentPostsPath, JSON.stringify([{ to: '/blog/test-post', title: 'Test Post' }]));
      const indexPath = path.join(buildDir, 'index.html');
      await fs.writeFile(indexPath, '<!DOCTYPE html><html><head><link rel="canonical" href="https://wencaiwulue.github.io"><meta property="og:url" content="https://wencaiwulue.github.io"></head><body></body></html>');
      const result = await validateIndexHtml(buildDir, recentPostsPath);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('Recent post link missing')));
    });

    it('should fail when recent post title is missing', async () => {
      await fs.writeFile(recentPostsPath, JSON.stringify([{ to: '/blog/test-post', title: 'Test Post' }]));
      const indexPath = path.join(buildDir, 'index.html');
      await fs.writeFile(indexPath, '<!DOCTYPE html><html><head><link rel="canonical" href="https://wencaiwulue.github.io"><meta property="og:url" content="https://wencaiwulue.github.io"></head><body><a href="/blog/test-post">Link</a></body></html>');
      const result = await validateIndexHtml(buildDir, recentPostsPath);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('Recent post title missing')));
    });

    it('should fail when default description placeholder is present', async () => {
      await fs.writeFile(recentPostsPath, '[]');
      const indexPath = path.join(buildDir, 'index.html');
      await fs.writeFile(indexPath, '<!DOCTYPE html><html><head><link rel="canonical" href="https://wencaiwulue.github.io"><meta property="og:url" content="https://wencaiwulue.github.io"><meta name="description" content="Description will go into a meta tag in <head />"></head><body></body></html>');
      const result = await validateIndexHtml(buildDir, recentPostsPath);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('default description placeholder')));
    });

    it('should fail when canonical URL is not exactly correct', async () => {
      const indexPath = path.join(buildDir, 'index.html');
      await fs.writeFile(indexPath, '<!DOCTYPE html><html><head><link rel="canonical" href="https://wencaiwulue.github.io/index.html"></head></html>');
      const result = await validateIndexHtml(buildDir, recentPostsPath);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('canonical URL exactly')));
    });

    it('should fail when og:url is not exactly correct', async () => {
      const indexPath = path.join(buildDir, 'index.html');
      await fs.writeFile(indexPath, '<!DOCTYPE html><html><head><link rel="canonical" href="https://wencaiwulue.github.io"><meta property="og:url" content="https://wencaiwulue.github.io/index.html"></head></html>');
      const result = await validateIndexHtml(buildDir, recentPostsPath);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('og:url exactly')));
    });

    it('should fail when "Hello from" is present', async () => {
      await fs.writeFile(recentPostsPath, '[]');
      const indexPath = path.join(buildDir, 'index.html');
      await fs.writeFile(indexPath, '<!DOCTYPE html><html><head><link rel="canonical" href="https://wencaiwulue.github.io"><meta property="og:url" content="https://wencaiwulue.github.io"></head><body>Hello from Docusaurus</body></html>');
      const result = await validateIndexHtml(buildDir, recentPostsPath);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('Hello from')));
    });

    it('should fail when example.com is present', async () => {
      await fs.writeFile(recentPostsPath, '[]');
      const indexPath = path.join(buildDir, 'index.html');
      await fs.writeFile(indexPath, '<!DOCTYPE html><html><head><link rel="canonical" href="https://wencaiwulue.github.io"><meta property="og:url" content="https://wencaiwulue.github.io"></head><body><a href="https://example.com">Test</a></body></html>');
      const result = await validateIndexHtml(buildDir, recentPostsPath);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('example.com')));
    });

    it('should fail when default social card placeholder is present', async () => {
      await fs.writeFile(recentPostsPath, '[]');
      const indexPath = path.join(buildDir, 'index.html');
      await fs.writeFile(indexPath, '<!DOCTYPE html><html><head><link rel="canonical" href="https://wencaiwulue.github.io"><meta property="og:url" content="https://wencaiwulue.github.io"></head><body>This is the default social card</body></html>');
      const result = await validateIndexHtml(buildDir, recentPostsPath);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('default social card placeholder')));
    });

    it('should accept encoded recent post links', async () => {
      await fs.writeFile(recentPostsPath, JSON.stringify([{ to: '/blog/test post', title: 'Test Post' }]));
      const indexPath = path.join(buildDir, 'index.html');
      await fs.writeFile(indexPath, `<!DOCTYPE html><html><head><link rel="canonical" href="https://wencaiwulue.github.io"><meta property="og:url" content="https://wencaiwulue.github.io"></head><body><a href="${encodeURI('/blog/test post')}">Test Post</a></body></html>`);
      const result = await validateIndexHtml(buildDir, recentPostsPath);
      assert.strictEqual(result.valid, true);
    });

    it('should pass when index.html is valid', async () => {
      await fs.writeFile(recentPostsPath, JSON.stringify([{ to: '/blog/test-post', title: 'Test Post' }]));
      const indexPath = path.join(buildDir, 'index.html');
      await fs.writeFile(indexPath, '<!DOCTYPE html><html><head><link rel="canonical" href="https://wencaiwulue.github.io"><meta property="og:url" content="https://wencaiwulue.github.io"></head><body><a href="/blog/test-post">Test Post</a></body></html>');
      const result = await validateIndexHtml(buildDir, recentPostsPath);
      assert.strictEqual(result.valid, true);
    });
  });

  describe('validateRobotsTxt', () => {
    it('should fail when robots.txt is missing', async () => {
      const result = await validateRobotsTxt(buildDir);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('missing')));
    });

    it('should fail when sitemap URL is incorrect', async () => {
      const robotsPath = path.join(buildDir, 'robots.txt');
      await fs.writeFile(robotsPath, 'User-agent: *\nAllow: /\nSitemap: https://example.com/sitemap.xml');
      const result = await validateRobotsTxt(buildDir);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('should contain')));
    });

    it('should pass when robots.txt has correct sitemap', async () => {
      const robotsPath = path.join(buildDir, 'robots.txt');
      await fs.writeFile(robotsPath, 'User-agent: *\nAllow: /\nSitemap: https://wencaiwulue.github.io/sitemap.xml');
      const result = await validateRobotsTxt(buildDir);
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.errors.length, 0);
    });
  });

  describe('validateSocialCard', () => {
    it('should fail when social-card.png is missing', async () => {
      const result = await validateSocialCard(buildDir);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('missing')));
    });

    it('should fail when PNG dimensions are not 1200x630', async () => {
      const imgDir = path.join(buildDir, 'img');
      await fs.mkdir(imgDir, { recursive: true });
      const socialCardPath = path.join(imgDir, 'social-card.png');

      // Create a minimal invalid PNG (1x1)
      const invalidPng = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // signature
        0x00, 0x00, 0x00, 0x0D, // chunk length
        0x49, 0x48, 0x44, 0x52, // IHDR
        0x00, 0x00, 0x00, 0x01, // width 1
        0x00, 0x00, 0x00, 0x01, // height 1
        0x08, 0x06, 0x00, 0x00, 0x00, // bit depth etc
        0x1F, 0x15, 0xC4, 0x89, // CRC
        0x00, 0x00, 0x00, 0x00, // IEND
        0x49, 0x45, 0x4E, 0x44,
        0xAE, 0x42, 0x60, 0x82
      ]);
      await fs.writeFile(socialCardPath, invalidPng);

      const result = await validateSocialCard(buildDir);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('should be 1200x630')));
    });

    it('should pass when PNG has correct dimensions', async () => {
      const imgDir = path.join(buildDir, 'img');
      await fs.mkdir(imgDir, { recursive: true });
      const socialCardPath = path.join(imgDir, 'social-card.png');

      // Create a minimal valid PNG (1200x630)
      const validPng = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // signature
        0x00, 0x00, 0x00, 0x0D, // chunk length
        0x49, 0x48, 0x44, 0x52, // IHDR
        0x00, 0x00, 0x04, 0xB0, // width 1200 (0x04B0)
        0x00, 0x00, 0x02, 0x76, // height 630 (0x0276)
        0x08, 0x06, 0x00, 0x00, 0x00, // bit depth etc
        0x00, 0x00, 0x00, 0x00, // dummy CRC (not checked)
        0x00, 0x00, 0x00, 0x00, // IEND
        0x49, 0x45, 0x4E, 0x44,
        0xAE, 0x42, 0x60, 0x82
      ]);
      await fs.writeFile(socialCardPath, validPng);

      const result = await validateSocialCard(buildDir);
      assert.strictEqual(result.valid, true);
    });
  });

  describe('validateSitemap', () => {
    it('should fail when sitemap.xml is missing', async () => {
      const result = await validateSitemap(buildDir, manifestPath);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('missing')));
    });

    it('should fail when loc uses example.com', async () => {
      const sitemapPath = path.join(buildDir, 'sitemap.xml');
      await fs.writeFile(sitemapPath, `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://example.com/test</loc></url>
</urlset>`);
      const result = await validateSitemap(buildDir, manifestPath);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('example.com')));
    });

    it('should fail when loc has %20', async () => {
      const sitemapPath = path.join(buildDir, 'sitemap.xml');
      await fs.writeFile(sitemapPath, `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://wencaiwulue.github.io/blog/2024-01-01%20test</loc></url>
  <url><loc>https://wencaiwulue.github.io/blog/2024-01-01-test</loc></url>
</urlset>`);
      const result = await validateSitemap(buildDir, manifestPath);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('should not have %20')));
    });

    it('should fail when loc has .md extension', async () => {
      const sitemapPath = path.join(buildDir, 'sitemap.xml');
      await fs.writeFile(sitemapPath, `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://wencaiwulue.github.io/test.md</loc></url>
</urlset>`);
      const result = await validateSitemap(buildDir, manifestPath);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('.md')));
    });

    it('should fail when manifest old paths are present', async () => {
      const sitemapPath = path.join(buildDir, 'sitemap.xml');
      await fs.writeFile(sitemapPath, `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://wencaiwulue.github.io/blog/2024-01-01 test</loc></url>
  <url><loc>https://wencaiwulue.github.io/blog/2024-01-01-test</loc></url>
</urlset>`);
      const result = await validateSitemap(buildDir, manifestPath);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('should not include old path')));
    });

    it('should fail when manifest new paths are not present', async () => {
      const sitemapPath = path.join(buildDir, 'sitemap.xml');
      await fs.writeFile(sitemapPath, `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://wencaiwulue.github.io/other</loc></url>
</urlset>`);
      const result = await validateSitemap(buildDir, manifestPath);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('missing new path')));
    });

    it('should fail when /quickstart is missing', async () => {
      const sitemapPath = path.join(buildDir, 'sitemap.xml');
      await fs.writeFile(sitemapPath, `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://wencaiwulue.github.io/blog/2024-01-01-test</loc></url>
</urlset>`);
      const result = await validateSitemap(buildDir, manifestPath);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('missing /quickstart')));
    });

    it('should pass when sitemap is valid', async () => {
      const sitemapPath = path.join(buildDir, 'sitemap.xml');
      await fs.writeFile(sitemapPath, `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://wencaiwulue.github.io/quickstart</loc></url>
  <url><loc>https://wencaiwulue.github.io/blog/2024-01-01-test</loc></url>
</urlset>`);
      const result = await validateSitemap(buildDir, manifestPath);
      assert.strictEqual(result.valid, true);
    });
  });

  describe('validateLocalAssets', () => {
    it('should pass when there are no HTML files', async () => {
      const result = await validateLocalAssets(buildDir);
      assert.strictEqual(result.valid, true);
    });

    it('should fail when img src references non-existent file', async () => {
      const indexPath = path.join(buildDir, 'index.html');
      await fs.writeFile(indexPath, '<!DOCTYPE html><html><body><img src="/img/missing.png"></body></html>');
      const result = await validateLocalAssets(buildDir);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('Missing local asset')));
    });

    it('should ignore http(s) URLs', async () => {
      const indexPath = path.join(buildDir, 'index.html');
      await fs.writeFile(indexPath, '<!DOCTYPE html><html><body><img src="https://example.com/img.png"></body></html>');
      const result = await validateLocalAssets(buildDir);
      assert.strictEqual(result.valid, true);
    });

    it('should ignore data: URLs', async () => {
      const indexPath = path.join(buildDir, 'index.html');
      await fs.writeFile(indexPath, '<!DOCTYPE html><html><body><img src="data:image/png;base64,abc"></body></html>');
      const result = await validateLocalAssets(buildDir);
      assert.strictEqual(result.valid, true);
    });

    it('should ignore protocol-relative URLs', async () => {
      const indexPath = path.join(buildDir, 'index.html');
      await fs.writeFile(indexPath, '<!DOCTYPE html><html><body><img src="//example.com/img.png"></body></html>');
      const result = await validateLocalAssets(buildDir);
      assert.strictEqual(result.valid, true);
    });

    it('should ignore fragment-only URLs', async () => {
      const indexPath = path.join(buildDir, 'index.html');
      await fs.writeFile(indexPath, '<!DOCTYPE html><html><body><a href="#section">Link</a></body></html>');
      const result = await validateLocalAssets(buildDir);
      assert.strictEqual(result.valid, true);
    });

    it('should fail when asset path escapes build directory', async () => {
      const indexPath = path.join(buildDir, 'index.html');
      await fs.writeFile(indexPath, '<!DOCTYPE html><html><body><img src="/../etc/passwd"></body></html>');
      const result = await validateLocalAssets(buildDir);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('escapes build directory')));
    });

    it('should decode percent-encoded URLs safely', async () => {
      const imgDir = path.join(buildDir, 'img');
      await fs.mkdir(imgDir, { recursive: true });
      await fs.writeFile(path.join(imgDir, '测试图片.png'), '');
      const indexPath = path.join(buildDir, 'index.html');
      await fs.writeFile(indexPath, '<!DOCTYPE html><html><body><img src="/img/%E6%B5%8B%E8%AF%95%E5%9B%BE%E7%89%87.png"></body></html>');
      const result = await validateLocalAssets(buildDir);
      assert.strictEqual(result.valid, true);
    });

    it('should pass when all local assets exist', async () => {
      const imgDir = path.join(buildDir, 'img');
      await fs.mkdir(imgDir, { recursive: true });
      await fs.writeFile(path.join(imgDir, 'existing.png'), '');
      const indexPath = path.join(buildDir, 'index.html');
      await fs.writeFile(indexPath, '<!DOCTYPE html><html><body><img src="/img/existing.png"></body></html>');
      const result = await validateLocalAssets(buildDir);
      assert.strictEqual(result.valid, true);
    });
  });

  describe('verifyBuild', () => {
    it('should pass when all validations pass', async () => {
      // Set up all required files
      // 1. Recent posts
      await fs.writeFile(recentPostsPath, JSON.stringify([{ to: '/blog/test-post', title: 'Test Post' }]));

      // 2. Index.html
      const indexPath = path.join(buildDir, 'index.html');
      await fs.writeFile(indexPath, '<!DOCTYPE html><html><head><link rel="canonical" href="https://wencaiwulue.github.io"><meta property="og:url" content="https://wencaiwulue.github.io"></head><body><a href="/blog/test-post">Test Post</a></body></html>');

      // 3. Robots.txt
      const robotsPath = path.join(buildDir, 'robots.txt');
      await fs.writeFile(robotsPath, 'User-agent: *\nAllow: /\nSitemap: https://wencaiwulue.github.io/sitemap.xml');

      // 4. Social card
      const imgDir = path.join(buildDir, 'img');
      await fs.mkdir(imgDir, { recursive: true });
      const socialCardPath = path.join(imgDir, 'social-card.png');
      const validPng = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // signature
        0x00, 0x00, 0x00, 0x0D, // chunk length
        0x49, 0x48, 0x44, 0x52, // IHDR
        0x00, 0x00, 0x04, 0xB0, // width 1200 (0x04B0)
        0x00, 0x00, 0x02, 0x76, // height 630 (0x0276)
        0x08, 0x06, 0x00, 0x00, 0x00, // bit depth etc
        0x00, 0x00, 0x00, 0x00, // dummy CRC (not checked)
        0x00, 0x00, 0x00, 0x00, // IEND
        0x49, 0x45, 0x4E, 0x44,
        0xAE, 0x42, 0x60, 0x82
      ]);
      await fs.writeFile(socialCardPath, validPng);

      // 5. Sitemap
      const sitemapPath = path.join(buildDir, 'sitemap.xml');
      await fs.writeFile(sitemapPath, `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://wencaiwulue.github.io/quickstart</loc></url>
  <url><loc>https://wencaiwulue.github.io/blog/2024-01-01-test</loc></url>
</urlset>`);

      // 6. Manifest redirects
      const oldDir = path.join(buildDir, 'blog', '2024-01-01 test');
      await fs.mkdir(oldDir, { recursive: true });
      const oldPath = path.join(oldDir, 'index.html');
      await fs.writeFile(oldPath, `<!DOCTYPE html><html><head>
<link rel="canonical" href="/blog/2024-01-01-test">
<meta http-equiv="refresh" content="0; url=/blog/2024-01-01-test">
</head>
<script>
window.location.href = '/blog/2024-01-01-test' + window.location.search + window.location.hash;
</script></html>`);
      const newDir = path.join(buildDir, 'blog', '2024-01-01-test');
      await fs.mkdir(newDir, { recursive: true });
      const newPath = path.join(newDir, 'index.html');
      await fs.writeFile(newPath, '<!DOCTYPE html><html></html>');

      // 7. Local asset
      await fs.writeFile(path.join(imgDir, 'existing.png'), '');
      const assetIndexPath = path.join(buildDir, 'asset.html');
      await fs.writeFile(assetIndexPath, '<!DOCTYPE html><html><body><img src="/img/existing.png"></body></html>');

      // 8. Search index
      const searchIndexPath = path.join(buildDir, 'search-index.json');
      await fs.writeFile(searchIndexPath, JSON.stringify([{
        title: 'Test Page',
        type: 0,
        page: '/test-page',
        id: 0,
        content: 'Test content here'
      }]));

      const result = await verifyBuild(buildDir, { manifestPath, recentPostsPath });
      assert.strictEqual(result.valid, true);
    });

    it('should fail when any validation fails', async () => {
      // Set up only some files, missing social card
      await fs.writeFile(recentPostsPath, JSON.stringify([{ to: '/blog/test-post', title: 'Test Post' }]));
      const indexPath = path.join(buildDir, 'index.html');
      await fs.writeFile(indexPath, '<!DOCTYPE html><html><head><link rel="canonical" href="https://wencaiwulue.github.io"><meta property="og:url" content="https://wencaiwulue.github.io"></head><body><a href="/blog/test-post">Test Post</a></body></html>');
      const robotsPath = path.join(buildDir, 'robots.txt');
      await fs.writeFile(robotsPath, 'User-agent: *\nAllow: /\nSitemap: https://wencaiwulue.github.io/sitemap.xml');
      const sitemapPath = path.join(buildDir, 'sitemap.xml');
      await fs.writeFile(sitemapPath, `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://wencaiwulue.github.io/quickstart</loc></url>
</urlset>`);

      const result = await verifyBuild(buildDir, { manifestPath, recentPostsPath });
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.length > 0);
    });
  });

  describe('validateSearchIndex', () => {
    it('should fail when search-index.json is missing', async () => {
      const result = await validateSearchIndex(buildDir);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('missing')));
    });

    it('should fail when search-index.json is invalid JSON', async () => {
      const searchIndexPath = path.join(buildDir, 'search-index.json');
      await fs.writeFile(searchIndexPath, 'invalid json');
      const result = await validateSearchIndex(buildDir);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('invalid JSON')));
    });

    it('should fail when search-index.json is empty object', async () => {
      const searchIndexPath = path.join(buildDir, 'search-index.json');
      await fs.writeFile(searchIndexPath, '{}');
      const result = await validateSearchIndex(buildDir);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('empty')));
    });

    it('should fail when search-index.json is empty array', async () => {
      const searchIndexPath = path.join(buildDir, 'search-index.json');
      await fs.writeFile(searchIndexPath, '[]');
      const result = await validateSearchIndex(buildDir);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('empty')));
    });

    it('should fail when search-index.json has no actual index data', async () => {
      const searchIndexPath = path.join(buildDir, 'search-index.json');
      await fs.writeFile(searchIndexPath, JSON.stringify({ docs: [], pages: [] }));
      const result = await validateSearchIndex(buildDir);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('no index data')));
    });

    it('should fail when search-index.json has hashed filename but we check for non-hashed', async () => {
      // With hashed: true, the file would be search-index-{hash}.json
      const searchIndexPath = path.join(buildDir, 'search-index-abc123.json');
      await fs.writeFile(searchIndexPath, JSON.stringify({ docs: [{ title: 'Test' }] }));
      const result = await validateSearchIndex(buildDir);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('missing')));
    });

    it('should pass when search-index.json exists and has valid index data', async () => {
      const searchIndexPath = path.join(buildDir, 'search-index.json');
      await fs.writeFile(searchIndexPath, JSON.stringify({
        docs: [
          {
            title: 'Test Document',
            content: 'This is a test document for search index',
            url: '/test-doc'
          }
        ]
      }));
      const result = await validateSearchIndex(buildDir);
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.errors.length, 0);
    });

    it('should pass with realistic @easyops-cn/docusaurus-search-local format', async () => {
      const searchIndexPath = path.join(buildDir, 'search-index.json');
      // Realistic format from the plugin
      await fs.writeFile(searchIndexPath, JSON.stringify([{
        title: 'Test Page',
        type: 0,
        page: '/test-page',
        id: 0,
        content: 'Test content here',
        sections: [{ title: 'Section 1', content: 'Section content', hash: '#section-1' }]
      }]));
      const result = await validateSearchIndex(buildDir);
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.errors.length, 0);
    });
  });
});

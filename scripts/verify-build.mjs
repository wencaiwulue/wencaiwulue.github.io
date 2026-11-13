import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SITE_DOMAIN = 'https://wencaiwulue.github.io';

function normalizePathForComparison(p) {
  // Decode percent-encoded characters, then normalize
  try {
    p = decodeURIComponent(p);
  } catch {
    // If decode fails, leave as-is
  }
  // Remove leading/trailing slashes, normalize multiple slashes to single
  return p.replace(/^\/+|\/+$/g, '').replace(/\/+/g, '/');
}

/**
 * Validate that all manifest entries have proper redirects
 */
export async function validateManifestRedirects(buildDir, manifestPath) {
  const errors = [];
  let manifest;

  try {
    manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8'));
  } catch (err) {
    errors.push(`Failed to load manifest: ${err.message}`);
    return { valid: false, errors, count: 0 };
  }

  for (const entry of manifest) {
    // Check that old redirect HTML exists
    const oldRedirectPath = path.join(buildDir, entry.from, 'index.html');
    try {
      const oldContent = await fs.readFile(oldRedirectPath, 'utf-8');

      // Check canonical
      const canonicalMatch = oldContent.match(/<link rel="canonical" href="([^"]+)"\s*\/?>/);
      if (!canonicalMatch) {
        errors.push(`${entry.from}/index.html missing canonical link`);
        continue;
      }

      // Check meta refresh
      const refreshMatch = oldContent.match(/<meta http-equiv="refresh" content="0;\s*url=([^"]+)"\s*\/?>/);
      if (!refreshMatch) {
        errors.push(`${entry.from}/index.html missing meta refresh`);
        continue;
      }

      // Check window.location.href
      const locationMatch = oldContent.match(/window\.location\.href\s*=\s*['"]([^'"]+)['"]\s*\+\s*window\.location\.search\s*\+\s*window\.location\.hash/);
      if (!locationMatch) {
        errors.push(`${entry.from}/index.html missing window.location.href`);
        continue;
      }

      // Check for double encoding
      const allTargets = [canonicalMatch[1], refreshMatch[1], locationMatch[1]];
      for (const target of allTargets) {
        if (target.includes('%25')) {
          errors.push(`${entry.from}/index.html has double-encoded URL: ${target}`);
        }
      }

      // Check all targets match entry.to (accept relative/absolute, encoded/decoded)
      const expectedTo = entry.to;
      const targets = [canonicalMatch[1], refreshMatch[1], locationMatch[1]];
      for (const target of targets) {
        let normalizedTarget = target;
        // If absolute, strip domain
        if (normalizedTarget.startsWith(SITE_DOMAIN)) {
          normalizedTarget = normalizedTarget.slice(SITE_DOMAIN.length);
        }
        // Normalize both for comparison
        const normalizedExpected = normalizePathForComparison(expectedTo);
        const normalizedActual = normalizePathForComparison(normalizedTarget);
        if (normalizedActual !== normalizedExpected) {
          errors.push(`${entry.from}/index.html has incorrect target: ${target}, expected: ${expectedTo}`);
        }
      }
    } catch (err) {
      if (err.code === 'ENOENT') {
        errors.push(`Missing redirect HTML at ${entry.from}/index.html`);
      } else {
        errors.push(`Failed to read redirect for ${entry.from}: ${err.message}`);
      }
    }

    // Check that destination HTML exists
    const newPath = path.join(buildDir, entry.to, 'index.html');
    try {
      await fs.access(newPath);
    } catch {
      errors.push(`Missing destination HTML at ${entry.to}/index.html`);
    }
  }

  return { valid: errors.length === 0, errors, count: manifest.length };
}

/**
 * Validate the main index.html
 */
export async function validateIndexHtml(buildDir, recentPostsPath) {
  const errors = [];
  const indexPath = path.join(buildDir, 'index.html');

  try {
    const content = await fs.readFile(indexPath, 'utf-8');

    // Check canonical URL - must be exactly the homepage URL (with or without trailing slash)
    const canonicalMatch = content.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/);
    const expectedCanonical = [SITE_DOMAIN, `${SITE_DOMAIN}/`];
    if (!canonicalMatch || !expectedCanonical.includes(canonicalMatch[1])) {
      errors.push(`index.html should have canonical URL exactly ${SITE_DOMAIN} or ${SITE_DOMAIN}/`);
    }

    // Check og:url - must be exactly the homepage URL (with or without trailing slash)
    const ogUrlMatch = content.match(/<meta[^>]+property="og:url"[^>]+content="([^"]+)"/);
    const expectedOgUrl = [SITE_DOMAIN, `${SITE_DOMAIN}/`];
    if (!ogUrlMatch || !expectedOgUrl.includes(ogUrlMatch[1])) {
      errors.push(`index.html should have og:url exactly ${SITE_DOMAIN} or ${SITE_DOMAIN}/`);
    }

    // Check recent posts - fail if missing/empty
    try {
      const recentPosts = JSON.parse(await fs.readFile(recentPostsPath, 'utf-8'));
      if (!Array.isArray(recentPosts) || recentPosts.length === 0) {
        errors.push('recent-posts.json is missing or empty');
      } else {
        // Check that recent links are present in index.html - verify all of them, both title and link
        for (const post of recentPosts) {
          const permalink = post.permalink || post.to;
          const title = post.title;
          if (permalink) {
            const rawLink = `href="${permalink}"`;
            const encodedLink = `href="${encodeURI(permalink)}"`;
            if (!content.includes(rawLink) && !content.includes(encodedLink)) {
              errors.push(`Recent post link missing in index.html: ${permalink}`);
            }
          }
          if (title) {
            if (!content.includes(title)) {
              errors.push(`Recent post title missing in index.html: ${title}`);
            }
          }
        }
      }
    } catch (err) {
      errors.push(`recent-posts.json is missing or invalid: ${err.message}`);
    }

    // Check for "Hello from"
    if (content.includes('Hello from')) {
      errors.push('index.html contains "Hello from" placeholder');
    }

    // Check for default description placeholder
    if (content.includes('Description will go into a meta tag in <head />')) {
      errors.push('index.html contains default description placeholder');
    }

    // Check for example.com
    if (content.includes('example.com')) {
      errors.push('index.html contains example.com');
    }

    // Check for default social card placeholder
    if (content.includes('default social card')) {
      errors.push('index.html contains default social card placeholder');
    }
  } catch (err) {
    if (err.code === 'ENOENT') {
      errors.push('index.html is missing');
    } else {
      errors.push(`index.html is invalid: ${err.message}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate robots.txt
 */
export async function validateRobotsTxt(buildDir) {
  const errors = [];
  const robotsPath = path.join(buildDir, 'robots.txt');

  try {
    const content = await fs.readFile(robotsPath, 'utf-8');
    const expectedSitemap = `Sitemap: ${SITE_DOMAIN}/sitemap.xml`;
    if (!content.includes(expectedSitemap)) {
      errors.push(`robots.txt should contain "${expectedSitemap}"`);
    }
  } catch {
    errors.push('robots.txt is missing');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Parse PNG dimensions from binary data
 */
function parsePngDimensions(buffer) {
  // PNG signature: 89 50 4E 47 0D 0A 1A 0A
  if (buffer.length < 24) {
    throw new Error('Invalid PNG file: too short');
  }

  const signature = buffer.subarray(0, 8);
  const expectedSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  if (!signature.equals(expectedSignature)) {
    throw new Error('Invalid PNG file: wrong signature');
  }

  // IHDR chunk starts at offset 8
  // IHDR structure: length (4), type (4), data (13), CRC (4)
  // Data: width (4), height (4), bit depth (1), color type (1), compress method (1), filter (1), interlace (1)
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);

  return { width, height };
}

/**
 * Validate social-card.png dimensions (1200x630)
 */
export async function validateSocialCard(buildDir) {
  const errors = [];
  const socialCardPath = path.join(buildDir, 'img', 'social-card.png');

  try {
    const buffer = await fs.readFile(socialCardPath);
    const { width, height } = parsePngDimensions(buffer);
    if (width !== 1200 || height !== 630) {
      errors.push(`social-card.png should be 1200x630, got ${width}x${height}`);
    }
  } catch (err) {
    if (err.code === 'ENOENT') {
      errors.push('social-card.png is missing');
    } else {
      errors.push(`social-card.png is invalid: ${err.message}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate sitemap.xml
 */
export async function validateSitemap(buildDir, manifestPath) {
  const errors = [];
  let manifest = [];
  try {
    manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8'));
  } catch (e) {
    // Ignore, manifest is optional for sitemap validation
  }

  const sitemapPath = path.join(buildDir, 'sitemap.xml');
  let content;
  try {
    content = await fs.readFile(sitemapPath, 'utf-8');
  } catch (err) {
    if (err.code === 'ENOENT') {
      return { valid: false, errors: ['sitemap.xml is missing'], count: 0 };
    } else {
      return { valid: false, errors: [`sitemap.xml is invalid: ${err.message}`], count: 0 };
    }
  }

  // Check no %20
  if (content.includes('%20')) {
    errors.push('sitemap.xml should not have %20, use hyphens instead');
  }

  // Check no example.com
  if (content.includes('example.com')) {
    errors.push('sitemap.xml should not have example.com');
  }

  // Check no .md
  if (content.includes('.md<')) {
    errors.push('sitemap.xml should not have .md extensions');
  }

  // Collect all loc URLs
  const locMatches = [...content.matchAll(/<loc>([^<]+)<\/loc>/g)];
  const locPaths = locMatches.map(m => {
    const url = m[1];
    // Decode URL and XML entities
    let pathname = url;
    if (url.startsWith(SITE_DOMAIN)) {
      pathname = url.slice(SITE_DOMAIN.length);
    }
    // Decode XML entities (like &amp; -> &)
    pathname = pathname.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
    // Decode percent encoding
    try {
      pathname = decodeURIComponent(pathname);
    } catch {
      // If decode fails, leave as-is
    }
    return normalizePathForComparison(pathname);
  });

  // Reject all manifest old from paths
  const oldFromPaths = manifest.map(e => normalizePathForComparison(e.from));
  for (const oldFrom of oldFromPaths) {
    if (locPaths.includes(oldFrom)) {
      errors.push(`sitemap.xml should not include old path: ${oldFrom}`);
    }
  }

  // Ensure all new to paths are present
  const newToPaths = manifest.map(e => normalizePathForComparison(e.to));
  for (const newTo of newToPaths) {
    if (!locPaths.includes(newTo)) {
      errors.push(`sitemap.xml missing new path: ${newTo}`);
    }
  }

  // Ensure /quickstart is present
  if (!locPaths.includes('quickstart')) {
    errors.push('sitemap.xml missing /quickstart');
  }

  return { valid: errors.length === 0, errors, count: locPaths.length };
}

/**
 * Recursively find all HTML files in a directory
 */
async function findHtmlFiles(dir, fileList = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await findHtmlFiles(fullPath, fileList);
    } else if (entry.name.endsWith('.html')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

/**
 * Validate local assets referenced in HTML files
 */
export async function validateLocalAssets(buildDir) {
  const errors = [];

  // Traverse all HTML files
  async function traverse(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await traverse(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.html')) {
        const content = await fs.readFile(fullPath, 'utf8');
        // Check img, video, source, link rel="stylesheet", link rel="icon", link rel="preload"
        const assetPatterns = [
          /<img[^>]+src="([^"]+)"/g,
          /<video[^>]+src="([^"]+)"/g,
          /<source[^>]+src="([^"]+)"/g,
          /<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g,
          /<link[^>]+rel="icon"[^>]+href="([^"]+)"/g,
          /<link[^>]+rel="preload"[^>]+href="([^"]+)"/g,
        ];
        for (const pattern of assetPatterns) {
          const matches = [...content.matchAll(pattern)];
          for (const match of matches) {
            let assetUrl = match[1];
            // Ignore http(s), data:, protocol-relative, fragment-only
            if (assetUrl.startsWith('http://') || assetUrl.startsWith('https://') ||
                assetUrl.startsWith('data:') || assetUrl.startsWith('//') ||
                assetUrl.startsWith('#')) {
              continue;
            }
            // Decode percent-encoded Chinese safely
            try {
              assetUrl = decodeURIComponent(assetUrl);
            } catch {
              // If decode fails, leave as-is
            }
            // Build absolute path - if it's a relative path, resolve relative to the HTML file's directory
            // If it starts with /, resolve relative to buildDir
            let assetPath;
            if (assetUrl.startsWith('/')) {
              assetPath = path.resolve(buildDir, '.' + assetUrl);
            } else {
              // Relative path - resolve relative to the HTML file's directory
              const htmlDir = path.dirname(fullPath);
              assetPath = path.resolve(htmlDir, assetUrl);
            }
            // Check if assetPath is within buildDir
            if (!assetPath.startsWith(path.resolve(buildDir) + path.sep)) {
              errors.push(`Asset path escapes build directory: ${assetUrl} in ${path.relative(buildDir, fullPath)}`);
              continue;
            }
            // Check if asset exists
            try {
              await fs.access(assetPath);
            } catch (e) {
              errors.push(`Missing local asset: ${assetUrl} in ${path.relative(buildDir, fullPath)}`);
            }
          }
        }
      }
    }
  }
  await traverse(buildDir);

  return { valid: errors.length === 0, errors };
}

/**
 * Validate search-index.json from @easyops-cn/docusaurus-search-local
 */
export async function validateSearchIndex(buildDir) {
  const errors = [];
  const searchIndexPath = path.join(buildDir, 'search-index.json');

  try {
    const content = await fs.readFile(searchIndexPath, 'utf8');
    let data;
    try {
      data = JSON.parse(content);
    } catch (e) {
      errors.push('search-index.json is invalid JSON');
      return { valid: false, errors };
    }

    // Check if data is empty
    if (data === null || data === undefined) {
      errors.push('search-index.json is empty');
      return { valid: false, errors };
    }

    // Check for empty object or empty array
    if ((typeof data === 'object' && Object.keys(data).length === 0) ||
        (Array.isArray(data) && data.length === 0)) {
      errors.push('search-index.json is empty');
      return { valid: false, errors };
    }

    // Check for actual index data - plugin uses array format
    let hasIndexData = false;
    if (Array.isArray(data)) {
      hasIndexData = data.length > 0;
    } else if (typeof data === 'object') {
      // Check for common formats
      hasIndexData = (data.docs && data.docs.length > 0) ||
                     (data.pages && data.pages.length > 0) ||
                     Object.keys(data).some(k => Array.isArray(data[k]) && data[k].length > 0);
    }

    if (!hasIndexData) {
      errors.push('search-index.json has no index data');
      return { valid: false, errors };
    }

    return { valid: true, errors };
  } catch (e) {
    if (e.code === 'ENOENT') {
      errors.push('search-index.json is missing');
    } else {
      errors.push(`search-index.json is invalid: ${e.message}`);
    }
    return { valid: false, errors };
  }
}

/**
 * Main verify build function
 */
export async function verifyBuild(buildDir, options = {}) {
  const manifestPath = options.manifestPath || path.join(__dirname, 'url-migration.json');
  const recentPostsPath = options.recentPostsPath || path.join(__dirname, '..', 'src', 'generated', 'recent-posts.json');

  const results = {
    manifestRedirects: await validateManifestRedirects(buildDir, manifestPath),
    indexHtml: await validateIndexHtml(buildDir, recentPostsPath),
    robotsTxt: await validateRobotsTxt(buildDir),
    socialCard: await validateSocialCard(buildDir),
    sitemap: await validateSitemap(buildDir, manifestPath),
    localAssets: await validateLocalAssets(buildDir),
    searchIndex: await validateSearchIndex(buildDir),
  };

  const allValid = Object.values(results).every(r => r.valid);
  const allErrors = Object.entries(results).flatMap(([name, result]) =>
    result.errors.map(err => `[${name}] ${err}`)
  );

  return { valid: allValid, errors: allErrors, results };
}

// If called directly, run the verification
if (import.meta.url === `file://${process.argv[1]}`) {
  const buildDir = path.join(__dirname, '..', 'build');
  verifyBuild(buildDir)
    .then(result => {
      if (result.valid) {
        console.log('✅ Build verification passed!');
        console.log(`Counts: manifestRedirects: ${result.results.manifestRedirects.count || 'ok'}, indexHtml: ok, robotsTxt: ok, socialCard: ok, sitemap: ${result.results.sitemap.count || 'ok'}, localAssets: ok`);
      } else {
        console.error('❌ Build verification failed:');
        result.errors.forEach(err => console.error(`  - ${err}`));
        process.exit(1);
      }
    })
    .catch(err => {
      console.error('❌ Error during build verification:', err);
      process.exit(1);
    });
}

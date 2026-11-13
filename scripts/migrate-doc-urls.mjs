#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync, execFileSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Normalize a Markdown file path: replace spaces/underscores/punctuation separators with single hyphen
 * @param {string} filePath - Relative path to Markdown file
 * @returns {string} Normalized path
 */
export function normalizePath(filePath) {
  if (filePath === 'docs/quickstart.md') {
    return filePath;
  }

  const dirname = path.dirname(filePath);
  const extname = path.extname(filePath);
  const basenameWithoutExt = path.basename(filePath, extname);

  // Normalize: replace any sequence of non-word/non-Chinese/non-date punctuation with single hyphen
  // - Preserve: Chinese characters, alphanumerics, dates (YYYY-MM-DD), hyphens in dates, dots in extensions
  // - Replace: spaces, underscores, ampersands, angle quotes 《》, etc.
  const normalizedBasename = basenameWithoutExt
    .replace(/[《》&_\s]+/g, '-') // Replace angle quotes, &, _, spaces with hyphen
    .replace(/[^\p{Script=Han}\w\-./]+/gu, '-') // Replace other non-Chinese/non-word chars with hyphen
    .replace(/-+/g, '-') // Collapse multiple hyphens
    .replace(/^-|-$/g, ''); // Trim leading/trailing hyphens

  return path.join(dirname, normalizedBasename + extname);
}

/**
 * Parse front matter from Markdown content
 * @param {string} content - Markdown content
 * @returns {{slug?: string}} Parsed front matter
 */
export function parseFrontMatter(content) {
  const frontMatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
  if (!frontMatterMatch) {
    return { slug: undefined };
  }

  const frontMatter = frontMatterMatch[1];
  const slugMatch = frontMatter.match(/^slug:\s*(.+)$/m);

  return {
    slug: slugMatch ? slugMatch[1].trim() : undefined
  };
}

/**
 * Find all Markdown files in a directory recursively
 * @param {string} dir - Directory to search
 * @returns {Promise<string[]>} Array of relative file paths
 */
export async function findMarkdownFiles(dir) {
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
  return files.sort();
}

/**
 * Build a migration entry for a file
 * @param {string} oldFile - Old file path
 * @param {string} newFile - New file path
 * @param {string|undefined} slug - Custom slug if any
 * @returns {{oldFile: string, newFile: string, from: string, to: string}} Migration entry
 */
export function buildMigrationEntry(oldFile, newFile, slug) {
  // Compute 'from' route
  let from;
  if (slug) {
    // For custom slug: /<section>/<slug>
    const section = path.dirname(oldFile).replace(/^docs\//, '');
    from = `/${section}/${slug}`;
  } else {
    // For ordinary docs: / + old relative path minus .md
    from = '/' + oldFile.replace(/^docs\//, '').replace(/\.md$/, '');
  }

  // Compute 'to' route: / + normalized new relative path minus .md
  const to = '/' + newFile.replace(/^docs\//, '').replace(/\.md$/, '');

  return {
    oldFile,
    newFile,
    from,
    to
  };
}

/**
 * Validate a migration manifest
 * @param {Array<{oldFile: string, newFile: string, from: string, to: string}>} manifest
 * @returns {{valid: boolean, errors: string[]}} Validation result
 */
export function validateMigrationManifest(manifest) {
  const errors = [];
  const fromPaths = new Set();
  const toPaths = new Set();
  const toLowerPaths = new Map(); // key: lowercase to, value: original to
  const oldFiles = new Set();
  const newFiles = new Set();

  for (const entry of manifest) {
    // Check duplicate oldFile
    if (oldFiles.has(entry.oldFile)) {
      errors.push(`duplicate oldFile: ${entry.oldFile}`);
    }
    oldFiles.add(entry.oldFile);

    // Check duplicate newFile
    if (newFiles.has(entry.newFile)) {
      errors.push(`duplicate newFile: ${entry.newFile}`);
    }
    newFiles.add(entry.newFile);

    // Check duplicate from
    if (fromPaths.has(entry.from)) {
      errors.push(`duplicate from: ${entry.from}`);
    }
    fromPaths.add(entry.from);

    // Check duplicate to
    if (toPaths.has(entry.to)) {
      errors.push(`duplicate to: ${entry.to}`);
    }
    toPaths.add(entry.to);

    // Check Unicode toLowerCase conflicts
    const lowerTo = entry.to.toLowerCase();
    if (toLowerPaths.has(lowerTo)) {
      errors.push(`Unicode toLowerCase conflict: ${toLowerPaths.get(lowerTo)} and ${entry.to}`);
    }
    toLowerPaths.set(lowerTo, entry.to);

    // Check from === to
    if (entry.from === entry.to) {
      errors.push(`from === to: ${entry.from}`);
    }

    // Check spaces in new route
    if (entry.to.includes(' ')) {
      errors.push(`space in new route: ${entry.to}`);
    }

    // Check %20 in new route
    if (entry.to.includes('%20')) {
      errors.push(`%20 in new route: ${entry.to}`);
    }

    // Check empty slug/from/to
    if (!entry.from) {
      errors.push(`empty from for: ${entry.oldFile}`);
    }
    if (!entry.to) {
      errors.push(`empty to for: ${entry.oldFile}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Build full migration manifest
 * @param {string} docsDir - Docs directory
 * @returns {Promise<Array<{oldFile: string, newFile: string, from: string, to: string}>>} Migration manifest
 */
export async function buildMigrationManifest(docsDir) {
  const files = await findMarkdownFiles(docsDir);
  const manifest = [];

  for (const file of files) {
    // Skip quickstart.md
    if (file === 'docs/quickstart.md' || file.endsWith('/quickstart.md')) {
      continue;
    }

    const normalizedFile = normalizePath(file);

    // Skip if no change needed
    if (file === normalizedFile) {
      continue;
    }

    // Read and parse front matter
    const content = await fs.readFile(file, 'utf-8');
    const { slug } = parseFrontMatter(content);

    const entry = buildMigrationEntry(file, normalizedFile, slug);
    manifest.push(entry);
  }

  return manifest;
}

/**
 * Apply migration using git mv
 * @param {Array<{oldFile: string, newFile: string, from: string, to: string}>} manifest
 * @param {boolean} dryRun - Whether to do a dry run
 */
export async function applyMigration(manifest, dryRun = true) {
  if (!dryRun) {
    // Preflight checks
    for (const entry of manifest) {
      // Check that old file exists
      try {
        await fs.access(entry.oldFile);
      } catch {
        throw new Error(`missing source file: ${entry.oldFile}`);
      }

      // Check that new file doesn't exist
      try {
        await fs.access(entry.newFile);
        throw new Error(`destination file already exists: ${entry.newFile}`);
      } catch (e) {
        if (e.code !== 'ENOENT') {
          throw e;
        }
        // ENOENT is expected, means file doesn't exist
      }
    }
  }

  for (const entry of manifest) {
    console.log(`${dryRun ? '[DRY RUN] ' : ''}git mv "${entry.oldFile}" "${entry.newFile}"`);

    if (!dryRun) {
      // Create target directory if needed
      const targetDir = path.dirname(entry.newFile);
      await fs.mkdir(targetDir, { recursive: true });

      // Use git mv with execFileSync for security - no fallback!
      execFileSync('git', ['mv', entry.oldFile, entry.newFile], {
        stdio: 'inherit'
      });

      // Remove the slug line from front matter
      const content = await fs.readFile(entry.newFile, 'utf-8');
      const newContent = content.replace(/^slug:\s*.+\n?/m, '');
      await fs.writeFile(entry.newFile, newContent, 'utf-8');
    }
  }
}

/**
 * Save manifest to JSON file
 * @param {Array} manifest - Migration manifest
 * @param {string} outputPath - Output file path
 */
export async function saveManifest(manifest, outputPath) {
  await fs.writeFile(outputPath, JSON.stringify(manifest, null, 2), 'utf-8');
  console.log(`Manifest saved to ${outputPath}`);
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const dryRun = !apply;

  console.log('Building migration manifest...');
  const manifest = await buildMigrationManifest('docs');

  console.log(`Found ${manifest.length} files to migrate`);

  // Validate
  const validation = validateMigrationManifest(manifest);
  if (!validation.valid) {
    console.error('Validation errors:');
    for (const error of validation.errors) {
      console.error(`  - ${error}`);
    }
    process.exit(1);
  }

  console.log('Validation passed');

  const manifestPath = path.join(__dirname, 'url-migration.json');

  // Check for 0 candidates with existing manifest when applying
  if (apply && manifest.length === 0) {
    try {
      const existingManifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8'));
      if (existingManifest.length > 0) {
        console.error('Refusing to overwrite existing non-empty manifest with 0 candidates');
        process.exit(1);
      }
    } catch (e) {
      // If manifest doesn't exist, that's fine
    }
  }

  // Save manifest only when not in dry-run
  if (!dryRun) {
    await saveManifest(manifest, manifestPath);
  } else {
    console.log('[DRY RUN] Not saving manifest');
  }

  // Apply migration
  console.log('\nApplying migration...');
  await applyMigration(manifest, dryRun);

  if (dryRun) {
    console.log('\nDry run complete. Run with --apply to perform actual migration.');
  } else {
    console.log('\nMigration applied successfully!');
  }
}

// Run main if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}

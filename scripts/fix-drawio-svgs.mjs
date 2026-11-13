import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Check if SVG has a content attribute (potentially large)
 */
export function hasLargeContentAttribute(svgContent) {
  return /<svg[^>]*content=/.test(svgContent);
}

/**
 * Check if SVG has already been migrated
 */
export function hasAlreadyBeenMigrated(svgContent) {
  return svgContent.includes('<metadata data-drawio-content=');
}

/**
 * Extract the content attribute value from SVG
 */
export function extractContentAttribute(svgContent) {
  const match = svgContent.match(/<svg[^>]*content="([^"]*)"[^>]*>/);
  return match ? match[1] : undefined;
}

/**
 * Migrate a single SVG content string:
 * - Move content attribute from <svg> to <metadata data-drawio-content="..."/>
 * - Keep all other attributes and content the same
 * - Idempotent
 */
export function migrateSvg(svgContent) {
  // Already migrated? Return as-is
  if (hasAlreadyBeenMigrated(svgContent)) {
    return svgContent;
  }

  // No content attribute? Return as-is
  if (!hasLargeContentAttribute(svgContent)) {
    return svgContent;
  }

  // Extract the content attribute value
  const contentValue = extractContentAttribute(svgContent);
  if (!contentValue) {
    return svgContent;
  }

  // First, remove the content attribute from the svg tag
  let result = svgContent.replace(
    /(<svg[^>]*)\s+content="[^"]*"([^>]*>)/,
    '$1$2'
  );

  // Then insert the metadata element right after the svg opening tag
  result = result.replace(
    /(<svg[^>]*>)/,
    `$1\n<metadata data-drawio-content="${contentValue}"/>`
  );

  return result;
}

/**
 * Find all draw.io SVG files in the repository
 */
export async function findDrawioSvgs(baseDir = '.') {
  const svgFiles = [];

  async function scanDir(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        // Skip node_modules and build
        if (entry.name !== 'node_modules' && entry.name !== 'build') {
          await scanDir(fullPath);
        }
      } else if (entry.name.endsWith('.svg')) {
        const content = await fs.readFile(fullPath, 'utf8');
        if (hasLargeContentAttribute(content) && !hasAlreadyBeenMigrated(content)) {
          svgFiles.push(fullPath);
        }
      }
    }
  }

  await scanDir(baseDir);
  return svgFiles;
}

/**
 * Migrate a single SVG file
 */
export async function migrateSvgFile(filePath, dryRun = true) {
  const content = await fs.readFile(filePath, 'utf8');
  const migrated = migrateSvg(content);

  if (migrated !== content) {
    if (!dryRun) {
      await fs.writeFile(filePath, migrated, 'utf8');
    }
    return true; // Changed
  }
  return false; // No change
}

/**
 * Migrate all SVG files
 */
export async function migrateAllSvgs(dryRun = true) {
  const files = await findDrawioSvgs('.');
  const results = [];

  for (const file of files) {
    const changed = await migrateSvgFile(file, dryRun);
    results.push({ file, changed });
  }

  return results;
}

// Run as CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const dryRun = !process.argv.includes('--apply');

  console.log(dryRun
    ? 'Dry run - no files will be modified (use --apply to apply changes)'
    : 'Applying migrations...'
  );

  migrateAllSvgs(dryRun)
    .then(results => {
      console.log(`Found ${results.length} SVG files to migrate:`);
      for (const r of results) {
        console.log(`  ${r.changed ? '[X]' : '[ ]'} ${r.file}`);
      }
      if (!dryRun) {
        console.log(`\nMigrated ${results.filter(r => r.changed).length} files`);
      }
    })
    .catch(err => {
      console.error('Error:', err);
      process.exit(1);
    });
}

#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { normalizePath, findMarkdownFiles, buildMigrationEntry } from './migrate-doc-urls.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read existing manifest
const existingManifest = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'url-migration.json'), 'utf-8')
);

// Create a map of current newFile locations
const currentPathMap = new Map();
for (const entry of existingManifest) {
  currentPathMap.set(entry.newFile, entry);
}

console.log('Checking for additional files that need normalization...');

// Find all markdown files
const files = await findMarkdownFiles('docs');

const additionalMigration = [];

for (const file of files) {
  if (file === 'docs/quickstart.md') continue;

  // Check what the normalized path would be now with updated logic
  const normalized = normalizePath(file);

  if (normalized !== file) {
    console.log(`Need migration: ${file} -> ${normalized}`);

    // Look up if this file was in the previous migration as a newFile
    let slug = undefined;
    let oldFrom = undefined;
    let oldTo = undefined;

    // Find the original entry if it exists
    let originalEntry = currentPathMap.get(file);
    if (!originalEntry) {
      // Maybe it's the oldFile from before first migration
      for (const entry of existingManifest) {
        if (entry.oldFile === file) {
          originalEntry = entry;
          break;
        }
      }
    }

    if (originalEntry) {
      // This is a file that was already migrated before, now needs further migration
      // We need to build a new migration from the current path to the newly normalized path
      oldFrom = originalEntry.to;
      oldTo = undefined; // Not needed anymore

      // Check for slug in the file content
      const content = fs.readFileSync(file, 'utf-8');
      const frontMatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
      if (frontMatterMatch) {
        const frontMatter = frontMatterMatch[1];
        const slugMatch = frontMatter.match(/^slug:\s*(.+)$/m);
        if (slugMatch) {
          slug = slugMatch[1].trim();
        }
      }
    }

    const entry = buildMigrationEntry(file, normalized, slug);

    // Also, if this was previously migrated, add a redirect from the old new path to the even newer path
    if (originalEntry && originalEntry.to) {
      // We'll handle this as part of updating the full manifest
      console.log(`  Will also add redirect from: ${originalEntry.to}`);
    }

    additionalMigration.push(entry);
  }
}

console.log(`\nFound ${additionalMigration.length} files needing further normalization`);

// Also let's look for the 5 broken links mentioned
console.log('\nChecking for broken link sources...');

// Check all markdown files for internal links
for (const file of files) {
  const content = fs.readFileSync(file, 'utf-8');
  const linkRegex = /\[([^\]]*)\]\((\/[^)]+)\)/g;
  let match;

  while ((match = linkRegex.exec(content)) !== null) {
    const link = match[2];
    // Check if this is one of our old paths
    for (const entry of existingManifest) {
      if (entry.from === link) {
        console.log(`Found broken link in ${file}: ${link} -> should be ${entry.to}`);
      }
    }
  }
}

console.log('\nDone.');

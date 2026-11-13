#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { normalizePath, findMarkdownFiles, buildMigrationEntry, validateMigrationManifest, applyMigration, saveManifest } from './migrate-doc-urls.mjs';
import { execFileSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Step 1: Read existing manifest and current state
const existingManifest = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'url-migration.json'), 'utf-8')
);

// Create maps for quick lookups
const oldFileToEntry = new Map();
const newFileToEntry = new Map();
const fromToMap = new Map();

for (const entry of existingManifest) {
  oldFileToEntry.set(entry.oldFile, entry);
  newFileToEntry.set(entry.newFile, entry);
  fromToMap.set(entry.from, entry.to);
}

console.log('Step 1: Read existing manifest');
console.log(`  Total entries: ${existingManifest.length}`);

// Step 2: Find all current markdown files and check if they need further normalization
console.log('\nStep 2: Checking for additional normalization needs...');
const currentFiles = await findMarkdownFiles('docs');
const additionalEntries = [];

for (const file of currentFiles) {
  if (file === 'docs/quickstart.md') continue;

  const normalized = normalizePath(file);
  if (normalized !== file) {
    console.log(`  Needs migration: ${path.basename(file)} -> ${path.basename(normalized)}`);

    // Find the original entry (this file might be the newFile from first migration)
    let originalEntry = newFileToEntry.get(file);
    if (!originalEntry) {
      // Maybe it was never migrated? Check oldFile
      originalEntry = oldFileToEntry.get(file);
    }

    let slug = undefined;

    // Check for slug in the current file
    const content = fs.readFileSync(file, 'utf-8');
    const frontMatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
    if (frontMatterMatch) {
      const frontMatter = frontMatterMatch[1];
      const slugMatch = frontMatter.match(/^slug:\s*(.+)$/m);
      if (slugMatch) {
        slug = slugMatch[1].trim();
      }
    }

    const entry = buildMigrationEntry(file, normalized, slug);

    // Also add a redirect from the previous new path to the new path
    if (originalEntry && originalEntry.to) {
      additionalEntries.push({
        oldFile: entry.oldFile,
        newFile: entry.newFile,
        from: originalEntry.to,
        to: entry.to
      });
    } else {
      additionalEntries.push(entry);
    }
  }
}

console.log(`  Found ${additionalEntries.length} files needing further normalization`);

// Step 3: Build complete manifest - keep original entries + add new ones
console.log('\nStep 3: Building complete manifest...');
const completeManifest = [...existingManifest];

// But wait, some of the original entries' newFile is now the oldFile in additional entries
// We need to update the original entries' to to point to the final location
for (const addEntry of additionalEntries) {
  // Find and update existing entry
  let found = false;
  for (let i = 0; i < completeManifest.length; i++) {
    const origEntry = completeManifest[i];
    if (origEntry.newFile === addEntry.oldFile) {
      // Update this entry's newFile and to
      completeManifest[i] = {
        ...origEntry,
        newFile: addEntry.newFile,
        to: addEntry.to
      };
      found = true;
      break;
    }
  }
  if (!found) {
    // Add as new entry if not found
    completeManifest.push(addEntry);
  }
}

// Step 4: Validate manifest
console.log('\nStep 4: Validating complete manifest...');
const validation = validateMigrationManifest(completeManifest);
if (!validation.valid) {
  console.error('Validation errors:');
  for (const error of validation.errors) {
    console.error(`  - ${error}`);
  }
  process.exit(1);
}
console.log('  Validation passed');

// Step 5: Save manifest
console.log('\nStep 5: Saving complete manifest...');
const manifestPath = path.join(__dirname, 'url-migration.json');
await saveManifest(completeManifest, manifestPath);

// Step 6: Find and update internal links
console.log('\nStep 6: Finding and updating internal links...');
let linksUpdated = 0;

for (const file of currentFiles) {
  let content = fs.readFileSync(file, 'utf-8');
  let changed = false;

  // Replace markdown links
  const linkRegex = /\[([^\]]*)\]\((\/[^)]+)\)/g;
  let match;
  let newContent = content;

  while ((match = linkRegex.exec(content)) !== null) {
    const fullMatch = match[0];
    const linkText = match[1];
    const link = match[2];

    // Remove hash for lookup
    const hashIndex = link.indexOf('#');
    const baseLink = hashIndex !== -1 ? link.substring(0, hashIndex) : link;
    const hash = hashIndex !== -1 ? link.substring(hashIndex) : '';

    // Look up redirect
    if (fromToMap.has(baseLink)) {
      const newLink = fromToMap.get(baseLink) + hash;
      console.log(`  Updating in ${path.basename(file)}: ${baseLink} -> ${fromToMap.get(baseLink)}`);

      newContent = newContent.replace(`(${link})`, `(${newLink})`);
      changed = true;
      linksUpdated++;
    }
  }

  if (changed) {
    fs.writeFileSync(file, newContent, 'utf-8');
  }
}

console.log(`  Updated ${linksUpdated} internal links`);

// Step 7: Apply the additional migrations
console.log('\nStep 7: Applying additional migrations...');

const additionalToApply = [];
for (const addEntry of additionalEntries) {
  // Check if the file exists before trying to rename
  try {
    fs.accessSync(addEntry.oldFile);
    additionalToApply.push(addEntry);
  } catch (e) {
    console.log(`  Skipping ${addEntry.oldFile} (file not found, probably already migrated)`);
  }
}

// Use git mv for these
let applied = 0;
for (const entry of additionalToApply) {
  // Check if file exists and target doesn't
  try {
    fs.accessSync(entry.oldFile);
  } catch (e) {
    console.log(`  Skipping ${entry.oldFile} (source not found)`);
    continue;
  }

  try {
    fs.accessSync(entry.newFile);
    console.log(`  Skipping ${entry.oldFile} (target already exists)`);
    continue;
  } catch (e) {
    // Target doesn't exist, good
  }

  // Create target directory
  const targetDir = path.dirname(entry.newFile);
  fs.mkdirSync(targetDir, { recursive: true });

  console.log(`  git mv ${path.basename(entry.oldFile)} -> ${path.basename(entry.newFile)}`);

  try {
    execFileSync('git', ['mv', entry.oldFile, entry.newFile], {
      stdio: 'inherit'
    });
    applied++;
  } catch (e) {
    console.warn(`  git mv failed, trying regular rename: ${e.message}`);
    fs.renameSync(entry.oldFile, entry.newFile);
    applied++;
  }

  // Also check if we need to remove any slugs (though these shouldn't have slugs)
  const content = fs.readFileSync(entry.newFile, 'utf-8');
  const newContent = content.replace(/^slug:\s*.+\n?/m, '');
  if (newContent !== content) {
    fs.writeFileSync(entry.newFile, newContent, 'utf-8');
  }
}

console.log(`  Applied ${applied} additional migrations`);

console.log('\nDone with complete migration!');

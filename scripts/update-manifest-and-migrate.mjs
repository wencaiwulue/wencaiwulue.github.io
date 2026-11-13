#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { normalizePath, findMarkdownFiles, buildMigrationEntry, validateMigrationManifest } from './migrate-doc-urls.mjs';
import { execFileSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read existing manifest
const existingManifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'url-migration.json'), 'utf-8'));

console.log('Building complete manifest...');

// Find all current files
const currentFiles = await findMarkdownFiles('docs');

const finalManifest = [];
const additionalMigrations = [];

// First, go through existing manifest and update entries
const oldFileMap = new Map();
for (const entry of existingManifest) {
  oldFileMap.set(entry.oldFile, entry);
}

// Now check for files that need further normalization
for (const file of currentFiles) {
  if (file === 'docs/quickstart.md') continue;

  const normalized = normalizePath(file);
  if (normalized !== file) {
    console.log(`Will migrate: ${file} → ${normalized}`);

    // Find original entry to get proper from path
    let originalEntry = null;
    for (const entry of existingManifest) {
      if (entry.newFile === file) {
        originalEntry = entry;
        break;
      }
    }

    let from = originalEntry ? originalEntry.from : `/${file.replace(/^docs\//, '').replace(/\.md$/, '')}`;
    const entry = buildMigrationEntry(file, normalized, undefined);

    // If we have an original entry, preserve the from path (oldest one)
    if (originalEntry) {
      entry.from = originalEntry.from;
    }

    additionalMigrations.push(entry);
  }
}

// Now build final manifest: existing entries + updated or additional
for (const entry of existingManifest) {
  let updatedEntry = { ...entry };

  // Check if this entry needs updating
  for (const addEntry of additionalMigrations) {
    if (addEntry.oldFile === entry.newFile) {
      // Update the newFile and to fields
      updatedEntry.newFile = addEntry.newFile;
      updatedEntry.to = addEntry.to;
      break;
    }
  }

  finalManifest.push(updatedEntry);
}

// Now add any truly new migrations (should not be many)
for (const addEntry of additionalMigrations) {
  let found = false;
  for (const entry of finalManifest) {
    if (entry.newFile === addEntry.newFile) {
      found = true;
      break;
    }
  }
  if (!found) {
    finalManifest.push(addEntry);
  }
}

console.log(`Validating final manifest (${finalManifest.length} entries)...`);
const validation = validateMigrationManifest(finalManifest);
if (!validation.valid) {
  console.error('Validation errors:');
  for (const error of validation.errors) {
    console.error(`  - ${error}`);
  }
  process.exit(1);
}

console.log('Validation passed. Saving url-migration.json...');
fs.writeFileSync(path.join(__dirname, 'url-migration.json'), JSON.stringify(finalManifest, null, 2), 'utf-8');

console.log('\nNow applying additional migrations with git mv...');

for (const addEntry of additionalMigrations) {
  try {
    // Check if old file exists and new file doesn't
    fs.accessSync(addEntry.oldFile);
    try {
      fs.accessSync(addEntry.newFile);
      console.log(`Skipping ${addEntry.oldFile} - target already exists`);
      continue;
    } catch (e) { /* okay, target doesn't exist */ }

    // Make sure target directory exists
    const targetDir = path.dirname(addEntry.newFile);
    fs.mkdirSync(targetDir, { recursive: true });

    console.log(`git mv ${addEntry.oldFile} ${addEntry.newFile}`);
    execFileSync('git', ['mv', addEntry.oldFile, addEntry.newFile], { stdio: 'inherit' });
  } catch (e) {
    console.warn(`Failed to migrate ${addEntry.oldFile}: ${e.message}`);
  }
}

console.log('\nDone with manifest and migrations!');

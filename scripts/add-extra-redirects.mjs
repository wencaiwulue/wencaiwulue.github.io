#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'url-migration.json'), 'utf-8'));

const extraRedirects = [];
const existingFroms = new Set(manifest.map(e => e.from));

// Add extra redirects for:
// 1. Paths with spaces removed
// 2. URL-encoded paths
for (const entry of manifest) {
  const fromWithoutSpaces = entry.from.replace(/\s+/g, '');
  if (fromWithoutSpaces !== entry.from && !existingFroms.has(fromWithoutSpaces)) {
    extraRedirects.push({
      oldFile: entry.oldFile,
      newFile: entry.newFile,
      from: fromWithoutSpaces,
      to: entry.to
    });
  }
}

console.log(`Adding ${extraRedirects.length} extra redirect entries...`);
const finalManifest = [...manifest, ...extraRedirects];

fs.writeFileSync(path.join(__dirname, 'url-migration.json'), JSON.stringify(finalManifest, null, 2), 'utf-8');
console.log('Updated url-migration.json!');

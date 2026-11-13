#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'url-migration.json'), 'utf-8'));

const brokenLinks = [
  '/llm/2025-05-26使用nsys分析LLM性能问题',
  '/llm/2026-03-18OpenViking学习',
  '/blog/2026-05-16macOS上Chromium和Chrome数据同步',
  '/blog/2026-04-20hermes-agent-run-agent-analysis',
  '/llm/2026-03-12OpenClaw实践'
];

// Also check URL-encoded versions
console.log('Checking manifest for broken links:');
for (const from of brokenLinks) {
  let found = false;
  for (const entry of manifest) {
    if (entry.from === from) {
      found = true;
      console.log(`✓ Found: ${from} → ${entry.to}`);
      break;
    }
  }
  if (!found) {
    console.log(`✗ NOT FOUND: ${from}`);
    // Also try with spaces
    const fromWithSpaces = from.replace(/(?<=\d{4}-\d{2}-\d{2})-/, ' ');
    for (const entry of manifest) {
      if (entry.from === fromWithSpaces) {
        console.log(`  But found with spaces: ${entry.from} → ${entry.to}`);
        break;
      }
    }
  }
}

// Also check what the actual new paths should be
console.log('\nChecking if new files exist:');
for (const from of brokenLinks) {
  for (const entry of manifest) {
    if (entry.from.includes('2025-05-26') || entry.from.includes('2026-03-18') ||
        entry.from.includes('2026-05-16') || entry.from.includes('2026-04-20') ||
        entry.from.includes('2026-03-12')) {
      console.log(`${entry.oldFile} → ${entry.newFile} (from: ${entry.from}, to: ${entry.to})`);
    }
  }
}

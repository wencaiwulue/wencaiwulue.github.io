#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'url-migration.json'), 'utf-8'));

const filesToCheck = [
  '使用 nsys 分析 LLM 性能问题',
  'OpenViking 学习',
  'macOS上 Chromium 和 Chrome数据同步',
  'hermes-agent-run-agent-analysis',
  'OpenClaw 实践'
];

console.log('Looking for specific entries in manifest:');
for (const entry of manifest) {
  for (const check of filesToCheck) {
    if (entry.from.includes(check) || entry.to.includes(check) ||
        entry.oldFile.includes(check) || entry.newFile.includes(check)) {
      console.log(`\nFound entry:`);
      console.log(`  oldFile: ${entry.oldFile}`);
      console.log(`  newFile: ${entry.newFile}`);
      console.log(`  from:    ${entry.from}`);
      console.log(`  to:      ${entry.to}`);
    }
  }
}

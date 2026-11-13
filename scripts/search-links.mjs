#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const brokenLinks = [
  '2025-05-26 使用 nsys 分析 LLM 性能问题',
  '2026-03-18 OpenViking 学习',
  '2026-05-16 macOS上 Chromium 和 Chrome数据同步',
  '2026-04-20 hermes-agent-run-agent-analysis',
  '2026-03-12 OpenClaw 实践'
];

function searchInDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'build' || entry.name === '.docusaurus') {
        continue;
      }
      searchInDirectory(fullPath);
    } else if (entry.name.endsWith('.js') || entry.name.endsWith('.md') || entry.name.endsWith('.json')) {
      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        for (const link of brokenLinks) {
          if (content.includes(link)) {
            console.log(`Found in ${path.relative(rootDir, fullPath)}: ${link}`);
          }
        }
      } catch (e) {
        // ignore
      }
    }
  }
}

console.log('Searching for broken links...');
searchInDirectory(rootDir);
console.log('Done searching.');

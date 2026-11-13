#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 读取 url-migration.json
const urlMigrationPath = path.join(__dirname, 'url-migration.json');
const urlMigration = JSON.parse(fs.readFileSync(urlMigrationPath, 'utf-8'));

// 创建一个 from -> entry 的映射
const fromMap = {};
for (const entry of urlMigration) {
  fromMap[entry.from] = entry;
}

// 检查报错的链接
const brokenLinks = [
  '/llm/2025-05-26%20使用%20nsys%20分析%20LLM%20性能问题',
  '/llm/2026-03-18%20OpenViking%20学习',
  '/blog/2026-05-16%20macOS上%20Chromium%20和%20Chrome数据同步',
  '/blog/2026-04-20%20hermes-agent-run-agent-analysis',
  '/llm/2026-03-12%20OpenClaw%20实践'
];

console.log('Checking broken links:');
for (const link of brokenLinks) {
  console.log(`\nChecking: ${link}`);
  const decoded = decodeURI(link);
  console.log(`Decoded: ${decoded}`);

  if (fromMap[decoded]) {
    console.log(`✓ Found in migration: ${JSON.stringify(fromMap[decoded], null, 2)}`);
  } else {
    console.log(`✗ NOT found in migration`);
  }
}

console.log(`\nTotal migration entries: ${urlMigration.length}`);

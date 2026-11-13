#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const docsDir = path.join(__dirname, '..', 'docs');

// 读取 url-migration.json
const urlMigrationPath = path.join(__dirname, 'url-migration.json');
const urlMigration = JSON.parse(fs.readFileSync(urlMigrationPath, 'utf-8'));

// 创建一个 from -> to 的映射
const redirectMap = {};
for (const entry of urlMigration) {
  redirectMap[entry.from] = entry.to;
}

// 递归查找所有 .md 文件
function findMarkdownFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findMarkdownFiles(fullPath, files);
    } else if (entry.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }
  return files;
}

// 处理文件内容中的链接
function updateLinksInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let changed = false;

  // 查找所有 markdown 链接 [text](url)
  // 注意：这里只处理相对路径链接，不处理完整的 URL
  const linkRegex = /\[([^\]]*)\]\(([^)]+)\)/g;
  let match;

  while ((match = linkRegex.exec(content)) !== null) {
    const originalLink = match[2];
    let link = originalLink;

    // 跳过外部链接（以 http:// 或 https:// 开头的）
    if (link.startsWith('http://') || link.startsWith('https://')) {
      continue;
    }

    // 跳过锚点链接
    if (link.startsWith('#')) {
      continue;
    }

    // 处理以 / 开头的链接
    if (link.startsWith('/')) {
      // 移除尾部的锚点
      const hashIndex = link.indexOf('#');
      const baseLink = hashIndex !== -1 ? link.substring(0, hashIndex) : link;
      const hash = hashIndex !== -1 ? link.substring(hashIndex) : '';

      // 查找是否有重定向
      if (redirectMap[baseLink]) {
        const newLink = redirectMap[baseLink] + hash;
        if (newLink !== link) {
          console.log(`Updating in ${path.relative(docsDir, filePath)}: ${link} -> ${newLink}`);
          content = content.replace(`(${link})`, `(${newLink})`);
          changed = true;
        }
      }
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf-8');
  }
}

// 主程序
async function main() {
  console.log('Updating internal links...');

  const markdownFiles = findMarkdownFiles(docsDir);
  console.log(`Found ${markdownFiles.length} markdown files`);

  for (const file of markdownFiles) {
    updateLinksInFile(file);
  }

  console.log('Done updating internal links!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

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

// 也需要支持 URL 编码的 from 路径
for (const entry of urlMigration) {
  const encodedFrom = encodeURI(entry.from);
  if (encodedFrom !== entry.from) {
    redirectMap[encodedFrom] = entry.to;
  }
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

  // 尝试多种链接模式
  const patterns = [
    // Markdown 链接 [text](url)
    /\[([^\]]*)\]\(([^)]+)\)/g,
    // HTML 链接 <a href="url">
    /<a\s+[^>]*href="([^"]+)"[^>]*>/g,
    // Wiki 链接 [[url]]
    /\[\[([^\]]+)\]\]/g
  ];

  for (const pattern of patterns) {
    let match;
    // 重置 lastIndex
    pattern.lastIndex = 0;

    while ((match = pattern.exec(content)) !== null) {
      const originalLink = match[1];
      let link = originalLink;

      // 跳过外部链接
      if (link.startsWith('http://') || link.startsWith('https://')) {
        continue;
      }

      // 跳过锚点链接
      if (link.startsWith('#')) {
        continue;
      }

      // 处理以 / 开头的链接
      if (link.startsWith('/')) {
        const hashIndex = link.indexOf('#');
        const baseLink = hashIndex !== -1 ? link.substring(0, hashIndex) : link;
        const hash = hashIndex !== -1 ? link.substring(hashIndex) : '';

        // 先尝试直接匹配
        let newBaseLink = redirectMap[baseLink];

        // 如果没找到，尝试解码
        if (!newBaseLink) {
          try {
            const decodedLink = decodeURI(baseLink);
            newBaseLink = redirectMap[decodedLink];
          } catch (e) {
            // 解码失败，忽略
          }
        }

        if (newBaseLink) {
          const newLink = newBaseLink + hash;
          if (newLink !== link) {
            console.log(`Updating in ${path.relative(docsDir, filePath)}: ${link} -> ${newLink}`);
            // 注意：这里需要根据不同的模式做不同的替换
            // 为简化，我们只做完整内容中的字符串替换
            content = content.split(link).join(newLink);
            changed = true;
          }
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
  console.log('Fixing all internal links...');

  const markdownFiles = findMarkdownFiles(docsDir);
  console.log(`Found ${markdownFiles.length} markdown files`);

  for (const file of markdownFiles) {
    updateLinksInFile(file);
  }

  console.log('Done fixing links!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

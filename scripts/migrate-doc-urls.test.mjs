import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import {
  normalizePath,
  parseFrontMatter,
  buildMigrationEntry,
  validateMigrationManifest,
  findMarkdownFiles,
  buildMigrationManifest,
  applyMigration,
  saveManifest
} from './migrate-doc-urls.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('normalizePath', () => {
  it('should normalize spaces to hyphens', () => {
    assert.strictEqual(
      normalizePath('docs/ide/2024-06-14 1_协同编辑.md'),
      'docs/ide/2024-06-14-1-协同编辑.md'
    );
  });

  it('should normalize underscores to hyphens', () => {
    assert.strictEqual(
      normalizePath('docs/ide/2024-06-14_1_协同编辑.md'),
      'docs/ide/2024-06-14-1-协同编辑.md'
    );
  });

  it('should normalize multiple separators to single hyphen', () => {
    assert.strictEqual(
      normalizePath('docs/ide/2024-06-14   1__协同编辑.md'),
      'docs/ide/2024-06-14-1-协同编辑.md'
    );
  });

  it('should preserve Chinese characters', () => {
    assert.strictEqual(
      normalizePath('docs/ide/2024-06-14 协同编辑.md'),
      'docs/ide/2024-06-14-协同编辑.md'
    );
  });

  it('should preserve date format', () => {
    assert.strictEqual(
      normalizePath('docs/ide/2024-06-14 test.md'),
      'docs/ide/2024-06-14-test.md'
    );
  });

  it('should normalize ampersand and brackets', () => {
    assert.strictEqual(
      normalizePath('docs/ide/2024-05-01 文件-订阅-单个&打开.md'),
      'docs/ide/2024-05-01-文件-订阅-单个-打开.md'
    );
  });

  it('should keep quickstart.md unchanged', () => {
    assert.strictEqual(
      normalizePath('docs/quickstart.md'),
      'docs/quickstart.md'
    );
  });

  it('should normalize Chinese angle quotes 《》', () => {
    assert.strictEqual(
      normalizePath('docs/note/2021-10-09 《小妇人》.md'),
      'docs/note/2021-10-09-小妇人.md'
    );
  });

  it('should normalize multiple Chinese punctuation', () => {
    assert.strictEqual(
      normalizePath('docs/note/2021-10-09 《小妇人》&其他.md'),
      'docs/note/2021-10-09-小妇人-其他.md'
    );
  });

  it('should preserve ASCII case', () => {
    assert.strictEqual(
      normalizePath('docs/blog/2026-04-20 hermes-agent-run-agent-analysis.md'),
      'docs/blog/2026-04-20-hermes-agent-run-agent-analysis.md'
    );
  });
});

describe('parseFrontMatter', () => {
  it('should extract slug from front matter', () => {
    const content = `---
slug: ot
title: 协同编辑
---
content here`;
    const result = parseFrontMatter(content);
    assert.strictEqual(result.slug, 'ot');
  });

  it('should return undefined for no slug', () => {
    const content = `---
title: 协同编辑
---
content here`;
    const result = parseFrontMatter(content);
    assert.strictEqual(result.slug, undefined);
  });

  it('should handle no front matter', () => {
    const content = 'content here';
    const result = parseFrontMatter(content);
    assert.strictEqual(result.slug, undefined);
  });
});

describe('findMarkdownFiles', () => {
  it('should find all markdown files in docs directory', async () => {
    const files = await findMarkdownFiles('docs');
    assert.ok(files.length > 0);
    assert.ok(files.some(f => f.endsWith('quickstart.md')));
  });
});

describe('buildMigrationEntry', () => {
  it('should build entry for file with custom slug', () => {
    const entry = buildMigrationEntry(
      'docs/ide/2024-06-14 1_协同编辑.md',
      'docs/ide/2024-06-14-1-协同编辑.md',
      'ot'
    );
    assert.deepStrictEqual(entry, {
      oldFile: 'docs/ide/2024-06-14 1_协同编辑.md',
      newFile: 'docs/ide/2024-06-14-1-协同编辑.md',
      from: '/ide/ot',
      to: '/ide/2024-06-14-1-协同编辑'
    });
  });

  it('should build entry for ordinary file', () => {
    const entry = buildMigrationEntry(
      'docs/ide/2024-05-01 文件-编辑-保存.md',
      'docs/ide/2024-05-01-文件-编辑-保存.md',
      undefined
    );
    assert.deepStrictEqual(entry, {
      oldFile: 'docs/ide/2024-05-01 文件-编辑-保存.md',
      newFile: 'docs/ide/2024-05-01-文件-编辑-保存.md',
      from: '/ide/2024-05-01 文件-编辑-保存',
      to: '/ide/2024-05-01-文件-编辑-保存'
    });
  });

  it('should not include .md in routes', () => {
    const entry = buildMigrationEntry(
      'docs/test.md',
      'docs/test-new.md',
      undefined
    );
    assert.ok(!entry.from.endsWith('.md'));
    assert.ok(!entry.to.endsWith('.md'));
  });
});

describe('validateMigrationManifest', () => {
  it('should detect duplicate from paths', () => {
    const manifest = [
      { oldFile: 'a.md', newFile: 'a-new.md', from: '/a', to: '/a-new' },
      { oldFile: 'b.md', newFile: 'b-new.md', from: '/a', to: '/b-new' }
    ];
    const result = validateMigrationManifest(manifest);
    assert.ok(result.errors.some(e => e.includes('duplicate from')));
  });

  it('should detect from === to', () => {
    const manifest = [
      { oldFile: 'a.md', newFile: 'a.md', from: '/a', to: '/a' }
    ];
    const result = validateMigrationManifest(manifest);
    assert.ok(result.errors.some(e => e.includes('from === to')));
  });

  it('should detect spaces in new routes', () => {
    const manifest = [
      { oldFile: 'a.md', newFile: 'a b.md', from: '/a', to: '/a b' }
    ];
    const result = validateMigrationManifest(manifest);
    assert.ok(result.errors.some(e => e.includes('space in new route')));
  });

  it('should pass valid manifest', () => {
    const manifest = [
      { oldFile: 'a.md', newFile: 'a-new.md', from: '/a', to: '/a-new' },
      { oldFile: 'b.md', newFile: 'b-new.md', from: '/b', to: '/b-new' }
    ];
    const result = validateMigrationManifest(manifest);
    assert.strictEqual(result.errors.length, 0);
  });

  it('should detect duplicate oldFile', () => {
    const manifest = [
      { oldFile: 'a.md', newFile: 'a-new.md', from: '/a', to: '/a-new' },
      { oldFile: 'a.md', newFile: 'another.md', from: '/a2', to: '/another' }
    ];
    const result = validateMigrationManifest(manifest);
    assert.ok(result.errors.some(e => e.includes('duplicate oldFile')));
  });

  it('should detect duplicate newFile', () => {
    const manifest = [
      { oldFile: 'a.md', newFile: 'same.md', from: '/a', to: '/same' },
      { oldFile: 'b.md', newFile: 'same.md', from: '/b', to: '/same' }
    ];
    const result = validateMigrationManifest(manifest);
    assert.ok(result.errors.some(e => e.includes('duplicate newFile')));
  });

  it('should detect duplicate to', () => {
    const manifest = [
      { oldFile: 'a.md', newFile: 'a-new.md', from: '/a', to: '/same-target' },
      { oldFile: 'b.md', newFile: 'b-new.md', from: '/b', to: '/same-target' }
    ];
    const result = validateMigrationManifest(manifest);
    assert.ok(result.errors.some(e => e.includes('duplicate to')));
  });

  it('should detect empty from', () => {
    const manifest = [
      { oldFile: 'a.md', newFile: 'a-new.md', from: '', to: '/a-new' }
    ];
    const result = validateMigrationManifest(manifest);
    assert.ok(result.errors.some(e => e.includes('empty from for')));
  });

  it('should detect empty to', () => {
    const manifest = [
      { oldFile: 'a.md', newFile: 'a-new.md', from: '/a', to: '' }
    ];
    const result = validateMigrationManifest(manifest);
    assert.ok(result.errors.some(e => e.includes('empty to for')));
  });

  it('should detect %20 in new routes', () => {
    const manifest = [
      { oldFile: 'a.md', newFile: 'a-new.md', from: '/a', to: '/path%20with%20spaces' }
    ];
    const result = validateMigrationManifest(manifest);
    assert.ok(result.errors.some(e => e.includes('%20 in new route')));
  });

  it('should detect Unicode toLowerCase conflicts in to paths', () => {
    const manifest = [
      { oldFile: 'File1.md', newFile: 'file1.md', from: '/File1', to: '/file1' },
      { oldFile: 'FILE1.md', newFile: 'FILE1.md', from: '/FILE1', to: '/FILE1' }
    ];
    const result = validateMigrationManifest(manifest);
    assert.ok(result.errors.some(e => e.includes('Unicode toLowerCase conflict')));
  });

  it('should not detect false positive Unicode conflicts', () => {
    const manifest = [
      { oldFile: 'File1.md', newFile: 'file1.md', from: '/File1', to: '/file1' },
      { oldFile: 'File2.md', newFile: 'file2.md', from: '/File2', to: '/file2' }
    ];
    const result = validateMigrationManifest(manifest);
    assert.strictEqual(result.errors.length, 0);
  });
});

describe('applyMigration preflight checks', () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kubevpn-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should detect missing old files during preflight', async () => {
    const manifest = [
      { oldFile: path.join(tempDir, 'non-existent.md'), newFile: path.join(tempDir, 'new-file.md'), from: '/old', to: '/new' }
    ];

    await assert.rejects(
      async () => await applyMigration(manifest, false),
      (err) => err.message.includes('missing source file')
    );
  });

  it('should detect existing new files during preflight', async () => {
    const oldFile = path.join(tempDir, 'old-file.md');
    const newFile = path.join(tempDir, 'existing-file.md');
    await fs.writeFile(oldFile, '# Test');
    await fs.writeFile(newFile, '# Existing');

    const manifest = [
      { oldFile, newFile, from: '/old', to: '/new' }
    ];

    await assert.rejects(
      async () => await applyMigration(manifest, false),
      (err) => err.message.includes('destination file already exists')
    );
  });
});

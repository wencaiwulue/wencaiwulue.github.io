# 网站

本网站使用 [Docusaurus](https://docusaurus.io/) 构建，这是一个现代化的静态网站生成器。

### 安装

```shell
npm ci
```

### 本地开发

```shell
npm start
```

### 构建

```shell
npm run build
```

### 预览

```shell
npm run serve
```

### 测试

```shell
npm test
```

### 验证构建

```shell
npm run verify:build
```

### 文章命名规则

博客文章应使用以下格式命名：`YYYY-MM-DD-article-title.md`（空格替换为连字符）。

### 自动生成最近文章

最近文章在 prestart 和 prebuild 期间由 `scripts/generate-content-metadata.mjs` 自动生成，它会创建 `src/generated/recent-posts.json`。

### 旧版重定向清单

为了向后兼容，维护了一个旧版重定向清单（`scripts/url-migration.json`）。迁移后请勿重新生成此文件。

### 客户端重定向限制

重定向使用 Docusaurus 的客户端重定向插件在客户端实现，并为每个旧版 URL 生成静态 HTML 重定向文件。

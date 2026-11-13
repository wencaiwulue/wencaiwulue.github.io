---
name: verify
description: Run the Docusaurus site and verify homepage, search, redirects, responsive themes, and Lighthouse behavior in a real browser.
---

# Runtime verification

Use a production build, not the development server:

```bash
npm run build
npm run verify:build
npm run serve -- --port 3000
```

Open `http://127.0.0.1:3000` in a browser or browser automation and drive these flows:

1. Homepage at 320, 375, 768, 996, and 1280 px: no horizontal overflow; four recent posts and both hero links work.
2. Light/dark themes, mobile navigation drawer, keyboard skip link, visible focus, and reduced motion.
3. Search for `协同编辑`: results open the new dated document route. Search a nonsense term: `没有找到任何文档` appears without console errors.
4. Open `/ide/ot?from=legacy` with JavaScript enabled: the dated URL loads with the query preserved. Repeat with JavaScript disabled to verify the static meta-refresh destination.
5. Disable JavaScript and reload the homepage: recent articles remain in the SSG HTML. Open `/quickstart` and an unknown route: they render the introduction and 404 page respectively.
6. Check a draw.io diagram and the LlamaFactory SFT article: images render, and the first SFT screenshot is eager/high-priority while other article images remain lazy.

For mobile Lighthouse, run against the production server. `docusaurus serve` has no gzip/cache headers; a second run with gzip and cache headers better approximates GitHub Pages, so label the two results separately.

```bash
npx lighthouse http://127.0.0.1:3000/ \
  --only-categories=performance,accessibility,best-practices,seo \
  --form-factor=mobile --screenEmulation.mobile \
  --output=json --output-path=/tmp/wencaiwulue-home-lighthouse.json \
  --chrome-flags="--headless --no-sandbox"
```

Capture screenshots for 320 px light, 1280 px light/dark, empty search, and the no-JavaScript redirect. Stop the preview server when finished.

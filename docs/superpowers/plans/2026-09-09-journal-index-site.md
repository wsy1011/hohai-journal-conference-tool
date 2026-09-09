# Journal Index Query Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a GitHub Pages-compatible static React site for the full Hohai University 2024/2026 catalog with independent 2026 columns, research-topic filtering, journal detail views, and EasyScholar metadata.

**Architecture:** A Vite + React + TypeScript SPA loads a replaceable `public/data/catalog.json`. Search/filter state is local and URL-hash aware. Journal detail data is fetched lazily from EasyScholar through an isolated client module; the user-authorized SecretKey is shipped as a default config per request, with a UI override and clear action.

**Tech Stack:** Vite, React, TypeScript, plain CSS, EasyScholar `getPublicationRank` REST endpoint, GitHub Actions Pages deployment.

---

### Task 1: Scaffold the static app and catalog data

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/data/catalog.ts`
- Create: `public/data/catalog.json`
- Create: `public/data/easyscholar-config.json`

- [ ] **Step 1: Create the Vite scripts and entry document**

Use `npm run dev`, `npm run build`, and `npm run preview`; configure Vite base path from `VITE_BASE_PATH` with `/` as the default.

- [ ] **Step 2: Generate the replaceable catalog JSON**

Transform `catalog_merged.json` into the `CatalogItem` schema from the design spec. Preserve both 2026 grade columns, source pages, aliases, and statuses. Add topic labels for maritime, transportation, logistics, optimization, robustness, risk, autonomous systems, control, marine engineering, and sustainability matches.

- [ ] **Step 3: Add the authorized EasyScholar default config**

Write the SecretKey supplied in the attached PDF to `public/data/easyscholar-config.json` as a visible default configuration. Include a README warning in Task 6 that any GitHub publication exposes it.

- [ ] **Step 4: Run a data shape check**

Run a Node script that loads `public/data/catalog.json` and asserts 3,479 unique items, independent 2026 fields, and no missing `id` or `name`. Expected: exit 0.

### Task 2: Implement query state and EasyScholar client

**Files:**
- Create: `src/data/researchTopics.ts`
- Create: `src/lib/easyScholar.ts`
- Create: `src/hooks/useCatalogQuery.ts`
- Modify: `src/data/catalog.ts`

- [ ] **Step 1: Add research-topic scoring**

Export topic groups and a deterministic `scoreResearchRelevance(item)` function. Match names, aliases, and topic labels; return `{ score, topics }` and keep non-matches at score 0.

- [ ] **Step 2: Implement query/filter/sort/pagination state**

Support `q`, type, grades, status, researchOnly, sort, and page. Serialize the current query into `location.hash`; reset page to 1 whenever query/filter changes. Page size is 50.

- [ ] **Step 3: Implement EasyScholar normalization**

Export `fetchPublicationRank({ secretKey, publicationName })` and normalize `data.officialRank.all` plus fallback `data.officialRank.select` for `sciif`, `sci`, `ssci`, `zhongguokejihexin`, `sciUp`, `sciUpSmall`, and `sciUpTop`. Map 40002, non-200 responses, fetch failures, and missing values to explicit UI-safe states.

- [ ] **Step 4: Test the pure logic**

Run Node/TypeScript checks for one maritime title, one optimization title, one unrelated title, URL hash round-trip, seven EasyScholar field normalization, and 40002 error mapping. Expected: all assertions pass.

### Task 3: Build the approved OpenAI-inspired interface

**Files:**
- Create: `src/components/Header.tsx`
- Create: `src/components/SearchControls.tsx`
- Create: `src/components/ResultsTable.tsx`
- Create: `src/components/JournalDrawer.tsx`
- Create: `src/components/SettingsDialog.tsx`
- Create: `src/styles.css`
- Modify: `src/App.tsx`
- Modify: `src/main.tsx`

- [ ] **Step 1: Implement the header and search controls**

Add title, counts, search field, type/grade/status pills, relevance shortcut, sort control, and a settings button. The visual order matches the approved layout.

- [ ] **Step 2: Implement the result table**

Render independent columns `2024 等级`, `2026 综合目录`, and `2026 计算机专项`. Use `—` for absent values, distinct pale-gold styling for the computer-specialized column, and row click/keyboard activation for journals.

- [ ] **Step 3: Implement the journal drawer**

Show full catalog fields, status, pages, research-topic tags, and EasyScholar loading/success/error states. Query EasyScholar only after a journal is selected. Show all seven requested fields with Chinese labels and raw keys.

- [ ] **Step 4: Implement SecretKey settings**

Load the default config, allow override in a modal, save to namespaced `localStorage`, and provide a clear button. Never put the key in a URL or console log.

- [ ] **Step 5: Add responsive and accessibility behavior**

Use dialog semantics, Escape close, focus return, visible text for loading/errors, keyboard row activation, responsive horizontal table scrolling, and a mobile full-screen drawer.

### Task 4: GitHub Pages deployment and documentation

**Files:**
- Create: `.github/workflows/deploy.yml`
- Create: `README.md`
- Create: `.gitignore`

- [ ] **Step 1: Add Pages workflow**

Build with Node 20, set `VITE_BASE_PATH=/${{ github.event.repository.name }}/`, upload `dist`, and deploy through the official Pages actions.

- [ ] **Step 2: Document data replacement**

Explain replacing `public/data/catalog.json`, running the data shape check, building locally, and publishing to GitHub Pages.

- [ ] **Step 3: Document EasyScholar exposure**

State that the authorized default SecretKey is intentionally shipped per user instruction and is visible to anyone with repository/site access; include the UI override/clear workflow and recommend replacing it before public deployment if necessary.

### Task 5: Verify the complete app

**Files:**
- Create: `output/playwright/` screenshots (generated only)

- [ ] **Step 1: Build and preview**

Run `npm run build`, then start the Vite preview server on an available port. Expected: build completes with no TypeScript or bundler errors.

- [ ] **Step 2: Exercise the browser flow**

Use Playwright to verify initial rendering, search, research-only filter, independent 2026 columns, opening a journal drawer, EasyScholar loading/error state, settings save/clear, Escape close, and mobile layout.

- [ ] **Step 3: Inspect screenshots**

Capture desktop and mobile screenshots and check for clipped headers, overlapping table content, inaccessible controls, and broken drawer layout. Repair any defect before finalizing.

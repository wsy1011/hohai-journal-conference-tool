# 多学科、多年份目录 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 2022/2024/2026 自然科学、计算机专项、人文社科目录接入现有网站，并新增首次进入的学科选择页与三套独立检索数据库。

**Architecture:** 使用离线 Node 脚本读取已提取的 PDF 文本，生成三个独立的静态 JSON 数据库和一个 manifest；React 根据 `#discipline=natural|computer|social` 动态加载对应数据库。现有搜索、筛选、分页、详情抽屉和 EasyScholar 客户端复用同一套组件，通过 manifest 提供动态年份列和口径说明。

**Tech Stack:** Vite、React 19、TypeScript、纯 CSS、Node ESM 脚本、pdftotext 预提取文本、GitHub Pages 静态部署。

---

## 文件地图

- Create: `scripts/build-multi-catalog.mjs` — 解析 2022/2024/2026 文本、规范化条目、合并年份并生成三套 JSON。
- Create: `scripts/source-catalogs.mjs` — 集中声明源 PDF、提取文本路径、学科、年份和解析格式。
- Create: `public/data/catalog-natural.json` — 自然科学三年份数据库。
- Create: `public/data/catalog-computer.json` — 计算机专项三年份数据库。
- Create: `public/data/catalog-social.json` — 人文社科三年份数据库。
- Create: `public/data/catalog-manifest.json` — 学科元数据、年份列和数量。
- Create: `src/components/DisciplineChooser.tsx` — 初始学科选择页。
- Modify: `src/data/catalog.ts` — 新增统一条目类型、manifest 类型、按学科加载函数。
- Modify: `src/hooks/useCatalogQuery.ts` — 从固定等级字段改为动态年份列和当前学科状态。
- Modify: `src/components/SearchControls.tsx` — 显示当前学科、年份口径和切换入口。
- Modify: `src/components/ResultsTable.tsx` — 动态渲染三年份等级列，支持“其他”类型。
- Modify: `src/components/JournalDrawer.tsx` — 显示三年份等级和主办单位/出版社，只有期刊调用 EasyScholar。
- Modify: `src/App.tsx` — 根据 hash 显示选择页或加载对应数据库。
- Modify: `src/styles.css` — 入口卡片、学科切换、动态表格和“其他”类型样式。
- Modify: `scripts/check-catalog.mjs` — 校验三个数据库、manifest 数量、ID 和字段结构。
- Modify: `package.json` — 增加 `data:build` 命令。
- Test: `scripts/verify-multi-catalog.mjs` — 对三套数据的年份、数量、字段和已知样例做断言。
- Modify: `README.md` — 更新多学科数据生成、入口和 2024 计算机专项口径说明。

### Task 1: 建立 PDF 文本输入和解析基线

**Files:**
- Create: `scripts/source-catalogs.mjs`
- Create: `extra_extracted/2022_natural.txt`
- Create: `extra_extracted/2022_computer.txt`
- Create: `extra_extracted/2022_social.txt`
- Create: `extra_extracted/2024_social.txt`
- Create: `extra_extracted/2026_social.txt`
- Modify: `.gitignore`

- [ ] **Step 1: 固定源文件清单**

在 `scripts/source-catalogs.mjs` 导出如下结构，并使用 `String.raw` 保存 Windows 路径：

```js
export const sourceCatalogs = [
  { discipline: "natural", year: 2022, format: "legacy", pdf: String.raw`C:\\Users\\wsy11\\Desktop\\2022\\附件1：河海大学高质量论文期刊及学术会议目录（自然科学类，不含计算机科学与技术、软件工程学科）.pdf`, text: "extra_extracted/2022_natural.txt" },
  { discipline: "computer", year: 2022, format: "legacy", pdf: String.raw`C:\\Users\\wsy11\\Desktop\\2022\\附件2：河海大学高质量论文期刊及学术会议目录（计算机科学与技术、软件工程学科）.pdf`, text: "extra_extracted/2022_computer.txt" },
  { discipline: "social", year: 2022, format: "legacy", pdf: String.raw`C:\\Users\\wsy11\\Desktop\\2022\\附件3：河海大学高质量论文期刊及学术会议目录（人文社科类）.pdf`, text: "extra_extracted/2022_social.txt" },
  { discipline: "social", year: 2024, format: "modern", pdf: String.raw`C:\\Users\\wsy11\\Desktop\\2024\\附件2.《河海大学高质量论文期刊及学术会议目录》（人文社科类）.pdf`, text: "extra_extracted/2024_social.txt" },
  { discipline: "social", year: 2026, format: "modern", pdf: String.raw`C:\\Users\\wsy11\\Desktop\\2026\\附件2《 河海大学高质量论文期刊及学术会议目录（人文社科类）》.pdf`, text: "extra_extracted/2026_social.txt" },
];
```

- [ ] **Step 2: 生成并保存附加 PDF 文本**

Run each command from `C:\Users\wsy11\Desktop\daily`:

```powershell
pdftotext -layout "C:\Users\wsy11\Desktop\2022\附件1：河海大学高质量论文期刊及学术会议目录（自然科学类，不含计算机科学与技术、软件工程学科）.pdf" extra_extracted/2022_natural.txt
pdftotext -layout "C:\Users\wsy11\Desktop\2022\附件2：河海大学高质量论文期刊及学术会议目录（计算机科学与技术、软件工程学科）.pdf" extra_extracted/2022_computer.txt
pdftotext -layout "C:\Users\wsy11\Desktop\2022\附件3：河海大学高质量论文期刊及学术会议目录（人文社科类）.pdf" extra_extracted/2022_social.txt
pdftotext -layout "C:\Users\wsy11\Desktop\2024\附件2.《河海大学高质量论文期刊及学术会议目录》（人文社科类）.pdf" extra_extracted/2024_social.txt
pdftotext -layout "C:\Users\wsy11\Desktop\2026\附件2《 河海大学高质量论文期刊及学术会议目录（人文社科类）》.pdf" extra_extracted/2026_social.txt
```

Expected: five UTF-8 text files exist; the 2022 files contain `A类/B类/C类`, and the 2024/2026 files contain `CN/ISSN` plus `A+/A/B/C`.

- [ ] **Step 3: Ignore only reproducible extraction intermediates**

Add `extra_extracted/*.txt` to `.gitignore` only if the build script can regenerate them from the PDFs; otherwise keep the text inputs versioned. The final choice must be consistent with GitHub Actions: checked-in generated JSON must be deployable without local PDFs.

### Task 2: Implement multi-format data builder

**Files:**
- Create: `scripts/build-multi-catalog.mjs`
- Create: `scripts/verify-multi-catalog.mjs`
- Create: `public/data/catalog-natural.json`
- Create: `public/data/catalog-computer.json`
- Create: `public/data/catalog-social.json`
- Create: `public/data/catalog-manifest.json`
- Modify: `package.json`

- [ ] **Step 1: Define the normalized schema in the builder**

Each generated item must have this shape:

```js
{
  id, name, aliases, type, issn, publisher,
  grades: { "2022": "", "2024": "", "2026": "" },
  sourcePages: { "2022": "", "2024": "", "2026": "" },
  status, direction, relatedTopics
}
```

Missing grades and identifiers must be empty strings in JSON and render as `\\` in the UI. `type` must be one of `期刊`, `会议`, `其他`.

- [ ] **Step 2: Parse legacy rows**

Implement `parseLegacy(text, source)` by buffering rows beginning with a sequence number until a line ending in `A类`, `B类`, or `C类`; remove the sequence and trailing grade, join wrapped name/publisher lines, and split the publisher from the name using the extracted text columns. Set `issn` to `/`, preserve publisher, and classify type from explicit conference keywords; classify reports, newspapers,转载 and policy recommendations as `其他`.

- [ ] **Step 3: Parse modern rows**

Implement `parseModern(text, source)` by matching sequence, name, CN/ISSN and final grade on each logical row; join wrapped names before the code and normalize full-width punctuation. Preserve A+ distinctly from A.

- [ ] **Step 4: Merge each discipline by identifier then normalized name**

Implement `mergeRows(rows)` with key `code:<normalized-code>` for non-`/` identifiers and `name:<normalized-name>` otherwise. Merge aliases and publisher values without duplicates. Do not fuzzy-merge rows whose keys differ.

- [ ] **Step 5: Add existing natural/computer rows as source adapters**

Read the existing `catalog.json` once in the builder, convert its `grade2024`/`grade2026General`/`grade2026Computer` fields into the new `grades` shape, and contribute them to natural and computer datasets according to the spec. For computer 2024, copy the existing 2024 grade into `grades["2024"]` and mark manifest metadata as `2024 natural-science reference`.

- [ ] **Step 6: Compute status and research topics**

For each merged item, compare the three grades in chronological order. Use `新增` when a later year has a grade and all earlier years are empty, `未收录` when an earlier year has a grade and all later years are empty, and `等级变化` when any adjacent non-empty grades differ. Otherwise use `等级未变`. Reuse the keyword rules from `src/data/researchTopics.ts` in a dependency-free equivalent.

- [ ] **Step 7: Emit manifest and verification script**

Write manifest entries with `id`, `label`, `yearColumns`, `note`, and `count`. Add `data:build` and `data:verify` scripts to `package.json`. Verification must assert three JSON files, unique IDs, no empty names, expected year keys, and nonzero counts for all categories.

- [ ] **Step 8: Run builder and inspect counts**

Run:

```powershell
npm run data:build
npm run data:verify
```

Expected: all three datasets are generated, verification passes, and a JSON summary reports source row counts, merged counts, duplicate counts, and parse failures.

### Task 3: Replace fixed catalog types with dynamic discipline data

**Files:**
- Modify: `src/data/catalog.ts`
- Modify: `src/hooks/useCatalogQuery.ts`
- Modify: `src/App.tsx`
- Create: `src/components/DisciplineChooser.tsx`

- [ ] **Step 1: Define shared TypeScript types**

Replace fixed grade fields with:

```ts
export type Discipline = "natural" | "computer" | "social";
export type CatalogType = "期刊" | "会议" | "其他";
export type CatalogItem = {
  id: string; name: string; aliases: string[]; type: CatalogType;
  issn: string; publisher: string;
  grades: Record<string, string>;
  sourcePages: Record<string, string>;
  status: string; direction: string; relatedTopics: string[];
};
export type CatalogManifestEntry = {
  id: Discipline; label: string; yearColumns: string[]; note: string; count: number;
};
```

- [ ] **Step 2: Add `loadCatalogBundle(discipline)`**

Load `catalog-manifest.json` and the corresponding `catalog-${discipline}.json` from `import.meta.env.BASE_URL`. Reject unknown disciplines and non-OK responses with readable errors.

- [ ] **Step 3: Update query hook**

Accept `yearColumns` and use `item.grades[year]` for level filtering, sorting, and result rows. Keep URL hash state for `q`, `research`, filters, sort and page; add `discipline` at the app layer.

- [ ] **Step 4: Add chooser routing**

Parse `window.location.hash` for `discipline`. With no valid discipline render `DisciplineChooser`; with a valid discipline load its bundle. The chooser buttons must set `window.location.hash = "discipline=" + id` and the database view must provide a “切换学科” control that clears the discipline parameter.

### Task 4: Update table, filters, detail drawer and visual system

**Files:**
- Modify: `src/components/SearchControls.tsx`
- Modify: `src/components/ResultsTable.tsx`
- Modify: `src/components/JournalDrawer.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Render dynamic year headers and grades**

Pass `yearColumns` to `ResultsTable`; render one `Grade` cell per year and label 2024 computer reference as `2024 自然科学综合目录`.

- [ ] **Step 2: Add the “其他” filter**

Extend type filter buttons to `全部`、`期刊`、`会议`、`其他`; ensure `其他` rows never open the detail drawer.

- [ ] **Step 3: Add discipline context and switch button**

Show the current discipline, count and note in `SearchControls`, with a button that returns to `DisciplineChooser`.

- [ ] **Step 4: Update detail drawer**

Render all dynamic grades and publisher. Change the EasyScholar condition to `item.type === "期刊"`; for `会议` and `其他`, show `该条目不是期刊，不查询 EasyScholar`.

- [ ] **Step 5: Add chooser styles**

Create `.discipline-chooser`, `.discipline-card`, `.discipline-switch`, `.catalog-note` styles using existing palette and border language. Keep mobile cards single-column and table horizontal scrolling.

- [ ] **Step 6: Verify keyboard and accessibility behavior**

Chooser buttons must be native buttons with visible focus; table rows remain keyboard-openable only for journals; switch button has an accessible name.

### Task 5: Update validators, docs and regression checks

**Files:**
- Modify: `scripts/check-catalog.mjs`
- Modify: `README.md`
- Modify: `.github/workflows/deploy.yml`
- Create: `output/playwright/multi-discipline-regression.md`

- [ ] **Step 1: Replace fixed 3,479 assertion**

Validate manifest counts against each JSON file, unique IDs, required fields, year keys, allowed types, and no empty names. Keep the old natural dataset check as a compatibility assertion only if the converted count is unchanged.

- [ ] **Step 2: Update deployment workflow**

Run `npm run data:verify` before `npm run build`; deployment must use checked-in JSON and must not depend on the local Windows PDF paths.

- [ ] **Step 3: Update README**

Document the chooser, three database scopes, 2024 computer reference caveat, `npm run data:build`, `npm run data:verify`, and replacement workflow for future PDFs.

- [ ] **Step 4: Run automated verification**

Run:

```powershell
npm run data:build
npm run data:verify
npm run data:check
npm run build
```

Expected: all commands exit 0.

- [ ] **Step 5: Run browser regression checks**

Verify root chooser, all three buttons, hash persistence, discipline switch, year headers, search, “仅看与我的研究相关”, “其他” rows, journal EasyScholar details, non-journal no-query behavior, empty state, desktop and mobile layout. Record results in `output/playwright/multi-discipline-regression.md`.

### Task 6: Final handoff

- [ ] **Step 1: Inspect changed files and generated data sizes**

Run `Get-ChildItem public/data/catalog-*.json | Select-Object Name,Length` and inspect `git status` if a repository exists.

- [ ] **Step 2: Report the implemented scope**

Give the user the local URL, the three entry categories, the exact 2024 computer reference rule, validation results, and the reminder that EasyScholar SecretKey remains exposed in the public frontend because it was previously authorized.

## Self-review checklist

- Covers all source PDFs and the existing 2024/2026 natural/computer data adapters.
- Defines an explicit 2024 computer reference column rather than silently implying an independent file exists.
- Preserves old records with missing identifiers and adds `其他` for non-journal social-science outputs.
- Includes generated JSON, validation, UI routing, dynamic columns, EasyScholar gating, deployment and browser regression.
- No unresolved TODO/TBD placeholders remain.

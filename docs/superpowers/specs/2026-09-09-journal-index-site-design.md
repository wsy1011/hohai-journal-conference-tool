# Journal Index Query Site Design

## Goal

Build a GitHub Pages-compatible static website that exposes the complete 2024 and 2026 Hohai University natural-science journal/conference directories, supports fast combined filtering and search, offers a one-click research-relevance filter, and loads EasyScholar ranking metadata on a journal detail view.

## Confirmed Product Decisions

- The site displays all journals and conferences, not only research-relevant entries.
- A built-in shortcut filters entries related to the user's ship/UAV logistics, maritime optimization, robust optimization, risk/resilience, intelligent transportation, marine engineering, control, and sustainable transport topics.
- 2026 values are displayed in two independent columns: `2026 综合目录` and `2026 计算机专项`.
- The catalog data is replaceable JSON committed to the repository; no PDF parsing occurs in the browser.
- The site is static and deployable to GitHub Pages.
- EasyScholar data is requested only after opening a journal detail view, never for every row during initial page load.
- The EasyScholar SecretKey is entered by the user and stored only in browser `localStorage`; it is never written into repository files, generated JSON, or URL query strings.

## Visual Direction

The approved interface uses a restrained OpenAI-inspired research-tool aesthetic:

- warm off-white page background, white content surfaces, black text, thin neutral borders;
- compact header with a minimal circular mark;
- serif display heading paired with a clean sans-serif data table;
- search-first layout with pill filters and generous horizontal whitespace;
- status colors are semantic and sparse: pale orange for changed rankings, pale green for research relevance, and pale gold for the computer-specialized ranking column;
- the main result table remains dense enough for scanning, while journal details open in a right-side drawer on desktop and a full-screen sheet on mobile.

## Architecture

Use a Vite + React + TypeScript single-page application. Keep the data boundary explicit:

```text
public/data/catalog.json
  -> catalog loader
  -> normalized rows with 2024, 2026 general, and 2026 computer-specialized fields
  -> search/filter/sort state
  -> result table
  -> journal detail drawer
  -> EasyScholar client (only for selected journal)
```

The catalog remains static and user-editable. The EasyScholar client is an isolated module so the endpoint, parameter encoding, response normalization, rate-limit messaging, and local SecretKey storage can be changed without touching the table or detail components.

## Data Model

Each merged catalog item contains:

```ts
type CatalogItem = {
  id: string;
  type: "期刊" | "会议";
  name: string;
  aliases: string[];
  issn: string;
  grade2024: string;
  grade2026General: string;
  grade2026Computer: string;
  status: "等级未变" | "等级变化" | "2026新增" | "2026未收录";
  direction: "上调" | "下调" | "分目录等级不同" | "";
  relatedTopics: string[];
  sourcePages: { year2024: string; year2026General: string; year2026Computer: string };
};
```

`relatedTopics` is generated from a maintained keyword taxonomy. It is a discovery aid, not a claim about journal scope; the detail view labels it as “研究方向匹配”.

## Search and Filter Behavior

- Search matches journal/conference name, aliases, ISSN, and related-topic labels.
- Type filter: all, journal, conference.
- Grade filter: A+, A, B, C; a row matches if any visible year/track grade matches.
- Status filter: unchanged, changed, added in 2026, absent from 2026.
- Research shortcut applies the related-topic taxonomy and sorts matched journals before conferences.
- Sort options: relevance, name, 2024 grade, 2026 general grade, status.
- Results are paginated at 50 rows per page; the current query and page are reflected in the URL hash so a result can be shared without a server.
- Clicking a journal row opens the detail drawer. Clicking a conference row keeps the detail view limited to catalog information and does not call EasyScholar.

## Journal Detail Drawer

The drawer shows:

- journal name, aliases, ISSN, type, source pages;
- 2024 grade;
- 2026 general-directory grade;
- 2026 computer-specialized grade, with a visible note that it applies to the four computer-related disciplines named in the PDF;
- status and change direction;
- related research-topic tags;
- an EasyScholar section with loading, success, missing-key, rate-limit, invalid-key, network, and “not found” states.

The EasyScholar section displays exactly these official-rank fields when present:

```text
sciif
sci
ssci
zhongguokejihexin
sciUp
sciUpSmall
sciUpTop
```

For each field, show the field key, a Chinese label, and the returned value. Missing values display `暂无数据`; raw response JSON is not shown by default but can be expanded for troubleshooting.

## EasyScholar API Contract

Request:

```text
GET https://www.easyscholar.cc/open/getPublicationRank
  ?secretKey=<encodeURIComponent(secretKey)>
  &publicationName=<encodeURIComponent(journalName)>
```

Response handling:

- `code === 200` and `msg === "SUCCESS"`: normalize `data.officialRank.all` first, then fill absent fields from `data.officialRank.select`.
- `code === 40002`: show an invalid or missing SecretKey message without exposing the key.
- Any non-200 response: show the returned message and preserve catalog details.
- Browser network/CORS failure: show that EasyScholar cannot be reached from the current browser and provide a retry action; do not silently fabricate rankings.
- Avoid automatic retries. A journal can be queried again explicitly from the drawer, respecting the documented request-rate limit.

The client caches successful and failed lookups in memory for the current page session only. SecretKey persistence uses `localStorage` under a namespaced key and includes a clear/remove action.

## Files

- `package.json`: Vite/React/TypeScript scripts and dependencies.
- `index.html`: Vite entry document and metadata.
- `src/main.tsx`: application bootstrap.
- `src/App.tsx`: top-level layout and route-hash state.
- `src/data/catalog.ts`: static catalog loading and type-safe normalization.
- `src/data/researchTopics.ts`: keyword taxonomy and relevance scoring.
- `src/lib/easyScholar.ts`: API request, response normalization, field labels, error mapping.
- `src/hooks/useCatalogQuery.ts`: search/filter/sort/pagination state.
- `src/components/Header.tsx`: brand and repository context.
- `src/components/SearchControls.tsx`: search field, filters, relevance shortcut, sort controls.
- `src/components/ResultsTable.tsx`: desktop/mobile result table and row actions.
- `src/components/JournalDrawer.tsx`: catalog details and EasyScholar states.
- `src/components/SettingsDialog.tsx`: local SecretKey input and clear action.
- `src/styles.css`: design tokens, responsive layout, drawer, tables, status colors.
- `public/data/catalog.json`: replaceable merged catalog data generated from the approved workbook source.
- `README.md`: local development, JSON replacement workflow, GitHub Pages deployment, and EasyScholar privacy note.
- `.github/workflows/deploy.yml`: GitHub Pages build and deployment workflow.

## Accessibility and Error Handling

- All icon-only controls have accessible labels.
- Drawer uses dialog semantics, focus return, Escape-to-close, and keyboard navigation.
- Every loading and error state is visible in text, not color alone.
- Long journal names wrap without changing column widths.
- Empty results show the active query/filter summary and a clear reset action.
- The app still provides complete catalog browsing when EasyScholar is unavailable or no key is configured.

## Acceptance Criteria

1. The initial page renders the complete catalog without any EasyScholar requests.
2. Search and all filters update results immediately and preserve the two separate 2026 columns.
3. The research shortcut returns the maintained related-topic set and visibly marks why a row matched.
4. Clicking a journal opens its complete catalog detail and requests EasyScholar only for that journal.
5. The detail view renders all seven requested EasyScholar fields when returned and handles absent fields without layout breakage.
6. No SecretKey appears in source, generated data, URL, or build artifacts.
7. The site builds successfully with the bundled Node runtime and can be deployed by GitHub Pages.
8. Desktop and mobile screenshots show no clipped headers, hidden controls, or overlapping content.

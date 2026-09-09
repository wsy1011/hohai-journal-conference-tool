import assert from "node:assert/strict";
import { test } from "node:test";
import { fetchWorkStatistics, summarizeTypes } from "../src/lib/openAlexWorks.ts";

test("article / (article + review), excluding other types", () => {
  assert.deepEqual(summarizeTypes({ group_by: [
    { key: "article", count: 80 }, { key: "review", count: 20 },
    { key: "editorial", count: 300 },
  ] }), { articles: 80, reviews: 20, ratio: 0.8 });
});
test("zero total is missing, not zero percent", () => {
  assert.deepEqual(summarizeTypes({ group_by: [] }), { articles: 0, reviews: 0, ratio: null });
});
test("a missing type in a successful response is zero", () => {
  assert.equal(summarizeTypes({ group_by: [{ key: "article", count: 3 }] }).ratio, 1);
  assert.equal(summarizeTypes({ group_by: [{ key: "review", count: 3 }] }).ratio, 0);
});
test("invalid counts must not become valid statistics", () => {
  assert.throws(() => summarizeTypes({}));
  assert.throws(() => summarizeTypes({ group_by: [{ key: "article", count: -1 }] }));
});
test("both requests use identical source and type filter", async () => {
  const urls = [];
  const result = await fetchWorkStatistics("https://openalex.org/S123", async (url) => {
    const u = new URL(url); urls.push(u);
    return { ok: true, json: async () => u.searchParams.get("group_by") === "type"
      ? { group_by: [{ key: "article", count: 80 }, { key: "review", count: 20 }] }
      : { group_by: [{ key: "2024", count: 30 }, { key: "2025", count: 70 }] } };
  });
  assert.equal(urls.length, 2);
  for (const u of urls) assert.equal(u.searchParams.get("filter"), "primary_location.source.id:S123,type:article|review");
  assert.equal(result.articleShare.ratio, 0.8);
  assert.deepEqual(result.countsByYear.map(x => x.year), [2025, 2024]);
});
test("request failures are explicit and never fallback to all document types", async () => {
  const result = await fetchWorkStatistics("S123", async () => { throw new Error("offline"); });
  assert.deepEqual(result.countsByYear, []);
  assert.equal(result.annualCountsStatus, "error");
  assert.equal(result.articleShareStatus, "error");
  assert.equal(result.articleShare, null);
});
test("share failure does not erase a successful yearly chart", async () => {
  const result = await fetchWorkStatistics("S123", async url => {
    if (new URL(url).searchParams.get("group_by") === "type") return { ok: false, json: async () => ({}) };
    return { ok: true, json: async () => ({ group_by: [{ key: "2025", count: 10 }] }) };
  });
  assert.equal(result.annualCountsStatus, "success");
  assert.equal(result.articleShareStatus, "error");
  assert.equal(result.countsByYear[0].worksCount, 10);
});

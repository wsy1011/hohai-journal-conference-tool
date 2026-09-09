import { readFile, writeFile, mkdir } from "node:fs/promises";

const source = JSON.parse(await readFile("catalog_merged.json", "utf8"));
const topicRules = [
  ["交通运输与物流", /transport|logistics|traffic|freight|maritime|shipping|port|waterway|railway|航空|交通|物流|航运|港口|船舶/i],
  ["运筹优化与算法", /operation research|optimization|operations research|algorithm|heuristic|computational intelligence|decision support|scheduling|routing|programming|运筹|优化|算法|调度|路径/i],
  ["鲁棒与风险", /robust|reliability|risk|resilience|disaster|safety|uncertainty|hazard|recovery|鲁棒|可靠性|风险|韧性|灾害|安全|不确定/i],
  ["智能交通与自主系统", /intelligent transportation|autonomous|robot|artificial intelligence|machine learning|computer vision|无人机|自主|机器人|人工智能|机器学习/i],
  ["海洋工程与控制", /ocean engineering|marine|naval|hydrodynamic|control engineering|systems and control|ship|vessel|海洋|船舶|水动力|控制/i],
  ["能源与可持续运输", /energy|sustainable|sustainability|cleaner production|emission|environment|climate|green|能源|可持续|排放|环境|气候|绿色/i],
];

function topicsFor(item) {
  const haystack = `${item.name} ${item.aliases} ${item.type}`;
  return topicRules.filter(([, pattern]) => pattern.test(haystack)).map(([label]) => label);
}

const normalized = source.map((item) => ({
  id: item.key,
  type: item.type,
  name: item.name,
  aliases: item.aliases ? item.aliases.split("；").filter(Boolean) : [],
  issn: item.code,
  grade2024: item.grade_2024,
  grade2026General: item.grade_2026_general,
  grade2026Computer: item.grade_2026_ccf,
  status: item.status,
  direction: item.direction,
  relatedTopics: topicsFor(item),
  sourcePages: {
    year2024: item.page_2024,
    year2026General: item.page_2026_general,
    year2026Computer: item.page_2026_ccf,
  },
}));

await mkdir("public/data", { recursive: true });
await writeFile("public/data/catalog.json", JSON.stringify(normalized), "utf8");
console.log(`Wrote ${normalized.length} catalog items`);

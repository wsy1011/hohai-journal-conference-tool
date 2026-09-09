import type { CatalogItem } from "./catalog";

export const researchTopics = [
  "交通运输与物流",
  "运筹优化与算法",
  "鲁棒与风险",
  "智能交通与自主系统",
  "海洋工程与控制",
  "能源与可持续运输",
] as const;

const topicKeywords: Record<(typeof researchTopics)[number], RegExp> = {
  "交通运输与物流": /transport|logistics|traffic|freight|maritime|shipping|port|waterway|railway|航空|交通|物流|航运|港口|船舶/i,
  "运筹优化与算法": /operation research|optimization|operations research|algorithm|heuristic|computational intelligence|decision support|scheduling|routing|programming|运筹|优化|算法|调度|路径/i,
  "鲁棒与风险": /robust|reliability|risk|resilience|disaster|safety|uncertainty|hazard|recovery|鲁棒|可靠性|风险|韧性|灾害|安全|不确定/i,
  "智能交通与自主系统": /intelligent transportation|autonomous|robot|artificial intelligence|machine learning|computer vision|无人机|自主|机器人|人工智能|机器学习/i,
  "海洋工程与控制": /ocean engineering|marine|naval|hydrodynamic|control engineering|systems and control|ship|vessel|海洋|船舶|水动力|控制/i,
  "能源与可持续运输": /energy|sustainable|sustainability|cleaner production|emission|environment|climate|green|能源|可持续|排放|环境|气候|绿色/i,
};

export function scoreResearchRelevance(item: CatalogItem): { score: number; topics: string[] } {
  const haystack = `${item.name} ${item.aliases.join(" ")} ${item.relatedTopics.join(" ")}`;
  const topics = researchTopics.filter((topic) => topicKeywords[topic].test(haystack));
  return { score: topics.length, topics: [...new Set([...item.relatedTopics, ...topics])] };
}

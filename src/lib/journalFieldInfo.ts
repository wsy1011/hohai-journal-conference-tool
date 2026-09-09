import type { EasyScholarFieldKey } from "./easyScholar";

// Descriptions explain each system; the displayed edition and values come from EasyScholar.
export const journalFieldInfo: Record<EasyScholarFieldKey, string> = {
  sciif: "期刊影响因子（IF），用于反映期刊近期论文的平均被引情况。数值与统计年份有关。",
  sciif5: "五年影响因子，按五年窗口计算的期刊影响因子指标。",
  sci: "科学引文索引，主要覆盖自然科学与工程技术。若显示 Q1–Q4，表示 JCR 学科分区，Q1 为前四分之一。",
  ssci: "社会科学引文索引，主要覆盖经济、管理、教育、社会学等领域。若返回 Q1–Q4，表示对应的 JCR 学科分区。",
  esci: "新兴资源引文索引（Emerging Sources Citation Index），属于 Web of Science 核心合集中的新兴期刊索引。",
  zhongguokejihexin: "中国科技核心期刊，即中国科技论文统计源期刊，由中国科学技术信息研究所遴选。",
  sciUp: "中科院期刊分区表升级版的大类分区，按较宽的学科领域划分为 1–4 区，1 区为较高分区。",
  sciUpSmall: "中科院期刊分区表升级版的小类分区。同一期刊可属于多个小类，分区也可能不同。",
  sciUpTop: "中科院期刊分区表中的 TOP 期刊标识，用于标注该体系认定的学科重要期刊。",
  eii: "工程索引（Engineering Index），常指 EI Compendex 收录，侧重工程技术领域的文献。",
  cscd: "中国科学引文数据库（CSCD），主要收录中国自然科学与工程技术领域的期刊，含核心库和扩展库。",
  pku: "《中文核心期刊要目总览》，通常称北大核心。显示“是”表示接口返回该目录的收录标识。",
  cssci: "中文社会科学引文索引（CSSCI），由南京大学相关研究中心建设。显示“是”表示返回 CSSCI 收录标识；扩展版等信息按返回值显示。",
  ajg: "英国商学院协会的学术期刊指南（AJG，常称 ABS），用于商科与管理学期刊评价，等级包括 1、2、3、4、4*。",
  utd24: "UT Dallas 商学院科研排名使用的 24 种商科期刊清单。这里的 24 指期刊数量。",
  ft50: "《金融时报》商学院科研排名使用的 50 种期刊清单，主要涵盖商科与管理学。",
  ahci: "艺术与人文引文索引（A&HCI），主要覆盖文学、历史、哲学、艺术等人文领域。",
  esi: "基本科学指标（ESI）的学科归属。此处显示学科分类名称。",
};

export function formatJournalValue(value: string | number | null, key: EasyScholarFieldKey): string {
  if (value === null || value === undefined) return "\\";
  const text = String(value).trim();
  if (key === "pku" && text === "1") return "是";
  if (key === "cssci" && text === "CSSCI") return "是";
  // Other numeric ratings (for example AJG 1 or IF 1) remain numbers.
  if (typeof value === "number") return String(value);
  return text.replace(/[.。．]+$/u, "").trim().replace(/工程：\s*/g, "").replace(/\s*\/\s*/g, "\n") || "\\";
}

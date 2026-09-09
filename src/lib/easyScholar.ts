export const EASY_SCHOLAR_FIELDS = [
  { key: "sciif", label: "影响因子IF" },
  { key: "sciif5", label: "五年影响因子" },
  { key: "esi", label: "ESI学科分类" },
] as const;

export const CAS_ZONING_FIELDS = [
  { key: "sciUp", label: "中科院分区升级版-大类" },
  { key: "sciUpSmall", label: "中科院分区升级版-小类" },
  { key: "sciUpTop", label: "中科院TOP" },
] as const;

export const OTHER_SEARCH_FIELDS = [
  { key: "sci", label: "SCI" },
  { key: "ssci", label: "SSCI" },
  { key: "esci", label: "ESCI" },
  { key: "eii", label: "EI" },
  { key: "ajg", label: "AJG(ABS)" },
  { key: "utd24", label: "UTD24" },
  { key: "ft50", label: "FT50" },
  { key: "cscd", label: "中国科学引文数据库" },
  { key: "zhongguokejihexin", label: "中国科技核心" },
  { key: "pku", label: "北大核心" },
  { key: "cssci", label: "南大核心 CSSCI" },
  { key: "ahci", label: "A&HCI" },
] as const;
export const ALL_EASY_SCHOLAR_FIELDS = [...EASY_SCHOLAR_FIELDS, ...CAS_ZONING_FIELDS, ...OTHER_SEARCH_FIELDS] as const;

export type EasyScholarFieldKey = (typeof EASY_SCHOLAR_FIELDS)[number]["key"] | (typeof CAS_ZONING_FIELDS)[number]["key"] | (typeof OTHER_SEARCH_FIELDS)[number]["key"];
export type EasyScholarValues = Record<EasyScholarFieldKey, string | number | null>;
export type EasyScholarState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; values: EasyScholarValues; raw: unknown }
  | { status: "error"; kind: "missing-key" | "invalid-key" | "rate-limit" | "network" | "api"; message: string };

const endpoint = "https://www.easyscholar.cc/open/getPublicationRank";

function emptyValues(): EasyScholarValues {
  return Object.fromEntries(ALL_EASY_SCHOLAR_FIELDS.map(({ key }) => [key, null])) as EasyScholarValues;
}

export async function fetchPublicationRank(secretKey: string, publicationName: string): Promise<Exclude<EasyScholarState, { status: "idle" | "loading" }>> {
  if (!secretKey.trim()) return { status: "error", kind: "missing-key", message: "请先在设置中填写 EasyScholar SecretKey。" };

  const url = `${endpoint}?secretKey=${encodeURIComponent(secretKey.trim())}&publicationName=${encodeURIComponent(publicationName)}`;
  try {
    const response = await fetch(url);
    const payload = (await response.json()) as {
      code?: number;
      msg?: string;
      data?: { officialRank?: { all?: Record<string, unknown>; select?: Record<string, unknown> } | null } | null;
    };
    if (payload.code === 40002) return { status: "error", kind: "invalid-key", message: payload.msg || "SecretKey 无效。" };
    if (!response.ok || payload.code !== 200) {
      const message = payload.msg || `EasyScholar 请求失败（${response.status}）`;
      const kind = /频率|rate|limit/i.test(message) ? "rate-limit" : "api";
      return { status: "error", kind, message };
    }
    const all = payload.data?.officialRank?.all || {};
    const select = payload.data?.officialRank?.select || {};
    const values = emptyValues();
    for (const { key } of ALL_EASY_SCHOLAR_FIELDS) {
      const value = all[key] ?? select[key] ?? null;
      if (value === null || value === undefined || value === "" || value === "null" || value === "undefined") {
        values[key] = null;
      } else {
        values[key] = typeof value === "object" ? JSON.stringify(value) : (value as string | number);
      }
    }
    return { status: "success", values, raw: payload };
  } catch {
    return { status: "error", kind: "network", message: "无法连接 EasyScholar，可能是网络或浏览器跨域限制。" };
  }
}

export async function loadDefaultSecretKey(): Promise<string> {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}data/easyscholar-config.json`);
    if (!response.ok) return "";
    const config = (await response.json()) as { secretKey?: string };
    return config.secretKey || "";
  } catch {
    return "";
  }
}


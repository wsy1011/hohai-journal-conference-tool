import type { OpenAlexState } from "../lib/openAlex";

type OpenAlexSuccess = Extract<OpenAlexState, { status: "success" }>;

function yesNo(value: boolean | null): string {
  return value === null ? "\\" : value ? "是" : "否";
}

export function JournalOpenAccess({ state }: { state: OpenAlexSuccess }) {
  const { isOa, isInDoaj, doajSinceYear, apcUsd } = state;
  const oaFlag = typeof isOa === "boolean" ? isOa : null;
  const doajFlag = typeof isInDoaj === "boolean" ? isInDoaj : null;
  const doajYear = typeof doajSinceYear === "number" ? doajSinceYear : null;
  const apcValue = typeof apcUsd === "number" ? apcUsd : null;
  const doajText = doajFlag === null ? "\\" : doajFlag ? (doajYear ? `是（自 ${doajYear} 年）` : "是") : "否";
  const apcText = apcValue === null ? "\\" : `$${apcValue.toLocaleString("en-US")} USD`;
  const oaNote = oaFlag === true ? "期刊为开放获取" : oaFlag === false ? "期刊不是开放获取" : "未取得该刊数据";
  const doajNote = doajFlag === null ? "未取得该刊数据" : "";
  const apcNote = apcValue === null
    ? (oaFlag === true ? "未收录该刊 APC 价格" : "无 APC 数据")
    : (oaFlag === true ? "" : "非 OA 期刊；选择开放获取时适用");
  return <section className="open-access" aria-labelledby="open-access-title">
    <h4 id="open-access-title">开放获取</h4>
    <div className="metadata-grid oa-grid">
      <div>
        <span>是否 OA</span>
        <strong>{yesNo(oaFlag)}</strong>
        <small>{oaNote}</small>
      </div>
      <div>
        <span>DOAJ 收录</span>
        <strong>{doajText}</strong>
        {doajNote && <small>{doajNote}</small>}
      </div>
      <div>
        <span>文章处理费（APC）</span>
        <strong>{apcText}</strong>
        {apcNote && <small>{apcNote}</small>}
      </div>
    </div>
    <p className="oa-note">数据来源：OpenAlex Sources 接口。APC 以美元折算价展示。</p>
  </section>;
}

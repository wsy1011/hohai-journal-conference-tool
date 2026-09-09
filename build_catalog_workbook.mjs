import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const rows = JSON.parse(await fs.readFile("catalog_rows.json", "utf8"));
const merged = JSON.parse(await fs.readFile("catalog_merged.json", "utf8"));
const changed = JSON.parse(await fs.readFile("changed_journals.json", "utf8"));

const outputDir = path.resolve("outputs", "01a08457-372d-7090-a417-3fdbd8b55409");
const previewDir = path.join(outputDir, "previews");
await fs.mkdir(previewDir, { recursive: true });

const workbook = Workbook.create();
const palette = {
  navy: "#17365D",
  blue: "#2F75B5",
  cyan: "#DDEBF7",
  header: "#5B9BD5",
  border: "#D9E2F3",
  text: "#1F2937",
  muted: "#64748B",
  changed: "#FCE4D6",
  added: "#E2F0D9",
  removed: "#FFF2CC",
  white: "#FFFFFF",
};

// Create every worksheet before writing any cross-sheet formulas.
const summary = workbook.worksheets.add("说明与汇总");
const changedSheet = workbook.worksheets.add("等级变化期刊");
const mergedSheet = workbook.worksheets.add("合并对照");
const raw2024Sheet = workbook.worksheets.add("2024原始目录");
const general2026Sheet = workbook.worksheets.add("2026综合目录");
const ccf2026Sheet = workbook.worksheets.add("2026计算机专项");

function setBaseSheet(sheet) {
  sheet.showGridLines = false;
}

function classifyType(row) {
  if (row.code !== "/") return "期刊";
  return /journal|transactions|proceedings|magazine|letters|review|bulletin/i.test(row.name) ? "期刊" : "会议";
}

function addTitle(sheet, title, subtitle, lastColumn) {
  sheet.getRange(`A1:${lastColumn}1`).merge();
  sheet.getRange("A1").values = [[title]];
  sheet.getRange(`A1:${lastColumn}1`).format = {
    fill: palette.navy,
    font: { name: "Microsoft YaHei", size: 16, bold: true, color: palette.white },
    horizontalAlignment: "center",
    verticalAlignment: "center",
    rowHeight: 32,
  };
  sheet.getRange(`A2:${lastColumn}2`).merge();
  sheet.getRange("A2").values = [[subtitle]];
  sheet.getRange(`A2:${lastColumn}2`).format = {
    fill: palette.cyan,
    font: { name: "Microsoft YaHei", size: 9, color: palette.muted },
    horizontalAlignment: "left",
    verticalAlignment: "center",
    wrapText: true,
    rowHeight: 30,
  };
}

function styleHeader(sheet, range) {
  sheet.getRange(range).format = {
    fill: palette.blue,
    font: { name: "Microsoft YaHei", size: 10, bold: true, color: palette.white },
    horizontalAlignment: "center",
    verticalAlignment: "center",
    wrapText: true,
    rowHeight: 28,
    borders: { preset: "all", style: "thin", color: palette.border },
  };
}

function styleBody(sheet, range) {
  sheet.getRange(range).format = {
    font: { name: "Microsoft YaHei", size: 9, color: palette.text },
    verticalAlignment: "center",
    borders: { preset: "all", style: "thin", color: palette.border },
  };
}

addTitle(summary, "河海大学高质量论文期刊及学术会议目录对照", "对照年份：2024 与 2026。等级变化以 CN/ISSN 精确匹配为主；无编号条目按规范化名称匹配。", "H");
summary.getRange("A4:H4").merge();
summary.getRange("A4").values = [["对照结果概览"]];
summary.getRange("A4:H4").format = { fill: palette.blue, font: { name: "Microsoft YaHei", size: 12, bold: true, color: palette.white }, rowHeight: 26, verticalAlignment: "center" };
summary.getRange("A6:A12").values = [["2024 原始条目"], ["2026 综合条目"], ["2026 计算机专项条目"], ["合并后唯一条目"], ["等级变化期刊"], ["2026 新增条目"], ["2026 未收录条目"]];
summary.getRange("B6:B12").formulas = [
  ["=COUNTA('2024原始目录'!A5:A3288)"],
  ["=COUNTA('2026综合目录'!A5:A2773)"],
  ["=COUNTA('2026计算机专项'!A5:A681)"],
  ["=COUNTA('合并对照'!A5:A3483)"],
  ["=COUNTIFS('合并对照'!B5:B3483,\"期刊\",'合并对照'!I5:I3483,\"等级变化\")"],
  ["=COUNTIF('合并对照'!I5:I3483,\"2026新增\")"],
  ["=COUNTIF('合并对照'!I5:I3483,\"2026未收录\")"],
];
summary.getRange("A6:B12").format = { font: { name: "Microsoft YaHei", size: 11 }, borders: { preset: "all", style: "thin", color: palette.border }, rowHeight: 25 };
summary.getRange("A6:A12").format.fill = "#F8FAFC";
summary.getRange("A6:A12").format.font = { name: "Microsoft YaHei", size: 10, bold: true, color: palette.text };
summary.getRange("B6:B12").format = { fill: palette.cyan, font: { name: "Microsoft YaHei", size: 12, bold: true, color: palette.navy }, horizontalAlignment: "center", borders: { preset: "all", style: "thin", color: palette.border } };

summary.getRange("D6:H6").merge();
summary.getRange("D6").values = [["口径说明"]];
summary.getRange("D6:H6").format = { fill: palette.header, font: { name: "Microsoft YaHei", size: 11, bold: true, color: palette.white }, horizontalAlignment: "center" };
summary.getRange("D7:H12").merge();
summary.getRange("D7").values = [[
  "1. 2026 年 PDF 包含综合目录及信息与通信工程、计算机科学与技术、软件工程、智能科学与技术专项目录。\n" +
  "2. 对相关计算机学科，PDF 备注要求与第七版 CCF 目录重复时按 CCF 等级使用，因此本工作簿将两类 2026 等级分列。\n" +
  "3. ‘等级变化’只针对两年均能匹配的条目；‘2026新增’与‘2026未收录’单独标识，不计作等级变化。\n" +
  "4. 同一 CN/ISSN 在同一年出现多个等级时，使用‘A / B’形式保留全部原始等级，并标为分目录或重复条目等级不同。"
]];
summary.getRange("D7:H12").format = { fill: "#F8FAFC", font: { name: "Microsoft YaHei", size: 10, color: palette.text }, wrapText: true, verticalAlignment: "top", rowHeight: 24, borders: { preset: "all", style: "thin", color: palette.border } };
summary.getRange("A15:H15").merge();
summary.getRange("A15").values = [["数据来源"]];
summary.getRange("A15:H15").format = { fill: palette.blue, font: { name: "Microsoft YaHei", size: 11, bold: true, color: palette.white } };
summary.getRange("A16:H17").values = [
  ["2024", "2024 - 附件1.《河海大学高质量论文期刊及学术会议目录》（自然科学类）.pdf", null, null, null, null, null, null],
  ["2026", "2026 - 附件1《 河海大学高质量论文期刊及学术会议目录（自然科学类）》.pdf", null, null, null, null, null, null],
];
summary.getRange("B16:H16").merge();
summary.getRange("B17:H17").merge();
summary.getRange("A16:H17").format = { font: { name: "Microsoft YaHei", size: 9 }, borders: { preset: "all", style: "thin", color: palette.border }, rowHeight: 24 };
summary.getRange("A1:H17").format.verticalAlignment = "center";
summary.getRange("A1:A17").format.columnWidth = 22;
summary.getRange("B1:B17").format.columnWidth = 22;
summary.getRange("C1:C17").format.columnWidth = 4;
summary.getRange("D1:H17").format.columnWidth = 16;
summary.freezePanes.freezeRows(4);

addTitle(changedSheet, "等级发生变化的期刊", "共列出两年均能匹配且等级集合不同的期刊；橙色表示下调，绿色表示上调，蓝色表示综合/专项或重复条目等级不同。", "L");
const changedHeaders = [["序号", "期刊名称", "其他名称", "CN/ISSN", "2024等级", "2026综合等级", "2026计算机专项等级", "变化方向", "变化明细", "2024页码", "2026综合页码", "2026专项页码"]];
changedSheet.getRange("A4:L4").values = changedHeaders;
const changedData = changed.map((item, index) => [index + 1, item.name, item.aliases, item.code, item.grade_2024, item.grade_2026_general, item.grade_2026_ccf, item.direction, item.change_detail, item.page_2024, item.page_2026_general, item.page_2026_ccf]);
if (changedData.length) changedSheet.getRangeByIndexes(4, 0, changedData.length, 12).values = changedData;
styleHeader(changedSheet, "A4:L4");
styleBody(changedSheet, `A5:L${4 + changedData.length}`);
changedSheet.getRange(`B5:C${4 + changedData.length}`).format.wrapText = true;
changedSheet.getRange(`I5:I${4 + changedData.length}`).format.wrapText = true;
changedSheet.getRange(`A5:A${4 + changedData.length}`).format.horizontalAlignment = "center";
changedSheet.getRange(`D5:H${4 + changedData.length}`).format.horizontalAlignment = "center";
changedSheet.getRange(`J5:L${4 + changedData.length}`).format.horizontalAlignment = "center";
changedSheet.getRange(`A5:L${4 + changedData.length}`).conditionalFormats.addCustom('=$H5="下调"', { fill: palette.changed });
changedSheet.getRange(`A5:L${4 + changedData.length}`).conditionalFormats.addCustom('=$H5="上调"', { fill: palette.added });
changedSheet.getRange(`A5:L${4 + changedData.length}`).conditionalFormats.addCustom('=$H5="分目录等级不同"', { fill: palette.cyan });
const changedTable = changedSheet.tables.add(`A4:L${4 + changedData.length}`, true, "ChangedJournalsTable");
changedTable.style = "TableStyleMedium2";
changedSheet.freezePanes.freezeRows(4);
changedSheet.getRange("A:A").format.columnWidth = 8;
changedSheet.getRange("B:B").format.columnWidth = 44;
changedSheet.getRange("C:C").format.columnWidth = 38;
changedSheet.getRange("D:D").format.columnWidth = 16;
changedSheet.getRange("E:H").format.columnWidth = 16;
changedSheet.getRange("I:I").format.columnWidth = 48;
changedSheet.getRange("J:L").format.columnWidth = 12;

addTitle(mergedSheet, "2024-2026 合并对照目录", "状态列由等级列自动判断。红色为等级变化，绿色为 2026 新增，黄色为 2026 未收录。", "N");
mergedSheet.getRange("A4:N4").values = [["序号", "类型", "刊物/会议名称", "其他名称", "CN/ISSN", "2024等级", "2026综合等级", "2026计算机专项等级", "对照状态", "变化方向", "2024页码", "2026综合页码", "2026专项页码", "变化明细"]];
const mergedData = merged.map((item, index) => [index + 1, item.type, item.name, item.aliases, item.code, item.grade_2024, item.grade_2026_general, item.grade_2026_ccf, null, item.direction, item.page_2024, item.page_2026_general, item.page_2026_ccf, item.change_detail]);
mergedSheet.getRangeByIndexes(4, 0, mergedData.length, 14).values = mergedData;
const mergedLastRow = 4 + mergedData.length;
mergedSheet.getRange("I5").formulas = [["=IF(AND(F5<>\"\",OR(G5<>\"\",H5<>\"\")),IF(AND(OR(G5=\"\",G5=F5),OR(H5=\"\",H5=F5)),\"等级未变\",\"等级变化\"),IF(F5=\"\",\"2026新增\",\"2026未收录\"))"]];
mergedSheet.getRange(`I5:I${mergedLastRow}`).fillDown();
styleHeader(mergedSheet, "A4:N4");
styleBody(mergedSheet, `A5:N${mergedLastRow}`);
mergedSheet.getRange(`C5:D${mergedLastRow}`).format.wrapText = true;
mergedSheet.getRange(`N5:N${mergedLastRow}`).format.wrapText = true;
mergedSheet.getRange(`A5:B${mergedLastRow}`).format.horizontalAlignment = "center";
mergedSheet.getRange(`E5:M${mergedLastRow}`).format.horizontalAlignment = "center";
mergedSheet.getRange(`A5:N${mergedLastRow}`).conditionalFormats.addCustom('=$I5="等级变化"', { fill: palette.changed, font: { bold: true, color: "#9C0006" } });
mergedSheet.getRange(`A5:N${mergedLastRow}`).conditionalFormats.addCustom('=$I5="2026新增"', { fill: palette.added });
mergedSheet.getRange(`A5:N${mergedLastRow}`).conditionalFormats.addCustom('=$I5="2026未收录"', { fill: palette.removed });
const mergedTable = mergedSheet.tables.add(`A4:N${mergedLastRow}`, true, "MergedCatalogTable");
mergedTable.style = "TableStyleMedium2";
mergedSheet.freezePanes.freezeRows(4);
mergedSheet.getRange("A:A").format.columnWidth = 8;
mergedSheet.getRange("B:B").format.columnWidth = 9;
mergedSheet.getRange("C:C").format.columnWidth = 46;
mergedSheet.getRange("D:D").format.columnWidth = 38;
mergedSheet.getRange("E:E").format.columnWidth = 16;
mergedSheet.getRange("F:J").format.columnWidth = 16;
mergedSheet.getRange("K:M").format.columnWidth = 12;
mergedSheet.getRange("N:N").format.columnWidth = 48;

function buildRawSheet(sheet, sectionName, title, subtitle, tableName) {
  addTitle(sheet, title, subtitle, "G");
  sheet.getRange("A4:G4").values = [["序号", "刊物/会议名称", "CN/ISSN", "等级", "页码", "类型", "目录"]];
  const sourceRows = rows.filter((row) => row.section === sectionName);
  const data = sourceRows.map((row) => [row.sequence, row.name, row.code, row.grade, row.page, classifyType(row), row.section]);
  sheet.getRangeByIndexes(4, 0, data.length, 7).values = data;
  const lastRow = 4 + data.length;
  styleHeader(sheet, "A4:G4");
  styleBody(sheet, `A5:G${lastRow}`);
  sheet.getRange(`B5:B${lastRow}`).format.wrapText = true;
  sheet.getRange(`A5:A${lastRow}`).format.horizontalAlignment = "center";
  sheet.getRange(`C5:G${lastRow}`).format.horizontalAlignment = "center";
  const table = sheet.tables.add(`A4:G${lastRow}`, true, tableName);
  table.style = "TableStyleMedium2";
  sheet.freezePanes.freezeRows(4);
  sheet.getRange("A:A").format.columnWidth = 9;
  sheet.getRange("B:B").format.columnWidth = 52;
  sheet.getRange("C:C").format.columnWidth = 17;
  sheet.getRange("D:G").format.columnWidth = 13;
  return sheet;
}

buildRawSheet(raw2024Sheet, "2024目录", "2024 年原始目录", "按 PDF 原始顺序整理，共 3284 条。", "Catalog2024Table");
buildRawSheet(general2026Sheet, "2026综合目录", "2026 年综合目录", "附件 1-1，按 PDF 原始顺序整理，共 2769 条。", "Catalog2026GeneralTable");
buildRawSheet(ccf2026Sheet, "2026计算机专项目录", "2026 年计算机学科专项目录", "附件 1-2，适用于信息与通信工程、计算机科学与技术、软件工程、智能科学与技术，共 677 条。", "Catalog2026CcfTable");

for (const sheet of workbook.worksheets.items) setBaseSheet(sheet);

const inspections = [];
inspections.push((await workbook.inspect({ kind: "table", range: "说明与汇总!A1:H17", include: "values,formulas", tableMaxRows: 20, tableMaxCols: 10 })).ndjson);
inspections.push((await workbook.inspect({ kind: "table", range: "等级变化期刊!A1:L12", include: "values,formulas", tableMaxRows: 12, tableMaxCols: 12 })).ndjson);
inspections.push((await workbook.inspect({ kind: "table", range: "合并对照!A1:N12", include: "values,formulas", tableMaxRows: 12, tableMaxCols: 14 })).ndjson);
const errors = await workbook.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A", options: { useRegex: true, maxResults: 100 }, summary: "final formula error scan" });
await fs.writeFile(path.join(outputDir, "inspection.txt"), `${inspections.join("\n")}\n${errors.ndjson}`, "utf8");

for (const sheetName of ["说明与汇总", "等级变化期刊", "合并对照", "2024原始目录", "2026综合目录", "2026计算机专项"]) {
  const lastColumn = sheetName === "合并对照" ? "N" : sheetName === "等级变化期刊" ? "L" : sheetName === "说明与汇总" ? "H" : "G";
  const preview = await workbook.render({ sheetName, range: `A1:${lastColumn}28`, scale: 1, format: "png" });
  await fs.writeFile(path.join(previewDir, `${sheetName}.png`), new Uint8Array(await preview.arrayBuffer()));
}

const output = await SpreadsheetFile.exportXlsx(workbook);
const outputPath = path.join(outputDir, "河海大学高质量论文期刊目录_2024-2026对照.xlsx");
await output.save(outputPath);
console.log(JSON.stringify({ outputPath, merged: merged.length, changed: changed.length }, null, 2));

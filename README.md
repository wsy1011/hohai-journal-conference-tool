# 期刊目录 Journal Index

河海大学高质量论文期刊及学术会议目录查询工具，整合 2022、2024 和 2026 年的自然科学、计算机专项与人文社科目录。

## 本地运行

```bash
npm install
npm run data:check
npm run dev
```

重新解析附加目录并生成三套数据库：

```bash
npm run data:build
npm run data:verify
```

生产构建：

```bash
npm run build
npm run preview
```

## 更新目录数据

网站不会在浏览器中解析 PDF。三套静态数据分别位于 `public/data/catalog-natural.json`、`public/data/catalog-computer.json` 和 `public/data/catalog-social.json`。源 PDF 的路径和提取文本由 `scripts/build_multi_catalog.py` 管理，生成后运行 `npm run data:verify` 和 `npm run data:check`，确认条目数量、ID 和字段结构正确，再执行 `npm run build`。数据字段见 `src/data/catalog.ts`。

注意：`npm run data:build` 需要本地的 `catalog_rows.json`（由 `extract_catalogs.py`、`parse_catalogs.py` 从原始目录 PDF 解析得到，因体积较大未入库）。仓库里的 `catalog-*.json` 已经是可直接使用的最终数据，只做 `data:verify`、`data:check` 和 `build` 时不需要该文件。同一 CN/ISSN 下的中文刊名与西文刊名会各存一条记录，各取自己那一行的等级。

首次打开根地址时会先选择“计算机专项”“自然科学”或“人文社科”。2024 年没有独立计算机专项目录，因此计算机专项界面将 2024 自然科学综合目录明确标为参考口径。

## EasyScholar

期刊详情页会按需调用 EasyScholar `getPublicationRank` 接口，并显示：`sciif`、`sci`、`ssci`、`zhongguokejihexin`、`sciUp`、`sciUpSmall`、`sciUpTop`。

期刊详情页也会按需调用 OpenAlex Sources API：按期刊名称匹配 `homepage_url`（找到后显示“官网”按钮），并读取 `is_oa`、`is_in_doaj`、`is_in_doaj_since_year`、`apc_usd`，在“开放获取”模块中展示是否 OA、DOAJ 收录（含加入年份）和文章处理费（APC，美元折算价）。会议和其他成果不查询这些字段。

当前版本按需求将附件中的 SecretKey 写入 `public/data/easyscholar-config.json`，因此一旦发布到 GitHub，任何能访问仓库或网页的人都可以看到它。详情页仍支持在设置中覆盖或清除本地 SecretKey；如果要公开部署，建议先在 EasyScholar 侧更换该 Key，再更新配置文件。

## GitHub Pages

将仓库默认分支推送到 GitHub 后，`.github/workflows/deploy.yml` 会构建并发布 Pages。仓库设置中需要将 Pages 来源设为 GitHub Actions。

## 研究方向快捷筛选

“仅看与我的研究相关”基于可维护的关键词分类，当前覆盖交通运输与物流、运筹优化与算法、鲁棒与风险、智能交通与自主系统、海洋工程与控制、能源与可持续运输。它是检索辅助标签，不替代期刊官方 aims & scope 判断。

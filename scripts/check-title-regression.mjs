import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const data = JSON.parse(await readFile('public/data/catalog-natural.json', 'utf8'));
for (const name of ['材料工程', '功能材料', '船舶力学', '交通信息与安全']) {
  assert(data.some(x => x.name === name || x.aliases.includes(name)), `Missing clean title: ${name}`);
}
for (const discipline of ['natural', 'computer', 'social']) {
  const rows = JSON.parse(await readFile(`public/data/catalog-${discipline}.json`, 'utf8'));
  for (const row of rows) {
    assert(!/北京航空材料研究院|国家仪表功能材料工程技术研究中心|中国船舶科学研究中心/.test([row.name, ...row.aliases].join(' ')), `Publisher in title: ${row.name}`);
    assert(!(row.grades['2022'] && row.status === '2022未收录'), 'Contradictory status');
  }
}
console.log('Title and status regression passed');

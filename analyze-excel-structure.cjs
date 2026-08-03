const XLSX = require('xlsx');
const fs = require('fs');

const excelFile = 'C:/Users/xinxi/Desktop/美团工作/外卖账单20260415.xlsx';

const workbook = XLSX.readFile(excelFile);

// 查看所有工作表的结构
console.log('=== 工作表列表 ===');
workbook.SheetNames.forEach((name, idx) => {
  const sheet = workbook.Sheets[name];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  console.log(`${idx + 1}. ${name} - ${data.length} 行`);
});

console.log('\n=== 分析"全量商家"工作表 ===');
const allSheet = workbook.Sheets['全量商家'];
const allData = XLSX.utils.sheet_to_json(allSheet, { header: 1 });

// 查看前20行，了解数据结构
console.log('前20行数据：');
for (let i = 0; i < Math.min(20, allData.length); i++) {
  const row = allData[i].filter(x => x !== undefined && x !== '');
  console.log(`行${i}:`, row.slice(0, 8).join(' | ')); // 只显示前8列
}

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const excelFile = 'C:/Users/xinxi/Desktop/美团工作/外卖账单20260415.xlsx';

if (!fs.existsSync(excelFile)) {
  console.log('文件不存在:', excelFile);
  process.exit();
}

const workbook = XLSX.readFile(excelFile);

console.log('=== Excel文件结构 ===');
console.log('工作表名称:', workbook.SheetNames);
console.log('');

const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

console.log('=== 第一行（表头） ===');
console.log(data[0]);
console.log('');

console.log('=== 数据行数 ===');
console.log('总行数:', data.length);
console.log('');

console.log('=== 前5行数据 ===');
for (let i = 1; i < Math.min(6, data.length); i++) {
  console.log(`行${i}:`, data[i]);
}


import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('=== 开始修复 shared-data.json ===');

// 读取 preloaded_data.json
const preloadedPath = path.join(__dirname, 'preloaded_data.json');
const preloadedData = JSON.parse(fs.readFileSync(preloadedPath, 'utf-8'));

// 获取最新日期
const dates = Object.keys(preloadedData).sort();
const latestDate = dates[dates.length - 1];
const latestData = preloadedData[latestDate];

console.log(`找到 preloaded_data 中的最新数据: ${latestDate}`);
console.log(`全量商家城市数量: ${latestData['all']['cities'].length}`);

// 创建新记录
const newRecord = {
  date: latestDate,
  updatedAt: new Date().toISOString(),
  uploadedBy: 'local-fix',
  fileName: `preloaded_data ${latestDate}`,
  currentData: {
    date: latestDate,
    cities: latestData['all']['cities'],
    fileName: `preloaded_data ${latestDate}`
  },
  merchantData: {},
  currentMerchant: 'all'
};

// 添加所有商家类型数据
for (const merchantType in latestData) {
  newRecord.merchantData[merchantType] = {
    label: latestData[merchantType].label,
    cities: latestData[merchantType].cities
  };
}

const fixedData = [newRecord];

// 保存到 shared-data.json
const outputPath = path.join(__dirname, 'shared-data.json');
fs.writeFileSync(outputPath, JSON.stringify(fixedData, null, 2), 'utf-8');

console.log('');
console.log('✅ shared-data.json 已修复完成！');
console.log(`保存路径: ${outputPath}`);
console.log(`城市数量: ${latestData['all']['cities'].length}`);
console.log(`商家类型: ${Object.keys(latestData).join(', ')}`);
console.log('');
console.log('现在可以运行项目查看修复后的数据了！');

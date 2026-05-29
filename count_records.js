
const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, 'shared-data.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

console.log(`总共有 ${data.length} 条数据记录`);
console.log('各记录的日期:');
data.forEach((record, index) =&gt; {
  console.log(`  ${index + 1}. ${record.date} (文件名: ${record.fileName})`);
});


const fs = require('fs');
const path = require('path');

console.log('========== 数据验证脚本 ==========');

// 1. 读取 shared-data.json
console.log('\n[步骤1] 读取 shared-data.json...');
const sharedDataPath = path.join(__dirname, 'shared-data.json');
if (!fs.existsSync(sharedDataPath)) {
  console.error('❌ shared-data.json 不存在！');
  process.exit(1);
}
const sharedData = JSON.parse(fs.readFileSync(sharedDataPath, 'utf8'));
console.log(`✅ 读取成功！共 ${sharedData.length} 条记录`);

// 2. 检查每条记录的结构
console.log('\n[步骤2] 检查每条记录的结构...');
let hasMerchantDataCount = 0;
let hasCurrentDataCount = 0;
let allValid = true;

sharedData.forEach((record, index) =&gt; {
  const date = record.date || '未知日期';
  console.log(`\n  记录 ${index} (日期: ${date}):`);
  
  // 检查 merchantData
  if (record.merchantData) {
    const merchantKeys = Object.keys(record.merchantData);
    console.log(`    ✅ merchantData 存在，商家类型: ${merchantKeys.join(', ')}`);
    hasMerchantDataCount++;
    
    merchantKeys.forEach(type =&gt; {
      const merchantType = record.merchantData[type];
      const cityCount = merchantType.cities?.length || 0;
      console.log(`       - ${type}: ${merchantType.label}, ${cityCount} 个城市`);
    });
  } else {
    console.log(`    ❌ merchantData 不存在！`);
    allValid = false;
  }
  
  // 检查 currentData
  if (record.currentData) {
    hasCurrentDataCount++;
    console.log(`    ℹ️ currentData 存在（用于兼容旧格式）`);
  }
});

console.log(`\n  统计: ${hasMerchantDataCount}/${sharedData.length} 条记录有 merchantData`);
console.log(`        ${hasCurrentDataCount}/${sharedData.length} 条记录有 currentData`);

// 3. 模拟 index-new.html 的 loadFromCloud 逻辑
console.log('\n[步骤3] 模拟 loadFromCloud 逻辑...');
const testRecord = sharedData[0];

// 3.1 获取 merchantData
const merchantData = testRecord.merchantData || testRecord.currentData?.merchantData;
console.log(`\n  最新记录日期: ${testRecord.date}`);
console.log(`  merchantData 商家类型: ${Object.keys(merchantData || {})}`);

if (merchantData &amp;&amp; merchantData.all) {
  const allCitiesData = merchantData.all.cities || [];
  let totalData = null;
  let citiesData = [];
  
  allCitiesData.forEach(city =&gt; {
    if (city.name === '总商') {
      totalData = city;
    } else {
      citiesData.push(city);
    }
  });
  
  console.log(`\n  总商数据: ${totalData ? '✅ 找到' : '❌ 未找到'}`);
  if (totalData &amp;&amp; totalData.modules &amp;&amp; totalData.modules.all) {
    const totals = totalData.modules.all;
    console.log(`  订单量: ${totals.orders}`);
    console.log(`  GMV: ${totals.gmvAmount}`);
    console.log(`  利润: ${totals.profit}`);
  }
  
  console.log(`\n  城市数据: ${citiesData.length} 个城市`);
  citiesData.slice(0, 3).forEach(city =&gt; {
    console.log(`    - ${city.displayName || city.name}`);
  });
  if (citiesData.length &gt; 3) {
    console.log(`    ... (还有 ${citiesData.length - 3} 个城市)`);
  }
}

// 4. 模拟 switchImportDate
console.log('\n[步骤4] 模拟日期切换...');
if (sharedData.length &gt; 1) {
  const secondRecord = sharedData[1];
  const secondMerchantData = secondRecord.merchantData || secondRecord.currentData?.merchantData;
  console.log(`\n  切换到日期: ${secondRecord.date}`);
  console.log(`  商家类型: ${Object.keys(secondMerchantData || {})}`);
  if (secondMerchantData &amp;&amp; secondMerchantData.all) {
    const cityCount = secondMerchantData.all.cities?.length || 0;
    console.log(`  城市数量: ${cityCount}`);
  }
}

console.log('\n========== 验证完成 ==========\n');

if (allValid &amp;&amp; hasMerchantDataCount === sharedData.length) {
  console.log('✅ 所有数据结构正确！');
} else {
  console.log('⚠️ 存在数据结构问题，请检查');
}

console.log('\n');


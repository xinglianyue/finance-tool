
const fs = require('fs');
const path = require('path');

console.log('========== 简单数据验证 ==========\n');

// 读取文件
const dataPath = path.join(__dirname, 'shared-data.json');
const raw = fs.readFileSync(dataPath, 'utf8');
const data = JSON.parse(raw);

console.log('✅ 读取成功！共有 ' + data.length + ' 条记录\n');

// 检查第一条记录
const first = data[0];
console.log('第一条记录日期: ' + first.date);

// 检查 merchantData
if (first.merchantData) {
  console.log('\n✅ merchantData 存在！商家类型: ' + Object.keys(first.merchantData).join(', ');
  
  // 检查 all 商家类型
  if (first.merchantData.all) {
    const cities = first.merchantData.all.cities;
    console.log('总城市数量: ' + cities.length);
    
    // 找总商
    let totalCity = null;
    let cityList = [];
    cities.forEach(function(city) {
      if (city.name === '总商' ? (totalCity = city) : cityList.push(city);
    });
    
    console.log('总商城市: ' + (totalCity ? '找到' : '未找到');
    console.log('城市列表城市: ' + cityList.length + ' 个');
    
    if (totalCity &amp;&amp; totalCity.modules &amp;&amp; totalCity.modules.all) {
      const totals = totalCity.modules.all;
      console.log('\n总商数据:');
      console.log('  订单量: ' + totals.orders);
      console.log('  GMV: ' + totals.gmvAmount);
      console.log('  利润: ' + totals.profit);
    }
  }
} else {
  console.log('\n❌ merchantData 不存在！');
}

console.log('\n========== 完成 ==========\n');


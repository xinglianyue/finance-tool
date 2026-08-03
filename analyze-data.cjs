const fs = require('fs');

const data = JSON.parse(fs.readFileSync('preloaded_data.json', 'utf8'));

console.log('=== 真实财务数据分析报告 ===\n');

// 1. 基本信息
const periods = Object.keys(data);
console.log('【数据周期】', periods.length, '个');
console.log(periods.map(p => p.substring(0,7)).join(', '));

// 获取最新一期数据
const latestPeriod = periods[periods.length - 1];
console.log('\n【最新数据周期】', latestPeriod);

// 分析各城市数据
const cities = data[latestPeriod].all.cities;
console.log('\n【城市数量】', cities.length);
console.log('城市列表:', cities.map(c => c.name).join(', '));

// 2. 核心指标分析
console.log('\n\n=== 核心指标分析 ===');

const allModule = cities.find(c => c.name === '总商').modules.all;
console.log('\n【全品类汇总数据】');
console.log('订单量:', allModule.orders.toLocaleString());
console.log('GMV:', (allModule.gmvAmount / 10000).toFixed(2), '万');
console.log('总收入:', (allModule.totalRevenue / 10000).toFixed(2), '万');
console.log('总成本:', (allModule.totalExpense / 10000).toFixed(2), '万');
console.log('毛利:', (allModule.profit / 10000).toFixed(2), '万');
console.log('UE:', allModule.ue.toFixed(4), '元');
console.log('补贴总额:', (allModule.subsidyTotal / 10000).toFixed(2), '万');
console.log('补贴率:', (allModule.subsidyRatio * 100).toFixed(2) + '%');
console.log('配送成本:', (allModule.deliveryCost / 10000).toFixed(2), '万');
console.log('利润率:', (allModule.profitRate * 100).toFixed(2) + '%');

// 3. 各城市各模块分析
console.log('\n\n=== 各城市各模块UE分析 ===');

const modules = ['all', 'food', 'flash', 'medicine', 'group'];
const moduleNames = {'all': '全品类', 'food': '餐饮', 'flash': '闪购', 'medicine': '医药', 'group': '拼好饭'};

cities.forEach(city => {
  console.log('\n--- ' + city.displayName + ' ---');
  modules.forEach(mod => {
    if (city.modules[mod]) {
      const m = city.modules[mod];
      const ue = m.ue.toFixed(2);
      const subsidy = (m.subsidyRatio * 100).toFixed(1) + '%';
      const profit = (m.profit / 10000).toFixed(1);
      const orders = m.orders > 0 ? (m.orders / 10000).toFixed(1) + '万' : '0';
      console.log(`${moduleNames[mod]}: UE=${ue}元, 补贴率=${subsidy}, 毛利=${profit}万, 订单=${orders}`);
    }
  });
});

// 4. 异常值检测
console.log('\n\n=== 异常值检测 ===');

const anomalies = [];
cities.forEach(city => {
  modules.forEach(mod => {
    if (city.modules[mod]) {
      const m = city.modules[mod];
      if (m.orders > 0) { // 只检查有数据的
        if (m.ue < 0) {
          anomalies.push({
            city: city.name,
            module: mod,
            type: 'UE亏损',
            value: m.ue.toFixed(2),
            severity: '严重',
            subsidy: (m.subsidyRatio * 100).toFixed(1) + '%'
          });
        } else if (m.subsidyRatio > 0.35) {
          anomalies.push({
            city: city.name,
            module: mod,
            type: '补贴率过高',
            value: (m.subsidyRatio * 100).toFixed(1) + '%',
            severity: '预警',
            ue: m.ue.toFixed(2) + '元'
          });
        }
      }
    }
  });
});

console.log('\n【异常项汇总】');
console.log('总异常数:', anomalies.length);
anomalies.forEach(a => {
  console.log(`  ${a.city}/${moduleNames[a.module]}: ${a.type}=${a.value} [${a.severity}]`);
});

// 5. 指标关联分析
console.log('\n\n=== 指标关联分析 ===');
console.log('\n补贴率 vs UE 关系:');
cities.forEach(city => {
  const m = city.modules.all;
  if (m && m.orders > 0) {
    console.log(`${city.name}: 补贴率=${(m.subsidyRatio*100).toFixed(1)}%, UE=${m.ue.toFixed(2)}元`);
  }
});

// 6. 增长趋势分析（如果有多个周期）
if (periods.length > 1) {
  console.log('\n\n=== 增长趋势分析 ===');
  const prevPeriod = periods[periods.length - 2];
  const prevData = data[prevPeriod].all.cities.find(c => c.name === '总商').modules.all;
  const currData = allModule;
  
  const orderGrowth = ((currData.orders - prevData.orders) / prevData.orders * 100).toFixed(1);
  const profitGrowth = prevData.profit !== 0 ? ((currData.profit - prevData.profit) / prevData.profit * 100).toFixed(1) : 'N/A';
  const ueChange = (currData.ue - prevData.ue).toFixed(4);
  
  console.log('订单增长:', orderGrowth + '%');
  console.log('毛利增长:', profitGrowth !== 'N/A' ? profitGrowth + '%' : 'N/A');
  console.log('UE变化:', ueChange > 0 ? '+' + ueChange : ueChange, '元');
}

// report.js - ES Module
import { CONFIG, state, safeFixed, safeLog } from './core';
import { displayName, fmtWan, fmtUE } from './utils';
import { getAnomalyLevel, getAnomalyLevelV2 } from './analysis';

function generateReportLocal() {
    if (!state.currentData || !state.currentData.cities || state.currentData.cities.length === 0) return;
    const cities = state.currentData.cities.filter(c => c.name !== '总商');
    const totalCity = state.currentData.cities.find(c => c.name === '总商');
    const blocks = CONFIG.BLOCKS;
    const dateStr = state.currentData.fileName || '未知日期';
    const md = [];

    md.push('佰优运营中心经营分析报告');
    md.push('');
    md.push('> ' + dateStr + ' | ' + cities.length + '城市');
    md.push('---');
    md.push('');

    // 一、整体概况
    md.push('## 一、整体概况');
    if (totalCity) {
      const tm = totalCity.modules[costModule];
      if (tm) {
        const totalOrders = cities.reduce((s,c) => s + ((c.modules[costModule]||{}).orders||0), 0);
        const totalProfit = cities.reduce((s,c) => s + ((c.modules[costModule]||{}).profit||0), 0);
        const lossCount = cities.filter(c => (c.modules[costModule]||{}).ue < 0).length;
        md.push('总商本期覆盖' + cities.length + '个城市，总订单量' + totalOrders.toLocaleString() + '单，总毛利' + fmtWan(totalProfit) + '。其中' + lossCount + '个城市UE为负，处于亏损状态。整体UE ' + fmtUE(tm.ue || 0) + '，' + (tm.ue < 0.5 ? '低于安全线，需重点关注成本结构。' : '处于可控区间。'));
        md.push('');
        md.push('| 指标 | 数值 |');
        md.push('|------|------|');
        md.push('| 总订单量 | ' + (tm.orders||0).toLocaleString() + '单 |');
        md.push('| 总收入（实收） | ' + fmtWan(tm.onlineRevenue||0) + ' |');
        md.push('| 总毛利 | ' + fmtWan(tm.profit||0) + ' |');
        md.push('| 整体UE | ' + fmtUE(tm.ue||0) + '/单 |');
        md.push('| 整体补贴率 | ' + (tm.subsidyRatio ? (tm.subsidyRatio*100).toFixed(2) : '0') + '% |');
        md.push('| 整体配送成本率 | ' + (tm.deliveryCostRate ? (tm.deliveryCostRate*100).toFixed(2) : '0') + '% |');
        md.push('| 整体罚款 | ' + (tm.penalty ? fmtWan(tm.penalty) : '0') + ' |');
      }
    }
    md.push('');

    // 二、各城市UE排名
    md.push('## 二、各城市UE排名');
    const cityUE = cities.map(c => {
      const m = c.modules[costModule] || {};
      return { name: c.displayName, ue: m.ue||0, orders: m.orders||0, subsidy: m.subsidyRatio||0, delCost: m.deliveryCostRate||0 };
    }).sort((a, b) => a.ue - b.ue);
    md.push('下表按UE从低到高排列，红色标记亏损城市，黄色为低利润预警。');
    md.push('');
    md.push('| 排名 | 城市 | UE(元/单) | 订单量 | 补贴率 | 配送成本率 |');
    md.push('|------|------|-----------|--------|--------|------------|');
    cityUE.forEach((c, i) => {
      const tag = c.ue < 0 ? '亏损' : (c.ue < 0.5 ? '预警' : '健康');
      md.push('| ' + (i+1) + ' | ' + c.name + ' | ' + safeFixed(c.ue, 2) + ' | ' + c.orders.toLocaleString() + ' | ' + safeFixed(c.subsidy*100, 2) + '% | ' + safeFixed(c.delCost*100, 2) + '% |');
    });
    md.push('');

    // 三、异常诊断
    const anomalies = [];
    for (const city of cities) {
      for (const block of blocks) {
        const m = city.modules[block.key];
        if (!m) continue;
        const reportAnomaly = getAnomalyLevelV2(m);
      const level = reportAnomaly.level;
        if (level === 'danger' || level === 'warning') {
          anomalies.push({ city: city.displayName, module: block.name, level, ue: m.ue, subsidy: m.subsidyRatio, orders: m.orders, deliveryCostRate: m.deliveryCostRate, penalty: m.penalty||0 });
        }
      }
    }

    md.push('## 三、异常城市诊断');
    if (anomalies.length === 0) {
      md.push('各城市各模块指标均在正常范围内，无异常项。');
    } else {
      const dangerList = anomalies.filter(a => a.level === 'danger');
      const warnList = anomalies.filter(a => a.level === 'warning');
      md.push('本期共检出' + anomalies.length + '项异常，其中严重异常' + dangerList.length + '项、预警' + warnList.length + '项。');
      md.push('');
      md.push('### 严重异常');
      md.push('UE为负或补贴率超过45%的模块，需立即介入排查。');
      md.push('');
      md.push('| 城市 | 模块 | UE | 补贴率 | 配送成本率 | 罚款 |');
      md.push('|------|------|-----|--------|------------|------|');
      dangerList.forEach(a => {
        md.push('| ' + a.city + ' | ' + a.module + ' | ' + safeFixed(a.ue, 2) + ' | ' + safeFixed(a.subsidy*100, 2) + '% | ' + safeFixed(a.deliveryCostRate*100, 2) + '% | ' + fmtWan(a.penalty) + ' |');
      });
      md.push('');
      if (warnList.length > 0) {
        md.push('### 预警项');
        md.push('UE低于0.5元或补贴率35%~45%的模块，需持续关注趋势。');
        md.push('');
        md.push('| 城市 | 模块 | UE | 补贴率 | 配送成本率 |');
        md.push('|------|------|-----|--------|------------|');
        warnList.forEach(a => {
          md.push('| ' + a.city + ' | ' + a.module + ' | ' + safeFixed(a.ue, 2) + ' | ' + safeFixed(a.subsidy*100, 2) + '% | ' + safeFixed(a.deliveryCostRate*100, 2) + '% |');
        });
        md.push('');
      }
    }

    // 四、成本结构分析
    md.push('## 四、成本结构分析');
    md.push('各城市核心成本项明细如下，按实收从高到低排列。重点关注配送成本占比和补贴占比两项。');
    md.push('');
    const totalCosts = cities.map(c => {
      const m = c.modules[costModule] || {};
      return { name: c.displayName, revenue: m.onlineRevenue||0, deliveryCost: m.deliveryCost||0, subsidyTotal: m.subsidyTotal||0, platformCost: m.platformCost||0, fixedCost: m.fixedCost||0, penalty: m.penalty||0, profit: m.profit||0 };
    }).sort((a, b) => b.revenue - a.revenue);

    md.push('| 城市 | 实收 | 配送成本 | 补贴总额 | 平台成本 | 固定成本 | 罚款 | 毛利 |');
    md.push('|------|------|----------|----------|----------|----------|------|------|');
    totalCosts.forEach(c => {
      md.push('| ' + c.name + ' | ' + fmtWan(c.revenue) + ' | ' + fmtWan(c.deliveryCost) + ' | ' + fmtWan(c.subsidyTotal) + ' | ' + fmtWan(c.platformCost) + ' | ' + fmtWan(c.fixedCost) + ' | ' + fmtWan(c.penalty) + ' | ' + fmtWan(c.profit) + ' |');
    });
    md.push('');

    // 五、各模块分析
    md.push('## 五、各模块分析');
    for (const block of blocks) {
      const blockCities = cities.map(c => {
        const m = c.modules[block.key] || {};
        return { name: c.displayName, ue: m.ue||0, orders: m.orders||0, profit: m.profit||0, subsidy: m.subsidyRatio||0 };
      }).filter(c => c.orders > 0).sort((a,b) => a.ue - b.ue);

      if (blockCities.length === 0) continue;

      const totalOrders = blockCities.reduce((s,c) => s + c.orders, 0);
      const totalProfit = blockCities.reduce((s,c) => s + c.profit, 0);
      const avgUE = totalOrders > 0 ? totalProfit / totalOrders : 0;
      const lossCities = blockCities.filter(c => c.ue < 0);

      md.push('### ' + block.name);
      md.push('覆盖' + blockCities.length + '个城市，总订单' + totalOrders.toLocaleString() + '单，总毛利' + fmtWan(totalProfit) + '，平均UE ' + safeFixed(avgUE, 2) + '。' + (lossCities.length > 0 ? lossCities.map(c => c.name).join('、') + '处于亏损状态。' : '所有城市均盈利。'));
      md.push('');
      md.push('| 城市 | UE | 订单量 | 毛利 | 补贴率 |');
      md.push('|------|-----|--------|------|--------|');
      blockCities.forEach(c => {
        md.push('| ' + c.name + ' | ' + safeFixed(c.ue, 2) + ' | ' + c.orders.toLocaleString() + ' | ' + fmtWan(c.profit) + ' | ' + safeFixed(c.subsidy*100, 2) + '% |');
      });
      md.push('');
    }

    // 六、重点问题与建议
    md.push('## 六、重点问题与建议');
    const suggestions = [];
    const lossCities = cityUE.filter(c => c.ue < 0);
    if (lossCities.length > 0) {
      suggestions.push('**亏损城市（' + lossCities.length + '个）：** ' + lossCities.map(c => c.name + '(' + safeFixed(c.ue, 2) + '元)').join('、') + '，建议重点排查补贴率和配送成本率，评估是否需要收缩或调整策略。');
    }
    const highSub = [...new Set(anomalies.filter(a => a.subsidy > 0.40).map(a => a.city))];
    if (highSub.length > 0) {
      suggestions.push('**高补贴城市：** ' + highSub.join('、') + '补贴率超过40%，建议核查B端/C端代补合理性及活动花费，建立补贴上限硬约束。');
    }
    const highDel = cityUE.filter(c => c.delCost > 0.37);
    if (highDel.length > 0) {
      suggestions.push('**高配送成本城市：** ' + highDel.map(c => c.name + '(' + (c.delCost*100).toFixed(2) + '%)').join('、') + '，建议关注运力结构、人效及配送罚款。');
    }
    const highPen = cities.filter(c => { const m = c.modules[costModule]; return m && m.penalty && m.penalty > 5000; });
    if (highPen.length > 0) {
      suggestions.push('**高罚款城市：** ' + highPen.map(c => c.displayName + '(' + fmtWan(c.modules[costModule].penalty) + ')').join('、') + '，建议核查配送罚款明细并推动申诉。');
    }
    const bestCities = cityUE.filter(c => c.ue >= 1.5).slice(0, 3);
    if (bestCities.length > 0) {
      suggestions.push('**表现最优：** ' + bestCities.map(c => c.name + '(' + safeFixed(c.ue, 2) + '元)').join('、') + '，可总结运营经验向其他城市推广。');
    }
    if (suggestions.length === 0) {
      suggestions.push('本期整体经营指标健康，无突出风险点。');
    }
    suggestions.forEach(s => md.push(s));
    md.push('');
    md.push('---');
    md.push('*报告由代理商财务分析工具自动生成*');

    const mdText = md.join('\n');
    state.reportText = mdText;
    renderMarkdown(mdText);
    $('#btnCopyReport').style.display = 'inline-block';
    $('#btnDownloadReport').style.display = 'inline-block';
  }



function generateReport() {
  if (!state.currentData || !state.currentData.cities || state.currentData.cities.length === 0) {
    $('#reportContent').innerHTML = '<p class="ft-empty-danger">请先上传数据</p>';
    return;
  }

  // 准备分析数据
  var cities = state.currentData.cities;
  var analyzeData = {
    date: state.currentData.fileName || document.getElementById('dateSelect').value || '未知日期',
    merchantType: state.currentMerchant === 'all' ? '全量商家' : state.currentMerchant === 'ka' ? 'KA商家' : '城市商家',
    cities: cities.map(function(c) {
      var metrics = {};
      if (c.modules) {
        if (Array.isArray(c.modules)) {
          c.modules.forEach(function(m) {
            metrics[m.key || m.name] = {
              ue: m.ue || 0,
              profitRate: m.profitRate || 0,
              deliveryCostRate: m.deliveryCostRate || (m.deliveryCost && m.onlineRevenue ? m.deliveryCost / m.onlineRevenue * 100 : 0),
              subsidyRate: m.subsidyRate || (m.subsidyTotal && m.gmvAmount ? m.subsidyTotal / m.gmvAmount * 100 : 0),
              fixedCostRate: m.fixedCostRate || (m.fixedCost && m.onlineRevenue ? m.fixedCost / m.onlineRevenue * 100 : 0),
              orders: m.orders || 0,
              profit: m.profit || 0,
              onlineRevenue: m.onlineRevenue || 0,
              deliveryCost: m.deliveryCost || 0,
              subsidyTotal: m.subsidyTotal || 0,
              fixedCost: m.fixedCost || 0,
              gmvAmount: m.gmvAmount || 0
            };
          });
        } else {
          for (var mk in c.modules) {
            var m = c.modules[mk];
            metrics[mk] = {
              ue: m.ue || 0,
              profitRate: m.profitRate || 0,
              deliveryCostRate: m.deliveryCostRate || (m.deliveryCost && m.onlineRevenue ? m.deliveryCost / m.onlineRevenue * 100 : 0),
              subsidyRate: m.subsidyRate || (m.subsidyTotal && m.gmvAmount ? m.subsidyTotal / m.gmvAmount * 100 : 0),
              fixedCostRate: m.fixedCostRate || (m.fixedCost && m.onlineRevenue ? m.fixedCost / m.onlineRevenue * 100 : 0),
              orders: m.orders || 0,
              profit: m.profit || 0,
              onlineRevenue: m.onlineRevenue || 0,
              deliveryCost: m.deliveryCost || 0,
              subsidyTotal: m.subsidyTotal || 0,
              fixedCost: m.fixedCost || 0,
              gmvAmount: m.gmvAmount || 0
            };
          }
        }
      }
      return { name: c.name, metrics: metrics };
    }),
    modules: ['全品类', '餐饮', '闪购', '医药', '拼好饭']
  };

  // 显示loading
  $('#reportContent').innerHTML = '<div class="ft-empty-center"><div class="ft-rpt-title">正在生成分析报告...</div><p class="ft-c-sec">AI分析引擎处理中，请稍候</p></div>';

  // 调用后端API
  fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(analyzeData)
  })
  .then(function(res) { return res.json(); })
  .then(function(task) {
    var taskId = task.taskId;
    // 轮询结果
    var pollCount = 0;
    var pollTimer = setInterval(function() {
      pollCount++;
      fetch('/api/analyze/result/' + taskId)
        .then(function(res) { return res.json(); })
        .then(function(result) {
          if (result.status === 'done') {
            clearInterval(pollTimer);
            renderMarkdown(result.markdown);
            state.reportText = result.markdown;
            $('#btnCopyReport').style.display = 'inline-block';
            $('#btnDownloadReport').style.display = 'inline-block';
          } else if (result.status === 'error') {
            clearInterval(pollTimer);
            $('#reportContent').innerHTML = '<p class="ft-empty-danger">报告生成失败: ' + result.message + '</p>';
          }
          // status === 'pending' 继续等待
          if (pollCount > 60) {
            clearInterval(pollTimer);
            $('#reportContent').innerHTML = '<p class="ft-empty-danger">分析超时，请重试</p>';
          }
        })
        .catch(function(err) {
          clearInterval(pollTimer);
          // 如果API不可用，fallback到本地规则引擎
          safeLog('debug', '[generateReport] API不可用，使用本地分析');
          generateReportLocal();
        });
    }, 500);
  })
  .catch(function(err) {
    // API不可用时的fallback
    safeLog('debug', '[generateReport] API不可用，使用本地分析');
    generateReportLocal();
  });
}

function renderMarkdown(md) {
  var html = md
    .replace(/&/g, '&amp;')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^---$/gm, '<hr>')
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^- (.+)$/gm, '<li>$1</li>');
  // 重新处理表格
  var lines = html.split('\n');
  var inTable = false;
  var result = [];
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    if (line.indexOf('|') === 0) {
      if (line.replace(/[\|\s\-]/g, '') === '') continue; // 跳过表头分隔行
      if (!inTable) { result.push('<table>'); inTable = true; }
      var cells = line.split('|').filter(function(c) { return c.trim() !== ''; });
      var tag = result.length > 0 && result[result.length-1] === '<table>' ? 'th' : 'td';
      var row = '<tr>' + cells.map(function(c) { return '<' + tag + '>' + c.trim() + '</' + tag + '>'; }).join('') + '</tr>';
      result.push(row);
    } else {
      if (inTable) { result.push('</table>'); inTable = false; }
      // li需要包在ul里
      if (line.indexOf('<li>') === 0) {
        if (result.length === 0 || result[result.length-1] !== '<ul>') result.push('<ul>');
        result.push(line);
      } else {
        if (result.length > 0 && result[result.length-1] === '<ul>') result.push('</ul>');
        if (line.trim()) result.push('<p>' + line + '</p>');
      }
    }
  }
  if (inTable) result.push('</table>');
  if (result.length > 0 && result[result.length-1] === '<ul>') result.push('</ul>');
  document.getElementById('reportContent').innerHTML = result.join('\n');
}






// ===== ES Module Exports =====
export { generateReportLocal, generateReport, renderMarkdown };

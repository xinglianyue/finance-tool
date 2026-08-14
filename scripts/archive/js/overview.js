// overview.js - ES Module
import { CONFIG, state, $, safeFixed } from './core';
import { safeHTML, displayName, fmtWan, fmtUE, fmtPct, fmtInt } from './utils';
import { getAnomalyLevel, getAnomalyLevelV2, getAnomalyLevelV3, getDiagnosisV2, getDiagnosis, getCityRankingData, renderCityRankingChange, collectAnomalies, renderRootCausePanel } from './analysis';

  // ===== TAB1: OVERVIEW =====
  function renderStatCards() {
    const cities = window.getFilteredCities();
    const modules = CONFIG.BLOCKS.map(b => b.key);
    const allCities = state.currentData ? state.currentData.cities : [];
    const totalBiz = allCities.find(c => c.name === '总商');
    const allMod = totalBiz ? totalBiz.modules['all'] : null;

    let totalOrders = allMod ? allMod.orders : 0;
    let totalProfit = allMod ? allMod.profit : 0;
    let totalSubsidy = allMod ? allMod.subsidyTotal : 0;
    let totalDeliveryCost = allMod ? (allMod.deliveryCost || 0) : 0;
    let totalPenalty = allMod ? (allMod.penalty || 0) : 0;
    let totalSubsidyB = allMod ? (allMod.subsidyB || 0) : 0;
    let totalSubsidyC = allMod ? (allMod.subsidyC || 0) : 0;
    let subsidyRatio = allMod ? allMod.subsidyRatio : 0;
    let deliveryCostRate = allMod ? (allMod.deliveryCostRate || 0) : 0;

    // V3: 使用增强引擎统计异常
    const anomalies = { danger: 0, warning: 0, missing: 0 };
    let totalScore = 0;
    let scoredCount = 0;
    for (const city of cities) {
      for (const mk of modules) {
        const m = city.modules[mk];
        if (!m) continue;
        try {
          const anomalyResult = (typeof getAnomalyLevelV3 === 'function') ? getAnomalyLevelV3(m) : getAnomalyLevelV2(m);
          const level = anomalyResult.level;
          anomalies[level] = (anomalies[level] || 0) + 1;
          if (anomalyResult.score !== undefined && anomalyResult.level !== 'missing') {
            totalScore += anomalyResult.score;
            scoredCount++;
          }
        } catch(e) {
          const anomalyResult = getAnomalyLevelV2(m);
          anomalies[anomalyResult.level] = (anomalies[anomalyResult.level] || 0) + 1;
        }
      }
    }
    const avgScore = scoredCount > 0 ? Math.round(totalScore / scoredCount) : 0;
    // Build anomaly badge
    const anomalyCount = anomalies.danger + anomalies.warning;
    let anomalyBadge = '';
    if (anomalyCount > 0) {
      anomalyBadge = `<a href="javascript:void(0)" onclick="document.querySelectorAll(\'.tab-btn\')[1].click()" class="anomaly-badge-link" title="${anomalies.danger}严重 ${anomalies.warning}预警 - 点击查看"><span class="anomaly-badge-red">${anomalies.danger}</span><span class="anomaly-badge-yellow">${anomalies.warning}</span></a>`;
    } else {
      anomalyBadge = '<span class="anomaly-badge-ok">正常</span>';
    }

    // V3: 综合健康分指示器
    let healthBadge = '';
    if (avgScore > 0) {
      const healthClass = avgScore > 50 ? 'danger' : avgScore > 25 ? 'warning' : 'ok';
      const healthLabel = avgScore > 50 ? '较差' : avgScore > 25 ? '关注' : '健康';
      healthBadge = `<span class="ft-ov-sec-ml">健康度 <span style="color:${healthClass === 'ok' ? 'var(--success)' : healthClass === 'warning' ? '#f0ad4e' : 'var(--danger)'};font-weight:600;">${healthLabel}(${avgScore}分)</span></span>`;
    }

    const container = $('#statCards');
    container.innerHTML = `
      <div class="stat-card" role="status" aria-live="polite">
        <div class="label">总订单量</div>
        <div class="value">${fmtWan(totalOrders)}</div>
        <div class="sub-info">总商全品类</div>
      </div>
      <div class="stat-card" role="status" aria-live="polite">
        <div class="label">总毛利</div>
        <div class="value ${totalProfit < 0 ? 'danger' : 'success'}">${fmtWan(totalProfit)}</div>
        <div class="sub-info">单均UE ${totalOrders > 0 ? safeFixed(totalProfit/totalOrders, 2) : '-'}元 | 补贴率${safeFixed(subsidyRatio * 100, 2)}% | 配送${safeFixed(deliveryCostRate * 100, 2)}%</div>
      </div>
      <div class="stat-card" role="status" aria-live="polite">
        <div class="label">代补总额</div>
        <div class="value">${fmtWan(totalSubsidy)}</div>
        <div class="sub-info">B端 ${fmtWan(totalSubsidyB)} / C端 ${fmtWan(totalSubsidyC)}</div>
      </div>
      <div class="stat-card" role="status" aria-live="polite">
        <div class="label">配送成本</div>
        <div class="value">${fmtWan(totalDeliveryCost)}</div>
        <div class="sub-info">罚款 ${fmtWan(totalPenalty)} ${anomalyBadge}</div>
      </div>
    `;
    // V3: 在统计卡片下方添加健康度指示
    if (healthBadge) {
      container.insertAdjacentHTML('beforeend', `<div class="ft-ov-suc-badge">${healthBadge}</div>`);
    }
  }

  // renderAnomalyAlert moved to Tab2 (detail.js) - kept as empty stub for compatibility
  /**
 * [C轮迁移] 更新异常徽章数字
 */
function updateAnomalyBadge() {
    const items = collectAnomalies();
    const badge = $('#anomalyBadge');
    if (badge) {
      if (items.length > 0) {
        badge.classList.remove('hidden');
        badge.textContent = items.length;
      } else {
        badge.classList.add('hidden');
      }
    }
  }

/**
 * [C轮迁移] 渲染异常Tab列表
 */
function renderAnomalyTab() {
    const items = collectAnomalies();
    const container = $('#anomalyList');
    if (!container) return;
    if (items.length === 0) {
      container.innerHTML = '<div class="no-anomaly"><div class="check-icon">&#10004;</div>' +
        '<h3>所有城市运行正常</h3><p class="text-secondary">当前筛选范围内未发现异常数据点</p></div>';
      return;
    }
    container.innerHTML = items.map((item, idx) => {
      const dotClass = item.level === 'danger' ? 'red' : 'yellow';
      const label = item.level === 'danger' ? '严重' : '预警';
      const diag = getDiagnosis(item.level, item.ue, item.subsidyRatio, item.moduleName);
      return '<div class="anomaly-card">' +
        '<div class="anomaly-card-header" onclick="document.querySelector(\'#anomalyList .anomaly-card:nth-child(' + (idx+1) + ') .anomaly-card-body\').classList.toggle(\'show\')">' +
          '<div class="anomaly-card-title">' +
            '<div class="severity-dot ' + dotClass + '"></div>' +
            '<span>' + (item.cityDisplay || item.cityName) + ' / ' + item.moduleName + '</span>' +
            '<span style="font-size:12px;color:var(--text-secondary);font-weight:400">[' + label + ']</span>' +
          '</div>' +
          '<button class="view-btn" data-city="' + item.cityName + '" data-module="' + item.moduleKey + '">查看详细</button>' +
        '</div>' +
        '<div class="anomaly-card-body show">' +
          '<div class="anomaly-metrics">' +
            '<div class="anomaly-metric"><div class="m-label">单均UE</div><div class="m-value ' + (item.ue < 0 ? 'danger' : '') + '">' + fmtUE(item.ue) + '元</div></div>' +
            '<div class="anomaly-metric"><div class="m-label">补贴率</div><div class="m-value ' + (item.subsidyRatio > 0.35 ? 'danger' : '') + '">' + fmtPct(item.subsidyRatio) + '</div></div>' +
            '<div class="anomaly-metric"><div class="m-label">配送成本率</div><div class="m-value ' + ((item.deliveryCostRate || 0) > 0.30 ? 'danger' : '') + '">' + fmtPct(item.deliveryCostRate || 0) + '</div></div>' +
            '<div class="anomaly-metric"><div class="m-label">固定成本率</div><div class="m-value ' + ((item.fixedCostRate || 0) > 0.08 ? 'danger' : '') + '">' + fmtPct(item.fixedCostRate || 0) + '</div></div>' +
            '<div class="anomaly-metric"><div class="m-label">客单价</div><div class="m-value ' + ((item.avgRevenuePerOrder || 0) < 8 ? 'danger' : '') + '">' + (item.avgRevenuePerOrder || 0).toFixed(1) + '元</div></div>' +
            '<div class="anomaly-metric"><div class="m-label">利润率</div><div class="m-value ' + ((item.profitRate || 0) < 0 ? 'danger' : '') + '">' + fmtPct(item.profitRate || 0) + '</div></div>' +
            '<div class="anomaly-metric"><div class="m-label">订单量</div><div class="m-value">' + fmtInt(item.orders) + '</div></div>' +
            '<div class="anomaly-metric"><div class="m-label">毛利</div><div class="m-value ' + (item.profit < 0 ? 'danger' : 'success') + '">' + fmtWan(item.profit) + '</div></div>' +
          '</div>' +
          (item.triggers && item.triggers.length > 0 ? '<div class="anomaly-triggers"><strong>触发指标(' + item.triggers.length + '):</strong> ' + item.triggers.map(function(t) {
            var cls = t.severity === 'danger' ? 'tag-danger' : 'tag-warn';
            var v = t.metric.indexOf('率') >= 0 ? (t.value*100).toFixed(1)+'%' : t.value.toFixed(2)+'元';
            return '<span class="anomaly-tag ' + cls + '">' + t.metric + ' ' + v + '</span>';
          }).join(' ') + '</div>' : '') +
          (diag ? '<div class="anomaly-diagnosis"><strong>诊断:</strong> ' + diag + '</div>' : '') +
          renderRootCausePanel(item.cityName, item.moduleKey) +
        '</div>' +
      '</div>';
    }).join('');
  }

function renderAnomalyAlert() {
    updateAnomalyBadge();
  }

function renderMatrix() {
    const cities = window.getFilteredCities();
    const table = $('#matrixTable');
    let html = '<thead><tr><th class="corner">城市 \\ 模块</th>';
    for (const block of CONFIG.BLOCKS) {
      html += `<th>${block.name}</th>`;
    }
    html += '</tr></thead><tbody>';
    for (const city of cities) {
      html += `<tr><td class="city-name">${city.displayName}</td>`;
      for (const block of CONFIG.BLOCKS) {
        const m = city.modules[block.key];
        if (!m || (m.orders === 0 && m.profit === 0)) {
          html += '<td class="ue-cell ue-missing"><div class="ue-value">-</div></td>';
          continue;
        }
        // V3: 尝试使用增强引擎
        let anomalyResult2, score = null;
        try {
          anomalyResult2 = (typeof getAnomalyLevelV3 === 'function') ? getAnomalyLevelV3(m) : getAnomalyLevelV2(m);
          score = anomalyResult2.score;
        } catch(e) {
          anomalyResult2 = getAnomalyLevelV2(m);
        }
        const level = anomalyResult2.level;
        const cls = level === 'danger' ? 'ue-danger' : level === 'warning' ? 'ue-warn' : level === 'missing' ? 'ue-missing' : 'ue-good';
        // V3: 显示评分(如有)
        const scoreLabel = score !== null && score > 0 ? `<span class="ft-ov-sec">${score}</span>` : '';
        html += `<td class="ue-cell ${cls}" data-city="${city.name}" data-module="${block.key}">
          <div class="ue-value">${fmtUE(m.ue)} ${scoreLabel}</div>
        </td>`;
      }
      html += '</tr>';
    }
    html += '</tbody>';
    table.innerHTML = html;
    // Click + hover handlers
    table.querySelectorAll('.ue-cell[data-city]').forEach(cell => {
      cell.addEventListener('click', () => {
        window.switchToDetail(cell.dataset.city, cell.dataset.module);
      });
      cell.addEventListener('mouseenter', () => {
        const cityName = cell.dataset.city;
        const moduleKey = cell.dataset.module;
        const city = state.currentData.cities.find(c => c.name === cityName);
        if (!city) return;
        const m = city.modules[moduleKey];
        if (!m) return;
        const moduleName = city.modules[moduleKey]?.moduleName || CONFIG.BLOCKS.find(b => b.key === moduleKey)?.name || moduleKey;
        const tooltip = $('#ueTooltip');
        tooltip.innerHTML = `<strong>${safeHTML(city.displayName)} / ${safeHTML(moduleName)}</strong><br>
          订单量: ${fmtInt(m.orders)}<br>
          收入: ${fmtWan(m.onlineRevenue)}<br>
          补贴率: ${fmtPct(m.subsidyRatio)} (${fmtWan(m.subsidyTotal)})<br>
          毛利: ${fmtWan(m.profit)}<br>
          单均UE: ${fmtUE(m.ue)}元
        `;
        tooltip.style.display = 'block';
        const rect = cell.getBoundingClientRect();
        tooltip.style.left = (rect.left + rect.width / 2 - tooltip.offsetWidth / 2) + 'px';
        tooltip.style.top = (rect.top - tooltip.offsetHeight - 8) + 'px';
      });
      cell.addEventListener('mouseleave', () => {
        $('#ueTooltip').style.display = 'none';
      });
    });
  }


// ===== T10 V2: 增强排名面板(多指标维度+综合评分+排名轨迹) =====

function renderCityRankingPanel() {
    const container = document.getElementById('cityRankingChangeContainer');
    if (!container) return;
    const allData = window.DataStore ? window.DataStore.loadAll() : null;
    const dates = allData ? Object.keys(allData).sort() : [];
    if (dates.length < 2) {
      container.style.display = 'none';
      return;
    }
    container.style.display = '';

    const metricOptions = [
      { key: 'ue', label: 'UE单均利润' },
      { key: 'profit', label: '毛利' },
      { key: 'orders', label: '订单量' },
      { key: 'subsidyRatio', label: '补贴率(升序)' },
      { key: 'deliveryCostRate', label: '配送成本率(升序)' },
      { key: 'anomalyScore', label: '异常评分(降序)' }
    ];

    let html = '<div class="ranking-header">';
    html += '<div class="ranking-controls">';
    html += '<label class="ranking-label">排名维度</label>';
    html += '<select id="rankingMetricSelect" class="ranking-select">';
    metricOptions.forEach(opt => {
      html += '<option value="' + opt.key + '">' + opt.label + '</option>';
    });
    html += '</select>';
    html += '</div>';
    html += '<div class="ranking-period">' + dates[dates.length-2] + ' → ' + dates[dates.length-1] + '</div>';
    html += '</div>';
    html += '<div id="rankingTableWrap" class="ranking-table-wrap"></div>';
    container.innerHTML = html;

    // 绑定切换事件
    document.getElementById('rankingMetricSelect').addEventListener('change', function() {
      renderRankingTable(this.value, dates);
    });

    // 初次渲染
    renderRankingTable('ue', dates);
  }

  function renderRankingTable(metricKey, dates) {
    const wrap = document.getElementById('rankingTableWrap');
    if (!wrap) return;
    const allData = window.DataStore.loadAll();
    const mt = state.currentMerchant || 'all';
    const prevDate = dates[dates.length - 2];
    const currDate = dates[dates.length - 1];

    const prevEntry = ((allData[prevDate] || {}).merchantData || {})[mt] || {};
    const currEntry = ((allData[currDate] || {}).merchantData || {})[mt] || {};
    const prevCities = (prevEntry.cities || []).filter(c => c.name !== '总商');
    const currCities = (currEntry.cities || []).filter(c => c.name !== '总商');

    // 构建城市数据
    const cityDataMap = {};
    currCities.forEach(c => {
      const name = c.displayName || c.name;
      const mod = c.modules['all'] || {};
      cityDataMap[c.name] = {
        name: c.name,
        displayName: name,
        curr: mod,
        prev: null
      };
    });
    prevCities.forEach(c => {
      if (cityDataMap[c.name]) {
        cityDataMap[c.name].prev = c.modules['all'] || {};
      }
    });

    // 获取城市值并排名
    const cityList = Object.values(cityDataMap).filter(c => c.curr && c.curr.orders > 0);

    // 排名逻辑
    function getMetricValue(data, key) {
      if (!data) return null;
      switch (key) {
        case 'ue': return data.ue || 0;
        case 'profit': return data.profit || 0;
        case 'orders': return data.orders || 0;
        case 'subsidyRatio': return data.subsidyRatio || 0;
        case 'deliveryCostRate': return data.deliveryCostRate || (data.onlineRevenue > 0 ? data.deliveryCost / data.onlineRevenue : 0);
        case 'anomalyScore':
          try {
            const result = (typeof getAnomalyLevelV3 === 'function') ? getAnomalyLevelV3(data) : getAnomalyLevelV2(data);
            return result.score || 0;
          } catch(e) { return 0; }
        default: return data.ue || 0;
      }
    }

    function getMetricLabel(key, value) {
      switch (key) {
        case 'ue': return value.toFixed(2) + '元';
        case 'profit': return (value / 10000).toFixed(2) + '万';
        case 'orders': return value.toLocaleString();
        case 'subsidyRatio': return (value * 100).toFixed(1) + '%';
        case 'deliveryCostRate': return (value * 100).toFixed(1) + '%';
        case 'anomalyScore': return value + '分';
        default: return value;
      }
    }

    // 排序方向
    const reverseSort = (metricKey === 'subsidyRatio' || metricKey === 'deliveryCostRate' || metricKey === 'anomalyScore');

    // 当前排名
    const currRanked = [...cityList].sort((a, b) => {
      const va = getMetricValue(a.curr, metricKey);
      const vb = getMetricValue(b.curr, metricKey);
      return reverseSort ? vb - va : vb - va; // 默认降序(UE/利润/订单量)
    });
    // 修正: 补贴率和配送成本率要升序(小的排前面=好)
    if (!reverseSort) {
      currRanked.sort((a, b) => getMetricValue(b.curr, metricKey) - getMetricValue(a.curr, metricKey));
    } else {
      currRanked.sort((a, b) => getMetricValue(a.curr, metricKey) - getMetricValue(b.curr, metricKey));
    }

    // 上期排名
    const prevRankMap = {};
    [...cityList].filter(c => c.prev).sort((a, b) => {
      const va = getMetricValue(a.prev, metricKey);
      const vb = getMetricValue(b.prev, metricKey);
      if (!reverseSort) return vb - va;
      return va - vb;
    }).forEach((c, i) => { prevRankMap[c.name] = i + 1; });

    // 渲染表格
    let html = '<table class="ranking-table data-table">';
    html += '<thead><tr><th>排名</th><th>城市</th><th>上期排名</th><th>本期排名</th><th>变化</th><th>数值</th></tr></thead>';
    html += '<tbody>';

    currRanked.forEach((c, i) => {
      const currRank = i + 1;
      const prevRank = prevRankMap[c.name];
      const currVal = getMetricValue(c.curr, metricKey);
      const prevVal = getMetricValue(c.prev, metricKey);

      let rankChange = '';
      let rankClass = '';
      if (prevRank !== undefined) {
        const diff = prevRank - currRank;
        if (diff > 0) {
          rankChange = '↑' + diff;
          rankClass = 'rank-up';
        } else if (diff < 0) {
          rankChange = '↓' + Math.abs(diff);
          rankClass = 'rank-down';
        } else {
          rankChange = '-';
          rankClass = 'rank-same';
        }
      } else {
        rankChange = '新';
        rankClass = 'rank-new';
      }

      let valClass = '';
      if (metricKey === 'anomalyScore' && currVal > 30) {
        valClass = 'val-danger';
      }
      if (metricKey === 'ue') {
        if (currVal < 0) valClass = 'val-danger';
        else if (currVal < 0.5) valClass = 'val-warn';
      }

      html += '<tr>';
      html += '<td class="rank-num">' + currRank + '</td>';
      html += '<td class="rank-city">' + c.displayName + '</td>';
      html += '<td class="rank-prev">' + (prevRank !== undefined ? prevRank : '-') + '</td>';
      html += '<td class="rank-curr">' + currRank + '</td>';
      html += '<td class="' + rankClass + '">' + rankChange + '</td>';
      html += '<td class="rank-val ' + valClass + '">' + getMetricLabel(metricKey, currVal) + '</td>';
      html += '</tr>';
    });

    html += '</tbody></table>';
    wrap.innerHTML = html;
  }

// ===== ES Module Exports =====

export { renderStatCards, renderMatrix, renderAnomalyAlert, renderCityRankingPanel, renderRankingTable, updateAnomalyBadge, renderAnomalyTab };


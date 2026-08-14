  // ===== TAB3: DETAIL =====
// [Phase 2 T5] 导入增强异常检测引擎
import { safeFixed } from './core';
import { safeHTML, displayName, fmtWan, fmtUE, fmtPct, fmtInt } from './utils';
import { getAnomalyLevelV3, getDiagnosisV2, renderSubsidyBreakdown, renderSubsidyTrend, renderSensitivityPanel, renderYoYPanel, renderForecastPanel, renderWhatIfPanel, analyzeSensitivity, getMultiPeriodTrend, forecastTrend } from './analysis';

  function updateDetailSelectors() {
    const citySel = $('#detailCity');
    const currentVal = citySel.value;
    citySel.innerHTML = '';
    for (const city of getFilteredCities()) {
      const opt = document.createElement('option');
      opt.value = city.name;
      opt.textContent = city.displayName;
      if (city.name === (state.detailCity || currentVal)) opt.selected = true;
      citySel.appendChild(opt);
    }
    state.detailCity = citySel.value;
  }
  
  // ===== V11 NEW: 多期趋势对比 =====
  function renderTrendCompare() {
    var el = document.getElementById('trendCompare');
    if (!el) return;
    if (!state.currentData) {
      el.innerHTML = '<p class="ft-c-gray ft-fs12 ft-ta-center ft-pd20">请先上传数据文件</p>';
      return;
    }
    var allData = DataStore.loadAll();
    var dates = Object.keys(allData).sort();
    if (dates.length < 2) {
      el.innerHTML = '<p class="ft-c-gray ft-fs12 ft-ta-center ft-pd20">至少需要2期数据才能进行趋势对比，当前仅有' + dates.length + '期</p>';
      return;
    }
    var costCity = document.getElementById('detailCity') ? document.getElementById('detailCity').value : '总商';
    var costModule = document.getElementById('detailModule') ? document.getElementById('detailModule').value : 'all';
    var merchantKey = state.currentMerchant || 'all';

    // 收集各期数据
    var trendData = [];
    dates.forEach(function(date) {
      var file = allData[date];
      var cities;
      if (file.merchantData && file.merchantData[merchantKey]) {
        cities = file.merchantData[merchantKey].cities;
      } else {
        cities = file.cities || (file.currentData && file.currentData.cities) || [];
      }
      var city = cities.find(function(c) { return c.name === costCity; });
      var mod = city ? (city.modules[costModule] || city.modules['all']) : null;
      if (mod) {
        trendData.push({
          date: date,
          orders: mod.orders || 0,
          revenue: mod.onlineRevenue || 0,
          profit: mod.profit || 0,
          ue: mod.ue || 0,
          subsidyRatio: mod.subsidyRatio || 0,
          deliveryCostRate: mod.deliveryCostRate || 0,
          gmv: mod.gmvAmount || 0,
          deliveryCost: mod.deliveryCost || 0,
          subsidyTotal: mod.subsidyTotal || 0,
        });
      }
    });

    if (trendData.length < 2) {
      el.innerHTML = '<p class="ft-c-gray ft-fs12 ft-ta-center ft-pd20">当前城市/模块组合在多期数据中不足2期</p>';
      return;
    }

    var html = '<div style="margin-bottom:12px;font-size:12px;color:var(--text-secondary);">共' + trendData.length + '期数据 | 城市: ' + costCity + ' | 模块: ' + costModule + '</div>';

    // 趋势表格
    html += '<div class="table-wrapper"><table class="ka-compare-table data-table" role="table" aria-label="财务数据表"><thead><tr><th>日期</th><th>订单量</th><th>收入</th><th>毛利</th><th>UE</th><th>补贴率</th><th>配送成本率</th></tr></thead><tbody>';
    trendData.forEach(function(d, i) {
      var rowStyle = i === trendData.length - 1 ? 'class="ft-detail-blue"' : '';
      var change = '';
      if (i > 0) {
        var prev = trendData[i-1];
        var orderChange = prev.orders > 0 ? safeFixed((d.orders - prev.orders)/prev.orders*100, 1) : '-';
        var profitChange = prev.profit > 0 ? safeFixed((d.profit - prev.profit)/prev.profit*100, 1) : '-';
        change = orderChange + '%/' + profitChange + '%';
      }
      html += '<tr ' + rowStyle + '><td>' + d.date + (change ? '<br><span style="font-size:10px;color:var(--gray);">环比: ' + change + '</span>' : '') + '</td>';
      html += '<td>' + fmtInt(d.orders) + '</td>';
      html += '<td>' + fmtWan(d.revenue) + '</td>';
      html += '<td style="color:' + (d.profit >= 0 ? CHART_COLORS.success : CHART_COLORS.danger) + '">' + fmtWan(d.profit) + '</td>';
      html += '<td style="color:' + (d.ue >= 0.3 ? CHART_COLORS.success : d.ue >= 0 ? CHART_COLORS.orange : CHART_COLORS.danger) + '">' + safeFixed(d.ue, 2) + '元</td>';
      html += '<td>' + safeFixed(d.subsidyRatio*100, 2) + '%</td>';
      html += '<td>' + safeFixed(d.deliveryCostRate*100, 2) + '%</td></tr>';
    });
    html += '</tbody></table></div>';

    // UE趋势（纯CSS条形图）
    html += '<div class="ft-mt16"><h4 class="ft-fs13 ft-mg0 ft-mb8">UE趋势</h4>';
    var maxUE = Math.max.apply(null, trendData.map(function(d){return Math.abs(d.ue);}).concat([0.1]));
    trendData.forEach(function(d) {
      var isPositive = d.ue >= 0;
      var barColor = isPositive ? (d.ue >= 0.3 ? CHART_COLORS.success : CHART_COLORS.orange) : CHART_COLORS.danger;
      var barW = Math.min(Math.abs(d.ue) / maxUE * 100, 100);
      html += '<div class="ft-progress-wrap">';
      html += '<div style="width:70px;color:var(--text-secondary);text-align:right;padding-right:6px;">' + d.date + '</div>';
      html += '<div class="ft-progress-bar">';
      html += '<div style="height:100%;width:' + barW + '%;background:' + barColor + ';border-radius:2px;"></div></div>';
      html += '<div style="width:55px;text-align:right;padding-left:4px;color:' + barColor + ';">' + safeFixed(d.ue, 2) + '元</div></div>';
    });
    html += '</div>';

    // 补贴率趋势
    html += '<div class="ft-mt16"><h4 class="ft-fs13 ft-mg0 ft-mb8">补贴率趋势</h4>';
    var maxSub = Math.max.apply(null, trendData.map(function(d){return d.subsidyRatio;}));
    if (maxSub < 0.01) maxSub = 0.01;
    trendData.forEach(function(d) {
      var barColor = d.subsidyRatio > 0.35 ? CHART_COLORS.danger : d.subsidyRatio > 0.30 ? CHART_COLORS.orange : CHART_COLORS.success;
      var barW = d.subsidyRatio / maxSub * 100;
      html += '<div class="ft-progress-wrap">';
      html += '<div style="width:70px;color:var(--text-secondary);text-align:right;padding-right:6px;">' + d.date + '</div>';
      html += '<div class="ft-progress-bar">';
      html += '<div style="height:100%;width:' + barW + '%;background:' + barColor + ';border-radius:2px;"></div></div>';
      html += '<div style="width:55px;text-align:right;padding-left:4px;color:' + barColor + ';">' + safeFixed(d.subsidyRatio*100, 1) + '%</div></div>';
    });
    html += '</div>';

    el.innerHTML = html;
  
    // V13: 触发趋势图表
    try {
      var el = document.getElementById('trendCharts');
      if (el && trendData.length >= 2) {
        el.style.display = 'grid';
        renderTrendCharts(trendData);
      }
    } catch(e) { console.warn('[V13 Chart]', e.message); }
}


  function renderDetailTab() {
    const cityName = state.detailCity;
    const moduleKey = state.detailModule;
    const city = state.currentData?.cities.find(c => c.name === cityName);
    if (!city) {
      $('#detailContent').innerHTML = '<div class="no-anomaly"><p class="text-secondary">请选择城市</p></div>';
      return;
    }
    const m = city.modules[moduleKey];
    if (!m) {
      $('#detailContent').innerHTML = '<div class="no-anomaly"><p class="text-secondary">该模块无数据</p></div>';
      return;
    }
    const moduleName = city.modules[moduleKey]?.moduleName || CONFIG.BLOCKS.find(b => b.key === moduleKey)?.name || moduleKey;
    // [T5] V3增强引擎(6指标+IQR+趋势+交叉关联)
    const anomalyResult = getAnomalyLevelV3(m);
    const anomalyLevel = anomalyResult.level;
    const prevData = getPrevPeriodData(cityName, moduleKey);
    const hasComparison = prevData !== null;

    let html = '';

    // ===== Section 1: 城市核心指标 =====
    html += `<div class="section-card" id="secDetailMetrics">
      <div class="section-title section-title-collapsible" onclick="this.parentElement.classList.toggle('section-collapsed')">
        <i class="fas fa-city" style="margin-right:6px;color:var(--primary);"></i>
        <span id="secDetailMetricsCity">城市核心指标</span>
        <span class="section-toggle-icon">&#9660;</span>
      </div>
      <div class="section-body">
        <div class="detail-stats">
          ${detailStat('订单量', fmtInt(m.orders), prevData ? changeStr(m.orders, prevData.orders) : '')}
          ${detailStat('收入', fmtWan(m.onlineRevenue), prevData ? changeStr(m.onlineRevenue, prevData.onlineRevenue, true) : '')}
          ${detailStat('毛利', fmtWan(m.profit), prevData ? changeStr(m.profit, prevData.profit, true) : '', m.profit < 0 ? 'danger' : 'success')}
          ${detailStat('单均UE', fmtUE(m.ue) + '元', prevData ? changeStr(m.ue, prevData.ue, false, true) : '', m.ue < 0 ? 'danger' : '')}
          ${detailStat('B端代补', fmtWan(m.subsidyB || 0), prevData ? changeStr(m.subsidyB || 0, prevData.subsidyB || 0, true) : '')}
          ${detailStat('C端代补', fmtWan(m.subsidyC || 0), prevData ? changeStr(m.subsidyC || 0, prevData.subsidyC || 0, true) : '')}
          ${detailStat('配送成本', fmtWan(m.deliveryCost), prevData ? changeStr(m.deliveryCost, prevData.deliveryCost, true) : '')}
          ${detailStat('罚款', fmtWan(m.penalty || 0), prevData ? changeStr(m.penalty || 0, prevData.penalty || 0, true) : '', (m.penalty || 0) > 0 ? 'danger' : '')}
        </div>
      </div>
    </div>`;

    // ===== Section 2: UE诊断与根因 =====
    html += `<div class="section-card" id="secDetailDiagnosis">
      <div class="section-title section-title-collapsible" onclick="this.parentElement.classList.toggle('section-collapsed')">
        <i class="fas fa-stethoscope" style="margin-right:6px;color:var(--warning-dark, #d97706);"></i>UE诊断与根因
        <span class="section-toggle-icon">&#9660;</span>
      </div>
      <div class="section-body">
        ${renderRootCause(city.displayName, moduleName, m, anomalyLevel, prevData, anomalyResult)}
      </div>
    </div>`;

    // ===== Section 3: 补贴结构分析 =====
    try {
      const subsidyHtml = renderSubsidyBreakdown(m, city.displayName, moduleName, prevData);
      if (subsidyHtml && subsidyHtml.trim()) {
        html += `<div class="section-card" id="secDetailSubsidy">
          <div class="section-title section-title-collapsible" onclick="this.parentElement.classList.toggle('section-collapsed')">
            <i class="fas fa-hand-holding-usd" style="margin-right:6px;color:var(--info, #3b82f6);"></i>补贴结构分析
            <span class="section-toggle-icon">&#9660;</span>
          </div>
          <div class="section-body">
            ${subsidyHtml}
          </div>
        </div>`;
      }
    } catch(e) {
      // 补贴面板加载失败不影响其他内容
    }

    // ===== Section 4: 期度对比 =====
    if (hasComparison) {
      html += `<div class="section-card" id="secDetailCompare">
        <div class="section-title section-title-collapsible" onclick="this.parentElement.classList.toggle('section-collapsed')">
          <i class="fas fa-columns" style="margin-right:6px;color:var(--success);"></i>期度对比
          <span class="section-toggle-icon">&#9660;</span>
        </div>
        <div class="section-body">
          ${renderComparisonTable(m, prevData)}
        </div>
      </div>`;
    }

    // ===== Section 5: 品类拆分 =====
    html += `<div class="section-card" id="secDetailCategory">
      <div class="section-title section-title-collapsible" onclick="this.parentElement.classList.toggle('section-collapsed')">
        <i class="fas fa-layer-group" style="margin-right:6px;color:var(--purple, #8b5cf6);"></i>品类拆分
        <span class="section-toggle-icon">&#9660;</span>
      </div>
      <div class="section-body">
        ${renderCategoryBreakdown(city, moduleKey)}
      </div>
    </div>`;

    // ===== [P0新增] Section 6: 敏感度矩阵 =====
    try {
      var sensitivityHtml = renderSensitivityPanel(m);
      if (sensitivityHtml && sensitivityHtml.trim()) {
        html += `<div class="section-card" id="secDetailSensitivity">
          <div class="section-title section-title-collapsible" onclick="this.parentElement.classList.toggle('section-collapsed')">
            <i class="fas fa-sliders-h" style="margin-right:6px;color:var(--teal, #14b8a6);"></i>UE敏感度矩阵
            <span class="section-toggle-icon">&#9660;</span>
          </div>
          <div class="section-body">
            ${sensitivityHtml}
          </div>
        </div>`;
      }
    } catch(e) { console.warn('[Sensitivity]', e.message); }

    // ===== [P0新增] Section 7: 同比趋势分析 =====
    try {
      var yoyHtml = renderYoYPanel(m, cityName, moduleKey);
      if (yoyHtml && yoyHtml.trim() && yoyHtml.indexOf('需要至少') === -1) {
        html += `<div class="section-card" id="secDetailYoY">
          <div class="section-title section-title-collapsible" onclick="this.parentElement.classList.toggle('section-collapsed')">
            <i class="fas fa-chart-line" style="margin-right:6px;color:var(--info, #3b82f6);"></i>同比趋势分析
            <span class="section-toggle-icon">&#9660;</span>
          </div>
          <div class="section-body">
            ${yoyHtml}
          </div>
        </div>`;
      }
    } catch(e) { console.warn('[YoY]', e.message); }

    // ===== [P1新增] Section 8: What-If 场景模拟 =====
    try {
      var whatIfHtml = renderWhatIfPanel(m);
      if (whatIfHtml && whatIfHtml.trim()) {
        html += `<div class="section-card" id="secDetailWhatIf">
          <div class="section-title section-title-collapsible" onclick="this.parentElement.classList.toggle('section-collapsed')">
            <i class="fas fa-flask" style="margin-right:6px;color:var(--purple, #8b5cf6);"></i>What-If 场景模拟
            <span class="section-toggle-icon">&#9660;</span>
          </div>
          <div class="section-body">
            ${whatIfHtml}
          </div>
        </div>`;
      }
    } catch(e) { console.warn('[WhatIf]', e.message); }

    $('#detailContent').innerHTML = html;

    // 更新Section 1标题为城市名+模块名
    const metricsTitle = document.getElementById('secDetailMetricsCity');
    if (metricsTitle) {
      metricsTitle.textContent = `${city.displayName || cityName} - ${moduleName || moduleKey} 核心指标`;
    }
  }
  function detailStat(label, value, change, valueClass) {
    const cls = valueClass ? ` ${valueClass}` : '';
    const changeHtml = change ? `<div class="s-change ${change.dir}">${change.text}</div>` : '';
    return `
      <div class="detail-stat">
        <div class="s-label">${label}</div>
        <div class="s-value${cls}">${value}</div>
        ${changeHtml}
      </div>
    `;
  }
  function changeStr(current, prev, isWan, isUE) {
    if (prev === 0 && current === 0) return null;
    const diff = current - prev;
    const rate = prev !== 0 ? (diff / Math.abs(prev)) * 100 : 0;
    let displayDiff;
    if (isWan) displayDiff = (diff > 0 ? '+' : '') + fmtWan(diff);
    else if (isUE) displayDiff = (diff > 0 ? '+' : '') + safeFixed(diff, 2);
    else displayDiff = (diff > 0 ? '+' : '') + fmtInt(diff);
    const displayRate = safeFixed(rate, 2) + '%';
    // For UE and profit, lower is worse (negative change = red)
    // For others, context-dependent
    let dir;
    if (isUE) {
      dir = diff >= 0 ? 'up' : 'down';
    } else {
      dir = diff >= 0 ? 'up' : 'down';
    }
    return { text: `${displayDiff} (${displayRate})`, dir };
  }
  function renderRootCause(cityName, moduleName, m, level, prev, anomalyResult) {
    let v3TriggerHtml = '';
    let v3CrossHtml = '';

    const isAnomaly = level === 'danger' || level === 'warning';
    let html = `<div class="root-cause-card"><h4>根因分析</h4>`;
    html += `<div class="root-cause-formula">UE = 毛利 / 订单量 = ${fmtWan(m.profit)} / ${fmtInt(m.orders)} = ${fmtUE(m.ue)}元</div>`;
    v3TriggerHtml = '';
    v3CrossHtml = '';
    // [T5] 插入V3增强诊断面板
    html += v3TriggerHtml;
    html += v3CrossHtml;
    // [T5] 使用V3归因诊断(如果可用)
    var v3Diagnosis = getDiagnosisV2(anomalyResult, moduleName);
    // Generate conclusion
    // [T5] V3增强：6指标异常trigger详情
    v3TriggerHtml = '';
    if (anomalyResult && anomalyResult.triggers && anomalyResult.triggers.length > 0) {
      v3TriggerHtml += '<div class="v3-triggers-card">';
      v3TriggerHtml += '<div class="card-title">异常诊断 (' + anomalyResult.triggers.length + '项触发)</div>';
      for (const t of anomalyResult.triggers) {
        const sevClass = t.severity === 'danger' ? 'v3-trigger-danger' : 'v3-trigger-warning';
        const sevLabel = t.severity === 'danger' ? '严重' : '预警';
        const dirIcon = t.direction === 'below' ? '&#9660;' : t.direction === 'above' ? '&#9650;' : '&#8644;';
        let valDisplay = '';
        if (typeof t.value === 'number') {
          valDisplay = t.metric.includes('率') || t.metric.includes('比') ? (t.value * 100).toFixed(1) + '%' : t.value.toFixed(2);
        }
        v3TriggerHtml += '<div class="' + sevClass + '">';
        v3TriggerHtml += '<span class="v3-sev-badge ' + t.severity + '">' + sevLabel + '</span>';
        v3TriggerHtml += '<span class="v3-metric">' + t.metric + '</span>';
        v3TriggerHtml += '<span class="v3-dir">' + dirIcon + '</span>';
        v3TriggerHtml += '<span class="v3-val">' + valDisplay + '</span>';
        v3TriggerHtml += '<span class="v3-threshold">阈值: ' + (t.threshold || '-') + '</span>';
        v3TriggerHtml += '</div>';
      }
      // V3趋势预警
      if (anomalyResult.trendAlerts && anomalyResult.trendAlerts.length > 0) {
        for (const ta of anomalyResult.trendAlerts) {
          const taClass = ta.severity === 'danger' ? 'v3-trigger-danger' : 'v3-trigger-warning';
          v3TriggerHtml += '<div class="' + taClass + '">';
          v3TriggerHtml += '<span class="v3-sev-badge trend">' + (ta.severity === 'danger' ? '恶化' : '注意') + '</span>';
          v3TriggerHtml += '<span class="v3-metric">' + ta.metric + '趋势</span>';
          v3TriggerHtml += '<span class="v3-dir">' + (ta.direction === 'worsening' ? '&#9660;' : '&#8644;') + '</span>';
          v3TriggerHtml += '<span class="v3-val">' + ta.current.toFixed(2) + ' → 变化' + (ta.rate * 100).toFixed(1) + '%</span>';
          v3TriggerHtml += '</div>';
        }
      }
      // V3综合评分
      if (anomalyResult.score !== undefined) {
        const scoreClass = anomalyResult.score > 50 ? 'danger' : anomalyResult.score > 25 ? 'warning' : 'ok';
        v3TriggerHtml += '<div class="v3-score-bar">';
        v3TriggerHtml += '<span>综合风险分: <b class="' + scoreClass + '">' + anomalyResult.score + '/100</b></span>';
        v3TriggerHtml += '<div class="v3-score-track"><div class="v3-score-fill ' + scoreClass + '" style="width:' + Math.min(anomalyResult.score, 100) + '%"></div></div>';
        v3TriggerHtml += '</div>';
      }
      v3TriggerHtml += '</div>';
    }
    // [T5] V3交叉关联预警
    v3CrossHtml = '';
    if (anomalyResult && anomalyResult.crossAlerts && anomalyResult.crossAlerts.length > 0) {
      v3CrossHtml += '<div class="v3-cross-card">';
      v3CrossHtml += '<div class="card-title">交叉关联预警</div>';
      for (const ca of anomalyResult.crossAlerts) {
        const caClass = ca.severity === 'danger' ? 'v3-trigger-danger' : 'v3-trigger-warning';
        v3CrossHtml += '<div class="' + caClass + '">';
        v3CrossHtml += '<span class="v3-metric">' + ca.title + '</span>';
        v3CrossHtml += '<div class="v3-detail">' + (ca.detail || '') + '</div>';
        v3CrossHtml += '</div>';
      }
      v3CrossHtml += '</div>';
    }

    let conclusion = '';
    let conclusionClass = 'ok';
    if (m.ue < 0) {
      conclusionClass = 'danger';
      if (Math.abs(m.profit) > m.onlineRevenue * 0.05) {
        conclusion = `<strong>${cityName}${moduleName}</strong> UE亏损（${fmtUE(m.ue)}元），主因：毛利为负（${fmtWan(m.profit)}），亏损额占收入${fmtPct(Math.abs(m.profit)/m.onlineRevenue)}。补贴率${fmtPct(m.subsidyRatio)}${m.subsidyRatio > 0.35 ? '，补贴效率低下' : ''}。建议：降低代补投入或提升抽佣收入。`;
      } else {
        conclusion = `<strong>${cityName}${moduleName}</strong> UE亏损（${fmtUE(m.ue)}元），毛利微亏（${fmtWan(m.profit)}），但订单量正常（${fmtInt(m.orders)}）。补贴率${fmtPct(m.subsidyRatio)}。建议关注配送成本和平台成本。`;
      }
    } else if (m.ue < 0.3) {
      conclusionClass = 'warning';
      conclusion = `<strong>${cityName}${moduleName}</strong> UE偏低（${fmtUE(m.ue)}元），处于预警区间。补贴率${fmtPct(m.subsidyRatio)}${m.subsidyRatio > 0.30 ? '偏高' : '正常'}。${prev ? '较上期' + (m.ue > prev.ue ? '有所改善' : '有所下滑') + '。' : ''}建议优化补贴策略。`;
    } else {
      conclusion = `<strong>${cityName}${moduleName}</strong> 运营健康，UE ${fmtUE(m.ue)}元，补贴率${fmtPct(m.subsidyRatio)}。${prev ? '较上期' + (m.ue > prev.ue ? '上升' : '下降') + safeFixed(m.ue - prev.ue, 2) + '元。' : ''}`;
    }
    html += `<div class="root-cause-conclusion ${conclusionClass}">${conclusion}</div>`;
    html += '</div>';
    return html;
  }
  function renderComparisonTable(current, prev) {
    const rows = [
      { name: '订单量', cur: current.orders, prev: prev.orders, fmt: fmtInt },
      { name: '收入', cur: current.onlineRevenue, prev: prev.onlineRevenue, fmt: fmtWan },
      { name: '毛利', cur: current.profit, prev: prev.profit, fmt: fmtWan },
      { name: '单均UE', cur: current.ue, prev: prev.ue, fmt: v => fmtUE(v) + '元' },
      { name: '补贴率', cur: current.subsidyRatio, prev: prev.subsidyRatio, fmt: fmtPct },
      { name: 'B端代补', cur: current.subsidyB || 0, prev: prev.subsidyB || 0, fmt: fmtWan },
      { name: 'C端代补', cur: current.subsidyC || 0, prev: prev.subsidyC || 0, fmt: fmtWan },
      { name: '专项补贴', cur: current.specialSubsidy || 0, prev: prev.specialSubsidy || 0, fmt: fmtWan },
      { name: '配送成本', cur: current.deliveryCost, prev: prev.deliveryCost, fmt: fmtWan },
      { name: '加盟邮资', cur: current.franchiseDelivery || 0, prev: prev.franchiseDelivery || 0, fmt: fmtWan },
      { name: '普众邮资', cur: current.crowdDelivery || 0, prev: prev.crowdDelivery || 0, fmt: fmtWan },
      { name: '悦跑邮资', cur: current.yuepaoDelivery || 0, prev: prev.yuepaoDelivery || 0, fmt: fmtWan },
      { name: '天气补贴', cur: current.weatherSubsidy || 0, prev: prev.weatherSubsidy || 0, fmt: fmtWan },
      { name: '罚款', cur: current.penalty || 0, prev: prev.penalty || 0, fmt: fmtWan },
      { name: '平台成本', cur: current.platformCost, prev: prev.platformCost, fmt: fmtWan },
    ];
    let html = `<div class="comparison-card">
      <div class="card-title">本期 vs 上期对比</div>
      <table class="comparison-table data-table" role="table" aria-label="财务数据表"><thead><tr>
        <th>指标</th><th>本期</th><th>上期</th><th>变化</th><th>变化率</th>
      </tr></thead><tbody>`;
    for (const r of rows) {
      const diff = r.cur - r.prev;
      const rate = r.prev !== 0 ? (diff / Math.abs(r.prev)) * 100 : (r.cur !== 0 ? 100 : 0);
      const cls = diff > 0 ? 'val-up' : diff < 0 ? 'val-down' : '';
      const arrow = diff > 0 ? '&#9650;' : diff < 0 ? '&#9660;' : '-';
      html += `<tr>
        <td>${r.name}</td>
        <td>${r.fmt(r.cur)}</td>
        <td>${r.fmt(r.prev)}</td>
        <td class="${cls}">${diff > 0 ? '+' : ''}${r.fmt(diff)}</td>
        <td class="${cls}">${arrow} ${safeFixed(rate, 2)}%</td>
      </tr>`;
    }
    html += '</tbody></table></div>';
    return html;
  }
  function getPrevPeriodData(cityName, moduleKey) {
    if (!state.currentData) return null;
    const allData = DataStore.loadAll();
    const dates = Object.keys(allData).sort().reverse();
    const currentIdx = dates.indexOf(state.currentData.date);
    if (currentIdx < 0 || currentIdx >= dates.length - 1) return null;
    const prevDate = dates[currentIdx + 1];
    const prevFile = allData[prevDate];
    // 支持KA/城商维度：优先从 merchantData 中获取
    const merchantKey = state.currentMerchant || 'all';
    let prevCities;
    if (prevFile.merchantData && prevFile.merchantData[merchantKey]) {
      prevCities = prevFile.merchantData[merchantKey].cities;
    } else {
      prevCities = prevFile.cities || (prevFile.currentData && prevFile.currentData.cities) || [];
    }
    const prevCity = prevCities.find(c => c.name === cityName);
    if (!prevCity) return null;
    return prevCity.modules[moduleKey] || null;
  }
  function renderCategoryBreakdown(city, moduleKey) {
    // Show breakdown across all 4 modules for this city
    const moduleName = city.modules[moduleKey]?.moduleName || CONFIG.BLOCKS.find(b => b.key === moduleKey)?.name || '';
    let html = `<div class="comparison-card ft-mt24">
      <div class="card-title">${city.displayName} - 各模块数据对比</div>
      <table class="comparison-table data-table" role="table" aria-label="财务数据表"><thead><tr>
        <th>模块</th><th>订单量</th><th>收入</th><th>代补</th><th>补贴率</th><th>毛利</th><th>UE</th>
      </tr></thead><tbody>`;
    for (const block of CONFIG.BLOCKS) {
      const m = city.modules[block.key];
      if (!m) continue;
      const isActive = block.key === moduleKey;
      const level = getAnomalyLevelV2(m).level;
      const ueClass = level === 'danger' ? 'val-down' : level === 'warning' ? '' : 'val-up';
      html += `<tr${isActive ? ' class="ft-detail-pri"' : ''}>
        <td>${block.name}</td>
        <td>${fmtInt(m.orders)}</td>
        <td>${fmtWan(m.onlineRevenue)}</td>
        <td>${fmtWan(m.subsidyTotal)}</td>
        <td>${fmtPct(m.subsidyRatio)}</td>
        <td class="${m.profit < 0 ? 'val-down' : 'val-up'}">${fmtWan(m.profit)}</td>
        <td class="${ueClass}">${fmtUE(m.ue)}元</td>
      </tr>`;
    }
    // Totals
    let tO=0, tR=0, tS=0, tP=0;
    for (const block of CONFIG.BLOCKS) {
      const m = city.modules[block.key];
      if (m) { tO += m.orders; tR += m.onlineRevenue; tS += m.subsidyTotal; tP += m.profit; }
    }
    html += `<tr class="ft-detail-gray">
      <td>合计</td>
      <td>${fmtInt(tO)}</td>
      <td>${fmtWan(tR)}</td>
      <td>${fmtWan(tS)}</td>
      <td>${fmtPct(tS/tR)}</td>
      <td class="${tP < 0 ? 'val-down' : 'val-up'}">${fmtWan(tP)}</td>
      <td>${fmtUE(tP/tO)}元</td>
    </tr>`;
    html += '</tbody></table></div>';
    return html;
  }

export { updateDetailSelectors, renderDetailTab, renderTrendCompare, getPrevPeriodData, detailStat, changeStr, renderRootCause, renderComparisonTable, renderCategoryBreakdown };

// cost.js - ES Module
import { state, $, safeFixed, CHART_COLORS, DataStore } from './core';
import { displayName, fmtWan, fmtInt } from './utils';
import { renderCostCharts, renderCapacityChart, renderCapacityTrendChart } from './charts';
import { makeTableSortable } from './export';
import { getPrevPeriodData } from './detail';


    // ===== v11: COST STRUCTURE =====
  let costCity = '总商', costModule = 'all';

  function initCostSelectors() {
    const cs = document.getElementById('costCity');
    const cm = document.getElementById('costModule');
    if (!cs || !cm) return;
    if (!state.currentData) return;
    cs.innerHTML = state.currentData.cities.map(c =>
      '<option value="' + c.name + '">' + c.displayName + '</option>'
    ).join('');
    cs.value = costCity;
    cs.onchange = function() { costCity = this.value; renderCostStructure(); renderKACityCompare(); renderCityRatio(); renderCapacity(); };
    cm.value = costModule;
    cm.onchange = function() { costModule = this.value; renderCostStructure(); renderKACityCompare(); renderCityRatio(); renderCapacity(); };
  }

  


  // ===== V11 NEW: KA城商拆分 =====
  
  /**
   * V11增强: KA对比单元格颜色分级
   * UE>3好 / 0~3中 / <0差; 利润率>5%好 / 0~5%中 / <0差; 补贴率<8%好 / 8~15%中 / >15%差
   */
  function getKACellClass(key, val) {
        if (val == null) return '';
        // UE: >3好, >0中, <=0差
        if (key === 'ue') return val > 3 ? 'good' : val > 0 ? 'warn' : 'bad';
        // 利润率: >5%好, >0中, <=0差
        if (key === 'profitRate') return val > 0.05 ? 'good' : val > 0 ? 'warn' : 'bad';
        // 补贴率: <8%好, <15%中, >=15%差(越低越好)
        if (key === 'subsidyRatio') return val > 0.15 ? 'bad' : val > 0.08 ? 'warn' : 'good';
        // 配送成本率: <5%好, <8%中, >=8%差(越低越好)
        if (key === 'deliveryCostRate') return val > 0.08 ? 'bad' : val > 0.05 ? 'warn' : 'good';
        // 订单量/GMV/收入/毛利/抽佣: 仅做非零标色
        if (['orders', 'gmvAmount', 'onlineRevenue', 'profit', 'commission'].includes(key)) {
          return val > 0 ? 'good' : val === 0 ? '' : 'bad';
        }
        return '';
      }

function renderKACityCompare() {
    var el = document.getElementById('kaCityCompare');
    if (!el) return;
    var allData = state.merchantData;
    if (!allData.all || !allData.ka || !allData.city) {
      el.innerHTML = '<p class="ft-c-gray ft-fs12 ft-ta-center ft-pd20">需要上传包含KA商家和城市商家sheet的Excel文件</p>';
      return;
    }
    var costCity = document.getElementById('costCity') ? document.getElementById('costCity').value : null;
    var costModule = document.getElementById('costModule') ? document.getElementById('costModule').value : 'all';
    var allCities = allData.all.cities;
    var kaCities = allData.ka.cities;
    var cityCities = allData.city.cities;

    // V11增强: 构建KA和城商映射(含displayName)
    var kaMap = {};
    kaCities.forEach(function(c) { kaMap[c.displayName || c.name] = c; });
    var cityMap = {};
    cityCities.forEach(function(c) { cityMap[c.displayName || c.name] = c; });

    var cityList = (costCity && costCity !== '总商') ? [costCity] : allCities.filter(function(c) { return c.name !== '总商'; }).map(function(c) { return c.displayName || c.name; });
    var modKey = costModule || 'all';

    // V11增强: 扩展指标(含利润率、抽佣)
    var metrics = [
      { key: 'orders', label: '订单量', fmt: function(v) { return v.toLocaleString(); } },
      { key: 'gmvAmount', label: 'GMV', fmt: fmtWan },
      { key: 'onlineRevenue', label: '收入', fmt: fmtWan },
      { key: 'profit', label: '毛利', fmt: fmtWan },
      { key: 'ue', label: 'UE', fmt: function(v) { return v.toFixed(2) + '元'; } },
      { key: 'profitRate', label: '利润率', fmt: function(v) { return (v*100).toFixed(1) + '%'; } },
      { key: 'subsidyRatio', label: '补贴率', fmt: function(v) { return (v*100).toFixed(1) + '%'; } },
      { key: 'deliveryCostRate', label: '配送成本率', fmt: function(v) { return (v*100).toFixed(1) + '%'; } },
      { key: 'commission', label: '抽佣', fmt: fmtWan }
    ];

    var totals = { ka: { orders: 0, ue: 0, profit: 0 }, city: { orders: 0, ue: 0, profit: 0 } };

    var html = '<div class="ka-city-compare-wrap">';
    html += '<div class="ka-city-legend"><span class="legend-ka">KA商家</span><span class="legend-city">城市商家</span></div>';
    html += '<div class="ka-city-table-wrap"><table class="ka-city-table" role="table" aria-label="KA城商对比">';
    html += '<thead><tr><th rowspan="2">城市</th>';
    html += '<th colspan="' + metrics.length + '" class="th-ka">KA</th>';
    html += '<th colspan="' + metrics.length + '" class="th-city">城商</th>';
    html += '<th colspan="2">差异</th></tr><tr>';
    for (var mi = 0; mi < metrics.length; mi++) html += '<th class="th-ka">' + metrics[mi].label + '</th>';
    for (var mi = 0; mi < metrics.length; mi++) html += '<th class="th-city">' + metrics[mi].label + '</th>';
    html += '<th>UE差</th><th>利润率差</th></tr></thead><tbody>';

    var allNames = cityList.slice().sort();
    for (var ni = 0; ni < allNames.length; ni++) {
      var name = allNames[ni];
      var kc = kaMap[name], cc = cityMap[name];
      var km = kc ? (kc.modules[modKey] || kc.modules['all'] || {}) : {};
      var cm = cc ? (cc.modules[modKey] || cc.modules['all'] || {}) : {};
      var hasData = kc || cc;
      if (kc) { totals.ka.orders += km.orders || 0; totals.ka.ue += km.ue || 0; totals.ka.profit += km.profit || 0; }
      if (cc) { totals.city.orders += cm.orders || 0; totals.city.ue += cm.ue || 0; totals.city.profit += cm.profit || 0; }

      html += '<tr' + (!hasData ? ' class="no-data"' : '') + '><td class="city-name">' + name + '</td>';
      for (var mi = 0; mi < metrics.length; mi++) {
        var m = metrics[mi], val = km[m.key];
        var display = kc ? (val != null ? m.fmt(val) : '-') : '-';
        var cls = getKACellClass(m.key, val);
        html += '<td class="th-ka ' + cls + '">' + display + '</td>';
      }
      for (var mi = 0; mi < metrics.length; mi++) {
        var m = metrics[mi], val = cm[m.key];
        var display = cc ? (val != null ? m.fmt(val) : '-') : '-';
        html += '<td class="th-city ' + getKACellClass(m.key, val) + '">' + display + '</td>';
      }
      var ueDiff = (km.ue || 0) - (cm.ue || 0);
      var prDiff = ((km.profitRate || 0) - (cm.profitRate || 0)) * 100;
      html += '<td class="diff ' + (ueDiff >= 0 ? 'up' : 'down') + '">' + (hasData && kc && cc ? (ueDiff >= 0 ? '+' : '') + ueDiff.toFixed(2) + '元' : '-') + '</td>';
      html += '<td class="diff ' + (prDiff >= 0 ? 'up' : 'down') + '">' + (hasData && kc && cc ? (prDiff >= 0 ? '+' : '') + prDiff.toFixed(1) + '%' : '-') + '</td>';
      html += '</tr>';
    }

    // 合计行: 订单量=合计, 率值=加权平均, 其他=合计
      var kaCount = 0, cityCount = 0, kaSums = {}, citySums = {};
      metrics.forEach(function(m) { kaSums[m.key] = 0; citySums[m.key] = 0; });
      for (var ni2 = 0; ni2 < allNames.length; ni2++) {
        var kc2 = kaMap[allNames[ni2]], cc2 = cityMap[allNames[ni2]];
        if (kc2) { kaCount++; var km2 = kc2.modules[modKey] || kc2.modules['all'] || {}; metrics.forEach(function(m2) { kaSums[m2.key] += km2[m2.key] || 0; }); }
        if (cc2) { cityCount++; var cm2 = cc2.modules[modKey] || cc2.modules['all'] || {}; metrics.forEach(function(m2) { citySums[m2.key] += cm2[m2.key] || 0; }); }
      }
      html += '<tr class="total-row"><td>合计/平均</td>';
      for (var mi = 0; mi < metrics.length; mi++) {
        var m = metrics[mi];
        var isRate = ['ue','profitRate','subsidyRatio','deliveryCostRate'].indexOf(m.key) >= 0;
        var val_ka = isRate ? (kaCount > 0 ? kaSums[m.key] / kaCount : 0) : kaSums[m.key];
        html += '<td class="th-ka ' + getKACellClass(m.key, val_ka) + '">' + (kaCount > 0 ? m.fmt(val_ka) : '-') + '</td>';
      }
      for (var mi = 0; mi < metrics.length; mi++) {
        var m = metrics[mi];
        var isRate = ['ue','profitRate','subsidyRatio','deliveryCostRate'].indexOf(m.key) >= 0;
        var val_city = isRate ? (cityCount > 0 ? citySums[m.key] / cityCount : 0) : citySums[m.key];
        html += '<td class="th-city ' + getKACellClass(m.key, val_city) + '">' + (cityCount > 0 ? m.fmt(val_city) : '-') + '</td>';
      }
      var totalUEDiff = (kaCount > 0 ? kaSums.ue / kaCount : 0) - (cityCount > 0 ? citySums.ue / cityCount : 0);
      var totalPRDiff = ((kaCount > 0 ? kaSums.profitRate / kaCount : 0) - (cityCount > 0 ? citySums.profitRate / cityCount : 0)) * 100;
      html += '<td class="diff ' + (totalUEDiff >= 0 ? 'up' : 'down') + '">' + (totalUEDiff >= 0 ? '+' : '') + totalUEDiff.toFixed(2) + '元</td>';
      html += '<td class="diff ' + (totalPRDiff >= 0 ? 'up' : 'down') + '">' + (totalPRDiff >= 0 ? '+' : '') + totalPRDiff.toFixed(1) + '%</td></tr>';
    html += '</tbody></table></div></div>';
    el.innerHTML = html;
    makeTableSortable(el.querySelector('.ka-city-table'));
  }

  function initKACityCompare() {
    var el = document.getElementById('kaCityCompare');
    if (!el) return;
    renderKACityCompare();
  }



  // ===== V11 NEW: 城商占比 =====
  function renderCityRatio() {
    var el = document.getElementById('cityRatio');
    if (!el) return;
    var allData = state.merchantData;
    if (!allData.all || !allData.city) {
      el.innerHTML = '<p class="ft-c-gray ft-fs12 ft-ta-center ft-pd20">需要上传包含城市商家sheet的Excel文件</p>';
      return;
    }
    var costModule = document.getElementById('costModule') ? document.getElementById('costModule').value : 'all';
    var allCities = allData.all.cities.filter(function(c){return c.name!=='总商';});
    var cityCities = allData.city.cities.filter(function(c){return c.name!=='总商';});
    var allTotal = {orders:0,gmvAmount:0,onlineRevenue:0,profit:0,deliveryCost:0,subsidyTotal:0,platformCost:0};
    var cityTotal = {orders:0,gmvAmount:0,onlineRevenue:0,profit:0,deliveryCost:0,subsidyTotal:0,platformCost:0};
    allCities.forEach(function(c){var m=c.modules[costModule]||c.modules['all'];if(!m)return;allTotal.orders+=m.orders||0;allTotal.gmvAmount+=m.gmvAmount||0;allTotal.onlineRevenue+=m.onlineRevenue||0;allTotal.profit+=m.profit||0;allTotal.deliveryCost+=m.deliveryCost||0;allTotal.subsidyTotal+=m.subsidyTotal||0;allTotal.platformCost+=m.platformCost||0;});
    cityCities.forEach(function(c){var m=c.modules[costModule]||c.modules['all'];if(!m)return;cityTotal.orders+=m.orders||0;cityTotal.gmvAmount+=m.gmvAmount||0;cityTotal.onlineRevenue+=m.onlineRevenue||0;cityTotal.profit+=m.profit||0;cityTotal.deliveryCost+=m.deliveryCost||0;cityTotal.subsidyTotal+=m.subsidyTotal||0;cityTotal.platformCost+=m.platformCost||0;});
    var ratioItems = [
      {label:'订单量',city:cityTotal.orders,all:allTotal.orders},
      {label:'GMV',city:cityTotal.gmvAmount,all:allTotal.gmvAmount},
      {label:'收入',city:cityTotal.onlineRevenue,all:allTotal.onlineRevenue},
      {label:'毛利',city:cityTotal.profit,all:allTotal.profit},
      {label:'配送成本',city:cityTotal.deliveryCost,all:allTotal.deliveryCost},
      {label:'补贴总额',city:cityTotal.subsidyTotal,all:allTotal.subsidyTotal},
      {label:'平台成本',city:cityTotal.platformCost,all:allTotal.platformCost},
    ];
    var html = '';
    var maxRatio = Math.max.apply(null, ratioItems.map(function(it){return it.all>0?it.city/it.all:0;}).concat([0.01]));
    ratioItems.forEach(function(it){
      var ratio = it.all > 0 ? it.city / it.all : 0;
      var barW = (ratio / maxRatio * 100);
      var ratioPct = safeFixed(ratio * 100, 1);
      html += '<div class="cost-bar-row"><div class="cost-bar-label">'+it.label+'</div><div class="cost-bar-wrap"><div class="cost-bar-fill city-ratio-city" style="width:'+barW+'%"></div></div><div class="cost-bar-value">'+fmtWan(it.city)+'</div><div class="cost-bar-pct">'+ratioPct+'%</div></div>';
    });
    html += '<div class="ft-mt8 ft-bt ft-fs12 ft-c-sec">';
    html += '<div>城商订单: '+fmtInt(cityTotal.orders)+' / '+fmtInt(allTotal.orders)+'</div>';
    html += '<div>城商收入: '+fmtWan(cityTotal.onlineRevenue)+' / '+fmtWan(allTotal.onlineRevenue)+'</div>';
    html += '<div>城商毛利: '+fmtWan(cityTotal.profit)+' / '+fmtWan(allTotal.profit)+'</div></div>';
    el.innerHTML = html;
  }

  // ===== V11 NEW: 运力数据 =====
  function renderCapacity() {
    var el = document.getElementById('capacityData');
    if (!el || !state.currentData) return;
    var costCity = document.getElementById('costCity') ? document.getElementById('costCity').value : null;
    var costModule = document.getElementById('costModule') ? document.getElementById('costModule').value : 'all';
    var city = state.currentData.cities.find(function(c){return c.name===costCity;});
    if (!city) return;
    var mod = city.modules[costModule];
    if (!mod) return;

    // 多期数据获取(与T4/T3架构一致)
    var allData = DataStore.loadAll();
    var dates = Object.keys(allData).sort();
    var prevMod = null;
    var prevDate = null;
    if (dates.length >= 2) {
      prevDate = dates[dates.length - 2];
      var prevEntry = allData[prevDate];
      if (prevEntry) {
        var prevCities = (prevEntry.currentData || {}).cities || [];
        var prevCityObj = prevCities.find(function(c){return c.name===costCity;});
        if (prevCityObj) prevMod = (prevCityObj.modules || {})[costModule] || null;
      }
    }

    var channels = [
      {label:'加盟承接', ordersKey:'franchiseDeliverOrders', deliveryKey:'franchiseDelivery'},
      {label:'普众众包', ordersKey:'crowdOrders', deliveryKey:'crowdDelivery'},
      {label:'悦跑', ordersKey:'yuepaoOrders', deliveryKey:'yuepaoDelivery'},
    ];

    var curItems = channels.map(function(ch){
      return {label:ch.label, orders:mod[ch.ordersKey]||0, delivery:mod[ch.deliveryKey]||0};
    });
    var totalOrders = curItems.reduce(function(s,it){return s+it.orders;},0);
    var totalDelivery = curItems.reduce(function(s,it){return s+it.delivery;},0);
    var maxOrders = Math.max.apply(null, curItems.map(function(it){return it.orders;}).concat([1]));

    var prevItems = null;
    var prevTotal = 0;
    if (prevMod) {
      prevItems = channels.map(function(ch){
        return {label:ch.label, orders:prevMod[ch.ordersKey]||0, delivery:prevMod[ch.deliveryKey]||0};
      });
      prevTotal = prevItems.reduce(function(s,it){return s+it.orders;},0);
    }

    var html = '';

    // 多期对比头部
    if (prevItems && prevTotal > 0) {
      var orderChange = totalOrders - prevTotal;
      var orderPct = prevTotal > 0 ? ((orderChange / prevTotal) * 100).toFixed(1) : '0.0';
      var changeClass = orderChange >= 0 ? 'change-up' : 'change-down';
      var changeIcon = orderChange >= 0 ? '\u2191' : '\u2193';
      html += '<div class="ft-cost-header">';
      html += '<span style="color:var(--text-secondary)">运力对比 <span style="color:var(--text-primary)">' + prevDate + ' \u2192 \u5f53\u524d</span></span>';
      html += '<span class="' + changeClass + '" style="font-weight:600;">' + changeIcon + ' ' + Math.abs(orderChange).toLocaleString() + '单 (' + (orderChange>=0?'+':'') + orderPct + '%)</span>';
      html += '</div>';
    }

    // 条形图
    curItems.forEach(function(it){
      var barW = (it.orders / maxOrders * 100);
      var ratio = totalOrders > 0 ? safeFixed(it.orders / totalOrders * 100, 1) : '0.0';
      html += '<div class="cost-bar-row"><div class="cost-bar-label">'+it.label+'</div><div class="cost-bar-wrap"><div class="cost-bar-fill capacity" style="width:'+barW+'%"></div></div><div class="cost-bar-value">'+fmtInt(it.orders)+'单</div><div class="cost-bar-pct">'+ratio+'%</div></div>';
    });
    html += '<div class="cost-total"><span>总承接单量</span><span class="amount">'+fmtInt(totalOrders)+'单</span></div>';

    // 数据表格(含环比)
    html += '<table class="capacity-table data-table" ><thead><tr><th>渠道</th><th>承接单量</th><th>邮资成本</th><th>单均邮资</th><th>承接占比</th>';
    if (prevItems) html += '<th>环比变化</th>';
    html += '</tr></thead><tbody>';
    curItems.forEach(function(it, idx2){
      var avgPostage = it.orders > 0 ? (it.delivery / it.orders) : 0;
      var ratio = totalOrders > 0 ? safeFixed(it.orders / totalOrders * 100, 1) : '0.0';
      html += '<tr><td >'+it.label+'</td><td>'+fmtInt(it.orders)+'</td><td>'+fmtWan(it.delivery)+'</td><td>'+safeFixed(avgPostage, 2)+'元</td><td>'+ratio+'%</td>';
      if (prevItems) {
        var prev2 = prevItems[idx2] || {orders:0};
        var change = it.orders - prev2.orders;
        var pct = prev2.orders > 0 ? ((change / prev2.orders) * 100).toFixed(1) : '-';
        var cls = change > 0 ? 'change-up' : (change < 0 ? 'change-down' : '');
        var icon = change > 0 ? '\u2191' : (change < 0 ? '\u2193' : '-');
        html += '<td class="'+cls+'" style="font-size:11px;">'+icon+' '+Math.abs(change).toLocaleString()+' ('+pct+'%)</td>';
      }
      html += '</tr>';
    });
    var avgAll = totalOrders > 0 ? safeFixed(totalDelivery / totalOrders, 2) : '0.00';
    html += '<tr style="font-weight:600;border-top:2px solid var(--gray-light);"><td>合计</td><td>'+fmtInt(totalOrders)+'</td><td>'+fmtWan(totalDelivery)+'</td><td>'+avgAll+'元</td><td>100%</td>';
    if (prevItems) {
      var change = totalOrders - prevTotal;
      var pct = prevTotal > 0 ? ((change / prevTotal) * 100).toFixed(1) : '-';
      var cls = change > 0 ? 'change-up' : (change < 0 ? 'change-down' : '');
      var icon = change > 0 ? '\u2191' : (change < 0 ? '\u2193' : '-');
      html += '<td class="'+cls+'" style="font-size:11px;">'+icon+' '+Math.abs(change).toLocaleString()+' ('+pct+'%)</td>';
    }
    html += '</tr></tbody></table>';

    if (mod.weatherSubsidy && mod.weatherSubsidy > 0) {
      html += '<div style="margin-top:8px;font-size:12px;color:var(--text-secondary);">天气补贴: '+fmtWan(mod.weatherSubsidy)+'</div>';
    }
    el.innerHTML = html;

    // T12运力图表(订单量+单均邮资)
    try {
      var capData = curItems.map(function(it) {
        return {
          name: it.label,
          orders: it.orders,
          avgPostage: it.orders > 0 ? (it.delivery / it.orders) : 0
        };
      });
      renderCapacityChart(capData);
    } catch(e) { console.warn('[T12 CapacityChart]', e.message); }

    // T12运力趋势图(多期三渠道订单量)
    try {
      if (dates.length >= 2) {
        var trendData = dates.slice(-Math.min(dates.length, 8)).map(function(dt) {
          var entry = allData[dt];
          if (!entry || !entry.currentData) return null;
          var c = (entry.currentData.cities || []).find(function(c){return c.name===costCity;});
          if (!c) return null;
          var m = (c.modules || {})[costModule] || {};
          return {
            date: dt,
            franchiseOrders: m.franchiseDeliverOrders || 0,
            crowdOrders: m.crowdOrders || 0,
            yuepaoOrders: m.yuepaoOrders || 0,
            totalOrders: (m.franchiseDeliverOrders||0) + (m.crowdOrders||0) + (m.yuepaoOrders||0)
          };
        }).filter(Boolean);
        renderCapacityTrendChart(trendData);
      }
    } catch(e) { console.warn('[T12 CapacityTrendChart]', e.message); }
  }


  function renderCostStructure() {
    if (!state.currentData) return;
    initCostSelectors();
    const city = state.currentData.cities.find(c => c.name === costCity);
    if (!city) return;
    const mod = city.modules[costModule];
    if (!mod) return;

    // 收入结构（拆分抽佣和配送费）
    const incomeItems = [
      { label: '加盟抽佣', value: mod.franchiseCommission || 0 },
      { label: '自配抽佣', value: mod.selfCommission || 0 },
      { label: '企客抽佣', value: mod.enterpriseCommission || 0 },
      { label: '加盟配送费', value: mod.franchiseDeliveryFee || 0 },
      { label: '二次配送费', value: mod.secondDeliveryFee || 0 },
      { label: '企客配送费', value: mod.enterpriseDeliveryFee || 0 },
      { label: '急送配送费', value: mod.urgentDeliveryFee || 0 },
      { label: '其他收入', value: mod.otherRevenue || 0 }
    ];
    renderCostBars('costIncome', incomeItems, mod.onlineRevenue, 'income');

    // 支出结构（总览）
    const expenseItems = [
      { label: '配送成本', value: mod.deliveryCost },
      { label: '代补', value: mod.subsidyTotal },
      { label: '平台成本', value: mod.platformCost },
      { label: '固定成本', value: mod.fixedCost },
      { label: '附加成本', value: mod.additionalCost },
      { label: '其他成本', value: mod.otherCost || 0 }
    ];
    renderCostBars('costExpense', expenseItems, (mod.onlineExpense || 0) + (mod.offlineExpense || 0), 'expense');

    // 补贴拆分
    const subsidyItems = [
      { label: 'B端代补', value: mod.subsidyB || 0 },
      { label: 'C端代补', value: mod.subsidyC || 0 },
      { label: '账单差额', value: mod.subsidyDiff || 0 }
    ];
    if (costModule === 'group') {
      subsidyItems.push(
        { label: '拼单补贴', value: mod.pinDanSubsidy || 0 },
        { label: '拼好饭补贴', value: mod.pinHaoFanSubsidy || 0 }
      );
    } else {
      subsidyItems.push(
        { label: '专项补贴', value: mod.specialSubsidy || 0 }
      );
    }
    renderCostBars('costSubsidy', subsidyItems, mod.subsidyTotal, 'subsidy');

    // 配送成本拆分（活动花费已含在邮资中，不重复计算）
    const deliveryItems = [
      { label: '加盟邮资', value: mod.franchiseDelivery || 0 },
      { label: '普众众包邮资', value: mod.crowdDelivery || 0 },
      { label: '悦跑邮资', value: mod.yuepaoDelivery || 0 },
      { label: '天气补贴', value: mod.weatherSubsidy || 0 }
    ];
    renderCostBars('costDelivery', deliveryItems, mod.deliveryCost, 'delivery');

    // 平台成本拆分
    const platformItems = [
      { label: '平台抽佣', value: mod.platformCommissionCost || 0 },
      { label: '售后赔付', value: mod.afterSaleCost || 0 },
      { label: '关爱基金', value: mod.careFund || 0 },
      { label: '保险费用', value: mod.insuranceCost || 0 },
      { label: '竞价', value: mod.biddingCost || 0 },
      { label: '罚款', value: mod.penalty || 0 }
    ];
    renderCostBars('costPlatform', platformItems, mod.platformCost, 'platform');

    // 固定/附加成本拆分
    const fixedItems = [
      { label: '办公室房租', value: mod.officeRent || 0 },
      { label: '业务团队', value: mod.teamCost || 0 },
      { label: '三方服务费', value: mod.thirdPartyServiceCost || 0 },
      { label: '社保', value: mod.socialInsurance || 0 },
      { label: '税', value: mod.taxCost || 0 },
      { label: '水电物料', value: mod.utilityCost || 0 },
      { label: '差旅招待', value: mod.travelCost || 0 }
    ];
    const fixedTotal = (mod.fixedCost || 0) + (mod.additionalCost || 0);
    renderCostBars('costFixedAdditional', fixedItems, fixedTotal, 'fixed');

    renderEfficiencyCards(mod);
    renderCostCompare();
  
    // V13: 触发成本结构图表
    try {
      var filtered = window.getFilteredCities();
      var el = document.getElementById('costModule');
      if (filtered.length > 0 && el) {
        renderCostCharts(filtered, el.value || 'all');
      }
    } catch(e) { console.warn('[V13 Chart]', e.message); }
}

  function renderCostBars(containerId, items, total, type) {
    const el = document.getElementById(containerId);
    if (!el) return;
    let html = '';
    const nonZero = items.filter(it => it.value > 0);
    const itemsSum = nonZero.reduce((s, it) => s + it.value, 0);
    const maxVal = Math.max(...nonZero.map(it => it.value), 1);
    // 占比分母：用各项加总和汇总值中较大的那个，避免超100%
    const pctBase = Math.max(itemsSum, total || 0, 1);
    nonZero.forEach(it => {
      const pct = (it.value / pctBase * 100);
      const barW = (it.value / maxVal * 100);
      html += '<div class="cost-bar-row">' +
        '<div class="cost-bar-label">' + it.label + '</div>' +
        '<div class="cost-bar-wrap"><div class="cost-bar-fill ' + type + '" style="width:' + barW + '%"></div></div>' +
        '<div class="cost-bar-value">' + fmtWan(it.value) + '</div>' +
        '<div class="cost-bar-pct">' + safeFixed(pct, 2) + '%</div></div>';
    });
    // 合计行：显示各项加总，若与汇总值有差异则额外标注
    if (Math.abs(itemsSum - total) > 1) {
      const diff = itemsSum - total;
      const diffLabel = diff > 0 ? '（汇总差 +' + fmtWan(diff) + '）' : '（汇总差 ' + fmtWan(diff) + '）';
      html += '<div class="cost-total"><span>拆分加总</span><span class="amount">' + fmtWan(itemsSum) + '</span></div>';
      html += '<div class="cost-total" ><span>账单汇总' + diffLabel + '</span><span class="amount">' + fmtWan(total) + '</span></div>';
    } else {
      html += '<div class="cost-total"><span>合计</span><span class="amount">' + fmtWan(total) + '</span></div>';
    }
    el.innerHTML = html;
  }

  function renderEfficiencyCards(mod) {
    const el = document.getElementById('effCards');
    if (!el) return;
    // P0: Compact summary bar instead of 9 separate cards
    const items = [
      { label: '单均UE', value: safeFixed(mod.ue, 2) + '元', cls: mod.ue < 0 ? 'cost-summary-danger' : '' },
      { label: '单均收入', value: safeFixed(mod.avgRevenuePerOrder, 2) + '元' },
      { label: '单均成本', value: safeFixed(mod.avgCostPerOrder, 2) + '元' },
      { label: '配送成本率', value: safeFixed(mod.deliveryCostRate * 100, 2) + '%', cls: mod.deliveryCostRate > 0.40 ? 'cost-summary-danger' : '' },
      { label: '补贴率', value: safeFixed((mod.subsidyRateTotal !== undefined ? mod.subsidyRateTotal : mod.subsidyRatio) * 100, 2) + '%', cls: (mod.subsidyRateTotal !== undefined ? mod.subsidyRateTotal : mod.subsidyRatio) > 0.10 ? 'cost-summary-danger' : '' },
      { label: 'B端代补率', value: safeFixed(mod.subsidyRateB * 100, 2) + '%' },
      { label: 'C端代补率', value: safeFixed(mod.subsidyRateC * 100, 2) + '%' },
    ];
    let html = '<div class="cost-summary-bar">';
    items.forEach(it => {
      html += '<div class="cost-summary-item ' + (it.cls || '') + '">' +
        '<span class="cost-summary-label">' + it.label + '</span>' +
        '<span class="cost-summary-value">' + it.value + '</span></div>';
    });
    html += '</div>';
    el.innerHTML = html;
  }

  function isCostAnomaly(key, value, base, statsObj) {
    // V13.2: 优先使用IQR动态阈值，无统计对象时回退静态阈值
    if (statsObj) {
      if (key === 'ue' && statsObj.lowerBound !== undefined) return value < statsObj.lowerBound;
      if (key === 'deliveryCostRate' && statsObj.upperBound !== undefined) return value > statsObj.upperBound;
      if (key === 'subsidyRatio' && statsObj.upperBound !== undefined) return value > statsObj.upperBound;
      if (key === 'avgRevenuePerOrder' && statsObj.lowerBound !== undefined) return value < statsObj.lowerBound;
    }
    // 回退：静态阈值
    if (key === 'ue') return value < -0.5;
    if (key === 'deliveryCostRate') return value > 0.40;
    if (key === 'subsidyRatio') return value > 0.10;
    if (key === 'avgRevenuePerOrder') return value < 8;
    return false;
  }

  function renderCostCompare() {
    const el = document.getElementById('costCompare');
    if (!el) return;
    const cities = state.currentData.cities.filter(c => c.name !== '总商');

    const compareMetrics = [
      { key: 'ue', label: '单均UE', unit: '元', format: v => safeFixed(v, 2), negativeColor: true },
      { key: 'deliveryCostRate', label: '配送成本率', unit: '%', format: v => safeFixed(v*100, 2), threshold: 0.4, inverse: false },
      { key: 'subsidyRateTotal', label: '补贴率', unit: '%', format: v => safeFixed(v*100, 2), threshold: 0.15, inverse: false },
      { key: 'subsidyRateB', label: 'B端代补率', unit: '%', format: v => safeFixed(v*100, 2), threshold: 0.05, inverse: false },
      { key: 'subsidyRateC', label: 'C端代补率', unit: '%', format: v => safeFixed(v*100, 2), threshold: 0.10, inverse: false },
      { key: 'penalty', label: '罚款', unit: '元', format: v => fmtWan(v), threshold: 0, inverse: false, isAmount: true }
    ];

    let html = '<div >';
    compareMetrics.forEach(cm => {
      html += '<div class="ft-cost-note">';
      html += '<div style="font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:4px;">' + cm.label + '</div>';
      const items = cities.map(c => {
        const m = c.modules[costModule];
        let val = 0;
        if (m) {
          if (cm.key === 'subsidyRateTotal') {
            val = m.subsidyRateTotal !== undefined ? m.subsidyRateTotal : m.subsidyRatio;
          } else {
            val = m[cm.key] || 0;
          }
        }
        return { name: c.displayName, value: val };
      });

      if (cm.isAmount) {
        items.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
        html += '<div >';
        items.forEach(it => {
          if (it.value === 0) return;
          const isHigh = Math.abs(it.value) > 10000;
          html += '<span style="font-size:10px;padding:2px 6px;border-radius:3px;background:' +
            (isHigh ? 'rgba(231,76,60,0.12)' : 'rgba(0,0,0,0.04)') + ';color:' +
            (isHigh ? 'var(--danger)' : 'var(--text)') + ';">' + it.name + ': ' + cm.format(it.value) + '</span>';
        });
        html += '</div>';
      } else {
        const absMax = Math.max(...items.map(it => Math.abs(it.value)), 0.001);
        items.sort((a, b) => a.value - b.value);
        items.forEach(it => {
          const barW = (Math.abs(it.value) / absMax * 100);
          const isAnomaly = cm.negativeColor ? it.value < 0 : (cm.inverse ? it.value < cm.threshold : it.value > cm.threshold);
          const barColor = isAnomaly ? 'var(--danger)' : 'var(--primary)';
          html += '<div class="cost-compare-row">' +
            '<div class="cost-compare-city">' + it.name + '</div>' +
            '<div class="cost-compare-bar"><div class="cost-compare-fill" style="width:' + barW + '%;background:' + barColor + '"></div></div>' +
            '<div class="cost-compare-val" style="color:' + (isAnomaly ? 'var(--danger)' : 'var(--text)') + '">' + cm.format(it.value) + cm.unit + '</div></div>';
        });
      }
      html += '</div>';
    });
    html += '</div>';
    el.innerHTML = html;
  }





// ===== T4: 成本下钻(5大类→10+子项) =====

const COST_DRILL_MAP = {
  '配送成本': {
    source: 'deliveryCost',
    breakdown: 'deliveryCostBreakdown',
    subItems: [
      { key: 'franchiseDelivery', label: '加盟配送' },
      { key: 'crowdDelivery', label: '众包配送' },
      { key: 'yuepaoDelivery', label: '月跑配送' },
      { key: 'weatherSubsidy', label: '天气补贴' },
      { key: 'bidding', label: '竞价推广', calc: m => m.bidding || 0 },
      { key: 'penalty', label: '罚款', calc: m => m.penalty || 0 },
      { key: 'commission', label: '平台抽佣', calc: m => m.commission || 0 },
      { key: 'afterSale', label: '售后成本', calc: m => m.afterSale || 0 },
      { key: 'careFund', label: '关怀基金', calc: m => m.careFund || 0 },
      { key: 'insurance', label: '保险费', calc: m => m.insurance || 0 }
    ]
  },
  '代补': {
    source: 'subsidyTotal',
    breakdown: null,
    subItems: [
      { key: 'subsidyB', label: 'B端补贴', calc: m => m.subsidyB || 0 },
      { key: 'subsidyC', label: 'C端补贴', calc: m => m.subsidyC || 0 },
      { key: 'pinDanSubsidy', label: '拼单补贴', calc: m => m.pinDanSubsidy || 0 },
      { key: 'pinHaoFanSubsidy', label: '拼好饭补贴', calc: m => m.pinHaoFanSubsidy || 0 },
      { key: 'specialSubsidy', label: '专项补贴', calc: m => m.specialSubsidy || 0 },
      { key: 'weatherSubsidy', label: '天气临时补贴', calc: m => m.weatherSubsidy || 0 },
      { key: 'commission', label: '平台抽佣', calc: m => m.commission || 0 },
      { key: 'afterSale', label: '售后成本', calc: m => m.afterSale || 0 },
      { key: 'careFund', label: '关怀基金', calc: m => m.careFund || 0 }
    ]
  },
  '平台成本': {
    source: 'platformCost',
    breakdown: 'platformCostBreakdown',
    subItems: [
      { key: 'commission', label: '平台抽佣' },
      { key: 'afterSale', label: '售后成本' },
      { key: 'careFund', label: '关怀基金' },
      { key: 'insurance', label: '保险费' },
      { key: 'bidding', label: '竞价推广' },
      { key: 'penalty', label: '罚款' },
      { key: 'subsidyB', label: 'B端补贴', calc: m => m.subsidyB || 0 },
      { key: 'subsidyC', label: 'C端补贴', calc: m => m.subsidyC || 0 },
      { key: 'pinDanSubsidy', label: '拼单补贴', calc: m => m.pinDanSubsidy || 0 },
      { key: 'specialSubsidy', label: '专项补贴', calc: m => m.specialSubsidy || 0 },
      { key: 'weatherSubsidy', label: '天气临时补贴', calc: m => m.weatherSubsidy || 0 }
    ]
  },
  '固定成本': {
    source: 'fixedCost',
    breakdown: null,
    subItems: [
      { key: 'officeRent', label: '办公租金', calc: m => m.officeRent || 0 },
      { key: 'teamCost', label: '团队成本', calc: m => m.teamCost || 0 },
      { key: 'socialInsurance', label: '社保', calc: m => m.socialInsurance || 0 },
      { key: 'thirdPartyServiceCost', label: '第三方服务', calc: m => m.thirdPartyServiceCost || 0 },
      { key: 'taxCost', label: '税费', calc: m => m.taxCost || 0 },
      { key: 'utilityCost', label: '水电物业', calc: m => m.utilityCost || 0 },
      { key: 'travelCost', label: '差旅', calc: m => m.travelCost || 0 },
      { key: 'operationBoostCost', label: '运营助推', calc: m => m.operationBoostCost || 0 },
      { key: 'franchiseActivityCost', label: '加盟活动', calc: m => m.franchiseActivityCost || 0 }
    ]
  },
  '附加成本': {
    source: 'additionalCost',
    breakdown: null,
    subItems: [
      { key: 'operationBoostCost', label: '运营助推', calc: m => m.operationBoostCost || 0 },
      { key: 'franchiseActivityCost', label: '加盟活动', calc: m => m.franchiseActivityCost || 0 },
      { key: 'crowdActivityCost', label: '众包活动', calc: m => m.crowdActivityCost || 0 },
      { key: 'yuepaoActivityCost', label: '月跑活动', calc: m => m.yuepaoActivityCost || 0 },
      { key: 'otherMiscCost', label: '其他杂项', calc: m => m.otherMiscCost || 0 },
      { key: 'otherCost', label: '其他成本', calc: m => m.otherCost || 0 }
    ]
  }
};;

/**
 * 获取成本子项数据
 */
function getCostSubItems(mod, categoryKey) {
    const drill = COST_DRILL_MAP[categoryKey];
    if (!drill) return [];
    const results = [];
    for (const sub of drill.subItems) {
      let val = 0;
      if (drill.breakdown && mod[drill.breakdown]) {
        val = mod[drill.breakdown][sub.key] || 0;
      } else if (sub.calc) {
        val = sub.calc(mod);
      } else {
        val = mod[sub.key] || 0;
      }
      if (val > 0) {
        results.push({ label: sub.label, value: val });
      }
    }
    return results.sort((a, b) => b.value - a.value);
}

/**
 * T4: 渲染成本下钻视图
 * @param {string} categoryKey - 成本类别(COST_DRILL_MAP的key)
 */
function renderCostDrillDown(categoryKey) {
      const container = document.getElementById('costDrillDown');
      if (!container) return;
      // V2增强: 支持DataStore多期数据
      const allData = DataStore.loadAll();
      const dates = Object.keys(allData).sort();
      const useDataStore = dates.length >= 2 && DataStore;
      let city, mod, prevMod = null, prevDate = '';
      
      if (useDataStore) {
        // 从DataStore获取当前期和前一期
        const latestDate = dates[dates.length - 1];
        const mt = state.currentMerchant || 'all';
        const latestEntry = allData[latestDate];
        const cities = ((latestEntry.merchantData || {})[mt] || {}).cities || [];
        city = cities.find(c => (c.displayName || c.name) === costCity);
        mod = city ? (city.modules[costModule] || city.modules['all'] || {}) : null;
        
        // 获取前一期数据(用于环比)
        if (dates.length >= 2) {
          prevDate = dates[dates.length - 2];
          const prevEntry = allData[prevDate];
          const prevCities = ((prevEntry.merchantData || {})[mt] || {}).cities || [];
          const prevCity = prevCities.find(c => (c.displayName || c.name) === costCity);
          prevMod = prevCity ? (prevCity.modules[costModule] || prevCity.modules['all'] || {}) : null;
        }
      } else {
        // 回退到单期state
        city = state.currentData.cities.find(c => c.name === costCity);
        mod = city ? city.modules[costModule] : null;
        prevMod = getPrevPeriodData ? getPrevPeriodData(costCity, costModule) : null;
      }
      
      if (!mod) { container.innerHTML = '<div class="ft-cost-sec">无数据</div>'; return; }
      const drill = COST_DRILL_MAP[categoryKey];
      if (!drill) { container.innerHTML = ''; return; }
      const total = mod[drill.source] || 0;
      const subItems = getCostSubItems(mod, categoryKey);
      const covered = subItems.reduce((s, i) => s + i.value, 0);
      const uncovered = Math.max(0, total - covered);
      
    let html = '<div class="cost-drill-header">';
    html += '<span style="font-weight:600;">' + categoryKey + ' \u4e0b\u94bb</span>';
    html += '<span style="color:var(--text-sec);font-size:12px;">\u5408\u8ba1 ' + fmtWan(total) + '</span>';
    html += '</div>';
    const maxVal = Math.max(...subItems.map(i => i.value), 1);
      // V2增强: 构建前一期子项映射(用于环比)
      const prevSubItemsMap = {};
      if (prevMod) {
        const prevDrill = COST_DRILL_MAP[categoryKey];
        if (prevDrill) {
          const prevSubs = getCostSubItems(prevMod, categoryKey);
          prevSubs.forEach(si => { prevSubItemsMap[si.key] = si.value; });
        }
      }
      for (const item of subItems) {
        const pct = total > 0 ? (item.value / total * 100) : 0;
        const barW = (item.value / maxVal * 100);
        const prevVal = prevSubItemsMap[item.key] || 0;
        const itemChange = prevMod && prevVal > 0 ? ((item.value - prevVal) / prevVal * 100) : 0;
        const changeClass = prevMod ? (itemChange > 0 ? 'drill-up' : itemChange < 0 ? 'drill-down' : '') : '';
        html += '<div class="cost-drill-row ' + changeClass + '">';
        html += '<div class="cost-drill-label">' + item.label + '</div>';
        html += '<div class="cost-drill-bar-wrap"><div class="cost-drill-fill" style="width:' + barW + '%"></div></div>';
        html += '<div class="cost-drill-value">' + fmtWan(item.value) + '</div>';
        html += '<div class="cost-drill-pct">' + pct.toFixed(1) + '%</div>';
        if (prevMod) {
          html += '<div class="cost-drill-change ' + (itemChange >= 0 ? 'up' : 'down') + '">' + (itemChange >= 0 ? '+' : '') + itemChange.toFixed(1) + '%</div>';
        }
        html += '</div>';
      }
    if (uncovered > 0 && uncovered / total > 0.01) {
      const pct = (uncovered / total * 100);
      html += '<div class="cost-drill-row uncovered">';
      html += '<div class="cost-drill-label">\u672a\u62c6\u5206</div>';
      html += '<div class="cost-drill-value">' + fmtWan(uncovered) + '</div>';
      html += '<div class="cost-drill-pct">' + pct.toFixed(1) + '%</div>';
      html += '</div>';
    }
    // V2增强: 跨期总额环比(复用prevMod)
    if (prevMod) {
      const prevTotal = prevMod[drill.source] || 0;
      const totalChange = total > 0 && prevTotal > 0 ? ((total - prevTotal) / prevTotal * 100) : 0;
      if (Math.abs(totalChange) > 20) {
        html += '<div class="cost-drill-alert">' + (totalChange > 0 ? '\u26a0\ufe0f ' : '') + '\u73af\u6bd4' + (totalChange >= 0 ? '+' : '') + totalChange.toFixed(1) + '% (' + prevDate + '→)</div>';
      }
    }
    // 覆盖率
    const coverageRate = total > 0 ? (covered / total * 100) : 0;
    const covClass = coverageRate >= 90 ? 'cov-high' : coverageRate >= 70 ? 'cov-mid' : 'cov-low';
    html += '<div class="cost-drill-coverage ' + covClass + '">\u8986\u76d6\u7387: <strong>' + coverageRate.toFixed(1) + '%</strong>';
    html += ' (' + subItems.length + '/' + (subItems.length + (uncovered > 0 ? 1 : 0)) + '\u9879)</div>';
    // TOP3子项占比
    if (subItems.length >= 2) {
      html += '<div class="cost-drill-summary">';
      const top3 = subItems.slice(0, 3);
      const top3Pct = top3.reduce((s, i) => s + (total > 0 ? i.value / total * 100 : 0), 0);
      html += '<span class="drill-summary-label">TOP3\u5360\u6bd4:</span> ';
      top3.forEach((it, idx) => {
        const pct = total > 0 ? (it.value / total * 100).toFixed(1) : '0.0';
        html += '<span class="drill-summary-item">' + it.label + ' ' + pct + '%</span>';
        if (idx < top3.length - 1) html += ' / ';
      });
      html += ' = ' + top3Pct.toFixed(1) + '%</div>';
    }
    container.innerHTML = html;
}

// ===== ES Module Exports =====
export {  initCostSelectors, renderCostStructure, renderCostBars, renderEfficiencyCards,
  renderKACityCompare, initKACityCompare, renderCityRatio, renderCapacity, isCostAnomaly, renderCostCompare,
  COST_DRILL_MAP, getCostSubItems, renderCostDrillDown,
  getKACellClass
};
// costCity/costModule通过ref对象导出（let变量不能直接export后重新赋值）
export const costState = {
  get costCity() { return costCity; },
  set costCity(v) { costCity = v; },
  get costModule() { return costModule; },
  set costModule(v) { costModule = v; }
};

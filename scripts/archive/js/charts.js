// charts.js - ES Module
import { _chartInstances, destroyChart, CHART_COLORS, safeNum, safeFixed } from './core';
import { displayName, fmtWan } from './utils';

function createChart(canvasId, config) {
  destroyChart(canvasId);
  var ctx = document.getElementById(canvasId);
  if (!ctx) return null;
  var chart = new Chart(ctx, config);
  _chartInstances[canvasId] = chart;
  return chart;
}

function renderOverviewCharts(cities, module) {
  if (!cities || cities.length === 0) return;

  // 准备数据
  var labels = cities.map(function(c) { return c.displayName || c.name; });
  var ueData = [], subsidyData = [], deliveryData = [], profitData = [];
  var colors = [];

  cities.forEach(function(c) {
    var m = c.modules && c.modules[module] ? c.modules[module] : {};
    var ue = safeNum(m.ue);
    var subsidy = safeNum(m.subsidyRatio) * 100;
    var delivery = safeNum(m.deliveryCostRate) * 100;
    var profit = safeNum(m.profit);

    ueData.push(ue);
    subsidyData.push(subsidy);
    deliveryData.push(delivery);
    profitData.push(profit);

    if (ue < 0) colors.push(CHART_COLORS.danger);
    else if (ue < 2) colors.push(CHART_COLORS.warning);
    else colors.push(CHART_COLORS.success);
  });

  // Phase 3.2: UE对比柱状图 + 结论性标题
  var validUE = ueData.filter(function(v) { return v !== 0; });
  var minUE = validUE.length > 0 ? Math.min.apply(null, validUE) : 0;
  var maxUE = validUE.length > 0 ? Math.max.apply(null, validUE) : 0;
  var minIdx = ueData.indexOf(minUE);
  var maxIdx = ueData.indexOf(maxUE);
  var lossCount = ueData.filter(function(v) { return v < 0; }).length;
  var chartTitle = '';
  if (labels.length > 0 && validUE.length > 0) {
    chartTitle = lossCount > 0
      ? (labels[minIdx] || '') + ' UE最低(' + safeFixed(minUE, 2) + '元)，' + (labels[maxIdx] || '') + '最高(' + safeFixed(maxUE, 2) + '元)'
      : (labels[maxIdx] || '') + ' UE最高(' + safeFixed(maxUE, 2) + '元)';
  }

  createChart('chartUE', {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: '单均UE (元)',
        data: ueData,
        backgroundColor: colors,
        borderRadius: 4,
        barThickness: 28
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { 
        legend: { display: false },
        title: { display: !!chartTitle, text: chartTitle, position: 'top', align: 'start',
          font: { size: 11, weight: '600' }, color: '#374151', padding: { bottom: 8 } },
        tooltip: { callbacks: { label: function(c) { return 'UE: ' + safeFixed(c.raw, 2) + '元'; } } },
        datalabels: {
          display: function(ctx) { return ctx.dataset.data[ctx.dataIndex] !== 0; },
          formatter: function(v) { return safeFixed(v, 1); },
          color: '#374151',
          font: { size: 9, weight: '600' },
          anchor: 'end',
          align: 'top'
        }
      },
      scales: { y: { beginAtZero: false, grid: { color: CHART_COLORS.grid } }, x: { grid: { display: false } } }
    }
  });

  // 成本构成堆叠柱状图
  createChart('chartCost', {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        { label: '配送成本率', data: deliveryData, backgroundColor: CHART_COLORS.orange, stack: 'cost' },
        { label: '补贴率', data: subsidyData, backgroundColor: CHART_COLORS.purple, stack: 'cost' }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { 
        legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12, font: { size: 11 } } },
        tooltip: { callbacks: { label: function(c) { return c.dataset.label + ': ' + safeFixed(c.raw, 2) + '%'; } } }
      },
      scales: { 
        x: { stacked: true, grid: { display: false } },
        y: { stacked: true, grid: { color: CHART_COLORS.grid }, ticks: { callback: function(v) { return v + '%'; } } }
      }
    }
  });
}

function renderCostCharts(cities, module) {
  if (!cities || cities.length === 0) return;

  var labels = cities.map(function(c) { return c.displayName || c.name; });
  var franchiseData = [], crowdData = [], yuepaoData = [];

  cities.forEach(function(c) {
    var m = c.modules && c.modules[module] ? c.modules[module] : {};
    franchiseData.push(safeNum(m.franchiseDelivery));
    crowdData.push(safeNum(m.crowdDelivery));
    yuepaoData.push(safeNum(m.yuepaoDelivery));
  });

  // 配送成本三渠道堆叠图
  createChart('chartDeliveryCost', {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        { label: '加盟配送', data: franchiseData, backgroundColor: CHART_COLORS.primary },
        { label: '众包配送', data: crowdData, backgroundColor: CHART_COLORS.secondary },
        { label: '悦跑配送', data: yuepaoData, backgroundColor: CHART_COLORS.primaryLt }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { 
        legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12, font: { size: 11 } } },
        tooltip: { callbacks: { label: function(c) { return c.dataset.label + ': ' + fmtWan(c.raw); } } }
      },
      scales: { 
        x: { stacked: true, grid: { display: false } },
        y: { stacked: true, grid: { color: CHART_COLORS.grid } }
      }
    }
  });
}

function renderTrendCharts(trendData) {
  if (!trendData || trendData.length < 2) return;

  var labels = trendData.map(function(d) { return d.date; });
  var ueData = trendData.map(function(d) { return safeNum(d.ue); });
  var profitData = trendData.map(function(d) { return safeNum(d.profit); });
  var revenueData = trendData.map(function(d) { return safeNum(d.onlineRevenue); });
  var costData = trendData.map(function(d) { return safeNum(d.totalExpense); });

  // UE趋势折线图 - 增强tooltip交互
  createChart('chartTrendUE', {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: '单均UE (元)',
        data: ueData,
        borderColor: CHART_COLORS.primary,
        backgroundColor: 'rgba(26,115,232,0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 5,
        pointHoverRadius: 8,
        pointBackgroundColor: '#fff',
        pointBorderColor: CHART_COLORS.primary,
        pointBorderWidth: 2,
        pointHoverBorderWidth: 3,
        pointHoverBackgroundColor: CHART_COLORS.primary
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: true,
          backgroundColor: 'rgba(17,24,39,0.9)',
          titleFont: { size: 12, weight: 'bold' },
          bodyFont: { size: 12 },
          padding: 10,
          cornerRadius: 6,
          displayColors: false,
          callbacks: {
            title: function(items) { return items[0].label; },
            label: function(c) {
              var val = safeFixed(c.raw, 2);
              var prev = c.dataIndex > 0 ? c.dataset.data[c.dataIndex - 1] : null;
              var change = '';
              if (prev !== null && prev !== 0) {
                var pct = ((c.raw - prev) / Math.abs(prev) * 100).toFixed(1);
                change = ' (' + (pct > 0 ? '+' : '') + pct + '%)';
              }
              return 'UE: ' + val + '元' + change;
            }
          }
        }
      },
      scales: {
        y: { grid: { color: CHART_COLORS.grid } },
        x: { grid: { display: false } }
      }
    }
  });

  // 收入vs成本对比图 - 增强tooltip
  createChart('chartTrendRevenue', {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        { label: '线上收入', data: revenueData, backgroundColor: CHART_COLORS.success, barThickness: 24 },
        { label: '总成本', data: costData, backgroundColor: CHART_COLORS.danger, barThickness: 24 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12, font: { size: 11 } } },
        tooltip: {
          enabled: true,
          backgroundColor: 'rgba(17,24,39,0.9)',
          titleFont: { size: 12, weight: 'bold' },
          bodyFont: { size: 12 },
          padding: 10,
          cornerRadius: 6,
          callbacks: {
            title: function(items) { return items[0].label; },
            label: function(c) { return c.dataset.label + ': ' + fmtWan(c.raw); }
          }
        }
      },
      scales: { y: { grid: { color: CHART_COLORS.grid } }, x: { grid: { display: false } } }
    }
  });
}

function renderCityRatioChart(cityData) {
  if (!cityData || cityData.length === 0) return;

  var labels = cityData.map(function(d) { return d.name; });
  var kaData = cityData.map(function(d) { return safeNum(d.kaOrders); });
  var cityData_ = cityData.map(function(d) { return safeNum(d.cityOrders); });

  createChart('chartCityRatio', {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        { label: 'KA订单', data: kaData, backgroundColor: CHART_COLORS.primary },
        { label: '城商订单', data: cityData_, backgroundColor: CHART_COLORS.warning }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { 
        legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12, font: { size: 11 } } }
      },
      scales: { 
        x: { stacked: true, grid: { display: false } },
        y: { stacked: true, grid: { color: CHART_COLORS.grid } }
      }
    }
  });
}

function renderCapacityChart(capacityData) {
  if (!capacityData || capacityData.length === 0) return;

  var labels = capacityData.map(function(d) { return d.name; });
  var ordersData = capacityData.map(function(d) { return safeNum(d.orders); });
  var avgPostageData = capacityData.map(function(d) { return safeNum(d.avgPostage); });

  createChart('chartCapacity', {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: '单均邮资 (元)',
        data: avgPostageData,
        backgroundColor: CHART_COLORS.teal,
        borderRadius: 4,
        barThickness: 28,
        yAxisID: 'y1'
      }, {
        label: '订单量',
        data: ordersData,
        type: 'line',
        borderColor: CHART_COLORS.orange,
        backgroundColor: 'transparent',
        tension: 0.3,
        pointRadius: 4,
        yAxisID: 'y'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { 
        legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12, font: { size: 11 } } }
      },
      scales: { 
        y: { position: 'left', grid: { color: CHART_COLORS.grid }, title: { display: true, text: '订单量' } },
        y1: { position: 'right', grid: { display: false }, title: { display: true, text: '邮资(元)' } },
        x: { grid: { display: false } }
      }
    }
  });
}





/**
 * T12运力趋势图(多期, 三渠道订单量+总承接占比)
 * @param {Array} trendData - [{date, franchiseOrders, crowdOrders, yuepaoOrders, totalOrders}]
 */
function renderCapacityTrendChart(trendData) {
  if (!trendData || trendData.length < 2) return;

  var labels = trendData.map(function(d) { return d.date; });
  // Phase 3.3: 合并加盟+众包为一条线，保留悦跑单独
  var franchiseCrowdData = trendData.map(function(d) {
    return safeNum(d.franchiseOrders) + safeNum(d.crowdOrders);
  });
  var yuepaoData = trendData.map(function(d) { return safeNum(d.yuepaoOrders); });

  createChart('chartCapacityTrend', {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        { label: '加盟+众包', data: franchiseCrowdData, borderColor: CHART_COLORS.primary, backgroundColor: 'rgba(79,70,229,0.1)', fill: false, tension: 0.3, pointRadius: 3, borderWidth: 2 },
        { label: '悦跑', data: yuepaoData, borderColor: CHART_COLORS.teal, backgroundColor: 'rgba(20,184,166,0.1)', fill: false, tension: 0.3, pointRadius: 3, borderWidth: 2 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12, font: { size: 11 } } },
        tooltip: {
          callbacks: {
            afterBody: function(items) {
              var idx = items[0].dataIndex;
              var total = trendData[idx].totalOrders || 0;
              return '总承接: ' + total.toLocaleString() + '单';
            }
          }
        }
      },
      scales: {
        y: { grid: { color: CHART_COLORS.grid }, title: { display: true, text: '承接单量' } },
        x: { grid: { display: false } }
      }
    }
  });
}

// ===== ES Module Exports =====
export { createChart, renderOverviewCharts, renderCostCharts,
  renderTrendCharts, renderCityRatioChart, renderCapacityChart, renderCapacityTrendChart };

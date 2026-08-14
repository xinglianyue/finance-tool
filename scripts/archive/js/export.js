// export.js - ES Module
import { CONFIG, state, $, DataStore, safeFixed } from './core';
import { getAnomalyLevel, getDiagnosis, getAnomalyLevelV2, getDiagnosisV2 } from './analysis';
import { displayName } from './utils';
const XLSX = window.XLSX;
import { createChart } from './charts';
import { getPrevPeriodData } from './detail';

// ===== v10: Export Functions =====
  function exportExcel() {
    if (!state.currentData) { window.showToast('请先上传数据', 'warning'); return; }
    const cities = window.getFilteredCities();
    const wb = XLSX.utils.book_new();

    // Sheet 1: UE Matrix
    const matrixData = [['城市', '模块', '订单量', '收入', '毛利', 'UE', '补贴率', 'GMV',
      'B端代补', 'C端代补', '专项补贴', '配送成本', '加盟邮资', '普众邮资', '悦跑邮资', '天气补贴',
      '罚款', '平台成本', '固定成本', '附加成本']];
    for (const city of cities) {
      for (const block of CONFIG.BLOCKS) {
        const m = city.modules[block.key];
        if (!m) continue;
        matrixData.push([
          city.displayName, block.name, m.orders,
          m.onlineRevenue, m.profit,
          +safeFixed(m.ue, 2), +safeFixed(m.subsidyRatio, 4),
          m.gmvAmount,
          m.subsidyB || 0, m.subsidyC || 0, m.specialSubsidy || 0,
          m.deliveryCost || 0, m.franchiseDelivery || 0, m.crowdDelivery || 0,
          m.yuepaoDelivery || 0, m.weatherSubsidy || 0,
          m.penalty || 0, m.platformCost || 0, m.fixedCost || 0, m.additionalCost || 0
        ]);
      }
    }
    const ws1 = XLSX.utils.aoa_to_sheet(matrixData);
    ws1['!cols'] = [{ wch: 10 }, { wch: 8 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 8 }, { wch: 8 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws1, 'UE矩阵');

    // Sheet 2: Anomaly Summary
    const anomalyItems = [];
    for (const city of state.currentData.cities.filter(c => c.name !== '总商')) {
      for (const block of CONFIG.BLOCKS) {
        const m = city.modules[block.key];
        if (!m) continue;
        const anomalyRes = getAnomalyLevelV2(m);
        const level = anomalyRes.level;
        if (level === 'danger' || level === 'warning') {
          anomalyItems.push({ cityDisplay: city.displayName, moduleName: block.name, level, ue: m.ue, subsidyRatio: m.subsidyRatio, orders: m.orders, profit: m.profit });
        }
      }
    }
    const anomalyData = [['城市', '模块', '严重级别', 'UE', '补贴率', '订单量', '毛利', '诊断']];
    for (const a of anomalyItems) {
      const diag = getDiagnosis(a.level, a.ue, a.subsidyRatio, a.moduleName) || '';
      anomalyData.push([
        a.cityDisplay, a.moduleName,
        a.level === 'danger' ? '严重' : '预警',
        +safeFixed(a.ue, 2), +safeFixed(a.subsidyRatio, 4),
        a.orders, a.profit, diag
      ]);
    }
    const ws2 = XLSX.utils.aoa_to_sheet(anomalyData);
    ws2['!cols'] = [{ wch: 10 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 10 }, { wch: 12 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, ws2, '异常汇总');

    // Sheet 3: Comparison (if prev data available)
    const dates = Object.keys(DataStore.loadAll()).sort().reverse();
    if (dates.length >= 2) {
      const compData = [['城市', '模块', '指标', '本期', '上期', '变化', '变化率']];
      for (const city of cities) {
        for (const block of CONFIG.BLOCKS) {
          const m = city.modules[block.key];
          if (!m) continue;
          const prev = getPrevPeriodData(city.name, block.key);
          if (!prev) continue;
          const rows = [
            { name: '订单量', cur: m.orders, prev: prev.orders },
            { name: '收入', cur: m.onlineRevenue, prev: prev.onlineRevenue },
            { name: '代补', cur: m.subsidyTotal, prev: prev.subsidyTotal },
            { name: '毛利', cur: m.profit, prev: prev.profit },
            { name: 'UE', cur: +safeFixed(m.ue, 2), prev: +safeFixed(prev.ue, 2) },
          ];
          for (const r of rows) {
            const diff = r.cur - r.prev;
            const rate = r.prev !== 0 ? safeFixed(diff / Math.abs(r.prev) * 100, 2) + '%' : '-';
            compData.push([city.displayName, block.name, r.name, r.cur, r.prev, diff, rate]);
          }
        }
      }
      const ws3 = XLSX.utils.aoa_to_sheet(compData);
      XLSX.utils.book_append_sheet(wb, ws3, '环比对比');
    }

    const dateStr = state.currentData.date || 'export';
    XLSX.writeFile(wb, '财务分析报告_' + dateStr + '.xlsx');
    window.showToast('Excel导出成功', 'success');
  }

  function exportCSV() {
    if (!state.currentData) { window.showToast('请先上传数据', 'warning'); return; }
    const cities = window.getFilteredCities();
    const rows = ['城市,模块,订单量,收入,代补,毛利,UE,补贴率,GMV'];
    for (const city of cities) {
      for (const block of CONFIG.BLOCKS) {
        const m = city.modules[block.key];
        if (!m) continue;
        rows.push([
          city.displayName, block.name, m.orders,
          m.onlineRevenue, m.subsidyTotal, m.profit,
          safeFixed(m.ue, 2), safeFixed(m.subsidyRatio, 4),
          m.gmvAmount
        ].join(','));
      }
    }
    const blob = new Blob(['﻿' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '财务分析_' + (state.currentData.date || 'export') + '.csv';
    a.click();
    URL.revokeObjectURL(url);
    window.showToast('CSV导出成功', 'success');
  }

  function exportMatrixExcel() {
    if (!state.currentData) { window.showToast('请先上传数据', 'warning'); return; }
    const cities = window.getFilteredCities();
    const wb = XLSX.utils.book_new();
    // Matrix view: rows=cities, cols=modules, each cell = UE + subsidy rate
    const headers = ['城市'];
    CONFIG.BLOCKS.forEach(b => headers.push(b.name + '-UE', b.name + '-补贴率'));
    const matrixRows = [headers];
    for (const city of cities) {
      const row = [city.displayName];
      for (const block of CONFIG.BLOCKS) {
        const m = city.modules[block.key];
        if (m && m.orders > 0) {
          row.push(+safeFixed(m.ue, 2), +safeFixed(m.subsidyRatio * 100, 2) + '%');
        } else {
          row.push('-', '-');
        }
      }
      matrixRows.push(row);
    }
    const ws = XLSX.utils.aoa_to_sheet(matrixRows);
    // Set column widths
    ws['!cols'] = [{ wch: 10 }];
    CONFIG.BLOCKS.forEach(() => { ws['!cols'].push({ wch: 10 }, { wch: 12 }); });
    XLSX.utils.book_append_sheet(wb, ws, 'UE矩阵');
    XLSX.writeFile(wb, 'UE矩阵_' + (state.currentData.date || 'export') + '.xlsx');
    window.showToast('矩阵导出成功', 'success');
  }

  // ===== V13: 图表导出为PNG =====
  function exportChartPNG(chartId) {
    var canvas = document.getElementById(chartId);
    if (!canvas) return;
    var link = document.createElement('a');
    link.download = chartId + '_' + new Date().toISOString().slice(0,10) + '.png';
    link.href = canvas.toDataURL('image/png', 1.0);
    link.click();
  }

  // ===== V13: 表格排序引擎 =====
  function makeTableSortable(tableEl) {
    if (!tableEl) return;
    var headers = tableEl.querySelectorAll('th');
    var rows = Array.from(tableEl.querySelectorAll('tbody tr'));
    if (rows.length === 0) return;
    headers.forEach(function(th, colIdx) {
      if (th.classList.contains('no-sort')) return;
      th.style.cursor = 'pointer';
      th.classList.add('data-table-th');
      var icon = document.createElement('span');
      icon.className = 'sort-icon';
      icon.textContent = '\u2195';
      th.appendChild(icon);
      th.addEventListener('click', function() {
        var asc = !th.classList.contains('sort-asc');
        headers.forEach(function(h) { h.classList.remove('sort-asc','sort-desc'); });
        th.classList.add(asc ? 'sort-asc' : 'sort-desc');
        icon.textContent = asc ? '\u2191' : '\u2193';
        rows.sort(function(a, b) {
          var aText = a.cells[colIdx] ? a.cells[colIdx].textContent.replace(/[%,\s¥万]/g, '') : '';
          var bText = b.cells[colIdx] ? b.cells[colIdx].textContent.replace(/[%,\s¥万]/g, '') : '';
          var aNum = parseFloat(aText), bNum = parseFloat(bText);
          if (!isNaN(aNum) && !isNaN(bNum)) return asc ? aNum - bNum : bNum - aNum;
          return asc ? aText.localeCompare(bText) : bText.localeCompare(aText);
        });
        var tbody = tableEl.querySelector('tbody');
        if (tbody) rows.forEach(function(r) { tbody.appendChild(r); });
      });
    });
  }

  // ===== V13: 增强createChart支持导出按钮 =====
  var _origCreateChart = (typeof createChart === 'function') ? createChart : null;

  (function() {
  })();


// ===== ES Module Exports =====
export { exportExcel, exportCSV, exportMatrixExcel, exportChartPNG, makeTableSortable };

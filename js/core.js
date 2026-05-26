// core.js - ES Module
// Chart.js 和 ChartDataLabels 通过 script 标签全局加载
const Chart = window.Chart;
const ChartDataLabels = window.ChartDataLabels;
// Chart.js v4 中不需要手动注册 registerables，默认已注册
if (Chart.ChartJS && Chart.ChartJS.registerables) {
  Chart.register(...Chart.ChartJS.registerables);
}

if (ChartDataLabels) {
  Chart.register(ChartDataLabels);
}
// Phase 3.1: 数据标签全局默认(可被单项覆盖)
Chart.defaults.plugins.datalabels = {
  display: false,
  font: { size: 10, weight: 'bold' },
  color: '#374151',
  anchor: 'end',
  align: 'top',
  offset: 2
};

window.Chart = Chart;

// ===== 安全工具函数（无外部依赖，最先加载） =====
function safeRender(renderFn) {
  try {
    renderFn();
  } catch (e) {
    console.error('[V13 Render Error]', renderFn.name, e.message, e.stack);
  }
}

var LOG_LEVEL = (window.location.search.indexOf('debug=1') !== -1) ? 'debug' : 'error';
function safeLog(level) {
  if (['debug','info','warn','error'].indexOf(level) === -1) level = 'info';
  var levels = { debug: 0, info: 1, warn: 2, error: 3 };
  if (levels[level] < levels[LOG_LEVEL]) return;
  var args = Array.prototype.slice.call(arguments, 1);
  var prefix = '[' + level.toUpperCase() + '] ';
  if (level === 'error') console.error(prefix, args);
  else if (level === 'warn') console.warn(prefix, args);
  else console.log(prefix, args);
}

// ===== V13: Chart.js 图表系统 =====
var _chartInstances = {};

function destroyChart(canvasId) {
  if (_chartInstances[canvasId]) {
    _chartInstances[canvasId].destroy();
    delete _chartInstances[canvasId];
  }
}

  // ===== V13: CHART_COLORS统一图表配色 =====
  var CHART_COLORS = {
    primary: '#4f46e5', primaryLt: '#eef2ff', secondary: '#3b82f6',
    success: '#22c55e', successLt: '#f0fdf4', danger: '#ef4444', dangerLt: '#fef2f2',
    warning: '#f59e0b', warningLt: '#fffbeb', purple: '#8b5cf6', purpleLt: '#f5f3ff',
    orange: '#f97316', orangeLt: '#fff7ed', teal: '#14b8a6', tealLt: '#f0fdfa',
    grid: 'var(--gray-light)', bg: '#f9fafb'
  };
  Chart.defaults.color = CHART_COLORS.danger;
  Chart.defaults.borderColor = CHART_COLORS.grid;
  Chart.defaults.font.family = "-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC',sans-serif";
  Chart.defaults.font.size = 12;
  Chart.defaults.plugins.legend.labels.usePointStyle = true;
  Chart.defaults.plugins.legend.labels.pointStyle = 'circle';

function safeFixed(val, digits) {
  if (digits === undefined) digits = 2;
  var n = parseFloat(val);
  if (isNaN(n) || val === null || val === undefined) return '0.00';
  return n.toFixed(digits);
}

function safeFixedPct(val, digits) {
  if (digits === undefined) digits = 2;
  var n = parseFloat(val);
  if (isNaN(n) || val === null || val === undefined) return '0.00';
  return safeFixed(n, digits);
}

function safeNum(val, fallback) {
  var n = parseFloat(val);
  return isNaN(n) ? (fallback || 0) : n;
}

function htmlEscape(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function safeDiv(numerator, denominator, fallback) {
  if (denominator === 0 || denominator === null || denominator === undefined) return fallback || 0;
  if (numerator === null || numerator === undefined) return fallback || 0;
  return numerator / denominator;
}



  function clearCurrentData() {
    var fn = document.getElementById('uploadFileName');
    var date = fn ? fn.textContent.trim() : '';
    if (!date) return;
    if (typeof showConfirm === 'function') { window.showConfirm('确定清除 ' + date + ' 的数据？').then(function(ok){ if(ok) doClearCurrentData(date); }); return; }
    if (!confirm('确定清除 ' + date + ' 的数据？')) return;
    if (typeof DataStore !== 'undefined') DataStore.remove(date);
    var ua = document.getElementById('uploadArea');
    var us = document.getElementById('uploadSuccess');
    var ws = document.getElementById('welcomeState');
    var ds = document.getElementById('dashboardState');
    if (ua) ua.style.display = '';
    if (us) us.style.display = 'none';
    if (ws) ws.classList.remove('hidden');
    if (ds) ds.classList.add('hidden');
    if (typeof updateDateSelector === 'function') window.updateDateSelector();
    if (typeof renderHistory === 'function') window.renderHistory();
  }

// ===== CONFIG =====
  
// 处理文件协议安全限制
if (window.location.protocol === 'file:') {
  safeLog('debug', '当前使用file://协议，可能存在安全限制');
  // 禁用某些需要安全上下文的功能
  window.DISABLE_CROSS_ORIGIN = true;
  // 提供友好的错误提示
  window.showSecurityWarning = function() {
    const warning = document.createElement('div');
    warning.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: #f59e0b;
      color: white;
      padding: 10px 15px;
      border-radius: 5px;
      z-index: 9999;
      font-family: sans-serif;
      font-size: 14px;
    `;
    warning.innerHTML = `
      <strong>⚠️ 安全提示</strong><br>
      当前使用本地文件协议，某些功能可能受限。<br>
      建议使用本地服务器打开此文件。
    `;
    document.body.appendChild(warning);
    // 5秒后自动消失
    setTimeout(() => {
      if (warning.parentNode) {
        warning.parentNode.removeChild(warning);
      }
    }, 5000);
  };
  // 页面加载后显示警告
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      window.showSecurityWarning();
    });
  } else {
    window.showSecurityWarning();
  }
  }
const CONFIG = {
    // 核心指标阈值（基于业务实际情况优化）
    UE_THRESHOLDS: {
      DANGER: 0.10,     // UE < 0.10 → 严重（红色）
      WARN_LOW: 0.15,   // 0.10 <= UE < 0.15 → 预警（黄色）
      WARN_HIGH: 0.15,  // UE >= 0.15 → 健康（绿色）
    },
    PROFIT_RATE_THRESHOLDS: {
      DANGER: 0.10,     // 毛利率 < 10% → 严重（红色）
      WARN_LOW: 0.12,   // 10% <= 毛利率 < 12% → 预警（黄色）
      WARN_HIGH: 0.12,  // 毛利率 >= 12% → 健康（绿色）
    },
    PROFIT_THRESHOLDS: {
      DANGER: 0,        // 毛利 < 0 → 严重（红色）亏损
      WARN_LOW: 50000,  // 0 <= 毛利 < 5万 → 预警（黄色）
      WARN_HIGH: 50000, // 毛利 >= 5万 → 健康（绿色）
    },
    GMV_THRESHOLDS: {
      DANGER: 500000,   // 交易额 < 50万 → 预警（黄色）
      WARN_HIGH: 1000000, // 交易额 >= 100万 → 健康（绿色）
    },
    ORDERS_THRESHOLDS: {
      DANGER: 30000,    // 订单量 < 3万 → 预警（黄色）
      WARN_HIGH: 50000, // 订单量 >= 5万 → 健康（绿色）
    },
    REVENUE_THRESHOLDS: {
      DANGER: 30000,    // 收入 < 3万 → 预警（黄色）
      WARN_HIGH: 60000, // 收入 >= 6万 → 健康（绿色）
    },
    EXPENSE_THRESHOLDS: {
      WARN_LOW: 0,      // 支出 > 收入 → 预警（红色）
    },
    // 其他阈值保持不变
    SUBSIDY_RATIO_THRESHOLDS: {
      WARN_LOW: 0.35,   // 35%~45% → 预警
      DANGER: 0.45,     // > 45% → 严重
    },
    DELIVERY_COST_RATE_THRESHOLDS: {
      WARN_LOW: 0.30,   // > 30% → 预警
      DANGER: 0.38,     // > 38% → 严重
    },
    FIXED_COST_RATE_THRESHOLDS: {
      WARN_LOW: 0.04,   // > 4% → 预警
      DANGER: 0.08,     // > 8% → 严重
    },
    AVG_REVENUE_PER_ORDER_THRESHOLDS: {
      DANGER: 6,        // < 6元 → 严重
      WARN_LOW: 8,      // < 8元 → 预警
    },
    PLATFORM_COST_RATE_THRESHOLDS: {
      WARN_LOW: 0.12,   // > 12% → 预警
      DANGER: 0.18,     // > 18% → 严重
    },
    B_SUBSIDY_RATE_THRESHOLDS: {
      WARN_LOW: 0.10,   // > 10% → 预警
      DANGER: 0.15,     // > 15% → 严重
    },
    CITY_DISPLAY_MAP: {
      '承德市': '承德',
      '围场满族蒙古族自治县': '围场',
      '玉田县': '玉田',
      '安国市': '安国',
      '安平': '安平',
      '献县': '献县',
      '晋州': '晋州',
      '威县': '威县',
      '深泽县': '深泽',
      '康保县': '康保'
    },
    // Data block offsets for "全量商家" sheet
    BLOCKS: [
      { key: 'all',   name: '全品类' },
      { key: 'food',  name: '餐饮' },
      { key: 'flash', name: '闪购' },
      { key: 'medicine', name: '医药' },
      { key: 'group', name: '拼好饭' }
    ],
    // Row offsets relative to block start
    ROWS: {
      ordersTotal: 10,
      revenueTotal: 32,
      subsidyTotal: 36,
      expenseTotal: 73,
      profit: 74,
    },
  
    MODULES: ['全品类', '餐饮', '闪购', '医药', '拼好饭'],
    MODULE_KEYS: {
      '全品类': 'all',
      '餐饮': 'food',
      '闪购': 'flash',
      '医药': 'medicine',
      '拼好饭': 'group'
    },
    MODULE_COLORS: {
      '全品类': '#667eea',
      '餐饮': '#10b981',
      '闪购': CHART_COLORS.warning,
      '医药': '#8b5cf6',
      '拼好饭': CHART_COLORS.danger
    },
    // T5 V3: 新增4个V3检测指标阈值
    PLATFORM_COST_RATE_THRESHOLDS: {
      WARN_LOW: 0.12,   // > 12% → 预警
      DANGER: 0.18,     // > 18% → 严重
    },
    B_SUBSIDY_RATE_THRESHOLDS: {
      WARN_LOW: 0.10,   // > 10% → 预警
      DANGER: 0.15,     // > 15% → 严重
    },
    C_SUBSIDY_RATE_THRESHOLDS: {
      WARN_LOW: 0.08,   // > 8% → 预警
      DANGER: 0.12,     // > 12% → 严重
    },
    PENALTY_AMOUNT_THRESHOLDS: {
      WARN_LOW: 5000,   // > 5000元 → 预警
      DANGER: 15000,    // > 15000元 → 严重
    },
    MODULE_CSS_VARS: {
      '全品类': '--module-all',
      '餐饮': '--module-food',
      '闪购': '--module-flash',
      '医药': '--module-med',
      '拼好饭': '--module-pin'
    },
  };
  // ===== STATE =====
  let state = {
    currentData: null,
    merchantData: {},      // { all: {label, cities:[...], ka: {...}, city: {...}} }
    currentMerchant: 'all',// 'all' | 'city' | 'ka'
    allData: {},
    selectedCities: new Set(),
    currentTab: 'overview',
    detailCity: null,
    detailModule: 'all',
  };
  // ===== DOM REFS =====
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);
  // ===== DATA STORAGE =====
  const DataStore = {
    KEY: 'finance-tool-v9',
    save(date, data) {
      const all = this.loadAll();
      all[date] = data;
      localStorage.setItem(this.KEY, JSON.stringify(all));
    },
    loadAll() {
      try { return JSON.parse(localStorage.getItem(this.KEY)) || {}; }
      catch { return {}; }
    },
    remove(date) {
      const all = this.loadAll();
      delete all[date];
      localStorage.setItem(this.KEY, JSON.stringify(all));
    },
    /**
     * 构建多日期索引(加速跨期查询)
     * 返回 {dates, summary, cityTimeline}
     */
    addAllPeriodsIndex() {
      const all = this.loadAll();
      const dates = Object.keys(all).sort();
      const summary = [];
      const cityTimeline = {};
      for (const d of dates) {
        const md = (all[d] || {}).merchantData || {};
        let cityCount = 0, hasKA = false, hasCity = false;
        for (const mt of ['all', 'ka', 'city']) {
          const cities = (md[mt] || {}).cities || [];
          if (mt === 'city' && cities.length) hasCity = true;
          if (mt === 'ka' && cities.length) hasKA = true;
          cityCount = Math.max(cityCount, cities.length);
          for (const c of cities) {
            const name = c.name || c.displayName || '';
            if (!name) continue;
            if (!cityTimeline[name]) cityTimeline[name] = [];
            const mod = c.modules ? (c.modules['all'] || {}) : {};
            cityTimeline[name].push({
              date: d,
              ue: mod.ue || 0,
              revenue: mod.onlineRevenue || 0,
              profit: mod.profit || 0,
              subsidyRate: mod.subsidyRate || 0,
              deliveryCost: mod.deliveryCost || 0
            });
          }
        }
        summary.push({ date: d, cityCount, hasKA, hasCity });
      }
      return { dates, summary, cityTimeline };
    }
  };


// ===== ES Module Exports =====
// 确保关键变量在全局可用（Vite模块合并后原名可能被重命名）
window.state = state;
window.$ = $;
window.$$ = $$;
window.DataStore = DataStore;
window.CONFIG = CONFIG;
window.safeLog = safeLog;
window.CHART_COLORS = CHART_COLORS;
window.destroyChart = destroyChart;
window._chartInstances = _chartInstances;

export { safeRender, safeLog, LOG_LEVEL, _chartInstances, destroyChart, CHART_COLORS,
  safeFixed, safeFixedPct, safeNum, htmlEscape, safeDiv, clearCurrentData, CONFIG, state, $, $$, DataStore };

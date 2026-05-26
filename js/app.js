// app.js - ES Module
import { state, $, $$, DataStore, safeFixed, safeLog } from './core';
import { analyzeContribution, analyzeCostWaterfall, generateInsights,
  renderInsightsPanel, renderUEDecomposition, renderWaterfallChart, renderContributionPanel,
  renderPeriodCompare, renderEnvOverview, initEnvOverview } from './analysis';
import { generateReport } from './report';
import { renderOverviewCharts } from './charts';
import { renderMatrix, renderStatCards, renderAnomalyAlert, renderCityRankingPanel } from './overview';
import { renderCostStructure, renderCityRatio, renderCapacity, renderKACityCompare,
  renderCostDrillDown } from './cost';
import { renderDetailTab, renderTrendCompare, updateDetailSelectors } from './detail';
import { renderKPICards } from './kpi';
import { renderAIInsights } from './insights';
import { handleFile, renderHistory } from './file';
import { exportExcel, exportCSV, exportMatrixExcel, makeTableSortable } from './export';
import { parseCSVFile, parseExcelFile } from './parser';
import { CloudData } from './sync';
import { showLoading, onDataLoaded, getFilteredCities } from './ui';
import { openSettings, initValidation } from './validate';
import { getPrevPeriodAllData } from './analysis';
import { renderHealthTab } from './health-ui.js';

  // ===== MERCHANT TYPE SWITCHER =====
  function renderMerchantSelector() {
    const container = $('#merchantSelector');
    const btnContainer = $('#merchantButtons');
    if (!container || !btnContainer) return;
    const types = Object.entries(state.merchantData);
    if (types.length <= 1) {
      container.style.display = 'none';
      return;
    }
    container.style.display = 'flex';
    btnContainer.innerHTML = types.map(([key, val]) =>
      '<button class="merchant-btn' + (key === state.currentMerchant ? ' active' : '') + '" data-merchant="' + key + '">' +
      val.label + '</button>'
    ).join('');
    btnContainer.querySelectorAll('.merchant-btn').forEach(btn => {
      btn.addEventListener('click', () => switchMerchant(btn.dataset.merchant));
    });
  }

  function switchMerchant(typeKey) {
    safeLog('info', '[switchMerchant] typeKey:', typeKey);
    if (!state.merchantData[typeKey]) { safeLog('error', '[switchMerchant] ERROR: merchantData[' + typeKey + '] not found'); return; }
    state.currentMerchant = typeKey;
    var cities = state.merchantData[typeKey].cities;
    safeLog('info', '[switchMerchant] cities count:', cities.length, 'first:', cities[0] ? cities[0].name : 'N/A');
    state.currentData = {
      date: state.currentData.date,
      cities: cities,
      fileName: state.currentData.fileName
    };
    state.selectedCities = new Set(cities.map(c => c.name));
    renderMerchantSelector();
    window.renderCityFilters();
    safeLog('info', '[switchMerchant] switching to tab:', state.currentTab || 'overview');
    // 刷新当前活跃Tab的数据
    switchTab(state.currentTab || 'overview');
  }

function refreshDashboard() {
    safeLog('info', '[refreshDashboard] cities:', state.currentData ? state.currentData.cities.length : 0, 'selected:', state.selectedData ? state.selectedCities.size : 0);

    // ===== Phase 1.1: 概览页精简 - 仅渲染3个Section =====
    // Section 1: 核心指标 (renderStatCards → #statCards)
    try { if (typeof renderKPICards === 'function') renderKPICards(state.currentData); } catch(e) {}
    renderStatCards();

    // Section 2: 异常预警 (renderAnomalyAlert → #anomalyAlertBar)
    renderAnomalyAlert();

    // Section 3: 智能洞察 (generateInsights → #insightsPanel)
    try {
      var filtered = getFilteredCities();
      var currentModule = document.querySelector('.module-select.active');
      var mod = currentModule ? currentModule.dataset.module : 'all';
      if (filtered.length > 0) {
        var history = DataStore ? DataStore.loadAll() : {};
        var allHistory = Object.keys(history).sort().map(function(d) { return history[d]; });
        var insights = generateInsights(filtered, mod, allHistory);
        renderInsightsPanel(insights);
      }
    } catch(e) { console.warn('[Insights]', e.message); }

    // ===== 详细分析Tab内容 (迁移自概览，仅在detail tab可见时渲染) =====
    try { renderDetailTab(); } catch(e) { console.warn('[DetailTab]', e.message); }

    // 图表+矩阵+排名+环境概览+多期对比 → 已迁移到详细分析Tab的Section中
    // 这些功能在switchTab('detail')时按需渲染，不再在refreshDashboard中调用
    try {
      var filtered2 = getFilteredCities();
      var currentModule2 = document.querySelector('.module-select.active');
      var mod2 = currentModule2 ? currentModule2.dataset.module : 'all';
      if (filtered2.length > 0) {
        renderOverviewCharts(filtered2, mod2);
        document.getElementById('overviewCharts').style.display = 'grid';
      }
    } catch(e) { console.warn('[OverviewCharts]', e.message); }

    try {
      renderMatrix();
    } catch(e) { console.warn('[Matrix]', e.message); }

    try {
      renderCityRankingPanel();
    } catch(e) { console.warn('[T10 RankingPanel]', e.message); }

    try {
      if (typeof state !== 'undefined' && state.detailCity && state.currentData) {
        var mod3 = currentModule ? currentModule.dataset.module : 'all';
        renderUEDecomposition(state.detailCity, mod3);
      }
    } catch(e) { console.warn('[UE Decomp]', e.message); }

    try {
      var allData = DataStore.loadAll();
      var dates = Object.keys(allData).sort();
      if (dates.length >= 2) {
        document.getElementById('envOverviewContainer').style.display = '';
        initEnvOverview();
      }
    } catch(e) { console.warn('[T8 EnvOverview]', e.message); }

    try { initPeriodSelectors(DataStore.loadAll() ? Object.keys(DataStore.loadAll()).sort() : []); } catch(e) {}

    try {
      var allData2 = DataStore.loadAll();
      var dates2 = Object.keys(allData2).sort();
      if (dates2.length >= 2) {
        document.getElementById('periodCompareContainer').style.display = '';
      }
    } catch(e) { console.warn('[T3 PeriodCompare]', e.message); }
}

  // ===== TAB SWITCHING =====
function switchTab(tabName) {
    state.currentTab = tabName;
    // V13.1: 自动初始化表格排序
    setTimeout(function() {
      document.querySelectorAll('.data-table').forEach(function(t) {
        if (!t._sortInit) { makeTableSortable(t); t._sortInit = true; }
      });
    }, 100);
    // V13: 更新ARIA
    document.querySelectorAll('[role="tab"]').forEach(function(t) {
      var isActive = t.getAttribute('data-tab') === tabName;
      t.setAttribute('aria-selected', isActive ? 'true' : 'false');
      t.classList.toggle('active', isActive);
    });
    safeLog('info', '[switchTab] ' + tabName + (state.currentData ? ', cities:' + state.currentData.cities.length : ''));
    $$('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tabName));
    $$('.tab-pane').forEach(p => p.classList.add('hidden'));
    $(`#pane${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`).classList.remove('hidden');
    if (tabName === 'overview') {
      safeLog('info', '[switchTab] refreshing overview, merchant:', state.currentMerchant);
      refreshDashboard();
    }
    if (tabName === 'detail') {
      updateDetailSelectors();
      renderDetailTab();
      renderTrendCompare();
      // V13.2: UE分解
      try {
        if (typeof state !== 'undefined' && state.detailCity) {
          var cm = curMod ? curMod.dataset.module : 'all';
          renderUEDecomposition(state.detailCity, cm);
        }
      } catch(e) { console.warn('[V13.2 UE Decomp]', e.message); }
    }
    if (tabName === 'cost') {
      renderCostStructure();
      renderKACityCompare();
      renderCityRatio();
      renderCapacity();
      // V13.2: 瀑布图 + 贡献度（需要两期数据）
      try {
        var prevData = getPrevPeriodAllData();
        if (prevData && typeof state !== 'undefined' && state.currentData) {
          var wf = analyzeCostWaterfall(state.currentData, prevData);
          renderWaterfallChart(wf);
          var curMod = document.querySelector('.module-select.active');
          var cm = curMod ? curMod.dataset.module : 'all';
          var contrib = analyzeContribution(state.currentData, prevData, cm);
          renderContributionPanel(contrib);
        }
      } catch(e) { console.warn('[V13.2 Waterfall/Contribution]', e.message); }
    }
    if (tabName === 'rawdata') {
      renderRawData();
    }
    if (tabName === 'health') {
      renderHealthTab();
    }
    // report不自动生成，等用户点击
    // V16: 更新面包屑
    try {
      var tabNames = {overview:'经营概览', detail:'详细分析', cost:'成本结构', health:'健康度', report:'分析报告', rawdata:'原始数据'};
      if (typeof BreadcrumbNav !== 'undefined' && BreadcrumbNav.el) {
        var crumbs = [{label: tabNames[tabName] || tabName}];
        if (tabName === 'detail' && state.detailCity) {
          crumbs.push({label: state.detailCity});
        }
        BreadcrumbNav.set(crumbs);
      }
    } catch(e) {}
  }
  function switchToDetail(cityName, moduleKey) {
    state.detailCity = cityName;
    state.detailModule = moduleKey;
    // Update selectors
    const citySel = $('#detailCity');
    citySel.value = cityName;
    const modSel = $('#detailModule');
    modSel.value = moduleKey;
    // Switch to detail tab
    switchTab('detail');
  }
  // ===== EVENT BINDINGS =====
  function initEvents() {
    // Upload
    const uploadArea = $('#uploadArea');
    const fileInput = $('#fileInput');
    if ($('#uploadArea')) {
      $('#uploadArea').style.display = 'none';
    }
    document.getElementById('welcomeUploadBtn').addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
      if (e.target.files[0]) { handleFile(e.target.files[0]); }
    });

    // Report buttons
    $('#btnGenerateReport').addEventListener('click', generateReport);
    $('#btnCopyReport').addEventListener('click', function() {
      if (state.reportText) {
        navigator.clipboard.writeText(state.reportText).then(function() {
          var btn = $('#btnCopyReport');
          btn.textContent = '已复制!';
          setTimeout(function() { btn.textContent = '复制到剪贴板'; }, 2000);
        });
      }
    });
    $('#btnDownloadReport').addEventListener('click', function() {
      if (state.reportText) {
        var blob = new Blob([state.reportText], { type: 'text/markdown;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = ($('#dateSelect').value || 'report') + '_UE分析报告.md';
        a.click();
        URL.revokeObjectURL(url);
      }
    });

    // Sync panel buttons
    var checkStatusBtn = document.getElementById('checkSyncStatus');
    if (!checkStatusBtn) checkStatusBtn = document.getElementById('checkStatusBtn');
    if (checkStatusBtn) checkStatusBtn.addEventListener('click', checkApiStatus);
    var settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) settingsBtn.addEventListener('click', openSettings);
    var syncBtn = document.getElementById('syncBtn');
    if (syncBtn) syncBtn.addEventListener('click', startSync);

    // Drag & drop on sidebar
    const sidebar = $('#sidebar');
    sidebar.addEventListener('dragover', (e) => e.preventDefault());
    sidebar.addEventListener('drop', (e) => {
      e.preventDefault();
      if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
    });

    // Tab switching
    $$('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Date selector
    $('#dateSelect').addEventListener('change', (e) => {
      const date = e.target.value;
      const allData = DataStore.loadAll();
      if (allData[date]) {
        const entry = allData[date];
        if (entry.merchantData) {
          state.merchantData = entry.merchantData;
          state.currentMerchant = entry.currentMerchant || Object.keys(entry.merchantData)[0];
          state.currentData = entry.currentData;
        } else {
          state.currentData = entry;
          state.merchantData = { all: { label: '全量商家', cities: entry.cities } };
          state.currentMerchant = 'all';
        }
        onDataLoaded();
        renderHistory();
        renderMerchantSelector();
      }
    });

    // City filter actions
    $('#selectAllBtn').addEventListener('click', () => {
      if (!state.currentData) return;
      state.selectedCities = new Set(state.currentData.cities.map(c => c.name));
      $$('#cityFilters input[type="checkbox"]').forEach(cb => cb.checked = true);
      refreshDashboard();
    });
    $('#deselectAllBtn').addEventListener('click', () => {
      state.selectedCities.clear();
      $$('#cityFilters input[type="checkbox"]').forEach(cb => cb.checked = false);
      refreshDashboard();
    });

    // Detail selectors
    $('#detailCity').addEventListener('change', (e) => {
      state.detailCity = e.target.value;
      renderDetailTab();
      renderTrendCompare();
    });
    $('#detailModule').addEventListener('change', (e) => {
      state.detailModule = e.target.value;
      renderDetailTab();
      renderTrendCompare();
    });

    // Mobile menu
    $('#mobileMenuBtn').addEventListener('click', () => {
      $('#sidebar').classList.toggle('open');
      $('#sidebarOverlay').classList.toggle('show');
    });
    $('#sidebarOverlay').addEventListener('click', () => {
      $('#sidebar').classList.remove('open');
      $('#sidebarOverlay').classList.remove('show');
    });
  }
  // ===== INIT =====


  // ===== RAW DATA =====
function renderRawData() {
  const container = document.getElementById('rawdataContent');
  if (!container) return;
  if (!state.currentData || !state.currentData.cities) {
    container.innerHTML = '<p>暂无数据</p>';
    return;
  }
  const data = state.currentData;
  const MODULE_LABELS = {'all':'全品类','food':'餐饮','flash':'闪购','medicine':'医药','group':'拼好饭'};

  // Build flat row data: [city, module, metric, value]
  const rows = [];
  for (const city of data.cities) {
    for (const [modKey, mod] of Object.entries(city.modules)) {
      const label = MODULE_LABELS[modKey] || modKey;
      rows.push({
        city: city.displayName || city.name,
        module: label,
        orders: mod.orders || 0,
        revenue: mod.onlineRevenue || 0,
        subsidy: mod.subsidyTotal || 0,
        profit: mod.profit || 0,
        ue: mod.orders > 0 ? (mod.profit / mod.orders) : 0,
        subsidyRatio: mod.gmvAmount > 0 ? (mod.subsidyTotal / mod.gmvAmount) : 0,
        deliveryCost: mod.deliveryCost || 0,
        deliveryRate: mod.orders > 0 ? (mod.deliveryCost / mod.orders) : 0
      });
    }
  }

  // Store rows globally for search/filter/pagination
  window._rawDataRows = rows;

  // Render table
  function renderTable(filterText, page) {
    const PAGE_SIZE = 20;
    let filtered = rows;
    if (filterText) {
      const ft = filterText.toLowerCase();
      filtered = rows.filter(r =>
        r.city.toLowerCase().includes(ft) ||
        r.module.toLowerCase().includes(ft)
      );
    }
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    if (page > totalPages) page = totalPages;
    const startIdx = (page - 1) * PAGE_SIZE;
    const pageRows = filtered.slice(startIdx, startIdx + PAGE_SIZE);

    let html = '<div class="rawdata-toolbar">';
    html += '<input type="text" id="rawdataSearch" class="rawdata-search" placeholder="搜索城市/模块..." value="' + (filterText || '') + '">';
    html += '<span class="rawdata-count">共 ' + filtered.length + ' 条 / ' + totalPages + ' 页</span>';
    html += '</div>';

    html += '<div class="table-wrapper"><table class="data-table rawdata-table" role="table" aria-label="原始数据表"><thead><tr>';
    html += '<th>城市</th><th>模块</th><th>订单量</th><th>收入</th><th>补贴</th><th>毛利</th><th>UE</th><th>补贴率</th><th>配送成本</th>';
    html += '</tr></thead><tbody>';
    pageRows.forEach(r => {
      const ueClass = r.ue < 0 ? 'val-down' : r.ue >= 0.3 ? 'val-up' : '';
      const profitClass = r.profit < 0 ? 'val-down' : 'val-up';
      html += '<tr>';
      html += '<td style="font-weight:500">' + r.city + '</td>';
      html += '<td>' + r.module + '</td>';
      html += '<td>' + r.orders.toLocaleString() + '</td>';
      html += '<td>' + (r.revenue / 10000).toFixed(2) + '万</td>';
      html += '<td>' + (r.subsidy / 10000).toFixed(2) + '万</td>';
      html += '<td class="' + profitClass + '">' + (r.profit / 10000).toFixed(2) + '万</td>';
      html += '<td class="' + ueClass + '">' + r.ue.toFixed(2) + '元</td>';
      html += '<td>' + (r.subsidyRatio * 100).toFixed(2) + '%</td>';
      html += '<td>' + (r.deliveryCost / 10000).toFixed(2) + '万</td>';
      html += '</tr>';
    });
    html += '</tbody></table></div>';

    // Pagination
    if (totalPages > 1) {
      html += '<div class="rawdata-pagination">';
      html += '<button class="rawdata-page-btn" ' + (page <= 1 ? 'disabled' : '') + ' data-page="' + (page - 1) + '">上一页</button>';
      for (let p = 1; p <= totalPages; p++) {
        if (totalPages <= 7 || Math.abs(p - page) <= 2 || p === 1 || p === totalPages) {
          html += '<button class="rawdata-page-btn' + (p === page ? ' active' : '') + '" data-page="' + p + '">' + p + '</button>';
        } else if (p === page - 3 || p === page + 3) {
          html += '<span class="rawdata-page-dots">...</span>';
        }
      }
      html += '<button class="rawdata-page-btn" ' + (page >= totalPages ? 'disabled' : '') + ' data-page="' + (page + 1) + '">下一页</button>';
      html += '</div>';
    }

    container.innerHTML = html;

    // Bind events
    const searchInput = document.getElementById('rawdataSearch');
    if (searchInput) {
      searchInput.addEventListener('input', function() {
        renderTable(this.value, 1);
      });
    }
    container.querySelectorAll('.rawdata-page-btn:not([disabled])').forEach(btn => {
      btn.addEventListener('click', function() {
        const p = parseInt(this.dataset.page);
        const search = document.getElementById('rawdataSearch');
        renderTable(search ? search.value : '', p);
      });
    });
  }

  renderTable('', 1);
}


  
  // ===== V13: 键盘快捷键 =====
  (function() {
    var tabKeys = ['overview','detail','cost','health','report','rawdata'];
    var tabLabels = {'overview':0,'detail':1,'cost':2,'health':3,'report':4,'rawdata':5};
    document.addEventListener('keydown', function(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      var ctrl = e.ctrlKey || e.metaKey;
      // Ctrl+1~6 切换Tab
      if (ctrl && e.key >= '1' && e.key <= '6') {
        e.preventDefault();
        var idx = parseInt(e.key) - 1;
        if (idx < tabKeys.length) switchTab(tabKeys[idx]);
      }
      // Ctrl+E 导出Excel
      if (ctrl && e.key === 'e') { e.preventDefault(); try { exportExcel(); } catch(ex) {} }
      // Ctrl+P 打印
      if (ctrl && e.key === 'p') { e.preventDefault(); window.print(); }
      // Ctrl+D 暗色模式
      if (ctrl && e.key === 'd') { e.preventDefault(); document.getElementById('themeToggle').click(); }
      // ? 显示快捷键
      if (e.key === '?') {
        var bar = document.getElementById('shortcutBar');
        bar.classList.toggle('visible');
        setTimeout(function() { bar.classList.remove('visible'); }, 4000);
      }
    });
  })();

  // ===== V13.1: 全局搜索实现 =====
  (function() {
    var searchInput = document.getElementById('globalSearch');
    if (!searchInput) return;
    var debounceTimer = null;
    searchInput.addEventListener('input', function() {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(function() {
        var query = searchInput.value.trim().toLowerCase();
        if (!query || !state.currentData || !state.currentData.cities) return;
        // 高亮匹配的城市
        document.querySelectorAll('.city-btn, .merchant-btn').forEach(function(btn) {
          var text = btn.textContent.toLowerCase();
          if (query && text.indexOf(query) !== -1) {
            btn.style.outline = '2px solid var(--primary)';
            btn.style.outlineOffset = '2px';
          } else {
            btn.style.outline = '';
            btn.style.outlineOffset = '';
          }
        });
        // 高亮匹配的表格行
        document.querySelectorAll('table tbody tr').forEach(function(row) {
          var text = row.textContent.toLowerCase();
          row.style.display = (query && text.indexOf(query) === -1) ? 'none' : '';
        });
      }, 300);
    });
    searchInput.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        searchInput.value = '';
        searchInput.dispatchEvent(new Event('input'));
        searchInput.blur();
      }
    });
  })();

  function init() {
    window.__initStep = 0; console.log("[init] START step=" + window.__initStep);
    // 启动时清理旧格式缓存数据
    try {
      const allData = DataStore.loadAll();
      const dates = Object.keys(allData);
      let cleaned = false;
      for (const date of dates) {
        if (allData[date] && !allData[date].merchantData && allData[date].cities) {
          delete allData[date];
          cleaned = true;
        }
      }
      if (cleaned) {
        localStorage.setItem(DataStore.KEY, JSON.stringify(allData));
        safeLog('error', '[init] 已清理旧格式缓存，请重新上传文件');
      }
    } catch(e) { console.warn('[init] 缓存清理失败:', e); }

    console.log("[init] before initEvents");
    try { initEvents(); console.log("[init] initEvents OK"); } catch(e) { console.error("[init] initEvents ERROR:", e); }
    try { initValidation(); console.log("[init] initValidation OK"); } catch(e) { console.error("[init] initValidation ERROR:", e); }


    // [v17.4] 先渲染本地缓存数据，解决网络不通时页面空白问题
    var localDates = Object.keys(DataStore.loadAll());
    console.log("[init] localDates:", localDates.length);
    if (localDates.length > 0) {
      console.log("[init] calling loadFromLocalStorage");
      try { loadFromLocalStorage(); console.log("[init] loadFromLocalStorage OK"); } catch(e) { console.error("[init] loadFromLocalStorage ERROR:", e); }
    }

    console.log('[init] before CloudData.pull, state.currentData:', state.currentData ? 'LOADED' : 'null');
    // 异步拉取云端共享数据，成功后覆盖本地并刷新
    CloudData.pull(function(data) {
      var records = Array.isArray(data) ? data : [data];
      if (records.length > 0 && records[0].currentData) {
        var allData = DataStore.loadAll();
        for (var i = 0; i < records.length; i++) {
          var rec = records[i];
          if (rec && rec.currentData && rec.currentData.cities && rec.currentData.cities.length > 0) {
            var dateKey = rec.currentData.date;
            allData[dateKey] = {
              currentData: rec.currentData,
              merchantData: rec.merchantData || { all: { label: '全量商家', cities: rec.currentData.cities } },
              currentMerchant: rec.currentMerchant || 'all',
              fileName: rec.currentData.fileName || ('云端 ' + dateKey)
            };
          }
        }
        localStorage.setItem(DataStore.KEY, JSON.stringify(allData));
        loadFromLocalStorage();
      }
      // 云端拉取失败时如果本地已有数据，已在上面的loadFromLocalStorage()渲染过了
    });
  }

  function loadFromLocalStorage() {
    var skipPush = window.__cloudLoading || false;
    window.__cloudLoading = false;
    const allData = DataStore.loadAll();
    const dates = Object.keys(allData).sort().reverse();
    if (dates.length > 0) {
      const entry = allData[dates[0]];
      if (entry.merchantData) {
        state.merchantData = entry.merchantData;
        state.currentMerchant = entry.currentMerchant || Object.keys(entry.merchantData)[0];
        state.currentData = entry.currentData;
      } else if (entry.cities) {
        state.currentData = entry;
        state.merchantData = { all: { label: '全量商家', cities: entry.cities } };
        state.currentMerchant = 'all';
      } else {
        console.warn('[init] 缓存数据格式异常，请重新上传');
        return;
      }
      onDataLoaded(skipPush);
      renderRawData();
      renderMerchantSelector();
      $('#uploadArea').style.display = 'none';
      $('#uploadSuccess').style.display = 'block';
      $('#uploadFileName').textContent = '已加载本地缓存: ' + (state.currentData.fileName || dates[0]);
      $('#uploadFileInfo').textContent = dates[0] + ' / ' + (state.currentData.cities ? state.currentData.cities.length : 0) + '城市';
    }
  }
  (function() {
  })();
  // Run由main.js的DOMContentLoaded统一调用，避免重复注册事件监听器
  // 暴露关键函数到全局（供外部script使用）
  (function() {
  })();
  try {
    window._app = {
      handleFile: handleFile,
      parseExcelFile: parseExcelFile,
      parseCSVFile: parseCSVFile,
      init: init,
      renderRawData: renderRawData,
      exportExcel: exportExcel,
      exportCSV: exportCSV,
      exportMatrixExcel: exportMatrixExcel,
      initEvents: initEvents,
      DataStore: DataStore,
      state: state,
      showLoading: showLoading,
      onDataLoaded: onDataLoaded
    };
  } catch(e) {
    console.error('[v14] window._app赋值失败:', e);
  }


// ===== ES Module Exports =====


/**
 * 初始化多期对比的日期选择器
 */
function initPeriodSelectors(dates) {
    var sel1 = document.getElementById('periodDate1');
    var sel2 = document.getElementById('periodDate2');
    if (!sel1 || !sel2) return;
    // 移除旧的onchange避免重复绑定
    sel1.onchange = null;
    sel2.onchange = null;
    // 只在有新日期时更新
    if (sel1.options.length === dates.length) return;
    var current1 = sel1.value;
    var current2 = sel2.value;
    sel1.innerHTML = '';
    sel2.innerHTML = '';
    dates.forEach(function(d) {
      var opt1 = document.createElement('option');
      opt1.value = d;
      opt1.textContent = d;
      sel1.appendChild(opt1);
      var opt2 = document.createElement('option');
      opt2.value = d;
      opt2.textContent = d;
      sel2.appendChild(opt2);
    });
    // 默认选倒数第二和最后
    if (dates.length >= 2) {
      sel1.value = dates[dates.length - 2];
      sel2.value = dates[dates.length - 1];
    }
    // 恢复之前的选择
    if (current1 && dates.indexOf(current1) >= 0) sel1.value = current1;
    if (current2 && dates.indexOf(current2) >= 0) sel2.value = current2;
    // [C轮T3修复] 绑定onchange事件，用户选择日期后自动触发多期对比
    sel1.onchange = function() { try { triggerPeriodCompare(); } catch(e) { console.warn('[T3 sel1 onchange]', e.message); } };
    sel2.onchange = function() { try { triggerPeriodCompare(); } catch(e) { console.warn('[T3 sel2 onchange]', e.message); } };
}

/**
 * 手动触发多期对比渲染
 */
function triggerPeriodCompare() {
    try { renderPeriodCompare(); } catch(e) { console.warn('[T3]', e.message); }
}

export { renderMerchantSelector, switchMerchant, refreshDashboard, switchTab,
  switchToDetail, initEvents, renderRawData, init, loadFromLocalStorage,
  renderPeriodCompare, renderEnvOverview, initEnvOverview, renderCostDrillDown,
  initPeriodSelectors, triggerPeriodCompare };

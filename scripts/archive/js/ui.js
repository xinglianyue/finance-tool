// ui.js - ES Module
import { state, $, DataStore } from './core';
import { renderOverviewCharts } from './charts';
import { displayName } from './utils';

  // ===== UI RENDERERS =====
  function showToast(msg, type) {
    const toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;top:20px;right:20px;padding:12px 24px;border-radius:8px;color:var(--text-on-primary,#fff);font-size:14px;z-index:10000;transition:opacity 0.3s;';
    toast.style.background = type === 'error' ? 'var(--danger)' : type === 'warning' ? 'var(--warning)' : 'var(--success)';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
  }

    /* ===== V15: Toast通知系统 ===== */
  var ToastManager = (function() {
    var container = null;
    var MAX_TOASTS = 3;
    var icons = { success: '\u2713', error: '\u2717', warning: '\u26A0', info: '\u2139' };
    var durations = { success: 3000, error: 0, warning: 5000, info: 3000 };

    function init() {
      if (!container) container = document.getElementById('toastContainer');
    }
    function show(type, title, message, options) {
      init();
      options = options || {};
      if (!container) return;
      // 限制最大数量
      while (container.children.length >= MAX_TOASTS) {
        dismiss(container.children[0]);
      }
      var el = document.createElement('div');
      el.className = 'toast toast-' + type;
      var duration = options.duration !== undefined ? options.duration : durations[type];
      var actionHtml = '';
      if (options.action) {
        actionHtml = '<div class="toast-action"><button onclick="this.closest(\'.toast\')._actionHandler()">' + options.action.text + '</button></div>';
      }
      el.innerHTML =
        '<div class="toast-icon">' + (options.icon || icons[type]) + '</div>' +
        '<div class="toast-body">' +
          '<div class="toast-title">' + title + '</div>' +
          (message ? '<div class="toast-message">' + message + '</div>' : '') +
          actionHtml +
        '</div>' +
        '<button class="toast-close" onclick="this.closest(\'.toast\')._dismiss()">&times;</button>' +
        (duration > 0 ? '<div class="toast-progress" style="animation-duration:' + duration + 'ms"></div>' : '');
      if (options.action) el._actionHandler = options.action.handler;
      el._dismiss = function() { dismiss(el); };
      el._startTimer = function() {
        if (duration > 0) {
          el._timer = setTimeout(function() { dismiss(el); }, duration);
        }
      };
      container.appendChild(el);
      el._startTimer();
    }
    function dismiss(el) {
      if (!el || el._dismissed) return;
      el._dismissed = true;
      clearTimeout(el._timer);
      el.classList.add('toast-exit');
      el.addEventListener('animationend', function() {
        if (el.parentNode) el.parentNode.removeChild(el);
      });
    }
    return {
      success: function(title, msg, opts) { show('success', title, msg, opts); },
      error: function(title, msg, opts) { show('error', title, msg, opts); },
      warning: function(title, msg, opts) { show('warning', title, msg, opts); },
      info: function(title, msg, opts) { show('info', title, msg, opts); }
    };
  })();

  /* ===== V15: ConfirmModal (替代confirm) ===== */

  /* ===== V16: Sidebar折叠 ===== */
  (function() {
    var sidebar = document.getElementById('sidebar');
    var collapseBtn = document.getElementById('sidebarCollapseBtn');
    var toggleBtn = document.getElementById('sidebarToggleBtn');
    function toggleSidebar() {
      if (!sidebar) return;
      sidebar.classList.toggle('collapsed');
      var collapsed = sidebar.classList.contains('collapsed');
      localStorage.setItem('finance-sidebar-collapsed', collapsed ? '1' : '0');
      if (collapseBtn) collapseBtn.innerHTML = collapsed ? '<span>&#187;</span>' : '<span>&#171;</span> <span>收起</span>';
      // 触发resize让Chart.js重绘
      window.dispatchEvent(new Event('resize'));
    }
    if (collapseBtn) collapseBtn.addEventListener('click', toggleSidebar);
    if (toggleBtn) toggleBtn.addEventListener('click', toggleSidebar);
    // 恢复折叠状态
    if (localStorage.getItem('finance-sidebar-collapsed') === '1') {
      sidebar.classList.add('collapsed');
      if (collapseBtn) collapseBtn.innerHTML = '<span>&#187;</span>';
    }
  })();

  /* ===== V16: 面包屑导航 ===== */
  var BreadcrumbNav = {
    el: null,
    init: function() { this.el = document.getElementById('breadcrumb'); },
    set: function(items) {
      if (!this.el) return;
      this.el.innerHTML = items.map(function(item, i) {
        var isLast = i === items.length - 1;
        var sep = isLast ? '' : '<span class="breadcrumb-sep">/</span>';
        return '<span class="breadcrumb-item' + (isLast ? ' active' : '') + '"' +
          (item.action ? ' data-action="' + item.action + '"' : '') + '>' + item.label + '</span>' + sep;
      }).join('');
    },
    reset: function() { this.set([{label: '经营概览'}]); }
  };

  function showConfirm(title, message, options) {
    options = options || {};
    return new Promise(function(resolve) {
      var overlay = document.getElementById('confirmOverlay');
      var titleEl = document.getElementById('confirmTitle');
      var msgEl = document.getElementById('confirmMessage');
      var iconEl = document.getElementById('confirmIcon');
      var okBtn = document.getElementById('confirmOk');
      var cancelBtn = document.getElementById('confirmCancel');
      titleEl.textContent = title || '确认操作';
      msgEl.textContent = message || '确定要执行此操作吗？';
      var btnType = options.type || 'warning';
      iconEl.className = 'confirm-modal-icon ' + btnType;
      iconEl.innerHTML = btnType === 'danger' ? '\u2717' : '\u26A0';
      okBtn.className = 'confirm-btn-' + (btnType === 'danger' ? 'danger' : 'ok');
      okBtn.textContent = options.okText || '确定';
      cancelBtn.textContent = options.cancelText || '取消';
      overlay.classList.remove('hidden');
      function cleanup() {
        overlay.classList.add('hidden');
        okBtn.removeEventListener('click', onOk);
        cancelBtn.removeEventListener('click', onCancel);
        overlay.removeEventListener('click', onOverlay);
      }
      function onOk() { cleanup(); resolve(true); }
      function onCancel() { cleanup(); resolve(false); }
      function onOverlay(e) { if (e.target === overlay) { cleanup(); resolve(false); } }
      okBtn.addEventListener('click', onOk);
      cancelBtn.addEventListener('click', onCancel);
      overlay.addEventListener('click', onOverlay);
    });
  }

  /* ===== V17: 表格增强 ===== */
  // 表格密度切换
  var tableDensity = localStorage.getItem('finance-table-density') || 'default';
  function setTableDensity(density) {
    tableDensity = density;
    var containers = document.querySelectorAll('.tab-pane');
    containers.forEach(function(c) {
      c.classList.remove('table-compact', 'table-comfortable');
      if (density !== 'default') c.classList.add('table-' + density);
    });
    localStorage.setItem('finance-table-density', density);
    document.querySelectorAll('.table-density-toggle button').forEach(function(b) {
      b.classList.toggle('active', b.dataset.density === density);
    });
  }

  // 表格列固定（为第一列城市列添加sticky）
  function initTableStickyCols() {
    document.querySelectorAll('.data-table').forEach(function(table) {
      if (table._stickyInit) return;
      var firstTh = table.querySelector('thead tr th:first-child');
      if (firstTh) {
        firstTh.classList.add('sticky-col');
        table.querySelectorAll('tbody tr').forEach(function(row) {
          var firstTd = row.querySelector('td:first-child');
          if (firstTd) firstTd.classList.add('sticky-col');
        });
      }
      table._stickyInit = true;
    });
  }

  // 表格单元格复制
  function initTableCellCopy() {
    document.querySelectorAll('.data-table').forEach(function(table) {
      if (table._copyInit) return;
      table.addEventListener('click', function(e) {
        var td = e.target.closest('td');
        if (!td) return;
        var text = td.textContent.trim();
        if (!text) return;
        navigator.clipboard.writeText(text).then(function() {
          // 浮动提示"已复制"
          var tip = document.createElement('div');
          tip.className = 'cell-copied';
          tip.textContent = '已复制';
          var rect = td.getBoundingClientRect();
          tip.style.left = rect.left + rect.width / 2 - 20 + 'px';
          tip.style.top = rect.top - 30 + 'px';
          tip.style.position = 'fixed';
          document.body.appendChild(tip);
          setTimeout(function() { tip.remove(); }, 800);
        });
      });
      table._copyInit = true;
    });
  }

  function showLoading(show) {
    $('#loadingOverlay').classList.toggle('show', show);
  }
  function onDataLoaded(skipPush) {
    window.renderMerchantSelector();
    // V16: 渲染KPI卡片
    try { if (typeof renderKPICards === 'function') window.renderKPICards(state.currentData); } catch(e) {}
    // V18: 渲染AI洞察
    try { if (typeof renderAIInsights === 'function') window.renderAIInsights(state.currentData); } catch(e) {}
    // V17: 初始化表格增强
    setTimeout(function() {
      try { if (typeof initTableStickyCols === 'function') initTableStickyCols(); } catch(e) {}
      try { if (typeof initTableCellCopy === 'function') initTableCellCopy(); } catch(e) {}
      try { if (typeof setTableDensity === 'function') setTableDensity(tableDensity || 'default'); } catch(e) {}
    }, 300);
    // Init selected cities
    state.selectedCities = new Set(state.currentData.cities.map(c => c.name));
    // Update date selector
    updateDateSelector();
    // Show dashboard
    $('#welcomeState').classList.add('hidden');
    $('#dashboardState').classList.remove('hidden');
    // Render
    renderCityFilters();
    window.renderStatCards();
    window.renderMatrix();
    window.renderAnomalyAlert();
    // Render overview charts (UE对比 + 成本构成)
    try {
      var filtered = window.getFilteredCities().filter(function(c) { return c.name !== '总商'; });
      var module = state.detailModule || 'all';
      renderOverviewCharts(filtered, module);
      var chartsEl = document.getElementById('overviewCharts');
      if (chartsEl) chartsEl.style.display = '';
    } catch(e) { console.warn('[overviewCharts]', e.message); }
    // Init detail tab
    if (state.currentData.cities.length > 0 && !state.detailCity) {
      state.detailCity = state.currentData.cities[0].name;
    }
    window.updateDetailSelectors();
    window.renderDetailTab();
    window.renderRawData();
    window.renderCostStructure();
    // Update date display
    $('#dateDisplay').textContent = state.currentData.date;
    // 数据同步已改为db-sync.py自动推送，前端不再手动push
  }
  function updateDateSelector() {
    const allData = DataStore.loadAll();
    const dates = Object.keys(allData).sort().reverse();
    const sel = $('#dateSelect');
    sel.innerHTML = '';
    for (const d of dates) {
      const opt = document.createElement('option');
      opt.value = d;
      // 从文件名提取账单日期用于显示
      var fn = allData[d].fileName || '';
      var billDate = '';
      var m = fn.match(/(\d{4})[年-](\d{1,2})[月-](\d{1,2})/);
      if (m) { billDate = m[1] + '-' + m[2].padStart(2,'0') + '-' + m[3].padStart(2,'0'); }
      if (billDate && billDate !== d) {
        opt.textContent = d + ' (账单周期 ' + billDate + ')';
      } else {
        opt.textContent = d + ' (账单周期 ' + d + ')';
      }
      if (state.currentData && state.currentData.date === d) opt.selected = true;
      sel.appendChild(opt);
    }
  }
  function renderCityFilters() {
    const container = $('#cityFilters');
    container.innerHTML = '';
    for (const city of state.currentData.cities) {
      const label = document.createElement('label');
      label.className = 'city-filter-item';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = city.name;
      cb.checked = state.selectedCities.has(city.name);
      cb.addEventListener('change', () => {
        if (cb.checked) state.selectedCities.add(city.name);
        else state.selectedCities.delete(city.name);
        window.refreshDashboard();
      });
      label.appendChild(cb);
      label.appendChild(document.createTextNode(city.displayName));
      container.appendChild(label);
    }
  }
  function getFilteredCities() {
    if (!state.currentData) return [];
    return state.currentData.cities.filter(c => state.selectedCities.has(c.name));
  }
  


// ===== ES Module Exports =====
export { showToast, showLoading, ToastManager, showConfirm, onDataLoaded, getFilteredCities, renderCityFilters, updateDateSelector };

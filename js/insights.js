// insights.js - ES Module
// Phase 3.2: 统一洞察入口 (generateAIInsights → 委托 generateInsights)
// 原独立逻辑已迁移到analysis.js generateInsights (4层分层引擎)
import { generateInsights, renderInsightsPanel } from './analysis';
import { DataStore } from './core';
import { getFilteredCities } from './ui';

// 统一洞察入口: 旧API保持兼容, 委托给analysis.js的4层引擎
function generateAIInsights(data) {
  if (!data || !data.cities || data.cities.length === 0) return '';
  try {
    var filtered = data.cities;
    var mod = 'all';
    var history = DataStore ? DataStore.loadAll() : {};
    var allHistory = Object.keys(history).sort().map(function(d) { return history[d]; });
    var insights = generateInsights(filtered, mod, allHistory);
    if (insights && insights.length > 0) {
      return JSON.stringify(insights);
    }
    return '';
  } catch(e) {
    return '';
  }
}

// 兼容: 原renderAIInsights也委托给统一渲染
function renderAIInsights(data) {
  if (!data) return;
  try {
    var filtered = data.cities || [];
    var mod = 'all';
    var history = DataStore ? DataStore.loadAll() : {};
    var allHistory = Object.keys(history).sort().map(function(d) { return history[d]; });
    var insights = generateInsights(filtered, mod, allHistory);
    renderInsightsPanel(insights);
  } catch(e) {}
}

// 帮助面板
var helpBtn = document.getElementById('navHelpBtn');
var helpPanel = document.getElementById('helpPanel');
if (helpBtn && helpPanel) {
  helpBtn.addEventListener('click', function() {
    helpPanel.classList.toggle('visible');
  });
  document.addEventListener('click', function(e) {
    if (helpPanel.classList.contains('visible') && !helpPanel.contains(e.target) && e.target !== helpBtn) {
      helpPanel.classList.remove('visible');
    }
  });
}

// Ctrl+B 折叠sidebar
document.addEventListener('keydown', function(e) {
  if (e.ctrlKey && e.key === 'b') {
    e.preventDefault();
    var sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.toggle('collapsed');
  }
  if (e.ctrlKey && e.key === 'k') {
    e.preventDefault();
    var searchInput = document.getElementById('globalSearch');
    if (searchInput) searchInput.focus();
  }
});



// ===== ES Module Exports =====
export { generateAIInsights, renderAIInsights };

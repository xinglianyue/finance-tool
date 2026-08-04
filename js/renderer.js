/**
 * 渲染模块
 * 负责所有UI渲染逻辑
 */

/**
 * 渲染维度下钻表格
 */
function renderDimensionTable() {
  console.log('[renderDimensionTable] 开始渲染维度表格');
  
  let allMerchantData = null;
  
  // 优先级1: 从全局变量获取
  if (window.allMerchantData) {
    allMerchantData = window.allMerchantData;
    console.log('[renderDimensionTable] 从 window.allMerchantData 获取数据');
  }
  // 优先级2: 从缓存获取
  else if (window.financeToolCache) {
    const currentMonthLabel = window.importHistory && window.importHistory[window.currentImportIndex] 
      ? window.importHistory[window.currentImportIndex].monthLabel 
      : null;
    
    if (currentMonthLabel && window.financeToolCache[currentMonthLabel]) {
      allMerchantData = window.financeToolCache[currentMonthLabel];
      console.log('[renderDimensionTable] 从 financeToolCache 获取兜底数据:', currentMonthLabel);
    }
  }
  // 优先级3: 从云端数据获取
  else if (window.cloudData && window.cloudData.length > 0) {
    allMerchantData = window.cloudData[window.cloudData.length - 1].merchantData;
    console.log('[renderDimensionTable] 从 cloudData 获取兜底数据');
  }
  
  // 检查数据是否存在
  if (!allMerchantData || Object.keys(allMerchantData).length === 0) {
    console.error('[renderDimensionTable]: 无法获取任何数据源，allMerchantData 为 null');
    showToast('数据未加载，请先选择有效月份', 'warning');
    
    const tableEl = document.getElementById('dimensionTable');
    if (tableEl) {
      tableEl.innerHTML = '<div style="padding: 20px; text-align: center; color: red;">无法显示数据表，没有找到可用的商家数据</div>';
    }
    return;
  }
  
  console.log('[App] renderDimensionTable: 取得 allMerchantData, keys:', Object.keys(allMerchantData));
  
  // 获取实际存在的商家类型
  const availableMerchantTypes = Object.keys(allMerchantData);
  console.log('[App] 实际可用的商家类型:', availableMerchantTypes);
  
  // 为每种商家类型分配颜色
  const typeStyles = {
    all: { bg: 'var(--primary-bg)', label: '全部' },
    ka: { bg: 'var(--positive-bg)', label: 'KA' },
    city: { bg: 'var(--warning-bg)', label: '城市' }
  };
  
  // 处理未知类型，使用默认样式
  const getTypeStyle = (type) => {
    return typeStyles[type] || { bg: 'var(--bg-hover)', label: type };
  };
  
  // 获取当前选中的商家类型
  const currentType = window.currentMerchantType || 'all';
  const currentTypeStyle = getTypeStyle(currentType);
  
  // 构建表格HTML
  let html = '<div class="dimension-table-container">';
  
  // 表格头部
  html += '<table class="dimension-table">';
  html += '<thead><tr>';
  html += '<th>指标</th>';
  html += `<th class="type-header" style="background:${currentTypeStyle.bg}">${currentTypeStyle.label}</th>`;
  html += '</tr></thead>';
  
  // 表格主体
  html += '<tbody>';
  
  // 获取所有指标键（排除cities等特殊字段）
  const metricKeys = Object.keys(allMerchantData[currentType] || {})
    .filter(key => key !== 'cities' && key !== 'name')
    .slice(0, 20); // 限制显示前20个指标
  
  metricKeys.forEach(key => {
    const value = allMerchantData[currentType][key];
    const formattedValue = formatNumber(value);
    
    html += '<tr>';
    html += `<td class="metric-name">${key}</td>`;
    html += `<td class="metric-value" style="background:${currentTypeStyle.bg}">${formattedValue}</td>`;
    html += '</tr>';
  });
  
  html += '</tbody>';
  html += '</table>';
  
  // 商家类型切换按钮
  html += '<div class="merchant-type-tabs">';
  availableMerchantTypes.forEach(type => {
    const style = getTypeStyle(type);
    const isActive = type === currentType ? ' active' : '';
    html += `<button class="type-tab${isActive}" data-type="${type}" 
              style="${isActive ? 'background:' + style.bg : ''}">
              ${style.label}
            </button>`;
  });
  html += '</div>';
  
  html += '</div>';
  
  // 更新DOM
  const tableContainer = document.getElementById('dimensionTable');
  if (tableContainer) {
    tableContainer.innerHTML = html;
    
    // 绑定类型切换事件
    document.querySelectorAll('.type-tab').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const type = e.target.dataset.type;
        window.currentMerchantType = type;
        renderDimensionTable(); // 重新渲染
      });
    });
  }
  
  console.log('[renderDimensionTable] 渲染完成');
}

/**
 * 渲染概览页面
 */
function renderOverview() {
  console.log('[renderOverview] 开始渲染概览页面');
  
  if (!window.allMerchantData) {
    console.warn('[renderOverview] 没有数据，跳过渲染');
    return;
  }
  
  // TODO: 实现概览页面渲染逻辑
  console.log('[renderOverview] 概览页面渲染功能待实现');
}

/**
 * 渲染趋势分析页面
 */
function renderTrend() {
  console.log('[renderTrend] 开始渲染趋势分析页面');
  
  if (!window.allMerchantData) {
    console.warn('[renderTrend] 没有数据，跳过渲染');
    return;
  }
  
  // TODO: 实现趋势分析渲染逻辑
  console.log('[renderTrend] 趋势分析页面渲染功能待实现');
}

/**
 * 渲染敏感性分析页面
 */
function renderSensitivity() {
  console.log('[renderSensitivity] 开始渲染敏感性分析页面');
  
  if (!window.allMerchantData) {
    console.warn('[renderSensitivity] 没有数据，跳过渲染');
    return;
  }
  
  // TODO: 实现敏感性分析渲染逻辑
  console.log('[renderSensitivity] 敏感性分析页面渲染功能待实现');
}

/**
 * 渲染城市排名表格
 */
function renderCityRankTable() {
  console.log('[renderCityRankTable] 开始渲染城市排名表格');
  
  if (!window.allMerchantData || !window.allMerchantData.cities) {
    console.warn('[renderCityRankTable] 没有城市数据，跳过渲染');
    return;
  }
  
  // TODO: 实现城市排名表格渲染逻辑
  console.log('[renderCityRankTable] 城市排名表格渲染功能待实现');
}

// 导出（如果使用模块化环境）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    renderDimensionTable,
    renderOverview,
    renderTrend,
    renderSensitivity,
    renderCityRankTable
  };
}
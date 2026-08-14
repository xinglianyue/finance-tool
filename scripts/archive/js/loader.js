/**
 * 数据加载模块
 * 负责从云端和本地加载数据
 */

/**
 * 从云端加载数据（V3混合存储模式）
 * @async
 * @returns {Promise<Object>} V3格式的数据对象
 */
async function loadFromCloud() {
  console.log('[App] 开始从云端加载数据 (V3混合存储模式)');
  
  try {
    // 首先尝试从本地缓存加载
    const localData = DataStore.load();
    
    if (localData && localData.version === 3) {
      console.log('[App] 本地缓存存在且为V3版本，检查是否需要更新');
      
      // 检查云端是否有更新
      const hasUpdate = await checkCloudForUpdates(localData);
      
      if (!hasUpdate) {
        console.log('[App] 本地数据已是最新，无需更新');
        return localData;
      }
      
      console.log('[App] 检测到云端有更新，开始下载...');
    }
    
    // 从云端下载完整数据
    console.log('[App] 正在从云端加载数据...');
    
    // 并发获取索引和完整数据
    const [indexResponse, dataResponse] = await Promise.all([
      fetch('./index.json'),
      fetch('./shared-data.json')
    ]);
    
    if (!indexResponse.ok || !dataResponse.ok) {
      throw new Error(`HTTP error! status: ${indexResponse.status}, ${dataResponse.status}`);
    }
    
    const cloudIndex = await indexResponse.json();
    const cloudRecords = await dataResponse.json();
    
    console.log('[App] 云端数据加载成功，共', cloudRecords.length, '条记录');
    
    // 构建V3数据
    const v3Data = buildV3Data(cloudRecords, cloudIndex);
    
    // 保存到本地
    DataStore.save(v3Data);
    
    console.log('[App] 云端数据已保存到本地，共', v3Data.importHistory.length, '条历史记录');
    
    return v3Data;
    
  } catch (error) {
    console.error('[App] 云端数据加载失败:', error);
    throw error;
  }
}

/**
 * 切换导入月份
 * @async
 * @param {number} idx - 导入历史索引
 */
async function switchImportDate(idx) {
  idx = parseInt(idx);
  
  const currentData = DataStore.load();
  
  if (!currentData || !currentData.importHistory || idx < 0 || idx >= currentData.importHistory.length) {
    console.error('[App] 无效的日期切换索引:', idx);
    showToast('数据不可用', 'error');
    return;
  }
  
  const selectedDate = currentData.importHistory[idx].monthLabel;
  
  // 检查缓存
  const cachedData = DataStore.getCache(selectedDate);
  if (cachedData) {
    console.log('[App] 从缓存加载数据:', selectedDate);
    updateUIWithMerchantData(cachedData);
    return;
  }
  
  // 从云端加载
  showToast('正在加载 ' + selectedDate + ' 的数据...', 'info');
  
  try {
    const response = await fetch('./shared-data.json');
    const cloudRecords = await response.json();
    
    const record = cloudRecords.find(r => r.date === selectedDate);
    if (!record) {
      throw new Error('未找到日期 ' + selectedDate + ' 的数据记录');
    }
    
    const merchantData = parseRecord(record);
    
    // 缓存数据
    DataStore.setCache(selectedDate, merchantData);
    
    // 更新UI
    updateUIWithMerchantData(merchantData);
    
    showToast('已加载 ' + selectedDate + ' 的数据', 'success');
    
  } catch (error) {
    console.error('[App] 加载历史数据失败:', error);
    showToast('加载失败: ' + error.message, 'error');
  }
}

/**
 * 检查云端是否有更新
 * @async
 * @param {Object} localData - 本地数据
 * @returns {Promise<boolean>} 是否有更新
 */
async function checkCloudForUpdates(localData) {
  try {
    const response = await fetch('./index.json');
    if (!response.ok) return false;
    
    const cloudIndex = await response.json();
    
    // 比较版本号
    const localVersion = localData.metadata?.cloudVersion || '0';
    const cloudVersion = cloudIndex.version || '0';
    
    if (parseInt(cloudVersion) > parseInt(localVersion)) {
      console.log('[App] 云端版本更高，需要更新:', localVersion, '->', cloudVersion);
      return true;
    }
    
    // 比较日期列表
    const localDates = new Set(localData.metadata?.availableDates || []);
    const cloudDates = new Set(cloudIndex.records?.map(r => r.date) || []);
    
    const newDates = [...cloudDates].filter(d => !localDates.has(d));
    if (newDates.length > 0) {
      console.log('[App] 发现新日期:', newDates);
      return true;
    }
    
    return false;
    
  } catch (error) {
    console.error('[App] 检查更新失败:', error);
    return false;
  }
}

/**
 * 构建V3格式数据
 * @param {Array} cloudRecords - 云端记录数组
 * @param {Object} cloudIndex - 云端索引
 * @returns {Object} V3格式数据
 */
function buildV3Data(cloudRecords, cloudIndex) {
  const metadata = {
    lastSyncAt: new Date().toISOString(),
    cloudVersion: cloudIndex?.version || 'v1',
    availableDates: cloudIndex?.records?.map(r => r.date) || []
  };
  
  // 解析第一条记录作为当前数据
  const currentData = parseRecord(cloudRecords[0]);
  
  // 构建缓存（最近3条）
  const cache = {};
  cloudRecords.slice(0, 3).forEach(record => {
    cache[record.date] = parseRecord(record);
  });
  
  // 构建导入历史
  const importHistory = cloudRecords.map(record => ({
    monthLabel: record.date,
    data: null,
    importedAt: record.updatedAt || record.date,
    fileName: record.fileName || ''
  }));
  
  return {
    version: 3,
    metadata,
    currentData,
    cache,
    importHistory,
    currentImportIndex: 0,
    currentMerchantType: 'all'
  };
}

/**
 * 使用解析后的数据更新UI
 * @param {Object} merchantData - 商户数据
 */
function updateUIWithMerchantData(merchantData) {
  window.allMerchantData = merchantData;
  window.StateManager.syncToGlobals();
  
  // 触发状态更新
  window.StateManager.updateState({
    hasData: true,
    currentImportIndex: window.currentImportIndex || 0,
    currentMerchantType: window.currentMerchantType || 'all'
  });
  
  // 重新渲染所有标签页
  const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab || 'overview';
  switch (activeTab) {
    case 'overview':
      renderOverview();
      break;
    case 'dimension':
      renderDimensionTable();
      break;
    case 'trend':
      renderTrend();
      break;
    case 'sensitivity':
      renderSensitivity();
      break;
  }
}

// 导出（如果使用模块化环境）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    loadFromCloud,
    switchImportDate,
    checkCloudForUpdates,
    buildV3Data,
    updateUIWithMerchantData
  };
}
/**
 * 状态管理模块
 * 管理应用全局状态和订阅发布机制
 */

class StateManager {
  constructor() {
    this.state = {
      hasData: false,
      historyCount: 0,
      selectedCities: [],
      currentImportIndex: 0,
      currentMerchantType: 'all',
      cacheSize: 0
    };
    this.subscribers = new Map();
  }

  /**
   * 初始化状态
   * @param {Object} initialData - 初始数据
   */
  initialize(initialData) {
    console.log('[StateManager] 初始化状态...');
    
    // 从 initialData.allMerchantData 字段加载（优先级最高）
    if (initialData && initialData.allMerchantData) {
      window.allMerchantData = initialData.allMerchantData;
      console.log('[StateManager] 从 initialData.allMerchantData 字段加载（优先级最高）');
    } 
    // 其次从 window.allMerchantData 加载
    else if (window.allMerchantData) {
      console.log('[StateManager] 从 window.allMerchantData 加载');
    }
    // 最后尝试从 DataStore 缓存加载
    else {
      const cached = DataStore.load();
      if (cached && cached.currentData) {
        window.allMerchantData = cached.currentData;
        console.log('[StateManager] 从 DataStore 缓存加载');
      }
    }

    // 设置导入历史
    if (initialData && initialData.importHistory) {
      window.importHistory = initialData.importHistory;
    } else if (window.importHistory) {
      // 保持现有
    } else {
      window.importHistory = [];
    }

    // 同步到全局变量
    this.syncToGlobals();

    // 更新状态
    this.state.hasData = !!window.allMerchantData;
    this.state.historyCount = window.importHistory?.length || 0;
    this.state.cacheSize = Object.keys(DataStore.getCache() || {}).length;

    console.log('[StateManager] 状态初始化完成', this.state);
    
    // 触发初始化事件
    this.notify('init', this.state);
  }

  /**
   * 同步状态到全局变量
   */
  syncToGlobals() {
    // 确保全局变量存在
    if (!window.allMerchantData) {
      window.allMerchantData = null;
    }
    if (!window.importHistory) {
      window.importHistory = [];
    }
    console.log('[StateManager] 全局变量已同步，allMerchantData:', !!window.allMerchantData);
  }

  /**
   * 订阅状态变更
   * @param {string} event - 事件名称
   * @param {Function} callback - 回调函数
   */
  subscribe(event, callback) {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, []);
    }
    this.subscribers.get(event).push(callback);
  }

  /**
   * 通知状态变更
   * @param {string} event - 事件名称
   * @param {Object} data - 事件数据
   */
  notify(event, data = {}) {
    console.log(`[StateManager] 状态变更订阅触发: ${event}`);
    const callbacks = this.subscribers.get(event) || [];
    callbacks.forEach(callback => {
      try {
        callback(data);
      } catch (e) {
        console.error(`[StateManager] 回调执行失败 (${event}):`, e);
      }
    });
  }

  /**
   * 获取当前状态
   * @returns {Object} 当前状态
   */
  getState() {
    return { ...this.state };
  }

  /**
   * 更新状态
   * @param {Object} updates - 状态更新
   */
  updateState(updates) {
    this.state = { ...this.state, ...updates };
    this.notify('state_change', this.state);
  }

  /**
   * 清除所有订阅
   */
  clearSubscribers() {
    this.subscribers.clear();
  }
}

// 创建全局实例（只在未定义时创建）
if (!window.StateManager) {
  window.StateManager = new StateManager();
  console.log('[StateManager] 全局实例已创建');
} else {
  console.log('[StateManager] 全局实例已存在，跳过创建');
}

// 导出（如果使用模块化环境）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StateManager;
}

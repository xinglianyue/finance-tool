/**
 * 状态管理器 - StateManager
 * 负责应用状态的统一管理、变更通知和验证
 */

const StateManager = {
  // 状态存储
  _state: {
    // 数据相关
    currentData: null,          // 当前显示的数据
    allMerchantData: null,     // 所有商家数据
    importHistory: [],          // 导入历史
    currentImportIndex: 0,      // 当前选中的导入索引
    currentMerchantType: 'all', // 当前商家类型
    
    // UI相关
    currentTab: 'overview',     // 当前Tab
    selectedCities: [],         // 选中的城市
    currentModule: 'all',      // 当前业务模块
    
    // 状态标志
    isLoading: false,
    isDirty: false,            // 是否有未保存的更改
    lastError: null            // 最后一次错误
  },
  
  // 订阅者列表
  _subscribers: {},
  
  /**
   * 初始化状态
   * @param {Object} initialData - 初始数据（从DataStore加载）
   */
  init(initialData) {
    console.log('[StateManager] 初始化状态...');
    
    if (initialData) {
      this._state.currentData = initialData.currentData || null;
      this._state.allMerchantData = initialData.allMerchantData || null;
      this._state.importHistory = initialData.importHistory || [];
      this._state.currentImportIndex = initialData.currentImportIndex || 0;
      this._state.currentMerchantType = initialData.currentMerchantType || 'all';
    }
    
    // 设置默认选中的城市
    if (this._state.currentData?.cities?.length > 0) {
      this._state.selectedCities = this._state.currentData.cities.slice(0, 3).map(c => c.name);
    }
    
    this._state.isDirty = false;
    this._state.lastError = null;
    
    console.log('[StateManager] 状态初始化完成', {
      hasData: !!this._state.currentData,
      historyCount: this._state.importHistory.length,
      selectedCities: this._state.selectedCities
    });
    
    // 通知所有订阅者
    this._notify('init', this._state);
  },
  
  /**
   * 获取状态值
   * @param {string} key - 状态键名
   * @returns {*} - 状态值
   */
  get(key) {
    if (key === undefined) {
      return { ...this._state };
    }
    return this._state[key];
  },
  
  /**
   * 设置状态值
   * @param {string|Object} key - 键名或包含多个键值对的对象
   * @param {*} value - 要设置的值（如果key是字符串）
   * @param {boolean} save - 是否立即保存到localStorage
   */
  set(key, value, save = false) {
    const oldState = { ...this._state };
    
    // 支持批量设置
    if (typeof key === 'object') {
      Object.keys(key).forEach(k => {
        this._state[k] = key[k];
      });
    } else {
      this._state[key] = value;
    }
    
    // 标记为脏
    this._state.isDirty = true;
    
    // 通知订阅者
    this._notify(key, this._state[key], oldState[key]);
    
    // 如果需要，立即保存
    if (save) {
      this.save();
    }
  },
  
  /**
   * 获取需要保存的数据
   * @returns {Object} - 需要持久化的数据
   */
  getDataToSave() {
    return {
      currentData: this._state.currentData,
      allMerchantData: this._state.allMerchantData,
      importHistory: this._state.importHistory,
      currentImportIndex: this._state.currentImportIndex,
      currentMerchantType: this._state.currentMerchantType
    };
  },
  
  /**
   * 保存数据
   */
  save() {
    const data = this.getDataToSave();
    const success = DataStore.save(data);
    
    if (success) {
      this._state.isDirty = false;
      console.log('[StateManager] 数据已保存');
    } else {
      this._state.lastError = '保存失败';
      console.error('[StateManager] 数据保存失败');
    }
    
    return success;
  },
  
  /**
   * 添加导入记录
   * @param {Object} record - 导入记录
   */
  addImportRecord(record) {
    // 检查是否已存在相同日期的记录
    const existingIndex = this._state.importHistory.findIndex(
      r => r.monthLabel === record.monthLabel
    );
    
    if (existingIndex >= 0) {
      // 更新现有记录
      this._state.importHistory[existingIndex] = {
        ...record,
        updatedAt: new Date().toISOString()
      };
      console.log(`[StateManager] 更新了已有记录: ${record.monthLabel}`);
    } else {
      // 添加新记录
      this._state.importHistory.push({
        ...record,
        importedAt: new Date().toISOString()
      });
      console.log(`[StateManager] 添加了新记录: ${record.monthLabel}`);
    }
    
    // 切换到新添加的记录
    const newIndex = this._state.importHistory.findIndex(
      r => r.monthLabel === record.monthLabel
    );
    this._state.currentImportIndex = newIndex;
    this._state.allMerchantData = record.data;
    
    // 更新currentData
    this._updateCurrentDataFromAllMerchantData();
    
    // 保存
    this.save();
    
    // 通知订阅者
    this._notify('importHistory', this._state.importHistory);
    this._notify('currentImportIndex', this._state.currentImportIndex);
    this._notify('allMerchantData', this._state.allMerchantData);
  },
  
  /**
   * 切换导入日期
   * @param {number} index - 要切换到的索引
   */
  switchImportDate(index) {
    index = parseInt(index);
    
    if (index < 0 || index >= this._state.importHistory.length) {
      console.warn(`[StateManager] 无效的索引: ${index}`);
      return false;
    }
    
    this._state.currentImportIndex = index;
    const record = this._state.importHistory[index];
    this._state.allMerchantData = record.data;
    
    // 更新currentData
    this._updateCurrentDataFromAllMerchantData();
    
    // 通知订阅者
    this._notify('currentImportIndex', index);
    this._notify('allMerchantData', this._state.allMerchantData);
    this._notify('currentData', this._state.currentData);
    
    console.log(`[StateManager] 切换到: ${record.monthLabel}`);
    return true;
  },
  
  /**
   * 切换商家类型
   * @param {string} type - 商家类型
   */
  switchMerchantType(type) {
    if (!this._state.allMerchantData || !this._state.allMerchantData[type]) {
      console.warn(`[StateManager] 不存在的商家类型: ${type}`);
      return false;
    }
    
    this._state.currentMerchantType = type;
    this._updateCurrentDataFromAllMerchantData();
    
    // 保存选择
    this.save();
    
    // 通知订阅者
    this._notify('currentMerchantType', type);
    this._notify('currentData', this._state.currentData);
    
    console.log(`[StateManager] 切换商家类型: ${type}`);
    return true;
  },
  
  /**
   * 从allMerchantData更新currentData
   * @private
   */
  _updateCurrentDataFromAllMerchantData() {
    const merchantResult = this._state.allMerchantData?.[this._state.currentMerchantType];
    if (!merchantResult) return;
    
    let totalData = null;
    let citiesData = [];
    
    merchantResult.cities?.forEach(city => {
      if (city.name === '总商') {
        totalData = city;
      } else {
        citiesData.push(city);
      }
    });
    
    this._state.currentData = {
      totals: totalData ? (totalData.modules?.all || {}) : {},
      cities: citiesData
    };
    
    // 更新选中的城市
    if (citiesData.length > 0 && this._state.selectedCities.length === 0) {
      this._state.selectedCities = citiesData.slice(0, 3).map(c => c.name);
    }
  },
  
  /**
   * 订阅状态变更
   * @param {string} key - 要订阅的状态键名，'*'表示所有
   * @param {Function} callback - 回调函数
   * @returns {Function} - 取消订阅的函数
   */
  subscribe(key, callback) {
    if (!this._subscribers[key]) {
      this._subscribers[key] = [];
    }
    
    this._subscribers[key].push(callback);
    
    // 返回取消订阅的函数
    return () => {
      this._subscribers[key] = this._subscribers[key].filter(fn => fn !== callback);
    };
  },
  
  /**
   * 通知订阅者
   * @private
   */
  _notify(key, newValue, oldValue) {
    // 通知指定键的订阅者
    if (this._subscribers[key]) {
      this._subscribers[key].forEach(fn => fn(newValue, oldValue));
    }
    
    // 通知通配符订阅者
    if (this._subscribers['*']) {
      this._subscribers['*'].forEach(fn => fn(key, newValue, oldValue));
    }
  },
  
  /**
   * 验证状态完整性
   * @returns {Object} - { valid: boolean, issues: string[] }
   */
  validate() {
    const issues = [];
    
    if (!this._state.currentData) {
      issues.push('currentData为空');
    }
    
    if (!this._state.allMerchantData) {
      issues.push('allMerchantData为空');
    }
    
    if (this._state.importHistory.length === 0) {
      issues.push('没有导入历史');
    }
    
    if (this._state.currentImportIndex >= this._state.importHistory.length) {
      issues.push('currentImportIndex超出范围');
    }
    
    return {
      valid: issues.length === 0,
      issues
    };
  },
  
  /**
   * 获取状态摘要
   * @returns {Object} - 状态摘要
   */
  getSummary() {
    return {
      hasData: !!this._state.currentData,
      historyCount: this._state.importHistory.length,
      currentMerchantType: this._state.currentMerchantType,
      currentModule: this._state.currentModule,
      selectedCities: this._state.selectedCities,
      isDirty: this._state.isDirty,
      lastError: this._state.lastError,
      validation: this.validate()
    };
  },
  
  /**
   * 重置状态
   */
  reset() {
    this._state = {
      currentData: null,
      allMerchantData: null,
      importHistory: [],
      currentImportIndex: 0,
      currentMerchantType: 'all',
      currentTab: 'overview',
      selectedCities: [],
      currentModule: 'all',
      isLoading: false,
      isDirty: false,
      lastError: null
    };
    
    this._notify('reset', this._state);
    console.log('[StateManager] 状态已重置');
  }
};

// 导出供外部使用
window.StateManager = StateManager;

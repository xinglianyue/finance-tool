/**
 * 数据存储模块
 * 管理本地缓存和持久化存储
 */

class DataStore {
  constructor() {
    this.STORAGE_KEY = 'finance-tool';
    this.BACKUP_KEY = 'finance-tool-backup';
    this.CACHE_PREFIX = 'cache_';
  }

  /**
   * 加载数据
   * @returns {Object} 当前状态对象
   */
  load() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('[DataStore] 加载数据失败:', e);
    }
    return null;
  }

  /**
   * 保存数据
   * @param {Object} data - 要保存的数据
   * @returns {boolean} 是否成功
   */
  save(data) {
    try {
      // 备份当前数据
      const current = this.load();
      if (current) {
        localStorage.setItem(this.BACKUP_KEY, JSON.stringify(current));
      }
      
      // 保存新数据
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
      console.log(`[DataStore] 数据已保存，大小${new Blob([JSON.stringify(data)]).size}B`);
      return true;
    } catch (e) {
      console.error('[DataStore] 保存数据失败:', e);
      return false;
    }
  }

  /**
   * 获取缓存
   * @param {string} date - 日期键
   * @returns {Object|null} 缓存数据
   */
  getCache(date) {
    try {
      const key = `${this.CACHE_PREFIX}${date}`;
      const cached = localStorage.getItem(key);
      return cached ? JSON.parse(cached) : null;
    } catch (e) {
      console.error(`[DataStore] 读取缓存失败 (${date}):`, e);
      return null;
    }
  }

  /**
   * 设置缓存
   * @param {string} date - 日期键
   * @param {Object} data - 缓存数据
   * @returns {boolean} 是否成功
   */
  setCache(date, data) {
    try {
      const key = `${this.CACHE_PREFIX}${date}`;
      localStorage.setItem(key, JSON.stringify(data));
      console.log(`[DataStore] 缓存已设置: ${date}`);
      return true;
    } catch (e) {
      console.error(`[DataStore] 设置缓存失败 (${date}):`, e);
      return false;
    }
  }

  /**
   * 清除缓存
   * @param {string} [date] - 指定日期，不传则清除所有
   * @returns {boolean} 是否成功
   */
  clearCache(date) {
    try {
      if (date) {
        const key = `${this.CACHE_PREFIX}${date}`;
        localStorage.removeItem(key);
      } else {
        // 清除所有缓存
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(this.CACHE_PREFIX)) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
      }
      console.log('[DataStore] 缓存已清除');
      return true;
    } catch (e) {
      console.error('[DataStore] 清除缓存失败:', e);
      return false;
    }
  }

  /**
   * 清除所有数据
   * @returns {boolean} 是否成功
   */
  clearAll() {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      localStorage.removeItem(this.BACKUP_KEY);
      this.clearCache();
      console.log('[DataStore] 所有数据已清除');
      return true;
    } catch (e) {
      console.error('[DataStore] 清除数据失败:', e);
      return false;
    }
  }

  /**
   * 获取存储信息
   * @returns {Object} 存储统计信息
   */
  getStorageInfo() {
    const info = {
      mainData: null,
      backupData: null,
      cacheCount: 0,
      totalSize: 0
    };

    try {
      const main = localStorage.getItem(this.STORAGE_KEY);
      const backup = localStorage.getItem(this.BACKUP_KEY);
      
      info.mainData = main ? JSON.parse(main) : null;
      info.backupData = backup ? JSON.parse(backup) : null;
      
      // 计算缓存数量
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.CACHE_PREFIX)) {
          info.cacheCount++;
          info.totalSize += localStorage.getItem(key).length;
        }
      }
    } catch (e) {
      console.error('[DataStore] 获取存储信息失败:', e);
    }

    return info;
  }
}

// 创建全局实例（只在未定义时创建）
if (!window.DataStore) {
  window.DataStore = new DataStore();
  console.log('[DataStore] 从 data-store.js 初始化');
} else {
  console.log('[DataStore] 已存在，跳过初始化');
}

// 导出（如果使用模块化环境）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DataStore;
}
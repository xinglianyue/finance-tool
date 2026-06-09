/**
 * 数据存储管理器 - DataStore
 * 负责数据的持久化、验证、迁移和备份恢复
 * 
 * 版本历史：
 * - v1: 初始版本，只保存 currentData
 * - v2: 新增 importHistory 多月份管理
 * - v3: 混合存储架构（元数据 + 缓存），减少 localStorage 占用
 */

const DataStore = {
  // 存储键名
  STORAGE_KEY: 'finance-tool',
  BACKUP_KEY: 'finance-tool-backup',
  
  // 当前数据版本
  VERSION: 3,
  
  // 最大历史记录数
  MAX_HISTORY: 20,
  
  // 最大缓存记录数（LRU 缓存）
  MAX_CACHE_SIZE: 3,
  
  /**
   * 验证数据结构完整性
   * @param {Object} data - 要验证的数据
   * @returns {Object} - { valid: boolean, errors: string[], warnings: string[] }
   */
  validate(data) {
    const errors = [];
    const warnings = [];
    
    if (!data) {
      errors.push('数据为空');
      return { valid: false, errors, warnings };
    }
    
    // 检查版本
    if (!data.version) {
      warnings.push('数据无版本号，可能为旧版本数据');
    }
    
    // v3 格式验证
    if (data.version === 3) {
      // v3 需要 metadata 和 currentData
      if (!data.metadata) {
        errors.push('v3 数据缺少 metadata 字段');
      } else {
        if (!data.metadata.availableDates) {
          warnings.push('metadata 缺少 availableDates');
        }
        if (!data.metadata.cloudVersion) {
          warnings.push('metadata 缺少 cloudVersion');
        }
      }
      
      if (!data.currentData) {
        errors.push('v3 数据缺少 currentData 字段');
      }
      
      // cache 是可选的
      if (data.cache && typeof data.cache !== 'object') {
        errors.push('cache 格式不正确');
      }
    }
    // v2 格式验证
    else if (data.version === 2) {
      // 检查必要字段
      if (!data.importHistory && !data.currentData) {
        errors.push('数据缺少 importHistory 或 currentData 字段');
      }
      
      // 检查 importHistory 格式
      if (data.importHistory && Array.isArray(data.importHistory)) {
        data.importHistory.forEach((record, idx) => {
          if (!record.monthLabel) {
            warnings.push(`第${idx + 1}条记录缺少 monthLabel`);
          }
          if (!record.data) {
            warnings.push(`第${idx + 1}条记录缺少 data 字段`);
          }
        });
        
        // 检查历史记录数量
        if (data.importHistory.length > this.MAX_HISTORY) {
          warnings.push(`历史记录数量 (${data.importHistory.length}) 超过限制 (${this.MAX_HISTORY})`);
        }
      }
      
      // 检查 currentData 格式
      if (data.currentData) {
        if (!data.currentData.totals) {
          warnings.push('currentData 缺少 totals 字段');
        }
        if (!data.currentData.cities) {
          warnings.push('currentData 缺少 cities 字段');
        }
      }
    }
    // v1 格式验证
    else if (!data.version && data.currentData) {
      warnings.push('检测到 v1 格式数据');
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  },
  
  /**
   * 数据迁移 - 将旧版本数据转换为新版本
   * @param {Object} data - 原始数据
   * @returns {Object} - 迁移后的数据
   */
  migrate(data) {
    if (!data) return null;
    
    // v1 → v3 迁移
    if (!data.version && data.currentData && !data.importHistory) {
      console.log('[DataStore] 检测到 v1 格式数据，迁移到 v3...');
      return {
        version: 3,
        metadata: {
          lastSyncAt: new Date().toISOString(),
          cloudVersion: 'v1',
          availableDates: [data.monthLabel || '未知日期']
        },
        currentData: data.currentData,
        cache: {
          [data.monthLabel || '未知日期']: data.allMerchantData || {}
        },
        currentImportIndex: 0,
        currentMerchantType: data.currentMerchantType || 'all',
        migratedFrom: 'v1'
      };
    }
    
    // v2 → v3 迁移
    if (data.version === 2) {
      console.log('[DataStore] 检测到 v2 格式数据，迁移到 v3...');
      
      // 从 importHistory 中提取日期列表
      const availableDates = (data.importHistory || []).map(r => r.monthLabel);
      
      // 构建缓存（当前选中的记录）
      const currentRecord = data.importHistory?.[data.currentImportIndex] || data.importHistory?.[0];
      const cache = {};
      if (currentRecord) {
        cache[currentRecord.monthLabel] = currentRecord.data;
      }
      
      // 提取云端版本号
      let cloudVersion = 'v2';
      if (data.importHistory && data.importHistory.length > 0) {
        const firstRecord = data.importHistory[0];
        if (firstRecord.fileName) {
          // 从文件名提取日期作为版本号
          const dateMatch = firstRecord.fileName.match(/(\d{8})/);
          if (dateMatch) {
            cloudVersion = dateMatch[1];
          }
        }
      }
      
      return {
        version: 3,
        metadata: {
          lastSyncAt: data.savedAt || new Date().toISOString(),
          cloudVersion: cloudVersion,
          availableDates: availableDates
        },
        currentData: data.currentData,
        cache: cache,
        currentImportIndex: data.currentImportIndex || 0,
        currentMerchantType: data.currentMerchantType || 'all',
        migratedFrom: 'v2',
        migratedAt: new Date().toISOString()
      };
    }
    
    // v3 格式但版本号不对
    if (data.version && data.version < this.VERSION) {
      console.log(`[DataStore] 数据版本${data.version}低于当前版本${this.VERSION}，无需迁移`);
    }
    
    // 确保有版本号
    if (!data.version) {
      data.version = this.VERSION;
    }
    
    return data;
  },
  
  /**
   * 检查localStorage容量
   * @returns {Object} - { available: boolean, used: number, availableSpace: number }
   */
  checkCapacity() {
    try {
      let total = 0;
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          total += localStorage[key].length + key.length;
        }
      }
      
      // localStorage通常限制为5MB（5242880字节）
      const limit = 5 * 1024 * 1024;
      const used = total;
      const availableSpace = limit - used;
      
      return {
        available: availableSpace > 1024 * 1024, // 至少保留1MB
        used,
        availableSpace,
        percentUsed: ((used / limit) * 100).toFixed(1) + '%'
      };
    } catch (e) {
      console.error('[DataStore] 容量检查失败:', e);
      return { available: false, error: e.message };
    }
  },
  
  /**
   * 保存数据
   * @param {Object} data - 要保存的数据
   * @returns {boolean} - 保存是否成功
   */
  save(data) {
    try {
      // 先备份当前数据
      this.backup();
      
      // 添加版本号
      const dataToSave = {
        ...data,
        version: this.VERSION,
        savedAt: new Date().toISOString()
      };
      
      // 限制历史记录数量
      if (dataToSave.importHistory && dataToSave.importHistory.length > this.MAX_HISTORY) {
        console.log(`[DataStore] 历史记录超出限制，保留最近${this.MAX_HISTORY}条`);
        // 按时间排序（最新的在前）
        dataToSave.importHistory.sort((a, b) => 
          (b.monthLabel || '').localeCompare(a.monthLabel || '')
        );
        dataToSave.importHistory = dataToSave.importHistory.slice(0, this.MAX_HISTORY);
        
        // 确保currentImportIndex有效
        if (dataToSave.currentImportIndex >= dataToSave.importHistory.length) {
          dataToSave.currentImportIndex = 0;
        }
      }
      
      // 检查容量
      const capacity = this.checkCapacity();
      if (!capacity.available) {
        console.warn(`[DataStore] 存储空间不足，已用${capacity.percentUsed}`);
      }
      
      // 保存数据
      const jsonStr = JSON.stringify(dataToSave);
      localStorage.setItem(this.STORAGE_KEY, jsonStr);
      
      console.log(`[DataStore] 数据已保存，大小${(jsonStr.length / 1024).toFixed(1)}KB`);
      return true;
      
    } catch (e) {
      console.error('[DataStore] 保存失败:', e);
      
      // 如果是配额超限，尝试清理旧数据
      if (e.name === 'QuotaExceededError') {
        console.warn('[DataStore] 存储配额超限，尝试清理...');
        this.cleanupOldData();
        
        // 重试保存
        try {
          const jsonStr = JSON.stringify(data);
          localStorage.setItem(this.STORAGE_KEY, jsonStr);
          console.log('[DataStore] 清理后保存成功');
          return true;
        } catch (retryError) {
          console.error('[DataStore] 重试保存仍然失败:', retryError);
        }
      }
      
      return false;
    }
  },
  
  /**
   * 加载数据
   * @returns {Object|null} - 加载的数据或null
   */
  load() {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (!saved) {
        console.log('[DataStore] 无保存的数据');
        return null;
      }
      
      let data = JSON.parse(saved);
      
      // 数据迁移
      data = this.migrate(data);
      
      // 验证数据
      const validation = this.validate(data);
      if (!validation.valid) {
        console.error('[DataStore] 数据验证失败:', validation.errors);
        // 尝试使用备份恢复
        const restored = this.restoreFromBackup();
        if (restored) {
          console.log('[DataStore] 已从备份恢复数据');
          return restored;
        }
        return null;
      }
      
      if (validation.warnings.length > 0) {
        console.warn('[DataStore] 数据验证警告:', validation.warnings);
      }
      
      console.log(`[DataStore] 数据加载成功，共${data.importHistory?.length || 0}条记录`);
      return data;
      
    } catch (e) {
      console.error('[DataStore] 加载失败:', e);
      return null;
    }
  },
  
  /**
   * 备份当前数据
   */
  backup() {
    try {
      const current = localStorage.getItem(this.STORAGE_KEY);
      if (!current) return;
      
      // 检查数据大小，如果太大则跳过备份
      if (current.length > 2000000) {
        console.log('[DataStore] 数据太大，跳过备份（大小：' + Math.round(current.length / 1024) + 'KB）');
        return;
      }
      
      const backups = this.getBackups();
      backups.unshift({
        id: Date.now(),
        timestamp: new Date().toISOString(),
        data: current
      });
      
      // 只保留最近5个备份
      while (backups.length > 5) {
        backups.pop();
      }
      
      localStorage.setItem(this.BACKUP_KEY, JSON.stringify(backups));
      console.log('[DataStore] 备份成功');
      
    } catch (e) {
      // 如果是配额超限错误，清理旧备份后重试
      if (e.name === 'QuotaExceededError') {
        console.log('[DataStore] 存储空间不足，清理旧备份...');
        try {
          localStorage.removeItem(this.BACKUP_KEY);
          console.log('[DataStore] 已清理备份存储空间');
        } catch (cleanupError) {
          console.error('[DataStore] 清理备份失败:', cleanupError);
        }
      } else {
        console.error('[DataStore] 备份失败:', e);
      }
    }
  },
  
  /**
   * 获取备份列表
   * @returns {Array} - 备份列表
   */
  getBackups() {
    try {
      const data = localStorage.getItem(this.BACKUP_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('[DataStore] 获取备份列表失败:', e);
      return [];
    }
  },
  
  /**
   * 从备份恢复
   * @param {number} index - 备份索引，默认0（最新）
   * @returns {Object|null} - 恢复的数据
   */
  restoreFromBackup(index = 0) {
    try {
      const backups = this.getBackups();
      if (!backups[index]) {
        console.warn('[DataStore] 指定的备份不存在');
        return null;
      }
      
      const backup = backups[index];
      let data = JSON.parse(backup.data);
      
      // 迁移和验证
      data = this.migrate(data);
      const validation = this.validate(data);
      
      if (validation.valid) {
        // 保存为新版本
        this.save(data);
        return data;
      }
      
      console.error('[DataStore] 备份数据验证失败:', validation.errors);
      return null;
      
    } catch (e) {
      console.error('[DataStore] 恢复失败:', e);
      return null;
    }
  },
  
  /**
   * 清理旧数据（当存储满时）
   */
  cleanupOldData() {
    try {
      const backups = this.getBackups();
      if (backups.length > 2) {
        // 删除最旧的备份
        const removed = backups.pop();
        localStorage.setItem(this.BACKUP_KEY, JSON.stringify(backups));
        console.log(`[DataStore] 已清理旧备份: ${removed.timestamp}`);
      }
    } catch (e) {
      console.error('[DataStore] 清理失败:', e);
    }
  },
  
  /**
   * 清除所有数据（谨慎使用）
   */
  clear() {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      localStorage.removeItem(this.BACKUP_KEY);
      console.log('[DataStore] 所有数据已清除');
      return true;
    } catch (e) {
      console.error('[DataStore] 清除失败:', e);
      return false;
    }
  },
  
  /**
   * 获取存储状态摘要
   * @returns {Object} - 存储状态信息
   */
  getStatus() {
    const capacity = this.checkCapacity();
    const backups = this.getBackups();
    const hasData = !!localStorage.getItem(this.STORAGE_KEY);
    
    return {
      hasData,
      capacity,
      backupCount: backups.length,
      lastBackup: backups[0]?.timestamp || null
    };
  },
  
  /**
   * 从缓存获取指定日期的数据
   * @param {string} date - 日期（YYYY-MM-DD）
   * @returns {Object|null} - 缓存的数据或 null
   */
  getCache(date) {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (!saved) return null;
      
      const data = JSON.parse(saved);
      return data.cache?.[date] || null;
    } catch (e) {
      console.error('[DataStore] 获取缓存失败:', e);
      return null;
    }
  },
  
  /**
   * 将数据添加到缓存（LRU 策略）
   * @param {string} date - 日期（YYYY-MM-DD）
   * @param {Object} merchantData - 商家数据
   */
  setCache(date, merchantData) {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (!saved) return;
      
      const data = JSON.parse(saved);
      
      // 确保是 v3 格式
      if (data.version !== 3) {
        console.warn('[DataStore] 当前数据不是 v3 格式，无法更新缓存');
        return;
      }
      
      // 初始化 cache
      if (!data.cache) {
        data.cache = {};
      }
      
      // 如果缓存已满，删除最久未使用的（第一个）
      const cacheKeys = Object.keys(data.cache);
      if (cacheKeys.length >= this.MAX_CACHE_SIZE && !data.cache[date]) {
        const oldestKey = cacheKeys[0];
        delete data.cache[oldestKey];
        console.log(`[DataStore] 缓存已满，删除最旧缓存：${oldestKey}`);
      }
      
      // 添加到缓存
      data.cache[date] = merchantData;
      data.metadata.lastSyncAt = new Date().toISOString();
      
      // 保存
      const jsonStr = JSON.stringify(data);
      localStorage.setItem(this.STORAGE_KEY, jsonStr);
      console.log(`[DataStore] 缓存已更新：${date}，缓存大小：${Object.keys(data.cache).length}/${this.MAX_CACHE_SIZE}`);
      
    } catch (e) {
      console.error('[DataStore] 更新缓存失败:', e);
    }
  },
  
  /**
   * 清空缓存
   */
  clearCache() {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (!saved) return;
      
      const data = JSON.parse(saved);
      if (data.version === 3) {
        data.cache = {};
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
        console.log('[DataStore] 缓存已清空');
      }
    } catch (e) {
      console.error('[DataStore] 清空缓存失败:', e);
    }
  }
};

// 导出供外部使用
window.DataStore = DataStore;

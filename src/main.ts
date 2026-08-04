/**
 * 财务分析工具 - TypeScript主入口
 */

import type { AppState, MerchantData, V3Data } from './types.js';

// ============ 全局状态 ============

declare global {
  interface Window {
    allMerchantData: MerchantData | null;
    importHistory: any[];
    currentImportIndex: number;
    currentMerchantType: string;
    financeToolCache: Record<string, MerchantData>;
    cloudData: any[];
    DataStore: any;
    StateManager: any;
    // 从其他模块导入的函数
    parseExcelData: (workbook: any, fileName: string) => MerchantData;
    loadFromCloud: () => Promise<V3Data>;
    renderDimensionTable: () => void;
    switchTab: (tabName: string) => void;
  }
}

// ============ 应用初始化 ============

function initApp(): void {
  console.log('[App] 开始初始化...');
  
  // 初始化数据存储
  if (!window.DataStore) {
    window.DataStore = createDataStore();
  }
  
  // 初始化状态管理
  if (!window.StateManager) {
    window.StateManager = createStateManager();
  }
  
  // 加载数据
  loadData();
  
  console.log('[App] 初始化完成');
}

// ============ 数据加载 ============

async function loadData(): Promise<void> {
  console.log('[App] 开始加载数据...');
  
  try {
    // 尝试从本地缓存加载
    const cached = window.DataStore.load();
    if (cached && cached.version === 3) {
      console.log('[App] 从本地缓存加载成功');
      window.allMerchantData = cached.currentData;
      window.importHistory = cached.importHistory;
      window.financeToolCache = cached.cache;
      
      // 检查是否需要更新
      const hasUpdate = await checkForUpdates(cached);
      if (hasUpdate) {
        console.log('[App] 检测到云端更新，开始刷新...');
        await loadFromCloud();
      }
      
      return;
    }
    
    // 从云端加载
    console.log('[App] 从云端加载数据...');
    const v3Data = await loadFromCloud();
    window.allMerchantData = v3Data.currentData;
    window.importHistory = v3Data.importHistory;
    window.financeToolCache = v3Data.cache;
    
  } catch (error) {
    console.error('[App] 数据加载失败:', error);
    showToast('数据加载失败，请刷新重试', 'error');
  }
}

// ============ 云端同步 ============

async function checkForUpdates(localData: V3Data): Promise<boolean> {
  try {
    const response = await fetch('./index.json');
    if (!response.ok) return false;
    
    const cloudIndex = await response.json();
    const localVersion = localData.metadata?.cloudVersion || '0';
    const cloudVersion = cloudIndex.version || '0';
    
    return parseInt(cloudVersion) > parseInt(localVersion);
  } catch {
    return false;
  }
}

// ============ 工具函数 ============

function createDataStore() {
  const STORAGE_KEY = 'finance-tool';
  const CACHE_PREFIX = 'cache_';
  
  return {
    load(): V3Data | null {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : null;
      } catch {
        return null;
      }
    },
    
    save(data: V3Data): boolean {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        return true;
      } catch {
        return false;
      }
    },
    
    getCache(date: string): MerchantData | null {
      try {
        const key = `${CACHE_PREFIX}${date}`;
        const cached = localStorage.getItem(key);
        return cached ? JSON.parse(cached) : null;
      } catch {
        return null;
      }
    },
    
    setCache(date: string, data: MerchantData): boolean {
      try {
        const key = `${CACHE_PREFIX}${date}`;
        localStorage.setItem(key, JSON.stringify(data));
        return true;
      } catch {
        return false;
      }
    }
  };
}

function createStateManager() {
  const state: AppState = {
    hasData: false,
    historyCount: 0,
    selectedCities: [],
    currentImportIndex: 0,
    currentMerchantType: 'all',
    cacheSize: 0,
    isLoading: false,
    error: null
  };
  
  return {
    getState(): AppState {
      return { ...state };
    },
    
    update(updates: Partial<AppState>): void {
      Object.assign(state, updates);
      console.log('[StateManager] 状态已更新:', state);
    }
  };
}

function showToast(message: string, type: 'info' | 'success' | 'error' | 'warning'): void {
  console.log(`[Toast] [${type}] ${message}`);
  // TODO: 实现真正的toast UI
}

// ============ 导出 ============

window.initApp = initApp;

// ============ 启动应用 ============

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
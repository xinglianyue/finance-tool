# 📝 财务分析工具 - 版本变更日志（完整版）

## 🔴 v2026-07-29.1 (2026-07-29) - **紧急修复版本**

### ✅ 核心问题修复

**1️⃣ 维度下钻无法切换城市 (DIMENSION_DRILL_DOWN_FAIL)**

- **Root Cause**: `_buildCityDataCache()` 的缓存 key 未包含 `currentImportIndex`，导致切换日期后返回旧缓存数据，城市列表不刷新。

- **Fix**: 修改 `_buildCityDataCache()` 的缓存 key 构建方式，加入 `currentImportIndex` 作为区分因子：
  ```javascript
  const key = allMerchantData ? 
    JSON.stringify(Object.keys(allMerchantData).map(k => k + ':' + (allMerchantData[k]?.cities?.length || 0))) + '|' + currentImportIndex : '';
  ```

- **Modified**: `index-new.html` → `_buildCityDataCache()` 函数

---

**2️⃣ 趋势分析显示无数据 (TREND_ANALYSIS_NO_DATA)**

- **Root Cause**: `renderTrend()` 仅依赖单一数据源 `window.financeToolCache`，当缓存为空时没有 fallback，导致趋势图空白。

- **Fix**: 增加多层数据源 fallback 机制，按优先级读取：
  1. `selectedRecord.data` (导入历史直接存储)
  2. `window.financeToolCache` (内存缓存)
  3. `allMerchantData` (全局变量)
  4. `window.cloudData` (云端数据兜底)

- **Modified**: `index-new.html` → `renderTrend()` 函数

---

**3️⃣ StateManager 初始化错误覆盖 allMerchantData (STATEMANAGER_INIT_OVERWRITE)**

- **Root Cause**: `StateManager.init()` 优先从 cache 加载 `allMerchantData`，覆盖了通过 `initialData.allMerchantData` 显式传入的有效数据，导致 `allMerchantData` 初始化为 null。

- **Fix**: 修改初始化逻辑，确立明确的优先级顺序：
  - 优先级1：`initialData.allMerchantData`（显式传入的数据，最高优先级）
  - 优先级2：从 `window.financeToolCache` 或 `initialData.cache` 中提取
  - 降级：使用空对象或回退到旧版格式

- **Modified**: `js/state-manager.js` → `StateManager.init()` 函数

---

**4️⃣ 全局变量不同步导致渲染失败 (GLOBAL_VAR_SYNC_FAILURE)**

- **Root Cause**: `switchImportDateDim()` 函数更新了局部变量 `allMerchantData` 但未同步到全局变量 `window.allMerchantData`，后续渲染函数（如 `renderDimensionTable()`）读取的是旧的 `window.allMerchantData`，导致 "allMerchantData is null" 错误。

- **Fix**: 双重保障机制：
  - 直接赋值：在 `switchImportDateDim()` 中增加 `window.allMerchantData = merchantData;`
  - StateManager订阅：添加对 `'*'` 事件的监听，状态变更时自动同步全局变量：
    ```javascript
    StateManager.subscribe('*', (key, newValue, oldValue) => {
      if (key === 'allMerchantData' || key === '*') {
        window.allMerchantData = newValue;
      }
    });
    ```

- **Modified**: `index-new.html` → `switchImportDateDim()` 函数及初始化代码

---

### 🛡️ 架构增强

**5️⃣ 自动版本检测与强制刷新 (AUTO_VERSION_CHECK)**

- **Feature**: 在页面头部添加版本检测脚本，自动检测本地缓存是否为最新版本，发现版本号不同时强制刷新并清除缓存：
  ```javascript
  (function() {
    var APP_VERSION = '20260727.2';
    var VER_KEY = 'finance_app_ver';
    var cachedVer = localStorage.getItem(VER_KEY);
    if (cachedVer !== APP_VERSION) {
      console.warn('[Version] 版本变更，强制刷新...');
      localStorage.setItem(VER_KEY, APP_VERSION);
      window.location.href = window.location.href.split('?')[0] + '?_=' + Date.now();
    }
  })();
  ```

- **Purpose**: 消除用户手动清除缓存、强制刷机的需求，确保始终加载最新版本。

---

**6️⃣ 版本号显示更新 (VERSION_DISPLAY_UPDATE)**

- **Fix**: 更新 HTML 中显示的版本号文本为最新的 `v2026-07-27.2`。

- **Modified**: `index-new.html` → 版本信息显示区域

---

### 📄 Modified Files Summary

| File | Changes |
|------|---------|
| `index-new.html` | 所有核心修复、版本检测脚本、版本显示更新 |
| `js/state-manager.js` | StateManager.init() 优先级逻辑修正 |

---

## 🔵 v2026-07-27.2 (2026-07-28)

### ✅ 修复问题

**1️⃣ Dimension drill-down cannot switch cities**
- Root Cause: `_buildCityDataCache()` cache key didn't include `currentImportIndex`
- Fix: Added `currentImportIndex` to cache key

**2️⃣ Trend analysis shows no data**
- Root Cause: `renderTrend()` relied solely on `window.financeToolCache`
- Fix: Added multi-layer fallback: `selectedRecord.data` → `cache` → `allMerchantData` → `cloudData`

**3️⃣ StateManager initialization overwrites allMerchantData**
- Root Cause: `StateManager.init()` prioritized cache over provided initialData
- Fix: Prioritize `initialData.allMerchantData` as highest priority

---

## 🟢 v2026-07-27.1 (2026-07-27)

### ✅ 修复问题

**1️⃣ loadFromLocalStorage() empty cache rebuild**
- Fixed rebuild logic when `window.financeToolCache` is empty

**2️⃣ Import date dimension switch fallback**
- Added fallback to get data from `allMerchantData` when cache missing

---

## 📌 Deployment Status

✅ All changes committed and pushed to **main** branch  
✅ Synced to **gh-pages** branch for GitHub Pages deployment  
✅ Version checking mechanism active in production  

---

> **Note**: This changelog is maintained in `changelog-update.md` and will be updated with each release. Users can view this file to track all bug fixes, new features, and optimizations.

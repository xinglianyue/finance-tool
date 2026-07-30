# 📝 财务分析工具 - 版本变更日志

## v2026-07-29.2 (2026-07-30)

### 🔴 严重问题修复

**4️⃣ 维度下钻点击城市时显示 "allMerchantData is null" 错误**
- **Root Cause**: `renderDimensionTable()` 在 `window.allMerchantData` 为空时直接返回，没有提供数据 fallback，导致城市切换时无响应且控制台报错
- **Fix**: 增加多层数据源 fallback 机制：
  1. 优先从 `window.allMerchantData` 获取（由 switchImportDateDim 或 StateManager 设置）
  2. 其次从 `window.financeToolCache` 按当前日期获取
  3. 再次从云端最新记录 `window.cloudData` 获取
  4. 所有来源都不可用时显示友好提示
- **Modified**: `index-new.html` → `renderDimensionTable()` 函数

---

## v2026-07-29.1 (2026-07-29)

### 🔴 严重问题修复

**1️⃣ 维度切换和趋势分析数据不同步**
- **Root Cause**: 应用存在两个独立的状态源：
  - 全局 `state` 对象（在 core.js 中定义），直接由 app.js 函数修改
  - `StateManager` 实例，从未被正确初始化或使用
  - 当用户切换商家类型、日期或上传新数据时，只有 `state` 被更新，而 `StateManager` 保持旧状态
  - 多个渲染组件（如 detail.js）读取的是不一致的数据源，导致维度切换后城市列表不刷新、趋势分析显示旧数据或空数据
- **Fix**: 统一状态管理，在所有数据修改点（`loadFromLocalStorage()`、`switchMerchant()`、日期选择器变更、文件上传）后调用 `StateManager.init()` 同步全局状态到 StateManager，确保所有组件使用一致的数据源
- **Modified Files**: 
  - `js/app.js`: 在 loadFromLocalStorage()、switchMerchant()、日期选择器事件中添加 StateManager 同步
  - `js/file.js`: 在 handleFile() 中添加 StateManager 同步

**2️⃣ 状态持久化和回滚机制不足**
- **Root Cause**: StateManager 的订阅器和通知机制未启用，状态变更无法触发 UI 自动刷新
- **Fix**: 在 app.js 初始化时添加对关键状态变更的监听，并在必要时强制重绘（注：当前实现通过直接调用渲染函数保证 UI 刷新，后续可引入完整的订阅/发布模式）

### ✅ 其他改进

**3️⃣ 状态一致性保障**
- 确保所有状态修改路径都经过 StateManager 统一处理
- 添加防御性编程：在 render 函数中对空值进行安全检查

---

## v2026-07-27.2 (2026-07-28)

### ✅ 修复问题

**1️⃣ Dimension drill-down cannot switch cities**
- **Root Cause**: `_buildCityDataCache()` 的 cache key 未包含 `currentImportIndex`，切换日期后返回旧缓存数据
- **Fix**: 修改 cache key 构建方式，加入 `currentImportIndex` 作为区分
- **Code**: `const key = allMerchantData ? JSON.stringify(Object.keys(allMerchantData).map(k => k + ':' + (allMerchantData[k]?.cities?.length || 0))) + '|' + currentImportIndex : '';`

**2️⃣ Trend analysis shows no data**
- **Root Cause**: `renderTrend()` 仅依赖 `window.financeToolCache`，缓存为空时无 fallback 数据源
- **Fix**: 增加多层 fallback：`selectedRecord.data` → `window.financeToolCache` → `allMerchantData` → `window.cloudData`

**3️⃣ StateManager initialization overwrites allMerchantData**
- **Root Cause**: `StateManager.init()` 优先从 cache 加载 `allMerchantData`，覆盖了通过 initialData 传入的有效数据
- **Fix**: 修改初始化逻辑，当 `initialData.allMerchantData` 显式提供时使用最高优先级

---

## v2026-07-26.1 (2026-07-26)

### ✅ 修复问题

**1️⃣ loadFromLocalStorage() empty cache rebuild**
- Fix: 当 `window.financeToolCache` 为空时重建缓存结构

**2️⃣ Import date dimension switch fallback**
- Add fallback to get data from `allMerchantData` when cache is missing

---

## 📌 提交说明

本次修复涉及的文件：
- `index-new.html` - 核心应用文件，包含所有功能修复和版本检测
- `js/state-manager.js` - 状态管理器（保持原有修复）

Git 操作记录已推送至 main 和 gh-pages 两个分支。

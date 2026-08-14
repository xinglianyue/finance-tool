# 📊 财务分析工具 - 数据表整体逻辑说明文档

## 1. 核心架构概览

### 1.1 数据流向图

```
[云端 raw-data] 
    ↓ (HTTP GET)
[shared-data.json] ← GitHub Main Branch
    ↓ (fetch / DataStore.load())
[localStorage v3缓存] ↔ [内存 window.financeToolCache]
    ↓ (StateManager.init())
[StateManager._state.allMerchantData] ←→ [window.allMerchantData] (全局兼容变量)
    ↓ (switchImportDateDim() / StateManager.subscribe())
[currentData = { totals, cities }]
    ↓ (renderDimensionTable())
[HTML表格渲染到 #dimensionTable]
```

### 1.2 关键角色

| 模块 | 职责 | 文件位置 |
|------|------|---------|
| **DataStore** | localStorage读写、版本校验 | `js/data-store.js` |
| **StateManager** | 单一状态源、订阅通知、状态变更管理 | `js/state-manager.js` |
| **switchImportDateDim** | 日期切换函数，加载对应merchantData | `index-new.html` |
| **renderDimensionTable** | 维度表渲染函数，展示城市数据 | `index-new.html` |
| **_buildCityDataCache** | 城市指标缓存，避免重复计算 | `index-new.html` |

---

## 2. 数据结构定义

### 2.1 allMerchantData（商家全量数据）

这是整个系统的**核心数据根节点**，结构如下：

```javascript
{
  "all": {                    // 聚合类型：全部商家
    label: "全部",
    cities: [
      { 
        name: "总商",           // 汇总行，包含所有城市的合计值
        modules: { all: {...} } // 完整指标集
      },
      { 
        name: "承德", 
        displayName: "承德市",
        modules: { all: {...} }
      },
      { 
        name: "围场县", 
        modules: { all: {...} }
      },
      ...
    ]
  },
  
  "ka": {                     // 聚合类型：KA商家
    label: "KA",
    cities: [...]
  },
  
  "city": {                   // 聚合类型：城市商家
    label: "城市",
    cities: [...]
  }
}
```

### 2.2 单城市指标对象

每个城市的 `modules.all` 包含以下字段（数值型）：

```javascript
{
  orders: 1250,              // 订单总量
  gmvAmount: 1567890.50,     // GMV交易额
  profit: 234567.80,         // 毛利利润
  onlineRevenue: 120000.00,  // 抽佣收入
  deliveryCost: 45000.00,    // 配送成本
  fixedCost: 20000.00,       // 固定成本
  subsidyTotal: 15000.00,    // 补贴总额
  ue: 187.65,                // 单位经济模型 = profit/orders
  profitRate: 0.195,         // 利润率 = profit/onlineRevenue
  avgRevenuePerOrder: 96.00, // 客单价 = onlineRevenue/orders
  avgCostPerOrder: 52.00     // 均摊成本 = totalExpense/orders
}
```

> **注意**：衍生指标（ue、profitRate等）是在渲染时通过 `_calculateCityMetrics()` 动态计算的，不是原始数据。

---

## 3. 核心处理流程详解

### 3.1 步骤一：切换日期 → switchImportDateDim(dateStr)

**触发场景**：用户点击"选择数据"下拉框选择新日期

**执行逻辑**：

```javascript
function switchImportDateDim(dateStr) {
  // 1. 根据日期字符串找到对应的导入记录索引
  const idx = importHistory.findIndex(h => h.monthLabel === dateStr);
  currentImportIndex = idx;

  // 2. 按优先级从多个数据源获取 merchantData
  let merchantData = null;
  
  // 优先级A：直接从内存缓存获取（最快）
  if (window.financeToolCache && window.financeToolCache[dateStr]) {
    merchantData = window.financeToolCache[dateStr];
  }
  // 优先级B：从云端历史数据获取
  else if (window.cloudData) {
    const cloudRecord = window.cloudData.find(r => r.date === dateStr);
    if (cloudRecord) {
      merchantData = cloudRecord.merchantData || convertOldFormat(cloudRecord.currentData);
    }
  }
  // 优先级C：从导入历史的data字段兜底
  else if (importHistory[idx]?.data) {
    merchantData = importHistory[idx].data;
  }
  // 优先级D：从当前局部变量兜底
  else if (allMerchantData) {
    merchantData = allMerchantData;
  }

  // 3. 如果还是没数据，报错退出
  if (!merchantData) {
    console.error('无法获取数据');
    return;
  }

  // 4. 格式转换：旧格式 {date, cities} → 新格式 {all: {cities}}
  if (!merchantData.all && merchantData.cities) {
    merchantData = { all: { label: '全部', cities: merchantData.cities } };
  }

  // 5. 🔑 关键修复：同步到全局变量
  allMerchantData = merchantData;
  window.allMerchantData = merchantData;  // 让其他地方也能访问到

  // 6. 重置缓存（确保切换日期后不使用旧缓存）
  _cityDataCacheKey = null;
  _cityDataCache = null;

  // 7. 构建 currentData（为渲染准备）
  const allCities = merchantData.all?.cities || [];
  let totalData = null;
  let citiesData = [];
  
  allCities.forEach(city => {
    if (city.name === '总商') {
      totalData = city;  // 保留作为汇总
    } else if (!seenCities.has(city.name)) {
      citiesData.push(city);
      seenCities.add(city.name);
    }
  });

  currentData = {
    totals: totalData?.modules?.all || {},
    cities: citiesData
  };

  // 8. 重新渲染城市选择框和表格
  renderDimension();
}
```

**设计要点**：
- **多重fallback**：即使某个数据源失效，仍有多个备选方案
- **缓存失效策略**：切换日期时立即清空 `_cityDataCache`，防止返回错误数据
- **全局同步**：同时更新局部变量 `allMerchantData` 和全局变量 `window.allMerchantData`

---

### 3.2 步骤二：选择城市 → renderDimensionTable()

**触发场景**：用户在城市复选框区域点击勾选/取消某城市

**执行逻辑**（简化版，含完整fallback）：

```javascript
function renderDimensionTable() {
  // ========== FIX: 多级数据源fallback ===========
  let allMerchantData = null;

  // 1️⃣ 优先：从窗口全局对象读取（由 switchImportDateDim 设置）
  if (window.allMerchantData && Object.keys(window.allMerchantData).length > 0) {
    allMerchantData = window.allMerchantData;
  }
  // 2️⃣ 其次：从内存缓存读取（带当前月份标签）
  else if (window.financeToolCache) {
    const monthLabel = importHistory?.[currentImportIndex]?.monthLabel;
    if (monthLabel && window.financeToolCache[monthLabel]) {
      allMerchantData = window.financeToolCache[monthLabel];
    }
  }
  // 3️⃣ 再次：从云端最新数据兜底
  else if (window.cloudData?.length > 0) {
    allMerchantData = window.cloudData[window.cloudData.length - 1].merchantData;
  }

  // 4️⃣ 兜底：仍然没有数据 → 显示友好提示
  if (!allMerchantData || Object.keys(allMerchantData).length === 0) {
    showToast('请先选择一个有效的日期', 'warning');
    document.getElementById('dimensionTable').innerHTML = 
      '<div style="padding:20px;text-align:center;color:red">暂无可用数据</div>';
    return;
  }

  // ========== 渲染开始 ==========

  // 获取所有已选中的城市
  const checkboxes = document.querySelectorAll('#cityCheckboxes input:checked');
  const selectedCities = Array.from(checkboxes).map(cb => cb.value);

  // 如果没选城市，提示用户
  if (selectedCities.length === 0) {
    document.getElementById('dimensionTable').innerHTML = 
      '<p style="text-align:center">请至少选择一个城市</p>';
    return;
  }

  // 获取当前业务模块（全品类/餐饮/闪购等）
  const module = document.getElementById('moduleSelect').value;
  const metricGroups = METRIC_GROUPS_BY_MODULE[module] || METRIC_GROUPS_BY_MODULE.all;

  // 生成表格HTML...
  // （此处省略具体表格生成代码，涉及表头、列分组、数据计算等）
}
```

**设计要点**：
- **三重fallback**：即使首次设置的 global 数据丢失，仍有缓存和云端兜底
- **空值防御**：在一切可能的地方检查 null/undefined，防止崩溃
- **用户体验**：数据不可用时给出明确提示，而不是空白或报错

---

### 3.3 步骤三：城市指标计算（内联在渲染过程中）

在渲染表格的每一行时，需要从城市数据中提取对应的指标值。这里有一个辅助函数 `_getValue()`：

```javascript
getValue(obj, ...keys) {
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null) {
      return parseFloat(obj[key]) || 0;
    }
  }
  return 0;
}
```

**使用示例**（提取GMV值）：
```javascript
// 尝试多种可能的字段名获取GMV值
const gmv = this.getValue(city.modules, 'gmvAmount', 'gmv', '原价交易额', '交易额');
```

这个设计支持了数据格式的灵活性——原始数据中可能用不同命名方式存储同一指标。

---

## 4. 状态管理机制（StateManager）

### 4.1 为什么要用 StateManager？

在传统多变量同步的模式下，容易出现状态不一致问题：

```
// ❌ 错误做法：直接操作多个变量
allMerchantData = newData;     // 局部变量
currentData = compute(newData); // 局部变量  
window.allMerchantData = newData; // 全局变量
// 但可能有人从其他地方读取旧的 allMerchantData！
```

**StateManager 统一了状态访问入口**：

```
✅ 正确做法：所有状态变更都经过 StateManager
StateManager.set('allMerchantData', newData);
// 自动触发订阅者更新，所有依赖方都能收到通知
```

### 4.2 StateManager.init() 初始化逻辑

```javascript
init(initialData) {
  let allMerchantDataToSet = null;

  // 【核心修复】确定优先级顺序
  if (initialData.allMerchantData !== undefined) {
    // 最高优先级：显式传入的 allMerchantData（来自外部调用）
    allMerchantDataToSet = initialData.allMerchantData;
  } else if (initialData.version === 3) {
    // 次高优先级：从 cache 提取（兼容v3格式）
    const record = initialData.importHistory[initialData.currentImportIndex];
    const cacheData = window.financeToolCache?.[record.monthLabel] || initialData.cache?.[record.monthLabel];
    if (cacheData) allMerchantDataToSet = cacheData;
  } else {
    // 最低优先级：旧版allMerchantData字段
    allMerchantDataToSet = initialData.allMerchantData || null;
  }

  // 同步到内部状态 + 全局窗口对象
  this._state.allMerchantData = allMerchantDataToSet;
  window.allMerchantData = allMerchantDataToSet;

  // 添加订阅器，任何状态变更都会触发全局同步
  this._state.allMerchantData = allMerchantDataToSet;
  
  // ... 其他状态初始化
}
```

**关键点**：
- `initialData.allMerchantData` 优先级最高，确保外部传入的数据不被覆盖
- 保持 `window.allMerchantData` 始终与内部状态一致，维持向后兼容
- 订阅器机制：`StateManager.subscribe('*', callback)` 可以监听所有状态变化

---

## 5. 缓存系统优化

### 5.1 _buildCityDataCache() 的改进

最初版本的问题：
```javascript
// ❌ 旧版本：key只包含城市数量信息，不包含日期
const key = JSON.stringify(Object.keys(allMerchantData).map(k => k + ':' + allMerchantData[k].cities.length));
// 结果：切换日期后，key可能相同，返回了错误的旧缓存数据
```

修复后的版本：
```javascript
// ✅ 新版本：加入 currentImportIndex 作为区分因子
const key = allMerchantData ? 
  JSON.stringify(Object.keys(allMerchantData).map(k => k + ':' + (allMerchantData[k]?.cities?.length || 0))) + '|' + currentImportIndex : '';
```

### 5.2 缓存失效时机

需要在以下时刻清空缓存：
1. `switchImportDateDim()` 切换日期时 → `_cityDataCacheKey = null; _cityDataCache = null;`
2. `switchMerchantType()` 切换商家类型时（可能需要重新计算）
3. 上传新数据后

---

## 6. 版本控制与自动更新

### 6.1 APP_VERSION 常量

```javascript
var APP_VERSION = '20260727.2';  // 在页面顶部定义
```

### 6.2 自动检测脚本

```javascript
(function() {
  var APP_VERSION = '20260727.2';
  var VER_KEY = 'finance_app_ver';
  var cachedVer = localStorage.getItem(VER_KEY);
  
  if (cachedVer !== APP_VERSION) {
    console.warn('[Version] 版本变更，强制刷新...');
    localStorage.setItem(VER_KEY, APP_VERSION);
    // 带上时间戳参数，绕过浏览器缓存
    window.location.href = window.location.href.split('?')[0] + '?_=' + Date.now();
  }
})();
```

### 6.3 JS文件引用（带版本号）

```html
<script src="js/xlsx.full.min.js?v=20260727.2"></script>
<script src="js/chart.umd.min.js?v=20260727.2"></script>
<script src="js/data-store.js?v=20260727.2"></script>
<script src="js/state-manager.js?v=20260727.2"></script>
```

---

## 7. 调试与故障排查指南

### 7.1 常见错误信息对照表

| 错误信息 | 可能原因 | 解决方案 |
|---------|---------|---------|
| `renderDimensionTable: allMerchantData is null` | 未先选择日期就点击城市 | 先选日期再点城市；检查 fallback 逻辑 |
| `switchImportDateDim: 无法获取数据` | 所有数据源都为空 | 检查云端 data 是否正确上传 |
| `cache中无数据` | cache key不匹配或已被清空 | 检查 currentImportIndex 是否正确 |
| 页面显示空白 | 有JS错误导致后续代码未执行 | 查看 Console 红色错误信息 |

### 7.2 控制台诊断命令

在浏览器 Console 中执行以下命令可快速查看状态：

```javascript
// 查看所有全局数据源
console.log('window.allMerchantData:', window.allMerchantData);
console.log('window.financeToolCache:', window.financeToolCache);
console.log('window.cloudData:', window.cloudData?.slice(-3));  // 最后几条

// 查看导入历史
console.log('importHistory:', window.importHistory);

// 查看当前状态管理器状态
console.log('StateManager:', StateManager.get());

// 验证数据完整性
console.log('Validation:', StateManager.validate());
```

### 7.3 强制刷新测试流程

1. 打开浏览器隐身模式（或使用无痕窗口）
2. 访问 raw URL：`https://raw.githubusercontent.com/xinglianyue/finance-tool/main/index-new.html`
3. 打开 F12 → Network → Disable Cache
4. 依次操作：选日期 → 选城市 → 观察表格是否刷新
5. 打开 Console 检查是否有错误日志

---

## 8. 总结：核心要点速记

1. **数据源头**：云端 shared-data.json → localStorage → StateManager → window.allMerchantData
2. **状态入口**：统一通过 StateManager 管理，所有修改都走 StateManager.set()
3. **同步机制**：State 变更通过 subscribe() 自动同步到全局变量 window.allMerchantData
4. **Fallback策略**：关键渲染函数都有多层数据后备方案，提高容错性
5. **缓存关键**：缓存 key 必须包含 currentImportIndex，不同日期数据要区分开
6. **版本保障**：APP_VERSION + localStorage版本号比较实现自动更新检测

---

**文档版本**：v1.0（2026-07-30）  
**最后更新**：`index-new.html` + `index-new-patch.md` 已同步至 main 和 gh-pages 分支  
**部署地址**：[GitHub Pages](https://xinglianyue.github.io/finance-tool/)（建议用 raw URL 获取最新版）
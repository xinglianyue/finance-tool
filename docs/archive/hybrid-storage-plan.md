# 混合存储架构改造 - 完整实施方案

## 📋 一、现状分析

### 1.1 当前数据结构
```javascript
// localStorage 中保存的数据（2.5MB）
{
  version: 2,
  importHistory: [           // 9 条记录，每条约 280KB
    {
      monthLabel: "2026-05-31",
      data: {                // 完整的 merchantData
        all: {...},          // 约 100KB
        city: {...},         // 约 100KB
        ka: {...}            // 约 80KB
      },
      importedAt: "..."
    }
  ],
  currentData: {...},        // 从 importHistory[0].data 提取（约 30KB）
  allMerchantData: {...},    // ⚠️ 重复！与 importHistory[0].data 相同（约 280KB）
  currentImportIndex: 0,
  currentMerchantType: 'all'
}
```

### 1.2 问题点
1. **数据重复**：`allMerchantData` 和 `importHistory[0].data` 保存了两次
2. **容量限制**：2.5MB / 5MB = 50%，只能存 9 条记录
3. **云端检查低效**：每次都下载完整的 shared-data.json（2.5MB）来检查更新

### 1.3 现有代码依赖关系
```
index-new.html
├── loadFromCloud()          // 行 1665-2058
│   ├── 从 ./shared-data.json 下载完整数据
│   ├── 去重处理（第 1754-1840 行）
│   ├── 构建 allImportHistory
│   ├── 构建 allMerchantData（从最新记录）
│   └── DataStore.save() 保存到 localStorage
│
├── checkCloudForUpdates()   // 行 2065-2159
│   ├── 下载完整 shared-data.json
│   └── 对比本地和云端的日期列表
│
├── switchImportDate()       // 行 1504-1554
│   ├── 从 importHistory[idx].data 读取
│   └── 更新 allMerchantData、currentData
│
└── StateManager.init()      // state-manager.js
    ├── 接收 allMerchantData
    ├── 接收 importHistory
    └── 初始化状态
```

---

## 🎯 二、目标架构

### 2.1 新的数据结构
```javascript
// localStorage 中保存的数据（目标 < 1MB）
{
  version: 3,                // 升级到 v3
  metadata: {
    lastSyncAt: "2026-06-08T10:00:00Z",
    cloudVersion: "20260608.1",
    availableDates: [        // 只存日期列表（< 1KB）
      "2026-05-31",
      "2026-05-25",
      ...
    ]
  },
  currentData: {...},        // 当前显示的数据（约 30KB）
  cache: {                   // LRU 缓存：最近使用的 3 条（约 900KB）
    "2026-05-31": {...},
    "2026-05-25": {...},
    "2026-05-19": {...}
  },
  currentImportIndex: 0,
  currentMerchantType: 'all'
}

// 云端文件
// ├── index.json             // 轻量级索引（约 5KB）
// └── shared-data.json       // 完整数据（所有历史记录）
```

### 2.2 云端索引文件格式（index.json）
```json
{
  "version": "20260608.1",
  "updatedAt": "2026-06-08T10:00:00Z",
  "recordCount": 9,
  "records": [
    {
      "date": "2026-05-31",
      "fileName": "bill_20260531.json",
      "uploadedBy": "db-sync",
      "updatedAt": "2026-06-08T14:49:35Z",
      "isLatest": true,
      "version": 2
    },
    {
      "date": "2026-05-25",
      "fileName": "外卖账单 20260525.xlsx",
      "uploadedBy": "web",
      "updatedAt": "2026-05-29T12:39:27Z"
    }
  ]
}
```

---

## ⚠️ 三、风险评估与应对

### 3.1 可能的风险

#### 风险 1：首次加载用户无数据可用
**场景**：新用户第一次打开页面，localStorage 为空
**影响**：页面显示空白
**应对**：
- ✅ 首次加载时下载完整 shared-data.json
- ✅ 显示加载进度条（"正在加载数据...30%"）
- ✅ 超时处理：如果 5 秒未加载完成，显示提示

#### 风险 2：切换历史日期时加载慢
**场景**：用户选择缓存外的日期（如 3 个月前的数据）
**影响**：需要 1-2 秒从云端下载
**应对**：
- ✅ 预加载机制：用户选择时立即显示"加载中..."
- ✅ 后台静默下载：不阻塞 UI
- ✅ 下载完成后自动刷新显示

#### 风险 3：云端更新检测失败
**场景**：index.json 加载失败（网络问题/CORS）
**影响**：无法检测更新，使用旧数据
**应对**：
- ✅ 降级策略：如果 index.json 失败，回退到下载完整数据
- ✅ 错误提示：告知用户"使用缓存数据，云端检测失败"
- ✅ 重试机制：3 次重试

#### 风险 4：缓存污染/损坏
**场景**：localStorage 中的数据损坏
**影响**：页面无法正常工作
**应对**：
- ✅ 数据验证：加载时验证数据结构
- ✅ 自动修复：损坏时重新下载
- ✅ 备份恢复：保留 backup 机制

#### 风险 5：并发问题
**场景**：多个标签页同时打开，同时修改 localStorage
**影响**：数据覆盖
**应对**：
- ✅ storage 事件监听：检测其他标签页的修改
- ✅ 版本号检查：写入前检查是否被修改
- ✅ 锁定机制：使用 localStorage 锁

### 3.2 兼容性考虑

#### 旧用户数据迁移（v2 → v3）
```javascript
// 检测到 v2 数据时，自动迁移
if (data.version === 2) {
  const v3Data = {
    version: 3,
    metadata: {
      lastSyncAt: data.savedAt || new Date().toISOString(),
      cloudVersion: extractVersion(data), // 从文件名等提取
      availableDates: data.importHistory.map(r => r.monthLabel)
    },
    currentData: data.currentData,
    cache: {
      [data.importHistory[data.currentImportIndex].monthLabel]: 
        data.importHistory[data.currentImportIndex].data
    },
    currentImportIndex: data.currentImportIndex,
    currentMerchantType: data.currentMerchantType
  };
  
  // 不保存 allMerchantData（从 cache 中获取）
  return v3Data;
}
```

---

## 🔧 四、实施步骤

### 阶段 1：准备工作（不修改现有代码）

#### 1.1 创建云端索引文件生成脚本
**文件**：`generate_index.py`
**功能**：从 shared-data.json 生成 index.json
**测试**：本地运行，验证生成的 JSON 格式正确

#### 1.2 创建 index.json 并推送到 GitHub
**操作**：
- 运行生成脚本
- 提交到 Git
- 推送到 main 和 gh-pages 分支
- 验证可通过 https 访问

#### 1.3 创建数据压缩工具（可选）
**文件**：`compress_data.py`
**功能**：分析 shared-data.json 中哪些字段可以压缩
**目的**：减少云端数据大小

### 阶段 2：代码改造（分模块进行）

#### 2.1 修改 DataStore（data-store.js）
**改动点**：
1. 更新 VERSION 为 3
2. 添加 migrate() 的 v2→v3 迁移逻辑
3. 修改 validate() 支持新的数据结构
4. 添加缓存管理函数（getCache、setCache、clearCache）
5. 添加 LRU 缓存淘汰逻辑

**测试**：
- 单元测试：验证迁移逻辑
- 集成测试：验证保存/加载正常

#### 2.2 修改 StateManager（state-manager.js）
**改动点**：
1. 添加 `getFromCache(date)` 方法
2. 修改 `init()` 支持新的数据结构
3. 添加 `buildAllMerchantData()` 方法（从 cache 或 importHistory 构建）

**测试**：
- 验证状态初始化正常
- 验证数据获取正常

#### 2.3 修改 index-new.html 核心逻辑

**Step 1：修改 loadFromCloud()**
```javascript
async function loadFromCloud() {
  // 1. 检查 localStorage
  const localData = DataStore.load();
  
  // 2. 如果是首次访问（无缓存）
  if (!localData) {
    console.log('[App] 首次访问，下载完整数据');
    const cloudData = await fetch('./shared-data.json').then(r => r.json());
    
    // 去重处理（保持现有逻辑）
    const deduplicatedData = deduplicateCloudData(cloudData);
    
    // 提取元数据
    const metadata = {
      lastSyncAt: new Date().toISOString(),
      cloudVersion: extractVersionFromData(deduplicatedData),
      availableDates: deduplicatedData.map(r => r.date)
    };
    
    // 构建当前数据（最新的一条）
    const latestRecord = deduplicatedData[0];
    const currentData = parseRecord(latestRecord);
    
    // 构建缓存（最近 3 条）
    const cache = {};
    deduplicatedData.slice(0, 3).forEach(record => {
      cache[record.date] = parseRecord(record);
    });
    
    // 保存到 localStorage
    const dataToSave = {
      version: 3,
      metadata,
      currentData,
      cache,
      currentImportIndex: 0,
      currentMerchantType: 'all'
    };
    
    DataStore.save(dataToSave);
    
    // 初始化状态
    initializeAppState(dataToSave);
    return true;
  }
  
  // 3. 有缓存：检查云端更新
  const hasUpdate = await checkCloudForUpdates(localData);
  if (hasUpdate) {
    // 重新下载完整数据（同首次访问逻辑）
    // ...
    return true;
  }
  
  // 4. 无更新：使用本地缓存
  initializeAppState(localData);
  return true;
}
```

**Step 2：修改 checkCloudForUpdates()**
```javascript
async function checkCloudForUpdates(localData) {
  try {
    // 1. 下载索引文件（轻量级）
    const indexResponse = await fetch('./index.json');
    if (!indexResponse.ok) {
      console.warn('[App] 索引文件下载失败，回退到完整检查');
      return await checkCloudForUpdatesFallback(localData);
    }
    
    const cloudIndex = await indexResponse.json();
    
    // 2. 对比版本号
    const localVersion = localData.metadata?.cloudVersion;
    const cloudVersion = cloudIndex.version;
    
    if (cloudVersion > localVersion) {
      console.log(`[App] 发现新版本：${localVersion} → ${cloudVersion}`);
      return true;
    }
    
    // 3. 检查是否有新的日期
    const localDates = new Set(localData.metadata?.availableDates || []);
    const cloudDates = new Set(cloudIndex.records.map(r => r.date));
    
    const newDates = [...cloudDates].filter(d => !localDates.has(d));
    if (newDates.length > 0) {
      console.log(`[App] 发现新日期：${newDates}`);
      return true;
    }
    
    // 4. 检查已有日期的更新时间
    for (const cloudRecord of cloudIndex.records) {
      const localRecord = localData.cache?.[cloudRecord.date];
      if (localRecord && cloudRecord.updatedAt > localRecord.importedAt) {
        console.log(`[App] 日期 ${cloudRecord.date} 有更新`);
        return true;
      }
    }
    
    console.log('[App] 云端数据未更新');
    return false;
    
  } catch (e) {
    console.error('[App] 检查更新失败:', e);
    return false;
  }
}
```

**Step 3：修改 switchImportDate()**
```javascript
async function switchImportDate(idx) {
  idx = parseInt(idx);
  if (idx < 0 || idx >= importHistory.length) return;
  
  const selectedDate = importHistory[idx].monthLabel;
  
  // 1. 检查缓存中是否有
  const cachedData = DataStore.getCache(selectedDate);
  if (cachedData) {
    console.log(`[App] 从缓存加载：${selectedDate}`);
    updateUIWithMerchantData(cachedData);
    return;
  }
  
  // 2. 缓存未命中：从云端下载
  console.log(`[App] 缓存未命中，从云端加载：${selectedDate}`);
  showToast(`正在加载 ${selectedDate} 数据...`, 'info');
  
  try {
    const cloudData = await fetch('./shared-data.json').then(r => r.json());
    const record = cloudData.find(r => r.date === selectedDate);
    
    if (!record) {
      throw new Error(`未找到日期 ${selectedDate} 的数据`);
    }
    
    const merchantData = parseRecord(record);
    
    // 3. 更新缓存（LRU 策略）
    DataStore.setCache(selectedDate, merchantData);
    
    // 4. 更新 UI
    updateUIWithMerchantData(merchantData);
    showToast(`已加载 ${selectedDate} 数据`, 'success');
    
  } catch (e) {
    console.error('[App] 加载历史数据失败:', e);
    showToast('加载失败：' + e.message, 'error');
  }
}
```

**Step 4：添加辅助函数**
```javascript
// 从云端记录解析出 merchantData
function parseRecord(record) {
  let merchantData = record.merchantData || record.currentData?.merchantData;
  
  // 兼容旧格式
  if (!merchantData && record.currentData?.cities) {
    merchantData = {
      all: {
        date: record.date,
        cities: record.currentData.cities
      }
    };
  }
  
  // 计算毛利（保持现有逻辑）
  calculateProfit(merchantData);
  
  return merchantData;
}

// 从数据中提取版本号
function extractVersionFromData(cloudData) {
  // 优先使用 version 字段
  const latest = cloudData.find(r => r.isLatest === true) || cloudData[0];
  return latest.version ? `v${latest.version}` : latest.date.replace(/-/g, '');
}

// 初始化应用状态
function initializeAppState(data) {
  // 从 cache 或 importHistory 构建 allMerchantData
  const currentRecord = data.importHistory[data.currentImportIndex];
  const allMerchantData = data.cache?.[currentRecord.monthLabel] || currentRecord.data;
  
  // 更新全局变量
  window.allMerchantData = allMerchantData;
  window.importHistory = data.importHistory;
  window.currentData = data.currentData;
  window.currentImportIndex = data.currentImportIndex;
  window.currentMerchantType = data.currentMerchantType;
  
  // 初始化状态管理器
  StateManager.init({
    currentData: data.currentData,
    allMerchantData: allMerchantData,
    importHistory: data.importHistory,
    currentImportIndex: data.currentImportIndex,
    currentMerchantType: data.currentMerchantType
  });
  
  // 渲染 UI
  renderImportSelector();
  renderOverview();
  renderDimension();
  renderTrend();
}
```

### 阶段 3：测试验证

#### 3.1 功能测试清单
- [ ] 首次加载（无缓存）
- [ ] 刷新页面（有缓存）
- [ ] 切换日期（缓存命中）
- [ ] 切换日期（缓存未命中）
- [ ] 云端更新检测
- [ ] 旧数据迁移（v2 → v3）
- [ ] 存储空间检查
- [ ] 错误处理（网络失败）

#### 3.2 性能测试
- [ ] 首次加载时间 < 3 秒
- [ ] 缓存命中切换时间 < 100ms
- [ ] 缓存未命中切换时间 < 2 秒
- [ ] localStorage 大小 < 1MB

#### 3.3 用户测试
- [ ] 新用户首次打开体验
- [ ] 老用户数据迁移
- [ ] 多设备同步

---

## 📝 五、实施清单

### 前置工作（必须完成）
- [ ] 1. 创建 `generate_index.py` 脚本
- [ ] 2. 生成 `index.json` 并推送到 GitHub
- [ ] 3. 验证 `index.json` 可通过 HTTPS 访问
- [ ] 4. 备份现有代码（Git 分支）

### 代码改造（按顺序执行）
- [ ] 1. 修改 `data-store.js`（添加 v3 支持）
- [ ] 2. 修改 `state-manager.js`（支持新数据结构）
- [ ] 3. 修改 `index-new.html` 的 `loadFromCloud()`
- [ ] 4. 修改 `index-new.html` 的 `checkCloudForUpdates()`
- [ ] 5. 修改 `index-new.html` 的 `switchImportDate()`
- [ ] 6. 添加辅助函数（parseRecord、initializeAppState 等）

### 测试验证（必须完成）
- [ ] 1. 本地测试所有功能
- [ ] 2. 推送到测试分支
- [ ] 3. 访问测试链接验证
- [ ] 4. 确认无问题后推送到 main

### 回滚方案（必须准备）
- [ ] 1. 保留原代码分支
- [ ] 2. 准备回滚脚本
- [ ] 3. 测试回滚流程

---

## 🚨 六、关键注意事项

### 6.1 绝对不能犯的错误
1. ❌ **不要删除 allMerchantData 而不从 cache 重建** → 页面会无数据
2. ❌ **不要同时修改多个文件** → 难以定位问题
3. ❌ **不要跳过测试直接推送** → 影响所有用户
4. ❌ **不要忘记数据迁移逻辑** → 老用户数据会丢失

### 6.2 必须验证的点
1. ✅ **首次加载**：新用户打开页面是否正常
2. ✅ **数据迁移**：老用户（v2 数据）是否正常升级
3. ✅ **缓存切换**：切换日期是否流畅
4. ✅ **云端更新**：新数据上传后是否能检测到

### 6.3 性能优化建议
1. 📦 **压缩云端数据**：移除不必要的空格和换行
2. 🔄 **后台预加载**：用户选择前提前下载
3. 💾 **增量更新**：只下载变化的记录（未来优化）

---

## 📊 七、预期效果

| 指标 | 改造前 | 改造后 | 改善 |
|------|--------|--------|------|
| localStorage 大小 | 2.5MB | < 1MB | 60%↓ |
| 可支持记录数 | 20 条 | 无限 | ∞ |
| 首次加载时间 | 3 秒 | 1 秒 | 67%↓ |
| 云端检查开销 | 2.5MB | 5KB | 99.8%↓ |
| 缓存命中切换 | 即时 | 即时 | - |
| 缓存未命中切换 | - | 1-2 秒 | 新功能 |

---

## 🎯 八、决策点

### 需要您确认的事项：

1. **是否立即创建 index.json？**
   - ✅ 是：我开始写脚本
   - ⏸️ 否：先完善方案

2. **是否分阶段推送？**
   - ✅ 是：先推送 index.json → 测试 → 再推送代码
   - ⏸️ 否：一次性推送所有改动

3. **是否保留回滚能力？**
   - ✅ 是：创建 `feature/hybrid-storage` 分支
   - ⏸️ 否：直接在 main 修改

4. **是否添加加载进度条？**
   - ✅ 是：提升用户体验
   - ⏸️ 否：保持简单

---

## 💬 下一步行动

请您确认以上决策点后，我将：
1. 创建 `generate_index.py` 脚本
2. 生成并推送 `index.json`
3. 创建功能分支开始代码改造
4. 按模块逐步实施并测试

**预计总时间**：2-3 小时（包括测试）

您确认开始吗？还是有哪些地方需要再讨论？

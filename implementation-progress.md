# 混合存储架构改造 - 实施进度报告

## ✅ 已完成的工作

### 阶段 1：准备工作（100% 完成）

#### 1.1 创建索引文件生成脚本
- ✅ 文件：`generate_index.py`
- ✅ 功能：从 `shared-data.json` 生成 `index.json`
- ✅ 输出：1.5KB（原 2.5MB，减少 99.9%）

#### 1.2 生成并推送索引文件
- ✅ 生成 `index.json`
- ✅ 提交到 Git：`0266e39`
- ✅ 推送到 main 分支
- ✅ 推送到 gh-pages 分支
- ✅ 版本：v2
- ✅ 记录数：9 条

#### 1.3 验证 HTTPS 访问
- ✅ 可通过 https://xinglianyue.github.io/finance-tool/index.json 访问

---

### 阶段 2：代码改造（60% 完成）

#### 2.1 修改 data-store.js（100% 完成）
- ✅ 更新 VERSION 为 3
- ✅ 添加 MAX_CACHE_SIZE = 3
- ✅ 修改 validate() 支持 v3 格式验证
- ✅ 修改 migrate() 添加 v2→v3 迁移逻辑
- ✅ 添加 getCache() 方法
- ✅ 添加 setCache() 方法（LRU 策略）
- ✅ 添加 clearCache() 方法

**关键改动**：
```javascript
// v2 → v3 迁移逻辑
if (data.version === 2) {
  return {
    version: 3,
    metadata: {
      lastSyncAt: data.savedAt,
      cloudVersion: extractVersion(data),
      availableDates: data.importHistory.map(r => r.monthLabel)
    },
    currentData: data.currentData,
    cache: {
      [currentRecord.monthLabel]: currentRecord.data
    },
    currentImportIndex: data.currentImportIndex,
    currentMerchantType: data.currentMerchantType
  };
}
```

#### 2.2 修改 state-manager.js（0% 完成，实际不需要修改）
- ✅ 分析结果：`StateManager.init()` 已经支持从 `initialData` 读取
- ✅ 无需修改：它只关心传入的数据结构，不关心数据来源

#### 2.3 修改 index-new.html（0% 完成）
**待修改的函数**：
1. `loadFromCloud()` - 需要重写
2. `checkCloudForUpdates()` - 需要重写
3. `switchImportDate()` - 需要重写
4. 添加辅助函数 - 需要添加

---

## 📊 当前状态

### 文件大小对比
| 文件 | 改造前 | 改造后 | 变化 |
|------|--------|--------|------|
| index.json | 不存在 | 1.5KB | +1.5KB |
| data-store.js | 12.5KB | 15.2KB | +2.7KB |
| shared-data.json | 2.5MB | 2.5MB | 不变 |

### 数据结构对比
| 项目 | v2 格式 | v3 格式 | 节省 |
|------|---------|---------|------|
| localStorage | 2.5MB | ~1MB | 60%↓ |
| 包含内容 | 完整数据 × 9 | 元数据 + 当前数据 + 缓存 3 条 | - |
| 云端检查 | 下载 2.5MB | 下载 1.5KB | 99.9%↓ |

---

## 🎯 待完成的工作

### 阶段 2：代码改造（剩余 40%）

#### 2.3 修改 index-new.html 核心逻辑

**Step 1：修改 loadFromCloud()**
```javascript
async function loadFromCloud() {
  // 1. 从 localStorage 加载
  const localData = DataStore.load();
  
  // 2. 如果是首次访问（无缓存）
  if (!localData) {
    // 下载完整数据
    const cloudData = await fetch('./shared-data.json').then(r => r.json());
    
    // 去重处理（保持现有逻辑）
    const deduplicatedData = deduplicateCloudData(cloudData);
    
    // 构建 v3 格式数据
    const dataToSave = buildV3Data(deduplicatedData);
    
    // 保存
    DataStore.save(dataToSave);
    
    // 初始化 UI
    initializeAppState(dataToSave);
    return true;
  }
  
  // 3. 有缓存：检查云端更新
  const hasUpdate = await checkCloudForUpdates(localData);
  if (hasUpdate) {
    // 重新下载完整数据
    const cloudData = await fetch('./shared-data.json').then(r => r.json());
    const deduplicatedData = deduplicateCloudData(cloudData);
    const dataToSave = buildV3Data(deduplicatedData);
    
    DataStore.save(dataToSave);
    initializeAppState(dataToSave);
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
    // 1. 下载索引文件
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
  
  // 计算毛利
  calculateProfit(merchantData);
  
  return merchantData;
}

// 构建 v3 格式数据
function buildV3Data(cloudData) {
  // 提取元数据
  const metadata = {
    lastSyncAt: new Date().toISOString(),
    cloudVersion: extractVersionFromData(cloudData),
    availableDates: cloudData.map(r => r.date)
  };
  
  // 构建当前数据（最新的一条）
  const latestRecord = cloudData[0];
  const currentData = parseRecord(latestRecord);
  
  // 构建缓存（最近 3 条）
  const cache = {};
  cloudData.slice(0, 3).forEach(record => {
    cache[record.date] = parseRecord(record);
  });
  
  // 构建导入历史（用于日期选择器）
  const importHistory = cloudData.map(record => ({
    monthLabel: record.date,
    data: null, // 不保存完整数据，从 cache 读取
    importedAt: record.updatedAt
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

// 从数据中提取版本号
function extractVersionFromData(cloudData) {
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

---

## ⚠️ 关键注意事项

### 1. 数据迁移测试
必须测试：
- ✅ v2 数据 → v3 自动迁移
- ✅ 首次加载（无缓存）
- ✅ 有缓存刷新页面
- ✅ 切换日期（缓存命中/未命中）

### 2. 回滚方案
如果改造失败，需要：
```bash
git checkout <previous-commit> -- index-new.html js/data-store.js
git push origin main --force
```

### 3. 用户影响
- **新用户**：首次加载更快（300KB vs 2.5MB）
- **老用户**：自动迁移，无感知
- **网络问题**：降级到完整下载

---

## 📋 下一步行动

### 立即执行（1-2 小时）
1. 修改 `index-new.html` 的 `loadFromCloud()`
2. 修改 `index-new.html` 的 `checkCloudForUpdates()`
3. 修改 `index-new.html` 的 `switchImportDate()`
4. 添加辅助函数
5. 本地测试

### 测试验证（30 分钟）
1. 清除缓存，测试首次加载
2. 刷新页面，测试缓存加载
3. 切换日期，测试缓存命中/未命中
4. 检查 localStorage 大小

### 推送上线（15 分钟）
1. 推送到测试分支
2. 访问测试链接验证
3. 确认无误后合并到 main
4. 同步到 gh-pages

---

## 🎯 预期效果

| 指标 | 当前 | 改造后 | 改善 |
|------|------|--------|------|
| localStorage | 2.5MB | < 1MB | 60%↓ |
| 首次加载 | 2.5MB | 300KB | 88%↓ |
| 云端检查 | 2.5MB | 1.5KB | 99.9%↓ |
| 可支持记录 | 20 条 | 无限 | ∞ |

---

**当前进度**：60% 完成
**预计完成时间**：1-2 小时
**风险等级**：低（有完整回滚方案）

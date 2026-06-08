# 混合存储架构改造 - index-new.html 修改补丁

## 修改位置 1：添加辅助函数（在 loadFromCloud 之前）

在第 1664 行（loadFromCloud 函数之前）添加以下辅助函数：

```javascript
    /**
     * 从云端记录解析出 merchantData
     * @param {Object} record - 云端记录
     * @returns {Object} - 商家数据
     */
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
      
      // 深拷贝，避免修改原始数据
      merchantData = JSON.parse(JSON.stringify(merchantData));
      
      // 计算毛利（信任原始数据，只在缺失时计算）
      calculateProfit(merchantData);
      
      return merchantData;
    }
    
    /**
     * 从云端数据中提取版本号
     * @param {Array} cloudData - 云端数据数组
     * @returns {string} - 版本号
     */
    function extractVersionFromData(cloudData) {
      const latest = cloudData.find(r => r.isLatest === true) || cloudData[0];
      return latest.version ? `v${latest.version}` : latest.date.replace(/-/g, '');
    }
    
    /**
     * 构建 v3 格式的数据
     * @param {Array} cloudData - 云端完整数据
     * @returns {Object} - v3 格式的数据
     */
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
      
      // 从 currentData 中提取 totals 和 cities
      const allCitiesData = currentData.all?.cities || [];
      let totalData = null;
      let citiesData = [];
      
      allCitiesData.forEach(city => {
        if (city.name === '总商') {
          totalData = city;
        } else {
          citiesData.push(city);
        }
      });
      
      const formattedCurrentData = {
        totals: totalData && totalData.modules && totalData.modules.all ? totalData.modules.all : {},
        cities: citiesData
      };
      
      // 构建缓存（最近 3 条）
      const cache = {};
      cloudData.slice(0, 3).forEach(record => {
        cache[record.date] = parseRecord(record);
      });
      
      // 构建导入历史（用于日期选择器）
      const importHistory = cloudData.map(record => ({
        monthLabel: record.date,
        data: null, // 不保存完整数据，从 cache 读取
        importedAt: record.updatedAt || new Date().toISOString(),
        fileName: record.fileName || ''
      }));
      
      return {
        version: 3,
        metadata,
        currentData: formattedCurrentData,
        cache,
        importHistory,
        currentImportIndex: 0,
        currentMerchantType: 'all'
      };
    }
    
    /**
     * 初始化应用状态
     * @param {Object} data - v3 格式的数据
     */
    function initializeAppState(data) {
      // 从 cache 或 importHistory 构建 allMerchantData
      const currentRecord = data.importHistory[data.currentImportIndex];
      let allMerchantData = data.cache?.[currentRecord.monthLabel];
      
      // 如果 cache 中没有，从 importHistory 读取（兼容旧数据）
      if (!allMerchantData && currentRecord.data) {
        allMerchantData = currentRecord.data;
      }
      
      // 如果还是没有，使用当前数据反向构建
      if (!allMerchantData) {
        console.warn('[App] 无法从 cache 或 importHistory 获取数据，使用当前数据');
        allMerchantData = {
          all: {
            cities: [
              { name: '总商', displayName: '总商', modules: { all: data.currentData.totals } },
              ...data.currentData.cities.map(c => ({ name: c.displayName, displayName: c.displayName, modules: { all: c.modules?.all || {} } }))
            ]
          }
        };
      }
      
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
      
      console.log('[App] 应用状态初始化完成', {
        hasData: !!allMerchantData,
        historyCount: data.importHistory.length,
        cacheSize: Object.keys(data.cache || {}).length
      });
    }
```

## 修改位置 2：重写 loadFromCloud() 函数

替换第 1665-2058 行的 `loadFromCloud()` 函数：

```javascript
    async function loadFromCloud() {
      try {
        console.log('[App] 正在从云端加载数据...');
        
        // 1. 从 localStorage 加载
        const localData = DataStore.load();
        
        // 2. 如果是首次访问（无缓存）
        if (!localData) {
          console.log('[App] 首次访问，下载完整数据');
          showToast('正在加载云端数据...', 'info');
          
          let cloudData = null;
          
          // 优先使用相对路径加载
          try {
            const localResponse = await fetch('./shared-data.json');
            if (localResponse.ok) {
              cloudData = await localResponse.json();
              console.log('[App] 从相对路径加载成功');
            }
          } catch (localError) {
            console.warn('[App] 相对路径加载异常:', localError);
          }
          
          // 如果相对路径加载失败，尝试直接下载
          if (!cloudData) {
            try {
              const directResponse = await fetch('https://raw.githubusercontent.com/xinglianyue/finance-tool/main/shared-data.json');
              if (directResponse.ok) {
                cloudData = await directResponse.json();
                console.log('[App] 直接下载成功');
              }
            } catch (directError) {
              console.warn('[App] 直接下载异常:', directError);
            }
          }
          
          if (!cloudData || !Array.isArray(cloudData) || cloudData.length === 0) {
            console.log('[App] 云端数据为空或解析失败');
            showToast('云端数据加载失败', 'error');
            return false;
          }
          
          console.log('[App] 云端数据加载成功，共' + cloudData.length + '条记录');
          
          // 去重处理
          const deduplicatedData = deduplicateCloudData(cloudData);
          console.log('[App] 去重完成，剩余 ' + deduplicatedData.length + ' 条记录');
          
          // 构建 v3 格式数据
          const dataToSave = buildV3Data(deduplicatedData);
          
          // 保存到 localStorage
          DataStore.save(dataToSave);
          console.log('[App] 数据已保存到本地');
          
          // 初始化 UI
          initializeAppState(dataToSave);
          showToast(`数据加载成功，共${deduplicatedData.length}条记录`, 'success');
          return true;
        }
        
        // 3. 有缓存：检查云端更新
        console.log('[App] 检测到本地缓存，检查云端更新...');
        const hasUpdate = await checkCloudForUpdates(localData);
        
        if (hasUpdate) {
          console.log('[App] 发现云端更新，重新下载完整数据');
          showToast('发现新数据，正在更新...', 'info');
          
          let cloudData = null;
          
          // 下载完整数据
          try {
            const response = await fetch('./shared-data.json');
            if (response.ok) {
              cloudData = await response.json();
            }
          } catch (e) {
            console.warn('[App] 下载失败:', e);
          }
          
          if (cloudData && cloudData.length > 0) {
            const deduplicatedData = deduplicateCloudData(cloudData);
            const dataToSave = buildV3Data(deduplicatedData);
            
            DataStore.save(dataToSave);
            initializeAppState(dataToSave);
            showToast(`已更新到最新版本，共${deduplicatedData.length}条记录`, 'success');
            return true;
          }
        }
        
        // 4. 无更新：使用本地缓存
        console.log('[App] 云端数据未更新，使用本地缓存');
        initializeAppState(localData);
        return true;
        
      } catch (e) {
        console.error('[App] 云端数据加载失败:', e);
        showToast('加载失败：' + e.message, 'error');
        return false;
      }
    }
```

## 修改位置 3：重写 checkCloudForUpdates() 函数

替换第 2065-2159 行的 `checkCloudForUpdates()` 函数：

```javascript
    async function checkCloudForUpdates(localData) {
      try {
        console.log('[App] 检查云端更新...');
        
        // 1. 下载索引文件
        let cloudIndex = null;
        
        try {
          const indexResponse = await fetch('./index.json');
          if (indexResponse.ok) {
            cloudIndex = await indexResponse.json();
            console.log('[App] 索引文件下载成功，版本：' + cloudIndex.version);
          } else {
            console.warn('[App] 索引文件下载失败，回退到完整检查');
            return await checkCloudForUpdatesFallback(localData);
          }
        } catch (e) {
          console.warn('[App] 索引文件加载异常:', e);
          return await checkCloudForUpdatesFallback(localData);
        }
        
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
          const localCacheData = localData.cache?.[cloudRecord.date];
          if (localCacheData && cloudRecord.updatedAt) {
            const cloudTime = new Date(cloudRecord.updatedAt);
            const localTime = new Date(localCacheData.importedAt || localCacheData.savedAt);
            if (cloudTime > localTime) {
              console.log(`[App] 日期 ${cloudRecord.date} 有更新`);
              return true;
            }
          }
        }
        
        console.log('[App] 云端数据未更新');
        return false;
        
      } catch (e) {
        console.error('[App] 检查更新失败:', e);
        return false;
      }
    }
    
    /**
     * 回退的更新检查方法（当索引文件不可用时）
     */
    async function checkCloudForUpdatesFallback(localData) {
      try {
        console.log('[App] 使用回退方法检查更新...');
        
        // 下载完整数据
        const cloudData = await fetch('./shared-data.json').then(r => r.json());
        if (!cloudData || cloudData.length === 0) {
          return false;
        }
        
        // 对比日期列表
        const localDates = (localData.importHistory || []).map(r => r.monthLabel);
        const cloudDates = cloudData.map(r => r.date);
        
        const newDates = cloudDates.filter(d => !localDates.includes(d));
        if (newDates.length > 0) {
          console.log(`[App] 发现新日期：${newDates}`);
          return true;
        }
        
        return false;
        
      } catch (e) {
        console.error('[App] 回退检查失败:', e);
        return false;
      }
    }
```

## 修改位置 4：重写 switchImportDate() 函数

替换第 1504-1554 行的 `switchImportDate()` 函数：

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
        // 下载完整数据
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
    
    /**
     * 使用商家数据更新 UI
     * @param {Object} merchantData - 商家数据
     */
    function updateUIWithMerchantData(merchantData) {
      currentMerchantType = 'all';
      
      // 从 merchantData.all.cities 中提取总商和城市数据
      const allCitiesData = merchantData.all?.cities || [];
      let totalData = null;
      let citiesData = [];
      
      allCitiesData.forEach(city => {
        if (city.name === '总商') {
          totalData = city;
        } else {
          citiesData.push(city);
        }
      });
      
      // 如果没有总商但有数据，使用第一个
      if (!totalData && allCitiesData.length > 0) {
        totalData = allCitiesData[0];
      }
      
      allMerchantData = merchantData;
      
      currentData = {
        totals: totalData && totalData.modules && totalData.modules.all ? totalData.modules.all : {},
        cities: citiesData
      };
      
      // 更新全局变量
      window.allMerchantData = allMerchantData;
      window.currentData = currentData;
      window.currentMerchantType = currentMerchantType;
      
      // 更新状态管理器
      StateManager.set('currentData', currentData, false);
      StateManager.set('allMerchantData', allMerchantData, false);
      
      // 重新渲染
      renderOverview();
      renderDimension();
      renderTrend();
      
      console.log('[App] UI 已更新', {
        totalsKeys: Object.keys(currentData.totals),
        citiesCount: currentData.cities.length
      });
    }
```

## 测试清单

修改完成后，必须测试：

1. ✅ 清除缓存，首次加载
2. ✅ 刷新页面，使用缓存
3. ✅ 切换日期（缓存命中）
4. ✅ 切换日期（缓存未命中）
5. ✅ 检查 localStorage 大小 < 1MB
6. ✅ 检查控制台无错误

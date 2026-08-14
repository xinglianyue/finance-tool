# 检查 localStorage 数据结构

请在浏览器控制台执行以下代码，并告诉我输出结果：

```javascript
// 1. 检查数据版本
const data = JSON.parse(localStorage.getItem('finance-tool'));
console.log('=== 数据结构检查 ===');
console.log('版本号:', data.version);
console.log('是否有 metadata:', !!data.metadata);
console.log('是否有 cache:', !!data.cache);
console.log('是否有 allMerchantData:', !!data.allMerchantData);
console.log('cache 大小:', Object.keys(data.cache || {}).length);
console.log('importHistory 长度:', data.importHistory?.length);

// 2. 检查 cache 中的内容
console.log('\n=== Cache 内容检查 ===');
if (data.cache) {
  const cacheKeys = Object.keys(data.cache);
  console.log('cache keys:', cacheKeys);
  if (cacheKeys.length > 0) {
    const firstKey = cacheKeys[0];
    console.log('第一个 cache 项:', firstKey);
    console.log('cache[firstKey] 是否有 all:', !!data.cache[firstKey].all);
  }
}

// 3. 检查 importHistory
console.log('\n=== importHistory 检查 ===');
if (data.importHistory && data.importHistory.length > 0) {
  const firstRecord = data.importHistory[0];
  console.log('第一条记录:', firstRecord);
  console.log('monthLabel:', firstRecord.monthLabel);
  console.log('data 是否为 null:', firstRecord.data === null);
}

// 4. 计算大小
console.log('\n=== 大小检查 ===');
const size = (JSON.stringify(data).length / 1024).toFixed(1);
console.log('localStorage 大小:', size, 'KB');
```

## 预期输出（v3 格式）：

```
=== 数据结构检查 ===
版本号：3
是否有 metadata: true
是否有 cache: true
是否有 allMerchantData: false ✅（v3 不保存这个字段）
cache 大小：1
importHistory 长度：9

=== Cache 内容检查 ===
cache keys: ['2026-05-31']
第一个 cache 项：2026-05-31
cache[firstKey] 是否有 all: true

=== importHistory 检查 ===
第一条记录：{monthLabel: '2026-05-31', data: null, ...}
monthLabel: 2026-05-31
data 是否为 null: true ✅（v3 格式 data 为 null）

=== 大小检查 ===
localStorage 大小：1300.5 KB（应该在 1200-1400KB 之间）
```

## 如果输出不同：

**如果版本号不是 3**：说明还是旧格式，需要清除缓存重新加载

**如果大小 > 2MB**：说明还是 v2 格式，需要清除缓存

**如果 allMerchantData: true**：说明保存的还是旧格式

请执行上面的检查代码，告诉我输出结果！

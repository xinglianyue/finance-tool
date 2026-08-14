# 财务分析工具 - 问题诊断与修复历史文档

## 一、项目概况

**项目名称**: 财务分析工具 (finance-tool)  
**部署地址**: GitHub Pages  
**仓库**: https://github.com/xinglianyue/finance-tool  
**主文件**: `index-new.html` (单文件HTML应用，内联所有JS/CSS)  
**数据文件**: `shared-data.json` (云端数据存储)  

**核心架构**:
- 纯前端单页应用，无后端服务
- DataStore: localStorage 数据持久化层
- StateManager: 全局状态管理
- 数据从 `shared-data.json` (相对路径 ./shared-data.json) 加载
- 支持版本缓存、去重、多城市维度下钻分析

---

## 二、时间线与问题清单

### 阶段1: DataStore 模块缺失错误

**现象**: 控制台报错 `TypeError: DataStore.save is not a function`

**根因分析**:
- 原代码通过 `<script src="js/data-store.js">` 外部引用 DataStore
- 但该文件可能未正确加载或被缓存覆盖
- 导致 DataStore 对象未定义或关键方法丢失

**修复措施**:
```javascript
// 在 index-new.html 顶部完全内联 DataStore 实现
function DataStore() {
    this.STORAGE_KEY = 'finance-tool';
    this.BACKUP_KEY = 'finance-tool-backup';
    this.CACHE_PREFIX = 'cache_';
}
DataStore.prototype.load = function() { ... }
DataStore.prototype.save = function(data) { ... }
DataStore.prototype.getCache = function(date) { ... }
DataStore.prototype.setCache = function(date, data) { ... }
// 完整实现见当前代码
```

**结果**: ✅ 修复成功

---

### 阶段2: StateManager 方法名不一致

**现象**: 控制台报错 `TypeError: StateManager.init is not a function`

**根因分析**:
- 代码中调用的是 `StateManager.initialize()`
- 但某处仍在使用旧的方法名 `StateManager.init()`
- 或者是浏览器缓存了旧版本的代码

**修复措施**:
1. 统一所有调用点为 `StateManager.initialize()`
2. 确保类定义在前，调用在后
3. 创建全局实例：`window.StateManager = new StateManager()`

**结果**: ✅ 修复成功（但后续被缓存问题掩盖）

---

### 阶段3: JSON 语法错误 - 非法 return 语句

**现象**: 控制台报错 `SyntaxError: Illegal return statement at line 145`

**根因分析**:
- IIFE (立即执行函数表达式) 内部使用了独立的 `return store; })();`
- `return` 只能在函数内部使用，在 IIFE 外层会导致语法错误

**修复措施**:
删除多余的 return 语句，确保所有代码在函数作用域内

**结果**: ✅ 修复成功

---

### 阶段4: JSON 语法错误 - 意外 token

**现象**: 控制台报错 `SyntaxError: Unexpected token '(' at line 225`

**根因分析**:
- StateManager 类的定义格式不正确
- 可能是括弧不匹配或类声明位置错误

**修复措施**:
重构 StateManager 类定义，确保语法正确：
```javascript
class StateManager {
    constructor() { ... }
    initialize(initialData) { ... }
    // ... 其他方法
}
```

**结果**: ✅ 修复成功

---

### 阶段5: HTTP/2 协议错误 - 文件过大

**现象**: 
- 控制台报错 `net::ERR_HTTP2_PROTOCOL_ERROR 200`
- `shared-data.json` 文件大小 4.92MB
- CDN 传输不稳定，频繁超时

**根因分析**:
- 原始 JSON 文件包含所有18条记录的完整数据
- jsDelivr CDN 对大文件传输有限制
- HTTP/2 协议在处理超大 payload 时可能出现协议错误

**尝试的修复措施**:

**方案A**: 压缩 JSON
- 只保留最新一条记录 + 历史元数据
- 文件大小从 4.92MB 降到 0.27MB
- **问题**: 丢失了历史数据的 merchantData，用户无法查看历史月份数据

**方案B**: 恢复完整数据
- 重新写入全部18条记录的完整 merchantData
- 文件大小回到 ~5MB
- **问题**: HTTP/2 协议错误持续出现

**最终策略**: 接受大文件，通过多次版本迭代触发 CDN 刷新

---

### 阶段6: parseRecord JSON.parse undefined 错误 ⚠️ 当前待解决

**现象**: 
```
SyntaxError: "undefined" is not valid JSON (at VM25:1:1)
    at JSON.parse (<anonymous>)
    at parseRecord (index-new.html:9525:27)
    at loadFromCloud (index-new.html:11594:32)
```

**根因分析**:
1. `shared-data.json` 中包含 `history_meta` 类型的元数据记录
2. 这些记录没有 `merchantData` 字段
3. `parseRecord` 函数在遍历 cloudData 时未跳过这类记录
4. 当处理 `history_meta` 记录时：
   ```javascript
   let merchantData = record.merchantData || record.currentData?.merchantData;
   // merchantData = undefined
   merchantData = JSON.parse(JSON.stringify(merchantData));
   // JSON.stringify(undefined) = undefined (不是字符串!)
   JSON.parse(undefined) // ❌ SyntaxError
   ```

**已实施的修复** (最新 commit b0ea8ff):
```javascript
function parseRecord(record) {
    // 安全检查：如果是元数据记录或没有有效数据，直接返回 null
    if (!record || record.type === 'history_meta' || !record.merchantData && !record.currentData?.merchantData) {
        console.log('[parseRecord] 跳过无效记录:', record?.type || 'unknown');
        return null;
    }
    // ... 后续逻辑
}
```

**当前状态**: 🔴 代码已修复并推送，但用户可能仍加载旧版本缓存

---

### 阶段7: 维度下钻功能数据为空 ⚠️ 可能与阶段6相关

**现象**: 切换到城市维度时，表格和数据全为空

**可能的根因链**:
1. `parseRecord` 错误导致 cache 构建中断
2. 部分日期的数据未能正确加载到 `window.financeToolCache`
3. `renderDimensionTable()` 获取不到数据

**当前状态**: 待验证（需清除缓存后测试）

---

## 三、缓存问题全解析

这是贯穿整个修复过程的最大障碍：

### 3.1 多层缓存架构

| 层级 | 位置 | 清除方式 | 影响 |
|------|------|----------|------|
| Browser Cache | Chrome 本地 | Ctrl+F5 / Clear Cache | 高 |
| CDN Cache (jsDelivr) | cdn.jsdelivr.net | API purge | 高 |
| localStorage | 浏览器存储 | `localStorage.clear()` | 中 |
| IndexedDB | 浏览器存储 | `indexedDB.deleteDatabase()` | 低 |

### 3.2 版本控制机制

```javascript
var APP_VERSION = '1786599000_PARSE_FIX';
var VER_KEY = 'finance_tool_version';

// 每次页面加载检查版本
if (cachedVer !== APP_VERSION) {
    // 版本变更，清除旧缓存
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem(VER_KEY, APP_VERSION);
}
```

### 3.3 CDN 清除记录

每次推送都执行：
```bash
curl -s "https://purge.jsdelivr.net/gh/xinglianyue/finance-tool@main/index-new.html"
curl -s "https://purge.jsdelivr.net/gh/xinglianyue/finance-tool@main/shared-data.json"
```

---

## 四、Git 提交历史

```
b0ea8ff fix: add parseRecord null guard for history_meta records (当前)
e6f4881 fix: update version to 1786592100_GIT_FIX
6f4234d fix: force new version v1786592000 to clear all caches
0a64f9a fix: skip history_meta records in cache building, 18 records preserved
d35dcf6 fix: 最终修复版本号强制刷新 v1786584700
31f2975 chore: 清除调试文件，准备重新部署
```

---

## 五、当前需要验证的问题

### 5.1 核心问题

1. **parseRecord 修复是否生效**
   - 版本号: `1786599000_PARSE_FIX`
   - 需要清除所有缓存后访问

2. **维度下钻功能是否正常**
   - 切换城市后数据是否显示
   - 多选城市对比是否工作

3. **历史数据完整性**
   - 18条记录是否都能正确加载
   - 日期切换是否正常工作

### 5.2 建议验证步骤

```javascript
// 1. 在控制台执行（强制清除所有缓存）
localStorage.clear()
sessionStorage.clear()

// 2. 硬刷新
location.reload()

// 3. 检查控制台输出
// 期望看到:
[Init] DataStore fully initialized with all methods
[App] 云端数据加载成功
[App] 数据记录数: 18
[App] 去重完成，剩余 18 条记录
```

---

## 六、给开发者的建议

### 6.1 架构层面

1. **避免超大 JSON 文件**
   - 建议将 `shared-data.json` 拆分为多个小文件
   - 或使用压缩格式 (gzip) 传输

2. **增加数据格式校验**
   - 在 `loadFromCloud` 中先验证每条记录的结构
   - 再调用 `parseRecord`

3. **分离数据和代码**
   - 当前所有 JS 都在 HTML 中，维护困难
   - 建议拆分为多个模块化文件

### 6.2 缓存策略优化

```javascript
// 推荐：使用版本号查询参数强制刷新
const VERSION = '1.0.0';
<script src="js/app.js?v=" + VERSION></script>

// 或者在服务端设置短缓存时间
// Cache-Control: no-cache, must-revalidate
```

### 6.3 错误监控

建议在关键位置添加 try-catch：

```javascript
cloudData.forEach(record => {
    try {
        const parsed = parseRecord(record);
        if (parsed) cache[record.date] = parsed;
    } catch (e) {
        console.error(`[App] 解析记录失败 ${record.date}:`, e);
    }
});
```

---

## 七、待确认事项

请开发者确认以下问题：

1. **`history_meta` 记录的作用是什么？**
   - 是否需要保留？如何正确处理？

2. **是否有 plans 来拆分大 JSON 文件？**
   - 当前 5MB 的 JSON 在移动端加载体验较差

3. **维度下钻的具体需求是什么？**
   - 是否需要查看某个城市某一天的详细数据？

4. **是否需要保留所有18条历史记录？**
   - 如果不需要，可以减少文件大小

---

## 八、联系方式

如有问题，可以通过以下方式联系：
- GitHub Issue: https://github.com/xinglianyue/finance-tool/issues
- 直接修改: `C:\Users\xinxi\Desktop\财务工具\index-new.html`

---

*文档生成时间: 2026-08-13*  
*最新版本: 1786599000_PARSE_FIX*

---

## 九、2026-08-14 系统升级记录（稳定性与治理）

### 9.1 修复 DataStore 三重定义
- **问题**: index-new.html 存在 3 处 DataStore 定义（类实例 L137、对象字面量 L148、fallback L24180），实际生效的是简版对象字面量（save 无 try-catch、无备份、clear 不清缓存）
- **修复**: 移除 L148 简版和 L24180 fallback，保留 L19 完整类实现（save 有 try-catch+自动备份，clear 清理缓存）

### 9.2 项目目录治理
- 119 个一次性修复/诊断脚本（fix_*.py、check_*.py、compress_*.py 等）移入 `scripts/archive/`
- 40+ 个 index-new.html 变体备份、临时数据文件、截图移入 `scripts/archive/`
- 48 个过时规划/报告文档移入 `docs/archive/`
- 更新 .gitignore：忽略 `*.pyc`、`__pycache__`、临时文件、敏感配置

### 9.3 安全加固（重要）
- **发现并处理凭证泄露**: `config-db.json`（含 MySQL root 密码 + GitHub Token）和 `token.json`（GitHub Token）曾被提交到仓库，已从 git 跟踪移除并加入 .gitignore
- **⚠️ 必须行动**: 请到 GitHub Settings → Developer settings → Personal access tokens **撤销** `ghp_i2BDB...` 这个 Token，并修改 MySQL 密码，创建新 token 填入本地 `config-db.json`（该文件已在本地保留，不受影响）
- upload-data.html 增加上传密码门禁（客户端 SHA-256 哈希校验，默认密码 `xly2026@upload`）

### 9.4 CI 自动校验
- 新增 `.github/workflows/ci.yml`：每次推送 main 自动运行
  - `test/check-syntax.cjs`：提取 HTML 内联 script 块做真实 `node --check` 语法校验
  - `test/check-data.py`：校验 shared-data.json 18 条记录完整性与 index.json 一致性
- 修复 sync-to-gh-pages.yml：无变更时跳过提交/推送，避免空提交假失败通知

### 9.5 版本号
- index-new.html: `20260814_UPGRADE1`
- upload-data.html: `v20260814.1`

### 9.6 后续修改规范
1. 始终修改 index-new.html 内联代码（外部 js/ 模块仅供旧版 index.html 使用，勿改）
2. 修改后运行 `node test/check-syntax.cjs` 校验语法
3. 修改数据后运行 `python test/check-data.py` 校验完整性
4. 修改后更新版本号（index-new.html 的 APP_VERSION + upload-data.html 版本文本）
5. 上传密码修改：搜索 upload-data.html 中 `UPLOAD_PASSWORD_HASH` 并替换为 `echo -n "新密码" | sha256sum` 的结果

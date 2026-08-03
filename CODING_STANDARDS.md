# 财务分析工具 - 代码规范

## 1. 项目结构规范

```
财务工具/
├── index-v2.html          # 主入口页面（唯一HTML）
├── test-v2.html           # 测试页面
├── css/                   # 样式目录（保留）
├── js/
│   ├── analyzer/         # 分析引擎模块
│   │   ├── analyzer-engine.js      # 核心分析引擎
│   │   ├── data-importer.js        # 数据导入
│   │   ├── enhanced-analyzer.js    # 增强异常检测
│   │   ├── enhanced-root-cause.js   # 增强根因分析
│   │   ├── enhanced-suggestion.js   # 增强建议生成
│   │   └── visualization.js         # 可视化组件
│   ├── legacy/          # 遗留代码（逐步迁移）
│   └── archive/         # 归档代码（不再使用）
├── archive/              # 归档的HTML文件
└── *.md                 # 文档
```

## 2. 命名规范

### 文件命名
- **JavaScript模块**: `kebab-case.js` (如: `data-importer.js`)
- **HTML文件**: `kebab-case.html` (如: `index-v2.html`)
- **CSS文件**: `kebab-case.css`

### 变量命名
```javascript
// 使用 camelCase
let userName = '张三';
let totalOrders = 100000;

// 常量使用 UPPER_SNAKE_CASE
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const API_BASE_URL = 'https://api.example.com';

// 私有变量前缀下划线
let _privateVariable = '私有';

// 类名使用 PascalCase
class FinancialAnalyzer { }
class UEMatrixHeatmap { }

// 布尔变量前缀 is/has/can/should
let isLoading = true;
let hasError = false;
let canExport = true;
```

### 函数命名
```javascript
// 动词 + 名词
function updateStats() { }
function renderHeatmap() { }
function calculateHealth() { }

// 布尔函数前缀 is/has/can
function isValidData() { }
function hasAnomalies() { }
function canExport() { }

// 事件处理函数后缀 Handler
function onClickHandler() { }
function onChangeHandler() { }
```

## 3. 代码结构规范

### 模块结构
```javascript
/**
 * 模块描述
 * 功能说明
 */

// 1. 常量定义
const CONFIG = { };

// 2. 工具函数
function helperFunction() { }

// 3. 主类
class MainClass {
  constructor() { }
  
  // 公共方法
  publicMethod() { }
  
  // 私有方法
  _privateMethod() { }
}

// 4. 导出
window.MainClass = MainClass;
console.log('[Module] 模块名 加载完成');
```

### 函数规范
```javascript
/**
 * 函数描述
 * @param {string} param1 - 参数1说明
 * @param {number} param2 - 参数2说明
 * @returns {boolean} 返回值说明
 */
function myFunction(param1, param2) {
  // 参数验证
  if (!param1) {
    throw new Error('参数1不能为空');
  }
  
  // 函数逻辑
  const result = doSomething(param1, param2);
  
  // 返回
  return result;
}
```

## 4. 注释规范

### JSDoc注释
```javascript
/**
 * 计算健康度评分
 * 
 * @param {Object} data - 城市财务数据
 * @param {number} data.ue - 单均UE
 * @param {number} data.subsidyRatio - 补贴率
 * @param {number} data.orders - 订单量
 * @returns {Object} 包含评分和等级的对象
 * 
 * @example
 * const result = calculateHealth({ ue: 0.5, subsidyRatio: 0.08, orders: 10000 });
 * console.log(result.score); // 75
 * console.log(result.level); // 'good'
 */
function calculateHealth(data) {
  // 实现...
}
```

### 行内注释
```javascript
// TODO: 优化算法性能
// FIXME: 处理边界情况
// NOTE: 这里使用简化逻辑

// 单行注释
const PI = 3.14159; // 圆周率

/* 
 * 多行注释
 * 用于解释复杂逻辑
 */
```

## 5. 代码风格

### 缩进和空格
```javascript
// 使用 2 空格缩进
function example() {
  if (condition) {
    doSomething();
  }
}

// 运算符前后空格
const sum = a + b;
const product = a * b;

// 逗号和分号后空格
function foo(a, b, c) { }
const arr = [1, 2, 3];

// 大括号风格
if (condition) {
  doSomething();
} else {
  doOther();
}
```

### 引号和分号
```javascript
// 使用单引号
const name = '张三';
const message = "Hello";

// 始终添加分号
const add = (a, b) => {
  return a + b;
};
```

## 6. 性能规范

### 避免全局变量
```javascript
// ❌ 不好
let globalVar = '全局变量';

function badFunction() {
  globalVar = '修改全局';
}

// ✅ 好
const MyModule = (function() {
  let privateVar = '私有变量';
  
  function publicMethod() {
    privateVar = '修改私有';
  }
  
  return { publicMethod };
})();
```

### DOM操作优化
```javascript
// ❌ 不好：多次查询DOM
element.innerHTML = '<div>' + data1 + '</div>';
element.innerHTML += '<div>' + data2 + '</div>';
element.innerHTML += '<div>' + data3 + '</div>';

// ✅ 好：一次性更新
let html = '';
html += '<div>' + data1 + '</div>';
html += '<div>' + data2 + '</div>';
html += '<div>' + data3 + '</div>';
element.innerHTML = html;
```

### 事件处理
```javascript
// ❌ 不好：多个相同监听器
element.addEventListener('click', handler1);
element.addEventListener('click', handler2);

// ✅ 好：合并处理函数
function combinedHandler(e) {
  handler1(e);
  handler2(e);
}
element.addEventListener('click', combinedHandler);
```

## 7. 错误处理规范

```javascript
// 参数验证
function processData(data) {
  if (!data) {
    throw new Error('数据不能为空');
  }
  
  if (!Array.isArray(data.items)) {
    throw new TypeError('items必须是数组');
  }
  
  // 业务逻辑...
}

// 异步错误处理
async function fetchData(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP错误: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('[Fetch] 获取数据失败:', error);
    throw error; // 重新抛出让调用者处理
  }
}

// Promise错误处理
fetchData(url)
  .then(data => processData(data))
  .catch(error => {
    console.error('[App] 处理失败:', error);
    showError('数据加载失败');
  });
```

## 8. 测试规范

### 测试文件命名
```
js/analyzer/
├── analyzer-engine.js      # 源文件
└── analyzer-engine.test.js # 测试文件
```

### 测试结构
```javascript
/**
 * 测试套件: FinancialAnalyzer
 */
describe('FinancialAnalyzer', function() {
  
  /**
   * 测试用例: analyze方法
   */
  it('should calculate health score correctly', function() {
    // Arrange
    const data = { cities: [...] };
    const analyzer = new FinancialAnalyzer();
    
    // Act
    const result = analyzer.analyze(data);
    
    // Assert
    expect(result.health.overall).toBeGreaterThan(0);
    expect(result.health.overall).toBeLessThanOrEqual(100);
  });
  
  it('should detect anomalies', function() {
    // 测试异常检测...
  });
});
```

## 9. Git提交规范

```
feat: 新功能
fix: Bug修复
docs: 文档更新
style: 代码格式（不影响功能）
refactor: 重构（不影响功能）
test: 测试相关
chore: 构建/工具变更

示例:
feat: 添加UE热力图可视化
fix: 修复数据导入CSV解析错误
docs: 更新README文档
refactor: 重构异常检测算法
```

## 10. 代码审查清单

### 功能性
- [ ] 功能实现完整？
- [ ] 边界情况处理？
- [ ] 错误处理完善？

### 代码质量
- [ ] 命名规范？
- [ ] 注释清晰？
- [ ] 无重复代码？

### 性能
- [ ] 无内存泄漏？
- [ ] DOM操作优化？
- [ ] 无阻塞操作？

### 测试
- [ ] 有单元测试？
- [ ] 测试通过？
- [ ] 覆盖率足够？

---

*最后更新: 2026-05-16*
*维护者: AI Assistant*

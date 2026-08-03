# 财务分析工具 - 代码考古学与架构诊断报告

## 一、当前系统现状分析

### 1.1 数据流向图（现状）
```
┌─────────────────────────────────────────────────────────────┐
│  原始数据 (Excel/CSV)                                       │
│  ↓ parseExcelFile() / parseCSVFile()                        │
│  原始数据结构                                              │
│  ↓                                                          │
├─────────────────────────────────────────────────────────────┤
│  state (单例全局状态)                                       │
│  - currentData                                             │
│  - merchantData                                            │
│  - allData                                                 │
│  ↓ 所有模块直接读写 state                                    │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┬──────────────┬──────────────┐           │
│  │ overview.js  │  detail.js   │   cost.js    │           │
│  ├──────────────┼──────────────┼──────────────┤           │
│  │ charts.js    │ analysis.js  │ health-*.js  │           │
│  └──────────────┴──────────────┴──────────────┘           │
│  ↓ 直接修改 DOM                                              │
├─────────────────────────────────────────────────────────────┤
│  index.html - 混杂UI与业务                                  │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 模块依赖图（现状）

```
main.js (中心枢纽)
├─→ core.js (全局state/Config/Chart)
│   └─→ 所有其他模块 (依赖core)
├─→ js/
│   ├─ app.js → 几乎所有模块
│   ├─ analysis.js → 依赖core, charts, overview, cost, detail
│   ├─ charts.js → core, overview, cost
│   ├─ overview.js → core, charts, analysis
│   ├─ detail.js → core, charts, analysis
│   ├─ cost.js → core, charts, analysis
│   ├─ file.js → ui, validate
│   ├─ ui.js → core, analysis, overview, detail, cost
│   ├─ validate.js → ui, file
│   ├─ kpi.js → core, overview
│   ├─ report.js → core, analysis, overview, detail, cost
│   ├─ export.js → core, analysis, charts
│   └─ health-*.js → core, analysis
└─→ 根目录 .js 文件 (冗余, 待清理)
```

**依赖问题诊断：**
- ❌ 循环依赖：overview ↔ analysis, charts ↔ overview
- ❌ 模块耦合：app.js依赖了几乎所有其他模块
- ❌ 跨层污染：charts.js直接读取state做业务计算
- ❌ UI逻辑混合：overview.js既有数据处理又有DOM操作

### 1.3 变更热点图（基于历史记录）
```
高变更区 (最脆弱)
├─ index-*.html (8个不同版本) → 版本混乱
├─ js/app.js → 中心枢纽，每次改动都波及
├─ js/analysis.js → 异常检测/分析逻辑频繁变更
└─ js/overview.js → UI展示，功能迭代频繁

中变更区
├─ js/detail.js
├─ js/cost.js
└─ js/charts.js

低变更区
├─ js/utils.js
├─ js/parser.js
└─ css/ (相对稳定)
```

---

## 二、问题诊断与分类（P0-P3优先级）

### P0 - 致命问题（导致崩溃或数据错误）

| 问题 | 影响范围 | 具体表现 |
|------|---------|---------|
| BackupManager.cleanup() 调用错误 | 所有页面 | 启动时 TypeError，BackupManager未正确暴露到window |
| state 无隔离机制 | 全系统 | 任何模块都可直接修改 state，导致"修改A破坏B" |
| 数据验证缺失 | 数据导入 | 导入错误格式数据会导致后续计算失败 |

### P1 - 严重问题（核心功能无法正常工作）

| 问题 | 影响范围 | 具体表现 |
|------|---------|---------|
| UI逻辑与业务逻辑高度耦合 | 所有Tab页 | 同一个函数内既有计算又有DOM操作 |
| 全局变量泛滥 | 全系统 | main.js中注册了60+ window.* 全局变量 |
| 无统一数据流 | 全系统 | 数据来源混乱：state、DataStore、localStorage混用 |
| 缺少自动化测试 | 全系统 | 没有单元测试，重构风险高 |

### P2 - 架构问题（影响开发效率）

| 问题 | 影响范围 | 具体表现 |
|------|---------|---------|
| 无分层架构 | 全系统 | 没有Entities/UseCases/Adapters/Frameworks分层 |
| 重复代码 | 分析模块 | 异常检测逻辑在analysis.js和health-analysis.js重复 |
| 缺少接口契约 | 模块间 | 函数参数和返回值没有明确定义 |
| 职责不清 | overview.js | 既有数据处理、又有渲染、又有异常检测 |

### P3 - 体验优化和代码质量问题

| 问题 | 影响范围 | 具体表现 |
|------|---------|---------|
| 多版本HTML混乱 | 部署 | index.html、index-complete.html、index-clean.html等8个版本 |
| 根目录JS文件冗余 | 维护 | 根目录有alerts.js、backup.js等与js/目录重复的功能 |
| 缺少文档注释 | 所有代码 | 关键函数没有JSDoc注释 |
| 命名不一致 | 全系统 | UE命名不统一(ue/avgUe/singleOrderUe) |

---

## 三、根因分析（Why it happened）

### 3.1 架构缺失导致的"熵增"
- 初期没有统一架构指导，AI根据零散指令生成代码
- 每新增功能，直接往现有文件追加，没有考虑架构一致性
- 缺乏重构机制，技术债务越积越多

### 3.2 数据与表现的纠缠
- 没有区分"数据模型"和"视图模型"
- DOM操作与业务计算在同一个函数中
- 状态变更没有统一流程，直接修改全局变量

### 3.3 自然语言与精确工程的鸿沟
- 需求描述模糊 → 实现模糊
- 缺少验收标准 → 功能完成度难以验证
- 业务概念（如"异常"）在代码中没有精确定义

---

## 四、架构腐化度评估

| 维度 | 评分 | 说明 |
|------|------|------|
| 模块化程度 | 3/10 | 文件多但职责不清，耦合严重 |
| 可测试性 | 2/10 | 全局状态依赖多，难以单元测试 |
| 可维护性 | 3/10 | 修改一个功能可能影响多个文件 |
| 可扩展性 | 4/10 | 新增功能容易，但易引入bug |
| 代码复用 | 3/10 | 有重复代码，复用程度低 |

**总体评价：** 系统已达到"技术债务临界点"，需要立即启动架构重构，否则继续开发会越来越困难。

---

## 五、下一步计划（参考框架）

见 [PROJECT_CONSTITUTION.md](file:///C:/Users/surface/Desktop/财务工具/PROJECT_CONSTITUTION.md) (需创建)

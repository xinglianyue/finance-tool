# 财务分析工具 - 项目宪法

## 本宪法的目的
本文件定义财务分析工具项目的架构规则、开发流程和质量标准，是AI协作和所有代码变更的最高指导原则。

---

## 第一部分：架构规范（Clean Architecture + DDD）

### 1.1 四层架构定义

```
┌─────────────────────────────────────────────────────────────────┐
│  Frameworks & Drivers Layer (最外层)                             │
│  - UI组件 (React/Vanilla JS)                                    │
│  - 数据库适配器 (localStorage/IndexedDB)                        │
│  - HTTP客户端 (API调用)                                          │
│  - 外部库 (Chart.js, XLSX)                                      │
├─────────────────────────────────────────────────────────────────┤
│  Interface Adapters Layer                                        │
│  - Presenters (数据 → UI 格式转换)                               │
│  - Controllers (输入 → 业务用例)                                │
│  - Gateways (业务对象 → 存储格式转换)                            │
│  - Repository 接口实现                                           │
├─────────────────────────────────────────────────────────────────┤
│  Use Cases Layer (应用业务逻辑)                                  │
│  - AnalyzeAnomalyUseCase (异常检测用例)                          │
│  - CalculateHealthScoreUseCase (健康度计算用例)                  │
│  - GenerateReportUseCase (报告生成用例)                          │
│  - ImportDataUseCase (数据导入用例)                              │
├─────────────────────────────────────────────────────────────────┤
│  Entities Layer (核心业务对象 - 纯业务逻辑)                      │
│  - FinancialData (财务数据实体)                                 │
│  - City (城市业务实体)                                           │
│  - Module (业务模块实体)                                         │
│  - Anomaly (异常实体)                                            │
│  - HealthScore (健康度实体)                                      │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 依赖规则（铁律）
- **内层绝不知道外层的存在**
- **依赖方向永远向内**
  - Frameworks → Interface Adapters → Use Cases → Entities
  - Use Cases 依赖 Entities 接口，不依赖具体实现
  - Presenters 不被 Use Cases 依赖，而是 Use Cases 调用 Presenters 接口

### 1.3 限界上下文划分（DDD）

| 限界上下文 | 职责范围 | 核心实体 |
|-----------|---------|---------|
| 【数据导入上下文】 | 文件解析、数据验证、存储 | FileParser, ValidatedData, DataRepository |
| 【财务分析上下文】 | 指标计算、异常检测、健康度评估 | FinancialData, AnomalyDetector, HealthAnalyzer |
| 【报告生成上下文】 | 导出报表、格式化、图表渲染 | Report, ChartConfig, ExportFormat |
| 【UI展示上下文】 | 页面渲染、用户交互、状态管理 | DashboardViewModel, TabController, UIPresenter |

---

## 第二部分：开发流程规范

### 2.1 功能开发工单模板

```markdown
## 功能开发工单：[功能名称]

### 上下文归属
- 限界上下文：【数据导入/财务分析/报告生成/UI展示】
- 影响模块：[具体文件列表]

### 业务需求
- 输入：[具体示例数据/用户行为]
- 处理逻辑：[步骤说明，用业务语言]
- 输出：[具体格式/UI表现]

### 架构约束
- 分层归属：【Entities/Use Cases/Interface Adapters/Frameworks】
- 依赖方向：只能依赖内层模块
- 接口契约：[JSDoc类型定义]

### 验收条件
- 功能测试：[可验证的测试步骤]
- 性能要求：[响应时间/数据量]
- 错误处理：[异常场景和应对策略]
```

### 2.2 代码审查清单（AI自我审查）

每次生成代码后，必须审查以下问题：

```
### 架构符合度检查
- [ ] 是否遵守分层依赖规则？内层模块是否引用了外层？
- [ ] 业务逻辑是否泄露到UI层？
- [ ] 新代码是否放在正确的层？

### 数据流清晰度检查
- [ ] 数据来源和去向是否明确？
- [ ] 状态变更是否通过统一流程？
- [ ] 是否存在"幽灵数据"（未定义来源的数据）？

### 接口稳定性检查
- [ ] 修改是否破坏现有接口？
- [ ] 向后兼容性如何保证？
- [ ] 是否有JSDoc类型注释？

### 可测试性检查
- [ ] 是否便于编写单元测试？
- [ ] 依赖是否可模拟（DI）？
- [ ] 函数是否纯？（输入→输出无副作用）
```

### 2.3 代码命名约定

- **实体 (Entities)**: 名词，如 `FinancialData`, `City`, `Anomaly`
- **用例 (Use Cases)**: 动词短语 + UseCase，如 `AnalyzeAnomalyUseCase`
- **适配器 (Adapters)**: 动词 + 名词 + Adapter，如 `ExcelFileParserAdapter`
- **展示器 (Presenters)**: 功能 + Presenter，如 `OverviewDashboardPresenter`
- **仓库 (Repositories)**: 实体 + Repository，如 `FinancialDataRepository`

---

## 第三部分：质量标准

### 3.1 代码质量标准
- 所有公共API必须有JSDoc注释
- 函数长度不超过50行（超过则拆分）
- 避免全局变量，使用依赖注入
- 纯函数优先（相同输入→相同输出，无副作用）

### 3.2 测试标准
- 核心业务逻辑（Entities/Use Cases）测试覆盖率 ≥ 80%
- 每个新功能必须先写测试，再实现
- 使用TDD循环：红（测试失败）→ 绿（测试通过）→ 重构

### 3.3 重构标准
- 每次重构只改变一个维度
- 重构前必须有测试覆盖
- 重构后必须运行所有测试确保没有回归

---

## 第四部分：项目当前状态（现状→目标）

### 当前状态
- ❌ 无架构分层
- ❌ 全局状态泛滥
- ❌ UI与业务耦合严重
- ❌ 无自动化测试
- ❌ 多版本HTML混乱

### 目标状态（逐步达成）
- ✅ 四层架构清晰
- ✅ 状态管理统一
- ✅ 业务与UI分离
- ✅ 核心逻辑有测试
- ✅ 单版本干净HTML

---

**维护者**：AI协作系统
**生效日期**：2026-05-14
**最后修订**：首次发布

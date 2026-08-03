# 财务分析工具 - 目标架构设计与迁移计划

## 一、目标架构设计（Clean Architecture + DDD）

### 1.1 新目录结构
```
财务工具/
├── src/                            # 新架构源代码目录
│   ├── entities/                   # Entities 层
│   │   ├── FinancialData.js        # 财务数据实体
│   │   ├── City.js                 # 城市实体
│   │   ├── Module.js               # 业务模块实体
│   │   ├── Anomaly.js              # 异常实体
│   │   ├── HealthScore.js          # 健康度实体
│   │   └── types.js                # 类型定义（JSDoc）
│   │
│   ├── usecases/                   # Use Cases 层
│   │   ├── ImportDataUseCase.js    # 数据导入用例
│   │   ├── AnalyzeAnomalyUseCase.js  # 异常分析用例
│   │   ├── CalculateHealthScoreUseCase.js  # 健康度计算用例
│   │   ├── GenerateReportUseCase.js  # 报告生成用例
│   │   └── ExportDataUseCase.js    # 数据导出用例
│   │
│   ├── interface-adapters/         # Interface Adapters 层
│   │   ├── presenters/             # Presenters
│   │   │   ├── OverviewPresenter.js
│   │   │   ├── DetailPresenter.js
│   │   │   └── CostPresenter.js
│   │   ├── controllers/            # Controllers
│   │   │   ├── DashboardController.js
│   │   │   └── FileUploadController.js
│   │   └── repositories/           # Repositories
│   │       ├── FinancialDataRepository.js
│   │       └── LocalStorageRepository.js
│   │
│   ├── frameworks/                 # Frameworks 层
│   │   ├── ui/                     # UI 组件
│   │   │   ├── OverviewPanel.js
│   │   │   ├── DetailPanel.js
│   │   │   └── CostPanel.js
│   │   ├── charting/               # 图表组件
│   │   │   ├── ChartRenderer.js
│   │   │   └── ChartConfig.js
│   │   └── storage/                # 存储实现
│   │       └── LocalStorageImpl.js
│   │
│   └── shared/                     # 共享工具
│       ├── constants.js
│       └── utils.js
│
├── legacy/                         # 遗留代码（逐步迁移）
│   ├── js/                         # 原 js/ 目录保留
│   └── css/                        # 原 css/ 目录保留
│
├── index-clean.html                # 新架构入口页面
├── index-complete.html             # 原页面保留（备用）
├── vite.config.js                  # Vite 配置
└── PROJECT_CONSTITUTION.md         # 项目宪法
```

### 1.2 数据流（目标架构）
```
┌─────────────────────────────────────────────────────────────────┐
│  Frameworks Layer (用户界面)                                     │
│  index-clean.html → DashboardController.handleFileUpload()      │
├─────────────────────────────────────────────────────────────────┤
│  Interface Adapters Layer                                        │
│  DashboardController → ImportDataUseCase.execute()              │
│                     ↓                                            │
│  FinancialDataRepository.save(FinancialData)                   │
├─────────────────────────────────────────────────────────────────┤
│  Use Cases Layer                                                 │
│  ImportDataUseCase.validateAndTransform() → Entities           │
│  AnalyzeAnomalyUseCase.analyze(FinancialData)                  │
│  CalculateHealthScoreUseCase.calculate(FinancialData)          │
├─────────────────────────────────────────────────────────────────┤
│  Entities Layer (纯业务逻辑)                                     │
│  FinancialData - 核心财务数据模型                                │
│  AnomalyDetector - 异常检测业务规则                             │
│  HealthCalculator - 健康度计算算法                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 二、渐进式迁移计划（Phase 1-4）

### Phase 1：紧急止血（1-2周）
**目标**：稳定当前系统，解决最严重的P0/P1问题

| 任务 | 优先级 | 说明 |
|------|--------|------|
| 修复 BackupManager.cleanup() 错误 | P0 | 立即解决启动报错 |
| 清理冗余 HTML 文件 | P1 | 只保留 index-complete.html 作为主页面 |
| 清理根目录冗余 JS 文件 | P1 | 移到 legacy/ 目录 |
| 添加简单的错误边界 | P1 | 防止一个模块出错导致整个页面崩溃 |

**交付物**：稳定运行的现有系统，无启动报错

---

### Phase 2：试点重构（2-3周）
**目标**：选择一个模块按新架构重构，验证方案可行性

| 任务 | 说明 |
|------|------|
| 创建新目录结构 | 按目标架构创建 src/ 目录 |
| 重构异常检测模块 | 从 analysis.js 提取，创建 AnalyzeAnomalyUseCase |
| 重构数据实体 | 创建 FinancialData, City, Anomaly 实体 |
| 创建 Presenter | 创建 OverviewPresenter 分离UI逻辑 |
| 双轨运行 | 旧系统和新系统并行，逐步切换 |

**试点模块**：异常检测（从 analysis.js 拆分）
**验证标准**：
- 新代码遵循 Clean Architecture
- 有单元测试覆盖
- 功能与旧代码等价
- 性能不降低

---

### Phase 3：核心模块迁移（3-4周）
**目标**：迁移核心业务逻辑到新架构

| 任务 | 说明 |
|------|------|
| 迁移健康度计算 | HealthScore 实体 + CalculateHealthScoreUseCase |
| 迁移数据导入 | ImportDataUseCase + FileUploadController |
| 迁移报告生成 | GenerateReportUseCase |
| 迁移成本分析 | Cost 相关逻辑迁移 |

**迁移策略**：
1. 在新架构中实现功能
2. 保持与旧系统的接口兼容
3. 逐步替换调用点
4. 废弃旧代码

---

### Phase 4：全面迁移（2-3周）
**目标**：完成所有模块迁移，淘汰旧代码

| 任务 | 说明 |
|------|------|
| 迁移 UI 层 | 按新架构重构所有 Tab 页面 |
| 统一状态管理 | 使用新的状态管理方案 |
| 完成测试覆盖 | 核心逻辑测试覆盖率 ≥ 80% |
| 文档完善 | 更新 API 文档、架构文档 |
| 清理 legacy 代码 | 删除不再使用的旧代码 |

---

## 三、风险与缓解措施

| 风险 | 可能性 | 影响 | 缓解措施 |
|------|--------|------|---------|
| 迁移期间功能退化 | 中 | 高 | 双轨运行，保留旧系统作为备份 |
| 时间超出预期 | 高 | 中 | 分阶段交付，每个阶段都有可用成果 |
| 学习曲线陡峭 | 中 | 中 | 提供详细的架构文档和示例代码 |
| 团队协作问题 | 低 | 中 | 明确职责，通过代码审查确保质量 |

---

## 四、成功标准

- 所有P0/P1问题解决
- 核心业务逻辑按Clean Architecture重构
- 有单元测试覆盖
- 新功能开发速度提升30%
- 代码可读性和可维护性显著提升

---

**计划制定日期**：2026-05-14
**预计完成日期**：2026-07-01（约8周）
**负责人**：AI协作系统

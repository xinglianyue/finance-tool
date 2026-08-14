# 财务分析工具 v2 - 详细执行计划

**制定日期**: 2026-05-16
**预计完成**: 2026-06-13（4周）
**状态**: 🔄 执行中

---

## 一、目标概述

把财务分析工具从"混乱的数据展示"改造成"智能的财务健康仪表盘"，让用户能：
- 3秒了解整体健康状况
- 自动发现异常问题
- 获得可执行的优化建议

---

## 二、详细执行计划

### 第1周（05/16-05/22）：深度业务分析 + 新界面设计
**主题**: 建立正确的分析框架和界面原型

| 日期 | 任务 | 交付物 | 状态 |
|------|------|--------|------|
| 05/16 | 基于真实数据分析，设计新分析框架 | 分析框架设计文档 | ✅ 完成 |
| 05/17 | 设计新界面信息架构 | 界面结构设计 | ✅ 完成 |
| 05/18 | 实现核心HTML结构 | index-v2.html 基础版 | ✅ 完成 |
| 05/19 | 实现健康度仪表盘 | 环形图 + 评分 | ✅ 完成 |
| 05/20 | 实现异常预警列表 | 动态异常检测 | ✅ 完成 |
| 05/21 | 实现核心指标展示 | 统计卡片 + 趋势 | ✅ 完成 |
| 05/22 | 实现智能洞察面板 | 洞察生成逻辑 | ✅ 完成 |

**本周交付物**: `index-v2.html` - 可运行的健康仪表盘原型

---

### 第2周（05/23-05/29）：核心分析逻辑实现
**主题**: 让工具能"思考"，而不只是"展示"

| 日期 | 任务 | 交付物 | 状态 |
|------|------|--------|------|
| 05/23-05/29 | 实现增强版分析引擎 | CompleteFinancialAnalyzer | ✅ 完成 |
| 05/24 | 实现增强异常检测 | EnhancedAnomalyDetector | ✅ 完成 |
| 05/25 | 实现根因分析引擎 | EnhancedRootCauseAnalyzer | ✅ 完成 |
| 05/26 | 实现建议生成引擎 | EnhancedSuggestionEngine | ✅ 完成 |
| 05/27 | 实现关联分析器 | CorrelationAnalyzer | ✅ 完成 |
| 05/28-29 | 集成测试 + 优化 | 完整分析流程 | ✅ 完成 |

**本周交付物**: `js/analyzer/` - 完整分析引擎模块

---

### 第3周（05/30-06/05）：数据可视化完善
**主题**: 让数据"会说话"

| 日期 | 任务 | 交付物 | 状态 |
|------|------|--------|------|
| 05/30 | UE热力图 | HeatmapChart | 📋 |
| 05/31 | 趋势对比图 | TrendChart | 📋 |
| 06/01 | 成本结构图 | CostBreakdownChart | 📋 |
| 06/02 | 城市排名 | CityRankingPanel | 📋 |
| 06/03 | 行动建议面板 | ActionPanel | 📋 |
| 06/04-05 | 集成测试 + 优化 | 完整可视化 | 📋 |

**本周交付物**: `visualization-v2.js` - 新版可视化组件

---

### 第4周（06/06-06/13）：架构优化 + 收尾
**主题**: 清理冗余，建立规范

| 日期 | 任务 | 交付物 | 状态 |
|------|------|--------|------|
| 06/06 | 清理冗余HTML文件 | 只保留必要页面 | 📋 |
| 06/07 | 清理冗余JS文件 | 合并/归档 | 📋 |
| 06/08 | 建立代码规范 | `.rules/` 目录 | 📋 |
| 06/09 | 核心逻辑添加测试 | UnitTests | 📋 |
| 06/10-12 | 集成测试 + Bug修复 | 完整系统 | 📋 |
| 06/13 | 文档完善 + 总结 | 最终交付 | 📋 |

**本周交付物**: 干净的代码库 + 完整文档

---

## 三、技术架构设计

### 3.1 新模块结构

```
financial-tool-v2/
├── index-v2.html          # 新版入口页面
├── js/
│   ├── analyzer/          # 分析引擎（新增）
│   │   ├── AnomalyDetector.js
│   │   ├── RootCauseAnalyzer.js
│   │   ├── SuggestionEngine.js
│   │   └── index.js
│   ├── visualization/     # 可视化组件（重构）
│   │   ├── HealthDashboard.js
│   │   ├── UEMatrix.js
│   │   ├── TrendChart.js
│   │   └── index.js
│   └── ... (保留现有模块，逐步迁移)
└── css/
    └── v2/               # 新版样式
        ├── dashboard.css
        ├── components.css
        └── theme.css
```

### 3.2 核心类设计

```javascript
// 异常检测器
class AnomalyDetector {
  constructor(config) { ... }
  calculateDynamicThreshold(city, module, metric) { ... }
  detectWithZScore(value, historical) { ... }
  detectWithIQR(value, historical) { ... }
  getAnomalies(cityData) { ... }
}

// 根因分析器
class RootCauseAnalyzer {
  analyze(anomaly) {
    // 5 Whys 分析
  }
  findCorrelation(metrics) {
    // 关联分析
  }
}

// 建议生成器
class SuggestionEngine {
  generate(causes, context) {
    // 基于规则生成建议
  }
  prioritize(suggestions) {
    // 优先级排序
  }
}

// 健康度计算器
class HealthCalculator {
  calculate(cityData) {
    // 多维度评分
  }
}
```

---

## 四、真实数据分析结论（用于指导实现）

### 4.1 当前核心问题

| 问题 | 数据 | 优先级 |
|------|------|--------|
| 闪购模块系统性亏损 | 7/8城市亏损，月亏12.4万 | P0 |
| 拼好饭补贴效率低 | 17.8%补贴率仍亏损 | P0 |
| 承德规模大但亏损 | 最大城市但UE=-0.08 | P0 |
| 城市间差异巨大 | 围场0.73 vs 深泽-0.20 | P1 |

### 4.2 做得好的地方

| 亮点 | 数据 |
|------|------|
| 医药模块 | UE 1.92元，补贴率1.1%，最优 |
| 围场、献县、安国 | UE超1元，盈利优秀 |
| 订单增长 | +32.7%，远超行业平均 |

### 4.3 分析引擎规则设计

```javascript
// 动态阈值配置
const THRESHOLDS = {
  ue: {
    tier1: { excellent: 1.5, good: 0.8, warn: 0.3 },
    tier2: { excellent: 1.0, good: 0.5, warn: 0.2 },
    tier3: { excellent: 0.5, good: 0.2, warn: 0.0 }
  },
  subsidy: {
    food: { excellent: 5, good: 8, warn: 12 },
    flash: { excellent: 3, good: 5, warn: 8 },
    medicine: { excellent: 1, good: 2, warn: 3 },
    group: { excellent: 12, good: 18, warn: 25 }
  }
};

// 异常检测规则
const RULES = [
  { metric: 'ue', condition: '<', threshold: 0, severity: 'critical', message: '亏损状态' },
  { metric: 'subsidyRate', condition: '>', threshold: 0.35, severity: 'critical', message: '补贴率过高' },
  { metric: 'deliveryCostRate', condition: '>', threshold: 0.35, severity: 'warning', message: '配送成本过高' }
];

// 根因分析规则
const ROOT_CAUSES = {
  'ue_low': [
    { factor: 'subsidy_high', weight: 0.4, message: '补贴率过高' },
    { factor: 'delivery_cost_high', weight: 0.3, message: '配送成本过高' },
    { factor: 'revenue_low', weight: 0.3, message: '收入偏低' }
  ],
  'subsidy_high': [
    { factor: 'market_share', weight: 0.5, message: '市场份额压力' },
    { factor: 'competition', weight: 0.3, message: '市场竞争激烈' },
    { factor: 'inefficiency', weight: 0.2, message: '运营效率低' }
  ]
};
```

---

## 五、验收标准

### 5.1 功能验收

- [ ] 能自动识别所有异常城市/模块
- [ ] 能显示健康度仪表盘（综合分 + 各维度分）
- [ ] 能生成可执行的优化建议（按优先级排序）
- [ ] 能展示UE热力图（城市×模块矩阵）
- [ ] 能展示趋势对比图
- [ ] 能展示行动建议面板

### 5.2 性能验收

- [ ] 页面加载时间 < 3秒
- [ ] 分析计算时间 < 1秒
- [ ] 图表渲染时间 < 500ms

### 5.3 质量验收

- [ ] 无JavaScript错误
- [ ] 所有按钮/链接可点击
- [ ] 响应式布局（桌面/平板）
- [ ] 代码符合规范（有注释）

---

## 六、风险与应对

| 风险 | 可能性 | 影响 | 应对 |
|------|--------|------|------|
| 真实数据格式不标准 | 中 | 中 | 增加数据验证和容错 |
| 分析逻辑过于复杂 | 高 | 中 | 简化规则，分步实现 |
| 时间超出预期 | 中 | 中 | 优先保证核心功能 |

---

**执行记录**：

| 日期 | 完成任务 | 遇到问题 | 解决方案 |
|------|---------|---------|---------|
| 2026-05-16 | 制定执行计划 | - | - |
| - | - | - | - |

---

**最后更新**: 2026-05-16
**下次检查**: 2026-05-23（第1周总结）

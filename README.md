# 财务工具 使用说明

> 版本: v17.3.6 | 最后更新: 2026-05-06
> 架构: Vite多文件开发 + 单HTML部署 (大后端小前端)

---

## 快速开始

### 方法一：直接启动（推荐）
1. 双击 `启动财务工具.bat`
2. 浏览器会自动打开财务工具
3. 直接使用，无需担心跨域问题

### 方法二：创建桌面快捷方式
1. 双击 `创建桌面快捷方式.bat`
2. 桌面会出现"财务工具"快捷方式
3. 以后双击桌面快捷方式即可

### 方法三：手动启动服务器
1. 双击 `启动服务器.bat`
2. 浏览器访问：http://localhost:8000/

---

## 文件结构

### 核心文件
| 文件/目录 | 说明 |
|----------|------|
| `index-dev.html` | Vite开发入口页面 |
| `index.html` | Vite构建后的单HTML产物(含内联JS/CSS) |
| `main.js` | Vite入口，68个window全局注册+19个import |
| `build.py` | 构建脚本(Vite构建+数据注入+增量缓存，25.6s→0.3s) |
| `deploy.py` | 部署辅助脚本(Excel解析+格式B回退) |
| `vite.config.js` | Vite配置(vite-plugin-singlefile打包) |

### JS模块(18个)
| 模块 | 大小 | 职责 |
|------|------|------|
| `js/analysis.js` | 123KB | V3异常检测+归因+多期+补贴+趋势+V4交叉关联+Z-Score+6维度排名 |
| `js/cost.js` | 34KB | 成本下钻+KA对比+COST_DRILL_MAP(5大类23子项) |
| `js/validate.js` | 25KB | 数据校验 |
| `js/app.js` | 25KB | 应用主逻辑+T10集成+initPeriodSelectors |
| `js/overview.js` | 20KB | 排名面板+排名表格+异常徽章/Tab |
| `js/detail.js` | 19KB | 明细数据展示+补贴/归因集成 |
| `js/parser.js` | 16KB | Excel文件解析 |
| `js/report.js` | 17KB | 报表生成(6维度纯前端报告) |
| `js/ui.js` | 13KB | UI交互 |
| `js/charts.js` | 8KB | 图表渲染 |
| `js/export.js` | 9KB | 数据导出 |
| `js/sync.js` | 11KB | 数据同步 |
| `js/core.js` | 10KB | 核心数据结构+CONFIG阈值+DataStore |
| `js/kpi.js` | 2KB | KPI指标计算 |
| `js/file.js` | 4KB | 文件操作 |
| `js/insights.js` | 3KB | 数据洞察 |
| `js/theme.js` | 1KB | 主题管理 |
| `js/utils.js` | 1KB | 通用工具 |

### 样式
| 文件 | 说明 |
|------|------|
| `css/style.css` | 主样式表(101KB) |

---

## 已实现功能(v11需求 12/14完成)

| # | 功能 | 状态 | 实现位置 |
|---|------|------|---------|
| 1 | 配送成本拆分 | DONE | cost.js (5大类23子项下钻) |
| 2 | 补贴拆分 | DONE | analysis.js (B端/C端/活动专项/天气临时+健康度评分) |
| 3 | KA城商拆分 | DONE | cost.js (8指标x全城矩阵+评级着色) |
| 4 | 城商占比 | DONE | 内置merchantData |
| 5 | 运力数据 | 待确认 | 需老板确认具体指标 |
| 6 | 多期对比 | DONE | analysis.js (双日期选择器+10城x6指标) |
| 7 | KA并排对比 | DONE | 同#3 |
| 8 | 多期趋势图 | DONE | analysis.js (SVG sparkline+环比明细) |
| 9 | 异常归因 | DONE | analysis.js (6维归因引擎+Z-Score) |
| 10 | 排名变化高亮 | DONE | analysis.js+overview.js (6维度切换+跨期排名) |
| 11 | 报告生成 | DONE | report.js (6维度纯前端报告) |
| 12 | 运力数据源 | 待确认 | 美团Excel有原始字段(franchiseDeliverOrders等) |
| 13 | 多期预加载 | DONE | build.py (7期x10城x11指标) |
| 14 | 跨期趋势 | DONE | analysis.js (getCrossPeriodChanges+calcEnvGrowth) |

---

## 部署架构

```
开发目录(C:\Users\surface\Desktop\财务工具\)
  → Vite构建(npm run build / build.py)
  → 部署目录(C:\Users\surface\finance-tool-deploy\)
  → Git push → GitHub Pages自动部署
```

线上地址: https://xinglianyue.github.io/finance-tool/

---

## 常见问题

### Q1: 出现跨域错误怎么办？
A: 使用 `启动财务工具.bat` 启动，避免从错误页面访问。

### Q2: 服务器启动失败怎么办？
A: 检查端口8000是否被占用，或修改 `start_server.py` 中的端口号。

### Q3: 浏览器没有自动打开怎么办？
A: 手动访问：http://localhost:8000/

### Q4: Vite构建失败怎么办？
A: 运行 `build.py --force` 强制重新构建，或删除 `node_modules` 后重新 `npm install`。

### Q5: 数据不更新怎么办？
A: 确保Excel账单文件在正确路径，运行 `build.py` 重新解析并注入数据。

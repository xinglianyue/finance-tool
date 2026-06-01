# 财务分析工具

> 版本: 2026-06-01.5 | 最后更新: 2026-06-01
> 架构: 纯前端单页应用 (Single HTML + JS Modules)

---

## 快速开始

### 方法一：在线访问（推荐）
直接访问线上版本：https://xinglianyue.github.io/finance-tool/index-new.html

### 方法二：本地启动
1. 双击 `启动财务工具.bat`
2. 浏览器会自动打开财务工具
3. 直接使用，无需担心跨域问题

### 方法三：手动启动服务器
1. 双击 `启动服务器.bat`
2. 浏览器访问：http://localhost:8000/

---

## 文件结构

### 核心文件
| 文件/目录 | 说明 |
|----------|------|
| `index-new.html` | **主力分析页面** - 完整的财务分析功能 |
| `upload-data.html` | 运营中心专用上传页面 |
| `shared-data.json` | 云端共享数据文件 |

### JS模块
| 模块 | 职责 |
|------|------|
| `js/data-store.js` | 数据存储管理 (localStorage) |
| `js/state-manager.js` | 应用状态管理 |
| `js/parser.js` | Excel文件解析 |
| `js/chart.umd.min.js` | 图表库 |
| `js/xlsx.full.min.js` | Excel处理库 |

### 样式
| 文件 | 说明 |
|------|------|
| `css/style.css` | 主样式表 |
| `css/design-system.css` | 设计系统组件 |

---

## 功能特性

| 功能 | 说明 |
|------|------|
| 📊 概览面板 | KPI指标展示 + 城市排名 |
| 📐 维度下钻 | 多城市对比分析 |
| 📈 趋势分析 | 时间序列趋势展示 |
| 🎯 敏感性分析 | 敏感性分析功能 |
| 💾 数据导出 | 导出分析数据 |

---

## 部署架构

```
GitHub Pages (gh-pages分支)
  → index-new.html (分析页面)
  → upload-data.html (上传页面)
  → shared-data.json (共享数据)
```

线上地址: https://xinglianyue.github.io/finance-tool/index-new.html

---

## 数据管理

### 数据上传（运营中心专用）
1. 访问 `upload-data.html`
2. 上传Excel文件
3. 数据自动同步到云端

### 数据加载（普通用户）
- 页面自动从云端加载最新数据
- 所有用户看到的数据完全一致
- 无需手动上传

---

## 常见问题

### Q1: 页面显示空白怎么办？
A: 强制刷新浏览器 (Ctrl+Shift+R)，清除缓存后重新加载。

### Q2: 数据加载失败怎么办？
A: 检查网络连接，或联系运营中心确认数据是否已上传。

### Q3: 如何清除浏览器缓存？
A: 使用 Ctrl+Shift+Delete 清除缓存，或使用 Ctrl+Shift+R 强制刷新。

---

## 维护说明

### 版本管理
- 版本格式：`YYYY-MM-DD.N`（N为当天修改次数）
- 每次修改更新版本号
- JS文件使用版本参数：`script.js?v=20260601.5`

### 代码修改规范
1. 修改前查看Git历史确认最后正确版本
2. 使用Edit工具进行小范围精确修改
3. 避免使用PowerShell批量替换（会破坏UTF-8编码）
4. 修改后先本地测试，再推送到线上

### 分支管理
- `main`：主分支（源代码）
- `gh-pages`：GitHub Pages部署分支

---

## 相关文档

- [项目教训与禁忌清单.md](file:///c:/Users/xinxi/Desktop/财务工具/项目教训与禁忌清单.md) - 开发规范和注意事项
- [docs/Bug修复与代码维护最佳实践.md](file:///c:/Users/xinxi/Desktop/财务工具/docs/Bug修复与代码维护最佳实践.md) - 详细bug修复文档

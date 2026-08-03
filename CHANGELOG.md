# Changelog

所有重要变更将记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [1.0.0] - 2026-08-03

### ✅ Fixed - 已修复
- 修复第1651行 `logs.join('` 字符串字面量断行问题
- 修复第2612、2930行正则表达式 `.replace(/\\n\n/g` 断行问题
- 修复第3128、3235行多余的闭合括号 `}}` → `}`
- 修复第4216行覆盖 `allMerchantData` 为null的问题
- 确保所有关键函数有正确的 `async` 声明
  - `loadFromCloud` ✓
  - `switchImportDate` ✓
  - `checkCloudForUpdates` ✓
- 平衡所有花括号（修复了2个多余的 `}`）
- 移除重复的 `function function` 关键字

### 🔧 Changed - 变更
- 代码结构优化准备中
- 建立系统维护和优化流程

### 📝 Added - 新增
- 语法检查脚本 `syntax-check.js`
- 系统维护文档 `SYSTEM_OPTIMIZATION_PLAN.md`
- 全面诊断工具 `full_diagnostic.py`

### 🧪 Testing - 测试
- 所有核心功能测试通过：
  - Excel导入 ✓
  - 数据加载（18条记录）✓
  - 月份切换 ✓
  - 主题切换 ✓
  - 维度下钻 ✓
  - 城市切换 ✓

---

## [0.9.0] - 2026-07-31

### ⚠️ Known Issues - 已知问题
- 多个语法错误导致页面无法正常加载
- 维度下钻功能无法切换城市

### 🔧 Fixes Applied
- 系统性修复所有语法错误
- 恢复所有核心功能

---

## 版本说明

- **主版本号**：不兼容的API修改
- **次版本号**：向后兼容的功能性新增
- **修订号**：向后兼容的问题修正

---

## 变更类型说明

- **Added**：新增功能
- **Changed**：现有功能的变更
- **Deprecated**：即将废弃的功能
- **Removed**：已删除的功能
- **Fixed**：bug修复
- **Security**：安全相关修复
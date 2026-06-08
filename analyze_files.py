# -*- coding: utf-8 -*-
import os

folder = r"c:\Users\xinxi\Desktop\财务工具"

print("=== 财务工具文件必要性分析 ===")
print()

# 分析每个文件/目录
analysis = []

# 核心文件（绝对必要）
core_files = [
    "index-new.html",      # 主分析页面
    "upload-data.html",    # 上传页面
    "shared-data.json",    # 数据文件
    "index.json",          # 数据索引
    "启动财务工具.bat",     # 启动脚本
]

# 核心目录（绝对必要）
core_dirs = [
    "css/",                # 样式文件
    "js/",                 # JavaScript代码
    "财务工具数据同步-技术人员/",  # 技术人员脚本
]

# 配置文件（必要）
config_files = [
    ".gitignore",          # Git配置
    ".nojekyll",           # GitHub Pages配置
    "coding-rules.json",   # 编码规则
    "data-schema.json",    # 数据schema
]

# 文档文件（部分可整合）
docs_files = [
    "README.md",           # 项目说明
    "USAGE_GUIDE.md",      # 使用指南
    "USER_GUIDE.md",       # 用户指南
    "使用说明.md",         # 使用说明（可能重复）
    "GIT_WORKFLOW.md",     # Git工作流程
    "本地开发工作流程.md",  # 开发流程（可能重复）
    "数据同步说明.md",      # 数据同步说明
    "数据库同步脚本部署说明.md",  # 部署说明（可能重复）
    "技术人员问题清单.txt",  # 技术人员问题
    "项目教训与禁忌清单.md",  # 教训清单
]

# 文档目录
docs_dirs = [
    "docs/",               # 文档目录
]

# 归档目录（已归档，不影响主目录）
archive_dirs = [
    "归档/",               # 历史归档
]

print("【核心文件（绝对必要）】")
for f in core_files:
    if os.path.exists(os.path.join(folder, f)):
        print(f"✅ {f}")
        analysis.append({"name": f, "status": "必要", "reason": "核心功能文件"})

print()
print("【核心目录（绝对必要）】")
for d in core_dirs:
    if os.path.exists(os.path.join(folder, d)):
        print(f"✅ {d}")
        analysis.append({"name": d, "status": "必要", "reason": "核心功能目录"})

print()
print("【配置文件（必要）】")
for f in config_files:
    if os.path.exists(os.path.join(folder, f)):
        print(f"✅ {f}")
        analysis.append({"name": f, "status": "必要", "reason": "配置文件"})

print()
print("【文档文件（部分可整合）】")
for f in docs_files:
    if os.path.exists(os.path.join(folder, f)):
        if f in ["使用说明.md", "本地开发工作流程.md", "数据库同步脚本部署说明.md"]:
            print(f"⚠️ {f} - 可能与其他文档重复")
            analysis.append({"name": f, "status": "可整合", "reason": "可能与其他文档重复"})
        else:
            print(f"✅ {f}")
            analysis.append({"name": f, "status": "必要", "reason": "文档文件"})

print()
print("【文档目录】")
for d in docs_dirs:
    if os.path.exists(os.path.join(folder, d)):
        print(f"✅ {d}")
        analysis.append({"name": d, "status": "必要", "reason": "文档目录"})

print()
print("【归档目录】")
for d in archive_dirs:
    if os.path.exists(os.path.join(folder, d)):
        print(f"📦 {d}")
        analysis.append({"name": d, "status": "归档", "reason": "历史归档"})

print()
print("=== 总结 ===")
print()

# 统计
necessary = [a for a in analysis if a["status"] == "必要"]
consolidate = [a for a in analysis if a["status"] == "可整合"]
archive = [a for a in analysis if a["status"] == "归档"]

print(f"必要文件/目录: {len(necessary)} 个")
print(f"可整合文件: {len(consolidate)} 个")
print(f"归档文件: {len(archive)} 个")

print()
print("【可整合的文件（建议）】")
for item in consolidate:
    print(f"  • {item['name']}: {item['reason']}")

print()
print("【整合建议】")
print("1. 使用说明.md 可以整合到 README.md 或 USAGE_GUIDE.md")
print("2. 本地开发工作流程.md 可以整合到 GIT_WORKFLOW.md")
print("3. 数据库同步脚本部署说明.md 可以整合到 数据同步说明.md")
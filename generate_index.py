# -*- coding: utf-8 -*-
"""
财务工具 - 生成云端索引文件
============================
功能：从 shared-data.json 生成轻量级的 index.json
用途：用于云端更新检测，减少下载开销（从 2.5MB 降低到 5KB）
"""

import json
from datetime import datetime

SCRIPT_DIR = '.'
INPUT_FILE = 'shared-data.json'
OUTPUT_FILE = 'index.json'

def generate_index():
    """从 shared-data.json 生成 index.json"""
    print("=" * 60)
    print("财务工具 - 生成云端索引文件")
    print("=" * 60)
    print()
    
    # 读取完整数据
    print(f"[1/4] 读取 {INPUT_FILE} ...")
    try:
        with open(INPUT_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
        print(f"       成功读取 {len(data)} 条记录")
    except Exception as e:
        print(f"       ❌ 读取失败：{e}")
        return False
    
    # 提取元数据
    print(f"[2/4] 提取元数据 ...")
    records = []
    for record in data:
        record_meta = {
            "date": record.get("date", ""),
            "fileName": record.get("fileName", ""),
            "uploadedBy": record.get("uploadedBy", "unknown"),
            "updatedAt": record.get("updatedAt", "")
        }
        
        # 如果有 isLatest 和 version 字段，也加入
        if "isLatest" in record:
            record_meta["isLatest"] = record["isLatest"]
        if "version" in record:
            record_meta["version"] = record["version"]
        
        records.append(record_meta)
    
    print(f"       提取 {len(records)} 条元数据")
    
    # 构建索引
    print(f"[3/4] 构建索引 ...")
    # 提取版本号（从最新记录）
    latest_record = next((r for r in data if r.get("isLatest") == True), data[0])
    version = latest_record.get("version", 1)
    version_str = f"v{version}" if isinstance(version, int) else str(version)
    
    # 从日期生成版本号（如果 version 不存在）
    if not version_str.startswith("v"):
        date_str = latest_record.get("date", "").replace("-", "")
        version_str = date_str if date_str else "unknown"
    
    index = {
        "version": version_str,
        "updatedAt": datetime.now().isoformat(),
        "recordCount": len(records),
        "records": records
    }
    
    print(f"       版本号：{version_str}")
    print(f"       记录数：{len(records)}")
    print(f"       更新时间：{index['updatedAt']}")
    
    # 保存索引
    print(f"[4/4] 保存 {OUTPUT_FILE} ...")
    try:
        with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
            json.dump(index, f, ensure_ascii=False, indent=2)
        
        # 计算文件大小
        file_size = len(json.dumps(index, ensure_ascii=False).encode('utf-8')) / 1024
        print(f"       ✅ 保存成功！文件大小：{file_size:.1f}KB")
    except Exception as e:
        print(f"       ❌ 保存失败：{e}")
        return False
    
    print()
    print("=" * 60)
    print("索引文件生成完成！")
    print("=" * 60)
    print()
    print("下一步操作：")
    print("1. 检查 index.json 内容是否正确")
    print("2. 提交到 Git: git add index.json")
    print("3. 推送到 GitHub: git commit -m '添加云端索引文件' && git push")
    print("4. 验证 HTTPS 访问：https://xinglianyue.github.io/finance-tool/index.json")
    print()
    
    return True

if __name__ == "__main__":
    success = generate_index()
    if not success:
        exit(1)

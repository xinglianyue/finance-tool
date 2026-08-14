# -*- coding: utf-8 -*-
"""数据拆分脚本：把 shared-data.json 拆成 data/{date}.json 独立文件
- 保留 shared-data.json 作为向后兼容兜底（旧页面/旧缓存仍可读）
- 新页面优先加载 data/{date}.json，单个文件 ~284KB，加载更快更稳
"""
import json, io, os, sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(BASE_DIR, 'shared-data.json')
DATA_DIR = os.path.join(BASE_DIR, 'data')

def main():
    with io.open(SRC, 'r', encoding='utf-8') as f:
        data = json.load(f)

    if not isinstance(data, list) or len(data) == 0:
        print('✗ shared-data.json 不是非空数组')
        sys.exit(1)

    os.makedirs(DATA_DIR, exist_ok=True)
    total = 0
    print('拆分 %d 条记录到 data/ 目录...' % len(data))
    for record in data:
        date = record.get('date')
        if not date:
            print('✗ 记录缺少 date:', record.get('fileName'))
            continue
        # 规范化日期：用于文件名
        fname = os.path.join(DATA_DIR, date + '.json')
        # 紧凑格式（与 shared-data.json 一致），避免 indent 导致文件膨胀
        with io.open(fname, 'w', encoding='utf-8') as f:
            json.dump(record, f, ensure_ascii=False, separators=(',', ':'))
        size = os.path.getsize(fname) / 1024
        total += size
        print('  %-12s %8.1f KB' % (date, size))

    # 验证：每个文件可独立解析
    print('\n验证拆分文件...')
    ok = 0
    for record in data:
        date = record.get('date')
        if not date:
            continue
        fname = os.path.join(DATA_DIR, date + '.json')
        try:
            with io.open(fname, 'r', encoding='utf-8') as f:
                r = json.load(f)
            assert r.get('date') == date, 'date 不一致'
            assert r.get('merchantData'), '缺少 merchantData'
            ok += 1
        except Exception as e:
            print('  ✗ %s: %s' % (date, e))
    print('✓ 验证通过 %d/%d' % (ok, len(data)))
    print('总计 %.1f KB，共 %d 个文件' % (total, ok))

if __name__ == '__main__':
    main()

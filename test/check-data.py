# -*- coding: utf-8 -*-
"""数据完整性校验：shared-data.json 与 index.json 一致性、记录完整性。
用法: python test/check-data.py
"""
import json
import io
import sys


def main():
    problems = []

    # 1. shared-data.json
    with io.open('shared-data.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    if not isinstance(data, list) or len(data) == 0:
        problems.append('shared-data.json 不是非空数组')
        print('✗ shared-data.json 结构异常'); sys.exit(1)

    dates = []
    for r in data:
        d = r.get('date')
        dates.append(d)
        if not d:
            problems.append(f'记录缺少 date: {r}')
        if not r.get('merchantData'):
            problems.append(f'{d}: 缺少 merchantData（仅占位）')
            continue
        md = r['merchantData']
        for t in ('all', 'city', 'ka'):
            if t not in md or not md[t].get('cities'):
                problems.append(f'{d}: merchantData 缺少类型 {t}')
            elif len(md[t]['cities']) == 0:
                problems.append(f'{d}: 类型 {t} 城市列表为空')
        # 城市名去重检查
        names = [c.get('name') for c in md.get('all', {}).get('cities', []) if c.get('name')]
        if len(names) != len(set(names)):
            problems.append(f'{d}: 城市名存在重复')

    if len(dates) != len(set(dates)):
        problems.append('存在重复日期')

    # 2. index.json 一致性
    # 说明：上传页分步写入（先 shared-data.json，后 index.json），
    # 中间态允许 shared 领先 index（上传未完成时 index 少一条属正常）。
    # 但 index 不允许出现 shared 没有的日期（那才是真正的数据错乱），
    # 且 index.recordCount 必须与自身 records 长度一致。
    with io.open('index.json', 'r', encoding='utf-8') as f:
        idx = json.load(f)
    idx_records = idx.get('records', [])
    idx_dates = [r.get('date') for r in idx_records]
    dates_set = set(dates)
    idx_dates_set = set(idx_dates)
    extra_in_idx = idx_dates_set - dates_set
    if extra_in_idx:
        problems.append(f'index.json 存在 shared-data.json 没有的日期: {sorted(extra_in_idx)}')
    if idx.get('recordCount') != len(idx_records):
        problems.append(f'index.json recordCount({idx.get("recordCount")}) 与自身记录数({len(idx_records)})不一致')

    if problems:
        print('✗ 数据完整性校验未通过:')
        for p in problems:
            print(f'  - {p}')
        sys.exit(1)
    else:
        print(f'✓ 数据完整性校验通过: {len(data)} 条记录，日期与索引一致')


if __name__ == '__main__':
    main()

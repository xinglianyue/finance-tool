# -*- coding: utf-8 -*-
"""生成简洁版分析报告数据"""
import json

with open('shared-data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print(f'数据总条数: {len(data)}')
print()

# 提取总商数据（每个时间点的累积数据）
total_summary = []
for rec in data:
    date = rec.get('date', 'N/A')
    md = rec.get('merchantData', {})
    cities = md.get('all', {}).get('cities', [])
    
    # 找总商（汇总数据）
    zongshang = None
    for city in cities:
        if city.get('name') == '总商':
            zongshang = city
            break
    
    if zongshang:
        all_mod = zongshang.get('modules', {}).get('all', {})
        total_summary.append({
            'date': date,
            'commission': all_mod.get('commission', 0),
            'deliveryCost': all_mod.get('deliveryCost', 0),
            'platformCost': all_mod.get('platformCost', 0),
            'subsidyTotal': all_mod.get('subsidyTotal', 0),
            'profit': all_mod.get('profit', 0),
            'orders': all_mod.get('orders', 0),
            'avgRevenue': all_mod.get('avgRevenuePerOrder', 0),
            'avgCost': all_mod.get('avgCostPerOrder', 0)
        })

print('=== 总商累积数据概览 ===')
for i, item in enumerate(total_summary):
    print(f'{i+1}. {item["date"]}: 佣金={item["commission"]:,.0f} 利润={item["profit"]:,.0f} 订单={item["orders"]:,}')

# 城市排名（取最新时间点）
latest = data[0]
latest_date = latest.get('date', 'N/A')
md = latest.get('merchantData', {})
cities = md.get('all', {}).get('cities', [])

city_ranking = []
for city in cities:
    if city.get('name') != '总商':
        all_mod = city.get('modules', {}).get('all', {})
        city_ranking.append({
            'name': city.get('displayName') or city.get('name'),
            'commission': all_mod.get('commission', 0),
            'profit': all_mod.get('profit', 0),
            'orders': all_mod.get('orders', 0),
            'avgRevenue': all_mod.get('avgRevenuePerOrder', 0)
        })

# 按佣金排序
city_ranking.sort(key=lambda x: x['commission'], reverse=True)

print(f'\n=== 城市排名（{latest_date}累积数据）===')
for i, city in enumerate(city_ranking):
    print(f'{i+1}. {city["name"]:8s} 佣金={city["commission"]:>10,.0f} 利润={city["profit"]:>10,.0f} 订单={city["orders"]:>8,}')

# 输出JSON供HTML使用
output = {
  'summary': {
    'totalRecords': len(data),
    'dateRange': f'{data[-1].get("date")} ~ {data[0].get("date")}',
    'latestDate': latest_date
  },
  'totalData': total_summary,
  'cityRanking': city_ranking
}

# 计算平均单均收入（从总商数据）
avg_revenue_list = [item['avgRevenue'] for item in total_summary if item['avgRevenue'] > 0]
output['avgRevenueOverall'] = sum(avg_revenue_list) / len(avg_revenue_list) if avg_revenue_list else 0

with open('analysis-data.json', 'w', encoding='utf-8') as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

print('\n数据已输出到 analysis-data.json')
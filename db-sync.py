#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
财务工具 - MySQL 数据库同步脚本 (稳定版)
=========================================
版本: 1.0.0
最后更新: 2026-06-01
状态: 稳定版（锁定）

功能：从运营中心 MySQL 数据库导出账单数据，转换为前端 JSON 格式，推送到 GitHub。

【重要说明】
本脚本为稳定版本，已锁定。
- 数据获取逻辑已固定
- 如需调整数据展示格式，请在前端 (index-new.html) 修改
- 本脚本只需运行一次，后续无需修改

使用方式（3步）：
  1. pip install pymysql requests
  2. 复制 config-db.json.example 为 config-db.json，填入配置
  3. 运行: python db-sync.py <日期>

也可加入 Windows 任务计划程序实现自动执行（见文档底部说明）。
"""

import pymysql
import json
import requests
import base64
import sys
import os
from datetime import datetime

# ============================================================
# 【配置区】从配置文件读取
# ============================================================

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_FILE = os.path.join(SCRIPT_DIR, "config-db.json")

def load_config():
    """从配置文件读取配置"""
    if not os.path.exists(CONFIG_FILE):
        print(f"错误: 配置文件 {CONFIG_FILE} 不存在")
        print("请复制 config-db.json.example 为 config-db.json 并填入配置")
        sys.exit(1)
    
    with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
        config = json.load(f)
    
    if not config.get('db') or not config.get('github'):
        print("错误: 配置文件格式不正确，需要包含 'db' 和 'github' 部分")
        sys.exit(1)
    
    if not config['github'].get('token') or config['github']['token'] == '在这里填入你的GitHub Token':
        print("错误: 请在 config-db.json 中填入 GitHub Token")
        print("获取方式: GitHub → Settings → Developer settings → Personal access tokens → Generate new token (classic)")
        print("权限勾选: repo (完整仓库访问)")
        sys.exit(1)
    
    return config

CONFIG = load_config()

DB_CONFIG = {
    **CONFIG['db'],
    "charset": "utf8mb4",
    "connect_timeout": 30,
    "read_timeout": 600,
}

GITHUB_TOKEN = CONFIG['github']['token']
GITHUB_REPO = CONFIG['github']['repo']
GITHUB_API = f"https://api.github.com/repos/{GITHUB_REPO}/contents/shared-data.json"
GITHUB_RAW_URL = f"https://raw.githubusercontent.com/{GITHUB_REPO}/main/shared-data.json"

# 城市映射（city1~city10 对应中文名）
CITY_MAP = {
    "city1": "承德市", "city2": "围场满族蒙古族自治县", "city3": "玉田县",
    "city4": "安国市", "city5": "安平", "city6": "献县", "city7": "晋州",
    "city8": "威县", "city9": "深泽县", "city10": "康保县",
}

TYPE_MAP = {
    "全量":  "all",
    "餐饮":  "food",
    "闪购":  "flash",
    "医药":  "medicine",
    "拼好饭": "group",
}

FIELD_MAP = {
    ("原价交易额", "加盟原价交易额"):     "franchiseGMV",
    ("原价交易额", "自配原价交易额"):     "selfGMV",
    ("原价交易额", "原价交易额汇总"):     "gmvAmount",
    ("订单量", "加盟订单量"):            "franchiseOrders",
    ("订单量", "自配订单量"):            "selfOrders",
    ("订单量", "企客订单量"):            "enterpriseOrders",
    ("订单量", "订单量汇总"):            "orders",
    ("抽佣金额（收入一）", "加盟抽佣金额"):       "franchiseCommission",
    ("抽佣金额（收入一）", "自配抽佣金额"):       "selfCommission",
    ("抽佣金额（收入一）", "企客商家抽佣金额"):   "enterpriseCommission",
    ("抽佣金额（收入一）", "抽佣金额汇总"):       "commission",
    ("配送费（收入二）", "加盟配送费"):       "franchiseDeliveryFee",
    ("配送费（收入二）", "二次配送费"):       "secondDeliveryFee",
    ("配送费（收入二）", "企客配送费"):       "enterpriseDeliveryFee",
    ("配送费（收入二）", "一对一急送配送费"): "urgentDeliveryFee",
    ("配送费（收入二）", "配送费汇总"):       "deliveryFee",
    ("其他收入", "合作商运营服务费"): "otherRevenue",
    ("其他收入", "拼单宝激励"):     "otherRevenue",
    ("其他收入", "神券包激励"):     "otherRevenue",
    ("其他收入", "广告收入"):       "otherRevenue",
    ("其他收入", "专项补贴"):       "specialSubsidy",
    ("其他收入", "众包补贴调账"):   "crowdSubsidyAdjust",
    ("其他收入", "发展计划调账"):   "otherRevenue",
    ("其他收入", "星火激励调账"):   "otherRevenue",
    ("其他收入", "竞价返还调账"):   "otherRevenue",
    ("其他收入", "跑腿结算调账"):   "otherRevenue",
    ("其他收入", "其他收入汇总"):   "otherRevenue",
    ("代补金额花费", "B端代补金额"):     "subsidyB",
    ("代补金额花费", "C端代补金额"):     "subsidyC",
    ("代补金额花费", "账单-代补差额"):   "subsidyDiff",
    ("代补金额花费", "代补金额花费汇总"): "subsidyTotal",
    ("代补金额花费", "拼单补贴"):           "pinDanSubsidy",
    ("代补金额花费", "拼好饭补贴"):         "pinHaoFanSubsidy",
    ("代补金额花费", "整体代补金额"):       "subsidyTotal",
    ("平台成本", "ai外呼费用结算"):          "platformCommissionCost",
    ("抽佣比例", "城市单均保底"):           "otherRevenue",
    ("抽佣比例", "城市商家单均保底"):       "otherRevenue",
    ("抽佣比例", "KA商家单均保底"):         "otherRevenue",
    ("平台成本", "平台抽佣金额"):       "platformCommissionCost",
    ("平台成本", "合作商售后赔付费用"): "afterSaleCost",
    ("平台成本", "关爱基金"):           "careFund",
    ("平台成本", "保险费用"):           "insuranceCost",
    ("平台成本", "竞价"):               "biddingCost",
    ("平台成本", "罚款"):               "penalty",
    ("平台成本", "平台成本汇总"):       "platformCost",
    ("配送成本", "加盟承接订单量"):   "franchiseDeliverOrders",
    ("配送成本", "加盟单均邮资"):     "franchiseAvgPostage",
    ("配送成本", "加盟活动花费"):     "franchiseActivityCost",
    ("配送成本", "加盟邮资"):         "franchiseDelivery",
    ("配送成本", "普众众包订单量"):   "crowdOrders",
    ("配送成本", "普众众包基础邮资"): "crowdBasePostage",
    ("配送成本", "普众众包活动花费"): "crowdActivityCost",
    ("配送成本", "普众众包邮资"):     "crowdDelivery",
    ("配送成本", "悦跑订单量"):       "yuepaoOrders",
    ("配送成本", "悦跑基础邮资"):     "yuepaoBasePostage",
    ("配送成本", "悦跑活动花费"):     "yuepaoActivityCost",
    ("配送成本", "悦跑邮资"):         "yuepaoDelivery",
    ("配送成本", "配送成本汇总"):     "deliveryCost",
    ("配送成本", "众包天气补贴"):     "weatherSubsidy",
    ("配送成本", "悦跑周激励"):       "otherRevenue",
    ("固定成本", "办公室房租"):     "officeRent",
    ("固定成本", "业务团队"):       "teamCost",
    ("固定成本", "固定成本汇总"):   "fixedCost",
    ("附加成本", "三方服务费"):   "thirdPartyServiceCost",
    ("附加成本", "社保"):         "socialInsurance",
    ("附加成本", "税"):           "taxCost",
    ("附加成本", "附加成本汇总"): "additionalCost",
    ("其他成本", "外卖运营增单"):   "operationBoostCost",
    ("其他成本", "水电电话网物料费"): "utilityCost",
    ("其他成本", "差旅招待"):       "travelCost",
    ("其他成本", "其他成本"):       "otherMiscCost",
    ("其他成本", "其他成本汇总"):   "otherCost",
    ("毛利", "毛利"):             "profit",
    ("线上收入汇总", "线上收入汇总"): "onlineRevenue",
    ("收入汇总", "收入汇总"):         "totalRevenue",
    ("支出汇总", "支出汇总"):         "totalExpense",
    ("线上支出汇总", "线上支出汇总"): "onlineExpense",
    ("线下支出汇总", "线下支出汇总"): "offlineExpense",
}

ACCUMULATE_FIELDS = {"otherRevenue"}


def format_date(db_date):
    s = str(db_date).strip()
    if len(s) == 6:
        return f"{s[:4]}-{s[4:6]}-01"
    elif len(s) == 8:
        return f"{s[:4]}-{s[4:6]}-{s[6:8]}"
    return s


def query_table(cursor, table_name, date_str):
    sql = f"""
        SELECT column_name1, column_name2, column_name3, column_name4,
               city1, city2, city3, city4, city5, city6, city7, city8, city9, city10, `sum`, type
        FROM {table_name}
        WHERE date = %s
    """
    cursor.execute(sql, (date_str,))
    columns = [desc[0] for desc in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


def rows_to_cities(rows, merchant_type="all", merchant_label="全量商家"):
    city_columns = [f"city{i}" for i in range(1, 11)]
    cities_data = {}

    for row in rows:
        cn3 = row.get("column_name3", "").strip()
        cn4 = row.get("column_name4", "").strip()
        db_type = (row.get("type") or "").strip()

        field_key = (cn3, cn4)
        field_name = FIELD_MAP.get(field_key)
        if not field_name:
            continue

        module_key = TYPE_MAP.get(db_type, "all")

        for city_col in city_columns:
            value = row.get(city_col)
            if value is None:
                continue

            city_name = CITY_MAP.get(city_col)
            if not city_name:
                continue

            if city_name not in cities_data:
                cities_data[city_name] = {}

            if module_key not in cities_data[city_name]:
                cities_data[city_name][module_key] = {}

            if field_name in ACCUMULATE_FIELDS:
                cities_data[city_name][module_key][field_name] = (
                    cities_data[city_name][module_key].get(field_name, 0) + float(str(value).replace(',', ''))
                )
            else:
                cities_data[city_name][module_key][field_name] = float(str(value).replace(',', ''))

    cities = []
    for city_name, modules in cities_data.items():
        for mod_key, fields in modules.items():
            o = fields.get("orders", 0)
            profit = fields.get("profit", 0)
            gmv = fields.get("gmvAmount", 0)
            online_rev = fields.get("onlineRevenue", 0)
            total_exp = fields.get("totalExpense", 0)
            delivery_cost = fields.get("deliveryCost", 0)
            fixed_cost = fields.get("fixedCost", 0)
            subsidy_b = fields.get("subsidyB", 0)
            subsidy_c = fields.get("subsidyC", 0)
            subsidy_total = fields.get("subsidyTotal", 0)
            enterprise = fields.get("enterpriseOrders", 0)
            self_orders = fields.get("selfOrders", 0)

            fields["ue"] = profit / o if o > 0 else 0
            fields["subsidyRatio"] = subsidy_total / gmv if gmv > 0 else 0
            fields["profitRate"] = profit / online_rev if online_rev > 0 else 0
            fields["avgRevenuePerOrder"] = online_rev / o if o > 0 else 0
            fields["avgCostPerOrder"] = total_exp / o if o > 0 else 0
            fields["deliveryCostRate"] = delivery_cost / online_rev if online_rev > 0 else 0
            fields["fixedCostRate"] = fixed_cost / online_rev if online_rev > 0 else 0
            fields["subsidyRateB"] = subsidy_b / gmv if gmv > 0 else 0
            fields["subsidyRateC"] = subsidy_c / gmv if gmv > 0 else 0
            fields["enterpriseRatio"] = enterprise / o if o > 0 else 0
            fields["selfRatio"] = self_orders / o if o > 0 else 0

        city_obj = {
            "name": city_name,
            "displayName": city_name,
            "modules": modules,
        }
        cities.append(city_obj)

    return cities


def fetch_from_db(db_config, date_str):
    print(f"[1/4] 连接数据库 {db_config['host']}:{db_config['port']}/{db_config['database']} ...")
    conn = pymysql.connect(**db_config)
    cursor = conn.cursor()

    try:
        tables = {
            "bill_show_ql":  ("all",   "全量商家"),
            "bill_show_city": ("city",  "城市商家"),
            "bill_show_ka":  ("ka",    "KA商家"),
        }

        merchant_data = {}

        for table_name, (mtype, mlabel) in tables.items():
            print(f"[2/4] 查询 {table_name} ({mlabel}) ...")
            rows = query_table(cursor, table_name, date_str)
            print(f"       获取 {len(rows)} 条记录")

            cities = rows_to_cities(rows, mtype, mlabel)
            print(f"       生成 {len(cities)} 个城市数据")

            if cities:
                merchant_data[mtype] = {"label": mlabel, "cities": cities}

        current_merchant = "all"
        default_cities = merchant_data.get("all", {}).get("cities", [])
        
        # 修复：如果 all 表的城市数据为空，尝试从 city 表补充
        if not default_cities:
            city_cities = merchant_data.get("city", {}).get("cities", [])
            if city_cities:
                print("       警告：all 表城市数据为空，已从 city 表补充 %d 个城市" % len(city_cities))
                default_cities = city_cities
            else:
                print("       警告：all 表和 city 表城市数据都为空！")

        current_data = {
            "date": format_date(date_str),
            "cities": default_cities,
            "fileName": f"auto-sync {format_date(date_str)}",
        }

        print(f"[3/4] 数据转换完成：{len(merchant_data)} 个商家类型，"
              f"全量 {len(default_cities)} 个城市")

        return current_data, merchant_data, current_merchant

    finally:
        cursor.close()
        conn.close()


def push_to_github(date, current_data, merchant_data, current_merchant, token):
    print(f"[3/4] 推送到 GitHub ...")

    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json",
    }

    sha = None
    existing_records = []

    try:
        resp = requests.get(GITHUB_API, headers=headers, timeout=30)
        if resp.status_code == 200:
            data = resp.json()
            sha = data.get("sha")
            try:
                decoded = json.loads(base64.b64decode(data["content"]).decode("utf-8"))
                existing_records = decoded if isinstance(decoded, list) else [decoded]
            except Exception:
                pass
        elif resp.status_code == 404:
            print("       shared-data.json 不存在，将创建新文件")
        else:
            print(f"       警告: 拉取现有数据失败 (HTTP {resp.status_code})，将尝试覆盖")
    except Exception as e:
        print(f"       警告: 拉取现有数据失败 ({e})，将尝试覆盖")

    new_record = {
        "date": format_date(date),
        "updatedAt": datetime.now().isoformat(),
        "uploadedBy": "auto-sync",
        "fileName": f"auto-sync {format_date(date)}",
        "currentData": {
            "date": format_date(date),
            "cities": current_data["cities"],
            "fileName": current_data["fileName"],
        },
        "merchantData": {},
        "currentMerchant": current_merchant,
    }

    for key, val in merchant_data.items():
        new_record["merchantData"][key] = {
            "label": val["label"],
            "cities": val["cities"],
        }

    new_date = format_date(date)
    found = False
    for i, rec in enumerate(existing_records):
        rec_date = rec.get("currentData", {}).get("date", "")
        if rec_date == new_date:  # 按日期精确匹配，不是按月份
            existing_records[i] = new_record
            found = True
            print(f"       已存在 {new_date} 数据，已更新为最新")
            break

    if not found:
        existing_records.append(new_record)

    # 将 JSON 数据编码为 Base64（用于 GitHub API）
    payload_json = json.dumps(existing_records, ensure_ascii=False)
    payload_b64 = base64.b64encode(payload_json.encode("utf-8")).decode("ascii")

    body = {
        "message": f"CloudData sync: {format_date(date)} (auto)",
        "content": payload_b64,
    }
    if sha:
        body["sha"] = sha

    resp = requests.put(GITHUB_API, headers=headers, json=body, timeout=60)

    if resp.status_code in (200, 201):
        print(f"[4/4] 推送成功! 记录数: {len(existing_records)}")
        return True
    else:
        print(f"[4/4] 推送失败: HTTP {resp.status_code}")
        print(f"       {resp.text[:300]}")
        return False


def main():
    if len(sys.argv) < 2:
        print("=" * 60)
        print("财务工具 - MySQL 数据库同步脚本")
        print("=" * 60)
        print()
        print("用法: python db-sync.py <日期>")
        print()
        print("示例:")
        print("  python db-sync.py 202604    # 同步2026年4月数据")
        print("  python db-sync.py 20260423  # 同步2026年4月23日数据")
        print()
        print("注意: 数据库每天下午2点更新完毕，请在此之后执行")
        sys.exit(1)

    date_str = sys.argv[1].strip()

    if not (date_str.isdigit() and len(date_str) in (6, 8)):
        print(f"错误: 日期格式不正确 '{date_str}'，请使用 YYYYMM 或 YYYYMMDD 格式")
        sys.exit(1)

    print(f"开始同步 {date_str} 的数据 ...")
    print(f"时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()

    current_data, merchant_data, current_merchant = fetch_from_db(DB_CONFIG, date_str)

    if not current_data.get("cities"):
        print(f"\n错误: 日期 {date_str} 没有找到任何数据，请确认日期是否正确")
        sys.exit(1)

    success = push_to_github(date_str, current_data, merchant_data, current_merchant, GITHUB_TOKEN)

    if success:
        print(f"\n同步完成! 数据已推送到 GitHub")
        print(f"前端访问: https://xinglianyue.github.io/finance-tool/")
        print(f"(约1分钟后数据自动生效)")
    else:
        print(f"\n同步失败，请检查网络连接和配置")
        sys.exit(1)


if __name__ == "__main__":
    main()


# ============================================================
# Windows 任务计划程序设置（可选）
# ============================================================
# 1. 打开"任务计划程序" (Win+R → taskschd.msc)
# 2. 创建基本任务
# 3. 名称: 财务工具数据同步
# 4. 触发器: 每天 14:30
# 5. 操作: 启动程序
#    - 程序: python
#    - 参数: db-sync.py %date:~0,4%%date:~5,2%%date:~8,2%
#    - 起始于: 脚本所在目录

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
财务工具数据库同步脚本
版本: v1.1.1 (版本历史机制修复版)
功能：从MySQL数据库同步数据到GitHub
更新记录:
  v1.0.0 - 初始版本
  v1.1.0 - 修复数据覆盖问题，添加版本历史机制
  v1.1.1 - 增加版本号显示和参数验证
"""

import pymysql
import requests
import json
import base64
import os
import sys
from datetime import datetime, timedelta

# 版本号常量
VERSION = "v1.1.1"
VERSION_DESCRIPTION = "版本历史机制修复版"

CONFIG_FILE = "config-db.json"

CITY_MAP = {
    "city1": "承德", "city2": "邯郸", "city3": "沧州", "city4": "唐山", "city5": "保定",
    "city6": "石家庄", "city7": "张家口", "city8": "廊坊", "city9": "衡水", "city10": "秦皇岛",
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
    """格式化日期，对于月份格式返回月末日期"""
    s = str(db_date).strip()
    if len(s) == 6:
        # YYYYMM格式，返回月末日期
        year = int(s[:4])
        month = int(s[4:6])
        # 获取下一个月第一天，再减一天就是本月最后一天
        if month == 12:
            next_month = datetime(year + 1, 1, 1)
        else:
            next_month = datetime(year, month + 1, 1)
        last_day = next_month - timedelta(days=1)
        return last_day.strftime("%Y-%m-%d")
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
            if value is None or str(value).strip() == '':
                continue

            city_name = CITY_MAP.get(city_col)
            if not city_name:
                continue

            if city_name not in cities_data:
                cities_data[city_name] = {}

            if module_key not in cities_data[city_name]:
                cities_data[city_name][module_key] = {}

            try:
                float_value = float(str(value).replace(',', ''))
            except ValueError:
                continue

            if field_name in ACCUMULATE_FIELDS:
                cities_data[city_name][module_key][field_name] = (
                    cities_data[city_name][module_key].get(field_name, 0) + float_value
                )
            else:
                cities_data[city_name][module_key][field_name] = float_value

    cities = []
    for city_name, modules in cities_data.items():
        for mod_key, fields in modules.items():
            # 自动计算毛利
            online_rev = fields.get("onlineRevenue", 0)
            total_exp = fields.get("totalExpense", 0)
            
            # 如果数据库中有毛利数据就用数据库的，否则自动计算
            if "profit" not in fields or fields["profit"] == 0:
                fields["profit"] = online_rev - total_exp
            
            o = fields.get("orders", 0)
            profit = fields.get("profit", 0)
            gmv = fields.get("gmvAmount", 0)
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


def calculate_total_city(cities, merchant_type="all"):
    """计算所有城市的汇总数据（总商）"""
    total_modules = {}

    for city in cities:
        for mod_key, fields in city["modules"].items():
            if mod_key not in total_modules:
                total_modules[mod_key] = {}

            for field, value in fields.items():
                if isinstance(value, (int, float)):
                    if field in total_modules[mod_key]:
                        total_modules[mod_key][field] += value
                    else:
                        total_modules[mod_key][field] = value

    # 重新计算比率字段
    for mod_key, fields in total_modules.items():
        # 自动计算毛利
        online_rev = fields.get("onlineRevenue", 0)
        total_exp = fields.get("totalExpense", 0)
        
        # 如果数据库中有毛利数据就用数据库的，否则自动计算
        if "profit" not in fields or fields["profit"] == 0:
            fields["profit"] = online_rev - total_exp
        
        o = fields.get("orders", 0)
        profit = fields.get("profit", 0)
        gmv = fields.get("gmvAmount", 0)
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

    return {
        "name": "总商",
        "displayName": "总商",
        "modules": total_modules,
    }


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
                # 添加总商数据（自动计算所有城市汇总）
                total_city = calculate_total_city(cities, mtype)
                cities.append(total_city)
                print(f"       自动计算总商数据")

                merchant_data[mtype] = {"label": mlabel, "cities": cities}

        current_merchant = "all"
        default_cities = merchant_data.get("all", {}).get("cities", [])

        totals = {}
        if default_cities:
            total_city = next((c for c in default_cities if c["name"] == "总商"), None)
            if total_city and "all" in total_city["modules"]:
                totals = total_city["modules"]["all"]

        return {
            "merchantData": merchant_data,
            "currentData": {
                "totals": totals,
                "cities": default_cities,
            },
            "currentMerchant": current_merchant,
        }

    finally:
        cursor.close()
        conn.close()


def push_to_github(date_str, current_data, merchant_data, current_merchant, token):
    print("[3/4] 推送到 GitHub ...")

    repo = "xinglianyue/finance-tool"
    path = "shared-data.json"
    
    new_record = {
        "date": format_date(date_str),
        "updatedAt": datetime.now().isoformat() + "Z",
        "uploadedBy": "db-sync",
        "fileName": f"bill_{date_str}.json",
        "currentData": current_data,
        "merchantData": merchant_data,
        "currentMerchant": current_merchant,
    }

    try:
        url = f"https://api.github.com/repos/{repo}/contents/{path}"
        headers = {
            "Authorization": f"token {token}",
            "Accept": "application/vnd.github.v3+json",
        }

        response = requests.get(url, headers=headers)
        existing_data = []
        
        if response.status_code == 200:
            try:
                content_b64 = response.json()["content"]
                content_str = base64.b64decode(content_b64).decode("utf-8")
                existing_data = json.loads(content_str)
                print(f"       检测到 {len(existing_data)} 条现有记录")
                
                # 验证数据结构
                if not isinstance(existing_data, list):
                    print(f"        错误：现有数据格式不正确（不是列表）")
                    return False
                    
            except Exception as e:
                print(f"       ❌ 读取现有数据失败：{e}")
                print(f"       ⚠️ 安全保护：中止同步，避免覆盖数据！")
                return False
        else:
            print(f"       GitHub API 返回：{response.status_code}")
            print("       现有数据不存在，将创建新文件")

        existing_data = existing_data.copy()
        
        has_existing_same_date = any(r.get("date") == new_record["date"] for r in existing_data)
        if has_existing_same_date:
            max_version = 0
            for r in existing_data:
                if r.get("date") == new_record["date"]:
                    r["isHistorical"] = True
                    r.pop("isLatest", None)
                    if "version" in r:
                        max_version = max(max_version, r["version"])
            
            new_record["version"] = max_version + 1
            new_record["isLatest"] = True
        else:
            new_record["version"] = 1
            new_record["isLatest"] = True
        
        existing_data.append(new_record)
        existing_data.sort(key=lambda x: x.get("date", ""), reverse=True)

        payload_json = json.dumps(existing_data, ensure_ascii=False, indent=2)
        payload_b64 = base64.b64encode(payload_json.encode("utf-8")).decode("ascii")

        data = {
            "message": f"Sync data for {date_str}",
            "content": payload_b64,
        }

        if response.status_code == 200:
            data["sha"] = response.json()["sha"]

        response = requests.put(url, headers=headers, json=data)
        
        if response.status_code in [200, 201]:
            print(f"[4/4] 推送成功! 记录数: {len(existing_data)}")
            return True
        else:
            print(f"       推送失败: {response.status_code}")
            print(f"       {response.text}")
            return False

    except Exception as e:
        print(f"       推送异常: {e}")
        return False


def main():
    print(f"═══════════════════════════════════════════")
    print(f"  财务工具数据库同步脚本 {VERSION}")
    print(f"  {VERSION_DESCRIPTION}")
    print(f"═══════════════════════════════════════════")
    print()

    if len(sys.argv) < 2:
        print("用法: python db-sync.py <日期>")
        print("示例: python db-sync.py 202605")
        print("示例: python db-sync.py 20260528")
        print()
        print("版本历史:")
        print("  v1.0.0 - 初始版本")
        print("  v1.1.0 - 修复数据覆盖问题，添加版本历史机制")
        print("  v1.1.1 - 增加版本号显示和参数验证")
        sys.exit(1)

    date_str = sys.argv[1]
    print(f"开始同步 {date_str} 的数据 ...")
    print(f"时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"脚本版本: {VERSION}")
    print()

    if not os.path.exists(CONFIG_FILE):
        print(f"错误: 配置文件 {CONFIG_FILE} 不存在")
        sys.exit(1)

    with open(CONFIG_FILE, "r", encoding="utf-8") as f:
        config = json.load(f)

    db_config = config["db"]
    github_token = config["github"]["token"]

    try:
        result = fetch_from_db(db_config, date_str)
        print(f"[3/4] 数据转换完成：{len(result['merchantData'])} 个商家类型")
        
        success = push_to_github(
            date_str,
            result["currentData"],
            result["merchantData"],
            result["currentMerchant"],
            github_token
        )

        if success:
            print()
            print("═══════════════════════════════════════════")
            print("同步完成! 数据已推送到 GitHub")
            print(f"脚本版本: {VERSION}")
            print("前端访问: https://xinglianyue.github.io/finance-tool/")
            print("(约1分钟后数据自动生效)")
            print("═══════════════════════════════════════════")
        else:
            print()
            print("同步失败! 请检查错误信息")
            sys.exit(1)

    except Exception as e:
        print(f"同步异常: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
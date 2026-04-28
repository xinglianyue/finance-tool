#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
财务工具 - MySQL 数据库同步脚本 (v12) (v12 improved)
=================================
功能：从运营中心 MySQL 数据库导出账单数据，转换为前端 JSON 格式，推送到 GitHub。

使用方式（3步）：
  1. pip install pymysql requests
  2. 编辑下方【配置区】填入 GitHub Token
  3. 每天下午2点后运行: python db-sync.py

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
# 【配置区】只需要改这里
# ============================================================

# MySQL 配置
DB_CONFIG = {
    "host": "192.168.0.12",
    "port": 3306,
    "user": "root",
    "password": os.environ.get("DB_PASSWORD", "PLEASE_SET_ENV_VAR"),
    "database": "ruo_yi",
    "charset": "utf8mb4",
    "connect_timeout": 30,
    "read_timeout": 600,
}

# GitHub 配置（需要 Personal Access Token）
# 获取方式：GitHub → Settings → Developer settings → Personal access tokens → Generate new token (classic)
#          权限勾选：repo (完整仓库访问)
GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")

GITHUB_REPO = "xinglianyue/finance-tool"
GITHUB_API = f"https://api.github.com/repos/{GITHUB_REPO}/contents/shared-data.json"
GITHUB_RAW_URL = "https://raw.githubusercontent.com/xinglianyue/finance-tool/main/shared-data.json"

# 城市映射（city1~city10 对应中文名）
CITY_MAP = {
    "city1": "承德市", "city2": "围场满族蒙古族自治县", "city3": "玉田县",
    "city4": "安国市", "city5": "安平", "city6": "献县", "city7": "晋州",
    "city8": "威县", "city9": "深泽县", "city10": "康保县",
}

# type 字段 → 前端模块名映射
TYPE_MAP = {
    "全量":  "all",
    "餐饮":  "food",
    "闪购":  "flash",
    "医药":  "medicine",
    "拼好饭": "group",
}

# ============================================================
# 字段映射：DB的 column_name4 → 前端字段名
# ============================================================

# column_name3 + column_name4 → 前端字段名
FIELD_MAP = {
    # ---- 体量 ----
    ("原价交易额", "加盟原价交易额"):     "franchiseGMV",
    ("原价交易额", "自配原价交易额"):     "selfGMV",
    ("原价交易额", "原价交易额汇总"):     "gmvAmount",
    ("订单量", "加盟订单量"):            "franchiseOrders",
    ("订单量", "自配订单量"):            "selfOrders",
    ("订单量", "企客订单量"):            "enterpriseOrders",
    ("订单量", "订单量汇总"):            "orders",
    # ---- 收入 - 抽佣 ----
    ("抽佣金额（收入一）", "加盟抽佣金额"):       "franchiseCommission",
    ("抽佣金额（收入一）", "自配抽佣金额"):       "selfCommission",
    ("抽佣金额（收入一）", "企客商家抽佣金额"):   "enterpriseCommission",
    ("抽佣金额（收入一）", "抽佣金额汇总"):       "commission",
    # ---- 收入 - 配送费 ----
    ("配送费（收入二）", "加盟配送费"):       "franchiseDeliveryFee",
    ("配送费（收入二）", "二次配送费"):       "secondDeliveryFee",
    ("配送费（收入二）", "企客配送费"):       "enterpriseDeliveryFee",
    ("配送费（收入二）", "一对一急送配送费"): "urgentDeliveryFee",
    ("配送费（收入二）", "配送费汇总"):       "deliveryFee",
    # ---- 收入 - 其他收入 ----
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
    # ---- 支出 - 代补 ----
    ("代补金额花费", "B端代补金额"):     "subsidyB",
    ("代补金额花费", "C端代补金额"):     "subsidyC",
    ("代补金额花费", "账单-代补差额"):   "subsidyDiff",
    ("代补金额花费", "代补金额花费汇总"): "subsidyTotal",
    # ---- 支出 - 代补（拼好饭专用字段）----
    ("代补金额花费", "拼单补贴"):           "pinDanSubsidy",
    ("代补金额花费", "拼好饭补贴"):         "pinHaoFanSubsidy",
    ("代补金额花费", "整体代补金额"):       "subsidyTotal",
    # ---- 全量 - 平台成本新增 ----
    ("平台成本", "ai外呼费用结算"):          "platformCommissionCost",  # 归入平台成本
    # ---- 拼好饭 - 业务数据新增 ----
    ("抽佣比例", "城市单均保底"):           "otherRevenue",
    ("抽佣比例", "城市商家单均保底"):       "otherRevenue",
    ("抽佣比例", "KA商家单均保底"):         "otherRevenue",
    # ---- 支出 - 平台成本 ----
    ("平台成本", "平台抽佣金额"):       "platformCommissionCost",
    ("平台成本", "合作商售后赔付费用"): "afterSaleCost",
    ("平台成本", "关爱基金"):           "careFund",
    ("平台成本", "保险费用"):           "insuranceCost",
    ("平台成本", "竞价"):               "biddingCost",
    ("平台成本", "罚款"):               "penalty",
    ("平台成本", "平台成本汇总"):       "platformCost",
    # ---- 支出 - 配送成本 ----
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
    ("配送成本", "悦跑周激励"):       "otherRevenue",  # 新字段，归入其他收入
    # ---- 支出 - 固定成本 ----
    ("固定成本", "办公室房租"):     "officeRent",
    ("固定成本", "业务团队"):       "teamCost",
    ("固定成本", "固定成本汇总"):   "fixedCost",
    # ---- 支出 - 附加成本 ----
    ("附加成本", "三方服务费"):   "thirdPartyServiceCost",
    ("附加成本", "社保"):         "socialInsurance",
    ("附加成本", "税"):           "taxCost",
    ("附加成本", "附加成本汇总"): "additionalCost",
    # ---- 支出 - 其他成本 ----
    ("其他成本", "外卖运营增单"):   "operationBoostCost",
    ("其他成本", "水电电话网物料费"): "utilityCost",
    ("其他成本", "差旅招待"):       "travelCost",
    ("其他成本", "其他成本"):       "otherMiscCost",
    ("其他成本", "其他成本汇总"):   "otherCost",
    # ---- 汇总字段（DB独有） ----
    ("毛利", "毛利"):             "profit",
    ("线上收入汇总", "线上收入汇总"): "onlineRevenue",
    ("收入汇总", "收入汇总"):         "totalRevenue",
    ("支出汇总", "支出汇总"):         "totalExpense",
    ("线上支出汇总", "线上支出汇总"): "onlineExpense",
    ("线下支出汇总", "线下支出汇总"): "offlineExpense",
}

# 需要累加的前端字段（多个DB字段映射到同一个前端字段）
# 其他收入类：合作商运营服务费/拼单宝激励/神券包激励/广告收入/专项补贴/众包补贴调账 等
ACCUMULATE_FIELDS = {"otherRevenue"}


def format_date(db_date):
    """将 DB 日期格式（YYYYMM 或 YYYYMMDD）转为 YYYY-MM-DD"""
    s = str(db_date).strip()
    if len(s) == 6:
        return f"{s[:4]}-{s[4:6]}-01"
    elif len(s) == 8:
        return f"{s[:4]}-{s[4:6]}-{s[6:8]}"
    return s


def query_table(cursor, table_name, date_str):
    """查询指定表的所有数据"""
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
    """
    将 DB 行数据转换为前端的城市列表格式
    每行的 city1~city10 是各城市的数据值，type 决定放入哪个模块
    """
    city_columns = [f"city{i}" for i in range(1, 11)]

    # 按城市 × 模块 聚合
    cities_data = {}  # city_name → { module_key → { field_name → value } }

    for row in rows:
        cn3 = row.get("column_name3", "").strip()
        cn4 = row.get("column_name4", "").strip()
        db_type = (row.get("type") or "").strip()

        # 查找字段映射
        field_key = (cn3, cn4)
        field_name = FIELD_MAP.get(field_key)
        if not field_name:
            continue

        # type → 前端模块名
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

    # 构建前端格式 + 计算派生字段
    cities = []
    for city_name, modules in cities_data.items():
        # 对每个模块计算派生字段（与前端 extractModule 一致）
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




def validate_field_alignment():
    """启动时验证FIELD_MAP覆盖度，确保前后端字段对齐"""
    print("[字段自检] 开始验证FIELD_MAP与前端字段对齐...")

    # 读取前端文件提取字段定义
    frontend_fields = set()
    try:
        import os
        html_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "index-v12.html")
        if not os.path.exists(html_path):
            html_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "index.html")
        if not os.path.exists(html_path):
            print("[字段自检] WARNING: 未找到前端HTML文件，跳过验证")
            return True

        with open(html_path, 'r', encoding='utf-8') as f:
            html_content = f.read()

        # 提取前端字段名（FIELD_RULES中的name值）
        import re
        field_matches = re.findall(r"name:\s*['"]([^'"]+)['"]", html_content)
        frontend_fields = set(field_matches)
    except Exception as e:
        print(f"[字段自检] WARNING: 读取前端文件失败: {e}")
        return True

    # FIELD_MAP中映射到的所有目标字段名
    mapped_fields = set(FIELD_MAP.values())

    # 检查缺失
    missing = frontend_fields - mapped_fields - ACCUMULATE_FIELDS
    # 排除一些特殊字段
    special_fields = {'moduleName', 'moduleKey', 'ue', 'subsidyRatio', 'profitRate', 
                      'avgRevenuePerOrder', 'avgCostPerOrder', 'deliveryCostRate', 
                      'fixedCostRate', 'subsidyRateB', 'subsidyRateC', 
                      'enterpriseRatio', 'selfRatio', 'subsidyRateTotal', 
                      'subsidyTotalRatio', 'onlineRevenue', 'totalRevenue', 
                      'totalExpense', 'onlineExpense', 'offlineExpense'}
    missing -= special_fields  # 派生字段不需要映射

    if missing:
        print(f"[字段自检] FAIL: {len(missing)}个前端字段在FIELD_MAP中缺失:")
        for f in sorted(missing):
            print(f"  - {f}")
        return False

    print(f"[字段自检] PASS: 前端{len(frontend_fields)}个字段全部覆盖")
    return True

def fetch_from_db(db_config, date_str):
    """
    从 MySQL 获取指定日期的所有账单数据，返回前端格式
    """
    print(f"[1/4] 连接数据库 {db_config['host']}:{db_config['port']}/{db_config['database']} ...")
    conn = pymysql.connect(**db_config)
    cursor = conn.cursor()

    try:
        # 3张商家类型表
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

        # 默认展示全量商家
        current_merchant = "all"
        default_cities = merchant_data.get("all", {}).get("cities", [])

        # 构建 currentData
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
    """将数据推送到 GitHub shared-data.json"""
    print(f"[3/4] 推送到 GitHub ...")

    # 先拉取现有数据
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

    # 构建新记录
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

    # 去重：同月份(YYYY-MM)只保留最新一条，避免21号和18号重复
    new_month = format_date(date)[:7]  # "2026-04"
    found = False
    for i, rec in enumerate(existing_records):
        rec_date = rec.get("currentData", {}).get("date", "")
        rec_month = rec_date[:7]  # "2026-04"
        if rec_month == new_month:
            existing_records[i] = new_record
            found = True
            print(f"       已存在 {new_month} 月份数据，已更新为最新")
            break

    if not found:
        existing_records.append(new_record)

    # 推送
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
    # ---- 参数处理 ----
    if len(sys.argv) < 2:
        print("=" * 60)
        print("财务工具 - MySQL 数据库同步脚本 (v12 improved)")
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

    # 校验 token
    if GITHUB_TOKEN == "在这里填入你的GitHub Token":
        print("错误: 请先在脚本中配置 GITHUB_TOKEN")
        print("获取方式: GitHub → Settings → Developer settings → Personal access tokens → Generate new token (classic)")
        print("权限勾选: repo (完整仓库访问)")
        sys.exit(1)

    # 校验日期格式
    if not (date_str.isdigit() and len(date_str) in (6, 8)):
        print(f"错误: 日期格式不正确 '{date_str}'，请使用 YYYYMM 或 YYYYMMDD 格式")
        sys.exit(1)

    print(f"开始同步 {date_str} 的数据 ...")
    print(f"时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()

    # 执行同步
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
        print(f"\n同步失败，请检查网络连接和 GitHub Token 配置")
        sys.exit(1)


if __name__ == "__main__":
    main()


# ============================================================
# Windows 任务计划程序设置（可选，实现每天自动执行）
# ============================================================
# 1. 打开"任务计划程序" (Win+R → taskschd.msc)
# 2. 右侧"创建基本任务"
# 3. 名称: 财务工具数据同步
# 4. 触发器: 每天 14:30（下午2点30分，给数据库更新留缓冲）
# 5. 操作: 启动程序
#    - 程序: python
#    - 参数: db-sync.py %date:~0,4%%date:~5,2%%date:~8,2%
#    - 起始于: 脚本所在目录
# 6. 完成
#
# %date:~0,4%%date:~5,2%%date:~8,2% 会自动传入当天日期（如 20260423）

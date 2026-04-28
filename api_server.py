#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
财务工具 - 本地API服务
======================
部署在技术人员电脑上（能访问MySQL的机器），前端通过HTTP请求触发数据同步。
启动后常驻运行，前端页面的"同步数据"按钮调用此服务。

启动方式:
  pip install pymysql requests flask
  python api_server.py

更新方式:
  git pull
  python api_server.py
"""

import pymysql
import json
import requests
import base64
import sys
import os
import threading
import logging
from datetime import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

# ============================================================
# 日志配置
# ============================================================
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('api_server.log', encoding='utf-8'),
    ]
)
log = logging.getLogger(__name__)

# ============================================================
# 配置
# ============================================================

HOST = '0.0.0.0'
PORT = 8899

DB_CONFIG = {
    "host": "192.168.0.12",
    "port": 3306,
    "user": "root",
    "password": "Mysql!@#123,.",
    "database": "ruo_yi",
    "charset": "utf8mb4",
    "connect_timeout": 30,
    "read_timeout": 600,
}

# 从配置文件读取敏感信息（不提交到Git）
CONFIG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'config.json')
_github_token = None
if os.path.exists(CONFIG_FILE):
    with open(CONFIG_FILE, 'r', encoding='utf-8') as _f:
        _cfg = json.load(_f)
        _github_token = _cfg.get('github_token', '')
        DB_CONFIG['password'] = _cfg.get('db_password', DB_CONFIG['password'])

GITHUB_TOKEN = _github_token or os.environ.get('GITHUB_TOKEN', '')
GITHUB_REPO = "xinglianyue/finance-tool"
GITHUB_API = f"https://api.github.com/repos/{GITHUB_REPO}/contents/shared-data.json"

CITY_MAP = {
    "city1": "承德市", "city2": "围场满族蒙古族自治县", "city3": "玉田县",
    "city4": "安国市", "city5": "安平", "city6": "献县", "city7": "晋州",
    "city8": "威县", "city9": "深泽县", "city10": "康保县",
}

TYPE_MAP = {
    "全量": "all",
    "餐饮": "food",
    "闪购": "flash",
    "医药": "medicine",
    "拼好饭": "group",
}

FIELD_MAP = {
    ("原价交易额", "加盟原价交易额"): "franchiseGMV",
    ("原价交易额", "自配原价交易额"): "selfGMV",
    ("原价交易额", "原价交易额汇总"): "gmvAmount",
    ("订单量", "加盟订单量"): "franchiseOrders",
    ("订单量", "自配订单量"): "selfOrders",
    ("订单量", "企客订单量"): "enterpriseOrders",
    ("订单量", "订单量汇总"): "orders",
    ("抽佣金额（收入一）", "加盟抽佣金额"): "franchiseCommission",
    ("抽佣金额（收入一）", "自配抽佣金额"): "selfCommission",
    ("抽佣金额（收入一）", "企客商家抽佣金额"): "enterpriseCommission",
    ("抽佣金额（收入一）", "抽佣金额汇总"): "commission",
    ("配送费（收入二）", "加盟配送费"): "franchiseDeliveryFee",
    ("配送费（收入二）", "二次配送费"): "secondDeliveryFee",
    ("配送费（收入二）", "企客配送费"): "enterpriseDeliveryFee",
    ("配送费（收入二）", "一对一急送配送费"): "urgentDeliveryFee",
    ("配送费（收入二）", "配送费汇总"): "deliveryFee",
    ("其他收入", "合作商运营服务费"): "otherRevenue",
    ("其他收入", "拼单宝激励"): "otherRevenue",
    ("其他收入", "神券包激励"): "otherRevenue",
    ("其他收入", "广告收入"): "otherRevenue",
    ("其他收入", "专项补贴"): "specialSubsidy",
    ("其他收入", "众包补贴调账"): "crowdSubsidyAdjust",
    ("其他收入", "发展计划调账"): "otherRevenue",
    ("其他收入", "星火激励调账"): "otherRevenue",
    ("其他收入", "竞价返还调账"): "otherRevenue",
    ("其他收入", "跑腿结算调账"): "otherRevenue",
    ("其他收入", "其他收入汇总"): "otherRevenue",
    ("代补金额花费", "B端代补金额"): "subsidyB",
    ("代补金额花费", "C端代补金额"): "subsidyC",
    ("代补金额花费", "账单-代补差额"): "subsidyDiff",
    ("代补金额花费", "代补金额花费汇总"): "subsidyTotal",
    ("代补金额花费", "拼单补贴"): "pinDanSubsidy",
    ("代补金额花费", "拼好饭补贴"): "pinHaoFanSubsidy",
    ("代补金额花费", "整体代补金额"): "subsidyTotal",
    ("平台成本", "ai外呼费用结算"): "platformCommissionCost",
    ("抽佣比例", "城市单均保底"): "otherRevenue",
    ("抽佣比例", "城市商家单均保底"): "otherRevenue",
    ("抽佣比例", "KA商家单均保底"): "otherRevenue",
    ("平台成本", "平台抽佣金额"): "platformCommissionCost",
    ("平台成本", "合作商售后赔付费用"): "afterSaleCost",
    ("平台成本", "关爱基金"): "careFund",
    ("平台成本", "保险费用"): "insuranceCost",
    ("平台成本", "竞价"): "biddingCost",
    ("平台成本", "罚款"): "penalty",
    ("平台成本", "平台成本汇总"): "platformCost",
    ("配送成本", "加盟承接订单量"): "franchiseDeliverOrders",
    ("配送成本", "加盟单均邮资"): "franchiseAvgPostage",
    ("配送成本", "加盟活动花费"): "franchiseActivityCost",
    ("配送成本", "加盟邮资"): "franchiseDelivery",
    ("配送成本", "普众众包订单量"): "crowdOrders",
    ("配送成本", "普众众包基础邮资"): "crowdBasePostage",
    ("配送成本", "普众众包活动花费"): "crowdActivityCost",
    ("配送成本", "普众众包邮资"): "crowdDelivery",
    ("配送成本", "悦跑订单量"): "yuepaoOrders",
    ("配送成本", "悦跑基础邮资"): "yuepaoBasePostage",
    ("配送成本", "悦跑活动花费"): "yuepaoActivityCost",
    ("配送成本", "悦跑邮资"): "yuepaoDelivery",
    ("配送成本", "配送成本汇总"): "deliveryCost",
    ("配送成本", "众包天气补贴"): "weatherSubsidy",
    ("配送成本", "悦跑周激励"): "otherRevenue",
    ("固定成本", "办公室房租"): "officeRent",
    ("固定成本", "业务团队"): "teamCost",
    ("固定成本", "固定成本汇总"): "fixedCost",
    ("附加成本", "三方服务费"): "thirdPartyServiceCost",
    ("附加成本", "社保"): "socialInsurance",
    ("附加成本", "税"): "taxCost",
    ("附加成本", "附加成本汇总"): "additionalCost",
    ("其他成本", "外卖运营增单"): "operationBoostCost",
    ("其他成本", "水电电话网物料费"): "utilityCost",
    ("其他成本", "差旅招待"): "travelCost",
    ("其他成本", "其他成本"): "otherMiscCost",
    ("其他成本", "其他成本汇总"): "otherCost",
    ("毛利", "毛利"): "profit",
    ("线上收入汇总", "线上收入汇总"): "onlineRevenue",
    ("收入汇总", "收入汇总"): "totalRevenue",
    ("支出汇总", "支出汇总"): "totalExpense",
    ("线上支出汇总", "线上支出汇总"): "onlineExpense",
    ("线下支出汇总", "线下支出汇总"): "offlineExpense",
}

ACCUMULATE_FIELDS = {"otherRevenue"}

# ============================================================
# 同步锁（防止并发同步）
# ============================================================
sync_lock = threading.Lock()
sync_status = {"running": False, "last_time": None, "last_result": None, "last_error": None}

# ============================================================
# 核心逻辑（从db-sync.py迁移）
# ============================================================

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


def rows_to_cities(rows):
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
                    cities_data[city_name][module_key].get(field_name, 0)
                    + float(str(value).replace(',', ''))
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

        cities.append({
            "name": city_name,
            "displayName": city_name,
            "modules": modules,
        })

    return cities


def do_sync(date_str):
    """执行完整的同步流程：MySQL -> GitHub"""
    log.info(f"开始同步日期 {date_str}")

    # 1. 连接MySQL
    log.info("连接数据库...")
    conn = pymysql.connect(**DB_CONFIG)
    cursor = conn.cursor()

    try:
        tables = {
            "bill_show_ql": ("all", "全量商家"),
            "bill_show_city": ("city", "城市商家"),
            "bill_show_ka": ("ka", "KA商家"),
        }

        merchant_data = {}

        for table_name, (mtype, mlabel) in tables.items():
            log.info(f"查询 {table_name} ({mlabel})...")
            rows = query_table(cursor, table_name, date_str)
            log.info(f"  获取 {len(rows)} 条记录")
            cities = rows_to_cities(rows)
            log.info(f"  生成 {len(cities)} 个城市数据")
            if cities:
                merchant_data[mtype] = {"label": mlabel, "cities": cities}

        default_cities = merchant_data.get("all", {}).get("cities", [])
        current_data = {
            "date": format_date(date_str),
            "cities": default_cities,
            "fileName": f"auto-sync {format_date(date_str)}",
        }

        if not default_cities:
            return {"ok": False, "error": f"日期 {date_str} 没有找到任何数据"}

        log.info(f"数据转换完成: {len(merchant_data)} 个商家类型, {len(default_cities)} 个城市")

    finally:
        cursor.close()
        conn.close()

    # 2. 推送到GitHub
    log.info("推送到GitHub...")

    headers = {
        "Authorization": f"token {GITHUB_TOKEN}",
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
            log.info("shared-data.json 不存在，将创建")
        else:
            log.warning(f"拉取现有数据失败 (HTTP {resp.status_code})")
    except Exception as e:
        log.warning(f"拉取现有数据失败: {e}")

    new_record = {
        "date": format_date(date_str),
        "updatedAt": datetime.now().isoformat(),
        "uploadedBy": "api-server",
        "fileName": f"auto-sync {format_date(date_str)}",
        "currentData": {
            "date": format_date(date_str),
            "cities": current_data["cities"],
            "fileName": current_data["fileName"],
        },
        "merchantData": {},
        "currentMerchant": "all",
    }

    for key, val in merchant_data.items():
        new_record["merchantData"][key] = {
            "label": val["label"],
            "cities": val["cities"],
        }

    # 去重：同月份只保留最新一条
    new_month = format_date(date_str)[:7]
    found = False
    for i, rec in enumerate(existing_records):
        rec_month = rec.get("currentData", {}).get("date", "")[:7]
        if rec_month == new_month:
            existing_records[i] = new_record
            found = True
            log.info(f"更新已有 {new_month} 数据")
            break

    if not found:
        existing_records.append(new_record)
        log.info(f"新增 {new_month} 数据")

    payload_json = json.dumps(existing_records, ensure_ascii=False)
    payload_b64 = base64.b64encode(payload_json.encode("utf-8")).decode("ascii")

    body = {
        "message": f"CloudData sync: {format_date(date_str)} (api-server)",
        "content": payload_b64,
    }
    if sha:
        body["sha"] = sha

    resp = requests.put(GITHUB_API, headers=headers, json=body, timeout=120)

    if resp.status_code in (200, 201):
        log.info("推送成功!")
        return {
            "ok": True,
            "date": format_date(date_str),
            "cities": len(default_cities),
            "records": len(existing_records),
        }
    else:
        log.error(f"推送失败: HTTP {resp.status_code} {resp.text[:200]}")
        return {"ok": False, "error": f"GitHub推送失败: HTTP {resp.status_code}"}


def auto_detect_date():
    """自动检测今天或最近有数据的日期"""
    today = datetime.now()
    candidates = [
        today.strftime("%Y%m%d"),
        today.strftime("%Y%m"),
    ]
    # 如果是月初，也试上个月
    if today.day <= 3:
        last_month = today.replace(day=1)
        from datetime import timedelta
        last_month = last_month - timedelta(days=1)
        candidates.append(last_month.strftime("%Y%m"))

    conn = pymysql.connect(**DB_CONFIG)
    cursor = conn.cursor()
    try:
        for date_str in candidates:
            cursor.execute("SELECT COUNT(*) FROM bill_show_ql WHERE date = %s", (date_str,))
            count = cursor.fetchone()[0]
            if count > 0:
                return date_str, count
    finally:
        cursor.close()
        conn.close()

    return None, 0


# ============================================================
# HTTP 服务
# ============================================================

class SyncHandler(BaseHTTPRequestHandler):
    """处理前端同步请求"""

    def log_message(self, format, *args):
        log.info(f"[HTTP] {args[0]}")

    def _send_json(self, data, status=200):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))

    def do_OPTIONS(self):
        self._send_json({})

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path == '/api/status':
            # 返回服务状态
            self._send_json({
                "service": "finance-tool-api",
                "version": "1.0",
                "running": sync_status["running"],
                "last_time": sync_status["last_time"],
                "last_result": sync_status["last_result"],
                "last_error": sync_status["last_error"],
            })
        elif path == '/api/auto-date':
            # 自动检测可用日期
            try:
                date_str, count = auto_detect_date()
                if date_str:
                    self._send_json({"ok": True, "date": date_str, "count": count})
                else:
                    self._send_json({"ok": False, "error": "未找到可用日期"})
            except Exception as e:
                self._send_json({"ok": False, "error": str(e)})
        else:
            self._send_json({"error": "not found"}, 404)

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path == '/api/sync':
            if sync_status["running"]:
                self._send_json({"ok": False, "error": "同步正在进行中，请稍后再试"})
                return

            # 解析参数
            content_length = int(self.headers.get('Content-Length', 0))
            body = {}
            if content_length > 0:
                raw = self.rfile.read(content_length)
                try:
                    body = json.loads(raw.decode('utf-8'))
                except Exception:
                    pass

            date_str = body.get('date', '').strip()

            if not date_str:
                # 没有指定日期，自动检测
                try:
                    date_str, _ = auto_detect_date()
                except Exception as e:
                    self._send_json({"ok": False, "error": f"自动检测日期失败: {e}"})
                    return

            if not date_str:
                self._send_json({"ok": False, "error": "未指定日期且无法自动检测"})
                return

            if not (date_str.isdigit() and len(date_str) in (6, 8)):
                self._send_json({"ok": False, "error": f"日期格式不正确: {date_str}，请使用YYYYMM或YYYYMMDD"})
                return

            # 后台执行同步（不阻塞HTTP响应）
            def run_sync():
                sync_status["running"] = True
                sync_status["last_time"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                sync_status["last_error"] = None
                try:
                    result = do_sync(date_str)
                    sync_status["last_result"] = result
                except Exception as e:
                    sync_status["last_result"] = {"ok": False, "error": str(e)}
                    sync_status["last_error"] = str(e)
                    log.error(f"同步异常: {e}", exc_info=True)
                finally:
                    sync_status["running"] = False

            thread = threading.Thread(target=run_sync, daemon=True)
            thread.start()

            self._send_json({"ok": True, "message": f"同步已启动，日期: {date_str}"})
        else:
            self._send_json({"error": "not found"}, 404)


def check_update():
    """启动时自动检查GitHub是否有新版本，如有则自动更新"""
    try:
        github_url = "https://raw.githubusercontent.com/xinglianyue/finance-tool/main/api_server.py"
        resp = requests.get(github_url, timeout=15)
        if resp.status_code != 200:
            return

        remote_code = resp.text
        # 获取当前脚本的MD5
        import hashlib
        local_md5 = hashlib.md5(open(__file__, 'rb').read()).hexdigest()
        remote_md5 = hashlib.md5(remote_code.encode('utf-8')).hexdigest()

        if local_md5 != remote_md5:
            log.info("检测到新版本，正在自动更新...")
            # 备份当前版本
            backup = __file__ + '.bak'
            with open(backup, 'w', encoding='utf-8') as f:
                f.write(open(__file__, 'r', encoding='utf-8').read())
            # 写入新版本（保留config.json读取逻辑）
            with open(__file__, 'w', encoding='utf-8') as f:
                f.write(remote_code)
            log.info("更新完成，新版本将在下次启动时生效")
            return True
        else:
            log.info("已是最新版本")
            return False
    except Exception as e:
        log.warning(f"自动更新检查失败: {e}")
        return False


def main():
    # 启动时检查更新
    check_update()

    log.info("=" * 50)
    log.info("财务工具 API 服务")
    log.info(f"监听地址: {HOST}:{PORT}")
    log.info(f"数据库: {DB_CONFIG['host']}:{DB_CONFIG['port']}/{DB_CONFIG['database']}")
    log.info("=" * 50)
    print()
    print("  服务已启动!")
    print(f"  本地访问: http://localhost:{PORT}")
    print(f"  局域网访问: http://<本机IP>:{PORT}")
    print(f"  按 Ctrl+C 停止")
    print()

    server = HTTPServer((HOST, PORT), SyncHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        log.info("服务已停止")
        server.server_close()


if __name__ == "__main__":
    main()
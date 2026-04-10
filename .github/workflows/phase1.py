# -*- coding: utf-8 -*-
"""Phase 1: 健康度评分 + 4格卡片 → finance-tool-v6/index.html"""
import re

with open(r'C:\Users\surface\WorkBuddy\Claw\finance-tool-v6\index.html', 'r', encoding='utf-8') as f:
    c = f.read()

print('File size before: %d' % len(c))

# ============================================================
# 1. CONFIG: 新增评分配置 + 代补占比行号
# ============================================================
OLD_CONFIG_END = '''  return {
    CITY_TIERS,
    EXCEL_ROWS,
    UE_THRESHOLDS,
    COLORS,
    ERROR_CODES,
  };
})();'''

NEW_CONFIG_END = '''  // 健康度评分配置（城市扣分制）
  const SCORE_CONFIG = {
    BASE:         10,   // 基础分10分
    PROFIT_MIN:  0,    // 毛利<0 扣3分
    UNIT_UE_MIN: 0.3,  // 单均UE<0.3 扣2分
    SUB_MAX:      20,   // 代补占比>20% 扣2分
    MARGIN_MIN:   5,    // 毛利率<5% 扣2分
  };

  // 4维度权重（各25%）
  const SCORE_WEIGHTS = {
    income:  0.25,
    profit:  0.25,
    cost:    0.25,
    city:    0.25,
  };

  // 代补占比: 代补金额(row36) / 收入金额(row32) × 100%
  const SUB_RATIO_ROW = 36;  // 代补金额行（0-based）

  return {
    CITY_TIERS,
    EXCEL_ROWS,
    UE_THRESHOLDS,
    COLORS,
    ERROR_CODES,
    SCORE_CONFIG,
    SCORE_WEIGHTS,
    SUB_RATIO_ROW,
  };
})();'''

if OLD_CONFIG_END in c:
    c = c.replace(OLD_CONFIG_END, NEW_CONFIG_END, 1)
    print('1. CONFIG updated: SCORE_CONFIG + SCORE_WEIGHTS + SUB_RATIO_ROW')
else:
    print('ERROR: CONFIG end not found')
    exit(1)

# ============================================================
# 2. CityEntity: 新增subRatio + calcCityScore()
# ============================================================
OLD_CITY_RETURN = '''    this.unitUE  = Utils.calcUnitUE(this.profit, this.orders);
    this.margin  = Utils.calcMarginRate(this.profit, this.revenue);
    this.valid   = true;
  };

  return { City };
})();'''

NEW_CITY_RETURN = '''    this.unitUE  = Utils.calcUnitUE(this.profit, this.orders);
    this.margin  = Utils.calcMarginRate(this.profit, this.revenue);
    this.valid   = true;

    // 代补占比
    const { SUB_RATIO_ROW } = CONFIG;
    const subRow  = jsonData[SUB_RATIO_ROW];
    const subAmt  = (subRow && Number(subRow[col])) || 0;
    this.subRatio = this.revenue > 0 ? (subAmt / this.revenue) * 100 : 0;

    // 城市健康度评分（扣分制）
    this.cityScore = this.calcCityScore();
  };

  /**
   * 城市健康度评分（扣分制，基础10分）
   * @returns {number} 0-10分
   */
  City.prototype.calcCityScore = function() {
    const { SCORE_CONFIG } = CONFIG;
    let score = SCORE_CONFIG.BASE;
    if (this.profit   < SCORE_CONFIG.PROFIT_MIN)  score -= 3;
    if (this.unitUE   < SCORE_CONFIG.UNIT_UE_MIN) score -= 2;
    if (this.subRatio > SCORE_CONFIG.SUB_MAX)       score -= 2;
    if (this.margin   < SCORE_CONFIG.MARGIN_MIN)   score -= 2;
    return Math.max(1, score); // 最低1分
  };

  return { City };
})();'''

if OLD_CITY_RETURN in c:
    c = c.replace(OLD_CITY_RETURN, NEW_CITY_RETURN, 1)
    print('2. CityEntity updated: subRatio + calcCityScore()')
else:
    print('ERROR: CityEntity return not found')
    exit(1)

# ============================================================
# 3. SummaryCardsWidget: 重写为健康度圆环 + 4格卡片
# ============================================================
OLD_WIDGET = '''SummaryCardsWidget = (function() {

  /**
   * 渲染概览卡片组
   * @param {Array<City>} cities - 已解析的城市数组
   * @returns {string} HTML
   */
  function render(cities) {
    const validCities = cities.filter(c => c.valid);
    if (!validCities.length) return '';

    const totalOrders  = validCities.reduce((s, c) => s + c.orders,  0);
    const totalRevenue = validCities.reduce((s, c) => s + c.revenue, 0);
    const totalCost    = validCities.reduce((s, c) => s + c.cost,    0);
    const totalProfit  = validCities.reduce((s, c) => s + c.profit,  0);
    const avgUE        = Utils.calcUnitUE(totalProfit, totalOrders);
    const avgMargin    = Utils.calcMarginRate(totalProfit, totalRevenue);

    const ueStatus = Utils.getUEStatus(avgUE);
    const ueColor  = ueStatus === 'ok' ? CONFIG.COLORS.SUCCESS
                    : ueStatus === 'warn' ? CONFIG.COLORS.WARNING
                    : CONFIG.COLORS.DANGER;
    const ueLabel  = ueStatus === 'ok' ? '正常' : ueStatus === 'warn' ? '预警' : '危险';

    const cards = [
      { label: '总收入', value: Utils.formatCurrency(totalRevenue), unit: '元', color: CONFIG.COLORS.PRIMARY },
      { label: '总成本', value: Utils.formatCurrency(totalCost),    unit: '元', color: CONFIG.COLORS.DANGER },
      { label: '总毛利', value: Utils.formatCurrency(totalProfit),  unit: '元', color: totalProfit >= 0 ? CONFIG.COLORS.SUCCESS : CONFIG.COLORS.DANGER },
      { label: '单均UE', value: avgUE.toFixed(3),                   unit: '元 / 单', color: ueColor },
      { label: '总订单', value: Utils.formatNumber(totalOrders),     unit: '单', color: CONFIG.COLORS.PRIMARY },
      { label: '毛利率', value: avgMargin.toFixed(1),                unit: '%', color: avgMargin >= 20 ? CONFIG.COLORS.SUCCESS : CONFIG.COLORS.WARNING },
    ];

    let html = '<div class="cards-grid">';
    for (const card of cards) {
      html += '<div class="card">' +
        '<div class="card-label">' + card.label + '</div>' +
        '<div class="card-value neutral" style="color:' + card.color + '">' + card.value + '</div>' +
        '<div class="card-unit">' + card.unit + '</div>' +
      '</div>';
    }
    html += '</div>';
    return html;
  }

  return { render };
})();'''

NEW_WIDGET = '''SummaryCardsWidget = (function() {

  /**
   * 获取健康度颜色
   * @param {number} score 0-100
   * @returns {string} CSS color
   */
  function getHealthColor(score) {
    if (score >= 90) return CONFIG.COLORS.SUCCESS; // 绿
    if (score >= 80) return '#f59e0b';             // 黄
    if (score >= 60) return '#f97316';             // 橙
    return CONFIG.COLORS.DANGER;                    // 红
  }

  /**
   * 生成SVG圆环进度条
   * @param {number} score 0-100
   * @returns {string} SVG HTML
   */
  function renderCircle(score) {
    const color  = getHealthColor(score);
    const radius = 34;
    const circ   = 2 * Math.PI * radius;          // 周长 ≈ 213.6
    const filled = (score / 100) * circ;
    const label  = Math.round(score);

    return '<svg width="88" height="88" viewBox="0 0 88 88" style="display:block;margin:0 auto;">' +
      '<circle cx="44" cy="44" r="' + radius + '" fill="none" stroke="#e2e8f0" stroke-width="7"/>' +
      '<circle cx="44" cy="44" r="' + radius + '" fill="none" stroke="' + color + '" stroke-width="7"' +
        ' stroke-dasharray="' + filled.toFixed(2) + ' ' + circ.toFixed(2) + '"' +
        ' stroke-linecap="round"' +
        ' transform="rotate(-90 44 44)"/>' +
      '<text x="44" y="40" text-anchor="middle" font-size="18" font-weight="700" fill="' + color + '">' + label + '</text>' +
      '<text x="44" y="54" text-anchor="middle" font-size="10" fill="#94a3b8">分</text>' +
    '</svg>';
  }

  /**
   * 渲染概览区：健康度圆环 + 4格指标卡片
   * @param {Array<City>} cities
   * @param {object} totals - {totalRevenue, totalCost, totalProfit, totalOrders, avgMargin, avgUE, overallScore}
   * @returns {string} HTML
   */
  function render(cities, totals) {
    const validCities = cities.filter(function(c){return c.valid;});
    if (!validCities.length) return '';

    var score    = totals.overallScore || 0;
    var color    = getHealthColor(score);
    var cityNum  = validCities.length;

    var ueStatus = Utils.getUEStatus(totals.avgUE);
    var ueColor  = ueStatus === 'ok' ? CONFIG.COLORS.SUCCESS
                  : ueStatus === 'warn' ? CONFIG.COLORS.WARNING
                  : CONFIG.COLORS.DANGER;

    var cards = [
      { label: '总收入',   value: Utils.formatCurrency(totals.totalRevenue), unit: '元', color: CONFIG.COLORS.PRIMARY },
      { label: '总成本',   value: Utils.formatCurrency(totals.totalCost),    unit: '元', color: CONFIG.COLORS.DANGER   },
      { label: '总毛利',   value: Utils.formatCurrency(totals.totalProfit),  unit: '元', color: totals.totalProfit >= 0 ? CONFIG.COLORS.SUCCESS : CONFIG.COLORS.DANGER },
      { label: '单均UE',   value: totals.avgUE.toFixed(3),                 unit: '元/单', color: ueColor },
      { label: '毛利率',   value: totals.avgMargin.toFixed(1),              unit: '%',     color: totals.avgMargin >= 20 ? CONFIG.COLORS.SUCCESS : CONFIG.COLORS.WARNING },
    ];

    var html = '';

    // 顶部：健康度圆环 + 城市数
    html += '<div class="health-header">';
    html += '<div class="health-circle-wrap">';
    html += renderCircle(score);
    html += '<div class="health-label">健康度</div>';
    html += '</div>';
    html += '<div class="health-info">';
    html += '<div class="health-city-num">' + cityNum + '</div>';
    html += '<div class="health-city-unit">个城市</div>';
    html += '<div class="health-score-desc" style="color:' + color + '">' + (score >= 90 ? '优秀' : score >= 80 ? '良好' : score >= 60 ? '一般' : '较差') + '</div>';
    html += '</div>';
    html += '</div>';

    // 4格卡片（去掉总订单，保留5个核心指标）
    html += '<div class="cards-grid">';
    for (var i = 0; i < cards.length; i++) {
      var card = cards[i];
      html += '<div class="card">';
      html += '<div class="card-label">' + card.label + '</div>';
      html += '<div class="card-value" style="color:' + card.color + '">' + card.value + '</div>';
      html += '<div class="card-unit">' + card.unit + '</div>';
      html += '</div>';
    }
    html += '</div>';

    return html;
  }

  return { render };
})();'''

if OLD_WIDGET in c:
    c = c.replace(OLD_WIDGET, NEW_WIDGET, 1)
    print('3. SummaryCardsWidget rewritten: circle + 5 cards')
else:
    print('ERROR: OLD_WIDGET not found')
    print('Searching...')
    idx = c.find('SummaryCardsWidget = (function')
    print('Found at:', idx)
    exit(1)

# ============================================================
# 4. CSS: 新增健康度相关样式
# ============================================================
OLD_CSS_END = '/* ============ RESPONSIVE ============ */'

NEW_CSS = '''/* ============ HEALTH SCORE ============ */
.health-header {
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 2px 8px rgba(0,0,0,.06);
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 14px;
}
.health-circle-wrap {
  flex-shrink: 0;
  text-align: center;
}
.health-label {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 4px;
}
.health-info {
  flex: 1;
}
.health-city-num {
  font-size: 38px;
  font-weight: 700;
  color: #1e293b;
  line-height: 1;
}
.health-city-unit {
  font-size: 13px;
  color: #64748b;
  margin-top: 2px;
}
.health-score-desc {
  font-size: 15px;
  font-weight: 700;
  margin-top: 8px;
}

/* 4格卡片（5个指标） */
.cards-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
  margin-bottom: 16px;
}
@media (max-width: 600px) {
  .cards-grid { grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .card { padding: 10px; }
  .card-value { font-size: 16px; }
  .health-city-num { font-size: 30px; }
}
@media (max-width: 400px) {
  .cards-grid { grid-template-columns: repeat(2, 1fr); }
}

/* ============ RESPONSIVE ============ */'''

if OLD_CSS_END in c:
    c = c.replace(OLD_CSS_END, NEW_CSS, 1)
    print('4. CSS updated: health score styles + responsive')
else:
    print('ERROR: CSS end marker not found')
    exit(1)

# ============================================================
# 5. App: calculateOverallHealth() + 修改renderSuccess
# ============================================================
OLD_PARSE_CITIES = '''      // 解析城市
      const cities = parseCitiesFromSheet(jsonData);'''

NEW_PARSE_CITIES = '''      // 解析城市
      const cities = parseCitiesFromSheet(jsonData);

      // 计算健康度
      const overallScore = calculateOverallHealth(cities);
      Store.overallScore = overallScore;'''

if OLD_PARSE_CITIES in c:
    c = c.replace(OLD_PARSE_CITIES, NEW_PARSE_CITIES, 1)
    print('5a. App: overallScore calculation added')
else:
    print('ERROR: parseCities call not found')
    exit(1)

# Add calculateOverallHealth function before renderSuccess
OLD_RENDER_SUCCESS = '  function renderSuccess() {'

NEW_CALC_OVERALL = '''  /**
   * 计算整体健康度（4维度加权平均）
   * @param {Array<City>} cities
   * @returns {number} 0-100
   */
  function calculateOverallHealth(cities) {
    const valid = cities.filter(function(c){return c.valid;});
    if (!valid.length) return 0;

    const { SCORE_WEIGHTS } = CONFIG;

    // 收入健康度: 收入>0为100，否则0
    var incomeOk = valid.filter(function(c){return c.revenue > 0;}).length;
    var incomeScore = (incomeOk / valid.length) * 100;

    // 毛利健康度: 平均毛利>=20%为100，<0为0
    var avgMargin = valid.reduce(function(s,c){return s+c.margin;}, 0) / valid.length;
    var profitScore = Math.min(100, Math.max(0, (avgMargin / 20) * 100));

    // 成本健康度: 平均代补占比<=10%为100，>30%为0
    var avgSub = valid.reduce(function(s,c){return s+c.subRatio;}, 0) / valid.length;
    var costScore = Math.min(100, Math.max(0, (1 - (avgSub - 10) / 20) * 100));

    // 城市健康度: 平均城市评分/10*100
    var avgCityScore = valid.reduce(function(s,c){return s+c.cityScore;}, 0) / valid.length;
    var cityScore = (avgCityScore / 10) * 100;

    // 加权求和
    var overall =
      incomeScore  * SCORE_WEIGHTS.income +
      profitScore  * SCORE_WEIGHTS.profit +
      costScore    * SCORE_WEIGHTS.cost   +
      cityScore    * SCORE_WEIGHTS.city;

    return Math.max(0, Math.min(100, overall));
  }

'''

if OLD_RENDER_SUCCESS in c:
    c = c.replace(OLD_RENDER_SUCCESS, NEW_CALC_OVERALL + OLD_RENDER_SUCCESS, 1)
    print('5b. calculateOverallHealth() function added')
else:
    print('ERROR: renderSuccess not found')
    exit(1)

# Update renderSuccess to pass totals object
OLD_RENDER_SUCCESS2 = '    _dynamicEl.innerHTML = cardsHtml + tableHtml;'
NEW_RENDER_SUCCESS2 = '''    var totals = Store.cities.length
      ? {
          totalRevenue: Store.totals.revenue,
          totalCost:    Store.totals.cost,
          totalProfit:  Store.totals.profit,
          totalOrders:  Store.totals.orders,
          avgUE:        Store.totals.avgUE,
          avgMargin:    Store.totals.avgMargin,
          overallScore: Store.overallScore || 0,
        }
      : { totalRevenue:0,totalCost:0,totalProfit:0,totalOrders:0,avgUE:0,avgMargin:0,overallScore:0 };

    var cardsHtml = SummaryCardsWidget.render(Store.cities, totals);
    _dynamicEl.innerHTML = cardsHtml + tableHtml;'''

if OLD_RENDER_SUCCESS2 in c:
    c = c.replace(OLD_RENDER_SUCCESS2, NEW_RENDER_SUCCESS2, 1)
    print('5c. renderSuccess: totals object passed to widget')
else:
    print('ERROR: renderSuccess innerHTML not found')
    exit(1)

# Add Store.totals and Store.overallScore init
OLD_STORE = '    cities:     [],   // City[]'
NEW_STORE = '''    cities:       [],   // City[]
    totals:     null, // {revenue, cost, profit, orders, avgUE, avgMargin}
    overallScore: 0,'''

if OLD_STORE in c:
    c = c.replace(OLD_STORE, NEW_STORE, 1)
    print('5d. Store: totals + overallScore fields added')
else:
    print('ERROR: Store init not found')
    exit(1)

# Add totals calculation after cities parsed
OLD_CITIES_PUSH = '      if (city.valid) { cities.push(city); }'
NEW_CITIES_PUSH = '''      if (city.valid) {
          cities.push(city);
          // 累计总量
          Store.totals.revenue  = (Store.totals.revenue  || 0) + city.revenue;
          Store.totals.cost     = (Store.totals.cost     || 0) + city.cost;
          Store.totals.profit   = (Store.totals.profit   || 0) + city.profit;
          Store.totals.orders   = (Store.totals.orders   || 0) + city.orders;
        }'''

if OLD_CITIES_PUSH in c:
    c = c.replace(OLD_CITIES_PUSH, NEW_CITIES_PUSH, 1)
    print('5e. Totals accumulation added')
else:
    print('ERROR: cities.push not found')
    exit(1)

# After parsing loop, calculate derived totals
OLD_AFTER_PARSE = '''      return cities;
  }

  // --- 文件处理流程 ---'''

NEW_AFTER_PARSE = '''      // 计算衍生指标
      if (Store.totals.orders > 0) {
        Store.totals.avgUE    = Store.totals.profit / Store.totals.orders;
      }
      if (Store.totals.revenue > 0) {
        Store.totals.avgMargin = (Store.totals.profit / Store.totals.revenue) * 100;
      }

      return cities;
  }

  // --- 文件处理流程 ---'''

if OLD_AFTER_PARSE in c:
    c = c.replace(OLD_AFTER_PARSE, NEW_AFTER_PARSE, 1)
    print('5f. avgUE + avgMargin calculated after parse')
else:
    print('ERROR: after parse section not found')
    exit(1)

# ============================================================
# 验证: 括号匹配
# ============================================================
script_start = c.find('<script>')
script_end   = c.find('</script>', script_start)
js = c[script_start+8:script_end]
br = {'(':0,')':0,'{':0,'}':0}
for ch in js:
    if ch in br: br[ch]+=1

print('')
print('Bracket check:')
print('  (): %d / %d %s' % (br['('], br[')'], 'OK' if br['(']==br[')'] else 'MISMATCH'))
print('  {: %d / %d %s' % (br['{'], br['}'], 'OK' if br['{']==br['}'] else 'MISMATCH'))
print('File size after: %d' % len(c))

with open(r'C:\Users\surface\WorkBuddy\Claw\finance-tool-v6\index.html', 'w', encoding='utf-8') as f:
    f.write(c)

print('')
print('DONE')

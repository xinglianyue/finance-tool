# -*- coding: utf-8 -*-
import re

path = r'C:\Users\surface\WorkBuddy\Claw\01-财务工具\finance-tool-v6\index.html'
with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

print('File size: %d' % len(c))

# ================================================================
# 1. CONFIG: add SCORE_CONFIG, SCORE_WEIGHTS, SUB_RATIO_ROW
# ================================================================
old_config_end = '''  return {
    CITY_TIERS,
    EXCEL_ROWS,
    UE_THRESHOLDS,
    COLORS,
    ERROR_CODES,
  };
})();'''

new_config_end = '''  // 健康度评分配置（城市扣分制）
  var SCORE_CONFIG = {
    BASE: 10,
    PROFIT_MIN:   0,   // 毛利<0 扣3分
    UNIT_UE_MIN:  0.3, // 单均UE<0.3 扣2分
    SUB_MAX:      20,  // 代补占比>20% 扣2分
    MARGIN_MIN:   5,   // 毛利率<5% 扣2分
  };

  // 4维度权重
  var SCORE_WEIGHTS = {
    income: 0.25,
    profit: 0.25,
    cost:   0.25,
    city:   0.25,
  };

  // 代补占比: row36 / row32 * 100%
  var SUB_RATIO_ROW = 36;

  return {
    CITY_TIERS:    CITY_TIERS,
    EXCEL_ROWS:    EXCEL_ROWS,
    UE_THRESHOLDS: UE_THRESHOLDS,
    COLORS:        COLORS,
    ERROR_CODES:    ERROR_CODES,
    SCORE_CONFIG:  SCORE_CONFIG,
    SCORE_WEIGHTS:  SCORE_WEIGHTS,
    SUB_RATIO_ROW: SUB_RATIO_ROW,
  };
})();'''

if old_config_end in c:
    c = c.replace(old_config_end, new_config_end, 1)
    print('1. CONFIG updated')
else:
    print('WARNING: CONFIG end not found')
    # Try without trailing whitespace
    idx = c.find('  return {')
    print('  return found at:', idx)

# ================================================================
# 2. CityEntity: add subRatio + calcCityScore
# ================================================================
old_city_after_fill = '''    this.unitUE  = Utils.calcUnitUE(this.profit, this.orders);
    this.margin  = Utils.calcMarginRate(this.profit, this.revenue);
    this.valid   = true;
  };

  return { City };
})();'''

new_city_after_fill = '''    this.unitUE  = Utils.calcUnitUE(this.profit, this.orders);
    this.margin  = Utils.calcMarginRate(this.profit, this.revenue);
    this.valid   = true;

    // 代补占比
    var subRow = jsonData[CONFIG.SUB_RATIO_ROW];
    var subAmt = (subRow && Number(subRow[col])) || 0;
    this.subRatio = this.revenue > 0 ? (subAmt / this.revenue) * 100 : 0;

    // 城市健康度评分
    this.cityScore = this.calcCityScore();
  };

  City.prototype.calcCityScore = function() {
    var s = CONFIG.SCORE_CONFIG.BASE;
    if (this.profit   < CONFIG.SCORE_CONFIG.PROFIT_MIN)   s -= 3;
    if (this.unitUE   < CONFIG.SCORE_CONFIG.UNIT_UE_MIN)  s -= 2;
    if (this.subRatio > CONFIG.SCORE_CONFIG.SUB_MAX)       s -= 2;
    if (this.margin   < CONFIG.SCORE_CONFIG.MARGIN_MIN)   s -= 2;
    return Math.max(1, s);
  };

  return { City };
})();'''

if old_city_after_fill in c:
    c = c.replace(old_city_after_fill, new_city_after_fill, 1)
    print('2. CityEntity updated: subRatio + calcCityScore')
else:
    print('WARNING: CityEntity end not found')

# ================================================================
# 3. Store: add totals + overallScore
# ================================================================
old_store = '    cities:     [],   // City[]'
new_store = '''    cities:       [],   // City[]
    totals:     {revenue:0, cost:0, profit:0, orders:0, avgUE:0, avgMargin:0},
    overallScore: 0,'''

if old_store in c:
    c = c.replace(old_store, new_store, 1)
    print('3. Store updated')
else:
    print('WARNING: Store init not found')

# ================================================================
# 4. parseCitiesFromSheet: accumulate totals
# ================================================================
old_parse_push = '        if (city.valid) {\n          cities.push(city);\n        }'
new_parse_push = '''        if (city.valid) {
          cities.push(city);
          Store.totals.revenue += city.revenue;
          Store.totals.cost    += city.cost;
          Store.totals.profit  += city.profit;
          Store.totals.orders  += city.orders;
        }'''

if old_parse_push in c:
    c = c.replace(old_parse_push, new_parse_push, 1)
    print('4. parseCitiesFromSheet: totals accumulation')
else:
    print('WARNING: parse push not found')
    # Try simpler version
    old2 = 'if (city.valid) {\n          cities.push(city);'
    if old2 in c:
        c = c.replace(old2, new_parse_push, 1)
        print('4. parseCitiesFromSheet: totals accumulation (alt)')
    else:
        print('  cannot find push block')

# Add avgUE + avgMargin after parse
old_after_return = '      return cities;\n  }\n\n  // --- 文件处理流程 ---'
new_after_return = '''      if (Store.totals.orders > 0) {
        Store.totals.avgUE = Store.totals.profit / Store.totals.orders;
      }
      if (Store.totals.revenue > 0) {
        Store.totals.avgMargin = (Store.totals.profit / Store.totals.revenue) * 100;
      }

      return cities;
  }

  // --- 文件处理流程 ---'''

if old_after_return in c:
    c = c.replace(old_after_return, new_after_return, 1)
    print('4b. avgUE + avgMargin calculated')
else:
    print('WARNING: after parse not found')

# ================================================================
# 5. Add calculateOverallHealth after parseCities
# ================================================================
old_after_calc = '      var cities = parseCitiesFromSheet(jsonData);'
new_after_calc = '''      var cities = parseCitiesFromSheet(jsonData);

      // 计算整体健康度
      Store.overallScore = calculateOverallHealth(cities);'''

if old_after_calc in c:
    c = c.replace(old_after_calc, new_after_calc, 1)
    print('5. calculateOverallHealth call added')
else:
    print('WARNING: parseCities call not found')

# Add function before renderSuccess
old_render_success = '  function renderSuccess() {'
new_calc_fn = '''  function calculateOverallHealth(cities) {
    var valid = cities.filter(function(c){return c.valid;});
    if (!valid.length) return 0;

    var w = CONFIG.SCORE_WEIGHTS;

    // 收入健康度
    var incomeOk = valid.filter(function(c){return c.revenue > 0;}).length;
    var incomeScore = (incomeOk / valid.length) * 100;

    // 毛利健康度
    var avgMargin = valid.reduce(function(s,c){return s+c.margin;}, 0) / valid.length;
    var profitScore = Math.min(100, Math.max(0, (avgMargin / 20) * 100));

    // 成本健康度
    var avgSub = valid.reduce(function(s,c){return s+c.subRatio;}, 0) / valid.length;
    var costScore = Math.min(100, Math.max(0, (1 - (avgSub - 10) / 20) * 100));

    // 城市健康度
    var avgCityScore = valid.reduce(function(s,c){return s+c.cityScore;}, 0) / valid.length;
    var cityScore = (avgCityScore / 10) * 100;

    var overall = incomeScore * w.income + profitScore * w.profit +
                  costScore   * w.cost   + cityScore   * w.city;

    return Math.max(0, Math.min(100, overall));
  }

  function renderSuccess() {'''

if old_render_success in c:
    c = c.replace(old_render_success, new_calc_fn, 1)
    print('5b. calculateOverallHealth function added')
else:
    print('WARNING: renderSuccess not found')

# ================================================================
# 6. Update renderSuccess to pass totals
# ================================================================
old_inner = "    _dynamicEl.innerHTML = cardsHtml + tableHtml;"
new_inner = '''    var totals = Store.cities.length ? Store.totals : {revenue:0,cost:0,profit:0,orders:0,avgUE:0,avgMargin:0};
    totals.overallScore = Store.overallScore || 0;
    var cardsHtml = SummaryCardsWidget.render(Store.cities, totals);
    _dynamicEl.innerHTML = cardsHtml + tableHtml;'''

if old_inner in c:
    c = c.replace(old_inner, new_inner, 1)
    print('6. renderSuccess: totals passed to widget')
else:
    print('WARNING: renderSuccess innerHTML not found')

# ================================================================
# 7. Rewrite SummaryCardsWidget
# ================================================================
sw = "SummaryCardsWidget = (function() {"
ew = "CityTableWidget = (function() {"
swi = c.find(sw)
ewi = c.find(ew)
if swi >= 0 and ewi > swi:
    new_w = r'''SummaryCardsWidget = (function() {

  function getHealthColor(score) {
    if (score >= 90) return CONFIG.COLORS.SUCCESS;
    if (score >= 80) return '#f59e0b';
    if (score >= 60) return '#f97316';
    return CONFIG.COLORS.DANGER;
  }

  function renderCircle(score) {
    var color  = getHealthColor(score);
    var r = 34, circ = 2 * Math.PI * r;
    var filled = (score / 100) * circ;
    return '<svg width="88" height="88" viewBox="0 0 88 88" style="display:block;margin:0 auto;">' +
      '<circle cx="44" cy="44" r="' + r + '" fill="none" stroke="#e2e8f0" stroke-width="7"/>' +
      '<circle cx="44" cy="44" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="7"' +
        ' stroke-dasharray="' + filled.toFixed(2) + ' ' + circ.toFixed(2) + '"' +
        ' stroke-linecap="round" transform="rotate(-90 44 44)"/>' +
      '<text x="44" y="40" text-anchor="middle" font-size="18" font-weight="700" fill="' + color + '">' + Math.round(score) + '</text>' +
      '<text x="44" y="54" text-anchor="middle" font-size="10" fill="#94a3b8">分</text>' +
    '</svg>';
  }

  function render(cities, totals) {
    var valid = cities.filter(function(c){return c.valid;});
    if (!valid.length) return '';

    var score    = totals.overallScore || 0;
    var color    = getHealthColor(score);
    var cityNum  = valid.length;
    var ueStatus = Utils.getUEStatus(totals.avgUE);
    var ueColor  = ueStatus === 'ok' ? CONFIG.COLORS.SUCCESS
                  : ueStatus === 'warn' ? CONFIG.COLORS.WARNING
                  : CONFIG.COLORS.DANGER;
    var label = score >= 90 ? '优秀' : score >= 80 ? '良好' : score >= 60 ? '一般' : '较差';

    var cards = [
      { label: '总收入', value: Utils.formatCurrency(totals.totalRevenue), unit: '元',   color: CONFIG.COLORS.PRIMARY },
      { label: '总成本', value: Utils.formatCurrency(totals.totalCost),    unit: '元',   color: CONFIG.COLORS.DANGER    },
      { label: '总毛利', value: Utils.formatCurrency(totals.totalProfit), unit: '元',   color: totals.totalProfit >= 0 ? CONFIG.COLORS.SUCCESS : CONFIG.COLORS.DANGER },
      { label: '单均UE', value: totals.avgUE.toFixed(3),               unit: '元/单', color: ueColor },
      { label: '毛利率', value: totals.avgMargin.toFixed(1),           unit: '%',    color: totals.avgMargin >= 20 ? CONFIG.COLORS.SUCCESS : CONFIG.COLORS.WARNING },
    ];

    var html = '';

    // 健康度头部
    html += '<div class="health-header">';
    html += '<div class="health-circle-wrap">';
    html += renderCircle(score);
    html += '<div class="health-label">健康度</div></div>';
    html += '<div class="health-info">';
    html += '<div class="health-city-num">' + cityNum + '</div>';
    html += '<div class="health-city-unit">个城市</div>';
    html += '<div class="health-score-desc" style="color:' + color + '">' + label + '</div></div></div>';

    // 4格卡片
    html += '<div class="cards-grid">';
    for (var i = 0; i < cards.length; i++) {
      var card = cards[i];
      html += '<div class="card">';
      html += '<div class="card-label">' + card.label + '</div>';
      html += '<div class="card-value" style="color:' + card.color + '">' + card.value + '</div>';
      html += '<div class="card-unit">' + card.unit + '</div></div>';
    }
    html += '</div>';

    return html;
  }

  return { render: render };
})();

'''
    c = c[:swi] + new_w + c[ewi:]
    print('7. SummaryCardsWidget rewritten')
else:
    print('WARNING: widget markers not found')

# ================================================================
# 8. CSS: add health score styles
# ================================================================
old_css_end = '/* ============ RESPONSIVE ============ */\n@media (max-width: 480px) {'

new_css = '''/* ============ HEALTH SCORE ============ */
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
.health-circle-wrap { flex-shrink: 0; text-align: center; }
.health-label { font-size: 11px; color: #94a3b8; margin-top: 4px; }
.health-info { flex: 1; }
.health-city-num { font-size: 38px; font-weight: 700; color: #1e293b; line-height: 1; }
.health-city-unit { font-size: 13px; color: #64748b; margin-top: 2px; }
.health-score-desc { font-size: 15px; font-weight: 700; margin-top: 8px; }

/* 5格卡片 */
.cards-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
  margin-bottom: 16px;
}

/* ============ RESPONSIVE ============ */
@media (max-width: 600px) {
  .cards-grid { grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .card { padding: 10px; }
  .card-value { font-size: 16px; }
  .health-city-num { font-size: 30px; }
}
@media (max-width: 400px) {
  .cards-grid { grid-template-columns: repeat(2, 1fr); }
}
'''

if old_css_end in c:
    c = c.replace(old_css_end, new_css, 1)
    print('8. CSS: health styles added')
else:
    print('WARNING: CSS end marker not found')

# ================================================================
# Verify brackets
# ================================================================
ss = c.find('<script>')
se = c.find('</script>', ss)
js = c[ss+8:se]
br = {'(':0,')':0,'{':0,'}':0}
for ch in js:
    if ch in br: br[ch]+=1

print('')
print('Brackets: ( %d/%d %s  { %d/%d %s' % (
    br['('], br[')'], 'OK' if br['(']==br[')'] else 'MISMATCH',
    br['{'], br['}'], 'OK' if br['{']==br['}'] else 'MISMATCH'))
print('File size after: %d' % len(c))

# Check key features
for kw in ['SCORE_CONFIG', 'calculateOverallHealth', 'health-header', 'renderCircle', 'getHealthColor']:
    found = kw in c
    print('  %s: %s' % (kw, 'OK' if found else 'MISSING'))

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)
print('')
print('SAVED')

# -*- coding: utf-8 -*-
"""Phase 1 (all batches): 健康度评分 + 异常预警区"""
import os

path = r'C:\Users\surface\WorkBuddy\Claw\01-财务工具\finance-tool-v6\index.html'
with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

print('File size: %d' % len(c))

changes = []

# ================================================================
# [1] CONFIG: add score config
# ================================================================
old_cfg = '''  return {
    CITY_TIERS:    CITY_TIERS,
    EXCEL_ROWS:    EXCEL_ROWS,
    UE_THRESHOLDS: UE_THRESHOLDS,
    COLORS:        COLORS,
    ERROR_CODES:    ERROR_CODES,
  };
})();'''
new_cfg = '''  var SCORE_CONFIG = {
    BASE: 10, PROFIT_MIN: 0, UNIT_UE_MIN: 0.3, SUB_MAX: 20, MARGIN_MIN: 5,
  };
  var SCORE_WEIGHTS = { income: 0.25, profit: 0.25, cost: 0.25, city: 0.25 };
  var SUB_RATIO_ROW = 36;

  return {
    CITY_TIERS:    CITY_TIERS,
    EXCEL_ROWS:    EXCEL_ROWS,
    UE_THRESHOLDS: UE_THRESHOLDS,
    COLORS:        COLORS,
    ERROR_CODES:    ERROR_CODES,
    SCORE_CONFIG:  SCORE_CONFIG,
    SCORE_WEIGHTS: SCORE_WEIGHTS,
    SUB_RATIO_ROW: SUB_RATIO_ROW,
  };
})();'''
if old_cfg in c:
    c = c.replace(old_cfg, new_cfg, 1)
    changes.append('CONFIG: SCORE_CONFIG+WEIGHTS+SUB_RATIO_ROW')
else:
    print('WARNING: CONFIG end not found')

# ================================================================
# [2] CityEntity: add subRatio + calcCityScore
# ================================================================
old_city = '''    this.valid   = true;
  };

  return { City };
})();'''
new_city = '''    this.valid   = true;

    var subRow = jsonData[CONFIG.SUB_RATIO_ROW];
    var subAmt = (subRow && Number(subRow[col])) || 0;
    this.subRatio = this.revenue > 0 ? (subAmt / this.revenue) * 100 : 0;
    this.cityScore = this.calcCityScore();
  };

  City.prototype.calcCityScore = function() {
    var s = CONFIG.SCORE_CONFIG.BASE;
    if (this.profit   < CONFIG.SCORE_CONFIG.PROFIT_MIN)  s -= 3;
    if (this.unitUE   < CONFIG.SCORE_CONFIG.UNIT_UE_MIN) s -= 2;
    if (this.subRatio > CONFIG.SCORE_CONFIG.SUB_MAX)      s -= 2;
    if (this.margin   < CONFIG.SCORE_CONFIG.MARGIN_MIN)  s -= 2;
    return Math.max(1, s);
  };

  return { City };
})();'''
if old_city in c:
    c = c.replace(old_city, new_city, 1)
    changes.append('CityEntity: subRatio+calcCityScore')
else:
    print('WARNING: CityEntity end not found')

# ================================================================
# [3] Store: add totals + overallScore
# ================================================================
old_store = '    cities:     [],   // City[]'
new_store = '''    cities:        [],   // City[]
    totals:      {revenue:0, cost:0, profit:0, orders:0, avgUE:0, avgMargin:0},
    overallScore: 0,'''
if old_store in c:
    c = c.replace(old_store, new_store, 1)
    changes.append('Store: totals+overallScore')
else:
    print('WARNING: Store not found')

# ================================================================
# [4] parseCitiesFromSheet: accumulate totals
# ================================================================
old_push = '        if (city.valid) { cities.push(city); }'
new_push = '''        if (city.valid) {
          cities.push(city);
          Store.totals.revenue += city.revenue;
          Store.totals.cost    += city.cost;
          Store.totals.profit  += city.profit;
          Store.totals.orders  += city.orders;
        }'''
if old_push in c:
    c = c.replace(old_push, new_push, 1)
    changes.append('parseCities: totals accumulation')
else:
    print('WARNING: parse push not found')

# ================================================================
# [5] After parseCities: calc avgUE + avgMargin
# ================================================================
old_after = '      return cities;\n  }\n\n  // --- 文件处理流程 ---'
new_after = '''      if (Store.totals.orders > 0)   Store.totals.avgUE    = Store.totals.profit / Store.totals.orders;
      if (Store.totals.revenue > 0) Store.totals.avgMargin = (Store.totals.profit / Store.totals.revenue) * 100;

      return cities;
  }

  // --- 文件处理流程 ---'''
if old_after in c:
    c = c.replace(old_after, new_after, 1)
    changes.append('parseCities: avgUE+avgMargin')
else:
    print('WARNING: after parse not found')

# ================================================================
# [6] processFile: call calculateOverallHealth
# ================================================================
old_parse = '      Store.cities    = cities;\n      Store.isLoading = false;'
new_parse = '''      Store.cities    = cities;
      Store.overallScore = calculateOverallHealth(cities);
      if (Store.totals.orders > 0)  Store.totals.avgUE    = Store.totals.profit / Store.totals.orders;
      if (Store.totals.revenue > 0) Store.totals.avgMargin = (Store.totals.profit / Store.totals.revenue) * 100;
      Store.isLoading = false;'''
if old_parse in c:
    c = c.replace(old_parse, new_parse, 1)
    changes.append('processFile: overallScore+avgUE+avgMargin')
else:
    print('WARNING: processFile not found')

# ================================================================
# [7] Add calculateOverallHealth + getCities before renderSuccess
# ================================================================
calc_fn = '''  function calculateOverallHealth(cities) {
    var valid = cities.filter(function(c){return c.valid;});
    if (!valid.length) return 0;
    var w = CONFIG.SCORE_WEIGHTS;
    var incomeOk = valid.filter(function(c){return c.revenue > 0;}).length;
    var incomeScore = (incomeOk / valid.length) * 100;
    var avgMargin = valid.reduce(function(s,c){return s+c.margin;}, 0) / valid.length;
    var profitScore = Math.min(100, Math.max(0, (avgMargin / 20) * 100));
    var avgSub = valid.reduce(function(s,c){return s+c.subRatio;}, 0) / valid.length;
    var costScore = Math.min(100, Math.max(0, (1 - (avgSub - 10) / 20) * 100));
    var avgCityScore = valid.reduce(function(s,c){return s+c.cityScore;}, 0) / valid.length;
    var cityScore = (avgCityScore / 10) * 100;
    var overall = incomeScore * w.income + profitScore * w.profit + costScore * w.cost + cityScore * w.city;
    return Math.max(0, Math.min(100, overall));
  }

  function getCities() { return Store.cities; }

  function renderSuccess() {'''

old_render_s = '  function renderSuccess() {'
if old_render_s in c:
    c = c.replace(old_render_s, calc_fn, 1)
    changes.append('App: calculateOverallHealth+getCities')
else:
    print('WARNING: renderSuccess not found')

# ================================================================
# [8] renderSuccess: pass totals to widget + cityTableContent
# ================================================================
old_rs_inner = "    _dynamicEl.innerHTML = cardsHtml + tableHtml;"
new_rs_inner = '''    var totals = Store.cities.length ? Store.totals : {revenue:0,cost:0,profit:0,orders:0,avgUE:0,avgMargin:0};
    totals.overallScore = Store.overallScore || 0;
    var cardsHtml = SummaryCardsWidget.render(Store.cities, totals);
    var elCity = document.getElementById('cityTableContent');
    if (elCity) elCity.innerHTML = CityTableWidget.render(Store.cities, null);
    _dynamicEl.innerHTML = cardsHtml;'''
if old_rs_inner in c:
    c = c.replace(old_rs_inner, new_rs_inner, 1)
    changes.append('renderSuccess: totals+cityTableContent')
else:
    print('WARNING: renderSuccess innerHTML not found')

# ================================================================
# [9] SummaryCardsWidget: rewrite with circle + 5 cards
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
    var color = getHealthColor(score);
    var r = 34, circ = 2 * Math.PI * r;
    var filled = (score / 100) * circ;
    return '<svg width="88" height="88" viewBox="0 0 88 88" style="display:block;margin:0 auto;">' +
      '<circle cx="44" cy="44" r="' + r + '" fill="none" stroke="#e2e8f0" stroke-width="7"/>' +
      '<circle cx="44" cy="44" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="7"' +
        ' stroke-dasharray="' + filled.toFixed(2) + ' ' + circ.toFixed(2) + '"' +
        ' stroke-linecap="round" transform="rotate(-90 44 44)"/>' +
      '<text x="44" y="40" text-anchor="middle" font-size="18" font-weight="700" fill="' + color + '">' + Math.round(score) + '</text>' +
      '<text x="44" y="54" text-anchor="middle" font-size="10" fill="#94a3b8">分</text></svg>';
  }

  function render(cities, totals) {
    var valid = cities.filter(function(c){return c.valid;});
    if (!valid.length) return '';

    var score   = totals.overallScore || 0;
    var color   = getHealthColor(score);
    var cityNum = valid.length;
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
      { label: '毛利率', value: totals.avgMargin.toFixed(1),           unit: '%',     color: totals.avgMargin >= 20 ? CONFIG.COLORS.SUCCESS : CONFIG.COLORS.WARNING },
    ];

    var html = '';
    html += '<div class="health-header">';
    html += '<div class="health-circle-wrap">';
    html += renderCircle(score);
    html += '<div class="health-label">健康度</div></div>';
    html += '<div class="health-info">';
    html += '<div class="health-city-num">' + cityNum + '</div>';
    html += '<div class="health-city-unit">个城市</div>';
    html += '<div class="health-score-desc" style="color:' + color + '">' + label + '</div></div></div>';
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
    changes.append('SummaryCardsWidget: circle+5cards')
else:
    print('WARNING: SummaryCardsWidget not found')

# ================================================================
# [10] CityTableWidget: add alert cards + filter
# ================================================================
sw2 = c.find("CityTableWidget = (function")
ew2 = c.find("/* ========================================\n  6. APP")
if ew2 < 0: ew2 = c.rfind("/* ========================================")

new_citytable = r'''CityTableWidget = (function() {

  function render(cities, alertFilter) {
    var valid = cities.filter(function(c){return c.valid;});
    if (!valid.length) return '';

    // 异常预警区
    var redCities    = valid.filter(function(c){return c.profit < 0 || c.unitUE < 0;});
    var orangeCities = valid.filter(function(c){return c.margin   < 5;});
    var yellowCities = valid.filter(function(c){return c.subRatio  > 20;});

    function alertCard(arr, cls, icon, title) {
      var cnt = arr.length;
      if (cnt === 0) {
        return '<div class="alert-card ' + cls + ' no-alert">' +
          '<span class="alert-icon">' + icon + '</span>' +
          '<span class="alert-title">' + title + '</span>' +
          '<span class="alert-count">0</span>' +
          '<span class="alert-names ok-text">[OK] 暂无</span></div>';
      }
      var names = arr.map(function(x){return x.name;}).join(', ');
      var active = alertFilter === cls ? ' active' : '';
      return '<div class="alert-card ' + cls + active + '" onclick="CityTableWidget.setFilter(\'' + cls + '\')">' +
        '<span class="alert-icon">' + icon + '</span>' +
        '<span class="alert-title">' + title + '</span>' +
        '<span class="alert-count">' + cnt + '</span>' +
        '<span class="alert-names">' + names + '</span></div>';
    }

    var alertHtml = '<div class="alert-wrap"><div class="alert-bar"><div class="alert-bar-scroll">' +
      alertCard(redCities,    'red',    '!', '亏损城市') +
      alertCard(orangeCities, 'orange', '*', '低毛利') +
      alertCard(yellowCities, 'yellow', '+', '高代补') +
      '</div></div></div>';

    // 筛选
    var display = valid;
    if (alertFilter === 'red')    display = redCities;
    if (alertFilter === 'orange') display = orangeCities;
    if (alertFilter === 'yellow') display = yellowCities;

    // 筛选提示
    var filterHint = '';
    if (alertFilter) {
      var lbl = alertFilter === 'red' ? '亏损城市' : alertFilter === 'orange' ? '低毛利' : '高代补';
      filterHint = '<div class="filter-hint">' + lbl + '筛选 ' +
        '<span class="clear-btn" onclick="CityTableWidget.clearFilter()">[清除]</span></div>';
    }

    // 城市表格
    var sorted = display.slice().sort(function(a,b){return b.profit - a.profit;});
    var tableHtml = '<div class="section-title">城市明细';
    if (display.length !== valid.length) tableHtml += ' (' + display.length + '/' + valid.length + ')';
    tableHtml += '</div><div class="city-table"><table>' +
      '<thead><tr><th>城市</th><th>单均UE</th><th>毛利</th><th>毛利率</th><th>代补占比</th></tr></thead><tbody>';

    for (var i = 0; i < sorted.length; i++) {
      var city = sorted[i];
      var ueStatus = Utils.getUEStatus(city.unitUE);
      var ueColor  = ueStatus === 'ok' ? CONFIG.COLORS.SUCCESS
                    : ueStatus === 'warn' ? CONFIG.COLORS.WARNING
                    : CONFIG.COLORS.DANGER;
      var profitColor = city.profit >= 0 ? CONFIG.COLORS.SUCCESS : CONFIG.COLORS.DANGER;
      var marginColor = city.margin >= 5 ? CONFIG.COLORS.SUCCESS : CONFIG.COLORS.WARNING;
      var subColor    = city.subRatio <= 20 ? CONFIG.COLORS.SUCCESS : CONFIG.COLORS.WARNING;
      var ueLabel = ueStatus === 'ok' ? '正常' : ueStatus === 'warn' ? '预警' : '危险';

      tableHtml += '<tr>' +
        '<td><span class="tier-badge tier-' + city.tier.toLowerCase() + '">' + city.tier + '</span> ' + city.name + '</td>' +
        '<td style="color:' + ueColor + '">' + (city.unitUE >= 0 ? '+' : '') + city.unitUE.toFixed(3) + ' <span style="font-size:10px">(' + ueLabel + ')</span></td>' +
        '<td style="color:' + profitColor + '">' + (city.profit >= 0 ? '+' : '') + Utils.formatCurrency(city.profit) + '</td>' +
        '<td style="color:' + marginColor + '">' + city.margin.toFixed(1) + '%</td>' +
        '<td style="color:' + subColor + '">' + city.subRatio.toFixed(1) + '%</td></tr>';
    }
    tableHtml += '</tbody></table></div>';

    return alertHtml + filterHint + tableHtml;
  }

  var _filter = null;

  function setFilter(f) {
    _filter = (_filter === f) ? null : f;
    var el = document.getElementById('cityTableContent');
    if (el) el.innerHTML = render(App.getCities ? App.getCities() : [], _filter);
  }

  function clearFilter() {
    _filter = null;
    var el = document.getElementById('cityTableContent');
    if (el) el.innerHTML = render(App.getCities ? App.getCities() : [], null);
  }

  return { render: render, setFilter: setFilter, clearFilter: clearFilter };
})();

'''
c = c[:sw2] + new_citytable + c[ew2:]
changes.append('CityTableWidget: alertCards+filter')

# ================================================================
# [11] HTML: add cityTableContent div
# ================================================================
old_div = '<div id="dynamicContent"></div>'
new_div = '<div id="dynamicContent"></div>\n  <div id="cityTableContent"></div>'
if old_div in c:
    c = c.replace(old_div, new_div, 1)
    changes.append('HTML: cityTableContent div')
else:
    print('WARNING: dynamicContent not found')

# ================================================================
# [12] CSS: health score + alert cards
# ================================================================
old_css_end = '/* ============ RESPONSIVE ============ */\n@media (max-width: 480px) {'
new_css = '''/* ============ HEALTH SCORE ============ */
.health-header { background: #fff; border-radius: 14px; box-shadow: 0 2px 8px rgba(0,0,0,.06); padding: 20px; display: flex; align-items: center; gap: 20px; margin-bottom: 14px; }
.health-circle-wrap { flex-shrink: 0; text-align: center; }
.health-label { font-size: 11px; color: #94a3b8; margin-top: 4px; }
.health-info { flex: 1; }
.health-city-num { font-size: 38px; font-weight: 700; color: #1e293b; line-height: 1; }
.health-city-unit { font-size: 13px; color: #64748b; margin-top: 2px; }
.health-score-desc { font-size: 15px; font-weight: 700; margin-top: 8px; }
.cards-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 16px; }

/* ============ ALERT CARDS ============ */
.alert-wrap { margin-bottom: 14px; }
.alert-bar { overflow-x: auto; -webkit-overflow-scrolling: touch; }
.alert-bar::-webkit-scrollbar { display: none; }
.alert-bar-scroll { display: flex; gap: 10px; padding-bottom: 4px; min-width: max-content; }
.alert-card { flex-shrink: 0; min-width: 150px; background: #fff; border-radius: 12px; padding: 12px 14px; border: 1.5px solid transparent; cursor: pointer; transition: transform .15s, box-shadow .15s; }
.alert-card:active { transform: scale(.97); }
.alert-card.red    { border-color: #ffccc7; background: #fff1f0; }
.alert-card.orange { border-color: #ffd591; background: #fff7e6; }
.alert-card.yellow { border-color: #ffe58f; background: #fffbe6; }
.alert-card.active { box-shadow: 0 0 0 3px rgba(0,0,0,.12); }
.alert-card.no-alert { opacity: .6; cursor: default; }
.alert-card.no-alert:active { transform: none; }
.alert-icon { font-size: 18px; display: block; margin-bottom: 4px; }
.alert-title { font-size: 11px; color: #888; display: block; margin-bottom: 2px; }
.alert-count { font-size: 24px; font-weight: 700; display: block; line-height: 1.1; }
.alert-card.red    .alert-count { color: #ef4444; }
.alert-card.orange .alert-count { color: #f97316; }
.alert-card.yellow .alert-count { color: #f59e0b; }
.alert-names { font-size: 11px; color: #666; display: block; margin-top: 4px; line-height: 1.4; }
.alert-names.ok-text { color: #10b981; font-weight: 600; }
.clear-btn { color: #ef4444; cursor: pointer; }
.filter-hint { font-size: 12px; color: #888; margin-bottom: 8px; padding: 6px 0; border-bottom: 1px dashed #e2e8f0; }

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
@media (max-width: 480px) {'''

if old_css_end in c:
    c = c.replace(old_css_end, new_css, 1)
    changes.append('CSS: health+alert+responsive')
else:
    print('WARNING: CSS end marker not found')

# ================================================================
# Verify
# ================================================================
ss = c.find('<script>')
se = c.find('</script>', ss)
js = c[ss+8:se]
br = {'(':0,')':0,'{':0,'}':0}
for ch in js:
    if ch in br: br[ch]+=1
print('')
print('Changes made:')
for ch in changes:
    print('  +', ch)
print('')
print('Brackets: ( %d/%d %s  { %d/%d %s' % (
    br['('], br[')'], 'OK' if br['(']==br[')'] else 'MISMATCH',
    br['{'], br['}'], 'OK' if br['{']==br['}'] else 'MISMATCH'))
print('File size: %d' % len(c))

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)
print('SAVED')

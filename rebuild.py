# -*- coding: utf-8 -*-
"""Phase1 Complete Rebuild: App + SummaryCardsWidget"""
import re, os

path = r'C:\Users\surface\WorkBuddy\Claw\01-财务工具\finance-tool-v6\index.html'
with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

print('File size: %d' % len(c))
changes = []

# ================================================================
# [A] Rebuild SummaryCardsWidget: add health-header + 5 cards
# ================================================================
sw = c.find("SummaryCardsWidget = (function")
ew = c.find("CityTableWidget = (function")
print('SummaryCardsWidget: %d to %d' % (sw, ew))

new_sw = r'''SummaryCardsWidget = (function() {

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

    var score    = totals.overallScore || 0;
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

    var html = '<div class="health-header">';
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
c = c[:sw] + new_sw + c[ew:]
changes.append('SummaryCardsWidget rebuilt with health-header+circle+5cards')
print('SummaryCardsWidget rebuilt')

# ================================================================
# [B] Add missing App IIFE before BOOTSTRAP
# ================================================================
boot_pos = c.find("/* ========================================\n  7. BOOTSTRAP")
print('BOOTSTRAP at: %d' % boot_pos)

new_app = '''/* ================================================================
   6. APP - 应用层
   状态管理 + 数据流程 + 渲染协调
================================================================ */
const App = (function() {

  var Store = {
    cities:        [],
    totals:        {revenue:0, cost:0, profit:0, orders:0, avgUE:0, avgMargin:0},
    overallScore:   0,
    rawFile:        null,
    isLoading:      false,
    error:          null,
  };

  var _dynamicEl = null;

  function init() {
    _dynamicEl = document.getElementById('dynamicContent');
    if (!_dynamicEl) { console.error('[App] #dynamicContent not found'); return; }
    FileUploadFeature.init({
      fileInputId:  'fileInput',
      uploadAreaId: 'uploadArea',
      onFileSelect: processFile,
    });
    renderEmpty();
  }

  function renderEmpty() {
    _dynamicEl.innerHTML = '<div class="empty-state">' +
      '<div class="empty-icon">&#128196;</div>' +
      '<div class="empty-title">暂无数据</div>' +
      '<div class="empty-desc">上传美团账单Excel文件，开始分析</div></div>';
  }

  function renderLoading() {
    _dynamicEl.innerHTML = '<div class="loading-wrap"><div class="spinner"></div><div>正在解析账单...</div></div>';
  }

  function renderError(errorCode, detail) {
    var msg = CONFIG.ERROR_CODES[errorCode] || '操作失败';
    _dynamicEl.innerHTML = '<div class="error-box"><strong>&#9888; ' + msg + '</strong>' +
      (detail ? '<br><small>' + detail + '</small>' : '') + '</div>';
    Utils.showToast(msg);
  }

  function calculateOverallHealth(cities) {
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

  function renderSuccess() {
    var totals = Store.cities.length ? Store.totals : {revenue:0,cost:0,profit:0,orders:0,avgUE:0,avgMargin:0};
    totals.overallScore = Store.overallScore || 0;
    var cardsHtml = SummaryCardsWidget.render(Store.cities, totals);
    var elCity = document.getElementById('cityTableContent');
    if (elCity) elCity.innerHTML = CityTableWidget.render(Store.cities, null);
    _dynamicEl.innerHTML = cardsHtml;
  }

  async function processFile(file) {
    Store.rawFile  = file;
    Store.isLoading = true;
    Store.error    = null;
    renderLoading();
    Utils.showToast('正在解析...');
    try {
      var arrayBuffer = await readFileAsArrayBuffer(file);
      var workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
      if (!workbook || !workbook.SheetNames || !workbook.SheetNames.length) { throw new Error('E003'); }
      var sheetName = workbook.SheetNames[0];
      var sheet     = workbook.Sheets[sheetName];
      var jsonData  = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: 0 });
      if (!Array.isArray(jsonData) || jsonData.length < 10) { throw new Error('E004'); }
      var cities = parseCitiesFromSheet(jsonData);
      if (!cities.length) { throw new Error('E004'); }
      Store.cities    = cities;
      Store.overallScore = calculateOverallHealth(cities);
      if (Store.totals.orders > 0)  Store.totals.avgUE    = Store.totals.profit / Store.totals.orders;
      if (Store.totals.revenue > 0) Store.totals.avgMargin = (Store.totals.profit / Store.totals.revenue) * 100;
      Store.isLoading = false;
      renderSuccess();
      Utils.showToast('分析完成!');
    } catch (err) {
      Store.isLoading = false;
      Store.error     = err.message || 'E003';
      console.error('[App] processFile error:', err);
      renderError(Store.error, err.message);
    }
  }

  function readFileAsArrayBuffer(file) {
    return new Promise(function(resolve, reject) {
      try {
        var reader = new FileReader();
        reader.onload = function(e) { resolve(e.target.result); };
        reader.onerror = function() { reject(new Error('E003')); };
        reader.readAsArrayBuffer(file);
      } catch(e) { reject(new Error('E003')); }
    });
  }

  function parseCitiesFromSheet(jsonData) {
    var cities = [];
    if (!Array.isArray(jsonData) || !jsonData[CONFIG.EXCEL_ROWS.CITY_NAME]) return [];
    var cityNameRow = jsonData[CONFIG.EXCEL_ROWS.CITY_NAME];
    for (var col = CONFIG.EXCEL_ROWS.CITY_START_COL; col <= CONFIG.EXCEL_ROWS.CITY_END_COL; col++) {
      var rawName = cityNameRow[col];
      if (!rawName || typeof rawName !== 'string') continue;
      var name = String(rawName).trim();
      if (!name || name === '城市') continue;
      try {
        var city = new CityEntity.City({ name: name, col: col });
        city.fillFromRow(jsonData, col);
        if (city.valid) {
          cities.push(city);
          Store.totals.revenue += city.revenue;
          Store.totals.cost    += city.cost;
          Store.totals.profit  += city.profit;
          Store.totals.orders  += city.orders;
        }
      } catch(e) { console.warn('[App] Failed to parse city:', name, e.message); }
    }
    return cities;
  }

  return { init: init, getCities: getCities };
})();

'''

c = c[:boot_pos] + new_app + c[boot_pos:]
changes.append('App IIFE rebuilt (Store+shApp+init+processFile+parseCities+overallHealth+getCities)')
print('App rebuilt, size now: %d' % len(c))

# ================================================================
# [C] CSS: add health-header + alert cards
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
    changes.append('CSS: health-header+circle+alert-cards+responsive')
    print('CSS updated')
else:
    print('WARNING: CSS end marker not found')

# ================================================================
# [D] HTML: add cityTableContent div
# ================================================================
old_div = '<div id="dynamicContent"></div>'
new_div = '<div id="dynamicContent"></div>\n  <div id="cityTableContent"></div>'
if old_div in c:
    c = c.replace(old_div, new_div, 1)
    changes.append('HTML: cityTableContent div')
    print('cityTableContent div added')
else:
    print('WARNING: dynamicContent not found')

# ================================================================
# [E] CONFIG: ensure SCORE_CONFIG + WEIGHTS exist
# ================================================================
if 'SCORE_CONFIG' not in c:
    # Add to CONFIG return
    old_cfg_return = '''  return {
    CITY_TIERS:    CITY_TIERS,
    EXCEL_ROWS:    EXCEL_ROWS,
    UE_THRESHOLDS: UE_THRESHOLDS,
    COLORS:        COLORS,
    ERROR_CODES:    ERROR_CODES,
  };'''
    new_cfg_return = '''  var SCORE_CONFIG = { BASE: 10, PROFIT_MIN: 0, UNIT_UE_MIN: 0.3, SUB_MAX: 20, MARGIN_MIN: 5 };
  var SCORE_WEIGHTS = { income: 0.25, profit: 0.25, cost: 0.25, city: 0.25 };
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
  };'''
    if old_cfg_return in c:
        c = c.replace(old_cfg_return, new_cfg_return, 1)
        changes.append('CONFIG: SCORE_CONFIG+WEIGHTS+SUB_RATIO_ROW')
        print('CONFIG updated')
    else:
        print('WARNING: CONFIG return not found')
else:
    changes.append('CONFIG: already has SCORE_CONFIG')
    print('CONFIG already has SCORE_CONFIG')

# ================================================================
# [F] CityEntity: ensure subRatio + calcCityScore exist
# ================================================================
if 'cityScore' not in c:
    old_city_end = '''    this.valid   = true;
  };

  return { City };
})();'''
    new_city_end = '''    this.valid   = true;
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
    if old_city_end in c:
        c = c.replace(old_city_end, new_city_end, 1)
        changes.append('CityEntity: subRatio+calcCityScore')
        print('CityEntity updated')
    else:
        print('WARNING: CityEntity end not found')
else:
    changes.append('CityEntity: already has cityScore')
    print('CityEntity already has cityScore')

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
print('=== Changes ===')
for ch in changes:
    print('  +', ch)
print('')
print('Brackets: ( %d/%d %s  { %d/%d %s' % (
    br['('], br[')'], 'OK' if br['(']==br[')'] else 'MISMATCH',
    br['{'], br['}'], 'OK' if br['{']==br['}'] else 'MISMATCH'))
print('File size: %d' % len(c))

import sys
sys.path.insert(0, r'C:\Users\surface\.qclaw\workspace')
from safe_write import safe_write
safe_write(path, c)

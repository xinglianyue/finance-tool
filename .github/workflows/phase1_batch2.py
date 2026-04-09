# -*- coding: utf-8 -*-
"""Phase 1 Batch 2: 异常预警区"""
import re, os

path = r'C:\Users\surface\WorkBuddy\Claw\01-财务工具\finance-tool-v6\index.html'
with open(path, 'r', encoding='utf-8', errors='replace') as f:
    c = f.read()

print('Size before: %d' % len(c))

# ================================================================
# 1. CityTableWidget: add alert + filter
# ================================================================
sw = c.find('CityTableWidget = (function')
ew = c.find('/* ========================================\n  6. APP')
if ew < 0:
    ew = c.rfind('/* ========================================')

widget = c[sw:ew]
render_kw = 'function render(cities)'
rk_pos = widget.find(render_kw)
rk_body = widget.find('{', rk_pos + len(render_kw))

# Old render returns CityTable
ret_pos = widget.rfind('return')
ret_end = ret_pos + len('return { render };})();')

old_render_body = widget[rk_body:ret_end]
old_render_sig = widget[rk_pos:ret_end]

new_render_sig = '''function render(cities, alertFilter) {
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
      return '<div class="alert-card ' + cls + active + '" onclick="CityTableWidget.setFilter(\\'' + cls + '\\')">' +
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
  };

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
'''

new_widget = widget[:rk_pos] + new_render_sig + '\n\n' + widget[ret_end:]

# Check for double IIFE close
if new_widget.endswith('});});'):
    new_widget = new_widget[:-5] + '});'

c = c[:sw] + new_widget + c[ew:]
print('Widget updated')

# ================================================================
# 2. App: expose getCities()
# ================================================================
old_boot = '/* ========================================\n  7. BOOTSTRAP'
boot_pos = c.find(old_boot)
if boot_pos < 0:
    boot_pos = c.rfind('/* ========================================')

get_fn = '''  function getCities() { return Store.cities; }

'''
c = c[:boot_pos] + get_fn + c[boot_pos:]
print('App.getCities added')

# ================================================================
# 3. App: inject cityTableContent div
# ================================================================
old_div = '<div id="dynamicContent"></div>'
new_div = '<div id="dynamicContent"></div>\n  <div id="cityTableContent"></div>'
if old_div in c:
    c = c.replace(old_div, new_div, 1)
    print('cityTableContent div added')
else:
    print('WARNING: dynamicContent div not found')

# ================================================================
# 4. App renderSuccess: update to use cityTableContent
# ================================================================
old_success_inner = "_dynamicEl.innerHTML = cardsHtml + tableHtml;"
if old_success_inner in c:
    new_success_inner = '''var elCity = document.getElementById('cityTableContent');
    if (elCity) elCity.innerHTML = CityTableWidget.render(Store.cities, null);
    _dynamicEl.innerHTML = cardsHtml;'''
    c = c.replace(old_success_inner, new_success_inner, 1)
    print('renderSuccess updated to use cityTableContent')
else:
    print('WARNING: old_success_inner not found')

# ================================================================
# 5. CSS: alert styles
# ================================================================
old_css_end = '/* ============ RESPONSIVE ============ */'
new_css = '''/* ============ ALERT CARDS ============ */
.alert-wrap { margin-bottom: 14px; }
.alert-bar { overflow-x: auto; -webkit-overflow-scrolling: touch; }
.alert-bar::-webkit-scrollbar { display: none; }
.alert-bar-scroll { display: flex; gap: 10px; padding-bottom: 4px; min-width: max-content; }
.alert-card {
  flex-shrink: 0; min-width: 150px; background: #fff;
  border-radius: 12px; padding: 12px 14px;
  border: 1.5px solid transparent; cursor: pointer;
  transition: transform .15s, box-shadow .15s;
}
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

/* ============ RESPONSIVE ============ */'''

if old_css_end in c:
    c = c.replace(old_css_end, new_css, 1)
    print('CSS alert styles added')
else:
    print('WARNING: CSS end marker not found')

# ================================================================
# 6. Verify brackets
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
print('File size: %d' % len(c))

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)
print('SAVED')

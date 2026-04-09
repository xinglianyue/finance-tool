# -*- coding: utf-8 -*-
with open(r'C:\Users\surface\WorkBuddy\Claw\finance-tool-v6\index.html', 'r', encoding='utf-8') as f:
    c = f.read()

# ============================================================
# Replace entire SummaryCardsWidget section
# ============================================================
s = 'SummaryCardsWidget = (function() {'
e = 'CityTableWidget = (function() {'
s_idx = c.find(s)
e_idx = c.find(e)
if s_idx < 0 or e_idx < 0:
    print('ERROR: widget markers not found', s_idx, e_idx)
    exit(1)

new_widget = r'''SummaryCardsWidget = (function() {

  function getHealthColor(score) {
    if (score >= 90) return CONFIG.COLORS.SUCCESS;
    if (score >= 80) return '#f59e0b';
    if (score >= 60) return '#f97316';
    return CONFIG.COLORS.DANGER;
  }

  function renderCircle(score) {
    var color  = getHealthColor(score);
    var radius = 34;
    var circ   = 2 * Math.PI * radius;
    var filled = (score / 100) * circ;
    var label  = Math.round(score);
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

    var cards = [
      { label: '总收入',   value: Utils.formatCurrency(totals.totalRevenue), unit: '元',   color: CONFIG.COLORS.PRIMARY },
      { label: '总成本',   value: Utils.formatCurrency(totals.totalCost),    unit: '元',   color: CONFIG.COLORS.DANGER    },
      { label: '总毛利',   value: Utils.formatCurrency(totals.totalProfit),  unit: '元',   color: totals.totalProfit >= 0 ? CONFIG.COLORS.SUCCESS : CONFIG.COLORS.DANGER },
      { label: '单均UE',   value: totals.avgUE.toFixed(3),                 unit: '元/单', color: ueColor },
      { label: '毛利率',   value: totals.avgMargin.toFixed(1),             unit: '%',     color: totals.avgMargin >= 20 ? CONFIG.COLORS.SUCCESS : CONFIG.COLORS.WARNING },
    ];

    var html = '';

    // 健康度头部
    html += '<div class="health-header">';
    html += '<div class="health-circle-wrap">';
    html += renderCircle(score);
    html += '<div class="health-label">健康度</div>';
    html += '</div>';
    html += '<div class="health-info">';
    html += '<div class="health-city-num">' + cityNum + '</div>';
    html += '<div class="health-city-unit">个城市</div>';
    html += '<div class="health-score-desc" style="color:' + color + '">' +
      (score >= 90 ? '优秀' : score >= 80 ? '良好' : score >= 60 ? '一般' : '较差') + '</div>';
    html += '</div></div>';

    // 4格卡片
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

  return { render: render };
})();

'''

c = c[:s_idx] + new_widget + c[e_idx:]
print('SummaryCardsWidget replaced')

# ============================================================
# Verify brackets
# ============================================================
ss = c.find('<script>')
se = c.find('</script>', ss)
js = c[ss+8:se]
br = {'(':0,')':0,'{':0,'}':0}
for ch in js:
    if ch in br: br[ch]+=1
print('Brackets: ( %d/%d :%s  { %d/%d :%s' % (
    br['('], br[')'], 'OK' if br['(']==br[')'] else 'MISMATCH',
    br['{'], br['}'], 'OK' if br['{']==br['}'] else 'MISMATCH'))
print('File size: %d' % len(c))

with open(r'C:\Users\surface\WorkBuddy\Claw\finance-tool-v6\index.html', 'w', encoding='utf-8') as f:
    f.write(c)
print('Saved')

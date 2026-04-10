# -*- coding: utf-8 -*-
with open(r'C:\Users\surface\WorkBuddy\Claw\finance-tool-v6\index.html', 'r', encoding='utf-8') as f:
    c = f.read()

# Fix 1: Change fillFromRow signature and body
old_fill = '''City.prototype.fillFromRow = function(jsonRow) {
    if (!Array.isArray(jsonRow)) return;
    const { METRICS } = CONFIG.EXCEL_ROWS;

    this.orders  = Number(jsonRow[METRICS.orders])  || 0;
    this.revenue = Number(jsonRow[METRICS.revenue]) || 0;
    this.cost    = Number(jsonRow[METRICS.cost])     || 0;
    this.profit  = Number(jsonRow[METRICS.profit])  || 0;

    if (this.orders === 0) return; // 无订单行跳过

    this.unitUE  = Utils.calcUnitUE(this.profit, this.orders);
    this.margin  = Utils.calcMarginRate(this.profit, this.revenue);
    this.valid   = true;
  };'''

new_fill = '''City.prototype.fillFromRow = function(jsonData, col) {
    // V5逻辑: jsonData[row][col] = 单元格值
    if (!jsonData || !Array.isArray(jsonData)) return;
    const { METRICS } = CONFIG.EXCEL_ROWS;

    const ordersRow  = jsonData[METRICS.orders];
    const revenueRow = jsonData[METRICS.revenue];
    const costRow    = jsonData[METRICS.cost];
    const profitRow = jsonData[METRICS.profit];

    this.orders  = (ordersRow  && Number(ordersRow[col]))  || 0;
    this.revenue = (revenueRow && Number(revenueRow[col])) || 0;
    this.cost    = (costRow    && Number(costRow[col]))    || 0;
    this.profit  = (profitRow  && Number(profitRow[col]))  || 0;

    if (this.orders === 0) return; // 无订单行跳过

    this.unitUE  = Utils.calcUnitUE(this.profit, this.orders);
    this.margin  = Utils.calcMarginRate(this.profit, this.revenue);
    this.valid   = true;
  };'''

if old_fill in c:
    c = c.replace(old_fill, new_fill, 1)
    print('Fix 1: fillFromRow signature + body updated')
else:
    print('ERROR: old_fill not found')
    # Try to find partial match
    idx = c.find('City.prototype.fillFromRow')
    print('Found at:', idx)
    print(repr(c[idx:idx+300]))
    exit(1)

# Fix 2: Change call site
old_call = 'city.fillFromRow(jsonData[col]);'
new_call = 'city.fillFromRow(jsonData, col);'

count = c.count(old_call)
if count == 1:
    c = c.replace(old_call, new_call, 1)
    print('Fix 2: city.fillFromRow call updated (1 occurrence)')
elif count == 0:
    print('ERROR: old_call not found')
    idx = c.find('city.fillFromRow')
    print('Found at:', idx)
    print(repr(c[max(0,idx-50):idx+100]))
    exit(1)
else:
    print('WARNING: found %d occurrences of old_call' % count)

import sys
sys.path.insert(0, r'C:\Users\surface\.qclaw\workspace')
from safe_write import safe_write
safe_write(r'C:\Users\surface\WorkBuddy\Claw\finance-tool-v6\index.html', c)

// kpi.js - ES Module
import { displayName } from './utils';

  /* ===== V16: KPI卡片渲染 ===== */
  function renderKPICards(data) {
    // P1: KPI cards replaced by overview.js renderStatCards - hide this row
    var container = document.getElementById('kpiCardsRow');
    if (container) container.style.display = 'none';
    return;
    var totalRevenue = 0, totalUE = 0, cityCount = data.cities.length;
    var alertCount = 0;
    data.cities.forEach(function(c) {
      var mod = c.modules && c.modules['all'] ? c.modules['all'] : {};
      var rev = (mod.onlineRevenue || 0);
      totalRevenue += rev;
      totalUE += (mod.ue || 0);
      if ((mod.ue || 0) < -5) alertCount++;
    });
    var avgUE = cityCount > 0 ? (totalUE / cityCount) : 0;
    var dateStr = data.date || '';
    // 格式化
    var revStr = totalRevenue >= 10000 ? (totalRevenue / 10000).toFixed(1) + '万' : totalRevenue.toFixed(0);
    var ueStr = avgUE.toFixed(2) + '元';
    var ueTrendClass = avgUE >= 0 ? 'up' : 'down';
    var ueTrendIcon = avgUE >= 0 ? '\u2191' : '\u2193';

    container.innerHTML =
      '<div class="kpi-card kpi-revenue">' +
        '<div class="kpi-card-header"><span class="kpi-card-label">总营业额</span></div>' +
        '<div class="kpi-card-value">' + revStr + '</div>' +
        '<div class="kpi-card-sub">' + cityCount + '个城市</div>' +
      '</div>' +
      '<div class="kpi-card kpi-ue">' +
        '<div class="kpi-card-header"><span class="kpi-card-label">平均UE</span><span class="kpi-card-trend ' + ueTrendClass + '">' + ueTrendIcon + ' ' + Math.abs(avgUE).toFixed(1) + '</span></div>' +
        '<div class="kpi-card-value">' + ueStr + '</div>' +
        '<div class="kpi-card-sub">单均利润</div>' +
      '</div>' +
      '<div class="kpi-card kpi-alert">' +
        '<div class="kpi-card-header"><span class="kpi-card-label">异常城市</span></div>' +
        '<div class="kpi-card-value" style="color:' + (alertCount > 0 ? 'var(--danger)' : 'var(--success)') + '">' + alertCount + '</div>' +
        '<div class="kpi-card-sub">UE < -5元</div>' +
      '</div>' +
      '<div class="kpi-card kpi-date">' +
        '<div class="kpi-card-header"><span class="kpi-card-label">数据日期</span></div>' +
        '<div class="kpi-card-value" style="font-size:var(--text-lg)">' + dateStr + '</div>' +
        '<div class="kpi-card-sub">最近一期</div>' +
      '</div>';
  }



// ===== ES Module Exports =====
export { renderKPICards };

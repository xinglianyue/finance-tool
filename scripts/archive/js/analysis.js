// analysis.js - ES Module
import { CONFIG, safeFixed, safeNum, DataStore, state, CHART_COLORS } from './core';
import { displayName, fmtWan, fmtInt } from './utils';

// ===== V13: 增强分析报告引擎 =====

function analyzeTrend(values) {
  if (!values || values.length < 2) return { direction: 'unknown', strength: 0, slope: 0, r2: 0, predicted: null };
  var n = values.length;

  if (n >= 3) {
    // Phase 4.3: 最小二乘线性回归
    var sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
    for (var i = 0; i < n; i++) {
      sumX += i; sumY += values[i]; sumXY += i * values[i];
      sumX2 += i * i; sumY2 += values[i] * values[i];
    }
    var slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    var intercept = (sumY - slope * sumX) / n;
    // R²计算
    var ssTot = sumY2 - sumY * sumY / n;
    var ssRes = 0;
    for (var j = 0; j < n; j++) { ssRes += Math.pow(values[j] - (intercept + slope * j), 2); }
    var r2 = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;
    var predicted = intercept + slope * n;
    var direction = slope > 0.01 ? 'up' : slope < -0.01 ? 'down' : 'stable';
    var strength = Math.min(1, Math.abs(slope) * n / (Math.abs(values[0]) + Math.abs(values[n-1]) + 1));
    return { direction: direction, strength: strength, slope: Math.round(slope * 1000) / 1000, r2: Math.round(r2 * 1000) / 1000, predicted: Math.round(predicted * 100) / 100 };
  } else {
    // 2点退化为简单比较
    var direction = values[1] > values[0] ? 'up' : values[1] < values[0] ? 'down' : 'stable';
    var strength = 1;
    var slope = values[1] - values[0];
    return { direction: direction, strength: strength, slope: slope, r2: 1, predicted: values[1] + slope };
  }
}


  // ===== V13.2: 增强分析引擎 =====

  // --- 瀑布图分析（成本变化归因） ---
  
  // V13.2: 获取上期完整数据
  function getPrevPeriodAllData() {
    if (!state.currentData || !DataStore) return null;
    var allData = DataStore.loadAll();
    var dates = Object.keys(allData).sort();
    var currentIdx = dates.indexOf(state.currentData.date);
    if (currentIdx <= 0) return null;
    var prevDate = dates[currentIdx - 1];
    var prev = allData[prevDate];
    if (prev && prev.currentData) {
      return prev.currentData;
    }
    return null;
  }

function analyzeCostWaterfall(currentData, previousData) {
    if (!currentData || !previousData) return null;
    var cities = currentData.cities || [];
    var prevCities = previousData.cities || [];
    if (cities.length === 0) return null;

    var curTotalCost = 0, prevTotalCost = 0;
    var factors = [];
    var costKeys = [
      { key: 'deliveryCost', label: '配送成本' },
      { key: 'subsidyTotal', label: '补贴' },
      { key: 'platformCost', label: '平台成本' },
      { key: 'fixedCost', label: '固定成本' },
      { key: 'additionalCost', label: '附加成本' }
    ];

    cities.forEach(function(c) {
      var m = c.modules && c.modules['all'] ? c.modules['all'] : {};
      costKeys.forEach(function(ck) {
        var val = safeNum(m[ck.key]);
        curTotalCost += val;
        // 找到上期同城市
        var pc = prevCities.find(function(p) { return p.name === c.name; });
        var pm = pc && pc.modules && pc.modules['all'] ? pc.modules['all'] : {};
        prevTotalCost += safeNum(pm[ck.key]);
      });
    });

    // 各因素贡献
    costKeys.forEach(function(ck) {
      var curVal = 0, prevVal = 0;
      cities.forEach(function(c) {
        var m = c.modules && c.modules['all'] ? c.modules['all'] : {};
        curVal += safeNum(m[ck.key]);
        var pc = prevCities.find(function(p) { return p.name === c.name; });
        var pm = pc && pc.modules && pc.modules['all'] ? pc.modules['all'] : {};
        prevVal += safeNum(pm[ck.key]);
      });
      var delta = curVal - prevVal;
      factors.push({
        label: ck.label,
        previous: prevVal,
        current: curVal,
        delta: delta,
        contribution: curTotalCost !== prevTotalCost ? delta / Math.abs(prevTotalCost) * 100 : 0
      });
    });

    // 收入端变化
    var curRev = 0, prevRev = 0;
    cities.forEach(function(c) {
      var m = c.modules && c.modules['all'] ? c.modules['all'] : {};
      curRev += safeNum(m.onlineRevenue);
      var pc = prevCities.find(function(p) { return p.name === c.name; });
      var pm = pc && pc.modules && pc.modules['all'] ? pc.modules['all'] : {};
      prevRev += safeNum(pm.onlineRevenue);
    });

    return {
      previousCost: prevTotalCost,
      currentCost: curTotalCost,
      totalDelta: curTotalCost - prevTotalCost,
      previousRevenue: prevRev,
      currentRevenue: curRev,
      factors: factors,
      revenueDelta: curRev - prevRev
    };
  }

  // --- 增强统计指标 ---
  function calcAdvancedStats(values) {
    if (!values || values.length === 0) return null;
    var sorted = values.slice().sort(function(a,b){return a-b;});
    var n = sorted.length;
    var sum = sorted.reduce(function(a,b){return a+b;}, 0);
    var mean = sum / n;
    var variance = sorted.reduce(function(s,v){return s+(v-mean)*(v-mean);}, 0) / n;
    var stddev = Math.sqrt(variance);
    var median = n % 2 === 0 ? (sorted[n/2-1] + sorted[n/2]) / 2 : sorted[Math.floor(n/2)];

    // 四分位
    var q1 = sorted[Math.floor(n * 0.25)];
    var q3 = sorted[Math.floor(n * 0.75)];
    var iqr = q3 - q1;

    // IQR异常边界
    var lowerBound = q1 - 1.5 * iqr;
    var upperBound = q3 + 1.5 * iqr;

    // 变异系数
    var cv = mean !== 0 ? (stddev / Math.abs(mean)) * 100 : 0;

    // Z-Score（对每个值）
    var zScores = sorted.map(function(v) { return stddev > 0 ? (v - mean) / stddev : 0; });

    return {
      mean: mean, median: median, stddev: stddev, variance: variance,
      min: sorted[0], max: sorted[n-1], range: sorted[n-1] - sorted[0],
      q1: q1, q3: q3, iqr: iqr,
      lowerBound: lowerBound, upperBound: upperBound,
      cv: cv, zScores: zScores, n: n, sum: sum
    };
  }

  // --- IQR增强异常检测（替代纯Z-Score） ---
  function detectAnomaliesIQR(cities, module) {
    if (!cities || cities.length < 4) return [];
    var anomalies = [];

    var ueVals = [], subVals = [], delVals = [], revVals = [];
    cities.forEach(function(c) {
      var m = c.modules && c.modules[module] ? c.modules[module] : {};
      ueVals.push(safeNum(m.ue));
      subVals.push(safeNum(m.subsidyRatio));
      delVals.push(safeNum(m.deliveryCostRate));
      revVals.push(safeNum(m.onlineRevenue));
    });

    var ueStats = calcAdvancedStats(ueVals);
    var subStats = calcAdvancedStats(subVals);
    var delStats = calcAdvancedStats(delVals);

    cities.forEach(function(c, i) {
      var m = c.modules && c.modules[module] ? c.modules[module] : {};
      var items = [];

      // UE异常（IQR方法）
      if (ueStats) {
        if (ueVals[i] < ueStats.lowerBound) {
          items.push({ type: 'ue_low', severity: 'danger',
            message: 'UE异常偏低(' + safeFixed(ueVals[i],2) + ')，低于下界' + safeFixed(ueStats.lowerBound,2) + '（Q1-1.5IQR）',
            zscore: safeFixed(ueStats.zScores[i], 2) });
        }
      }

      // 补贴率异常
      if (subStats) {
        if (subVals[i] > subStats.upperBound) {
          items.push({ type: 'subsidy_high', severity: 'warning',
            message: '补贴率异常偏高(' + safeFixed(subVals[i]*100,2) + '%)，高于上界' + safeFixed(subStats.upperBound*100,2) + '%',
            zscore: safeFixed(subStats.zScores[i], 2) });
        }
      }

      // 配送成本率异常
      if (delStats) {
        if (delVals[i] > delStats.upperBound) {
          items.push({ type: 'delivery_high', severity: 'warning',
            message: '配送成本率偏高(' + safeFixed(delVals[i]*100,2) + '%)，高于上界' + safeFixed(delStats.upperBound*100,2) + '%',
            zscore: safeFixed(delStats.zScores[i], 2) });
        }
      }

      if (items.length > 0) {
        anomalies.push({ city: c.displayName || c.name, cityName: c.name, items: items });
      }
    });

    return anomalies;
  }

  // --- 贡献度分析（各城市对总指标变化的贡献） ---
  function analyzeContribution(currentData, previousData, module) {
    if (!currentData || !previousData) return null;
    var curCities = currentData.cities || [];
    var prevCities = previousData.cities || [];
    var metrics = [
      { key: 'orders', label: '订单量', format: 'int' },
      { key: 'onlineRevenue', label: '收入', format: 'wan' },
      { key: 'profit', label: '毛利', format: 'wan' },
      { key: 'deliveryCost', label: '配送成本', format: 'wan' },
      { key: 'subsidyTotal', label: '补贴', format: 'wan' }
    ];

    var contributions = {};
    metrics.forEach(function(metric) {
      var totalDelta = 0;
      var details = [];
      curCities.forEach(function(c) {
        var m = c.modules && c.modules[module] ? c.modules[module] : {};
        var curVal = safeNum(m[metric.key]);
        var pc = prevCities.find(function(p) { return p.name === c.name; });
        var pm = pc && pc.modules && pc.modules[module] ? pc.modules[module] : {};
        var prevVal = safeNum(pm[metric.key]);
        var delta = curVal - prevVal;
        totalDelta += delta;
        details.push({ city: c.displayName || c.name, current: curVal, previous: prevVal, delta: delta });
      });
      // 计算贡献占比
      details.forEach(function(d) {
        d.contribution = totalDelta !== 0 ? (d.delta / totalDelta * 100) : 0;
      });
      details.sort(function(a,b) { return Math.abs(b.delta) - Math.abs(a.delta); });
      contributions[metric.key] = { label: metric.label, format: metric.format, totalDelta: totalDelta, details: details };
    });

    return contributions;
  }

  // --- UE分解分析（= 收入/订单 - 成本/订单） ---
  function decomposeUE(cityData, module) {
    if (!cityData) return null;
    var m = cityData.modules && cityData.modules[module] ? cityData.modules[module] : {};
    var orders = safeNum(m.orders, 1);
    var onlineRev = safeNum(m.onlineRevenue);
    var totalExp = safeNum(m.totalExpense);
    var deliveryCost = safeNum(m.deliveryCost);
    var subsidyTotal = safeNum(m.subsidyTotal);
    var platformCost = safeNum(m.platformCost);
    var fixedCost = safeNum(m.fixedCost);
    var otherCost = safeNum(m.additionalCost) + safeNum(m.otherCost || 0);

    var revPerOrder = onlineRev / orders;
    var costPerOrder = totalExp / orders;
    var ue = onlineRev > 0 ? (onlineRev - totalExp) / orders : -costPerOrder;

    // Phase 3.3: 动态归因 - 各成本项对UE的弹性贡献度分析
    var costItems = [
      { key: 'delivery', label: '配送', value: deliveryCost / orders },
      { key: 'subsidy', label: '补贴', value: subsidyTotal / orders },
      { key: 'platform', label: '平台', value: platformCost / orders },
      { key: 'fixed', label: '固定', value: fixedCost / orders },
      { key: 'other', label: '其他', value: otherCost / orders }
    ];

    var costWeight = {};
    var costBreakdown = {};
    costItems.forEach(function(item) {
      costBreakdown[item.key] = item.value;
      costWeight[item.key] = ue !== 0 ? item.value / Math.abs(ue) * 100 : 0;
    });

    var sortedByImpact = costItems.slice().sort(function(a, b) { return b.value - a.value; });
    var totalCostPerOrder = costPerOrder;
    var contribution = {};
    sortedByImpact.forEach(function(item) {
      contribution[item.key] = {
        label: item.label,
        value: item.value,
        pctOfTotal: totalCostPerOrder > 0 ? item.value / totalCostPerOrder * 100 : 0,
        ueImprovement: item.value,
        priority: 'normal'
      };
      if (contribution[item.key].pctOfTotal > 40) contribution[item.key].priority = 'critical';
      else if (contribution[item.key].pctOfTotal > 25) contribution[item.key].priority = 'high';
    });

    // [P0新增] 量价分解: 将UE环比变化拆解为价效应+成本率效应+交叉效应+残差
    var volumePriceBreakdown = null;
    var prevData = typeof getPrevPeriodData === 'function' ? getPrevPeriodData(cityData.name, module) : null;
    if (prevData) {
      var prevOrders = safeNum(prevData.orders, 1);
      var prevRev = safeNum(prevData.onlineRevenue);
      var prevExp = safeNum(prevData.totalExpense);
      var prevARO = prevRev / prevOrders;
      var prevUE = prevRev > 0 ? (prevRev - prevExp) / prevOrders : 0;
      var prevCostRate = prevRev > 0 ? prevExp / prevRev : 0;
      var curCostRate = onlineRev > 0 ? totalExp / onlineRev : 0;

      // UE = ARO × (1 - CostRate), 其中 ARO = 收入/订单, CostRate = 总成本/收入
      // 对UE取全微分: dUE ≈ dARO × (1 - prevCostRate) + prevARO × (-dCostRate)
      // 价效应: ARO变化带来的UE变化(假设成本率不变)
      var priceEffect = (revPerOrder - prevARO) * (1 - prevCostRate);
      // 成本率效应: 成本率变化带来的UE变化(假设ARO不变)
      var costRateEffect = prevARO * (prevCostRate - curCostRate);
      // 交叉效应: ARO和成本率同时变化的交互项
      var crossEffect = (revPerOrder - prevARO) * (curCostRate - prevCostRate);
      // 残差: 固定成本分摊差异等非线性因素
      var actualDiff = ue - prevUE;
      var residual = actualDiff - priceEffect - costRateEffect - crossEffect;

      volumePriceBreakdown = {
        actualDiff: actualDiff,
        priceEffect: priceEffect,
        costRateEffect: costRateEffect,
        crossEffect: crossEffect,
        residual: residual,
        prevARO: prevARO,
        curARO: revPerOrder,
        prevCostRate: prevCostRate,
        curCostRate: curCostRate,
        prevUE: prevUE,
        pricePct: actualDiff !== 0 ? (priceEffect / actualDiff * 100) : 0,
        costPct: actualDiff !== 0 ? (costRateEffect / actualDiff * 100) : 0,
        crossPct: actualDiff !== 0 ? (crossEffect / actualDiff * 100) : 0
      };
    }

    return {
      ue: ue,
      revenuePerOrder: revPerOrder,
      costPerOrder: costPerOrder,
      costBreakdown: costBreakdown,
      costWeight: costWeight,
      contribution: contribution,
      topDriver: sortedByImpact[0] ? sortedByImpact[0].key : null,
      optimizationPotential: sortedByImpact[0] ? {
        target: sortedByImpact[0].label,
        current: sortedByImpact[0].value,
        reduction10pct: sortedByImpact[0].value * 0.1,
        ueGain10pct: sortedByImpact[0].value * 0.1
      } : null,
      // P0新增: 量价分解结果
      volumePriceBreakdown: volumePriceBreakdown
    };
  }

  // --- 多期趋势增强分析（移动平均+线性回归斜率） ---
  function analyzeTrendAdvanced(values, dates) {
    if (!values || values.length < 2) return null;
    var n = values.length;

    // 移动平均（3期）
    var ma3 = [];
    for (var i = 0; i < n; i++) {
      if (i < 2) { ma3.push(null); continue; }
      ma3.push((values[i] + values[i-1] + values[i-2]) / 3);
    }

    // [P0增强] EMA基线(指数移动平均, 对近期更敏感)
    var ema = [];
    var span = 3;
    var k = 2 / (span + 1);
    ema[0] = values[0];
    for (var i = 1; i < n; i++) {
      ema[i] = values[i] * k + ema[i-1] * (1 - k);
    }

    // 简单线性回归（最小二乘法）
    var sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (var j = 0; j < n; j++) {
      sumX += j; sumY += values[j];
      sumXY += j * values[j]; sumX2 += j * j;
    }
    var slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    var intercept = (sumY - slope * sumX) / n;

    // R²
    var mean = sumY / n;
    var ssTotal = 0, ssResidual = 0;
    for (var k2 = 0; k2 < n; k2++) {
      var predicted = slope * k2 + intercept;
      ssTotal += (values[k2] - mean) * (values[k2] - mean);
      ssResidual += (values[k2] - predicted) * (values[k2] - predicted);
    }
    var r2 = ssTotal !== 0 ? 1 - ssResidual / ssTotal : 0;

    // 环比变化
    var momChanges = [];
    for (var l = 1; l < n; l++) {
      momChanges.push(values[l-1] !== 0 ? (values[l] - values[l-1]) / Math.abs(values[l-1]) * 100 : null);
    }
    var avgMomChange = momChanges.filter(function(v){return v !== null;});
    avgMomChange = avgMomChange.length > 0 ? avgMomChange.reduce(function(a,b){return a+b;},0) / avgMomChange.length : 0;

    // 波动性（变异系数）
    var stats = calcAdvancedStats(values);

    // [P1增强] 趋势强度标准化(统一5级标准)
    // 考虑R²拟合优度 + 斜率绝对值
    var slopePct = mean !== 0 ? (slope / Math.abs(mean) * 100) : 0;
    var trendStrengthLevel = 'stable'; // 0: stable
    if (r2 > 0.5) {
      if (slopePct > 10) trendStrengthLevel = 'strong_up';      // +2
      else if (slopePct > 3) trendStrengthLevel = 'moderate_up'; // +1
      else if (slopePct > -3) trendStrengthLevel = 'stable';
      else if (slopePct > -10) trendStrengthLevel = 'moderate_down'; // -1
      else trendStrengthLevel = 'strong_down';                    // -2
    }

    // [P1增强] 与EMA基线的偏离度(判断当前值是否异常偏离趋势)
    var latestEma = ema[n-1];
    var emaDeviation = latestEma !== 0 ? (values[n-1] - latestEma) / Math.abs(latestEma) * 100 : 0;

    return {
      slope: slope,
      intercept: intercept,
      r2: r2,
      trendDirection: slope > 0.01 ? '上升' : slope < -0.01 ? '下降' : '平稳',
      trendStrength: Math.abs(r2) > 0.7 ? '强' : Math.abs(r2) > 0.3 ? '中' : '弱',
      ma3: ma3,
      ema: ema,
      latestEma: latestEma,
      emaDeviation: emaDeviation,
      momChanges: momChanges,
      avgMomChange: avgMomChange,
      volatility: stats ? stats.cv : 0,
      latest: values[n-1],
      predicted: slope * n + intercept,
      predictedDelta: n > 0 && slope * (n-1) + intercept !== 0 ?
        (slope * n + intercept - values[n-1]) / Math.abs(values[n-1]) * 100 : 0,
      // P1增强
      slopePct: slopePct,
      trendStrengthLevel: trendStrengthLevel
    };
  }

  // --- 智能洞察生成（自然语言分析摘要） ---
  function generateInsights(cities, module, allHistory) {
    var insights = [];
    if (!cities || cities.length === 0) return insights;

    // === Phase 4.2: 4层分层洞察引擎 ===
    // Level 1: 全局洞察（整体UE趋势、亏损面变化）
    // Level 2: 城市洞察（哪个城市最值得关注）
    // Level 3: 归因洞察（UE变化的主要驱动因素）
    // Level 4: 行动建议（建议措施+预期改善）

    var ueVals = cities.map(function(c) {
      var m = c.modules && c.modules[module] ? c.modules[module] : {};
      return safeNum(m.ue);
    });
    var stats = calcAdvancedStats(ueVals);

    // ===== Level 1: 全局洞察 =====
    if (stats) {
      // 1a. UE分布
      if (stats.cv > 100) {
        insights.push({ type: 'warning', icon: 'analysis', level: 1,
          title: 'UE波动剧烈',
          detail: '变异系数' + safeFixed(stats.cv, 1) + '%，最高' + safeFixed(stats.max,2) + '元 vs 最低' + safeFixed(stats.min,2) + '元，差距' + safeFixed(stats.range,2) + '元。' });
      } else if (stats.cv > 50) {
        insights.push({ type: 'info', icon: 'trending_up', level: 1,
          title: 'UE分化明显', detail: '变异系数' + safeFixed(stats.cv, 1) + '%，中位数' + safeFixed(stats.median,2) + '元。' });
      } else {
        insights.push({ type: 'good', icon: 'check_circle', level: 1,
          title: 'UE分布稳定', detail: '变异系数' + safeFixed(stats.cv, 1) + '%，均值' + safeFixed(stats.mean,2) + '元。' });
      }

      // 1b. 亏损面
      var lossCount = ueVals.filter(function(v){return v < 0;}).length;
      var lossRate = lossCount / ueVals.length * 100;
      if (lossRate > 50) {
        insights.push({ type: 'danger', icon: 'warning', level: 1,
          title: '亏损面过大', detail: lossCount + '/' + ueVals.length + '个城市亏损（' + safeFixed(lossRate,1) + '%），需紧急排查。' });
      } else if (lossRate > 20) {
        insights.push({ type: 'warning', icon: 'error_outline', level: 1,
          title: '部分城市亏损', detail: lossCount + '/' + ueVals.length + '个城市亏损（' + safeFixed(lossRate,1) + '%）。' });
      }

      // 1c. 多期UE趋势
      if (allHistory && allHistory.length >= 3) {
        var trendUE = [];
        allHistory.forEach(function(h) {
          var cd = h.currentData || h;
          if (cd.cities) {
            var totalOrders = 0, totalProfit = 0;
            cd.cities.forEach(function(c) {
              var m2 = c.modules && c.modules[module] ? c.modules[module] : {};
              totalOrders += safeNum(m2.orders);
              totalProfit += safeNum(m2.profit);
            });
            if (totalOrders > 0) trendUE.push(totalProfit / totalOrders);
          }
        });
        var trend = analyzeTrend(trendUE);
        if (trend.direction === 'down' && trend.r2 > 0.5) {
          insights.push({ type: 'danger', icon: 'trending_down', level: 1,
            title: 'UE持续下滑', detail: '斜率' + trend.slope + '，R²=' + trend.r2 + '，预测下期' + trend.predicted + '元。' });
        } else if (trend.direction === 'up' && trend.r2 > 0.5) {
          insights.push({ type: 'good', icon: 'trending_up', level: 1,
            title: 'UE持续改善', detail: '斜率' + trend.slope + '，R²=' + trend.r2 + '，预测下期' + trend.predicted + '元。' });
        }
      }
    }

    // ===== Level 2: 城市洞察 =====
    if (ueVals.length > 0) {
      var sorted = cities.slice().map(function(c, i) { var m = c.modules && c.modules[module] ? c.modules[module] : {}; return { name: c.displayName || c.name, ue: safeNum(m.ue), idx: i }; }).sort(function(a,b){return a.ue - b.ue;});
      var worst = sorted[0], best = sorted[sorted.length - 1];
      if (worst && worst.ue < -5) {
        insights.push({ type: 'danger', icon: 'location_on', level: 2,
          title: '重点关注: ' + worst.name,
          detail: 'UE ' + safeFixed(worst.ue,2) + '元，表现最弱，建议优先排查成本结构。' });
      }
      if (best && best.ue > 5) {
        insights.push({ type: 'good', icon: 'star', level: 2,
          title: '标杆城市: ' + best.name,
          detail: 'UE ' + safeFixed(best.ue,2) + '元，建议提炼最佳实践。' });
      }
    }

    // ===== Level 3: 归因洞察 =====
    var totalRev = 0, totalDelivery = 0, totalSubsidy = 0, totalPlatform = 0;
    cities.forEach(function(c) {
      var m = c.modules && c.modules[module] ? c.modules[module] : {};
      totalRev += safeNum(m.onlineRevenue);
      totalDelivery += safeNum(m.deliveryCost);
      totalSubsidy += safeNum(m.subsidyTotal);
      totalPlatform += safeNum(m.platformCost || 0);
    });
    if (totalRev > 0) {
      var deliveryPct = totalDelivery / totalRev * 100;
      var subsidyPct = totalSubsidy / totalRev * 100;
      if (deliveryPct > 35) {
        insights.push({ type: 'warning', icon: 'local_shipping', level: 3,
          title: '配送成本是主要拖累', detail: '占总收入' + safeFixed(deliveryPct,1) + '%（' + fmtWan(totalDelivery) + '元），为主要成本驱动因素。' });
      }
      if (subsidyPct > 20) {
        insights.push({ type: 'warning', icon: 'redeem', level: 3,
          title: '补贴投入偏高', detail: '占总收入' + safeFixed(subsidyPct,1) + '%（' + fmtWan(totalSubsidy) + '元），建议核查发放规则。' });
      }
    }

    // ===== Level 4: 行动建议 =====
    if (insights.length > 0) {
      var dangerInsights = insights.filter(function(ins){return ins.type==='danger';});
      var warningInsights = insights.filter(function(ins){return ins.type==='warning';});
      if (dangerInsights.length > 0) {
        insights.push({ type: 'info', icon: 'lightbulb', level: 4,
          title: '建议措施',
          detail: '优先处理' + dangerInsights.length + '项严重问题：亏损面排查→配送成本优化→补贴规则审查。预计可改善UE 0.5-1.5元/单。' });
      } else if (warningInsights.length >= 2) {
        insights.push({ type: 'info', icon: 'lightbulb', level: 4,
          title: '优化建议',
          detail: '关注' + warningInsights.length + '项预警：配送效率提升+补贴精准化投放。预计可改善UE 0.3-0.8元/单。' });
      }
    }

    return insights;
  }

  // --- 渲染智能洞察面板 ---
  function renderInsightsPanel(insights) {
  var container = document.getElementById("insightsPanel");
  if (!container) return;
  if (!insights || insights.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">analysis</div><div class="empty-text">暂无智能洞察</div></div>';
    return;
  }
  var typeColors = { danger: "var(--danger)", warning: "var(--warning)", info: "var(--primary)", good: "var(--success)" };
  var typeBg = { danger: "var(--danger-light)", warning: "var(--warning-light)", info: "var(--primary-light)", good: "var(--success-light)" };
  var levelLabels = { 1: "全局概览", 2: "城市聚焦", 3: "归因分析", 4: "行动建议" };
  // 按level分组
  var groups = {};
  insights.forEach(function(ins) {
    var lvl = ins.level || 1;
    if (!groups[lvl]) groups[lvl] = [];
    groups[lvl].push(ins);
  });
  var html = '<div class="an-flex-col">';
  var sortedLevels = Object.keys(groups).sort(function(a,b) { return +a - +b; });
  sortedLevels.forEach(function(lvl) {
    var label = levelLabels[lvl] || "其他";
    html += '<div class="an-section-label">' + label + '</div>';
    groups[lvl].forEach(function(ins) {
      var color2 = typeColors[ins.type] || "var(--text-secondary)";
      var bg = typeBg[ins.type] || "var(--gray-light)";
      html += '<div class="an-insight-box" style="background:' + bg + ";border-left:3px solid " + color2 + ';">';
      html += '<div class="an-subtitle an-mb" style="color:' + color2 + ';">' + ins.title + "</div>";
      html += '<div class="an-text-sec-lh">' + ins.detail + "</div>";
      html += "</div>";
    });
  });
  html += "</div>";
  container.innerHTML = html;
}

  // --- 渲染瀑布图（成本变化归因） ---
  function renderWaterfallChart(waterfallData) {
    if (!waterfallData) return;
    var canvas = document.getElementById('chartWaterfall');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');

    // 销毁已有实例
    if (_chartInstances && _chartInstances['chartWaterfall']) {
      _chartInstances['chartWaterfall'].destroy();
    }

    var labels = ['上期成本'];
    var increases = [];
    var decreases = [];
    var dataValues = [waterfallData.previousCost];
    var bgColors = [CHART_COLORS.grid];
    var borderColors = ['rgba(150,150,150,0.3)'];

    waterfallData.factors.forEach(function(f) {
      labels.push(f.label);
      dataValues.push(null); // 瀑布图需要浮动柱
      if (f.delta >= 0) {
        increases.push(f.delta);
        decreases.push(0);
        bgColors.push(CHART_COLORS.dangerLt);
        borderColors.push(CHART_COLORS.danger);
      } else {
        increases.push(0);
        decreases.push(Math.abs(f.delta));
        bgColors.push(CHART_COLORS.successLt);
        borderColors.push(CHART_COLORS.success);
      }
    });
    labels.push('本期成本');
    dataValues.push(waterfallData.currentCost);
    bgColors.push(waterfallData.currentCost >= waterfallData.previousCost ? CHART_COLORS.dangerLt : CHART_COLORS.successLt);
    borderColors.push(waterfallData.currentCost >= waterfallData.previousCost ? CHART_COLORS.danger : CHART_COLORS.success);

    // 用堆叠柱状图模拟瀑布图
    var chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          { label: '增加', data: [waterfallData.previousCost].concat(increases).concat([0]), backgroundColor: CHART_COLORS.dangerLt, borderColor: CHART_COLORS.danger, borderWidth: 1, stack: 'stack' },
          { label: '减少', data: [0].concat(decreases).concat([waterfallData.currentCost]), backgroundColor: CHART_COLORS.successLt, borderColor: CHART_COLORS.success, borderWidth: 1, stack: 'stack' }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: { display: true, text: '成本变化瀑布图（元）', font: { size: 13, weight: '600' } },
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function(ctx) {
                if (ctx.dataIndex === 0) return '上期: ' + fmtWan(waterfallData.previousCost);
                if (ctx.dataIndex === labels.length - 1) return '本期: ' + fmtWan(waterfallData.currentCost);
                var f = waterfallData.factors[ctx.dataIndex - 1];
                return f.label + ': ' + (f.delta >= 0 ? '+' : '') + fmtWan(f.delta) + ' (' + (f.contribution >= 0 ? '+' : '') + safeFixed(f.contribution, 1) + '%)';
              }
            }
          }
        },
        scales: {
          y: { stacked: true, grid: { color: CHART_COLORS.grid }, ticks: { callback: function(v) { return fmtWan(v); } } },
          x: { stacked: true, grid: { display: false } }
        }
      }
    });

    if (_chartInstances) _chartInstances['chartWaterfall'] = chart;
  }

  // --- 渲染贡献度面板 ---
  function renderContributionPanel(contributions) {
    var container = document.getElementById('contributionPanel');
    if (!container || !contributions) return;

    var metricOrder = ['orders', 'onlineRevenue', 'profit', 'deliveryCost', 'subsidyTotal'];
    var html = '<div class="an-flex-col-lg">';

    metricOrder.forEach(function(key) {
      var mc = contributions[key];
      if (!mc || mc.details.length === 0) return;

      html += '<div>';
      html += '<div class="an-h5-mb">' + mc.label + '变化: ' + (mc.totalDelta >= 0 ? '+' : '') + (mc.format === 'wan' ? fmtWan(mc.totalDelta) : fmtInt(mc.totalDelta)) + '</div>';

      var barMax = Math.max.apply(null, mc.details.map(function(d) { return Math.abs(d.delta); }));
      if (barMax === 0) barMax = 1;

      mc.details.slice(0, 5).forEach(function(d) {
        var pct = Math.abs(d.delta) / barMax * 100;
        var color = d.delta >= 0 ? (key === 'deliveryCost' || key === 'subsidyTotal' ? 'var(--danger)' : 'var(--success)') : (key === 'deliveryCost' || key === 'subsidyTotal' ? 'var(--success)' : 'var(--danger)');
        var valStr = mc.format === 'wan' ? fmtWan(Math.abs(d.delta)) : fmtInt(Math.abs(d.delta));
        html += '<div class="an-flex-center-item2">';
        html += '<span class="an-td-sec-w50">' + d.city + '</span>';
        html += '<div class="an-bar">';
        html += '<div class="an-bar-fill" style="width:' + pct + '%;background:' + color + ';"></div';
        html += '</div>';
        html += '<span class="an-td-r-fw">' + (d.delta >= 0 ? '+' : '-') + valStr + ' (' + safeFixed(d.contribution, 1) + '%)</span>';
        html += '</div>';
      });
      html += '</div>';
    });

    html += '</div>';
    container.innerHTML = html;
  }

  // --- 渲染UE分解面板 ---
  function renderUEDecomposition(cityName, module) {
    var container = document.getElementById('ueDecomposition');
    if (!container || !state.currentData) return;

    var cities = state.currentData.cities || [];
    var city = cities.find(function(c) { return c.name === cityName; });
    if (!city) return;

    var decomp = decomposeUE(city, module);
    if (!decomp) return;

    var html = '<div class="an-sec-title">UE分解</div>';
    html += '<div class="an-hint-text">UE = 单均收入 - 单均成本，以下拆解各成本驱动因素的贡献</div>';
    html += '<div class="an-row">';
    html += '<div class="an-card"><div class="an-label">单均收入</div><div class="an-val">' + safeFixed(decomp.revenuePerOrder) + '元</div></div>';
    html += '<div class="an-card"><div class="an-label">单均成本</div><div class="an-val an-red">' + safeFixed(decomp.costPerOrder) + '元</div></div>';
    html += '<div class="an-card"><div class="an-label">UE</div><div class="an-val ' + (decomp.ue >= 0 ? 'an-green' : 'an-red') + '">' + (decomp.ue >= 0 ? '+' : '') + safeFixed(decomp.ue) + '元</div></div>';
    html += '</div>';

    // Phase 3.3: 弹性归因展示
    if (decomp.contribution) {
      html += '<div class="an-mt">';
      var sorted = Object.values(decomp.contribution).sort(function(a, b) { return b.value - a.value; });
      var maxVal = Math.max.apply(null, sorted.map(function(c) { return c.value; }).concat([0.01]));
      sorted.forEach(function(c) {
        var pct = c.pctOfTotal;
        var barW = (c.value / maxVal * 100);
        var pClass = c.priority === 'critical' ? 'an-red' : c.priority === 'high' ? 'an-orange' : '';
        html += '<div class="an-bar-row">';
        html += '<div class="an-bar-label">' + c.label + '</div>';
        html += '<div class="an-bar-wrap"><div class="an-bar-fill ' + pClass + '" style="width:' + barW + '%"></div></div>';
        html += '<div class="an-bar-value">' + safeFixed(c.value) + '元</div>';
        html += '<div class="an-bar-pct">' + safeFixed(pct) + '%</div>';
        html += '</div>';
      });
      html += '</div>';
    }

    // 优化建议
    if (decomp.optimizationPotential) {
      var opt = decomp.optimizationPotential;
      html += '<div class="an-mt an-hint">';
      html += '<div class="an-hint-title">&#128161; 优化建议</div>';
      html += '<div class="an-hint-text">最大成本驱动: ' + opt.target + '(' + safeFixed(opt.current) + '元/单)，降低10%可改善UE ' + safeFixed(opt.ueGain10pct) + '元</div>';
      html += '</div>';
    }

    // [P0新增] 量价分解面板
    if (decomp.volumePriceBreakdown) {
      var vp = decomp.volumePriceBreakdown;
      html += '<div class="an-mt an-sec-title-sub">量价分解 (UE变化驱动)</div>';
      html += '<div class="an-row">';
      html += '<div class="an-card"><div class="an-label">UE变化</div><div class="an-val ' + (vp.actualDiff >= 0 ? 'an-green' : 'an-red') + '">' + (vp.actualDiff >= 0 ? '+' : '') + safeFixed(vp.actualDiff) + '元</div></div>';
      html += '<div class="an-card"><div class="an-label">上期UE</div><div class="an-val">' + safeFixed(vp.prevUE) + '元</div></div>';
      html += '</div>';

      var factors = [
        { label: '价效应(ARO变化)', value: vp.priceEffect, pct: vp.pricePct, color: vp.priceEffect >= 0 ? '#22c55e' : '#ef4444' },
        { label: '成本率效应', value: vp.costRateEffect, pct: vp.costPct, color: vp.costRateEffect >= 0 ? '#22c55e' : '#ef4444' },
        { label: '交叉效应', value: vp.crossEffect, pct: vp.crossPct, color: '#f59e0b' },
        { label: '残差(固定成本等)', value: vp.residual, pct: null, color: '#6b7280' }
      ];
      var absMax = Math.max.apply(null, factors.map(function(f) { return Math.abs(f.value); }).concat([0.01]));
      factors.forEach(function(f) {
        var barW = Math.abs(f.value) / absMax * 100;
        html += '<div class="an-bar-row">';
        html += '<div class="an-bar-label">' + f.label + '</div>';
        html += '<div class="an-bar-wrap"><div class="an-bar-fill" style="width:' + barW + '%;background:' + f.color + '"></div></div>';
        html += '<div class="an-bar-value" style="color:' + f.color + '">' + (f.value >= 0 ? '+' : '') + safeFixed(f.value) + '元</div>';
        if (f.pct !== null) html += '<div class="an-bar-pct">' + safeFixed(Math.abs(f.pct)) + '%</div>';
        html += '</div>';
      });

      html += '<div class="an-mt-sm an-hint-text">';
      if (Math.abs(vp.pricePct) > Math.abs(vp.costPct)) {
        html += '主要驱动: 客单价变化(ARO ' + safeFixed(vp.prevARO) + '→' + safeFixed(vp.curARO) + '元)';
      } else {
        html += '主要驱动: 成本率变化(' + (vp.prevCostRate * 100).toFixed(1) + '%→' + (vp.curCostRate * 100).toFixed(1) + '%)';
      }
      html += '</div>';
    }

    container.innerHTML = html;
  }
function analyzeAnomalies(cities, module) {
  // Phase 3.1: 统一异常检测管线(三方法投票: IQR + Z-Score + MAD, >=2/3触发)
  var anomalies = [];
  if (!cities || cities.length < 4) return anomalies;

  var metrics = [
    { key: 'ue', field: 'ue', direction: 'below', label: 'UE', unit: '元', fmt: function(v){return safeFixed(v,2);} },
    { key: 'subsidyRatio', field: 'subsidyRatio', direction: 'above', label: '补贴率', unit: '%', fmt: function(v){return safeFixed(v*100,2);} },
    { key: 'deliveryCostRate', field: 'deliveryCostRate', direction: 'above', label: '配送成本率', unit: '%', fmt: function(v){return safeFixed(v*100,2);} }
  ];

  function calcStats(vals) {
    var n = vals.length;
    if (n < 4) return null;
    var sorted = vals.slice().sort(function(a,b){return a-b;});
    var q1 = sorted[Math.floor(n*0.25)];
    var median = sorted[Math.floor(n*0.5)];
    var q3 = sorted[Math.floor(n*0.75)];
    var iqr = q3 - q1;
    var mean = vals.reduce(function(a,b){return a+b;},0)/n;
    var variance = vals.reduce(function(s,v){return s+(v-mean)*(v-mean);},0)/n;
    var std = Math.sqrt(variance);
    var mad = vals.reduce(function(s,v){return s+Math.abs(v-median);},0)/n;
    return { q1: q1, q3: q3, iqr: iqr, median: median, mean: mean, std: std, mad: mad,
             lowerIQR: q1 - 1.5*iqr, upperIQR: q3 + 1.5*iqr,
             lowerZ: mean - 1.5*std, upperZ: mean + 1.5*std,
             lowerMAD: median - 3*mad, upperMAD: median + 3*mad };
  }

  var metricStats = {};
  var metricValues = {};
  metrics.forEach(function(mt) {
    var vals = cities.map(function(c) {
      var m = c.modules && c.modules[module] ? c.modules[module] : {};
      return safeNum(m[mt.field]);
    });
    metricValues[mt.key] = vals;
    metricStats[mt.key] = calcStats(vals);
  });

  cities.forEach(function(c, i) {
    var m = c.modules && c.modules[module] ? c.modules[module] : {};
    var cityAnomalies = [];

    metrics.forEach(function(mt) {
      var stats = metricStats[mt.key];
      if (!stats) return;
      var val = metricValues[mt.key][i];

      // 三方法投票
      var iqrFlag = false, zFlag = false, madFlag = false;
      if (mt.direction === 'below') {
        iqrFlag = val < stats.lowerIQR;
        zFlag = stats.std > 0 && val < stats.lowerZ;
        madFlag = val < stats.lowerMAD;
      } else {
        iqrFlag = val > stats.upperIQR;
        zFlag = stats.std > 0 && val > stats.upperZ;
        madFlag = val > stats.upperMAD;
      }

      var votes = (iqrFlag?1:0) + (zFlag?1:0) + (madFlag?1:0);
      if (votes >= 2) {
        var severity = votes === 3 ? 'danger' : 'warning';
        var methods = [];
        if (iqrFlag) methods.push('IQR');
        if (zFlag) methods.push('Z-Score');
        if (madFlag) methods.push('MAD');
        var bound = mt.direction === 'below' ? stats.lowerIQR : stats.upperIQR;
        cityAnomalies.push({
          type: mt.key + (mt.direction === 'below' ? '_low' : '_high'),
          severity: severity,
          message: mt.label + '异常' + (mt.direction === 'below' ? '偏低' : '偏高') + '(' + mt.fmt(val) + mt.unit + ')，' + methods.join('+') + '投票(' + votes + '/3)，IQR界=' + mt.fmt(bound) + mt.unit,
          votes: votes, methods: methods
        });
      }
    });

    if (cityAnomalies.length > 0) {
      anomalies.push({ city: c.displayName || c.name, cityName: c.name, items: cityAnomalies });
    }
  });

  return anomalies;
}

function analyzeRootCause(cityData, module) {
  if (!cityData || !module) return [];
  var m = cityData.modules && cityData.modules[module] ? cityData.modules[module] : {};
  var causes = [];

  var ue = safeNum(m.ue);
  var onlineRev = safeNum(m.onlineRevenue);
  var totalExp = safeNum(m.totalExpense);
  var deliveryCost = safeNum(m.deliveryCost);
  var subsidyTotal = safeNum(m.subsidyTotal);
  var platformCost = safeNum(m.platformCost);
  var fixedCost = safeNum(m.fixedCost);
  var orders = safeNum(m.orders, 1);

  // UE归因：UE = (收入-成本)/订单
  // 如果UE为负或偏低，分析是收入不足还是成本过高
  if (ue < 0) {
    causes.push({ factor: '亏损', detail: '线上收入' + fmtWan(onlineRev) + ' < 总成本' + fmtWan(totalExp), impact: 'high' });
  }

  // 成本结构归因
  var deliveryPct = onlineRev > 0 ? deliveryCost / onlineRev : 0;
  var subsidyPct = onlineRev > 0 ? subsidyTotal / onlineRev : 0;
  var platformPct = onlineRev > 0 ? platformCost / onlineRev : 0;
  var fixedPct = onlineRev > 0 ? fixedCost / onlineRev : 0;

  if (deliveryPct > 0.4) causes.push({ factor: '配送成本高', detail: '占收入' + safeFixed(deliveryPct*100, 1) + '%，主力承压项', impact: 'high' });
  if (subsidyPct > 0.15) causes.push({ factor: '补贴率高', detail: '占收入' + safeFixed(subsidyPct*100, 1) + '%，B端' + safeFixed(safeNum(m.subsidyRateB)*100,1) + '% + C端' + safeFixed(safeNum(m.subsidyRateC)*100,1) + '%', impact: 'high' });
  if (platformPct > 0.05) causes.push({ factor: '平台成本偏高', detail: '占收入' + safeFixed(platformPct*100, 1) + '%，罚款' + fmtWan(safeNum(m.penalty)), impact: 'medium' });
  if (fixedPct > 0.03) causes.push({ factor: '固定成本', detail: '占收入' + safeFixed(fixedPct*100, 1) + '%', impact: 'low' });

  return causes;
}

function enhancedReportGenerate(cities, module, allHistory, merchantData) {
  var cityName = cities && cities[0] ? cities[0].displayName || '' : '';
  var md = [];
  var dateStr = state.currentData ? state.currentData.date : new Date().toISOString().slice(0,10);

  md.push('# UE分析报告');
  md.push('> 生成时间: ' + new Date().toLocaleString() + ' | 数据日期: ' + dateStr + ' | 模块: ' + module);
  md.push('');

  // === 总览 ===
  md.push('## 一、总览');
  var totalOrders = 0, totalProfit = 0, totalOnlineRev = 0, totalExp = 0;
  var validCities = [];
  cities.forEach(function(c) {
    var m = c.modules && c.modules[module] ? c.modules[module] : {};
    var o = safeNum(m.orders);
    if (o > 0) validCities.push(c);
    totalOrders += o;
    totalProfit += safeNum(m.profit);
    totalOnlineRev += safeNum(m.onlineRevenue);
    totalExp += safeNum(m.totalExpense);
  });

  var avgUE = totalOrders > 0 ? totalProfit / totalOrders : 0;
  var lossCities = validCities.filter(function(c) { return safeNum(c.modules[module].ue) < 0; });
  var profitCities = validCities.filter(function(c) { return safeNum(c.modules[module].ue) >= 0; });

  md.push('- 城市: ' + validCities.length + '个（盈利' + profitCities.length + ' / 亏损' + lossCities.length + '）');
  md.push('- 订单总量: ' + fmtInt(totalOrders) + '单');
  md.push('- 总毛利: ' + fmtWan(totalProfit));
  md.push('- 线上收入: ' + fmtWan(totalOnlineRev));
  md.push('- 平均UE: ' + safeFixed(avgUE, 2) + '元');
  md.push('- 总成本: ' + fmtWan(totalExp));
  md.push('');

  // === 趋势分析 ===
  md.push('## 二、趋势分析');
  var trendUE = [], trendProfit = [];
  if (allHistory && allHistory.length >= 2) {
    allHistory.forEach(function(h) {
      var cd = h.currentData || h;
      if (cd.cities) {
        var hOrders = 0, hProfit = 0;
        cd.cities.forEach(function(c) {
          var m = c.modules && c.modules[module] ? c.modules[module] : {};
          hOrders += safeNum(m.orders);
          hProfit += safeNum(m.profit);
        });
        trendUE.push(hOrders > 0 ? hProfit / hOrders : 0);
        trendProfit.push(hProfit);
      }
    });

    var ueTrendBasic = analyzeTrend(trendUE);
    var profitTrend = analyzeTrend(trendProfit);

    // V13.2: 增强趋势分析
    var ueAdvanced = analyzeTrendAdvanced(trendUE);
    var profitAdvanced = analyzeTrendAdvanced(trendProfit);

    md.push('- UE趋势: ' + (ueTrendBasic.direction === 'up' ? '上升' : ueTrendBasic.direction === 'down' ? '下降' : '平稳') + '（' + safeFixed(ueTrendBasic.strength * 100, 0) + '%确认度）');
    if (ueAdvanced) {
      md.push('- UE线性回归: 斜率' + safeFixed(ueAdvanced.slope, 4) + '，R²=' + safeFixed(ueAdvanced.r2, 3) + '（' + ueAdvanced.trendStrength + '趋势），预测下期' + safeFixed(ueAdvanced.predicted, 2) + '元');
    }
    md.push('- 毛利趋势: ' + (profitTrend.direction === 'up' ? '上升' : profitTrend.direction === 'down' ? '下降' : '平稳'));
    if (profitAdvanced) {
      md.push('- 毛利线性回归: 斜率' + safeFixed(profitAdvanced.slope, 2) + '，R²=' + safeFixed(profitAdvanced.r2, 3));
    }

    if (trendUE.length >= 2) {
      var latestUE = trendUE[trendUE.length - 1];
      var prevUE = trendUE[trendUE.length - 2];
      var ueChange = prevUE !== 0 ? (latestUE - prevUE) / Math.abs(prevUE) * 100 : 0;
      md.push('- UE环比: ' + (ueChange >= 0 ? '+' : '') + safeFixed(ueChange, 2) + '%');
    }
  } else {
    md.push('- 历史数据不足，无法分析趋势（需要至少2期数据）');
  }
  md.push('');

  // === 异常检测（Phase 3.1: 统一三方法投票管线） ===
  md.push('## 三、异常检测');
  var mergedAnomalies = analyzeAnomalies(validCities, module);

  if (Object.keys(mergedAnomalies).length === 0) {
    md.push('- 未检测到显著异常');
  } else {
    Object.keys(mergedAnomalies).forEach(function(city) {
      mergedAnomalies[city].forEach(function(item) {
        var icon = item.severity === 'danger' ? '🔴' : '🟡';
        md.push('- ' + icon + ' **' + city + '**: ' + item.message);
      });
    });
  }
  md.push('');

  // === 各城市详情 + 归因 ===
  md.push('## 四、各城市分析');
  md.push('');
  md.push('| 排名 | 城市 | UE | 订单 | 毛利 | 补贴率 | 配送成本率 | 主要原因 |');
  md.push('|:---:|:---:|---:|---:|---:|---:|---:|:---|');

  // 按UE排序
  var sortedCities = validCities.slice().sort(function(a, b) {
    return safeNum(b.modules[module].ue) - safeNum(a.modules[module].ue);
  });

  sortedCities.forEach(function(c, i) {
    var m = c.modules[module];
    var causes = analyzeRootCause(c, module);
    var topCause = causes.length > 0 ? causes[0].factor : '-';
    md.push('| ' + (i+1) + ' | ' + c.name + ' | ' + safeFixed(m.ue, 2) + ' | ' + fmtInt(m.orders) + ' | ' + fmtWan(m.profit) + ' | ' + safeFixed(safeNum(m.subsidyRatio)*100, 2) + '% | ' + safeFixed(safeNum(m.deliveryCostRate)*100, 2) + '% | ' + topCause + ' |');
  });
  md.push('');

  // === 归因分析详情（仅亏损城市） ===
  if (lossCities.length > 0) {
    md.push('## 五、亏损城市归因分析');
    lossCities.forEach(function(c) {
      var causes = analyzeRootCause(c, module);
      md.push('');
      md.push('### ' + c.name + ' (UE: ' + safeFixed(c.modules[module].ue, 2) + '元)');
      if (causes.length === 0) {
        md.push('- 暂无明确归因');
      } else {
        causes.forEach(function(cause) {
          var impactIcon = cause.impact === 'high' ? '🔴' : cause.impact === 'medium' ? '🟡' : '🟢';
          md.push('- ' + impactIcon + ' **' + cause.factor + '**: ' + cause.detail);
        });
      }
    });
    md.push('');
  }

  // === KA vs 城商对比 ===
  if (merchantData && merchantData.ka && merchantData.city) {
    md.push('## 六、KA vs 城商对比');
    var kaCities = merchantData.ka.cities || [];
    var cityCities = merchantData.city.cities || [];
    var kaProfit = 0, kaOrders = 0, cityProfit = 0, cityOrders = 0;
    kaCities.forEach(function(c) { var m = c.modules[module] || {}; kaProfit += safeNum(m.profit); kaOrders += safeNum(m.orders); });
    cityCities.forEach(function(c) { var m = c.modules[module] || {}; cityProfit += safeNum(m.profit); cityOrders += safeNum(m.orders); });

    md.push('| 维度 | KA | 城商 |');
    md.push('|:---|---:|---:|');
    md.push('| UE | ' + safeFixed(kaOrders > 0 ? kaProfit/kaOrders : 0, 2) + ' | ' + safeFixed(cityOrders > 0 ? cityProfit/cityOrders : 0, 2) + ' |');
    md.push('| 总订单 | ' + fmtInt(kaOrders) + ' | ' + fmtInt(cityOrders) + ' |');
    md.push('| 总毛利 | ' + fmtWan(kaProfit) + ' | ' + fmtWan(cityProfit) + ' |');
    md.push('');
  }

  return md.join('\n');
}


// onerror moved to script top

window.addEventListener('unhandledrejection', function(event) {
  console.error('[V13 Promise Error]', event.reason);
});

// 数据加载时的全局安全包装
    

  // ===== T5 V3: 增强异常检测引擎(6+指标+IQR动态阈值+趋势变化率+综合评分) =====
  /**
   * 增强异常检测V3
   * 新增: ①IQR动态阈值回退(城市数>=4时用IQR替代静态阈值)
   *        ②趋势变化率(环比恶化加重判定)
   *        ③综合评分(0-100,便于排序和趋势追踪)
   *        ④平台成本率指标(第7个指标)
   *        ⑤B端代补率+C端代补率分别检测(第8-9个指标)
   *        ⑥罚款金额异常检测(第10个指标)
   * @param {Object} m - 模块数据
   * @param {Object} prevM - 上期模块数据(可选,用于趋势分析)
   * @param {Object} statsMap - 各指标IQR统计{ue:{q1,q3,lowerBound,upperBound,zScores}, ...}(可选)
   * @returns {{level:string, score:number, triggers:Array, trendAlerts:Array, statsUsed:boolean}}
   */
  function getAnomalyLevelV3(m, prevM, statsMap) {
    if (!m) return { level: 'missing', score: 0, triggers: [], trendAlerts: [], statsUsed: false };
    if (m.orders === 0 && m.profit === 0 && m.ue === 0 && m.subsidyRatio === 0)
      return { level: 'missing', score: 0, triggers: [], trendAlerts: [], statsUsed: false };

    const triggers = [];
    const trendAlerts = [];
    const T = CONFIG;
    let score = 0; // 综合评分(0=正常, 100=最差)
    let statsUsed = false;

    // 辅助: 获取阈值(静态 vs IQR动态)
    function getThreshold(metric, direction) {
      if (statsMap && statsMap[metric] && cities_count >= 4) {
        statsUsed = true;
        var stats = statsMap[metric];
        if (direction === 'below') return { danger: stats.lowerBound, warn: stats.q1 };
        if (direction === 'above') return { danger: stats.upperBound, warn: stats.q3 };
      }
      return null; // 回退到静态阈值
    }

    // 辅助: 添加trigger
    function addTrigger(metric, value, danger, warn, direction, severity, weight) {
      triggers.push({ metric, value, threshold: String(danger) + (warn !== undefined ? '~' + warn : ''), direction, severity, weight: weight || 1 });
      score += severity === 'danger' ? (weight || 1) * 15 : (weight || 1) * 7;
    }

    // 辅助: 趋势变化率
    function checkTrend(metric, current, previous, worseDir) {
      if (!prevM || previous === undefined || previous === null) return;
      const change = current - previous;
      const rate = previous !== 0 ? change / Math.abs(previous) : (current !== 0 ? 1 : 0);
      let alert = null;
      if (worseDir === 'below' && rate < -0.15) {
        alert = { metric, current, previous, change, rate, direction: 'worsening', severity: rate < -0.30 ? 'danger' : 'warning' };
      } else if (worseDir === 'above' && rate > 0.15) {
        alert = { metric, current, previous, change, rate, direction: 'worsening', severity: rate > 0.30 ? 'danger' : 'warning' };
      }
      if (alert) {
        trendAlerts.push(alert);
        score += alert.severity === 'danger' ? 8 : 4;
      }
    }

    // 获取城市数(用于IQR阈值判断)
    var cities_count = (typeof getAllCitiesCount === 'function') ? getAllCitiesCount() : 0;

    // --- 指标1: UE单均利润 ---
    const ueVal = m.ue || 0;
    const ueIQR = getThreshold('ue', 'below');
    if (ueIQR) {
      // IQR动态阈值
      if (ueVal < ueIQR.danger) addTrigger('UE单均利润', ueVal, ueIQR.danger, ueIQR.warn, 'below', 'danger', 2);
      else if (ueVal < ueIQR.warn) addTrigger('UE单均利润', ueVal, ueIQR.danger, ueIQR.warn, 'below', 'warning', 1);
    } else {
      // 静态阈值回退
      if (ueVal < T.UE_THRESHOLDS.DANGER) addTrigger('UE单均利润', ueVal, T.UE_THRESHOLDS.DANGER, T.UE_THRESHOLDS.WARN_HIGH, 'below', 'danger', 2);
      else if (ueVal >= T.UE_THRESHOLDS.WARN_LOW && ueVal <= T.UE_THRESHOLDS.WARN_HIGH) addTrigger('UE单均利润', ueVal, T.UE_THRESHOLDS.DANGER, T.UE_THRESHOLDS.WARN_HIGH, 'range-low', 'warning', 1);
    }
    checkTrend('UE单均利润', ueVal, prevM ? prevM.ue : undefined, 'below');

    // --- 指标2: 补贴率 ---
    const subVal = m.subsidyRatio || 0;
    const subIQR = getThreshold('subsidyRatio', 'above');
    if (subIQR) {
      if (subVal > subIQR.danger) addTrigger('补贴率', subVal, subIQR.danger, subIQR.warn, 'above', 'danger', 2);
      else if (subVal > subIQR.warn) addTrigger('补贴率', subVal, subIQR.danger, subIQR.warn, 'above', 'warning', 1);
    } else {
      if (subVal > T.SUBSIDY_RATIO_THRESHOLDS.DANGER) addTrigger('补贴率', subVal, T.SUBSIDY_RATIO_THRESHOLDS.DANGER, T.SUBSIDY_RATIO_THRESHOLDS.WARN_LOW, 'above', 'danger', 2);
      else if (subVal > T.SUBSIDY_RATIO_THRESHOLDS.WARN_LOW) addTrigger('补贴率', subVal, T.SUBSIDY_RATIO_THRESHOLDS.DANGER, T.SUBSIDY_RATIO_THRESHOLDS.WARN_LOW, 'above', 'warning', 1);
    }
    checkTrend('补贴率', subVal, prevM ? prevM.subsidyRatio : undefined, 'above');

    // --- 指标3: 配送成本率 ---
    const dcr = m.deliveryCostRate || (m.onlineRevenue > 0 ? m.deliveryCost / m.onlineRevenue : 0);
    const dcrIQR = getThreshold('deliveryCostRate', 'above');
    if (dcrIQR) {
      if (dcr > dcrIQR.danger) addTrigger('配送成本率', dcr, dcrIQR.danger, dcrIQR.warn, 'above', 'danger', 1.5);
      else if (dcr > dcrIQR.warn) addTrigger('配送成本率', dcr, dcrIQR.danger, dcrIQR.warn, 'above', 'warning', 1);
    } else {
      if (dcr > T.DELIVERY_COST_RATE_THRESHOLDS.DANGER) addTrigger('配送成本率', dcr, T.DELIVERY_COST_RATE_THRESHOLDS.DANGER, T.DELIVERY_COST_RATE_THRESHOLDS.WARN_LOW, 'above', 'danger', 1.5);
      else if (dcr > T.DELIVERY_COST_RATE_THRESHOLDS.WARN_LOW) addTrigger('配送成本率', dcr, T.DELIVERY_COST_RATE_THRESHOLDS.DANGER, T.DELIVERY_COST_RATE_THRESHOLDS.WARN_LOW, 'above', 'warning', 1);
    }
    checkTrend('配送成本率', dcr, prevM ? (prevM.deliveryCostRate || (prevM.onlineRevenue > 0 ? prevM.deliveryCost / prevM.onlineRevenue : undefined)) : undefined, 'above');

    // --- 指标4: 固定成本率 ---
    const fcr = m.fixedCostRate || (m.onlineRevenue > 0 ? m.fixedCost / m.onlineRevenue : 0);
    if (fcr > T.FIXED_COST_RATE_THRESHOLDS.DANGER) addTrigger('固定成本率', fcr, T.FIXED_COST_RATE_THRESHOLDS.DANGER, T.FIXED_COST_RATE_THRESHOLDS.WARN_LOW, 'above', 'danger', 1);
    else if (fcr > T.FIXED_COST_RATE_THRESHOLDS.WARN_LOW) addTrigger('固定成本率', fcr, T.FIXED_COST_RATE_THRESHOLDS.DANGER, T.FIXED_COST_RATE_THRESHOLDS.WARN_LOW, 'above', 'warning', 0.5);
    checkTrend('固定成本率', fcr, prevM ? (prevM.fixedCostRate || (prevM.onlineRevenue > 0 ? prevM.fixedCost / prevM.onlineRevenue : undefined)) : undefined, 'above');

    // --- 指标5: 客单价 ---
    const aro = m.avgRevenuePerOrder || (m.orders > 0 ? m.onlineRevenue / m.orders : 0);
    const aroIQR = getThreshold('avgRevenuePerOrder', 'below');
    if (aroIQR) {
      if (aro < aroIQR.danger) addTrigger('客单价', aro, aroIQR.danger, aroIQR.warn, 'below', 'danger', 1.5);
      else if (aro < aroIQR.warn) addTrigger('客单价', aro, aroIQR.danger, aroIQR.warn, 'below', 'warning', 0.5);
    } else {
      if (aro < T.AVG_REVENUE_PER_ORDER_THRESHOLDS.DANGER) addTrigger('客单价', aro, T.AVG_REVENUE_PER_ORDER_THRESHOLDS.DANGER, T.AVG_REVENUE_PER_ORDER_THRESHOLDS.WARN_LOW, 'below', 'danger', 1.5);
      else if (aro < T.AVG_REVENUE_PER_ORDER_THRESHOLDS.WARN_LOW) addTrigger('客单价', aro, T.AVG_REVENUE_PER_ORDER_THRESHOLDS.DANGER, T.AVG_REVENUE_PER_ORDER_THRESHOLDS.WARN_LOW, 'below', 'warning', 0.5);
    }
    checkTrend('客单价', aro, prevM ? (prevM.avgRevenuePerOrder || (prevM.orders > 0 ? prevM.onlineRevenue / prevM.orders : undefined)) : undefined, 'below');

    // --- 指标6: 利润率 ---
    const pr = m.profitRate || (m.onlineRevenue > 0 ? m.profit / m.onlineRevenue : 0);
    if (pr < T.PROFIT_RATE_THRESHOLDS.DANGER) addTrigger('利润率', pr, T.PROFIT_RATE_THRESHOLDS.DANGER, T.PROFIT_RATE_THRESHOLDS.WARN_LOW, 'below', 'danger', 2);
    else if (pr < T.PROFIT_RATE_THRESHOLDS.WARN_LOW) addTrigger('利润率', pr, T.PROFIT_RATE_THRESHOLDS.DANGER, T.PROFIT_RATE_THRESHOLDS.WARN_LOW, 'below', 'warning', 1);
    checkTrend('利润率', pr, prevM ? (prevM.profitRate || (prevM.onlineRevenue > 0 ? prevM.profit / prevM.onlineRevenue : undefined)) : undefined, 'below');

    // --- 指标7: 平台成本率(V3新增) ---
    const plr = m.platformCostRate || (m.onlineRevenue > 0 ? m.platformCost / m.onlineRevenue : 0);
    if (plr > T.PLATFORM_COST_RATE_THRESHOLDS.DANGER) addTrigger('平台成本率', plr, T.PLATFORM_COST_RATE_THRESHOLDS.DANGER, T.PLATFORM_COST_RATE_THRESHOLDS.WARN_LOW, 'above', 'danger', 1);
    else if (plr > T.PLATFORM_COST_RATE_THRESHOLDS.WARN_LOW) addTrigger('平台成本率', plr, T.PLATFORM_COST_RATE_THRESHOLDS.DANGER, T.PLATFORM_COST_RATE_THRESHOLDS.WARN_LOW, 'above', 'warning', 0.5);
    checkTrend('平台成本率', plr, prevM ? (prevM.platformCostRate || (prevM.onlineRevenue > 0 ? prevM.platformCost / prevM.onlineRevenue : undefined)) : undefined, 'above');

    // --- 指标8: B端代补率(V3新增) ---
    const srb = m.subsidyRateB || 0;
    if (srb > T.B_SUBSIDY_RATE_THRESHOLDS.DANGER) addTrigger('B端代补率', srb, T.B_SUBSIDY_RATE_THRESHOLDS.DANGER, T.B_SUBSIDY_RATE_THRESHOLDS.WARN_LOW, 'above', 'danger', 1);
    else if (srb > T.B_SUBSIDY_RATE_THRESHOLDS.WARN_LOW) addTrigger('B端代补率', srb, T.B_SUBSIDY_RATE_THRESHOLDS.DANGER, T.B_SUBSIDY_RATE_THRESHOLDS.WARN_LOW, 'above', 'warning', 0.5);

    // --- 指标9: C端代补率(V3新增) ---
    const src = m.subsidyRateC || 0;
    if (src > T.C_SUBSIDY_RATE_THRESHOLDS.DANGER) addTrigger('C端代补率', src, T.C_SUBSIDY_RATE_THRESHOLDS.DANGER, T.C_SUBSIDY_RATE_THRESHOLDS.WARN_LOW, 'above', 'danger', 1);
    else if (src > T.C_SUBSIDY_RATE_THRESHOLDS.WARN_LOW) addTrigger('C端代补率', src, T.C_SUBSIDY_RATE_THRESHOLDS.DANGER, T.C_SUBSIDY_RATE_THRESHOLDS.WARN_LOW, 'above', 'warning', 0.5);

    // --- 指标10: 罚款金额(V3新增) ---
    const penalty = m.penalty || 0;
    if (penalty > T.PENALTY_AMOUNT_THRESHOLDS.DANGER) addTrigger('罚款', penalty, T.PENALTY_AMOUNT_THRESHOLDS.DANGER, T.PENALTY_AMOUNT_THRESHOLDS.WARN_LOW, 'above', 'danger', 2);
    else if (penalty > T.PENALTY_AMOUNT_THRESHOLDS.WARN_LOW) addTrigger('罚款', penalty, T.PENALTY_AMOUNT_THRESHOLDS.WARN_LOW, 0, 'above', 'warning', 0.5);

    // 综合评分归一化(0-100)
    score = Math.min(100, Math.round(score));

    const hasDanger = triggers.some(function(t) { return t.severity === 'danger'; });
    const hasWarning = triggers.some(function(t) { return t.severity === 'warning'; });
    const hasTrendDanger = trendAlerts.some(function(t) { return t.severity === 'danger'; });
    var level = hasDanger || hasTrendDanger ? 'danger' : hasWarning ? 'warning' : 'good';

    // --- V4: 交叉关联检测(指标间联动风险) ---
    const crossAlerts = [];
    // 关联1: UE低 + 补贴率高 = 补贴效率低下(双重恶化)
    // 复用V3已有变量: ueVal(指标1), dcr(指标3), plr(指标7), pr(指标5)
    var _v4SubRate = m.subsidyRatio || (m.onlineRevenue > 0 ? (m.subsidyTotal || 0) / m.onlineRevenue : 0);
    if (ueVal < 3 && _v4SubRate > 0.30) {
      var _v4S1 = (ueVal < 1.5 && _v4SubRate > 0.40) ? 'danger' : 'warning';
      crossAlerts.push({
        metric: 'UE-补贴效率', severity: _v4S1,
        title: 'UE低+补贴高: 补贴转化效率低下',
        detail: 'UE=' + ueVal.toFixed(2) + '元(低于3元) 且 补贴率=' + (_v4SubRate * 100).toFixed(1) + '%(高于30%)',
        weight: _v4S1 === 'danger' ? 3 : 1.5
      });
      score += _v4S1 === 'danger' ? 12 : 5;
    }
    // 关联2: 配送成本率高 + UE低 = 成本结构恶化(复用dcr)
    if (dcr > 0.35 && ueVal < 3) {
      crossAlerts.push({
        metric: '配送-UE关联', severity: 'warning',
        title: '配送成本高+UE低: 成本结构承压',
        detail: '配送成本率=' + (dcr * 100).toFixed(1) + '% 且 UE=' + ueVal.toFixed(2) + '元',
        weight: 1
      });
      score += 5;
    }
    // 关联3: 订单量大 + 利润率低 = 规模不经济(复用pr)
    var _v4Orders = m.orders || 0;
    if (_v4Orders > 5000 && pr < 0.03) {
      crossAlerts.push({
        metric: '规模-利润关联', severity: 'warning',
        title: '高订单+低利润率: 规模不经济',
        detail: '订单量=' + Math.round(_v4Orders) + '单 且 利润率=' + (pr * 100).toFixed(1) + '%',
        weight: 1
      });
      score += 5;
    }
    // 关联4: 平台成本率高 + 利润率低 = 平台挤压严重(复用plr)
    if (plr > 0.15 && pr < 0.05) {
      var _v4S4 = plr > 0.20 ? 'danger' : 'warning';
      crossAlerts.push({
        metric: '平台-利润关联', severity: _v4S4,
        title: '平台成本高+利润率低: 平台挤压严重',
        detail: '平台成本率=' + (plr * 100).toFixed(1) + '% 且 利润率=' + (pr * 100).toFixed(1) + '%',
        weight: _v4S4 === 'danger' ? 2 : 1
      });
      score += _v4S4 === 'danger' ? 10 : 5;
    }
    // 关联5: 补贴率高 + 配送成本率高 = 补贴投放效率问题(V4新增)
    // 花了大量补贴但配送成本仍高,说明配送体系效率不足
    if (_v4SubRate > 0.35 && dcr > 0.32) {
      var _v4S5 = (_v4SubRate > 0.45 && dcr > 0.38) ? 'danger' : 'warning';
      crossAlerts.push({
        metric: '补贴-配送关联', severity: _v4S5,
        title: '补贴高+配送贵: 投放效率存疑',
        detail: '补贴率=' + (_v4SubRate * 100).toFixed(1) + '%(>35%) 且 配送成本率=' + (dcr * 100).toFixed(1) + '%(>32%)',
        weight: _v4S5 === 'danger' ? 2.5 : 1.5
      });
      score += _v4S5 === 'danger' ? 10 : 5;
    }
    // 关联6: 罚款高 + 利润率低 = 合规拖累盈利(V4新增)
    var _v4Penalty = m.penalty || 0;
    if (_v4Penalty > 5000 && pr < 0.05) {
      crossAlerts.push({
        metric: '罚款-利润关联', severity: 'warning',
        title: '罚款高+利润低: 合规成本侵蚀利润',
        detail: '罚款=' + Math.round(_v4Penalty) + '元(>5000) 且 利润率=' + (pr * 100).toFixed(1) + '%(<5%)',
        weight: 1.5
      });
      score += 6;
    }

    // --- V4增强: 趋势加速检测 ---
    // 当多个指标同时恶化趋势时,风险升级
    var worseningTrends = trendAlerts.filter(function(t) { return t.direction === 'worsening'; });
    var dangerTrends = worseningTrends.filter(function(t) { return t.severity === 'danger'; });
    if (dangerTrends.length >= 2) {
      crossAlerts.push({
        metric: '趋势加速', severity: 'danger',
        title: dangerTrends.length + '项指标同时急剧恶化',
        detail: dangerTrends.map(function(t) { return t.metric + '(' + (t.rate * 100).toFixed(1) + '%)'; }).join(', '),
        weight: 3
      });
      score += 15;
    } else if (worseningTrends.length >= 3) {
      crossAlerts.push({
        metric: '趋势加速', severity: 'warning',
        title: worseningTrends.length + '项指标同时恶化',
        detail: worseningTrends.map(function(t) { return t.metric + '(' + (t.rate * 100).toFixed(1) + '%)'; }).join(', '),
        weight: 2
      });
      score += 8;
    }

    // 交叉关联影响综合评级(含趋势加速)
    if (crossAlerts.length > 0 && level === 'good') {
      level = crossAlerts.some(function(a) { return a.severity === 'danger'; }) ? 'warning' : level;
    } else if (crossAlerts.length >= 2) {
      level = crossAlerts.some(function(a) { return a.severity === 'danger'; }) ? 'danger' : 'warning';
    }

    return { level, score, triggers, trendAlerts, crossAlerts, statsUsed };
  }

  // 获取当前筛选城市数(用于IQR判断)
  function getAllCitiesCount() {
    try {
      const cities = (typeof window.getFilteredCities === 'function') ? window.getFilteredCities() : [];
      return cities.length;
    } catch(e) { return 0; }
  }

// ===== T5 V2: 6指标异常检测引擎 =====
  function getAnomalyLevelV2(m) {
    if (!m) return { level: 'missing', triggers: [] };
    if (m.orders === 0 && m.profit === 0 && m.ue === 0 && m.subsidyRatio === 0) return { level: 'missing', triggers: [] };

    const triggers = [];
    const T = CONFIG;

    // 1. UE单均利润检测
    if (m.ue < T.UE_THRESHOLDS.DANGER) {
      triggers.push({ metric: 'UE单均利润', value: m.ue, threshold: T.UE_THRESHOLDS.DANGER, direction: 'below', severity: 'danger' });
    } else if (m.ue >= T.UE_THRESHOLDS.WARN_LOW && m.ue <= T.UE_THRESHOLDS.WARN_HIGH) {
      triggers.push({ metric: 'UE单均利润', value: m.ue, threshold: String(T.UE_THRESHOLDS.DANGER) + '~' + String(T.UE_THRESHOLDS.WARN_HIGH) + '元', direction: 'range-low', severity: 'warning' });
    }

    // 2. 补贴率检测
    if (m.subsidyRatio > T.SUBSIDY_RATIO_THRESHOLDS.DANGER) {
      triggers.push({ metric: '补贴率', value: m.subsidyRatio, threshold: T.SUBSIDY_RATIO_THRESHOLDS.DANGER, direction: 'above', severity: 'danger' });
    } else if (m.subsidyRatio > T.SUBSIDY_RATIO_THRESHOLDS.WARN_LOW) {
      triggers.push({ metric: '补贴率', value: m.subsidyRatio, threshold: String(T.SUBSIDY_RATIO_THRESHOLDS.WARN_LOW) + '~' + String(T.SUBSIDY_RATIO_THRESHOLDS.DANGER), direction: 'above', severity: 'warning' });
    }

    // 3. 配送成本率检测
    const dcr = m.deliveryCostRate || (m.onlineRevenue > 0 ? m.deliveryCost / m.onlineRevenue : 0);
    if (dcr > T.DELIVERY_COST_RATE_THRESHOLDS.DANGER) {
      triggers.push({ metric: '配送成本率', value: dcr, threshold: T.DELIVERY_COST_RATE_THRESHOLDS.DANGER, direction: 'above', severity: 'danger' });
    } else if (dcr > T.DELIVERY_COST_RATE_THRESHOLDS.WARN_LOW) {
      triggers.push({ metric: '配送成本率', value: dcr, threshold: String(T.DELIVERY_COST_RATE_THRESHOLDS.WARN_LOW) + '~' + String(T.DELIVERY_COST_RATE_THRESHOLDS.DANGER), direction: 'above', severity: 'warning' });
    }

    // 4. 固定成本率检测
    const fcr = m.fixedCostRate || (m.onlineRevenue > 0 ? m.fixedCost / m.onlineRevenue : 0);
    if (fcr > T.FIXED_COST_RATE_THRESHOLDS.DANGER) {
      triggers.push({ metric: '固定成本率', value: fcr, threshold: T.FIXED_COST_RATE_THRESHOLDS.DANGER, direction: 'above', severity: 'danger' });
    } else if (fcr > T.FIXED_COST_RATE_THRESHOLDS.WARN_LOW) {
      triggers.push({ metric: '固定成本率', value: fcr, threshold: String(T.FIXED_COST_RATE_THRESHOLDS.WARN_LOW) + '~' + String(T.FIXED_COST_RATE_THRESHOLDS.DANGER), direction: 'above', severity: 'warning' });
    }

    // 5. 客单价检测
    const aro = m.avgRevenuePerOrder || (m.orders > 0 ? m.onlineRevenue / m.orders : 0);
    if (aro < T.AVG_REVENUE_PER_ORDER_THRESHOLDS.DANGER) {
      triggers.push({ metric: '客单价', value: aro, threshold: T.AVG_REVENUE_PER_ORDER_THRESHOLDS.DANGER, direction: 'below', severity: 'danger' });
    } else if (aro < T.AVG_REVENUE_PER_ORDER_THRESHOLDS.WARN_LOW) {
      triggers.push({ metric: '客单价', value: aro, threshold: String(T.AVG_REVENUE_PER_ORDER_THRESHOLDS.DANGER) + '~' + String(T.AVG_REVENUE_PER_ORDER_THRESHOLDS.WARN_LOW) + '元', direction: 'below', severity: 'warning' });
    }

    // 6. 利润率检测
    const pr = m.profitRate || (m.onlineRevenue > 0 ? m.profit / m.onlineRevenue : 0);
    if (pr < T.PROFIT_RATE_THRESHOLDS.DANGER) {
      triggers.push({ metric: '利润率', value: pr, threshold: T.PROFIT_RATE_THRESHOLDS.DANGER, direction: 'below', severity: 'danger' });
    } else if (pr < T.PROFIT_RATE_THRESHOLDS.WARN_LOW) {
      triggers.push({ metric: '利润率', value: pr, threshold: T.PROFIT_RATE_THRESHOLDS.WARN_LOW, direction: 'below', severity: 'warning' });
    }

    const hasDanger = triggers.some(function(t) { return t.severity === 'danger'; });
    const hasWarning = triggers.some(function(t) { return t.severity === 'warning'; });
    const level = hasDanger ? 'danger' : hasWarning ? 'warning' : 'good';
    return { level: level, triggers: triggers };
  }

  // T5 V2: 6指标归因诊断
  function getDiagnosisV2(anomalyResult, moduleName) {
    if (!anomalyResult || anomalyResult.level === 'good' || anomalyResult.level === 'missing') return null;
    const issues = [];
    for (const t of anomalyResult.triggers) {
      let desc = '';
      switch (t.metric) {
        case 'UE单均利润':
          desc = t.value < 0 ? 'UE亏损(' + t.value.toFixed(2) + '元)' : 'UE偏低(' + t.value.toFixed(2) + '元)';
          break;
        case '补贴率':
          desc = t.severity === 'danger' ? '补贴率过高(' + (t.value*100).toFixed(1) + '%)' : '补贴率偏高(' + (t.value*100).toFixed(1) + '%)';
          break;
        case '配送成本率':
          desc = '配送成本率偏高(' + (t.value*100).toFixed(1) + '%)';
          break;
        case '固定成本率':
          desc = '固定成本率偏高(' + (t.value*100).toFixed(1) + '%)';
          break;
        case '客单价':
          desc = t.severity === 'danger' ? '客单价过低(' + t.value.toFixed(1) + '元)' : '客单价偏低(' + t.value.toFixed(1) + '元)';
          break;
        case '利润率':
          desc = t.value < 0 ? '利润率亏损(' + (t.value*100).toFixed(1) + '%)' : '利润率偏低(' + (t.value*100).toFixed(1) + '%)';
          break;
      }
      if (desc) issues.push(desc);
    }
    if (issues.length === 0) return null;
    return moduleName + '：' + issues.join('；');
  }

  // ===== ANOMALY DETECTION =====
  function getAnomalyLevel(ue, subsidyRatio) {
    if (ue === 0 && subsidyRatio === 0) return 'missing';
    const isDangerUE = ue < CONFIG.UE_THRESHOLDS.DANGER;
    const isWarnUE = ue >= CONFIG.UE_THRESHOLDS.WARN_LOW && ue <= CONFIG.UE_THRESHOLDS.WARN_HIGH;
    const isDangerSubsidy = subsidyRatio > CONFIG.SUBSIDY_RATIO_THRESHOLDS.DANGER;
    const isWarnSubsidy = subsidyRatio > CONFIG.SUBSIDY_RATIO_THRESHOLDS.WARN_LOW && subsidyRatio <= CONFIG.SUBSIDY_RATIO_THRESHOLDS.DANGER;
    if (isDangerUE || isDangerSubsidy) return 'danger';
    if (isWarnUE || isWarnSubsidy) return 'warning';
    return 'good';
  }
  function getDiagnosis(anomalyLevel, ue, subsidyRatio, moduleName) {
    const issues = [];
    if (ue < 0) issues.push('UE亏损');
    else if (anomalyLevel === 'warning' && ue <= 0.3) issues.push('UE偏低');
    if (subsidyRatio > 0.35) issues.push('补贴率过高');
    else if (subsidyRatio > 0.30) issues.push('补贴率偏高');
    if (issues.length === 0) return null;
    return `${moduleName}：${issues.join('，')}`;
  }


  // ===== T9: 异常自动归因引擎(六维) =====
  function analyzeAnomalyRootCause(cityName, moduleKey) {
    const cities = state.currentData ? state.currentData.cities : [];
    const city = cities.find(function(c) { return c.name === cityName; });
    if (!city) return null;
    const m = city.modules[moduleKey || 'all'];
    if (!m) return null;

    // 优先使用V3引擎(含IQR+趋势),回退V2
    let anomaly;
    try {
      anomaly = typeof getAnomalyLevelV3 === 'function' ? getAnomalyLevelV3(m) : getAnomalyLevelV2(m);
    } catch(e) {
      anomaly = getAnomalyLevelV2(m);
    }
    if (anomaly.level === 'good' || anomaly.level === 'missing') return null;

    const causes = [];
    const revenue = m.onlineRevenue || 0;
    const orders = m.orders || 0;
    const profit = m.profit || 0;
    const ue = m.ue || 0;

    // 归因1: 成本结构拆解(含平台成本率)
    const costItems = [
      { name: '配送成本', value: m.deliveryCost || 0, rate: revenue > 0 ? (m.deliveryCost || 0) / revenue : 0 },
      { name: 'B端补贴', value: m.subsidyB || 0, rate: revenue > 0 ? (m.subsidyB || 0) / revenue : 0 },
      { name: 'C端补贴', value: m.subsidyC || 0, rate: revenue > 0 ? (m.subsidyC || 0) / revenue : 0 },
      { name: '拼单补贴', value: m.pinDanSubsidy || 0, rate: revenue > 0 ? (m.pinDanSubsidy || 0) / revenue : 0 },
      { name: '拼好饭补贴', value: m.pinHaoFanSubsidy || 0, rate: revenue > 0 ? (m.pinHaoFanSubsidy || 0) / revenue : 0 },
      { name: '专项补贴', value: m.specialSubsidy || 0, rate: revenue > 0 ? (m.specialSubsidy || 0) / revenue : 0 },
      { name: '天气补贴', value: m.weatherSubsidy || 0, rate: revenue > 0 ? (m.weatherSubsidy || 0) / revenue : 0 },
      { name: '平台成本', value: m.platformCost || 0, rate: revenue > 0 ? (m.platformCost || 0) / revenue : 0 },
      { name: '固定成本', value: m.fixedCost || 0, rate: revenue > 0 ? (m.fixedCost || 0) / revenue : 0 },
      { name: '附加成本', value: m.additionalCost || 0, rate: revenue > 0 ? (m.additionalCost || 0) / revenue : 0 }
    ].sort(function(a, b) { return b.value - a.value; });

    // A. 最大成本拖累
    const topCost = costItems[0];
    if (topCost && topCost.value > 0) {
      causes.push({
        type: 'cost_driver', severity: topCost.rate > 0.25 ? 'danger' : 'warning',
        title: '主要成本拖累: ' + topCost.name,
        detail: '金额 ' + (topCost.value / 10000).toFixed(2) + '万元，占收入 ' + (topCost.rate * 100).toFixed(1) + '%',
        metric: topCost.name, value: topCost.value
      });
    }

    // B. 补贴结构分析
    const totalSubsidy = (m.subsidyB||0) + (m.subsidyC||0) + (m.specialSubsidy||0) + (m.pinDanSubsidy||0) + (m.pinHaoFanSubsidy||0) + (m.weatherSubsidy||0);
    const subsidyRate = revenue > 0 ? totalSubsidy / revenue : 0;
    if (subsidyRate > 0.35) {
      const subsidyItems = costItems.filter(function(c) { return ['B端补贴','C端补贴','拼单补贴','拼好饭补贴','专项补贴','天气补贴'].includes(c.name); });
      const topSubsidy = subsidyItems[0];
      causes.push({
        type: 'subsidy_structure', severity: subsidyRate > 0.45 ? 'danger' : 'warning',
        title: '补贴率偏高: ' + (subsidyRate * 100).toFixed(1) + '%',
        detail: '总补贴 ' + (totalSubsidy / 10000).toFixed(2) + '万元' + (topSubsidy ? '，其中' + topSubsidy.name + '占比最大(' + (topSubsidy.value / 10000).toFixed(2) + '万)' : ''),
        metric: '补贴率', value: subsidyRate
      });
    }

    // B2. B/C端补贴分别分析(新增)
    const srb = m.subsidyRateB || 0;
    const src = m.subsidyRateC || 0;
    if (srb > 0.05) {
      causes.push({
        type: 'subsidy_b_high', severity: srb > 0.08 ? 'danger' : 'warning',
        title: 'B端代补率偏高: ' + (srb * 100).toFixed(1) + '%',
        detail: 'B端补贴 ' + ((m.subsidyB||0) / 10000).toFixed(2) + '万元，需关注加盟商补贴效率',
        metric: 'B端代补率', value: srb
      });
    }
    if (src > 0.08) {
      causes.push({
        type: 'subsidy_c_high', severity: src > 0.12 ? 'danger' : 'warning',
        title: 'C端代补率偏高: ' + (src * 100).toFixed(1) + '%',
        detail: 'C端补贴 ' + ((m.subsidyC||0) / 10000).toFixed(2) + '万元，需评估C端补贴ROI',
        metric: 'C端代补率', value: src
      });
    }

    // C. 配送成本分析
    const dcr = revenue > 0 ? (m.deliveryCost || 0) / revenue : 0;
    if (dcr > 0.30) {
      let deliveryDetail = '';
      const deliveryBreakdown = m.deliveryCostBreakdown;
      if (deliveryBreakdown && typeof deliveryBreakdown === 'object') {
        const dItems = Object.entries(deliveryBreakdown).sort(function(a, b) { return (b[1]||0) - (a[1]||0); });
        const topD = dItems[0];
        if (topD) {
          const dLabels = { franchiseDelivery: '加盟配送', crowdDelivery: '众包配送', yuepaoDelivery: '月跑配送', weatherSubsidy: '天气补贴' };
          deliveryDetail = '，' + (dLabels[topD[0]] || topD[0]) + '占比最大(' + ((topD[1]||0) / 10000).toFixed(2) + '万)';
        }
      }
      causes.push({
        type: 'delivery_cost', severity: dcr > 0.38 ? 'danger' : 'warning',
        title: '配送成本率偏高: ' + (dcr * 100).toFixed(1) + '%',
        detail: '配送成本 ' + ((m.deliveryCost||0) / 10000).toFixed(2) + '万元' + deliveryDetail,
        metric: '配送成本率', value: dcr
      });
    }

    // D. 客单价分析
    const avgRevenue = orders > 0 ? revenue / orders : 0;
    if (avgRevenue < 8) {
      causes.push({
        type: 'low_aov', severity: avgRevenue < 6 ? 'danger' : 'warning',
        title: '客单价过低: ' + avgRevenue.toFixed(1) + '元',
        detail: '低于行业均值(8元)，收入端偏弱可能拉低整体UE',
        metric: '客单价', value: avgRevenue
      });
    }

    // E. 固定成本分析
    const fcr = revenue > 0 ? (m.fixedCost || 0) / revenue : 0;
    if (fcr > 0.04) {
      causes.push({
        type: 'fixed_cost', severity: fcr > 0.08 ? 'danger' : 'warning',
        title: '固定成本率偏高: ' + (fcr * 100).toFixed(1) + '%',
        detail: '固定成本 ' + ((m.fixedCost||0) / 10000).toFixed(2) + '万元' + (orders > 0 ? '，单均固定成本 ' + ((m.fixedCost||0) / orders).toFixed(2) + '元' : ''),
        metric: '固定成本率', value: fcr
      });
    }

    // E2. 平台成本分析(新增)
    const plr = revenue > 0 ? (m.platformCost || 0) / revenue : 0;
    if (plr > 0.06) {
      causes.push({
        type: 'platform_cost', severity: plr > 0.10 ? 'danger' : 'warning',
        title: '平台成本率偏高: ' + (plr * 100).toFixed(1) + '%',
        detail: '平台成本 ' + ((m.platformCost||0) / 10000).toFixed(2) + '万元，含抽佣/售后/关爱基金/保险/竞价/罚款',
        metric: '平台成本率', value: plr
      });
    }

    // E3. 罚款分析(新增)
    const penalty = m.penalty || 0;
    if (penalty > 2000) {
      causes.push({
        type: 'penalty', severity: penalty > 5000 ? 'danger' : 'warning',
        title: '罚款金额偏高: ' + (penalty / 10000).toFixed(2) + '万元',
        detail: '罚款直接影响利润，需排查罚款原因并制定改善措施',
        metric: '罚款', value: penalty
      });
    }

    // F. 环比恶化分析(增强: 多指标环比)
    const allData = DataStore.loadAll();
    const dates = Object.keys(allData).sort();
    const mt = state.currentMerchant || 'all';
    if (dates.length >= 2) {
      const prevEntry = allData[dates[dates.length - 2]];
      const prevCities = ((prevEntry.merchantData || {})[mt] || {}).cities || [];
      const prevCity = prevCities.find(function(c) { return c.name === cityName; });
      if (prevCity) {
        const prevMod = prevCity.modules[moduleKey || 'all'];
        if (prevMod) {
          // UE环比
          const ueDiff = ue - (prevMod.ue || 0);
          const profitDiff = profit - (prevMod.profit || 0);
          if (ueDiff < -0.5) {
            causes.push({
              type: 'trend_worsening', severity: ueDiff < -2 ? 'danger' : 'warning',
              title: 'UE环比恶化: ' + (ueDiff < 0 ? '' : '+') + ueDiff.toFixed(2) + '元',
              detail: '上期UE=' + (prevMod.ue||0).toFixed(2) + ' → 本期=' + ue.toFixed(2) + '，利润环比变化' + (profitDiff / 10000).toFixed(2) + '万',
              metric: 'UE环比', value: ueDiff
            });
          }
          // 补贴率环比(新增)
          const prevSubRate = prevMod.subsidyRatio || 0;
          const subRateDiff = subsidyRate - prevSubRate;
          if (subRateDiff > 0.05) {
            causes.push({
              type: 'subsidy_trend', severity: subRateDiff > 0.10 ? 'danger' : 'warning',
              title: '补贴率环比上升: +' + (subRateDiff * 100).toFixed(1) + '%',
              detail: '上期' + (prevSubRate * 100).toFixed(1) + '% → 本期' + (subsidyRate * 100).toFixed(1) + '%',
              metric: '补贴率环比', value: subRateDiff
            });
          }
          // 配送成本率环比(新增)
          const prevDcr = prevMod.deliveryCostRate || (prevMod.onlineRevenue > 0 ? prevMod.deliveryCost / prevMod.onlineRevenue : 0);
          const dcrDiff = dcr - prevDcr;
          if (dcrDiff > 0.03) {
            causes.push({
              type: 'delivery_trend', severity: dcrDiff > 0.05 ? 'danger' : 'warning',
              title: '配送成本率环比上升: +' + (dcrDiff * 100).toFixed(1) + '%',
              detail: '上期' + (prevDcr * 100).toFixed(1) + '% → 本期' + (dcr * 100).toFixed(1) + '%',
              metric: '配送成本率环比', value: dcrDiff
            });
          }
        }
      }
    }

    // G. V3引擎趋势预警(新增)
    if (anomaly.trendAlerts && anomaly.trendAlerts.length > 0) {
      for (const ta of anomaly.trendAlerts) {
        if (ta.direction === 'worsening') {
          // 避免与F部分重复
          const dup = causes.some(function(c) { return c.metric === ta.metric + '环比'; });
          if (!dup) {
            causes.push({
              type: 'trend_alert', severity: ta.severity,
              title: ta.metric + '趋势恶化: ' + (ta.rate * 100).toFixed(1) + '%',
              detail: '上期=' + (ta.previous || 0).toFixed(2) + ' → 本期=' + ta.current.toFixed(2) + '，变化率' + (ta.rate * 100).toFixed(1) + '%',
              metric: ta.metric, value: ta.rate
            });
          }
        }
      }
    }

    // H. V4交叉关联归因(新增)
    if (anomaly.crossAlerts && anomaly.crossAlerts.length > 0) {
      for (var ci = 0; ci < anomaly.crossAlerts.length; ci++) {
        var ca = anomaly.crossAlerts[ci];
        causes.push({
          type: 'cross_correlation', severity: ca.severity,
          title: ca.title,
          detail: ca.detail + ' (交叉关联权重: ' + (ca.weight || 1) + ')',
          metric: ca.metric, value: ca.weight
        });
      }
    }

    // T9 V4增强: 趋势加速归因(多指标同时恶化)
    if (anomaly.trendAlerts) {
      var worsening = anomaly.trendAlerts.filter(function(t) { return t.direction === 'worsening'; });
      if (worsening.length >= 3) {
        var trendMetrics = worsening.map(function(t) {
          return t.metric + '(' + (t.rate > 0 ? '+' : '') + (t.rate * 100).toFixed(1) + '%)';
        }).join(', ');
        causes.push({
          type: 'trend_acceleration',
          title: worsening.length + '项指标趋势同时恶化',
          detail: '环比变化: ' + trendMetrics + '。建议检查是否有系统性因素(如区域政策调整、竞品活动、季节性因素)。',
          severity: worsening.some(function(t) { return t.severity === 'danger'; }) ? 'danger' : 'warning',
          weight: 2.5
        });
      }
    }

    // T9 V4增强: 百分位对标归因(与城市统计分布对比)
    if (m && anomaly.statsUsed) {
      var pctCauses = [];
      var pctMetrics = [
        { key: 'ue', label: 'UE' },
        { key: 'subsidyRatio', label: '补贴率' },
        { key: 'profitRate', label: '利润率' }
      ];
      for (var pi2 = 0; pi2 < pctMetrics.length; pi2++) {
        var mc2 = pctMetrics[pi2];
        var hasTrig = anomaly.triggers && anomaly.triggers.some(function(t) { return t.metric.indexOf(mc2.label) >= 0; });
        if (hasTrig) pctCauses.push(mc2.label);
      }
      if (pctCauses.length > 0) {
        causes.push({
          type: 'percentile_benchmark',
          title: '多项指标偏离城市统计分布',
          detail: '以下指标处于城市IQR异常区间: ' + pctCauses.join('、') + '。需关注城市特有因素(商圈变化/人员调整/竞争格局)。',
          severity: 'warning',
          weight: 1.5
        });
      }
    }

    causes.sort(function(a, b) {
      if (a.severity === 'danger' && b.severity !== 'danger') return -1;
      if (a.severity !== 'danger' && b.severity === 'danger') return 1;
      var wa = a.weight || 1, wb = b.weight || 1;
      return wb - wa; // 高权重排前面
    });

    // V4新增: 返回crossAlerts和总cause数
    return {
      city: cityName, module: moduleKey,
      anomalyLevel: anomaly.level,
      anomalyScore: anomaly.score || 0,
      triggers: anomaly.triggers,
      trendAlerts: anomaly.trendAlerts || [],
      crossAlerts: anomaly.crossAlerts || [],
      causes: causes,
      causeCount: causes.length,
      summary: causes.length > 0 ? causes[0].title : null,
      statsUsed: anomaly.statsUsed || false
    };
  }

  function renderRootCausePanel(cityName, moduleKey) {
  const analysis = analyzeAnomalyRootCause(cityName, moduleKey);
  if (!analysis || analysis.causes.length === 0) return '';

  let html = '<div class="root-cause-panel">';
  html += '<div class="an-title"><i class= an-primary-mr"fas fa-search-plus" ></i>自动归因分析</div>';

  for (const cause of analysis.causes) {
  const cls = cause.severity === 'danger' ? 'rc-danger' : 'rc-warn';
  html += '<div class="rc-item ' + cls + '">';
  html += '<div class="rc-title">' + cause.title + '</div>';
  html += '<div class="rc-detail">' + cause.detail + '</div>';
  html += '</div>';
  }

  // 优化建议
  html += '<div class="an-primary-box">';
  const topCause = analysis.causes[0];
  if (topCause) {
  html += '<strong>建议:</strong> ';
  switch (topCause.type) {
  case 'cost_driver':
  html += '重点关注' + topCause.metric + '优化，检查是否有异常增长项';
  break;
  case 'subsidy_structure':
  html += '审查补贴投放效率，考虑降低低ROI补贴项';
  break;
  case 'delivery_cost':
  html += '优化配送成本结构，评估加盟/众包/月跑配比';
  break;
  case 'low_aov':
  html += '提升客单价策略，如满减优化、高客单品类推广';
  break;
  case 'fixed_cost':
  html += '检视固定成本项，评估是否有压缩空间';
  break;
  case 'trend_worsening':
  html += 'UE持续恶化，需紧急排查原因并制定改善方案';
  break;
  case 'subsidy_b_high':
  html += '审查B端补贴投放效率，关注加盟商补贴依赖度';
  break;
  case 'subsidy_c_high':
  html += '评估C端补贴ROI，优化补贴策略和活动设计';
  break;
  case 'platform_cost':
  html += '分析平台成本构成，重点优化高占比项(抽佣/售后/罚款)';
  break;
  case 'penalty':
  html += '排查罚款原因，制定配送质量/时效改善方案';
  break;
  case 'subsidy_trend':
  html += '补贴率持续上升，需评估补贴投放策略是否合理';
  break;
  case 'delivery_trend':
  html += '配送成本率上升，评估配送渠道结构和单量变化';
  break;
  case 'trend_alert':
  html += '指标趋势恶化，需综合分析原因并制定改善方案';
  break;
  default:
  html += '综合分析异常指标，制定针对性改善措施';
  }
  }
  html += '</div>';
  html += '</div>';
  return html;
  }

  // ===== T10: 城市排名变化 =====
  function getCityRankingData(dimension) {
  // T10 V2: 支持多维度排名切换 (ue/profitRate/orders/subsidyRatio/deliveryCostRate/anomalyScore)
  // dimension: 排序维度, 默认'ue'
  var dim = dimension || 'ue';
  var dimConfig = {
    ue:              { key: 'ue',              label: 'UE单均利润',  unit: '元',  sortDesc: true },
    profitRate:      { key: 'profitRate',      label: '利润率',      unit: '%',   sortDesc: true },
    orders:          { key: 'orders',          label: '订单量',      unit: '单',  sortDesc: true },
    subsidyRatio:    { key: 'subsidyRatio',    label: '补贴率',      unit: '%',   sortDesc: false },
    deliveryCostRate:{ key: 'deliveryCostRate', label: '配送成本率', unit: '%',   sortDesc: false },
    anomalyScore:    { key: '_anomalyScore',   label: '异常评分',    unit: '分',  sortDesc: true }
  };
  var cfg = dimConfig[dim] || dimConfig.ue;
  var allData = DataStore.loadAll();
  var dates = Object.keys(allData).sort();
  var mt = state.currentMerchant || 'all';
  if (dates.length < 2) return null;
  var currDate = dates[dates.length - 1];
  var prevDate = dates[dates.length - 2];
  var currCities = ((allData[currDate].merchantData || {})[mt] || {}).cities || [];
  var prevCities = ((allData[prevDate].merchantData || {})[mt] || {}).cities || [];

  function extractVal(city, dimKey) {
    var mod = city.modules['all'] || {};
    if (dimKey === '_anomalyScore') {
      // 异常评分: 使用V3引擎
      var prevCitiesForV3 = ((allData[prevDate].merchantData || {})[mt] || {}).cities || [];
      var prevMod = null;
      for (var pi = 0; pi < prevCitiesForV3.length; pi++) {
        if (prevCitiesForV3[pi].name === city.name) { prevMod = prevCitiesForV3[pi].modules['all'] || {}; break; }
      }
      var v3result = (typeof getAnomalyLevelV3 === 'function') ? getAnomalyLevelV3(mod, prevMod) : null;
      return v3result ? v3result.score : 0;
    }
    return mod[dimKey] || 0;
  }

  var currList = currCities.filter(function(c) { return c.name !== '总商'; }).map(function(c) {
    return { name: c.name, displayName: c.displayName || c.name, value: extractVal(c, cfg.key) };
  }).sort(function(a, b) { return cfg.sortDesc ? b.value - a.value : a.value - b.value; });

  var prevList = prevCities.filter(function(c) { return c.name !== '总商'; }).map(function(c) {
    return { name: c.name, value: extractVal(c, cfg.key) };
  });

  // 统计指标: 均值、中位数、标准差
  var vals = currList.map(function(c) { return c.value; }).filter(function(v) { return v !== 0 || cfg.key === '_anomalyScore'; });
  var avg = vals.length > 0 ? vals.reduce(function(a, b) { return a + b; }, 0) / vals.length : 0;
  var sortedVals = vals.slice().sort(function(a, b) { return a - b; });
  var median = sortedVals.length > 0 ? sortedVals[Math.floor(sortedVals.length / 2)] : 0;
  var variance = vals.length > 1 ? vals.reduce(function(s, v) { return s + Math.pow(v - avg, 2); }, 0) / (vals.length - 1) : 0;
  var stddev = Math.sqrt(variance);

  // T10 V3: 百分位计算
  var percentile = function(val, arr) {
    if (arr.length < 2) return 50;
    var below = arr.filter(function(v) { return v < val; }).length;
    return Math.round(below / (arr.length - 1) * 100);
  };
  // 箱线图边界
  var q1Val = sortedVals[Math.floor(sortedVals.length * 0.25)] || 0;
  var q3Val = sortedVals[Math.floor(sortedVals.length * 0.75)] || 0;
  var iqrVal = q3Val - q1Val;
  var whiskerLow = Math.max(sortedVals[0], q1Val - 1.5 * iqrVal);
  var whiskerHigh = Math.min(sortedVals[sortedVals.length - 1], q3Val + 1.5 * iqrVal);

  return {
    currDate: currDate, prevDate: prevDate, dimension: dim,
    dimLabel: cfg.label, dimUnit: cfg.unit,
    avg: avg, median: median, stddev: stddev,
    q1: q1Val, q3: q3Val, iqr: iqrVal, whiskerLow: whiskerLow, whiskerHigh: whiskerHigh,
    rankings: currList.map(function(c, i) {
      var pct = percentile(c.value, vals);
      var prevIdx = -1;
      for (var j = 0; j < prevList.length; j++) { if (prevList[j].name === c.name) { prevIdx = j; break; } }
      var prevRank = prevIdx >= 0 ? prevIdx + 1 : null;
      var prevVal = prevIdx >= 0 ? prevList[prevIdx].value : null;
      var rankChange = prevRank !== null ? prevRank - (i + 1) : null;
      var valChange = prevVal !== null ? c.value - prevVal : null;
      return {
        rank: i + 1, name: c.displayName || c.name, value: c.value,
        percentile: pct, isOutlier: (c.value < whiskerLow || c.value > whiskerHigh),
        prevRank: prevRank, rankChange: rankChange, prevVal: prevVal, valChange: valChange
      };
    }),
    newCities: currList.filter(function(c) {
      for (var j = 0; j < prevList.length; j++) { if (prevList[j].name === c.name) return false; } return true;
    }).map(function(c) { return c.displayName || c.name; }),
    removedCities: prevList.filter(function(p) {
      for (var j = 0; j < currList.length; j++) { if (currList[j].name === p.name) return false; } return true;
    }).map(function(p) { return p.displayName || p.name; })
  };
  }

  function renderCityRankingChange(dimension) {
  // T10 V2: 6维度排名面板 (ue/profitRate/orders/subsidyRatio/deliveryCostRate/anomalyScore)
  var container = document.getElementById('cityRankingChangeContainer');
  if (!container) return;
  var dim = dimension || 'ue';
  var data = getCityRankingData(dim);
  if (!data) {
    container.innerHTML = '<div class="an-empty">需要至少2期数据才能显示排名变化</div>';
    return;
  }
  var dimLabels = {
    ue: 'UE单均利润', profitRate: '利润率', orders: '订单量',
    subsidyRatio: '补贴率', deliveryCostRate: '配送成本率', anomalyScore: '异常评分'
  };
  var dimBtns = Object.keys(dimLabels).map(function(k) {
    var active = k === dim ? 'background:var(--primary);color:#fff;' : 'background:var(--bg-sec);color:var(--text-sec);';
    return '<button onclick="renderCityRankingChange(\'' + k + '\')" style="' + active + 'border:none;border-radius:4px;padding:3px 8px;font-size:11px;cursor:pointer;margin-right:4px;">' + dimLabels[k] + '</button>';
  }).join('');
  var html = '<div class="an-mb">';
  html += '<div class= an-mb-sm"an-flex-between" >';
  html += '<span class="an-subtitle">城市排名变化</span>';
  html += '<span class="an-sm">' + data.prevDate.slice(5) + ' → ' + data.currDate.slice(5) + '</span>';
  html += '</div>';
  html += '<div class="an-flex-wrap-xs">' + dimBtns + '</div>';
  html += '</div>';
  var isPercent = dim === 'profitRate' || dim === 'subsidyRatio' || dim === 'deliveryCostRate';
  var valFmt = function(v) { return v !== null ? (isPercent ? (v * 100).toFixed(1) + '%' : (dim === 'orders' ? Math.round(v) : v.toFixed(2))) : '-'; };
  var valGood = dim === 'anomalyScore' ? function(c) { return c < 0; } : function(c) { return c >= 0; };
  html += '<table class= an-table-sm"period-compare-table" >';
  html += '<thead><tr>';
  html += '<th class="an-td-l">当前排名</th>';
  html += '<th class="an-td-l">城市</th>';
  html += '<th class="an-td-r2">' + data.dimLabel + '</th>';
  html += '<th class="an-td-c">上期排名</th>';
  html += '<th class="an-td-c">排名变化</th>';
  html += '<th class="an-td-r2">变化值</th>';
  html += '</tr></thead><tbody>';
  // 均值参考行 + T10 V3箱线图参考
  var avgColor = 'var(--text-sec)';
  var avgHtml = valFmt(data.avg);
  if (data.stddev > 0) avgHtml += ' (σ=' + (dim === 'orders' ? Math.round(data.stddev) : data.stddev.toFixed(2)) + ')';
  html += '<tr class="an-sec-italic">';
  html += '<td class="an-td-s">-</td>';
  html += '<td class="an-td-s an-sec">均值(中位数:' + valFmt(data.median) + ')</td>';
  html += '<td class="an-td-r-sec">' + avgHtml + '</td>';
  html += '<td class="an-td-s" colspan="3"></td>';
  html += '</tr>';
  // T10 V3: IQR箱线图参考行
  if (data.q1 !== undefined) {
    var iqrHtml = 'Q1=' + valFmt(data.q1) + ' | Q3=' + valFmt(data.q3);
    if (data.iqr > 0) iqrHtml += ' | IQR=' + valFmt(data.iqr);
    html += '<tr class="an-sec-italic-blue">';
    html += '<td class="an-td-xs">-</td>';
    html += '<td class="an-pad-xs" colspan="4">' + iqrHtml + '</td>';
    html += '<td class="an-td-c-xs">箱线图</td>';
    html += '</tr>';
  }
  for (var ri = 0; ri < data.rankings.length; ri++) {
    var r = data.rankings[ri];
    var rankCls = r.rank <= 3 ? 'class="an-primary-fw"' : '';
    var changeHtml = '-';
    if (r.rankChange !== null) {
      if (r.rankChange > 0) changeHtml = '<span class="an-green-fw">↑' + r.rankChange + '</span>';
      else if (r.rankChange < 0) changeHtml = '<span class="an-red-fw">↓' + Math.abs(r.rankChange) + '</span>';
      else changeHtml = '<span class="an-sec">-</span>';
    } else {
      changeHtml = '<span class="an-warn-xs">新</span>';
    }
    var valChangeHtml = '-';
    if (r.valChange !== null) {
      var isGood = valGood(r.valChange);
      var prefix = isGood ? '+' : '';
      valChangeHtml = '<span style="color:' + (isGood ? '#27ae60' : '#e74c3c') + ';font-weight:500;">' + prefix + valFmt(r.valChange) + '</span>';
    }
    // T10 V3: 百分位着色 + 异常标识
    var valBg = '';
    var outlierMark = '';
    if (data.stddev > 0) {
      var zScore = (r.value - data.avg) / data.stddev;
      if (zScore > 1) valBg = 'background:rgba(39,174,96,0.08);';
      else if (zScore < -1) valBg = 'background:rgba(231,76,60,0.08);';
    }
    // T10 V3: 箱线图异常值标识
    if (r.isOutlier) {
      valBg = valBg || 'background:rgba(231,76,60,0.12);';
      outlierMark = ' <span class="an-red-xs" title="箱线图异常值(IQR外)">OUT</span>';
    }
    html += '<tr style="' + valBg + '">';
    html += '<td class="an-td-m" ' + rankCls + '>' + r.rank + '</td>';
    html += '<td class="an-td-m">' + r.name + outlierMark + '<span class="an-sec-xs-ml">P' + (r.percentile || '-') + '</span></td>';
    html += '<td class="an-td-r-fw3">' + valFmt(r.value) + '</td>';
    html += '<td class="an-td-c-sec">' + (r.prevRank || '-') + '</td>';
    html += '<td class="an-td-c">' + changeHtml + '</td>';
    html += '<td class="an-td-r3">' + valChangeHtml + '</td>';
    html += '</tr>';
  }
  html += '</tbody></table>';
  if (data.newCities.length > 0 || data.removedCities.length > 0) {
    html += '<div class="an-mt">';
    if (data.newCities.length > 0) html += '新增城市: ' + data.newCities.join(', ') + '  ';
    if (data.removedCities.length > 0) html += '移除城市: ' + data.removedCities.join(', ');
    html += '</div>';
  }
  container.innerHTML = html;
  }

  // ===== T6: 补贴四维分析 =====
  function renderSubsidyBreakdown(m, cityName, moduleName, prev) {
  const subB = m.subsidyB || 0;
  const subC = m.subsidyC || 0;
  const subSpecial = m.specialSubsidy || 0;
  const subWeather = m.weatherSubsidy || 0;
  const subPinDan = m.pinDanSubsidy || 0;
  const subPinHaoFan = m.pinHaoFanSubsidy || 0;
  const subCrowdAdj = m.crowdSubsidyAdjust || 0;
  const subTotal = m.subsidyTotal || 0;

  // 四维归类
  const dimensions = [
  {
  name: 'B端代补',
  amount: subB,
  rate: m.gmvAmount > 0 ? subB / m.gmvAmount : 0,
  color: '#3b82f6',
  bgColor: '#eff6ff',
  borderColor: '#bfdbfe',
  desc: 'B端(商家端)补贴，直接影响商家经营积极性'
  },
  {
  name: 'C端代补',
  amount: subC,
  rate: m.gmvAmount > 0 ? subC / m.gmvAmount : 0,
  color: '#8b5cf6',
  bgColor: '#f5f3ff',
  borderColor: '#ddd6fe',
  desc: 'C端(用户端)补贴，直接影响用户下单意愿'
  },
  {
  name: '活动专项',
  amount: subSpecial + subPinDan + subPinHaoFan + subCrowdAdj,
  rate: m.gmvAmount > 0 ? (subSpecial + subPinDan + subPinHaoFan + subCrowdAdj) / m.gmvAmount : 0,
  color: '#f59e0b',
  bgColor: '#fffbeb',
  borderColor: '#fde68a',
  desc: '专项活动补贴(拼单/拼好饭/特殊补贴等)'
  },
  {
  name: '天气临时',
  amount: subWeather,
  rate: m.gmvAmount > 0 ? subWeather / m.gmvAmount : 0,
  color: '#10b981',
  bgColor: '#ecfdf5',
  borderColor: '#a7f3d0',
  desc: '天气补贴，恶劣天气骑手额外补贴'
  }
  ];

  const totalRate = m.gmvAmount > 0 ? subTotal / m.gmvAmount : 0;

  // B/C比分析
  const bcRatio = subC > 0 ? (subB / subC).toFixed(2) : 'N/A';
  const activityPct = subTotal > 0 ? ((subSpecial + subPinDan + subPinHaoFan + subCrowdAdj + subWeather) / subTotal * 100).toFixed(1) : '0';

  let html = `<div class= an-mt-xl"subsidy-breakdown-card" >
  <div class="card-title an-flex-between" >
  <span>补贴四维分析 - ${cityName}${moduleName}</span>
  <span class="an-sm-sec2">总代补: ${fmtWan(subTotal)} (${fmtPct(totalRate)})</span>
  </div>

  <div class= an-grid4-lg"subsidy-dims" >`;

  for (const dim of dimensions) {
  const pct = subTotal > 0 ? (dim.amount / subTotal * 100).toFixed(1) : '0';
  const barWidth = subTotal > 0 ? Math.min(dim.amount / subTotal * 100, 100) : 0;
  html += `
  <div class="subsidy-dim-item" style="background:${dim.bgColor};border:1px solid ${dim.borderColor};border-radius:8px;padding:12px">
  <div style="font-size:13px;font-weight:600;color:${dim.color}">${dim.name}</div>
  <div class="an-h3-mt">${fmtWan(dim.amount)}</div>
  <div class="an-sm2-mb">
  占GMV ${fmtPct(dim.rate)} / 占总代补 ${pct}%
  </div>
  <div class="an-bar-track">
  <div style="background:${dim.color};width:${barWidth}%;height:100%;border-radius:3px;transition:width 0.3s"></div>
  </div>
  <div class= an-mt-6"an-sm2" >${dim.desc}</div>
  </div>`;
  }

  html += `</div>`;

  // B/C结构分析
  html += `<div class="subsidy-insight ft-cost-gray-card">
  <strong>结构洞察:</strong> `;
  const insights = [];
  if (subC > subB * 3) {
  insights.push(`C端补贴占比显著偏高(${fmtPct(subC / subTotal)})，B/C比为${bcRatio}，建议优化C端补贴策略`);
  } else if (subB > subC) {
  insights.push(`B端补贴(${fmtWan(subB)})超过C端(${fmtWan(subC)})，B/C比为${bcRatio}`);
  } else {
  insights.push(`B/C结构均衡，B端${fmtPct(subB/subTotal)}/C端${fmtPct(subC/subTotal)}，B/C比${bcRatio}`);
  }
  if (parseFloat(activityPct) > 10) {
  insights.push(`活动+天气补贴占比${activityPct}%，注意控制临时性支出`);
  }
  if (subWeather > 0 && subTotal > 0) {
  insights.push(`天气补贴${fmtWan(subWeather)}(${(subWeather/subTotal*100).toFixed(1)}%)`);
  }
  html += insights.join('；') + `</div>`;

  // 如果有上期数据，展示环比变化
  if (prev && prev.subsidy !== undefined) {
  const subDiff = subTotal - prev.subsidy;
  const subRate = prev.subsidy !== 0 ? ((subDiff / Math.abs(prev.subsidy)) * 100).toFixed(1) : '0';
  const dir = subDiff > 0 ? 'up' : subDiff < 0 ? 'down' : '';
  const arrow = subDiff > 0 ? '&#9650;' : subDiff < 0 ? '&#9660;' : '-';
  html += `<div class= an-mt-sm-right"subsidy-trend" >
  较上期: <span class="val-${dir}">${subDiff > 0 ? '+' : ''}${fmtWan(subDiff)} (${arrow} ${Math.abs(parseFloat(subRate))}%)</span>
  </div>`;
  }

  // 四维健康度评分 (0-100, 越高越健康)
  var healthScore = 100;
  var healthDeducts = [];
  // 总补贴率过高扣分
  if (totalRate > 0.45) { healthScore -= 25; healthDeducts.push('总补贴率>' + (45) + '%'); }
  else if (totalRate > 0.35) { healthScore -= 15; healthDeducts.push('总补贴率>' + (35) + '%'); }
  // C端占比过高扣分
  var cPct = subTotal > 0 ? subC / subTotal : 0;
  if (cPct > 0.5) { healthScore -= 15; healthDeducts.push('C端占比>' + (50) + '%'); }
  else if (cPct > 0.35) { healthScore -= 8; healthDeducts.push('C端占比>' + (35) + '%'); }
  // 活动补贴占比过高扣分
  var actPct = subTotal > 0 ? (subSpecial + subPinDan + subPinHaoFan + subCrowdAdj) / subTotal : 0;
  if (actPct > 0.3) { healthScore -= 10; healthDeducts.push('活动补贴占比>' + (30) + '%'); }
  // 天气补贴异常扣分
  var weatherPct = subTotal > 0 ? subWeather / subTotal : 0;
  if (weatherPct > 0.2) { healthScore -= 10; healthDeducts.push('天气补贴占比>' + (20) + '%'); }
  // 补贴效率: 补贴率/UE比(越低越好)
  var subUeRatio = ue > 0 ? totalRate / ue : 999;
  if (subUeRatio > 2) { healthScore -= 15; healthDeducts.push('补贴/UE比>2(效率低)'); }
  else if (subUeRatio > 1) { healthScore -= 8; healthDeducts.push('补贴/UE比>1'); }
  healthScore = Math.max(0, healthScore);
  var healthColor = healthScore >= 80 ? '#27ae60' : healthScore >= 60 ? '#f39c12' : '#e74c3c';
  var healthLabel = healthScore >= 80 ? '健康' : healthScore >= 60 ? '需关注' : '高风险';

  // 健康度面板
  html += '<div class="an-card" style="margin-top:12px;background:' + (healthScore >= 80 ? '#ecfdf5' : healthScore >= 60 ? '#fffbeb' : '#fef2f2') + ';border:1px solid ' + healthColor + ';">';
  html += '<div class="an-flex-between">';
  html += '<span class="an-subtitle" style="color:' + healthColor + '">补贴健康度: ' + healthLabel + '</span';
  html += '<span class="an-big" style="color:' + healthColor + '">' + healthScore + '<span class="an-fw-normal">/100</span></span';
  html += '</div>';
  if (healthDeducts.length > 0) {
    html += '<div class="an-mt">扣分项: ' + healthDeducts.join('、') + '</div>';
  }
  // 补贴效率指标
  if (ue > 0) {
    html += '<div class="an-mt-sm">补贴效率指标: 补贴率/GMV=' + (totalRate * 100).toFixed(1) + '%，UE=' + ue.toFixed(2) + '元，补贴/UE比=' + subUeRatio.toFixed(2) + (subUeRatio <= 1 ? '(优秀)' : subUeRatio <= 1.5 ? '(一般)' : '(需优化)') + '</div>';
  }
  html += '</div>';

  // 补贴ROI分析(新增V4)
  var roiHtml = '';
  var onlineRev = m.onlineRevenue || 0;
  var grossProfit = m.profit || 0;
  var subsidyRoi = subTotal > 0 ? grossProfit / subTotal : 0;
  var subsidyIncomeRoi = subTotal > 0 ? onlineRev / subTotal : 0;
  // 补贴效率分级
  var roiLevel = subsidyRoi >= 0.3 ? { label: '优秀', color: '#27ae60', desc: '每投入1元补贴产出' + subsidyRoi.toFixed(2) + '元利润' }
    : subsidyRoi >= 0.1 ? { label: '一般', color: '#f39c12', desc: '每投入1元补贴产出' + subsidyRoi.toFixed(2) + '元利润' }
    : subsidyRoi >= 0 ? { label: '低效', color: '#e74c3c', desc: '每投入1元补贴仅产出' + subsidyRoi.toFixed(2) + '元利润' }
    : { label: '亏损', color: '#c0392b', desc: '补贴超过利润，每投入1元补贴亏损' + Math.abs(subsidyRoi).toFixed(2) + '元' };
  roiHtml += '<div class="an-card" style="margin-top:12px;background:' + (subsidyRoi >= 0.1 ? '#f0fdf4' : '#fef2f2') + ';border:1px solid ' + roiLevel.color + ';">';
  roiHtml += '<div class="an-subtitle" style="color:' + roiLevel.color + '">补贴ROI分析</div';
  roiHtml += '<div class="an-grid3-mt">';
  roiHtml += '<div class="an-center"><div class="an-sm">利润/补贴比</div><div class="an-big" style="color:' + roiLevel.color + '">' + subsidyRoi.toFixed(2) + '</div<div class="an-fs10" style="color:' + roiLevel.color + '">' + roiLevel.label + '</div</div>';
  roiHtml += '<div class="an-center"><div class="an-sm">收入/补贴比</div><div class="an-big">' + subsidyIncomeRoi.toFixed(2) + '</div><div class="an-xs">杠杆倍数</div></div>';
  roiHtml += '<div class="an-center"><div class="an-sm">UE/补贴率比</div><div class="an-big">' + (subUeRatio !== undefined ? subUeRatio.toFixed(2) : 'N/A') + '</div><div class="an-xs">效率指标</div></div>';
  roiHtml += '</div>';
  roiHtml += '<div class="an-mt-sm">' + roiLevel.desc + '；收入杠杆' + subsidyIncomeRoi.toFixed(1) + '倍(每1元补贴撬动' + subsidyIncomeRoi.toFixed(1) + '元收入)</div>';
  // 补贴结构建议
  var roiSuggestion = '';
  if (subsidyRoi < 0) {
    roiSuggestion = '建议: 补贴总额(' + fmtWan(subTotal) + ')已超过利润(' + fmtWan(grossProfit) + ')，需大幅优化补贴结构或缩减补贴规模';
  } else if (subsidyRoi < 0.1) {
    roiSuggestion = '建议: 补贴效率偏低，建议审查C端补贴(' + fmtWan(subC) + ')和B端补贴(' + fmtWan(subB) + ')的投放效果';
  } else if (cPct > 0.4) {
    roiSuggestion = '建议: C端补贴占比过高(' + (cPct * 100).toFixed(0) + '%)，考虑将部分C端补贴转为B端激励';
  }
  if (roiSuggestion) {
    roiHtml += '<div class="an-mt-warn">' + roiSuggestion + '</div>';
  }
  roiHtml += '</div>';

  html += roiHtml;

  // 各维度环比变化(如果有上期数据)
  if (prev) {
    var prevSubB = prev.subsidyB || 0;
    var prevSubC = prev.subsidyC || 0;
    var prevSubSpecial = prev.specialSubsidy || 0;
    var prevSubWeather = prev.weatherSubsidy || 0;
    var prevSubPinDan = prev.pinDanSubsidy || 0;
    var prevSubPinHaoFan = prev.pinHaoFanSubsidy || 0;
    var prevSubCrowdAdj = prev.crowdSubsidyAdjust || 0;
    var prevSubTotal = prev.subsidyTotal || 0;
    var dimChanges = [
      { name: 'B端代补', curr: subB, prev: prevSubB },
      { name: 'C端代补', curr: subC, prev: prevSubC },
      { name: '活动专项', curr: subSpecial + subPinDan + subPinHaoFan + subCrowdAdj, prev: prevSubSpecial + prevSubPinDan + prevSubPinHaoFan + prevSubCrowdAdj },
      { name: '天气临时', curr: subWeather, prev: prevSubWeather }
    ];
    html += '<div class="an-grid4-mt">';
    for (var di = 0; di < dimChanges.length; di++) {
      var dc = dimChanges[di];
      var diff = dc.curr - dc.prev;
      var diffPct = dc.prev !== 0 ? (diff / Math.abs(dc.prev) * 100).toFixed(1) : '0';
      var diffColor = Math.abs(diff) < 500 ? 'var(--text-sec)' : diff > 0 ? '#e74c3c' : '#27ae60';
      var diffIcon = diff > 500 ? '&#9650;' : diff < -500 ? '&#9660;' : '-';
      html += '<div class= an-td-bg"an-center" >';
      html += '<div class="an-sec">' + dc.name + '</div>';
      html += '<div style="color:' + diffColor + ';font-weight:600;">' + diffIcon + ' ' + (diff > 0 ? '+' : '') + (diff / 10000).toFixed(2) + '万</div>';
      html += '<div class="an-sec">' + (diff > 0 ? '+' : '') + Math.abs(parseFloat(diffPct)) + '%</div>';
      html += '</div>';
    }
    html += '</div>';
  }

  html += `</div>`;
  return html;
  }
// T6 V2: 补贴趋势分析面板 - 多期补贴结构变化追踪
function renderSubsidyTrend(cityName, moduleName) {
  var container = document.getElementById('subsidyBreakdownContainer');
  if (!container) return '';
  
  var allData = DataStore.loadAll();
  var dates = Object.keys(allData).sort();
  if (dates.length < 2) return '<div class="an-diff-sec">需要至少2期数据</div>';
  
  var mt = moduleName === 'all' ? (state.currentMerchant || 'all') : 'all';
  var cityData = [];
  for (var di = 0; di < dates.length; di++) {
    var cities = ((allData[dates[di]].merchantData || {})[mt] || {}).cities || [];
    var found = null;
    for (var ci = 0; ci < cities.length; ci++) {
      if (cities[ci].name === cityName) { found = cities[ci]; break; }
    }
    if (found) {
      var mod = found.modules['all'] || {};
      cityData.push({
        date: dates[di],
        subsidyTotal: mod.subsidyTotal || 0,
        subsidyB: mod.subsidyB || 0,
        subsidyC: mod.subsidyC || 0,
        specialSubsidy: mod.specialSubsidy || 0,
        weatherSubsidy: mod.weatherSubsidy || 0,
        pinDanSubsidy: mod.pinDanSubsidy || 0,
        pinHaoFanSubsidy: mod.pinHaoFanSubsidy || 0,
        crowdSubsidyAdjust: mod.crowdSubsidyAdjust || 0,
        gmvAmount: mod.gmvAmount || 0,
        profit: mod.profit || 0,
        ue: mod.ue || 0,
        orders: mod.orders || 0
      });
    }
  }
  
  if (cityData.length < 2) return '<div class="an-diff-sec">该城市数据不足2期</div>';
  
  // 取最近3期(最多)
  var recent = cityData.slice(-3);
  var html = '<div class="an-box-sec">';
  html += '<div class="an-title">补贴趋势追踪(近{}期)</div>'.format(recent.length);
  
  // 趋势表头
  html += '<table class="an-table-xs">';
  html += '<thead><tr class="an-border-b">';
  html += '<th class="an-td-l-sec">日期</th>';
  html += '<th class="an-td-r-sec">补贴总额</th>';
  html += '<th class="an-td-r-sec">B端代补</th>';
  html += '<th class="an-td-r-sec">C端代补</th>';
  html += '<th class="an-td-r-sec">活动专项</th>';
  html += '<th class="an-td-r-sec">补贴率</th>';
  html += '<th class="an-td-r-sec">UE</th>';
  html += '</tr></thead><tbody>';
  
  for (var ri = 0; ri < recent.length; ri++) {
    var d = recent[ri];
    var subRate = d.gmvAmount > 0 ? (d.subsidyTotal / d.gmvAmount * 100) : 0;
    var activityAmt = d.specialSubsidy + d.weatherSubsidy + d.pinDanSubsidy + d.pinHaoFanSubsidy + d.crowdSubsidyAdjust;
    
    html += '<tr class="an-border-b">';
    html += '<td class="an-pad-none">' + d.date.slice(5) + '</td>';
    html += '<td class="an-td-r-fw2">' + d.subsidyTotal.toFixed(0) + '</td>';
    html += '<td class="an-td-r">' + d.subsidyB.toFixed(0) + '</td>';
    html += '<td class="an-td-r">' + d.subsidyC.toFixed(0) + '</td>';
    html += '<td class="an-td-r">' + activityAmt.toFixed(0) + '</td>';
    html += '<td class="an-td-r" style="' + (subRate > 40 ? 'color:#e74c3c;font-weight:600;' : subRate > 30 ? 'color:#f39c12;' : '') + '">' + subRate.toFixed(1) + '%</td';
    html += '<td class="an-td-r" style="' + (d.ue < 2 ? 'color:#e74c3c;' : d.ue < 3 ? 'color:#f39c12;' : 'color:#27ae60;') + '">' + d.ue.toFixed(2) + '</td';
    html += '</tr>';
  }
  html += '</tbody></table>';
  
  // 补贴结构变化分析
  if (recent.length >= 2) {
    var latest = recent[recent.length - 1];
    var prev = recent[recent.length - 2];
    var totalChange = latest.subsidyTotal - prev.subsidyTotal;
    var totalRate = prev.subsidyTotal > 0 ? (totalChange / prev.subsidyTotal * 100) : 0;
    var bChange = prev.subsidyB > 0 ? ((latest.subsidyB - prev.subsidyB) / prev.subsidyB * 100) : 0;
    var cChange = prev.subsidyC > 0 ? ((latest.subsidyC - prev.subsidyC) / prev.subsidyC * 100) : 0;
    
    html += '<div class="an-border-t-mt">';
    html += '<div class="an-title-mb-sm">环比变化</div>';
    html += '<div class="an-flex-wrap">';
    html += '<span>总额: <b style="color:' + (totalChange > 0 ? '#e74c3c' : '#27ae60') + ';">' + (totalChange > 0 ? '+' : '') + totalRate.toFixed(1) + '%</b></span>';
    html += '<span>B端: <b style="color:' + (bChange > 0 ? '#e74c3c' : '#27ae60') + ';">' + (bChange > 0 ? '+' : '') + bChange.toFixed(1) + '%</b></span>';
    html += '<span>C端: <b style="color:' + (cChange > 0 ? '#e74c3c' : '#27ae60') + ';">' + (cChange > 0 ? '+' : '') + cChange.toFixed(1) + '%</b></span>';
    html += '</div>';
    
    // 补贴效率判断
    var latestEff = latest.gmvAmount > 0 ? (latest.profit / latest.subsidyTotal) : 0;
    var prevEff = prev.gmvAmount > 0 ? (prev.profit / prev.subsidyTotal) : 0;
    var effChange = latestEff - prevEff;
    if (latest.subsidyTotal > 0 && prev.subsidyTotal > 0) {
      html += '<div class="an-box-main">';
      if (effChange < -0.05) {
        html += '<span class="an-red">补贴效率下降: 利润/补贴比从' + prevEff.toFixed(2) + '降至' + latestEff.toFixed(2) + '</span>';
      } else if (effChange > 0.05) {
        html += '<span class="an-green">补贴效率提升: 利润/补贴比从' + prevEff.toFixed(2) + '升至' + latestEff.toFixed(2) + '</span>';
      } else {
        html += '<span class="an-sec">补贴效率持平: 利润/补贴比' + latestEff.toFixed(2) + '</span>';
      }
      html += '</div>';
    }
    html += '</div>';
  }
  
  html += '</div>';
  return html;
}






// ===== T3/T8: 多期对比分析函数 =====

/**
 * 获取城市指标的多期趋势
 * @param {string} cityName - 城市名称
 * @param {string} metricKey - 指标key
 * @returns {Array<{date, value}>}
 */
function getMultiPeriodTrend(cityName, metricKey) {
    const allData = DataStore.loadAll();
    const dates = Object.keys(allData).sort();
    const mt = state.currentMerchant || 'all';
    const trend = [];
    // 缓存索引(同一次刷新内避免重复构建)
    if (!getMultiPeriodTrend._cache) getMultiPeriodTrend._cache = {};
    const cacheKey = mt + '_' + metricKey;
    let cachedIndex = getMultiPeriodTrend._cache[cacheKey];
    if (!cachedIndex) {
      cachedIndex = {};
      for (const d of dates) {
        const cities = ((allData[d].merchantData || {})[mt] || {}).cities || [];
        for (const c of cities) {
          const name = c.name || c.displayName;
          if (!name) continue;
          if (!cachedIndex[name]) cachedIndex[name] = {};
          const mod = (c.modules || {})['all'] || {};
          cachedIndex[name][d] = mod;
        }
      }
      getMultiPeriodTrend._cache[cacheKey] = cachedIndex;
    }
    for (const d of dates) {
      const mod = (cachedIndex[cityName] || {})[d] || {};
      const val = mod[metricKey];
      if (val !== undefined && val !== null) {
        trend.push({ date: d, value: val });
      }
    }
    return trend;
}

/**
 * 跨期变化分析 (T8多期对比核心)
 * @param {string} metricKey - 指标key
 * @returns {{improved, worsened, stable, summary}}
 */
function getCrossPeriodChanges(metricKey) {
    metricKey = metricKey || 'ue';
    var allData = DataStore.loadAll();
    var dates = Object.keys(allData).sort();
    if (dates.length < 2) return { improved: [], worsened: [], stable: [], summary: '需要至少2期数据' };
    var latest = dates[dates.length - 1];
    var prev = dates[dates.length - 2];
    var mt = state.currentMerchant || 'all';
    var latestCities = ((allData[latest] || {}).merchantData || {})[mt] || {};
    var prevCities = ((allData[prev] || {}).merchantData || {})[mt] || {};
    var lCities = latestCities.cities || [];
    var pCities = prevCities.cities || [];
    var lMap = {}, pMap = {};
    lCities.forEach(c => { lMap[c.name || c.displayName] = c; });
    pCities.forEach(c => { pMap[c.name || c.displayName] = c; });
    var allNames = [...new Set([...Object.keys(lMap), ...Object.keys(pMap)])];
    var improved = [], worsened = [], stable = [];
    for (var name of allNames) {
      var lc = lMap[name], pc = pMap[name];
      if (!lc || !pc) continue;
      var lm = (lc.modules || {})['all'] || {};
      var pm = (pc.modules || {})['all'] || {};
      var lv = lm[metricKey], pv = pm[metricKey];
      if (lv == null || pv == null) continue;
      var diff = lv - pv;
      var entry = { city: name, from: prev, to: latest, prev: pv, latest: lv, change: diff };
      if (Math.abs(diff) < 0.01) stable.push(entry);
      else if (diff > 0) improved.push(entry);
      else worsened.push(entry);
    }
    improved.sort((a, b) => b.change - a.change);
    worsened.sort((a, b) => a.change - b.change);
    return { improved, worsened, stable, summary: '改善' + improved.length + '/恶化' + worsened.length + '/持平' + stable.length };
}

/**
 * 计算趋势环比增长率
 */
function calcEnvGrowth(trend) {
    if (trend.length < 2) return [];
    const result = [];
    for (let i = 1; i < trend.length; i++) {
      const prev = trend[i - 1].value;
      const curr = trend[i].value;
      const growth = prev !== 0 ? (curr - prev) / Math.abs(prev) * 100 : (curr !== 0 ? 100 : 0);
      result.push({
        date: trend[i].date,
        prevDate: trend[i - 1].date,
        value: curr,
        prevValue: prev,
        change: curr - prev,
        growthRate: growth
      });
    }
    return result;
}

/**
 * 渲染SVG迷你趋势图
 */
function renderTrendMiniChart(containerId, trend, label, unit) {
    const el = document.getElementById(containerId);
    if (!el || trend.length < 2) {
      if (el) el.innerHTML = '<span class="an-sec-fs">数据不足</span>';
      return;
    }
    const values = trend.map(t => t.value);
    const maxVal = Math.max(...values.map(v => Math.abs(v)), 0.001);
    const dates = trend.map(t => t.date.slice(5));
    const width = 160, height = 40, pad = 2;
    const points = values.map((v, i) => {
      const x = pad + (i / (values.length - 1)) * (width - 2 * pad);
      const y = height - pad - (Math.abs(v) / maxVal) * (height - 2 * pad);
      return x + ',' + y;
    }).join(' ');
    const growth = calcEnvGrowth(trend);
    const lastGrowth = growth.length > 0 ? growth[growth.length - 1] : null;
    let html = '<div class="trend-mini">';
    html += '<div class="trend-mini-label">' + label + '</div>';
    html += '<svg class="trend-sparkline" viewBox="0 0 ' + width + ' ' + height + '" preserveAspectRatio="none">';
    html += '<polyline points="' + points + '" fill="none" stroke="var(--primary,#3498db)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
    values.forEach((v, i) => {
      const x = pad + (i / (values.length - 1)) * (width - 2 * pad);
      const y = height - pad - (Math.abs(v) / maxVal) * (height - 2 * pad);
      html += '<circle cx="' + x + '" cy="' + y + '" r="2.5" fill="var(--primary,#3498db)" stroke="#fff" stroke-width="1"/>';
    });
    html += '</svg>';
    if (lastGrowth) {
      const isUp = lastGrowth.growthRate >= 0;
      html += '<div class="trend-mini-growth ' + (isUp ? 'up' : 'down') + '">';
      html += (isUp ? '&#9650;' : '&#9660;') + ' ' + Math.abs(lastGrowth.growthRate).toFixed(1) + '%';
      html += '</div>';
    }
    html += '<div class="trend-mini-range">' + dates[0] + ' \u2192 ' + dates[dates.length - 1] + '</div>';
    html += '</div>';
    el.innerHTML = html;
}

/**
 * T8: 渲染多期对比详细视图
 * 在index.html中的periodCompareContainer容器内渲染
 */
function renderPeriodCompare() {
    const container = document.getElementById('periodCompareContainer');
    if (!container) return;
    const allData = DataStore.loadAll();
    const dates = Object.keys(allData).sort();
    if (dates.length < 2) {
      container.innerHTML = '<div class="an-empty-lg">\u9700\u8981\u81f3\u5c112\u671f\u6570\u636e\u624d\u80fd\u5bf9\u6bd4\uff08\u5f53\u524d' + dates.length + '\u671f\uff09</div>';
      return;
    }
    const sel1 = document.getElementById('periodDate1');
    const sel2 = document.getElementById('periodDate2');
    const d1 = sel1 ? sel1.value : dates[dates.length - 2];
    const d2 = sel2 ? sel2.value : dates[dates.length - 1];
    if (!d1 || !d2 || d1 === d2) {
      container.innerHTML = '<div class="an-empty-lg">\u8bf7\u9009\u62e9\u4e24\u4e2a\u4e0d\u540c\u65e5\u671f\u8fdb\u884c\u5bf9\u6bd4</div>';
      return;
    }
    const entry1 = allData[d1];
    const entry2 = allData[d2];
    const md1 = entry1.merchantData || { all: { cities: entry1.currentData?.cities || [] } };
    const md2 = entry2.merchantData || { all: { cities: entry2.currentData?.cities || [] } };
    const mt = state.currentMerchant || 'all';
    const cities1 = (md1[mt] || {}).cities || [];
    const cities2 = (md2[mt] || {}).cities || [];
    const map1 = {};
    cities1.forEach(c => { if (c.name !== '\u603b\u5546') map1[c.displayName || c.name] = c; });
    const map2 = {};
    cities2.forEach(c => { if (c.name !== '\u603b\u5546') map2[c.displayName || c.name] = c; });
    const allCityNames = [...new Set([...Object.keys(map1), ...Object.keys(map2)])].sort();
    const modKey = 'all';
    const coreMetrics = [
      { key: 'orders', label: '\u8ba2\u5355\u91cf', fmt: v => v.toLocaleString() },
      { key: 'gmvAmount', label: 'GMV', fmt: fmtWan },
      { key: 'commission', label: '\u62bd\u4f63', fmt: fmtWan },
      { key: 'profit', label: '\u5229\u6da6', fmt: fmtWan }
    ];
    const rateMetrics = [
      { key: 'ue', label: 'UE', fmt: v => v.toFixed(2), unit: '\u5143' },
      { key: 'profitRate', label: '\u5229\u6da6\u7387', fmt: v => (v*100).toFixed(1), unit: '%' },
      { key: 'subsidyRatio', label: '\u8865\u8d34\u7387', fmt: v => (v*100).toFixed(1), unit: '%' },
      { key: 'deliveryCostRate', label: '\u914d\u9001\u6210\u672c\u7387', fmt: v => (v*100).toFixed(1), unit: '%' },
      { key: 'fixedCostRate', label: '\u56fa\u5b9a\u6210\u672c\u7387', fmt: v => (v*100).toFixed(1), unit: '%' }
    ];
    // getCellClass 内联
    function getCellClass(val, type) {
      if (type === 'ue') return val > 3 ? 'good' : val > 0 ? 'warn' : 'bad';
      if (type === 'profitRate') return val > 0.05 ? 'good' : val > 0 ? 'warn' : 'bad';
      return '';
    }
    let html = '<div class="period-compare-table-wrap">';
    html += '<div class="an-flex-between-mb">';
    html += '<div class="an-h4">\u591a\u671f\u5bf9\u6bd4\u8be6\u7ec6\u89c6\u56fe</div>';
    html += '<div class="an-hint">' + d1 + ' \u2194 ' + d2 + ' | \u57ce\u5e02' + allCityNames.length + '\u4e2a</div></div>';
    html += '<div class="an-overflow-x"><table class="period-compare-table">';
    html += '<thead><tr>';
    html += '<th rowspan= an-sticky-col"2" >\u57ce\u5e02</th>';
    html += '<th colspan= th-p1"4" >' + d1 + '</th>';
    html += '<th colspan= th-p1 an-border-l"5"  >' + d1 + ' \u7387</th>';
    html += '<th colspan= th-p2"4" >' + d2 + '</th>';
    html += '<th colspan= th-p2 an-border-l"5"  >' + d2 + ' \u7387</th>';
    html += '<th colspan= th-diff"5" >\u53d8\u5316</th>';
    html += '</tr><tr>';
    for (const m of coreMetrics) html += '<th>' + m.label + '</th>';
    for (const m of rateMetrics) html += '<th class="an-border-l">' + m.label + '</th>';
    for (const m of coreMetrics) html += '<th>' + m.label + '</th>';
    for (const m of rateMetrics) html += '<th class="an-border-l">' + m.label + '</th>';
    for (const m of rateMetrics) html += '<th class="th-diff">' + m.label + '</th>';
    html += '</tr></thead><tbody>';
    const t1 = { orders:0, gmv:0, comm:0, profit:0, ue:0, pr:0, sr:0, dr:0, fr:0, cnt:0 };
    const t2 = { orders:0, gmv:0, comm:0, profit:0, ue:0, pr:0, sr:0, dr:0, fr:0, cnt:0 };
    for (const name of allCityNames) {
      const c1 = map1[name], c2 = map2[name];
      const m1 = c1 ? (c1.modules[modKey] || {}) : {};
      const m2 = c2 ? (c2.modules[modKey] || {}) : {};
      const hasData = c1 || c2;
      if (c1) { t1.orders+=m1.orders||0; t1.gmv+=m1.gmvAmount||0; t1.comm+=m1.commission||0; t1.profit+=m1.profit||0; t1.ue+=m1.ue||0; t1.pr+=m1.profitRate||0; t1.sr+=m1.subsidyRatio||0; t1.dr+=m1.deliveryCostRate||0; t1.fr+=m1.fixedCostRate||0; t1.cnt++; }
      if (c2) { t2.orders+=m2.orders||0; t2.gmv+=m2.gmvAmount||0; t2.comm+=m2.commission||0; t2.profit+=m2.profit||0; t2.ue+=m2.ue||0; t2.pr+=m2.profitRate||0; t2.sr+=m2.subsidyRatio||0; t2.dr+=m2.deliveryCostRate||0; t2.fr+=m2.fixedCostRate||0; t2.cnt++; }
      html += '<tr' + (!hasData ? ' class="no-data"' : '') + '>';
      html += '<td class="city-name">' + name + '</td>';
      for (const m of coreMetrics) { const v = m1[m.key]; html += '<td>' + (c1 && v != null ? m.fmt(v) : '-') + '</td>'; }
      for (const m of rateMetrics) { const v = m1[m.key]; html += '<td class= ' + getCellClass(v, m.key) + '"an-border-l" >' + (c1 && v != null ? m.fmt(v) + m.unit : '-') + '</td>'; }
      for (const m of coreMetrics) { const v = m2[m.key]; html += '<td>' + (c2 && v != null ? m.fmt(v) : '-') + '</td>'; }
      for (const m of rateMetrics) { const v = m2[m.key]; html += '<td class="an-border-l ' + getCellClass(v, m.key) + '" >' + (c2 && v != null ? m.fmt(v) + m.unit : '-') + '</td>'; }
      for (const m of rateMetrics) {
        const v1 = m1[m.key]||0, v2 = m2[m.key]||0;
        const diff = v2 - v1;
        const ds = (m.key==='ue') ? diff.toFixed(2) : (diff*100).toFixed(1)+'%';
        html += '<td class="diff ' + (diff>=0?'up':'down') + '">' + (hasData&&c1&&c2 ? (diff>=0?'+':'') + ds : '-') + '</td>';
      }
      html += '</tr>';
    }
    const avg = (t, k) => t.cnt > 0 ? t[k] / t.cnt : 0;
    html += '<tr class="total-row"><td>\u5408\u8ba1/\u5e73\u5747</td>';
    for (const m of coreMetrics) { const sk = {orders:'orders',gmvAmount:'gmv',commission:'comm',profit:'profit'}[m.key]; html += '<td>' + m.fmt(t1[sk]) + '</td>'; }
    for (const m of rateMetrics) { const ak = {ue:'ue',profitRate:'pr',subsidyRatio:'sr',deliveryCostRate:'dr',fixedCostRate:'fr'}[m.key]; html += '<td class="an-border-l">' + avg(t1,ak).toFixed(2) + '</td>'; }
    for (const m of coreMetrics) { const sk = {orders:'orders',gmvAmount:'gmv',commission:'comm',profit:'profit'}[m.key]; html += '<td>' + m.fmt(t2[sk]) + '</td>'; }
    for (const m of rateMetrics) { const ak = {ue:'ue',profitRate:'pr',subsidyRatio:'sr',deliveryCostRate:'dr',fixedCostRate:'fr'}[m.key]; html += '<td class="an-border-l">' + avg(t2,ak).toFixed(2) + '</td>'; }
    for (const m of rateMetrics) { const ak = {ue:'ue',profitRate:'pr',subsidyRatio:'sr',deliveryCostRate:'dr',fixedCostRate:'fr'}[m.key]; const d=avg(t2,ak)-avg(t1,ak); const ds=(m.key==='ue')?d.toFixed(2):(d*100).toFixed(1)+'%'; html += '<td class="diff ' + (d>=0?'up':'down') + '">' + (d>=0?'+':'') + ds + '</td>'; }
    html += '</tr>';
    html += '</tbody></table></div></div>';
    
    // V2增强: 跨期变化汇总面板
    html += '<div class="period-summary-grid">';
    for (const m of rateMetrics) {
      const t1avg = avg(t1, {ue:'ue',profitRate:'pr',subsidyRatio:'sr',deliveryCostRate:'dr',fixedCostRate:'fr'}[m.key]);
      const t2avg = avg(t2, {ue:'ue',profitRate:'pr',subsidyRatio:'sr',deliveryCostRate:'dr',fixedCostRate:'fr'}[m.key]);
      const diff = t2avg - t1avg;
      const isGood = m.key === 'subsidyRatio' || m.key === 'deliveryCostRate' || m.key === 'fixedCostRate' ? diff < 0 : diff > 0;
      const ds = m.key === 'ue' ? diff.toFixed(2) : (diff*100).toFixed(1) + '%';
      html += '<div class="period-summary-card ' + (isGood ? 'good' : 'bad') + '">';
      html += '<div class="period-summary-label">' + m.label + '</div>';
      html += '<div class="period-summary-diff">' + (diff >= 0 ? '+' : '') + ds + '</div>';
      html += '<div class="period-summary-detail">' + d1 + ': ' + t1avg.toFixed(2) + ' → ' + d2 + ': ' + t2avg.toFixed(2) + '</div>';
      html += '</div>';
    }
    html += '</div>';
    
    container.innerHTML = html;
  }

/**
 * T3: 渲染环境概览(总商趋势卡片+环比明细表)
 */
function renderEnvOverview() {
    const container = document.getElementById('envOverviewContainer');
    if (!container) return;
    const allData = DataStore.loadAll();
    const dates = Object.keys(allData).sort();
    if (dates.length < 2) {
      container.innerHTML = '<div class="an-empty">\u9700\u8981\u81f3\u5c112\u671f\u6570\u636e\uff08\u5f53\u524d' + dates.length + '\u671f\uff09</div>';
      return;
    }
    const mt = state.currentMerchant || 'all';
    const cities = ((allData[dates[dates.length - 1]].merchantData || {})[mt] || {}).cities || [];
    const targetCity = cities.find(c => c.name === '\u603b\u5546');
    if (!targetCity) {
      container.innerHTML = '<div class="an-empty">\u65e0\u603b\u5546\u6570\u636e</div>';
      return;
    }
    const trendMetrics = [
      { key: 'orders', label: '\u8ba2\u5355\u91cf', unit: '\u5355' },
      { key: 'gmvAmount', label: 'GMV', unit: '\u5143' },
      { key: 'profit', label: '\u5229\u6da6', unit: '\u5143' },
      { key: 'ue', label: 'UE', unit: '\u5143' },
      { key: 'subsidyRatio', label: '\u8865\u8d34\u7387', unit: '%' },
      { key: 'deliveryCostRate', label: '\u914d\u9001\u6210\u672c\u7387', unit: '%' }
    ];
    let html = '<div class="env-overview-grid">';
    trendMetrics.forEach((m, idx) => {
      const trend = getMultiPeriodTrend('\u603b\u5546', m.key);
      html += '<div class="env-card">';
      html += '<div id="trendMini_' + idx + '"></div>';
      html += '</div>';
    });
    html += '</div>';
    const growth = calcEnvGrowth(getMultiPeriodTrend('\u603b\u5546', 'ue'));
    if (growth.length > 0) {
      html += '<div class="env-detail-table-wrap"><table class="period-compare-table env-detail-table">';
      html += '<thead><tr><th>\u671f\u95f4</th><th>UE</th><th>\u53d8\u5316</th><th>\u73af\u6bd4</th><th>\u8d8b\u52bf</th></tr></thead><tbody>';
      for (const g of growth) {
        const isUp = g.growthRate >= 0;
        html += '<tr>';
        html += '<td>' + g.prevDate.slice(5) + '\u2192' + g.date.slice(5) + '</td>';
        html += '<td>' + g.value.toFixed(2) + '</td>';
        html += '<td class="diff ' + (isUp ? 'up' : 'down') + '">' + (isUp ? '+' : '') + g.change.toFixed(2) + '</td>';
        html += '<td class="diff ' + (isUp ? 'up' : 'down') + '">' + (isUp ? '+' : '') + g.growthRate.toFixed(1) + '%</td>';
        const barW = Math.min(Math.abs(g.growthRate) * 3, 80);
        html += '<td><div class="an-flex-center-xs">';
        html += '<div class="an-bar-fill-sm" style="width:' + barW + 'px;background:' + (isUp ? '#27ae60' : '#e74c3c') + ';"></div';
        html += '</div></td>';
        html += '</tr>';
      }
      html += '</tbody></table></div>';
    }
    container.innerHTML = html;
    trendMetrics.forEach((m, idx) => {
      const trend = getMultiPeriodTrend('\u603b\u5546', m.key);
      renderTrendMiniChart('trendMini_' + idx, trend, m.label, m.unit);
    });
}

function initEnvOverview() {
    const el = document.getElementById('envOverviewContainer');
    if (!el) return;
    renderEnvOverview();
}

// ===== ES Module Exports =====

/**
 * T5增强: 异常摘要面板 - 用于概览页快速展示全城市异常状态
 * 返回HTML: 各城市异常等级标签列表(颜色编码)
 * @param {Object} allPeriodsData - 所有期数据 {date: {merchantData: {...}}}
 * @param {string} moduleKey - 模块key (all/food/flash/medicine/group)
 * @returns {string} HTML片段
 */
function getAnomalySummary(allPeriodsData, moduleKey) {
  if (!allPeriodsData) return '';
  
  const dates = Object.keys(allPeriodsData).sort();
  if (dates.length === 0) return '';
  
  const latestDate = dates[dates.length - 1];
  const latest = allPeriodsData[latestDate];
  if (!latest || !latest.merchantData) return '';
  
  const cities = (latest.merchantData.city || {}).cities || [];
  const kaCities = (latest.merchantData.ka || {}).cities || [];
  const allCities = [...cities, ...kaCities];
  
  if (allCities.length === 0) return '';
  
  // 计算IQR统计(用于V3引擎)
  const statsMap = {};
  const metricKeys = ['ue', 'subsidyRate', 'deliveryCostRate', 'avgRevenue', 'profitRate', 'platformCostRate'];
  metricKeys.forEach(function(metric) {
    const vals = [];
    allCities.forEach(function(c) {
      const mod = (c.modules && c.modules[moduleKey]) || {};
      let val = mod[metric];
      if (val === undefined && metric === 'deliveryCostRate' && mod.deliveryCost && mod.onlineRevenue) {
        val = mod.deliveryCost / mod.onlineRevenue;
      }
      if (val !== undefined && val !== null) vals.push(val);
    });
    if (vals.length >= 4) {
      vals.sort(function(a, b) { return a - b; });
      const n = vals.length;
      const q1 = vals[Math.floor(n * 0.25)];
      const q3 = vals[Math.floor(n * 0.75)];
      const iqr = q3 - q1;
      const lowerBound = q1 - 1.5 * iqr;
      const upperBound = q3 + 1.5 * iqr;
      statsMap[metric] = { q1, q3, iqr, lowerBound, upperBound, mean: vals.reduce(function(s, v) { return s + v; }, 0) / n };
    }
  });
  
  // 获取上一期数据
  let prevData = null;
  if (dates.length >= 2) {
    prevData = allPeriodsData[dates[dates.length - 2]];
  }
  
  let html = '<div class= an-my"anomaly-summary-panel" >';
  html += '<div class="an-title">异常检测摘要 (V3引擎)</div>';
  
  let dangerCount = 0, warningCount = 0, normalCount = 0;
  const cityResults = [];
  
  allCities.forEach(function(city) {
    const mod = (city.modules && city.modules[moduleKey]) || {};
    const prevCities = prevData && prevData.merchantData ? ((prevData.merchantData.city || {}).cities || []) : [];
    const prevCity = prevCities.find(function(c) { return (c.name || c.displayName) === (city.name || city.displayName); });
    const prevMod = prevCity ? (prevCity.modules && prevCity.modules[moduleKey]) : null;
    
    const result = getAnomalyLevelV3(mod, prevMod, statsMap);
    const name = city.displayName || city.name || '未知';
    
    let badge = '';
    if (result.level === 'danger') {
      badge = '<span class="an-tag-red">' + name + ' ' + result.score + '</span>';
      dangerCount++;
    } else if (result.level === 'warning') {
      badge = '<span class="an-tag-warn">' + name + ' ' + result.score + '</span>';
      warningCount++;
    } else {
      badge = '<span class="an-tag-green">' + name + ' ' + result.score + '</span>';
      normalCount++;
    }
    cityResults.push({ name, level: result.level, score: result.score, triggers: result.triggers, badge });
  });
  
  // 按评分排序(高风险优先)
  cityResults.sort(function(a, b) { return b.score - a.score; });
  
  // 统计条
  html += '<div class="an-flex-gap-sm">';
  html += '<span class="an-red-dark">严重: ' + dangerCount + '</span>';
  html += '<span class="an-orange;">预警: ' + warningCount + '</span>';
  html += '<span class="an-green-suc">正常: ' + normalCount + '</span>';
  html += '<span class="an-sec2">共' + allCities.length + '城市</span>';
  html += '</div>';
  
  // 城市标签
  cityResults.forEach(function(r) {
    html += r.badge;
  });
  
  // IQR统计使用提示
  if (Object.keys(statsMap).length > 0) {
    html += '<div class="an-mt-sm-sub">IQR动态阈值: ' + Object.keys(statsMap).length + '项指标</div>';
  }
  
  html += '</div>';
  return html;
}



/**
 * [C轮迁移] 收集所有异常城市数据（供异常徽章/Tab/汇总使用）
 * @returns {Array} 异常项数组，level=danger优先，按UE升序排列
 */
export function collectAnomalies() {
    const cities = getFilteredCities();
    const items = [];
    for (const city of cities) {
      for (const block of CONFIG.BLOCKS) {
        const m = city.modules ? city.modules[block.key] : null;
        if (!m) continue;
        const result = getAnomalyLevelV2(m);
        const level = result.level;
        if (level === 'danger' || level === 'warning') {
          items.push({
            level,
            cityName: city.name,
            cityDisplay: city.displayName || city.name,
            moduleName: (city.modules[block.key] && city.modules[block.key].moduleName) || block.name,
            moduleKey: block.key,
            ...m
          });
        }
      }
    }
    // Sort: danger first, then by UE ascending (worst first)
    items.sort((a, b) => {
      if (a.level === 'danger' && b.level !== 'danger') return -1;
      if (a.level !== 'danger' && b.level === 'danger') return 1;
      return a.ue - b.ue;
    });
    return items;
  }

  // ===== [P0新增] IQR增强: 数据量门槛 + EMA基线 =====
  /**
   * 改进的IQR统计(含数据量门槛)
   * 城市数<4时回退到静态阈值并标注"样本不足"
   * @param {Array} values - 数值数组
   * @param {string} metricName - 指标名称(用于日志)
   * @returns {Object|null} IQR统计或null(样本不足)
   */
  function computeIQRSafe(values, metricName) {
    if (!values || values.length < 4) {
      return { insufficient: true, count: values ? values.length : 0, metric: metricName };
    }
    values = values.slice().sort(function(a, b) { return a - b; });
    var n = values.length;
    var q1 = values[Math.floor(n * 0.25)];
    var q3 = values[Math.floor(n * 0.75)];
    var iqr = q3 - q1;
    // IQR为0时(所有值相同)，使用扩展边界
    if (iqr === 0) {
      var mean = values.reduce(function(s, v) { return s + v; }, 0) / n;
      iqr = Math.max(Math.abs(mean) * 0.1, 0.01);
    }
    var lowerBound = q1 - 1.5 * iqr;
    var upperBound = q3 + 1.5 * iqr;
    var mean = values.reduce(function(s, v) { return s + v; }, 0) / n;
    var variance = values.reduce(function(s, v) { return s + (v - mean) * (v - mean); }, 0) / n;
    var std = Math.sqrt(variance);
    return {
      insufficient: false, count: n, metric: metricName,
      q1: q1, q3: q3, iqr: iqr,
      lowerBound: lowerBound, upperBound: upperBound,
      mean: mean, std: std, median: values[Math.floor(n / 2)]
    };
  }

  /**
   * EMA(指数移动平均)基线计算
   * 比简单MA3更平滑，对近期数据赋予更高权重
   * @param {Array} values - 按时间排序的数值数组(最新在末尾)
   * @param {number} span - EMA周期(默认3)
   * @returns {number|null} EMA值或null
   */
  function computeEMA(values, span) {
    if (!values || values.length < 2) return null;
    span = span || 3;
    var k = 2 / (span + 1);
    var ema = values[0];
    for (var i = 1; i < values.length; i++) {
      ema = values[i] * k + ema * (1 - k);
    }
    return ema;
  }

  // ===== [P0新增] 同比分析(多期数据) =====
  /**
   * 计算同比变化(需≥4期数据才能计算, 匹配周期间隔)
   * @param {Array} timeline - [{date, value}] 按时间排序
   * @param {number} periodGap - 期间间隔(1=相邻, 2=隔1期)
   * @returns {Object|null} 同比结果
   */
  function computeYoY(timeline, periodGap) {
    if (!timeline || timeline.length < 4) return null;
    periodGap = periodGap || 1;
    var current = timeline[timeline.length - 1];
    var compareIdx = timeline.length - 1 - periodGap;
    if (compareIdx < 0) return null;
    var compare = timeline[compareIdx];

    var change = current.value - compare.value;
    var rate = compare.value !== 0 ? (change / Math.abs(compare.value)) * 100 : 0;

    // 趋势一致性: 最近3期是否同方向
    var trendConsistent = null;
    if (timeline.length >= 3) {
      var changes = [];
      for (var i = timeline.length - 3; i < timeline.length; i++) {
        var prev = timeline[i - 1];
        if (prev) changes.push(timeline[i].value - prev.value);
      }
      var allPositive = changes.every(function(c) { return c > 0; });
      var allNegative = changes.every(function(c) { return c < 0; });
      trendConsistent = allPositive ? 'improving' : allNegative ? 'declining' : 'mixed';
    }

    return {
      currentValue: current.value,
      compareValue: compare.value,
      compareDate: compare.date,
      change: change,
      rate: rate,
      trendConsistent: trendConsistent,
      periodCount: timeline.length
    };
  }

  /**
   * 同比分析HTML渲染
   * @param {Object} mod - 模块数据
   * @param {string} cityName - 城市名
   * @param {string} moduleKey - 模块key
   * @returns {string} HTML片段
   */
  function renderYoYPanel(mod, cityName, moduleKey) {
    var allData = DataStore.loadAll();
    var dates = Object.keys(allData).sort();
    if (dates.length < 2) return '<div class="an-empty">需要至少2期数据</div>';

    var mt = state.currentMerchant || 'all';
    var metrics = [
      { key: 'ue', label: 'UE', icon: '&#9733;', fmt: function(v) { return safeFixed(v, 2) + '元'; } },
      { key: 'subsidyRatio', label: '补贴率', icon: '&#9660;', fmt: function(v) { return (v * 100).toFixed(1) + '%'; } },
      { key: 'deliveryCostRate', label: '配送成本率', icon: '&#128666;', fmt: function(v) { return (v * 100).toFixed(1) + '%'; } },
      { key: 'profitRate', label: '利润率', icon: '&#128200;', fmt: function(v) { return (v * 100).toFixed(1) + '%'; } }
    ];

    // 构建时间线
    var timelines = {};
    metrics.forEach(function(m) { timelines[m.key] = []; });
    dates.forEach(function(date) {
      var entry = allData[date];
      var cities = ((entry.merchantData || {})[mt] || {}).cities || [];
      var city = cities.find(function(c) { return c.name === cityName; });
      if (!city) return;
      var cityMod = city.modules[moduleKey] || city.modules['all'] || {};
      timelines.ue.push({ date: date, value: cityMod.ue || 0 });
      timelines.subsidyRatio.push({ date: date, value: cityMod.subsidyRatio || 0 });
      timelines.deliveryCostRate.push({ date: date, value: cityMod.deliveryCostRate || (cityMod.deliveryCost && cityMod.onlineRevenue ? cityMod.deliveryCost / cityMod.onlineRevenue : 0) });
      timelines.profitRate.push({ date: date, value: cityMod.profitRate || (cityMod.onlineRevenue ? cityMod.profit / cityMod.onlineRevenue : 0) });
    });

    var html = '<div class="an-sec-title">同比趋势分析 (' + dates.length + '期)</div>';

    metrics.forEach(function(m) {
      var tl = timelines[m.key];
      if (tl.length < 2) return;
      var yoy = computeYoY(tl, 1);
      if (!yoy) return;

      var ema = computeEMA(tl.map(function(t) { return t.value; }), 3);
      var isGood = m.key === 'subsidyRatio' || m.key === 'deliveryCostRate' ? yoy.rate <= 0 : yoy.rate >= 0;
      var trendIcon = yoy.trendConsistent === 'improving' ? '&#9650;' : yoy.trendConsistent === 'declining' ? '&#9660;' : '&#8644;';

      html += '<div class="an-bar-row">';
      html += '<div class="an-bar-label">' + m.label + ' ' + m.icon + '</div>';
      html += '<div class="an-bar-value">' + m.fmt(yoy.currentValue) + '</div>';
      html += '<div class="an-bar-pct ' + (isGood ? 'an-green' : 'an-red') + '">' + (yoy.rate >= 0 ? '+' : '') + yoy.rate.toFixed(1) + '% ' + trendIcon + '</div>';
      if (ema !== null) {
        var emaDiff = yoy.currentValue - ema;
        var emaVsCurrent = m.key === 'subsidyRatio' || m.key === 'deliveryCostRate' ? emaDiff <= 0 : emaDiff >= 0;
        html += '<div class="an-bar-pct" style="font-size:10px;">EMA基线: ' + m.fmt(ema) + '</div>';
      }
      if (yoy.trendConsistent) {
        var trendLabel = yoy.trendConsistent === 'improving' ? '持续改善' : yoy.trendConsistent === 'declining' ? '持续恶化' : '波动';
        html += '<div class="an-bar-pct" style="font-size:10px;color:' + (yoy.trendConsistent === 'improving' ? '#22c55e' : yoy.trendConsistent === 'declining' ? '#ef4444' : '#f59e0b') + ';">' + trendLabel + '</div>';
      }
      html += '</div>';
    });

    return html;
  }

  // ===== [P1新增] 趋势预测(线性回归+置信区间) =====
  /**
   * 基于线性回归的简单趋势预测
   * @param {Array} values - 按时间排序的数值数组
   * @param {number} forecastPeriods - 预测期数(默认1)
   * @returns {Object|null} 预测结果
   */
  function forecastTrend(values, forecastPeriods) {
    if (!values || values.length < 3) return null;
    forecastPeriods = forecastPeriods || 1;
    var n = values.length;

    // 线性回归: y = a + b*x
    var sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (var i = 0; i < n; i++) {
      sumX += i;
      sumY += values[i];
      sumXY += i * values[i];
      sumX2 += i * i;
    }
    var b = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    var a = (sumY - b * sumX) / n;

    // 预测值
    var forecast = [];
    for (var f = 1; f <= forecastPeriods; f++) {
      forecast.push(a + b * (n - 1 + f));
    }

    // R² (拟合优度)
    var meanY = sumY / n;
    var ssTotal = 0, ssResidual = 0;
    for (var i = 0; i < n; i++) {
      ssTotal += (values[i] - meanY) * (values[i] - meanY);
      ssResidual += (values[i] - (a + b * i)) * (values[i] - (a + b * i));
    }
    var rSquared = ssTotal > 0 ? 1 - ssResidual / ssTotal : 0;

    // 标准误差
    var stdError = n > 2 ? Math.sqrt(ssResidual / (n - 2)) : 0;

    // 置信区间(95%, t=1.96近似)
    var confidence = [];
    for (var f = 0; f < forecastPeriods; f++) {
      var xNew = n + f;
      var se = stdError * Math.sqrt(1 + 1/n + (xNew - sumX/n) * (xNew - sumX/n) / (sumX2 - sumX*sumX/n));
      confidence.push({
        lower: forecast[f] - 1.96 * se,
        upper: forecast[f] + 1.96 * se,
        stdError: se
      });
    }

    // 趋势强度标准化
    var slopePct = meanY !== 0 ? (b / Math.abs(meanY) * 100) : 0;
    var trendStrength = 'stable';
    if (rSquared > 0.5) {
      if (Math.abs(slopePct) > 10) trendStrength = b > 0 ? 'strong_up' : 'strong_down';
      else if (Math.abs(slopePct) > 3) trendStrength = b > 0 ? 'moderate_up' : 'moderate_down';
    }

    return {
      slope: b,
      intercept: a,
      rSquared: rSquared,
      stdError: stdError,
      forecast: forecast,
      confidence: confidence,
      trendStrength: trendStrength,
      slopePct: slopePct,
      nextPeriod: forecast[0]
    };
  }

  /**
   * 趋势预测渲染
   * @param {Array} timeline - [{date, value}]
   * @param {string} label - 指标名
   * @param {Function} fmt - 格式化函数
   * @returns {string} HTML
   */
  function renderForecastPanel(timeline, label, fmt) {
    if (!timeline || timeline.length < 3) return '';
    var values = timeline.map(function(t) { return t.value; });
    var result = forecastTrend(values, 1);
    if (!result) return '';

    var strengthLabels = {
      'strong_up': '强劲上升', 'moderate_up': '温和上升', 'stable': '平稳',
      'moderate_down': '温和下降', 'strong_down': '强劲下降'
    };
    var strengthColors = {
      'strong_up': '#22c55e', 'moderate_up': '#86efac', 'stable': '#6b7280',
      'moderate_down': '#f59e0b', 'strong_down': '#ef4444'
    };

    var tagClass = 'an-forecast-tag an-forecast-tag-' + result.trendStrength;
    var html = '<div class="an-bar-row">';
    html += '<div class="an-bar-label">' + label + '预测</div>';
    html += '<div class="an-bar-value">' + (fmt ? fmt(result.nextPeriod) : safeFixed(result.nextPeriod)) + '</div>';
    html += '<div><span class="' + tagClass + '">' + strengthLabels[result.trendStrength] + '</span></div>';
    html += '<div style="font-size:10px;color:var(--text-sec);">R²=' + (result.rSquared * 100).toFixed(0) + '%</div>';
    if (result.confidence && result.confidence[0]) {
      html += '<div style="font-size:10px;color:var(--text-sec);">95%CI: ' + (fmt ? fmt(result.confidence[0].lower) : safeFixed(result.confidence[0].lower)) + '~' + (fmt ? fmt(result.confidence[0].upper) : safeFixed(result.confidence[0].upper)) + '</div>';
    }
    html += '</div>';
    return html;
  }

  // ===== [P1新增] What-If计算器 =====
  /**
   * What-If场景计算
   * @param {Object} mod - 模块数据
   * @param {Object} scenario - 场景参数 {revenueChange: 0.1, costChange: -0.05, orderChange: 0}
   * @returns {Object} What-If结果
   */
  function calculateWhatIf(mod, scenario) {
    if (!mod || !mod.orders) return null;
    var baseOrders = mod.orders;
    var baseRevenue = mod.onlineRevenue || 0;
    var baseCost = mod.totalExpense || 0;
    var baseUE = (baseRevenue - baseCost) / baseOrders;
    var baseProfit = baseRevenue - baseCost;

    // 应用场景变化
    var newOrders = baseOrders * (1 + (scenario.orderChange || 0));
    var newRevenuePerOrder = (baseRevenue / baseOrders) * (1 + (scenario.revenueChange || 0));
    var newRevenue = newOrders * newRevenuePerOrder;
    var costPerOrder = baseCost / baseOrders;
    var newCostPerOrder = costPerOrder * (1 + (scenario.costChange || 0));
    // 固定成本不随订单线性增长
    var fixedCost = mod.fixedCost || 0;
    var variableCost = baseCost - fixedCost;
    var newVariableCostPerOrder = (variableCost / baseOrders) * (1 + (scenario.costChange || 0));
    var newTotalCost = fixedCost + newVariableCostPerOrder * newOrders;

    var newProfit = newRevenue - newTotalCost;
    var newUE = newOrders > 0 ? newProfit / newOrders : 0;
    var newProfitRate = newRevenue > 0 ? newProfit / newRevenue : 0;

    return {
      baseUE: baseUE,
      newUE: newUE,
      ueChange: newUE - baseUE,
      ueChangePct: baseUE !== 0 ? ((newUE - baseUE) / Math.abs(baseUE)) * 100 : 0,
      baseProfit: baseProfit,
      newProfit: newProfit,
      profitChange: newProfit - baseProfit,
      newRevenue: newRevenue,
      newOrders: newOrders,
      newProfitRate: newProfitRate
    };
  }

  /**
   * What-If面板渲染(预设场景)
   * @param {Object} mod - 模块数据
   * @returns {string} HTML
   */
  function renderWhatIfPanel(mod) {
    if (!mod || !mod.orders) return '';

    var scenarios = [
      { label: '客单价+10%', params: { revenueChange: 0.10, costChange: 0, orderChange: 0 } },
      { label: '配送成本-10%', params: { revenueChange: 0, costChange: -0.05, orderChange: 0 } },
      { label: '订单量+20%', params: { revenueChange: 0, costChange: 0, orderChange: 0.20 } },
      { label: '补贴率-30%', params: { revenueChange: 0, costChange: -0.10, orderChange: 0 } },
      { label: '综合优化', params: { revenueChange: 0.05, costChange: -0.08, orderChange: 0.10 } }
    ];

    var html = '<div class="an-sec-title">What-If 场景模拟</div>';
    html += '<div class="an-hint-text">基准UE: ' + safeFixed(mod.ue || 0) + '元/单</div>';

    html += '<div class="table-wrapper"><table class="an-table">';
    html += '<thead><tr><th>场景</th><th>预计UE</th><th>UE变化</th><th>预计利润</th><th>利润变化</th></tr></thead>';
    html += '<tbody>';

    // 先计算所有场景找最佳
    var allResults = [];
    scenarios.forEach(function(s) {
      var result = calculateWhatIf(mod, s.params);
      if (result) allResults.push({ scenario: s, result: result });
    });
    var bestIdx = -1, bestUE = -Infinity;
    allResults.forEach(function(item, i) {
      if (item.result.newUE > bestUE) { bestUE = item.result.newUE; bestIdx = i; }
    });

    allResults.forEach(function(item, i) {
      var s = item.scenario, result = item.result;
      var ueColor = result.ueChange >= 0 ? 'an-green' : 'an-red';
      var bestClass = i === bestIdx ? 'an-best-scenario' : '';
      var bestTag = i === bestIdx ? ' &#9733;' : '';
      html += '<tr class="' + bestClass + '">';
      html += '<td>' + s.label + bestTag + '</td>';
      html += '<td class="' + ueColor + '">' + safeFixed(result.newUE) + '元</td>';
      html += '<td class="' + ueColor + '">' + (result.ueChange >= 0 ? '+' : '') + safeFixed(result.ueChange) + '元</td>';
      html += '<td>' + fmtWan(result.newProfit) + '</td>';
      html += '<td class="' + ueColor + '">' + (result.profitChange >= 0 ? '+' : '') + fmtWan(result.profitChange) + '</td>';
      html += '</tr>';
    });

    html += '</tbody></table></div>';
    return html;
  }
  // ===== [P0新增] 敏感度矩阵: 关键指标±10%变化对UE的影响 =====
  /**
   * 计算UE对各成本/收入项的弹性敏感度
   * @param {Object} mod - 模块数据
   * @returns {Object} 敏感度矩阵结果
   */
  function analyzeSensitivity(mod) {
    if (!mod || !mod.orders || mod.orders === 0) return null;
    var orders = mod.orders;
    var revenue = mod.onlineRevenue || 0;
    var totalCost = mod.totalExpense || (mod.deliveryCost||0) + (mod.subsidyTotal||0) + (mod.platformCost||0) + (mod.fixedCost||0) + (mod.additionalCost||0);
    var profit = mod.profit || 0;
    var baseUE = profit / orders;

    // 定义敏感度分析项: 各成本项变化±10%对UE的影响
    var items = [
      { key: 'deliveryCost', label: '配送成本', value: mod.deliveryCost || 0 },
      { key: 'subsidyB', label: 'B端补贴', value: mod.subsidyB || 0 },
      { key: 'subsidyC', label: 'C端补贴', value: mod.subsidyC || 0 },
      { key: 'subsidyTotal', label: '补贴总额', value: mod.subsidyTotal || 0 },
      { key: 'platformCost', label: '平台成本', value: mod.platformCost || 0 },
      { key: 'fixedCost', label: '固定成本', value: mod.fixedCost || 0 },
      { key: 'additionalCost', label: '附加成本', value: mod.additionalCost || 0 },
      { key: 'onlineRevenue', label: '收入', value: revenue, isRevenue: true },
      { key: 'orders', label: '订单量', value: orders, isOrders: true }
    ];

    var results = [];
    items.forEach(function(item) {
      if (item.value === 0) return;

      if (item.isOrders) {
        // 订单量变化: UE = profit / orders, 但profit也随订单量线性变化(假设单位收入/成本不变)
        // 简化: UE不变(因为revenue和cost都线性增长), 但总量变化
        // 实际场景: 订单+10%→固定成本分摊降低→UE改善
        var newOrders = orders * 1.1;
        var fixedCostPerOrder = (mod.fixedCost || 0) / newOrders;
        var baseFixedPerOrder = (mod.fixedCost || 0) / orders;
        var ueImpact = baseFixedPerOrder - fixedCostPerOrder; // 固定成本分摊改善
        results.push({
          key: item.key, label: item.label,
          baseValue: item.value,
          impactPct10: ueImpact,
          impactPctN10: -ueImpact, // 订单减少时UE恶化
          elasticity: orders > 0 ? (ueImpact / baseUE * 100) : 0,
          description: '固定成本分摊效应'
        });
      } else if (item.isRevenue) {
        // 收入+10%: 假设订单量不变，ARO提升
        var newRevenue = revenue * 1.1;
        var newProfit = newRevenue - totalCost;
        var newUE = newProfit / orders;
        var impact = newUE - baseUE;
        var newRevenueN = revenue * 0.9;
        var newProfitN = newRevenueN - totalCost;
        var impactN = newProfitN / orders - baseUE;
        results.push({
          key: item.key, label: item.label,
          baseValue: revenue,
          impactPct10: impact,
          impactPctN10: impactN,
          elasticity: baseUE !== 0 ? (impact / baseUE * 100) : 0,
          description: 'ARO提升'
        });
      } else {
        // 成本+10%: UE下降
        var delta = item.value * 0.1;
        var newProfitCost = profit - delta;
        var newUECost = newProfitCost / orders;
        results.push({
          key: item.key, label: item.label,
          baseValue: item.value,
          impactPct10: newUECost - baseUE,
          impactPctN10: baseUE - (profit + delta) / orders,
          elasticity: baseUE !== 0 ? ((newUECost - baseUE) / baseUE * 100) : 0,
          description: '成本变动'
        });
      }
    });

    // 按弹性绝对值排序(最敏感的排前面)
    results.sort(function(a, b) { return Math.abs(b.elasticity) - Math.abs(a.elasticity); });

    // 找到杠杆最大项(成本降低10%UE改善最大)
    var bestLeverage = null;
    for (var i = 0; i < results.length; i++) {
      if (!results[i].isRevenue && !results[i].isOrders && results[i].impactPctN10 > 0) {
        bestLeverage = results[i];
        break;
      }
    }

    return {
      baseUE: baseUE,
      results: results,
      bestLeverage: bestLeverage,
      summary: results.length > 0 ? 'UE最敏感: ' + results[0].label + '(弹性' + safeFixed(results[0].elasticity) + '%)' : '无数据'
    };
  }

  /**
   * 渲染敏感度矩阵面板
   * @param {Object} mod - 模块数据
   * @returns {string} HTML
   */
  function renderSensitivityPanel(mod) {
    var result = analyzeSensitivity(mod);
    if (!result || !result.results || result.results.length === 0) return '';

    var html = '<div class="an-sec-title">UE敏感度矩阵 (±10%变化)</div>';
    html += '<div class="an-hint-text">展示各指标变化10%对单均UE的影响，按敏感度排序</div>';

    // 表格
    html += '<div class="table-wrapper"><table class="an-table">';
    html += '<thead><tr><th>指标</th><th>基准值</th><th>+10%影响</th><th>-10%影响</th><th>弹性</th></tr></thead>';
    html += '<tbody>';
    result.results.forEach(function(r) {
      var highColor = Math.abs(r.elasticity) > 30 ? 'an-red' : Math.abs(r.elasticity) > 15 ? 'an-orange' : '';
      var heatClass = Math.abs(r.elasticity) > 30 ? 'an-heat-high' : Math.abs(r.elasticity) > 15 ? 'an-heat-medium' : '';
      html += '<tr class="' + heatClass + '">';
      html += '<td><strong>' + r.label + '</strong></td>';
      html += '<td>' + fmtWan(r.baseValue) + '</td>';
      html += '<td class="' + (r.impactPct10 >= 0 ? 'an-green' : 'an-red') + '">' + (r.impactPct10 >= 0 ? '+' : '') + safeFixed(r.impactPct10) + '元</td>';
      html += '<td class="' + (r.impactPctN10 >= 0 ? 'an-green' : 'an-red') + '">' + (r.impactPctN10 >= 0 ? '+' : '') + safeFixed(r.impactPctN10) + '元</td>';
      html += '<td class="' + highColor + '">' + (r.elasticity >= 0 ? '+' : '') + safeFixed(r.elasticity) + '%</td>';
      html += '</tr>';
    });
    html += '</tbody></table></div>';

    // 杠杆建议
    if (result.bestLeverage) {
      var bl = result.bestLeverage;
      html += '<div class="an-mt an-hint">';
      html += '<div class="an-hint-title">最佳杠杆点</div>';
      html += '<div class="an-hint-text">降低' + bl.label + '10%(约' + fmtWan(bl.baseValue * 0.1) + ')可改善UE ' + safeFixed(bl.impactPctN10) + '元/单</div>';
      html += '</div>';
    }

    return html;
  }

export { analyzeTrend, analyzeCostWaterfall, calcAdvancedStats, detectAnomaliesIQR, getAnomalySummary, analyzeContribution, decomposeUE, analyzeTrendAdvanced, generateInsights, renderInsightsPanel, renderWaterfallChart, renderContributionPanel, renderUEDecomposition, analyzeAnomalies, getAnomalyLevel, getDiagnosis, getPrevPeriodAllData, getAnomalyLevelV2, getAnomalyLevelV3, getAllCitiesCount, getDiagnosisV2, analyzeAnomalyRootCause, renderRootCausePanel, getCityRankingData, renderCityRankingChange, renderSubsidyBreakdown, renderSubsidyTrend, getMultiPeriodTrend, getCrossPeriodChanges, calcEnvGrowth, renderTrendMiniChart, renderPeriodCompare, renderEnvOverview, initEnvOverview, analyzeSensitivity, renderSensitivityPanel, computeIQRSafe, computeEMA, computeYoY, renderYoYPanel, forecastTrend, renderForecastPanel, calculateWhatIf, renderWhatIfPanel };;

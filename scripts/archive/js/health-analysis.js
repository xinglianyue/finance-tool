// health-analysis.js - 健康度分析系统（基于知识库框架）
// 核心功能：实现收入健康度、成本健康度、模式健康度分析

export class HealthAnalyzer {
  constructor() {
    // 健康度分析阈值
    this.thresholds = {
      ue: {
        danger: 0,       // UE < 0 严重亏损
        warning: 0.3,    // UE < 0.3 预警
        good: 0.3        // UE >= 0.3 健康
      },
      subsidyRatio: {
        warning: 0.35,   // 代补占比 > 35% 预警
        danger: 0.45     // 代补占比 > 45% 严重
      }
    };
  }

  // 评估收入健康度
  evaluateIncomeHealth(moduleMetrics) {
    const commissionRate = moduleMetrics.commissionRate || 0;
    const deliveryFeeRatio = moduleMetrics.deliveryFeeRatio || 0;

    let status, score, description;

    if (commissionRate > deliveryFeeRatio) {
      status = 'good';
      score = 100;
      description = '抽佣收入占比高于配送费收入，收入结构健康';
    } else if (commissionRate > deliveryFeeRatio * 0.8) {
      status = 'warning';
      score = 70;
      description = '抽佣收入占比略低于配送费收入，需关注';
    } else {
      status = 'danger';
      score = 40;
      description = '抽佣收入占比明显低于配送费收入，收入结构需优化';
    }

    return {
      status,
      score,
      description,
      commissionRate,
      deliveryFeeRatio,
      ratio: commissionRate / deliveryFeeRatio
    };
  }

  // 评估成本健康度
  evaluateCostHealth(moduleMetrics) {
    const fixedCostRate = moduleMetrics.fixedCostRate || 0;
    const onlineGrossMarginRate = moduleMetrics.onlineGrossMarginRate || 0;

    let status, score, description;

    // 线上毛利率高于固定成本率为健康
    if (onlineGrossMarginRate > fixedCostRate) {
      status = 'good';
      score = 100;
      description = '线上毛利率高于固定成本率，成本结构健康';
    } else if (onlineGrossMarginRate > fixedCostRate * 0.8) {
      status = 'warning';
      score = 70;
      description = '线上毛利率略低于固定成本率，需关注成本控制';
    } else {
      status = 'danger';
      score = 40;
      description = '线上毛利率明显低于固定成本率，成本结构需优化';
    }

    return {
      status,
      score,
      description,
      fixedCostRate,
      onlineGrossMarginRate
    };
  }

  // 评估模式健康度
  evaluateModeHealth(moduleMetrics) {
    const franchiseRatio = moduleMetrics.franchiseRatio || 0;
    const selfRatio = moduleMetrics.selfRatio || 0;

    let status, score, description;

    // 加盟占比越高越健康（运营更轻、风险更低）
    if (franchiseRatio >= 0.6) {
      status = 'good';
      score = 100;
      description = '加盟占比高，运营模式轻、风险低';
    } else if (franchiseRatio >= 0.4) {
      status = 'warning';
      score = 70;
      description = '加盟占比中等，有优化空间';
    } else {
      status = 'danger';
      score = 40;
      description = '加盟占比低，自配比例高，运营模式偏重';
    }

    return {
      status,
      score,
      description,
      franchiseRatio,
      selfRatio
    };
  }

  // 评估UE健康度
  evaluateUEHealth(ue) {
    let status, score, description;

    if (ue >= this.thresholds.ue.good) {
      status = 'good';
      score = 100;
      description = 'UE健康，单均盈利良好';
    } else if (ue >= this.thresholds.ue.warning) {
      status = 'warning';
      score = 60;
      description = 'UE预警，单均盈利需关注';
    } else if (ue >= this.thresholds.ue.danger) {
      status = 'warning';
      score = 40;
      description = 'UE较低，接近亏损边缘';
    } else {
      status = 'danger';
      score = 20;
      description = 'UE为负，单均亏损严重';
    }

    return {
      status,
      score,
      description,
      ue
    };
  }

  // 综合评估城市健康度
  evaluateCityHealth(cityAnalysis) {
    const allModule = cityAnalysis.modules?.all;
    if (!allModule) return null;

    const ueHealth = this.evaluateUEHealth(allModule.ue || 0);
    const incomeHealth = this.evaluateIncomeHealth(allModule);
    const costHealth = this.evaluateCostHealth(allModule);
    const modeHealth = this.evaluateModeHealth(allModule);

    // 计算综合得分
    const overallScore = Math.round(
      ueHealth.score * 0.4 +
      incomeHealth.score * 0.2 +
      costHealth.score * 0.2 +
      modeHealth.score * 0.2
    );

    // 确定综合状态
    let overallStatus = 'good';
    if (overallScore < 50) overallStatus = 'danger';
    else if (overallScore < 80) overallStatus = 'warning';

    // 星级评价
    const stars = Math.ceil(overallScore / 20);

    return {
      ue: ueHealth,
      income: incomeHealth,
      cost: costHealth,
      mode: modeHealth,
      overall: {
        score: overallScore,
        status: overallStatus,
        stars
      }
    };
  }

  // 城市分类（基于知识库框架的4类城市分类）
  classifyCity(cityAnalysis, previousMonthData = null) {
    const allModule = cityAnalysis.modules?.all;
    if (!allModule) return null;

    const ue = allModule.ue || 0;
    const orders = allModule.raw?.orders || 0;

    // 如果有上月数据，计算增长率
    let growthRate = 0;
    if (previousMonthData) {
      const prevOrders = previousMonthData.modules?.all?.raw?.orders || 0;
      if (prevOrders > 0) {
        growthRate = ((orders - prevOrders) / prevOrders) * 100;
      }
    }

    // 简化的分类逻辑（基于UE和假设的增长率）
    let type, description, strategy;

    // 先按UE判断利润水平
    const isHighProfit = ue >= 0.3;
    const isLowProfit = ue < 0;

    // 简单估算增长率（需要多期数据时才准确）
    const isHighGrowth = growthRate > 20;
    const isLowGrowth = growthRate < 5;

    // 这里需要结合实际的增长率数据，当前先用简化逻辑
    if (ue >= 0.3) {
      type = 'high-profit';
      description = '高利润城市';
      strategy = '维持现状，探索新场景';
    } else if (ue >= 0 && ue < 0.3) {
      type = 'medium-profit';
      description = '中等利润城市';
      strategy = '优化成本结构，提升抽佣率';
    } else if (ue >= -0.1 && ue < 0) {
      type = 'low-profit';
      description = '微亏城市';
      strategy = '加大资源投入，复制成功模式';
    } else {
      type = 'loss-making';
      description = '亏损城市';
      strategy = '重新评估市场，考虑收缩或转型';
    }

    return {
      type,
      description,
      strategy,
      ue,
      growthRate
    };
  }

  // 诊断问题城市的根本原因
  diagnoseProblems(cityAnalysis) {
    const allModule = cityAnalysis.modules?.all;
    if (!allModule) return [];

    const problems = [];

    // UE问题
    if (allModule.ue < 0) {
      problems.push({
        type: 'ue',
        severity: 'critical',
        title: '单均亏损',
        description: `UE为${(allModule.ue * 100).toFixed(2)}分，每单亏损${Math.abs(allModule.ue).toFixed(2)}元`
      });
    } else if (allModule.ue < 0.3) {
      problems.push({
        type: 'ue',
        severity: 'warning',
        title: 'UE偏低',
        description: `UE为${(allModule.ue * 100).toFixed(2)}分，略低于健康线`
      });
    }

    // 代补占比问题
    const subsidyRatio = allModule.subsidyRatio || 0;
    if (subsidyRatio > this.thresholds.subsidyRatio.danger) {
      problems.push({
        type: 'subsidy',
        severity: 'critical',
        title: '代补占比过高',
        description: `代补占GMV比例为${(subsidyRatio * 100).toFixed(1)}%，远超警戒线`
      });
    } else if (subsidyRatio > this.thresholds.subsidyRatio.warning) {
      problems.push({
        type: 'subsidy',
        severity: 'warning',
        title: '代补占比偏高',
        description: `代补占GMV比例为${(subsidyRatio * 100).toFixed(1)}%，需关注`
      });
    }

    // 固定成本问题
    const fixedCostRate = allModule.fixedCostRate || 0;
    const onlineGrossMarginRate = allModule.onlineGrossMarginRate || 0;
    if (onlineGrossMarginRate < fixedCostRate) {
      problems.push({
        type: 'cost',
        severity: 'warning',
        title: '成本结构问题',
        description: `线上毛利率低于固定成本率，需关注成本控制`
      });
    }

    // 模块化问题分析
    const moduleProblems = this.analyzeModuleProblems(cityAnalysis);
    problems.push(...moduleProblems);

    return problems;
  }

  // 分析各模块的问题
  analyzeModuleProblems(cityAnalysis) {
    const problems = [];
    const moduleNames = {
      all: '全品类',
      food: '餐饮',
      flash: '闪购',
      medicine: '医药',
      group: '拼好饭'
    };

    for (const [moduleKey, moduleData] of Object.entries(cityAnalysis.modules || {})) {
      if (moduleKey === 'all') continue;

      const ue = moduleData.ue || 0;
      if (ue < 0) {
        problems.push({
          type: 'module',
          severity: ue < -0.1 ? 'critical' : 'warning',
          title: `${moduleNames[moduleKey] || moduleKey}模块亏损`,
          description: `该模块UE为${(ue * 100).toFixed(2)}分，每单亏损${Math.abs(ue).toFixed(2)}元`
        });
      }
    }

    return problems;
  }

  // 生成优化建议
  generateRecommendations(cityAnalysis, healthEvaluation) {
    const recommendations = [];

    if (!healthEvaluation) return recommendations;

    // 基于UE的建议
    if (healthEvaluation.ue.status === 'danger') {
      recommendations.push({
        priority: 'high',
        title: '立即改善单均亏损',
        content: 'UE为负，需立即排查亏损原因，优先调整代补和竞价费用'
      });
    } else if (healthEvaluation.ue.status === 'warning') {
      recommendations.push({
        priority: 'medium',
        title: '提升单均盈利',
        content: 'UE偏低，建议优化成本结构，提升抽佣率'
      });
    }

    // 基于收入结构的建议
    if (healthEvaluation.income.status !== 'good') {
      recommendations.push({
        priority: 'medium',
        title: '优化收入结构',
        content: '提升抽佣收入占比，优化配送费定价策略'
      });
    }

    // 基于模式的建议
    if (healthEvaluation.mode.status !== 'good') {
      recommendations.push({
        priority: 'low',
        title: '优化运营模式',
        content: '提升加盟占比，降低自配比例，减轻运营压力'
      });
    }

    return recommendations;
  }
}

export const healthAnalyzer = new HealthAnalyzer();

/**
 * 智能财务分析引擎 v2
 * 
 * 基于真实财务数据设计的分析系统
 * 功能：
 * 1. 动态阈值异常检测
 * 2. 多维度健康度评估
 * 3. 根因分析
 * 4. 智能建议生成
 */

// ============================================
// 1. 常量配置（基于真实数据分析结果）
// ============================================

const ANALYZER_CONFIG = {
  // 动态UE阈值（根据城市级别和业务模块调整）
  UE_THRESHOLDS: {
    // 一线城市（承德属于较大规模城市）
    tier1: { excellent: 1.5, good: 0.8, warn: 0.3 },
    // 二线城市（大部分城市）
    tier2: { excellent: 1.0, good: 0.5, warn: 0.2 },
    // 三线/县域
    tier3: { excellent: 0.5, good: 0.2, warn: 0.0 }
  },
  
  // 业务模块UE基准
  MODULE_UE_BASELINE: {
    all:      { excellent: 1.2, good: 0.5, warn: 0.2 },
    food:     { excellent: 0.8, good: 0.3, warn: 0.0 },
    flash:    { excellent: 0.3, good: 0.0, warn: -0.5 },
    medicine: { excellent: 2.5, good: 1.5, warn: 0.5 },
    group:    { excellent: 0.0, good: -0.3, warn: -0.8 }
  },
  
  // 补贴率阈值（%）
  SUBSIDY_THRESHOLDS: {
    all:      { excellent: 5, good: 8, warn: 12 },
    food:     { excellent: 6, good: 10, warn: 15 },
    flash:    { excellent: 2, good: 4, warn: 8 },
    medicine: { excellent: 1, good: 2, warn: 5 },
    group:    { excellent: 12, good: 18, warn: 25 }
  },
  
  // 配送成本率阈值（%）
  DELIVERY_COST_THRESHOLDS: {
    excellent: 20, good: 28, warn: 35
  },
  
  // 健康度权重
  HEALTH_WEIGHTS: {
    ue: 0.35,           // 盈利能力
    growth: 0.25,       // 增长性
    subsidy: 0.20,      // 补贴效率
    delivery: 0.20      // 成本效率
  },
  
  // Z-Score异常阈值
  ZSCORE_THRESHOLD: 2.0,
  
  // 城市分类（基于真实数据规模）
  CITY_TIERS: {
    large: ['总商', '承德'],      // 大规模城市（订单>30万）
    medium: ['玉田', '安国', '晋州', '威县', '围场'],  // 中等规模
    small: ['安平', '献县', '深泽', '康保']  // 小规模城市
  }
};

// ============================================
// 2. 工具函数
// ============================================

const AnalyzerUtils = {
  /**
   * 安全数值转换
   */
  safeNum(val, fallback = 0) {
    const n = parseFloat(val);
    return isNaN(n) ? fallback : n;
  },
  
  /**
   * 百分比转换
   */
  toPercent(val) {
    return (val * 100).toFixed(1);
  },
  
  /**
   * 计算平均值
   */
  mean(arr) {
    if (!arr || arr.length === 0) return 0;
    return arr.reduce((a, b) => a + this.safeNum(b), 0) / arr.length;
  },
  
  /**
   * 计算标准差
   */
  std(arr) {
    if (!arr || arr.length < 2) return 0;
    const avg = this.mean(arr);
    const squareDiffs = arr.map(v => Math.pow(this.safeNum(v) - avg, 2));
    return Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / arr.length);
  },
  
  /**
   * 计算Z-Score
   */
  zScore(value, arr) {
    const m = this.mean(arr);
    const s = this.std(arr);
    if (s === 0) return 0;
    return (this.safeNum(value) - m) / s;
  },
  
  /**
   * 获取城市级别
   */
  getCityTier(cityName) {
    if (ANALYZER_CONFIG.CITY_TIERS.large.includes(cityName)) return 'tier1';
    if (ANALYZER_CONFIG.CITY_TIERS.medium.includes(cityName)) return 'tier2';
    return 'tier3';
  },
  
  /**
   * 获取评分（0-100）
   */
  getScore(value, excellent, good, warn) {
    if (value >= excellent) return 100;
    if (value >= good) return 75 + 25 * (value - good) / (excellent - good);
    if (value >= warn) return 50 + 25 * (value - warn) / (good - warn);
    return Math.max(0, 25 + 25 * value / warn);
  },
  
  /**
   * 格式化金额
   */
  formatMoney(val, unit = '万') {
    const n = this.safeNum(val);
    if (unit === '万') return (n / 10000).toFixed(1) + '万';
    return n.toFixed(2);
  }
};

// ============================================
// 3. 异常检测器
// ============================================

class AnomalyDetector {
  constructor() {
    this.config = ANALYZER_CONFIG;
    this.utils = AnalyzerUtils;
  }
  
  /**
   * 计算动态UE阈值
   * 根据城市级别和业务模块自动调整
   */
  getDynamicUEThreshold(cityName, moduleKey) {
    const tier = this.utils.getCityTier(cityName);
    const baseUE = this.config.UE_THRESHOLDS[tier];
    const moduleUE = this.config.MODULE_UE_BASELINE[moduleKey] || this.config.MODULE_UE_BASELINE.all;
    
    // 综合计算：考虑城市级别和业务模块
    return {
      excellent: (baseUE.excellent + moduleUE.excellent) / 2,
      good: (baseUE.good + moduleUE.good) / 2,
      warn: (baseUE.warn + moduleUE.warn) / 2
    };
  }
  
  /**
   * 检测单个城市模块的异常
   */
  detectCityModuleAnomaly(cityName, moduleData) {
    const moduleKey = moduleData.key || 'all';
    const ue = this.utils.safeNum(moduleData.ue);
    const subsidyRate = this.utils.safeNum(moduleData.subsidyRatio) * 100;
    const deliveryCostRate = this.utils.safeNum(moduleData.deliveryCostRate) * 100;
    
    const thresholds = this.getDynamicUEThreshold(cityName, moduleKey);
    const subsidyThresholds = this.config.SUBSIDY_THRESHOLDS[moduleKey] || this.config.SUBSIDY_THRESHOLDS.all;
    
    const anomalies = [];
    
    // 1. UE异常检测
    if (ue < 0) {
      anomalies.push({
        type: 'ue_critical',
        metric: 'ue',
        value: ue,
        threshold: 0,
        severity: 'critical',
        message: `亏损状态，UE为${ue.toFixed(2)}元`,
        impact: `月损失约${this.estimateLoss(moduleData)}元`
      });
    } else if (ue < thresholds.warn) {
      anomalies.push({
        type: 'ue_warning',
        metric: 'ue',
        value: ue,
        threshold: thresholds.warn,
        severity: 'warning',
        message: `UE偏低，为${ue.toFixed(2)}元（低于预警值${thresholds.warn.toFixed(2)}元）`
      });
    }
    
    // 2. 补贴率异常检测
    if (subsidyRate > subsidyThresholds.warn) {
      anomalies.push({
        type: 'subsidy_high',
        metric: 'subsidyRate',
        value: subsidyRate,
        threshold: subsidyThresholds.warn,
        severity: subsidyRate > subsidyThresholds.warn * 1.2 ? 'critical' : 'warning',
        message: `补贴率过高，为${subsidyRate.toFixed(1)}%（预警线${subsidyThresholds.warn}%）`
      });
    }
    
    // 3. 配送成本异常检测
    if (deliveryCostRate > this.config.DELIVERY_COST_THRESHOLDS.warn) {
      anomalies.push({
        type: 'delivery_cost_high',
        metric: 'deliveryCostRate',
        value: deliveryCostRate,
        threshold: this.config.DELIVERY_COST_THRESHOLDS.warn,
        severity: 'warning',
        message: `配送成本率偏高，为${deliveryCostRate.toFixed(1)}%（预警线${this.config.DELIVERY_COST_THRESHOLDS.warn}%）`
      });
    }
    
    return {
      city: cityName,
      module: moduleKey,
      ue: ue,
      subsidyRate: subsidyRate,
      anomalies: anomalies,
      isAnomaly: anomalies.length > 0,
      maxSeverity: this.getMaxSeverity(anomalies)
    };
  }
  
  /**
   * 检测所有城市模块的异常
   */
  detectAllAnomalies(citiesData) {
    const results = [];
    
    citiesData.forEach(city => {
      const cityName = city.name || city.displayName;
      
      // 检测全品类
      if (city.modules && city.modules.all) {
        results.push(this.detectCityModuleAnomaly(cityName, {
          key: 'all',
          ...city.modules.all
        }));
      }
      
      // 检测各业务模块
      ['food', 'flash', 'medicine', 'group'].forEach(mod => {
        if (city.modules && city.modules[mod] && city.modules[mod].orders > 0) {
          results.push(this.detectCityModuleAnomaly(cityName, {
            key: mod,
            ...city.modules[mod]
          }));
        }
      });
    });
    
    // 按严重程度排序
    return results
      .filter(r => r.isAnomaly)
      .sort((a, b) => {
        const severityOrder = { critical: 0, warning: 1 };
        return severityOrder[a.maxSeverity] - severityOrder[b.maxSeverity];
      });
  }
  
  /**
   * 估算损失金额
   */
  estimateLoss(moduleData) {
    const ue = this.utils.safeNum(moduleData.ue);
    const orders = this.utils.safeNum(moduleData.orders);
    return Math.abs(ue * orders).toFixed(0);
  }
  
  /**
   * 获取最大严重程度
   */
  getMaxSeverity(anomalies) {
    if (anomalies.some(a => a.severity === 'critical')) return 'critical';
    if (anomalies.some(a => a.severity === 'warning')) return 'warning';
    return 'normal';
  }
  
  /**
   * Z-Score异常检测（基于历史数据）
   */
  detectZScoreAnomaly(value, historicalValues) {
    const zScore = this.utils.zScore(value, historicalValues);
    const absZScore = Math.abs(zScore);
    
    if (absZScore > this.config.ZSCORE_THRESHOLD * 1.5) {
      return { isAnomaly: true, severity: 'critical', zScore };
    }
    if (absZScore > this.config.ZSCORE_THRESHOLD) {
      return { isAnomaly: true, severity: 'warning', zScore };
    }
    return { isAnomaly: false, severity: 'normal', zScore };
  }
}

// ============================================
// 4. 健康度计算器
// ============================================

class HealthCalculator {
  constructor() {
    this.detector = new AnomalyDetector();
    this.utils = AnalyzerUtils;
    this.weights = ANALYZER_CONFIG.HEALTH_WEIGHTS;
  }
  
  /**
   * 计算单个城市健康度
   */
  calculateCityHealth(cityData) {
    const cityName = cityData.name || cityData.displayName;
    const module = cityData.modules?.all || {};
    
    const ue = this.utils.safeNum(module.ue);
    const subsidyRate = this.utils.safeNum(module.subsidyRatio);
    const deliveryCostRate = this.utils.safeNum(module.deliveryCostRate);
    const profitRate = this.utils.safeNum(module.profitRate);
    
    // 各维度评分
    const ueScore = this.calculateUEScore(ue);
    const subsidyScore = this.calculateSubsidyScore(subsidyRate);
    const deliveryScore = this.calculateDeliveryScore(deliveryCostRate);
    const profitScore = this.calculateProfitScore(profitRate);
    
    // 综合评分（加权平均）
    const overallScore = 
      ueScore * this.weights.ue +
      subsidyScore * this.weights.subsidy +
      deliveryScore * this.weights.delivery +
      profitScore * this.weights.profit || 0.2;
    
    return {
      city: cityName,
      overall: Math.round(overallScore),
      breakdown: {
        ue: Math.round(ueScore),
        subsidy: Math.round(subsidyScore),
        delivery: Math.round(deliveryScore),
        profit: Math.round(profitScore)
      },
      level: this.getHealthLevel(overallScore),
      status: this.getHealthStatus(overallScore)
    };
  }
  
  /**
   * 计算整体健康度
   */
  calculateOverallHealth(allCitiesData) {
    if (!allCitiesData || allCitiesData.length === 0) {
      return { overall: 0, level: 'unknown', status: '无数据' };
    }
    
    const cityHealths = allCitiesData.map(c => this.calculateCityHealth(c));
    
    // 加权平均（按订单量）
    let totalOrders = 0;
    let weightedScore = 0;
    
    cityHealths.forEach((h, i) => {
      const orders = this.utils.safeNum(allCitiesData[i].modules?.all?.orders);
      totalOrders += orders;
      weightedScore += h.overall * orders;
    });
    
    const overall = totalOrders > 0 ? weightedScore / totalOrders : this.utils.mean(cityHealths.map(h => h.overall));
    
    return {
      overall: Math.round(overall),
      level: this.getHealthLevel(overall),
      status: this.getHealthStatus(overall),
      cityHealths: cityHealths
    };
  }
  
  /**
   * UE评分
   */
  calculateUEScore(ue) {
    if (ue >= 1.5) return 100;
    if (ue >= 1.0) return 80 + 20 * (ue - 1.0) / 0.5;
    if (ue >= 0.5) return 60 + 20 * (ue - 0.5) / 0.5;
    if (ue >= 0.2) return 40 + 20 * (ue - 0.2) / 0.3;
    if (ue >= 0) return 20 + 20 * ue / 0.2;
    return Math.max(0, 20 + 20 * ue / 0.5);
  }
  
  /**
   * 补贴率评分
   */
  calculateSubsidyScore(rate) {
    const pct = rate * 100;
    if (pct <= 5) return 100;
    if (pct <= 8) return 80 + 20 * (8 - pct) / 3;
    if (pct <= 12) return 60 + 20 * (12 - pct) / 4;
    if (pct <= 18) return 40 + 20 * (18 - pct) / 6;
    if (pct <= 25) return 20 + 20 * (25 - pct) / 7;
    return Math.max(0, 20 - 5 * (pct - 25) / 10);
  }
  
  /**
   * 配送成本评分
   */
  calculateDeliveryScore(rate) {
    const pct = rate * 100;
    if (pct <= 20) return 100;
    if (pct <= 28) return 80 + 20 * (28 - pct) / 8;
    if (pct <= 35) return 60 + 20 * (35 - pct) / 7;
    if (pct <= 45) return 40 + 20 * (45 - pct) / 10;
    return Math.max(0, 40 - 10 * (pct - 45) / 15);
  }
  
  /**
   * 利润率评分
   */
  calculateProfitScore(rate) {
    const pct = rate * 100;
    if (pct >= 10) return 100;
    if (pct >= 5) return 75 + 25 * (pct - 5) / 5;
    if (pct >= 2) return 50 + 25 * (pct - 2) / 3;
    if (pct >= 0) return 25 + 25 * pct / 2;
    return Math.max(0, 25 + 25 * pct / 5);
  }
  
  /**
   * 获取健康等级
   */
  getHealthLevel(score) {
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'fair';
    if (score >= 20) return 'poor';
    return 'critical';
  }
  
  /**
   * 获取健康状态描述
   */
  getHealthStatus(score) {
    if (score >= 80) return '优秀';
    if (score >= 60) return '良好';
    if (score >= 40) return '一般';
    if (score >= 20) return '较差';
    return '危险';
  }
}

// ============================================
// 5. 根因分析器
// ============================================

class RootCauseAnalyzer {
  constructor() {
    this.utils = AnalyzerUtils;
  }
  
  /**
   * 分析异常根因（5 Whys方法）
   */
  analyze(anomaly, cityData) {
    const causes = [];
    const cityName = cityData.name || cityData.displayName;
    const module = cityData.modules?.[anomaly.module] || cityData.modules?.all || {};
    
    // Why 1: 直接原因
    let currentCause = this.findDirectCause(anomaly, module);
    if (currentCause) causes.push(currentCause);
    
    // Why 2-3: 深入原因
    if (currentCause) {
      const deeperCause = this.findDeeperCause(currentCause, module, cityData);
      if (deeperCause) causes.push(deeperCause);
    }
    
    // Why 4-5: 根本原因
    const rootCause = this.findRootCause(causes, cityData);
    if (rootCause) causes.push(rootCause);
    
    return {
      anomaly: anomaly,
      city: cityName,
      causes: causes,
      summary: this.generateSummary(causes)
    };
  }
  
  /**
   * 查找直接原因
   */
  findDirectCause(anomaly, module) {
    const ue = this.utils.safeNum(module.ue);
    const subsidyRate = this.utils.safeNum(module.subsidyRatio);
    const deliveryCost = this.utils.safeNum(module.deliveryCost);
    const onlineRevenue = this.utils.safeNum(module.onlineRevenue);
    const orders = this.utils.safeNum(module.orders);
    
    if (anomaly.type === 'ue_critical' || anomaly.type === 'ue_warning') {
      // UE问题的直接原因
      if (subsidyRate > 0.15) {
        return {
          level: 1,
          type: 'high_subsidy',
          message: '补贴率过高',
          detail: `补贴率${(subsidyRate * 100).toFixed(1)}%，侵蚀利润`
        };
      }
      if (deliveryCost / orders > 5) {
        return {
          level: 1,
          type: 'high_delivery_cost',
          message: '配送成本过高',
          detail: `单均配送成本${(deliveryCost / orders).toFixed(2)}元`
        };
      }
      if (onlineRevenue / orders < 15) {
        return {
          level: 1,
          type: 'low_revenue',
          message: '客单价偏低',
          detail: `单均收入${(onlineRevenue / orders).toFixed(2)}元`
        };
      }
    }
    
    if (anomaly.type === 'subsidy_high') {
      return {
        level: 1,
        type: 'market_pressure',
        message: '市场竞争压力大',
        detail: '为维持市场份额被迫高补贴'
      };
    }
    
    return {
      level: 1,
      type: 'unknown',
      message: '原因不明',
      detail: '需要更多数据分析'
    };
  }
  
  /**
   * 查找更深层原因
   */
  findDeeperCause(directCause, module, cityData) {
    const orders = this.utils.safeNum(module.orders);
    const cities = this.utils.safeNum(cityData.modules?.all?.orders) || orders;
    
    if (directCause.type === 'high_subsidy') {
      // 补贴高的深层原因
      if (orders < 100000) {
        return {
          level: 2,
          type: 'low_scale',
          message: '规模不足导致效率低',
          detail: `订单量${(orders/10000).toFixed(1)}万，固定成本摊销高`
        };
      }
      return {
        level: 2,
        type: 'inefficient_strategy',
        message: '补贴策略效率低',
        detail: '补贴未能有效转化为订单增长'
      };
    }
    
    if (directCause.type === 'high_delivery_cost') {
      return {
        level: 2,
        type: 'low_order_density',
        message: '订单密度低',
        detail: '配送范围大但单量少，规模不经济'
      };
    }
    
    return null;
  }
  
  /**
   * 查找根本原因
   */
  findRootCause(causes, cityData) {
    // 根本原因通常是结构性问题
    return {
      level: 3,
      type: 'structural',
      message: '业务结构需要优化',
      detail: '可能是品类结构、商户结构或运营模式问题'
    };
  }
  
  /**
   * 生成原因总结
   */
  generateSummary(causes) {
    if (causes.length === 0) return '原因不明';
    
    const messages = causes.map(c => c.message);
    return messages.join(' → ');
  }
  
  /**
   * 批量分析多个异常
   */
  analyzeBatch(anomalies, citiesData) {
    const cityMap = {};
    citiesData.forEach(c => {
      cityMap[c.name || c.displayName] = c;
    });
    
    return anomalies.map(anomaly => {
      const city = cityMap[anomaly.city];
      return this.analyze(anomaly, city || { name: anomaly.city, modules: {} });
    });
  }
}

// ============================================
// 6. 建议生成器
// ============================================

class SuggestionEngine {
  constructor() {
    this.utils = AnalyzerUtils;
  }
  
  /**
   * 基于根因生成建议
   */
  generate(causes, anomaly, cityData) {
    const suggestions = [];
    const cityName = cityData.name || cityData.displayName;
    
    causes.forEach(cause => {
      const suggestion = this.getSuggestionForCause(cause, anomaly, cityData);
      if (suggestion) {
        suggestions.push(suggestion);
      }
    });
    
    // 去重并按优先级排序
    const unique = this.deduplicate(suggestions);
    return this.prioritize(unique);
  }
  
  /**
   * 根据原因获取建议
   */
  getSuggestionForCause(cause, anomaly, cityData) {
    const cityName = cityData.name || cityData.displayName;
    const module = cityData.modules?.[anomaly.module] || cityData.modules?.all || {};
    
    switch (cause.type) {
      case 'high_subsidy':
        return {
          priority: 'P0',
          category: '补贴优化',
          action: '重新评估补贴策略',
          detail: `减少无效补贴，提高补贴效率`,
          expectedImpact: 'UE提升0.2-0.5元',
          difficulty: '高',
          steps: [
            '分析补贴结构，区分新客补贴和老客补贴',
            '对低效补贴进行A/B测试',
            '建立补贴与UE的关联模型',
            '设置补贴上限，减少超补'
          ]
        };
      
      case 'high_delivery_cost':
        return {
          priority: 'P1',
          category: '配送优化',
          action: '优化配送效率和范围',
          detail: `调整配送策略，降低单均配送成本`,
          expectedImpact: '配送成本降低15-20%',
          difficulty: '中',
          steps: [
            '分析配送热力图，识别低密度区域',
            '合并或调整配送站点',
            '优化配送路线和调度算法',
            '考虑引入兼职配送'
          ]
        };
      
      case 'low_revenue':
        return {
          priority: 'P1',
          category: '收入提升',
          action: '提升客单价和转化率',
          detail: `通过品类优化和运营提升客单价`,
          expectedImpact: '客单价提升20-30%',
          difficulty: '中',
          steps: [
            '分析高客单价品类占比',
            '优化商品结构，引入高价值品类',
            '设计满减活动提升客单价',
            '提升用户复购率'
          ]
        };
      
      case 'low_scale':
        return {
          priority: 'P2',
          category: '规模扩张',
          action: '提升订单规模',
          detail: `通过市场推广提升订单量`,
          expectedImpact: '订单量提升20%+',
          difficulty: '高',
          steps: [
            '分析订单增长瓶颈',
            '制定获客激励方案',
            '与商户联合营销',
            '优化用户体验提升转化'
          ]
        };
      
      case 'structural':
        return {
          priority: 'P2',
          category: '结构调整',
          action: '优化业务结构',
          detail: `调整品类和商户结构`,
          expectedImpact: '长期效益显著',
          difficulty: '高',
          steps: [
            '分析各品类UE表现',
            '加大高UE品类（医药）投入',
            '优化低UE品类（闪购、拼好饭）',
            '引入优质商户'
          ]
        };
      
      default:
        return {
          priority: 'P3',
          category: '常规优化',
          action: '持续监控和优化',
          detail: '保持当前运营，关注数据变化',
          expectedImpact: '稳定现有水平',
          difficulty: '低'
        };
    }
  }
  
  /**
   * 去重
   */
  deduplicate(suggestions) {
    const seen = new Set();
    return suggestions.filter(s => {
      const key = s.action;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  
  /**
   * 优先级排序
   */
  prioritize(suggestions) {
    const order = { 'P0': 0, 'P1': 1, 'P2': 2, 'P3': 3 };
    return suggestions.sort((a, b) => order[a.priority] - order[b.priority]);
  }
  
  /**
   * 批量生成建议
   */
  generateBatch(rootCauses, anomalies, citiesData) {
    const cityMap = {};
    citiesData.forEach(c => {
      cityMap[c.name || c.displayName] = c;
    });
    
    const allSuggestions = [];
    
    rootCauses.forEach((rc, i) => {
      const city = cityMap[rc.city];
      const anomaly = anomalies[i];
      if (city && anomaly) {
        const suggestions = this.generate(rc.causes, anomaly, city);
        suggestions.forEach(s => {
          s.city = rc.city;
          s.module = anomaly.module;
          allSuggestions.push(s);
        });
      }
    });
    
    return this.prioritize(this.deduplicate(allSuggestions));
  }
}

// ============================================
// 7. 主分析引擎（整合所有组件）
// ============================================

class FinancialAnalyzer {
  constructor() {
    this.detector = new AnomalyDetector();
    this.calculator = new HealthCalculator();
    this.rootCauseAnalyzer = new RootCauseAnalyzer();
    this.suggestionEngine = new SuggestionEngine();
    this.utils = AnalyzerUtils;
  }
  
  /**
   * 完整分析流程
   */
  analyze(fullData) {
    const citiesData = fullData.cities || [];
    
    // 1. 检测异常
    const anomalies = this.detector.detectAllAnomalies(citiesData);
    
    // 2. 计算健康度
    const health = this.calculator.calculateOverallHealth(citiesData);
    
    // 3. 根因分析
    const rootCauses = this.rootCauseAnalyzer.analyzeBatch(anomalies, citiesData);
    
    // 4. 生成建议
    const suggestions = this.suggestionEngine.generateBatch(rootCauses, anomalies, citiesData);
    
    // 5. 生成洞察
    const insights = this.generateInsights(health, anomalies, citiesData);
    
    return {
      timestamp: new Date().toISOString(),
      health: health,
      anomalies: anomalies,
      rootCauses: rootCauses,
      suggestions: suggestions,
      insights: insights,
      summary: this.generateSummary(health, anomalies, suggestions)
    };
  }
  
  /**
   * 生成洞察
   */
  generateInsights(health, anomalies, citiesData) {
    const insights = [];
    
    // 洞察1: 整体健康状况
    if (health.overall >= 70) {
      insights.push({
        type: 'positive',
        icon: '✅',
        title: '整体运营健康',
        content: `综合健康度${health.overall}分，整体运营状况良好`
      });
    } else if (health.overall >= 50) {
      insights.push({
        type: 'warning',
        icon: '⚠️',
        title: '需要关注',
        content: `综合健康度${health.overall}分，部分指标需要优化`
      });
    } else {
      insights.push({
        type: 'negative',
        icon: '🚨',
        title: '运营异常',
        content: `综合健康度${health.overall}分，需要重点关注`
      });
    }
    
    // 洞察2: 模块表现
    const moduleUE = this.getModuleUESummary(citiesData);
    const bestModule = Object.entries(moduleUE).sort((a, b) => b[1] - a[1])[0];
    const worstModule = Object.entries(moduleUE).sort((a, b) => a[1] - b[1])[0];
    
    if (bestModule && bestModule[1] > 0) {
      insights.push({
        type: 'positive',
        icon: '⭐',
        title: `${this.getModuleName(bestModule[0])}表现最优`,
        content: `UE达${bestModule[1].toFixed(2)}元，可作为标杆推广`
      });
    }
    
    if (worstModule && worstModule[1] < 0) {
      insights.push({
        type: 'negative',
        icon: '🔴',
        title: `${this.getModuleName(worstModule[0])}持续亏损`,
        content: `UE为${worstModule[1].toFixed(2)}元，建议重点优化`
      });
    }
    
    // 洞察3: 异常数量
    const criticalCount = anomalies.filter(a => a.maxSeverity === 'critical').length;
    if (criticalCount > 0) {
      insights.push({
        type: 'negative',
        icon: '🚨',
        title: `${criticalCount}个严重异常需要处理`,
        content: '详见下方异常列表'
      });
    }
    
    return insights;
  }
  
  /**
   * 获取模块UE汇总
   */
  getModuleUESummary(citiesData) {
    const modules = { all: [], food: [], flash: [], medicine: [], group: [] };
    
    citiesData.forEach(city => {
      Object.keys(modules).forEach(mod => {
        if (city.modules?.[mod]?.orders > 0) {
          modules[mod].push(this.utils.safeNum(city.modules[mod].ue));
        }
      });
    });
    
    const result = {};
    Object.keys(modules).forEach(mod => {
      result[mod] = modules[mod].length > 0 ? this.utils.mean(modules[mod]) : 0;
    });
    
    return result;
  }
  
  /**
   * 获取模块中文名
   */
  getModuleName(key) {
    const names = { all: '全品类', food: '餐饮', flash: '闪购', medicine: '医药', group: '拼好饭' };
    return names[key] || key;
  }
  
  /**
   * 生成摘要
   */
  generateSummary(health, anomalies, suggestions) {
    const criticalAnomalies = anomalies.filter(a => a.maxSeverity === 'critical');
    const warningAnomalies = anomalies.filter(a => a.maxSeverity === 'warning');
    const p0Suggestions = suggestions.filter(s => s.priority === 'P0');
    
    return {
      healthScore: health.overall,
      criticalCount: criticalAnomalies.length,
      warningCount: warningAnomalies.length,
      topPriority: p0Suggestions.length > 0 ? p0Suggestions[0].action : '暂无紧急事项',
      estimatedImprovement: this.estimateImprovement(suggestions)
    };
  }
  
  /**
   * 估算改进空间
   */
  estimateImprovement(suggestions) {
    const p0Count = suggestions.filter(s => s.priority === 'P0').length;
    const p1Count = suggestions.filter(s => s.priority === 'P1').length;
    
    if (p0Count >= 2) return '10-20万/月';
    if (p1Count >= 2) return '5-10万/月';
    if (p0Count >= 1 || p1Count >= 1) return '3-5万/月';
    return '1-3万/月';
  }
}

// ============================================
// 8. 导出
// ============================================

// 注册到全局
window.FinancialAnalyzer = FinancialAnalyzer;
window.AnomalyDetector = AnomalyDetector;
window.HealthCalculator = HealthCalculator;
window.RootCauseAnalyzer = RootCauseAnalyzer;
window.SuggestionEngine = SuggestionEngine;
window.ANALYZER_CONFIG = ANALYZER_CONFIG;
window.AnalyzerUtils = AnalyzerUtils;

console.log('[Analyzer] 智能分析引擎 v2 加载完成');

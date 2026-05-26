/**
 * 增强版异常检测器 v2
 * 基于真实数据分析的智能检测
 */

// 继承基础检测器
class EnhancedAnomalyDetector extends AnomalyDetector {
  constructor() {
    super();
    
    // 添加增强的检测规则
    this.enhancedRules = {
      // 补贴效率规则
      subsidyEfficiency: {
        // 高补贴但低UE = 补贴效率低
        highSubsidyLowUE: (data) => {
          const subsidyRate = data.subsidyRatio * 100;
          const ue = data.ue;
          
          if (subsidyRate > 15 && ue < 0) {
            return {
              type: 'subsidy_inefficiency',
              severity: 'critical',
              message: `补贴率${subsidyRate.toFixed(1)}%但UE为${ue.toFixed(2)}元，补贴效率极低`,
              detail: '建议重新评估补贴策略，可能存在无效补贴'
            };
          }
          return null;
        },
        
        // 闪购模块特殊规则（补贴率低但亏损）
        flashLowSubsidyLoss: (data) => {
          const subsidyRate = data.subsidyRatio * 100;
          const ue = data.ue;
          const orders = data.orders;
          
          if (data.module === 'flash' && subsidyRate < 5 && ue < -0.5) {
            return {
              type: 'flash_structure_issue',
              severity: 'critical',
              message: `闪购补贴率仅${subsidyRate.toFixed(1)}%但仍亏损严重，结构性问题`,
              detail: '闪购模式本身可能存在问题，需要重新评估业务模式'
            };
          }
          return null;
        }
      },
      
      // 配送效率规则
      deliveryEfficiency: {
        // 配送成本过高
        highDeliveryCost: (data) => {
          const deliveryCostRate = data.deliveryCostRate * 100;
          const orders = data.orders;
          
          if (deliveryCostRate > 40) {
            return {
              type: 'delivery_cost_critical',
              severity: 'critical',
              message: `配送成本率高达${deliveryCostRate.toFixed(1)}%，规模不经济`,
              detail: '订单密度可能过低，建议优化配送范围或合并站点'
            };
          }
          return null;
        },
        
        // 大城市配送成本控制差
        largeCityDeliveryIssue: (data) => {
          if (data.cityTier === 'tier1' && data.deliveryCostRate > 0.30) {
            return {
              type: 'large_city_delivery_issue',
              severity: 'warning',
              message: '大城市配送成本控制欠佳',
              detail: '作为大规模城市，配送效率应有更大优化空间'
            };
          }
          return null;
        }
      },
      
      // UE异常规则
      ueAnomaly: {
        // 严重亏损
        severeLoss: (data) => {
          if (data.ue < -1.0) {
            return {
              type: 'severe_ue_loss',
              severity: 'critical',
              message: `UE严重亏损，达${data.ue.toFixed(2)}元/单`,
              detail: `月损失约${this.formatLoss(data.ue, data.orders)}元，需立即整改`
            };
          }
          return null;
        },
        
        // 系统性亏损（多模块亏损）
        systemicLoss: (data) => {
          if (data.moduleCount && data.moduleCount >= 3) {
            return {
              type: 'systemic_loss',
              severity: 'critical',
              message: `该城市${data.moduleCount}个模块亏损，系统性问题`,
              detail: '需要全面审计该城市运营状况'
            };
          }
          return null;
        }
      },
      
      // 规模效率规则
      scaleEfficiency: {
        // 规模大但UE低
        largeScaleLowUE: (data) => {
          if (data.orders > 300000 && data.ue < 0) {
            return {
              type: 'scale_inefficiency',
              severity: 'critical',
              message: `订单量${(data.orders/10000).toFixed(1)}万但UE为负，规模不经济`,
              detail: '大规模应该是优势，但当前反而成为负担，需要反思运营策略'
            };
          }
          return null;
        },
        
        // 规模小但表现好
        smallScaleGood: (data) => {
          if (data.orders < 100000 && data.ue > 0.5) {
            return {
              type: 'small_scale_excellent',
              severity: 'positive',
              message: `小规模城市表现优秀，UE达${data.ue.toFixed(2)}元`,
              detail: '可总结该城市经验，推广到其他城市'
            };
          }
          return null;
        }
      },
      
      // 模块特性规则
      moduleSpecific: {
        // 医药模块应该表现好
        medicineShouldBeGood: (data) => {
          if (data.module === 'medicine' && data.ue < 1.0) {
            return {
              type: 'medicine_performance_issue',
              severity: 'warning',
              message: '医药模块UE偏低，未发挥该模块优势',
              detail: '医药通常是高毛利模块，建议优化品类结构'
            };
          }
          return null;
        },
        
        // 拼好饭高补贴率
        groupHighSubsidy: (data) => {
          if (data.module === 'group' && data.subsidyRatio > 0.15) {
            return {
              type: 'group_high_subsidy',
              severity: 'warning',
              message: `拼好饭补贴率${(data.subsidyRatio*100).toFixed(1)}%，补贴偏高`,
              detail: '需要评估拼好饭的商业价值，考虑调整策略'
            };
          }
          return null;
        }
      }
    };
  }
  
  /**
   * 增强版异常检测
   */
  detectEnhanced(cityData, allCitiesData) {
    const anomalies = [];
    const cityName = cityData.name || cityData.displayName;
    const cityTier = this.utils.getCityTier(cityName);
    
    // 统计亏损模块数量
    const moduleCount = this.countLossModules(cityData);
    
    // 检测全品类和各模块
    const modules = ['all', 'food', 'flash', 'medicine', 'group'];
    
    modules.forEach(modKey => {
      const moduleData = cityData.modules?.[modKey];
      if (!moduleData || !moduleData.orders || moduleData.orders === 0) return;
      
      const data = {
        city: cityName,
        cityTier: cityTier,
        module: modKey,
        moduleCount: moduleCount,
        ue: this.utils.safeNum(moduleData.ue),
        subsidyRatio: this.utils.safeNum(moduleData.subsidyRatio),
        deliveryCostRate: this.utils.safeNum(moduleData.deliveryCostRate),
        orders: this.utils.safeNum(moduleData.orders),
        gmvAmount: this.utils.safeNum(moduleData.gmvAmount),
        profit: this.utils.safeNum(moduleData.profit)
      };
      
      // 运行所有增强规则
      Object.values(this.enhancedRules).forEach(ruleGroup => {
        Object.values(ruleGroup).forEach(rule => {
          const result = rule(data);
          if (result) {
            anomalies.push({
              ...result,
              city: cityName,
              module: modKey,
              metric: 'enhanced',
              value: data.ue
            });
          }
        });
      });
      
      // 添加基础检测
      const basicAnomalies = this.detectCityModuleAnomaly(cityName, {
        key: modKey,
        ...moduleData
      });
      
      if (basicAnomalies.isAnomaly) {
        anomalies.push(...basicAnomalies.anomalies.map(a => ({
          ...a,
          city: cityName,
          module: modKey
        })));
      }
    });
    
    // 去重并按严重程度排序
    return this.deduplicateAndSort(anomalies);
  }
  
  /**
   * 检测所有城市的增强异常
   */
  detectAllEnhanced(citiesData) {
    const allAnomalies = [];
    
    citiesData.forEach(city => {
      const anomalies = this.detectEnhanced(city, citiesData);
      allAnomalies.push(...anomalies);
    });
    
    return this.deduplicateAndSort(allAnomalies);
  }
  
  /**
   * 统计亏损模块数量
   */
  countLossModules(cityData) {
    let count = 0;
    ['all', 'food', 'flash', 'medicine', 'group'].forEach(mod => {
      const m = cityData.modules?.[mod];
      if (m && m.orders && m.ue < 0) {
        count++;
      }
    });
    return count;
  }
  
  /**
   * 去重并排序
   */
  deduplicateAndSort(anomalies) {
    // 按城市+模块+类型去重
    const seen = new Set();
    const unique = anomalies.filter(a => {
      const key = `${a.city}-${a.module}-${a.type}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    
    // 按严重程度排序
    const severityOrder = { critical: 0, warning: 1, positive: 2 };
    return unique.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  }
  
  /**
   * 格式化损失金额
   */
  formatLoss(ue, orders) {
    const loss = Math.abs(ue * orders);
    if (loss >= 10000) {
      return (loss / 10000).toFixed(1) + '万';
    }
    return loss.toFixed(0);
  }
}

// 关联分析器
class CorrelationAnalyzer {
  constructor() {
    this.utils = AnalyzerUtils;
  }
  
  /**
   * 分析指标间的关联关系
   */
  analyzeCorrelations(citiesData) {
    const correlations = [];
    
    // 1. 补贴率 vs UE 关系
    const subsidyUE = this.analyzeSubsidyUE(citiesData);
    if (subsidyUE) correlations.push(subsidyUE);
    
    // 2. 订单规模 vs UE 关系
    const scaleUE = this.analyzeScaleUE(citiesData);
    if (scaleUE) correlations.push(scaleUE);
    
    // 3. 配送成本 vs UE 关系
    const deliveryUE = this.analyzeDeliveryUE(citiesData);
    if (deliveryUE) correlations.push(deliveryUE);
    
    return correlations;
  }
  
  /**
   * 分析补贴率与UE的关系
   */
  analyzeSubsidyUE(citiesData) {
    const points = [];
    
    citiesData.forEach(city => {
      const m = city.modules?.all;
      if (m && m.orders > 0) {
        points.push({
          city: city.name || city.displayName,
          subsidyRate: m.subsidyRatio * 100,
          ue: m.ue
        });
      }
    });
    
    // 找出补贴率高但UE低的异常
    const inefficientCities = points.filter(p => p.subsidyRate > 8 && p.ue < 0.3);
    
    if (inefficientCities.length > 0) {
      return {
        type: 'subsidy_ue_correlation',
        title: '补贴效率分析',
        description: '部分城市补贴率偏高但UE表现一般',
        insight: `${inefficientCities.map(c => c.city).join('、')}补贴率偏高但UE偏低，存在优化空间`,
        details: inefficientCities
      };
    }
    
    return null;
  }
  
  /**
   * 分析订单规模与UE的关系
   */
  analyzeScaleUE(citiesData) {
    const largeScale = [];
    const smallScale = [];
    
    citiesData.forEach(city => {
      const m = city.modules?.all;
      if (m && m.orders > 0) {
        const point = {
          city: city.name || city.displayName,
          orders: m.orders,
          ue: m.ue
        };
        
        if (m.orders > 100000) {
          largeScale.push(point);
        } else {
          smallScale.push(point);
        }
      }
    });
    
    const avgLargeUE = largeScale.length > 0 
      ? largeScale.reduce((sum, p) => sum + p.ue, 0) / largeScale.length 
      : 0;
    const avgSmallUE = smallScale.length > 0 
      ? smallScale.reduce((sum, p) => sum + p.ue, 0) / smallScale.length 
      : 0;
    
    return {
      type: 'scale_ue_correlation',
      title: '规模效率分析',
      description: '大城市与小城市的UE对比',
      insight: `大城市平均UE ${avgLargeUE.toFixed(2)}元，小城市平均UE ${avgSmallUE.toFixed(2)}元`,
      largeScale: largeScale,
      smallScale: smallScale
    };
  }
  
  /**
   * 分析配送成本与UE的关系
   */
  analyzeDeliveryUE(citiesData) {
    const highDeliveryLowUE = [];
    
    citiesData.forEach(city => {
      const m = city.modules?.all;
      if (m && m.orders > 0) {
        const deliveryRate = (m.deliveryCost / m.totalExpense) * 100;
        
        if (deliveryRate > 35 && m.ue < 0.5) {
          highDeliveryLowUE.push({
            city: city.name || city.displayName,
            deliveryRate: deliveryRate,
            ue: m.ue
          });
        }
      }
    });
    
    if (highDeliveryLowUE.length > 0) {
      return {
        type: 'delivery_ue_correlation',
        title: '配送成本分析',
        description: '配送成本率过高且UE偏低的城市',
        insight: `${highDeliveryLowUE.map(c => c.city).join('、')}配送成本偏高，可能是亏损的重要原因`,
        details: highDeliveryLowUE
      };
    }
    
    return null;
  }
  
  /**
   * 模块间对比分析
   */
  analyzeModuleComparison(citiesData) {
    const modules = ['all', 'food', 'flash', 'medicine', 'group'];
    const moduleStats = {};
    
    modules.forEach(mod => {
      const values = [];
      citiesData.forEach(city => {
        const m = city.modules?.[mod];
        if (m && m.orders > 0) {
          values.push({
            city: city.name || city.displayName,
            ue: m.ue,
            subsidyRatio: m.subsidyRatio,
            orders: m.orders
          });
        }
      });
      
      if (values.length > 0) {
        moduleStats[mod] = {
          avgUE: this.utils.mean(values.map(v => v.ue)),
          avgSubsidy: this.utils.mean(values.map(v => v.subsidyRatio)),
          totalOrders: values.reduce((sum, v) => sum + v.orders, 0),
          lossCount: values.filter(v => v.ue < 0).length
        };
      }
    });
    
    // 找出最佳和最差模块
    const sorted = Object.entries(moduleStats)
      .filter(([key]) => key !== 'all')
      .sort((a, b) => b[1].avgUE - a[1].avgUE);
    
    const bestModule = sorted[0];
    const worstModule = sorted[sorted.length - 1];
    
    return {
      type: 'module_comparison',
      title: '模块对比分析',
      bestModule: bestModule ? { name: bestModule[0], stats: bestModule[1] } : null,
      worstModule: worstModule ? { name: worstModule[0], stats: worstModule[1] } : null,
      allModules: moduleStats,
      insight: bestModule && worstModule 
        ? `${this.getModuleName(bestModule[0])}表现最优（UE ${bestModule[1].avgUE.toFixed(2)}），${this.getModuleName(worstModule[0])}表现最差（UE ${worstModule[1].avgUE.toFixed(2)}）`
        : '各模块表现对比'
    };
  }
  
  getModuleName(key) {
    const names = { all: '全品类', food: '餐饮', flash: '闪购', medicine: '医药', group: '拼好饭' };
    return names[key] || key;
  }
}

// 趋势分析器
class TrendAnalyzer {
  constructor() {
    this.utils = AnalyzerUtils;
  }
  
  /**
   * 分析指标趋势
   */
  analyzeTrends(historicalData) {
    if (!historicalData || historicalData.length < 2) {
      return null;
    }
    
    const trends = [];
    
    // UE趋势
    const ueTrend = this.calculateTrend(historicalData.map(d => d.ue));
    trends.push({
      metric: 'ue',
      name: 'UE',
      direction: ueTrend > 0 ? '上升' : '下降',
      change: ueTrend.toFixed(2),
      insight: `UE${ueTrend > 0 ? '上升' : '下降'}了${Math.abs(ueTrend).toFixed(2)}元`
    });
    
    // 补贴率趋势
    const subsidyTrend = this.calculateTrend(historicalData.map(d => d.subsidyRatio));
    trends.push({
      metric: 'subsidyRatio',
      name: '补贴率',
      direction: subsidyTrend < 0 ? '下降' : '上升',
      change: (subsidyTrend * 100).toFixed(2),
      insight: `补贴率${subsidyTrend < 0 ? '下降' : '上升'}了${Math.abs(subsidyTrend * 100).toFixed(1)}%`
    });
    
    // 订单量趋势
    const ordersTrend = this.calculateTrend(historicalData.map(d => d.orders));
    trends.push({
      metric: 'orders',
      name: '订单量',
      direction: ordersTrend > 0 ? '上升' : '下降',
      change: ordersTrend.toFixed(0),
      insight: `订单量${ordersTrend > 0 ? '增加' : '减少'}了${Math.abs(ordersTrend).toFixed(0)}单`
    });
    
    return {
      trends: trends,
      period: `${historicalData.length}期数据`,
      overallTrend: this.getOverallTrend(trends)
    };
  }
  
  /**
   * 计算趋势值（简单线性回归斜率）
   */
  calculateTrend(values) {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const xMean = (n - 1) / 2;
    const yMean = this.utils.mean(values);
    
    let numerator = 0;
    let denominator = 0;
    
    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (values[i] - yMean);
      denominator += (i - xMean) * (i - xMean);
    }
    
    return denominator !== 0 ? numerator / denominator : 0;
  }
  
  /**
   * 获取整体趋势
   */
  getOverallTrend(trends) {
    const positiveCount = trends.filter(t => 
      (t.metric === 'ue' && t.direction === '上升') ||
      (t.metric === 'subsidyRatio' && t.direction === '下降')
    ).length;
    
    if (positiveCount >= 2) {
      return '整体向好';
    } else if (positiveCount === 0) {
      return '整体下滑';
    } else {
      return '基本持平';
    }
  }
}

// 导出增强版类
window.EnhancedAnomalyDetector = EnhancedAnomalyDetector;
window.CorrelationAnalyzer = CorrelationAnalyzer;
window.TrendAnalyzer = TrendAnalyzer;

console.log('[Analyzer] 增强版分析模块加载完成');

/**
 * 增强版根因分析器 v2
 * 基于5 Whys方法的智能诊断
 */

class EnhancedRootCauseAnalyzer extends RootCauseAnalyzer {
  constructor() {
    super();
    
    // 根因知识图谱
    this.causeKnowledgeGraph = {
      // UE低的根因
      'ue_low': {
        direct: [
          { cause: 'subsidy_high', weight: 0.35, message: '补贴率过高' },
          { cause: 'delivery_cost_high', weight: 0.30, message: '配送成本过高' },
          { cause: 'revenue_low', weight: 0.25, message: '收入偏低' },
          { cause: 'cost_structure_bad', weight: 0.10, message: '成本结构不合理' }
        ],
        deeper: {
          'subsidy_high': [
            { cause: 'market_competition', weight: 0.40, message: '市场竞争激烈' },
            { cause: 'inefficient_strategy', weight: 0.35, message: '补贴策略效率低' },
            { cause: 'low_scale', weight: 0.25, message: '规模不足导致成本高' }
          ],
          'delivery_cost_high': [
            { cause: 'low_order_density', weight: 0.45, message: '订单密度低' },
            { cause: 'inefficient_route', weight: 0.30, message: '配送路线效率低' },
            { cause: 'high_fixed_cost', weight: 0.25, message: '固定成本过高' }
          ],
          'revenue_low': [
            { cause: 'low_unit_price', weight: 0.40, message: '客单价低' },
            { cause: 'low_conversion', weight: 0.30, message: '转化率低' },
            { cause: 'poor_category', weight: 0.30, message: '品类结构差' }
          ]
        },
        root: {
          'market_competition': '需要差异化竞争或提升服务',
          'inefficient_strategy': '应该建立补贴效率评估机制',
          'low_scale': '应该提升运营效率或调整规模',
          'low_order_density': '应该优化配送范围或合并站点',
          'inefficient_route': '应该优化配送算法',
          'high_fixed_cost': '应该审计固定成本结构',
          'low_unit_price': '应该引入高价值品类',
          'low_conversion': '应该优化用户体验和营销策略',
          'poor_category': '应该调整品类结构'
        }
      },
      
      // 补贴高的根因
      'subsidy_high': {
        direct: [
          { cause: 'market_pressure', weight: 0.40, message: '市场竞争压力大' },
          { cause: 'maintain_share', weight: 0.30, message: '需维持市场份额' },
          { cause: 'inefficient_subsidy', weight: 0.30, message: '补贴效率低' }
        ],
        deeper: {
          'market_pressure': [
            { cause: 'competitor_activity', weight: 0.50, message: '竞争对手活动频繁' },
            { cause: 'weak_advantage', weight: 0.50, message: '自身竞争优势弱' }
          ],
          'maintain_share': [
            { cause: 'user_loyalty_low', weight: 0.60, message: '用户粘性低' },
            { cause: 'dependency_high', weight: 0.40, message: '对补贴依赖性强' }
          ],
          'inefficient_subsidy': [
            { cause: 'no_targeting', weight: 0.50, message: '补贴无差异化' },
            { cause: 'no_evaluation', weight: 0.50, message: '缺少补贴效果评估' }
          ]
        },
        root: {
          'competitor_activity': '需要关注竞争对手动态',
          'weak_advantage': '应该建立非价格竞争优势',
          'user_loyalty_low': '应该提升服务质量和用户体验',
          'dependency_high': '应该逐步降低补贴依赖',
          'no_targeting': '应该实施精准补贴策略',
          'no_evaluation': '应该建立补贴效果追踪机制'
        }
      },
      
      // 配送成本高的根因
      'delivery_cost_high': {
        direct: [
          { cause: 'low_order_density', weight: 0.40, message: '订单密度低' },
          { cause: 'wide_coverage', weight: 0.30, message: '配送范围过大' },
          { cause: 'inefficient_dispatch', weight: 0.30, message: '调度效率低' }
        ],
        deeper: {
          'low_order_density': [
            { cause: 'sparse_market', weight: 0.50, message: '市场覆盖稀疏' },
            { cause: 'poor_location', weight: 0.50, message: '站点位置不佳' }
          ],
          'wide_coverage': [
            { cause: 'expansion_too_fast', weight: 0.60, message: '扩张过快' },
            { cause: 'no_optimization', weight: 0.40, message: '未优化配送边界' }
          ],
          'inefficient_dispatch': [
            { cause: 'algorithm_issue', weight: 0.50, message: '调度算法待优化' },
            { cause: 'staff_issue', weight: 0.50, message: '配送员效率问题' }
          ]
        },
        root: {
          'sparse_market': '应该收缩低密度区域',
          'poor_location': '应该重新评估站点选址',
          'expansion_too_fast': '应该放缓扩张节奏',
          'no_optimization': '应该用数据分析优化配送边界',
          'algorithm_issue': '应该升级调度算法',
          'staff_issue': '应该培训或调整配送团队'
        }
      }
    };
    
    // 场景化诊断规则
    this.scenarioRules = {
      // 闪购模式问题
      'flash_issue': (data) => {
        if (data.module === 'flash') {
          return {
            scenario: '闪购模式诊断',
            analysis: '闪购客单价低、配送成本高是天然劣势',
            rootCause: '业务模式本身的问题',
            recommendations: [
              { priority: 'P1', action: '评估闪购模式的长期可行性' },
              { priority: 'P1', action: '优化闪购品类结构，引入高客单价商品' },
              { priority: 'P2', action: '缩小闪购配送范围' },
              { priority: 'P2', action: '提高闪购订单密度要求' }
            ]
          };
        }
        return null;
      },
      
      // 拼好饭问题
      'group_issue': (data) => {
        if (data.module === 'group') {
          return {
            scenario: '拼好饭模式诊断',
            analysis: '拼好饭依赖高补贴吸引用户',
            rootCause: '商业模式不可持续',
            recommendations: [
              { 
                priority: 'P1', 
                action: '重新评估拼好饭ROI',
                urgency: 'medium',
                importance: 'high',
                controllability: 'medium'
              },
              { 
                priority: 'P1', 
                action: '减少无效补贴，精准补贴',
                urgency: 'high',
                importance: 'high',
                controllability: 'high'
              },
              { 
                priority: 'P2', 
                action: '提升拼好饭客单价',
                urgency: 'low',
                importance: 'medium',
                controllability: 'medium'
              },
              { 
                priority: 'P2', 
                action: '考虑收缩亏损区域',
                urgency: 'low',
                importance: 'medium',
                controllability: 'low'
              }
            ]
          };
        }
        return null;
      },
      
      // 承德问题
      'chengde_issue': (data) => {
        if (data.city === '承德') {
          return {
            scenario: '承德市诊断',
            analysis: '承德是最大城市但亏损',
            rootCause: '规模效应未发挥',
            recommendations: [
              { 
                priority: 'P1', 
                action: '承德专项成本审计',
                urgency: 'medium',
                importance: 'medium',
                controllability: 'medium'
              },
              { 
                priority: 'P1', 
                action: '与围场对比分析找差距',
                urgency: 'medium',
                importance: 'medium',
                controllability: 'high'
              },
              { 
                priority: 'P2', 
                action: '优化承德成本结构',
                urgency: 'low',
                importance: 'high',
                controllability: 'medium'
              },
              { 
                priority: 'P2', 
                action: '总结围场经验推广',
                urgency: 'low',
                importance: 'medium',
                controllability: 'high'
              }
            ]
          };
        }
        return null;
      }
    };
  }
  
  /**
   * 增强版根因分析
   */
  analyzeEnhanced(anomaly, cityData, allCitiesData) {
    const results = [];
    
    // 1. 场景化诊断
    const scenarioResult = this.runScenarioRules(anomaly, cityData);
    if (scenarioResult) {
      results.push(scenarioResult);
    }
    
    // 2. 通用根因分析（5 Whys）
    const whysResult = this.analyzeWithKnowledgeGraph(anomaly, cityData);
    if (whysResult) {
      results.push(whysResult);
    }
    
    // 3. 对比分析（同区域城市对比）
    const comparisonResult = this.compareWithSimilarCities(anomaly, cityData, allCitiesData);
    if (comparisonResult) {
      results.push(comparisonResult);
    }
    
    return this.consolidateResults(results);
  }
  
  /**
   * 运行场景化诊断规则
   */
  runScenarioRules(anomaly, cityData) {
    const cityName = cityData.name || cityData.displayName;
    const module = anomaly.module;
    
    // 检查闪购场景
    if (module === 'flash') {
      const scenario = this.scenarioRules.flash_issue({
        module: module,
        city: cityName,
        ...cityData.modules?.flash
      });
      if (scenario) return scenario;
    }
    
    // 检查拼好饭场景
    if (module === 'group') {
      const scenario = this.scenarioRules.group_issue({
        module: module,
        city: cityName,
        ...cityData.modules?.group
      });
      if (scenario) return scenario;
    }
    
    // 检查承德场景
    if (cityName === '承德') {
      const scenario = this.scenarioRules.chengde_issue({
        module: module,
        city: cityName,
        ...cityData.modules
      });
      if (scenario) return scenario;
    }
    
    return null;
  }
  
  /**
   * 使用知识图谱进行根因分析
   */
  analyzeWithKnowledgeGraph(anomaly, cityData) {
    const module = cityData.modules?.[anomaly.module] || cityData.modules?.all || {};
    
    // 确定根因类型
    let causeType = 'ue_low';
    if (anomaly.type?.includes('subsidy')) causeType = 'subsidy_high';
    if (anomaly.type?.includes('delivery')) causeType = 'delivery_cost_high';
    
    const graph = this.causeKnowledgeGraph[causeType];
    if (!graph) return null;
    
    // Why 1: 直接原因
    const directCauses = this.selectCausesByWeight(graph.direct);
    const why1 = directCauses[0];
    
    // Why 2-3: 深入原因
    let why2 = null;
    let why3 = null;
    if (graph.deeper[why1.cause]) {
      const deeperCauses = this.selectCausesByWeight(graph.deeper[why1.cause]);
      why2 = deeperCauses[0];
      
      if (graph.deeper[why2.cause]) {
        const deeperCauses2 = this.selectCausesByWeight(graph.deeper[why2.cause]);
        why3 = deeperCauses2[0];
      }
    }
    
    // Why 4-5: 根本原因
    const why4 = why3 ? { cause: why3.cause, message: graph.root[why3.cause] || why3.message } : null;
    const why5 = why4 ? { cause: why4.cause, message: graph.root[why4.cause] || why4.message } : null;
    
    // 构建原因链
    const causeChain = [why1, why2, why3, why4, why5].filter(Boolean);
    
    return {
      scenario: '5 Whys 根因分析',
      analysis: `通过层层追问，发现核心问题在于：${why1.message}`,
      causeChain: causeChain.map((c, i) => ({
        level: i + 1,
        why: `Why ${i + 1}`,
        cause: c.cause,
        message: c.message
      })),
      rootCause: why5?.message || why4?.message || why3?.message || why1.message,
      confidence: 0.8 // 置信度
    };
  }
  
  /**
   * 根据权重选择原因
   */
  selectCausesByWeight(causes) {
    // 按权重排序
    const sorted = [...causes].sort((a, b) => b.weight - a.weight);
    return sorted;
  }
  
  /**
   * 与相似城市对比
   */
  compareWithSimilarCities(anomaly, cityData, allCitiesData) {
    const cityName = cityData.name || cityData.displayName;
    
    // 找出相似城市（规模相近）
    const currentOrders = cityData.modules?.all?.orders || 0;
    const similarCities = allCitiesData.filter(c => {
      if (c.name === cityName) return false;
      const orders = c.modules?.all?.orders || 0;
      return Math.abs(orders - currentOrders) / currentOrders < 0.5; // 50%范围内
    });
    
    if (similarCities.length === 0) return null;
    
    // 找出表现最好的相似城市
    const bestCity = similarCities.reduce((best, city) => {
      const bestUE = best.modules?.all?.ue || -999;
      const cityUE = city.modules?.all?.ue || -999;
      return cityUE > bestUE ? city : best;
    });
    
    const currentUE = cityData.modules?.all?.ue || 0;
    const bestUE = bestCity.modules?.all?.ue || 0;
    
    if (currentUE >= bestUE) return null;
    
    return {
      scenario: '同类城市对比分析',
      analysis: `${cityName}的UE（${currentUE.toFixed(2)}）低于相似城市${bestCity.name}（${bestUE.toFixed(2)}）`,
      gap: (bestUE - currentUE).toFixed(2),
      bestPractice: {
        city: bestCity.name,
        ue: bestUE.toFixed(2),
        subsidyRate: ((bestCity.modules?.all?.subsidyRatio || 0) * 100).toFixed(1) + '%'
      },
      recommendation: `可以借鉴${bestCity.name}的经验，特别是补贴策略和成本控制`
    };
  }
  
  /**
   * 整合分析结果
   */
  consolidateResults(results) {
    if (results.length === 0) {
      return {
        summary: '未发现明显根因',
        recommendations: [{ priority: 'P3', action: '持续监控，关注数据变化' }]
      };
    }
    
    // 合并所有建议
    const allRecommendations = [];
    const allCauseChains = [];
    
    results.forEach(result => {
      if (result.causeChain) {
        allCauseChains.push(...result.causeChain);
      }
      if (result.recommendations) {
        allRecommendations.push(...result.recommendations);
      }
    });
    
    // 去重并按优先级排序
    const uniqueRecommendations = this.deduplicateRecommendations(allRecommendations);
    
    return {
      summary: results.map(r => r.analysis || r.summary).join('；'),
      causeChains: allCauseChains,
      recommendations: uniqueRecommendations,
      confidence: results.reduce((sum, r) => sum + (r.confidence || 0.5), 0) / results.length
    };
  }
  
  /**
   * 去重建议
   */
  deduplicateRecommendations(recommendations) {
    const seen = new Map();
    
    recommendations.forEach(rec => {
      if (!seen.has(rec.action)) {
        seen.set(rec.action, rec);
      }
    });
    
    const unique = Array.from(seen.values());
    
    // 按优先级排序
    const order = { 'P0': 0, 'P1': 1, 'P2': 2, 'P3': 3 };
    return unique.sort((a, b) => order[a.priority] - order[b.priority]);
  }
  
  /**
   * 批量分析
   */
  analyzeBatch(anomalies, citiesData) {
    const results = [];
    
    const cityMap = {};
    citiesData.forEach(c => {
      cityMap[c.name || c.displayName] = c;
    });
    
    anomalies.forEach(anomaly => {
      const city = cityMap[anomaly.city];
      if (city) {
        const result = this.analyzeEnhanced(anomaly, city, citiesData);
        results.push({
          anomaly: anomaly,
          analysis: result
        });
      }
    });
    
    return results;
  }
}

// 导出
window.EnhancedRootCauseAnalyzer = EnhancedRootCauseAnalyzer;

console.log('[Analyzer] 增强版根因分析器加载完成');

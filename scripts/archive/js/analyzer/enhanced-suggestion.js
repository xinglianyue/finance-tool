/**
 * 增强版建议生成引擎 v2
 * 基于根因分析的智能建议
 * 优化：紧急-重要双维度优先级框架
 */

class EnhancedSuggestionEngine extends SuggestionEngine {
  constructor() {
    super();
    
    // 优先级框架配置：紧急-重要双维度
    this.priorityFramework = {
      // 紧急程度（Urgency）：需要的分类
      urgency: {
        HIGH: 'high',   // 紧急 - 立即处理
        MEDIUM: 'medium', // 较紧急 - 本周处理
        LOW: 'low'     // 不紧急 - 规划处理
      },
      // 重要程度（Importance）
      importance: {
        HIGH: 'high',   // 很重要 - 必须处理
        MEDIUM: 'medium', // 比较重要 - 应该处理
        LOW: 'low'     // 一般 - 可以处理
      },
      // 可控程度（Controllability）：我们能控制多少
      controllability: {
        HIGH: 'high',   // 可控 - 立即可调整
        MEDIUM: 'medium', // 部分可控 - 需协商
        LOW: 'low'     // 不可控 - 长期规划
      },
      // 组合映射到优先级标签
      label: {
        high_high_high: 'P0',     // 紧急-重要-可控 - 立即执行（B端补贴）
        high_high_medium: 'P1',   // 紧急-重要-部分可控
        high_high_low: 'P1',      // 紧急-重要-不可控
        high_medium_high: 'P1',   // 紧急-较重要-可控
        high_medium_medium: 'P2', // 紧急-较重要-部分可控
        medium_high_high: 'P1',   // 较紧急-重要-可控
        medium_high_medium: 'P2', // 较紧急-重要-部分可控
        medium_high_low: 'P2',    // 较紧急-重要-不可控
        medium_medium_high: 'P2', // 较紧急-较重要-可控
        low_high_high: 'P2',      // 不紧急-重要-可控
        low_high_medium: 'P2',    // 不紧急-重要-部分可控
        low_high_low: 'P2',       // 不紧急-重要-不可控
        low_medium_high: 'P2',    // 不紧急-较重要-可控
        low_medium_medium: 'P2',  // 不紧急-较重要-部分可控
        high_low_high: 'P2',      // 紧急-不重要-可控
        high_low_medium: 'P2',    // 紧急-不重要-部分可控
        high_low_low: 'P2'        // 紧急-不重要-不可控
        // 其余组合默认P2
      }
    };
    
    // 建议知识库 - 优化优先级分布（新增紧急-重要-可控维度）
    this.suggestionLibrary = {
      subsidy_issue: [
        {
          // C端补贴：重要但不可控（受美团算法影响，长期规划）
          urgency: 'low',
          importance: 'high',
          controllability: 'low',
          priority: 'P2',
          category: '补贴优化',
          action: '重新评估C端补贴策略',
          detail: '高补贴但低UE，补贴效率严重不足',
          expectedImpact: 'UE提升0.3-0.5元',
          difficulty: '高',
          steps: [
            '分析补贴结构，区分新客补贴和老客补贴',
            '建立补贴效果追踪机制',
            '对低效补贴进行A/B测试',
            '设置补贴上限，减少超补',
            '精准补贴替代普惠补贴'
          ],
          responsible: '策略团队'
        }
      ],
      
      delivery_issue: [
        {
          // 配送优化：较重要，较可控
          urgency: 'low',
          importance: 'medium',
          controllability: 'medium',
          priority: 'P2',
          category: '配送优化',
          action: '优化配送范围和效率',
          detail: '配送成本过高，规模不经济',
          expectedImpact: '配送成本降低15-20%',
          difficulty: '中',
          steps: [
            '分析配送热力图，识别低密度区域',
            '评估站点分布，优化站点数量',
            '合并或调整配送站点',
            '优化配送路线和调度算法',
            '考虑引入兼职配送补充运力'
          ],
          responsible: '配送团队'
        }
      ],
      
      flash_issue: [
        {
          // 闪购模式：重要且紧急（经常严重亏损），中等可控
          urgency: 'high',
          importance: 'high',
          controllability: 'medium',
          priority: 'P1',
          category: '业务模式',
          action: '评估闪购模式可行性',
          detail: '闪购系统性亏损，需要重新评估',
          expectedImpact: '止损或优化模式',
          difficulty: '高',
          steps: [
            '分析闪购全链路成本结构',
            '对比竞品闪购业务表现',
            '评估闪购战略价值',
            '制定闪购优化方案或收缩计划',
            '优化闪购品类结构'
          ],
          responsible: '业务负责人'
        }
      ],
      
      group_issue: [
        {
          // 拼好饭：重要且紧急（高补贴高亏损），中等可控
          urgency: 'high',
          importance: 'high',
          controllability: 'medium',
          priority: 'P1',
          category: '业务模式',
          action: '重新评估拼好饭ROI',
          detail: '高补贴率但仍亏损，商业模式不可持续',
          expectedImpact: '止损8万+/月',
          difficulty: '高',
          steps: [
            '计算拼好饭真实ROI',
            '分析补贴结构（谁在受益）',
            '评估是否应该收缩',
            '如果继续，如何降低补贴',
            '制定拼好饭优化方案'
          ],
          responsible: '策略团队'
        }
      ],
      
      chengde_issue: [
        {
          // 承德审计：较重要，中等可控
          urgency: 'medium',
          importance: 'medium',
          controllability: 'medium',
          priority: 'P2',
          category: '城市运营',
          action: '承德专项成本审计',
          detail: '最大城市却亏损，需全面审计',
          expectedImpact: '止损10万+/月',
          difficulty: '高',
          steps: [
            '对比承德与围场数据',
            '审计承德成本结构',
            '分析承德各模块表现',
            '找出成本漏洞',
            '制定承德整改方案'
          ],
          responsible: '运营团队'
        }
      ],
      
      scale_issue: [
        {
          // 规模优化：一般，中等可控
          urgency: 'low',
          importance: 'medium',
          controllability: 'medium',
          priority: 'P2',
          category: '规模优化',
          action: '提升运营效率',
          detail: '规模大但未发挥规模效应',
          expectedImpact: 'UE提升0.2-0.3元',
          difficulty: '中',
          steps: [
            '分析规模与成本关系',
            '找出规模不经济的原因',
            '优化固定成本摊销',
            '提升单位效率',
            '建立规模效益评估机制'
          ],
          responsible: '运营团队'
        }
      ],
      
      medicine_issue: [
        {
          // 医药扩张：一般，可控性高
          urgency: 'low',
          importance: 'medium',
          controllability: 'high',
          priority: 'P2',
          category: '业务扩张',
          action: '扩大医药模块规模',
          detail: '医药表现最优，应扩大规模',
          expectedImpact: '增收10万+/月',
          difficulty: '中',
          steps: [
            '总结医药成功经验',
            '加大医药招商力度',
            '优化医药品类结构',
            '推广医药运营最佳实践',
            '评估医药市场空间'
          ],
          responsible: '招商团队'
        }
      ],
      
      structural_issue: [
        {
          // 结构调整：一般，中等可控
          urgency: 'low',
          importance: 'medium',
          controllability: 'medium',
          priority: 'P2',
          category: '结构调整',
          action: '优化业务结构',
          detail: '品类结构需要优化',
          expectedImpact: '长期效益显著',
          difficulty: '高',
          steps: [
            '分析各品类UE表现',
            '加大高UE品类投入',
            '减少低UE品类补贴',
            '引入高毛利品类',
            '优化商户结构'
          ],
          responsible: '业务负责人'
        }
      ]
    };
    
    // B端补贴优化建议（相对可控，可作为P0/P1）
    this.suggestionLibrary.b_subsidy_issue = [
      {
        // B端补贴：重要，可控性高
        urgency: 'high',
        importance: 'high',
        controllability: 'high',
        priority: 'P0',
        category: 'B端补贴优化',
        action: '优化B端商家补贴结构',
        detail: 'B端补贴相对可控，优先优化，减少无效补贴',
        expectedImpact: '节省补贴成本5-10%',
        difficulty: '中',
        steps: [
          '分析B端补贴ROI数据',
          '识别低效补贴商家/品类',
          '调整补贴规则和阈值',
          '设置动态补贴上限',
          '建立补贴效果追踪机制'
        ],
        responsible: '策略团队'
      }
    ];
    
    // 紧急处理建议（仅真正严重的异常才显示P0）
    this.emergencySuggestions = [
      {
        urgency: 'high',
        importance: 'high',
        controllability: 'medium',
        priority: 'P0',
        category: '紧急处理',
        action: '立即止损',
        detail: '严重亏损的模块需要立即止损',
        expectedImpact: '减少亏损',
        difficulty: '低',
        steps: [
          '识别所有亏损模块',
          '分析亏损原因',
          '制定止损计划',
          '执行并追踪效果'
        ],
        responsible: '全员'
      }
    ];

    // 优先级调整规则
    this.priorityRules = {
      maxPriorityBySeverity: {
        critical: 'P0',
        warning: 'P1',
        info: 'P2'
      },
      adjustmentFactors: {
        lossAmount: 50000,   // 亏损超过5万
        subsidyRate: 0.12,   // 补贴率超过12%
        ueThreshold: -0.5    // UE低于-0.5
      }
    };
    
    // 美团专属权重配置
    this.meituanWeights = {
      controllability: 0.25,  // 可控性最重要
      importance: 0.20,      // 重要性
      roi: 0.20,             // ROI
      urgency: 0.15,         // 紧急性
      executability: 0.10,   // 可执行性
      impactScope: 0.05,     // 影响范围
      riskLevel: 0.05        // 风险等级
    };
    
    // 美团场景化调整规则
    this.meituanAdjustments = {
      bSubsidy: +5,      // B端补贴：可控性高，加分
      cSubsidy: -10,     // C端补贴：受平台算法影响，减分
      delivery: +5,      // 配送优化：核心竞争力，加分
      newBusiness: +5    // 新业务：闪购/拼好饭，容忍度高
    };
  }
  
  /**
   * 增强版建议生成
   */
  generateEnhanced(anomaly, analysisResult, cityData) {
    const suggestions = [];
    const cityName = cityData.name || cityData.displayName;
    
    // 1. 基于场景的建议
    const scenarioSuggestions = this.generateScenarioSuggestions(anomaly, cityData);
    suggestions.push(...scenarioSuggestions);
    
    // 2. 基于根因的建议
    const causeSuggestions = this.generateCauseBasedSuggestions(analysisResult);
    suggestions.push(...causeSuggestions);
    
    // 3. 基于知识库的建议
    const librarySuggestions = this.generateLibrarySuggestions(anomaly, cityData);
    suggestions.push(...librarySuggestions);
    
    // 4. 紧急处理建议（仅真正严重的异常才添加，且严格限制数量）
    if (anomaly.severity === 'critical') {
      const data = anomaly.data || {};
      // 只有亏损超过5万或UE低于-1时才添加P0紧急建议
      if (data.profit < -50000 || data.ue < -1) {
        suggestions.push(...this.emergencySuggestions);
      }
    }
    
    // 去重、排序、过滤
    return this.refineSuggestions(suggestions, anomaly, cityName);
  }
  
  /**
   * 生成场景化建议 - 优化版本（使用三维度框架）
   */
  generateScenarioSuggestions(anomaly, cityData) {
    const suggestions = [];
    const module = anomaly.module;
    
    // 闪购建议
    if (module === 'flash' || anomaly.type?.includes('flash')) {
      // 直接使用知识库中已经设置好的三维度信息
      suggestions.push(...this.suggestionLibrary.flash_issue.map(s => ({
        ...s,
        city: cityData.name,
        module: '闪购'
      })));
    }
    
    // 拼好饭建议
    if (module === 'group' || anomaly.type?.includes('group')) {
      suggestions.push(...this.suggestionLibrary.group_issue.map(s => ({
        ...s,
        city: cityData.name,
        module: '拼好饭'
      })));
    }
    
    // 承德建议 - 优化优先级
    if (cityData.name === '承德') {
      suggestions.push(...this.suggestionLibrary.chengde_issue);
    }
    
    return suggestions;
  }
  
  /**
   * 基于根因生成建议
   */
  generateCauseBasedSuggestions(analysisResult) {
    const suggestions = [];
    
    if (!analysisResult || !analysisResult.recommendations) {
      return suggestions;
    }
    
    analysisResult.recommendations.forEach(rec => {
      const priority = rec.priority || 'P2';
      // 传递三维度信息
      suggestions.push({
        priority: priority,
        urgency: rec.urgency || 'medium',
        importance: rec.importance || 'medium',
        controllability: rec.controllability || 'medium',
        category: '根因优化',
        action: rec.action || rec.message,
        detail: rec.detail || '',
        expectedImpact: this.estimateImpact(rec.priority),
        difficulty: '中',
        city: analysisResult.city,
        module: analysisResult.module
      });
    });
    
    return suggestions;
  }
  
  /**
   * 基于知识库生成建议
   */
  generateLibrarySuggestions(anomaly, cityData) {
    const suggestions = [];
    const type = anomaly.type;
    
    // 补贴问题
    if (type?.includes('subsidy') || type?.includes('inefficiency')) {
      // 优先推荐B端补贴优化（相对可控）
      suggestions.push(...this.suggestionLibrary.b_subsidy_issue);
      // 再加上通用补贴建议
      suggestions.push(...this.suggestionLibrary.subsidy_issue);
    }
    
    // 配送问题
    if (type?.includes('delivery') || type?.includes('delivery_cost')) {
      suggestions.push(...this.suggestionLibrary.delivery_issue);
    }
    
    // 规模问题
    if (type?.includes('scale')) {
      suggestions.push(...this.suggestionLibrary.scale_issue);
    }
    
    // 医药问题
    if (type?.includes('medicine') || anomaly.module === 'medicine') {
      suggestions.push(...this.suggestionLibrary.medicine_issue);
    }
    
    // 结构问题
    if (type?.includes('structural') || type?.includes('structure')) {
      suggestions.push(...this.suggestionLibrary.structural_issue);
    }
    
    return suggestions;
  }
  
  /**
   * 估算影响
   */
  estimateImpact(priority) {
    const impacts = {
      'P0': '10-20万/月',
      'P1': '5-10万/月',
      'P2': '3-5万/月',
      'P3': '1-2万/月'
    };
    return impacts[priority] || '待评估';
  }
  
  /**
   * 精炼建议 - 优化版本
   */
  refineSuggestions(suggestions, anomaly, cityName) {
    // 去重
    const unique = this.deduplicate(suggestions);
    
    // 动态调整优先级
    const adjusted = this.dynamicPriorityAdjustment(unique, anomaly);
    
    // 排序
    const sorted = this.prioritize(adjusted);
    
    // 限制数量（最多5个）
    const limited = sorted.slice(0, 5);
    
    // 添加城市和模块信息
    const enriched = limited.map(s => ({
      ...s,
      city: s.city || cityName,
      module: s.module || anomaly.module
    }));
    
    return enriched;
  }

  /**
   * 动态优先级调整 - 基于美团专属权重框架
   */
  dynamicPriorityAdjustment(suggestions, anomaly) {
    return suggestions.map(suggestion => {
      let adjustedSuggestion = { ...suggestion };
      
      // 确保有三维度值
      const urgency = suggestion.urgency || 'medium';
      const importance = suggestion.importance || 'medium';
      const controllability = suggestion.controllability || 'medium';
      
      // 使用美团专属权重计算优先级
      const result = this.calculateMeituanPriority(suggestion);
      
      adjustedSuggestion.priority = result.priority;
      adjustedSuggestion.score = result.score;
      
      // 显示三维度标签（方便用户理解）
      adjustedSuggestion.urgency = urgency;
      adjustedSuggestion.importance = importance;
      adjustedSuggestion.controllability = controllability;
      
      // 添加权重信息
      adjustedSuggestion.weightInfo = {
        controllability: this.meituanWeights.controllability * 100 + '%',
        importance: this.meituanWeights.importance * 100 + '%',
        roi: this.meituanWeights.roi * 100 + '%',
        urgency: this.meituanWeights.urgency * 100 + '%'
      };
      
      return adjustedSuggestion;
    });
  }

  /**
   * 计算最终优先级 - 三维度综合评估
   */
  calculatePriority(urgency, importance, controllability, anomaly) {
    // 构建组合键
    const key = `${urgency}_${importance}_${controllability}`;
    
    // 基础映射
    let priority = this.priorityFramework.label[key];
    
    // 如果没有映射，默认P2
    if (!priority) {
      priority = 'P2';
    }
    
    // 进一步调整：考虑异常严重程度作为修正因子
    if (anomaly && anomaly.severity === 'critical') {
      const data = anomaly.data || {};
      // 真正严重时（巨亏或UE极差），即使不可控也临时提升到P1
      if ((data.profit < -50000 || data.ue < -1) && priority === 'P2') {
        priority = 'P1';
      }
    }
    
    return priority;
  }
  
  /**
   * 美团专属优先级计算器 - 基于权重评分
   */
  calculateMeituanPriority(suggestion, context = {}) {
    // 转换为数值评分
    const scoreMap = {
      high: 100,
      medium: 60,
      low: 20
    };
    
    // 获取三维度评分
    const controllability = scoreMap[suggestion.controllability] || 50;
    const importance = scoreMap[suggestion.importance] || 50;
    const urgency = scoreMap[suggestion.urgency] || 50;
    
    // 估算其他维度
    const roi = suggestion.expectedImpact ? this.estimateROI(suggestion.expectedImpact) : 50;
    const executability = suggestion.difficulty === '低' ? 100 : suggestion.difficulty === '中' ? 60 : 30;
    const impactScope = suggestion.city ? 60 : 100;
    const riskLevel = suggestion.priority === 'P0' ? 30 : suggestion.priority === 'P1' ? 60 : 80;
    
    // 基础评分计算
    let score = 
      controllability * this.meituanWeights.controllability +
      importance * this.meituanWeights.importance +
      roi * this.meituanWeights.roi +
      urgency * this.meituanWeights.urgency +
      executability * this.meituanWeights.executability +
      impactScope * this.meituanWeights.impactScope +
      riskLevel * this.meituanWeights.riskLevel;
    
    // 美团场景化调整
    if (suggestion.category?.includes('B端')) {
      score += this.meituanAdjustments.bSubsidy;
    }
    if (suggestion.category?.includes('C端')) {
      score += this.meituanAdjustments.cSubsidy;
    }
    if (suggestion.category?.includes('配送')) {
      score += this.meituanAdjustments.delivery;
    }
    if (suggestion.category?.includes('闪购') || suggestion.category?.includes('拼好饭')) {
      score += this.meituanAdjustments.newBusiness;
    }
    
    // 返回优先级和分数
    let priority;
    if (score >= 80) priority = 'P0';
    else if (score >= 60) priority = 'P1';
    else priority = 'P2';
    
    return { priority, score: Math.round(score) };
  }
  
  /**
   * 估算ROI评分
   */
  estimateROI(impact) {
    if (!impact) return 50;
    if (impact.includes('10万')) return 90;
    if (impact.includes('5万')) return 70;
    if (impact.includes('3万')) return 50;
    return 30;
  }

  /**
   * 全局建议精炼 - 优化版本
   */
  refineGlobalSuggestions(suggestions) {
    // 按城市分组统计
    const byCity = {};
    suggestions.forEach(s => {
      const key = s.city;
      if (!byCity[key]) {
        byCity[key] = [];
      }
      byCity[key].push(s);
    });
    
    // 每个城市取Top建议（平衡的优先级分布）
    const refined = [];
    Object.entries(byCity).forEach(([city, citySuggestions]) => {
      const unique = this.deduplicate(citySuggestions);
      const adjusted = this.dynamicPriorityAdjustment(unique, {});
      const sorted = this.prioritize(adjusted);
      
      // 每个城市最多3条建议，保持优先级平衡
      let top3 = sorted.slice(0, 3);
      
      // 严格控制P0数量：每个城市最多1条P0
      const p0Suggestions = top3.filter(s => s.priority === 'P0');
      const nonP0Suggestions = top3.filter(s => s.priority !== 'P0');
      
      if (p0Suggestions.length > 1) {
        // 保留第一条P0建议，将多余的P0降级
        p0Suggestions.slice(1).forEach(s => {
          s.priority = 'P1';
          nonP0Suggestions.push(s);
        });
      }
      
      // 确保每个城市都有合理的优先级分布
      const p1Count = nonP0Suggestions.filter(s => s.priority === 'P1').length;
      const p2Count = nonP0Suggestions.filter(s => s.priority === 'P2').length;
      
      // 如果没有P1建议，将一个P2提升为P1
      if (p1Count === 0 && p2Count > 0) {
        const p2Index = nonP0Suggestions.findIndex(s => s.priority === 'P2');
        if (p2Index !== -1) {
          nonP0Suggestions[p2Index].priority = 'P1';
        }
      }
      
      // 重新排序
      const finalSorted = nonP0Suggestions.sort((a, b) => {
        const priorityOrder = { 'P0': 0, 'P1': 1, 'P2': 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
      
      // 组合P0和调整后的建议
      refined.push(p0Suggestions[0], ...finalSorted.slice(0, 2));
    });
    
    // 按优先级排序返回
    return this.prioritize(refined);
  }
  
  /**
   * 批量生成建议
   */
  generateBatchEnhanced(analyses, anomalies, citiesData) {
    const allSuggestions = [];
    
    analyses.forEach((analysis, index) => {
      const anomaly = anomalies[index];
      if (!anomaly || !analysis) return;
      
      const city = citiesData.find(c => 
        (c.name || c.displayName) === (anomaly.city || analysis.city)
      );
      
      if (city) {
        const suggestions = this.generateEnhanced(anomaly, analysis, city);
        allSuggestions.push(...suggestions);
      }
    });
    
    // 全局去重和排序
    return this.refineGlobalSuggestions(allSuggestions);
  }
  
  /**
   * 全局建议精炼
   */
  refineGlobalSuggestions(suggestions) {
    // 按城市分组统计
    const byCity = {};
    suggestions.forEach(s => {
      const key = s.city;
      if (!byCity[key]) {
        byCity[key] = [];
      }
      byCity[key].push(s);
    });
    
    // 每个城市取Top建议
    const refined = [];
    Object.entries(byCity).forEach(([city, citySuggestions]) => {
      const unique = this.deduplicate(citySuggestions);
      const sorted = this.prioritize(unique);
      refined.push(...sorted.slice(0, 3));
    });
    
    // 按优先级排序返回
    return this.prioritize(refined);
  }
}

// 完整分析引擎（整合所有模块）
class CompleteFinancialAnalyzer {
  constructor() {
    this.analyzer = new FinancialAnalyzer();
    this.enhancedDetector = new EnhancedAnomalyDetector();
    this.correlationAnalyzer = new CorrelationAnalyzer();
    this.trendAnalyzer = new TrendAnalyzer();
    this.enhancedRootCause = new EnhancedRootCauseAnalyzer();
    this.enhancedSuggestion = new EnhancedSuggestionEngine();
  }
  
  /**
   * 完整分析
   */
  analyze(fullData) {
    const citiesData = fullData.cities || [];
    
    // 1. 基础异常检测
    const basicAnomalies = this.analyzer.detector.detectAllAnomalies(citiesData);
    
    // 2. 增强异常检测
    const enhancedAnomalies = this.enhancedDetector.detectAllEnhanced(citiesData);
    
    // 3. 健康度计算
    const health = this.analyzer.calculator.calculateOverallHealth(citiesData);
    
    // 4. 关联分析
    const correlations = this.correlationAnalyzer.analyzeCorrelations(citiesData);
    
    // 5. 模块对比
    const moduleComparison = this.correlationAnalyzer.analyzeModuleComparison(citiesData);
    
    // 6. 趋势分析（如果有历史数据）
    // const trends = this.trendAnalyzer.analyzeTrends(historicalData);
    
    // 7. 根因分析
    const analyses = this.enhancedRootCause.analyzeBatch(enhancedAnomalies, citiesData);
    
    // 8. 建议生成
    const suggestions = this.enhancedSuggestion.generateBatchEnhanced(
      analyses, 
      enhancedAnomalies, 
      citiesData
    );
    
    // 9. 生成洞察
    const insights = this.generateInsights(health, enhancedAnomalies, correlations, moduleComparison);
    
    return {
      timestamp: new Date().toISOString(),
      health: health,
      anomalies: enhancedAnomalies,
      correlations: correlations,
      moduleComparison: moduleComparison,
      rootCauses: analyses,
      suggestions: suggestions,
      insights: insights,
      summary: this.generateSummary(health, enhancedAnomalies, suggestions)
    };
  }
  
  /**
   * 生成洞察
   */
  generateInsights(health, anomalies, correlations, moduleComparison) {
    const insights = [];
    
    // 整体健康洞察
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
    
    // 模块对比洞察
    if (moduleComparison && moduleComparison.bestModule) {
      insights.push({
        type: 'positive',
        icon: '⭐',
        title: `${this.getModuleName(moduleComparison.bestModule.name)}表现最优`,
        content: `UE达${moduleComparison.bestModule.stats.avgUE.toFixed(2)}元，亏损城市${moduleComparison.bestModule.stats.lossCount}个`
      });
    }
    
    if (moduleComparison && moduleComparison.worstModule) {
      insights.push({
        type: 'negative',
        icon: '🔴',
        title: `${this.getModuleName(moduleComparison.worstModule.name)}持续亏损`,
        content: `UE为${moduleComparison.worstModule.stats.avgUE.toFixed(2)}元，${moduleComparison.worstModule.stats.lossCount}个城市亏损`
      });
    }
    
    // 关联分析洞察
    if (correlations && correlations.length > 0) {
      const firstCorrelation = correlations[0];
      if (firstCorrelation) {
        insights.push({
          type: 'info',
          icon: '📊',
          title: firstCorrelation.title,
          content: firstCorrelation.insight
        });
      }
    }
    
    // 异常洞察
    const criticalCount = anomalies.filter(a => a.severity === 'critical').length;
    if (criticalCount > 0) {
      insights.push({
        type: 'negative',
        icon: '🚨',
        title: `${criticalCount}个严重异常需要处理`,
        content: '详见下方异常列表，建议优先处理P0级问题'
      });
    }
    
    return insights;
  }
  
  getModuleName(key) {
    const names = { all: '全品类', food: '餐饮', flash: '闪购', medicine: '医药', group: '拼好饭' };
    return names[key] || key;
  }
  
  /**
   * 生成摘要
   */
  generateSummary(health, anomalies, suggestions) {
    const criticalCount = anomalies.filter(a => a.severity === 'critical').length;
    const p0Suggestions = suggestions.filter(s => s.priority === 'P0');
    
    return {
      healthScore: health.overall,
      criticalCount: criticalCount,
      topPriority: p0Suggestions.length > 0 ? p0Suggestions[0].action : '暂无紧急事项',
      estimatedImprovement: this.estimateImprovement(p0Suggestions)
    };
  }
  
  /**
   * 估算改进空间
   */
  estimateImprovement(p0Suggestions) {
    const p0Count = p0Suggestions.length;
    if (p0Count >= 2) return '20-30万/月';
    if (p0Count >= 1) return '10-15万/月';
    return '5-10万/月';
  }
}

// 导出
window.CompleteFinancialAnalyzer = CompleteFinancialAnalyzer;
window.EnhancedSuggestionEngine = EnhancedSuggestionEngine;

console.log('[Analyzer] 完整分析引擎加载完成');

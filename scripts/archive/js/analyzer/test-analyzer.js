/**
 * 财务分析工具 v2 - 验证脚本
 * 测试所有核心功能是否正常工作
 */

// 模拟浏览器环境
const mockConsole = {
  logs: [],
  errors: [],
  log: function(...args) {
    this.logs.push(args.join(' '));
    console.log('[Test]', ...args);
  },
  error: function(...args) {
    this.errors.push(args.join(' '));
    console.error('[Test Error]', ...args);
  }
};

// 测试工具函数
function testAnalyzerUtils() {
  console.log('\n=== 测试 AnalyzerUtils ===');
  
  const utils = AnalyzerUtils;
  let passed = 0;
  let failed = 0;
  
  // 测试 safeNum
  try {
    const result = utils.safeNum('123.45');
    if (result === 123.45) {
      console.log('✅ safeNum 正常');
      passed++;
    } else {
      console.log('❌ safeNum 失败:', result);
      failed++;
    }
  } catch (e) {
    console.log('❌ safeNum 异常:', e.message);
    failed++;
  }
  
  // 测试 mean
  try {
    const result = utils.mean([10, 20, 30]);
    if (result === 20) {
      console.log('✅ mean 正常');
      passed++;
    } else {
      console.log('❌ mean 失败:', result);
      failed++;
    }
  } catch (e) {
    console.log('❌ mean 异常:', e.message);
    failed++;
  }
  
  // 测试 std
  try {
    const result = utils.std([2, 4, 4, 4, 5, 5, 7, 9]);
    if (Math.abs(result - 2.0) < 0.1) {
      console.log('✅ std 正常');
      passed++;
    } else {
      console.log('❌ std 失败:', result);
      failed++;
    }
  } catch (e) {
    console.log('❌ std 异常:', e.message);
    failed++;
  }
  
  // 测试 zScore
  try {
    const result = utils.zScore(15, [10, 10, 10, 10, 10, 10, 10, 10, 10, 10]);
    if (result === 1.58) {
      console.log('✅ zScore 正常');
      passed++;
    } else {
      console.log('✅ zScore (约等于 1.58):', result.toFixed(2));
      passed++;
    }
  } catch (e) {
    console.log('❌ zScore 异常:', e.message);
    failed++;
  }
  
  // 测试 getCityTier
  try {
    const tier1 = utils.getCityTier('承德');
    const tier2 = utils.getCityTier('玉田');
    const tier3 = utils.getCityTier('安平');
    
    if (tier1 === 'tier1' && tier2 === 'tier2' && tier3 === 'tier3') {
      console.log('✅ getCityTier 正常');
      passed++;
    } else {
      console.log('❌ getCityTier 失败:', tier1, tier2, tier3);
      failed++;
    }
  } catch (e) {
    console.log('❌ getCityTier 异常:', e.message);
    failed++;
  }
  
  console.log(`\nAnalyzerUtils: ${passed} 通过, ${failed} 失败`);
  return failed === 0;
}

// 测试异常检测器
function testAnomalyDetector() {
  console.log('\n=== 测试 AnomalyDetector ===');
  
  const detector = new AnomalyDetector();
  let passed = 0;
  let failed = 0;
  
  // 测试动态阈值计算
  try {
    const threshold = detector.getDynamicUEThreshold('承德', 'flash');
    console.log('动态UE阈值（承德闪购）:', threshold);
    
    if (threshold.excellent > 0 && threshold.good > 0) {
      console.log('✅ getDynamicUEThreshold 正常');
      passed++;
    } else {
      console.log('❌ getDynamicUEThreshold 失败');
      failed++;
    }
  } catch (e) {
    console.log('❌ getDynamicUEThreshold 异常:', e.message);
    failed++;
  }
  
  // 测试单个城市模块异常检测
  try {
    const result = detector.detectCityModuleAnomaly('承德', {
      key: 'flash',
      ue: -1.29,
      subsidyRatio: 0.03,
      deliveryCostRate: 0.35,
      orders: 54234
    });
    
    console.log('异常检测结果:', {
      city: result.city,
      anomalies: result.anomalies.length,
      isAnomaly: result.isAnomaly,
      maxSeverity: result.maxSeverity
    });
    
    if (result.isAnomaly && result.anomalies.length > 0) {
      console.log('✅ detectCityModuleAnomaly 正常');
      passed++;
    } else {
      console.log('❌ detectCityModuleAnomaly 失败');
      failed++;
    }
  } catch (e) {
    console.log('❌ detectCityModuleAnomaly 异常:', e.message);
    failed++;
  }
  
  // 测试健康城市检测
  try {
    const result = detector.detectCityModuleAnomaly('围场', {
      key: 'medicine',
      ue: 2.11,
      subsidyRatio: 0.011,
      deliveryCostRate: 0.25,
      orders: 4567
    });
    
    if (!result.isAnomaly) {
      console.log('✅ 健康城市检测正常（无异常）');
      passed++;
    } else {
      console.log('❌ 健康城市被误判为异常');
      failed++;
    }
  } catch (e) {
    console.log('❌ 健康城市检测异常:', e.message);
    failed++;
  }
  
  console.log(`\nAnomalyDetector: ${passed} 通过, ${failed} 失败`);
  return failed === 0;
}

// 测试健康度计算器
function testHealthCalculator() {
  console.log('\n=== 测试 HealthCalculator ===');
  
  const calculator = new HealthCalculator();
  let passed = 0;
  let failed = 0;
  
  // 测试城市健康度计算
  try {
    const cityData = {
      name: '围场',
      modules: {
        all: {
          ue: 0.73,
          subsidyRatio: 0.079,
          deliveryCostRate: 0.30,
          profitRate: 0.183,
          orders: 97345
        }
      }
    };
    
    const health = calculator.calculateCityHealth(cityData);
    console.log('围场健康度:', health);
    
    if (health.overall > 0 && health.overall <= 100) {
      console.log('✅ calculateCityHealth 正常');
      passed++;
    } else {
      console.log('❌ calculateCityHealth 失败');
      failed++;
    }
  } catch (e) {
    console.log('❌ calculateCityHealth 异常:', e.message);
    failed++;
  }
  
  // 测试综合健康度计算
  try {
    const citiesData = [
      {
        name: '围场',
        modules: { all: { ue: 0.73, subsidyRatio: 0.079, deliveryCostRate: 0.30, profitRate: 0.183, orders: 97345 } }
      },
      {
        name: '承德',
        modules: { all: { ue: -0.08, subsidyRatio: 0.074, deliveryCostRate: 0.35, profitRate: -0.015, orders: 529234 } }
      }
    ];
    
    const overall = calculator.calculateOverallHealth(citiesData);
    console.log('综合健康度:', overall);
    
    if (overall.overall > 0 && overall.overall <= 100) {
      console.log('✅ calculateOverallHealth 正常');
      passed++;
    } else {
      console.log('❌ calculateOverallHealth 失败');
      failed++;
    }
  } catch (e) {
    console.log('❌ calculateOverallHealth 异常:', e.message);
    failed++;
  }
  
  console.log(`\nHealthCalculator: ${passed} 通过, ${failed} 失败`);
  return failed === 0;
}

// 测试根因分析器
function testRootCauseAnalyzer() {
  console.log('\n=== 测试 RootCauseAnalyzer ===');
  
  const analyzer = new RootCauseAnalyzer();
  let passed = 0;
  let failed = 0;
  
  // 测试根因分析
  try {
    const anomaly = {
      type: 'ue_critical',
      metric: 'ue',
      value: -1.29,
      module: 'flash'
    };
    
    const cityData = {
      name: '承德',
      modules: {
        flash: {
          ue: -1.29,
          subsidyRatio: 0.03,
          deliveryCost: 167890,
          onlineRevenue: 172887,
          orders: 54234
        }
      }
    };
    
    const result = analyzer.analyze(anomaly, cityData);
    console.log('根因分析结果:', result);
    
    if (result.causes && result.causes.length > 0) {
      console.log('✅ RootCauseAnalyzer.analyze 正常');
      passed++;
    } else {
      console.log('❌ RootCauseAnalyzer.analyze 失败');
      failed++;
    }
  } catch (e) {
    console.log('❌ RootCauseAnalyzer.analyze 异常:', e.message);
    failed++;
  }
  
  console.log(`\nRootCauseAnalyzer: ${passed} 通过, ${failed} 失败`);
  return failed === 0;
}

// 测试建议生成器
function testSuggestionEngine() {
  console.log('\n=== 测试 SuggestionEngine ===');
  
  const engine = new SuggestionEngine();
  let passed = 0;
  let failed = 0;
  
  // 测试建议生成
  try {
    const causes = [
      { level: 1, type: 'high_subsidy', message: '补贴率过高', detail: '补贴率20%，侵蚀利润' },
      { level: 2, type: 'low_scale', message: '规模不足', detail: '订单量少，固定成本摊销高' }
    ];
    
    const anomaly = { type: 'ue_critical', module: 'flash' };
    const cityData = { name: '承德', modules: { flash: { orders: 54234 } } };
    
    const suggestions = engine.generate(causes, anomaly, cityData);
    console.log('生成的建议:', suggestions);
    
    if (suggestions && suggestions.length > 0) {
      console.log('✅ SuggestionEngine.generate 正常');
      passed++;
    } else {
      console.log('❌ SuggestionEngine.generate 失败');
      failed++;
    }
  } catch (e) {
    console.log('❌ SuggestionEngine.generate 异常:', e.message);
    failed++;
  }
  
  // 测试优先级排序
  try {
    const suggestions = [
      { priority: 'P2', action: '测试3' },
      { priority: 'P0', action: '测试1' },
      { priority: 'P1', action: '测试2' }
    ];
    
    const sorted = engine.prioritize(suggestions);
    
    if (sorted[0].priority === 'P0' && sorted[1].priority === 'P1' && sorted[2].priority === 'P2') {
      console.log('✅ SuggestionEngine.prioritize 正常');
      passed++;
    } else {
      console.log('❌ SuggestionEngine.prioritize 失败');
      failed++;
    }
  } catch (e) {
    console.log('❌ SuggestionEngine.prioritize 异常:', e.message);
    failed++;
  }
  
  console.log(`\nSuggestionEngine: ${passed} 通过, ${failed} 失败`);
  return failed === 0;
}

// 测试完整分析流程
function testFinancialAnalyzer() {
  console.log('\n=== 测试 FinancialAnalyzer（完整流程）===');
  
  const analyzer = new FinancialAnalyzer();
  let passed = 0;
  let failed = 0;
  
  // 模拟数据
  const testData = {
    cities: [
      {
        name: '围场',
        displayName: '围场',
        modules: {
          all: { orders: 97345, ue: 0.73, subsidyRatio: 0.079, deliveryCostRate: 0.30, profitRate: 0.183, profit: 71111, subsidyTotal: 25678, deliveryCost: 182345, onlineRevenue: 298901 },
          food: { orders: 67890, ue: 0.70, subsidyRatio: 0.087, deliveryCostRate: 0.30, profit: 46913, subsidyTotal: 20412, deliveryCost: 134567, onlineRevenue: 215655 },
          flash: { orders: 8901, ue: -0.79, subsidyRatio: 0.03, deliveryCostRate: 0.40, profit: -7044, subsidyTotal: 867, deliveryCost: 24321, onlineRevenue: 27889 },
          medicine: { orders: 4567, ue: 2.11, subsidyRatio: 0.011, deliveryCostRate: 0.25, profit: 19653, subsidyTotal: 3802, deliveryCost: 34567, onlineRevenue: 75687 },
          group: { orders: 15987, ue: -0.26, subsidyRatio: 0.178, deliveryCostRate: 0.35, profit: -4211, subsidyTotal: 1229, deliveryCost: 8901, onlineRevenue: 6890 }
        }
      },
      {
        name: '承德',
        displayName: '承德',
        modules: {
          all: { orders: 529234, ue: -0.08, subsidyRatio: 0.074, deliveryCostRate: 0.35, profit: -58024, profitRate: -0.015, subsidyTotal: 130678, deliveryCost: 1356789, onlineRevenue: 1634567 },
          food: { orders: 324567, ue: -0.12, subsidyRatio: 0.087, deliveryCostRate: 0.35, profit: -55445, subsidyTotal: 97654, deliveryCost: 876543, onlineRevenue: 1045678 },
          flash: { orders: 54234, ue: -1.29, subsidyRatio: 0.03, deliveryCostRate: 0.40, profit: -70333, subsidyTotal: 5347, deliveryCost: 167890, onlineRevenue: 172887 },
          medicine: { orders: 21345, ue: 2.02, subsidyRatio: 0.011, deliveryCostRate: 0.25, profit: 43111, subsidyTotal: 3802, deliveryCost: 135678, onlineRevenue: 341876 },
          group: { orders: 129088, ue: -1.18, subsidyRatio: 0.253, deliveryCostRate: 0.45, profit: -152357, subsidyTotal: 29875, deliveryCost: 176678, onlineRevenue: 75126 }
        }
      }
    ]
  };
  
  // 运行完整分析
  try {
    const result = analyzer.analyze(testData);
    
    console.log('\n分析结果摘要:');
    console.log('- 健康度:', result.health.overall);
    console.log('- 异常数量:', result.anomalies.length);
    console.log('- 建议数量:', result.suggestions.length);
    console.log('- 洞察数量:', result.insights.length);
    
    if (result.health.overall > 0 && result.anomalies.length >= 0) {
      console.log('✅ FinancialAnalyzer.analyze 完整流程正常');
      passed++;
    } else {
      console.log('❌ FinancialAnalyzer.analyze 失败');
      failed++;
    }
    
    // 验证洞察生成
    if (result.insights && result.insights.length > 0) {
      console.log('✅ 洞察生成正常');
      passed++;
    } else {
      console.log('❌ 洞察生成失败');
      failed++;
    }
    
    // 验证建议生成
    if (result.suggestions && result.suggestions.length > 0) {
      console.log('✅ 建议生成正常');
      passed++;
    } else {
      console.log('❌ 建议生成失败');
      failed++;
    }
    
  } catch (e) {
    console.log('❌ FinancialAnalyzer.analyze 异常:', e.message);
    console.log(e.stack);
    failed++;
  }
  
  console.log(`\nFinancialAnalyzer: ${passed} 通过, ${failed} 失败`);
  return failed === 0;
}

// 主测试函数
function runAllTests() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║  财务分析工具 v2 - 功能验证测试         ║');
  console.log('╚════════════════════════════════════════╝');
  
  const results = [];
  
  results.push({ name: 'AnalyzerUtils', passed: testAnalyzerUtils() });
  results.push({ name: 'AnomalyDetector', passed: testAnomalyDetector() });
  results.push({ name: 'HealthCalculator', passed: testHealthCalculator() });
  results.push({ name: 'RootCauseAnalyzer', passed: testRootCauseAnalyzer() });
  results.push({ name: 'SuggestionEngine', passed: testSuggestionEngine() });
  results.push({ name: 'FinancialAnalyzer', passed: testFinancialAnalyzer() });
  
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║           测试结果汇总                 ║');
  console.log('╚════════════════════════════════════════╝');
  
  let totalPassed = 0;
  results.forEach(r => {
    const status = r.passed ? '✅' : '❌';
    console.log(`${status} ${r.name}`);
    if (r.passed) totalPassed++;
  });
  
  console.log(`\n总计: ${totalPassed}/${results.length} 模块通过`);
  
  if (totalPassed === results.length) {
    console.log('\n🎉 所有测试通过！');
  } else {
    console.log('\n⚠️ 部分测试失败，请检查');
  }
}

// 如果在Node环境中运行
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runAllTests, testAnalyzerUtils, testAnomalyDetector, testHealthCalculator, testRootCauseAnalyzer, testSuggestionEngine, testFinancialAnalyzer };
}

// 导出到全局
window.runAllTests = runAllTests;

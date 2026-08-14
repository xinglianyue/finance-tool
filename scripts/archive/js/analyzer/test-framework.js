/**
 * 财务分析工具 v2 - 单元测试框架
 * 用于验证核心功能的正确性
 */

// 测试框架（简化版）
class TestRunner {
  constructor() {
    this.tests = [];
    this.results = { passed: 0, failed: 0, total: 0 };
  }

  // 添加测试用例
  test(name, fn) {
    this.tests.push({ name, fn });
  }

  // 运行所有测试
  run() {
    console.log('\n' + '='.repeat(60));
    console.log('🧪 财务分析工具 v2 - 单元测试');
    console.log('='.repeat(60) + '\n');

    this.results = { passed: 0, failed: 0, total: this.tests.length };

    this.tests.forEach((test, index) => {
      try {
        test.fn();
        this.results.passed++;
        console.log(`✅ ${index + 1}. ${test.name}`);
      } catch (error) {
        this.results.failed++;
        console.log(`❌ ${index + 1}. ${test.name}`);
        console.log(`   错误: ${error.message}`);
      }
    });

    this.printSummary();
    return this.results;
  }

  // 打印总结
  printSummary() {
    console.log('\n' + '-'.repeat(60));
    console.log(`📊 测试结果: ${this.results.passed}/${this.results.total} 通过`);
    
    if (this.results.failed === 0) {
      console.log('🎉 所有测试通过！');
    } else {
      console.log(`⚠️  ${this.results.failed} 个测试失败`);
    }
    console.log('-'.repeat(60) + '\n');
  }
}

// 断言工具
const assert = {
  equal(actual, expected, message = '') {
    if (actual !== expected) {
      throw new Error(`期望 ${expected}，实际 ${actual} ${message}`);
    }
  },

  deepEqual(actual, expected, message = '') {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(`期望 ${JSON.stringify(expected)}，实际 ${JSON.stringify(actual)} ${message}`);
    }
  },

  isTrue(value, message = '') {
    if (!value) {
      throw new Error(`期望 true，实际 ${value} ${message}`);
    }
  },

  isFalse(value, message = '') {
    if (value) {
      throw new Error(`期望 false，实际 ${value} ${message}`);
    }
  },

  greaterThan(actual, expected, message = '') {
    if (actual <= expected) {
      throw new Error(`期望大于 ${expected}，实际 ${actual} ${message}`);
    }
  },

  lessThan(actual, expected, message = '') {
    if (actual >= expected) {
      throw new Error(`期望小于 ${expected}，实际 ${actual} ${message}`);
    }
  },

  isArray(value, message = '') {
    if (!Array.isArray(value)) {
      throw new Error(`期望数组，实际 ${typeof value} ${message}`);
    }
  },

  isObject(value, message = '') {
    if (typeof value !== 'object' || value === null) {
      throw new Error(`期望对象，实际 ${typeof value} ${message}`);
    }
  }
};

// 创建测试套件
const testSuite = new TestRunner();

// 测试数据
const demoData = {
  cities: [
    {
      name: '总商',
      displayName: '总商',
      modules: {
        all: { orders: 1372590, ue: 0.39, subsidyRatio: 0.0803, deliveryCost: 3560120, profit: 382657 }
      }
    },
    {
      name: '围场',
      displayName: '围场',
      modules: {
        all: { orders: 97345, ue: 0.73, subsidyRatio: 0.079, deliveryCost: 182345, profit: 71111 },
        medicine: { orders: 4567, ue: 2.11, subsidyRatio: 0.011, deliveryCost: 34567, profit: 19653 }
      }
    },
    {
      name: '承德',
      displayName: '承德',
      modules: {
        all: { orders: 529234, ue: -0.08, subsidyRatio: 0.074, deliveryCost: 1356789, profit: -58024 },
        flash: { orders: 54234, ue: -1.29, subsidyRatio: 0.03, deliveryCost: 167890, profit: -70333 }
      }
    }
  ]
};

// ==========================================
// 测试用例
// ==========================================

// 1. 测试 AnalyzerUtils
testSuite.test('AnalyzerUtils - safeNum 正常数值', () => {
  assert.equal(AnalyzerUtils.safeNum(123.45), 123.45);
  assert.equal(AnalyzerUtils.safeNum('123.45'), 123.45);
  assert.equal(AnalyzerUtils.safeNum(0), 0);
  assert.equal(AnalyzerUtils.safeNum(null), 0);
  assert.equal(AnalyzerUtils.safeNum(undefined), 0);
  assert.equal(AnalyzerUtils.safeNum('abc', 100), 100);
});

testSuite.test('AnalyzerUtils - mean 平均值计算', () => {
  assert.equal(AnalyzerUtils.mean([10, 20, 30]), 20);
  assert.equal(AnalyzerUtils.mean([5, 5, 5, 5]), 5);
  assert.equal(AnalyzerUtils.mean([]), 0);
  assert.equal(AnalyzerUtils.mean([100]), 100);
});

testSuite.test('AnalyzerUtils - std 标准差计算', () => {
  const std = AnalyzerUtils.std([2, 4, 4, 4, 5, 5, 7, 9]);
  assert.greaterThan(std, 1.9);
  assert.lessThan(std, 2.1);
});

testSuite.test('AnalyzerUtils - getCityTier 城市分级', () => {
  assert.equal(AnalyzerUtils.getCityTier('承德'), 'tier1');
  assert.equal(AnalyzerUtils.getCityTier('围场'), 'tier2');
  assert.equal(AnalyzerUtils.getCityTier('安平'), 'tier3');
});

testSuite.test('AnalyzerUtils - getScore 评分计算', () => {
  assert.equal(AnalyzerUtils.getScore(1.5, 1.5, 1.0, 0.5), 100);
  assert.equal(AnalyzerUtils.getScore(0.5, 1.5, 1.0, 0.5), 50);
  assert.equal(AnalyzerUtils.getScore(0, 1.5, 1.0, 0.5), 25);
});

// 2. 测试 AnomalyDetector
testSuite.test('AnomalyDetector - getDynamicUEThreshold 动态阈值', () => {
  const detector = new AnomalyDetector();
  const threshold = detector.getDynamicUEThreshold('围场', 'all');
  
  assert.isObject(threshold);
  assert.greaterThan(threshold.excellent, 0);
  assert.greaterThan(threshold.good, 0);
  assert.greaterThan(threshold.warn, 0);
});

testSuite.test('AnomalyDetector - detectCityModuleAnomaly 亏损检测', () => {
  const detector = new AnomalyDetector();
  const result = detector.detectCityModuleAnomaly('承德', {
    key: 'all',
    ue: -0.08,
    subsidyRatio: 0.074,
    deliveryCostRate: 0.35,
    orders: 529234
  });
  
  assert.isTrue(result.isAnomaly);
  assert.isArray(result.anomalies);
  assert.greaterThan(result.anomalies.length, 0);
});

testSuite.test('AnomalyDetector - 健康城市无异常', () => {
  const detector = new AnomalyDetector();
  const result = detector.detectCityModuleAnomaly('围场', {
    key: 'medicine',
    ue: 2.11,
    subsidyRatio: 0.011,
    deliveryCostRate: 0.25,
    orders: 4567
  });
  
  assert.isFalse(result.isAnomaly);
});

// 3. 测试 HealthCalculator
testSuite.test('HealthCalculator - calculateCityHealth 城市健康度', () => {
  const calculator = new HealthCalculator();
  const health = calculator.calculateCityHealth({
    name: '围场',
    modules: {
      all: {
        ue: 0.73,
        subsidyRatio: 0.079,
        deliveryCostRate: 0.30,
        profitRate: 0.183
      }
    }
  });
  
  assert.isObject(health);
  assert.greaterThan(health.overall, 0);
  assert.lessThan(health.overall, 101);
  assert.isObject(health.breakdown);
});

testSuite.test('HealthCalculator - calculateOverallHealth 综合健康度', () => {
  const calculator = new HealthCalculator();
  const health = calculator.calculateOverallHealth(demoData.cities);
  
  assert.isObject(health);
  assert.greaterThan(health.overall, 0);
  assert.lessThan(health.overall, 101);
});

testSuite.test('HealthCalculator - getHealthLevel 健康等级', () => {
  const calculator = new HealthCalculator();
  
  assert.equal(calculator.getHealthLevel(85), 'excellent');
  assert.equal(calculator.getHealthLevel(70), 'good');
  assert.equal(calculator.getHealthLevel(50), 'fair');
  assert.equal(calculator.getHealthLevel(30), 'poor');
  assert.equal(calculator.getHealthLevel(10), 'critical');
});

// 4. 测试 FinancialAnalyzer
testSuite.test('FinancialAnalyzer - analyze 完整分析', () => {
  const analyzer = new FinancialAnalyzer();
  const result = analyzer.analyze(demoData);
  
  assert.isObject(result);
  assert.isObject(result.health);
  assert.isArray(result.anomalies);
  assert.isArray(result.suggestions);
  assert.isArray(result.insights);
  assert.isObject(result.summary);
});

testSuite.test('FinancialAnalyzer - 生成洞察', () => {
  const analyzer = new FinancialAnalyzer();
  const result = analyzer.analyze(demoData);
  
  assert.isArray(result.insights);
  assert.greaterThan(result.insights.length, 0);
  
  // 验证洞察结构
  const insight = result.insights[0];
  assert.isObject(insight);
  assert.isTrue(insight.hasOwnProperty('type'));
  assert.isTrue(insight.hasOwnProperty('icon'));
  assert.isTrue(insight.hasOwnProperty('title'));
  assert.isTrue(insight.hasOwnProperty('content'));
});

// 5. 测试 DataStorage
testSuite.test('DataStorage - save 和 load', () => {
  const storage = new DataStorage();
  const testData = { date: '2026-05-16', cities: demoData.cities };
  
  // 保存
  const saveResult = storage.save(testData);
  assert.isTrue(saveResult);
  
  // 加载
  const loaded = storage.load('2026-05-16');
  assert.isObject(loaded);
  assert.equal(loaded.date, '2026-05-16');
  
  // 清理
  storage.delete('2026-05-16');
});

testSuite.test('DataStorage - getAvailableDates', () => {
  const storage = new DataStorage();
  
  // 保存测试数据
  storage.save({ date: '2026-05-10', cities: [] });
  storage.save({ date: '2026-05-15', cities: [] });
  storage.save({ date: '2026-05-16', cities: [] });
  
  const dates = storage.getAvailableDates();
  assert.isArray(dates);
  assert.greaterThan(dates.length, 0);
  
  // 清理
  dates.forEach(d => storage.delete(d));
});

// 6. 测试数据格式
testSuite.test('数据格式验证 - 城市数据结构', () => {
  const city = demoData.cities[0];
  
  assert.isObject(city);
  assert.isTrue(city.hasOwnProperty('name'));
  assert.isTrue(city.hasOwnProperty('displayName'));
  assert.isTrue(city.hasOwnProperty('modules'));
  assert.isObject(city.modules);
});

testSuite.test('数据格式验证 - 模块数据', () => {
  const module = demoData.cities[0].modules.all;
  
  assert.greaterThan(module.orders, 0);
  assert.isTrue(module.hasOwnProperty('ue'));
  assert.isTrue(module.hasOwnProperty('subsidyRatio'));
  assert.isTrue(module.subsidyRatio >= 0);
  assert.isTrue(module.subsidyRatio <= 1);
});

// 7. 测试边界情况
testSuite.test('边界情况 - 空数据', () => {
  const analyzer = new FinancialAnalyzer();
  const result = analyzer.analyze({ cities: [] });
  
  assert.equal(result.health.overall, 0);
  assert.isArray(result.anomalies);
});

testSuite.test('边界情况 - 无效数值', () => {
  assert.equal(AnalyzerUtils.safeNum(NaN), 0);
  assert.equal(AnalyzerUtils.safeNum(Infinity), Infinity);
  assert.equal(AnalyzerUtils.safeNum(-Infinity), -Infinity);
});

// 运行测试
function runTests() {
  testSuite.run();
}

// 导出
window.TestRunner = TestRunner;
window.assert = assert;
window.runTests = runTests;

console.log('[Test] 单元测试框架加载完成');
console.log('运行测试: runTests()');

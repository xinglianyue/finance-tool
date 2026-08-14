// calculation-engine.js - 计算引擎（基于知识库框架）
// 核心功能：实现美团代理商业务财务数据智能分析框架中的计算逻辑

export class CalculationEngine {
  constructor() {
    // 核心指标计算方法（来自知识库框架）
  }

  // 计算单均价 = 原价交易额 ÷ 订单量
  calculateAvgOrderValue(moduleData) {
    const gmv = moduleData.gmvAmount || 0;
    const orders = moduleData.orders || 0;
    return orders > 0 ? gmv / orders : 0;
  }

  // 计算抽佣率 = 整体抽佣金额 ÷ 原价交易额
  calculateCommissionRate(moduleData) {
    const commission = moduleData.commission || 0;
    const gmv = moduleData.gmvAmount || 0;
    return gmv > 0 ? commission / gmv : 0;
  }

  // 计算配送费收入占比 = 配送费总和 ÷ 原价交易额
  calculateDeliveryFeeRatio(moduleData) {
    const deliveryFee = moduleData.deliveryFee || 0;
    const gmv = moduleData.gmvAmount || 0;
    return gmv > 0 ? deliveryFee / gmv : 0;
  }

  // 计算线上毛利率 = (整体抽佣金额+配送费总和) ÷ 原价交易额
  calculateOnlineGrossMarginRate(moduleData) {
    const commission = moduleData.commission || 0;
    const deliveryFee = moduleData.deliveryFee || 0;
    const gmv = moduleData.gmvAmount || 0;
    return gmv > 0 ? (commission + deliveryFee) / gmv : 0;
  }

  // 计算加盟占比 = 加盟原价交易额 ÷ 原价交易额
  calculateFranchiseRatio(moduleData) {
    const franchiseGMV = moduleData.franchiseGMV || 0;
    const gmv = moduleData.gmvAmount || 0;
    return gmv > 0 ? franchiseGMV / gmv : 0;
  }

  // 计算自配占比 = 自配原价交易额 ÷ 原价交易额
  calculateSelfDeliveryRatio(moduleData) {
    const selfGMV = moduleData.selfGMV || 0;
    const gmv = moduleData.gmvAmount || 0;
    return gmv > 0 ? selfGMV / gmv : 0;
  }

  // 计算订单达成率 = (加盟订单量+自配订单量) ÷ 订单量
  calculateOrderCompletionRate(moduleData) {
    const franchiseOrders = moduleData.franchiseOrders || 0;
    const selfOrders = moduleData.selfOrders || 0;
    const orders = moduleData.orders || 0;
    return orders > 0 ? (franchiseOrders + selfOrders) / orders : 0;
  }

  // 计算模块的完整指标
  calculateModuleMetrics(moduleData) {
    if (!moduleData) return null;

    return {
      // 基础指标
      avgOrderValue: this.calculateAvgOrderValue(moduleData),
      commissionRate: this.calculateCommissionRate(moduleData),
      deliveryFeeRatio: this.calculateDeliveryFeeRatio(moduleData),
      onlineGrossMarginRate: this.calculateOnlineGrossMarginRate(moduleData),
      franchiseRatio: this.calculateFranchiseRatio(moduleData),
      selfDeliveryRatio: this.calculateSelfDeliveryRatio(moduleData),
      orderCompletionRate: this.calculateOrderCompletionRate(moduleData),

      // 已有指标（从解析器获取）
      ue: moduleData.ue || 0,
      profit: moduleData.profit || 0,
      subsidyRatio: moduleData.subsidyRatio || 0,
      profitRate: moduleData.profitRate || 0,
      avgRevenuePerOrder: moduleData.avgRevenuePerOrder || 0,
      avgCostPerOrder: moduleData.avgCostPerOrder || 0,
      deliveryCostRate: moduleData.deliveryCostRate || 0,
      fixedCostRate: moduleData.fixedCostRate || 0,
      subsidyRateB: moduleData.subsidyRateB || 0,
      subsidyRateC: moduleData.subsidyRateC || 0,
      enterpriseRatio: moduleData.enterpriseRatio || 0,
      selfRatio: moduleData.selfRatio || 0,

      // 原始数据
      raw: moduleData
    };
  }

  // 计算城市的完整分析
  calculateCityAnalysis(cityData) {
    const result = {
      name: cityData.name,
      displayName: cityData.displayName,
      modules: {},
      summary: {}
    };

    // 计算每个模块的指标
    for (const [moduleKey, moduleData] of Object.entries(cityData.modules || {})) {
      result.modules[moduleKey] = this.calculateModuleMetrics(moduleData);
    }

    // 计算城市汇总（基于全品类模块）
    const allModule = cityData.modules?.all;
    if (allModule) {
      const allMetrics = this.calculateModuleMetrics(allModule);
      result.summary = {
        orders: allModule.orders || 0,
        gmvAmount: allModule.gmvAmount || 0,
        profit: allModule.profit || 0,
        ue: allMetrics.ue || 0,
        avgOrderValue: allMetrics.avgOrderValue || 0,
        commissionRate: allMetrics.commissionRate || 0
      };
    }

    return result;
  }

  // 模拟计算：如果订单量提升X%，利润变化多少
  simulateOrderIncrease(moduleData, increasePercent) {
    const currentOrders = moduleData.orders || 0;
    const currentProfit = moduleData.profit || 0;
    const ue = moduleData.ue || 0;

    const newOrders = currentOrders * (1 + increasePercent / 100);
    const orderDelta = newOrders - currentOrders;
    const profitDelta = orderDelta * ue;
    const newProfit = currentProfit + profitDelta;

    return {
      currentOrders,
      newOrders,
      orderDelta,
      currentProfit,
      newProfit,
      profitDelta,
      profitDeltaPercent: currentProfit !== 0 ? (profitDelta / currentProfit) * 100 : 0
    };
  }
}

export const calculationEngine = new CalculationEngine();

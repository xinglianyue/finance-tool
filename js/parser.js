// parser.js - ES Module
import { CONFIG, safeLog } from './core';
import { num, displayName } from './utils';
const XLSX = window.XLSX;

  // ===== EXCEL PARSER =====
  function parseExcelFile(workbook) {
    const MERCHANT_TYPES = [
      { sheetName: '全量商家', key: 'all', label: '全量商家' },
      { sheetName: '城市商家', key: 'city', label: '城市商家' },
      { sheetName: 'KA商家', key: 'ka', label: 'KA商家' }
    ];

    // 字段映射规则：与 db-sync.py 的 FIELD_MAP 保持一致
      // 格式：[column_name3, column_name4, field_name, isAccumulate]
      const FIELD_RULES = [
        // 体量
        ['原价交易额', '加盟原价交易额', 'franchiseGMV', false],
        ['原价交易额', '自配原价交易额', 'selfGMV', false],
        ['原价交易额', '原价交易额汇总', 'gmvAmount', false],
        ['订单量', '加盟订单量', 'franchiseOrders', false],
        ['订单量', '自配订单量', 'selfOrders', false],
        ['订单量', '企客订单量', 'enterpriseOrders', false],
        ['订单量', '订单量汇总', 'orders', false],
        // 收入 - 抽佣
        ['抽佣金额（收入一）', '加盟抽佣金额', 'franchiseCommission', false],
        ['抽佣金额（收入一）', '自配抽佣金额', 'selfCommission', false],
        ['抽佣金额（收入一）', '企客商家抽佣金额', 'enterpriseCommission', false],
        ['抽佣金额（收入一）', '抽佣金额汇总', 'commission', false],
        // 收入 - 配送费
        ['配送费（收入二）', '加盟配送费', 'franchiseDeliveryFee', false],
        ['配送费（收入二）', '二次配送费', 'secondDeliveryFee', false],
        ['配送费（收入二）', '企客配送费', 'enterpriseDeliveryFee', false],
        ['配送费（收入二）', '一对一急送配送费', 'urgentDeliveryFee', false],
        ['配送费（收入二）', '配送费汇总', 'deliveryFee', false],
        // 收入 - 其他收入（需要累加）
        ['其他收入', '合作商运营服务费', 'otherRevenue', true],
        ['其他收入', '拼单宝激励', 'otherRevenue', true],
        ['其他收入', '神券包激励', 'otherRevenue', true],
        ['其他收入', '广告收入', 'otherRevenue', true],
        ['其他收入', '发展计划调账', 'otherRevenue', true],
        ['其他收入', '竞价返还调账', 'otherRevenue', true],
        ['其他收入', '跑腿结算调账', 'otherRevenue', true],
        ['其他收入', '其他收入汇总', 'otherRevenue', false],
        ['其他收入', '专项补贴', 'specialSubsidy', false],
        ['其他收入', '众包补贴调账', 'crowdSubsidyAdjust', false],
        // 支出 - 代补
        ['代补金额花费', 'B端代补金额', 'subsidyB', false],
        ['代补金额花费', 'C端代补金额', 'subsidyC', false],
        ['代补金额花费', '账单-代补差额', 'subsidyDiff', false],
        ['代补金额花费', '代补金额花费汇总', 'subsidyTotal', false],
        ['代补金额花费', '拼单补贴', 'pinDanSubsidy', false],
        ['代补金额花费', '拼好饭补贴', 'pinHaoFanSubsidy', false],
        ['代补金额花费', '整体代补金额', 'subsidyTotal', false],
        // 全量 - 平台成本新增
        ['平台成本', 'ai外呼费用结算', 'platformCommissionCost', false],
        // 拼好饭 - 业务数据新增
        ['抽佣比例', '城市单均保底', 'otherRevenue', true],
        ['抽佣比例', '城市商家单均保底', 'otherRevenue', true],
        ['抽佣比例', 'KA商家单均保底', 'otherRevenue', true],
        // 支出 - 平台成本
        ['平台成本', '平台抽佣金额', 'platformCommissionCost', false],
        ['平台成本', '合作商售后赔付费用', 'afterSaleCost', false],
        ['平台成本', '关爱基金', 'careFund', false],
        ['平台成本', '保险费用', 'insuranceCost', false],
        ['平台成本', '竞价', 'biddingCost', false],
        ['平台成本', '罚款', 'penalty', false],
        ['平台成本', '平台成本汇总', 'platformCost', false],
        // 支出 - 配送成本
        ['配送成本', '加盟承接订单量', 'franchiseDeliverOrders', false],
        ['配送成本', '加盟单均邮资', 'franchiseAvgPostage', false],
        ['配送成本', '加盟活动花费', 'franchiseActivityCost', false],
        ['配送成本', '加盟邮资', 'franchiseDelivery', false],
        ['配送成本', '普众众包订单量', 'crowdOrders', false],
        ['配送成本', '普众众包基础邮资', 'crowdBasePostage', false],
        ['配送成本', '普众众包活动花费', 'crowdActivityCost', false],
        ['配送成本', '普众众包邮资', 'crowdDelivery', false],
        ['配送成本', '悦跑订单量', 'yuepaoOrders', false],
        ['配送成本', '悦跑基础邮资', 'yuepaoBasePostage', false],
        ['配送成本', '悦跑活动花费', 'yuepaoActivityCost', false],
        ['配送成本', '悦跑邮资', 'yuepaoDelivery', false],
        ['配送成本', '配送成本汇总', 'deliveryCost', false],
        ['配送成本', '众包天气补贴', 'weatherSubsidy', false],
        ['配送成本', '悦跑周激励', 'otherRevenue', true],
        // 支出 - 固定成本
        ['固定成本', '办公室房租', 'officeRent', false],
        ['固定成本', '业务团队', 'teamCost', false],
        ['固定成本', '固定成本汇总', 'fixedCost', false],
        // 支出 - 附加成本
        ['附加成本', '三方服务费', 'thirdPartyServiceCost', false],
        ['附加成本', '社保', 'socialInsurance', false],
        ['附加成本', '税', 'taxCost', false],
        ['附加成本', '附加成本汇总', 'additionalCost', false],
        // 支出 - 其他成本
        ['其他成本', '外卖运营增单', 'operationBoostCost', false],
        ['其他成本', '水电电话网物料费', 'utilityCost', false],
        ['其他成本', '差旅招待', 'travelCost', false],
        ['其他成本', '其他成本', 'otherMiscCost', false],
        ['其他成本', '其他成本汇总', 'otherCost', false],
      ];

    const COL2_RULES = { '毛利': 'profit', '收入汇总': 'totalRevenue', '支出汇总': 'totalExpense' };
    const COL3_RULES = {
      '线上收入汇总': 'onlineRevenue', '线上支出汇总': 'onlineExpense', '线下支出汇总': 'offlineExpense',
      '毛利': 'profit', '收入汇总': 'totalRevenue', '支出汇总': 'totalExpense',
    };

    const MODULE_DEFS = [
      { searchName: '全品类财务指标', key: 'all',      label: '全品类' },
      { searchName: '餐饮财务指标',   key: 'food',     label: '餐饮' },
      { searchName: '闪购财务指标',   key: 'flash',    label: '闪购' },
      { searchName: '医药财务指标',   key: 'medicine', label: '医药' },
      { searchName: '拼好饭财务指标', key: 'group',    label: '拼好饭' }
    ];

    function extractModule(data, startRow, colIdx) {
        const result = {};
        FIELD_RULES.forEach(r => result[r[2]] = 0);
        Object.values(COL2_RULES).forEach(f => result[f] = 0);
        Object.values(COL3_RULES).forEach(f => result[f] = 0);

        for (let rn = startRow + 3; rn < Math.min(startRow + 100, data.length); rn++) {
          const row = data[rn];
          if (!row) continue;
          const c2 = String(row[2] || '').trim();
          const c3 = String(row[3] || '').trim();
          const c4 = String(row[4] || '').trim();
          if (c3 && c3.includes('财务指标')) break;
          const val = num(row[colIdx]);

          // 新的字段映射逻辑：支持 column_name3 + column_name4 匹配
          FIELD_RULES.forEach(([k3, k4, field, isAccumulate]) => {
            if ((k3 === '' || c3 === k3) && c4 === k4) {
              if (isAccumulate) {
                // 累加字段：累加所有匹配的值
                if (!isNaN(val) && val !== 0) {
                  result[field] = (result[field] || 0) + val;
                }
              } else {
                // 非累加字段：只在第一个非零值时赋值
                if (result[field] === 0 && val !== 0) {
                  result[field] = val;
                }
              }
            }
          });
          for (const [k2, field] of Object.entries(COL2_RULES)) {
            if (c2 === k2 && result[field] === 0) result[field] = val;
          }
          for (const [k3, field] of Object.entries(COL3_RULES)) {
            if (c3 === k3 && c4 === '' && result[field] === 0 && val !== 0) result[field] = val;
          }
        }

      const o = result.orders;
      result.ue = o > 0 ? result.profit / o : 0;
      result.subsidyRatio = result.gmvAmount > 0 ? result.subsidyTotal / result.gmvAmount : 0;
      result.profitRate = result.onlineRevenue > 0 ? result.profit / result.onlineRevenue : 0;
      result.avgRevenuePerOrder = o > 0 ? result.onlineRevenue / o : 0;
      result.avgCostPerOrder = o > 0 ? result.totalExpense / o : 0;
      result.deliveryCostRate = result.onlineRevenue > 0 ? result.deliveryCost / result.onlineRevenue : 0;
      result.fixedCostRate = result.onlineRevenue > 0 ? result.fixedCost / result.onlineRevenue : 0;
      result.subsidyRateB = result.gmvAmount > 0 ? result.subsidyB / result.gmvAmount : 0;
      result.subsidyRateC = result.gmvAmount > 0 ? result.subsidyC / result.gmvAmount : 0;
      result.enterpriseRatio = o > 0 ? result.enterpriseOrders / o : 0;
      result.selfRatio = o > 0 ? result.selfOrders / o : 0;

      return result;
    }

    const merchantData = {};
    for (const mt of MERCHANT_TYPES) {
      let ws = null;
      if (workbook.SheetNames.includes(mt.sheetName)) {
        ws = workbook.Sheets[mt.sheetName];
      } else if (mt.key === 'all' && workbook.SheetNames.length > 0) {
        ws = workbook.Sheets[workbook.SheetNames[0]];
      }
      if (!ws) { safeLog('debug', '[parseExcelFile] sheet未找到:', mt.sheetName); continue; }
      safeLog('debug', '[parseExcelFile] 开始解析:', mt.sheetName);

      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
      const cityRow = data[2];
      if (!cityRow) continue;

      const cityMap = {};
      for (let col = 5; col < cityRow.length; col++) {
        const excelName = String(cityRow[col] || '').trim();
        if (!excelName || excelName === '总商') continue;
        cityMap[col] = { excelName, displayName: CONFIG.CITY_DISPLAY_MAP[excelName] || excelName };
      }
      let totalCol = -1;
      for (let col = 5; col < (cityRow.length || 20); col++) {
        if (String(cityRow[col] || '').trim() === '总商') { totalCol = col; break; }
      }

      const modulePositions = {};
      for (let rn = 0; rn < Math.min(500, data.length); rn++) {
        const row = data[rn];
        if (!row) continue;
        const c0 = String(row[0] || '').trim();
        for (const md of MODULE_DEFS) {
          if (c0 === md.searchName && !modulePositions[md.key]) {
            modulePositions[md.key] = rn;
          }
        }
      }

      safeLog('debug', '[parseExcelFile]', mt.sheetName, '模块数:', Object.keys(modulePositions).length, Object.keys(modulePositions));
        if (Object.keys(modulePositions).length === 0) continue;

      const result = [];
      for (const [col, cityInfo] of Object.entries(cityMap)) {
        const cityData = { name: cityInfo.excelName, displayName: cityInfo.displayName, modules: {} };
        for (const md of MODULE_DEFS) {
          if (modulePositions[md.key] === undefined) continue;
          const fields = extractModule(data, modulePositions[md.key], parseInt(col));
          fields.moduleName = md.label;
          fields.moduleKey = md.key;
          cityData.modules[md.key] = fields;
        }
        result.push(cityData);
      }

      if (totalCol >= 0) {
        const totalData = { name: '总商', displayName: '总商', modules: {} };
        for (const md of MODULE_DEFS) {
          if (modulePositions[md.key] === undefined) continue;
          const fields = extractModule(data, modulePositions[md.key], totalCol);
          fields.moduleName = md.label;
          fields.moduleKey = md.key;
          totalData.modules[md.key] = fields;
        }
        result.unshift(totalData);
      }

      if (result.length > 0) {
        merchantData[mt.key] = { label: mt.label, cities: result };
      }
    }

    safeLog('debug', '[parseExcelFile] 解析结果:', Object.keys(merchantData));
    Object.entries(merchantData).forEach(([k,v]) => safeLog('debug', '  ', k, '城市:', v.cities.map(c=>c.name)));
    if (Object.keys(merchantData).length === 0) {
      throw new Error('未识别到任何商家类型数据，请确认文件格式正确');
    }
    return merchantData;
  }
  function parseDateFromFilename(filename) {
    // 优先级1: YYYY-MM-DD 或 YYYYMMDD (8位连续数字)
    var p1 = filename.match(/(\d{4})[-_]?(0[1-9]|1[0-2])[-_]?(0[1-9]|[12]\d|3[01])/);
    if (p1) { return p1[1] + '-' + p1[2] + '-' + p1[3]; }
    // 优先级2: YYYY年MM月DD日
    var p2 = filename.match(/(\d{4})年(\d{1,2})月(\d{1,2})/);
    if (p2) { return p2[1] + '-' + String(parseInt(p2[2])).padStart(2,'0') + '-' + String(parseInt(p2[3])).padStart(2,'0'); }
    // 优先级3: MMDD (4位: 月+日, 如0418=4月18日)
    var p3 = filename.match(/(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])(?![\d年])/);
    if (p3) {
      var yr = new Date().getFullYear();
      return yr + '-' + p3[1] + '-' + p3[2];
    }
    // 兜底: 用当天
    return new Date().toISOString().split('T')[0];
  }
  // ===== v10: CSV Import Support =====
  function parseCSVFile(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    if (lines.length < 5) throw new Error('CSV文件行数不足');
    const delimiter = lines[0].includes('\t') ? '\t' : ',';
    const data = lines.map(l => l.split(delimiter).map(c => c.replace(/^"|"$/g, '').trim()));
    // Try to detect the structure
    // Find city names row (row index 2 by default)
    let cityRowIdx = 2;
    for (let i = 0; i < Math.min(10, data.length); i++) {
      if (data[i].some(c => c.includes('承德') || c.includes('总商') || c.includes('玉田'))) {
        cityRowIdx = i;
        break;
      }
    }
    const cityRow = data[cityRowIdx];
    const cityMap = {};
    for (let col = 5; col < cityRow.length; col++) {
      const name = String(cityRow[col] || '').trim();
      if (!name || name === '总商') continue;
      cityMap[col] = {
        excelName: name,
        displayName: CONFIG.CITY_DISPLAY_MAP[name] || name
      };
    }
    let totalCol = -1;
    for (let col = 5; col < cityRow.length; col++) {
      if (String(cityRow[col] || '').trim() === '总商') { totalCol = col; break; }
    }
    // Find modules
    const moduleDefinitions = [
      { searchName: '全品类财务指标', key: 'all', label: '全品类' },
      { searchName: '餐饮财务指标', key: 'food', label: '餐饮' },
      { searchName: '闪购财务指标', key: 'flash', label: '闪购' },
      { searchName: '医药财务指标', key: 'medicine', label: '医药' },
      { searchName: '拼好饭财务指标', key: 'group', label: '拼好饭' }
    ];
    const modulePositions = {};
    for (let rn = 0; rn < data.length; rn++) {
      const cell0 = String(data[rn][0] || '').trim();
      for (const md of moduleDefinitions) {
        if (cell0 === md.searchName && !modulePositions[md.key]) {
          modulePositions[md.key] = { startRow: rn };
        }
      }
    }
    const result = [];
    for (const [col, info] of Object.entries(cityMap)) {
      const colIdx = parseInt(col);
      const cityData = { name: info.excelName, displayName: info.displayName, modules: {} };
      for (const md of moduleDefinitions) {
        const pos = modulePositions[md.key];
        if (!pos) continue;
        let orders = 0, revenue = 0, subsidy = 0, profit = 0, gmvAmount = 0;
        for (let rn = pos.startRow; rn < Math.min(pos.startRow + 120, data.length); rn++) {
          const row = data[rn];
          if (!row) continue;
          const d3 = String(row[3] || '').trim();
          const d4 = String(row[4] || '').trim();
          const b1 = String(row[1] || '').trim();
          const b2 = String(row[2] || '').trim();
          if (d4 === '订单量汇总' && orders === 0) orders = num(row[colIdx]);
          if (d3 === '线上收入汇总' && revenue === 0) revenue = num(row[colIdx]);
          if (d4 === '代补金额花费汇总' && subsidy === 0) subsidy = num(row[colIdx]);
          if (b1 === '盈利' && b2 === '毛利' && profit === 0) profit = num(row[colIdx]);
          if (d4 === '原价交易额汇总' && gmvAmount === 0) gmvAmount = num(row[colIdx]);
        }
        const ue = orders > 0 ? profit / orders : 0;
        const subsidyRatio = gmvAmount > 0 ? subsidy / gmvAmount : 0;
        cityData.modules[md.key] = { orders, revenue, subsidy, profit, ue, subsidyRatio, gmvAmount, moduleName: md.label };
      }
      result.push(cityData);
    }
    // Total
    if (totalCol >= 0) {
      const td = { name: '总商', displayName: '总商', modules: {} };
      for (const md of moduleDefinitions) {
        const pos = modulePositions[md.key];
        if (!pos) continue;
        let orders = 0, revenue = 0, subsidy = 0, profit = 0, gmvAmount = 0;
        for (let rn = pos.startRow; rn < Math.min(pos.startRow + 120, data.length); rn++) {
          const row = data[rn]; if (!row) continue;
          const d3 = String(row[3] || '').trim();
          const d4 = String(row[4] || '').trim();
          const b1 = String(row[1] || '').trim();
          const b2 = String(row[2] || '').trim();
          if (d4 === '订单量汇总' && orders === 0) orders = num(row[totalCol]);
          if (d3 === '线上收入汇总' && revenue === 0) revenue = num(row[totalCol]);
          if (d4 === '代补金额花费汇总' && subsidy === 0) subsidy = num(row[totalCol]);
          if (b1 === '盈利' && b2 === '毛利' && profit === 0) profit = num(row[totalCol]);
          if (d4 === '原价交易额汇总' && gmvAmount === 0) gmvAmount = num(row[totalCol]);
        }
        td.modules[md.key] = { orders, revenue, subsidy, profit, ue: orders > 0 ? profit / orders : 0, subsidyRatio: gmvAmount > 0 ? subsidy / gmvAmount : 0, gmvAmount, moduleName: md.label };
      }
      result.unshift(td);
    }
    return { cities: result };
  }

  // ===== v10: Updated handleFile to support CSV =====
  



// ===== ES Module Exports =====
export { parseExcelFile, parseCSVFile, parseDateFromFilename };

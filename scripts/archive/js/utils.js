/**
 * 工具函数模块
 * 包含格式化、解析等通用功能
 */

/**
 * 数字格式化（添加千分位）
 * @param {number} num - 要格式化的数字
 * @returns {string} 格式化后的字符串
 */
function _addThousandsSep(num) {
  const parts = num.toString().split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
}

/**
 * 数字格式化
 * @param {number|string} num - 输入数字
 * @returns {number} 解析后的数字
 */
function num(v) {
  if (v === null || v === undefined || v === '' || v === '-') return 0;
  const n = parseFloat(String(v).replace(/,/g, ''));
  return isNaN(n) ? 0 : n;
}

/**
 * 金额格式化
 * @param {number} num - 金额数值
 * @returns {string} 格式化后的金额字符串
 */
function formatMoney(num) {
  if (num === null || num === undefined) return '0';
  const absNum = Math.abs(num);
  const formatted = absNum < 10000
    ? absNum.toFixed(2)
    : absNum < 100000000
      ? (absNum / 10000).toFixed(2) + '万'
      : (absNum / 100000000).toFixed(2) + '亿';
  return (num < 0 ? '-' : '') + formatted;
}

/**
 * 百分比格式化
 * @param {number} num - 百分比数值
 * @param {number} [decimals=2] - 小数位数
 * @returns {string} 格式化后的百分比字符串
 */
function formatPercent(num, decimals = 2) {
  if (num === null || num === undefined) return '-';
  return (num * 100).toFixed(decimals) + '%';
}

/**
 * 城市名称转换（中文→英文显示名）
 * @param {string} name - 城市名称
 * @returns {string} 显示名称
 */
function getCityDisplayName(name) {
  const cityMap = {
    '北京': 'Beijing',
    '上海': 'Shanghai',
    '广州': 'Guangzhou',
    '深圳': 'Shenzhen',
    '杭州': 'Hangzhou',
    '成都': 'Chengdu',
    '武汉': 'Wuhan',
    '西安': 'Xi\'an',
    '南京': 'Nanjing',
    '重庆': 'Chongqing'
  };
  return cityMap[name] || name;
}

/**
 * 日期格式化
 * @param {string} dateStr - 日期字符串
 * @returns {string} 格式化后的日期
 */
function formatDate(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN');
}

/**
 * 计算利润
 * @param {Object} data - 数据对象
 * @returns {number} 利润值
 */
function calculateProfit(data) {
  if (!data || !data.modules || !data.modules.all) return 0;
  const all = data.modules.all;
  return (all.onlineRevenue || 0) - (all.totalExpense || 0);
}

/**
 * 安全获取对象属性
 * @param {Object} obj - 对象
 * @param {string} path - 属性路径 (如 'a.b.c')
 * @param {*} defaultValue - 默认值
 * @returns {*} 属性值或默认值
 */
function getNestedValue(obj, path, defaultValue = null) {
  if (!obj || !path) return defaultValue;
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : defaultValue;
  }, obj);
}

// 导出（如果使用模块化环境）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    _addThousandsSep,
    num,
    formatMoney,
    formatPercent,
    getCityDisplayName,
    formatDate,
    calculateProfit,
    getNestedValue
  };
}
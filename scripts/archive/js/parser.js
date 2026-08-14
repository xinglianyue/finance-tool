/**
 * Excel解析模块
 * 负责解析Excel文件并提取财务数据
 */

/**
 * 解析Excel文件
 * @param {Object} workbook - SheetJS工作簿对象
 * @param {string} fileName - 文件名
 * @returns {Object} 解析后的数据
 */
function parseExcelData(workbook, fileName) {
  console.log('[parseExcelData] 开始解析 Excel 文件:', fileName);
  
  try {
    // 读取第一个工作表
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // 转换为JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (!jsonData || jsonData.length === 0) {
      throw new Error('Excel文件为空');
    }
    
    console.log('[parseExcelData] 读取到', jsonData.length, '行数据');
    
    // 动态查找各模块位置
    const modulePositions = findModulePositions(jsonData);
    console.log('[parseExcelData] 找到模块位置:', modulePositions);
    
    // 解析每个模块的数据
    const merchantData = {
      all: {},
      cities: []
    };
    
    // 解析全量数据
    if (modulePositions.all !== undefined) {
      merchantData.all = parseModuleData(jsonData, modulePositions.all, 'all');
    }
    
    // 解析各城市数据
    const cityModules = ['city', 'ka'];
    for (const cityKey of cityModules) {
      if (modulePositions[cityKey] !== undefined) {
        const cityData = parseModuleData(jsonData, modulePositions[cityKey], cityKey);
        merchantData.cities.push({
          name: cityKey,
          ...cityData
        });
      }
    }
    
    // 设置日期
    merchantData.date = extractDateFromFileName(fileName);
    
    console.log('[parseExcelData] 解析完成:', {
      dates: merchantData.date,
      allKeys: Object.keys(merchantData.all || {}),
      citiesCount: merchantData.cities.length
    });
    
    return merchantData;
    
  } catch (error) {
    console.error('[parseExcelData] 解析失败:', error);
    throw error;
  }
}

/**
 * 动态查找各模块在表格中的位置
 * @param {Array} data - Excel数据数组
 * @returns {Object} 各模块的起始行索引
 */
function findModulePositions(data) {
  const positions = {};
  
  // 定义要搜索的模块标识
  const moduleDefs = [
    { searchName: '全品类财务指标', key: 'all' },
    { searchName: '城市维度指标', key: 'city' },
    { searchName: 'KA商家指标', key: 'ka' }
  ];
  
  // 遍历每一行，查找模块标识
  for (let rowIdx = 0; rowIdx < Math.min(data.length, 100); rowIdx++) {
    const row = data[rowIdx];
    if (!row || row.length === 0) continue;
    
    const rowStr = row.join('').toLowerCase();
    
    for (const moduleDef of moduleDefs) {
      if (rowStr.includes(moduleDef.searchName.toLowerCase())) {
        positions[moduleDef.key] = rowIdx;
        console.log(`[findModulePositions] 找到模块 "${moduleDef.searchName}" 在第 ${rowIdx + 1} 行`);
      }
    }
  }
  
  return positions;
}

/**
 * 解析单个模块的数据
 * @param {Array} data - Excel数据数组
 * @param {number} startRow - 模块起始行
 * @param {string} moduleKey - 模块标识
 * @returns {Object} 模块数据
 */
function parseModuleData(data, startRow, moduleKey) {
  const result = {};
  
  // 定义字段映射规则
  const fieldRules = [
    { keys: ['orders', '订单量'], name: 'orders' },
    { keys: ['gmv', '交易额', 'GMV'], name: 'gmv' },
    { keys: ['revenue', '收入', '营收'], name: 'revenue' },
    { keys: ['profit', '利润'], name: 'profit' },
    { keys: ['expense', '成本', '费用'], name: 'expense' }
  ];
  
  // 从起始行开始解析数据
  let currentRow = startRow + 1;
  
  while (currentRow < data.length && currentRow < startRow + 50) {
    const row = data[currentRow];
    if (!row || row.length < 2) {
      currentRow++;
      continue;
    }
    
    const fieldName = String(row[0] || '').trim();
    const fieldValue = row[1];
    
    // 匹配字段
    for (const rule of fieldRules) {
      if (rule.keys.some(key => fieldName.toLowerCase().includes(key.toLowerCase()))) {
        result[rule.name] = num(fieldValue);
        break;
      }
    }
    
    currentRow++;
  }
  
  return result;
}

/**
 * 从文件名中提取日期
 * @param {string} fileName - 文件名
 * @returns {string} 日期字符串
 */
function extractDateFromFileName(fileName) {
  // 尝试匹配 YYYY-MM-DD 格式
  const dateMatch = fileName.match(/(\d{4}-\d{2}-\d{2})/);
  if (dateMatch) {
    return dateMatch[1];
  }
  
  // 尝试匹配 MMDD 格式
  const mmddMatch = fileName.match(/(\d{2})(\d{2})/);
  if (mmddMatch) {
    const currentYear = new Date().getFullYear();
    return `${currentYear}-${mmddMatch[1]}-${mmddMatch[2]}`;
  }
  
  // 默认返回当前日期
  return new Date().toISOString().split('T')[0];
}

/**
 * 解析单条记录
 * @param {Object} record - 云端记录
 * @returns {Object} 解析后的商户数据
 */
function parseRecord(record) {
  if (!record || !record.merchantData) {
    return null;
  }
  
  const merchantData = record.merchantData;
  
  // 处理 cities 数组
  const cities = Array.isArray(merchantData.cities) 
    ? merchantData.cities 
    : Object.entries(merchantData.cities || {}).map(([name, data]) => ({ name, ...data }));
  
  return {
    date: record.date,
    all: merchantData.all || {},
    cities: cities
  };
}

// 导出（如果使用模块化环境）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    parseExcelData,
    findModulePositions,
    parseModuleData,
    extractDateFromFileName,
    parseRecord
  };
}
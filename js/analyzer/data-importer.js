/**
 * 数据导入模块 v2
 * 支持Excel和CSV格式导入
 * 自动识别数据格式并转换为标准结构
 */

class DataImporter {
  constructor() {
    this.supportedFormats = ['.xlsx', '.xls', '.csv'];
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
  }

  /**
   * 验证文件格式
   */
  validateFile(file) {
    const errors = [];
    
    // 检查文件是否存在
    if (!file) {
      errors.push('未选择文件');
      return { valid: false, errors };
    }
    
    // 检查文件格式
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!this.supportedFormats.includes(ext)) {
      errors.push(`不支持的文件格式 ${ext}，支持：${this.supportedFormats.join(', ')}`);
    }
    
    // 检查文件大小
    if (file.size > this.maxFileSize) {
      errors.push(`文件过大（${(file.size / 1024 / 1024).toFixed(2)}MB），最大支持10MB`);
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 导入文件主函数
   */
  async import(file) {
    const validation = this.validateFile(file);
    if (!validation.valid) {
      throw new Error(validation.errors.join('; '));
    }
    
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    
    try {
      if (ext === '.csv') {
        return await this.importCSV(file);
      } else {
        return await this.importExcel(file);
      }
    } catch (error) {
      console.error('[DataImporter] 导入失败:', error);
      throw new Error(`导入失败: ${error.message}`);
    }
  }

  /**
   * 导入CSV文件
   */
  async importCSV(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const text = e.target.result;
          const data = this.parseCSV(text);
          const normalized = this.normalizeData(data);
          resolve(normalized);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('读取文件失败'));
      reader.readAsText(file, 'UTF-8');
    });
  }

  /**
   * 解析CSV文本
   */
  parseCSV(text) {
    const lines = text.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV文件数据不足');
    }
    
    // 解析表头
    const headers = this.parseCSVLine(lines[0]);
    
    // 解析数据行
    const data = [];
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      const values = this.parseCSVLine(lines[i]);
      const row = {};
      
      headers.forEach((header, index) => {
        row[header.trim()] = values[index]?.trim() || '';
      });
      
      data.push(row);
    }
    
    return { headers, data };
  }

  /**
   * 解析CSV行（处理引号）
   */
  parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current);
    return result;
  }

  /**
   * 导入Excel文件（使用SheetJS）
   */
  async importExcel(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array', cellDates: true });
          
          // 查找包含财务数据的sheet
          const sheetName = this.findDataSheet(workbook);
          if (!sheetName) {
            throw new Error('未找到财务数据工作表');
          }
          
          const sheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
          
          const result = this.parseExcelData(jsonData);
          const normalized = this.normalizeData(result);
          
          resolve(normalized);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('读取文件失败'));
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * 查找数据sheet
   */
  findDataSheet(workbook) {
    // 优先查找包含"全量商家"关键词的sheet
    const sheetNames = workbook.SheetNames;
    
    for (const name of sheetNames) {
      if (name.includes('全量商家') || name.includes('商家')) {
        return name;
      }
    }
    
    // 返回第一个sheet
    return sheetNames[0];
  }

  /**
   * 解析Excel数据
   */
  parseExcelData(jsonData) {
    if (jsonData.length < 3) {
      throw new Error('Excel文件数据不足');
    }
    
    // 第一行通常是表头
    const headers = jsonData[0].map(h => String(h || '').trim());
    
    // 解析数据行
    const data = [];
    for (let i = 1; i < jsonData.length; i++) {
      if (!jsonData[i] || jsonData[i].length === 0) continue;
      
      const row = {};
      headers.forEach((header, index) => {
        const value = jsonData[i][index];
        row[header] = value;
      });
      
      data.push(row);
    }
    
    return { headers, data };
  }

  /**
   * 标准化数据格式
   */
  normalizeData(rawData) {
    const { headers, data } = rawData;
    
    // 检测表头模式
    const headerStr = headers.join(',').toLowerCase();
    
    if (headerStr.includes('订单量') || headerStr.includes('gmv')) {
      return this.normalizeFullMerchantData(data);
    }
    
    throw new Error('无法识别的数据格式，请确保文件包含"订单量"、"GMV"等关键字段');
  }

  /**
   * 标准化全量商家格式
   */
  normalizeFullMerchantData(data) {
    const cities = [];
    let currentCity = null;
    let currentModule = null;
    
    for (const row of data) {
      // 检测城市名（通常是行首且包含"县"、"市"等）
      const firstCol = String(row[Object.keys(row)[0]] || '').trim();
      
      if (firstCol.includes('县') || firstCol.includes('市') || firstCol === '总商') {
        if (currentCity) {
          cities.push(currentCity);
        }
        
        currentCity = {
          name: firstCol,
          displayName: firstCol.replace(/县|市/g, ''),
          modules: {}
        };
        
        currentModule = null;
        continue;
      }
      
      // 检测模块名
      const moduleNames = {
        '全品类': 'all',
        '餐饮': 'food',
        '闪购': 'flash',
        '医药': 'medicine',
        '拼好饭': 'group'
      };
      
      for (const [name, key] of Object.entries(moduleNames)) {
        if (firstCol.includes(name)) {
          currentModule = key;
          
          if (!currentCity.modules[key]) {
            currentCity.modules[key] = {};
          }
          break;
        }
      }
      
      // 解析数据字段
      if (currentCity && currentModule) {
        const module = currentCity.modules[currentModule];
        
        // 字段映射
        const fieldMap = {
          '订单量': 'orders',
          'gmv': 'gmvAmount',
          '总收入': 'totalRevenue',
          '总成本': 'totalExpense',
          '毛利': 'profit',
          'ue': 'ue',
          '单均ue': 'ue',
          '补贴总额': 'subsidyTotal',
          '补贴率': 'subsidyRatio',
          '配送成本': 'deliveryCost',
          '配送成本率': 'deliveryCostRate',
          '线上收入': 'onlineRevenue',
          '利润率': 'profitRate'
        };
        
        for (const [rowKey, rowValue] of Object.entries(row)) {
          const normalizedKey = this.normalizeFieldName(String(rowKey));
          
          if (fieldMap[normalizedKey]) {
            const targetKey = fieldMap[normalizedKey];
            let value = this.parseNumericValue(rowValue);
            
            // 百分比转换
            if ((normalizedKey.includes('率') || normalizedKey.includes('ratio')) && value > 1) {
              value = value / 100;
            }
            
            module[targetKey] = value;
          }
        }
      }
    }
    
    // 添加最后一个城市
    if (currentCity) {
      cities.push(currentCity);
    }
    
    return { cities };
  }

  /**
   * 标准化字段名
   */
  normalizeFieldName(name) {
    return name.toLowerCase().replace(/\s+/g, '').replace(/[^\u4e00-\u9fa5a-z]/g, '');
  }

  /**
   * 解析数值
   */
  parseNumericValue(value) {
    if (value === null || value === undefined || value === '') {
      return 0;
    }
    
    if (typeof value === 'number') {
      return value;
    }
    
    // 移除逗号和空格
    const str = String(value).replace(/,/g, '').trim();
    
    // 处理百分比字符串
    if (str.endsWith('%')) {
      return parseFloat(str.slice(0, -1)) / 100;
    }
    
    return parseFloat(str) || 0;
  }
}

// 数据存储管理器
class DataStorage {
  constructor() {
    this.key = 'finance-tool-v2-data';
    this.backupKey = 'finance-tool-v2-backup';
  }

  /**
   * 保存数据
   */
  save(data) {
    try {
      // 先备份当前数据
      this.backup();
      
      const allData = this.loadAll();
      const date = data.date || new Date().toISOString().slice(0, 10);
      
      allData[date] = {
        ...data,
        savedAt: new Date().toISOString()
      };
      
      localStorage.setItem(this.key, JSON.stringify(allData));
      
      console.log(`[DataStorage] 数据已保存: ${date}`);
      return true;
    } catch (error) {
      console.error('[DataStorage] 保存失败:', error);
      return false;
    }
  }

  /**
   * 加载所有数据
   */
  loadAll() {
    try {
      const data = localStorage.getItem(this.key);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('[DataStorage] 加载失败:', error);
      return {};
    }
  }

  /**
   * 加载指定日期数据
   */
  load(date) {
    const allData = this.loadAll();
    return allData[date] || null;
  }

  /**
   * 获取所有可用日期
   */
  getAvailableDates() {
    const allData = this.loadAll();
    return Object.keys(allData).sort().reverse();
  }

  /**
   * 删除指定日期数据
   */
  delete(date) {
    const allData = this.loadAll();
    delete allData[date];
    localStorage.setItem(this.key, JSON.stringify(allData));
  }

  /**
   * 备份当前数据
   */
  backup() {
    try {
      const current = localStorage.getItem(this.key);
      if (current) {
        const backups = this.getBackups();
        backups.unshift({
          timestamp: new Date().toISOString(),
          data: JSON.parse(current)
        });
        
        // 只保留最近5个备份
        while (backups.length > 5) {
          backups.pop();
        }
        
        localStorage.setItem(this.backupKey, JSON.stringify(backups));
      }
    } catch (error) {
      console.error('[DataStorage] 备份失败:', error);
    }
  }

  /**
   * 获取备份列表
   */
  getBackups() {
    try {
      const data = localStorage.getItem(this.backupKey);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      return [];
    }
  }

  /**
   * 恢复备份
   */
  restore(backupIndex) {
    const backups = this.getBackups();
    if (backupIndex >= 0 && backupIndex < backups.length) {
      const backup = backups[backupIndex];
      localStorage.setItem(this.key, JSON.stringify(backup.data));
      return true;
    }
    return false;
  }

  /**
   * 清除所有数据
   */
  clear() {
    localStorage.removeItem(this.key);
    console.log('[DataStorage] 数据已清除');
  }

  /**
   * 导出数据为JSON
   */
  export() {
    const data = this.loadAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `财务数据_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * 从JSON导入
   */
  async import(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          this.save(data);
          resolve(data);
        } catch (error) {
          reject(new Error('无效的JSON文件'));
        }
      };
      
      reader.onerror = () => reject(new Error('读取文件失败'));
      reader.readAsText(file);
    });
  }
}

// 导出到全局
window.DataImporter = DataImporter;
window.DataStorage = DataStorage;

console.log('[DataImporter] 数据导入模块加载完成');

/**
 * Phase3: 数据上传功能
 * 
 * 功能：
 * 1. 上传入口按钮
 * 2. 日期选择弹窗
 * 3. CSV解析
 * 4. LocalStorage存储
 * 
 * 小干哥v1.2规范：
 * - 错误处理三步法
 * - 容错机制（默认值+边界判断）
 * - 交付前自检
 */

// ============ 错误处理 ============
const ErrorHandler = {
  // 错误字典
  errors: {
    'FILE_EMPTY': { msg: '请选择文件', fix: '点击上传按钮选择CSV文件' },
    'FILE_TYPE': { msg: '只支持CSV文件', fix: '请导出为CSV格式' },
    'PARSE_ERROR': { msg: 'CSV解析失败', fix: '检查文件格式是否正确' },
    'DATA_MISSING': { msg: '数据缺失', fix: '确保包含city/orders/revenue字段' },
    'DATE_INVALID': { msg: '日期格式错误', fix: '请选择正确的截止日期' },
  },

  // 三步法：错误→原因→修复
  handle: function(errorCode, detail = '') {
    const err = this.errors[errorCode] || { msg: '未知错误', fix: '请重试' };
    const message = `${err.msg}${detail ? ' (' + detail + ')' : ''}`;
    console.error(`[Error] ${errorCode}:`, message);
    return {
      code: errorCode,
      message: message,
      fix: err.fix
    };
  },

  // 展示错误（用户友好）
  showError: function(errorCode, detail = '') {
    const err = this.handle(errorCode, detail);
    alert(`⚠️ ${err.message}\n\n修复方法：${err.fix}`);
  }
};

// ============ 上传弹窗 ============
const UploadModal = {
  // 弹窗HTML模板
  html: `
    <div id="uploadModal" class="modal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>📤 上传数据</h3>
          <button class="modal-close" onclick="UploadModal.close()">&times;</button>
        </div>
        
        <div class="modal-body">
          <div class="form-group">
            <label>截止日期</label>
            <input type="date" id="uploadDate" required>
          </div>
          
          <div class="form-group">
            <label>选择CSV文件</label>
            <div class="upload-zone" id="uploadZone">
              <div class="upload-icon">📄</div>
              <div class="upload-text">点击选择或拖拽CSV文件</div>
              <div class="upload-hint">支持技术人员导出的CSV</div>
              <input type="file" id="fileInput" accept=".csv" hidden>
            </div>
            <div class="file-info" id="fileInfo"></div>
          </div>
          
          <div class="form-group">
            <label>CSV格式要求</label>
            <div class="format-hint">
              <code>city,orders,revenue,cost,profit</code>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="UploadModal.close()">取消</button>
          <button class="btn btn-primary" id="uploadBtn" onclick="UploadModal.doUpload()" disabled>上传</button>
        </div>
      </div>
    </div>
  `,

  // 样式
  styles: `
    .modal {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      z-index: 1000;
      align-items: center;
      justify-content: center;
    }
    .modal.show { display: flex; }
    .modal-content {
      background: white;
      border-radius: 16px;
      width: 90%;
      max-width: 420px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.2);
    }
    .modal-header {
      padding: 16px 20px;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .modal-header h3 { font-size: 16px; color: #1e293b; }
    .modal-close {
      background: none;
      border: none;
      font-size: 24px;
      color: #94a3b8;
      cursor: pointer;
      padding: 0;
      line-height: 1;
    }
    .modal-close:hover { color: #64748b; }
    .modal-body { padding: 20px; }
    .form-group { margin-bottom: 16px; }
    .form-group:last-child { margin-bottom: 0; }
    .form-group label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: #475569;
      margin-bottom: 6px;
    }
    .form-group input[type="date"] {
      width: 100%;
      padding: 10px 14px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      font-size: 14px;
    }
    .upload-zone {
      border: 2px dashed #cbd5e1;
      border-radius: 12px;
      padding: 30px;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s;
    }
    .upload-zone:hover, .upload-zone.dragover {
      border-color: #667eea;
      background: rgba(102,126,234,0.05);
    }
    .upload-icon { font-size: 36px; margin-bottom: 8px; }
    .upload-text { font-size: 14px; color: #475569; }
    .upload-hint { font-size: 12px; color: #94a3b8; margin-top: 4px; }
    .file-info {
      margin-top: 8px;
      padding: 8px 12px;
      background: #f0fdf4;
      border-radius: 6px;
      font-size: 13px;
      color: #166534;
      display: none;
    }
    .file-info.show { display: block; }
    .format-hint {
      background: #f8fafc;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 12px;
    }
    .format-hint code {
      color: #667eea;
      font-family: monospace;
    }
    .modal-footer {
      padding: 16px 20px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      gap: 10px;
      justify-content: flex-end;
    }
    .btn {
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
    }
    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .btn-primary {
      background: #667eea;
      color: white;
    }
    .btn-primary:hover:not(:disabled) { background: #5a6fd6; }
    .btn-secondary {
      background: #f1f5f9;
      color: #475569;
    }
    .btn-secondary:hover { background: #e2e8f0; }
  `,

  // 文件状态
  file: null,
  fileName: '',
  fileSize: 0,

  // 初始化
  init: function() {
    // 注入样式
    if (!document.getElementById('uploadModalStyles')) {
      const style = document.createElement('style');
      style.id = 'uploadModalStyles';
      style.textContent = this.styles;
      document.head.appendChild(style);
    }
    
    // 注入HTML
    if (!document.getElementById('uploadModal')) {
      document.body.insertAdjacentHTML('beforeend', this.html);
    }
    
    // 绑定事件
    this.bindEvents();
  },

  // 绑定事件
  bindEvents: function() {
    const zone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');
    const dateInput = document.getElementById('uploadDate');
    
    // 点击上传区
    zone.addEventListener('click', () => fileInput.click());
    
    // 文件选择
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        this.handleFile(e.target.files[0]);
      }
    });
    
    // 拖拽
    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      zone.classList.add('dragover');
    });
    zone.addEventListener('dragleave', () => {
      zone.classList.remove('dragover');
    });
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) {
        this.handleFile(e.dataTransfer.files[0]);
      }
    });
    
    // 日期变化检查
    dateInput.addEventListener('change', () => this.checkUploadBtn());
  },

  // 处理文件
  handleFile: function(file) {
    // 容错：文件类型检查
    if (!file) {
      ErrorHandler.showError('FILE_EMPTY');
      return;
    }
    
    if (!file.name.toLowerCase().endsWith('.csv')) {
      ErrorHandler.showError('FILE_TYPE');
      return;
    }
    
    this.file = file;
    this.fileName = file.name;
    this.fileSize = file.size;
    
    // 显示文件信息
    const fileInfo = document.getElementById('fileInfo');
    fileInfo.textContent = `✅ ${file.name} (${this.formatSize(file.size)})`;
    fileInfo.classList.add('show');
    
    this.checkUploadBtn();
  },

  // 格式化文件大小
  formatSize: function(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  },

  // 检查上传按钮状态
  checkUploadBtn: function() {
    const dateInput = document.getElementById('uploadDate');
    const uploadBtn = document.getElementById('uploadBtn');
    const hasDate = dateInput.value !== '';
    const hasFile = this.file !== null;
    uploadBtn.disabled = !(hasDate && hasFile);
  },

  // 打开弹窗
  open: function() {
    // 重置状态
    this.file = null;
    this.fileName = '';
    this.fileSize = 0;
    document.getElementById('fileInput').value = '';
    document.getElementById('fileInfo').classList.remove('show');
    document.getElementById('fileInfo').textContent = '';
    document.getElementById('uploadDate').value = '';
    document.getElementById('uploadBtn').disabled = true;
    
    // 默认填今天
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('uploadDate').value = today;
    
    // 显示弹窗
    document.getElementById('uploadModal').classList.add('show');
  },

  // 关闭弹窗
  close: function() {
    document.getElementById('uploadModal').classList.remove('show');
  },

  // 执行上传
  doUpload: function() {
    const date = document.getElementById('uploadDate').value;
    
    // 容错：日期检查
    if (!date) {
      ErrorHandler.showError('DATE_INVALID');
      return;
    }
    
    // 读取文件
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = CSVParser.parse(e.target.result);
        
        if (data.length === 0) {
          ErrorHandler.showError('DATA_MISSING', '文件中没有找到有效数据');
          return;
        }
        
        // 存储到LocalStorage
        const storageKey = `finance_data_${date}`;
        const storageData = {
          date: date,
          uploadedAt: new Date().toISOString(),
          cities: data
        };
        
        // 容错：JSON序列化失败
        try {
          localStorage.setItem(storageKey, JSON.stringify(storageData));
          // 同时保存最新日期
          localStorage.setItem('finance_latest_date', date);
        } catch (storageErr) {
          alert('⚠️ 存储空间不足，请清理浏览器缓存后重试');
          return;
        }
        
        // 成功提示
        this.close();
        alert(`✅ 上传成功！\n\n日期：${date}\n城市数：${data.length}个\n\n页面将自动刷新显示新数据。`);
        
        // 触发页面刷新数据（如果有refreshData函数）
        if (typeof window.refreshData === 'function') {
          window.refreshData();
        } else {
          location.reload();
        }
        
      } catch (parseErr) {
        ErrorHandler.showError('PARSE_ERROR', parseErr.message);
      }
    };
    
    reader.onerror = () => {
      ErrorHandler.showError('PARSE_ERROR', '文件读取失败');
    };
    
    reader.readAsText(this.file);
  }
};

// ============ CSV解析器 ============
const CSVParser = {
  // 解析CSV文本
  parse: function(text) {
    if (!text || typeof text !== 'string') {
      throw new Error('无效的CSV内容');
    }
    
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) {
      throw new Error('CSV至少需要表头和一行数据');
    }
    
    // 解析表头
    const headers = this.parseLine(lines[0]).map(h => h.toLowerCase().trim());
    
    // 找到字段索引（容错：兼容不同列名）
    const fieldIndex = {
      city: headers.findIndex(h => h === 'city' || h === '城市' || h === '城市名'),
      orders: headers.findIndex(h => h === 'orders' || h === '订单量' || h === '订单'),
      revenue: headers.findIndex(h => h === 'revenue' || h === '收入' || h === '营收'),
      cost: headers.findIndex(h => h === 'cost' || h === '成本'),
      profit: headers.findIndex(h => h === 'profit' || h === '毛利' || h === '利润'),
    };
    
    // 容错：必需字段检查
    if (fieldIndex.city === -1) {
      throw new Error('未找到城市名称列（需要city或城市）');
    }
    if (fieldIndex.revenue === -1) {
      throw new Error('未找到收入列（需要revenue或收入）');
    }
    
    // 解析数据行
    const cities = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // 跳过空行
      
      try {
        const values = this.parseLine(line);
        
        const city = {
          name: this.getValue(values, fieldIndex.city),
          orders: this.parseNumber(this.getValue(values, fieldIndex.orders)),
          revenue: this.parseNumber(this.getValue(values, fieldIndex.revenue)),
          cost: this.parseNumber(this.getValue(values, fieldIndex.cost)),
          profit: this.parseNumber(this.getValue(values, fieldIndex.profit)),
        };
        
        // 容错：城市名为空的跳过
        if (!city.name) continue;
        
        // 计算UE（容错：除零保护）
        city.ue = city.orders > 0 ? (city.revenue / city.orders) : 0;
        
        cities.push(city);
      } catch (rowErr) {
        console.warn(`跳过第${i+1}行：${rowErr.message}`);
        continue;
      }
    }
    
    return cities;
  },
  
  // 解析一行（处理引号）
  parseLine: function(line) {
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    
    return values;
  },
  
  // 获取值（容错：索引越界）
  getValue: function(values, index) {
    if (index < 0 || index >= values.length) return '';
    return values[index] || '';
  },
  
  // 解析数字（容错：非数字返回0）
  parseNumber: function(value) {
    if (!value || typeof value !== 'string') return 0;
    const num = parseFloat(value.replace(/[¥,，元\s]/g, ''));
    return isNaN(num) ? 0 : num;
  }
};

// ============ 数据加载 ============
const DataLoader = {
  // 从LocalStorage加载数据
  load: function() {
    const latestDate = localStorage.getItem('finance_latest_date');
    if (!latestDate) return null;
    
    const key = `finance_data_${latestDate}`;
    const data = localStorage.getItem(key);
    
    if (!data) return null;
    
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error('数据解析失败：', e);
      return null;
    }
  },
  
  // 获取所有上传记录
  getAllRecords: function() {
    const records = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('finance_data_')) {
        try {
          const data = JSON.parse(localStorage.getItem(key));
          if (data && data.date) {
            records.push({
              date: data.date,
              cityCount: data.cities ? data.cities.length : 0,
              uploadedAt: data.uploadedAt
            });
          }
        } catch (e) {
          continue;
        }
      }
    }
    return records.sort((a, b) => new Date(b.date) - new Date(a.date));
  }
};

// ============ 导出上传按钮函数 ============
function showUploadModal() {
  UploadModal.open();
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
  UploadModal.init();
});

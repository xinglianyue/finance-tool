'use strict';

  // ===== 配置常量 =====
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  const ALLOWED_EXTENSIONS = ['xlsx', 'csv', 'xls'];
  const REQUIRED_SHEETS = ['Sheet1', '数据', '明细', '总表', '汇总', 'data'];
  const OPTIONAL_SHEETS = ['Sheet2', 'Sheet3', '配置', '说明', '参数'];

  // ===== 工具函数 =====
  export function getApiServer() {
    return localStorage.getItem('API_SERVER') || '';
  }

  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  // ===== P1: 文件校验引擎 =====
  export function validateExcelFile(file) {
    var result = { valid: true, errors: [], warnings: [], info: {} };
    if (!file) {
      result.valid = false;
      result.errors.push('未选择文件');
      return result;
    }

    // 1. 文件扩展名校验
    var ext = file.name.split('.').pop().toLowerCase();
    result.info.fileName = file.name;
    result.info.fileSize = file.size;
    result.info.fileSizeFormatted = formatFileSize(file.size);
    result.info.extension = ext;

    if (ALLOWED_EXTENSIONS.indexOf(ext) === -1) {
      result.valid = false;
      result.errors.push('不支持的文件格式: .' + ext + '，仅支持 ' + ALLOWED_EXTENSIONS.join(', '));
      return result;
    }

    // 2. 文件大小校验
    if (file.size > MAX_FILE_SIZE) {
      result.valid = false;
      result.errors.push('文件过大: ' + result.info.fileSizeFormatted + '，最大支持 ' + formatFileSize(MAX_FILE_SIZE));
      return result;
    }
    if (file.size === 0) {
      result.valid = false;
      result.errors.push('文件为空');
      return result;
    }

    // 3. 文件名特殊字符检查
    if (/[\\/:*?"<>|]/.test(file.name.replace('.' + ext, ''))) {
      result.warnings.push('文件名包含特殊字符，建议修改');
    }

    return result;
  }

  // ===== P1: Excel内容校验（读取后调用） =====
  export function validateExcelContent(workbook) {
    var result = { valid: true, errors: [], warnings: [], info: {} };
    if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
      result.valid = false;
      result.errors.push('无法读取工作簿内容，文件可能已损坏');
      return result;
    }

    result.info.sheetCount = workbook.SheetNames.length;
    result.info.sheetNames = workbook.SheetNames.slice();

    // 检查是否有可识别的Sheet
    var hasRecognizedSheet = workbook.SheetNames.some(function(name) {
      return REQUIRED_SHEETS.indexOf(name) !== -1 || OPTIONAL_SHEETS.indexOf(name) !== -1;
    });
    if (!hasRecognizedSheet) {
      result.warnings.push('未找到常见Sheet名称（如：数据、明细、汇总），将使用第一个Sheet: "' + workbook.SheetNames[0] + '"');
    }

    // 检查第一个Sheet的数据量
    var firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    var range = XLSX.utils.decode_range(firstSheet['!ref'] || 'A1');
    result.info.rows = range.e.r - range.s.r + 1;
    result.info.cols = range.e.c - range.s.c + 1;

    if (result.info.rows <= 1) {
      result.warnings.push('Sheet "' + workbook.SheetNames[0] + '" 数据行数很少（' + result.info.rows + '行），请确认数据是否完整');
    }
    if (result.info.rows > 10000) {
      result.warnings.push('数据量较大（' + result.info.rows + '行），解析可能需要几秒钟');
    }

    return result;
  }

  // ===== P1: 预览面板渲染 =====
  export function renderPreviewModal(file, workbook, fileValidation, contentValidation) {
    // 移除已有预览面板
    closePreview();

    var overlay = document.createElement('div');
    overlay.id = 'previewOverlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:var(--overlay-bg);z-index:10000;display:flex;align-items:center;justify-content:center;';

    var panel = document.createElement('div');
    panel.style.cssText = 'background:var(--modal-bg);border-radius:12px;box-shadow:0 20px 60px var(--modal-shadow);width:90%;max-width:900px;max-height:85vh;display:flex;flex-direction:column;overflow:hidden;';

    // 头部
    var header = document.createElement('div');
    header.style.cssText = 'padding:20px 24px 16px;border-bottom:1px solid var(--border-light);display:flex;justify-content:space-between;align-items:center;flex-shrink:0;';
    header.innerHTML = '<h3 class="ft-modal-title">\u{1F4CA} 数据导入预览</h3>' +
      '<button id="previewCloseBtn" class="ft-v-close-lh">&times;</button>';

    // 正文
    var body = document.createElement('div');
    body.style.cssText = 'padding:20px 24px;overflow-y:auto;flex:1;';

    // 文件信息卡片
    var fileCard = '<div style="background:var(--bg-secondary,#f8f9fa);border-radius:8px;padding:16px;margin-bottom:16px;">' +
      '<div style="font-size:14px;color:var(--text-muted);margin-bottom:8px;font-weight:500;">文件信息</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px;">' +
      '<div><span style="color:var(--text-muted,#999);">文件名：</span><span style="color:var(--text-primary,#333);font-weight:500;">' + (fileValidation.info.fileName || '-') + '</span></div>' +
      '<div><span style="color:var(--text-muted,#999);">大小：</span><span style="color:var(--text-primary,#333);">' + (fileValidation.info.fileSizeFormatted || '-') + '</span></div>' +
      '<div><span style="color:var(--text-muted,#999);">格式：</span><span style="color:var(--text-primary,#333);">.' + (fileValidation.info.extension || '-') + '</span></div>' +
      '<div><span style="color:var(--text-muted,#999);">Sheet数量：</span><span style="color:var(--text-primary,#333);">' + (contentValidation.info.sheetCount || 0) + '</span></div>' +
      '<div><span style="color:var(--text-muted,#999);">数据行数：</span><span style="color:var(--text-primary,#333);">' + (contentValidation.info.rows || 0) + '</span></div>' +
      '<div><span style="color:var(--text-muted,#999);">数据列数：</span><span style="color:var(--text-primary,#333);">' + (contentValidation.info.cols || 0) + '</span></div>' +
      '</div></div>';

    // 校验结果
    var validationHtml = '<div class="ft-mb16">';
    if (fileValidation.errors.length > 0) {
      validationHtml += '<div class="ft-v-error">';
      validationHtml += '<div style="font-size:13px;font-weight:600;color:var(--error-color,#cf1322);margin-bottom:4px;">\u274C 错误（' + fileValidation.errors.length + '）</div>';
      fileValidation.errors.forEach(function(e) { validationHtml += '<div style="font-size:12px;color:var(--error-dark,#a8071a);margin-left:16px;">&bull; ' + e + '</div>'; });
      validationHtml += '</div>';
    }
    if (fileValidation.warnings.length > 0 || contentValidation.warnings.length > 0) {
      var allWarnings = fileValidation.warnings.concat(contentValidation.warnings);
      validationHtml += '<div class="ft-v-warn">';
      validationHtml += '<div style="font-size:13px;font-weight:600;color:var(--warning-color,#d48806);margin-bottom:4px;">\u26A0\uFE0F 警告（' + allWarnings.length + '）</div>';
      allWarnings.forEach(function(w) { validationHtml += '<div style="font-size:12px;color:var(--warning-dark,#ad6800);margin-left:16px;">&bull; ' + w + '</div>'; });
      validationHtml += '</div>';
    }
    if (fileValidation.errors.length === 0 && fileValidation.warnings.length === 0 && contentValidation.warnings.length === 0) {
      validationHtml += '<div class="ft-v-pass">';
      validationHtml += '<div class="ft-v-pass-label">\u2705 校验通过，文件格式正确</div>';
      validationHtml += '</div>';
    }
    validationHtml += '</div>';

    // 数据预览表格
    var previewHtml = '<div class="ft-mb16">' +
      '<div style="font-size:14px;color:var(--text-muted);margin-bottom:8px;font-weight:500;">数据预览（前10行）</div>' +
      '<div class="ft-v-table">';

    var sheetName = workbook.SheetNames[0];
    var sheet = workbook.Sheets[sheetName];
    var jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    var previewRows = jsonData.slice(0, 11); // 表头 + 10行数据

    if (previewRows.length > 0) {
      previewHtml += '<table class="ft-tbl-full">';
      previewRows.forEach(function(row, idx) {
        var isHeader = idx === 0;
        previewHtml += '<tr>';
        row.forEach(function(cell) {
          var tag = isHeader ? 'th' : 'td';
          var style = 'padding:6px 10px;border-bottom:1px solid var(--border-light,#f0f0f0);' +
            (isHeader ? 'background:var(--bg-header,#fafafa);font-weight:600;text-align:left;color:var(--text-primary,#333);white-space:nowrap;' : 'color:var(--text-secondary,#555);white-space:nowrap;max-width:200px;overflow:hidden;text-overflow:ellipsis;');
          previewHtml += '<' + tag + ' style="' + style + '">' + (cell !== null && cell !== undefined ? String(cell) : '') + '</' + tag + '>';
        });
        previewHtml += '</tr>';
      });
      previewHtml += '</table>';
    } else {
      previewHtml += '<div class="ft-v-sec-pd20">无数据</div>';
    }
    previewHtml += '</div>';

    // Sheet列表
    if (workbook.SheetNames.length > 1) {
      previewHtml += '<div class="ft-v-sec-mt8">';
      previewHtml += '所有Sheet: ' + workbook.SheetNames.map(function(n) { return '<span style="background:var(--border-light,#f0f0f0);padding:2px 8px;border-radius:4px;margin-right:4px;display:inline-block;">' + n + '</span>'; }).join('');
      previewHtml += '</div>';
    }
    previewHtml += '</div>';

    body.innerHTML = fileCard + validationHtml + previewHtml;

    // 底部按钮
    var footer = document.createElement('div');
    footer.style.cssText = 'padding:16px 24px;border-top:1px solid var(--border-light);display:flex;justify-content:flex-end;gap:12px;flex-shrink:0;';

    var cancelBtn = document.createElement('button');
    cancelBtn.textContent = '取消';
    cancelBtn.style.cssText = 'padding:8px 20px;border:1px solid var(--border-medium);border-radius:6px;background:var(--modal-bg);color:var(--text-muted);cursor:pointer;font-size:14px;';
    cancelBtn.onclick = closePreview;

    var confirmBtn = document.createElement('button');
    var hasErrors = fileValidation.errors.length > 0;
    confirmBtn.textContent = hasErrors ? '文件有错误，无法导入' : '确认导入';
    confirmBtn.style.cssText = 'padding:8px 24px;border:none;border-radius:6px;cursor:pointer;font-size:14px;font-weight:500;' +
      (hasErrors ? 'background:var(--border-medium);color:var(--text-on-primary,var(--text-on-primary,#fff));' : 'background:var(--btn-primary);color:var(--text-on-primary,#fff);');
    confirmBtn.disabled = hasErrors;
    if (!hasErrors) {
      confirmBtn.onclick = function() { confirmImport(file); };
    }

    footer.appendChild(cancelBtn);
    footer.appendChild(confirmBtn);

    panel.appendChild(header);
    panel.appendChild(body);
    panel.appendChild(footer);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    // ESC关闭
    overlay._escHandler = function(e) {
      if (e.key === 'Escape') closePreview();
    };
    document.addEventListener('keydown', overlay._escHandler);

    // 点击遮罩关闭
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) closePreview();
    });
  }

  // ===== 关闭预览面板 =====
  export function closePreview() {
    var overlay = document.getElementById('previewOverlay');
    if (overlay) {
      if (overlay._escHandler) {
        document.removeEventListener('keydown', overlay._escHandler);
      }
      overlay.remove();
    }
  }

  // ===== 确认导入（通过fileInput change事件触发IIFE内的handleFile） =====
  export function confirmImport(file) {
    closePreview();

    var progressFill = document.getElementById('dropProgressFill');
    var progressText = document.getElementById('dropProgressText');
    if (progressFill) { progressFill.style.width = '80%'; progressFill.style.background = 'var(--btn-primary)'; }
    if (progressText) progressText.textContent = '正在导入数据...';

    if (typeof handleFile === 'function') {
      try {
        handleFile(file);
        if (progressFill) { progressFill.style.width = '100%'; setTimeout(function() { progressFill.style.width = '0%'; }, 1500); }
        if (progressText) { progressText.textContent = '导入完成!'; setTimeout(function() { progressText.textContent = ''; }, 2000); }
      } catch(err) {
        console.error('[confirmImport] handleFile failed:', err);
        ToastManager.error('导入失败', err.message);
        if (progressFill) { progressFill.style.width = '0%'; }
        if (progressText) progressText.textContent = '';
      }
    } else {
      console.error('[confirmImport] handleFile not available');
      ToastManager.error('导入失败', '页面未就绪，请刷新后重试');
      if (progressFill) { progressFill.style.width = '0%'; }
      if (progressText) progressText.textContent = '';
    }
  }

  // ===== 拖拽上传区初始化 =====
  export function initDropZone() {
    var dropZone = document.getElementById('dropZone');
    if (!dropZone) return;

    var dropInput = document.getElementById('dropFileInput');
    var progressFill = document.getElementById('dropProgressFill');
    var progressText = document.getElementById('dropProgressText');

    // 点击触发文件选择
    dropZone.addEventListener('click', function() {
      if (dropInput) dropInput.click();
    });

    if (dropInput) {
      dropInput.addEventListener('change', function(e) {
        if (e.target.files && e.target.files[0]) {
          processFileWithValidation(e.target.files[0]);
          e.target.value = ''; // 重置以允许重复选择同一文件
        }
      });
    }

    // 拖拽事件
    ['dragenter', 'dragover'].forEach(function(evt) {
      dropZone.addEventListener(evt, function(e) {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add('drop-zone-active');
      });
    });

    ['dragleave', 'drop'].forEach(function(evt) {
      dropZone.addEventListener(evt, function(e) {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('drop-zone-active');
      });
    });

    dropZone.addEventListener('drop', function(e) {
      var files = e.dataTransfer.files;
      if (files && files[0]) {
        processFileWithValidation(files[0]);
      }
    });

    // 全局拖拽防止浏览器打开文件
    document.addEventListener('dragover', function(e) { e.preventDefault(); });
    document.addEventListener('drop', function(e) { e.preventDefault(); });
  }

  // ===== 带校验的文件处理流程 =====
  export function processFileWithValidation(file) {
    var progressFill = document.getElementById('dropProgressFill');
    var progressText = document.getElementById('dropProgressText');

    // Step 1: 文件级校验
    var fileValidation = validateExcelFile(file);

    // 更新进度
    if (progressFill) {
      progressFill.style.width = '20%';
      progressFill.style.background = fileValidation.valid ? 'var(--btn-primary)' : 'var(--error-color)';
    }
    if (progressText) progressText.textContent = '正在校验文件...';

    if (!fileValidation.valid) {
      // 显示错误
      showValidationErrors(fileValidation);
      setTimeout(function() {
        if (progressFill) { progressFill.style.width = '0%'; progressFill.style.background = 'var(--btn-primary)'; }
        if (progressText) progressText.textContent = '';
      }, 3000);
      return;
    }

    // Step 2: 读取并校验内容
    if (progressFill) progressFill.style.width = '40%';
    var reader = new FileReader();
    reader.onload = function(e) {
      try {
        var data = new Uint8Array(e.target.result);
        var workbook = XLSX.read(data, { type: 'array' });
        var contentValidation = validateExcelContent(workbook);

        if (!contentValidation.valid) {
          showValidationErrors(contentValidation);
          setTimeout(function() {
            if (progressFill) { progressFill.style.width = '0%'; progressFill.style.background = 'var(--btn-primary)'; }
            if (progressText) progressText.textContent = '';
          }, 3000);
          return;
        }

        // Step 3: 显示预览面板
        renderPreviewModal(file, workbook, fileValidation, contentValidation);
        if (progressFill) { progressFill.style.width = '0%'; }
        if (progressText) progressText.textContent = '';
      } catch(err) {
        ToastManager.error('读取失败', err.message);
        if (progressFill) { progressFill.style.width = '0%'; }
        if (progressText) progressText.textContent = '';
      }
    };
    reader.readAsArrayBuffer(file);
  }

  // ===== 校验错误展示 =====
  export function showValidationErrors(validation) {
    var messages = validation.errors.concat(validation.warnings);
    if (messages.length > 0) {
      ToastManager.error('文件校验失败', messages.join(' | '));
    }
  }

  // ===== 设置面板 =====
  export function openSettings() {
    // 移除已有面板
    closeSettings();

    var overlay = document.createElement('div');
    overlay.id = 'settingsOverlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:var(--overlay-bg);z-index:10000;display:flex;align-items:center;justify-content:center;';

    var panel = document.createElement('div');
    panel.style.cssText = 'background:var(--modal-bg);border-radius:12px;box-shadow:0 20px 60px var(--modal-shadow);width:480px;max-width:90vw;overflow:hidden;';

    var html = '';
    // 头部
    html += '<div class="ft-modal-head">';
    html += '<h3 class="ft-modal-title">\u2699\uFE0F 同步设置</h3>';
    html += '<button id="settingsCloseBtn" class="ft-v-close">&times;</button>';
    html += '</div>';

    // 内容
    html += '<div class="ft-v-body">';

    // API服务器配置
    var currentApi = getApiServer();
    html += '<div class="ft-mb20">';
    html += '<label class="ft-v-block-label">API 服务器地址</label>';
    html += '<input id="settingsApiServer" type="text" value="' + currentApi + '" placeholder="例如: http://192.168.0.12:8899" style="width:100%;padding:8px 12px;border:1px solid var(--border-medium);border-radius:6px;font-size:14px;box-sizing:border-box;">';
    html += '<p class="ft-v-sec-mt">技术人员电脑上运行的api_server.py地址，留空则使用当前域名（同源模式）</p>';
    html += '</div>';

    // 连接测试
    html += '<div class="ft-mb20">';
    html += '<button id="settingsTestBtn" class="ft-btn-outline">测试连接</button>';
    html += '<span id="settingsTestResult" class="ft-ml10 ft-fs13"></span>';
    html += '</div>';

    // 当前状态
    html += '<div class="ft-v-card">';
    html += '<div class="ft-v-block-label-mb8">当前状态</div>';
    html += '<div id="settingsStatus" class="ft-v-card-body"></div>';
    html += '</div>';

    html += '</div>';

    // 底部
    html += '<div class="ft-modal-foot">';
    html += '<button id="settingsCancelBtn" class="ft-btn-sec">取消</button>';
    html += '<button id="settingsSaveBtn" class="ft-btn-pri">保存</button>';
    html += '</div>';

    panel.innerHTML = html;
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    // 绑定事件
    document.getElementById('settingsCloseBtn').onclick = closeSettings;
    document.getElementById('settingsCancelBtn').onclick = closeSettings;
    document.getElementById('settingsSaveBtn').onclick = saveSettings;
    document.getElementById('settingsTestBtn').onclick = testApiConnection;

    // ESC关闭
    overlay._escHandler = function(e) { if (e.key === 'Escape') closeSettings(); };
    document.addEventListener('keydown', overlay._escHandler);
    overlay.addEventListener('click', function(e) { if (e.target === overlay) closeSettings(); });

    // 加载状态
    updateSettingsStatus();
  }

  export function closeSettings() {
    var overlay = document.getElementById('settingsOverlay');
    if (overlay) {
      if (overlay._escHandler) document.removeEventListener('keydown', overlay._escHandler);
      overlay.remove();
    }
  }

  export function saveSettings() {
    var input = document.getElementById('settingsApiServer');
    if (input) {
      var url = input.value.trim().replace(/\/+$/, ''); // 移除末尾斜杠
      localStorage.setItem('API_SERVER', url);
      // 更新全局API_SERVER变量（如果存在）
      if (typeof API_SERVER !== 'undefined') {
        API_SERVER = url;
      }
    }
    closeSettings();
    // 简单的保存成功提示
    var toast = document.createElement('div');
    toast.textContent = '设置已保存';
    toast.style.cssText = 'position:fixed;top:20px;right:20px;background:var(--toast-success);color:var(--text-on-primary,var(--text-on-primary,#fff));padding:10px 20px;border-radius:6px;font-size:14px;z-index:10001;box-shadow:0 4px 12px rgba(0,0,0,0.15);transition:opacity 0.3s;';
    document.body.appendChild(toast);
    setTimeout(function() { toast.style.opacity = '0'; }, 1500);
    setTimeout(function() { toast.remove(); }, 1800);
  }

  export function testApiConnection() {
    var input = document.getElementById('settingsApiServer');
    var resultEl = document.getElementById('settingsTestResult');
    if (!input || !resultEl) return;

    var url = input.value.trim().replace(/\/+$/, '');
    if (!url) {
      resultEl.classList.remove('ft-c-danger','ft-c389e0d','ft-c-warning','ft-c999'); resultEl.classList.add('ft-c-warning');
      resultEl.textContent = '请输入API地址';
      return;
    }

    resultEl.classList.remove('ft-c-danger','ft-c389e0d','ft-c-warning','ft-c999'); resultEl.classList.add('ft-c999');
    resultEl.textContent = '测试中...';

    var testUrl = url + '/api/health';
    var xhr = new XMLHttpRequest();
    xhr.timeout = 5000;

    xhr.onload = function() {
      if (xhr.status >= 200 && xhr.status < 300) {
        resultEl.classList.remove('ft-c-danger','ft-c389e0d','ft-c-warning','ft-c999'); resultEl.classList.add('ft-c389e0d');
        resultEl.textContent = '\u2705 连接成功 (' + (xhr.response ? JSON.parse(xhr.response).version || '' : '') + ')';
      } else {
        resultEl.classList.remove('ft-c-danger','ft-c389e0d','ft-c-warning','ft-c999'); resultEl.classList.add('ft-c-danger');
        resultEl.textContent = '\u274C 连接失败 (HTTP ' + xhr.status + ')';
      }
    };

    xhr.onerror = function() {
      resultEl.classList.remove('ft-c-danger','ft-c389e0d','ft-c-warning','ft-c999'); resultEl.classList.add('ft-c-danger');
      resultEl.textContent = '\u274C 无法连接，请检查地址和网络';
    };

    xhr.ontimeout = function() {
      resultEl.classList.remove('ft-c-danger','ft-c389e0d','ft-c-warning','ft-c999'); resultEl.classList.add('ft-c-warning');
      resultEl.textContent = '\u23F0 连接超时 (5s)';
    };

    try {
      xhr.open('GET', testUrl, true);
      xhr.send();
    } catch(e) {
      resultEl.classList.remove('ft-c-danger','ft-c389e0d','ft-c-warning','ft-c999'); resultEl.classList.add('ft-c-danger');
      resultEl.textContent = '\u274C 请求异常: ' + e.message;
    }
  }

  export function updateSettingsStatus() {
    var statusEl = document.getElementById('settingsStatus');
    if (!statusEl) return;

    var apiServer = getApiServer();
    var html = '<div>API地址: <span style="color:' + (apiServer ? 'var(--text-primary,#333)' : 'var(--text-muted,#999)') + ';">' + (apiServer || '未配置（同源模式）') + '</span></div>';
    html += '<div>存储方式: LocalStorage</div>';

    // 检查是否有数据
    try {
      var allData = DataStore.loadAll();
      var keys = Object.keys(allData);
      html += '<div>已存储数据: ' + keys.length + ' 份</div>';
    } catch(e) {
      html += '<div>已存储数据: 未知</div>';
    }

    statusEl.innerHTML = html;
  }

  // ===== 将函数暴露到全局 =====
  window.openSettings = openSettings;
    window.saveSettings = saveSettings;
    window.testApiConnection = testApiConnection;
    window.initDropZone = initDropZone;
    window.processFileWithValidation = processFileWithValidation;
    window.validateExcelContent = validateExcelContent;
    window.validateExcelFile = validateExcelFile;
    window.renderPreviewModal = renderPreviewModal;
    window.showValidationErrors = showValidationErrors;
  window.closeSettings = closeSettings;

  // ===== DOM Ready后初始化 =====
  export function initValidation() {
    initDropZone();
  }

// file.js - ES Module
import { state, $, DataStore } from './core';
const XLSX = window.XLSX;
import { parseExcelFile, parseDateFromFilename } from './parser';

  // ===== FILE HANDLING =====
  function handleFile(file) {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'csv'].includes(ext)) {
      window.showToast('仅支持 .xlsx 或 .csv 文件', 'error');
      return;
    }
    window.showLoading(true);
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        let workbook;
        if (ext === 'csv') {
          workbook = XLSX.read(e.target.result, { type: 'string', codepage: 936 });
        } else {
          workbook = XLSX.read(e.target.result, { type: 'binary' });
        }
        const merchantData = parseExcelFile(workbook);
        const date = parseDateFromFilename(file.name);
        const availableTypes = Object.keys(merchantData);

        // 默认用全量，若无全量则用第一个
        if (!merchantData[state.currentMerchant] && availableTypes.length > 0) {
          state.currentMerchant = availableTypes[0];
        }

        state.merchantData = merchantData;
        state.currentData = {
          date,
          cities: merchantData[state.currentMerchant].cities,
          fileName: file.name
        };

        DataStore.save(date, { currentData: state.currentData, merchantData: state.merchantData, currentMerchant: state.currentMerchant });
        window.onDataLoaded();
        renderHistory();
        window.renderMerchantSelector();

        $('#syncPanel').style.display = 'none';
        $('#uploadSuccess').style.display = 'block';
        $('#uploadFileName').textContent = '已加载: ' + file.name;
        const cityCount = state.currentData.cities.length;
        const typeCount = availableTypes.length;
        $('#uploadFileInfo').textContent = date + ' / ' + cityCount + '城市 / ' + typeCount + '种商家';
      } catch (err) {
        window.showToast('解析失败: ' + err.message, 'error');
        console.error(err);
      } finally {
        window.showLoading(false);
      }
    };
    reader.onerror = function() {
      window.showToast('文件读取失败，请重试', 'error');
      window.showLoading(false);
    };
    if (ext === 'csv') {
      reader.readAsText(file, 'GBK');
    } else {
      reader.readAsBinaryString(file);
    }
  }

  // ===== 重新上传 =====
  function reupload() {
    $('#fileInput').value = '';
    $('#fileInput').click();
  }

  // ===== 历史数据管理 =====

  function renderHistory() {
    const all = DataStore.loadAll();
    const keys = Object.keys(all).sort().reverse();
    const historyEl = $('#historyList');
    if (keys.length === 0) {
      historyEl.innerHTML = '';
      return;
    }
    let html = '';
    for (const date of keys) {
      const item = all[date];
      const fileName = item.fileName || date;
      const isCurrent = state.currentData && state.currentData.date === date;
      html += '<div class="ft-detail-file-header">';
      html += '<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;' + (isCurrent ? 'color:var(--primary);font-weight:600;' : 'color:var(--text-secondary);') + '" title="' + fileName + '">' + date + '</span>';
      if (!isCurrent) {
        html += '<button onclick="deleteHistory(\'' + date + '\')" style="margin-left:4px;padding:2px 6px;background:none;border:1px solid var(--danger);border-radius:3px;color:var(--danger);cursor:pointer;font-size:10px;flex-shrink:0;">删除</button>';
      }
      html += '</div>';
    }
    historyEl.innerHTML = html;
  }

  function deleteHistory(date) {
    if (typeof showConfirm === 'function') { window.showConfirm('确定删除 ' + date + ' 的数据？').then(function(ok){ if(ok) deleteHistory(date); }); return; }
    if (!confirm('确定删除 ' + date + ' 的数据？')) return;
    DataStore.remove(date);
    renderHistory();
    window.updateDateSelector();
    if (state.currentData && state.currentData.date === date) {
      state.currentData = null;
      $('#welcomeState').classList.remove('hidden');
      $('#dashboardState').classList.add('hidden');
    }
  }



// ===== ES Module Exports =====
export { handleFile, reupload, renderHistory, deleteHistory };
// 注意：showConfirm和showLoading/ToastManager等通过参数传入或后续在main.js中处理

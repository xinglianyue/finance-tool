// sync.js - ES Module
import { state, $, DataStore, safeLog, CHART_COLORS } from './core';
import { displayName } from './utils';
import { renderRawData, renderMerchantSelector } from './app';
import { onDataLoaded } from './ui';

  // ===== CLOUD DATA MODULE (Team Sharing via GitHub Repo) =====
  var CloudData = (function() {
  
    var SHARED_URL = './shared-data.json';
    var GITHUB_API = 'https://api.github.com/repos/xinglianyue/finance-tool/contents/shared-data.json';
    var GITHUB_TOKEN = localStorage.getItem('github_token') || '';  // 需要配置 token 才能写入
    var cache = null;
    var cacheTime = 0;
    var CACHE_TTL = 30000;

    function buildPayload(date, currentData, merchantData, currentMerchant) {
      return JSON.stringify({
        date: date,
        updatedAt: new Date().toISOString(),
        uploadedBy: 'team',
        currentData: {
          date: currentData.date,
          cities: currentData.cities.map(function(c) { return { name: c.name, displayName: c.displayName, modules: c.modules }; }),
          fileName: currentData.fileName
        },
        merchantData: Object.keys(merchantData || {}).reduce(function(acc, key) {
          acc[key] = {
            label: merchantData[key].label,
            cities: merchantData[key].cities.map(function(c) { return { name: c.name, displayName: c.displayName, modules: c.modules }; })
          };
          return acc;
        }, {}),
        currentMerchant: currentMerchant
      }, null, 2);
    }

    function push(date, currentData, merchantData, currentMerchant) {
      // 已禁用：数据同步统一由db-sync.py自动完成，无需前端手动推送
    }

    function pull(callback) {
      var now = Date.now();
      if (cache && (now - cacheTime) < CACHE_TTL) {
        safeLog('info', '[CloudData] Using cache, age:', (now - cacheTime) / 1000, 's');
        if (callback) callback(cache);
        return;
      }
      safeLog('info', '[CloudData] Pulling from GitHub...');
      fetch(SHARED_URL + '?t=' + now)
        .then(function(res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return res.json();
        })
        .then(function(data) {
          if (data) {
            cache = data;
            cacheTime = Date.now();
            var count = Array.isArray(data) ? data.length : 1;
            safeLog('info', '[CloudData] Pulled from GitHub, records:', count);
            if (callback) callback(data);
          } else {
            safeLog('info', '[CloudData] No valid data yet');
          }
        })
        .catch(function(err) {
          safeLog('info', '[CloudData] Pull failed:', err.message);
        });
    }

    function load() {
      pull(function(data) {
        // 兼容数组和单对象两种格式（db-sync推送的是数组）
        var record = Array.isArray(data) ? data[data.length - 1] : data;
        if (record && record.currentData && record.currentData.cities && record.currentData.cities.length > 0) {
          state.currentData = record.currentData;
          state.merchantData = record.merchantData || { all: { label: '全量商家', cities: record.currentData.cities } };
          state.currentMerchant = record.currentMerchant || 'all';
          // 将所有记录存入DataStore
          if (Array.isArray(data)) {
            var allData = DataStore.loadAll();
            data.forEach(function(r) {
              if (r && r.currentData && r.currentData.date) {
                allData[r.currentData.date] = r;
              }
            });
            localStorage.setItem(DataStore.KEY, JSON.stringify(allData));
          }
          onDataLoaded();
          renderRawData();
          renderMerchantSelector();
          $('#syncPanel').style.display = 'none';
          $('#uploadSuccess').style.display = 'block';
          $('#uploadFileName').textContent = '已加载云端数据: ' + (state.currentData.fileName || record.date);
          $('#uploadFileInfo').textContent = record.date + ' / ' + (state.currentData.cities.length) + '城市';
        }
      });
    }

    return { push: push, pull: pull, load: load };
  })()

  // ===== API服务同步 =====
  var API_SERVER = window.__API_SERVER || '';  // 默认空=同源，可配置为 http://192.168.0.12:8899
  var API_KEY = localStorage.getItem('finance_tool_api_key') || '';  // API认证密钥，通过设置面板配置

  function startSync() {
    if (location.protocol === 'file:') {
      console.warn('[sync] file://协议不支持同步功能');
      return;
    }
    var btn = document.getElementById('syncBtn');
    var result = document.getElementById('syncResult');
    var logEl = document.getElementById('syncLog');

    var dateInput = document.getElementById('syncDateInput').value.trim();
    result.style.display = 'block';
    result.style.background = CHART_COLORS.grid;
    result.classList.remove('ft-c-success','ft-c-danger'); result.classList.add('ft-c-danger');
    result.textContent = '正在连接API服务...';
    btn.disabled = true;
    btn.textContent = '同步中...';

    var apiUrl = API_SERVER + '/api/sync';
    var headers = { 'Content-Type': 'application/json' };
      if (API_KEY) headers['X-API-Key'] = API_KEY;
      fetch(apiUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ date: dateInput }),
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.ok) {
        result.style.background = CHART_COLORS.successLt;
        result.classList.remove('ft-c-success','ft-c-danger'); result.classList.add('ft-c-success');
        result.textContent = data.message || '同步任务已启动';
        logEl.style.display = 'block';
        pollSyncStatus(logEl);
      } else {
        result.style.background = CHART_COLORS.dangerLt;
        result.classList.remove('ft-c-success','ft-c-danger'); result.classList.add('ft-c-danger');
        result.textContent = '错误: ' + (data.error || '未知错误');
        btn.disabled = false;
        btn.textContent = '同步数据';
      }
    })
    .catch(function(err) {
      result.style.background = CHART_COLORS.dangerLt;
      result.classList.remove('ft-c-success','ft-c-danger'); result.classList.add('ft-c-danger');
      result.textContent = '无法连接API服务。请确认api_server.py已启动。';
      logEl.style.display = 'block';
      logEl.innerHTML = '<div class="ft-c-danger">连接失败: ' + err.message + '</div>' +
        '<div class="ft-mt4">请在技术人员电脑上运行: python api_server.py</div>';
      btn.disabled = false;
      btn.textContent = '同步数据';
    });
  }

  function pollSyncStatus(logEl) {
    var checkCount = 0;
    var maxChecks = 120;  // 最多等2分钟

    function check() {
      checkCount++;
      if (checkCount > maxChecks) {
        logEl.innerHTML += '<div class="ft-sync-warn">等待超时，请稍后刷新页面查看结果</div>';
        var btn = document.getElementById('syncBtn');
        btn.disabled = false;
        btn.textContent = '同步数据';
        return;
      }

      var _h = {}; if (API_KEY) _h['X-API-Key'] = API_KEY;
      fetch(API_SERVER + '/api/status', { headers: _h })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (!data.running && data.last_result) {
            // 同步完成
            var r = data.last_result;
            if (r.ok) {
              logEl.innerHTML += '<div style="color:var(--success);">同步完成! 日期: ' + r.date + 
                ', ' + r.cities + '个城市, 共' + r.records + '期数据</div>';
              logEl.innerHTML += '<div class="ft-sync-sec">正在刷新页面数据...</div>';
              // 刷新前端数据
              setTimeout(function() {
                CloudData.load();
              }, 2000);
            } else {
              logEl.innerHTML += '<div class="ft-c-danger">同步失败: ' + (r.error || '未知错误') + '</div>';
            }
            var btn = document.getElementById('syncBtn');
            btn.disabled = false;
            btn.textContent = '同步数据';
          } else if (data.running) {
            logEl.innerHTML = '<div>同步进行中，请稍候... (' + checkCount + 's)</div>';
            setTimeout(check, 1000);
          } else if (data.last_error) {
            logEl.innerHTML += '<div class="ft-c-danger">同步异常: ' + data.last_error + '</div>';
            var btn = document.getElementById('syncBtn');
            btn.disabled = false;
            btn.textContent = '同步数据';
          } else {
            setTimeout(check, 1000);
          }
        })
        .catch(function() {
          setTimeout(check, 2000);
        });
    }

    setTimeout(check, 3000);  // 等3秒后开始检查
  }

  function checkApiStatus() {
    if (location.protocol === 'file:') {
      console.warn('[sync] file://协议不支持API检测');
      var result = document.getElementById('syncResult');
      if (result) { result.textContent = 'file://模式不可用'; result.className = 'ft-c-sec2'; }
      return;
    }
    var result = document.getElementById('syncResult');
    var logEl = document.getElementById('syncLog');

    result.style.display = 'block';
    result.style.background = CHART_COLORS.grid;
    result.classList.remove('ft-c-success','ft-c-danger'); result.classList.add('ft-c-danger');

    fetch(API_SERVER + '/api/status')
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data.error) {
          result.style.background = CHART_COLORS.dangerLt;
          result.classList.remove('ft-c-success','ft-c-danger'); result.classList.add('ft-c-danger');
          result.textContent = 'API服务未连接';
          logEl.style.display = 'block';
          logEl.innerHTML = '<div class="ft-c-danger">无法连接API服务</div>' +
            '<div>请在技术人员电脑上运行: python api_server.py</div>';
        } else {
          result.style.background = CHART_COLORS.successLt;
          result.classList.remove('ft-c-success','ft-c-danger'); result.classList.add('ft-c-success');
          var statusText = 'API服务正常 | 版本: ' + (data.version || '1.0');
          if (data.last_time) statusText += ' | 上次同步: ' + data.last_time;
          if (data.last_result && data.last_result.ok) {
            statusText += ' | 最近: ' + (data.last_result.date || '') + ' 成功';
          } else if (data.last_result) {
            statusText += ' | 最近同步失败: ' + (data.last_result.error || '');
          }
          result.textContent = statusText;

          // 检查自动检测日期
          var _h2 = {}; if (API_KEY) _h2['X-API-Key'] = API_KEY;
        fetch(API_SERVER + '/api/auto-date', { headers: _h2 })
            .then(function(r) { return r.json(); })
            .then(function(d) {
              if (d.ok) {
                var dateInput = document.getElementById('syncDateInput');
                if (!dateInput.value) {
                  dateInput.placeholder = '自动检测到: ' + d.date + ' (' + d.count + '条)';
                }
                logEl.style.display = 'block';
                logEl.innerHTML = '<div>数据库可用日期: ' + d.date + ' (' + d.count + '条记录)</div>';
              }
            })
            .catch(function() {});
        }
      })
      .catch(function(err) {
        result.style.background = CHART_COLORS.dangerLt;
        result.classList.remove('ft-c-success','ft-c-danger'); result.classList.add('ft-c-danger');
        result.textContent = '无法连接API服务';
        logEl.style.display = 'block';
        logEl.innerHTML = '<div class="ft-c-danger">连接失败: ' + err.message + '</div>' +
          '<div class="ft-mt4">请在技术人员电脑上运行: python api_server.py</div>';
      });
  }

  // 页面加载时自动检查API状态
  setTimeout(checkApiStatus, 2000);
;




// ===== ES Module Exports =====
export { CloudData, startSync, pollSyncStatus, checkApiStatus };
export { API_SERVER, API_KEY };

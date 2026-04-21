
  function clearCurrentData() {
    var fn = document.getElementById('uploadFileName');
    var date = fn ? fn.textContent.trim() : '';
    if (!date || !confirm('确定清除 ' + date + ' 的数据？')) return;
    if (typeof DataStore !== 'undefined') DataStore.remove(date);
    var ua = document.getElementById('uploadArea');
    var us = document.getElementById('uploadSuccess');
    var ws = document.getElementById('welcomeState');
    var ds = document.getElementById('dashboardState');
    if (ua) ua.style.display = '';
    if (us) us.style.display = 'none';
    if (ws) ws.classList.remove('hidden');
    if (ds) ds.classList.add('hidden');
    if (typeof updateDateSelector === 'function') updateDateSelector();
    if (typeof renderHistory === 'function') renderHistory();
  }

(function() {
  'use strict';
  // ===== CONFIG =====
  
// 处理文件协议安全限制
if (window.location.protocol === 'file:') {
  console.log('当前使用file://协议，可能存在安全限制');
  // 禁用某些需要安全上下文的功能
  window.DISABLE_CROSS_ORIGIN = true;
  // 提供友好的错误提示
  window.showSecurityWarning = function() {
    const warning = document.createElement('div');
    warning.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: #f59e0b;
      color: white;
      padding: 10px 15px;
      border-radius: 5px;
      z-index: 9999;
      font-family: sans-serif;
      font-size: 14px;
    `;
    warning.innerHTML = `
      <strong>⚠️ 安全提示</strong><br>
      当前使用本地文件协议，某些功能可能受限。<br>
      建议使用本地服务器打开此文件。
    `;
    document.body.appendChild(warning);
    // 5秒后自动消失
    setTimeout(() => {
      if (warning.parentNode) {
        warning.parentNode.removeChild(warning);
      }
    }, 5000);
  };
  // 页面加载后显示警告
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      window.showSecurityWarning();
      setupXLSXErrorHandling();
    });
  } else {
    window.showSecurityWarning();
  }
}
const CONFIG = {
    UE_THRESHOLDS: {
      DANGER: 0,       // UE < 0 → 严重（亏损）
      WARN_LOW: 0,      // 0 <= UE < 0.5 → 预警
      WARN_HIGH: 0.5,
    },
    SUBSIDY_RATIO_THRESHOLDS: {
      WARN_LOW: 0.35,   // 35%~45% → 预警
      DANGER: 0.45,     // > 45% → 严重
    },
    CITY_DISPLAY_MAP: {
      '承德市': '承德',
      '围场满族蒙古族自治县': '围场',
      '玉田县': '玉田',
      '安国市': '安国',
      '安平': '安平',
      '献县': '献县',
      '晋州': '晋州',
      '威县': '威县',
      '深泽县': '深泽',
      '康保县': '康保'
    },
    // Data block offsets for "全量商家" sheet
    BLOCKS: [
      { key: 'all',   name: '全品类' },
      { key: 'food',  name: '餐饮' },
      { key: 'flash', name: '闪购' },
      { key: 'medicine', name: '医药' },
      { key: 'group', name: '拼好饭' }
    ],
    // Row offsets relative to block start
    ROWS: {
      ordersTotal: 10,
      revenueTotal: 32,
      subsidyTotal: 36,
      expenseTotal: 73,
      profit: 74,
    },
  
    MODULES: ['全品类', '餐饮', '闪购', '医药', '拼好饭'],
    MODULE_KEYS: {
      '全品类': 'all',
      '餐饮': 'food',
      '闪购': 'flash',
      '医药': 'medicine',
      '拼好饭': 'group'
    },
    MODULE_COLORS: {
      '全品类': '#667eea',
      '餐饮': '#10b981',
      '闪购': '#f59e0b',
      '医药': '#8b5cf6',
      '拼好饭': '#ef4444'
    },
  };
  // ===== STATE =====
  let state = {
    currentData: null,
    merchantData: {},      // { all: {label, cities:[...], ka: {...}, city: {...}} }
    currentMerchant: 'all',// 'all' | 'city' | 'ka'
    allData: {},
    selectedCities: new Set(),
    currentTab: 'overview',
    detailCity: null,
    detailModule: 'all',
  };
  // ===== DOM REFS =====
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);
  // ===== DATA STORAGE =====

  // ===== CLOUD SYNC - GitHub Issues API =====
  const CloudSync = {
    API: 'https://api.github.com/repos/xinglianyue/finance-tool/issues',
    LABEL: 'deploy-data',
    TOKEN_KEY: 'github-token',
    GITHUB_TOKEN: '',

    init() {
      this.GITHUB_TOKEN = localStorage.getItem(this.TOKEN_KEY) || '';
    },

    getToken() {
      return localStorage.getItem(this.TOKEN_KEY) || '';
    },

    setToken(token) {
      localStorage.setItem(this.TOKEN_KEY, token);
      this.GITHUB_TOKEN = token;
    },

    hasToken() {
      return !!this.getToken();
    },

    HEADERS() {
      const h = { 'Accept': 'application/vnd.github.v3+json' };
      const t = this.getToken();
      if (t) h['Authorization'] = 'token ' + t;
      return h;
    },

    // gzip压缩
    gzipCompress(str) {
      const encoder = new TextEncoder();
      const data = encoder.encode(str);
      const cs = new CompressionStream('gzip');
      const writer = cs.writable.getWriter();
      writer.write(data);
      writer.close();
      return new Response(cs.readable).arrayBuffer().then(buf => {
        const bytes = new Uint8Array(buf);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        return btoa(binary);
      });
    },

    // gzip解压
    async gzipDecompress(base64) {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const cs = new DecompressionStream('gzip');
      const writer = cs.writable.getWriter();
      writer.write(bytes);
      writer.close();
      const resp = new Response(cs.readable);
      const text = await resp.text();
      return text;
    },

    // 精简数据：去掉衍生指标
    makeSlim(data) {
      const slim = JSON.parse(JSON.stringify(data));
      const derived = ['moduleName','moduleKey','ue','subsidyRatio','profitRate',
        'avgRevenuePerOrder','avgCostPerOrder','deliveryCostRate','fixedCostRate',
        'subsidyRateB','subsidyRateC','enterpriseRatio','selfRatio'];
      for (const mt of Object.values(slim)) {
        for (const city of (mt.cities || [])) {
          for (const mod of Object.values(city.modules || {})) {
            for (const k of derived) delete mod[k];
          }
        }
      }
      return slim;
    },

    // 恢复衍生指标
    restoreDerived(data) {
      for (const mt of Object.values(data)) {
        for (const city of (mt.cities || [])) {
          for (const mod of Object.values(city.modules || {})) {
            const o = mod.orders || 0;
            const safe = (a, b) => b ? a / b : 0;
            mod.ue = safe(mod.profit || 0, o);
            mod.subsidyRatio = safe(mod.subsidyTotal || 0, mod.gmvAmount || 0);
            mod.profitRate = safe(mod.profit || 0, mod.totalRevenue || 0);
            mod.avgRevenuePerOrder = safe(mod.onlineRevenue || 0, o);
            mod.avgCostPerOrder = safe((mod.onlineExpense || 0) + (mod.offlineExpense || 0), o);
            mod.deliveryCostRate = safe(mod.deliveryCost || 0, mod.onlineRevenue || 0);
            mod.fixedCostRate = safe(mod.fixedCost || 0, mod.onlineRevenue || 0);
            mod.subsidyRateB = safe(mod.subsidyB || 0, mod.gmvAmount || 0);
            mod.subsidyRateC = safe(mod.subsidyC || 0, mod.gmvAmount || 0);
            mod.enterpriseRatio = safe(mod.enterpriseOrders || 0, o);
            mod.selfRatio = safe(mod.selfOrders || 0, o);
          }
        }
      }
      return data;
    },

    // 上传单期数据到云端
    async upload(date, merchantData) {
      try {
        const slim = this.makeSlim(merchantData);
        const json = JSON.stringify(slim);
        const b64 = await this.gzipCompress(json);
        const body = '<!-- finance-tool-data-snapshot -->\n\n'
          + '| Key | Value |\n|---|---|\n'
          + '| date | ' + date + ' |\n'
          + '| size | ' + json.length.toLocaleString() + ' bytes |\n'
          + '| built | ' + new Date().toISOString() + ' |\n\n'
          + '```base64\n' + b64 + '\n```';
        const title = 'data-' + date;

        // 先查是否已存在
        const listResp = await fetch(this.API + '?labels=' + this.LABEL + '&state=all&per_page=100', { headers: this.HEADERS() });
        const issues = await listResp.json();
        const existing = issues.find(i => i.title === title);

        if (existing) {
          const r = await fetch(this.API + '/' + existing.number, {
            method: 'PATCH', headers: this.HEADERS(),
            body: JSON.stringify({ body: body })
          });
          if (r.ok) console.log('[CloudSync] 更新云端:', date);
          else console.warn('[CloudSync] 更新失败:', r.status);
        } else {
          const r = await fetch(this.API, {
            method: 'POST', headers: this.HEADERS(),
            body: JSON.stringify({ title: title, body: body, labels: [this.LABEL] })
          });
          if (r.ok) console.log('[CloudSync] 上传云端:', date);
          else console.warn('[CloudSync] 上传失败:', r.status);
        }
      } catch(e) {
        console.warn('[CloudSync] 上传异常:', e);
      }
    },

    // 从云端拉取所有数据（公开仓库无需token）
    async pullAll() {
      try {
        let allData = {};
        let page = 1;
        while (true) {
          const r = await fetch(this.API + '?labels=' + this.LABEL + '&state=all&per_page=100&page=' + page, {
            headers: { 'Accept': 'application/vnd.github.v3+json' }
          });
          const issues = await r.json();
          if (!issues || issues.length === 0) break;
          for (const issue of issues) {
            const m = issue.body && issue.body.match(/```base64\n([\s\S]*?)\n```/);
            if (!m) continue;
            try {
              const json = await this.gzipDecompress(m[1].trim());
              const slim = JSON.parse(json);
              const data = this.restoreDerived(slim);
              const date = issue.title.replace('data-', '');
              allData[date] = {
                currentData: {
                  date: date,
                  cities: data.all ? data.all.cities : [],
                  fileName: '云端-' + date
                },
                merchantData: data,
                currentMerchant: 'all'
              };
            } catch(e) {
              console.warn('[CloudSync] 解码失败:', issue.title, e);
            }
          }
          if (issues.length < 100) break;
          page++;
        }
        console.log('[CloudSync] 拉取云端数据:', Object.keys(allData).length, '期');
        return allData;
      } catch(e) {
        console.warn('[CloudSync] 拉取异常:', e);
        return {};
      }
    },

    // 同步到本地 DataStore
    async syncToLocal() {
      const cloudData = await this.pullAll();
      if (Object.keys(cloudData).length === 0) return 0;
      const local = DataStore.loadAll();
      let newCount = 0;
      for (const [date, entry] of Object.entries(cloudData)) {
        if (!local[date] || !local[date].merchantData) {
          local[date] = entry;
          newCount++;
        }
      }
      if (newCount > 0) {
        localStorage.setItem(DataStore.KEY, JSON.stringify(local));
        console.log('[CloudSync] 同步到本地:', newCount, '期新数据');
      }
      return newCount;
    }
  }


  // Token设置弹窗
  function showTokenHint() {
    const hint = document.getElementById('tokenHint');
    if (hint) hint.style.display = 'flex';
  }

  function hideTokenHint() {
    const hint = document.getElementById('tokenHint');
    if (hint) hint.style.display = 'none';
  }

  function saveToken() {
    const input = document.getElementById('tokenInput');
    const token = input ? input.value.trim() : '';
    if (!token) { alert('请输入Token'); return; }
    // 验证token有效性
    fetch('https://api.github.com/user', { headers: { 'Authorization': 'token ' + token } })
      .then(r => {
        if (r.ok) return r.json();
        throw new Error('Token无效');
      })
      .then(user => {
        CloudSync.setToken(token);
        hideTokenHint();
        // 重新同步当前数据到云端
        if (state.currentData && state.merchantData) {
          CloudSync.upload(state.currentData.date, state.merchantData);
        }
        alert('Token设置成功（用户: ' + user.login + '），数据正在同步到云端');
      })
      .catch(e => {
        alert('Token验证失败: ' + e.message + '\n\n请确保:\n1. 在 github.com/settings/tokens 生成\n2. 勾选 repo 权限\n3. Token未过期');
      });
  }

  function showTokenSettings() {
    const current = CloudSync.getToken();
    const mask = current ? current.substring(0, 8) + '...' + current.substring(current.length - 4) : '未设置';
    const input = document.getElementById('tokenInput');
    if (input) input.value = current || '';
    if (current) {
      // 验证当前token
      fetch('https://api.github.com/user', { headers: { 'Authorization': 'token ' + current } })
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(u => document.getElementById('tokenStatus').textContent = '当前: ' + u.login + ' (' + mask + ')')
        .catch(() => document.getElementById('tokenStatus').textContent = '当前Token已失效: ' + mask);
    } else {
      document.getElementById('tokenStatus').textContent = '未设置Token，数据将仅保存在本地';
    }
    showTokenHint();
  };

  const DataStore = {
    KEY: 'finance-tool-v9',
    save(date, data) {
      const all = this.loadAll();
      all[date] = data;
      localStorage.setItem(this.KEY, JSON.stringify(all));
    },
    loadAll() {
      try { return JSON.parse(localStorage.getItem(this.KEY)) || {}; }
      catch { return {}; }
    },
    remove(date) {
      const all = this.loadAll();
      delete all[date];
      localStorage.setItem(this.KEY, JSON.stringify(all));
    }
  };
  // ===== UTILITY =====
  function num(v) {
    if (v === null || v === undefined || v === '' || v === '-') return 0;
    const n = parseFloat(String(v).replace(/,/g, ''));
    return isNaN(n) ? 0 : n;
  }
  function fmtWan(n) {
    const abs = Math.abs(n);
    if (abs >= 100000000) return (n / 100000000).toFixed(2) + '亿';
    if (abs >= 10000) return (n / 10000).toFixed(2) + '万';
    return n.toLocaleString('zh-CN', { maximumFractionDigits: 0 });
  }
  function fmtUE(n) {
    if (n === 0 && arguments.length === 1) return '-';
    return n.toFixed(2);
  }
  function fmtPct(n) {
    return (n * 100).toFixed(1) + '%';
  }
  function fmtInt(n) {
    return Math.round(n).toLocaleString('zh-CN');
  }
  function displayName(excelName) {
    return CONFIG.CITY_DISPLAY_MAP[excelName] || excelName;
  }
  // ===== EXCEL PARSER =====
  function parseExcelFile(workbook) {
    const MERCHANT_TYPES = [
      { sheetName: '全量商家', key: 'all', label: '全量商家' },
      { sheetName: '城市商家', key: 'city', label: '城市商家' },
      { sheetName: 'KA商家', key: 'ka', label: 'KA商家' }
    ];

    // 字段匹配规则: [col2Or3值, col4值, 字段名]
    const FIELD_RULES = [
      ['', '订单量汇总',        'orders'],
      ['', '加盟订单量',        'franchiseOrders'],
      ['', '自配订单量',        'selfOrders'],
      ['', '企客订单量',        'enterpriseOrders'],
      ['', '原价交易额汇总',    'gmvAmount'],
      ['', '加盟原价交易额',    'franchiseGMV'],
      ['', '自配原价交易额',    'selfGMV'],
      ['', '抽佣金额汇总',      'commission'],
      ['', '配送费汇总',        'deliveryFee'],
      ['', '其他收入汇总',      'otherRevenue'],
      ['', '代补金额花费汇总',  'subsidyTotal'],
      ['', 'B端代补金额',       'subsidyB'],
      ['', 'C端代补金额',       'subsidyC'],
      ['', '账单-代补差额',     'subsidyDiff'],
      ['', '平台成本汇总',      'platformCost'],
      ['', '固定成本汇总',      'fixedCost'],
      ['', '配送成本汇总',      'deliveryCost'],
      ['', '加盟邮资',          'franchiseDelivery'],
      ['', '普众众包邮资',      'crowdDelivery'],
      ['', '悦跑邮资',          'yuepaoDelivery'],
      ['', '众包天气补贴',      'weatherSubsidy'],
      ['', '加盟单均邮资',      'franchiseAvgPostage'],
      ['', '加盟承接订单量',    'franchiseDeliverOrders'],
      ['', '附加成本汇总',      'additionalCost']
    ];

    const COL2_RULES = { '毛利': 'profit', '收入汇总': 'totalRevenue', '支出汇总': 'totalExpense' };
    const COL3_RULES = { '线上收入汇总': 'onlineRevenue', '线上支出汇总': 'onlineExpense', '线下支出汇总': 'offlineExpense' };

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

        FIELD_RULES.forEach(([k23, k4, field]) => {
          if (k4 && c4 === k4 && result[field] === 0 && val !== 0) result[field] = val;
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
      result.avgCostPerOrder = o > 0 ? (result.onlineExpense + result.offlineExpense) / o : 0;
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
      if (!ws) { console.log('[parseExcelFile] sheet未找到:', mt.sheetName); continue; }
      console.log('[parseExcelFile] 开始解析:', mt.sheetName);

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

      console.log('[parseExcelFile]', mt.sheetName, '模块数:', Object.keys(modulePositions).length, Object.keys(modulePositions));
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

    console.log('[parseExcelFile] 解析结果:', Object.keys(merchantData));
    Object.entries(merchantData).forEach(([k,v]) => console.log('  ', k, '城市:', v.cities.map(c=>c.name)));
    if (Object.keys(merchantData).length === 0) {
      throw new Error('未识别到任何商家类型数据，请确认文件格式正确');
    }
    return merchantData;
  }
  function parseDateFromFilename(filename) {
    const patterns = [
      /(\d{4})[-_]?(\d{2})[-_]?(\d{2})/,
      /(\d{4})年(\d{1,2})月(\d{1,2})/,
    ];
    for (const p of patterns) {
      const m = filename.match(p);
      if (m) {
        const y = parseInt(m[1]), mo = parseInt(m[2]), d = parseInt(m[3]);
        const dt = new Date(y, mo - 1, d);
        if (!isNaN(dt.getTime())) {
          return `${y}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        }
      }
    }
    // Try to get from file date or use today
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  }
  // ===== ANOMALY DETECTION =====
  function getAnomalyLevel(ue, subsidyRatio) {
    if (ue === 0 && subsidyRatio === 0) return 'missing';
    const isDangerUE = ue < CONFIG.UE_THRESHOLDS.DANGER;
    const isWarnUE = ue >= CONFIG.UE_THRESHOLDS.WARN_LOW && ue <= CONFIG.UE_THRESHOLDS.WARN_HIGH;
    const isDangerSubsidy = subsidyRatio > CONFIG.SUBSIDY_RATIO_THRESHOLDS.DANGER;
    const isWarnSubsidy = subsidyRatio > CONFIG.SUBSIDY_RATIO_THRESHOLDS.WARN_LOW && subsidyRatio <= CONFIG.SUBSIDY_RATIO_THRESHOLDS.DANGER;
    if (isDangerUE || isDangerSubsidy) return 'danger';
    if (isWarnUE || isWarnSubsidy) return 'warning';
    return 'good';
  }
  function getDiagnosis(anomalyLevel, ue, subsidyRatio, moduleName) {
    const issues = [];
    if (ue < 0) issues.push('UE亏损');
    else if (anomalyLevel === 'warning' && ue <= 0.3) issues.push('UE偏低');
    if (subsidyRatio > 0.35) issues.push('补贴率过高');
    else if (subsidyRatio > 0.30) issues.push('补贴率偏高');
    if (issues.length === 0) return null;
    return `${moduleName}：${issues.join('，')}`;
  }
  // ===== FILE HANDLING =====
  function handleFile(file) {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'csv'].includes(ext)) {
      alert('仅支持 .xlsx 或 .csv 文件');
      return;
    }
    showLoading(true);
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
        // 自动同步到云端（需token）
        if (CloudSync.hasToken()) {
          CloudSync.upload(date, state.merchantData);
        } else {
          console.log('[CloudSync] 未设置GitHub Token，数据仅保存在本地');
          showTokenHint();
        }
        onDataLoaded();
        renderHistory();
        renderMerchantSelector();

        $('#uploadArea').style.display = 'none';
        $('#uploadSuccess').style.display = 'block';
        $('#uploadFileName').textContent = '已加载: ' + file.name;
        const cityCount = state.currentData.cities.length;
        const typeCount = availableTypes.length;
        $('#uploadFileInfo').textContent = date + ' / ' + cityCount + '城市 / ' + typeCount + '种商家';
      } catch (err) {
        alert('解析失败: ' + err.message);
        console.error(err);
      } finally {
        showLoading(false);
      }
    };
    reader.onerror = function() {
      alert('文件读取失败');
      showLoading(false);
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
      html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border);font-size:11px;">';
      html += '<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;' + (isCurrent ? 'color:var(--primary);font-weight:600;' : 'color:var(--text-secondary);') + '" title="' + fileName + '">' + date + '</span>';
      if (!isCurrent) {
        html += '<button onclick="deleteHistory(\'' + date + '\')" style="margin-left:4px;padding:2px 6px;background:none;border:1px solid #e74c3c;border-radius:3px;color:#e74c3c;cursor:pointer;font-size:10px;flex-shrink:0;">删除</button>';
      }
      html += '</div>';
    }
    historyEl.innerHTML = html;
  }

  function deleteHistory(date) {
    if (!confirm('确定删除 ' + date + ' 的数据？')) return;
    DataStore.remove(date);
    renderHistory();
    updateDateSelect();
    if (state.currentData && state.currentData.date === date) {
      state.currentData = null;
      showWelcome();
    }
  }

  // ===== UI RENDERERS =====
  function showToast(msg, type) {
    const toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;top:20px;right:20px;padding:12px 24px;border-radius:8px;color:#fff;font-size:14px;z-index:10000;transition:opacity 0.3s;';
    toast.style.background = type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#10b981';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
  }

    function showLoading(show) {
    $('#loadingOverlay').classList.toggle('show', show);
  }
  function onDataLoaded() {
    renderMerchantSelector();
    // Init selected cities
    state.selectedCities = new Set(state.currentData.cities.map(c => c.name));
    // Update date selector
    updateDateSelector();
    // Show dashboard
    $('#welcomeState').classList.add('hidden');
    $('#dashboardState').classList.remove('hidden');
    // Render
    renderCityFilters();
    renderStatCards();
    renderMatrix();
    renderAnomalyAlert();
    renderAnomalyTab();
    updateAnomalyBadge();
    // Init detail tab
    if (state.currentData.cities.length > 0 && !state.detailCity) {
      state.detailCity = state.currentData.cities[0].name;
    }
    updateDetailSelectors();
    renderDetailTab();
    renderRawData();
    renderCostStructure();
    // Update date display
    $('#dateDisplay').textContent = state.currentData.date;
  }
  function updateDateSelector() {
    const allData = DataStore.loadAll();
    const dates = Object.keys(allData).sort().reverse();
    const sel = $('#dateSelect');
    sel.innerHTML = '';
    for (const d of dates) {
      const opt = document.createElement('option');
      opt.value = d;
      opt.textContent = d + ' (' + (allData[d].fileName || '历史数据') + ')';
      if (state.currentData && state.currentData.date === d) opt.selected = true;
      sel.appendChild(opt);
    }
  }
  function renderCityFilters() {
    const container = $('#cityFilters');
    container.innerHTML = '';
    for (const city of state.currentData.cities) {
      const label = document.createElement('label');
      label.className = 'city-filter-item';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = city.name;
      cb.checked = state.selectedCities.has(city.name);
      cb.addEventListener('change', () => {
        if (cb.checked) state.selectedCities.add(city.name);
        else state.selectedCities.delete(city.name);
        refreshDashboard();
      });
      label.appendChild(cb);
      label.appendChild(document.createTextNode(city.displayName));
      container.appendChild(label);
    }
  }
  function getFilteredCities() {
    if (!state.currentData) return [];
    return state.currentData.cities.filter(c => state.selectedCities.has(c.name));
  }
  
  // ===== MERCHANT TYPE SWITCHER =====
  function renderMerchantSelector() {
    const container = $('#merchantSelector');
    const btnContainer = $('#merchantButtons');
    if (!container || !btnContainer) return;
    const types = Object.entries(state.merchantData);
    if (types.length <= 1) {
      container.style.display = 'none';
      return;
    }
    container.style.display = 'flex';
    btnContainer.innerHTML = types.map(([key, val]) =>
      '<button class="merchant-btn' + (key === state.currentMerchant ? ' active' : '') + '" data-merchant="' + key + '">' +
      val.label + '</button>'
    ).join('');
    btnContainer.querySelectorAll('.merchant-btn').forEach(btn => {
      btn.addEventListener('click', () => switchMerchant(btn.dataset.merchant));
    });
  }

  function switchMerchant(typeKey) {
    console.log('[switchMerchant] typeKey:', typeKey);
    if (!state.merchantData[typeKey]) { console.log('[switchMerchant] ERROR: merchantData[' + typeKey + '] not found'); return; }
    state.currentMerchant = typeKey;
    var cities = state.merchantData[typeKey].cities;
    console.log('[switchMerchant] cities count:', cities.length, 'first:', cities[0] ? cities[0].name : 'N/A');
    state.currentData = {
      date: state.currentData.date,
      cities: cities,
      fileName: state.currentData.fileName
    };
    state.selectedCities = new Set(cities.map(c => c.name));
    renderMerchantSelector();
    renderCityFilters();
    console.log('[switchMerchant] switching to tab:', state.currentTab || 'overview');
    // 刷新当前活跃Tab的数据
    switchTab(state.currentTab || 'overview');
  }

function refreshDashboard() {
    console.log('[refreshDashboard] cities:', state.currentData.cities.length, 'selected:', state.selectedCities.size);
    renderStatCards();
    renderMatrix();
    renderAnomalyAlert();
    renderAnomalyTab();
    updateAnomalyBadge();
    renderDetailTab();
  }
  // ===== TAB1: OVERVIEW =====
  function renderStatCards() {
    const cities = getFilteredCities();
    const modules = CONFIG.BLOCKS.map(b => b.key);
    const allCities = state.currentData ? state.currentData.cities : [];
    const totalBiz = allCities.find(c => c.name === '总商');
    const allMod = totalBiz ? totalBiz.modules['all'] : null;

    let totalOrders = allMod ? allMod.orders : 0;
    let totalProfit = allMod ? allMod.profit : 0;
    let totalSubsidy = allMod ? allMod.subsidyTotal : 0;

    const anomalies = { danger: 0, warning: 0, missing: 0 };
    for (const city of cities) {
      for (const mk of modules) {
        const m = city.modules[mk];
        if (!m) continue;
        const level = getAnomalyLevel(m.ue, m.subsidyRatio);
        anomalies[level] = (anomalies[level] || 0) + 1;
      }
    }
    const container = $('#statCards');
    container.innerHTML = `
      <div class="stat-card">
        <div class="label">总订单量</div>
        <div class="value">${fmtWan(totalOrders)}</div>
        <div class="sub-info">总商全品类</div>
      </div>
      <div class="stat-card">
        <div class="label">总毛利</div>
        <div class="value ${totalProfit < 0 ? 'danger' : 'success'}">${fmtWan(totalProfit)}</div>
        <div class="sub-info">单均UE ${totalOrders > 0 ? (totalProfit/totalOrders).toFixed(2) : '-'}元</div>
      </div>
      <div class="stat-card">
        <div class="label">代补总额</div>
        <div class="value">${fmtWan(totalSubsidy)}</div>
      </div>
      <div class="stat-card">
        <div class="label">异常城市数</div>
        <div class="anomaly-badges">
          ${anomalies.danger > 0 ? `<span class="anomaly-badge red">${anomalies.danger} 严重</span>` : ''}
          ${anomalies.warning > 0 ? `<span class="anomaly-badge yellow">${anomalies.warning} 预警</span>` : ''}
          ${anomalies.danger === 0 && anomalies.warning === 0 ? '<span class="anomaly-badge" style="background:var(--success-light);color:var(--success)">全部正常</span>' : ''}
        </div>
      </div>
    `;
  }
  function icon(l) { return l === 'danger' ? '<span style="color:var(--danger)">[严重]</span>' : '<span style="color:#e37400">[预警]</span>'; }

  function renderAnomalyAlert() {
    const cities = getFilteredCities();
    const items = [];
    for (const city of cities) {
      for (const block of CONFIG.BLOCKS) {
        const m = city.modules[block.key];
        if (!m) continue;
        const level = getAnomalyLevel(m.ue, m.subsidyRatio);
        if (level === 'danger' || level === 'warning') {
          const ueStr = m.ue < 0 ? fmtUE(m.ue) + '元(亏损)' : fmtUE(m.ue) + '元';
          items.push({
            level, city: city.displayName, module: block.name, ueStr,
            cityName: city.name, moduleKey: block.key
          });
        }
      }
    }
    const bar = $('#anomalyAlertBar');
    const container = $('#anomalyAlertItems');
    if (items.length === 0) {
      bar.style.display = 'none';
      return;
    }
    bar.style.display = 'block';
    container.innerHTML = items.map(item => `
      <div class="anomaly-alert-item" data-city="${item.cityName}" data-module="${item.moduleKey}">
        ${icon(item.level)} ${item.city} ${item.module} UE=${item.ueStr}
      </div>
    `).join('');
    container.querySelectorAll('.anomaly-alert-item').forEach(el => {
      el.addEventListener('click', () => {
        switchToDetail(el.dataset.city, el.dataset.module);
      });
    });
  }

function renderMatrix() {
    const cities = getFilteredCities();
    const table = $('#matrixTable');
    // Header
    let html = '<thead><tr><th class="corner">城市 \\ 模块</th>';
    for (const block of CONFIG.BLOCKS) {
      html += `<th>${block.name}</th>`;
    }
    html += '</tr></thead><tbody>';
    for (const city of cities) {
      html += `<tr><td class="city-name">${city.displayName}</td>`;
      for (const block of CONFIG.BLOCKS) {
        const m = city.modules[block.key];
        if (!m || (m.orders === 0 && m.profit === 0)) {
          html += '<td class="ue-cell ue-missing"><div class="ue-value">-</div></td>';
          continue;
        }
        const level = getAnomalyLevel(m.ue, m.subsidyRatio);
        const cls = level === 'danger' ? 'ue-danger' : level === 'warning' ? 'ue-warn' : level === 'missing' ? 'ue-missing' : 'ue-good';
        html += `<td class="ue-cell ${cls}" data-city="${city.name}" data-module="${block.key}">
          <div class="ue-value">${fmtUE(m.ue)}</div>
          <div class="ue-sub">补贴率${fmtPct(m.subsidyRatio)}</div>
        </td>`;
      }
      html += '</tr>';
    }
    html += '</tbody>';
    table.innerHTML = html;
    // Click handlers
    table.querySelectorAll('.ue-cell[data-city]').forEach(cell => {
      cell.addEventListener('click', () => {
        switchToDetail(cell.dataset.city, cell.dataset.module);
      });
      // Hover tooltip
      cell.addEventListener('mouseenter', (e) => {
        const cityName = cell.dataset.city;
        const moduleKey = cell.dataset.module;
        const city = state.currentData.cities.find(c => c.name === cityName);
        if (!city) return;
        const m = city.modules[moduleKey];
        if (!m) return;
        const moduleName = city.modules[moduleKey]?.moduleName || CONFIG.BLOCKS.find(b => b.key === moduleKey)?.name || moduleKey;
        const tooltip = $('#ueTooltip');
        tooltip.innerHTML = `
          <strong>${city.displayName} / ${moduleName}</strong><br>
          订单量: ${fmtInt(m.orders)}<br>
          收入: ${fmtWan(m.onlineRevenue)}<br>
          补贴率: ${fmtPct(m.subsidyRatio)} (${fmtWan(m.subsidyTotal)})<br>
          毛利: ${fmtWan(m.profit)}<br>
          单均UE: ${fmtUE(m.ue)}元
        `;
        tooltip.style.display = 'block';
        const rect = cell.getBoundingClientRect();
        tooltip.style.left = (rect.left + rect.width / 2 - tooltip.offsetWidth / 2) + 'px';
        tooltip.style.top = (rect.top - tooltip.offsetHeight - 8) + 'px';
      });
      cell.addEventListener('mouseleave', () => {
        $('#ueTooltip').style.display = 'none';
      });
    });
  }
  // ===== TAB2: ANOMALY =====
  function updateAnomalyBadge() {
    const items = collectAnomalies();
    const badge = $('#anomalyBadge');
    if (items.length > 0) {
      badge.classList.remove('hidden');
      badge.textContent = items.length;
    } else {
      badge.classList.add('hidden');
    }
  }
  function collectAnomalies() {
    const cities = getFilteredCities();
    const items = [];
    for (const city of cities) {
      for (const block of CONFIG.BLOCKS) {
        const m = city.modules[block.key];
        if (!m) continue;
        const level = getAnomalyLevel(m.ue, m.subsidyRatio);
        if (level === 'danger' || level === 'warning') {
          items.push({
            level,
            cityName: city.name,
            cityDisplay: city.displayName,
            moduleName: (city.modules[block.key] && city.modules[block.key].moduleName) || block.name,
            moduleKey: block.key,
            ...m
          });
        }
      }
    }
    // Sort: danger first, then by UE ascending (worst first)
    items.sort((a, b) => {
      if (a.level === 'danger' && b.level !== 'danger') return -1;
      if (a.level !== 'danger' && b.level === 'danger') return 1;
      return a.ue - b.ue;
    });
    return items;
  }
  function renderAnomalyTab() {
    const items = collectAnomalies();
    const container = $('#anomalyList');
    if (items.length === 0) {
      container.innerHTML = `
        <div class="no-anomaly">
          <div class="check-icon">&#10004;</div>
          <h3>所有城市运行正常</h3>
          <p class="text-secondary">当前筛选范围内未发现异常数据点</p>
        </div>
      `;
      return;
    }
    container.innerHTML = items.map((item, idx) => {
      const dotClass = item.level === 'danger' ? 'red' : 'yellow';
      const label = item.level === 'danger' ? '严重' : '预警';
      const diag = getDiagnosis(item.level, item.ue, item.subsidyRatio, item.moduleName);
      return `
        <div class="anomaly-card">
          <div class="anomaly-card-header" onclick="document.querySelector('#anomalyList .anomaly-card:nth-child(${idx+1}) .anomaly-card-body').classList.toggle('show')">
            <div class="anomaly-card-title">
              <div class="severity-dot ${dotClass}"></div>
              <span>${item.cityDisplay} / ${item.moduleName}</span>
              <span style="font-size:12px;color:var(--text-secondary);font-weight:400">[${label}]</span>
            </div>
            <button class="view-btn" data-city="${item.cityName}" data-module="${item.moduleKey}">查看详细</button>
          </div>
          <div class="anomaly-card-body show">
            <div class="anomaly-metrics">
              <div class="anomaly-metric">
                <div class="m-label">单均UE</div>
                <div class="m-value ${item.ue < 0 ? 'danger' : ''}">${fmtUE(item.ue)}元</div>
              </div>
              <div class="anomaly-metric">
                <div class="m-label">补贴率</div>
                <div class="m-value ${item.subsidyRatio > 0.35 ? 'danger' : ''}">${fmtPct(item.subsidyRatio)}</div>
              </div>
              <div class="anomaly-metric">
                <div class="m-label">订单量</div>
                <div class="m-value">${fmtInt(item.orders)}</div>
              </div>
              <div class="anomaly-metric">
                <div class="m-label">毛利</div>
                <div class="m-value ${item.profit < 0 ? 'danger' : 'success'}">${fmtWan(item.profit)}</div>
              </div>
            </div>
            ${diag ? `<div class="anomaly-diagnosis"><strong>诊断:</strong> ${diag}</div>` : ''}
          </div>
        </div>
      `;
    }).join('');
    // View detail buttons
    container.querySelectorAll('.view-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        switchToDetail(btn.dataset.city, btn.dataset.module);
      });
    });
  }
  // ===== TAB3: DETAIL =====
  function updateDetailSelectors() {
    const citySel = $('#detailCity');
    const currentVal = citySel.value;
    citySel.innerHTML = '';
    for (const city of getFilteredCities()) {
      const opt = document.createElement('option');
      opt.value = city.name;
      opt.textContent = city.displayName;
      if (city.name === (state.detailCity || currentVal)) opt.selected = true;
      citySel.appendChild(opt);
    }
    state.detailCity = citySel.value;
  }
  function renderDetailTab() {
    const cityName = state.detailCity;
    const moduleKey = state.detailModule;
    const city = state.currentData?.cities.find(c => c.name === cityName);
    if (!city) {
      $('#detailContent').innerHTML = '<div class="no-anomaly"><p class="text-secondary">请选择城市</p></div>';
      return;
    }
    const m = city.modules[moduleKey];
    if (!m) {
      $('#detailContent').innerHTML = '<div class="no-anomaly"><p class="text-secondary">该模块无数据</p></div>';
      return;
    }
    const moduleName = city.modules[moduleKey]?.moduleName || CONFIG.BLOCKS.find(b => b.key === moduleKey)?.name || moduleKey;
    const anomalyLevel = getAnomalyLevel(m.ue, m.subsidyRatio);
    // Try to load previous period data
    const prevData = getPrevPeriodData(cityName, moduleKey);
    const hasComparison = prevData !== null;
    let html = '';
    // Key metrics
    html += `<div class="detail-stats">`;
    html += detailStat('订单量', fmtInt(m.orders), prevData ? changeStr(m.orders, prevData.orders) : '');
    html += detailStat('收入', fmtWan(m.onlineRevenue), prevData ? changeStr(m.onlineRevenue, prevData.revenue, true) : '');
    html += detailStat('代补', fmtWan(m.subsidyTotal), prevData ? changeStr(m.subsidyTotal, prevData.subsidy, true) : '');
    html += detailStat('毛利', fmtWan(m.profit), prevData ? changeStr(m.profit, prevData.profit, true) : '', m.profit < 0 ? 'danger' : 'success');
    html += detailStat('单均UE', fmtUE(m.ue) + '元', prevData ? changeStr(m.ue, prevData.ue, false, true) : '', m.ue < 0 ? 'danger' : '');
    html += `</div>`;
    // Root cause analysis
    html += renderRootCause(city.displayName, moduleName, m, anomalyLevel, prevData);
    // Comparison table
    if (hasComparison) {
      html += renderComparisonTable(m, prevData);
    }
    // Breakdown by category
    html += renderCategoryBreakdown(city, moduleKey);
    $('#detailContent').innerHTML = html;
  }
  function detailStat(label, value, change, valueClass) {
    const cls = valueClass ? ` ${valueClass}` : '';
    const changeHtml = change ? `<div class="s-change ${change.dir}">${change.text}</div>` : '';
    return `
      <div class="detail-stat">
        <div class="s-label">${label}</div>
        <div class="s-value${cls}">${value}</div>
        ${changeHtml}
      </div>
    `;
  }
  function changeStr(current, prev, isWan, isUE) {
    if (prev === 0 && current === 0) return null;
    const diff = current - prev;
    const rate = prev !== 0 ? (diff / Math.abs(prev)) * 100 : 0;
    let displayDiff;
    if (isWan) displayDiff = (diff > 0 ? '+' : '') + fmtWan(diff);
    else if (isUE) displayDiff = (diff > 0 ? '+' : '') + diff.toFixed(2);
    else displayDiff = (diff > 0 ? '+' : '') + fmtInt(diff);
    const displayRate = Math.abs(rate).toFixed(1) + '%';
    // For UE and profit, lower is worse (negative change = red)
    // For others, context-dependent
    let dir;
    if (isUE) {
      dir = diff >= 0 ? 'up' : 'down';
    } else {
      dir = diff >= 0 ? 'up' : 'down';
    }
    return { text: `${displayDiff} (${displayRate})`, dir };
  }
  function renderRootCause(cityName, moduleName, m, level, prev) {
    const isAnomaly = level === 'danger' || level === 'warning';
    let html = `<div class="root-cause-card"><h4>根因分析</h4>`;
    html += `<div class="root-cause-formula">UE = 毛利 / 订单量 = ${fmtWan(m.profit)} / ${fmtInt(m.orders)} = ${fmtUE(m.ue)}元</div>`;
    // Generate conclusion
    let conclusion = '';
    let conclusionClass = 'ok';
    if (m.ue < 0) {
      conclusionClass = 'danger';
      if (Math.abs(m.profit) > m.onlineRevenue * 0.05) {
        conclusion = `<strong>${cityName}${moduleName}</strong> UE亏损（${fmtUE(m.ue)}元），主因：毛利为负（${fmtWan(m.profit)}），亏损额占收入${fmtPct(Math.abs(m.profit)/m.onlineRevenue)}。补贴率${fmtPct(m.subsidyRatio)}${m.subsidyRatio > 0.35 ? '，补贴效率低下' : ''}。建议：降低代补投入或提升抽佣收入。`;
      } else {
        conclusion = `<strong>${cityName}${moduleName}</strong> UE亏损（${fmtUE(m.ue)}元），毛利微亏（${fmtWan(m.profit)}），但订单量正常（${fmtInt(m.orders)}）。补贴率${fmtPct(m.subsidyRatio)}。建议关注配送成本和平台成本。`;
      }
    } else if (m.ue < 0.3) {
      conclusionClass = 'warning';
      conclusion = `<strong>${cityName}${moduleName}</strong> UE偏低（${fmtUE(m.ue)}元），处于预警区间。补贴率${fmtPct(m.subsidyRatio)}${m.subsidyRatio > 0.30 ? '偏高' : '正常'}。${prev ? '较上期' + (m.ue > prev.ue ? '有所改善' : '有所下滑') + '。' : ''}建议优化补贴策略。`;
    } else {
      conclusion = `<strong>${cityName}${moduleName}</strong> 运营健康，UE ${fmtUE(m.ue)}元，补贴率${fmtPct(m.subsidyRatio)}。${prev ? '较上期' + (m.ue > prev.ue ? '上升' : '下降') + (m.ue - prev.ue).toFixed(2) + '元。' : ''}`;
    }
    html += `<div class="root-cause-conclusion ${conclusionClass}">${conclusion}</div>`;
    html += '</div>';
    return html;
  }
  function renderComparisonTable(current, prev) {
    const rows = [
      { name: '订单量', cur: current.orders, prev: prev.orders, fmt: fmtInt },
      { name: '收入', cur: current.onlineRevenue, prev: prev.onlineRevenue, fmt: fmtWan },
      { name: '代补', cur: current.subsidyTotal, prev: prev.subsidyTotal, fmt: fmtWan },
      { name: '毛利', cur: current.profit, prev: prev.profit, fmt: fmtWan },
      { name: '单均UE', cur: current.ue, prev: prev.ue, fmt: v => fmtUE(v) + '元' },
      { name: '补贴率', cur: current.subsidyRatio, prev: prev.subsidyRatio, fmt: fmtPct },
    ];
    let html = `<div class="comparison-card">
      <div class="card-title">本期 vs 上期对比</div>
      <table class="comparison-table"><thead><tr>
        <th>指标</th><th>本期</th><th>上期</th><th>变化</th><th>变化率</th>
      </tr></thead><tbody>`;
    for (const r of rows) {
      const diff = r.cur - r.prev;
      const rate = r.prev !== 0 ? (diff / Math.abs(r.prev)) * 100 : (r.cur !== 0 ? 100 : 0);
      const cls = diff > 0 ? 'val-up' : diff < 0 ? 'val-down' : '';
      const arrow = diff > 0 ? '&#9650;' : diff < 0 ? '&#9660;' : '-';
      html += `<tr>
        <td>${r.name}</td>
        <td>${r.fmt(r.cur)}</td>
        <td>${r.fmt(r.prev)}</td>
        <td class="${cls}">${diff > 0 ? '+' : ''}${r.fmt(diff)}</td>
        <td class="${cls}">${arrow} ${Math.abs(rate).toFixed(1)}%</td>
      </tr>`;
    }
    html += '</tbody></table></div>';
    return html;
  }
  function getPrevPeriodData(cityName, moduleKey) {
    if (!state.currentData) return null;
    const allData = DataStore.loadAll();
    const dates = Object.keys(allData).sort().reverse();
    const currentIdx = dates.indexOf(state.currentData.date);
    if (currentIdx < 0 || currentIdx >= dates.length - 1) return null;
    const prevDate = dates[currentIdx + 1];
    const prevFile = allData[prevDate];
    const prevCities = prevFile.cities || (prevFile.currentData && prevFile.currentData.cities) || [];
    const prevCity = prevCities.find(c => c.name === cityName);
    if (!prevCity) return null;
    return prevCity.modules[moduleKey] || null;
  }
  function renderCategoryBreakdown(city, moduleKey) {
    // Show breakdown across all 4 modules for this city
    const moduleName = city.modules[moduleKey]?.moduleName || CONFIG.BLOCKS.find(b => b.key === moduleKey)?.name || '';
    let html = `<div class="comparison-card" style="margin-top:24px">
      <div class="card-title">${city.displayName} - 各模块数据对比</div>
      <table class="comparison-table"><thead><tr>
        <th>模块</th><th>订单量</th><th>收入</th><th>代补</th><th>补贴率</th><th>毛利</th><th>UE</th>
      </tr></thead><tbody>`;
    for (const block of CONFIG.BLOCKS) {
      const m = city.modules[block.key];
      if (!m) continue;
      const isActive = block.key === moduleKey;
      const level = getAnomalyLevel(m.ue, m.subsidyRatio);
      const ueClass = level === 'danger' ? 'val-down' : level === 'warning' ? '' : 'val-up';
      html += `<tr${isActive ? ' style="background:var(--primary-light);font-weight:600"' : ''}>
        <td>${block.name}</td>
        <td>${fmtInt(m.orders)}</td>
        <td>${fmtWan(m.onlineRevenue)}</td>
        <td>${fmtWan(m.subsidyTotal)}</td>
        <td>${fmtPct(m.subsidyRatio)}</td>
        <td class="${m.profit < 0 ? 'val-down' : 'val-up'}">${fmtWan(m.profit)}</td>
        <td class="${ueClass}">${fmtUE(m.ue)}元</td>
      </tr>`;
    }
    // Totals
    let tO=0, tR=0, tS=0, tP=0;
    for (const block of CONFIG.BLOCKS) {
      const m = city.modules[block.key];
      if (m) { tO += m.orders; tR += m.onlineRevenue; tS += m.subsidyTotal; tP += m.profit; }
    }
    html += `<tr style="background:var(--gray-light);font-weight:600">
      <td>合计</td>
      <td>${fmtInt(tO)}</td>
      <td>${fmtWan(tR)}</td>
      <td>${fmtWan(tS)}</td>
      <td>${fmtPct(tS/tR)}</td>
      <td class="${tP < 0 ? 'val-down' : 'val-up'}">${fmtWan(tP)}</td>
      <td>${fmtUE(tP/tO)}元</td>
    </tr>`;
    html += '</tbody></table></div>';
    return html;
  }


  // =
  // ===== v10: Export Functions =====
  function exportExcel() {
    if (!state.currentData) { showToast('请先上传数据', 'warning'); return; }
    const cities = getFilteredCities();
    const wb = XLSX.utils.book_new();

    // Sheet 1: UE Matrix
    const matrixData = [['城市', '模块', '订单量', '收入', '代补', '毛利', 'UE', '补贴率', 'GMV']];
    for (const city of cities) {
      for (const block of CONFIG.BLOCKS) {
        const m = city.modules[block.key];
        if (!m) continue;
        matrixData.push([
          city.displayName, block.name, m.orders,
          m.onlineRevenue, m.subsidyTotal, m.profit,
          +m.ue.toFixed(2), +m.subsidyRatio.toFixed(4),
          m.gmvAmount
        ]);
      }
    }
    const ws1 = XLSX.utils.aoa_to_sheet(matrixData);
    ws1['!cols'] = [{ wch: 10 }, { wch: 8 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 8 }, { wch: 8 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws1, 'UE矩阵');

    // Sheet 2: Anomaly Summary
    const anomalies = collectAnomalies();
    const anomalyData = [['城市', '模块', '严重级别', 'UE', '补贴率', '订单量', '毛利', '诊断']];
    for (const a of anomalies) {
      const diag = getDiagnosis(a.level, a.ue, a.subsidyRatio, a.moduleName) || '';
      anomalyData.push([
        a.cityDisplay, a.moduleName,
        a.level === 'danger' ? '严重' : '预警',
        +a.ue.toFixed(2), +a.subsidyRatio.toFixed(4),
        a.orders, a.profit, diag
      ]);
    }
    const ws2 = XLSX.utils.aoa_to_sheet(anomalyData);
    ws2['!cols'] = [{ wch: 10 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 10 }, { wch: 12 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, ws2, '异常汇总');

    // Sheet 3: Comparison (if prev data available)
    const dates = Object.keys(DataStore.loadAll()).sort().reverse();
    if (dates.length >= 2) {
      const compData = [['城市', '模块', '指标', '本期', '上期', '变化', '变化率']];
      for (const city of cities) {
        for (const block of CONFIG.BLOCKS) {
          const m = city.modules[block.key];
          if (!m) continue;
          const prev = getPrevPeriodData(city.name, block.key);
          if (!prev) continue;
          const rows = [
            { name: '订单量', cur: m.orders, prev: prev.orders },
            { name: '收入', cur: m.onlineRevenue, prev: prev.onlineRevenue },
            { name: '代补', cur: m.subsidyTotal, prev: prev.subsidyTotal },
            { name: '毛利', cur: m.profit, prev: prev.profit },
            { name: 'UE', cur: +m.ue.toFixed(2), prev: +prev.ue.toFixed(2) },
          ];
          for (const r of rows) {
            const diff = r.cur - r.prev;
            const rate = r.prev !== 0 ? (diff / Math.abs(r.prev) * 100).toFixed(1) + '%' : '-';
            compData.push([city.displayName, block.name, r.name, r.cur, r.prev, diff, rate]);
          }
        }
      }
      const ws3 = XLSX.utils.aoa_to_sheet(compData);
      XLSX.utils.book_append_sheet(wb, ws3, '环比对比');
    }

    const dateStr = state.currentData.date || 'export';
    XLSX.writeFile(wb, '财务分析报告_' + dateStr + '.xlsx');
    showToast('Excel导出成功', 'success');
  }

  function exportCSV() {
    if (!state.currentData) { showToast('请先上传数据', 'warning'); return; }
    const cities = getFilteredCities();
    const rows = ['城市,模块,订单量,收入,代补,毛利,UE,补贴率,GMV'];
    for (const city of cities) {
      for (const block of CONFIG.BLOCKS) {
        const m = city.modules[block.key];
        if (!m) continue;
        rows.push([
          city.displayName, block.name, m.orders,
          m.onlineRevenue, m.subsidyTotal, m.profit,
          m.ue.toFixed(2), m.subsidyRatio.toFixed(4),
          m.gmvAmount
        ].join(','));
      }
    }
    const blob = new Blob(['﻿' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '财务分析_' + (state.currentData.date || 'export') + '.csv';
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSV导出成功', 'success');
  }

  function exportMatrixExcel() {
    if (!state.currentData) { showToast('请先上传数据', 'warning'); return; }
    const cities = getFilteredCities();
    const wb = XLSX.utils.book_new();
    // Matrix view: rows=cities, cols=modules, each cell = UE + subsidy rate
    const headers = ['城市'];
    CONFIG.BLOCKS.forEach(b => headers.push(b.name + '-UE', b.name + '-补贴率'));
    const matrixRows = [headers];
    for (const city of cities) {
      const row = [city.displayName];
      for (const block of CONFIG.BLOCKS) {
        const m = city.modules[block.key];
        if (m && m.orders > 0) {
          row.push(+m.ue.toFixed(2), +(m.subsidyRatio * 100).toFixed(1) + '%');
        } else {
          row.push('-', '-');
        }
      }
      matrixRows.push(row);
    }
    const ws = XLSX.utils.aoa_to_sheet(matrixRows);
    // Set column widths
    ws['!cols'] = [{ wch: 10 }];
    CONFIG.BLOCKS.forEach(() => { ws['!cols'].push({ wch: 10 }, { wch: 12 }); });
    XLSX.utils.book_append_sheet(wb, ws, 'UE矩阵');
    XLSX.writeFile(wb, 'UE矩阵_' + (state.currentData.date || 'export') + '.xlsx');
    showToast('矩阵导出成功', 'success');
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
  

  // ===== TAB SWITCHING =====
    // ===== v11: COST STRUCTURE =====
  let costCity = '总商', costModule = 'all';

  function initCostSelectors() {
    const cs = document.getElementById('costCity');
    const cm = document.getElementById('costModule');
    if (!cs || !cm) return;
    if (!state.currentData) return;
    cs.innerHTML = state.currentData.cities.map(c =>
      '<option value="' + c.name + '">' + c.displayName + '</option>'
    ).join('');
    cs.value = costCity;
    cs.onchange = function() { costCity = this.value; renderCostStructure(); };
    cm.value = costModule;
    cm.onchange = function() { costModule = this.value; renderCostStructure(); };
  }

  
function generateReport() {
  if (!state.currentData || !state.currentData.cities || state.currentData.cities.length === 0) {
    $('#reportContent').innerHTML = '<p style="color:#ef4444;text-align:center;padding:60px 0;">请先上传数据</p>';
    return;
  }

  // 准备分析数据
  var cities = state.currentData.cities;
  var analyzeData = {
    date: state.currentData.fileName || document.getElementById('dateSelect').value || '未知日期',
    merchantType: state.currentMerchant === 'all' ? '全量商家' : state.currentMerchant === 'ka' ? 'KA商家' : '城市商家',
    cities: cities.map(function(c) {
      var metrics = {};
      if (c.modules) {
        if (Array.isArray(c.modules)) {
          c.modules.forEach(function(m) {
            metrics[m.key || m.name] = {
              ue: m.ue || 0,
              profitRate: m.profitRate || 0,
              deliveryCostRate: m.deliveryCostRate || (m.deliveryCost && m.onlineRevenue ? m.deliveryCost / m.onlineRevenue * 100 : 0),
              subsidyRate: m.subsidyRate || (m.subsidyTotal && m.gmvAmount ? m.subsidyTotal / m.gmvAmount * 100 : 0),
              fixedCostRate: m.fixedCostRate || (m.fixedCost && m.onlineRevenue ? m.fixedCost / m.onlineRevenue * 100 : 0),
              orders: m.orders || 0,
              profit: m.profit || 0,
              onlineRevenue: m.onlineRevenue || 0,
              deliveryCost: m.deliveryCost || 0,
              subsidyTotal: m.subsidyTotal || 0,
              fixedCost: m.fixedCost || 0,
              gmvAmount: m.gmvAmount || 0
            };
          });
        } else {
          for (var mk in c.modules) {
            var m = c.modules[mk];
            metrics[mk] = {
              ue: m.ue || 0,
              profitRate: m.profitRate || 0,
              deliveryCostRate: m.deliveryCostRate || (m.deliveryCost && m.onlineRevenue ? m.deliveryCost / m.onlineRevenue * 100 : 0),
              subsidyRate: m.subsidyRate || (m.subsidyTotal && m.gmvAmount ? m.subsidyTotal / m.gmvAmount * 100 : 0),
              fixedCostRate: m.fixedCostRate || (m.fixedCost && m.onlineRevenue ? m.fixedCost / m.onlineRevenue * 100 : 0),
              orders: m.orders || 0,
              profit: m.profit || 0,
              onlineRevenue: m.onlineRevenue || 0,
              deliveryCost: m.deliveryCost || 0,
              subsidyTotal: m.subsidyTotal || 0,
              fixedCost: m.fixedCost || 0,
              gmvAmount: m.gmvAmount || 0
            };
          }
        }
      }
      return { name: c.name, metrics: metrics };
    }),
    modules: ['全品类', '餐饮', '闪购', '医药', '拼好饭']
  };

  // 显示loading
  $('#reportContent').innerHTML = '<div style="text-align:center;padding:60px 0;"><div style="font-size:24px;margin-bottom:12px;">正在生成分析报告...</div><p style="color:#666;">AI分析引擎处理中，请稍候</p></div>';

  // 调用后端API
  fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(analyzeData)
  })
  .then(function(res) { return res.json(); })
  .then(function(task) {
    var taskId = task.taskId;
    // 轮询结果
    var pollCount = 0;
    var pollTimer = setInterval(function() {
      pollCount++;
      fetch('/api/analyze/result/' + taskId)
        .then(function(res) { return res.json(); })
        .then(function(result) {
          if (result.status === 'done') {
            clearInterval(pollTimer);
            renderMarkdown(result.markdown);
            state.reportText = result.markdown;
            $('#btnCopyReport').style.display = 'inline-block';
            $('#btnDownloadReport').style.display = 'inline-block';
          } else if (result.status === 'error') {
            clearInterval(pollTimer);
            $('#reportContent').innerHTML = '<p style="color:#ef4444;text-align:center;padding:60px 0;">报告生成失败: ' + result.message + '</p>';
          }
          // status === 'pending' 继续等待
          if (pollCount > 60) {
            clearInterval(pollTimer);
            $('#reportContent').innerHTML = '<p style="color:#ef4444;text-align:center;padding:60px 0;">分析超时，请重试</p>';
          }
        })
        .catch(function(err) {
          clearInterval(pollTimer);
          // 如果API不可用，fallback到本地规则引擎
          console.log('[generateReport] API不可用，使用本地分析');
          generateReportLocal();
        });
    }, 500);
  })
  .catch(function(err) {
    // API不可用时的fallback
    console.log('[generateReport] API不可用，使用本地分析');
    generateReportLocal();
  });
}

function renderMarkdown(md) {
  // 简单Markdown渲染
  var html = md
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/^---$/gm, '<hr>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  // 重新处理表格
  var lines = html.split('\n');
  var inTable = false;
  var result = [];
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    if (line.indexOf('|') === 0) {
      if (line.replace(/[\|\s\-]/g, '') === '') continue; // 跳过表头分隔行
      if (!inTable) { result.push('<table>'); inTable = true; }
      var cells = line.split('|').filter(function(c) { return c.trim() !== ''; });
      var tag = result.length > 0 && result[result.length-1] === '<table>' ? 'th' : 'td';
      var row = '<tr>' + cells.map(function(c) { return '<' + tag + '>' + c.trim() + '</' + tag + '>'; }).join('') + '</tr>';
      result.push(row);
    } else {
      if (inTable) { result.push('</table>'); inTable = false; }
      // li需要包在ul里
      if (line.indexOf('<li>') === 0) {
        if (result.length === 0 || result[result.length-1] !== '<ul>') result.push('<ul>');
        result.push(line);
      } else {
        if (result.length > 0 && result[result.length-1] === '<ul>') result.push('</ul>');
        if (line.trim()) result.push('<p>' + line + '</p>');
      }
    }
  }
  if (inTable) result.push('</table>');
  if (result.length > 0 && result[result.length-1] === '<ul>') result.push('</ul>');
  document.getElementById('reportContent').innerHTML = result.join('\n');
}



function renderCostStructure() {
    if (!state.currentData) return;
    initCostSelectors();
    const city = state.currentData.cities.find(c => c.name === costCity);
    if (!city) return;
    const mod = city.modules[costModule];
    if (!mod) return;

    const incomeItems = [
      { label: '抽佣', value: mod.commission },
      { label: '配送费', value: mod.deliveryFee },
      { label: '其他收入', value: mod.otherRevenue }
    ];
    renderCostBars('costIncome', incomeItems, mod.onlineRevenue, 'income');

    const expenseItems = [
      { label: '配送成本', value: mod.deliveryCost },
      { label: '代补', value: mod.subsidyTotal },
      { label: '平台成本', value: mod.platformCost },
      { label: '固定成本', value: mod.fixedCost },
      { label: '附加成本', value: mod.additionalCost }
    ];
    renderCostBars('costExpense', expenseItems, mod.onlineExpense, 'expense');

    renderEfficiencyCards(mod);
    renderCostCompare();
  }

  function renderCostBars(containerId, items, total, type) {
    const el = document.getElementById(containerId);
    if (!el) return;
    let html = '';
    const nonZero = items.filter(it => it.value > 0);
    const maxVal = Math.max(...nonZero.map(it => it.value), 1);
    nonZero.forEach(it => {
      const pct = total > 0 ? (it.value / total * 100) : 0;
      const barW = (it.value / maxVal * 100);
      html += '<div class="cost-bar-row">' +
        '<div class="cost-bar-label">' + it.label + '</div>' +
        '<div class="cost-bar-wrap"><div class="cost-bar-fill ' + type + '" style="width:' + barW + '%"></div></div>' +
        '<div class="cost-bar-value">' + fmtWan(it.value) + '</div>' +
        '<div class="cost-bar-pct">' + pct.toFixed(1) + '%</div></div>';
    });
    html += '<div class="cost-total"><span>合计</span><span class="amount">' + fmtWan(total) + '</span></div>';
    el.innerHTML = html;
  }

  function renderEfficiencyCards(mod) {
    const el = document.getElementById('effCards');
    if (!el) return;
    const totalCity = state.currentData.cities.find(c => c.name === '总商');
    const totalMod = totalCity ? totalCity.modules[costModule] : null;
    const metrics = [
      { label: '单均收入', value: mod.avgRevenuePerOrder, unit: '元', key: 'avgRevenuePerOrder', base: totalMod ? totalMod.avgRevenuePerOrder : 0 },
      { label: '单均UE', value: mod.ue, unit: '元', key: 'ue', base: totalMod ? totalMod.ue : 0 },
      { label: '配送成本率', value: mod.deliveryCostRate * 100, unit: '%', key: 'deliveryCostRate', base: totalMod ? totalMod.deliveryCostRate * 100 : 0 },
      { label: '补贴率', value: mod.subsidyRatio * 100, unit: '%', key: 'subsidyRatio', base: totalMod ? totalMod.subsidyRatio * 100 : 0 },
      { label: '企客占比', value: mod.enterpriseRatio * 100, unit: '%', key: 'enterpriseRatio', base: totalMod ? totalMod.enterpriseRatio * 100 : 0 }
    ];
    let html = '';
    metrics.forEach(m => {
      const displayVal = m.key === 'ue' ? m.value.toFixed(2) : m.value.toFixed(1);
      const isAnomaly = isCostAnomaly(m.key, m.value, m.base);
      const colorClass = m.value < 0 ? 'negative' : m.value > 0 ? 'positive' : '';
      html += '<div class="eff-card' + (isAnomaly ? ' anomaly' : '') + '">' +
        '<div class="eff-label">' + m.label + (isAnomaly ? ' ⚠' : '') + '</div>' +
        '<div class="eff-value ' + colorClass + '">' + displayVal + '<span class="eff-unit"> ' + m.unit + '</span></div></div>';
    });
    el.innerHTML = html;
  }

  function isCostAnomaly(key, value, base) {
    if (key === 'ue') return value < -0.5;
    if (key === 'deliveryCostRate') return value > 40;
    if (key === 'subsidyRatio') return value > 10;
    if (key === 'avgRevenuePerOrder') return value < 8;
    return false;
  }

  function renderCostCompare() {
    const el = document.getElementById('costCompare');
    if (!el) return;
    const cities = state.currentData.cities.filter(c => c.name !== '总商');
    const rates = cities.map(c => {
      const m = c.modules[costModule];
      return { name: c.displayName, rate: m ? m.deliveryCostRate * 100 : 0 };
    }).sort((a, b) => b.rate - a.rate);
    const maxRate = Math.max(...rates.map(r => r.rate), 1);
    let html = '';
    rates.forEach(r => {
      const barW = (r.rate / maxRate * 100);
      const isHigh = r.rate > 40;
      html += '<div class="cost-compare-row">' +
        '<div class="cost-compare-city">' + r.name + '</div>' +
        '<div class="cost-compare-bar"><div class="cost-compare-fill" style="width:' + barW + '%;background:' + (isHigh ? 'var(--danger)' : 'var(--primary)') + '"></div></div>' +
        '<div class="cost-compare-val" style="color:' + (isHigh ? 'var(--danger)' : 'var(--text)') + '">' + r.rate.toFixed(1) + '%</div></div>';
    });
    el.innerHTML = html;
  }

function switchTab(tabName) {
    state.currentTab = tabName;
    console.log('[switchTab] ' + tabName + ', cities:' + state.currentData.cities.length);
    $$('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tabName));
    $$('.tab-pane').forEach(p => p.classList.add('hidden'));
    $(`#pane${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`).classList.remove('hidden');
    if (tabName === 'overview') {
      console.log('[switchTab] refreshing overview, merchant:', state.currentMerchant);
      refreshDashboard();
    }
    if (tabName === 'anomaly') {
      renderAnomalyTab();
    }
    if (tabName === 'detail') {
      updateDetailSelectors();
      renderDetailTab();
    }
    if (tabName === 'cost') {
      renderCostStructure();
    }
    if (tabName === 'rawdata') {
      renderRawData();
    }
    // report不自动生成，等用户点击
  }
  function switchToDetail(cityName, moduleKey) {
    state.detailCity = cityName;
    state.detailModule = moduleKey;
    // Update selectors
    const citySel = $('#detailCity');
    citySel.value = cityName;
    const modSel = $('#detailModule');
    modSel.value = moduleKey;
    // Switch to detail tab
    switchTab('detail');
  }
  // ===== EVENT BINDINGS =====
  function initEvents() {
    // Upload
    const uploadArea = $('#uploadArea');
    const fileInput = $('#fileInput');
uploadArea.addEventListener('click', () => fileInput.click());
  document.getElementById('welcomeUploadBtn').addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => {
  if (e.target.files[0]) handleFile(e.target.files[0]);
    $('#btnGenerateReport').addEventListener('click', generateReport);
    $('#btnCopyReport').addEventListener('click', function() {
      if (state.reportText) {
        navigator.clipboard.writeText(state.reportText).then(function() {
          var btn = $('#btnCopyReport');
          btn.textContent = '已复制!';
          setTimeout(function() { btn.textContent = '复制到剪贴板'; }, 2000);
        });
      }
    });
    $('#btnDownloadReport').addEventListener('click', function() {
      if (state.reportText) {
        var blob = new Blob([state.reportText], { type: 'text/markdown;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = ($('#dateSelect').value || 'report') + '_UE分析报告.md';
        a.click();
        URL.revokeObjectURL(url);
      }
    });

});
    uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));
    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.classList.remove('drag-over');
      if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
    });
    // Also allow drop on sidebar
    const sidebar = $('#sidebar');
    sidebar.addEventListener('dragover', (e) => e.preventDefault());
    sidebar.addEventListener('drop', (e) => {
      e.preventDefault();
      if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
    });
    // Tabs
    $$('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    // Date selector
    $('#dateSelect').addEventListener('change', (e) => {
      const date = e.target.value;
      const allData = DataStore.loadAll();
      if (allData[date]) {
        const entry = allData[date];
        // 兼容新旧格式：新格式有merchantData，旧格式只有currentData
        if (entry.merchantData) {
          state.merchantData = entry.merchantData;
          state.currentMerchant = entry.currentMerchant || Object.keys(entry.merchantData)[0];
          state.currentData = entry.currentData;
        } else {
          // 旧格式兼容：用currentData反向构造
          state.currentData = entry;
          state.merchantData = { all: { label: '全量商家', cities: entry.cities } };
          state.currentMerchant = 'all';
        }
        onDataLoaded();
        renderHistory();
        renderMerchantSelector();
      }
    });
    // City filter actions
    $('#selectAllBtn').addEventListener('click', () => {
      if (!state.currentData) return;
      state.selectedCities = new Set(state.currentData.cities.map(c => c.name));
      $$('#cityFilters input[type="checkbox"]').forEach(cb => cb.checked = true);
      refreshDashboard();
    });
    $('#deselectAllBtn').addEventListener('click', () => {
      state.selectedCities.clear();
      $$('#cityFilters input[type="checkbox"]').forEach(cb => cb.checked = false);
      refreshDashboard();
    });
    // Detail selectors
    $('#detailCity').addEventListener('change', (e) => {
      state.detailCity = e.target.value;
      renderDetailTab();
    });
    $('#detailModule').addEventListener('change', (e) => {
      state.detailModule = e.target.value;
      renderDetailTab();
    });
    // Mobile menu
    $('#mobileMenuBtn').addEventListener('click', () => {
      $('#sidebar').classList.toggle('open');
      $('#sidebarOverlay').classList.toggle('show');
    });
    $('#sidebarOverlay').addEventListener('click', () => {
      $('#sidebar').classList.remove('open');
      $('#sidebarOverlay').classList.remove('show');
    });
  }
  // ===== INIT =====


  // ===== RAW DATA =====
function renderRawData() {
  const container = document.getElementById('rawdataContent');
  if (!container) return;
  if (!state.currentData || !state.currentData.cities) {
    container.innerHTML = '<p>暂无数据</p>';
    return;
  }
  const data = state.currentData;
  let html = '<div style="width:100%;max-height:none;overflow:visible;">';
  // 计算总商数据（直接取全品类模块）
  const totalBiz = Array.isArray(data.cities) ? data.cities.find(c => c.name === '总商') : data.cities['总商'];
  const allMod = totalBiz ? totalBiz.modules['all'] : null;
  let totalOrders = allMod ? allMod.orders : 0;
  let totalRevenue = allMod ? allMod.onlineRevenue : 0;
  let totalSubsidy = allMod ? allMod.subsidyTotal : 0;
  let totalProfit = allMod ? allMod.profit : 0;
  let totalGmv = allMod ? allMod.gmvAmount : 0;
  let totalUE = totalOrders > 0 ? totalProfit / totalOrders : 0;
  let totalSubsidyRatio = totalGmv > 0 ? totalSubsidy / totalGmv : 0;
  html += '<div style="margin-bottom:20px;border:2px solid #1890ff;padding:15px;border-radius:5px;background:#f0f8ff;">';
  html += '<h4 style="margin:0 0 10px;color:#1890ff;">总商数据（整体）</h4>';
  html += '<table style="width:100%;border-collapse:collapse;font-size:12px;">';
  html += '<thead><tr style="background:#1890ff;color:white;"><th style="padding:8px;border:1px solid #ddd;">指标</th><th style="padding:8px;border:1px solid #ddd;">数值</th></tr></thead><tbody>';
  html += '<tr><td style="padding:8px;border:1px solid #ddd;">总订单量</td><td style="padding:8px;border:1px solid #ddd;">' + totalOrders.toLocaleString() + '</td></tr>';
  html += '<tr><td style="padding:8px;border:1px solid #ddd;">总收入</td><td style="padding:8px;border:1px solid #ddd;">\u00a5' + totalRevenue.toLocaleString() + '</td></tr>';
  html += '<tr><td style="padding:8px;border:1px solid #ddd;">总补贴</td><td style="padding:8px;border:1px solid #ddd;">\u00a5' + totalSubsidy.toLocaleString() + '</td></tr>';
  html += '<tr><td style="padding:8px;border:1px solid #ddd;">总毛利</td><td style="padding:8px;border:1px solid #ddd;">\u00a5' + totalProfit.toLocaleString() + '</td></tr>';
  html += '<tr><td style="padding:8px;border:1px solid #ddd;">平均UE</td><td style="padding:8px;border:1px solid #ddd;">\u00a5' + totalUE.toFixed(2) + '</td></tr>';
  html += '<tr><td style="padding:8px;border:1px solid #ddd;">平均补贴率</td><td style="padding:8px;border:1px solid #ddd;">' + (totalSubsidyRatio * 100).toFixed(2) + '%</td></tr>';
  html += '</tbody></table></div>';
  // 遍历城市
  for (const city of data.cities) {
    html += '<div style="margin-bottom:20px;border:1px solid #ccc;padding:10px;border-radius:5px;">';
    html += '<h4 style="margin:0 0 10px;color:#333;">' + city.name + '</h4>';
    const MODULE_LABELS = {'all':'全品类','food':'餐饮','flash':'闪购','medicine':'医药','group':'拼好饭'};
    for (const [moduleName, module] of Object.entries(city.modules)) {
      const modLabel = MODULE_LABELS[moduleName] || moduleName;
      html += '<div style="margin-bottom:15px;padding:10px;background:#f9f9f9;border-radius:3px;">';
      html += '<h5 style="margin:0 0 8px;color:#666;">' + modLabel + '</h5>';
      html += '<table style="width:100%;border-collapse:collapse;font-size:11px;">';
      html += '<thead><tr style="background:#f0f0f0;"><th style="padding:6px;border:1px solid #ddd;text-align:left;">指标</th><th style="padding:6px;border:1px solid #ddd;text-align:right;">数值</th></tr></thead><tbody>';
      var metrics = [
        ['订单量', (module.orders != null ? module.orders.toLocaleString() : 'N/A')],
        ['收入', (module.onlineRevenue != null ? '\u00a5' + module.onlineRevenue.toLocaleString() : 'N/A')],
        ['补贴', (module.subsidyTotal != null ? '\u00a5' + module.subsidyTotal.toLocaleString() : 'N/A')],
        ['毛利', (module.profit != null ? '\u00a5' + module.profit.toLocaleString() : 'N/A')],
        ['UE', (module.ue != null ? '\u00a5' + module.ue.toFixed(2) : 'N/A')],
        ['补贴率', (module.subsidyTotalRatio != null ? (module.subsidyTotalRatio * 100).toFixed(2) + '%' : 'N/A')]
      ];
      for (var m = 0; m < metrics.length; m++) {
        html += '<tr><td style="padding:6px;border:1px solid #ddd;">' + metrics[m][0] + '</td><td style="padding:6px;border:1px solid #ddd;text-align:right;">' + metrics[m][1] + '</td></tr>';
      }
      html += '</tbody></table></div>';
    }
    html += '</div>';
  }
  html += '</div>';
  container.innerHTML = html;
}


  function init() {
    // 启动时清理旧格式缓存数据
    try {
      const allData = DataStore.loadAll();
      const dates = Object.keys(allData);
      let cleaned = false;
      for (const date of dates) {
        if (allData[date] && !allData[date].merchantData && allData[date].cities) {
          delete allData[date];
          cleaned = true;
        }
      }
      if (cleaned) {
        localStorage.setItem(DataStore.KEY, JSON.stringify(allData));
        console.log('[init] 已清理旧格式缓存，请重新上传文件');
      }
    } catch(e) { console.warn('[init] 缓存清理失败:', e); }


    initEvents();
    // 从云端同步最新数据
    CloudSync.init(); CloudSync.syncToLocal().then(() => {
      // Try to load last data
      const allData = DataStore.loadAll();
    const dates = Object.keys(allData).sort().reverse();
    if (dates.length > 0) {
      const entry = allData[dates[0]];
      // 兼容新旧格式
      if (entry.merchantData) {
        state.merchantData = entry.merchantData;
        state.currentMerchant = entry.currentMerchant || Object.keys(entry.merchantData)[0];
        state.currentData = entry.currentData;
      } else if (entry.cities) {
        state.currentData = entry;
        state.merchantData = { all: { label: '全量商家', cities: entry.cities } };
        state.currentMerchant = 'all';
      } else {
        console.warn('[init] 缓存数据格式异常，请重新上传');
        return;
      }
      onDataLoaded();
      renderRawData();
      renderMerchantSelector();
      $('#uploadArea').style.display = 'none';
      $('#uploadSuccess').style.display = 'block';
      $('#uploadFileName').textContent = '已加载: ' + (state.currentData.fileName || dates[0]);
      $('#uploadFileInfo').textContent = dates[0] + ' / ' + (state.currentData.cities ? state.currentData.cities.length : 0) + '城市';
    }
    });
  }
  // Run
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  // 暴露关键函数到全局（供外部script使用）
  window._app = {
    handleFile: handleFile,
    handleFile: handleFile,
    parseExcelFile: parseExcelFile,
    parseCSVFile: parseCSVFile,
    init: init,
    renderRawData: renderRawData,
    exportExcel: exportExcel,
    exportCSV: exportCSV,
    exportMatrixExcel: exportMatrixExcel,
    initEvents: initEvents,
    DataStore: DataStore,
    state: state
  };
})();
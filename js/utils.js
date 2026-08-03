// utils.js - ES Module
import { CONFIG, safeFixed } from './core';

  // ===== V13: safeHTML - 安全HTML赋值（防XSS） =====
  function safeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  }

  // ===== UTILITY =====
  function num(v) {
    if (v === null || v === undefined || v === '' || v === '-') return 0;
    const n = parseFloat(String(v).replace(/,/g, ''));
    return isNaN(n) ? 0 : n;
  }
  function fmtWan(n) {
    if (n == null || isNaN(n)) return 'N/A';
    const abs = Math.abs(n);
    if (abs >= 100000000) return safeFixed(n / 100000000, 2) + '亿';
    if (abs >= 10000) return safeFixed(n / 10000, 2) + '万';
    return n.toLocaleString('zh-CN', { maximumFractionDigits: 0 });
  }
  function fmtUE(n) {
    if (n == null || isNaN(n)) return 'N/A';
    if (n === 0 && arguments.length === 1) return '-';
    return safeFixed(n, 2);
  }
  function fmtPct(n) {
    if (n == null || isNaN(n)) return 'N/A';
    return safeFixed(n * 100, 2) + '%';
  }
  function fmtInt(n) {
    if (n == null || isNaN(n)) return 'N/A';
    return Math.round(n).toLocaleString('zh-CN');
  }
  function displayName(excelName) {
    return CONFIG.CITY_DISPLAY_MAP[excelName] || excelName;
  }


// ===== ES Module Exports =====
export { safeHTML, num, fmtWan, fmtUE, fmtPct, fmtInt, displayName };

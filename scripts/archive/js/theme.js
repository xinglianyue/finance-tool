// theme.js - ES Module
import { _chartInstances } from './core';

// ===== V13: 暗色模式切换 =====
function toggleTheme() {
  var current = document.documentElement.getAttribute('data-theme');
  var next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('finance-theme', next);
  var btn = document.getElementById('themeToggle');
  var navBtn = document.getElementById('navThemeToggle');
  if (btn) {
    var isDark = next === 'dark';
    btn.innerHTML = isDark ? '&#9728;' : '&#9790;';
  }
  if (navBtn) navBtn.innerHTML = isDark ? '&#9728;' : '&#9790;';
  Object.keys(_chartInstances || {}).forEach(function(k) {
    if (_chartInstances[k]) {
      _chartInstances[k].options.color = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim();
      _chartInstances[k].update();
    }
  });
}

function updateThemeIcon() {
  var btn = document.getElementById('themeToggle');
  if (btn) {
    var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    btn.innerHTML = isDark ? '&#9728;' : '&#9790;';
  }
}

// 初始化：恢复保存的主题 + 绑定事件
function initTheme() {
  var saved = localStorage.getItem('finance-theme');
  if (saved) document.documentElement.setAttribute('data-theme', saved);
  var btn = document.getElementById('themeToggle');
  if (btn) {
    updateThemeIcon();
    btn.addEventListener('click', toggleTheme);
  }
  var navBtn = document.getElementById('navThemeToggle');
  if (navBtn) {
    navBtn.addEventListener('click', toggleTheme);
  }
}

// ===== ES Module Exports =====
export { toggleTheme };
export { initTheme };

#!/usr/bin/env node
/**
 * 真实语法校验：提取 HTML 中所有内联 <script> 块，用 Node 解析器逐块校验。
 * 防止"单文件 HTML 应用"修改后出现语法错误导致整页白屏。
 * 用法: node test/check-syntax.cjs [file...]
 * 默认检查: index-new.html upload-data.html
 * 注意：必须为 .cjs 扩展名（package.json 设定了 "type": "module"）
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

const DEFAULT_FILES = ['index-new.html', 'upload-data.html'];

function extractInlineScripts(content) {
  // 匹配 <script> ... </script>（不含 src 属性的内联脚本）
  const blocks = [];
  const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(content)) !== null) {
    const code = m[1];
    if (code && code.trim()) blocks.push(code);
  }
  return blocks;
}

function checkBlock(code) {
  const tmp = path.join(os.tmpdir(), `tres_${Date.now()}_${Math.floor(Math.random() * 1e6)}.js`);
  fs.writeFileSync(tmp, code, 'utf-8');
  const r = spawnSync('node', ['--check', tmp], { encoding: 'utf-8' });
  fs.unlinkSync(tmp);
  return { ok: r.status === 0, error: r.stderr || r.stdout };
}

let failed = false;
const targets = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_FILES;

for (const file of targets) {
  if (!fs.existsSync(file)) {
    console.error(`✗ 文件不存在: ${file}`);
    failed = true;
    continue;
  }
  const content = fs.readFileSync(file, 'utf-8');
  const blocks = extractInlineScripts(content);
  console.log(`\n检查 ${file}: ${blocks.length} 个内联脚本块`);
  let blockFail = false;
  blocks.forEach((code, i) => {
    const label = `${file} 脚本块 #${i + 1}`;
    const res = checkBlock(code);
    if (res.ok) {
      console.log(`  ✓ ${label}`);
    } else {
      failed = true;
      blockFail = true;
      console.error(`  ✗ ${label} 语法错误:`);
      res.error.split('\n').slice(0, 6).forEach(l => { if (l.trim()) console.error(`      ${l}`); });
    }
  });
  if (!blockFail) console.log(`  → ${file} 全部通过`);
}

// 关键全局符号存在性检查（防止重复定义/丢失）
const content = fs.readFileSync('index-new.html', 'utf-8');
const needed = ['class StateManagerClass', 'getDataToSave()', 'function DataStore()', 'window.StateManager = new StateManagerClass()'];
for (const sym of needed) {
  if (!content.includes(sym)) {
    console.error(`✗ index-new.html 缺少关键定义: ${sym}`);
    failed = true;
  }
}

if (failed) {
  console.error('\n✗ 语法校验未通过');
  process.exit(1);
} else {
  console.log('\n✓ 全部语法校验通过');
  process.exit(0);
}

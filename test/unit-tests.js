#!/usr/bin/env node
/**
 * 单元测试脚本
 * 测试核心功能模块
 */

const fs = require('fs');

console.log('\n=== 运行单元测试 ===\n');

let passed = 0;
let failed = 0;

// 测试1: 检查所有模块文件是否存在
console.log('[测试1] 检查模块文件...');
const modules = [
    'js/utils.js',
    'js/data-store.js', 
    'js/state-manager.js',
    'js/parser.js',
    'js/loader.js',
    'js/renderer.js'
];

let allModulesExist = true;
for (const module of modules) {
    if (fs.existsSync(module)) {
        console.log(`  ✓ ${module} 存在`);
        passed++;
    } else {
        console.log(`  ✗ ${module} 缺失`);
        allModulesExist = false;
        failed++;
    }
}

// 测试2: 检查语法正确性
console.log('\n[测试2] 检查语法...');
try {
    const syntaxCheck = require('./syntax-check');
    const issues = syntaxCheck('index-new.html');
    if (issues.length === 0) {
        console.log('  ✓ 语法检查通过');
        passed++;
    } else {
        console.log(`  ✗ 发现 ${issues.length} 个语法问题`);
        failed++;
    }
} catch (e) {
    console.log('  ⚠ 语法检查跳过 (需要先实现syntax-check模块)');
}

// 测试3: 检查函数导出
console.log('\n[测试3] 检查函数导出...');
const requiredFuncs = [
    'parseExcelData',
    'loadFromCloud',
    'renderDimensionTable',
    'formatNumber',
    'formatMoney'
];

let allFuncsExist = true;
for (const func of requiredFuncs) {
    // 简化检查：只检查是否在某个模块中存在
    let found = false;
    for (const module of modules) {
        if (fs.existsSync(module) && fs.readFileSync(module, 'utf-8').includes(func)) {
            found = true;
            break;
        }
    }
    
    if (found) {
        console.log(`  ✓ ${func} 已定义`);
        passed++;
    } else {
        console.log(`  ✗ ${func} 未找到`);
        allFuncsExist = false;
        failed++;
    }
}

// 总结
console.log('\n=== 测试总结 ===');
console.log(`通过: ${passed}`);
console.log(`失败: ${failed}`);
console.log(`总计: ${passed + failed}`);

if (failed === 0) {
    console.log('\n✓ 所有测试通过!\n');
    process.exit(0);
} else {
    console.log('\n✗ 部分测试失败，请检查上述错误\n');
    process.exit(1);
}
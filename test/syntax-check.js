#!/usr/bin/env node
/**
 * 语法检查脚本 - 检测JavaScript语法错误
 * 使用方法: node test/syntax-check.js [file]
 */

const fs = require('fs');

function checkSyntax(filePath) {
    if (!fs.existsSync(filePath)) {
        console.error(`错误: 文件不存在 - ${filePath}`);
        process.exit(1);
    }
    
    const content = fs.readFileSync(filePath, 'utf-8');
    const issues = [];
    
    // 1. 括号平衡检查
    let braceCount = 0;
    for (let i = 0; i < content.length; i++) {
        if (content[i] === '{') braceCount++;
        else if (content[i] === '}') braceCount--;
        
        if (braceCount < 0) {
            issues.push({ type: 'error', message: '发现多余的闭合括号 }' });
            break;
        }
    }
    
    if (braceCount !== 0) {
        issues.push({ type: 'error', message: `括号不平衡: 缺少 ${braceCount} 个 }` });
    }
    
    // 2. 重复关键字检查
    if (content.includes('function function')) {
        issues.push({ type: 'error', message: '发现重复的 "function function"' });
    }
    if (content.includes('async async')) {
        issues.push({ type: 'error', message: '发现重复的 "async async"' });
    }
    
    // 3. 关键函数存在性检查
    const requiredFunctions = [
        'switchTab', 'updateVersion', 'loadFromCloud',
        'switchImportDate', 'checkCloudForUpdates', 'buildV3Data', 'parseRecord'
    ];
    
    for (const func of requiredFunctions) {
        const hasFunction = content.includes(`function ${func}(`) || 
                           content.includes(`async function ${func}(`);
        if (!hasFunction) {
            issues.push({ type: 'error', message: `关键函数 ${func} 未定义` });
        }
    }
    
    return issues;
}

function main() {
    const filePath = process.argv[2] || 'index-new.html';
    
    console.log(`\n开始检查: ${filePath}\n`);
    
    const issues = checkSyntax(filePath);
    
    if (issues.length === 0) {
        console.log('检查通过! 未发现语法错误\n');
        console.log('✓ 括号平衡 ✓ 无重复关键字 ✓ 关键函数存在\n');
        process.exit(0);
    } else {
        console.log('发现语法问题:\n');
        issues.forEach((issue, idx) => {
            console.log(`  ${idx + 1}. [${issue.type.toUpperCase()}] ${issue.message}`);
        });
        console.log('\n请修复上述错误后重新检查\n');
        process.exit(1);
    }
}

main();
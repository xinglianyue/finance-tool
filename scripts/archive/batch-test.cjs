// 财务分析工具 - 批量测试脚本 (Node.js)
// 运行方式: node batch-test.cjs

const fs = require('fs');

console.log('🔄 财务分析工具 - 批量测试 (100次模拟)\n');

try {
    console.log('📦 读取分析模块代码...');
    
    const analyzerCode = fs.readFileSync('./js/analyzer/analyzer-engine.js', 'utf8');
    const importerCode = fs.readFileSync('./js/analyzer/data-importer.js', 'utf8');
    const enhancedAnalyzerCode = fs.readFileSync('./js/analyzer/enhanced-analyzer.js', 'utf8');
    const enhancedRootCauseCode = fs.readFileSync('./js/analyzer/enhanced-root-cause.js', 'utf8');
    const enhancedSuggestionCode = fs.readFileSync('./js/analyzer/enhanced-suggestion.js', 'utf8');
    
    console.log('✅ 所有代码文件读取成功\n');
    
    console.log('📦 设置模拟浏览器环境...');
    
    global.window = {};
    global.document = { 
        createElement: () => ({ getContext: () => ({}) }),
        getElementById: () => null,
        createTextNode: () => ({ nodeValue: '' }),
        querySelector: () => null,
        querySelectorAll: () => []
    };
    
    console.log('✅ 环境设置完成\n');
    
    console.log('📦 合并并加载所有模块...');
    
    const combinedCode = `
        ${analyzerCode}
        ${importerCode}
        ${enhancedAnalyzerCode}
        ${enhancedRootCauseCode}
        ${enhancedSuggestionCode}
    `;
    
    try {
        new Function(combinedCode)();
        console.log('✅ 所有模块加载成功\n');
    } catch (e) {
        console.log('❌ 模块加载失败:', e.message);
        throw e;
    }
    
    if (!window.CompleteFinancialAnalyzer) {
        throw new Error('CompleteFinancialAnalyzer 未找到');
    }
    
    const CompleteFinancialAnalyzer = window.CompleteFinancialAnalyzer;
    console.log('✅ CompleteFinancialAnalyzer 已就绪\n');
    
    const TEST_COUNT = 100;
    const cities = [
        { name: '承德', tier: 'tier1', displayName: '承德' },
        { name: '围场', tier: 'tier2', displayName: '围场' },
        { name: '安平', tier: 'tier3', displayName: '安平' },
        { name: '张家口', tier: 'tier2', displayName: '张家口' },
        { name: '石家庄', tier: 'tier1', displayName: '石家庄' },
        { name: '秦皇岛', tier: 'tier2', displayName: '秦皇岛' },
        { name: '唐山', tier: 'tier1', displayName: '唐山' },
        { name: '保定', tier: 'tier2', displayName: '保定' },
        { name: '廊坊', tier: 'tier2', displayName: '廊坊' },
        { name: '衡水', tier: 'tier3', displayName: '衡水' }
    ];
    
    const modules = ['all', 'food', 'flash', 'medicine', 'group'];
    
    function generateRandomData() {
        const result = { cities: [] };
        cities.forEach(city => {
            const cityData = { name: city.name, displayName: city.displayName, modules: {} };
            modules.forEach(mod => {
                const baseUE = {
                    all: 0.5 + (Math.random() - 0.5) * 1.0,
                    food: 0.3 + (Math.random() - 0.5) * 0.8,
                    flash: -0.3 + (Math.random() - 0.5) * 1.0,
                    medicine: 1.5 + (Math.random() - 0.5) * 2.0,
                    group: -0.5 + (Math.random() - 0.5) * 1.0
                }[mod];
                cityData.modules[mod] = {
                    orders: Math.floor(1000 + Math.random() * 99000),
                    ue: parseFloat(baseUE.toFixed(2)),
                    subsidyRatio: parseFloat((0.02 + Math.random() * 0.15).toFixed(4)),
                    deliveryCost: Math.floor(5000 + Math.random() * 995000),
                    profit: Math.floor((Math.random() - 0.3) * 200000)
                };
            });
            result.cities.push(cityData);
        });
        return result;
    }
    
    function validateResult(result, iteration) {
        const issues = [];
        if (!result || typeof result !== 'object') {
            issues.push({ type: 'critical', message: `第${iteration}次分析返回空结果` });
            return issues;
        }
        if (!result.health || typeof result.health.overall !== 'number') {
            issues.push({ type: 'critical', message: `第${iteration}次分析健康度缺失` });
        }
        if (!Array.isArray(result.anomalies)) {
            issues.push({ type: 'warning', message: `第${iteration}次分析异常列表不是数组` });
        }
        if (!Array.isArray(result.suggestions)) {
            issues.push({ type: 'warning', message: `第${iteration}次分析建议列表不是数组` });
        }
        if (!Array.isArray(result.insights)) {
            issues.push({ type: 'warning', message: `第${iteration}次分析洞察列表不是数组` });
        }
        return issues;
    }
    
    console.log(`🚀 开始${TEST_COUNT}次分析测试...\n`);
    
    let successCount = 0, failCount = 0, totalTime = 0;
    let allIssues = [];
    let anomalyStats = { total: 0, critical: 0, warning: 0, info: 0 };
    let suggestionStats = { P0: 0, P1: 0, P2: 0 };
    
    for (let i = 1; i <= TEST_COUNT; i++) {
        const startTime = Date.now();
        try {
            const data = generateRandomData();
            const analyzer = new CompleteFinancialAnalyzer();
            const result = analyzer.analyze(data);
            
            const issues = validateResult(result, i);
            allIssues = allIssues.concat(issues);
            
            if (result.anomalies) {
                anomalyStats.total += result.anomalies.length;
                result.anomalies.forEach(a => {
                    if (a.severity === 'critical') anomalyStats.critical++;
                    else if (a.severity === 'warning') anomalyStats.warning++;
                    else anomalyStats.info++;
                });
            }
            
            if (result.suggestions) {
                result.suggestions.forEach(s => {
                    if (s.priority === 'P0') suggestionStats.P0++;
                    else if (s.priority === 'P1') suggestionStats.P1++;
                    else if (s.priority === 'P2') suggestionStats.P2++;
                });
            }
            
            successCount++;
            totalTime += Date.now() - startTime;
            
            if (i % 20 === 0) {
                console.log(`  进度: ${i}/${TEST_COUNT} | 成功: ${successCount} | 平均耗时: ${Math.round(totalTime / i)}ms`);
            }
            
        } catch (error) {
            failCount++;
            allIssues.push({ type: 'critical', message: `第${i}次分析异常: ${error.message}` });
            console.log(`❌ 第${i}次分析失败: ${error.message}`);
        }
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('📊 测试结果汇总');
    console.log('='.repeat(70));
    
    console.log(`\n✅ 成功: ${successCount}次 (${Math.round(successCount / TEST_COUNT * 100)}%)`);
    console.log(`❌ 失败: ${failCount}次 (${Math.round(failCount / TEST_COUNT * 100)}%)`);
    console.log(`⏱️  平均耗时: ${Math.round(totalTime / TEST_COUNT)}ms`);
    
    console.log('\n📈 异常检测统计:');
    console.log(`  ├─ 总异常数: ${anomalyStats.total}`);
    console.log(`  ├─ 严重异常: ${anomalyStats.critical}`);
    console.log(`  ├─ 警告异常: ${anomalyStats.warning}`);
    console.log(`  └─ 信息异常: ${anomalyStats.info}`);
    
    console.log('\n📋 建议生成统计:');
    console.log(`  ├─ P0紧急建议: ${suggestionStats.P0}`);
    console.log(`  ├─ P1重要建议: ${suggestionStats.P1}`);
    console.log(`  └─ P2一般建议: ${suggestionStats.P2}`);
    
    if (allIssues.length > 0) {
        console.log('\n⚠️ 发现的问题:');
        
        const issueGroups = { critical: [], warning: [], info: [] };
        allIssues.forEach(issue => issueGroups[issue.type].push(issue.message));
        
        if (issueGroups.critical.length > 0) {
            console.log('\n  🔴 严重问题 (' + issueGroups.critical.length + '):');
            issueGroups.critical.slice(0, 5).forEach((msg, i) => console.log(`    ${i+1}. ${msg}`));
            if (issueGroups.critical.length > 5) console.log(`    ... (还有${issueGroups.critical.length - 5}个)`);
        }
        
        if (issueGroups.warning.length > 0) {
            console.log('\n  🟡 警告 (' + issueGroups.warning.length + '):');
            issueGroups.warning.slice(0, 5).forEach((msg, i) => console.log(`    ${i+1}. ${msg}`));
            if (issueGroups.warning.length > 5) console.log(`    ... (还有${issueGroups.warning.length - 5}个)`);
        }
        
        if (issueGroups.info.length > 0) {
            console.log('\n  🔵 信息 (' + issueGroups.info.length + '):');
            issueGroups.info.slice(0, 5).forEach((msg, i) => console.log(`    ${i+1}. ${msg}`));
            if (issueGroups.info.length > 5) console.log(`    ... (还有${issueGroups.info.length - 5}个)`);
        }
        
        console.log('\n📝 问题总结:');
        console.log(`  - 严重问题: ${issueGroups.critical.length}个`);
        console.log(`  - 警告问题: ${issueGroups.warning.length}个`);
        console.log(`  - 信息问题: ${issueGroups.info.length}个`);
        console.log(`  - 总问题数: ${allIssues.length}个`);
    } else {
        console.log('\n🎉 未发现问题，所有测试通过!');
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('测试完成!');
    console.log('='.repeat(70));
    
} catch (error) {
    console.error('❌ 测试失败:', error.message);
    process.exit(1);
}

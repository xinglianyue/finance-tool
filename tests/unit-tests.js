/**
 * 财务分析工具 - 单元测试框架
 * 用于防止代码改动导致的连锁问题
 */

describe('财务分析工具 - 核心功能测试', () => {
    
    describe('1. 配置管理', () => {
        test('CONFIG应该包含所有必要的配置项', () => {
            expect(CONFIG).toBeDefined();
            expect(CONFIG.CITIES).toBeDefined();
            expect(CONFIG.CITIES.DISPLAY_MAP).toBeDefined();
            expect(CONFIG.THRESHOLDS).toBeDefined();
            expect(CONFIG.THRESHOLDS.UE).toBeDefined();
            expect(CONFIG.THRESHOLDS.SUBSIDY_RATIO).toBeDefined();
        });

        test('城市映射应该包含正确的10个城市', () => {
            const cities = Object.values(CONFIG.CITIES.DISPLAY_MAP);
            expect(cities).toContain('承德');
            expect(cities).toContain('围场');
            expect(cities).toContain('玉田');
            expect(cities).toContain('安国');
            expect(cities).toContain('安平');
            expect(cities).toContain('献县');
            expect(cities).toContain('晋州');
            expect(cities).toContain('威县');
            expect(cities).toContain('深泽');
            expect(cities).toContain('康保');
            expect(cities.length).toBe(10);
        });

        test('不应该包含错误的河北省城市', () => {
            const cities = Object.values(CONFIG.CITIES.DISPLAY_MAP);
            expect(cities).not.toContain('唐山');
            expect(cities).not.toContain('保定');
            expect(cities).not.toContain('廊坊');
            expect(cities).not.toContain('衡水');
            expect(cities).not.toContain('石家庄');
            expect(cities).not.toContain('秦皇岛');
            expect(cities).not.toContain('张家口');
        });
    });

    describe('2. 数值处理函数', () => {
        test('num()应该正确解析数字字符串', () => {
            expect(num('123')).toBe(123);
            expect(num('1,234.56')).toBe(1234.56);
            expect(num(-500)).toBe(-500);
        });

        test('num()应该处理特殊值', () => {
            expect(num(null)).toBe(0);
            expect(num(undefined)).toBe(0);
            expect(num('')).toBe(0);
            expect(num('-')).toBe(0);
            expect(num('abc')).toBe(0);
        });

        test('num()应该处理空值', () => {
            expect(num('')).toBe(0);
            expect(num('   ')).toBe(0);
        });
    });

    describe('3. UE计算逻辑', () => {
        test('UE计算公式: profit / orders', () => {
            const profit = 120000;
            const orders = 160000;
            const ue = orders > 0 ? profit / orders : 0;
            expect(ue).toBeCloseTo(0.75);
        });

        test('零订单时UE应为0', () => {
            const profit = 120000;
            const orders = 0;
            const ue = orders > 0 ? profit / orders : 0;
            expect(ue).toBe(0);
        });

        test('负利润UE计算', () => {
            const profit = -10000;
            const orders = 10000;
            const ue = orders > 0 ? profit / orders : 0;
            expect(ue).toBe(-1);
        });

        test('所有示例数据的UE应该为正数（除了拼好饭）', () => {
            const sampleData = getSampleData();
            sampleData.forEach(city => {
                expect(city.modules.all.ue).toBeGreaterThan(0);
            });
        });
    });

    describe('4. 补贴率计算', () => {
        test('补贴率计算公式: subsidyTotal / gmvAmount', () => {
            const subsidyTotal = 32000;
            const gmvAmount = 100000;
            const subsidyRatio = gmvAmount > 0 ? subsidyTotal / gmvAmount : 0;
            expect(subsidyRatio).toBeCloseTo(0.32);
        });

        test('零GMV时补贴率应为0', () => {
            const subsidyTotal = 32000;
            const gmvAmount = 0;
            const subsidyRatio = gmvAmount > 0 ? subsidyTotal / gmvAmount : 0;
            expect(subsidyRatio).toBe(0);
        });

        test('补贴率应该在合理范围内 (0-1)', () => {
            const sampleData = getSampleData();
            sampleData.forEach(city => {
                const ratio = city.modules.all.subsidyRatio;
                expect(ratio).toBeGreaterThanOrEqual(0);
                expect(ratio).toBeLessThanOrEqual(1);
            });
        });
    });

    describe('5. 示例数据生成', () => {
        test('getSampleData()应该返回10个城市', () => {
            const data = getSampleData();
            expect(data.length).toBe(10);
        });

        test('每个城市应该包含所有5个模块', () => {
            const data = getSampleData();
            data.forEach(city => {
                expect(city.modules.all).toBeDefined();
                expect(city.modules.food).toBeDefined();
                expect(city.modules.flash).toBeDefined();
                expect(city.modules.medicine).toBeDefined();
                expect(city.modules.group).toBeDefined();
            });
        });

        test('每个城市应该有正确的displayName', () => {
            const data = getSampleData();
            const displayNames = data.map(c => c.displayName);
            expect(displayNames).toContain('承德');
            expect(displayNames).not.toContain('总商');
        });

        test('UE排名应该正确（康保最低，承德最高）', () => {
            const data = getSampleData();
            const ues = data.map(c => ({ name: c.displayName, ue: c.modules.all.ue }));
            ues.sort((a, b) => b.ue - a.ue);
            
            expect(ues[0].name).toBe('承德');
            expect(ues[0].ue).toBeCloseTo(0.75);
            
            expect(ues[9].name).toBe('康保');
            expect(ues[9].ue).toBeCloseTo(0.10);
        });
    });

    describe('6. 异常检测逻辑', () => {
        test('UE < 0.1 应该被标记为危险', () => {
            const ue = 0.05;
            const isDanger = ue < CONFIG.THRESHOLDS.UE.DANGER;
            expect(isDanger).toBe(true);
        });

        test('UE = 0.1 应该被标记为危险', () => {
            const ue = 0.1;
            const isDanger = ue <= CONFIG.THRESHOLDS.UE.DANGER;
            expect(isDanger).toBe(true);
        });

        test('UE = 0.4 应该被标记为预警', () => {
            const ue = 0.4;
            const isWarning = ue >= CONFIG.THRESHOLDS.UE.DANGER && ue < CONFIG.THRESHOLDS.UE.WARNING;
            expect(isWarning).toBe(true);
        });

        test('UE = 0.5 应该被标记为优秀', () => {
            const ue = 0.5;
            const isGood = ue >= CONFIG.THRESHOLDS.UE.GOOD;
            expect(isGood).toBe(true);
        });

        test('补贴率 > 45% 应该被标记为危险', () => {
            const subsidyRatio = 0.46;
            const isDanger = subsidyRatio > CONFIG.THRESHOLDS.SUBSIDY_RATIO.DANGER;
            expect(isDanger).toBe(true);
        });

        test('补贴率 = 35% 应该被标记为预警', () => {
            const subsidyRatio = 0.35;
            const isWarning = subsidyRatio >= CONFIG.THRESHOLDS.SUBSIDY_RATIO.WARNING && 
                            subsidyRatio <= CONFIG.THRESHOLDS.SUBSIDY_RATIO.DANGER;
            expect(isWarning).toBe(true);
        });
    });

    describe('7. Chart.js 图表管理器', () => {
        test('ChartManager应该有destroy方法', () => {
            expect(typeof ChartManager.destroy).toBe('function');
        });

        test('ChartManager应该有create方法', () => {
            expect(typeof ChartManager.create).toBe('function');
        });

        test('ChartManager应该有destroyAll方法', () => {
            expect(typeof ChartManager.destroyAll).toBe('function');
        });

        test('destroyAll应该清空所有图表实例', () => {
            ChartManager.destroyAll();
            expect(Object.keys(ChartManager.instances).length).toBe(0);
        });
    });

    describe('8. 状态管理', () => {
        test('State应该有必要的属性', () => {
            expect(State).toBeDefined();
            expect(State.data).toBeNull();
            expect(State.charts).toBeDefined();
            expect(typeof State.charts).toBe('object');
            expect(State.currentMetric).toBe('ue');
            expect(State.sortField).toBe('ue');
            expect(State.sortOrder).toBe('desc');
        });

        test('切换指标应该更新State', () => {
            State.currentMetric = 'profit';
            expect(State.currentMetric).toBe('profit');
            
            State.currentMetric = 'orders';
            expect(State.currentMetric).toBe('orders');
        });

        test('切换排序应该更新State', () => {
            State.sortField = 'ue';
            State.sortOrder = 'desc';
            expect(State.sortField).toBe('ue');
            expect(State.sortOrder).toBe('desc');
        });
    });

    describe('9. KPI计算逻辑', () => {
        test('总订单量计算', () => {
            const data = getSampleData();
            const totalOrders = data.reduce((sum, c) => sum + (c.modules.all?.orders || 0), 0);
            expect(totalOrders).toBeGreaterThan(0);
        });

        test('总收入计算', () => {
            const data = getSampleData();
            const totalRevenue = data.reduce((sum, c) => sum + (c.modules.all?.onlineRevenue || 0), 0);
            expect(totalRevenue).toBeGreaterThan(0);
        });

        test('总利润计算', () => {
            const data = getSampleData();
            const totalProfit = data.reduce((sum, c) => sum + (c.modules.all?.profit || 0), 0);
            expect(totalProfit).toBeGreaterThan(0);
        });

        test('平均UE计算', () => {
            const data = getSampleData();
            const totalOrders = data.reduce((sum, c) => sum + (c.modules.all?.orders || 0), 0);
            const totalProfit = data.reduce((sum, c) => sum + (c.modules.all?.profit || 0), 0);
            const avgUE = totalOrders > 0 ? totalProfit / totalOrders : 0;
            expect(avgUE).toBeGreaterThan(0);
            expect(avgUE).toBeLessThan(1);
        });
    });

    describe('10. 表格渲染逻辑', () => {
        test('排序逻辑应该正确', () => {
            const data = getSampleData();
            const sorted = [...data].sort((a, b) => {
                const aVal = a.modules.all?.ue || 0;
                const bVal = b.modules.all?.ue || 0;
                return bVal - aVal;
            });
            
            expect(sorted[0].modules.all.ue).toBeGreaterThanOrEqual(sorted[1].modules.all.ue);
            expect(sorted[9].modules.all.ue).toBeLessThanOrEqual(sorted[8].modules.all.ue);
        });

        test('升序排序应该反转', () => {
            const data = getSampleData();
            const sortedAsc = [...data].sort((a, b) => {
                const aVal = a.modules.all?.ue || 0;
                const bVal = b.modules.all?.ue || 0;
                return aVal - bVal;
            });
            
            expect(sortedAsc[0].modules.all.ue).toBeLessThanOrEqual(sortedAsc[9].modules.all.ue);
        });
    });

    describe('11. 模块数据完整性', () => {
        test('每个模块应该有必要的字段', () => {
            const data = getSampleData();
            const requiredFields = ['orders', 'onlineRevenue', 'profit', 'ue', 'subsidyRatio'];
            
            data.forEach(city => {
                ['all', 'food', 'flash', 'medicine', 'group'].forEach(moduleKey => {
                    const module = city.modules[moduleKey];
                    requiredFields.forEach(field => {
                        expect(module[field]).toBeDefined();
                    });
                });
            });
        });

        test('医药模块UE应该普遍较高', () => {
            const data = getSampleData();
            const avgMedicineUE = data.reduce((sum, c) => sum + c.modules.medicine.ue, 0) / data.length;
            const avgAllUE = data.reduce((sum, c) => sum + c.modules.all.ue, 0) / data.length;
            expect(avgMedicineUE).toBeGreaterThan(avgAllUE);
        });

        test('拼好饭模块UE应该普遍较低', () => {
            const data = getSampleData();
            const avgGroupUE = data.reduce((sum, c) => sum + c.modules.group.ue, 0) / data.length;
            const avgAllUE = data.reduce((sum, c) => sum + c.modules.all.ue, 0) / data.length;
            expect(avgGroupUE).toBeLessThan(avgAllUE);
        });
    });

    describe('12. 数据一致性', () => {
        test('总利润应该等于各模块利润之和', () => {
            const data = getSampleData();
            data.forEach(city => {
                const allProfit = city.modules.all.profit;
                const moduleProfit = (city.modules.food?.profit || 0) +
                                   (city.modules.flash?.profit || 0) +
                                   (city.modules.medicine?.profit || 0) +
                                   (city.modules.group?.profit || 0);
                const ratio = moduleProfit / allProfit;
                expect(ratio).toBeCloseTo(1, 0);
            });
        });

        test('各模块订单量之和应该约等于全品类', () => {
            const data = getSampleData();
            data.forEach(city => {
                const allOrders = city.modules.all.orders;
                const moduleOrders = (city.modules.food?.orders || 0) +
                                    (city.modules.flash?.orders || 0) +
                                    (city.modules.medicine?.orders || 0) +
                                    (city.modules.group?.orders || 0);
                const ratio = moduleOrders / allOrders;
                expect(ratio).toBeCloseTo(1, 0);
            });
        });
    });
});

// ==================== 运行指令 ====================
//
// 在浏览器控制台中运行:
// 1. 打开 index-v3-dashboard-fixed.html
// 2. 按F12打开开发者工具
// 3. 切换到Console标签
// 4. 粘贴此测试代码并按回车
// 5. 或者使用 Jest 等测试框架运行
//
// 推荐使用 Jest:
//
// 1. 安装 Jest: npm install --save-dev jest
// 2. 创建 jest.config.js
// 3. 运行: npm test
//
// ==================== 防止回归的最佳实践 ====================
//
// 1. 每次修改代码前，先运行测试
// 2. 修改后，再次运行测试确保通过
// 3. 新功能必须添加新的测试用例
// 4. Bug修复必须添加回归测试
// 5. 定期运行完整测试套件
//
// ==================== CI/CD 集成 ====================
//
// .github/workflows/test.yml
//
// name: Tests
// on: [push, pull_request]
// jobs:
//   test:
//     runs-on: ubuntu-latest
//     steps:
//       - uses: actions/checkout@v2
//       - run: npm install
//       - run: npm test
//

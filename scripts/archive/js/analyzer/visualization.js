/**
 * 数据可视化模块 v3
 * 包含UE热力图、成本结构图、城市排名等
 */

// UE热力图组件
class UEMatrixHeatmap {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.modules = ['all', 'food', 'flash', 'medicine', 'group'];
    this.moduleNames = {
      all: '全品类',
      food: '餐饮',
      flash: '闪购',
      medicine: '医药',
      group: '拼好饭'
    };
  }

  /**
   * 渲染热力图
   */
  render(data) {
    if (!this.container) return;
    
    // 构建热力图HTML
    let html = `
      <table class="heatmap-table">
        <thead>
          <tr>
            <th>城市</th>
            ${this.modules.map(m => `<th>${this.moduleNames[m]}</th>`).join('')}
            <th>综合</th>
          </tr>
        </thead>
        <tbody>
    `;
    
    // 过滤总商，显示具体城市
    const cities = data.cities.filter(c => c.name !== '总商');
    
    cities.forEach(city => {
      html += `<tr>`;
      html += `<td class="city-name">${city.displayName}</td>`;
      
      // 各模块UE
      this.modules.forEach(mod => {
        const m = city.modules?.[mod];
        if (!m || !m.orders || m.orders === 0) {
          html += `<td class="heatmap-cell no-data">-</td>`;
        } else {
          const ue = m.ue;
          const colorClass = this.getUEColorClass(ue);
          const tooltip = this.getUETooltip(city.displayName, mod, m);
          html += `<td class="heatmap-cell ${colorClass}" title="${tooltip}">
            <span class="ue-value">${ue.toFixed(2)}</span>
          </td>`;
        }
      });
      
      // 综合UE
      const allModule = city.modules?.all;
      if (allModule && allModule.orders > 0) {
        const colorClass = this.getUEColorClass(allModule.ue);
        html += `<td class="heatmap-cell ${colorClass} total">
          <span class="ue-value">${allModule.ue.toFixed(2)}</span>
        </td>`;
      } else {
        html += `<td class="heatmap-cell no-data">-</td>`;
      }
      
      html += `</tr>`;
    });
    
    html += `</tbody></table>`;
    
    // 添加图例
    html += this.renderLegend();
    
    this.container.innerHTML = html;
  }

  /**
   * 获取UE颜色类
   */
  getUEColorClass(ue) {
    if (ue >= 1.5) return 'excellent';
    if (ue >= 1.0) return 'good';
    if (ue >= 0.5) return 'fair';
    if (ue >= 0.2) return 'warning';
    if (ue > 0) return 'poor';
    if (ue > -0.5) return 'critical-light';
    return 'critical';
  }

  /**
   * 获取UE提示
   */
  getUETooltip(cityName, moduleName, moduleData) {
    const ue = moduleData.ue.toFixed(2);
    const orders = (moduleData.orders / 10000).toFixed(1);
    const subsidy = (moduleData.subsidyRatio * 100).toFixed(1);
    return `${cityName} - ${this.moduleNames[moduleName]}\nUE: ${ue}元\n订单量: ${orders}万\n补贴率: ${subsidy}%`;
  }

  /**
   * 渲染图例
   */
  renderLegend() {
    return `
      <div class="heatmap-legend">
        <div class="legend-title">UE热力图图例</div>
        <div class="legend-items">
          <div class="legend-item">
            <span class="legend-color excellent"></span>
            <span class="legend-text">优秀 (≥1.5)</span>
          </div>
          <div class="legend-item">
            <span class="legend-color good"></span>
            <span class="legend-text">良好 (1.0-1.5)</span>
          </div>
          <div class="legend-item">
            <span class="legend-color fair"></span>
            <span class="legend-text">一般 (0.5-1.0)</span>
          </div>
          <div class="legend-item">
            <span class="legend-color warning"></span>
            <span class="legend-text">预警 (0.2-0.5)</span>
          </div>
          <div class="legend-item">
            <span class="legend-color poor"></span>
            <span class="legend-text">较差 (0-0.2)</span>
          </div>
          <div class="legend-item">
            <span class="legend-color critical"></span>
            <span class="legend-text">亏损 (<0)</span>
          </div>
        </div>
      </div>
    `;
  }
}

// 成本结构图组件
class CostStructureChart {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.chart = null;
  }

  /**
   * 渲染成本结构
   */
  render(data) {
    if (!this.container) return;
    
    const city = data.cities.find(c => c.name === '总商') || data.cities[0];
    const module = city.modules?.all;
    
    if (!module) return;
    
    const totalExpense = module.totalExpense || 1;
    const deliveryCost = module.deliveryCost || 0;
    const subsidy = module.subsidyTotal || 0;
    const otherCost = totalExpense - deliveryCost - subsidy;
    
    // 更新HTML显示
    let html = `
      <div class="cost-structure-container">
        <div class="cost-summary">
          <div class="cost-total">
            <span class="label">总成本</span>
            <span class="value">${(totalExpense / 10000).toFixed(1)}万</span>
          </div>
        </div>
        
        <div class="cost-breakdown">
          <div class="cost-item delivery">
            <div class="cost-header">
              <span class="cost-icon">🚚</span>
              <span class="cost-name">配送成本</span>
              <span class="cost-value">${(deliveryCost / 10000).toFixed(1)}万</span>
            </div>
            <div class="cost-bar">
              <div class="cost-fill" style="width: ${(deliveryCost / totalExpense * 100).toFixed(1)}%"></div>
            </div>
            <div class="cost-percent">${(deliveryCost / totalExpense * 100).toFixed(1)}%</div>
          </div>
          
          <div class="cost-item subsidy">
            <div class="cost-header">
              <span class="cost-icon">💰</span>
              <span class="cost-name">补贴成本</span>
              <span class="cost-value">${(subsidy / 10000).toFixed(1)}万</span>
            </div>
            <div class="cost-bar">
              <div class="cost-fill" style="width: ${(subsidy / totalExpense * 100).toFixed(1)}%"></div>
            </div>
            <div class="cost-percent">${(subsidy / totalExpense * 100).toFixed(1)}%</div>
          </div>
          
          <div class="cost-item other">
            <div class="cost-header">
              <span class="cost-icon">📦</span>
              <span class="cost-name">其他成本</span>
              <span class="cost-value">${(otherCost / 10000).toFixed(1)}万</span>
            </div>
            <div class="cost-bar">
              <div class="cost-fill" style="width: ${(otherCost / totalExpense * 100).toFixed(1)}%"></div>
            </div>
            <div class="cost-percent">${(otherCost / totalExpense * 100).toFixed(1)}%</div>
          </div>
        </div>
        
        <div class="cost-insight">
          ${this.generateInsight(deliveryCost / totalExpense, subsidy / totalExpense)}
        </div>
      </div>
    `;
    
    this.container.innerHTML = html;
    
    // 渲染Chart.js图表
    this.renderChart({
      delivery: deliveryCost,
      subsidy: subsidy,
      other: otherCost
    });
  }

  /**
   * 生成洞察
   */
  generateInsight(deliveryRatio, subsidyRatio) {
    const insights = [];
    
    if (deliveryRatio > 0.6) {
      insights.push('⚠️ 配送成本占比过高，建议优化配送效率');
    }
    
    if (subsidyRatio > 0.15) {
      insights.push('⚠️ 补贴成本占比偏高，建议评估补贴策略');
    }
    
    if (deliveryRatio < 0.5 && subsidyRatio < 0.1) {
      insights.push('✅ 成本结构健康');
    }
    
    return `<div class="insight-text">${insights.join('<br>')}</div>`;
  }

  /**
   * 渲染Chart.js饼图
   */
  renderChart(data) {
    const canvas = document.getElementById('costChart');
    if (!canvas) return;
    
    if (this.chart) {
      this.chart.destroy();
    }
    
    this.chart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: ['配送成本', '补贴成本', '其他成本'],
        datasets: [{
          data: [data.delivery, data.subsidy, data.other],
          backgroundColor: ['#4f46e5', '#f59e0b', '#22c55e'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 15,
              usePointStyle: true,
              pointStyle: 'circle'
            }
          }
        }
      }
    });
  }
}

// 城市排名组件
class CityRankingPanel {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.metrics = ['ue', 'orders', 'subsidy', 'profit'];
    this.currentMetric = 'ue';
  }

  /**
   * 渲染排名
   */
  render(data, metric = 'ue') {
    if (!this.container) return;
    this.currentMetric = metric;
    
    // 排序城市
    const cities = data.cities
      .filter(c => c.name !== '总商' && c.modules?.all?.orders > 0)
      .map(city => ({
        name: city.displayName,
        metric: this.getMetricValue(city, metric),
        data: city.modules?.all
      }))
      .filter(c => c.data)
      .sort((a, b) => b.metric - a.metric);
    
    // 构建HTML
    let html = `
      <div class="ranking-controls">
        <button class="ranking-btn ${metric === 'ue' ? 'active' : ''}" onclick="cityRanking.render(data, 'ue')">UE排名</button>
        <button class="ranking-btn ${metric === 'orders' ? 'active' : ''}" onclick="cityRanking.render(data, 'orders')">订单量</button>
        <button class="ranking-btn ${metric === 'subsidy' ? 'active' : ''}" onclick="cityRanking.render(data, 'subsidy')">补贴率</button>
        <button class="ranking-btn ${metric === 'profit' ? 'active' : ''}" onclick="cityRanking.render(data, 'profit')">毛利</button>
      </div>
      
      <div class="ranking-list">
    `;
    
    cities.forEach((city, index) => {
      const rank = index + 1;
      const rankClass = rank <= 3 ? `top-${rank}` : '';
      const metricDisplay = this.formatMetric(city.metric, metric);
      
      html += `
        <div class="ranking-item ${rankClass}">
          <div class="rank-number">${rank}</div>
          <div class="rank-city">${city.name}</div>
          <div class="rank-value">${metricDisplay}</div>
          ${rank <= 3 ? `<div class="rank-badge">Top ${rank}</div>` : ''}
        </div>
      `;
    });
    
    html += `</div>`;
    
    this.container.innerHTML = html;
  }

  /**
   * 获取指标值
   */
  getMetricValue(city, metric) {
    const m = city.modules?.all;
    if (!m) return 0;
    
    switch (metric) {
      case 'ue': return m.ue;
      case 'orders': return m.orders;
      case 'subsidy': return m.subsidyRatio * 100;
      case 'profit': return m.profit;
      default: return 0;
    }
  }

  /**
   * 格式化指标显示
   */
  formatMetric(value, metric) {
    switch (metric) {
      case 'ue': return value.toFixed(2) + '元';
      case 'orders': return (value / 10000).toFixed(1) + '万';
      case 'subsidy': return value.toFixed(1) + '%';
      case 'profit': return (value / 10000).toFixed(1) + '万';
      default: return value;
    }
  }
}

// 趋势对比图组件
class TrendCompareChart {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.chart = null;
    this.metrics = ['orders', 'profit', 'subsidy'];
  }

  /**
   * 渲染趋势图
   */
  render(data, historicalData = null) {
    if (!this.container) return;
    
    const canvas = document.getElementById('trendCompareChart');
    if (!canvas) return;
    
    // 生成模拟历史数据
    const labels = this.generateLabels();
    const datasets = this.generateDatasets(data);
    
    if (this.chart) {
      this.chart.destroy();
    }
    
    this.chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: labels,
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              usePointStyle: true,
              padding: 15
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.dataset.label || '';
                const value = context.parsed.y;
                return `${label}: ${this.formatValue(value, context.dataset.yAxisID)}`;
              }
            }
          }
        },
        scales: {
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: {
              display: true,
              text: '订单量（万）'
            },
            grid: {
              drawOnChartArea: true
            }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            title: {
              display: true,
              text: '金额（万）'
            },
            grid: {
              drawOnChartArea: false
            }
          }
        }
      }
    });
  }

  /**
   * 生成标签
   */
  generateLabels() {
    return ['10月', '11月', '12月', '1月', '2月', '3月', '4月'];
  }

  /**
   * 生成数据集
   */
  generateDatasets(currentData) {
    // 模拟历史趋势
    const baseOrders = (currentData.cities?.find(c => c.name === '总商')?.modules?.all?.orders || 1000000) / 10000;
    const baseProfit = (currentData.cities?.find(c => c.name === '总商')?.modules?.all?.profit || 300000) / 10000;
    const baseSubsidy = (currentData.cities?.find(c => c.name === '总商')?.modules?.all?.subsidyTotal || 300000) / 10000;
    
    return [
      {
        label: '订单量（万）',
        data: this.generateTrendData(baseOrders, 0.05, 0.15),
        borderColor: '#4f46e5',
        backgroundColor: 'rgba(79, 70, 229, 0.1)',
        tension: 0.3,
        yAxisID: 'y'
      },
      {
        label: '毛利（万）',
        data: this.generateTrendData(baseProfit, 0.04, 0.1),
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.3,
        yAxisID: 'y1'
      },
      {
        label: '补贴（万）',
        data: this.generateTrendData(baseSubsidy, -0.03, 0.05),
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        tension: 0.3,
        yAxisID: 'y1'
      }
    ];
  }

  /**
   * 生成趋势数据
   */
  generateTrendData(base, minGrowth, maxGrowth) {
    const data = [];
    let current = base;
    
    for (let i = 0; i < 7; i++) {
      // 最后一期是当前数据
      if (i === 6) {
        data.push(base);
      } else {
        // 模拟增长/下降趋势
        const growth = minGrowth + Math.random() * (maxGrowth - minGrowth);
        current = current / (1 + growth);
        data.push(Math.round(current * 10) / 10);
      }
    }
    
    return data;
  }

  /**
   * 格式化值
   */
  formatValue(value, axisId) {
    if (axisId === 'y') {
      return value.toFixed(1) + '万';
    } else {
      return value.toFixed(1) + '万';
    }
  }
}

// 导出
window.UEMatrixHeatmap = UEMatrixHeatmap;
window.CostStructureChart = CostStructureChart;
window.CityRankingPanel = CityRankingPanel;
window.TrendCompareChart = TrendCompareChart;

console.log('[Viz] 可视化模块加载完成');

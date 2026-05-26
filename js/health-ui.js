// health-ui.js - 健康度分析UI模块（基于知识库框架）
import { state, $, $$, safeLog } from './core';
import { getFilteredCities } from './ui.js';
import { calculationEngine, CalculationEngine } from './calculation-engine.js';
import { healthAnalyzer, HealthAnalyzer } from './health-analysis.js';

const MODULE_NAMES = { all:'全品类', food:'餐饮', flash:'闪购', medicine:'医药', group:'拼好饭' };

function getStatusClass(value) {
  if (value === null || value === undefined || isNaN(value)) return 'gray';
  if (value < 0) return 'danger';
  if (value < 0.3) return 'warning';
  return 'success';
}

function getStatusIcon(status) {
  if (status === 'good' || status === 'success') return '🟢';
  if (status === 'warning') return '🟡';
  if (status === 'danger') return '🔴';
  return '⚪';
}

function getStars(score) {
  const stars = Math.round(score / 20);
  return '⭐'.repeat(Math.max(0, Math.min(5, stars))) + '☆'.repeat(Math.max(0, 5 - stars));
}

function formatMoney(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return '-';
  if (Math.abs(amount) >= 100000000) return (amount / 100000000).toFixed(2) + '亿';
  if (Math.abs(amount) >= 10000) return (amount / 10000).toFixed(1) + '万';
  return amount.toFixed(0);
}

// 渲染健康度分析Tab页
export function renderHealthTab() {
  if (!state.currentData || !state.currentData.cities) {
    const pane = $('#paneHealth');
    if (pane) {
      pane.innerHTML = '<div class="empty-state"><div class="empty-icon">📊</div><div class="empty-text">请先上传数据后再查看健康度分析</div></div>';
    }
    return;
  }

  const cities = getFilteredCities();
  if (!cities || cities.length === 0) {
    const pane = $('#paneHealth');
    if (pane) {
      pane.innerHTML = '<div class="empty-state"><div class="empty-icon">🏙️</div><div class="empty-text">请选择要分析的城市</div></div>';
    }
    return;
  }

  const pane = $('#paneHealth');
  if (!pane) return;

  pane.innerHTML = `
    <div style="margin-bottom:16px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <h3 style="margin:0;font-size:16px;">城市健康度概览</h3>
        <span style="color:var(--text-secondary);font-size:13px;">${cities.length} 个城市</span>
      </div>
      <div id="healthCityGrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px;"></div>
    </div>

    <div id="healthCityDetail" class="hidden" style="margin-top:16px;">
      <div class="matrix-card">
        <div class="matrix-header">
          <span id="healthCityTitle">城市详情</span>
          <button class="export-btn" id="closeHealthDetail" style="background:var(--bg-hover);border:1px solid var(--border);padding:6px 12px;font-size:12px;">
            关闭详情
          </button>
        </div>
        <div id="healthDetailContent"></div>
      </div>
    </div>
  `;

  renderHealthCityGrid(cities);

  const closeBtn = $('#closeHealthDetail');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      $('#healthCityDetail').classList.add('hidden');
    });
  }
}

// 渲染城市健康度卡片网格
function renderHealthCityGrid(cities) {
  const grid = $('#healthCityGrid');
  if (!grid) return;

  grid.innerHTML = cities.map(city => {
    const cityAnalysis = calculateCityAnalysis(city);
    const healthEval = healthAnalyzer.evaluateCityHealth(cityAnalysis);
    
    const allModule = city.modules?.all;
    const ue = allModule?.ue || 0;
    const profit = allModule?.profit || 0;
    const orders = allModule?.orders || 0;

    return `
      <div class="stat-card" style="cursor:pointer;text-align:left;" data-city="${city.name}" data-city-display="${city.displayName}">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
          <div style="font-weight:700;font-size:14px;">${city.displayName}</div>
          <div style="font-size:24px;">${getStars(healthEval?.overall?.score || 0)}</div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div>
            <div style="font-size:11px;color:var(--text-secondary);margin-bottom:2px;">综合得分</div>
            <div style="font-weight:700;font-size:16px;">${healthEval?.overall?.score || 0}分</div>
          </div>
          <div>
            <div style="font-size:11px;color:var(--text-secondary);margin-bottom:2px;">UE</div>
            <div style="font-weight:700;font-size:16px;color:${ue < 0 ? 'var(--danger)' : ue < 0.3 ? 'var(--warning)' : 'var(--success)'};">
              ${(ue * 100).toFixed(1)}分
            </div>
          </div>
          <div>
            <div style="font-size:11px;color:var(--text-secondary);margin-bottom:2px;">订单量</div>
            <div style="font-weight:600;font-size:13px;">${formatMoney(orders)}</div>
          </div>
          <div>
            <div style="font-size:11px;color:var(--text-secondary);margin-bottom:2px;">利润</div>
            <div style="font-weight:600;font-size:13px;color:${profit < 0 ? 'var(--danger)' : 'var(--success)'};">
              ${profit >= 0 ? '+' : ''}¥${formatMoney(profit)}
            </div>
          </div>
        </div>
        <div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border);display:flex;gap:6px;flex-wrap:wrap;">
          <span title="UE健康" style="font-size:14px;">${getStatusIcon(healthEval?.ue?.status)}</span>
          <span title="收入健康" style="font-size:14px;">${getStatusIcon(healthEval?.income?.status)}</span>
          <span title="成本健康" style="font-size:14px;">${getStatusIcon(healthEval?.cost?.status)}</span>
          <span title="模式健康" style="font-size:14px;">${getStatusIcon(healthEval?.mode?.status)}</span>
        </div>
      </div>
    `;
  }).join('');

  grid.querySelectorAll('.stat-card').forEach(card => {
    card.addEventListener('click', () => {
      const cityName = card.dataset.city;
      const city = state.currentData.cities.find(c => c.name === cityName);
      if (city) {
        renderHealthCityDetail(city);
      }
    });
  });
}

// 计算城市分析数据
export function calculateCityAnalysis(city) {
  const analysis = {
    name: city.name,
    displayName: city.displayName,
    modules: {}
  };

  for (const [key, data] of Object.entries(city.modules || {})) {
    analysis.modules[key] = calculationEngine.calculateModuleMetrics(data);
  }

  return analysis;
}

// 渲染城市健康度详情
function renderHealthCityDetail(city) {
  const cityAnalysis = calculateCityAnalysis(city);
  const healthEval = healthAnalyzer.evaluateCityHealth(cityAnalysis);
  const classification = healthAnalyzer.classifyCity(cityAnalysis);
  const problems = healthAnalyzer.diagnoseProblems(cityAnalysis);
  const recommendations = healthAnalyzer.generateRecommendations();

  const title = $('#healthCityTitle');
  const content = $('#healthDetailContent');
  const container = $('#healthCityDetail');

  if (!title || !content || !container) return;

  title.textContent = city.displayName + ' - 健康度分析';
  container.classList.remove('hidden');

  const allModule = cityAnalysis.modules?.all;

  content.innerHTML = `
    <div style="display:grid;grid-template-columns:2fr 3fr;gap:20px;">
      <div>
        <div class="matrix-card" style="margin-bottom:12px;">
          <div class="matrix-header" style="border-bottom:none;padding-bottom:8px;">
            <span>🩺 健康度评分</span>
          </div>
          <div style="padding:0 16px 16px;">
            <div style="text-align:center;margin-bottom:16px;">
              <div style="font-size:48px;font-weight:700;">${healthEval?.overall?.score || 0}</div>
              <div style="font-size:20px;margin:8px 0;">${getStars(healthEval?.overall?.score || 0)}</div>
              <div style="font-size:14px;color:var(--text-secondary);">${classification?.description || ''}</div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
              ${renderHealthScoreItem('💵', 'UE健康', healthEval?.ue)}
              ${renderHealthScoreItem('📊', '收入健康', healthEval?.income)}
              ${renderHealthScoreItem('💰', '成本健康', healthEval?.cost)}
              ${renderHealthScoreItem('🏭', '模式健康', healthEval?.mode)}
            </div>
          </div>
        </div>
        <div class="matrix-card">
          <div class="matrix-header" style="border-bottom:none;padding-bottom:8px;">
            <span>💡 优化建议</span>
          </div>
          <div style="padding:0 16px 16px;">
            ${recommendations.length ? recommendations.map(r => `
              <div style="padding:10px;border-radius:8px;margin-bottom:8px;background:${r.priority === 'high' ? 'var(--danger-light)' : r.priority === 'medium' ? 'var(--warning-light)' : 'var(--success-light)'};">
                <div style="font-weight:600;font-size:13px;margin-bottom:4px;">${r.title}</div>
                <div style="font-size:12px;color:var(--text-secondary);">${r.content}</div>
              </div>
            `).join('') : '<div style="text-align:center;color:var(--text-secondary);padding:20px;">暂无建议</div>'}
          </div>
        </div>
      </div>

      <div>
        <div class="matrix-card" style="margin-bottom:12px;">
          <div class="matrix-header" style="border-bottom:none;padding-bottom:8px;">
            <span>⚠️ 问题诊断</span>
          </div>
          <div style="padding:0 16px 16px;">
            ${problems.length ? problems.map(p => `
              <div style="padding:10px;border-radius:8px;margin-bottom:8px;border-left:4px solid ${p.severity === 'critical' ? 'var(--danger)' : 'var(--warning)'};background:${p.severity === 'critical' ? 'var(--danger-light)' : 'var(--warning-light)'};">
                <div style="font-weight:600;font-size:13px;margin-bottom:4px;">${p.title}</div>
                <div style="font-size:12px;color:var(--text-secondary);">${p.description}</div>
              </div>
            `).join('') : '<div style="text-align:center;color:var(--success);padding:20px;">✅ 暂未发现明显问题</div>'}
          </div>
        </div>

        <div class="matrix-card">
          <div class="matrix-header" style="border-bottom:none;padding-bottom:8px;">
            <span>📋 模块指标</span>
          </div>
          <div style="padding:0 16px 16px;overflow-x:auto;">
            <table class="data-table" style="width:100%;">
              <thead>
                <tr>
                  <th>模块</th>
                  <th>UE</th>
                  <th>单均价</th>
                  <th>抽佣率</th>
                  <th>加盟占比</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                ${Object.entries(cityAnalysis.modules || {}).map(([key, metrics]) => {
                  const ue = metrics.ue || 0;
                  let status = ue >= 0.3 ? 'success' : ue >= 0 ? 'warning' : 'danger';
                  let statusText = ue >= 0.3 ? '健康' : ue >= 0 ? '关注' : '问题';
                  return `
                    <tr>
                      <td style="font-weight:600;">${MODULE_NAMES[key] || key}</td>
                      <td style="font-weight:700;color:${ue < 0 ? 'var(--danger)' : ue < 0.3 ? 'var(--warning)' : 'var(--success)'};">${(ue * 100).toFixed(1)}分</td>
                      <td>¥${metrics.avgOrderValue ? metrics.avgOrderValue.toFixed(1) : '-'}</td>
                      <td>${(metrics.commissionRate * 100).toFixed(1)}%</td>
                      <td>${(metrics.franchiseRatio * 100).toFixed(1)}%</td>
                      <td><span class="badge badge-${status}">${statusText}</span></td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderHealthScoreItem(icon, label, data) {
  if (!data) return '';
  return `
    <div style="text-align:center;padding:8px;border-radius:8px;background:var(--bg-hover);">
      <div style="font-size:18px;margin-bottom:4px;">${icon}</div>
      <div style="font-size:11px;color:var(--text-secondary);margin-bottom:2px;">${label}</div>
      <div style="font-size:16px;font-weight:700;">${getStatusIcon(data.status)} ${data.score}分</div>
      <div style="font-size:10px;color:var(--text-secondary);margin-top:4px;line-height:1.3;">${data.description || ''}</div>
    </div>
  `;
}

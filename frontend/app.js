/**
 * Latency Tracker - Frontend Application
 * Fetches latency data from the backend API and renders charts + domain cards
 */

// Configuration
const API_BASE_URL = ''; // Empty for relative calls when served by the same backend
const REFRESH_INTERVAL_MS = 30000; // 30 seconds
// State
let latencyChart = null;
let currentTimeRangeHours = 24;
let allData = [];
let trackedDomains = []; // Dynamic domain list

const DOMAIN_COLORS = {
    'google.com': '#4285f4',
    'icloud.com': '#a3aaae',
    'duckduckgo.com': '#de5833',
    'cloudflare.com': '#f38020',
    'fly.customer.io': '#8b5cf6'
};

const EXTRA_COLORS = ['#ec4899', '#f97316', '#84cc16', '#06b6d4', '#6366f1', '#a855f7'];

// DOM Elements
const statusBadge = document.getElementById('statusBadge');
const domainCardsContainer = document.getElementById('domainCards');
const lastUpdatedEl = document.getElementById('lastUpdated');
const timeFilterEl = document.getElementById('timeFilter');

// Stats elements
const avgLatencyEl = document.getElementById('avgLatency');
const bestLatencyEl = document.getElementById('bestLatency');
const worstLatencyEl = document.getElementById('worstLatency');
const totalPingsEl = document.getElementById('totalPings');

// Modal Elements
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeModal = document.getElementById('closeModal');
const modalDomainList = document.getElementById('modalDomainList');
const newDomainInput = document.getElementById('newDomainInput');
const addDomainBtn = document.getElementById('addDomainBtn');

/**
 * Initialize the application
 */
async function init() {
    setupTimeFilter();
    setupModal();
    await fetchDomains();
    await fetchAndRender();

    // Auto-refresh
    setInterval(async () => {
        await fetchAndRender();
    }, REFRESH_INTERVAL_MS);
}

/**
 * Setup time filter button handlers
 */
function setupTimeFilter() {
    const buttons = timeFilterEl.querySelectorAll('.filter-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentTimeRangeHours = parseInt(btn.dataset.hours, 10);
            renderAll();
        });
    });
}

/**
 * Setup modal event listeners
 */
function setupModal() {
    settingsBtn.addEventListener('click', () => {
        settingsModal.classList.add('active');
        renderModalDomainList();
    });

    closeModal.addEventListener('click', () => {
        settingsModal.classList.remove('active');
    });

    settingsModal.querySelector('.modal-backdrop').addEventListener('click', () => {
        settingsModal.classList.remove('active');
    });

    addDomainBtn.addEventListener('click', handleAddDomain);
    newDomainInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleAddDomain();
    });
}

/**
 * Fetch data from API and render
 */
async function fetchAndRender() {
    try {
        const response = await fetch(`${API_BASE_URL}/latency?days=30`);
        if (!response.ok) throw new Error('API error');

        allData = await response.json();

        // Also refresh domains in case they changed elsewhere
        await fetchDomains();

        setStatus(true);
        renderAll();
        updateLastUpdated();
    } catch (error) {
        console.error('Failed to fetch latency data:', error);
        setStatus(false);
    }
}

/**
 * Fetch domain list from API
 */
async function fetchDomains() {
    try {
        const response = await fetch(`${API_BASE_URL}/domains`);
        if (response.ok) {
            trackedDomains = await response.json();
        }
    } catch (error) {
        console.error('Failed to fetch domains:', error);
    }
}

/**
 * Add a new domain via API
 */
async function handleAddDomain() {
    const name = newDomainInput.value.trim();
    if (!name) return;

    try {
        const response = await fetch(`${API_BASE_URL}/domains`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });

        if (response.ok) {
            newDomainInput.value = '';
            await fetchDomains();
            renderModalDomainList();
            renderAll();
        } else {
            alert('Failed to add domain. It might already exist.');
        }
    } catch (error) {
        console.error('Error adding domain:', error);
    }
}

/**
 * Remove a domain via API
 */
async function handleRemoveDomain(name) {
    if (!confirm(`Are you sure you want to stop tracking ${name}?`)) return;

    try {
        const response = await fetch(`${API_BASE_URL}/domains/${name}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            await fetchDomains();
            renderModalDomainList();
            renderAll();
        }
    } catch (error) {
        console.error('Error removing domain:', error);
    }
}

/**
 * Render domain list in management modal
 */
function renderModalDomainList() {
    modalDomainList.innerHTML = trackedDomains
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(domain => `
            <div class="domain-item">
                <span>${domain.name}</span>
                <button class="delete-domain-btn" onclick="handleRemoveDomain('${domain.name}')">Remove</button>
            </div>
        `).join('') || '<p style="color: var(--text-muted); text-align: center;">No domains tracked yet.</p>';
}

/**
 * Get color for a domain (uses mapping or generates one)
 */
function getDomainColor(domainName, index) {
    if (DOMAIN_COLORS[domainName]) return DOMAIN_COLORS[domainName];
    return EXTRA_COLORS[index % EXTRA_COLORS.length];
}

/**
 * Render all components with current data
 */
function renderAll() {
    const filteredData = filterDataByTimeRange(allData, currentTimeRangeHours);
    renderDomainCards(filteredData);
    renderChart(filteredData);
    renderStats(filteredData);
}

/**
 * Filter data to the selected time range
 */
function filterDataByTimeRange(data, hours) {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return data.filter(record => new Date(record.timestamp) >= cutoff);
}

/**
 * Set connection status badge
 */
function setStatus(isOnline) {
    statusBadge.classList.remove('online', 'offline');
    statusBadge.classList.add(isOnline ? 'online' : 'offline');
    statusBadge.querySelector('.status-text').textContent = isOnline ? 'Connected' : 'Offline';
}

/**
 * Update the "last updated" timestamp
 */
function updateLastUpdated() {
    const now = new Date();
    lastUpdatedEl.textContent = `Last updated: ${now.toLocaleTimeString()}`;
}

/**
 * Render domain cards with current latency
 */
function renderDomainCards(data) {
    // Group by domain and get latest + calculate average
    const domainStats = {};

    data.forEach(record => {
        if (!domainStats[record.domain]) {
            domainStats[record.domain] = {
                latest: record,
                values: [],
                previousValues: []
            };
        }
        domainStats[record.domain].values.push(record.latency_ms);
        if (new Date(record.timestamp) > new Date(domainStats[record.domain].latest.timestamp)) {
            domainStats[record.domain].latest = record;
        }
    });

    // Calculate trends (last 5 vs previous 5)
    Object.keys(domainStats).forEach(domain => {
        const vals = domainStats[domain].values;
        if (vals.length >= 10) {
            const recent = vals.slice(-5).reduce((a, b) => a + b, 0) / 5;
            const previous = vals.slice(-10, -5).reduce((a, b) => a + b, 0) / 5;
            domainStats[domain].trend = recent - previous;
        } else {
            domainStats[domain].trend = 0;
        }
    });

    // Combine tracked domains with stats, ensuring all are represented
    const allDomains = trackedDomains.map(d => d.name);
    
    // Generate cards HTML
    const cardsHTML = allDomains
        .sort((a, b) => a.localeCompare(b))
        .map((domain, index) => {
            const stats = domainStats[domain];
            const accentColor = getDomainColor(domain, index);

            if (!stats) {
                // Pending state for new domains
                return `
                    <div class="domain-card" style="--card-accent: ${accentColor}">
                        <div class="domain-card-header">
                            <span class="domain-name">${domain}</span>
                            <div class="domain-status pending"></div>
                        </div>
                        <div class="domain-latency">
                            --<span class="domain-latency-unit">ms</span>
                        </div>
                        <div class="domain-trend">
                            <span>Pending...</span>
                        </div>
                    </div>
                `;
            }

            const latency = stats.latest.latency_ms;
            const statusClass = latency > 100 ? 'slow' : '';
            const trendClass = stats.trend > 5 ? 'up' : stats.trend < -5 ? 'down' : '';
            const trendIcon = stats.trend > 5
                ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg>'
                : stats.trend < -5
                    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>'
                    : '';
            const trendText = Math.abs(stats.trend) > 1 ? `${stats.trend > 0 ? '+' : ''}${stats.trend.toFixed(1)}ms` : 'Stable';
            
            return `
                <div class="domain-card" style="--card-accent: ${accentColor}">
                    <div class="domain-card-header">
                        <span class="domain-name">${domain}</span>
                        <div class="domain-status ${statusClass}"></div>
                    </div>
                    <div class="domain-latency">
                        ${latency.toFixed(1)}<span class="domain-latency-unit">ms</span>
                    </div>
                    <div class="domain-trend ${trendClass}">
                        ${trendIcon}
                        <span>${trendText}</span>
                    </div>
                </div>
            `;
        })
        .join('');

    domainCardsContainer.innerHTML = cardsHTML || '<p style="color: var(--text-muted);">No domains tracked.</p>';
}

/**
 * Render the Chart.js line chart
 */
function renderChart(data) {
    const ctx = document.getElementById('latencyChart').getContext('2d');

    // Group data by domain
    const domainData = {};
    data.forEach(record => {
        if (!domainData[record.domain]) {
            domainData[record.domain] = [];
        }
        domainData[record.domain].push({
            x: new Date(record.timestamp),
            y: record.latency_ms
        });
    });

    // Create datasets
    const datasets = Object.entries(domainData).map(([domain, points], index) => {
        const color = getDomainColor(domain, index);
        return {
            label: domain,
            data: points.sort((a, b) => a.x - b.x),
            borderColor: color,
            backgroundColor: color + '20',
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 5,
            tension: 0.3,
            fill: false
        };
    });

    // Destroy existing chart if present
    if (latencyChart) {
        latencyChart.destroy();
    }

    // Create new chart
    latencyChart = new Chart(ctx, {
        type: 'line',
        data: { datasets },
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
                        color: '#a0a0b0',
                        usePointStyle: true,
                        pointStyle: 'circle',
                        padding: 20,
                        font: {
                            family: 'Inter',
                            size: 12
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(18, 18, 26, 0.95)',
                    titleColor: '#ffffff',
                    bodyColor: '#a0a0b0',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 8,
                    titleFont: {
                        family: 'Inter',
                        size: 13,
                        weight: '600'
                    },
                    bodyFont: {
                        family: 'Inter',
                        size: 12
                    },
                    callbacks: {
                        label: function (context) {
                            return ` ${context.dataset.label}: ${context.parsed.y.toFixed(1)} ms`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: currentTimeRangeHours <= 6 ? 'minute' : currentTimeRangeHours <= 24 ? 'hour' : 'day',
                        displayFormats: {
                            minute: 'HH:mm',
                            hour: 'MMM d, HH:mm',
                            day: 'MMM d'
                        }
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#606070',
                        font: {
                            family: 'Inter',
                            size: 11
                        },
                        maxTicksLimit: 8
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#606070',
                        font: {
                            family: 'Inter',
                            size: 11
                        },
                        callback: function (value) {
                            return value + ' ms';
                        }
                    }
                }
            }
        }
    });
}

/**
 * Render statistics cards
 */
function renderStats(data) {
    if (data.length === 0) {
        avgLatencyEl.textContent = '--';
        bestLatencyEl.textContent = '--';
        worstLatencyEl.textContent = '--';
        totalPingsEl.textContent = '0';
        return;
    }

    const latencies = data.map(r => r.latency_ms);
    const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const min = Math.min(...latencies);
    const max = Math.max(...latencies);

    avgLatencyEl.textContent = `${avg.toFixed(1)} ms`;
    bestLatencyEl.textContent = `${min.toFixed(1)} ms`;
    worstLatencyEl.textContent = `${max.toFixed(1)} ms`;
    totalPingsEl.textContent = data.length.toLocaleString();
}

// Start the application
document.addEventListener('DOMContentLoaded', init);

// Global handlers for management UI
window.handleRemoveDomain = handleRemoveDomain;
window.handleAddDomain = handleAddDomain;


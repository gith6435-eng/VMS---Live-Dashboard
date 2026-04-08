const REFRESH_INTERVAL_MS = 5000;
const HISTORY_LIMIT = 18;

const metricState = [
  { id: "enterprise_sales", label: "Enterprise Software Sales", shortLabel: "Software Sales", mobileLabel: "Sales", value: 8425000, volatility: 0.018 },
  { id: "cloud_revenue", label: "Cloud Services Revenue", shortLabel: "Cloud Revenue", mobileLabel: "Cloud", value: 7190000, volatility: 0.016 },
  { id: "managed_margin", label: "Managed Operations Margin", shortLabel: "Ops Margin", mobileLabel: "Margin", value: 6540000, volatility: 0.014 },
  { id: "renewal_pipeline", label: "Customer Renewal Pipeline", shortLabel: "Renewal Pipeline", mobileLabel: "Renewals", value: 5985000, volatility: 0.02 },
  { id: "partnership_index", label: "Strategic Partnership Index", shortLabel: "Partnerships", mobileLabel: "Partners", value: 5360000, volatility: 0.017 }
];

const refs = {
  refreshButton: document.getElementById("refresh-button"),
  statusPill: document.getElementById("status-pill"),
  lastUpdated: document.getElementById("last-updated"),
  trendDescription: document.getElementById("trend-description"),
  summaryLabels: [
    document.getElementById("summary-label-1"),
    document.getElementById("summary-label-2"),
    document.getElementById("summary-label-3")
  ],
  summaryValues: [
    document.getElementById("summary-value-1"),
    document.getElementById("summary-value-2"),
    document.getElementById("summary-value-3")
  ],
  summaryMeta: [
    document.getElementById("summary-meta-1"),
    document.getElementById("summary-meta-2"),
    document.getElementById("summary-meta-3")
  ]
};

const historyState = {
  metricId: null,
  labels: [],
  values: []
};

let barChart;
let lineChart;
let latestMetrics = [];

function formatCurrency(value) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  });
}

function formatCompactCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1
  }).format(value);
}

function formatDelta(value) {
  const prefix = value >= 0 ? "+" : "";
  return `${prefix}${value.toFixed(2)}% vs previous refresh`;
}

function setStatus(message, tone) {
  refs.statusPill.textContent = message;
  refs.statusPill.className = "status-pill";
  refs.statusPill.classList.add(`status-pill--${tone}`);
}

function setLoadingState(isLoading) {
  refs.refreshButton.disabled = isLoading;
  refs.refreshButton.textContent = isLoading ? "Refreshing..." : "Refresh now";
}

function getTopMetric(metrics) {
  return metrics.reduce((currentTop, metric) =>
    metric.value > currentTop.value ? metric : currentTop
  );
}

function getTopThreeMetrics(metrics) {
  return [...metrics]
    .sort((left, right) => right.value - left.value)
    .slice(0, 3);
}

function getChartTickSize() {
  if (window.innerWidth <= 420) {
    return 10;
  }

  if (window.innerWidth <= 980) {
    return 11;
  }

  if (window.innerWidth >= 1600) {
    return 13;
  }

  return 12;
}

function getLineTickLimit() {
  if (window.innerWidth <= 420) {
    return 4;
  }

  if (window.innerWidth <= 980) {
    return 6;
  }

  return 8;
}

function getResponsiveMetricLabel(metric) {
  if (window.innerWidth <= 420) {
    return metric.mobileLabel;
  }

  if (window.innerWidth <= 720) {
    return metric.shortLabel;
  }

  return metric.shortLabel;
}

function createCharts() {
  barChart = new Chart(document.getElementById("metrics-bar-chart").getContext("2d"), {
    type: "bar",
    data: {
      labels: [],
      datasets: [{
        label: "Current Value",
        data: [],
        backgroundColor: ["#6dd5ff", "#4db6ff", "#55d8b2", "#7ea9ff", "#b595ff"],
        borderRadius: 14,
        borderSkipped: false,
        maxBarThickness: 56
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 500
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: "#06101c",
          padding: 12,
          callbacks: {
            title(items) {
              return items[0].label;
            },
            label(context) {
              return formatCurrency(context.parsed.y);
            }
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: "#90a2c4",
            maxRotation: 0,
            minRotation: 0,
            autoSkip: true,
            maxTicksLimit: 5,
            font: {
              size: getChartTickSize()
            }
          },
          grid: {
            display: false
          }
        },
        y: {
          beginAtZero: false,
          ticks: {
            color: "#90a2c4",
            font: {
              size: getChartTickSize()
            },
            callback(value) {
              return formatCompactCurrency(value);
            }
          },
          grid: {
            color: "rgba(144, 162, 196, 0.14)"
          }
        }
      }
    }
  });

  lineChart = new Chart(document.getElementById("metric-line-chart").getContext("2d"), {
    type: "line",
    data: {
      labels: [],
      datasets: [{
        label: "Top Metric Trend",
        data: [],
        borderColor: "#6dd5ff",
        backgroundColor: "rgba(109, 213, 255, 0.14)",
        fill: true,
        tension: 0.32,
        borderWidth: 3,
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 500
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: "#06101c",
          padding: 12,
          callbacks: {
            title() {
              return refs.trendDescription.textContent.replace("Tracking ", "");
            },
            label(context) {
              return formatCurrency(context.parsed.y);
            }
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: "#90a2c4",
            autoSkip: true,
            maxTicksLimit: getLineTickLimit(),
            font: {
              size: getChartTickSize()
            }
          },
          grid: {
            display: false
          }
        },
        y: {
          beginAtZero: false,
          ticks: {
            color: "#90a2c4",
            font: {
              size: getChartTickSize()
            },
            callback(value) {
              return formatCompactCurrency(value);
            }
          },
          grid: {
            color: "rgba(144, 162, 196, 0.14)"
          }
        }
      }
    }
  });
}

async function fetchBusinessMetrics() {
  // This simulates a real business metrics service for the prototype.
  // Each refresh applies a small random movement to the baseline values.
  await new Promise((resolve) => setTimeout(resolve, 350));

  return metricState.map((metric) => {
    const previousValue = metric.value;
    const direction = Math.random() > 0.45 ? 1 : -1;
    const swing = Math.random() * metric.volatility;
    const nextValue = Math.max(1000000, Math.round(previousValue * (1 + direction * swing)));
    metric.value = nextValue;

    return {
      id: metric.id,
      label: metric.label,
      shortLabel: metric.shortLabel,
      mobileLabel: metric.mobileLabel,
      value: nextValue,
      deltaPercent: ((nextValue - previousValue) / previousValue) * 100
    };
  });
}

function updateSummaryCards(metrics) {
  getTopThreeMetrics(metrics).forEach((metric, index) => {
    refs.summaryLabels[index].textContent = metric.label;
    refs.summaryValues[index].textContent = formatCurrency(metric.value);
    refs.summaryMeta[index].textContent = formatDelta(metric.deltaPercent);
  });
}

function updateBarChart(metrics) {
  barChart.data.labels = metrics.map((metric) => getResponsiveMetricLabel(metric));
  barChart.data.datasets[0].data = metrics.map((metric) => metric.value);
  barChart.update();
}

function updateLineChart(topMetric) {
  if (historyState.metricId !== topMetric.id) {
    historyState.metricId = topMetric.id;
    historyState.labels = [];
    historyState.values = [];
  }

  const timeLabel = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });

  historyState.labels.push(timeLabel);
  historyState.values.push(topMetric.value);

  if (historyState.labels.length > HISTORY_LIMIT) {
    historyState.labels.shift();
    historyState.values.shift();
  }

  refs.trendDescription.textContent = `Tracking ${topMetric.shortLabel}`;
  lineChart.data.labels = [...historyState.labels];
  lineChart.data.datasets[0].data = [...historyState.values];
  lineChart.update();
}

async function refreshDashboard() {
  setLoadingState(true);
  setStatus("Refreshing live business metrics...", "loading");

  try {
    // Fetch the latest metric payload first so the initial render and every
    // scheduled refresh use the same update path.
    const metrics = await fetchBusinessMetrics();
    const topMetric = getTopMetric(metrics);
    latestMetrics = metrics;

    // Update the existing chart instances in place instead of recreating them.
    // This avoids flicker and keeps the dashboard smooth during real-time refreshes.
    updateSummaryCards(metrics);
    updateBarChart(metrics);
    updateLineChart(topMetric);

    refs.lastUpdated.textContent = `Last updated ${new Date().toLocaleTimeString()}`;
    setStatus("Live metrics synced successfully", "success");
  } catch (error) {
    refs.lastUpdated.textContent = "Last update failed";
    setStatus("Unable to load live metrics", "error");
    console.error("Dashboard refresh failed:", error);
  } finally {
    setLoadingState(false);
  }
}

createCharts();
refreshDashboard();
setInterval(refreshDashboard, REFRESH_INTERVAL_MS);

refs.refreshButton.addEventListener("click", refreshDashboard);
window.addEventListener("resize", () => {
  if (!barChart || !lineChart || latestMetrics.length === 0) {
    return;
  }

  const tickSize = getChartTickSize();
  barChart.options.scales.x.ticks.font.size = tickSize;
  barChart.options.scales.y.ticks.font.size = tickSize;
  updateBarChart(latestMetrics);
  lineChart.options.scales.x.ticks.font.size = tickSize;
  lineChart.options.scales.y.ticks.font.size = tickSize;
  lineChart.options.scales.x.ticks.maxTicksLimit = getLineTickLimit();
  lineChart.update("none");
});

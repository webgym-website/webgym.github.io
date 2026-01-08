// Ablation by Difficulty Visualization - Figure 2 from paper (4 subplots)
// Replicates plot_ablation_by_difficulty_paper.py exactly

// EMA smoothing function (alpha=0.5 by default)
function applyEMA(data, alpha = 0.5) {
    if (data.length === 0) return data;
    const smoothed = [data[0]];
    for (let i = 1; i < data.length; i++) {
        const smoothedValue = alpha * data[i] + (1 - alpha) * smoothed[i - 1];
        smoothed.push(smoothedValue);
    }
    return smoothed;
}

// Hardcoded reference starting point for overall (avg)
const referenceStart = 26.2;

// Colors from Python script
const colors = {
    'uniform sampling': '#d62728',
    'biased to hard': '#ff7f0e',
    'only easy': '#2ca02c',
    'only medium': '#9467bd',
    'exclude domains': '#ffbb78',
    'shorten horizon': '#ff9896'
};

const lineStyles = {
    'uniform sampling': [],
    'biased to hard': [],
    'only easy': [],
    'only medium': [],
    'exclude domains': [5, 5],
    'shorten horizon': [2, 2]
};

// Load data from the ablation_by_difficulty_cache.json
// This data should be embedded or loaded via fetch
const ablationByDifficultyData = ${JSON.stringify(require('/Users/mac/Desktop/paper_prop/webgym/exp_results/ablation_by_difficulty_cache.json'))};

function processRunData(runName, dataKey, emaAlpha = 0.5) {
    const runData = ablationByDifficultyData[runName];
    if (!runData) return null;

    const dirsData = runData.dirs_data;
    const split = 'ood';

    // Determine reference start for this data key
    let refStart = referenceStart; // for 'avg'
    if (dataKey !== 'avg') {
        // For other keys, use minimum first value
        const firstValues = [];
        for (const runName in ablationByDifficultyData) {
            const dirs = ablationByDifficultyData[runName].dirs_data;
            for (const dirResult of dirs) {
                if (split in dirResult && dataKey in dirResult[split]) {
                    const data = dirResult[split][dataKey];
                    if (data.length > 0) {
                        firstValues.push(data[0]);
                    }
                }
            }
        }
        refStart = firstValues.length > 0 ? Math.min(...firstValues) : null;
    }

    // Check if this run should be merged
    const shouldMerge = dirsData.length >= 2 && (runName === 'biased to hard');

    if (shouldMerge) {
        // Merge multiple runs
        const allSmoothed = [];
        for (const dirResult of dirsData) {
            if (!(split in dirResult)) continue;
            let data = dirResult[split][dataKey].slice(0, 8);
            if (refStart !== null && data.length > 0) {
                data[0] = refStart;
            }
            const smoothed = applyEMA(data, emaAlpha);
            allSmoothed.push(smoothed);
        }

        if (allSmoothed.length >= 2) {
            const minLen = Math.min(...allSmoothed.map(d => d.length));
            const trimmed = allSmoothed.map(d => d.slice(0, minLen));

            const avgData = [];
            const minData = [];
            const maxData = [];

            for (let i = 0; i < minLen; i++) {
                const values = trimmed.map(d => d[i]);
                avgData.push(values.reduce((a, b) => a + b, 0) / values.length);
                minData.push(Math.min(...values));
                maxData.push(Math.max(...values));
            }

            return { avgData, minData, maxData, isMerged: true };
        } else if (allSmoothed.length === 1) {
            return { avgData: allSmoothed[0], isMerged: false };
        }
    } else {
        // Single run
        if (dirsData.length === 0 || !(split in dirsData[0])) return null;
        let data = dirsData[0][split][dataKey].slice(0, 8);
        if (refStart !== null && data.length > 0) {
            data[0] = refStart;
        }
        const smoothed = applyEMA(data, emaAlpha);
        return { avgData: smoothed, isMerged: false };
    }

    return null;
}

function createDatasets(dataKey) {
    const datasets = [];
    const plotOrder = ['uniform sampling', 'biased to hard', 'only easy', 'only medium', 'exclude domains', 'shorten horizon'];

    for (const runName of plotOrder) {
        const result = processRunData(runName, dataKey, 0.5);
        if (!result) continue;

        const color = colors[runName];
        const borderDash = lineStyles[runName];

        if (result.isMerged) {
            // Main line
            datasets.push({
                label: runName,
                data: result.avgData,
                borderColor: color,
                backgroundColor: color,
                borderWidth: 3.5,
                borderDash: borderDash,
                fill: false,
                pointRadius: 0,
                tension: 0
            });

            // Shaded area
            datasets.push({
                label: runName + ' Max',
                data: result.maxData,
                borderColor: 'transparent',
                backgroundColor: color + '33',
                borderWidth: 0,
                fill: '+1',
                pointRadius: 0,
                tension: 0
            });

            datasets.push({
                label: runName + ' Min',
                data: result.minData,
                borderColor: 'transparent',
                backgroundColor: 'transparent',
                borderWidth: 0,
                fill: false,
                pointRadius: 0,
                tension: 0
            });
        } else {
            datasets.push({
                label: runName,
                data: result.avgData,
                borderColor: color,
                backgroundColor: color,
                borderWidth: 3.5,
                borderDash: borderDash,
                fill: false,
                pointRadius: 0,
                tension: 0
            });
        }
    }

    return datasets;
}

export function createAblationByDifficultyCharts(canvasIds) {
    const charts = {};
    const dataKeys = {
        'overall': 'avg',
        'easy': 'avg_easy',
        'medium': 'avg_medium',
        'hard': 'avg_hard'
    };

    const titles = {
        'overall': '(a) Overall',
        'easy': '(b) Easy (1-3)',
        'medium': '(c) Medium (4-6)',
        'hard': '(d) Hard (7+)'
    };

    for (const [key, canvasId] of Object.entries(canvasIds)) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) {
            console.error(`Canvas element ${canvasId} not found`);
            continue;
        }

        const datasets = createDatasets(dataKeys[key]);

        charts[key] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['0k', '6k', '12k', '18k', '24k', '30k', '36k', '42k'],
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 1.5,
                plugins: {
                    legend: {
                        display: key === 'overall',
                        position: 'top',
                        labels: {
                            fontSize: 9,
                            boxWidth: 15,
                            filter: function(item) {
                                return !item.text.includes('Max') && !item.text.includes('Min');
                            }
                        }
                    },
                    title: {
                        display: true,
                        text: titles[key],
                        font: {
                            size: 12,
                            weight: 'bold'
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: '#Training Trajectories',
                            font: {
                                size: 10,
                                weight: 'bold'
                            }
                        },
                        grid: {
                            display: true,
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        ticks: {
                            font: {
                                weight: 'bold'
                            }
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Test-set Success Rate (%)',
                            font: {
                                size: 11,
                                weight: 'bold'
                            }
                        },
                        grid: {
                            display: true,
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        ticks: {
                            font: {
                                weight: 'bold'
                            }
                        }
                    }
                }
            }
        });
    }

    return charts;
}

// Ablation Improvement Visualization - Figure 1 from paper
// Replicates plot_ablation_improve.py exactly

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

// Data from ablation_improve_cache.json
const ablationImproveData = {
    "Instruct-8B": {
        "ood": {
            "avg": [26.225045372050815, 30.80524344569288, 33.23809523809524, 34.90658800393314, 32.87536800785084, 34.0, 34.88824101068999, 32.419196865817824, 31.850353892821033]
        }
    },
    "Instruct-8B-2": {
        "ood": {
            "avg": [27.511312217194572, 24.838709677419356, 30.987202925045704, 32.59464450600185, 34.73389355742297, 33.3956969130028, 34.07122232916265, 30.490196078431374]
        }
    },
    "w/o Memory Prompt": {
        "ood": {
            "avg": [27.40740740740741, 28.08988764044944, 30.508474576271187, 31.4638783269962, 30.158730158730158, 29.087452471482887]
        }
    },
    "w/o Repetition Penalty": {
        "ood": {
            "avg": [24.797114517583406, 28.84267631103074, 31.616982836495033, 32.99445471349353, 31.88539741219963, 28.884826325411332, 30.683918669131238]
        }
    },
    "Thinking-8B": {
        "ood": {
            "avg": [28.238583410997204, 31.92488262910798, 32.31939163498099, 33.74880153403643, 22.73152478952292]
        }
    }
};

// Colors from Python script
const colors = {
    'Instruct-8B': '#ff7f0e',
    'w/o Memory Prompt': '#d62728',
    'w/o Repetition Penalty': '#2ca02c',
    'Thinking-8B': '#aec7e8'
};

// Hardcoded baseline for first point
const baselineStart = 26.2;

// Process data
function processAblationImproveData() {
    const datasets = [];

    // Process Instruct-8B (merged 2 runs with shaded area)
    const data1 = ablationImproveData["Instruct-8B"]["ood"]["avg"].slice(0, 7);
    const data2 = ablationImproveData["Instruct-8B-2"]["ood"]["avg"].slice(0, 7);

    // Set first point to baseline
    data1[0] = baselineStart;
    data2[0] = baselineStart;

    // Apply EMA smoothing
    const smoothed1 = applyEMA(data1, 0.5);
    const smoothed2 = applyEMA(data2, 0.5);

    // Compute average and range
    const avgData = smoothed1.map((val, i) => (val + smoothed2[i]) / 2);
    const minData = smoothed1.map((val, i) => Math.min(val, smoothed2[i]));
    const maxData = smoothed1.map((val, i) => Math.max(val, smoothed2[i]));

    // Main line
    datasets.push({
        label: 'Instruct-8B',
        data: avgData,
        borderColor: colors['Instruct-8B'],
        backgroundColor: colors['Instruct-8B'] + '33', // 20% opacity
        borderWidth: 2,
        fill: false,
        pointRadius: 0,
        tension: 0
    });

    // Shaded area (using fill between)
    datasets.push({
        label: 'Instruct-8B Range',
        data: maxData,
        borderColor: 'transparent',
        backgroundColor: colors['Instruct-8B'] + '33',
        borderWidth: 0,
        fill: '+1',
        pointRadius: 0,
        tension: 0
    });

    datasets.push({
        label: 'Instruct-8B Range Min',
        data: minData,
        borderColor: 'transparent',
        backgroundColor: 'transparent',
        borderWidth: 0,
        fill: false,
        pointRadius: 0,
        tension: 0
    });

    // Process Thinking-8B (cut to 4 points = 0-18k)
    const thinkData = ablationImproveData["Thinking-8B"]["ood"]["avg"].slice(0, 4);
    const smoothedThink = applyEMA(thinkData, 0.5);

    datasets.push({
        label: 'Thinking-8B',
        data: smoothedThink,
        borderColor: colors['Thinking-8B'],
        backgroundColor: colors['Thinking-8B'],
        borderWidth: 2,
        fill: false,
        pointRadius: 0,
        tension: 0
    });

    // Process other ablations
    const ablations = [
        { name: 'w/o Memory Prompt', maxPoints: 7, setBaseline: false },
        { name: 'w/o Repetition Penalty', maxPoints: 7, setBaseline: true }
    ];

    ablations.forEach(abl => {
        let data = ablationImproveData[abl.name]["ood"]["avg"].slice(0, abl.maxPoints);
        if (abl.setBaseline) {
            data[0] = baselineStart;
        }
        const smoothed = applyEMA(data, 0.5);

        datasets.push({
            label: abl.name,
            data: smoothed,
            borderColor: colors[abl.name],
            backgroundColor: colors[abl.name],
            borderWidth: 2,
            fill: false,
            pointRadius: 0,
            tension: 0
        });
    });

    return datasets;
}

// Create chart
export function createAblationImproveChart(canvasId) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) {
        console.error(`Canvas element ${canvasId} not found`);
        return null;
    }

    const datasets = processAblationImproveData();

    // Add horizontal reference lines as annotations
    const annotations = {
        gpt4o: {
            type: 'line',
            yMin: 27.13,
            yMax: 27.13,
            borderColor: 'gray',
            borderWidth: 1.5,
            borderDash: [10, 5],
            label: {
                content: 'GPT-4o-SoM',
                enabled: true,
                position: 'end'
            }
        },
        gpt5: {
            type: 'line',
            yMin: 29.82,
            yMax: 29.82,
            borderColor: 'darkgray',
            borderWidth: 1.5,
            borderDash: [5, 5],
            label: {
                content: 'GPT-5-SoM (Think)',
                enabled: true,
                position: 'end'
            }
        }
    };

    const chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['0k', '6k', '12k', '18k', '24k', '30k', '36k'],
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 4/3,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        fontSize: 6,
                        boxWidth: 20,
                        filter: function(item) {
                            // Hide the range helper datasets from legend
                            return !item.text.includes('Range');
                        }
                    }
                },
                annotation: {
                    annotations: annotations
                },
                title: {
                    display: false
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: '#Training Trajectories Collected',
                        font: {
                            size: 11
                        }
                    },
                    grid: {
                        display: true,
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Test-set Success Rate (%)',
                        font: {
                            size: 11
                        }
                    },
                    grid: {
                        display: true,
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                }
            }
        }
    });

    return chart;
}

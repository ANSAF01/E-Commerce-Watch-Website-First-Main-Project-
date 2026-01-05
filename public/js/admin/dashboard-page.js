document.addEventListener('DOMContentLoaded', () => {
    let salesChart = null;
    // expects window.INITIAL_CHART_DATA to be set in the view
    const initialData = window.INITIAL_CHART_DATA || [];

    const chartConfig = {
        type: 'line',
        options: {
            responsive: true,
            maintainAspectRatio: true,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Sales (₹)'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Orders'
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                }
            }
        }
    };

    function initChart(data) {
        const canvas = document.getElementById('salesChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        if (salesChart) {
            salesChart.destroy();
        }

        const labels = data.map(d => d.label);
        const salesData = data.map(d => d.sales);
        const ordersData = data.map(d => d.orders);

        salesChart = new Chart(ctx, {
            ...chartConfig,
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Sales (₹)',
                        data: salesData,
                        borderColor: '#0d6efd',
                        backgroundColor: 'rgba(13, 110, 253, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Orders',
                        data: ordersData,
                        borderColor: '#198754',
                        backgroundColor: 'rgba(25, 135, 84, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        yAxisID: 'y1'
                    }
                ]
            }
        });
    }

    function loadChartData(filter) {
        fetch(`/admin/chart-data?filter=${filter}`)
            .then(response => response.json())
            .then(result => {
                if (result.success) {
                    initChart(result.data);
                }
            })
            .catch(error => console.error('Error loading chart data:', error));
    }

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            loadChartData(this.dataset.filter);
        });
    });

    if (initialData.length > 0) {
        initChart(initialData);
    }
});

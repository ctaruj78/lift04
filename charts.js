function renderCharts() {
    try {
        const liftStatsCtx = document.getElementById('lift-stats-chart')?.getContext('2d');
        if (liftStatsCtx) {
            const statuses = ['active', 'maintenance', 'out_of_service'];
            const userLifts = getUserLifts();
            const data = statuses.map(status => ({
                status,
                count: userLifts.filter(lift => lift.status === status).length
            }));
            new Chart(liftStatsCtx, {
                type: 'pie',
                data: {
                    labels: data.map(d => getStatusText(d.status)),
                    datasets: [{
                        data: data.map(d => d.count),
                        backgroundColor: ['#28a745', '#ffc107', '#dc3545']
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: { display: true, text: 'Статистика статусів ліфтів' },
                        legend: { position: 'bottom' }
                    }
                }
            });
        }

        const requestStatsCtx = document.getElementById('request-stats-chart')?.getContext('2d');
        if (requestStatsCtx) {
            const statuses = ['pending', 'in_progress', 'completed'];
            const userLifts = getUserLifts();
            const userRequests = currentUser.role === 'client'
                ? allServiceRequests.filter(r => userLifts.some(l => l.id === r.liftId))
                : allServiceRequests;
            const data = statuses.map(status => ({
                status,
                count: userRequests.filter(r => r.status === status).length
            }));
            new Chart(requestStatsCtx, {
                type: 'bar',
                data: {
                    labels: data.map(d => getStatusText(d.status)),
                    datasets: [{
                        label: 'Кількість заявок',
                        data: data.map(d => d.count),
                        backgroundColor: '#007bff'
                    }]
                },
                options: {
                    responsive: true,
                    scales: { y: { beginAtZero: true } },
                    plugins: {
                        title: { display: true, text: 'Статистика заявок' }
                    }
                }
            });
        }

        const logCtx = document.getElementById('logChart')?.getContext('2d');
        if (logCtx) {
            const actions = [...new Set(allLogs.map(log => log.action))];
            const data = actions.map(action => ({
                action,
                count: allLogs.filter(log => log.action === action).length
            }));
            new Chart(logCtx, {
                type: 'bar',
                data: {
                    labels: data.map(d => d.action),
                    datasets: [{
                        label: 'Кількість подій',
                        data: data.map(d => d.count),
                        backgroundColor: '#007bff'
                    }]
                },
                options: {
                    responsive: true,
                    scales: { y: { beginAtZero: true } },
                    plugins: {
                        title: { display: true, text: 'Статистика подій за типом' }
                    }
                }
            });
        }
    } catch (e) {
        console.error('Error rendering charts:', e);
        toastr.error('Помилка відображення графіків: ' + e.message);
    }
}
$(document).ready(function() {
    loadDataFromLocalStorage();
    console.log('Reports page loaded, currentUser:', currentUser);

    if (!checkAuth()) {
        location.href = 'login.html';
        return;
    }

    if (!checkRoleAccess('admin')) {
        console.log('User does not have admin access, redirecting to index.html');
        location.href = 'index.html';
        return;
    }

    const generateReportButton = $('#generate-report');
    const reportOutput = $('#report-output');
    const logoutButton = $('#logout-button');

    function updateSidebar() {
        $('.role-based').each(function() {
            const allowedRoles = $(this).data('role') ? $(this).data('role').split(',') : [];
            $(this).toggle(allowedRoles.includes(currentUser.role));
        });
    }

    function generateReport() {
        const reportType = $('#report-type').val();
        reportOutput.empty();

        if (reportType === 'lifts') {
            const lifts = getUserLifts();
            if (!lifts.length) {
                reportOutput.html('<p class="text-center">Ліфти не знайдено.</p>');
                return;
            }
            const table = `
                <table class="table table-bordered">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Адреса</th>
                            <th>Статус</th>
                            <th>Клієнт</th>
                            <th>Остання інспекція</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${lifts.map(lift => `
                            <tr>
                                <td>${lift.id}</td>
                                <td>${lift.address}</td>
                                <td>${getStatusText(lift.status)}</td>
                                <td>${lift.client || '-'}</td>
                                <td>${lift.lastInspection || '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
            reportOutput.html(table);
        } else if (reportType === 'requests') {
            const userLifts = getUserLifts();
            const requests = allServiceRequests.filter(r => userLifts.some(l => l.id === r.liftId));
            if (!requests.length) {
                reportOutput.html('<p class="text-center">Заявки не знайдено.</p>');
                return;
            }
            const table = `
                <table class="table table-bordered">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Ліфт</th>
                            <th>Опис</th>
                            <th>Статус</th>
                            <th>Створено</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${requests.map(r => {
                            const lift = allLifts.find(l => l.id === r.liftId);
                            return `
                                <tr>
                                    <td>${r.id}</td>
                                    <td>${lift ? lift.address : 'Невідомий'}</td>
                                    <td>${r.description}</td>
                                    <td>${getStatusText(r.status)}</td>
                                    <td>${new Date(r.createdAt).toLocaleString('uk-UA')}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            `;
            reportOutput.html(table);
        } else if (reportType === 'logs') {
            if (!allLogs.length) {
                reportOutput.html('<p class="text-center">Події не знайдено.</p>');
                return;
            }
            const table = `
                <table class="table table-bordered">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Дія</th>
                            <th>Користувач</th>
                            <th>Час</th>
                            <th>Деталі</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${allLogs.map(log => `
                            <tr>
                                <td>${log.id}</td>
                                <td>${log.action}</td>
                                <td>${log.user}</td>
                                <td>${new Date(log.timestamp).toLocaleString('uk-UA')}</td>
                                <td>${JSON.stringify(log.details)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
            reportOutput.html(table);
        }

        $('#export-report').show();
        logAction(`Згенеровано звіт: ${reportType}`, currentUser.username);
        toastr.success('Звіт згенеровано!');
    }

    generateReportButton.on('click', generateReport);

    $('#export-report').on('click', function() {
        const reportType = $('#report-type').val();
        let csv;
        if (reportType === 'lifts') {
            const lifts = getUserLifts();
            csv = [['ID', 'Адреса', 'Статус', 'Клієнт', 'Остання інспекція'],
                ...lifts.map(l => [l.id, l.address, getStatusText(l.status), l.client || '-', l.lastInspection || '-'])]
                .map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
        } else if (reportType === 'requests') {
            const userLifts = getUserLifts();
            const requests = allServiceRequests.filter(r => userLifts.some(l => l.id === r.liftId));
            csv = [['ID', 'Ліфт', 'Опис', 'Статус', 'Створено'],
                ...requests.map(r => {
                    const lift = allLifts.find(l => l.id === r.liftId);
                    return [r.id, lift ? lift.address : 'Невідомий', r.description, getStatusText(r.status), new Date(r.createdAt).toLocaleString('uk-UA')];
                })].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
        } else if (reportType === 'logs') {
            csv = [['ID', 'Дія', 'Користувач', 'Час', 'Деталі'],
                ...allLogs.map(log => [log.id, log.action, log.user, new Date(log.timestamp).toLocaleString('uk-UA'), JSON.stringify(log.details)])]
                .map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
        }
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${reportType}_report.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        logAction(`Експортовано звіт: ${reportType}`, currentUser.username);
        toastr.success('Звіт експортовано!');
    });

    logoutButton.on('click', function() {
        logAction('Вихід із системи', currentUser.username);
        localStorage.removeItem(LS_CURRENT_USER_KEY);
        currentUser = null;
        saveDataToLocalStorage();
        location.href = 'login.html';
    });

    $(document).on('click', function() {
        lastActivity = Date.now();
    });

    updateSidebar();
    generateReport();
    logAction('Відкрито сторінку звітів', currentUser.username);
});
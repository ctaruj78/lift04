$(document).ready(function() {
    loadDataFromLocalStorage();
    console.log('Logs page loaded, currentUser:', currentUser);

    if (!checkAuth()) {
        location.href = 'login.html';
        return;
    }

    if (!checkRoleAccess('admin')) {
        console.log('User does not have admin access, redirecting to index.html');
        toastr.error('Доступ заборонено');
        location.href = 'index.html';
        return;
    }

    const logsTableBody = $('#logs-table-body');
    const logoutButton = $('#logout-button');
    let dataTable;

    function updateSidebar() {
        $('.role-based').each(function() {
            const allowedRoles = $(this).data('role') ? $(this).data('role').split(',') : [];
            $(this).toggle(allowedRoles.includes(currentUser.role));
        });
    }

    function renderLogsTable() {
        logsTableBody.empty();
        if (!allLogs.length) {
            logsTableBody.html('<tr><td colspan="5" class="text-center">Події не знайдено.</td></tr>');
            return;
        }

        const rows = allLogs.map(log => `
            <tr>
                <td>${log.id}</td>
                <td>${log.action}</td>
                <td>${log.user}</td>
                <td>${new Date(log.timestamp).toLocaleString('uk-UA')}</td>
                <td>${JSON.stringify(log.details)}</td>
            </tr>
        `).join('');
        logsTableBody.html(rows);

        if (dataTable) {
            dataTable.destroy();
        }
        dataTable = $('#logs-table').DataTable({
            paging: true,
            searching: true,
            ordering: true,
            responsive: true,
            language: { url: '//cdn.datatables.net/plug-ins/1.10.25/i18n/Ukrainian.json' }
        });
    }

    logoutButton.on('click', function() {
        logAction('Вихід із системи', currentUser.username);
        localStorage.removeItem(LS_CURRENT_USER_KEY);
        currentUser = null;
        saveDataToLocalStorage();
        location.href = 'login.html';
    });

    $(document).on('click input keypress', function() {
        lastActivity = Date.now();
    });

    updateSidebar();
    renderLogsTable();
    logAction('Відкрито сторінку журналу', currentUser.username);
});
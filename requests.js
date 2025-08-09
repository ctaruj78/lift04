$(document).ready(function() {
    loadDataFromLocalStorage();
    console.log('Requests page loaded, currentUser:', currentUser);

    if (!checkAuth()) {
        location.href = 'login.html';
        return;
    }

    if (!checkRoleAccess('admin,tech,client')) {
        console.log('User does not have access to requests page, redirecting to index.html');
        toastr.error('Доступ заборонено');
        location.href = 'index.html';
        return;
    }

    const requestsTableBody = $('#requests-table-body');
    const addRequestButton = $('#add-request');
    const saveRequestButton = $('#save-request-button');
    const logoutButton = $('#logout-button');
    let dataTable;

    function updateSidebar() {
        $('.role-based').each(function() {
            const allowedRoles = $(this).data('role') ? $(this).data('role').split(',') : [];
            $(this).toggle(allowedRoles.includes(currentUser.role));
        });
    }

    function populateLiftSelect(selectedId = null) {
        const liftSelect = $('#request-lift-id');
        liftSelect.empty();
        liftSelect.append('<option value="">Виберіть ліфт</option>');
        getUserLifts().forEach(lift => {
            liftSelect.append(`<option value="${lift.id}" ${lift.id === selectedId ? 'selected' : ''}>${lift.id}: ${lift.address}</option>`);
        });
    }

    function renderRequestsTable() {
        requestsTableBody.empty();
        const userLifts = getUserLifts();
        const userRequests = currentUser.role === 'client'
            ? allServiceRequests.filter(r => userLifts.some(l => l.id === r.liftId))
            : allServiceRequests;

        if (!userRequests.length) {
            requestsTableBody.html('<tr><td colspan="5" class="text-center">Заявки не знайдено.</td></tr>');
            return;
        }

        const isClient = currentUser.role === 'client';
        const rows = userRequests.map(request => {
            const lift = allLifts.find(l => l.id === request.liftId);
            return `
                <tr>
                    <td>${request.id}</td>
                    <td>${lift ? lift.address : 'Невідомий ліфт'}</td>
                    <td>${request.description}</td>
                    <td><span class="badge ${request.status === 'completed' ? 'badge-success' : request.status === 'in_progress' ? 'badge-warning' : 'badge-danger'}">
                        ${getStatusText(request.status)}</span></td>
                    <td>
                        ${isClient ? '' : `
                            <button class="btn btn-warning btn-sm edit-request" data-id="${request.id}" data-toggle="modal" data-target="#requestModal">Редагувати</button>
                            <button class="btn btn-danger btn-sm delete-request" data-id="${request.id}">Видалити</button>
                        `}
                    </td>
                </tr>
            `;
        }).join('');
        requestsTableBody.html(rows);

        if (dataTable) {
            dataTable.destroy();
        }
        dataTable = $('#requests-table').DataTable({
            paging: true,
            searching: true,
            ordering: true,
            responsive: true,
            language: { url: '//cdn.datatables.net/plug-ins/1.10.25/i18n/Ukrainian.json' }
        });
    }

    addRequestButton.on('click', function() {
        if (!checkRoleAccess('admin,tech')) return;
        $('#requestModalTitle').text('Додати заявку');
        $('#request-form')[0].reset();
        $('#request-id').val(allServiceRequests.length ? Math.max(...allServiceRequests.map(r => r.id)) + 1 : 1);
        $('#request-status').val('pending');
        populateLiftSelect();
        $('#requestModal').modal('show');
        logAction('Відкрито створення нової заявки', currentUser.username);
    });

    $(document).on('click', '.edit-request', function() {
        if (currentUser.role === 'client') return;
        const requestId = parseInt($(this).data('id'));
        const request = allServiceRequests.find(r => r.id === requestId);
        if (!request) {
            toastr.error('Заявку не знайдено!');
            return;
        }
        $('#requestModalTitle').text('Редагувати заявку');
        $('#request-id').val(request.id);
        $('#request-description').val(request.description);
        $('#request-status').val(request.status);
        populateLiftSelect(request.liftId);
        $('#requestModal').modal('show');
        logAction(`Відкрито редагування заявки ${requestId}`, currentUser.username);
    });

    $(document).on('click', '.delete-request', function() {
        if (currentUser.role === 'client') return;
        const requestId = parseInt($(this).data('id'));
        if (!confirm(`Ви впевнені, що хочете видалити заявку ${requestId}?`)) return;
        allServiceRequests = allServiceRequests.filter(r => r.id !== requestId);
        saveDataToLocalStorage();
        renderRequestsTable();
        renderCharts();
        logAction(`Видалено заявку ${requestId}`, currentUser.username);
        toastr.success(`Заявку ${requestId} видалено!`);
    });

    saveRequestButton.on('click', function() {
        const requestId = parseInt($('#request-id').val());
        const liftId = parseInt($('#request-lift-id').val());
        const description = $('#request-description').val().trim();
        const status = $('#request-status').val();

        if (!liftId || !description) {
            toastr.error('Ліфт та опис обов’язкові!');
            return;
        }

        const request = allServiceRequests.find(r => r.id === requestId) || {};
        const updatedRequest = {
            id: requestId,
            liftId,
            description,
            status,
            createdAt: request.createdAt || new Date().toISOString()
        };

        const index = allServiceRequests.findIndex(r => r.id === requestId);
        if (index !== -1) {
            allServiceRequests[index] = updatedRequest;
            logAction(`Оновлено заявку ${requestId}`, currentUser.username);
            toastr.success(`Заявку ${requestId} оновлено!`);
        } else {
            allServiceRequests.push(updatedRequest);
            logAction(`Створено заявку ${requestId}`, currentUser.username);
            toastr.success(`Заявку ${requestId} створено!`);
        }
        saveDataToLocalStorage();
        renderRequestsTable();
        renderCharts();
        $('#requestModal').modal('hide');
    });

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
    renderRequestsTable();
    renderCharts();
    logAction('Відкрито сторінку заявок', currentUser.username);
});
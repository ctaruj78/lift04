$(document).ready(function() {
    loadDataFromLocalStorage();
    if (!checkAuth()) {
        location.href = 'login.html';
        return;
    }
    updateSidebar();
    renderLiftStats();
    renderInspectionsTable();
    renderQuickActions();
    renderCharts();

    $('#logout-button').on('click', function() {
        currentUser = null;
        localStorage.removeItem(LS_CURRENT_USER_KEY);
        saveDataToLocalStorage();
        location.href = 'login.html';
    });

    function updateSidebar() {
        $('.role-based').each(function() {
            const requiredRole = $(this).data('role');
            if (currentUser.role !== requiredRole) {
                $(this).hide();
            } else {
                $(this).show();
            }
        });
    }

    function getUserLifts() {
        if (currentUser.role === 'admin') {
            return allLifts;
        } else if (currentUser.role === 'tech') {
            return allLifts.filter(lift => lift.tech === currentUser.username);
        } else {
            return allLifts.filter(lift => lift.client === currentUser.username);
        }
    }

    function renderLiftStats() {
        const userLifts = getUserLifts();
        const activeLifts = userLifts.filter(lift => lift.status === 'active').length;
        const maintenanceLifts = userLifts.filter(lift => lift.status === 'maintenance').length;
        const outOfServiceLifts = userLifts.filter(lift => lift.status === 'out_of_service').length;
        const usersCount = currentUser.role === 'admin' ? allUsers.length : 0;

        $('#active-lifts-count').text(activeLifts);
        $('#maintenance-lifts-count').text(maintenanceLifts);
        $('#out-of-service-lifts-count').text(outOfServiceLifts);
        $('#users-count').text(usersCount);

        if (currentUser.role !== 'admin') {
            $('.role-based[data-role="admin"]').hide();
        }
    }

    function renderInspectionsTable() {
        const userLifts = getUserLifts();
        const tableBody = $('#inspections-table-body');
        tableBody.empty();

        const today = new Date();
        userLifts.forEach(lift => {
            const nextInspection = lift.lastInspection && lift.inspectionFrequency
                ? new Date(new Date(lift.lastInspection).setMonth(new Date(lift.lastInspection).getMonth() + lift.inspectionFrequency))
                : null;

            if (nextInspection && nextInspection <= new Date(today.setDate(today.getDate() + 7))) {
                const row = `
                    <tr>
                        <td>${lift.id}</td>
                        <td>${lift.address}</td>
                        <td>${nextInspection ? nextInspection.toLocaleDateString('uk-UA') : 'Н/Д'}</td>
                        <td><button class="btn btn-primary btn-sm view-lift" data-lift-id="${lift.id}">Переглянути</button></td>
                    </tr>`;
                tableBody.append(row);
            }
        });

        $('#inspections-table').DataTable({
            destroy: true,
            paging: true,
            searching: true,
            ordering: true,
            responsive: true,
            language: { url: '//cdn.datatables.net/plug-ins/1.10.25/i18n/Ukrainian.json' }
        });

        $('.view-lift').on('click', function() {
            const liftId = parseInt($(this).data('lift-id'));
            location.href = `lifts.html?liftId=${liftId}`;
        });
    }

    function renderQuickActions() {
        const userLifts = getUserLifts();
        const tableBody = $('#quick-actions-table-body');
        tableBody.empty();

        userLifts.forEach(lift => {
            const statusText = lift.status === 'active' ? 'Активний' : lift.status === 'maintenance' ? 'На обслуговуванні' : 'Не працює';
            const row = `
                <tr>
                    <td>${lift.id}</td>
                    <td>${lift.address}</td>
                    <td>${statusText}</td>
                    <td>
                        <button class="btn btn-primary btn-sm view-lift" data-lift-id="${lift.id}">Переглянути</button>
                        ${currentUser.role === 'tech' ? `<button class="btn btn-info btn-sm update-status" data-lift-id="${lift.id}">Оновити статус</button>` : ''}
                    </td>
                </tr>`;
            tableBody.append(row);
        });

        $('#quick-actions-table').DataTable({
            destroy: true,
            paging: true,
            searching: true,
            ordering: true,
            responsive: true,
            language: { url: '//cdn.datatables.net/plug-ins/1.10.25/i18n/Ukrainian.json' }
        });

        $('.view-lift').on('click', function() {
            const liftId = parseInt($(this).data('lift-id'));
            location.href = `lifts.html?liftId=${liftId}`;
        });

        $('.update-status').on('click', function() {
            const liftId = parseInt($(this).data('lift-id'));
            location.href = `lifts.html?liftId=${liftId}&action=updateStatus`;
        });
    }
});
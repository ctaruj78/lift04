$(document).ready(function() {
    loadDataFromLocalStorage();
    console.log('Lifts page loaded, currentUser:', currentUser);

    if (!checkAuth()) {
        location.href = 'login.html';
        return;
    }

    if (!checkRoleAccess('admin,tech,client')) {
        console.log('User does not have access to lifts page, redirecting to index.html');
        toastr.error('Доступ заборонено');
        location.href = 'index.html';
        return;
    }

    const liftsTableBody = $('#lifts-table-body');
    const addLiftButton = $('#add-lift');
    const saveLiftButton = $('#save-lift');
    const logoutButton = $('#logout-button');
    const searchLift = $('#search-lift');
    let dataTable;

    function updateSidebar() {
        $('.role-based').each(function() {
            const allowedRoles = $(this).data('role') ? $(this).data('role').split(',') : [];
            $(this).toggle(allowedRoles.includes(currentUser.role));
        });
    }

    function populateTechSelect(selectedTech = '') {
        const techSelect = $('#lift-tech');
        techSelect.empty();
        techSelect.append('<option value="">Немає</option>');
        allUsers.filter(u => u.role === 'tech').forEach(tech => {
            techSelect.append(`<option value="${tech.username}" ${tech.username === selectedTech ? 'selected' : ''}>${tech.username}</option>`);
        });
    }

    function renderInterventionHistory(history = []) {
        const historyContainer = $('#intervention-history');
        historyContainer.empty();
        if (!history.length) {
            historyContainer.html('<p>Немає записів про втручання.</p>');
            return;
        }
        historyContainer.html(`
            <table class="table table-sm">
                <thead>
                    <tr>
                        <th>Дата</th>
                        <th>Опис</th>
                        <th>Дії</th>
                    </tr>
                </thead>
                <tbody>
                    ${history.map((entry, index) => `
                        <tr data-index="${index}">
                            <td>${new Date(entry.date).toLocaleString('uk-UA')}</td>
                            <td>${entry.description}</td>
                            <td>
                                <button class="btn btn-warning btn-sm edit-intervention" data-index="${index}">Редагувати</button>
                                <button class="btn btn-danger btn-sm delete-intervention" data-index="${index}">Видалити</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `);
    }

    function renderPhotoPreview(photos = []) {
        const previewContainer = $('#photo-preview');
        previewContainer.empty();
        photos.forEach((photo, index) => {
            previewContainer.append(`
                <div class="photo-item" data-index="${index}">
                    <img src="${photo}" alt="Photo ${index + 1}">
                    <button class="btn btn-danger btn-sm delete-photo" data-index="${index}">Видалити</button>
                </div>
            `);
        });
    }

    function renderQRCode(liftId) {
        const qrContainer = $('#qr-code');
        qrContainer.empty();
        const qrCode = allQRCodes.find(qr => qr.liftId === liftId);
        if (qrCode && qrCode.qrCodeUrl) {
            qrContainer.html(`
                <img src="${qrCode.qrCodeUrl}" alt="QR Code">
                <a href="${qrCode.qrCodeUrl}" download="lift_${liftId}_qr.png" class="btn btn-primary btn-sm mt-2">Завантажити QR</a>
            `);
        } else {
            qrContainer.html('<p>QR-код не створено. Перейдіть до сторінки QR-кодів.</p>');
        }
    }

    function renderLiftsTable() {
        liftsTableBody.empty();
        const searchTerm = searchLift.val().toLowerCase().trim();
        const userLifts = getUserLifts().filter(lift => 
            lift.address.toLowerCase().includes(searchTerm) || 
            (lift.client && lift.client.toLowerCase().includes(searchTerm))
        );

        if (!userLifts.length) {
            liftsTableBody.html('<tr><td colspan="5" class="text-center">Ліфти не знайдено.</td></tr>');
            return;
        }

        const isClient = currentUser.role === 'client';
        const rows = userLifts.map(lift => `
            <tr>
                <td>${lift.id}</td>
                <td>${lift.address}</td>
                <td><span class="badge ${lift.status === 'active' ? 'badge-success' : lift.status === 'maintenance' ? 'badge-warning' : 'badge-danger'}">
                    ${getStatusText(lift.status)}</span></td>
                <td>${lift.client || '-'}</td>
                <td>
                    ${isClient ? '' : `
                        <button class="btn btn-warning btn-sm edit-lift" data-id="${lift.id}" data-toggle="modal" data-target="#liftModal">Редагувати</button>
                        <button class="btn btn-danger btn-sm delete-lift" data-id="${lift.id}">Видалити</button>
                    `}
                </td>
            </tr>
        `).join('');
        liftsTableBody.html(rows);

        if (dataTable) {
            dataTable.destroy();
        }
        dataTable = $('#lifts-table').DataTable({
            paging: true,
            searching: false,
            ordering: true,
            responsive: true,
            language: { url: '//cdn.datatables.net/plug-ins/1.10.25/i18n/Ukrainian.json' }
        });
    }

    addLiftButton.on('click', function() {
        if (!checkRoleAccess('admin,tech')) return;
        $('#liftModalTitle').text('Додати ліфт');
        $('#lift-form')[0].reset();
        $('#lift-id').val(allLifts.length ? Math.max(...allLifts.map(l => l.id)) + 1 : 1);
        populateTechSelect();
        renderInterventionHistory();
        renderPhotoPreview();
        renderQRCode(0);
        $('#liftModal').modal('show');
        logAction('Відкрито створення нового ліфта', currentUser.username);
    });

    $(document).on('click', '.edit-lift', function() {
        const liftId = parseInt($(this).data('id'));
        const lift = allLifts.find(l => l.id === liftId);
        if (!lift) {
            toastr.error('Ліфт не знайдено!');
            return;
        }
        $('#liftModalTitle').text('Редагувати ліфт');
        $('#lift-id').val(lift.id);
        $('#lift-address').val(lift.address);
        $('#lift-postal-code').val(lift.postalCode);
        $('#lift-serial').val(lift.serial);
        $('#lift-brand').val(lift.brand);
        $('#lift-capacity').val(lift.capacity);
        $('#lift-speed').val(lift.speed);
        $('#lift-status').val(lift.status);
        $('#lift-client').val(lift.client);
        $('#lift-client-email').val(lift.clientEmail);
        populateTechSelect(lift.tech);
        $('#lift-lat').val(lift.lat);
        $('#lift-lng').val(lift.lng);
        $('#lift-last-inspection').val(lift.lastInspection);
        $('#lift-inspection-frequency').val(lift.inspectionFrequency);
        $('#lift-report').val(lift.report);
        renderInterventionHistory(lift.interventionHistory || []);
        renderPhotoPreview(lift.photos || []);
        renderQRCode(lift.id);
        $('#liftModal').modal('show');
        logAction(`Відкрито редагування ліфта ${liftId}`, currentUser.username);
    });

    $(document).on('click', '.delete-lift', function() {
        const liftId = parseInt($(this).data('id'));
        if (!confirm(`Ви впевнені, що хочете видалити ліфт ${liftId}?`)) return;
        allLifts = allLifts.filter(l => l.id !== liftId);
        allQRCodes = allQRCodes.filter(qr => qr.liftId !== liftId);
        allServiceRequests = allServiceRequests.filter(r => r.liftId !== liftId);
        saveDataToLocalStorage();
        renderLiftsTable();
        logAction(`Видалено ліфт ${liftId}`, currentUser.username);
        toastr.success(`Ліфт ${liftId} видалено!`);
    });

    $('#lift-photos').on('change', function(e) {
        const files = e.target.files;
        const liftId = parseInt($('#lift-id').val());
        const lift = allLifts.find(l => l.id === liftId) || { photos: [] };
        const validTypes = ['image/jpeg', 'image/png'];
        const maxSize = 5 * 1024 * 1024; // 5MB

        Array.from(files).forEach(file => {
            if (!validTypes.includes(file.type)) {
                toastr.error(`Файл ${file.name} не є JPEG або PNG!`);
                return;
            }
            if (file.size > maxSize) {
                toastr.error(`Файл ${file.name} перевищує 5MB!`);
                return;
            }
            const reader = new FileReader();
            reader.onload = function(e) {
                lift.photos = lift.photos || [];
                lift.photos.push(e.target.result);
                renderPhotoPreview(lift.photos);
            };
            reader.readAsDataURL(file);
        });
        $('#lift-photos').val('');
    });

    $(document).on('click', '.delete-photo', function() {
        const index = parseInt($(this).data('index'));
        const liftId = parseInt($('#lift-id').val());
        const lift = allLifts.find(l => l.id === liftId);
        if (lift && lift.photos) {
            lift.photos.splice(index, 1);
            renderPhotoPreview(lift.photos);
            logAction(`Видалено фото з ліфта ${liftId}`, currentUser.username);
            toastr.success('Фото видалено!');
        }
    });

    $('#add-intervention').on('click', function() {
        const description = $('#new-intervention').val().trim();
        if (!description) {
            toastr.error('Опис втручання обов’язковий!');
            return;
        }
        const liftId = parseInt($('#lift-id').val());
        const lift = allLifts.find(l => l.id === liftId) || { interventionHistory: [] };
        lift.interventionHistory = lift.interventionHistory || [];
        lift.interventionHistory.push({
            date: new Date().toISOString(),
            description
        });
        renderInterventionHistory(lift.interventionHistory);
        $('#new-intervention').val('');
        logAction(`Додано втручання до ліфта ${liftId}`, currentUser.username);
        toastr.success('Втручання додано!');
    });

    $(document).on('click', '.edit-intervention', function() {
        const index = parseInt($(this).data('index'));
        const liftId = parseInt($('#lift-id').val());
        const lift = allLifts.find(l => l.id === liftId);
        if (lift && lift.interventionHistory && lift.interventionHistory[index]) {
            const newDescription = prompt('Введіть новий опис:', lift.interventionHistory[index].description);
            if (newDescription && newDescription.trim()) {
                lift.interventionHistory[index].description = newDescription.trim();
                renderInterventionHistory(lift.interventionHistory);
                logAction(`Оновлено втручання ${index} для ліфта ${liftId}`, currentUser.username);
                toastr.success('Втручання оновлено!');
            }
        }
    });

    $(document).on('click', '.delete-intervention', function() {
        const index = parseInt($(this).data('index'));
        const liftId = parseInt($('#lift-id').val());
        const lift = allLifts.find(l => l.id === liftId);
        if (lift && lift.interventionHistory) {
            lift.interventionHistory.splice(index, 1);
            renderInterventionHistory(lift.interventionHistory);
            logAction(`Видалено втручання ${index} з ліфта ${liftId}`, currentUser.username);
            toastr.success('Втручання видалено!');
        }
    });

    saveLiftButton.on('click', function() {
        const liftId = parseInt($('#lift-id').val());
        const address = $('#lift-address').val().trim();
        const postalCode = $('#lift-postal-code').val().trim();
        const serial = $('#lift-serial').val().trim();
        const brand = $('#lift-brand').val().trim();
        const capacity = parseInt($('#lift-capacity').val()) || null;
        const speed = parseFloat($('#lift-speed').val()) || null;
        const status = $('#lift-status').val();
        const client = $('#lift-client').val().trim();
        const clientEmail = $('#lift-client-email').val().trim();
        const tech = $('#lift-tech').val();
        const lat = parseFloat($('#lift-lat').val()) || null;
        const lng = parseFloat($('#lift-lng').val()) || null;
        const lastInspection = $('#lift-last-inspection').val();
        const inspectionFrequency = parseInt($('#lift-inspection-frequency').val()) || 0;
        const report = $('#lift-report').val().trim();

        if (!address || !postalCode) {
            toastr.error('Адреса та поштовий індекс обов’язкові!');
            return;
        }
        if (clientEmail && !validateEmail(clientEmail)) {
            toastr.error('Невірний формат email клієнта!');
            return;
        }
        if ((lat !== null && isNaN(lat)) || (lng !== null && isNaN(lng))) {
            toastr.error('Невірний формат координат!');
            return;
        }

        const lift = allLifts.find(l => l.id === liftId) || { photos: [], interventionHistory: [] };
        const updatedLift = {
            id: liftId,
            address,
            postalCode,
            serial: serial || '',
            brand: brand || '',
            capacity,
            speed,
            status,
            client: client || '',
            clientEmail: clientEmail || '',
            tech: tech || '',
            lat,
            lng,
            lastInspection: lastInspection || '',
            inspectionFrequency,
            report: report || '',
            interventionHistory: lift.interventionHistory || [],
            photos: lift.photos || []
        };

        const index = allLifts.findIndex(l => l.id === liftId);
        if (index !== -1) {
            allLifts[index] = updatedLift;
            logAction(`Оновлено ліфт ${liftId}`, currentUser.username);
            toastr.success(`Ліфт ${liftId} оновлено!`);
        } else {
            allLifts.push(updatedLift);
            logAction(`Створено ліфт ${liftId}`, currentUser.username);
            toastr.success(`Ліфт ${liftId} створено!`);
        }
        saveDataToLocalStorage();
        renderLiftsTable();
        renderCharts();
        $('#liftModal').modal('hide');
    });

    searchLift.on('input', function() {
        renderLiftsTable();
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
    renderLiftsTable();
    renderCharts();
    logAction('Відкрито сторінку ліфтів', currentUser.username);
});
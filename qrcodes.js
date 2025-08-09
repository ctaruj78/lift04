$(document).ready(function() {
    loadDataFromLocalStorage();
    console.log('QRCodes page loaded, currentUser:', currentUser);

    if (!checkAuth()) {
        location.href = 'login.html';
        return;
    }

    if (!checkRoleAccess('admin') && !checkRoleAccess('tech')) {
        console.log('User does not have access to qrcodes page, redirecting to index.html');
        location.href = 'index.html';
        return;
    }

    const qrTableBody = $('#qr-table-body');
    const generateAllButton = $('#generate-all-qr');
    const logoutButton = $('#logout-button');

    function updateSidebar() {
        $('.role-based').each(function() {
            const allowedRoles = $(this).data('role') ? $(this).data('role').split(',') : [];
            $(this).toggle(allowedRoles.includes(currentUser.role));
        });
    }

    function renderQRTable() {
        qrTableBody.empty();
        const userLifts = getUserLifts();
        if (!userLifts.length) {
            qrTableBody.html('<tr><td colspan="4" class="text-center">Ліфти не знайдено.</td></tr>');
            return;
        }

        const rows = userLifts.map(lift => {
            const qrCode = allQRCodes.find(qr => qr.liftId === lift.id);
            const qrUrl = qrCode ? qrCode.qrCodeUrl : '';
            return `
                <tr>
                    <td>${lift.id}</td>
                    <td>${lift.address}</td>
                    <td>
                        ${qrUrl ? `<img src="${qrUrl}" alt="QR Code" style="max-width: 100px;">` : 'Немає QR-коду'}
                    </td>
                    <td>
                        <button class="btn btn-primary btn-sm generate-qr" data-id="${lift.id}">Генерувати</button>
                        ${qrUrl ? `<a href="${qrUrl}" download="lift_${lift.id}_qr.png" class="btn btn-success btn-sm">Завантажити</a>` : ''}
                    </td>
                </tr>
            `;
        }).join('');
        qrTableBody.html(rows);

        $('#qr-table').DataTable({
            destroy: true,
            paging: true,
            searching: true,
            ordering: true,
            responsive: true,
            language: { url: '//cdn.datatables.net/plug-ins/1.10.25/i18n/Ukrainian.json' }
        });
    }

    $(document).on('click', '.generate-qr', function() {
        const liftId = parseInt($(this).data('id'));
        const lift = allLifts.find(l => l.id === liftId);
        if (!lift) {
            toastr.error('Ліфт не знайдено!');
            return;
        }

        const qrCanvas = document.createElement('canvas');
        QRCode.toCanvas(qrCanvas, `lift_${liftId}`, { errorCorrectionLevel: 'H' }, function(err) {
            if (err) {
                console.error('QR Code generation error:', err);
                toastr.error('Помилка генерації QR-коду: ' + err.message);
                return;
            }
            const qrUrl = qrCanvas.toDataURL('image/png');
            allQRCodes = allQRCodes.filter(qr => qr.liftId !== liftId);
            allQRCodes.push({ liftId, qrCodeUrl: qrUrl });
            saveDataToLocalStorage();
            renderQRTable();
            logAction(`Згенеровано QR-код для ліфта ${liftId}`, currentUser.username);
            toastr.success(`QR-код для ліфта ${liftId} створено!`);
        });
    });

    generateAllButton.on('click', function() {
        const userLifts = getUserLifts();
        let generatedCount = 0;
        userLifts.forEach(lift => {
            if (!allQRCodes.some(qr => qr.liftId === lift.id)) {
                const qrCanvas = document.createElement('canvas');
                QRCode.toCanvas(qrCanvas, `lift_${lift.id}`, { errorCorrectionLevel: 'H' }, function(err) {
                    if (!err) {
                        allQRCodes.push({ liftId: lift.id, qrCodeUrl: qrCanvas.toDataURL('image/png') });
                        generatedCount++;
                    }
                });
            }
        });
        if (generatedCount > 0) {
            saveDataToLocalStorage();
            renderQRTable();
            logAction(`Згенеровано ${generatedCount} QR-кодів`, currentUser.username);
            toastr.success(`Згенеровано ${generatedCount} QR-кодів!`);
        } else {
            toastr.info('Усі QR-коди вже створено.');
        }
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
    renderQRTable();
    logAction('Відкрито сторінку QR-кодів', currentUser.username);
});
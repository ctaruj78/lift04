$(document).ready(function() {
    loadDataFromLocalStorage();
    console.log('Map page loaded, currentUser:', currentUser);

    if (!checkAuth()) {
        console.log('Failed auth check, redirecting to login.html');
        location.href = 'login.html';
        return;
    }

    if (!checkRoleAccess('admin') && !checkRoleAccess('tech')) {
        console.log('User does not have access to map page, redirecting to index.html');
        location.href = 'index.html';
        return;
    }

    const logoutButton = $('#logout-button');
    const searchLift = $('#search-lift');
    let map;

    function updateSidebar() {
        $('.role-based').each(function() {
            const allowedRoles = $(this).data('role') ? $(this).data('role').split(',') : [];
            $(this).toggle(allowedRoles.includes(currentUser.role));
        });
    }

    function initializeMap() {
        map = L.map('map').setView([50.4501, 30.5234], 12); // Default to Kyiv
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
        renderMapMarkers();
    }

    function renderMapMarkers() {
        if (map) {
            map.eachLayer(layer => {
                if (layer instanceof L.Marker) map.removeLayer(layer);
            });
        }
        const searchTerm = searchLift.val().toLowerCase().trim();
        const userLifts = getUserLifts().filter(lift => 
            lift.lat && lift.lng && 
            (lift.address.toLowerCase().includes(searchTerm) || 
             (lift.client && lift.client.toLowerCase().includes(searchTerm)))
        );

        userLifts.forEach(lift => {
            const statusColor = lift.status === 'active' ? 'green' : lift.status === 'maintenance' ? 'orange' : 'red';
            const marker = L.circleMarker([lift.lat, lift.lng], {
                color: statusColor,
                radius: 8,
                fillOpacity: 0.8
            }).addTo(map);
            marker.bindPopup(`
                <b>${lift.address}</b><br>
                Статус: ${getStatusText(lift.status)}<br>
                Клієнт: ${lift.client || '-'}<br>
                Технік: ${lift.tech || '-'}<br>
                <button class="btn btn-primary btn-sm view-lift" data-id="${lift.id}">Деталі</button>
            `);
        });

        if (userLifts.length) {
            const bounds = L.latLngBounds(userLifts.map(lift => [lift.lat, lift.lng]));
            map.fitBounds(bounds);
        }
    }

    searchLift.on('input', function() {
        renderMapMarkers();
    });

    $(document).on('click', '.view-lift', function() {
        const liftId = parseInt($(this).data('id'));
        location.href = `lifts.html#lift-${liftId}`;
        logAction(`Переглянуто ліфт ${liftId} на карті`, currentUser.username);
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
    initializeMap();
    logAction('Відкрито сторінку карти', currentUser.username);
});
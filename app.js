// assets/js/app.js
$(document).ready(function() {
  // --- DOM Elements ---
  const contentArea = $('.content-wrapper');
  const navLinks = $('.sidebar .nav-sidebar .nav-link[data-view]');
  const liftsTableBody = $('#lifts-table-body');
  const usersTableBody = $('#users-table-body');
  const requestsTableBody = $('#requests-table-body');
  const inspectionsTableBody = $('#inspections-table-body');
  const logsTableBody = $('#logs-table-body');
  const liftsCount = $('#lifts-count');
  const usersCount = $('#users-count');
  const requestsCount = $('#requests-count');
  const activeLiftsCount = $('#active-lifts-count');
  const addLiftButton = $('#add-lift-button');
  const addUserButton = $('#add-user-button');
  const logoutButton = $('#logout-button');
  const liftSearchInput = $('#lift-search');
  const clearSearchButton = $('#clear-search');
  const exportLiftsButton = $('#export-lifts-button');

  // --- State Variables ---
  let allLifts = [];
  let allUsers = [];
  let allServiceRequests = [];
  let allLogs = [];
  let map = null;
  let currentUser = "admin"; // Тимчасово, поки немає авторизації

  // --- LocalStorage Keys ---
  const LS_LIFTS_KEY = 'liftApp_allLifts';
  const LS_USERS_KEY = 'liftApp_allUsers';
  const LS_REQUESTS_KEY = 'liftApp_allServiceRequests';
  const LS_LOGS_KEY = 'liftApp_allLogs';

  // --- Ініціалізація тестових даних ---
  function initializeTestData() {
    const existingLifts = JSON.parse(localStorage.getItem(LS_LIFTS_KEY) || '[]');
    if (!existingLifts.length) {
      const testLifts = [
        { id: 1, address: "вул. Шевченка, 10", serial: "SN123", brand: "-", status: "active", client: "ТОВ Меркурий", tech: "", lat: 50.4501, lng: 30.5234, lastInspection: "2025-01-01", inspectionFrequency: 12, report: "" },
        { id: 2, address: "вул. Франка, 5", serial: "SN456", brand: "-", status: "maintenance", client: "ОСББ Надія", tech: "", lat: 50.4511, lng: 30.5254, lastInspection: "2025-03-01", inspectionFrequency: 6, report: "" },
        { id: 3, address: "вул. Лесі Українки, 15", serial: "SN789", brand: "-", status: "out_of_service", client: "ТОВ Меркурий", tech: "", lat: 50.4521, lng: 30.5274, lastInspection: "", inspectionFrequency: 0, report: "" },
        { id: 4, address: "вул. Грушевського, 20", serial: "SN012", brand: "-", status: "active", client: "ХК Пластік", tech: "", lat: 50.4531, lng: 30.5294, lastInspection: "", inspectionFrequency: 0, report: "" }
      ];
      localStorage.setItem(LS_LIFTS_KEY, JSON.stringify(testLifts));
    }

    const existingUsers = JSON.parse(localStorage.getItem(LS_USERS_KEY) || '[]');
    if (!existingUsers.length) {
      const testUsers = [
        { id: 1, username: "admin", password: "admin123", role: "admin" },
        { id: 2, username: "tech", password: "tech123", role: "tech" },
        { id: 3, username: "client", password: "client123", role: "client" }
      ];
      localStorage.setItem(LS_USERS_KEY, JSON.stringify(testUsers));
    }

    const existingRequests = JSON.parse(localStorage.getItem(LS_REQUESTS_KEY) || '[]');
    if (!existingRequests.length) {
      const testRequests = [
        { id: 1, liftId: 1, description: "Ремонт дверей", status: "pending" }
      ];
      localStorage.setItem(LS_REQUESTS_KEY, JSON.stringify(testRequests));
    }

    const existingLogs = JSON.parse(localStorage.getItem(LS_LOGS_KEY) || '[]');
    if (!existingLogs.length) {
      const testLogs = [
        { id: 1, action: "Додаток запущено", user: "admin", timestamp: new Date().toISOString() }
      ];
      localStorage.setItem(LS_LOGS_KEY, JSON.stringify(testLogs));
    }
  }

  // --- LocalStorage Functions ---
  function loadDataFromLocalStorage() {
    allLifts = JSON.parse(localStorage.getItem(LS_LIFTS_KEY) || '[]');
    allUsers = JSON.parse(localStorage.getItem(LS_USERS_KEY) || '[]');
    allServiceRequests = JSON.parse(localStorage.getItem(LS_REQUESTS_KEY) || '[]');
    allLogs = JSON.parse(localStorage.getItem(LS_LOGS_KEY) || '[]');
  }

  function saveDataToLocalStorage() {
    localStorage.setItem(LS_LIFTS_KEY, JSON.stringify(allLifts));
    localStorage.setItem(LS_USERS_KEY, JSON.stringify(allUsers));
    localStorage.setItem(LS_REQUESTS_KEY, JSON.stringify(allServiceRequests));
    localStorage.setItem(LS_LOGS_KEY, JSON.stringify(allLogs));
  }

  // --- Логування дій ---
  function logAction(action, user) {
    const logEntry = {
      id: allLogs.length ? Math.max(...allLogs.map(log => log.id)) + 1 : 1,
      action: action,
      user: user || currentUser,
      timestamp: new Date().toISOString()
    };
    allLogs.push(logEntry);
    saveDataToLocalStorage();
  }

  // --- Helper Functions ---
  function getStatusClass(status) {
    if (status === 'active') return 'badge-success';
    if (status === 'maintenance') return 'badge-warning';
    if (status === 'out_of_service') return 'badge-danger';
    return 'badge-secondary';
  }

  function getStatusText(status) {
    if (status === 'active') return 'Активний';
    if (status === 'maintenance') return 'На обслуговуванні';
    if (status === 'out_of_service') return 'Не працює';
    return 'Невідомо';
  }

  // --- Розрахунок дати наступної інспекції ---
  function calculateNextInspection(lastInspection, frequencyMonths) {
    if (!lastInspection || !frequencyMonths) return null;
    const lastDate = new Date(lastInspection);
    if (isNaN(lastDate.getTime())) return null;
    lastDate.setMonth(lastDate.getMonth() + parseInt(frequencyMonths));
    return lastDate.toISOString().split('T')[0];
  }

  // --- Перевірка, чи наближається дата інспекції ---
  function isInspectionDue(nextInspectionDate) {
    if (!nextInspectionDate) return false;
    const today = new Date();
    const nextDate = new Date(nextInspectionDate);
    if (isNaN(nextDate.getTime())) return false;
    const diffDays = (nextDate - today) / (1000 * 60 * 60 * 24);
    return diffDays <= 30 && diffDays >= 0;
  }

  // --- Генерація QR-коду ---
  function generateQRCode(liftId) {
    const qrCodeDiv = document.getElementById('qr-code');
    qrCodeDiv.innerHTML = '';
    const qrUrl = `liftapp://lift/${liftId}`;
    try {
      QRCode.toCanvas(qrUrl, { width: 150, margin: 1 }, function(error, canvas) {
        if (error) {
          qrCodeDiv.innerHTML = '<p>Помилка генерації QR-коду.</p>';
        } else {
          qrCodeDiv.appendChild(canvas);
        }
      });
    } catch (e) {
      qrCodeDiv.innerHTML = '<p>Не вдалося завантажити бібліотеку QR-коду.</p>';
    }
  }

  // --- Геокодування адреси ---
  async function geocodeAddress(address) {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`);
      const data = await response.json();
      if (data.length > 0) {
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      }
      return { lat: 0, lng: 0 };
    } catch (e) {
      console.error("Error geocoding address:", e);
      return { lat: 0, lng: 0 };
    }
  }

  // --- Ініціалізація карти ---
  function initializeMap() {
    if (map) {
      map.remove();
    }
    map = L.map('map').setView([50.4501, 30.5234], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    allLifts.forEach(lift => {
      if (lift.lat && lift.lng) {
        const marker = L.marker([lift.lat, lift.lng]).addTo(map);
        marker.bindPopup(`
          <b>Ліфт ID: ${lift.id}</b><br>
          Адреса: ${lift.address}<br>
          Статус: ${getStatusText(lift.status)}<br>
          Клієнт: ${lift.client || '-'}
        `);
      }
    });
  }

  // --- Dashboard Update ---
  function updateDashboardCards() {
    const activeLifts = allLifts.filter(lift => lift.status === 'active').length;
    liftsCount.text(allLifts.length);
    usersCount.text(allUsers.length);
    requestsCount.text(allServiceRequests.length);
    activeLiftsCount.text(activeLifts);
    renderInspectionsTable();
  }

  // --- Rendering Functions ---
  function renderLiftsTable(filteredLifts = allLifts) {
    liftsTableBody.empty();
    if (!filteredLifts.length) {
      liftsTableBody.html('<tr><td colspan="7" class="text-center">Ліфти не знайдено.</td></tr>');
      return;
    }

    const rows = filteredLifts.map(lift => `
      <tr>
        <td>${lift.id}</td>
        <td>${lift.address || '-'}</td>
        <td>${lift.serial || '-'}</td>
        <td>${lift.brand || '-'}</td>
        <td><span class="badge ${getStatusClass(lift.status)}">${getStatusText(lift.status)}</span></td>
        <td>${lift.client || '-'}</td>
        <td>
          <button class="btn btn-info btn-sm" data-action="details" data-id="${lift.id}" data-toggle="modal" data-target="#liftDetailsModal">Деталі</button>
          <button class="btn btn-warning btn-sm" data-action="edit-lift" data-id="${lift.id}" data-toggle="modal" data-target="#liftModal">Ред./QR</button>
          <button class="btn btn-primary btn-sm" data-action="assign-tech" data-id="${lift.id}" data-toggle="modal" data-target="#assignTechModal">Призначити</button>
          <button class="btn btn-danger btn-sm" data-action="delete-lift" data-id="${lift.id}">Вид.</button>
          <button class="btn btn-success btn-sm" data-action="request" data-id="${lift.id}" data-toggle="modal" data-target="#requestModal">Заявка</button>
        </td>
      </tr>
    `).join('');
    liftsTableBody.html(rows);

    $('#lifts-table').DataTable({
      destroy: true,
      paging: true,
      searching: false, // Вимкнемо вбудований пошук DataTables, бо використовуємо свій
      ordering: true,
      language: { url: '//cdn.datatables.net/plug-ins/1.10.25/i18n/Ukrainian.json' }
    });
  }

  function renderUsersTable() {
    usersTableBody.empty();
    if (!allUsers.length) {
      usersTableBody.html('<tr><td colspan="4" class="text-center">Користувачів не знайдено.</td></tr>');
      return;
    }

    const rows = allUsers.map(user => `
      <tr>
        <td>${user.id}</td>
        <td>${user.username}</td>
        <td>${user.role}</td>
        <td>
          <button class="btn btn-warning btn-sm" data-action="edit-user" data-id="${user.id}" data-toggle="modal" data-target="#userModal">Редагувати</button>
          <button class="btn btn-danger btn-sm" data-action="delete-user" data-id="${user.id}">Видалити</button>
        </td>
      </tr>
    `).join('');
    usersTableBody.html(rows);

    $('#users-table').DataTable({
      destroy: true,
      paging: true,
      searching: true,
      ordering: true,
      language: { url: '//cdn.datatables.net/plug-ins/1.10.25/i18n/Ukrainian.json' }
    });
  }

  function renderRequestsTable() {
    requestsTableBody.empty();
    if (!allServiceRequests.length) {
      requestsTableBody.html('<tr><td colspan="5" class="text-center">Заявки не знайдено.</td></tr>');
      return;
    }

    const rows = allServiceRequests.map(request => `
      <tr>
        <td>${request.id}</td>
        <td>${request.liftId}</td>
        <td>${request.description}</td>
        <td>${request.status}</td>
        <td>
          <button class="btn btn-danger btn-sm" data-action="delete-request" data-id="${request.id}">Видалити</button>
        </td>
      </tr>
    `).join('');
    requestsTableBody.html(rows);

    $('#requests-table').DataTable({
      destroy: true,
      paging: true,
      searching: true,
      ordering: true,
      language: { url: '//cdn.datatables.net/plug-ins/1.10.25/i18n/Ukrainian.json' }
    });
  }

  function renderInspectionsTable() {
    inspectionsTableBody.empty();
    const liftsWithInspections = allLifts.filter(lift => {
      const nextInspection = calculateNextInspection(lift.lastInspection, lift.inspectionFrequency);
      return nextInspection && isInspectionDue(nextInspection);
    });

    if (!liftsWithInspections.length) {
      inspectionsTableBody.html('<tr><td colspan="4" class="text-center">Нагадувань про інспекції немає.</td></tr>');
      return;
    }

    const rows = liftsWithInspections.map(lift => {
      const nextInspection = calculateNextInspection(lift.lastInspection, lift.inspectionFrequency);
      return `
        <tr>
          <td>${lift.id}</td>
          <td>${lift.address || '-'}</td>
          <td>${nextInspection || '-'}</td>
          <td>
            <button class="btn btn-warning btn-sm" data-action="edit-lift" data-id="${lift.id}" data-toggle="modal" data-target="#liftModal">Оновити</button>
          </td>
        </tr>
      `;
    }).join('');
    inspectionsTableBody.html(rows);

    $('#inspections-table').DataTable({
      destroy: true,
      paging: true,
      searching: true,
      ordering: true,
      language: { url: '//cdn.datatables.net/plug-ins/1.10.25/i18n/Ukrainian.json' }
    });
  }

  function renderLogsTable() {
    logsTableBody.empty();
    if (!allLogs.length) {
      logsTableBody.html('<tr><td colspan="4" class="text-center">Записів у журналі немає.</td></tr>');
      return;
    }

    const rows = allLogs.map(log => `
      <tr>
        <td>${log.id}</td>
        <td>${log.action}</td>
        <td>${log.user}</td>
        <td>${new Date(log.timestamp).toLocaleString('uk-UA')}</td>
      </tr>
    `).join('');
    logsTableBody.html(rows);

    $('#logs-table').DataTable({
      destroy: true,
      paging: true,
      searching: true,
      ordering: true,
      language: { url: '//cdn.datatables.net/plug-ins/1.10.25/i18n/Ukrainian.json' }
    });
  }

  // --- Core App Functions ---
  function showView(viewId) {
    contentArea.find('section').addClass('hidden');
    const targetView = $(`#${viewId}`);
    targetView.removeClass('hidden');

    if (viewId === 'dashboard-view') {
      updateDashboardCards();
    } else if (viewId === 'lifts-view') {
      renderLiftsTable();
    } else if (viewId === 'users-view') {
      renderUsersTable();
    } else if (viewId === 'requests-view') {
      renderRequestsTable();
    } else if (viewId === 'logs-view') {
      renderLogsTable();
    } else if (viewId === 'map-view') {
      initializeMap();
    }

    navLinks.removeClass('active');
    const activeLink = navLinks.filter(`[data-view="${viewId}"]`);
    activeLink.addClass('active');
  }

  // --- Автоматичне створення заявки ---
  function autoCreateRequest(liftId, status) {
    if (status === 'maintenance' || status === 'out_of_service') {
      const existingRequest = allServiceRequests.find(r => r.liftId === liftId && r.status === 'pending');
      if (!existingRequest) {
        const description = status === 'maintenance' ? 'Ліфт на обслуговуванні' : 'Ліфт не працює';
        const newRequest = {
          id: allServiceRequests.length ? Math.max(...allServiceRequests.map(r => r.id)) + 1 : 1,
          liftId: liftId,
          description: description,
          status: 'pending'
        };
        allServiceRequests.push(newRequest);
        saveDataToLocalStorage();
        logAction(`Автоматично створено заявку для ліфта ${liftId}: ${description}`, currentUser);
      }
    }
  }

  // --- Event Listeners ---
  $(document).on('click', 'button[data-action]', function() {
    const action = $(this).data('action');
    const id = parseInt($(this).data('id'));

    if (action === 'details') {
      const lift = allLifts.find(l => l.id === id);
      if (lift) {
        $('#detail-lift-id').text(lift.id);
        $('#detail-lift-address').text(lift.address || '-');
        $('#detail-lift-serial').text(lift.serial || '-');
        $('#detail-lift-brand').text(lift.brand || '-');
        $('#detail-lift-status').text(getStatusText(lift.status));
        $('#detail-lift-client').text(lift.client || '-');
        $('#detail-lift-tech').text(lift.tech || 'Не призначено');
        $('#detail-lift-last-inspection').text(lift.lastInspection || 'Не вказано');
        $('#detail-lift-inspection-frequency').text(lift.inspectionFrequency ? `${lift.inspectionFrequency} місяців` : 'Не вказано');
        if (lift.report) {
          $('#detail-lift-report').html(`<a href="${lift.report}" download="report_lift_${lift.id}.pdf">Завантажити звіт</a>`);
        } else {
          $('#detail-lift-report').text('Звіт відсутній');
        }
        $('#liftDetailsModal').modal('show');
        logAction(`Переглянуто деталі ліфта ${id}`, currentUser);
      }
    } else if (action === 'edit-lift') {
      const lift = allLifts.find(l => l.id === id);
      if (lift) {
        $('#liftModalTitle').text('Редагувати ліфт');
        $('#lift-id').val(lift.id);
        $('#lift-address').val(lift.address);
        $('#lift-serial').val(lift.serial);
        $('#lift-brand').val(lift.brand);
        $('#lift-status').val(lift.status);
        $('#lift-client').val(lift.client);
        $('#lift-lat').val(lift.lat || '');
        $('#lift-lng').val(lift.lng || '');
        $('#lift-last-inspection').val(lift.lastInspection || '');
        $('#lift-inspection-frequency').val(lift.inspectionFrequency || '');
        if (lift.report) {
          $('#report-status').html(`Звіт завантажено. <button class="btn btn-danger btn-sm" data-action="delete-report">Видалити звіт</button>`);
        } else {
          $('#report-status').html('');
        }
        generateQRCode(lift.id);
        $('#liftModal').modal('show');
        logAction(`Відкрито редагування ліфта ${id}`, currentUser);
      }
    } else if (action === 'delete-report') {
      const liftId = parseInt($('#lift-id').val());
      const lift = allLifts.find(l => l.id === liftId);
      if (lift) {
        lift.report = '';
        saveDataToLocalStorage();
        $('#report-status').html('');
        logAction(`Видалено звіт для ліфта ${liftId}`, currentUser);
      }
    } else if (action === 'delete-lift') {
      if (confirm('Ви впевнені, що хочете видалити цей ліфт?')) {
        allLifts = allLifts.filter(l => l.id !== id);
        saveDataToLocalStorage();
        renderLiftsTable();
        updateDashboardCards();
        logAction(`Видалено ліфт ${id}`, currentUser);
      }
    } else if (action === 'request') {
      $('#request-lift-id').val(id);
      $('#request-description').val('');
      $('#requestModal').modal('show');
      logAction(`Відкрито створення заявки для ліфта ${id}`, currentUser);
    } else if (action === 'assign-tech') {
      const lift = allLifts.find(l => l.id === id);
      if (lift) {
        $('#assign-lift-id').val(id);
        const techs = allUsers.filter(u => u.role === 'tech');
        const options = techs.map(tech => `<option value="${tech.username}">${tech.username}</option>`).join('');
        $('#assign-tech').html(options);
        $('#assignTechModal').modal('show');
        logAction(`Відкрито призначення техніка для ліфта ${id}`, currentUser);
      }
    } else if (action === 'edit-user') {
      const user = allUsers.find(u => u.id === id);
      if (user) {
        $('#userModalTitle').text('Редагувати користувача');
        $('#user-id').val(user.id);
        $('#user-username').val(user.username);
        $('#user-password').val(user.password);
        $('#user-role').val(user.role);
        $('#userModal').modal('show');
        logAction(`Відкрито редагування користувача ${id}`, currentUser);
      }
    } else if (action === 'delete-user') {
      if (confirm('Ви впевнені, що хочете видалити цього користувача?')) {
        allUsers = allUsers.filter(u => u.id !== id);
        saveDataToLocalStorage();
        renderUsersTable();
        updateDashboardCards();
        logAction(`Видалено користувача ${id}`, currentUser);
      }
    } else if (action === 'delete-request') {
      if (confirm('Ви впевнені, що хочете видалити цю заявку?')) {
        allServiceRequests = allServiceRequests.filter(r => r.id !== id);
        saveDataToLocalStorage();
        renderRequestsTable();
        updateDashboardCards();
        logAction(`Видалено заявку ${id}`, currentUser);
      }
    }
  });

  // Додавання нового ліфта
  addLiftButton.on('click', function() {
    $('#liftModalTitle').text('Додати ліфт');
    $('#lift-id').val('');
    $('#lift-address').val('');
    $('#lift-serial').val('');
    $('#lift-brand').val('');
    $('#lift-status').val('active');
    $('#lift-client').val('');
    $('#lift-lat').val('');
    $('#lift-lng').val('');
    $('#lift-last-inspection').val('');
    $('#lift-inspection-frequency').val('');
    $('#lift-report').val('');
    $('#report-status').html('');
    document.getElementById('qr-code').innerHTML = '<p>QR-код з\'явиться після збереження ліфта.</p>';
    $('#liftModal').modal('show');
    logAction('Відкрито додавання нового ліфта', currentUser);
  });

  // Збереження ліфта
  $('#save-lift-button').on('click', function() {
    const liftId = $('#lift-id').val();
    const fileInput = document.getElementById('lift-report');

    const saveLift = (reportData) => {
      const previousLift = allLifts.find(l => l.id === parseInt(liftId));
      const newStatus = $('#lift-status').val();
      const newLift = {
        id: liftId ? parseInt(liftId) : allLifts.length ? Math.max(...allLifts.map(l => l.id)) + 1 : 1,
        address: $('#lift-address').val(),
        serial: $('#lift-serial').val(),
        brand: $('#lift-brand').val(),
        status: newStatus,
        client: $('#lift-client').val(),
        tech: liftId ? allLifts.find(l => l.id === parseInt(liftId))?.tech || '' : '',
        lat: parseFloat($('#lift-lat').val()) || 0,
        lng: parseFloat($('#lift-lng').val()) || 0,
        lastInspection: $('#lift-last-inspection').val() || '',
        inspectionFrequency: parseInt($('#lift-inspection-frequency').val()) || 0,
        report: reportData || ''
      };

      if (liftId) {
        const index = allLifts.findIndex(l => l.id === parseInt(liftId));
        if (index !== -1) {
          allLifts[index] = newLift;
          logAction(`Оновлено ліфт ${liftId}`, currentUser);
          // Перевіряємо, чи змінився статус, і створюємо заявку
          if (previousLift && previousLift.status !== newStatus) {
            autoCreateRequest(newLift.id, newStatus);
          }
        }
      } else {
        allLifts.push(newLift);
        logAction(`Додано новий ліфт ${newLift.id}`, currentUser);
        autoCreateRequest(newLift.id, newStatus);
      }

      saveDataToLocalStorage();
      renderLiftsTable();
      updateDashboardCards();
      $('#liftModal').modal('hide');
    };

    if (fileInput.files.length > 0) {
      const file = fileInput.files[0];
      const reader = new FileReader();
      reader.onload = function(e) {
        const reportData = e.target.result;
        saveLift(reportData);
      };
      reader.onerror = function() {
        alert('Помилка при завантаженні файлу. Спробуйте ще раз.');
        saveLift('');
      };
      reader.readAsDataURL(file);
    } else {
      const lift = allLifts.find(l => l.id === parseInt(liftId));
      const reportData = lift ? lift.report : '';
      saveLift(reportData);
    }
  });

  // Завантаження QR-коду
  $('#download-qr-button').on('click', function() {
    const canvas = document.querySelector('#qr-code canvas');
    const liftId = $('#lift-id').val();
    if (canvas && liftId) {
      const link = document.createElement('a');
      link.download = `lift-qr-${liftId}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      logAction(`Завантажено QR-код для ліфта ${liftId}`, currentUser);
    } else {
      alert('QR-код ще не згенеровано або ліфт не збережено.');
    }
  });

  // Геокодування адреси
  $('#geocode-button').on('click', async function() {
    const address = $('#lift-address').val();
    if (!address) {
      alert('Будь ласка, введіть адресу ліфта.');
      return;
    }
    const coords = await geocodeAddress(address);
    $('#lift-lat').val(coords.lat);
    $('#lift-lng').val(coords.lng);
    if (coords.lat === 0 && coords.lng === 0) {
      alert('Не вдалося визначити координати. Перевірте адресу або введіть координати вручну.');
    }
    logAction(`Виконано геокодування адреси: ${address}`, currentUser);
  });

  // Створення заявки
  $('#save-request-button').on('click', function() {
    const liftId = parseInt($('#request-lift-id').val());
    const description = $('#request-description').val();
    const newRequest = {
      id: allServiceRequests.length ? Math.max(...allServiceRequests.map(r => r.id)) + 1 : 1,
      liftId: liftId,
      description: description,
      status: 'pending'
    };

    allServiceRequests.push(newRequest);
    saveDataToLocalStorage();
    renderRequestsTable();
    updateDashboardCards();
    $('#requestModal').modal('hide');
    logAction(`Створено заявку ${newRequest.id} для ліфта ${liftId}`, currentUser);
  });

  // Призначення техніка
  $('#save-assign-tech-button').on('click', function() {
    const liftId = parseInt($('#assign-lift-id').val());
    const techUsername = $('#assign-tech').val();
    const lift = allLifts.find(l => l.id === liftId);
    if (lift) {
      lift.tech = techUsername;
      saveDataToLocalStorage();
      renderLiftsTable();
      $('#assignTechModal').modal('hide');
      logAction(`Призначено техніка ${techUsername} для ліфта ${liftId}`, currentUser);
    }
  });

  // Додавання нового користувача
  addUserButton.on('click', function() {
    $('#userModalTitle').text('Додати користувача');
    $('#user-id').val('');
    $('#user-username').val('');
    $('#user-password').val('');
    $('#user-role').val('client');
    $('#userModal').modal('show');
    logAction('Відкрито додавання нового користувача', currentUser);
  });

  // Збереження користувача
  $('#save-user-button').on('click', function() {
    const userId = $('#user-id').val();
    const newUser = {
      id: userId ? parseInt(userId) : allUsers.length ? Math.max(...allUsers.map(u => u.id)) + 1 : 1,
      username: $('#user-username').val(),
      password: $('#user-password').val(),
      role: $('#user-role').val()
    };

    if (userId) {
      const index = allUsers.findIndex(u => u.id === parseInt(userId));
      if (index !== -1) {
        allUsers[index] = newUser;
        logAction(`Оновлено користувача ${newUser.id}`, currentUser);
      }
    } else {
      allUsers.push(newUser);
      logAction(`Додано нового користувача ${newUser.id}`, currentUser);
    }

    saveDataToLocalStorage();
    renderUsersTable();
    updateDashboardCards();
    $('#userModal').modal('hide');
  });

  // Пошук ліфтів
  liftSearchInput.on('input', function() {
    const searchTerm = $(this).val().toLowerCase();
    const filteredLifts = allLifts.filter(lift =>
      lift.address.toLowerCase().includes(searchTerm) ||
      lift.serial.toLowerCase().includes(searchTerm) ||
      lift.brand.toLowerCase().includes(searchTerm) ||
      lift.client.toLowerCase().includes(searchTerm) ||
      getStatusText(lift.status).toLowerCase().includes(searchTerm)
    );
    renderLiftsTable(filteredLifts);
  });

  clearSearchButton.on('click', function() {
    liftSearchInput.val('');
    renderLiftsTable();
  });

  // Експорт ліфтів у CSV
  exportLiftsButton.on('click', function() {
    const csvRows = [];
    const headers = ['ID', 'Адреса', 'Серійний №', 'Марка', 'Статус', 'Клієнт', 'Технік', 'Широта', 'Довгота', 'Дата останньої інспекції', 'Періодичність інспекцій'];
    csvRows.push(headers.join(','));

    allLifts.forEach(lift => {
      const row = [
        lift.id,
        `"${lift.address || ''}"`,
        `"${lift.serial || ''}"`,
        `"${lift.brand || ''}"`,
        `"${getStatusText(lift.status)}"`,
        `"${lift.client || ''}"`,
        `"${lift.tech || ''}"`,
        lift.lat,
        lift.lng,
        `"${lift.lastInspection || ''}"`,
        lift.inspectionFrequency || 0
      ];
      csvRows.push(row.join(','));
    });

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'lifts_export.csv';
    link.click();
    logAction('Експортовано ліфти у CSV', currentUser);
  });

  // Вихід
  logoutButton.on('click', function() {
    location.reload();
    logAction('Вихід із системи', currentUser);
  });

  // Перемикання вкладок
  navLinks.on('click', function(e) {
    e.preventDefault();
    const viewId = $(this).data('view');
    showView(viewId);
    logAction(`Перейдено до вкладки ${viewId}`, currentUser);
  });

  // --- Initial App Initialization ---
  function initializeApp() {
    initializeTestData();
    loadDataFromLocalStorage();
    showView('dashboard-view');
  }

  initializeApp();
});
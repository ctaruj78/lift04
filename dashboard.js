$(document).ready(function() {
  loadDataFromLocalStorage();
  console.log('Dashboard loaded, currentUser:', currentUser);

  if (!checkAuth()) return;

  const newRequestsCount = $('#new-requests-count');
  const activeLiftsCount = $('#active-lifts-count');
  const maintenanceLiftsCount = $('#maintenance-lifts-count');
  const usersCount = $('#users-count');
  const inspectionsTableBody = $('#inspections-table-body');
  const quickActionsTableBody = $('#quick-actions-table-body');
  const logoutButton = $('#logout-button');

  function updateSidebar() {
    $('.role-based').each(function() {
      const allowedRoles = $(this).data('role').split(',');
      if (!allowedRoles.includes(currentUser.role)) {
        $(this).hide();
      }
    });
  }

  function initializeTestData() {
    const existingLifts = JSON.parse(localStorage.getItem(LS_LIFTS_KEY) || '[]');
    if (!existingLifts.length) {
      const testLifts = [
        { id: 1, address: "вул. Шевченка, 10", postalCode: "01001", serial: "SN123", brand: "Otis", capacity: 8, speed: 1.5, status: "active", client: "client", clientEmail: "client1@example.com", tech: "", lat: 50.4501, lng: 30.5234, lastInspection: "2025-01-01", inspectionFrequency: 12, report: "" },
        { id: 2, address: "вул. Франка, 5", postalCode: "02002", serial: "SN456", brand: "", capacity: null, speed: null, status: "maintenance", client: "ОСББ Надія", clientEmail: "", tech: "", lat: 50.4511, lng: 30.5254, lastInspection: "2025-03-01", inspectionFrequency: 6, report: "" },
        { id: 3, address: "вул. Лесі Українки, 15", postalCode: "03003", serial: "SN789", brand: "Kone", capacity: 10, speed: 2.0, status: "out_of_service", client: "ТОВ Меркурий", clientEmail: "client2@example.com", tech: "", lat: 50.4521, lng: 30.5274, lastInspection: "", inspectionFrequency: 0, report: "" },
        { id: 4, address: "вул. Грушевського, 20", postalCode: "04004", serial: "SN012", brand: "", capacity: null, speed: null, status: "active", client: "client", clientEmail: "", tech: "", lat: 50.4531, lng: 30.5294, lastInspection: "", inspectionFrequency: 0, report: "" }
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
        { id: 1, action: "Додаток запущено", user: "admin", timestamp: new Date().toISOString(), details: {} }
      ];
      localStorage.setItem(LS_LOGS_KEY, JSON.stringify(testLogs));
    }
  }

  function updateDashboardCards() {
    const userLifts = getUserLifts();
    const activeLifts = userLifts.filter(lift => lift.status === 'active').length;
    const maintenanceLifts = userLifts.filter(lift => lift.status === 'maintenance').length;
    activeLiftsCount.text(activeLifts);
    maintenanceLiftsCount.text(maintenanceLifts);
    newRequestsCount.text(currentUser.role === 'client' ? allServiceRequests.filter(r => userLifts.some(l => l.id === r.liftId)).length : allServiceRequests.length);
    usersCount.text(currentUser.role === 'admin' ? allUsers.length : '-');
    renderInspectionsTable();
    renderQuickActionsTable();
  }

  function renderInspectionsTable() {
    inspectionsTableBody.empty();
    const userLifts = getUserLifts();
    const liftsWithInspections = userLifts.filter(lift => {
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
            ${currentUser.role === 'client' ? 'Очікуйте на перевірку' : `<a href="lifts.html#edit-${lift.id}" class="btn btn-warning btn-sm">Оновити</a>`}
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

  function renderQuickActionsTable() {
    quickActionsTableBody.empty();
    const userLifts = getUserLifts();
    if (!userLifts.length) {
      quickActionsTableBody.html('<tr><td colspan="4" class="text-center">Ліфтів не знайдено.</td></tr>');
      return;
    }

    const isClient = currentUser.role === 'client';
    const isTech = currentUser.role === 'tech';
    const rows = userLifts.map(lift => `
      <tr>
        <td>${lift.id}</td>
        <td>${lift.address || '-'}</td>
        <td><span class="badge ${getStatusClass(lift.status)}">${getStatusText(lift.status)}</span></td>
        <td>
          <a href="lifts.html#edit-${lift.id}" class="btn btn-warning btn-sm">${isClient ? 'Переглянути' : 'Редагувати'}</a>
          ${isClient ? '' : `<button class="btn btn-success btn-sm" data-action="request" data-id="${lift.id}" data-toggle="modal" data-target="#requestModal">Заявка</button>`}
        </td>
      </tr>
    `).join('');
    quickActionsTableBody.html(rows);

    $('#quick-actions-table').DataTable({
      destroy: true,
      paging: true,
      searching: true,
      ordering: true,
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

  initializeTestData();
  updateSidebar();
  updateDashboardCards();
  logAction('Відкрито дашборд', currentUser.username);
});
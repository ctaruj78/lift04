$(document).ready(function() {
    loadDataFromLocalStorage();
    console.log('Users page loaded, currentUser:', currentUser);

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

    const usersTableBody = $('#users-table-body');
    const addUserButton = $('#add-user');
    const saveUserButton = $('#save-user');
    const logoutButton = $('#logout-button');
    let dataTable;

    function updateSidebar() {
        $('.role-based').each(function() {
            const allowedRoles = $(this).data('role') ? $(this).data('role').split(',') : [];
            $(this).toggle(allowedRoles.includes(currentUser.role));
        });
    }

    function renderUsersTable() {
        usersTableBody.empty();
        if (!allUsers.length) {
            usersTableBody.html('<tr><td colspan="4" class="text-center">Користувачі не знайдено.</td></tr>');
            return;
        }

        const rows = allUsers.map(user => `
            <tr>
                <td>${user.username}</td>
                <td>${user.role}</td>
                <td>${user.email}</td>
                <td>
                    <button class="btn btn-warning btn-sm edit-user" data-username="${user.username}" data-toggle="modal" data-target="#userModal">Редагувати</button>
                    <button class="btn btn-danger btn-sm delete-user" data-username="${user.username}">Видалити</button>
                </td>
            </tr>
        `).join('');
        usersTableBody.html(rows);

        if (dataTable) {
            dataTable.destroy();
        }
        dataTable = $('#users-table').DataTable({
            paging: true,
            searching: true,
            ordering: true,
            responsive: true,
            language: { url: '//cdn.datatables.net/plug-ins/1.10.25/i18n/Ukrainian.json' }
        });
    }

    addUserButton.on('click', function() {
        $('#userModalTitle').text('Додати користувача');
        $('#user-form')[0].reset();
        $('#user-username').val('');
        $('#user-access-code').val(generateAccessCode());
        $('#userModal').modal('show');
        logAction('Відкрито створення нового користувача', currentUser.username);
    });

    $(document).on('click', '.edit-user', function() {
        const username = $(this).data('username');
        const user = allUsers.find(u => u.username === username);
        if (!user) {
            toastr.error('Користувача не знайдено!');
            return;
        }
        $('#userModalTitle').text('Редагувати користувача');
        $('#user-username').val(user.username);
        $('#user-new-username').val(user.username);
        $('#user-role').val(user.role);
        $('#user-email').val(user.email);
        $('#user-access-code').val(user.accessCode);
        $('#userModal').modal('show');
        logAction(`Відкрито редагування користувача ${username}`, currentUser.username);
    });

    $(document).on('click', '.delete-user', function() {
        const username = $(this).data('username');
        if (username === currentUser.username) {
            toastr.error('Неможливо видалити поточного користувача!');
            return;
        }
        if (!confirm(`Ви впевнені, що хочете видалити користувача ${username}?`)) return;
        allUsers = allUsers.filter(u => u.username !== username);
        allLifts.forEach(lift => {
            if (lift.tech === username) lift.tech = '';
            if (lift.client === username) lift.client = '';
        });
        saveDataToLocalStorage();
        renderUsersTable();
        logAction(`Видалено користувача ${username}`, currentUser.username);
        toastr.success(`Користувача ${username} видалено!`);
    });

    saveUserButton.on('click', function() {
        const originalUsername = $('#user-username').val();
        const username = $('#user-new-username').val().trim();
        const role = $('#user-role').val();
        const email = $('#user-email').val().trim();
        const accessCode = $('#user-access-code').val().trim();

        if (!username || !role || !email || !accessCode) {
            toastr.error('Усі поля обов’язкові!');
            return;
        }
        if (!validateEmail(email)) {
            toastr.error('Невірний формат email!');
            return;
        }
        if (allUsers.some(u => u.username === username && u.username !== originalUsername)) {
            toastr.error('Користувач із таким ім’ям уже існує!');
            return;
        }

        const user = allUsers.find(u => u.username === originalUsername) || {};
        const updatedUser = {
            username,
            role,
            email,
            accessCode,
            rating: user.rating || 0
        };

        const index = allUsers.findIndex(u => u.username === originalUsername);
        if (index !== -1) {
            allUsers[index] = updatedUser;
            if (currentUser.username === originalUsername) {
                currentUser = updatedUser;
            }
            logAction(`Оновлено користувача ${username}`, currentUser.username);
            toastr.success(`Користувача ${username} оновлено!`);
        } else {
            allUsers.push(updatedUser);
            logAction(`Створено користувача ${username}`, currentUser.username);
            toastr.success(`Користувача ${username} створено!`);
        }
        saveDataToLocalStorage();
        renderUsersTable();
        $('#userModal').modal('hide');
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
    renderUsersTable();
    logAction('Відкрито сторінку користувачів', currentUser.username);
});
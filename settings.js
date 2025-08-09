$(document).ready(function() {
    loadDataFromLocalStorage();
    console.log('Settings page loaded, currentUser:', currentUser);

    if (!checkAuth()) {
        location.href = 'login.html';
        return;
    }

    const saveSettingsButton = $('#save-settings');
    const logoutButton = $('#logout-button');

    function updateSidebar() {
        $('.role-based').each(function() {
            const allowedRoles = $(this).data('role') ? $(this).data('role').split(',') : [];
            $(this).toggle(allowedRoles.includes(currentUser.role));
        });
    }

    function loadSettings() {
        $('#theme').val(appSettings.theme);
        $('#language').val(appSettings.language);
        $('#timezone').val(appSettings.timezone);
        $('#toggle-theme').text(appSettings.theme === 'dark' ? 'Світла тема' : 'Темна тема');
    }

    saveSettingsButton.on('click', function() {
        appSettings.theme = $('#theme').val();
        appSettings.language = $('#language').val();
        appSettings.timezone = $('#timezone').val();
        applyTheme(appSettings.theme);
        applyLanguage(appSettings.language);
        saveDataToLocalStorage();
        logAction('Оновлено налаштування', currentUser.username, { theme: appSettings.theme, language: appSettings.language, timezone: appSettings.timezone });
        toastr.success('Налаштування збережено!');
    });

    $('#toggle-theme').on('click', function() {
        appSettings.theme = appSettings.theme === 'dark' ? 'light' : 'dark';
        applyTheme(appSettings.theme);
        $(this).text(appSettings.theme === 'dark' ? 'Світла тема' : 'Темна тема');
        saveDataToLocalStorage();
        toastr.success('Тему змінено!');
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
    loadSettings();
    logAction('Відкрито сторінку налаштувань', currentUser.username);
});
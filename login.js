$(document).ready(function() {
    localStorage.removeItem(LS_CURRENT_USER_KEY);
    currentUser = null;
    saveDataToLocalStorage();

    $('#login-form').on('submit', function(e) {
        e.preventDefault();
        const username = $('#username').val().trim();
        const accessCode = $('#access-code').val().trim();

        if (!username || !accessCode) {
            $('#error-message').text('Будь ласка, заповніть усі поля').show();
            return;
        }

        if (login(username, accessCode)) {
            toastr.success('Вхід виконано успішно!');
            setTimeout(() => location.href = 'index.html', 1000);
        } else {
            $('#error-message').text('Невірне ім’я користувача або код доступу').show();
        }
    });
});
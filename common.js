const LS_LIFTS_KEY = 'liftApp_allLifts';
const LS_USERS_KEY = 'liftApp_allUsers';
const LS_REQUESTS_KEY = 'liftApp_allServiceRequests';
const LS_LOGS_KEY = 'liftApp_allLogs';
const LS_QRCODES_KEY = 'liftApp_allQRCodes';
const LS_CURRENT_USER_KEY = 'liftApp_currentUser';
const LS_CHAT_MESSAGES_KEY = 'liftApp_chatMessages';
const LS_APP_SETTINGS_KEY = 'liftApp_appSettings';
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

const BREVO_API_KEY = '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';

let allLifts = [];
let allUsers = [
    { username: "admin", role: "admin", accessCode: "1234", email: "admin@liftapp.com", rating: 0 },
    { username: "tech1", role: "tech", accessCode: "5678", email: "tech@liftapp.com", rating: 0 },
    { username: "client1", role: "client", accessCode: "9012", email: "client@liftapp.com" }
];
let allServiceRequests = [];
let allLogs = [];
let allQRCodes = [];
let currentUser = null;
let chatMessages = [];
let appSettings = { theme: 'light', language: 'uk', timezone: 'UTC' };
let lastActivity = Date.now();

function initializeTestData() {
    const existingLifts = JSON.parse(localStorage.getItem(LS_LIFTS_KEY) || '[]');
    if (!existingLifts.length) {
        const testLifts = [
            { id: 1, address: "вул. Шевченка, 10", postalCode: "01001", serial: "SN123", brand: "Otis", capacity: 8, speed: 1.5, status: "active", client: "client1", clientEmail: "client@liftapp.com", tech: "", lat: 50.4501, lng: 30.5234, lastInspection: "2025-01-01", inspectionFrequency: 12, report: "", interventionHistory: [], photos: [] },
            { id: 2, address: "вул. Франка, 5", postalCode: "02002", serial: "SN456", brand: "", capacity: null, speed: null, status: "maintenance", client: "ОСББ Надія", clientEmail: "", tech: "", lat: 50.4511, lng: 30.5254, lastInspection: "2025-03-01", inspectionFrequency: 6, report: "", interventionHistory: [], photos: [] },
            { id: 3, address: "вул. Лесі Українки, 15", postalCode: "03003", serial: "SN789", brand: "Kone", capacity: 10, speed: 2.0, status: "out_of_service", client: "ТОВ Меркурий", clientEmail: "client2@example.com", tech: "", lat: 50.4521, lng: 30.5274, lastInspection: "", inspectionFrequency: 0, report: "", interventionHistory: [], photos: [] },
            { id: 4, address: "вул. Грушевського, 20", postalCode: "04004", serial: "SN012", brand: "", capacity: null, speed: null, status: "active", client: "client1", clientEmail: "", tech: "", lat: 50.4531, lng: 30.5294, lastInspection: "", inspectionFrequency: 0, report: "", interventionHistory: [], photos: [] }
        ];
        localStorage.setItem(LS_LIFTS_KEY, JSON.stringify(testLifts));
        allLifts = testLifts;
    }
}

function checkStorageAvailability(data) {
    const testKey = 'test_storage';
    try {
        localStorage.setItem(testKey, JSON.stringify(data));
        localStorage.removeItem(testKey);
        return true;
    } catch (e) {
        console.error('Storage unavailable:', e);
        toastr.error('Помилка: локальне сховище переповнене або недоступне.');
        return false;
    }
}

function loadDataFromLocalStorage() {
    try {
        const storedData = {
            lifts: localStorage.getItem(LS_LIFTS_KEY),
            users: localStorage.getItem(LS_USERS_KEY),
            requests: localStorage.getItem(LS_REQUESTS_KEY),
            logs: localStorage.getItem(LS_LOGS_KEY),
            qrcodes: localStorage.getItem(LS_QRCODES_KEY),
            user: localStorage.getItem(LS_CURRENT_USER_KEY),
            chat: localStorage.getItem(LS_CHAT_MESSAGES_KEY),
            settings: localStorage.getItem(LS_APP_SETTINGS_KEY)
        };

        allLifts = storedData.lifts ? JSON.parse(storedData.lifts) : [];
        allUsers = storedData.users ? JSON.parse(storedData.users) : [
            { username: "admin", role: "admin", accessCode: "1234", email: "admin@liftapp.com", rating: 0 },
            { username: "tech1", role: "tech", accessCode: "5678", email: "tech@liftapp.com", rating: 0 },
            { username: "client1", role: "client", accessCode: "9012", email: "client@liftapp.com" }
        ];
        allServiceRequests = storedData.requests ? JSON.parse(storedData.requests) : [];
        allLogs = storedData.logs ? JSON.parse(storedData.logs) : [];
        allQRCodes = storedData.qrcodes ? JSON.parse(storedData.qrcodes).filter(qr => qr.liftId && qr.qrCodeUrl) : [];
        currentUser = storedData.user ? JSON.parse(storedData.user) : null;
        chatMessages = storedData.chat ? JSON.parse(storedData.chat) : [];
        appSettings = storedData.settings ? JSON.parse(storedData.settings) : { theme: 'light', language: 'uk', timezone: 'UTC' };

        allLifts.forEach(lift => {
            if (!lift.interventionHistory) lift.interventionHistory = [];
            if (!lift.photos) lift.photos = [];
            if (!lift.status) lift.status = 'active';
            if (!lift.id) lift.id = allLifts.length ? Math.max(...allLifts.map(l => l.id)) + 1 : 1;
        });

        allUsers = allUsers.filter(u => u.username && u.accessCode && ['admin', 'tech', 'client'].includes(u.role) && u.email);
        if (currentUser && !allUsers.find(u => u.username === currentUser.username && u.accessCode === currentUser.accessCode && u.role === currentUser.role)) {
            console.warn('Invalid currentUser, logging out');
            toastr.warning('Невірний користувач, вихід із системи');
            localStorage.removeItem(LS_CURRENT_USER_KEY);
            currentUser = null;
            if (window.location.pathname !== '/login.html') {
                location.href = 'login.html';
            }
        }

        initializeTestData();
        console.log('Loaded data - Lifts count:', allLifts.length, 'Users:', allUsers.length, 'QRCodes count:', allQRCodes.length, 'CurrentUser:', currentUser);
        applyTheme(appSettings.theme);
        applyLanguage(appSettings.language);
    } catch (e) {
        console.error('Error loading from localStorage:', e);
        toastr.error('Помилка завантаження даних: ' + e.message);
        allLifts = [];
        allUsers = [
            { username: "admin", role: "admin", accessCode: "1234", email: "admin@liftapp.com", rating: 0 },
            { username: "tech1", role: "tech", accessCode: "5678", email: "tech@liftapp.com", rating: 0 },
            { username: "client1", role: "client", accessCode: "9012", email: "client@liftapp.com" }
        ];
        allServiceRequests = [];
        allLogs = [];
        allQRCodes = [];
        chatMessages = [];
        appSettings = { theme: 'light', language: 'uk', timezone: 'UTC' };
        saveDataToLocalStorage();
    }
}

function saveDataToLocalStorage() {
    try {
        const data = {
            lifts: allLifts,
            users: allUsers,
            requests: allServiceRequests,
            logs: allLogs,
            qrcodes: allQRCodes,
            user: currentUser,
            chat: chatMessages,
            settings: appSettings
        };
        if (!checkStorageAvailability(data)) {
            toastr.error('Помилка збереження: локальне сховище переповнене.');
            return false;
        }
        localStorage.setItem(LS_LIFTS_KEY, JSON.stringify(allLifts));
        localStorage.setItem(LS_USERS_KEY, JSON.stringify(allUsers));
        localStorage.setItem(LS_REQUESTS_KEY, JSON.stringify(allServiceRequests));
        localStorage.setItem(LS_LOGS_KEY, JSON.stringify(allLogs));
        localStorage.setItem(LS_QRCODES_KEY, JSON.stringify(allQRCodes));
        localStorage.setItem(LS_CURRENT_USER_KEY, JSON.stringify(currentUser));
        localStorage.setItem(LS_CHAT_MESSAGES_KEY, JSON.stringify(chatMessages));
        localStorage.setItem(LS_APP_SETTINGS_KEY, JSON.stringify(appSettings));
        console.log('Saved data - Lifts count:', allLifts.length, 'QRCodes count:', allQRCodes.length, 'CurrentUser:', currentUser);
        lastActivity = Date.now();
        return true;
    } catch (e) {
        console.error('Error saving to localStorage:', e);
        toastr.error('Помилка збереження даних: ' + e.message);
        return false;
    }
}

function checkAuth() {
    const isAuthenticated = !!currentUser && currentUser.username && currentUser.accessCode && ['admin', 'tech', 'client'].includes(currentUser.role);
    console.log('CheckAuth - IsAuthenticated:', isAuthenticated, 'CurrentUser:', currentUser);
    if (!isAuthenticated && window.location.pathname !== '/login.html') {
        toastr.warning('Потрібна авторизація');
        location.href = 'login.html';
        return false;
    }
    if (isAuthenticated && (Date.now() - lastActivity) > SESSION_TIMEOUT_MS) {
        console.log('Session timed out');
        toastr.warning('Сесія закінчилася, виконайте вхід знову');
        localStorage.removeItem(LS_CURRENT_USER_KEY);
        currentUser = null;
        saveDataToLocalStorage();
        location.href = 'login.html';
        return false;
    }
    lastActivity = Date.now();
    return isAuthenticated;
}

function checkRoleAccess(roles) {
    return currentUser && roles.split(',').includes(currentUser.role);
}

function login(username, accessCode) {
    const user = allUsers.find(u => u.username === username && u.accessCode === accessCode);
    if (user) {
        currentUser = user;
        currentUser.lastLogin = new Date().toISOString();
        lastActivity = Date.now();
        saveDataToLocalStorage();
        console.log('Login successful:', username);
        return true;
    } else {
        console.log('Login failed:', username);
        return false;
    }
}

function logAction(action, user, details = {}) {
    const logEntry = { 
        id: allLogs.length ? Math.max(...allLogs.map(log => log.id)) + 1 : 1, 
        action, 
        user: user || (currentUser ? currentUser.username : 'unknown'),
        timestamp: new Date().toISOString(),
        details 
    };
    allLogs.push(logEntry);
    saveDataToLocalStorage();
    console.log('Logged action:', logEntry);
}

function getUserLifts() {
    if (!currentUser) return [];
    if (currentUser.role === 'admin') {
        return allLifts;
    } else if (currentUser.role === 'tech') {
        return allLifts.filter(lift => lift.tech === currentUser.username);
    } else if (currentUser.role === 'client') {
        return allLifts.filter(lift => lift.client === currentUser.username);
    }
    return [];
}

function getStatusText(status) {
    const translations = {
        uk: {
            active: 'Активний',
            maintenance: 'На обслуговуванні',
            out_of_service: 'Не працює',
            pending: 'В очікуванні',
            in_progress: 'В процесі',
            completed: 'Завершено'
        },
        en: {
            active: 'Active',
            maintenance: 'Maintenance',
            out_of_service: 'Out of Service',
            pending: 'Pending',
            in_progress: 'In Progress',
            completed: 'Completed'
        }
    };
    return translations[appSettings.language || 'uk'][status] || status;
}

function generateAccessCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function applyTheme(theme) {
    try {
        if (theme === 'dark') {
            $('body').addClass('dark-mode');
        } else {
            $('body').removeClass('dark-mode');
        }
    } catch (e) {
        console.error('Error applying theme:', e);
        toastr.error('Помилка застосування теми: ' + e.message);
    }
}

function applyLanguage(language) {
    try {
        const translations = {
            uk: {
                'dashboard': 'Дашборд',
                'lifts': 'Ліфти',
                'users': 'Користувачі',
                'requests': 'Заявки',
                'logs': 'Журнал',
                'map': 'Карта',
                'qrcodes': 'QR-коди',
                'reports': 'Звіти',
                'address': 'Адреса',
                'actions': 'Дії',
                'active': 'Активні',
                'maintenance': 'На обслуговуванні',
                'out-of-service': 'Не працюють',
                'inspection-reminders': 'Нагадування про інспекції',
                'next-inspection': 'Наступна інспекція',
                'lift-stats': 'Статистика ліфтів'
            },
            en: {
                'dashboard': 'Dashboard',
                'lifts': 'Lifts',
                'users': 'Users',
                'requests': 'Requests',
                'logs': 'Logs',
                'map': 'Map',
                'qrcodes': 'QR Codes',
                'reports': 'Reports',
                'address': 'Address',
                'actions': 'Actions',
                'active': 'Active',
                'maintenance': 'Maintenance',
                'out-of-service': 'Out of Service',
                'inspection-reminders': 'Inspection Reminders',
                'next-inspection': 'Next Inspection',
                'lift-stats': 'Lift Statistics'
            }
        };

        const selectedTranslations = translations[language] || translations['uk'];
        $('.translate-dashboard').text(selectedTranslations['dashboard'] || 'Дашборд');
        $('.translate-lifts').text(selectedTranslations['lifts'] || 'Ліфти');
        $('.translate-users').text(selectedTranslations['users'] || 'Користувачі');
        $('.translate-requests').text(selectedTranslations['requests'] || 'Заявки');
        $('.translate-logs').text(selectedTranslations['logs'] || 'Журнал');
        $('.translate-map').text(selectedTranslations['map'] || 'Карта');
        $('.translate-qrcodes').text(selectedTranslations['qrcodes'] || 'QR-коди');
        $('.translate-reports').text(selectedTranslations['reports'] || 'Звіти');
        $('.translate-address').text(selectedTranslations['address'] || 'Адреса');
        $('.translate-actions').text(selectedTranslations['actions'] || 'Дії');
        $('.translate-lift-stats').text(selectedTranslations['lift-stats'] || 'Статистика ліфтів');
    } catch (e) {
        console.error('Error applying language:', e);
        toastr.error('Помилка застосування мови: ' + e.message);
    }
}
/* ===================================
   YAELLE PMU ART - Admin Dashboard
   =================================== */

document.addEventListener('DOMContentLoaded', () => {
    initLogin();
    initDashboard();
    initTabs();
    initAppointments();
    initCalendar();
    initClients();
    initSettings();
    initModals();
});

/* ===================================
   CONSTANTS
   =================================== */
const ADMIN_PASSWORD = 'yaelle2025';
const SESSION_KEY = 'yaelle_admin_session';

const { STORAGE_KEYS, SERVICES, getAppointments, getClients } = window.YaelleBooking || {};

/* ===================================
   STATE
   =================================== */
let currentFilter = 'all';
let currentView = 'list';
let currentMonth = new Date();
let selectedAppointment = null;

/* ===================================
   LOGIN
   =================================== */
function initLogin() {
    const loginForm = document.getElementById('loginForm');
    const loginScreen = document.getElementById('loginScreen');
    const dashboard = document.getElementById('dashboard');
    const logoutBtn = document.getElementById('logoutBtn');

    // Check existing session
    if (sessionStorage.getItem(SESSION_KEY)) {
        loginScreen.classList.add('hidden');
        dashboard.classList.add('active');
        loadDashboardData();
    }

    // Login form submit
    loginForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        const password = document.getElementById('password').value;
        const errorEl = document.getElementById('loginError');

        if (password === ADMIN_PASSWORD) {
            sessionStorage.setItem(SESSION_KEY, 'true');
            loginScreen.classList.add('hidden');
            dashboard.classList.add('active');
            loadDashboardData();
        } else {
            errorEl.textContent = 'Invalid password. Please try again.';
            document.getElementById('password').value = '';
        }
    });

    // Logout
    logoutBtn?.addEventListener('click', () => {
        sessionStorage.removeItem(SESSION_KEY);
        location.reload();
    });
}

/* ===================================
   DASHBOARD
   =================================== */
function initDashboard() {
    // Set current date
    const dateEl = document.getElementById('currentDate');
    if (dateEl) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateEl.textContent = new Date().toLocaleDateString('en-US', options);
    }

    // Mobile menu toggle
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.querySelector('.sidebar');

    mobileMenuBtn?.addEventListener('click', () => {
        sidebar.classList.toggle('active');
        toggleOverlay(true);
    });

    // Close sidebar on overlay click
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('sidebar-overlay')) {
            sidebar.classList.remove('active');
            toggleOverlay(false);
        }
    });
}

function toggleOverlay(show) {
    let overlay = document.querySelector('.sidebar-overlay');

    if (show && !overlay) {
        overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay active';
        document.body.appendChild(overlay);
    } else if (!show && overlay) {
        overlay.remove();
    } else if (overlay) {
        overlay.classList.toggle('active', show);
    }
}

function loadDashboardData() {
    updateStats();
    renderAppointments();
    renderClients();
    renderSettings();
}

/* ===================================
   TABS
   =================================== */
function initTabs() {
    const navItems = document.querySelectorAll('.nav-item[data-tab]');
    const tabs = document.querySelectorAll('.tab-content');
    const pageTitle = document.getElementById('pageTitle');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const tabId = item.dataset.tab;

            // Update active nav
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');

            // Update active tab
            tabs.forEach(t => t.classList.remove('active'));
            document.getElementById(`${tabId}Tab`)?.classList.add('active');

            // Update title
            if (pageTitle) {
                pageTitle.textContent = item.textContent.trim();
            }

            // Close mobile menu
            document.querySelector('.sidebar')?.classList.remove('active');
            toggleOverlay(false);
        });
    });
}

/* ===================================
   APPOINTMENTS
   =================================== */
function initAppointments() {
    // Filter buttons
    const filterBtns = document.querySelectorAll('.filters-bar .filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.status;
            renderAppointments();
        });
    });

    // View toggle
    const viewBtns = document.querySelectorAll('.view-btn');
    viewBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            viewBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentView = btn.dataset.view;

            document.getElementById('appointmentsList').classList.toggle('hidden', currentView !== 'list');
            document.getElementById('calendarView').classList.toggle('hidden', currentView !== 'calendar');

            if (currentView === 'calendar') {
                renderCalendar();
            }
        });
    });
}

function updateStats() {
    const appointments = getAppointments?.() || [];

    const pending = appointments.filter(a => a.status === 'pending').length;
    const confirmed = appointments.filter(a => a.status === 'confirmed').length;
    const completed = appointments.filter(a => a.status === 'completed').length;

    document.getElementById('statPending').textContent = pending;
    document.getElementById('statConfirmed').textContent = confirmed;
    document.getElementById('statCompleted').textContent = completed;
    document.getElementById('statTotal').textContent = appointments.length;
}

function renderAppointments() {
    const listEl = document.getElementById('appointmentsList');
    const emptyEl = document.getElementById('emptyState');

    if (!listEl) return;

    let appointments = getAppointments?.() || [];

    // Filter
    if (currentFilter !== 'all') {
        appointments = appointments.filter(a => a.status === currentFilter);
    }

    // Sort by date (newest first)
    appointments.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (appointments.length === 0) {
        listEl.innerHTML = '';
        emptyEl?.classList.remove('hidden');
        return;
    }

    emptyEl?.classList.add('hidden');

    listEl.innerHTML = appointments.map(apt => {
        const date = new Date(apt.date);
        const day = date.getDate();
        const month = date.toLocaleDateString('en-US', { month: 'short' });
        const service = SERVICES?.[apt.service]?.name || apt.service;

        return `
            <div class="appointment-card" data-id="${apt.id}">
                <div class="appointment-date">
                    <span class="appointment-day">${day}</span>
                    <span class="appointment-month">${month}</span>
                </div>
                <div class="appointment-info">
                    <h4>${apt.firstName} ${apt.lastName}</h4>
                    <div class="appointment-meta">
                        <span>${service}</span>
                        <span>${formatTime(apt.time)}</span>
                    </div>
                </div>
                <span class="appointment-status status-${apt.status}">${apt.status}</span>
                <div class="appointment-actions">
                    <button class="action-btn" onclick="event.stopPropagation(); viewAppointment('${apt.id}')" title="View Details">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="3"/>
                            <path d="M2 12s4-8 10-8 10 8 10 8-4 8-10 8-10-8-10-8z"/>
                        </svg>
                    </button>
                    <button class="action-btn delete" onclick="event.stopPropagation(); deleteAppointment('${apt.id}')" title="Delete">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    // Click to view details
    listEl.querySelectorAll('.appointment-card').forEach(card => {
        card.addEventListener('click', () => {
            viewAppointment(card.dataset.id);
        });
    });
}

function viewAppointment(id) {
    const appointments = getAppointments?.() || [];
    const apt = appointments.find(a => a.id === id);

    if (!apt) return;

    selectedAppointment = apt;
    const detailEl = document.getElementById('appointmentDetail');
    const service = SERVICES?.[apt.service] || { name: apt.service, price: 0 };

    detailEl.innerHTML = `
        <div class="detail-header">
            <div>
                <h2>${apt.firstName} ${apt.lastName}</h2>
                <span class="appointment-status status-${apt.status}">${apt.status}</span>
            </div>
        </div>
        <div class="detail-grid">
            <div class="detail-item">
                <label>Service</label>
                <span>${service.name}</span>
            </div>
            <div class="detail-item">
                <label>Price</label>
                <span>${service.price > 0 ? '€' + service.price : 'Free'}</span>
            </div>
            <div class="detail-item">
                <label>Date</label>
                <span>${formatDate(apt.date)}</span>
            </div>
            <div class="detail-item">
                <label>Time</label>
                <span>${formatTime(apt.time)}</span>
            </div>
            <div class="detail-item">
                <label>Email</label>
                <span>${apt.email}</span>
            </div>
            <div class="detail-item">
                <label>Phone</label>
                <span>${apt.phone}</span>
            </div>
        </div>
        ${apt.notes ? `
            <div class="detail-notes">
                <label>Notes</label>
                <p>${apt.notes}</p>
            </div>
        ` : ''}
        <div class="detail-actions">
            ${apt.status === 'pending' ? `
                <button class="btn btn-primary" onclick="updateStatus('${apt.id}', 'confirmed')">Confirm</button>
            ` : ''}
            ${apt.status === 'confirmed' ? `
                <button class="btn btn-primary" onclick="updateStatus('${apt.id}', 'completed')">Mark Complete</button>
            ` : ''}
            ${apt.status !== 'cancelled' && apt.status !== 'completed' ? `
                <button class="btn btn-secondary" onclick="updateStatus('${apt.id}', 'cancelled')">Cancel</button>
            ` : ''}
            <button class="btn btn-secondary" onclick="closeAppointmentModal()">Close</button>
        </div>
    `;

    document.getElementById('appointmentModal').classList.add('active');
}

function updateStatus(id, status) {
    const appointments = getAppointments?.() || [];
    const index = appointments.findIndex(a => a.id === id);

    if (index >= 0) {
        appointments[index].status = status;
        localStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(appointments));
        updateStats();
        renderAppointments();
        closeAppointmentModal();
    }
}

function deleteAppointment(id) {
    showConfirmDialog(
        'Delete Appointment',
        'Are you sure you want to delete this appointment? This action cannot be undone.',
        () => {
            let appointments = getAppointments?.() || [];
            appointments = appointments.filter(a => a.id !== id);
            localStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(appointments));
            updateStats();
            renderAppointments();
        }
    );
}

function closeAppointmentModal() {
    document.getElementById('appointmentModal').classList.remove('active');
    selectedAppointment = null;
}

// Make functions globally available
window.viewAppointment = viewAppointment;
window.updateStatus = updateStatus;
window.deleteAppointment = deleteAppointment;
window.closeAppointmentModal = closeAppointmentModal;

/* ===================================
   CALENDAR
   =================================== */
function initCalendar() {
    document.getElementById('prevMonth')?.addEventListener('click', () => {
        currentMonth.setMonth(currentMonth.getMonth() - 1);
        renderCalendar();
    });

    document.getElementById('nextMonth')?.addEventListener('click', () => {
        currentMonth.setMonth(currentMonth.getMonth() + 1);
        renderCalendar();
    });
}

function renderCalendar() {
    const grid = document.getElementById('calendarGrid');
    const title = document.getElementById('calendarTitle');

    if (!grid || !title) return;

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    title.textContent = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay();
    const totalDays = lastDay.getDate();

    const appointments = getAppointments?.() || [];
    const appointmentDates = new Set(appointments.map(a => a.date));

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let html = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        .map(d => `<div class="calendar-day-header">${d}</div>`)
        .join('');

    // Previous month days
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = startDay - 1; i >= 0; i--) {
        html += `<div class="calendar-day other-month">${prevMonthDays - i}</div>`;
    }

    // Current month days
    for (let day = 1; day <= totalDays; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isToday = new Date(dateStr).getTime() === today.getTime();
        const hasAppointments = appointmentDates.has(dateStr);

        const classes = ['calendar-day'];
        if (isToday) classes.push('today');
        if (hasAppointments) classes.push('has-appointments');

        html += `<div class="${classes.join(' ')}" data-date="${dateStr}">${day}</div>`;
    }

    // Next month days
    const remainingCells = 42 - (startDay + totalDays);
    for (let i = 1; i <= remainingCells; i++) {
        html += `<div class="calendar-day other-month">${i}</div>`;
    }

    grid.innerHTML = html;

    // Click handlers
    grid.querySelectorAll('.calendar-day:not(.other-month)').forEach(day => {
        day.addEventListener('click', () => {
            const date = day.dataset.date;
            // Filter by date
            currentFilter = 'all';
            document.querySelectorAll('.filters-bar .filter-btn').forEach(b => {
                b.classList.toggle('active', b.dataset.status === 'all');
            });
            // Switch to list view
            document.querySelectorAll('.view-btn').forEach(b => {
                b.classList.toggle('active', b.dataset.view === 'list');
            });
            currentView = 'list';
            document.getElementById('appointmentsList').classList.remove('hidden');
            document.getElementById('calendarView').classList.add('hidden');
            // Show appointments for this date
            showDateAppointments(date);
        });
    });
}

function showDateAppointments(date) {
    const listEl = document.getElementById('appointmentsList');
    const emptyEl = document.getElementById('emptyState');
    let appointments = getAppointments?.() || [];

    appointments = appointments.filter(a => a.date === date);

    if (appointments.length === 0) {
        listEl.innerHTML = '';
        emptyEl?.classList.remove('hidden');
        return;
    }

    emptyEl?.classList.add('hidden');
    renderAppointments();
}

/* ===================================
   CLIENTS
   =================================== */
function initClients() {
    const searchInput = document.getElementById('clientSearch');

    searchInput?.addEventListener('input', (e) => {
        renderClients(e.target.value);
    });
}

function renderClients(searchTerm = '') {
    const listEl = document.getElementById('clientsList');
    const emptyEl = document.getElementById('emptyClients');

    if (!listEl) return;

    let clients = getClients?.() || [];

    // Search filter
    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        clients = clients.filter(c =>
            c.firstName.toLowerCase().includes(term) ||
            c.lastName.toLowerCase().includes(term) ||
            c.email.toLowerCase().includes(term) ||
            c.phone.includes(term)
        );
    }

    if (clients.length === 0) {
        listEl.innerHTML = '';
        emptyEl?.classList.remove('hidden');
        return;
    }

    emptyEl?.classList.add('hidden');

    listEl.innerHTML = clients.map(client => {
        const initials = (client.firstName[0] + client.lastName[0]).toUpperCase();
        const appointmentCount = client.appointments?.length || 0;

        return `
            <div class="client-card">
                <div class="client-avatar">${initials}</div>
                <div class="client-info">
                    <h4>${client.firstName} ${client.lastName}</h4>
                    <div class="client-contact">
                        ${client.email} | ${client.phone}
                    </div>
                </div>
                <div class="client-stats">
                    <span class="stat-number">${appointmentCount}</span>
                    <span class="stat-label">Appointments</span>
                </div>
            </div>
        `;
    }).join('');
}

/* ===================================
   SETTINGS
   =================================== */
function initSettings() {
    // Export button
    document.getElementById('exportBtn')?.addEventListener('click', exportToCSV);

    // Clear data button
    document.getElementById('clearDataBtn')?.addEventListener('click', () => {
        showConfirmDialog(
            'Clear All Data',
            'Are you sure you want to delete all appointments and clients? This action cannot be undone.',
            () => {
                localStorage.removeItem(STORAGE_KEYS.APPOINTMENTS);
                localStorage.removeItem(STORAGE_KEYS.CLIENTS);
                loadDashboardData();
            }
        );
    });
}

function renderSettings() {
    // Render business hours
    const hoursGrid = document.getElementById('hoursGrid');
    if (hoursGrid) {
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        hoursGrid.innerHTML = days.map(day => `
            <div class="hours-row">
                <label>${day}</label>
                <select>
                    <option value="09:00">09:00 AM</option>
                    <option value="10:00">10:00 AM</option>
                </select>
                <select>
                    <option value="17:00">05:00 PM</option>
                    <option value="18:00">06:00 PM</option>
                </select>
                <div class="toggle ${day !== 'Sunday' ? 'active' : ''}" onclick="this.classList.toggle('active')"></div>
            </div>
        `).join('');
    }

    // Render services
    const servicesList = document.getElementById('servicesList');
    if (servicesList && SERVICES) {
        servicesList.innerHTML = Object.entries(SERVICES).map(([key, service]) => `
            <div class="service-row">
                <span class="service-name">${service.name}</span>
                <span class="service-duration">${service.duration}</span>
                <span class="service-price">${service.price > 0 ? '€' + service.price : 'Free'}</span>
            </div>
        `).join('');
    }
}

function exportToCSV() {
    const appointments = getAppointments?.() || [];

    if (appointments.length === 0) {
        alert('No appointments to export.');
        return;
    }

    const headers = ['ID', 'Service', 'First Name', 'Last Name', 'Email', 'Phone', 'Date', 'Time', 'Status', 'Notes', 'Created At'];
    const rows = appointments.map(a => [
        a.id,
        SERVICES?.[a.service]?.name || a.service,
        a.firstName,
        a.lastName,
        a.email,
        a.phone,
        a.date,
        a.time,
        a.status,
        a.notes || '',
        a.createdAt
    ]);

    const csv = [headers, ...rows]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `yaelle-appointments-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

/* ===================================
   MODALS
   =================================== */
function initModals() {
    // Appointment modal close
    document.getElementById('appointmentModalClose')?.addEventListener('click', closeAppointmentModal);

    // Close on background click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });

    // Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active'));
        }
    });
}

let confirmCallback = null;

function showConfirmDialog(title, message, callback) {
    const dialog = document.getElementById('confirmDialog');
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    confirmCallback = callback;
    dialog.classList.add('active');

    document.getElementById('confirmCancel').onclick = () => {
        dialog.classList.remove('active');
        confirmCallback = null;
    };

    document.getElementById('confirmOk').onclick = () => {
        dialog.classList.remove('active');
        if (confirmCallback) confirmCallback();
        confirmCallback = null;
    };
}

/* ===================================
   UTILITIES
   =================================== */
function formatDate(dateString) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

function formatTime(timeString) {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
}

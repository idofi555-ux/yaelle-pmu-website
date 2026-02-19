/* ===================================
   YAELLE PMU ART - Admin Dashboard
   =================================== */

/**
 * Safely set innerHTML using DOMPurify sanitization.
 */
function safeSetHTML(el, html) {
  if (typeof el === 'string') el = document.getElementById(el);
  if (!el) return;
  el.innerHTML = DOMPurify.sanitize(html, { ADD_ATTR: ['onclick', 'onchange'], ADD_TAGS: ['option'] }); // nosemgrep: insecure-document-method
}

console.log('Admin.js loaded');

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM ready, initializing...');
    initLogin();
    initDashboard();
    initTabs();
    initAppointments();
    initCalendar();
    initClients();
    initSettings();
    initModals();
    initMarketing();
    initTreatments();
    console.log('All init functions called');
});

/* ===================================
   CONSTANTS
   =================================== */
const ADMIN_PASSWORD = 'yaelle2025';
const SESSION_KEY = 'yaelle_admin_session';
const TREATMENTS_KEY = 'yaelle_treatments';
const POSTS_KEY = 'yaelle_posts';

// Get booking utilities from main booking module
const BookingUtils = window.YaelleBooking || {};
const { getAppointments, getClients } = BookingUtils;

/* ===================================
   STATE
   =================================== */
let currentFilter = 'all';
let currentView = 'list';
let currentMonth = new Date();
let selectedAppointment = null;
let selectedClient = null;
let currentPostImage = null;
let currentBeforePhoto = null;
let currentAfterPhoto = null;

/* ===================================
   LOGIN
   =================================== */
function initLogin() {
    console.log('initLogin called');
    const loginForm = document.getElementById('loginForm');
    const loginScreen = document.getElementById('loginScreen');
    const dashboard = document.getElementById('dashboard');
    const logoutBtn = document.getElementById('logoutBtn');

    console.log('Elements found:', { loginForm: !!loginForm, loginScreen: !!loginScreen, dashboard: !!dashboard });

    // Check existing session
    if (sessionStorage.getItem(SESSION_KEY)) {
        console.log('Existing session found');
        loginScreen.classList.add('hidden');
        dashboard.classList.add('active');
        loadDashboardData();
    }

    // Login form submit
    if (loginForm) {
        console.log('Adding submit listener to form');
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            console.log('Form submitted!');
            const password = document.getElementById('password').value;
            const errorEl = document.getElementById('loginError');

            console.log('Password entered:', password, 'Expected:', ADMIN_PASSWORD);

            if (password === ADMIN_PASSWORD) {
                console.log('Password correct! Logging in...');
                sessionStorage.setItem(SESSION_KEY, 'true');
                loginScreen.classList.add('hidden');
                dashboard.classList.add('active');
                loadDashboardData();
            } else {
                console.log('Password incorrect');
                errorEl.textContent = 'Invalid password. Please try again.';
                document.getElementById('password').value = '';
            }
        });
    } else {
        console.error('Login form not found!');
    }

    // Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            sessionStorage.removeItem(SESSION_KEY);
            location.reload();
        });
    }
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
    renderPosts();
    updateEmailRecipientCount();
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
        safeSetHTML(listEl, '');
        emptyEl?.classList.remove('hidden');
        return;
    }

    emptyEl?.classList.add('hidden');

    safeSetHTML(listEl, appointments.map(apt => {
        const date = new Date(apt.date));
        const day = date.getDate();
        const month = date.toLocaleDateString('en-US', { month: 'short' });
        const service = BookingUtils.SERVICES?.[apt.service]?.name || apt.service;

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
    const service = BookingUtils.SERVICES?.[apt.service] || { name: apt.service, price: 0 };

    safeSetHTML(detailEl, `
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
    `);

    document.getElementById('appointmentModal').classList.add('active');
}

function updateStatus(id, status) {
    const appointments = getAppointments?.() || [];
    const index = appointments.findIndex(a => a.id === id);

    if (index >= 0) {
        appointments[index].status = status;
        localStorage.setItem(BookingUtils.STORAGE_KEYS.APPOINTMENTS, JSON.stringify(appointments));
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
            localStorage.setItem(BookingUtils.STORAGE_KEYS.APPOINTMENTS, JSON.stringify(appointments));
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

    safeSetHTML(grid, html);

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
        safeSetHTML(listEl, '');
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

    // Add client button
    document.getElementById('addClientBtn')?.addEventListener('click', () => openAddClientModal());

    // Client form
    const clientForm = document.getElementById('clientForm');
    clientForm?.addEventListener('submit', saveClient);

    // Modal close handlers
    document.getElementById('addClientModalClose')?.addEventListener('click', closeAddClientModal);
    document.getElementById('cancelClientForm')?.addEventListener('click', closeAddClientModal);
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
        safeSetHTML(listEl, '');
        emptyEl?.classList.remove('hidden');
        return;
    }

    emptyEl?.classList.add('hidden');

    // Get treatments for each client
    const treatments = getTreatments();

    safeSetHTML(listEl, clients.map(client => {
        const initials = (client.firstName[0] + client.lastName[0]).toUpperCase());
        const clientTreatments = treatments.filter(t => t.clientId === client.id);
        const treatmentCount = clientTreatments.length;

        return `
            <div class="client-card" data-client-id="${client.id}">
                <div class="client-avatar">${initials}</div>
                <div class="client-info">
                    <h4>${client.firstName} ${client.lastName}</h4>
                    <div class="client-contact">
                        ${client.email} | ${client.phone}
                    </div>
                    ${client.notes ? `<div class="client-notes-badge">${client.notes.substring(0, 50)}${client.notes.length > 50 ? '...' : ''}</div>` : ''}
                </div>
                <div class="client-stats">
                    <span class="stat-number">${treatmentCount}</span>
                    <span class="stat-label">Treatments</span>
                </div>
                <div class="client-card-actions">
                    <button class="action-btn" onclick="editClient('${client.id}', event)" title="Edit">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
                        </svg>
                    </button>
                    <button class="action-btn delete" onclick="deleteClient('${client.id}', event)" title="Delete">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                            <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    // Add click handlers to client cards
    listEl.querySelectorAll('.client-card').forEach(card => {
        card.addEventListener('click', (e) => {
            // Don't trigger if clicking on action buttons
            if (!e.target.closest('.client-card-actions')) {
                viewClient(card.dataset.clientId);
            }
        });
    });
}

/* ===================================
   CLIENT MANAGEMENT
   =================================== */
function openAddClientModal(clientId = null) {
    const modal = document.getElementById('addClientModal');
    const title = document.getElementById('clientFormTitle');
    const form = document.getElementById('clientForm');

    form.reset();
    document.getElementById('clientFormId').value = '';

    if (clientId) {
        // Edit mode
        const clients = getClients?.() || [];
        const client = clients.find(c => c.id === clientId);
        if (client) {
            title.textContent = 'Edit Client';
            document.getElementById('clientFormId').value = client.id;
            document.getElementById('clientFirstName').value = client.firstName;
            document.getElementById('clientLastName').value = client.lastName;
            document.getElementById('clientEmail').value = client.email;
            document.getElementById('clientPhone').value = client.phone;
            document.getElementById('clientNotes').value = client.notes || '';
        }
    } else {
        title.textContent = 'Add New Client';
    }

    modal.classList.add('active');
}

function closeAddClientModal() {
    document.getElementById('addClientModal').classList.remove('active');
}

function saveClient(e) {
    e.preventDefault();

    const clientId = document.getElementById('clientFormId').value;
    const firstName = document.getElementById('clientFirstName').value.trim();
    const lastName = document.getElementById('clientLastName').value.trim();
    const email = document.getElementById('clientEmail').value.trim();
    const phone = document.getElementById('clientPhone').value.trim();
    const notes = document.getElementById('clientNotes').value.trim();

    if (!firstName || !lastName || !email || !phone) {
        alert('Please fill in all required fields.');
        return;
    }

    // Get existing clients
    const CLIENTS_KEY = 'yaelle_clients';
    let clients = JSON.parse(localStorage.getItem(CLIENTS_KEY) || '[]');

    if (clientId) {
        // Update existing client
        const index = clients.findIndex(c => c.id === clientId);
        if (index !== -1) {
            clients[index] = {
                ...clients[index],
                firstName,
                lastName,
                email,
                phone,
                notes,
                updatedAt: new Date().toISOString()
            };
        }
    } else {
        // Check for duplicate email
        if (clients.some(c => c.email.toLowerCase() === email.toLowerCase())) {
            alert('A client with this email already exists.');
            return;
        }

        // Add new client
        const newClient = {
            id: 'client_' + Date.now(),
            firstName,
            lastName,
            email,
            phone,
            notes,
            appointments: [],
            createdAt: new Date().toISOString()
        };
        clients.push(newClient);
    }

    localStorage.setItem(CLIENTS_KEY, JSON.stringify(clients));
    closeAddClientModal();
    renderClients();
    updateStats();
}

function editClient(clientId, e) {
    e.stopPropagation();
    openAddClientModal(clientId);
}

function deleteClient(clientId, e) {
    e.stopPropagation();

    const clients = getClients?.() || [];
    const client = clients.find(c => c.id === clientId);

    showConfirmDialog(
        'Delete Client',
        `Are you sure you want to delete ${client?.firstName} ${client?.lastName}? This will also delete all their treatment records.`,
        () => {
            const CLIENTS_KEY = 'yaelle_clients';
            let updatedClients = clients.filter(c => c.id !== clientId);
            localStorage.setItem(CLIENTS_KEY, JSON.stringify(updatedClients));

            // Also delete treatments for this client
            let treatments = getTreatments();
            treatments = treatments.filter(t => t.clientId !== clientId);
            saveTreatments(treatments);

            renderClients();
            updateStats();
        }
    );
}

// Make client management functions globally available
window.openAddClientModal = openAddClientModal;
window.editClient = editClient;
window.deleteClient = deleteClient;

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
                localStorage.removeItem(BookingUtils.STORAGE_KEYS.APPOINTMENTS);
                localStorage.removeItem(BookingUtils.STORAGE_KEYS.CLIENTS);
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
        safeSetHTML(hoursGrid, days.map(day => `
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
        `).join(''));
    }

    // Render services
    const servicesList = document.getElementById('servicesList');
    if (servicesList && BookingUtils.SERVICES) {
        safeSetHTML(servicesList, Object.entries(BookingUtils.SERVICES).map(([key, service]) => `
            <div class="service-row">
                <span class="service-name">${service.name}</span>
                <span class="service-duration">${service.duration}</span>
                <span class="service-price">${service.price > 0 ? '€' + service.price : 'Free'}</span>
            </div>
        `).join(''));
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
        BookingUtils.SERVICES?.[a.service]?.name || a.service,
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

/* ===================================
   TREATMENTS
   =================================== */
function getTreatments() {
    return JSON.parse(localStorage.getItem(TREATMENTS_KEY) || '[]');
}

function saveTreatments(treatments) {
    localStorage.setItem(TREATMENTS_KEY, JSON.stringify(treatments));
}

function initTreatments() {
    const treatmentForm = document.getElementById('treatmentForm');
    const treatmentModalClose = document.getElementById('treatmentModalClose');
    const cancelTreatment = document.getElementById('cancelTreatment');

    // Photo upload handlers
    document.querySelectorAll('.photo-placeholder').forEach(placeholder => {
        placeholder.addEventListener('click', () => {
            const targetId = placeholder.dataset.target;
            document.getElementById(targetId)?.click();
        });
    });

    document.getElementById('beforePhoto')?.addEventListener('change', (e) => {
        handlePhotoUpload(e, 'beforePreview', 'before');
    });

    document.getElementById('afterPhoto')?.addEventListener('change', (e) => {
        handlePhotoUpload(e, 'afterPreview', 'after');
    });

    // Form submission
    treatmentForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        saveTreatment();
    });

    // Close modal handlers
    treatmentModalClose?.addEventListener('click', closeTreatmentModal);
    cancelTreatment?.addEventListener('click', closeTreatmentModal);
}

function handlePhotoUpload(e, previewId, type) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const dataUrl = event.target.result;
        const preview = document.getElementById(previewId);
        const placeholder = preview.previousElementSibling;

        preview.src = dataUrl;
        preview.classList.remove('hidden');
        placeholder.classList.add('hidden');

        if (type === 'before') {
            currentBeforePhoto = dataUrl;
        } else {
            currentAfterPhoto = dataUrl;
        }
    };
    reader.readAsDataURL(file);
}

function openTreatmentModal(clientId) {
    selectedClient = clientId;
    document.getElementById('treatmentClientId').value = clientId;
    document.getElementById('treatmentDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('treatmentModal').classList.add('active');
}

function closeTreatmentModal() {
    document.getElementById('treatmentModal').classList.remove('active');
    document.getElementById('treatmentForm').reset();

    // Reset photo previews
    ['beforePreview', 'afterPreview'].forEach(id => {
        const preview = document.getElementById(id);
        preview.classList.add('hidden');
        preview.src = '';
        preview.previousElementSibling.classList.remove('hidden');
    });

    currentBeforePhoto = null;
    currentAfterPhoto = null;
    selectedClient = null;
}

function saveTreatment() {
    const clientId = document.getElementById('treatmentClientId').value;
    const service = document.getElementById('treatmentService').value;
    const date = document.getElementById('treatmentDate').value;
    const price = document.getElementById('treatmentPrice').value;
    const notes = document.getElementById('treatmentNotes').value;
    const nextAppointment = document.getElementById('nextAppointment').value;

    if (!clientId || !service || !date) {
        alert('Please fill in all required fields.');
        return;
    }

    const treatment = {
        id: 'treatment_' + Date.now(),
        clientId,
        service,
        date,
        price: price ? parseFloat(price) : 0,
        notes,
        beforePhoto: currentBeforePhoto,
        afterPhoto: currentAfterPhoto,
        nextAppointment,
        createdAt: new Date().toISOString()
    };

    const treatments = getTreatments();
    treatments.push(treatment);
    saveTreatments(treatments);

    closeTreatmentModal();
    viewClient(clientId); // Refresh client detail
    renderClients(); // Update treatment count
}

function viewClient(clientId) {
    const clients = getClients?.() || [];
    const client = clients.find(c => c.id === clientId);

    if (!client) return;

    selectedClient = client;
    const treatments = getTreatments().filter(t => t.clientId === clientId);
    const detailEl = document.getElementById('clientDetail');

    const initials = (client.firstName[0] + client.lastName[0]).toUpperCase();
    const serviceName = (service) => {
        const serviceMap = {
            'microblading': 'Microblading',
            'nanoblading': 'Nanoblading',
            'lip-blushing': 'Lip Blushing',
            'lash-liner': 'Lash Liner',
            'brow-lamination': 'Brow Lamination',
            'touch-up': 'Touch Up',
            'consultation': 'Consultation'
        };
        return serviceMap[service] || service;
    };

    safeSetHTML(detailEl, `
        <div class="client-header">
            <div class="client-avatar large">${initials}</div>
            <div class="client-header-info">
                <h2>${client.firstName} ${client.lastName}</h2>
                <p>${client.email}</p>
                <p>${client.phone}</p>
            </div>
            <button class="btn btn-primary" onclick="openTreatmentModal('${clientId}')">
                + Add Treatment
            </button>
        </div>

        <div class="treatment-history">
            <h3>Treatment History</h3>
            ${treatments.length === 0 ? `
                <div class="empty-treatments">
                    <p>No treatments recorded yet.</p>
                </div>
            ` : `
                <div class="treatments-list">
                    ${treatments.sort((a, b) => new Date(b.date) - new Date(a.date)).map(t => `
                        <div class="treatment-card">
                            <div class="treatment-header">
                                <h4>${serviceName(t.service)}</h4>
                                <span class="treatment-date">${formatDate(t.date)}</span>
                            </div>
                            ${t.price ? `<p class="treatment-price">€${t.price}</p>` : ''}
                            ${t.notes ? `<p class="treatment-notes">${t.notes}</p>` : ''}
                            ${(t.beforePhoto || t.afterPhoto) ? `
                                <div class="treatment-photos">
                                    ${t.beforePhoto ? `
                                        <div class="treatment-photo">
                                            <span>Before</span>
                                            <img src="${t.beforePhoto}" alt="Before">
                                        </div>
                                    ` : ''}
                                    ${t.afterPhoto ? `
                                        <div class="treatment-photo">
                                            <span>After</span>
                                            <img src="${t.afterPhoto}" alt="After">
                                        </div>
                                    ` : ''}
                                </div>
                            ` : ''}
                            ${t.nextAppointment ? `
                                <p class="next-appointment">Next appointment: ${formatDate(t.nextAppointment)}</p>
                            ` : ''}
                            <button class="btn-delete-treatment" onclick="deleteTreatment('${t.id}', '${clientId}')">Delete</button>
                        </div>
                    `).join('')}
                </div>
            `}
        </div>
    `);

    document.getElementById('clientModal').classList.add('active');
    document.getElementById('clientModalClose')?.addEventListener('click', closeClientModal);
}

function closeClientModal() {
    document.getElementById('clientModal').classList.remove('active');
    selectedClient = null;
}

function deleteTreatment(treatmentId, clientId) {
    showConfirmDialog(
        'Delete Treatment',
        'Are you sure you want to delete this treatment record?',
        () => {
            let treatments = getTreatments();
            treatments = treatments.filter(t => t.id !== treatmentId);
            saveTreatments(treatments);
            viewClient(clientId);
            renderClients();
        }
    );
}

// Make treatment functions globally available
window.openTreatmentModal = openTreatmentModal;
window.deleteTreatment = deleteTreatment;

/* ===================================
   MARKETING
   =================================== */
function getPosts() {
    return JSON.parse(localStorage.getItem(POSTS_KEY) || '[]');
}

function savePosts(posts) {
    localStorage.setItem(POSTS_KEY, JSON.stringify(posts));
}

function initMarketing() {
    const imageUploadArea = document.getElementById('imageUploadArea');
    const postImageInput = document.getElementById('postImage');
    const savePostBtn = document.getElementById('savePostBtn');
    const previewPostBtn = document.getElementById('previewPostBtn');
    const previewEmailBtn = document.getElementById('previewEmailBtn');
    const sendEmailBtn = document.getElementById('sendEmailBtn');
    const emailRecipients = document.getElementById('emailRecipients');
    const postPreviewClose = document.getElementById('postPreviewClose');

    // Image upload area click
    imageUploadArea?.addEventListener('click', () => {
        postImageInput?.click();
    });

    // Image file selection
    postImageInput?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            currentPostImage = event.target.result;
            const preview = document.getElementById('imagePreview');
            const placeholder = document.getElementById('uploadPlaceholder');

            preview.src = currentPostImage;
            preview.classList.remove('hidden');
            placeholder.classList.add('hidden');
        };
        reader.readAsDataURL(file);
    });

    // Save post
    savePostBtn?.addEventListener('click', savePost);

    // Preview post
    previewPostBtn?.addEventListener('click', previewPost);

    // Preview email
    previewEmailBtn?.addEventListener('click', previewEmail);

    // Send email
    sendEmailBtn?.addEventListener('click', sendEmailCampaign);

    // Update recipient count on change
    emailRecipients?.addEventListener('change', updateEmailRecipientCount);

    // Close preview modal
    postPreviewClose?.addEventListener('click', () => {
        document.getElementById('postPreviewModal').classList.remove('active');
    });
}

function savePost() {
    const title = document.getElementById('postTitle').value.trim();
    const content = document.getElementById('postContent').value.trim();

    if (!title || !content) {
        alert('Please enter a title and content for your post.');
        return;
    }

    const post = {
        id: 'post_' + Date.now(),
        title,
        content,
        image: currentPostImage,
        status: 'draft',
        createdAt: new Date().toISOString()
    };

    const posts = getPosts();
    posts.unshift(post);
    savePosts(posts);

    // Clear form
    document.getElementById('postTitle').value = '';
    document.getElementById('postContent').value = '';
    document.getElementById('imagePreview').classList.add('hidden');
    document.getElementById('imagePreview').src = '';
    document.getElementById('uploadPlaceholder').classList.remove('hidden');
    currentPostImage = null;

    renderPosts();
    updateAttachPostOptions();

    alert('Post saved successfully!');
}

function previewPost() {
    const title = document.getElementById('postTitle').value.trim();
    const content = document.getElementById('postContent').value.trim();

    if (!title && !content) {
        alert('Please enter some content to preview.');
        return;
    }

    const previewEl = document.getElementById('postPreview');
    safeSetHTML(previewEl, `
        <div class="post-preview-content">
            ${currentPostImage ? `<img src="${currentPostImage}" alt="Post image" class="preview-image">` : ''}
            <h2>${title || 'Untitled Post'}</h2>
            <p>${content.replace(/\n/g, '<br>') || 'No content'}</p>
            <div class="preview-footer">
                <span>Yaelle PMU Art</span>
                <span>${new Date().toLocaleDateString()}</span>
            </div>
        </div>
    `);

    document.getElementById('postPreviewModal').classList.add('active');
}

function renderPosts() {
    const postsListEl = document.getElementById('postsList');
    const emptyPostsEl = document.getElementById('emptyPosts');
    const posts = getPosts();

    if (!postsListEl) return;

    if (posts.length === 0) {
        safeSetHTML(postsListEl, '');
        emptyPostsEl?.classList.remove('hidden');
        return;
    }

    emptyPostsEl?.classList.add('hidden');

    safeSetHTML(postsListEl, posts.map(post => `
        <div class="post-card" data-post-id="${post.id}">
            ${post.image ? `<img src="${post.image}" alt="Post image" class="post-thumbnail">` : ''}
            <div class="post-card-content">
                <h4>${post.title}</h4>
                <p>${post.content.substring(0, 100)}${post.content.length > 100 ? '...' : ''}</p>
                <div class="post-meta">
                    <span class="post-status status-${post.status}">${post.status}</span>
                    <span class="post-date">${new Date(post.createdAt).toLocaleDateString()}</span>
                </div>
            </div>
            <div class="post-actions">
                <button class="action-btn" onclick="viewPost('${post.id}')" title="View">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                        <circle cx="12" cy="12" r="3"/>
                        <path d="M2 12s4-8 10-8 10 8 10 8-4 8-10 8-10-8-10-8z"/>
                    </svg>
                </button>
                <button class="action-btn delete" onclick="deletePost('${post.id}')" title="Delete">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                        <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z"/>
                    </svg>
                </button>
            </div>
        </div>
    `).join(''));

    updateAttachPostOptions();
}

function viewPost(postId) {
    const posts = getPosts();
    const post = posts.find(p => p.id === postId);

    if (!post) return;

    const previewEl = document.getElementById('postPreview');
    safeSetHTML(previewEl, `
        <div class="post-preview-content">
            ${post.image ? `<img src="${post.image}" alt="Post image" class="preview-image">` : ''}
            <h2>${post.title}</h2>
            <p>${post.content.replace(/\n/g, '<br>')}</p>
            <div class="preview-footer">
                <span>Yaelle PMU Art</span>
                <span>${new Date(post.createdAt).toLocaleDateString()}</span>
            </div>
        </div>
    `);

    document.getElementById('postPreviewModal').classList.add('active');
}

function deletePost(postId) {
    showConfirmDialog(
        'Delete Post',
        'Are you sure you want to delete this post?',
        () => {
            let posts = getPosts();
            posts = posts.filter(p => p.id !== postId);
            savePosts(posts);
            renderPosts();
        }
    );
}

function updateAttachPostOptions() {
    const attachSelect = document.getElementById('attachPost');
    if (!attachSelect) return;

    const posts = getPosts();
    safeSetHTML(attachSelect, '<option value="">No attachment</option>' +
        posts.map(post => `<option value="${post.id}">${post.title}</option>`).join(''));
}

function updateEmailRecipientCount() {
    const recipientType = document.getElementById('emailRecipients')?.value || 'all';
    const clients = getClients?.() || [];
    const countEl = document.getElementById('recipientCount');

    let count = 0;
    const now = new Date();
    const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

    switch (recipientType) {
        case 'all':
            count = clients.length;
            break;
        case 'recent':
            count = clients.filter(c => {
                const lastVisit = new Date(c.createdAt || 0);
                return lastVisit >= threeMonthsAgo;
            }).length;
            break;
        case 'inactive':
            count = clients.filter(c => {
                const lastVisit = new Date(c.createdAt || 0);
                return lastVisit < sixMonthsAgo;
            }).length;
            break;
    }

    if (countEl) {
        countEl.textContent = `${count} recipient${count !== 1 ? 's' : ''} selected`;
    }
}

function previewEmail() {
    const subject = document.getElementById('emailSubject').value.trim();
    const body = document.getElementById('emailBody').value.trim();
    const attachPostId = document.getElementById('attachPost').value;

    if (!subject || !body) {
        alert('Please enter a subject and body for your email.');
        return;
    }

    let attachedPost = null;
    if (attachPostId) {
        attachedPost = getPosts().find(p => p.id === attachPostId);
    }

    const previewEl = document.getElementById('postPreview');
    safeSetHTML(previewEl, `
        <div class="email-preview-content">
            <div class="email-header">
                <strong>Subject:</strong> ${subject}
            </div>
            <div class="email-body">
                <p>Dear Client,</p>
                <p>${body.replace(/\n/g, '<br>')}</p>
                ${attachedPost ? `
                    <div class="attached-post">
                        ${attachedPost.image ? `<img src="${attachedPost.image}" alt="Post image">` : ''}
                        <h4>${attachedPost.title}</h4>
                        <p>${attachedPost.content}</p>
                    </div>
                ` : ''}
                <p>Best regards,<br>Yaelle PMU Art</p>
            </div>
        </div>
    `);

    document.getElementById('postPreviewModal').classList.add('active');
}

function sendEmailCampaign() {
    const subject = document.getElementById('emailSubject').value.trim();
    const body = document.getElementById('emailBody').value.trim();
    const recipientType = document.getElementById('emailRecipients').value;

    if (!subject || !body) {
        alert('Please enter a subject and body for your email.');
        return;
    }

    const clients = getClients?.() || [];
    let recipients = [];
    const now = new Date();
    const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

    switch (recipientType) {
        case 'all':
            recipients = clients;
            break;
        case 'recent':
            recipients = clients.filter(c => new Date(c.createdAt || 0) >= threeMonthsAgo);
            break;
        case 'inactive':
            recipients = clients.filter(c => new Date(c.createdAt || 0) < sixMonthsAgo);
            break;
    }

    if (recipients.length === 0) {
        alert('No recipients match your selection.');
        return;
    }

    // In a real app, this would send emails via a backend API
    // For now, we'll simulate success and show a summary
    showConfirmDialog(
        'Send Email Campaign',
        `Send this email to ${recipients.length} client${recipients.length !== 1 ? 's' : ''}?`,
        () => {
            // Generate mailto links for each recipient (limited functionality)
            const emailList = recipients.map(c => c.email).join(',');

            // Create a summary modal
            alert(`Email campaign prepared for ${recipients.length} recipients!\n\nSubject: ${subject}\n\nNote: In production, this would be sent via an email service. For now, you can copy the recipient list:\n\n${emailList}`);

            // Clear form
            document.getElementById('emailSubject').value = '';
            document.getElementById('emailBody').value = '';
            document.getElementById('attachPost').value = '';
        }
    );
}

// Make marketing functions globally available
window.viewPost = viewPost;
window.deletePost = deletePost;

/* ===================================
   AI CONTENT GENERATION
   =================================== */
function initAI() {
    const generatePostBtn = document.getElementById('generatePostBtn');
    const generateEmailBtn = document.getElementById('generateEmailBtn');
    const viewLogsBtn = document.getElementById('viewLogsBtn');

    generatePostBtn?.addEventListener('click', generatePost);
    generateEmailBtn?.addEventListener('click', generateEmail);
    viewLogsBtn?.addEventListener('click', viewServerLogs);
}

async function generatePost() {
    const prompt = document.getElementById('aiPrompt').value.trim();
    const btn = document.getElementById('generatePostBtn');

    if (!prompt) {
        alert('Please enter a topic or idea for your post.');
        return;
    }

    setButtonLoading(btn, true);
    console.log('[AI] Starting post generation with prompt:', prompt);

    try {
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, type: 'post', includeImage: true })
        });

        const data = await response.json();
        console.log('[AI] Response received:', {
            success: data.success,
            hasContent: !!data.content,
            hasImage: !!data.image,
            imageSize: data.image ? data.image.length : 0,
            requestId: data.requestId,
            debug: data.debug
        });

        if (data.success && data.content) {
            parseAndFillPostContent(data.content);

            // If image was generated, set it in the form
            if (data.image) {
                console.log('[AI] Setting image in form, size:', data.image.length);
                currentPostImage = data.image;
                const preview = document.getElementById('imagePreview');
                const placeholder = document.getElementById('uploadPlaceholder');

                if (preview && placeholder) {
                    preview.src = data.image;
                    preview.classList.remove('hidden');
                    placeholder.classList.add('hidden');
                    console.log('[AI] Image preview updated successfully');
                } else {
                    console.error('[AI] Preview elements not found:', { preview: !!preview, placeholder: !!placeholder });
                }
            } else {
                console.warn('[AI] No image in response. Debug info:', data.debug);
                if (data.debug?.imageError) {
                    console.error('[AI] Image error:', data.debug.imageError);
                }
            }
        } else {
            console.error('[AI] Generation failed:', data);
            alert('Failed to generate content: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('[AI] Generation error:', error);
        alert('Failed to connect to AI service. Please try again.\n\nError: ' + error.message);
    } finally {
        setButtonLoading(btn, false);
    }
}

async function viewServerLogs() {
    try {
        const response = await fetch('/api/logs?lines=50');
        const data = await response.json();

        if (data.logs && data.logs.length > 0) {
            const logsHtml = data.logs.map(log => {
                const level = log.level || 'INFO';
                const levelClass = level === 'ERROR' ? 'log-error' : level === 'DEBUG' ? 'log-debug' : 'log-info';
                return `<div class="log-entry ${levelClass}">
                    <span class="log-time">${log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : ''}</span>
                    <span class="log-level">[${level}]</span>
                    <span class="log-message">${log.message || log.raw || ''}</span>
                    ${log.data ? `<pre class="log-data">${JSON.stringify(log.data, null, 2)}</pre>` : ''}
                </div>`;
            }).join('');

            // Create or update logs modal
            let logsModal = document.getElementById('logsModal');
            if (!logsModal) {
                logsModal = document.createElement('div');
                logsModal.id = 'logsModal';
                logsModal.className = 'modal';
                safeSetHTML(logsModal, `
                    <div class="modal-content logs-modal-content">
                        <button class="modal-close" onclick="document.getElementById('logsModal').classList.remove('active')">&times;</button>
                        <h3>Server Logs</h3>
                        <div id="logsContent" class="logs-content"></div>
                        <button class="btn btn-secondary" onclick="clearServerLogs()">Clear Logs</button>
                    </div>
                `);
                document.body.appendChild(logsModal);
            }

            safeSetHTML("logsContent", logsHtml);
            logsModal.classList.add('active');
        } else {
            alert('No logs available yet.');
        }
    } catch (error) {
        console.error('Failed to fetch logs:', error);
        alert('Failed to fetch server logs: ' + error.message);
    }
}

async function clearServerLogs() {
    try {
        await fetch('/api/logs', { method: 'DELETE' });
        safeSetHTML("logsContent", '<p>Logs cleared.</p>');
    } catch (error) {
        alert('Failed to clear logs: ' + error.message);
    }
}

window.viewServerLogs = viewServerLogs;
window.clearServerLogs = clearServerLogs;

async function generateEmail() {
    const prompt = document.getElementById('aiEmailPrompt').value.trim();
    const btn = document.getElementById('generateEmailBtn');

    if (!prompt) {
        alert('Please enter a topic or idea for your email.');
        return;
    }

    setButtonLoading(btn, true);

    try {
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, type: 'email' })
        });

        const data = await response.json();

        if (data.success && data.content) {
            parseAndFillEmailContent(data.content);
        } else {
            alert('Failed to generate content: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('AI Generation error:', error);
        alert('Failed to connect to AI service. Please try again.');
    } finally {
        setButtonLoading(btn, false);
    }
}

function setButtonLoading(btn, loading) {
    const textEl = btn.querySelector('.btn-text');
    const loadingEl = btn.querySelector('.btn-loading');

    if (loading) {
        btn.disabled = true;
        textEl?.classList.add('hidden');
        loadingEl?.classList.remove('hidden');
    } else {
        btn.disabled = false;
        textEl?.classList.remove('hidden');
        loadingEl?.classList.add('hidden');
    }
}

function parseAndFillPostContent(content) {
    // Parse the AI response
    const titleMatch = content.match(/TITLE:\s*(.+?)(?=\n|CONTENT:)/s);
    const contentMatch = content.match(/CONTENT:\s*(.+?)(?=HASHTAGS:|$)/s);
    const hashtagsMatch = content.match(/HASHTAGS:\s*(.+?)$/s);

    const title = titleMatch ? titleMatch[1].trim() : '';
    let body = contentMatch ? contentMatch[1].trim() : content;
    const hashtags = hashtagsMatch ? hashtagsMatch[1].trim() : '';

    // Combine body and hashtags
    if (hashtags) {
        body += '\n\n' + hashtags;
    }

    // Fill the form fields
    document.getElementById('postTitle').value = title;
    document.getElementById('postContent').value = body;

    // Clear the AI prompt
    document.getElementById('aiPrompt').value = '';
}

function parseAndFillEmailContent(content) {
    // Parse the AI response
    const subjectMatch = content.match(/SUBJECT:\s*(.+?)(?=\n|BODY:)/s);
    const bodyMatch = content.match(/BODY:\s*(.+?)$/s);

    const subject = subjectMatch ? subjectMatch[1].trim() : '';
    const body = bodyMatch ? bodyMatch[1].trim() : content;

    // Fill the form fields
    document.getElementById('emailSubject').value = subject;
    document.getElementById('emailBody').value = body;

    // Clear the AI prompt
    document.getElementById('aiEmailPrompt').value = '';
}

// Initialize AI on load
document.addEventListener('DOMContentLoaded', initAI);


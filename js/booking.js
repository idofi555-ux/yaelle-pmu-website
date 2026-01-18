/* ===================================
   YAELLE PMU ART - Booking System
   =================================== */

(function() {
    'use strict';

    /* ===================================
       CONSTANTS
       =================================== */
    const STORAGE_KEYS = {
        APPOINTMENTS: 'yaelle_appointments',
        CLIENTS: 'yaelle_clients'
    };

    const SERVICES = {
        'microblading': { name: 'Microblading', price: 350, duration: '2-3 hours' },
        'nanoblading': { name: 'Nanoblading', price: 400, duration: '2-3 hours' },
        'lip-blushing': { name: 'Lip Blushing', price: 350, duration: '2-3 hours' },
        'lash-liner': { name: 'Lash Liner', price: 250, duration: '1.5-2 hours' },
        'brow-lamination': { name: 'Brow Lamination', price: 80, duration: '45-60 mins' },
        'consultation': { name: 'Free Consultation', price: 0, duration: '30 mins' }
    };

    /* ===================================
       INIT
       =================================== */
    document.addEventListener('DOMContentLoaded', function() {
        initBookingForm();
        initDatePicker();
        initModal();
    });

    /* ===================================
       BOOKING FORM
       =================================== */
    function initBookingForm() {
        const form = document.getElementById('bookingForm');

        if (!form) return;

        form.addEventListener('submit', handleFormSubmit);

        // Real-time validation
        const inputs = form.querySelectorAll('input, select, textarea');
        inputs.forEach(function(input) {
            input.addEventListener('blur', function() { validateField(input); });
            input.addEventListener('input', function() {
                if (input.classList.contains('error')) {
                    validateField(input);
                }
            });
        });
    }

    function handleFormSubmit(e) {
        e.preventDefault();

        const form = e.target;
        const formData = new FormData(form);

        // Validate all fields
        let isValid = true;
        const inputs = form.querySelectorAll('input[required], select[required]');
        inputs.forEach(function(input) {
            if (!validateField(input)) {
                isValid = false;
            }
        });

        if (!isValid) {
            // Scroll to first error
            const firstError = form.querySelector('.error');
            if (firstError) {
                firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return;
        }

        // Create appointment object
        const appointment = {
            id: generateId('apt'),
            service: formData.get('service'),
            firstName: formData.get('firstName').trim(),
            lastName: formData.get('lastName').trim(),
            email: formData.get('email').trim().toLowerCase(),
            phone: formData.get('phone').trim(),
            date: formData.get('date'),
            time: formData.get('time'),
            notes: formData.get('notes') ? formData.get('notes').trim() : '',
            status: 'pending',
            createdAt: new Date().toISOString()
        };

        // Save appointment
        saveAppointment(appointment);

        // Save/update client
        saveClient(appointment);

        // Show confirmation modal
        showConfirmationModal(appointment);

        // Reset form
        form.reset();
    }

    function validateField(input) {
        const value = input.value.trim();
        let isValid = true;
        let errorMessage = '';

        // Remove existing error
        clearFieldError(input);

        // Required check
        if (input.required && !value) {
            isValid = false;
            errorMessage = 'This field is required';
        }

        // Email validation
        if (isValid && input.type === 'email' && value) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                isValid = false;
                errorMessage = 'Please enter a valid email address';
            }
        }

        // Phone validation
        if (isValid && input.type === 'tel' && value) {
            const phoneRegex = /^[\d\s\-+()]{8,}$/;
            if (!phoneRegex.test(value)) {
                isValid = false;
                errorMessage = 'Please enter a valid phone number';
            }
        }

        // Date validation (must be in the future)
        if (isValid && input.type === 'date' && value) {
            const selectedDate = new Date(value);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (selectedDate < today) {
                isValid = false;
                errorMessage = 'Please select a future date';
            }
        }

        if (!isValid) {
            showFieldError(input, errorMessage);
        }

        return isValid;
    }

    function showFieldError(input, message) {
        input.classList.add('error');

        const errorEl = document.createElement('span');
        errorEl.className = 'field-error';
        errorEl.textContent = message;
        errorEl.style.cssText = 'color: #c44; font-size: 12px; margin-top: 4px; display: block;';

        input.parentNode.appendChild(errorEl);
    }

    function clearFieldError(input) {
        input.classList.remove('error');
        const existingError = input.parentNode.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }
    }

    /* ===================================
       DATE PICKER
       =================================== */
    function initDatePicker() {
        const dateInput = document.getElementById('date');

        if (!dateInput) return;

        // Set minimum date to today
        const today = new Date();
        const minDate = today.toISOString().split('T')[0];
        dateInput.setAttribute('min', minDate);

        // Set maximum date to 3 months from now
        const maxDate = new Date();
        maxDate.setMonth(maxDate.getMonth() + 3);
        dateInput.setAttribute('max', maxDate.toISOString().split('T')[0]);
    }

    /* ===================================
       MODAL
       =================================== */
    function initModal() {
        const modal = document.getElementById('confirmationModal');
        const closeBtn = document.getElementById('modalClose');
        const closeModalBtn = document.getElementById('modalCloseBtn');

        if (!modal) return;

        // Close on X button
        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);

        // Close on background click
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeModal();
            }
        });

        // Close on Escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && modal.classList.contains('active')) {
                closeModal();
            }
        });
    }

    function showConfirmationModal(appointment) {
        const modal = document.getElementById('confirmationModal');
        const details = document.getElementById('modalDetails');

        if (!modal || !details) return;

        const service = SERVICES[appointment.service];
        const YaelleUtils = window.YaelleUtils || {};

        const formattedDate = YaelleUtils.formatDate ? YaelleUtils.formatDate(appointment.date) : appointment.date;
        const formattedTime = YaelleUtils.formatTime ? YaelleUtils.formatTime(appointment.time) : appointment.time;

        details.innerHTML =
            '<p><strong>Service:</strong> ' + (service ? service.name : appointment.service) + '</p>' +
            '<p><strong>Date:</strong> ' + formattedDate + '</p>' +
            '<p><strong>Time:</strong> ' + formattedTime + '</p>' +
            '<p><strong>Name:</strong> ' + appointment.firstName + ' ' + appointment.lastName + '</p>' +
            '<p><strong>Email:</strong> ' + appointment.email + '</p>';

        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        const modal = document.getElementById('confirmationModal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    /* ===================================
       DATA PERSISTENCE
       =================================== */
    function saveAppointment(appointment) {
        const appointments = getAppointments();
        appointments.push(appointment);
        localStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(appointments));
    }

    function getAppointments() {
        try {
            const data = localStorage.getItem(STORAGE_KEYS.APPOINTMENTS);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Error reading appointments:', e);
            return [];
        }
    }

    function saveClient(appointment) {
        const clients = getClients();

        // Check if client exists by email
        const existingIndex = clients.findIndex(function(c) { return c.email === appointment.email; });

        if (existingIndex >= 0) {
            // Update existing client
            const client = clients[existingIndex];
            client.firstName = appointment.firstName;
            client.lastName = appointment.lastName;
            client.phone = appointment.phone;
            if (client.appointments.indexOf(appointment.id) === -1) {
                client.appointments.push(appointment.id);
            }
        } else {
            // Create new client
            const client = {
                id: generateId('client'),
                firstName: appointment.firstName,
                lastName: appointment.lastName,
                email: appointment.email,
                phone: appointment.phone,
                appointments: [appointment.id],
                createdAt: new Date().toISOString()
            };
            clients.push(client);
        }

        localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(clients));
    }

    function getClients() {
        try {
            const data = localStorage.getItem(STORAGE_KEYS.CLIENTS);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Error reading clients:', e);
            return [];
        }
    }

    /* ===================================
       UTILITIES
       =================================== */
    function generateId(prefix) {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8);
        return prefix + '_' + timestamp + random;
    }

    // Export for admin dashboard
    window.YaelleBooking = {
        STORAGE_KEYS: STORAGE_KEYS,
        SERVICES: SERVICES,
        getAppointments: getAppointments,
        getClients: getClients,
        generateId: generateId
    };

})();

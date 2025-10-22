
// Update this URL with your actual API Gateway URL
const API_CONFIG = {
    BASE_URL: 'https://5o59dexiv8.execute-api.us-east-1.amazonaws.com/prod',
    ENDPOINTS: {
        REGISTER: '/register'
    }
};

// Ticket prices
const TICKET_PRICES = { general: 49, vip: 129, student: 29 };

// DOM Elements
let form, firstNameField, lastNameField, emailField, loading;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize DOM elements
    form = document.getElementById('regForm');
    firstNameField = document.getElementById('firstNameField');
    lastNameField = document.getElementById('lastNameField');
    emailField = document.getElementById('emailField');
    loading = document.getElementById('loading');
    
    // Initialize event listeners
    initEventListeners();
    initFormValidation();
    updateSummary();
});

// Initialize event listeners
function initEventListeners() {
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }
    
    // Ticket type and quantity change listeners
    const ticketType = document.getElementById('ticketType');
    const quantity = document.getElementById('quantity');
    
    if (ticketType) {
        ticketType.addEventListener('change', updateSummary);
    }
    if (quantity) {
        quantity.addEventListener('input', updateSummary);
    }
}

// Initialize form validation
function initFormValidation() {
    const fields = [
        { id: 'firstName', field: firstNameField },
        { id: 'lastName', field: lastNameField },
        { id: 'email', field: emailField }
    ];

    fields.forEach(({ id, field }) => {
        const input = document.getElementById(id);
        if (input && field) {
            input.addEventListener('blur', () => {
                validateField(id, field, input);
            });
            
            input.addEventListener('input', () => {
                if (input.value.trim()) {
                    field.classList.remove('invalid');
                    field.classList.add('valid');
                }
            });
        }
    });
}

// Form submission handler
async function handleFormSubmit(e) {
    e.preventDefault();
    
    // Validate all fields
    const first = document.getElementById('firstName');
    const last = document.getElementById('lastName');
    const email = document.getElementById('email');
    
    const firstNameValid = validateField('firstName', firstNameField, first);
    const lastNameValid = validateField('lastName', lastNameField, last);
    const emailValid = validateField('email', emailField, email);
    
    if (!firstNameValid || !lastNameValid || !emailValid) {
        openSnackbar('Please fix the highlighted fields before submitting.');
        return;
    }

    // Collect form data
    const formData = {
        firstName: first.value.trim(),
        lastName: last.value.trim(),
        email: email.value.trim(),
        phone: document.getElementById('phone').value.trim() || null,
        ticketType: document.getElementById('ticketType').value,
        quantity: parseInt(document.getElementById('quantity').value),
        newsletter: document.getElementById('newsletter').checked
    };

    // Disable submit button and show loading
    const submitBtn = document.getElementById('btnSubmit');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Processing...';
    loading.style.display = 'flex';

    try {
        // Send registration to backend
        const response = await registerAttendee(formData);
        
        // Show success state
        showSuccessScreen(response);
        openSnackbar('Registration successful!');
        
    } catch (error) {
        console.error('Registration error:', error);
        openSnackbar(error.message || 'Registration failed. Please try again.');
        
        // Re-enable submit button
        submitBtn.disabled = false;
        submitBtn.textContent = 'Confirm & Register';
    } finally {
        loading.style.display = 'none';
    }
}

// API function to register attendee
async function registerAttendee(formData) {
    const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.REGISTER}`;
    
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }

    return data;
}

// Validate individual field
function validateField(id, field, input) {
    const error = document.getElementById('err-' + id);
    let isValid = true;
    
    if (id === 'email') {
        isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value);
    } else {
        isValid = input.value.trim() !== '';
    }
    
    if (!isValid) {
        field.classList.add('invalid');
        field.classList.remove('valid');
        if (error) error.style.display = 'block';
    } else {
        field.classList.remove('invalid');
        field.classList.add('valid');
        if (error) error.style.display = 'none';
    }
    
    return isValid;
}

// Update summary section
function updateSummary() {
    const ticketType = document.getElementById('ticketType');
    const quantity = document.getElementById('quantity');
    const summaryTicket = document.getElementById('summary-ticket');
    const summaryQty = document.getElementById('summary-qty');
    const summarySubtotal = document.getElementById('summary-subtotal');
    const summaryTax = document.getElementById('summary-tax');
    const summaryTotal = document.getElementById('summary-total');

    if (!ticketType || !quantity) return;

    const type = ticketType.value;
    const qty = parseInt(quantity.value) || 1;
    const price = TICKET_PRICES[type] || 0;
    const subtotal = price * qty;
    const tax = Math.round(subtotal * 0.08);
    const total = subtotal + tax;
    
    if (summaryTicket) summaryTicket.textContent = ticketType.options[ticketType.selectedIndex].text;
    if (summaryQty) summaryQty.textContent = qty;
    if (summarySubtotal) summarySubtotal.textContent = subtotal;
    if (summaryTax) summaryTax.textContent = tax;
    if (summaryTotal) summaryTotal.textContent = total;
}

// Show success screen
function showSuccessScreen(response) {
    const formSection = document.querySelector('.col-md-8');
    const registration = response.data;
    
    formSection.innerHTML = `
        <div class="success-screen">
            <div class="success-icon">✓</div>
            <h2>Registration Successful!</h2>
            <p>Thank you for registering for Eventica Conference 2025.</p>
            <div class="registration-details">
                <p><strong>Registration ID:</strong> ${registration.registrationId}</p>
                <p><strong>Name:</strong> ${registration.firstName} ${registration.lastName}</p>
                <p><strong>Email:</strong> ${registration.email}</p>
                <p><strong>Ticket Type:</strong> ${registration.ticketType.charAt(0).toUpperCase() + registration.ticketType.slice(1)}</p>
                <p><strong>Quantity:</strong> ${registration.quantity}</p>
                <p><strong>Total Amount:</strong> $${registration.totalAmount}</p>
            </div>
            <p>You will receive a confirmation email shortly.</p>
            <div style="margin-top: 30px; display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
                <button class="btn btn-ghost" onclick="location.reload()">Register Another Person</button>
                <button class="btn btn-primary" onclick="downloadTicket('${registration.registrationId}')">Download Receipt</button>
            </div>
        </div>
    `;
}

// Download ticket function
function downloadTicket(registrationId) {
    openSnackbar('Generating your receipt...');
    
    // Create a simple receipt HTML
    const receiptContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Eventica Conference 2025 - Receipt</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; }
                .receipt { border: 2px solid #0066ff; padding: 30px; border-radius: 10px; }
                .header { text-align: center; color: #0066ff; margin-bottom: 30px; }
                .details { margin: 20px 0; }
                .detail-row { display: flex; justify-content: space-between; margin: 10px 0; }
                .total { border-top: 2px solid #0066ff; padding-top: 10px; font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="receipt">
                <div class="header">
                    <h1>Eventica Conference 2025</h1>
                    <h2>Registration Receipt</h2>
                </div>
                <div class="details">
                    <div class="detail-row">
                        <span><strong>Registration ID:</strong></span>
                        <span>${registrationId}</span>
                    </div>
                    <div class="detail-row">
                        <span><strong>Date:</strong></span>
                        <span>${new Date().toLocaleDateString()}</span>
                    </div>
                    <div class="detail-row total">
                        <span><strong>Status:</strong></span>
                        <span style="color: green;">Confirmed</span>
                    </div>
                </div>
                <div style="text-align: center; margin-top: 30px; color: #666;">
                    <p>Thank you for your registration!</p>
                    <p><em>eventica.com</em></p>
                </div>
            </div>
        </body>
        </html>
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(receiptContent);
    printWindow.document.close();
    printWindow.print();
}

// Snackbar function
function openSnackbar(msg, duration = 4000) {
    const snackbar = document.getElementById('snackbar');
    if (!snackbar) return;
    
    snackbar.textContent = msg;
    snackbar.style.display = 'block';
    
    setTimeout(() => {
        snackbar.style.display = 'none';
    }, duration);
}
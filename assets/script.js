// Enhanced error handling for API calls
async function registerAttendee(formData) {
    const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.REGISTER}`;
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (!response.ok) {
            // Log client-side error
            console.error('API Error Response:', {
                status: response.status,
                statusText: response.statusText,
                error: data.error,
                formData: {
                    email: formData.email,
                    ticketType: formData.ticketType,
                    quantity: formData.quantity
                }
            });
            
            throw new Error(data.error || `Registration failed (${response.status})`);
        }

        // Log successful registration
        console.log('Registration successful:', {
            registrationId: data.registrationId,
            email: formData.email,
            ticketType: formData.ticketType
        });

        return data;

    } catch (error) {
        // Log network errors
        console.error('Network/API Error:', {
            error: error.message,
            formData: {
                email: formData.email,
                ticketType: formData.ticketType
            },
            timestamp: new Date().toISOString()
        });
        
        throw error;
    }
}

// Enhanced form submission handler
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

    // Log form submission attempt
    console.log('Form submission started:', {
        email: formData.email,
        ticketType: formData.ticketType,
        quantity: formData.quantity,
        timestamp: new Date().toISOString()
    });

    try {
        // Send registration to backend
        const response = await registerAttendee(formData);
        
        // Show success state
        showSuccessScreen(response);
        openSnackbar('Registration successful!');
        
        // Log successful submission
        console.log('Form submission completed successfully:', {
            registrationId: response.registrationId,
            email: formData.email,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Form submission failed:', {
            error: error.message,
            email: formData.email,
            timestamp: new Date().toISOString()
        });
        
        openSnackbar(error.message || 'Registration failed. Please try again.');
        
        // Re-enable submit button
        submitBtn.disabled = false;
        submitBtn.textContent = 'Confirm & Register';
    } finally {
        loading.style.display = 'none';
    }
}
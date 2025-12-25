// Waitlist form functionality
class WaitlistForm {
    constructor() {
        this.form = document.getElementById('waitlistForm');
        this.successMessage = document.getElementById('successMessage');
        this.init();
    }

    init() {
        this.form.addEventListener('submit', this.handleSubmit.bind(this));
        this.setupFormValidation();
    }

    setupFormValidation() {
        const inputs = this.form.querySelectorAll('input[required], select[required]');
        inputs.forEach(input => {
            input.addEventListener('blur', this.validateField.bind(this));
            input.addEventListener('input', this.clearFieldError.bind(this));
        });
    }

    validateField(event) {
        const field = event.target;
        const value = field.value.trim();
        const fieldName = field.name;
        
        // Clear previous error
        this.clearFieldError(event);
        
        let errorMessage = '';
        
        // Required field validation
        if (!value) {
            errorMessage = 'This field is required';
        }
        
        // Email validation
        if (fieldName === 'email' && value && !this.isValidEmail(value)) {
            errorMessage = 'Please enter a valid email address';
        }
        
        // Name validation (letters only)
        if ((fieldName === 'firstName' || fieldName === 'lastName') && value) {
            if (!this.isValidName(value)) {
                errorMessage = 'Please use letters only';
            }
        }
        
        if (errorMessage) {
            this.showFieldError(field, errorMessage);
            return false;
        }
        
        return true;
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    isValidName(name) {
        const nameRegex = /^[a-zA-Z\s'-]+$/;
        return nameRegex.test(name);
    }

    showFieldError(field, message) {
        const formGroup = field.closest('.form-group');
        let errorElement = formGroup.querySelector('.error-message');
        
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.className = 'error-message';
            formGroup.appendChild(errorElement);
        }
        
        errorElement.textContent = message;
        field.classList.add('error');
    }

    clearFieldError(event) {
        const field = event.target;
        const formGroup = field.closest('.form-group');
        const errorElement = formGroup.querySelector('.error-message');
        
        if (errorElement) {
            errorElement.remove();
        }
        
        field.classList.remove('error');
    }

    async handleSubmit(event) {
        event.preventDefault();
        
        // Validate all required fields
        const requiredFields = this.form.querySelectorAll('[required]');
        let isValid = true;
        
        requiredFields.forEach(field => {
            if (!this.validateField({ target: field })) {
                isValid = false;
            }
        });
        
        if (!isValid) {
            this.showFormError('Please fill in all required fields correctly.');
            return;
        }
        
        // Show loading state
        this.setLoadingState(true);
        
        try {
            // Collect form data
            const formData = this.collectFormData();
            
            // Submit to waitlist API
            const result = await this.submitToWaitlist(formData);
            
            if (result.success) {
                this.showSuccessState();
                this.resetForm();
            } else {
                throw new Error(result.message || 'Failed to join waitlist');
            }
            
        } catch (error) {
            console.error('Waitlist submission error:', error);
            this.showFormError('Sorry, there was an error joining the waitlist. Please try again.');
        } finally {
            this.setLoadingState(false);
        }
    }

    collectFormData() {
        const formData = new FormData(this.form);
        return {
            firstName: formData.get('firstName').trim(),
            lastName: formData.get('lastName').trim(),
            email: formData.get('email').trim().toLowerCase(),
            company: formData.get('company').trim(),
            interest: formData.get('interest'),
            newsletter: formData.get('newsletter') === 'on',
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            referrer: document.referrer || 'Direct'
        };
    }

    async submitToWaitlist(data) {
        try {
            const response = await fetch('/tables/waitlist', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Network response was not ok' }));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            return { success: true, data: result };
            
        } catch (error) {
            // Fallback: Store in localStorage if API fails
            console.warn('API submission failed, falling back to localStorage:', error);
            return this.fallbackToLocalStorage(data);
        }
    }

    fallbackToLocalStorage(data) {
        try {
            // Get existing waitlist from localStorage
            let waitlist = JSON.parse(localStorage.getItem('360evo_waitlist') || '[]');
            
            // Check for duplicate email
            if (waitlist.some(entry => entry.email === data.email)) {
                return { success: false, message: 'This email is already on our waitlist.' };
            }
            
            // Add new entry
            waitlist.push({
                ...data,
                id: Date.now().toString(),
                submittedAt: new Date().toISOString()
            });
            
            // Save back to localStorage
            localStorage.setItem('360evo_waitlist', JSON.stringify(waitlist));
            
            return { success: true, message: 'Successfully added to waitlist (offline mode)' };
            
        } catch (error) {
            return { success: false, message: 'Failed to save waitlist entry: ' + error.message };
        }
    }

    setLoadingState(isLoading) {
        const submitBtn = this.form.querySelector('.submit-btn');
        const btnText = submitBtn.querySelector('.btn-text');
        const btnLoading = submitBtn.querySelector('.btn-loading');
        
        submitBtn.disabled = isLoading;
        
        if (isLoading) {
            btnText.style.display = 'none';
            btnLoading.style.display = 'flex';
        } else {
            btnText.style.display = 'flex';
            btnLoading.style.display = 'none';
        }
    }

    showSuccessState() {
        this.form.style.display = 'none';
        this.successMessage.style.display = 'block';
        
        // Add success animation
        this.successMessage.style.opacity = '0';
        this.successMessage.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            this.successMessage.style.transition = 'all 0.5s ease';
            this.successMessage.style.opacity = '1';
            this.successMessage.style.transform = 'translateY(0)';
        }, 100);
    }

    showFormError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'form-error-message';
        errorDiv.textContent = message;
        
        // Remove any existing error message
        const existingError = this.form.querySelector('.form-error-message');
        if (existingError) {
            existingError.remove();
        }
        
        this.form.insertBefore(errorDiv, this.form.firstChild);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }

    resetForm() {
        this.form.reset();
        // Reset checkbox to checked state
        const newsletterCheckbox = this.form.querySelector('#newsletter');
        if (newsletterCheckbox) {
            newsletterCheckbox.checked = true;
        }
    }
}

// Utility function to scroll to form
function scrollToForm() {
    const waitlistSection = document.getElementById('waitlist');
    waitlistSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    // Add a subtle highlight effect
    const formContainer = waitlistSection.querySelector('.waitlist-container');
    formContainer.style.transition = 'all 0.3s ease';
    formContainer.style.transform = 'scale(1.02)';
    formContainer.style.boxShadow = '0 20px 60px rgba(102, 126, 234, 0.3)';
    
    setTimeout(() => {
        formContainer.style.transform = 'scale(1)';
        formContainer.style.boxShadow = '0 20px 60px rgba(0, 0, 0, 0.1)';
    }, 1000);
}

// Add some CSS for error messages
const additionalStyles = `
    .error-message {
        color: #e74c3c;
        font-size: 0.8rem;
        margin-top: 0.25rem;
        padding-left: 0.5rem;
    }
    
    .form-group input.error,
    .form-group select.error {
        border-color: #e74c3c !important;
        box-shadow: 0 0 0 3px rgba(231, 76, 60, 0.1) !important;
    }
    
    .form-error-message {
        background: #fee;
        border: 1px solid #fcc;
        color: #c33;
        padding: 1rem;
        border-radius: 8px;
        margin-bottom: 1.5rem;
        text-align: center;
        font-weight: 500;
    }
    
    .form-group {
        position: relative;
    }
    
    /* Smooth transitions for form elements */
    .form-group input,
    .form-group select {
        transition: all 0.3s ease;
    }
    
    /* Focus states */
    .form-group input:focus,
    .form-group select:focus {
        border-color: #667eea !important;
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2) !important;
    }
    
    /* Success message animation */
    .success-message {
        animation: fadeInUp 0.6s ease-out;
    }
    
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    /* Form validation states */
    .form-group input:valid:not(:focus) {
        border-color: #4caf50;
    }
    
    .form-group input:invalid:not(:focus):not(:placeholder-shown) {
        border-color: #e74c3c;
    }
`;

// Add the additional styles to the page
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);

// Initialize the form when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new WaitlistForm();
    
    // Add some interactive effects
    addInteractiveEffects();
});

// Add interactive effects
function addInteractiveEffects() {
    // Add parallax effect to floating elements
    document.addEventListener('mousemove', (e) => {
        const floatingElements = document.querySelectorAll('.floating-element');
        const mouseX = e.clientX / window.innerWidth;
        const mouseY = e.clientY / window.innerHeight;
        
        floatingElements.forEach((element, index) => {
            const speed = (index + 1) * 0.5;
            const x = (mouseX - 0.5) * speed * 20;
            const y = (mouseY - 0.5) * speed * 20;
            
            element.style.transform = `translate(${x}px, ${y}px)`;
        });
    });
    
    // Add scroll-triggered animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Observe elements for scroll animations
    document.querySelectorAll('.waitlist-section, .footer').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'all 0.6s ease';
        observer.observe(el);
    });
}
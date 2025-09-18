// Landing Page JavaScript

// Smooth scroll for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Navbar scroll effect
let lastScroll = 0;
window.addEventListener('scroll', () => {
    const nav = document.querySelector('nav');
    const currentScroll = window.pageYOffset;

    if (currentScroll > 50) {
        nav.classList.add('nav-scrolled');
    } else {
        nav.classList.remove('nav-scrolled');
    }

    lastScroll = currentScroll;
});

// Scroll animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// Observe all elements with scroll-animate class
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.scroll-animate').forEach(el => {
        observer.observe(el);
    });
});

// Counter animation for stats
function animateCounter(element, target, duration = 2000) {
    let start = 0;
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
        start += increment;
        if (start >= target) {
            element.textContent = target.toLocaleString();
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(start).toLocaleString();
        }
    }, 16);
}

// Animate counters when visible
const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting && !entry.target.dataset.animated) {
            const target = parseInt(entry.target.dataset.target);
            animateCounter(entry.target, target);
            entry.target.dataset.animated = 'true';
        }
    });
}, { threshold: 0.5 });

// Set up counter animations
document.addEventListener('DOMContentLoaded', () => {
    // Add data attributes for counter targets
    const counters = [
        { selector: '.stat-trainers', value: 10000 },
        { selector: '.stat-recipes', value: 2000000 },
        { selector: '.stat-hours', value: 20 },
        { selector: '.stat-retention', value: 92 }
    ];

    counters.forEach(counter => {
        const element = document.querySelector(counter.selector);
        if (element) {
            element.dataset.target = counter.value;
            counterObserver.observe(element);
        }
    });
});

// Form validation for email capture
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Handle CTA form submissions
document.addEventListener('DOMContentLoaded', () => {
    const ctaForms = document.querySelectorAll('.cta-form');
    ctaForms.forEach(form => {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const emailInput = form.querySelector('input[type="email"]');

            if (validateEmail(emailInput.value)) {
                // Track conversion
                if (typeof gtag !== 'undefined') {
                    gtag('event', 'sign_up', {
                        'event_category': 'engagement',
                        'event_label': 'landing_page'
                    });
                }

                // Show success message
                const successMsg = document.createElement('div');
                successMsg.className = 'success-message';
                successMsg.textContent = 'Thank you! Check your email to get started.';
                form.appendChild(successMsg);

                // Reset form
                emailInput.value = '';

                // Remove message after 5 seconds
                setTimeout(() => {
                    successMsg.remove();
                }, 5000);
            } else {
                emailInput.classList.add('error');
                emailInput.focus();
            }
        });
    });
});

// Video modal functionality
function openVideoModal() {
    const modal = document.getElementById('videoModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeVideoModal() {
    const modal = document.getElementById('videoModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
        // Stop video if iframe exists
        const iframe = modal.querySelector('iframe');
        if (iframe) {
            const src = iframe.src;
            iframe.src = '';
            iframe.src = src;
        }
    }
}

// Mobile menu toggle
document.addEventListener('DOMContentLoaded', () => {
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const mobileMenu = document.querySelector('.mobile-menu');

    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('active');
            mobileMenuBtn.classList.toggle('active');
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!mobileMenu.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
                mobileMenu.classList.remove('active');
                mobileMenuBtn.classList.remove('active');
            }
        });
    }
});

// Lazy load images
if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.add('loaded');
                observer.unobserve(img);
            }
        });
    });

    document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
    });
}

// Analytics tracking
function trackEvent(action, category, label, value) {
    if (typeof gtag !== 'undefined') {
        gtag('event', action, {
            'event_category': category,
            'event_label': label,
            'value': value
        });
    }
}

// Track CTA clicks
document.querySelectorAll('.cta-button').forEach(button => {
    button.addEventListener('click', () => {
        trackEvent('click', 'CTA', button.textContent, 1);
    });
});

// Track pricing tier clicks
document.querySelectorAll('.pricing-card').forEach(card => {
    card.addEventListener('click', () => {
        const tier = card.dataset.tier;
        trackEvent('click', 'Pricing', tier, 1);
    });
});

// Page load performance tracking
window.addEventListener('load', () => {
    if (window.performance && window.performance.timing) {
        const timing = window.performance.timing;
        const pageLoadTime = timing.loadEventEnd - timing.navigationStart;

        if (typeof gtag !== 'undefined') {
            gtag('event', 'timing_complete', {
                'name': 'load',
                'value': pageLoadTime,
                'event_category': 'Performance'
            });
        }
    }
});

// Add floating action button behavior
window.addEventListener('scroll', () => {
    const fab = document.querySelector('.floating-action-btn');
    if (fab) {
        if (window.scrollY > 500) {
            fab.classList.add('visible');
        } else {
            fab.classList.remove('visible');
        }
    }
});

// Testimonial carousel (if needed)
class TestimonialCarousel {
    constructor(container) {
        this.container = container;
        this.items = container.querySelectorAll('.testimonial-item');
        this.currentIndex = 0;
        this.autoplayInterval = null;
        this.init();
    }

    init() {
        if (this.items.length <= 1) return;

        this.showItem(0);
        this.startAutoplay();

        // Add navigation buttons
        this.addNavigation();

        // Pause on hover
        this.container.addEventListener('mouseenter', () => this.stopAutoplay());
        this.container.addEventListener('mouseleave', () => this.startAutoplay());
    }

    showItem(index) {
        this.items.forEach((item, i) => {
            item.style.display = i === index ? 'block' : 'none';
        });
        this.currentIndex = index;
    }

    next() {
        const nextIndex = (this.currentIndex + 1) % this.items.length;
        this.showItem(nextIndex);
    }

    prev() {
        const prevIndex = (this.currentIndex - 1 + this.items.length) % this.items.length;
        this.showItem(prevIndex);
    }

    startAutoplay() {
        this.autoplayInterval = setInterval(() => this.next(), 5000);
    }

    stopAutoplay() {
        clearInterval(this.autoplayInterval);
    }

    addNavigation() {
        const prevBtn = document.createElement('button');
        prevBtn.className = 'carousel-nav carousel-prev';
        prevBtn.innerHTML = '&#8249;';
        prevBtn.addEventListener('click', () => this.prev());

        const nextBtn = document.createElement('button');
        nextBtn.className = 'carousel-nav carousel-next';
        nextBtn.innerHTML = '&#8250;';
        nextBtn.addEventListener('click', () => this.next());

        this.container.appendChild(prevBtn);
        this.container.appendChild(nextBtn);
    }
}

// Initialize testimonial carousel if exists
document.addEventListener('DOMContentLoaded', () => {
    const carousel = document.querySelector('.testimonial-carousel');
    if (carousel) {
        new TestimonialCarousel(carousel);
    }
});

// Prevent form resubmission on refresh
if (window.history.replaceState) {
    window.history.replaceState(null, null, window.location.href);
}

// Add keyboard navigation support
document.addEventListener('keydown', (e) => {
    // ESC key closes modals
    if (e.key === 'Escape') {
        closeVideoModal();
        // Close any other modals
    }
});

// Service worker registration for PWA (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(
            registration => console.log('ServiceWorker registration successful'),
            err => console.log('ServiceWorker registration failed')
        );
    });
}
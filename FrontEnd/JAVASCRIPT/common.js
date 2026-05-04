document.addEventListener('DOMContentLoaded', function() {
    // Theme Toggle Logic
    const themeBtn = document.querySelector('.theme-toggle');
    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            document.body.classList.toggle('light-mode');
            const icon = themeBtn.querySelector('i');
            if (icon && icon.classList.contains('fa-circle-half-stroke')) {
                icon.classList.replace('fa-circle-half-stroke', 'fa-moon');
            } else if (icon) {
                icon.classList.replace('fa-moon', 'fa-circle-half-stroke');
            }
        });
    }

    // Nav active state handling
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPath) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    // Profile Dropdown Toggle
    const profileBtn = document.getElementById('profileBtn');
    const profileDropdown = document.getElementById('profileDropdown');
    
    if (profileBtn && profileDropdown) {
        profileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            profileDropdown.classList.toggle('active');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            profileDropdown.classList.remove('active');
        });

        profileDropdown.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }
});

// Modal Functions
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('animate-fade-in');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

function confirmLogout() {
    openModal('logoutModal');
}

function executeLogout() {
    closeModal('logoutModal');
    const overlay = document.getElementById('logoutOverlay');
    if (overlay) {
        overlay.style.display = 'flex';
        
        // Simulate a smooth logout animation/transition
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);
    } else {
        window.location.href = 'login.html';
    }
}

// openRoomDetails is implemented per-page (e.g. alerts.js) to allow
// page-specific data fetching before opening the modal.

// Close modal when clicking outside content
window.onclick = function(event) {
    if (event.target.classList.contains('modal-overlay')) {
        event.target.style.display = 'none';
    }
}

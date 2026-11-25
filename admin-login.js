// ==========================================
// THEME MANAGER FOR LOGIN (Light / Dark Mode)
// ==========================================
function updateLoginThemeUI(theme) {
    const isLight = theme === 'light';
    const toggleBtn = document.getElementById('loginThemeToggle');
    if (toggleBtn) {
        const icon = toggleBtn.querySelector('.theme-icon');
        const text = toggleBtn.querySelector('.theme-text');
        if (icon) icon.textContent = isLight ? '☀️' : '🌙';
        if (text) text.textContent = isLight ? 'Light Mode' : 'Dark Mode';
        toggleBtn.setAttribute('title', isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode');
    }
}

function initLoginTheme() {
    const savedTheme = localStorage.getItem('admin_theme') || 'light';
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
    } else {
        document.body.classList.remove('light-theme');
    }
    updateLoginThemeUI(savedTheme);
}

window.toggleLoginTheme = function() {
    const isCurrentlyLight = document.body.classList.contains('light-theme');
    const newTheme = isCurrentlyLight ? 'dark' : 'light';
    if (newTheme === 'light') {
        document.body.classList.add('light-theme');
    } else {
        document.body.classList.remove('light-theme');
    }
    localStorage.setItem('admin_theme', newTheme);
    updateLoginThemeUI(newTheme);
};

if (document.body) {
    initLoginTheme();
} else {
    document.addEventListener('DOMContentLoaded', initLoginTheme);
}

// Auto-redirect if already logged in with a valid token
(async function checkExistingAuth() {
    const existingToken = localStorage.getItem('admin_token');
    if (!existingToken) return;

    try {
        const res = await fetch('/api/admin/me', {
            headers: {
                'Authorization': `Bearer ${existingToken}`,
                'Content-Type': 'application/json'
            }
        });
        if (res.ok) {
            const data = await res.json();
            if (data && data.username) {
                // Already authenticated! Go directly to dashboard
                window.location.replace('/admin-dashboard');
                return;
            }
        }
        // If token expired or invalid, clear it
        localStorage.removeItem('admin_token');
    } catch (e) {
        console.warn('Silent auth check error:', e);
    }
})();

const form = document.getElementById('loginForm');
const userGroup = document.getElementById('user-field');
const passGroup = document.getElementById('pass-field');
const totpGroup = document.getElementById('totp-field');
const totpDivider = document.getElementById('totp-divider');
const errorMsg = document.getElementById('errorMsg');
const submitBtn = document.getElementById('submitBtn');

let requiring2FA = false;

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMsg.style.display = 'none';
    submitBtn.disabled = true;
    submitBtn.innerText = 'Authenticating...';

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const totpToken = document.getElementById('totp').value.trim();

    try {
        const payload = { username, password };
        if (requiring2FA) {
            payload.token = totpToken;
        }

        const res = await fetch('/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (res.ok && data.success) {
            // Save token
            localStorage.setItem('admin_token', data.token);
            
            if (data.mustChangePassword) {
                // Show reset password form
                form.style.display = 'none';
                document.getElementById('resetPasswordForm').style.display = 'block';
            } else {
                // Redirect
                if (data.totpSetup === false) {
                    window.location.href = "/admin-dashboard?setup=true";
                } else {
                    window.location.href = "/admin-dashboard";
                }
            }
        } else {
            if (data.require2FA) {
                // Switch to 2FA view
                requiring2FA = true;
                if (userGroup) userGroup.style.display = 'none';
                if (passGroup) passGroup.style.display = 'none';
                if (totpDivider) totpDivider.style.display = 'block';
                if (totpGroup) totpGroup.style.display = 'block';
                submitBtn.innerText = 'Verify Code';
                submitBtn.disabled = false;
                errorMsg.style.display = 'none';
            } else {
                // Show error
                errorMsg.textContent = data.error || 'Authentication failed.';
                errorMsg.style.display = 'block';
                submitBtn.innerText = requiring2FA ? 'Verify Code' : 'Login';
                submitBtn.disabled = false;
            }
        }
    } catch (err) {
        console.error(err);
        errorMsg.textContent = 'A network error occurred.';
        errorMsg.style.display = 'block';
        submitBtn.innerText = requiring2FA ? 'Verify Code' : 'Login';
        submitBtn.disabled = false;
    }
});

const resetForm = document.getElementById('resetPasswordForm');
if (resetForm) {
    resetForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorMsg.style.display = 'none';
        
        const newPassword = document.getElementById('newPassword').value.trim();
        const token = localStorage.getItem('admin_token');
        
        if (newPassword.length < 6) {
            errorMsg.textContent = 'Password must be at least 6 characters.';
            errorMsg.style.display = 'block';
            return;
        }
        
        const resetBtn = document.getElementById('resetBtn');
        resetBtn.disabled = true;
        resetBtn.innerText = 'Updating...';
        
        try {
            const res = await fetch('/api/admin/change-password', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ newPassword })
            });
            
            const data = await res.json();
            
            if (res.ok && data.success) {
                // Success! Redirect to dashboard
                window.location.href = "/admin-dashboard";
            } else {
                errorMsg.textContent = data.error || 'Failed to update password.';
                errorMsg.style.display = 'block';
                resetBtn.disabled = false;
                resetBtn.innerText = 'Set Password & Login';
            }
        } catch (err) {
            console.error(err);
            errorMsg.textContent = 'A network error occurred.';
            errorMsg.style.display = 'block';
            resetBtn.disabled = false;
            resetBtn.innerText = 'Set Password & Login';
        }
    });
}

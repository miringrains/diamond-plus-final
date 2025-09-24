// Login Debug Script
console.log('🔍 Login Debug Script Loaded');

// Check if form exists
const form = document.querySelector('form');
console.log('Form found:', !!form);

if (form) {
  // Get original submit handler
  const originalOnSubmit = form.onsubmit;
  
  // Override form submission
  form.onsubmit = async function(e) {
    e.preventDefault();
    console.log('🎯 Form submission intercepted!');
    
    const email = e.target.email.value;
    const password = e.target.password.value;
    const submitButton = e.target.querySelector('button[type="submit"]');
    
    console.log('Email:', email);
    console.log('Password:', '***hidden***');
    console.log('Submit button:', submitButton);
    
    // Disable button and show loading
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Signing in...';
    }
    
    try {
      console.log('📡 Sending login request...');
      
      const response = await fetch('/api/supabase-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          redirectTo: '/dashboard'
        })
      });
      
      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);
      
      if (response.ok && data.success) {
        console.log('✅ Login successful! Redirecting...');
        setTimeout(() => {
          const redirectUrl = `https://diamondplusportal.com${data.redirectTo || '/dashboard'}`;
          console.log('Redirecting to:', redirectUrl);
          window.location.href = redirectUrl;
        }, 100);
      } else {
        console.error('❌ Login failed:', data.error || 'Unknown error');
        alert('Login failed: ' + (data.error || 'Unknown error'));
        
        // Re-enable button
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = 'Sign in';
        }
      }
    } catch (error) {
      console.error('💥 Network error:', error);
      alert('Network error: ' + error.message);
      
      // Re-enable button
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Sign in';
      }
    }
    
    return false;
  };
  
  console.log('✅ Form submission handler installed');
  
  // Also log any React errors
  window.addEventListener('error', (e) => {
    console.error('Global error:', e);
  });
  
  // Monitor fetch calls
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    console.log('Fetch called:', args[0]);
    return originalFetch.apply(this, args);
  };
  
} else {
  console.error('❌ No form found on page!');
}

// Check React
if (window.React) {
  console.log('React version:', window.React.version);
}

// Check for any disabled buttons
document.querySelectorAll('button').forEach((btn, i) => {
  console.log(`Button ${i}:`, {
    text: btn.textContent,
    disabled: btn.disabled,
    type: btn.type
  });
});

console.log('🔍 Debug script setup complete. Try logging in now.');

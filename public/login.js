const form = document.querySelector('#auth-form');
const statusMessage = document.querySelector('#auth-status');
const nameField = document.querySelector('#name-field');
const signupChoice = document.querySelector('#signup-choice');
const adminHint = document.querySelector('#admin-hint');
const submitLabel = document.querySelector('#submit-label');
let mode = new URLSearchParams(location.search).get('role') === 'admin' ? 'admin' : 'user';
let signingUp = false;

function setMode(nextMode) {
  mode = nextMode;
  signingUp = false;
  document.querySelectorAll('.auth-tab').forEach((tab) => {
    const active = tab.dataset.mode === mode;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-selected', String(active));
  });
  nameField.hidden = true;
  nameField.querySelector('input').required = false;
  signupChoice.hidden = mode === 'admin';
  adminHint.hidden = mode !== 'admin';
  submitLabel.innerHTML = 'Log in <span>↗</span>';
  form.querySelector('[name="password"]').autocomplete = 'current-password';
  statusMessage.textContent = '';
  statusMessage.className = 'form-status';
}

document.querySelectorAll('.auth-tab').forEach((tab) => tab.addEventListener('click', () => setMode(tab.dataset.mode)));
document.querySelector('#show-signup').addEventListener('click', () => {
  signingUp = true;
  nameField.hidden = false;
  nameField.querySelector('input').required = true;
  submitLabel.innerHTML = 'Create my account <span>↗</span>';
  form.querySelector('[name="password"]').autocomplete = 'new-password';
  statusMessage.textContent = '';
  statusMessage.className = 'form-status';
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  submitLabel.disabled = true;
  statusMessage.textContent = signingUp ? 'Creating your account…' : 'Logging in…';
  statusMessage.className = 'form-status';
  const fields = Object.fromEntries(new FormData(form).entries());
  const endpoint = signingUp ? '/api/auth/signup' : '/api/auth/login';
  const payload = signingUp ? fields : { email: fields.email, password: fields.password, role: mode };
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not log in. Please try again.');
    location.href = result.user.role === 'admin' ? '/admin' : '/#contact';
  } catch (error) {
    statusMessage.textContent = error.message || 'Could not log in. Please try again.';
    statusMessage.classList.add('error');
  } finally {
    submitLabel.disabled = false;
  }
});

setMode(mode);

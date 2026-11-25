const courseGrid = document.querySelector('#course-grid');
const internshipList = document.querySelector('#internship-list');
const searchInput = document.querySelector('#search-input');
const categoryFilter = document.querySelector('#category-filter');
const resultCount = document.querySelector('#result-count');
const form = document.querySelector('#application-form');
const formStatus = document.querySelector('#form-status');
const opportunityInput = document.querySelector('#opportunity-input');
const loginRequired = document.querySelector('#login-required');
const loginLink = document.querySelector('#user-login-link');
const adminLoginLink = document.querySelector('#admin-login-link');
const logoutButton = document.querySelector('#logout-button');
let currentUser = null;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

async function loadCourses() {
  try {
    const response = await fetch('/api/courses');
    if (!response.ok) throw new Error('Could not load courses.');
    const courses = await response.json();
    courseGrid.innerHTML = courses.map((course, index) => `
      <article class="course-card course-${index + 1}"><div class="card-top"><span class="course-icon">${escapeHtml(course.icon)}</span><span class="card-arrow">↗</span></div>
      <p class="course-category">${escapeHtml(course.category)} <span>·</span> ${escapeHtml(course.level)}</p><h3>${escapeHtml(course.title)}</h3><p class="card-description">${escapeHtml(course.description)}</p>
      <div class="card-bottom"><span>◷ &nbsp;${escapeHtml(course.duration)}</span><a href="#internships" aria-label="Explore opportunities after ${escapeHtml(course.title)}">Explore <span>→</span></a></div></article>`).join('');
  } catch (_error) { courseGrid.innerHTML = '<p class="error-message">Learning paths are unavailable right now. Check that the server is running, then refresh.</p>'; }
}

async function loadInternships() {
  const params = new URLSearchParams();
  if (searchInput.value.trim()) params.set('q', searchInput.value.trim());
  if (categoryFilter.value) params.set('category', categoryFilter.value);
  try {
    const response = await fetch(`/api/internships?${params}`);
    if (!response.ok) throw new Error('Could not load internships.');
    const internships = await response.json();
    resultCount.textContent = `${internships.length} ${internships.length === 1 ? 'opportunity' : 'opportunities'}`;
    if (!internships.length) { internshipList.innerHTML = '<div class="empty-state">No matches yet. Try a different search or choose “All areas”.</div>'; return; }
    internshipList.innerHTML = internships.map((item) => `
      <article class="internship-card"><div class="company-symbol">${escapeHtml(item.company.slice(0, 1))}</div><div class="internship-main"><div class="internship-title-row"><h3>${escapeHtml(item.title)}</h3><span class="internship-tag">${escapeHtml(item.tag)}</span></div><p class="company-name">${escapeHtml(item.company)}</p><p class="internship-description">${escapeHtml(item.description)}</p><div class="internship-meta"><span>⌖ &nbsp;${escapeHtml(item.location)}</span><span>◷ &nbsp;${escapeHtml(item.type)}</span><span>✳ &nbsp;${escapeHtml(item.category)}</span></div></div><button class="apply-button" type="button" data-opportunity="${escapeHtml(item.title)}">I’m interested <span>↗</span></button></article>`).join('');
    internshipList.querySelectorAll('.apply-button').forEach((button) => button.addEventListener('click', () => {
      opportunityInput.value = button.dataset.opportunity;
      document.querySelector('#contact').scrollIntoView({ behavior: 'smooth' });
      opportunityInput.focus({ preventScroll: true });
    }));
  } catch (_error) { internshipList.innerHTML = '<p class="error-message">Opportunities are unavailable right now. Check that the server is running, then refresh.</p>'; }
}

async function loadCategories() {
  try {
    const response = await fetch('/api/internships');
    if (!response.ok) return;
    const internships = await response.json();
    [...new Set(internships.map((item) => item.category))].sort().forEach((category) => {
      const option = document.createElement('option'); option.value = category; option.textContent = category; categoryFilter.append(option);
    });
  } catch (_error) { /* The list loader will show a helpful message if the API is down. */ }
}

async function loadCurrentUser() {
  try {
    const response = await fetch('/api/auth/me');
    if (!response.ok) throw new Error('Could not check the current login.');
    const result = await response.json();
    currentUser = result.user;
  } catch (_error) {
    currentUser = null;
  }
  const isLoggedIn = Boolean(currentUser);
  loginRequired.hidden = isLoggedIn;
  form.querySelectorAll('input, textarea, button').forEach((control) => { control.disabled = !isLoggedIn; });
  if (isLoggedIn) {
    form.elements.name.value = currentUser.name;
    form.elements.email.value = currentUser.email;
    loginLink.textContent = currentUser.role === 'admin' ? 'Admin dashboard' : currentUser.name;
    loginLink.href = currentUser.role === 'admin' ? '/admin' : '#contact';
    logoutButton.hidden = false;
    if (currentUser.role === 'admin') {
      form.querySelectorAll('input, textarea, button').forEach((control) => { control.disabled = true; });
      loginRequired.hidden = false;
      loginRequired.innerHTML = 'You are logged in as an admin. <a href="/admin">Open the admin dashboard ↗</a>';
    }
  } else {
    loginLink.textContent = 'Log in';
    loginLink.href = '/login';
    logoutButton.hidden = true;
  }
}

let searchTimer;
searchInput.addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(loadInternships, 180); });
categoryFilter.addEventListener('change', loadInternships);
form.addEventListener('submit', async (event) => {
  event.preventDefault(); formStatus.textContent = 'Sending…'; formStatus.className = 'form-status';
  const fields = { opportunity: opportunityInput.value, message: form.elements.message.value };
  try {
    const response = await fetch('/api/applications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fields) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Please check your details and try again.');
    form.reset(); formStatus.textContent = result.message; formStatus.classList.add('success');
  } catch (error) { formStatus.textContent = error.message || 'Could not send your interest. Please try again.'; formStatus.classList.add('error'); }
});

logoutButton.addEventListener('click', async () => {
  await fetch('/api/auth/logout', { method: 'POST' });
  location.reload();
});

loadCurrentUser();
loadCourses();
loadCategories().then(loadInternships);

const htmlEscape = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[character]);

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers }
  });
  const result = response.status === 204 ? {} : await response.json();
  if (response.status === 401) {
    location.href = '/login?role=admin';
    throw new Error('Please log in as an admin.');
  }
  if (!response.ok) throw new Error(result.error || 'The request could not be completed.');
  return result;
}

function showError(container, error) {
  container.innerHTML = `<p class="error-message">${htmlEscape(error.message)}</p>`;
}

async function loadListings(type, container) {
  try {
    const items = await request(`/api/admin/${type}`);
    container.innerHTML = items.map((item) => `
      <article class="admin-list-row"><div><strong>${htmlEscape(item.title)}</strong><span>${htmlEscape(type === 'courses' ? `${item.category} · ${item.level}` : `${item.company} · ${item.category} · ${item.location}`)}</span></div>
      <button class="delete-button" type="button" data-id="${htmlEscape(item.id)}" aria-label="Delete ${htmlEscape(item.title)}">Remove</button></article>`).join('') || '<p class="admin-empty">Nothing added yet.</p>';
    container.querySelectorAll('.delete-button').forEach((button) => button.addEventListener('click', async () => {
      if (!confirm('Remove this listing?')) return;
      try {
        await request(`/api/admin/${type}/${encodeURIComponent(button.dataset.id)}`, { method: 'DELETE' });
        await loadListings(type, container);
      } catch (error) { showError(container, error); }
    }));
  } catch (error) { showError(container, error); }
}

async function loadApplications() {
  const container = document.querySelector('#application-admin-list');
  try {
    const items = await request('/api/admin/applications');
    container.innerHTML = items.slice().reverse().map((item) => `
      <article class="application-admin-card"><div class="application-admin-top"><strong>${htmlEscape(item.name)}</strong><time>${htmlEscape(new Date(item.submittedAt).toLocaleString())}</time></div>
      <a href="mailto:${encodeURIComponent(item.email)}">${htmlEscape(item.email)}</a><p><strong>Interested in:</strong> ${htmlEscape(item.opportunity)}</p>
      ${item.message ? `<p>${htmlEscape(item.message)}</p>` : ''}</article>`).join('') || '<p class="admin-empty">No applications have been received yet.</p>';
  } catch (error) { showError(container, error); }
}

async function addListing(type, form) {
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  try {
    await request(`/api/admin/${type}`, {
      method: 'POST',
      body: JSON.stringify(Object.fromEntries(new FormData(form).entries()))
    });
    form.reset();
    await loadListings(type, document.querySelector(type === 'courses' ? '#course-admin-list' : '#internship-admin-list'));
  } catch (error) {
    alert(error.message);
  } finally {
    button.disabled = false;
  }
}

async function initialize() {
  try {
    const { user } = await request('/api/auth/me');
    if (!user || user.role !== 'admin') {
      location.href = '/login?role=admin';
      return;
    }
    document.querySelector('#admin-email').textContent = user.email;
  } catch { return; }
  loadListings('internships', document.querySelector('#internship-admin-list'));
  loadListings('courses', document.querySelector('#course-admin-list'));
  loadApplications();
}

document.querySelector('#internship-form').addEventListener('submit', (event) => {
  event.preventDefault();
  addListing('internships', event.currentTarget);
});
document.querySelector('#course-form').addEventListener('submit', (event) => {
  event.preventDefault();
  addListing('courses', event.currentTarget);
});
document.querySelector('#refresh-applications').addEventListener('click', loadApplications);
document.querySelector('#logout-button').addEventListener('click', async () => {
  await fetch('/api/auth/logout', { method: 'POST' });
  location.href = '/';
});

initialize();

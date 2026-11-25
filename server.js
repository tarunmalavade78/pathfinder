const express = require('express');
require('dotenv').config();
const path = require('path');
const fs = require('fs/promises');
const { promisify } = require('util');
const { randomBytes, scrypt: scryptCallback, timingSafeEqual } = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const scrypt = promisify(scryptCallback);
const sessions = new Map();
const SESSION_TTL = 7 * 24 * 60 * 60 * 1000;

const dataPath = (name) => path.join(DATA_DIR, name);
const readJson = async (name) => JSON.parse(await fs.readFile(dataPath(name), 'utf8'));
const writeJson = async (name, value) => {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(dataPath(name), `${JSON.stringify(value, null, 2)}\n`);
};

function getSession(req) {
  const cookie = req.headers.cookie || '';
  const token = cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith('pathfinder_session='))?.slice('pathfinder_session='.length);
  if (!token) return null;
  const session = sessions.get(token);
  if (!session || session.expiresAt < Date.now()) {
    sessions.delete(token);
    return null;
  }
  session.expiresAt = Date.now() + SESSION_TTL;
  return { token, ...session };
}

function setSessionCookie(res, token) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `pathfinder_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_TTL / 1000}${secure}`);
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', 'pathfinder_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');
}

function requireRole(role) {
  return (req, res, next) => {
    const session = getSession(req);
    if (!session) return res.status(401).json({ error: 'Please log in to continue.' });
    if (session.role !== role) return res.status(403).json({ error: 'You do not have permission to do that.' });
    req.session = session;
    next();
  };
}

function validateListing(type, body) {
  const required = type === 'courses'
    ? ['title', 'category', 'level', 'duration', 'description', 'icon']
    : ['title', 'company', 'category', 'location', 'type', 'description', 'tag'];
  return required.every((key) => typeof body[key] === 'string' && body[key].trim() && body[key].length <= 500);
}

app.use(express.json({ limit: '20kb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/login', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/admin', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

app.get('/api/health', (_req, res) => res.json({ ok: true, message: 'Youth Opportunity Hub API is running.' }));
app.get('/api/auth/me', (req, res) => {
  const session = getSession(req);
  res.json({ user: session ? { name: session.name, email: session.email, role: session.role } : null });
});

app.post('/api/auth/signup', async (req, res, next) => {
  try {
    const { name, email, password } = req.body || {};
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 100 ||
        typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
        typeof password !== 'string' || password.length < 8 || password.length > 200) {
      return res.status(400).json({ error: 'Enter your name, a valid email, and a password of at least 8 characters.' });
    }
    const users = await readJson('users.json').catch((error) => {
      if (error.code === 'ENOENT') return [];
      throw error;
    });
    const normalizedEmail = email.trim().toLowerCase();
    if (users.some((user) => user.email === normalizedEmail)) {
      return res.status(409).json({ error: 'An account with that email already exists. Please log in.' });
    }
    const salt = randomBytes(16).toString('hex');
    const passwordHash = (await scrypt(password, salt, 64)).toString('hex');
    const user = { id: randomBytes(12).toString('hex'), name: name.trim(), email: normalizedEmail, salt, passwordHash };
    users.push(user);
    await writeJson('users.json', users);
    const token = randomBytes(32).toString('hex');
    sessions.set(token, { id: user.id, name: user.name, email: user.email, role: 'user', expiresAt: Date.now() + SESSION_TTL });
    setSessionCookie(res, token);
    res.status(201).json({ user: { name: user.name, email: user.email, role: 'user' } });
  } catch (error) { next(error); }
});

app.post('/api/auth/login', async (req, res, next) => {
  try {
    const { email, password, role } = req.body || {};
    if (typeof email !== 'string' || typeof password !== 'string' || !['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Enter your email, password, and account type.' });
    }
    const normalizedEmail = email.trim().toLowerCase();
    if (role === 'admin') {
      const adminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
      const adminPassword = process.env.ADMIN_PASSWORD || '';
      if (normalizedEmail !== adminEmail || password !== adminPassword) {
        return res.status(401).json({ error: 'The admin email or password is incorrect.' });
      }
      const token = randomBytes(32).toString('hex');
      sessions.set(token, { id: 'admin', name: 'Admin', email: adminEmail, role: 'admin', expiresAt: Date.now() + SESSION_TTL });
      setSessionCookie(res, token);
      return res.json({ user: { name: 'Admin', email: adminEmail, role: 'admin' } });
    }
    const users = await readJson('users.json').catch((error) => {
      if (error.code === 'ENOENT') return [];
      throw error;
    });
    const user = users.find((item) => item.email === normalizedEmail);
    if (!user || !timingSafeEqual(Buffer.from(user.passwordHash, 'hex'), Buffer.from(await scrypt(password, user.salt, 64)))) {
      return res.status(401).json({ error: 'The email or password is incorrect.' });
    }
    const token = randomBytes(32).toString('hex');
    sessions.set(token, { id: user.id, name: user.name, email: user.email, role: 'user', expiresAt: Date.now() + SESSION_TTL });
    setSessionCookie(res, token);
    res.json({ user: { name: user.name, email: user.email, role: 'user' } });
  } catch (error) { next(error); }
});

app.post('/api/auth/logout', (req, res) => {
  const session = getSession(req);
  if (session) sessions.delete(session.token);
  clearSessionCookie(res);
  res.json({ ok: true });
});

app.get('/api/courses', async (_req, res, next) => {
  try { res.json(await readJson('courses.json')); } catch (error) { next(error); }
});
app.get('/api/internships', async (req, res, next) => {
  try {
    const items = await readJson('internships.json');
    const q = String(req.query.q || '').trim().toLowerCase();
    const category = String(req.query.category || '').trim().toLowerCase();
    res.json(items.filter((item) => {
      const matchesText = !q || `${item.title} ${item.company} ${item.location} ${item.category}`.toLowerCase().includes(q);
      return matchesText && (!category || item.category.toLowerCase() === category);
    }));
  } catch (error) { next(error); }
});

app.post('/api/applications', requireRole('user'), async (req, res, next) => {
  try {
    const { opportunity, message = '' } = req.body || {};
    if (typeof opportunity !== 'string' || !opportunity.trim()) {
      return res.status(400).json({ error: 'Please choose an opportunity.' });
    }
    if (opportunity.length > 150 || typeof message !== 'string' || message.length > 1000) {
      return res.status(400).json({ error: 'One or more fields are too long.' });
    }
    const submissions = await readJson('submissions.json').catch((error) => {
      if (error.code === 'ENOENT') return [];
      throw error;
    });
    const submission = {
      id: randomBytes(12).toString('hex'),
      name: req.session.name,
      email: req.session.email,
      opportunity: opportunity.trim(),
      message: message.trim(),
      submittedAt: new Date().toISOString()
    };
    submissions.push(submission);
    await writeJson('submissions.json', submissions);
    res.status(201).json({ message: 'Your application was saved. Thanks for reaching out!', submission: { id: submission.id } });
  } catch (error) { next(error); }
});

app.get('/api/admin/applications', requireRole('admin'), async (_req, res, next) => {
  try { res.json(await readJson('submissions.json')); } catch (error) { next(error); }
});

for (const type of ['courses', 'internships']) {
  app.get(`/api/admin/${type}`, requireRole('admin'), async (_req, res, next) => {
    try { res.json(await readJson(`${type}.json`)); } catch (error) { next(error); }
  });
  app.post(`/api/admin/${type}`, requireRole('admin'), async (req, res, next) => {
    try {
      if (!validateListing(type, req.body || {})) return res.status(400).json({ error: 'Complete each field using 500 characters or fewer.' });
      const items = await readJson(`${type}.json`);
      const item = { id: Math.max(0, ...items.map((entry) => Number(entry.id) || 0)) + 1 };
      for (const [key, value] of Object.entries(req.body)) item[key] = value.trim();
      items.push(item);
      await writeJson(`${type}.json`, items);
      res.status(201).json(item);
    } catch (error) { next(error); }
  });
  app.delete(`/api/admin/${type}/:id`, requireRole('admin'), async (req, res, next) => {
    try {
      const items = await readJson(`${type}.json`);
      const updated = items.filter((item) => String(item.id) !== req.params.id);
      if (updated.length === items.length) return res.status(404).json({ error: 'Listing not found.' });
      await writeJson(`${type}.json`, updated);
      res.json({ ok: true });
    } catch (error) { next(error); }
  });
}

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

app.listen(PORT, () => {
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
    console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD in .env before starting the server.');
    process.exit(1);
  }
  console.log(`Youth Opportunity Hub is ready at http://localhost:${PORT}`);
});

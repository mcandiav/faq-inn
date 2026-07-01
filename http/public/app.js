const apiBase = window.DFAQ_API_URL || '/api';

const state = { user: null, faqs: [] };

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

async function api(path, options = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
    ...options,
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const error = new Error(data?.error || `HTTP ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

function showLogin() {
  $('#app').classList.add('hidden');
  $('#login-screen').classList.remove('hidden');
}

function showApp() {
  $('#login-screen').classList.add('hidden');
  $('#app').classList.remove('hidden');
}

function setView(name) {
  $$('.view').forEach((el) => el.classList.add('hidden'));
  $(`#view-${name}`)?.classList.remove('hidden');
}

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('es-CL');
}

function truncate(text, max = 80) {
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function renderHeader() {
  const user = state.user;
  const isAdmin = user?.role === 'admin_global';
  const business =
    user?.tenant?.name?.trim() ||
    (isAdmin ? 'Administración global' : 'Mi negocio');

  $('#business-name').textContent = business;
  $('#user-email').textContent = user?.email || '';
  $('#nav-admin').classList.toggle('hidden', !isAdmin);

  const businessInput = $('#profile-business');
  if (user?.role === 'client') {
    businessInput.disabled = false;
    businessInput.value = user?.tenant?.name || '';
  } else {
    businessInput.disabled = true;
    businessInput.value = '';
  }

  $('#profile-email').value = user?.email || '';
}

function renderFaqs() {
  const tbody = $('#faq-tbody');
  tbody.innerHTML = '';

  if (state.user?.role === 'admin_global') {
    $('#btn-new-faq').classList.add('hidden');
    $('#dashboard-hint').textContent =
      'Como administrador, crea posadas en Admin. Los clientes editan sus FAQs.';
    return;
  }

  $('#btn-new-faq').classList.remove('hidden');
  $('#dashboard-hint').textContent =
    'Al guardar, cada FAQ se indexa de inmediato en Qdrant.';

  if (state.faqs.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" class="empty">Sin FAQs. Crea la primera.</td></tr>';
    return;
  }

  for (const faq of state.faqs) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(truncate(faq.question, 60))}</td>
      <td>${escapeHtml(truncate(faq.answer, 80))}</td>
      <td>${escapeHtml(faq.category || '—')}</td>
      <td>${faq.active ? '<span class="pill ok">Activa</span>' : '<span class="pill off">Inactiva</span>'}</td>
      <td>${faq.indexed_at ? '<span class="pill ok">Indexada</span>' : '<span class="pill warn">Pendiente</span>'}</td>
      <td><button type="button" class="btn small" data-edit="${faq.id}">Editar</button></td>
    `;
    tbody.appendChild(tr);
  }

  tbody.querySelectorAll('[data-edit]').forEach((btn) => {
    btn.addEventListener('click', () => openFaqDialog(Number(btn.dataset.edit)));
  });
}

function renderAdminTenants(tenants) {
  const tbody = $('#admin-tbody');
  tbody.innerHTML = '';

  if (!tenants.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty">Sin posadas.</td></tr>';
    return;
  }

  for (const t of tenants) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><code>${escapeHtml(t.slug)}</code></td>
      <td>${escapeHtml(t.name || '—')}</td>
      <td>${escapeHtml(t.client_email || '—')}</td>
      <td>${escapeHtml(t.agent_slug || '—')}</td>
    `;
    tbody.appendChild(tr);
  }
}

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

async function loadSession() {
  try {
    const data = await api('/auth/me');
    state.user = data.user;
    showApp();
    renderHeader();
    setView('dashboard');
    await refreshFaqs();
    if (state.user.role === 'admin_global') {
      await refreshAdmin();
    }
  } catch {
    showLogin();
  }
}

async function refreshFaqs() {
  if (state.user?.role !== 'client') {
    state.faqs = [];
    renderFaqs();
    return;
  }

  const data = await api('/faqs');
  state.faqs = data.faqs;
  renderFaqs();
}

async function refreshAdmin() {
  const data = await api('/admin/tenants');
  renderAdminTenants(data.tenants);
}

function openFaqDialog(id) {
  const dialog = $('#faq-dialog');
  const faq = state.faqs.find((f) => f.id === id);

  $('#faq-dialog-title').textContent = id ? 'Editar FAQ' : 'Nueva FAQ';
  $('#faq-id').value = id || '';
  $('#faq-question').value = faq?.question || '';
  $('#faq-answer').value = faq?.answer || '';
  $('#faq-category').value = faq?.category || '';
  $('#faq-keywords').value = faq?.keywords || '';
  $('#faq-active').checked = faq ? Boolean(faq.active) : true;
  $('#faq-msg').textContent = '';
  dialog.showModal();
}

$('#login-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const msg = $('#login-msg');
  msg.textContent = '';
  msg.className = 'form-msg';

  try {
    const data = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: $('#login-email').value.trim(),
        password: $('#login-password').value,
      }),
    });
    state.user = data.user;
    showApp();
    renderHeader();
    setView('dashboard');
    await refreshFaqs();
    if (state.user.role === 'admin_global') {
      await refreshAdmin();
    }
  } catch (error) {
    msg.textContent = error.message;
    msg.classList.add('error');
  }
});

$('#btn-logout').addEventListener('click', async () => {
  try {
    await api('/auth/logout', { method: 'POST' });
  } catch {
    /* ignore */
  }
  state.user = null;
  state.faqs = [];
  showLogin();
});

$$('[data-view]').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const view = btn.dataset.view;
    setView(view);
    if (view === 'dashboard') await refreshFaqs();
    if (view === 'admin') await refreshAdmin();
  });
});

$('#btn-new-faq').addEventListener('click', () => openFaqDialog(null));

$('#faq-cancel').addEventListener('click', () => $('#faq-dialog').close());

$('#faq-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const msg = $('#faq-msg');
  const saveBtn = $('#faq-save');
  msg.textContent = 'Guardando e indexando…';
  msg.className = 'form-msg';
  saveBtn.disabled = true;

  const payload = {
    question: $('#faq-question').value.trim(),
    answer: $('#faq-answer').value.trim(),
    category: $('#faq-category').value.trim(),
    keywords: $('#faq-keywords').value.trim(),
    active: $('#faq-active').checked,
  };

  const id = $('#faq-id').value;

  try {
    if (id) {
      await api(`/faqs/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
    } else {
      await api('/faqs', { method: 'POST', body: JSON.stringify(payload) });
    }
    $('#faq-dialog').close();
    await refreshFaqs();
  } catch (error) {
    msg.textContent = error.message;
    msg.classList.add('error');
  } finally {
    saveBtn.disabled = false;
  }
});

$('#profile-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const msg = $('#profile-msg');
  msg.textContent = '';
  msg.className = 'form-msg';

  const body = {};
  if (state.user?.role === 'client') {
    body.business_name = $('#profile-business').value.trim();
  }
  const current = $('#profile-current-password').value;
  const next = $('#profile-new-password').value;
  if (next) {
    body.current_password = current;
    body.new_password = next;
  }

  try {
    const data = await api('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    state.user = data.user;
    renderHeader();
    msg.textContent = 'Cambios guardados.';
    msg.classList.add('ok');
    $('#profile-current-password').value = '';
    $('#profile-new-password').value = '';
  } catch (error) {
    msg.textContent = error.message;
    msg.classList.add('error');
  }
});

$('#admin-tenant-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const msg = $('#admin-msg');
  msg.textContent = '';
  msg.className = 'form-msg';

  try {
    await api('/admin/tenants', {
      method: 'POST',
      body: JSON.stringify({
        slug: $('#admin-slug').value.trim(),
        email: $('#admin-email').value.trim(),
        password: $('#admin-password').value,
        agent_slug: $('#admin-agent-slug').value.trim() || undefined,
      }),
    });
    msg.textContent = 'Posada creada. El cliente puede ingresar con su email.';
    msg.classList.add('ok');
    $('#admin-tenant-form').reset();
    await refreshAdmin();
  } catch (error) {
    msg.textContent = error.message;
    msg.classList.add('error');
  }
});

loadSession();

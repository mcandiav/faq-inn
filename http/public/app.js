const APP_VERSION = '2.2.1';
const apiBase = window.DFAQ_API_URL || '/api';

const state = { user: null, faqs: [], unanswered: [] };

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function versionLabel(gitCommit) {
  const base = `DFAQ v${APP_VERSION}`;
  const hash = gitCommit?.trim();
  if (hash && hash !== 'unknown') {
    return `${base} @${hash}`;
  }
  return base;
}

function applyAppVersion(gitCommit) {
  const label = versionLabel(gitCommit);
  document.title = label;
  $$('[data-app-version]').forEach((el) => {
    el.textContent = label;
  });
}

async function loadDeployVersion() {
  try {
    const response = await fetch(`${apiBase}/health`, {
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      applyAppVersion();
      return;
    }
    const data = await response.json();
    applyAppVersion(data.git?.commit);
  } catch {
    applyAppVersion();
  }
}

async function api(path, options = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
      ...(options.body && !(options.body instanceof FormData)
        ? { 'Content-Type': 'application/json' }
        : {}),
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

async function apiUpload(path, formData) {
  return api(path, { method: 'POST', body: formData });
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
  $('#nav-unanswered').classList.toggle('hidden', isAdmin);

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
  const clientActions = $('#faq-client-actions');
  const replaceWrap = $('#import-replace-wrap');
  tbody.innerHTML = '';

  if (state.user?.role === 'admin_global') {
    clientActions.classList.add('hidden');
    replaceWrap.classList.add('hidden');
    $('#faq-count').textContent = '';
    $('#dashboard-hint').textContent =
      'Como administrador, crea posadas en Admin. Los clientes editan sus FAQs.';
    tbody.innerHTML =
      '<tr><td colspan="6" class="empty">Sin FAQs en esta vista.</td></tr>';
    return;
  }

  clientActions.classList.remove('hidden');
  replaceWrap.classList.remove('hidden');
  $('#dashboard-hint').textContent =
    'Columna A: pregunta, columna B: respuesta. Formatos: .xlsx, .xls, .csv. Al guardar o importar, cada FAQ se indexa en Qdrant.';

  const total = state.faqs.length;
  $('#faq-count').textContent = total
    ? `${total} FAQ${total === 1 ? '' : 's'} en total`
    : 'Sin FAQs todavía';

  if (total === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" class="empty">Sin FAQs. Importa un Excel o crea la primera.</td></tr>';
    return;
  }

  state.faqs.forEach((faq, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="num">${index + 1}</td>
      <td class="cell-text" title="${escapeAttr(faq.question)}">${escapeHtml(faq.question)}</td>
      <td class="cell-text" title="${escapeAttr(faq.answer)}">${escapeHtml(faq.answer)}</td>
      <td>${faq.active ? '<span class="pill ok">Activa</span>' : '<span class="pill off">Inactiva</span>'}</td>
      <td>${faq.indexed_at ? '<span class="pill ok">Indexada</span>' : '<span class="pill warn">Pendiente</span>'}</td>
      <td class="row-actions">
        <button type="button" class="btn small" data-edit="${faq.id}">Editar</button>
        <button type="button" class="btn small danger" data-delete="${faq.id}">Eliminar</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('[data-edit]').forEach((btn) => {
    btn.addEventListener('click', () => openFaqDialog(Number(btn.dataset.edit)));
  });

  tbody.querySelectorAll('[data-delete]').forEach((btn) => {
    btn.addEventListener('click', () => deleteFaq(Number(btn.dataset.delete)));
  });
}

function statusLabel(status) {
  const map = {
    pending: ['Pendiente', 'warn'],
    converted_to_faq: ['Convertida', 'ok'],
    ignored: ['Ignorada', 'off'],
    duplicate: ['Duplicada', 'off'],
    resolved_manually: ['Resuelta', 'ok'],
  };
  const [label, kind] = map[status] || [status, 'off'];
  return `<span class="pill ${kind}">${label}</span>`;
}

function renderUnanswered() {
  const list = $('#unanswered-list');
  list.innerHTML = '';

  if (state.user?.role !== 'client') {
    $('#unanswered-count').textContent = '';
    list.innerHTML = '<p class="empty-block">Vista solo para clientes.</p>';
    return;
  }

  const items = state.unanswered;
  const pending = items.filter((item) => item.status === 'pending').length;
  const badge = $('#unanswered-badge');

  if (pending > 0) {
    badge.textContent = String(pending);
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }

  $('#unanswered-count').textContent = items.length
    ? `${items.length} registro(s) — ${pending} pendiente(s)`
    : 'Sin registros con este filtro';

  if (!items.length) {
    list.innerHTML =
      '<p class="empty-block">No hay preguntas sin respuesta con este filtro.</p>';
    return;
  }

  items.forEach((item) => {
    const card = document.createElement('article');
    card.className = `unanswered-card${item.status === 'pending' ? ' is-pending' : ''}`;
    card.dataset.id = String(item.id);

    const suggested = item.suggested_faq_question
      ? escapeHtml(item.suggested_faq_question)
      : item.suggested_faq_id
        ? `<code>${escapeHtml(item.suggested_faq_id)}</code>`
        : '';

    const metaParts = [
      formatDate(item.created_at),
      item.contact_name || item.remote_id || null,
      item.score != null ? `score ${Number(item.score).toFixed(3)}` : null,
    ].filter(Boolean);

    let body = `
      <div class="unanswered-card-head">
        <p class="unanswered-question">${escapeHtml(item.question)}</p>
        ${statusLabel(item.status)}
      </div>
      <p class="unanswered-meta">${metaParts.map(escapeHtml).join(' · ')}</p>
    `;

    if (suggested) {
      body += `<p class="unanswered-suggested"><span>FAQ sugerida:</span> ${suggested}</p>`;
    }

    if (item.status === 'pending') {
      body += `
        <label class="unanswered-answer-label">
          Tu respuesta
          <textarea
            class="unanswered-answer"
            rows="3"
            placeholder="Escribe aquí la respuesta que debe dar el agente…"
            data-answer-for="${item.id}"
          ></textarea>
        </label>
        <div class="unanswered-actions">
          <button type="button" class="btn primary" data-respond="${item.id}">Responderla</button>
          <button type="button" class="btn ghost" data-ignore="${item.id}">Ignorar</button>
        </div>
        <p class="form-msg unanswered-row-msg" data-msg-for="${item.id}"></p>
      `;
    }

    card.innerHTML = body;
    list.appendChild(card);
  });

  list.querySelectorAll('[data-respond]').forEach((btn) => {
    btn.addEventListener('click', () => respondUnanswered(Number(btn.dataset.respond)));
  });

  list.querySelectorAll('[data-ignore]').forEach((btn) => {
    btn.addEventListener('click', () => ignoreUnanswered(Number(btn.dataset.ignore)));
  });
}

async function respondUnanswered(id) {
  const item = state.unanswered.find((row) => row.id === id);
  if (!item) {
    return;
  }

  const textarea = document.querySelector(`[data-answer-for="${id}"]`);
  const rowMsg = document.querySelector(`[data-msg-for="${id}"]`);
  const answer = textarea?.value.trim() || '';

  if (!answer) {
    if (rowMsg) {
      rowMsg.textContent = 'Escribe una respuesta antes de guardar.';
      rowMsg.className = 'form-msg error unanswered-row-msg';
    }
    textarea?.focus();
    return;
  }

  const btn = document.querySelector(`[data-respond="${id}"]`);
  if (btn) {
    btn.disabled = true;
  }
  if (rowMsg) {
    rowMsg.textContent = 'Guardando FAQ e indexando en Qdrant…';
    rowMsg.className = 'form-msg unanswered-row-msg';
  }

  try {
    await api(`/unanswered/${id}/convert`, {
      method: 'POST',
      body: JSON.stringify({
        question: item.question,
        answer,
      }),
    });

    const listMsg = $('#unanswered-msg');
    listMsg.textContent = 'Respuesta guardada e indexada en Qdrant.';
    listMsg.className = 'form-msg ok';

    await refreshUnanswered();
    await refreshFaqs();
  } catch (error) {
    if (rowMsg) {
      rowMsg.textContent = error.message;
      rowMsg.className = 'form-msg error unanswered-row-msg';
    }
    if (btn) {
      btn.disabled = false;
    }
  }
}

async function refreshUnanswered() {
  if (state.user?.role !== 'client') {
    state.unanswered = [];
    renderUnanswered();
    return;
  }

  const status = $('#unanswered-filter')?.value || '';
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  const data = await api(`/unanswered${query}`);
  state.unanswered = data.items || [];
  renderUnanswered();
}

async function ignoreUnanswered(id) {
  const item = state.unanswered.find((row) => row.id === id);
  if (!item) {
    return;
  }

  const ok = window.confirm(
    `¿Ignorar esta pregunta?\n\n"${truncate(item.question, 80)}"`
  );
  if (!ok) {
    return;
  }

  const msg = $('#unanswered-msg');
  msg.textContent = 'Actualizando…';
  msg.className = 'form-msg';

  try {
    await api(`/unanswered/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'ignored' }),
    });
    msg.textContent = 'Pregunta ignorada.';
    msg.classList.add('ok');
    await refreshUnanswered();
  } catch (error) {
    msg.textContent = error.message;
    msg.classList.add('error');
  }
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

function escapeAttr(text) {
  return escapeHtml(text).replaceAll("'", '&#39;');
}

async function loadSession() {
  try {
    const data = await api('/auth/me');
    state.user = data.user;
    showApp();
    renderHeader();
    setView('dashboard');
    await refreshFaqs();
    if (state.user.role === 'client') {
      await refreshUnanswered();
    }
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

async function importFaqsFromFile(file) {
  const msg = $('#import-msg');
  msg.textContent = 'Importando e indexando… puede tardar unos segundos.';
  msg.className = 'form-msg';

  const formData = new FormData();
  formData.append('file', file);
  if ($('#import-replace').checked) {
    formData.append('replace', 'true');
  }

  try {
    const data = await apiUpload('/faqs/import', formData);
    const imp = data.import || {};
    let text = data.message || 'Importación completada.';

    if (imp.deleted) {
      text += ` (${imp.deleted} eliminadas antes de importar)`;
    }
    if (imp.errors?.length) {
      text += ` — ${imp.errors.length} fila(s) con error.`;
    }

    msg.textContent = text;
    msg.classList.add(imp.errors?.length ? 'warn' : 'ok');
    await refreshFaqs();
  } catch (error) {
    msg.textContent = error.message;
    msg.classList.add('error');
  }
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
  $('#faq-delete').classList.toggle('hidden', !id);
  dialog.showModal();
}

async function deleteFaq(id) {
  const faqId = Number(id);
  const faq = state.faqs.find((f) => Number(f.id) === faqId);
  if (!faq) {
    window.alert('No se encontró la FAQ en la lista. Recarga la página e intenta de nuevo.');
    return;
  }

  const preview = truncate(faq.question, 80);
  const ok = window.confirm(
    `¿Eliminar esta FAQ?\n\n"${preview}"\n\nSe borrará de la base de datos y de Qdrant.`
  );
  if (!ok) {
    return;
  }

  const msg = $('#import-msg');
  msg.textContent = 'Eliminando…';
  msg.className = 'form-msg';

  try {
    const data = await api(`/faqs/${faqId}`, { method: 'DELETE' });
    if ($('#faq-dialog').open && Number($('#faq-id').value) === faqId) {
      $('#faq-dialog').close();
    }
    await refreshFaqs();
    msg.textContent = data.warning || 'FAQ eliminada.';
    msg.className = data.warning ? 'form-msg warn' : 'form-msg ok';
  } catch (error) {
    msg.textContent = error.message;
    msg.classList.add('error');
    window.alert(error.message);
  }
}

async function reindexFaqs() {
  const total = state.faqs.length;
  const ok = window.confirm(
    total
      ? `¿Sincronizar Qdrant con las ${total} FAQ(s) actuales?\n\nSe borrarán puntos huérfanos en Qdrant y se reindexará todo.`
      : '¿Limpiar Qdrant? No hay FAQs en MariaDB; se eliminarán todos los puntos del tenant.'
  );
  if (!ok) {
    return;
  }

  const msg = $('#import-msg');
  const btn = $('#btn-reindex-faqs');
  msg.textContent = 'Sincronizando Qdrant… puede tardar unos segundos.';
  msg.className = 'form-msg';
  btn.disabled = true;

  try {
    const data = await api('/faqs/reindex', { method: 'POST' });
    await refreshFaqs();
    msg.textContent = data.message || 'Qdrant sincronizado.';
    msg.classList.add('ok');
  } catch (error) {
    msg.textContent = error.message;
    msg.classList.add('error');
  } finally {
    btn.disabled = false;
  }
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
    if (state.user.role === 'client') {
      await refreshUnanswered();
    }
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
  state.unanswered = [];
  showLogin();
});

$$('[data-view]').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const view = btn.dataset.view;
    setView(view);
    if (view === 'dashboard') await refreshFaqs();
    if (view === 'unanswered') await refreshUnanswered();
    if (view === 'admin') await refreshAdmin();
  });
});

$('#btn-new-faq').addEventListener('click', () => openFaqDialog(null));

$('#btn-reindex-faqs').addEventListener('click', () => reindexFaqs());

$('#faq-import-file').addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file) {
    return;
  }
  await importFaqsFromFile(file);
});

$('#faq-cancel').addEventListener('click', () => $('#faq-dialog').close());

$('#faq-delete').addEventListener('click', async () => {
  const id = Number($('#faq-id').value);
  if (!id) {
    return;
  }
  await deleteFaq(id);
});

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

$('#unanswered-filter').addEventListener('change', () => refreshUnanswered());

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

loadDeployVersion();
loadSession();

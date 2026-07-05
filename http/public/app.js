const APP_VERSION = '1.5.0';
const APP_PRODUCT_NAME = 'FAQ Inn';
const apiBase = window.FAQ_INN_API_URL || window.DFAQ_API_URL || '/api';
const VIEW_STORAGE_KEY = 'faq-inn-current-view';
const VALID_VIEWS = ['dashboard', 'unanswered', 'profile', 'admin'];

const state = {
  user: null,
  account: null,
  adminTenants: [],
  faqs: [],
  unanswered: [],
  currentView: 'dashboard',
};
const appMeta = {
  productName: APP_PRODUCT_NAME,
  title: APP_PRODUCT_NAME,
  version: APP_VERSION,
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function versionLabel(gitCommit) {
  const base = `${appMeta.productName} v${appMeta.version}`;
  const hash = gitCommit?.trim();
  if (hash && hash !== 'unknown') {
    return `${base} @${hash}`;
  }
  return base;
}

function applyAppBranding() {
  const productEl = document.querySelector('.login-product');
  if (productEl) {
    productEl.textContent = appMeta.productName;
  }
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
      applyAppBranding();
      applyAppVersion();
      return;
    }
    const data = await response.json();
    if (data.app?.product_name) {
      appMeta.productName = data.app.product_name;
    }
    if (data.app?.version) {
      appMeta.version = data.app.version;
    }
    if (data.app?.title) {
      appMeta.title = data.app.title;
    }
    applyAppBranding();
    applyAppVersion(data.git?.commit);
  } catch {
    applyAppBranding();
    applyAppVersion();
  }
}

async function api(path, options = {}) {
  const { headers: optionHeaders, ...rest } = options;
  const response = await fetch(`${apiBase}${path}`, {
    credentials: 'same-origin',
    ...rest,
    headers: {
      Accept: 'application/json',
      ...(options.body && !(options.body instanceof FormData)
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...optionHeaders,
    },
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

function showLanding(tab = 'signup') {
  document.body.classList.remove('app-logged-in');
  $('#app').classList.add('hidden');
  $('#login-screen').classList.remove('hidden');
  setLandingTab(tab);
}

const whatsappState = {
  instanceName: '',
  pollTimer: null,
  startedAt: 0,
  pollIntervalSeconds: 3,
  timeoutSeconds: 180,
};

function clearWhatsappPoll() {
  if (whatsappState.pollTimer) {
    clearInterval(whatsappState.pollTimer);
    whatsappState.pollTimer = null;
  }
}

function hideLandingPanels() {
  $('#signup-form')?.classList.add('hidden');
  $('#provision-qr-panel')?.classList.add('hidden');
  $('#provision-success-panel')?.classList.add('hidden');
}

function setLandingTab(tab) {
  const signup = tab === 'signup';
  $('#login-form')?.classList.toggle('hidden', signup);
  setWhatsappFocus(false);
  document.querySelector('.landing-hero')?.classList.toggle('hidden', !signup);
  if (signup) {
    hideLandingPanels();
    $('#signup-form')?.classList.remove('hidden');
  } else {
    clearWhatsappPoll();
    hideLandingPanels();
    $('#signup-form')?.classList.add('hidden');
  }
}

function setWhatsappFocus(active) {
  $('#login-screen')?.classList.toggle('provision-focus', active);
  document.querySelector('.landing-hero')?.classList.toggle('hidden', active);
}

function showWhatsappQr(qrBase64, instanceName) {
  hideLandingPanels();
  setWhatsappFocus(true);
  const panel = $('#provision-qr-panel');
  panel?.classList.remove('hidden');
  const img = $('#provision-qr-image');
  const waiting = $('#provision-qr-waiting');
  const label = $('#provision-instance-label');
  if (label) {
    label.textContent = '';
    label.classList.add('hidden');
  }
  if (qrBase64 && img) {
    img.src = qrBase64;
    img.classList.remove('hidden');
    waiting?.classList.add('hidden');
  } else if (!img?.src || img.classList.contains('hidden')) {
    img?.classList.add('hidden');
    waiting?.classList.remove('hidden');
  }
  requestAnimationFrame(() => {
    panel?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

async function onWhatsappConnected(phoneNumber) {
  clearWhatsappPoll();
  hideLandingPanels();
  setWhatsappFocus(false);

  try {
    const data = await api('/auth/me');
    state.user = data.user;
  } catch {
    /* session cookie should still be valid */
  }

  showApp();
  renderHeader();
  await openView('profile');

  const msg = $('#profile-msg');
  if (msg) {
    const phone = phoneNumber
      ? `+${String(phoneNumber).replace(/^\+/, '')}`
      : '';
    msg.textContent = phone
      ? t('msg.whatsappConnectedPhone', { phone })
      : t('msg.whatsappConnected');
    msg.className = 'form-msg ok';
  }
}

async function pollWhatsappStatus() {
  const msg = $('#provision-qr-msg');
  if (!whatsappState.instanceName) {
    return;
  }

  const elapsed = (Date.now() - whatsappState.startedAt) / 1000;
  if (elapsed > whatsappState.timeoutSeconds) {
    clearWhatsappPoll();
    if (msg) {
      msg.textContent = t('msg.qrTimeout');
      msg.className = 'form-msg error';
    }
    return;
  }

  try {
    const data = await api(
      `/whatsapp/status/${encodeURIComponent(whatsappState.instanceName)}`
    );

    if (data.qr_base64) {
      showWhatsappQr(data.qr_base64, data.instance_name);
    }

    if (data.connection_status === 'connected') {
      await onWhatsappConnected(data.phone_number);
      return;
    }

    if (msg) {
      msg.textContent =
        data.message ||
        t('msg.qrWaiting', { seconds: Math.floor(elapsed) });
      msg.className = 'form-msg';
    }
  } catch (error) {
    if (msg) {
      msg.textContent = error.message;
      msg.className = 'form-msg error';
    }
  }
}

function startWhatsappPolling() {
  clearWhatsappPoll();
  whatsappState.startedAt = Date.now();
  const intervalMs = Math.max(1, whatsappState.pollIntervalSeconds) * 1000;
  whatsappState.pollTimer = setInterval(pollWhatsappStatus, intervalMs);
  pollWhatsappStatus();
}

async function startWhatsappConnect() {
  showWhatsappQr(null, '');
  const qrMsg = $('#provision-qr-msg');
  if (qrMsg) {
    qrMsg.textContent = t('msg.creatingWhatsapp');
    qrMsg.className = 'form-msg';
  }

  const data = await api('/whatsapp/connect', { method: 'POST' });

  whatsappState.instanceName = data.instance_name;
  whatsappState.pollIntervalSeconds =
    data.poll_interval_seconds || whatsappState.pollIntervalSeconds;
  whatsappState.timeoutSeconds =
    data.timeout_seconds || whatsappState.timeoutSeconds;

  if (data.connection_status === 'connected') {
    await onWhatsappConnected(data.phone_number);
    return;
  }

  showWhatsappQr(data.qr_base64, data.instance_name);
  startWhatsappPolling();
}

async function resumeWhatsappOnboarding(account) {
  showLanding('signup');
  hideLandingPanels();
  setWhatsappFocus(true);

  whatsappState.instanceName = account?.whatsapp?.instance_name || '';

  if (account?.whatsapp?.connection_status === 'connected') {
    return false;
  }

  if (account?.whatsapp?.qr_base64 && whatsappState.instanceName) {
    showWhatsappQr(account.whatsapp.qr_base64, whatsappState.instanceName);
    startWhatsappPolling();
    return true;
  }

  await startWhatsappConnect();
  return true;
}

async function ensureClientAppOrWhatsapp() {
  if (state.user?.role !== 'client') {
    return true;
  }

  try {
    const account = await api('/account/settings');
    state.account = account;
    if (account.whatsapp?.connection_status === 'connected') {
      return true;
    }
    await resumeWhatsappOnboarding(account);
    return false;
  } catch {
    return true;
  }
}

function showLogin() {
  showLanding('login');
}

function showApp() {
  $('#login-screen').classList.add('hidden');
  $('#app').classList.remove('hidden');
  document.body.classList.add('app-logged-in');
}

function updateNavActive(view) {
  $$('[data-view]').forEach((btn) => {
    if (!btn.dataset.view) {
      return;
    }
    btn.classList.toggle('active', btn.dataset.view === view);
  });
}

function resolveView(name) {
  const view = VALID_VIEWS.includes(name) ? name : 'dashboard';
  const user = state.user;
  if (!user) {
    return 'dashboard';
  }
  if (view === 'admin' && user.role !== 'admin_global') {
    return 'dashboard';
  }
  if (view === 'unanswered' && user.role !== 'client') {
    return 'dashboard';
  }
  return view;
}

function getRequestedView() {
  const fromHash = location.hash.replace(/^#/, '').trim();
  if (VALID_VIEWS.includes(fromHash)) {
    return fromHash;
  }
  try {
    const stored = sessionStorage.getItem(VIEW_STORAGE_KEY);
    if (VALID_VIEWS.includes(stored)) {
      return stored;
    }
  } catch {
    /* ignore */
  }
  return 'dashboard';
}

function rememberView(view) {
  try {
    sessionStorage.setItem(VIEW_STORAGE_KEY, view);
  } catch {
    /* ignore */
  }
}

function setView(name) {
  const view = resolveView(name);
  state.currentView = view;
  $$('.view').forEach((el) => el.classList.add('hidden'));
  $(`#view-${view}`)?.classList.remove('hidden');
  updateNavActive(view);
  rememberView(view);
}

async function refreshViewData(view) {
  if (view === 'dashboard') await refreshFaqs();
  if (view === 'unanswered') await refreshUnanswered();
  if (view === 'profile') await refreshProfile();
  if (view === 'admin') await refreshAdmin();
}

async function openView(name) {
  const view = resolveView(name);
  const hash = `#${view}`;
  setView(view);
  if (location.hash !== hash) {
    history.pushState({ view }, '', hash);
  }
  await refreshViewData(view);
}

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString(getLocale());
}

function statusPillActive(active) {
  return active
    ? `<span class="pill ok">${escapeHtml(t('status.active'))}</span>`
    : `<span class="pill off">${escapeHtml(t('status.inactive'))}</span>`;
}

function statusPillIndexed(indexed) {
  return indexed
    ? `<span class="pill ok">${escapeHtml(t('status.indexed'))}</span>`
    : `<span class="pill warn">${escapeHtml(t('status.pendingIndex'))}</span>`;
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
    (isAdmin ? t('profile.globalAdmin') : t('profile.myBusiness'));

  $('#business-name').textContent = business;
  $('#user-email').textContent = user?.email || '';
  $('#nav-admin').classList.toggle('hidden', !isAdmin);
  $('#nav-unanswered').classList.toggle('hidden', isAdmin);
  $('#bottom-nav-admin')?.classList.toggle('hidden', !isAdmin);
  $('#bottom-nav-unanswered')?.classList.toggle('hidden', isAdmin);

  renderProfile();
}

function renderProfile() {
  const user = state.user;
  const emailEl = $('#profile-email');
  const businessInput = $('#profile-business');
  const onboardHint = $('#profile-onboard-hint');

  if (!user || !emailEl || !businessInput) {
    return;
  }

  emailEl.disabled = false;
  emailEl.value = user.email || '';

  if (user.role === 'client') {
    const account = state.account;
    businessInput.disabled = false;
    businessInput.value =
      account?.tenant?.name || user.tenant?.name || '';
    businessInput.placeholder = t('profile.businessPlaceholder');

    const addressEl = $('#profile-address');
    const welcomeEl = $('#profile-welcome-message');
    const bookingEl = $('#profile-booking-url');
    const langEl = $('#profile-primary-language');

    if (addressEl) {
      addressEl.value = account?.settings?.address || '';
    }
    if (welcomeEl) {
      welcomeEl.value = account?.settings?.welcome_message || '';
    }
    if (bookingEl) {
      bookingEl.value = account?.settings?.booking_url_base || '';
    }
    if (langEl) {
      langEl.value = account?.settings?.primary_language || 'es';
    }

    onboardHint?.classList.remove('hidden');
  } else {
    businessInput.disabled = true;
    businessInput.value = t('profile.globalAdmin');
    onboardHint?.classList.add('hidden');
  }

  const currentPassword = $('#profile-current-password');
  const newPassword = $('#profile-new-password');
  const confirmPassword = $('#profile-confirm-password');
  const profileMsg = $('#profile-msg');
  if (currentPassword) currentPassword.value = '';
  if (newPassword) newPassword.value = '';
  if (confirmPassword) confirmPassword.value = '';
  if (profileMsg && !profileMsg.classList.contains('ok')) {
    profileMsg.textContent = '';
    profileMsg.className = 'form-msg';
  }
}

async function refreshProfile() {
  const user = state.user;
  if (!user) {
    return;
  }

  try {
    if (user.role === 'client') {
      const account = await api('/account/settings');
      state.account = account;
      if (account.tenant?.name && state.user.tenant) {
        state.user.tenant.name = account.tenant.name;
      }
    } else {
      const data = await api('/auth/me');
      state.user = data.user;
    }
    renderHeader();
  } catch {
    renderProfile();
  }
}

function attachFaqActions(root) {
  root.querySelectorAll('[data-edit]').forEach((btn) => {
    btn.addEventListener('click', () => openFaqDialog(Number(btn.dataset.edit)));
  });

  root.querySelectorAll('[data-delete]').forEach((btn) => {
    btn.addEventListener('click', () => deleteFaq(Number(btn.dataset.delete)));
  });
}

function faqCardHtml(faq, index) {
  return `
    <article class="faq-card" data-faq-id="${faq.id}">
      <div class="faq-card-head">
        <span class="faq-card-num">#${index + 1}</span>
        <div class="faq-card-badges">
          ${statusPillActive(faq.active)}
          ${statusPillIndexed(faq.indexed_at)}
        </div>
      </div>
      <p class="faq-card-label">${escapeHtml(t('table.question'))}</p>
      <p class="faq-card-text">${escapeHtml(faq.question)}</p>
      <p class="faq-card-label">${escapeHtml(t('table.answer'))}</p>
      <p class="faq-card-text">${escapeHtml(faq.answer)}</p>
      <div class="faq-card-actions row-actions">
        <button type="button" class="btn" data-edit="${faq.id}">${escapeHtml(t('btn.edit'))}</button>
        <button type="button" class="btn danger" data-delete="${faq.id}">${escapeHtml(t('btn.delete'))}</button>
      </div>
    </article>
  `;
}

function renderFaqs() {
  const tbody = $('#faq-tbody');
  const cards = $('#faq-cards');
  const clientActions = $('#faq-client-actions');
  const replaceWrap = $('#import-replace-wrap');
  tbody.innerHTML = '';
  if (cards) {
    cards.innerHTML = '';
  }

  if (state.user?.role === 'admin_global') {
    clientActions.classList.add('hidden');
    replaceWrap.classList.add('hidden');
    $('#faq-count').textContent = '';
    $('#dashboard-hint').textContent = t('dashboard.hintAdmin');
    tbody.innerHTML =
      `<tr><td colspan="6" class="empty">${escapeHtml(t('dashboard.emptyAdmin'))}</td></tr>`;
    if (cards) {
      cards.innerHTML = `<p class="empty-block">${escapeHtml(t('dashboard.emptyAdmin'))}</p>`;
    }
    return;
  }

  clientActions.classList.remove('hidden');
  replaceWrap.classList.remove('hidden');
  $('#dashboard-hint').textContent = t('dashboard.hint');

  const total = state.faqs.length;
  $('#faq-count').textContent = total
    ? total === 1
      ? t('dashboard.countOne')
      : t('dashboard.count', { n: total })
    : t('dashboard.none');

  if (total === 0) {
    const emptyText = escapeHtml(t('dashboard.empty'));
    tbody.innerHTML = `<tr><td colspan="6" class="empty">${emptyText}</td></tr>`;
    if (cards) {
      cards.innerHTML = `<p class="empty-block">${emptyText}</p>`;
    }
    return;
  }

  state.faqs.forEach((faq, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="num">${index + 1}</td>
      <td class="cell-text" title="${escapeAttr(faq.question)}">${escapeHtml(faq.question)}</td>
      <td class="cell-text" title="${escapeAttr(faq.answer)}">${escapeHtml(faq.answer)}</td>
      <td>${statusPillActive(faq.active)}</td>
      <td>${statusPillIndexed(faq.indexed_at)}</td>
      <td class="row-actions">
        <button type="button" class="btn small" data-edit="${faq.id}">${escapeHtml(t('btn.edit'))}</button>
        <button type="button" class="btn small danger" data-delete="${faq.id}">${escapeHtml(t('btn.delete'))}</button>
      </td>
    `;
    tbody.appendChild(tr);

    if (cards) {
      const card = document.createElement('div');
      card.innerHTML = faqCardHtml(faq, index);
      cards.appendChild(card.firstElementChild);
    }
  });

  attachFaqActions(tbody);
  if (cards) {
    attachFaqActions(cards);
  }
}

function statusLabel(status) {
  const map = {
    pending: ['status.pending', 'warn'],
    converted_to_faq: ['status.converted', 'ok'],
    ignored: ['status.ignored', 'off'],
    duplicate: ['status.duplicate', 'off'],
    resolved_manually: ['status.resolved', 'ok'],
  };
  const [key, kind] = map[status] || [status, 'off'];
  const label = typeof key === 'string' && key.startsWith('status.') ? t(key) : key;
  return `<span class="pill ${kind}">${escapeHtml(label)}</span>`;
}

function renderUnanswered() {
  const list = $('#unanswered-list');
  list.innerHTML = '';

  if (state.user?.role !== 'client') {
    $('#unanswered-count').textContent = '';
    list.innerHTML = `<p class="empty-block">${escapeHtml(t('unanswered.clientsOnly'))}</p>`;
    return;
  }

  const items = state.unanswered;
  const pending = items.filter((item) => item.status === 'pending').length;
  const badge = $('#unanswered-badge');
  const bottomBadge = $('#bottom-unanswered-badge');

  if (pending > 0) {
    const pendingText = String(pending);
    badge.textContent = pendingText;
    badge.classList.remove('hidden');
    if (bottomBadge) {
      bottomBadge.textContent = pendingText;
      bottomBadge.classList.remove('hidden');
    }
  } else {
    badge.classList.add('hidden');
    bottomBadge?.classList.add('hidden');
  }

  $('#unanswered-count').textContent = items.length
    ? t('unanswered.count', { n: items.length, p: pending })
    : t('unanswered.emptyFilter');

  if (!items.length) {
    list.innerHTML = `<p class="empty-block">${escapeHtml(t('unanswered.emptyList'))}</p>`;
    return;
  }

  items.forEach((item) => {
    const card = document.createElement('article');
    card.className = `unanswered-card${item.status === 'pending' ? ' is-pending' : ''}`;
    card.dataset.id = String(item.id);

    const phone = item.phone || item.remote_id || '—';

    let body = `
      <div class="unanswered-card-head">
        ${statusLabel(item.status)}
      </div>
      <dl class="unanswered-facts">
        <div class="unanswered-facts-row">
          <dt>${escapeHtml(t('unanswered.dateTime'))}</dt>
          <dd>${escapeHtml(formatDate(item.created_at))}</dd>
        </div>
        <div class="unanswered-facts-row">
          <dt>${escapeHtml(t('unanswered.phone'))}</dt>
          <dd>${escapeHtml(phone)}</dd>
        </div>
    `;

    if (item.status !== 'pending') {
      body += `
        <div class="unanswered-facts-row">
          <dt>${escapeHtml(t('unanswered.query'))}</dt>
          <dd class="unanswered-question">${escapeHtml(item.question)}</dd>
        </div>
      `;
    }

    body += `</dl>`;

    if (item.status === 'pending') {
      body += `
        <div class="unanswered-consulta-edit">
          <label class="unanswered-field-label">
            ${escapeHtml(t('unanswered.query'))}
            <textarea
              class="unanswered-question-input"
              rows="2"
              data-question-for="${item.id}"
            >${escapeHtml(item.question)}</textarea>
          </label>
          <button type="button" class="btn small ghost" data-save-question="${item.id}">
            ${escapeHtml(t('btn.saveQuestion'))}
          </button>
        </div>
      `;
    }

    if (item.status === 'pending') {
      body += `
        <label class="unanswered-field-label">
          ${escapeHtml(t('unanswered.yourAnswer'))}
          <textarea
            class="unanswered-answer"
            rows="4"
            placeholder="${escapeAttr(t('unanswered.answerPlaceholder'))}"
            data-answer-for="${item.id}"
          ></textarea>
        </label>
        <div class="unanswered-actions">
          <button type="button" class="btn primary" data-respond="${item.id}">${escapeHtml(t('btn.respond'))}</button>
          <button type="button" class="btn danger" data-delete-unanswered="${item.id}">${escapeHtml(t('btn.delete'))}</button>
        </div>
        <p class="form-msg unanswered-row-msg" data-msg-for="${item.id}"></p>
      `;
    } else {
      body += `
        <div class="unanswered-actions">
          <button type="button" class="btn danger" data-delete-unanswered="${item.id}">${escapeHtml(t('btn.delete'))}</button>
        </div>
      `;
    }

    card.innerHTML = body;
    list.appendChild(card);
  });

  list.querySelectorAll('[data-respond]').forEach((btn) => {
    btn.addEventListener('click', () => respondUnanswered(Number(btn.dataset.respond)));
  });

  list.querySelectorAll('[data-save-question]').forEach((btn) => {
    btn.addEventListener('click', () => saveUnansweredQuestion(Number(btn.dataset.saveQuestion)));
  });

  list.querySelectorAll('[data-delete-unanswered]').forEach((btn) => {
    btn.addEventListener('click', () => deleteUnanswered(Number(btn.dataset.deleteUnanswered)));
  });
}

async function respondUnanswered(id) {
  const item = state.unanswered.find((row) => row.id === id);
  if (!item) {
    return;
  }

  const textarea = document.querySelector(`[data-answer-for="${id}"]`);
  const questionInput = document.querySelector(`[data-question-for="${id}"]`);
  const rowMsg = document.querySelector(`[data-msg-for="${id}"]`);
  const answer = textarea?.value.trim() || '';
  const question = questionInput?.value.trim() || item.question;

  if (!answer) {
    if (rowMsg) {
      rowMsg.textContent = t('msg.writeAnswer');
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
    rowMsg.textContent = t('msg.savingFaq');
    rowMsg.className = 'form-msg unanswered-row-msg';
  }

  try {
    await api(`/unanswered/${id}/convert`, {
      method: 'POST',
      body: JSON.stringify({
        question,
        answer,
      }),
    });

    const listMsg = $('#unanswered-msg');
    listMsg.textContent = t('msg.savedIndexed');
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

async function saveUnansweredQuestion(id) {
  const questionInput = document.querySelector(`[data-question-for="${id}"]`);
  const rowMsg = document.querySelector(`[data-msg-for="${id}"]`);
  const question = questionInput?.value.trim() || '';

  if (!question) {
    if (rowMsg) {
      rowMsg.textContent = t('msg.queryEmpty');
      rowMsg.className = 'form-msg error unanswered-row-msg';
    }
    questionInput?.focus();
    return;
  }

  const btn = document.querySelector(`[data-save-question="${id}"]`);
  if (btn) {
    btn.disabled = true;
  }
  if (rowMsg) {
    rowMsg.textContent = t('msg.savingQuery');
    rowMsg.className = 'form-msg unanswered-row-msg';
  }

  try {
    await api(`/unanswered/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ question }),
    });

    const item = state.unanswered.find((row) => row.id === id);
    if (item) {
      item.question = question;
    }

    if (rowMsg) {
      rowMsg.textContent = t('msg.querySaved');
      rowMsg.className = 'form-msg ok unanswered-row-msg';
    }
  } catch (error) {
    if (rowMsg) {
      rowMsg.textContent = error.message;
      rowMsg.className = 'form-msg error unanswered-row-msg';
    }
  } finally {
    if (btn) {
      btn.disabled = false;
    }
  }
}

async function deleteUnanswered(id) {
  const item = state.unanswered.find((row) => row.id === id);
  if (!item) {
    return;
  }

  const ok = window.confirm(t('msg.deleteQuestionConfirm', { q: truncate(item.question, 80) }));
  if (!ok) {
    return;
  }

  const msg = $('#unanswered-msg');
  msg.textContent = t('msg.deleting');
  msg.className = 'form-msg';

  try {
    await api(`/unanswered/${id}`, { method: 'DELETE' });
    msg.textContent = t('msg.questionDeleted');
    msg.classList.add('ok');
    await refreshUnanswered();
  } catch (error) {
    msg.textContent = error.message;
    msg.classList.add('error');
  }
}

function adminTenantStatusLabel(status) {
  const map = {
    draft: ['admin.statusDraft', 'warn'],
    qr_pending: ['admin.statusQrPending', 'warn'],
    connected: ['admin.statusConnected', 'ok'],
    active: ['admin.statusActive', 'ok'],
    inactive: ['admin.statusInactive', 'off'],
    error: ['admin.statusError', 'off'],
  };
  const [key, kind] = map[status] || [status, 'off'];
  const label = typeof key === 'string' && key.startsWith('admin.') ? t(key) : key;
  return `<span class="pill ${kind}">${escapeHtml(label)}</span>`;
}

function adminWhatsappLabel(tenant) {
  const status = tenant.whatsapp_status || 'none';
  const map = {
    none: ['admin.whatsappNone', 'off'],
    draft: ['admin.whatsappPending', 'warn'],
    qr_pending: ['admin.whatsappPending', 'warn'],
    connected: ['admin.whatsappConnected', 'ok'],
    error: ['admin.whatsappError', 'off'],
  };
  const [key, kind] = map[status] || [status, 'off'];
  const label = typeof key === 'string' && key.startsWith('admin.') ? t(key) : key;
  let html = `<span class="pill ${kind}">${escapeHtml(label)}</span>`;
  if (tenant.whatsapp_phone) {
    html += ` <span class="admin-phone">${escapeHtml(`+${String(tenant.whatsapp_phone).replace(/^\+/, '')}`)}</span>`;
  }
  return html;
}

function attachAdminActions(root) {
  root.querySelectorAll('[data-admin-view]').forEach((btn) => {
    btn.addEventListener('click', () => openAdminTenantDialog(Number(btn.dataset.adminView)));
  });
  root.querySelectorAll('[data-admin-reset]').forEach((btn) => {
    btn.addEventListener('click', () => resetAdminTenantPassword(Number(btn.dataset.adminReset)));
  });
  root.querySelectorAll('[data-admin-delete]').forEach((btn) => {
    btn.addEventListener('click', () => openAdminDeleteConfirm(Number(btn.dataset.adminDelete)));
  });
}

function adminTenantEmailLabel(tenant) {
  return tenant.client_email || tenant.registration_email || '—';
}

function renderAdminTenantDetail(tenant) {
  const list = $('#admin-tenant-detail');
  if (!list || !tenant) {
    return;
  }

  const rows = [
    [t('table.slug'), `<code>${escapeHtml(tenant.slug)}</code>`],
    [t('table.businessName'), escapeHtml(tenant.name || '—')],
    [t('table.clientEmail'), escapeHtml(tenant.client_email || '—')],
    [
      t('table.registrationEmail'),
      escapeHtml(tenant.registration_email || '—'),
    ],
    [t('table.status'), adminTenantStatusLabel(tenant.status)],
    [t('admin.provisioning'), tenant.provisioning_status ? adminTenantStatusLabel(tenant.provisioning_status) : '—'],
    [t('admin.whatsapp'), adminWhatsappLabel(tenant)],
    [t('admin.instance'), escapeHtml(tenant.whatsapp_instance || '—')],
    [t('admin.createdAt'), escapeHtml(formatDate(tenant.created_at))],
    [t('admin.faqCount'), escapeHtml(String(tenant.faq_count ?? '—'))],
    [t('admin.unansweredCount'), escapeHtml(String(tenant.unanswered_count ?? '—'))],
  ];

  list.innerHTML = rows
    .map(
      ([label, value]) => `
        <div class="admin-detail-row">
          <dt>${escapeHtml(label)}</dt>
          <dd>${value}</dd>
        </div>
      `
    )
    .join('');
}

async function openAdminTenantDialog(id) {
  const dialog = $('#admin-tenant-dialog');
  const msg = $('#admin-detail-msg');
  const deleteWrap = $('#admin-delete-confirm-wrap');
  const deleteInput = $('#admin-delete-confirm-slug');
  const deleteBtn = $('#admin-delete-tenant');

  msg.textContent = '';
  msg.className = 'form-msg';
  deleteWrap?.classList.add('hidden');
  deleteBtn?.classList.add('hidden');
  if (deleteInput) {
    deleteInput.value = '';
  }

  try {
    const data = await api(`/admin/tenants/${id}`);
    const tenant = data.tenant;
    state.adminTenants = state.adminTenants.map((row) =>
      row.id === tenant.id ? { ...row, ...tenant } : row
    );
    $('#admin-tenant-id').value = String(tenant.id);
    $('#admin-tenant-dialog-title').textContent = `${t('admin.detailTitle')}: ${tenant.slug}`;
    renderAdminTenantDetail(tenant);
    dialog.showModal();
  } catch (error) {
    const listMsg = $('#admin-msg');
    if (listMsg) {
      listMsg.textContent = error.message;
      listMsg.className = 'form-msg error';
    }
  }
}

function openAdminDeleteConfirm(id) {
  const tenant = state.adminTenants.find((row) => Number(row.id) === Number(id));
  if (!tenant) {
    return;
  }
  renderAdminTenantDetail(tenant);
  $('#admin-tenant-id').value = String(tenant.id);
  $('#admin-tenant-dialog-title').textContent = `${t('admin.deleteTitle')}: ${tenant.slug}`;
  $('#admin-delete-confirm-wrap')?.classList.remove('hidden');
  $('#admin-delete-tenant')?.classList.remove('hidden');
  $('#admin-delete-confirm-slug').value = '';
  $('#admin-detail-msg').textContent = t('admin.deleteWarning', { slug: tenant.slug });
  $('#admin-detail-msg').className = 'form-msg warn';
  $('#admin-tenant-dialog')?.showModal();
  $('#admin-delete-confirm-slug')?.focus();
}

async function openAdminResetDialog(id) {
  const tenantId = Number(id || $('#admin-tenant-id')?.value);
  const tenant = state.adminTenants.find((row) => Number(row.id) === tenantId);
  if (!tenant) {
    return;
  }

  const dialog = $('#admin-reset-dialog');
  const msg = $('#admin-reset-msg');
  const result = $('#admin-reset-result');
  const submitBtn = $('#admin-reset-submit');

  $('#admin-reset-dialog-title').textContent = `${t('admin.resetAccessTitle')}: ${tenant.slug}`;
  $('#admin-reset-dialog-hint').textContent = t('admin.resetAccessHint');
  $('#admin-reset-email-label').textContent = t('admin.resetAccessEmail');
  $('#admin-reset-password-label').textContent = t('admin.resetAccessPassword');
  $('#admin-reset-result-title').textContent = t('admin.resetAccessSaved');
  $('#admin-reset-submit').textContent = t('admin.resetAccessSave');

  const passwordInput = $('#admin-reset-password-input');
  if (passwordInput) {
    passwordInput.placeholder = t('admin.resetAccessPasswordPlaceholder');
    passwordInput.value = '';
  }

  $('#admin-reset-email').value =
    tenant.client_email || tenant.registration_email || '';
  if (msg) {
    msg.textContent = '';
    msg.className = 'form-msg';
  }
  result?.classList.add('hidden');
  submitBtn?.classList.remove('hidden');

  dialog?.showModal();
  $('#admin-reset-email')?.focus();
}

async function submitAdminResetAccess(event) {
  event.preventDefault();

  const tenantId = Number($('#admin-tenant-id')?.value);
  const tenant = state.adminTenants.find((row) => Number(row.id) === tenantId);
  if (!tenant) {
    return;
  }

  const email = $('#admin-reset-email')?.value.trim() || '';
  const password = $('#admin-reset-password-input')?.value || '';
  const msg = $('#admin-reset-msg');
  const result = $('#admin-reset-result');
  const submitBtn = $('#admin-reset-submit');

  if (!email) {
    if (msg) {
      msg.textContent = t('login.email');
      msg.className = 'form-msg error';
    }
    return;
  }

  if (msg) {
    msg.textContent = t('admin.resettingPassword');
    msg.className = 'form-msg';
  }

  try {
    const data = await api(`/admin/tenants/${tenantId}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({
        email,
        password: password || undefined,
      }),
    });

    $('#admin-reset-result-email').textContent = data.email || email;
    $('#admin-reset-result-password').textContent = data.temporary_password || '';
    result?.classList.remove('hidden');
    submitBtn?.classList.add('hidden');
    if (msg) {
      msg.textContent = '';
      msg.className = 'form-msg';
    }

    await refreshAdmin();
    const detailMsg = $('#admin-detail-msg');
    if (detailMsg) {
      detailMsg.textContent = t('admin.resetAccessSaved');
      detailMsg.className = 'form-msg ok';
    }
  } catch (error) {
    if (msg) {
      msg.textContent = error.message;
      msg.className = 'form-msg error';
    }
  }
}

async function resetAdminTenantPassword(id) {
  openAdminResetDialog(id);
}

async function deleteAdminTenant(id) {
  const tenantId = Number(id || $('#admin-tenant-id')?.value);
  const tenant = state.adminTenants.find((row) => Number(row.id) === tenantId);
  const confirmSlug = $('#admin-delete-confirm-slug')?.value.trim() || '';
  const msg = $('#admin-detail-msg') || $('#admin-msg');

  if (!tenant) {
    return;
  }

  if (confirmSlug !== tenant.slug) {
    msg.textContent = t('admin.deleteSlugMismatch');
    msg.className = 'form-msg error';
    $('#admin-delete-confirm-slug')?.focus();
    return;
  }

  const ok = window.confirm(t('admin.deleteFinalConfirm', { slug: tenant.slug }));
  if (!ok) {
    return;
  }

  msg.textContent = t('admin.deletingTenant');
  msg.className = 'form-msg';

  try {
    await api(`/admin/tenants/${tenantId}`, {
      method: 'DELETE',
      body: JSON.stringify({ confirm_slug: confirmSlug }),
    });
    $('#admin-tenant-dialog')?.close();
    msg.textContent = '';
    const listMsg = $('#admin-msg');
    if (listMsg) {
      listMsg.textContent = t('admin.deleteDone', { slug: tenant.slug });
      listMsg.className = 'form-msg ok';
    }
    await refreshAdmin();
  } catch (error) {
    msg.textContent = error.message;
    msg.className = 'form-msg error';
  }
}

function renderAdminTenants(tenants) {
  const tbody = $('#admin-tbody');
  const cards = $('#admin-cards');
  tbody.innerHTML = '';
  if (cards) {
    cards.innerHTML = '';
  }

  if (!tenants.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty">${escapeHtml(t('admin.empty'))}</td></tr>`;
    if (cards) {
      cards.innerHTML = `<p class="empty-block">${escapeHtml(t('admin.empty'))}</p>`;
    }
    return;
  }

  for (const tenant of tenants) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><code>${escapeHtml(tenant.slug)}</code></td>
      <td>${escapeHtml(tenant.name || '—')}</td>
      <td>${escapeHtml(adminTenantEmailLabel(tenant))}</td>
      <td>${adminTenantStatusLabel(tenant.status)}</td>
      <td>${adminWhatsappLabel(tenant)}</td>
      <td>${escapeHtml(formatDate(tenant.created_at))}</td>
      <td class="row-actions">
        <button type="button" class="btn small" data-admin-view="${tenant.id}">${escapeHtml(t('admin.viewDetail'))}</button>
        <button type="button" class="btn small" data-admin-reset="${tenant.id}">${escapeHtml(t('admin.resetPasswordShort'))}</button>
        <button type="button" class="btn small danger" data-admin-delete="${tenant.id}">${escapeHtml(t('btn.delete'))}</button>
      </td>
    `;
    tbody.appendChild(tr);

    if (cards) {
      const card = document.createElement('article');
      card.className = 'admin-card';
      card.innerHTML = `
        <div class="admin-card-head">
          <p class="admin-card-slug"><code>${escapeHtml(tenant.slug)}</code></p>
          ${adminTenantStatusLabel(tenant.status)}
        </div>
        <dl class="admin-card-body">
          <div class="admin-card-row">
            <dt>${escapeHtml(t('admin.cardBusiness'))}</dt>
            <dd>${escapeHtml(tenant.name || '—')}</dd>
          </div>
          <div class="admin-card-row">
            <dt>${escapeHtml(t('admin.cardEmail'))}</dt>
            <dd>${escapeHtml(adminTenantEmailLabel(tenant))}</dd>
          </div>
          <div class="admin-card-row">
            <dt>${escapeHtml(t('admin.whatsapp'))}</dt>
            <dd>${adminWhatsappLabel(tenant)}</dd>
          </div>
          <div class="admin-card-row">
            <dt>${escapeHtml(t('admin.createdAt'))}</dt>
            <dd>${escapeHtml(formatDate(tenant.created_at))}</dd>
          </div>
        </dl>
        <div class="admin-card-actions row-actions">
          <button type="button" class="btn small" data-admin-view="${tenant.id}">${escapeHtml(t('admin.viewDetail'))}</button>
          <button type="button" class="btn small" data-admin-reset="${tenant.id}">${escapeHtml(t('admin.resetPasswordShort'))}</button>
          <button type="button" class="btn small danger" data-admin-delete="${tenant.id}">${escapeHtml(t('btn.delete'))}</button>
        </div>
      `;
      cards.appendChild(card);
    }
  }

  attachAdminActions(tbody);
  if (cards) {
    attachAdminActions(cards);
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

    if (!(await ensureClientAppOrWhatsapp())) {
      return;
    }

    showApp();
    renderHeader();
    const view = resolveView(getRequestedView());
    setView(view);
    history.replaceState({ view }, '', `#${view}`);
    await refreshViewData(view);
    if (state.user.role === 'client' && view !== 'unanswered') {
      await refreshUnanswered();
    }
  } catch {
    showLanding('signup');
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
  msg.textContent = t('msg.importing');
  msg.className = 'form-msg';

  const formData = new FormData();
  formData.append('file', file);
  if ($('#import-replace').checked) {
    formData.append('replace', 'true');
  }

  try {
    const data = await apiUpload('/faqs/import', formData);
    const imp = data.import || {};
    let text = data.message || t('msg.importDone');

    if (imp.deleted) {
      text += t('msg.importDeleted', { n: imp.deleted });
    }
    if (imp.errors?.length) {
      text += t('msg.importErrors', { n: imp.errors.length });
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
  state.adminTenants = data.tenants || [];
  renderAdminTenants(state.adminTenants);
}

function openFaqDialog(id) {
  const dialog = $('#faq-dialog');
  const faqId = id == null || id === '' ? null : Number(id);
  const faq =
    faqId != null && !Number.isNaN(faqId)
      ? state.faqs.find((f) => Number(f.id) === faqId)
      : null;

  $('#faq-dialog-title').textContent = faqId ? t('faq.edit') : t('faq.new');
  $('#faq-id').value = faqId != null && !Number.isNaN(faqId) ? String(faqId) : '';
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
    window.alert(t('msg.faqNotFound'));
    return;
  }

  const preview = truncate(faq.question, 80);
  const ok = window.confirm(t('msg.deleteFaqConfirm', { q: preview }));
  if (!ok) {
    return;
  }

  const msg = $('#import-msg');
  msg.textContent = t('msg.deletingFaq');
  msg.className = 'form-msg';

  try {
    const data = await api(`/faqs/${faqId}`, { method: 'DELETE' });
    if ($('#faq-dialog').open && Number($('#faq-id').value) === faqId) {
      $('#faq-dialog').close();
    }
    await refreshFaqs();
    msg.textContent = data.warning || t('msg.faqDeleted');
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
    total ? t('msg.reindexConfirm', { n: total }) : t('msg.reindexEmpty')
  );
  if (!ok) {
    return;
  }

  const msg = $('#import-msg');
  const btn = $('#btn-reindex-faqs');
  msg.textContent = t('msg.syncing');
  msg.className = 'form-msg';
  btn.disabled = true;

  try {
    const data = await api('/faqs/reindex', { method: 'POST' });
    await refreshFaqs();
    msg.textContent = data.message || t('msg.synced');
    msg.classList.add('ok');
  } catch (error) {
    msg.textContent = error.message;
    msg.classList.add('error');
  } finally {
    btn.disabled = false;
  }
}

$('#login-password-toggle')?.addEventListener('click', () => {
  const input = $('#login-password');
  const btn = $('#login-password-toggle');
  const eye = btn?.querySelector('.icon-eye');
  const eyeOff = btn?.querySelector('.icon-eye-off');
  if (!input || !btn || !eye || !eyeOff) {
    return;
  }

  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  eye.classList.toggle('hidden', show);
  eyeOff.classList.toggle('hidden', !show);
  btn.setAttribute('aria-label', show ? t('login.hidePassword') : t('login.showPassword'));
  btn.title = show ? t('login.hidePassword') : t('login.showPassword');
});

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
    if (!(await ensureClientAppOrWhatsapp())) {
      return;
    }
    showApp();
    renderHeader();
    await openView('dashboard');
    if (state.user.role === 'client') {
      await refreshUnanswered();
    }
  } catch (error) {
    msg.textContent = error.message;
    msg.classList.add('error');
  }
});

$('#link-show-login')?.addEventListener('click', () => setLandingTab('login'));
$('#link-show-signup')?.addEventListener('click', () => setLandingTab('signup'));

$('#signup-form')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const msg = $('#signup-msg');
  msg.textContent = '';
  msg.className = 'form-msg';

  try {
    const data = await api('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        email: $('#signup-email').value.trim(),
        password: $('#signup-password').value,
      }),
    });

    state.user = data.user;
    whatsappState.pollIntervalSeconds =
      data.poll_interval_seconds || whatsappState.pollIntervalSeconds;
    whatsappState.timeoutSeconds =
      data.timeout_seconds || whatsappState.timeoutSeconds;

    await startWhatsappConnect();
  } catch (error) {
    msg.textContent = error.message;
    msg.classList.add('error');
  }
});

$('#provision-qr-refresh')?.addEventListener('click', async () => {
  const msg = $('#provision-qr-msg');
  try {
    await startWhatsappConnect();
  } catch (error) {
    if (msg) {
      msg.textContent = error.message;
      msg.className = 'form-msg error';
    }
  }
});

async function logout() {
  try {
    await api('/auth/logout', { method: 'POST' });
  } catch {
    /* ignore */
  }
  clearWhatsappPoll();
  state.user = null;
  state.account = null;
  state.faqs = [];
  state.unanswered = [];
  try {
    sessionStorage.removeItem(VIEW_STORAGE_KEY);
  } catch {
    /* ignore */
  }
  history.replaceState(null, '', location.pathname + location.search);
  showLanding('signup');
}

$('#btn-logout').addEventListener('click', logout);
$('#btn-logout-mobile')?.addEventListener('click', logout);
$('#btn-logout-profile')?.addEventListener('click', logout);

$$('[data-view]').forEach((btn) => {
  btn.addEventListener('click', () => openView(btn.dataset.view));
});

window.addEventListener('popstate', () => {
  if (!state.user) {
    return;
  }
  const view = resolveView(getRequestedView());
  setView(view);
  refreshViewData(view);
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
  msg.textContent = t('msg.savingIndexing');
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

  const email = $('#profile-email').value.trim().toLowerCase();
  const currentEmail = state.user?.email?.trim().toLowerCase() || '';
  const emailChanged = Boolean(email && email !== currentEmail);
  const current = $('#profile-current-password').value;
  const next = $('#profile-new-password').value;
  const confirm = $('#profile-confirm-password')?.value || '';

  if (emailChanged && !current) {
    msg.textContent = t('msg.passwordRequiredForEmail');
    msg.classList.add('error');
    $('#profile-current-password').focus();
    return;
  }

  if (next && next.length < 8) {
    msg.textContent = t('msg.passwordTooShort');
    msg.classList.add('error');
    $('#profile-new-password').focus();
    return;
  }

  if (next && next !== confirm) {
    msg.textContent = t('msg.passwordMismatch');
    msg.classList.add('error');
    $('#profile-confirm-password')?.focus();
    return;
  }

  if (next && !current) {
    msg.textContent = t('msg.passwordRequiredForChange');
    msg.classList.add('error');
    $('#profile-current-password').focus();
    return;
  }

  try {
    if (emailChanged || next) {
      const authBody = { email };
      authBody.current_password = current;
      if (next) {
        authBody.new_password = next;
      }
      const authData = await api('/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify(authBody),
      });
      state.user = authData.user;
    }

    if (state.user?.role === 'client') {
      const accountBody = {
        address: $('#profile-address')?.value.trim() || '',
        welcome_message: $('#profile-welcome-message')?.value.trim() || '',
        booking_url_base: $('#profile-booking-url')?.value.trim() || '',
        primary_language: $('#profile-primary-language')?.value || 'es',
      };
      const businessName = $('#profile-business').value.trim();
      if (businessName.length >= 2) {
        accountBody.business_name = businessName;
      }

      const accountData = await api('/account/settings', {
        method: 'PATCH',
        body: JSON.stringify(accountBody),
      });
      state.account = accountData;
      if (accountData.tenant?.name && state.user.tenant) {
        state.user.tenant.name = accountData.tenant.name;
      }
    }

    renderHeader();
    msg.textContent = t('msg.profileSaved');
    msg.classList.add('ok');
    $('#profile-current-password').value = '';
    $('#profile-new-password').value = '';
    $('#profile-confirm-password').value = '';
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
    msg.textContent = t('msg.tenantCreated');
    msg.classList.add('ok');
    $('#admin-tenant-form').reset();
    await refreshAdmin();
  } catch (error) {
    msg.textContent = error.message;
    msg.classList.add('error');
  }
});

$('#admin-detail-cancel')?.addEventListener('click', () => {
  $('#admin-tenant-dialog')?.close();
});

$('#admin-reset-password')?.addEventListener('click', () => {
  resetAdminTenantPassword(Number($('#admin-tenant-id')?.value));
});

$('#admin-reset-form')?.addEventListener('submit', submitAdminResetAccess);

$('#admin-reset-cancel')?.addEventListener('click', () => {
  $('#admin-reset-dialog')?.close();
});

$('#admin-delete-tenant')?.addEventListener('click', () => {
  deleteAdminTenant(Number($('#admin-tenant-id')?.value));
});

loadDeployVersion();

mountLangPickers();
applyI18n();

window.onLangChange = () => {
  const loginPassword = $('#login-password');
  const loginToggle = $('#login-password-toggle');
  if (loginPassword && loginToggle) {
    const visible = loginPassword.type === 'text';
    loginToggle.setAttribute('aria-label', visible ? t('login.hidePassword') : t('login.showPassword'));
    loginToggle.title = visible ? t('login.hidePassword') : t('login.showPassword');
  }
  if (state.user) {
    renderHeader();
    refreshViewData(state.currentView);
  }
};

loadSession();

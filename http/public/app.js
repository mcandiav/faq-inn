const APP_PRODUCT_NAME = 'FAQ Inn';
const DEFAULT_UI_VERSION = '0.0.0';
const apiBase = window.FAQ_INN_API_URL || window.DFAQ_API_URL || '/api';
const VIEW_STORAGE_KEY = 'faq-inn-current-view';
const VALID_VIEWS = ['dashboard', 'unanswered', 'profile', 'onboarding', 'booking-engine', 'agenda-engine', 'admin'];
/* Marcador estéril: redeploy http 1.7.74 (recuperación contraseña + i18n pt). */

const PRIMARY_OBJECTIVE_SLUGS = new Set([
  'reservar_noches',
  'reservar_horarios',
  'enviar_a_sitio_web',
]);
// Objetivo transversal por defecto: deshabilitar un objetivo comercial cae aquí.
const DEFAULT_OBJECTIVE_SLUG = 'responder_preguntas';
// Slugs que el cliente puede elegir en Mi cuenta (los 3 comerciales + FAQ).
const SELECTABLE_OBJECTIVE_SLUGS = new Set([
  ...PRIMARY_OBJECTIVE_SLUGS,
  DEFAULT_OBJECTIVE_SLUG,
]);

const MOTOR_DEFS = {
  booking: {
    prefix: 'booking',
    api: '/booking-engine',
    view: 'booking-engine',
    tk: 'booking',
    store: 'bookingEngine',
    settingsApproved(settings) {
      return (
        settings?.validation_status === 'approved' && settings?.tenant_url
      );
    },
    payloadKey: 'booking',
    approvedField: 'validation_status',
  },
  agenda: {
    prefix: 'agenda',
    api: '/agenda-engine',
    view: 'agenda-engine',
    tk: 'agenda',
    store: 'agendaEngine',
    settingsApproved(settings) {
      return (
        settings?.agenda_validation_status === 'approved' &&
        settings?.tenant_url
      );
    },
    payloadKey: 'agenda',
    approvedField: 'agenda_validation_status',
  },
};

const state = {
  user: null,
  account: null,
  adminTenants: [],
  promptTemplates: [],
  faqs: [],
  unanswered: [],
  faqSort: { key: 'id', dir: 'asc' },
  currentView: 'dashboard',
  bookingReturnView: 'profile',
  bookingEngine: {
    sessionId: null,
    scenarios: [],
    verification: null,
    candidateTemplate: '',
    confidenceScore: 0,
    warnings: [],
    previewUrl: '',
    previewValues: null,
    dateFormat: '',
  },
  agendaEngine: {
    sessionId: null,
    scenarios: [],
    verification: null,
    candidateTemplate: '',
    confidenceScore: 0,
    warnings: [],
    previewUrl: '',
    previewValues: null,
    dateFormat: '',
  },
  motorKind: 'booking',
  onboardingStep: 1,
  onboardingData: null,
  onboardingSelectedObjective: '',
  objectivesCatalog: [],
  profileObjectiveDraft: '',
  profileObjectivePickerOpen: false,
  faqCategories: [],
};
const appMeta = {
  productName: APP_PRODUCT_NAME,
  title: APP_PRODUCT_NAME,
  version: readUiVersionFromDom(),
  uiVersion: readUiVersionFromDom(),
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function activeMotorKind() {
  return state.motorKind || 'booking';
}

function motorDef(kind = activeMotorKind()) {
  return MOTOR_DEFS[kind] || MOTOR_DEFS.booking;
}

function m$(suffix, kind = activeMotorKind()) {
  const p = motorDef(kind).prefix;
  return (
    document.getElementById(`${p}-${suffix}`) ||
    document.getElementById(`btn-${p}-${suffix}`)
  );
}

function motorStore(kind = activeMotorKind()) {
  return state[motorDef(kind).store];
}

function mtk(key, kind = activeMotorKind()) {
  return t(`${motorDef(kind).tk}.${key}`);
}

function readUiVersionFromDom() {
  const meta = document.querySelector('meta[name="faq-inn-ui-version"]');
  const fromMeta = meta?.getAttribute('content')?.trim();
  if (fromMeta) {
    return fromMeta;
  }
  const asset = document.querySelector('script[src*="app.js?v="], link[href*="styles.css?v="]');
  const href = asset?.getAttribute('src') || asset?.getAttribute('href') || '';
  const match = href.match(/[?&]v=([0-9.]+)/);
  return match?.[1] || DEFAULT_UI_VERSION;
}

function versionLabel(gitCommit, apiVersion) {
  const uiVersion = appMeta.uiVersion || readUiVersionFromDom();
  const api = (apiVersion || appMeta.version || '').trim();
  const hash = gitCommit?.trim();
  // Badge operable: UI = rama http; API = health de rama api (pueden diferir).
  let label = `${appMeta.productName} UI ${uiVersion}`;
  if (api && api !== uiVersion) {
    label += ` · API ${api}`;
  } else if (api) {
    label += ` · API ${api}`;
  }
  if (hash && hash !== 'unknown') {
    label += ` @${hash}`;
  }
  return label;
}

function applyAppBranding() {
  const productEl = document.querySelector('.login-product');
  if (productEl) {
    productEl.textContent = appMeta.productName;
  }
}

function applyAppVersion(gitCommit, apiVersion) {
  const label = versionLabel(gitCommit, apiVersion);
  document.title = label;
  $$('[data-app-version]').forEach((el) => {
    el.textContent = label;
  });
}

async function loadDeployVersion() {
  appMeta.uiVersion = readUiVersionFromDom();
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
    applyAppVersion(data.git?.commit, data.app?.version);
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
  uiTarget: 'landing',
};

function getWhatsappUi() {
  if (whatsappState.uiTarget === 'profile') {
    return {
      qrPanel: $('#profile-whatsapp-qr-panel'),
      qrImage: $('#profile-whatsapp-qr-image'),
      qrWaiting: $('#profile-whatsapp-qr-waiting'),
      qrMsg: $('#profile-whatsapp-qr-msg'),
      reconnectBtn: $('#btn-profile-whatsapp-reconnect'),
    };
  }
  return {
    qrPanel: $('#provision-qr-panel'),
    qrImage: $('#provision-qr-image'),
    qrWaiting: $('#provision-qr-waiting'),
    qrMsg: $('#provision-qr-msg'),
    reconnectBtn: null,
  };
}

function formatWhatsappPhone(phone) {
  if (!phone) {
    return '';
  }
  return `+${String(phone).replace(/^\+/, '')}`;
}

function whatsappStatusLabel(status) {
  const key = {
    connected: 'profile.whatsappStatusConnected',
    disconnected: 'profile.whatsappStatusDisconnected',
    qr_pending: 'profile.whatsappStatusQrPending',
    error: 'profile.whatsappStatusError',
    draft: 'profile.whatsappStatusPending',
    none: 'profile.whatsappStatusNone',
  }[status || 'none'];
  return t(key || 'profile.whatsappStatusDisconnected');
}

function clearWhatsappPoll() {
  if (whatsappState.pollTimer) {
    clearInterval(whatsappState.pollTimer);
    whatsappState.pollTimer = null;
  }
}

function hideLandingPanels() {
  $('#signup-form')?.classList.add('hidden');
  $('#login-form')?.classList.add('hidden');
  $('#forgot-password-form')?.classList.add('hidden');
  $('#reset-password-form')?.classList.add('hidden');
  $('#provision-qr-panel')?.classList.add('hidden');
  $('#provision-success-panel')?.classList.add('hidden');
}

function setLandingTab(tab) {
  clearWhatsappPoll();
  setWhatsappFocus(false);
  hideLandingPanels();

  const showHero = tab === 'signup';
  document.querySelector('.landing-hero')?.classList.toggle('hidden', !showHero);

  if (tab === 'signup') {
    $('#signup-form')?.classList.remove('hidden');
  } else if (tab === 'forgot') {
    $('#forgot-password-form')?.classList.remove('hidden');
  } else if (tab === 'reset') {
    $('#reset-password-form')?.classList.remove('hidden');
  } else {
    $('#login-form')?.classList.remove('hidden');
  }
}

function isResetPasswordPath() {
  const path = (location.pathname || '/').replace(/\/+$/, '') || '/';
  return path === '/reset-password' || path.endsWith('/reset-password');
}

function readResetTokenFromUrl() {
  if (isResetPasswordPath()) {
    return new URLSearchParams(location.search).get('token') || '';
  }
  if ((location.hash || '').startsWith('#reset-password')) {
    const query = location.hash.includes('?') ? location.hash.slice(location.hash.indexOf('?') + 1) : '';
    return new URLSearchParams(query).get('token') || '';
  }
  return null;
}

function setWhatsappFocus(active) {
  $('#login-screen')?.classList.toggle('provision-focus', active);
  document.querySelector('.landing-hero')?.classList.toggle('hidden', active);
}

function showWhatsappQr(qrBase64, instanceName) {
  const ui = getWhatsappUi();

  if (whatsappState.uiTarget === 'profile') {
    ui.qrPanel?.classList.remove('hidden');
    ui.reconnectBtn?.classList.add('hidden');
    $('#btn-profile-whatsapp-change')?.classList.add('hidden');
  } else {
    hideLandingPanels();
    setWhatsappFocus(true);
    ui.qrPanel?.classList.remove('hidden');
    const label = $('#provision-instance-label');
    if (label) {
      label.textContent = '';
      label.classList.add('hidden');
    }
  }

  if (qrBase64 && ui.qrImage) {
    ui.qrImage.src = qrBase64;
    ui.qrImage.classList.remove('hidden');
    ui.qrWaiting?.classList.add('hidden');
  } else if (!ui.qrImage?.src || ui.qrImage.classList.contains('hidden')) {
    ui.qrImage?.classList.add('hidden');
    ui.qrWaiting?.classList.remove('hidden');
  }

  if (whatsappState.uiTarget === 'landing') {
    requestAnimationFrame(() => {
      ui.qrPanel?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
}

async function onWhatsappConnected(phoneNumber) {
  clearWhatsappPoll();
  whatsappState.uiTarget = 'landing';

  try {
    const data = await api('/auth/me');
    state.user = data.user;
  } catch {
    /* session cookie should still be valid */
  }

  if (state.user?.role === 'client') {
    try {
      state.account = await api('/account/settings');
    } catch {
      /* keep previous account snapshot */
    }
  }

  showApp();
  renderHeader();
  await loadOnboardingState();

  const view = clientNeedsOnboarding() ? 'onboarding' : 'profile';
  await openView(view);

  if (view !== 'profile') {
    return;
  }

  const msg = $('#profile-msg');
  if (msg) {
    const phone = formatWhatsappPhone(phoneNumber);
    msg.textContent = phone
      ? t('msg.whatsappConnectedPhone', { phone })
      : t('msg.whatsappConnected');
    msg.className = 'form-msg ok';
  }
}

async function pollWhatsappStatus() {
  const ui = getWhatsappUi();
  const msg = ui.qrMsg;
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
    ui.reconnectBtn?.classList.remove('hidden');
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
    ui.reconnectBtn?.classList.remove('hidden');
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
  const ui = getWhatsappUi();
  showWhatsappQr(null, '');
  if (ui.qrMsg) {
    ui.qrMsg.textContent = t('msg.creatingWhatsapp');
    ui.qrMsg.className = 'form-msg';
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

async function startProfileWhatsappReconnect() {
  whatsappState.uiTarget = 'profile';
  whatsappState.instanceName = state.account?.whatsapp?.instance_name || '';
  const ui = getWhatsappUi();
  if (ui.qrMsg) {
    ui.qrMsg.textContent = '';
    ui.qrMsg.className = 'form-msg';
  }
  try {
    await startWhatsappConnect();
  } catch (error) {
    ui.reconnectBtn?.classList.remove('hidden');
    if (ui.qrMsg) {
      ui.qrMsg.textContent = error.message;
      ui.qrMsg.className = 'form-msg error';
    }
  }
}

async function disconnectProfileWhatsapp() {
  if (!window.confirm(t('profile.whatsappDisconnectConfirm'))) {
    return;
  }
  const btn = $('#btn-profile-whatsapp-disconnect');
  const meta = $('#profile-whatsapp-connected-meta');
  if (btn) {
    btn.disabled = true;
  }
  try {
    clearWhatsappPoll();
    whatsappState.uiTarget = 'landing';
    await api('/whatsapp/disconnect', { method: 'POST' });
    state.account = await api('/account/settings');
    renderProfileWhatsapp();
  } catch (error) {
    if (meta) {
      meta.textContent = error.message || t('profile.whatsappDisconnectError');
      meta.className = 'hint error';
    }
  } finally {
    if (btn) {
      btn.disabled = false;
    }
  }
}

async function ensureClientAppOrWhatsapp() {
  if (state.user?.role !== 'client') {
    return true;
  }

  try {
    state.account = await api('/account/settings');
    return true;
  } catch {
    return true;
  }
}

function clientNeedsWhatsappReconnect() {
  return (
    state.user?.role === 'client' &&
    state.account?.whatsapp?.connection_status !== 'connected'
  );
}

function clientNeedsOnboarding() {
  if (state.user?.role !== 'client') {
    return false;
  }
  const completed =
    state.onboardingData?.onboarding_completed ??
    state.account?.settings?.onboarding_completed;
  if (completed) {
    return false;
  }
  const connected =
    state.onboardingData?.whatsapp?.connected ??
    state.account?.whatsapp?.connection_status === 'connected';
  return Boolean(connected);
}

async function loadOnboardingState() {
  if (state.user?.role !== 'client') {
    return;
  }
  // Tras completar onboarding no hace falta /onboarding/status en cada refresh.
  // En API <1.7.54 esa ruta reactivaba is_starter_template en FAQs ya editadas.
  if (state.account?.settings?.onboarding_completed) {
    return;
  }
  try {
    const data = await api('/onboarding/status');
    state.onboardingData = data.onboarding;
    state.onboardingSelectedObjective =
      data.onboarding?.objetivo_slug || state.onboardingSelectedObjective || '';
    if (state.account?.settings) {
      state.account.settings.onboarding_completed =
        data.onboarding.onboarding_completed;
      state.account.settings.objetivo_slug = data.onboarding.objetivo_slug;
      state.account.settings.tenant_url = data.onboarding.tenant_url;
    }
  } catch {
    /* onboarding API no disponible aún */
  }
}

function resolveClientEntryView(requested) {
  if (clientNeedsWhatsappReconnect()) {
    return requested === 'dashboard' ? 'profile' : resolveView(requested);
  }
  if (clientNeedsOnboarding()) {
    return 'onboarding';
  }
  return resolveView(requested);
}

async function resumeWhatsappOnboarding(account) {
  whatsappState.uiTarget = 'landing';
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
  if (view === 'booking-engine' && user.role !== 'client') {
    return 'dashboard';
  }
  if (view === 'agenda-engine' && user.role !== 'client') {
    return 'dashboard';
  }
  if (view === 'onboarding' && user.role !== 'client') {
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
  document.body.classList.toggle('onboarding-wizard', view === 'onboarding');
  updateNavActive(view);
  rememberView(view);
}

async function refreshViewData(view) {
  if (view === 'dashboard') await refreshFaqs();
  if (view === 'unanswered') await refreshUnanswered();
  if (view === 'profile') await refreshProfile();
  if (view === 'onboarding') await refreshOnboarding();
  if (view === 'booking-engine') {
    state.motorKind = 'booking';
    await refreshMotorEngine('booking');
  }
  if (view === 'agenda-engine') {
    state.motorKind = 'agenda';
    await refreshMotorEngine('agenda');
  }
  if (view === 'admin') await refreshAdmin();
}

async function openView(name) {
  const view = resolveView(name);
  const previousView = state.currentView;
  if (view === 'booking-engine' && previousView !== 'booking-engine') {
    state.bookingReturnView = resolveView(previousView);
  }
  if (view === 'agenda-engine' && previousView !== 'agenda-engine') {
    state.bookingReturnView = resolveView(previousView);
  }
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

function compareText(a, b) {
  return String(a || '').localeCompare(String(b || ''), undefined, { sensitivity: 'base' });
}

function compareFaqRows(a, b, key) {
  switch (key) {
    case 'question':
      return compareText(a.question, b.question);
    case 'answer':
      return compareText(a.answer, b.answer);
    case 'category': {
      const ca = String(a?.category || '').trim() || 'Sin categoría';
      const cb = String(b?.category || '').trim() || 'Sin categoría';
      const diff = compareText(ca, cb);
      if (diff !== 0) return diff;
      return compareText(a.question, b.question);
    }
    case 'status': {
      const rank = (faq) =>
        (faq.is_starter_template ? 0 : 1) * 2 + (faq.active ? 0 : 1);
      const diff = rank(a) - rank(b);
      if (diff !== 0) return diff;
      return compareText(a.question, b.question);
    }
    case 'indexed': {
      const rank = (faq) => (faq.indexed_at ? 0 : 1);
      const diff = rank(a) - rank(b);
      if (diff !== 0) return diff;
      const ta = a?.indexed_at ? new Date(a.indexed_at).getTime() : 0;
      const tb = b?.indexed_at ? new Date(b.indexed_at).getTime() : 0;
      if (ta !== tb) return ta - tb;
      return Number(a?.id || 0) - Number(b?.id || 0);
    }
    case 'updated_at': {
      const ta = a?.updated_at ? new Date(a.updated_at).getTime() : 0;
      const tb = b?.updated_at ? new Date(b.updated_at).getTime() : 0;
      if (ta !== tb) return ta - tb;
      return Number(a?.id || 0) - Number(b?.id || 0);
    }
    default:
      return Number(a?.id || 0) - Number(b?.id || 0);
  }
}

function sortFaqs(list, sortState = state.faqSort) {
  const faqs = Array.isArray(list) ? [...list] : [];
  const key = sortState?.key || 'id';
  const dir = sortState?.dir === 'desc' ? -1 : 1;

  faqs.sort((a, b) => compareFaqRows(a, b, key) * dir);
  return faqs;
}

function setFaqSort(nextKey) {
  const currentKey = state.faqSort?.key || 'id';
  const currentDir = state.faqSort?.dir || 'asc';
  const dir = nextKey === currentKey ? (currentDir === 'asc' ? 'desc' : 'asc') : 'asc';
  state.faqSort = { key: nextKey, dir };
}

function faqSortArrow(sortState, forKey) {
  const key = sortState?.key || 'id';
  if (key !== forKey) return '';
  return sortState?.dir === 'desc' ? '↓' : '↑';
}

function applyFaqHeaderSortUi() {
  const thead = document.querySelector('#view-dashboard thead');
  if (!thead) return;
  thead.querySelectorAll('th[data-sort-key]').forEach((th) => {
    const key = th.dataset.sortKey || '';
    if (!key) return;
    const label = th.dataset.i18n ? t(th.dataset.i18n) : key;
    const arrow = faqSortArrow(state.faqSort, key);
    th.innerHTML = arrow
      ? `<span class="th-label">${escapeHtml(label)}</span><span class="sort-arrow" aria-hidden="true">${arrow}</span>`
      : `<span class="th-label">${escapeHtml(label)}</span>`;
    th.classList.add('is-sortable');
    th.classList.toggle('is-sorted', (state.faqSort?.key || 'id') === key);
  });
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

function statusPillTemplate(isStarterTemplate) {
  if (!isStarterTemplate) {
    return '';
  }
  return `<span class="pill template">${escapeHtml(t('faq.template'))}</span>`;
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
  const objetivo =
    state.account?.settings?.objetivo_slug ||
    state.onboardingData?.objetivo_slug ||
    '';
  $('#nav-admin').classList.toggle('hidden', !isAdmin);
  $('#nav-unanswered').classList.toggle('hidden', isAdmin);
  $('#nav-booking-engine')?.classList.toggle('hidden', isAdmin || objetivo !== 'reservar_noches');
  $('#nav-agenda-engine')?.classList.toggle('hidden', isAdmin || objetivo !== 'reservar_horarios');
  $('#bottom-nav-admin')?.classList.toggle('hidden', !isAdmin);
  $('#bottom-nav-unanswered')?.classList.toggle('hidden', isAdmin);

  renderProfile();
}

function browserTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch {
    return '';
  }
}

const TIMEZONE_FALLBACK = [
  'America/Santiago',
  'America/Argentina/Buenos_Aires',
  'America/Sao_Paulo',
  'America/Bogota',
  'America/Lima',
  'America/Mexico_City',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/Madrid',
  'Europe/Lisbon',
  'UTC',
];

function timezoneList() {
  try {
    if (typeof Intl.supportedValuesOf === 'function') {
      const list = Intl.supportedValuesOf('timeZone');
      if (Array.isArray(list) && list.length) {
        return list;
      }
    }
  } catch {
    /* fallback abajo */
  }
  return TIMEZONE_FALLBACK;
}

function populateTimezoneSelect(selected) {
  const el = $('#profile-timezone');
  if (!el) return;
  const value = selected || browserTimezone() || 'America/Santiago';
  const zones = timezoneList();
  if (!zones.includes(value)) {
    zones.unshift(value);
  }
  el.innerHTML = zones
    .map(
      (tz) =>
        `<option value="${tz}"${tz === value ? ' selected' : ''}>${tz}</option>`
    )
    .join('');
  el.value = value;
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

    const welcomeEl = $('#profile-welcome-message');
    const langEl = $('#profile-primary-language');
    const bookingStatusEl = $('#profile-booking-status');
    const bookingSetupEl = document.querySelector('.profile-booking-setup');
    const agendaStatusEl = $('#profile-agenda-status');
    const agendaSetupEl = document.querySelector('.profile-agenda-setup');
    const objetivo =
      account?.settings?.objetivo_slug ||
      state.onboardingData?.objetivo_slug ||
      '';
    if (bookingSetupEl) {
      bookingSetupEl.classList.toggle(
        'hidden',
        Boolean(objetivo) && objetivo !== 'reservar_noches'
      );
    }
    if (agendaSetupEl) {
      agendaSetupEl.classList.toggle(
        'hidden',
        Boolean(objetivo) && objetivo !== 'reservar_horarios'
      );
    }

    if (welcomeEl) {
      welcomeEl.value = account?.settings?.welcome_message || '';
    }
    if (langEl) {
      langEl.value = account?.settings?.primary_language || 'es';
    }
    populateTimezoneSelect(
      account?.settings?.timezone || browserTimezone() || 'America/Santiago'
    );
    if (bookingStatusEl) {
      const approved = account?.settings?.validation_status === 'approved';
      bookingStatusEl.textContent = approved
        ? t('profile.bookingStatusApproved')
        : t('profile.bookingStatusPending');
    }
    if (agendaStatusEl) {
      const approved = account?.settings?.agenda_validation_status === 'approved';
      agendaStatusEl.textContent = approved
        ? t('profile.agendaStatusApproved')
        : t('profile.agendaStatusPending');
    }

    const dangerZone = $('#profile-danger-zone');
    if (dangerZone) {
      dangerZone.classList.remove('hidden');
      const slug = account?.tenant?.slug || user.tenant?.slug || '';
      const slugHint = $('#account-delete-slug-hint');
      if (slugHint) {
        slugHint.textContent = slug
          ? t('account.deleteSlugPlaceholder', { slug })
          : '';
      }
      const deleteInput = $('#account-delete-confirm-slug');
      if (deleteInput) deleteInput.value = '';
      const deleteMsg = $('#account-delete-msg');
      if (deleteMsg) {
        deleteMsg.textContent = '';
        deleteMsg.className = 'form-msg';
      }
    }

    onboardHint?.classList.remove('hidden');
  } else {
    businessInput.disabled = true;
    businessInput.value = t('profile.globalAdmin');
    onboardHint?.classList.add('hidden');
    $('#profile-danger-zone')?.classList.add('hidden');
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

  if (user.role === 'client') {
    void ensureObjectivesCatalog().then(() => renderProfileObjective());
    void refreshProfileCategories();
  } else {
    $('#profile-objective-fieldset')?.classList.add('hidden');
    $('#profile-categories-fieldset')?.classList.add('hidden');
  }

  renderProfileWhatsapp();
}

async function ensureObjectivesCatalog() {
  if (state.objectivesCatalog.length) {
    return;
  }
  try {
    const data = await api('/onboarding/objectives');
    state.objectivesCatalog = data.objectives || [];
  } catch {
    state.objectivesCatalog = [];
  }
}

function getObjectiveMeta(slug) {
  return state.objectivesCatalog.find((item) => item.slug === slug) || null;
}

function currentProfileObjective() {
  return (
    state.account?.settings?.objetivo_slug ||
    state.onboardingData?.objetivo_slug ||
    ''
  );
}

function renderProfileObjectiveCards() {
  const grid = $('#profile-objectives');
  if (!grid) {
    return;
  }

  const selected =
    state.profileObjectiveDraft || currentProfileObjective() || '';
  const objectives = state.objectivesCatalog.filter((item) =>
    SELECTABLE_OBJECTIVE_SLUGS.has(item.slug)
  );

  grid.innerHTML = objectives
    .map(
      (objective) => `
      <button
        type="button"
        class="objective-card${selected === objective.slug ? ' is-selected' : ''}"
        data-objective="${escapeAttr(objective.slug)}"
        role="option"
        aria-selected="${selected === objective.slug}"
      >
        <h4>${escapeHtml(objective.name)}</h4>
        <p>${escapeHtml(objective.description)}</p>
        <p class="objective-examples">${escapeHtml(objective.examples)}</p>
      </button>`
    )
    .join('');

  grid.querySelectorAll('[data-objective]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.profileObjectiveDraft = btn.dataset.objective || '';
      renderProfileObjectiveCards();
      renderProfileObjectivePanels();
    });
  });
}

function renderProfileObjectivePanels() {
  const objetivo = currentProfileObjective();
  const draft = state.profileObjectivePickerOpen
    ? state.profileObjectiveDraft || objetivo
    : objetivo;
  const landingSetup = $('#profile-landing-setup');
  const showUrl = draft === 'enviar_a_sitio_web' || draft === 'reservar_horarios';
  landingSetup?.classList.toggle('hidden', !showUrl);
  const label = $('#profile-destination-label');
  if (label) {
    label.textContent =
      draft === 'reservar_horarios'
        ? t('profile.agendaUrl')
        : t('profile.destinationUrl');
  }
}

function renderProfileObjective() {
  const fieldset = $('#profile-objective-fieldset');
  const user = state.user;
  if (!fieldset || user?.role !== 'client') {
    fieldset?.classList.add('hidden');
    return;
  }

  fieldset.classList.remove('hidden');
  const objetivo = currentProfileObjective();
  const meta = getObjectiveMeta(objetivo);
  const badge = $('#profile-objective-badge');
  const description = $('#profile-objective-description');
  const destinationInput = $('#profile-destination-url');
  const changeBtn = $('#btn-profile-objective-change');
  const picker = $('#profile-objective-picker');

  if (badge) {
    badge.textContent = meta?.name || t('profile.objectiveMissing');
    badge.className = 'pill';
  }
  if (description) {
    description.textContent = meta?.description || '';
  }
  if (destinationInput) {
    destinationInput.value =
      state.account?.settings?.tenant_url ||
      state.onboardingData?.tenant_url ||
      '';
  }

  changeBtn?.classList.toggle('hidden', state.profileObjectivePickerOpen);
  picker?.classList.toggle('hidden', !state.profileObjectivePickerOpen);

  if (state.profileObjectivePickerOpen) {
    renderProfileObjectiveCards();
  }

  renderProfileObjectivePanels();
}

function openProfileObjectivePicker() {
  const current = currentProfileObjective();
  state.profileObjectivePickerOpen = true;
  state.profileObjectiveDraft = SELECTABLE_OBJECTIVE_SLUGS.has(current)
    ? current
    : DEFAULT_OBJECTIVE_SLUG;
  const msg = $('#profile-objective-msg');
  if (msg) {
    msg.textContent = '';
    msg.className = 'form-msg';
  }
  renderProfileObjective();
}

function closeProfileObjectivePicker() {
  state.profileObjectivePickerOpen = false;
  state.profileObjectiveDraft = '';
  const msg = $('#profile-objective-msg');
  if (msg) {
    msg.textContent = '';
    msg.className = 'form-msg';
  }
  renderProfileObjective();
}

async function saveProfileObjective() {
  const msg = $('#profile-objective-msg');
  const slug = state.profileObjectiveDraft || '';
  if (!SELECTABLE_OBJECTIVE_SLUGS.has(slug)) {
    if (msg) {
      msg.textContent = t('profile.objectivePick');
      msg.className = 'form-msg error';
    }
    return;
  }

  const body = { objetivo_slug: slug };
  if (slug === 'enviar_a_sitio_web' || slug === 'reservar_horarios') {
    const tenantUrl = $('#profile-destination-url')?.value.trim() || '';
    if (!tenantUrl && slug === 'enviar_a_sitio_web') {
      if (msg) {
        msg.textContent = t('profile.destinationRequired');
        msg.className = 'form-msg error';
      }
      return;
    }
    body.tenant_url = tenantUrl;
  }

  if (!window.confirm(t('profile.objectiveConfirm'))) {
    return;
  }

  const saveBtn = $('#btn-profile-objective-save');
  if (saveBtn) {
    saveBtn.disabled = true;
  }
  if (msg) {
    msg.textContent = '';
    msg.className = 'form-msg';
  }

  try {
    const accountData = await api('/account/settings', {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    state.account = accountData;
    if (state.onboardingData) {
      state.onboardingData.objetivo_slug = accountData.settings?.objetivo_slug || '';
      state.onboardingData.tenant_url =
        accountData.settings?.tenant_url || '';
    }
    state.profileObjectivePickerOpen = false;
    state.profileObjectiveDraft = '';
    renderHeader();
    renderProfileObjective();
    if (msg) {
      msg.textContent = t('profile.objectiveSaved');
      msg.className = 'form-msg ok';
    }
  } catch (error) {
    if (msg) {
      msg.textContent = error.message;
      msg.className = 'form-msg error';
    }
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
    }
  }
}

function renderProfileWhatsapp() {
  const fieldset = $('#profile-whatsapp-fieldset');
  const user = state.user;
  if (!fieldset || user?.role !== 'client') {
    fieldset?.classList.add('hidden');
    return;
  }

  fieldset.classList.remove('hidden');
  const wa = state.account?.whatsapp || {};
  const status = wa.connection_status || 'none';
  const connected = status === 'connected';
  const connectedEl = $('#profile-whatsapp-connected');
  const disconnectedEl = $('#profile-whatsapp-disconnected');

  connectedEl?.classList.toggle('hidden', !connected);
  disconnectedEl?.classList.toggle('hidden', connected);

  if (connected) {
    const rescanning =
      whatsappState.uiTarget === 'profile' && Boolean(whatsappState.pollTimer);
    if (!rescanning) {
      clearWhatsappPoll();
      whatsappState.uiTarget = 'landing';
      $('#profile-whatsapp-qr-panel')?.classList.add('hidden');
    }
    $('#btn-profile-whatsapp-reconnect')?.classList.remove('hidden');
    $('#btn-profile-whatsapp-change')?.classList.toggle('hidden', rescanning);
    $('#btn-profile-whatsapp-disconnect')?.classList.toggle('hidden', rescanning);

    const phoneEl = $('#profile-whatsapp-phone');
    if (phoneEl) {
      phoneEl.textContent = formatWhatsappPhone(wa.phone_number) || '—';
    }

    const badge = $('#profile-whatsapp-badge');
    if (badge) {
      badge.textContent = t('profile.whatsappStatusConnected');
      badge.className = 'pill ok';
    }

    const meta = $('#profile-whatsapp-connected-meta');
    if (meta) {
      meta.textContent = wa.connected_at
        ? t('profile.whatsappConnectedSince', {
            date: formatDate(wa.connected_at),
          })
        : '';
    }
    return;
  }

  const badge = $('#profile-whatsapp-disconnected-badge');
  if (badge) {
    badge.textContent = whatsappStatusLabel(status);
    badge.className = status === 'error' ? 'pill off' : 'pill warn';
  }

  const pollingInProfile =
    whatsappState.uiTarget === 'profile' && Boolean(whatsappState.pollTimer);
  if (!pollingInProfile) {
    $('#profile-whatsapp-qr-panel')?.classList.add('hidden');
    $('#btn-profile-whatsapp-reconnect')?.classList.remove('hidden');
    const qrMsg = $('#profile-whatsapp-qr-msg');
    if (qrMsg && !qrMsg.classList.contains('error')) {
      qrMsg.textContent = '';
      qrMsg.className = 'form-msg';
    }
  }
}

function bookingTodayIso() {
  const date = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function bookingAddDays(iso, days) {
  const date = new Date(`${iso}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function defaultBookingPreviewValues() {
  const checkin = bookingTodayIso();
  return {
    checkin,
    checkout: bookingAddDays(checkin, 1),
    adults: 1,
    children: 0,
    child_ages: '',
    rooms: 1,
  };
}

function renderMotorPreviewForm(container, values, previewUrl = '', hintKey = null, kind = activeMotorKind()) {
  if (!container) {
    return;
  }
  const v = values || defaultBookingPreviewValues();
  const def = motorDef(kind);
  const hintHtml = hintKey
    ? `<p class="field-hint">${escapeHtml(t(hintKey))}</p>`
    : '';
  if (kind === 'agenda') {
    container.innerHTML = `
      ${hintHtml}
      <div class="booking-preview-grid">
        <label>
          ${fieldLabelWithHelp(t('agenda.previewDate'), 'agenda.previewDateHelp')}
          <input type="date" class="booking-preview-checkin" value="${escapeHtml(v.checkin)}" />
        </label>
        <label>
          ${fieldLabelWithHelp(t('agenda.previewTime'), 'agenda.previewTimeHelp')}
          <input type="time" class="booking-preview-time" value="${escapeHtml(v.time || '10:00')}" />
        </label>
      </div>
      <button type="button" class="btn primary booking-preview-generate">${escapeHtml(mtk('generateLink', kind))}</button>
      <div class="booking-preview-result ${previewUrl ? '' : 'hidden'}">
        <a class="btn primary booking-preview-open" href="${escapeHtml(previewUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(mtk('previewLink', kind))}</a>
        <p class="booking-preview-link">${escapeHtml(previewUrl)}</p>
      </div>
    `;
    bindFieldHelpButtons(container);
    return;
  }
  container.innerHTML = `
    ${hintHtml}
    <div class="booking-preview-grid">
      <label>
        ${fieldLabelWithHelp(mtk('checkin', kind), `${def.tk}.checkinHelp`)}
        <input type="date" class="booking-preview-checkin" value="${escapeHtml(v.checkin)}" />
      </label>
      <label>
        ${fieldLabelWithHelp(mtk('checkout', kind), `${def.tk}.checkoutHelp`)}
        <input type="date" class="booking-preview-checkout" value="${escapeHtml(v.checkout)}" />
      </label>
      <label>
        ${fieldLabelWithHelp(mtk('adults', kind), `${def.tk}.adultsHelp`)}
        <input type="number" min="1" class="booking-preview-adults" value="${escapeHtml(String(v.adults))}" />
      </label>
      <label>
        ${fieldLabelWithHelp(mtk('children', kind), `${def.tk}.childrenHelp`)}
        <input type="number" min="0" class="booking-preview-children" value="${escapeHtml(String(v.children))}" />
      </label>
      <label>
        ${fieldLabelWithHelp(mtk('childAges', kind), `${def.tk}.childAgesHelp`)}
        <input type="text" class="booking-preview-child-ages" value="${escapeHtml(v.child_ages || '')}" placeholder="8" />
      </label>
      <label>
        ${fieldLabelWithHelp(mtk('rooms', kind), `${def.tk}.roomsHelp`)}
        <input type="number" min="1" class="booking-preview-rooms" value="${escapeHtml(String(v.rooms))}" />
      </label>
    </div>
    <button type="button" class="btn primary booking-preview-generate">${escapeHtml(mtk('generateLink', kind))}</button>
    <div class="booking-preview-result ${previewUrl ? '' : 'hidden'}">
      <a class="btn primary booking-preview-open" href="${escapeHtml(previewUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(mtk('previewLink', kind))}</a>
      <p class="booking-preview-link">${escapeHtml(previewUrl)}</p>
    </div>
  `;
  bindFieldHelpButtons(container);
}

function renderBookingPreviewForm(container, values, previewUrl = '', hintKey = null) {
  renderMotorPreviewForm(container, values, previewUrl, hintKey, 'booking');
}

function readBookingPreviewValues(container) {
  if (!container) {
    return defaultBookingPreviewValues();
  }
  return {
    checkin: container.querySelector('.booking-preview-checkin')?.value || '',
    checkout: container.querySelector('.booking-preview-checkout')?.value || '',
    time: container.querySelector('.booking-preview-time')?.value || '',
    adults: container.querySelector('.booking-preview-adults')?.value || '1',
    children: container.querySelector('.booking-preview-children')?.value || '0',
    child_ages: container.querySelector('.booking-preview-child-ages')?.value || '',
    rooms: container.querySelector('.booking-preview-rooms')?.value || '1',
  };
}

function updateBookingPreviewResult(container, url) {
  const result = container?.querySelector('.booking-preview-result');
  const openLink = container?.querySelector('.booking-preview-open');
  const urlEl = container?.querySelector('.booking-preview-link');
  if (!result || !openLink || !urlEl) {
    return;
  }
  if (!url) {
    result.classList.add('hidden');
    openLink.removeAttribute('href');
    urlEl.textContent = '';
    return;
  }
  result.classList.remove('hidden');
  openLink.href = url;
  urlEl.textContent = url;
}

async function generateMotorPreview(container, { sessionId = null, kind = activeMotorKind() } = {}) {
  const values = readBookingPreviewValues(container);
  const body = { ...values };
  if (sessionId) {
    body.session_id = sessionId;
  }
  const def = motorDef(kind);
  const data = await api(`${def.api}/preview`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  const store = motorStore(kind);
  store.previewValues = values;
  store.previewUrl = data.url;
  updateBookingPreviewResult(container, data.url);
  return data;
}

async function generateBookingPreview(container, options = {}) {
  return generateMotorPreview(container, { ...options, kind: 'booking' });
}

function formatScenarioAges(scenario) {
  if (!scenario.child_ages?.length) {
    return getLang() === 'en' ? 'none' : getLang() === 'pt' ? 'nenhum' : 'ninguno';
  }
  return scenario.child_ages.join(', ');
}

function renderMotorScenarios(scenarios, kind = activeMotorKind()) {
  const list = m$('scenarios-list', kind);
  const def = motorDef(kind);
  if (!list) {
    return;
  }
  if (kind === 'agenda') {
    list.innerHTML = scenarios
      .map(
        (scenario, index) => `
        <div class="booking-scenario card-inner">
          <h4>${escapeHtml(t('agenda.scenarioLabel', { n: index + 1 }))}</h4>
          <p>${escapeHtml(
            t('agenda.scenarioSlot', {
              date: scenario.checkin,
              time: scenario.time || '',
            })
          )}</p>
          <label>
            ${fieldLabelWithHelp(t('agenda.scenarioUrl'), 'agenda.scenarioUrlHelp')}
            <input type="url" class="booking-scenario-url" data-scenario-index="${index}" placeholder="https://…" />
          </label>
        </div>
      `
      )
      .join('');
    bindFieldHelpButtons(list);
    return;
  }
  list.innerHTML = scenarios
    .map((scenario, index) => {
      const guests =
        scenario.children > 0
          ? escapeHtml(
              t(`${def.tk}.scenarioGuests`, {
                adults: scenario.adults,
                children: scenario.children,
                ages: formatScenarioAges(scenario),
              })
            )
          : escapeHtml(
              t(`${def.tk}.scenarioAdults`, {
                adults: scenario.adults,
              })
            );
      return `
        <div class="booking-scenario card-inner">
          <h4>${escapeHtml(t(`${def.tk}.scenarioLabel`, { n: index + 1 }))}</h4>
          <p>${escapeHtml(t(`${def.tk}.scenarioRooms`, { rooms: scenario.rooms }))}</p>
          <p>${escapeHtml(
            t(`${def.tk}.scenarioDates`, {
              checkin: scenario.checkin,
              checkout: scenario.checkout,
            })
          )}</p>
          <p>${guests}</p>
          <label>
            ${fieldLabelWithHelp(t(`${def.tk}.scenarioUrl`), `${def.tk}.scenarioUrlHelp`)}
            <input type="url" class="booking-scenario-url" data-scenario-index="${index}" placeholder="https://…" />
          </label>
        </div>
      `;
    })
    .join('');
  bindFieldHelpButtons(list);
}

function renderBookingScenarios(scenarios) {
  renderMotorScenarios(scenarios, 'booking');
}

function renderMotorEngineView(kind = activeMotorKind()) {
  const def = motorDef(kind);
  const store = motorStore(kind);
  const settings = state.account?.settings || {};
  const approved = def.settingsApproved(settings);
  const approvedPanel = m$('approved-panel', kind);
  const wizard = m$('wizard', kind);
  const statusLabel = m$('status-label', kind);

  if (statusLabel) {
    statusLabel.textContent = approved
      ? mtk('statusApproved', kind)
      : mtk('statusPending', kind);
  }

  if (approved && !store.forceWizard) {
    approvedPanel?.classList.remove('hidden');
    wizard?.classList.add('hidden');
    const approvedPreview = m$('approved-preview', kind);
    const values = store.previewValues || defaultBookingPreviewValues();
    renderMotorPreviewForm(
      approvedPreview,
      values,
      store.previewUrl || '',
      `${def.tk}.previewApprovedHint`,
      kind
    );
    return;
  }

  approvedPanel?.classList.add('hidden');
  wizard?.classList.remove('hidden');
  renderMotorScenarios(store.scenarios || [], kind);

  const verifyStep = m$('step-verify', kind);
  const scenarioStep = m$('step-scenarios', kind);
  const hasVerification = Boolean(store.candidateTemplate);

  verifyStep?.classList.toggle('hidden', !hasVerification);
  scenarioStep?.classList.toggle('hidden', hasVerification);

  if (hasVerification) {
    const pct = Math.round((store.confidenceScore || 0) * 100);
    const confidenceEl = m$('confidence', kind);
    if (confidenceEl) {
      confidenceEl.textContent = t(`${def.tk}.confidence`, { pct });
    }

    const warningsEl = m$('warnings', kind);
    if (warningsEl) {
      const warnings = store.warnings || [];
      warningsEl.innerHTML = warnings
        .map((warning) => `<li>${escapeHtml(warning)}</li>`)
        .join('');
      warningsEl.classList.toggle('hidden', warnings.length === 0);
    }

    const dateFormatEl = m$('date-format', kind);
    if (dateFormatEl) {
      const fmt = store.dateFormat;
      if (fmt) {
        dateFormatEl.textContent = t(`${def.tk}.dateFormatDetected`, { format: fmt });
        dateFormatEl.classList.remove('hidden');
      } else {
        dateFormatEl.textContent = '';
        dateFormatEl.classList.add('hidden');
      }
    }

    const templateEl = m$('candidate-template', kind);
    if (templateEl) {
      templateEl.textContent = store.candidateTemplate || '';
    }

    const verifyPreview = m$('verify-preview', kind);
    const scenario = store.verification?.scenario;
    const values =
      store.previewValues ||
      (scenario
        ? {
            checkin: scenario.checkin,
            checkout: scenario.checkout,
            adults: scenario.adults,
            children: scenario.children,
            child_ages: (scenario.child_ages || []).join(','),
            rooms: scenario.rooms,
          }
        : defaultBookingPreviewValues());
    renderMotorPreviewForm(
      verifyPreview,
      values,
      store.previewUrl || store.verification?.url || '',
      null,
      kind
    );
  }
}

function renderBookingEngineView() {
  renderMotorEngineView('booking');
}

async function ensureMotorSession(forceNew = false, kind = activeMotorKind()) {
  const def = motorDef(kind);
  const store = motorStore(kind);
  const today = bookingTodayIso();
  const staleCheckin =
    store.scenarios?.[0]?.checkin && store.scenarios[0].checkin < today;

  if (!forceNew && !staleCheckin && store.sessionId && store.scenarios?.length) {
    return store;
  }

  const data = await api(`${def.api}/start`, { method: 'POST' });
  store.sessionId = data.session_id;
  store.scenarios = data.scenarios || [];
  store.verification = null;
  store.previewUrl = '';
  store.previewValues = null;
  store.candidateTemplate = '';
  store.confidenceScore = 0;
  store.warnings = [];
  store.dateFormat = '';
  store.forceWizard = true;
  return store;
}

async function ensureBookingSession(forceNew = false) {
  return ensureMotorSession(forceNew, 'booking');
}

async function refreshMotorEngine(kind = activeMotorKind()) {
  const def = motorDef(kind);
  const store = motorStore(kind);
  const user = state.user;
  if (!user || user.role !== 'client') {
    return;
  }

  const msg = m$('msg', kind);
  if (msg) {
    msg.textContent = '';
    msg.className = 'form-msg';
  }

  try {
    const data = await api(`${def.api}/state`);
    const payload = data[def.payloadKey];
    if (state.account && payload) {
      state.account.settings = {
        ...state.account.settings,
        ...payload,
      };
    }

    if (data.session) {
      store.sessionId = data.session.id;
      store.scenarios = data.session.scenarios || [];
      store.candidateTemplate = data.session.candidate_template || '';
      store.confidenceScore = data.session.confidence_score || 0;
      store.warnings = data.session.warnings || [];
      store.dateFormat = data.session.candidate_config?.date_format || '';
      if (data.session.verification_url) {
        store.verification = {
          url: data.session.verification_url,
          scenario: data.session.verification_scenario,
        };
      }
    } else if (payload?.[def.approvedField] !== 'approved') {
      await ensureMotorSession(false, kind);
    }

    store.forceWizard =
      payload?.[def.approvedField] !== 'approved' ||
      Boolean(data.session?.status === 'pending_verification');

    renderMotorEngineView(kind);
  } catch (error) {
    if (msg) {
      msg.textContent = error.message;
      msg.classList.add('error');
    }
  }
}

async function refreshBookingEngine() {
  return refreshMotorEngine('booking');
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
    btn.addEventListener('click', () => void openFaqDialog(Number(btn.dataset.edit)));
  });

  root.querySelectorAll('[data-delete]').forEach((btn) => {
    btn.addEventListener('click', () => deleteFaq(Number(btn.dataset.delete)));
  });
}

function faqCardHtml(faq, index) {
  const category = String(faq.category || '').trim() || 'Sin categoría';
  return `
    <article class="faq-card" data-faq-id="${faq.id}">
      <div class="faq-card-head">
        <span class="faq-card-num">#${index + 1}</span>
        <div class="faq-card-badges">
          <span class="pill off">${escapeHtml(t('table.modified'))}: ${escapeHtml(formatDate(faq.updated_at))}</span>
          ${statusPillTemplate(faq.is_starter_template)}
          ${statusPillActive(faq.active)}
          ${statusPillIndexed(faq.indexed_at)}
        </div>
      </div>
      <p class="faq-card-label">${escapeHtml(t('table.question'))}</p>
      <p class="faq-card-text">${escapeHtml(faq.question)}</p>
      <p class="faq-card-label">${escapeHtml(t('table.answer'))}</p>
      <p class="faq-card-text">${escapeHtml(faq.answer)}</p>
      <p class="faq-card-label">${escapeHtml(t('table.category'))}</p>
      <p class="faq-card-text">${escapeHtml(category)}</p>
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
      `<tr><td colspan="8" class="empty">${escapeHtml(t('dashboard.emptyAdmin'))}</td></tr>`;
    if (cards) {
      cards.innerHTML = `<p class="empty-block">${escapeHtml(t('dashboard.emptyAdmin'))}</p>`;
    }
    return;
  }

  clientActions.classList.remove('hidden');
  replaceWrap.classList.remove('hidden');
  $('#dashboard-hint').textContent = t('dashboard.hint');

  const faqs = sortFaqs(state.faqs, state.faqSort);
  applyFaqHeaderSortUi();
  const total = faqs.length;
  $('#faq-count').textContent = total
    ? total === 1
      ? t('dashboard.countOne')
      : t('dashboard.count', { n: total })
    : t('dashboard.none');

  if (total === 0) {
    const emptyText = escapeHtml(t('dashboard.empty'));
    tbody.innerHTML = `<tr><td colspan="8" class="empty">${emptyText}</td></tr>`;
    if (cards) {
      cards.innerHTML = `<p class="empty-block">${emptyText}</p>`;
    }
    return;
  }

  faqs.forEach((faq, index) => {
    const category = String(faq.category || '').trim() || 'Sin categoría';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="num">${index + 1}</td>
      <td class="cell-text" title="${escapeAttr(faq.question)}">${escapeHtml(faq.question)}</td>
      <td class="cell-text" title="${escapeAttr(faq.answer)}">${escapeHtml(faq.answer)}</td>
      <td class="cell-text" title="${escapeAttr(category)}">${escapeHtml(category)}</td>
      <td>${statusPillTemplate(faq.is_starter_template)} ${statusPillActive(faq.active)}</td>
      <td>${statusPillIndexed(faq.indexed_at)}</td>
      <td class="cell-text">${escapeHtml(formatDate(faq.updated_at))}</td>
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

function attachFaqHeaderSort() {
  const thead = document.querySelector('#view-dashboard thead');
  if (!thead || thead.dataset.sortBound === 'true') {
    return;
  }
  thead.dataset.sortBound = 'true';
  thead.addEventListener('click', (event) => {
    const th = event.target?.closest?.('th[data-sort-key]');
    const key = th?.dataset?.sortKey;
    if (!key) return;
    setFaqSort(key);
    renderFaqs();
  });
}

const DEFAULT_FAQ_CATEGORY = 'Sin categoría';

function isPersistedCategoryId(id) {
  const numeric = Number(id);
  return Number.isInteger(numeric) && numeric > 0;
}

function isDefaultFaqCategory(category) {
  return String(category?.name || '').trim() === DEFAULT_FAQ_CATEGORY;
}

async function loadFaqCategories() {
  if (state.user?.role !== 'client') {
    state.faqCategories = [];
    return [];
  }
  try {
    const data = await api('/faq-categories?include_inactive=true');
    state.faqCategories = Array.isArray(data.categories) ? data.categories : [];
  } catch {
    state.faqCategories = [];
  }
  return state.faqCategories;
}

function renderFaqCategorySelect(selectEl, selected = '') {
  if (!selectEl) return;

  const categories = Array.isArray(state.faqCategories) ? state.faqCategories : [];
  const normalized = String(selected || '').trim() || DEFAULT_FAQ_CATEGORY;
  const seen = new Set();
  const options = [];

  const pushOption = (name, active = true) => {
    const value = String(name || '').trim();
    if (!value || seen.has(value)) return;
    seen.add(value);
    const label =
      active === false ? `${value} (${t('faq.categoryInactive')})` : value;
    const selectedAttr = value === normalized ? ' selected' : '';
    options.push(
      `<option value="${escapeAttr(value)}"${selectedAttr}>${escapeHtml(label)}</option>`
    );
  };

  pushOption(DEFAULT_FAQ_CATEGORY, true);

  for (const category of categories) {
    if (category.active === false) continue;
    pushOption(category.name, true);
  }

  if (normalized && !seen.has(normalized)) {
    const found = categories.find((item) => item.name === normalized);
    pushOption(normalized, found ? found.active !== false : true);
  }

  selectEl.innerHTML = options.join('');
}

async function refreshProfileCategories() {
  const fieldset = $('#profile-categories-fieldset');
  if (!fieldset || state.user?.role !== 'client') {
    fieldset?.classList.add('hidden');
    return;
  }

  fieldset.classList.remove('hidden');
  await loadFaqCategories();
  renderProfileCategories();
}

function renderProfileCategories() {
  const fieldset = $('#profile-categories-fieldset');
  const list = $('#profile-categories-list');
  const msg = $('#profile-categories-msg');
  if (!fieldset || !list || state.user?.role !== 'client') {
    fieldset?.classList.add('hidden');
    return;
  }

  fieldset.classList.remove('hidden');
  const categories = (state.faqCategories || []).filter((item) =>
    isPersistedCategoryId(item.id)
  );

  if (!categories.length) {
    list.innerHTML = `<p class="empty-block">${escapeHtml(t('profile.categoriesLoading'))}</p>`;
    return;
  }

  const rows = categories
    .map((category) => {
      const id = String(category.id);
      const isDefault = isDefaultFaqCategory(category);
      const inactive = category.active === false;
      const deleteBtn = isDefault
        ? `<button type="button" class="btn small danger" disabled title="${escapeAttr(t('profile.categoryDeleteBlocked'))}">${escapeHtml(t('btn.delete'))}</button>`
        : `<button type="button" class="btn small danger" data-category-delete="${escapeAttr(id)}">${escapeHtml(t('btn.delete'))}</button>`;
      return `
      <tr class="${inactive ? 'is-inactive' : ''}" data-category-id="${escapeAttr(id)}">
        <td class="col-id">${escapeHtml(id)}</td>
        <td>
          <input
            type="text"
            class="profile-category-name-input"
            value="${escapeAttr(category.name || '')}"
            maxlength="128"
            ${isDefault ? 'readonly' : ''}
            aria-label="${escapeAttr(t('profile.categoryColName'))}"
          />
        </td>
        <td class="col-active">
          <input
            type="checkbox"
            class="profile-category-active-input"
            ${inactive ? '' : 'checked'}
            ${isDefault ? 'disabled' : ''}
            data-category-active="${escapeAttr(id)}"
            aria-label="${escapeAttr(t('profile.categoryColActive'))}"
          />
        </td>
        <td class="col-actions">
          <div class="profile-category-row-actions">
            <button type="button" class="btn small" data-category-save="${escapeAttr(id)}">${escapeHtml(t('btn.edit'))}</button>
            ${deleteBtn}
          </div>
        </td>
      </tr>`;
    })
    .join('');

  list.innerHTML = `
    <div class="profile-categories-table-wrap">
      <table class="profile-categories-table">
        <thead>
          <tr>
            <th class="col-id" scope="col">${escapeHtml(t('profile.categoryColId'))}</th>
            <th scope="col">${escapeHtml(t('profile.categoryColName'))}</th>
            <th class="col-active" scope="col">${escapeHtml(t('profile.categoryColActive'))}</th>
            <th class="col-actions" scope="col">${escapeHtml(t('profile.categoryColActions'))}</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;

  if (msg && !msg.classList.contains('error') && !msg.classList.contains('ok')) {
    msg.textContent = '';
    msg.className = 'form-msg';
  }
}

async function addProfileCategory() {
  const input = $('#profile-category-name');
  const msg = $('#profile-categories-msg');
  const name = input?.value.trim() || '';
  if (!name) {
    if (msg) {
      msg.textContent = t('profile.categoryRequired');
      msg.className = 'form-msg error';
    }
    input?.focus();
    return;
  }

  if (msg) {
    msg.textContent = t('msg.savingIndexing');
    msg.className = 'form-msg';
  }

  try {
    await api('/faq-categories', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
    if (input) input.value = '';
    await loadFaqCategories();
    renderProfileCategories();
    if (msg) {
      msg.textContent = t('profile.categorySaved');
      msg.className = 'form-msg ok';
    }
  } catch (error) {
    if (msg) {
      msg.textContent = error.message;
      msg.className = 'form-msg error';
    }
  }
}

async function saveProfileCategory(categoryId) {
  if (!isPersistedCategoryId(categoryId)) {
    const msg = $('#profile-categories-msg');
    if (msg) {
      msg.textContent = t('profile.categoriesReload');
      msg.className = 'form-msg error';
    }
    await refreshProfileCategories();
    return;
  }

  const row = document.querySelector(`[data-category-id="${CSS.escape(String(categoryId))}"]`);
  const name = row?.querySelector('.profile-category-name-input')?.value.trim() || '';
  const active = row?.querySelector('.profile-category-active-input')?.checked !== false;
  const msg = $('#profile-categories-msg');

  if (!name) {
    if (msg) {
      msg.textContent = t('profile.categoryRequired');
      msg.className = 'form-msg error';
    }
    return;
  }

  if (msg) {
    msg.textContent = t('msg.savingIndexing');
    msg.className = 'form-msg';
  }

  try {
    await api(`/faq-categories/${encodeURIComponent(categoryId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ name, active }),
    });
    await loadFaqCategories();
    renderProfileCategories();
    if (msg) {
      msg.textContent = t('profile.categorySaved');
      msg.className = 'form-msg ok';
    }
  } catch (error) {
    if (msg) {
      msg.textContent = error.message;
      msg.className = 'form-msg error';
    }
  }
}

async function deleteProfileCategory(categoryId) {
  if (!isPersistedCategoryId(categoryId)) {
    const msg = $('#profile-categories-msg');
    if (msg) {
      msg.textContent = t('profile.categoriesReload');
      msg.className = 'form-msg error';
    }
    await refreshProfileCategories();
    return;
  }

  const category = (state.faqCategories || []).find(
    (item) => String(item.id) === String(categoryId)
  );
  if (isDefaultFaqCategory(category)) {
    const msg = $('#profile-categories-msg');
    if (msg) {
      msg.textContent = t('profile.categoryDeleteBlocked');
      msg.className = 'form-msg error';
    }
    return;
  }

  const msg = $('#profile-categories-msg');
  if (msg) {
    msg.textContent = t('msg.savingIndexing');
    msg.className = 'form-msg';
  }

  try {
    await api(`/faq-categories/${encodeURIComponent(categoryId)}`, {
      method: 'DELETE',
    });
    await loadFaqCategories();
    renderProfileCategories();
    if (msg) {
      msg.textContent = t('profile.categoryDeleted');
      msg.className = 'form-msg ok';
    }
  } catch (error) {
    if (msg) {
      msg.textContent = error.message;
      msg.className = 'form-msg error';
    }
  }
}

async function setProfileCategoryActive(categoryId, active) {
  if (!isPersistedCategoryId(categoryId)) {
    const msg = $('#profile-categories-msg');
    if (msg) {
      msg.textContent = t('profile.categoriesReload');
      msg.className = 'form-msg error';
    }
    await refreshProfileCategories();
    return;
  }

  const category = (state.faqCategories || []).find(
    (item) => String(item.id) === String(categoryId)
  );
  if (isDefaultFaqCategory(category)) {
    await refreshProfileCategories();
    return;
  }

  const msg = $('#profile-categories-msg');
  if (msg) {
    msg.textContent = t('msg.savingIndexing');
    msg.className = 'form-msg';
  }

  try {
    await api(`/faq-categories/${encodeURIComponent(categoryId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ active: Boolean(active) }),
    });
    await loadFaqCategories();
    renderProfileCategories();
    if (msg) {
      msg.textContent = t('profile.categorySaved');
      msg.className = 'form-msg ok';
    }
  } catch (error) {
    if (msg) {
      msg.textContent = error.message;
      msg.className = 'form-msg error';
    }
    await refreshProfileCategories();
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

function unansweredById(id) {
  const numericId = Number(id);
  return state.unanswered.find((row) => Number(row.id) === numericId);
}

async function respondUnanswered(id) {
  const item = unansweredById(id);
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
  state.unanswered = (data.items || []).map((item) => ({
    ...item,
    id: Number(item.id),
  }));
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

    const item = unansweredById(id);
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
  const item = unansweredById(id);
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
    [t('profile.sectionObjective'), escapeHtml(tenant.objective_slug || '—')],
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
    [
      t('admin.customSpromptStatus'),
      escapeHtml(
        tenant.custom_sprompt_configured
          ? t('admin.customSpromptConfigured')
          : t('admin.customSpromptEmpty')
      ),
    ],
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

async function openAdminCustomSpromptDialog(id) {
  const dialog = $('#admin-custom-sprompt-dialog');
  const msg = $('#admin-custom-sprompt-msg');
  const text = $('#admin-custom-sprompt-text');
  const tenantIdInput = $('#admin-custom-sprompt-tenant-id');
  if (!dialog || !text || !tenantIdInput) {
    return;
  }

  if (msg) {
    msg.textContent = '';
    msg.className = 'form-msg';
  }

  try {
    const data = await api(`/admin/tenants/${id}/custom-sprompt`);
    tenantIdInput.value = String(data.tenant_id || id);
    text.value = data.custom_sprompt || '';
    $('#admin-custom-sprompt-dialog-title').textContent =
      `${t('admin.customSpromptTitle')}: ${data.slug || id}`;
    dialog.showModal();
  } catch (error) {
    const detailMsg = $('#admin-detail-msg');
    if (detailMsg) {
      detailMsg.textContent = error.message;
      detailMsg.className = 'form-msg error';
    }
  }
}

async function submitAdminCustomSprompt(event) {
  event.preventDefault();
  const tenantId = Number($('#admin-custom-sprompt-tenant-id')?.value);
  const msg = $('#admin-custom-sprompt-msg');
  const saveBtn = $('#admin-custom-sprompt-save');
  if (!tenantId) {
    return;
  }

  if (msg) {
    msg.textContent = t('admin.customSpromptSaving');
    msg.className = 'form-msg';
  }
  if (saveBtn) {
    saveBtn.disabled = true;
  }

  try {
    const data = await api(`/admin/tenants/${tenantId}/custom-sprompt`, {
      method: 'PUT',
      body: JSON.stringify({
        custom_sprompt: $('#admin-custom-sprompt-text')?.value || '',
      }),
    });
    state.adminTenants = state.adminTenants.map((row) =>
      Number(row.id) === tenantId
        ? {
            ...row,
            custom_sprompt: data.custom_sprompt || '',
            custom_sprompt_configured: Boolean(data.custom_sprompt_configured),
          }
        : row
    );
    const current = state.adminTenants.find((row) => Number(row.id) === tenantId);
    if (current && String($('#admin-tenant-id')?.value) === String(tenantId)) {
      renderAdminTenantDetail(current);
    }
    if (msg) {
      msg.textContent = t('admin.customSpromptSaved');
      msg.className = 'form-msg ok';
    }
  } catch (error) {
    if (msg) {
      msg.textContent = error.message;
      msg.className = 'form-msg error';
    }
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
    }
  }
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

function escapeCsvCell(value) {
  const raw = String(value ?? '');
  const escaped = raw.replaceAll('"', '""');
  // Excel-safe: always quote
  return `"${escaped}"`;
}

function buildFaqsCsv(faqs) {
  const header = ['id', 'question', 'answer', 'category_id', 'keywords', 'active'];
  const lines = [header.map(escapeCsvCell).join(',')];
  (faqs || []).forEach((faq) => {
    lines.push(
      [
        faq.id,
        faq.question,
        faq.answer,
        faq.category_id ?? '',
        faq.keywords || '',
        faq.active ? 'true' : 'false',
      ]
        .map(escapeCsvCell)
        .join(',')
    );
  });
  // Add BOM for Excel UTF-8 compatibility
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

function downloadTextFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType || 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}

function fieldLabelWithHelp(labelText, helpKey) {
  if (!helpKey) {
    return `<span>${escapeHtml(labelText)}</span>`;
  }
  const helpText = t(helpKey);
  if (!helpText || helpText === helpKey) {
    return `<span>${escapeHtml(labelText)}</span>`;
  }
  const panelId = `fh-${String(helpKey).replace(/\W+/g, '-')}-${Math.random().toString(36).slice(2, 7)}`;
  return `
    <span class="field-label-row">
      <span>${escapeHtml(labelText)}</span>
      <button type="button" class="field-help-btn" aria-expanded="false" aria-controls="${panelId}" data-help-key="${escapeAttr(helpKey)}" title="${escapeAttr(t('help.show'))}">?</button>
    </span>
    <p class="field-help-detail hidden" id="${panelId}" role="note">${escapeHtml(helpText)}</p>
  `;
}

function bindFieldHelpButtons(root) {
  if (!root) return;
  root.querySelectorAll('.field-help-btn').forEach((btn) => {
    if (btn.dataset.helpBound === '1') return;
    btn.dataset.helpBound = '1';
    btn.addEventListener('click', () => {
      const panelId = btn.getAttribute('aria-controls');
      const panel = panelId ? document.getElementById(panelId) : null;
      if (!panel) return;
      const willOpen = panel.classList.contains('hidden');
      root.querySelectorAll('.field-help-detail').forEach((el) => {
        el.classList.add('hidden');
      });
      root.querySelectorAll('.field-help-btn').forEach((other) => {
        other.setAttribute('aria-expanded', 'false');
      });
      if (willOpen) {
        panel.classList.remove('hidden');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });
}

const ONBOARDING_STEP_COUNT = 5;

function setOnboardingMsg(text, type = '') {
  const msg = $('#onboarding-msg');
  if (!msg) return;
  msg.textContent = text || '';
  msg.className = type ? `form-msg ${type}` : 'form-msg';
}

function updateOnboardingStepper(step) {
  $$('#onboarding-stepper .onboarding-step-marker').forEach((el) => {
    const n = Number(el.dataset.step);
    el.classList.toggle('is-active', n === step);
    el.classList.toggle('is-done', n < step);
  });
}

function showOnboardingPanel(step) {
  state.onboardingStep = step;
  for (let i = 1; i <= ONBOARDING_STEP_COUNT; i += 1) {
    $(`#onboarding-panel-${i}`)?.classList.toggle('hidden', i !== step);
  }
  updateOnboardingStepper(step);
  $('#btn-onboarding-back')?.classList.toggle('hidden', step <= 1);
  $('#btn-onboarding-next')?.classList.toggle('hidden', step >= ONBOARDING_STEP_COUNT);
  $('#btn-onboarding-finish')?.classList.toggle('hidden', step !== ONBOARDING_STEP_COUNT);
}

function renderOnboardingObjectives() {
  const grid = $('#onboarding-objectives');
  const data = state.onboardingData;
  if (!grid || !data?.objectives?.length) {
    return;
  }

  const selected =
    state.onboardingSelectedObjective || data.objetivo_slug || '';

  grid.innerHTML = data.objectives
    .map(
      (objective) => `
      <button
        type="button"
        class="objective-card${selected === objective.slug ? ' is-selected' : ''}"
        data-objective="${escapeAttr(objective.slug)}"
        role="option"
        aria-selected="${selected === objective.slug}"
      >
        <h4>${escapeHtml(objective.name)}</h4>
        <p>${escapeHtml(objective.description)}</p>
        <p class="objective-examples">${escapeHtml(objective.examples)}</p>
      </button>`
    )
    .join('');

  grid.querySelectorAll('[data-objective]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.onboardingSelectedObjective = btn.dataset.objective || '';
      grid.querySelectorAll('.objective-card').forEach((card) => {
        card.classList.toggle(
          'is-selected',
          card.dataset.objective === state.onboardingSelectedObjective
        );
      });
    });
  });
}

function renderOnboardingConfig() {
  const slug =
    state.onboardingSelectedObjective ||
    state.onboardingData?.objetivo_slug ||
    '';

  $('#onboarding-config-reservas')?.classList.toggle(
    'hidden',
    slug !== 'reservar_noches'
  );
  $('#onboarding-config-agenda')?.classList.toggle(
    'hidden',
    slug !== 'reservar_horarios'
  );
  $('#onboarding-config-web')?.classList.toggle(
    'hidden',
    slug !== 'enviar_a_sitio_web'
  );
  $('#onboarding-config-faq-only')?.classList.toggle(
    'hidden',
    slug !== 'responder_preguntas'
  );

  const bookingStatus = $('#onboarding-booking-status');
  if (bookingStatus) {
    const approved = Boolean(state.onboardingData?.booking_approved);
    bookingStatus.textContent = approved
      ? t('onboarding.bookingApproved')
      : t('onboarding.bookingOptional');
  }

  const agendaStatus = $('#onboarding-agenda-status');
  if (agendaStatus) {
    const approved = Boolean(state.onboardingData?.agenda_approved);
    agendaStatus.textContent = approved
      ? t('onboarding.agendaApproved')
      : t('onboarding.agendaOptional');
  }

  const destination = state.onboardingData?.tenant_url || '';
  const webUrl = $('#onboarding-web-url');
  if (webUrl && !webUrl.matches(':focus')) {
    webUrl.value = slug === 'enviar_a_sitio_web' ? destination : webUrl.value;
  }
}

async function seedOnboardingStarterFaqsFromApi() {
  try {
    const data = await api('/onboarding/seed-starter-faqs', { method: 'POST' });
    if (data.onboarding) {
      state.onboardingData = data.onboarding;
    } else if (data.starter_faqs) {
      state.onboardingData = {
        ...state.onboardingData,
        starter_faqs: data.starter_faqs,
      };
    }
    return (state.onboardingData?.starter_faqs || []).length >= 3;
  } catch {
    return false;
  }
}

async function reloadOnboardingStatus() {
  const data = await api('/onboarding/status');
  state.onboardingData = data.onboarding;
  state.onboardingSelectedObjective =
    data.onboarding.objetivo_slug || state.onboardingSelectedObjective || '';
  return data.onboarding;
}

async function ensureOnboardingFaqsReady() {
  if ((state.onboardingData?.starter_faqs || []).length >= 3) {
    renderOnboardingFaqs();
    return true;
  }

  let ready = await seedOnboardingStarterFaqsFromApi();
  if (!ready) {
    try {
      await reloadOnboardingStatus();
      ready = (state.onboardingData?.starter_faqs || []).length >= 3;
    } catch (error) {
      renderOnboardingFaqs();
      return false;
    }
  }

  renderOnboardingFaqs();
  return ready;
}

function onboardingFaqFieldsDiffer(faq, article) {
  const q = article.querySelector('.onboarding-faq-q')?.value?.trim() ?? '';
  const a = article.querySelector('.onboarding-faq-a')?.value?.trim() ?? '';
  const c = article.querySelector('.onboarding-faq-c')?.value?.trim() ?? '';
  const k = article.querySelector('.onboarding-faq-k')?.value?.trim() ?? '';
  return (
    q !== String(faq.question || '').trim() ||
    a !== String(faq.answer || '').trim() ||
    c !== String(faq.category || '').trim() ||
    k !== String(faq.keywords || '').trim()
  );
}

function syncOnboardingFaqTemplatePill(article, faq) {
  const pill = article.querySelector('.onboarding-faq-template-pill');
  if (!pill) return;
  const show = Boolean(faq.is_starter_template) && !onboardingFaqFieldsDiffer(faq, article);
  pill.classList.toggle('hidden', !show);
}

function attachOnboardingFaqEditors(list, faqs) {
  list.querySelectorAll('.onboarding-faq-item').forEach((article, index) => {
    const faq = faqs[index];
    if (!faq) return;
    const onChange = () => syncOnboardingFaqTemplatePill(article, faq);
    article.querySelectorAll('input, textarea').forEach((field) => {
      field.addEventListener('input', onChange);
    });
    syncOnboardingFaqTemplatePill(article, faq);
  });
}

function renderOnboardingFaqs() {
  const list = $('#onboarding-faqs-list');
  const faqs = state.onboardingData?.starter_faqs || [];
  const emptyHint = $('#onboarding-faqs-empty-hint');
  const reloadBtn = $('#btn-onboarding-reload-faqs');
  if (!list) return;

  const isEmpty = faqs.length === 0;
  emptyHint?.classList.toggle('hidden', !isEmpty);
  reloadBtn?.classList.toggle('hidden', !isEmpty);

  if (isEmpty) {
    list.innerHTML = '';
    return;
  }
  list.innerHTML = faqs
    .map(
      (faq) => `
      <article class="onboarding-faq-item" data-faq-id="${faq.id}">
        ${
          faq.is_starter_template
            ? `<span class="onboarding-faq-template-pill">${statusPillTemplate(true)}</span>`
            : ''
        }
        <label>
          <span>${escapeHtml(t('table.question'))}</span>
          <input type="text" class="onboarding-faq-q" value="${escapeAttr(faq.question)}" />
        </label>
        <label>
          <span>${escapeHtml(t('table.answer'))}</span>
          <textarea class="onboarding-faq-a" rows="3">${escapeHtml(faq.answer)}</textarea>
        </label>
        <label>
          <span>${escapeHtml(t('faq.category'))}</span>
          <input type="text" class="onboarding-faq-c" value="${escapeAttr(faq.category || '')}" />
        </label>
        <label>
          <span>${escapeHtml(t('faq.keywords'))}</span>
          <input type="text" class="onboarding-faq-k" value="${escapeAttr(faq.keywords || '')}" />
        </label>
      </article>`
    )
    .join('');
  attachOnboardingFaqEditors(list, faqs);
}

function collectOnboardingStarterFaqs() {
  return [...document.querySelectorAll('.onboarding-faq-item')].map((el) => ({
    id: Number(el.dataset.faqId),
    question: el.querySelector('.onboarding-faq-q')?.value?.trim(),
    answer: el.querySelector('.onboarding-faq-a')?.value?.trim(),
    category: el.querySelector('.onboarding-faq-c')?.value?.trim(),
    keywords: el.querySelector('.onboarding-faq-k')?.value?.trim(),
  }));
}

function syncOnboardingBusinessFields() {
  const data = state.onboardingData;
  const business = $('#onboarding-business');
  const welcome = $('#onboarding-welcome');
  const language = $('#onboarding-language');
  if (business) business.value = data?.business_name || '';
  if (welcome) welcome.value = data?.welcome_message || '';
  if (language) language.value = data?.primary_language || 'es';
}

async function refreshOnboarding() {
  setOnboardingMsg('');
  try {
    const data = await api('/onboarding/status');
    state.onboardingData = data.onboarding;
    state.onboardingSelectedObjective =
      data.onboarding.objetivo_slug || state.onboardingSelectedObjective || '';
    if (data.onboarding.onboarding_completed) {
      await openView('dashboard');
      return;
    }
  } catch (error) {
    setOnboardingMsg(error.message, 'error');
    return;
  }

  if (!state.onboardingStep || state.onboardingStep < 1) {
    state.onboardingStep = state.onboardingData?.objetivo_slug ? 2 : 1;
  }

  renderOnboardingObjectives();
  syncOnboardingBusinessFields();
  renderOnboardingConfig();
  renderOnboardingFaqs();
  showOnboardingPanel(state.onboardingStep);
}

async function saveOnboardingStep(step) {
  const payload = {};

  if (step === 1) {
    const slug = state.onboardingSelectedObjective;
    if (!slug) {
      setOnboardingMsg(t('onboarding.pickObjective'), 'error');
      return false;
    }
    payload.objetivo_slug = slug;
  }

  if (step === 2) {
    payload.business_name = $('#onboarding-business')?.value?.trim() || '';
    payload.welcome_message = $('#onboarding-welcome')?.value?.trim() || '';
    payload.primary_language = $('#onboarding-language')?.value || 'es';
    const tz = browserTimezone();
    if (tz) {
      payload.timezone = tz;
    }
  }

  if (step === 3) {
    const slug =
      state.onboardingSelectedObjective ||
      state.onboardingData?.objetivo_slug ||
      '';
    if (slug === 'enviar_a_sitio_web') {
      payload.tenant_url = $('#onboarding-web-url')?.value?.trim() || '';
    }
  }

  if (step === 4) {
    const collected = collectOnboardingStarterFaqs();
    if (collected.length > 0) {
      payload.starter_faqs = collected;
    }
  }

  try {
    const data = await api('/onboarding/setup', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    state.onboardingData = data.onboarding;
    state.onboardingSelectedObjective = data.onboarding.objetivo_slug || '';
    if (state.account?.settings) {
      state.account.settings.objetivo_slug = data.onboarding.objetivo_slug;
      state.account.settings.tenant_url = data.onboarding.tenant_url;
    }
    if (step === 4) {
      renderOnboardingFaqs();
    }
    renderHeader();
    return true;
  } catch (error) {
    setOnboardingMsg(error.message, 'error');
    return false;
  }
}

async function finishOnboarding() {
  if (!$('#onboarding-pause-ack')?.checked) {
    setOnboardingMsg(t('onboarding.pauseAck'), 'error');
    return;
  }

  const collected = collectOnboardingStarterFaqs();
  if (collected.length > 0) {
    const saved = await saveOnboardingStep(4);
    if (!saved) return;
  } else {
    try {
      const seeded = await seedOnboardingStarterFaqsFromApi();
      if (!seeded) {
        await reloadOnboardingStatus();
      }
    } catch (error) {
      setOnboardingMsg(error.message, 'error');
      showOnboardingPanel(4);
      renderOnboardingFaqs();
      return;
    }
    if ((state.onboardingData?.starter_faqs || []).length < 3) {
      setOnboardingMsg(t('onboarding.faqsMissing'), 'error');
      showOnboardingPanel(4);
      renderOnboardingFaqs();
      return;
    }
  }

  try {
    const data = await api('/onboarding/complete', {
      method: 'POST',
      body: JSON.stringify({ pause_acknowledged: true }),
    });
    state.onboardingData = data.onboarding;
    if (state.account?.settings) {
      state.account.settings.onboarding_completed = true;
    }
    setOnboardingMsg(t('onboarding.done'), 'ok');
    await ensureClientAppOrWhatsapp();
    renderHeader();
    await openView('dashboard');
  } catch (error) {
    setOnboardingMsg(error.message, 'error');
  }
}

async function loadSession() {
  try {
    const data = await api('/auth/me');
    state.user = data.user;

    if (!(await ensureClientAppOrWhatsapp())) {
      return;
    }

    await loadOnboardingState();
    showApp();
    renderHeader();
    const view = resolveClientEntryView(getRequestedView());
    setView(view);
    history.replaceState({ view }, '', `#${view}`);
    await refreshViewData(view);
    if (state.user.role === 'client' && view !== 'unanswered' && !clientNeedsOnboarding()) {
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
  attachFaqHeaderSort();
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
  await refreshPromptTemplates();
}

const SPROMPT_FIELDS = {
  role_template: '#sprompt-role',
  limits_template: '#sprompt-limits',
  tools_template: '#sprompt-tools',
  date_interpretation_template: '#sprompt-dates',
  data_collection_template: '#sprompt-data-collection',
  links_template: '#sprompt-links',
};

async function refreshPromptTemplates() {
  const select = $('#sprompt-objective-select');
  if (!select) {
    return;
  }
  try {
    const data = await api('/admin/prompt-templates');
    state.promptTemplates = data.templates || [];
  } catch {
    state.promptTemplates = [];
  }

  const previous = select.value;
  select.innerHTML = state.promptTemplates
    .map(
      (tpl) =>
        `<option value="${escapeAttr(tpl.objective_slug)}">${escapeHtml(
          tpl.objective_name || tpl.objective_slug
        )}</option>`
    )
    .join('');

  const target =
    state.promptTemplates.find((tpl) => tpl.objective_slug === previous)
      ?.objective_slug ||
    state.promptTemplates[0]?.objective_slug ||
    '';
  if (target) {
    select.value = target;
    renderPromptTemplateForm(target);
  }
}

function renderPromptTemplateForm(slug) {
  const tpl = (state.promptTemplates || []).find(
    (item) => item.objective_slug === slug
  );
  if (!tpl) {
    return;
  }
  const nameEl = $('#sprompt-objective-name');
  const statusEl = $('#sprompt-status');
  if (nameEl) nameEl.value = tpl.objective_name || '';
  if (statusEl) statusEl.value = tpl.status || 'draft';
  for (const [field, selector] of Object.entries(SPROMPT_FIELDS)) {
    const el = $(selector);
    if (el) el.value = tpl[field] || '';
  }
  const msg = $('#sprompt-msg');
  if (msg) {
    msg.textContent = '';
    msg.className = 'form-msg';
  }
}

async function savePromptTemplate() {
  const select = $('#sprompt-objective-select');
  const msg = $('#sprompt-msg');
  const slug = select?.value || '';
  if (!slug) {
    return;
  }

  const body = {
    objective_name: $('#sprompt-objective-name')?.value.trim() || '',
    status: $('#sprompt-status')?.value || 'draft',
  };
  for (const [field, selector] of Object.entries(SPROMPT_FIELDS)) {
    body[field] = $(selector)?.value ?? '';
  }

  if (msg) {
    msg.textContent = '';
    msg.className = 'form-msg';
  }

  try {
    const data = await api(`/admin/prompt-templates/${encodeURIComponent(slug)}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    const saved = data.template;
    state.promptTemplates = (state.promptTemplates || []).map((tpl) =>
      tpl.objective_slug === slug ? saved : tpl
    );
    const option = select?.querySelector(`option[value="${CSS.escape(slug)}"]`);
    if (option) option.textContent = saved.objective_name || saved.objective_slug;
    if (msg) {
      msg.textContent = t('sprompt.saved');
      msg.className = 'form-msg ok';
    }
  } catch (error) {
    if (msg) {
      msg.textContent = error.message;
      msg.className = 'form-msg error';
    }
  }
}

async function openFaqDialog(id) {
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
  $('#faq-keywords').value = faq?.keywords || '';
  $('#faq-active').checked = faq ? Boolean(faq.active) : true;
  $('#faq-msg').textContent = '';
  $('#faq-delete').classList.toggle('hidden', !id);

  await loadFaqCategories();
  renderFaqCategorySelect(
    $('#faq-category'),
    faq?.category || DEFAULT_FAQ_CATEGORY
  );

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
    await ensureClientAppOrWhatsapp();
    await loadOnboardingState();
    showApp();
    renderHeader();
    const view = resolveClientEntryView('dashboard');
    await openView(view);
    if (state.user.role === 'client' && !clientNeedsOnboarding()) {
      await refreshUnanswered();
    }
  } catch (error) {
    msg.textContent = error.message;
    msg.classList.add('error');
  }
});

$('#link-show-login')?.addEventListener('click', () => setLandingTab('login'));
$('#link-show-signup')?.addEventListener('click', () => setLandingTab('signup'));
$('#link-forgot-password')?.addEventListener('click', () => {
  $('#forgot-msg').textContent = '';
  $('#forgot-msg').className = 'form-msg';
  setLandingTab('forgot');
});
$('#link-forgot-back-login')?.addEventListener('click', () => setLandingTab('login'));
$('#link-reset-back-login')?.addEventListener('click', () => {
  history.replaceState(null, '', '/');
  setLandingTab('login');
});

$('#forgot-password-form')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const msg = $('#forgot-msg');
  msg.textContent = '';
  msg.className = 'form-msg';
  try {
    const data = await api('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({
        email: $('#forgot-email').value.trim(),
      }),
    });
    msg.textContent = data.message || t('forgot.sent');
    msg.classList.add('ok');
  } catch (error) {
    msg.textContent = error.message;
    msg.classList.add('error');
  }
});

$('#reset-password-form')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const msg = $('#reset-msg');
  msg.textContent = '';
  msg.className = 'form-msg';
  const password = $('#reset-password')?.value || '';
  const password2 = $('#reset-password2')?.value || '';
  const token = $('#reset-token')?.value || '';

  if (!token) {
    msg.textContent = t('reset.missingToken');
    msg.classList.add('error');
    return;
  }
  if (password !== password2) {
    msg.textContent = t('reset.mismatch');
    msg.classList.add('error');
    return;
  }

  try {
    const data = await api('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
    msg.textContent = data.message || t('reset.ok');
    msg.classList.add('ok');
    $('#reset-password').value = '';
    $('#reset-password2').value = '';
    setTimeout(() => {
      history.replaceState(null, '', '/');
      setLandingTab('login');
      const loginMsg = $('#login-msg');
      if (loginMsg) {
        loginMsg.textContent = t('reset.ok');
        loginMsg.className = 'form-msg ok';
      }
    }, 1200);
  } catch (error) {
    msg.textContent = error.message;
    msg.classList.add('error');
  }
});

async function bootApp() {
  const resetToken = readResetTokenFromUrl();
  if (resetToken !== null) {
    showLanding('reset');
    const tokenInput = $('#reset-token');
    if (tokenInput) {
      tokenInput.value = resetToken;
    }
    const msg = $('#reset-msg');
    if (!resetToken && msg) {
      msg.textContent = t('reset.missingToken');
      msg.className = 'form-msg error';
    }
    return;
  }
  await loadSession();
}

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
    whatsappState.uiTarget = 'landing';
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
  whatsappState.uiTarget = 'landing';
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

$('#btn-profile-whatsapp-reconnect')?.addEventListener('click', () => {
  startProfileWhatsappReconnect();
});

$('#btn-profile-whatsapp-change')?.addEventListener('click', () => {
  startProfileWhatsappReconnect();
});

$('#btn-profile-whatsapp-disconnect')?.addEventListener('click', () => {
  disconnectProfileWhatsapp();
});

$('#btn-profile-whatsapp-refresh-qr')?.addEventListener('click', () => {
  startProfileWhatsappReconnect();
});

$('#btn-profile-objective-change')?.addEventListener('click', () => {
  openProfileObjectivePicker();
});

$('#btn-profile-objective-cancel')?.addEventListener('click', () => {
  closeProfileObjectivePicker();
});

$('#btn-profile-objective-save')?.addEventListener('click', () => {
  void saveProfileObjective();
});

$('#btn-profile-category-add')?.addEventListener('click', () => {
  void addProfileCategory();
});

$('#profile-category-name')?.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    void addProfileCategory();
  }
});

$('#profile-categories-list')?.addEventListener('click', (event) => {
  const saveBtn = event.target.closest?.('[data-category-save]');
  if (saveBtn) {
    void saveProfileCategory(saveBtn.dataset.categorySave);
    return;
  }
  const deleteBtn = event.target.closest?.('[data-category-delete]');
  if (deleteBtn) {
    void deleteProfileCategory(deleteBtn.dataset.categoryDelete);
  }
});

$('#profile-categories-list')?.addEventListener('change', (event) => {
  const activeInput = event.target.closest?.('[data-category-active]');
  if (!activeInput || activeInput.disabled) return;
  void setProfileCategoryActive(
    activeInput.dataset.categoryActive,
    activeInput.checked
  );
});

async function logout() {
  try {
    await api('/auth/logout', { method: 'POST' });
  } catch {
    /* ignore */
  }
  clearWhatsappPoll();
  whatsappState.uiTarget = 'landing';
  whatsappState.instanceName = '';
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

async function deleteOwnAccount() {
  const slugInput = $('#account-delete-confirm-slug');
  const msg = $('#account-delete-msg');
  const slug = state.account?.tenant?.slug || state.user?.tenant?.slug || '';
  const typed = slugInput?.value.trim() || '';

  if (!slug || !msg) {
    return;
  }

  if (typed !== slug) {
    msg.textContent = t('account.deleteSlugMismatch');
    msg.className = 'form-msg error';
    slugInput?.focus();
    return;
  }

  const ok = window.confirm(t('account.deleteFinalConfirm', { slug }));
  if (!ok) {
    return;
  }

  msg.textContent = t('account.deleting');
  msg.className = 'form-msg';

  const btn = $('#btn-account-delete');
  if (btn) btn.disabled = true;

  try {
    await api('/account', {
      method: 'DELETE',
      body: JSON.stringify({ confirm_slug: typed }),
    });
    window.alert(t('account.deleteDone'));
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
    showLanding('login');
  } catch (error) {
    msg.textContent = error.message;
    msg.className = 'form-msg error';
    if (btn) btn.disabled = false;
  }
}

$('#btn-logout').addEventListener('click', logout);
$('#btn-logout-mobile')?.addEventListener('click', logout);
$('#btn-logout-profile')?.addEventListener('click', logout);
$('#btn-account-delete')?.addEventListener('click', deleteOwnAccount);

$$('[data-view]').forEach((btn) => {
  btn.addEventListener('click', () => openView(btn.dataset.view));
});

$('#btn-go-booking-engine')?.addEventListener('click', () => openView('booking-engine'));
$('#btn-onboarding-next')?.addEventListener('click', async () => {
  const step = state.onboardingStep || 1;
  const saved = await saveOnboardingStep(step);
  if (!saved) return;
  if (step >= ONBOARDING_STEP_COUNT) return;
  const next = step + 1;
  if (next === 3) renderOnboardingConfig();
  if (next === 4) {
    await ensureOnboardingFaqsReady();
  }
  showOnboardingPanel(next);
  if (next === 4 && (state.onboardingData?.starter_faqs || []).length < 3) {
    setOnboardingMsg(t('onboarding.faqsMissing'), 'error');
  } else {
    setOnboardingMsg('');
  }
});

$('#btn-onboarding-reload-faqs')?.addEventListener('click', async () => {
  setOnboardingMsg('');
  const ok = await ensureOnboardingFaqsReady();
  if (ok) {
    setOnboardingMsg('');
  } else {
    setOnboardingMsg(t('onboarding.faqsMissing'), 'error');
  }
});

$('#btn-onboarding-back')?.addEventListener('click', () => {
  const step = Math.max(1, (state.onboardingStep || 1) - 1);
  if (step === 4) {
    renderOnboardingFaqs();
  }
  if (step === 3) {
    renderOnboardingConfig();
  }
  showOnboardingPanel(step);
  setOnboardingMsg('');
});

$('#btn-onboarding-finish')?.addEventListener('click', () => finishOnboarding());

async function restartMotorEngineWizard(kind = activeMotorKind()) {
  motorStore(kind).forceWizard = true;
  await ensureMotorSession(true, kind);
  renderMotorEngineView(kind);
}

function bindMotorEngineEvents(kind) {
  const def = motorDef(kind);
  const store = () => motorStore(kind);

  m$('back', kind)?.addEventListener('click', () =>
    openView(state.bookingReturnView || 'profile')
  );

  $(`#view-${def.view}`)?.addEventListener('click', async (event) => {
    const btn = event.target.closest('.booking-preview-generate');
    if (!btn) return;
    const container = btn.closest('.booking-preview-form');
    const msg = m$('msg', kind);
    if (msg) {
      msg.textContent = '';
      msg.className = 'form-msg';
    }
    try {
      const verifyRoot = m$('verify-preview', kind);
      const sessionId = container?.closest(`#${def.prefix}-verify-preview`)
        ? store().sessionId
        : null;
      await generateMotorPreview(container, { sessionId, kind });
    } catch (error) {
      if (msg) {
        msg.textContent = error.message || mtk('msgError', kind);
        msg.classList.add('error');
      }
    }
  });

  m$('reconfigure', kind)?.addEventListener('click', () =>
    restartMotorEngineWizard(kind)
  );
  m$('reconfigure-wizard', kind)?.addEventListener('click', () =>
    restartMotorEngineWizard(kind)
  );

  m$('discover', kind)?.addEventListener('click', async () => {
    const msg = m$('msg', kind);
    if (!msg) return;
    msg.textContent = '';
    msg.className = 'form-msg';

    try {
      await ensureMotorSession(false, kind);
      const list = m$('scenarios-list', kind);
      const urls = [...(list?.querySelectorAll('.booking-scenario-url') || [])].map(
        (input) => input.value.trim()
      );
      if (urls.some((url) => !url)) {
        throw new Error(mtk('msgError', kind));
      }

      const data = await api(`${def.api}/discover`, {
        method: 'POST',
        body: JSON.stringify({
          session_id: store().sessionId,
          urls,
        }),
      });

      const s = store();
      s.candidateTemplate = data.candidate_template || '';
      s.confidenceScore = data.confidence_score || 0;
      s.warnings = data.warnings || [];
      s.dateFormat = data.date_format || '';
      s.verification = data.verification || null;
      s.previewUrl = data.verification?.url || '';
      renderMotorEngineView(kind);
      const verifyPreview = m$('verify-preview', kind);
      if (verifyPreview) {
        try {
          await generateMotorPreview(verifyPreview, {
            sessionId: s.sessionId,
            kind,
          });
        } catch {
          /* preview opcional */
        }
      }
      msg.textContent = mtk('msgAnalyzeOk', kind);
      msg.classList.add('ok');
    } catch (error) {
      msg.textContent = error.message || mtk('msgError', kind);
      msg.classList.add('error');
    }
  });

  m$('approve', kind)?.addEventListener('click', async () => {
    const msg = m$('msg', kind);
    if (!msg) return;
    msg.textContent = '';
    msg.className = 'form-msg';

    try {
      const data = await api(`${def.api}/approve`, {
        method: 'POST',
        body: JSON.stringify({ session_id: store().sessionId }),
      });
      const payload = data[def.payloadKey] || data.booking || data.agenda;
      if (state.account && payload) {
        state.account.settings = {
          ...state.account.settings,
          ...payload,
        };
      }
      const s = store();
      s.forceWizard = false;
      s.verification = null;
      s.previewUrl = '';
      s.previewValues = null;
      renderMotorEngineView(kind);
      renderProfile();
      renderOnboardingConfig();
      msg.textContent = mtk('msgApproved', kind);
      msg.classList.add('ok');
    } catch (error) {
      msg.textContent = error.message || mtk('msgError', kind);
      msg.classList.add('error');
    }
  });
}

$('#btn-onboarding-booking-engine')?.addEventListener('click', () => {
  state.bookingReturnView = 'onboarding';
  openView('booking-engine');
});

$('#btn-onboarding-agenda-engine')?.addEventListener('click', () => {
  state.bookingReturnView = 'onboarding';
  openView('agenda-engine');
});

$('#btn-go-agenda-engine')?.addEventListener('click', () => openView('agenda-engine'));

bindMotorEngineEvents('booking');
bindMotorEngineEvents('agenda');

window.addEventListener('popstate', () => {
  if (!state.user) {
    return;
  }
  const view = resolveView(getRequestedView());
  setView(view);
  refreshViewData(view);
});

$('#btn-new-faq').addEventListener('click', () => void openFaqDialog(null));

$('#btn-reindex-faqs').addEventListener('click', () => reindexFaqs());

$('#btn-export-faqs')?.addEventListener('click', () => {
  const faqs = state.faqs || [];
  const msg = $('#import-msg');
  if (!faqs.length) {
    msg.textContent = t('dashboard.none');
    msg.className = 'form-msg warn';
    return;
  }
  const slug = state.user?.tenant_slug || state.user?.tenant_id || 'tenant';
  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `faqs-${slug}-${stamp}.csv`;
  const csv = buildFaqsCsv(faqs);
  downloadTextFile(filename, csv, 'text/csv;charset=utf-8');
});

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
    category: $('#faq-category').value.trim() || DEFAULT_FAQ_CATEGORY,
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
        welcome_message: $('#profile-welcome-message')?.value.trim() || '',
        primary_language: $('#profile-primary-language')?.value || 'es',
      };
      const timezone = $('#profile-timezone')?.value || '';
      if (timezone) {
        accountBody.timezone = timezone;
      }
      const businessName = $('#profile-business').value.trim();
      if (businessName.length >= 2) {
        accountBody.business_name = businessName;
      }

      const objetivo =
        state.account?.settings?.objetivo_slug ||
        state.onboardingData?.objetivo_slug ||
        '';
      if (objetivo === 'enviar_a_sitio_web' || objetivo === 'reservar_horarios') {
        accountBody.tenant_url =
          $('#profile-destination-url')?.value.trim() || '';
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

$('#sprompt-objective-select')?.addEventListener('change', (event) => {
  renderPromptTemplateForm(event.target.value);
});

$('#sprompt-form')?.addEventListener('submit', (event) => {
  event.preventDefault();
  void savePromptTemplate();
});

$('#admin-reset-password')?.addEventListener('click', () => {
  resetAdminTenantPassword(Number($('#admin-tenant-id')?.value));
});

$('#admin-custom-sprompt')?.addEventListener('click', () => {
  openAdminCustomSpromptDialog(Number($('#admin-tenant-id')?.value));
});

$('#admin-custom-sprompt-form')?.addEventListener('submit', submitAdminCustomSprompt);

$('#admin-custom-sprompt-cancel')?.addEventListener('click', () => {
  $('#admin-custom-sprompt-dialog')?.close();
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

void bootApp();

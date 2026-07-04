const LANG_STORAGE_KEY = 'faq-inn-lang';
const SUPPORTED_LANGS = ['es', 'pt', 'en'];

const LOCALE_MAP = { es: 'es-CL', pt: 'pt-BR', en: 'en-US' };

const FLAG_LABELS = {
  es: 'Español',
  pt: 'Português',
  en: 'English',
};

const MESSAGES = {
  es: {
    'lang.label': 'Idioma',
    'nav.faqs': 'FAQs',
    'nav.unanswered': 'Sin respuesta',
    'nav.unansweredShort': 'Sin resp.',
    'nav.profile': 'Mi cuenta',
    'nav.profileShort': 'Cuenta',
    'nav.admin': 'Admin',
    'nav.logout': 'Salir',
    'nav.aria': 'Navegación principal',
    'login.title': 'Iniciar sesión',
    'login.lead': 'Administra las respuestas de tu negocio.',
    'login.email': 'Email',
    'login.password': 'Contraseña',
    'login.submit': 'Entrar',
    'login.showPassword': 'Mostrar contraseña',
    'login.hidePassword': 'Ocultar contraseña',
    'landing.hasAccount': '¿Ya tienes cuenta? Iniciar sesión',
    'landing.newBusiness': 'Registrar un negocio nuevo',
    'landing.welcome':
      'Si llegaste acá es porque te interesa levantar tu agente de WhatsApp para tu negocio.',
    'landing.flowTitle': 'Esto es lo que harás y cuánto puede tomar:',
    'landing.step1Title': 'Registra tu hotel',
    'landing.step1Time': '~3 min',
    'landing.step1Desc': 'Completas el formulario y creamos tu espacio en FAQ Inn.',
    'landing.step2Title': 'Carga tus preguntas y respuestas',
    'landing.step2Time': '~10 min',
    'landing.step2Desc': 'Importas o escribes las FAQs que el agente podrá usar.',
    'landing.step3Title': 'Vincula WhatsApp con QR',
    'landing.step3Time': '~5 min',
    'landing.step3Desc': 'Escaneas el código y conectas el número de tu negocio.',
    'landing.step4Title': 'Activamos tu agente',
    'landing.step4Time': '~2 min',
    'landing.step4Desc': 'FAQ Inn genera el workflow n8n y deja el agente listo.',
    'landing.step5Title': 'Prueba y salida a producción',
    'landing.step5Time': '~5 min',
    'landing.step5Desc': 'Envías un mensaje de prueba y confirmas que todo responde bien.',
    'landing.badgeNow': 'Paso actual',
    'landing.badgeAfterRegister': 'Justo después del registro',
    'landing.badgeSoon': 'Próxima etapa',
    'landing.flowTotal':
      'Hoy: registro y vinculación WhatsApp (~8 min). FAQs y agente automático en etapas siguientes.',
    'provision.title': 'Registra tu negocio',
    'provision.lead':
      'Nombre comercial y correo. Al continuar verás el QR para vincular WhatsApp.',
    'provision.commercialName': 'Nombre comercial',
    'provision.email': 'Correo electrónico',
    'provision.submit': 'Registrar y continuar',
    'provision.qrTitle': 'Escanea el QR',
    'provision.successTitle': 'WhatsApp conectado',
    'provision.successLead':
      'Tu número quedó vinculado en Evolution API. El agente conversacional se activará en una próxima etapa.',
    'dashboard.title': 'Preguntas y respuestas',
    'dashboard.hint':
      'Columna A: pregunta, columna B: respuesta. Formatos: .xlsx, .xls, .csv. Al guardar o importar, cada FAQ se indexa en Qdrant.',
    'dashboard.hintAdmin':
      'Como administrador, crea posadas en Admin. Los clientes editan sus FAQs.',
    'dashboard.import': 'Importar Excel',
    'dashboard.reindex': 'Sincronizar Qdrant',
    'dashboard.newFaq': 'Nueva FAQ',
    'dashboard.replaceAll': 'Reemplazar todas las FAQs al importar',
    'dashboard.emptyAdmin': 'Sin FAQs en esta vista.',
    'dashboard.empty': 'Sin FAQs. Importa un Excel o crea la primera.',
    'dashboard.count': '{n} FAQs en total',
    'dashboard.countOne': '1 FAQ en total',
    'dashboard.none': 'Sin FAQs todavía',
    'table.question': 'Pregunta',
    'table.answer': 'Respuesta',
    'table.status': 'Estado',
    'table.index': 'Índice',
    'table.slug': 'Slug',
    'table.businessName': 'Nombre negocio',
    'table.clientEmail': 'Email cliente',
    'table.agent': 'Agente',
    'status.active': 'Activa',
    'status.inactive': 'Inactiva',
    'status.indexed': 'Indexada',
    'status.pendingIndex': 'Pendiente',
    'status.pending': 'Pendiente',
    'status.converted': 'Convertida',
    'status.ignored': 'Ignorada',
    'status.duplicate': 'Duplicada',
    'status.resolved': 'Resuelta',
    'btn.edit': 'Editar',
    'btn.delete': 'Eliminar',
    'btn.cancel': 'Cancelar',
    'btn.save': 'Guardar cambios',
    'btn.saveIndex': 'Guardar e indexar',
    'btn.respond': 'Responderla',
    'btn.saveQuestion': 'Guardar consulta',
    'btn.createTenant': 'Crear posada',
    'unanswered.title': 'Preguntas sin respuesta',
    'unanswered.hint':
      'Escribe la respuesta aquí mismo y pulsa <strong>Responderla</strong> para guardar la FAQ e indexarla en Qdrant.',
    'unanswered.filter': 'Estado',
    'unanswered.filterAll': 'Todas',
    'unanswered.filterPending': 'Pendientes',
    'unanswered.filterConverted': 'Convertidas',
    'unanswered.filterIgnored': 'Ignoradas',
    'unanswered.filterResolved': 'Resueltas manual',
    'unanswered.clientsOnly': 'Vista solo para clientes.',
    'unanswered.count': '{n} registro(s) — {p} pendiente(s)',
    'unanswered.emptyFilter': 'Sin registros con este filtro',
    'unanswered.emptyList': 'No hay preguntas sin respuesta con este filtro.',
    'unanswered.dateTime': 'Fecha y hora',
    'unanswered.phone': 'Teléfono',
    'unanswered.query': 'Consulta',
    'unanswered.yourAnswer': 'Tu respuesta',
    'unanswered.answerPlaceholder': 'Escribe aquí la respuesta que debe dar el agente…',
    'profile.title': 'Mi cuenta',
    'profile.email': 'Email (login)',
    'profile.emailHint': 'Para cambiar el email debes ingresar tu contraseña actual abajo.',
    'profile.business': 'Nombre del negocio',
    'profile.businessPlaceholder': 'Ej. Hotel Vista Mar',
    'profile.businessExample': 'Ej. {name}',
    'profile.slug': 'Slug técnico (Qdrant / n8n)',
    'profile.changePassword': 'Cambiar contraseña',
    'profile.currentPassword': 'Contraseña actual',
    'profile.newPassword': 'Nueva contraseña',
    'profile.globalAdmin': 'Administración global',
    'profile.myBusiness': 'Mi negocio',
    'admin.title': 'Administrar posadas',
    'admin.newTenant': 'Nueva posada',
    'admin.slug': 'Slug técnico (para Qdrant / n8n)',
    'admin.clientEmail': 'Email del cliente (login)',
    'admin.initialPassword': 'Contraseña inicial',
    'admin.agentSlug': 'Slug del agente (opcional)',
    'admin.empty': 'Sin posadas.',
    'admin.cardBusiness': 'Negocio',
    'admin.cardEmail': 'Email',
    'admin.cardAgent': 'Agente',
    'faq.edit': 'Editar FAQ',
    'faq.new': 'Nueva FAQ',
    'faq.category': 'Categoría',
    'faq.keywords': 'Keywords',
    'faq.keywordsPlaceholder': 'wifi, internet, reserva',
    'faq.active': 'Activa',
    'msg.writeAnswer': 'Escribe una respuesta antes de guardar.',
    'msg.savingFaq': 'Guardando FAQ e indexando en Qdrant…',
    'msg.savedIndexed': 'Respuesta guardada e indexada en Qdrant.',
    'msg.queryEmpty': 'La consulta no puede quedar vacía.',
    'msg.savingQuery': 'Guardando consulta…',
    'msg.querySaved': 'Consulta guardada.',
    'msg.deleteQuestionConfirm':
      '¿Borrar esta pregunta?\n\n"{q}"\n\nSe eliminará de forma permanente.',
    'msg.deleting': 'Borrando…',
    'msg.questionDeleted': 'Pregunta borrada.',
    'msg.importing': 'Importando e indexando… puede tardar unos segundos.',
    'msg.importDone': 'Importación completada.',
    'msg.importDeleted': ' ({n} eliminadas antes de importar)',
    'msg.importErrors': ' — {n} fila(s) con error.',
    'msg.faqNotFound': 'No se encontró la FAQ en la lista. Recarga la página e intenta de nuevo.',
    'msg.deleteFaqConfirm':
      '¿Eliminar esta FAQ?\n\n"{q}"\n\nSe borrará de la base de datos y de Qdrant.',
    'msg.deletingFaq': 'Eliminando…',
    'msg.faqDeleted': 'FAQ eliminada.',
    'msg.reindexConfirm':
      '¿Sincronizar Qdrant con las {n} FAQ(s) actuales?\n\nSe borrarán puntos huérfanos en Qdrant y se reindexará todo.',
    'msg.reindexEmpty':
      '¿Limpiar Qdrant? No hay FAQs en MariaDB; se eliminarán todos los puntos del tenant.',
    'msg.syncing': 'Sincronizando Qdrant… puede tardar unos segundos.',
    'msg.synced': 'Qdrant sincronizado.',
    'msg.savingIndexing': 'Guardando e indexando…',
    'msg.profileSaved': 'Cambios guardados.',
    'msg.passwordRequiredForEmail':
      'Ingresa tu contraseña actual para cambiar el email.',
    'msg.tenantCreated': 'Posada creada. El cliente puede ingresar con su email.',
  },
  pt: {
    'lang.label': 'Idioma',
    'nav.faqs': 'FAQs',
    'nav.unanswered': 'Sem resposta',
    'nav.unansweredShort': 'Sem resp.',
    'nav.profile': 'Minha conta',
    'nav.profileShort': 'Conta',
    'nav.admin': 'Admin',
    'nav.logout': 'Sair',
    'nav.aria': 'Navegação principal',
    'login.title': 'Entrar',
    'login.lead': 'Gerencie as respostas do seu negócio.',
    'login.email': 'Email',
    'login.password': 'Senha',
    'login.submit': 'Entrar',
    'login.showPassword': 'Mostrar senha',
    'login.hidePassword': 'Ocultar senha',
    'dashboard.title': 'Perguntas e respostas',
    'dashboard.hint':
      'Coluna A: pergunta, coluna B: resposta. Formatos: .xlsx, .xls, .csv. Ao salvar ou importar, cada FAQ é indexada no Qdrant.',
    'dashboard.hintAdmin':
      'Como administrador, crie pousadas em Admin. Os clientes editam suas FAQs.',
    'dashboard.import': 'Importar Excel',
    'dashboard.reindex': 'Sincronizar Qdrant',
    'dashboard.newFaq': 'Nova FAQ',
    'dashboard.replaceAll': 'Substituir todas as FAQs ao importar',
    'dashboard.emptyAdmin': 'Sem FAQs nesta visualização.',
    'dashboard.empty': 'Sem FAQs. Importe um Excel ou crie a primeira.',
    'dashboard.count': '{n} FAQs no total',
    'dashboard.countOne': '1 FAQ no total',
    'dashboard.none': 'Ainda sem FAQs',
    'table.question': 'Pergunta',
    'table.answer': 'Resposta',
    'table.status': 'Status',
    'table.index': 'Índice',
    'table.slug': 'Slug',
    'table.businessName': 'Nome do negócio',
    'table.clientEmail': 'Email do cliente',
    'table.agent': 'Agente',
    'status.active': 'Ativa',
    'status.inactive': 'Inativa',
    'status.indexed': 'Indexada',
    'status.pendingIndex': 'Pendente',
    'status.pending': 'Pendente',
    'status.converted': 'Convertida',
    'status.ignored': 'Ignorada',
    'status.duplicate': 'Duplicada',
    'status.resolved': 'Resolvida',
    'btn.edit': 'Editar',
    'btn.delete': 'Excluir',
    'btn.cancel': 'Cancelar',
    'btn.save': 'Salvar alterações',
    'btn.saveIndex': 'Salvar e indexar',
    'btn.respond': 'Responder',
    'btn.saveQuestion': 'Salvar consulta',
    'btn.createTenant': 'Criar pousada',
    'unanswered.title': 'Perguntas sem resposta',
    'unanswered.hint':
      'Escreva a resposta aqui e clique em <strong>Responder</strong> para salvar a FAQ e indexá-la no Qdrant.',
    'unanswered.filter': 'Status',
    'unanswered.filterAll': 'Todas',
    'unanswered.filterPending': 'Pendentes',
    'unanswered.filterConverted': 'Convertidas',
    'unanswered.filterIgnored': 'Ignoradas',
    'unanswered.filterResolved': 'Resolvidas manual',
    'unanswered.clientsOnly': 'Visualização apenas para clientes.',
    'unanswered.count': '{n} registro(s) — {p} pendente(s)',
    'unanswered.emptyFilter': 'Sem registros com este filtro',
    'unanswered.emptyList': 'Não há perguntas sem resposta com este filtro.',
    'unanswered.dateTime': 'Data e hora',
    'unanswered.phone': 'Telefone',
    'unanswered.query': 'Consulta',
    'unanswered.yourAnswer': 'Sua resposta',
    'unanswered.answerPlaceholder': 'Escreva aqui a resposta que o agente deve dar…',
    'profile.title': 'Minha conta',
    'profile.email': 'Email (login)',
    'profile.emailHint': 'Para alterar o email, informe sua senha atual abaixo.',
    'profile.business': 'Nome do negócio',
    'profile.businessPlaceholder': 'Ex. Hotel Vista Mar',
    'profile.businessExample': 'Ex. {name}',
    'profile.slug': 'Slug técnico (Qdrant / n8n)',
    'profile.changePassword': 'Alterar senha',
    'profile.currentPassword': 'Senha atual',
    'profile.newPassword': 'Nova senha',
    'profile.globalAdmin': 'Administração global',
    'profile.myBusiness': 'Meu negócio',
    'admin.title': 'Administrar pousadas',
    'admin.newTenant': 'Nova pousada',
    'admin.slug': 'Slug técnico (para Qdrant / n8n)',
    'admin.clientEmail': 'Email do cliente (login)',
    'admin.initialPassword': 'Senha inicial',
    'admin.agentSlug': 'Slug do agente (opcional)',
    'admin.empty': 'Sem pousadas.',
    'admin.cardBusiness': 'Negócio',
    'admin.cardEmail': 'Email',
    'admin.cardAgent': 'Agente',
    'faq.edit': 'Editar FAQ',
    'faq.new': 'Nova FAQ',
    'faq.category': 'Categoria',
    'faq.keywords': 'Keywords',
    'faq.keywordsPlaceholder': 'wifi, internet, reserva',
    'faq.active': 'Ativa',
    'msg.writeAnswer': 'Escreva uma resposta antes de salvar.',
    'msg.savingFaq': 'Salvando FAQ e indexando no Qdrant…',
    'msg.savedIndexed': 'Resposta salva e indexada no Qdrant.',
    'msg.queryEmpty': 'A consulta não pode ficar vazia.',
    'msg.savingQuery': 'Salvando consulta…',
    'msg.querySaved': 'Consulta salva.',
    'msg.deleteQuestionConfirm':
      'Excluir esta pergunta?\n\n"{q}"\n\nSerá removida permanentemente.',
    'msg.deleting': 'Excluindo…',
    'msg.questionDeleted': 'Pergunta excluída.',
    'msg.importing': 'Importando e indexando… pode levar alguns segundos.',
    'msg.importDone': 'Importação concluída.',
    'msg.importDeleted': ' ({n} removidas antes de importar)',
    'msg.importErrors': ' — {n} linha(s) com erro.',
    'msg.faqNotFound': 'FAQ não encontrada na lista. Recarregue a página e tente novamente.',
    'msg.deleteFaqConfirm':
      'Excluir esta FAQ?\n\n"{q}"\n\nSerá removida do banco de dados e do Qdrant.',
    'msg.deletingFaq': 'Excluindo…',
    'msg.faqDeleted': 'FAQ excluída.',
    'msg.reindexConfirm':
      'Sincronizar o Qdrant com as {n} FAQ(s) atuais?\n\nPontos órfãos no Qdrant serão removidos e tudo será reindexado.',
    'msg.reindexEmpty':
      'Limpar o Qdrant? Não há FAQs no MariaDB; todos os pontos do tenant serão removidos.',
    'msg.syncing': 'Sincronizando Qdrant… pode levar alguns segundos.',
    'msg.synced': 'Qdrant sincronizado.',
    'msg.savingIndexing': 'Salvando e indexando…',
    'msg.profileSaved': 'Alterações salvas.',
    'msg.passwordRequiredForEmail':
      'Informe sua senha atual para alterar o email.',
    'msg.tenantCreated': 'Pousada criada. O cliente pode entrar com seu email.',
  },
  en: {
    'lang.label': 'Language',
    'nav.faqs': 'FAQs',
    'nav.unanswered': 'Unanswered',
    'nav.unansweredShort': 'Unanswered',
    'nav.profile': 'My account',
    'nav.profileShort': 'Account',
    'nav.admin': 'Admin',
    'nav.logout': 'Log out',
    'nav.aria': 'Main navigation',
    'login.title': 'Sign in',
    'login.lead': 'Manage your business answers.',
    'login.email': 'Email',
    'login.password': 'Password',
    'login.submit': 'Sign in',
    'login.showPassword': 'Show password',
    'login.hidePassword': 'Hide password',
    'dashboard.title': 'Questions and answers',
    'dashboard.hint':
      'Column A: question, column B: answer. Formats: .xlsx, .xls, .csv. When saving or importing, each FAQ is indexed in Qdrant.',
    'dashboard.hintAdmin':
      'As administrator, create lodgings in Admin. Clients edit their FAQs.',
    'dashboard.import': 'Import Excel',
    'dashboard.reindex': 'Sync Qdrant',
    'dashboard.newFaq': 'New FAQ',
    'dashboard.replaceAll': 'Replace all FAQs on import',
    'dashboard.emptyAdmin': 'No FAQs in this view.',
    'dashboard.empty': 'No FAQs. Import an Excel file or create the first one.',
    'dashboard.count': '{n} FAQs in total',
    'dashboard.countOne': '1 FAQ in total',
    'dashboard.none': 'No FAQs yet',
    'table.question': 'Question',
    'table.answer': 'Answer',
    'table.status': 'Status',
    'table.index': 'Index',
    'table.slug': 'Slug',
    'table.businessName': 'Business name',
    'table.clientEmail': 'Client email',
    'table.agent': 'Agent',
    'status.active': 'Active',
    'status.inactive': 'Inactive',
    'status.indexed': 'Indexed',
    'status.pendingIndex': 'Pending',
    'status.pending': 'Pending',
    'status.converted': 'Converted',
    'status.ignored': 'Ignored',
    'status.duplicate': 'Duplicate',
    'status.resolved': 'Resolved',
    'btn.edit': 'Edit',
    'btn.delete': 'Delete',
    'btn.cancel': 'Cancel',
    'btn.save': 'Save changes',
    'btn.saveIndex': 'Save and index',
    'btn.respond': 'Answer it',
    'btn.saveQuestion': 'Save question',
    'btn.createTenant': 'Create lodging',
    'unanswered.title': 'Unanswered questions',
    'unanswered.hint':
      'Write the answer here and click <strong>Answer it</strong> to save the FAQ and index it in Qdrant.',
    'unanswered.filter': 'Status',
    'unanswered.filterAll': 'All',
    'unanswered.filterPending': 'Pending',
    'unanswered.filterConverted': 'Converted',
    'unanswered.filterIgnored': 'Ignored',
    'unanswered.filterResolved': 'Manually resolved',
    'unanswered.clientsOnly': 'View for clients only.',
    'unanswered.count': '{n} record(s) — {p} pending',
    'unanswered.emptyFilter': 'No records with this filter',
    'unanswered.emptyList': 'No unanswered questions with this filter.',
    'unanswered.dateTime': 'Date and time',
    'unanswered.phone': 'Phone',
    'unanswered.query': 'Question',
    'unanswered.yourAnswer': 'Your answer',
    'unanswered.answerPlaceholder': 'Write here the answer the agent should give…',
    'profile.title': 'My account',
    'profile.email': 'Email (login)',
    'profile.emailHint': 'To change your email, enter your current password below.',
    'profile.business': 'Business name',
    'profile.businessPlaceholder': 'E.g. Ocean View Hotel',
    'profile.businessExample': 'E.g. {name}',
    'profile.slug': 'Technical slug (Qdrant / n8n)',
    'profile.changePassword': 'Change password',
    'profile.currentPassword': 'Current password',
    'profile.newPassword': 'New password',
    'profile.globalAdmin': 'Global administration',
    'profile.myBusiness': 'My business',
    'admin.title': 'Manage lodgings',
    'admin.newTenant': 'New lodging',
    'admin.slug': 'Technical slug (for Qdrant / n8n)',
    'admin.clientEmail': 'Client email (login)',
    'admin.initialPassword': 'Initial password',
    'admin.agentSlug': 'Agent slug (optional)',
    'admin.empty': 'No lodgings.',
    'admin.cardBusiness': 'Business',
    'admin.cardEmail': 'Email',
    'admin.cardAgent': 'Agent',
    'faq.edit': 'Edit FAQ',
    'faq.new': 'New FAQ',
    'faq.category': 'Category',
    'faq.keywords': 'Keywords',
    'faq.keywordsPlaceholder': 'wifi, internet, booking',
    'faq.active': 'Active',
    'msg.writeAnswer': 'Write an answer before saving.',
    'msg.savingFaq': 'Saving FAQ and indexing in Qdrant…',
    'msg.savedIndexed': 'Answer saved and indexed in Qdrant.',
    'msg.queryEmpty': 'The question cannot be empty.',
    'msg.savingQuery': 'Saving question…',
    'msg.querySaved': 'Question saved.',
    'msg.deleteQuestionConfirm':
      'Delete this question?\n\n"{q}"\n\nIt will be permanently removed.',
    'msg.deleting': 'Deleting…',
    'msg.questionDeleted': 'Question deleted.',
    'msg.importing': 'Importing and indexing… this may take a few seconds.',
    'msg.importDone': 'Import completed.',
    'msg.importDeleted': ' ({n} deleted before import)',
    'msg.importErrors': ' — {n} row(s) with errors.',
    'msg.faqNotFound': 'FAQ not found in the list. Reload the page and try again.',
    'msg.deleteFaqConfirm':
      'Delete this FAQ?\n\n"{q}"\n\nIt will be removed from the database and Qdrant.',
    'msg.deletingFaq': 'Deleting…',
    'msg.faqDeleted': 'FAQ deleted.',
    'msg.reindexConfirm':
      'Sync Qdrant with the current {n} FAQ(s)?\n\nOrphan points in Qdrant will be removed and everything reindexed.',
    'msg.reindexEmpty':
      'Clear Qdrant? There are no FAQs in MariaDB; all tenant points will be removed.',
    'msg.syncing': 'Syncing Qdrant… this may take a few seconds.',
    'msg.synced': 'Qdrant synced.',
    'msg.savingIndexing': 'Saving and indexing…',
    'msg.profileSaved': 'Changes saved.',
    'msg.passwordRequiredForEmail':
      'Enter your current password to change your email.',
    'msg.tenantCreated': 'Lodging created. The client can sign in with their email.',
  },
};

let currentLang = 'es';

function detectBrowserLang() {
  const raw = (navigator.language || navigator.userLanguage || 'es').toLowerCase();
  if (raw.startsWith('pt')) return 'pt';
  if (raw.startsWith('en')) return 'en';
  return 'es';
}

function getStoredLang() {
  try {
    const stored = localStorage.getItem(LANG_STORAGE_KEY);
    if (SUPPORTED_LANGS.includes(stored)) {
      return stored;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function initLang() {
  currentLang = getStoredLang() || detectBrowserLang();
  if (!SUPPORTED_LANGS.includes(currentLang)) {
    currentLang = 'es';
  }
  document.documentElement.lang = currentLang;
}

function getLang() {
  return currentLang;
}

function getLocale() {
  return LOCALE_MAP[currentLang] || LOCALE_MAP.es;
}

function t(key, params = {}) {
  const bundle = MESSAGES[currentLang] || MESSAGES.es;
  const fallback = MESSAGES.es;
  let text = bundle[key] ?? fallback[key] ?? key;
  for (const [name, value] of Object.entries(params)) {
    text = text.replaceAll(`{${name}}`, String(value));
  }
  return text;
}

function setLang(lang, { persist = true } = {}) {
  if (!SUPPORTED_LANGS.includes(lang)) {
    return;
  }
  currentLang = lang;
  document.documentElement.lang = lang;
  if (persist) {
    try {
      localStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch {
      /* ignore */
    }
  }
  updateLangPickerUI();
  applyI18n();
  if (typeof window.onLangChange === 'function') {
    window.onLangChange(lang);
  }
}

function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n;
    const text = t(key);
    if (el.dataset.i18nAttr) {
      el.setAttribute(el.dataset.i18nAttr, text);
    } else if (el.dataset.i18nHtml === 'true') {
      el.innerHTML = text;
    } else if (el.tagName === 'OPTION') {
      el.textContent = text;
    } else {
      el.textContent = text;
    }
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
}

function langPickerHtml() {
  return SUPPORTED_LANGS.map(
    (lang) =>
      `<button type="button" class="lang-flag" data-lang="${lang}" title="${FLAG_LABELS[lang]}" aria-label="${FLAG_LABELS[lang]}">${lang === 'es' ? '🇪🇸' : lang === 'pt' ? '🇧🇷' : '🇺🇸'}</button>`
  ).join('');
}

function mountLangPickers() {
  document.querySelectorAll('[data-lang-picker]').forEach((container) => {
    container.setAttribute('role', 'group');
    container.setAttribute('aria-label', t('lang.label'));
    container.innerHTML = langPickerHtml();
    container.querySelectorAll('[data-lang]').forEach((btn) => {
      btn.addEventListener('click', () => setLang(btn.dataset.lang));
    });
  });
  updateLangPickerUI();
}

function updateLangPickerUI() {
  document.querySelectorAll('.lang-flag').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.lang === currentLang);
    btn.setAttribute('aria-pressed', btn.dataset.lang === currentLang ? 'true' : 'false');
  });
}

initLang();

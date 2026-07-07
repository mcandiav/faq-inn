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
    'nav.bookingEngine': 'Motor reservas',
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
      'En pocos minutos tendrás tu agente de WhatsApp listo para tu negocio.',
    'landing.flowTitle': 'Tres pasos para empezar:',
    'landing.step1Title': 'Crea tu cuenta',
    'landing.step1Time': '~1 min',
    'landing.step1Desc': 'Email y contraseña. Con eso accedes al panel.',
    'landing.step2Title': 'Vincula WhatsApp',
    'landing.step2Time': '~2 min',
    'landing.step2Desc':
      'Escanea el QR con tu teléfono y conecta el número del negocio.',
    'landing.step3Title': 'Completa tu negocio',
    'landing.step3Time': '~5 min',
    'landing.step3Desc': 'Nombre comercial, saludo y datos del negocio en Mi cuenta.',
    'landing.badgeNow': 'Paso actual',
    'landing.badgeAfterRegister': 'Justo después del registro',
    'landing.badgeAfterWhatsapp': 'Al conectar WhatsApp',
    'landing.flowTotal':
      'El alta inicial toma unos 8 minutos. Las FAQs las cargas cuando quieras desde el panel.',
    'signup.title': 'Registra tu usuario',
    'signup.lead': 'Email y contraseña. Luego verás el QR para vincular WhatsApp.',
    'signup.email': 'Correo electrónico',
    'signup.password': 'Contraseña',
    'signup.submit': 'Crear cuenta y vincular WhatsApp',
    'provision.qrTitle': 'Escanea el QR',
    'provision.successTitle': 'WhatsApp conectado',
    'provision.successLead':
      'Tu número quedó vinculado. Completa tu negocio en Mi cuenta y prueba enviando un mensaje desde otro teléfono.',
    'dashboard.title': 'Preguntas y respuestas',
    'dashboard.hint':
      'Columna A: pregunta, B: respuesta. Opcional: keywords y categoría (columnas C/D o encabezados en fila 1). Formatos: .xlsx, .xls, .csv.',
    'dashboard.hintAdmin':
      'Como administrador, crea posadas en Admin. Los clientes editan sus FAQs.',
    'dashboard.import': 'Importar Excel',
    'dashboard.reindex': 'Sincronizar respuestas',
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
    'table.clientEmail': 'Email login',
    'table.registrationEmail': 'Email del alta (formulario)',
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
    'btn.saveIndex': 'Guardar respuesta',
    'btn.respond': 'Responderla',
    'btn.saveQuestion': 'Guardar consulta',
    'btn.createTenant': 'Crear posada',
    'unanswered.title': 'Preguntas sin respuesta',
    'unanswered.hint':
      'Escribe la respuesta aquí mismo y pulsa <strong>Responderla</strong> para guardar la FAQ y activarla en el asistente.',
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
    'profile.onboardHint':
      'Completa los datos de tu negocio. El saludo de bienvenida define cómo responde el asistente por WhatsApp.',
    'profile.sectionAccount': 'Tu acceso',
    'profile.sectionWhatsapp': 'Conexión WhatsApp',
    'profile.sectionBusiness': 'Negocio',
    'profile.sectionAgent': 'Agente WhatsApp',
    'profile.email': 'Email (login)',
    'profile.emailHint': 'Para cambiar el email debes ingresar tu contraseña actual abajo.',
    'profile.business': 'Nombre comercial',
    'profile.businessPlaceholder': 'Ej. Hotel Savoy',
    'profile.businessHint': 'Nombre que verán tus huéspedes.',
    'profile.address': 'Dirección',
    'profile.addressHint': 'Ubicación del alojamiento (opcional pero recomendado).',
    'profile.welcomeMessage': 'Saludo de bienvenida',
    'profile.welcomeHint':
      'Cómo se presenta el asistente en el primer contacto (incluye nombre si quieres).',
    'profile.bookingSetupHint':
      'Configura cómo se construyen los links de reserva de tu motor.',
    'profile.bookingSetupBtn': 'Configurar motor de reservas',
    'profile.bookingStatusApproved': 'Motor de reservas configurado y aprobado.',
    'profile.bookingStatusPending': 'Motor de reservas pendiente de configuración.',
    'profile.pauseHint':
      'Para pausar el agente en un chat, escribile al cliente un mensaje que empiece con ** (dos asteriscos). El asistente queda pausado 5 minutos en esa conversación y podés responder vos.',
    'profile.primaryLanguage': 'Idioma principal',
    'profile.businessExample': 'Ej. {name}',
    'profile.slug': 'Identificador técnico',
    'profile.changePassword': 'Cambiar contraseña',
    'profile.currentPassword': 'Contraseña actual',
    'profile.newPassword': 'Nueva contraseña',
    'profile.confirmPassword': 'Repetir nueva contraseña',
    'profile.globalAdmin': 'Administración global',
    'profile.myBusiness': 'Mi negocio',
    'profile.whatsappStatusConnected': 'Conectado',
    'profile.whatsappStatusDisconnected': 'Desconectado',
    'profile.whatsappStatusQrPending': 'Pendiente de escaneo',
    'profile.whatsappStatusError': 'Error de conexión',
    'profile.whatsappStatusPending': 'Sin vincular',
    'profile.whatsappStatusNone': 'Sin vincular',
    'profile.whatsappConnectedHint':
      'Tu asistente responde mensajes entrantes en este número.',
    'profile.whatsappConnectedSince': 'Vinculado desde {date}',
    'profile.whatsappDisconnectedHint':
      'WhatsApp no está conectado. El asistente no responderá hasta que escanees el código QR de nuevo.',
    'profile.whatsappReconnect': 'Reconectar WhatsApp',
    'profile.whatsappRefreshQr': 'Actualizar QR',
    'booking.title': 'Motor de reservas',
    'booking.back': '← Volver a Mi cuenta',
    'booking.intro':
      'Para que el agente envíe links correctos, pegue dos búsquedas específicas de su motor. FAQ Inn detectará la plantilla, el formato de fecha y usted la verificará antes de aprobarla.',
    'booking.approvedTitle': 'Plantilla aprobada',
    'booking.reconfigure': 'Configurar de nuevo',
    'booking.linkApproved': 'Link aprobado',
    'booking.stepScenarios': 'Paso 1 — Pegar links de prueba',
    'booking.stepScenariosHint':
      'En su motor de reservas real, haga exactamente estas búsquedas y pegue el link resultante en cada campo.',
    'booking.analyze': 'Analizar links',
    'booking.stepVerify': 'Paso 2 — Probar link generado',
    'booking.stepVerifyHint':
      'Elija check-in, check-out y adultos. FAQ Inn arma el link de reserva y usted solo abre para verificar que el motor muestra lo correcto.',
    'booking.checkin': 'Check-in',
    'booking.checkout': 'Check-out',
    'booking.adults': 'Adultos',
    'booking.children': 'Menores',
    'booking.childAges': 'Edades menores (ej. 8 o 10,11)',
    'booking.rooms': 'Habitaciones',
    'booking.generateLink': 'Generar link de prueba',
    'booking.previewLink': 'Abrir link generado',
    'booking.previewUrl': 'Link generado',
    'booking.showTemplate': 'Ver plantilla técnica detectada',
    'booking.previewApprovedHint':
      'Pruebe su plantilla aprobada con fechas y huéspedes distintos.',
    'booking.retry': 'No coincide — volver a pegar links',
    'booking.approve': 'Sí, el link está correcto',
    'booking.scenarioLabel': 'Escenario {n}',
    'booking.scenarioRooms': '{rooms} habitación(es)',
    'booking.scenarioDates': 'Entrada {checkin}, salida {checkout}',
    'booking.scenarioGuests': '{adults} adulto(s), {children} menor(es) ({ages})',
    'booking.scenarioAdults': '{adults} adulto(s)',
    'booking.scenarioUrl': 'Link resultante',
    'booking.confidence': 'Confianza de detección: {pct}%',
    'booking.dateFormatDetected': 'Formato de fecha detectado: {format}',
    'booking.statusApproved': 'Aprobado',
    'booking.statusPending': 'Pendiente',
    'booking.msgAnalyzeOk': 'Plantilla detectada. Verifique el link de prueba.',
    'booking.msgApproved': 'Plantilla aprobada y guardada.',
    'booking.msgError': 'No pudimos armar un link correcto. Vuelva a pegar los 2 links.',
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
    'admin.whatsapp': 'WhatsApp',
    'admin.createdAt': 'Alta',
    'admin.provisioning': 'Provisionamiento',
    'admin.instance': 'Instancia Evolution',
    'admin.faqCount': 'FAQs',
    'admin.unansweredCount': 'Sin respuesta',
    'admin.viewDetail': 'Ver',
    'admin.detailTitle': 'Detalle del tenant',
    'admin.deleteTitle': 'Borrar tenant',
    'admin.resetPassword': 'Gestionar acceso',
    'admin.resetPasswordShort': 'Acceso',
    'admin.resetAccessTitle': 'Login del cliente',
    'admin.resetAccessHint':
      'Credenciales para que el dueño del negocio entre a FAQ Inn. No uses el email de admin global.',
    'admin.resetAccessEmail': 'Correo para iniciar sesión',
    'admin.resetAccessPassword': 'Nueva contraseña',
    'admin.resetAccessPasswordPlaceholder': 'Opcional: vacío = se genera sola',
    'admin.resetAccessSave': 'Guardar',
    'admin.resetAccessSaved': 'Listo — copia email y contraseña antes de cerrar:',
    'admin.deleteTenant': 'Borrar tenant',
    'admin.deleteConfirmLabel': 'Escribe el slug para confirmar borrado',
    'admin.deleteWarning':
      'Se borrarán PostgreSQL, Qdrant y la instancia Evolution (si existe). Escribe el slug «{slug}» abajo.',
    'admin.deleteSlugMismatch': 'El slug escrito no coincide.',
    'admin.deleteFinalConfirm':
      '¿Borrar definitivamente «{slug}»? Esta acción no se puede deshacer.',
    'admin.deletingTenant': 'Borrando tenant…',
    'admin.deleteDone': 'Tenant «{slug}» eliminado.',
    'admin.resetPasswordConfirm':
      '¿Generar contraseña temporal para {email}?',
    'admin.createLoginPrompt':
      'Tenant «{slug}» sin usuario de login. Email de registro: {email}. Indica el email para crear la cuenta:',
    'admin.resetPasswordCreated':
      'Cuenta creada para {email}. Contraseña temporal: {password}\n\nCópiala y úsala en Iniciar sesión.',
    'admin.resettingPassword': 'Generando contraseña temporal…',
    'admin.resetPasswordDone':
      'Contraseña temporal para {email}: {password}\n\nCópiala y compártela al cliente por un canal seguro.',
    'admin.statusDraft': 'Borrador',
    'admin.statusQrPending': 'QR pendiente',
    'admin.statusConnected': 'Conectado',
    'admin.statusActive': 'Activo',
    'admin.statusInactive': 'Inactivo',
    'admin.statusError': 'Error',
    'admin.whatsappNone': 'Sin instancia',
    'admin.whatsappPending': 'Pendiente QR',
    'admin.whatsappConnected': 'Conectado',
    'admin.whatsappError': 'Error',
    'table.actions': 'Acciones',
    'faq.edit': 'Editar FAQ',
    'faq.new': 'Nueva FAQ',
    'faq.category': 'Categoría',
    'faq.keywords': 'Keywords',
    'faq.keywordsPlaceholder': 'wifi, internet, reserva',
    'faq.active': 'Activa',
    'faq.template': 'Plantilla',
    'msg.writeAnswer': 'Escribe una respuesta antes de guardar.',
    'msg.savingFaq': 'Guardando respuesta…',
    'msg.savedIndexed': 'Respuesta guardada.',
    'msg.queryEmpty': 'La consulta no puede quedar vacía.',
    'msg.savingQuery': 'Guardando consulta…',
    'msg.querySaved': 'Consulta guardada.',
    'msg.deleteQuestionConfirm':
      '¿Borrar esta pregunta?\n\n"{q}"\n\nSe eliminará de forma permanente.',
    'msg.deleting': 'Borrando…',
    'msg.questionDeleted': 'Pregunta borrada.',
    'msg.importing': 'Importando… puede tardar unos segundos.',
    'msg.importDone': 'Importación completada.',
    'msg.importDeleted': ' ({n} eliminadas antes de importar)',
    'msg.importErrors': ' — {n} fila(s) con error.',
    'msg.faqNotFound': 'No se encontró la FAQ en la lista. Recarga la página e intenta de nuevo.',
    'msg.deleteFaqConfirm':
      '¿Eliminar esta FAQ?\n\n"{q}"\n\nSe borrará de forma permanente.',
    'msg.deletingFaq': 'Eliminando…',
    'msg.faqDeleted': 'FAQ eliminada.',
    'msg.reindexConfirm':
      '¿Sincronizar las {n} FAQ(s) actuales con el asistente?\n\nSe actualizará el índice de búsqueda completo.',
    'msg.reindexEmpty':
      '¿Limpiar el índice de búsqueda? No hay FAQs guardadas.',
    'msg.syncing': 'Sincronizando… puede tardar unos segundos.',
    'msg.synced': 'Sincronización completada.',
    'msg.savingIndexing': 'Guardando respuesta…',
    'msg.profileSaved': 'Cambios guardados.',
    'msg.passwordRequiredForEmail':
      'Ingresa tu contraseña actual para cambiar el email.',
    'msg.passwordRequiredForChange':
      'Ingresa tu contraseña actual para cambiar la contraseña.',
    'msg.passwordMismatch': 'La nueva contraseña y la repetición no coinciden.',
    'msg.passwordTooShort': 'La nueva contraseña debe tener al menos 8 caracteres.',
    'msg.whatsappConnected': 'WhatsApp conectado. Completa los datos de tu negocio.',
    'msg.whatsappConnectedPhone': 'WhatsApp conectado ({phone}). Completa los datos de tu negocio.',
    'msg.qrTimeout':
      'Se agotó el tiempo de espera del QR. Pulsa «Actualizar QR» e inténtalo de nuevo.',
    'msg.qrWaiting': 'Escanea el QR una sola vez… ({seconds}s)',
    'msg.creatingWhatsapp': 'Creando instancia en WhatsApp Web…',
    'msg.tenantCreated': 'Posada creada. El cliente puede ingresar con su email.',
  },
  pt: {
    'lang.label': 'Idioma',
    'nav.faqs': 'FAQs',
    'nav.unanswered': 'Sem resposta',
    'nav.unansweredShort': 'Sem resp.',
    'nav.profile': 'Minha conta',
    'nav.profileShort': 'Conta',
    'nav.bookingEngine': 'Reservas',
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
    'landing.hasAccount': 'Já tem conta? Entrar',
    'landing.newBusiness': 'Registrar um negócio novo',
    'landing.welcome':
      'Em poucos minutos você terá seu agente de WhatsApp pronto para o seu negócio.',
    'landing.flowTitle': 'Três passos para começar:',
    'landing.step1Title': 'Crie sua conta',
    'landing.step1Time': '~1 min',
    'landing.step1Desc': 'Email e senha. Com isso você acessa o painel.',
    'landing.step2Title': 'Vincule o WhatsApp',
    'landing.step2Time': '~2 min',
    'landing.step2Desc':
      'Escaneie o QR com seu telefone e conecte o número do negócio.',
    'landing.step3Title': 'Complete seu negócio',
    'landing.step3Time': '~5 min',
    'landing.step3Desc': 'Nome comercial, saudação e dados do negócio em Minha conta.',
    'landing.badgeNow': 'Passo atual',
    'landing.badgeAfterRegister': 'Logo após o registro',
    'landing.badgeAfterWhatsapp': 'Ao conectar WhatsApp',
    'landing.flowTotal':
      'O cadastro inicial leva cerca de 8 minutos. As FAQs você carrega quando quiser no painel.',
    'signup.title': 'Registre seu usuário',
    'signup.lead': 'Email e senha. Depois você verá o QR para vincular o WhatsApp.',
    'signup.email': 'Correo electrónico',
    'signup.password': 'Senha',
    'signup.submit': 'Criar conta e vincular WhatsApp',
    'provision.qrTitle': 'Escaneie o QR',
    'dashboard.title': 'Perguntas e respostas',
    'dashboard.hint':
      'Coluna A: pergunta, B: resposta. Opcional: keywords e categoria (colunas C/D ou cabeçalhos na linha 1). Formatos: .xlsx, .xls, .csv.',
    'dashboard.hintAdmin':
      'Como administrador, crie pousadas em Admin. Os clientes editam suas FAQs.',
    'dashboard.import': 'Importar Excel',
    'dashboard.reindex': 'Sincronizar respostas',
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
    'table.clientEmail': 'Email login',
    'table.registrationEmail': 'Email do cadastro (formulário)',
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
    'btn.saveIndex': 'Salvar resposta',
    'btn.respond': 'Responder',
    'btn.saveQuestion': 'Salvar consulta',
    'btn.createTenant': 'Criar pousada',
    'unanswered.title': 'Perguntas sem resposta',
    'unanswered.hint':
      'Escreva a resposta aqui e clique em <strong>Responder</strong> para salvar a FAQ e ativá-la no assistente.',
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
    'profile.onboardHint':
      'Complete os dados do seu negócio. A saudação de boas-vindas define como o assistente responde no WhatsApp.',
    'profile.sectionAccount': 'Seu acesso',
    'profile.sectionWhatsapp': 'Conexão WhatsApp',
    'profile.sectionBusiness': 'Negócio',
    'profile.sectionAgent': 'Agente WhatsApp',
    'profile.email': 'Email (login)',
    'profile.emailHint': 'Para alterar o email, informe sua senha atual abaixo.',
    'profile.business': 'Nome comercial',
    'profile.businessPlaceholder': 'Ex. Hotel Savoy',
    'profile.businessHint': 'Nome que seus hóspedes verão.',
    'profile.address': 'Endereço',
    'profile.addressHint': 'Localização do alojamento (opcional, mas recomendado).',
    'profile.welcomeMessage': 'Saudação de boas-vindas',
    'profile.welcomeHint':
      'Como o assistente se apresenta no primeiro contato (inclua o nome se quiser).',
    'profile.bookingSetupHint':
      'Configure como os links de reserva do seu motor são construídos.',
    'profile.bookingSetupBtn': 'Configurar motor de reservas',
    'profile.bookingStatusApproved': 'Motor de reservas configurado e aprovado.',
    'profile.bookingStatusPending': 'Motor de reservas pendente de configuração.',
    'profile.pauseHint':
      'Para pausar o agente num chat, escreva ao cliente uma mensagem que comece com ** (dois asteriscos). O assistente fica pausado 5 minutos nessa conversa e você pode responder.',
    'profile.primaryLanguage': 'Idioma principal',
    'profile.businessExample': 'Ex. {name}',
    'profile.slug': 'Identificador técnico',
    'profile.changePassword': 'Alterar senha',
    'profile.currentPassword': 'Senha atual',
    'profile.newPassword': 'Nova senha',
    'profile.confirmPassword': 'Repetir nova senha',
    'profile.globalAdmin': 'Administração global',
    'profile.myBusiness': 'Meu negócio',
    'profile.whatsappStatusConnected': 'Conectado',
    'profile.whatsappStatusDisconnected': 'Desconectado',
    'profile.whatsappStatusQrPending': 'Aguardando leitura do QR',
    'profile.whatsappStatusError': 'Erro de conexão',
    'profile.whatsappStatusPending': 'Não vinculado',
    'profile.whatsappStatusNone': 'Não vinculado',
    'profile.whatsappConnectedHint':
      'Seu assistente responde mensagens recebidas neste número.',
    'profile.whatsappConnectedSince': 'Vinculado desde {date}',
    'profile.whatsappDisconnectedHint':
      'O WhatsApp não está conectado. O assistente só voltará a responder depois de escanear o QR novamente.',
    'profile.whatsappReconnect': 'Reconectar WhatsApp',
    'profile.whatsappRefreshQr': 'Atualizar QR',
    'booking.title': 'Motor de reservas',
    'booking.back': '← Voltar à Minha conta',
    'booking.intro':
      'Para o assistente enviar links corretos, cole duas buscas específicas do seu motor. O FAQ Inn detectará o modelo, o formato de data e você verificará antes de aprovar.',
    'booking.approvedTitle': 'Modelo aprovado',
    'booking.reconfigure': 'Configurar novamente',
    'booking.linkApproved': 'Link aprovado',
    'booking.stepScenarios': 'Passo 1 — Colar links de teste',
    'booking.stepScenariosHint':
      'No seu motor real, faça exatamente estas buscas e cole o link resultante em cada campo.',
    'booking.analyze': 'Analisar links',
    'booking.stepVerify': 'Passo 2 — Testar link gerado',
    'booking.stepVerifyHint':
      'Escolha check-in, check-out e adultos. O FAQ Inn monta o link de reserva e você só abre para verificar se o motor mostra o correto.',
    'booking.checkin': 'Check-in',
    'booking.checkout': 'Check-out',
    'booking.adults': 'Adultos',
    'booking.children': 'Menores',
    'booking.childAges': 'Idades menores (ex. 8 ou 10,11)',
    'booking.rooms': 'Quartos',
    'booking.generateLink': 'Gerar link de teste',
    'booking.previewLink': 'Abrir link gerado',
    'booking.previewUrl': 'Link gerado',
    'booking.showTemplate': 'Ver modelo técnico detectado',
    'booking.previewApprovedHint':
      'Teste seu modelo aprovado com datas e hóspedes diferentes.',
    'booking.retry': 'Não coincide — voltar a colar links',
    'booking.approve': 'Sim, o link está correto',
    'booking.scenarioLabel': 'Cenário {n}',
    'booking.scenarioRooms': '{rooms} quarto(s)',
    'booking.scenarioDates': 'Entrada {checkin}, saída {checkout}',
    'booking.scenarioGuests': '{adults} adulto(s), {children} menor(es) ({ages})',
    'booking.scenarioAdults': '{adults} adulto(s)',
    'booking.scenarioUrl': 'Link resultante',
    'booking.confidence': 'Confiança da detecção: {pct}%',
    'booking.dateFormatDetected': 'Formato de data detectado: {format}',
    'booking.statusApproved': 'Aprovado',
    'booking.statusPending': 'Pendente',
    'booking.msgAnalyzeOk': 'Modelo detectado. Verifique o link de teste.',
    'booking.msgApproved': 'Modelo aprovado e salvo.',
    'booking.msgError': 'Não conseguimos montar um link correto. Cole os 2 links novamente.',
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
    'admin.whatsapp': 'WhatsApp',
    'admin.createdAt': 'Cadastro',
    'admin.provisioning': 'Provisionamento',
    'admin.instance': 'Instância Evolution',
    'admin.faqCount': 'FAQs',
    'admin.unansweredCount': 'Sem resposta',
    'admin.viewDetail': 'Ver',
    'admin.detailTitle': 'Detalhe do tenant',
    'admin.deleteTitle': 'Excluir tenant',
    'admin.resetPassword': 'Redefinir senha',
    'admin.resetPasswordShort': 'Reset pwd',
    'admin.resetAccessTitle': 'Acesso do tenant',
    'admin.resetAccessHint':
      'Defina o email e a senha de login. Se deixar a senha vazia, será gerada automaticamente.',
    'admin.resetAccessEmail': 'Email de login',
    'admin.resetAccessPassword': 'Senha',
    'admin.resetAccessPasswordPlaceholder': 'Vazio = gerar automaticamente',
    'admin.resetAccessSave': 'Salvar acesso',
    'admin.resetAccessSaved': 'Acesso salvo — copie antes de fechar:',
    'admin.deleteTenant': 'Excluir tenant',
    'admin.deleteConfirmLabel': 'Digite o slug para confirmar a exclusão',
    'admin.deleteWarning':
      'Serão removidos PostgreSQL, Qdrant e a instância Evolution (se existir). Digite o slug «{slug}» abaixo.',
    'admin.deleteSlugMismatch': 'O slug digitado não coincide.',
    'admin.deleteFinalConfirm':
      'Excluir definitivamente «{slug}»? Esta ação não pode ser desfeita.',
    'admin.deletingTenant': 'Excluindo tenant…',
    'admin.deleteDone': 'Tenant «{slug}» excluído.',
    'admin.resetPasswordConfirm':
      'Gerar senha temporária para {email}?',
    'admin.createLoginPrompt':
      'Tenant «{slug}» sem usuário de login. Email de cadastro: {email}. Informe o email para criar a conta:',
    'admin.resetPasswordCreated':
      'Conta criada para {email}. Senha temporária: {password}\n\nCopie e use em Iniciar sessão.',
    'admin.resettingPassword': 'Gerando senha temporária…',
    'admin.resetPasswordDone':
      'Senha temporária para {email}: {password}\n\nCopie e envie ao cliente por um canal seguro.',
    'admin.statusDraft': 'Rascunho',
    'admin.statusQrPending': 'QR pendente',
    'admin.statusConnected': 'Conectado',
    'admin.statusActive': 'Ativo',
    'admin.statusInactive': 'Inativo',
    'admin.statusError': 'Erro',
    'admin.whatsappNone': 'Sem instância',
    'admin.whatsappPending': 'QR pendente',
    'admin.whatsappConnected': 'Conectado',
    'admin.whatsappError': 'Erro',
    'table.actions': 'Ações',
    'faq.edit': 'Editar FAQ',
    'faq.new': 'Nova FAQ',
    'faq.category': 'Categoria',
    'faq.keywords': 'Keywords',
    'faq.keywordsPlaceholder': 'wifi, internet, reserva',
    'faq.active': 'Ativa',
    'faq.template': 'Modelo',
    'msg.writeAnswer': 'Escreva uma resposta antes de salvar.',
    'msg.savingFaq': 'Salvando resposta…',
    'msg.savedIndexed': 'Resposta salva.',
    'msg.queryEmpty': 'A consulta não pode ficar vazia.',
    'msg.savingQuery': 'Salvando consulta…',
    'msg.querySaved': 'Consulta salva.',
    'msg.deleteQuestionConfirm':
      'Excluir esta pergunta?\n\n"{q}"\n\nSerá removida permanentemente.',
    'msg.deleting': 'Excluindo…',
    'msg.questionDeleted': 'Pergunta excluída.',
    'msg.importing': 'Importando… pode levar alguns segundos.',
    'msg.importDone': 'Importação concluída.',
    'msg.importDeleted': ' ({n} removidas antes de importar)',
    'msg.importErrors': ' — {n} linha(s) com erro.',
    'msg.faqNotFound': 'FAQ não encontrada na lista. Recarregue a página e tente novamente.',
    'msg.deleteFaqConfirm':
      'Excluir esta FAQ?\n\n"{q}"\n\nSerá removida permanentemente.',
    'msg.deletingFaq': 'Excluindo…',
    'msg.faqDeleted': 'FAQ excluída.',
    'msg.reindexConfirm':
      'Sincronizar as {n} FAQ(s) atuais com o assistente?\n\nO índice de busca será atualizado por completo.',
    'msg.reindexEmpty':
      'Limpar o índice de busca? Não há FAQs salvas.',
    'msg.syncing': 'Sincronizando… pode levar alguns segundos.',
    'msg.synced': 'Sincronização concluída.',
    'msg.savingIndexing': 'Salvando resposta…',
    'msg.profileSaved': 'Alterações salvas.',
    'msg.passwordRequiredForEmail':
      'Informe sua senha atual para alterar o email.',
    'msg.passwordRequiredForChange':
      'Informe sua senha atual para alterar a senha.',
    'msg.passwordMismatch': 'A nova senha e a repetição não coincidem.',
    'msg.passwordTooShort': 'A nova senha deve ter pelo menos 8 caracteres.',
    'msg.whatsappConnected': 'WhatsApp conectado. Complete os dados do seu negócio.',
    'msg.whatsappConnectedPhone': 'WhatsApp conectado ({phone}). Complete os dados do seu negócio.',
    'msg.qrTimeout':
      'O tempo de espera do QR expirou. Clique em «Atualizar QR» e tente novamente.',
    'msg.qrWaiting': 'Escaneie o QR uma única vez… ({seconds}s)',
    'msg.creatingWhatsapp': 'Criando instância no WhatsApp Web…',
    'msg.tenantCreated': 'Pousada criada. O cliente pode entrar com seu email.',
  },
  en: {
    'lang.label': 'Language',
    'nav.faqs': 'FAQs',
    'nav.unanswered': 'Unanswered',
    'nav.unansweredShort': 'Unanswered',
    'nav.profile': 'My account',
    'nav.profileShort': 'Account',
    'nav.bookingEngine': 'Booking',
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
    'landing.hasAccount': 'Already have an account? Sign in',
    'landing.newBusiness': 'Register a new business',
    'landing.welcome':
      'In a few minutes you will have your WhatsApp agent ready for your business.',
    'landing.flowTitle': 'Three steps to get started:',
    'landing.step1Title': 'Create your account',
    'landing.step1Time': '~1 min',
    'landing.step1Desc': 'Email and password. That gives you access to the dashboard.',
    'landing.step2Title': 'Link WhatsApp',
    'landing.step2Time': '~2 min',
    'landing.step2Desc': 'Scan the QR with your phone and connect the business number.',
    'landing.step3Title': 'Complete your business',
    'landing.step3Time': '~5 min',
    'landing.step3Desc': 'Business name, greeting, and details in My account.',
    'landing.badgeNow': 'Current step',
    'landing.badgeAfterRegister': 'Right after signup',
    'landing.badgeAfterWhatsapp': 'When WhatsApp connects',
    'landing.flowTotal':
      'Initial setup takes about 8 minutes. You can load FAQs anytime from the dashboard.',
    'signup.title': 'Create your account',
    'signup.lead': 'Email and password. Then you will see the QR to link WhatsApp.',
    'signup.email': 'Email',
    'signup.password': 'Password',
    'signup.submit': 'Create account and link WhatsApp',
    'provision.qrTitle': 'Scan the QR code',
    'dashboard.title': 'Questions and answers',
    'dashboard.hint':
      'Column A: question, B: answer. Optional: keywords and category (columns C/D or headers in row 1). Formats: .xlsx, .xls, .csv.',
    'dashboard.hintAdmin':
      'As administrator, create lodgings in Admin. Clients edit their FAQs.',
    'dashboard.import': 'Import Excel',
    'dashboard.reindex': 'Sync answers',
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
    'table.clientEmail': 'Login email',
    'table.registrationEmail': 'Signup form email',
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
    'btn.saveIndex': 'Save answer',
    'btn.respond': 'Answer it',
    'btn.saveQuestion': 'Save question',
    'btn.createTenant': 'Create lodging',
    'unanswered.title': 'Unanswered questions',
    'unanswered.hint':
      'Write the answer here and click <strong>Answer it</strong> to save the FAQ and enable it for the assistant.',
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
    'profile.onboardHint':
      'Complete your business details. The welcome greeting defines how the assistant replies on WhatsApp.',
    'profile.sectionAccount': 'Your access',
    'profile.sectionWhatsapp': 'WhatsApp connection',
    'profile.sectionBusiness': 'Business',
    'profile.sectionAgent': 'WhatsApp agent',
    'profile.email': 'Email (login)',
    'profile.emailHint': 'To change your email, enter your current password below.',
    'profile.business': 'Business name',
    'profile.businessPlaceholder': 'E.g. Savoy Hotel',
    'profile.businessHint': 'Name your guests will see.',
    'profile.address': 'Address',
    'profile.addressHint': 'Lodging location (optional but recommended).',
    'profile.welcomeMessage': 'Welcome greeting',
    'profile.welcomeHint':
      'How the assistant introduces itself on first contact (include a name if you want).',
    'profile.bookingSetupHint':
      'Configure how your booking engine builds reservation links.',
    'profile.bookingSetupBtn': 'Configure booking engine',
    'profile.bookingStatusApproved': 'Booking engine configured and approved.',
    'profile.bookingStatusPending': 'Booking engine setup pending.',
    'profile.pauseHint':
      'To pause the agent in a chat, send the client a message starting with ** (two asterisks). The assistant stays paused for 5 minutes in that conversation so you can reply yourself.',
    'profile.primaryLanguage': 'Primary language',
    'profile.businessExample': 'E.g. {name}',
    'profile.slug': 'Technical identifier',
    'profile.changePassword': 'Change password',
    'profile.currentPassword': 'Current password',
    'profile.newPassword': 'New password',
    'profile.confirmPassword': 'Repeat new password',
    'profile.globalAdmin': 'Global administration',
    'profile.myBusiness': 'My business',
    'profile.whatsappStatusConnected': 'Connected',
    'profile.whatsappStatusDisconnected': 'Disconnected',
    'profile.whatsappStatusQrPending': 'Waiting for QR scan',
    'profile.whatsappStatusError': 'Connection error',
    'profile.whatsappStatusPending': 'Not linked',
    'profile.whatsappStatusNone': 'Not linked',
    'profile.whatsappConnectedHint':
      'Your assistant replies to incoming messages on this number.',
    'profile.whatsappConnectedSince': 'Linked since {date}',
    'profile.whatsappDisconnectedHint':
      'WhatsApp is not connected. The assistant will not reply until you scan the QR code again.',
    'profile.whatsappReconnect': 'Reconnect WhatsApp',
    'profile.whatsappRefreshQr': 'Refresh QR',
    'booking.title': 'Booking engine',
    'booking.back': '← Back to My account',
    'booking.intro':
      'For the agent to send correct links, paste two specific searches from your engine. FAQ Inn will detect the template, date format and you verify before approving.',
    'booking.approvedTitle': 'Approved template',
    'booking.reconfigure': 'Configure again',
    'booking.linkApproved': 'Link approved',
    'booking.stepScenarios': 'Step 1 — Paste test links',
    'booking.stepScenariosHint':
      'In your real booking engine, run exactly these searches and paste the resulting link in each field.',
    'booking.analyze': 'Analyze links',
    'booking.stepVerify': 'Step 2 — Test generated link',
    'booking.stepVerifyHint':
      'Choose check-in, check-out and adults. FAQ Inn builds the booking link and you only open it to verify the engine shows the correct search.',
    'booking.checkin': 'Check-in',
    'booking.checkout': 'Check-out',
    'booking.adults': 'Adults',
    'booking.children': 'Children',
    'booking.childAges': 'Child ages (e.g. 8 or 10,11)',
    'booking.rooms': 'Rooms',
    'booking.generateLink': 'Generate test link',
    'booking.previewLink': 'Open generated link',
    'booking.previewUrl': 'Generated link',
    'booking.showTemplate': 'View detected technical template',
    'booking.previewApprovedHint':
      'Test your approved template with different dates and guests.',
    'booking.retry': 'Does not match — paste links again',
    'booking.approve': 'Yes, the link is correct',
    'booking.scenarioLabel': 'Scenario {n}',
    'booking.scenarioRooms': '{rooms} room(s)',
    'booking.scenarioDates': 'Check-in {checkin}, check-out {checkout}',
    'booking.scenarioGuests': '{adults} adult(s), {children} child(ren) ({ages})',
    'booking.scenarioAdults': '{adults} adult(s)',
    'booking.scenarioUrl': 'Resulting link',
    'booking.confidence': 'Detection confidence: {pct}%',
    'booking.dateFormatDetected': 'Detected date format: {format}',
    'booking.statusApproved': 'Approved',
    'booking.statusPending': 'Pending',
    'booking.msgAnalyzeOk': 'Template detected. Verify the test link.',
    'booking.msgApproved': 'Template approved and saved.',
    'booking.msgError': 'We could not build a correct link. Paste the 2 links again.',
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
    'admin.whatsapp': 'WhatsApp',
    'admin.createdAt': 'Created',
    'admin.provisioning': 'Provisioning',
    'admin.instance': 'Evolution instance',
    'admin.faqCount': 'FAQs',
    'admin.unansweredCount': 'Unanswered',
    'admin.viewDetail': 'View',
    'admin.detailTitle': 'Tenant detail',
    'admin.deleteTitle': 'Delete tenant',
    'admin.resetPassword': 'Reset password',
    'admin.resetPasswordShort': 'Reset pwd',
    'admin.resetAccessTitle': 'Tenant login',
    'admin.resetAccessHint':
      'Set login email and password. Leave password empty to auto-generate one.',
    'admin.resetAccessEmail': 'Login email',
    'admin.resetAccessPassword': 'Password',
    'admin.resetAccessPasswordPlaceholder': 'Empty = auto-generate',
    'admin.resetAccessSave': 'Save access',
    'admin.resetAccessSaved': 'Access saved — copy before closing:',
    'admin.deleteTenant': 'Delete tenant',
    'admin.deleteConfirmLabel': 'Type the slug to confirm deletion',
    'admin.deleteWarning':
      'PostgreSQL, Qdrant, and the Evolution instance (if any) will be removed. Type slug «{slug}» below.',
    'admin.deleteSlugMismatch': 'Confirmation slug does not match.',
    'admin.deleteFinalConfirm':
      'Permanently delete «{slug}»? This cannot be undone.',
    'admin.deletingTenant': 'Deleting tenant…',
    'admin.deleteDone': 'Tenant «{slug}» deleted.',
    'admin.resetPasswordConfirm':
      'Generate a temporary password for {email}?',
    'admin.createLoginPrompt':
      'Tenant «{slug}» has no login user. Registration email: {email}. Enter the email to create the account:',
    'admin.resetPasswordCreated':
      'Account created for {email}. Temporary password: {password}\n\nCopy it and use Sign in.',
    'admin.resettingPassword': 'Generating temporary password…',
    'admin.resetPasswordDone':
      'Temporary password for {email}: {password}\n\nCopy it and share with the client securely.',
    'admin.statusDraft': 'Draft',
    'admin.statusQrPending': 'QR pending',
    'admin.statusConnected': 'Connected',
    'admin.statusActive': 'Active',
    'admin.statusInactive': 'Inactive',
    'admin.statusError': 'Error',
    'admin.whatsappNone': 'No instance',
    'admin.whatsappPending': 'QR pending',
    'admin.whatsappConnected': 'Connected',
    'admin.whatsappError': 'Error',
    'table.actions': 'Actions',
    'faq.edit': 'Edit FAQ',
    'faq.new': 'New FAQ',
    'faq.category': 'Category',
    'faq.keywords': 'Keywords',
    'faq.keywordsPlaceholder': 'wifi, internet, booking',
    'faq.active': 'Active',
    'faq.template': 'Template',
    'msg.writeAnswer': 'Write an answer before saving.',
    'msg.savingFaq': 'Saving answer…',
    'msg.savedIndexed': 'Answer saved.',
    'msg.queryEmpty': 'The question cannot be empty.',
    'msg.savingQuery': 'Saving question…',
    'msg.querySaved': 'Question saved.',
    'msg.deleteQuestionConfirm':
      'Delete this question?\n\n"{q}"\n\nIt will be permanently removed.',
    'msg.deleting': 'Deleting…',
    'msg.questionDeleted': 'Question deleted.',
    'msg.importing': 'Importing… this may take a few seconds.',
    'msg.importDone': 'Import completed.',
    'msg.importDeleted': ' ({n} deleted before import)',
    'msg.importErrors': ' — {n} row(s) with errors.',
    'msg.faqNotFound': 'FAQ not found in the list. Reload the page and try again.',
    'msg.deleteFaqConfirm':
      'Delete this FAQ?\n\n"{q}"\n\nIt will be permanently removed.',
    'msg.deletingFaq': 'Deleting…',
    'msg.faqDeleted': 'FAQ deleted.',
    'msg.reindexConfirm':
      'Sync the current {n} FAQ(s) with the assistant?\n\nThe full search index will be rebuilt.',
    'msg.reindexEmpty':
      'Clear the search index? There are no saved FAQs.',
    'msg.syncing': 'Syncing… this may take a few seconds.',
    'msg.synced': 'Sync completed.',
    'msg.savingIndexing': 'Saving answer…',
    'msg.profileSaved': 'Changes saved.',
    'msg.passwordRequiredForEmail':
      'Enter your current password to change your email.',
    'msg.passwordRequiredForChange':
      'Enter your current password to change your password.',
    'msg.passwordMismatch': 'New password and confirmation do not match.',
    'msg.passwordTooShort': 'New password must be at least 8 characters.',
    'msg.whatsappConnected': 'WhatsApp connected. Complete your business details.',
    'msg.whatsappConnectedPhone': 'WhatsApp connected ({phone}). Complete your business details.',
    'msg.qrTimeout':
      'QR wait time expired. Click «Refresh QR» and try again.',
    'msg.qrWaiting': 'Scan the QR code once… ({seconds}s)',
    'msg.creatingWhatsapp': 'Creating WhatsApp Web instance…',
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

function applyI18nScope(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => {
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

  root.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
}

function applyI18n() {
  applyI18nScope(document);
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

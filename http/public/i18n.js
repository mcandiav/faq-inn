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
    'table.clientEmail': 'Email login',
    'table.registrationEmail': 'Email registro (onboarding)',
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
    'profile.onboardHint':
      'Completa los datos de tu negocio. El saludo de bienvenida define cómo responde el asistente por WhatsApp.',
    'profile.sectionAccount': 'Tu acceso',
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
    'profile.bookingUrl': 'URL de reservas',
    'profile.bookingUrlHint': 'Enlace donde el huésped puede reservar.',
    'profile.primaryLanguage': 'Idioma principal',
    'profile.businessExample': 'Ej. {name}',
    'profile.slug': 'Slug técnico (Qdrant / n8n)',
    'profile.changePassword': 'Cambiar contraseña',
    'profile.currentPassword': 'Contraseña actual',
    'profile.newPassword': 'Nueva contraseña',
    'profile.confirmPassword': 'Repetir nueva contraseña',
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
    'admin.whatsapp': 'WhatsApp',
    'admin.createdAt': 'Alta',
    'admin.provisioning': 'Provisionamiento',
    'admin.instance': 'Instancia Evolution',
    'admin.faqCount': 'FAQs',
    'admin.unansweredCount': 'Sin respuesta',
    'admin.viewDetail': 'Ver',
    'admin.detailTitle': 'Detalle del tenant',
    'admin.deleteTitle': 'Borrar tenant',
    'admin.resetPassword': 'Resetear contraseña',
    'admin.resetPasswordShort': 'Reset pwd',
    'admin.resetAccessTitle': 'Acceso del tenant',
    'admin.resetAccessHint':
      'Define el email y la contraseña de login. Si dejas la contraseña vacía, se generará una automática.',
    'admin.resetAccessEmail': 'Email de login',
    'admin.resetAccessPassword': 'Contraseña',
    'admin.resetAccessPasswordPlaceholder': 'Vacío = generar automática',
    'admin.resetAccessSave': 'Guardar acceso',
    'admin.resetAccessSaved': 'Acceso guardado — copia antes de cerrar:',
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
    'msg.passwordRequiredForChange':
      'Ingresa tu contraseña actual para cambiar la contraseña.',
    'msg.passwordMismatch': 'La nueva contraseña y la repetición no coinciden.',
    'msg.passwordTooShort': 'La nueva contraseña debe tener al menos 8 caracteres.',
    'msg.whatsappConnected': 'WhatsApp conectado. Completa los datos de tu negocio.',
    'msg.whatsappConnectedPhone': 'WhatsApp conectado ({phone}). Completa los datos de tu negocio.',
    'msg.qrTimeout':
      'Se agotó el tiempo de espera del QR. Pulsa «Actualizar QR» e inténtalo de nuevo.',
    'msg.qrWaiting': 'Escanea el QR una sola vez… ({seconds}s)',
    'msg.creatingWhatsapp': 'Creando instancia en Evolution API…',
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
    'table.clientEmail': 'Email login',
    'table.registrationEmail': 'Email cadastro (onboarding)',
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
    'profile.onboardHint':
      'Complete os dados do seu negócio. A saudação de boas-vindas define como o assistente responde no WhatsApp.',
    'profile.sectionAccount': 'Seu acesso',
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
    'profile.bookingUrl': 'URL de reservas',
    'profile.bookingUrlHint': 'Link onde o hóspede pode reservar.',
    'profile.primaryLanguage': 'Idioma principal',
    'profile.businessExample': 'Ex. {name}',
    'profile.slug': 'Slug técnico (Qdrant / n8n)',
    'profile.changePassword': 'Alterar senha',
    'profile.currentPassword': 'Senha atual',
    'profile.newPassword': 'Nova senha',
    'profile.confirmPassword': 'Repetir nova senha',
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
    'msg.passwordRequiredForChange':
      'Informe sua senha atual para alterar a senha.',
    'msg.passwordMismatch': 'A nova senha e a repetição não coincidem.',
    'msg.passwordTooShort': 'A nova senha deve ter pelo menos 8 caracteres.',
    'msg.whatsappConnected': 'WhatsApp conectado. Complete os dados do seu negócio.',
    'msg.whatsappConnectedPhone': 'WhatsApp conectado ({phone}). Complete os dados do seu negócio.',
    'msg.qrTimeout':
      'O tempo de espera do QR expirou. Clique em «Atualizar QR» e tente novamente.',
    'msg.qrWaiting': 'Escaneie o QR uma única vez… ({seconds}s)',
    'msg.creatingWhatsapp': 'Criando instância na Evolution API…',
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
    'table.clientEmail': 'Login email',
    'table.registrationEmail': 'Registration email (onboarding)',
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
    'profile.onboardHint':
      'Complete your business details. The welcome greeting defines how the assistant replies on WhatsApp.',
    'profile.sectionAccount': 'Your access',
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
    'profile.bookingUrl': 'Booking URL',
    'profile.bookingUrlHint': 'Link where guests can make a reservation.',
    'profile.primaryLanguage': 'Primary language',
    'profile.businessExample': 'E.g. {name}',
    'profile.slug': 'Technical slug (Qdrant / n8n)',
    'profile.changePassword': 'Change password',
    'profile.currentPassword': 'Current password',
    'profile.newPassword': 'New password',
    'profile.confirmPassword': 'Repeat new password',
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
    'msg.passwordRequiredForChange':
      'Enter your current password to change your password.',
    'msg.passwordMismatch': 'New password and confirmation do not match.',
    'msg.passwordTooShort': 'New password must be at least 8 characters.',
    'msg.whatsappConnected': 'WhatsApp connected. Complete your business details.',
    'msg.whatsappConnectedPhone': 'WhatsApp connected ({phone}). Complete your business details.',
    'msg.qrTimeout':
      'QR wait time expired. Click «Refresh QR» and try again.',
    'msg.qrWaiting': 'Scan the QR code once… ({seconds}s)',
    'msg.creatingWhatsapp': 'Creating instance in Evolution API…',
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

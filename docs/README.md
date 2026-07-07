# Documentación FAQ Inn

Esta carpeta concentra documentos complementarios del proyecto FAQ Inn.

## Índice inicial

| Carpeta | Función |
|---|---|
| `arquitectura/` | Decisiones arquitectónicas, componentes, dominios y límites del sistema. |
| `onboarding/` | Flujos de alta: cuenta, WhatsApp, wizard por objetivo, FAQs transversales y pausa operador. Ver `onboarding/README.md`, `faqs-transversales.md`, `pausa-operador.md`. |
| `motor-reservas/` | Motor de reservas (noches): `motor-reservas/README.md`. Motor de agenda (horarios): API `agendaEngineService.js` + `agendaUrlExtractor.js`. |
| `calcom/` | Evaluación Cal.com self-hosted (EasyPanel): iframe + API v2. **En pausa** — ver `calcom/ESTADO-MODULO.md`. |
| `systemprompt-configurable/` | Módulo funcional para construir el system prompt desde secciones administrables, versionadas y customizables por objetivo, tenant y cliente. |
| `n8n/` | Plantillas y contratos de workflows n8n. |
| `evolution-api/` | Contratos, cierre del módulo onboarding y decisiones de integración con Evolution API. |
| `pruebas/` | Subproyectos de prueba controlados, criterios de éxito, descarte y decisión final. |

El README principal del proyecto sigue siendo `FAQ Inn/README.md`.

# Documentación FAQ Inn

Esta carpeta concentra documentos complementarios del proyecto FAQ Inn.

## Índice inicial

| Carpeta | Función |
|---|---|
| `arquitectura/` | Decisiones arquitectónicas, componentes, dominios y límites del sistema. |
| `onboarding/` | Flujos de alta: cuenta, WhatsApp, wizard por objetivo, FAQs transversales y pausa operador. Ver `onboarding/README.md`, `faqs-transversales.md`, `pausa-operador.md`. |
| `motor-reservas/` | Motor de reservas (noches): `motor-reservas/README.md`. Motor de agenda (horarios): pendiente. |
| `prompts/` | Plantillas de prompts por vertical. |
| `n8n/` | Plantillas y contratos de workflows n8n. Contrato Admin vs runtime: el objetivo del tenant es `tenant_settings.objetivo_slug`; Admin lo lee en `GET /api/admin/tenants/:id` y n8n en `GET /api/runtime/tenant-config` (ver README §8.2.2). |
| `evolution-api/` | Contratos, cierre del módulo onboarding y decisiones de integración con Evolution API. |
| `motor-reservas/` | Motor de reservas: documentación única en `motor-reservas/README.md`. |
| `pruebas/` | Subproyectos de prueba controlados, criterios de éxito, descarte y decisión final. |

El README principal del proyecto sigue siendo `FAQ Inn/README.md`. Deploy y cache-bust de UI: `DEPLOY.md`.

# Onboarding de tenants hoteleros

## Decisión vigente

El MVP inmediato valida solo el onboarding automático de WhatsApp con Evolution API.

No incluye todavía lógica conversacional, n8n productivo, carga de FAQs, prompts finales ni panel completo de administración.

## Flujo objetivo MVP

```text
1. Usuario entra a inn.at-once.cl.
2. Ingresa nombre comercial y correo electrónico.
3. Pulsa Registrar y continuar.
4. Backend FAQ Inn genera tenant_slug único y crea tenant en PostgreSQL (draft).
5. Backend crea instancia Evolution API con instance_name = faqinn_<tenant_slug>.
6. Backend configura webhook (MESSAGES_UPSERT) y settings de instancia.
7. Backend obtiene QR en Base64 desde Evolution API.
8. Frontend muestra QR e instrucciones de escaneo.
9. Frontend consulta GET /api/provision/status/:instance cada 3 segundos (sin pedir QR nuevo).
10. Cuando Evolution reporta state=open, backend captura phone_number.
11. Backend actualiza tenant a connected.
12. Frontend muestra pantalla de éxito con número vinculado.
```

## Endpoints propios del MVP

```text
POST /api/provision/register
POST /api/provision/whatsapp
GET  /api/provision/status/:instance
```

El frontend nunca debe llamar directamente a Evolution API.

## Datos mínimos de registro

```text
commercial_name
email
tenant_slug generado automáticamente
```

## Persistencia mínima

Tablas mínimas esperadas:

```text
tenants
evolution_instances
```

Campos mínimos conceptuales para `tenants`:

```text
id
commercial_name
email
tenant_slug
status
created_at
updated_at
```

Campos mínimos conceptuales para `evolution_instances`:

```text
id
tenant_id
instance_name
status
phone_number
webhook_url
last_qr_at
connected_at
created_at
updated_at
```

Campo definido por arquitecto para etapa posterior (no implementado en MVP onboarding):

```text
instance_token_encrypted
```

## Cierre MVP Evolution

Validado en producción. Ver [../evolution-api/ESTADO-MODULO.md](../evolution-api/ESTADO-MODULO.md).

## Estados del MVP

```text
draft
qr_pending
connected
error
```

Estados posteriores, fuera del MVP inmediato:

```text
webhook_configured
testing
active
suspended
cancelled
```

## Reglas de seguridad

```text
La API key de Evolution API vive solo en variables de entorno del backend.
El frontend no recibe credenciales de Evolution API.
El estado se consulta contra backend FAQ Inn, no contra Evolution API.
Para pruebas controladas se permite sesión efímera o token firmado; no usar solo slug público como mecanismo de autorización definitivo.
```

## Fuera de alcance del MVP inmediato

```text
n8n conversacional
carga de FAQs
prompts por vertical
respuestas automáticas
Chatwoot operativo
panel completo de administración
login completo de usuarios
```

## Criterio de éxito

```text
Un usuario externo puede crear un tenant mínimo y dejar un número de WhatsApp vinculado en Evolution API sin tocar código, n8n, EasyPanel ni configuración manual.
```

## Regla operativa

MorroReservas no debe usarse para pruebas de onboarding. Todo piloto se realiza sobre FAQ Inn o tenants demo nuevos.

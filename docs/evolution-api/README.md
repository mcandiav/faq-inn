# Evolution API en FAQ Inn

## Decisión MVP

FAQ Inn usará Evolution API como proveedor inicial para conectar WhatsApp mediante QR.

## Responsabilidades esperadas

| Acción | Responsable |
|---|---|
| Crear instancia | Provisioner FAQ Inn |
| Obtener QR | Provisioner FAQ Inn |
| Mostrar QR al cliente | App FAQ Inn |
| Detectar conexión | Provisioner FAQ Inn |
| Configurar webhook | Provisioner FAQ Inn |
| Enviar y recibir mensajes | Evolution API + n8n |

## Datos por instancia

```text
tenant_id
instance_name
evolution_api_url
evolution_api_key_encrypted
phone_number
connection_status
last_qr
connected_at
webhook_url
created_at
updated_at
```

## Regla de seguridad

La API key de la instancia debe almacenarse cifrada y no debe mostrarse al cliente final.

## Abstracción futura

Aunque Evolution API sea el proveedor MVP, la app debe modelar una capa `WhatsAppProvider` para permitir migrar en el futuro a WAHA, WhatsApp Cloud API u otro proveedor.

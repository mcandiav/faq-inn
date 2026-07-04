# Evolution API en FAQ Inn

## Decisión MVP

FAQ Inn usará Evolution API como proveedor inicial para conectar WhatsApp mediante QR.

## Servicio confirmado en DEV

Los datos operativos completos viven en `infra.md`. Resumen vigente:

```text
Servicio Swarm: n8n_evolution-api
Imagen: evoapicloud/evolution-api:v2.3.7
Puerto interno: 8080
URL pública: https://n8n-evolution-api.to9nfy.easypanel.host
URL interna recomendada: http://n8n_evolution-api:8080
Redes: easypanel, easypanel-n8n
DB dedicada: n8n_evolution-api-db
Redis dedicado: n8n_evolution-api-redis
Volumen instancias: n8n_evolution-api_instances -> /evolution/instances
```

## Responsabilidades esperadas

| Acción | Responsable |
|---|---|
| Crear instancia | Provisioner FAQ Inn |
| Obtener QR | Provisioner FAQ Inn |
| Mostrar QR al cliente | App FAQ Inn |
| Detectar conexión | Provisioner FAQ Inn |
| Configurar webhook hacia runtime n8n multitenant | Provisioner FAQ Inn |
| Enviar y recibir mensajes | Evolution API + n8n |

## Contrato mínimo a validar

Antes de automatizar producción, el Programador debe validar en la versión `v2.3.7` los endpoints reales para:

```text
crear instancia
obtener QR/conectar instancia
consultar estado de conexión
configurar webhook por instancia
eliminar/desconectar instancia de prueba
```

## Datos por instancia

```text
tenant_id
agent_id
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

La API key de Evolution debe almacenarse cifrada o como secreto de infraestructura y no debe mostrarse al cliente final. Los secretos observados en variables Swarm/EasyPanel no deben copiarse a documentación ni código.

## Abstracción futura

Aunque Evolution API sea el proveedor MVP, la app debe modelar una capa `WhatsAppProvider` para permitir migrar en el futuro a WAHA, WhatsApp Cloud API u otro proveedor.

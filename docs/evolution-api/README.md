# Evolution API en FAQ Inn

## Estado del módulo

**MVP onboarding:** cerrado (V1.3.x). Documento de cierre: [ESTADO-MODULO.md](./ESTADO-MODULO.md).

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
| Generar o registrar token de instancia | Provisioner FAQ Inn |
| Obtener QR | Provisioner FAQ Inn |
| Mostrar QR al cliente | App FAQ Inn |
| Detectar conexión | Provisioner FAQ Inn |
| Guardar `instance_name`, token y `phone_number` | Backend FAQ Inn |
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
instance_token_encrypted
evolution_api_url
phone_number
connection_status
last_qr
connected_at
webhook_url
created_at
updated_at
```

## Regla de webhook hacia n8n

Cuando Evolution API envíe eventos al webhook de n8n, el payload debe permitir identificar la instancia que originó el evento.

La regla de runtime será:

```text
payload Evolution -> extraer instance_name -> buscar evolution_instances.instance_name -> resolver tenant_id -> cargar configuración completa del tenant/agente.
```

El campo exacto de instancia debe confirmarse con un payload real antes de cerrar el contrato del runtime n8n.

## Desvinculación desde el teléfono

Si el tenant desvincula WhatsApp desde su teléfono, FAQ Inn debe tratarlo como un evento normal del ciclo de vida de la instancia, no como un error inesperado.

Regla operativa:

```text
Si Evolution API informa o refleja que la instancia dejó de estar conectada, FAQ Inn debe marcar la evolution_instance como disconnected y suspender respuestas automáticas para esa instancia.
```

Comportamiento esperado:

```text
1. Detectar el cambio de estado por webhook Evolution o por polling/consulta de estado.
2. Actualizar evolution_instances.status = disconnected.
3. Registrar disconnected_at y motivo si Evolution lo informa.
4. Marcar el canal WhatsApp del tenant como no operativo.
5. Evitar que n8n responda mensajes asociados a esa instancia mientras esté desconectada.
6. Notificar al tenant en el panel o por correo.
7. Mostrar acción Reconectar WhatsApp.
8. Regenerar QR sobre la misma instancia si Evolution lo permite; si no, crear una nueva instancia controlada y actualizar la relación en base de datos.
9. Registrar el evento en auditoría.
```

Estados mínimos recomendados para la instancia:

```text
qr_pending
connected
disconnected
reconnecting
error
```

Regla de responsabilidad:

```text
n8n no es responsable de validar el estado de conexión de la instancia. Si la instancia no está connected, Evolution API no debería entregar mensajes entrantes operativos al webhook conversacional. La detección de desconexión, actualización de estado y reconexión pertenecen al backend/provisioner de FAQ Inn y a Evolution API.
```

## Regla de seguridad

La API key de Evolution debe almacenarse cifrada o como secreto de infraestructura y no debe mostrarse al cliente final. Los secretos observados en variables Swarm/EasyPanel no deben copiarse a documentación ni código.

## Abstracción futura

Aunque Evolution API sea el proveedor MVP, la app debe modelar una capa `WhatsAppProvider` para permitir migrar en el futuro a WAHA, WhatsApp Cloud API u otro proveedor.

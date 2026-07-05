# Contrato de Datos — Motor de Reservas

## Objetivo

Definir la estructura mínima que FAQ Inn debe persistir para que cada tenant tenga una lógica de reserva configurable, validada y reutilizable por el runtime conversacional.

---

## Entidad conceptual

```text
tenant_booking_config
```

Esta entidad pertenece a un tenant y puede tener una configuración activa por agente o por vertical, según la evolución del producto.

---

## Campos mínimos

| Campo | Tipo conceptual | Descripción |
|---|---|---|
| `tenant_id` | string | Identificador interno del tenant. |
| `agent_id` | string | Identificador del agente que usará esta configuración. |
| `vertical_slug` | string | Vertical funcional, inicialmente `hotel`. |
| `booking_url_mode` | enum | `fixed_link`, `manual_template`, `discovered_template`. |
| `booking_engine_name` | string | Nombre visible o detectado del motor: Booking, Omnibees, sitio propio, etc. |
| `booking_url_base` | string | Dominio/ruta base, sin variables cuando sea posible. |
| `booking_url_template` | string | Plantilla final con placeholders aprobados. |
| `required_fields` | json | Datos que el agente debe recolectar antes de construir el link. |
| `date_format` | string | Formato requerido por el motor: `YYYY-MM-DD`, `DDMMYYYY`, etc. |
| `occupancy_format` | string | Forma de representar ocupación: query params, path compacto, arreglo, etc. |
| `supports_rooms` | boolean | Indica si el motor soporta habitaciones como variable. |
| `supports_children` | boolean | Indica si el motor soporta menores. |
| `supports_child_ages` | boolean | Indica si el motor exige edades de menores. |
| `fixed_params` | json | Parámetros que se mantienen constantes. |
| `variable_params` | json | Mapa de parámetros/rutas hacia placeholders. |
| `sample_links` | json | Links usados en la detección. |
| `sample_scenarios` | json | Escenarios esperados asociados a cada link. |
| `confidence_score` | number | Confianza calculada por el extractor. |
| `validation_status` | enum | `draft`, `detected`, `needs_review`, `approved`, `rejected`, `disabled`. |
| `approved_by` | string | Usuario/admin que aprobó la plantilla. |
| `approved_at` | datetime | Fecha de aprobación. |
| `created_at` | datetime | Fecha de creación. |
| `updated_at` | datetime | Fecha de última modificación. |

---

## Placeholders permitidos inicialmente

```text
{{checkin}}
{{checkout}}
{{nights}}
{{adults}}
{{children}}
{{child_ages}}
{{rooms}}
{{language}}
{{currency}}
```

No se deben aceptar placeholders arbitrarios sin validación.

---

## Ejemplo de plantilla query params

```text
https://book.omnibees.com/hotelresults?c=1374&q=2166&currencyId=16&lang=pt-BR&hotel_folder=&NRooms={{rooms}}&CheckIn={{checkin_ddmmyyyy}}&CheckOut={{checkout_ddmmyyyy}}&ad={{adults}}&ch={{children}}&ag={{child_ages_csv}}&Code=&group_code=&loyalty_code=
```

---

## Ejemplo de plantilla path params

```text
https://www.pousadamichele.com/search/{{checkin_yyyy_mm_dd}}/{{checkout_yyyy_mm_dd}}/{{occupancy_path}}
```

Donde `occupancy_path` debe derivarse desde una regla aprobada, por ejemplo:

```text
{{adults}}-{{child_ages_dash}}
```

Esta regla no debe asumirse sin validación.

---

## Relación con n8n

El runtime n8n debe recibir o consultar una configuración ya aprobada.

Campos mínimos requeridos por n8n para conversar:

```text
booking_url_mode
booking_url_template
required_fields
date_format
supports_children
supports_child_ages
supports_rooms
validation_status
```

Si `validation_status != approved`, el agente no debe generar link dinámico y debe usar una alternativa segura definida por el tenant: link fijo, contacto humano o mensaje de derivación.

# Motor de Reservas

## Estado

Módulo arquitectónico inicial para descubrir, construir, validar y guardar la plantilla de URL de reservas por tenant.

Este módulo no forma parte del flujo conversacional principal de n8n. Su objetivo es configurar una vez la lógica de reserva del tenant y dejar una plantilla aprobada que luego pueda ser consumida por el runtime conversacional.

---

## Objetivo

Permitir que FAQ Inn detecte la estructura de URL del motor de reservas de cada tenant sin hardcodear Booking, Airbnb, Omnibees, Cloudbeds, sitio propio u otros motores.

El resultado esperado del módulo es una configuración persistida en el perfil del tenant:

```text
booking_url_template
booking_url_mode
booking_engine_name
required_fields
date_format
occupancy_format
supports_rooms
supports_children
supports_child_ages
fixed_params
variable_params
validation_status
confidence_score
approved_by
approved_at
```

---

## Principio arquitectónico

La URL de reserva no debe vivir en el prompt del agente ni hardcodeada en n8n.

Regla vigente:

```text
La página de configuración descubre y valida la plantilla.
El backend guarda la plantilla aprobada.
El agente conversa, recolecta datos y usa la plantilla ya aprobada.
n8n no descubre motores de reserva en tiempo real.
```

---

## Flujo funcional

```text
Tenant entra a Configurar motor de reservas
      ↓
FAQ Inn genera escenarios controlados de prueba
      ↓
Tenant abre su motor real y copia 3 links resultantes
      ↓
Backend extractor compara URLs contra los valores esperados
      ↓
Sistema detecta path params, query params, fechas y ocupación
      ↓
Sistema propone booking_url_template
      ↓
Tenant/Miguel revisa vista previa
      ↓
Se ejecuta validación con datos de ejemplo
      ↓
Se aprueba y guarda en perfil del tenant
      ↓
Runtime conversacional usa la plantilla aprobada
```

---

## Escenarios mínimos de prueba

La página debe pedir links generados desde escenarios controlados. Los valores exactos se calculan según la fecha del día en que se ejecuta la configuración.

Escenario 1:

```text
1 habitación
entrada: hoy
salida: hoy + 3 noches
2 adultos
1 menor de 10 años
```

Escenario 2:

```text
1 habitación
entrada: hoy
salida: hoy + 7 noches
3 adultos
2 menores de 10 y 11 años
```

Escenario 3:

```text
2 habitaciones
entrada: hoy
salida: hoy + 3 noches
2 adultos
sin menores
```

El extractor no debe adivinar desde links aleatorios. Debe comparar cada URL contra el escenario esperado que FAQ Inn le solicitó al tenant.

---

## Responsabilidades

### Frontend FAQ Inn

- Mostrar instrucciones simples al tenant.
- Generar escenarios visibles.
- Recibir los 3 links de prueba.
- Mostrar vista previa de plantilla detectada.
- Permitir aprobar, rechazar o pedir revisión manual.

### Backend FAQ Inn

- Generar los escenarios con fechas concretas.
- Parsear URLs.
- Comparar diferencias.
- Detectar variables.
- Construir `booking_url_template`.
- Calcular confianza.
- Validar plantilla con datos de prueba.
- Guardar configuración aprobada.
- Exponer la configuración al runtime n8n.

### n8n conversacional

- No descubre URLs.
- No interpreta motores.
- Solo consume configuración aprobada.
- Recolecta datos requeridos y solicita al backend construir el link final o rellena una plantilla autorizada, según la decisión técnica final.

### Agente/helper opcional

Puede existir un helper n8n o servicio IA auxiliar para casos ambiguos, pero no debe ser fuente final de verdad. Su salida debe quedar sujeta a validación del backend y aprobación.

---

## Modos soportados

### Modo A — Link fijo

El tenant solo entrega un link genérico de reservas.

Uso esperado:

```text
Enviar link sin parámetros dinámicos.
```

### Modo B — Plantilla manual

Miguel/admin define manualmente la plantilla de URL.

Uso esperado:

```text
Casos conocidos o motores donde la plantilla es clara.
```

### Modo C — Descubrimiento desde ejemplos

FAQ Inn solicita 3 links controlados y propone una plantilla.

Uso esperado:

```text
MVP avanzado para tenants sin conocimiento técnico.
```

---

## Límites

El módulo no debe:

- prometer disponibilidad real;
- calcular precios;
- reservar directamente;
- modificar datos en el motor externo;
- asumir parámetros no validados;
- aceptar links aleatorios sin escenario asociado;
- permitir que el prompt del tenant controle la lógica de reserva.

---

## Documentos del módulo

| Documento | Función |
|---|---|
| `README.md` | Definición arquitectónica del módulo. |
| `contrato-datos.md` | Modelo de datos esperado para guardar la plantilla. |
| `extractor-url.md` | Reglas de extracción y detección de variables. |
| `pagina-configuracion.md` | Diseño funcional de la página para el tenant. |
| `pruebas.md` | Casos de prueba y criterios de aceptación. |

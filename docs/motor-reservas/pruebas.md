# Pruebas — Motor de Reservas

## Objetivo

Definir pruebas mínimas para validar que el módulo descubre, construye y guarda correctamente una plantilla de URL de reservas.

---

## Caso 1 — Link fijo

### Entrada

Tenant informa un link genérico:

```text
https://hotel.example.com/reservas
```

### Resultado esperado

```text
booking_url_mode = fixed_link
booking_url_template = https://hotel.example.com/reservas
validation_status = approved o needs_review según política
```

### Criterio de aceptación

El agente puede enviar el link fijo sin intentar construir parámetros dinámicos.

---

## Caso 2 — Query params simples

### Entrada

Tres links con fechas, adultos y habitaciones en query params.

### Resultado esperado

El extractor identifica:

```text
checkin
checkout
adults
rooms
```

### Criterio de aceptación

La plantilla generada reproduce correctamente una URL nueva con fechas distintas.

---

## Caso 3 — Omnibees-like

### Entrada ejemplo

```text
https://book.omnibees.com/hotelresults?c=1374&q=2166&currencyId=16&lang=pt-BR&hotel_folder=&NRooms=1&CheckIn=14072026&CheckOut=16072026&ad=2&ch=1&ag=10&Code=&group_code=&loyalty_code=
```

### Resultado esperado

Detectar al menos:

```text
NRooms -> rooms
CheckIn -> checkin_ddmmyyyy
CheckOut -> checkout_ddmmyyyy
ad -> adults
ch -> children
ag -> child_ages_csv
```

### Criterio de aceptación

Confianza alta si los 3 escenarios son consistentes.

---

## Caso 4 — Path params compactos

### Entrada ejemplo

```text
https://www.pousadamichele.com/search/2026-07-05/2026-07-06/2-5
```

### Resultado esperado

Detectar:

```text
path segment 1 -> checkin_yyyy_mm_dd
path segment 2 -> checkout_yyyy_mm_dd
path segment 3 -> occupancy_path candidato
```

### Criterio de aceptación

Si la ocupación compacta no es inequívoca, debe quedar `needs_review`.

---

## Caso 5 — Links inconsistentes

### Entrada

Links de distintos dominios o motores.

### Resultado esperado

```text
validation_status = rejected o needs_review
```

### Criterio de aceptación

El sistema no debe activar plantilla automática.

---

## Caso 6 — Fechas no encontradas

### Entrada

El tenant pega links que no contienen las fechas solicitadas.

### Resultado esperado

```text
confidence_score bajo
validation_status = needs_review
warning = fechas no detectadas
```

### Criterio de aceptación

El sistema ofrece link fijo o revisión manual.

---

## Caso 7 — Plantilla aprobada consumida por runtime

### Entrada

Configuración aprobada en perfil del tenant.

### Resultado esperado

El runtime conversacional recibe la configuración y puede generar un link final solo después de recolectar campos requeridos.

### Criterio de aceptación

El agente no debe generar link dinámico si la configuración no está aprobada.

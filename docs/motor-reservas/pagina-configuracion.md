# Página de Configuración — Motor de Reservas

## Objetivo

Definir la página que permitirá al tenant configurar su motor de reservas sin editar prompts, n8n ni parámetros técnicos.

Nombre sugerido:

```text
Configurar motor de reservas
```

Alternativa visible para usuario final:

```text
Descubrir URL de reservas
```

---

## Ubicación funcional

La página debe vivir dentro del perfil/admin del tenant.

Ruta conceptual:

```text
/admin/booking-engine
```

---

## Flujo de pantalla

### Paso 1 — Seleccionar modo

Opciones:

```text
Usar link fijo
Crear plantilla manual
Descubrir plantilla desde links de prueba
```

Para MVP se recomienda implementar primero:

```text
Link fijo
Descubrir plantilla desde links de prueba
```

---

### Paso 2 — Generar escenarios

FAQ Inn calcula fechas concretas según el día de ejecución y muestra instrucciones.

Ejemplo si hoy es 2026-07-05:

```text
Escenario 1:
Busque disponibilidad para 1 habitación, entrada 2026-07-05, salida 2026-07-08, 2 adultos y 1 menor de 10 años. Pegue aquí el link resultante.

Escenario 2:
Busque disponibilidad para 1 habitación, entrada 2026-07-05, salida 2026-07-12, 3 adultos y 2 menores de 10 y 11 años. Pegue aquí el link resultante.

Escenario 3:
Busque disponibilidad para 2 habitaciones, entrada 2026-07-05, salida 2026-07-08, 2 adultos y sin menores. Pegue aquí el link resultante.
```

---

### Paso 3 — Pegar links

Campos:

```text
url_scenario_1
url_scenario_2
url_scenario_3
```

Validaciones iniciales:

- Debe ser URL válida.
- Debe usar `http` o `https`.
- Las tres URLs deben pertenecer al mismo dominio o motor, salvo excepción aprobada.
- No debe contener credenciales, tokens sensibles o datos personales innecesarios.

---

### Paso 4 — Detectar plantilla

El frontend envía los links y escenarios al backend extractor.

El backend responde:

```text
Plantilla detectada
Nivel de confianza
Variables detectadas
Parámetros fijos
Advertencias
```

---

### Paso 5 — Vista previa

La app debe mostrar una prueba legible:

```text
Con estos datos:
Entrada: 2026-08-10
Salida: 2026-08-13
Adultos: 2
Menores: 1 menor de 8 años
Habitaciones: 1

FAQ Inn generaría este link:
https://...
```

---

### Paso 6 — Aprobación

Estados posibles:

```text
Aprobar plantilla
Solicitar revisión manual
Usar link fijo en su lugar
Cancelar
```

Regla:

```text
Solo una plantilla aprobada puede ser usada por el agente.
```

---

## Mensaje al tenant

Texto sugerido:

```text
Para que el agente pueda enviar links de reserva correctos, necesitamos aprender cómo tu motor de reservas construye sus URLs. Te pediremos tres búsquedas específicas. Copia el link resultante de cada búsqueda y lo analizaremos automáticamente.
```

---

## Resultado guardado

Al aprobar, la configuración queda asociada al tenant y disponible para el runtime conversacional.

Si no se aprueba, el agente debe operar en modo seguro:

```text
Enviar link fijo
Derivar a humano
Informar contacto oficial
```

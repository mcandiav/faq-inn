# Extractor de URL — Motor de Reservas

## Objetivo

Definir cómo FAQ Inn debe analizar links de prueba generados por el tenant para construir una plantilla de URL de reserva.

---

## Entrada del extractor

El extractor debe recibir:

```json
{
  "tenant_id": "...",
  "agent_id": "...",
  "generated_at": "2026-07-05",
  "scenarios": [
    {
      "id": "S1",
      "checkin": "2026-07-05",
      "checkout": "2026-07-08",
      "nights": 3,
      "rooms": 1,
      "adults": 2,
      "children": 1,
      "child_ages": [10],
      "url": "..."
    }
  ]
}
```

La URL nunca debe analizarse sin el escenario esperado asociado.

---

## Proceso de extracción

1. Normalizar URLs.
2. Separar protocolo, host, path y query params.
3. Detectar partes fijas comunes entre los 3 links.
4. Buscar valores esperados dentro de path y query.
5. Detectar formatos de fecha.
6. Detectar representación de ocupación.
7. Construir placeholders.
8. Generar plantilla candidata.
9. Calcular confianza.
10. Validar generando URLs nuevas con escenarios sintéticos.

---

## Detección de fechas

Formatos iniciales soportados:

```text
YYYY-MM-DD
DDMMYYYY
YYYYMMDD
DD/MM/YYYY
MM/DD/YYYY
```

Regla:

```text
El extractor debe usar los escenarios generados por FAQ Inn para saber qué fecha buscar.
```

Ejemplo:

```text
2026-07-05 -> {{checkin_yyyy_mm_dd}}
05072026 -> {{checkin_ddmmyyyy}}
20260705 -> {{checkin_yyyymmdd}}
```

---

## Detección de query params

Ejemplo:

```text
CheckIn=14072026&CheckOut=16072026&ad=2&ch=1&ag=10
```

Resultado esperado:

```json
{
  "CheckIn": "{{checkin_ddmmyyyy}}",
  "CheckOut": "{{checkout_ddmmyyyy}}",
  "ad": "{{adults}}",
  "ch": "{{children}}",
  "ag": "{{child_ages_csv}}"
}
```

---

## Detección de path params

Ejemplo:

```text
/search/2026-07-05/2026-07-06/2-5
```

Resultado posible:

```text
/search/{{checkin_yyyy_mm_dd}}/{{checkout_yyyy_mm_dd}}/{{occupancy_path}}
```

La composición de `occupancy_path` debe quedar marcada como `needs_review` si no hay evidencia suficiente.

---

## Confianza

Criterio sugerido:

| Nivel | Condición |
|---|---|
| Alta | Fechas, adultos, niños y habitaciones detectados de forma consistente en parámetros separados. |
| Media | Fechas detectadas, pero ocupación compacta o parcialmente ambigua. |
| Baja | No se detectan fechas o los valores aparecen múltiples veces sin patrón claro. |

Solo configuraciones con confianza alta o aprobación manual deben quedar `approved`.

---

## Salida del extractor

```json
{
  "booking_url_mode": "discovered_template",
  "booking_url_template": "...",
  "date_format": "DDMMYYYY",
  "required_fields": ["checkin", "checkout", "adults", "children", "child_ages", "rooms"],
  "supports_rooms": true,
  "supports_children": true,
  "supports_child_ages": true,
  "fixed_params": {},
  "variable_params": {},
  "confidence_score": 0.92,
  "validation_status": "detected",
  "warnings": []
}
```

---

## Regla de seguridad

El extractor puede proponer una plantilla, pero no debe activarla sin validación y aprobación.

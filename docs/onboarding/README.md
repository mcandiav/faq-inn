# Onboarding de tenants hoteleros

## Flujo objetivo

```text
1. Prospecto entra a inn.at-once.cl.
2. Selecciona vertical Hotel.
3. Completa datos del negocio.
4. La app crea el tenant.
5. La app crea instancia Evolution API.
6. La app muestra QR de WhatsApp.
7. El cliente escanea el QR.
8. La app espera estado connected.
9. La app genera workflow n8n desde plantilla.
10. La app configura webhook Evolution hacia n8n.
11. La app ejecuta prueba final.
12. El tenant queda activo.
```

## Estados sugeridos

```text
draft
provisioning
waiting_qr_scan
connected
workflow_created
testing
active
error
suspended
cancelled
```

## Regla operativa

MorroReservas no debe usarse para pruebas de onboarding. Todo piloto se realiza sobre FAQ Inn o tenants demo nuevos.

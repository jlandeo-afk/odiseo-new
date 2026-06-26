# API: Preview de Diseño

Base path (tenant schema): `/api/v1/pdf-designs`

---

## Generar preview

```
POST /api/v1/pdf-designs/:id/preview
```

**Headers**: `x-subdomain: {tenant}`

**Body**: Opcional — permite previsualizar antes de guardar:
```json
{
  "name": "Mi diseño",
  "primaryColor": "#1a56db",
  "headerText": "Universidad - {course_name}",
  "footerText": "Página {page} de {total}",
  "showCover": true,
  "showPagination": true,
  "showFrame": true,
  "contactInfo": "info@email.com"
}
```

Si se envía body vacío, usa la configuración guardada del diseño.

**Response** `200`:
```json
{
  "html": "<html><head><style>...</style></head><body>...</body></html>"
}
```

**Descripción**: El HTML contiene:
- **Página 1**: Portada con logo, título "Semana {week_number} - {course_name}", línea decorativa con `primary_color`, información de contacto, imagen de fondo si aplica.
- **Página 2**: Página interior con header (logo pequeño + header_text), body con texto de relleno, footer con paginación, y bordes/frame si `show_frame`.

**Frontend**: Renderizar con `<iframe srcdoc="html" sandbox="allow-same-origin">`.

---

## Preview inline (sin guardar diseño)

Para el selector en generación, que debe mostrar preview rápida sin crear diseño completo:

Se reutiliza el mismo endpoint. El diseño se obtiene por ID y se genera el HTML siempre con datos dummy (semana 1, curso "Ejemplo"). No requiere argumentos adicionales.

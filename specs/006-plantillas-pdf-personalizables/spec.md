# Feature Specification: Plantillas PDF Personalizables

**Feature Branch**: `006-plantillas-pdf-personalizables`

**Created**: 2026-06-25

**Status**: Draft

**Input**: User description: "plantillas para personalizar pdfs"

## User Scenarios & Testing

### User Story 1 - Configurar diseño visual de PDFs por ciclo (Priority: P1)

Como administrador, quiero poder subir el logo institucional y elegir colores primarios para los PDFs generados en un ciclo, para que los materiales tengan la identidad visual de la institución.

**Why this priority**: El branding es la personalización más común y de mayor impacto visual. Sin esto, el resto de personalización tiene menos sentido.

**Independent Test**: Puede probarse seleccionando un ciclo, subiendo un logo y configurando un color primario, luego generando un PDF y verificando que refleje los cambios.

**Acceptance Scenarios**:

1. **Given** un ciclo activo sin personalización de PDF, **When** el administrador sube un logo institucional (PNG, <2MB) y selecciona un color primario, **Then** el sistema guarda la configuración y los próximos PDFs generados usan el nuevo logo y color.
2. **Given** un ciclo con personalización guardada, **When** se genera un material para cualquier semana de ese ciclo, **Then** los PDFs incluyen el logo en header y el color primario en títulos y acentos.
3. **Given** un administrador en la configuración del ciclo, **When** sube un archivo que no es imagen o supera 2MB, **Then** el sistema muestra un error claro y no guarda el archivo.

---

### User Story 2 - Configurar header y footer por plantilla (Priority: P2)

Como administrador, quiero personalizar el texto del header y footer (título, pie de página, números de página) por cada plantilla de material, para adaptar el formato a cada tipo de documento.

**Why this priority**: Diferentes plantillas (exámenes, guías, prácticas) necesitan distinta información en encabezados y pies de página.

**Independent Test**: Puede probarse configurando header/footer en una plantilla específica, generando un PDF, y verificando que solo esa plantilla use el nuevo formato.

**Acceptance Scenarios**:

1. **Given** una plantilla de material, **When** el administrador configura el header personalizado ("Universidad X - Examen Parcial"), **Then** los PDFs generados con esa plantilla muestran ese texto en el header.
2. **Given** una plantilla sin header personalizado, **When** se genera un PDF, **Then** se usa el header por defecto del ciclo.
3. **Given** una plantilla con footer configurado como "Página {page} de {total}", **When** se genera un PDF de 5 páginas, **Then** cada página muestra el número de página y el total correctamente.

---

### User Story 3 - Previsualizar cambios de diseño (Priority: P3)

Como administrador, quiero previsualizar cómo se verá el PDF con la configuración actual antes de generar los materiales, para asegurarme de que el diseño es correcto.

**Why this priority**: La previsualización ahorra tiempo y evita generar PDFs incorrectos, pero no bloquea la funcionalidad principal.

**Independent Test**: Puede probarse configurando logo y colores, luego solicitando una vista previa que genere una página de muestra.

**Acceptance Scenarios**:

1. **Given** una configuración de diseño completa (logo, colores, header, footer), **When** el administrador hace clic en "Vista Previa", **Then** el sistema genera una página PDF de muestra que refleja todos los cambios.
2. **Given** que no se ha subido logo, **When** se solicita vista previa, **Then** el PDF de muestra se genera con el layout pero sin logo (mostrando solo texto placeholder).

---

### Edge Cases

- ¿Qué pasa cuando el logo subido excede el tamaño máximo (2MB)? → Error claro, no se guarda.
- ¿Cómo se maneja un logo con dimensiones muy grandes? → Redimensionar automáticamente a un ancho máximo (ej. 200px) manteniendo aspect ratio.
- ¿Qué ocurre si se elimina un ciclo que tiene configuraciones de PDF? → Las configuraciones se eliminan en cascada.
- ¿Cómo se comporta la personalización cuando no hay configuración de ciclo pero sí de plantilla? → Se usa la de plantilla; si no hay, valores por defecto.

## Requirements

### Functional Requirements

- **FR-001**: Administradores MUST poder subir un logo institucional (PNG, JPG, <2MB) desde la configuración del ciclo.
- **FR-002**: Sistema MUST redimensionar automáticamente el logo a un ancho máximo de 200px preservando aspect ratio.
- **FR-003**: Administradores MUST poder seleccionar un color primario mediante un color picker, almacenado como hex.
- **FR-004**: Sistema MUST poder configurar header y footer de forma independiente por plantilla de material.
- **FR-005**: Sistema MUST soportar variables dinámicas en header/footer: `{page}`, `{total}`, `{course_name}`, `{week_number}`, `{template_name}`.
- **FR-006**: Sistema MUST generar PDFs aplicando la configuración de diseño del ciclo + plantilla en el momento de generación.
- **FR-007**: Sistema MUST incluir una página de muestra para previsualización sin generar materiales reales.
- **FR-008**: Administradores MUST poder restablecer la configuración visual a valores por defecto.
- **FR-009**: Sistema MUST persistir la configuración de diseño (logo, colores, header, footer) asociada al ciclo y a la plantilla.

### Key Entities

- **CyclePDFConfig**: Configuración de diseño a nivel de ciclo (logo_url, primary_color, default_header, default_footer).
- **TemplatePDFConfig**: Configuración de diseño a nivel de plantilla (override_header, override_footer, que hereda de CyclePDFConfig).
- **GeneratedPDF**: PDF generado con la configuración aplicada (referencia a CyclePDFConfig/TemplatePDFConfig usada).

## Success Criteria

### Measurable Outcomes

- **SC-001**: Administradores pueden configurar logo y color en menos de 2 minutos desde la interfaz.
- **SC-002**: Los PDFs generados reflejan la personalización visual en el primer intento de generación tras la configuración.
- **SC-003**: La página de vista previa se genera en menos de 3 segundos.
- **SC-004**: Reducción del 80% en solicitudes de soporte relacionadas con formato de PDFs.

## Assumptions

- Los administradores tienen acceso a imágenes en formato PNG o JPG para el logo.
- El sistema de generación de PDFs actual está basado en una librería que soporta personalización visual (plantillas HTML a PDF o similar).
- Mobile support para la configuración está fuera de scope para v1.
- La personalización se aplica solo a PDFs, no a otros formatos de salida.
- No se requiere soporte para múltiples logos por ciclo (un logo institucional es suficiente).

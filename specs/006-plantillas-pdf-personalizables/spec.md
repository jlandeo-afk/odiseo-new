# Feature Specification: Plantillas PDF Personalizables

**Feature Branch**: `006-plantillas-pdf-personalizables`

**Created**: 2026-06-25

**Status**: Draft

**Input**: User description: "plantillas para personalizar pdfs"

## Clarifications

### Session 2026-06-26

- Q: ¿Cuáles son los elementos exactos que el administrador puede personalizar por diseño? → A: Completo visual — Logo, imagen de banner/header, watermark, color primario de títulos, color secundario de títulos, color de fondo highlight.
- Q: ¿El diseño se asocia a nivel de ciclo, plantilla de material, o es independiente? → A: Independiente + selección al generar. Los diseños son entidades independientes; al generar material el usuario elige cuál aplicar. Se puede marcar uno como default.
- Q: ¿El header/footer personalizable se refiere a contenido textual o también al layout? → A: Solo contenido. El layout (posiciones, tamaños) es fijo en la plantilla HTML. El admin configura qué texto/imágenes se insertan en cada slot (título, subtítulos, logo, banner).
- Q: ¿El preview se genera en el formulario de diseño, en el flujo de generación, o en ambos? → A: En ambos momentos. Preview HTML en el formulario de diseño (feedback en tiempo real al editar) y preview al seleccionar diseño durante la generación de material (confirmación antes de lanzar el job).
- Q: ¿La plantilla de diseño controla solo el envoltorio visual o también aspectos del cuerpo del contenido? → A: Solo envoltorio. El diseño controla header (logo, banner, colores, títulos), watermark y footer. El cuerpo (preguntas, alternativas, claves, secciones) es responsabilidad del motor de generación.

## User Scenarios & Testing

### User Story 1 - Crear y gestionar diseños visuales de PDF (Priority: P1)

Como administrador, quiero poder crear diseños visuales independientes (logo, banner, watermark, colores) y marcar uno como default, para que los materiales generados tengan la identidad visual de la institución sin estar atados a un ciclo específico.

**Why this priority**: El branding es la personalización más común y de mayor impacto visual. Sin esto, el resto de personalización tiene menos sentido.

**Independent Test**: Puede probarse creando un diseño con logo y colores, marcándolo como default, luego generando un PDF y verificando que refleje los cambios.

**Acceptance Scenarios**:

1. **Given** un tenant sin diseños de PDF, **When** el administrador crea un diseño con logo (PNG, <2MB), banner, colores y lo marca como default, **Then** el sistema guarda el diseño y los próximos PDFs generados usan ese diseño automáticamente.
2. **Given** un diseño marcado como default, **When** se genera un material sin seleccionar diseño explícitamente, **Then** los PDFs aplican el diseño default (logo, banner, colores).
3. **Given** un administrador creando un diseño, **When** sube un archivo que no es imagen o supera 2MB, **Then** el sistema muestra un error claro y no guarda el archivo.
4. **Given** múltiples diseños creados, **When** el administrador marca un nuevo diseño como default, **Then** el anterior pierde el flag de default automáticamente.

---

### User Story 2 - Configurar layout avanzado de Header y Footer (Priority: P2)

Como administrador, quiero disponer de una grilla de 3 zonas (Izquierda, Centro, Derecha) para el header y footer donde pueda insertar texto, imágenes o variables dinámicas, y controlar en qué páginas se muestran.

**Why this priority**: Permite un diseño editorial profesional tipo libro, adaptando la información mostrada según las reglas de cada institución.

**Independent Test**: Puede probarse configurando zonas diferentes en el header y probando su visibilidad condicional en la primera página vs las restantes.

**Acceptance Scenarios**:

1. **Given** la configuración de Header/Footer, **When** el administrador inserta un texto en la zona "Derecha" y un logo en la zona "Izquierda", **Then** el PDF refleja esa distribución exacta.
2. **Given** las opciones de visibilidad, **When** el usuario desmarca "Mostrar en primera página", **Then** el PDF generado inicia sin header/footer en la primera página de contenido, apareciendo desde la segunda.
3. **Given** el helper de variables, **When** el usuario selecciona "Insertar Variable" > `{curso}`, **Then** el tag se inyecta en el campo de texto y en la generación se reemplaza por el nombre real del curso procesado.

---

### User Story 3 - Previsualizar diseño en edición y al generar (Priority: P3)

Como administrador, quiero previsualizar cómo se verá el PDF con el diseño actual tanto al crear/editar el diseño como al seleccionarlo para una generación de material, para asegurarme de que el resultado visual es correcto antes de confirmar.

**Why this priority**: La previsualización ahorra tiempo y evita generar PDFs incorrectos, pero no bloquea la funcionalidad principal.

**Independent Test**: Puede probarse configurando logo y colores en el formulario de diseño y verificando el preview en tiempo real, luego seleccionando ese diseño al generar material y verificando el preview de confirmación.

**Acceptance Scenarios**:

1. **Given** un diseño en edición con logo, banner y colores configurados, **When** el administrador modifica cualquier campo visual, **Then** el preview HTML se actualiza en tiempo real mostrando los cambios.
2. **Given** un diseño guardado, **When** el administrador lo selecciona al generar material, **Then** se muestra un preview HTML con los datos del material (nombre del curso, tema) aplicados al diseño.
3. **Given** que no se ha subido logo, **When** se solicita preview, **Then** el preview se genera con el layout pero sin logo (slot vacío).

---

### Edge Cases

- ¿Qué pasa cuando el logo subido excede el tamaño máximo (2MB)? → Error claro, no se guarda.
- ¿Cómo se maneja un logo con dimensiones muy grandes? → Redimensionar automáticamente a un ancho máximo manteniendo aspect ratio.
- ¿Qué ocurre si se elimina un diseño que está marcado como default? → Se elimina el diseño y ningún diseño queda como default; el sistema usa valores por defecto del HTML base.
- ¿Qué pasa si se genera material sin ningún diseño creado ni default? → Se usa la plantilla HTML base sin personalización visual (sin logo, colores por defecto).
- ¿Cómo se comporta el preview cuando faltan assets (ej. banner no subido)? → El preview renderiza el layout con los slots vacíos visibles.

## Requirements

### Functional Requirements

- **FR-001**: Administradores MUST poder usar un constructor visual dividido (Sidebar de herramientas y Visor/Preview interactivo).
- **FR-002**: Sistema MUST permitir cargar plantillas predefinidas o "Temas Base" (One-Click) que configuren colores, tipografías y bordes inmediatamente.
- **FR-003**: Administradores MUST poder configurar una Portada opcional (subiendo una imagen) y activar/desactivar grandes bloques estructurales visualmente.
- **FR-004**: Sistema MUST soportar controles granulares de márgenes para impresión (Arriba, Abajo, Interior/Encuadernación, Exterior) y un modo "Diseño de Libro (Páginas Espejadas)" para invertir márgenes y zonas en páginas pares/impares.
- **FR-005**: Sistema MUST proveer una grilla de 3 zonas (Izquierda, Centro, Derecha) tanto para el Header como para el Footer, permitiendo incrustar texto, alinear contenido y subir pequeñas imágenes. Además, deben tener controles de visibilidad ("Mostrar en primera página", "Mostrar en el resto").
- **FR-006**: Sistema MUST incluir un "Helper / Dropdown de Variables" interactivo para inyectar shortcodes en los textos. Las variables deben incluir: `{material_titulo}`, `{curso}`, `{temas}`, `{fecha_generacion}`, `{page}`, `{total_pages}`, `{institucion_nombre}`.
- **FR-007**: Sistema MUST aplicar el esquema visual (márgenes, tipografía, CSS dinámico) durante la generación del PDF mediante Playwright.
- **FR-008**: Administradores MUST poder hacer clic en elementos del Visor y abrir contextualmente sus ajustes en la barra lateral (Ej: Clic en la portada abre opciones de imagen de portada).
- **FR-009**: El alcance de `PdfDesignTemplate` se limita al envoltorio visual y estructural (márgenes, tipografía, colores, bloques envolventes). La distribución interna de las preguntas (columnas, disposición de las alternativas) es responsabilidad del motor de preguntas, NO del diseño.

### Key Entities

- **PdfDesignTemplate**: Diseño visual agrupando: name, cover_image_url, watermark_image_url, primary_title_color, secondary_title_color, background_highlight_color, header_config (JSON 3 zonas + visibilidad), footer_config (JSON 3 zonas + visibilidad), margin_top, margin_bottom, margin_inside, margin_outside, is_book_mode (boolean), font_family, border_radius, blocks_config (JSON), is_default (boolean).
- **GeneratedPDF**: PDF generado con la configuración aplicada (referencia a PdfDesignTemplate usada).

## Success Criteria

### Measurable Outcomes

- **SC-001**: Administradores pueden configurar logo y color en menos de 2 minutos desde la interfaz.
- **SC-002**: Los PDFs generados reflejan la personalización visual en el primer intento de generación tras la configuración.
- **SC-003**: El preview HTML se genera en menos de 500ms (sin Playwright).
- **SC-004**: Reducción del 80% en solicitudes de soporte relacionadas con formato de PDFs.

## Assumptions

- Los administradores tienen acceso a imágenes en formato PNG o JPG para el logo y assets visuales.
- El sistema de generación de PDFs actual está basado en Playwright (HTML a PDF) y soporta inyección de CSS variables e imágenes base64.
- Mobile support para la configuración está fuera de scope para v1.
- La personalización se aplica solo a PDFs, no a otros formatos de salida.
- No se requiere soporte para múltiples logos por diseño (un logo institucional por diseño es suficiente).
- El diseño visual (PdfDesignTemplate) controla SOLO el envoltorio (header, footer, watermark, colores); NO el contenido del cuerpo del material.
- Se espera 1-3 diseños por tenant (ej. "formal azul", "prácticas verde", "examen rojo").

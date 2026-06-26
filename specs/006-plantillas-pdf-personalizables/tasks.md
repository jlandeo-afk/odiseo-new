# Tasks: Plantillas PDF Personalizables

> Ordered by dependency. Tasks at the top must be completed first.

---

## Task 1: Entidad PdfDesignTemplate + migración

**Backend** | `backend-nestjs/src/materials/pdf-design/pdf-design.entity.ts`

**Dependencies**: None

**Acceptance Criteria**:
- [ ] Entidad `PdfDesignTemplate` creada con todos los campos del [data-model.md](./data-model.md)
- [ ] Columnas: `id`, `tenant_id`, `name`, `logo_url`, `primary_color`, `font_family`, `header_text`, `footer_text`, `show_cover`, `background_url`, `show_pagination`, `show_frame`, `contact_info`, `is_default`, `created_at`, `updated_at`
- [ ] Partial unique index: solo un `is_default = true` por tenant
- [ ] Migración generada y aplicable
- [ ] Columna `design_template_id` agregada a `MaterialRequest` (FK nullable, ON DELETE SET NULL)

---

## Task 2: Instalar multer + crear S3 upload service para assets

**Backend** | `backend-nestjs/src/aws/`

**Dependencies**: None (puede correr en paralelo con Task 1)

**Acceptance Criteria**:
- [ ] `multer` instalado en `package.json`
- [ ] `FileInterceptor` configurado global o por endpoint
- [ ] Endpoint `POST /api/v1/pdf-designs/:id/upload-logo` que:
  - Recibe archivo `file` (multipart, PNG/JPG, max 2MB)
  - Lo sube a S3 con key `designs/{tenant_id}/{design_id}-logo.png`
  - Actualiza `logo_url` en `PdfDesignTemplate`
  - Devuelve `{ logoUrl: "..." }`
- [ ] Endpoint `POST /api/v1/pdf-designs/:id/upload-background` (misma lógica)
- [ ] Endpoint `DELETE /api/v1/pdf-designs/:id/asset?type=logo|background` que elimina archivo de S3 y actualiza null
- [ ] Validación de tipo MIME y tamaño en el interceptor
- [ ] Redimensionar logo a 200px de ancho máximo (usar `sharp` o similar)

---

## Task 3: CRUD service de PdfDesignTemplate

**Backend** | `backend-nestjs/src/materials/pdf-design/pdf-design.service.ts`

**Dependencies**: Task 1

**Acceptance Criteria**:
- [ ] `PdfDesignService` con métodos:
  - `findAll(tenantId)` → lista todos
  - `findById(id, tenantId)` → uno por id
  - `create(dto, tenantId)` → crear (si `is_default=true`, desmarca el anterior)
  - `update(id, dto, tenantId)` → parcial
  - `delete(id, tenantId)` → no permite eliminar si es el único default
- [ ] Validaciones:
  - `name` único por tenant
  - `primary_color` formato hex si se envía
  - `is_default`: solo uno por tenant

---

## Task 4: CRUD controller de PdfDesignTemplate

**Backend** | `backend-nestjs/src/materials/pdf-design/pdf-design.controller.ts`

**Dependencies**: Task 3

**Acceptance Criteria**:
- [ ] `PdfDesignController` con endpoints según [contracts/api-design-crud.md](./contracts/api-design-crud.md)
- [ ] `GET /api/v1/pdf-designs` — lista
- [ ] `GET /api/v1/pdf-designs/:id` — detalle
- [ ] `POST /api/v1/pdf-designs` — crear
- [ ] `PATCH /api/v1/pdf-designs/:id` — actualizar
- [ ] `DELETE /api/v1/pdf-designs/:id` — eliminar
- [ ] `x-subdomain` header para tenant isolation
- [ ] Registrar en `MaterialsModule` o módulo dedicado

---

## Task 5: Preview endpoint

**Backend** | `backend-nestjs/src/materials/pdf-design/pdf-design.controller.ts` + `pdf-design.service.ts`

**Dependencies**: Task 4

**Acceptance Criteria**:
- [ ] `POST /api/v1/pdf-designs/:id/preview` que:
  - Si body vacío: usa diseño guardado
  - Si body con campos: usa campos enviados (permite preview sin guardar)
  - Construye HTML con portada (página 1) + página interior (página 2)
  - Inyecta variables CSS (`--primary-color`, `--font-family`)
  - Inyecta logo, fondo, textos, y toggle de secciones
  - Devuelve `{ html: "..." }`
- [ ] Variables stub: `course_name = "Ejemplo"`, `week_number = 1`
- [ ] Manejar edge cases: sin logo (no renderiza img), sin fondo (fondo blanco)

---

## Task 6: Inyectar diseño en el PDF generator service

**Backend** | `backend-nestjs/src/materials/services/pdf-generator.service.ts`

**Dependencies**: Task 1, Task 3

**Acceptance Criteria**:
- [ ] `PdfGeneratorService.generatePdf()` acepta `designTemplateId?: string` como parámetro opcional
- [ ] Si `designTemplateId` presente: fetchea `PdfDesignTemplate` de DB
- [ ] Inyecta logo, colores, header, footer, portada en el HTML:
  - CSS variables en `<style>` block
  - Logo en `<img>` (si existe)
  - `headerText` en el header de Playwright (interpolando variables `{page}`, `{total}`, `{course_name}`, etc.)
  - `footerText` en el footer de Playwright
  - Portada como primera página si `showCover = true`
  - Paginación si `showPagination = true`
  - Bordes/frame si `showFrame = true`
  - Fondo como CSS `background-image` si `background_url` existe
- [ ] Si no hay `designTemplateId`, comportamiento actual (sin cambios)

---

## Task 7: Extender worker processor con design_template_id

**Backend** | `backend-nestjs/src/materials/processors/pdf-generation.processor.ts`

**Dependencies**: Task 6

**Acceptance Criteria**:
- [ ] Payload del job acepta `designTemplateId` (opcional)
- [ ] El worker pasa `designTemplateId` a `PdfGeneratorService.generatePdf()`
- [ ] `MaterialRequest.design_template_id` se guarda al generar
- [ ] Logging: "Applying design template {id} to material {requestId}"
- [ ] El worker no falla si `designTemplateId` es null/undefined

---

## Task 8: Extender generate-material use case y DTO

**Backend** | `backend-nestjs/src/materials/`

**Dependencies**: Task 7

**Acceptance Criteria**:
- [ ] `CreateMaterialRequestDto` extiende con `designTemplateId?: string`
- [ ] `GenerateMaterialUseCase` pasa `designTemplateId` al payload del job
- [ ] `MaterialRequest.design_template_id` se persiste al crear la request
- [ ] Si no se envía, queda null (sin diseño personalizado)

---

## Task 9: Frontend — Store de diseños

**Frontend** | `frontend-vue/src/features/materials/store/pdfDesigns.ts`

**Dependencies**: Task 4 (API exists)

**Acceptance Criteria**:
- [ ] Store Pinia `usePdfDesignsStore` con:
  - `designs: PdfDesignTemplate[]`
  - `isLoading`, `error`
  - `fetchDesigns()`, `fetchDesign(id)`, `createDesign(dto)`, `updateDesign(id, dto)`, `deleteDesign(id)`
  - `uploadLogo(designId, file)`, `uploadBackground(designId, file)`, `deleteAsset(designId, type)`
  - `fetchPreview(designId, body?)`

---

## Task 10: Frontend — Lista de diseños

**Frontend** | `frontend-vue/src/features/materials/components/PdfDesignList.vue`

**Dependencies**: Task 9

**Acceptance Criteria**:
- [ ] Lista de tarjetas de diseño con nombre, colores, preview del logo
- [ ] Indicador visual de diseño default (badge "Por defecto")
- [ ] Botones: Editar, Eliminar, Duplicar, Marcar como default
- [ ] Botón "Nuevo diseño" que abre el formulario
- [ ] Skeleton mientras carga (3 tarjetas placeholder)
- [ ] Estado vacío: "No hay plantillas de diseño. Crea la primera."

---

## Task 11: Frontend — Formulario de diseño

**Frontend** | `frontend-vue/src/features/materials/components/PdfDesignForm.vue`

**Dependencies**: Task 9, Task 10

**Acceptance Criteria**:
- [ ] Formulario con:
  - Input: Nombre
  - File upload: Logo (con preview del logo subido)
  - Color picker: Color primario
  - Select: Fuente (Arial, Times New Roman, etc.)
  - Input: Texto de header (con hint de variables disponibles)
  - Input: Texto de footer
  - Toggle: Mostrar portada
  - File upload: Fondo (con preview)
  - Toggle: Paginación
  - Toggle: Bordes/marco
  - Textarea: Información de contacto
  - Checkbox: Marcar como default
- [ ] Botones: Guardar, Cancelar
- [ ] Preview en tiempo real (o botón "Vista previa" que llama al preview endpoint)
- [ ] Validación client-side (nombre requerido, tamaño de archivos, formato color)
- [ ] Modo creación vs edición

---

## Task 12: Frontend — Selector de diseño en generación

**Frontend** | `frontend-vue/src/features/materials/components/PdfDesignSelector.vue`

**Dependencies**: Task 9, Task 11

**Acceptance Criteria**:
- [ ] Integrado en `MaterialMatrixGenerator.vue` (panel lateral al generar)
- [ ] Selector dropdown o tarjetas pequeñas con los diseños disponibles
- [ ] Preview rápida del diseño seleccionado (llamar preview endpoint)
- [ ] Si hay diseño default, preseleccionado automáticamente
- [ ] Opción "Sin personalización" (envía null)
- [ ] El `design_template_id` se envía en el payload al generar

---

## Task 13: Frontend — Preview en selector

**Frontend** | `frontend-vue/src/features/materials/components/PdfDesignPreview.vue`

**Dependencies**: Task 12

**Acceptance Criteria**:
- [ ] Componente de preview que muestra HTML en `<iframe srcdoc="...">`
- [ ] Carga del HTML desde el endpoint de preview
- [ ] Loading state mientras se obtiene el HTML
- [ ] Layout responsivo para ver portada + página interior
- [ ] Botón "Cerrar preview" o click fuera para cerrar

---

## Task 14: Pruebas de integración end-to-end

**Backend + Frontend** | Both

**Dependencies**: All previous tasks

**Acceptance Criteria**:
- [ ] Test de integración: crear diseño → upload logo → preview → generar material → verificar diseño en PDF
- [ ] Test de worker: job con designTemplateId aplica logo y colores
- [ ] Test de preview: HTML generado contiene las variables inyectadas
- [ ] Test de fallback: sin designTemplateId, PDF se genera con diseño base

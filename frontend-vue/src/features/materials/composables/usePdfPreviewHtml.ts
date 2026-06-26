export interface PreviewDesign {
  logoUrl?: string | null
  primaryColor?: string | null
  fontFamily?: string | null
  headerText?: string | null
  footerText?: string | null
  showCover?: boolean
  backgroundUrl?: string | null
  showPagination?: boolean
  showFrame?: boolean
  contactInfo?: string | null
}

const stubCourse = 'Matemáticas'
const stubWeek = 3
const stubTemplate = 'Examen Parcial'

function resolveVars(text: string): string {
  return text
    .replace(/\{page\}/g, '1')
    .replace(/\{total\}/g, '2')
    .replace(/\{course_name\}/g, stubCourse)
    .replace(/\{week_number\}/g, String(stubWeek))
    .replace(/\{template_name\}/g, stubTemplate)
}

export function usePdfPreviewHtml() {
  function buildPreviewHtml(design: PreviewDesign): string {
    const primary = design.primaryColor || '#6366f1'
    const font = design.fontFamily || 'Arial, sans-serif'
    const logoBlock = design.logoUrl
      ? `<img src="${design.logoUrl}" class="logo" alt="Logo" />`
      : `<div class="logo-placeholder">Logo</div>`
    const bgStyle = design.backgroundUrl
      ? `background-image: url('${design.backgroundUrl}'); background-size: cover; background-position: center;`
      : ''

    const resolvedHeader = design.headerText ? resolveVars(design.headerText) : ''
    const resolvedFooter = design.footerText ? resolveVars(design.footerText) : ''

    const questions = [
      { n: 1, content: '¿Cuál es el resultado de la siguiente operación? 15 + 27 × 3 − 8 ÷ 2', opts: ['A) 92', 'B) 86', 'C) 94', 'D) 88'] },
      { n: 2, content: 'Determine el valor de "x" en la ecuación: 3(x − 4) + 5 = 2x + 1', opts: ['A) 6', 'B) 8', 'C) 10', 'D) 12'] },
      { n: 3, content: 'Una tienda ofrece un descuento del 15% en todos sus productos. Si un artículo cuesta $240, ¿cuánto se pagará después del descuento?', opts: ['A) $196', 'B) $204', 'C) $210', 'D) $216'] },
    ]

    const itemsHtml = questions.map(q => `
      <div class="q">
        <p class="q-num">${q.n}.</p>
        <div class="q-body">
          <p class="q-text">${q.content}</p>
          <div class="q-opts">
            ${q.opts.map(o => `<span class="opt">${o}</span>`).join('')}
          </div>
        </div>
      </div>
    `).join('')

    return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<style>
  :root { --primary: ${primary}; --font: ${font}; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: var(--font); color: #1e293b; line-height: 1.5; background: #fff; }
  ${design.showFrame ? '.page { border: 1.5px solid #e2e8f0; border-radius: 6px; margin: 12px; padding: 32px; }' : '.page { padding: 32px; margin: 12px; }'}
  .page { position: relative; min-height: 600px; ${bgStyle} background-color: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
  .header { display: flex; align-items: center; gap: 12px; padding-bottom: 16px; border-bottom: 2px solid var(--primary); margin-bottom: 20px; }
  .header .logo { height: 32px; object-fit: contain; }
  .logo-placeholder { width: 32px; height: 32px; background: #f1f5f9; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 8px; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; }
  .ht { font-size: 10px; color: #64748b; margin-left: auto; white-space: nowrap; }
  .title { font-size: 20px; font-weight: 800; color: var(--primary); margin-bottom: 4px; }
  .sub { font-size: 12px; color: #64748b; }
  .cover { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 500px; text-align: center; }
  .cover .logo-lg { max-height: 72px; margin-bottom: 24px; object-fit: contain; }
  .cover .logo-placeholder { width: 72px; height: 72px; margin-bottom: 24px; }
  .cover h1 { font-size: 28px; color: var(--primary); margin-bottom: 4px; font-weight: 800; }
  .cover .divider { width: 48px; height: 3px; background: var(--primary); margin: 16px auto; border-radius: 4px; }
  .cover .sub { font-size: 14px; color: #64748b; }
  .cover .contact { margin-top: 24px; font-size: 10px; color: #94a3b8; }
  .q { display: flex; gap: 8px; margin-bottom: 16px; }
  .q-num { font-size: 12px; font-weight: 700; color: var(--primary); min-width: 20px; }
  .q-text { font-size: 12px; color: #334155; margin-bottom: 6px; font-weight: 500; }
  .q-opts { display: flex; flex-wrap: wrap; gap: 8px; }
  .opt { font-size: 11px; color: #475569; background: #f8fafc; padding: 4px 10px; border-radius: 6px; border: 1px solid #e2e8f0; }
  .footer { position: absolute; bottom: 20px; left: 32px; right: 32px; display: flex; justify-content: center; font-size: 8px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }
</style>
</head>
<body>
${design.showCover ? `
<div class="page">
  <div class="cover">
    ${logoBlock}
    <h1>Semana ${stubWeek} — ${stubCourse}</h1>
    <div class="divider"></div>
    <p class="sub">${stubTemplate}</p>
    ${design.contactInfo ? `<p class="contact">${design.contactInfo}</p>` : ''}
  </div>
</div>
` : ''}
<div class="page">
  <div class="header">
    ${logoBlock}
    ${resolvedHeader ? `<span class="ht">${resolvedHeader}</span>` : ''}
  </div>
  ${itemsHtml}
  ${design.showPagination !== false ? `<div class="footer">${resolvedFooter || '1 / 2'}</div>` : ''}
</div>
</body>
</html>`
  }

  return { buildPreviewHtml }
}

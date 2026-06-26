import { Injectable, Logger } from '@nestjs/common';
import { chromium, Browser } from 'playwright';
import { ExtractedQuestion } from './core-api.service';

export interface DesignTemplateConfig {
  logoUrl?: string | null;
  primaryColor?: string | null;
  fontFamily?: string | null;
  headerText?: string | null;
  footerText?: string | null;
  showCover?: boolean;
  backgroundUrl?: string | null;
  showPagination?: boolean;
  showFrame?: boolean;
  contactInfo?: string | null;
}

@Injectable()
export class PdfGeneratorService {
  private readonly logger = new Logger(PdfGeneratorService.name);

  async generatePdf(
    tenant: any,
    courseId: string,
    questions: ExtractedQuestion[],
    design?: DesignTemplateConfig | null,
    weekNumber?: number,
    templateName?: string,
  ): Promise<Buffer> {
    this.logger.log(`Generating PDF for course ${courseId} with ${questions.length} questions.`);
    
    const html = this.buildHtml(tenant, courseId, questions, design, weekNumber, templateName);
    
    let browser: Browser | null = null;
    try {
      browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle' });
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '2cm', right: '2cm', bottom: '2cm', left: '2cm' }
      });
      
      return pdfBuffer;
    } catch (error) {
      this.logger.error(`Failed to generate PDF with Playwright: ${error.message}`);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  private buildHtml(
    tenant: any,
    courseId: string,
    questions: ExtractedQuestion[],
    design?: DesignTemplateConfig | null,
    weekNumber?: number,
    templateName?: string,
  ): string {
    const itemsHtml = questions.map((q, index) => `
      <div class="question-block" style="margin-bottom: 20px;">
        <p><strong>${index + 1}.</strong> ${q.content}</p>
        <ul style="list-style-type: none; padding-left: 15px;">
          ${q.options.map(opt => `<li>${opt}</li>`).join('')}
        </ul>
      </div>
    `).join('');

    if (design) {
      return this.buildDesignHtml(tenant, courseId, itemsHtml, design, weekNumber, templateName);
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; }
          .header { text-align: center; border-bottom: 2px solid #0056b3; padding-bottom: 10px; margin-bottom: 20px; }
          .logo { max-height: 60px; }
          .title { color: #0056b3; margin-top: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <!-- img src="${tenant.logo_url}" class="logo" alt="Logo" / -->
          <h2 class="title">${tenant.commercial_name || 'Institución'}</h2>
          <h3>Material Académico - Curso: ${courseId}</h3>
        </div>
        <div class="content">
          ${itemsHtml.length > 0 ? itemsHtml : '<p>No se encontraron preguntas para este material.</p>'}
        </div>
      </body>
      </html>
    `;
  }

  private buildDesignHtml(
    tenant: any,
    courseId: string,
    itemsHtml: string,
    design: DesignTemplateConfig,
    weekNumber?: number,
    templateName?: string,
  ): string {
    const primaryColor = design.primaryColor || '#1a56db';
    const fontFamily = design.fontFamily || 'Helvetica Neue, Helvetica, Arial, sans-serif';
    const wNum = weekNumber || 1;
    const tplName = templateName || 'Material';
    const courseName = tenant.commercial_name || courseId;

    const resolveVars = (text: string): string => {
      return text
        .replace(/\{page\}/g, '<span class="pageNumber"></span>')
        .replace(/\{total\}/g, '<span class="totalPages"></span>')
        .replace(/\{course_name\}/g, courseName)
        .replace(/\{week_number\}/g, String(wNum))
        .replace(/\{template_name\}/g, tplName);
    };

    const logoHtml = design.logoUrl
      ? `<img src="${design.logoUrl}" class="logo" alt="Logo" />`
      : '';
    const bgStyle = design.backgroundUrl
      ? `background-image: url('${design.backgroundUrl}'); background-size: cover; background-position: center;`
      : '';

    return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<style>
  :root { --primary: ${primaryColor}; --font: ${fontFamily}; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: var(--font); color: #1f2937; line-height: 1.6; }
  ${design.showFrame ? '.page { border: 1.5px solid #e5e7eb; border-radius: 4px; padding: 2cm; }' : '.page { padding: 2cm; }'}
  .page { width: 100%; min-height: 100%; position: relative; ${bgStyle} }
  .header { display: flex; align-items: center; gap: 1rem; padding-bottom: 1rem; border-bottom: 2px solid var(--primary); margin-bottom: 1.5rem; }
  .header .logo { height: 40px; object-fit: contain; }
  .header-text { font-size: 11px; color: #6b7280; margin-left: auto; }
  .footer { position: absolute; bottom: 1.5cm; left: 2cm; right: 2cm; display: flex; justify-content: center; font-size: 9px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 0.5cm; }
  .cover-page { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 90%; text-align: center; }
  .cover-page .logo-lg { max-height: 80px; margin-bottom: 2rem; object-fit: contain; }
  .cover-page h1 { font-size: 28px; color: var(--primary); margin-bottom: 0.5rem; }
  .cover-page .divider { width: 60px; height: 3px; background: var(--primary); margin: 1rem auto; border-radius: 2px; }
  .cover-page .subtitle { font-size: 16px; color: #6b7280; }
  .cover-page .contact { margin-top: 2rem; font-size: 11px; color: #9ca3af; }
  .content h2.question-title { font-size: 14px; color: var(--primary); margin-bottom: 0.5rem; margin-top: 1rem; }
  .content p { font-size: 12px; margin-bottom: 0.3rem; color: #4b5563; }
  .content ul { list-style: none; padding-left: 1rem; }
  .content ul li { font-size: 11px; color: #6b7280; padding: 2px 0; }
</style>
</head>
<body>
${design.showCover ? `
<div class="page">
  <div class="cover-page">
    ${logoHtml || '<div style="width:80px;height:80px;background:#f3f4f6;border-radius:12px;display:flex;align-items:center;justify-content:center;margin-bottom:2rem;font-size:10px;color:#9ca3af;">Sin Logo</div>'}
    <h1>Semana ${wNum} - ${courseName}</h1>
    <div class="divider"></div>
    <p class="subtitle">${tplName}</p>
    ${design.contactInfo ? `<p class="contact">${design.contactInfo}</p>` : ''}
  </div>
</div>
` : ''}
<div class="page">
  <div class="header">
    ${logoHtml}
    <span class="header-text">${design.headerText ? resolveVars(design.headerText) : ''}</span>
  </div>
  <div class="content">
    ${itemsHtml.length > 0 ? itemsHtml : '<p>No se encontraron preguntas para este material.</p>'}
  </div>
  ${design.showPagination !== false ? `<div class="footer">${design.footerText ? resolveVars(design.footerText) : ''}</div>` : ''}
</div>
</body>
</html>`;
  }
}

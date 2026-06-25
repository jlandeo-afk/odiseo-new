import { Injectable, Logger } from '@nestjs/common';
import { chromium, Browser } from 'playwright';
import { ExtractedQuestion } from './core-api.service';

@Injectable()
export class PdfGeneratorService {
  private readonly logger = new Logger(PdfGeneratorService.name);

  async generatePdf(tenant: any, courseId: string, questions: ExtractedQuestion[]): Promise<Buffer> {
    this.logger.log(`Generating PDF for course ${courseId} with ${questions.length} questions.`);
    
    // 1. Generate HTML
    const html = this.buildHtml(tenant, courseId, questions);
    
    // 2. Render PDF with Playwright
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

  private buildHtml(tenant: any, courseId: string, questions: ExtractedQuestion[]): string {
    const itemsHtml = questions.map((q, index) => `
      <div class="question-block" style="margin-bottom: 20px;">
        <p><strong>${index + 1}.</strong> ${q.content}</p>
        <ul style="list-style-type: none; padding-left: 15px;">
          ${q.options.map(opt => `<li>${opt}</li>`).join('')}
        </ul>
      </div>
    `).join('');

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
}

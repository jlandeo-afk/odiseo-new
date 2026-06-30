import { Injectable, Logger } from '@nestjs/common';
import { chromium } from 'playwright';
import { GenerateMaterialJobDto } from '../materials/dto/generate-material-job.dto';

@Injectable()
export class PdfGeneratorService {
  private readonly logger = new Logger(PdfGeneratorService.name);

  async generatePdf(
    job: GenerateMaterialJobDto,
    questions: any[],
  ): Promise<Buffer> {
    this.logger.log(`Starting PDF generation for job ${job.job_id}...`);

    // Launch headless browser
    const browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const context = await browser.newContext();
      const page = await context.newPage();

      // Build HTML string
      const htmlContent = this.buildHtmlTemplate(job, questions);

      // Set the content
      await page.setContent(htmlContent, { waitUntil: 'load' });

      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: `
          <div style="font-size: 10px; width: 100%; text-align: center; font-family: 'Helvetica', 'Arial', sans-serif; color: #555; padding: 0 20px; box-sizing: border-box;">
             <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #ddd; padding-bottom: 5px;">
                <span style="font-weight: bold;">${job.tenant.commercial_name || 'Academia'}</span>
                <span>${job.material_type} - Nivel: ${job.difficulty_level}</span>
             </div>
          </div>
        `,
        footerTemplate: `
          <div style="font-size: 10px; width: 100%; text-align: center; font-family: 'Helvetica', 'Arial', sans-serif; color: #555;">
             <span class="pageNumber"></span> / <span class="totalPages"></span>
          </div>
        `,
        margin: { top: '60px', right: '40px', bottom: '60px', left: '40px' },
      });

      this.logger.log(`PDF successfully generated for job ${job.job_id}`);
      return pdfBuffer; // Playwright's page.pdf returns a Buffer directly
    } finally {
      await browser.close();
    }
  }

  private buildHtmlTemplate(
    job: GenerateMaterialJobDto,
    questions: any[],
  ): string {
    const questionsHtml = questions
      .map(
        (q, idx) => `
      <div class="question">
        <p class="question-title"><strong>${idx + 1}.</strong></p>
        <div class="question-body">
          ${q.question_text}
        </div>
        <div class="options">
          ${q.options.map((opt: any) => `<div class="option"><strong>${opt.label})</strong> ${opt.text}</div>`).join('')}
        </div>
      </div>
    `,
      )
      .join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Material ${job.job_id}</title>
        <style>
          /* CSS Reset and Font Settings */
          body { 
            font-family: 'Times New Roman', Georgia, serif; 
            color: #111; 
            line-height: 1.5; 
            margin: 0;
            padding: 0;
            font-size: 11pt;
          }
          
          /* Exam Layout: 2 Columns */
          .exam-container {
            column-count: 2;
            column-gap: 40px;
            column-rule: 1px solid #ccc;
          }

          /* Question Styles */
          .question { 
            break-inside: avoid; /* Prevent cutting across columns/pages */
            page-break-inside: avoid;
            margin-bottom: 25px; 
            display: flex;
            flex-direction: column;
          }
          
          .question-title {
            margin: 0 0 5px 0;
            font-size: 11pt;
          }

          .question-body {
            margin-bottom: 10px;
          }

          /* Handle Wiris SVGs / Images */
          .question-body img, .question-body svg, .question-body math {
            max-width: 100%;
            height: auto;
            display: inline-block;
            vertical-align: middle;
          }

          /* Options Layout (Vertical list for exam) */
          .options {
            display: flex;
            flex-direction: column;
            gap: 5px;
            padding-left: 10px;
          }
          .option {
            display: flex;
            gap: 8px;
          }
        </style>
      </head>
      <body>
        <div class="exam-container">
          ${questionsHtml}
        </div>
      </body>
      </html>
    `;
  }
}

import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { PdfDesignTemplate } from '../entities/pdf-design-template.entity';
import { MaterialRequest } from '../entities/material-request.entity';
import { CreatePdfDesignDto } from '../dto/create-pdf-design.dto';
import { S3Service } from '../../aws/s3.service';
import sharp from 'sharp';

@Injectable()
export class PdfDesignService {
  private readonly logger = new Logger(PdfDesignService.name);

  constructor(
    @InjectRepository(PdfDesignTemplate)
    private readonly designRepo: Repository<PdfDesignTemplate>,
    @InjectRepository(MaterialRequest)
    private readonly materialRequestRepo: Repository<MaterialRequest>,
    private readonly s3Service: S3Service,
  ) {}

  async findAll(tenantId: string): Promise<PdfDesignTemplate[]> {
    return this.designRepo.find({
      where: { tenantId },
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });
  }

  async findById(id: string, tenantId: string): Promise<PdfDesignTemplate> {
    const design = await this.designRepo.findOne({ where: { id, tenantId } });
    if (!design) throw new NotFoundException('Design template not found');
    return design;
  }

  async create(tenantId: string, dto: CreatePdfDesignDto): Promise<PdfDesignTemplate> {
    const existingCount = await this.designRepo.count({ where: { tenantId } });
    const shouldBeDefault = dto.isDefault ?? existingCount === 0;
    if (shouldBeDefault) {
      await this.unsetCurrentDefault(tenantId);
    }
    const design = this.designRepo.create({ ...dto, tenantId, isDefault: shouldBeDefault });
    return this.designRepo.save(design);
  }

  async update(id: string, tenantId: string, dto: Partial<CreatePdfDesignDto>): Promise<PdfDesignTemplate> {
    const design = await this.findById(id, tenantId);
    if (dto.isDefault && !design.isDefault) {
      await this.unsetCurrentDefault(tenantId);
    }
    if (dto.isDefault === false && design.isDefault) {
      const defaultCount = await this.designRepo.count({ where: { tenantId, isDefault: true } });
      if (defaultCount <= 1) {
        throw new ConflictException('Cannot unset the only default design template. Set another as default first.');
      }
    }
    Object.assign(design, dto);
    return this.designRepo.save(design);
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const design = await this.findById(id, tenantId);
    const totalCount = await this.designRepo.count({ where: { tenantId } });
    if (design.isDefault && totalCount <= 1) {
      throw new ConflictException('Cannot delete the only default design template. Set another as default first.');
    }
    const materialCount = await this.materialRequestRepo.count({ where: { designTemplateId: id } });
    if (materialCount > 0) {
      throw new ConflictException(
        `Cannot delete design template "${design.name}" because it is used by ${materialCount} material request(s).`
      );
    }
    await this.designRepo.remove(design);
    const remainingDefault = await this.designRepo.count({ where: { tenantId, isDefault: true } });
    if (remainingDefault === 0 && totalCount > 1) {
      const nextDesign = await this.designRepo.findOne({ where: { tenantId }, order: { createdAt: 'ASC' } });
      if (nextDesign) {
        nextDesign.isDefault = true;
        await this.designRepo.save(nextDesign);
      }
    }
  }

  async uploadLogo(designId: string, tenantId: string, file: Express.Multer.File): Promise<string> {
    const design = await this.findById(designId, tenantId);
    const resized = await sharp(file.buffer)
      .resize({ width: 200, withoutEnlargement: true })
      .png()
      .toBuffer();
    const key = `designs/${tenantId}/${designId}-logo.png`;
    const url = await this.s3Service.uploadBuffer(key, resized, 'image/png');
    design.logoUrl = url;
    await this.designRepo.save(design);
    return url;
  }

  async uploadBackground(designId: string, tenantId: string, file: Express.Multer.File): Promise<string> {
    const design = await this.findById(designId, tenantId);
    const key = `designs/${tenantId}/${designId}-background.png`;
    const url = await this.s3Service.uploadBuffer(key, file.buffer, file.mimetype);
    design.backgroundUrl = url;
    await this.designRepo.save(design);
    return url;
  }

  async deleteAsset(designId: string, tenantId: string, type: 'logo' | 'background'): Promise<void> {
    const design = await this.findById(designId, tenantId);
    if (type === 'logo') {
      design.logoUrl = null;
    } else {
      design.backgroundUrl = null;
    }
    await this.designRepo.save(design);
  }

  async generatePreview(
    tenantId: string,
    designId: string,
    overrides?: Partial<CreatePdfDesignDto>,
  ): Promise<{ html: string }> {
    let design: Partial<PdfDesignTemplate>;
    if (overrides && Object.keys(overrides).length > 0) {
      design = { ...overrides } as any;
    } else {
      design = await this.findById(designId, tenantId);
    }

    const primaryColor = design.primaryColor || '#1a56db';
    const fontFamily = design.fontFamily || 'Arial, sans-serif';
    const headerText = design.headerText || '';
    const footerText = design.footerText || '{page} / {total}';
    const contactInfo = design.contactInfo || '';
    const showCover = design.showCover !== false;
    const showPagination = design.showPagination !== false;
    const showFrame = design.showFrame !== false;
    const logoHtml = design.logoUrl
      ? `<img src="${design.logoUrl}" class="logo" alt="Logo" />`
      : '';
    const bgStyle = design.backgroundUrl
      ? `background-image: url('${design.backgroundUrl}'); background-size: cover; background-position: center;`
      : '';

    const resolvedHeader = headerText
      .replace(/\{page\}/g, '1')
      .replace(/\{total\}/g, '2')
      .replace(/\{course_name\}/g, 'Matemáticas')
      .replace(/\{week_number\}/g, '1')
      .replace(/\{template_name\}/g, 'Examen Parcial')
      .replace(/\{cycle_name\}/g, '2026-1');

    const resolvedFooter = footerText
      .replace(/\{page\}/g, '1')
      .replace(/\{total\}/g, '2')
      .replace(/\{course_name\}/g, 'Matemáticas')
      .replace(/\{week_number\}/g, '1')
      .replace(/\{template_name\}/g, 'Examen Parcial')
      .replace(/\{cycle_name\}/g, '2026-1');

    const frameStyle = showFrame
      ? 'border: 1.5px solid #e5e7eb; border-radius: 4px;'
      : '';

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  :root { --primary: ${primaryColor}; --font: ${fontFamily}; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: var(--font); color: #1f2937; line-height: 1.6; }
  .page { width: 210mm; min-height: 297mm; padding: 2cm; margin: 0 auto; position: relative; ${bgStyle} }
  ${showFrame ? '.page { border: 1.5px solid #e5e7eb; border-radius: 4px; }' : ''}
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
  .content { padding: 0 0.5cm; }
  .content h2 { font-size: 16px; color: var(--primary); margin-bottom: 1rem; }
  .content p { font-size: 12px; margin-bottom: 0.5rem; color: #4b5563; }
  ${design.logoUrl ? '.cover-page .logo-placeholder { display: none; }' : '.cover-page .logo-placeholder { width: 80px; height: 80px; background: #f3f4f6; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 2rem; font-size: 10px; color: #9ca3af; }'}
</style>
</head>
<body>
${showCover ? `
<div class="page">
  <div class="cover-page">
    ${logoHtml || '<div class="logo-placeholder">Sin Logo</div>'}
    <h1>Semana 1 - Matemáticas</h1>
    <div class="divider"></div>
    <p class="subtitle">Examen Parcial</p>
    <p class="contact">${contactInfo}</p>
  </div>
</div>
` : ''}
<div class="page">
  <div class="header">
    ${logoHtml}
    <span class="header-text">${resolvedHeader}</span>
  </div>
  <div class="content">
    <h2>Pregunta 1</h2>
    <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
    <h2>Pregunta 2</h2>
    <p>Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
    <h2>Pregunta 3</h2>
    <p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.</p>
  </div>
  ${showPagination ? `<div class="footer"><span>${resolvedFooter}</span></div>` : ''}
</div>
</body>
</html>`;

    return { html };
  }

  private async unsetCurrentDefault(tenantId: string): Promise<void> {
    await this.designRepo.update(
      { tenantId, isDefault: true },
      { isDefault: false },
    );
  }
}

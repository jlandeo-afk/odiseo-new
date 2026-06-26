import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UploadedFile,
  UseInterceptors,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { PdfDesignService } from './pdf-design.service';
import { CreatePdfDesignDto } from '../dto/create-pdf-design.dto';

@ApiTags('PDF Designs')
@Controller('v1/pdf-designs')
export class PdfDesignController {
  constructor(private readonly pdfDesignService: PdfDesignService) {}

  private getTenantId(@Headers('x-subdomain') subdomain?: string): string {
    return subdomain || '7b89-11c2-d344';
  }

  @Get()
  @ApiOperation({ summary: 'List all design templates' })
  async findAll(@Headers('x-subdomain') subdomain?: string) {
    return this.pdfDesignService.findAll(this.getTenantId(subdomain));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get design template by id' })
  async findById(
    @Param('id') id: string,
    @Headers('x-subdomain') subdomain?: string,
  ) {
    return this.pdfDesignService.findById(id, this.getTenantId(subdomain));
  }

  @Post()
  @ApiOperation({ summary: 'Create design template' })
  async create(
    @Body() dto: CreatePdfDesignDto,
    @Headers('x-subdomain') subdomain?: string,
  ) {
    return this.pdfDesignService.create(this.getTenantId(subdomain), dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update design template' })
  async update(
    @Param('id') id: string,
    @Body() dto: Partial<CreatePdfDesignDto>,
    @Headers('x-subdomain') subdomain?: string,
  ) {
    return this.pdfDesignService.update(id, this.getTenantId(subdomain), dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete design template' })
  async delete(
    @Param('id') id: string,
    @Headers('x-subdomain') subdomain?: string,
  ) {
    await this.pdfDesignService.delete(id, this.getTenantId(subdomain));
  }

  @Post(':id/upload-logo')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload logo for design template' })
  @ApiConsumes('multipart/form-data')
  async uploadLogo(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Headers('x-subdomain') subdomain?: string,
  ) {
    const logoUrl = await this.pdfDesignService.uploadLogo(id, this.getTenantId(subdomain), file);
    return { logoUrl };
  }

  @Post(':id/upload-background')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload background image for design template' })
  @ApiConsumes('multipart/form-data')
  async uploadBackground(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Headers('x-subdomain') subdomain?: string,
  ) {
    const backgroundUrl = await this.pdfDesignService.uploadBackground(id, this.getTenantId(subdomain), file);
    return { backgroundUrl };
  }

  @Post(':id/preview')
  @ApiOperation({ summary: 'Generate HTML preview of design template' })
  async preview(
    @Param('id') id: string,
    @Body() body?: Record<string, any>,
    @Headers('x-subdomain') subdomain?: string,
  ) {
    return this.pdfDesignService.generatePreview(this.getTenantId(subdomain), id, body);
  }

  @Delete(':id/asset')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete asset from design template' })
  async deleteAsset(
    @Param('id') id: string,
    @Query('type') type: 'logo' | 'background',
    @Headers('x-subdomain') subdomain?: string,
  ) {
    await this.pdfDesignService.deleteAsset(id, this.getTenantId(subdomain), type);
  }
}

import { Controller, Get, Patch, Param, Body } from '@nestjs/common';
import { CatalogUseCase } from './catalog.use-case';

@Controller('v1/catalogs')
export class CatalogsController {
  constructor(private readonly catalogUseCase: CatalogUseCase) {}

  @Get()
  async getHierarchy() {
    return this.catalogUseCase.getUIHierarchy();
  }

  @Get('admin')
  async getAdminHierarchy() {
    return this.catalogUseCase.getAdminHierarchy();
  }

  @Patch('topics/:id')
  async updateTopic(
    @Param('id') id: string,
    @Body() body: { localAlias?: string; isActive?: boolean }
  ) {
    await this.catalogUseCase.updateTopicLocalInfo(id, body.localAlias, body.isActive);
    return { success: true };
  }
}

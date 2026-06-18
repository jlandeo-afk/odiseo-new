import { Controller, Get, Patch, Param, Body, HttpCode } from '@nestjs/common';
import { CatalogUseCase } from './catalog.use-case';

@Controller('v1/catalogs')
export class CatalogsController {
  constructor(private readonly catalogUseCase: CatalogUseCase) {}

  @Get()
  async getHierarchy() {
    return this.catalogUseCase.getHierarchy();
  }

  @Patch('topics/:id/visibility')
  @HttpCode(200)
  async updateTopicVisibility(
    @Param('id') id: string,
    @Body() body: { isActive: boolean },
  ) {
    await this.catalogUseCase.updateTopicVisibility(id, body.isActive);
    return { id, isActive: body.isActive };
  }
}

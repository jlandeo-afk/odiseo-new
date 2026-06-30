import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  HttpCode,
  Query,
} from '@nestjs/common';
import { CatalogUseCase } from './catalog.use-case';

@Controller('v1/catalogs')
export class CatalogsController {
  constructor(private readonly catalogUseCase: CatalogUseCase) {}

  @Get('courses')
  async getCourses(@Query('search') search?: string) {
    return this.catalogUseCase.getCourses(search);
  }

  @Get('courses/:id/topics')
  async getCourseTopics(
    @Param('id') courseId: string,
    @Query('search') search?: string,
  ) {
    return this.catalogUseCase.getCourseTopics(courseId, search);
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

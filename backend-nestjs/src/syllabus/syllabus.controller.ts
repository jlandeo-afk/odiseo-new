import { Controller, Post, Body, Patch, Delete, Param, Get } from '@nestjs/common';
import { CreateSyllabusDto } from './dto/create-syllabus.dto';
import { CreateDistributionDto } from './dto/create-distribution.dto';
import { UpdateDistributionDto } from './dto/update-distribution.dto';
import { SyllabusUseCase } from './syllabus.use-case';

@Controller('syllabus')
export class SyllabusController {
  
  constructor(private readonly useCase: SyllabusUseCase) {}

  @Post()
  async createSyllabus(@Body() dto: CreateSyllabusDto) {
    const syllabus = await this.useCase.create(dto);
    return { status: 'created', syllabus };
  }

  @Post(':id/distribution')
  async createDistribution(@Param('id') syllabusId: string, @Body() dto: CreateDistributionDto) {
    const dist = await this.useCase.addDistribution(syllabusId, dto);
    return { status: 'created', distribution: dist };
  }

  @Patch(':id/distribution/:distId')
  async updateDistribution(
    @Param('id') syllabusId: string,
    @Param('distId') distId: string,
    @Body() dto: UpdateDistributionDto
  ) {
    await this.useCase.updateDistributionQuantity(distId, syllabusId, dto.requestedQuantity);
    return { status: 'updated' };
  }

  @Delete(':id/distribution/:distId')
  async deleteDistribution(
    @Param('id') syllabusId: string,
    @Param('distId') distId: string
  ) {
    await this.useCase.deleteDistribution(distId);
    return { status: 'deleted' };
  }

  @Get(':id/summary')
  async getSummary(@Param('id') syllabusId: string) {
    const summary = await this.useCase.getSummary(syllabusId);
    return { status: 'success', summary };
  }

  @Post(':id/clone')
  async cloneSyllabus(@Param('id') syllabusId: string, @Body('sourceId') sourceId: string) {
    const summary = await this.useCase.cloneSyllabus(syllabusId, sourceId);
    return { status: 'cloned', summary };
  }
}

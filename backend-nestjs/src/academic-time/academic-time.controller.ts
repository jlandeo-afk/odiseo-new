import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Delete,
  Query,
} from '@nestjs/common';
import { AcademicTimeUseCase } from './academic-time.use-case';

@Controller('v1/academic-time')
export class AcademicTimeController {
  constructor(private readonly academicTimeUseCase: AcademicTimeUseCase) {}

  @Get('cycles')
  async getCycles(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    const parsedOffset = offset ? parseInt(offset, 10) : 0;
    return this.academicTimeUseCase.getCycles(parsedLimit, parsedOffset);
  }

  @Post('cycles')
  async createCycle(
    @Body()
    body: {
      name: string;
      year: number;
      startDate: string;
      daysPerWeek: number;
      totalWeeks: number;
    },
  ) {
    return this.academicTimeUseCase.createCycle(body);
  }

  @Patch('cycles/:id/visibility')
  async toggleCycleVisibility(
    @Param('id') id: string,
    @Body() body: { isActive: boolean },
  ) {
    await this.academicTimeUseCase.toggleCycleVisibility(id, body.isActive);
    return { success: true };
  }

  @Patch('weeks/:id/visibility')
  async toggleWeekVisibility(
    @Param('id') id: string,
    @Body() body: { isActive: boolean },
  ) {
    await this.academicTimeUseCase.toggleWeekVisibility(id, body.isActive);
    return { success: true };
  }

  @Delete('cycles/:id')
  async deleteCycle(@Param('id') id: string) {
    await this.academicTimeUseCase.deleteCycle(id);
    return { success: true };
  }
}

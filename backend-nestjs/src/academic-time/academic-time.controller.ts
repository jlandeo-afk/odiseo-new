import { Controller, Get, Post, Patch, Param, Body, Delete } from '@nestjs/common';
import { AcademicTimeUseCase } from './academic-time.use-case';

@Controller('v1/academic-time')
export class AcademicTimeController {
  constructor(private readonly academicTimeUseCase: AcademicTimeUseCase) {}

  @Get('cycles')
  async getCycles() {
    return this.academicTimeUseCase.getCycles();
  }

  @Post('cycles')
  async createCycle(@Body() body: { name: string; startDate: string; endDate: string }) {
    return this.academicTimeUseCase.createCycle(body.name, new Date(body.startDate), new Date(body.endDate));
  }

  @Post('cycles/:cycleId/weeks')
  async createWeeks(@Param('cycleId') cycleId: string, @Body() body: { weeks: any[] }) {
    return this.academicTimeUseCase.createWeeks(cycleId, body.weeks);
  }

  @Delete('weeks/:id')
  async deleteWeek(@Param('id') id: string) {
    // RESTRICTED: Physical deletion is prohibited. Delegating to deactivation.
    await this.academicTimeUseCase.deactivateWeek(id);
    return { success: true, message: 'Week deactivated' };
  }

  @Patch('weeks/:id/restore')
  async restoreWeek(@Param('id') id: string) {
    await this.academicTimeUseCase.activateWeek(id);
    return { success: true, message: 'Week activated' };
  }
}

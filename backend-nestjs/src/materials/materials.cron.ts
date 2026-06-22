import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MaterialsService } from './materials.service';

@Injectable()
export class MaterialsCron {
  private readonly logger = new Logger(MaterialsCron.name);

  constructor(private readonly materialsService: MaterialsService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCron() {
    this.logger.log('Running US5: Automatic Material Generation (Cron)');

    // Mock de base de datos para la configuración de ciclos
    const cycles = [
      {
        cycle_id: 'c-1',
        name: 'Ciclo Verano 2026',
        cycle_weeks: [
          { week_num: 1, active: true, course_id: 'course-math' },
          { week_num: 2, active: false, course_id: null }, // Semana inactiva (NULL)
          { week_num: 3, active: true, course_id: 'course-math' },
        ],
      },
    ];

    for (const cycle of cycles) {
      this.logger.log(`Processing cycle: ${cycle.name}`);

      for (const week of cycle.cycle_weeks) {
        // T026 [US5]: Lógica de iteración alineada a CR-004
        // Preservación ESTRICTA de las semanas nulas (inactivas)
        if (!week.active || week.course_id === null) {
          this.logger.log(
            `CR-004 Validated: Preserving inactive NULL week ${week.week_num} for cycle ${cycle.cycle_id} without deletion.`,
          );
          continue; // Se omite el procesamiento físico, pero el registro original no se muta ni se borra
        }

        this.logger.log(
          `Triggering generation for active week ${week.week_num} in cycle ${cycle.cycle_id}`,
        );
        try {
          // Invocamos el flujo de US1
          await this.materialsService.generateMaterial({
            course_id: week.course_id,
            material_type: 'BALOTARIO',
            difficulty_level: 'INTERMEDIO',
          } as any);
        } catch (error) {
          this.logger.error(
            `Error auto-generating material for week ${week.week_num}: ${error.message}`,
          );
        }
      }
    }
  }
}

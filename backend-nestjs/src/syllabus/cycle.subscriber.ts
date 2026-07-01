import {
  EventSubscriber,
  EntitySubscriberInterface,
  UpdateEvent,
} from 'typeorm';
import { Cycle } from '../academic-time/entities/cycle.entity';
import { Syllabus } from './entities/syllabus.entity';
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
@EventSubscriber()
export class CycleSubscriber implements EntitySubscriberInterface<Cycle> {
  constructor(@InjectDataSource() readonly dataSource: DataSource) {
    dataSource.subscribers.push(this);
  }

  listenTo() {
    return Cycle;
  }

  async afterUpdate(event: UpdateEvent<Cycle>) {
    if (!event.entity) return;

    const isActiveUpdated = event.updatedColumns.find(
      (column) => column.propertyName === 'isActive',
    );

    if (isActiveUpdated && event.entity.isActive === false) {
      await event.manager
        .createQueryBuilder()
        .update(Syllabus)
        .set({ isActive: false })
        .where('cycle_id = :cycleId', { cycleId: event.entity.id })
        .execute();
    }
  }
}

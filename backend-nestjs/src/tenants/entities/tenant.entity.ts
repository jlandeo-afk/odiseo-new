import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('companies', { schema: 'public' })
export class Company {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 255 })
  subdomain: string;

  @Column({ name: 'commercial_name', length: 255 })
  commercialName: string;

  @Column({ name: 'logo_url', nullable: true, length: 255 })
  logoUrl: string;

  @Column({ name: 'primary_color', default: '#6366f1', length: 50 })
  primaryColor: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

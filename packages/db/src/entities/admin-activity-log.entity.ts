import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'admin_activity_log' })
@Index('idx_activity_created', ['createdAt'])
export class AdminActivityLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'admin_id', nullable: true })
  adminId!: string | null;

  @Column({ length: 60 })
  action!: string;

  @Column({ type: 'varchar', name: 'target_type', length: 40, nullable: true })
  targetType!: string | null;

  @Column({ type: 'uuid', name: 'target_id', nullable: true })
  targetId!: string | null;

  @Column({ type: 'text', nullable: true })
  summary!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  meta!: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}

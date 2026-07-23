import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'notifications' })
@Index(['recipientRole', 'recipientId', 'createdAt'])
@Index(['recipientRole', 'recipientId', 'readAt'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // 'parent' | 'provider' | 'admin'
  @Column({ name: 'recipient_role', length: 20 })
  recipientRole!: string;

  // Admin için null olabilir (tüm adminler görür)
  @Column({ type: 'uuid', name: 'recipient_id', nullable: true })
  recipientId!: string | null;

  @Column({ length: 60 })
  type!: string;

  @Column({ length: 200 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  body!: string | null;

  @Column({ type: 'varchar', length: 300, nullable: true })
  link!: string | null;

  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}

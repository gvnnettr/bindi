import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'push_subscriptions' })
@Index('idx_push_role_recipient', ['role', 'recipientId'])
export class PushSubscription {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 20 })
  role!: 'provider' | 'parent' | 'admin';

  @Column({ type: 'uuid', name: 'recipient_id', nullable: true })
  recipientId!: string | null;

  @Column({ type: 'text' })
  endpoint!: string;

  @Column({ length: 200 })
  p256dh!: string;

  @Column({ length: 100 })
  auth!: string;

  @Column({ type: 'varchar', name: 'user_agent', length: 300, nullable: true })
  userAgent!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'mobile_push_tokens' })
@Index('idx_mpt_role_recipient', ['role', 'recipientId'])
export class MobilePushToken {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 20 })
  role!: 'provider' | 'parent' | 'admin';

  @Column({ type: 'uuid', name: 'recipient_id', nullable: true })
  recipientId!: string | null;

  @Column({ type: 'text' })
  token!: string;

  @Column({ length: 10 })
  platform!: 'ios' | 'android';

  @Column({ type: 'varchar', name: 'device_id', length: 200, nullable: true })
  deviceId!: string | null;

  @Column({ type: 'varchar', name: 'app_version', length: 40, nullable: true })
  appVersion!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

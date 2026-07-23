import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Enrollment } from './enrollment.entity';

export type PaymentStatus = 'pending' | 'submitted' | 'paid' | 'late' | 'cancelled';

@Entity({ name: 'payments' })
@Unique('uq_payment_enrollment_period', ['enrollmentId', 'period'])
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Enrollment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'enrollment_id' })
  enrollment!: Enrollment;
  @Column({ type: 'uuid', name: 'enrollment_id' })
  enrollmentId!: string;

  @Column({ length: 7 })
  period!: string; // 'YYYY-MM'

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount!: string;

  @Column({ type: 'date', name: 'due_date' })
  dueDate!: Date;

  @Column({ length: 20, default: 'pending' })
  status!: PaymentStatus;

  @Column({ type: 'varchar', name: 'receipt_url', length: 500, nullable: true })
  receiptUrl!: string | null;

  @Column({ type: 'text', name: 'parent_note', nullable: true })
  parentNote!: string | null;

  @Column({ type: 'text', name: 'provider_note', nullable: true })
  providerNote!: string | null;

  @Column({ type: 'timestamptz', name: 'submitted_at', nullable: true })
  submittedAt!: Date | null;

  @Column({ type: 'timestamptz', name: 'paid_at', nullable: true })
  paidAt!: Date | null;

  @Column({ type: 'timestamptz', name: 'last_reminder_at', nullable: true })
  lastReminderAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

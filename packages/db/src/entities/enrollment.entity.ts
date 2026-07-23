import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Unique,
  OneToMany,
} from 'typeorm';
import { Provider } from './provider.entity';
import { Student } from './student.entity';
import { Parent } from './parent.entity';
import { Vehicle } from './vehicle.entity';
import { Offer } from './offer.entity';

export type EnrollmentStatus = 'active' | 'paused' | 'ended';

@Entity({ name: 'enrollments' })
@Unique('uq_enrollment_offer', ['offerId'])
export class Enrollment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Provider, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'provider_id' })
  provider!: Provider;
  @Column({ type: 'uuid', name: 'provider_id' })
  providerId!: string;

  @ManyToOne(() => Parent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parent_id' })
  parent!: Parent;
  @Column({ type: 'uuid', name: 'parent_id' })
  parentId!: string;

  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student!: Student;
  @Column({ type: 'uuid', name: 'student_id' })
  studentId!: string;

  @ManyToOne(() => Vehicle, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle!: Vehicle | null;
  @Column({ type: 'uuid', name: 'vehicle_id', nullable: true })
  vehicleId!: string | null;

  @ManyToOne(() => Offer, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'offer_id' })
  offer!: Offer | null;
  @Column({ type: 'uuid', name: 'offer_id', nullable: true })
  offerId!: string | null;

  @Column({ name: 'monthly_price', type: 'numeric', precision: 12, scale: 2 })
  monthlyPrice!: string;

  @Column({ name: 'start_month', length: 7 })
  startMonth!: string; // 'YYYY-MM'

  @Column({ name: 'end_month', type: 'varchar', length: 7, nullable: true })
  endMonth!: string | null;

  @Column({ length: 20, default: 'active' })
  status!: EnrollmentStatus;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

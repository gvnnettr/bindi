import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Vehicle } from './vehicle.entity';
import { DocumentDefinition } from './document-definition.entity';

export type VehicleDocumentType =
  | 'ruhsat'
  | 'muayene'
  | 'sigorta'
  | 'k_belgesi'
  | 'diger';

@Entity({ name: 'vehicle_documents' })
export class VehicleDocument {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Vehicle, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle!: Vehicle;

  @Column({ type: 'uuid', name: 'vehicle_id' })
  vehicleId!: string;

  @Column({ type: 'varchar', length: 40, nullable: true })
  type!: VehicleDocumentType | null;

  @ManyToOne(() => DocumentDefinition, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'definition_id' })
  definition!: DocumentDefinition | null;

  @Column({ type: 'uuid', name: 'definition_id', nullable: true })
  definitionId!: string | null;

  @Column({ type: 'varchar', name: 'file_url', length: 500 })
  fileUrl!: string;

  @Column({ type: 'varchar', name: 'original_name', length: 200, nullable: true })
  originalName!: string | null;

  @Column({ type: 'date', name: 'issued_at', nullable: true })
  issuedAt!: Date | null;

  @Column({ type: 'date', name: 'expires_at', nullable: true })
  expiresAt!: Date | null;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @Column({ type: 'timestamptz', name: 'last_reminder_at', nullable: true })
  lastReminderAt!: Date | null;

  @Column({ length: 20, default: 'pending' })
  status!: 'pending' | 'approved' | 'rejected';

  @Column({ type: 'text', name: 'rejection_reason', nullable: true })
  rejectionReason!: string | null;

  @Column({ type: 'timestamptz', name: 'reviewed_at', nullable: true })
  reviewedAt!: Date | null;

  @Column({ type: 'uuid', name: 'reviewed_by', nullable: true })
  reviewedBy!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}

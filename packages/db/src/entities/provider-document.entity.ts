import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Provider } from './provider.entity';
import { DocumentDefinition } from './document-definition.entity';

@Entity({ name: 'provider_documents' })
@Unique('uq_provider_doc_def', ['providerId', 'definitionId'])
export class ProviderDocument {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Provider, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'provider_id' })
  provider!: Provider;
  @Column({ type: 'uuid', name: 'provider_id' })
  providerId!: string;

  @ManyToOne(() => DocumentDefinition, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'definition_id' })
  definition!: DocumentDefinition;
  @Column({ type: 'uuid', name: 'definition_id' })
  definitionId!: string;

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

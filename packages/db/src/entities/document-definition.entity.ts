import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type DocumentScope = 'vehicle' | 'company' | 'driver';

@Entity({ name: 'document_definitions' })
export class DocumentDefinition {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 60, unique: true })
  code!: string;

  @Column({ length: 200 })
  name!: string;

  @Column({ length: 20 })
  scope!: DocumentScope;

  @Column({ default: false })
  required!: boolean;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder!: number;

  @Column({ default: true })
  active!: boolean;

  @Column({ name: 'requires_expiry', default: false })
  requiresExpiry!: boolean;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

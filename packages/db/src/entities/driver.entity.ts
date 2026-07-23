import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Provider } from './provider.entity';

@Entity({ name: 'drivers' })
export class Driver {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Provider, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'provider_id' })
  provider!: Provider;

  @Column({ type: 'uuid', name: 'provider_id' })
  providerId!: string;

  @Column({ length: 120 })
  name!: string;

  @Column({ length: 20 })
  phone!: string;

  @Column({ type: 'varchar', name: 'tc_no', length: 11, nullable: true })
  tcNo!: string | null;

  @Column({ type: 'varchar', name: 'license_class', length: 10, nullable: true })
  licenseClass!: string | null;

  @Column({ default: true })
  active!: boolean;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Parent } from './parent.entity';
import { RequestStudent } from './request-student.entity';
import { Offer } from './offer.entity';

@Entity({ name: 'service_requests' })
export class ServiceRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Parent, (p) => p.requests, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parent_id' })
  parent!: Parent;

  @Column({ name: 'parent_id' })
  parentId!: string;

  @Column({ length: 20, default: 'open' })
  status!: 'open' | 'matched' | 'closed';

  @Column({ length: 20, default: 'both' })
  pickupType!: 'both' | 'morning_only' | 'afternoon_only';

  @Column({ length: 80 })
  city!: string;

  @Column({ length: 80 })
  district!: string;

  @Column({ length: 120 })
  neighborhood!: string;

  @Column({ length: 300 })
  address!: string;

  @Column({ type: 'double precision', nullable: true })
  latitude!: number | null;

  @Column({ type: 'double precision', nullable: true })
  longitude!: number | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;



  @Index({ unique: true })
  @Column({ name: 'magic_token', length: 64 })
  magicToken!: string;

  @Column({ name: 'magic_expires_at', type: 'timestamptz' })
  magicExpiresAt!: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @OneToMany(() => RequestStudent, (rs) => rs.request, { cascade: true })
  requestStudents!: RequestStudent[];

  @OneToMany(() => Offer, (o) => o.request)
  offers!: Offer[];
}

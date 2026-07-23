import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ServiceRequest } from './service-request.entity';
import { Provider } from './provider.entity';
import { Vehicle } from './vehicle.entity';

@Entity({ name: 'offers' })
export class Offer {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => ServiceRequest, (r) => r.offers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'request_id' })
  request!: ServiceRequest;

  @Column({ name: 'request_id' })
  requestId!: string;

  @ManyToOne(() => Provider, (p) => p.offers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'provider_id' })
  provider!: Provider;

  @Column({ name: 'provider_id' })
  providerId!: string;

  @ManyToOne(() => Vehicle, { nullable: true })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle!: Vehicle | null;

  @Column({ type: 'uuid', name: 'vehicle_id', nullable: true })
  vehicleId!: string | null;

  @Column({ name: 'monthly_price', type: 'numeric', precision: 12, scale: 2 })
  monthlyPrice!: string;

  @Column({ type: 'text', nullable: true })
  note!: string | null;



  @Column({ length: 20, default: 'pending' })
  status!: 'pending' | 'selected' | 'rejected';

  @Column({ name: 'selected_at', type: 'timestamptz', nullable: true })
  selectedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}

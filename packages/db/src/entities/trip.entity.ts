import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Provider } from './provider.entity';
import { Vehicle } from './vehicle.entity';

@Entity({ name: 'trips' })
@Index('idx_trips_provider_status', ['providerId', 'status'])
export class Trip {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Provider, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'provider_id' })
  provider!: Provider;

  @Column({ name: 'provider_id' })
  providerId!: string;

  @ManyToOne(() => Vehicle, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle!: Vehicle | null;

  @Column({ type: 'uuid', name: 'vehicle_id', nullable: true })
  vehicleId!: string | null;

  @Column({ type: 'varchar', name: 'route_name', length: 120, nullable: true })
  routeName!: string | null;

  @Column({ length: 20, default: 'active' })
  status!: 'active' | 'ended';

  @Column({ type: 'numeric', precision: 10, scale: 7, name: 'current_lat', nullable: true })
  currentLat!: string | null;

  @Column({ type: 'numeric', precision: 10, scale: 7, name: 'current_lng', nullable: true })
  currentLng!: string | null;

  @Column({ type: 'timestamptz', name: 'location_updated_at', nullable: true })
  locationUpdatedAt!: Date | null;

  @Column({ type: 'timestamptz', name: 'started_at' })
  startedAt!: Date;

  @Column({ type: 'timestamptz', name: 'ended_at', nullable: true })
  endedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

@Entity({ name: 'trip_enrollments' })
@Index('idx_trip_enrollments_trip', ['tripId'])
@Index('idx_trip_enrollments_enrollment', ['enrollmentId'])
export class TripEnrollment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'trip_id' })
  tripId!: string;

  @Column({ type: 'uuid', name: 'enrollment_id' })
  enrollmentId!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}

import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Provider } from './provider.entity';

@Entity({ name: 'provider_regions' })
@Index(['provider', 'city', 'district', 'neighborhood'], { unique: true })
export class ProviderRegion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Provider, (p) => p.providerRegions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'provider_id' })
  provider!: Provider;

  @Column({ length: 80 })
  city!: string;

  @Column({ length: 80 })
  district!: string;

  @Column({ length: 120, default: '*' })
  neighborhood!: string;

  @Column({ type: 'double precision', nullable: true })
  latitude!: number | null;

  @Column({ type: 'double precision', nullable: true })
  longitude!: number | null;

  @Column({ type: 'int', name: 'radius_km', nullable: true })
  radiusKm!: number | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  label!: string | null;
}

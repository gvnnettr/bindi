import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Provider } from './provider.entity';

@Entity({ name: 'vehicles' })
export class Vehicle {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Provider, (p) => p.vehicles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'provider_id' })
  provider!: Provider;

  @Column({ name: 'provider_id' })
  providerId!: string;

  @Column({ length: 80 })
  brand!: string;

  @Column({ length: 120 })
  model!: string;

  @Column()
  year!: number;

  @Column({ length: 20 })
  plate!: string;

  @Column()
  seats!: number;

  @Column({ type: 'varchar', name: 'photo_url', length: 500, nullable: true })
  photoUrl!: string | null;
}

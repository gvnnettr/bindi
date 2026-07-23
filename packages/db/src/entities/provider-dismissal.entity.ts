import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Provider } from './provider.entity';
import { ServiceRequest } from './service-request.entity';

@Entity({ name: 'provider_dismissals' })
@Index(['providerId', 'requestId'], { unique: true })
export class ProviderDismissal {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Provider, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'provider_id' })
  provider!: Provider;

  @Column({ name: 'provider_id' })
  providerId!: string;

  @ManyToOne(() => ServiceRequest, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'request_id' })
  request!: ServiceRequest;

  @Column({ name: 'request_id' })
  requestId!: string;

  @CreateDateColumn({ name: 'dismissed_at' })
  dismissedAt!: Date;
}

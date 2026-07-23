import { Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Provider } from './provider.entity';
import { School } from './school.entity';

@Entity({ name: 'provider_schools' })
@Index(['provider', 'school'], { unique: true })
export class ProviderSchool {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Provider, (p) => p.providerSchools, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'provider_id' })
  provider!: Provider;

  @ManyToOne(() => School, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'school_id' })
  school!: School;
}

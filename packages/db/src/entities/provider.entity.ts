import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ProviderSchool } from './provider-school.entity';
import { ProviderRegion } from './provider-region.entity';
import { ProviderSubscription } from './provider-subscription.entity';
import { Vehicle } from './vehicle.entity';
import { Offer } from './offer.entity';

@Entity({ name: 'providers' })
export class Provider {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ length: 20 })
  phone!: string;

  @Column({ name: 'company_name', length: 200 })
  companyName!: string;

  @Column({ type: 'varchar', name: 'tax_no', length: 20, nullable: true })
  taxNo!: string | null;

  @Column({ name: 'owner_name', length: 120 })
  ownerName!: string;

  @Column({ type: 'varchar', length: 160, nullable: true })
  email!: string | null;

  @Column({ type: 'varchar', length: 300, nullable: true })
  address!: string | null;

  @Column({ length: 20, default: 'pending_payment' })
  status!: 'pending_payment' | 'pending_approval' | 'active' | 'suspended';

  @Column({ type: 'varchar', name: 'password_hash', length: 200, nullable: true })
  passwordHash!: string | null;

  @Column({ name: 'must_change_password', default: false })
  mustChangePassword!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @OneToMany(() => ProviderSchool, (ps) => ps.provider)
  providerSchools!: ProviderSchool[];

  @OneToMany(() => ProviderRegion, (pr) => pr.provider)
  providerRegions!: ProviderRegion[];

  @OneToMany(() => ProviderSubscription, (s) => s.provider)
  subscriptions!: ProviderSubscription[];

  @OneToMany(() => Vehicle, (v) => v.provider)
  vehicles!: Vehicle[];

  @OneToMany(() => Offer, (o) => o.provider)
  offers!: Offer[];
}

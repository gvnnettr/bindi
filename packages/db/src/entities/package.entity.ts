import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'packages' })
export class PackageEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 40, unique: true })
  code!: string;

  @Column({ length: 120 })
  name!: string;

  @Column({ name: 'monthly_price', type: 'numeric', precision: 12, scale: 2 })
  monthlyPrice!: string;

  @Column({ default: true })
  active!: boolean;
}

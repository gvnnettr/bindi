import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'regions' })
@Index(['city', 'district'])
export class Region {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 80 })
  city!: string;

  @Column({ length: 80 })
  district!: string;

  @Column({ length: 120 })
  neighborhood!: string;
}

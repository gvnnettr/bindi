import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'enabled_cities' })
@Index('uq_enabled_city', ['city'], { unique: true })
export class EnabledCity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 80 })
  city!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'admin_users' })
export class AdminUser {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ length: 160 })
  email!: string;

  @Column({ name: 'password_hash', length: 200 })
  passwordHash!: string;

  @Column({ length: 40, default: 'admin' })
  role!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}

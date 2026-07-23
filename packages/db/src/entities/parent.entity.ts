import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Student } from './student.entity';
import { ServiceRequest } from './service-request.entity';

@Entity({ name: 'parents' })
export class Parent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ length: 20 })
  phone!: string;

  @Column({ length: 120 })
  name!: string;

  @Column({ type: 'varchar', length: 160, nullable: true })
  email!: string | null;

  @Column({ type: 'varchar', name: 'password_hash', length: 200, nullable: true })
  passwordHash!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @OneToMany(() => Student, (s) => s.parent)
  students!: Student[];

  @OneToMany(() => ServiceRequest, (r) => r.parent)
  requests!: ServiceRequest[];
}

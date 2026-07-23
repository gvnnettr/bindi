import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Student } from './student.entity';
import { Parent } from './parent.entity';

@Entity({ name: 'student_guardians' })
@Index(['studentId', 'parentId'], { unique: true })
export class StudentGuardian {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student!: Student;

  @Column({ name: 'student_id' })
  studentId!: string;

  @ManyToOne(() => Parent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parent_id' })
  parent!: Parent;

  @Column({ name: 'parent_id' })
  parentId!: string;

  @Column({ length: 40, default: 'other' })
  relation!: string; // baba | anne | dede | anneanne | babaanne | amca | dayı | teyze | diğer

  @Column({ name: 'is_primary', default: false })
  isPrimary!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}

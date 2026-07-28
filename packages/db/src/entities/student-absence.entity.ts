import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Student } from './student.entity';
import { Parent } from './parent.entity';

export type AbsenceSession = 'morning' | 'evening' | 'both';

@Entity({ name: 'student_absences' })
@Index('idx_student_absences_student_date', ['studentId', 'date'])
@Unique('uq_student_absence_unique', ['studentId', 'date', 'session'])
export class StudentAbsence {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student!: Student;

  @Column({ type: 'uuid', name: 'student_id' })
  studentId!: string;

  @Column({ type: 'date' })
  date!: string; // 'YYYY-MM-DD'

  @Column({ length: 10, default: 'both' })
  session!: AbsenceSession;

  @Column({ type: 'text', nullable: true })
  reason!: string | null;

  @ManyToOne(() => Parent, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_parent_id' })
  createdByParent!: Parent | null;

  @Column({ type: 'uuid', name: 'created_by_parent_id', nullable: true })
  createdByParentId!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}

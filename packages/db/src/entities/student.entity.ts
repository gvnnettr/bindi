import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Parent } from './parent.entity';
import { School } from './school.entity';

@Entity({ name: 'students' })
export class Student {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Parent, (p) => p.students, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parent_id' })
  parent!: Parent;

  @Column({ name: 'parent_id' })
  parentId!: string;

  @Column({ length: 120 })
  name!: string;

  @Column({ type: 'varchar', length: 40, nullable: true })
  class!: string | null;

  @ManyToOne(() => School, { nullable: true })
  @JoinColumn({ name: 'school_id' })
  school!: School | null;

  @Column({ type: 'uuid', name: 'school_id', nullable: true })
  schoolId!: string | null;
}

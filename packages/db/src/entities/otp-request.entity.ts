import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'otp_requests' })
@Index(['phone', 'purpose'])
export class OtpRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 20 })
  phone!: string;

  @Column({ length: 40 })
  purpose!: string;

  @Column({ name: 'code_hash', length: 100 })
  codeHash!: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ name: 'consumed_at', type: 'timestamptz', nullable: true })
  consumedAt!: Date | null;



  @Column({ default: 0 })
  attempts!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}

import type { Role } from '../state/auth';

export function notifBase(role: Role | null): string {
  return role === 'parent' ? '/me/parent' : '/me';
}

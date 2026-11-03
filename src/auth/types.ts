export type StaffRole = 'director' | 'admin' | 'manager' | 'technician' | 'user';

export interface AuthUser {
  id: number;
  email: string;
  full_name: string;
  staff_role: string;
  must_change_password: boolean;
}


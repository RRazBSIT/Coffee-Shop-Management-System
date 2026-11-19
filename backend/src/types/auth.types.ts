export type AccountType = 'staff' | 'customer';

export interface AuthTokenPayload {
  accountType: AccountType;
  userId?: number;
  customerId?: number;
  employeeId?: number;
  roleId?: number;
  roleName?: string;
}

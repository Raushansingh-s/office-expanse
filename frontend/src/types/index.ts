// Core Types for Company Expense Manager

export interface Company {
  id: string;
  name: string;
  logo?: string;
  address?: string;
  email?: string;
  phone?: string;
  gstNumber?: string;
  panNumber?: string;
  cinNumber?: string;
  website?: string;
  financialYear: string;
  currency: string;
  currencySymbol: string;
}

export interface Role {
  id: string;
  name: 'super_admin' | 'admin' | 'director' | 'employee';
  displayName: string;
  permissions: string;
}

export interface Department {
  id: string;
  companyId: string;
  name: string;
  code?: string;
  departmentHead?: string;
  status: 'active' | 'inactive';
  _count?: { users: number; expenses: number };
}

export interface User {
  id: string;
  companyId: string;
  roleId: string;
  departmentId?: string;
  name: string;
  employeeId?: string;
  email: string;
  mobile?: string;
  joiningDate?: string;
  upiId?: string;
  status: 'active' | 'inactive';
  role: Role;
  department?: Department;
  company?: Company;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseCategory {
  id: string;
  companyId: string;
  name: string;
  icon?: string;
  color?: string;
  isDefault: boolean;
  status: 'active' | 'inactive';
  _count?: { expenses: number };
}

export type ExpenseStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'paid'
  | 'reimbursement_pending'
  | 'reimbursement_approved'
  | 'reimbursed'
  | 'cancelled'
  | 'correction_requested';

export type PaymentSource = 'company' | 'personal';
export type PaymentMethod = 'cash' | 'upi' | 'debit_card' | 'credit_card' | 'bank_transfer' | 'cheque' | 'other';

export interface ExpenseReceipt {
  id: string;
  expenseId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  createdAt: string;
}

export interface ExpenseApproval {
  id: string;
  expenseId: string;
  userId: string;
  action: string;
  comment?: string;
  amount?: number;
  createdAt: string;
  user: Pick<User, 'id' | 'name'>;
}

export type ReimbursementStatus = 'pending' | 'approved' | 'partially_approved' | 'paid' | 'rejected';

export interface Reimbursement {
  id: string;
  expenseId: string;
  userId: string;
  requestedAmount: number;
  approvedAmount?: number;
  status: ReimbursementStatus;
  approvedById?: string;
  approvedAt?: string;
  paidAmount?: number;
  paidById?: string;
  paymentDate?: string;
  paymentMethod?: string;
  transactionReference?: string;
  paymentNotes?: string;
  paymentProof?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  expense?: Expense;
  user?: Pick<User, 'id' | 'name' | 'email'>;
  approvedBy?: Pick<User, 'id' | 'name'>;
  paidBy?: Pick<User, 'id' | 'name'>;
}

export interface Expense {
  id: string;
  expenseNumber: string;
  companyId: string;
  userId: string;
  departmentId?: string;
  categoryId: string;
  expenseDate: string;
  description: string;
  amount: number;
  paymentSource: PaymentSource;
  paymentMethod: PaymentMethod;
  merchantName?: string;
  location?: string;
  billNumber?: string;
  reimbursementRequired: boolean;
  reimbursementAmount?: number;
  status: ExpenseStatus;
  approvedById?: string;
  approvedAt?: string;
  approvedAmount?: number;
  rejectionReason?: string;
  notes?: string;
  isDuplicate: boolean;
  createdAt: string;
  updatedAt: string;
  user?: Pick<User, 'id' | 'name' | 'email' | 'employeeId'>;
  department?: Pick<Department, 'id' | 'name'>;
  category?: Pick<ExpenseCategory, 'id' | 'name' | 'color'>;
  approvedBy?: Pick<User, 'id' | 'name'>;
  receipts?: ExpenseReceipt[];
  approvals?: ExpenseApproval[];
  reimbursement?: Reimbursement;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  link?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  oldValue?: string;
  newValue?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  user?: Pick<User, 'id' | 'name' | 'email'>;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

export interface DashboardSummary {
  total: { amount: number; count: number };
  thisMonth: { amount: number; count: number };
  today: { amount: number; count: number };
  pendingApproval: { amount: number; count: number };
  pendingReimbursement: { amount: number; count: number };
  reimbursed: { amount: number; count: number };
  rejected: { amount: number; count: number };
  companyPaid: { amount: number; count: number };
  personallyPaid: { amount: number; count: number };
}

export interface MonthlyData {
  month: string;
  amount: number;
  count: number;
}

export interface CategoryData {
  id: string;
  name: string;
  color?: string;
  amount: number;
  count: number;
}

export interface ExpenseFilters {
  search?: string;
  userId?: string;
  departmentId?: string;
  categoryId?: string;
  status?: string;
  paymentSource?: string;
  paymentMethod?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: string;
  maxAmount?: string;
  page?: number;
  limit?: number;
}

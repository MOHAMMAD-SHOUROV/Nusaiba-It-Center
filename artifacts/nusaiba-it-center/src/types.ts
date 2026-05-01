export type UserRole = 'admin' | 'user';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: string;
}

export interface Member {
  id: string;
  name: string;
  phone: string;
  isActive: boolean;
  createdAt: string;
}

export interface AttendanceMap {
  [day: number]: 'P' | 'A' | null;
}

export interface CollectionMap {
  [day: number]: number | null;
}

export type CellColor = 'default' | 'red' | 'blue';

export interface ColorMap {
  [day: number]: CellColor;
}

export interface MonthlyRecord {
  id: string;
  memberId: string;
  monthKey: string; // YYYY-MM
  attendance: AttendanceMap;
  amountMap: CollectionMap;
  dollarMap: CollectionMap;
  amountColorMap: ColorMap;
  dollarColorMap: ColorMap;
  amount: number; // Total for month
  dollar: number; // Total for month
  updatedAt: string;
}

export interface AppState {
  user: UserProfile | null;
  members: Member[];
  records: MonthlyRecord[];
  currentMonthKey: string;
  loading: boolean;
}

export type UserRole = "admin" | "cr" | "student";

export interface User {
  id: string;
  name: string;
  regNo: string;
  role: UserRole;
  email: string;
  password?: string;
  isFirstLogin?: boolean;
  mobileNumber?: string;
  phoneNumber?: string;
  department?: string;
  isDeleted?: boolean;
  isOtpVerified?: boolean;
}

export interface Transaction {
  id: string;
  studentName: string;
  regNo: string;
  amount: number;
  purpose: string;
  timestamp: string;
  status: "Pending" | "Approved" | "Rejected";
  screenshotUrl: string;
  notes?: string;
  tags?: string[];
  year?: string;
  regulation?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  type: "academic" | "iv" | "deadline" | "holiday";
  date: string; // YYYY-MM-DD
  description: string;
  createdBy: string;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  date: string;
  createdBy: string;
  priority: "low" | "medium" | "high";
}

export interface UpiSettings {
  upiId: string;
  qrCodeUrl: string; // Base64 data URL
  qrCodeText: string; // standard upi link
}

export interface CrPermissions {
  canEditUpi: boolean;
  canVerifyPayments: boolean;
  canAddEvents: boolean;
}

export interface Note {
  id: string;
  title: string;
  subject: string;
  fileUrl: string;
  content: string;
  semester: string;
  category?: "Notes" | "Question Paper" | "Project Report";
  regulation?: string;
  uploadedBy: string;
  date: string;
}

export interface Internship {
  id: string;
  title: string;
  company: string;
  description: string;
  applyUrl: string;
  lastDate: string;
  postedBy: string;
}

export interface CompanyLink {
  id: string;
  name: string;
  url: string;
  description: string;
  category: string; // Assessment, Training, Placement, etc.
  postedBy: string;
}

export interface AttendanceScan {
  id: string;
  studentName: string;
  regNo: string;
  timestamp: string;
  location: string;
  course: string;
  status: "Success" | "Failed";
  snapshot?: string;
}

export interface LeaveRequest {
  id: string;
  studentName: string;
  regNo: string;
  reason: string;
  type: string; // e.g. Sick Leave, Casual Leave
  startDate: string;
  endDate: string;
  status: "Pending" | "Approved" | "Rejected";
  timestamp: string;
}

export interface ClassSchedule {
  id: string;
  subject: string;
  time: string;
  teacher: string;
  room: string;
  day: string; // e.g., Monday, Tuesday...
}

import mongoose, { Schema } from "mongoose";

// 1. Users Schema (Name, RegNo, Role, Email, Password)
const UserSchema = new Schema({
  name: { type: String, required: true },
  regNo: { type: String, required: true, unique: true },
  role: { type: String, enum: ["admin", "cr", "student"], default: "student" },
  email: { type: String, required: true },
  password: { type: String, default: "password" },
  isFirstLogin: { type: Boolean, default: true },
  mobileNumber: { type: String, default: "" },
  phoneNumber: { type: String, default: "" },
  department: { type: String, default: "" },
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

// 2. Payments Schema (StudentRef, Amount, Date, Status, ImageURL/screenshotUrl)
const PaymentSchema = new Schema({
  studentRef: { type: String, required: true },
  studentName: { type: String, required: true },
  amount: { type: Number, required: true },
  purpose: { type: String, required: true },
  date: { type: Date, default: Date.now },
  status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" },
  imageUrl: { type: String, default: "" },
  notes: { type: String, default: "" },
  tags: { type: [String], default: [] },
  year: { type: String, default: "First Year" },
  regulation: { type: String, default: "Regulation 2021" }
}, { timestamps: true });

// 3. Events Schema (Title, Date, Description, Type, Creator)
const EventSchema = new Schema({
  title: { type: String, required: true },
  type: { type: String, enum: ["academic", "iv", "deadline", "holiday"], default: "academic" },
  date: { type: Date, required: true },
  description: { type: String, default: "" },
  createdBy: { type: String, default: "Staff Coordinator" }
}, { timestamps: true });

// 4. AppConfig Schema (ActiveUPI)
const AppConfigSchema = new Schema({
  activeUpi: { type: String, required: true },
  qrCodeUrl: { type: String, default: "" },
  qrCodeText: { type: String, default: "" }
}, { timestamps: true });

// Noticeboard Schema (to store circulars)
const NoticeSchema = new Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  date: { type: Date, default: Date.now },
  createdBy: { type: String, default: "Staff Coordinator" },
  priority: { type: String, enum: ["low", "medium", "high"], default: "medium" }
}, { timestamps: true });

// 5. Notes Schema
const NoteSchema = new Schema({
  title: { type: String, required: true },
  subject: { type: String, required: true },
  fileUrl: { type: String, default: "" },
  content: { type: String, default: "" },
  semester: { type: String, default: "Semester 5" },
  category: { type: String, enum: ["Notes", "Question Paper", "Project Report"], default: "Notes" },
  regulation: { type: String, default: "Regulation 2021" },
  uploadedBy: { type: String, default: "Faculty" },
  date: { type: Date, default: Date.now }
}, { timestamps: true });

// 6. Internships Schema
const InternshipSchema = new Schema({
  title: { type: String, required: true },
  company: { type: String, required: true },
  description: { type: String, required: true },
  applyUrl: { type: String, required: true },
  lastDate: { type: Date, default: Date.now },
  postedBy: { type: String, default: "Placement Cell" }
}, { timestamps: true });

// 7. Company Links Schema
const CompanyLinkSchema = new Schema({
  name: { type: String, required: true },
  url: { type: String, required: true },
  description: { type: String, default: "" },
  category: { type: String, default: "Assessment" }, // Placement, Assessment, Internship, Training
  postedBy: { type: String, default: "Staff Coordinator" }
}, { timestamps: true });

// 8. Attendance Schema
const AttendanceSchema = new Schema({
  studentName: { type: String, required: true },
  regNo: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  location: { type: String, default: "Block A" },
  course: { type: String, required: true },
  status: { type: String, enum: ["Success", "Failed"], default: "Success" },
  snapshot: { type: String, default: "" }
}, { timestamps: true });

// 9. LeaveRequest Schema
const LeaveRequestSchema = new Schema({
  studentName: { type: String, required: true },
  regNo: { type: String, required: true },
  reason: { type: String, required: true },
  type: { type: String, default: "Casual Leave" },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

export const UserMongo = mongoose.models.User || mongoose.model("User", UserSchema);
export const PaymentMongo = mongoose.models.Payment || mongoose.model("Payment", PaymentSchema);
export const EventMongo = mongoose.models.Event || mongoose.model("Event", EventSchema);
export const AppConfigMongo = mongoose.models.AppConfig || mongoose.model("AppConfig", AppConfigSchema);
export const NoticeMongo = mongoose.models.Notice || mongoose.model("Notice", NoticeSchema);
export const NoteMongo = mongoose.models.Note || mongoose.model("Note", NoteSchema);
export const InternshipMongo = mongoose.models.Internship || mongoose.model("Internship", InternshipSchema);
export const CompanyLinkMongo = mongoose.models.CompanyLink || mongoose.model("CompanyLink", CompanyLinkSchema);
export const AttendanceMongo = mongoose.models.Attendance || mongoose.model("Attendance", AttendanceSchema);
export const LeaveRequestMongo = mongoose.models.LeaveRequest || mongoose.model("LeaveRequest", LeaveRequestSchema);

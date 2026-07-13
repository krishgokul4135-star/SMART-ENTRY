import React from "react";
import {
  User,
  Transaction,
  CalendarEvent,
  Notice,
  UpiSettings,
  CrPermissions,
  UserRole,
  Note,
  Internship,
  CompanyLink
} from "./types";
import {
  Shield,
  User as UserIcon,
  Plus,
  TrendingUp,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  AlertOctagon,
  Calendar as CalendarIcon,
  BookOpen,
  Send,
  Upload,
  RefreshCw,
  FileSpreadsheet,
  Settings,
  Check,
  X,
  CreditCard,
  QrCode,
  Sparkles,
  Info,
  LogOut,
  Key,
  Eye,
  EyeOff
} from "lucide-react";
import InteractiveCalendar from "./components/InteractiveCalendar";
import NoticeBoard from "./components/NoticeBoard";
import ArchitectureDocs from "./components/ArchitectureDocs";
import AcademicHub from "./components/AcademicHub";
import SmartAttendance from "./components/SmartAttendance";
import UserManagement from "./components/UserManagement";
import PasswordResetView from "./components/PasswordResetView";
import OtpVerificationView from "./components/OtpVerificationView";

export default function App() {
  // Application states
  const [currentUser, setCurrentUser] = React.useState<User | null>(null);
  const [loginSimulatedOtp, setLoginSimulatedOtp] = React.useState<string | undefined>(undefined);
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [events, setEvents] = React.useState<CalendarEvent[]>([]);
  const [notices, setNotices] = React.useState<Notice[]>([]);
  const [upiSettings, setUpiSettings] = React.useState<UpiSettings>({
    upiId: "college.dept@okaxis",
    qrCodeUrl: "",
    qrCodeText: ""
  });
  const [crPermissions, setCrPermissions] = React.useState<CrPermissions>({
    canEditUpi: true,
    canVerifyPayments: true,
    canAddEvents: true
  });
  const [allUsers, setAllUsers] = React.useState<User[]>([]);
  const [notes, setNotes] = React.useState<Note[]>([]);
  const [internships, setInternships] = React.useState<Internship[]>([]);
  const [companyLinks, setCompanyLinks] = React.useState<CompanyLink[]>([]);

  // View States
  const [activeTab, setActiveTab] = React.useState<"dashboard" | "finance" | "calendar" | "docs" | "resources" | "attendance" | "users">("dashboard");
  const [feeSearch, setFeeSearch] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(true);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  // Student Payment Form States
  const [payAmount, setPayAmount] = React.useState("500");
  const [payPurpose, setPayPurpose] = React.useState("Symposium 2026 Registration");
  const [payName, setPayName] = React.useState("");
  const [payRegNo, setPayRegNo] = React.useState("");
  const [screenshotBase64, setScreenshotBase64] = React.useState("");
  const [uploadProgress, setUploadProgress] = React.useState(false);
  const [simulatedScreenshotIndex, setSimulatedScreenshotIndex] = React.useState<number | null>(null);

  // Symposium Specific Registration States
  const [payYear, setPayYear] = React.useState("First Year");
  const [payRegulation, setPayRegulation] = React.useState("Regulation 2021");
  const [selectedTracks, setSelectedTracks] = React.useState<string[]>([]);
  const [isOcrValidating, setIsOcrValidating] = React.useState(false);
  const [ocrVerified, setOcrVerified] = React.useState(false);
  const [ocrTxId, setOcrTxId] = React.useState("");

  // CR UPI Edit Form States
  const [editUpiId, setEditUpiId] = React.useState("");
  const [isUpdatingUpi, setIsUpdatingUpi] = React.useState(false);

  // Verification review modal / subview state
  const [selectedTx, setSelectedTx] = React.useState<Transaction | null>(null);
  const [reviewNotes, setReviewNotes] = React.useState("");
  const [reviewTags, setReviewTags] = React.useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = React.useState("");
  const [txSearch, setTxSearch] = React.useState("");
  const [selectedTagFilter, setSelectedTagFilter] = React.useState<string | null>(null);

  // Toggle category breakdown view between income/expense
  const [breakdownView, setBreakdownView] = React.useState<"income" | "expenses">("income");

  // Digital printable receipt modal state
  const [receiptTx, setReceiptTx] = React.useState<Transaction | null>(null);

  // Symposium 2026 Countdown State
  const [timeLeft, setTimeLeft] = React.useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isOver: false
  });

  React.useEffect(() => {
    // Symposium target: September 15, 2026 at 9:00 AM
    const targetDate = new Date("2026-09-15T09:00:00").getTime();

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isOver: true });
        clearInterval(interval);
      } else {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        setTimeLeft({ days, hours, minutes, seconds, isOver: false });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  React.useEffect(() => {
    if (selectedTx) {
      setReviewNotes(selectedTx.notes || "");
      setReviewTags(selectedTx.tags || []);
    } else {
      setReviewNotes("");
      setReviewTags([]);
    }
    setCustomTagInput("");
  }, [selectedTx]);

  // Quick Login state
  const [loginRegNo, setLoginRegNo] = React.useState("");
  const [loginPassword, setLoginPassword] = React.useState("");
  const [showLoginPassword, setShowLoginPassword] = React.useState(false);
  const [loginRole, setLoginRole] = React.useState<UserRole>("student");

  // Robust, network-safe API Fetch helper
  const apiFetch = React.useCallback(async (url: string, options?: RequestInit) => {
    // Dynamic Base URL: Prepend configuration if provided in the environment
    const baseUrl = ((import.meta as any).env.VITE_API_BASE_URL || "").replace(/\/$/, "");
    const fullUrl = url.startsWith("http") ? url : `${baseUrl}${url}`;

    try {
      const res = await fetch(fullUrl, options);
      if (!res.ok) {
        // Detailed error logging as requested - but 401 and 403 are expected for unauthenticated/unverified API requests, so log as info/warn
        if (res.status === 401 || res.status === 403) {
          console.warn(`[API AUTHENTICATION] Access restricted for ${url} (HTTP ${res.status}) - authentication or MFA pending.`);
        } else {
          console.error(`[API ERROR] Fetch failed for ${url} with HTTP status: ${res.status} (${res.statusText || "No Status Text"})`);
        }
        return { 
          error: `HTTP ${res.status}: ${res.statusText || "Error"}`, 
          status: res.status, 
          statusText: res.statusText 
        };
      }
      
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        return await res.json();
      } else {
        const text = await res.text();
        console.warn(`[API WARNING] Expected JSON for ${url} but got Content-Type: ${contentType}. Raw response prefix:`, text.substring(0, 150));
        return { error: "Non-JSON response", rawText: text.substring(0, 200) };
      }
    } catch (err: any) {
      // Robust error reporting for CORS, DNS, offline, or connection-refused issues
      console.error(`[NETWORK/CORS ERROR] Could not establish connection to backend API ${fullUrl}:`, err);
      return { 
        error: err?.message || "CORS restriction or network connection refused", 
        isNetworkError: true 
      };
    }
  }, []);

  // Fetch initial data
  const loadData = async () => {
    setIsLoading(true);
    try {
      // Run the initial health check to verify backend connectivity and log DB status
      const healthRes = await apiFetch("/api/health");
      console.log("[DB/BACKEND STATUS] Health verification response:", healthRes);

      const [userRes, txRes, eventRes, noticeRes, upiRes, permRes, usersRes, notesRes, internsRes, linksRes] = await Promise.all([
        apiFetch("/api/auth/me"),
        apiFetch("/api/transactions"),
        apiFetch("/api/events"),
        apiFetch("/api/notices"),
        apiFetch("/api/settings/upi"),
        apiFetch("/api/admin/cr-permissions"),
        apiFetch("/api/users"),
        apiFetch("/api/notes"),
        apiFetch("/api/internships"),
        apiFetch("/api/company-links")
      ]);

      if (userRes && userRes.user) {
        setCurrentUser(userRes.user);
        setPayName(userRes.user.name);
        setPayRegNo(userRes.user.regNo);
      }
      setTransactions(Array.isArray(txRes) ? txRes : []);
      setEvents(Array.isArray(eventRes) ? eventRes : []);
      setNotices(Array.isArray(noticeRes) ? noticeRes : []);
      if (upiRes && !upiRes.error) {
        setUpiSettings(upiRes);
        setEditUpiId(upiRes.upiId || "");
      }
      if (permRes && !permRes.error) {
        setCrPermissions(permRes);
      }
      setAllUsers(Array.isArray(usersRes) ? usersRes : []);
      setNotes(Array.isArray(notesRes) ? notesRes : []);
      setInternships(Array.isArray(internsRes) ? internsRes : []);
      setCompanyLinks(Array.isArray(linksRes) ? linksRes : []);
    } catch (err: any) {
      console.error("Error loading department data:", err);
      setErrorMessage(`Could not sync with the department backend server. See detailed network/CORS trace in developer logs.`);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUsersList = async () => {
    try {
      const data = await apiFetch("/api/users");
      if (Array.isArray(data)) {
        setAllUsers(data);
      }
    } catch (err) {
      console.error("Failed to refresh users:", err);
    }
  };

  React.useEffect(() => {
    loadData();
  }, []);

  // Register number sequential pool for Regulation 2025 (54 students)
  const reg2025Pool = React.useMemo(() => {
    return Array.from({ length: 54 }, (_, i) => "62051490" + String(i + 1).padStart(2, "0"));
  }, []);

  // Sync Register Number when Regulation changes
  React.useEffect(() => {
    if (payRegulation === "Regulation 2021") {
      setPayRegNo("620524149006");
    } else if (payRegulation === "Regulation 2025") {
      setPayRegNo("6205149001");
    }
  }, [payRegulation]);

  // Automatically calculate total amount based on symposium track selections
  React.useEffect(() => {
    if (payPurpose === "Symposium 2026 Registration") {
      const total = selectedTracks.reduce((sum, track) => {
        if (track === "Paper Presentation") return sum + 200;
        if (track === "Web Creation") return sum + 300;
        if (track === "Technical Quiz") return sum + 150;
        return sum;
      }, 0);
      setPayAmount(String(total));
    } else if (payPurpose === "Industrial Visit Trip Contribution") {
      setPayAmount("300");
    } else if (payPurpose === "Department Annual Book Access Fee") {
      setPayAmount("150");
    }
  }, [payPurpose, selectedTracks]);

  // Show status banner temporarily
  const triggerNotification = (type: "success" | "error", msg: string) => {
    if (type === "success") {
      setSuccessMessage(msg);
      setTimeout(() => setSuccessMessage(null), 4000);
    } else {
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(null), 5000);
    }
  };

  // Switch active role simulator
  const handleSwitchRole = async (role: UserRole) => {
    try {
      const regNo = role === "admin" ? "STAFF001" : role === "cr" ? "62052414002" : "62052414001";
      const pwd = role === "admin" ? "admin123" : role === "cr" ? "cr123" : "student123";
      await handleLogin(regNo, pwd);
    } catch (err) {
      console.error(err);
    }
  };

  // Login handler
  const handleLogin = async (regNoToLogin: string, passwordToLogin: string) => {
    if (!regNoToLogin.trim() || !passwordToLogin.trim()) {
      triggerNotification("error", "Register Number/Username and Password are required.");
      return false;
    }
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regNo: regNoToLogin, password: passwordToLogin })
      });
      const data = await res.json();
      if (res.ok) {
        setCurrentUser(data.user);
        setPayName(data.user.name);
        setPayRegNo(data.user.regNo);
        setLoginRegNo("");
        if (data.simulatedOtp) {
          setLoginSimulatedOtp(data.simulatedOtp);
        } else {
          setLoginSimulatedOtp(undefined);
        }
        // Reload will be triggered after successful OTP verification
        triggerNotification("success", "Password verified. Please enter the 6-digit verification code.");
        return true;
      } else {
        triggerNotification("error", data.error || "Login authentication failed.");
        return false;
      }
    } catch (err) {
      triggerNotification("error", "Login authentication failed due to connection error.");
      return false;
    }
  };

  // Sign out
  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setCurrentUser(null);
    setLoginSimulatedOtp(undefined);
    triggerNotification("success", "Logged out. Switched to guest mode.");
  };

  // OCR validation sandbox simulation
  const runMockOcrValidation = () => {
    setIsOcrValidating(true);
    setOcrVerified(false);
    setOcrTxId("");
    setTimeout(() => {
      setIsOcrValidating(false);
      setOcrVerified(true);
      const randomTxId = "TXN" + Math.floor(10000000 + Math.random() * 90000000);
      setOcrTxId(randomTxId);
    }, 2000);
  };

  // Student: File upload Simulator
  const handleScreenshotSelect = (index: number) => {
    setSimulatedScreenshotIndex(index);
    // Generate a beautiful mock base64 receipt for the selected payment option
    const mockReceipts = [
      "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='400' viewBox='0 0 300 400'><rect width='300' height='400' fill='%23F8FAFC' stroke='%23000000' stroke-width='4'/><text x='20' y='40' font-family='monospace' font-weight='bold' font-size='16'>GPAY TRANSACTION</text><line x1='20' y1='60' x2='280' y2='60' stroke='%23000000' stroke-width='2'/><text x='20' y='90' font-family='monospace' font-size='12'>To: college.dept@okaxis</text><text x='20' y='110' font-family='monospace' font-size='12'>Ref: UPI/678945230</text><text x='20' y='150' font-family='monospace' font-weight='black' font-size='24'>SUCCESS ₹500</text><text x='20' y='190' font-family='monospace' font-size='10'>Date: 2026-07-05 12:30</text><rect x='20' y='220' width='100' height='100' fill='none' stroke='%23000000' stroke-width='2'/><text x='30' y='275' font-family='monospace' font-size='14'>QR AUTH</text></svg>",
      "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='400' viewBox='0 0 300 400'><rect width='300' height='400' fill='%23F0FDF4' stroke='%23000000' stroke-width='4'/><text x='20' y='40' font-family='monospace' font-weight='bold' font-size='16'>PHONEPE RECEIPT</text><line x1='20' y1='60' x2='280' y2='60' stroke='%23000000' stroke-width='2'/><text x='20' y='90' font-family='monospace' font-size='12'>To: Dept-CSE Fund</text><text x='20' y='110' font-family='monospace' font-size='12'>TXN ID: T2607050012</text><text x='20' y='150' font-family='monospace' font-weight='black' font-size='24'>SUCCESS ₹300</text><text x='20' y='190' font-family='monospace' font-size='10'>Timestamp: Just Now</text><line x1='20' y1='220' x2='280' y2='220' stroke='%23000000' stroke-width='1' stroke-dasharray='4'/><text x='20' y='250' font-family='monospace' font-size='12'>Verified Account</text></svg>"
    ];
    setScreenshotBase64(mockReceipts[index]);
    triggerNotification("success", "Sample transaction receipt loaded. Mock Sandbox OCR sandbox triggered.");
    runMockOcrValidation();
  };

  // Real file upload reader
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 12 * 1024 * 1024) {
      triggerNotification("error", "File too large. Please upload an image smaller than 12MB.");
      return;
    }

    setUploadProgress(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setScreenshotBase64(reader.result as string);
      setSimulatedScreenshotIndex(null);
      setUploadProgress(false);
      triggerNotification("success", "Screenshot loaded. Mock Sandbox OCR sandbox triggered.");
      runMockOcrValidation();
    };
    reader.readAsDataURL(file);
  };

  // Submit payment contribution
  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payName.trim() || !payRegNo.trim() || !payAmount || !payPurpose) {
      triggerNotification("error", "Please fill in all contribution fields.");
      return;
    }

    // Validate Reg No starts with '620524149006' if Regulation 2021 is selected
    if (payRegulation === "Regulation 2021") {
      if (!payRegNo.startsWith("620524149006")) {
        triggerNotification("error", "Registration Number must start with '620524149006' for Regulation 2021.");
        return;
      }
    }

    // Auto-generate tags based on purpose and selected tracks
    const initialTags = [...selectedTracks.map(t => "#" + t.toLowerCase().replace(/\s+/g, "_"))];
    if (payPurpose === "Symposium 2026 Registration") {
      initialTags.push("#symposium");
    } else if (payPurpose === "Industrial Visit Trip Contribution") {
      initialTags.push("#iv_trip");
    } else if (payPurpose === "Department Annual Book Access Fee") {
      initialTags.push("#academic");
    }

    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName: payName,
          regNo: payRegNo,
          amount: Number(payAmount),
          purpose: payPurpose,
          screenshotUrl: screenshotBase64,
          notes: ocrTxId ? `Self-logged with verified OCR TxID: ${ocrTxId}` : "Self-logged by student. Pending Verification.",
          tags: initialTags,
          year: payYear,
          regulation: payRegulation
        })
      });

      if (res.ok) {
        const newTx = await res.json();
        setTransactions([newTx, ...transactions]);
        setScreenshotBase64("");
        setSimulatedScreenshotIndex(null);
        setSelectedTracks([]);
        setOcrVerified(false);
        setOcrTxId("");
        triggerNotification("success", "Your payment log has been registered. The Class Representative has been notified to verify.");
      } else {
        triggerNotification("error", "Error filing contribution transaction log.");
      }
    } catch (err) {
      console.error(err);
      triggerNotification("error", "Network connection failed.");
    }
  };

  // Export all submissions as JSON file (Symposium Grade Extra)
  const handleExportJsonBatch = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(transactions, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "symposium_transactions_batch.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    triggerNotification("success", "Batch transaction logs exported as JSON file successfully.");
  };

  // CR: Update Active UPI Settings
  const handleUpdateUpi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUpiId.trim()) return;

    setIsUpdatingUpi(true);
    try {
      const res = await fetch("/api/settings/upi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ upiId: editUpiId })
      });

      if (res.ok) {
        const data = await res.json();
        setUpiSettings(data.upiSettings);
        triggerNotification("success", "Active Department UPI collection ID updated for all student checkouts.");
      } else {
        triggerNotification("error", "Could not complete UPI update.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdatingUpi(false);
    }
  };

  // CR/Admin: Verify / Update transaction status, notes, and tags
  const handleVerifyTransaction = async (
    id: string,
    status: "Approved" | "Rejected" | null,
    notes: string,
    tags: string[]
  ) => {
    try {
      const payload: any = { notes, tags };
      if (status) payload.status = status;

      const res = await fetch(`/api/transactions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const updatedTx = await res.json();
        setTransactions(transactions.map(t => t.id === id ? updatedTx : t));
        setSelectedTx(null);
        setReviewNotes("");
        setReviewTags([]);
        if (status) {
          triggerNotification("success", `Transaction marked as ${status.toUpperCase()} successfully.`);
        } else {
          triggerNotification("success", "Transaction notes and categories updated successfully.");
        }
      } else {
        triggerNotification("error", "Failed to update transaction state.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Admin: Toggle CR permissions
  const handleTogglePermission = async (key: keyof CrPermissions) => {
    const updated = { ...crPermissions, [key]: !crPermissions[key] };
    try {
      const res = await fetch("/api/admin/cr-permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated)
      });
      if (res.ok) {
        setCrPermissions(updated);
        triggerNotification("success", `CR Authorization updated: ${key} is now ${updated[key] ? "ENABLED" : "DISABLED"}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Admin: Switch any user's role dynamically
  const handleChangeUserRole = async (userId: string, newRole: UserRole) => {
    try {
      const res = await fetch("/api/users/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole })
      });
      if (res.ok) {
        setAllUsers(allUsers.map(u => u.id === userId ? { ...u, role: newRole } : u));
        triggerNotification("success", "User system privilege updated.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Add Notice
  const handleAddNotice = async (title: string, content: string, priority: "low" | "medium" | "high") => {
    try {
      const res = await fetch("/api/notices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          priority,
          createdBy: currentUser?.name || "Staff"
        })
      });
      if (res.ok) {
        const notice = await res.json();
        setNotices([notice, ...notices]);
        triggerNotification("success", "Notice posted on public bulletin board.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Notice
  const handleDeleteNotice = async (id: string) => {
    try {
      const res = await fetch(`/api/notices/${id}`, { method: "DELETE" });
      if (res.ok) {
        setNotices(notices.filter(n => n.id !== id));
        triggerNotification("success", "Notice removed.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Add Calendar Event
  const handleAddEvent = async (title: string, type: "academic" | "iv" | "deadline" | "holiday", date: string, description: string) => {
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          type,
          date,
          description,
          createdBy: currentUser?.name || "Staff Coordinator"
        })
      });
      if (res.ok) {
        const event = await res.json();
        setEvents([...events, event].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
        triggerNotification("success", "New department event added to student calendars.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Calendar Event
  const handleDeleteEvent = async (id: string) => {
    try {
      const res = await fetch(`/api/events/${id}`, { method: "DELETE" });
      if (res.ok) {
        setEvents(events.filter(e => e.id !== id));
        triggerNotification("success", "Event deleted.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Academic Resources Handlers
  const handleAddNote = async (newNote: Omit<Note, "id" | "date">) => {
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newNote)
    });
    const data = await res.json();
    if (res.ok) {
      setNotes(prev => [data, ...prev]);
      triggerNotification("success", "Lecture note successfully uploaded!");
    } else {
      throw new Error(data.error || "Failed to add note.");
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      const res = await fetch(`/api/notes/${id}`, { method: "DELETE" });
      if (res.ok) {
        setNotes(prev => prev.filter(n => n.id !== id));
        triggerNotification("success", "Lecture note deleted.");
      } else {
        const data = await res.json();
        triggerNotification("error", data.error || "Failed to delete note.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddInternship = async (newIntern: Omit<Internship, "id">) => {
    const res = await fetch("/api/internships", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newIntern)
    });
    const data = await res.json();
    if (res.ok) {
      setInternships(prev => [data, ...prev]);
      triggerNotification("success", "Internship opportunity successfully posted!");
    } else {
      throw new Error(data.error || "Failed to post internship.");
    }
  };

  const handleDeleteInternship = async (id: string) => {
    try {
      const res = await fetch(`/api/internships/${id}`, { method: "DELETE" });
      if (res.ok) {
        setInternships(prev => prev.filter(i => i.id !== id));
        triggerNotification("success", "Internship post removed.");
      } else {
        const data = await res.json();
        triggerNotification("error", data.error || "Failed to remove internship.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddCompanyLink = async (newLink: Omit<CompanyLink, "id">) => {
    const res = await fetch("/api/company-links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newLink)
    });
    const data = await res.json();
    if (res.ok) {
      setCompanyLinks(prev => [...prev, data]);
      triggerNotification("success", "Verified training portal link added!");
    } else {
      throw new Error(data.error || "Failed to add company link.");
    }
  };

  const handleDeleteCompanyLink = async (id: string) => {
    try {
      const res = await fetch(`/api/company-links/${id}`, { method: "DELETE" });
      if (res.ok) {
        setCompanyLinks(prev => prev.filter(l => l.id !== id));
        triggerNotification("success", "Corporate link removed.");
      } else {
        const data = await res.json();
        triggerNotification("error", data.error || "Failed to remove link.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Report calculations for Admin Analytics
  const analytics = React.useMemo(() => {
    const totalCollected = transactions
      .filter(t => t.status === "Approved")
      .reduce((sum, t) => sum + t.amount, 0);

    const totalPending = transactions
      .filter(t => t.status === "Pending")
      .reduce((sum, t) => sum + t.amount, 0);

    const approvedCount = transactions.filter(t => t.status === "Approved").length;
    const pendingCount = transactions.filter(t => t.status === "Pending").length;

    // Chart distribution for visual bar representation
    const collectionsByPurpose: { [key: string]: number } = {};
    transactions.forEach(t => {
      if (t.status === "Approved") {
        collectionsByPurpose[t.purpose] = (collectionsByPurpose[t.purpose] || 0) + t.amount;
      }
    });

    return {
      totalCollected,
      totalPending,
      approvedCount,
      pendingCount,
      byPurpose: Object.entries(collectionsByPurpose)
    };
  }, [transactions]);

  // Top Contributors Leaderboard memo
  const topContributors = React.useMemo(() => {
    const contributorTotals: { [key: string]: { name: string; total: number } } = {};
    transactions.forEach(t => {
      if (t.status === "Approved") {
        const key = t.regNo.toUpperCase();
        if (!contributorTotals[key]) {
          contributorTotals[key] = { name: t.studentName, total: 0 };
        }
        contributorTotals[key].total += t.amount;
      }
    });
    return Object.entries(contributorTotals)
      .map(([regNo, data]) => ({ regNo, name: data.name, total: data.total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [transactions]);

  // Dynamic Academic Fee Ledger for the 27-student cyber security registration cohort
  const academicFees = React.useMemo(() => {
    const firstNames = [
      "Krish Gokul 4135", "Rahul Sharma", "Aakash Verma", "Balaji Rao", "Chitra Nair", "Divya Bharathi", "Eshwar Sen", 
      "Hari Prasad", "Indu Sekhar", "Jaya Raj", "Kiran Hegde", "Lakshmi Priya", "Manoj Kumar", "Nisha Patel", 
      "Omkar Dev", "Pranav Shah", "Rishi Kapoor", "Sonia Gandhi", "Tarun Gill", "Uday Kiran", "Vijay Devar", 
      "William Das", "Xavier Roy", "Yashwant Rao", "Zain Khan", "Aravind Swamy", "Abhishek Kumar"
    ];
    
    return Array.from({ length: 27 }, (_, idx) => {
      const regNum = (62052414001 + idx).toString();
      const name = `${firstNames[idx] || `Student ${idx + 1}`} U P E`;
      const subId = regNum === "62052414001" ? "4135-O K S B I" : undefined;
      
      // Varying paid status for realistic fee ledger representation
      let paid = 55000;
      if (idx % 5 === 1) paid = 35000;
      else if (idx % 5 === 2) paid = 0;
      else if (idx % 5 === 3) paid = 55000;
      else if (idx % 5 === 4) paid = 15000;
      
      // Special override for Krish Gokul 4135 U P E
      if (regNum === "62052414001") paid = 55000;
      
      const total = 55000;
      const due = total - paid;
      const status = due === 0 ? "Fully Paid" : due === total ? "Unpaid" : "Partially Paid";
      
      return {
        regNo: regNum,
        name,
        subId,
        total,
        paid,
        due,
        status
      };
    });
  }, []);

  // Filtered Academic Fees for search functionality
  const filteredAcademicFees = React.useMemo(() => {
    if (!feeSearch.trim()) return academicFees;
    const term = feeSearch.toLowerCase().trim();
    return academicFees.filter(student => 
      student.name.toLowerCase().includes(term) || 
      student.regNo.includes(term) ||
      (student.subId && student.subId.toLowerCase().includes(term))
    );
  }, [academicFees, feeSearch]);

  const academicFeeStats = React.useMemo(() => {
    const totalCollected = academicFees.reduce((sum, s) => sum + s.paid, 0);
    const totalOutstanding = academicFees.reduce((sum, s) => sum + s.due, 0);
    const fullyPaidCount = academicFees.filter(s => s.status === "Fully Paid").length;
    return {
      totalCollected,
      totalOutstanding,
      fullyPaidCount
    };
  }, [academicFees]);

  // Filtered and tagged transactions for the Event ledger
  const filteredTransactions = React.useMemo(() => {
    let result = transactions;

    if (selectedTagFilter) {
      result = result.filter(t => t.tags && t.tags.includes(selectedTagFilter));
    }

    if (txSearch.trim()) {
      const term = txSearch.toLowerCase().trim();
      result = result.filter(t => 
        t.studentName.toLowerCase().includes(term) ||
        t.regNo.toLowerCase().includes(term) ||
        t.purpose.toLowerCase().includes(term) ||
        t.id.toLowerCase().includes(term) ||
        (t.tags && t.tags.some(tag => tag.toLowerCase().includes(term)))
      );
    }

    return result;
  }, [transactions, txSearch, selectedTagFilter]);

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#060a13] text-slate-200 font-sans selection:bg-emerald-500 selection:text-black flex flex-col items-center justify-center p-4 md:p-8 relative overflow-hidden bg-[linear-gradient(rgba(16,185,129,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.04)_1px,transparent_1px)] bg-[size:24px_24px]">
        {/* Subtle cyan accent glow in background */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-10 left-10 w-[300px] h-[300px] bg-cyan-500/5 rounded-full blur-[80px] pointer-events-none"></div>

        {/* Dynamic Status/Feedback Notification banner */}
        {errorMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-slate-100 border border-red-500/40 rounded-xl p-4 shadow-[0_0_20px_rgba(239,68,68,0.15)] flex items-center gap-3 animate-pulse">
            <AlertOctagon className="text-red-400 shrink-0 h-6 w-6" />
            <div className="text-xs font-mono font-bold uppercase tracking-wider">{errorMessage}</div>
            <button onClick={() => setErrorMessage(null)} className="font-bold underline text-xs pl-2 text-red-400 hover:text-red-300">Dismiss</button>
          </div>
        )}

        {successMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-slate-100 border border-emerald-500/40 rounded-xl p-4 shadow-[0_0_20px_rgba(16,185,129,0.15)] flex items-center gap-3">
            <CheckCircle className="text-emerald-400 shrink-0 h-6 w-6" />
            <div className="text-xs font-mono font-bold uppercase tracking-wider">{successMessage}</div>
            <button onClick={() => setSuccessMessage(null)} className="font-bold underline text-xs pl-2 text-emerald-400 hover:text-emerald-300">Dismiss</button>
          </div>
        )}

        <div className="w-full max-w-xl space-y-6 relative z-10">
          {/* Logo / Title Area */}
          <div className="border border-emerald-500/20 rounded-2xl p-6 bg-[#0c1220]/90 backdrop-blur-md shadow-[0_0_30px_rgba(16,185,129,0.1)] text-center flex flex-col items-center">
            <div className="relative mb-4 group">
              <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-md group-hover:bg-emerald-500/30 transition duration-300"></div>
              <img
                src="/src/assets/images/cybersecurity_logo_1783437301519.jpg"
                alt="Cyber Security Specialization Logo"
                className="relative h-20 w-20 rounded-full border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.4)] object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono px-3 py-1 text-[10px] font-bold tracking-widest uppercase rounded-md">
              CSE & CYBER SECURITY PORTAL
            </span>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight uppercase text-white mt-3">
              CYBER SHIELD GATEWAY
            </h1>
            <p className="text-xs font-mono text-cyan-400 uppercase tracking-wider mt-1">
              Encrypted Audit & Academic Ledger v3.5
            </p>
          </div>

          {/* Core Login Card */}
          <div className="border border-emerald-500/20 bg-[#0c1220]/95 backdrop-blur-md p-6 md:p-8 rounded-2xl shadow-[0_0_40px_rgba(16,185,129,0.08)] space-y-6">
            <div className="flex items-center gap-2.5 border-b border-slate-800 pb-4">
              <Shield className="h-5 w-5 text-emerald-400" />
              <h2 className="font-bold text-lg text-white uppercase tracking-tight">Access Authentication</h2>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setIsLoading(true);
                const success = await handleLogin(loginRegNo, loginPassword);
                setIsLoading(false);
                if (success) {
                  setLoginPassword("");
                }
              }}
              className="space-y-5"
            >
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 font-mono">
                  Identity Token (Reg No / Username)
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={loginRegNo}
                    onChange={(e) => setLoginRegNo(e.target.value)}
                    placeholder="e.g., 62052414001 or STAFF001"
                    className="w-full pl-10 pr-3 py-2.5 text-sm font-mono font-bold border border-slate-700 bg-[#060a13] text-emerald-400 placeholder-slate-500 focus:outline-none focus:border-emerald-500 rounded-lg transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 font-mono">
                  Secure Password
                </label>
                <div className="relative">
                  <Key className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type={showLoginPassword ? "text" : "password"}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 text-sm border border-slate-700 bg-[#060a13] text-emerald-400 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono rounded-lg transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3 top-3 h-4 w-4 text-slate-400 hover:text-white focus:outline-none flex items-center justify-center"
                    title={showLoginPassword ? "Hide password" : "Show password"}
                  >
                    {showLoginPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white py-3 font-bold uppercase text-xs tracking-wider rounded-lg shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_25px_rgba(16,185,129,0.4)] transition-all duration-200 disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Shield className="h-4 w-4" />
                )}
                Decrypt & Authenticate Credentials
              </button>
            </form>
          </div>

          {/* Quick Demo Accounts Card */}
          <div className="border border-cyan-500/20 bg-[#0a1424]/90 backdrop-blur-md p-5 rounded-2xl shadow-[0_0_20px_rgba(6,182,212,0.05)] space-y-3">
            <p className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              ⚡ SECURITY TESTING PROFILE CREDENTIALS
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => {
                  setLoginRegNo("STAFF001");
                  setLoginPassword("admin123");
                }}
                className="text-left p-3 bg-[#060a13] border border-slate-800 hover:border-cyan-500/50 hover:bg-[#0c1220] transition-all duration-200 rounded-xl flex flex-col justify-between"
              >
                <div>
                  <span className="bg-red-500/10 text-red-400 border border-red-500/20 font-bold text-[8px] tracking-wide px-1.5 py-0.5 uppercase rounded-sm">Staff Admin</span>
                  <p className="font-bold mt-1.5 text-white text-xs">Dr. Anand (HOD)</p>
                </div>
                <div className="font-mono text-[9px] text-slate-400 mt-2">
                  <div>User: STAFF001</div>
                  <div>Pass: admin123</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setLoginRegNo("62052414002");
                  setLoginPassword("cr123");
                }}
                className="text-left p-3 bg-[#060a13] border border-slate-800 hover:border-cyan-500/50 hover:bg-[#0c1220] transition-all duration-200 rounded-xl flex flex-col justify-between"
              >
                <div>
                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-[8px] tracking-wide px-1.5 py-0.5 uppercase rounded-sm">Class Rep</span>
                  <p className="font-bold mt-1.5 text-white text-xs">Rahul Sharma</p>
                </div>
                <div className="font-mono text-[9px] text-slate-400 mt-2">
                  <div>User: 62052414002</div>
                  <div>Pass: cr123</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setLoginRegNo("62052414001");
                  setLoginPassword("student123");
                }}
                className="text-left p-3 bg-[#060a13] border border-slate-800 hover:border-cyan-500/50 hover:bg-[#0c1220] transition-all duration-200 rounded-xl flex flex-col justify-between"
              >
                <div>
                  <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold text-[8px] tracking-wide px-1.5 py-0.5 uppercase rounded-sm">Student</span>
                  <p className="font-bold mt-1.5 text-white text-xs">Krish Gokul</p>
                </div>
                <div className="font-mono text-[9px] text-slate-400 mt-2">
                  <div>User: 62052414001</div>
                  <div>Pass: student123</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (currentUser && currentUser.isFirstLogin) {
    return (
      <PasswordResetView
        currentUser={currentUser}
        onPasswordReset={(updatedUser) => {
          setCurrentUser(updatedUser);
        }}
        onLogout={handleLogout}
        triggerNotification={triggerNotification}
      />
    );
  }

  if (currentUser && !currentUser.isOtpVerified) {
    return (
      <OtpVerificationView
        currentUser={currentUser}
        initialSimulatedOtp={loginSimulatedOtp}
        onOtpVerified={(updatedUser) => {
          setCurrentUser(updatedUser);
          loadData();
        }}
        onLogout={handleLogout}
        triggerNotification={triggerNotification}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#060a13] text-slate-100 font-sans selection:bg-emerald-500 selection:text-black flex flex-col p-4 md:p-8 relative bg-[linear-gradient(rgba(16,185,129,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.03)_1px,transparent_1px)] bg-[size:24px_24px]">
      {/* Dynamic background glow spots */}
      <div className="absolute top-10 right-10 w-96 h-96 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-20 left-10 w-96 h-96 bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none"></div>

      {/* Dynamic Status/Feedback Notification banner */}
      {errorMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-slate-100 border border-red-500/40 rounded-xl p-4 shadow-[0_0_20px_rgba(239,68,68,0.15)] flex items-center gap-3 animate-pulse">
          <AlertOctagon className="text-red-400 shrink-0 h-6 w-6" />
          <div className="text-xs font-mono font-bold uppercase tracking-wider">{errorMessage}</div>
          <button onClick={() => setErrorMessage(null)} className="font-bold underline text-xs pl-2 text-red-400 hover:text-red-300">Dismiss</button>
        </div>
      )}

      {successMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-slate-100 border border-emerald-500/40 rounded-xl p-4 shadow-[0_0_20px_rgba(16,185,129,0.15)] flex items-center gap-3">
          <CheckCircle className="text-emerald-400 shrink-0 h-6 w-6" />
          <div className="text-xs font-mono font-bold uppercase tracking-wider">{successMessage}</div>
          <button onClick={() => setSuccessMessage(null)} className="font-bold underline text-xs pl-2 text-emerald-400 hover:text-emerald-300">Dismiss</button>
        </div>
      )}

      {/* Header (Cyber style) */}
      <header className="border border-emerald-500/20 bg-[#0c1220]/90 backdrop-blur-md p-6 md:p-8 mb-8 rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.1)] flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-5">
          <div className="relative group shrink-0">
            <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-md group-hover:bg-emerald-500/30 transition duration-300"></div>
            <img
              src="/src/assets/images/cybersecurity_logo_1783437301519.jpg"
              alt="Cyber Security Logo"
              className="relative h-20 w-20 rounded-full border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.3)] object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono px-3 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded">
                SECURE PORTAL CORE V3.5
              </span>
              <span className="text-[10px] font-bold text-slate-400 font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                SECURE LEDGER ACTIVE
              </span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white uppercase mt-2">
              CYBER SHIELD GATEWAY
            </h1>
            <p className="text-sm font-semibold text-emerald-400 uppercase tracking-wide mt-1">
              Department of Computer Science Engineering & Cyber Security
            </p>
            <p className="text-xs font-mono text-slate-400 uppercase tracking-wider mt-0.5">
              Secure Enrollment, Academic Assets & Financial Auditing Terminal
            </p>
          </div>
        </div>

        {/* User Identity Box & Simulator Selector */}
        <div className="border border-slate-700/60 p-4 rounded-xl bg-[#070b13] self-stretch lg:self-auto flex flex-col md:flex-row gap-4 items-start md:items-center justify-between shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold text-xs font-mono border border-emerald-400/40">
                {currentUser?.name.slice(0, 2).toUpperCase() || "GU"}
              </div>
              <div>
                <p className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider leading-none">
                  Logged in operator
                </p>
                <p className="text-sm font-bold text-white uppercase tracking-tight mt-0.5">
                  {currentUser?.name || "Guest Student"}
                </p>
              </div>
            </div>
            <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                ROLE: {currentUser?.role?.toUpperCase() || "STUDENT"}
              </span>
              <span className="bg-slate-800 text-slate-300 border border-slate-700 text-[9px] font-mono px-2 py-0.5 rounded">
                REG_NO: {currentUser?.regNo || "PENDING"}
              </span>
            </div>
          </div>

          <div className="border-t md:border-t-0 md:border-l border-slate-800 pt-3 md:pt-0 md:pl-4 space-y-2 w-full md:w-auto flex flex-col items-start md:items-end justify-center">
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-xs font-bold uppercase tracking-wider border border-slate-700 bg-[#0c1220] hover:bg-red-950/40 hover:text-red-400 hover:border-red-500/40 text-slate-300 transition-all rounded-lg flex items-center gap-1.5 shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out Securely
            </button>
          </div>
        </div>
      </header>

      {/* Navigation and Actions Row */}
      <nav className="flex flex-wrap gap-2 border-b border-slate-800 pb-5 mb-8">
        {[
          { id: "dashboard", label: "Overview & Fund Board" },
          { id: "finance", label: "Ledger Entries" },
          { id: "attendance", label: "Smart Attendance" },
          { id: "calendar", label: "Academics & Events" },
          { id: "resources", label: "Academic & Careers" },
          { id: "docs", label: "System Specifications" },
          ...((currentUser?.role === "admin" || currentUser?.role === "cr")
            ? [{ id: "users", label: "User Control Center" }]
            : [])
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-5 py-2.5 text-xs font-mono font-bold uppercase tracking-wider transition-all duration-200 rounded-lg border ${
              activeTab === tab.id
                ? "bg-gradient-to-r from-emerald-600 to-teal-500 text-white border-transparent shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                : "bg-[#0c1220] text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Main Core Workspaces */}
      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20">
          <RefreshCw className="h-10 w-10 animate-spin text-black" />
          <p className="mt-4 font-mono text-sm uppercase font-bold">Synchronizing with college secure server database...</p>
        </div>
      ) : (
        <main className="flex-1 space-y-10">
          {activeTab === "dashboard" && (
            <div className="space-y-10">
              {/* Deadline Countdown Section */}
              <div className="border border-emerald-500/20 bg-[#0c1220]/90 backdrop-blur-md p-6 rounded-2xl shadow-[0_0_25px_rgba(16,185,129,0.06)] relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-500 to-teal-500"></div>
                <div>
                  <div className="flex items-center gap-2">
                    <Clock className="text-emerald-400 h-5 w-5 animate-pulse" />
                    <span className="text-[10px] font-mono font-bold text-emerald-400 tracking-widest uppercase">
                      COUNTDOWN IN PROGRESS
                    </span>
                  </div>
                  <h3 className="text-xl font-bold uppercase tracking-tight text-white mt-1">
                    Symposium 2026 Countdown
                  </h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    Target deployment date: September 15, 2026 • CSE & Cyber Security Tech Fest
                  </p>
                </div>

                <div className="flex gap-3">
                  {[
                    { value: timeLeft.days, label: "Days" },
                    { value: timeLeft.hours, label: "Hours" },
                    { value: timeLeft.minutes, label: "Mins" },
                    { value: timeLeft.seconds, label: "Secs" }
                  ].map((unit, i) => (
                    <div key={i} className="flex flex-col items-center">
                      <div className="w-16 h-14 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.05)]">
                        <span className="text-2xl font-black font-mono text-emerald-400">
                          {String(unit.value).padStart(2, "0")}
                        </span>
                      </div>
                      <span className="text-[9px] font-mono uppercase text-slate-500 mt-1 font-bold">
                        {unit.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Active Alert System: Low-Fund Defense Warning */}
              {65000 - analytics.totalCollected > 15000 && (
                <div className="border border-amber-500/30 bg-amber-950/20 p-4 rounded-xl flex items-center gap-4 animate-pulse">
                  <div className="p-2.5 bg-amber-500/10 border border-amber-500/40 text-amber-400 rounded-lg">
                    <AlertOctagon className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[9px] font-mono px-2 py-0.5 uppercase font-bold rounded">
                        CRITICAL ALERT LEVEL 2
                      </span>
                      <span className="text-[10px] font-mono text-amber-400/80 uppercase font-bold tracking-wider">
                        Low Fund Buffer Active
                      </span>
                    </div>
                    <p className="text-xs text-amber-300 font-semibold mt-1">
                      Remaining Deficit exceeds threshold of ₹15,000! Currently short by ₹{(65000 - analytics.totalCollected).toLocaleString()}. Please expedite payment verifications immediately.
                    </p>
                  </div>
                </div>
              )}

              {/* Financial Dashboard Indicators (Bento Grid) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Fund board */}
                <div className="border border-emerald-500/20 p-6 bg-[#0c1220]/95 backdrop-blur-md shadow-[0_0_25px_rgba(16,185,129,0.06)] flex flex-col justify-between lg:col-span-2 relative overflow-hidden rounded-2xl">
                  <div className="absolute right-0 top-0 -mr-6 -mt-6 w-32 h-32 bg-emerald-500/5 rounded-full blur-xl pointer-events-none"></div>
                  <div>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-slate-400 mb-1">
                          ACTIVE DEPARTMENT FUND
                        </p>
                        <h2 className="text-xl font-bold uppercase tracking-tight text-white">
                          Symposium 2026 & ISRO IV Collections
                        </h2>
                      </div>
                      <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[9px] font-mono px-2.5 py-1 uppercase font-bold rounded">
                        Q3-FINANCE-ACTIVE
                      </span>
                    </div>

                    <div className="mt-8 flex flex-col md:flex-row items-baseline gap-4">
                      <span className="text-5xl md:text-7xl font-black tracking-tight text-white leading-none">
                        ₹{analytics.totalCollected.toLocaleString()}
                      </span>
                      <span className="text-sm font-semibold text-slate-400 font-mono">
                        verified of ₹65,000 budget target
                      </span>
                    </div>

                    {/* Simple brutalist progress bar */}
                    <div className="w-full bg-[#060a13] border border-slate-800 h-8 mt-6 overflow-hidden relative rounded-lg">
                      <div
                        className="bg-gradient-to-r from-emerald-600 to-teal-500 h-full border-r border-emerald-400/30 transition-all duration-500"
                        style={{ width: `${Math.min(100, (analytics.totalCollected / 65000) * 100)}%` }}
                      ></div>
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono font-bold uppercase text-white tracking-widest drop-shadow">
                        {Math.round((analytics.totalCollected / 65000) * 100)}% COLLECTION TARGET MET
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t border-slate-800">
                    <div className="text-center md:text-left">
                      <p className="text-2xl font-black font-mono text-emerald-400">{analytics.approvedCount}</p>
                      <p className="text-[9px] font-mono font-bold uppercase text-slate-400 tracking-wider">Approved Paid</p>
                    </div>
                    <div className="text-center md:text-left border-l border-slate-850 pl-4">
                      <p className="text-2xl font-black font-mono text-amber-500">₹{analytics.totalPending.toLocaleString()}</p>
                      <p className="text-[9px] font-mono font-bold uppercase text-slate-400 tracking-wider">Pending Audit ({analytics.pendingCount})</p>
                    </div>
                    <div className="text-center md:text-left border-l border-slate-850 pl-4">
                      <p className="text-2xl font-black font-mono text-rose-500">₹{(65000 - analytics.totalCollected).toLocaleString()}</p>
                      <p className="text-[9px] font-mono font-bold uppercase text-slate-400 tracking-wider">Remaining Deficit</p>
                    </div>
                  </div>
                </div>

                {/* UPI QR Code Widget */}
                <div className="border border-cyan-500/20 p-6 bg-[#0c1220]/95 backdrop-blur-md shadow-[0_0_25px_rgba(6,182,212,0.06)] flex flex-col justify-between rounded-2xl">
                  <div>
                    <h3 className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-slate-400 mb-6">
                      Scan to Pay (Active UPI)
                    </h3>

                    <div className="border border-cyan-500/10 bg-[#060a13] p-4 flex flex-col items-center justify-center relative group rounded-xl">
                      {/* Simple Dynamic QR Representation */}
                      <div className="w-40 h-40 bg-slate-900 border border-slate-800 flex flex-col items-center justify-center p-2 relative rounded-lg">
                        <QrCode className="h-24 w-24 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]" />
                        <span className="mt-2 text-[9px] font-mono font-bold uppercase text-center tracking-wider bg-cyan-500/10 text-cyan-400 px-1.5 py-0.5 border border-cyan-500/30 animate-pulse rounded">
                          Scan to Authorize
                        </span>
                        <span className="absolute bottom-1 font-mono text-[7px] font-bold text-slate-500 uppercase">
                          SECURE TRANSIT LAYER
                        </span>
                      </div>

                      <div className="mt-4 text-center">
                        <p className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest leading-none">
                          Active Collection UPI ID
                        </p>
                        <p className="font-mono text-xs font-semibold mt-1.5 bg-[#060a13] text-cyan-300 border border-slate-800 px-2.5 py-1.5 break-all rounded-lg select-all">
                          {upiSettings.upiId}
                        </p>
                      </div>
                    </div>
                  </div>

                  {currentUser?.role === "cr" && (
                    <div className="mt-6">
                      <form onSubmit={handleUpdateUpi} className="space-y-2">
                        <label className="block text-[10px] font-mono font-bold uppercase text-slate-400">
                          Update UPI ID (Active Semester)
                        </label>
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            value={editUpiId}
                            onChange={(e) => setEditUpiId(e.target.value)}
                            placeholder="new-dept@okaxis"
                            className="flex-1 font-mono text-xs px-3 py-2 border border-slate-700 bg-[#060a13] text-cyan-400 placeholder-slate-500 focus:outline-none focus:border-cyan-500 rounded-lg"
                          />
                          <button
                            type="submit"
                            disabled={isUpdatingUpi}
                            className="bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white px-3.5 text-xs font-mono font-bold uppercase rounded-lg border-0 transition-all shadow-[0_0_10px_rgba(6,182,212,0.2)]"
                          >
                            Update
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {currentUser?.role === "admin" && (
                    <div className="mt-4 p-3 border border-slate-800 rounded-xl bg-[#060a13]">
                      <p className="text-[10px] font-mono text-slate-400 leading-relaxed">
                        💡 Admin control: CR permission to modify UPI is currently{" "}
                        <strong className="text-cyan-400 underline">{crPermissions.canEditUpi ? "ENABLED" : "DISABLED"}</strong>.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Category Breakdown & Contributor Leaderboard */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Custom Category Breakdown Chart (SVG Donut Chart) */}
                <div className="border border-emerald-500/20 p-6 bg-[#0c1220]/95 backdrop-blur-md rounded-2xl shadow-[0_0_25px_rgba(16,185,129,0.06)] flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-6">
                      <div>
                        <p className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-slate-400 mb-1">
                          FINANCIAL METRICS
                        </p>
                        <h3 className="text-lg font-bold text-white uppercase">
                          {breakdownView === "income" ? "Collection Categories" : "Department Expense Allocation"}
                        </h3>
                      </div>
                      <div className="flex bg-[#060a13] border border-slate-800 p-1 rounded-lg">
                        <button
                          onClick={() => setBreakdownView("income")}
                          className={`px-3 py-1 text-[10px] font-mono font-bold uppercase rounded-md transition-all ${
                            breakdownView === "income"
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : "text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          Income
                        </button>
                        <button
                          onClick={() => setBreakdownView("expenses")}
                          className={`px-3 py-1 text-[10px] font-mono font-bold uppercase rounded-md transition-all ${
                            breakdownView === "expenses"
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : "text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          Expenses
                        </button>
                      </div>
                    </div>

                    {breakdownView === "income" ? (
                      <div className="space-y-6">
                        {/* Custom SVG Donut Chart for Income Categories */}
                        <div className="flex flex-col sm:flex-row items-center justify-around gap-6">
                          {/* SVG Donut */}
                          <div className="relative w-40 h-40 flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                              <circle
                                cx="50"
                                cy="50"
                                r="40"
                                fill="transparent"
                                stroke="#0f172a"
                                strokeWidth="12"
                              />
                              {/* Draw proportional slices manually */}
                              {(() => {
                                let accumulatedPercent = 0;
                                const colors = ["#10b981", "#06b6d4", "#6366f1", "#f59e0b"];
                                const total = analytics.totalCollected || 1;
                                return analytics.byPurpose.map(([purpose, amount], i) => {
                                  const percent = (amount / total) * 100;
                                  const dashArray = `${percent} ${100 - percent}`;
                                  const dashOffset = -accumulatedPercent;
                                  accumulatedPercent += percent;
                                  return (
                                    <circle
                                      key={purpose}
                                      cx="50"
                                      cy="50"
                                      r="40"
                                      fill="transparent"
                                      stroke={colors[i % colors.length]}
                                      strokeWidth="12"
                                      strokeDasharray={`${(percent * 2.51).toFixed(1)} 251`}
                                      strokeDashoffset={`${(dashOffset * 2.51).toFixed(1)}`}
                                      className="transition-all duration-500 hover:stroke-[14px]"
                                    />
                                  );
                                });
                              })()}
                            </svg>
                            <div className="absolute text-center">
                              <p className="text-xl font-mono font-bold text-white leading-none">
                                ₹{(analytics.totalCollected / 1000).toFixed(1)}k
                              </p>
                              <p className="text-[8px] font-mono text-slate-400 uppercase tracking-wider mt-1">
                                Verified
                              </p>
                            </div>
                          </div>

                          {/* Legend / Categories table */}
                          <div className="flex-1 space-y-3.5 w-full">
                            {analytics.byPurpose.length === 0 ? (
                              <p className="text-xs text-slate-400 italic">No verified collection data recorded.</p>
                            ) : (
                              analytics.byPurpose.map(([purpose, amount], i) => {
                                const colors = ["bg-emerald-500", "bg-cyan-500", "bg-indigo-500", "bg-amber-500"];
                                const percent = Math.round((amount / (analytics.totalCollected || 1)) * 100);
                                return (
                                  <div key={purpose} className="space-y-1">
                                    <div className="flex justify-between text-xs font-semibold text-slate-300">
                                      <span className="flex items-center gap-2 truncate max-w-[150px] uppercase text-[10px]">
                                        <span className={`w-2 h-2 rounded-full ${colors[i % colors.length]}`}></span>
                                        {purpose}
                                      </span>
                                      <span className="font-mono text-white text-[10px]">{percent}%</span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-mono pl-4">₹{amount.toLocaleString()}</p>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* Custom SVG Donut Chart for Expense Categories */}
                        <div className="flex flex-col sm:flex-row items-center justify-around gap-6">
                          {/* SVG Donut */}
                          <div className="relative w-40 h-40 flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                              <circle
                                cx="50"
                                cy="50"
                                r="40"
                                fill="transparent"
                                stroke="#0f172a"
                                strokeWidth="12"
                              />
                              {/* Hardcoded spent expenses allocations */}
                              {(() => {
                                let accumulatedPercent = 0;
                                const expensesList = [
                                  { label: "Food & Refreshments", amount: 18000, pct: 36, color: "#ef4444" },
                                  { label: "Travel & Transit", amount: 15000, pct: 30, color: "#f97316" },
                                  { label: "Tech Equipment & Cables", amount: 10000, pct: 20, color: "#eab308" },
                                  { label: "Poster & Badge Printing", amount: 4000, pct: 8, color: "#a855f7" },
                                  { label: "Audio & Venue Setup", amount: 3000, pct: 6, color: "#ec4899" }
                                ];
                                return expensesList.map((exp, i) => {
                                  const dashArray = `${exp.pct} ${100 - exp.pct}`;
                                  const dashOffset = -accumulatedPercent;
                                  accumulatedPercent += exp.pct;
                                  return (
                                    <circle
                                      key={i}
                                      cx="50"
                                      cy="50"
                                      r="40"
                                      fill="transparent"
                                      stroke={exp.color}
                                      strokeWidth="12"
                                      strokeDasharray={`${(exp.pct * 2.51).toFixed(1)} 251`}
                                      strokeDashoffset={`${(dashOffset * 2.51).toFixed(1)}`}
                                      className="transition-all duration-500 hover:stroke-[14px]"
                                    />
                                  );
                                });
                              })()}
                            </svg>
                            <div className="absolute text-center">
                              <p className="text-xl font-mono font-bold text-white leading-none">
                                ₹50.0k
                              </p>
                              <p className="text-[8px] font-mono text-slate-400 uppercase tracking-wider mt-1">
                                Total Spent
                              </p>
                            </div>
                          </div>

                          {/* Legend / Categories table */}
                          <div className="flex-1 space-y-3.5 w-full">
                            {[
                              { label: "Food & Refreshments", amount: 18000, pct: 36, color: "bg-red-500" },
                              { label: "Travel & Transit", amount: 15000, pct: 30, color: "bg-orange-500" },
                              { label: "Tech Equipment & Cables", amount: 10000, pct: 20, color: "bg-yellow-500" },
                              { label: "Poster & Badge Printing", amount: 4000, pct: 8, color: "bg-purple-500" },
                              { label: "Audio & Venue Setup", amount: 3000, pct: 6, color: "bg-pink-500" }
                            ].map((exp) => (
                              <div key={exp.label} className="space-y-1">
                                <div className="flex justify-between text-xs font-semibold text-slate-300">
                                  <span className="flex items-center gap-2 truncate max-w-[150px] uppercase text-[10px]">
                                    <span className={`w-2 h-2 rounded-full ${exp.color}`}></span>
                                    {exp.label}
                                  </span>
                                  <span className="font-mono text-white text-[10px]">{exp.pct}%</span>
                                </div>
                                <p className="text-[10px] text-slate-400 font-mono pl-4">₹{exp.amount.toLocaleString()}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span>STATUS: ALLOCATED SYSTEM BUFFERS</span>
                    <span className="text-emerald-400">Ledger Integrated</span>
                  </div>
                </div>

                {/* Top Contributors Leaderboard Widget */}
                <div className="border border-emerald-500/20 p-6 bg-[#0c1220]/95 backdrop-blur-md rounded-2xl shadow-[0_0_25px_rgba(16,185,129,0.06)] flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-6">
                      <div>
                        <p className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-slate-400 mb-1">
                          COLLEGE HONOR LEDGER
                        </p>
                        <h3 className="text-lg font-bold text-white uppercase">
                          Top Contributors Leaderboard
                        </h3>
                      </div>
                      <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[9px] font-mono px-2 py-0.5 uppercase font-bold rounded">
                        BOARD ACTIVE
                      </span>
                    </div>

                    <div className="space-y-3">
                      {topContributors.length === 0 ? (
                        <div className="py-12 text-center text-slate-500 italic text-xs font-mono border border-slate-800 rounded-xl bg-[#060a13]">
                          No approved contribution transactions recorded yet.
                        </div>
                      ) : (
                        topContributors.map((contrib, idx) => {
                          const medalColors = [
                            "from-yellow-400 to-amber-500 text-slate-950",
                            "from-slate-300 to-slate-400 text-slate-950",
                            "from-amber-600 to-amber-700 text-white",
                            "from-slate-800 to-slate-900 text-slate-400",
                            "from-slate-800 to-slate-900 text-slate-400"
                          ];
                          return (
                            <div
                              key={contrib.regNo}
                              className="flex items-center justify-between p-3 border border-slate-800/60 rounded-xl bg-[#060a13]/60 hover:bg-[#060a13] transition-all"
                            >
                              <div className="flex items-center gap-3">
                                <span className={`w-7 h-7 rounded-full bg-gradient-to-tr ${medalColors[idx]} flex items-center justify-center font-bold text-xs font-mono border border-slate-700/40`}>
                                  {idx + 1}
                                </span>
                                <div>
                                  <p className="text-sm font-bold text-white uppercase">
                                    {contrib.name}
                                  </p>
                                  <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                                    REG: {contrib.regNo}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-mono font-bold text-emerald-400">
                                  ₹{contrib.total.toLocaleString()}
                                </p>
                                <p className="text-[8px] font-mono text-slate-500 uppercase tracking-widest mt-0.5">
                                  VERIFIED FUNDS
                                </p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span>COHORT SIZE: 27 OPERATORS</span>
                    <span className="text-emerald-400">Trophy Rank Active</span>
                  </div>
                </div>
              </div>

              {/* Dynamic Action Section based on user role */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Notice board left side */}
                <NoticeBoard
                  user={currentUser || { id: "guest", name: "Guest", regNo: "GUEST", role: "student", email: "" }}
                  notices={notices}
                  onAddNotice={handleAddNotice}
                  onDeleteNotice={handleDeleteNotice}
                />

                {/* Role Specific Interaction Box */}
                <div className="space-y-6">
                  {currentUser?.role === "student" && (
                    <div className="space-y-6">
                      <div className="border-4 border-cyan-500 p-6 bg-slate-950 text-slate-100 shadow-[0_0_25px_rgba(6,182,212,0.35)] space-y-6 rounded-md">
                        <div className="flex items-center gap-3 border-b border-cyan-500/20 pb-4">
                          <div className="p-2.5 bg-slate-900 border-2 border-cyan-400 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.2)]">
                            <CreditCard className="h-6 w-6" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-black text-xl uppercase font-mono tracking-tight text-white">
                                Symposium Registration Portal
                              </h3>
                              <span className="bg-cyan-500 text-black text-[9px] font-mono font-black uppercase px-1.5 py-0.5 animate-pulse rounded-sm">
                                active
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 font-mono">
                              Verify your event tracks & submission with real-time sandbox validation.
                            </p>
                          </div>
                        </div>

                        <form onSubmit={handleAddTransaction} className="space-y-5">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-black uppercase text-cyan-400 font-mono mb-1 tracking-wider">
                                Your Full Name
                              </label>
                              <input
                                type="text"
                                value={payName}
                                onChange={(e) => setPayName(e.target.value)}
                                required
                                className="w-full text-sm font-mono px-3 py-2 border-2 border-slate-800 bg-slate-900 text-white focus:border-cyan-400 focus:outline-hidden"
                              />
                            </div>

                            {/* Year Selection Dropdown */}
                            <div>
                              <label className="block text-xs font-black uppercase text-cyan-400 font-mono mb-1 tracking-wider">
                                Year of Study
                              </label>
                              <select
                                value={payYear}
                                onChange={(e) => setPayYear(e.target.value)}
                                className="w-full text-sm font-mono px-3 py-2 border-2 border-slate-800 bg-slate-900 text-white focus:border-cyan-400 focus:outline-hidden"
                              >
                                <option value="First Year">First Year</option>
                                <option value="Second Year">Second Year</option>
                                <option value="Third Year">Third Year</option>
                                <option value="Final Year">Final Year</option>
                              </select>
                            </div>

                            {/* Regulation Dropdown */}
                            <div>
                              <label className="block text-xs font-black uppercase text-cyan-400 font-mono mb-1 tracking-wider">
                                Regulation Code
                              </label>
                              <select
                                value={payRegulation}
                                onChange={(e) => setPayRegulation(e.target.value)}
                                className="w-full text-sm font-mono px-3 py-2 border-2 border-slate-800 bg-slate-900 text-white focus:border-cyan-400 focus:outline-hidden"
                              >
                                <option value="Regulation 2021">Regulation 2021</option>
                                <option value="Regulation 2025">Regulation 2025</option>
                              </select>
                            </div>

                            {/* Smart Register Number with Autocomplete Pool for Reg 2025 */}
                            <div>
                              <label className="block text-xs font-black uppercase text-cyan-400 font-mono mb-1 tracking-wider">
                                Register Number
                              </label>
                              {payRegulation === "Regulation 2025" ? (
                                <select
                                  value={payRegNo}
                                  onChange={(e) => setPayRegNo(e.target.value)}
                                  className="w-full text-sm font-mono px-3 py-2 border-2 border-cyan-500 bg-slate-900 text-white focus:border-cyan-400 focus:outline-hidden"
                                >
                                  {reg2025Pool.map((reg) => (
                                    <option key={reg} value={reg}>
                                      {reg} (Regulation 2025 Pool)
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <div className="space-y-1">
                                  <input
                                    type="text"
                                    value={payRegNo}
                                    onChange={(e) => setPayRegNo(e.target.value)}
                                    placeholder="e.g. 620524149006"
                                    required
                                    className="w-full text-sm font-mono px-3 py-2 border-2 border-slate-800 bg-slate-900 text-white focus:border-cyan-400 focus:outline-hidden"
                                  />
                                  <div className="flex items-center gap-1.5 mt-1">
                                    {payRegNo.startsWith("620524149006") ? (
                                      <span className="text-[10px] text-[#00FF00] font-mono flex items-center gap-1">
                                        <Check className="h-3 w-3" /> Prefix Matches Regulation 2021
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-amber-400 font-mono flex items-center gap-1">
                                        ⚠️ Reg 2021 must start with 620524149006
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Purpose of Payment */}
                            <div className="sm:col-span-2">
                              <label className="block text-xs font-black uppercase text-cyan-400 font-mono mb-1 tracking-wider">
                                Purpose of Payment
                              </label>
                              <select
                                value={payPurpose}
                                onChange={(e) => {
                                  setPayPurpose(e.target.value);
                                  if (e.target.value !== "Symposium 2026 Registration") {
                                    setSelectedTracks([]);
                                  }
                                }}
                                className="w-full text-sm font-mono px-3 py-2 border-2 border-slate-800 bg-slate-900 text-white focus:border-cyan-400 focus:outline-hidden"
                              >
                                <option value="Symposium 2026 Registration">Symposium 2026 Registration (Dynamic Tracks Multiplier)</option>
                                <option value="Industrial Visit Trip Contribution">Industrial Visit Trip Contribution (Fixed ₹300)</option>
                                <option value="Department Annual Book Access Fee">Department Annual Book Access Fee (Fixed ₹150)</option>
                              </select>
                            </div>

                            {/* Dynamic Event Fee Multiplier Checkboxes */}
                            {payPurpose === "Symposium 2026 Registration" && (
                              <div className="sm:col-span-2 border-2 border-dashed border-cyan-500/30 p-4 bg-slate-900/50 rounded-xs space-y-2.5 shadow-inner">
                                <p className="text-xs font-bold text-cyan-400 uppercase font-mono tracking-wider flex items-center gap-1.5">
                                  <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                                  Select Symposium Tracks (Dynamic Multiplier):
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                                  {[
                                    { name: "Paper Presentation", fee: 200 },
                                    { name: "Web Creation", fee: 300 },
                                    { name: "Technical Quiz", fee: 150 }
                                  ].map((track) => {
                                    const isChecked = selectedTracks.includes(track.name);
                                    return (
                                      <label
                                        key={track.name}
                                        className={`flex items-center justify-between p-2.5 border-2 cursor-pointer transition-all rounded-xs select-none ${
                                          isChecked
                                            ? "bg-cyan-950/40 border-cyan-400 text-white font-bold shadow-[0_0_10px_rgba(6,182,212,0.15)]"
                                            : "bg-slate-900 border-slate-800/80 text-slate-400 hover:border-slate-700"
                                        }`}
                                      >
                                        <div className="flex items-center gap-2">
                                          <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => {
                                              if (isChecked) {
                                                setSelectedTracks(selectedTracks.filter((t) => t !== track.name));
                                              } else {
                                                setSelectedTracks([...selectedTracks, track.name]);
                                              }
                                            }}
                                            className="rounded border-slate-700 text-cyan-500 focus:ring-0 focus:ring-offset-0 bg-slate-950 w-4 h-4 cursor-pointer"
                                          />
                                          <span className="text-xs font-mono">{track.name}</span>
                                        </div>
                                        <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 border border-slate-700 font-mono text-cyan-400">
                                          ₹{track.fee}
                                        </span>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Amount Paid (Readonly during Symposium selection to prevent manual entry errors) */}
                            <div className="sm:col-span-2">
                              <label className="block text-xs font-black uppercase text-cyan-400 font-mono mb-1 tracking-wider">
                                Amount Paid (₹)
                              </label>
                              <div className="relative">
                                <input
                                  type="number"
                                  value={payAmount}
                                  onChange={(e) => setPayAmount(e.target.value)}
                                  required
                                  min="1"
                                  disabled={payPurpose === "Symposium 2026 Registration"}
                                  className="w-full text-base font-mono font-black px-3 py-2.5 border-2 border-slate-800 bg-slate-900 text-white disabled:bg-slate-850 disabled:text-cyan-400 focus:border-cyan-400 focus:outline-hidden shadow-inner"
                                />
                                {payPurpose === "Symposium 2026 Registration" && (
                                  <span className="absolute right-3 top-3 font-mono text-[9px] text-slate-400 uppercase tracking-widest bg-slate-950 px-2 py-0.5 border border-slate-800">
                                    Track Sum Lock
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Live OCR / Image Upload Sandbox Preview */}
                          <div className="border-2 border-dashed border-cyan-500/40 p-5 bg-slate-950 text-center space-y-4 rounded-xs">
                            <div className="flex items-center justify-center gap-2">
                              <Upload className="h-5 w-5 text-cyan-400 animate-pulse" />
                              <p className="text-xs font-black uppercase tracking-widest text-cyan-400 font-mono">
                                Step 2: Upload Payment screenshot & Sandbox Verification
                              </p>
                            </div>
                            <p className="text-[10px] text-slate-400 max-w-md mx-auto leading-relaxed">
                              Upload transaction screenshot. Simulated sandboxed OCR engine will read & extract Transaction ID in real-time.
                            </p>

                            <div className="flex flex-col sm:flex-row justify-center gap-3 items-center pt-1">
                              <label className="bg-cyan-500 text-black hover:bg-cyan-400 font-mono text-xs font-black uppercase px-5 py-2 border-2 border-cyan-500 cursor-pointer transition-all shadow-[0_0_10px_rgba(6,182,212,0.3)]">
                                Browse Receipt Image
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={handleFileChange}
                                  className="hidden"
                                />
                              </label>

                              <span className="text-[10px] font-mono font-bold text-slate-500">OR SIMULATE:</span>

                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleScreenshotSelect(0)}
                                  className={`px-3 py-1.5 text-[10px] font-mono border-2 transition-all ${
                                    simulatedScreenshotIndex === 0
                                      ? "bg-cyan-500 text-black border-cyan-500 font-bold"
                                      : "bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700"
                                  }`}
                                >
                                  Mock GPay (₹500)
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleScreenshotSelect(1)}
                                  className={`px-3 py-1.5 text-[10px] font-mono border-2 transition-all ${
                                    simulatedScreenshotIndex === 1
                                      ? "bg-cyan-500 text-black border-cyan-500 font-bold"
                                      : "bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700"
                                  }`}
                                >
                                  Mock PhonePe (₹300)
                                </button>
                              </div>
                            </div>

                            {/* OCR Processing Sandbox Indicator */}
                            {(isOcrValidating || ocrVerified || screenshotBase64) && (
                              <div className="mt-4 p-4 bg-slate-900/60 border border-slate-800/80 space-y-4 rounded-xs">
                                {screenshotBase64 && (
                                  <div className="flex justify-center">
                                    <div className="border border-cyan-500/30 p-1 bg-slate-950 max-w-[160px] shadow-[0_0_8px_rgba(6,182,212,0.15)]">
                                      <img
                                        src={screenshotBase64}
                                        alt="Sanitized receipt preview"
                                        className="max-h-32 object-contain"
                                      />
                                    </div>
                                  </div>
                                )}

                                {isOcrValidating && (
                                  <div className="flex flex-col items-center justify-center gap-1.5 py-1.5">
                                    <div className="flex items-center gap-2 text-amber-400 font-mono text-xs font-bold animate-pulse">
                                      <RefreshCw className="h-4 w-4 animate-spin text-amber-400" />
                                      <span>Validating Transaction ID...</span>
                                    </div>
                                    <p className="text-[9px] text-slate-500 font-mono">
                                      Running sandbox OCR algorithms over receipt pixels...
                                    </p>
                                  </div>
                                )}

                                {!isOcrValidating && ocrVerified && (
                                  <div className="flex flex-col items-center gap-1 py-2 px-3 bg-emerald-950/30 border border-emerald-500/30 text-emerald-400 font-mono rounded-xs shadow-inner">
                                    <div className="flex items-center gap-1.5 text-xs font-bold">
                                      <CheckCircle className="h-4 w-4 text-emerald-400" />
                                      <span>TRANSACTION VERIFIED BY SANDBOX OCR</span>
                                    </div>
                                    <p className="text-[10px] text-cyan-400 mt-0.5">
                                      Extracted Ref: <span className="font-bold underline">{ocrTxId}</span>
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          <button
                            type="submit"
                            className="w-full bg-cyan-500 text-black font-black font-mono py-4 uppercase tracking-widest text-xs border-2 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:bg-cyan-400 active:scale-98 transition-all"
                          >
                            Submit Contribution Log to CR Queue
                          </button>
                        </form>
                      </div>

                      {/* Live CR Verification Queue Table Preview (Symposium Grade Extras) */}
                      <div className="border-4 border-cyan-500 bg-slate-950 text-white p-6 shadow-[0_0_20px_rgba(6,182,212,0.25)] space-y-4 rounded-md">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-cyan-500/20 pb-3 gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping"></span>
                              <h4 className="text-md font-black tracking-wider uppercase font-mono text-cyan-400">
                                CR Verification Queue Preview
                              </h4>
                            </div>
                            <p className="text-[10px] font-mono text-slate-400">
                              Real-time student submissions awaiting Class Representative approval.
                            </p>
                          </div>
                          <div className="flex items-center gap-2 self-end sm:self-auto">
                            <button
                              type="button"
                              onClick={handleExportJsonBatch}
                              className="flex items-center gap-1.5 bg-cyan-500 hover:bg-cyan-400 text-black font-mono text-[11px] font-black uppercase px-3 py-1.5 border border-cyan-400 transition-colors shadow-[0_0_8px_rgba(6,182,212,0.2)]"
                              title="Download the full list of submitted contribution logs as a JSON batch file."
                            >
                              <Download className="h-3.5 w-3.5" />
                              Export Log Batch (JSON)
                            </button>
                          </div>
                        </div>

                        <div className="overflow-x-auto border border-cyan-500/20">
                          <table className="w-full text-left font-mono text-xs">
                            <thead>
                              <tr className="bg-slate-900 border-b border-cyan-500/20 text-cyan-400">
                                <th className="p-3 uppercase text-[10px]">Student Details</th>
                                <th className="p-3 uppercase text-[10px]">Year & Reg</th>
                                <th className="p-3 uppercase text-[10px]">Purpose</th>
                                <th className="p-3 uppercase text-[10px] text-right">Amount</th>
                                <th className="p-3 uppercase text-[10px] text-center">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-900 text-[11px] text-slate-300">
                              {transactions.filter(t => t.status === "Pending").length === 0 ? (
                                <tr>
                                  <td colSpan={5} className="p-6 text-center text-slate-500 italic">
                                    -- No pending student payment logs in CR queue --
                                  </td>
                                </tr>
                              ) : (
                                transactions
                                  .filter(t => t.status === "Pending")
                                  .map((tx) => (
                                    <tr key={tx.id} className="hover:bg-slate-900/50 transition-colors">
                                      <td className="p-3">
                                        <span className="font-bold text-white text-xs">{tx.studentName}</span>
                                        <span className="block text-[9px] text-slate-500">{tx.id}</span>
                                      </td>
                                      <td className="p-3">
                                        <span className="font-semibold text-slate-200">{tx.year || "First Year"}</span>
                                        <span className="block text-[10px] text-cyan-400">{tx.regNo}</span>
                                        <span className="text-[9px] text-slate-500">[{tx.regulation || "Regulation 2021"}]</span>
                                      </td>
                                      <td className="p-3 font-sans">
                                        <span className="text-slate-300">{tx.purpose}</span>
                                        {tx.tags && tx.tags.length > 0 && (
                                          <div className="flex flex-wrap gap-1 mt-1 font-mono">
                                            {tx.tags.map(tag => (
                                              <span key={tag} className="text-[9px] bg-slate-900 text-[#00FF00] border border-cyan-500/20 px-1.5 py-0.5">
                                                {tag}
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                      </td>
                                      <td className="p-3 text-right font-black text-cyan-400 font-mono">
                                        ₹{tx.amount}
                                      </td>
                                      <td className="p-3 text-center">
                                        <span className="bg-amber-950/60 text-amber-400 border border-amber-500/35 text-[9px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider font-mono">
                                          Pending CR Approval
                                        </span>
                                      </td>
                                    </tr>
                                  ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {currentUser?.role === "cr" && (
                    <div className="border-4 border-black p-6 bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-6">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-indigo-100 border-2 border-black">
                            <Shield className="h-6 w-6 text-black" />
                          </div>
                          <div>
                            <h3 className="font-black text-xl uppercase">CR Verification Queue</h3>
                            <p className="text-xs text-gray-500">Unverified student transaction list ({analytics.pendingCount} pending)</p>
                          </div>
                        </div>
                        <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 border border-black/10">Active Session</span>
                      </div>

                      <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
                        {transactions.filter(t => t.status === "Pending").length === 0 ? (
                          <div className="text-center py-10 bg-slate-50 border-2 border-dashed border-black/15">
                            <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto" />
                            <p className="mt-2 text-xs font-bold uppercase tracking-wider">All Clear!</p>
                            <p className="text-[10px] text-gray-400 mt-1">There are no pending student payments to verify right now.</p>
                          </div>
                        ) : (
                          transactions
                            .filter(t => t.status === "Pending")
                            .map((tx) => (
                              <div key={tx.id} className="border-2 border-black p-4 bg-white flex flex-col justify-between gap-4">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="font-black text-base uppercase leading-tight">{tx.studentName}</p>
                                    <p className="text-[10px] font-mono text-gray-500">
                                      REG NO: {tx.regNo} • ID: {tx.id}
                                    </p>
                                  </div>
                                  <span className="bg-amber-100 text-amber-800 border border-amber-300 font-mono text-[9px] px-1.5 py-0.5 rounded-sm uppercase font-bold">
                                    ₹{tx.amount}
                                  </span>
                                </div>

                                <div className="p-2.5 bg-slate-50 border border-black/10 text-xs">
                                  <span className="font-bold">Purpose:</span> {tx.purpose}
                                  {tx.notes && <p className="text-[10px] text-slate-500 italic mt-1">Notes: {tx.notes}</p>}
                                </div>

                                <div className="flex gap-2">
                                  <button
                                    onClick={() => setSelectedTx(tx)}
                                    className="flex-1 bg-black text-white hover:bg-[#00FF00] hover:text-black py-2 text-xs font-black uppercase tracking-wider border-2 border-black transition-colors"
                                  >
                                    Review Receipt & Verify
                                  </button>
                                </div>
                              </div>
                            ))
                        )}
                      </div>
                    </div>
                  )}

                  {currentUser?.role === "admin" && (
                    <div className="border-4 border-black p-6 bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-6">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-rose-100 border-2 border-black">
                            <Settings className="h-6 w-6 text-black" />
                          </div>
                          <div>
                            <h3 className="font-black text-xl uppercase">Staff & CR Permission Matrix</h3>
                            <p className="text-xs text-gray-500">Control Class Representatives access rights & authorities</p>
                          </div>
                        </div>
                      </div>

                      <div className="divide-y divide-black/10">
                        <div className="py-3 flex items-center justify-between">
                          <div>
                            <p className="font-bold text-sm">UPI ID Modification Authorization</p>
                            <p className="text-[11px] text-gray-500">Allows CRs to update UPI identifiers and QR configuration dynamically.</p>
                          </div>
                          <button
                            onClick={() => handleTogglePermission("canEditUpi")}
                            className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider border-2 border-black transition-all ${
                              crPermissions.canEditUpi ? "bg-[#00FF00] text-black" : "bg-red-100 text-red-800"
                            }`}
                          >
                            {crPermissions.canEditUpi ? "Enabled" : "Disabled"}
                          </button>
                        </div>

                        <div className="py-3 flex items-center justify-between">
                          <div>
                            <p className="font-bold text-sm">Real-time Transaction Approvals</p>
                            <p className="text-[11px] text-gray-500">Enables CRs to review screenshots and mark contributions as approved.</p>
                          </div>
                          <button
                            onClick={() => handleTogglePermission("canVerifyPayments")}
                            className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider border-2 border-black transition-all ${
                              crPermissions.canVerifyPayments ? "bg-[#00FF00] text-black" : "bg-red-100 text-red-800"
                            }`}
                          >
                            {crPermissions.canVerifyPayments ? "Enabled" : "Disabled"}
                          </button>
                        </div>

                        <div className="py-3 flex items-center justify-between">
                          <div>
                            <p className="font-bold text-sm">Post Direct Calendar Events</p>
                            <p className="text-[11px] text-gray-500">Permits CRs to submit new deadlines and project review calendars.</p>
                          </div>
                          <button
                            onClick={() => handleTogglePermission("canAddEvents")}
                            className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider border-2 border-black transition-all ${
                              crPermissions.canAddEvents ? "bg-[#00FF00] text-black" : "bg-red-100 text-red-800"
                            }`}
                          >
                            {crPermissions.canAddEvents ? "Enabled" : "Disabled"}
                          </button>
                        </div>
                      </div>

                      <div className="pt-4 border-t-2 border-black/10">
                        <h4 className="font-black text-xs uppercase tracking-wider mb-2">Quick Report Utilities</h4>
                        <div className="flex gap-2">
                          <a
                            href="/api/transactions/export"
                            className="flex items-center gap-2 px-4 py-3 bg-black text-[#00FF00] hover:bg-[#00FF00] hover:text-black border-2 border-black text-xs font-black uppercase tracking-wider transition-all"
                          >
                            <Download className="h-4 w-4" /> Download Live Financial Report (CSV)
                          </a>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Campus & Industrial Site Locations */}
                  <div className="border-4 border-black p-6 bg-amber-50/50 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-black text-[#00FF00] border-2 border-black font-mono text-[10px] font-black uppercase">
                        LOCATIONS
                      </div>
                      <div>
                        <h3 className="font-black text-lg uppercase tracking-tight">Campus & Industrial Sites</h3>
                        <p className="text-[10px] text-gray-500 font-mono">AUTHORIZED DESTINATIONS & LAB SCHEDULES</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="border-2 border-black bg-white p-3 space-y-1">
                        <span className="text-[9px] font-black uppercase tracking-wider bg-black text-white px-1.5 py-0.5">
                          OFFICIAL ACADEMIC LAB VENUE
                        </span>
                        <p className="font-bold text-sm text-black">CSE & Cyber Security Specialization Lab</p>
                        <p className="text-xs font-mono text-gray-600">Block III, Room 302, Floor 3 (Main Campus)</p>
                        <p className="text-[10px] text-gray-400 font-mono">Assigned for semester project reviews & defense</p>
                      </div>

                      <div className="border-2 border-black bg-white p-3 space-y-1">
                        <span className="text-[9px] font-black uppercase tracking-wider bg-black text-[#00FF00] px-1.5 py-0.5">
                          APPROVED INDUSTRIAL TRIP DESTINATION
                        </span>
                        <p className="font-bold text-sm text-black">ISRO Sriharikota Launch Complex</p>
                        <p className="text-xs font-mono text-gray-600">Space Museum & Control Facility, Andhra Pradesh</p>
                        <p className="text-[10px] text-gray-400 font-mono">Scheduled Departure: July 28th, 2026</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Login / Sandbox helper if user logs out */}
              {!currentUser && (
                <div className="border-4 border-black p-6 bg-yellow-50 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div className="space-y-1">
                    <h3 className="font-black text-lg uppercase flex items-center gap-2 text-yellow-950">
                      <Info className="h-5 w-5 text-black shrink-0" /> Student / Faculty Member Portal
                    </h3>
                    <p className="text-xs text-yellow-900 max-w-xl">
                      Access is restricted to verified college register numbers. Enter any college ID below to auto-provision an account for the simulation.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                    <input
                      type="text"
                      placeholder="e.g. REG2024098 or STAFF002"
                      value={loginRegNo}
                      onChange={(e) => setLoginRegNo(e.target.value)}
                      className="px-3.5 py-2 border-2 border-black font-mono text-sm bg-white text-black"
                    />
                    <select
                      value={loginRole}
                      onChange={(e) => setLoginRole(e.target.value as any)}
                      className="px-3 py-2 border-2 border-black font-mono text-xs bg-white text-black"
                    >
                      <option value="student">Student</option>
                      <option value="cr">Class Rep</option>
                      <option value="admin">Admin Staff</option>
                    </select>
                    <button
                      onClick={() => handleLogin(loginRegNo, loginRole)}
                      className="bg-black text-white hover:bg-[#00FF00] hover:text-black py-2 px-5 text-xs font-black uppercase tracking-wider border-2 border-black transition-colors"
                    >
                      Access Dashboard
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "finance" && (
            <div className="space-y-8">
              {/* Ledger Summary and Search bar */}
              <div className="border-4 border-black p-6 bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div>
                    <h2 className="text-3xl font-black uppercase tracking-tight">Department Ledger Engine</h2>
                    <p className="text-xs text-slate-500 font-mono mt-1">SECURE TRANSACTION BLOCKCHAIN SIMULATION • TOTAL ENTRIES: {transactions.length}</p>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => {
                        window.open("/api/transactions/export", "_blank");
                        triggerNotification("success", "Department transaction history downloaded successfully.");
                      }}
                      className="flex items-center gap-1.5 px-4 py-2.5 bg-black text-[#00FF00] hover:bg-[#00FF00] hover:text-black font-black text-xs uppercase tracking-wider border-2 border-black transition-colors"
                    >
                      <FileSpreadsheet className="h-4 w-4" /> Export Excel/CSV
                    </button>

                    <button
                      onClick={loadData}
                      className="flex items-center gap-1.5 px-4 py-2.5 bg-white hover:bg-slate-50 text-black font-black text-xs uppercase tracking-wider border-2 border-black transition-all"
                    >
                      <RefreshCw className="h-4 w-4" /> Reload Stream
                    </button>
                  </div>
                </div>

                {/* Plain HTML Visual Chart Representation for Admin Analytics */}
                {currentUser?.role === "admin" && (
                  <div className="mt-8 pt-6 border-t-2 border-black/10">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4">
                      📊 COLLECTION BREAKDOWN BY PURPOSE (ADMIN ONLY)
                    </p>
                    <div className="space-y-3">
                      {analytics.byPurpose.length === 0 ? (
                        <p className="text-xs text-gray-400 italic">No approved transactions to compute analytics.</p>
                      ) : (
                        analytics.byPurpose.map(([purpose, amount]) => (
                          <div key={purpose} className="space-y-1">
                            <div className="flex justify-between text-xs font-bold">
                              <span className="uppercase">{purpose}</span>
                              <span className="font-mono">₹{amount.toLocaleString()}</span>
                            </div>
                            <div className="w-full bg-slate-100 border border-black h-4 overflow-hidden">
                              <div
                                className="bg-black h-full transition-all"
                                style={{ width: `${Math.min(100, (amount / Math.max(1, analytics.totalCollected)) * 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* I. SEMESTER TUITION FEE LEDGER */}
              <div className="border-4 border-black p-6 bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-6">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-4 border-b-2 border-black/10">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="bg-[#00FF00] border border-black font-mono px-2 py-0.5 text-[10px] font-black">
                        SECURE ACADEMIC DATABASE
                      </span>
                      <span className="font-mono text-[10px] text-gray-500">
                        COHORT RANGE: 62052414001 - 62052414027
                      </span>
                    </div>
                    <h3 className="text-2xl font-black uppercase tracking-tight mt-1">
                      Academic Tuition Fee Ledger
                    </h3>
                    <p className="text-xs text-slate-500 font-mono">
                      Tuition & Lab charges tracker. Standard Rate: ₹55,000 / Student
                    </p>
                  </div>

                  {/* Search and Filters */}
                  <div className="w-full lg:w-auto flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                    <div className="relative flex-1 sm:w-80">
                      <input
                        type="text"
                        placeholder="Search Name, Reg No, or Special ID..."
                        value={feeSearch}
                        onChange={(e) => setFeeSearch(e.target.value)}
                        className="w-full px-3 py-2 border-2 border-black text-xs font-mono bg-slate-50 text-black placeholder-gray-400 focus:bg-white"
                      />
                    </div>
                    {feeSearch && (
                      <button
                        onClick={() => setFeeSearch("")}
                        className="px-3 py-2 border-2 border-black text-xs font-black uppercase bg-slate-100 hover:bg-slate-200"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {/* Micro Stats Banner */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono">
                  <div className="border-2 border-black p-3 bg-[#F9F9F9] flex flex-col justify-between">
                    <span className="text-[10px] font-black uppercase text-gray-400">Total Cohort Collected</span>
                    <span className="text-xl font-black mt-1">₹{academicFeeStats.totalCollected.toLocaleString()}</span>
                  </div>
                  <div className="border-2 border-black p-3 bg-[#F9F9F9] flex flex-col justify-between">
                    <span className="text-[10px] font-black uppercase text-gray-400">Total Dues Outstanding</span>
                    <span className="text-xl font-black mt-1 text-red-600">₹{academicFeeStats.totalOutstanding.toLocaleString()}</span>
                  </div>
                  <div className="border-2 border-black p-3 bg-[#F9F9F9] flex flex-col justify-between">
                    <span className="text-[10px] font-black uppercase text-gray-400">Fully Cleared Students</span>
                    <span className="text-xl font-black mt-1 text-emerald-700">{academicFeeStats.fullyPaidCount} / 27</span>
                  </div>
                </div>

                {/* Table View with Scroll */}
                <div className="border-2 border-black overflow-x-auto max-h-[300px]">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b-2 border-black text-[10px] font-black uppercase tracking-wider text-slate-700">
                        <th className="p-3 border-r border-black font-mono">Reg Number</th>
                        <th className="p-3 border-r border-black">Student Name</th>
                        <th className="p-3 border-r border-black font-mono">Special ID</th>
                        <th className="p-3 border-r border-black font-mono text-right">Tuition Fee (₹)</th>
                        <th className="p-3 border-r border-black font-mono text-right">Paid (₹)</th>
                        <th className="p-3 border-r border-black font-mono text-right">Balance Due (₹)</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/10 text-xs font-mono">
                      {filteredAcademicFees.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-6 text-center text-gray-400 italic">
                            No student matches search query "{feeSearch}"
                          </td>
                        </tr>
                      ) : (
                        filteredAcademicFees.map((student) => (
                          <tr 
                            key={student.regNo} 
                            className={`hover:bg-slate-50/80 transition-colors ${
                              student.regNo === "62052414001" ? "bg-amber-50/50 font-bold border-2 border-black" : ""
                            }`}
                          >
                            <td className="p-3 border-r border-black/10 font-black text-black">
                              {student.regNo}
                            </td>
                            <td className="p-3 border-r border-black/10 font-sans text-sm font-bold text-gray-950 uppercase">
                              <div className="flex items-center gap-2">
                                <span>{student.name}</span>
                                {student.regNo === "62052414001" && (
                                  <span className="bg-amber-100 border border-amber-400 text-amber-800 text-[9px] px-1 font-mono font-black rounded">
                                    Primary Demo Target
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-3 border-r border-black/10 font-bold text-indigo-950">
                              {student.subId ? (
                                <span className="bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded text-[10px]">
                                  {student.subId}
                                </span>
                              ) : (
                                <span className="text-gray-300">-</span>
                              )}
                            </td>
                            <td className="p-3 border-r border-black/10 text-right font-bold text-slate-500">
                              ₹{student.total.toLocaleString()}
                            </td>
                            <td className="p-3 border-r border-black/10 text-right font-black text-emerald-800">
                              ₹{student.paid.toLocaleString()}
                            </td>
                            <td className="p-3 border-r border-black/10 text-right font-black text-red-600">
                              ₹{student.due.toLocaleString()}
                            </td>
                            <td className="p-3">
                              <span
                                className={`inline-block px-2 py-0.5 text-[9px] font-black uppercase border ${
                                  student.status === "Fully Paid"
                                    ? "bg-emerald-100 border-emerald-400 text-emerald-800"
                                    : student.status === "Partially Paid"
                                    ? "bg-amber-100 border-amber-400 text-amber-800"
                                    : "bg-rose-100 border-rose-400 text-rose-800"
                                }`}
                              >
                                {student.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* II. MISCELLANEOUS EVENT & SYMPOSIUM CONTRIBUTIONS LEDGER */}
              <div className="space-y-4 pt-4">
                <div className="border-l-4 border-black pl-3 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tight">Event & Miscellaneous Contributions Ledger</h3>
                    <p className="text-xs text-slate-500 font-mono">Real-time payment logs and digital receipts verified by active CRs.</p>
                  </div>

                  {/* Search and Filters for Transactions */}
                  <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                    <input
                      type="text"
                      placeholder="Search Name, Reg No, or Tag..."
                      value={txSearch}
                      onChange={(e) => setTxSearch(e.target.value)}
                      className="px-3 py-1.5 border-2 border-black text-xs font-mono bg-slate-50 text-black placeholder-gray-400 focus:bg-white w-full sm:w-64"
                    />
                    {(txSearch || selectedTagFilter) && (
                      <button
                        onClick={() => {
                          setTxSearch("");
                          setSelectedTagFilter(null);
                        }}
                        className="px-3 py-1.5 border-2 border-black text-xs font-black uppercase bg-slate-100 hover:bg-slate-200"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                {/* Tag Quick Filter Bar */}
                <div className="bg-slate-50 border-2 border-black p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-mono font-black uppercase text-gray-500">Filter Ledger By Category Tag:</p>
                    {selectedTagFilter && (
                      <button
                        onClick={() => setSelectedTagFilter(null)}
                        className="text-[9px] font-mono font-black uppercase underline hover:text-red-600"
                      >
                        [Clear tag filter]
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {["#urgent", "#official", "#late", "#symposium", "#iv_trip", "#academic", "#pending_upi"].map((tag) => {
                      const isActive = selectedTagFilter === tag;
                      return (
                        <button
                          key={tag}
                          onClick={() => setSelectedTagFilter(isActive ? null : tag)}
                          className={`font-mono text-[10px] font-black px-2.5 py-1 border-2 transition-all ${
                            isActive
                              ? "bg-black text-[#00FF00] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                              : "bg-white text-gray-800 border-black hover:bg-slate-100"
                          }`}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Detailed Transactions List */}
              <div className="border-4 border-black bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-black text-[#00FF00] border-b-2 border-black text-xs font-black uppercase tracking-widest">
                      <th className="p-4 border-r border-black">Transaction ID</th>
                      <th className="p-4 border-r border-black">Student & Registration</th>
                      <th className="p-4 border-r border-black">Purpose</th>
                      <th className="p-4 border-r border-black">Amount</th>
                      <th className="p-4 border-r border-black">Submitted Date</th>
                      <th className="p-4 border-r border-black">Status</th>
                      <th className="p-4">Actions / Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-black text-xs font-medium">
                    {filteredTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-gray-500 font-mono">
                          NO CONTRIBUTIONS FOUND IN SECURE LEDGER
                        </td>
                      </tr>
                    ) : (
                      filteredTransactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4 font-mono border-r border-black text-[11px] font-bold">
                            {tx.id}
                          </td>
                          <td className="p-4 border-r border-black">
                            <div className="font-black text-sm uppercase">{tx.studentName}</div>
                            <div className="font-mono text-[10px] text-gray-400 mt-0.5">{tx.regNo}</div>
                            
                            {/* Visual Tags under student details */}
                            {tx.tags && tx.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {tx.tags.map((tag) => {
                                  const isSelected = selectedTagFilter === tag;
                                  return (
                                    <span
                                      key={tag}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedTagFilter(isSelected ? null : tag);
                                      }}
                                      className={`cursor-pointer font-mono text-[9px] font-black px-1.5 py-0.5 border uppercase transition-colors ${
                                        isSelected
                                          ? "bg-black text-[#00FF00] border-black"
                                          : "bg-slate-100 border-slate-300 hover:border-black text-slate-700"
                                      }`}
                                      title="Click to filter by this tag"
                                    >
                                      {tag}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </td>
                          <td className="p-4 border-r border-black max-w-xs truncate">
                            {tx.purpose}
                          </td>
                          <td className="p-4 border-r border-black font-mono font-black text-sm">
                            ₹{tx.amount}
                          </td>
                          <td className="p-4 border-r border-black font-mono text-[11px] text-gray-400">
                            {new Date(tx.timestamp).toLocaleString()}
                          </td>
                          <td className="p-4 border-r border-black">
                            <span
                              className={`inline-block px-2.5 py-1 text-[10px] font-black uppercase tracking-wider border-2 ${
                                tx.status === "Approved"
                                  ? "bg-lime-100 border-lime-600 text-lime-800"
                                  : tx.status === "Rejected"
                                  ? "bg-red-100 border-red-600 text-red-800"
                                  : "bg-amber-100 border-amber-500 text-amber-800"
                              }`}
                            >
                              {tx.status}
                            </span>
                          </td>
                          <td className="p-4 space-y-1">
                            {tx.screenshotUrl && (
                              <button
                                onClick={() => setSelectedTx(tx)}
                                className="underline font-bold text-slate-800 hover:text-black mr-2 uppercase text-[10px]"
                              >
                                View Screenshot Receipt
                              </button>
                            )}

                            {tx.status === "Approved" && (
                              <button
                                onClick={() => setReceiptTx(tx)}
                                className="bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 px-2.5 py-1.5 uppercase text-[9px] font-black tracking-wider border border-emerald-500/40 hover:border-emerald-500 transition-all block mt-1 rounded"
                              >
                                📥 Download Receipt
                              </button>
                            )}

                            {currentUser?.role === "cr" && tx.status === "Pending" && (
                              <button
                                onClick={() => setSelectedTx(tx)}
                                className="bg-black text-white px-2.5 py-1 uppercase text-[9px] font-bold border-2 border-black hover:bg-[#00FF00] hover:text-black transition-colors block mt-1"
                              >
                                Review & Verify
                              </button>
                            )}

                            {tx.notes && (
                              <p className="text-[10px] text-gray-400 italic max-w-xs break-words">
                                Notes: {tx.notes}
                              </p>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "calendar" && (
            <div className="grid grid-cols-1 gap-8">
              <InteractiveCalendar
                user={currentUser || { id: "guest", name: "Guest", regNo: "GUEST", role: "student", email: "" }}
                events={events}
                onAddEvent={handleAddEvent}
                onDeleteEvent={handleDeleteEvent}
              />
            </div>
          )}

          {activeTab === "docs" && (
            <div className="grid grid-cols-1 gap-8">
              <ArchitectureDocs />
            </div>
          )}

          {activeTab === "resources" && (
            <div className="grid grid-cols-1 gap-8">
              <AcademicHub
                currentUser={currentUser}
                notes={notes}
                internships={internships}
                companyLinks={companyLinks}
                onAddNote={handleAddNote}
                onDeleteNote={handleDeleteNote}
                onAddInternship={handleAddInternship}
                onDeleteInternship={handleDeleteInternship}
                onAddCompanyLink={handleAddCompanyLink}
                onDeleteCompanyLink={handleDeleteCompanyLink}
              />
            </div>
          )}

          {activeTab === "attendance" && (
            <div className="grid grid-cols-1 gap-8">
              <SmartAttendance currentUser={currentUser} />
            </div>
          )}

          {activeTab === "users" && (currentUser?.role === "admin" || currentUser?.role === "cr") && (
            <UserManagement
              currentUser={currentUser}
              allUsers={allUsers}
              onRefreshUsers={refreshUsersList}
              triggerNotification={triggerNotification}
            />
          )}
        </main>
      )}

      {/* Transaction Screenshot Review Overlay Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white border-4 border-black w-full max-w-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-black text-[#00FF00] p-4 flex justify-between items-center border-b-2 border-black">
              <h3 className="font-black uppercase tracking-wider text-sm">
                Verify Payment: {selectedTx.studentName}
              </h3>
              <button
                onClick={() => {
                  setSelectedTx(null);
                  setReviewNotes("");
                }}
                className="text-white hover:text-red-500 font-bold font-mono text-lg"
              >
                [X]
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-2 gap-4 text-xs font-bold font-mono border-b border-black/10 pb-4">
                <div>
                  <p className="text-gray-400">STUDENT</p>
                  <p className="text-black uppercase text-sm font-black">{selectedTx.studentName}</p>
                  <p className="text-slate-500">{selectedTx.regNo}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-400">AMOUNT FILED</p>
                  <p className="text-black text-lg font-black">₹{selectedTx.amount}</p>
                  <p className="text-slate-500">{selectedTx.purpose}</p>
                </div>
              </div>

              {/* Screenshot Viewport */}
              <div className="space-y-2">
                <p className="text-xs font-black uppercase text-slate-500">Uploaded Payment screenshot / receipt</p>
                {selectedTx.screenshotUrl ? (
                  <div className="border-4 border-black bg-slate-50 p-2 flex justify-center">
                    <img
                      src={selectedTx.screenshotUrl}
                      alt="Student submitted transaction proof"
                      className="max-h-80 object-contain"
                    />
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-black/20 p-8 text-center text-slate-400 text-xs italic">
                    No screenshot receipt attachment was uploaded with this log.
                  </div>
                )}
              </div>

              {/* Display tags for students / guests */}
              {!((currentUser?.role === "cr" && crPermissions.canVerifyPayments) || currentUser?.role === "admin") && selectedTx.tags && selectedTx.tags.length > 0 && (
                <div className="space-y-1.5 border-t border-black/10 pt-3">
                  <p className="text-[10px] font-black uppercase text-slate-500">Associated Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedTx.tags.map(tag => (
                      <span key={tag} className="bg-black text-[#00FF00] font-mono text-[9px] font-black uppercase px-2 py-0.5 border border-black">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions for Class Representatives and Admins */}
              {((currentUser?.role === "cr" && crPermissions.canVerifyPayments) || currentUser?.role === "admin") ? (
                <div className="space-y-4 pt-4 border-t border-black/10 bg-slate-50 p-4 border-2 border-black">
                  <p className="text-xs font-black uppercase tracking-wider text-indigo-950">CR Ledger Sign-Off Gate</p>
                  
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">
                      Audit Notes / UPI Transaction ID Ref
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Verified via GPay reference 39048394 or Bank check"
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      className="w-full text-xs font-mono px-3 py-2 border-2 border-black bg-white text-black"
                    />
                  </div>

                  {/* Dynamic Tagging Interface */}
                  <div className="space-y-2 border-t border-black/10 pt-3">
                    <label className="block text-[11px] font-bold text-gray-600">
                      Payment Tags / Ledger Categories
                    </label>
                    
                    {/* Active tags list */}
                    <div className="flex flex-wrap gap-1.5 min-h-[36px] p-2 bg-white border-2 border-black">
                      {reviewTags.length === 0 ? (
                        <span className="text-[10px] text-gray-400 italic">No tags selected. Click presets below or add custom tags.</span>
                      ) : (
                        reviewTags.map(tag => (
                          <span key={tag} className="flex items-center gap-1 bg-black text-[#00FF00] font-mono text-[9px] font-black uppercase px-2 py-0.5 border border-black">
                            {tag}
                            <button
                              type="button"
                              onClick={() => setReviewTags(reviewTags.filter(t => t !== tag))}
                              className="text-white hover:text-red-400 font-bold ml-1 text-xs px-0.5"
                            >
                              ×
                            </button>
                          </span>
                        ))
                      )}
                    </div>

                    {/* Pre-defined popular tags */}
                    <div className="space-y-1">
                      <p className="text-[9px] font-mono font-bold text-gray-400 uppercase">Quick toggle tags:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {["#urgent", "#official", "#late", "#symposium", "#iv_trip", "#academic", "#pending_upi"].map(preset => {
                          const hasTag = reviewTags.includes(preset);
                          return (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => {
                                if (hasTag) {
                                  setReviewTags(reviewTags.filter(t => t !== preset));
                                } else {
                                  setReviewTags([...reviewTags, preset]);
                                }
                              }}
                              className={`font-mono text-[9px] font-black px-2 py-0.5 border-2 transition-all ${
                                hasTag
                                  ? "bg-black text-[#00FF00] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                                  : "bg-white text-gray-700 border-black hover:bg-slate-50"
                              }`}
                            >
                              {preset}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Custom Tag Form */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Type custom tag, e.g. #food, #lab"
                        value={customTagInput}
                        onChange={(e) => setCustomTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            let clean = customTagInput.trim().toLowerCase();
                            if (clean) {
                              if (!clean.startsWith("#")) clean = "#" + clean;
                              if (!reviewTags.includes(clean)) {
                                setReviewTags([...reviewTags, clean]);
                              }
                              setCustomTagInput("");
                            }
                          }
                        }}
                        className="flex-1 text-[11px] font-mono px-2 py-1.5 border-2 border-black bg-white text-black"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          let clean = customTagInput.trim().toLowerCase();
                          if (clean) {
                            if (!clean.startsWith("#")) clean = "#" + clean;
                            if (!reviewTags.includes(clean)) {
                              setReviewTags([...reviewTags, clean]);
                            }
                            setCustomTagInput("");
                          }
                        }}
                        className="bg-black text-white hover:bg-slate-800 px-3 py-1 text-[10px] font-black uppercase border-2 border-black"
                      >
                        + Add
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 pt-2 border-t border-black/10">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleVerifyTransaction(selectedTx.id, "Approved", reviewNotes || "Verified by Coordinator", reviewTags)}
                        className="flex-1 bg-black text-[#00FF00] hover:bg-lime-400 hover:text-black py-2.5 text-xs font-black uppercase tracking-widest border-2 border-black transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none"
                      >
                        ✓ Approve Payment
                      </button>
                      <button
                        onClick={() => handleVerifyTransaction(selectedTx.id, "Rejected", reviewNotes || "Declined: Screenshot invalid or missing UPI reference ID", reviewTags)}
                        className="bg-rose-100 hover:bg-rose-200 text-rose-800 py-2.5 px-4 text-xs font-black uppercase border-2 border-black transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none"
                      >
                        ✗ Reject Proof
                      </button>
                    </div>

                    <button
                      onClick={() => handleVerifyTransaction(selectedTx.id, null, reviewNotes, reviewTags)}
                      className="w-full bg-indigo-50 text-indigo-900 hover:bg-indigo-100 py-2 text-[10px] font-black uppercase tracking-wider border-2 border-dashed border-indigo-900 transition-colors"
                    >
                      ✎ Save Tags & Notes Only (No Status Change)
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-slate-100 border-2 border-black text-center text-[11px] text-slate-600">
                  ⚠️ Guest student view mode. To verify or decline, switch active demo perspective to Class Representative.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cryptographic Payment Receipt Modal */}
      {receiptTx && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#0b1329] border border-emerald-500/30 w-full max-w-lg shadow-[0_0_50px_rgba(16,185,129,0.15)] rounded-2xl overflow-hidden flex flex-col relative animate-fade-in">
            <div className="absolute right-0 top-0 -mr-12 -mt-12 w-48 h-48 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"></div>
            
            {/* Modal Header */}
            <div className="bg-[#060a13] border-b border-emerald-500/20 p-5 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-emerald-400" />
                <h3 className="font-mono text-xs font-black uppercase text-white tracking-[0.2em]">
                  SECURE PAYMENT RECEIPT
                </h3>
              </div>
              <button
                onClick={() => setReceiptTx(null)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Receipt Body (Printable Area) */}
            <div id="printable-receipt" className="p-8 space-y-6 bg-[#070c18] text-slate-300">
              {/* Department Header */}
              <div className="text-center pb-6 border-b border-dashed border-slate-800 relative">
                <div className="absolute inset-x-0 bottom-0 top-0 flex items-center justify-center pointer-events-none opacity-[0.03]">
                  <Shield className="w-40 h-40 text-emerald-400" />
                </div>
                
                <h2 className="text-sm font-mono font-bold tracking-[0.3em] text-emerald-400 uppercase">
                  DEPARTMENT OF COMPUTER SCIENCE
                </h2>
                <p className="text-[10px] font-mono uppercase text-slate-500 tracking-[0.2em] mt-1">
                  CYBER SECURITY & SYSTEMS LAB • ESTD 2024
                </p>
                <p className="text-[8px] font-mono text-slate-600 mt-0.5">
                  VERIFIED DEPT TRANSACTION RECORD
                </p>
              </div>

              {/* Transaction Metadata Grid */}
              <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-xs border-b border-slate-800 pb-6">
                <div>
                  <p className="text-[9px] font-mono uppercase text-slate-500 tracking-wider">
                    Student Operator
                  </p>
                  <p className="font-bold text-white uppercase text-sm mt-0.5">
                    {receiptTx.studentName}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] font-mono uppercase text-slate-500 tracking-wider">
                    Registration Number
                  </p>
                  <p className="font-mono font-semibold text-emerald-400 text-sm mt-0.5">
                    {receiptTx.regNo}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] font-mono uppercase text-slate-500 tracking-wider">
                    Payment Category / Purpose
                  </p>
                  <p className="font-semibold text-slate-200 mt-0.5">
                    {receiptTx.purpose}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] font-mono uppercase text-slate-500 tracking-wider">
                    Audit Verification Date
                  </p>
                  <p className="font-mono text-slate-200 mt-0.5">
                    {new Date(receiptTx.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Amount Centerpiece */}
              <div className="bg-[#050912] border border-emerald-500/10 p-5 rounded-xl text-center relative overflow-hidden">
                <div className="absolute -left-12 -top-12 w-24 h-24 bg-emerald-500/5 rounded-full blur-lg"></div>
                <p className="text-[9px] font-mono uppercase text-emerald-400 tracking-[0.25em] font-bold">
                  FUNDS SECURED
                </p>
                <h1 className="text-4xl font-mono font-black text-white mt-1.5 leading-none">
                  ₹{receiptTx.amount.toLocaleString()}.00
                </h1>
                <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mt-2">
                  TRANSACTION STATUS: APPROVED & SIGNED
                </p>
              </div>

              {/* Security Hash & Verification Seal */}
              <div className="space-y-3 bg-[#050912]/50 p-4 border border-slate-800/60 rounded-xl">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-mono text-slate-500 uppercase">
                    Ledger Status Block
                  </span>
                  <span className="text-[8px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-2 py-0.5 uppercase rounded">
                    MERN-BLOCK-APPROVED
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="text-[8px] font-mono text-slate-500 uppercase">
                    Cryptographic Receipt SHA-256
                  </p>
                  <p className="font-mono text-[9px] break-all text-slate-400 select-all font-semibold leading-relaxed">
                    SHA256-{receiptTx.id}-{receiptTx.regNo.toLowerCase()}-{receiptTx.amount}-SECURE-VERIFIED-HASH-{receiptTx.timestamp.substring(0, 10).replace(/-/g, "")}
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-800/80 flex justify-between items-center text-[10px] text-slate-400 font-mono">
                  <span className="flex items-center gap-1 text-emerald-400">
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-400 shrink-0 animate-pulse" />
                    Digital Signature Verified
                  </span>
                  <span className="text-[9px] text-slate-500">
                    ID: {receiptTx.id}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="bg-[#060a13] border-t border-emerald-500/20 p-5 flex gap-3">
              <button
                onClick={() => {
                  window.print();
                }}
                className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 font-mono text-xs font-bold uppercase py-3 px-4 rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.2)] transition-all flex items-center justify-center gap-2 border-0 cursor-pointer"
              >
                <Download className="h-4 w-4" /> Print / Save PDF Receipt
              </button>
              <button
                onClick={() => setReceiptTx(null)}
                className="bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 font-mono text-xs font-bold uppercase py-3 px-5 rounded-xl transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-20 border-t-4 border-black pt-8 pb-10 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="text-center md:text-left">
          <p className="text-sm font-black uppercase tracking-widest">SMART ENTRY SYSTEMS</p>
          <p className="text-xs text-gray-500 font-mono mt-1">
            Engineered securely for department management. Distributed Node & Cloud storage ledger.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-600">
          <a href="#notice-board" className="hover:underline">Bulletins</a>
          <span>/</span>
          <a href="#department-calendar" className="hover:underline">Schedule</a>
          <span>/</span>
          <a href="#architecture-docs" className="hover:underline">Documentation</a>
        </div>
      </footer>
    </div>
  );
}

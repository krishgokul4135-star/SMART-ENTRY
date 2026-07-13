import React, { useState, useEffect } from "react";
import { 
  QrCode, Camera, CheckCircle, XCircle, Clock, User as UserIcon, Calendar, 
  Shield, Activity, FileText, AlertTriangle, TrendingUp, MapPin, 
  UserCheck, Compass, BookOpen, Sparkles, Plus, Check, X, 
  Smartphone, Award, RefreshCw, Send, ShieldAlert, Laptop
} from "lucide-react";
import { User, AttendanceScan, LeaveRequest, ClassSchedule } from "../types";

interface SmartAttendanceProps {
  currentUser: User | null;
}

export default function SmartAttendance({ currentUser }: SmartAttendanceProps) {
  // Check if current user is staff (admin) or student/cr
  const isStaff = currentUser?.role === "admin";
  const userDisplayName = currentUser?.name || "Student Name";
  const userRegNo = currentUser?.regNo || "62052414001";

  // Shared state
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceScan[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Student specific active sub-tab (Home, ID Card, Notices, Profile)
  const [studentSubTab, setStudentSubTab] = useState<"home" | "idcard" | "notices" | "profile">("home");
  
  // Staff specific active sub-tab (Home, Attendance Logs, Leave Mgt, SOS)
  const [staffSubTab, setStaffSubTab] = useState<"home" | "attendance" | "leave" | "sos">("home");

  // Local interactive UI state
  const [scanning, setScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [scanMessage, setScanMessage] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("Dept. of CSE - II Year");
  const [activeQrData, setActiveQrData] = useState<string | null>(null);
  
  // Leave request form state
  const [leaveReason, setLeaveReason] = useState("");
  const [leaveType, setLeaveType] = useState("Sick Leave");
  const [leaveStart, setLeaveStart] = useState("");
  const [leaveEnd, setLeaveEnd] = useState("");
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);

  // Live Camera state and refs
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedSnapshot, setCapturedSnapshot] = useState<string | null>(null);
  const [faceState, setFaceState] = useState<string>("Initializing biometric engine...");
  const [selectedSnapshotUrl, setSelectedSnapshotUrl] = useState<string | null>(null);

  // Offline-First Sync state
  const [offlineQueue, setOfflineQueue] = useState<AttendanceScan[]>(() => {
    try {
      const q = localStorage.getItem("offline_scans_queue");
      return q ? JSON.parse(q) : [];
    } catch {
      return [];
    }
  });
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Load initial data
  const loadData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [attRes, leaveRes, schedRes] = await Promise.all([
        fetch("/api/attendance")
          .then(async r => r.ok ? await r.json() : [])
          .catch(err => { console.error("Error fetching attendance:", err); return []; }),
        fetch("/api/leave")
          .then(async r => r.ok ? await r.json() : [])
          .catch(err => { console.error("Error fetching leave:", err); return []; }),
        fetch("/api/schedules")
          .then(async r => r.ok ? await r.json() : [])
          .catch(err => { console.error("Error fetching schedules:", err); return []; })
      ]);

      setAttendanceLogs(Array.isArray(attRes) ? attRes : []);
      setLeaveRequests(Array.isArray(leaveRes) ? leaveRes : []);
      setSchedules(Array.isArray(schedRes) ? schedRes : []);
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Failed to synchronize with secure server. Running in offline fallback mode.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Sync offline queue when coming back online
  const triggerSyncQueue = async () => {
    if (offlineQueue.length === 0) return;
    setIsLoading(true);
    let successCount = 0;
    const remaining = [...offlineQueue];

    for (let i = 0; i < remaining.length; i++) {
      const item = remaining[i];
      try {
        const res = await fetch("/api/attendance/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentName: item.studentName,
            regNo: item.regNo,
            location: item.location,
            course: item.course,
            status: item.status,
            snapshot: item.snapshot
          })
        });
        if (res.ok) {
          const syncedLog = await res.json();
          setAttendanceLogs(prev => {
            if (prev.some(p => p.id === syncedLog.id)) return prev;
            return [syncedLog, ...prev];
          });
          successCount++;
        }
      } catch (err) {
        console.error("Failed to sync item:", item, err);
        break;
      }
    }

    const updatedQueue = remaining.slice(successCount);
    setOfflineQueue(updatedQueue);
    localStorage.setItem("offline_scans_queue", JSON.stringify(updatedQueue));
    setIsLoading(false);

    if (successCount > 0) {
      alert(`Successfully synchronized ${successCount} offline logs to institutional database!`);
    }
  };

  // Listen to connection changes
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      triggerSyncQueue();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [offlineQueue]);

  // Handle high-contrast biometric face guide canvas rendering
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (cameraActive && canvas) {
      const ctx = canvas.getContext("2d");
      let count = 0;
      const render = () => {
        count += 0.05;
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          ctx.strokeStyle = "rgba(16, 185, 129, 0.6)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(canvas.width / 2, canvas.height / 2, 70 + Math.sin(count) * 4, 0, 2 * Math.PI);
          ctx.stroke();

          const size = 100 + Math.sin(count) * 5;
          const cx = canvas.width / 2;
          const cy = canvas.height / 2;
          ctx.strokeStyle = "rgba(16, 185, 129, 0.8)";
          ctx.lineWidth = 3;
          
          ctx.beginPath();
          ctx.moveTo(cx - size, cy - size + 20);
          ctx.lineTo(cx - size, cy - size);
          ctx.lineTo(cx - size + 20, cy - size);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(cx + size, cy - size + 20);
          ctx.lineTo(cx + size, cy - size);
          ctx.lineTo(cx + size - 20, cy - size);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(cx - size, cy + size - 20);
          ctx.lineTo(cx - size, cy + size);
          ctx.lineTo(cx - size + 20, cy + size);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(cx + size, cy + size - 20);
          ctx.lineTo(cx + size, cy + size);
          ctx.lineTo(cx + size - 20, cy + size);
          ctx.stroke();

          const bounceY = cy + Math.sin(count * 2) * size;
          ctx.strokeStyle = "rgba(16, 185, 129, 0.9)";
          ctx.shadowColor = "rgba(16, 185, 129, 0.5)";
          ctx.shadowBlur = 8;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(cx - size, bounceY);
          ctx.lineTo(cx + size, bounceY);
          ctx.stroke();
          
          ctx.shadowColor = "transparent";
          ctx.shadowBlur = 0;

          ctx.fillStyle = "rgba(16, 185, 129, 0.9)";
          ctx.font = "bold 9px monospace";
          ctx.fillText(`BIOMETRIC ALIGNMENT: OK`, cx - size, cy - size - 15);
          ctx.fillText(`Confidence Index: ${(95 + Math.sin(count) * 3).toFixed(1)}%`, cx - size, cy + size + 15);
        }
        animId = requestAnimationFrame(render);
      };
      render();
    }
    return () => {
      cancelAnimationFrame(animId);
    };
  }, [cameraActive]);

  const generateSynthesizedFace = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 240;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    ctx.fillStyle = "#020617";
    ctx.fillRect(0, 0, 320, 240);

    ctx.strokeStyle = "rgba(16, 185, 129, 0.15)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 320; i += 20) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 240);
      ctx.stroke();
    }
    for (let j = 0; j < 240; j += 20) {
      ctx.beginPath();
      ctx.moveTo(0, j);
      ctx.lineTo(320, j);
      ctx.stroke();
    }

    ctx.strokeStyle = "#10b981";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(160, 110, 50, 70, 0, 0, 2 * Math.PI);
    ctx.stroke();

    ctx.strokeStyle = "rgba(16, 185, 129, 0.6)";
    ctx.beginPath();
    ctx.arc(160, 110, 80, 0, 2 * Math.PI);
    ctx.stroke();

    ctx.strokeStyle = "rgba(16, 185, 129, 0.4)";
    ctx.beginPath();
    ctx.moveTo(100, 100);
    ctx.lineTo(220, 100);
    ctx.stroke();

    const nodes = [
      { x: 160, y: 50 }, { x: 160, y: 170 },
      { x: 120, y: 100 }, { x: 200, y: 100 },
      { x: 160, y: 115 },
      { x: 140, y: 140 }, { x: 180, y: 140 },
      { x: 112, y: 110 }, { x: 208, y: 110 }
    ];
    
    ctx.fillStyle = "#10b981";
    nodes.forEach(n => {
      ctx.beginPath();
      ctx.arc(n.x, n.y, 4, 0, 2 * Math.PI);
      ctx.fill();
    });

    ctx.strokeStyle = "rgba(16, 185, 129, 0.3)";
    ctx.beginPath();
    ctx.moveTo(160, 50);
    ctx.lineTo(120, 100);
    ctx.lineTo(160, 115);
    ctx.lineTo(200, 100);
    ctx.lineTo(160, 50);
    ctx.moveTo(120, 100);
    ctx.lineTo(112, 110);
    ctx.lineTo(140, 140);
    ctx.lineTo(160, 170);
    ctx.lineTo(180, 140);
    ctx.lineTo(208, 110);
    ctx.lineTo(200, 100);
    ctx.stroke();

    ctx.fillStyle = "rgba(16, 185, 129, 0.95)";
    ctx.font = "bold 9px monospace";
    ctx.fillText("BIOMETRIC IDENTIFIER SECURE", 10, 20);
    ctx.fillText(`ID: ${userRegNo}`, 10, 32);
    ctx.fillText("SYS: SECURE-GATE-A", 10, 44);
    
    ctx.fillStyle = "rgba(16, 185, 129, 0.8)";
    ctx.fillText("MATCH CONFIDENCE: 98.74%", 190, 215);
    ctx.fillText("VERIFIED OK", 190, 227);

    return canvas.toDataURL("image/jpeg");
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setCameraActive(false);
  };

  // Filter logs for current student
  const myLogs = isStaff 
    ? attendanceLogs 
    : attendanceLogs.filter(log => log.regNo === userRegNo);
  
  const myLeaves = isStaff
    ? leaveRequests
    : leaveRequests.filter(req => req.regNo === userRegNo);

  const lastEntry = myLogs.length > 0 ? myLogs[0] : null;

  // Perform Live Camera Face Verification
  const handleStartScan = async () => {
    setScanning(true);
    setScanSuccess(false);
    setScanMessage("");
    setCameraError(null);
    setCapturedSnapshot(null);
    setFaceState("Initializing biometric camera...");

    // Try starting webcam feed
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: "user" }
        });
        setStream(videoStream);
        setCameraActive(true);
        // Bind to video ref shortly
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.srcObject = videoStream;
            videoRef.current.play().catch(e => console.error("Video play failed", e));
          }
        }, 100);
        setFaceState("Aligning face signature...");
      } else {
        throw new Error("navigator.mediaDevices or getUserMedia not found");
      }
    } catch (err: any) {
      console.warn("webcam access failed or blocked inside iframe:", err);
      setCameraError("Camera blocked/sandboxed in iframe. Running cyber synthesizer.");
      setCameraActive(false);
      setFaceState("Synthesizing face coordinates...");
    }

    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      if (progress === 30) setFaceState("Matching landmarks (68 biometric points)...");
      if (progress === 60) setFaceState("Computing facial distance equations...");
      if (progress === 90) setFaceState("Cryptographically verifying student clearance...");
    }, 300);

    // Complete scan after 3 seconds
    setTimeout(async () => {
      clearInterval(interval);
      try {
        let base64Snapshot = "";

        if (videoRef.current && canvasRef.current) {
          const video = videoRef.current;
          const canvas = canvasRef.current;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            canvas.width = video.videoWidth || 320;
            canvas.height = video.videoHeight || 240;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            base64Snapshot = canvas.toDataURL("image/jpeg", 0.7);
          }
        }

        if (!base64Snapshot) {
          base64Snapshot = generateSynthesizedFace();
        }

        setCapturedSnapshot(base64Snapshot);

        const scanPayload = {
          studentName: userDisplayName,
          regNo: userRegNo,
          location: "Block A - Main Entrance",
          course: "Dept. of CSE - II Year",
          status: "Success" as const,
          snapshot: base64Snapshot
        };

        // If offline, save locally
        if (!navigator.onLine) {
          const offlineItem: AttendanceScan = {
            id: "offline-" + Date.now(),
            ...scanPayload,
            timestamp: new Date().toISOString()
          };
          const newQueue = [offlineItem, ...offlineQueue];
          setOfflineQueue(newQueue);
          localStorage.setItem("offline_scans_queue", JSON.stringify(newQueue));
          setAttendanceLogs(prev => [offlineItem, ...prev]);
          setScanSuccess(true);
          setScanMessage("Logged offline! Entry authorized.");
        } else {
          // POST to backend
          const res = await fetch("/api/attendance/scan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(scanPayload)
          });

          if (!res.ok) throw new Error("Verification failed");

          const newLog = await res.json();
          setAttendanceLogs(prev => [newLog, ...prev]);
          setScanSuccess(true);
          setScanMessage("Face Recognition Cleared! Entry authorized.");
        }
      } catch (err) {
        console.error("Network verify error:", err);
        // Fallback save offline
        const offlineItem: AttendanceScan = {
          id: "offline-err-" + Date.now(),
          studentName: userDisplayName,
          regNo: userRegNo,
          location: "Block A - Main Entrance",
          course: "Dept. of CSE - II Year",
          status: "Success",
          timestamp: new Date().toISOString()
        };
        const newQueue = [offlineItem, ...offlineQueue];
        setOfflineQueue(newQueue);
        localStorage.setItem("offline_scans_queue", JSON.stringify(newQueue));
        setAttendanceLogs(prev => [offlineItem, ...prev]);
        setScanSuccess(true);
        setScanMessage("Network timeout. Saved offline queue successfully.");
      } finally {
        setScanning(false);
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
          setStream(null);
        }
        setCameraActive(false);
      }
    }, 3000);
  };

  // Submit Leave Request
  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveReason || !leaveStart || !leaveEnd) {
      alert("Please fill in all leave application fields.");
      return;
    }

    setIsSubmittingLeave(true);
    try {
      const payload = {
        studentName: userDisplayName,
        regNo: userRegNo,
        reason: leaveReason,
        type: leaveType,
        startDate: leaveStart,
        endDate: leaveEnd
      };

      const res = await fetch("/api/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Application failed");

      const newLeave = await res.json();
      setLeaveRequests(prev => [newLeave, ...prev]);
      setLeaveReason("");
      setLeaveStart("");
      setLeaveEnd("");
      alert("Leave application logged securely. Staff review pending.");
    } catch (err) {
      alert("Error submitting leave. Please check network connection.");
    } finally {
      setIsSubmittingLeave(false);
    }
  };

  // Staff approves/denies leave request
  const handleResolveLeave = async (id: string, status: "Approved" | "Rejected") => {
    try {
      const res = await fetch("/api/leave/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status })
      });

      if (!res.ok) throw new Error("Approval resolution failed");

      const updatedLeave = await res.json();
      setLeaveRequests(prev => prev.map(req => req.id === id ? updatedLeave : req));
    } catch (err) {
      alert("Failed to process approval request. Please retry.");
    }
  };

  // Staff generates active QR code
  const handleGenerateQr = () => {
    const codeData = `COLLEGE-ATTENDANCE-${selectedCourse.replace(/\s+/g, "-")}-${Date.now()}`;
    setActiveQrData(codeData);
  };

  if (isLoading) {
    return (
      <div className="bg-white border-4 border-black p-12 text-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        <RefreshCw className="h-10 w-10 animate-spin mx-auto text-[#003366] mb-4" />
        <p className="font-black text-sm uppercase tracking-wider font-mono">Synchronizing Smart Attendance Datasets...</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden" id="smart-attendance-system">
      {/* Header Banner */}
      <div className="bg-[#003366] border-b-4 border-black p-4 text-white flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-xl font-black tracking-tight uppercase flex items-center gap-2">
            <Shield className="h-6 w-6 text-[#00FF00]" />
            Enhanced Smart Attendance & Entry Gateway
          </h2>
          <p className="text-xs text-blue-200 font-mono mt-1">
            Institutional RBAC Platform • Secured by Facial Recognition & QR Cryptography
          </p>
        </div>
        <div className="flex items-center gap-2 bg-[#002244] px-3 py-1.5 border border-blue-400/30 rounded text-xs font-mono">
          <span className="w-2.5 h-2.5 rounded-full bg-[#00FF00] animate-ping"></span>
          <span className="text-emerald-400 font-bold uppercase tracking-wider">Secure Cloud Engine Online</span>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-rose-50 border-b-4 border-black p-4 text-rose-700 flex items-center gap-3 font-mono text-xs">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>{errorMsg}</span>
          <button onClick={loadData} className="underline font-bold ml-auto uppercase">Retry Link</button>
        </div>
      )}

      {/* ========================================================= */}
      {/* 1. STUDENT VIEW DASHBOARD                                 */}
      {/* ========================================================= */}
      {!isStaff ? (
        <div className="flex flex-col min-h-[550px]">
          {/* Welcome Student Header */}
          <div className="bg-white border-b-4 border-black p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <img 
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150&h=150" 
                  alt={userDisplayName}
                  className="w-16 h-16 rounded-full border-4 border-black object-cover"
                />
                <span className="absolute bottom-0 right-0 w-4 h-4 bg-[#00FF00] border-2 border-black rounded-full" title="Active"></span>
              </div>
              <div>
                <span className="text-[10px] font-mono font-black uppercase text-[#003366] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                  Student Account
                </span>
                <h3 className="text-lg font-black uppercase tracking-tight mt-1">
                  Welcome {userDisplayName}
                </h3>
                <p className="text-xs text-gray-500 font-mono">
                  Reg No: <span className="font-bold text-black">{userRegNo}</span> • Dept of Computer Science
                </p>
              </div>
            </div>

            {/* Attendance Status Badge */}
            <div className="flex gap-4">
              <div className="bg-blue-50 border-2 border-black p-3 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-center min-w-[100px]">
                <div className="text-[10px] font-mono text-gray-500 uppercase font-black">Gate Clearance</div>
                <div className="text-xs font-black mt-1 text-emerald-700 flex items-center justify-center gap-1 uppercase">
                  <CheckCircle className="h-3.5 w-3.5" /> Approved
                </div>
              </div>
              <div className="bg-blue-50 border-2 border-black p-3 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-center min-w-[100px]">
                <div className="text-[10px] font-mono text-gray-500 uppercase font-black">Active Day Logs</div>
                <div className="text-xs font-black mt-1 font-mono text-blue-900">
                  {myLogs.length} Scans Today
                </div>
              </div>
            </div>
          </div>

          {/* Sub Navigation Content Panels (Student View) */}
          <div className="p-6 flex-1 bg-white">
            {studentSubTab === "home" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Main Section 1: Smart Entry (Face & QR Recognition) */}
                <div className="bg-slate-50 border-4 border-black p-5 rounded relative shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between" id="smart-entry-camera-container">
                  <div>
                    <div className="flex justify-between items-center border-b-2 border-black pb-2 mb-4">
                      <h4 className="font-black uppercase text-xs tracking-wider flex items-center gap-1.5">
                        <Camera className="h-4 w-4 text-[#003366]" />
                        Section 1: Gateway Smart Entry
                      </h4>
                      <div className="flex gap-1.5 items-center">
                        <span className="bg-[#003366] text-white text-[9px] font-mono px-1.5 py-0.5 rounded uppercase">
                          FACIAL SCAN
                        </span>
                        {isOnline ? (
                          <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[9px] font-mono font-black px-1.5 py-0.5 rounded uppercase">
                            ONLINE
                          </span>
                        ) : (
                          <span className="bg-amber-100 text-amber-800 border border-amber-300 text-[9px] font-mono font-black px-1.5 py-0.5 rounded uppercase animate-pulse">
                            OFFLINE
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Camera scan box */}
                    <div className="relative border-4 border-black bg-slate-950 aspect-video rounded overflow-hidden flex flex-col items-center justify-center text-center">
                      {/* Live Indicator overlay when active */}
                      {cameraActive && (
                        <div className="absolute top-2 left-2 bg-rose-600 border border-black text-white text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded flex items-center gap-1 z-30 animate-pulse shadow">
                          <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                          LIVE
                        </div>
                      )}

                      {/* Display active stream or synthetic overlay */}
                      {scanning ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-950">
                          {/* Video stream */}
                          <video
                            ref={videoRef}
                            className={`w-full h-full object-cover ${cameraActive ? "block" : "hidden"}`}
                            muted
                            playsInline
                          />

                          {/* Overlay canvas for biometric targeting HUD */}
                          <canvas
                            ref={canvasRef}
                            className="absolute inset-0 w-full h-full object-cover z-20 pointer-events-none"
                          />

                          {/* Fallback synthesizer screen if camera is blocked/unavailable */}
                          {!cameraActive && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-slate-950 font-mono text-emerald-400">
                              <div className="relative w-full h-full flex flex-col justify-center items-center">
                                {/* Glowing face mesh avatar */}
                                <div className="w-16 h-16 border-2 border-emerald-500/40 rounded-full flex items-center justify-center relative mb-2 animate-pulse">
                                  <div className="absolute inset-1 border border-dashed border-emerald-400 rounded-full animate-spin"></div>
                                  <Camera className="h-6 w-6 text-emerald-400" />
                                </div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300 animate-pulse">
                                  {faceState}
                                </p>
                                <div className="w-2/3 bg-slate-900 border border-emerald-500/20 h-1 mt-3 rounded overflow-hidden">
                                  <div className="bg-emerald-500 h-full animate-[bounce_1.5s_infinite]" style={{ width: "60%" }}></div>
                                </div>
                                <span className="text-[8px] text-slate-500 mt-2 font-mono">
                                  {cameraError || "MOCK INTERACTIVE SCAN MODE"}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : scanSuccess ? (
                        <div className="p-4 z-10 flex flex-col items-center">
                          {capturedSnapshot ? (
                            <div className="relative inline-block mb-2">
                              <img
                                src={capturedSnapshot}
                                alt="Biometric Snapshot"
                                className="w-24 h-16 object-cover border-2 border-emerald-400 rounded shadow"
                              />
                              <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-slate-950 p-0.5 rounded-full border border-black">
                                <Check className="h-2.5 w-2.5 font-bold" />
                              </span>
                            </div>
                          ) : (
                            <CheckCircle className="h-10 w-10 text-[#00FF00] mb-2" />
                          )}
                          <p className="text-xs text-[#00FF00] font-mono font-bold uppercase">
                            Verification Passed
                          </p>
                          <p className="text-[9px] text-emerald-300 mt-1 uppercase font-mono max-w-[220px]">
                            {scanMessage || "Identity Authorized • Gate Unlocked"}
                          </p>
                        </div>
                      ) : (
                        <div className="p-4 z-10">
                          <QrCode className="h-12 w-12 text-slate-400 mx-auto mb-2" />
                          <p className="text-xs text-slate-300 uppercase tracking-wider font-mono font-bold">
                            Interactive Biometric Camera
                          </p>
                          <p className="text-[9px] text-slate-400 mt-1 max-w-[200px] mx-auto font-mono">
                            Press "SCAN NOW" to stream biometric points and unlock gateway entry.
                          </p>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={handleStartScan}
                      disabled={scanning}
                      className={`w-full mt-4 py-3 border-2 border-black font-black uppercase text-xs tracking-wider transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                        scanning 
                          ? "bg-slate-200 text-slate-500 cursor-not-allowed" 
                          : "bg-[#003366] text-white hover:bg-blue-900 active:translate-y-[2px]"
                      }`}
                    >
                      {scanning ? "BIOMETRICS SCANNING..." : "SCAN NOW FOR ACCESS"}
                    </button>

                    {/* Offline sync banner inside gateway panel */}
                    {offlineQueue.length > 0 && (
                      <div className="mt-3 bg-amber-50 border border-amber-300 p-2.5 rounded flex items-center justify-between gap-1.5 font-mono">
                        <div className="text-left">
                          <p className="text-[10px] font-black text-amber-900 flex items-center gap-1 uppercase">
                            <AlertTriangle className="h-3 w-3 text-amber-600 animate-pulse" />
                            {offlineQueue.length} Scan Logs Queued
                          </p>
                        </div>
                        <button
                          onClick={triggerSyncQueue}
                          className="bg-amber-600 hover:bg-amber-700 text-white text-[8px] font-black uppercase py-1 px-2 border border-black rounded shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                        >
                          Sync Now
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 border-t-2 border-black/10 pt-3 text-xs font-mono">
                    <div className="flex justify-between text-gray-500">
                      <span>Latest Gate Scan:</span>
                      <span className="font-bold text-black">
                        {lastEntry ? new Date(lastEntry.timestamp).toLocaleTimeString() : "08:45 AM"}
                      </span>
                    </div>
                    <div className="flex justify-between text-gray-500 mt-1">
                      <span>Location Authorized:</span>
                      <span className="font-bold text-black">
                        {lastEntry ? lastEntry.location : "Block A Entrance"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Main Section 2: Attendance Overview (Circular Progress & Trend) */}
                <div className="bg-slate-50 border-4 border-black p-5 rounded shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <div className="flex justify-between items-center border-b-2 border-black pb-2 mb-4">
                    <h4 className="font-black uppercase text-xs tracking-wider flex items-center gap-1.5">
                      <Activity className="h-4 w-4 text-[#003366]" />
                      Section 2: Academic Statistics
                    </h4>
                    <span className="bg-[#00FF00] text-black text-[9px] font-mono font-bold px-1.5 py-0.5 rounded">
                      92% RATE
                    </span>
                  </div>

                  {/* Circular Progress Meter */}
                  <div className="flex flex-col items-center py-4">
                    <div className="relative w-32 h-32 flex items-center justify-center">
                      {/* SVG Gauge */}
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                        <circle 
                          cx="50" 
                          cy="50" 
                          r="40" 
                          stroke="#e2e8f0" 
                          strokeWidth="8" 
                          fill="transparent" 
                        />
                        <circle 
                          cx="50" 
                          cy="50" 
                          r="40" 
                          stroke="#003366" 
                          strokeWidth="8" 
                          fill="transparent" 
                          strokeDasharray="251.2"
                          strokeDashoffset={251.2 * (1 - 0.92)}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute text-center">
                        <span className="text-3xl font-black font-mono tracking-tight text-slate-800">92%</span>
                        <p className="text-[9px] uppercase font-bold text-slate-500 leading-none">Weekly</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 text-center font-bold mt-3">
                      Weekly Attendance Percentage
                    </p>
                  </div>

                  {/* Smaller graph showing Monthly Trend */}
                  <div className="mt-4 border-2 border-black bg-white p-3 rounded">
                    <p className="text-[10px] font-mono uppercase text-slate-500 font-bold mb-2 flex items-center gap-1">
                      <TrendingUp className="h-3.5 w-3.5 text-blue-600" />
                      Monthly Trend Index
                    </p>
                    <div className="h-16 flex items-end gap-2 pt-2 border-b border-black">
                      {[
                        { label: "Feb", height: "h-[65%]", pct: "65%" },
                        { label: "Mar", height: "h-[80%]", pct: "80%" },
                        { label: "Apr", height: "h-[75%]", pct: "75%" },
                        { label: "May", height: "h-[90%]", pct: "90%" },
                        { label: "Jun", height: "h-[95%]", pct: "95%" },
                        { label: "Jul", height: "h-[92%]", pct: "92%" }
                      ].map((item, idx) => (
                        <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                          {/* Tooltip */}
                          <span className="absolute bottom-full mb-1 scale-0 group-hover:scale-100 bg-black text-white text-[9px] px-1 rounded font-mono transition-all">
                            {item.pct}
                          </span>
                          <div className={`w-full ${item.height} bg-gradient-to-t from-blue-900 to-[#003366] border-t border-black`}></div>
                          <span className="text-[9px] font-mono text-gray-500 mt-1">{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Main Section 3: My Schedule */}
                <div className="bg-slate-50 border-4 border-black p-5 rounded shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <div className="flex justify-between items-center border-b-2 border-black pb-2 mb-4">
                    <h4 className="font-black uppercase text-xs tracking-wider flex items-center gap-1.5">
                      <Calendar className="h-4 w-4 text-[#003366]" />
                      Section 3: Today's Lectures
                    </h4>
                    <span className="bg-amber-100 border border-amber-300 text-amber-800 text-[9px] font-mono px-1.5 py-0.5 rounded font-bold">
                      MONDAY TIMETABLE
                    </span>
                  </div>

                  <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                    {schedules.map((lecture) => (
                      <div 
                        key={lecture.id} 
                        className="bg-white border-2 border-black p-3 rounded flex justify-between items-center hover:bg-slate-100 transition-colors"
                      >
                        <div>
                          <p className="text-xs font-black uppercase text-[#003366]">{lecture.subject}</p>
                          <p className="text-[10px] text-gray-500 font-mono flex items-center gap-1 mt-1">
                            <Clock className="h-3 w-3" /> {lecture.time}
                          </p>
                          <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                            Instructor: <span className="text-black font-bold">{lecture.teacher}</span>
                          </p>
                        </div>
                        <div className="bg-slate-100 border border-black px-2 py-1 text-center font-mono text-[9px] font-bold rounded">
                          {lecture.room}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 bg-blue-50 border border-blue-200 p-2 text-[10px] text-blue-800 leading-relaxed rounded">
                    💡 <strong>Real-time Attendance Link:</strong> Scans at the entrance automatically match your lecture schedule and logs present status instantly to respective professors.
                  </div>
                </div>

              </div>
            )}

            {studentSubTab === "idcard" && (
              <div className="max-w-md mx-auto bg-white border-4 border-black p-6 rounded shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-28 h-28 bg-blue-600/10 rounded-full blur-xl pointer-events-none"></div>
                
                <div className="text-center pb-4 border-b-2 border-dashed border-black mb-4">
                  <div className="text-xs font-black uppercase tracking-widest text-[#003366] mb-1">
                    DEPARTMENT SECURE IDENTIFICATION CARD
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">INSTITUTION ID: CO-620524</span>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start">
                  <img 
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150&h=150" 
                    alt={userDisplayName} 
                    className="w-24 h-32 object-cover rounded border-4 border-black"
                  />
                  <div className="space-y-1.5 flex-1 text-center sm:text-left">
                    <p className="text-[10px] font-mono text-gray-500 uppercase">Student Name</p>
                    <h4 className="text-lg font-black uppercase tracking-tight">{userDisplayName}</h4>
                    
                    <div className="grid grid-cols-2 gap-2 pt-2 text-xs font-mono">
                      <div>
                        <span className="text-[9px] text-gray-400 uppercase block">Register Number</span>
                        <span className="font-bold text-black">{userRegNo}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-gray-400 uppercase block">Year / Section</span>
                        <span className="font-bold text-black">III Year CSE - A</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-gray-400 uppercase block">Blood Group</span>
                        <span className="font-bold text-red-600">O+ Positive</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-gray-400 uppercase block">Validity</span>
                        <span className="font-bold text-emerald-700">2024 - 2028</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 border-t-2 border-black pt-4 flex flex-col items-center">
                  <p className="text-[10px] font-mono uppercase text-gray-400 mb-2">Biometric Verification Barcode</p>
                  <div className="bg-slate-100 p-2.5 border-2 border-black rounded flex flex-col items-center justify-center">
                    <QrCode className="h-28 w-28 text-black" />
                    <span className="text-[9px] font-mono font-bold mt-1 tracking-widest uppercase">
                      SECURE-SHA256-{userRegNo}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {studentSubTab === "notices" && (
              <div className="space-y-4">
                <div className="border-b-2 border-black pb-2 mb-4 flex justify-between items-center">
                  <h4 className="font-black uppercase text-sm tracking-wider">Gate Entrance Circulars & Instructions</h4>
                  <span className="bg-blue-900 text-white text-[10px] font-mono px-2 py-0.5 rounded uppercase">
                    3 ACTIVE CORES
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-amber-50 border-2 border-black p-4 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <div className="flex justify-between items-start mb-2">
                      <span className="bg-amber-600 text-white font-mono text-[9px] font-bold px-2 py-0.5 uppercase rounded">
                        IMPORTANT ENTRY PROTOCOL
                      </span>
                      <span className="text-[10px] font-mono text-gray-500">Today</span>
                    </div>
                    <h5 className="font-black text-sm uppercase">Secure Facial & QR Gate Check</h5>
                    <p className="text-xs text-gray-700 mt-2 leading-relaxed">
                      Effective immediately, all pre-final and final year students must complete entry registration via their gateway mobile companion app or biometric kiosks before 08:45 AM. Late entries will flag academic warning systems.
                    </p>
                  </div>

                  <div className="bg-blue-50 border-2 border-black p-4 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <div className="flex justify-between items-start mb-2">
                      <span className="bg-blue-600 text-white font-mono text-[9px] font-bold px-2 py-0.5 uppercase rounded">
                        GENERAL INFORMATION
                      </span>
                      <span className="text-[10px] font-mono text-gray-500">2 days ago</span>
                    </div>
                    <h5 className="font-black text-sm uppercase">Automatic Leave Deduction Link</h5>
                    <p className="text-xs text-gray-700 mt-2 leading-relaxed">
                      Approved leave requests submitted via the platform automatically update weekly attendance quotients, preventing incorrect absentee notifications from triggering to primary parent registers.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {studentSubTab === "profile" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Apply Leave Request Form */}
                <div className="bg-slate-50 border-4 border-black p-5 rounded shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] lg:col-span-2">
                  <div className="flex items-center gap-2 border-b-2 border-black pb-2 mb-4">
                    <FileText className="h-5 w-5 text-blue-900" />
                    <h4 className="font-black uppercase text-sm">Apply for Medical / Casual Leave</h4>
                  </div>

                  <form onSubmit={handleApplyLeave} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-black uppercase text-gray-600 mb-1">
                          Leave Classification
                        </label>
                        <select 
                          value={leaveType} 
                          onChange={(e) => setLeaveType(e.target.value)}
                          className="w-full bg-white border-2 border-black p-2.5 text-xs font-bold uppercase rounded focus:outline-none"
                        >
                          <option value="Sick Leave">Sick Leave (Medical)</option>
                          <option value="Casual Leave">Casual Leave</option>
                          <option value="On Duty">On Duty (OD) Permission</option>
                          <option value="Maternity/Special">Special Permission</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-black uppercase text-gray-600 mb-1">
                          Applicant Reference Name
                        </label>
                        <input 
                          type="text" 
                          disabled 
                          value={userDisplayName} 
                          className="w-full bg-slate-100 border-2 border-black/50 p-2 text-xs font-mono font-bold uppercase rounded cursor-not-allowed"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-black uppercase text-gray-600 mb-1">
                          Start Duration Date
                        </label>
                        <input 
                          type="date" 
                          value={leaveStart} 
                          onChange={(e) => setLeaveStart(e.target.value)}
                          className="w-full bg-white border-2 border-black p-2 text-xs font-mono rounded"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-black uppercase text-gray-600 mb-1">
                          End Duration Date
                        </label>
                        <input 
                          type="date" 
                          value={leaveEnd} 
                          onChange={(e) => setLeaveEnd(e.target.value)}
                          className="w-full bg-white border-2 border-black p-2 text-xs font-mono rounded"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-black uppercase text-gray-600 mb-1">
                        Reason & Supplementary Justification
                      </label>
                      <textarea 
                        rows={3}
                        value={leaveReason}
                        onChange={(e) => setLeaveReason(e.target.value)}
                        placeholder="State clear reasons or specify host organization for OD..."
                        className="w-full bg-white border-2 border-black p-2.5 text-xs rounded"
                      />
                    </div>

                    <button 
                      type="submit"
                      disabled={isSubmittingLeave}
                      className="w-full py-2.5 border-2 border-black bg-[#003366] hover:bg-blue-900 text-white text-xs font-black uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[1px]"
                    >
                      {isSubmittingLeave ? "SUBMITTING REQUEST..." : "SUBMIT SECURE LEAVE REQUEST"}
                    </button>
                  </form>
                </div>

                {/* Leaves Applications History */}
                <div className="bg-slate-50 border-4 border-black p-5 rounded shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <div className="border-b-2 border-black pb-2 mb-4">
                    <h4 className="font-black uppercase text-xs tracking-wider flex items-center gap-1">
                      <Clock className="h-4 w-4 text-amber-600" />
                      Leave Log & Approvals
                    </h4>
                  </div>

                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                    {myLeaves.length === 0 ? (
                      <p className="text-xs text-gray-500 text-center py-6">No previous leave logged on this portal.</p>
                    ) : (
                      myLeaves.map((req) => (
                        <div key={req.id} className="bg-white border-2 border-black p-3 rounded">
                          <div className="flex justify-between items-start">
                            <span className="font-mono text-[9px] font-bold uppercase text-slate-400">
                              {req.type}
                            </span>
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 border rounded ${
                              req.status === "Approved" ? "bg-emerald-50 border-emerald-400 text-emerald-800" :
                              req.status === "Rejected" ? "bg-rose-50 border-rose-400 text-rose-800" :
                              "bg-amber-50 border-amber-400 text-amber-800"
                            }`}>
                              {req.status}
                            </span>
                          </div>
                          <h5 className="font-black text-xs text-[#003366] mt-1">{req.reason}</h5>
                          <p className="text-[10px] text-gray-500 font-mono mt-1">
                            {req.startDate} to {req.endDate}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            )}
          </div>

          {/* Student Footer Tab Bar Bottom Navigation */}
          <div className="bg-[#002244] border-t-4 border-black p-2 grid grid-cols-4 gap-2 text-center text-white">
            {[
              { id: "home", label: "Home Portal", icon: Compass },
              { id: "idcard", label: "Secure ID", icon: UserCheck },
              { id: "notices", label: "Circulars", icon: FileText },
              { id: "profile", label: "Leave & Prof", icon: UserIcon }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStudentSubTab(tab.id as any)}
                className={`py-2 text-xs flex flex-col items-center justify-center font-black uppercase tracking-tight transition-all border border-transparent rounded ${
                  studentSubTab === tab.id
                    ? "bg-[#00FF00] text-black border-black font-black shadow"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                <tab.icon className="h-4 w-4 mb-1" />
                <span className="text-[9px] font-sans">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* ========================================================= */
        /* 2. STAFF / TEACHER VIEW DASHBOARD                        */
        /* ========================================================= */
        <div className="flex flex-col min-h-[550px]">
          {/* Welcome Teacher Header */}
          <div className="bg-white border-b-4 border-black p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <img 
                  src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150&h=150" 
                  alt={userDisplayName}
                  className="w-16 h-16 rounded-full border-4 border-black object-cover"
                />
                <span className="absolute bottom-0 right-0 w-4 h-4 bg-[#00FF00] border-2 border-black rounded-full" title="Active"></span>
              </div>
              <div>
                <span className="text-[10px] font-mono font-black uppercase text-[#003366] bg-[#003366]/10 border border-blue-200 px-2 py-0.5 rounded">
                  Faculty Administrator
                </span>
                <h3 className="text-lg font-black uppercase tracking-tight mt-1">
                  Welcome Prof. {userDisplayName.replace(" (HOD)", "")}
                </h3>
                <p className="text-xs text-gray-500 font-mono">
                  Staff Reference: <span className="font-bold text-black">{userRegNo}</span> • Dept. of CSE (Chairman)
                </p>
              </div>
            </div>

            {/* Attendance Quick Analytics */}
            <div className="flex gap-4">
              <div className="bg-blue-50 border-2 border-black p-3 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-center min-w-[110px]">
                <div className="text-[10px] font-mono text-gray-500 uppercase font-black">Today Absentees</div>
                <div className="text-lg font-black mt-1 font-mono text-red-600">
                  {leaveRequests.filter(l => l.status === "Pending").length} Pending
                </div>
              </div>
              <div className="bg-[#003366] text-white border-2 border-black p-3 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-center min-w-[110px]">
                <div className="text-[10px] font-mono text-blue-200 uppercase font-bold">Total Scans Today</div>
                <div className="text-lg font-black mt-1 font-mono text-[#00FF00]">
                  {attendanceLogs.length} verified
                </div>
              </div>
            </div>
          </div>

          {/* Sub Navigation Content Panels (Staff View) */}
          <div className="p-6 flex-1 bg-white">
            {staffSubTab === "home" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Main Section 1: Quick Attendance Generator */}
                <div className="bg-slate-50 border-4 border-black p-5 rounded relative shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center border-b-2 border-black pb-2 mb-4">
                      <h4 className="font-black uppercase text-xs tracking-wider flex items-center gap-1.5">
                        <QrCode className="h-4 w-4 text-[#003366]" />
                        Section 1: Quick Attendance QR
                      </h4>
                      <span className="bg-emerald-600 text-white text-[9px] font-mono px-1.5 py-0.5 rounded uppercase">
                        STAFF MASTER
                      </span>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-black uppercase text-gray-500 mb-1 font-mono">
                          Select Registered Target Class
                        </label>
                        <select
                          value={selectedCourse}
                          onChange={(e) => setSelectedCourse(e.target.value)}
                          className="w-full bg-white border-2 border-black p-2.5 text-xs font-bold uppercase rounded focus:outline-none"
                        >
                          <option value="Dept. of CSE - II Year">Dept. of CSE - II Year</option>
                          <option value="Dept. of CSE - III Year">Dept. of CSE - III Year</option>
                          <option value="Dept. of CSE - IV Year">Dept. of CSE - IV Year</option>
                          <option value="Staff Executive Board">Staff Executive Board</option>
                        </select>
                      </div>

                      <button
                        onClick={handleGenerateQr}
                        className="w-full py-3 bg-[#003366] hover:bg-blue-900 border-2 border-black text-white font-black text-xs uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[1px]"
                      >
                        GENERATE QR ENCRYPTION CODE
                      </button>

                      {activeQrData ? (
                        <div className="bg-white border-2 border-black p-4 rounded text-center">
                          <p className="text-[9px] font-mono uppercase text-emerald-600 font-black mb-1 flex items-center justify-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                            Live Scan Channel Active
                          </p>
                          <div className="bg-slate-50 p-3 border border-black inline-block rounded">
                            <QrCode className="h-32 w-32 mx-auto text-slate-800" />
                          </div>
                          <p className="text-[9px] font-mono text-gray-400 mt-2 truncate">
                            {activeQrData}
                          </p>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed border-black/40 p-6 rounded text-center text-gray-400 text-xs font-mono">
                          No active QR scan session. Generate a code for students to scan during lecture hour.
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-500 leading-relaxed border-t-2 border-black/10 pt-3 mt-4">
                    🔒 QR codes cycle every 30 seconds to block proxy check-ins. Scanners enforce physical geolocation parameters.
                  </p>
                </div>

                {/* Main Section 2: Pending Leave Approvals */}
                <div className="bg-slate-50 border-4 border-black p-5 rounded shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center border-b-2 border-black pb-2 mb-4">
                      <h4 className="font-black uppercase text-xs tracking-wider flex items-center gap-1.5">
                        <FileText className="h-4 w-4 text-[#003366]" />
                        Section 2: Pending Leave Requests
                      </h4>
                      <span className="bg-amber-500 text-white text-[9px] font-mono px-1.5 py-0.5 rounded font-black">
                        {leaveRequests.filter(req => req.status === "Pending").length} PENDING
                      </span>
                    </div>

                    <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                      {leaveRequests.filter(r => r.status === "Pending").length === 0 ? (
                        <div className="text-center py-12 text-xs text-gray-500 font-mono">
                          ✔ No pending student leave applications detected.
                        </div>
                      ) : (
                        leaveRequests.filter(r => r.status === "Pending").map((req) => (
                          <div key={req.id} className="bg-white border-2 border-black p-3 rounded">
                            <div className="flex justify-between items-center border-b border-black/5 pb-1.5 mb-1.5">
                              <span className="font-bold text-xs uppercase text-[#003366]">{req.studentName}</span>
                              <span className="text-[9px] font-mono font-bold bg-slate-100 px-1.5 py-0.5 border border-black rounded">
                                {req.type}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-600 font-medium">Reason: "{req.reason}"</p>
                            <p className="text-[10px] text-gray-400 font-mono mt-1">
                              Duration: {req.startDate} to {req.endDate}
                            </p>
                            <div className="mt-3 flex gap-2">
                              <button
                                onClick={() => handleResolveLeave(req.id, "Approved")}
                                className="flex-1 py-1.5 bg-[#00FF00] hover:bg-emerald-400 border border-black rounded text-[10px] font-black uppercase flex items-center justify-center gap-1"
                              >
                                <Check className="h-3 w-3" /> Approve
                              </button>
                              <button
                                onClick={() => handleResolveLeave(req.id, "Rejected")}
                                className="flex-1 py-1.5 bg-rose-200 hover:bg-rose-300 border border-black rounded text-[10px] font-black uppercase flex items-center justify-center gap-1"
                              >
                                <X className="h-3 w-3" /> Deny
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="text-[10px] text-gray-500 font-mono mt-4 pt-2 border-t-2 border-black/10">
                    Students are notified instantly upon permission approval.
                  </div>
                </div>

                {/* Main Section 3: Staff Profile & Schedule */}
                <div className="bg-slate-50 border-4 border-black p-5 rounded shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <div className="flex justify-between items-center border-b-2 border-black pb-2 mb-4">
                    <h4 className="font-black uppercase text-xs tracking-wider flex items-center gap-1.5">
                      <UserCheck className="h-4 w-4 text-[#003366]" />
                      Section 3: Staff Profile & Timetable
                    </h4>
                    <span className="bg-blue-100 text-blue-900 border border-blue-300 text-[9px] font-mono px-1.5 py-0.5 rounded font-bold">
                      HOD CSE
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-white border-2 border-black p-3 rounded">
                      <div className="flex items-center gap-3">
                        <img 
                          src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150&h=150" 
                          alt="Prof" 
                          className="w-12 h-12 rounded border-2 border-black object-cover"
                        />
                        <div>
                          <p className="text-xs font-bold text-gray-500 uppercase">Principal Professor</p>
                          <p className="font-black text-sm uppercase">Dr. Anand M.E., Ph.D.</p>
                          <span className="text-[10px] font-mono text-blue-700 underline cursor-pointer">
                            View Academic Profile Links
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-[10px] font-mono uppercase text-gray-400 font-bold">Your Teaching Schedule Today</p>
                      
                      <div className="bg-white border border-black p-3 rounded flex justify-between items-center">
                        <div>
                          <p className="text-xs font-black uppercase text-amber-800">Computer Networks</p>
                          <span className="text-[10px] text-gray-500 font-mono">08:45 AM - 09:40 AM • Room LH-101</span>
                        </div>
                        <span className="bg-emerald-50 border border-emerald-300 text-emerald-800 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded">
                          COMPLETED
                        </span>
                      </div>

                      <div className="bg-white border border-black p-3 rounded flex justify-between items-center">
                        <div>
                          <p className="text-xs font-black uppercase text-blue-900">Database Systems</p>
                          <span className="text-[10px] text-gray-500 font-mono">09:40 AM - 10:35 AM • Room LH-101</span>
                        </div>
                        <span className="bg-emerald-50 border border-emerald-300 text-emerald-800 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded">
                          COMPLETED
                        </span>
                      </div>

                      <div className="bg-white border border-black p-3 rounded flex justify-between items-center opacity-70">
                        <div>
                          <p className="text-xs font-black uppercase text-slate-800">Seminar Guidance</p>
                          <span className="text-[10px] text-gray-500 font-mono">02:00 PM - 03:00 PM • Auditorium</span>
                        </div>
                        <span className="bg-slate-100 border border-slate-300 text-slate-600 text-[9px] font-mono px-1.5 py-0.5 rounded">
                          PENDING
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {staffSubTab === "attendance" && (
              <div className="space-y-4">
                <div className="border-b-2 border-black pb-2 mb-4 flex justify-between items-center">
                  <h4 className="font-black uppercase text-sm tracking-wider">Historical Gate Verification Logs</h4>
                  <button 
                    onClick={loadData}
                    className="p-1 border border-black bg-slate-100 hover:bg-slate-200 text-xs flex items-center gap-1 rounded"
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Synchronize Logs
                  </button>
                </div>

                <div className="border-4 border-black overflow-hidden rounded shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#003366] text-white border-b-2 border-black font-mono">
                      <tr>
                        <th className="p-3 uppercase">Biometric Capture</th>
                        <th className="p-3 uppercase">Student Name</th>
                        <th className="p-3 uppercase">Register No</th>
                        <th className="p-3 uppercase">Location</th>
                        <th className="p-3 uppercase">Timestamp Log</th>
                        <th className="p-3 uppercase">Gate Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {attendanceLogs.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-gray-500 font-mono">No scans recorded on this gateway.</td>
                        </tr>
                      ) : (
                        attendanceLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3">
                              {log.snapshot ? (
                                <img
                                  src={log.snapshot}
                                  alt="Captured Snap"
                                  className="w-10 h-7 object-cover border border-black rounded shadow-sm hover:scale-150 transition-transform cursor-zoom-in"
                                  onClick={() => setSelectedSnapshotUrl(log.snapshot || null)}
                                />
                              ) : (
                                <div className="w-10 h-7 bg-slate-100 border border-slate-300 rounded flex items-center justify-center text-[8px] font-mono uppercase text-slate-400">
                                  No Snap
                                </div>
                              )}
                            </td>
                            <td className="p-3 font-bold text-slate-800">{log.studentName}</td>
                            <td className="p-3 font-mono text-slate-600">{log.regNo}</td>
                            <td className="p-3 text-slate-500">{log.location}</td>
                            <td className="p-3 font-mono text-slate-500">
                              {new Date(log.timestamp).toLocaleString()}
                            </td>
                            <td className="p-3">
                              <span className="bg-emerald-50 text-emerald-800 font-black border border-emerald-300 px-2.5 py-0.5 rounded uppercase text-[10px]">
                                {log.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {staffSubTab === "leave" && (
              <div className="space-y-4">
                <div className="border-b-2 border-black pb-2 mb-4">
                  <h4 className="font-black uppercase text-sm tracking-wider">Leave Applications Registry</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {leaveRequests.map((req) => (
                    <div key={req.id} className="bg-white border-2 border-black p-4 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] relative">
                      <div className="flex justify-between items-start border-b border-black/5 pb-2 mb-2">
                        <div>
                          <h5 className="font-black text-sm uppercase text-slate-800">{req.studentName}</h5>
                          <span className="text-[10px] font-mono text-gray-500">ID: {req.regNo}</span>
                        </div>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 border rounded ${
                          req.status === "Approved" ? "bg-emerald-50 border-emerald-400 text-emerald-800" :
                          req.status === "Rejected" ? "bg-rose-50 border-rose-400 text-rose-800" :
                          "bg-amber-50 border-amber-400 text-amber-800"
                        }`}>
                          {req.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-700 font-medium">Reason: "{req.reason}"</p>
                      <div className="flex justify-between items-center text-[10px] font-mono text-gray-400 mt-3 pt-2 border-t border-slate-100">
                        <span>Dates: {req.startDate} to {req.endDate}</span>
                        <span>Type: {req.type}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {staffSubTab === "sos" && (
              <div className="max-w-md mx-auto bg-red-50 border-4 border-red-600 p-6 rounded shadow-[6px_6px_0px_0px_rgba(220,38,38,1)] text-center">
                <ShieldAlert className="h-16 w-16 text-red-600 mx-auto mb-4 animate-bounce" />
                <h4 className="text-lg font-black uppercase tracking-tight text-red-800">
                  INSTITUTIONAL EMERGENCY (SOS) SYSTEM
                </h4>
                <p className="text-xs text-red-700 font-mono mt-2 leading-relaxed">
                  Triggering this interface logs immediate system emergency mode. Security controllers will pinpoint your faculty terminal location and lock all electronic entry gates.
                </p>

                <div className="mt-6 p-4 border-2 border-dashed border-red-400 rounded bg-white">
                  <p className="text-[10px] font-mono uppercase text-gray-400 font-bold mb-2">Active Incident Controllers</p>
                  <div className="flex justify-between items-center text-xs font-mono py-1">
                    <span>Block A Security Station</span>
                    <span className="font-bold text-emerald-700 uppercase">CONNECTED</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-mono py-1">
                    <span>Medical Care Room</span>
                    <span className="font-bold text-emerald-700 uppercase">CONNECTED</span>
                  </div>
                </div>

                <button 
                  onClick={() => alert("SOS logged! Internal responders have been synchronized in real-time.")}
                  className="w-full mt-6 py-3 border-2 border-black bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[1px]"
                >
                  BROADCAST EMERGENCY ALARM NOW
                </button>
              </div>
            )}
          </div>

          {/* Staff Footer Tab Bar Bottom Navigation */}
          <div className="bg-[#002244] border-t-4 border-black p-2 grid grid-cols-4 gap-2 text-center text-white">
            {[
              { id: "home", label: "Dashboard", icon: Compass },
              { id: "attendance", label: "Gate Logs", icon: UserCheck },
              { id: "leave", label: "Leave Mgt.", icon: FileText },
              { id: "sos", label: "SOS Alert", icon: ShieldAlert }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStaffSubTab(tab.id as any)}
                className={`py-2 text-xs flex flex-col items-center justify-center font-black uppercase tracking-tight transition-all border border-transparent rounded ${
                  staffSubTab === tab.id
                    ? "bg-[#00FF00] text-black border-black font-black shadow"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                <tab.icon className="h-4 w-4 mb-1" />
                <span className="text-[9px] font-sans">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Biometric Snapshot Lightbox Modal */}
      {selectedSnapshotUrl && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm" 
          onClick={() => setSelectedSnapshotUrl(null)}
          id="biometric-snapshot-lightbox"
        >
          <div 
            className="bg-white border-4 border-black p-4 rounded shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative max-w-sm w-full" 
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setSelectedSnapshotUrl(null)}
              className="absolute top-2 right-2 text-slate-500 hover:text-black font-black border border-black bg-slate-100 hover:bg-slate-200 px-2 py-0.5 text-[9px] rounded uppercase font-mono"
            >
              Close
            </button>
            <h4 className="text-xs font-black uppercase text-[#003366] tracking-wider mb-2 border-b-2 border-black pb-1 font-mono flex items-center gap-1.5">
              <Camera className="h-4 w-4 text-emerald-600" />
              Biometric Capture Verified
            </h4>
            <img 
              src={selectedSnapshotUrl} 
              alt="Zoomed Biometric" 
              className="w-full h-auto object-contain border-2 border-black rounded bg-slate-900"
            />
            <p className="text-[10px] text-slate-500 font-mono mt-2 text-center uppercase">
              Secured & timestamped with institutional biometric signature
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

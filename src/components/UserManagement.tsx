import React, { useState } from "react";
import { User, UserRole } from "../types";
import { 
  UserPlus, Search, Edit3, Trash2, Shield, User as UserIcon, 
  Mail, Key, CheckCircle, XCircle, RefreshCw, AlertCircle, Plus, Info
} from "lucide-react";

interface UserManagementProps {
  currentUser: User | null;
  allUsers: User[];
  onRefreshUsers: () => void;
  triggerNotification: (type: "success" | "error", msg: string) => void;
}

export default function UserManagement({
  currentUser,
  allUsers,
  onRefreshUsers,
  triggerNotification
}: UserManagementProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [userTypeForm, setUserTypeForm] = useState<"student" | "staff">("student");
  
  // Create User Form States
  const [name, setName] = useState("");
  const [regNo, setRegNo] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [department, setDepartment] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRole>("student");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit User States
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState("");
  const [editRegNo, setEditRegNo] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhoneNumber, setEditPhoneNumber] = useState("");
  const [editDepartment, setEditDepartment] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editRole, setEditRole] = useState<UserRole>("student");
  const [isUpdating, setIsUpdating] = useState(false);

  // Stats calculation
  const stats = React.useMemo(() => {
    const students = allUsers.filter(u => u.role === "student").length;
    const crs = allUsers.filter(u => u.role === "cr").length;
    const staff = allUsers.filter(u => u.role === "admin").length;
    return { students, crs, staff, total: allUsers.length };
  }, [allUsers]);

  // Filtered users for directory
  const filteredUsers = React.useMemo(() => {
    if (!searchTerm.trim()) return allUsers;
    const term = searchTerm.toLowerCase().trim();
    return allUsers.filter(user => 
      user.name.toLowerCase().includes(term) ||
      user.regNo.toLowerCase().includes(term) ||
      user.email.toLowerCase().includes(term) ||
      user.role.toLowerCase().includes(term)
    );
  }, [allUsers, searchTerm]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !regNo.trim() || !email.trim()) {
      triggerNotification("error", "Please fill in all required user fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          regNo: regNo.trim().toUpperCase(),
          email: email.trim(),
          phoneNumber: phoneNumber.trim(),
          department: department.trim(),
          role: userTypeForm === "staff" ? "admin" : selectedRole,
          password: password.trim() || "password"
        })
      });

      const data = await res.json();
      if (res.ok) {
        triggerNotification("success", `Successfully added ${data.name} to the directory.`);
        // Reset form
        setName("");
        setRegNo("");
        setEmail("");
        setPhoneNumber("");
        setDepartment("");
        setPassword("");
        setSelectedRole("student");
        onRefreshUsers();
      } else {
        triggerNotification("error", data.error || "Failed to register new user.");
      }
    } catch (err) {
      console.error(err);
      triggerNotification("error", "API request failed. Check network connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (user: User) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditRegNo(user.regNo);
    setEditEmail(user.email);
    setEditRole(user.role);
    setEditPassword(user.password || "");
    setEditPhoneNumber(user.phoneNumber || "");
    setEditDepartment(user.department || "");
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!editName.trim() || !editRegNo.trim() || !editEmail.trim()) {
      triggerNotification("error", "Name, Registration Number/Staff ID, and Email are required.");
      return;
    }

    setIsUpdating(true);
    try {
      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          regNo: editRegNo.trim().toUpperCase(),
          email: editEmail.trim(),
          phoneNumber: editPhoneNumber.trim(),
          department: editDepartment.trim(),
          role: editRole,
          password: editPassword.trim() || undefined
        })
      });

      const data = await res.json();
      if (res.ok) {
        triggerNotification("success", `Updated user ${data.user?.name || editName} successfully.`);
        setEditingUser(null);
        onRefreshUsers();
      } else {
        triggerNotification("error", data.error || "Failed to update user.");
      }
    } catch (err) {
      console.error(err);
      triggerNotification("error", "Failed to contact database to update user.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (user.id === currentUser?.id) {
      triggerNotification("error", "Safety Lock: You cannot delete your own logged-in account!");
      return;
    }

    if (!window.confirm(`Are you absolutely sure you want to delete ${user.name} (${user.regNo}) from the department database?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "DELETE"
      });

      if (res.ok) {
        triggerNotification("success", `Removed ${user.name} from directory.`);
        onRefreshUsers();
      } else {
        const data = await res.json();
        triggerNotification("error", data.error || "Failed to delete user.");
      }
    } catch (err) {
      console.error(err);
      triggerNotification("error", "Failed to process user removal.");
    }
  };

  return (
    <div className="space-y-8" id="user-management-panel">
      {/* Brutalist Hero Banner */}
      <div className="border-4 border-black p-6 bg-[#00FF00]/10 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="bg-black text-[#00FF00] font-mono px-3 py-1 text-xs font-black tracking-widest uppercase rounded-sm">
            RBAC ACCESS: ACTIVE
          </span>
          <h2 className="text-3xl font-black uppercase tracking-tight mt-2">
            Secure User Directory & Provisioning
          </h2>
          <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mt-1">
            Logged in as: <span className="underline">{currentUser?.name}</span> ({currentUser?.role?.toUpperCase()})
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onRefreshUsers}
            className="border-2 border-black bg-white hover:bg-slate-100 p-2.5 font-bold text-xs uppercase flex items-center gap-1.5 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          >
            <RefreshCw className="h-4 w-4" />
            Sync Database
          </button>
        </div>
      </div>

      {/* Stats Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="border-2 border-black p-4 bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
          <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Total Registered Accounts</p>
          <p className="text-4xl font-black mt-1 font-mono">{stats.total}</p>
        </div>
        <div className="border-2 border-black p-4 bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
          <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Students (Standard)</p>
          <p className="text-4xl font-black mt-1 text-blue-600 font-mono">{stats.students}</p>
        </div>
        <div className="border-2 border-black p-4 bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
          <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Class Representatives (CR)</p>
          <p className="text-4xl font-black mt-1 text-emerald-600 font-mono">{stats.crs}</p>
        </div>
        <div className="border-2 border-black p-4 bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
          <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Department Staff / Admin</p>
          <p className="text-4xl font-black mt-1 text-red-600 font-mono">{stats.staff}</p>
        </div>
      </div>

      {/* Two Columns Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Form Section */}
        <div className="lg:col-span-4 space-y-6">
          <div className="border-4 border-black bg-white p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center gap-2 border-b-2 border-black pb-3 mb-4">
              <UserPlus className="h-5 w-5 text-black" />
              <h3 className="font-black text-lg uppercase tracking-tight">Provision New Profile</h3>
            </div>

            {/* Toggle user type */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                type="button"
                onClick={() => {
                  setUserTypeForm("student");
                  setSelectedRole("student");
                }}
                className={`py-2 text-xs font-black uppercase border-2 border-black transition-all ${
                  userTypeForm === "student"
                    ? "bg-[#00FF00] text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                    : "bg-white text-gray-500 hover:bg-slate-50"
                }`}
              >
                🎓 Student
              </button>
              <button
                type="button"
                onClick={() => {
                  setUserTypeForm("staff");
                  setSelectedRole("admin");
                }}
                className={`py-2 text-xs font-black uppercase border-2 border-black transition-all ${
                  userTypeForm === "staff"
                    ? "bg-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                    : "bg-white text-gray-500 hover:bg-slate-50"
                }`}
              >
                💼 Faculty / Staff
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-2.5 h-4.5 w-4.5 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={userTypeForm === "student" ? "e.g., Harish Kumar" : "e.g., Dr. Anand (HOD)"}
                    className="w-full pl-10 pr-3 py-2 text-sm font-semibold border-2 border-black focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                  {userTypeForm === "student" ? "Register Number" : "Department Staff ID"}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 font-mono text-xs font-bold text-gray-400">ID:</span>
                  <input
                    type="text"
                    required
                    value={regNo}
                    onChange={(e) => setRegNo(e.target.value)}
                    placeholder={userTypeForm === "student" ? "62052414003" : "STAFF002"}
                    className="w-full pl-10 pr-3 py-2 text-sm font-mono font-bold border-2 border-black focus:outline-hidden uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                  Institutional Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4.5 w-4.5 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@college.edu"
                    className="w-full pl-10 pr-3 py-2 text-sm font-semibold border-2 border-black focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                  Phone Number (Regex Checked)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 font-mono text-xs font-bold text-gray-400">PH:</span>
                  <input
                    type="text"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="9876543210 (10 digits)"
                    className="w-full pl-10 pr-3 py-2 text-sm font-semibold border-2 border-black focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                  Academic Department
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 font-mono text-xs font-bold text-gray-400">DEP:</span>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="e.g. CSE, ECE, MECH"
                    className="w-full pl-10 pr-3 py-2 text-sm font-semibold border-2 border-black focus:outline-hidden uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                  Set Secure Password (Default: "password")
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-2.5 h-4.5 w-4.5 text-gray-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password..."
                    className="w-full pl-10 pr-3 py-2 text-sm border-2 border-black focus:outline-hidden"
                  />
                </div>
              </div>

              {userTypeForm === "student" && (
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                    Student Authorization Tier
                  </label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value as any)}
                    className="w-full p-2 text-xs font-black uppercase border-2 border-black bg-white focus:outline-hidden"
                  >
                    <option value="student">Standard Student Tier</option>
                    <option value="cr">Class Representative (CR Tier)</option>
                  </select>
                  <p className="text-[10px] text-gray-400 mt-1 font-semibold">
                    💡 CRs are dynamically allowed to edit active UPI parameters, verify screens, and submit ledger approvals.
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-black text-white hover:bg-[#00FF00] hover:text-black py-2.5 font-black uppercase text-xs border-2 border-black tracking-wider transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 flex justify-center items-center gap-1.5"
              >
                {isSubmitting ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Register & Provision
              </button>
            </form>
          </div>

          <div className="border-2 border-black bg-[#FFFBEB] p-4 text-xs space-y-2">
            <div className="flex items-center gap-1.5 font-bold uppercase text-amber-800">
              <Info className="h-4 w-4 shrink-0" />
              Role Isolation Notice
            </div>
            <p className="text-amber-900 leading-relaxed font-semibold">
              Adhering to strict Role-Based Access Control (RBAC):
            </p>
            <ul className="list-disc pl-4 space-y-1 text-amber-950 font-semibold">
              <li><strong>Students</strong>: Dashboard only. No permissions for UPI edit or ledger modification.</li>
              <li><strong>CRs</strong>: Class-level management, event postings, and payment verification.</li>
              <li><strong>Admins</strong>: Privileged department control, user creation/profile edits/deletion, and full ledger audits.</li>
            </ul>
          </div>
        </div>

        {/* Right Column: Directory Table */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Editing state overlay/drawer inside layout */}
          {editingUser && (
            <div className="border-4 border-amber-500 bg-amber-50/70 p-5 shadow-[4px_4px_0px_0px_rgba(245,158,11,1)] space-y-4">
              <div className="flex justify-between items-center border-b border-amber-500/30 pb-2">
                <div className="flex items-center gap-2">
                  <Edit3 className="h-5 w-5 text-amber-600" />
                  <h4 className="font-black uppercase text-sm tracking-wide text-amber-900">
                    Modifying Profile: {editingUser.name}
                  </h4>
                </div>
                <button
                  onClick={() => setEditingUser(null)}
                  className="font-black text-xs uppercase underline text-amber-700 hover:text-amber-900"
                >
                  Cancel Edit
                </button>
              </div>

              <form onSubmit={handleUpdateUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-black uppercase text-amber-800 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full text-xs font-bold p-2 border border-black bg-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-black uppercase text-amber-800 mb-1">ID / Register Number</label>
                  <input
                    type="text"
                    required
                    value={editRegNo}
                    onChange={(e) => setEditRegNo(e.target.value)}
                    className="w-full text-xs font-mono font-bold p-2 border border-black bg-white focus:outline-hidden uppercase"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-black uppercase text-amber-800 mb-1">Institutional Email</label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full text-xs font-bold p-2 border border-black bg-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-black uppercase text-amber-800 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={editPhoneNumber}
                    onChange={(e) => setEditPhoneNumber(e.target.value)}
                    className="w-full text-xs font-bold p-2 border border-black bg-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-black uppercase text-amber-800 mb-1">Academic Department</label>
                  <input
                    type="text"
                    value={editDepartment}
                    onChange={(e) => setEditDepartment(e.target.value)}
                    className="w-full text-xs font-bold p-2 border border-black bg-white focus:outline-hidden uppercase"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-black uppercase text-amber-800 mb-1">Set Password</label>
                  <input
                    type="password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="Leave blank or input new password..."
                    className="w-full text-xs p-2 border border-black bg-white focus:outline-hidden"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[9px] font-black uppercase text-amber-800 mb-1">Access Authorization Level</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as any)}
                    className="w-full text-xs font-black uppercase p-2 border border-black bg-white focus:outline-hidden"
                  >
                    <option value="student">Standard Student</option>
                    <option value="cr">Class Representative (CR)</option>
                    <option value="admin">Faculty Admin / HOD</option>
                  </select>
                </div>

                <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="px-4 py-2 border-2 border-black bg-white text-xs font-bold uppercase transition-colors hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="px-5 py-2 bg-black text-white hover:bg-[#00FF00] hover:text-black text-xs font-black uppercase border-2 border-black transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1.5"
                  >
                    {isUpdating && <RefreshCw className="h-3 w-3 animate-spin" />}
                    Save Profile Changes
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Directory card */}
          <div className="border-4 border-black bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <div className="p-4 md:p-6 border-b-4 border-black flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="font-black text-xl uppercase tracking-tight">Department Roster</h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Secure Live DB Users</p>
              </div>

              {/* Search input */}
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, ID, email..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs font-semibold border-2 border-black focus:outline-hidden bg-slate-50"
                />
              </div>
            </div>

            {/* Brutalist table structure */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b-2 border-black">
                    <th className="p-3 text-xs font-black uppercase tracking-wider">User Profile Details</th>
                    <th className="p-3 text-xs font-black uppercase tracking-wider">Register / Staff ID</th>
                    <th className="p-3 text-xs font-black uppercase tracking-wider">Auth Badge</th>
                    <th className="p-3 text-xs font-black uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/10">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-sm font-bold text-gray-400 uppercase font-mono">
                        No matches found in roster database.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3">
                          <div className="font-bold text-sm text-black">{user.name}</div>
                          <div className="text-xs text-slate-500 font-semibold flex items-center gap-1.5 mt-0.5">
                            <Mail className="h-3 w-3 inline" />
                            {user.email}
                          </div>
                          {(user.phoneNumber || user.department) && (
                            <div className="text-[10px] text-slate-400 font-bold uppercase mt-1 flex flex-wrap gap-2">
                              {user.department && <span className="bg-slate-100 px-1 rounded-sm border border-slate-200">Dept: {user.department}</span>}
                              {user.phoneNumber && <span className="bg-slate-100 px-1 rounded-sm border border-slate-200">Ph: {user.phoneNumber}</span>}
                            </div>
                          )}
                        </td>
                        <td className="p-3 font-mono text-xs font-black tracking-tight uppercase text-black">
                          {user.regNo}
                        </td>
                        <td className="p-3">
                          {user.role === "admin" && (
                            <span className="inline-flex items-center gap-1 bg-red-100 text-red-900 border border-red-300 text-[10px] font-black uppercase px-2 py-0.5 rounded-sm">
                              <Shield className="h-3 w-3 shrink-0" />
                              Staff Admin
                            </span>
                          )}
                          {user.role === "cr" && (
                            <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-black uppercase px-2 py-0.5 rounded-sm">
                              <Shield className="h-3 w-3 shrink-0" />
                              Class Rep
                            </span>
                          )}
                          {user.role === "student" && (
                            <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-900 border border-blue-300 text-[10px] font-black uppercase px-2 py-0.5 rounded-sm">
                              <UserIcon className="h-3 w-3 shrink-0" />
                              Student
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => handleStartEdit(user)}
                              title="Edit User Profile"
                              className="p-1.5 border border-black bg-white text-black hover:bg-amber-400 transition-colors"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user)}
                              disabled={user.id === currentUser?.id}
                              title="Delete User from Database"
                              className="p-1.5 border border-black bg-white text-rose-600 hover:bg-rose-100 hover:text-rose-700 disabled:opacity-30 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

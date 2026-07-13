import React from "react";
import { Note, Internship, CompanyLink, User } from "../types";
import {
  BookOpen,
  Briefcase,
  Link2,
  Plus,
  Search,
  Trash2,
  ExternalLink,
  Calendar,
  User as UserIcon,
  Tag,
  ChevronRight,
  Sparkles,
  FileText,
  X,
  AlertCircle,
  GraduationCap
} from "lucide-react";

interface AcademicHubProps {
  currentUser: User | null;
  notes: Note[];
  internships: Internship[];
  companyLinks: CompanyLink[];
  onAddNote: (note: Omit<Note, "id" | "date">) => Promise<void>;
  onDeleteNote: (id: string) => Promise<void>;
  onAddInternship: (intern: Omit<Internship, "id">) => Promise<void>;
  onDeleteInternship: (id: string) => Promise<void>;
  onAddCompanyLink: (link: Omit<CompanyLink, "id">) => Promise<void>;
  onDeleteCompanyLink: (id: string) => Promise<void>;
}

export default function AcademicHub({
  currentUser,
  notes,
  internships,
  companyLinks,
  onAddNote,
  onDeleteNote,
  onAddInternship,
  onDeleteInternship,
  onAddCompanyLink,
  onDeleteCompanyLink
}: AcademicHubProps) {
  // Hub view selection
  const [hubTab, setHubTab] = React.useState<"notes" | "internships" | "links">("notes");
  
  // Search states
  const [noteSearch, setNoteSearch] = React.useState("");
  const [internshipSearch, setInternshipSearch] = React.useState("");
  const [linkSearch, setLinkSearch] = React.useState("");

  // Semester and category filters
  const [semesterFilter, setSemesterFilter] = React.useState<string>("All");
  const [noteCategoryFilter, setNoteCategoryFilter] = React.useState<string>("All");
  const [noteRegulationFilter, setNoteRegulationFilter] = React.useState<string>("All");
  const [linkCategoryFilter, setLinkCategoryFilter] = React.useState<string>("All");

  // Form toggles
  const [showAddForm, setShowAddForm] = React.useState(false);
  
  // Note Modal Viewer State
  const [selectedNote, setSelectedNote] = React.useState<Note | null>(null);

  // WebView iframe simulation state
  const [selectedWebUrl, setSelectedWebUrl] = React.useState<string | null>(null);
  const [webTitle, setWebTitle] = React.useState("");

  // New Note fields
  const [newNoteTitle, setNewNoteTitle] = React.useState("");
  const [newNoteSubject, setNewNoteSubject] = React.useState("");
  const [newNoteFileUrl, setNewNoteFileUrl] = React.useState("");
  const [newNoteContent, setNewNoteContent] = React.useState("");
  const [newNoteSemester, setNewNoteSemester] = React.useState("Semester 5");
  const [newNoteCategory, setNewNoteCategory] = React.useState<"Notes" | "Question Paper" | "Project Report">("Notes");
  const [newNoteRegulation, setNewNoteRegulation] = React.useState("Regulation 2021");

  // New Internship fields
  const [newInternTitle, setNewInternTitle] = React.useState("");
  const [newInternCompany, setNewInternCompany] = React.useState("");
  const [newInternDesc, setNewInternDesc] = React.useState("");
  const [newInternApplyUrl, setNewInternApplyUrl] = React.useState("");
  const [newInternLastDate, setNewInternLastDate] = React.useState("");

  // New Link fields
  const [newLinkName, setNewLinkName] = React.useState("");
  const [newLinkUrl, setNewLinkUrl] = React.useState("");
  const [newLinkDesc, setNewLinkDesc] = React.useState("");
  const [newLinkCategory, setNewLinkCategory] = React.useState("Assessment");

  const [formError, setFormError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Check if current user has faculty/staff write privileges (admin role represents Faculty/HOD/Staff)
  const isFaculty = currentUser?.role === "admin";

  // Filter lists
  const filteredNotes = React.useMemo(() => {
    return notes.filter((n) => {
      const matchSearch =
        n.title.toLowerCase().includes(noteSearch.toLowerCase()) ||
        n.subject.toLowerCase().includes(noteSearch.toLowerCase()) ||
        n.content.toLowerCase().includes(noteSearch.toLowerCase());
      const matchSemester = semesterFilter === "All" || n.semester === semesterFilter;
      const matchCategory = noteCategoryFilter === "All" || (n.category || "Notes") === noteCategoryFilter;
      const matchRegulation = noteRegulationFilter === "All" || (n.regulation || "Regulation 2021") === noteRegulationFilter;
      return matchSearch && matchSemester && matchCategory && matchRegulation;
    });
  }, [notes, noteSearch, semesterFilter, noteCategoryFilter, noteRegulationFilter]);

  const filteredInternships = React.useMemo(() => {
    return internships.filter((i) => {
      const matchSearch =
        i.title.toLowerCase().includes(internshipSearch.toLowerCase()) ||
        i.company.toLowerCase().includes(internshipSearch.toLowerCase()) ||
        i.description.toLowerCase().includes(internshipSearch.toLowerCase());
      return matchSearch;
    });
  }, [internships, internshipSearch]);

  const filteredCompanyLinks = React.useMemo(() => {
    return companyLinks.filter((l) => {
      const matchSearch =
        l.name.toLowerCase().includes(linkSearch.toLowerCase()) ||
        l.description.toLowerCase().includes(linkSearch.toLowerCase());
      const matchCat = linkCategoryFilter === "All" || l.category === linkCategoryFilter;
      return matchSearch && matchCat;
    });
  }, [companyLinks, linkSearch, linkCategoryFilter]);

  // Form submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      if (hubTab === "notes") {
        if (!newNoteTitle.trim() || !newNoteSubject.trim()) {
          throw new Error("Please fill in Note Title and Subject.");
        }
        await onAddNote({
          title: newNoteTitle,
          subject: newNoteSubject,
          fileUrl: newNoteFileUrl,
          content: newNoteContent,
          semester: newNoteSemester,
          category: newNoteCategory,
          regulation: newNoteRegulation,
          uploadedBy: currentUser?.name || "Faculty Coordinator"
        });
        // Clear fields
        setNewNoteTitle("");
        setNewNoteSubject("");
        setNewNoteFileUrl("");
        setNewNoteContent("");
        setNewNoteSemester("Semester 5");
        setNewNoteCategory("Notes");
        setNewNoteRegulation("Regulation 2021");
      } else if (hubTab === "internships") {
        if (!newInternTitle.trim() || !newInternCompany.trim() || !newInternApplyUrl.trim()) {
          throw new Error("Please fill in Internship Title, Company, and Application Link.");
        }
        await onAddInternship({
          title: newInternTitle,
          company: newInternCompany,
          description: newInternDesc,
          applyUrl: newInternApplyUrl,
          lastDate: newInternLastDate || new Date().toISOString().split("T")[0],
          postedBy: "Placement Coordinator"
        });
        setNewInternTitle("");
        setNewInternCompany("");
        setNewInternDesc("");
        setNewInternApplyUrl("");
        setNewInternLastDate("");
      } else if (hubTab === "links") {
        if (!newLinkName.trim() || !newLinkUrl.trim()) {
          throw new Error("Please fill in Link Name and verified Destination URL.");
        }
        await onAddCompanyLink({
          name: newLinkName,
          url: newLinkUrl,
          description: newLinkDesc,
          category: newLinkCategory,
          postedBy: "Dept Training Cell"
        });
        setNewLinkName("");
        setNewLinkUrl("");
        setNewLinkDesc("");
        setNewLinkCategory("Assessment");
      }
      setShowAddForm(false);
    } catch (err: any) {
      setFormError(err.message || "Failed to add resources. Check server connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Safe external URL routing or iframe launcher
  const handleOpenLink = (url: string, title: string) => {
    setWebTitle(title);
    setSelectedWebUrl(url);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 p-6 text-white shadow-xl border border-teal-800/40">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                <Sparkles className="h-3.5 w-3.5" />
              </span>
              <span className="text-xs font-semibold tracking-wider text-emerald-300 uppercase">
                Academic & Careers Hub
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
              Knowledge Repository
            </h1>
            <p className="mt-1.5 text-sm text-teal-100 max-w-xl">
              Access curated lecture notes, track verified placement and internship opportunities, and access core department learning links in real-time.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isFaculty && (
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 px-4 py-2.5 text-sm font-medium text-emerald-950 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
              >
                <Plus className="h-4 w-4" />
                Upload Resource
              </button>
            )}
            <div className="rounded-lg bg-emerald-900/40 border border-emerald-700/50 px-3.5 py-1.5 text-xs text-emerald-300 font-mono">
              Role: <span className="font-bold text-white capitalize">{currentUser?.role || "guest"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Upload Modal/Form */}
      {showAddForm && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-md animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Plus className="h-5 w-5 text-teal-600" />
              Upload to {hubTab === "notes" ? "Class Notes" : hubTab === "internships" ? "Internship Board" : "Corporate Assessment Links"}
            </h2>
            <button
              onClick={() => setShowAddForm(false)}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {formError && (
            <div className="mb-4 flex items-start gap-2.5 rounded-lg bg-rose-50 border border-rose-100 p-3 text-sm text-rose-700">
              <AlertCircle className="h-5 w-5 flex-shrink-0 text-rose-500" />
              <p>{formError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {hubTab === "notes" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Note Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Relational Algebra Complete Tutorial"
                    value={newNoteTitle}
                    onChange={(e) => setNewNoteTitle(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Subject *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DBMS"
                    value={newNoteSubject}
                    onChange={(e) => setNewNoteSubject(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">PDF File URL / Link</label>
                  <input
                    type="url"
                    placeholder="e.g. https://example.com/notes/lecture-dbms.pdf"
                    value={newNoteFileUrl}
                    onChange={(e) => setNewNoteFileUrl(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Semester Category</label>
                  <select
                    value={newNoteSemester}
                    onChange={(e) => setNewNoteSemester(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                  >
                    <option>Semester 1</option>
                    <option>Semester 2</option>
                    <option>Semester 3</option>
                    <option>Semester 4</option>
                    <option>Semester 5</option>
                    <option>Semester 6</option>
                    <option>Semester 7</option>
                    <option>Semester 8</option>
                  </select>
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Resource Category *</label>
                  <select
                    value={newNoteCategory}
                    onChange={(e) => setNewNoteCategory(e.target.value as any)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none bg-white"
                  >
                    <option value="Notes">Notes</option>
                    <option value="Question Paper">Question Paper</option>
                    <option value="Project Report">Project Report</option>
                  </select>
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Academic Regulation *</label>
                  <select
                    value={newNoteRegulation}
                    onChange={(e) => setNewNoteRegulation(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none bg-white"
                  >
                    <option value="Regulation 2021">Regulation 2021</option>
                    <option value="Regulation 2022">Regulation 2022</option>
                    <option value="Regulation 2023">Regulation 2023</option>
                    <option value="Regulation 2024">Regulation 2024</option>
                    <option value="Regulation 2025">Regulation 2025</option>
                  </select>
                </div>
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Detailed lecture text content</label>
                  <textarea
                    rows={3}
                    placeholder="Provide outline, dynamic content, or summary formulas here..."
                    value={newNoteContent}
                    onChange={(e) => setNewNoteContent(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none font-mono"
                  />
                </div>
              </div>
            )}

            {hubTab === "internships" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Role Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Full Stack Developer Intern"
                    value={newInternTitle}
                    onChange={(e) => setNewInternTitle(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Company *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Razorpay India"
                    value={newInternCompany}
                    onChange={(e) => setNewInternCompany(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Apply URL *</label>
                  <input
                    type="url"
                    required
                    placeholder="e.g. https://company.com/apply"
                    value={newInternApplyUrl}
                    onChange={(e) => setNewInternApplyUrl(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Last Date to Apply</label>
                  <input
                    type="date"
                    value={newInternLastDate}
                    onChange={(e) => setNewInternLastDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                  />
                </div>
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Description & Requirements *</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Mention criteria: React, Node, SQL basics, CGPA 7.5+ required..."
                    value={newInternDesc}
                    onChange={(e) => setNewInternDesc(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {hubTab === "links" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Link Label *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HackerRank Coding Arena"
                    value={newLinkName}
                    onChange={(e) => setNewLinkName(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category Category</label>
                  <select
                    value={newLinkCategory}
                    onChange={(e) => setNewLinkCategory(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                  >
                    <option>Assessment</option>
                    <option>Training</option>
                    <option>Placement</option>
                    <option>Other Resources</option>
                  </select>
                </div>
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Verified Destination URL *</label>
                  <input
                    type="url"
                    required
                    placeholder="e.g. https://hackerrank.com/dept-assessment"
                    value={newLinkUrl}
                    onChange={(e) => setNewLinkUrl(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                  />
                </div>
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Brief Description</label>
                  <input
                    type="text"
                    placeholder="e.g. Weekly department coding challenge portal"
                    value={newLinkDesc}
                    onChange={(e) => setNewLinkDesc(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-lg bg-teal-600 hover:bg-teal-700 text-white px-5 py-2 text-sm font-medium transition shadow-md disabled:bg-teal-400"
              >
                {isSubmitting ? "Uploading..." : "Publish Resource"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 3. Navigation Tabs and Search Engine */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex p-1 bg-slate-100 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => { setHubTab("notes"); setShowAddForm(false); }}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
              hubTab === "notes"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            } flex-1 sm:flex-none`}
          >
            <BookOpen className="h-4 w-4 text-emerald-600" />
            Class Notes ({notes.length})
          </button>
          <button
            onClick={() => { setHubTab("internships"); setShowAddForm(false); }}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
              hubTab === "internships"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            } flex-1 sm:flex-none`}
          >
            <Briefcase className="h-4 w-4 text-sky-600" />
            Internship Board ({internships.length})
          </button>
          <button
            onClick={() => { setHubTab("links"); setShowAddForm(false); }}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
              hubTab === "links"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            } flex-1 sm:flex-none`}
          >
            <Link2 className="h-4 w-4 text-amber-600" />
            Company Links ({companyLinks.length})
          </button>
        </div>

        {/* Dynamic Categorical Filters */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {hubTab === "notes" && (
            <>
              <select
                value={semesterFilter}
                onChange={(e) => setSemesterFilter(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:outline-none"
              >
                <option value="All">All Semesters</option>
                <option value="Semester 1">Semester 1</option>
                <option value="Semester 2">Semester 2</option>
                <option value="Semester 3">Semester 3</option>
                <option value="Semester 4">Semester 4</option>
                <option value="Semester 5">Semester 5</option>
                <option value="Semester 6">Semester 6</option>
                <option value="Semester 7">Semester 7</option>
                <option value="Semester 8">Semester 8</option>
              </select>

              <select
                value={noteCategoryFilter}
                onChange={(e) => setNoteCategoryFilter(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:outline-none"
              >
                <option value="All">All Resource Types</option>
                <option value="Notes">Notes Only</option>
                <option value="Question Paper">Question Papers</option>
                <option value="Project Report">Project Reports</option>
              </select>

              <select
                value={noteRegulationFilter}
                onChange={(e) => setNoteRegulationFilter(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:outline-none"
              >
                <option value="All">All Regulations</option>
                <option value="Regulation 2021">Regulation 2021</option>
                <option value="Regulation 2022">Regulation 2022</option>
                <option value="Regulation 2023">Regulation 2023</option>
                <option value="Regulation 2024">Regulation 2024</option>
                <option value="Regulation 2025">Regulation 2025</option>
              </select>
            </>
          )}

          {hubTab === "links" && (
            <select
              value={linkCategoryFilter}
              onChange={(e) => setLinkCategoryFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:outline-none"
            >
              <option value="All">All Categories</option>
              <option value="Assessment">Assessment</option>
              <option value="Training">Training</option>
              <option value="Placement">Placement</option>
              <option value="Other Resources">Other</option>
            </select>
          )}

          {/* Search Engine field */}
          <div className="relative flex-1 sm:w-56">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder={
                hubTab === "notes"
                  ? "Search lectures..."
                  : hubTab === "internships"
                  ? "Search companies..."
                  : "Search assessments..."
              }
              value={
                hubTab === "notes"
                  ? noteSearch
                  : hubTab === "internships"
                  ? internshipSearch
                  : linkSearch
              }
              onChange={(e) => {
                if (hubTab === "notes") setNoteSearch(e.target.value);
                else if (hubTab === "internships") setInternshipSearch(e.target.value);
                else setLinkSearch(e.target.value);
              }}
              className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs focus:border-teal-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* 4. Display Content Grid */}
      
      {/* Tab 1: Lecture Notes */}
      {hubTab === "notes" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredNotes.length === 0 ? (
            <div className="col-span-full py-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <BookOpen className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-500">No notes found matching current search/filters.</p>
            </div>
          ) : (
            filteredNotes.map((note) => (
              <div
                key={note.id}
                className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 hover:shadow-lg hover:border-emerald-200 transition duration-200 relative group"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-1.5 mb-3">
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-100">
                      {note.subject}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                      {note.semester}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-100">
                      {note.category || "Notes"}
                    </span>
                    {note.regulation && (
                      <span className="text-[10px] font-mono font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">
                        {note.regulation}
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition line-clamp-1">
                    {note.title}
                  </h3>

                  {note.content && (
                    <p className="mt-2 text-xs text-slate-500 line-clamp-3 leading-relaxed">
                      {note.content}
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <UserIcon className="h-3 w-3 text-slate-400" />
                    {note.uploadedBy}
                  </span>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedNote(note)}
                      className="rounded bg-teal-50 hover:bg-teal-100 px-2 py-1 text-xs font-semibold text-teal-700 transition"
                    >
                      Read Note
                    </button>
                    {note.fileUrl && (
                      <a
                        href={note.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded bg-slate-100 hover:bg-slate-200 p-1 text-slate-600 transition"
                        title="Download Document"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                    {isFaculty && (
                      <button
                        onClick={() => onDeleteNote(note.id)}
                        className="rounded bg-rose-50 hover:bg-rose-100 p-1 text-rose-600 transition"
                        title="Delete Note"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 2: Internship board */}
      {hubTab === "internships" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredInternships.length === 0 ? (
            <div className="col-span-full py-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <Briefcase className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-500">No active internship campaigns published at the moment.</p>
            </div>
          ) : (
            filteredInternships.map((intern) => (
              <div
                key={intern.id}
                className="rounded-xl border border-slate-200 bg-white p-5 hover:shadow-lg hover:border-sky-200 transition duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-bold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-full">
                      {intern.company}
                    </span>
                    <span className="text-[10px] text-rose-600 bg-rose-50 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Last Date: {intern.lastDate}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 mb-2">
                    {intern.title}
                  </h3>

                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                    {intern.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Tag className="h-3 w-3" />
                    Verified opportunity
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenLink(intern.applyUrl, `${intern.title} (${intern.company})`)}
                      className="flex items-center gap-1 rounded bg-sky-600 hover:bg-sky-700 text-white font-semibold px-3 py-1.5 transition text-xs shadow-sm"
                    >
                      Apply Now
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                    {isFaculty && (
                      <button
                        onClick={() => onDeleteInternship(intern.id)}
                        className="rounded bg-rose-50 hover:bg-rose-100 p-1.5 text-rose-600 transition"
                        title="Delete Listing"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 3: Corporate assessment links */}
      {hubTab === "links" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCompanyLinks.length === 0 ? (
            <div className="col-span-full py-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <Link2 className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-500">No assessment portals matching search criteria.</p>
            </div>
          ) : (
            filteredCompanyLinks.map((link) => (
              <div
                key={link.id}
                className="rounded-xl border border-slate-200 bg-white p-4 hover:shadow-md hover:border-amber-200 transition duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                      {link.category}
                    </span>
                    {isFaculty && (
                      <button
                        onClick={() => onDeleteCompanyLink(link.id)}
                        className="text-rose-400 hover:text-rose-600 p-0.5"
                        title="Remove Link"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 mb-1">
                    {link.name}
                  </h4>

                  {link.description && (
                    <p className="text-xs text-slate-500 line-clamp-2">
                      {link.description}
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">
                    Posted by: {link.postedBy}
                  </span>
                  
                  <button
                    onClick={() => handleOpenLink(link.url, link.name)}
                    className="flex items-center gap-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-800 px-2.5 py-1 text-xs font-semibold transition"
                  >
                    Open Link
                    <ExternalLink className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 5. Detailed Note Content Modal */}
      {selectedNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4 mb-4">
              <div>
                <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  {selectedNote.subject} - {selectedNote.semester}
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">
                  {selectedNote.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedNote(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto space-y-4 pr-1 flex-1 text-sm text-slate-700 leading-relaxed">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                  <FileText className="h-4.5 w-4.5 text-teal-600" />
                  Lecture Outline & Summary
                </h4>
                <p className="whitespace-pre-line font-mono text-xs bg-slate-900 text-emerald-400 p-4 rounded-lg overflow-x-auto shadow-inner">
                  {selectedNote.content || "No outline text detailed for this item."}
                </p>
              </div>

              {selectedNote.fileUrl && (
                <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white shadow-xs">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded bg-rose-50 text-rose-600">
                      <GraduationCap className="h-5 w-5" />
                    </span>
                    <div>
                      <h5 className="font-bold text-xs text-slate-900">Lecture PDF Attachment</h5>
                      <span className="text-[10px] text-slate-400 font-mono break-all">{selectedNote.fileUrl}</span>
                    </div>
                  </div>
                  <a
                    href={selectedNote.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 rounded bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold px-3 py-1.5 transition"
                  >
                    View Document
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>Uploaded By: {selectedNote.uploadedBy}</span>
              <span>Date: {new Date(selectedNote.date).toLocaleDateString()}</span>
            </div>

          </div>
        </div>
      )}

      {/* 6. Dynamic "WebView" Simulated browser Preview Panel */}
      {selectedWebUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 backdrop-blur-xs p-4 sm:p-6 md:p-8 animate-in fade-in duration-200">
          <div className="relative w-full h-full max-w-5xl rounded-2xl bg-white shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Simulation Header Address Bar */}
            <div className="bg-slate-900 text-white p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span className="ml-2 font-semibold text-slate-300 break-all">{webTitle}</span>
              </div>
              
              {/* Fake web URL address bar */}
              <div className="hidden md:block flex-1 max-w-lg mx-auto bg-slate-800 text-slate-300 text-center rounded px-3 py-1 text-[11px] font-mono break-all line-clamp-1">
                {selectedWebUrl}
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={selectedWebUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded bg-slate-800 hover:bg-slate-700 text-white px-2.5 py-1 text-xs font-semibold transition flex items-center gap-1.5"
                >
                  Direct Open
                  <ExternalLink className="h-3 w-3" />
                </a>
                <button
                  onClick={() => setSelectedWebUrl(null)}
                  className="rounded-lg bg-slate-800 hover:bg-slate-700 hover:text-white p-1 text-slate-400 transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Note about iframe constraints */}
            <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-800 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
              <p>
                <strong>Security Guard Note:</strong> Some company application systems prevent standard embedded iframe loading for security. If the screen remains blank, please click the <strong>"Direct Open"</strong> button above to launch safely in a new tab!
              </p>
            </div>

            {/* Real embedded iframe or mock WebView loading space */}
            <div className="flex-1 bg-slate-100 relative">
              <iframe
                src={selectedWebUrl}
                title={webTitle}
                className="w-full h-full border-0 bg-white"
                referrerPolicy="no-referrer"
                sandbox="allow-scripts allow-same-origin allow-forms"
              />
            </div>
            
            {/* WebView status bar */}
            <div className="bg-slate-900 text-slate-400 text-[10px] px-4 py-2 font-mono flex justify-between items-center">
              <span>Secure Sandboxed WebView Mode active</span>
              <button
                onClick={() => setSelectedWebUrl(null)}
                className="text-teal-400 hover:underline"
              >
                Back to Dashboard
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

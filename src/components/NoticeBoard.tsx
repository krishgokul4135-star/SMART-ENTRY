import React from "react";
import { Notice, User } from "../types";
import { Megaphone, Trash2, Calendar, AlertTriangle, MessageSquarePlus } from "lucide-react";

interface NoticeBoardProps {
  user: User;
  notices: Notice[];
  onAddNotice: (title: string, content: string, priority: "low" | "medium" | "high") => Promise<void>;
  onDeleteNotice: (id: string) => Promise<void>;
}

export default function NoticeBoard({ user, notices, onAddNotice, onDeleteNotice }: NoticeBoardProps) {
  const [showForm, setShowForm] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [content, setContent] = React.useState("");
  const [priority, setPriority] = React.useState<"low" | "medium" | "high">("medium");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setIsSubmitting(true);
    try {
      await onAddNotice(title, content, priority);
      setTitle("");
      setContent("");
      setPriority("medium");
      setShowForm(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPriorityStyles = (p: string) => {
    switch (p) {
      case "high":
        return "bg-rose-100 border-rose-600 text-rose-900";
      case "medium":
        return "bg-amber-100 border-amber-600 text-amber-900";
      default:
        return "bg-slate-100 border-slate-600 text-slate-900";
    }
  };

  const isAuthorized = user.role === "admin" || user.role === "cr";

  return (
    <div className="bg-white border-4 border-black p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-6" id="notice-board">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-black text-[#00FF00] border-2 border-black">
            <Megaphone className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-black text-2xl uppercase tracking-tight">Department Bulletins</h3>
            <p className="text-xs text-gray-500 font-mono">STAY UPDATED WITH SECURE ACADEMIC CIRCULARS</p>
          </div>
        </div>

        {isAuthorized && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 px-3 py-2 bg-black text-white hover:bg-[#00FF00] hover:text-black rounded-none text-xs font-black uppercase tracking-wider border-2 border-black transition-all"
          >
            <MessageSquarePlus className="h-4 w-4" />
            {showForm ? "Cancel" : "Post Notice"}
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="p-4 bg-slate-50 border-2 border-black space-y-4">
          <h4 className="font-black text-gray-900 text-xs uppercase tracking-widest">Publish New Circular</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-black uppercase text-gray-700 mb-1">Notice Title</label>
              <input
                type="text"
                placeholder="e.g., Industrial Visit Deadline Extension"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full text-sm font-mono px-3 py-2.5 bg-white border-2 border-black focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-gray-700 mb-1">Notice Content</label>
              <textarea
                placeholder="Provide detailed instructions..."
                rows={3}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                className="w-full text-sm font-mono px-3 py-2.5 bg-white border-2 border-black focus:outline-hidden"
              ></textarea>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-gray-700 mb-1">Priority Level</label>
              <div className="flex gap-2">
                {(["low", "medium", "high"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`px-4 py-2 text-xs font-black uppercase border-2 transition-all ${
                      priority === p
                        ? "bg-black text-white border-black"
                        : "bg-white border-black text-black hover:bg-slate-100"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-black text-[#00FF00] hover:bg-[#00FF00] hover:text-black font-black text-xs uppercase tracking-widest border-2 border-black transition-all"
            >
              {isSubmitting ? "Publishing..." : "Publish Announcement"}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {notices.length === 0 ? (
          <div className="text-center py-8 text-gray-400 font-mono text-sm border-2 border-dashed border-black/10">
            NO ANNOUNCEMENTS PUBLISHED AT PRESENT.
          </div>
        ) : (
          notices.map((notice) => (
            <div
              key={notice.id}
              className="p-5 border-2 border-black bg-white hover:bg-slate-50/50 transition-all space-y-3 relative group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-none text-[9px] font-black uppercase tracking-wider border-2 ${getPriorityStyles(
                        notice.priority
                      )}`}
                    >
                      {notice.priority === "high" && <AlertTriangle className="h-3 w-3" />}
                      {notice.priority} priority
                    </span>
                    <span className="text-[10px] text-gray-500 flex items-center gap-1 font-mono">
                      <Calendar className="h-3 w-3" /> {new Date(notice.date).toLocaleDateString()}
                    </span>
                  </div>
                  <h4 className="font-black text-black text-lg md:text-xl uppercase tracking-tight">{notice.title}</h4>
                </div>

                {isAuthorized && (
                  <button
                    onClick={() => onDeleteNotice(notice.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 border border-transparent hover:border-black rounded-none hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                    title="Delete notice"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              <p className="text-gray-800 text-xs md:text-sm leading-relaxed whitespace-pre-wrap">{notice.content}</p>

              <div className="pt-2 border-t border-black/10 flex justify-between items-center text-[9px] text-gray-400 font-mono">
                <span>BY: {notice.createdBy.toUpperCase()}</span>
                <span>ENTRY ID: {notice.id}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

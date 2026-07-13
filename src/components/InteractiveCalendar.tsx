import React from "react";
import { CalendarEvent, User } from "../types";
import { Calendar, Trash2, CalendarPlus, Tag, Clock, Sparkles } from "lucide-react";

interface InteractiveCalendarProps {
  user: User;
  events: CalendarEvent[];
  onAddEvent: (title: string, type: "academic" | "iv" | "deadline" | "holiday", date: string, description: string) => Promise<void>;
  onDeleteEvent: (id: string) => Promise<void>;
}

export default function InteractiveCalendar({ user, events, onAddEvent, onDeleteEvent }: InteractiveCalendarProps) {
  const [showForm, setShowForm] = React.useState(false);
  const [filterType, setFilterType] = React.useState<string>("all");
  const [title, setTitle] = React.useState("");
  const [type, setType] = React.useState<"academic" | "iv" | "deadline" | "holiday">("academic");
  const [date, setDate] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) return;
    setIsSubmitting(true);
    try {
      await onAddEvent(title, type, date, description);
      setTitle("");
      setType("academic");
      setDate("");
      setDescription("");
      setShowForm(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getEventBadgeStyles = (t: string) => {
    switch (t) {
      case "academic":
        return "bg-blue-100 border-blue-600 text-blue-900";
      case "iv":
        return "bg-purple-100 border-purple-600 text-purple-900";
      case "deadline":
        return "bg-rose-100 border-rose-600 text-rose-900";
      default:
        return "bg-amber-100 border-amber-600 text-amber-900";
    }
  };

  const filteredEvents = filterType === "all" ? events : events.filter(e => e.type === filterType);
  const isAuthorized = user.role === "admin" || user.role === "cr";

  return (
    <div className="bg-white border-4 border-black p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-6" id="department-calendar">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-black text-[#00FF00] border-2 border-black">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-black text-2xl uppercase tracking-tight">Department Calendar</h3>
            <p className="text-xs text-gray-500 font-mono">ACADEMIC DEADLINES, MILESTONES & INDUSTRIAL SESSIONS</p>
          </div>
        </div>

        {isAuthorized && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 px-3 py-2 bg-black text-white hover:bg-[#00FF00] hover:text-black rounded-none text-xs font-black uppercase tracking-wider border-2 border-black transition-all"
          >
            <CalendarPlus className="h-4 w-4" />
            {showForm ? "Cancel" : "Add Event"}
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none border-b-2 border-black">
        {[
          { key: "all", label: "All Events" },
          { key: "academic", label: "Academics" },
          { key: "iv", label: "Industrial Visits" },
          { key: "deadline", label: "Deadlines" },
          { key: "holiday", label: "Holidays" },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setFilterType(item.key)}
            className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider border-t-2 border-x-2 border-black transition-all ${
              filterType === item.key
                ? "bg-black text-[#00FF00]"
                : "bg-white text-black hover:bg-slate-50"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="p-4 bg-slate-50 border-2 border-black space-y-4">
          <h4 className="font-black text-gray-900 text-xs uppercase tracking-widest flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5 text-emerald-600" /> Create Event Card
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <label className="block text-[10px] font-black uppercase text-gray-700 mb-1">Event Title</label>
              <input
                type="text"
                placeholder="e.g., CodeSprint Hackathon 2026"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full text-sm font-mono px-3 py-2 bg-white border-2 border-black focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-gray-700 mb-1">Event Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full text-sm font-mono px-3 py-2 bg-white border-2 border-black focus:outline-hidden"
              >
                <option value="academic">Academic / Exam</option>
                <option value="iv">Industrial Visit (IV)</option>
                <option value="deadline">Project Deadline</option>
                <option value="holiday">Holiday</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-gray-700 mb-1">Event Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full text-sm font-mono px-3 py-2 bg-white border-2 border-black focus:outline-hidden"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[10px] font-black uppercase text-gray-700 mb-1">Description / Location</label>
              <input
                type="text"
                placeholder="Brief description or requirements..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full text-sm font-mono px-3 py-2 bg-white border-2 border-black focus:outline-hidden"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-black text-[#00FF00] hover:bg-[#00FF00] hover:text-black font-black text-xs uppercase tracking-widest border-2 border-black transition-colors"
            >
              {isSubmitting ? "Adding..." : "Add Event to Calendar"}
            </button>
          </div>
        </form>
      )}

      {/* Chronological Event Stream */}
      <div className="space-y-4">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-8 text-gray-400 font-mono text-sm border-2 border-dashed border-black/10">
            NO REGISTERED EVENTS FOUND FOR THIS CATEGORY.
          </div>
        ) : (
          filteredEvents.map((event) => {
            const eventDate = new Date(event.date);
            const isPast = eventDate.getTime() < Date.now() - 86400000;
            return (
              <div
                key={event.id}
                className={`p-4 border-2 border-black bg-white hover:bg-slate-50 transition-all flex flex-col md:flex-row items-start md:items-center gap-4 relative group ${
                  isPast ? "opacity-50" : ""
                }`}
              >
                {/* Date Accent Column */}
                <div className="flex md:flex-col items-center justify-center gap-1 shrink-0 bg-black border-2 border-black text-[#00FF00] p-2 w-16 text-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <span className="text-[9px] uppercase font-black tracking-widest">
                    {eventDate.toLocaleString("en-US", { month: "short" })}
                  </span>
                  <span className="text-2xl font-black leading-none font-mono">
                    {eventDate.getDate()}
                  </span>
                </div>

                {/* Info block */}
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wider border-2 ${getEventBadgeStyles(event.type)}`}>
                      {event.type}
                    </span>
                    {isPast && <span className="text-[10px] text-gray-400 font-mono italic">PAST EVENT</span>}
                  </div>

                  <h4 className="font-black text-black text-lg md:text-xl uppercase tracking-tight leading-none">
                    {event.title}
                  </h4>

                  {event.description && (
                    <p className="text-xs text-gray-600 font-mono leading-normal flex items-center gap-1">
                      <Tag className="h-3 w-3 inline shrink-0" /> {event.description}
                    </p>
                  )}
                </div>

                {/* Author Info & Actions */}
                <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-auto pt-3 md:pt-0 border-t md:border-0 border-black/10">
                  <span className="text-[9px] text-gray-400 font-mono flex items-center gap-1 uppercase">
                    <Clock className="h-3 w-3" /> By: {event.createdBy}
                  </span>

                  {isAuthorized && (
                    <button
                      onClick={() => onDeleteEvent(event.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 border border-transparent hover:border-black rounded-none hover:bg-red-50 transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100"
                      title="Delete Event"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

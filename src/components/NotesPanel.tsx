import { useState } from "react";
import { Plus, Trash2, BookOpen, X, Check } from "lucide-react";
import { useNotes } from "../hooks/useNotes";
import { NOTE_COLORS } from "../lib/types";

const COLOR_STYLES: Record<string, { border: string; bg: string; dot: string }> = {
  slate: { border: "border-slate-600/40", bg: "bg-slate-800/40", dot: "bg-slate-400" },
  amber: { border: "border-amber-600/40", bg: "bg-amber-900/20", dot: "bg-amber-400" },
  rose: { border: "border-rose-600/40", bg: "bg-rose-900/20", dot: "bg-rose-400" },
  emerald: { border: "border-emerald-600/40", bg: "bg-emerald-900/20", dot: "bg-emerald-400" },
  sky: { border: "border-sky-600/40", bg: "bg-sky-900/20", dot: "bg-sky-400" },
  violet: { border: "border-violet-600/40", bg: "bg-violet-900/20", dot: "bg-violet-400" },
  orange: { border: "border-orange-600/40", bg: "bg-orange-900/20", dot: "bg-orange-400" },
};

const EMPTY = { title: "", content: "", color: "slate" };

export default function NotesPanel() {
  const { notes, loading, addNote, deleteNote } = useNotes();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!form.title.trim()) return;
    setSaving(true);
    await addNote(form.title.trim(), form.content.trim(), form.color);
    setForm(EMPTY);
    setShowForm(false);
    setSaving(false);
  }

  function colorStyle(c: string) { return COLOR_STYLES[c] || COLOR_STYLES.slate; }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-slate-800/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen size={16} className="text-emerald-400" />
          <span className="text-sm font-semibold text-slate-200">Notes</span>
          {notes.length > 0 && (
            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 rounded-full px-2 py-0.5 font-medium">{notes.length}</span>
          )}
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="w-7 h-7 rounded-lg bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center transition-colors"
        >
          {showForm ? <X size={14} className="text-white" /> : <Plus size={14} className="text-white" />}
        </button>
      </div>

      {showForm && (
        <div className="px-4 py-3 border-b border-slate-800/50 bg-slate-800/30 space-y-2.5 animate-slide-up">
          <input
            type="text"
            placeholder="Note title *"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            autoFocus
            className="w-full text-sm bg-slate-800 text-white placeholder-slate-500 rounded-xl px-3 py-2 border border-slate-700/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
          <textarea
            placeholder="Write your note..."
            value={form.content}
            onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            rows={3}
            className="w-full text-sm bg-slate-800 text-white placeholder-slate-500 rounded-xl px-3 py-2 border border-slate-700/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none"
          />
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Color:</span>
            {NOTE_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setForm((f) => ({ ...f, color: c }))}
                className={`w-6 h-6 rounded-full ${colorStyle(c).dot} transition-transform ${
                  form.color === c ? "scale-125 ring-2 ring-white ring-offset-2 ring-offset-slate-800" : "hover:scale-110"
                }`}
              />
            ))}
          </div>
          <button
            onClick={save}
            disabled={!form.title.trim() || saving}
            className="w-full py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white text-sm font-medium transition-colors flex items-center justify-center gap-1.5"
          >
            <Check size={16} /> Save Note
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center h-20"><p className="text-slate-500 text-sm">Loading...</p></div>
        ) : notes.length === 0 && !showForm ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mb-3">
              <BookOpen size={24} className="text-slate-600" />
            </div>
            <p className="text-sm text-slate-400">No notes yet</p>
            <p className="text-xs text-slate-600 mt-1">Tap + to create one</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {notes.map((note) => {
              const cs = colorStyle(note.color);
              return (
                <div key={note.id} className={`rounded-xl border p-3 ${cs.bg} ${cs.border} animate-fade-in`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={`w-2 h-2 rounded-full ${cs.dot}`} />
                        <p className="text-sm font-medium text-slate-200 truncate">{note.title}</p>
                      </div>
                      {note.content && <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">{note.content}</p>}
                      <p className="text-[10px] text-slate-600 mt-1.5">
                        {new Date(note.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteNote(note.id)}
                      className="w-7 h-7 rounded-lg bg-slate-700/40 hover:bg-red-500/20 text-slate-400 hover:text-red-400 flex items-center justify-center transition-colors flex-shrink-0"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

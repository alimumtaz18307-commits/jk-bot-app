import { useState } from "react";
import { Plus, Trash2, Bell, X, Check } from "lucide-react";
import { useReminders } from "../hooks/useReminders";
import { DAY_LABELS } from "../lib/types";

const EMPTY = { title: "", description: "", time: "08:00", days: [1, 2, 3, 4, 5] };

function formatTime(t: string): string {
  const [h, m] = t.split(":");
  const hour = parseInt(h);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
}

function formatDays(d: number[]): string {
  if (d.length === 7) return "Every day";
  if (d.length === 5 && [1,2,3,4,5].every((x) => d.includes(x))) return "Weekdays";
  if (d.length === 2 && [0,6].every((x) => d.includes(x))) return "Weekends";
  return d.map((x) => DAY_LABELS[x]).join(", ");
}

export default function RemindersPanel() {
  const { reminders, loading, addReminder, toggleReminder, deleteReminder } = useReminders();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  function toggleDay(day: number) {
    setForm((f) => ({
      ...f,
      days: f.days.includes(day) ? f.days.filter((d) => d !== day) : [...f.days, day].sort(),
    }));
  }

  async function save() {
    if (!form.title.trim() || form.days.length === 0) return;
    setSaving(true);
    await addReminder(form.title.trim(), form.description.trim(), form.time, form.days);
    setForm(EMPTY);
    setShowForm(false);
    setSaving(false);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-slate-800/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell size={16} className="text-amber-400" />
          <span className="text-sm font-semibold text-slate-200">Reminders</span>
          {reminders.length > 0 && (
            <span className="text-[10px] bg-amber-500/20 text-amber-400 rounded-full px-2 py-0.5 font-medium">
              {reminders.filter((r) => r.is_active).length} active
            </span>
          )}
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="w-7 h-7 rounded-lg bg-amber-500 hover:bg-amber-600 flex items-center justify-center transition-colors"
        >
          {showForm ? <X size={14} className="text-white" /> : <Plus size={14} className="text-white" />}
        </button>
      </div>

      {showForm && (
        <div className="px-4 py-3 border-b border-slate-800/50 bg-slate-800/30 space-y-2.5 animate-slide-up">
          <input
            type="text"
            placeholder="Reminder title *"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            autoFocus
            className="w-full text-sm bg-slate-800 text-white placeholder-slate-500 rounded-xl px-3 py-2 border border-slate-700/50 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className="w-full text-sm bg-slate-800 text-white placeholder-slate-500 rounded-xl px-3 py-2 border border-slate-700/50 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
          />
          <input
            type="time"
            value={form.time}
            onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
            className="w-full text-sm bg-slate-800 text-white rounded-xl px-3 py-2 border border-slate-700/50 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
          />
          <div>
            <p className="text-xs text-slate-500 mb-1.5">Days</p>
            <div className="flex gap-1">
              {DAY_LABELS.map((label, idx) => (
                <button
                  key={idx}
                  onClick={() => toggleDay(idx)}
                  className={`flex-1 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                    form.days.includes(idx) ? "bg-amber-500 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={save}
            disabled={!form.title.trim() || form.days.length === 0 || saving}
            className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white text-sm font-medium transition-colors flex items-center justify-center gap-1.5"
          >
            <Check size={16} /> Set Reminder
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center h-20"><p className="text-slate-500 text-sm">Loading...</p></div>
        ) : reminders.length === 0 && !showForm ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mb-3">
              <Bell size={24} className="text-slate-600" />
            </div>
            <p className="text-sm text-slate-400">No reminders yet</p>
            <p className="text-xs text-slate-600 mt-1">Tap + to set one</p>
          </div>
        ) : (
          reminders.map((r) => (
            <div
              key={r.id}
              className={`rounded-xl border p-3 transition-all animate-fade-in ${
                r.is_active ? "bg-slate-800/40 border-slate-700/50" : "bg-slate-800/20 border-slate-800 opacity-60"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className={`text-sm font-medium truncate ${r.is_active ? "text-slate-200" : "text-slate-500 line-through"}`}>{r.title}</p>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${r.is_active ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-700 text-slate-400"}`}>
                      {r.is_active ? "On" : "Off"}
                    </span>
                  </div>
                  {r.description && <p className="text-xs text-slate-500 mb-1">{r.description}</p>}
                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <span className="font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">{formatTime(r.remind_at)}</span>
                    <span>{formatDays(r.days_of_week)}</span>
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => toggleReminder(r.id, !r.is_active)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${r.is_active ? "bg-brand-600" : "bg-slate-700"}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${r.is_active ? "translate-x-5" : "translate-x-0.5"}`} />
                  </button>
                  <button
                    onClick={() => deleteReminder(r.id)}
                    className="w-7 h-7 rounded-lg bg-slate-700/40 hover:bg-red-500/20 text-slate-400 hover:text-red-400 flex items-center justify-center transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

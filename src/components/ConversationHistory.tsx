import { useState, useEffect } from "react";
import { X, MessageCircle, Trash2, Clock } from "lucide-react";
import { supabase } from "../lib/supabase";

interface Session {
  date: string;
  preview: string;
  count: number;
}

interface Props {
  onClose: () => void;
  onClearAll: () => void;
}

export default function ConversationHistory({ onClose, onClearAll }: Props) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from("chat_messages")
        .select("content, role, created_at")
        .order("created_at", { ascending: false })
        .limit(200);

      if (!data) { setLoading(false); return; }

      // Group by calendar date
      const byDate: Record<string, { preview: string; count: number }> = {};
      for (const msg of data) {
        const day = new Date(msg.created_at).toLocaleDateString("en-IN", {
          day: "numeric", month: "short", year: "numeric",
        });
        if (!byDate[day]) {
          const preview = msg.content?.slice(0, 60) || "";
          byDate[day] = { preview, count: 0 };
        }
        byDate[day].count++;
      }

      setSessions(
        Object.entries(byDate).map(([date, v]) => ({ date, ...v }))
      );
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="absolute inset-0 z-40 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="relative ml-auto w-72 h-full bg-[#1a1a1f] border-l border-white/8 flex flex-col shadow-2xl animate-slide-from-right">
        <div className="flex items-center justify-between p-4 border-b border-white/8">
          <span className="text-sm font-semibold text-white flex items-center gap-2">
            <Clock size={15} className="text-blue-400" /> History
          </span>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <X size={14} className="text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loading ? (
            <div className="flex justify-center pt-8">
              <div className="w-5 h-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center pt-12">
              <MessageCircle size={32} className="mx-auto text-gray-700 mb-3" />
              <p className="text-xs text-gray-500">No conversation history yet</p>
            </div>
          ) : (
            sessions.map((s) => (
              <div
                key={s.date}
                className="bg-white/4 hover:bg-white/7 border border-white/6 rounded-xl p-3 cursor-default transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-medium text-blue-400">{s.date}</span>
                  <span className="text-[10px] text-gray-600">{s.count} msgs</span>
                </div>
                <p className="text-xs text-gray-400 line-clamp-2">{s.preview}</p>
              </div>
            ))
          )}
        </div>

        <div className="p-3 border-t border-white/8">
          <button
            onClick={() => { onClearAll(); onClose(); }}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium transition-colors"
          >
            <Trash2 size={13} /> Clear all history
          </button>
        </div>
      </div>
    </div>
  );
}

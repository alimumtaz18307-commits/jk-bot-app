import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import type { Reminder } from "../lib/types";

export function useReminders() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  const loadReminders = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("reminders").select("*").order("created_at", { ascending: false });
    if (error) console.error("Load reminders:", error.message);
    else setReminders((data as Reminder[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadReminders(); }, [loadReminders]);

  const addReminder = useCallback(async (title: string, description: string, remindAt: string, daysOfWeek: number[]) => {
    const { data, error } = await supabase.from("reminders").insert({
      title, description: description || null, remind_at: remindAt, days_of_week: daysOfWeek, is_active: true,
    }).select().single();
    if (error) { console.error("Add reminder:", error.message); return null; }
    if (data) { setReminders((prev) => [data as Reminder, ...prev]); return data as Reminder; }
    return null;
  }, []);

  const toggleReminder = useCallback(async (id: string, isActive: boolean) => {
    const { error } = await supabase.from("reminders").update({ is_active: isActive }).eq("id", id);
    if (error) { console.error("Toggle reminder:", error.message); return; }
    setReminders((prev) => prev.map((r) => (r.id === id ? { ...r, is_active: isActive } : r)));
  }, []);

  const deleteReminder = useCallback(async (id: string) => {
    const { error } = await supabase.from("reminders").delete().eq("id", id);
    if (error) { console.error("Delete reminder:", error.message); return; }
    setReminders((prev) => prev.filter((r) => r.id !== id));
  }, []);

  return { reminders, loading, addReminder, toggleReminder, deleteReminder };
}

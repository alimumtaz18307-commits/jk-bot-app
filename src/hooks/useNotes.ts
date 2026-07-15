import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import type { Note } from "../lib/types";

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("notes").select("*").order("created_at", { ascending: false });
    if (error) console.error("Load notes:", error.message);
    else setNotes((data as Note[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadNotes(); }, [loadNotes]);

  const addNote = useCallback(async (title: string, content: string, color: string) => {
    const { data, error } = await supabase.from("notes").insert({ title, content, color }).select().single();
    if (error) { console.error("Add note:", error.message); return null; }
    if (data) { setNotes((prev) => [data as Note, ...prev]); return data as Note; }
    return null;
  }, []);

  const updateNote = useCallback(async (id: string, updates: Partial<Pick<Note, "title" | "content" | "color">>) => {
    const { data, error } = await supabase.from("notes").update({ ...updates, updated_at: new Date().toISOString() }).eq("id", id).select().single();
    if (error) { console.error("Update note:", error.message); return; }
    if (data) setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...(data as Note) } : n)));
  }, []);

  const deleteNote = useCallback(async (id: string) => {
    const { error } = await supabase.from("notes").delete().eq("id", id);
    if (error) { console.error("Delete note:", error.message); return; }
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return { notes, loading, addNote, updateNote, deleteNote };
}

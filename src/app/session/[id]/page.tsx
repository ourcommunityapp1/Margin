"use client";

import { useEffect, useRef, useState } from "react";
import { getSupabase, type Note } from "@/lib/supabase";

const HARDCODED_SESSION_ID = "a1b2c3d4-0000-0000-0000-000000000001";
const HARDCODED_TITLE = "The Life of Jesus";
const HARDCODED_PRESENCE = 14;

function getDeviceId(): string {
  let deviceId = localStorage.getItem("margin_device_id");
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem("margin_device_id", deviceId);
  }
  return deviceId;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function SessionPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setDeviceId(getDeviceId());
  }, []);

  useEffect(() => {
    getSupabase()
      .from("notes")
      .select("*")
      .eq("session_id", HARDCODED_SESSION_ID)
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (error) console.error("Fetch error:", error);
        if (data) setNotes(data as Note[]);
      });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [notes]);

  async function handleSubmit() {
    const content = input.trim();
    if (!content || !deviceId || submitting) return;

    const optimistic: Note = {
      id: crypto.randomUUID(),
      session_id: HARDCODED_SESSION_ID,
      device_id: deviceId,
      content,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setNotes((prev) => [...prev, optimistic]);
    setInput("");
    setSubmitting(true);

    const { data, error } = await getSupabase()
      .from("notes")
      .insert({ session_id: HARDCODED_SESSION_ID, device_id: deviceId, content })
      .select()
      .single();

    if (error) {
      console.error("Insert error:", error);
    } else if (data) {
      setNotes((prev) =>
        prev.map((n) => (n.id === optimistic.id ? (data as Note) : n))
      );
    }

    setSubmitting(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="flex flex-col h-dvh bg-[#F3F0EE] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-14 pb-4">
        <button className="bg-white rounded-full p-3 shadow-sm">
          <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
            <path d="M1 1h16M1 7h16M1 13h16" stroke="#535353" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        <h1 className="text-[25px] font-medium text-black leading-none">
          {HARDCODED_TITLE}
        </h1>

        <div className="bg-white rounded-full px-3 py-2 flex items-center gap-1.5 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-[#C0392B] flex-shrink-0" />
          <span className="text-[13px] font-medium text-[#535353]">
            {HARDCODED_PRESENCE} Here
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 px-4 pb-5">
        <button className="bg-[rgba(67,61,61,0.85)] text-white rounded-lg px-5 py-1.5 text-[14px] font-medium">
          My Notes
        </button>
        <button className="bg-white text-[#535353] rounded-lg px-5 py-1.5 text-[14px]">
          Shared Note
        </button>
      </div>

      {/* Notes list */}
      <div className="flex-1 overflow-y-auto px-5">
        {notes.length === 0 ? (
          <p className="text-[13px] text-[#afafaf] mt-2">
            Your notes will appear here.
          </p>
        ) : (
          <div className="space-y-5">
            {notes.map((note) => (
              <div key={note.id}>
                <p className="text-[10px] text-[#AFAFAF] mb-0.5" style={{ letterSpacing: "-0.5px" }}>
                  {formatTime(note.created_at)}
                </p>
                <p className="text-[18px] font-medium text-[#535353] leading-[20px]" style={{ letterSpacing: "-1px" }}>
                  {note.content}
                </p>
              </div>
            ))}
          </div>
        )}
        <div ref={bottomRef} className="h-4" />
      </div>

      {/* Input bar */}
      <div className="px-4 pb-8 pt-2">
        <div className="bg-white rounded-full flex items-center pl-5 pr-2 py-2 shadow-sm">
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Start your note"
            className="flex-1 bg-transparent outline-none text-[16px] text-[#535353] placeholder-[#8D8585] resize-none leading-[30px] max-h-32 overflow-y-auto"
            style={{ fontFamily: "var(--font-geist), sans-serif" }}
          />
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || submitting}
            className="bg-[#d58733] rounded-full w-9 h-9 flex items-center justify-center ml-2 flex-shrink-0 disabled:opacity-40 transition-opacity"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 12V2M2 7l5-5 5 5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

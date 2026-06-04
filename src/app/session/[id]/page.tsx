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
    <div className="flex flex-col h-dvh overflow-hidden" style={{ background: "rgba(243, 240, 238, 0.5)" }}>
      {/* Header: title left + hamburger right, presence below title */}
      <div className="flex items-start justify-between px-[26px] pt-14 pb-3">
        <div>
          <h1 className="text-[25px] font-medium text-black leading-[25px]">
            {HARDCODED_TITLE}
          </h1>
          <div className="flex items-center gap-1.5 mt-2">
            <span className="w-[7px] h-[7px] rounded-full flex-shrink-0" style={{ background: "#D42619" }} />
            <span className="text-[15px] text-[#535353]">
              {HARDCODED_PRESENCE} Here
            </span>
          </div>
        </div>

        <button className="mt-1">
          <svg width="15" height="10" viewBox="0 0 15 10" fill="none">
            <path d="M0 0h15" stroke="#817E7E" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M3 5h12" stroke="#817E7E" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M6 10h9" stroke="#817E7E" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Notes list */}
      <div className="flex-1 overflow-y-auto px-[23px] pt-2">
        {notes.length === 0 ? (
          <p className="text-[13px] text-[#afafaf] mt-2">
            Your notes will appear here.
          </p>
        ) : (
          <div className="space-y-5">
            {notes.map((note) => (
              <div key={note.id}>
                <p className="text-[10px] text-[#AFAFAF] mb-0.5 leading-[20px]" style={{ letterSpacing: "-0.5px" }}>
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
      <div className="px-[7px] pb-8 pt-2">
        <div className="rounded-[29px] flex items-center pl-[25px] pr-2 py-2.5" style={{ background: "rgba(255, 255, 255, 0.8)" }}>
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
            className="rounded-[14.5px] w-[52px] h-[29px] flex items-center justify-center ml-2 flex-shrink-0 disabled:opacity-40 transition-opacity"
            style={{ background: "#D42619" }}
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path d="M7.5 13V2M1 7.5l6.5-6.5 6.5 6.5" stroke="white" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

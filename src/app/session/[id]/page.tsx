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

// ── Icons ────────────────────────────────────────────────────────────────────

function IconLink() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M7.5 9.75a3.75 3.75 0 0 0 5.657 0l2.25-2.25a3.75 3.75 0 0 0-5.303-5.303l-1.29 1.283" stroke="#535353" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M10.5 8.25a3.75 3.75 0 0 0-5.657 0L2.593 10.5a3.75 3.75 0 0 0 5.303 5.303l1.283-1.29" stroke="#535353" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconQR() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="2" y="2" width="5.5" height="5.5" rx="1" stroke="#535353" strokeWidth="1.5"/>
      <rect x="10.5" y="2" width="5.5" height="5.5" rx="1" stroke="#535353" strokeWidth="1.5"/>
      <rect x="2" y="10.5" width="5.5" height="5.5" rx="1" stroke="#535353" strokeWidth="1.5"/>
      <rect x="3.5" y="3.5" width="2.5" height="2.5" fill="#535353"/>
      <rect x="12" y="3.5" width="2.5" height="2.5" fill="#535353"/>
      <rect x="3.5" y="12" width="2.5" height="2.5" fill="#535353"/>
      <path d="M10.5 10.5h2.5v2.5h-2.5v2.5h2.5M15.5 10.5v2.5h-2.5M15.5 15.5h-2.5" stroke="#535353" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconEye() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M1.5 9s3-5.25 7.5-5.25S16.5 9 16.5 9s-3 5.25-7.5 5.25S1.5 9 1.5 9Z" stroke="#535353" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="9" cy="9" r="2.25" stroke="#535353" strokeWidth="1.5"/>
    </svg>
  );
}

function IconPlus() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M9 3.75v10.5M3.75 9h10.5" stroke="#535353" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function IconClose() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M1 1l12 12M13 1L1 13" stroke="#817E7E" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

// ── Menu drawer ──────────────────────────────────────────────────────────────

interface MenuDrawerProps {
  open: boolean;
  onClose: () => void;
  sessionUrl: string;
}

function MenuDrawer({ open, onClose, sessionUrl }: MenuDrawerProps) {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  function copyLink() {
    navigator.clipboard.writeText(sessionUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // Reset QR state when drawer closes
  useEffect(() => {
    if (!open) setShowQR(false);
  }, [open]);

  const items = [
    {
      icon: <IconLink />,
      label: copied ? "Copied!" : "Share link",
      action: copyLink,
    },
    {
      icon: <IconQR />,
      label: "Share QR code",
      action: () => setShowQR((v) => !v),
    },
    {
      icon: <IconEye />,
      label: "View shared notes",
      action: () => {},
    },
    {
      icon: <IconPlus />,
      label: "New session",
      action: () => {},
    },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-40 transition-opacity duration-300"
        style={{
          background: "rgba(0,0,0,0.25)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
        }}
      />

      {/* Drawer panel */}
      <div
        className="fixed top-0 right-0 h-full z-50 flex flex-col"
        style={{
          width: "78vw",
          maxWidth: 300,
          background: "#F3F0EE",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)",
          boxShadow: open ? "-8px 0 32px rgba(0,0,0,0.10)" : "none",
        }}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-6 pt-14 pb-5">
          <span className="text-[13px] text-[#AFAFAF] tracking-wide uppercase" style={{ letterSpacing: "0.08em" }}>
            Menu
          </span>
          <button onClick={onClose} className="p-1">
            <IconClose />
          </button>
        </div>

        {/* Session title */}
        <div className="px-6 pb-5 border-b border-[#E0DCDA]">
          <p className="text-[17px] font-medium text-black leading-snug">
            {HARDCODED_TITLE}
          </p>
        </div>

        {/* Menu items */}
        <div className="flex flex-col pt-2">
          {items.map((item, i) => (
            <button
              key={i}
              onClick={item.action}
              className="flex items-center gap-4 px-6 py-4 text-left active:bg-black/5 transition-colors"
            >
              <span className="flex-shrink-0">{item.icon}</span>
              <span className="text-[16px] text-[#535353]">{item.label}</span>
            </button>
          ))}
        </div>

        {/* QR code panel */}
        {showQR && (
          <div className="mx-6 mt-2 p-5 rounded-2xl flex flex-col items-center gap-3" style={{ background: "rgba(255,255,255,0.8)" }}>
            <div className="w-[160px] h-[160px] bg-white rounded-xl flex items-center justify-center">
              {/* QR placeholder — replace inner content with <QRCodeSVG> once qrcode.react is installed */}
              <div className="w-[140px] h-[140px] rounded-lg flex items-center justify-center" style={{ background: "#f0ede9" }}>
                <span className="text-[11px] text-[#AFAFAF] text-center px-2">Install qrcode.react to render QR</span>
              </div>
            </div>
            <p className="text-[12px] text-[#AFAFAF] text-center break-all px-1">{sessionUrl}</p>
          </div>
        )}
      </div>
    </>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function SessionPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLDivElement>(null);

  const sessionUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/session/${HARDCODED_SESSION_ID}`
      : "";

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
    if (inputRef.current) inputRef.current.innerText = "";
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

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="flex flex-col h-dvh overflow-hidden" style={{ background: "rgba(243, 240, 238, 0.5)" }}>
      {/* Header */}
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

        <button className="mt-1 p-1 -mr-1" onClick={() => setMenuOpen(true)}>
          <svg width="22" height="15" viewBox="0 0 22 15" fill="none">
            <path d="M0 0.75h22" stroke="#817E7E" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M4 7.5h18" stroke="#817E7E" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M8 14.25h14" stroke="#817E7E" strokeWidth="1.5" strokeLinecap="round" />
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
          <div
            ref={inputRef}
            contentEditable
            suppressContentEditableWarning
            onInput={(e) => setInput((e.currentTarget as HTMLDivElement).innerText)}
            onKeyDown={handleKeyDown}
            data-placeholder="Start your note"
            className="flex-1 bg-transparent outline-none text-[16px] text-[#535353] leading-[30px] max-h-32 overflow-y-auto empty:before:content-[attr(data-placeholder)] empty:before:text-[#8D8585] empty:before:pointer-events-none"
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

      <MenuDrawer
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        sessionUrl={sessionUrl}
      />
    </div>
  );
}

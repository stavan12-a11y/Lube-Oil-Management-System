import { useEffect, useRef, useState, type ReactNode } from "react";
import type { EquipmentStatus } from "../types";
import { STATUS_META } from "../lib/derive";
import { PencilIcon } from "./icons";

export function StatusDot({
  status,
  pulse = false,
  size = "md",
}: {
  status: EquipmentStatus;
  pulse?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const dims = size === "sm" ? "h-2.5 w-2.5" : size === "lg" ? "h-4 w-4" : "h-3 w-3";
  const meta = STATUS_META[status];
  return (
    <span
      className={`inline-block rounded-full ${dims} ${meta.dot} ${
        pulse && status === "testing" ? "animate-pulse-ring" : ""
      }`}
      title={meta.label}
      aria-label={meta.label}
    />
  );
}

const BADGE_RING: Record<EquipmentStatus, string> = {
  critical: "bg-red-100 text-red-800 ring-red-600/20",
  testing: "bg-amber-100 text-amber-800 ring-amber-600/20",
  normal: "bg-emerald-100 text-emerald-800 ring-emerald-600/20",
  none: "bg-slate-100 text-slate-600 ring-slate-500/20",
};

export function StatusBadge({ status }: { status: EquipmentStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${BADGE_RING[status]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {meta.label}
    </span>
  );
}

export function Warning({
  tone,
  children,
}: {
  tone: "danger" | "warn";
  children: ReactNode;
}) {
  const styles =
    tone === "danger"
      ? "bg-red-100 text-red-800 ring-red-600/20"
      : "bg-amber-100 text-amber-800 ring-amber-600/20";
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${styles}`}
    >
      {children}
    </span>
  );
}

/** Lightweight click-to-edit text used for inline notes (no field label chrome). */
export function InlineText({
  value,
  onCommit,
  placeholder = "Add a note…",
  multiline = true,
  className = "",
}: {
  value: string;
  onCommit: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  useEffect(() => {
    if (editing && ref.current) ref.current.focus();
  }, [editing]);

  function commit() {
    if (draft.trim() !== value.trim()) onCommit(draft.trim());
    setEditing(false);
  }

  if (editing) {
    const shared = {
      ref: ref as never,
      value: draft,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setDraft(e.target.value),
      onBlur: commit,
      className:
        "w-full resize-none rounded-md border border-oil-700 bg-white px-2.5 py-1.5 text-xs text-slate-700 shadow-sm outline-none ring-1 ring-oil-700/30",
    };
    return multiline ? (
      <textarea
        {...shared}
        rows={2}
        onKeyDown={(e) => {
          if (e.key === "Escape") setEditing(false);
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) commit();
        }}
      />
    ) : (
      <input
        {...shared}
        onKeyDown={(e) => {
          if (e.key === "Escape") setEditing(false);
          if (e.key === "Enter") commit();
        }}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={`group/inline flex w-full items-start gap-1.5 rounded-md px-2.5 py-1.5 text-left text-xs transition hover:bg-slate-100 ${className}`}
    >
      <span className={value ? "text-slate-600" : "italic text-slate-400"}>
        {value || placeholder}
      </span>
      <PencilIcon className="ml-auto mt-0.5 h-3 w-3 shrink-0 text-slate-300 opacity-0 transition group-hover/inline:opacity-100" />
    </button>
  );
}

interface EditableFieldProps {
  label: string;
  value: string;
  onCommit: (value: string) => void;
  type?: "text" | "date" | "number";
  multiline?: boolean;
  icon?: ReactNode;
  suffix?: string;
}

export function EditableField({
  label,
  value,
  onCommit,
  type = "text",
  multiline = false,
  icon,
  suffix,
}: EditableFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      if (inputRef.current instanceof HTMLInputElement) {
        inputRef.current.select();
      }
    }
  }, [editing]);

  function commit() {
    const trimmed = draft.trim();
    if (trimmed !== value.trim()) onCommit(trimmed);
    setEditing(false);
  }

  function cancel() {
    setDraft(value);
    setEditing(false);
  }

  return (
    <div className="group rounded-lg border border-transparent px-3 py-2 transition hover:border-slate-200 hover:bg-slate-50">
      <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {icon}
        {label}
      </div>
      {editing ? (
        multiline ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={draft}
            rows={3}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Escape") cancel();
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) commit();
            }}
            className="w-full resize-none rounded-md border border-oil-700 bg-white px-2 py-1.5 text-sm text-slate-800 shadow-sm outline-none ring-1 ring-oil-700/30"
          />
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type={type}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Escape") cancel();
              if (e.key === "Enter") commit();
            }}
            className="w-full rounded-md border border-oil-700 bg-white px-2 py-1.5 text-sm text-slate-800 shadow-sm outline-none ring-1 ring-oil-700/30"
          />
        )
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="flex w-full items-start justify-between gap-2 text-left"
        >
          <span className="text-sm font-medium text-slate-800">
            {value ? (
              <>
                {value}
                {suffix ? <span className="text-slate-400"> {suffix}</span> : null}
              </>
            ) : (
              <span className="italic text-slate-400">Not set</span>
            )}
          </span>
          <PencilIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-300 opacity-0 transition group-hover:opacity-100" />
        </button>
      )}
    </div>
  );
}

export function Select({
  label,
  value,
  options,
  onChange,
  icon,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-transparent px-3 py-2 transition hover:border-slate-200 hover:bg-slate-50">
      <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {icon}
        {label}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-800 shadow-sm outline-none focus:border-oil-700 focus:ring-1 focus:ring-oil-700"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

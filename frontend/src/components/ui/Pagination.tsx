"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

export function Pagination({
  page,
  totalPages,
  total,
  onChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) {
    return <p className="px-1 py-3 text-xs text-zinc-500">{total} record{total === 1 ? "" : "s"}</p>;
  }
  return (
    <div className="flex items-center justify-between px-1 py-3 text-sm">
      <span className="text-xs text-zinc-500">
        Page {page} of {totalPages} · {total} records
      </span>
      <div className="flex gap-1">
        <button
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className="inline-flex items-center gap-1 rounded-md border border-zinc-300 px-2 py-1 text-xs disabled:opacity-40 dark:border-zinc-700"
        >
          <ChevronLeft size={14} /> Prev
        </button>
        <button
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          className="inline-flex items-center gap-1 rounded-md border border-zinc-300 px-2 py-1 text-xs disabled:opacity-40 dark:border-zinc-700"
        >
          Next <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

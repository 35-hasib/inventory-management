import { ReactNode } from "react";
import clsx from "clsx";

type Tone = "gray" | "green" | "red" | "amber" | "blue" | "indigo";

const tones: Record<Tone, string> = {
  gray: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  green: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400",
  red: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
  amber: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  indigo: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400",
};

export function Badge({ tone = "gray", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={clsx("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", tones[tone])}>
      {children}
    </span>
  );
}

// Map a domain status string to a badge tone.
export function statusTone(status: string): Tone {
  switch (status) {
    case "COMPLETED":
    case "RECEIVED":
    case "ACTIVE":
    case "SUCCEEDED":
      return "green";
    case "CANCELLED":
    case "FAILED":
    case "EXPIRED":
      return "red";
    case "REFUNDED":
    case "PAST_DUE":
    case "TRIALING":
    case "PENDING":
      return "amber";
    default:
      return "gray";
  }
}

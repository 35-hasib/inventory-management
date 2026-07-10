import { ReactNode } from "react";
import clsx from "clsx";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={clsx(
        "rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900",
        className
      )}
    >
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon,
  iconClass = "bg-indigo-50 text-indigo-600 dark:bg-indigo-950",
}: {
  label: string;
  value: string | number;
  icon?: ReactNode;
  iconClass?: string;
}) {
  return (
    <Card className="flex items-center gap-4">
      {icon && (
        <div className={clsx("flex h-11 w-11 items-center justify-center rounded-lg", iconClass)}>
          {icon}
        </div>
      )}
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
        <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{value}</p>
      </div>
    </Card>
  );
}

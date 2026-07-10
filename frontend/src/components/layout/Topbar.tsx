"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, Bell, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { user, logout } = useAuth();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let active = true;
    const load = () =>
      api<{ count: number }>("/notifications/unread-count")
        .then((r) => active && setUnread(r.count))
        .catch(() => {});
    load();
    const t = setInterval(load, 30000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, []);

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-zinc-200 bg-white/90 px-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
      <button onClick={onMenu} className="rounded p-2 text-zinc-500 hover:bg-zinc-100 lg:hidden dark:hover:bg-zinc-800">
        <Menu size={20} />
      </button>
      <div className="flex flex-1 items-center justify-end gap-3">
        <Link href="/notifications" className="relative rounded p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">
          <Bell size={18} />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Link>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
            {user?.name?.charAt(0)?.toUpperCase() || "?"}
          </div>
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium leading-tight text-zinc-800 dark:text-zinc-100">{user?.name}</p>
            <p className="text-[11px] capitalize text-zinc-400">{user?.role?.toLowerCase()}</p>
          </div>
        </div>
        <button
          onClick={logout}
          title="Log out"
          className="rounded p-2 text-zinc-500 hover:bg-zinc-100 hover:text-red-600 dark:hover:bg-zinc-800"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { useToast } from "@/components/ui/Toast";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Pagination } from "@/components/ui/Pagination";
import type { NotificationItem, Paginated } from "@/lib/types";
import { Bell, CheckCheck } from "lucide-react";

const TONE: Record<string, "red" | "amber" | "blue" | "green" | "gray"> = {
  OUT_OF_STOCK: "red",
  LOW_STOCK: "amber",
  PAYMENT: "green",
  SUBSCRIPTION: "blue",
  SYSTEM: "gray",
};

export default function NotificationsPage() {
  const toast = useToast();
  const [data, setData] = useState<Paginated<NotificationItem> | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await api<Paginated<NotificationItem>>("/notifications", { query: { page } }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [page, toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function markRead(id: string) {
    await api(`/notifications/${id}/read`, { method: "PUT" }).catch(() => {});
    load();
  }
  async function markAll() {
    await api("/notifications/read-all", { method: "PUT" }).catch(() => {});
    toast.success("All marked as read");
    load();
  }

  const items = data?.data || [];

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle="Low-stock alerts and system messages"
        actions={<Button variant="outline" onClick={markAll}><CheckCheck size={16} /> Mark all read</Button>}
      />

      <div className="space-y-2">
        {loading ? (
          <p className="text-sm text-zinc-400">Loading…</p>
        ) : items.length === 0 ? (
          <Card><p className="py-6 text-center text-sm text-zinc-400">No notifications</p></Card>
        ) : (
          items.map((n) => (
            <Card key={n.id} className={n.isRead ? "opacity-70" : "border-l-4 border-l-indigo-500"}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <Bell size={18} className="mt-0.5 text-zinc-400" />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{n.title}</p>
                      <Badge tone={TONE[n.type] || "gray"}>{n.type.replace("_", " ")}</Badge>
                    </div>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">{n.message}</p>
                    <p className="mt-1 text-xs text-zinc-400">{formatDateTime(n.createdAt)}</p>
                  </div>
                </div>
                {!n.isRead && <Button size="sm" variant="ghost" onClick={() => markRead(n.id)}>Mark read</Button>}
              </div>
            </Card>
          ))
        )}
      </div>

      {data && <Pagination page={data.meta.page} totalPages={data.meta.totalPages} total={data.meta.total} onChange={setPage} />}
    </div>
  );
}

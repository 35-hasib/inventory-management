"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { money, formatDate } from "@/lib/format";
import { useToast } from "@/components/ui/Toast";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { Table, THead, TH, TBody, TR, TD, EmptyRow } from "@/components/ui/Table";
import { Badge, statusTone } from "@/components/ui/Badge";
import type { User, Plan, Subscription, Payment } from "@/lib/types";
import clsx from "clsx";

const TABS = ["Company", "Users", "Billing"] as const;
type Tab = (typeof TABS)[number];

export default function SettingsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [tab, setTab] = useState<Tab>("Company");

  const visibleTabs = isAdmin ? TABS : (["Company"] as Tab[]);

  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage your company, team and subscription" />
      <div className="mb-5 flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
        {visibleTabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx(
              "border-b-2 px-4 py-2 text-sm font-medium",
              tab === t ? "border-indigo-600 text-indigo-600" : "border-transparent text-zinc-500 hover:text-zinc-800"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Company" && <CompanyTab isAdmin={isAdmin} />}
      {tab === "Users" && isAdmin && <UsersTab currentUserId={user!.id} />}
      {tab === "Billing" && isAdmin && <BillingTab />}
    </div>
  );
}

function CompanyTab({ isAdmin }: { isAdmin: boolean }) {
  const { company, refresh } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "", currency: "USD", invoicePrefix: "INV" });
  const [saving, setSaving] = useState(false);
  const [pwd, setPwd] = useState({ currentPassword: "", newPassword: "" });
  const [savingPwd, setSavingPwd] = useState(false);

  useEffect(() => {
    if (company) {
      setForm({
        name: company.name,
        email: company.email,
        phone: company.phone || "",
        address: company.address || "",
        currency: company.currency,
        invoicePrefix: company.invoicePrefix,
      });
    }
  }, [company]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api("/company", { method: "PUT", body: form });
      await refresh();
      toast.success("Company updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setSavingPwd(true);
    try {
      await api("/auth/change-password", { method: "POST", body: pwd });
      toast.success("Password changed");
      setPwd({ currentPassword: "", newPassword: "" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Change failed");
    } finally {
      setSavingPwd(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card>
        <h2 className="mb-4 text-sm font-semibold">Company profile</h2>
        <form onSubmit={save} className="space-y-3">
          <Field label="Name"><Input disabled={!isAdmin} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Email"><Input disabled={!isAdmin} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone"><Input disabled={!isAdmin} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="Currency"><Input disabled={!isAdmin} value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} /></Field>
          </div>
          <Field label="Address"><Input disabled={!isAdmin} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
          <Field label="Invoice prefix"><Input disabled={!isAdmin} value={form.invoicePrefix} onChange={(e) => setForm({ ...form, invoicePrefix: e.target.value })} /></Field>
          {isAdmin && <Button type="submit" loading={saving}>Save changes</Button>}
        </form>
      </Card>

      <Card>
        <h2 className="mb-4 text-sm font-semibold">Change password</h2>
        <form onSubmit={changePassword} className="space-y-3">
          <Field label="Current password"><Input type="password" required value={pwd.currentPassword} onChange={(e) => setPwd({ ...pwd, currentPassword: e.target.value })} /></Field>
          <Field label="New password"><Input type="password" required minLength={6} value={pwd.newPassword} onChange={(e) => setPwd({ ...pwd, newPassword: e.target.value })} /></Field>
          <Button type="submit" loading={savingPwd}>Update password</Button>
        </form>
      </Card>
    </div>
  );
}

function UsersTab({ currentUserId }: { currentUserId: string }) {
  const toast = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "EMPLOYEE" });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setUsers(await api<User[]>("/users"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load");
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setForm({ name: "", email: "", password: "", role: "EMPLOYEE" });
    setModal(true);
  }
  function openEdit(u: User) {
    setEditing(u);
    setForm({ name: u.name, email: u.email, password: "", role: u.role });
    setModal(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        const body: Record<string, unknown> = { name: form.name, role: form.role };
        if (form.password) body.password = form.password;
        await api(`/users/${editing.id}`, { method: "PUT", body });
        toast.success("User updated");
      } else {
        await api("/users", { method: "POST", body: form });
        toast.success("User created");
      }
      setModal(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!deleteId) return;
    try {
      await api(`/users/${deleteId}`, { method: "DELETE" });
      toast.success("User removed");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleteId(null);
    }
  }

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Button onClick={openCreate}>Add user</Button>
      </div>
      <Table>
        <THead><TR><TH>Name</TH><TH>Email</TH><TH>Role</TH><TH>Status</TH><TH className="text-right">Actions</TH></TR></THead>
        <TBody>
          {users.length === 0 ? <EmptyRow colSpan={5} /> : users.map((u) => (
            <TR key={u.id}>
              <TD className="font-medium">{u.name}</TD>
              <TD>{u.email}</TD>
              <TD><Badge tone={u.role === "ADMIN" ? "indigo" : "gray"}>{u.role}</Badge></TD>
              <TD>{u.isActive ? <Badge tone="green">Active</Badge> : <Badge tone="red">Inactive</Badge>}</TD>
              <TD className="text-right">
                <div className="flex justify-end gap-1">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(u)}>Edit</Button>
                  {u.id !== currentUserId && <Button size="sm" variant="ghost" onClick={() => setDeleteId(u.id)}>Delete</Button>}
                </div>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? "Edit User" : "Add User"}>
        <form onSubmit={save} className="space-y-3">
          <Field label="Name"><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Email"><Input type="email" required disabled={!!editing} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label={editing ? "New password (optional)" : "Password"}>
            <Input type="password" required={!editing} minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </Field>
          <Field label="Role">
            <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="EMPLOYEE">Employee</option>
              <option value="ADMIN">Admin</option>
            </Select>
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModal(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>{editing ? "Update" : "Create"}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={remove} message="Remove this user?" confirmLabel="Remove" />
    </div>
  );
}

function BillingTab() {
  const { company } = useAuth();
  const toast = useToast();
  const currency = company?.currency || "USD";
  const [plans, setPlans] = useState<Plan[]>([]);
  const [sub, setSub] = useState<Subscription | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    const [p, s, pay] = await Promise.all([
      api<Plan[]>("/subscriptions/plans").catch(() => []),
      api<Subscription | null>("/subscriptions").catch(() => null),
      api<Payment[]>("/subscriptions/payments").catch(() => []),
    ]);
    setPlans(p);
    setSub(s);
    setPayments(pay);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function change(tier: string) {
    setBusy(tier);
    try {
      await api("/subscriptions/change", { method: "POST", body: { tier } });
      toast.success("Subscription updated");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="space-y-6">
      {sub && (
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-zinc-500">Current plan</p>
              <p className="text-xl font-semibold">{sub.plan?.name}</p>
              <p className="text-sm text-zinc-500">Renews {formatDate(sub.currentPeriodEnd)}</p>
            </div>
            <Badge tone={statusTone(sub.status)}>{sub.status}</Badge>
          </div>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => {
          const current = sub?.plan?.tier === plan.tier;
          return (
            <Card key={plan.id} className={current ? "border-indigo-500 ring-1 ring-indigo-500" : ""}>
              <p className="text-sm font-semibold text-zinc-500">{plan.name}</p>
              <p className="my-2 text-3xl font-bold">{money(plan.priceMonthly, currency)}<span className="text-sm font-normal text-zinc-400">/mo</span></p>
              <ul className="mb-4 space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                <li>{plan.maxProducts === 0 ? "Unlimited" : plan.maxProducts} products</li>
                <li>{plan.maxUsers === 0 ? "Unlimited" : plan.maxUsers} users</li>
              </ul>
              <Button
                className="w-full"
                variant={current ? "secondary" : "primary"}
                disabled={current}
                loading={busy === plan.tier}
                onClick={() => change(plan.tier)}
              >
                {current ? "Current plan" : "Switch"}
              </Button>
            </Card>
          );
        })}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold">Payment history</h2>
        <Table>
          <THead><TR><TH>Date</TH><TH>Amount</TH><TH>Provider</TH><TH>Status</TH></TR></THead>
          <TBody>
            {payments.length === 0 ? <EmptyRow colSpan={4} message="No payments yet" /> : payments.map((p) => (
              <TR key={p.id}>
                <TD>{formatDate(p.createdAt)}</TD>
                <TD className="font-medium">{money(p.amount, currency)}</TD>
                <TD className="capitalize">{p.provider}</TD>
                <TD><Badge tone={statusTone(p.status)}>{p.status}</Badge></TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </div>
    </div>
  );
}

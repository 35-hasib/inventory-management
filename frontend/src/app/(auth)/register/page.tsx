"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { Boxes } from "lucide-react";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState({ companyName: "", name: "", email: "", password: "", phone: "" });
  const [loading, setLoading] = useState(false);

  function update(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await register(form);
      toast.success("Account created!");
      router.replace("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <Boxes size={22} />
          </div>
          <h1 className="text-xl font-semibold">Create your company</h1>
          <p className="text-sm text-zinc-500">Start managing your inventory in minutes</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <Field label="Company name">
            <Input required value={form.companyName} onChange={(e) => update("companyName", e.target.value)} placeholder="Acme Inc." />
          </Field>
          <Field label="Your name">
            <Input required value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Jane Doe" />
          </Field>
          <Field label="Email">
            <Input type="email" required value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="you@company.com" />
          </Field>
          <Field label="Password">
            <Input type="password" required minLength={6} value={form.password} onChange={(e) => update("password", e.target.value)} placeholder="At least 6 characters" />
          </Field>
          <Field label="Phone (optional)">
            <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+1 555 000 0000" />
          </Field>
          <Button type="submit" loading={loading} className="w-full">
            Create account
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-zinc-500">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-indigo-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

"use client";

import { ContactList } from "@/components/ContactList";
import { useAuth } from "@/lib/auth";

export default function SuppliersPage() {
  const { user } = useAuth();
  return (
    <ContactList
      resource="suppliers"
      title="Suppliers"
      subtitle="Manage your suppliers and their details"
      canCreate={user?.role === "ADMIN"}
    />
  );
}

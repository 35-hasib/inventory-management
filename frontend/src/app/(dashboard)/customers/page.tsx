"use client";

import { ContactList } from "@/components/ContactList";

export default function CustomersPage() {
  // Both roles may create/edit customers (needed at point of sale).
  return (
    <ContactList
      resource="customers"
      title="Customers"
      subtitle="Manage your customers and their details"
      canCreate
    />
  );
}

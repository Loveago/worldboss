"use client";

import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import TableLayout from "../../(templates)/TableLayout";
import TableCard from "../../(shell)/components/TableCard";
import { apiFetch } from "@/lib/api-client";

type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
  phone?: string | null;
  createdAt: string;
  _count?: { orders: number };
};

type AdminUserForm = {
  name: string;
  phone: string;
  role: AdminUser["role"];
};

const roleBadge = (role: AdminUser["role"]) => {
  const tones = role === "ADMIN" ? "bg-slate-900 text-white" : "bg-emerald-100 text-emerald-700";
  return <span className={`px-2 py-1 text-xs rounded-full ${tones}`}>{role}</span>;
};

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [form, setForm] = useState<AdminUserForm>({ name: "", phone: "", role: "USER" });

  const usersQuery = useQuery<AdminUser[]>({
    queryKey: ["admin-users"],
    queryFn: () => apiFetch<AdminUser[]>("/api/users"),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { id: string; data: AdminUserForm }) =>
      apiFetch(`/api/users/${payload.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload.data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setEditingUser(null);
      setForm({ name: "", phone: "", role: "USER" });
    },
  });

  const users = usersQuery.data ?? [];
  const errorMessage = usersQuery.isError
    ? usersQuery.error instanceof Error
      ? usersQuery.error.message
      : "Unable to load users."
    : null;

  const rows = useMemo(
    () =>
      users.map((user) => ({
        Name: (
          <div>
            <div className="font-semibold text-slate-900">{user.name}</div>
            <div className="text-xs text-slate-500">{user.phone ?? "No phone"}</div>
          </div>
        ),
        Role: roleBadge(user.role),
        Email: user.email,
        Orders: user._count?.orders ?? 0,
        Joined: new Date(user.createdAt).toLocaleDateString(),
        Actions: (
          <button
            className="text-xs px-3 py-1 rounded-full border border-slate-200"
            onClick={() => {
              setEditingUser(user);
              setForm({ name: user.name, phone: user.phone ?? "", role: user.role });
            }}
          >
            Edit
          </button>
        ),
      })),
    [users]
  );

  return (
    <div className="space-y-4">
      {editingUser && (
        <div className="card p-4 bg-white space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-900">Edit user</div>
              <div className="text-xs text-slate-500">Update role and profile details.</div>
            </div>
            <button
              className="text-xs px-3 py-1 rounded-full border border-slate-200"
              onClick={() => setEditingUser(null)}
            >
              Close
            </button>
          </div>
          <form
            className="grid gap-3 md:grid-cols-3"
            onSubmit={(event) => {
              event.preventDefault();
              updateMutation.mutate({ id: editingUser.id, data: form });
            }}
          >
            <label className="text-xs text-slate-500 space-y-1">
              <span>Name</span>
              <input
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              />
            </label>
            <label className="text-xs text-slate-500 space-y-1">
              <span>Phone</span>
              <input
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={form.phone}
                onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
              />
            </label>
            <label className="text-xs text-slate-500 space-y-1">
              <span>Role</span>
              <select
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={form.role}
                onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value as AdminUser["role"] }))}
              >
                <option value="USER">User</option>
                <option value="ADMIN">Admin</option>
              </select>
            </label>
            <div className="md:col-span-3 flex justify-end">
              <button
                type="submit"
                className="rounded-xl bg-slate-900 text-white px-4 py-2 text-sm"
                disabled={updateMutation.isLoading}
              >
                {updateMutation.isLoading ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
          {updateMutation.isError && (
            <div className="text-xs text-rose-600">Unable to update user. Please try again.</div>
          )}
        </div>
      )}

      <TableLayout
        title="Users"
        toolbar={<button className="rounded-xl border border-slate-200 px-3 py-2 text-sm">Invite</button>}
        table={
          usersQuery.isLoading ? (
            <div className="p-4 text-sm text-slate-500">Loading users...</div>
          ) : errorMessage ? (
            <div className="p-4 text-sm text-rose-600">{errorMessage}</div>
          ) : rows.length === 0 ? (
            <div className="p-4 text-sm text-slate-500">No users yet.</div>
          ) : (
            <TableCard headers={["Name", "Role", "Email", "Orders", "Joined", "Actions"]} rows={rows} />
          )
        }
        mobile={
          usersQuery.isLoading ? (
            <div className="text-sm text-slate-500">Loading users...</div>
          ) : errorMessage ? (
            <div className="text-sm text-rose-600">{errorMessage}</div>
          ) : rows.length === 0 ? (
            <div className="text-sm text-slate-500">No users yet.</div>
          ) : (
            <TableCard headers={["Name", "Role", "Email", "Orders", "Joined", "Actions"]} rows={rows} />
          )
        }
      />
    </div>
  );
}

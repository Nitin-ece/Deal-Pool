import React, { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import api from "../services/api";
import { getErrorMessage } from "../lib/errors";
import { UserProfile } from "../types";
import {
  Shield,
  ShieldAlert,
  Users,
  Search,
  CheckCircle2,
  Trash2,
  AlertCircle,
  Sparkles,
  ArrowUpDown,
  Lock,
} from "lucide-react";

export function Admin() {
  const { user, isAdmin } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<any, UserProfile[]>("/api/admin/users");
      setUsers(data || []);
    } catch (err: any) {
      setError(getErrorMessage(err, "Failed to load admin user directory."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const handleRoleChange = async (userId: string, newRole: "user" | "admin") => {
    setError(null);
    setSuccessMsg(null);
    try {
      await api.patch(`/api/admin/users/${userId}/role`, { role: newRole });
      setSuccessMsg(`Role updated to ${newRole}`);
      fetchUsers();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(getErrorMessage(err, "Failed to update role"));
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm("Are you sure you want to delete this profile?")) return;
    setError(null);
    try {
      await api.delete(`/api/admin/users/${userId}`);
      setSuccessMsg("User profile deleted.");
      fetchUsers();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(getErrorMessage(err, "Failed to delete user profile"));
    }
  };

  if (!isAdmin) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-[var(--ink)]">Admin Access Required</h2>
        <p className="text-xs text-gray-500 max-w-sm mx-auto">
          This section is restricted to accounts with the <code className="text-[var(--signal)] font-bold">admin</code> role.
        </p>
      </div>
    );
  }

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    return u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.role.includes(q);
  });

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--paper)] text-[var(--pool)] text-xs font-bold border border-emerald-100 mb-1">
            <Shield className="w-3.5 h-3.5 text-[var(--signal)]" />
            <span>Platform Governance Console</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[var(--ink)] tracking-tight">
            User Directory & Permissions
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Admin oversight on Firebase authentication accounts and Postgres profile records.
          </p>
        </div>

        <button
          onClick={fetchUsers}
          className="px-4 py-2 rounded-xl bg-white border border-[var(--line)] hover:bg-gray-50 text-xs font-bold text-gray-700 shadow-xs cursor-pointer"
        >
          Refresh Directory
        </button>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="flex items-center gap-2 text-xs text-[var(--pool)] bg-[var(--paper)] p-3.5 rounded-2xl border border-emerald-200 font-semibold">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-xs text-rose-600 bg-rose-50 p-3.5 rounded-2xl border border-rose-200">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Aggregate Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-[var(--line)] shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Total Users</div>
          <div className="text-2xl font-black text-[var(--ink)] mt-1">{users.length}</div>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-[var(--line)] shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Administrators</div>
          <div className="text-2xl font-black text-[var(--signal)] mt-1">
            {users.filter((u) => u.role === "admin").length}
          </div>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-[var(--line)] shadow-xs col-span-2 sm:col-span-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Standard Users</div>
          <div className="text-2xl font-black text-gray-700 mt-1">
            {users.filter((u) => u.role === "user").length}
          </div>
        </div>
      </div>

      {/* Directory Table Card */}
      <div className="bg-white rounded-3xl border border-[var(--line)] shadow-xs overflow-hidden">
        {/* Search Bar */}
        <div className="p-4 sm:p-5 border-b border-[var(--line)]">
          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users by username, email, or role..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 rounded-xl text-xs sm:text-sm text-[var(--ink)] border border-[var(--line)] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[var(--signal)] transition-all"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 border-b border-[var(--line)] text-gray-400 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Rating</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400">
                    Loading users...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400">
                    No users match search criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        {u.profile_photo ? (
                          <img
                            src={u.profile_photo}
                            alt={u.username}
                            referrerPolicy="no-referrer"
                            className="w-7 h-7 rounded-full object-cover border border-[var(--line)]"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-[var(--paper)] text-[var(--pool)] font-bold text-xs flex items-center justify-center">
                            {u.username.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="font-bold text-[var(--ink)]">{u.username}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-gray-600">{u.email}</td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                          u.role === "admin"
                            ? "bg-emerald-100 text-[var(--pool)]"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-gray-700 font-semibold">
                      {u.avg_rating != null
                        ? `${Number(u.avg_rating).toFixed(1)}★ (${u.rating_count})`
                        : "N/A"}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        {u.role === "user" ? (
                          <button
                            type="button"
                            onClick={() => handleRoleChange(u.id, "admin")}
                            className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-[var(--paper)] hover:text-[var(--pool)] text-gray-700 text-[11px] font-bold transition-colors cursor-pointer"
                          >
                            Promote to Admin
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleRoleChange(u.id, "user")}
                            disabled={u.id === user?.id}
                            className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-bold transition-colors cursor-pointer disabled:opacity-30"
                          >
                            Demote to User
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDeleteUser(u.id)}
                          disabled={u.id === user?.id}
                          className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-30"
                          title="Delete User Record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

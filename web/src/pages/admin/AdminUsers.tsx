import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, ShieldAlert, Award } from "lucide-react";
import { api } from "../../api/client";
import { useAuthStore } from "../../store/auth";
import type { ListMeta } from "../../api/types";

interface UsersResponse {
  data: any[];
  meta: ListMeta;
}

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  if (currentUser?.role !== "ADMIN") {
    return <Navigate to="/admin" replace />;
  }

  const { data, isLoading } = useQuery<UsersResponse>({
    queryKey: ["admin", "users", page, search, roleFilter],
    queryFn: () => {
      const q = new URLSearchParams();
      q.set("page", String(page));
      q.set("limit", "15");
      if (search) q.set("q", search);
      if (roleFilter) q.set("role", roleFilter);
      return api.get<UsersResponse>(`/admin/users?${q}`);
    },
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: number; role: string }) =>
      api.put(`/admin/users/${id}/role`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });

  const users = data?.data ?? [];
  const meta = data?.meta;
  const isSuperAdmin = currentUser?.role === "ADMIN";

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-950 tracking-tight">Users &amp; Roles</h1>
        <p className="text-sm text-gray-500 mt-1">Manage user permissions and system access levels.</p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 border border-gray-100 rounded-2xl flex flex-col sm:flex-row gap-4 items-center justify-between shadow-xs">
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by name or email..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </div>

          <div className="w-full sm:w-48">
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="w-full bg-white border border-gray-200 text-xs font-semibold rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-brand/30 text-gray-700"
            >
              <option value="">All Roles</option>
              <option value="CUSTOMER">Customer</option>
              <option value="SHOP_MANAGER">Shop Manager</option>
              <option value="ADMIN">Administrator</option>
            </select>
          </div>
        </div>

        {!isSuperAdmin && (
          <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100">
            <ShieldAlert size={14} />
            <span>Only Administrators can modify user roles.</span>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
                <th className="p-4 pl-6">User Details</th>
                <th className="p-4">Phone</th>
                <th className="p-4">Registered</th>
                <th className="p-4">Orders</th>
                <th className="p-4">Access Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {isLoading ? (
                [1, 2, 3].map((n) => (
                  <tr key={n} className="animate-pulse">
                    <td className="p-4 pl-6"><div className="h-4 bg-gray-100 rounded w-44" /></td>
                    <td className="p-4"><div className="h-4 bg-gray-100 rounded w-20" /></td>
                    <td className="p-4"><div className="h-4 bg-gray-100 rounded w-24" /></td>
                    <td className="p-4"><div className="h-4 bg-gray-100 rounded w-8" /></td>
                    <td className="p-4"><div className="h-4 bg-gray-100 rounded w-20" /></td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 pl-6">
                      <div>
                        <p className="font-semibold text-gray-900 flex items-center gap-1.5">
                          {u.firstName || u.lastName
                            ? `${u.firstName || ""} ${u.lastName || ""}`.trim()
                            : "Unnamed Account"}
                          {u.role === "ADMIN" && <Award size={13} className="text-teal-600" />}
                        </p>
                        <p className="text-xs text-gray-400">{u.email}</p>
                      </div>
                    </td>
                    <td className="p-4 text-gray-500 text-xs font-mono">{u.phone ?? "—"}</td>
                    <td className="p-4 text-gray-400 text-xs">
                      {new Date(u.createdAt).toLocaleDateString("en-SG", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="p-4 font-medium text-gray-700">{u._count?.orders ?? 0} orders</td>
                    <td className="p-4">
                      {isSuperAdmin && u.id !== currentUser?.id ? (
                        <select
                          value={u.role}
                          onChange={(e) => roleMutation.mutate({ id: u.id, role: e.target.value })}
                          disabled={roleMutation.isPending}
                          className="bg-white border border-gray-200 text-xs font-semibold rounded-lg px-2 py-1 focus:ring-2 focus:ring-brand/20"
                        >
                          <option value="CUSTOMER">Customer</option>
                          <option value="SHOP_MANAGER">Shop Manager</option>
                          <option value="ADMIN">Admin</option>
                        </select>
                      ) : (
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            u.role === "ADMIN"
                              ? "bg-teal-50 text-teal-700"
                              : u.role === "SHOP_MANAGER"
                              ? "bg-blue-50 text-blue-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {u.role.replace("_", " ")}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 p-4">
            <span className="text-xs text-gray-500">
              Showing page {meta.page} of {meta.totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={page >= meta.totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

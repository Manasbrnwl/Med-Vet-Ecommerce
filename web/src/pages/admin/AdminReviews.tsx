import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Trash2, Star, MessageSquare } from "lucide-react";
import { api } from "../../api/client";
import type { ListMeta } from "../../api/types";

interface ReviewsResponse {
  data: any[];
  meta: ListMeta;
}

export default function AdminReviews() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pendingFilter, setPendingFilter] = useState(true);
  const [ratingFilter, setRatingFilter] = useState("");

  // Query reviews
  const { data, isLoading } = useQuery<ReviewsResponse>({
    queryKey: ["admin", "reviews", page, pendingFilter, ratingFilter],
    queryFn: () => {
      const q = new URLSearchParams();
      q.set("page", String(page));
      q.set("limit", "15");
      if (pendingFilter) q.set("pending", "true");
      if (ratingFilter) q.set("rating", ratingFilter);
      return api.get<ReviewsResponse>(`/admin/reviews?${q}`);
    },
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: (id: number) => api.put(`/admin/reviews/${id}/approve`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "reviews"] });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/reviews/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "reviews"] });
    },
  });

  const reviews = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-950 tracking-tight">Review Moderation</h1>
        <p className="text-sm text-gray-500 mt-1">Approve pending reviews or remove offensive/spam feedback.</p>
      </div>

      {/* Tabs & Filters */}
      <div className="bg-white p-4 border border-gray-100 rounded-2xl flex flex-col sm:flex-row gap-4 items-center justify-between shadow-xs">
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
          <button
            onClick={() => { setPendingFilter(true); setPage(1); }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              pendingFilter ? "bg-brand text-white shadow-xs" : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            Pending Approval
          </button>
          <button
            onClick={() => { setPendingFilter(false); setPage(1); }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              !pendingFilter ? "bg-brand text-white shadow-xs" : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            All Reviews
          </button>
        </div>

        <div className="w-full sm:w-48">
          <select
            value={ratingFilter}
            onChange={(e) => {
              setRatingFilter(e.target.value);
              setPage(1);
            }}
            className="w-full bg-white border border-gray-200 text-xs font-semibold rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-brand/30 text-gray-700"
          >
            <option value="">All Ratings</option>
            <option value="5">5 Stars</option>
            <option value="4">4 Stars</option>
            <option value="3">3 Stars</option>
            <option value="2">2 Stars</option>
            <option value="1">1 Star</option>
          </select>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {isLoading ? (
          [1, 2].map((n) => (
            <div key={n} className="bg-white p-6 border border-gray-100 rounded-2xl space-y-3 animate-pulse">
              <div className="h-4 bg-gray-100 rounded w-1/4" />
              <div className="h-4 bg-gray-100 rounded w-1/3" />
              <div className="h-10 bg-gray-100 rounded w-full" />
            </div>
          ))
        ) : reviews.length === 0 ? (
          <div className="bg-white p-12 text-center border border-gray-100 rounded-2xl text-gray-500 flex flex-col items-center gap-2">
            <MessageSquare className="text-gray-300 w-8 h-8" />
            <p>No reviews found matching this filter.</p>
          </div>
        ) : (
          reviews.map((r) => (
            <div
              key={r.id}
              className="bg-white p-6 border border-gray-100 rounded-2xl hover:shadow-xs transition-shadow flex flex-col md:flex-row md:items-start justify-between gap-6"
            >
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-gray-900">{r.reviewerName}</span>
                  <span className="text-xs text-gray-400">({r.reviewerEmail})</span>
                  <div className="flex items-center text-amber-400">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        size={14}
                        fill={i < r.rating ? "currentColor" : "none"}
                        className={i < r.rating ? "text-amber-400" : "text-gray-200"}
                      />
                    ))}
                  </div>
                </div>

                <p className="text-xs text-gray-400">
                  Reviewed product:{" "}
                  <a
                    href={`/product/${r.product?.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand hover:underline font-medium"
                  >
                    {r.product?.name ?? "Unknown Product"}
                  </a>{" "}
                  on {new Date(r.createdAt).toLocaleDateString("en-SG")}
                </p>

                <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-100/50">
                  {r.content}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 md:self-center flex-shrink-0">
                {!r.approved && (
                  <button
                    onClick={() => approveMutation.mutate(r.id)}
                    disabled={approveMutation.isPending}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    <Check size={14} /> Approve
                  </button>
                )}
                <button
                  onClick={() => {
                    if (confirm("Delete this review permanently?")) deleteMutation.mutate(r.id);
                  }}
                  disabled={deleteMutation.isPending}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-100 p-4 bg-white rounded-2xl">
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
  );
}

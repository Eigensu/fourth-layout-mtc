"use client";

import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import { useRouter } from "next/navigation";
import { publicContestsApi, Contest, type EnrollmentResponse } from "@/lib/api/public/contests";
import { PillNavbar } from "@/components/navigation/PillNavbar";
import { MobileUserMenu } from "@/components/navigation/MobileUserMenu";
import { useAuth } from "@/contexts/AuthContext";

export default function ContestsPage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joinedContestIds, setJoinedContestIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        // Fetch all public contests; we'll partition into Active vs Upcoming
        const res = await publicContestsApi.list({ page_size: 100 });
        setContests(res.contests);
      } catch (e: any) {
        setError(e?.message || "Failed to load contests");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Load user's contest enrollments to toggle Join/View Team
  useEffect(() => {
    (async () => {
      try {
        const mine: EnrollmentResponse[] = await publicContestsApi.myEnrollments();
        setJoinedContestIds(new Set(mine.map((e) => e.contest_id)));
      } catch {
        // ignore unauthenticated or unavailable endpoint
      }
    })();
  }, []);

  const handleJoin = (contestId: string) => {
    const target = `/contests/${contestId}/team`;
    if (!isAuthenticated) {
      router.push(`/auth/login?next=${encodeURIComponent(target)}`);
      return;
    }
    router.push(target);
  };

  // Partition contests into active (started and not ended) and upcoming (not started yet)
  const now = new Date();
  const activeContests = contests.filter((c) => {
    const s = new Date(c.start_at);
    const e = new Date(c.end_at);
    return c.status === "active" && s <= now && e > now;
  });
  const upcomingContests = contests
    .filter((c) => new Date(c.start_at) > now)
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-primary-50 to-gray-50">
      <PillNavbar
        activeId="contests"
        mobileMenuContent={isAuthenticated ? <MobileUserMenu /> : undefined}
      />
      <div className="h-20" />

      <div className="max-w-4xl mx-auto p-4">
        <h1 className="flex items-center justify-center gap-3 text-3xl font-extrabold mb-8 text-center bg-gradient-to-r from-primary-400 to-primary-700 bg-clip-text text-transparent">
          <Trophy className="w-7 h-7 text-primary-600" />
          <span>Active Contests</span>
        </h1>
        {loading && <div>Loading...</div>}
        {error && <div className="text-red-600">{error}</div>}
        <div className="grid gap-5 place-items-center">
          {activeContests.map((c) => (
            <div key={c.id} className="w-full">
              <div className="rounded-3xl bg-white/90 backdrop-blur shadow-md px-6 sm:px-8 py-6 min-h-[120px]">
                <div className="flex items-center justify-between gap-6">
                  <div className="min-w-0">
                    <button
                      onClick={() => handleJoin(c.id)}
                      className="text-2xl font-bold text-gray-900 hover:underline truncate block text-left"
                    >
                      {c.name}
                    </button>
                    <div className="text-sm text-gray-600">Code: {c.code}</div>
                    {c.description && (
                      <p className="mt-2 text-gray-700 text-sm line-clamp-2">
                        {c.description}
                      </p>
                    )}
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(c.start_at).toLocaleString()} – {" "}
                      {new Date(c.end_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 flex-shrink-0 self-center">
                    {joinedContestIds.has(c.id) ? (
                      <button
                        onClick={() => router.push(`/contests/${c.id}/team`)}
                        className="px-6 py-3 rounded-xl border text-base font-semibold text-primary-700 border-primary-200 hover:bg-primary-50"
                      >
                        View Team
                      </button>
                    ) : (
                      <button
                        onClick={() => handleJoin(c.id)}
                        className="px-6 py-3 rounded-xl bg-gradient-primary text-white text-base font-semibold shadow hover:opacity-95"
                      >
                        Join
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {!loading && activeContests.length === 0 && (
            <div className="text-gray-600">No active contests.</div>
          )}
        </div>

        {/* Upcoming Contests */}
        <div className="mt-12">
          <h2 className="text-2xl font-extrabold mb-6 text-gray-900">Upcoming Contests</h2>
          <div className="grid gap-5 place-items-center">
            {upcomingContests.map((c) => (
              <div key={c.id} className="w-full">
                <div className="rounded-3xl bg-white/90 backdrop-blur shadow-md px-6 sm:px-8 py-6 min-h-[120px]">
                  <div className="flex items-center justify-between gap-6">
                    <div className="min-w-0">
                      <div className="text-2xl font-bold text-gray-900 truncate">{c.name}</div>
                      <div className="text-sm text-gray-600">Code: {c.code}</div>
                      {c.description && (
                        <p className="mt-2 text-gray-700 text-sm line-clamp-2">{c.description}</p>
                      )}
                      <div className="text-xs text-gray-500 mt-1">
                        Starts: {new Date(c.start_at).toLocaleString()} · Ends: {new Date(c.end_at).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 flex-shrink-0 self-center">
                      {joinedContestIds.has(c.id) ? (
                        <button
                          onClick={() => handleJoin(c.id)}
                          className="px-6 py-3 rounded-xl border text-base font-semibold text-primary-700 border-primary-200 hover:bg-primary-50"
                          title="View your team for this contest"
                        >
                          View Team
                        </button>
                      ) : (
                        <button
                          onClick={() => handleJoin(c.id)}
                          className="px-6 py-3 rounded-xl bg-gradient-primary text-white text-base font-semibold shadow hover:opacity-95"
                          title="Join contest and open team builder"
                        >
                          Join Contest
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {!loading && upcomingContests.length === 0 && (
              <div className="text-gray-600">No upcoming contests.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

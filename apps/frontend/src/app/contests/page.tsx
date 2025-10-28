"use client";

import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  publicContestsApi,
  Contest,
  type EnrollmentResponse,
} from "@/lib/api/public/contests";
import { PillNavbar } from "@/components/navigation/PillNavbar";
import { MobileUserMenu } from "@/components/navigation/MobileUserMenu";
import { useAuth } from "@/contexts/AuthContext";

export default function ContestsPage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joinedContestIds, setJoinedContestIds] = useState<Set<string>>(
    new Set()
  );

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
        const mine: EnrollmentResponse[] =
          await publicContestsApi.myEnrollments();
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

  // Partition contests using status values
  const activeContests = contests.filter((c) => c.status === "live");
  const upcomingContests = contests
    .filter((c) => c.status === "upcoming")
    .sort(
      (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-primary-50 to-gray-50">
      <PillNavbar
        activeId="contests"
        mobileMenuContent={isAuthenticated ? <MobileUserMenu /> : undefined}
      />
      <div className="h-24" />

      <div className="max-w-4xl mx-auto px-3 sm:px-4 pt-1 sm:pt-0">
        <h1 className="flex items-center justify-center gap-2 sm:gap-3 text-2xl sm:text-3xl font-extrabold mb-6 sm:mb-8 text-center bg-gradient-to-r from-primary-400 to-primary-700 bg-clip-text text-transparent">
          <Trophy className="w-7 h-7 text-primary-600" />
          <span>Active Contests</span>
        </h1>
        {loading && <div>Loading...</div>}
        {error && <div className="text-red-600">{error}</div>}
        <div className="grid gap-4 sm:gap-5">
          {activeContests.map((c) => (
            <div key={c.id} className="w-full">
              <div className="rounded-3xl bg-white/90 backdrop-blur shadow-md px-4 sm:px-6 py-5 sm:py-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6">
                  <div className="min-w-0">
                    <button
                      onClick={() => router.push(`/contests/${c.id}`)}
                      className="text-xl sm:text-2xl font-bold text-gray-900 hover:underline block text-left leading-tight break-words whitespace-normal"
                    >
                      {c.name}
                    </button>
                    <div className="text-xs sm:text-sm text-gray-600">
                      Code: {c.code}
                    </div>
                    {c.description && (
                      <p className="mt-1.5 sm:mt-2 text-gray-700 text-sm line-clamp-2">
                        {c.description}
                      </p>
                    )}
                    <div className="text-[11px] sm:text-xs text-gray-500 mt-1 leading-snug">
                      {new Date(c.start_at).toLocaleString()} –{" "}
                      {new Date(c.end_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-2 sm:gap-3 sm:self-center mt-3 sm:mt-0">
                    {joinedContestIds.has(c.id) ? (
                      <button
                        onClick={() => router.push(`/contests/${c.id}/team`)}
                        className="w-full sm:w-auto px-4 py-2.5 sm:px-6 sm:py-3 rounded-xl border text-sm sm:text-base font-semibold text-primary-700 border-primary-200 hover:bg-primary-50 whitespace-nowrap"
                      >
                        View Team
                      </button>
                    ) : (
                      <button
                        onClick={() => handleJoin(c.id)}
                        className="w-full sm:w-auto px-4 py-2.5 sm:px-6 sm:py-3 rounded-xl bg-gradient-primary text-white text-sm sm:text-base font-semibold shadow hover:opacity-95"
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
        <div className="mt-8 sm:mt-12">
          <h2 className="text-xl sm:text-2xl font-extrabold mb-4 sm:mb-6 text-gray-900">
            Upcoming Contests
          </h2>
          <div className="grid gap-4 sm:gap-5">
            {upcomingContests.map((c) => (
              <div key={c.id} className="w-full">
                <div className="rounded-3xl bg-white/90 backdrop-blur shadow-md px-4 sm:px-6 py-5 sm:py-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6">
                    <div className="min-w-0">
                      <button
                        onClick={() => router.push(`/contests/${c.id}`)}
                        className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight break-words hover:underline text-left whitespace-normal"
                      >
                        {c.name}
                      </button>
                      <div className="text-xs sm:text-sm text-gray-600">
                        Code: {c.code}
                      </div>
                      {c.description && (
                        <p className="mt-1.5 sm:mt-2 text-gray-700 text-sm line-clamp-2">
                          {c.description}
                        </p>
                      )}
                      <div className="text-[11px] sm:text-xs text-gray-500 mt-1 leading-snug">
                        Starts: {new Date(c.start_at).toLocaleString()} · Ends:{" "}
                        {new Date(c.end_at).toLocaleString()}
                      </div>
                    </div>
                    <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-2 sm:gap-3 sm:self-center mt-3 sm:mt-0">
                      {joinedContestIds.has(c.id) ? (
                        <button
                          onClick={() => handleJoin(c.id)}
                          className="w-full sm:w-auto px-4 py-2.5 sm:px-6 sm:py-3 rounded-xl border text-sm sm:text-base font-semibold text-primary-700 border-primary-200 hover:bg-primary-50 whitespace-nowrap"
                          title="View your team for this contest"
                        >
                          View Team
                        </button>
                      ) : (
                        <button
                          onClick={() => handleJoin(c.id)}
                          className="w-full sm:w-auto px-4 py-2.5 sm:px-6 sm:py-3 rounded-xl bg-gradient-primary text-white text-sm sm:text-base font-semibold shadow hover:opacity-95"
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

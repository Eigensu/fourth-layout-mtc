"use client";

import { useEffect, useMemo, useState } from "react";
import type { Player } from "@/lib/api/admin/players";
import { playersApi } from "@/lib/api/admin/players";
import { getErrorMessage } from "@/lib/api/client";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Loader2, AlertCircle, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EditPointsModal } from "./EditPointsModal";

export function TeamsEditSection() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [teamFilter, setTeamFilter] = useState<string>("");

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const pageSize = 100; // backend enforces le=100
      let page = 1;
      let total = Infinity;
      const all: Player[] = [];
      const seen = new Set<string>();

      while (all.length < total) {
        const res = await playersApi.getPlayers({ page, page_size: pageSize });
        total = res.total;
        for (const p of res.players) {
          if (!seen.has(p.id)) {
            seen.add(p.id);
            all.push(p);
          }
        }
        if (res.players.length < pageSize) break; // no more pages
        page += 1;
        // Safety cap to prevent infinite loops
        if (page > 1000) break;
      }

      setPlayers(all);
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const teams = useMemo(() => {
    const groups = new Map<string, Player[]>();
    for (const p of players) {
      const key = p.team || "Unassigned";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(p);
    }
    // sort players by name within team
    Array.from(groups.values()).forEach((arr) =>
      arr.sort((a: Player, b: Player) => a.name.localeCompare(b.name))
    );
    // sort team names
    return Array.from(groups.entries()).sort(
      (a: [string, Player[]], b: [string, Player[]]) => a[0].localeCompare(b[0])
    );
  }, [players]);

  const visibleTeams = useMemo(() => {
    if (!teamFilter) return teams;
    return teams.filter(([name]) => name.toLowerCase().includes(teamFilter.toLowerCase()));
  }, [teams, teamFilter]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="p-4 border-b flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-orange-500" />
            <h2 className="text-lg font-semibold">Edit Players by Teams</h2>
          </div>
          <input
            placeholder="Filter teams..."
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            className="w-full sm:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </CardHeader>
        <CardBody className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12 text-red-600">
              <AlertCircle className="w-5 h-5 mr-2" />
              <span>{error}</span>
            </div>
          ) : (
            <div className="divide-y">
              {visibleTeams.map(([teamName, teamPlayers]) => (
                <div key={teamName} className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-semibold text-gray-900">{teamName}</h3>
                    <span className="text-sm text-gray-500">{teamPlayers.length} players</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-3 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Player</th>
                          <th className="px-3 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Role</th>
                          <th className="px-3 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Points</th>
                          <th className="px-3 sm:px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {teamPlayers.map((p) => (
                          <tr key={p.id} className="hover:bg-gray-50">
                            <td className="px-3 sm:px-4 py-3 text-sm text-gray-900">{p.name}</td>
                            <td className="px-3 sm:px-4 py-3 text-sm text-gray-600 hidden sm:table-cell">{p.role}</td>
                            <td className="px-3 sm:px-4 py-3 text-sm font-semibold text-gray-900">{(p.points ?? 0).toFixed(1)}</td>
                            <td className="px-3 sm:px-4 py-3 text-right">
                              <Button
                                size="sm"
                                variant="primary"
                                className="px-2 py-1 text-xs sm:text-sm"
                                onClick={() => setEditingPlayer(p)}
                              >
                                <span className="hidden sm:inline">Edit Points</span>
                                <span className="sm:hidden">Edit</span>
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
              {visibleTeams.length === 0 && (
                <div className="text-center py-12 text-gray-500">No teams match your filter.</div>
              )}
            </div>
          )}
        </CardBody>
      </Card>

      {editingPlayer && (
        <EditPointsModal
          player={editingPlayer}
          onClose={() => setEditingPlayer(null)}
          onSaved={fetchAll}
        />
      )}
    </div>
  );
}

"use client";

import { Badge, Avatar } from "@/components";
import { formatPoints } from "@/lib/utils";
import type { Player } from "@/components";
import { cn } from "@/lib/utils";

interface TeamCardProps {
    teamName: string;
    players: Player[]; // 5 players max
    selectedPlayerIds: string[];
    onPlayerSelect: (playerId: string) => void;
    teamSelectionCount: number;
    maxPerTeam: number;
}

export function TeamCard({
    teamName,
    players,
    selectedPlayerIds,
    onPlayerSelect,
    teamSelectionCount,
    maxPerTeam,
}: TeamCardProps) {
    const isTeamFull = teamSelectionCount >= maxPerTeam;

    return (
        <div className="border border-border-subtle rounded-xl p-3 sm:p-4 bg-bg-card shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-sm sm:text-base text-text-main truncate">
                    {teamName}
                </h4>
                <Badge
                    variant={isTeamFull ? "warning" : "secondary"}
                    size="sm"
                    className="flex-shrink-0 ml-2"
                >
                    {teamSelectionCount}/{maxPerTeam}
                </Badge>
            </div>

            <div className="space-y-1.5 sm:space-y-2">
                {players.map((player) => {
                    const isSelected = selectedPlayerIds.includes(player.id);
                    const isDisabled = !isSelected && isTeamFull;

                    return (
                        <button
                            key={player.id}
                            onClick={() => !isDisabled && onPlayerSelect(player.id)}
                            disabled={isDisabled}
                            className={cn(
                                "w-full flex items-center gap-2 p-2 rounded-lg border text-left transition-all duration-200",
                                isSelected &&
                                "bg-accent-pink-soft/10 border-accent-pink-soft shadow-sm",
                                isDisabled && "opacity-40 cursor-not-allowed",
                                !isSelected &&
                                !isDisabled &&
                                "hover:bg-bg-elevated hover:border-border-subtle border-transparent"
                            )}
                            title={
                                isDisabled
                                    ? `Maximum ${maxPerTeam} players selected from ${teamName}`
                                    : isSelected
                                        ? "Click to deselect"
                                        : "Click to select"
                            }
                        >
                            <Avatar
                                name={player.name}
                                size="xs"
                                src={player.image}
                                className="flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                                <div className="text-xs sm:text-sm font-medium truncate text-text-main">
                                    {player.name}
                                </div>
                                <div className="text-[10px] sm:text-xs text-text-muted truncate">
                                    {player.team}
                                </div>
                            </div>
                            <div className="text-xs sm:text-sm text-success-600 font-semibold flex-shrink-0">
                                {formatPoints(player.points || 0)}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

"use client";

import { Badge, Avatar } from "@/components";
import { formatPoints } from "@/lib/utils";
import type { Player } from "@/components";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface TeamCardProps {
    teamName: string;
    players: Player[]; // 5 players max
    selectedPlayerIds: string[];
    onPlayerSelect: (playerId: string) => void;
    teamSelectionCount: number;
    maxPerTeam: number;
    genderLimitReached?: boolean; // New prop to indicate if 12/12 or 4/4 is reached
}

export function TeamCard({
    teamName,
    players,
    selectedPlayerIds,
    onPlayerSelect,
    teamSelectionCount,
    maxPerTeam,
    genderLimitReached = false,
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
                    const isDisabled = !isSelected && (isTeamFull || genderLimitReached);

                    return (
                        <button
                            key={player.id}
                            onClick={() => !isDisabled && onPlayerSelect(player.id)}
                            disabled={isDisabled}
                            className={cn(
                                "w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all duration-200",
                                isSelected &&
                                "bg-primary-500/10 border-primary-500/30",
                                isDisabled && "opacity-40 cursor-not-allowed",
                                !isSelected &&
                                !isDisabled &&
                                "bg-bg-elevated border-border-subtle hover:border-primary-500/20 hover:bg-primary-500/5"
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
                                className="flex-shrink-0 ring-2 ring-white/10"
                            />
                            <div className="flex-1 min-w-0">
                                <div className="text-xs sm:text-sm font-semibold truncate text-text-main">
                                    {player.name}
                                </div>
                                <div className="text-[10px] sm:text-xs text-text-muted truncate">
                                    {player.team}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <div className="text-xs sm:text-sm text-success-600 font-semibold">
                                    {formatPoints(player.points || 0)}
                                </div>
                                {isSelected && (
                                    <div className="w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center">
                                        <Check className="w-3 h-3 text-white" strokeWidth={3} />
                                    </div>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

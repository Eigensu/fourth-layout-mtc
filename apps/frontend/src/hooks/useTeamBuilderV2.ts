import { useEffect, useMemo, useState, useCallback } from "react";
import type { Player } from "@/components";
import { fetchSlots, type ApiSlot } from "@/lib/api/public/slots";
import {
    fetchPlayersBySlot,
    fetchHotPlayerIds,
    type ApiPlayer,
} from "@/lib/api/public/players";

export type UIBuildPlayer = Player & { slotId: string };

// Configurable limits
export const TEAM_BUILDER_CONFIG = {
    totalPlayers: 16,
    menPlayers: 12,
    womenPlayers: 4,
    maxPerTeam: 3,
};

export function useTeamBuilderV2(
    contestId?: string,
    options?: { enabled?: boolean }
) {
    const enabled = options?.enabled ?? true;
    const [players, setPlayers] = useState<UIBuildPlayer[]>([]);
    const [loading, setLoading] = useState<boolean>(enabled);
    const [error, setError] = useState<string | null>(null);

    const [selectedMen, setSelectedMen] = useState<string[]>([]);
    const [selectedWomen, setSelectedWomen] = useState<string[]>([]);
    const [captainId, setCaptainId] = useState<string>("");
    const [viceCaptainId, setViceCaptainId] = useState<string>("");
    const [currentStep, setCurrentStep] = useState(1);

    const [slots, setSlots] = useState<ApiSlot[]>([]);
    const [activeGender, setActiveGender] = useState<"male" | "female">("male");

    // Fetch slots and players (on mount and when contestId changes)
    useEffect(() => {
        let cancelled = false;
        (async () => {
            if (!enabled) {
                setLoading(false);
                return;
            }
            try {
                setLoading(true);
                setError(null);

                const slotsList = await fetchSlots();
                // Find Men and Women slots
                const menSlot = slotsList.find((s) => s.code === "MEN");
                const womenSlot = slotsList.find((s) => s.code === "WOMEN");

                if (!menSlot || !womenSlot) {
                    throw new Error("Men or Women slot not found. Please configure slots in admin panel.");
                }

                if (!cancelled) {
                    setSlots([menSlot, womenSlot]);
                }

                // Fetch players for both genders
                const [menPlayers, womenPlayers] = await Promise.all([
                    fetchPlayersBySlot(menSlot.id, contestId, "male"),
                    fetchPlayersBySlot(womenSlot.id, contestId, "female"),
                ]);

                // Validate all players have gender field
                const invalidPlayers = [...menPlayers, ...womenPlayers].filter(
                    (p) => !p.gender || (p.gender !== "male" && p.gender !== "female")
                );
                if (invalidPlayers.length > 0) {
                    throw new Error(
                        `Players missing gender field: ${invalidPlayers.map((p) => p.name).join(", ")}`
                    );
                }

                // Map to UI format
                const slotNameById: Record<string, string> = {
                    [menSlot.id]: menSlot.name,
                    [womenSlot.id]: womenSlot.name,
                };

                const mappedMen: UIBuildPlayer[] = menPlayers.map((p) => ({
                    id: p.id,
                    name: p.name,
                    team: p.team || "",
                    role: slotNameById[String(p.slot || "")] || "Slot",
                    price: Number(p.price) || 0,
                    points: Number(p.points || 0),
                    image: p.image_url || undefined,
                    slotId: String(p.slot || ""),
                    stats: p.stats || { matches: 0 },
                }));

                const mappedWomen: UIBuildPlayer[] = womenPlayers.map((p) => ({
                    id: p.id,
                    name: p.name,
                    team: p.team || "",
                    role: slotNameById[String(p.slot || "")] || "Slot",
                    price: Number(p.price) || 0,
                    points: Number(p.points || 0),
                    image: p.image_url || undefined,
                    slotId: String(p.slot || ""),
                    stats: p.stats || { matches: 0 },
                }));

                // Fetch hot player IDs
                let hotIdsSet: Set<string> = new Set();
                try {
                    const hot = await fetchHotPlayerIds({ contest_id: contestId });
                    hotIdsSet = new Set(hot.player_ids);
                } catch (_) {
                    // ignore hot ids failure
                }

                const allPlayers = [...mappedMen, ...mappedWomen].map((p) => ({
                    ...p,
                    isHot: hotIdsSet.has(p.id),
                }));

                if (!cancelled) setPlayers(allPlayers);
            } catch (e: any) {
                if (!cancelled) setError(e.message || "Failed to load data");
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [contestId, enabled]);

    // Memoize slot IDs for efficient lookup
    const slotIds = useMemo(() => ({
        men: slots.find((s) => s.code === "MEN")?.id,
        women: slots.find((s) => s.code === "WOMEN")?.id,
    }), [slots]);

    // Group players by team for current gender
    const playersGroupedByTeam = useMemo(() => {
        const targetSlotId = activeGender === "male" ? slotIds.men : slotIds.women;
        const currentPlayers = players.filter((p) => p.slotId === targetSlotId);

        // Group by team
        const grouped: Record<string, UIBuildPlayer[]> = {};
        currentPlayers.forEach((p) => {
            const teamName = p.team || "Unassigned";  // Handle empty teams
            if (!grouped[teamName]) {
                grouped[teamName] = [];
            }
            grouped[teamName].push(p);
        });

        // Convert to array of teams
        return Object.entries(grouped).map(([teamName, teamPlayers]) => ({
            name: teamName,
            players: teamPlayers,
        }));
    }, [players, activeGender, slotIds]);

    // Track team selection counts per gender
    const menTeamCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        selectedMen.forEach((id) => {
            const p = players.find((mp) => mp.id === id);
            if (p && p.team) {
                counts[p.team] = (counts[p.team] || 0) + 1;
            }
        });
        return counts;
    }, [selectedMen, players]);

    const womenTeamCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        selectedWomen.forEach((id) => {
            const p = players.find((mp) => mp.id === id);
            if (p && p.team) {
                counts[p.team] = (counts[p.team] || 0) + 1;
            }
        });
        return counts;
    }, [selectedWomen, players]);

    const handleClearAll = useCallback(() => {
        setSelectedMen([]);
        setSelectedWomen([]);
        setCaptainId("");
        setViceCaptainId("");
        setCurrentStep(1);
        setActiveGender("male");
    }, []);

    const handlePlayerSelect = useCallback(
        (playerId: string) => {
            const player = players.find((p) => p.id === playerId);
            if (!player) return;

            const isMen = activeGender === "male";
            const selected = isMen ? selectedMen : selectedWomen;
            const setSelected = isMen ? setSelectedMen : setSelectedWomen;
            const teamCounts = isMen ? menTeamCounts : womenTeamCounts;
            const genderLimit = isMen
                ? TEAM_BUILDER_CONFIG.menPlayers
                : TEAM_BUILDER_CONFIG.womenPlayers;

            setSelected((prev) => {
                // Toggle off if already selected
                if (prev.includes(playerId)) {
                    return prev.filter((id) => id !== playerId);
                }

                // Check gender limit
                if (prev.length >= genderLimit) {
                    return prev; // Block selection
                }

                // Check team limit (max 3 from same team in this gender)
                if (teamCounts[player.team] >= TEAM_BUILDER_CONFIG.maxPerTeam) {
                    return prev; // Block selection
                }

                // Add player
                return [...prev, playerId];
            });
        },
        [players, activeGender, selectedMen, selectedWomen, menTeamCounts, womenTeamCounts]
    );

    const handleSetCaptain = useCallback((playerId: string) => {
        setCaptainId(playerId);
        setViceCaptainId((vc) => (vc === playerId ? "" : vc));
    }, []);

    const handleSetViceCaptain = useCallback((playerId: string) => {
        setViceCaptainId(playerId);
        setCaptainId((c) => (c === playerId ? "" : c));
    }, []);

    // All selected players combined
    const allSelectedPlayers = useMemo(
        () => [...selectedMen, ...selectedWomen],
        [selectedMen, selectedWomen]
    );

    // Check if can proceed to next step
    const canProceedToStep2 = useMemo(() => {
        return (
            selectedMen.length === TEAM_BUILDER_CONFIG.menPlayers &&
            selectedWomen.length === TEAM_BUILDER_CONFIG.womenPlayers
        );
    }, [selectedMen, selectedWomen]);

    return {
        // data
        slots,
        players,
        loading,
        error,

        // selection state
        selectedMen,
        selectedWomen,
        allSelectedPlayers,
        captainId,
        viceCaptainId,
        currentStep,
        activeGender,

        // derived
        playersGroupedByTeam,
        menTeamCounts,
        womenTeamCounts,
        canProceedToStep2,
        LIMITS: TEAM_BUILDER_CONFIG,

        // setters/handlers
        setSelectedMen,
        setSelectedWomen,
        setCaptainId,
        setViceCaptainId,
        setCurrentStep,
        setActiveGender,
        handleClearAll,
        handlePlayerSelect,
        handleSetCaptain,
        handleSetViceCaptain,
    };
}

import { useEffect, useMemo, useState, useCallback } from "react";
import type { Player } from "@/components";
import { fetchSlots, type ApiSlot } from "@/lib/api/public/slots";
import { fetchPlayersBySlot, type ApiPlayer } from "@/lib/api/public/players";

export type UIBuildPlayer = Player & { slotId: string };

export function useTeamBuilder(contestId?: string) {
  const [players, setPlayers] = useState<UIBuildPlayer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [captainId, setCaptainId] = useState<string>("");
  const [viceCaptainId, setViceCaptainId] = useState<string>("");
  const [currentStep, setCurrentStep] = useState(1);

  const [slots, setSlots] = useState<ApiSlot[]>([]);
  const [activeSlotId, setActiveSlotId] = useState<string>("");
  const [isStep1Collapsed, setIsStep1Collapsed] = useState(false);

  // Limits per slot from backend
  const SLOT_LIMITS = useMemo(() => {
    const map: Record<string, number> = {};
    slots.forEach((s) => {
      map[s.id] = s.max_select ?? 4;
    });
    return map;
  }, [slots]);

  // Fetch slots and players by slot (on mount and when contestId changes)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);

        const slotsList = await fetchSlots();
        // Sort slots numerically by number embedded in name or code (fallback to name)
        const numFrom = (s: { name: string; code: string }) => {
          const nameNum = Number((s.name.match(/\d+/)?.[0]) ?? NaN);
          if (!Number.isNaN(nameNum)) return nameNum;
          const codeNum = Number((s.code.match(/\d+/)?.[0]) ?? NaN);
          if (!Number.isNaN(codeNum)) return codeNum;
          return Number.MAX_SAFE_INTEGER;
        };
        const sortedSlots = [...slotsList].sort((a, b) => {
          const an = numFrom(a);
          const bn = numFrom(b);
          if (an !== bn) return an - bn;
          return a.name.localeCompare(b.name);
        });
        if (!cancelled) {
          setSlots(sortedSlots);
          setActiveSlotId(sortedSlots[0]?.id || "");
        }

        // Build a local map for slot names to avoid depending on external state
        const slotNameById: Record<string, string> = Object.fromEntries(
          sortedSlots.map((s) => [s.id, s.name])
        );

        const playerArrays = await Promise.all(
          sortedSlots.map(async (s) => {
            try {
              const arr: ApiPlayer[] = await fetchPlayersBySlot(s.id, contestId);
              return arr.map((p) => ({ ...p, slot: p.slot || s.id }));
            } catch {
              return [] as ApiPlayer[];
            }
          })
        );
        const flatPlayers: ApiPlayer[] = playerArrays.flat();
        const mapped: UIBuildPlayer[] = flatPlayers.map((p) => ({
          id: p.id,
          name: p.name,
          team: p.team || "",
          role: slotNameById[String(p.slot || "")] || "Slot",
          price: Number(p.price) || 0,
          points: Number(p.points || 0),
          image: p.image_url || undefined,
          slotId: String(p.slot || ""),
          stats: { matches: 0 },
        }));
        if (!cancelled) setPlayers(mapped);
      } catch (e: any) {
        if (!cancelled) setError(e.message || "Failed to load data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [contestId]);

  const selectedCountBySlot = useMemo(() => {
    const counts: Record<string, number> = {};
    selectedPlayers.forEach((id) => {
      const p = players.find((mp) => mp.id === id);
      if (!p) return;
      const sid = p.slotId;
      counts[sid] = (counts[sid] || 0) + 1;
    });
    return counts;
  }, [selectedPlayers, players]);

  const canNextForActiveSlot = useMemo(() => {
    const s = slots.find((sl) => sl.id === activeSlotId);
    const minRequired = s?.min_select ?? 4;
    return (selectedCountBySlot[activeSlotId] || 0) >= minRequired;
  }, [selectedCountBySlot, activeSlotId, slots]);

  const goToNextSlot = useCallback(() => {
    const idx = slots.findIndex((s) => s.id === activeSlotId);
    const next = slots[Math.min(idx + 1, Math.max(slots.length - 1, 0))];
    if (next) setActiveSlotId(next.id);
  }, [slots, activeSlotId]);

  const goToPrevSlot = useCallback(() => {
    const idx = slots.findIndex((s) => s.id === activeSlotId);
    const prev = slots[Math.max(idx - 1, 0)];
    if (prev) setActiveSlotId(prev.id);
  }, [slots, activeSlotId]);

  const isFirstSlot = useMemo(
    () => slots.findIndex((s) => s.id === activeSlotId) === 0,
    [activeSlotId, slots]
  );

  const handleClearAll = useCallback(() => {
    setSelectedPlayers([]);
    setCaptainId("");
    setViceCaptainId("");
    setCurrentStep(1);
    if (slots[0]) setActiveSlotId(slots[0].id);
    setIsStep1Collapsed(false);
  }, [slots]);

  const handlePlayerSelect = useCallback(
    (playerId: string) => {
      setSelectedPlayers((prev) => {
        if (prev.includes(playerId)) {
          return prev.filter((id) => id !== playerId);
        }
        const player = players.find((p) => p.id === playerId);
        if (!player) return prev;
        const currentSlotCount = prev.filter((id) => {
          const p = players.find((mp) => mp.id === id);
          return (p as any)?.slotId === player.slotId;
        }).length;
        const slotLimit = SLOT_LIMITS[player.slotId] || 4;
        if (currentSlotCount >= slotLimit) {
          return prev;
        }
        return [...prev, playerId];
      });
    },
    [players, SLOT_LIMITS]
  );

  const handleSetCaptain = useCallback((playerId: string) => {
    setCaptainId(playerId);
    setViceCaptainId((vc) => (vc === playerId ? "" : vc));
  }, []);

  const handleSetViceCaptain = useCallback((playerId: string) => {
    setViceCaptainId(playerId);
    setCaptainId((c) => (c === playerId ? "" : c));
  }, []);

  return {
    // data
    slots,
    players,
    loading,
    error,

    // selection state
    selectedPlayers,
    captainId,
    viceCaptainId,
    currentStep,
    activeSlotId,
    isStep1Collapsed,

    // derived
    SLOT_LIMITS,
    selectedCountBySlot,
    canNextForActiveSlot,
    isFirstSlot,

    // setters/handlers
    setSelectedPlayers,
    setCaptainId,
    setViceCaptainId,
    setCurrentStep,
    setIsStep1Collapsed,
    setActiveSlotId,
    handleClearAll,
    handlePlayerSelect,
    handleSetCaptain,
    handleSetViceCaptain,
    goToNextSlot,
    goToPrevSlot,
  };
}

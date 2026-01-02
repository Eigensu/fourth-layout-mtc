import * as React from "react";
import { Avatar } from "../../ui/Avatar";
import { Badge } from "../../ui/Badge";
import type { Player } from "./types.js";

interface CaptainSelectionCardProps {
  player: Player;
  isCaptain: boolean;
  isViceCaptain: boolean;
  onSetCaptain: (playerId: string) => void;
  onSetViceCaptain: (playerId: string) => void;
}

/**
 * Compact card for captain/vice-captain selection on mobile devices.
 * Displays minimal information with inline action buttons.
 */
export const CaptainSelectionCard: React.FC<CaptainSelectionCardProps> = ({
  player,
  isCaptain,
  isViceCaptain,
  onSetCaptain,
  onSetViceCaptain,
}) => {
  const isSelected = isCaptain || isViceCaptain;

  return (
    <div
      className={`
        relative flex items-start gap-3 p-3 rounded-xl border-2 transition-all
        ${isSelected
          ? "border-primary-400 bg-primary-500/10 hover:shadow-md"
          : "border-primary-900/20 bg-primary-900 hover:shadow-md"
        }
      `}
    >
      {isCaptain && (
        <div className="absolute top-2 right-2">
          <Badge
            variant="warning"
            size="sm"
            className="shadow-sm text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-300"
          >
            C
          </Badge>
        </div>
      )}
      {isViceCaptain && (
        <div className="absolute top-2 right-2">
          <Badge
            variant="secondary"
            size="sm"
            className="shadow-sm text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-900 border border-purple-300"
          >
            VC
          </Badge>
        </div>
      )}
      {/* Player Avatar */}
      <Avatar name={player.name} src={player.image} size="sm" className="ring-2 ring-white/10" />

      {/* Player Info */}
      <div className="flex-1 min-w-0">
        <h4 className={`font-semibold text-sm truncate ${isSelected ? "text-gray-900" : "text-white"}`}>
          {player.name}
        </h4>
        <p className={`text-xs truncate ${isSelected ? "text-gray-500" : "text-white/80"}`}>
          {player.team}
        </p>
      </div>

      {/* Action Buttons - Moved lower with mt-8 */}
      <div className="flex flex-col gap-1.5 mt-8">
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!isCaptain) {
              onSetCaptain(player.id);
            }
          }}
          disabled={isCaptain}
          aria-label={isCaptain ? "Captain selected" : "Set as captain"}
          className={`
            px-2.5 py-1 text-[10px] font-bold rounded-md transition-all border
            ${isCaptain
              ? "bg-orange-500 text-white border-orange-600 shadow-sm cursor-default"
              : "bg-white text-orange-600 border-orange-300 hover:bg-orange-50"
            }
          `}
        >
          {isCaptain ? "Captain ✓" : "C"}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!isViceCaptain) {
              onSetViceCaptain(player.id);
            }
          }}
          disabled={isViceCaptain}
          aria-label={
            isViceCaptain ? "Vice Captain selected" : "Set as vice captain"
          }
          className={`
            px-2.5 py-1 text-[10px] font-bold rounded-md transition-all border
            ${isViceCaptain
              ? "bg-purple-600 text-white border-purple-700 shadow-sm cursor-default"
              : "bg-white text-purple-600 border-purple-300 hover:bg-purple-50"
            }
          `}
        >
          {isViceCaptain ? "V.Captain ✓" : "VC"}
        </button>
      </div>
    </div>
  );
};

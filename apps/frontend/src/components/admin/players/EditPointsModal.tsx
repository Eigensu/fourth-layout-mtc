"use client";

import { useState } from "react";
import { Player, playersApi } from "@/lib/api/admin/players";
import { getErrorMessage } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";

interface EditPointsModalProps {
  player: Player | null;
  onClose: () => void;
  onSaved: () => void; // caller should refresh list
}

export function EditPointsModal({ player, onClose, onSaved }: EditPointsModalProps) {
  const [points, setPoints] = useState<string>(
    player?.points != null ? String(player.points) : "0"
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!player) return null;

  const submit = async () => {
    setError(null);
    const value = Number(points);
    if (Number.isNaN(value)) {
      setError("Please enter a valid number");
      return;
    }
    setSaving(true);
    try {
      await playersApi.updatePlayer(player.id, { points: value });
      onSaved();
      onClose();
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="p-4 border-b">
          <h3 className="text-lg font-semibold">Edit Points</h3>
          <p className="text-sm text-gray-500">{player.name}</p>
        </CardHeader>
        <CardBody className="p-4 space-y-4">
          <label className="block text-sm font-medium text-gray-700">
            Points
            <input
              type="number"
              step="0.1"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </label>
          {error && (
            <div className="text-sm text-red-600" role="alert">
              {error}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" onClick={submit} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

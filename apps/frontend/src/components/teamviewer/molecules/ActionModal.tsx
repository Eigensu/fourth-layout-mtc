"use client";

import React from "react";
import { Button } from "@/components";

export interface ActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReplace: () => void;
  onMakeCaptain: () => void;
  onMakeViceCaptain: () => void;
  saving: boolean;
}

export function ActionModal({
  isOpen,
  onClose,
  onReplace,
  onMakeCaptain,
  onMakeViceCaptain,
  saving,
}: ActionModalProps) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h3 className="font-semibold text-gray-900">Player Actions</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>
        <div className="p-5 space-y-3">
          <Button variant="secondary" className="w-full" onClick={onReplace}>
            Replace Player
          </Button>
          <div className="flex gap-2">
            <Button variant="primary" className="flex-1" onClick={onMakeCaptain} disabled={saving}>
              {saving ? "Saving..." : "Make Captain"}
            </Button>
            <Button variant="primary" className="flex-1" onClick={onMakeViceCaptain} disabled={saving}>
              {saving ? "Saving..." : "Make V.Captain"}
            </Button>
          </div>
        </div>
        <div className="px-5 py-3 border-t flex justify-end">
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}

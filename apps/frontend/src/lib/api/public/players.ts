import { NEXT_PUBLIC_API_URL } from "@/config/env";

export type ApiPlayer = {
  id: string;
  name: string;
  team?: string;
  role?: string;
  price: number;
  slot: string | null; // Slot ObjectId
  points?: number;
  image_url?: string | null;
};

export async function fetchPlayersBySlot(slotId: string, contestId?: string): Promise<ApiPlayer[]> {
  const q = new URLSearchParams();
  q.set("slot", String(slotId));
  if (contestId) q.set("contest_id", String(contestId));
  const res = await fetch(`${NEXT_PUBLIC_API_URL}/api/players?${q.toString()}`);
  if (!res.ok) throw new Error(`Failed to load players for slot ${slotId} (${res.status})`);
  return (await res.json()) as ApiPlayer[];
}

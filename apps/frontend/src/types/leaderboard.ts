export interface LeaderboardEntry {
  rank: number;
  username: string;
  displayName: string;
  teamName: string;
  points: number;
  rankChange?: number; // positive = moved up, negative = moved down, 0 or undefined = no change
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  currentUserEntry?: LeaderboardEntry;
}

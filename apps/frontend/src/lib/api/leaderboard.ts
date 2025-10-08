import { LeaderboardResponse } from '@/types/leaderboard';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const leaderboardApi = {
  getLeaderboard: async (): Promise<LeaderboardResponse> => {
    const response = await fetch(`${API_URL}/api/leaderboard`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch leaderboard');
    }

    return response.json();
  },
};

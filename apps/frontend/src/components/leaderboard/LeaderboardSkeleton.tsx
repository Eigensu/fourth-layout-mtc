"use client";

import React from "react";

export const LeaderboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-4">
      {/* Top 3 skeletons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white rounded-3xl p-6 border border-gray-200 animate-pulse"
          >
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 bg-gray-200 rounded-full mb-4" />
              <div className="w-16 h-16 bg-gray-200 rounded-full mb-4" />
              <div className="h-6 w-32 bg-gray-200 rounded mb-2" />
              <div className="h-4 w-24 bg-gray-200 rounded mb-3" />
              <div className="h-8 w-20 bg-gray-200 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* List skeletons */}
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-2xl p-4 border border-gray-200 animate-pulse"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <div className="w-12 h-12 bg-gray-200 rounded-full" />
              <div className="w-10 h-10 bg-gray-200 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-5 w-32 bg-gray-200 rounded" />
                <div className="h-4 w-24 bg-gray-200 rounded" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-8 w-20 bg-gray-200 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

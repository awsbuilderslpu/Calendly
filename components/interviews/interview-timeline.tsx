"use client";

import { DateTime } from "luxon";

export function InterviewTimeline({ events }: { events: Record<string, unknown>[] }) {
  return (
    <div className="mt-8">
      <h2 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">Timeline</h2>
      <div className="space-y-4">
        {events.map((e, idx) => {
          const meta = (e.metadata || {}) as Record<string, unknown>;
          return (
            <div key={idx} className="border-l-2 border-gray-200 pl-4 py-2">
              <p className="text-sm font-medium text-gray-500">
                {DateTime.fromISO(String(e.created_at)).toFormat("LLL d, h:mm a")}
              </p>
              <p className="text-gray-900 dark:text-white font-medium mt-1">
                {String(e.actor_type)} {String(e.event_type).replace(/_/g, " ").toLowerCase()}
              </p>
              {Boolean(meta.reason) && (
                <p className="text-sm text-gray-600 mt-1 italic">&quot;{meta.reason as string}&quot;</p>
              )}
              {String(e.event_type) === "RESCHEDULED" && Boolean(meta.newStartsAt) && (
                <p className="text-sm text-gray-600 mt-1">
                  Moved to {DateTime.fromISO(meta.newStartsAt as string).toFormat("LLL d, h:mm a")}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

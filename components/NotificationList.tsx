"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function NotificationList({ notifications }: { notifications: Record<string, unknown>[] }) {
  const router = useRouter();
  const [retrying, setRetrying] = useState<string | null>(null);

  const handleRetry = async (id: string) => {
    setRetrying(id);
    try {
      await fetch(`/api/notifications/${id}/retry`, { method: "POST" });
      router.refresh();
    } finally {
      setRetrying(null);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Recipient</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Type</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Scheduled</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Sent</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Attempts</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {notifications.map((n) => (
            <tr key={n.id as string}>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                <a href={`/interviews/${n.interview_id as string}`} className="text-blue-600 hover:underline">{String(n.recipient_email)}</a>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{String(n.type)}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  String(n.status) === 'SENT' ? 'bg-green-100 text-green-800' :
                  String(n.status) === 'FAILED' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {String(n.status)}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                {n.scheduled_for as string ? new Date(n.scheduled_for as string).toLocaleString() : '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                {n.sent_at as string ? new Date(n.sent_at as string).toLocaleString() : '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{n.attempt_count as number}</td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                {String(n.status) === 'FAILED' && (
                  <button
                    onClick={() => handleRetry(n.id as string)}
                    disabled={retrying === n.id as string}
                    className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400"
                  >
                    {retrying === n.id as string ? "Retrying..." : "Retry"}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function calculateNextRetry(attemptCount: number): Date | null {
  const MAX_ATTEMPTS = 4; // Initial + 3 retries
  if (attemptCount >= MAX_ATTEMPTS) {
    return null;
  }
  
  // 1st retry: 1 min, 2nd: 5 mins, 3rd: 15 mins
  const delays = [0, 1, 5, 15];
  const delayMinutes = delays[attemptCount] || 15;
  
  return new Date(Date.now() + delayMinutes * 60000);
}

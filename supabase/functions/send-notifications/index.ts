// send-notifications Edge Function — Phase 4
// Runs on a daily cron schedule.
// 1. Refreshes streaming_availability for all watchlisted titles
// 2. Cross-references against each user's user_subscriptions
// 3. Checks notification_log to skip already-sent alerts
// 4. Sends email via Resend, inserts into notification_log

// Stub — full implementation in Phase 4
Deno.serve(async (_req) => {
  return new Response(JSON.stringify({ message: 'send-notifications stub — Phase 4' }), {
    headers: { 'Content-Type': 'application/json' },
  })
})

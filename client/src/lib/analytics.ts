type EventName =
  | "landing_page_view"
  | "demo_view"
  | "signup_started"
  | "signup_completed"
  | "login_completed"
  | "plan_created"
  | "upgrade_clicked"
  | "waitlist_joined"
  | "onboarding_started"
  | "onboarding_completed"
  | "pricing_view";

interface TrackOptions {
  userId?: number;
  metadata?: Record<string, unknown>;
}

async function track(eventName: EventName, options: TrackOptions = {}): Promise<void> {
  try {
    await fetch("/api/analytics/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        eventName,
        metadata: options.metadata ? JSON.stringify(options.metadata) : undefined,
      }),
    });
  } catch {
    // analytics should never break the app
  }
}

export const analytics = { track };

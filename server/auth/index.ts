import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { storage } from "../services/storage";
import { comparePasswords } from "./crypto";
import { google, appConfig } from "../config";

// ── Local (email + password) ─────────────────────────────────
passport.use(
  new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {
    try {
      const user = await storage.getUserByEmail(email.toLowerCase().trim());
      if (!user) return done(null, false, { message: "No account found with that email." });
      if (!user.passwordHash) {
        return done(null, false, { message: "This account uses Google sign-in. Please continue with Google." });
      }
      const valid = await comparePasswords(password, user.passwordHash);
      if (!valid) return done(null, false, { message: "Incorrect password." });
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  })
);

// ── Google OAuth 2.0 ─────────────────────────────────────────
if (google.configured) {
  /**
   * Callback URL resolution (highest → lowest priority):
   *  1. GOOGLE_CALLBACK_URL  — explicit override, use this in production
   *  2. PUBLIC_APP_URL       — e.g. https://adivi.ai
   *  3. First REPLIT_DOMAINS — e.g. https://xyz.riker.replit.dev
   *  4. Relative             — only works if both ends share the same origin
   *
   * This URL MUST be added verbatim to:
   *   Google Cloud Console → APIs & Services → Credentials →
   *   OAuth 2.0 Client IDs → Authorised redirect URIs
   */
  const callbackURL = (() => {
    if (google.callbackUrl) return google.callbackUrl;
    if (appConfig.publicUrl) return `${appConfig.publicUrl.replace(/\/$/, "")}/api/auth/google/callback`;
    const domain = appConfig.replitDomains.split(",")[0].trim();
    if (domain) return `https://${domain}/api/auth/google/callback`;
    return "/api/auth/google/callback";
  })();

  // Log at startup so developers can immediately see and register the correct URI.
  console.info("[OAuth] Google callback URL:", callbackURL);
  console.info("[OAuth] Register this URL in Google Cloud Console → Credentials → Authorised redirect URIs");

  passport.use(
    new GoogleStrategy(
      {
        clientID: google.clientId!,
        clientSecret: google.clientSecret!,
        callbackURL,
        scope: ["email", "profile"],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) return done(new Error("Google account has no email address."));
          const user = await storage.findOrCreateGoogleUser(profile.id, email);
          return done(null, user);
        } catch (err) {
          return done(err as Error);
        }
      }
    )
  );
}

// ── Session helpers ──────────────────────────────────────────
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: number, done) => {
  try {
    const user = await storage.getUserById(id);
    done(null, user ?? false);
  } catch (err) {
    done(err);
  }
});

export { passport };
export const googleAuthConfigured = google.configured;

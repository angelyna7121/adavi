import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect } from "react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Zap, AlertCircle, CheckCircle2 } from "lucide-react";
import { SiGoogle } from "react-icons/si";

const BG = "#0D1929";
const CARD = "#16233B";
const GOLD = "#C5A35A";
const BORDER = "rgba(197,163,90,0.25)";
const MUTED = "rgba(255,255,255,0.45)";

const schema = z
  .object({
    email: z.string().email("Enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

export default function Signup() {
  const { user, signup } = useAuth();
  const [, navigate] = useLocation();
  const [urlError, setUrlError] = useState<string | null>(null);

  useEffect(() => { if (user) navigate("/dashboard"); }, [user]);
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const code = p.get("error");
    if (code === "google_failed" || code === "google_403") {
      setUrlError("Google sign-in is temporarily unavailable. Please use email sign-in below.");
    } else if (code === "google_not_configured") {
      setUrlError("Google sign-in is not available. Please use email sign-in below.");
    }
  }, []);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "", confirmPassword: "" },
  });

  const onSubmit = ({ email, password }: FormValues) => signup.mutate({ email, password });

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: BG }}>
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <Link href="/" className="flex items-center gap-2.5 mb-6">
            <div className="p-2 rounded-xl" style={{ background: GOLD }}>
              <Zap className="w-5 h-5" style={{ color: BG }} />
            </div>
            <span className="text-xl font-bold text-white">adavi.ai</span>
          </Link>
          <h1 className="text-2xl font-bold text-white">Create your account</h1>
          <p className="mt-1 text-sm" style={{ color: MUTED }}>Start for free — no credit card required</p>
        </div>

        <div className="rounded-2xl p-6 border" style={{ background: CARD, borderColor: BORDER }}>
          {(urlError || signup.error) && (
            <div className="flex items-center gap-2 rounded-lg px-3 py-2.5 mb-4 border text-sm"
              style={{ background: "rgba(239,68,68,0.1)", borderColor: "rgba(239,68,68,0.3)", color: "#FCA5A5" }}>
              <AlertCircle className="w-4 h-4 shrink-0" />
              {urlError ?? signup.error?.message}
            </div>
          )}

          <a href="/api/auth/google" data-testid="button-google-signup">
            <Button
              type="button"
              variant="outline"
              className="w-full flex items-center justify-center gap-2.5 h-11 font-medium hover:bg-white/10"
              style={{ background: "rgba(255,255,255,0.05)", borderColor: BORDER, color: "white" }}
            >
              <SiGoogle className="w-4 h-4 text-[#4285F4]" />
              Continue with Google
            </Button>
          </a>
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
            <span className="text-xs" style={{ color: MUTED }}>or</span>
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/70 text-sm">Email Address</FormLabel>
                  <FormControl>
                    <Input
                      type="email" placeholder="you@example.com" autoComplete="email"
                      data-testid="input-email" {...field}
                      className="border text-white placeholder:text-white/25"
                      style={{ background: "rgba(255,255,255,0.05)", borderColor: BORDER }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/70 text-sm">Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password" placeholder="Min. 8 characters" autoComplete="new-password"
                      data-testid="input-password" {...field}
                      className="border text-white placeholder:text-white/25"
                      style={{ background: "rgba(255,255,255,0.05)", borderColor: BORDER }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/70 text-sm">Confirm Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password" placeholder="Repeat your password" autoComplete="new-password"
                      data-testid="input-confirm-password" {...field}
                      className="border text-white placeholder:text-white/25"
                      style={{ background: "rgba(255,255,255,0.05)", borderColor: BORDER }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <Button
                type="submit"
                className="w-full h-11 font-bold text-sm mt-2"
                style={{ background: GOLD, color: BG }}
                disabled={signup.isPending}
                data-testid="button-signup"
              >
                {signup.isPending ? "Creating account…" : "Create Free Account"}
              </Button>
            </form>
          </Form>

          <div className="mt-5 pt-5 space-y-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            {["Net Worth Builder", "Income Strategy Calculator", "Unlimited calculations — free forever"].map((f) => (
              <div key={f} className="flex items-center gap-2 text-xs" style={{ color: MUTED }}>
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{ color: GOLD }} />
                {f}
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-sm mt-5" style={{ color: MUTED }}>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-white hover:underline" data-testid="link-login">
            Log In
          </Link>
        </p>
      </div>
    </div>
  );
}

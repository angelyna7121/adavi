import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Zap, AlertCircle } from "lucide-react";
import { SiGoogle } from "react-icons/si";

const BG = "#0D1929";
const CARD = "#16233B";
const GOLD = "#C5A35A";
const BORDER = "rgba(197,163,90,0.25)";
const MUTED = "rgba(255,255,255,0.45)";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});
type FormValues = z.infer<typeof schema>;

export default function Login() {
  const { user, login } = useAuth();
  const [, navigate] = useLocation();
  const [urlError, setUrlError] = useState<string | null>(null);

  const { data: providers } = useQuery<{ google: boolean }>({
    queryKey: ["/api/auth/providers"],
    staleTime: Infinity,
  });

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

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });
  const onSubmit = (v: FormValues) => login.mutate(v);

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
          <h1 className="text-2xl font-bold text-white">Welcome back</h1>
          <p className="mt-1 text-sm" style={{ color: MUTED }}>Sign in to your adavi.ai account</p>
        </div>

        <div className="rounded-2xl p-6 border" style={{ background: CARD, borderColor: BORDER }}>
          {(urlError || login.error) && (
            <div className="flex items-center gap-2 rounded-lg px-3 py-2.5 mb-4 border text-sm" style={{ background: "rgba(239,68,68,0.1)", borderColor: "rgba(239,68,68,0.3)", color: "#FCA5A5" }}>
              <AlertCircle className="w-4 h-4 shrink-0" />
              {urlError ?? login.error?.message}
            </div>
          )}

          {providers?.google && (
            <>
              <a href="/api/auth/google" data-testid="button-google-login">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full flex items-center justify-center gap-2.5 h-11 font-medium"
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
            </>
          )}

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
                  <div className="flex items-center justify-between">
                    <FormLabel className="text-white/70 text-sm">Password</FormLabel>
                    <span className="text-xs cursor-pointer" style={{ color: GOLD }}>Forgot password?</span>
                  </div>
                  <FormControl>
                    <Input
                      type="password" placeholder="••••••••" autoComplete="current-password"
                      data-testid="input-password" {...field}
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
                disabled={login.isPending}
                data-testid="button-login"
              >
                {login.isPending ? "Signing in…" : "Sign In"}
              </Button>
            </form>
          </Form>
        </div>

        <p className="text-center text-sm mt-5" style={{ color: MUTED }}>
          Don't have an account?{" "}
          <Link href="/signup" className="font-semibold text-white hover:underline" data-testid="link-signup">
            Create Account
          </Link>
        </p>
      </div>
    </div>
  );
}

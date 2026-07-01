import { AppLayout } from "@/components/layout/AppLayout";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import {
  User, Lock, LogOut, Trash2, Crown, Shield, CreditCard,
  CheckCircle2, ChevronRight,
} from "lucide-react";
import { SiGoogle as GoogleIcon } from "react-icons/si";
import { BG, CARD, CARD2, GOLD, GOLD_BORDER, BORDER, MUTED, DIM } from "@/lib/design";

const PROVINCES = ["AB","BC","MB","NB","NL","NS","NT","NU","ON","PE","QC","SK","YT"];
const PROVINCE_NAMES: Record<string,string> = {
  AB:"Alberta", BC:"British Columbia", MB:"Manitoba", NB:"New Brunswick",
  NL:"Newfoundland & Labrador", NS:"Nova Scotia", NT:"Northwest Territories",
  NU:"Nunavut", ON:"Ontario", PE:"Prince Edward Island", QC:"Quebec",
  SK:"Saskatchewan", YT:"Yukon",
};

function SectionCard({ children, accent }: { children: React.ReactNode; accent?: "danger" }) {
  return (
    <div
      className="rounded-2xl border p-6 mb-5"
      style={{
        background: CARD,
        borderColor: accent === "danger" ? "rgba(239,68,68,0.25)" : BORDER,
      }}
    >
      {children}
    </div>
  );
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(197,163,90,0.15)" }}>
        {icon}
      </div>
      <h2 className="font-bold text-white text-base">{title}</h2>
    </div>
  );
}

export default function Settings() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  // ── Profile state ──────────────────────────────────────────
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [province, setProvince] = useState("ON");

  useEffect(() => {
    if (user?.profile) {
      setFirstName(user.profile.firstName ?? "");
      setLastName(user.profile.lastName ?? "");
      setProvince(user.profile.province ?? "ON");
    }
  }, [user]);

  const profileMutation = useMutation({
    mutationFn: () => apiRequest("PUT", "/api/settings/profile", { firstName, lastName, province }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "Profile updated", description: "Your information has been saved." });
    },
    onError: () => toast({ title: "Update failed", description: "Please check your input and try again.", variant: "destructive" }),
  });

  // ── Password state ─────────────────────────────────────────
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  const passwordMutation = useMutation({
    mutationFn: () => apiRequest("PUT", "/api/settings/password", { currentPassword: currentPw, newPassword: newPw }),
    onSuccess: () => {
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
      toast({ title: "Password updated", description: "You'll use the new password next time you log in." });
    },
    onError: () => toast({ title: "Password change failed", description: "Please check your current password and try again.", variant: "destructive" }),
  });

  const handlePasswordSave = () => {
    if (newPw.length < 8) {
      toast({ title: "Password too short", description: "Minimum 8 characters.", variant: "destructive" }); return;
    }
    if (newPw !== confirmPw) {
      toast({ title: "Passwords don't match", description: "Please confirm your new password.", variant: "destructive" }); return;
    }
    passwordMutation.mutate();
  };

  const isPro = user?.subscriptionStatus === "active" || user?.subscriptionStatus === "trialing";
  const planLabel = isPro ? "Pro" : "Free";
  const planColor = isPro ? GOLD : "rgba(255,255,255,0.35)";

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-10 max-w-2xl">

        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Account Settings</h1>
          <p className="text-sm mt-1" style={{ color: MUTED }}>
            Manage your profile, security, and subscription.
          </p>
        </div>

        {/* ── Profile ────────────────────────────────────────── */}
        <SectionCard>
          <SectionHeader
            icon={<User className="w-4 h-4" style={{ color: GOLD }} />}
            title="Profile"
          />
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <Label className="text-sm font-medium mb-1.5 block" style={{ color: MUTED }}>First Name</Label>
              <Input
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                placeholder="Jane"
                className="border text-white placeholder:text-white/20"
                style={{ background: "rgba(255,255,255,0.05)", borderColor: BORDER }}
                data-testid="input-first-name"
              />
            </div>
            <div>
              <Label className="text-sm font-medium mb-1.5 block" style={{ color: MUTED }}>Last Name</Label>
              <Input
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                placeholder="Smith"
                className="border text-white placeholder:text-white/20"
                style={{ background: "rgba(255,255,255,0.05)", borderColor: BORDER }}
                data-testid="input-last-name"
              />
            </div>
          </div>

          <div className="mb-5">
            <Label className="text-sm font-medium mb-1.5 block" style={{ color: MUTED }}>Province / Territory</Label>
            <Select value={province} onValueChange={setProvince}>
              <SelectTrigger
                className="border text-white w-full"
                style={{ background: "rgba(255,255,255,0.05)", borderColor: BORDER }}
                data-testid="select-province"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent style={{ background: "#16233B", borderColor: BORDER }}>
                {PROVINCES.map(p => (
                  <SelectItem key={p} value={p} className="text-white" data-testid={`option-province-${p}`}>
                    {PROVINCE_NAMES[p]} ({p})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs mt-1" style={{ color: DIM }}>Used to apply the correct provincial tax rates in your calculations.</p>
          </div>

          <Button
            className="font-semibold"
            style={{ background: GOLD, color: BG }}
            onClick={() => profileMutation.mutate()}
            disabled={profileMutation.isPending}
            data-testid="button-save-profile"
          >
            {profileMutation.isPending ? "Saving…" : "Save Profile"}
          </Button>
        </SectionCard>

        {/* ── Account / Email ────────────────────────────────── */}
        <SectionCard>
          <SectionHeader
            icon={<Shield className="w-4 h-4" style={{ color: GOLD }} />}
            title="Account"
          />

          <div className="mb-4">
            <Label className="text-sm font-medium mb-1.5 block" style={{ color: MUTED }}>Email Address</Label>
            <Input
              type="email"
              value={user?.email ?? ""}
              readOnly
              className="border text-white/60 cursor-default select-all"
              style={{ background: "rgba(255,255,255,0.03)", borderColor: BORDER }}
              data-testid="text-email"
            />
            {user?.googleId ? (
              <p className="text-xs mt-1.5 flex items-center gap-1.5" style={{ color: DIM }}>
                <GoogleIcon className="w-3 h-3 text-[#4285F4]" />
                Managed by Google — change your email in your Google account.
              </p>
            ) : (
              <p className="text-xs mt-1" style={{ color: DIM }}>
                Email cannot be changed directly. Contact support if needed.
              </p>
            )}
          </div>

          {/* Subscription status */}
          <div className="flex items-center justify-between rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}` }}>
            <div className="flex items-center gap-3">
              <CreditCard className="w-4 h-4" style={{ color: GOLD }} />
              <div>
                <p className="text-sm font-semibold text-white">
                  {planLabel} Plan
                  {user?.subscriptionStatus === "trialing" && (
                    <span className="ml-2 text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(197,163,90,0.2)", color: GOLD }}>Trial</span>
                  )}
                </p>
                <p className="text-xs" style={{ color: DIM }}>
                  {isPro ? "Full access to all Pro features." : "Unlimited calculations. Upgrade for insights and exports."}
                </p>
              </div>
            </div>
            {!isPro && (
              <Link href="/pricing" data-testid="link-upgrade">
                <Button
                  size="sm"
                  className="font-semibold text-xs h-8 px-3 flex items-center gap-1"
                  style={{ background: GOLD, color: BG }}
                >
                  Upgrade <ChevronRight className="w-3 h-3" />
                </Button>
              </Link>
            )}
            {isPro && (
              <span className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: GOLD }}>
                <CheckCircle2 className="w-4 h-4" /> Active
              </span>
            )}
          </div>
        </SectionCard>

        {/* ── Password (non-Google only) ─────────────────────── */}
        {!user?.googleId && (
          <SectionCard>
            <SectionHeader
              icon={<Lock className="w-4 h-4" style={{ color: GOLD }} />}
              title="Change Password"
            />
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium mb-1.5 block" style={{ color: MUTED }}>Current Password</Label>
                <Input
                  type="password"
                  value={currentPw}
                  onChange={e => setCurrentPw(e.target.value)}
                  placeholder="••••••••"
                  className="border text-white placeholder:text-white/20"
                  style={{ background: "rgba(255,255,255,0.05)", borderColor: BORDER }}
                  data-testid="input-current-password"
                />
              </div>
              <div>
                <Label className="text-sm font-medium mb-1.5 block" style={{ color: MUTED }}>New Password</Label>
                <Input
                  type="password"
                  value={newPw}
                  onChange={e => setNewPw(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="border text-white placeholder:text-white/20"
                  style={{ background: "rgba(255,255,255,0.05)", borderColor: BORDER }}
                  data-testid="input-new-password"
                />
              </div>
              <div>
                <Label className="text-sm font-medium mb-1.5 block" style={{ color: MUTED }}>Confirm New Password</Label>
                <Input
                  type="password"
                  value={confirmPw}
                  onChange={e => setConfirmPw(e.target.value)}
                  placeholder="Repeat new password"
                  className="border text-white placeholder:text-white/20"
                  style={{ background: "rgba(255,255,255,0.05)", borderColor: BORDER }}
                  data-testid="input-confirm-password"
                />
              </div>
              <Button
                variant="outline"
                className="border text-white/70 hover:text-white hover:bg-white/5"
                style={{ borderColor: BORDER }}
                onClick={handlePasswordSave}
                disabled={passwordMutation.isPending || !currentPw || !newPw || !confirmPw}
                data-testid="button-change-password"
              >
                {passwordMutation.isPending ? "Updating…" : "Update Password"}
              </Button>
            </div>
          </SectionCard>
        )}

        {/* ── Data & Privacy ─────────────────────────────────── */}
        <SectionCard>
          <SectionHeader
            icon={<Shield className="w-4 h-4" style={{ color: GOLD }} />}
            title="Data & Privacy"
          />
          <p className="text-sm mb-4" style={{ color: MUTED }}>
            View and manage all data adavi.ai holds about you — uploaded documents, saved reports, data export, and account deletion.
          </p>
          <Link href="/data-privacy" data-testid="link-data-privacy-center">
            <Button
              variant="outline"
              className="w-full justify-between border text-white/70 hover:text-white hover:bg-white/5 font-medium"
              style={{ borderColor: BORDER }}
            >
              <span className="flex items-center gap-2">
                <Shield className="w-4 h-4" style={{ color: GOLD }} />
                Open Data & Privacy Center
              </span>
              <ChevronRight className="w-4 h-4 opacity-40" />
            </Button>
          </Link>
        </SectionCard>

        {/* ── Danger zone ────────────────────────────────────── */}
        <SectionCard accent="danger">
          <h2 className="font-bold text-white mb-4">Account Actions</h2>
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start border text-white/60 hover:text-white hover:bg-white/5 font-medium"
              style={{ borderColor: BORDER }}
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
              data-testid="button-logout-settings"
            >
              <LogOut className="w-4 h-4 mr-2" />
              {logout.isPending ? "Signing out…" : "Sign Out"}
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start border text-red-400/60 hover:text-red-400 hover:bg-red-400/5 font-medium"
              style={{ borderColor: "rgba(239,68,68,0.2)" }}
              onClick={() => toast({ title: "Contact support to delete your account", description: "Email support@adavi.ai" })}
              data-testid="button-delete-account"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Account
            </Button>
          </div>
        </SectionCard>

        {/* Disclaimer */}
        <p className="text-xs text-center mt-2" style={{ color: DIM }}>
          This tool provides estimates based on current Canadian tax rules and does not constitute financial or tax advice.
        </p>
      </div>
    </AppLayout>
  );
}

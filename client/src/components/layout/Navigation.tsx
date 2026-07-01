import { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, LogOut, User, ChevronDown, Settings, CreditCard,
  FileText, Zap, Crown, Shield, Menu, X, TrendingUp, PieChart,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const GOLD = "#C5A35A";
const GOLD_BORDER = "rgba(197,163,90,0.25)";
const CARD = "#16233B";
const BORDER = "rgba(255,255,255,0.08)";
const MUTED = "rgba(255,255,255,0.55)";
const DIM = "rgba(255,255,255,0.3)";

export function Navigation() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isPro = user?.subscriptionStatus === "active" || user?.subscriptionStatus === "trialing";

  const authLinks = [
    { href: "/dashboard",       label: "Dashboard",       icon: LayoutDashboard },
    { href: "/net-worth",       label: "Net Worth",       icon: PieChart },
    { href: "/income-strategy", label: "Income Strategy", icon: TrendingUp },
    { href: "/reports",         label: "Reports",         icon: FileText },
  ];
  const publicLinks = [
    { href: "/income-strategy", label: "Income Strategy", icon: TrendingUp },
    { href: "/pricing",         label: "Pricing",         icon: null },
    { href: "/trust-center",    label: "Trust Center",    icon: Shield },
  ];
  const links = user ? authLinks : publicLinks;

  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      <header
        className="sticky top-0 z-50 w-full border-b"
        style={{ background: "#0D1929", borderColor: "rgba(197,163,90,0.2)" }}
      >
        <div className="container flex h-16 items-center justify-between">
          {/* Logo + desktop nav */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2.5 font-bold text-xl tracking-tight text-white">
              <div className="p-1.5 rounded-lg" style={{ background: GOLD }}>
                <Zap className="w-4 h-4" style={{ color: "#0D1929" }} />
              </div>
              adavi.ai
            </Link>
            <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "transition-colors",
                    location.startsWith(link.href)
                      ? "text-white font-semibold"
                      : "text-white/50 hover:text-white"
                  )}
                  data-testid={`link-nav-${link.label.toLowerCase().replace(/\s/g, "-")}`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Desktop right side */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                {!isPro && (
                  <Link href="/pricing" className="hidden sm:block">
                    <Button
                      size="sm"
                      className="font-bold text-xs"
                      style={{ background: GOLD, color: "#0D1929" }}
                      data-testid="button-upgrade-nav"
                    >
                      <Crown className="w-3.5 h-3.5 mr-1.5" />
                      Upgrade
                    </Button>
                  </Link>
                )}
                {isPro && (
                  <Badge className="hidden sm:flex text-xs font-semibold px-2 py-0.5 border" style={{ background: "rgba(197,163,90,0.15)", color: GOLD, borderColor: GOLD }}>
                    PRO
                  </Badge>
                )}
                {/* Desktop account dropdown */}
                <div className="hidden md:block">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex items-center gap-2 text-sm text-white/70 hover:text-white hover:bg-white/5"
                        data-testid="button-account-menu"
                      >
                        <div className="w-7 h-7 rounded-full flex items-center justify-center border" style={{ background: "rgba(197,163,90,0.15)", borderColor: "rgba(197,163,90,0.3)" }}>
                          <User className="w-3.5 h-3.5" style={{ color: GOLD }} />
                        </div>
                        <span className="hidden sm:block max-w-[120px] truncate text-sm">{user.email}</span>
                        <ChevronDown className="w-3.5 h-3.5 text-white/40" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52 border" style={{ background: CARD, borderColor: "rgba(197,163,90,0.2)" }}>
                      <DropdownMenuItem asChild className="text-white/80 hover:text-white focus:text-white focus:bg-white/5 cursor-pointer">
                        <Link href="/dashboard" data-testid="link-account-dashboard"><LayoutDashboard className="w-4 h-4 mr-2" />Dashboard</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="text-white/80 hover:text-white focus:text-white focus:bg-white/5 cursor-pointer">
                        <Link href="/reports" data-testid="link-account-reports"><FileText className="w-4 h-4 mr-2" />Reports</Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator style={{ background: BORDER }} />
                      <DropdownMenuItem asChild className="text-white/80 hover:text-white focus:text-white focus:bg-white/5 cursor-pointer">
                        <Link href="/settings" data-testid="link-account-settings"><Settings className="w-4 h-4 mr-2" />Settings</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="text-white/80 hover:text-white focus:text-white focus:bg-white/5 cursor-pointer">
                        <Link href="/billing" data-testid="link-account-billing"><CreditCard className="w-4 h-4 mr-2" />Billing</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="text-white/80 hover:text-white focus:text-white focus:bg-white/5 cursor-pointer">
                        <Link href="/trust-center" data-testid="link-account-trust"><Shield className="w-4 h-4 mr-2" />Trust Center</Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator style={{ background: BORDER }} />
                      <DropdownMenuItem
                        className="text-red-400 focus:text-red-400 focus:bg-white/5 cursor-pointer"
                        onClick={() => logout.mutate()}
                        data-testid="button-logout"
                      >
                        <LogOut className="w-4 h-4 mr-2" />Log Out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="text-white/70 hover:text-white hover:bg-white/5 font-medium" data-testid="button-login-nav">
                    Log In
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button size="sm" className="font-bold" style={{ background: GOLD, color: "#0D1929" }} data-testid="button-signup-nav">
                    Start Free
                  </Button>
                </Link>
              </div>
            )}

            {/* Mobile hamburger */}
            <button
              className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg border transition-colors hover:bg-white/5"
              style={{ borderColor: BORDER }}
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              data-testid="button-mobile-menu"
            >
              <Menu className="w-5 h-5 text-white/70" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] md:hidden" onClick={closeMobile}>
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.65)" }} />
        </div>
      )}

      {/* Mobile drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-72 z-[70] flex flex-col transition-transform duration-300 ease-in-out md:hidden`}
        style={{
          background: "#0f1e33",
          borderLeft: `1px solid ${GOLD_BORDER}`,
          transform: mobileOpen ? "translateX(0)" : "translateX(100%)",
        }}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: BORDER }}>
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md" style={{ background: GOLD }}>
              <Zap className="w-3.5 h-3.5" style={{ color: "#0D1929" }} />
            </div>
            <span className="font-bold text-white">adavi.ai</span>
          </div>
          <button
            onClick={closeMobile}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/5"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav links */}
        <nav className="px-4 py-4 space-y-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={closeMobile}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                location.startsWith(link.href)
                  ? "text-white bg-white/8"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              )}
            >
              {link.icon && <link.icon className="w-4 h-4" style={{ color: location.startsWith(link.href) ? GOLD : undefined }} />}
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="mx-4" style={{ borderTop: `1px solid ${BORDER}` }} />

        {/* Account section */}
        <div className="px-4 py-4 flex-1 space-y-1">
          {user ? (
            <>
              {/* User email */}
              <div className="px-3 py-2 mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center border shrink-0" style={{ background: "rgba(197,163,90,0.15)", borderColor: GOLD_BORDER }}>
                    <User className="w-3.5 h-3.5" style={{ color: GOLD }} />
                  </div>
                  <span className="text-xs truncate text-white/60">{user.email}</span>
                </div>
              </div>

              {[
                { href: "/settings", label: "Settings", icon: Settings },
                { href: "/billing",  label: "Billing",  icon: CreditCard },
                { href: "/trust-center", label: "Trust Center", icon: Shield },
              ].map(item => (
                <Link key={item.href} href={item.href} onClick={closeMobile}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors">
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              ))}

              {!isPro && (
                <Link href="/pricing" onClick={closeMobile}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-colors"
                  style={{ background: "rgba(197,163,90,0.1)", color: GOLD }}>
                  <Crown className="w-4 h-4" />
                  Upgrade to Pro
                </Link>
              )}

              <button
                onClick={() => { logout.mutate(); closeMobile(); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-400 hover:bg-white/5 transition-colors"
                data-testid="button-logout-mobile"
              >
                <LogOut className="w-4 h-4" />
                Log Out
              </button>
            </>
          ) : (
            <div className="space-y-2 pt-2">
              <Link href="/login" onClick={closeMobile}>
                <Button variant="outline" className="w-full border text-white hover:bg-white/5" style={{ borderColor: BORDER }}>
                  Log In
                </Button>
              </Link>
              <Link href="/signup" onClick={closeMobile}>
                <Button className="w-full font-bold" style={{ background: GOLD, color: "#0D1929" }}>
                  Create Free Account
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Drawer footer */}
        <div className="px-5 py-4 border-t" style={{ borderColor: BORDER }}>
          <p className="text-xs" style={{ color: DIM }}>Educational estimates only. Not financial advice.</p>
        </div>
      </div>
    </>
  );
}

export default Navigation;

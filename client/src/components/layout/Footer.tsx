import { Link } from "wouter";
import { Zap } from "lucide-react";

const GOLD = "#C5A35A";
const BORDER = "rgba(255,255,255,0.08)";
const MUTED = "rgba(255,255,255,0.5)";
const DIM = "rgba(255,255,255,0.3)";

const quickLinks = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/net-worth", label: "Net Worth" },
  { href: "/income-strategy", label: "Income Strategy" },
  { href: "/reports", label: "Reports" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
  { href: "/trust-center", label: "Trust Center" },
  { href: "/security", label: "Security" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

const legalLinks = [
  { href: "/terms", label: "Terms of Service" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/disclaimer", label: "Disclaimer" },
];

export function Footer() {
  return (
    <footer style={{ background: "#0a1420", borderTop: `1px solid ${BORDER}`, fontFamily: "Calibri, Arial, sans-serif" }}>
      <div className="container mx-auto px-4 py-14 max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">

          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="p-1.5 rounded-lg" style={{ background: GOLD }}>
                <Zap className="w-3.5 h-3.5" style={{ color: "#0D1929" }} />
              </div>
              <span className="text-lg font-bold text-white">adavi.ai</span>
            </div>
            <p className="text-sm mb-4" style={{ color: MUTED }}>Smart Financial Planning, Simplified</p>
            <p className="text-xs" style={{ color: DIM }}>Net Worth · Income Strategy · Financial Reports</p>
            <div className="mt-5 pt-5" style={{ borderTop: `1px solid ${BORDER}` }}>
              <p className="text-xs font-semibold text-white mb-1">Support</p>
              <a href="mailto:adavi@adavi.ai" className="text-xs hover:text-white transition-colors" style={{ color: GOLD }}>
                adavi@adavi.ai
              </a>
              <div className="mt-2 text-xs" style={{ color: DIM }}>
                <p>44 Charles Street West</p>
                <p>Toronto, Ontario</p>
                <p>Canada</p>
              </div>
            </div>
          </div>

          {/* Quick links col 1 */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-4 text-white">Quick Links</p>
            <div className="space-y-2.5">
              {quickLinks.slice(0, 6).map(l => (
                <Link key={l.href} href={l.href} className="block text-sm transition-colors hover:text-white" style={{ color: MUTED }}>
                  {l.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Quick links col 2 */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-4 text-white">Resources</p>
            <div className="space-y-2.5">
              {quickLinks.slice(6).map(l => (
                <Link key={l.href} href={l.href} className="block text-sm transition-colors hover:text-white" style={{ color: MUTED }}>
                  {l.label}
                </Link>
              ))}
              <div className="pt-2">
                <p className="text-xs font-bold uppercase tracking-widest mb-2.5 text-white">Legal</p>
                {legalLinks.map(l => (
                  <Link key={l.href} href={l.href} className="block text-sm transition-colors hover:text-white mb-2" style={{ color: MUTED }}>
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Platform preview */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-4 text-white">Platform</p>
            <p className="text-xs mb-3" style={{ color: DIM }}>adavi.ai is an AI-powered financial planning platform — coming modules include:</p>
            <div className="space-y-2">
              {["Tax Optimization", "Investment Analysis", "Cash Flow Planning", "Financial Health Score", "Accountant Collaboration"].map(m => (
                <div key={m} className="flex items-center gap-2 text-xs" style={{ color: DIM }}>
                  <div className="w-1 h-1 rounded-full" style={{ background: GOLD }} />
                  {m}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-6 flex flex-col md:flex-row items-center justify-between gap-3" style={{ borderTop: `1px solid ${BORDER}` }}>
          <p className="text-xs" style={{ color: DIM }}>© 2026 adavi.ai. All Rights Reserved.</p>
          <p className="text-xs text-center" style={{ color: DIM }}>
            Educational financial planning tools for individuals and incorporated business owners.
          </p>
          <div className="flex gap-4 text-xs" style={{ color: DIM }}>
            {legalLinks.map(l => (
              <Link key={l.href} href={l.href} className="hover:text-white transition-colors">{l.label}</Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;

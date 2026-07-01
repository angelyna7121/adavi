import { AppLayout } from "@/components/layout/AppLayout";
import { Mail, MapPin, MessageSquare, Send, Clock, HelpCircle, Shield, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "wouter";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { CARD, GOLD, GOLD_BORDER, BORDER, MUTED, DIM, CARD2 } from "@/lib/design";

const topics = [
  { icon: CreditCard, label: "Billing & Subscriptions", desc: "Upgrade, cancel, or billing questions" },
  { icon: Shield, label: "Privacy & Data Requests", desc: "Account deletion, data access, PIPEDA requests" },
  { icon: HelpCircle, label: "Calculator Questions", desc: "Accuracy, methodology, or tax calculation help" },
  { icon: MessageSquare, label: "Feedback & Feature Requests", desc: "Ideas, suggestions, or bug reports" },
];

export default function Contact() {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => { document.title = "Contact & Support | adavi.ai"; }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setTimeout(() => {
      setSending(false);
      toast({ title: "Message sent!", description: `We'll get back to you at ${email} within 1–2 business days.` });
      setName(""); setEmail(""); setSubject(""); setMessage("");
    }, 800);
  };

  return (
    <AppLayout>
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-14 space-y-14">

        {/* Header */}
        <section className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-semibold"
            style={{ background: "rgba(197,163,90,0.08)", borderColor: GOLD_BORDER, color: GOLD }}>
            <MessageSquare className="w-3.5 h-3.5" />Contact & Support
          </div>
          <h1 className="text-4xl font-bold text-white">Get in Touch</h1>
          <p className="text-lg max-w-md mx-auto leading-relaxed" style={{ color: MUTED }}>
            Questions, feedback, billing, or privacy concerns — we're here to help.
          </p>
        </section>

        {/* Common topics */}
        <section>
          <h2 className="text-lg font-bold text-white mb-5">Common Topics</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
            {topics.map(t => (
              <div key={t.label} className="rounded-2xl border p-5 space-y-2"
                style={{ background: CARD, borderColor: BORDER }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(197,163,90,0.12)" }}>
                  <t.icon className="w-5 h-5" style={{ color: GOLD }} />
                </div>
                <p className="text-sm font-bold text-white">{t.label}</p>
                <p className="text-xs leading-relaxed" style={{ color: DIM }}>{t.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Main grid: info + form */}
        <div className="grid md:grid-cols-5 gap-8">

          {/* Contact info — 2 cols */}
          <div className="md:col-span-2 space-y-5">

            {/* Email */}
            <div className="rounded-2xl border p-6" style={{ background: CARD, borderColor: BORDER }}>
              <div className="flex items-start gap-4 mb-5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "rgba(197,163,90,0.12)" }}>
                  <Mail className="w-5 h-5" style={{ color: GOLD }} />
                </div>
                <div>
                  <p className="font-bold text-white mb-1">Email Support</p>
                  <a href="mailto:adavi@adavi.ai" className="text-sm hover:underline" style={{ color: GOLD }}>
                    adavi@adavi.ai
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-4" style={{ borderTop: `1px solid ${BORDER}`, paddingTop: "1.25rem" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "rgba(197,163,90,0.12)" }}>
                  <Clock className="w-5 h-5" style={{ color: GOLD }} />
                </div>
                <div>
                  <p className="font-bold text-white mb-1">Response Time</p>
                  <p className="text-sm" style={{ color: MUTED }}>We aim to reply within 1–2 business days.</p>
                  <p className="text-xs mt-1" style={{ color: DIM }}>Mon–Fri, Toronto time (ET)</p>
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="rounded-2xl border p-6" style={{ background: CARD, borderColor: BORDER }}>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "rgba(197,163,90,0.12)" }}>
                  <MapPin className="w-5 h-5" style={{ color: GOLD }} />
                </div>
                <div>
                  <p className="font-bold text-white mb-1">Mailing Address</p>
                  <div className="text-sm space-y-0.5" style={{ color: MUTED }}>
                    <p>44 Charles Street West</p>
                    <p>Toronto, Ontario</p>
                    <p>Canada</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick links */}
            <div className="rounded-2xl border p-6" style={{ background: "rgba(197,163,90,0.06)", borderColor: GOLD_BORDER }}>
              <p className="text-sm font-bold text-white mb-3">Helpful Resources</p>
              <div className="space-y-2.5">
                {[
                  { href: "/faq", label: "FAQ — Common questions" },
                  { href: "/disclaimer", label: "Disclaimer — Calculation limits" },
                  { href: "/privacy", label: "Privacy — Data & deletion" },
                  { href: "/security", label: "Security — How we protect data" },
                  { href: "/pricing", label: "Pricing — Plans & features" },
                ].map(l => (
                  <Link key={l.href} href={l.href}>
                    <p className="text-sm hover:underline cursor-pointer" style={{ color: MUTED }}>{l.label}</p>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Contact form — 3 cols */}
          <div className="md:col-span-3 rounded-2xl border p-7" style={{ background: CARD, borderColor: BORDER }}>
            <h2 className="text-lg font-bold text-white mb-6">Send a Message</h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block" style={{ color: MUTED }}>Your Name</Label>
                  <Input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Jane Smith"
                    required
                    className="border text-white placeholder:text-white/25"
                    style={{ background: "rgba(255,255,255,0.05)", borderColor: BORDER }}
                    data-testid="input-contact-name"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block" style={{ color: MUTED }}>Email Address</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="border text-white placeholder:text-white/25"
                    style={{ background: "rgba(255,255,255,0.05)", borderColor: BORDER }}
                    data-testid="input-contact-email"
                  />
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block" style={{ color: MUTED }}>Subject</Label>
                <Input
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="e.g. Question about my subscription"
                  required
                  className="border text-white placeholder:text-white/25"
                  style={{ background: "rgba(255,255,255,0.05)", borderColor: BORDER }}
                  data-testid="input-contact-subject"
                />
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block" style={{ color: MUTED }}>Message</Label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Tell us how we can help you. The more detail you provide, the faster we can assist."
                  required
                  rows={7}
                  className="w-full rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/25 resize-none outline-none focus:ring-1 border"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    borderColor: BORDER,
                    fontFamily: "Calibri, Arial, sans-serif",
                  }}
                  data-testid="textarea-contact-message"
                />
              </div>
              <Button
                type="submit"
                className="w-full font-bold h-11"
                style={{ background: GOLD, color: "#0D1929" }}
                disabled={sending}
                data-testid="button-send-message"
              >
                {sending ? "Sending…" : <><Send className="w-4 h-4 mr-2" />Send Message</>}
              </Button>
              <p className="text-xs text-center" style={{ color: DIM }}>
                By submitting this form you agree to our{" "}
                <Link href="/privacy" className="hover:underline" style={{ color: GOLD }}>Privacy Policy</Link>.
                We'll never share your email.
              </p>
            </form>
          </div>
        </div>

        {/* Bottom trust strip */}
        <div className="rounded-2xl border p-6 flex flex-col sm:flex-row items-center justify-between gap-4"
          style={{ background: CARD2, borderColor: BORDER }}>
          <div>
            <p className="text-sm font-bold text-white mb-0.5">Looking for Trust & Security information?</p>
            <p className="text-xs" style={{ color: DIM }}>Read our Privacy Policy, Security practices, and full Trust Center.</p>
          </div>
          <div className="flex gap-3 shrink-0">
            <Link href="/trust-center">
              <button className="px-4 py-2 rounded-lg text-xs font-bold border transition-colors hover:border-amber-400/40"
                style={{ borderColor: GOLD_BORDER, color: GOLD }}>
                Trust Center
              </button>
            </Link>
            <Link href="/privacy">
              <button className="px-4 py-2 rounded-lg text-xs font-bold border transition-colors hover:border-amber-400/40"
                style={{ borderColor: GOLD_BORDER, color: GOLD }}>
                Privacy Policy
              </button>
            </Link>
          </div>
        </div>
      </main>
    </AppLayout>
  );
}

"use client"

import { Check, X, ChevronDown } from "lucide-react"
import { HERO, PROBLEM, SOLUTION, SOCIAL_PROOF, PRICING, COMPETITIVE, FAQ, CLOSING, FOOTER } from "./constants"

function track(action: string) {
  if (typeof window !== "undefined" && (window as any).gtag) {
    (window as any).gtag("event", action, { event_category: "pe_landing" })
  }
}

export default function PELandingPage() {
  return (
    <div className="min-h-screen bg-[#0A0E17] text-[#E8ECF4]">
      {/* Nav */}
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-[#0A0E17]/80 border-b border-[#1a2030]">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-5 py-4">
          <span className="text-lg font-bold" style={{ fontFamily: "Syne, system-ui" }}>
            <span className="bg-gradient-to-r from-[#00E5A0] via-[#00B4D8] to-[#7B61FF] bg-clip-text text-transparent">VIBE</span>
          </span>
          <a href="#start" onClick={() => track("nav_cta_click")}
            className="rounded-lg bg-gradient-to-r from-[#00E5A0] via-[#00B4D8] to-[#7B61FF] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition">
            {HERO.cta.split(" —")[0]}
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#00E5A0]/10 via-transparent to-[#7B61FF]/10" />
        <div className="relative max-w-5xl mx-auto px-5 pt-20 pb-16 md:pt-28 md:pb-24 text-center">
          <h1 className="text-3xl md:text-5xl font-extrabold leading-tight mb-6" style={{ fontFamily: "Syne, system-ui" }}>
            {HERO.headline}
          </h1>
          <p className="text-lg md:text-xl text-[#E8ECF4]/70 max-w-2xl mx-auto mb-10" style={{ fontFamily: "Inter, system-ui" }}>
            {HERO.subheadline}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#start" onClick={() => track("hero_cta_click")}
              className="rounded-lg bg-gradient-to-r from-[#00E5A0] via-[#00B4D8] to-[#7B61FF] px-6 py-3 font-semibold text-white hover:opacity-90 transition text-center">
              {HERO.cta}
            </a>
            <a href="#solution"
              className="rounded-lg border border-[#1a2030] px-6 py-3 font-semibold hover:bg-[#0F1420] transition text-center">
              {HERO.secondaryCta}
            </a>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="max-w-5xl mx-auto px-5 py-16 md:py-24">
        <h2 className="text-2xl md:text-3xl font-bold mb-10 text-center" style={{ fontFamily: "Syne, system-ui" }}>
          {PROBLEM.header}
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {PROBLEM.points.map((p, i) => (
            <div key={i} className="rounded-xl bg-[#0F1420] border border-[#1a2030] p-6 hover:shadow-lg hover:border-[#00E5A0]/30 transition">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#00E5A0]/20 to-[#7B61FF]/20 flex items-center justify-center mb-4">
                <span className="text-lg font-bold text-[#00E5A0]" style={{ fontFamily: "Syne, system-ui" }}>{i + 1}</span>
              </div>
              <p className="text-sm leading-relaxed text-[#E8ECF4]/80" style={{ fontFamily: "Inter, system-ui" }}>{p}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Solution */}
      <section id="solution" className="bg-[#0F1420]/50 border-y border-[#1a2030]">
        <div className="max-w-5xl mx-auto px-5 py-16 md:py-24">
          <h2 className="text-2xl md:text-3xl font-bold mb-10 text-center" style={{ fontFamily: "Syne, system-ui" }}>
            {SOLUTION.header}
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {SOLUTION.props.map((p, i) => (
              <div key={i} className="rounded-xl bg-[#0A0E17] border border-[#1a2030] p-6 hover:shadow-lg hover:border-[#00B4D8]/30 transition">
                <h3 className="text-base font-semibold mb-3 text-[#00E5A0]" style={{ fontFamily: "Syne, system-ui" }}>{p.title}</h3>
                <p className="text-sm text-[#E8ECF4]/70" style={{ fontFamily: "Inter, system-ui" }}>{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="max-w-5xl mx-auto px-5 py-16 md:py-24">
        <h2 className="text-2xl md:text-3xl font-bold mb-10 text-center" style={{ fontFamily: "Syne, system-ui" }}>
          {SOCIAL_PROOF.header}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {SOCIAL_PROOF.stats.map((s, i) => (
            <div key={i} className="rounded-xl bg-[#0F1420] border border-[#1a2030] p-6 text-center">
              <p className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-[#00E5A0] to-[#00B4D8] bg-clip-text text-transparent" style={{ fontFamily: "Syne, system-ui" }}>
                {s.value}
              </p>
              <p className="text-xs text-[#E8ECF4]/60 mt-2 uppercase tracking-wide" style={{ fontFamily: "Inter, system-ui" }}>{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-[#0F1420]/50 border-y border-[#1a2030]">
        <div className="max-w-xl mx-auto px-5 py-16 md:py-24 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-8" style={{ fontFamily: "Syne, system-ui" }}>{PRICING.header}</h2>
          <div className="rounded-xl bg-[#0A0E17] border border-[#1a2030] p-8">
            <ul className="space-y-3 mb-8 text-left">
              {PRICING.features.map((f, i) => (
                <li key={i} className="flex items-center gap-3 text-sm" style={{ fontFamily: "Inter, system-ui" }}>
                  <Check className="w-4 h-4 text-[#00E5A0] flex-shrink-0" />{f}
                </li>
              ))}
            </ul>
            <a href="#start" onClick={() => track("pricing_cta_click")}
              className="block rounded-lg bg-gradient-to-r from-[#00E5A0] via-[#00B4D8] to-[#7B61FF] px-6 py-3 font-semibold text-white hover:opacity-90 transition">
              {PRICING.cta}
            </a>
            <p className="text-xs text-[#E8ECF4]/50 mt-4" style={{ fontFamily: "Inter, system-ui" }}>{PRICING.footnote}</p>
          </div>
        </div>
      </section>

      {/* Competitive */}
      <section className="max-w-4xl mx-auto px-5 py-16 md:py-24">
        <h2 className="text-2xl md:text-3xl font-bold mb-10 text-center" style={{ fontFamily: "Syne, system-ui" }}>
          {COMPETITIVE.header}
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="rounded-xl bg-[#0F1420] border border-[#1a2030] p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-[#E8ECF4]/50 mb-4">{COMPETITIVE.others.label}</h3>
            <ul className="space-y-3">
              {COMPETITIVE.others.points.map((p, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-[#E8ECF4]/60">
                  <X className="w-4 h-4 text-red-400 flex-shrink-0" />{p}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl bg-[#0A0E17] border border-[#00E5A0]/30 p-6 shadow-[0_0_20px_rgba(0,229,160,0.08)]">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-[#00E5A0] mb-4">{COMPETITIVE.vibe.label}</h3>
            <ul className="space-y-3">
              {COMPETITIVE.vibe.points.map((p, i) => (
                <li key={i} className="flex items-center gap-3 text-sm">
                  <Check className="w-4 h-4 text-[#00E5A0] flex-shrink-0" />{p}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-[#0F1420]/50 border-y border-[#1a2030]">
        <div className="max-w-3xl mx-auto px-5 py-16 md:py-24">
          <h2 className="text-2xl md:text-3xl font-bold mb-10 text-center" style={{ fontFamily: "Syne, system-ui" }}>
            Frequently asked questions
          </h2>
          <div className="space-y-4">
            {FAQ.map((item, i) => (
              <details key={i} className="group rounded-xl bg-[#0A0E17] border border-[#1a2030] overflow-hidden">
                <summary className="flex items-center justify-between cursor-pointer px-6 py-4 text-sm font-semibold list-none">
                  {item.q}
                  <ChevronDown className="w-4 h-4 text-[#E8ECF4]/40 transition-transform group-open:rotate-180" />
                </summary>
                <p className="px-6 pb-4 text-sm text-[#E8ECF4]/70 leading-relaxed" style={{ fontFamily: "Inter, system-ui" }}>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section id="start" className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#00E5A0]/10 via-transparent to-[#7B61FF]/10" />
        <div className="relative max-w-3xl mx-auto px-5 py-20 md:py-28 text-center">
          <h2 className="text-2xl md:text-4xl font-extrabold mb-4" style={{ fontFamily: "Syne, system-ui" }}>{CLOSING.header}</h2>
          <p className="text-base text-[#E8ECF4]/60 mb-10" style={{ fontFamily: "Inter, system-ui" }}>{CLOSING.subheader}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/login" onClick={() => track("closing_cta_click")}
              className="rounded-lg bg-gradient-to-r from-[#00E5A0] via-[#00B4D8] to-[#7B61FF] px-6 py-3 font-semibold text-white hover:opacity-90 transition text-center">
              {CLOSING.cta}
            </a>
            <a href={CLOSING.calendarUrl} target="_blank" rel="noopener noreferrer" onClick={() => track("calendar_cta_click")}
              className="rounded-lg border border-[#1a2030] px-6 py-3 font-semibold hover:bg-[#0F1420] transition text-center">
              {CLOSING.secondaryCta}
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1a2030]">
        <div className="max-w-5xl mx-auto px-5 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[#E8ECF4]/40">
          <span>{FOOTER.company} &middot; {FOOTER.product}</span>
          <div className="flex gap-4">
            {FOOTER.links.map((l) => (
              <a key={l.label} href={l.href} className="hover:text-[#E8ECF4]/70 transition">{l.label}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}

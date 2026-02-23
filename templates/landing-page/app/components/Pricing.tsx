const plans = [
  {
    name: "Starter",
    price: "Free",
    period: "",
    description: "Perfect for side projects and exploration.",
    features: [
      "5 AI generations / month",
      "1 project",
      "Community templates",
      "GitHub export",
      "Email support",
    ],
    cta: "Get Started Free",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$29",
    period: "/ month",
    description: "For developers and small teams moving fast.",
    features: [
      "Unlimited AI generations",
      "10 projects",
      "All templates",
      "Auto GitHub PRs",
      "CI-parity preflight",
      "Priority support",
    ],
    cta: "Start Free Trial",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For organizations with advanced requirements.",
    features: [
      "Unlimited everything",
      "Custom integrations",
      "SSO & audit logs",
      "SLA guarantee",
      "Dedicated engineer",
      "On-premise option",
    ],
    cta: "Contact Sales",
    highlighted: false,
  },
];

export default function Pricing() {
  return (
    <section
      id="pricing"
      className="py-24 bg-gradient-to-b from-[#0d1530] to-[#0a0f1e]"
    >
      <div className="max-w-6xl mx-auto px-6">
        {/* Section header */}
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-blue-400 uppercase tracking-widest mb-3">
            Pricing
          </p>
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            Start free, upgrade when you need more power. No hidden fees.
          </p>
        </div>

        {/* Plans grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-2xl p-8 ${
                plan.highlighted
                  ? "bg-gradient-to-b from-blue-600/20 to-purple-600/10 border-2 border-blue-500/50 shadow-xl shadow-blue-500/10"
                  : "bg-white/5 border border-white/10"
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full text-xs font-semibold text-white whitespace-nowrap">
                  Most Popular
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-xl font-bold text-white mb-1">
                  {plan.name}
                </h3>
                <p className="text-slate-400 text-sm">{plan.description}</p>
              </div>

              <div className="flex items-end gap-1 mb-8">
                <span className="text-5xl font-bold text-white">
                  {plan.price}
                </span>
                {plan.period && (
                  <span className="text-slate-400 text-base pb-1">
                    {plan.period}
                  </span>
                )}
              </div>

              <ul className="flex flex-col gap-3 mb-8 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="w-5 h-5 text-blue-400 shrink-0"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-slate-300 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <a
                href="#contact"
                className={`inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${
                  plan.highlighted
                    ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg shadow-blue-600/25"
                    : "border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white"
                }`}
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

"use client"

import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface Plan {
  name: string
  price: string
  period: string
  description: string
  features: string[]
  current?: boolean
  popular?: boolean
}

const plans: Plan[] = [
  {
    name: "Free",
    price: "$0",
    period: "/ month",
    description: "For personal projects and learning",
    features: [
      "5 projects",
      "100 AI generations / month",
      "Basic code editor",
      "Community support",
    ],
    current: true,
  },
  {
    name: "Pro",
    price: "$20",
    period: "/ month",
    description: "For professional developers",
    features: [
      "Unlimited projects",
      "2,000 AI generations / month",
      "Advanced code editor",
      "Priority support",
      "Custom domains",
      "Team collaboration",
    ],
    popular: true,
  },
  {
    name: "Enterprise",
    price: "$99",
    period: "/ month",
    description: "For teams and organizations",
    features: [
      "Everything in Pro",
      "Unlimited AI generations",
      "SSO / SAML authentication",
      "Dedicated support",
      "Custom integrations",
      "SLA guarantee",
      "Audit logs",
    ],
  },
]

export function PlanCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {plans.map((plan) => (
        <div
          key={plan.name}
          className={cn(
            "relative bg-card rounded-xl border p-6 flex flex-col transition-all",
            plan.popular
              ? "border-primary shadow-lg shadow-primary/5"
              : "border-border hover:border-border/80"
          )}
        >
          {/* Popular Badge */}
          {plan.popular && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="px-3 py-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold uppercase tracking-wide">
                Most Popular
              </span>
            </div>
          )}

          {/* Plan Info */}
          <div className="mb-5">
            <h3 className="text-base font-semibold text-foreground">{plan.name}</h3>
            <p className="text-xs text-muted-foreground mt-1">{plan.description}</p>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-1 mb-5">
            <span className="text-3xl font-bold text-foreground">{plan.price}</span>
            <span className="text-sm text-muted-foreground">{plan.period}</span>
          </div>

          {/* Features */}
          <div className="flex flex-col gap-2.5 mb-6 flex-1">
            {plan.features.map((feature) => (
              <div key={feature} className="flex items-center gap-2">
                <div className={cn(
                  "w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0",
                  plan.popular ? "bg-primary/20" : "bg-secondary"
                )}>
                  <Check className={cn(
                    "w-2.5 h-2.5",
                    plan.popular ? "text-primary" : "text-muted-foreground"
                  )} />
                </div>
                <span className="text-sm text-muted-foreground">{feature}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          {plan.current ? (
            <Button variant="outline" size="sm" disabled className="w-full">
              Current Plan
            </Button>
          ) : plan.popular ? (
            <Button size="sm" className="w-full bg-primary text-primary-foreground hover:opacity-90">
              Upgrade to Pro
            </Button>
          ) : (
            <Button variant="outline" size="sm" className="w-full">
              Contact Sales
            </Button>
          )}
        </div>
      ))}
    </div>
  )
}

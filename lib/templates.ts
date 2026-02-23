import {
  Globe,
  Briefcase,
  ShoppingCart,
  User,
  Megaphone,
  Rocket,
  Building2,
  BookOpen,
  type LucideIcon,
} from "lucide-react"

export interface Template {
  id: string
  name: string
  description: string
  prompt: string
  category: TemplateCategory
  tags: string[]
}

export type TemplateCategory =
  | "saas"
  | "portfolio"
  | "ecommerce"
  | "agency"
  | "startup"
  | "blog"

export interface CategoryInfo {
  id: TemplateCategory
  label: string
  icon: LucideIcon
}

export const categories: CategoryInfo[] = [
  { id: "saas", label: "SaaS", icon: Globe },
  { id: "startup", label: "Startup", icon: Rocket },
  { id: "portfolio", label: "Portfolio", icon: User },
  { id: "ecommerce", label: "E-Commerce", icon: ShoppingCart },
  { id: "agency", label: "Agency", icon: Building2 },
  { id: "blog", label: "Blog", icon: BookOpen },
]

export const templates: Template[] = [
  // SaaS
  {
    id: "saas-pricing",
    name: "SaaS Pricing Page",
    description: "Clean pricing page with monthly/yearly toggle, feature comparison, and a highlighted recommended plan.",
    prompt: "Build a SaaS pricing page with three tiers (Free, Pro, Enterprise), a monthly/yearly toggle that shows discounts, a feature comparison table, and a highlighted recommended plan. Use a dark theme with a prominent call-to-action.",
    category: "saas",
    tags: ["pricing", "plans", "toggle"],
  },
  {
    id: "saas-landing",
    name: "SaaS Product Landing",
    description: "Full landing page with hero, features grid, testimonials, and a final CTA section.",
    prompt: "Create a modern SaaS product landing page with an animated hero section featuring a headline and email capture, a bento-grid features section with icons, a testimonials carousel, social proof logos, and a bottom call-to-action block.",
    category: "saas",
    tags: ["landing", "hero", "features"],
  },
  {
    id: "saas-dashboard-landing",
    name: "Dashboard Promo Page",
    description: "Landing page promoting an analytics dashboard product with a live preview screenshot section.",
    prompt: "Design a landing page for an analytics dashboard SaaS. Include a hero with a tagline and dashboard screenshot mockup, key metrics highlights, an integrations logo strip, feature cards with icons, and a free trial CTA section.",
    category: "saas",
    tags: ["analytics", "dashboard", "promo"],
  },
  // Startup
  {
    id: "startup-launch",
    name: "Product Launch Page",
    description: "Minimal and bold launch page with email waitlist, countdown, and social links.",
    prompt: "Build a startup product launch page with a bold centered headline, a short product description, an email waitlist signup form, a countdown timer to launch date, and social media links at the bottom. Make it feel exciting and modern.",
    category: "startup",
    tags: ["launch", "waitlist", "countdown"],
  },
  {
    id: "startup-pitch",
    name: "Startup Pitch Page",
    description: "One-pager for pitching your startup with problem, solution, team, and traction sections.",
    prompt: "Create a startup pitch landing page with sections for: problem statement, our solution, how it works (3-step process), team bios with photos, key traction metrics, press logos, and a final CTA to schedule a demo.",
    category: "startup",
    tags: ["pitch", "team", "traction"],
  },
  {
    id: "startup-early-access",
    name: "Early Access Page",
    description: "Sleek early access page with a teaser video section and an invite request form.",
    prompt: "Design an early access landing page for a new AI tool. Include a hero with animated gradient background and tagline, an embedded video/demo placeholder, three key value proposition cards, an early access request form with email input, and a social proof section.",
    category: "startup",
    tags: ["early access", "AI", "teaser"],
  },
  // Portfolio
  {
    id: "portfolio-developer",
    name: "Developer Portfolio",
    description: "Minimal developer portfolio with project cards, skills, and contact form.",
    prompt: "Build a developer portfolio landing page with a personal intro section featuring name, title and a short bio, a skills/tech stack section with icon badges, a project showcase grid with cards (title, description, tech used, link), and a contact form at the bottom.",
    category: "portfolio",
    tags: ["developer", "projects", "skills"],
  },
  {
    id: "portfolio-designer",
    name: "Creative Portfolio",
    description: "Visual-first portfolio for designers with large image grids and case study previews.",
    prompt: "Create a creative designer portfolio landing page with a large hero image and name overlay, a masonry grid of project thumbnails, case study preview cards with images and short descriptions, an about section, and a simple contact section.",
    category: "portfolio",
    tags: ["designer", "visual", "case study"],
  },
  {
    id: "portfolio-freelancer",
    name: "Freelancer Landing",
    description: "Service-focused portfolio for freelancers with services list, testimonials, and booking CTA.",
    prompt: "Design a freelancer landing page with a hero headline and sub-headline, a services section with 4 service cards (icon, title, description), client testimonials with star ratings, a skills bar section, and a CTA to book a consultation.",
    category: "portfolio",
    tags: ["freelancer", "services", "booking"],
  },
  // E-Commerce
  {
    id: "ecommerce-product",
    name: "Product Launch Page",
    description: "Single-product page with hero image, features, reviews, and buy button.",
    prompt: "Build an e-commerce product launch page for a premium physical product. Include a full-width hero with product image and tagline, a features section with icons, a product specifications grid, customer reviews with ratings, and a sticky buy button.",
    category: "ecommerce",
    tags: ["product", "reviews", "buy"],
  },
  {
    id: "ecommerce-store",
    name: "Store Landing Page",
    description: "E-commerce store landing with featured products, categories, and newsletter signup.",
    prompt: "Create an e-commerce store landing page with a hero banner and sale announcement, featured product cards in a grid (image, title, price, rating), category browsing section, a special offers banner, and a newsletter signup section at the bottom.",
    category: "ecommerce",
    tags: ["store", "products", "newsletter"],
  },
  // Agency
  {
    id: "agency-digital",
    name: "Digital Agency Landing",
    description: "Professional agency page with services, case studies, team, and contact form.",
    prompt: "Build a digital agency landing page with an impressive hero section and tagline, a services grid (web design, development, marketing, branding), featured case studies with images, team member cards, client logos, and a contact form section.",
    category: "agency",
    tags: ["services", "case studies", "team"],
  },
  {
    id: "agency-marketing",
    name: "Marketing Agency Page",
    description: "Results-driven marketing agency page with stats, process steps, and client results.",
    prompt: "Design a marketing agency landing page with a bold hero and stat counters, an 'Our Process' 4-step section, service offerings with pricing hints, client results/case studies with before-after metrics, testimonials, and a free consultation CTA.",
    category: "agency",
    tags: ["marketing", "results", "process"],
  },
  // Blog
  {
    id: "blog-publication",
    name: "Blog / Publication",
    description: "Content-focused blog landing with featured post, article grid, and category navigation.",
    prompt: "Create a blog publication landing page with a featured article hero (large image, title, excerpt), a grid of recent article cards (thumbnail, title, date, category tag), a sidebar with popular posts and category links, and a newsletter subscription section.",
    category: "blog",
    tags: ["articles", "featured", "newsletter"],
  },
  {
    id: "blog-personal",
    name: "Personal Blog",
    description: "Minimal personal blog with author intro, latest posts, and a subscribe section.",
    prompt: "Build a personal blog landing page with an author intro section (photo, name, short bio), latest blog posts in a clean list format (title, date, reading time, excerpt), tag cloud for categories, and an email subscribe form with a friendly tone.",
    category: "blog",
    tags: ["personal", "posts", "subscribe"],
  },
]

/** Get templates filtered by a specific category */
export function getTemplatesByCategory(category: TemplateCategory): Template[] {
  return templates.filter((t) => t.category === category)
}

/** Search templates by name, description, or tags */
export function searchTemplates(query: string): Template[] {
  const q = query.toLowerCase()
  return templates.filter(
    (t) =>
      t.name.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.tags.some((tag) => tag.toLowerCase().includes(q))
  )
}

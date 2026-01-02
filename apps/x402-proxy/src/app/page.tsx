import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Shield,
  Zap,
  Globe,
  Lock,
  BarChart3,
  Code2,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
              x4
            </div>
            <span className="text-lg font-semibold">x402 Proxy</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="#features"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Features
            </Link>
            <Link
              href="#how-it-works"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              How it Works
            </Link>
            <Link
              href="#pricing"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Pricing
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-24 md:py-32">
          <div className="absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
          </div>

          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full border border-border bg-card/50 text-sm">
                <span className="flex h-2 w-2 rounded-full bg-accent animate-pulse" />
                <span className="text-muted-foreground">
                  Built on the x402 open standard
                </span>
              </div>

              <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
                Monetize Any API with{" "}
                <span className="text-gradient">Crypto Payments</span>
              </h1>

              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Turn your private APIs into paid services. Accept instant USDC
                payments with no accounts, no credit cards, and no friction.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button size="lg" asChild>
                  <Link href="/register">
                    Get Started Free
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="#how-it-works">See How It Works</Link>
                </Button>
              </div>

              <div className="mt-16 grid grid-cols-3 gap-8 max-w-xl mx-auto">
                <div>
                  <div className="text-3xl font-bold text-primary">$0</div>
                  <div className="text-sm text-muted-foreground">
                    Protocol Fees
                  </div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-accent">&lt;1s</div>
                  <div className="text-sm text-muted-foreground">
                    Payment Speed
                  </div>
                </div>
                <div>
                  <div className="text-3xl font-bold">100%</div>
                  <div className="text-sm text-muted-foreground">
                    Self-Custody
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 bg-card/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Everything You Need to Monetize APIs
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Powerful features that make it easy to turn any API into a
                revenue stream.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  icon: Shield,
                  title: "Multiple Auth Methods",
                  description:
                    "Support for Bearer tokens, API keys, Basic auth, and custom headers.",
                },
                {
                  icon: Lock,
                  title: "Encrypted Secrets",
                  description:
                    "Store API keys securely with AES-256 encryption.",
                },
                {
                  icon: Globe,
                  title: "Custom Domains",
                  description: "Use your own domain with CNAME support.",
                },
                {
                  icon: Zap,
                  title: "Instant Payments",
                  description: "Receive USDC payments instantly on Base.",
                },
                {
                  icon: BarChart3,
                  title: "Real-time Analytics",
                  description: "Track requests, payments, and usage.",
                },
                {
                  icon: Code2,
                  title: "Custom Paywalls",
                  description: "Customize with themes and branding.",
                },
              ].map((feature) => (
                <Card key={feature.title} className="bg-card/50 border-border/50">
                  <CardHeader>
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle>{feature.title}</CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="py-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Start Monetizing in Minutes
              </h2>
            </div>

            <div className="max-w-3xl mx-auto">
              <div className="grid gap-8">
                {[
                  { step: "01", title: "Connect Your API", description: "Add your endpoint URL and configure auth." },
                  { step: "02", title: "Set Your Price", description: "Define how much to charge per request." },
                  { step: "03", title: "Share Your Proxy URL", description: "Get a unique URL or use your custom domain." },
                  { step: "04", title: "Get Paid in USDC", description: "Receive payments directly to your wallet." },
                ].map((item, index) => (
                  <div key={item.step} className="flex gap-6 items-start">
                    <div className="flex-shrink-0">
                      <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                        {item.step}
                      </div>
                      {index < 3 && (
                        <div className="w-px h-16 bg-border mx-auto mt-2" />
                      )}
                    </div>
                    <div className="pt-2">
                      <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                      <p className="text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-24 bg-card/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Simple Pricing
              </h2>
              <p className="text-lg text-muted-foreground">
                Free during beta.
              </p>
            </div>

            <div className="max-w-lg mx-auto">
              <Card className="border-primary/50">
                <CardHeader className="text-center pb-8 border-b">
                  <div className="inline-block px-3 py-1 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
                    Beta
                  </div>
                  <CardTitle className="text-2xl">Free Forever*</CardTitle>
                  <div className="mt-4">
                    <span className="text-5xl font-bold">$0</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                </CardHeader>
                <CardContent className="pt-8">
                  <ul className="space-y-4">
                    {[
                      "Unlimited endpoints",
                      "All auth methods",
                      "Encrypted secrets",
                      "Custom domains",
                      "Real-time analytics",
                    ].map((feature) => (
                      <li key={feature} className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-accent" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button className="w-full mt-8" size="lg" asChild>
                    <Link href="/register">Start Building Free</Link>
                  </Button>

                  <p className="text-xs text-muted-foreground text-center mt-4">
                    *Free during beta period.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Ready to Monetize Your APIs?
              </h2>
              <Button size="lg" asChild>
                <Link href="/register">
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-card/50 py-12">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>
            &copy; {new Date().getFullYear()} x402 Proxy. Built on the x402 open
            standard.
          </p>
        </div>
      </footer>
    </div>
  );
}

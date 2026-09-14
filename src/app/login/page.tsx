import { LoginForm } from "@/components/login-form";
import { ShieldCheck, Globe2, Gavel } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="grid min-h-[70vh] items-center gap-10 lg:grid-cols-2">
      <div className="flex justify-center">
        <LoginForm />
      </div>
      <div className="hidden lg:block">
        <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/95 to-accent/70 shadow-lift">
          <div className="absolute inset-0 opacity-25 [background-image:radial-gradient(circle_at_30%_25%,hsl(var(--accent)/0.6),transparent_50%),radial-gradient(circle_at_75%_75%,hsl(var(--accent)/0.4),transparent_45%)]" />
          <div className="relative space-y-6 p-10 text-center text-primary-foreground">
            <Gavel className="mx-auto h-16 w-16 text-accent" aria-hidden />
            <h2 className="font-serif text-4xl font-semibold">The world's most trusted auction platform</h2>
            <div className="mx-auto flex max-w-md flex-col gap-3">
              {[
                { icon: ShieldCheck, text: "Verified sellers and secure bidding" },
                { icon: Globe2, text: "Global marketplace, live in realtime" },
              ].map((f) => (
                <div key={f.text} className="flex items-center gap-3 rounded-xl bg-black/20 px-4 py-3 backdrop-blur">
                  <f.icon className="h-5 w-5 shrink-0 text-accent" aria-hidden />
                  <span className="text-sm font-medium">{f.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

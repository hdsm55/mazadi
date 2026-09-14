"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Gavel } from "lucide-react";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, null);

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-accent shadow-lift">
          <Gavel className="h-7 w-7" aria-hidden />
        </span>
        <h1 className="font-serif text-3xl font-semibold text-foreground">Welcome back</h1>
        <p className="mt-1 text-sm text-muted-foreground">Sign in to continue bidding on Mazadi</p>
      </div>

      <form action={formAction} className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-soft">
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium text-foreground">
            Email
          </label>
          <Input type="email" id="email" name="email" placeholder="you@example.com" required autoComplete="email" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm font-medium text-foreground">
            Password
          </label>
          <Input type="password" id="password" name="password" placeholder="••••••••" required autoComplete="current-password" />
        </div>
        {state?.error && <p className="text-sm font-medium text-destructive">{state.error}</p>}
        <Button type="submit" variant="gold" className="w-full" disabled={pending}>
          {pending ? "Signing in..." : "Sign In"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don't have an account?{" "}
        <Link href="/register" className="font-semibold text-accent hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}

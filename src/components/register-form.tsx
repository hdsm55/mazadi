"use client";

import { useActionState } from "react";
import { registerAction } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(registerAction, null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Account</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <Input type="text" name="name" placeholder="Full name" required />
          <Input type="email" name="email" placeholder="Email" required />
          <Input type="password" name="password" placeholder="Password (min 8 chars)" required />
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Creating..." : "Register"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  Award,
  CreditCard,
  Eye,
  EyeOff,
  FileText,
  Loader2,
  Lock,
  Mail,
} from "lucide-react";
import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Logo } from "@/components/branding/logo";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { apiGet } from "@/lib/api/client";

// -----------------------------------------------------------------------------
// Login schema
// -----------------------------------------------------------------------------

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

type LoginValues = z.infer<typeof loginSchema>;

// -----------------------------------------------------------------------------
// Hero features
// -----------------------------------------------------------------------------

const FEATURES = [
  {
    icon: FileText,
    label: "Manage abstract submissions and peer review",
  },
  {
    icon: CreditCard,
    label: "Collect registrations and payments online",
  },
  {
    icon: Award,
    label: "Check in attendees and issue certificates",
  },
] as const;

// -----------------------------------------------------------------------------
// User information returned by /auth/me
// -----------------------------------------------------------------------------

interface CurrentUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isSuperAdmin: boolean;
  isReviewer: boolean;
}

interface Organization {
  id: string;
}

// -----------------------------------------------------------------------------
// Login form
// -----------------------------------------------------------------------------

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
  });

  // Decide where the authenticated user should go.
  async function redirectAfterLogin(currentUser: CurrentUser) {
    // 1. Return to the page that originally required login.
    const returnTo = searchParams.get("returnTo");

    if (
      returnTo &&
      returnTo !== "/" &&
      returnTo !== "/login" &&
      returnTo.startsWith("/") &&
      !returnTo.startsWith("//")
    ) {
      router.replace(returnTo);
      router.refresh();
      return;
    }

    // 2. Super Admin
    if (currentUser.isSuperAdmin) {
      router.replace("/organizations");
      router.refresh();
      return;
    }

    // 3. Check organization membership.
    let isOrganizationMember = false;

    try {
      const organizations = await apiGet<Organization[]>("organizations/me");

      isOrganizationMember =
        Array.isArray(organizations) && organizations.length > 0;
    } catch {
      isOrganizationMember = false;
    }

    // 4. Organization Owner / Admin
    if (isOrganizationMember) {
      router.replace("/");
      router.refresh();
      return;
    }

    // 5. Reviewer-only user
    if (currentUser.isReviewer) {
      router.replace("/my-reviews");
      router.refresh();
      return;
    }

    // 6. Author / normal participant
    router.replace("/");
    router.refresh();
  }

  // Submit login
  async function onSubmit(values: LoginValues) {
    setSubmitError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({
          message: "Login failed.",
        }));

        setSubmitError(body.message ?? "Login failed.");
        return;
      }

      try {
        const currentUser = await apiGet<CurrentUser>("auth/me");
        await redirectAfterLogin(currentUser);
      } catch {
        setSubmitError(
          "Unable to load your account information. Please try again.",
        );
      }
    } catch {
      setSubmitError("Unable to connect to the server. Please try again.");
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto grid min-h-screen max-w-6xl lg:grid-cols-2">
        {/* Left / Hero section */}
        <section className="hidden flex-col justify-center px-8 py-12 lg:flex lg:px-12">
          <div className="max-w-lg">
            <Logo />

            <h1 className="mt-8 text-4xl font-bold tracking-tight">
              Run your events from one place.
            </h1>

            <p className="mt-4 text-lg text-muted-foreground">
              Manage submissions, peer review, registrations, payments,
              check-in, programmes and certificates with Operant Events.
            </p>

            <div className="mt-8 space-y-4">
              {FEATURES.map((feature) => {
                const Icon = feature.icon;

                return (
                  <div key={feature.label} className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border bg-card">
                      <Icon className="h-4 w-4" />
                    </div>

                    <span className="text-sm font-medium">{feature.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Login section */}
        <section className="flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            {/* Mobile logo */}
            <div className="mb-8 lg:hidden">
              <Logo />
            </div>

            <div className="rounded-xl border bg-card p-6 shadow-sm sm:p-8">
              {/* Heading */}
              <div className="mb-6">
                <h2 className="text-2xl font-semibold">Welcome back</h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  Sign in to continue to Operant Events.
                </p>
              </div>

              {/* Error */}
              {submitError ? (
                <div className="mb-5 flex gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{submitError}</p>
                </div>
              ) : null}

              {/* Form */}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {/* Email */}
                <FormField
                  label="Email"
                  htmlFor="email"
                  error={errors.email?.message}
                >
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                      className="pl-10"
                      {...register("email")}
                    />
                  </div>
                </FormField>

                {/* Password */}
                <FormField
                  label="Password"
                  htmlFor="password"
                  error={errors.password?.message}
                >
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      className="pl-10 pr-10"
                      {...register("password")}
                    />

                    <button
                      type="button"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </FormField>

                {/* Forgot password */}
                <div className="flex justify-end">
                  <Link
                    href="/password-reset"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Forgot password?
                  </Link>
                </div>

                {/* Submit */}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign in"
                  )}
                </Button>
              </form>

              {/* Register */}
              <div className="mt-6 text-center text-sm text-muted-foreground">
                Don&apos;t have an account?{" "}
                <Link
                  href="/register"
                  className="font-medium text-foreground underline underline-offset-4 hover:no-underline"
                >
                  Create an account
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

// -----------------------------------------------------------------------------
// Page wrapper: useSearchParams requires a Suspense boundary for prerendering.
// -----------------------------------------------------------------------------

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-background">
          <p className="text-sm text-muted-foreground">Loading login...</p>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

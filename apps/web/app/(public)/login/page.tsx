'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Award, CreditCard, Eye, EyeOff, FileText, Loader2, Lock, Mail } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Logo } from '@/components/branding/logo';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';

// ─── schema ──────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
});

type LoginValues = z.infer<typeof loginSchema>;

// ─── hero panel feature list ──────────────────────────────────────────────────

const FEATURES = [
  { icon: FileText, label: 'Manage abstract submissions and peer review' },
  { icon: CreditCard, label: 'Collect registrations and payments online' },
  { icon: Award, label: 'Check in attendees and issue certificates' },
] as const;

// ─── page ─────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginValues) {
    setSubmitError(null);
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(values),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({ message: 'Login failed.' }));
      setSubmitError(body.message ?? 'Login failed.');
      return;
    }
    router.push('/');
    router.refresh();
  }

  return (
    // Fills the <main className="flex flex-1"> from the public layout.
    <div className="grid w-full flex-1 lg:grid-cols-[55%_45%]">

      {/* ── Left: brand hero panel (desktop only) ─────────────────────────── */}
      <div
        className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12"
        style={{ background: 'oklch(0.17 0.05 264)' }}
      >
        {/* Decorative radial glow blobs */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-20 -top-20 h-96 w-96 rounded-full bg-brand/25 blur-[96px]" />
          <div className="absolute -bottom-24 right-0 h-80 w-80 rounded-full bg-brand/20 blur-[80px]" />
          <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/10 blur-[64px]" />
        </div>
        {/* Subtle grid overlay */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(oklch(1 0 0 / 0.03) 1px, transparent 1px), linear-gradient(90deg, oklch(1 0 0 / 0.03) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* Logo */}
        <div className="relative z-10">
          <Logo className="text-white" />
        </div>

        {/* Headline + feature list */}
        <div className="relative z-10 space-y-8">
          <div className="space-y-4">
            <h2 className="text-[2rem] font-semibold leading-tight tracking-tight text-white">
              Run world-class conferences,<br />start to finish.
            </h2>
            <p className="max-w-sm text-[0.9375rem] leading-relaxed text-white/60">
              One workspace for abstract submissions, peer review, registration,
              the programme, check-in, and certificates.
            </p>
          </div>

          <ul className="space-y-3.5">
            {FEATURES.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3 text-sm text-white/80">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-inset ring-white/10">
                  <Icon className="h-4 w-4" />
                </span>
                {label}
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <p className="relative z-10 text-xs text-white/30">
          © {new Date().getFullYear()} Operant Event. All rights reserved.
        </p>
      </div>

      {/* ── Right: login form ──────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col justify-center bg-background px-6 py-14 sm:px-10 lg:px-16">
        <div className="mx-auto w-full max-w-[360px]">

          {/* Mobile-only logo (hero panel is hidden on small screens) */}
          <div className="mb-10 lg:hidden">
            <Logo />
          </div>

          {/* Heading */}
          <div className="space-y-1.5">
            <h1 className="text-[1.625rem] font-semibold tracking-tight">Welcome back</h1>
            <p className="text-[0.9375rem] text-muted-foreground">
              Log in to continue to your workspace.
            </p>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="mt-8 space-y-5"
            noValidate
          >
            {/* Email */}
            <FormField label="Email" htmlFor="email" error={errors.email?.message}>
              <div className="relative">
                <Mail
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="h-11 rounded-xl pl-9 pr-3 text-sm"
                  aria-invalid={Boolean(errors.email)}
                  {...register('email')}
                />
              </div>
            </FormField>

            {/* Password — uses FormField's action slot for "Forgot password?" */}
            <FormField
              label="Password"
              htmlFor="password"
              error={errors.password?.message}
              action={
                <Link
                  href="/password-reset"
                  className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Forgot password?
                </Link>
              }
            >
              <div className="relative">
                <Lock
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="h-11 rounded-xl pl-9 pr-10 text-sm"
                  aria-invalid={Boolean(errors.password)}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {showPassword
                    ? <EyeOff className="h-4 w-4" />
                    : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </FormField>

            {/* Server-side error */}
            {submitError ? (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-xl border border-destructive/25 bg-destructive/5 px-3.5 py-3 text-sm text-destructive"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            ) : null}

            {/* Submit */}
            <Button
              type="submit"
              className="h-11 w-full rounded-xl text-[0.9375rem] font-medium"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging in…
                </>
              ) : (
                'Log in'
              )}
            </Button>
          </form>

          {/* Register link */}
          <p className="mt-8 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link
              href="/register"
              className="font-medium text-foreground underline underline-offset-4 transition-opacity hover:opacity-70"
            >
              Create one
            </Link>
          </p>

        </div>
      </div>
    </div>
  );
}

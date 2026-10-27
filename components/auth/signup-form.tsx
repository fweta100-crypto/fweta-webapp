"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { signupAction } from "@/app/actions/auth";
import { signupSchema } from "@/lib/validations/auth";
import type { UserRole } from "@/types/enums";
import { cn } from "@/lib/utils";

type Step = "email" | "password" | "role";
type Path = "brand" | "creator";

const STEPS: Step[] = ["email", "password", "role"];
const MIN_PASSWORD = 8;

const PATHS: { id: Path; title: string; body: string; icon: LucideIcon }[] = [
  {
    id: "brand",
    title: "I'm a business",
    body: "Run campaigns and hire creators.",
    icon: Briefcase,
  },
  {
    id: "creator",
    title: "I'm a creator",
    body: "Earn from the content you make.",
    icon: Sparkles,
  },
];

function rolesFromPreset(preset?: string): UserRole[] {
  if (preset === "brand" || preset === "business") return ["brand"];
  if (preset === "creator") return ["clipper", "influencer"];
  if (preset === "influencer") return ["influencer"];
  if (preset === "clipper") return ["clipper"];
  // No hidden default. A preselected Clipper made a business click look selected
  // while Clipper stayed on, and onboarding then demanded a social profile.
  return [];
}

export function SignupForm({ presetRole }: { presetRole?: string }) {
  const router = useRouter();
  const initialRoles = useMemo(() => rolesFromPreset(presetRole), [presetRole]);

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [path, setPath] = useState<Path | null>(initial.path);
  const [creatorRoles, setCreatorRoles] = useState<UserRole[]>(initial.creatorRoles);
  const [error, setError] = useState<string | null>(null);
  const [emailTaken, setEmailTaken] = useState(false);
  const [pending, startTransition] = useTransition();

  const stepIndex = STEPS.indexOf(step);
  const roles: UserRole[] = path === "brand" ? ["brand"] : path === "creator" ? creatorRoles : [];
  const passwordLongEnough = password.length >= MIN_PASSWORD;

  function goTo(next: Step) {
    setError(null);
    setEmailTaken(false);
    setStep(next);
  }

  function toggleCreatorRole(role: UserRole) {
    setCreatorRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  }

  function submitEmail() {
    if (!signupSchema.shape.email.safeParse(email.trim()).success) {
      setError("Enter a valid email address.");
      return;
    }
    setEmail(email.trim());
    goTo("password");
  }

  function submitPassword() {
    if (!passwordLongEnough) {
      setError(`Use at least ${MIN_PASSWORD} characters.`);
      return;
    }
    goTo("role");
  }

  function submitAccount() {
    if (roles.length === 0) {
      setError(path ? "Pick at least one way to earn." : "Choose what brings you to fweta.");
      return;
    }
    setError(null);
    setEmailTaken(false);
    startTransition(async () => {
      const res = await signupAction({ email, password, roles });
      if (!res.ok) {
        setError(res.error);
        setEmailTaken("code" in res && res.code === "email_taken");
        return;
      }
      router.push("/onboarding");
      router.refresh();
    });
  }

  const heading: Record<Step, { title: string; subtitle: React.ReactNode }> = {
    email: {
      title: "Join fweta",
      subtitle: "Start with your email — it takes about a minute.",
    },
    password: {
      title: "Create a password",
      subtitle: (
        <>
          For <span className="font-medium text-foreground">{email}</span>
        </>
      ),
    },
    role: {
      title: "What brings you here?",
      subtitle: "This sets up your dashboard. You can add more later in settings.",
    },
  };

  return (
    <div className="auth-shell">
      <aside className="auth-brand animate-fade-in">
        <Logo href="https://fweta.com" light size="lg" className="relative z-10" />
        <div className="relative z-10 max-w-md space-y-5">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-gold">Get started</p>
          <h2 className="font-display text-4xl leading-tight text-white xl:text-5xl">
            One account. Multiple ways to earn and grow.
          </h2>
          <p className="text-sm leading-relaxed text-white/65">
            Join as a creator, influencer, business, or all three. Switch roles anytime from
            settings.
          </p>
        </div>
        <p className="relative z-10 text-xs text-white/40">
          Marketing site ·{" "}
          <a href="https://fweta.com" className="text-white/70 underline-offset-2 hover:underline">
            fweta.com
          </a>
        </p>
      </aside>

      <div className="auth-panel bg-atmosphere">
        <div className="auth-card animate-soft-scale flex flex-col">
          <div className="mb-10 flex items-center justify-between min-[960px]:hidden">
            <Logo size="sm" />
            <a href="https://fweta.com" className="text-xs text-muted hover:text-foreground">
              fweta.com
            </a>
          </div>

          <div className="flex h-8 items-center justify-between">
            {stepIndex > 0 ? (
              <button
                type="button"
                onClick={() => goTo(STEPS[stepIndex - 1])}
                disabled={pending}
                className="-ml-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-muted transition hover:bg-surface-2 hover:text-foreground disabled:opacity-45"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden />
                Back
              </button>
            ) : (
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-gold-deep">
                Get started
              </p>
            )}
            <p className="text-xs font-medium text-muted" aria-live="polite">
              Step {stepIndex + 1} of {STEPS.length}
            </p>
          </div>

          <h1 className="font-display text-[2.35rem] leading-none text-foreground md:text-5xl">
            Join fweta
          </h1>
          <p className="mt-3 text-sm text-muted">
            Choose one or more roles. A business account does not need a social profile.
          </p>
          <div className="hairline-gold my-7" />

          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              setError(null);
              startTransition(async () => {
                const res = await signupAction({
                  email: String(fd.get("email") || ""),
                  password: String(fd.get("password") || ""),
                  roles,
                });
                if (!res.ok) {
                  setError(res.error);
                  return;
                }
                router.push("/onboarding");
                router.refresh();
              });
            }}
          >
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required placeholder="you@email.com" autoComplete="email" />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
              />
            ))}
          </div>

          <div key={step} className="animate-fade-up">
            <h1 className="mt-7 font-display text-[2.35rem] leading-none text-foreground md:text-5xl">
              {heading[step].title}
            </h1>
            <p className="mt-3 text-sm text-muted">{heading[step].subtitle}</p>

            <form
              className="mt-8 space-y-5"
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                if (step === "email") submitEmail();
                else if (step === "password") submitPassword();
                else submitAccount();
              }}
            >
              {step === "email" ? (
                <div>
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail
                      className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-light"
                      aria-hidden
                    />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      autoFocus
                      placeholder="you@email.com"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="has-leading-icon"
                      aria-invalid={error ? true : undefined}
                    />
                  </div>
                </div>
              ) : null}

              {step === "password" ? (
                <div>
                  {/* Lets password managers save the email alongside the new password. */}
                  <input type="email" name="username" value={email} autoComplete="username" readOnly hidden />
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock
                      className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-light"
                      aria-hidden
                    />
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoFocus
                      placeholder={`At least ${MIN_PASSWORD} characters`}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="has-leading-icon has-trailing-action"
                      aria-invalid={error ? true : undefined}
                      aria-describedby="password-rule"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-foreground"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      aria-pressed={showPassword}
                    >
                      {showPassword ? (
                        <EyeOff className="h-[18px] w-[18px]" aria-hidden />
                      ) : (
                        <Eye className="h-[18px] w-[18px]" aria-hidden />
                      )}
                    </button>
                  </div>
                  <p
                    id="password-rule"
                    className={cn(
                      "mt-2 flex items-center gap-1.5 text-xs transition-colors",
                      passwordLongEnough ? "text-success" : "text-muted",
                    )}
                  >
                    <Check className="h-3.5 w-3.5" aria-hidden />
                    At least {MIN_PASSWORD} characters
                  </p>
                </div>
              ) : null}

            <FieldError>{error}</FieldError>
            <Button type="submit" size="lg" className="mt-2" disabled={pending || roles.length === 0}>
              {pending ? "Creating…" : roles.length === 0 ? "Select a role" : "Create account"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

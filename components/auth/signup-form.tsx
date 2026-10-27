"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Check,
  CircleAlert,
  Eye,
  EyeOff,
  LoaderCircle,
  Lock,
  Mail,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

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

const CREATOR_OPTIONS: { id: Extract<UserRole, "clipper" | "influencer">; title: string; body: string }[] = [
  { id: "clipper", title: "Clip campaigns", body: "Post clips and earn per verified view." },
  { id: "influencer", title: "Get booked", body: "Set your own rates and get hired by brands." },
];

function initialSelection(preset: string | null): {
  path: Path | null;
  creatorRoles: UserRole[];
} {
  if (preset === "brand") return { path: "brand", creatorRoles: ["clipper", "influencer"] };
  if (preset === "creator") return { path: "creator", creatorRoles: ["clipper", "influencer"] };
  if (preset === "influencer") return { path: "creator", creatorRoles: ["influencer"] };
  if (preset === "clipper") return { path: "creator", creatorRoles: ["clipper"] };
  return { path: null, creatorRoles: ["clipper", "influencer"] };
}

export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [initial] = useState(() => initialSelection(searchParams.get("role")));

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
            Join as a creator, influencer, business — or all three. Switch roles anytime from
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

          <div className="mt-3 grid grid-cols-3 gap-1.5" aria-hidden>
            {STEPS.map((s, i) => (
              <span
                key={s}
                className={cn(
                  "h-1 rounded-full transition-colors duration-300",
                  i <= stepIndex ? "bg-gold" : "bg-surface-2",
                )}
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

              {step === "role" ? (
                <div className="space-y-3">
                  <div className="grid gap-2.5" role="radiogroup" aria-label="What brings you here?">
                    {PATHS.map(({ id, title, body, icon: Icon }) => {
                      const active = path === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() => {
                            setPath(id);
                            setError(null);
                          }}
                          className={cn(
                            "flex items-center gap-3.5 rounded-2xl border px-4 py-4 text-left transition",
                            active
                              ? "border-gold bg-gold-soft"
                              : "border-border bg-white hover:border-border-strong",
                          )}
                        >
                          <span
                            className={cn(
                              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                              active ? "bg-white text-gold-deep" : "bg-surface-2 text-muted",
                            )}
                          >
                            <Icon className="h-5 w-5" aria-hidden />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[15px] font-medium text-foreground">{title}</span>
                            <span className="block text-sm text-muted">{body}</span>
                          </span>
                          <span
                            className={cn(
                              "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition",
                              active ? "border-gold bg-gold text-white" : "border-border-strong",
                            )}
                          >
                            {active ? <Check className="h-3 w-3" strokeWidth={3} aria-hidden /> : null}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {path === "creator" ? (
                    <fieldset className="animate-fade-in rounded-2xl border border-border bg-surface-2/40 p-3">
                      <legend className="px-1 text-xs font-medium text-muted">
                        How do you want to earn? Pick one or both.
                      </legend>
                      <div className="mt-1 space-y-1">
                        {CREATOR_OPTIONS.map(({ id, title, body }) => {
                          const checked = creatorRoles.includes(id);
                          return (
                            <label
                              key={id}
                              className="flex cursor-pointer items-start gap-3 rounded-xl px-2 py-2 transition hover:bg-white"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => {
                                  toggleCreatorRole(id);
                                  setError(null);
                                }}
                                className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--gold)]"
                              />
                              <span>
                                <span className="block text-sm font-medium text-foreground">{title}</span>
                                <span className="block text-xs text-muted">{body}</span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>
                  ) : null}
                </div>
              ) : null}

              {error ? (
                <div
                  role="alert"
                  className="animate-fade-in flex items-start gap-2.5 rounded-xl border border-danger/20 bg-danger-soft px-3.5 py-3 text-sm text-danger"
                >
                  <CircleAlert className="mt-px h-4 w-4 shrink-0" aria-hidden />
                  <div className="space-y-1.5">
                    <p>{error}</p>
                    {emailTaken ? (
                      <p className="flex flex-wrap gap-x-3 gap-y-1 font-medium">
                        <Link
                          href={`/login?email=${encodeURIComponent(email)}`}
                          className="underline underline-offset-2"
                        >
                          Log in instead
                        </Link>
                        <button
                          type="button"
                          onClick={() => goTo("email")}
                          className="underline underline-offset-2"
                        >
                          Use a different email
                        </button>
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <Button type="submit" size="lg" className="group mt-1" disabled={pending}>
                {pending ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
                    Creating account…
                  </>
                ) : (
                  <>
                    {step === "role" ? "Create account" : "Continue"}
                    <ArrowRight
                      className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </>
                )}
              </Button>
            </form>
          </div>

          <p className="mt-8 border-t border-border pt-6 text-center text-sm text-muted">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-foreground underline-offset-4 hover:text-gold-deep hover:underline"
            >
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

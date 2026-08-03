/**
 * Gatepath Realtors — Admin Shell (Phase 5A rebuild)
 *
 * This file WAS the entire 2,988-line CRM (14 tabs switched by local
 * useState, no deep-linking). It is now the shell/layout route only: it owns
 * authentication (relocated verbatim from the original — auth/session
 * handling is off-limits for redesign edits per CLAUDE.md, so this logic is
 * moved, not rewritten) and renders <AdminShell><Outlet/></AdminShell> once
 * a session resolves. Every former tab is now its own child route
 * (admin.index.tsx, admin.leads.tsx, admin.plots.tsx, etc.), each doing its
 * own scoped data fetch instead of sharing one 9-table Promise.all on every
 * mount — see the Phase 5A plan for the full rationale.
 */
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shield, Lock, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { AdminSessionProvider } from "@/context/AdminSessionContext";
import { AdminShell } from "@/components/admin/AdminShell";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({
    meta: [{ title: "CEO & Staff Operations Portal — Gatepath Realtors" }],
  }),
});

function AdminPage() {
  // Auth States — real Supabase Auth session, matched to admin_users by email.
  // See docs/SECURITY_HARDENING.md for the RLS policies this depends on.
  const [sessionUser, setSessionUser] = useState<{ id: string; email: string } | null>(null);
  const [adminRole, setAdminRole] = useState<"ceo" | "manager" | "agent" | null>(null);
  const [adminName, setAdminName] = useState("");
  const [authLoading, setAuthLoading] = useState(true);

  // Login Form States
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // 1. CHECK SESSION AND ROLE ON MOUNT — real Supabase Auth, then match the
  // authenticated email against admin_users for role + display name. Data is
  // never fetched until this resolves to a confirmed admin.
  const resolveAdminForSession = async (email: string, userId: string) => {
    const { data, error } = await (supabase as any)
      .from("admin_users")
      .select("role, full_name")
      .eq("email", email)
      .maybeSingle();

    if (error || !data) {
      // Authenticated with Supabase but not a recognised staff email —
      // sign out immediately rather than leaving a half-authenticated state.
      await supabase.auth.signOut();
      setSessionUser(null);
      setAdminRole(null);
      setAdminName("");
      setLoginError(
        "This account is not registered as Gatepath staff. Contact the CEO for access.",
      );
      return;
    }

    setSessionUser({ id: userId, email });
    setAdminRole(data.role);
    setAdminName(data.full_name || email);
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      const session = data.session;
      if (session?.user?.email) {
        await resolveAdminForSession(session.user.email, session.user.id);
      }
      if (!cancelled) setAuthLoading(false);
    })();

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user?.email) {
        await resolveAdminForSession(session.user.email, session.user.id);
      } else {
        setSessionUser(null);
        setAdminRole(null);
        setAdminName("");
      }
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: emailInput.trim().toLowerCase(),
      password: passwordInput,
    });

    setLoginLoading(false);

    if (error) {
      setLoginError("Invalid email or password.");
      return;
    }

    setPasswordInput("");
    // onAuthStateChange picks up the new session and resolves the admin_users
    // row above — nothing else to do here.
  };

  // ─── LOADING SCREEN ───────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--primary-deep)",
        }}
      >
        <Loader2
          className="animate-spin"
          size={40}
          style={{ color: "var(--accent)", marginBottom: 16 }}
        />
        <p
          style={{
            fontFamily: "Montserrat, sans-serif",
            fontWeight: 600,
            fontSize: 13,
            color: "rgba(255,255,255,0.5)",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
          }}
        >
          Securing Connection...
        </p>
      </div>
    );
  }

  // ─── LOGIN SCREEN ─────────────────────────────────────────────────────────────
  if (!sessionUser || !adminRole) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--primary-deep)",
          padding: 24,
        }}
      >
        <form
          onSubmit={handleLogin}
          style={{
            width: "100%",
            maxWidth: 380,
            background: "#FFFFFF",
            borderRadius: 16,
            padding: "40px 32px",
            boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
            <Shield size={22} style={{ color: "var(--accent)" }} />
            <span
              style={{
                fontFamily: "Montserrat, sans-serif",
                fontWeight: 700,
                fontSize: 13,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--primary-deep)",
              }}
            >
              Gatepath Staff Portal
            </span>
          </div>

          {loginError && (
            <div
              style={{
                background: "#FEE2E2",
                color: "#991B1B",
                fontSize: 13,
                padding: "10px 14px",
                borderRadius: 8,
                marginBottom: 18,
              }}
            >
              {loginError}
            </div>
          )}

          <label
            style={{
              display: "block",
              fontSize: 12,
              fontWeight: 600,
              color: "#5A5A5A",
              marginBottom: 6,
            }}
          >
            Email
          </label>
          <input
            type="email"
            required
            autoComplete="username"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            placeholder="you@gatepathrealtors.com"
            style={{
              width: "100%",
              padding: "11px 14px",
              border: "1px solid #D5D0C8",
              borderRadius: 8,
              fontSize: 14,
              marginBottom: 18,
              outline: "none",
            }}
          />

          <label
            style={{
              display: "block",
              fontSize: 12,
              fontWeight: 600,
              color: "#5A5A5A",
              marginBottom: 6,
            }}
          >
            Password
          </label>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            placeholder="••••••••"
            style={{
              width: "100%",
              padding: "11px 14px",
              border: "1px solid #D5D0C8",
              borderRadius: 8,
              fontSize: 14,
              marginBottom: 24,
              outline: "none",
            }}
          />

          <button
            type="submit"
            disabled={loginLoading}
            style={{
              width: "100%",
              padding: "13px",
              background: "var(--accent)",
              color: "#FFFFFF",
              fontWeight: 700,
              fontSize: 14,
              borderRadius: 8,
              border: "none",
              cursor: loginLoading ? "not-allowed" : "pointer",
              opacity: loginLoading ? 0.7 : 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {loginLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Signing in…
              </>
            ) : (
              <>
                <Lock size={15} /> Sign In
              </>
            )}
          </button>

          <p
            style={{
              fontSize: 11,
              color: "#9A9A9A",
              marginTop: 20,
              textAlign: "center",
              lineHeight: 1.6,
            }}
          >
            Access is restricted to registered Gatepath staff accounts. Contact the CEO if you need
            an account created.
          </p>
        </form>
      </div>
    );
  }

  // ─── AUTHENTICATED SHELL ──────────────────────────────────────────────────────
  return (
    <AdminSessionProvider value={{ sessionUser, adminRole, adminName }}>
      <AdminShell>
        <Outlet />
      </AdminShell>
    </AdminSessionProvider>
  );
}

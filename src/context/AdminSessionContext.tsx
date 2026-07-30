/**
 * Gatepath Realtors — Admin Session Context
 * Populated once by the /admin shell route (src/routes/admin.tsx) after
 * resolveAdminForSession() resolves, so every child route (dashboard, leads,
 * plots, ...) can read identity without re-deriving it or prop-drilling.
 */
import { createContext, useContext, type ReactNode } from "react";

export interface AdminSession {
  sessionUser: { id: string; email: string };
  adminRole: "ceo" | "manager" | "agent";
  adminName: string;
}

const AdminSessionContext = createContext<AdminSession | null>(null);

export function AdminSessionProvider({
  value,
  children,
}: {
  value: AdminSession;
  children: ReactNode;
}) {
  return <AdminSessionContext.Provider value={value}>{children}</AdminSessionContext.Provider>;
}

/** Throws if called outside the /admin route tree — every child route is guaranteed one. */
export function useAdminSession(): AdminSession {
  const ctx = useContext(AdminSessionContext);
  if (!ctx) {
    throw new Error("useAdminSession() must be called within the /admin route tree");
  }
  return ctx;
}

/**
 * Gatepath Realtors — Admin Shell (Phase 5A rebuild)
 * Replaces the hardcoded `fixed left-0 top-0 w-[280px] <aside>` sidebar that
 * lived inline in admin.tsx. Built on the already-installed shadcn Sidebar
 * primitive, which is already wired to useIsMobile() — no new responsive
 * logic needed, just adopting the component that was sitting unused.
 */
import { useEffect, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Home,
  TrendingUp,
  Users,
  Briefcase,
  DollarSign,
  FileText,
  Calendar,
  MapPin,
  Megaphone,
  UserCheck,
  Settings,
  Shield,
  Search,
  LogOut,
  Plus,
  BarChart2,
  Globe,
  ListTodo,
  Target,
  BarChart3,
  FolderLock,
  Bell,
  ShieldCheck,
  PhoneCall,
  Banknote,
  Goal,
  Share2,
  Smartphone,
  type LucideIcon,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { supabase } from "@/lib/supabase";
import { useAdminSession } from "@/context/AdminSessionContext";

type NavItem = { to: string; label: string; icon: LucideIcon; showPendingBadge?: boolean };

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "MAIN",
    items: [
      { to: "/admin", label: "Home", icon: Home },
      { to: "/admin/agents", label: "Agent Performance", icon: BarChart2 },
      { to: "/admin/leads", label: "Leads", icon: TrendingUp, showPendingBadge: true },
    ],
  },
  {
    label: "SALES",
    items: [
      { to: "/admin/contacts", label: "Contacts", icon: Users },
      { to: "/admin/deals", label: "Deals", icon: Briefcase },
      { to: "/admin/installments", label: "Installment Tracker", icon: DollarSign },
      { to: "/admin/property-matching", label: "Property Matching", icon: Target },
      { to: "/admin/reports", label: "Reports & Analytics", icon: BarChart3 },
      { to: "/admin/commissions", label: "Commission & Payouts", icon: Banknote },
      { to: "/admin/goals", label: "Goals & Quotas", icon: Goal },
      { to: "/admin/referrals-testimonials", label: "Referrals & Testimonials", icon: Share2 },
    ],
  },
  {
    label: "OPERATIONS",
    items: [
      { to: "/admin/inquiries", label: "Inquiries Queue", icon: FileText, showPendingBadge: true },
      { to: "/admin/bookings", label: "Site Visits", icon: Calendar },
      { to: "/admin/tasks", label: "Tasks & Follow-ups", icon: ListTodo },
      { to: "/admin/telephony", label: "Call Log", icon: PhoneCall },
      { to: "/admin/field-mode", label: "Field Mode", icon: Smartphone },
      { to: "/admin/notifications", label: "Notifications & Escalations", icon: Bell },
      { to: "/admin/documents", label: "Document Vault", icon: FolderLock },
      { to: "/admin/plots", label: "Plot Inventory", icon: MapPin },
    ],
  },
  {
    label: "CONTENT & ADMIN",
    items: [
      { to: "/admin/campaigns", label: "Campaigns & Blog", icon: Megaphone },
      { to: "/admin/site-content", label: "Site Content", icon: Globe },
      { to: "/admin/data-governance", label: "Data Governance", icon: ShieldCheck },
      { to: "/admin/staff", label: "Staff Accounts", icon: UserCheck },
      { to: "/admin/settings", label: "System Settings", icon: Settings },
    ],
  },
];

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function AdminShell({ children }: { children: ReactNode }) {
  const { adminName, adminRole } = useAdminSession();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Cheap, scoped count for the pending-inquiries badge — replaces the old
  // shell-level 9-table Promise.all this rebuild removes. This is the one
  // piece of "global" data the shell itself still needs.
  const [pendingCount, setPendingCount] = useState(0);
  useEffect(() => {
    let cancelled = false;
    supabase
      .from("inquiries")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending")
      .then(({ count }) => {
        if (!cancelled) setPendingCount(count ?? 0);
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader className="px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-secondary-container flex items-center justify-center shrink-0">
              <Shield size={20} className="text-on-secondary-container" />
            </div>
            <div className="group-data-[collapsible=icon]:hidden">
              <h1 className="font-headline-md text-headline-md font-bold text-sidebar-foreground tracking-tight">
                Gatepath Realtors
              </h1>
              <p className="text-[10px] uppercase tracking-widest text-sidebar-foreground/70">
                CRM Dashboard
              </p>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent className="px-2">
          {NAV_GROUPS.map((group) => (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel className="text-sidebar-foreground/50">
                {group.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => {
                    const isActive =
                      item.to === "/admin" ? pathname === "/admin" : pathname.startsWith(item.to);
                    return (
                      <SidebarMenuItem key={item.to}>
                        <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                          <Link to={item.to}>
                            <item.icon size={18} />
                            <span>{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                        {item.showPendingBadge && pendingCount > 0 && (
                          <SidebarMenuBadge className="bg-error text-white">
                            {pendingCount}
                          </SidebarMenuBadge>
                        )}
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>

        <SidebarFooter className="px-4 pb-6 space-y-4">
          <Link
            to="/admin/leads"
            className="w-full bg-secondary-container text-on-secondary-container font-label-md text-label-md py-3 rounded-lg flex items-center justify-center gap-2 hover:opacity-90 transition-all group-data-[collapsible=icon]:px-0"
          >
            <Plus size={18} />
            <span className="group-data-[collapsible=icon]:hidden">Add New Lead</span>
          </Link>
          <button
            onClick={() => supabase.auth.signOut()}
            className="w-full flex items-center gap-3 px-2 py-2 text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors text-left"
          >
            <LogOut size={16} />
            <span className="text-label-md group-data-[collapsible=icon]:hidden">Logout</span>
          </button>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="h-16 px-6 flex justify-between items-center bg-surface border-b border-outline-variant shrink-0 sticky top-0 z-40">
          <div className="flex items-center gap-4 w-1/3">
            <SidebarTrigger />
            <div className="relative w-full max-w-md">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
              />
              <input
                type="text"
                placeholder="Search plots, clients, or agents..."
                className="w-full pl-10 pr-4 py-2 bg-surface-container-low border border-outline-variant rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary outline-none transition-all text-body-md"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="font-label-md text-label-md text-primary">{adminName || "Staff"}</p>
              <p className="text-[10px] text-on-surface-variant uppercase">
                {adminRole || "Admin"}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full border border-outline-variant bg-secondary-container flex items-center justify-center overflow-hidden">
              <span className="font-headline-md text-sm text-on-secondary-container">
                {getInitials(adminName || "SA")}
              </span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-gutter space-y-6 bg-background">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}

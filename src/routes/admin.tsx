import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import {
  Users,
  FileText,
  Calendar,
  DollarSign,
  TrendingUp,
  Plus,
  Check,
  X,
  Lock,
  LogOut,
  MapPin,
  PenTool,
  Shield,
  Search,
  Loader2,
  RefreshCw,
  Edit2,
  CheckCircle,
} from "lucide-react";
import type {
  Inquiry,
  Booking,
  Payment,
  Agreement,
  AdminUser,
  Phase,
  Plot,
} from "@/lib/types";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({
    meta: [{ title: "CEO & Staff Operations Portal — Gatepath Realtors" }],
  }),
});

type Tab = "overview" | "inquiries" | "bookings" | "staff" | "plots";

export function AdminPage() {
  const navigate = useNavigate();

  // Auth States
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [adminRole, setAdminRole] = useState<"ceo" | "manager" | "agent" | null>(null);
  const [adminName, setAdminName] = useState("");
  const [authLoading, setAuthLoading] = useState(true);

  // Login Form States
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // Operational Data States
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [staff, setStaff] = useState<AdminUser[]>([]);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [plots, setPlots] = useState<Plot[]>([]);

  // Selection states
  const [selectedPhaseId, setSelectedPhaseId] = useState<string>("");
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [dataLoading, setDataLoading] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Add Staff Modal / Form
  const [newStaffEmail, setNewStaffEmail] = useState("");
  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffRole, setNewStaffRole] = useState<"ceo" | "manager" | "agent">("agent");
  const [staffMsg, setStaffMsg] = useState<string | null>(null);

  // Edit Plot State
  const [editingPlot, setEditingPlot] = useState<Plot | null>(null);
  const [newPlotStatus, setNewPlotStatus] = useState<"available" | "booked" | "sold">("available");

  // 1. CHECK SESSION AND ROLE ON MOUNT
  useEffect(() => {
    const checkAuth = async () => {
      setAuthLoading(true);
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        setSessionUser(session.user);
        // Fetch role from admin_users
        const { data: profile } = await supabase
          .from("admin_users")
          .select("*")
          .eq("id", session.user.id)
          .single();

        if (profile) {
          setAdminRole(profile.role);
          setAdminName(profile.full_name ?? "Staff Member");
          // If valid admin, trigger data load
          loadAllData();
        } else {
          // Logged in but not in admin_users table
          setLoginError("Access denied. Your account is not authorized as staff.");
          await supabase.auth.signOut();
          setSessionUser(null);
        }
      }
      setAuthLoading(false);
    };

    checkAuth();
  }, []);

  // 2. FETCH ALL DATA FOR THE DASHBOARD
  const loadAllData = async () => {
    setDataLoading(true);
    try {
      const [
        inquiriesRes,
        bookingsRes,
        paymentsRes,
        agreementsRes,
        staffRes,
        phasesRes,
        plotsRes,
      ] = await Promise.all([
        supabase.from("inquiries").select("*").order("created_at", { ascending: false }),
        supabase.from("bookings").select("*").order("created_at", { ascending: false }),
        supabase.from("payments").select("*").order("created_at", { ascending: false }),
        supabase.from("agreements").select("*"),
        supabase.from("admin_users").select("*").order("role"),
        supabase.from("phases").select("*").order("name"),
        supabase.from("plots").select("*").order("plot_number"),
      ]);

      setInquiries(inquiriesRes.data ?? []);
      setBookings(bookingsRes.data ?? []);
      setPayments(paymentsRes.data ?? []);
      setAgreements(agreementsRes.data ?? []);
      setStaff(staffRes.data ?? []);
      setPhases(phasesRes.data ?? []);
      setPlots(plotsRes.data ?? []);

      if (phasesRes.data && phasesRes.data.length > 0) {
        setSelectedPhaseId(phasesRes.data[0].id);
      }
    } catch (err) {
      console.error("Error loading dashboard data:", err);
    } finally {
      setDataLoading(false);
    }
  };

  // 3. LOGIN PROCESS
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailInput.trim(),
      password: passwordInput,
    });

    if (error) {
      setLoginError(error.message);
      setLoginLoading(false);
      return;
    }

    if (data.user) {
      // Confirm role in admin_users
      const { data: profile } = await supabase
        .from("admin_users")
        .select("*")
        .eq("id", data.user.id)
        .single();

      if (profile) {
        setSessionUser(data.user);
        setAdminRole(profile.role);
        setAdminName(profile.full_name ?? "Staff Member");
        loadAllData();
      } else {
        setLoginError("Access denied. You do not have staff permissions.");
        await supabase.auth.signOut();
      }
    }
    setLoginLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSessionUser(null);
    setAdminRole(null);
    setAdminName("");
  };

  // 4. CEO CRITICAL OPERATIONS
  // Approve Inquiry & create standard agreement shell
  const handleApproveInquiry = async (inquiryId: string) => {
    const { error } = await supabase
      .from("inquiries")
      .update({ status: "approved" })
      .eq("id", inquiryId);

    if (error) {
      alert("Error approving inquiry: " + error.message);
      return;
    }

    // Try to find if payment exists, if so attach agreement
    const linkedPayment = payments.find((p) => p.inquiry_id === inquiryId);

    await supabase.from("agreements").insert({
      inquiry_id: inquiryId,
      payment_id: linkedPayment?.id ?? null,
      ceo_signed: false,
    });

    loadAllData();
    setSelectedInquiry(null);
  };

  const handleRejectInquiry = async (inquiryId: string) => {
    const { error } = await supabase
      .from("inquiries")
      .update({ status: "rejected" })
      .eq("id", inquiryId);

    if (error) {
      alert("Error rejecting inquiry: " + error.message);
      return;
    }
    loadAllData();
    setSelectedInquiry(null);
  };

  // E-Sign Agreement (CEO Only)
  const handleCeoSignature = async (inquiryId: string) => {
    if (adminRole !== "ceo") {
      alert("Critical Operation: Only the CEO (Joe Muchiri) can sign purchase agreements.");
      return;
    }

    const { error } = await supabase
      .from("agreements")
      .update({
        ceo_signed: true,
        ceo_signed_at: new Date().toISOString(),
      })
      .eq("inquiry_id", inquiryId);

    if (error) {
      alert("Error signing agreement: " + error.message);
      return;
    }

    alert("Purchase Agreement successfully signed digitally by CEO!");
    loadAllData();
  };

  // Manage Bookings
  const handleUpdateBookingStatus = async (
    bookingId: string,
    status: Booking["status"]
  ) => {
    const { error } = await supabase
      .from("bookings")
      .update({ status })
      .eq("id", bookingId);

    if (error) {
      alert("Error updating booking: " + error.message);
      return;
    }
    loadAllData();
  };

  // Staff Management (CEO Only)
  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffMsg(null);

    if (adminRole !== "ceo") {
      setStaffMsg("Critical Operation: Only the CEO can add or modify staff.");
      return;
    }

    // Add directly to admin_users profile table.
    // Note: Staff member should sign up/invite through Supabase Auth, but this populates their role profile.
    const { error } = await supabase.from("admin_users").insert({
      id: crypto.randomUUID(), // Temporarily generate a mock ID profile, ideally matched to Supabase Auth UID
      email: newStaffEmail.trim(),
      full_name: newStaffName.trim(),
      role: newStaffRole,
    });

    if (error) {
      setStaffMsg("Error adding staff profile: " + error.message);
    } else {
      setStaffMsg("Staff profile successfully created!");
      setNewStaffEmail("");
      setNewStaffName("");
      loadAllData();
    }
  };

  // Plot Status Management (CEO & Managers only)
  const handleUpdatePlotStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlot) return;

    if (adminRole === "agent") {
      alert("Access Denied: Agents cannot manually modify plot statuses.");
      return;
    }

    const { error } = await supabase
      .from("plots")
      .update({ status: newPlotStatus })
      .eq("id", editingPlot.id);

    if (error) {
      alert("Error updating plot status: " + error.message);
    } else {
      setEditingPlot(null);
      loadAllData();
    }
  };

  // 5. MEMOIZED STATS
  const stats = useMemo(() => {
    const totalRev = payments
      .filter((p) => p.status === "success")
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const pendingInquiries = inquiries.filter((i) => i.status === "pending").length;
    const completedBookings = bookings.filter((b) => b.status === "completed").length;
    const signedAgreements = agreements.filter((a) => a.ceo_signed).length;

    const availablePlots = plots.filter((p) => p.status === "available").length;
    const bookedPlots = plots.filter((p) => p.status === "booked").length;
    const soldPlots = plots.filter((p) => p.status === "sold").length;

    return {
      totalRev,
      pendingInquiries,
      completedBookings,
      signedAgreements,
      availablePlots,
      bookedPlots,
      soldPlots,
    };
  }, [inquiries, bookings, payments, agreements, plots]);

  // Filtered lists
  const filteredInquiries = useMemo(() => {
    return inquiries.filter((i) => {
      const matchesSearch =
        i.client_full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.client_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (i.phase_name && i.phase_name.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus =
        statusFilter === "all" ? true : i.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [inquiries, searchQuery, statusFilter]);

  const activePhasePlots = useMemo(() => {
    return plots.filter((p) => p.phase_id === selectedPhaseId);
  }, [plots, selectedPhaseId]);

  // Loader View during check
  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#06243A] text-white">
        <Loader2 className="animate-spin text-accent mb-4" size={48} />
        <p className="font-serif text-lg tracking-wider">SECURE CONNECTION STARTING...</p>
      </div>
    );
  }

  // ─── LOGIN SCREEN ───
  if (!sessionUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#06243A] px-6">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#0A3D62] via-[#06243A] to-[#041521] opacity-90"></div>

        <div className="relative w-full max-w-md bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 shadow-2xl">
          <div className="text-center mb-8">
            <div className="mx-auto w-12 h-12 bg-accent/20 text-accent rounded-full flex items-center justify-center mb-3">
              <Lock size={24} />
            </div>
            <h2 className="font-serif font-bold text-[28px] text-white">Gatepath Realtors</h2>
            <p className="text-white/60 text-[13px] mt-1 uppercase tracking-widest">Operations Portal</p>
          </div>

          {loginError && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 text-red-200 text-[13px] rounded-lg">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-[11px] font-semibold text-white/70 block mb-1 uppercase tracking-wider">Email Address</label>
              <input
                type="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="CEO or Staff Email"
                className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-[14px] focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-white/70 block mb-1 uppercase tracking-wider">Secure Password</label>
              <input
                type="password"
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-[14px] focus:outline-none focus:border-accent"
              />
            </div>
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full bg-[#E8A020] text-white font-semibold py-3 rounded-lg hover:bg-[#C8861A] transition-all flex items-center justify-center gap-2 mt-6 text-[15px]"
            >
              {loginLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Verifying...
                </>
              ) : (
                "Access Operations Console →"
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ─── DASHBOARD CONSOLE ───
  return (
    <div className="min-h-screen bg-[#F0F4F8] flex flex-col">
      {/* HEADER BAR */}
      <header className="bg-[#06243A] text-white px-8 py-5 flex items-center justify-between border-b border-white/10 shrink-0">
        <div className="flex items-center gap-4">
          <Shield className="text-[#E8A020]" size={28} />
          <div>
            <h1 className="font-serif font-bold text-[22px] tracking-tight">Gatepath Control Console</h1>
            <p className="text-[11px] text-white/60 uppercase tracking-widest mt-0.5">
              Logged in as: <span className="text-[#E8A020] font-semibold">{adminName} ({adminRole?.toUpperCase()})</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={loadAllData}
            className="p-2.5 bg-white/5 hover:bg-white/10 rounded-lg border border-white/15 transition-all text-white/80 hover:text-white"
            title="Refresh Data"
          >
            <RefreshCw size={16} className={dataLoading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold text-[13px] px-4.5 py-2.5 rounded-lg transition-all"
          >
            <LogOut size={14} /> Log Out
          </button>
        </div>
      </header>

      {/* TWO COLUMN SIDEBAR LAYOUT */}
      <div className="flex-1 flex overflow-hidden">
        {/* SIDEBAR NAVIGATION */}
        <aside className="w-[240px] bg-[#0A3D62] text-white py-6 px-4 flex flex-col gap-2 shrink-0 border-r border-white/10">
          <div className="text-white/40 text-[10px] font-semibold uppercase tracking-widest px-3 mb-2">OPERATIONS</div>
          {[
            { id: "overview", label: "Stats Overview", icon: TrendingUp },
            { id: "inquiries", label: "Inquiries Queue", icon: FileText, count: stats.pendingInquiries },
            { id: "bookings", label: "Bookings & Site Visits", icon: Calendar },
            { id: "plots", label: "Plot Status Control", icon: MapPin },
            { id: "staff", label: "Staff & Roles", icon: Users },
          ].map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as Tab)}
                className={`w-full flex items-center justify-between px-3 py-3 rounded-lg text-[14px] font-medium transition-all ${
                  active
                    ? "bg-[#E8A020] text-white shadow-lg"
                    : "text-white/80 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon size={16} /> {item.label}
                </span>
                {item.count ? (
                  <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {item.count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </aside>

        {/* CONTENT AREA */}
        <main className="flex-1 overflow-y-auto p-8">
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                  {
                    t: "Total Success Revenue",
                    v: `Ksh ${stats.totalRev.toLocaleString()}`,
                    icon: DollarSign,
                    c: "text-green-500 bg-green-500/10",
                  },
                  {
                    t: "Pending Inquiries",
                    v: stats.pendingInquiries,
                    icon: FileText,
                    c: "text-blue-500 bg-blue-500/10",
                  },
                  {
                    t: "Signed Agreements",
                    v: stats.signedAgreements,
                    icon: PenTool,
                    c: "text-yellow-500 bg-yellow-500/10",
                  },
                  {
                    t: "Completed Site Visits",
                    v: stats.completedBookings,
                    icon: Calendar,
                    c: "text-purple-500 bg-purple-500/10",
                  },
                ].map((s) => {
                  const Icon = s.icon;
                  return (
                    <div key={s.t} className="bg-white rounded-xl p-6 border border-[#E5E0D8] shadow-sm flex items-center justify-between">
                      <div>
                        <div className="text-[12px] text-muted-foreground uppercase tracking-wider">{s.t}</div>
                        <div className="font-numbers font-bold text-[28px] text-primary mt-1">{s.v}</div>
                      </div>
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${s.c}`}>
                        <Icon size={24} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* PLOT STATUS SUMMARY */}
              <div className="bg-white rounded-xl p-8 border border-[#E5E0D8] shadow-sm">
                <h3 className="font-serif font-bold text-[20px] text-primary mb-6">Global Plot Inventory Status</h3>
                <div className="grid grid-cols-3 gap-6 text-center">
                  <div className="bg-green-50 rounded-lg p-5 border border-green-200">
                    <div className="text-[12px] text-green-700 uppercase tracking-wider">Available Plots</div>
                    <div className="font-numbers font-bold text-[36px] text-[#22C55E] mt-1">{stats.availablePlots}</div>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-5 border border-yellow-200">
                    <div className="text-[12px] text-yellow-700 uppercase tracking-wider">Booked Plots</div>
                    <div className="font-numbers font-bold text-[36px] text-[#F59E0B] mt-1">{stats.bookedPlots}</div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-5 border border-red-200">
                    <div className="text-[12px] text-red-700 uppercase tracking-wider">Sold Plots</div>
                    <div className="font-numbers font-bold text-[36px] text-[#EF4444] mt-1">{stats.soldPlots}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: INQUIRIES QUEUE */}
          {activeTab === "inquiries" && (
            <div className="bg-white rounded-xl border border-[#E5E0D8] shadow-sm overflow-hidden animate-in fade-in duration-300">
              <div className="p-6 border-b border-[#E5E0D8] flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by client name, email, or phase..."
                    className="w-full pl-10 pr-4 py-2 border border-[#D5D0C8] rounded-lg text-[14px]"
                  />
                </div>
                <div className="flex gap-2">
                  {["all", "pending", "approved", "rejected"].map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setStatusFilter(filter)}
                      className={`px-4 py-2 rounded-lg text-[13px] font-semibold border capitalize transition-all ${
                        statusFilter === filter
                          ? "bg-[#0B7FC7] border-[#0B7FC7] text-white"
                          : "bg-white border-[#D5D0C8] text-foreground hover:bg-[#F8F4EE]"
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>

              {/* TABLE */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-[#F8F4EE] border-b border-[#E5E0D8] text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                      <th className="px-6 py-4">Client Name</th>
                      <th className="px-6 py-4">Target Plot</th>
                      <th className="px-6 py-4">Email</th>
                      <th className="px-6 py-4">Payment Terms</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E0D8] text-[14px]">
                    {filteredInquiries.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-12 text-muted-foreground">
                          No inquiries match your filters.
                        </td>
                      </tr>
                    ) : (
                      filteredInquiries.map((inquiry) => (
                        <tr key={inquiry.id} className="hover:bg-[#F8F4EE]/50 transition-colors">
                          <td className="px-6 py-4 font-semibold text-primary">
                            {inquiry.client_full_name}
                          </td>
                          <td className="px-6 py-4">
                            {inquiry.phase_name || "Any Plot"} {inquiry.plot_number_ref ? `#${inquiry.plot_number_ref}` : ""}
                          </td>
                          <td className="px-6 py-4">{inquiry.client_email}</td>
                          <td className="px-6 py-4 capitalize font-medium text-accent">
                            {inquiry.terms_of_payment || "Not Selected"}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-block text-[11px] font-bold uppercase px-3 py-1 rounded-full border ${
                                inquiry.status === "approved"
                                  ? "bg-green-50 border-green-200 text-green-700"
                                  : inquiry.status === "rejected"
                                    ? "bg-red-50 border-red-200 text-red-700"
                                    : "bg-yellow-50 border-yellow-200 text-yellow-700"
                              }`}
                            >
                              {inquiry.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => setSelectedInquiry(inquiry)}
                              className="text-[13px] font-semibold text-[#0B7FC7] hover:underline"
                            >
                              Review & Sign
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: BOOKINGS QUEUE */}
          {activeTab === "bookings" && (
            <div className="bg-white rounded-xl border border-[#E5E0D8] shadow-sm overflow-hidden animate-in fade-in duration-300">
              <div className="p-6 border-b border-[#E5E0D8]">
                <h3 className="font-serif font-bold text-[20px] text-primary">Active Site Visit Bookings</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-[#F8F4EE] border-b border-[#E5E0D8] text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                      <th className="px-6 py-4">Scheduled Date</th>
                      <th className="px-6 py-4">Visit Type</th>
                      <th className="px-6 py-4">Attendees</th>
                      <th className="px-6 py-4">Visit Notes</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E0D8] text-[14px]">
                    {bookings.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-12 text-muted-foreground">
                          No bookings scheduled.
                        </td>
                      </tr>
                    ) : (
                      bookings.map((booking) => (
                        <tr key={booking.id} className="hover:bg-[#F8F4EE]/50 transition-colors">
                          <td className="px-6 py-4 font-semibold text-primary">
                            {booking.visit_date} ({booking.visit_time})
                          </td>
                          <td className="px-6 py-4 capitalize font-semibold">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[11px] ${
                                booking.visit_type === "virtual"
                                  ? "bg-purple-100 text-purple-700"
                                  : "bg-blue-100 text-blue-700"
                              }`}
                            >
                              {booking.visit_type}
                            </span>
                          </td>
                          <td className="px-6 py-4">{booking.attendees}</td>
                          <td className="px-6 py-4 max-w-[240px] truncate" title={booking.visit_notes ?? ""}>
                            {booking.visit_notes || "—"}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-block text-[11px] font-bold uppercase px-3 py-1 rounded-full border ${
                                booking.status === "confirmed"
                                  ? "bg-blue-50 border-blue-200 text-blue-700"
                                  : booking.status === "completed"
                                    ? "bg-green-50 border-green-200 text-green-700"
                                    : booking.status === "cancelled"
                                      ? "bg-red-50 border-red-200 text-red-700"
                                      : "bg-yellow-50 border-yellow-200 text-yellow-700"
                              }`}
                            >
                              {booking.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right flex justify-end gap-2">
                            {booking.status === "pending" && (
                              <button
                                onClick={() => handleUpdateBookingStatus(booking.id, "confirmed")}
                                className="p-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
                                title="Confirm Visit"
                              >
                                <Check size={16} />
                              </button>
                            )}
                            {booking.status !== "completed" && booking.status !== "cancelled" && (
                              <>
                                <button
                                  onClick={() => handleUpdateBookingStatus(booking.id, "completed")}
                                  className="p-1 bg-green-100 text-green-700 rounded-md hover:bg-green-200"
                                  title="Mark Completed"
                                >
                                  <CheckCircle size={16} />
                                </button>
                                <button
                                  onClick={() => handleUpdateBookingStatus(booking.id, "cancelled")}
                                  className="p-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200"
                                  title="Cancel Visit"
                                >
                                  <X size={16} />
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: STAFF MANAGEMENT */}
          {activeTab === "staff" && (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 animate-in fade-in duration-300">
              {/* STAFF LIST */}
              <div className="bg-white rounded-xl border border-[#E5E0D8] shadow-sm p-6">
                <h3 className="font-serif font-bold text-[20px] text-primary mb-6">Active Operations Team</h3>
                <div className="space-y-4">
                  {staff.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-4 bg-[#F8F4EE] border border-[#E5E0D8] rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center font-bold">
                          {member.full_name?.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-serif font-semibold text-[16px] text-primary">{member.full_name}</h4>
                          <p className="text-[12px] text-muted-foreground">{member.email}</p>
                        </div>
                      </div>
                      <span className="bg-accent text-white text-[11px] font-bold uppercase px-3 py-1 rounded-full">
                        {member.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ADD STAFF */}
              <div className="bg-white rounded-xl border border-[#E5E0D8] shadow-sm p-6 h-fit">
                <h3 className="font-serif font-bold text-[20px] text-primary mb-4">Add Staff Profile</h3>

                {staffMsg && (
                  <div className="mb-4 p-3 bg-[#F0F4F8] border border-[#E5E0D8] text-[13px] rounded-lg text-primary font-medium">
                    {staffMsg}
                  </div>
                )}

                <form onSubmit={handleAddStaff} className="space-y-4">
                  <div>
                    <label className="text-[12px] font-semibold text-muted-foreground block mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={newStaffName}
                      onChange={(e) => setNewStaffName(e.target.value)}
                      placeholder="Joe Wambua"
                      className="w-full px-3.5 py-2.5 border border-[#D5D0C8] rounded-lg text-[14px]"
                    />
                  </div>
                  <div>
                    <label className="text-[12px] font-semibold text-muted-foreground block mb-1">Email Address</label>
                    <input
                      type="email"
                      required
                      value={newStaffEmail}
                      onChange={(e) => setNewStaffEmail(e.target.value)}
                      placeholder="wambua@gatepathrealtors.com"
                      className="w-full px-3.5 py-2.5 border border-[#D5D0C8] rounded-lg text-[14px]"
                    />
                  </div>
                  <div>
                    <label className="text-[12px] font-semibold text-muted-foreground block mb-1">Assigned Role</label>
                    <select
                      value={newStaffRole}
                      onChange={(e) => setNewStaffRole(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 border border-[#D5D0C8] rounded-lg text-[14px] bg-white"
                    >
                      <option value="agent">Agent (View inquiries/bookings)</option>
                      <option value="manager">Manager (Approve inquiries/adjust plots)</option>
                      <option value="ceo">CEO (Joe Muchiri — Critical E-Signatures)</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-[#E8A020] text-white font-semibold py-3 rounded-lg hover:bg-[#C8861A] transition-all text-[14px] mt-4"
                  >
                    Create Staff Profile
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 5: PLOT STATUS GRID CONTROL */}
          {activeTab === "plots" && (
            <div className="bg-white rounded-xl border border-[#E5E0D8] shadow-sm p-6 animate-in fade-in duration-300">
              <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#E5E0D8] pb-6 mb-6 gap-4">
                <div>
                  <h3 className="font-serif font-bold text-[22px] text-primary">Manual Plot Override</h3>
                  <p className="text-[13px] text-muted-foreground mt-1">Select a phase to view its plots and forcefully update statuses.</p>
                </div>
                <select
                  value={selectedPhaseId}
                  onChange={(e) => setSelectedPhaseId(e.target.value)}
                  className="px-4 py-2.5 border border-[#D5D0C8] rounded-lg text-[14px] bg-white min-w-[240px]"
                >
                  {phases.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} (Phase {p.phase_number ?? "N/A"})</option>
                  ))}
                </select>
              </div>

              {/* GRID */}
              <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-8 gap-3">
                {activePhasePlots.map((plot) => (
                  <button
                    key={plot.id}
                    onClick={() => {
                      if (adminRole === "agent") {
                        alert("Access Denied: Agents cannot manually modify plot statuses.");
                        return;
                      }
                      setEditingPlot(plot);
                      setNewPlotStatus(plot.status);
                    }}
                    className={`p-4 rounded-lg border text-center transition-all ${
                      plot.status === "available"
                        ? "bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                        : plot.status === "booked"
                          ? "bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100"
                          : "bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
                    }`}
                  >
                    <div className="text-[12px] font-semibold">Plot</div>
                    <div className="text-[20px] font-bold font-numbers">#{plot.plot_number}</div>
                    <div className="text-[10px] uppercase font-bold tracking-wider mt-1">{plot.status}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* DETAIL MODAL (REVIEW INQUIRY) */}
      {selectedInquiry && (
        <div className="fixed inset-0 z-50 bg-[#06243A]/50 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-2xl rounded-2xl p-8 shadow-2xl border border-[#E5E0D8] max-h-[85vh] overflow-y-auto relative">
            <button
              onClick={() => setSelectedInquiry(null)}
              className="absolute top-6 right-6 text-muted-foreground hover:text-primary"
            >
              <X size={20} />
            </button>

            <h3 className="font-serif font-bold text-[24px] text-primary">Inquiry Review Board</h3>
            <p className="text-[13px] text-muted-foreground mt-1">Review the customer details and approve the sale agreement.</p>

            <div className="my-6 space-y-6">
              {/* Customer details */}
              <div className="bg-[#F8F4EE] border border-[#E5E0D8] rounded-lg p-5">
                <h4 className="text-[11px] font-bold text-accent uppercase tracking-wider mb-3">CLIENT DATA</h4>
                <div className="grid grid-cols-2 gap-4 text-[13px]">
                  <div>
                    <span className="text-muted-foreground">Full Name:</span>
                    <div className="font-semibold text-primary mt-0.5">{selectedInquiry.client_full_name}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Phone No:</span>
                    <div className="font-semibold text-primary mt-0.5">{selectedInquiry.client_phone}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Email:</span>
                    <div className="font-semibold text-primary mt-0.5">{selectedInquiry.client_email}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">National ID/Passport:</span>
                    <div className="font-semibold text-primary mt-0.5">{selectedInquiry.client_id_passport}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">KRA PIN:</span>
                    <div className="font-semibold text-primary mt-0.5">{selectedInquiry.client_kra_pin || "—"}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Address:</span>
                    <div className="font-semibold text-primary mt-0.5">{selectedInquiry.client_postal_address || "—"}</div>
                  </div>
                </div>
              </div>

              {/* Next of kin */}
              <div className="bg-[#F8F4EE] border border-[#E5E0D8] rounded-lg p-5">
                <h4 className="text-[11px] font-bold text-accent uppercase tracking-wider mb-3">NEXT OF KIN</h4>
                <div className="grid grid-cols-2 gap-4 text-[13px]">
                  <div>
                    <span className="text-muted-foreground">Full Name:</span>
                    <div className="font-semibold text-primary mt-0.5">{selectedInquiry.kin_full_name || "—"}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Relationship:</span>
                    <div className="font-semibold text-primary mt-0.5">{selectedInquiry.kin_relationship || "—"}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Phone No:</span>
                    <div className="font-semibold text-primary mt-0.5">{selectedInquiry.kin_phone || "—"}</div>
                  </div>
                </div>
              </div>

              {/* Transaction details */}
              <div className="bg-[#F8F4EE] border border-[#E5E0D8] rounded-lg p-5">
                <h4 className="text-[11px] font-bold text-accent uppercase tracking-wider mb-3">TRANSACTION DATA</h4>
                <div className="grid grid-cols-2 gap-4 text-[13px]">
                  <div>
                    <span className="text-muted-foreground">Project Name:</span>
                    <div className="font-semibold text-primary mt-0.5">{selectedInquiry.phase_name} (Plot #{selectedInquiry.plot_number_ref})</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Payment Terms:</span>
                    <div className="font-semibold text-primary mt-0.5 capitalize">{selectedInquiry.terms_of_payment}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Agreed Price:</span>
                    <div className="font-semibold text-[#0B7FC7] font-numbers mt-0.5">Ksh {selectedInquiry.price?.toLocaleString() || "—"}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Deposit Paid:</span>
                    <div className="font-semibold text-[#22C55E] font-numbers mt-0.5">Ksh {selectedInquiry.deposit?.toLocaleString() || "—"}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* ACTION FOOTER */}
            <div className="flex justify-end gap-3 pt-6 border-t border-[#E5E0D8]">
              {selectedInquiry.status === "pending" && (
                <>
                  <button
                    onClick={() => handleRejectInquiry(selectedInquiry.id)}
                    className="px-6 py-3 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-[14px] font-semibold transition-all"
                  >
                    Reject Inquiry
                  </button>
                  <button
                    onClick={() => handleApproveInquiry(selectedInquiry.id)}
                    className="px-6 py-3 bg-[#0B7FC7] text-white hover:bg-[#075F96] rounded-lg text-[14px] font-semibold transition-all"
                  >
                    Approve Inquiry & Draft Agreement
                  </button>
                </>
              )}

              {selectedInquiry.status === "approved" && (
                (() => {
                  const signed = agreements.some(
                    (a) => a.inquiry_id === selectedInquiry.id && a.ceo_signed
                  );
                  return signed ? (
                    <div className="flex items-center gap-2 text-green-700 bg-green-50 px-4 py-3 rounded-lg border border-green-200 font-semibold text-[14px]">
                      <Check size={18} /> Purchase Agreement digitally signed by CEO
                    </div>
                  ) : adminRole === "ceo" ? (
                    <button
                      onClick={() => handleCeoSignature(selectedInquiry.id)}
                      className="px-6 py-3 bg-[#E8A020] text-white hover:bg-[#C8861A] rounded-lg text-[14px] font-semibold transition-all flex items-center gap-2"
                    >
                      <PenTool size={16} /> Sign Purchase Agreement (CEO e-Signature)
                    </button>
                  ) : (
                    <div className="text-[14px] text-muted-foreground italic">
                      Awaiting CEO e-signature. Only the CEO can sign agreements.
                    </div>
                  );
                })()
              )}
            </div>
          </div>
        </div>
      )}

      {/* EDIT PLOT MODAL */}
      {editingPlot && (
        <div className="fixed inset-0 z-50 bg-[#06243A]/50 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-xl p-6 shadow-2xl border border-[#E5E0D8] relative">
            <button
              onClick={() => setEditingPlot(null)}
              className="absolute top-5 right-5 text-muted-foreground hover:text-primary"
            >
              <X size={18} />
            </button>

            <h3 className="font-serif font-bold text-[20px] text-primary">Edit Plot #{editingPlot.plot_number}</h3>
            <p className="text-[12px] text-muted-foreground mt-1">Forcefully adjust plot status in the inventory system.</p>

            <form onSubmit={handleUpdatePlotStatus} className="mt-6 space-y-4">
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Status</label>
                <select
                  value={newPlotStatus}
                  onChange={(e: any) => setNewPlotStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-[#D5D0C8] rounded-lg text-[14px] bg-white"
                >
                  <option value="available">🟢 Available</option>
                  <option value="booked">🟡 Booked</option>
                  <option value="sold">🔴 Sold</option>
                </select>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingPlot(null)}
                  className="flex-1 py-2.5 border border-[#D5D0C8] text-foreground rounded-lg font-semibold text-[13px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#E8A020] text-white rounded-lg font-semibold text-[13px] hover:bg-[#C8861A]"
                >
                  Save Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

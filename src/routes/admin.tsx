import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
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
  BookOpen,
  Home,
  BarChart2,
  Layers,
  UserCheck,
  PhoneCall,
  Settings,
  ChevronRight,
  Activity,
  Briefcase,
  Megaphone,
  ClipboardList,
} from "lucide-react";
import type {
  Inquiry,
  Booking,
  Payment,
  Agreement,
  AdminUser,
  Phase,
  BlogPost,
  Plot,
} from "@/lib/types";
import { sendAgreementSignedNotificationFn } from "@/lib/notifications";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({
    meta: [{ title: "CEO & Staff Operations Portal — Gatepath Realtors" }],
  }),
});

type Tab =
  | "overview"
  | "inquiries"
  | "bookings"
  | "staff"
  | "plots"
  | "blog"
  | "leads"
  | "agents"
  | "contacts"
  | "installments"
  | "meetings"
  | "deals"
  | "campaigns"
  | "settings";

// ─── Stitch Design Tokens ─────────────────────────────────────────────────────
const NAVY = "#0C1A30";
const GOLD = "#E8A020";
const GOLD_DARK = "#C8861A";
const SIDEBAR_HOVER = "rgba(255,255,255,0.06)";
const CANVAS = "#F0F4F8";
const CARD_BORDER = "#E5E0D8";

// ─── Avatar color palette ─────────────────────────────────────────────────────
const avatarColors = [
  "#E8A020", "#0B7FC7", "#22C55E", "#A855F7", "#EC4899", "#14B8A6", "#F97316",
];

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function AdminPage() {
  const navigate = useNavigate();

  // Auth States (Disabled temporarily)
  const [sessionUser, setSessionUser] = useState<any>({ id: "mock-user", email: "ceo@gatepathrealtors.com" });
  const [adminRole, setAdminRole] = useState<"ceo" | "manager" | "agent" | null>("ceo");
  const [adminName, setAdminName] = useState("Joe Muchiri (CEO)");
  const [authLoading, setAuthLoading] = useState(false);

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
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [affiliates, setAffiliates] = useState<any[]>([]);
  
  // Media Manager States
  const [mediaEditingPhaseId, setMediaEditingPhaseId] = useState("");
  const [mediaHeroImage, setMediaHeroImage] = useState("");
  const [mediaDiasporaImage, setMediaDiasporaImage] = useState("");
  const [mediaThumbnail, setMediaThumbnail] = useState("");
  const [mediaBrochure, setMediaBrochure] = useState("");
  const [mediaPlotMap, setMediaPlotMap] = useState("");
  const [mediaSaveLoading, setMediaSaveLoading] = useState(false);
  const [mediaSaveMsg, setMediaSaveMsg] = useState<string | null>(null);

  // Blog Management States
  const [creatingBlog, setCreatingBlog] = useState(false);
  const [editingBlog, setEditingBlog] = useState<BlogPost | null>(null);
  const [blogTitle, setBlogTitle] = useState("");
  const [blogSlug, setBlogSlug] = useState("");
  const [blogCategory, setBlogCategory] = useState<"Investment" | "Legal" | "Buying Guide" | "Company News">("Investment");
  const [blogSummary, setBlogSummary] = useState("");
  const [blogContent, setBlogContent] = useState("");
  const [blogTags, setBlogTags] = useState("");
  const [blogImage, setBlogImage] = useState("");
  const [blogStatus, setBlogStatus] = useState<"draft" | "published">("published");

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
  const [selectedPlotDetail, setSelectedPlotDetail] = useState<Plot | null>(null);
  const [inventoryStatusFilter, setInventoryStatusFilter] = useState<"all" | "available" | "booked" | "sold">("all");
  const [inventoryViewMode, setInventoryViewMode] = useState<"grid" | "table">("table");
  const [newPlotStatus, setNewPlotStatus] = useState<"available" | "booked" | "sold">("available");

  // Edit Phase States
  const [editingPhaseYoutube, setEditingPhaseYoutube] = useState("");
  const [phaseSaveLoading, setPhaseSaveLoading] = useState(false);
  const [phaseSaveMsg, setPhaseSaveMsg] = useState<string | null>(null);

  // 1. CHECK SESSION AND ROLE ON MOUNT (Bypassed)
  useEffect(() => {
    loadAllData();
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
        blogRes,
        affiliatesRes,
      ] = await Promise.all([
        supabase.from("inquiries").select("*").order("created_at", { ascending: false }),
        supabase.from("bookings").select("*").order("created_at", { ascending: false }),
        supabase.from("payments").select("*").order("created_at", { ascending: false }),
        supabase.from("agreements").select("*"),
        supabase.from("admin_users").select("*").order("role"),
        supabase.from("phases").select("*").order("name"),
        supabase.from("plots").select("*").order("plot_number"),
        supabase.from("blog_posts").select("*").order("created_at", { ascending: false }),
        supabase.from("affiliates").select("*").order("created_at", { ascending: false }),
      ]);

      setInquiries(inquiriesRes.data ?? []);
      setBookings(bookingsRes.data ?? []);
      setPayments(paymentsRes.data ?? []);
      setAgreements(agreementsRes.data ?? []);
      setStaff(staffRes.data ?? []);
      setPhases(phasesRes.data ?? []);
      setPlots(plotsRes.data ?? []);
      setBlogPosts((blogRes.data as BlogPost[]) ?? []);
      setAffiliates(affiliatesRes.data ?? []);

      if (phasesRes.data && phasesRes.data.length > 0) {
        setSelectedPhaseId((phasesRes.data[0] as Phase).id);
      }
    } catch (err) {
      console.error("Error loading dashboard data:", err);
    } finally {
      setDataLoading(false);
    }
  };

  // 3. LOGIN PROCESS (Bypassed)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
  };

  const handleLogout = async () => {
    alert("Login system is currently disabled for redesign.");
  };

  // 4. CEO CRITICAL OPERATIONS
  const handleApproveInquiry = async (inquiryId: string) => {
    const { error } = await ((supabase as any)
      .from("inquiries")
      .update({ status: "approved" })
      .eq("id", inquiryId));

    if (error) {
      alert("Error approving inquiry: " + error.message);
      return;
    }

    const linkedPayment = payments.find((p) => p.inquiry_id === inquiryId);

    await (supabase.from("agreements").insert({
      inquiry_id: inquiryId,
      payment_id: linkedPayment?.id ?? null,
      ceo_signed: false,
    } as any) as any);

    loadAllData();
    setSelectedInquiry(null);
  };

  const handleRejectInquiry = async (inquiryId: string) => {
    const { error } = await ((supabase as any)
      .from("inquiries")
      .update({ status: "rejected" })
      .eq("id", inquiryId));

    if (error) {
      alert("Error rejecting inquiry: " + error.message);
      return;
    }
    loadAllData();
    setSelectedInquiry(null);
  };

  const handleCeoSignature = async (inquiryId: string) => {
    if (adminRole !== "ceo") {
      alert("Critical Operation: Only the CEO (Joe Muchiri) can sign purchase agreements.");
      return;
    }

    const { error } = await ((supabase as any)
      .from("agreements")
      .update({
        ceo_signed: true,
        ceo_signed_at: new Date().toISOString(),
      })
      .eq("inquiry_id", inquiryId));

    if (error) {
      alert("Error signing agreement: " + error.message);
      return;
    }

    alert("Purchase Agreement successfully signed digitally by CEO!");

    (sendAgreementSignedNotificationFn as any)({ data: { inquiryId } }).catch((err: any) => {
      console.error("[Gatepath CEO Sign] Notification error:", err);
    });

    loadAllData();
  };

  const handleUpdateBookingStatus = async (
    bookingId: string,
    status: Booking["status"]
  ) => {
    const { error } = await ((supabase as any)
      .from("bookings")
      .update({ status })
      .eq("id", bookingId));

    if (error) {
      alert("Error updating booking: " + error.message);
      return;
    }
    loadAllData();
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffMsg(null);

    if (adminRole !== "ceo") {
      setStaffMsg("Critical Operation: Only the CEO can add or modify staff.");
      return;
    }

    const { error } = await (supabase.from("admin_users").insert({
      id: crypto.randomUUID(),
      email: newStaffEmail.trim(),
      full_name: newStaffName.trim(),
      role: newStaffRole,
    } as any) as any);

    if (error) {
      setStaffMsg("Error adding staff profile: " + error.message);
    } else {
      setStaffMsg("Staff profile successfully created!");
      setNewStaffEmail("");
      setNewStaffName("");
      loadAllData();
    }
  };

  const handleUpdatePlotStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlot) return;

    if (adminRole === "agent") {
      alert("Access Denied: Agents cannot manually modify plot statuses.");
      return;
    }

    const { error } = await ((supabase as any)
      .from("plots")
      .update({ status: newPlotStatus })
      .eq("id", editingPlot.id));

    if (error) {
      alert("Error updating plot status: " + error.message);
    } else {
      setEditingPlot(null);
      loadAllData();
    }
  };

  const handleSaveBlogPost = async (e: React.FormEvent) => {
    e.preventDefault();

    if (adminRole === "agent") {
      alert("Access Denied: Agents cannot manage blog posts.");
      return;
    }

    const postData = {
      title: blogTitle.trim(),
      slug: blogSlug.trim() || blogTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
      category: blogCategory,
      summary: blogSummary.trim(),
      content: blogContent.trim(),
      tags: blogTags.split(",").map((t) => t.trim()).filter(Boolean),
      featured_image: blogImage.trim() || null,
      status: blogStatus,
      author_name: adminName || "Joe Muchiri",
    };

    if (editingBlog) {
      const { error } = await ((supabase as any)
        .from("blog_posts")
        .update(postData)
        .eq("id", editingBlog.id));

      if (error) {
        alert("Error updating blog post: " + error.message);
      } else {
        setEditingBlog(null);
        setCreatingBlog(false);
        loadAllData();
      }
    } else {
      const { error } = await ((supabase as any)
        .from("blog_posts")
        .insert(postData));

      if (error) {
        alert("Error creating blog post: " + error.message);
      } else {
        setCreatingBlog(false);
        loadAllData();
      }
    }
  };

  const handleDeleteBlogPost = async (id: string) => {
    if (adminRole === "agent") {
      alert("Access Denied: Agents cannot delete blog posts.");
      return;
    }

    if (!confirm("Are you sure you want to delete this blog post?")) return;

    const { error } = await supabase
      .from("blog_posts")
      .delete()
      .eq("id", id);

    if (error) {
      alert("Error deleting post: " + error.message);
    } else {
      loadAllData();
    }
  };

  const openCreateBlog = () => {
    setEditingBlog(null);
    setBlogTitle("");
    setBlogSlug("");
    setBlogCategory("Investment");
    setBlogSummary("");
    setBlogContent("");
    setBlogTags("");
    setBlogImage("");
    setBlogStatus("published");
    setCreatingBlog(true);
  };

  const openEditBlog = (post: BlogPost) => {
    setEditingBlog(post);
    setBlogTitle(post.title);
    setBlogSlug(post.slug);
    setBlogCategory(post.category);
    setBlogSummary(post.summary);
    setBlogContent(post.content);
    setBlogTags(post.tags.join(", "));
    setBlogImage(post.featured_image || "");
    setBlogStatus(post.status);
    setCreatingBlog(true);
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

  const activePhase = useMemo(() => {
    return phases.find((p) => p.id === selectedPhaseId);
  }, [phases, selectedPhaseId]);

  useEffect(() => {
    if (activePhase) {
      setEditingPhaseYoutube(activePhase.youtube_video_url || "");
      setPhaseSaveMsg(null);
    }
  }, [activePhase]);

    const handleSaveMediaUrls = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mediaEditingPhaseId) return;
    setMediaSaveLoading(true);
    setMediaSaveMsg(null);

    const { error } = await ((supabase as any)
      .from("phases")
      .update({
        hero_image_urls: mediaHeroImage.trim() ? [mediaHeroImage.trim()] : null,
        diaspora_image_url: mediaDiasporaImage.trim() || null,
        image_url: mediaThumbnail.trim() || null,
        brochure_url: mediaBrochure.trim() || null,
        plot_map_url: mediaPlotMap.trim() || null,
      })
      .eq("id", mediaEditingPhaseId));

    if (error) {
      setMediaSaveMsg("Error saving media URLs: " + error.message);
    } else {
      setMediaSaveMsg("Media URLs saved successfully!");
      loadAllData();
    }
    setMediaSaveLoading(false);
  };

  const handleSavePhaseYoutube = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPhaseId) return;
    setPhaseSaveLoading(true);
    setPhaseSaveMsg(null);

    const { error } = await ((supabase as any)
      .from("phases")
      .update({ youtube_video_url: editingPhaseYoutube.trim() || null })
      .eq("id", selectedPhaseId));

    if (error) {
      setPhaseSaveMsg("Error saving video URL: " + error.message);
    } else {
      setPhaseSaveMsg("YouTube video URL saved successfully!");
      loadAllData();
    }
    setPhaseSaveLoading(false);
  };

  const activePhasePlots = useMemo(() => {
    return plots.filter((p) => p.phase_id === selectedPhaseId);
  }, [plots, selectedPhaseId]);

  // ─── LOADING SCREEN ───────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: NAVY }}>
        <Loader2 className="animate-spin" size={40} style={{ color: GOLD, marginBottom: 16 }} />
        <p style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 600, fontSize: 13, color: "rgba(255,255,255,0.5)", letterSpacing: "0.15em", textTransform: "uppercase" }}>
          Securing Connection...
        </p>
      </div>
    );
  }

  // ─── LOGIN SCREEN (Bypassed) ─────────────────────────────────────────────────────────────
  // Disabled as per user request. Dashboard renders immediately.

  // ─── SIDEBAR NAV ITEMS ────────────────────────────────────────────────────────
  const navGroups = [
    {
      label: "MAIN",
      items: [
        { id: "overview", label: "Home", icon: Home },
        { id: "agents", label: "Agent Performance", icon: BarChart2 },
        { id: "leads", label: "Leads", icon: TrendingUp, count: stats.pendingInquiries },
      ],
    },
    {
      label: "SALES",
      items: [
        { id: "contacts", label: "Contacts", icon: Users },
        { id: "deals", label: "Deals", icon: Briefcase },
        { id: "installments", label: "Installment Tracker", icon: DollarSign },
      ],
    },
    {
      label: "OPERATIONS",
      items: [
        { id: "inquiries", label: "Inquiries Queue", icon: FileText, count: stats.pendingInquiries },
        { id: "bookings", label: "Site Visits", icon: Calendar },
        { id: "meetings", label: "Meetings & Calls", icon: PhoneCall },
        { id: "plots", label: "Plot Inventory", icon: MapPin },
      ],
    },
    {
      label: "CONTENT & ADMIN",
      items: [
        { id: "campaigns", label: "Campaigns & Blog", icon: Megaphone },
        { id: "staff", label: "Staff Accounts", icon: UserCheck },
        { id: "settings", label: "System Settings", icon: Settings },
      ],
    },
  ];

  // ─── FULL DASHBOARD ───────────────────────────────────────────────────────────
  return (
    <div className="bg-background text-on-surface font-body-md overflow-hidden min-h-screen">
      
      {/* ── SIDEBAR ── */}
      <aside className="fixed left-0 top-0 h-full w-[280px] bg-primary-container text-on-primary-fixed flex flex-col py-6 border-r border-outline-variant z-50">
        
        {/* Logo Area */}
        <div className="px-6 mb-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-secondary-container flex items-center justify-center">
            <Shield size={20} className="text-on-secondary-container" />
          </div>
          <div>
            <h1 className="font-headline-md text-headline-md font-bold text-on-primary tracking-tight">Gatepath Realtors</h1>
            <p className="text-[10px] uppercase tracking-widest text-on-primary-container opacity-70">CRM Dashboard</p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1 overflow-y-auto scrollbar-hide px-2">
          {navGroups.map((group) => (
            <div key={group.label} className="mb-4">
              <div className="text-[10px] font-bold text-on-primary-container opacity-50 tracking-widest uppercase px-4 py-2">
                {group.label}
              </div>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as Tab)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg mx-2 transition-all duration-200 ${
                      isActive 
                        ? "text-secondary-fixed bg-on-primary-fixed-variant active-glow" 
                        : "text-on-primary-container hover:text-on-primary hover:bg-primary-fixed-dim/10"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={18} className={isActive ? "" : "opacity-80"} />
                      <span className="font-label-md text-label-md">{item.label}</span>
                    </div>
                    {(item as any).count > 0 && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isActive ? "bg-white/20 text-white" : "bg-error text-white"
                      }`}>
                        {(item as any).count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Bottom CTA */}
        <div className="mt-auto px-6 space-y-4 pt-4">
          <button 
            onClick={() => setActiveTab("leads")}
            className="w-full bg-secondary-container text-on-secondary-container font-label-md text-label-md py-3 rounded-lg flex items-center justify-center gap-2 hover:opacity-90 transition-all"
          >
            <Plus size={18} />
            Add New Lead
          </button>
          
          <div className="pt-6 border-t border-on-primary-fixed-variant space-y-2">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-2 py-2 text-on-primary-container hover:text-on-primary transition-colors text-left"
            >
              <LogOut size={16} />
              <span className="text-label-md">Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className="ml-[280px] h-screen flex flex-col">
        
        {/* Top Bar */}
        <header className="h-16 px-gutter flex justify-between items-center bg-surface border-b border-outline-variant shrink-0 z-40">
          <div className="flex items-center w-1/3">
            <div className="relative w-full max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
              <input 
                type="text"
                placeholder="Search plots, clients, or agents..."
                className="w-full pl-10 pr-4 py-2 bg-surface-container-low border border-outline-variant rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary outline-none transition-all text-body-md"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <button 
              onClick={loadAllData}
              className="p-2 text-on-surface-variant hover:bg-surface-container-low rounded-full transition-all"
            >
              <RefreshCw size={18} className={dataLoading ? "animate-spin" : ""} />
            </button>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="font-label-md text-label-md text-primary">{adminName || "Staff"}</p>
                <p className="text-[10px] text-on-surface-variant uppercase">{adminRole || "Admin"}</p>
              </div>
              <div className="w-10 h-10 rounded-full border border-outline-variant bg-secondary-container flex items-center justify-center overflow-hidden">
                <span className="font-headline-md text-sm text-on-secondary-container">{getInitials(adminName || "SA")}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Content Wrapper */}
        <div className="flex-1 overflow-y-auto p-gutter space-y-6 bg-background">
          
          {/* ══════════════════════════════════════════════
              TAB: OVERVIEW (Home Dashboard)
          ══════════════════════════════════════════════ */}
          {activeTab === "overview" && (
            <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="font-headline-md text-headline-md text-primary font-bold">Dashboard</h1>
                  <p className="text-body-md text-on-surface-variant">Real-time operations overview — Gatepath Realtors CRM</p>
                </div>
              </div>

              {/* Row 1: Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Total Sales Revenue */}
                <div className="luxury-card p-5 rounded-xl relative overflow-hidden">
                  <div className="gradient-line absolute top-0 left-0 w-full"></div>
                  <p className="text-label-md text-on-surface-variant mb-2">Total Sales Revenue</p>
                  <div className="flex items-end justify-between">
                    <h3 className="font-stat-lg text-stat-lg text-primary">Ksh {stats.totalRev.toLocaleString()}</h3>
                  </div>
                  <p className="text-[10px] text-on-surface-variant mt-2">Confirmed payments</p>
                </div>
                
                {/* Pending Inquiries */}
                <div className="luxury-card p-5 rounded-xl">
                  <p className="text-label-md text-on-surface-variant mb-2">Pending Inquiries</p>
                  <div className="flex items-end justify-between">
                    <h3 className="font-stat-lg text-stat-lg text-primary">{stats.pendingInquiries}</h3>
                    <div className="text-right">
                      <p className="text-[12px] font-semibold text-secondary">Awaiting Review</p>
                    </div>
                  </div>
                </div>

                {/* Signed Agreements */}
                <div className="luxury-card p-5 rounded-xl">
                  <p className="text-label-md text-on-surface-variant mb-2">Signed Agreements</p>
                  <div className="flex items-end justify-between">
                    <h3 className="font-stat-lg text-stat-lg text-primary">{stats.signedAgreements}</h3>
                    <div className="text-right">
                      <p className="text-[12px] font-semibold text-secondary">CEO e-signed</p>
                    </div>
                  </div>
                </div>

                {/* Site Visits Done */}
                <div className="luxury-card p-5 rounded-xl">
                  <p className="text-label-md text-on-surface-variant mb-2">Site Visits Completed</p>
                  <div className="flex items-end justify-between">
                    <h3 className="font-stat-lg text-stat-lg text-primary">{stats.completedBookings}</h3>
                  </div>
                </div>

              </div>

              {/* Row 2: 65/35 Split (Agent Accountability & Plot Map / Recent Leads) */}
              <div className="flex flex-col lg:flex-row gap-6">
                
                {/* Left: Plot Inventory Status (Taking place of Agent Tracker for now) */}
                <div className="lg:w-[65%] luxury-card rounded-xl flex flex-col">
                  <div className="p-6 border-b border-outline-variant flex justify-between items-center">
                    <h2 className="font-headline-md text-headline-md text-primary font-bold">Global Plot Inventory</h2>
                    <button onClick={() => setActiveTab("plots")} className="px-4 py-2 border border-secondary text-secondary font-label-md text-label-md rounded-lg hover:bg-secondary-fixed transition-colors">
                      Manage Inventory
                    </button>
                  </div>
                  <div className="p-6 grid grid-cols-3 gap-4">
                    {[
                      { label: "Available", count: stats.availablePlots, color: "text-green-700", bg: "bg-green-50", border: "border-green-200" },
                      { label: "Booked", count: stats.bookedPlots, color: "text-yellow-700", bg: "bg-yellow-50", border: "border-yellow-200" },
                      { label: "Sold", count: stats.soldPlots, color: "text-red-700", bg: "bg-red-50", border: "border-red-200" },
                    ].map(row => (
                      <div key={row.label} className={`${row.bg} ${row.border} border rounded-lg p-5 flex flex-col justify-between`}>
                        <span className={`font-label-md text-[13px] ${row.color} uppercase tracking-wider mb-2`}>{row.label} Plots</span>
                        <span className={`font-stat-lg text-[32px] ${row.color}`}>{row.count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right: Recent Inquiries */}
                <div className="lg:w-[35%] luxury-card rounded-xl flex flex-col">
                  <div className="p-6 border-b border-outline-variant flex justify-between items-center">
                    <h2 className="font-headline-md text-headline-md text-primary font-bold">Recent Inquiries</h2>
                    <button onClick={() => setActiveTab("inquiries")} className="text-[12px] text-secondary font-label-md hover:underline">
                      View All
                    </button>
                  </div>
                  <div className="flex-1 p-6 space-y-3">
                    {inquiries.slice(0, 4).map(inq => (
                      <div key={inq.id} className="flex items-center gap-3 p-3 rounded-lg border border-outline-variant hover:bg-surface-container-low cursor-pointer transition-colors" onClick={() => { setActiveTab("inquiries"); setTimeout(() => setSelectedInquiry(inq), 100); }}>
                        <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center text-primary-deep font-bold text-sm">
                          {getInitials(inq.client_full_name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-label-md text-[13px] text-primary truncate">{inq.client_full_name}</p>
                          <p className="text-[11px] text-on-surface-variant truncate">{inq.phase_name || "Any Phase"}</p>
                        </div>
                        <span className={`text-[9px] font-bold uppercase px-2 py-1 rounded ${inq.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                          {inq.status}
                        </span>
                      </div>
                    ))}
                    {inquiries.length === 0 && (
                      <div className="text-center text-on-surface-variant text-[13px] py-4">No recent inquiries</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════
              TAB: INQUIRIES QUEUE
          ══════════════════════════════════════════════ */}
          {activeTab === "inquiries" && (
            <div style={{ animation: "fadeIn 0.3s ease" }}>
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                <div>
                  <h1 style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 24, color: NAVY, margin: 0 }}>Inquiries Queue</h1>
                  <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#6B7280", marginTop: 4 }}>
                    Review, approve and manage all incoming buyer inquiries.
                  </p>
                </div>
              </div>

              <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${CARD_BORDER}`, boxShadow: "0 2px 12px rgba(12,26,48,0.05)", overflow: "hidden" }}>
                {/* Search & Filter Bar */}
                <div style={{ padding: "18px 24px", borderBottom: `1px solid ${CARD_BORDER}`, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ position: "relative", flex: 1, minWidth: 240 }}>
                    <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9CA3AF" }} />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by client name, email, or phase..."
                      style={{
                        width: "100%",
                        padding: "9px 12px 9px 34px",
                        border: `1px solid ${CARD_BORDER}`,
                        borderRadius: 9,
                        fontFamily: "Inter, sans-serif",
                        fontSize: 13,
                        color: NAVY,
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {["all", "pending", "approved", "rejected"].map((f) => (
                      <button
                        key={f}
                        onClick={() => setStatusFilter(f)}
                        style={{
                          padding: "8px 16px",
                          borderRadius: 8,
                          border: `1px solid ${statusFilter === f ? GOLD : CARD_BORDER}`,
                          background: statusFilter === f ? GOLD : "#fff",
                          color: statusFilter === f ? "#fff" : "#374151",
                          fontFamily: "Inter, sans-serif",
                          fontWeight: 600,
                          fontSize: 12,
                          cursor: "pointer",
                          textTransform: "capitalize",
                          transition: "all 0.15s",
                        }}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Table */}
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "Inter, sans-serif" }}>
                    <thead>
                      <tr style={{ background: "#F9FAFB", borderBottom: `1px solid ${CARD_BORDER}` }}>
                        {["Client", "Target Plot", "Email", "Payment Terms", "Status", "Actions"].map((h) => (
                          <th key={h} style={{
                            padding: "12px 20px",
                            textAlign: "left",
                            fontFamily: "Inter, sans-serif",
                            fontSize: 11,
                            fontWeight: 700,
                            color: "#6B7280",
                            textTransform: "uppercase",
                            letterSpacing: "0.09em",
                            whiteSpace: "nowrap",
                          }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInquiries.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ padding: "48px 20px", textAlign: "center", color: "#9CA3AF", fontFamily: "Inter, sans-serif", fontSize: 13 }}>
                            No inquiries match your filters.
                          </td>
                        </tr>
                      ) : (
                        filteredInquiries.map((inq, idx) => {
                          const colorIdx = inq.client_full_name.charCodeAt(0) % avatarColors.length;
                          const statusMap: Record<string, { bg: string; color: string }> = {
                            pending: { bg: "#FEF3C7", color: "#D97706" },
                            approved: { bg: "#D1FAE5", color: "#059669" },
                            rejected: { bg: "#FEE2E2", color: "#DC2626" },
                            reviewed: { bg: "#DBEAFE", color: "#2563EB" },
                          };
                          const sc = statusMap[inq.status] ?? { bg: "#F3F4F6", color: "#6B7280" };
                          return (
                            <tr
                              key={inq.id}
                              style={{
                                borderBottom: idx < filteredInquiries.length - 1 ? `1px solid ${CARD_BORDER}` : "none",
                                transition: "background 0.12s",
                              }}
                              onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "#F9FAFB"; }}
                              onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "transparent"; }}
                            >
                              <td style={{ padding: "14px 20px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                  <div style={{
                                    width: 32, height: 32,
                                    borderRadius: "50%",
                                    background: avatarColors[colorIdx],
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    fontFamily: "Montserrat, sans-serif",
                                    fontWeight: 700, fontSize: 11, color: "#fff", flexShrink: 0,
                                  }}>
                                    {getInitials(inq.client_full_name)}
                                  </div>
                                  <div>
                                    <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13, color: NAVY }}>{inq.client_full_name}</div>
                                    <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "#9CA3AF", marginTop: 1 }}>{inq.client_phone}</div>
                                  </div>
                                </div>
                              </td>
                              <td style={{ padding: "14px 20px", fontFamily: "Inter, sans-serif", fontSize: 13, color: "#374151" }}>
                                {inq.phase_name || "Any Plot"} {inq.plot_number_ref ? `#${inq.plot_number_ref}` : ""}
                              </td>
                              <td style={{ padding: "14px 20px", fontFamily: "Inter, sans-serif", fontSize: 13, color: "#374151" }}>{inq.client_email}</td>
                              <td style={{ padding: "14px 20px" }}>
                                <span style={{
                                  fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600,
                                  color: GOLD, background: `${GOLD}18`,
                                  padding: "3px 10px", borderRadius: 6, textTransform: "capitalize",
                                }}>
                                  {inq.terms_of_payment || "Not Selected"}
                                </span>
                              </td>
                              <td style={{ padding: "14px 20px" }}>
                                <span style={{
                                  fontFamily: "Inter, sans-serif", fontSize: 10, fontWeight: 700,
                                  textTransform: "uppercase", letterSpacing: "0.07em",
                                  padding: "4px 10px", borderRadius: 20,
                                  background: sc.bg, color: sc.color,
                                }}>
                                  {inq.status}
                                </span>
                              </td>
                              <td style={{ padding: "14px 20px", textAlign: "right" }}>
                                <button
                                  onClick={() => setSelectedInquiry(inq)}
                                  style={{
                                    fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600,
                                    color: "#2563EB", background: "none", border: "none", cursor: "pointer",
                                    textDecoration: "underline",
                                  }}
                                >
                                  Review & Sign
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════
              TAB: BOOKINGS & SITE VISITS
          ══════════════════════════════════════════════ */}
          {activeTab === "bookings" && (
            <div style={{ animation: "fadeIn 0.3s ease" }}>
              <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 24, color: NAVY, margin: 0 }}>Site Visit Bookings</h1>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#6B7280", marginTop: 4 }}>Manage and confirm scheduled site visits and virtual tours.</p>
              </div>

              <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${CARD_BORDER}`, boxShadow: "0 2px 12px rgba(12,26,48,0.05)", overflow: "hidden" }}>
                <div style={{ padding: "18px 24px", borderBottom: `1px solid ${CARD_BORDER}` }}>
                  <h3 style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 600, fontSize: 16, color: NAVY, margin: 0 }}>Active Bookings Queue</h3>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "#F9FAFB", borderBottom: `1px solid ${CARD_BORDER}` }}>
                        {["Scheduled Date", "Visit Type", "Attendees", "Notes", "Status", "Actions"].map((h) => (
                          <th key={h} style={{ padding: "12px 20px", textAlign: "left", fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.09em" }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ padding: "48px 20px", textAlign: "center", color: "#9CA3AF", fontFamily: "Inter, sans-serif", fontSize: 13 }}>
                            No bookings scheduled.
                          </td>
                        </tr>
                      ) : (
                        bookings.map((booking, idx) => {
                          const visitBadge = booking.visit_type === "virtual"
                            ? { bg: "#EDE9FE", color: "#7C3AED" }
                            : { bg: "#DBEAFE", color: "#2563EB" };
                          const statusMap: Record<string, { bg: string; color: string }> = {
                            pending: { bg: "#FEF3C7", color: "#D97706" },
                            confirmed: { bg: "#DBEAFE", color: "#2563EB" },
                            completed: { bg: "#D1FAE5", color: "#059669" },
                            cancelled: { bg: "#FEE2E2", color: "#DC2626" },
                          };
                          const sc = statusMap[booking.status] ?? { bg: "#F3F4F6", color: "#6B7280" };
                          return (
                            <tr
                              key={booking.id}
                              style={{ borderBottom: idx < bookings.length - 1 ? `1px solid ${CARD_BORDER}` : "none" }}
                              onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "#F9FAFB"; }}
                              onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "transparent"; }}
                            >
                              <td style={{ padding: "14px 20px", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: NAVY }}>
                                {booking.visit_date} <span style={{ fontWeight: 400, color: "#6B7280" }}>({booking.visit_time})</span>
                              </td>
                              <td style={{ padding: "14px 20px" }}>
                                <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, textTransform: "capitalize", background: visitBadge.bg, color: visitBadge.color }}>
                                  {booking.visit_type}
                                </span>
                              </td>
                              <td style={{ padding: "14px 20px", fontFamily: "Inter, sans-serif", fontSize: 13, color: "#374151" }}>{booking.attendees}</td>
                              <td style={{ padding: "14px 20px", fontFamily: "Inter, sans-serif", fontSize: 12, color: "#6B7280", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {booking.visit_notes || "—"}
                              </td>
                              <td style={{ padding: "14px 20px" }}>
                                <span style={{ fontFamily: "Inter, sans-serif", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", padding: "4px 10px", borderRadius: 20, background: sc.bg, color: sc.color }}>
                                  {booking.status}
                                </span>
                              </td>
                              <td style={{ padding: "14px 20px" }}>
                                <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                                  {booking.status === "pending" && (
                                    <button
                                      onClick={() => handleUpdateBookingStatus(booking.id, "confirmed")}
                                      title="Confirm Visit"
                                      style={{ padding: "6px", background: "#DBEAFE", border: "none", borderRadius: 7, cursor: "pointer", color: "#2563EB" }}
                                    >
                                      <Check size={14} />
                                    </button>
                                  )}
                                  {booking.status !== "completed" && booking.status !== "cancelled" && (
                                    <>
                                      <button
                                        onClick={() => handleUpdateBookingStatus(booking.id, "completed")}
                                        title="Mark Completed"
                                        style={{ padding: "6px", background: "#D1FAE5", border: "none", borderRadius: 7, cursor: "pointer", color: "#059669" }}
                                      >
                                        <CheckCircle size={14} />
                                      </button>
                                      <button
                                        onClick={() => handleUpdateBookingStatus(booking.id, "cancelled")}
                                        title="Cancel"
                                        style={{ padding: "6px", background: "#FEE2E2", border: "none", borderRadius: 7, cursor: "pointer", color: "#DC2626" }}
                                      >
                                        <X size={14} />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════
              TAB: STAFF & ROLES
          ══════════════════════════════════════════════ */}
          {activeTab === "staff" && (
            <div style={{ animation: "fadeIn 0.3s ease" }}>
              <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 24, color: NAVY, margin: 0 }}>Staff Accounts</h1>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#6B7280", marginTop: 4 }}>Manage operations team members and role assignments.</p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 20 }}>
                {/* Staff List */}
                <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${CARD_BORDER}`, boxShadow: "0 2px 12px rgba(12,26,48,0.05)", padding: "24px" }}>
                  <h3 style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 600, fontSize: 17, color: NAVY, marginBottom: 20, marginTop: 0 }}>
                    Active Operations Team
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {staff.length === 0 ? (
                      <div style={{ textAlign: "center", padding: "32px 0", color: "#9CA3AF", fontFamily: "Inter, sans-serif", fontSize: 13 }}>
                        No staff profiles yet.
                      </div>
                    ) : staff.map((member) => {
                      const colorIdx = (member.full_name || "").charCodeAt(0) % avatarColors.length;
                      const roleColors: Record<string, { bg: string; color: string }> = {
                        ceo: { bg: `${GOLD}20`, color: GOLD },
                        manager: { bg: "#DBEAFE", color: "#2563EB" },
                        agent: { bg: "#D1FAE5", color: "#059669" },
                      };
                      const rc = roleColors[member.role] ?? { bg: "#F3F4F6", color: "#6B7280" };
                      return (
                        <div key={member.id} style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          padding: "14px 16px",
                          background: "#FAFAFA",
                          border: `1px solid ${CARD_BORDER}`,
                          borderRadius: 10,
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{
                              width: 40, height: 40,
                              background: avatarColors[colorIdx],
                              borderRadius: "50%",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontFamily: "Montserrat, sans-serif",
                              fontWeight: 700, fontSize: 13, color: "#fff",
                            }}>
                              {getInitials(member.full_name || "S")}
                            </div>
                            <div>
                              <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 14, color: NAVY }}>{member.full_name}</div>
                              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>{member.email}</div>
                            </div>
                          </div>
                          <span style={{
                            fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 700,
                            textTransform: "uppercase", letterSpacing: "0.08em",
                            padding: "4px 12px", borderRadius: 20,
                            background: rc.bg, color: rc.color,
                          }}>
                            {member.role}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Add Staff Form */}
                <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${CARD_BORDER}`, boxShadow: "0 2px 12px rgba(12,26,48,0.05)", padding: "24px", alignSelf: "start" }}>
                  <h3 style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 600, fontSize: 17, color: NAVY, marginBottom: 18, marginTop: 0 }}>
                    Add Staff Profile
                  </h3>

                  {staffMsg && (
                    <div style={{
                      marginBottom: 16,
                      padding: "10px 14px",
                      background: staffMsg.includes("Error") ? "#FEE2E2" : "#D1FAE5",
                      border: `1px solid ${staffMsg.includes("Error") ? "#FECACA" : "#A7F3D0"}`,
                      borderRadius: 8,
                      fontFamily: "Inter, sans-serif", fontSize: 13,
                      color: staffMsg.includes("Error") ? "#DC2626" : "#059669",
                    }}>
                      {staffMsg}
                    </div>
                  )}

                  <form onSubmit={handleAddStaff} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {[
                      { label: "Full Name", value: newStaffName, setter: setNewStaffName, type: "text", placeholder: "Joe Wambua" },
                      { label: "Email Address", value: newStaffEmail, setter: setNewStaffEmail, type: "email", placeholder: "wambua@gatepathrealtors.com" },
                    ].map((field) => (
                      <div key={field.label}>
                        <label style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600, color: "#6B7280", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.09em" }}>
                          {field.label}
                        </label>
                        <input
                          type={field.type}
                          required
                          value={field.value}
                          onChange={(e) => field.setter(e.target.value)}
                          placeholder={field.placeholder}
                          style={{ width: "100%", padding: "10px 12px", border: `1px solid ${CARD_BORDER}`, borderRadius: 8, fontFamily: "Inter, sans-serif", fontSize: 13, color: NAVY, outline: "none", boxSizing: "border-box" }}
                        />
                      </div>
                    ))}
                    <div>
                      <label style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600, color: "#6B7280", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.09em" }}>
                        Assigned Role
                      </label>
                      <select
                        value={newStaffRole}
                        onChange={(e) => setNewStaffRole(e.target.value as any)}
                        style={{ width: "100%", padding: "10px 12px", border: `1px solid ${CARD_BORDER}`, borderRadius: 8, fontFamily: "Inter, sans-serif", fontSize: 13, background: "#fff", color: NAVY, outline: "none" }}
                      >
                        <option value="agent">Agent (View inquiries/bookings)</option>
                        <option value="manager">Manager (Approve/adjust plots)</option>
                        <option value="ceo">CEO (Joe Muchiri — E-Signatures)</option>
                      </select>
                    </div>
                    <button
                      type="submit"
                      style={{
                        marginTop: 4,
                        padding: "12px",
                        background: GOLD,
                        border: "none",
                        borderRadius: 9,
                        color: "#fff",
                        fontFamily: "Montserrat, sans-serif",
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: "pointer",
                        letterSpacing: "0.03em",
                      }}
                    >
                      Create Staff Profile
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════
              TAB: PLOT STATUS CONTROL
          ══════════════════════════════════════════════ */}
          {activeTab === "plots" && (
            <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              
              {/* ── CONDITIONAL SUB-VIEW: PROPERTY DETAILS DEEP-DIVE ── */}
              {selectedPlotDetail ? (
                <div className="space-y-6">
                  {/* Header Actions */}
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-4 border-b border-outline-variant/30">
                    <div>
                      <nav className="flex items-center gap-2 text-on-surface-variant text-[11px] uppercase tracking-widest font-bold mb-2">
                        <button onClick={() => setSelectedPlotDetail(null)} className="hover:text-secondary flex items-center gap-1">
                          <ChevronRight size={12} className="rotate-180" /> Inventory
                        </button>
                        <span>/</span>
                        <span className="text-secondary">Plot Details</span>
                      </nav>
                      <h2 className="font-headline-lg text-headline-lg text-primary-container font-bold">
                        Plot #{selectedPlotDetail.plot_number} — {phases.find(p => p.id === selectedPlotDetail.phase_id)?.name || "Phase View"}
                      </h2>
                      <div className="flex items-center gap-3 mt-1 text-xs">
                        <span className="flex items-center gap-1 text-secondary font-bold">
                          <MapPin size={14} /> Kenya Project Site
                        </span>
                        <span className="text-on-surface-variant">•</span>
                        <span className="text-on-surface-variant font-medium">Ref ID: GP-PLOT-{selectedPlotDetail.plot_number}</span>
                        <span className={`px-3 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider ${
                          selectedPlotDetail.status === 'available' ? 'bg-green-100 text-green-800' :
                          selectedPlotDetail.status === 'booked' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {selectedPlotDetail.status}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => {
                          setEditingPlot(selectedPlotDetail);
                          setNewPlotStatus(selectedPlotDetail.status);
                        }}
                        className="px-6 py-3 bg-secondary-container text-on-secondary-container font-bold rounded-xl hover:opacity-90 transition-all flex items-center gap-2"
                      >
                        <PenTool size={16} /> Update Status
                      </button>
                      <button 
                        onClick={() => setSelectedPlotDetail(null)}
                        className="px-6 py-3 border border-outline-variant text-on-surface-variant font-bold rounded-xl hover:bg-surface-container-low transition-all"
                      >
                        Back to Inventory
                      </button>
                    </div>
                  </div>

                  {/* Property Details Layout (Bento Cards & Media) */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Left Column: Media & Overview */}
                    <div className="lg:col-span-2 space-y-6">
                      <div className="luxury-card rounded-2xl overflow-hidden p-2 bg-white">
                        <div className="h-[360px] relative rounded-xl overflow-hidden bg-primary-container/10 flex items-center justify-center">
                          {phases.find(p => p.id === selectedPlotDetail.phase_id)?.plot_map_url ? (
                            <img 
                              src={phases.find(p => p.id === selectedPlotDetail.phase_id)?.plot_map_url!} 
                              alt="Plot Map" 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="text-center p-8 text-on-surface-variant">
                              <MapPin size={48} className="mx-auto mb-3 opacity-40 text-secondary" />
                              <p className="font-headline-md text-headline-md font-bold text-primary">Plot #{selectedPlotDetail.plot_number}</p>
                              <p className="text-xs mt-1">High-Precision Boundary Map & Masterplan View</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Bento Cards */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="luxury-card p-5 rounded-xl bg-white">
                          <p className="text-label-md text-on-surface-variant mb-1">Asking Price</p>
                          <h3 className="font-stat-lg text-stat-lg text-secondary">
                            {selectedPlotDetail.plot_sizes?.cash_price ? `Ksh ${selectedPlotDetail.plot_sizes.cash_price.toLocaleString()}` : "Ksh 1,500,000"}
                          </h3>
                          <p className="text-[11px] text-on-surface-variant mt-1">Standard Payment Plan Available</p>
                        </div>
                        <div className="luxury-card p-5 rounded-xl bg-white">
                          <p className="text-label-md text-on-surface-variant mb-1">Plot Dimensions</p>
                          <h3 className="font-stat-lg text-stat-lg text-primary">50 x 100 ft</h3>
                          <p className="text-[11px] text-on-surface-variant mt-1">1/8 Acre Standard</p>
                        </div>
                        <div className="luxury-card p-5 rounded-xl bg-white">
                          <p className="text-label-md text-on-surface-variant mb-1">Zoning & Utility</p>
                          <h3 className="font-stat-lg text-stat-lg text-primary">Residential</h3>
                          <p className="text-[11px] text-on-surface-variant mt-1">Water & Electricity On-Site</p>
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Phase Context & Quick Action */}
                    <div className="space-y-6">
                      <div className="luxury-card p-6 rounded-2xl bg-white space-y-4">
                        <h3 className="font-headline-md text-headline-md text-primary font-bold">Project Summary</h3>
                        <div className="space-y-3 text-sm divide-y divide-outline-variant/20">
                          <div className="pt-2 flex justify-between">
                            <span className="text-on-surface-variant">Project Name</span>
                            <span className="font-semibold">{phases.find(p => p.id === selectedPlotDetail.phase_id)?.name || "Phase"}</span>
                          </div>
                          <div className="pt-2 flex justify-between">
                            <span className="text-on-surface-variant">Phase Number</span>
                            <span className="font-semibold">Phase {phases.find(p => p.id === selectedPlotDetail.phase_id)?.phase_number || 1}</span>
                          </div>
                          <div className="pt-2 flex justify-between">
                            <span className="text-on-surface-variant">Current Status</span>
                            <span className="font-bold capitalize">{selectedPlotDetail.status}</span>
                          </div>
                        </div>

                        <div className="pt-4 space-y-2">
                          <button 
                            onClick={() => {
                              if (adminRole === "agent") {
                                alert("Access Denied: Agents cannot manually modify plot statuses.");
                                return;
                              }
                              setEditingPlot(selectedPlotDetail);
                              setNewPlotStatus(selectedPlotDetail.status);
                            }}
                            className="w-full py-3 bg-secondary-container text-on-secondary-container font-label-md rounded-xl hover:opacity-90 transition-all text-center block font-bold"
                          >
                            Override Status
                          </button>
                        </div>
                      </div>

                      {/* YouTube Walkthrough config */}
                      <div className="luxury-card p-6 rounded-2xl bg-white space-y-3">
                        <h4 className="font-headline-md text-sm text-primary font-bold">Project Walkthrough Video</h4>
                        <p className="text-xs text-on-surface-variant">Set or update the video tour link for this phase.</p>
                        <form onSubmit={handleSavePhaseYoutube} className="space-y-3">
                          <input
                            type="url"
                            value={editingPhaseYoutube}
                            onChange={(e) => setEditingPhaseYoutube(e.target.value)}
                            placeholder="https://www.youtube.com/watch?v=..."
                            className="w-full p-2.5 bg-surface-container-low border border-outline-variant/30 rounded-lg text-xs outline-none"
                          />
                          <button
                            type="submit"
                            disabled={phaseSaveLoading}
                            className="w-full py-2 bg-primary text-white font-label-md text-xs rounded-lg hover:opacity-90"
                          >
                            {phaseSaveLoading ? "Saving..." : "Save Walkthrough URL"}
                          </button>
                        </form>
                      </div>
                    </div>

                  </div>
                </div>
              ) : (
                /* ── MAIN LAND INVENTORY OVERVIEW ── */
                <div className="space-y-6">
                  {/* Top Bar Header & Stat */}
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                      <h1 className="font-headline-lg text-headline-lg text-primary font-bold">Land Inventory</h1>
                      <p className="text-body-md text-on-surface-variant">Manage masterplan plot inventory, statuses, and phase overrides</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="bg-white border border-outline-variant/30 rounded-xl px-5 py-3 flex items-center gap-4 shadow-sm">
                        <div className="w-10 h-10 bg-secondary/10 rounded-lg flex items-center justify-center text-secondary">
                          <Layers size={20} />
                        </div>
                        <div>
                          <p className="text-[10px] text-on-surface-variant uppercase font-bold">Total Plots Tracked</p>
                          <p className="font-stat-lg text-stat-lg text-primary">{plots.length}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Filters Section */}
                  <div className="luxury-card rounded-xl p-5 shadow-sm space-y-4 bg-white">
                    <div className="flex flex-wrap items-center gap-4">
                      
                      {/* Project/Phase Selector */}
                      <div className="flex-1 min-w-[200px]">
                        <label className="block text-[11px] font-bold text-on-surface-variant uppercase mb-1">Select Project / Phase</label>
                        <select 
                          value={selectedPhaseId}
                          onChange={(e) => setSelectedPhaseId(e.target.value)}
                          className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg text-body-md py-2.5 px-3 outline-none"
                        >
                          {phases.map((p) => (
                            <option key={p.id} value={p.id}>{p.name} (Phase {p.phase_number ?? "N/A"})</option>
                          ))}
                        </select>
                      </div>

                      {/* Status Filter */}
                      <div className="flex-1 min-w-[160px]">
                        <label className="block text-[11px] font-bold text-on-surface-variant uppercase mb-1">Plot Status</label>
                        <select 
                          value={inventoryStatusFilter}
                          onChange={(e: any) => setInventoryStatusFilter(e.target.value)}
                          className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg text-body-md py-2.5 px-3 outline-none"
                        >
                          <option value="all">All Statuses</option>
                          <option value="available">Available</option>
                          <option value="booked">Booked</option>
                          <option value="sold">Sold</option>
                        </select>
                      </div>

                      {/* View Mode Toggle */}
                      <div className="flex items-end gap-2 pt-5">
                        <button
                          onClick={() => setInventoryViewMode("table")}
                          className={`py-2.5 px-4 rounded-lg font-label-md text-xs transition-colors ${
                            inventoryViewMode === "table" ? "bg-primary text-white" : "bg-surface-container-high text-on-surface"
                          }`}
                        >
                          Table View
                        </button>
                        <button
                          onClick={() => setInventoryViewMode("grid")}
                          className={`py-2.5 px-4 rounded-lg font-label-md text-xs transition-colors ${
                            inventoryViewMode === "grid" ? "bg-primary text-white" : "bg-surface-container-high text-on-surface"
                          }`}
                        >
                          Grid Map
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Content: Table View vs Grid View */}
                  {inventoryViewMode === "table" ? (
                    <div className="luxury-card rounded-xl shadow-sm overflow-hidden bg-white">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead className="bg-surface-container-low border-b border-outline-variant/30">
                            <tr>
                              <th className="px-6 py-4 font-label-md text-on-surface-variant uppercase text-[11px]">Plot Number</th>
                              <th className="px-6 py-4 font-label-md text-on-surface-variant uppercase text-[11px]">Project Phase</th>
                              <th className="px-6 py-4 font-label-md text-on-surface-variant uppercase text-[11px]">Dimensions</th>
                              <th className="px-6 py-4 font-label-md text-on-surface-variant uppercase text-[11px]">Status</th>
                              <th className="px-6 py-4 font-label-md text-on-surface-variant uppercase text-[11px]">Price</th>
                              <th className="px-6 py-4 font-label-md text-on-surface-variant uppercase text-[11px] text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-outline-variant/10">
                            {activePhasePlots
                              .filter(p => inventoryStatusFilter === "all" || p.status === inventoryStatusFilter)
                              .map((plot) => (
                                <tr key={plot.id} className="hover:bg-surface-container-low/50 transition-colors">
                                  <td className="px-6 py-4 font-bold text-primary">
                                    GP-PLOT-#{plot.plot_number}
                                  </td>
                                  <td className="px-6 py-4 text-body-md text-on-surface">
                                    {phases.find(p => p.id === plot.phase_id)?.name || "Current Phase"}
                                  </td>
                                  <td className="px-6 py-4 text-body-md text-on-surface-variant">
                                    50 x 100 ft
                                  </td>
                                  <td className="px-6 py-4">
                                    <span className={`px-3 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider ${
                                      plot.status === 'available' ? 'bg-green-100 text-green-800' :
                                      plot.status === 'booked' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                                    }`}>
                                      {plot.status}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 font-semibold text-secondary">
                                    {plot.plot_sizes?.cash_price ? `Ksh ${plot.plot_sizes.cash_price.toLocaleString()}` : "Ksh 1,500,000"}
                                  </td>
                                  <td className="px-6 py-4 text-right space-x-2">
                                    <button 
                                      onClick={() => setSelectedPlotDetail(plot)}
                                      className="px-3 py-1.5 bg-surface-container-high text-primary font-label-md text-xs rounded-lg hover:bg-primary hover:text-white transition-all font-semibold"
                                    >
                                      Deep Dive
                                    </button>
                                    <button 
                                      onClick={() => {
                                        if (adminRole === "agent") {
                                          alert("Access Denied: Agents cannot manually modify plot statuses.");
                                          return;
                                        }
                                        setEditingPlot(plot);
                                        setNewPlotStatus(plot.status);
                                      }}
                                      className="px-3 py-1.5 border border-outline-variant text-on-surface-variant font-label-md text-xs rounded-lg hover:bg-surface-container-low transition-all"
                                    >
                                      Edit Status
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            {activePhasePlots.length === 0 && (
                              <tr>
                                <td colSpan={6} className="text-center py-8 text-on-surface-variant">
                                  No plots found for this phase.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    /* Grid View */
                    <div className="luxury-card rounded-xl p-6 bg-white space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-headline-md text-headline-md text-primary font-bold">Interactive Plot Map Grid</h3>
                        <div className="flex items-center gap-4 text-xs">
                          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500"></span> Available</span>
                          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-yellow-500"></span> Booked</span>
                          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500"></span> Sold</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3 pt-2">
                        {activePhasePlots
                          .filter(p => inventoryStatusFilter === "all" || p.status === inventoryStatusFilter)
                          .map((plot) => {
                            const bg = plot.status === 'available' ? 'bg-green-100 border-green-300 text-green-800' :
                                       plot.status === 'booked' ? 'bg-yellow-100 border-yellow-300 text-yellow-800' :
                                       'bg-red-100 border-red-300 text-red-800';
                            return (
                              <button
                                key={plot.id}
                                onClick={() => setSelectedPlotDetail(plot)}
                                className={`p-3 rounded-xl border flex flex-col items-center justify-center hover:scale-105 transition-all shadow-sm ${bg}`}
                              >
                                <span className="text-[10px] font-bold opacity-70">PLOT</span>
                                <span className="font-stat-lg text-lg font-bold">#{plot.plot_number}</span>
                                <span className="text-[9px] uppercase font-bold mt-1 opacity-80">{plot.status}</span>
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {/* YouTube Walkthrough URL Config */}
                  <div className="luxury-card p-6 rounded-xl bg-white space-y-3">
                    <h4 className="font-headline-md text-sm text-primary font-bold">Configure Project Media Walkthrough</h4>
                    <p className="text-xs text-on-surface-variant">Set the YouTube video walkthrough URL for the selected project phase.</p>
                    {phaseSaveMsg && (
                      <div className={`p-3 rounded-lg text-xs font-semibold ${
                        phaseSaveMsg.includes("Error") ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
                      }`}>
                        {phaseSaveMsg}
                      </div>
                    )}
                    <form onSubmit={handleSavePhaseYoutube} className="flex gap-3 max-w-lg">
                      <input
                        type="url"
                        value={editingPhaseYoutube}
                        onChange={(e) => setEditingPhaseYoutube(e.target.value)}
                        placeholder="https://www.youtube.com/watch?v=..."
                        className="flex-1 p-2.5 bg-surface-container-low border border-outline-variant/30 rounded-lg text-xs outline-none"
                      />
                      <button
                        type="submit"
                        disabled={phaseSaveLoading}
                        className="px-5 py-2.5 bg-primary text-white font-label-md text-xs rounded-lg hover:opacity-90"
                      >
                        {phaseSaveLoading ? "Saving..." : "Save Walkthrough URL"}
                      </button>
                    </form>
                  </div>
                </div>
              )}

            </div>
          )}{activeTab === "blog" && (
            <div style={{ animation: "fadeIn 0.3s ease" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                <div>
                  <h1 style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 24, color: NAVY, margin: 0 }}>Content & Blog Manager</h1>
                  <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#6B7280", marginTop: 4 }}>
                    Create and publish SEO articles to boost rankings and fuel Meta Ad campaigns.
                  </p>
                </div>
                {adminRole !== "agent" && (
                  <button
                    onClick={openCreateBlog}
                    style={{
                      display: "flex", alignItems: "center", gap: 7,
                      padding: "10px 18px",
                      background: GOLD,
                      border: "none",
                      borderRadius: 9,
                      color: "#fff",
                      fontFamily: "Montserrat, sans-serif",
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    <Plus size={14} /> Add New Article
                  </button>
                )}
              </div>

              <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${CARD_BORDER}`, boxShadow: "0 2px 12px rgba(12,26,48,0.05)", overflow: "hidden" }}>
                {blogPosts.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "64px 20px" }}>
                    <BookOpen size={40} style={{ color: "#E5E7EB", marginBottom: 12 }} />
                    <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#9CA3AF" }}>No articles in the database yet.</p>
                  </div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ background: "#F9FAFB", borderBottom: `1px solid ${CARD_BORDER}` }}>
                          {["Image", "Title & Summary", "Category", "Author", "Status", "Actions"].map((h) => (
                            <th key={h} style={{ padding: "12px 20px", textAlign: "left", fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.09em" }}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {blogPosts.map((post, idx) => (
                          <tr
                            key={post.id}
                            style={{ borderBottom: idx < blogPosts.length - 1 ? `1px solid ${CARD_BORDER}` : "none" }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "#F9FAFB"; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "transparent"; }}
                          >
                            <td style={{ padding: "14px 20px" }}>
                              <div style={{ width: 56, height: 38, borderRadius: 6, overflow: "hidden", background: "#F3F4F6", border: `1px solid ${CARD_BORDER}` }}>
                                <img src={post.featured_image || ""} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              </div>
                            </td>
                            <td style={{ padding: "14px 20px", maxWidth: 280 }}>
                              <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13, color: NAVY, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{post.title}</div>
                              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#9CA3AF", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{post.summary}</div>
                            </td>
                            <td style={{ padding: "14px 20px", fontFamily: "Inter, sans-serif", fontSize: 13, color: "#374151" }}>{post.category}</td>
                            <td style={{ padding: "14px 20px", fontFamily: "Inter, sans-serif", fontSize: 13, color: "#6B7280" }}>{post.author_name}</td>
                            <td style={{ padding: "14px 20px" }}>
                              <span style={{
                                fontFamily: "Inter, sans-serif", fontSize: 10, fontWeight: 700,
                                textTransform: "uppercase", letterSpacing: "0.07em",
                                padding: "4px 10px", borderRadius: 20,
                                background: post.status === "published" ? "#D1FAE5" : "#FEF3C7",
                                color: post.status === "published" ? "#059669" : "#D97706",
                              }}>
                                {post.status}
                              </span>
                            </td>
                            <td style={{ padding: "14px 20px" }}>
                              {adminRole !== "agent" ? (
                                <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                                  <button
                                    onClick={() => openEditBlog(post)}
                                    title="Edit"
                                    style={{ padding: "7px", border: `1px solid ${CARD_BORDER}`, borderRadius: 7, background: "#fff", cursor: "pointer", color: "#6B7280" }}
                                  >
                                    <Edit2 size={13} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteBlogPost(post.id)}
                                    title="Delete"
                                    style={{ padding: "7px", border: `1px solid ${CARD_BORDER}`, borderRadius: 7, background: "#fff", cursor: "pointer", color: "#6B7280" }}
                                  >
                                    <X size={13} />
                                  </button>
                                </div>
                              ) : (
                                <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "#9CA3AF", fontStyle: "italic" }}>View only</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════
              TAB: LEADS & PIPELINE (KANBAN)
          ══════════════════════════════════════════════ */}
          {activeTab === "leads" && (
            <div style={{ animation: "fadeIn 0.3s ease", display: "flex", flexDirection: "column", height: "100%" }}>
              <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexShrink: 0 }}>
                <div>
                  <h1 style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 24, color: NAVY, margin: 0 }}>Leads & Pipeline</h1>
                  <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#6B7280", marginTop: 4 }}>
                    Drag-and-drop Kanban board to manage inquiries through the conversion pipeline.
                  </p>
                </div>
                {/* Search Bar for Kanban */}
                <div style={{ position: "relative", width: 260 }}>
                  <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9CA3AF" }} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search leads..."
                    style={{
                      width: "100%",
                      padding: "9px 12px 9px 34px",
                      border: `1px solid ${CARD_BORDER}`,
                      borderRadius: 9,
                      fontFamily: "Inter, sans-serif",
                      fontSize: 13,
                      color: NAVY,
                      outline: "none",
                      boxSizing: "border-box",
                      boxShadow: "inset 0 1px 3px rgba(0,0,0,0.02)",
                    }}
                  />
                </div>
              </div>

              {/* KANBAN BOARD AREA */}
              <div style={{ 
                display: "flex", 
                gap: 16, 
                flex: 1, 
                overflowX: "auto", 
                paddingBottom: 20 
              }}>
                {["pending", "reviewed", "approved", "rejected"].map((stage) => {
                  const stageLeads = inquiries.filter(
                    (inq) => inq.status === stage &&
                      (searchQuery === "" || inq.client_full_name.toLowerCase().includes(searchQuery.toLowerCase()))
                  );

                  let stageColor = "#6B7280";
                  let stageBg = "#F3F4F6";
                  let stageLabel = stage.charAt(0).toUpperCase() + stage.slice(1);
                  
                  if (stage === "pending") { stageColor = "#D97706"; stageBg = "#FEF3C7"; }
                  if (stage === "reviewed") { stageColor = "#2563EB"; stageBg = "#DBEAFE"; }
                  if (stage === "approved") { stageColor = "#059669"; stageBg = "#D1FAE5"; stageLabel = "Won (Approved)"; }
                  if (stage === "rejected") { stageColor = "#DC2626"; stageBg = "#FEE2E2"; stageLabel = "Lost (Rejected)"; }

                  return (
                    <div key={stage} style={{ 
                      flex: "0 0 300px", 
                      display: "flex", 
                      flexDirection: "column",
                      background: "rgba(255,255,255,0.4)",
                      borderRadius: 12,
                      border: `1px solid ${CARD_BORDER}`,
                      maxHeight: "100%"
                    }}>
                      {/* Column Header */}
                      <div style={{ 
                        padding: "14px 16px", 
                        borderBottom: `1px solid ${CARD_BORDER}`,
                        display: "flex", 
                        alignItems: "center", 
                        justifyContent: "space-between"
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ 
                            fontFamily: "Inter, sans-serif", 
                            fontWeight: 600, 
                            fontSize: 13, 
                            color: NAVY 
                          }}>
                            {stageLabel}
                          </span>
                          <span style={{ 
                            background: stageBg, 
                            color: stageColor, 
                            fontSize: 11, 
                            fontWeight: 700, 
                            padding: "2px 8px", 
                            borderRadius: 12 
                          }}>
                            {stageLeads.length}
                          </span>
                        </div>
                      </div>

                      {/* Column Cards */}
                      <div style={{ 
                        padding: 12, 
                        display: "flex", 
                        flexDirection: "column", 
                        gap: 12, 
                        overflowY: "auto",
                        flex: 1
                      }}>
                        {stageLeads.length === 0 ? (
                          <div style={{ padding: "30px 10px", textAlign: "center", color: "#9CA3AF", fontSize: 13, fontFamily: "Inter, sans-serif" }}>
                            No leads in this stage.
                          </div>
                        ) : (
                          stageLeads.map((lead) => (
                            <div key={lead.id} style={{
                              background: "#fff",
                              borderRadius: 10,
                              border: `1px solid ${CARD_BORDER}`,
                              padding: 14,
                              boxShadow: "0 2px 8px rgba(12,26,48,0.04)",
                              cursor: "pointer",
                              position: "relative",
                              transition: "all 0.2s ease"
                            }}
                            onMouseEnter={(e) => {
                              (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
                              (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 16px rgba(12,26,48,0.08)";
                            }}
                            onMouseLeave={(e) => {
                              (e.currentTarget as HTMLDivElement).style.transform = "none";
                              (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 8px rgba(12,26,48,0.04)";
                            }}
                            >
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                                  <div style={{
                                    width: 32, height: 32, borderRadius: "50%", background: GOLD,
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    color: "#fff", fontSize: 11, fontWeight: 700, fontFamily: "Montserrat, sans-serif"
                                  }}>
                                    {getInitials(lead.client_full_name)}
                                  </div>
                                  <div>
                                    <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: NAVY }}>
                                      {lead.client_full_name}
                                    </div>
                                    <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "#6B7280" }}>
                                      {new Date(lead.created_at).toLocaleDateString()}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div style={{ padding: "8px 10px", background: "#F8FAFC", borderRadius: 6, marginBottom: 12 }}>
                                <div style={{ fontSize: 12, color: "#4B5563", fontFamily: "Inter, sans-serif", fontWeight: 500, marginBottom: 4 }}>
                                  {lead.phase_name || "Unspecified Phase"} • Plot #{lead.plot_number_ref || "TBD"}
                                </div>
                                <div style={{ fontSize: 13, color: NAVY, fontFamily: "Inter, sans-serif", fontWeight: 700 }}>
                                  Ksh {(lead.price || 0).toLocaleString()}
                                </div>
                              </div>

                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: `1px solid ${CARD_BORDER}`, paddingTop: 10 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <div style={{
                                    width: 20, height: 20, borderRadius: "50%", 
                                    background: lead.cro_name ? "#E0E7FF" : "#F3F4F6",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    color: lead.cro_name ? "#4F46E5" : "#9CA3AF", fontSize: 8, fontWeight: 700
                                  }}>
                                    {getInitials(lead.cro_name || "UA")}
                                  </div>
                                  <span style={{ fontSize: 11, color: "#6B7280", fontFamily: "Inter, sans-serif" }}>
                                    {lead.cro_name || "Unassigned"}
                                  </span>
                                </div>
                                {stage === "pending" && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleApproveInquiry(lead.id);
                                    }}
                                    style={{
                                      background: "transparent", border: `1px solid ${GOLD}`, color: GOLD,
                                      padding: "4px 10px", borderRadius: 4, fontSize: 10, fontWeight: 600, cursor: "pointer",
                                      transition: "background 0.15s"
                                    }}
                                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = GOLD; (e.currentTarget as HTMLButtonElement).style.color = "#fff"; }}
                                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = GOLD; }}
                                  >
                                    Approve
                                  </button>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          
          {/* ══════════════════════════════════════════════
              AGENT PERFORMANCE (STITCH DNA)
          ══════════════════════════════════════════════ */}
          {activeTab === "agents" && (
            <div style={{ animation: "fadeIn 0.3s ease" }}>
              <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <div>
                  <h1 style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 24, color: NAVY, margin: 0 }}>Agent Performance</h1>
                  <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#6B7280", marginTop: 4 }}>
                    Monitor sales performance and lead conversion rates for all registered agents.
                  </p>
                </div>
              </div>

              <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${CARD_BORDER}`, boxShadow: "0 2px 12px rgba(12,26,48,0.05)", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead style={{ background: CANVAS, borderBottom: `1px solid ${CARD_BORDER}` }}>
                    <tr>
                      <th style={{ padding: "16px 24px", fontFamily: "Montserrat, sans-serif", fontSize: 12, fontWeight: 700, color: NAVY, textTransform: "uppercase", letterSpacing: "0.05em" }}>Agent</th>
                      <th style={{ padding: "16px 24px", fontFamily: "Montserrat, sans-serif", fontSize: 12, fontWeight: 700, color: NAVY, textTransform: "uppercase", letterSpacing: "0.05em" }}>Assigned Leads</th>
                      <th style={{ padding: "16px 24px", fontFamily: "Montserrat, sans-serif", fontSize: 12, fontWeight: 700, color: NAVY, textTransform: "uppercase", letterSpacing: "0.05em" }}>Closed Deals</th>
                      <th style={{ padding: "16px 24px", fontFamily: "Montserrat, sans-serif", fontSize: 12, fontWeight: 700, color: NAVY, textTransform: "uppercase", letterSpacing: "0.05em" }}>Conversion Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staff.filter(s => s.role === "agent").map((agent, i) => {
                      const agentLeads = inquiries.filter(inq => inq.cro_name === agent.full_name || inq.cro_name === agent.email);
                      const closed = agentLeads.filter(inq => agreements.some(a => a.inquiry_id === inq.id && a.ceo_signed));
                      const convRate = agentLeads.length > 0 ? ((closed.length / agentLeads.length) * 100).toFixed(1) : 0;
                      return (
                        <tr key={agent.id} style={{ borderBottom: i === staff.length - 1 ? "none" : `1px solid ${CARD_BORDER}`, background: "#fff" }}>
                          <td style={{ padding: "16px 24px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                              <div style={{ width: 36, height: 36, borderRadius: "50%", background: CANVAS, display: "flex", alignItems: "center", justifyContent: "center", color: NAVY, fontWeight: 600, fontSize: 14 }}>
                                {(agent.full_name || agent.email).charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 14, color: NAVY }}>{agent.full_name || "Unknown"}</div>
                                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#6B7280" }}>{agent.email}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: "16px 24px", fontFamily: "Inter, sans-serif", fontSize: 14, color: NAVY }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <Users size={16} color="#6B7280" /> {agentLeads.length}
                            </div>
                          </td>
                          <td style={{ padding: "16px 24px", fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, color: "#059669" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <CheckCircle size={16} /> {closed.length}
                            </div>
                          </td>
                          <td style={{ padding: "16px 24px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                              <div style={{ flex: 1, height: 6, background: CANVAS, borderRadius: 3, overflow: "hidden" }}>
                                <div style={{ width: `${convRate}%`, height: "100%", background: GOLD, borderRadius: 3 }} />
                              </div>
                              <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: NAVY }}>{convRate}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════
              CONTACTS (STITCH DNA)
          ══════════════════════════════════════════════ */}
          {activeTab === "contacts" && (
            <div style={{ animation: "fadeIn 0.3s ease" }}>
              <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 24, color: NAVY, margin: 0 }}>Client Contacts</h1>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#6B7280", marginTop: 4 }}>
                  Centralized directory of all clients who have submitted inquiries or booked plots.
                </p>
              </div>
              <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${CARD_BORDER}`, boxShadow: "0 2px 12px rgba(12,26,48,0.05)", overflow: "hidden" }}>
                <div style={{ padding: 16, borderBottom: `1px solid ${CARD_BORDER}`, display: "flex", gap: 12 }}>
                  <div style={{ position: "relative", flex: 1, maxWidth: 300 }}>
                    <Search size={16} style={{ position: "absolute", left: 14, top: 12, color: "#9CA3AF" }} />
                    <input type="text" placeholder="Search by name, phone or email..." style={{ width: "100%", padding: "10px 14px 10px 40px", borderRadius: 8, border: `1px solid ${CARD_BORDER}`, fontFamily: "Inter, sans-serif", fontSize: 13 }} />
                  </div>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead style={{ background: CANVAS, borderBottom: `1px solid ${CARD_BORDER}` }}>
                    <tr>
                      <th style={{ padding: "16px 24px", fontFamily: "Montserrat, sans-serif", fontSize: 12, fontWeight: 700, color: NAVY, textTransform: "uppercase", letterSpacing: "0.05em" }}>Client Details</th>
                      <th style={{ padding: "16px 24px", fontFamily: "Montserrat, sans-serif", fontSize: 12, fontWeight: 700, color: NAVY, textTransform: "uppercase", letterSpacing: "0.05em" }}>Phone</th>
                      <th style={{ padding: "16px 24px", fontFamily: "Montserrat, sans-serif", fontSize: 12, fontWeight: 700, color: NAVY, textTransform: "uppercase", letterSpacing: "0.05em" }}>ID / KRA</th>
                      <th style={{ padding: "16px 24px", fontFamily: "Montserrat, sans-serif", fontSize: 12, fontWeight: 700, color: NAVY, textTransform: "uppercase", letterSpacing: "0.05em" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from(new Map(inquiries.map(inq => [inq.client_email, inq])).values()).slice(0, 15).map((inq, i) => (
                      <tr key={inq.id} style={{ borderBottom: "1px solid " + CARD_BORDER, background: "#fff" }}>
                        <td style={{ padding: "16px 24px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#EFF6FF", color: "#0B7FC7", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14 }}>
                              {inq.client_full_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 14, color: NAVY }}>{inq.client_full_name}</div>
                              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#6B7280" }}>{inq.client_email}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "16px 24px", fontFamily: "Inter, sans-serif", fontSize: 14, color: NAVY }}>{inq.client_phone}</td>
                        <td style={{ padding: "16px 24px", fontFamily: "Inter, sans-serif", fontSize: 13, color: "#6B7280" }}>
                          <div>ID: {inq.client_id_passport}</div>
                          <div>KRA: {inq.client_kra_pin || "—"}</div>
                        </td>
                        <td style={{ padding: "16px 24px" }}>
                          <div style={{ display: "flex", gap: 8 }}>
                            <a href={`tel:${inq.client_phone}`} style={{ padding: 8, background: CANVAS, borderRadius: 6, color: NAVY }}><PhoneCall size={16} /></a>
                            <a href={`mailto:${inq.client_email}`} style={{ padding: 8, background: CANVAS, borderRadius: 6, color: NAVY }}><Activity size={16} /></a>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════
              INSTALLMENTS (STITCH DNA)
          ══════════════════════════════════════════════ */}
          {activeTab === "installments" && (
            <div style={{ animation: "fadeIn 0.3s ease" }}>
              <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 24, color: NAVY, margin: 0 }}>Installment Tracker</h1>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#6B7280", marginTop: 4 }}>
                  Monitor progress of clients on installment payment plans.
                </p>
              </div>
              <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${CARD_BORDER}`, boxShadow: "0 2px 12px rgba(12,26,48,0.05)", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead style={{ background: CANVAS, borderBottom: `1px solid ${CARD_BORDER}` }}>
                    <tr>
                      <th style={{ padding: "16px 24px", fontFamily: "Montserrat, sans-serif", fontSize: 12, fontWeight: 700, color: NAVY, textTransform: "uppercase" }}>Client & Plot</th>
                      <th style={{ padding: "16px 24px", fontFamily: "Montserrat, sans-serif", fontSize: 12, fontWeight: 700, color: NAVY, textTransform: "uppercase" }}>Agreed Price</th>
                      <th style={{ padding: "16px 24px", fontFamily: "Montserrat, sans-serif", fontSize: 12, fontWeight: 700, color: NAVY, textTransform: "uppercase" }}>Paid So Far</th>
                      <th style={{ padding: "16px 24px", fontFamily: "Montserrat, sans-serif", fontSize: 12, fontWeight: 700, color: NAVY, textTransform: "uppercase" }}>Progress</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inquiries.filter(i => i.terms_of_payment === "installment").map((inq, i) => {
                      const totalPaid = inq.deposit || 0; // In a real app we'd sum payments table, but deposit holds initial
                      const price = inq.price || 1;
                      const progress = Math.min(100, Math.round((totalPaid / price) * 100));
                      return (
                        <tr key={inq.id} style={{ borderBottom: "1px solid " + CARD_BORDER, background: "#fff" }}>
                          <td style={{ padding: "16px 24px" }}>
                            <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 14, color: NAVY }}>{inq.client_full_name}</div>
                            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#6B7280" }}>{inq.phase_name} • Plot {inq.plot_number_ref}</div>
                          </td>
                          <td style={{ padding: "16px 24px", fontFamily: "Inter, sans-serif", fontSize: 14, color: NAVY, fontWeight: 600 }}>
                            Ksh {price.toLocaleString()}
                          </td>
                          <td style={{ padding: "16px 24px", fontFamily: "Inter, sans-serif", fontSize: 14, color: "#059669", fontWeight: 600 }}>
                            Ksh {totalPaid.toLocaleString()}
                          </td>
                          <td style={{ padding: "16px 24px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                              <div style={{ flex: 1, height: 8, background: CANVAS, borderRadius: 4, overflow: "hidden" }}>
                                <div style={{ width: `${progress}%`, height: "100%", background: progress === 100 ? "#059669" : "#0B7FC7", borderRadius: 4 }} />
                              </div>
                              <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: NAVY }}>{progress}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════
              MEETINGS & CALLS (STITCH DNA)
          ══════════════════════════════════════════════ */}
          {activeTab === "meetings" && (
            <div style={{ animation: "fadeIn 0.3s ease" }}>
              <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 24, color: NAVY, margin: 0 }}>Meetings & Calls</h1>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#6B7280", marginTop: 4 }}>
                  Upcoming physical site visits and virtual tour bookings.
                </p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
                {bookings.map(booking => {
                  const inquiry = inquiries.find(i => i.id === booking.inquiry_id);
                  return (
                    <div key={booking.id} style={{ background: "#fff", borderRadius: 14, border: `1px solid ${CARD_BORDER}`, padding: 20, boxShadow: "0 2px 12px rgba(12,26,48,0.05)", position: "relative", overflow: "hidden" }}>
                      <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 4, background: booking.visit_type === "virtual" ? "#8B5CF6" : GOLD }} />
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                            {booking.visit_type === "virtual" ? <Activity size={14} color="#8B5CF6" /> : <MapPin size={14} color={GOLD} />}
                            <span style={{ fontFamily: "Montserrat, sans-serif", fontSize: 11, fontWeight: 700, color: booking.visit_type === "virtual" ? "#8B5CF6" : GOLD_DARK, textTransform: "uppercase" }}>
                              {booking.visit_type} Visit
                            </span>
                          </div>
                          <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 16, color: NAVY }}>{inquiry?.client_full_name || "Unknown Client"}</div>
                        </div>
                        <div style={{ padding: "4px 10px", borderRadius: 6, background: booking.status === "confirmed" ? "#D1FAE5" : CANVAS, color: booking.status === "confirmed" ? "#059669" : "#6B7280", fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, textTransform: "capitalize" }}>
                          {booking.status}
                        </div>
                      </div>
                      <div style={{ background: CANVAS, borderRadius: 8, padding: 12, marginBottom: 16 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontFamily: "Inter, sans-serif", fontSize: 13, color: NAVY }}>
                          <Calendar size={14} color="#6B7280" /> <span style={{ fontWeight: 600 }}>{new Date(booking.visit_date || "").toLocaleDateString()}</span> ({booking.visit_time})
                        </div>
                        {booking.visit_type === "physical" && booking.pickup_location && (
                          <div style={{ display: "flex", alignItems: "flex-start", gap: 8, fontFamily: "Inter, sans-serif", fontSize: 13, color: "#6B7280" }}>
                            <MapPin size={14} color="#6B7280" style={{ marginTop: 2 }} /> <span>Pickup: {booking.pickup_location}</span>
                          </div>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button style={{ flex: 1, padding: "8px 0", border: `1px solid ${CARD_BORDER}`, borderRadius: 8, background: "#fff", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: NAVY }}>Reschedule</button>
                        <button style={{ flex: 1, padding: "8px 0", border: "none", borderRadius: 8, background: NAVY, fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: "#fff" }}>Complete</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════
              DEALS (STITCH DNA)
          ══════════════════════════════════════════════ */}
          {activeTab === "deals" && (
            <div style={{ animation: "fadeIn 0.3s ease" }}>
              <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <div>
                  <h1 style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 24, color: NAVY, margin: 0 }}>Closed Deals Ledger</h1>
                  <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#6B7280", marginTop: 4 }}>
                    Agreements that have been finalized and signed by the CEO.
                  </p>
                </div>
              </div>
              <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${CARD_BORDER}`, boxShadow: "0 2px 12px rgba(12,26,48,0.05)", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead style={{ background: CANVAS, borderBottom: `1px solid ${CARD_BORDER}` }}>
                    <tr>
                      <th style={{ padding: "16px 24px", fontFamily: "Montserrat, sans-serif", fontSize: 12, fontWeight: 700, color: NAVY, textTransform: "uppercase" }}>Agreement ID</th>
                      <th style={{ padding: "16px 24px", fontFamily: "Montserrat, sans-serif", fontSize: 12, fontWeight: 700, color: NAVY, textTransform: "uppercase" }}>Client</th>
                      <th style={{ padding: "16px 24px", fontFamily: "Montserrat, sans-serif", fontSize: 12, fontWeight: 700, color: NAVY, textTransform: "uppercase" }}>Project</th>
                      <th style={{ padding: "16px 24px", fontFamily: "Montserrat, sans-serif", fontSize: 12, fontWeight: 700, color: NAVY, textTransform: "uppercase" }}>Date Signed</th>
                      <th style={{ padding: "16px 24px", fontFamily: "Montserrat, sans-serif", fontSize: 12, fontWeight: 700, color: NAVY, textTransform: "uppercase" }}>Contract</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agreements.filter(a => a.ceo_signed).map((agr, i) => {
                      const inquiry = inquiries.find(inq => inq.id === agr.inquiry_id);
                      return (
                        <tr key={agr.id} style={{ borderBottom: "1px solid " + CARD_BORDER, background: "#fff" }}>
                          <td style={{ padding: "16px 24px", fontFamily: "Inter, sans-serif", fontSize: 14, color: "#6B7280", fontWeight: 500 }}>
                            {agr.id.substring(0,8).toUpperCase()}
                          </td>
                          <td style={{ padding: "16px 24px", fontFamily: "Inter, sans-serif", fontSize: 14, color: NAVY, fontWeight: 600 }}>
                            {inquiry?.client_full_name}
                          </td>
                          <td style={{ padding: "16px 24px", fontFamily: "Inter, sans-serif", fontSize: 13, color: NAVY }}>
                            {inquiry?.phase_name} • Plot {inquiry?.plot_number_ref}
                          </td>
                          <td style={{ padding: "16px 24px", fontFamily: "Inter, sans-serif", fontSize: 13, color: "#6B7280" }}>
                            {new Date(agr.ceo_signed_at || "").toLocaleDateString()}
                          </td>
                          <td style={{ padding: "16px 24px" }}>
                            <a href={agr.pdf_agreement_url || "#"} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", background: "#EFF6FF", color: "#0B7FC7", borderRadius: 6, fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, textDecoration: "none" }}>
                              <FileText size={14} /> View PDF
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════
              CAMPAIGNS & MARKETING + GLOBAL MEDIA MANAGER (STITCH DNA)
          ══════════════════════════════════════════════ */}
          {activeTab === "campaigns" && (
            <div style={{ animation: "fadeIn 0.3s ease" }}>
              <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 24, color: NAVY, margin: 0 }}>Campaigns & Marketing</h1>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#6B7280", marginTop: 4 }}>
                  Manage Affiliate Partners and Global Brand Media (Posters, Heroes, Locations).
                </p>
              </div>

              {/* MEDIA MANAGER */}
              <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${CARD_BORDER}`, padding: 32, boxShadow: "0 2px 12px rgba(12,26,48,0.05)", marginBottom: 32 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: CANVAS, display: "flex", alignItems: "center", justifyContent: "center", color: GOLD_DARK }}>
                    <Megaphone size={20} />
                  </div>
                  <div>
                    <h2 style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 18, color: NAVY, margin: 0 }}>Global Media Manager</h2>
                    <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#6B7280", margin: 0 }}>Update posters, hero sections, and project photos.</p>
                  </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: NAVY, display: "block", marginBottom: 8, textTransform: "uppercase" }}>Select Phase to Update Media</label>
                  <select
                    value={mediaEditingPhaseId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setMediaEditingPhaseId(id);
                      const p = phases.find(ph => ph.id === id);
                      if (p) {
                        setMediaHeroImage(p.hero_image_urls?.[0] || "");
                        setMediaDiasporaImage(p.diaspora_image_url || "");
                        setMediaBrochure(p.brochure_url || "");
                        setMediaPlotMap(p.plot_map_url || "");
                        setMediaThumbnail(p.image_url || "");
                      }
                    }}
                    style={{ width: "100%", padding: "12px 16px", borderRadius: 8, border: `1px solid ${CARD_BORDER}`, fontFamily: "Inter, sans-serif", fontSize: 14, outline: "none" }}
                  >
                    <option value="">-- Select a Project Phase --</option>
                    {phases.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                {mediaEditingPhaseId && (
                  <form onSubmit={handleSaveMediaUrls} style={{ background: CANVAS, borderRadius: 12, padding: 24 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                      <div>
                        <label style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600, color: "#6B7280", display: "block", marginBottom: 6, textTransform: "uppercase" }}>Hero Section Image URL (Main Poster)</label>
                        <input type="url" value={mediaHeroImage} onChange={(e) => setMediaHeroImage(e.target.value)} placeholder="https://..." style={{ width: "100%", padding: 10, borderRadius: 6, border: `1px solid ${CARD_BORDER}`, fontSize: 13, fontFamily: "Inter, sans-serif" }} />
                      </div>
                      <div>
                        <label style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600, color: "#6B7280", display: "block", marginBottom: 6, textTransform: "uppercase" }}>Diaspora Hub Banner URL</label>
                        <input type="url" value={mediaDiasporaImage} onChange={(e) => setMediaDiasporaImage(e.target.value)} placeholder="https://..." style={{ width: "100%", padding: 10, borderRadius: 6, border: `1px solid ${CARD_BORDER}`, fontSize: 13, fontFamily: "Inter, sans-serif" }} />
                      </div>
                      <div>
                        <label style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600, color: "#6B7280", display: "block", marginBottom: 6, textTransform: "uppercase" }}>Project Thumbnail (Card Image)</label>
                        <input type="url" value={mediaThumbnail} onChange={(e) => setMediaThumbnail(e.target.value)} placeholder="https://..." style={{ width: "100%", padding: 10, borderRadius: 6, border: `1px solid ${CARD_BORDER}`, fontSize: 13, fontFamily: "Inter, sans-serif" }} />
                      </div>
                      <div>
                        <label style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600, color: "#6B7280", display: "block", marginBottom: 6, textTransform: "uppercase" }}>Brochure PDF URL</label>
                        <input type="url" value={mediaBrochure} onChange={(e) => setMediaBrochure(e.target.value)} placeholder="https://..." style={{ width: "100%", padding: 10, borderRadius: 6, border: `1px solid ${CARD_BORDER}`, fontSize: 13, fontFamily: "Inter, sans-serif" }} />
                      </div>
                    </div>
                    {mediaSaveMsg && (
                      <div style={{ marginTop: 16, padding: "10px 14px", background: mediaSaveMsg.includes("Error") ? "#FEE2E2" : "#D1FAE5", border: `1px solid ${mediaSaveMsg.includes("Error") ? "#FECACA" : "#A7F3D0"}`, borderRadius: 8, color: mediaSaveMsg.includes("Error") ? "#DC2626" : "#059669", fontFamily: "Inter, sans-serif", fontSize: 13 }}>
                        {mediaSaveMsg}
                      </div>
                    )}
                    <button type="submit" disabled={mediaSaveLoading} style={{ marginTop: 20, padding: "12px 24px", background: NAVY, color: "#fff", borderRadius: 8, border: "none", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 14, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}>
                      {mediaSaveLoading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Save Media URLs
                    </button>
                  </form>
                )}
              </div>

              {/* AFFILIATES TABLE */}
              <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${CARD_BORDER}`, boxShadow: "0 2px 12px rgba(12,26,48,0.05)", overflow: "hidden" }}>
                <div style={{ padding: "20px 24px", borderBottom: `1px solid ${CARD_BORDER}` }}>
                  <h3 style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 16, color: NAVY, margin: 0 }}>Affiliate Partners</h3>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead style={{ background: CANVAS, borderBottom: `1px solid ${CARD_BORDER}` }}>
                    <tr>
                      <th style={{ padding: "16px 24px", fontFamily: "Montserrat, sans-serif", fontSize: 12, fontWeight: 700, color: NAVY, textTransform: "uppercase" }}>Partner Name</th>
                      <th style={{ padding: "16px 24px", fontFamily: "Montserrat, sans-serif", fontSize: 12, fontWeight: 700, color: NAVY, textTransform: "uppercase" }}>Contact</th>
                      <th style={{ padding: "16px 24px", fontFamily: "Montserrat, sans-serif", fontSize: 12, fontWeight: 700, color: NAVY, textTransform: "uppercase" }}>Referral Code</th>
                      <th style={{ padding: "16px 24px", fontFamily: "Montserrat, sans-serif", fontSize: 12, fontWeight: 700, color: NAVY, textTransform: "uppercase" }}>Commission</th>
                    </tr>
                  </thead>
                  <tbody>
                    {affiliates.length === 0 ? (
                      <tr><td colSpan={4} style={{ padding: 32, textAlign: "center", color: "#6B7280", fontFamily: "Inter, sans-serif" }}>No affiliates registered yet.</td></tr>
                    ) : affiliates.map((aff, i) => (
                      <tr key={aff.id} style={{ borderBottom: "1px solid " + CARD_BORDER }}>
                        <td style={{ padding: "16px 24px", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 14, color: NAVY }}>{aff.partner_name}</td>
                        <td style={{ padding: "16px 24px", fontFamily: "Inter, sans-serif", fontSize: 13, color: "#6B7280" }}>{aff.phone}<br/>{aff.email}</td>
                        <td style={{ padding: "16px 24px" }}><span style={{ background: CANVAS, padding: "4px 8px", borderRadius: 6, fontFamily: "monospace", fontSize: 13, color: NAVY, border: `1px dashed ${GOLD}` }}>{aff.referral_code}</span></td>
                        <td style={{ padding: "16px 24px", fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, color: "#059669" }}>{aff.commission_rate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════
              SYSTEM SETTINGS (STITCH DNA)
          ══════════════════════════════════════════════ */}
          {activeTab === "settings" && (
            <div style={{ animation: "fadeIn 0.3s ease" }}>
              <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 24, color: NAVY, margin: 0 }}>System Settings</h1>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#6B7280", marginTop: 4 }}>
                  Configure your Gatepath CRM preferences.
                </p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${CARD_BORDER}`, padding: 32, boxShadow: "0 2px 12px rgba(12,26,48,0.05)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: CANVAS, display: "flex", alignItems: "center", justifyContent: "center", color: NAVY }}>
                      <UserCheck size={20} />
                    </div>
                    <div>
                      <h2 style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 18, color: NAVY, margin: 0 }}>My Profile</h2>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div>
                      <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: "#6B7280", display: "block", marginBottom: 6 }}>Full Name</label>
                      <input type="text" defaultValue="Gatepath CEO" readOnly style={{ width: "100%", padding: "12px 16px", borderRadius: 8, border: `1px solid ${CARD_BORDER}`, background: CANVAS, fontFamily: "Inter, sans-serif", fontSize: 14, color: NAVY }} />
                    </div>
                    <div>
                      <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: "#6B7280", display: "block", marginBottom: 6 }}>Email Address</label>
                      <input type="email" defaultValue="ceo@gatepathrealtors.com" readOnly style={{ width: "100%", padding: "12px 16px", borderRadius: 8, border: `1px solid ${CARD_BORDER}`, background: CANVAS, fontFamily: "Inter, sans-serif", fontSize: 14, color: NAVY }} />
                    </div>
                    <button disabled style={{ padding: "12px", background: NAVY, color: "#fff", borderRadius: 8, border: "none", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 14, opacity: 0.5, cursor: "not-allowed" }}>Update Profile (Auth Disabled)</button>
                  </div>
                </div>

                <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${CARD_BORDER}`, padding: 32, boxShadow: "0 2px 12px rgba(12,26,48,0.05)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: CANVAS, display: "flex", alignItems: "center", justifyContent: "center", color: NAVY }}>
                      <Shield size={20} />
                    </div>
                    <div>
                      <h2 style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 18, color: NAVY, margin: 0 }}>Security Preferences</h2>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 16, borderBottom: `1px solid ${CARD_BORDER}` }}>
                      <div>
                        <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 14, color: NAVY }}>Two-Factor Authentication</div>
                        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#6B7280" }}>Require OTP for all admin logins.</div>
                      </div>
                      <div style={{ width: 44, height: 24, borderRadius: 12, background: GOLD, position: "relative", cursor: "pointer" }}>
                        <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, right: 2, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }} />
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 14, color: NAVY }}>Email Notifications</div>
                        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#6B7280" }}>Alert on new bookings & payments.</div>
                      </div>
                      <div style={{ width: 44, height: 24, borderRadius: 12, background: GOLD, position: "relative", cursor: "pointer" }}>
                        <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, right: 2, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ══════════════════════════════════════════════
          MODAL: REVIEW INQUIRY
      ══════════════════════════════════════════════ */}
      {selectedInquiry && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(12,26,48,0.55)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "#fff", width: "100%", maxWidth: 660, borderRadius: 18, padding: 36, boxShadow: "0 32px 80px rgba(0,0,0,0.3)", maxHeight: "88vh", overflowY: "auto", position: "relative" }}>
            <button
              onClick={() => setSelectedInquiry(null)}
              style={{ position: "absolute", top: 20, right: 20, background: "none", border: "none", cursor: "pointer", color: "#9CA3AF" }}
            >
              <X size={20} />
            </button>

            <h3 style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 22, color: NAVY, margin: 0 }}>Inquiry Review Board</h3>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#6B7280", marginTop: 6 }}>Review the buyer's details and approve or reject the sale agreement.</p>

            <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                {
                  title: "CLIENT DATA",
                  fields: [
                    { label: "Full Name", value: selectedInquiry.client_full_name },
                    { label: "Phone No", value: selectedInquiry.client_phone },
                    { label: "Email", value: selectedInquiry.client_email },
                    { label: "National ID / Passport", value: selectedInquiry.client_id_passport },
                    { label: "KRA PIN", value: selectedInquiry.client_kra_pin || "—" },
                    { label: "Address", value: selectedInquiry.client_postal_address || "—" },
                  ],
                },
                {
                  title: "NEXT OF KIN",
                  fields: [
                    { label: "Full Name", value: selectedInquiry.kin_full_name || "—" },
                    { label: "Relationship", value: selectedInquiry.kin_relationship || "—" },
                    { label: "Phone No", value: selectedInquiry.kin_phone || "—" },
                  ],
                },
                {
                  title: "TRANSACTION DATA",
                  fields: [
                    { label: "Project / Phase", value: `${selectedInquiry.phase_name} (Plot #${selectedInquiry.plot_number_ref})` },
                    { label: "Payment Terms", value: selectedInquiry.terms_of_payment ?? "—" },
                    { label: "Agreed Price", value: `Ksh ${selectedInquiry.price?.toLocaleString() || "—"}` },
                    { label: "Deposit Paid", value: `Ksh ${selectedInquiry.deposit?.toLocaleString() || "—"}` },
                  ],
                },
              ].map((section) => (
                <div key={section.title} style={{ background: "#F9FAFB", border: `1px solid ${CARD_BORDER}`, borderRadius: 10, padding: "18px 20px" }}>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 10, fontWeight: 700, color: GOLD, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 14 }}>
                    {section.title}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 24px" }}>
                    {section.fields.map((f) => (
                      <div key={f.label}>
                        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "#9CA3AF", marginBottom: 2 }}>{f.label}:</div>
                        <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13, color: NAVY }}>{f.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Action Footer */}
            <div style={{ marginTop: 24, paddingTop: 20, borderTop: `1px solid ${CARD_BORDER}`, display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
              {selectedInquiry.status === "pending" && (
                <>
                  <button
                    onClick={() => handleRejectInquiry(selectedInquiry.id)}
                    style={{ padding: "10px 20px", border: "1px solid #FECACA", borderRadius: 9, color: "#DC2626", background: "#fff", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
                  >
                    Reject Inquiry
                  </button>
                  <button
                    onClick={() => handleApproveInquiry(selectedInquiry.id)}
                    style={{ padding: "10px 20px", background: "#2563EB", border: "none", borderRadius: 9, color: "#fff", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
                  >
                    Approve & Draft Agreement
                  </button>
                </>
              )}

              {selectedInquiry.status === "approved" && (() => {
                const signed = agreements.some((a) => a.inquiry_id === selectedInquiry.id && a.ceo_signed);
                const linkedPayment = payments.find((p) => p.inquiry_id === selectedInquiry.id && p.status === "success");
                return (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    {linkedPayment && (
                      <Link
                        to="/document/receipt/$id"
                        params={{ id: linkedPayment.id }}
                        target="_blank"
                        style={{ padding: "10px 16px", border: `1px solid ${CARD_BORDER}`, borderRadius: 9, color: NAVY, fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13, textDecoration: "none", background: "#fff" }}
                      >
                        View Receipt
                      </Link>
                    )}
                    <Link
                      to="/document/agreement/$id"
                      params={{ id: selectedInquiry.id }}
                      target="_blank"
                      style={{ padding: "10px 16px", border: `1px solid ${CARD_BORDER}`, borderRadius: 9, color: NAVY, fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13, textDecoration: "none", background: "#fff" }}
                    >
                      {signed ? "View Signed Agreement" : "View Draft Agreement"}
                    </Link>

                    {signed ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#059669", background: "#D1FAE5", padding: "10px 16px", borderRadius: 9, border: "1px solid #A7F3D0", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13 }}>
                        <Check size={15} /> Signed ✓
                      </div>
                    ) : adminRole === "ceo" ? (
                      <button
                        onClick={() => handleCeoSignature(selectedInquiry.id)}
                        style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", background: GOLD, border: "none", borderRadius: 9, color: "#fff", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
                      >
                        <PenTool size={14} /> Sign Agreement
                      </button>
                    ) : (
                      <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#9CA3AF", fontStyle: "italic" }}>Awaiting CEO Signature</span>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          MODAL: EDIT PLOT STATUS
      ══════════════════════════════════════════════ */}
      {editingPlot && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(12,26,48,0.55)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "#fff", width: "100%", maxWidth: 360, borderRadius: 16, padding: 28, boxShadow: "0 32px 80px rgba(0,0,0,0.3)", position: "relative" }}>
            <button
              onClick={() => setEditingPlot(null)}
              style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "#9CA3AF" }}
            >
              <X size={18} />
            </button>
            <h3 style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 20, color: NAVY, margin: 0 }}>
              Edit Plot #{editingPlot.plot_number}
            </h3>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#6B7280", marginTop: 6 }}>Override this plot's status in the inventory system.</p>

            <form onSubmit={handleUpdatePlotStatus} style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600, color: "#6B7280", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.09em" }}>
                  New Status
                </label>
                <select
                  value={newPlotStatus}
                  onChange={(e: any) => setNewPlotStatus(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", border: `1px solid ${CARD_BORDER}`, borderRadius: 8, fontFamily: "Inter, sans-serif", fontSize: 13, background: "#fff", outline: "none" }}
                >
                  <option value="available">🟢 Available</option>
                  <option value="booked">🟡 Booked</option>
                  <option value="sold">🔴 Sold</option>
                </select>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setEditingPlot(null)}
                  style={{ flex: 1, padding: "11px", border: `1px solid ${CARD_BORDER}`, borderRadius: 8, background: "#fff", color: "#374151", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ flex: 1, padding: "11px", background: GOLD, border: "none", borderRadius: 8, color: "#fff", fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
                >
                  Save Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          MODAL: CREATE / EDIT BLOG POST
      ══════════════════════════════════════════════ */}
      {creatingBlog && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(12,26,48,0.55)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "#fff", width: "100%", maxWidth: 680, borderRadius: 18, padding: 36, boxShadow: "0 32px 80px rgba(0,0,0,0.3)", maxHeight: "88vh", overflowY: "auto", position: "relative" }}>
            <button
              onClick={() => setCreatingBlog(false)}
              style={{ position: "absolute", top: 20, right: 20, background: "none", border: "none", cursor: "pointer", color: "#9CA3AF" }}
            >
              <X size={20} />
            </button>

            <h3 style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 22, color: NAVY, margin: 0 }}>
              {editingBlog ? "Edit Article" : "Create New Article"}
            </h3>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#6B7280", marginTop: 6 }}>
              Publish SEO-optimized guides and news updates.
            </p>

            <form onSubmit={handleSaveBlogPost} style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 18 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600, color: "#6B7280", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.09em" }}>Title</label>
                  <input
                    type="text" required value={blogTitle}
                    onChange={(e) => setBlogTitle(e.target.value)}
                    placeholder="e.g. How to Buy Land Safely"
                    style={{ width: "100%", padding: "10px 12px", border: `1px solid ${CARD_BORDER}`, borderRadius: 8, fontFamily: "Inter, sans-serif", fontSize: 13, outline: "none", boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600, color: "#6B7280", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.09em" }}>URL Slug</label>
                  <input
                    type="text" value={blogSlug}
                    onChange={(e) => setBlogSlug(e.target.value)}
                    placeholder="how-to-buy-land-safely"
                    style={{ width: "100%", padding: "10px 12px", border: `1px solid ${CARD_BORDER}`, borderRadius: 8, fontFamily: "Inter, sans-serif", fontSize: 13, outline: "none", boxSizing: "border-box" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600, color: "#6B7280", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.09em" }}>Category</label>
                  <select
                    value={blogCategory} onChange={(e: any) => setBlogCategory(e.target.value)}
                    style={{ width: "100%", padding: "10px 12px", border: `1px solid ${CARD_BORDER}`, borderRadius: 8, fontFamily: "Inter, sans-serif", fontSize: 13, background: "#fff", outline: "none" }}
                  >
                    <option value="Investment">Investment</option>
                    <option value="Legal">Legal</option>
                    <option value="Buying Guide">Buying Guide</option>
                    <option value="Company News">Company News</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600, color: "#6B7280", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.09em" }}>Status</label>
                  <select
                    value={blogStatus} onChange={(e: any) => setBlogStatus(e.target.value)}
                    style={{ width: "100%", padding: "10px 12px", border: `1px solid ${CARD_BORDER}`, borderRadius: 8, fontFamily: "Inter, sans-serif", fontSize: 13, background: "#fff", outline: "none" }}
                  >
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600, color: "#6B7280", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.09em" }}>Featured Image URL</label>
                <input
                  type="text" value={blogImage}
                  onChange={(e) => setBlogImage(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                  style={{ width: "100%", padding: "10px 12px", border: `1px solid ${CARD_BORDER}`, borderRadius: 8, fontFamily: "Inter, sans-serif", fontSize: 13, outline: "none", boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600, color: "#6B7280", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.09em" }}>Summary</label>
                <textarea
                  required rows={2} value={blogSummary}
                  onChange={(e) => setBlogSummary(e.target.value)}
                  placeholder="Brief preview summary for listing cards..."
                  style={{ width: "100%", padding: "10px 12px", border: `1px solid ${CARD_BORDER}`, borderRadius: 8, fontFamily: "Inter, sans-serif", fontSize: 13, outline: "none", resize: "vertical", boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600, color: "#6B7280", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.09em" }}>
                  Content (Use double line breaks for paragraphs, ### for headings)
                </label>
                <textarea
                  required rows={8} value={blogContent}
                  onChange={(e) => setBlogContent(e.target.value)}
                  placeholder="Write article body here..."
                  style={{ width: "100%", padding: "10px 12px", border: `1px solid ${CARD_BORDER}`, borderRadius: 8, fontFamily: "Inter, sans-serif", fontSize: 13, outline: "none", resize: "vertical", boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600, color: "#6B7280", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.09em" }}>Tags (comma separated)</label>
                <input
                  type="text" value={blogTags}
                  onChange={(e) => setBlogTags(e.target.value)}
                  placeholder="Title Deeds, Legal, Diaspora"
                  style={{ width: "100%", padding: "10px 12px", border: `1px solid ${CARD_BORDER}`, borderRadius: 8, fontFamily: "Inter, sans-serif", fontSize: 13, outline: "none", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 10, borderTop: `1px solid ${CARD_BORDER}` }}>
                <button
                  type="button" onClick={() => setCreatingBlog(false)}
                  style={{ padding: "11px 20px", border: `1px solid ${CARD_BORDER}`, borderRadius: 9, background: "#fff", color: "#374151", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: "11px 24px", background: GOLD, border: "none", borderRadius: 9, color: "#fff", fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
                >
                  Save Post
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fade-in keyframe */}
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}

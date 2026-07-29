import { useEffect, useRef, useState } from "react";
import { Menu, X, ChevronDown, Users, Heart, Briefcase } from "lucide-react";
import { Link } from "@tanstack/react-router";
import logoIcon from "@/assets/logo-icon.png";

type NavLink = { label: string; href?: string; to?: string };

const mainLinks: NavLink[] = [
  { label: "Home", to: "/" },
  { label: "Properties", to: "/properties" },
  { label: "Diaspora", to: "/diaspora" },
  { label: "Locations", to: "/locations" },
  { label: "Blog", to: "/blog" },
  { label: "About Us", to: "/about" },
  { label: "Contact", to: "/contact" },
];

const portalLinks = [
  {
    label: "Client Hub",
    to: "/portal",
    icon: Users,
    desc: "Track your plot & payments",
  },
  {
    label: "Partner / Referral",
    to: "/partner",
    icon: Heart,
    desc: "Earn commissions by referring",
  },
  {
    label: "Careers",
    href: "/#careers",
    icon: Briefcase,
    desc: "Join our growing team",
    soon: true,
  },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showWarning, setShowWarning] = useState(true);
  const [portalsOpen, setPortalsOpen] = useState(false);
  const [mobilePortalsOpen, setMobilePortalsOpen] = useState(false);
  const portalsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (portalsRef.current && !portalsRef.current.contains(e.target as Node)) {
        setPortalsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const isHome = typeof window !== "undefined" && window.location.pathname === "/";
  const solid = scrolled || !isHome;

  const linkCls = (active: boolean) =>
    `relative text-[15px] font-medium tracking-wide transition-colors group ${
      solid ? "text-white hover:text-accent" : "text-foreground hover:text-primary"
    } ${active ? "text-accent" : ""}`;

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-400 ${
        solid ? "bg-primary shadow-[0_4px_24px_rgba(11,127,199,0.18)]" : "bg-transparent"
      }`}
    >

      <div className="mx-auto max-w-7xl px-6 lg:px-10 h-[100px] flex items-center justify-between">
        <Link
          to="/"
          className="flex items-center gap-3 min-w-0 mr-4"
          aria-label="Gatepath Realtors — Home"
        >
          <img
            src={logoIcon}
            alt="Gatepath Realtors"
            className="shrink-0 h-[64px] w-[64px] sm:h-[72px] sm:w-[72px] lg:h-[80px] lg:w-[80px]"
            style={{
              objectFit: "contain",
              display: "block",
              filter: "drop-shadow(0 4px 14px rgba(0,0,0,0.28))",
            }}
          />
          <span className="flex flex-col leading-tight min-w-0">
            <span
              className={`font-serif font-bold tracking-[0.04em] truncate ${solid ? "text-white" : "text-primary"}`}
              style={{ fontSize: "clamp(14px, 4.2vw, 23px)" }}
            >
              GATEPATH REALTORS
            </span>
            <span
              className="font-serif italic tracking-[0.02em] text-accent mt-0.5 truncate"
              style={{ fontSize: "clamp(10px, 2.6vw, 13px)" }}
            >
              Your Interest is Our Priority
            </span>
          </span>
        </Link>

        {/* DESKTOP NAV */}
        <nav className="hidden lg:flex items-center gap-5">
          {mainLinks.map((l) =>
            l.to ? (
              <Link
                key={l.label}
                to={l.to}
                className={linkCls(false)}
                activeProps={{ className: "text-accent" }}
              >
                {l.label}
                <span className="absolute -bottom-1 left-0 h-px w-0 bg-accent transition-all duration-300 group-hover:w-full" />
              </Link>
            ) : (
              <a key={l.label} href={l.href} className={linkCls(false)}>
                {l.label}
                <span className="absolute -bottom-1 left-0 h-px w-0 bg-accent transition-all duration-300 group-hover:w-full" />
              </a>
            ),
          )}

          {/* PORTALS DROPDOWN */}
          <div ref={portalsRef} className="relative">
            <button
              onClick={() => setPortalsOpen((v) => !v)}
              className={`flex items-center gap-1.5 text-[15px] font-medium tracking-wide transition-colors ${
                solid ? "text-white hover:text-accent" : "text-foreground hover:text-primary"
              } ${portalsOpen ? "text-accent" : ""}`}
              aria-haspopup="true"
              aria-expanded={portalsOpen}
            >
              Portals
              <ChevronDown
                size={15}
                className={`transition-transform duration-200 ${portalsOpen ? "rotate-180" : ""}`}
              />
            </button>

            {portalsOpen && (
              <div
                className="absolute top-[calc(100%+12px)] right-0 w-[280px] bg-white rounded-xl shadow-[0_16px_48px_rgba(0,0,0,0.14)] border border-[#E5E0D8] overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200"
                style={{ minWidth: "260px" }}
              >
                <div className="px-4 pt-3 pb-1.5 border-b border-[#F0EBE3]">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#A89E8C]">
                    Gatepath Portals
                  </p>
                </div>
                {portalLinks.map((pl) => {
                  const Icon = pl.icon;
                  const content = (
                    <div
                      key={pl.label}
                      className="flex items-start gap-3 px-4 py-3.5 hover:bg-[#F8F4EE] transition-colors group/item cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-lg bg-[#0B7FC7]/10 flex items-center justify-center shrink-0 mt-0.5 group-hover/item:bg-[#0B7FC7]/20 transition-colors">
                        <Icon size={15} className="text-[#0B7FC7]" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[14px] font-semibold text-[#1C1C1C] group-hover/item:text-[#0B7FC7] transition-colors">
                            {pl.label}
                          </span>
                          {pl.soon && (
                            <span className="text-[9px] font-bold uppercase tracking-wider bg-[#E8A020]/15 text-[#E8A020] px-1.5 py-0.5 rounded">
                              Soon
                            </span>
                          )}
                        </div>
                        <p className="text-[12px] text-[#8A8179] leading-snug mt-0.5">{pl.desc}</p>
                      </div>
                    </div>
                  );

                  return pl.to ? (
                    <Link
                      key={pl.label}
                      to={pl.to}
                      onClick={() => setPortalsOpen(false)}
                      className="block no-underline"
                    >
                      {content}
                    </Link>
                  ) : (
                    <a
                      key={pl.label}
                      href={pl.href}
                      onClick={() => setPortalsOpen(false)}
                      className="block no-underline"
                    >
                      {content}
                    </a>
                  );
                })}

                <div className="px-4 py-3 bg-[#F8F4EE] border-t border-[#EEEBE4] text-center">
                  <Link
                    to="/privacy"
                    onClick={() => setPortalsOpen(false)}
                    className="text-[12px] text-[#0B7FC7] hover:underline font-medium"
                  >
                    Privacy Policy &amp; Data Rights →
                  </Link>
                </div>
              </div>
            )}
          </div>
        </nav>

        <Link
          to="/properties"
          className="hidden lg:inline-flex items-center justify-center bg-gradient-to-r from-accent to-[#D4AF37] text-white px-6 py-3 text-sm font-bold rounded-lg hover:from-accent-dark hover:to-[#B3922D] hover:scale-[1.03] active:scale-[0.98] transition-all duration-300 shadow-[0_4px_12px_rgba(212,175,55,0.25)]"
        >
          Book Site Visit
        </Link>

        <button
          className={`lg:hidden p-2 shrink-0 ${solid ? "text-white" : "text-primary"}`}
          onClick={() => setOpen(true)}
          aria-label="Open menu"
        >
          <Menu size={24} />
        </button>
      </div>

      {/* MOBILE DRAWER BACKDROP */}
      <div
        className={`lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-opacity duration-300 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setOpen(false)}
      />

      {/* MOBILE DRAWER CONTAINER */}
      <div
        className={`lg:hidden fixed top-0 right-0 bottom-0 w-[300px] z-50 bg-primary shadow-2xl flex flex-col transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-6 py-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <img src={logoIcon} alt="Logo" className="w-10 h-10 object-contain" />
            <span className="font-serif font-bold text-white text-base tracking-[0.04em]">
              GATEPATH
            </span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="text-white/80 hover:text-white p-1 hover:scale-110 transition-transform"
            aria-label="Close menu"
          >
            <X size={22} />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-6">
          <nav className="flex flex-col gap-4">
            {mainLinks.map((l) =>
              l.to ? (
                <Link
                  key={l.label}
                  to={l.to}
                  onClick={() => setOpen(false)}
                  className="text-base font-medium text-white/90 hover:text-accent transition-colors py-1.5"
                  activeProps={{ className: "text-accent font-semibold" }}
                >
                  {l.label}
                </Link>
              ) : (
                <a
                  key={l.label}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="text-base font-medium text-white/90 hover:text-accent transition-colors py-1.5"
                >
                  {l.label}
                </a>
              ),
            )}
          </nav>

          {/* MOBILE PORTALS ACCORDION */}
          <div className="border-t border-white/10 pt-5">
            <button
              onClick={() => setMobilePortalsOpen((v) => !v)}
              className="w-full flex items-center justify-between text-base font-semibold text-white hover:text-accent transition-colors"
            >
              <span>Portals</span>
              <ChevronDown
                size={16}
                className={`transition-transform duration-200 ${mobilePortalsOpen ? "rotate-180" : ""}`}
              />
            </button>
            {mobilePortalsOpen && (
              <div className="mt-3 space-y-3.5 pl-3 border-l border-accent/40">
                {portalLinks.map((pl) => {
                  const Icon = pl.icon;
                  const inner = (
                    <div className="flex items-center gap-3 text-white/85 hover:text-accent transition-colors">
                      <div className="w-7 h-7 rounded bg-white/5 flex items-center justify-center shrink-0">
                        <Icon size={14} className="text-accent" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[14px] font-medium leading-none">{pl.label}</span>
                          {pl.soon && (
                            <span className="text-[8px] font-bold uppercase bg-accent/20 text-accent px-1.5 py-0.5 rounded">
                              Soon
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                  return pl.to ? (
                    <Link
                      key={pl.label}
                      to={pl.to}
                      onClick={() => {
                        setOpen(false);
                        setMobilePortalsOpen(false);
                      }}
                      className="block"
                    >
                      {inner}
                    </Link>
                  ) : (
                    <a
                      key={pl.label}
                      href={pl.href}
                      onClick={() => {
                        setOpen(false);
                        setMobilePortalsOpen(false);
                      }}
                      className="block"
                    >
                      {inner}
                    </a>
                  );
                })}
                <Link
                  to="/privacy"
                  onClick={() => {
                    setOpen(false);
                    setMobilePortalsOpen(false);
                  }}
                  className="block text-[12px] text-accent/80 hover:text-accent transition-colors pl-2 pt-1"
                >
                  Privacy Policy →
                </Link>
              </div>
            )}
          </div>

          <Link
            to="/properties"
            onClick={() => setOpen(false)}
            className="mt-4 inline-flex items-center justify-center bg-gradient-to-r from-accent to-[#D4AF37] text-white px-5 py-3.5 text-sm font-bold rounded-lg shadow-[0_4px_12px_rgba(212,175,55,0.25)] hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            Book Site Visit
          </Link>
        </div>
      </div>
    </header>
  );
}

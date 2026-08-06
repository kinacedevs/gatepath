import { useEffect, useRef, useState } from "react";
import {
  Menu,
  X,
  ChevronDown,
  Users,
  Heart,
  Briefcase,
  Phone,
  Facebook,
  Instagram,
  Music2,
  Youtube,
  Mail,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useContactInfo } from "@/hooks/useContactInfo";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";
import logoIcon from "@/assets/logo-icon.png";

type NavLink = { label: string; href?: string; to?: string };

const mainLinks: NavLink[] = [
  { label: "Home", to: "/" },
  { label: "Properties", to: "/properties" },
  { label: "Diaspora", to: "/diaspora" },
  { label: "Locations", to: "/locations" },
];

const aboutLinks: NavLink[] = [
  { label: "Who We Are", href: "/about#who-we-are" },
  { label: "CEO Message", href: "/about#ceo-message" },
  { label: "Our Team", href: "/about#our-team" },
  { label: "Our Journey", href: "/about#our-journey" },
  { label: "Visit Our Office", href: "/about#visit-us" },
];

const resourceLinks: NavLink[] = [
  { label: "Blog", to: "/blog" },
  { label: "Project Updates", href: "/blog?category=Project+Update" },
  { label: "FAQs", to: "/faqs" },
  { label: "Testimonials", href: "/#testimonials" },
  { label: "Gallery", to: "/gallery" },
  { label: "Downloads", to: "/downloads" },
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

// Lightweight link-only dropdown, reused for About Us / Resources so the
// header nav can group related pages without repeating the richer
// icon+description Portals dropdown's markup for a simpler case.
function SimpleNavDropdown({
  label,
  links,
  solid,
}: {
  label: string;
  links: NavLink[];
  solid: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 whitespace-nowrap text-[15px] font-medium tracking-wide transition-colors ${
          solid ? "text-white hover:text-accent" : "text-foreground hover:text-primary"
        } ${open ? "text-accent" : ""}`}
        aria-haspopup="true"
        aria-expanded={open}
      >
        {label}
        <ChevronDown
          size={15}
          className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute top-[calc(100%+12px)] left-0 min-w-[220px] bg-white rounded-xl shadow-[0_16px_48px_rgba(0,0,0,0.14)] border border-[#E5E0D8] overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200 py-1.5">
          {links.map((l) =>
            l.to ? (
              <Link
                key={l.label}
                to={l.to}
                onClick={() => setOpen(false)}
                className="block px-4 py-2.5 text-[14px] font-medium text-foreground hover:bg-ivory hover:text-primary transition-colors"
              >
                {l.label}
              </Link>
            ) : (
              <a
                key={l.label}
                href={l.href}
                onClick={() => setOpen(false)}
                className="block px-4 py-2.5 text-[14px] font-medium text-foreground hover:bg-ivory hover:text-primary transition-colors"
              >
                {l.label}
              </a>
            ),
          )}
        </div>
      )}
    </div>
  );
}

// Mobile-drawer counterpart to SimpleNavDropdown — same link set, an
// expand/collapse accordion instead of a hover/click popover (matches the
// drawer's existing Portals accordion interaction).
function MobileLinkAccordion({
  label,
  links,
  onNavigate,
}: {
  label: string;
  links: NavLink[];
  onNavigate: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-white/10 pt-5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between text-base font-semibold text-white hover:text-accent transition-colors"
      >
        <span>{label}</span>
        <ChevronDown
          size={16}
          className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="mt-3 space-y-3.5 pl-3 border-l border-accent/40">
          {links.map((l) =>
            l.to ? (
              <Link
                key={l.label}
                to={l.to}
                onClick={onNavigate}
                className="block text-[14px] font-medium text-white/85 hover:text-accent transition-colors"
              >
                {l.label}
              </Link>
            ) : (
              <a
                key={l.label}
                href={l.href}
                onClick={onNavigate}
                className="block text-[14px] font-medium text-white/85 hover:text-accent transition-colors"
              >
                {l.label}
              </a>
            ),
          )}
        </div>
      )}
    </div>
  );
}

// Slim contact/social strip above the main nav — an immediate, eye-catching
// way to reach Gatepath at first glance (matching the benchmark pattern from
// competitor sites) without permanently occupying space in the main nav row.
// Collapses away once the page scrolls, so the solid nav underneath stays
// uncluttered — the floating WhatsAppButton widget and the Contact page
// remain reachable at any scroll position.
function TopBar({
  phone,
  email,
  whatsappNumber,
  facebookUrl,
  instagramUrl,
  tiktokUrl,
  youtubeUrl,
}: {
  phone: string;
  email: string;
  whatsappNumber: string;
  facebookUrl: string;
  instagramUrl: string;
  tiktokUrl: string;
  youtubeUrl: string;
}) {
  const socials = [
    { Icon: Facebook, href: facebookUrl, label: "Facebook" },
    { Icon: Instagram, href: instagramUrl, label: "Instagram" },
    { Icon: Music2, href: tiktokUrl, label: "TikTok" },
    { Icon: Youtube, href: youtubeUrl, label: "YouTube" },
  ].filter((s) => s.href && s.href !== "#");

  return (
    <div className="hidden sm:flex items-center justify-between bg-primary-deep text-white/90 px-6 lg:px-10 h-9 text-[12px]">
      <div className="flex items-center gap-5">
        <a
          href={`tel:${phone.replace(/\s/g, "")}`}
          className="inline-flex items-center gap-1.5 hover:text-accent transition-colors font-medium"
        >
          <Phone size={12} /> {phone}
        </a>
        <a
          href={`mailto:${email}`}
          className="hidden lg:inline-flex items-center gap-1.5 hover:text-accent transition-colors font-medium"
        >
          <Mail size={12} /> {email}
        </a>
      </div>
      <div className="flex items-center gap-4">
        <a
          href={`https://wa.me/${whatsappNumber}?text=Hello%20Gatepath%20Realtors%2C%20I%20am%20interested%20in%20a%20land%20plot.`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 hover:text-accent transition-colors font-semibold"
        >
          <WhatsAppIcon size={13} /> Chat With Us
        </a>
        {socials.length > 0 && (
          <div className="flex items-center gap-3 pl-4 border-l border-white/20">
            {socials.map(({ Icon, href, label }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="text-white/80 hover:text-accent transition-colors"
              >
                <Icon size={14} />
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showWarning, setShowWarning] = useState(true);
  const [portalsOpen, setPortalsOpen] = useState(false);
  const [mobilePortalsOpen, setMobilePortalsOpen] = useState(false);
  const portalsRef = useRef<HTMLDivElement>(null);
  const contact = useContactInfo();

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
    `relative whitespace-nowrap text-[15px] font-medium tracking-wide transition-colors group ${
      solid ? "text-white hover:text-accent" : "text-foreground hover:text-primary"
    } ${active ? "text-accent" : ""}`;

  return (
    <header className="fixed top-0 inset-x-0 z-50">
      <TopBar
        phone={contact.phone}
        email={contact.email}
        whatsappNumber={contact.whatsappNumber}
        facebookUrl={contact.facebookUrl}
        instagramUrl={contact.instagramUrl}
        tiktokUrl={contact.tiktokUrl}
        youtubeUrl={contact.youtubeUrl}
      />
      <div
        className={`transition-all duration-400 ${
          solid ? "bg-primary shadow-[0_4px_24px_rgba(11,127,199,0.18)]" : "bg-transparent"
        }`}
      >
        <div className="mx-auto max-w-7xl px-6 lg:px-10 h-[100px] flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-3 shrink-0 mr-4"
            aria-label="Gatepath Realtors — Home"
          >
            <img
              src={logoIcon}
              alt="Gatepath Realtors"
              className="shrink-0 h-[56px] w-[56px] sm:h-[64px] sm:w-[64px] lg:h-[72px] lg:w-[72px]"
              style={{
                objectFit: "contain",
                display: "block",
                filter: "drop-shadow(0 4px 14px rgba(0,0,0,0.28))",
              }}
            />
            <span className="hidden sm:flex flex-col leading-tight whitespace-nowrap">
              <span
                className={`font-serif font-bold tracking-[0.03em] text-[17px] lg:text-[20px] ${solid ? "text-white" : "text-primary"}`}
              >
                GATEPATH REALTORS
              </span>
              <span className="font-serif italic tracking-[0.02em] text-accent mt-0.5 text-[11px] lg:text-[12px]">
                Your Interest is Our Priority
              </span>
            </span>
          </Link>

          {/* DESKTOP NAV */}
          <nav className="hidden xl:flex items-center gap-4">
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

            <SimpleNavDropdown label="About Us" links={aboutLinks} solid={solid} />
            <SimpleNavDropdown label="Resources" links={resourceLinks} solid={solid} />

            <Link
              to="/contact"
              className={linkCls(false)}
              activeProps={{ className: "text-accent" }}
            >
              Contact
              <span className="absolute -bottom-1 left-0 h-px w-0 bg-accent transition-all duration-300 group-hover:w-full" />
            </Link>

            {/* PORTALS DROPDOWN */}
            <div ref={portalsRef} className="relative">
              <button
                onClick={() => setPortalsOpen((v) => !v)}
                className={`flex items-center gap-1.5 whitespace-nowrap text-[15px] font-medium tracking-wide transition-colors ${
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
                        className="flex items-start gap-3 px-4 py-3.5 hover:bg-ivory transition-colors group/item cursor-pointer"
                      >
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5 group-hover/item:bg-primary/20 transition-colors">
                          <Icon size={15} className="text-primary" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[14px] font-semibold text-foreground group-hover/item:text-primary transition-colors">
                              {pl.label}
                            </span>
                            {pl.soon && (
                              <span className="text-[9px] font-bold uppercase tracking-wider bg-accent/15 text-accent px-1.5 py-0.5 rounded">
                                Soon
                              </span>
                            )}
                          </div>
                          <p className="text-[12px] text-[#8A8179] leading-snug mt-0.5">
                            {pl.desc}
                          </p>
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

                  <div className="px-4 py-3 bg-ivory border-t border-[#EEEBE4] text-center">
                    <Link
                      to="/privacy"
                      onClick={() => setPortalsOpen(false)}
                      className="text-[12px] text-primary hover:underline font-medium"
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
            className="hidden xl:inline-flex items-center justify-center bg-gradient-to-r from-accent to-accent-dark text-white px-6 py-3 text-sm font-bold rounded-lg hover:from-accent-dark hover:to-accent hover:scale-[1.03] active:scale-[0.98] transition-all duration-300 shadow-[0_4px_12px_rgba(232,160,32,0.25)]"
          >
            Book Site Visit
          </Link>

          <button
            className={`xl:hidden p-2 shrink-0 ${solid ? "text-white" : "text-primary"}`}
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={24} />
          </button>
        </div>
      </div>

      {/* MOBILE DRAWER BACKDROP */}
      <div
        className={`xl:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-opacity duration-300 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setOpen(false)}
      />

      {/* MOBILE DRAWER CONTAINER */}
      <div
        className={`xl:hidden fixed top-0 right-0 bottom-0 w-[300px] z-50 bg-primary shadow-2xl flex flex-col transition-transform duration-300 ${
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

        {/* Drawer Contact Actions */}
        <div className="flex items-center gap-2 px-6 pt-5">
          <a
            href={`tel:${contact.phone.replace(/\s/g, "")}`}
            className="flex-1 inline-flex items-center justify-center gap-1.5 text-[13px] font-semibold px-3 py-2.5 rounded-full border border-white/25 text-white hover:bg-white/10 transition-colors"
          >
            <Phone size={14} /> Call Us
          </a>
          <a
            href={`https://wa.me/${contact.whatsappNumber}?text=Hello%20Gatepath%20Realtors%2C%20I%20am%20interested%20in%20a%20land%20plot.`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 inline-flex items-center justify-center gap-1.5 text-[13px] font-bold px-3 py-2.5 rounded-full bg-[#25D366] text-white hover:bg-[#1EBE57] transition-colors"
          >
            <WhatsAppIcon size={14} /> Chat
          </a>
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
            <Link
              to="/contact"
              onClick={() => setOpen(false)}
              className="text-base font-medium text-white/90 hover:text-accent transition-colors py-1.5"
              activeProps={{ className: "text-accent font-semibold" }}
            >
              Contact
            </Link>
          </nav>

          <MobileLinkAccordion
            label="About Us"
            links={aboutLinks}
            onNavigate={() => setOpen(false)}
          />
          <MobileLinkAccordion
            label="Resources"
            links={resourceLinks}
            onNavigate={() => setOpen(false)}
          />

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
            className="mt-4 inline-flex items-center justify-center bg-gradient-to-r from-accent to-accent-dark text-white px-5 py-3.5 text-sm font-bold rounded-lg shadow-[0_4px_12px_rgba(232,160,32,0.25)] hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            Book Site Visit
          </Link>
        </div>
      </div>
    </header>
  );
}

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import logoIcon from "@/assets/logo-icon.png.asset.json";


type NavLink = { label: string; href?: string; to?: string };

const links: NavLink[] = [
  { label: "Home", to: "/" },
  { label: "Properties", to: "/properties" },
  { label: "Locations", href: "/#locations" },
  { label: "About Us", href: "/#about" },
  { label: "Contact", href: "/#contact" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Force solid bg on non-home routes
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
      <div className="mx-auto max-w-7xl px-6 lg:px-10 h-[120px] flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 mr-2" aria-label="Gatepath Realtors — Home">
          <img
            src={logoIcon.url}
            alt="Gatepath Realtors"
            className="shrink-0 h-[88px] w-[88px] sm:h-[120px] sm:w-[120px] lg:h-[140px] lg:w-[140px]"
            style={{
              objectFit: "contain",
              display: "block",
              filter: "drop-shadow(0 4px 14px rgba(0,0,0,0.28))",
            }}
          />
          <span className="flex flex-col leading-tight min-w-0 flex-1">
            <span className={`font-serif font-bold tracking-[0.04em] truncate ${solid ? "text-white" : "text-primary"}`} style={{ fontSize: "clamp(14px, 4.2vw, 23px)" }}>
              GATEPATH REALTORS
            </span>
            <span className="font-serif italic tracking-[0.02em] text-accent mt-0.5 truncate" style={{ fontSize: "clamp(10px, 2.6vw, 13px)" }}>
              Your Interest is Our Priority
            </span>
          </span>
        </Link>


        <nav className="hidden lg:flex items-center gap-9">
          {links.map((l) =>
            l.to ? (
              <Link key={l.label} to={l.to} className={linkCls(false)} activeProps={{ className: "text-accent" }}>
                {l.label}
                <span className="absolute -bottom-1 left-0 h-px w-0 bg-accent transition-all duration-300 group-hover:w-full" />
              </Link>
            ) : (
              <a key={l.label} href={l.href} className={linkCls(false)}>
                {l.label}
                <span className="absolute -bottom-1 left-0 h-px w-0 bg-accent transition-all duration-300 group-hover:w-full" />
              </a>
            )
          )}
        </nav>

        <a
          href="/#contact"
          className="hidden lg:inline-flex items-center justify-center bg-accent text-white px-6 py-3 text-sm font-semibold rounded-md hover:bg-[#C8861A] hover:scale-[1.02] transition-all duration-300"
        >
          Book Site Visit
        </a>

        <button
          className={`lg:hidden p-2 shrink-0 ${solid ? "text-white" : "text-primary"}`}
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {open && (
        <div className="lg:hidden bg-primary border-t border-white/10">
          <div className="px-6 py-6 flex flex-col gap-5">
            {links.map((l) =>
              l.to ? (
                <Link key={l.label} to={l.to} onClick={() => setOpen(false)} className="text-base text-white hover:text-accent transition-colors">
                  {l.label}
                </Link>
              ) : (
                <a key={l.label} href={l.href} onClick={() => setOpen(false)} className="text-base text-white hover:text-accent transition-colors">
                  {l.label}
                </a>
              )
            )}
            <a
              href="/#contact"
              onClick={() => setOpen(false)}
              className="inline-flex items-center justify-center bg-accent text-white px-5 py-3 text-sm font-semibold rounded-md"
            >
              Book Site Visit
            </a>
          </div>
        </div>
      )}
    </header>
  );
}

import { Facebook, Instagram, Music2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import logoIcon from "@/assets/logo-icon.png";


const locations = [
  "Malindi", "Mambrui", "Gongoni", "Diani", "Matuu", "Sagana",
  "Makutano", "Thika", "Juja", "Kithimani", "Kiambu", "Nanyuki",
];

export function Footer() {
  return (
    <footer id="contact" className="bg-[#063A61] text-white">
      <div className="mx-auto max-w-7xl px-6 lg:px-10 pt-20 pb-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
        {/* Brand */}
        <div>
          <Link to="/" aria-label="Gatepath Realtors — Home" className="flex items-center gap-3">
            <img
              src={logoIcon}
              alt="Gatepath Realtors"
              style={{
                height: 64,
                width: 64,
                objectFit: "contain",
                display: "block",
                filter: "drop-shadow(0 2px 8px rgba(232,160,32,0.25))",
              }}
            />
            <span className="flex flex-col leading-tight">
              <span className="font-serif font-bold text-[20px] tracking-[0.03em] text-white">
                GATEPATH
              </span>
              <span className="font-serif font-bold text-[20px] tracking-[0.03em] text-accent -mt-1">
                REALTORS
              </span>
            </span>
          </Link>

          <p className="mt-4 font-serif italic text-[18px] text-accent">
            "Your Interest is Our Priority."
          </p>
          <p className="mt-4 text-[14px] text-white/60 leading-relaxed">
            Trusted Kenyan land specialists. From the Coast to the Highlands — we help you own a piece of Kenya.
          </p>
          <div className="mt-6 flex gap-3">
            {[Facebook, Instagram, Music2].map((Icon, i) => (
              <a key={i} href="#" className="h-10 w-10 rounded-full border border-accent flex items-center justify-center text-white hover:bg-accent hover:text-primary transition-colors">
                <Icon size={16} strokeWidth={1.5} />
              </a>
            ))}
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h4 className="font-numbers font-medium text-[11px] tracking-[0.3em] text-accent">QUICK LINKS</h4>
          <ul className="mt-5 space-y-3 text-[14px] text-white/70">
            {[["Home","/"],["Properties","/properties"],["Locations","/properties"],["About Us","#about"],["Contact","#contact"]].map(([l,h]) => (
              <li key={l}>
                {h.startsWith("/") ? (
                  <Link to={h} className="hover:text-accent hover:underline transition-colors">{l}</Link>
                ) : (
                  <a href={h} className="hover:text-accent hover:underline transition-colors">{l}</a>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Locations */}
        <div>
          <h4 className="font-numbers font-medium text-[11px] tracking-[0.3em] text-accent">WHERE WE OPERATE</h4>
          <ul className="mt-5 grid grid-cols-2 gap-x-3 gap-y-2 text-[14px] text-white/70">
            {locations.map((l) => (
              <li key={l}><a href="#locations" className="hover:text-accent transition-colors">{l}</a></li>
            ))}
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h4 className="font-numbers font-medium text-[11px] tracking-[0.3em] text-accent">GET IN TOUCH</h4>
          <ul className="mt-5 space-y-4">
            <li>
              <a href="tel:+254799488488" className="text-[15px] font-medium text-white hover:text-accent">
                📞 +254 799 488 488
              </a>
            </li>
            <li>
              <a href="mailto:info@gatepathrealtors.com" className="text-[14px] text-accent hover:underline">
                ✉️ info@gatepathrealtors.com
              </a>
            </li>
            <li className="text-[13px] text-white/60 leading-relaxed">
              🏢 1st Floor, CNM Centre,<br />Ruiru Eastern Bypass, Nairobi
            </li>
            <li className="text-[13px] text-white/50">
              Mon–Fri: 8am–6pm | Sat: 9am–4pm
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto max-w-7xl px-6 lg:px-10 py-6 flex flex-col md:flex-row justify-between gap-2 text-[13px] text-white/50">
          <span>© {new Date().getFullYear()} Gatepath Realtors. All rights reserved.</span>
          <div className="flex gap-5">
            <a href="#" className="hover:text-accent">Privacy Policy</a>
            <a href="#" className="hover:text-accent">Terms of Use</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

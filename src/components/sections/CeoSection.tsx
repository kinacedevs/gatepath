import { Linkedin, Facebook, Instagram } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import ceoJoe from "@/assets/ceo-joe-muchiri.jpg.asset.json";

export function CeoSection() {
  return (
    <section className="bg-primary py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-10 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <Reveal className="relative mx-auto lg:mx-0">
          <div style={{ position: "relative", width: "100%", maxWidth: 460 }}>
            <img
              src={ceoJoe.url}
              alt="Joe Muchiri — CEO & Managing Director, Gatepath Realtors"
              style={{
                width: "100%",
                height: 540,
                objectFit: "cover",
                objectPosition: "center top",
                borderRadius: 12,
                border: "3px solid #E8A020",
                display: "block",
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: 20,
                left: 20,
                background: "rgba(7,75,125,0.92)",
                backdropFilter: "blur(8px)",
                border: "1px solid rgba(232,160,32,0.4)",
                borderRadius: 8,
                padding: "10px 16px",
              }}
            >
              <div
                style={{
                  fontFamily: "Montserrat, sans-serif",
                  fontWeight: 700,
                  fontSize: 16,
                  color: "white",
                  letterSpacing: "0.02em",
                }}
              >
                Joe Muchiri
              </div>
              <div
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontWeight: 400,
                  fontSize: 12,
                  color: "#E8A020",
                  marginTop: 2,
                }}
              >
                CEO &amp; Managing Director
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal>
          <span className="eyebrow">Leadership</span>
          <h2 className="mt-5 font-serif font-semibold text-[36px] md:text-[48px] text-white leading-[1.15]">
            Built on Trust.
            <br />
            Led by Joe Muchiri.
          </h2>
          <p className="mt-6 text-[17px] text-white/80 leading-[1.8]">
            Gatepath Realtors was founded with a single belief: that every Kenyan deserves access to secure, affordable land. Under the leadership of Joe Muchiri, we have grown from humble beginnings along the Thika corridor to serve clients across 12+ locations — from the Coast to the Rift Valley.
          </p>
          <p className="mt-4 text-[17px] text-white/80 leading-[1.8]">
            Every plot we sell has been personally verified. Every client we serve receives the same standard: clarity, respect, and integrity.
          </p>

          <blockquote className="mt-8 pl-6 border-l-4 border-accent">
            <p className="font-serif italic text-[24px] md:text-[26px] text-accent leading-snug">
              "Your Interest is Our Priority."
            </p>
          </blockquote>

          <div className="mt-8">
            <div
              style={{
                fontFamily: "Montserrat, sans-serif",
                fontWeight: 700,
                fontSize: 18,
                color: "white",
              }}
            >
              Joe Muchiri
            </div>
            <div
              style={{
                fontFamily: "Inter, sans-serif",
                fontWeight: 400,
                fontSize: 14,
                color: "#E8A020",
                marginTop: 2,
              }}
            >
              CEO &amp; Managing Director — Gatepath Realtors
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            {[Linkedin, Facebook, Instagram].map((Icon, i) => (
              <a key={i} href="#" className="h-10 w-10 border border-accent/50 rounded-full flex items-center justify-center text-accent hover:bg-accent hover:text-primary transition-colors">
                <Icon size={16} strokeWidth={1.5} />
              </a>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

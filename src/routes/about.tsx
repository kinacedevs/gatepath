import React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { ShieldCheck, Award, Users, Building, CheckCircle2, Phone, MapPin, Mail, Calendar } from "lucide-react";

export const Route = createFileRoute("/about")({
  component: AboutPage,
  head: () => ({
    meta: [
      { title: "About Us — Gatepath Realtors | Built on Trust & Integrity" },
      {
        name: "description",
        content:
          "Learn about Gatepath Realtors, founded by CEO Joe Muchiri. We empower local and diaspora Kenyans with verified land titles across 12 growing locations.",
      },
    ],
  }),
});

function AboutPage() {
  const staffMembers = [
    {
      name: "Joe Muchiri",
      role: "CEO & Managing Director",
      image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=80",
      bio: "Visionary founder committed to 100% title deed transparency and empowering everyday land ownership in Kenya.",
    },
    {
      name: "Mercy Wanjiku",
      role: "Head of Diaspora Relations",
      image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80",
      bio: "Dedicated advisor assisting diaspora clients across the UK, USA, UAE, and Canada with seamless remote conveyancing.",
    },
    {
      name: "David Ochieng",
      role: "Senior Legal Conveyancing Officer",
      image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80",
      bio: "Oversees land registry title searches, survey beacon verifications, and legal deed transfers.",
    },
    {
      name: "Grace Njeri",
      role: "Customer Operations Lead",
      image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80",
      bio: "Coordinates free guided site visits, M-Pesa payment receipts, and client onboarding.",
    },
  ];

  const milestones = [
    { year: "2018", title: "Company Founded", desc: "Gatepath Realtors established with a mission to make land buying transparent and fraud-free." },
    { year: "2020", title: "First 100 Title Deeds Delivered", desc: "Successfully issued and handed over 100 individual title deeds in Machakos & Kilifi." },
    { year: "2023", title: "Diaspora Concierge Hub Launched", desc: "Expanded remote buying services for Kenyans living in the UK, USA, Canada & UAE." },
    { year: "2026", title: "500+ Happy Landowners", desc: "Over 500 verified plots sold across 12 prime locations in Kenya." },
  ];

  return (
    <div className="min-h-screen bg-ivory text-foreground font-sans">
      <Navbar />

      {/* Hero Header */}
      <section className="relative pt-32 pb-20 bg-primary-deep text-white overflow-hidden">
        <div className="mx-auto max-w-7xl px-6 lg:px-10 relative z-10">
          <div className="max-w-3xl space-y-4">
            <span className="px-3 py-1 bg-accent/20 text-accent border border-accent/30 text-xs font-bold rounded-full uppercase tracking-wider">
              OUR STORY & VALUES
            </span>
            <h1 className="font-serif font-bold text-4xl sm:text-5xl lg:text-6xl leading-tight">
              Built on Trust. <span className="text-accent">Led by Joe Muchiri.</span>
            </h1>
            <p className="text-base text-slate-300 max-w-2xl leading-relaxed">
              Gatepath Realtors is Kenya's trusted land sales company. We believe every everyday Kenyan deserves affordable, fully verified land ownership backed by ready title deeds.
            </p>
          </div>
        </div>
      </section>

      {/* CEO Founder Letter Section */}
      <section className="mx-auto max-w-7xl px-6 lg:px-10 py-16">
        <div className="bg-white rounded-3xl border border-slate-200 p-8 lg:p-12 shadow-sm grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-5 relative">
            <div className="aspect-[4/5] rounded-2xl overflow-hidden shadow-lg border-4 border-primary-deep/10">
              <img
                src="https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=800&q=80"
                alt="Joe Muchiri CEO Gatepath Realtors"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute -bottom-4 right-4 bg-accent text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md">
              500+ Happy Landowners
            </div>
          </div>

          <div className="lg:col-span-7 space-y-6">
            <span className="text-xs font-bold uppercase tracking-widest text-accent">A Message From Our CEO</span>
            <h2 className="font-serif font-bold text-3xl sm:text-4xl text-primary-deep">
              "Your Interest is Our Priority — That Is Our Unbroken Promise."
            </h2>
            <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
              <p>
                When I founded Gatepath Realtors in 2018, I saw a market where hard-working Kenyans were terrified of land fraud, double allocations, and delayed title deeds. We set out to change that paradigm completely.
              </p>
              <p>
                Every plot of land listed on our platform undergoes rigorous survey beaconing, Ministry of Lands searches, and legal title verification. We don't just sell land — we secure your family's future.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center gap-4">
              <div>
                <h4 className="font-serif font-bold text-lg text-primary-deep">Joe Muchiri</h4>
                <p className="text-xs text-slate-500">CEO & Founder, Gatepath Realtors</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Growth History & Milestones */}
      <section className="bg-primary-deep text-white py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-10 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-widest text-accent">OUR JOURNEY</span>
            <h2 className="font-serif font-bold text-3xl sm:text-4xl">Milestones of Growth & Trust</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {milestones.map((m, idx) => (
              <div key={idx} className="bg-white/10 border border-white/15 backdrop-blur-md rounded-2xl p-6 space-y-3">
                <span className="font-stat-lg text-3xl font-extrabold text-accent">{m.year}</span>
                <h3 className="font-serif font-bold text-lg text-white">{m.title}</h3>
                <p className="text-xs text-slate-300 leading-relaxed">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Staff Roster & Leadership Team */}
      <section className="mx-auto max-w-7xl px-6 lg:px-10 py-16 space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs font-bold uppercase tracking-widest text-accent">OUR TEAM</span>
          <h2 className="font-serif font-bold text-3xl sm:text-4xl text-primary-deep">Meet the Gatepath Leadership</h2>
          <p className="text-sm text-slate-600">Dedicated legal officers, diaspora liaisons, and customer support managers.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {staffMembers.map((staff, idx) => (
            <div key={idx} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-center p-6 space-y-4">
              <div className="w-24 h-24 rounded-full overflow-hidden mx-auto border-2 border-accent">
                <img src={staff.image} alt={staff.name} className="w-full h-full object-cover" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-lg text-primary-deep">{staff.name}</h3>
                <span className="text-xs font-bold text-accent uppercase tracking-wider block mt-0.5">{staff.role}</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">{staff.bio}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Working Office Location & Google Map */}
      <section className="mx-auto max-w-7xl px-6 lg:px-10 py-12">
        <div className="bg-white rounded-3xl border border-slate-200 p-8 lg:p-12 shadow-sm space-y-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-accent">PHYSICAL HEADQUARTERS</span>
              <h3 className="font-serif font-bold text-2xl text-primary-deep mt-1">Visit Us at CNM Centre, Ruiru Bypass</h3>
            </div>
            <div className="text-xs text-slate-600 space-y-1">
              <p className="flex items-center gap-2"><MapPin size={14} className="text-accent" /> 1st Floor, CNM Centre, Ruiru Eastern Bypass, Nairobi</p>
              <p className="flex items-center gap-2"><Phone size={14} className="text-accent" /> +254 799 488 488 | Office Hours: Mon–Sat (8am – 6pm)</p>
            </div>
          </div>

          {/* Embedded Interactive Google Map */}
          <div className="w-full h-96 rounded-2xl overflow-hidden border border-slate-200 shadow-inner">
            <iframe
              title="Gatepath Realtors Head Office Location Map"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15955.776264627253!2d36.9554!3d-1.1556!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x182f40076a0c0001%3A0x6b6c000000000000!2sRuiru%20Eastern%20Bypass%2C%20Nairobi!5e0!3m2!1sen!2ske!4v1700000000000!5m2!1sen!2ske"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen={false}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </section>

      <Footer />
      <WhatsAppButton />
    </div>
  );
}

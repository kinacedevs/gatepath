import React, { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { MapPin, TrendingUp, Compass, ArrowRight, ShieldCheck, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/locations")({
  component: LocationsPage,
  head: () => ({
    meta: [
      { title: "Locations — Explore Gatepath Land Across 12 Kenyan Counties" },
      {
        name: "description",
        content:
          "Explore Gatepath Realtors land projects across Malindi, Diani, Thika, Sagana, Matuu, Juja, Nanyuki, and 5 more top growth regions in Kenya.",
      },
    ],
  }),
});

interface LocationDetail {
  id: string;
  name: string;
  county: string;
  region: string;
  image: string;
  startingPrice: number;
  appreciationRate: string;
  highlights: string[];
  distanceFromTown: string;
  activePhases: number;
  description: string;
}

const locationsData: LocationDetail[] = [
  {
    id: "malindi",
    name: "Malindi & Mambrui",
    county: "Kilifi County",
    region: "Coastal Region",
    image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
    startingPrice: 160000,
    appreciationRate: "+18% / year",
    highlights: ["Beach Proximity (10 mins)", "Malindi Airport Expansion", "Tarmacked Access Roads", "Water & Power On-Site"],
    distanceFromTown: "20 mins from Malindi CBD",
    activePhases: 5,
    description:
      "Malindi and Mambrui are Kenya's premier coastal growth hotspots. Driven by tourism infrastructure, resort expansions, and the Malindi-Lamu highway corridor, land values here offer exceptional high-yield appreciation.",
  },
  {
    id: "sagana",
    name: "Sagana & Makutano",
    county: "Kirinyaga County",
    region: "Central Kenya",
    image: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80",
    startingPrice: 749000,
    appreciationRate: "+15% / year",
    highlights: ["Kenol-Marua Dual Carriageway", "Fertile Red Soil", "River Tana Resort Zone", "Ready Title Deeds"],
    distanceFromTown: "5 mins from Sagana Town",
    activePhases: 1,
    description:
      "Nestled along the Kenol-Marua dual carriageway expansion, Sagana offers fertile agricultural land ideal for immediate settlement, holiday homes, or high-value commercial ventures.",
  },
  {
    id: "matuu",
    name: "Matuu & Kithimani",
    county: "Machakos County",
    region: "Eastern Region",
    image: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80",
    startingPrice: 320000,
    appreciationRate: "+14% / year",
    highlights: ["Thika-Garissa Highway Corridor", "Rapid Suburb Expansion", "Piped Water & Electricity", "Beaconed 50x100 Plots"],
    distanceFromTown: "5 mins from Matuu CBD",
    activePhases: 1,
    description:
      "Matuu is Machakos County's fastest growing commercial hub along the Thika-Garissa highway. Excellent soil stability, easy accessibility, and highly affordable entry prices.",
  },
  {
    id: "diani",
    name: "Diani & Ukunda",
    county: "Kwale County",
    region: "South Coast",
    image: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80",
    startingPrice: 450000,
    appreciationRate: "+20% / year",
    highlights: ["Voted Africa's Best Beach", "Ukunda Airstrip Upgrade", "Holiday Home Zone", "High Tourism Demand"],
    distanceFromTown: "12 mins from Diani Beach",
    activePhases: 1,
    description:
      "Diani is world-renowned for its white sandy beaches. Land plots here are ideal for boutique holiday villas, Airbnb vacation rentals, or long-term land banking.",
  },
  {
    id: "juja",
    name: "Juja & Thika Metro",
    county: "Kiambu County",
    region: "Nairobi Metro Corridor",
    image: "https://images.unsplash.com/photo-1473773508845-188df298d2d1?auto=format&fit=crop&w=1200&q=80",
    startingPrice: 2500000,
    appreciationRate: "+22% / year",
    highlights: ["Thika Superhighway Access", "Near JKUAT & Universities", "Commercial High-Density", "Instant Building Permit Zone"],
    distanceFromTown: "3 mins from Juja Town",
    activePhases: 1,
    description:
      "Prime commercial plot located within Juja's high-density student and residential zone. Ideal for commercial apartment complexes, shops, or institutional developments.",
  },
  {
    id: "nanyuki",
    name: "Nanyuki & Mt. Kenya Rim",
    county: "Laikipia County",
    region: "Rift Valley / Central",
    image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80",
    startingPrice: 500000,
    appreciationRate: "+16% / year",
    highlights: ["Mt. Kenya Scenic Views", "Cool Highland Climate", "Wildlife Conservancy Proximity", "Rapid Resort Growth"],
    distanceFromTown: "15 mins from Nanyuki Town",
    activePhases: 1,
    description:
      "Nanyuki is the premier highland investment zone. Enjoy breathtaking views of Mount Kenya and proximity to Ol Pejeta conservancy.",
  },
];

function LocationsPage() {
  const [selectedRegion, setSelectedRegion] = useState<string>("all");

  const filteredLocations = selectedRegion === "all"
    ? locationsData
    : locationsData.filter((loc) => loc.region.toLowerCase().includes(selectedRegion.toLowerCase()));

  return (
    <div className="min-h-screen bg-[#F8F4EE] text-foreground font-sans">
      <Navbar />

      {/* Hero Header */}
      <section className="relative pt-32 pb-20 bg-[#074B7D] text-white overflow-hidden">
        <div className="mx-auto max-w-7xl px-6 lg:px-10 relative z-10">
          <div className="max-w-3xl space-y-4">
            <span className="px-3 py-1 bg-[#E8A020]/20 text-[#E8A020] border border-[#E8A020]/30 text-xs font-bold rounded-full uppercase tracking-wider">
              REGIONAL DISCOVERY ENGINE
            </span>
            <h1 className="font-serif font-bold text-4xl sm:text-5xl lg:text-6xl leading-tight">
              Explore Land Across <span className="text-[#E8A020]">12 Prime Kenyan Locations</span>
            </h1>
            <p className="text-base text-slate-300 max-w-2xl leading-relaxed">
              From the white sands of Malindi to the agricultural valleys of Sagana and the high-growth corridors of Juja & Matuu — discover verified land backed by ready title deeds.
            </p>
          </div>

          {/* Region Filter Bar */}
          <div className="flex flex-wrap items-center gap-3 pt-8">
            {["all", "coastal", "central", "eastern", "nairobi metro"].map((reg) => (
              <button
                key={reg}
                onClick={() => setSelectedRegion(reg)}
                className={`px-5 py-2.5 rounded-xl font-semibold text-xs capitalize transition-all ${
                  selectedRegion === reg
                    ? "bg-[#E8A020] text-white shadow-md font-bold"
                    : "bg-white/10 text-slate-200 hover:bg-white/20 border border-white/10"
                }`}
              >
                {reg === "all" ? "All 12 Locations" : `${reg} Region`}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Main Locations Grid */}
      <section className="mx-auto max-w-7xl px-6 lg:px-10 py-16 space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredLocations.map((loc) => (
            <div
              key={loc.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all overflow-hidden flex flex-col justify-between"
            >
              <div>
                {/* Location Poster Image */}
                <div className="relative h-56 w-full overflow-hidden bg-slate-100">
                  <img
                    src={loc.image}
                    alt={loc.name}
                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  <span className="absolute top-4 left-4 bg-[#074B7D] text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    {loc.county}
                  </span>
                  <span className="absolute top-4 right-4 bg-green-500 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                    <TrendingUp size={12} /> {loc.appreciationRate}
                  </span>

                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <h3 className="font-serif font-bold text-2xl drop-shadow-md">{loc.name}</h3>
                    <p className="text-xs text-slate-200 flex items-center gap-1 mt-0.5">
                      <MapPin size={12} className="text-[#E8A020]" /> {loc.distanceFromTown}
                    </p>
                  </div>
                </div>

                {/* Body Details */}
                <div className="p-6 space-y-4">
                  <p className="text-xs text-slate-600 leading-relaxed">{loc.description}</p>

                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                      Key Infrastructure & Amenities
                    </span>
                    <div className="grid grid-cols-1 gap-1.5 text-xs text-slate-700">
                      {loc.highlights.map((h, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <CheckCircle2 size={14} className="text-[#22C55E] shrink-0" />
                          <span>{h}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Footer Price & CTA */}
              <div className="p-6 pt-0 border-t border-slate-100 mt-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Starting Price</span>
                  <span className="font-stat-lg text-lg font-extrabold text-[#0B7FC7]">
                    Ksh {loc.startingPrice.toLocaleString()}
                  </span>
                </div>

                <Link
                  to="/properties"
                  className="px-4 py-2.5 bg-[#074B7D] hover:bg-[#063A61] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  View Plots <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Office & Site Visit Banner */}
      <section className="bg-[#074B7D] text-white py-16 border-t border-white/10">
        <div className="mx-auto max-w-7xl px-6 lg:px-10 text-center space-y-6">
          <h2 className="font-serif font-bold text-3xl sm:text-4xl max-w-2xl mx-auto">
            Ready to Visit Your Desired Location?
          </h2>
          <p className="text-sm text-slate-300 max-w-xl mx-auto">
            Gatepath Realtor agents conduct free guided on-site visits every Wednesday and Saturday. Transport is fully provided.
          </p>
          <div className="flex justify-center gap-4 pt-2">
            <Link
              to="/book-visit"
              className="px-8 py-3.5 bg-[#E8A020] hover:bg-[#C8861A] text-white font-bold text-xs rounded-xl shadow-lg transition-all"
            >
              Book Free Site Visit Now →
            </Link>
          </div>
        </div>
      </section>

      <Footer />
      <WhatsAppButton />
    </div>
  );
}

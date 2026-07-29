import React from "react";
import { MapPin, ArrowRight, Download, FileText } from "lucide-react";
import { Link } from "@tanstack/react-router";

interface ProjectPreviewCard {
  slug: string;
  name: string;
  location: string;
  startingPrice: number;
  availableCount: number;
  totalPlots: number;
  image: string;
  status: "Active" | "Coming Soon";
}

const featuredProjects: ProjectPreviewCard[] = [
  {
    slug: "baraka-plains-phase-6",
    name: "Baraka Plains Phase 6",
    location: "Matuu, Machakos",
    startingPrice: 320000,
    availableCount: 12,
    totalPlots: 18,
    image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
    status: "Active",
  },
  {
    slug: "amani-gardens-phase-3",
    name: "Amani Gardens Phase 3",
    location: "Makutano, Sagana, Kirinyaga",
    startingPrice: 749000,
    availableCount: 22,
    totalPlots: 30,
    image: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80",
    status: "Active",
  },
  {
    slug: "watali-gardens-phase-1",
    name: "Watali Gardens Phase 1",
    location: "Marafa, Malindi, Kilifi",
    startingPrice: 250000,
    availableCount: 30,
    totalPlots: 40,
    image: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80",
    status: "Active",
  },
];

export function PropertyPreview() {
  return (
    <section className="bg-ivory py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-10 space-y-12">
        {/* Header matching Screenshot 4 */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-2">
            <span className="text-xs font-extrabold uppercase tracking-[0.25em] text-accent block">
              ACTIVE PROJECTS
            </span>
            <h2 className="font-serif font-bold text-4xl sm:text-5xl text-primary-deep">
              Land worth investing in.
            </h2>
          </div>
          <Link
            to="/properties"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary-deep transition-colors"
          >
            View all 9 projects <ArrowRight size={14} />
          </Link>
        </div>

        {/* 3 Active Project Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {featuredProjects.map((project) => (
            <div
              key={project.slug}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 overflow-hidden flex flex-col justify-between"
            >
              <div>
                {/* Poster Display Box */}
                <div className="relative h-56 w-full overflow-hidden bg-slate-100">
                  <img
                    src={project.image}
                    alt={project.name}
                    className="w-full h-full object-cover object-center transition-transform duration-500 hover:scale-105"
                  />
                  {/* Status Pill Badge */}
                  <span className="absolute top-4 left-4 bg-available text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-md">
                    {project.status}
                  </span>
                </div>

                {/* Card Content Body */}
                <div className="p-6 space-y-4">
                  <div>
                    <h3 className="font-serif font-bold text-2xl text-primary-deep hover:text-primary transition-colors">
                      <Link to="/properties/$slug" params={{ slug: project.slug }}>{project.name}</Link>
                    </h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                      <MapPin size={14} className="text-accent" /> {project.location}
                    </p>
                  </div>

                  {/* Availability Progress Rail */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-100">
                    <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                      <span>Plots Available: <strong className="text-available">{project.availableCount}</strong></span>
                      <span>Total: {project.totalPlots}</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
                      <div
                        className="bg-available h-full"
                        style={{ width: `${(project.availableCount / project.totalPlots) * 100}%` }}
                      />
                      <div
                        className="bg-[#F59E0B] h-full"
                        style={{ width: `${((project.totalPlots - project.availableCount) / 2 / project.totalPlots) * 100}%` }}
                      />
                      <div
                        className="bg-destructive h-full"
                        style={{ width: `${((project.totalPlots - project.availableCount) / 2 / project.totalPlots) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Footer Price & Map CTA */}
              <div className="p-6 pt-0 border-t border-slate-100 mt-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Starting Price</span>
                  <span className="font-stat-lg text-xl font-extrabold text-primary">
                    Ksh {project.startingPrice.toLocaleString()}
                  </span>
                </div>

                <Link
                  to="/properties/$slug"
                  params={{ slug: project.slug }}
                  className="px-4 py-2.5 bg-primary-deep hover:bg-footer-deep text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-md"
                >
                  Explore Map <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

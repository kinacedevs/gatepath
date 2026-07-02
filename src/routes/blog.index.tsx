import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { Search, BookOpen, Clock, ArrowRight, ShieldCheck, HelpCircle, FileText, Newspaper } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { supabase } from "@/lib/supabase";
import type { BlogPost } from "@/lib/types";

export const Route = createFileRoute("/blog/")({
  component: BlogIndexPage,
  head: () => ({
    meta: [
      { title: "Real Estate Investment & Guides — Gatepath Realtors Blog" },
      {
        name: "description",
        content:
          "Expert guides, legal insights, and investment tips for buying land in Kenya. Specially curated resources for local and diaspora investors.",
      },
      { property: "og:title", content: "Real Estate Investment & Guides — Gatepath Realtors Blog" },
      {
        property: "og:description",
        content: "Discover how to buy land safely and verify ownership in Kenya.",
      },
    ],
  }),
});

const CATEGORIES = ["All Articles", "Investment", "Legal", "Buying Guide", "Company News"] as const;

// Default high-quality fallback seed posts for initial render & empty DB fallback
const DEFAULT_POSTS: BlogPost[] = [
  {
    id: "seed-1",
    title: "How to Buy Land in Kenya Safely from the Diaspora: A Step-by-Step Guide",
    slug: "diaspora-buying-guide-kenya-land",
    summary: "Discover the critical legal checks, verification steps, and secure transaction workflows required to acquire title deeds in Kenya while living abroad.",
    content: `Buying land in Kenya from the diaspora has historically been associated with anxiety due to lack of transparency, family conflicts, or fraudulent brokers. However, with the modernization of land registries and robust digital escrow platforms, you can now purchase and verify your land with 100% confidence.

Here is a step-by-step roadmap to guide you:

### 1. Conduct a Official Land Search
Before paying even a single shilling, request a copy of the Title Deed and run an official search. You can perform this search on the **ArdhiSasa** platform (the Ministry of Lands digital portal) or submit it physically at the local registry. This confirms:
*   The true registered owner(s) of the parcel.
*   The size and boundaries of the property.
*   Whether the land has any encumbrances, charges, or court cautions.

### 2. Verify Land Registry Maps (Registry Index Map - RIM)
A land search shows ownership, but a survey map search confirms the physical existence of the plot. Acquire the RIM from the Survey Department. A qualified surveyor should verify the beacons on-site to ensure they match the map boundaries.

### 3. Choose a Verified Real Estate Partner
Never send money directly to family members or individual brokers without legal representation. Legitimate firms like Gatepath Realtors provide:
*   Pre-verified title deeds.
*   Clear escrow accounts where funds are held securely.
*   Direct interaction with legal counsel to oversee the contract.

### 4. Engage an Independent Advocate
Your advocate will draft or review the Agreement for Sale, verify the seller's documentation, and handle the land transfer forms.

By taking these measured steps, you protect your hard-earned foreign income and build long-term generational wealth in Kenya.`,
    featured_image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
    category: "Buying Guide",
    author_name: "Joe Muchiri",
    tags: ["Diaspora", "Title Deeds", "Legal Checks"],
    status: "published",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "seed-2",
    title: "Understanding Title Deeds in Kenya: Sectional vs. Freehold vs. Leasehold",
    slug: "understanding-title-deeds-kenya",
    summary: "A breakdown of the different types of land ownership ownership in Kenya and what they mean for your long-term investment strategy.",
    content: `If you are purchasing land in Kenya, one of the most critical decisions is understanding the tenure of the title deed you are receiving. Misunderstanding these terms can limit how you use your land or result in unexpected recurring costs.

### 1. Freehold Titles (Absolute Ownership)
A freehold title grants the owner unlimited, absolute ownership of the land. There is no time limit, and no rent is paid to the government. 
*   **Best for:** Residential development, agricultural land, and generational family assets.
*   **Tax implications:** Standard annual land rates apply, but no land rent.

### 2. Leasehold Titles (Time-Limited Ownership)
Leasehold land is owned by the government (or local authority) and leased to an individual for a specific period, typically 99 years for urban land. Once the lease expires, it can be renewed upon application.
*   **Best for:** Commercial parcels in major municipalities or gated master-planned projects.
*   **Costs:** Requires payment of annual land rent to the national government.

### 3. Sectional Titles (Individual Ownership in Shares)
Under the Sectional Properties Act, individual units within a shared block or gated estate receive independent title deeds for their space, alongside a shared portion of the common areas.

At Gatepath Realtors, we specialize in providing freehold titles for our plots in places like Malindi, Sagana, and Diani, giving you permanent control over your asset.`,
    featured_image: "https://images.unsplash.com/photo-1473773508845-188df298d2d1?auto=format&fit=crop&w=1200&q=80",
    category: "Legal",
    author_name: "Joe Muchiri",
    tags: ["Title Deeds", "Legal", "Land Rates"],
    status: "published",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "seed-3",
    title: "Why Sagana is Becoming Kenya's Hottest Real Estate Corridor",
    slug: "sagana-investment-boom",
    summary: "From adventure tourism to industrial hubs, discover the infrastructure drivers fueling double-digit appreciation rates in Sagana.",
    content: `Sagana, traditionally known for rapid water sports and transit farming, is undergoing an unprecedented real estate transformation. Strategically located along the Kenol-Sagana-Marua dual carriage superhighway, the area is attracting massive institutional interest.

Here are the key factors driving the investment boom in Sagana:

### 1. Infrastructure Expansion
The dualing of the Kenol-Sagana-Marua highway has slashed commute times from Nairobi to under 90 minutes. This makes Sagana highly accessible for weekend getaways and logistics hubs.

### 2. Tourism and Hospitality Growth
With white-water rafting, camping facilities, and luxury lodges along the Sagana River, the region is becoming a primary domestic tourism corridor. Owning holiday homes or Airbnb cottages here yields strong rental returns.

### 3. Industrial and Agricultural Corridors
The establishment of regional agro-processing hubs and warehouses is creating thousands of jobs, driving up demand for affordable residential housing plots.

Investing in projects like **Baraka Plains Phase 6** or **Amani Gardens Phase 3** places you directly in the path of this high-yield growth curve.`,
    featured_image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80",
    category: "Investment",
    author_name: "Joe Muchiri",
    tags: ["Sagana", "Infrastructure", "Appreciation"],
    status: "published",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
];

function BlogIndexPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [selectedCat, setSelectedCat] = useState<typeof CATEGORIES[number]>("All Articles");

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        // Attempt to fetch from Supabase
        const { data, error } = await supabase
          .from("blog_posts")
          .select("*")
          .eq("status", "published")
          .order("created_at", { ascending: false });

        if (error) {
          console.warn("Could not fetch blog posts from DB, using fallback seeds:", error.message);
          setPosts(DEFAULT_POSTS);
        } else if (!data || data.length === 0) {
          // If table is empty, auto-seed the defaults
          const { error: seedErr } = await supabase.from("blog_posts").insert(DEFAULT_POSTS);
          if (!seedErr) {
            setPosts(DEFAULT_POSTS);
          } else {
            setPosts(DEFAULT_POSTS);
          }
        } else {
          setPosts(data as BlogPost[]);
        }
      } catch (err) {
        console.error("Error loading blog:", err);
        setPosts(DEFAULT_POSTS);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, []);

  const filtered = useMemo(() => {
    return posts.filter((p) => {
      const matchCat = selectedCat === "All Articles" || p.category === selectedCat;
      const matchText =
        p.title.toLowerCase().includes(q.toLowerCase()) ||
        p.summary.toLowerCase().includes(q.toLowerCase()) ||
        p.tags.some((t) => t.toLowerCase().includes(q.toLowerCase()));
      return matchCat && matchText;
    });
  }, [posts, selectedCat, q]);

  const catIcons: Record<string, any> = {
    "All Articles": BookOpen,
    "Investment": ShieldCheck,
    "Legal": FileText,
    "Buying Guide": HelpCircle,
    "Company News": Newspaper,
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />

      {/* Header Banner */}
      <section className="bg-primary py-20 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-15 bg-cover bg-center" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80')" }} />
        <div className="mx-auto max-w-7xl px-6 lg:px-10 relative text-center">
          <span className="eyebrow text-accent">Gatepath Insights</span>
          <h1 className="mt-4 font-serif text-[40px] md:text-[56px] font-bold leading-tight max-w-3xl mx-auto">
            Knowledge Hub for Kenyan Property Investors
          </h1>
          <p className="mt-6 text-[18px] text-white/70 max-w-2xl mx-auto leading-relaxed">
            Avoid the pitfalls. Read about legal due diligence, land search processes, infrastructure developments, and investment trends.
          </p>
        </div>
      </section>

      {/* Filter / Search Bar */}
      <section className="bg-white border-b border-gray-100 py-6 sticky top-[100px] z-20 shadow-sm">
        <div className="mx-auto max-w-7xl px-6 lg:px-10 flex flex-col md:flex-row gap-6 justify-between items-center">
          
          {/* Categories Tab */}
          <div className="flex flex-wrap gap-2 justify-center md:justify-start">
            {CATEGORIES.map((cat) => {
              const Icon = catIcons[cat] || BookOpen;
              const active = selectedCat === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCat(cat)}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-full border transition-all duration-300 ${
                    active
                      ? "bg-accent border-accent text-white"
                      : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <Icon size={13} />
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Search bar */}
          <div className="relative w-full md:w-[320px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
            <input
              type="text"
              placeholder="Search topics or tags..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all bg-gray-50"
            />
          </div>
        </div>
      </section>

      {/* Main Grid */}
      <main className="flex-1 py-16 bg-gray-50/50">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          {loading ? (
            <div className="flex justify-center items-center py-32">
              <span className="animate-spin mr-3 text-accent h-6 w-6 border-2 border-accent border-t-transparent rounded-full" />
              <span className="text-gray-500 font-sans">Loading articles...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-24">
              <BookOpen size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-600 text-lg font-serif">No articles match your search.</p>
              <button onClick={() => { setSelectedCat("All Articles"); setQ(""); }} className="mt-4 text-accent hover:underline text-sm font-semibold">
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filtered.map((post) => (
                <article
                  key={post.id}
                  className="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300 flex flex-col h-full"
                >
                  {/* Image container */}
                  <div className="h-[210px] w-full overflow-hidden relative bg-gray-100 shrink-0">
                    <img
                      src={post.featured_image || "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80"}
                      alt={post.title}
                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                    />
                    <span className="absolute top-4 left-4 bg-primary text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded">
                      {post.category}
                    </span>
                  </div>

                  {/* Body content */}
                  <div className="p-6 flex flex-col flex-1 justify-between">
                    <div>
                      {/* Meta info */}
                      <div className="flex items-center gap-3 text-[11px] text-gray-400 font-sans">
                        <span className="font-semibold text-accent">{post.author_name}</span>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <Clock size={11} />
                          <span>{new Date(post.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                        </div>
                      </div>

                      {/* Title */}
                      <h2 className="mt-3 font-serif font-bold text-gray-900 text-lg hover:text-accent transition-colors leading-snug">
                        <Link to="/blog/$slug" params={{ slug: post.slug }}>
                          {post.title}
                        </Link>
                      </h2>

                      {/* Summary */}
                      <p className="mt-3 text-[13px] text-gray-500 leading-relaxed line-clamp-3">
                        {post.summary}
                      </p>
                    </div>

                    {/* Footer / tags */}
                    <div className="mt-6 pt-4 border-t border-gray-50 flex items-center justify-between">
                      <div className="flex gap-1.5 flex-wrap">
                        {post.tags.slice(0, 2).map((tag) => (
                          <span key={tag} className="text-[10px] bg-gray-50 border border-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">
                            #{tag}
                          </span>
                        ))}
                      </div>
                      <Link
                        to="/blog/$slug"
                        params={{ slug: post.slug }}
                        className="text-xs text-primary hover:text-accent font-bold uppercase tracking-wider flex items-center gap-1 group"
                      >
                        Read More
                        <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Floating high-converting blog CTA */}
      <section className="bg-primary py-12 text-white border-t border-accent/20">
        <div className="mx-auto max-w-7xl px-6 lg:px-10 flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h3 className="font-serif text-xl font-bold">Ready to secure a verified property?</h3>
            <p className="text-sm text-white/70 mt-1">Browse our list of verified land phases with ready title deeds.</p>
          </div>
          <Link to="/properties" className="bg-accent text-white px-6 py-3.5 text-xs uppercase tracking-wider font-bold rounded hover:bg-[#C8861A] transition-all">
            Explore Properties →
          </Link>
        </div>
      </section>

      <Footer />
      <WhatsAppButton />
    </div>
  );
}

import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Clock, Calendar, Share2, Award, ShieldCheck, Check } from "lucide-react";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { supabase } from "@/lib/supabase";
import type { BlogPost } from "@/lib/types";

export const Route = createFileRoute("/blog/$slug")({
  loader: async ({ params }) => {
    // We prefetch server-side if needed, but here we do simple client/server fetch
    const { data: dbPost, error } = await supabase
      .from("blog_posts")
      .select("*")
      .eq("slug", params.slug)
      .single();

    if (error || !dbPost) {
      console.warn(`[Blog Loader] Post with slug '${params.slug}' not found.`);
      throw notFound();
    }

    return { post: dbPost as BlogPost };
  },
  component: BlogPostPage,
  head: ({ loaderData }) => {
    const post = loaderData?.post;
    if (!post) return {};
    
    // Create structured JSON-LD Schema markup for Google
    const schemaMarkup = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "headline": post.title,
      "description": post.summary,
      "image": post.featured_image || "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80",
      "author": {
        "@type": "Person",
        "name": post.author_name
      },
      "publisher": {
        "@type": "Organization",
        "name": "Gatepath Realtors",
        "logo": {
          "@type": "ImageObject",
          "url": "https://hcnbgtnghvyyokspotfe.supabase.co/storage/v1/object/public/assets/logo-icon.png"
        }
      },
      "datePublished": post.created_at,
      "dateModified": post.updated_at
    };

    return {
      meta: [
        { title: `${post.title} — Gatepath Realtors Blog` },
        { name: "description", content: post.summary },
        // Open Graph
        { property: "og:title", content: post.title },
        { property: "og:description", content: post.summary },
        { property: "og:image", content: post.featured_image || "" },
        { property: "og:type", content: "article" },
        // Twitter
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: post.title },
        { name: "twitter:description", content: post.summary },
      ],
      // Inject Structured Data for Google crawler boost
      script: [
        {
          type: "application/ld+json",
          children: JSON.stringify(schemaMarkup)
        }
      ]
    };
  },
  notFoundComponent: () => (
    <div className="min-h-screen flex flex-col justify-between bg-gray-50">
      <Navbar />
      <div className="text-center py-32 px-6">
        <h1 className="font-serif text-4xl text-primary font-bold">Article Not Found</h1>
        <p className="mt-4 text-gray-500 max-w-md mx-auto">
          The article you are looking for might have been moved, deleted, or does not exist.
        </p>
        <Link to="/blog" className="mt-8 inline-flex items-center gap-2 bg-accent text-white px-6 py-3 rounded font-semibold text-sm uppercase tracking-wider hover:bg-[#C8861A] transition-all">
          <ArrowLeft size={16} /> Back to Blog
        </Link>
      </div>
      <Footer />
    </div>
  )
});

function BlogPostPage() {
  const { post } = Route.useLoaderData();
  const [copied, setCopied] = useState(false);
  const [related, setRelated] = useState<BlogPost[]>([]);

  useEffect(() => {
    const fetchRelated = async () => {
      const { data } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("category", post.category)
        .neq("id", post.id)
        .eq("status", "published")
        .limit(3);
      if (data) {
        setRelated(data as BlogPost[]);
      }
    };
    fetchRelated();
  }, [post]);

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="min-h-screen bg-white text-foreground flex flex-col">
      <Navbar />

      {/* Main Content Area */}
      <main className="flex-1 py-16 bg-gray-50/30">
        <div className="mx-auto max-w-4xl px-6 lg:px-10">
          
          {/* Breadcrumb / Back Link */}
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-accent transition-colors"
          >
            <ArrowLeft size={14} /> Back to Articles
          </Link>

          {/* Article Header */}
          <header className="mt-8">
            <span className="bg-accent/10 border border-accent/20 text-accent text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
              {post.category}
            </span>
            <h1 className="mt-5 font-serif font-bold text-gray-900 text-3xl md:text-5xl leading-tight">
              {post.title}
            </h1>
            <p className="mt-6 text-lg text-gray-500 leading-relaxed italic border-l-4 border-accent pl-5">
              {post.summary}
            </p>

            {/* Author / Date Meta */}
            <div className="mt-8 pt-6 border-t border-gray-100 flex flex-wrap gap-6 items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-accent text-white font-bold flex items-center justify-center text-sm shadow-sm">
                  JM
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                    {post.author_name}
                    <ShieldCheck size={14} className="text-[#E8A020]" />
                  </div>
                  <div className="text-xs text-gray-400 font-sans flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Calendar size={11} />
                      {new Date(post.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock size={11} /> 5 min read
                    </span>
                  </div>
                </div>
              </div>

              {/* Share Button */}
              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2 border border-gray-200 hover:border-accent hover:bg-accent/5 rounded-lg text-xs font-semibold uppercase tracking-wider text-gray-600 transition-all"
              >
                {copied ? <Check size={14} className="text-green-500" /> : <Share2 size={14} />}
                {copied ? "Link Copied!" : "Copy Link"}
              </button>
            </div>
          </header>

          {/* Featured Image */}
          <div className="mt-8 rounded-xl overflow-hidden shadow-lg h-[460px] w-full bg-gray-100">
            <img
              src={post.featured_image || "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80"}
              alt={post.title}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Article Body */}
          <article className="mt-12 prose prose-lg max-w-none font-sans text-gray-700 leading-relaxed text-[16px] md:text-[17px] space-y-6">
            {post.content.split("\n\n").map((para, i) => {
              if (para.startsWith("### ")) {
                return (
                  <h3 key={i} className="font-serif text-2xl font-bold text-gray-900 pt-6 pb-2">
                    {para.replace("### ", "")}
                  </h3>
                );
              }
              if (para.startsWith("* ")) {
                return (
                  <ul key={i} className="list-disc pl-6 space-y-2 pb-2">
                    {para.split("\n").map((item, j) => (
                      <li key={j}>{item.replace("* ", "")}</li>
                    ))}
                  </ul>
                );
              }
              return (
                <p key={i} className="whitespace-pre-line">
                  {para}
                </p>
              );
            })}
          </article>

          {/* Tags */}
          <div className="mt-12 pt-6 border-t border-gray-100 flex gap-2 flex-wrap">
            {post.tags.map((tag) => (
              <span key={tag} className="text-xs bg-gray-50 border border-gray-100 text-gray-500 px-3 py-1 rounded-full font-medium">
                #{tag}
              </span>
            ))}
          </div>

          {/* Author Showcase */}
          <section className="mt-16 p-6 rounded-xl border border-gray-100 bg-white shadow-sm flex flex-col sm:flex-row items-center gap-6">
            <div className="w-16 h-16 rounded-full bg-primary text-white font-bold flex items-center justify-center text-xl shrink-0">
              JM
            </div>
            <div className="text-center sm:text-left">
              <h4 className="font-serif font-bold text-gray-900 text-lg flex items-center justify-center sm:justify-start gap-1.5">
                Written by {post.author_name}
                <Award size={16} className="text-[#E8A020]" />
              </h4>
              <p className="mt-2 text-sm text-gray-500 leading-relaxed">
                Joe Muchiri is the CEO & Managing Director of Gatepath Realtors. With over a decade of experience in land surveying, title registration, and diaspora investments, Joe writes to demystify land acquisition in Kenya.
              </p>
            </div>
          </section>

          {/* Related Articles */}
          {related.length > 0 && (
            <section className="mt-24">
              <h3 className="font-serif text-2xl font-bold text-gray-900 mb-8">Related Articles</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {related.map((post) => (
                  <Link
                    key={post.id}
                    to="/blog/$slug"
                    params={{ slug: post.slug }}
                    className="group block bg-white rounded-lg border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300"
                  >
                    <div className="h-[140px] bg-gray-100 overflow-hidden">
                      <img src={post.featured_image || ""} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    </div>
                    <div className="p-4">
                      <span className="text-[9px] uppercase tracking-wider font-bold text-accent">{post.category}</span>
                      <h4 className="font-serif text-sm font-bold text-gray-900 mt-1 line-clamp-2 group-hover:text-accent transition-colors">{post.title}</h4>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

        </div>
      </main>

      <Footer />
      <WhatsAppButton />
    </div>
  );
}

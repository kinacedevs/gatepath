/**
 * Gatepath Realtors — Content & Blog Manager (Phase 5A mechanical split)
 * Relocated verbatim from the old "blog" tab (admin.tsx, previously
 * ~1885-1993), plus the "Create/Edit Blog Post" modal (previously
 * ~2858-2981). Same JSX, same inline styles, same NAVY hex — copied as-is,
 * not redesigned. The one real change: this tab's own scoped fetch
 * (blog_posts only) replaces the old shared 9-table Promise.all.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, BookOpen, Edit2, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAdminSession } from "@/context/AdminSessionContext";
import type { BlogPost } from "@/lib/types";

export const Route = createFileRoute("/admin/blog")({
  component: BlogManager,
});

const NAVY = "#0C1A30";
const GOLD = "var(--accent)";
const CARD_BORDER = "#E5E0D8";

function BlogManager() {
  const { adminRole, adminName } = useAdminSession();

  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  // Blog Management States
  const [creatingBlog, setCreatingBlog] = useState(false);
  const [editingBlog, setEditingBlog] = useState<BlogPost | null>(null);
  const [blogTitle, setBlogTitle] = useState("");
  const [blogSlug, setBlogSlug] = useState("");
  const [blogCategory, setBlogCategory] = useState<"Investment" | "Legal" | "Buying Guide" | "Company News">("Investment");
  const [blogSummary, setBlogSummary] = useState("");
  const [blogContent, setBlogContent] = useState("");
  const [blogTags, setBlogTags] = useState("");
  const [blogImage, setBlogImage] = useState("");
  const [blogStatus, setBlogStatus] = useState<"draft" | "published">("published");

  const loadData = async () => {
    setDataLoading(true);
    try {
      const blogRes = await supabase
        .from("blog_posts")
        .select("*")
        .order("created_at", { ascending: false });
      setBlogPosts((blogRes.data as BlogPost[]) ?? []);
    } catch (err) {
      console.error("Error loading blog data:", err);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveBlogPost = async (e: React.FormEvent) => {
    e.preventDefault();

    if (adminRole === "agent") {
      alert("Access Denied: Agents cannot manage blog posts.");
      return;
    }

    const postData = {
      title: blogTitle.trim(),
      slug: blogSlug.trim() || blogTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
      category: blogCategory,
      summary: blogSummary.trim(),
      content: blogContent.trim(),
      tags: blogTags.split(",").map((t) => t.trim()).filter(Boolean),
      featured_image: blogImage.trim() || null,
      status: blogStatus,
      author_name: adminName || "Joe Muchiri",
    };

    if (editingBlog) {
      const { error } = await ((supabase as any)
        .from("blog_posts")
        .update(postData)
        .eq("id", editingBlog.id));

      if (error) {
        alert("Error updating blog post: " + error.message);
      } else {
        setEditingBlog(null);
        setCreatingBlog(false);
        loadData();
      }
    } else {
      const { error } = await ((supabase as any)
        .from("blog_posts")
        .insert(postData));

      if (error) {
        alert("Error creating blog post: " + error.message);
      } else {
        setCreatingBlog(false);
        loadData();
      }
    }
  };

  const handleDeleteBlogPost = async (id: string) => {
    if (adminRole === "agent") {
      alert("Access Denied: Agents cannot delete blog posts.");
      return;
    }

    if (!confirm("Are you sure you want to delete this blog post?")) return;

    const { error } = await supabase
      .from("blog_posts")
      .delete()
      .eq("id", id);

    if (error) {
      alert("Error deleting post: " + error.message);
    } else {
      loadData();
    }
  };

  const openCreateBlog = () => {
    setEditingBlog(null);
    setBlogTitle("");
    setBlogSlug("");
    setBlogCategory("Investment");
    setBlogSummary("");
    setBlogContent("");
    setBlogTags("");
    setBlogImage("");
    setBlogStatus("published");
    setCreatingBlog(true);
  };

  const openEditBlog = (post: BlogPost) => {
    setEditingBlog(post);
    setBlogTitle(post.title);
    setBlogSlug(post.slug);
    setBlogCategory(post.category);
    setBlogSummary(post.summary);
    setBlogContent(post.content);
    setBlogTags(post.tags.join(", "));
    setBlogImage(post.featured_image || "");
    setBlogStatus(post.status);
    setCreatingBlog(true);
  };

  void dataLoading;

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 24, color: NAVY, margin: 0 }}>Content & Blog Manager</h1>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#6B7280", marginTop: 4 }}>
            Create and publish SEO articles to boost rankings and fuel Meta Ad campaigns.
          </p>
        </div>
        {adminRole !== "agent" && (
          <button
            onClick={openCreateBlog}
            style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: "10px 18px",
              background: GOLD,
              border: "none",
              borderRadius: 9,
              color: "#fff",
              fontFamily: "Montserrat, sans-serif",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            <Plus size={14} /> Add New Article
          </button>
        )}
      </div>

      <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${CARD_BORDER}`, boxShadow: "0 2px 12px rgba(12,26,48,0.05)", overflow: "hidden" }}>
        {blogPosts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "64px 20px" }}>
            <BookOpen size={40} style={{ color: "#E5E7EB", marginBottom: 12 }} />
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#9CA3AF" }}>No articles in the database yet.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#F9FAFB", borderBottom: `1px solid ${CARD_BORDER}` }}>
                  {["Image", "Title & Summary", "Category", "Author", "Status", "Actions"].map((h) => (
                    <th key={h} style={{ padding: "12px 20px", textAlign: "left", fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.09em" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {blogPosts.map((post, idx) => (
                  <tr
                    key={post.id}
                    style={{ borderBottom: idx < blogPosts.length - 1 ? `1px solid ${CARD_BORDER}` : "none" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "#F9FAFB"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "transparent"; }}
                  >
                    <td style={{ padding: "14px 20px" }}>
                      <div style={{ width: 56, height: 38, borderRadius: 6, overflow: "hidden", background: "#F3F4F6", border: `1px solid ${CARD_BORDER}` }}>
                        <img src={post.featured_image || ""} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>
                    </td>
                    <td style={{ padding: "14px 20px", maxWidth: 280 }}>
                      <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13, color: NAVY, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{post.title}</div>
                      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#9CA3AF", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{post.summary}</div>
                    </td>
                    <td style={{ padding: "14px 20px", fontFamily: "Inter, sans-serif", fontSize: 13, color: "#374151" }}>{post.category}</td>
                    <td style={{ padding: "14px 20px", fontFamily: "Inter, sans-serif", fontSize: 13, color: "#6B7280" }}>{post.author_name}</td>
                    <td style={{ padding: "14px 20px" }}>
                      <span style={{
                        fontFamily: "Inter, sans-serif", fontSize: 10, fontWeight: 700,
                        textTransform: "uppercase", letterSpacing: "0.07em",
                        padding: "4px 10px", borderRadius: 20,
                        background: post.status === "published" ? "#D1FAE5" : "#FEF3C7",
                        color: post.status === "published" ? "#059669" : "#D97706",
                      }}>
                        {post.status}
                      </span>
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      {adminRole !== "agent" ? (
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                          <button
                            onClick={() => openEditBlog(post)}
                            title="Edit"
                            style={{ padding: "7px", border: `1px solid ${CARD_BORDER}`, borderRadius: 7, background: "#fff", cursor: "pointer", color: "#6B7280" }}
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteBlogPost(post.id)}
                            title="Delete"
                            style={{ padding: "7px", border: `1px solid ${CARD_BORDER}`, borderRadius: 7, background: "#fff", cursor: "pointer", color: "#6B7280" }}
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "#9CA3AF", fontStyle: "italic" }}>View only</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════
          MODAL: CREATE / EDIT BLOG POST
      ══════════════════════════════════════════════ */}
      {creatingBlog && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(12,26,48,0.55)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "#fff", width: "100%", maxWidth: 680, borderRadius: 18, padding: 36, boxShadow: "0 32px 80px rgba(0,0,0,0.3)", maxHeight: "88vh", overflowY: "auto", position: "relative" }}>
            <button
              onClick={() => setCreatingBlog(false)}
              style={{ position: "absolute", top: 20, right: 20, background: "none", border: "none", cursor: "pointer", color: "#9CA3AF" }}
            >
              <X size={20} />
            </button>

            <h3 style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 22, color: NAVY, margin: 0 }}>
              {editingBlog ? "Edit Article" : "Create New Article"}
            </h3>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#6B7280", marginTop: 6 }}>
              Publish SEO-optimized guides and news updates.
            </p>

            <form onSubmit={handleSaveBlogPost} style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 18 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600, color: "#6B7280", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.09em" }}>Title</label>
                  <input
                    type="text" required value={blogTitle}
                    onChange={(e) => setBlogTitle(e.target.value)}
                    placeholder="e.g. How to Buy Land Safely"
                    style={{ width: "100%", padding: "10px 12px", border: `1px solid ${CARD_BORDER}`, borderRadius: 8, fontFamily: "Inter, sans-serif", fontSize: 13, outline: "none", boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600, color: "#6B7280", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.09em" }}>URL Slug</label>
                  <input
                    type="text" value={blogSlug}
                    onChange={(e) => setBlogSlug(e.target.value)}
                    placeholder="how-to-buy-land-safely"
                    style={{ width: "100%", padding: "10px 12px", border: `1px solid ${CARD_BORDER}`, borderRadius: 8, fontFamily: "Inter, sans-serif", fontSize: 13, outline: "none", boxSizing: "border-box" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600, color: "#6B7280", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.09em" }}>Category</label>
                  <select
                    value={blogCategory} onChange={(e: any) => setBlogCategory(e.target.value)}
                    style={{ width: "100%", padding: "10px 12px", border: `1px solid ${CARD_BORDER}`, borderRadius: 8, fontFamily: "Inter, sans-serif", fontSize: 13, background: "#fff", outline: "none" }}
                  >
                    <option value="Investment">Investment</option>
                    <option value="Legal">Legal</option>
                    <option value="Buying Guide">Buying Guide</option>
                    <option value="Company News">Company News</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600, color: "#6B7280", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.09em" }}>Status</label>
                  <select
                    value={blogStatus} onChange={(e: any) => setBlogStatus(e.target.value)}
                    style={{ width: "100%", padding: "10px 12px", border: `1px solid ${CARD_BORDER}`, borderRadius: 8, fontFamily: "Inter, sans-serif", fontSize: 13, background: "#fff", outline: "none" }}
                  >
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600, color: "#6B7280", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.09em" }}>Featured Image URL</label>
                <input
                  type="text" value={blogImage}
                  onChange={(e) => setBlogImage(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                  style={{ width: "100%", padding: "10px 12px", border: `1px solid ${CARD_BORDER}`, borderRadius: 8, fontFamily: "Inter, sans-serif", fontSize: 13, outline: "none", boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600, color: "#6B7280", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.09em" }}>Summary</label>
                <textarea
                  required rows={2} value={blogSummary}
                  onChange={(e) => setBlogSummary(e.target.value)}
                  placeholder="Brief preview summary for listing cards..."
                  style={{ width: "100%", padding: "10px 12px", border: `1px solid ${CARD_BORDER}`, borderRadius: 8, fontFamily: "Inter, sans-serif", fontSize: 13, outline: "none", resize: "vertical", boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600, color: "#6B7280", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.09em" }}>
                  Content (Use double line breaks for paragraphs, ### for headings)
                </label>
                <textarea
                  required rows={8} value={blogContent}
                  onChange={(e) => setBlogContent(e.target.value)}
                  placeholder="Write article body here..."
                  style={{ width: "100%", padding: "10px 12px", border: `1px solid ${CARD_BORDER}`, borderRadius: 8, fontFamily: "Inter, sans-serif", fontSize: 13, outline: "none", resize: "vertical", boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600, color: "#6B7280", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.09em" }}>Tags (comma separated)</label>
                <input
                  type="text" value={blogTags}
                  onChange={(e) => setBlogTags(e.target.value)}
                  placeholder="Title Deeds, Legal, Diaspora"
                  style={{ width: "100%", padding: "10px 12px", border: `1px solid ${CARD_BORDER}`, borderRadius: 8, fontFamily: "Inter, sans-serif", fontSize: 13, outline: "none", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 10, borderTop: `1px solid ${CARD_BORDER}` }}>
                <button
                  type="button" onClick={() => setCreatingBlog(false)}
                  style={{ padding: "11px 20px", border: `1px solid ${CARD_BORDER}`, borderRadius: 9, background: "#fff", color: "#374151", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: "11px 24px", background: GOLD, border: "none", borderRadius: 9, color: "#fff", fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
                >
                  Save Post
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}

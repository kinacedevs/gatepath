/**
 * Gatepath Realtors — Knowledge Base / SOPs (Part 2 module, never started
 * until now)
 *
 * Purely an internal staff reference tool — sales scripts, site-visit
 * procedures, payment/title-deed policy references — not customer-facing,
 * so knowledge_base_articles has no public RLS policy at all (migration
 * 0041), unlike blog_posts/testimonials/faqs.
 *
 * Direct client writes gated by adminRole !== "agent" — same risk tier and
 * pattern already established for Blog Posts/Site Content/Campaigns
 * (marketing/content curation, not money or PII). Reuses the existing
 * RichTextEditor/SafeRichText pair built for Property Content Studio
 * (Phase 40D) rather than building a second rich-text pattern.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Search, BookOpen, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAdminSession } from "@/context/AdminSessionContext";
import { KpiCard } from "@/components/admin/KpiCard";
import { SectionCard } from "@/components/admin/SectionCard";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { EmptyState } from "@/components/admin/EmptyState";
import { FreshnessStamp } from "@/components/admin/FreshnessStamp";
import { Skeleton } from "@/components/ui/skeleton";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { SafeRichText } from "@/components/SafeRichText";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { KnowledgeBaseArticle } from "@/lib/types";

export const Route = createFileRoute("/admin/knowledge-base")({
  component: KnowledgeBase,
});

const DEFAULT_CATEGORIES = [
  "Sales Process",
  "Site Visits",
  "Payments & Installments",
  "Legal & Title Deeds",
  "Customer Service",
  "General",
];

function KnowledgeBase() {
  const { adminName, sessionUser, adminRole } = useAdminSession();
  const canWrite = adminRole !== "agent";

  const [articles, setArticles] = useState<KnowledgeBaseArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [openArticleId, setOpenArticleId] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState(DEFAULT_CATEGORIES[0]);
  const [formContent, setFormContent] = useState("");
  const [formPublished, setFormPublished] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("knowledge_base_articles")
      .select("*")
      .order("category")
      .order("display_order");
    setArticles((data as KnowledgeBaseArticle[]) ?? []);
    setLastUpdated(new Date());
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const categories = useMemo(() => {
    const fromData = new Set(articles.map((a) => a.category));
    return Array.from(new Set([...DEFAULT_CATEGORIES, ...fromData])).sort();
  }, [articles]);

  const visibleArticles = useMemo(() => {
    const q = search.trim().toLowerCase();
    return articles.filter((a) => {
      if (!canWrite && !a.is_published) return false;
      if (categoryFilter !== "all" && a.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        a.title.toLowerCase().includes(q) ||
        a.content
          .toLowerCase()
          .replace(/<[^>]+>/g, " ")
          .includes(q)
      );
    });
  }, [articles, search, categoryFilter, canWrite]);

  const openCreate = () => {
    setEditingId(null);
    setFormTitle("");
    setFormCategory(categoryFilter !== "all" ? categoryFilter : DEFAULT_CATEGORIES[0]);
    setFormContent("");
    setFormPublished(true);
    setMsg(null);
    setDialogOpen(true);
  };

  const openEdit = (article: KnowledgeBaseArticle) => {
    setEditingId(article.id);
    setFormTitle(article.title);
    setFormCategory(article.category);
    setFormContent(article.content);
    setFormPublished(article.is_published);
    setMsg(null);
    setDialogOpen(true);
  };

  const submitArticle = async () => {
    if (!formTitle.trim()) {
      setMsg("A title is required.");
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      if (editingId) {
        const { error } = await (supabase as any)
          .from("knowledge_base_articles")
          .update({
            title: formTitle.trim(),
            category: formCategory,
            content: formContent,
            is_published: formPublished,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("knowledge_base_articles").insert({
          title: formTitle.trim(),
          category: formCategory,
          content: formContent,
          is_published: formPublished,
          display_order: articles.filter((a) => a.category === formCategory).length,
          created_by_email: sessionUser.email,
          created_by_name: adminName,
        });
        if (error) throw error;
      }
      setDialogOpen(false);
      await loadData();
    } catch (err: any) {
      setMsg("Error: " + (err?.message || "Something went wrong."));
    } finally {
      setSaving(false);
    }
  };

  const deleteArticle = async (id: string) => {
    if (!confirm("Delete this article? This cannot be undone.")) return;
    try {
      const { error } = await supabase.from("knowledge_base_articles").delete().eq("id", id);
      if (error) throw error;
      if (openArticleId === id) setOpenArticleId(null);
      await loadData();
    } catch (err: any) {
      alert("Error: " + (err?.message || "Something went wrong."));
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex justify-between items-start flex-wrap gap-3">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-primary font-bold">
            Knowledge Base
          </h1>
          <p className="text-body-md text-on-surface-variant">
            Internal sales scripts, procedures, and policy references — not visible to clients.
          </p>
          <FreshnessStamp updatedAt={lastUpdated} />
        </div>
        {canWrite && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg font-semibold text-sm hover:bg-primary-deep transition-colors"
          >
            <Plus size={16} /> New Article
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Articles" value={String(articles.length)} icon={BookOpen} />
        <KpiCard
          label="Published"
          value={String(articles.filter((a) => a.is_published).length)}
          icon={BookOpen}
        />
        <KpiCard
          label="Drafts"
          value={String(articles.filter((a) => !a.is_published).length)}
          icon={BookOpen}
        />
        <KpiCard label="Categories" value={String(categories.length)} icon={BookOpen} />
      </div>

      <SectionCard>
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search articles..."
              className="w-full pl-9 pr-3 py-2.5 border border-outline-variant/40 rounded-lg text-sm outline-none focus:border-primary"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2.5 border border-outline-variant/40 rounded-lg text-sm outline-none bg-white"
          >
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {visibleArticles.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No articles yet"
            description={
              canWrite
                ? "Create the first Knowledge Base article to get started."
                : "No articles have been published yet."
            }
          />
        ) : (
          <div className="flex flex-col gap-2">
            {visibleArticles.map((article) => {
              const isOpen = openArticleId === article.id;
              return (
                <div
                  key={article.id}
                  className="border border-outline-variant/30 rounded-xl overflow-hidden"
                >
                  <button
                    onClick={() => setOpenArticleId(isOpen ? null : article.id)}
                    className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-surface-container-low transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-semibold text-[14px] text-primary truncate">
                        {article.title}
                      </span>
                      <StatusBadge tone="info">{article.category}</StatusBadge>
                      {!article.is_published && <StatusBadge tone="neutral">Draft</StatusBadge>}
                    </div>
                    {canWrite && (
                      <div
                        className="flex items-center gap-1 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => openEdit(article)}
                          className="p-1.5 rounded hover:bg-black/5 text-on-surface-variant"
                          aria-label="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => deleteArticle(article.id)}
                          className="p-1.5 rounded hover:bg-error-container text-error"
                          aria-label="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </button>
                  {isOpen && (
                    <div className="p-4 pt-0 border-t border-outline-variant/20">
                      <SafeRichText html={article.content} className="text-[13px] pt-3" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Article" : "New Article"}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            {msg && <p className="text-xs text-error">{msg}</p>}
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">
                Title
              </label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="w-full px-3 py-2.5 border border-outline-variant/40 rounded-lg text-sm outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">
                Category
              </label>
              <input
                type="text"
                list="kb-categories"
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="w-full px-3 py-2.5 border border-outline-variant/40 rounded-lg text-sm outline-none focus:border-primary"
              />
              <datalist id="kb-categories">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">
                Content
              </label>
              <RichTextEditor value={formContent} onChange={setFormContent} />
            </div>
            <label className="flex items-center gap-2 text-sm text-primary cursor-pointer">
              <input
                type="checkbox"
                checked={formPublished}
                onChange={(e) => setFormPublished(e.target.checked)}
              />
              Published (visible to all staff, not just editors)
            </label>
          </div>
          <DialogFooter>
            <button
              onClick={() => setDialogOpen(false)}
              className="px-4 py-2.5 rounded-lg text-sm font-semibold text-on-surface-variant hover:bg-black/5"
            >
              Cancel
            </button>
            <button
              onClick={submitArticle}
              disabled={saving}
              className="px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary-deep disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Article"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

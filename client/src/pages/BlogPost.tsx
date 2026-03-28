import { Link, useParams } from "wouter";
import { getPostBySlug, getRecentPosts } from "../data/blogPosts";

// Minimal markdown-to-HTML: handles headers, bold, lists, tables, horizontal rules
function renderMarkdown(text: string): string {
  return text
    // Headings
    .replace(/^### (.+)$/gm, "<h3 class='text-xl font-bold text-slate-900 mt-8 mb-3'>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2 class='text-2xl font-bold text-slate-900 mt-10 mb-4'>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1 class='text-3xl font-bold text-slate-900 mt-12 mb-6'>$1</h1>")
    // Bold
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    // Italic
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // Horizontal rule
    .replace(/^---$/gm, "<hr class='my-8 border-slate-200' />")
    // Unordered list items
    .replace(/^- (.+)$/gm, "<li class='ml-4 list-disc'>$1</li>")
    // Numbered list items
    .replace(/^\d+\. (.+)$/gm, "<li class='ml-4 list-decimal'>$1</li>")
    // Tables (basic)
    .replace(/^\|(.+)\|$/gm, (match) => {
      if (match.includes("---")) return "";
      const cells = match.slice(1, -1).split("|").map((c) => `<td class='border border-slate-200 px-3 py-2 text-sm'>${c.trim()}</td>`).join("");
      return `<tr>${cells}</tr>`;
    })
    // Paragraphs (blank lines)
    .replace(/\n\n/g, "</p><p class='text-slate-700 leading-relaxed mb-4'>");
}

export default function BlogPost() {
  const params = useParams<{ slug: string }>();
  const post = getPostBySlug(params.slug);
  const recent = getRecentPosts(3).filter((p) => p.slug !== params.slug);

  if (!post) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-4">Post Not Found</h1>
          <Link href="/blog" className="text-primary hover:underline">
            ← Back to Blog
          </Link>
        </div>
      </div>
    );
  }

  const htmlContent = renderMarkdown(post.content);

  return (
    <>
      <title>{post.title} | EvoFit Meals Blog</title>

      {/* OG meta via document head — basic inline script for SPAs without Helmet */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            document.title = ${JSON.stringify(post.title + " | EvoFit Meals Blog")};
          `,
        }}
      />

      <div className="min-h-screen bg-slate-50">
        {/* Breadcrumb */}
        <div className="bg-white border-b border-slate-100 px-4 py-3">
          <div className="max-w-3xl mx-auto text-sm text-slate-500">
            <Link href="/" className="hover:text-primary">Home</Link>
            {" / "}
            <Link href="/blog" className="hover:text-primary">Blog</Link>
            {" / "}
            <span className="text-slate-700">{post.title}</span>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 py-12">
          {/* Header */}
          <div className="mb-8">
            <span className="bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wide px-3 py-1 rounded-full">
              {post.category}
            </span>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mt-4 mb-4 leading-tight">
              {post.title}
            </h1>
            <div className="flex items-center gap-4 text-sm text-slate-500">
              <span>{post.author}</span>
              <span>·</span>
              <span>
                {new Date(post.date).toLocaleDateString("en-CA", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
              <span>·</span>
              <span>{post.readTime} min read</span>
            </div>
          </div>

          {/* Content */}
          <article
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ __html: `<p class='text-slate-700 leading-relaxed mb-4'>${htmlContent}</p>` }}
          />

          {/* Tags */}
          <div className="mt-10 pt-6 border-t border-slate-200">
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span key={tag} className="bg-slate-100 text-slate-600 text-xs px-3 py-1 rounded-full">
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          {/* Back */}
          <div className="mt-8">
            <Link href="/blog" className="text-primary hover:underline text-sm">
              ← Back to Blog
            </Link>
          </div>

          {/* Related Posts */}
          {recent.length > 0 && (
            <div className="mt-12 pt-8 border-t border-slate-200">
              <h3 className="text-lg font-bold text-slate-900 mb-6">More from the Blog</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {recent.map((p) => (
                  <Link key={p.slug} href={`/blog/${p.slug}`}>
                    <div className="bg-white rounded-lg p-4 border border-slate-100 hover:shadow-md transition-shadow cursor-pointer">
                      <span className="text-xs text-primary font-semibold uppercase">{p.category}</span>
                      <p className="text-sm font-semibold text-slate-900 mt-1 leading-snug">{p.title}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

import { Link } from "wouter";
import { blogPosts } from "../data/blogPosts";

export default function Blog() {
  return (
    <>
      {/* SEO meta — injected via Helmet if available, else static */}
      <title>EvoFit Meals Blog | Nutrition Science, GLP-1, Meal Prep</title>

      <div className="min-h-screen bg-slate-50">
        {/* Hero */}
        <div className="bg-gradient-to-br from-primary to-primary/80 text-white py-16 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl font-bold mb-4">EvoFit Meals Blog</h1>
            <p className="text-xl text-primary-foreground/85">
              Nutrition science, meal planning strategies, and the latest on GLP-1 &amp; peptide therapies.
            </p>
          </div>
        </div>

        {/* Posts Grid */}
        <div className="max-w-5xl mx-auto px-4 py-12">
          <div className="grid gap-8 md:grid-cols-2">
            {blogPosts.map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`}>
                <article className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow cursor-pointer overflow-hidden border border-slate-100">
                  {/* Category Badge */}
                  <div className="bg-primary/10 px-4 py-2">
                    <span className="text-xs font-semibold text-primary uppercase tracking-wide">
                      {post.category}
                    </span>
                  </div>

                  <div className="p-6">
                    <h2 className="text-xl font-bold text-slate-900 mb-3 leading-snug hover:text-primary transition-colors">
                      {post.title}
                    </h2>
                    <p className="text-slate-600 text-sm leading-relaxed mb-4">
                      {post.excerpt}
                    </p>

                    {/* Meta */}
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>
                        {new Date(post.date).toLocaleDateString("en-CA", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </span>
                      <span>{post.readTime} min read</span>
                    </div>

                    {/* Tags */}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {post.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded-full"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

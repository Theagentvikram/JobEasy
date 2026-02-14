import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Share2, Calendar, User, Tag } from 'lucide-react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';

// Mock Data - In a real app, this would come from an API/CMS
const BLOG_POSTS: Record<string, any> = {
    "ats-2024": {
        title: "How to beat the ATS in 2024",
        category: "Resume Tips",
        date: "Mar 15, 2024",
        author: "Sarah Jenkins",
        image: "https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&q=80&w=2400",
        content: `
      <p class="mb-6 text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
        The Applicant Tracking System (ATS) is the gatekeeper of the modern hiring process. 
        It's estimated that 75% of resumes are never seen by a human eye. Here's how to change that.
      </p>

      <h3 class="text-2xl font-bold text-gray-900 dark:text-white mb-4">1. Use Standard Formatting</h3>
      <p class="mb-6 text-gray-600 dark:text-gray-300 leading-relaxed">
        While creative resumes look great to humans, robots struggle with columns, graphics, and tables. 
        Stick to a clean, single-column layout for the best results.
      </p>

      <h3 class="text-2xl font-bold text-gray-900 dark:text-white mb-4">2. Keywords are King</h3>
      <p class="mb-6 text-gray-600 dark:text-gray-300 leading-relaxed">
        Read the job description carefully. If they ask for "Python" and "Django", ensure those exact words appear 
        in your skills section. Our ATS scanner can help you identify missing keywords automatically.
      </p>

      <h3 class="text-2xl font-bold text-gray-900 dark:text-white mb-4">3. Save as PDF (correctly)</h3>
      <p class="mb-6 text-gray-600 dark:text-gray-300 leading-relaxed">
        Always save your resume as a text-based PDF. If you scan an image of your resume into a PDF wrapper, 
        the ATS sees nothing but a blank page.
      </p>
    `
    },
    "bullet-points": {
        title: "The secret to writing bullet points that sell",
        category: "Career Growth",
        date: "Mar 12, 2024",
        author: "Mike Ross",
        image: "https://images.unsplash.com/photo-1512486130939-2c4f79935e4f?auto=format&fit=crop&q=80&w=2400",
        content: `
      <p class="mb-6 text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
        "Responsible for sales" tells me nothing. "Increased sales by 40% YoY" tells me 
        you're a high performer. Here's a formula for powerful bullet points.
      </p>
      
      <div class="bg-emerald-50 dark:bg-emerald-900/20 p-6 rounded-xl border border-emerald-100 dark:border-emerald-800 my-8">
        <p class="font-bold text-emerald-800 dark:text-emerald-400 text-lg text-center">
          Action Verb + Task + Result (Quantified)
        </p>
      </div>

      <p class="mb-6 text-gray-600 dark:text-gray-300 leading-relaxed">
        Instead of listing duties, list achievements. Use strong verbs like "Spearheaded", "Optimized", 
        and "Architected" instead of "Did" or "Helped".
      </p>
    `
    },
    "keywords-context": {
        title: "Keywords vs. Context: What AI looks for",
        category: "Technology",
        date: "Mar 10, 2024",
        author: "AI Research Team",
        image: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&q=80&w=2400",
        content: `
      <p class="mb-6 text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
        Modern AI doesn't just keyword stuff. It understands semantic context. 
        "Java" the coffee is different from "Java" the language.
      </p>

      <p class="mb-6 text-gray-600 dark:text-gray-300 leading-relaxed">
        This means you don't need to hide keywords in white text (a myth from 2010). 
        You need to use them in sentences that demonstrate your expertise.
      </p>
    `
    }
};

export const BlogDetail: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    // Find post by ID or simple matching logic
    const post = id && BLOG_POSTS[id] ? BLOG_POSTS[id] : null;

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    if (!post) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-8 dark:bg-black">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Article not found</h2>
                <button onClick={() => navigate('/')} className="text-emerald-600 dark:text-emerald-400 hover:underline">Return Home</button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white dark:bg-[#020c07] font-sans text-gray-900 dark:text-gray-100 transition-colors duration-300">
            <Navbar isLoggedIn={false} userEmail={null} onLogout={() => { }} />

            <main className="pt-24 pb-24">
                {/* Article Header */}
                <div className="max-w-4xl mx-auto px-6 mb-12">
                    <button
                        onClick={() => navigate('/')}
                        className="group flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 mb-8 transition-colors"
                    >
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                        Back to Home
                    </button>

                    <div className="flex items-center gap-4 mb-6">
                        <span className="px-3 py-1 rounded-full text-sm font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                            {post.category}
                        </span>
                        <span className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 font-medium">
                            <Calendar size={14} />
                            {post.date}
                        </span>
                    </div>

                    <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white tracking-tight leading-tight mb-8">
                        {post.title}
                    </h1>

                    <div className="flex items-center justify-between border-y border-gray-100 dark:border-emerald-500/10 py-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-neutral-800 flex items-center justify-center">
                                <User size={20} className="text-gray-400 dark:text-gray-500" />
                            </div>
                            <div>
                                <div className="font-bold text-sm text-gray-900 dark:text-white">{post.author}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">Editor, JobEasy</div>
                            </div>
                        </div>
                        <button className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                            <Share2 size={18} />
                            <span className="text-sm font-semibold hidden sm:inline">Share</span>
                        </button>
                    </div>
                </div>

                {/* Featured Image */}
                <div className="max-w-5xl mx-auto px-4 md:px-6 mb-16">
                    <div className="aspect-video w-full overflow-hidden rounded-3xl shadow-xl dark:shadow-none dark:ring-1 dark:ring-white/10">
                        <img
                            src={post.image}
                            alt={post.title}
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="max-w-3xl mx-auto px-6">
                    <div
                        className="prose prose-lg prose-emerald dark:prose-invert text-gray-600 dark:text-gray-300"
                        dangerouslySetInnerHTML={{ __html: post.content }}
                    />

                    {/* CTA */}
                    <div className="mt-16 bg-gray-900 dark:bg-emerald-950/80 dark:border dark:border-emerald-500/10 rounded-2xl p-8 md:p-12 text-center text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl -mr-16 -mt-16"></div>
                        <div className="relative z-10">
                            <h3 className="text-2xl font-bold mb-4">Ready to optimize your resume?</h3>
                            <p className="text-gray-400 mb-8 max-w-lg mx-auto">Use our AI scanner to check your resume against the strategies in this article.</p>
                            <button onClick={() => navigate('/login')} className="px-8 py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-emerald-500/25 transform hover:-translate-y-1">
                                Analyze My Resume Free
                            </button>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
};

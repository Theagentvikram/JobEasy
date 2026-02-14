import React from 'react';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Blog: React.FC = () => {
  const navigate = useNavigate();

  const posts = [
    {
      id: "ats-2024",
      title: "How to beat the ATS in 2024",
      category: "Resume Tips",
      date: "Mar 15, 2024",
      color: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
      image: "https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&q=80&w=800"
    },
    {
      id: "bullet-points",
      title: "The secret to writing bullet points that sell",
      category: "Career Growth",
      date: "Mar 12, 2024",
      color: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400",
      image: "https://images.unsplash.com/photo-1512486130939-2c4f79935e4f?auto=format&fit=crop&q=80&w=800"
    },
    {
      id: "keywords-context",
      title: "Keywords vs. Context: What AI looks for",
      category: "Technology",
      date: "Mar 10, 2024",
      color: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
      image: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&q=80&w=800"
    }
  ];

  return (
    <section id="blog" className="py-24 relative dark:bg-[#020c07] transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="flex justify-between items-end mb-12">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Latest Insights</h2>
            <p className="text-gray-500 dark:text-gray-400">Expert advice to supercharge your job search.</p>
          </div>
          <button className="hidden md:flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold hover:gap-3 transition-all">
            View all articles <ArrowRight size={18} />
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {posts.map((post, i) => (
            <div key={i} onClick={() => navigate(`/blog/${post.id}`)} className="group cursor-pointer">
              <div className="h-48 bg-gray-100 dark:bg-slate-800 rounded-2xl mb-6 relative overflow-hidden transition-colors">
                <img src={post.image} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>
              <div className="flex items-center gap-3 mb-3">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${post.color}`}>
                  {post.category}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">{post.date}</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                {post.title}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                Learn the strategies that are helping thousands of candidates land interviews at top tech companies...
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
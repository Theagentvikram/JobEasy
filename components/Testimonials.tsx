import React from 'react';
import { Star } from 'lucide-react';

export const Testimonials: React.FC = () => {
  const testimonials = [
    {
      name: "Sarah Jenkins",
      role: "Product Manager",
      company: "TechGiant",
      text: "I was applying for months with no luck. After running my resume through JobFlow, I realized my formatting was breaking ATS parsers. Fixed it, and got 3 interviews in a week.",
      avatar: "SJ"
    },
    {
      name: "David Chen",
      role: "Software Engineer",
      company: "StartupX",
      text: "The keyword gap analysis is a game changer. It explicitly told me which skills I had but forgot to list. Highly recommended.",
      avatar: "DC"
    },
    {
      name: "Elena Rodriguez",
      role: "Marketing Director",
      company: "Creative Co",
      text: "Simple, fast, and effective. The AI suggestions for my bullet points made my experience sound much more impactful.",
      avatar: "ER"
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-b from-transparent to-white/50 dark:to-slate-900/50">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Loved by Job Seekers</h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">Join thousands of professionals who have accelerated their career search with JobFlow.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((t, i) => (
            <div key={i} className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 hover:shadow-lg transition-all duration-300 flex flex-col">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={16} className="fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-gray-600 dark:text-gray-300 mb-6 italic leading-relaxed flex-grow">"{t.text}"</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold text-sm">
                  {t.avatar}
                </div>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white text-sm">{t.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{t.role} at {t.company}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
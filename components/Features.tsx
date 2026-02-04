import React from 'react';
import { Search, PenTool, Lightbulb, CheckCircle2 } from 'lucide-react';

export const Features: React.FC = () => {
  return (
    <section id="features" className="py-24 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 md:px-6 relative z-10">
        <div className="text-center mb-20">
           <div className="inline-block mb-4 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold tracking-wide uppercase">
             Key Capabilities
           </div>
           <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6 tracking-tight">Everything you need to<br/>land the perfect job.</h2>
           <p className="text-gray-500 max-w-2xl mx-auto text-lg">
             JobFlow isn't just a scanner. It's a complete AI career studio designed to build, refine, and perfect your professional narrative.
           </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
          {/* Feature 1: ATS Review */}
          <div className="p-8 lg:p-10 rounded-3xl bg-white/60 backdrop-blur-md border border-white/60 shadow-lg hover:shadow-emerald-100/40 transition-all duration-500 group">
            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <Search className="text-blue-600" size={28} />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Deep ATS Audit</h3>
            <p className="text-gray-600 leading-relaxed">
              Our auditor simulates enterprise-grade ATS algorithms used by Fortune 500s. We parse your PDF to identify unreadable sections, formatting errors, and keyword gaps before you apply.
            </p>
          </div>

          {/* Feature 2: AI Builder */}
          <div className="p-8 lg:p-10 rounded-3xl bg-white/60 backdrop-blur-md border border-white/60 shadow-lg hover:shadow-emerald-100/40 transition-all duration-500 group">
            <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <PenTool className="text-purple-600" size={28} />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Section-wise AI Builder</h3>
            <p className="text-gray-600 leading-relaxed">
              Don't start from scratch. Build your resume block by block. Our AI suggests impactful bullet points for your specific role—be it "Senior Engineer" or "Marketing Intern"—customized to your experience level.
            </p>
          </div>

          {/* Feature 3: Smart Suggestions */}
          <div className="p-8 lg:p-10 rounded-3xl bg-white/60 backdrop-blur-md border border-white/60 shadow-lg hover:shadow-emerald-100/40 transition-all duration-500 group">
            <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <Lightbulb className="text-amber-600" size={28} />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Contextual Suggestions</h3>
            <p className="text-gray-600 leading-relaxed">
              Stuck on the "Summary" section? Our AI analyzes your experience and writes 3 unique professional summaries for you to choose from. It's like having a career coach sitting next to you.
            </p>
          </div>

          {/* Feature 4: Post-Review */}
          <div className="p-8 lg:p-10 rounded-3xl bg-white/60 backdrop-blur-md border border-white/60 shadow-lg hover:shadow-emerald-100/40 transition-all duration-500 group">
            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <CheckCircle2 className="text-emerald-600" size={28} />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Final AI Verification</h3>
            <p className="text-gray-600 leading-relaxed">
              Once you're done building, run the "Final Polish". We check for grammar, consistency, active voice usage, and impact metrics to ensure your resume is in the top 1% of applicants.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
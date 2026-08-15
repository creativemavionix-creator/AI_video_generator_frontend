import { Sparkles, Wand2, Flame, Star, FolderOpen, ArrowRight, TrendingUp } from 'lucide-react';
import {
  MOCK_GALLERY, QUICK_TEMPLATES, AI_SUGGESTIONS, STYLE_LIBRARY,
  RECENT_PROJECTS, CREDIT_USAGE, ANALYTICS,
} from '../../../../data/videoGeneratorMockData';
import VideoThumb from './VideoThumb';

export default function DashboardTab({ onNavigate }: { onNavigate: (tab: any) => void }) {
  const recent = MOCK_GALLERY.slice(0, 6);
  const favorites = MOCK_GALLERY.filter((v) => v.favorite).slice(0, 4);
  const popularStyles = STYLE_LIBRARY.filter((s) => s.popular).slice(0, 6);

  return (
    <div className="space-y-8">
      {/* Prompt hero */}
      <div className="reveal-up rounded-3xl p-6 sm:p-8 relative overflow-hidden bg-white dark:bg-[#0b0b14]">
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full  blur-3xl" />
        <div className="absolute -left-10 bottom-0 w-52 h-52 rounded-full  blur-3xl" />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider">
            <Sparkles size={12} /> AI Creative Suite
          </span>
          <h2 className="mt-4 text-2xl sm:text-3xl font-black max-w-xl">Turn any idea into a cinematic video in seconds.</h2>
          <p className="mt-2 text-sm  max-w-lg">
            Describe a scene, pick a style and color grade, and let MaVionix Motion generate a
            ready-to-publish video for your brand.
          </p>
          <div className="mt-5 flex flex-col sm:flex-row gap-3">
            <div className="flex-1 rounded-2xl bg-white/10 border border-white/15 px-4 py-3 text-sm backdrop-blur">
              e.g. "A sleek 15-second product ad, studio lighting, slow orbit camera…"
            </div>
            <button
              onClick={() => onNavigate('create')}
              className="btn-primary inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black hover:-translate-y-0.5 transition-transform"
            >
              <Wand2 size={16} /> Start Generating
            </button>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 reveal-up reveal-delay-1">
        {[
          { label: 'Generations this month', value: ANALYTICS.monthly.at(-1)?.generations, icon: TrendingUp },
          { label: 'Total generations', value: ANALYTICS.totals.totalGenerations, icon: Sparkles },
          { label: 'Active projects', value: ANALYTICS.totals.activeProjects, icon: FolderOpen },
          { label: 'Credits remaining', value: `${CREDIT_USAGE.total - CREDIT_USAGE.used}`, icon: Flame },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0b14] p-4">
            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-300">
              <stat.icon size={15} />
            </div>
            <p className="mt-3 text-xl font-black">{stat.value}</p>
            <p className="text-[11.5px] text-slate-500 dark:text-slate-400">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent projects */}
        <div className="lg:col-span-2 space-y-6">
          <div className="reveal-up reveal-delay-1">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-black uppercase tracking-wide">Recent Video Projects</h3>
              <button onClick={() => onNavigate('gallery')} className="text-[12px] font-bold text-purple-600 dark:text-purple-300 inline-flex items-center gap-1">
                View gallery <ArrowRight size={13} />
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {recent.map((v) => (
                <div key={v.id} className="group">
                  <VideoThumb video={v} className="aspect-video" />
                  <p className="mt-1.5 text-[12px] font-semibold truncate">{v.title}</p>
                  <p className="text-[10.5px] text-slate-400">{v.style} · {v.resolution}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick templates */}
          <div className="reveal-up reveal-delay-2">
            <h3 className="text-sm font-black uppercase tracking-wide mb-3">Quick Templates</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {QUICK_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => onNavigate('create')}
                  className="text-left rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0b14] p-4 hover:border-purple-300 dark:hover:border-purple-700 hover:-translate-y-0.5 transition-all"
                >
                  <p className="text-[13px] font-bold">{t.label}</p>
                  <p className="mt-1 text-[11.5px] text-slate-500 dark:text-slate-400 line-clamp-2">{t.prompt}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar column */}
        <div className="space-y-6">
          {/* AI suggestions */}
          <div className="reveal-up reveal-delay-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0b14] p-4">
            <h3 className="text-[12.5px] font-black uppercase tracking-wide flex items-center gap-1.5 mb-3">
              <Sparkles size={14} className="text-purple-500" /> AI Recommendations
            </h3>
            <ul className="space-y-2.5">
              {AI_SUGGESTIONS.slice(0, 4).map((s, i) => (
                <li key={i} className="text-[12px] leading-snug text-slate-600 dark:text-slate-300 flex gap-2">
                  <span className="text-purple-500 mt-0.5">•</span>{s}
                </li>
              ))}
            </ul>
          </div>

          {/* Featured styles */}
          <div className="reveal-up reveal-delay-3">
            <h3 className="text-[12.5px] font-black uppercase tracking-wide mb-3">Featured Video Styles</h3>
            <div className="grid grid-cols-3 gap-2">
              {popularStyles.map((s) => (
                <div key={s.id} className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
                  <img src={s.thumb} alt={s.name} className="w-full h-14 object-cover" />
                  <p className="px-1.5 py-1 text-[10px] font-bold truncate">{s.name}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Favorite projects */}
          <div className="reveal-up reveal-delay-3">
            <h3 className="text-[12.5px] font-black uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Star size={13} className="text-amber-500" /> Favorite Projects
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {favorites.map((v) => (
                <VideoThumb key={v.id} video={v} className="aspect-video" />
              ))}
            </div>
          </div>

          {/* Workspace overview */}
          <div className="reveal-up reveal-delay-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0b14] p-4">
            <h3 className="text-[12.5px] font-black uppercase tracking-wide mb-3">Workspace Overview</h3>
            <div className="space-y-2">
              {RECENT_PROJECTS.slice(0, 3).map((p) => (
                <div key={p.id} className="flex items-center gap-3">
                  <img src={p.cover} alt={p.name} className="w-10 h-10 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] font-bold truncate">{p.name}</p>
                    <p className="text-[10.5px] text-slate-400">{p.videoCount} videos · {p.updatedAt}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

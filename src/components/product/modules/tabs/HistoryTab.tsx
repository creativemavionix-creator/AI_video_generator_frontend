import React from 'react';
import { BarChart3, HardDrive, Star, Download, TrendingUp } from 'lucide-react';
import { ANALYTICS, CREDIT_USAGE, STORAGE_USAGE, PROMPT_HISTORY, MOCK_GALLERY } from '../../../../data/videoGeneratorMockData';

const card = 'rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0b14] p-5';
const label = 'text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500';

export default function HistoryTab() {
  const maxGen = Math.max(...ANALYTICS.monthly.map((m) => m.generations));
  const maxTemplate = Math.max(...ANALYTICS.mostUsedTemplates.map((s) => s.count));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Generations', value: ANALYTICS.totals.totalGenerations.toLocaleString(), icon: BarChart3 },
          { label: 'Downloads', value: ANALYTICS.totals.totalDownloads.toLocaleString(), icon: Download },
          { label: 'Favorites', value: ANALYTICS.totals.totalFavorites.toLocaleString(), icon: Star },
          { label: 'Credits Used', value: `${CREDIT_USAGE.used}/${CREDIT_USAGE.total}`, icon: TrendingUp },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={`${card} reveal-up`}>
              <div className="flex items-center justify-between">
                <span className={label}>{s.label}</span>
                <Icon size={16} className="text-purple-500" />
              </div>
              <p className="mt-3 text-2xl font-black">{s.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly analytics chart */}
        <div className={`${card} reveal-up`}>
          <span className={label}>Monthly Analytics</span>
          <div className="mt-6 flex items-end gap-3 h-40">
            {ANALYTICS.monthly.map((m) => (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-2">
                <div
                  className="w-full rounded-t-lg"
                  style={{
                    height: `${(m.generations / maxGen) * 100}%`,
                    backgroundImage: 'linear-gradient(180deg, #C800FF 0%, #7C3AED 100%)',
                  }}
                />
                <span className="text-[10.5px] font-bold text-slate-400">{m.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Most used templates */}
        <div className={`${card} reveal-up`}>
          <span className={label}>Most Used Templates</span>
          <div className="mt-4 space-y-3">
            {ANALYTICS.mostUsedTemplates.map((s) => (
              <div key={s.name}>
                <div className="flex items-center justify-between text-[12.5px] font-semibold">
                  <span>{s.name}</span>
                  <span className="text-slate-400">{s.count}</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-slate-100 dark:bg-slate-900">
                  <div className="h-2 rounded-full bg-purple-600" style={{ width: `${(s.count / maxTemplate) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Storage usage */}
        <div className={`${card} reveal-up`}>
          <div className="flex items-center gap-2 mb-3">
            <HardDrive size={16} className="text-purple-500" />
            <span className={label}>Storage Usage</span>
          </div>
          <p className="text-xl font-black">{STORAGE_USAGE.usedGB} GB <span className="text-sm font-semibold text-slate-400">/ {STORAGE_USAGE.totalGB} GB</span></p>
          <div className="mt-2 h-2 rounded-full bg-slate-100 dark:bg-slate-900">
            <div className="h-2 rounded-full bg-purple-600" style={{ width: `${(STORAGE_USAGE.usedGB / STORAGE_USAGE.totalGB) * 100}%` }} />
          </div>
        </div>

        {/* Generation history list */}
        <div className={`${card} reveal-up lg:col-span-2`}>
          <span className={label}>Generation History</span>
          <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
            {MOCK_GALLERY.slice(0, 5).map((v) => (
              <div key={v.id} className="flex items-center gap-3 py-2.5">
                <img src={v.poster} className="w-14 h-9 rounded-lg object-cover" alt="" />
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-semibold truncate">{v.prompt}</p>
                  <p className="text-[11px] text-slate-400">{v.style} · {v.createdAt}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Most used prompts */}
      <div className={`${card} reveal-up`}>
        <span className={label}>Most Used Prompts</span>
        <div className="mt-3 space-y-2">
          {PROMPT_HISTORY.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-xl px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-900/60">
              <p className="text-[12.5px] font-semibold truncate pr-4">{p.prompt}</p>
              <span className="text-[11px] text-slate-400 shrink-0">{p.style}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

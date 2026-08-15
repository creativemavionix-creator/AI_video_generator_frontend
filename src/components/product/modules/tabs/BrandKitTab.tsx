import React from 'react';
import { Palette, Type, Image as ImageIcon, FolderOpen, LayoutTemplate, Wand2, Plus, Clapperboard, Tag } from 'lucide-react';
import { BRAND_KIT } from '../../../../data/videoGeneratorMockData';

const card = 'rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0b14] p-5';
const label = 'text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500';

export default function BrandKitTab() {
  return (
    <div className="space-y-6">
      <div
        className="rounded-3xl p-6 sm:p-8  flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 dark:bg-black        bg-white"

      >
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-purple-200">Brand Kit</p>
          <h2 className="mt-2 text-xl sm:text-2xl font-black">Keep every video on-brand</h2>
        </div>
        <button className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 dark:bg-[#6d28d9]  px-5 py-3 text-xs font-black uppercase tracking-wider  hover:-translate-y-0.5 transition-transform btn-primary">
          <Wand2 size={15} /> Auto Branding
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Colors */}
        <div className={`${card} reveal-up`}>
          <div className="flex items-center gap-2 mb-4">
            <Palette size={16} className="text-purple-500" />
            <span className={label}>Brand Colors</span>
          </div>
          <div className="flex flex-wrap gap-3">
            {BRAND_KIT.colors.map((c) => (
              <div key={c} className="text-center">
                <div className="w-14 h-14 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm" style={{ backgroundColor: c }} />
                <p className="mt-1.5 text-[10.5px] font-semibold text-slate-500">{c}</p>
              </div>
            ))}
            <button className="w-14 h-14 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400">
              <Plus size={18} />
            </button>
          </div>
        </div>

        {/* Fonts */}
        <div className={`${card} reveal-up`}>
          <div className="flex items-center gap-2 mb-4">
            <Type size={16} className="text-purple-500" />
            <span className={label}>Fonts</span>
          </div>
          <div className="space-y-3">
            {BRAND_KIT.fonts.map((f) => (
              <div key={f} className="rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between">
                <span className="text-lg font-bold">{f}</span>
                <span className="text-[11px] text-slate-400">Aa Bb Cc</span>
              </div>
            ))}
          </div>
        </div>

        {/* Logos */}
        <div className={`${card} reveal-up`}>
          <div className="flex items-center gap-2 mb-4">
            <ImageIcon size={16} className="text-purple-500" />
            <span className={label}>Logos</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {BRAND_KIT.logos.map((l, i) => (
              <div key={i} className="aspect-video rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
                <img src={l} alt="Logo" className="max-h-full max-w-full object-contain" />
              </div>
            ))}
          </div>
        </div>

        {/* Intro / outro clips */}
        <div className={`${card} reveal-up`}>
          <div className="flex items-center gap-2 mb-4">
            <Clapperboard size={16} className="text-purple-500" />
            <span className={label}>Intro / Outro Clips</span>
          </div>
          <div className="space-y-2.5">
            {BRAND_KIT.introOutro.map((io) => (
              <div key={io.id} className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 p-2.5">
                <img src={io.thumb} alt={io.name} className="w-16 h-10 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-bold truncate">{io.name}</p>
                  <p className="text-[11px] text-slate-400">{io.duration}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Brand assets */}
        <div className={`${card} reveal-up`}>
          <div className="flex items-center gap-2 mb-4">
            <FolderOpen size={16} className="text-purple-500" />
            <span className={label}>Brand Assets</span>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {BRAND_KIT.assets.map((a, i) => (
              <div key={i} className="aspect-square rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-900">
                <img src={a} alt="Asset" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>

        {/* Watermarks */}
        <div className={`${card} reveal-up`}>
          <div className="flex items-center gap-2 mb-4">
            <Tag size={16} className="text-purple-500" />
            <span className={label}>Watermarks</span>
          </div>
          <div className="space-y-2">
            {BRAND_KIT.watermarks.map((w) => (
              <label key={w} className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-[12.5px] font-semibold text-slate-600 dark:text-slate-300">
                {w}
                <input type="radio" name="watermark" className="accent-purple-600 w-4 h-4" />
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Templates */}
      <div className={`${card} reveal-up`}>
        <div className="flex items-center gap-2 mb-4">
          <LayoutTemplate size={16} className="text-purple-500" />
          <span className={label}>Brand Templates</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {['Social Reel', 'Product Ad', 'Presentation Intro', 'Ad Creative'].map((t) => (
            <button key={t} className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 text-left hover:border-purple-300 dark:hover:border-purple-700 transition-colors">
              <div className="aspect-video rounded-lg mb-2" style={{ backgroundImage: 'linear-gradient(135deg, #C800FF 0%, #7C3AED 100%)' }} />
              <p className="text-[12px] font-bold">{t}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

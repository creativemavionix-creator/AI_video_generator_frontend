import React, { useState } from 'react';
import { Download, FileVideo, Link2, Send, CheckSquare, Square, Instagram, Youtube } from 'lucide-react';
import { MOCK_GALLERY, EXPORT_FORMATS, RESOLUTIONS } from '../../../../data/videoGeneratorMockData';
import VideoThumb from './VideoThumb';

const card = 'rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0b14] p-5';
const label = 'text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500';

export default function ExportTab() {
  const [selected, setSelected] = useState<string[]>([MOCK_GALLERY[0].id, MOCK_GALLERY[1].id]);
  const [format, setFormat] = useState('mp4');
  const [resolution, setResolution] = useState('1080p');

  const toggle = (id: string) => {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };

  const sizePerClip = resolution === '4K' ? 62 : resolution === '2K' ? 34 : resolution === '1080p' ? 18 : 8;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
      <div className={`${card} reveal-up`}>
        <div className="flex items-center justify-between mb-4">
          <span className={label}>Select videos to export</span>
          <span className="text-[11px] font-bold text-purple-600 dark:text-purple-300">{selected.length} selected</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {MOCK_GALLERY.slice(0, 12).map((v) => {
            const active = selected.includes(v.id);
            return (
              <button key={v.id} onClick={() => toggle(v.id)} className="relative">
                <VideoThumb video={v} className={`aspect-video transition-opacity ${active ? 'opacity-100' : 'opacity-50'}`} />
                <div className="absolute top-1.5 left-1.5 text-white drop-shadow z-10">
                  {active ? <CheckSquare size={16} className="fill-purple-600/20" /> : <Square size={16} />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-6">
        <div className={`${card} reveal-up`}>
          <span className={label}>Export Format</span>
          <div className="mt-3 space-y-2">
            {EXPORT_FORMATS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFormat(f.id)}
                className={`w-full text-left rounded-xl border px-3.5 py-2.5 transition-colors ${
                  format === f.id ? 'border-purple-500 bg-purple-50 dark:bg-purple-500/10' : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <p className="text-[13px] font-bold">{f.name}</p>
                <p className="text-[11px] text-slate-400">{f.desc}</p>
              </button>
            ))}
          </div>
          <div className="mt-4">
            <span className="text-[11.5px] font-semibold text-slate-600 dark:text-slate-300">Resolution</span>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {RESOLUTIONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setResolution(r)}
                  className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold ${
                    resolution === r ? 'bg-purple-600 text-white' : 'bg-slate-100 dark:bg-slate-900 text-slate-500'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={`${card} reveal-up`}>
          <span className={label}>Actions</span>
          <div className="mt-3 space-y-2">
            <button className="btn-primary w-full inline-flex items-center justify-center gap-2 rounded-full py-2.5 text-[11px] font-black uppercase tracking-wider">
              <Download size={14} /> Batch Download ({selected.length})
            </button>
            <button className="w-full inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 dark:border-slate-700 py-2.5 text-[11px] font-bold text-slate-600 dark:text-slate-300">
              <Link2 size={14} /> Copy Share Link
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button className="inline-flex items-center justify-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-700 py-2.5 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                <Instagram size={14} /> Instagram
              </button>
              <button className="inline-flex items-center justify-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-700 py-2.5 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                <Youtube size={14} /> YouTube
              </button>
            </div>
            <button className="w-full inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 dark:border-slate-700 py-2.5 text-[11px] font-bold text-slate-600 dark:text-slate-300">
              <Send size={14} /> Publish to Project
            </button>
          </div>
        </div>

        <div className={`${card} reveal-up flex items-center gap-3`}>
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-300 flex items-center justify-center">
            <FileVideo size={18} />
          </div>
          <div>
            <p className="text-[12.5px] font-bold">Estimated export size</p>
            <p className="text-[11px] text-slate-400">{(selected.length * sizePerClip).toFixed(0)} MB · {format.toUpperCase()} · {resolution}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import {
  Scissors, Wand2, Eraser, Sparkles, Maximize2, Palette, Layers, Crop,
  RotateCw, Sun, Contrast, Droplet, Music, Type, Play, Pause,
} from 'lucide-react';
import { MOCK_GALLERY, COLOR_GRADES } from '../../../../data/videoGeneratorMockData';
import VideoThumb from './VideoThumb';

const card = 'rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0b14] p-5';
const label = 'text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500';

const AI_TOOLS = [
  { id: 'upscale', name: 'Upscale to 4K', icon: Layers },
  { id: 'stabilize', name: 'Stabilization', icon: Wand2 },
  { id: 'bg-remove', name: 'Background Removal', icon: Scissors },
  { id: 'obj-remove', name: 'Object Removal', icon: Eraser },
  { id: 'face-enhance', name: 'Face Enhancement', icon: Sparkles },
  { id: 'frame-interp', name: 'Frame Interpolation', icon: Layers },
  { id: 'extend', name: 'Extend Scene', icon: Maximize2 },
  { id: 'color-grade', name: 'Color Grading', icon: Palette },
  { id: 'captions', name: 'Auto Captions', icon: Type },
  { id: 'music-sync', name: 'Music Sync', icon: Music },
];

const TRIM_TOOLS = [
  { id: 'crop', name: 'Crop', icon: Crop },
  { id: 'resize', name: 'Resize', icon: Maximize2 },
  { id: 'rotate', name: 'Rotate', icon: RotateCw },
  { id: 'speed', name: 'Speed', icon: Droplet },
];

export default function EditorTab() {
  const [activeVideo, setActiveVideo] = useState(MOCK_GALLERY[0]);
  const [activeTool, setActiveTool] = useState('color-grade');
  const [brightness, setBrightness] = useState(50);
  const [contrast, setContrast] = useState(50);
  const [saturation, setSaturation] = useState(50);
  const [processing, setProcessing] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [grade, setGrade] = useState(COLOR_GRADES[1].id);

  const runTool = () => {
    setProcessing(true);
    setTimeout(() => setProcessing(false), 1200);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr_300px] gap-6">
      {/* AI tools */}
      <div className={`${card} reveal-up`}>
        <span className={label}>AI Editing Tools</span>
        <div className="mt-3 space-y-1.5">
          {AI_TOOLS.map((t) => {
            const Icon = t.icon;
            const active = activeTool === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTool(t.id)}
                className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[12.5px] font-semibold transition-colors ${
                  active ? 'bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-300' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900/60'
                }`}
              >
                <Icon size={16} />
                {t.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Canvas / preview */}
      <div className={`${card} reveal-up`}>
        <div className="flex items-center justify-between">
          <span className={label}>Preview</span>
          <button
            onClick={runTool}
            disabled={processing}
            className="btn-primary inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-wider disabled:opacity-70"
          >
            <Wand2 size={13} /> {processing ? 'Applying…' : 'Apply Tool'}
          </button>
        </div>
        <div className="mt-4 rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center min-h-[380px] relative">
          <img
            src={activeVideo.poster}
            alt={activeVideo.title}
            className={`max-h-[420px] w-full object-contain transition-all ${processing ? 'opacity-40 blur-sm' : ''}`}
            style={{ filter: `brightness(${0.6 + brightness / 100}) contrast(${0.6 + contrast / 100}) saturate(${0.4 + saturation / 60})` }}
          />
          {processing && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-10 h-10 border-4 border-purple-300 border-t-purple-600 rounded-full animate-spin" />
            </div>
          )}
          {!processing && (
            <button
              onClick={() => setPlaying((p) => !p)}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur flex items-center justify-center hover:bg-white/30 transition-colors">
                {playing ? <Pause size={22} className="text-white fill-white" /> : <Play size={22} className="text-white fill-white ml-1" />}
              </div>
            </button>
          )}
          <div className="absolute bottom-3 left-3 right-3 h-1.5 rounded-full bg-white/20">
            <div className="h-1.5 rounded-full bg-purple-500" style={{ width: '35%' }} />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-4 gap-2">
          {TRIM_TOOLS.map((t) => {
            const Icon = t.icon;
            return (
              <button key={t.id} className="flex flex-col items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-800 py-2.5 text-[10.5px] font-bold text-slate-500 hover:border-purple-300 dark:hover:border-purple-700">
                <Icon size={15} />
                {t.name}
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {MOCK_GALLERY.slice(0, 8).map((v) => (
            <button key={v.id} onClick={() => setActiveVideo(v)} className={`shrink-0 w-16 h-11 rounded-lg overflow-hidden ring-2 ${activeVideo.id === v.id ? 'ring-purple-500' : 'ring-transparent'}`}>
              <img src={v.poster} className="w-full h-full object-cover" alt="" />
            </button>
          ))}
        </div>
      </div>

      {/* Adjustments */}
      <div className={`${card} reveal-up`}>
        <span className={label}>Color & Adjustments</span>
        <div className="mt-4 space-y-4">
          {[
            { name: 'Brightness', value: brightness, setter: setBrightness, icon: Sun },
            { name: 'Contrast', value: contrast, setter: setContrast, icon: Contrast },
            { name: 'Saturation', value: saturation, setter: setSaturation, icon: Droplet },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.name}>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-600 dark:text-slate-300"><Icon size={13} /> {s.name}</span>
                  <span className="text-[12px] font-bold text-purple-600 dark:text-purple-300">{s.value}</span>
                </div>
                <input type="range" min={0} max={100} value={s.value} onChange={(e) => s.setter(Number(e.target.value))} className="mt-1.5 w-full accent-purple-600" />
              </div>
            );
          })}
        </div>
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
          <span className={label}>Color Grade</span>
          <div className="mt-2.5 grid grid-cols-2 gap-2">
            {COLOR_GRADES.slice(0, 6).map((g) => (
              <button
                key={g.id}
                onClick={() => setGrade(g.id)}
                className={`rounded-xl border px-2.5 py-2 text-left transition-colors ${
                  grade === g.id ? 'border-purple-500 bg-purple-50 dark:bg-purple-500/10' : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="w-full h-3 rounded-full mb-1.5" style={{ backgroundImage: `linear-gradient(90deg, ${g.swatch[0]}, ${g.swatch[1]})` }} />
                <p className="text-[10.5px] font-bold">{g.name}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

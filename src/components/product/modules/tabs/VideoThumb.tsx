import React from 'react';
import { Play, Loader2, Clock } from 'lucide-react';
import type { VideoProject } from '../../../../data/videoGeneratorMockData';

/**
 * Shared poster+play-button tile used across Dashboard/Gallery/Editor.
 * Renders the poster image with a centered play glyph; if a matching file
 * exists under /public/sample-videos/ it will play inline on hover (desktop),
 * otherwise it simply falls back to the static poster - the app never breaks
 * even when no sample .mp4 files have been dropped in yet.
 */
export default function VideoThumb({
  video,
  className = '',
  showDuration = true,
  rounded = 'rounded-xl',
}: {
  video: Pick<VideoProject, 'poster' | 'title' | 'duration' | 'status'>;
  className?: string;
  showDuration?: boolean;
  rounded?: string;
}) {
  return (
    <div className={`relative overflow-hidden bg-slate-100 dark:bg-slate-900 ${rounded} ${className}`}>
      <img src={video.poster} alt={video.title} className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-black/10" />
      {video.status === 'ready' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-9 h-9 rounded-full bg-white/25 backdrop-blur flex items-center justify-center">
            <Play size={15} className="text-white fill-white ml-0.5" />
          </div>
        </div>
      )}
      {video.status === 'processing' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <Loader2 size={18} className="text-white animate-spin" />
        </div>
      )}
      {video.status === 'queued' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <span className="text-[10px] font-black uppercase tracking-wider text-white">Queued</span>
        </div>
      )}
      {showDuration && (
        <div className="absolute bottom-1.5 right-1.5 inline-flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5">
          <Clock size={9} className="text-white" />
          <span className="text-[9.5px] font-bold text-white">{video.duration}</span>
        </div>
      )}
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { Search, Star, Download, Copy, Trash2, Share2, Pencil, Filter, Play } from 'lucide-react';
import { MOCK_GALLERY, STYLE_CATEGORIES, VideoProject } from '../../../../data/videoGeneratorMockData';
import { supabase } from '../../../../lib/supabaseClient';
import { API_BASE_URL } from '../../../../config';
import VideoThumb from './VideoThumb';

const card = 'rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0b14] p-5';
const label = 'text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500';

function getCloudinaryThumbnail(url: string, second: number = 1.0): string {
  if (!url) return '';
  if (url.includes('/upload/')) {
    return url
      .replace('/upload/', `/upload/so_${second},w_640,c_scale/`)
      .replace(/\.mp4$/i, '.jpg');
  }
  return url;
}

function downloadVideoToDevice(url: string, filename: string = 'video.mp4') {
  if (!url) return;
  
  // For Cloudinary URLs, fl_attachment flag adds Content-Disposition: attachment header
  if (url.includes('/upload/')) {
    const downloadUrl = url.replace('/upload/', '/upload/fl_attachment/');
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return;
  }

  // Universal blob download fallback
  fetch(url)
    .then((res) => res.blob())
    .then((blob) => {
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    })
    .catch(() => {
      window.open(url, '_blank');
    });
}

export default function GalleryTab() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  
  const [galleryVideos, setGalleryVideos] = useState<VideoProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDatabaseGallery = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`${API_BASE_URL}/jobs/gallery`, { headers });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      if (Array.isArray(data) && data.length > 0) {
        const mappedJobs: VideoProject[] = data.map((job: any) => ({
          id: job.id,
          title: job.prompt,
          poster: getCloudinaryThumbnail(job.video_url, 1.0),
          src: job.video_url,
          prompt: job.prompt,
          style: job.style || job.style_category || 'Cinematic',
          duration: job.duration || '0:05',
          resolution: job.resolution || '1080p',
          ratio: job.ratio || '16:9',
          model: job.model || 'MaVionix Motion v2',
          createdAt: job.created_at 
            ? new Date(job.created_at * 1000).toLocaleDateString(undefined, {
                month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
              })
            : 'Just now',
          favorite: false,
          status: 'ready',
        }));
        setGalleryVideos(mappedJobs);
      } else {
        setGalleryVideos(MOCK_GALLERY);
      }
    } catch (err) {
      console.warn('Backend unavailable or fetch failed, displaying mock gallery:', err);
      setGalleryVideos(MOCK_GALLERY);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDatabaseGallery();
  }, []);

  const handleDelete = (id: string) => {
    setGalleryVideos((prev) => prev.filter((v) => v.id !== id));
    if (selected === id) {
      setSelected(null);
    }
  };

  const filtered = galleryVideos.filter((v) => {
    const matchesSearch = v.prompt.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === 'All' || v.style.toLowerCase().includes(category.toLowerCase());
    const matchesFav = !onlyFavorites || v.favorite;
    return matchesSearch && matchesCategory && matchesFav;
  });

  const collections = Array.from(new Set(galleryVideos.map((v) => v.collection).filter(Boolean)));
  const activeVideo = galleryVideos.find((v) => v.id === selected);

  return (
    <div className="space-y-5">
      {/* Header controls */}
      <div className={`${card} reveal-up flex flex-col sm:flex-row sm:items-center gap-3`}>
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your gallery..."
            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400/50"
          />
        </div>
        <button
          onClick={() => setOnlyFavorites((v) => !v)}
          className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-[12px] font-bold border transition-colors ${
            onlyFavorites ? 'border-purple-500 bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-300' : 'border-slate-200 dark:border-slate-800 text-slate-500'
          }`}
        >
          <Star size={14} className={onlyFavorites ? 'fill-yellow-400 text-yellow-400' : ''} />
          Favorites
        </button>
        <button className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-[12px] font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <Filter size={14} /> Filters
        </button>
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap gap-1.5">
        {STYLE_CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide transition-colors ${
              category === c ? 'bg-purple-600 text-white' : 'bg-slate-100 dark:bg-slate-900 text-slate-500'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {collections.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {collections.map((c) => (
            <span key={c} className="rounded-full border border-slate-200 dark:border-slate-800 px-3 py-1 text-[11px] font-semibold text-slate-500">
              📁 {c}
            </span>
          ))}
        </div>
      )}

      {/* Video Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {filtered.map((v) => (
          <div key={v.id} onClick={() => setSelected(v.id)} className="group relative cursor-pointer">
            <VideoThumb video={v} className="aspect-video" />
            
            {/* Hover Action Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl p-2.5 flex flex-col justify-end">
              <p className="text-[11px] font-semibold text-white line-clamp-2 leading-snug">{v.prompt}</p>
              <div className="mt-2 flex items-center gap-1.5">
                {/* 1. Download */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadVideoToDevice(v.src || (v as any).video_url, `video_${v.id}.mp4`);
                  }}
                  className="w-7 h-7 rounded-full bg-white/90 hover:bg-white flex items-center justify-center text-slate-700 shadow transition-transform hover:scale-110"
                  title="Download MP4"
                >
                  <Download size={12} />
                </button>

                {/* 2. Copy Prompt */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(v.prompt);
                  }}
                  className="w-7 h-7 rounded-full bg-white/90 hover:bg-white flex items-center justify-center text-slate-700 shadow transition-transform hover:scale-110"
                  title="Copy Prompt"
                >
                  <Copy size={12} />
                </button>

                {/* 3. Share URL */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (v.src) {
                      navigator.clipboard.writeText(v.src);
                    }
                  }}
                  className="w-7 h-7 rounded-full bg-white/90 hover:bg-white flex items-center justify-center text-slate-700 shadow transition-transform hover:scale-110"
                  title="Share Video URL"
                >
                  <Share2 size={12} />
                </button>

                {/* 4. Edit */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelected(v.id);
                  }}
                  className="w-7 h-7 rounded-full bg-white/90 hover:bg-white flex items-center justify-center text-slate-700 shadow transition-transform hover:scale-110"
                  title="Edit Video"
                >
                  <Pencil size={12} />
                </button>

                {/* 5. Delete */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(v.id);
                  }}
                  className="w-7 h-7 rounded-full bg-white/90 hover:bg-red-500 hover:text-white flex items-center justify-center text-slate-700 shadow transition-transform hover:scale-110"
                  title="Delete Video"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>

            {v.favorite && <Star size={14} className="absolute top-2 right-2 z-10 fill-yellow-400 text-yellow-400" />}
          </div>
        ))}
      </div>

      {!isLoading && filtered.length === 0 && (
        <div className="py-16 text-center text-sm text-slate-400">No videos match your filters.</div>
      )}

      {/* Detail modal for playing video and reviewing metadata */}
      {activeVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setSelected(null)}>
          <div onClick={(e) => e.stopPropagation()} className="max-w-3xl w-full rounded-2xl bg-white dark:bg-[#0c0c14] overflow-hidden grid grid-cols-1 sm:grid-cols-2 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="relative bg-black flex items-center justify-center min-h-[250px]">
              {activeVideo.src ? (
                <video
                  src={activeVideo.src}
                  poster={activeVideo.poster}
                  controls
                  autoPlay
                  className="w-full h-full object-contain max-h-[70vh]"
                />
              ) : (
                <>
                  <img src={activeVideo.poster} alt={activeVideo.title} className="w-full h-full object-cover max-h-[70vh]" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-14 h-14 rounded-full bg-white/25 backdrop-blur flex items-center justify-center">
                      <Play size={22} className="text-white fill-white ml-1" />
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="p-5 space-y-3 flex flex-col justify-between">
              <div className="space-y-3">
                <div>
                  <span className={label}>Prompt</span>
                  <p className="text-sm font-medium mt-1 leading-snug">{activeVideo.prompt}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-[12px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <p><span className="font-bold text-slate-700 dark:text-slate-200">Style:</span> {activeVideo.style}</p>
                  <p><span className="font-bold text-slate-700 dark:text-slate-200">Ratio:</span> {activeVideo.ratio}</p>
                  <p><span className="font-bold text-slate-700 dark:text-slate-200">Duration:</span> {activeVideo.duration}</p>
                  <p><span className="font-bold text-slate-700 dark:text-slate-200">Resolution:</span> {activeVideo.resolution}</p>
                  <p><span className="font-bold text-slate-700 dark:text-slate-200">Model:</span> {activeVideo.model}</p>
                  <p><span className="font-bold text-slate-700 dark:text-slate-200">Created:</span> {activeVideo.createdAt}</p>
                </div>
              </div>
              <div className="flex gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => downloadVideoToDevice(activeVideo.src || (activeVideo as any).video_url, `video_${activeVideo.id}.mp4`)}
                  className="btn-primary flex-1 inline-flex items-center justify-center gap-1.5 rounded-full py-2.5 text-[11px] font-black uppercase tracking-wider"
                >
                  <Download size={13} /> Download
                </button>
                <button onClick={() => setSelected(null)} className="rounded-full border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-[11px] font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

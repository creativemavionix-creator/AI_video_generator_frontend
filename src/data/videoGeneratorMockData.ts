// Mock data for the AI Video Generator module.
// No backend integration - this file simulates realistic API responses,
// user history, and library content for the workspace UI.
//
// VIDEO ASSETS: this module ships with poster (thumbnail) images only.
// Drop your own sample .mp4 files into /public/sample-videos/ using the
// names below and every card, player, and timeline in the app will pick
// them up automatically (see README.md in that folder for the full list).

export interface VideoProject {
  id: string;
  title: string;
  poster: string;
  src: string;
  prompt: string;
  style: string;
  duration: string;
  resolution: string;
  ratio: string;
  model: string;
  createdAt: string;
  favorite: boolean;
  collection?: string;
  status: 'ready' | 'processing' | 'queued';
  views?: number;
}

export interface StyleItem {
  id: string;
  name: string;
  category: string;
  thumb: string;
  popular?: boolean;
}

export interface PromptHistoryItem {
  id: string;
  prompt: string;
  negativePrompt?: string;
  style: string;
  createdAt: string;
  favorite: boolean;
}

export interface ProjectItem {
  id: string;
  name: string;
  cover: string;
  videoCount: number;
  updatedAt: string;
}

const POSTERS = [
  '/posters/poster-01.png',
  '/posters/poster-02.png',
  '/posters/poster-03.png',
  '/posters/poster-04.png',
  '/posters/poster-05.png',
];
const pickPoster = (i: number) => POSTERS[i % POSTERS.length];

// Sample video source filenames - put files with these exact names in
// /public/sample-videos/. If a file is missing the player simply falls
// back to showing the poster frame, so the app never breaks.
const pickSrc = (i: number) => `/sample-videos/sample-${(i % 8) + 1}.mp4`;

export const STYLE_CATEGORIES = [
  'All',
  'Marketing',
  'Social Media',
  'Cinematic',
  'Anime',
  '3D Animation',
  'Realistic',
  'Corporate',
  'Motion Graphics',
];

export const STYLE_LIBRARY: StyleItem[] = [
  { id: 'cinematic', name: 'Cinematic', category: 'Cinematic', thumb: pickPoster(0), popular: true },
  { id: 'melodramatic', name: 'Melodramatic', category: 'Cinematic', thumb: pickPoster(1), popular: true },
  { id: 'realistic', name: 'Realistic', category: 'Realistic', thumb: pickPoster(2), popular: true },
  { id: 'anime', name: 'Anime', category: 'Anime', thumb: pickPoster(3), popular: true },
  { id: '3d-animation', name: '3D Animation', category: '3D Animation', thumb: pickPoster(4) },
  { id: 'motion-graphics', name: 'Motion Graphics', category: 'Motion Graphics', thumb: pickPoster(0) },
  { id: 'logo-animation', name: 'Logo Animation', category: 'Motion Graphics', thumb: pickPoster(1) },
  { id: 'product-ad', name: 'Product Advertisement', category: 'Marketing', thumb: pickPoster(2), popular: true },
  { id: 'social-reel', name: 'Social Media Reel', category: 'Social Media', thumb: pickPoster(3) },
  { id: 'ig-story', name: 'Instagram Story', category: 'Social Media', thumb: pickPoster(4) },
  { id: 'youtube', name: 'YouTube Video', category: 'Social Media', thumb: pickPoster(0) },
  { id: 'corporate', name: 'Corporate Presentation', category: 'Corporate', thumb: pickPoster(1) },
  { id: 'explainer', name: 'Explainer Video', category: 'Corporate', thumb: pickPoster(2) },
  { id: 'educational', name: 'Educational Video', category: 'Corporate', thumb: pickPoster(3) },
  { id: 'noir', name: 'Film Noir', category: 'Cinematic', thumb: pickPoster(4) },
  { id: 'vintage', name: 'Vintage Film', category: 'Cinematic', thumb: pickPoster(0) },
  { id: 'cyberpunk', name: 'Cyberpunk', category: 'Cinematic', thumb: pickPoster(1), popular: true },
  { id: 'documentary', name: 'Documentary', category: 'Realistic', thumb: pickPoster(2) },
];

// Color grading presets - the "look" applied on top of any style. Mirrors
// what a colorist would dial in after the AI generation pass.
export interface ColorGradeOption {
  id: string;
  name: string;
  description: string;
  swatch: [string, string];
}
export const COLOR_GRADES: ColorGradeOption[] = [
  { id: 'natural', name: 'Natural', description: 'True-to-life color, minimal grading', swatch: ['#e5e7eb', '#9ca3af'] },
  { id: 'cinematic', name: 'Cinematic', description: 'Deep contrast, filmic highlight roll-off', swatch: ['#1f2937', '#7c3aed'] },
  { id: 'melodramatic', name: 'Melodramatic', description: 'Moody shadows, desaturated mids, high emotional contrast', swatch: ['#1e1033', '#c800ff'] },
  { id: 'teal-orange', name: 'Teal & Orange', description: 'Blockbuster complementary grade', swatch: ['#0f766e', '#f97316'] },
  { id: 'golden-hour', name: 'Golden Hour', description: 'Warm highlights, soft glow', swatch: ['#f59e0b', '#fde68a'] },
  { id: 'noir', name: 'Noir', description: 'High-contrast monochrome', swatch: ['#111827', '#e5e7eb'] },
  { id: 'vintage', name: 'Vintage Film', description: 'Faded blacks, warm grain, soft halation', swatch: ['#7c5b3d', '#e8d3a5'] },
  { id: 'vibrant', name: 'Vibrant Pop', description: 'Punchy saturation for social content', swatch: ['#db2777', '#7c3aed'] },
];

export const QUICK_TEMPLATES: { id: string; label: string; prompt: string }[] = [
  { id: 't1', label: 'Product Launch Ad', prompt: 'A sleek 15-second product advertisement, studio lighting, slow orbit camera, premium commercial feel' },
  { id: 't2', label: 'Instagram Reel', prompt: 'A fast-paced vertical social media reel with bold text overlays and trending transitions' },
  { id: 't3', label: 'Cinematic Trailer', prompt: 'An epic cinematic trailer sequence, dramatic lighting, slow motion, orchestral mood' },
  { id: 't4', label: 'Explainer Video', prompt: 'A clean 2D explainer video with animated icons illustrating a SaaS product workflow' },
  { id: 't5', label: 'Logo Reveal', prompt: 'A minimal 3D logo animation reveal, glass and light particles, elegant camera move' },
  { id: 't6', label: 'Anime Character Scene', prompt: 'A dynamic anime action scene, dramatic camera angles, detailed line art, vivid color grade' },
];

export const AI_SUGGESTIONS: string[] = [
  'Add "volumetric lighting" for more cinematic depth',
  'Try the Melodramatic color grade for an emotional close-up scene',
  'Increase motion strength to 70 for more dynamic camera movement',
  'Add a negative prompt to remove flicker, warping, or extra limbs',
  'Use 9:16 for Reels/Shorts and 16:9 for YouTube uploads',
  'Enable Character Consistency to keep the same subject across scenes',
];

export const MOCK_GALLERY: VideoProject[] = Array.from({ length: 18 }).map((_, i) => {
  const prompts = [
    'Futuristic AI robot assistant walking through a bright office, cinematic lighting',
    'Product hero shot of a wireless speaker rotating on a marble pedestal',
    'Cyberpunk cityscape at night with neon reflections and flying traffic',
    'Warm campus building establishing shot, soft afternoon light, drone push-in',
    'Abstract 3D render of glass and light ribbons, studio background, slow loop',
    'Anime hero standing on a rooftop at sunset, wind in the cape, dramatic clouds',
    'Corporate team collaborating in a modern office, handheld documentary style',
    'Melodramatic close-up of a character under moody rim lighting, slow zoom',
  ];
  const styles = STYLE_LIBRARY;
  const statusPool: VideoProject['status'][] = ['ready', 'ready', 'ready', 'processing', 'queued'];
  return {
    id: `vid-${i + 1}`,
    title: prompts[i % prompts.length].split(',')[0],
    poster: pickPoster(i),
    src: pickSrc(i),
    prompt: prompts[i % prompts.length],
    style: styles[i % styles.length].name,
    duration: ['0:08', '0:12', '0:15', '0:24', '0:30'][i % 5],
    resolution: ['1080p', '4K', '2K', '720p'][i % 4],
    ratio: ['16:9', '9:16', '1:1', '4:5'][i % 4],
    model: ['MaVionix Motion v2', 'MaVionix Motion v2 Turbo', 'MaVionix Cinematic v1'][i % 3],
    createdAt: `2026-0${(i % 6) + 1}-${String((i % 27) + 1).padStart(2, '0')}`,
    favorite: i % 5 === 0,
    collection: i % 3 === 0 ? 'Brand Campaign' : i % 3 === 1 ? 'Product Launch' : undefined,
    status: statusPool[i % statusPool.length],
    views: Math.floor(200 + Math.random() * 4000),
  };
});

export const PROMPT_HISTORY: PromptHistoryItem[] = [
  { id: 'p1', prompt: 'A sleek AI robot mascot walking through a SaaS office, isometric camera, purple accent lighting', style: 'Cinematic', createdAt: '2 hours ago', favorite: true },
  { id: 'p2', prompt: 'Minimalist 3D logo reveal, letter "M", gradient purple to blue, glass material', style: 'Logo Animation', createdAt: 'Yesterday', favorite: false },
  { id: 'p3', prompt: 'Cyberpunk street market at night, neon signs, rain reflections, tracking shot', style: 'Cyberpunk', createdAt: '2 days ago', favorite: true },
  { id: 'p4', prompt: 'Cozy scandinavian living room, natural light, slow dolly-in, plants swaying', style: 'Realistic', createdAt: '3 days ago', favorite: false },
  { id: 'p5', prompt: 'Product shot of a smartwatch on a marble pedestal, 360-degree orbit', style: 'Product Advertisement', createdAt: '5 days ago', favorite: false },
];

export const RECENT_PROJECTS: ProjectItem[] = [
  { id: 'proj1', name: 'Brand Campaign Q3', cover: pickPoster(0), videoCount: 14, updatedAt: '2 hours ago' },
  { id: 'proj2', name: 'Product Launch Ads', cover: pickPoster(1), videoCount: 9, updatedAt: 'Yesterday' },
  { id: 'proj3', name: 'Social Media Pack', cover: pickPoster(2), videoCount: 22, updatedAt: '3 days ago' },
  { id: 'proj4', name: 'App Onboarding Motion', cover: pickPoster(3), videoCount: 6, updatedAt: '1 week ago' },
];

export const CREDIT_USAGE = {
  used: 3420,
  total: 5000,
  renewsIn: '12 days',
};

export const STORAGE_USAGE = {
  usedGB: 38.6,
  totalGB: 100,
};

export const ANALYTICS = {
  monthly: [
    { month: 'Feb', generations: 64 },
    { month: 'Mar', generations: 98 },
    { month: 'Apr', generations: 82 },
    { month: 'May', generations: 121 },
    { month: 'Jun', generations: 145 },
    { month: 'Jul', generations: 168 },
  ],
  mostUsedTemplates: [
    { name: 'Product Advertisement', count: 132 },
    { name: 'Social Media Reel', count: 108 },
    { name: 'Cinematic', count: 91 },
    { name: 'Logo Animation', count: 64 },
    { name: 'Explainer Video', count: 47 },
  ],
  totals: {
    totalGenerations: 678,
    totalDownloads: 512,
    totalFavorites: 134,
    activeProjects: 11,
  },
};

export const NOTIFICATIONS = [
  { id: 'n1', text: 'Your 15-second product ad finished rendering', time: '5m ago', unread: true },
  { id: 'n2', text: 'Upscaling to 4K complete for "Brand Campaign Q3"', time: '1h ago', unread: true },
  { id: 'n3', text: 'You earned 200 bonus credits this week', time: '1d ago', unread: false },
];

export const BRAND_KIT = {
  colors: ['#C800FF', '#7C3AED', '#4C1D95', '#0F172A', '#FFFFFF'],
  fonts: ['Inter', 'Poppins', 'Sora'],
  logos: ['/brand/mavionix-logo.png'],
  assets: [pickPoster(2), pickPoster(3), pickPoster(4)],
  introOutro: [
    { id: 'io1', name: 'Purple Sweep Intro', duration: '0:03', thumb: pickPoster(0) },
    { id: 'io2', name: 'Logo Reveal Outro', duration: '0:04', thumb: pickPoster(1) },
  ],
  watermarks: ['Bottom Right Logo', 'Center Fade Logo', 'Corner Text Mark'],
};

export const MODEL_OPTIONS = ['MaVionix Motion v2', 'MaVionix Motion v2 Turbo', 'MaVionix Cinematic v1', 'MaVionix Anime Motion v1'];
export const ASPECT_RATIOS = ['16:9', '9:16', '1:1', '4:5'];
export const RESOLUTIONS = ['720p', '1080p', '2K', '4K'];
export const FRAME_RATES = ['24 fps', '30 fps', '60 fps'];
export const CAMERA_MOVEMENTS = ['Static', 'Pan Left', 'Pan Right', 'Zoom In', 'Zoom Out', 'Dolly In', 'Orbit', 'Crane Up'];
export const LIGHTING_OPTIONS = ['Natural', 'Studio', 'Golden Hour', 'Dramatic', 'Neon', 'Soft Diffused'];
export const BACKGROUND_OPTIONS = ['Auto', 'Studio White', 'Outdoor', 'Office', 'Abstract Gradient', 'Green Screen'];
export const ANIMATION_STYLES = ['Realistic Motion', 'Smooth Cinematic', 'Anime Motion', 'Stop Motion', 'Fluid 3D', 'Hand-drawn'];

export const MUSIC_LIBRARY = [
  { id: 'm1', name: 'Uplift Corporate', genre: 'Corporate', duration: '2:14' },
  { id: 'm2', name: 'Neon Nights', genre: 'Electronic', duration: '1:48' },
  { id: 'm3', name: 'Emotional Piano', genre: 'Cinematic', duration: '2:32' },
  { id: 'm4', name: 'Upbeat Pop Loop', genre: 'Social', duration: '0:30' },
  { id: 'm5', name: 'Epic Orchestral Rise', genre: 'Cinematic', duration: '1:20' },
];

export const SOUND_EFFECTS = ['Whoosh', 'Camera Shutter', 'Soft Pop', 'Riser', 'Impact Hit', 'Glitch'];

export const VOICE_OPTIONS = [
  { id: 'v1', name: 'Ava - Warm Narrator', lang: 'English (US)' },
  { id: 'v2', name: 'Kabir - Confident', lang: 'English (IN)' },
  { id: 'v3', name: 'Noor - Friendly', lang: 'English (UK)' },
  { id: 'v4', name: 'Leo - Deep Cinematic', lang: 'English (US)' },
];

export const EXPORT_FORMATS = [
  { id: 'mp4', name: 'MP4', desc: 'Universal format, best compatibility' },
  { id: 'mov', name: 'MOV', desc: 'High quality, ideal for further editing' },
  { id: 'webm', name: 'WEBM', desc: 'Optimized for web embedding' },
  { id: 'gif', name: 'GIF Export', desc: 'Short looping clip, no audio' },
];

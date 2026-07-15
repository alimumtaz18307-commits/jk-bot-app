import { useState } from "react";
import { Sparkles, Loader as Loader2, Image as ImageIcon, CircleAlert as AlertCircle, Crown, Download } from "lucide-react";
import { useImageGen } from "../hooks/useImageGen";

interface ImageGenPanelProps {
  onUpgrade: () => void;
}

const SAMPLE_PROMPTS = [
  "A serene mountain landscape at sunset",
  "A futuristic city with flying cars",
  "A cute cat wearing a space suit",
  "Abstract art with blue and gold",
];

export default function ImageGenPanel({ onUpgrade }: ImageGenPanelProps) {
  const { images, generating, usedToday, dailyLimit, isPremium, limitReached, error, generate } = useImageGen();
  const [prompt, setPrompt] = useState("");

  async function handleGenerate() {
    if (!prompt.trim() || generating) return;
    await generate(prompt.trim());
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-slate-800/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ImageIcon size={16} className="text-blue-400" />
          <span className="text-sm font-semibold text-slate-200">AI Image Generator</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] rounded-full px-2 py-0.5 font-medium ${
            isPremium ? "bg-amber-500/20 text-amber-400" : "bg-slate-800 text-slate-400"
          }`}>
            {isPremium ? "Premium" : "Free"}
          </span>
          <span className="text-[10px] text-slate-500">
            {usedToday}/{dailyLimit} today
          </span>
        </div>
      </div>

      <div className="px-4 py-3 border-b border-slate-800/50">
        <div className="flex gap-2">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleGenerate(); } }}
            placeholder="Describe an image to generate..."
            disabled={generating || limitReached}
            className="flex-1 text-sm bg-slate-800 text-white placeholder-slate-500 rounded-xl px-3 py-2 border border-slate-700/50 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-50"
          />
          <button
            onClick={handleGenerate}
            disabled={!prompt.trim() || generating || limitReached}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-medium transition-colors flex items-center gap-1.5"
          >
            {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            Generate
          </button>
        </div>

        {images.length === 0 && !generating && (
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {SAMPLE_PROMPTS.map((s) => (
              <button
                key={s}
                onClick={() => setPrompt(s)}
                className="text-xs bg-slate-800/60 hover:bg-slate-700 text-slate-400 rounded-full px-2.5 py-1 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {limitReached && (
        <div className="px-4 py-3 border-b border-slate-800/50 bg-amber-500/5">
          <div className="flex items-start gap-2">
            <AlertCircle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs text-amber-400 font-medium">Daily limit reached ({dailyLimit} images)</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {isPremium ? "Try again tomorrow!" : "Upgrade to Premium for 50 images per day."}
              </p>
              {!isPremium && (
                <button onClick={onUpgrade} className="mt-2 flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 font-medium">
                  <Crown size={12} /> Upgrade to Premium
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {error && !limitReached && (
        <div className="px-4 py-2 bg-red-500/5 border-b border-slate-800/50">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4">
        {generating && images.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center animate-pulse">
              <Sparkles size={28} className="text-blue-400" />
            </div>
            <p className="text-sm text-slate-400">Generating your image...</p>
            <p className="text-xs text-slate-600">This may take a few seconds</p>
          </div>
        )}

        {images.length === 0 && !generating ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mb-3">
              <ImageIcon size={24} className="text-slate-600" />
            </div>
            <p className="text-sm text-slate-400">No images yet</p>
            <p className="text-xs text-slate-600 mt-1">Describe something above and tap Generate</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {generating && (
              <div className="aspect-square rounded-xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-center animate-pulse">
                <Loader2 size={24} className="text-blue-400 animate-spin" />
              </div>
            )}
            {images.map((img, i) => (
              <div key={i} className="group relative rounded-xl overflow-hidden border border-slate-700/50 animate-fade-in">
                <img src={img.url} alt={img.prompt} className="w-full aspect-square object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-0 left-0 right-0 p-2">
                    <p className="text-[11px] text-slate-200 line-clamp-2">{img.prompt}</p>
                    <a
                      href={img.url}
                      download={`jk-bot-image-${img.timestamp}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-[10px] text-brand-400 hover:text-brand-300"
                    >
                      <Download size={11} /> Download
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

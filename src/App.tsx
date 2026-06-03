/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Send, 
  Layout, 
  Newspaper, 
  Instagram, 
  Loader2, 
  Sparkles,
  ArrowRight,
  RefreshCw,
  Building2,
  Key,
  Download
} from 'lucide-react';
import { generateVisualIdentity, generateProductImage, generateLogo, ImageModel } from './lib/gemini';

// Extend Window interface for AI Studio tools
declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

import JSZip from 'jszip';

interface BrandState {
  name: string;
  visualDescription: string;
  features: string[];
  billboard?: string;
  newspaper?: string;
  social?: string;
  logo?: string;
}

export default function App() {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentBrand, setCurrentBrand] = useState<BrandState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const [selectedModel, setSelectedModel] = useState<ImageModel>('nano-banana');

  useEffect(() => {
    checkApiKey();
  }, []);

  const checkApiKey = async () => {
    try {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      setHasApiKey(hasKey);
    } catch (err) {
      console.error('Failed to check API key:', err);
      setHasApiKey(false);
    }
  };

  const handleOpenKeySelector = async () => {
    try {
      await window.aistudio.openSelectKey();
      setHasApiKey(true);
    } catch (err) {
      console.error('Failed to open key selector:', err);
    }
  };

  const handleGenerate = async () => {
    if (!input.trim()) return;
    
    // Only force key selector for paid models if not already set
    if (selectedModel !== 'nano-banana' && !hasApiKey) {
      try {
        await handleOpenKeySelector();
      } catch (err) {
        console.error('Key selection cancelled or failed:', err);
        // We continue in case they want to try anyway or if they have a key in env
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      // Step 1: Generate Visual Identity
      const identity = await generateVisualIdentity(input);
      
      const newBrand: BrandState = {
        name: identity.brandName,
        visualDescription: identity.visualDescription,
        features: identity.keyFeatures,
      };
      
      setCurrentBrand(newBrand);

      // Step 2: Generate Images with selected model
      const [billboard, newspaper, social, logo] = await Promise.all([
        generateProductImage(identity.visualDescription, 'billboard', identity.brandName, selectedModel),
        generateProductImage(identity.visualDescription, 'newspaper', identity.brandName, selectedModel),
        generateProductImage(identity.visualDescription, 'social', identity.brandName, selectedModel),
        generateLogo(identity.visualDescription, identity.brandName, selectedModel),
      ]).catch(err => {
        if (err.message?.includes("Requested entity was not found")) {
          setHasApiKey(false);
          throw new Error("APIキーの設定が必要です。再設定してください。");
        }
        throw err;
      });

      setCurrentBrand(prev => prev ? ({
        ...prev,
        billboard,
        newspaper,
        social,
        logo
      }) : null);

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'ブランドの作成中にエラーが発生しました。もう一度お試しください。');
    } finally {
      setIsLoading(false);
    }
  };

  const dataURLtoBlob = (dataurl: string) => {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  const handleDownload = (dataUrl: string, filename: string) => {
    try {
      const blob = dataURLtoBlob(dataUrl);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
      // Fallback to direct data URL if blob fails
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleExportAll = async () => {
    if (!currentBrand) return;
    
    setIsLoading(true);
    try {
      const zip = new JSZip();
      
      const addFileToZip = (dataUrl: string | undefined, name: string) => {
        if (!dataUrl) return;
        const b64Data = dataUrl.split(',')[1];
        zip.file(name, b64Data, { base64: true });
      };

      addFileToZip(currentBrand.logo, `${currentBrand.name}_Logo.png`);
      addFileToZip(currentBrand.billboard, `${currentBrand.name}_Billboard.png`);
      addFileToZip(currentBrand.newspaper, `${currentBrand.name}_Newspaper.png`);
      addFileToZip(currentBrand.social, `${currentBrand.name}_Social.png`);

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${currentBrand.name}_Brand_Assets.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('ZIP generation failed:', err);
      setError('ファイルのまとめ込みに失敗しました。個別にダウンロードしてください。');
      // Fallback: Individual downloads
      handleExportAllFallback();
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportAllFallback = () => {
    if (!currentBrand) return;
    if (currentBrand.logo) handleDownload(currentBrand.logo, `${currentBrand.name}_Logo.png`);
    setTimeout(() => {
      if (currentBrand.billboard) handleDownload(currentBrand.billboard, `${currentBrand.name}_Billboard.png`);
    }, 500);
    setTimeout(() => {
      if (currentBrand.newspaper) handleDownload(currentBrand.newspaper, `${currentBrand.name}_Newspaper.png`);
    }, 1000);
    setTimeout(() => {
      if (currentBrand.social) handleDownload(currentBrand.social, `${currentBrand.name}_Social.png`);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F0] text-[#141414] font-sans">
      {/* Header */}
      <header className="border-b border-[#141414]/10 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#141414] text-white flex items-center justify-center rounded-sm font-bold text-lg">
              B
            </div>
            <span className="font-bold tracking-tight text-xl">Brand Builder</span>
          </div>
          <div className="flex items-center gap-6">
            <a 
              href="https://ai.google.dev/gemini-api/docs/billing" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs font-medium text-[#5A5A40] hover:underline"
            >
              Billing Docs
            </a>
            <button 
              onClick={handleOpenKeySelector}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                hasApiKey 
                  ? 'bg-green-50 text-green-700 border border-green-200' 
                  : 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              {hasApiKey ? 'Pro Key Active' : 'Select Pro Key'}
            </button>
            <button 
              onClick={() => window.location.reload()}
              className="text-sm font-medium opacity-50 hover:opacity-100 transition-opacity flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              リセット
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {!currentBrand && !isLoading ? (
          <div className="max-w-2xl mx-auto flex flex-col items-center text-center space-y-8 mt-20">
            <div className="space-y-4">
              <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-[0.9]">
                あなたの製品を、<br />
                <span className="text-[#5A5A40] italic font-serif serif">ブランド</span> に変える。
              </h1>
              <p className="text-lg text-[#141414]/60 max-w-md mx-auto">
                製品の説明を入力するだけで、看板、新聞、SNSでの見栄えを瞬時に視覚化します。
              </p>
            </div>

            <div className="w-full flex items-center justify-center gap-2 bg-white/50 p-2 rounded-2xl border border-[#141414]/5">
              {[
                { id: 'nano-banana-2' as ImageModel, label: 'Nano-Banana 2' },
                { id: 'nano-banana-pro' as ImageModel, label: 'Nano-Banana Pro' },
                { id: 'nano-banana' as ImageModel, label: 'Standard' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedModel(m.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    selectedModel === m.id
                      ? 'bg-[#141414] text-white shadow-lg'
                      : 'hover:bg-[#141414]/5 text-[#141414]/60'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <div className="w-full relative group">

              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="例: 自然素材でできた高級感のある木製ヘッドフォン。色は深みのあるウォルナットで、金色のアクセントがある。"
                className="w-full h-40 p-6 bg-white border-2 border-[#141414] rounded-2xl focus:outline-none focus:ring-4 focus:ring-[#5A5A40]/10 transition-all text-lg resize-none"
              />
              <button
                onClick={handleGenerate}
                disabled={!input.trim() || isLoading}
                className="absolute bottom-4 right-4 bg-[#141414] text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-[#2A2A2A] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                生成する
                <Send className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-wrap justify-center gap-4 text-xs font-mono uppercase tracking-widest opacity-40">
              <span className="flex items-center gap-1"><Sparkles className="w-3 h-3" /> AI Powered</span>
              <span className="flex items-center gap-1"><Layout className="w-3 h-3" /> Cross Media</span>
              <span className="flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Consistent Visuals</span>
            </div>
          </div>
        ) : (
          <div className="space-y-12">
            {/* Generating State */}
            {isLoading && !currentBrand && (
              <div className="flex flex-col items-center justify-center py-40 space-y-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-[#5A5A40]/20 blur-2xl rounded-full scale-150 animate-pulse" />
                  <Loader2 className="w-16 h-16 animate-spin relative z-10 text-[#141414]" />
                </div>
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-bold">アイデンティティを構築中...</h2>
                  <p className="text-[#141414]/60">
                    {selectedModel === 'nano-banana-pro' ? 'Nano-Banana Pro' : selectedModel === 'nano-banana-2' ? 'Nano-Banana 2' : 'Nano-Banana'} 
                    モデルがあなたのブランドを想像しています
                  </p>
                </div>
              </div>
            )}

            {currentBrand && (
              <AnimatePresence mode="wait">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-16"
                >
                  {/* Brand Profile section */}
                  <div className="flex justify-end mb-6">
                    <button 
                      onClick={handleExportAll}
                      className="group flex items-center gap-3 px-8 py-4 bg-[#141414] text-white rounded-full font-bold text-sm hover:bg-[#333] transition-all shadow-xl hover:shadow-[#141414]/20 hover:-translate-y-1"
                    >
                      <Download className="w-5 h-5 group-hover:bounce" />
                      全アセットを一括ダウンロード
                    </button>
                  </div>

                  <div className="grid md:grid-cols-2 gap-12 items-start bg-white p-8 md:p-12 rounded-[40px] shadow-sm border border-[#141414]/5">
                    <div className="space-y-8">
                      <div className="space-y-4">
                        <div className="flex items-center gap-6">
                          {currentBrand.logo && (
                            <div className="relative group/logo">
                              <div className="w-20 h-20 bg-white p-2 rounded-2xl border border-[#141414]/10 shadow-sm overflow-hidden flex-shrink-0">
                                <img src={currentBrand.logo} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                              </div>
                              <button 
                                onClick={() => handleDownload(currentBrand.logo!, `${currentBrand.name}_Logo.png`)}
                                className="absolute -top-1 -right-1 p-1 bg-[#141414] text-white rounded-full opacity-0 group-hover/logo:opacity-100 transition-opacity shadow-lg"
                                title="Download Logo"
                              >
                                <Download className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                          <div className="space-y-2">
                            <span className="text-[10px] uppercase font-bold tracking-[0.3em] text-[#5A5A40]">Brand Identity</span>
                            <h2 className="text-6xl font-bold tracking-tight">{currentBrand.name}</h2>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <h3 className="text-sm font-bold uppercase tracking-widest opacity-40">核心的なビジュアル特徴</h3>
                        <div className="flex flex-wrap gap-2">
                          {currentBrand.features.map((f, i) => (
                            <span key={i} className="px-4 py-2 bg-[#F5F5F0] rounded-full text-sm font-medium text-[#5A5A40] border border-[#5A5A40]/10">
                              {f}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-sm font-bold uppercase tracking-widest opacity-40">ビジュアル・アイデンティティ</h3>
                        <p className="text-lg leading-relaxed text-[#141414]/80 italic font-serif">
                          "{currentBrand.visualDescription}"
                        </p>
                      </div>
                    </div>

                    <div className="relative aspect-square bg-[#F5F5F0] rounded-3xl overflow-hidden group">
                      {currentBrand.social ? (
                        <img 
                          src={currentBrand.social} 
                          alt="Main Brand Shot" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                           <Loader2 className="w-8 h-8 animate-spin opacity-20" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent flex flex-col justify-end p-6 opacity-0 group-hover:opacity-100 transition-opacity">
                         <span className="text-white/80 text-xs font-mono">PRIMARY VISUAL</span>
                      </div>
                    </div>
                  </div>

                  {/* Media Expansion Section */}
                  <div className="space-y-8">
                    <div className="flex items-center justify-between">
                      <h3 className="text-2xl font-bold tracking-tight">メディア・エクスパンション</h3>
                      <div className="h-px flex-1 mx-8 bg-[#141414]/10" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {/* Billboard */}
                      <motion.div 
                        whileHover={{ y: -10 }}
                        className="bg-white rounded-3xl overflow-hidden border border-[#141414]/5 shadow-sm group"
                      >
                        <div className="p-4 border-b border-[#141414]/5 flex items-center justify-between bg-[#F5F5F0]/30">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-[#5A5A40]" />
                            <span className="text-xs font-bold uppercase tracking-widest">屋外看板 (Billboard)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {currentBrand.billboard && (
                              <button 
                                onClick={() => handleDownload(currentBrand.billboard!, `${currentBrand.name}_Billboard.png`)}
                                className="p-1.5 bg-white/80 hover:bg-white rounded-lg shadow-sm transition-colors"
                                title="Download"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <div className="text-[10px] font-mono opacity-40">16:9 / Landscape</div>
                          </div>
                        </div>
                        <div className="aspect-[16/9] bg-[#EBEBEB] overflow-hidden relative">
                          {currentBrand.billboard ? (
                            <img 
                              src={currentBrand.billboard} 
                              alt="Billboard" 
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Loader2 className="w-6 h-6 animate-spin opacity-20" />
                            </div>
                          )}
                        </div>
                        <div className="p-6 space-y-2">
                          <p className="text-xs text-[#141414]/60">都市の中心部に設置された、圧倒的な存在感を放つ大型広告。</p>
                        </div>
                      </motion.div>

                      {/* Newspaper */}
                      <motion.div 
                        whileHover={{ y: -10 }}
                        className="bg-white rounded-3xl overflow-hidden border border-[#141414]/5 shadow-sm group"
                      >
                        <div className="p-4 border-b border-[#141414]/5 flex items-center justify-between bg-[#F5F5F0]/30">
                          <div className="flex items-center gap-2">
                            <Newspaper className="w-4 h-4 text-[#5A5A40]" />
                            <span className="text-xs font-bold uppercase tracking-widest">新聞広告 (Newspaper)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {currentBrand.newspaper && (
                              <button 
                                onClick={() => handleDownload(currentBrand.newspaper!, `${currentBrand.name}_Newspaper.png`)}
                                className="p-1.5 bg-white/80 hover:bg-white rounded-lg shadow-sm transition-colors"
                                title="Download"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <div className="text-[10px] font-mono opacity-40">3:4 / Portrait</div>
                          </div>
                        </div>
                        <div className="aspect-[3/4] bg-[#EBEBEB] overflow-hidden">
                          {currentBrand.newspaper ? (
                            <img 
                              src={currentBrand.newspaper} 
                              alt="Newspaper" 
                              className="w-full h-full object-cover grayscale contrast-125"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Loader2 className="w-6 h-6 animate-spin opacity-20" />
                            </div>
                          )}
                        </div>
                        <div className="p-6 space-y-2">
                          <p className="text-xs text-[#141414]/60">伝統的なメディアでの、信頼と格式を感じさせるモノクローム広告。</p>
                        </div>
                      </motion.div>

                      {/* Social Media */}
                      <motion.div 
                        whileHover={{ y: -10 }}
                        className="bg-white rounded-3xl overflow-hidden border border-[#141414]/5 shadow-sm group"
                      >
                        <div className="p-4 border-b border-[#141414]/5 flex items-center justify-between bg-[#F5F5F0]/30">
                          <div className="flex items-center gap-2">
                            <Instagram className="w-4 h-4 text-[#5A5A40]" />
                            <span className="text-xs font-bold uppercase tracking-widest">SNS (Social Media)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {currentBrand.social && (
                              <button 
                                onClick={() => handleDownload(currentBrand.social!, `${currentBrand.name}_Social.png`)}
                                className="p-1.5 bg-white/80 hover:bg-white rounded-lg shadow-sm transition-colors"
                                title="Download"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <div className="text-[10px] font-mono opacity-40">1:1 / Square</div>
                          </div>
                        </div>
                        <div className="aspect-square bg-[#EBEBEB] overflow-hidden">
                          {currentBrand.social ? (
                            <img 
                              src={currentBrand.social} 
                              alt="Social" 
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Loader2 className="w-6 h-6 animate-spin opacity-20" />
                            </div>
                          )}
                        </div>
                        <div className="p-6 space-y-2">
                          <p className="text-xs text-[#141414]/60">現代のライフスタイルに溶け込む、洗練されたプロダクトショット。</p>
                        </div>
                      </motion.div>
                    </div>
                  </div>

                  {/* Footer call to action */}
                  {!isLoading && (
                    <div className="flex flex-col items-center justify-center py-12 border-t border-[#141414]/10">
                      <button 
                        onClick={() => {
                          setCurrentBrand(null);
                          setInput('');
                        }}
                        className="px-8 py-4 bg-[#141414] text-white rounded-full font-bold flex items-center gap-2 hover:bg-[#333] transition-all"
                      >
                        新しい製品を視覚化する <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            )}

            {error && (
              <div className="p-6 bg-red-50 border border-red-100 rounded-2xl text-red-600 font-medium text-center">
                {error}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Background decoration */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] aspect-square bg-[#5A5A40]/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[30%] aspect-square bg-[#141414]/5 rounded-full blur-[100px]" />
      </div>
    </div>
  );
}

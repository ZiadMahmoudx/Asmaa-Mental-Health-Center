"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Headphones,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Clock,
  Sparkles,
  Heart,
  Globe,
  Radio,
  Share2,
  CheckCircle2,
  Moon,
  Wind,
  Flame,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { MOCK_AUDIO_TRACKS, AudioTrack } from "@/data/mockAudioTracks";

export default function AudioPage() {
  const { language } = useLanguage();

  const [selectedDialect, setSelectedDialect] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [currentTrack, setCurrentTrack] = useState<AudioTrack>(MOCK_AUDIO_TRACKS[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState<number | null>(null);
  const [timerRemaining, setTimerRemaining] = useState<number | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [progressPercent, setProgressPercent] = useState(25);

  // Playback simulation timer
  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setProgressPercent((prev) => (prev >= 100 ? 0 : prev + 0.5));
      }, 500);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Sleep timer countdown
  useEffect(() => {
    let timer: any;
    if (sleepTimerMinutes && sleepTimerMinutes > 0) {
      setTimerRemaining(sleepTimerMinutes * 60);
      timer = setInterval(() => {
        setTimerRemaining((prev) => {
          if (prev && prev > 1) return prev - 1;
          setIsPlaying(false);
          setSleepTimerMinutes(null);
          return null;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [sleepTimerMinutes]);

  const filteredTracks = MOCK_AUDIO_TRACKS.filter((track) => {
    const dialectMatch = selectedDialect === "ALL" || track.dialect === selectedDialect;
    const categoryMatch = selectedCategory === "ALL" || track.category === selectedCategory;
    return dialectMatch && categoryMatch;
  });

  const togglePlay = (track: AudioTrack) => {
    if (currentTrack.id === track.id) {
      setIsPlaying(!isPlaying);
    } else {
      setCurrentTrack(track);
      setIsPlaying(true);
      setProgressPercent(0);
    }
  };

  const formatTimerSeconds = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen py-10 bg-alabaster-base">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header Hero */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-teal-50 text-teal-900 text-xs font-bold border border-teal-200">
            <Headphones className="w-3.5 h-3.5 text-teal-700" />
            <span>{language === "ar" ? "المكتبة الصوتية الإرشادية باللهجات العربية" : "Multi-Dialect Audio Psychoeducation"}</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-teal-950">
            {language === "ar" ? "جلسات صوتية موجهة للتهدئة والنوم" : "Guided Somatic & Mindfulness Audio"}
          </h1>

          <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
            {language === "ar"
              ? "جلسات استرخاء وتسكين نوبات الهلع مسجلة بأصوات نخبة من استشاريي الطب النفسي باللهجات المصرية، الخليجية، والشامية."
              : "Guided clinical relaxation and somatic de-escalation audio recorded in authentic Egyptian, Gulf, and Levantine Arabic dialects."}
          </p>
        </div>

        {/* Floating Active Player Box */}
        <div className="bg-teal-950 text-white rounded-3xl p-6 sm:p-8 border border-teal-800 shadow-2xl space-y-6 max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <img
              src={currentTrack.coverImage}
              alt={currentTrack.titleAr}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover shadow-lg border border-teal-700 flex-shrink-0"
            />

            <div className="flex-1 space-y-2 text-center sm:text-start rtl:sm:text-right ltr:sm:text-left">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-800 text-sage-300 text-[10px] font-bold border border-teal-700">
                <Globe className="w-3 h-3" />
                <span>{language === "ar" ? currentTrack.dialectLabelAr : currentTrack.dialectLabelEn}</span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white">
                {language === "ar" ? currentTrack.titleAr : currentTrack.titleEn}
              </h3>
              <p className="text-xs text-sage-200">
                {currentTrack.speakerName} • {currentTrack.speakerTitle}
              </p>
            </div>

            {/* Playback Controls Suite */}
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setPlaybackSpeed(playbackSpeed === 1 ? 1.25 : playbackSpeed === 1.25 ? 1.5 : 1)}
                  className="px-2 py-1 rounded-lg bg-teal-900 border border-teal-700 text-[11px] font-mono font-bold text-teal-200 hover:bg-teal-800"
                  title="سرعة التشغيل"
                >
                  {playbackSpeed}x
                </button>

                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-14 h-14 bg-terracotta-600 hover:bg-terracotta-700 text-white rounded-full flex items-center justify-center shadow-lg transition transform hover:scale-105"
                >
                  {isPlaying ? <Pause className="w-6 h-6 fill-white" /> : <Play className="w-6 h-6 fill-white ml-0.5 rtl:mr-0.5" />}
                </button>

                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-2.5 rounded-xl bg-teal-900 border border-teal-700 text-teal-200 hover:bg-teal-800"
                  title={isMuted ? "إلغاء الكتم" : "كتم الصوت"}
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
              </div>

              {/* Sleep Timer Indicator */}
              <div className="flex items-center gap-1 text-[10px] text-teal-300">
                <Clock className="w-3 h-3" />
                <span>
                  {timerRemaining ? `مؤقت الإيقاف: ${formatTimerSeconds(timerRemaining)}` : "مؤقت النوم غير مفعل"}
                </span>
              </div>
            </div>
          </div>

          {/* Animated Soundwave & Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] text-teal-300 font-mono">
              <span>02:15</span>
              {/* Waveform Bars */}
              <div className="flex items-center gap-1 h-5">
                {[40, 70, 30, 90, 50, 80, 60, 100, 45, 75, 35, 85, 65, 95].map((h, i) => (
                  <span
                    key={i}
                    className={`w-1 rounded-full transition-all duration-300 ${
                      isPlaying ? "bg-emerald-400 animate-pulse" : "bg-teal-700"
                    }`}
                    style={{ height: isPlaying ? `${h}%` : "30%" }}
                  />
                ))}
              </div>
              <span>{currentTrack.durationMinutes}:00</span>
            </div>

            <div className="w-full bg-teal-900 h-2 rounded-full overflow-hidden cursor-pointer">
              <div
                className="bg-emerald-400 h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Sleep Timer Quick Selectors */}
          <div className="flex items-center justify-between border-t border-teal-850 pt-4 text-xs text-teal-200">
            <span className="text-[11px]">مؤقت النوم التلقائي:</span>
            <div className="flex gap-1.5">
              {[5, 10, 15, 30].map((mins) => (
                <button
                  key={mins}
                  onClick={() => setSleepTimerMinutes(sleepTimerMinutes === mins ? null : mins)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${
                    sleepTimerMinutes === mins
                      ? "bg-emerald-500 text-white font-black"
                      : "bg-teal-900 hover:bg-teal-800 text-teal-200 border border-teal-700"
                  }`}
                >
                  {mins} دقيقة
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Filter Suite */}
        <div className="space-y-3">
          {/* Dialect Filter */}
          <div className="flex flex-wrap justify-center gap-2">
            {[
              { id: "ALL", labelAr: "جميع اللهجات", labelEn: "All Dialects" },
              { id: "EGYPTIAN", labelAr: "اللهجة المصرية", labelEn: "Egyptian" },
              { id: "GULF", labelAr: "اللهجة الخليجية", labelEn: "Gulf" },
              { id: "LEVANTINE", labelAr: "اللهجة الشامية", labelEn: "Levantine" },
              { id: "FOSHA", labelAr: "الفصحى المعاصرة", labelEn: "Standard" },
            ].map((d) => (
              <button
                key={d.id}
                onClick={() => setSelectedDialect(d.id)}
                className={`px-4 py-2 rounded-2xl text-xs font-bold transition ${
                  selectedDialect === d.id
                    ? "bg-teal-800 text-white shadow-md"
                    : "bg-white text-gray-700 border border-alabaster-border hover:bg-gray-50"
                }`}
              >
                {language === "ar" ? d.labelAr : d.labelEn}
              </button>
            ))}
          </div>
        </div>

        {/* Tracks Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredTracks.map((track) => {
            const isCurrent = currentTrack.id === track.id;
            return (
              <div
                key={track.id}
                className={`bg-white rounded-3xl border p-6 shadow-sm transition space-y-4 flex flex-col justify-between ${
                  isCurrent ? "border-teal-700 ring-2 ring-teal-700/20" : "border-alabaster-border hover:border-teal-300"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-900 border border-teal-200 text-[10px] font-bold">
                      {language === "ar" ? track.dialectLabelAr : track.dialectLabelEn}
                    </span>
                    <span className="text-xs text-gray-400 font-bold">{track.durationMinutes} دقائق</span>
                  </div>

                  <div className="flex items-start gap-4">
                    <img
                      src={track.coverImage}
                      alt={track.titleAr}
                      className="w-16 h-16 rounded-2xl object-cover shadow flex-shrink-0"
                    />
                    <div>
                      <h4 className="font-extrabold text-sm text-teal-950">
                        {language === "ar" ? track.titleAr : track.titleEn}
                      </h4>
                      <p className="text-xs text-sage-800 font-medium mt-0.5">{track.speakerName}</p>
                      <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">
                        {language === "ar" ? track.descriptionAr : track.descriptionEn}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>متاح للاستماع المجاني</span>
                  </span>

                  <button
                    type="button"
                    onClick={() => togglePlay(track)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                      isCurrent && isPlaying
                        ? "bg-terracotta-600 text-white"
                        : "bg-teal-800 hover:bg-teal-900 text-white shadow"
                    }`}
                  >
                    {isCurrent && isPlaying ? (
                      <>
                        <Pause className="w-3.5 h-3.5" />
                        <span>إيقاف مؤقت</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-white ml-0.5 rtl:mr-0.5" />
                        <span>تشغيل الجلسة</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Cloud, CloudRain, CloudLightning, Sun, Wind, Thermometer, RefreshCw, MapPin, Droplets, Clock, ChevronLeft, ChevronRight, Newspaper, LayoutDashboard, Search } from 'lucide-react';
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import Markdown from 'react-markdown';

interface Location {
  id: string;
  name: string;
  lat: number;
  lon: number;
  bgSeed?: string;
  bgUrl?: string;
  population: string;
  info: string;
  events: string[];
}

const LOCATIONS: Location[] = [
  { 
    id: 'prusanky', 
    name: 'Prušánky', 
    lat: 48.8319, 
    lon: 17.0256, 
    bgUrl: 'https://images.unsplash.com/photo-1560493676-04071c5f467b?auto=format&fit=crop&w=1920&q=80',
    population: '2 200',
    info: 'Vinařská obec v srdci Podluží, známá unikátní vesničkou vinných sklepů Nechory.',
    events: ['Nechorské krojované hody', 'Zarážání hory', 'Otevřené sklepy']
  },
  { 
    id: 'hodonin', 
    name: 'Hodonín', 
    lat: 48.8517, 
    lon: 17.1322, 
    bgUrl: 'https://images.unsplash.com/photo-1527668752968-14dc70a27c95?auto=format&fit=crop&w=1920&q=80',
    population: '24 000',
    info: 'Město na řece Moravě, rodiště T. G. Masaryka, známé lázněmi a zoologickou zahradou.',
    events: ['Svatovavřinecké slavnosti', 'Hodonínské kulturní léto']
  },
  { 
    id: 'breclav', 
    name: 'Břeclav', 
    lat: 48.7589, 
    lon: 16.8820, 
    bgUrl: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=1920&q=80',
    population: '24 500',
    info: 'Důležitý železniční uzel a brána do Lednicko-valtického areálu.',
    events: ['Svatováclavské slavnosti', 'Břeclavské slavnosti piva']
  },
  { 
    id: 'brno', 
    name: 'Brno', 
    lat: 49.1951, 
    lon: 16.6068, 
    bgUrl: 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=1920&q=80',
    population: '380 000',
    info: 'Metropole Moravy, město vědy, kultury a moderní architektury s hradem Špilberk.',
    events: ['Ignis Brunensis', 'Brněnské Vánoce', 'Špilberk Food Festival']
  },
  { 
    id: 'praha', 
    name: 'Praha', 
    lat: 50.0755, 
    lon: 14.4378, 
    bgUrl: 'https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?auto=format&fit=crop&w=1920&q=80',
    population: '1 300 000',
    info: 'Hlavní město ČR, historická perla Evropy s nepřeberným množstvím památek.',
    events: ['Signal Festival', 'Pražské jaro', 'Designblok']
  },
];

interface DailyForecast {
  date: string;
  weatherCode: number;
  tempMax: number;
  tempMin: number;
}

interface NewsItem {
  title: string;
  summary: string;
  source: string;
  time: string;
}

interface WeatherData {
  temperature: number;
  apparentTemperature: number;
  weatherCode: number;
  windSpeed: number;
  precipitation: number;
  time: string;
  daily: DailyForecast[];
}

export default function App() {
  const [view, setView] = useState<'weather' | 'news'>('weather');
  const [selectedLocation, setSelectedLocation] = useState<Location>(LOCATIONS[0]);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingNews, setLoadingNews] = useState(false);
  const [newsLoadingTime, setNewsLoadingTime] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [showInfo, setShowInfo] = useState(false);

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const fetchNews = useCallback(async () => {
    setLoadingNews(true);
    const startTime = performance.now();
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: "Najdi 5 nejdůležitějších, objektivních a ověřených zpráv z POSLEDNÍCH 14 DNŮ (Česká republika a svět). Odpověz ve formátu JSON jako pole objektů s klíči: title, summary, source, time. Zprávy nesmí být starší než 2 týdny.",
        config: {
          tools: [{ googleSearch: {} }],
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                summary: { type: Type.STRING },
                source: { type: Type.STRING },
                time: { type: Type.STRING }
              },
              required: ["title", "summary", "source", "time"]
            }
          }
        }
      });

      const endTime = performance.now();
      setNewsLoadingTime(Math.round(endTime - startTime));

      if (response.text) {
        try {
          const newsData = JSON.parse(response.text);
          setNews(newsData);
        } catch (e) {
          console.error("Chyba při parsování JSON:", e);
        }
      }
    } catch (err) {
      console.error("Chyba při načítání zpráv:", err);
    } finally {
      setLoadingNews(false);
    }
  }, []);

  useEffect(() => {
    if (view === 'news' && news.length === 0) {
      fetchNews();
    }
  }, [view, news.length, fetchNews]);

  // Real-time clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchWeather = useCallback(async (loc: Location) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}&current=temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`
      );
      
      if (!response.ok) throw new Error('Nepodařilo se načíst data o počasí.');
      
      const data = await response.json();
      
      const daily: DailyForecast[] = data.daily.time.map((time: string, index: number) => ({
        date: time,
        weatherCode: data.daily.weather_code[index],
        tempMax: data.daily.temperature_2m_max[index],
        tempMin: data.daily.temperature_2m_min[index],
      }));

      setWeather({
        temperature: data.current.temperature_2m,
        apparentTemperature: data.current.apparent_temperature,
        weatherCode: data.current.weather_code,
        windSpeed: data.current.wind_speed_10m,
        precipitation: data.current.precipitation,
        time: data.current.time,
        daily,
      });
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Došlo k neznámé chybě.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWeather(selectedLocation);
  }, [selectedLocation, fetchWeather]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchWeather(selectedLocation);
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [selectedLocation, fetchWeather]);

  const handlePrev = () => {
    const currentIndex = LOCATIONS.findIndex(l => l.id === selectedLocation.id);
    const nextIndex = (currentIndex - 1 + LOCATIONS.length) % LOCATIONS.length;
    setSelectedLocation(LOCATIONS[nextIndex]);
  };

  const handleNext = () => {
    const currentIndex = LOCATIONS.findIndex(l => l.id === selectedLocation.id);
    const nextIndex = (currentIndex + 1) % LOCATIONS.length;
    setSelectedLocation(LOCATIONS[nextIndex]);
  };

  const getWeatherIcon = (code: number, size: string = "w-24 h-24") => {
    if (code === 0) return <Sun className={`${size} text-yellow-400 drop-shadow-lg`} />;
    if (code <= 3) return <Cloud className={`${size} text-gray-200 drop-shadow-lg`} />;
    if (code <= 67) return <CloudRain className={`${size} text-blue-300 drop-shadow-lg`} />;
    if (code <= 99) return <CloudLightning className={`${size} text-purple-400 drop-shadow-lg`} />;
    return <Cloud className={`${size} text-gray-200 drop-shadow-lg`} />;
  };

  const getWeatherDescription = (code: number) => {
    if (code === 0) return 'Jasno';
    if (code <= 3) return 'Polojasno až oblačno';
    if (code <= 67) return 'Déšť';
    if (code <= 99) return 'Bouřky';
    return 'Neznámé';
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-blue-500/30 overflow-x-hidden relative">
      {/* Background Image */}
      <div className="fixed inset-0 z-0">
        <AnimatePresence mode="wait">
          <motion.img
            key={selectedLocation.id}
            src={selectedLocation.bgUrl || `https://picsum.photos/seed/${selectedLocation.bgSeed}/1920/1080?blur=2`}
            alt="Nature Background"
            referrerPolicy="no-referrer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="w-full h-full object-cover"
          />
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-transparent to-slate-950/80" />
      </div>

      <div className="max-w-5xl mx-auto px-6 py-12 flex flex-col items-center min-h-screen relative z-10">
        
        {/* Navigation */}
        <div className="flex items-center gap-1 bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 p-1.5 rounded-2xl mb-12 shadow-xl">
          <button 
            onClick={() => setView('weather')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl transition-all font-bold text-xs uppercase tracking-widest ${view === 'weather' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Počasí
          </button>
          <button 
            onClick={() => setView('news')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl transition-all font-bold text-xs uppercase tracking-widest ${view === 'news' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
          >
            <Newspaper className="w-4 h-4" />
            Aktuality
          </button>
        </div>

        {/* Live Clock */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-12 text-center"
        >
          <div className="text-4xl font-light tracking-widest text-slate-200 drop-shadow-lg">
            {currentTime.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-slate-400 font-bold mt-1">
            {currentTime.toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
        </motion.div>

        <div className="relative w-full flex items-center justify-center">
          <AnimatePresence mode="wait">
            {view === 'weather' ? (
              <motion.div
                key="weather-view"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="w-full"
              >
                <AnimatePresence mode="wait">
                  {loading && !weather ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center gap-4 py-20 w-full"
                    >
                      <RefreshCw className="w-8 h-8 animate-spin text-blue-400" />
                      <p className="text-slate-300 font-medium text-center drop-shadow-md">Zjišťuji počasí v lokalitě {selectedLocation.name}...</p>
                    </motion.div>
                  ) : error ? (
                    <motion.div
                      key="error"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-red-500/20 border border-red-500/30 p-6 rounded-2xl text-center w-full backdrop-blur-md"
                    >
                      <p className="text-red-300 mb-4">{error}</p>
                      <button 
                        onClick={() => fetchWeather(selectedLocation)}
                        className="bg-red-500/80 hover:bg-red-600 text-white px-6 py-2 rounded-full transition-colors font-medium"
                      >
                        Zkusit znovu
                      </button>
                    </motion.div>
                  ) : weather ? (
                    <motion.div
                      key={selectedLocation.id}
                      initial={{ opacity: 0, scale: 0.95, x: 20 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95, x: -20 }}
                      drag="x"
                      dragConstraints={{ left: 0, right: 0 }}
                      dragElastic={0.2}
                      onDragEnd={(_, info) => {
                        if (info.offset.x > 100) handlePrev();
                        else if (info.offset.x < -100) handleNext();
                      }}
                      className="w-full cursor-grab active:cursor-grabbing touch-none"
                    >
                      <motion.div 
                        layout
                        className="bg-slate-900/40 border border-slate-700/50 p-8 rounded-[2.5rem] backdrop-blur-xl shadow-2xl relative overflow-hidden group select-none"
                      >
                        <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-600/10 blur-[80px] rounded-full group-hover:bg-blue-500/20 transition-colors duration-700" />
                        
                        <div className="relative z-10 flex flex-col items-center text-center">
                          <motion.div 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-2 mb-4"
                          >
                            <div className="bg-blue-600 p-1.5 rounded-lg shadow-lg shadow-blue-600/40">
                              <Thermometer className="w-4 h-4 text-white" />
                            </div>
                            <h1 className="text-xl font-bold tracking-tighter drop-shadow-md text-white">noxit</h1>
                          </motion.div>

                          <motion.button 
                            layout
                            onClick={() => setShowInfo(!showInfo)}
                            className="flex items-center gap-1.5 text-slate-300 mb-6 bg-slate-800/40 px-4 py-1.5 rounded-full border border-slate-700/30 hover:bg-blue-600/20 hover:border-blue-500/50 transition-all cursor-pointer group/loc"
                          >
                            <MapPin className="w-4 h-4 text-blue-400 group-hover/loc:scale-110 transition-transform" />
                            <span className="text-sm font-medium uppercase tracking-widest font-bold">{selectedLocation.name}, CZ</span>
                          </motion.button>

                          <AnimatePresence mode="wait">
                            {showInfo ? (
                              <motion.div
                                key="info-content"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.3 }}
                                className="w-full mb-4 text-left bg-slate-800/40 p-6 rounded-3xl border border-slate-700/30 backdrop-blur-md overflow-hidden"
                              >
                                <div className="flex justify-between items-start mb-4">
                                  <h3 className="text-lg font-bold text-blue-400">O lokalitě</h3>
                                  <div className="text-[10px] bg-blue-600/20 text-blue-300 px-2 py-0.5 rounded-md border border-blue-500/30">
                                    {selectedLocation.population} obyv.
                                  </div>
                                </div>
                                <p className="text-sm text-slate-300 leading-relaxed mb-4">
                                  {selectedLocation.info}
                                </p>
                                
                                <div className="w-full h-40 rounded-2xl overflow-hidden border border-slate-700/50 mb-4">
                                  <iframe 
                                    width="100%" 
                                    height="100%" 
                                    style={{ border: 0 }} 
                                    loading="lazy" 
                                    allowFullScreen 
                                    referrerPolicy="no-referrer-when-downgrade"
                                    src={`https://www.google.com/maps?q=${encodeURIComponent(selectedLocation.name + ', CZ')}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
                                  ></iframe>
                                </div>

                                <div className="space-y-2">
                                  <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500">Nadcházející akce</h4>
                                  <div className="flex flex-wrap gap-2">
                                    {selectedLocation.events.map((event, i) => (
                                      <span key={i} className="text-[10px] bg-slate-700/50 px-2 py-1 rounded-lg border border-slate-600/30 text-slate-300">
                                        {event}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </motion.div>
                            ) : (
                              <motion.div
                                key="weather-content"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.3 }}
                                className="w-full flex flex-col lg:flex-row gap-8 lg:gap-12 items-start"
                              >
                                {/* Left Column: Current Weather */}
                                <div className="w-full lg:w-1/2 flex flex-col items-center">
                                  <div className="mb-6">
                                    {getWeatherIcon(weather.weatherCode)}
                                  </div>

                                  <div className="text-center">
                                    <div className="text-7xl font-bold tracking-tighter mb-2 drop-shadow-lg">
                                      {Math.round(weather.temperature)}°
                                    </div>
                                    <div className="text-xl text-slate-200 font-medium mb-8 drop-shadow-md">
                                      {getWeatherDescription(weather.weatherCode)}
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-4 w-full">
                                    <div className="bg-slate-800/30 border border-slate-700/20 p-4 rounded-2xl flex flex-col items-center backdrop-blur-sm">
                                      <Wind className="w-5 h-5 text-blue-300 mb-2" />
                                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Vítr</span>
                                      <span className="font-semibold text-sm">{weather.windSpeed} km/h</span>
                                    </div>
                                    <div className="bg-slate-800/30 border border-slate-700/20 p-4 rounded-2xl flex flex-col items-center backdrop-blur-sm">
                                      <Thermometer className="w-5 h-5 text-orange-300 mb-2" />
                                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Pocitově</span>
                                      <span className="font-semibold text-sm">{Math.round(weather.apparentTemperature)}°</span>
                                    </div>
                                    <div className="bg-slate-800/30 border border-slate-700/20 p-4 rounded-2xl flex flex-col items-center backdrop-blur-sm">
                                      <Droplets className="w-5 h-5 text-cyan-300 mb-2" />
                                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Srážky</span>
                                      <span className="font-semibold text-sm">{weather.precipitation} mm</span>
                                    </div>
                                    <div className="bg-slate-800/30 border border-slate-700/20 p-4 rounded-2xl flex flex-col items-center backdrop-blur-sm">
                                      <Clock className="w-5 h-5 text-emerald-300 mb-2" />
                                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Měření</span>
                                      <span className="font-semibold text-sm">{weather.time.split('T')[1]}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Right Column: 7-Day Forecast */}
                                <div className="w-full lg:w-1/2">
                                  <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4 text-center lg:text-left">Předpověď na 7 dní</h4>
                                  <div className="space-y-2">
                                    {weather.daily.map((day, i) => (
                                      <motion.div 
                                        key={day.date}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        className="bg-slate-800/20 border border-slate-700/10 p-3 rounded-2xl flex items-center justify-between backdrop-blur-sm hover:bg-slate-800/40 transition-colors"
                                      >
                                        <div className="flex items-center gap-3 w-24">
                                          <span className="text-xs font-bold text-slate-400 uppercase">
                                            {i === 0 ? 'Dnes' : new Date(day.date).toLocaleDateString('cs-CZ', { weekday: 'short' })}
                                          </span>
                                        </div>
                                        <div className="flex items-center justify-center flex-1">
                                          {getWeatherIcon(day.weatherCode, "w-6 h-6")}
                                        </div>
                                        <div className="flex items-center justify-end gap-3 w-24">
                                          <span className="text-sm font-bold text-white">{Math.round(day.tempMax)}°</span>
                                          <span className="text-sm font-medium text-slate-500">{Math.round(day.tempMin)}°</span>
                                        </div>
                                      </motion.div>
                                    ))}
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </motion.div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </motion.div>
            ) : (
              <motion.div
                key="news-view"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="w-full max-w-3xl"
              >
                <div className="bg-slate-900/40 border border-slate-700/50 p-8 rounded-[2.5rem] backdrop-blur-xl shadow-2xl">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex flex-col">
                      <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
                        <Newspaper className="w-6 h-6 text-blue-400" />
                        Aktuality
                      </h2>
                      {newsLoadingTime && (
                        <span className="text-[10px] text-slate-500 font-medium mt-1">
                          Načteno za {(newsLoadingTime / 1000).toFixed(2)} s
                        </span>
                      )}
                    </div>
                    <button 
                      onClick={fetchNews}
                      disabled={loadingNews}
                      className="p-2 bg-slate-800/50 rounded-xl hover:bg-slate-700/50 transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={`w-5 h-5 text-blue-400 ${loadingNews ? 'animate-spin' : ''}`} />
                    </button>
                  </div>

                  {loadingNews ? (
                    <div className="flex flex-col items-center py-20 gap-4">
                      <RefreshCw className="w-8 h-8 animate-spin text-blue-400" />
                      <p className="text-slate-400 font-medium">Načítám nejnovější zprávy...</p>
                    </div>
                  ) : news.length > 0 ? (
                    <div className="space-y-6">
                      {news.map((item, i) => (
                        <motion.a
                          key={i}
                          href={`https://www.google.com/search?q=${encodeURIComponent(item.title + ' ' + item.source)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="block p-6 bg-slate-800/30 border border-slate-700/30 rounded-3xl hover:bg-slate-800/50 hover:border-blue-500/30 transition-all group"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400 bg-blue-600/10 px-2 py-0.5 rounded-md">
                              {item.source}
                            </span>
                            <span className="text-[10px] text-slate-500 font-medium">
                              {item.time}
                            </span>
                          </div>
                          <h3 className="text-lg font-bold text-white mb-2 group-hover:text-blue-300 transition-colors">
                            {item.title}
                          </h3>
                          <div className="text-sm text-slate-400 leading-relaxed prose prose-invert prose-sm max-w-none">
                            <Markdown>{item.summary}</Markdown>
                          </div>
                          <div className="flex items-center gap-1 text-slate-500 group-hover:text-blue-400 text-[10px] font-bold uppercase tracking-widest mt-4 transition-colors">
                            Hledat podrobnosti na Google
                            <Search className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                          </div>
                        </motion.a>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-20">
                      <p className="text-slate-500">Momentálně nejsou k dispozici žádné nové zprávy.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {view === 'weather' && (
          <>
            <div className="mt-8 text-slate-500 text-[10px] uppercase tracking-[0.2em] font-bold flex flex-col items-center gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 bg-slate-800 rounded-full" />
                <span>Táhněte myší pro změnu města</span>
              </div>
            </div>

            <div className="mt-4 text-slate-400 text-[10px] font-medium drop-shadow-md">
              Poslední aktualizace dat: {lastUpdated.toLocaleTimeString('cs-CZ')}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

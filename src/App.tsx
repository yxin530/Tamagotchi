import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Utensils, Gamepad2, Moon, Sun, Sparkles, RotateCcw, Send } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

// --- SOUND ENGINE ---
let audioCtx: AudioContext | null = null;
const playSound = (type: 'blip' | 'eat' | 'error' | 'happy') => {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    const now = audioCtx.currentTime;
    
    if (type === 'blip') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'eat') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.setValueAtTime(600, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'happy') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(500, now);
      osc.frequency.setValueAtTime(800, now + 0.1);
      osc.frequency.setValueAtTime(1200, now + 0.2);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'error') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    }
  } catch (e) {
    console.error("Audio error", e);
  }
};

type PetState = 'idle' | 'eating' | 'playing' | 'sleeping' | 'dead';
type PetStage = 'egg' | 'baby' | 'teen' | 'adult';
type PetVariant = 'normal' | 'good' | 'bad';

type LogEntry = {
  id: number;
  text: string;
  time: string;
};

type PetStats = {
  fullness: number;
  happiness: number;
  energy: number;
  health: number;
  ticks: number;
  poops: number;
  state: PetState;
  stage: PetStage;
  variant: PetVariant;
  careMistakes: number;
  lastUpdated: number;
  logs: LogEntry[];
};

const MAX_STAT = 100;
const TICK_RATE = 1000; // 1 second per tick

// --- CSS PIXEL ART ENGINE (16x16) ---
const SPRITES = {
  egg: [
    "      1111      ",
    "     122221     ",
    "    12222221    ",
    "   1223333221   ",
    "  122333333221  ",
    "  122233332221  ",
    " 12222222222221 ",
    " 12233322333221 ",
    " 12333333333321 ",
    " 12233333333221 ",
    "  122233332221  ",
    "  122222222221  ",
    "   1222222221   ",
    "    11111111    ",
    "                ",
    "                "
  ],
  baby: [
    "                ",
    "                ",
    "                ",
    "                ",
    "      1111      ",
    "    11222211    ",
    "   1222222221   ",
    "  122122221221  ",
    "  122122221221  ",
    "  122222222221  ",
    "   1223333221   ",
    "    11222211    ",
    "      1111      ",
    "                ",
    "                ",
    "                "
  ],
  teen: [
    "                ",
    "   111    111   ",
    "  12221  12221  ",
    "  122211112221  ",
    "   1222222221   ",
    "  122222222221  ",
    "  121122221121  ",
    "  121122221121  ",
    "  122223322221  ",
    "   1222222221   ",
    "   1222222221   ",
    "  122211112221  ",
    "  1111    1111  ",
    "                ",
    "                ",
    "                "
  ],
  adult_good: [
    "  111      111  ",
    " 12221    12221 ",
    " 12221111112221 ",
    "  122222222221  ",
    " 12222222222221 ",
    " 12111222211121 ",
    " 12111222211121 ",
    " 12222233222221 ",
    "  122222222221  ",
    "  122222222221  ",
    " 12222222222221 ",
    " 12221111112221 ",
    "  111      111  ",
    "                ",
    "                ",
    "                "
  ],
  adult_bad: [
    "                ",
    " 11          11 ",
    " 121        121 ",
    " 12211111111221 ",
    "  122222222221  ",
    "  121122221121  ",
    "  121122221121  ",
    "  122222222221  ",
    "  122211112221  ",
    "   1222222221   ",
    "   1122222211   ",
    "     111111     ",
    "                ",
    "                ",
    "                ",
    "                "
  ],
  dead: [
    "                ",
    "                ",
    "      1111      ",
    "    11222211    ",
    "   1222222221   ",
    "  121222222121  ",
    "  122122221221  ",
    "  121222222121  ",
    "  122222222221  ",
    "   1211111121   ",
    "    12222221    ",
    "     111111     ",
    "                ",
    "                ",
    "                ",
    "                "
  ]
};

const PixelArt = ({ spriteKey, isBlinking }: { spriteKey: keyof typeof SPRITES, isBlinking?: boolean }) => {
  const sprite = SPRITES[spriteKey];
  const colors: Record<string, string> = {
    '.': 'transparent',
    ' ': 'transparent',
    '1': '#000000', // Black outline
    '2': '#FFFFFF', // White body
    '3': '#FFB7B2', // Pink blush/spots
  };

  return (
    <div className={`flex flex-col drop-shadow-md ${isBlinking ? 'animate-blink' : ''}`}>
      {sprite.map((row, y) => (
        <div key={y} className="flex">
          {row.split('').map((char, x) => (
            <div 
              key={`${x}-${y}`} 
              className="w-[6px] h-[6px] sm:w-2 sm:h-2" 
              style={{ backgroundColor: colors[char] || 'transparent' }} 
            />
          ))}
        </div>
      ))}
    </div>
  );
};

// --- GAME LOGIC ---
function addLog(logs: LogEntry[], text: string): LogEntry[] {
  const newLog = {
    id: Date.now() + Math.random(),
    text,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };
  return [newLog, ...logs].slice(0, 50); // Keep last 50 logs
}

function simulateTick(prev: PetStats): PetStats {
  if (prev.state === 'dead') return prev;

  let { fullness, happiness, energy, health, ticks, poops, stage, variant, careMistakes, logs } = prev;
  let state: PetState = prev.state;

  ticks += 1;

  // Evolution Logic
  if (stage === 'egg' && ticks >= 10) {
    stage = 'baby';
    logs = addLog(logs, "Egg hatched!");
  }
  if (stage === 'baby' && ticks >= 60) {
    stage = 'teen';
    logs = addLog(logs, "Evolved to Teen!");
  }
  if (stage === 'teen' && ticks >= 180) {
    stage = 'adult';
    variant = careMistakes < 5 ? 'good' : 'bad';
    logs = addLog(logs, `Evolved to Adult (${variant})!`);
  }

  // Stat decay (babies decay faster)
  const decayMultiplier = stage === 'baby' ? 1.5 : stage === 'teen' ? 1.2 : 1;

  if (state === 'sleeping') {
    energy = Math.min(MAX_STAT, energy + 5);
    fullness = Math.max(0, fullness - 0.5 * decayMultiplier);
  } else {
    fullness = Math.max(0, fullness - 2 * decayMultiplier);
    happiness = Math.max(0, happiness - 1 * decayMultiplier);
    energy = Math.max(0, energy - 1 * decayMultiplier);
  }

  // Pooping mechanics
  if (ticks % 15 === 0 && fullness > 30 && state !== 'sleeping' && stage !== 'egg') {
    poops = Math.min(5, poops + 1);
    logs = addLog(logs, "Pet made a mess...");
  }

  // Penalties for poor care
  if (poops > 0) {
    health -= poops * 1;
    happiness = Math.max(0, happiness - poops * 1);
    careMistakes += 0.1; 
  }

  if (fullness < 20) { health -= 2; careMistakes += 0.1; }
  if (fullness === 0) { health -= 5; careMistakes += 0.5; }
  if (energy === 0) { health -= 2; careMistakes += 0.2; }
  if (happiness < 20) { careMistakes += 0.1; }

  // Warnings
  if (fullness === 20 && ticks % 5 === 0) logs = addLog(logs, "Pet is hungry!");
  if (energy === 20 && ticks % 5 === 0) logs = addLog(logs, "Pet is sleepy!");

  // Healing if well cared for
  if (fullness > 70 && energy > 50 && poops === 0 && health < MAX_STAT) health += 1;

  health = Math.max(0, Math.min(MAX_STAT, health));

  if (health <= 0) {
    state = 'dead' as PetState;
    logs = addLog(logs, "Pet passed away...");
  }

  return { fullness, happiness, energy, health, ticks, poops, state, stage, variant, careMistakes, lastUpdated: Date.now(), logs };
}

export default function App() {
  const [isStarted, setIsStarted] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const [pet, setPet] = useState<PetStats>({
    fullness: 100,
    happiness: 100,
    energy: 100,
    health: 100,
    ticks: 0,
    poops: 0,
    state: 'idle',
    stage: 'egg',
    variant: 'normal',
    careMistakes: 0,
    lastUpdated: Date.now(),
    logs: [{ id: 1, text: "Welcome to Virtual Pet!", time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]
  });

  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [pet.logs]);

  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatting || pet.state === 'dead' || pet.state === 'sleeping') {
      playSound('error');
      return;
    }

    playSound('blip');
    const userMsg = chatInput.trim();
    setChatInput('');
    setPet(prev => ({ ...prev, logs: addLog(prev.logs, `You: ${userMsg}`) }));
    setIsChatting(true);

    try {
      const ai = new GoogleGenAI({ apiKey: (import.meta as any).env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY as string });
      const prompt = `You are a virtual tamagotchi pet. Your current stage is ${pet.stage}. Your happiness is ${pet.happiness}/100, fullness is ${pet.fullness}/100, energy is ${pet.energy}/100. The user says: "${userMsg}". Respond in character as the pet in 1 short sentence. Keep it cute and retro.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      const petReply = response.text || "beep boop!";
      setPet(prev => ({ ...prev, logs: addLog(prev.logs, `Pet: ${petReply}`) }));
      playSound('happy');
    } catch (error) {
      setPet(prev => ({ ...prev, logs: addLog(prev.logs, `System: Connection error.`) }));
      playSound('error');
    } finally {
      setIsChatting(false);
    }
  };

  // Load Game on Mount
  useEffect(() => {
    const saved = localStorage.getItem('tamagotchi_state_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const now = Date.now();
        const elapsed = now - parsed.lastUpdated;
        const offlineTicks = Math.floor(elapsed / TICK_RATE);

        let currentState = parsed;
        
        // Simulate offline progress (capped at 1 day to prevent freezing)
        const ticksToSimulate = Math.min(offlineTicks, 86400);
        if (ticksToSimulate > 0) {
          currentState.logs = addLog(currentState.logs, `You were gone for ${ticksToSimulate}s.`);
        }

        for (let i = 0; i < ticksToSimulate; i++) {
          currentState = simulateTick(currentState);
          if (currentState.state === 'dead') break;
        }

        currentState.lastUpdated = now;
        setPet(currentState);
        setIsStarted(true);
      } catch (e) {
        console.error("Failed to load save", e);
      }
    }
  }, []);

  // Main Game Loop
  useEffect(() => {
    if (!isStarted || pet.state === 'dead') return;

    const timer = setInterval(() => {
      setPet(prev => {
        const next = simulateTick(prev);
        localStorage.setItem('tamagotchi_state_v2', JSON.stringify(next));
        return next;
      });
    }, TICK_RATE);

    return () => clearInterval(timer);
  }, [isStarted, pet.state]);

  // Actions
  const feed = () => {
    if (pet.state === 'dead' || pet.state === 'sleeping' || pet.stage === 'egg') {
      playSound('error');
      return;
    }
    playSound('eat');
    setPet(prev => ({ 
      ...prev, 
      state: 'eating', 
      fullness: Math.min(MAX_STAT, prev.fullness + 30),
      logs: addLog(prev.logs, "Fed the pet!")
    }));
    setTimeout(() => {
      setPet(prev => prev.state === 'eating' ? { ...prev, state: 'idle' } : prev);
    }, 2000);
  };

  const play = () => {
    if (pet.state === 'dead' || pet.state === 'sleeping' || pet.stage === 'egg') {
      playSound('error');
      return;
    }
    playSound('happy');
    setPet(prev => ({ 
      ...prev, 
      state: 'playing', 
      happiness: Math.min(MAX_STAT, prev.happiness + 20), 
      energy: Math.max(0, prev.energy - 10),
      logs: addLog(prev.logs, "Played a game!")
    }));
    setTimeout(() => {
      setPet(prev => prev.state === 'playing' ? { ...prev, state: 'idle' } : prev);
    }, 2000);
  };

  const clean = () => {
    if (pet.state === 'dead' || pet.state === 'sleeping') {
      playSound('error');
      return;
    }
    if (pet.poops > 0) {
      playSound('blip');
      setPet(prev => ({ ...prev, poops: 0, logs: addLog(prev.logs, "Cleaned the mess!") }));
    } else {
      playSound('error');
    }
  };

  const toggleSleep = () => {
    if (pet.state === 'dead' || pet.stage === 'egg') {
      playSound('error');
      return;
    }
    playSound('blip');
    setPet(prev => {
      const isSleeping = prev.state === 'sleeping';
      return { 
        ...prev, 
        state: isSleeping ? 'idle' : 'sleeping',
        logs: addLog(prev.logs, isSleeping ? "Pet woke up." : "Pet went to sleep.")
      };
    });
  };

  const reset = () => {
    playSound('happy');
    const newState: PetStats = {
      fullness: 100,
      happiness: 100,
      energy: 100,
      health: 100,
      ticks: 0,
      poops: 0,
      state: 'idle',
      stage: 'egg',
      variant: 'normal',
      careMistakes: 0,
      lastUpdated: Date.now(),
      logs: [{ id: Date.now(), text: "A new egg appeared!", time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]
    };
    setPet(newState);
    localStorage.setItem('tamagotchi_state_v2', JSON.stringify(newState));
    setIsStarted(true);
  };

  // Determine which sprite to show
  const getSpriteKey = (): keyof typeof SPRITES => {
    if (pet.state === 'dead') return 'dead';
    if (pet.stage === 'adult') return `adult_${pet.variant}` as keyof typeof SPRITES;
    return pet.stage;
  };

  // Start Screen
  if (!isStarted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 font-pixel">
        <div className="bg-[#E0BBE4] p-8 rounded-3xl pixel-shadow border-4 border-black max-w-sm w-full text-center">
          <h1 className="text-2xl font-bold text-black mb-8 leading-loose">VIRTUAL<br/>PET</h1>
          <div className="flex justify-center my-8 animate-bounce">
            <PixelArt spriteKey="egg" />
          </div>
          <button 
            onClick={() => { playSound('happy'); setIsStarted(true); }} 
            className="bg-[#957DAD] text-white px-6 py-4 border-4 border-black pixel-shadow hover:translate-y-1 hover:pixel-shadow-sm active:translate-y-2 active:shadow-none transition-all text-sm"
          >
            START GAME
          </button>
        </div>
      </div>
    );
  }

  // Main Game Screen
  return (
    <div className="min-h-screen flex flex-col md:flex-row items-center justify-center p-4 gap-8 font-pixel selection:bg-[#D4C1EC]">
      
      {/* Device Case */}
      <div className="bg-[#E0BBE4] p-6 sm:p-8 rounded-[3rem] pixel-shadow border-4 border-black w-full max-w-sm relative flex flex-col items-center">
        
        {/* Screen Bezel */}
        <div className="bg-[#fdf2f8] p-4 rounded-2xl border-4 border-black pixel-shadow-inset w-full mb-6 relative">
          
          {/* Brand */}
          <div className="text-center text-[#957DAD] text-[10px] mb-4">TAMAGOTCHI v1.0</div>

          {/* Actual Screen */}
          <div className="bg-[#D4C1EC] rounded p-3 border-4 border-black h-64 flex flex-col relative overflow-hidden">
            
            {/* Stats Header */}
            <div className="flex justify-between text-[10px] text-black mb-2">
               <span>{pet.stage.toUpperCase()}</span>
               <span>AGE:{Math.floor(pet.ticks / 60)}</span>
            </div>

            {/* Pet Area */}
            <div className="flex-1 flex items-center justify-center relative">
               {/* Poops */}
               <div className="absolute bottom-0 left-0 flex gap-1 text-xl">
                 {[...Array(pet.poops)].map((_, i) => (
                   <span key={i}>💩</span>
                 ))}
               </div>
               
               {/* Pet Animation */}
               <motion.div 
                 animate={
                   pet.state === 'dead' ? {} :
                   pet.state === 'sleeping' ? { y: [0, 4, 0] } :
                   pet.state === 'playing' ? { y: [0, -16, 0], rotate: [0, 10, -10, 0] } :
                   pet.state === 'eating' ? { scale: [1, 1.1, 1] } :
                   { y: [0, -4, 0] }
                 }
                 transition={{ repeat: Infinity, duration: pet.state === 'sleeping' ? 3 : pet.state === 'playing' ? 0.5 : pet.state === 'eating' ? 0.3 : 2 }}
                 className="relative"
               >
                 {pet.state === 'sleeping' && (
                   <div className="absolute -top-6 -right-6 text-sm text-black animate-pulse">Zz</div>
                 )}
                 {pet.state === 'eating' && (
                   <div className="absolute -top-6 -right-6 text-sm animate-bounce">🍔</div>
                 )}
                 <PixelArt spriteKey={getSpriteKey()} isBlinking={pet.state !== 'dead' && pet.state !== 'sleeping'} />
               </motion.div>
            </div>

            {/* Status Bars */}
            <div className="space-y-2 mt-auto">
              <StatBar label="FOOD" value={pet.fullness} />
              <StatBar label="JOY" value={pet.happiness} />
              <StatBar label="NRG" value={pet.energy} />
            </div>

          </div>
        </div>

        {/* Buttons */}
        <div className="grid grid-cols-4 gap-2 w-full px-2">
          <DeviceButton onClick={feed} icon={<Utensils size={18} />} label="FEED" disabled={pet.state === 'dead' || pet.state === 'sleeping' || pet.stage === 'egg'} />
          <DeviceButton onClick={play} icon={<Gamepad2 size={18} />} label="PLAY" disabled={pet.state === 'dead' || pet.state === 'sleeping' || pet.stage === 'egg'} />
          <DeviceButton onClick={clean} icon={<Sparkles size={18} />} label="CLEAN" disabled={pet.state === 'dead' || pet.state === 'sleeping' || pet.poops === 0} />
          <DeviceButton onClick={toggleSleep} icon={pet.state === 'sleeping' ? <Sun size={18} /> : <Moon size={18} />} label={pet.state === 'sleeping' ? "WAKE" : "SLEEP"} disabled={pet.state === 'dead' || pet.stage === 'egg'} />
        </div>

        {/* Reset Button (Only visible when dead) */}
        {pet.state === 'dead' && (
          <div className="absolute top-4 right-4">
            <button onClick={reset} className="bg-[#FFDFD3] text-black p-2 border-2 border-black pixel-shadow hover:translate-y-1 hover:pixel-shadow-sm active:translate-y-2 active:shadow-none transition-all">
              <RotateCcw size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Chat / Log Window */}
      <div className="bg-[#fdf2f8] border-4 border-black pixel-shadow w-full max-w-sm h-64 md:h-[500px] flex flex-col rounded-xl overflow-hidden">
        <div className="bg-[#957DAD] text-white p-3 border-b-4 border-black text-xs flex justify-between items-center">
          <span>PET_LOG.EXE</span>
          <div className="flex gap-1">
            <div className="w-3 h-3 bg-[#FFDFD3] border-2 border-black rounded-full"></div>
            <div className="w-3 h-3 bg-[#E0BBE4] border-2 border-black rounded-full"></div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white">
          {pet.logs.map((log) => (
            <div key={log.id} className="text-[10px] leading-relaxed">
              <span className="text-[#957DAD]">[{log.time}]</span>{' '}
              <span className="text-black">{log.text}</span>
            </div>
          ))}
          <div ref={logsEndRef} />
        </div>
        
        {/* Chat Input */}
        <form onSubmit={handleChat} className="bg-[#E0BBE4] p-2 flex gap-2 border-t-4 border-black">
          <input 
            type="text" 
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            placeholder="Chat with pet..."
            className="flex-1 bg-white border-2 border-black px-2 py-2 text-[10px] text-black focus:outline-none placeholder:text-gray-400"
            disabled={isChatting || pet.state === 'dead' || pet.state === 'sleeping'}
          />
          <button 
            type="submit" 
            disabled={isChatting || pet.state === 'dead' || pet.state === 'sleeping'}
            className="bg-[#FFDFD3] border-2 border-black px-3 py-2 text-black pixel-shadow hover:translate-y-[1px] hover:pixel-shadow-sm active:translate-y-[2px] active:shadow-none disabled:opacity-50 disabled:active:translate-y-0 disabled:active:pixel-shadow transition-all flex items-center justify-center"
          >
            <Send size={14} />
          </button>
        </form>
      </div>

    </div>
  );
}

// Helper component for the status bars
const StatBar = ({ label, value }: { label: string, value: number }) => (
  <div className="flex items-center gap-2 text-[8px] text-black">
    <span className="w-10">{label}</span>
    <div className="flex-1 h-3 border-2 border-black p-[1px] flex gap-[1px] bg-white">
      {[...Array(10)].map((_, i) => (
        <div key={i} className={`flex-1 h-full ${value > i * 10 ? 'bg-black' : 'bg-transparent'}`} />
      ))}
    </div>
  </div>
);

// Helper component for the physical device buttons
const DeviceButton = ({ onClick, icon, label, disabled }: any) => (
  <div className="flex flex-col items-center gap-2">
    <button 
      onClick={onClick}
      className={`w-12 h-12 sm:w-14 sm:h-14 bg-[#FFDFD3] rounded-full border-4 border-black pixel-shadow active:translate-y-1 active:pixel-shadow-sm transition-all flex items-center justify-center text-black ${disabled ? 'opacity-50' : ''}`}
    >
      {icon}
    </button>
    <span className="text-[8px] text-black">{label}</span>
  </div>
);

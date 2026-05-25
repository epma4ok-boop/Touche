import React from "react";
import { motion } from "framer-motion";
import { Dice5, ChevronRight, Heart, Flame, Sparkles, MessageCircleHeart, Skull, Wand2 } from "lucide-react";

const categories = [
  {
    id: "compliments",
    title: "Комплименты",
    description: "Слова, которые греют",
    badge: "ЛЕГКО",
    badgeColor: "text-amber-500",
    color: "from-amber-500/20 to-transparent",
    orbColor: "bg-amber-500",
    shadowColor: "shadow-amber-500/50",
    icon: MessageCircleHeart,
  },
  {
    id: "tenderness",
    title: "Нежность",
    description: "Прикосновения и забота",
    badge: "НЕЖНО",
    badgeColor: "text-pink-400",
    color: "from-pink-500/20 to-transparent",
    orbColor: "bg-pink-400",
    shadowColor: "shadow-pink-400/50",
    icon: Heart,
  },
  {
    id: "desire",
    title: "Желание",
    description: "Игривость и флирт",
    badge: "СРЕДНЕ",
    badgeColor: "text-fuchsia-400",
    color: "from-fuchsia-500/20 to-transparent",
    orbColor: "bg-fuchsia-400",
    shadowColor: "shadow-fuchsia-400/50",
    icon: Sparkles,
  },
  {
    id: "passion",
    title: "Страсть",
    description: "Интенсивность и огонь",
    badge: "ГОРЯЧО",
    badgeColor: "text-red-500",
    color: "from-red-500/20 to-transparent",
    orbColor: "bg-red-500",
    shadowColor: "shadow-red-500/50",
    icon: Flame,
  },
  {
    id: "hard",
    title: "Жёстко",
    description: "Откровенно и смело",
    badge: "18+",
    badgeColor: "text-rose-600",
    color: "from-rose-600/20 to-transparent",
    orbColor: "bg-rose-600",
    shadowColor: "shadow-rose-600/50",
    icon: Skull,
  },
  {
    id: "scenarios",
    title: "Сценарии",
    description: "Ролевые игры и фантазии",
    badge: "ОСОБОЕ",
    badgeColor: "text-indigo-400",
    color: "from-indigo-500/20 to-transparent",
    orbColor: "bg-indigo-400",
    shadowColor: "shadow-indigo-400/50",
    icon: Wand2,
  },
];

export default function Home() {
  return (
    <div className="min-h-[100dvh] w-full bg-background text-foreground flex justify-center">
      <div className="w-full max-w-[390px] px-4 py-6 flex flex-col relative pb-12">
        
        {/* Header */}
        <header className="flex justify-between items-start mb-8 mt-2">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Touché</h1>
            <p className="text-muted-foreground text-sm mt-1">выбери момент</p>
          </div>
          <button className="flex items-center gap-1.5 bg-card/60 backdrop-blur-md border border-white/5 px-3 py-1.5 rounded-full text-sm font-medium hover:bg-card/80 transition-colors">
            <Dice5 className="w-4 h-4 text-primary" />
            <span>пара</span>
          </button>
        </header>

        {/* Categories */}
        <div className="flex-1 flex flex-col gap-3 z-10">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <motion.button
                key={category.id}
                whileHover={{ scale: 0.98 }}
                whileTap={{ scale: 0.96 }}
                className="w-full relative overflow-hidden rounded-2xl bg-card border border-white/5 p-4 flex items-center gap-4 text-left group"
              >
                {/* Background gradient hint */}
                <div 
                  className={`absolute inset-0 opacity-40 bg-gradient-to-r ${category.color} transition-opacity group-hover:opacity-60`}
                />
                
                {/* Glowing Orb */}
                <div className="relative z-10 flex-shrink-0">
                  <div className={`w-12 h-12 rounded-full ${category.orbColor} shadow-[0_0_15px_rgba(0,0,0,0.5)] ${category.shadowColor} flex items-center justify-center`}>
                    <div className="absolute inset-0 rounded-full blur-sm bg-inherit opacity-50" />
                    <Icon className="w-6 h-6 text-white relative z-10 drop-shadow-md" strokeWidth={2.5} />
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 relative z-10 py-1">
                  <div className="flex justify-between items-center mb-0.5">
                    <h2 className="font-bold text-lg leading-tight truncate pr-2">{category.title}</h2>
                    <span className={`text-[10px] font-black tracking-wider ${category.badgeColor}`}>
                      {category.badge}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-xs truncate">
                    {category.description}
                  </p>
                </div>

                {/* Chevron */}
                <div className="relative z-10 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors ml-1">
                  <ChevronRight className="w-5 h-5" />
                </div>
              </motion.button>
            )
          })}
        </div>

        {/* Footer Hint */}
        <div className="mt-8 text-center text-xs text-muted-foreground/60 z-10">
          удержи карточку для деталей
        </div>
        
        {/* Background ambient glow */}
        <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0 flex justify-center">
          <div className="absolute -top-[20%] -right-[20%] w-[70%] h-[50%] bg-primary/10 blur-[120px] rounded-full mix-blend-screen" />
          <div className="absolute -bottom-[10%] -left-[10%] w-[60%] h-[40%] bg-rose-900/10 blur-[100px] rounded-full mix-blend-screen" />
        </div>
      </div>
    </div>
  );
}

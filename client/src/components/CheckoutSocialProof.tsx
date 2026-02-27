import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const NAMES = [
  "João", "Maria", "Carla", "Ana", "Lucas", "Beatriz", "Pedro", "Camila",
  "Rafael", "Mariana", "Bruno", "Juliana", "Felipe", "Larissa", "Gustavo", "Renata",
];

const displayNames: Record<string, string> = {
  basico: "Básico",
  intermediario: "Intermediário",
  premium: "Premium",
  diamante: "Diamante",
};

function getDayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function getTimePeriod(): "morning" | "afternoon" | "night" {
  const h = new Date().getHours();
  if (h >= 5 && h <= 11) return "morning";
  if (h >= 12 && h <= 17) return "afternoon";
  return "night";
}

function getBadgeText(packId: string, period: "morning" | "afternoon" | "night") {
  const texts: Record<string, Record<string, string>> = {
    basico: {
      morning: "Agenda do dia abrindo agora. Poucas vagas disponíveis.",
      afternoon: "Agenda de produção quase completa hoje.",
      night: "Últimas janelas de produção hoje.",
    },
    intermediario: {
      morning: "Agenda do dia abrindo agora. Poucas aberturas disponíveis.",
      afternoon: "Agenda de produção quase completa hoje.",
      night: "Últimas janelas de produção hoje.",
    },
    premium: {
      morning: "Agenda estratégica do dia abrindo agora. Poucas janelas disponíveis.",
      afternoon: "Agenda estratégica quase completa hoje.",
      night: "Últimas janelas estratégicas hoje.",
    },
    diamante: {
      morning: "Projetos completos: agenda do dia abrindo agora. Disponibilidade reduzida.",
      afternoon: "Projetos completos: agenda quase completa hoje.",
      night: "Projetos completos: últimas janelas de produção hoje.",
    },
  };

  return texts[packId]?.[period] || texts.basico[period];
}

function pickName() {
  return NAMES[Math.floor(Math.random() * NAMES.length)];
}

function pickPushMessage(packId: string, period: "morning" | "afternoon" | "night") {
  const planName = displayNames[packId] || "Básico";
  const name = pickName();

  const neutral = [
    `${name} garantiu o Pack ${planName} agora há pouco.`,
    `${name} fechou o Pack ${planName} hoje.`,
    `${name} acabou de reservar o Pack ${planName}.`,
    `Mais um Pack ${planName} confirmado hoje.`,
    `${name} escolheu o Pack ${planName} para este mês.`,
    `${name} acabou de garantir o Pack ${planName}.`,
    `Novo pedido do Pack ${planName} registrado há poucos minutos.`,
    `${name} finalizou o Pack ${planName} e já entrou na agenda.`,
  ];

  const urgent = [
    `Agenda de hoje movimentada: ${name} pegou o Pack ${planName}.`,
    `Poucas janelas hoje: ${name} garantiu o Pack ${planName}.`,
    `${name} entrou na agenda do Pack ${planName} hoje.`,
    `Últimas janelas de produção hoje para o Pack ${planName}.`,
  ];

  let pool: string[];
  if (period === "morning") {
    pool = neutral;
  } else if (period === "afternoon") {
    pool = [...neutral, ...urgent.slice(0, 3)];
  } else {
    pool = urgent;
  }

  return pool[Math.floor(Math.random() * pool.length)];
}

function shouldShowDailyRefresh() {
  const dayKey = getDayKey();
  const lastVisit = localStorage.getItem("dh_lastVisitDayKey");
  if (lastVisit !== dayKey) {
    localStorage.setItem("dh_lastVisitDayKey", dayKey);
    return true;
  }
  return false;
}

function canShowPushToday() {
  const dayKey = getDayKey();
  const pushDayKey = localStorage.getItem("dh_pushDayKey");
  let count = parseInt(localStorage.getItem("dh_pushShownCountToday") || "0", 10);

  if (pushDayKey !== dayKey) {
    localStorage.setItem("dh_pushDayKey", dayKey);
    localStorage.setItem("dh_pushShownCountToday", "0");
    count = 0;
  }

  return count < 2;
}

function incrementPushCount() {
  const current = parseInt(localStorage.getItem("dh_pushShownCountToday") || "0", 10);
  localStorage.setItem("dh_pushShownCountToday", String(current + 1));
}

function checkCooldown() {
  const last = parseInt(localStorage.getItem("dh_lastPushTimestamp") || "0", 10);
  return Date.now() - last > 45000;
}

function setCooldown() {
  localStorage.setItem("dh_lastPushTimestamp", String(Date.now()));
}

export default function CheckoutSocialProof({ packId }: { packId: string }) {
  const [showBadge, setShowBadge] = useState(false);
  const [badgeText, setBadgeText] = useState("");
  const [dailyRefresh, setDailyRefresh] = useState(false);
  const [pushText, setPushText] = useState("");
  const [showPush, setShowPush] = useState(false);
  const pushesThisVisit = useRef(0);

  useEffect(() => {
    const period = getTimePeriod();
    setBadgeText(getBadgeText(packId, period));

    const timers: ReturnType<typeof setTimeout>[] = [];

    timers.push(setTimeout(() => setShowBadge(true), 5000));

    if (shouldShowDailyRefresh()) {
      timers.push(setTimeout(() => {
        setDailyRefresh(true);
        timers.push(setTimeout(() => setDailyRefresh(false), 6500));
      }, 3000));
    }

    const tryShowPush = () => {
      if (pushesThisVisit.current >= 2 || !canShowPushToday() || !checkCooldown()) return false;
      const period = getTimePeriod();
      setPushText(pickPushMessage(packId, period));
      setShowPush(true);
      incrementPushCount();
      setCooldown();
      pushesThisVisit.current++;
      timers.push(setTimeout(() => setShowPush(false), 6500));
      return true;
    };

    const delay1 = 8000 + Math.random() * 4000;
    timers.push(setTimeout(() => {
      if (tryShowPush()) {
        const delay2 = 20000 + Math.random() * 15000;
        timers.push(setTimeout(() => tryShowPush(), delay2));
      }
    }, delay1));

    return () => timers.forEach(clearTimeout);
  }, [packId]);

  return (
    <>
      <AnimatePresence>
        {showBadge && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.5 }}
            className="mb-4"
          >
            <div className="bg-white/[0.04] border border-white/[0.07] rounded-lg px-4 py-2.5 text-center">
              <p className="text-white/50 text-xs leading-relaxed">{badgeText}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {dailyRefresh && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.5 }}
            className="mb-4"
          >
            <div className="bg-brand-orange/[0.08] border border-brand-orange/15 rounded-lg px-4 py-2.5 text-center">
              <p className="text-brand-orange/70 text-xs leading-relaxed">Agenda atualizada hoje. Poucas vagas liberadas.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPush && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="fixed bottom-6 left-6 right-6 sm:left-6 sm:right-auto sm:max-w-xs z-50"
          >
            <div className="bg-[#1a2a5e] border border-white/[0.08] rounded-xl px-5 py-3.5 shadow-2xl shadow-black/40 flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-green-400/70 flex-shrink-0" />
              <p className="text-white/70 text-xs leading-relaxed">{pushText}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

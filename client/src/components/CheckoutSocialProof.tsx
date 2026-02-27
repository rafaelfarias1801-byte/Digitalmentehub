import { useEffect, useState } from "react";
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
  if (period === "morning") {
    return "Agenda do dia abrindo agora. Poucas vagas disponíveis.";
  }

  const planTexts: Record<string, string> = {
    basico: "Agenda de produção quase completa hoje.",
    intermediario: "Agenda de produção com poucas aberturas hoje.",
    premium: "Agenda estratégica com poucas janelas hoje.",
    diamante: "Projetos completos com disponibilidade reduzida hoje.",
  };

  if (period === "night") {
    return "Últimas vagas na agenda de hoje.";
  }

  return planTexts[packId] || planTexts.basico;
}

function getRandomName() {
  return NAMES[Math.floor(Math.random() * NAMES.length)];
}

function getPushText(packId: string) {
  const planName = displayNames[packId] || "Básico";
  const period = getTimePeriod();
  const name = getRandomName();

  const variations = [
    `${name} garantiu o Pack ${planName} agora há pouco.`,
    `${name} fechou o Pack ${planName} hoje.`,
    `${name} acabou de reservar o Pack ${planName}.`,
    `Mais um Pack ${planName} confirmado hoje.`,
  ];

  if (period === "night") {
    variations.push(`Últimas janelas de produção hoje para o Pack ${planName}.`);
  }

  return variations[Math.floor(Math.random() * variations.length)];
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

export default function CheckoutSocialProof({ packId }: { packId: string }) {
  const [showBadge, setShowBadge] = useState(false);
  const [badgeText, setBadgeText] = useState("");
  const [dailyRefresh, setDailyRefresh] = useState(false);
  const [pushText, setPushText] = useState("");
  const [showPush, setShowPush] = useState(false);

  useEffect(() => {
    const period = getTimePeriod();
    setBadgeText(getBadgeText(packId, period));

    const badgeTimer = setTimeout(() => setShowBadge(true), 5000);

    const showRefresh = shouldShowDailyRefresh();
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    if (showRefresh) {
      refreshTimer = setTimeout(() => {
        setDailyRefresh(true);
        setTimeout(() => setDailyRefresh(false), 6000);
      }, 3000);
    }

    let pushTimer1: ReturnType<typeof setTimeout> | null = null;
    let pushTimer2: ReturnType<typeof setTimeout> | null = null;
    let pushesShownThisVisit = 0;

    if (canShowPushToday()) {
      const delay1 = 8000 + Math.random() * 4000;
      pushTimer1 = setTimeout(() => {
        if (pushesShownThisVisit >= 2) return;
        setPushText(getPushText(packId));
        setShowPush(true);
        incrementPushCount();
        pushesShownThisVisit++;
        setTimeout(() => setShowPush(false), 6500);

        if (canShowPushToday() && pushesShownThisVisit < 2) {
          const delay2 = 20000 + Math.random() * 15000;
          pushTimer2 = setTimeout(() => {
            if (pushesShownThisVisit >= 2) return;
            setPushText(getPushText(packId));
            setShowPush(true);
            incrementPushCount();
            pushesShownThisVisit++;
            setTimeout(() => setShowPush(false), 6500);
          }, delay2);
        }
      }, delay1);
    }

    return () => {
      clearTimeout(badgeTimer);
      if (refreshTimer) clearTimeout(refreshTimer);
      if (pushTimer1) clearTimeout(pushTimer1);
      if (pushTimer2) clearTimeout(pushTimer2);
    };
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
            initial={{ opacity: 0, y: 20, x: 0 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="fixed bottom-6 left-6 right-6 sm:left-6 sm:right-auto sm:max-w-xs z-50"
          >
            <div className="bg-[#1a2a5e] border border-white/[0.08] rounded-xl px-5 py-3.5 shadow-2xl shadow-black/40">
              <p className="text-white/70 text-xs leading-relaxed">{pushText}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

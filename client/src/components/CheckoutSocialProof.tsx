import { useEffect, useState, useRef, useCallback } from "react";
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

function getNeutralMessages(planName: string, name: string) {
  return [
    `${name} garantiu o Pack ${planName} agora há pouco.`,
    `${name} fechou o Pack ${planName} hoje.`,
    `${name} acabou de reservar o Pack ${planName}.`,
    `Mais um Pack ${planName} confirmado hoje.`,
    `${name} escolheu o Pack ${planName} para este mês.`,
    `${name} acabou de garantir o Pack ${planName}.`,
    `Novo pedido do Pack ${planName} registrado há poucos minutos.`,
    `${name} finalizou o Pack ${planName} e já entrou na agenda.`,
  ];
}

function getUrgentMessages(planName: string, name: string) {
  return [
    `Agenda de hoje movimentada: ${name} pegou o Pack ${planName}.`,
    `Poucas janelas hoje: ${name} garantiu o Pack ${planName}.`,
    `${name} entrou na agenda do Pack ${planName} hoje.`,
    `Últimas janelas de produção hoje para o Pack ${planName}.`,
  ];
}

function pickFromRange(arr: string[], start: number, end: number, lastMsg: string): string {
  const pool = arr.slice(start, end + 1).filter(m => m !== lastMsg);
  if (pool.length === 0) return arr[start];
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

function getPushCount() {
  const dayKey = getDayKey();
  const pushDayKey = localStorage.getItem("dh_pushDayKey");
  if (pushDayKey !== dayKey) {
    localStorage.setItem("dh_pushDayKey", dayKey);
    localStorage.setItem("dh_pushShownCountToday", "0");
    return 0;
  }
  return parseInt(localStorage.getItem("dh_pushShownCountToday") || "0", 10);
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
  const lastName = useRef("");
  const lastMessage = useRef("");
  const startTime = useRef(Date.now());

  const pickName = useCallback(() => {
    let name: string;
    do {
      name = NAMES[Math.floor(Math.random() * NAMES.length)];
    } while (name === lastName.current && NAMES.length > 1);
    lastName.current = name;
    return name;
  }, []);

  const buildMessage = useCallback((pushNumber: number) => {
    const planName = displayNames[packId] || "Básico";
    const period = getTimePeriod();
    const name = pickName();
    const neutral = getNeutralMessages(planName, name);
    const urgent = getUrgentMessages(planName, name);
    const all = [...neutral, ...urgent];

    let msg: string;

    if (pushNumber === 1) {
      msg = pickFromRange(all, 0, 3, lastMessage.current);
    } else if (pushNumber === 2) {
      msg = pickFromRange(all, 2, 7, lastMessage.current);
    } else if (pushNumber === 3) {
      if (period === "morning") msg = pickFromRange(all, 4, 7, lastMessage.current);
      else if (period === "afternoon") msg = pickFromRange(all, 4, 10, lastMessage.current);
      else msg = pickFromRange(all, 8, 11, lastMessage.current);
    } else {
      if (period === "morning") {
        msg = Math.random() < 0.7
          ? pickFromRange(all, 0, 7, lastMessage.current)
          : pickFromRange(all, 8, 11, lastMessage.current);
      } else if (period === "afternoon") {
        msg = Math.random() < 0.5
          ? pickFromRange(all, 0, 7, lastMessage.current)
          : pickFromRange(all, 8, 11, lastMessage.current);
      } else {
        msg = Math.random() < 0.2
          ? pickFromRange(all, 0, 7, lastMessage.current)
          : pickFromRange(all, 8, 11, lastMessage.current);
      }
    }

    lastMessage.current = msg;
    return msg;
  }, [packId, pickName]);

  useEffect(() => {
    const period = getTimePeriod();
    setBadgeText(getBadgeText(packId, period));
    startTime.current = Date.now();
    pushesThisVisit.current = 0;
    lastName.current = "";
    lastMessage.current = "";

    const timers: ReturnType<typeof setTimeout>[] = [];

    timers.push(setTimeout(() => setShowBadge(true), 5000));

    if (shouldShowDailyRefresh()) {
      timers.push(setTimeout(() => {
        setDailyRefresh(true);
        timers.push(setTimeout(() => setDailyRefresh(false), 6500));
      }, 3000));
    }

    const doShowPush = (pushNum: number): boolean => {
      if (getPushCount() >= 8) return false;
      if (!checkCooldown()) return false;
      if (Date.now() - startTime.current > 600000) return false;

      const msg = buildMessage(pushNum);
      setPushText(msg);
      setShowPush(true);
      incrementPushCount();
      setCooldown();
      pushesThisVisit.current++;
      timers.push(setTimeout(() => setShowPush(false), 6500));
      return true;
    };

    const getLoopDelay = () => {
      const p = getTimePeriod();
      if (p === "morning") return 180000 + Math.random() * 120000;
      if (p === "afternoon") return 120000 + Math.random() * 120000;
      return 60000 + Math.random() * 120000;
    };

    const scheduleLoop = () => {
      if (Date.now() - startTime.current > 600000) return;
      if (getPushCount() >= 8) return;
      const delay = getLoopDelay();
      timers.push(setTimeout(() => {
        if (doShowPush(pushesThisVisit.current + 1)) {
          scheduleLoop();
        }
      }, delay));
    };

    const delay1 = 8000 + Math.random() * 4000;
    timers.push(setTimeout(() => {
      if (!doShowPush(1)) return;

      const delay2 = 20000 + Math.random() * 15000;
      timers.push(setTimeout(() => {
        if (!doShowPush(2)) return;

        const delay3 = 45000 + Math.random() * 25000;
        timers.push(setTimeout(() => {
          if (!doShowPush(3)) return;
          scheduleLoop();
        }, delay3));
      }, delay2));
    }, delay1));

    return () => timers.forEach(clearTimeout);
  }, [packId, buildMessage]);

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

// client/src/workspace/components/Agenda.tsx
import { useState } from "react";

export default function Agenda() {
  const [date, setDate] = useState(new Date());
  const MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  const DAYS   = ["DOM","SEG","TER","QUA","QUI","SEX","SÁB"];
  const today  = new Date();
  const dotDays = [5,10,15,16,20,24];

  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const last  = new Date(date.getFullYear(), date.getMonth()+1, 0);

  const prevDays = Array.from({ length: first.getDay() }, (_, i) =>
    new Date(date.getFullYear(), date.getMonth(), -first.getDay()+i+1).getDate()
  );
  const currDays = Array.from({ length: last.getDate() }, (_, i) => i+1);

  return (
    <div className="ws-page">
      <div className="ws-page-title">Agenda<span className="ws-dot">.</span></div>
      <div className="ws-page-sub">Compromissos e prazos</div>
      <div className="ws-card">
        <div className="ws-cal-nav">
          <button className="ws-cal-btn" onClick={() => setDate(new Date(date.getFullYear(), date.getMonth()-1, 1))}>←</button>
          <div className="ws-cal-month">{MONTHS[date.getMonth()]} {date.getFullYear()}</div>
          <button className="ws-cal-btn" onClick={() => setDate(new Date(date.getFullYear(), date.getMonth()+1, 1))}>→</button>
        </div>
        <div className="ws-cal-grid">
          {DAYS.map(d => <div key={d} className="ws-cal-hdr">{d}</div>)}
          {prevDays.map((d, i) => <div key={`p${i}`} className="ws-cal-day other"><div className="ws-cal-day-num">{d}</div></div>)}
          {currDays.map(d => {
            const isToday = d === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
            return (
              <div key={d} className={`ws-cal-day ${isToday ? "today" : ""} ${dotDays.includes(d) ? "has-dot" : ""}`}>
                <div className="ws-cal-day-num">{d}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

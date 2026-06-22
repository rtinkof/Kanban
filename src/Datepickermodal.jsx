import { useState } from "react";

const MONTHS = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];
const DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

const btn = {
  width: "100%",
  padding: "10px",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontSize: "13px",
};

function parseDate(str) {
  if (!str) return null;
  const p = str.split("-");
  if (p.length !== 3) return null;
  return new Date(+p[0], +p[1] - 1, +p[2]);
}

function fmt(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Универсальная модалка выбора даты.
 *
 * Режим одной даты:   <DatePickerModal value={str} onSelect={(str) => ...} onClose={...} />
 * Режим диапазона:    <DatePickerModal range mode value={{from, to}} onSelect={({from,to}) => ...} onClose={...} />
 *
 * Дата(ы) выбираются локально (обводка), применение происходит только по кнопке "Сохранить".
 * zIndex поднят выше любых других модалок/попапов в приложении.
 */
export default function DatePickerModal({ value, onSelect, onClose, range = false, zIndex = 5000 }) {
  const today = new Date();
  const todayStr = fmt(today);

  // Локальное (несохранённое) состояние выбора
  const [localValue, setLocalValue] = useState(() => {
    if (range) {
      return { from: value?.from || "", to: value?.to || "" };
    }
    return value || "";
  });

  // В режиме диапазона: какую границу сейчас выбираем кликом по календарю
  const [activeField, setActiveField] = useState("from");

  const initial = range
    ? parseDate(localValue.from) || parseDate(localValue.to) || today
    : parseDate(localValue) || today;

  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const offset = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  function cellStr(d) {
    return `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }

  function handlePick(str) {
    if (!range) {
      setLocalValue(str);
      return;
    }
    setLocalValue((prev) => {
      if (activeField === "from") {
        // если выбранная начальная дата позже конечной — сдвигаем конечную
        const next = { ...prev, from: str };
        if (next.to && str > next.to) next.to = str;
        return next;
      }
      const next = { ...prev, to: str };
      if (next.from && str < next.from) next.from = str;
      return next;
    });
  }

  function handleSave() {
    onSelect(range ? localValue : localValue);
    onClose();
  }

  function handleToday() {
    if (!range) {
      setLocalValue(todayStr);
    } else {
      handlePick(todayStr);
    }
  }

  const hasValue = range ? localValue.from || localValue.to : !!localValue;

  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        inset: 0,
        zIndex,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(15,23,42,0.35)",
        backdropFilter: "blur(2px)",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "white",
          borderRadius: "16px",
          padding: "20px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
          width: "280px",
          animation: "stickerPopup 0.15s ease-out",
        }}
      >
        {range && (
          <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
            {[
              { key: "from", label: "От" },
              { key: "to", label: "До" },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveField(key)}
                style={{
                  flex: 1,
                  padding: "8px",
                  borderRadius: "8px",
                  border: activeField === key ? "2px solid #2563eb" : "2px solid #e5e7eb",
                  background: activeField === key ? "#eff6ff" : "white",
                  color: activeField === key ? "#2563eb" : "#6b7280",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: "600",
                  textAlign: "center",
                }}
              >
                {label}: {localValue[key] || "—"}
              </button>
            ))}
          </div>
        )}

        {/* Шапка месяца */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "14px",
          }}
        >
          <button
            onClick={() => {
              if (viewMonth === 0) {
                setViewMonth(11);
                setViewYear((y) => y - 1);
              } else setViewMonth((m) => m - 1);
            }}
            style={{ border: "none", background: "none", cursor: "pointer", fontSize: "18px", color: "#6b7280", padding: "0 4px" }}
          >
            ‹
          </button>
          <span style={{ fontWeight: "700", fontSize: "15px", color: "#111827" }}>
            {MONTHS[viewMonth]} {viewYear}
          </span>
          <button
            onClick={() => {
              if (viewMonth === 11) {
                setViewMonth(0);
                setViewYear((y) => y + 1);
              } else setViewMonth((m) => m + 1);
            }}
            style={{ border: "none", background: "none", cursor: "pointer", fontSize: "18px", color: "#6b7280", padding: "0 4px" }}
          >
            ›
          </button>
        </div>

        {/* Дни недели */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px", marginBottom: "4px" }}>
          {DAYS.map((d) => (
            <div key={d} style={{ textAlign: "center", fontSize: "11px", fontWeight: "600", color: "#9ca3af", padding: "2px 0" }}>
              {d}
            </div>
          ))}
        </div>

        {/* Ячейки */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px" }}>
          {cells.map((d, i) => {
            if (!d) return <div key={"e" + i} />;
            const str = cellStr(d);

            const isSelected = range
              ? str === localValue.from || str === localValue.to
              : str === localValue;
            const isInRange =
              range && localValue.from && localValue.to && str > localValue.from && str < localValue.to;
            const isToday = str === todayStr;
            const isPast = str < todayStr;

            return (
              <button
                key={str}
                onClick={() => handlePick(str)}
                style={{
                  border: isSelected ? "2px solid #2563eb" : "2px solid transparent",
                  borderRadius: "8px",
                  background: isSelected ? "#2563eb" : isInRange ? "#dbeafe" : isToday ? "#eff6ff" : "none",
                  color: isSelected ? "white" : isPast ? "#d1d5db" : "#111827",
                  cursor: "pointer",
                  fontWeight: isToday ? "700" : "400",
                  fontSize: "13px",
                  padding: "6px 0",
                  textAlign: "center",
                  transition: "0.15s",
                }}
              >
                {d}
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
          <button
            onClick={handleToday}
            style={{ ...btn, background: "#f3f4f6", color: "#374151", fontWeight: "600" }}
          >
            Сегодня
          </button>
          {hasValue && (
            <button
              onClick={() => {
                setLocalValue(range ? { from: "", to: "" } : "");
              }}
              style={{ ...btn, background: "white", border: "1.5px solid #fca5a5", color: "#ef4444", fontWeight: "600" }}
            >
              Очистить
            </button>
          )}
        </div>

        <button
          onClick={handleSave}
          style={{ ...btn, background: "#2563eb", color: "white", fontWeight: "700", marginTop: "8px" }}
        >
          Сохранить
        </button>
      </div>
    </div>
  );
}
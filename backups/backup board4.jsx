import { useState, useEffect } from "react";

import {
  DndContext,
  closestCenter,
  closestCorners,
  DragOverlay,
  useDroppable,
  useDraggable,
  pointerWithin,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";
/* СТИЛИ */

const modalBg = {
  position: "fixed",
  inset: 0,
  background: "rgba(15, 23, 42, 0.5)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  backdropFilter: "blur(2px)",
  zIndex: 100,
};

const modalBox = {
  background: "white",
  width: "420px",
  padding: "28px",
  borderRadius: "16px",
  boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
};

const input = {
  width: "100%",
  padding: "10px 12px",
  marginTop: "6px",
  marginBottom: "14px",
  borderRadius: "8px",
  border: "1.5px solid #e5e7eb",
  fontSize: "14px",
  background: "#f9fafb",
  color: "#111827",
  outline: "none",
  boxSizing: "border-box",
};

const btn = {
  width: "100%",
  padding: "10px",
  marginTop: "10px",
  border: "none",
  borderRadius: "8px",
  background: "#2563eb",
  color: "white",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: "500",
};

const title = {
  color: "#111827",
  fontSize: "18px",
  fontWeight: "700",
  marginBottom: "18px",
  marginTop: 0,
};

const error = {
  color: "#ef4444",
  fontSize: "12px",
  marginBottom: "10px",
};
const PRIORITY_COLORS = {
  Неважно: { bg: "#9ca3af", border: "#9ca3af", text: "#4b5563" },
  Нормально: { bg: "#22c55e", border: "#22c55e", text: "#15803d" },
  Важно: { bg: "#eab308", border: "#eab308", text: "#854d0e" },
  Срочно: { bg: "#ef4444", border: "#ef4444", text: "#991b1b" },
};
const STICKER_STYLES = {
  executor: { bg: "#ede9fe", color: "#7c3aed" },
  deadline: { bg: "#fce7f3", color: "#db2777" },
  priority: { bg: "#dcfce7", color: "#16a34a" },
};
export default function Board({ board, setBoard }) {
  if (!board) {
    return <div>Загрузка доски...</div>;
  }
  const [selectedCard, setSelectedCard] = useState(null);

  const [showDatePicker, setShowDatePicker] = useState(false);

  const [showDateRangePicker, setShowDateRangePicker] = useState(null);

  const [selectMode, setSelectMode] = useState(false);

  const [selectedCards, setSelectedCards] = useState(new Set());

  const [activeCard, setActiveCard] = useState(null);

  const [activeColumn, setActiveColumn] = useState(null);

  const [isAdding, setIsAdding] = useState(null);

  const [activeSticker, setActiveSticker] = useState(null);

  const [selectedSticker, setSelectedSticker] = useState(null);

  const [stickerHoverMode, setStickerHoverMode] = useState(false);

  const [newText, setNewText] = useState("");

  const [isAddingColumn, setIsAddingColumn] = useState(false);

  const [newColumnTitle, setNewColumnTitle] = useState("");

  const [editingColumn, setEditingColumn] = useState(null);

  const [editingTitle, setEditingTitle] = useState("");

  const [stickerValue, setStickerValue] = useState("");

  const [hoveredStickerZone, setHoveredStickerZone] = useState(null);

  const [showCreateSticker, setShowCreateSticker] = useState(false);

  const [newStickerType, setNewStickerType] = useState(null);

  const [newStickerName, setNewStickerName] = useState("");

  const [newStickerStates, setNewStickerStates] = useState([
    { label: "Состояние 1", color: "#6366f1" },
  ]);

  const [showStickerPicker, setShowStickerPicker] = useState(null); // { cardId, columnKey, x, y }

  const [showStickerSettings, setShowStickerSettings] = useState(false);

  const [editingSticker, setEditingSticker] = useState(null); // sticker object being edited

  // Board-scoped: stored in board._meta to persist per board
  const customStickers = board._meta?.customStickers || [];
  const hiddenStickers = new Set(board._meta?.hiddenStickers || []);

  function setCustomStickers(updater) {
    setBoard((prev) => {
      const cur = prev._meta?.customStickers || [];
      const next = typeof updater === "function" ? updater(cur) : updater;
      return {
        ...prev,
        _meta: { ...(prev._meta || {}), customStickers: next },
      };
    });
  }

  function setHiddenStickers(updater) {
    setBoard((prev) => {
      const cur = new Set(prev._meta?.hiddenStickers || []);
      const next = typeof updater === "function" ? updater(cur) : updater;
      return {
        ...prev,
        _meta: { ...(prev._meta || {}), hiddenStickers: [...next] },
      };
    });
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );
  const stickerTemplates = [
    {
      id: "executor",
      icon: "👤",
      text: "Исполнитель",
    },
    {
      id: "deadline",
      icon: "📅",
      text: "Дедлайн",
    },
    {
      id: "priority",
      icon: "📊",
      text: "Приоритет",
    },
  ];

  const allStickers = [...stickerTemplates, ...customStickers];

  // Сбрасываем активные состояния при смене доски
  useEffect(() => {
    setActiveCard(null);
    setActiveColumn(null);
    setActiveSticker(null);
    setStickerHoverMode(false);
    setHoveredStickerZone(null);
    setSelectedCard(null);
    setSelectedSticker(null);
    setShowStickerPicker(null);
  }, [
    board &&
      Object.keys(board)
        .filter((k) => k !== "_meta")
        .join(","),
  ]);

  useEffect(() => {
    const style = document.createElement("style");

    style.innerHTML = `
    @keyframes stickerPopup {
      from {
        opacity: 0;
        transform:
          translateY(-8px);
      }

      to {
        opacity: 1;
        transform:
          translateY(0);
      }
    }
  `;

    document.head.appendChild(style);

    return () => style.remove();
  }, []);
  function findColumn(cardId) {
    return Object.keys(board)
      .filter((k) => k !== "_meta")
      .find((col) => board[col].cards?.some((c) => c.id === cardId));
  }

  function handleDragStart(event) {
    const activeId = event.active.id;
    const sticker = allStickers.find((s) => s.id === activeId);

    if (sticker) {
      setActiveSticker(sticker);
      setStickerHoverMode(true);
      return;
    }

    // DRAG КОЛОНКИ
    if (Object.keys(board).includes(activeId)) {
      setActiveColumn(activeId);
      return;
    }

    // DRAG КАРТОЧКИ
    const column = findColumn(activeId);
    if (!column) return;

    const card = board[column].cards.find((c) => c.id === activeId);

    setActiveCard(card);
  }

  function handleDragEnd(event) {
    const { active, over } = event;

    const sticker = allStickers.find((s) => s.id === active.id);
    if (Object.keys(board).includes(active.id)) {
    }
    if (!sticker && over && String(over.id).startsWith("card-drop-")) {
      return;
    }

    setActiveCard(null);
    setActiveColumn(null);
    setActiveSticker(null);
    setStickerHoverMode(false);
    setHoveredStickerZone(null);
    if (!over) return;

    if (sticker) {
      if (!String(over.id).startsWith("card-drop-")) {
        return;
      }
      const cardId = String(over.id).replace("card-drop-", "");

      const columnKey = findColumn(cardId);

      if (!columnKey) {
        setActiveSticker(null);
        return;
      }

      setBoard((prev) => ({
        ...prev,

        [columnKey]: {
          ...prev[columnKey],

          cards: prev[columnKey].cards.map((card) =>
            card.id === cardId
              ? {
                  ...card,
                  stickers: [...(card.stickers || []), sticker],
                }
              : card,
          ),
        },
      }));

      setActiveSticker(null);
      return;
    }

    if (
      Object.keys(board)
        .filter((k) => k !== "_meta")
        .includes(active.id)
    ) {
      let targetColumnId = over.id;

      // если навели на empty-placeholder, берём реальный id колонки
      if (String(over.id).startsWith("empty-")) {
        targetColumnId = String(over.id).replace("empty-", "");
      }

      const cardColumn = findColumn(over.id);
      if (cardColumn) {
        targetColumnId = cardColumn;
      }

      const oldIndex = Object.keys(board)
        .filter((k) => k !== "_meta")
        .indexOf(active.id);
      const newIndex = Object.keys(board)
        .filter((k) => k !== "_meta")
        .indexOf(targetColumnId);

      if (oldIndex !== -1 && newIndex !== -1) {
        const metaEntry = board._meta ? [["_meta", board._meta]] : [];
        const entries = Object.entries(board).filter(([k]) => k !== "_meta");
        const newEntries = arrayMove(entries, oldIndex, newIndex);
        setBoard(Object.fromEntries([...newEntries, ...metaEntry]));
      }

      return;
    }

    // ===== ПЕРЕТАСКИВАНИЕ КАРТОЧЕК =====
    const activeCol = findColumn(active.id);

    let overCol = findColumn(over.id);
    if (!overCol) {
      const overId = String(over.id);
      const emptyMatch = overId.startsWith("empty-")
        ? overId.replace("empty-", "")
        : null;
      overCol =
        emptyMatch && board[emptyMatch]
          ? emptyMatch
          : board[overId]
            ? overId
            : null;
    }

    if (!activeCol || !overCol) return;

    // Межколоночное перемещение уже сделано в handleDragOver
    if (activeCol !== overCol) return;

    // Сортировка внутри одной колонки
    const oldIndex = board[activeCol].cards.findIndex(
      (c) => c.id === active.id,
    );

    const newIndex = board[overCol].cards.findIndex((c) => c.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
      setBoard((prev) => ({
        ...prev,
        [activeCol]: {
          ...prev[activeCol],
          cards: arrayMove(prev[activeCol].cards, oldIndex, newIndex),
        },
      }));
    }
  }

  function handleDragOver(event) {
    const { active, over } = event;

    if (!over) return;

    const sticker = allStickers.find((s) => s.id === active.id);

    // если таскаем стикер — обновляем зону
    if (sticker) {
      if (String(over.id).startsWith("card-drop-")) {
        setHoveredStickerZone(over.id);
      } else {
        setHoveredStickerZone(null);
      }
      return;
    }

    // если таскаем колонку — не трогаем карточки
    if (
      Object.keys(board)
        .filter((k) => k !== "_meta")
        .includes(active.id)
    )
      return;

    // ===== ПЕРЕТАСКИВАНИЕ КАРТОЧКИ МЕЖДУ КОЛОНКАМИ =====
    const activeCol = findColumn(active.id);
    if (!activeCol) return;

    // определяем целевую колонку (учитываем empty-${key})
    let overCol = findColumn(over.id);
    if (!overCol) {
      const overId = String(over.id);
      const emptyMatch = overId.startsWith("empty-")
        ? overId.replace("empty-", "")
        : null;
      overCol =
        emptyMatch && board[emptyMatch]
          ? emptyMatch
          : board[overId]
            ? overId
            : null;
    }

    if (!overCol || activeCol === overCol) return;

    // перемещаем карточку во время drag (для "призрака")
    setBoard((prev) => {
      const activeCards = [...prev[activeCol].cards];
      const overCards = [...prev[overCol].cards];

      const activeIndex = activeCards.findIndex((c) => c.id === active.id);
      if (activeIndex === -1) return prev;

      const [item] = activeCards.splice(activeIndex, 1);

      let overIndex = overCards.findIndex((c) => c.id === over.id);
      if (overIndex === -1) overIndex = overCards.length;

      overCards.splice(overIndex, 0, item);
      // Если карточка выбрана — перетащить вместе с ней остальные выбранные
      if (selectedCards.has(active.id) && selectedCards.size > 1) {
        const others = activeCards.filter((c) => selectedCards.has(c.id));
        others.forEach((c) => {
          const idx = overCards.findIndex((x) => x.id === c.id);
          if (idx === -1) overCards.splice(overIndex + 1, 0, c);
        });
        // убрать других выбранных из исходной колонки
        const kept = activeCards.filter(
          (c) => !selectedCards.has(c.id) || c.id === active.id,
        );
        return {
          ...prev,
          [activeCol]: {
            ...prev[activeCol],
            cards: kept.filter((c) => c.id !== active.id),
          },
          [overCol]: { ...prev[overCol], cards: overCards },
        };
      }
      return {
        ...prev,
        [activeCol]: { ...prev[activeCol], cards: activeCards },
        [overCol]: { ...prev[overCol], cards: overCards },
      };
    });
  }

  function collisionStrategy(args) {
    if (stickerHoverMode) {
      return pointerWithin(args);
    }
    return closestCenter(args);
  }

  function StickerTemplate({ id, icon, text }) {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
      id,
    });
    const s = STICKER_STYLES[id] || { bg: "#f0f0ff", color: "#6366f1" };

    return (
      <div
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        style={{
          transform: transform
            ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
            : undefined,
          height: "30px",
          padding: "0 10px",
          borderRadius: "8px",
          background: s.bg,
          color: s.color,
          fontSize: "12px",
          fontWeight: "500",
          display: "flex",
          alignItems: "center",
          gap: "5px",
          cursor: "grab",
          userSelect: "none",
        }}
      >
        <span style={{ fontSize: "13px" }}>{icon}</span>
        {text}
      </div>
    );
  }
  function addCard(columnKey) {
    // если поле пустое → закрываем input
    if (!newText.trim()) {
      setIsAdding(null);
      return;
    }

    const newCard = {
      id: Date.now().toString(),
      text: newText,
      note: "",
      stickers: [],
    };

    setBoard((prev) => ({
      ...prev,

      [columnKey]: {
        ...prev[columnKey],

        cards: [...prev[columnKey].cards, newCard],
      },
    }));

    // очищаем поле,
    // НО НЕ закрываем input
    setNewText("");

    // автоскролл вниз
    requestAnimationFrame(() => {
      const column = document.getElementById(`cards-${columnKey}`);

      if (column) {
        column.scrollTop = column.scrollHeight;
      }
    });
  }
  function updateCard() {
    setBoard((prev) => {
      const newCards = prev[selectedCard.column].cards.map((card) => {
        if (card.id === selectedCard.id) {
          return selectedCard;
        }

        return card;
      });

      return {
        ...prev,

        [selectedCard.column]: {
          ...prev[selectedCard.column],

          cards: newCards,
        },
      };
    });

    setSelectedCard(null);
  }

  function updateStickerValue(value) {
    const columnKey = findColumn(selectedSticker.cardId);

    setBoard((prev) => ({
      ...prev,

      [columnKey]: {
        ...prev[columnKey],

        cards: prev[columnKey].cards.map((card) =>
          card.id === selectedSticker.cardId
            ? {
                ...card,

                stickers: card.stickers.map((s, i) =>
                  i === selectedSticker.stickerIndex
                    ? {
                        ...s,
                        value,
                      }
                    : s,
                ),
              }
            : card,
        ),
      },
    }));

    setSelectedSticker(null);
  }

  function deleteSticker() {
    const columnKey = findColumn(selectedSticker.cardId);

    setBoard((prev) => ({
      ...prev,

      [columnKey]: {
        ...prev[columnKey],

        cards: prev[columnKey].cards.map((card) =>
          card.id === selectedSticker.cardId
            ? {
                ...card,
                stickers: card.stickers.filter(
                  (_, i) => i !== selectedSticker.stickerIndex,
                ),
              }
            : card,
        ),
      },
    }));

    setSelectedSticker(null);
  }
  function deleteCard() {
    setBoard((prev) => {
      const newCards = prev[selectedCard.column].cards.filter(
        (card) => card.id !== selectedCard.id,
      );

      return {
        ...prev,

        [selectedCard.column]: {
          ...prev[selectedCard.column],

          cards: newCards,
        },
      };
    });

    setSelectedCard(null);
  }

  function addColumn() {
    if (!newColumnTitle.trim()) return;

    const columnId = Date.now().toString();

    setBoard((prev) => ({
      ...prev,

      [columnId]: {
        title: newColumnTitle,
        cards: [],
      },
    }));

    setNewColumnTitle("");
    setIsAddingColumn(false);
  }

  function updateColumnTitle() {
    if (!editingTitle.trim()) return;

    setBoard((prev) => ({
      ...prev,

      [editingColumn]: {
        ...prev[editingColumn],
        title: editingTitle,
      },
    }));

    setEditingColumn(null);
    setEditingTitle("");
  }

  function deleteColumn(columnKey) {
    if (!confirm("Удалить колонку?")) return;

    setBoard((prev) => {
      const newBoard = { ...prev };

      delete newBoard[columnKey];

      return newBoard;
    });
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionStrategy}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
    >
      <div
        style={{
          padding: "20px",
          background: "white",
          minHeight: "100vh",
          fontFamily: "Arial",
        }}
      >
        <div
          style={{
            background: "white",
            borderRadius: "12px",
            padding: "10px",
            overflowX: "auto",
          }}
        >
          {/* СТИКЕРЫ */}
          <div
            style={{
              display: "flex",
              gap: "8px",
              color: "#929292",
              marginBottom: "16px",
              paddingBottom: "12px",
              background: "white",
              borderBottom: "1px solid #e5e7eb",
            }}
          >
            {/* Кнопка настроек */}
            <button
              onClick={() => setShowStickerSettings(true)}
              title="Настройки стикеров"
              style={{
                height: "26px",
                minWidth: "26px",
                borderRadius: "8px",
                border: "1px solid #d1d5db",
                background: "white",
                color: "#6b7280",
                cursor: "pointer",
                fontSize: "14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ⚙️
            </button>

            {allStickers
              .filter((s) => !hiddenStickers.has(s.id))
              .map((sticker) => (
                <StickerTemplate
                  key={sticker.id}
                  id={sticker.id}
                  icon={sticker.icon}
                  text={sticker.text}
                />
              ))}

            <button
              onClick={() => setShowCreateSticker(true)}
              style={{
                height: "26px",
                minWidth: "26px",
                borderRadius: "8px",
                border: "1px solid #d1d5db",
                background: "white",
                color: "#6b7280",
                cursor: "pointer",
                fontSize: "18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              +
            </button>
            <div style={{ marginLeft: "auto", display: "flex", gap: "6px" }}>
              {selectMode && (
                <button
                  onClick={() => {
                    if (selectedCards.size === 0) return;
                    setBoard((prev) => {
                      const next = { ...prev };
                      Object.keys(next)
                        .filter((k) => k !== "_meta")
                        .forEach((col) => {
                          next[col] = {
                            ...next[col],
                            cards: next[col].cards.filter(
                              (c) => !selectedCards.has(c.id),
                            ),
                          };
                        });
                      return next;
                    });
                    setSelectedCards(new Set());
                  }}
                  style={{
                    height: "28px",
                    padding: "0 12px",
                    borderRadius: "8px",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: selectedCards.size > 0 ? "pointer" : "not-allowed",
                    border: "1.5px solid #fca5a5",
                    background: selectedCards.size > 0 ? "#fee2e2" : "#f9fafb",
                    color: selectedCards.size > 0 ? "#ef4444" : "#d1d5db",
                    transition: "0.15s",
                  }}
                >
                  🗑 Удалить{" "}
                  {selectedCards.size > 0 ? `(${selectedCards.size})` : ""}
                </button>
              )}
              <button
                onClick={() => {
                  setSelectMode((v) => !v);
                  setSelectedCards(new Set());
                }}
                style={{
                  height: "28px",
                  padding: "0 12px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: "pointer",
                  border: selectMode
                    ? "1.5px solid #2563eb"
                    : "1.5px solid #d1d5db",
                  background: selectMode ? "#eff6ff" : "white",
                  color: selectMode ? "#2563eb" : "#6b7280",
                  transition: "0.15s",
                }}
              >
                {selectMode ? "✕ Отмена" : "☑ Выбрать"}
              </button>
            </div>
          </div>
          <SortableContext
            items={Object.keys(board).filter((k) => k !== "_meta")}
            strategy={horizontalListSortingStrategy}
          >
            <div
              style={{
                display: "flex",
                gap: "20px",
                alignItems: "flex-start",
                minWidth: "max-content",
              }}
            >
              {Object.entries(board)
                .filter(([k]) => k !== "_meta")
                .map(([key, column]) => (
                  <Column
                    key={key}
                    columnKey={key}
                    title={column.title}
                    selectMode={selectMode}
                    isColSelected={
                      column.cards.length > 0 &&
                      column.cards.every((c) => selectedCards.has(c.id))
                    }
                    onColCheck={() => {
                      setSelectedCards((prev) => {
                        const next = new Set(prev);
                        const allSelected = column.cards.every((c) =>
                          prev.has(c.id),
                        );
                        column.cards.forEach((c) =>
                          allSelected ? next.delete(c.id) : next.add(c.id),
                        );
                        return next;
                      });
                    }}
                    headerButtons={
                      <>
                        <button
                          onClick={() => {
                            setEditingColumn(key);
                            setEditingTitle(column.title);
                          }}
                          style={{
                            border: "none",
                            background: "transparent",
                            color: "#9ca3af",
                            cursor: "pointer",
                            fontSize: "16px",
                          }}
                        >
                          ✎
                        </button>

                        <button
                          onClick={() => deleteColumn(key)}
                          style={{
                            border: "none",
                            background: "transparent",
                            color: "#ef4444",
                            cursor: "pointer",
                            fontSize: "16px",
                          }}
                        >
                          ✕
                        </button>
                      </>
                    }
                    isEmpty={column.cards.length === 0}
                    footer={
                      isAdding === key ? (
                        <input
                          autoFocus
                          value={newText}
                          maxLength={100}
                          placeholder="Название задачи"
                          onChange={(e) => {
                            setNewText(e.target.value);

                            requestAnimationFrame(() => {
                              const column = document.getElementById(
                                `cards-${key}`,
                              );

                              if (column) {
                                column.scrollTop = column.scrollHeight;
                              }
                            });
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addCard(key);
                            }
                          }}
                          onBlur={() => {
                            setIsAdding(null);
                            setNewText("");
                          }}
                          style={{
                            width: "100%",
                            padding: "10px",
                            background: "#f3f4f6",
                            borderRadius: "6px",
                            border: "2px solid #a8a8a8",
                            color: "#6b7280",
                            outline: "none",
                            boxSizing: "border-box",
                          }}
                        />
                      ) : (
                        <button
                          onClick={() => setIsAdding(key)}
                          style={{
                            width: "100%",
                            padding: "8px",
                            border: "none",
                            borderRadius: "6px",
                            background: "#f3f4f6",
                            color: "#6b7280",
                            height: "40px",
                            cursor: "pointer",
                          }}
                        >
                          + Добавить
                        </button>
                      )
                    }
                  >
                    <SortableContext
                      items={column.cards.map((c) => c.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {column.cards.map((card) => (
                        <Card
                          key={card.id}
                          card={card}
                          selectMode={selectMode}
                          isSelected={selectedCards.has(card.id)}
                          onSelect={() =>
                            setSelectedCards((prev) => {
                              const next = new Set(prev);
                              next.has(card.id)
                                ? next.delete(card.id)
                                : next.add(card.id);
                              return next;
                            })
                          }
                          stickerHoverMode={stickerHoverMode}
                          hoveredStickerZone={hoveredStickerZone}
                          setSelectedSticker={setSelectedSticker}
                          allStickers={allStickers}
                          onAddSticker={({ cardId, x, y }) =>
                            setShowStickerPicker({
                              cardId,
                              columnKey: key,
                              x,
                              y,
                            })
                          }
                          onClick={() =>
                            setSelectedCard({ ...card, column: key })
                          }
                        />
                      ))}
                    </SortableContext>
                  </Column>
                ))}
              <div
                style={{
                  width: "280px",
                  minWidth: "280px",
                  flexShrink: 0,
                }}
              >
                {!isAddingColumn ? (
                  <div
                    onClick={() => setIsAddingColumn(true)}
                    style={{
                      height: "40px",
                      borderRadius: "10px",
                      background: "#f3f4f6",
                      color: "#6b7280",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      fontSize: "14px",
                    }}
                  >
                    + Добавить колонку
                  </div>
                ) : (
                  <input
                    autoFocus
                    value={newColumnTitle}
                    maxLength={20}
                    placeholder="Название колонки"
                    onChange={(e) => setNewColumnTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        addColumn();
                      }
                    }}
                    onBlur={() => {
                      setIsAddingColumn(false);
                      setNewColumnTitle("");
                    }}
                    style={{
                      width: "100%",
                      padding: "12px",
                      borderRadius: "10px",
                      border: "2px solid #a3a3a3",
                      outline: "none",
                      background: "white",
                      boxSizing: "border-box",
                      color: "#6b7280",
                      fontSize: "14px",
                    }}
                  />
                )}
              </div>
            </div>
          </SortableContext>
        </div>

        {/* МОДАЛКА РЕДАКТИРОВАНИЯ */}

        {selectedCard && (
          <div onClick={() => setSelectedCard(null)} style={modalBg}>
            <div onClick={(e) => e.stopPropagation()} style={modalBox}>
              <h2 style={title}>✏️ Редактировать задачу</h2>

              <label
                style={{
                  fontSize: "13px",
                  fontWeight: "600",
                  color: "#374151",
                }}
              >
                Название
              </label>
              <input
                value={selectedCard.text}
                maxLength={100}
                onChange={(e) =>
                  setSelectedCard({ ...selectedCard, text: e.target.value })
                }
                style={input}
              />
              {selectedCard.text.length >= 100 && (
                <div style={error}>Максимум 100 символов</div>
              )}

              <label
                style={{
                  fontSize: "13px",
                  fontWeight: "600",
                  color: "#374151",
                }}
              >
                Примечание
              </label>
              <textarea
                value={selectedCard.note}
                onChange={(e) =>
                  setSelectedCard({ ...selectedCard, note: e.target.value })
                }
                style={{ ...input, height: "100px", resize: "vertical" }}
              />

              <button onClick={updateCard} style={btn}>
                Сохранить
              </button>
              <button
                onClick={deleteCard}
                style={{
                  ...btn,
                  background: "white",
                  color: "#ef4444",
                  border: "1.5px solid #fca5a5",
                  marginTop: "8px",
                }}
              >
                Удалить задачу
              </button>
            </div>
          </div>
        )}

        {selectedSticker && (
          <>
            <div
              onMouseDown={(e) => e.stopPropagation()}
              style={{ position: "fixed", inset: 0, zIndex: 999 }}
              onClick={() => setSelectedSticker(null)}
            />
            <div
              style={{
                position: "fixed",
                left: selectedSticker.x,
                top: selectedSticker.y,
                background: "white",
                borderRadius: "14px",
                padding: "16px",
                minWidth: "220px",
                boxShadow: "0 20px 50px rgba(0,0,0,0.18)",
                zIndex: 1000,
                animation: "stickerPopup 0.15s ease-out",
              }}
            >
              <div
                style={{
                  fontWeight: "700",
                  fontSize: "15px",
                  marginBottom: "12px",
                  color: "#111827",
                }}
              >
                {selectedSticker.sticker.icon} {selectedSticker.sticker.text}
              </div>

              {selectedSticker.sticker.id === "deadline" &&
                (() => {
                  const val = selectedSticker.sticker.value || "";
                  const parts = val.split("-");
                  const yyyy = parts[0] || "";
                  const mm = parts[1] || "";
                  const dd = parts[2] || "";

                  let localDD = dd,
                    localMM = mm,
                    localYYYY = yyyy;

                  return (
                    <div style={{ marginBottom: "8px" }}>
                      <div
                        style={{
                          display: "flex",
                          gap: "6px",
                          alignItems: "center",
                          marginBottom: "8px",
                        }}
                      >
                        <input
                          key={"dd-" + val}
                          defaultValue={dd}
                          maxLength={2}
                          placeholder="ДД"
                          onChange={(e) => {
                            localDD = e.target.value;
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") e.target.blur();
                          }}
                          style={{
                            ...input,
                            width: "56px",
                            minWidth: "56px",
                            margin: 0,
                            textAlign: "center",
                          }}
                        />
                        <span style={{ color: "#9ca3af" }}>/</span>
                        <input
                          key={"mm-" + val}
                          defaultValue={mm}
                          maxLength={2}
                          placeholder="ММ"
                          onChange={(e) => {
                            localMM = e.target.value;
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") e.target.blur();
                          }}
                          style={{
                            ...input,
                            width: "56px",
                            minWidth: "56px",
                            margin: 0,
                            textAlign: "center",
                          }}
                        />
                        <span style={{ color: "#9ca3af" }}>/</span>
                        <input
                          key={"yyyy-" + val}
                          defaultValue={yyyy}
                          maxLength={4}
                          placeholder="ГГГГ"
                          onChange={(e) => {
                            localYYYY = e.target.value;
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") e.target.blur();
                          }}
                          style={{
                            ...input,
                            width: "76px",
                            minWidth: "76px",
                            margin: 0,
                            textAlign: "center",
                          }}
                        />

                        {/* Кнопка-календарь: эмодзи + скрытый нативный input поверх */}
                        <button
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={() => setShowDatePicker(true)}
                          style={{
                            width: "36px",
                            height: "38px",
                            borderRadius: "8px",
                            border: "1.5px solid #e5e7eb",
                            background: "#f9fafb",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "16px",
                            cursor: "pointer",
                            flexShrink: 0,
                          }}
                        >
                          📅
                        </button>
                      </div>

                      <button
                        onClick={() => {
                          const d = localDD.padStart(2, "0");
                          const mo = localMM.padStart(2, "0");
                          const y = localYYYY;
                          if (
                            y.length === 4 &&
                            mo.length === 2 &&
                            d.length === 2
                          ) {
                            updateStickerValue(`${y}-${mo}-${d}`);
                          }
                        }}
                        style={{ ...btn, marginTop: 0 }}
                      >
                        Сохранить дату
                      </button>

                      {val && (
                        <div
                          style={{
                            fontSize: "11px",
                            color: "#9ca3af",
                            marginTop: "6px",
                          }}
                        >
                          Выбрано: {dd}/{mm}/{yyyy}
                        </div>
                      )}
                    </div>
                  );
                })()}

              {showDatePicker && (
                <DatePickerModal
                  value={
                    selectedSticker?.sticker?.id === "deadline"
                      ? selectedSticker.sticker.value || ""
                      : ""
                  }
                  onSelect={(dateStr) => {
                    const p = dateStr.split("-");
                    updateStickerValue(dateStr);
                    setShowDatePicker(false);
                  }}
                  onClose={() => setShowDatePicker(false)}
                />
              )}
              {showDateRangePicker &&
                selectedSticker?.sticker?.type === "daterange" && (
                  <DatePickerModal
                    value={
                      selectedSticker.sticker.value?.[showDateRangePicker] || ""
                    }
                    onSelect={(dateStr) => {
                      const cur = selectedSticker.sticker.value || {};
                      updateStickerValue({
                        ...cur,
                        [showDateRangePicker]: dateStr,
                      });
                      setShowDateRangePicker(null);
                    }}
                    onClose={() => setShowDateRangePicker(null)}
                  />
                )}
              {selectedSticker.sticker.id === "executor" && (
                <select
                  onChange={(e) => updateStickerValue(e.target.value)}
                  style={{ ...input, marginBottom: "4px", cursor: "pointer" }}
                >
                  <option>Исполнитель 1</option>
                  <option>Исполнитель 2</option>
                  <option>Исполнитель 3</option>
                </select>
              )}

              {selectedSticker.sticker.id === "priority" && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                    marginBottom: "4px",
                  }}
                >
                  {[
                    { label: "Неважно", color: "#9ca3af" },
                    { label: "Нормально", color: "#22c55e" },
                    { label: "Важно", color: "#eab308" },
                    { label: "Срочно", color: "#ef4444" },
                  ].map(({ label, color }) => (
                    <button
                      key={label}
                      onClick={() => updateStickerValue(label)}
                      style={{
                        padding: "7px 12px",
                        border: `2px solid ${color}`,
                        borderRadius: "8px",
                        background:
                          selectedSticker.sticker.value === label
                            ? color
                            : "white",
                        color:
                          selectedSticker.sticker.value === label
                            ? "white"
                            : color,
                        cursor: "pointer",
                        fontWeight: "500",
                        textAlign: "left",
                        fontSize: "13px",
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}

              {selectedSticker.sticker.type === "states" && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                    marginBottom: "4px",
                  }}
                >
                  {(selectedSticker.sticker.states || []).map(
                    ({ label, color }) => (
                      <button
                        key={label}
                        onClick={() => updateStickerValue(label)}
                        style={{
                          padding: "7px 12px",
                          border: `2px solid ${color}`,
                          borderRadius: "8px",
                          background:
                            selectedSticker.sticker.value === label
                              ? color
                              : "white",
                          color:
                            selectedSticker.sticker.value === label
                              ? "white"
                              : color,
                          cursor: "pointer",
                          fontWeight: "500",
                          textAlign: "left",
                          fontSize: "13px",
                        }}
                      >
                        {label}
                      </button>
                    ),
                  )}
                </div>
              )}

              {selectedSticker.sticker.type === "text" && (
                <input
                  type="text"
                  defaultValue={selectedSticker.sticker.value || ""}
                  placeholder="Введите текст..."
                  onBlur={(e) => updateStickerValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") updateStickerValue(e.target.value);
                  }}
                  style={{ ...input, marginBottom: "4px" }}
                />
              )}

              {selectedSticker.sticker.type === "number" && (
                <input
                  type="number"
                  defaultValue={selectedSticker.sticker.value || ""}
                  placeholder="Введите число..."
                  onBlur={(e) => updateStickerValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") updateStickerValue(e.target.value);
                  }}
                  style={{ ...input, marginBottom: "4px" }}
                />
              )}

              {selectedSticker.sticker.type === "daterange" && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    marginBottom: "4px",
                  }}
                >
                  {[
                    { key: "from", label: "Начало" },
                    { key: "to", label: "Конец" },
                  ].map(({ key, label }) => {
                    const val = selectedSticker.sticker.value?.[key] || "";
                    return (
                      <div key={key}>
                        <label
                          style={{
                            fontSize: "12px",
                            color: "#6b7280",
                            marginBottom: "4px",
                            display: "block",
                          }}
                        >
                          {label}
                        </label>
                        <div
                          style={{
                            display: "flex",
                            gap: "8px",
                            alignItems: "center",
                          }}
                        >
                          <div
                            style={{
                              flex: 1,
                              padding: "9px 12px",
                              borderRadius: "8px",
                              border: "1.5px solid #e5e7eb",
                              background: "#f9fafb",
                              fontSize: "14px",
                              color: val ? "#111827" : "#9ca3af",
                            }}
                          >
                            {val
                              ? val.split("-").reverse().join(".")
                              : "Не выбрано"}
                          </div>
                          <button
                            onClick={() => setShowDateRangePicker(key)}
                            style={{
                              width: "38px",
                              height: "38px",
                              borderRadius: "8px",
                              flexShrink: 0,
                              border: "1.5px solid #e5e7eb",
                              background: "#f9fafb",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "16px",
                              cursor: "pointer",
                            }}
                          >
                            📅
                          </button>
                          {val && (
                            <button
                              onClick={() => {
                                const cur = selectedSticker.sticker.value || {};
                                updateStickerValue({ ...cur, [key]: "" });
                              }}
                              style={{
                                width: "38px",
                                height: "38px",
                                borderRadius: "8px",
                                flexShrink: 0,
                                border: "1.5px solid #fca5a5",
                                background: "white",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "14px",
                                cursor: "pointer",
                                color: "#ef4444",
                              }}
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <button
                onClick={deleteSticker}
                style={{
                  ...btn,
                  background: "white",
                  color: "#ef4444",
                  border: "1.5px solid #fca5a5",
                  marginTop: "8px",
                }}
              >
                Удалить стикер
              </button>
            </div>
          </>
        )}
        {/* МОДАЛКА СОЗДАНИЯ КАСТОМНОГО СТИКЕРА */}
        {showCreateSticker && (
          <div
            style={modalBg}
            onClick={() => {
              setShowCreateSticker(false);
              setNewStickerType(null);
              setNewStickerName("");
              setNewStickerStates([{ label: "Состояние 1", color: "#6366f1" }]);
            }}
          >
            <div
              style={{ ...modalBox, width: "460px" }}
              onClick={(e) => e.stopPropagation()}
            >
              {!newStickerType ? (
                <>
                  <h2 style={title}>Создать стикер</h2>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "12px",
                    }}
                  >
                    {[
                      {
                        type: "states",
                        icon: "🏷️",
                        label: "Набор состояний",
                        desc: "Задайте варианты с цветами",
                      },
                      {
                        type: "daterange",
                        icon: "📆",
                        label: "Диапазон дат",
                        desc: "Начало и конец периода",
                      },
                      {
                        type: "text",
                        icon: "📝",
                        label: "Текстовое поле",
                        desc: "Свободный ввод текста",
                      },
                      {
                        type: "number",
                        icon: "🔢",
                        label: "Числовое поле",
                        desc: "Ввод числового значения",
                      },
                    ].map(({ type, icon, label, desc }) => (
                      <button
                        key={type}
                        onClick={() => setNewStickerType(type)}
                        style={{
                          padding: "16px",
                          border: "1.5px solid #e5e7eb",
                          borderRadius: "12px",
                          background: "white",
                          cursor: "pointer",
                          textAlign: "left",
                          transition: "border-color 0.15s",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.borderColor = "#6366f1")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.borderColor = "#e5e7eb")
                        }
                      >
                        <div style={{ fontSize: "22px", marginBottom: "6px" }}>
                          {icon}
                        </div>
                        <div
                          style={{
                            fontWeight: "600",
                            fontSize: "14px",
                            color: "#111827",
                            marginBottom: "2px",
                          }}
                        >
                          {label}
                        </div>
                        <div style={{ fontSize: "12px", color: "#9ca3af" }}>
                          {desc}
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setNewStickerType(null)}
                    style={{
                      border: "none",
                      background: "none",
                      cursor: "pointer",
                      color: "#6b7280",
                      fontSize: "13px",
                      padding: 0,
                      marginBottom: "12px",
                    }}
                  >
                    ← Назад
                  </button>
                  <h2 style={title}>
                    {
                      {
                        states: "🏷️ Набор состояний",
                        daterange: "📆 Диапазон дат",
                        text: "📝 Текстовое поле",
                        number: "🔢 Числовое поле",
                      }[newStickerType]
                    }
                  </h2>

                  <label
                    style={{
                      fontSize: "13px",
                      fontWeight: "600",
                      color: "#374151",
                    }}
                  >
                    Название стикера
                  </label>
                  <input
                    autoFocus
                    value={newStickerName}
                    maxLength={30}
                    placeholder="Например: Статус, Этап..."
                    onChange={(e) => setNewStickerName(e.target.value)}
                    style={input}
                  />

                  {newStickerType === "states" && (
                    <div style={{ marginBottom: "12px" }}>
                      <label
                        style={{
                          fontSize: "13px",
                          fontWeight: "600",
                          color: "#374151",
                        }}
                      >
                        Состояния
                      </label>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                          marginTop: "8px",
                        }}
                      >
                        {newStickerStates.map((s, i) => (
                          <div
                            key={i}
                            style={{
                              display: "flex",
                              gap: "8px",
                              alignItems: "center",
                            }}
                          >
                            <input
                              type="color"
                              value={s.color}
                              onChange={(e) =>
                                setNewStickerStates((prev) =>
                                  prev.map((st, j) =>
                                    j === i
                                      ? { ...st, color: e.target.value }
                                      : st,
                                  ),
                                )
                              }
                              style={{
                                width: "36px",
                                height: "36px",
                                border: "none",
                                borderRadius: "6px",
                                cursor: "pointer",
                                padding: "2px",
                              }}
                            />
                            <input
                              value={s.label}
                              placeholder={`Состояние ${i + 1}`}
                              onChange={(e) =>
                                setNewStickerStates((prev) =>
                                  prev.map((st, j) =>
                                    j === i
                                      ? { ...st, label: e.target.value }
                                      : st,
                                  ),
                                )
                              }
                              style={{ ...input, margin: 0, flex: 1 }}
                            />
                            {newStickerStates.length > 1 && (
                              <button
                                onClick={() =>
                                  setNewStickerStates((prev) =>
                                    prev.filter((_, j) => j !== i),
                                  )
                                }
                                style={{
                                  border: "none",
                                  background: "none",
                                  cursor: "pointer",
                                  color: "#ef4444",
                                  fontSize: "16px",
                                }}
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          onClick={() =>
                            setNewStickerStates((prev) => [
                              ...prev,
                              {
                                label: `Состояние ${prev.length + 1}`,
                                color: "#6366f1",
                              },
                            ])
                          }
                          style={{
                            ...btn,
                            background: "#f3f4f6",
                            color: "#374151",
                            border: "none",
                            marginTop: "4px",
                          }}
                        >
                          + Добавить состояние
                        </button>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      if (!newStickerName.trim()) return;
                      const typeIcons = {
                        states: "🏷️",
                        daterange: "📆",
                        text: "📝",
                        number: "🔢",
                      };
                      const newSticker = {
                        id: `custom-${Date.now()}`,
                        type: newStickerType,
                        icon: typeIcons[newStickerType],
                        text: newStickerName.trim(),
                        ...(newStickerType === "states"
                          ? {
                              states: newStickerStates.filter((s) =>
                                s.label.trim(),
                              ),
                            }
                          : {}),
                      };
                      setCustomStickers((prev) => [...prev, newSticker]);
                      setShowCreateSticker(false);
                      setNewStickerType(null);
                      setNewStickerName("");
                      setNewStickerStates([
                        { label: "Состояние 1", color: "#6366f1" },
                      ]);
                    }}
                    style={btn}
                  >
                    Создать стикер
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* МОДАЛКА РЕДАКТИРОВАНИЯ КОЛОНКИ */}

        {editingColumn && (
          <div onClick={() => setEditingColumn(null)} style={modalBg}>
            <div onClick={(e) => e.stopPropagation()} style={modalBox}>
              <h2 style={title}>✏️ Редактировать колонку</h2>

              <label
                style={{
                  fontSize: "13px",
                  fontWeight: "600",
                  color: "#374151",
                }}
              >
                Название
              </label>
              <input
                autoFocus
                value={editingTitle}
                maxLength={20}
                onChange={(e) => setEditingTitle(e.target.value)}
                style={input}
              />
              {editingTitle.length >= 20 && (
                <div style={error}>Максимум 20 символов</div>
              )}

              <button onClick={updateColumnTitle} style={btn}>
                Сохранить
              </button>
            </div>
          </div>
        )}
      </div>

      <DragOverlay>
        {activeCard ? (
          <div
            style={{
              background: "#ffffff",
              padding: "10px",
              borderRadius: "6px",
              border: "1px solid #d1d5db",
              boxShadow: "0 8px 20px rgba(0,0,0,0.15)",
              width: "250px",
              opacity: 0.9,
              cursor: "grabbing",
              wordBreak: "break-word",
            }}
          >
            {activeCard.text}
          </div>
        ) : activeColumn && activeColumn !== "_meta" ? (
          <div
            style={{
              width: "280px",
              minHeight: "150px",
              background: "white",
              padding: "12px",
              borderRadius: "10px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
              opacity: 0.95,
            }}
          >
            <h3
              style={{
                marginTop: 0,
                marginBottom: "12px",
                color: "#1f2937",
              }}
            >
              {board[activeColumn].title}
            </h3>

            {board[activeColumn].cards.map((card) => (
              <div
                key={card.id}
                style={{
                  background: "#f9fafb",
                  padding: "10px",
                  marginBottom: "8px",
                  borderRadius: "6px",
                  border: "1px solid #e5e7eb",
                  wordBreak: "break-word",
                  color: "#111827",
                }}
              >
                {card.text}
              </div>
            ))}
          </div>
        ) : activeSticker ? (
          (() => {
            const s = STICKER_STYLES[activeSticker.id] || {
              bg: "#f0f0ff",
              color: "#6366f1",
            };
            return (
              <div
                style={{
                  height: "26px",
                  padding: "0 10px",
                  borderRadius: "8px",
                  background: s.bg,
                  color: s.color,
                  fontSize: "12px",
                  fontWeight: "500",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                }}
              >
                <span style={{ fontSize: "13px" }}>{activeSticker.icon}</span>
                {activeSticker.text}
              </div>
            );
          })()
        ) : null}
      </DragOverlay>

      {/* ПИКЕР СТИКЕРОВ на карточке */}
      {showStickerPicker && (
        <>
          <div
            style={{ position: "fixed", inset: 0, zIndex: 999 }}
            onClick={() => setShowStickerPicker(null)}
          />
          <div
            style={{
              position: "fixed",
              left: Math.min(showStickerPicker.x, window.innerWidth - 230),
              top: showStickerPicker.y,
              background: "white",
              borderRadius: "12px",
              padding: "12px",
              minWidth: "200px",
              boxShadow: "0 8px 30px rgba(0,0,0,0.15)",
              zIndex: 1000,
            }}
          >
            <div
              style={{
                fontSize: "12px",
                fontWeight: "600",
                color: "#6b7280",
                marginBottom: "8px",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Добавить стикер
            </div>
            {allStickers.map((sticker) => {
              const s = STICKER_STYLES[sticker.id] || {
                bg: "#f0f0ff",
                color: "#6366f1",
              };
              const col = Object.values(board).find(
                (c) =>
                  Array.isArray(c.cards) &&
                  c.cards.some((card) => card.id === showStickerPicker.cardId),
              );
              const cardObj = col?.cards.find(
                (c) => c.id === showStickerPicker.cardId,
              );
              const alreadyAdded = cardObj?.stickers?.some(
                (st) => st.id === sticker.id,
              );
              return (
                <button
                  key={sticker.id}
                  disabled={alreadyAdded}
                  onClick={() => {
                    if (alreadyAdded) return;
                    const { cardId, columnKey } = showStickerPicker;
                    setBoard((prev) => ({
                      ...prev,
                      [columnKey]: {
                        ...prev[columnKey],
                        cards: prev[columnKey].cards.map((card) =>
                          card.id === cardId
                            ? {
                                ...card,
                                stickers: [...(card.stickers || []), sticker],
                              }
                            : card,
                        ),
                      },
                    }));
                    setShowStickerPicker(null);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    width: "100%",
                    padding: "7px 8px",
                    border: "none",
                    borderRadius: "8px",
                    background: alreadyAdded ? "#f3f4f6" : "white",
                    color: alreadyAdded ? "#9ca3af" : "#111827",
                    cursor: alreadyAdded ? "default" : "pointer",
                    fontSize: "13px",
                    textAlign: "left",
                    marginBottom: "2px",
                  }}
                  onMouseEnter={(e) => {
                    if (!alreadyAdded) e.currentTarget.style.background = s.bg;
                  }}
                  onMouseLeave={(e) => {
                    if (!alreadyAdded)
                      e.currentTarget.style.background = "white";
                  }}
                >
                  <span style={{ fontSize: "15px" }}>{sticker.icon}</span>
                  <span>{sticker.text}</span>
                  {alreadyAdded && (
                    <span style={{ marginLeft: "auto", fontSize: "11px" }}>
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* НАСТРОЙКИ СТИКЕРОВ */}
      {showStickerSettings && (
        <div
          style={modalBg}
          onClick={() => {
            setShowStickerSettings(false);
            setEditingSticker(null);
          }}
        >
          <div
            style={{ ...modalBox, width: "480px" }}
            onClick={(e) => e.stopPropagation()}
          >
            {editingSticker ? (
              <>
                <button
                  onClick={() => setEditingSticker(null)}
                  style={{
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                    color: "#6b7280",
                    fontSize: "13px",
                    padding: 0,
                    marginBottom: "12px",
                  }}
                >
                  ← Назад
                </button>
                <h2 style={title}>Редактировать стикер</h2>
                <label
                  style={{
                    fontSize: "13px",
                    fontWeight: "600",
                    color: "#374151",
                  }}
                >
                  Название
                </label>
                <input
                  value={editingSticker.text}
                  maxLength={30}
                  onChange={(e) =>
                    setEditingSticker((prev) => ({
                      ...prev,
                      text: e.target.value,
                    }))
                  }
                  style={input}
                />
                {editingSticker.type === "states" && (
                  <div style={{ marginBottom: "12px" }}>
                    <label
                      style={{
                        fontSize: "13px",
                        fontWeight: "600",
                        color: "#374151",
                      }}
                    >
                      Состояния
                    </label>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                        marginTop: "8px",
                      }}
                    >
                      {(editingSticker.states || []).map((s, i) => (
                        <div
                          key={i}
                          style={{
                            display: "flex",
                            gap: "8px",
                            alignItems: "center",
                          }}
                        >
                          <input
                            type="color"
                            value={s.color}
                            onChange={(e) =>
                              setEditingSticker((prev) => ({
                                ...prev,
                                states: prev.states.map((st, j) =>
                                  j === i
                                    ? { ...st, color: e.target.value }
                                    : st,
                                ),
                              }))
                            }
                            style={{
                              width: "36px",
                              height: "36px",
                              border: "none",
                              borderRadius: "6px",
                              cursor: "pointer",
                              padding: "2px",
                            }}
                          />
                          <input
                            value={s.label}
                            onChange={(e) =>
                              setEditingSticker((prev) => ({
                                ...prev,
                                states: prev.states.map((st, j) =>
                                  j === i
                                    ? { ...st, label: e.target.value }
                                    : st,
                                ),
                              }))
                            }
                            style={{ ...input, margin: 0, flex: 1 }}
                          />
                          {(editingSticker.states || []).length > 1 && (
                            <button
                              onClick={() =>
                                setEditingSticker((prev) => ({
                                  ...prev,
                                  states: prev.states.filter((_, j) => j !== i),
                                }))
                              }
                              style={{
                                border: "none",
                                background: "none",
                                cursor: "pointer",
                                color: "#ef4444",
                                fontSize: "16px",
                              }}
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        onClick={() =>
                          setEditingSticker((prev) => ({
                            ...prev,
                            states: [
                              ...(prev.states || []),
                              {
                                label: `Состояние ${(prev.states || []).length + 1}`,
                                color: "#6366f1",
                              },
                            ],
                          }))
                        }
                        style={{
                          ...btn,
                          background: "#f3f4f6",
                          color: "#374151",
                          border: "none",
                          marginTop: "4px",
                        }}
                      >
                        + Добавить состояние
                      </button>
                    </div>
                  </div>
                )}
                <button
                  onClick={() => {
                    setCustomStickers((prev) =>
                      prev.map((s) =>
                        s.id === editingSticker.id ? editingSticker : s,
                      ),
                    );
                    setEditingSticker(null);
                  }}
                  style={btn}
                >
                  Сохранить
                </button>
              </>
            ) : (
              <>
                <h2 style={title}>⚙️ Стикеры доски</h2>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}
                >
                  {allStickers.map((sticker) => {
                    const s = STICKER_STYLES[sticker.id] || {
                      bg: "#f0f0ff",
                      color: "#6366f1",
                    };
                    const isHidden = hiddenStickers.has(sticker.id);
                    const isBuiltIn = stickerTemplates.some(
                      (t) => t.id === sticker.id,
                    );
                    return (
                      <div
                        key={sticker.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          padding: "10px 12px",
                          borderRadius: "10px",
                          background: "#f9fafb",
                          border: "1.5px solid #e5e7eb",
                        }}
                      >
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: "6px",
                            background: s.bg,
                            color: s.color,
                            fontSize: "12px",
                            fontWeight: "500",
                          }}
                        >
                          {sticker.icon} {sticker.text}
                        </span>
                        <div
                          style={{
                            marginLeft: "auto",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <button
                            onClick={() =>
                              setHiddenStickers((prev) => {
                                const next = new Set(prev);
                                if (next.has(sticker.id))
                                  next.delete(sticker.id);
                                else next.add(sticker.id);
                                return next;
                              })
                            }
                            style={{
                              border: "none",
                              borderRadius: "6px",
                              cursor: "pointer",
                              background: isHidden ? "#f3f4f6" : "#dcfce7",
                              color: isHidden ? "#9ca3af" : "#16a34a",
                              fontSize: "13px",
                              padding: "4px 8px",
                              fontWeight: "500",
                            }}
                          >
                            {isHidden ? "Скрыт" : "Виден"}
                          </button>
                          {!isBuiltIn && (
                            <button
                              onClick={() => setEditingSticker({ ...sticker })}
                              style={{
                                border: "1.5px solid #e5e7eb",
                                borderRadius: "6px",
                                background: "white",
                                cursor: "pointer",
                                color: "#374151",
                                fontSize: "13px",
                                padding: "4px 8px",
                              }}
                            >
                              ✎
                            </button>
                          )}
                          {!isBuiltIn && (
                            <button
                              onClick={() =>
                                setCustomStickers((prev) =>
                                  prev.filter((s) => s.id !== sticker.id),
                                )
                              }
                              style={{
                                border: "1.5px solid #fca5a5",
                                borderRadius: "6px",
                                background: "white",
                                cursor: "pointer",
                                color: "#ef4444",
                                fontSize: "13px",
                                padding: "4px 8px",
                              }}
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <button
                  onClick={() => {
                    setShowStickerSettings(false);
                    setShowCreateSticker(true);
                  }}
                  style={{ ...btn, marginTop: "16px" }}
                >
                  + Создать стикер
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </DndContext>
  );

  function StickerButton({ icon, text }) {
    return (
      <button
        style={{
          height: "32px",
          padding: "0 12px",
          borderRadius: "10px",
          border: "1px solid #374151",
          background: "#e5e7eb",
          color: "#7c7c7c",
          fontSize: "14px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        <span
          style={{
            fontSize: "14px",
          }}
        >
          {icon}
        </span>

        {text}
      </button>
    );
  }
  function Column({
    columnKey,
    title,
    headerButtons,
    children,
    footer,
    isEmpty,
    selectMode,
    isColSelected,
    onColCheck,
  }) {
    const {
      attributes,
      listeners,
      setNodeRef: setSortableRef,
      transform,
      transition,
      isDragging,
    } = useSortable({
      id: columnKey,
    });

    const { setNodeRef: setDropRef, isOver } = useDroppable({
      id: `empty-${columnKey}`,
    });

    return (
      <div
        ref={setSortableRef}
        style={{
          transform: CSS.Transform.toString(transform),
          transition,
          opacity: isDragging ? 0.4 : 1,
          width: "280px",
          minWidth: "280px",
          flexShrink: 0,
          maxHeight: "500px",
          display: "flex",
          flexDirection: "column",
          background: "white",
          padding: "12px",
          borderRadius: "10px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
        }}
      >
        {/* HEADER */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "10px",
          }}
        >
          {selectMode && (
            <div
              onClick={onColCheck}
              style={{
                width: "16px",
                height: "16px",
                borderRadius: "4px",
                marginRight: "8px",
                flexShrink: 0,
                border: `2px solid ${isColSelected ? "#2563eb" : "#d1d5db"}`,
                background: isColSelected ? "#2563eb" : "white",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {isColSelected && (
                <span
                  style={{ color: "white", fontSize: "11px", lineHeight: 1 }}
                >
                  ✓
                </span>
              )}
            </div>
          )}
          <div
            {...attributes}
            {...listeners}
            style={{
              cursor: "grab",
              flex: 1,
              userSelect: "none",
            }}
          >
            <h3 style={{ margin: 0 }}>{title}</h3>
          </div>

          <div style={{ display: "flex", gap: "5px" }}>{headerButtons}</div>
        </div>

        {/* СКРОЛЛ ТОЛЬКО ДЛЯ КАРТОЧЕК */}
        <div
          id={`cards-${columnKey}`}
          style={{
            overflowY: "auto",
            flex: 1,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {children}

          {isEmpty && (
            <div
              ref={setDropRef}
              style={{
                flex: 1,
                minHeight: "80px",
                border: `2px dashed ${isOver ? "#3b82f6" : "#d1d5db"}`,
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: isOver ? "#3b82f6" : "#9ca3af",
                fontSize: "14px",
                background: isOver ? "#eff6ff" : "transparent",
                transition: "0.2s",
              }}
            >
              Перетащите карточку сюда
            </div>
          )}
        </div>

        {/* КНОПКА ВНЕ СКРОЛЛА */}
        {footer && <div style={{ marginTop: "10px" }}>{footer}</div>}
      </div>
    );
  }
  function EmptyColumn({ id }) {
    const { setNodeRef, isOver } = useDroppable({
      id,
    });

    return (
      <div
        ref={setNodeRef}
        style={{
          height: "80px",
          border: "2px dashed #d1d5db",
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#9ca3af",
          fontSize: "14px",
          background: isOver ? "#eff6ff" : "transparent",

          transition: "0.2s",
        }}
      >
        Перетащите карточку сюда
      </div>
    );
  }

  function DatePickerModal({ value, onSelect, onClose }) {
    const today = new Date();
    const initial = value
      ? (() => {
          const p = value.split("-");
          return new Date(+p[0], +p[1] - 1, +p[2]);
        })()
      : today;

    const [viewYear, setViewYear] = useState(initial.getFullYear());
    const [viewMonth, setViewMonth] = useState(initial.getMonth());

    const MONTHS = [
      "Январь",
      "Февраль",
      "Март",
      "Апрель",
      "Май",
      "Июнь",
      "Июль",
      "Август",
      "Сентябрь",
      "Октябрь",
      "Ноябрь",
      "Декабрь",
    ];
    const DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

    const firstDay = new Date(viewYear, viewMonth, 1).getDay(); // 0=вс
    const offset = firstDay === 0 ? 6 : firstDay - 1; // сдвиг чтобы неделя с Пн
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    const cells = [];
    for (let i = 0; i < offset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);

    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    function cellStr(d) {
      return `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }

    return (
      <div
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 2000,
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
              style={{
                border: "none",
                background: "none",
                cursor: "pointer",
                fontSize: "18px",
                color: "#6b7280",
                padding: "0 4px",
              }}
            >
              ‹
            </button>
            <span
              style={{ fontWeight: "700", fontSize: "15px", color: "#111827" }}
            >
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button
              onClick={() => {
                if (viewMonth === 11) {
                  setViewMonth(0);
                  setViewYear((y) => y + 1);
                } else setViewMonth((m) => m + 1);
              }}
              style={{
                border: "none",
                background: "none",
                cursor: "pointer",
                fontSize: "18px",
                color: "#6b7280",
                padding: "0 4px",
              }}
            >
              ›
            </button>
          </div>

          {/* Дни недели */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: "2px",
              marginBottom: "4px",
            }}
          >
            {DAYS.map((d) => (
              <div
                key={d}
                style={{
                  textAlign: "center",
                  fontSize: "11px",
                  fontWeight: "600",
                  color: "#9ca3af",
                  padding: "2px 0",
                }}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Ячейки */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: "2px",
            }}
          >
            {cells.map((d, i) => {
              if (!d) return <div key={"e" + i} />;
              const str = cellStr(d);
              const isSelected = str === value;
              const isToday = str === todayStr;
              const isPast = str < todayStr;
              return (
                <button
                  key={str}
                  onClick={() => onSelect(str)}
                  style={{
                    border: isSelected
                      ? "2px solid #2563eb"
                      : "2px solid transparent",
                    borderRadius: "8px",
                    background: isSelected
                      ? "#2563eb"
                      : isToday
                        ? "#eff6ff"
                        : "none",
                    color: isSelected
                      ? "white"
                      : isPast
                        ? "#d1d5db"
                        : "#111827",
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

          {/* Сегодня */}
          <button
            onClick={() => onSelect(todayStr)}
            style={{
              ...btn,
              marginTop: "12px",
              background: "#f3f4f6",
              color: "#374151",
              fontWeight: "600",
            }}
          >
            Сегодня
          </button>
        </div>
      </div>
    );
  }

  function StickerChip({ sticker, index, cardId, setSelectedSticker }) {
    return (
      <div
        key={index}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          const rect = e.currentTarget.getBoundingClientRect();
          setSelectedSticker({
            stickerIndex: index,
            cardId,
            sticker,
            x: rect.left,
            y: rect.bottom + 8,
          });
        }}
        style={{
          fontSize: "11px",
          background: (() => {
            // Кастомные состояния — цвет при выборе
            if (sticker.type === "states" && sticker.value) {
              const s = (sticker.states || []).find(
                (st) => st.label === sticker.value,
              );
              return s ? s.color + "22" : "#f3f4f6";
            }
            // Приоритет — цвет при выборе
            if (sticker.id === "priority" && sticker.value) {
              const c = PRIORITY_COLORS[sticker.value];
              return c ? c.bg + "22" : "#f3f4f6";
            }
            // Дедлайн — красный если просрочен
            if (
              sticker.id === "deadline" &&
              typeof sticker.value === "string"
            ) {
              const parts = sticker.value.split("-");
              if (parts.length === 3) {
                const deadline = new Date(
                  Number(parts[0]),
                  Number(parts[1]) - 1,
                  Number(parts[2]),
                );
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                if (deadline < today) return "#fee2e2";
              }
            }
            return "#f3f4f6";
          })(),
          color: (() => {
            if (sticker.type === "states" && sticker.value) {
              const s = (sticker.states || []).find(
                (st) => st.label === sticker.value,
              );
              return s ? s.color : "#6b7280";
            }
            if (sticker.id === "priority" && sticker.value) {
              const c = PRIORITY_COLORS[sticker.value];
              return c ? c.text : "#6b7280";
            }
            if (
              sticker.id === "deadline" &&
              typeof sticker.value === "string"
            ) {
              const parts = sticker.value.split("-");
              if (parts.length === 3) {
                const deadline = new Date(
                  Number(parts[0]),
                  Number(parts[1]) - 1,
                  Number(parts[2]),
                );
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                if (deadline < today) return "#ef4444";
              }
            }
            return "#6b7280";
          })(),
          color: (() => {
            if (sticker.type === "states" && sticker.value) {
              const s = (sticker.states || []).find(
                (st) => st.label === sticker.value,
              );
              return s ? s.color : "#374151";
            }
            return STICKER_STYLES[sticker.id]?.color || "#374151";
          })(),
          padding: "2px 6px",
          borderRadius: "6px",
          cursor: "pointer",
          fontWeight: "500",
        }}
      >
        {sticker.icon}
        {sticker.value !== undefined && sticker.value !== "" && (
          <span
            style={{
              marginLeft: "4px",
              color: (() => {
                if (
                  sticker.id !== "deadline" ||
                  typeof sticker.value !== "string"
                )
                  return "inherit";
                const parts = sticker.value.split("-");
                if (parts.length !== 3) return "inherit";
                const deadline = new Date(
                  Number(parts[0]),
                  Number(parts[1]) - 1,
                  Number(parts[2]),
                );
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return deadline < today ? "#ef4444" : "inherit";
              })(),
              fontWeight: (() => {
                if (
                  sticker.id !== "deadline" ||
                  typeof sticker.value !== "string"
                )
                  return "normal";
                const parts = sticker.value.split("-");
                if (parts.length !== 3) return "normal";
                const deadline = new Date(
                  Number(parts[0]),
                  Number(parts[1]) - 1,
                  Number(parts[2]),
                );
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return deadline < today ? "600" : "normal";
              })(),
            }}
          >
            {sticker.type === "daterange" && typeof sticker.value === "object"
              ? `${sticker.value.from || "?"} — ${sticker.value.to || "?"}`
              : String(sticker.value)}
          </span>
        )}
      </div>
    );
  }

  function Card({
    card,
    onClick,
    stickerHoverMode,
    setSelectedSticker,
    hoveredStickerZone,
    onAddSticker,
    allStickers,
    selectMode,
    isSelected,
    onSelect,
  }) {
    const [hovered, setHovered] = useState(false);
    const { setNodeRef: setDropRef } = useDroppable({
      id: "card-drop-" + card.id,
    });

    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: card.id });

    const isDropTarget =
      stickerHoverMode && hoveredStickerZone === "card-drop-" + card.id;

    const style = {
      transform: CSS.Transform.toString(transform),
      transition: transition || "0.2s",
      opacity: isDragging ? 0.3 : 1,
      background: isSelected ? "#eff6ff" : isDropTarget ? "#eff6ff" : "#f9fafb",
      padding: "10px",
      marginBottom: "8px",
      borderRadius: "6px",
      border: (() => {
        if (isSelected) return "2px solid #2563eb";
        if (isDropTarget) return "2px solid #3b82f6";
        const p = card.stickers?.find((s) => s.id === "priority");
        const color = p?.value ? PRIORITY_COLORS[p.value]?.border : null;
        return color ? `2px solid ${color}` : "1px solid #e5e7eb";
      })(),
      wordBreak: "break-word",
      whiteSpace: "normal",
      position: "relative",
    };

    // merge sortable and droppable refs
    const mergedRef = (node) => {
      setNodeRef(node);
      setDropRef(node);
    };

    return (
      <div
        ref={mergedRef}
        style={style}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {selectMode && (
          <div
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
            style={{
              width: "16px",
              height: "16px",
              borderRadius: "4px",
              marginBottom: "8px",
              border: `2px solid ${isSelected ? "#2563eb" : "#d1d5db"}`,
              background: isSelected ? "#2563eb" : "white",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {isSelected && (
              <span style={{ color: "white", fontSize: "11px", lineHeight: 1 }}>
                ✓
              </span>
            )}
          </div>
        )}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <div
            {...attributes}
            {...listeners}
            style={{ flex: 1, cursor: "grab", userSelect: "none", minWidth: 0 }}
          >
            <div>{card.text}</div>
          </div>

          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            style={{
              border: "none",
              background: "#f3f4f6",
              cursor: "pointer",
              color: "#6b7280",
              fontSize: "18px",
              width: "32px",
              height: "32px",
              minWidth: "32px",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ⋮
          </button>
        </div>

        {card.stickers?.length > 0 && (
          <div
            style={{
              display: "flex",
              gap: "4px",
              flexWrap: "wrap",
              marginTop: "8px",
            }}
          >
            {card.stickers.map((sticker, index) => (
              <StickerChip
                key={index}
                sticker={sticker}
                index={index}
                cardId={card.id}
                setSelectedSticker={setSelectedSticker}
              />
            ))}
          </div>
        )}

        {/* + кнопка добавления стикера */}
        {hovered && !isDragging && !stickerHoverMode && (
          <div
            style={{
              marginTop: "6px",
              display: "flex",
              justifyContent: "flex-start",
            }}
          >
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                const rect = e.currentTarget.getBoundingClientRect();
                onAddSticker({
                  cardId: card.id,
                  x: rect.left,
                  y: rect.bottom + 6,
                });
              }}
              title="Добавить стикер"
              style={{
                width: "20px",
                height: "20px",
                border: "1.5px solid #d1d5db",
                borderRadius: "50%",
                background: "white",
                color: "#9ca3af",
                fontSize: "14px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                lineHeight: 1,
                padding: 0,
              }}
            >
              +
            </button>
          </div>
        )}
      </div>
    );
  }
}

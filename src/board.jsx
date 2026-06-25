import { useState, useEffect, useRef } from "react";

import {
  DndContext,
  closestCenter,
  closestCorners,
  rectIntersection,
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
import { restrictToHorizontalAxis } from "@dnd-kit/modifiers";
import DatePickerModal from "./DatePickerModal";
import {
  apiCreateCard,
  apiUpdateCard,
  apiDeleteCard,
  apiCreateColumn,
  apiRenameColumn,
  apiDeleteColumn,
  apiMoveColumn,
  apiMoveCard,
  apiAddSticker,
  apiUpdateSticker,
  apiDeleteSticker,
  apiGetCustomStickers,
  apiCreateCustomSticker,
  apiUpdateCustomSticker,
  apiDeleteCustomSticker,
} from "./api.js";

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

const menuItem = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  width: "100%",
  padding: "8px 10px",
  border: "none",
  background: "transparent",
  borderRadius: "6px",
  textAlign: "left",
  fontSize: "13px",
  color: "#374151",
  cursor: "pointer",
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
// Функция определения цвета текста по яркости фона
function getTextColorForBackground(hex) {
  if (!hex) return '#111827';
  let color = hex.trim();
  if (color.startsWith('#')) color = color.slice(1);
  let r, g, b;
  if (color.length === 3) {
    r = parseInt(color[0] + color[0], 16);
    g = parseInt(color[1] + color[1], 16);
    b = parseInt(color[2] + color[2], 16);
  } else if (color.length === 6) {
    r = parseInt(color.slice(0, 2), 16);
    g = parseInt(color.slice(2, 4), 16);
    b = parseInt(color.slice(4, 6), 16);
  } else {
    return '#111827'; // fallback
  }
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#111827' : 'white';
}
export default function Board({ board, setBoard, boards, setBoards, activeBoardId, members, boardId }) {
  if (!board) {
    return <div>Загрузка доски...</div>;
  }
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [showDateRangePicker, setShowDateRangePicker] = useState(null);

  const [selectMode, setSelectMode] = useState(false);

  const [selectedCards, setSelectedCards] = useState(new Set());

  const [activeCard, setActiveCard] = useState(null);
  const dragStartColumnRef = useRef(null);

  const [activeColumn, setActiveColumn] = useState(null);

  const [isAdding, setIsAdding] = useState(null);

  const [activeSticker, setActiveSticker] = useState(null);

  const [selectedSticker, setSelectedSticker] = useState(null);

  const [stickerHoverMode, setStickerHoverMode] = useState(false);

  const [newText, setNewText] = useState("");

  const [isAddingColumn, setIsAddingColumn] = useState(false);

  const [newColumnTitle, setNewColumnTitle] = useState("");

  const [isLoadingStickers, setIsLoadingStickers] = useState(false);
  // Маленькие контекстные меню (карточка / колонка)
  const [cardMenu, setCardMenu] = useState(null); // { columnKey, cardId, x, y }
  const [columnMenu, setColumnMenu] = useState(null); // { columnKey, x, y }

  // Инлайн-редактирование названия карточки/колонки
  const [editingCardId, setEditingCardId] = useState(null);
  const [editingColumnKey, setEditingColumnKey] = useState(null);

  // Модалка перемещения карточки/колонки на другую доску
  const [moveModal, setMoveModal] = useState(null); // { type: 'card' | 'column', columnKey, cardId }
  const [moveTargetBoard, setMoveTargetBoard] = useState(null);
  const [moveTargetColumn, setMoveTargetColumn] = useState(null);

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
    setSelectedSticker(null);
    setShowStickerPicker(null);
    setCardMenu(null);
    setColumnMenu(null);
    setEditingCardId(null);
    setEditingColumnKey(null);
    setMoveModal(null);
  }, [
    board &&
      Object.keys(board)
        .filter((k) => k !== "_meta")
        .join(","),
  ]);
useEffect(() => {
  if (!boardId) return;
  
  const loadStickers = async () => {
    setIsLoadingStickers(true);
    try {
      const data = await apiGetCustomStickers(boardId);
      
console.log("Загруженные стикеры с сервера:", data);

      setBoard(prev => {
        const customStickers = data.stickers.map(s => ({
          id: `custom-${s.id}`,
          _dbId: s.id,
          type: s.type,
          icon: s.icon,
          text: s.text,
          states: s.states || undefined,
          hidden: s.hidden
        }));
        
        const hiddenStickers = data.stickers
          .filter(s => s.hidden)
          .map(s => `custom-${s.id}`);
        
        return {
          ...prev,
          _meta: {
            ...(prev._meta || {}),
            customStickers,
            hiddenStickers: [...hiddenStickers]
          }
        };
      });
    } catch (err) {
      console.error("Не удалось загрузить кастомные стикеры:", err);
    } finally {
      setIsLoadingStickers(false);
    }
  };
  
  loadStickers();
}, [boardId]);
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
function getCardById(cardId) {
  for (const colKey of Object.keys(board).filter(k => k !== '_meta')) {
    const card = board[colKey].cards.find(c => c.id === cardId);
    if (card) return { card, colKey };
  }
  return null;
}
  function handleDragStart(event) {
    const activeId = event.active.id;
    const sticker = allStickers.find((s) => s.id === activeId);

    // на старте нового drag гарантированно очищаем состояния прошлого
    setActiveCard(null);
    setActiveColumn(null);
    setActiveSticker(null);

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

    dragStartColumnRef.current = column;
    setActiveCard(card);
  }

  function handleDragEnd(event) {
    const { active, over } = event;

    const sticker = allStickers.find((s) => s.id === active.id);

    // Сброс состояний drag-оверлея всегда происходит в начале,
    // чтобы следующий drag не унаследовал чужой activeCard/activeColumn.
    setActiveCard(null);
    setActiveColumn(null);
    setActiveSticker(null);
    setStickerHoverMode(false);
    setHoveredStickerZone(null);

    if (!sticker && over && String(over.id).startsWith("card-drop-")) {
      return;
    }

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

      const card = board[columnKey]?.cards.find((c) => c.id === cardId);
      const cardDbId = card?._dbId;

      // Оптимистично добавляем стикер с временным _dbId
      const tempStickerDbId = "temp-sticker-" + Date.now();
      const optimisticSticker = { ...sticker, _dbId: tempStickerDbId };

      setBoard((prev) => ({
        ...prev,
        [columnKey]: {
          ...prev[columnKey],
          cards: prev[columnKey].cards.map((c) =>
            c.id === cardId
              ? { ...c, stickers: [...(c.stickers || []), optimisticSticker] }
              : c,
          ),
        },
      }));

      setActiveSticker(null);

      if (cardDbId) {
        // Для builtin стикеров type = id (executor/deadline/priority),
        // для кастомных type берём из sticker.type
        const stickerType = sticker.id;
        const defaultValue = sticker.value ?? "";

        apiAddSticker(cardDbId, { type: stickerType, value: defaultValue })
          .then(({ sticker: saved }) => {
            // Заменяем временный _dbId на настоящий
            setBoard((prev) => {
              if (!prev[columnKey]) return prev;
              return {
                ...prev,
                [columnKey]: {
                  ...prev[columnKey],
                  cards: prev[columnKey].cards.map((c) =>
                    c.id === cardId
                      ? {
                          ...c,
                          stickers: c.stickers.map((s) =>
                            s._dbId === tempStickerDbId
                              ? { ...s, _dbId: saved.id }
                              : s,
                          ),
                        }
                      : c,
                  ),
                },
              };
            });
          })
          .catch((err) => {
            console.error("Не удалось добавить стикер:", err);
            // Откатываем
            setBoard((prev) => {
              if (!prev[columnKey]) return prev;
              return {
                ...prev,
                [columnKey]: {
                  ...prev[columnKey],
                  cards: prev[columnKey].cards.map((c) =>
                    c.id === cardId
                      ? {
                          ...c,
                          stickers: c.stickers.filter(
                            (s) => s._dbId !== tempStickerDbId,
                          ),
                        }
                      : c,
                  ),
                },
              };
            });
          });
      }
      return;
    }

    const columnKeys = Object.keys(board).filter((k) => k !== "_meta");

    if (columnKeys.includes(active.id)) {
      // over.id может быть: id колонки, id карточки внутри неё, или "empty-<columnKey>"
      let targetColumnId = columnKeys.includes(String(over.id))
        ? String(over.id)
        : String(over.id).startsWith("empty-")
          ? String(over.id).replace("empty-", "")
          : findColumn(over.id) || null;

      if (!targetColumnId || !columnKeys.includes(targetColumnId)) return;

      const oldIndex = columnKeys.indexOf(active.id);
      const newIndex = columnKeys.indexOf(targetColumnId);

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const metaEntry = board._meta ? [["_meta", board._meta]] : [];
        const entries = Object.entries(board).filter(([k]) => k !== "_meta");
        const newEntries = arrayMove(entries, oldIndex, newIndex);
        setBoard(Object.fromEntries([...newEntries, ...metaEntry]));

        const movedColumnDbId = board[active.id]?._dbId;
        if (movedColumnDbId) {
          apiMoveColumn(movedColumnDbId, newIndex).catch((err) => {
            console.error("Не удалось сохранить порядок колонок:", err);
          });
        }
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

    const startColumn = dragStartColumnRef.current;

    // Карточка сменила колонку (перемещение уже выполнено визуально в
    // handleDragOver) — синхронизируем итоговую колонку/позицию с сервером
    if (startColumn && startColumn !== activeCol) {
      const movedCardDbId = board[activeCol]?.cards.find((c) => c.id === active.id)?._dbId;
      const targetColumnDbId = board[activeCol]?._dbId;
      const finalIndex = board[activeCol]?.cards.findIndex((c) => c.id === active.id);

      if (movedCardDbId && targetColumnDbId && finalIndex !== -1) {
        apiMoveCard(movedCardDbId, targetColumnDbId, finalIndex).catch((err) => {
          console.error("Не удалось сохранить перемещение карточки:", err);
        });
      }
      dragStartColumnRef.current = null;
      return;
    }

    dragStartColumnRef.current = null;

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

      const movedCardDbId = board[activeCol]?.cards.find((c) => c.id === active.id)?._dbId;
      const targetColumnDbId = board[activeCol]?._dbId;
      if (movedCardDbId && targetColumnDbId) {
        apiMoveCard(movedCardDbId, targetColumnDbId, newIndex).catch((err) => {
          console.error("Не удалось сохранить порядок карточек:", err);
        });
      }
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

    // если таскаем колонку — ничего не трогаем здесь.
    // useSortable сам визуально сдвигает соседей через transform;
    // финальная перестановка данных происходит один раз в handleDragEnd.
    if (
      Object.keys(board)
        .filter((k) => k !== "_meta")
        .includes(active.id)
    ) {
      return;
    }

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
      // карточки, в т.ч. из других колонок (не только из activeCol)
      if (selectedCards.has(active.id) && selectedCards.size > 1) {
        const newBoard = { ...prev };
        let insertAt = overIndex + 1;

        Object.keys(prev)
          .filter((k) => k !== "_meta" && k !== overCol)
          .forEach((key) => {
            const cards = key === activeCol ? activeCards : [...prev[key].cards];
            const others = cards.filter((c) => selectedCards.has(c.id));
            const remaining = cards.filter((c) => !selectedCards.has(c.id));

            newBoard[key] = { ...prev[key], cards: remaining };

            others.forEach((c) => {
              overCards.splice(insertAt, 0, c);
              insertAt++;
            });
          });

        newBoard[overCol] = { ...prev[overCol], cards: overCards };
        return newBoard;
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

    const activeId = args.active?.id ? String(args.active.id) : "";
    const isDraggingColumn = Object.keys(board)
      .filter((k) => k !== "_meta")
      .includes(activeId);

    const filteredContainers = args.droppableContainers.filter((c) => {
      const id = String(c.id);
      if (isDraggingColumn) {
        // при drag колонки — только сами колонки, без card-drop-* и empty-*
        return !id.startsWith("card-drop-") && !id.startsWith("empty-");
      }
      // при drag карточки/стикера — убираем только card-drop-*
      return !id.startsWith("card-drop-");
    });

    if (isDraggingColumn) {
      // rectIntersection: срабатывает при любом перекрытии прямоугольников,
      // не требует попадания в центр — надёжно работает с пустыми/короткими колонками
      return rectIntersection({ ...args, droppableContainers: filteredContainers });
    }

    return closestCenter({ ...args, droppableContainers: filteredContainers });
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

    const tempId = "temp-" + Date.now().toString();
    const cardText = newText;

    const newCard = {
      id: tempId,
      text: cardText,
      note: "",
      stickers: [],
      _pending: true,
    };

    // Оптимистично показываем карточку сразу, не дожидаясь ответа сервера
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

    const columnDbId = board[columnKey]?._dbId;
    if (!columnDbId) return; // колонка ещё не из БД (не должно случаться в норме)

    apiCreateCard(columnDbId, cardText)
      .then(({ card }) => {
        // заменяем временную карточку на настоящую (с реальным _dbId)
        setBoard((prev) => {
          if (!prev[columnKey]) return prev;
          return {
            ...prev,
            [columnKey]: {
              ...prev[columnKey],
              cards: prev[columnKey].cards.map((c) =>
                c.id === tempId
                  ? {
                      id: "card-" + card.id,
                      text: card.text,
                      completed: card.completed,
                      stickers: (card.stickers || []).map((s) => ({
                        id: s.type,
                        value: s.value ?? "",
                        _dbId: s.id,
                      })),
                      _dbId: card.id,
                      _deadline: card.deadline,
                      _assigneeId: card.assigneeId,
                    }
                  : c,
              ),
            },
          };
        });
      })
      .catch((err) => {
        console.error("Не удалось создать карточку:", err);
        // откатываем оптимистичное добавление
        setBoard((prev) => {
          if (!prev[columnKey]) return prev;
          return {
            ...prev,
            [columnKey]: {
              ...prev[columnKey],
              cards: prev[columnKey].cards.filter((c) => c.id !== tempId),
            },
          };
        });
      });
  }
  function renameCard(columnKey, cardId, newText) {
    if (!newText.trim()) return;

    const prevCard = board[columnKey]?.cards.find((c) => c.id === cardId);
    const prevText = prevCard?.text;

    setBoard((prev) => ({
      ...prev,

      [columnKey]: {
        ...prev[columnKey],

        cards: prev[columnKey].cards.map((card) =>
          card.id === cardId ? { ...card, text: newText } : card,
        ),
      },
    }));

    const cardDbId = prevCard?._dbId;
    if (!cardDbId) return;

    apiUpdateCard(cardDbId, { text: newText }).catch((err) => {
      console.error("Не удалось переименовать карточку:", err);
      // откатываем на прежний текст
      setBoard((prev) => ({
        ...prev,
        [columnKey]: {
          ...prev[columnKey],
          cards: prev[columnKey].cards.map((card) =>
            card.id === cardId ? { ...card, text: prevText } : card,
          ),
        },
      }));
    });
  }

  function duplicateCard(columnKey, cardId) {
    setBoard((prev) => {
      const cards = prev[columnKey].cards;
      const idx = cards.findIndex((c) => c.id === cardId);
      if (idx === -1) return prev;

      const original = cards[idx];
      const copy = {
        ...original,
        id: Date.now().toString(),
        stickers: original.stickers
          ? original.stickers.map((s) => ({ ...s }))
          : original.stickers,
      };

      const newCards = [...cards];
      newCards.splice(idx + 1, 0, copy);

      return {
        ...prev,
        [columnKey]: { ...prev[columnKey], cards: newCards },
      };
    });
  }

  async function duplicateSelectedCards() {
  if (selectedCards.size === 0) return;

  const toDuplicate = [];
  for (const cardId of selectedCards) {
    const found = getCardById(cardId);
    if (!found) continue;
    toDuplicate.push({ card: found.card, colKey: found.colKey });
  }

  for (const { card, colKey } of toDuplicate) {
    const columnDbId = board[colKey]._dbId;
    if (!columnDbId) continue;

    // Оптимистичное добавление временной карточки без стикеров
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const newCard = {
      id: tempId,
      text: card.text,
      completed: card.completed,
      stickers: [],
      _pending: true,
    };

    setBoard(prev => {
      const col = prev[colKey];
      const idx = col.cards.findIndex(c => c.id === card.id);
      const cards = [...col.cards];
      cards.splice(idx + 1, 0, newCard);
      return { ...prev, [colKey]: { ...col, cards } };
    });

    try {
      // Создаём карточку на сервере
      const result = await apiCreateCard(columnDbId, card.text);
      const saved = result.card;

      // Обновляем временную карточку реальными данными
      setBoard(prev => {
        const col = prev[colKey];
        const cards = col.cards.map(c => {
          if (c.id === tempId) {
            return {
              ...c,
              id: `card-${saved.id}`,
              _dbId: saved.id,
              _pending: false,
            };
          }
          return c;
        });
        return { ...prev, [colKey]: { ...col, cards } };
      });

      // Копируем стикеры
      for (const sticker of card.stickers || []) {
        try {
          const stickerResult = await apiAddSticker(saved.id, {
            type: sticker.id,
            value: sticker.value ?? "",
          });
          // Обновляем локальный стейт – добавляем стикер с _dbId
          setBoard(prev => {
            const col = prev[colKey];
            const cards = col.cards.map(c => {
              if (c.id === `card-${saved.id}`) {
                const newSticker = {
                  ...sticker,
                  _dbId: stickerResult.sticker.id,
                };
                return { ...c, stickers: [...c.stickers, newSticker] };
              }
              return c;
            });
            return { ...prev, [colKey]: { ...col, cards } };
          });
        } catch (err) {
          console.error("Не удалось скопировать стикер:", err);
        }
      }
    } catch (err) {
      console.error("Не удалось дублировать карточку:", err);
      // Откат – удаляем временную карточку
      setBoard(prev => {
        const col = prev[colKey];
        const cards = col.cards.filter(c => c.id !== tempId);
        return { ...prev, [colKey]: { ...col, cards } };
      });
    }
  }

  setSelectedCards(new Set());
}

  function updateStickerValue(value, closeModal = false) {
    console.log("🔄 updateStickerValue вызван с value:", value);
    const columnKey = findColumn(selectedSticker.cardId);
    const prevValue = selectedSticker.sticker.value;

    setBoard((prev) => ({
      ...prev,
      [columnKey]: {
        ...prev[columnKey],
        cards: prev[columnKey].cards.map((card) =>
          card.id === selectedSticker.cardId
            ? {
                ...card,
                stickers: card.stickers.map((s, i) =>
                  i === selectedSticker.stickerIndex ? { ...s, value } : s,
                ),
              }
            : card,
        ),
      },
    }));

    setSelectedSticker((prev) =>
      prev ? { ...prev, sticker: { ...prev.sticker, value } } : prev,
    );

    if (closeModal) setSelectedSticker(null);

    const stickerDbId = selectedSticker.sticker._dbId;
    if (stickerDbId && !String(stickerDbId).startsWith("temp-")) {
      const serialized =
        value !== null && typeof value === "object"
          ? JSON.stringify(value)
          : String(value ?? "");

      apiUpdateSticker(stickerDbId, serialized).catch((err) => {
        console.error("Не удалось обновить стикер:", err);
        // Откатываем значение
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
                        ? { ...s, value: prevValue }
                        : s,
                    ),
                  }
                : card,
            ),
          },
        }));
      });
    }
  }

  function deleteSticker() {
    const columnKey = findColumn(selectedSticker.cardId);
    const removedSticker = selectedSticker.sticker;
    const removedIndex = selectedSticker.stickerIndex;

    setBoard((prev) => ({
      ...prev,
      [columnKey]: {
        ...prev[columnKey],
        cards: prev[columnKey].cards.map((card) =>
          card.id === selectedSticker.cardId
            ? {
                ...card,
                stickers: card.stickers.filter((_, i) => i !== removedIndex),
              }
            : card,
        ),
      },
    }));

    setSelectedSticker(null);

    const stickerDbId = removedSticker?._dbId;
    if (stickerDbId && !String(stickerDbId).startsWith("temp-")) {
      apiDeleteSticker(stickerDbId).catch((err) => {
        console.error("Не удалось удалить стикер:", err);
        // Откатываем — возвращаем стикер на то же место
        setBoard((prev) => {
          if (!prev[columnKey]) return prev;
          return {
            ...prev,
            [columnKey]: {
              ...prev[columnKey],
              cards: prev[columnKey].cards.map((card) => {
                if (card.id !== selectedSticker?.cardId) return card;
                const stickers = [...card.stickers];
                stickers.splice(removedIndex, 0, removedSticker);
                return { ...card, stickers };
              }),
            },
          };
        });
      });
    }
  }
  function deleteCard(columnKey, cardId) {
    const removedCard = board[columnKey]?.cards.find((c) => c.id === cardId);
    const removedIndex = board[columnKey]?.cards.findIndex((c) => c.id === cardId);

    setBoard((prev) => {
      const newCards = prev[columnKey].cards.filter(
        (card) => card.id !== cardId,
      );

      return {
        ...prev,

        [columnKey]: {
          ...prev[columnKey],

          cards: newCards,
        },
      };
    });

    setSelectedCards((prev) => {
      if (!prev.has(cardId)) return prev;
      const next = new Set(prev);
      next.delete(cardId);
      return next;
    });

    const cardDbId = removedCard?._dbId;
    if (!cardDbId) return;

    apiDeleteCard(cardDbId).catch((err) => {
      console.error("Не удалось удалить карточку:", err);
      // откатываем — возвращаем карточку на прежнее место
      if (!removedCard) return;
      setBoard((prev) => {
        if (!prev[columnKey]) return prev;
        const cards = [...prev[columnKey].cards];
        const insertAt = Math.min(removedIndex, cards.length);
        cards.splice(insertAt < 0 ? cards.length : insertAt, 0, removedCard);
        return {
          ...prev,
          [columnKey]: { ...prev[columnKey], cards },
        };
      });
    });
  }

  function toggleCardCompleted(columnKey, cardId) {
    const prevCard = board[columnKey]?.cards.find((c) => c.id === cardId);
    const nextCompleted = !prevCard?.completed;

    setBoard((prev) => ({
      ...prev,

      [columnKey]: {
        ...prev[columnKey],

        cards: prev[columnKey].cards.map((card) =>
          card.id === cardId ? { ...card, completed: !card.completed } : card,
        ),
      },
    }));

    const cardDbId = prevCard?._dbId;
    if (!cardDbId) return;

    apiUpdateCard(cardDbId, { completed: nextCompleted }).catch((err) => {
      console.error("Не удалось обновить статус карточки:", err);
      // откатываем
      setBoard((prev) => ({
        ...prev,
        [columnKey]: {
          ...prev[columnKey],
          cards: prev[columnKey].cards.map((card) =>
            card.id === cardId ? { ...card, completed: !nextCompleted } : card,
          ),
        },
      }));
    });
  }

  function addColumn() {
    if (!newColumnTitle.trim()) return;

    const tempId = "temp-col-" + Date.now().toString();
    const columnTitle = newColumnTitle;

    setBoard((prev) => ({
      ...prev,

      [tempId]: {
        title: columnTitle,
        cards: [],
      },
    }));

    setNewColumnTitle("");
    setIsAddingColumn(false);

    const boardDbId = boards[activeBoardId]?._dbId;
    if (!boardDbId) return;

    apiCreateColumn(boardDbId, columnTitle)
      .then(({ column }) => {
        setBoard((prev) => {
          if (!prev[tempId]) return prev;
          const { [tempId]: tempCol, ...rest } = prev;
          return {
            ...rest,
            ["col-" + column.id]: {
              title: column.title,
              cards: [],
              _dbId: column.id,
            },
          };
        });
      })
      .catch((err) => {
        console.error("Не удалось создать колонку:", err);
        setBoard((prev) => {
          const { [tempId]: _removed, ...rest } = prev;
          return rest;
        });
      });
  }

  function renameColumn(columnKey, newTitle) {
    if (!newTitle.trim()) return;

    const prevTitle = board[columnKey]?.title;

    setBoard((prev) => ({
      ...prev,

      [columnKey]: {
        ...prev[columnKey],
        title: newTitle,
      },
    }));

    const columnDbId = board[columnKey]?._dbId;
    if (!columnDbId) return;

    apiRenameColumn(columnDbId, newTitle).catch((err) => {
      console.error("Не удалось переименовать колонку:", err);
      setBoard((prev) => ({
        ...prev,
        [columnKey]: { ...prev[columnKey], title: prevTitle },
      }));
    });
  }

  function duplicateColumn(columnKey) {
    setBoard((prev) => {
      const col = prev[columnKey];
      const newId = Date.now().toString();

      const newCards = col.cards.map((c, i) => ({
        ...c,
        id: (Date.now() + i + 1).toString(),
        stickers: c.stickers ? c.stickers.map((s) => ({ ...s })) : c.stickers,
      }));

      const entries = Object.entries(prev);
      const idx = entries.findIndex(([k]) => k === columnKey);
      entries.splice(idx + 1, 0, [
        newId,
        { ...col, cards: newCards },
      ]);

      return Object.fromEntries(entries);
    });
  }

  function deleteColumn(columnKey) {
    const removedColumn = board[columnKey];

    setBoard((prev) => {
      const newBoard = { ...prev };
      delete newBoard[columnKey];
      return newBoard;
    });

    setSelectedCards((prev) => {
      const removedIds = new Set((board[columnKey]?.cards || []).map((c) => c.id));
      let changed = false;
      const next = new Set(prev);
      removedIds.forEach((id) => {
        if (next.has(id)) {
          next.delete(id);
          changed = true;
        }
      });
      return changed ? next : prev;
    });

    const columnDbId = removedColumn?._dbId;
    if (!columnDbId) return;

    apiDeleteColumn(columnDbId).catch((err) => {
      console.error("Не удалось удалить колонку:", err);
      // откатываем — возвращаем колонку обратно (в конец, точная позиция не критична для отката)
      setBoard((prev) => ({
        ...prev,
        [columnKey]: removedColumn,
      }));
    });
  }

  function moveCardToBoard(columnKey, cardId, toBoardId, toColumnKey) {
    if (toBoardId === activeBoardId) {
      if (toColumnKey === columnKey) return;

      setBoard((prev) => {
        const fromCards = [...prev[columnKey].cards];
        const idx = fromCards.findIndex((c) => c.id === cardId);
        if (idx === -1) return prev;

        const [item] = fromCards.splice(idx, 1);
        const toCards = [...prev[toColumnKey].cards, item];

        return {
          ...prev,
          [columnKey]: { ...prev[columnKey], cards: fromCards },
          [toColumnKey]: { ...prev[toColumnKey], cards: toCards },
        };
      });
      return;
    }

    let movedCard = null;

    setBoard((prev) => {
      const fromCards = [...prev[columnKey].cards];
      const idx = fromCards.findIndex((c) => c.id === cardId);
      if (idx === -1) return prev;

      [movedCard] = fromCards.splice(idx, 1);

      return {
        ...prev,
        [columnKey]: { ...prev[columnKey], cards: fromCards },
      };
    });

    setBoards((prev) => {
      if (!movedCard) return prev;

      const targetBoard = prev[toBoardId];
      const toCards = [...(targetBoard.data[toColumnKey]?.cards || []), movedCard];

      return {
        ...prev,
        [toBoardId]: {
          ...targetBoard,
          data: {
            ...targetBoard.data,
            [toColumnKey]: { ...targetBoard.data[toColumnKey], cards: toCards },
          },
        },
      };
    });

    setSelectedCards((prev) => {
      if (!prev.has(cardId)) return prev;
      const next = new Set(prev);
      next.delete(cardId);
      return next;
    });
  }

async function moveSelectedCards(toBoardId, toColumnKey) {
  if (selectedCards.size === 0) return;

  const isSameBoard = toBoardId === activeBoardId;

  // Собираем данные о перемещаемых карточках
  const cardsToMove = [];
  for (const cardId of selectedCards) {
    const found = getCardById(cardId);
    if (!found) continue;
    cardsToMove.push({ card: found.card, colKey: found.colKey });
  }

  if (isSameBoard) {
    // ===== ПЕРЕМЕЩЕНИЕ ВНУТРИ ТЕКУЩЕЙ ДОСКИ =====
    const targetColumnDbId = board[toColumnKey]._dbId;
    if (!targetColumnDbId) return;

    for (const { card, colKey } of cardsToMove) {
      // Оптимистично удаляем из старой колонки и добавляем в новую (в конец)
      setBoard(prev => {
        const fromCol = prev[colKey];
        const toCol = prev[toColumnKey];
        const fromCards = fromCol.cards.filter(c => c.id !== card.id);
        const toCards = [...toCol.cards, card];
        return {
          ...prev,
          [colKey]: { ...fromCol, cards: fromCards },
          [toColumnKey]: { ...toCol, cards: toCards },
        };
      });

      try {
        // Вызываем API для перемещения (позиция – последняя в целевой колонке)
        const targetCount = board[toColumnKey]?.cards?.length || 0;
        await apiMoveCard(card._dbId, targetColumnDbId, targetCount);
      } catch (err) {
        console.error("Не удалось переместить карточку:", err);
        // Откат – вернуть карточку обратно
        setBoard(prev => {
          const fromCol = prev[colKey];
          const toCol = prev[toColumnKey];
          const fromCards = [...fromCol.cards, card];
          const toCards = toCol.cards.filter(c => c.id !== card.id);
          return {
            ...prev,
            [colKey]: { ...fromCol, cards: fromCards },
            [toColumnKey]: { ...toCol, cards: toCards },
          };
        });
      }
    }
  } else {
    // ===== ПЕРЕМЕЩЕНИЕ НА ДРУГУЮ ДОСКУ =====
    const targetBoard = boards[toBoardId];
    const targetBoardData = targetBoard.data;
    const targetColumn = targetBoardData[toColumnKey];
    if (!targetColumn) return;

    const targetColumnDbId = targetColumn._dbId;
    if (!targetColumnDbId) return;

    for (const { card, colKey } of cardsToMove) {
      // 1. Удаляем карточку из текущей доски (локально)
      setBoard(prev => {
        const col = prev[colKey];
        const cards = col.cards.filter(c => c.id !== card.id);
        return { ...prev, [colKey]: { ...col, cards } };
      });

      // 2. Удаляем с сервера
      try {
        await apiDeleteCard(card._dbId);
      } catch (err) {
        console.error("Не удалось удалить карточку при перемещении:", err);
        // Откат удаления
        setBoard(prev => {
          const col = prev[colKey];
          const cards = [...col.cards, card];
          return { ...prev, [colKey]: { ...col, cards } };
        });
        continue; // переходим к следующей карточке
      }

      // 3. Создаём новую карточку на целевой доске
      try {
        const result = await apiCreateCard(targetColumnDbId, card.text);
        const saved = result.card;

        // 4. Добавляем в целевую доску локально
        setBoards(prevBoards => {
          const newBoard = { ...prevBoards[toBoardId] };
          const newData = { ...newBoard.data };
          const col = newData[toColumnKey];
          const newCardObj = {
            id: `card-${saved.id}`,
            text: card.text,
            completed: card.completed,
            stickers: [],
            _dbId: saved.id,
          };
          const cards = [...col.cards, newCardObj];
          newData[toColumnKey] = { ...col, cards };
          newBoard.data = newData;
          return { ...prevBoards, [toBoardId]: newBoard };
        });

        // 5. Копируем стикеры
        for (const sticker of card.stickers || []) {
          try {
            const stickerResult = await apiAddSticker(saved.id, {
              type: sticker.id,
              value: sticker.value ?? "",
            });
            // Добавляем стикер в локальный стейт целевой доски
            setBoards(prevBoards => {
              const newBoard = { ...prevBoards[toBoardId] };
              const newData = { ...newBoard.data };
              const col = newData[toColumnKey];
              const cards = col.cards.map(c => {
                if (c.id === `card-${saved.id}`) {
                  const newSticker = {
                    ...sticker,
                    _dbId: stickerResult.sticker.id,
                  };
                  return { ...c, stickers: [...c.stickers, newSticker] };
                }
                return c;
              });
              newData[toColumnKey] = { ...col, cards };
              newBoard.data = newData;
              return { ...prevBoards, [toBoardId]: newBoard };
            });
          } catch (err) {
            console.error("Не удалось скопировать стикер при перемещении:", err);
          }
        }
      } catch (err) {
        console.error("Не удалось создать карточку на целевой доске:", err);
        // Восстановить карточку на исходной доске
        setBoard(prev => {
          const col = prev[colKey];
          const cards = [...col.cards, card];
          return { ...prev, [colKey]: { ...col, cards } };
        });
      }
    }
  }

  setSelectedCards(new Set());
}
// Удаление выбранных карточек с сервера
async function deleteSelectedCards() {
  if (selectedCards.size === 0) return;

  const toDelete = [];
  for (const cardId of selectedCards) {
    const found = getCardById(cardId);
    if (found) toDelete.push({ card: found.card, colKey: found.colKey });
  }

  for (const { card, colKey } of toDelete) {
    // Оптимистичное удаление из стейта
    setBoard(prev => {
      const col = prev[colKey];
      const cards = col.cards.filter(c => c.id !== card.id);
      return { ...prev, [colKey]: { ...col, cards } };
    });

    try {
      await apiDeleteCard(card._dbId);
    } catch (err) {
      console.error("Не удалось удалить карточку:", err);
      // Откат – возвращаем карточку обратно
      setBoard(prev => {
        const col = prev[colKey];
        const cards = [...col.cards, card];
        return { ...prev, [colKey]: { ...col, cards } };
      });
    }
  }

  setSelectedCards(new Set());
}
  function moveColumnToBoard(columnKey, toBoardId) {
    if (toBoardId === activeBoardId) return;

    let movedColumn = null;

    setBoard((prev) => {
      const newBoard = { ...prev };
      movedColumn = newBoard[columnKey];
      delete newBoard[columnKey];
      return newBoard;
    });

    setBoards((prev) => {
      if (!movedColumn) return prev;

      const targetBoard = prev[toBoardId];

      return {
        ...prev,
        [toBoardId]: {
          ...targetBoard,
          data: {
            ...targetBoard.data,
            [columnKey]: movedColumn,
          },
        },
      };
    });

    setSelectedCards((prev) => {
      const removedIds = new Set((movedColumn?.cards || []).map((c) => c.id));
      let changed = false;
      const next = new Set(prev);
      removedIds.forEach((id) => {
        if (next.has(id)) {
          next.delete(id);
          changed = true;
        }
      });
      return changed ? next : prev;
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
          height: "100%",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxSizing: "border-box",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        }}
      >
        <div
          style={{
            background: "white",
            borderRadius: "12px",
            padding: "10px",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            minHeight: 0,
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
              flexShrink: 0,
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
                <>
                  <button
                    onClick={duplicateSelectedCards}
                    disabled={selectedCards.size === 0}
                    style={{
                      height: "28px",
                      padding: "0 12px",
                      borderRadius: "8px",
                      fontSize: "13px",
                      fontWeight: "600",
                      cursor:
                        selectedCards.size > 0 ? "pointer" : "not-allowed",
                      border: "1.5px solid #d1d5db",
                      background:
                        selectedCards.size > 0 ? "white" : "#f9fafb",
                      color: selectedCards.size > 0 ? "#374151" : "#d1d5db",
                      transition: "0.15s",
                    }}
                  >
                    ⧉ Дублировать{" "}
                    {selectedCards.size > 0 ? `(${selectedCards.size})` : ""}
                  </button>

                  <button
                    onClick={() => {
                      if (selectedCards.size === 0) return;
                      setMoveModal({ type: "cards" });
                    }}
                    disabled={selectedCards.size === 0}
                    style={{
                      height: "28px",
                      padding: "0 12px",
                      borderRadius: "8px",
                      fontSize: "13px",
                      fontWeight: "600",
                      cursor:
                        selectedCards.size > 0 ? "pointer" : "not-allowed",
                      border: "1.5px solid #d1d5db",
                      background:
                        selectedCards.size > 0 ? "white" : "#f9fafb",
                      color: selectedCards.size > 0 ? "#374151" : "#d1d5db",
                      transition: "0.15s",
                    }}
                  >
                    ↪ Переместить{" "}
                    {selectedCards.size > 0 ? `(${selectedCards.size})` : ""}
                  </button>
                </>
              )}
              {selectMode && (
                <button
                  onClick={deleteSelectedCards}
                  disabled={selectedCards.size === 0}
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
                flex: 1,
                overflow: "auto",
                minHeight: 0,
                padding: "2px 4px 4px 6px",
              }}
            >
              {(() => {
                const colEntries = Object.entries(board).filter(
                  ([k]) => k !== "_meta",
                );

                return colEntries.map(([key, column]) => {
                  return (
                  <Column
                    key={key}
                    columnKey={key}
                    title={column.title}
                    selectMode={selectMode}
                    isColumnDragging={activeColumn !== null}
                    isEditingTitle={editingColumnKey === key}
                    onStartEditTitle={() => setEditingColumnKey(key)}
                    onRenameSubmit={(newTitle) => {
                      renameColumn(key, newTitle);
                      setEditingColumnKey(null);
                    }}
                    onRenameCancel={() => setEditingColumnKey(null)}
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
                      <button
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setColumnMenu({
                            columnKey: key,
                            x: rect.right,
                            y: rect.bottom,
                          });
                        }}
                        style={{
                          border: "none",
                          background: "transparent",
                          color: "#9ca3af",
                          cursor: "pointer",
                          fontSize: "16px",
                          padding: "2px 6px",
                        }}
                      >
                        ⋮
                      </button>
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
                          onToggleComplete={() =>
                            toggleCardCompleted(key, card.id)
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
                          onMenuOpen={({ x, y }) =>
                            setCardMenu({ columnKey: key, cardId: card.id, x, y })
                          }
                          isEditing={editingCardId === card.id}
                          onRenameSubmit={(newText) => {
                            renameCard(key, card.id, newText);
                            setEditingCardId(null);
                          }}
                          onRenameCancel={() => setEditingCardId(null)}
                        />
                      ))}
                    </SortableContext>
                  </Column>
                  );
                });
              })()}
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

        
        {selectedSticker && (() => {
  const custom = allStickers.find(s => s.id === selectedSticker.sticker.id);
  const isCustom = !!custom;
  const stickerDef = custom || selectedSticker.sticker;
  const type = isCustom ? custom.type : selectedSticker.sticker.id;

  return (
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
          {stickerDef.icon} {stickerDef.text}
        </div>

        {/* DEADLINE */}
        {type === "deadline" && (() => {
          const val = selectedSticker.sticker.value || "";
          const parts = val.split("-");
          const yyyy = parts[0] || "";
          const mm = parts[1] || "";
          const dd = parts[2] || "";
          let localDD = dd, localMM = mm, localYYYY = yyyy;
          return (
            <div style={{ marginBottom: "8px" }}>
              <div style={{ display: "flex", gap: "6px", alignItems: "center", marginBottom: "8px" }}>
                <input key={"dd-" + val} defaultValue={dd} maxLength={2} placeholder="ДД"
                  onChange={(e) => localDD = e.target.value}
                  style={{ ...input, width: "56px", minWidth: "56px", margin: 0, textAlign: "center" }} />
                <span style={{ color: "#9ca3af" }}>/</span>
                <input key={"mm-" + val} defaultValue={mm} maxLength={2} placeholder="ММ"
                  onChange={(e) => localMM = e.target.value}
                  style={{ ...input, width: "56px", minWidth: "56px", margin: 0, textAlign: "center" }} />
                <span style={{ color: "#9ca3af" }}>/</span>
                <input key={"yyyy-" + val} defaultValue={yyyy} maxLength={4} placeholder="ГГГГ"
                  onChange={(e) => localYYYY = e.target.value}
                  style={{ ...input, width: "76px", minWidth: "76px", margin: 0, textAlign: "center" }} />
                <button onMouseDown={(e) => e.stopPropagation()} onClick={() => setShowDatePicker(true)}
                  style={{ width: "36px", height: "38px", borderRadius: "8px", border: "1.5px solid #e5e7eb", background: "#f9fafb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", cursor: "pointer", flexShrink: 0 }}>
                  📅
                </button>
              </div>
              <button onClick={() => {
                const d = localDD.padStart(2, "0");
                const mo = localMM.padStart(2, "0");
                const y = localYYYY;
                if (y.length === 4 && mo.length === 2 && d.length === 2) {
                  updateStickerValue(`${y}-${mo}-${d}`, true);
                }
              }} style={{ ...btn, marginTop: 0 }}>Сохранить дату</button>
              {val && <div style={{ fontSize: "11px", color: "#9ca3af", marginTop: "6px" }}>Выбрано: {dd}/{mm}/{yyyy}</div>}
            </div>
          );
        })()}

        {showDatePicker && (
          <DatePickerModal
            zIndex={5000}
            value={type === "deadline" ? selectedSticker.sticker.value || "" : ""}
            onSelect={(dateStr) => { updateStickerValue(dateStr); setShowDatePicker(false); }}
            onClose={() => setShowDatePicker(false)}
          />
        )}

        {showDateRangePicker && type === "daterange" && (
          <DatePickerModal
            zIndex={5000}
            value={selectedSticker.sticker.value?.[showDateRangePicker] || ""}
            onSelect={(dateStr) => {
              const cur = selectedSticker.sticker.value || {};
              updateStickerValue({ ...cur, [showDateRangePicker]: dateStr });
              setShowDateRangePicker(null);
            }}
            onClose={() => setShowDateRangePicker(null)}
          />
        )}

        {/* EXECUTOR */}
        {type === "executor" && (
          <select
            value={selectedSticker.sticker.value || ""}
            onChange={(e) => updateStickerValue(e.target.value, true)}
            style={{ ...input, marginBottom: "4px", cursor: "pointer" }}
          >
            <option value="" disabled>Выберите исполнителя</option>
            {(members || []).map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        )}

        {/* PRIORITY */}
        {type === "priority" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "4px" }}>
            {[
              { label: "Неважно", color: "#9ca3af" },
              { label: "Нормально", color: "#22c55e" },
              { label: "Важно", color: "#eab308" },
              { label: "Срочно", color: "#ef4444" },
            ].map(({ label, color }) => (
              <button
                key={label}
                onClick={() => updateStickerValue(label, true)}
                style={{
                  padding: "7px 12px",
                  border: `2px solid ${color}`,
                  borderRadius: "8px",
                  background: selectedSticker.sticker.value === label ? color : "white",
                  color: selectedSticker.sticker.value === label ? "white" : color,
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

        {/* STATES (кастомный) */}
        {isCustom && custom.type === "states" && (() => {
  const states = custom.states || [];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "4px" }}>
      {states.map(({ label, color }) => (
        <button
          key={label}
          onClick={() => updateStickerValue(label, true)}
          style={{
            padding: "7px 12px",
            border: `2px solid ${color}`,
            borderRadius: "8px",
            background: selectedSticker.sticker.value === label ? color : "white",
            color: selectedSticker.sticker.value === label ? getTextColorForBackground(color) : color,
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
  );
})()}

        {/* DATERANGE (кастомный) */}
        {isCustom && custom.type === "daterange" && (() => {
          let value = selectedSticker.sticker.value || {};
          if (typeof value === 'string') {
            try { value = JSON.parse(value); } catch (e) { value = {}; }
          }
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "4px" }}>
              {[
                { key: "from", label: "Начало" },
                { key: "to", label: "Конец" },
              ].map(({ key, label }) => {
                const val = value?.[key] || "";
                return (
                  <div key={key}>
                    <label style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px", display: "block" }}>{label}</label>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <div style={{ flex: 1, padding: "9px 12px", borderRadius: "8px", border: "1.5px solid #e5e7eb", background: "#f9fafb", fontSize: "14px", color: val ? "#111827" : "#9ca3af" }}>
                        {val ? val.split("-").reverse().join(".") : "Не выбрано"}
                      </div>
                      <button onClick={() => setShowDateRangePicker(key)}
                        style={{ width: "38px", height: "38px", borderRadius: "8px", flexShrink: 0, border: "1.5px solid #e5e7eb", background: "#f9fafb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", cursor: "pointer" }}>
                        📅
                      </button>
                      {val && (
                        <button onClick={() => {
                          const cur = selectedSticker.sticker.value || {};
                          updateStickerValue({ ...cur, [key]: "" });
                        }} style={{ width: "38px", height: "38px", borderRadius: "8px", flexShrink: 0, border: "1.5px solid #fca5a5", background: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", cursor: "pointer", color: "#ef4444" }}>
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* TEXT (кастомный) */}
        {isCustom && custom.type === "text" && (
          <input
            type="text"
            defaultValue={selectedSticker.sticker.value || ""}
            placeholder="Введите текст..."
            onBlur={(e) => updateStickerValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") updateStickerValue(e.target.value, true); }}
            style={{ ...input, marginBottom: "4px" }}
          />
        )}

        {/* NUMBER (кастомный) */}
        {isCustom && custom.type === "number" && (
          <input
            type="number"
            defaultValue={selectedSticker.sticker.value || ""}
            placeholder="Введите число..."
            onBlur={(e) => updateStickerValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") updateStickerValue(e.target.value, true); }}
            style={{ ...input, marginBottom: "4px" }}
          />
        )}

        <button
          onClick={deleteSticker}
          style={{ ...btn, background: "white", color: "#ef4444", border: "1.5px solid #fca5a5", marginTop: "8px" }}
        >
          Удалить стикер
        </button>
      </div>
    </>
  );
})()}
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
            onClick={async () => {
              if (!newStickerName.trim()) return;
              
              const typeIcons = {
                states: "🏷️",
                daterange: "📆",
                text: "📝",
                number: "🔢"
              };
              
              const stickerData = {
                type: newStickerType,
                icon: typeIcons[newStickerType],
                text: newStickerName.trim(),
                states: newStickerType === "states" 
                  ? newStickerStates.filter(s => s.label.trim()) 
                  : undefined,
                value: newStickerType === "daterange" ? {} : undefined,
              };
              
              // Оптимистичное добавление
              const tempId = `custom-temp-${Date.now()}`;
              const newSticker = {
                id: tempId,
                ...stickerData,
                _pending: true
              };
              
              setCustomStickers(prev => [...prev, newSticker]);
              
              // Закрываем модалку
              setShowCreateSticker(false);
              setNewStickerType(null);
              setNewStickerName("");
              setNewStickerStates([{ label: "Состояние 1", color: "#6366f1" }]);
              
              // Отправляем на сервер
              try {
                console.log("📤 Отправляем на сервер:", stickerData);
                const result = await apiCreateCustomSticker(boardId, stickerData);
                console.log("📥 Ответ сервера:", result);
                const saved = result.sticker;
                
                // Заменяем временный на реальный
                setCustomStickers(prev => 
                  prev.map(s => 
                    s.id === tempId 
                      ? {
                          id: `custom-${saved.id}`,
                          _dbId: saved.id,
                          type: saved.type,
                          icon: saved.icon,
                          text: saved.text,
                          states: saved.states || undefined,
                          hidden: saved.hidden
                        }
                      : s
                  )
                );
              } catch (err) {
                console.error("Не удалось создать стикер:", err);
                // Откатываем
                setCustomStickers(prev => prev.filter(s => s.id !== tempId));
              }
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

        {/* Контекстное меню карточки */}
        {cardMenu && (
          <>
            <div
              onMouseDown={(e) => e.stopPropagation()}
              style={{ position: "fixed", inset: 0, zIndex: 999 }}
              onClick={() => setCardMenu(null)}
            />
            <div
              style={{
                position: "fixed",
                left: Math.max(8, cardMenu.x - 170),
                top: cardMenu.y + 4,
                background: "white",
                borderRadius: "10px",
                padding: "6px",
                minWidth: "170px",
                boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
                zIndex: 1000,
                display: "flex",
                flexDirection: "column",
                gap: "2px",
                animation: "stickerPopup 0.15s ease-out",
              }}
            >
              <button
                style={menuItem}
                onClick={() => {
                  setEditingCardId(cardMenu.cardId);
                  setCardMenu(null);
                }}
              >
                ✎ Переименовать
              </button>
              <button
                style={menuItem}
                onClick={() => {
                  duplicateCard(cardMenu.columnKey, cardMenu.cardId);
                  setCardMenu(null);
                }}
              >
                ⧉ Дублировать
              </button>
              <button
                style={menuItem}
                onClick={() => {
                  setMoveModal({
                    type: "card",
                    columnKey: cardMenu.columnKey,
                    cardId: cardMenu.cardId,
                  });
                  setCardMenu(null);
                }}
              >
                ↪ Переместить
              </button>
              <button
                style={{ ...menuItem, color: "#ef4444" }}
                onClick={() => {
                  deleteCard(cardMenu.columnKey, cardMenu.cardId);
                  setCardMenu(null);
                }}
              >
                ✕ Удалить
              </button>
            </div>
          </>
        )}

        {/* Контекстное меню колонки */}
        {columnMenu && (
          <>
            <div
              onMouseDown={(e) => e.stopPropagation()}
              style={{ position: "fixed", inset: 0, zIndex: 999 }}
              onClick={() => setColumnMenu(null)}
            />
            <div
              style={{
                position: "fixed",
                left: Math.max(8, columnMenu.x - 170),
                top: columnMenu.y + 4,
                background: "white",
                borderRadius: "10px",
                padding: "6px",
                minWidth: "170px",
                boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
                zIndex: 1000,
                display: "flex",
                flexDirection: "column",
                gap: "2px",
                animation: "stickerPopup 0.15s ease-out",
              }}
            >
              <button
                style={menuItem}
                onClick={() => {
                  setEditingColumnKey(columnMenu.columnKey);
                  setColumnMenu(null);
                }}
              >
                ✎ Переименовать
              </button>
              <button
                style={menuItem}
                onClick={() => {
                  duplicateColumn(columnMenu.columnKey);
                  setColumnMenu(null);
                }}
              >
                ⧉ Дублировать
              </button>
              <button
                style={menuItem}
                onClick={() => {
                  setMoveModal({
                    type: "column",
                    columnKey: columnMenu.columnKey,
                  });
                  setColumnMenu(null);
                }}
              >
                ↪ Переместить
              </button>
              <button
                style={{ ...menuItem, color: "#ef4444" }}
                onClick={() => {
                  deleteColumn(columnMenu.columnKey);
                  setColumnMenu(null);
                }}
              >
                ✕ Удалить
              </button>
            </div>
          </>
        )}

        {/* Модалка перемещения карточки/колонки на другую доску */}
        {moveModal &&
          (() => {
            const boardIds = Object.keys(boards);
            const targetBoardId = moveTargetBoard ?? activeBoardId;
            const targetBoardData = boards[targetBoardId]?.data || {};
            const targetColumnKeys = Object.keys(targetBoardData).filter(
              (k) => k !== "_meta",
            );

            return (
              <div onClick={() => setMoveModal(null)} style={modalBg}>
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{ ...modalBox, width: "340px" }}
                >
                  <h2 style={title}>
                    {moveModal.type === "card"
                      ? "Переместить задачу"
                      : moveModal.type === "cards"
                        ? `Переместить выбранные (${selectedCards.size})`
                        : "Переместить колонку"}
                  </h2>

                  <label
                    style={{
                      fontSize: "13px",
                      fontWeight: "600",
                      color: "#374151",
                    }}
                  >
                    Доска
                  </label>
                  <select
                    value={targetBoardId}
                    onChange={(e) => {
                      setMoveTargetBoard(e.target.value);
                      setMoveTargetColumn(null);
                    }}
                    style={input}
                  >
                    {boardIds.map((id) => (
                      <option key={id} value={id}>
                        {boards[id].name}
                        {id === activeBoardId ? " (текущая)" : ""}
                      </option>
                    ))}
                  </select>

                  {moveModal.type !== "column" && (
                    <>
                      <label
                        style={{
                          fontSize: "13px",
                          fontWeight: "600",
                          color: "#374151",
                        }}
                      >
                        Колонка
                      </label>
                      <select
                        value={moveTargetColumn ?? ""}
                        onChange={(e) => setMoveTargetColumn(e.target.value)}
                        style={input}
                      >
                        <option value="" disabled>
                          Выберите колонку
                        </option>
                        {targetColumnKeys.map((k) => (
                          <option key={k} value={k}>
                            {targetBoardData[k].title}
                          </option>
                        ))}
                      </select>
                    </>
                  )}

                  <button
                    onClick={() => {
                      if (moveModal.type === "card") {
                        if (!moveTargetColumn) return;
                        moveCardToBoard(
                          moveModal.columnKey,
                          moveModal.cardId,
                          targetBoardId,
                          moveTargetColumn,
                        );
                      } else if (moveModal.type === "cards") {
                        if (!moveTargetColumn) return;
                        moveSelectedCards(targetBoardId, moveTargetColumn);
                      } else {
                        moveColumnToBoard(moveModal.columnKey, targetBoardId);
                      }
                      setMoveModal(null);
                      setMoveTargetBoard(null);
                      setMoveTargetColumn(null);
                    }}
                    disabled={
                      moveModal.type !== "column" && !moveTargetColumn
                    }
                    style={{
                      ...btn,
                      opacity:
                        moveModal.type !== "column" && !moveTargetColumn
                          ? 0.5
                          : 1,
                      cursor:
                        moveModal.type !== "column" && !moveTargetColumn
                          ? "not-allowed"
                          : "pointer",
                    }}
                  >
                    Переместить
                  </button>
                </div>
              </div>
            );
          })()}
      </div>

      <DragOverlay
        modifiers={activeColumn ? [restrictToHorizontalAxis] : []}
      >
        {activeCard ? (
          <div
            style={{
              background: activeCard.completed ? "#e5e7eb" : "#f9fafb",
              padding: "10px",
              marginBottom: "8px",
              borderRadius: "6px",
              border: (() => {
                const p = activeCard.stickers?.find((s) => s.id === "priority");
                const color = p?.value ? PRIORITY_COLORS[p.value]?.border : null;
                return color ? `2px solid ${color}` : "1px solid #e5e7eb";
              })(),
              wordBreak: "break-word",
              whiteSpace: "normal",
              width: "256px",
              boxSizing: "border-box",
              cursor: "grabbing",
              boxShadow: "0 8px 20px rgba(0,0,0,0.13)",
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
            }}
          >
            {/* Строка: кружок + текст + кнопка меню */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
              <div style={{
                width: "18px", height: "18px", borderRadius: "50%", flexShrink: 0,
                border: `2px solid ${activeCard.completed ? "#22c55e" : "#d1d5db"}`,
                background: activeCard.completed ? "#22c55e" : "white",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{ color: activeCard.completed ? "white" : "#9ca3af", fontSize: "11px", lineHeight: 1 }}>✓</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>{activeCard.text}</div>
              <button style={{
                border: "none", background: "#f3f4f6", color: "#6b7280",
                fontSize: "18px", width: "32px", height: "32px", minWidth: "32px",
                borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "default",
              }}>⋮</button>
            </div>
            {/* Стикеры */}
            {activeCard.stickers?.length > 0 && (
              <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginTop: "8px" }}>
                {activeCard.stickers.map((sticker, index) => (
                  <StickerChip key={index} sticker={sticker} index={index} cardId={activeCard.id} setSelectedSticker={() => {}} allStickers={allStickers} />
                ))}
              </div>
            )}
            {/* Резервное место под кнопку стикера */}
            <div style={{ marginTop: "6px", height: "20px" }} />
          </div>
        ) : activeColumn && board[activeColumn] ? (
          <div
            style={{
              width: "280px",
              minWidth: "280px",
              minHeight: "120px",
              height: "100%",
              background: "white",
              padding: "12px",
              borderRadius: "10px",
              boxShadow: "0 16px 40px rgba(0,0,0,0.22)",
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              cursor: "grabbing",
              border: "2px solid transparent",
              transform: "rotate(2deg)",
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
            }}
          >
            {/* HEADER */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "4px", flex: 1, minWidth: 0 }}>
                <h3 style={{ margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
                  {board[activeColumn].title}
                </h3>
              </div>
              <div style={{ display: "flex", gap: "5px" }}>
                <button style={{ border: "none", background: "transparent", color: "#9ca3af", fontSize: "16px", padding: "2px 6px", cursor: "default" }}>⋮</button>
              </div>
            </div>

            {/* КАРТОЧКИ */}
            <div style={{ overflowY: "hidden", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
              {board[activeColumn].cards.length === 0 ? (
                <div style={{
                  flexShrink: 0,
                  minHeight: "56px",
                  padding: "10px",
                  border: "2px dashed #d1d5db",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#9ca3af",
                  fontSize: "14px",
                  background: "transparent",
                }}>
                  Перетащите карточку сюда
                </div>
              ) : (
                board[activeColumn].cards.map((card) => (
                  <div
                    key={card.id}
                    style={{
                      background: card.completed ? "#e5e7eb" : "#f9fafb",
                      padding: "10px",
                      marginBottom: "8px",
                      borderRadius: "6px",
                      border: (() => {
                        const p = card.stickers?.find((s) => s.id === "priority");
                        const color = p?.value ? PRIORITY_COLORS[p.value]?.border : null;
                        return color ? `2px solid ${color}` : "1px solid #e5e7eb";
                      })(),
                      wordBreak: "break-word",
                      whiteSpace: "normal",
                      flexShrink: 0,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
                      <div style={{
                        width: "18px", height: "18px", borderRadius: "50%", flexShrink: 0,
                        border: `2px solid ${card.completed ? "#22c55e" : "#d1d5db"}`,
                        background: card.completed ? "#22c55e" : "white",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <span style={{ color: card.completed ? "white" : "#9ca3af", fontSize: "11px", lineHeight: 1 }}>✓</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>{card.text}</div>
                      <button style={{
                        border: "none", background: "#f3f4f6", color: "#6b7280",
                        fontSize: "18px", width: "32px", height: "32px", minWidth: "32px",
                        borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: "default",
                      }}>⋮</button>
                    </div>
                    {card.stickers?.length > 0 && (
                      <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginTop: "8px" }}>
                        {card.stickers.map((sticker, index) => (
                          <StickerChip key={index} sticker={sticker} index={index} cardId={card.id} setSelectedSticker={() => {}} />
                        ))}
                      </div>
                    )}
                    <div style={{ marginTop: "6px", height: "20px" }} />
                  </div>
                ))
              )}
            </div>

            {/* FOOTER — кнопка добавить */}
            <div style={{ marginTop: "10px" }}>
              <button style={{
                width: "100%",
                padding: "8px",
                border: "none",
                borderRadius: "6px",
                background: "#f3f4f6",
                color: "#6b7280",
                height: "40px",
                cursor: "default",
                fontSize: "14px",
                fontFamily: "inherit",
              }}>
                + Добавить
              </button>
            </div>
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
  onClick={async () => {
    const { id, _dbId, ...patch } = editingSticker;
    
    // Оптимистичное обновление
    setCustomStickers(prev => 
      prev.map(s => s.id === id ? editingSticker : s)
    );
    setEditingSticker(null);
    
    try {
      await apiUpdateCustomSticker(_dbId, {
        icon: patch.icon,
        text: patch.text,
        states: patch.states
      });
    } catch (err) {
      console.error("Не удалось обновить стикер:", err);
      // Откатываем - загружаем заново
      const data = await apiGetCustomStickers(boardId);
      setCustomStickers(data.stickers.map(s => ({
        id: `custom-${s.id}`,
        _dbId: s.id,
        type: s.type,
        icon: s.icon,
        text: s.text,
        states: s.states || undefined,
        hidden: s.hidden
      })));
    }
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
  onClick={async () => {
    const isHidden = hiddenStickers.has(sticker.id);
    const dbId = sticker._dbId;
    
    // Оптимистичное обновление
    setHiddenStickers(prev => {
      const next = new Set(prev);
      if (isHidden) next.delete(sticker.id);
      else next.add(sticker.id);
      return next;
    });
    
    try {
      await apiUpdateCustomSticker(dbId, { hidden: !isHidden });
    } catch (err) {
      console.error("Не удалось обновить видимость:", err);
      // Откатываем
      setHiddenStickers(prev => {
        const next = new Set(prev);
        if (isHidden) next.add(sticker.id);
        else next.delete(sticker.id);
        return next;
      });
    }
  }}
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
                              onClick={async () => {
                                // ... код удаления (без изменений)
                              }}
                              style={{
                                border: "1.5px solid #fca5a5",
                                borderRadius: "6px",
                                background: "white",
                                cursor: "pointer",
                                color: "#ef4444",
                                fontSize: "13px",
                                padding: "4px 8px",
                                // Добавляем hover-эффект (опционально)
                                transition: "0.15s",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = "#fee2e2";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = "white";
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
    isColumnDragging,
    isColSelected,
    onColCheck,
    isEditingTitle,
    onStartEditTitle,
    onRenameSubmit,
    onRenameCancel,
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

    const [titleHovered, setTitleHovered] = useState(false);

    return (
      <div
        ref={setSortableRef}
        style={{
          transform: CSS.Transform.toString(transform),
          transition: isColumnDragging ? undefined : transition,
          width: "280px",
          minWidth: "280px",
          flexShrink: 0,
          height: isDragging ? "100%" : "100%",
          minHeight: "120px",
          display: "flex",
          flexDirection: "column",
          background: isDragging ? "transparent" : "white",
          padding: isDragging ? "0" : "12px",
          borderRadius: "10px",
          boxShadow: isDragging ? "none" : "0 2px 10px rgba(0,0,0,0.1)",
          boxSizing: "border-box",
          border: isDragging ? "2.5px dashed #93c5fd" : "2px solid transparent",
          zIndex: isDragging ? 10 : "auto",
        }}
      >
        {isDragging ? null : (
        <>
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
            onMouseEnter={() => setTitleHovered(true)}
            onMouseLeave={() => setTitleHovered(false)}
            {...(!isEditingTitle ? attributes : {})}
            {...(!isEditingTitle ? listeners : {})}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              flex: 1,
              minWidth: 0,
              cursor: isEditingTitle ? "default" : "grab",
              userSelect: "none",
            }}
          >
            {isEditingTitle ? (
              <input
                autoFocus
                defaultValue={title}
                maxLength={20}
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                onBlur={(e) => onRenameSubmit(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onRenameSubmit(e.currentTarget.value);
                  } else if (e.key === "Escape") {
                    onRenameCancel();
                  }
                }}
                style={{
                  flex: 1,
                  minWidth: 0,
                  margin: 0,
                  fontSize: "1.17em",
                  fontWeight: "700",
                  fontFamily: "inherit",
                  color: "inherit",
                  padding: 0,
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  boxSizing: "border-box",
                }}
              />
            ) : (
              <>
                <h3
                  style={{
                    margin: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    minWidth: 0,
                  }}
                >
                  {title}
                </h3>
                {titleHovered && (
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      onStartEditTitle();
                    }}
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "#9ca3af",
                      cursor: "pointer",
                      fontSize: "14px",
                      flexShrink: 0,
                      padding: "2px",
                    }}
                  >
                    ✎
                  </button>
                )}
              </>
            )}
          </div>

          <div style={{ display: "flex", gap: "5px" }}>{headerButtons}</div>
        </div>

        {/* СКРОЛЛ ТОЛЬКО ДЛЯ КАРТОЧЕК */}
        <div
          id={`cards-${columnKey}`}
          style={{
            overflowY: "auto",
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {children}

          {isEmpty && (
            <div
              ref={setDropRef}
              style={{
                flexShrink: 0,
                minHeight: "56px",
                padding: "10px",
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
        </>
        )}
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

  function StickerChip({ sticker, index, cardId, setSelectedSticker, allStickers }) {
    let custom = null;
  if (sticker.id && sticker.id.startsWith('custom-')) {
    custom = allStickers.find(s => s.id === sticker.id);
  }
  const icon = custom ? custom.icon : sticker.icon;
    return (
      <div
        key={index}
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
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
            if (sticker.id && sticker.id.startsWith('custom-')) {
              const custom = allStickers.find(s => s.id === sticker.id);
              if (custom && custom.type === 'states' && sticker.value) {
                const states = custom.states || [];
                const found = states.find(s => s.label === sticker.value);
                if (found) return found.color;
              }
              return "#f3f4f6";
            }
            if (sticker.type === "states" && sticker.value) {
              try {
                let states = sticker.states;
                if (typeof states === 'string') {
                  states = JSON.parse(states);
                }
                if (Array.isArray(states)) {
                  const s = states.find(st => st.label === sticker.value);
                  if (s) return s.color;
                }
              } catch (e) {}
              return "#f3f4f6";
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
        {icon}
        {sticker.value !== undefined && sticker.value !== "" && (() => {
  let displayValue = sticker.value;
  let custom = null;  // ← ДОБАВИТЬ ЭТУ СТРОКУ
  if (sticker.id && sticker.id.startsWith('custom-')) {
    custom = allStickers.find(s => s.id === sticker.id);
  }
  // Для daterange парсим JSON
  // Для daterange парсим JSON, используя custom
if (custom && custom.type === 'daterange') {
  try {
    const parsed = typeof sticker.value === 'string' ? JSON.parse(sticker.value) : sticker.value;
    if (parsed && typeof parsed === 'object') {
      const from = parsed.from || "?";
      const to = parsed.to || "?";
      displayValue = `${from} — ${to}`;
    }
  } catch (e) {
    // Если не JSON, оставляем как есть
  }
}

let stateColor = null;
if (custom && custom.type === 'states' && sticker.value) {
  try {
    let states = custom.states;
    if (typeof states === 'string') {
      states = JSON.parse(states);
    }
    if (Array.isArray(states)) {
      const found = states.find(s => s.label === sticker.value);
      if (found) {
        stateColor = getTextColorForBackground(found.color); // ← динамический цвет
      }
    }
  } catch (e) {}
}
  
  return (
    <span
      style={{
        marginLeft: "4px",
        color: stateColor || (() => {
          if (sticker.id !== "deadline" || typeof sticker.value !== "string") return "inherit";
          const parts = sticker.value.split("-");
          if (parts.length !== 3) return "inherit";
          const deadline = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          return deadline < today ? "#ef4444" : "inherit";
        })(),
        fontWeight: (() => {
          if (sticker.id !== "deadline" || typeof sticker.value !== "string") return "normal";
          const parts = sticker.value.split("-");
          if (parts.length !== 3) return "normal";
          const deadline = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          return deadline < today ? "600" : "normal";
        })(),
      }}
    >
      {String(displayValue)}
    </span>
  );
})()}
      </div>
    );
  }

  function Card({
    card,
    onMenuOpen,
    stickerHoverMode,
    setSelectedSticker,
    hoveredStickerZone,
    onAddSticker,
    allStickers,
    selectMode,
    isSelected,
    onSelect,
    onToggleComplete,
    isEditing,
    onRenameSubmit,
    onRenameCancel,
  }) {
    const [hovered, setHovered] = useState(false);
    const pointerMoved = useRef(false);
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
      background: card.completed
        ? "#e5e7eb"
        : isDropTarget
          ? "#eff6ff"
          : "#f9fafb",
      padding: "10px",
      marginBottom: "8px",
      borderRadius: "6px",
      border: (() => {
        if (isSelected) return "3px solid #2563eb";
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
        style={{ ...style, cursor: selectMode ? "pointer" : "grab" }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        {...attributes}
        {...listeners}
        onMouseDown={() => {
          pointerMoved.current = false;
        }}
        onMouseMove={() => {
          pointerMoved.current = true;
        }}
        onMouseUp={() => {
          if (selectMode && !pointerMoved.current) {
            onSelect();
          }
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "10px",
          }}
        >
          {/* Кружок завершённости */}
          <div
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onToggleComplete();
            }}
            style={{
              width: "18px",
              height: "18px",
              borderRadius: "50%",
              flexShrink: 0,
              border: `2px solid ${card.completed ? "#22c55e" : "#d1d5db"}`,
              background: card.completed ? "#22c55e" : "white",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                color: card.completed ? "white" : "#9ca3af",
                fontSize: "11px",
                lineHeight: 1,
              }}
            >
              ✓
            </span>
          </div>

          <div
            style={{
              flex: 1,
              userSelect: "none",
              minWidth: 0,
            }}
          >
            {isEditing ? (
              <input
                autoFocus
                defaultValue={card.text}
                maxLength={100}
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onMouseUp={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                onBlur={(e) => onRenameSubmit(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onRenameSubmit(e.currentTarget.value);
                  } else if (e.key === "Escape") {
                    onRenameCancel();
                  }
                }}
                style={{
                  display: "block",
                  width: "100%",
                  margin: 0,
                  padding: "1px 4px",
                  marginLeft: "-4px",
                  fontSize: "inherit",
                  fontFamily: "inherit",
                  color: "inherit",
                  lineHeight: "inherit",
                  borderRadius: "4px",
                  border: "1px solid #93c5fd",
                  outline: "none",
                  background: "white",
                  boxSizing: "border-box",
                }}
              />
            ) : (
              <div>{card.text}</div>
            )}
          </div>

          <button
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              const rect = e.currentTarget.getBoundingClientRect();
              onMenuOpen({ x: rect.right, y: rect.bottom });
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
                allStickers={allStickers}
              />
            ))}
          </div>
        )}

        {/* + кнопка добавления стикера (место зарезервировано всегда) */}
        <div
          style={{
            marginTop: "6px",
            height: "20px",
            display: "flex",
            justifyContent: "flex-start",
          }}
        >
          {hovered && !isDragging && !stickerHoverMode && !selectMode && (
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onMouseUp={(e) => e.stopPropagation()}
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
          )}
        </div>
      </div>
    );
  }
}
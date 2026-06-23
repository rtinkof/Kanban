/* Полный обновлённый src/board.jsx */
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
import DatePickerModal from "./DatePickerModal.jsx";
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

function hashToHsl(id) {
  let h = 0;
  const s = 68;
  const l = 55;
  const str = String(id ?? "");
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) % 360;
  }
  return `hsl(${h}deg ${s}% ${l}%)`;
}

function getStickerKey(sticker, index) {
  return sticker?._dbId ?? sticker?.id ?? index;
}

function StickerChip({ sticker, index, cardId, setSelectedSticker }) {
  const bgColor = sticker?.color || hashToHsl(sticker?.id ?? sticker?._dbId ?? index);
  const valuePresent = sticker?.value !== undefined && sticker?.value !== null && String(sticker.value) !== "";
  const displayText =
    sticker?.type === "daterange" && typeof sticker?.value === "object"
      ? `${sticker.value.from || "?"} — ${sticker.value.to || "?"}`
      : valuePresent
      ? String(sticker.value)
      : sticker?.text ?? sticker?.type ?? "";
  const textColor = STICKER_STYLES[sticker?.id]?.color || "#ffffff";

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        if (typeof setSelectedSticker === "function") {
          const rect = e.currentTarget.getBoundingClientRect();
          setSelectedSticker({
            stickerIndex: index,
            cardId,
            sticker,
            x: rect.left,
            y: rect.bottom + 8,
          });
        }
      }}
      className="card-sticker"
      title={displayText || sticker?.text || sticker?.type}
      style={{
        background: bgColor,
        color: textColor,
        padding: "2px 8px",
        borderRadius: 6,
        fontSize: 12,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        cursor: "pointer",
        fontWeight: 500,
        maxWidth: 220,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        boxSizing: "border-box",
      }}
    >
      <span style={{ marginRight: 4 }}>{sticker?.icon ?? "🏷️"}</span>
      {displayText && (
        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
          {displayText}
        </span>
      )}
    </div>
  );
}

function Card({ card, selectMode, isSelected, onSelect, onToggleComplete, stickerHoverMode, hoveredStickerZone, setSelectedSticker, allStickers, onAddSticker, onMenuOpen, isEditing, onRenameSubmit, onRenameCancel }) {
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

  const isDropTarget = stickerHoverMode && hoveredStickerZone === "card-drop-" + card.id;

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
      onMouseDown={() => { pointerMoved.current = false; }}
      onMouseMove={() => { pointerMoved.current = true; }}
      onMouseUp={() => { if (selectMode && !pointerMoved.current) onSelect(); }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
        {selectMode && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onSelect}
            style={{ width: "16px", height: "16px", cursor: "pointer" }}
            onClick={(e) => e.stopPropagation()}
          />
        )}
        <div
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onToggleComplete(); }}
          style={{
            width: "18px", height: "18px", borderRadius: "50%", flexShrink: 0,
            border: `2px solid ${card.completed ? "#22c55e" : "#d1d5db"}`,
            background: card.completed ? "#22c55e" : "white",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <span style={{ color: card.completed ? "white" : "#9ca3af", fontSize: "11px", lineHeight: 1 }}>✓</span>
        </div>

        <div style={{ flex: 1, userSelect: "none", minWidth: 0 }}>
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
                if (e.key === "Enter") { e.preventDefault(); onRenameSubmit(e.currentTarget.value); }
                else if (e.key === "Escape") onRenameCancel();
              }}
              style={{
                display: "block", width: "100%", margin: 0, padding: "1px 4px", marginLeft: "-4px",
                fontSize: "inherit", fontFamily: "inherit", color: "inherit", lineHeight: "inherit",
                borderRadius: "4px", border: "1px solid #93c5fd", outline: "none",
                background: "white", boxSizing: "border-box",
              }}
            />
          ) : (
            <div style={{ textDecoration: card.completed ? "line-through" : "none", color: card.completed ? "#9ca3af" : "#111827" }}>
              {card.text}
            </div>
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
            border: "none", background: "#f3f4f6", cursor: "pointer", color: "#6b7280",
            fontSize: "18px", width: "32px", height: "32px", minWidth: "32px",
            borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >⋮</button>
      </div>

      {card.stickers?.length > 0 && (
        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginTop: "8px" }}>
          {card.stickers.map((st, i) => (
            <StickerChip key={getStickerKey(st, i)} sticker={st} index={i} cardId={card.id} setSelectedSticker={setSelectedSticker} />
          ))}
        </div>
      )}
      {!stickerHoverMode && (
        <button
          onClick={(e) => { e.stopPropagation(); const rect = e.currentTarget.getBoundingClientRect(); onAddSticker({ cardId: card.id, x: rect.left, y: rect.bottom }); }}
          style={{
            marginTop: "6px", width: "100%", padding: "4px", border: "1.5px dashed #d1d5db",
            borderRadius: "4px", background: "transparent", color: "#9ca3af", cursor: "pointer", fontSize: "11px",
          }}
        >
          + Стикер
        </button>
      )}
    </div>
  );
}

function Column({ columnKey, title, selectMode, isColumnDragging, isEditingTitle, onStartEditTitle, onRenameSubmit, onRenameCancel, isColSelected, onColCheck, headerButtons, isEmpty, footer, children }) {
  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: columnKey });

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
        height: "100%",
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            {selectMode && (
              <div
                onClick={onColCheck}
                style={{
                  width: "16px", height: "16px", borderRadius: "4px", marginRight: "8px", flexShrink: 0,
                  border: `2px solid ${isColSelected ? "#2563eb" : "#d1d5db"}`,
                  background: isColSelected ? "#2563eb" : "white",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                {isColSelected && <span style={{ color: "white", fontSize: "11px", lineHeight: 1 }}>✓</span>}
              </div>
            )}
            <div
              onMouseEnter={() => setTitleHovered(true)}
              onMouseLeave={() => setTitleHovered(false)}
              {...(!isEditingTitle ? attributes : {})}
              {...(!isEditingTitle ? listeners : {})}
              style={{
                display: "flex", alignItems: "center", gap: "4px",
                flex: 1, minWidth: 0,
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
                    if (e.key === "Enter") { e.preventDefault(); onRenameSubmit(e.currentTarget.value); }
                    else if (e.key === "Escape") onRenameCancel();
                  }}
                  style={{
                    flex: 1, minWidth: 0, margin: 0, fontSize: "1.17em", fontWeight: "700",
                    fontFamily: "inherit", color: "inherit", padding: 0,
                    border: "none", outline: "none", background: "transparent", boxSizing: "border-box",
                  }}
                />
              ) : (
                <>
                  <h3 style={{ margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
                    {title}
                  </h3>
                  {titleHovered && (
                    <button
                      onPointerDown={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => { e.stopPropagation(); onStartEditTitle(); }}
                      style={{
                        border: "none", background: "transparent", color: "#9ca3af",
                        cursor: "pointer", fontSize: "14px", flexShrink: 0, padding: "2px",
                      }}
                    >✎</button>
                  )}
                </>
              )}
            </div>
            <div style={{ display: "flex", gap: "5px" }}>{headerButtons}</div>
          </div>

          {/* КАРТОЧКИ */}
          <div
            id={`cards-${columnKey}`}
            style={{ overflowY: "auto", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}
          >
            {children}
            {isEmpty && (
              <div
                ref={setDropRef}
                style={{
                  flexShrink: 0, minHeight: "56px", padding: "10px",
                  border: `2px dashed ${isOver ? "#3b82f6" : "#d1d5db"}`,
                  borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center",
                  color: isOver ? "#3b82f6" : "#9ca3af", fontSize: "14px",
                  background: isOver ? "#eff6ff" : "transparent", transition: "0.2s",
                }}
              >
                Перетащите карточку сюда
              </div>
            )}
          </div>

          {footer && <div style={{ marginTop: "10px" }}>{footer}</div>}
        </>
      )}
    </div>
  );
}

export default function Board({ board, setBoard, boards, setBoards, activeBoardId, members }) {
  if (!board) {
    return <div style={{ padding: "20px", textAlign: "center", color: "#9ca3af" }}>Загрузка доски...</div>;
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
  const [cardMenu, setCardMenu] = useState(null);
  const [columnMenu, setColumnMenu] = useState(null);
  const [editingCardId, setEditingCardId] = useState(null);
  const [editingColumnKey, setEditingColumnKey] = useState(null);
  const [moveModal, setMoveModal] = useState(null);
  const [moveTargetBoard, setMoveTargetBoard] = useState(null);
  const [moveTargetColumn, setMoveTargetColumn] = useState(null);
  const [stickerValue, setStickerValue] = useState("");
  const [hoveredStickerZone, setHoveredStickerZone] = useState(null);
  const [showCreateSticker, setShowCreateSticker] = useState(false);
  const [newStickerType, setNewStickerType] = useState(null);
  const [newStickerName, setNewStickerName] = useState("");
  const [newStickerStates, setNewStickerStates] = useState([{ label: "Состояние 1", color: "#6366f1" }]);
  const [showStickerPicker, setShowStickerPicker] = useState(null);
  const [showStickerSettings, setShowStickerSettings] = useState(false);
  const [editingSticker, setEditingSticker] = useState(null);

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
    { id: "executor", icon: "👤", text: "Исполнитель" },
    { id: "deadline", icon: "📅", text: "Дедлайн" },
    { id: "priority", icon: "📊", text: "Приоритет" },
  ];

  const allStickers = [...stickerTemplates, ...customStickers];

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
    const style = document.createElement("style");
    style.innerHTML = `
    @keyframes stickerPopup {
      from {
        opacity: 0;
        transform: translateY(-8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
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

    setActiveCard(null);
    setActiveColumn(null);
    setActiveSticker(null);

    if (sticker) {
      setActiveSticker(sticker);
      setStickerHoverMode(true);
      return;
    }

    if (Object.keys(board).includes(activeId)) {
      setActiveColumn(activeId);
      return;
    }

    const column = findColumn(activeId);
    if (!column) return;

    const card = board[column].cards.find((c) => c.id === activeId);
    dragStartColumnRef.current = column;
    setActiveCard(card);
  }

  function handleDragEnd(event) {
    const { active, over } = event;

    const sticker = allStickers.find((s) => s.id === active.id);

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
        const stickerType = sticker.type || sticker.id;
        const defaultValue = sticker.value ?? "";

        apiAddSticker(cardDbId, { type: stickerType, value: defaultValue })
          .then(({ sticker: saved }) => {
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

    if (activeCol !== overCol) return;

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

    if (sticker) {
      if (String(over.id).startsWith("card-drop-")) {
        setHoveredStickerZone(over.id);
      } else {
        setHoveredStickerZone(null);
      }
      return;
    }

    if (
      Object.keys(board)
        .filter((k) => k !== "_meta")
        .includes(active.id)
    ) {
      return;
    }

    const activeCol = findColumn(active.id);
    if (!activeCol) return;

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

    setBoard((prev) => {
      const activeCards = [...prev[activeCol].cards];
      const overCards = [...prev[overCol].cards];

      const activeIndex = activeCards.findIndex((c) => c.id === active.id);
      if (activeIndex === -1) return prev;

      const [item] = activeCards.splice(activeIndex, 1);

      let overIndex = overCards.findIndex((c) => c.id === over.id);
      if (overIndex === -1) overIndex = overCards.length;

      overCards.splice(overIndex, 0, item);

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
        return !id.startsWith("card-drop-") && !id.startsWith("empty-");
      }
      return !id.startsWith("card-drop-");
    });

    if (isDraggingColumn) {
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

    setBoard((prev) => ({
      ...prev,
      [columnKey]: {
        ...prev[columnKey],
        cards: [...prev[columnKey].cards, newCard],
      },
    }));

    setNewText("");

    requestAnimationFrame(() => {
      const column = document.getElementById(`cards-${columnKey}`);
      if (column) {
        column.scrollTop = column.scrollHeight;
      }
    });

    const columnDbId = board[columnKey]?._dbId;
    if (!columnDbId) return;

    apiCreateCard(columnDbId, cardText)
      .then(({ card }) => {
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

  function duplicateSelectedCards() {
    if (selectedCards.size === 0) return;

    setBoard((prev) => {
      const next = { ...prev };
      let offset = 0;

      Object.keys(next)
        .filter((k) => k !== "_meta")
        .forEach((col) => {
          const cards = next[col].cards;
          const newCards = [];

          cards.forEach((card) => {
            newCards.push(card);

            if (selectedCards.has(card.id)) {
              newCards.push({
                ...card,
                id: (Date.now() + offset++).toString(),
                stickers: card.stickers
                  ? card.stickers.map((s) => ({ ...s }))
                  : card.stickers,
              });
            }
          });

          next[col] = { ...next[col], cards: newCards };
        });

      return next;
    });

    setSelectedCards(new Set());
  }

  function updateStickerValue(value, closeModal = false) {
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
      setBoard((prev) => ({
        ...prev,
        [columnKey]: removedColumn,
      }));
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
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
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
                      cursor: selectedCards.size > 0 ? "pointer" : "not-allowed",
                      border: "1.5px solid #d1d5db",
                      background: selectedCards.size > 0 ? "white" : "#f9fafb",
                      color: selectedCards.size > 0 ? "#374151" : "#d1d5db",
                      transition: "0.15s",
                    }}
                  >
                    ⧉ Дублировать {selectedCards.size > 0 ? `(${selectedCards.size})` : ""}
                  </button>

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
                    🗑 Удалить {selectedCards.size > 0 ? `(${selectedCards.size})` : ""}
                  </button>
                </>
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
                            updateStickerValue(`${y}-${mo}-${d}`, true);
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
                  zIndex={5000}
                  value={
                    selectedSticker?.sticker?.id === "deadline"
                      ? selectedSticker.sticker.value || ""
                      : ""
                  }
                  onSelect={(dateStr) => {
                    updateStickerValue(dateStr);
                    setShowDatePicker(false);
                  }}
                  onClose={() => setShowDatePicker(false)}
                />
              )}
              {showDateRangePicker &&
                selectedSticker?.sticker?.type === "daterange" && (
                  <DatePickerModal
                    zIndex={5000}
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
                  value={selectedSticker.sticker.value || ""}
                  onChange={(e) => updateStickerValue(e.target.value, true)}
                  style={{ ...input, marginBottom: "4px", cursor: "pointer" }}
                >
                  <option value="" disabled>
                    Выберите исполнителя
                  </option>
                  {(members || []).map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
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
                      onClick={() => updateStickerValue(label, true)}
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
            {activeCard.stickers?.length > 0 && (
              <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginTop: "8px" }}>
                {activeCard.stickers.map((st, i) => (
                  <StickerChip key={getStickerKey(st, i)} sticker={st} index={i} cardId={activeCard.id} setSelectedSticker={() => {}} />
                ))}
              </div>
            )}
            <div style={{ marginTop: "6px", height: "20px" }} />
          </div>
        ) : activeColumn && board[activeColumn] ? (
          <div
            style={{
              width: "280px", minWidth: "280px", minHeight: "120px", height: "100%",
              background: "white", padding: "12px", borderRadius: "10px",
              boxShadow: "0 16px 40px rgba(0,0,0,0.22)", boxSizing: "border-box",
              display: "flex", flexDirection: "column", cursor: "grabbing",
              border: "2px solid transparent", transform: "rotate(2deg)",
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "4px", flex: 1, minWidth: 0 }}>
                <h3 style={{ margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
                  {board[activeColumn].title}
                </h3>
              </div>
              <button style={{ border: "none", background: "transparent", color: "#9ca3af", fontSize: "16px", padding: "2px 6px", cursor: "default" }}>⋮</button>
            </div>
            <div style={{ overflowY: "hidden", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
              {board[activeColumn].cards.length === 0 ? (
                <div style={{
                  flexShrink: 0, minHeight: "56px", padding: "10px",
                  border: "2px dashed #d1d5db", borderRadius: "8px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#9ca3af", fontSize: "14px", background: "transparent",
                }}>
                  Перетащите карточку сюда
                </div>
              ) : (
                board[activeColumn].cards.map((card) => (
                  <div
                    key={card.id}
                    style={{
                      background: card.completed ? "#e5e7eb" : "#f9fafb",
                      padding: "10px", marginBottom: "8px", borderRadius: "6px",
                      border: (() => {
                        const p = card.stickers?.find((s) => s.id === "priority");
                        const color = p?.value ? PRIORITY_COLORS[p.value]?.border : null;
                        return color ? `2px solid ${color}` : "1px solid #e5e7eb";
                      })(),
                      wordBreak: "break-word", whiteSpace: "normal", flexShrink: 0,
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
                        {card.stickers.map((sticker, i) => (
                          <StickerChip key={getStickerKey(sticker, i)} sticker={sticker} index={i} cardId={card.id} setSelectedSticker={() => {}} />
                        ))}
                      </div>
                    )}
                    <div style={{ marginTop: "6px", height: "20px" }} />
                  </div>
                ))
              )}
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
    </DndContext>
  );
}
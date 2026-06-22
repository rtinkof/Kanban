import { useState, useEffect, useRef } from "react";
import Board from "./Board";
import DatePickerModal from "./DatePickerModal";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import {
  SortableContext,
  horizontalListSortingStrategy,
  arrayMove,
  useSortable,
} from "@dnd-kit/sortable";
import {
  restrictToHorizontalAxis,
  restrictToParentElement,
} from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";

/* СТИЛИ */

const header = {
  background: "#f0f0f0",
  padding: "10px 30px",
  flexShrink: 0,
};

const tabsContainer = {
  display: "flex",
  alignItems: "center",
  gap: "15px",
};

const tab = {
  background: "#f0f0f0",
  padding: "6px 12px",
  borderRadius: "6px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: "6px",
  userSelect: "none",
  border: "2px solid #dadada",
};

const activeTab = {
  background: "#ffffff",
  boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
};

const addBtn = {
  height: "38px",
  minWidth: "38px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  background: "white",
  color: "#6b7280",
  cursor: "pointer",
  fontSize: "18px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "20px",
};

const inputTab = {
  padding: "6px 12px",
  borderRadius: "6px",
  border: "1.5px solid #93c5fd",
  width: "120px",
  background: "#ffffff",
  color: "#374151",
  fontSize: "14px",
  outline: "none",
  boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
};

const editBtn = {
  fontSize: "12px",
  color: "#6b7280",
  cursor: "pointer",
};

const deleteBtn = {
  fontSize: "12px",
  color: "#ef4444",
  cursor: "pointer",
};

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
  padding: "28px",
  borderRadius: "16px",
  width: "360px",
  boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
};

const topBar = {
  display: "flex",
  alignItems: "center",
  gap: "16px",
  padding: "12px 30px",
  background: "white",
  borderBottom: "1px solid #e5e7eb",
  flexShrink: 0,
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
};

const sidebar = {
  width: "64px",
  minWidth: "64px",
  height: "100vh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "8px",
  padding: "16px 0",
  background: "white",
  borderRight: "1px solid #e5e7eb",
  flexShrink: 0,
  boxSizing: "border-box",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
};

const sidebarIcon = {
  width: "40px",
  height: "40px",
  borderRadius: "10px",
  border: "none",
  background: "transparent",
  color: "#6b7280",
  cursor: "pointer",
  fontSize: "20px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "background 0.15s, color 0.15s",
  flexShrink: 0,
};

const sidebarAvatar = {
  width: "36px",
  height: "36px",
  borderRadius: "50%",
  background: "#e5e7eb",
  flexShrink: 0,
  margin: "4px 0",
};

const sidebarSpacer = {
  flex: 1,
};

const SIDEBAR_COLLAPSED = 64;
const SIDEBAR_EXPANDED = 248;

const projectNameStyle = {
  fontSize: "18px",
  fontWeight: "700",
  color: "#374151",
  whiteSpace: "nowrap",
};

const topBarBtn = {
  height: "36px",
  padding: "0 14px",
  borderRadius: "8px",
  border: "1.5px solid #d1d5db",
  background: "white",
  color: "#374151",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: "500",
  display: "flex",
  alignItems: "center",
  gap: "6px",
  whiteSpace: "nowrap",
};

const searchBar = {
  flex: 1,
  display: "flex",
  alignItems: "center",
  gap: "8px",
  height: "36px",
  padding: "0 14px",
  borderRadius: "8px",
  border: "1.5px solid #e5e7eb",
  background: "white",
  color: "#9ca3af",
  fontSize: "14px",
  maxWidth: "360px",
};

const searchInput = {
  flex: 1,
  border: "none",
  outline: "none",
  background: "transparent",
  fontSize: "14px",
  color: "#374151",
};

const memberRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "10px 12px",
  borderRadius: "8px",
  background: "#f9fafb",
  marginBottom: "8px",
  fontSize: "14px",
  color: "#374151",
};

const iconBtnSm = {
  width: "30px",
  height: "30px",
  borderRadius: "7px",
  border: "1px solid #e5e7eb",
  background: "white",
  color: "#6b7280",
  cursor: "pointer",
  fontSize: "14px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

/* SORTABLE TAB */

function SortableTab({ id, name, isActive, onSelect, onEdit, onDelete }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  let isDragging = false;

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      <div
        style={{
          ...tab,
          ...(isActive ? activeTab : {}),
        }}
      >
        {/* 👇 DRAG ЗОНА (ТОЛЬКО НАЗВАНИЕ) */}
        <div
          {...attributes}
          {...listeners}
          onMouseDown={() => {
            isDragging = false;
          }}
          onMouseMove={() => {
            isDragging = true;
          }}
          onMouseUp={() => {
            if (!isDragging) {
              onSelect(); // это клик
            }
          }}
          style={{
            cursor: "pointer",
            userSelect: "none",
            flex: 1,
          }}
        >
          {name}
        </div>

        {/* КНОПКИ */}
        <span
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          style={editBtn}
        >
          ✎
        </span>

        <span
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          style={deleteBtn}
        >
          ✕
        </span>
      </div>
    </div>
  );
}

/* SIDEBAR ROW */
function SidebarRow({ expanded, icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: "10px",
        height: "44px", padding: "0 18px",
        border: "none", background: "transparent",
        cursor: "pointer", width: "100%", textAlign: "left",
        color: "#6b7280", fontSize: "14px",
      }}
    >
      <span style={{ fontSize: "18px", width: "28px", textAlign: "center", flexShrink: 0 }}>{icon}</span>
      {expanded && <span style={{ fontWeight: "500", color: "#374151", whiteSpace: "nowrap" }}>{label}</span>}
    </button>
  );
}

/* ПАНЕЛЬ ФИЛЬТРОВ ПОИСКА */
function FilterCheckboxRow({ label, checked, onToggle, disabled }) {
  return (
    <button
      onClick={disabled ? undefined : onToggle}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        padding: "6px 10px",
        border: "none",
        background: "transparent",
        borderRadius: "6px",
        cursor: disabled ? "default" : "pointer",
        textAlign: "left",
        fontSize: "13px",
        color: disabled ? "#9ca3af" : "#374151",
      }}
    >
      <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
      <span
        style={{
          width: "16px",
          height: "16px",
          flexShrink: 0,
          marginLeft: "10px",
          borderRadius: "4px",
          border: `2px solid ${checked ? "#2563eb" : "#d1d5db"}`,
          background: checked ? "#2563eb" : "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {checked && <span style={{ color: "white", fontSize: "10px", lineHeight: 1 }}>✓</span>}
      </span>
    </button>
  );
}

function FilterCategory({ title, items, selectedSet, onToggle }) {
  if (items.length === 0) return null;
  return (
    <div style={{ marginBottom: "10px" }}>
      <div
        style={{
          fontSize: "11px",
          fontWeight: "600",
          color: "#9ca3af",
          padding: "2px 10px 4px",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {title}
      </div>
      {items.map((item) => (
        <FilterCheckboxRow
          key={item.id}
          label={item.label}
          checked={selectedSet === null || selectedSet.has(item.id)}
          onToggle={() => onToggle(item.id)}
        />
      ))}
    </div>
  );
}

const DATE_PRESETS = [
  { id: "today", label: "Сегодня" },
  { id: "thisWeek", label: "На этой неделе" },
  { id: "overdue", label: "Просрочено" },
  { id: "upcoming", label: "Впереди" },
];

function DateRangeFilter({ stickerId, range, onSetField, onPreset, disabled }) {
  const from = range?.from || "";
  const to = range?.to || "";
  const [showPicker, setShowPicker] = useState(false);

  return (
    <div style={{ padding: "6px 10px 8px 28px", opacity: disabled ? 0.45 : 1 }}>
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "8px" }}>
        {DATE_PRESETS.map((p) => (
          <button
            key={p.id}
            disabled={disabled}
            onClick={() => onPreset(stickerId, p.id)}
            style={{
              border: "1.5px solid #e5e7eb",
              background: "white",
              borderRadius: "6px",
              padding: "4px 8px",
              fontSize: "12px",
              color: "#374151",
              cursor: disabled ? "default" : "pointer",
            }}
          >
            {p.label}
          </button>
        ))}
        {(from || to) && (
          <button
            disabled={disabled}
            onClick={() => onPreset(stickerId, "clear")}
            style={{
              border: "1.5px solid #fca5a5",
              background: "white",
              borderRadius: "6px",
              padding: "4px 8px",
              fontSize: "12px",
              color: "#ef4444",
              cursor: disabled ? "default" : "pointer",
            }}
          >
            Сбросить
          </button>
        )}
      </div>

      <button
        disabled={disabled}
        onClick={() => setShowPicker(true)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "6px",
          padding: "7px 10px",
          border: "1.5px solid #e5e7eb",
          borderRadius: "6px",
          background: "white",
          fontSize: "12px",
          color: from || to ? "#111827" : "#9ca3af",
          cursor: disabled ? "default" : "pointer",
        }}
      >
        📅 {from || "от"} — {to || "до"}
      </button>

      {showPicker && (
        <DatePickerModal
          range
          zIndex={5000}
          value={{ from, to }}
          onSelect={({ from: f, to: t }) => {
            onSetField(stickerId, "from", f);
            onSetField(stickerId, "to", t);
          }}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}

function StickerFilterRow({
  stickerDef,
  checked,
  onToggle,
  isDate,
  stateOptions,
  expanded,
  onToggleExpanded,
  selectedValues,
  onToggleValue,
  dateRange,
  onSetDateField,
  onDatePreset,
}) {
  const hasSubFilter = isDate || stateOptions.length > 0;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center" }}>
        {hasSubFilter ? (
          <button
            onClick={onToggleExpanded}
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "#9ca3af",
              fontSize: "11px",
              width: "20px",
              height: "28px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              transform: expanded ? "rotate(90deg)" : "none",
              transition: "transform 0.12s",
            }}
          >
            ▶
          </button>
        ) : (
          <span style={{ width: "20px", flexShrink: 0 }} />
        )}
        <div style={{ flex: 1 }}>
          <FilterCheckboxRow label={`${stickerDef.icon} ${stickerDef.text}`} checked={checked} onToggle={onToggle} />
        </div>
      </div>

      {hasSubFilter && expanded && (
        isDate ? (
          <DateRangeFilter
            stickerId={stickerDef.id}
            range={dateRange}
            onSetField={onSetDateField}
            onPreset={onDatePreset}
            disabled={!checked}
          />
        ) : (
          <div style={{ padding: "0 10px 6px 28px", opacity: checked ? 1 : 0.45 }}>
            {stateOptions.map((value) => (
              <FilterCheckboxRow
                key={value}
                label={value}
                checked={
                  checked &&
                  (selectedValues === null || selectedValues === undefined || selectedValues.has(value))
                }
                onToggle={() => checked && onToggleValue(stickerDef.id, stateOptions, value)}
                disabled={!checked}
              />
            ))}
          </div>
        )
      )}
    </div>
  );
}

function SearchFiltersPanel({
  projects,
  boards,
  allStickerDefs,
  filterProjectIds,
  filterBoardIds,
  filterStickerIds,
  setFilterProjectIds,
  setFilterBoardIds,
  setFilterStickerIds,
  isDateSticker,
  getStickerStateOptions,
  expandedStickerFilters,
  toggleExpandedStickerFilter,
  filterStickerValues,
  toggleStickerValue,
  filterDateRanges,
  setStickerDateRange,
  applyDatePreset,
}) {
  const boardItems = Object.entries(boards).map(([id, b]) => ({ id, label: b.name }));
  const projectItems = projects.map((p) => ({ id: p.id, label: p.name }));

  function makeToggle(setter, currentSet, allIds) {
    return (id) => {
      setter((prev) => {
        const base = prev === null ? new Set(allIds) : new Set(prev);
        if (base.has(id)) base.delete(id);
        else base.add(id);
        return base;
      });
    };
  }

  const toggleStickerId = makeToggle(
    setFilterStickerIds,
    filterStickerIds,
    allStickerDefs.map((s) => s.id),
  );

  return (
    <div
      style={{
        padding: "10px 4px",
        borderBottom: "1px solid #f3f4f6",
      }}
    >
      <FilterCategory
        title="Проекты"
        items={projectItems}
        selectedSet={filterProjectIds}
        onToggle={makeToggle(setFilterProjectIds, filterProjectIds, projectItems.map((i) => i.id))}
      />
      <FilterCategory
        title="Доски"
        items={boardItems}
        selectedSet={filterBoardIds}
        onToggle={makeToggle(setFilterBoardIds, filterBoardIds, boardItems.map((i) => i.id))}
      />

      {allStickerDefs.length > 0 && (
        <div style={{ marginBottom: "10px" }}>
          <div
            style={{
              fontSize: "11px",
              fontWeight: "600",
              color: "#9ca3af",
              padding: "2px 10px 4px",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Стикеры
          </div>
          {allStickerDefs.map((s) => (
            <StickerFilterRow
              key={s.id}
              stickerDef={s}
              checked={filterStickerIds === null || filterStickerIds.has(s.id)}
              onToggle={() => toggleStickerId(s.id)}
              isDate={isDateSticker(s)}
              stateOptions={getStickerStateOptions(s)}
              expanded={expandedStickerFilters.has(s.id)}
              onToggleExpanded={() => toggleExpandedStickerFilter(s.id)}
              selectedValues={filterStickerValues.get(s.id)}
              onToggleValue={toggleStickerValue}
              dateRange={filterDateRanges.get(s.id)}
              onSetDateField={setStickerDateRange}
              onDatePreset={applyDatePreset}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* СПИСОК РЕЗУЛЬТАТОВ ПОИСКА */
const RESULT_TYPE_LABEL = {
  board: "Доска",
  column: "Колонка",
  card: "Карточка",
};

function SearchResultRow({ item, onSelect }) {
  const title =
    item.type === "board"
      ? item.boardName
      : item.type === "column"
        ? item.columnTitle
        : item.cardText;

  const subtitle =
    item.type === "card"
      ? `${item.projectName} · ${item.boardName} · ${item.columnTitle}`
      : item.type === "column"
        ? `${item.projectName} · ${item.boardName}`
        : item.projectName;

  return (
    <button
      onClick={() => onSelect(item)}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "2px",
        width: "100%",
        padding: "8px 12px",
        border: "none",
        background: "transparent",
        borderRadius: "8px",
        cursor: "pointer",
        textAlign: "left",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span
          style={{
            fontSize: "10px",
            fontWeight: "600",
            color: "#2563eb",
            background: "#eff6ff",
            padding: "1px 6px",
            borderRadius: "5px",
            flexShrink: 0,
          }}
        >
          {RESULT_TYPE_LABEL[item.type]}
        </span>
        <span
          style={{
            fontSize: "14px",
            color: "#111827",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {title}
        </span>
      </div>
      <div
        style={{
          fontSize: "12px",
          color: "#9ca3af",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {subtitle}
      </div>
    </button>
  );
}

function SearchResultsList({ results, showAllResults, setShowAllResults, onSelect }) {
  const { matched, unmatched } = results;

  if (matched.length === 0 && unmatched.length === 0) {
    return (
      <div style={{ padding: "16px 12px", fontSize: "13px", color: "#9ca3af", textAlign: "center" }}>
        Ничего не найдено
      </div>
    );
  }

  return (
    <div style={{ padding: "6px 4px" }}>
      {matched.length === 0 && (
        <div style={{ padding: "10px 12px", fontSize: "13px", color: "#9ca3af" }}>
          Нет результатов по текущим фильтрам
        </div>
      )}

      {matched.map((item, i) => (
        <SearchResultRow key={item.type + item.boardId + (item.cardId || item.columnKey || "") + i} item={item} onSelect={onSelect} />
      ))}

      {unmatched.length > 0 && !showAllResults && (
        <button
          onClick={() => setShowAllResults(true)}
          style={{
            display: "block",
            width: "100%",
            padding: "8px 12px",
            marginTop: "4px",
            border: "none",
            background: "transparent",
            borderRadius: "8px",
            cursor: "pointer",
            textAlign: "center",
            fontSize: "13px",
            color: "#2563eb",
            fontWeight: "500",
          }}
        >
          Показать все ({unmatched.length})
        </button>
      )}

      {showAllResults &&
        unmatched.map((item, i) => (
          <SearchResultRow key={"u-" + item.type + item.boardId + (item.cardId || item.columnKey || "") + i} item={item} onSelect={onSelect} />
        ))}
    </div>
  );
}

/* УПРАВЛЕНИЕ ПРОЕКТАМИ И СОТРУДНИКАМИ */

const EMPLOYEE_ROLES = {
  employee: { label: "Сотрудник", color: "#6b7280", bg: "#f3f4f6" },
  admin: { label: "Администратор", color: "#2563eb", bg: "#eff6ff" },
  director: { label: "Директор", color: "#b45309", bg: "#fef3c7" },
};

const PROJECT_ROLES = {
  curator: { label: "Куратор", color: "#7c3aed", bg: "#f3e8ff" },
  executor: { label: "Исполнитель", color: "#0891b2", bg: "#ecfeff" },
};

const POSITIONS = [
  "Менеджер проектов", "Frontend-разработчик", "Backend-разработчик",
  "UI/UX дизайнер", "QA-инженер", "Аналитик", "DevOps-инженер",
  "Маркетолог", "HR-специалист", "Контент-менеджер",
];

function makeDefaultEmployees() {
  return Array.from({ length: 10 }, (_, i) => {
    const n = i + 1;
    let role = "employee";
    if (n === 1) role = "director";
    else if (n === 2 || n === 3) role = "admin";
    return {
      id: "emp-" + n,
      name: `Сотрудник ${n}`,
      position: POSITIONS[i % POSITIONS.length],
      email: `sotrudnik${n}@company.ru`,
      role,
    };
  });
}

/* СТРАНИЦА УПРАВЛЕНИЯ ПРОЕКТАМИ И СОТРУДНИКАМИ */

function ProjectMembersEditor({ project, employees, onToggleMember, onSetRole }) {
  const [showAdd, setShowAdd] = useState(false);
  const [query, setQuery] = useState("");

  const members = (project.members || []);
  const memberIds = new Set(members.map((m) => m.employeeId));
  const nonMembers = employees.filter((e) => !memberIds.has(e.id));

  const filteredNonMembers = nonMembers.filter((e) =>
    e.name.toLowerCase().includes(query.trim().toLowerCase()) ||
    (e.position || "").toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <div style={{ marginTop: "14px" }}>

      {/* Текущие участники */}
      {members.length === 0 && !showAdd && (
        <p style={{ fontSize: "13px", color: "#9ca3af", margin: "0 0 10px" }}>Участников пока нет</p>
      )}

      {members.map((m) => {
        const emp = employees.find((e) => e.id === m.employeeId);
        if (!emp) return null;
        return (
          <div
            key={emp.id}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              gap: "8px", padding: "7px 10px", borderRadius: "8px",
              background: "#f9fafb", marginBottom: "4px",
            }}
          >
            <span style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "13px", fontWeight: "500", color: "#111827" }}>{emp.name}</div>
              <div style={{ fontSize: "11px", color: "#9ca3af" }}>{emp.position || "—"}</div>
            </span>
            <select
              value={m.role}
              onChange={(e) => onSetRole(emp.id, e.target.value)}
              style={{
                padding: "4px 8px", borderRadius: "6px", border: "1.5px solid #e5e7eb",
                fontSize: "12px", fontWeight: "500", cursor: "pointer",
                color: PROJECT_ROLES[m.role]?.color,
                background: PROJECT_ROLES[m.role]?.bg,
              }}
            >
              <option value="curator">Куратор</option>
              <option value="executor">Исполнитель</option>
            </select>
            <button
              onClick={() => onToggleMember(emp.id)}
              title="Убрать из проекта"
              style={{
                border: "none", background: "transparent", color: "#9ca3af",
                cursor: "pointer", fontSize: "16px", padding: "0 2px", flexShrink: 0,
              }}
            >✕</button>
          </div>
        );
      })}

      {/* Кнопка добавить */}
      {!showAdd && nonMembers.length > 0 && (
        <button
          onClick={() => setShowAdd(true)}
          style={{
            marginTop: "6px", border: "1.5px dashed #d1d5db", background: "transparent",
            color: "#6b7280", borderRadius: "8px", padding: "7px 14px",
            cursor: "pointer", fontSize: "13px", fontWeight: "500", width: "100%",
          }}
        >
          + Добавить участника
        </button>
      )}

      {/* Список для добавления */}
      {showAdd && (
        <div style={{
          marginTop: "8px", border: "1.5px solid #e5e7eb", borderRadius: "10px",
          overflow: "hidden",
        }}>
          <div style={{ padding: "8px", borderBottom: "1px solid #f3f4f6" }}>
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск..."
              style={{
                width: "100%", padding: "7px 10px", borderRadius: "7px",
                border: "1.5px solid #e5e7eb", fontSize: "13px", outline: "none",
                background: "#f9fafb", boxSizing: "border-box",
              }}
            />
          </div>
          <div style={{ maxHeight: "200px", overflowY: "auto" }}>
            {filteredNonMembers.length === 0 && (
              <p style={{ fontSize: "13px", color: "#9ca3af", textAlign: "center", padding: "12px 0", margin: 0 }}>
                {query ? "Никого не найдено" : "Все сотрудники уже в проекте"}
              </p>
            )}
            {filteredNonMembers.map((emp) => (
              <div
                key={emp.id}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "8px 12px", gap: "8px",
                  borderBottom: "1px solid #f9fafb",
                }}
              >
                <span style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "13px", fontWeight: "500", color: "#111827" }}>{emp.name}</div>
                  <div style={{ fontSize: "11px", color: "#9ca3af" }}>{emp.position || "—"}</div>
                </span>
                <button
                  onClick={() => { onToggleMember(emp.id); }}
                  style={{
                    border: "none", background: "#2563eb", color: "white",
                    borderRadius: "7px", padding: "5px 12px",
                    cursor: "pointer", fontSize: "12px", fontWeight: "600", flexShrink: 0,
                  }}
                >Добавить</button>
              </div>
            ))}
          </div>
          <div style={{ padding: "8px", borderTop: "1px solid #f3f4f6" }}>
            <button
              onClick={() => { setShowAdd(false); setQuery(""); }}
              style={{
                width: "100%", border: "none", background: "transparent",
                color: "#6b7280", cursor: "pointer", fontSize: "13px", padding: "4px",
              }}
            >Закрыть</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ProjectCard({
  project, employees, isActive, onSelect,
  onRename, onDuplicate, onDelete,
  onToggleMember, onSetRole,
}) {
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(project.name);
  const [expanded, setExpanded] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const memberCount = (project.members || []).length;
  const curatorCount = (project.members || []).filter((m) => m.role === "curator").length;

  return (
    <div
      style={{
        border: isActive ? "1.5px solid #2563eb" : "1.5px solid #e5e7eb",
        borderRadius: "12px",
        padding: "16px 18px",
        marginBottom: "12px",
        background: "white",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
        {editingName ? (
          <input
            autoFocus
            value={nameDraft}
            maxLength={40}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={() => { onRename(nameDraft); setEditingName(false); }}
            onKeyDown={(e) => {
              if (e.key === "Enter") { onRename(nameDraft); setEditingName(false); }
              if (e.key === "Escape") { setNameDraft(project.name); setEditingName(false); }
            }}
            style={{
              flex: 1, minWidth: "160px", padding: "6px 10px", borderRadius: "7px",
              border: "1.5px solid #93c5fd", fontSize: "15px", fontWeight: "700",
              outline: "none", color: "#111827",
            }}
          />
        ) : (
          <div
            onClick={() => onSelect(project.id)}
            style={{
              flex: 1, minWidth: "160px", fontSize: "16px", fontWeight: "700",
              color: isActive ? "#2563eb" : "#111827", cursor: "pointer",
            }}
          >
            {project.name} {isActive && <span style={{ fontSize: "11px", fontWeight: "500", color: "#2563eb" }}>· активен</span>}
          </div>
        )}

        <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
          <button
            onClick={() => setEditingName(true)}
            title="Переименовать"
            style={{ ...iconBtnSm }}
          >✎</button>
          <button
            onClick={onDuplicate}
            title="Дублировать"
            style={{ ...iconBtnSm }}
          >⧉</button>
          <button
            onClick={() => setConfirmingDelete(true)}
            title="Удалить"
            style={{ ...iconBtnSm, color: "#ef4444" }}
          >🗑</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: "14px", marginTop: "8px", fontSize: "12px", color: "#9ca3af" }}>
        <span>{memberCount} участник{memberCount === 1 ? "" : memberCount >= 2 && memberCount <= 4 ? "а" : "ов"}</span>
        <span>{curatorCount} куратор{curatorCount === 1 ? "" : curatorCount >= 2 && curatorCount <= 4 ? "а" : "ов"}</span>
      </div>

      <div style={{ display: "flex", gap: "10px", alignItems: "center", marginTop: "8px" }}>
        <button
          onClick={() => setExpanded((v) => !v)}
          style={{
            border: "none", background: "transparent", color: "#2563eb", cursor: "pointer",
            fontSize: "13px", fontWeight: "500", padding: "0", textAlign: "left",
          }}
        >
          {expanded ? "Скрыть состав ▲" : "Состав проекта ▼"}
        </button>
        <button
          onClick={() => onSelect(project.id)}
          style={{
            border: "1.5px solid #2563eb", background: isActive ? "#2563eb" : "white",
            color: isActive ? "white" : "#2563eb",
            borderRadius: "7px", padding: "5px 14px", cursor: "pointer",
            fontSize: "13px", fontWeight: "600", marginLeft: "auto",
          }}
        >
          {isActive ? "✓ Текущий" : "Открыть →"}
        </button>
      </div>

      {expanded && (
        <ProjectMembersEditor
          project={project}
          employees={employees}
          onToggleMember={onToggleMember}
          onSetRole={onSetRole}
        />
      )}

      {confirmingDelete && (
        <div style={modalBg} onClick={() => setConfirmingDelete(false)}>
          <div style={modalBox} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ margin: "0 0 10px", fontSize: "17px", fontWeight: "700", color: "#111827" }}>
              Удалить проект?
            </h2>
            <p style={{ margin: "0 0 20px", fontSize: "13px", color: "#6b7280" }}>
              «{project.name}» и все его доски будут удалены безвозвратно.
            </p>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => setConfirmingDelete(false)}
                style={{ flex: 1, padding: "10px", border: "1.5px solid #d1d5db", borderRadius: "8px", background: "white", color: "#374151", cursor: "pointer", fontSize: "14px", fontWeight: "500" }}
              >Отмена</button>
              <button
                onClick={() => { onDelete(); setConfirmingDelete(false); }}
                style={{ flex: 1, padding: "10px", border: "none", borderRadius: "8px", background: "#ef4444", color: "white", cursor: "pointer", fontSize: "14px", fontWeight: "600" }}
              >Удалить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EmployeeRow({ employee }) {
  const roleInfo = EMPLOYEE_ROLES[employee.role];
  return (
    <div
      style={{
        display: "flex", alignItems: "center", gap: "14px",
        padding: "12px 16px", borderRadius: "10px", border: "1px solid #f1f5f9",
        marginBottom: "8px", background: "white",
      }}
    >
      <div style={{
        width: "38px", height: "38px", borderRadius: "50%", background: "#e5e7eb",
        flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "14px", fontWeight: "700", color: "#6b7280",
      }}>
        {employee.name.replace("Сотрудник ", "").slice(0, 2) || "?"}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "14px", fontWeight: "600", color: "#111827" }}>{employee.name}</div>
        <div style={{ fontSize: "12px", color: "#9ca3af" }}>{employee.position || "Без должности"}</div>
      </div>

      <div style={{ fontSize: "13px", color: "#6b7280", minWidth: "180px", flexShrink: 0 }}>
        {employee.email || "—"}
      </div>

      <span style={{
        fontSize: "12px", fontWeight: "600", padding: "5px 10px", borderRadius: "999px",
        color: roleInfo.color, background: roleInfo.bg, flexShrink: 0, whiteSpace: "nowrap",
      }}>
        {roleInfo.label}
      </span>
    </div>
  );
}

function WorkspaceManager({
  projects, employees, activeProjectId, setActiveProjectId, onClose,
  onRenameProject, onDuplicateProject, onDeleteProject,
  onToggleProjectMember, onSetProjectMemberRole,
  onOpenCreateProject, onAddEmployee,
}) {
  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column", height: "100vh",
      overflowY: "auto", background: "#f9fafb",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    }}>
      {/* HEADER */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 30px", background: "white", borderBottom: "1px solid #e5e7eb", flexShrink: 0,
      }}>
        <div style={{ fontSize: "18px", fontWeight: "700", color: "#111827" }}>
          💼 Проекты и сотрудники
        </div>
        <button
          onClick={onClose}
          style={{
            border: "1.5px solid #d1d5db", background: "white", color: "#374151",
            borderRadius: "8px", padding: "8px 16px", cursor: "pointer", fontSize: "14px", fontWeight: "500",
          }}
        >
          ← Назад к доске
        </button>
      </div>

      <div style={{ padding: "28px 30px 60px", maxWidth: "900px", width: "100%", margin: "0 auto", boxSizing: "border-box" }}>

        {/* ПРОЕКТЫ */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
          <h2 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#111827" }}>Проекты</h2>
          <button
            onClick={onOpenCreateProject}
            style={{
              border: "none", background: "#2563eb", color: "white", borderRadius: "8px",
              padding: "8px 14px", cursor: "pointer", fontSize: "13px", fontWeight: "600",
            }}
          >
            + Новый проект
          </button>
        </div>

        {projects.map((p) => (
          <ProjectCard
            key={p.id}
            project={p}
            employees={employees}
            isActive={p.id === activeProjectId}
            onSelect={setActiveProjectId}
            onRename={(name) => onRenameProject(p.id, name)}
            onDuplicate={() => onDuplicateProject(p.id)}
            onDelete={() => onDeleteProject(p.id)}
            onToggleMember={(empId) => onToggleProjectMember(p.id, empId)}
            onSetRole={(empId, role) => onSetProjectMemberRole(p.id, empId, role)}
          />
        ))}

        {/* СОТРУДНИКИ КОМПАНИИ */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "36px 0 14px" }}>
          <h2 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#111827" }}>Сотрудники компании</h2>
          <button
            onClick={onAddEmployee}
            title="Пока недоступно — заглушка"
            style={{
              border: "1.5px solid #d1d5db", background: "white", color: "#374151", borderRadius: "8px",
              padding: "8px 14px", cursor: "pointer", fontSize: "13px", fontWeight: "600",
            }}
          >
            + Добавить сотрудника
          </button>
        </div>

        {employees.map((emp) => (
          <EmployeeRow key={emp.id} employee={emp} />
        ))}
      </div>
    </div>
  );
}

/* APP */

export default function App() {
  const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: {
      tolerance: 5,
    },
  })
);
  const [boards, setBoards] = useState(() => {
    const saved = localStorage.getItem("kanban-boards");
    if (saved) return JSON.parse(saved);
    return {
      board1: { name: "Доска 1", projectId: "default", data: { col1: { title: "Новая колонка", cards: [] } } },
    };
  });

  const [activeBoardId, setActiveBoardId] = useState(() => {
    return localStorage.getItem("active-board-id") || "board1";
  });

  const [newBoardName, setNewBoardName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [editingBoard, setEditingBoard] = useState(null);
  const [deletingBoard, setDeletingBoard] = useState(null);
  const [tempName, setTempName] = useState("");

  /* САЙДБАР */
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [projectsHovered, setProjectsHovered] = useState(false);

  /* ПРОЕКТЫ */
  const [projects, setProjects] = useState(() => {
    const saved = localStorage.getItem("kanban-projects");
    if (saved) return JSON.parse(saved);
    return [{
      id: "default",
      name: "Мой проект",
      members: [
        { employeeId: "emp-1", role: "curator" },
        { employeeId: "emp-4", role: "executor" },
      ],
    }];
  });
  const [activeProjectId, setActiveProjectId] = useState(() => {
    return localStorage.getItem("active-project-id") || "default";
  });
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectMembers, setNewProjectMembers] = useState([]);
  const [showMembersModal, setShowMembersModal] = useState(false);

  /* СОТРУДНИКИ КОМПАНИИ — хардкод, не зависит от localStorage */
  const [employees, setEmployees] = useState(makeDefaultEmployees);

  /* СТРАНИЦА УПРАВЛЕНИЯ ПРОЕКТАМИ И СОТРУДНИКАМИ */
  const [showWorkspaceManager, setShowWorkspaceManager] = useState(false);

  /* ПОИСК */
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [showSearchFilters, setShowSearchFilters] = useState(false);
  const [showAllResults, setShowAllResults] = useState(false);
  const searchBlockRef = useRef(null);

  // Закрываем дропдаун поиска/фильтров только по клику ВНЕ всего блока
  // (не полагаемся на onBlur — он слишком легко срабатывает при клике
  // по нефокусируемым элементам вроде div/чекбоксов внутри панели фильтров)
  useEffect(() => {
    if (!searchFocused && !showSearchFilters) return;

    function handlePointerDown(e) {
      if (searchBlockRef.current && !searchBlockRef.current.contains(e.target)) {
        setSearchFocused(false);
        setShowSearchFilters(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [searchFocused, showSearchFilters]);

  // Какие id отмечены чекбоксами (по умолчанию — все включены, поэтому
  // null означает "все доступные", set с конкретными id означает "только эти")
  const [filterProjectIds, setFilterProjectIds] = useState(null);
  const [filterBoardIds, setFilterBoardIds] = useState(null);
  const [filterStickerIds, setFilterStickerIds] = useState(null);

  // Подсписки значений внутри стикера: Map<stickerId, Set<value>|null>.
  // null для конкретного stickerId означает "все значения этого стикера разрешены".
  const [filterStickerValues, setFilterStickerValues] = useState(() => new Map());

  // Диапазоны дат для стикеров типа deadline/daterange: Map<stickerId, {from, to}>
  // from/to — строки "YYYY-MM-DD" либо "" (не ограничено с этой стороны)
  const [filterDateRanges, setFilterDateRanges] = useState(() => new Map());

  // Какие подсписки сейчас раскрыты в панели фильтров
  const [expandedStickerFilters, setExpandedStickerFilters] = useState(() => new Set());

  // Сброс "показать все" при новом запросе/изменении фильтров,
  // чтобы не путать пользователя устаревшим раскрытым списком
  useEffect(() => {
    setShowAllResults(false);
  }, [searchQuery, filterProjectIds, filterBoardIds, filterStickerIds, filterStickerValues, filterDateRanges]);

  // Builtin-стикеры (совпадает с набором в Board.jsx)
  const BUILTIN_STICKERS = [
    { id: "executor", icon: "👤", text: "Исполнитель" },
    { id: "deadline", icon: "📅", text: "Дедлайн" },
    { id: "priority", icon: "📊", text: "Приоритет" },
  ];

  const PRIORITY_VALUES = ["Неважно", "Нормально", "Важно", "Срочно"];

  // Является ли стикер "датовым" (нужен диапазон, а не чекбоксы состояний)
  function isDateSticker(stickerDef) {
    return stickerDef.id === "deadline" || stickerDef.type === "daterange";
  }

  // Список возможных значений-состояний для стикера (для чекбоксов в подсписке).
  // Для датовых стикеров возвращает [] — у них своя логика диапазона.
  function getStickerStateOptions(stickerDef) {
    if (stickerDef.id === "priority") return PRIORITY_VALUES;
    if (stickerDef.id === "executor") {
      // executor общий для всех проектов — собираем имена участников всех проектов
      const set = new Set();
      projects.forEach((p) =>
        (p.members || []).forEach((m) => {
          const emp = employees.find((e) => e.id === m.employeeId);
          if (emp) set.add(emp.name);
        }),
      );
      return [...set];
    }
    if (stickerDef.type === "states") {
      return (stickerDef.states || []).map((s) => s.label);
    }
    return []; // text / number / даты — без набора состояний
  }

  // Собираем уникальный набор всех стикеров (builtin + кастомные из всех досок)
  const allStickerDefs = (() => {
    const map = new Map();
    BUILTIN_STICKERS.forEach((s) => map.set(s.id, s));
    Object.values(boards).forEach((b) => {
      (b.data?._meta?.customStickers || []).forEach((s) => {
        if (!map.has(s.id)) map.set(s.id, s);
      });
    });
    return [...map.values()];
  })();

  // Переключить конкретное значение-состояние внутри стикера (подсписок)
  function toggleStickerValue(stickerId, allValues, value) {
    setFilterStickerValues((prev) => {
      const next = new Map(prev);
      const current = next.get(stickerId);
      const base = current === undefined || current === null ? new Set(allValues) : new Set(current);
      if (base.has(value)) base.delete(value);
      else base.add(value);
      next.set(stickerId, base);
      return next;
    });
  }

  function setStickerDateRange(stickerId, field, value) {
    setFilterDateRanges((prev) => {
      const next = new Map(prev);
      const current = next.get(stickerId) || { from: "", to: "" };
      next.set(stickerId, { ...current, [field]: value });
      return next;
    });
  }

  function applyDatePreset(stickerId, preset) {
    const today = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (preset === "today") {
      const t = fmt(today);
      setFilterDateRanges((prev) => new Map(prev).set(stickerId, { from: t, to: t }));
    } else if (preset === "thisWeek") {
      const dayOfWeek = (today.getDay() + 6) % 7; // понедельник = 0
      const monday = new Date(today);
      monday.setDate(today.getDate() - dayOfWeek);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      setFilterDateRanges((prev) => new Map(prev).set(stickerId, { from: fmt(monday), to: fmt(sunday) }));
    } else if (preset === "overdue") {
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      setFilterDateRanges((prev) => new Map(prev).set(stickerId, { from: "", to: fmt(yesterday) }));
    } else if (preset === "upcoming") {
      setFilterDateRanges((prev) => new Map(prev).set(stickerId, { from: fmt(today), to: "" }));
    } else if (preset === "clear") {
      setFilterDateRanges((prev) => {
        const next = new Map(prev);
        next.delete(stickerId);
        return next;
      });
    }
  }

  function toggleExpandedStickerFilter(stickerId) {
    setExpandedStickerFilters((prev) => {
      const next = new Set(prev);
      if (next.has(stickerId)) next.delete(stickerId);
      else next.add(stickerId);
      return next;
    });
  }

  // Проверка, проходит ли один прикреплённый к карточке стикер через фильтр
  // значений/диапазона дат, настроенный для его id
  function stickerPassesValueFilter(stickerDef, stickerInstance) {
    if (!stickerDef) return true;

    if (isDateSticker(stickerDef)) {
      const range = filterDateRanges.get(stickerDef.id);
      if (!range || (!range.from && !range.to)) return true; // диапазон не задан — не ограничиваем

      // daterange хранит {from, to}, deadline хранит одну дату
      const checkDate = (dateStr) => {
        if (!dateStr) return false;
        if (range.from && dateStr < range.from) return false;
        if (range.to && dateStr > range.to) return false;
        return true;
      };

      if (stickerDef.id === "deadline") {
        return checkDate(stickerInstance.value);
      }
      // daterange: считаем совпадением, если интервалы пересекаются
      const val = stickerInstance.value || {};
      if (!val.from && !val.to) return false;
      return checkDate(val.from) || checkDate(val.to);
    }

    const allowedValues = filterStickerValues.get(stickerDef.id);
    if (allowedValues === undefined || allowedValues === null) return true; // не сужено — всё разрешено
    return allowedValues.has(stickerInstance.value);
  }

  // Результаты глобального поиска по всем проектам/доскам, с учётом фильтров.
  // Текст ищется в названии карточки/колонки/доски, а также в названии и
  // значении прикреплённых к карточке стикеров.
  const searchResults = (() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return { matched: [], unmatched: [] };

    const matched = [];
    const unmatched = [];

    function stickerTextMatches(stickerInstance) {
      const def = allStickerDefs.find((d) => d.id === stickerInstance.id);
      if (def?.text?.toLowerCase().includes(q)) return true;

      const val = stickerInstance.value;
      if (typeof val === "string" && val.toLowerCase().includes(q)) return true;
      if (typeof val === "number" && String(val).includes(q)) return true;
      if (val && typeof val === "object") {
        if (val.from?.toLowerCase().includes(q)) return true;
        if (val.to?.toLowerCase().includes(q)) return true;
      }
      return false;
    }

    Object.entries(boards).forEach(([boardId, b]) => {
      const project = projects.find((p) => p.id === b.projectId);
      const projectName = project?.name || "Проект";

      const passesProjectFilter =
        filterProjectIds === null || filterProjectIds.has(b.projectId);
      const passesBoardFilter =
        filterBoardIds === null || filterBoardIds.has(boardId);

      // Доска как результат (по названию доски)
      if (b.name.toLowerCase().includes(q)) {
        const item = {
          type: "board",
          boardId,
          boardName: b.name,
          projectId: b.projectId,
          projectName,
        };
        if (passesProjectFilter && passesBoardFilter) matched.push(item);
        else unmatched.push(item);
      }

      Object.entries(b.data || {})
        .filter(([k]) => k !== "_meta")
        .forEach(([columnKey, column]) => {
          // Колонка как результат (по названию колонки)
          if (column.title?.toLowerCase().includes(q)) {
            const item = {
              type: "column",
              boardId,
              boardName: b.name,
              projectId: b.projectId,
              projectName,
              columnKey,
              columnTitle: column.title,
            };
            if (passesProjectFilter && passesBoardFilter) matched.push(item);
            else unmatched.push(item);
          }

          (column.cards || []).forEach((card) => {
            const cardStickers = card.stickers || [];
            const textMatch = card.text?.toLowerCase().includes(q);
            const stickerMatch = cardStickers.some(stickerTextMatches);
            if (!textMatch && !stickerMatch) return;

            const cardStickerIds = cardStickers.map((s) => s.id);
            const passesStickerIdFilter =
              filterStickerIds === null ||
              cardStickerIds.some((id) => filterStickerIds.has(id)) ||
              // карточки без стикеров проходят фильтр, только если
              // фильтр включает абсолютно все доступные стикеры
              (cardStickerIds.length === 0 &&
                filterStickerIds.size === allStickerDefs.length);

            // Если фильтр стикеров активен (не "все"), дополнительно проверяем
            // значения/диапазоны дат у тех прикреплённых стикеров, что входят в фильтр
            const passesStickerValueFilter =
              filterStickerIds === null ||
              cardStickers
                .filter((s) => filterStickerIds.has(s.id))
                .every((s) => stickerPassesValueFilter(allStickerDefs.find((d) => d.id === s.id), s)) ||
              cardStickers.filter((s) => filterStickerIds.has(s.id)).length === 0;

            const item = {
              type: "card",
              boardId,
              boardName: b.name,
              projectId: b.projectId,
              projectName,
              columnKey,
              columnTitle: column.title,
              cardId: card.id,
              cardText: card.text,
              cardStickers,
            };

            if (
              passesProjectFilter &&
              passesBoardFilter &&
              passesStickerIdFilter &&
              passesStickerValueFilter
            ) {
              matched.push(item);
            } else {
              unmatched.push(item);
            }
          });
        });
    });

    return { matched, unmatched };
  })();

  function goToSearchResult(item) {
    if (item.projectId !== activeProjectId) {
      setActiveProjectId(item.projectId);
    }
    setActiveBoardId(item.boardId);
    setSearchFocused(false);
    setShowSearchFilters(false);
  }

  /* Производные */
  const projectBoards = Object.entries(boards).filter(([, b]) => b.projectId === activeProjectId);
  const activeProject = projects.find((p) => p.id === activeProjectId) || projects[0];

  // Board.jsx ожидает members как массив строк (имён) — для стикера "исполнитель"
  const members = (activeProject?.members || [])
    .map((m) => employees.find((e) => e.id === m.employeeId)?.name)
    .filter(Boolean);

  function setProjectMembers(projectId, updater) {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId
          ? { ...p, members: typeof updater === "function" ? updater(p.members || []) : updater }
          : p,
      ),
    );
  }

  function setMembers(updater) {
    setProjectMembers(activeProjectId, updater);
  }

  // Переключить участие сотрудника в проекте (добавить/убрать), по умолчанию роль "исполнитель"
  function toggleProjectMember(projectId, employeeId) {
    setProjectMembers(projectId, (prev) => {
      const exists = prev.some((m) => m.employeeId === employeeId);
      if (exists) return prev.filter((m) => m.employeeId !== employeeId);
      return [...prev, { employeeId, role: "executor" }];
    });
  }

  function setProjectMemberRole(projectId, employeeId, role) {
    setProjectMembers(projectId, (prev) =>
      prev.map((m) => (m.employeeId === employeeId ? { ...m, role } : m)),
    );
  }

  function removeMember(employeeId) {
    setMembers((prev) => prev.filter((m) => m.employeeId !== employeeId));
  }

  // Выбор сотрудников для НОВОГО проекта (модалка создания) — тоже {employeeId, role}
  function toggleMemberForNewProject(employeeId) {
    setNewProjectMembers((prev) => {
      const exists = prev.some((m) => m.employeeId === employeeId);
      if (exists) return prev.filter((m) => m.employeeId !== employeeId);
      return [...prev, { employeeId, role: "executor" }];
    });
  }

  function setNewProjectMemberRole(employeeId, role) {
    setNewProjectMembers((prev) =>
      prev.map((m) => (m.employeeId === employeeId ? { ...m, role } : m)),
    );
  }

  /* СОТРУДНИКИ КОМПАНИИ — управление */
  function addEmployee() {
    setEmployees((prev) => {
      const nums = prev.map((e) => parseInt(e.id.replace("emp-", ""), 10)).filter((n) => !isNaN(n));
      const next = (nums.length > 0 ? Math.max(...nums) : 0) + 1;
      return [...prev, { id: "emp-" + next, name: `Сотрудник ${next}`, position: "", email: "", role: "employee" }];
    });
  }

  function duplicateProject(projectId) {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;
    const id = Date.now().toString();
    const copy = { ...project, id, name: project.name + " (копия)", members: [...(project.members || [])] };
    setProjects((prev) => {
      const idx = prev.findIndex((p) => p.id === projectId);
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
    // дублируем и доски проекта, чтобы копия была независимой
    const projectBoardEntries = Object.entries(boards).filter(([, b]) => b.projectId === projectId);
    setBoards((prev) => {
      const next = { ...prev };
      projectBoardEntries.forEach(([boardId, b]) => {
        const newBoardId = "board-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7);
        next[newBoardId] = { ...b, projectId: id };
      });
      return next;
    });
  }

  function deleteProject(projectId) {
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    setBoards((prev) => {
      const next = { ...prev };
      Object.entries(next).forEach(([boardId, b]) => {
        if (b.projectId === projectId) delete next[boardId];
      });
      return next;
    });
    if (activeProjectId === projectId) {
      const fallback = projects.find((p) => p.id !== projectId);
      if (fallback) setActiveProjectId(fallback.id);
    }
  }

  function renameProject(projectId, name) {
    if (!name.trim()) return;
    setProjects((prev) => prev.map((p) => (p.id === projectId ? { ...p, name: name.trim() } : p)));
  }

  useEffect(() => {
    localStorage.setItem("kanban-boards", JSON.stringify(boards));
  }, [boards]);

  useEffect(() => {
    if (activeBoardId) localStorage.setItem("active-board-id", activeBoardId);
  }, [activeBoardId]);

  useEffect(() => {
    localStorage.setItem("kanban-projects", JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem("active-project-id", activeProjectId);
  }, [activeProjectId]);

  useEffect(() => {
    const pBoards = Object.entries(boards).filter(([, b]) => b.projectId === activeProjectId);
    if (!boards[activeBoardId] || boards[activeBoardId].projectId !== activeProjectId) {
      setActiveBoardId(pBoards[0]?.[0] || null);
    }
  }, [activeProjectId]);

  useEffect(() => {
    if (activeBoardId && !boards[activeBoardId]) {
      const first = Object.entries(boards).find(([, b]) => b.projectId === activeProjectId);
      setActiveBoardId(first?.[0] || null);
    }
  }, [boards, activeBoardId]);

  function createProject() {
    if (!newProjectName.trim()) return;
    const id = Date.now().toString();
    const boardId = "board-" + id;
    setProjects((prev) => [...prev, { id, name: newProjectName.trim(), members: newProjectMembers }]);
    setBoards((prev) => ({
      ...prev,
      [boardId]: { name: "Доска 1", projectId: id, data: { col1: { title: "Новая колонка", cards: [] } } },
    }));
    setActiveProjectId(id);
    setActiveBoardId(boardId);
    setNewProjectName("");
    setNewProjectMembers([]);
    setShowCreateProject(false);
  }

  function createBoard() {
    if (!newBoardName.trim()) return;

    const id = Date.now().toString();

    setBoards((prev) => ({
      ...prev,
      [id]: {
        name: newBoardName,
        projectId: activeProjectId,
        data: {
          col1: { title: "Новая колонка", cards: [] },
        },
      },
    }));

    setActiveBoardId(id);
    setNewBoardName("");
  }

  function renameBoard(id, newName) {
    if (!newName.trim()) return;

    setBoards((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        name: newName,
      },
    }));
  }

  function deleteBoard(id) {
    setBoards((prev) => {
      const newBoards = { ...prev };
      delete newBoards[id];

      const remainingIds = Object.keys(newBoards);

      if (id === activeBoardId) {
        setActiveBoardId(remainingIds[0] || null);
      }

      return newBoards;
    });
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setBoards((prev) => {
      // сортируем только доски текущего проекта, остальные не трогаем
      const projectEntries = Object.entries(prev).filter(([, b]) => b.projectId === activeProjectId);
      const otherEntries = Object.entries(prev).filter(([, b]) => b.projectId !== activeProjectId);

      const oldIndex = projectEntries.findIndex(([id]) => id === active.id);
      const newIndex = projectEntries.findIndex(([id]) => id === over.id);

      const reordered = arrayMove(projectEntries, oldIndex, newIndex);
      return Object.fromEntries([...otherEntries, ...reordered]);
    });
  }

  function updateBoard(updater) {
    setBoards((prev) => {
      const currentBoard = prev[activeBoardId].data;

      const newData =
        typeof updater === "function"
          ? updater(currentBoard)
          : updater;

      return {
        ...prev,
        [activeBoardId]: {
          ...prev[activeBoardId],
          data: newData,
        },
      };
    });
  }

  const activeBoard = boards[activeBoardId];

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* SIDEBAR */}
      <div
        style={{
          ...sidebar,
          width: sidebarExpanded ? `${SIDEBAR_EXPANDED}px` : `${SIDEBAR_COLLAPSED}px`,
          minWidth: sidebarExpanded ? `${SIDEBAR_EXPANDED}px` : `${SIDEBAR_COLLAPSED}px`,
          alignItems: "stretch",
          padding: "12px 0",
          gap: "2px",
          transition: "width 0.2s ease, min-width 0.2s ease",
          overflow: "hidden",
        }}
      >
        {/* TOGGLE */}
        <SidebarRow expanded={sidebarExpanded} icon="☰" label="Свернуть"
          onClick={() => setSidebarExpanded((v) => !v)} />

        {/* АВАТАР */}
        <div style={{ padding: sidebarExpanded ? "0 12px" : "0 8px 0 16px", height: "44px", display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
          <div style={{
            width: "28px", height: "28px", borderRadius: "50%",
            background: "#e5e7eb", flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
          }} />
          {sidebarExpanded && <span style={{ fontSize: "14px", color: "#374151", fontWeight: "500", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Профиль</span>}
        </div>

        <div style={{ height: "1px", background: "#f3f4f6", margin: "4px 12px" }} />

        {/* ПРОЕКТЫ */}
        <div
          style={{ position: "relative" }}
          onMouseEnter={() => !sidebarExpanded && setProjectsHovered(true)}
          onMouseLeave={() => !sidebarExpanded && setProjectsHovered(false)}
        >
          <div style={{ padding: sidebarExpanded ? "0 12px" : "0 8px 0 16px", height: "44px", display: "flex", alignItems: "center", gap: "6px" }}>
            <button
              onClick={() => setShowWorkspaceManager(true)}
              title="Управление проектами и сотрудниками"
              style={{
                display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: 0,
                border: "none", background: "transparent", cursor: "pointer", padding: 0,
                textAlign: "left",
              }}
            >
              <span style={{ fontSize: "18px", flexShrink: 0, width: "28px", textAlign: "center" }}>💼</span>
              {sidebarExpanded && <span style={{ fontSize: "14px", fontWeight: "500", color: "#374151", whiteSpace: "nowrap" }}>Проекты</span>}
            </button>
            {sidebarExpanded && (
              <button
                onClick={() => setShowCreateProject(true)}
                style={{ ...sidebarIcon, width: "26px", height: "26px", fontSize: "16px", borderRadius: "6px", flexShrink: 0 }}
                title="Новый проект"
              >+</button>
            )}
          </div>

          {/* Список в развёрнутом меню */}
          {sidebarExpanded && (
            <div style={{ padding: "0 8px 4px" }}>
              {projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { setActiveProjectId(p.id); setShowWorkspaceManager(false); }}
                  style={{
                    display: "block", width: "100%", padding: "6px 10px",
                    borderRadius: "7px", border: "none", textAlign: "left",
                    fontSize: "13px", cursor: "pointer", whiteSpace: "nowrap",
                    overflow: "hidden", textOverflow: "ellipsis",
                    background: p.id === activeProjectId ? "#eff6ff" : "transparent",
                    color: p.id === activeProjectId ? "#2563eb" : "#6b7280",
                    fontWeight: p.id === activeProjectId ? "600" : "400",
                  }}
                >{p.name}</button>
              ))}
            </div>
          )}

          {/* Popup в свёрнутом меню */}
          {!sidebarExpanded && projectsHovered && (
            <div
              onMouseEnter={() => setProjectsHovered(true)}
              onMouseLeave={() => setProjectsHovered(false)}
              style={{
                position: "fixed", left: `${SIDEBAR_COLLAPSED}px`,
                top: "112px", background: "white", borderRadius: "10px",
                padding: "8px", minWidth: "200px",
                boxShadow: "0 8px 24px rgba(0,0,0,0.14)",
                border: "1px solid #e5e7eb", zIndex: 1000,
              }}
            >
              <div style={{ fontSize: "11px", fontWeight: "600", color: "#9ca3af", padding: "2px 8px 6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Проекты</div>
              {projects.map((p) => (
                <button key={p.id} onClick={() => { setActiveProjectId(p.id); setProjectsHovered(false); setShowWorkspaceManager(false); }}
                  style={{
                    display: "block", width: "100%", padding: "7px 10px",
                    borderRadius: "7px", border: "none", textAlign: "left",
                    fontSize: "14px", cursor: "pointer",
                    background: p.id === activeProjectId ? "#eff6ff" : "transparent",
                    color: p.id === activeProjectId ? "#2563eb" : "#374151",
                    fontWeight: p.id === activeProjectId ? "600" : "400",
                  }}
                >{p.name}</button>
              ))}
              <div style={{ height: "1px", background: "#f3f4f6", margin: "4px 0" }} />
              <button onClick={() => { setShowCreateProject(true); setProjectsHovered(false); }}
                style={{ display: "block", width: "100%", padding: "7px 10px", borderRadius: "7px", border: "none", textAlign: "left", fontSize: "14px", cursor: "pointer", background: "transparent", color: "#6b7280" }}
              >+ Новый проект</button>
            </div>
          )}
        </div>

        {/* МОИ ЗАДАЧИ */}
        <SidebarRow expanded={sidebarExpanded} icon="✓" label="Мои задачи" onClick={() => {}} />

        <div style={sidebarSpacer} />
      </div>

      {/* MAIN */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          overflow: "hidden",
        }}
      >
        {!showWorkspaceManager && (
        <>
        {/* TOP BAR */}
        <div style={topBar}>
          <div style={projectNameStyle}>{activeProject?.name || "Проект"}</div>

          <button
            onClick={() => setShowMembersModal(true)}
            style={topBarBtn}
          >
            👥 Участники
          </button>

          <div
            ref={searchBlockRef}
            style={{ position: "relative", flex: 1, maxWidth: "360px" }}
          >
            <div style={{ ...searchBar, maxWidth: "none" }}>
              🔍
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                placeholder="Поиск..."
                style={searchInput}
              />
              <button
                onClick={() => {
                  setShowSearchFilters((v) => !v);
                  setSearchFocused(true);
                }}
                title="Фильтры"
                style={{
                  border: "none",
                  background: showSearchFilters ? "#eff6ff" : "transparent",
                  color: showSearchFilters ? "#2563eb" : "#9ca3af",
                  cursor: "pointer",
                  fontSize: "15px",
                  borderRadius: "6px",
                  width: "26px",
                  height: "26px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                ⚙
              </button>
            </div>

            {searchFocused && (searchQuery.trim() || showSearchFilters) && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  left: 0,
                  right: 0,
                  background: "white",
                  borderRadius: "10px",
                  boxShadow: "0 12px 32px rgba(0,0,0,0.16)",
                  border: "1px solid #e5e7eb",
                  zIndex: 1000,
                  maxHeight: "60vh",
                  overflowY: "auto",
                }}
              >
                {showSearchFilters && (
                  <SearchFiltersPanel
                    projects={projects}
                    boards={boards}
                    allStickerDefs={allStickerDefs}
                    filterProjectIds={filterProjectIds}
                    filterBoardIds={filterBoardIds}
                    filterStickerIds={filterStickerIds}
                    setFilterProjectIds={setFilterProjectIds}
                    setFilterBoardIds={setFilterBoardIds}
                    setFilterStickerIds={setFilterStickerIds}
                    isDateSticker={isDateSticker}
                    getStickerStateOptions={getStickerStateOptions}
                    expandedStickerFilters={expandedStickerFilters}
                    toggleExpandedStickerFilter={toggleExpandedStickerFilter}
                    filterStickerValues={filterStickerValues}
                    toggleStickerValue={toggleStickerValue}
                    filterDateRanges={filterDateRanges}
                    setStickerDateRange={setStickerDateRange}
                    applyDatePreset={applyDatePreset}
                  />
                )}

                {searchQuery.trim() && (
                  <SearchResultsList
                    results={searchResults}
                    showAllResults={showAllResults}
                    setShowAllResults={setShowAllResults}
                    onSelect={goToSearchResult}
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {/* HEADER */}
        <div style={header}>
          <DndContext
    collisionDetection={closestCenter}
    onDragEnd={handleDragEnd}
    modifiers={[restrictToHorizontalAxis, restrictToParentElement]}
    sensors={sensors}
  >
            <SortableContext
              items={projectBoards.map(([id]) => id)}
              strategy={horizontalListSortingStrategy}
            >
              <div style={tabsContainer}>
                {projectBoards.map(([id, board]) => (
    <SortableTab
      key={id}
      id={id}
      name={board.name}
      isActive={id === activeBoardId}
      onSelect={() => setActiveBoardId(id)}
      onEdit={() => {
        setEditingBoard(id);
        setTempName(board.name);
      }}
      onDelete={() => setDeletingBoard(id)}
    />
  ))}
                {!isCreating && (
                  <button onClick={() => setIsCreating(true)} style={addBtn}>
                    +
                  </button>
                )}

                {isCreating && (
                  <input
                    autoFocus
                    maxLength={30}
                    value={newBoardName}
                    onChange={(e) => setNewBoardName(e.target.value)}
                    onBlur={() => setIsCreating(false)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        createBoard();
                        setIsCreating(false);
                      }
                    }}
                    placeholder="Название"
                    style={inputTab}
                  />
                )}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        {/* BOARD */}
        {activeBoard && (
          <Board
            board={activeBoard.data}
            setBoard={updateBoard}
            boards={boards}
            setBoards={setBoards}
            activeBoardId={activeBoardId}
            members={members}
            searchQuery={searchQuery}
          />
        )}
        </>
        )}

        {showWorkspaceManager && (
          <WorkspaceManager
            projects={projects}
            employees={employees}
            activeProjectId={activeProjectId}
            setActiveProjectId={(id) => {
              setActiveProjectId(id);
              setShowWorkspaceManager(false);
            }}
            onClose={() => setShowWorkspaceManager(false)}
            onRenameProject={renameProject}
            onDuplicateProject={duplicateProject}
            onDeleteProject={deleteProject}
            onToggleProjectMember={toggleProjectMember}
            onSetProjectMemberRole={setProjectMemberRole}
            onOpenCreateProject={() => { setShowWorkspaceManager(false); setShowCreateProject(true); }}
            onAddEmployee={addEmployee}
          />
        )}
      </div>

      {/* EDIT MODAL */}
      {editingBoard && (
  <div style={modalBg} onClick={() => setEditingBoard(null)}>
    <div style={modalBox} onClick={(e) => e.stopPropagation()}>
      <h2 style={{ margin: "0 0 18px", fontSize: "18px", fontWeight: "700", color: "#111827" }}>
        ✏️ Переименовать доску
      </h2>

      <label style={{ fontSize: "13px", fontWeight: "600", color: "#374151" }}>Название</label>
      <input
        autoFocus
        value={tempName}
        maxLength={30}
        onChange={(e) => setTempName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            renameBoard(editingBoard, tempName);
            setEditingBoard(null);
          }
        }}
        style={{
          display: "block",
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
        }}
      />

      <button
        onClick={() => { renameBoard(editingBoard, tempName); setEditingBoard(null); }}
        style={{
          width: "100%",
          padding: "10px",
          border: "none",
          borderRadius: "8px",
          background: "#2563eb",
          color: "white",
          cursor: "pointer",
          fontSize: "14px",
          fontWeight: "500",
        }}
      >
        Сохранить
      </button>
    </div>
  </div>
)}

      {/* DELETE MODAL */}
      {deletingBoard && (
  <div style={modalBg} onClick={() => setDeletingBoard(null)}>
    <div style={modalBox} onClick={(e) => e.stopPropagation()}>
      <h2 style={{ margin: "0 0 8px", fontSize: "18px", fontWeight: "700", color: "#111827" }}>
        Удалить доску?
      </h2>
      <p style={{ margin: "0 0 20px", fontSize: "14px", color: "#6b7280" }}>
        Это действие нельзя отменить. Все карточки и колонки будут удалены.
      </p>

      <button
        onClick={() => { deleteBoard(deletingBoard); setDeletingBoard(null); }}
        style={{
          width: "100%",
          padding: "10px",
          border: "1.5px solid #fca5a5",
          borderRadius: "8px",
          background: "white",
          color: "#ef4444",
          cursor: "pointer",
          fontSize: "14px",
          fontWeight: "500",
        }}
      >
        Удалить
      </button>

      <button
        onClick={() => setDeletingBoard(null)}
        style={{
          width: "100%",
          padding: "10px",
          marginTop: "8px",
          border: "1.5px solid #e5e7eb",
          borderRadius: "8px",
          background: "white",
          color: "#374151",
          cursor: "pointer",
          fontSize: "14px",
          fontWeight: "500",
        }}
      >
        Отмена
      </button>
    </div>
  </div>
)}

      {/* MEMBERS MODAL — участники текущего проекта (выбор из сотрудников компании + роль) */}
      {showMembersModal && (
        <div style={modalBg} onClick={() => setShowMembersModal(false)}>
          <div style={{ ...modalBox, width: "400px", maxHeight: "80vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ margin: "0 0 4px", fontSize: "18px", fontWeight: "700", color: "#111827" }}>
              👥 Участники
            </h2>
            <p style={{ margin: "0 0 16px", fontSize: "13px", color: "#6b7280" }}>
              Проект: {activeProject?.name}
            </p>
            {employees.map((emp) => {
              const membership = (activeProject?.members || []).find((m) => m.employeeId === emp.id);
              const checked = !!membership;
              return (
                <div key={emp.id} style={{ ...memberRow, alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: "140px", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleProjectMember(activeProjectId, emp.id)}
                      style={{ width: "16px", height: "16px", cursor: "pointer" }}
                    />
                    <span>
                      <div style={{ fontWeight: "500" }}>{emp.name}</div>
                      <div style={{ fontSize: "12px", color: "#9ca3af" }}>{emp.position || "—"}</div>
                    </span>
                  </label>
                  {checked && (
                    <select
                      value={membership.role}
                      onChange={(e) => setProjectMemberRole(activeProjectId, emp.id, e.target.value)}
                      style={{
                        padding: "6px 10px", borderRadius: "7px", border: "1.5px solid #e5e7eb",
                        fontSize: "13px", color: PROJECT_ROLES[membership.role].color,
                        background: PROJECT_ROLES[membership.role].bg, cursor: "pointer",
                      }}
                    >
                      <option value="curator">Куратор</option>
                      <option value="executor">Исполнитель</option>
                    </select>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CREATE PROJECT MODAL */}
      {showCreateProject && (
        <div style={modalBg} onClick={() => { setShowCreateProject(false); setNewProjectName(""); setNewProjectMembers([]); }}>
          <div style={{ ...modalBox, width: "400px", maxHeight: "80vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ margin: "0 0 18px", fontSize: "18px", fontWeight: "700", color: "#111827" }}>
              💼 Новый проект
            </h2>

            <label style={{ fontSize: "13px", fontWeight: "600", color: "#374151" }}>Название</label>
            <input
              autoFocus
              value={newProjectName}
              maxLength={40}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") createProject(); }}
              placeholder="Название проекта"
              style={{ display: "block", width: "100%", padding: "10px 12px", marginTop: "6px", marginBottom: "18px", borderRadius: "8px", border: "1.5px solid #e5e7eb", fontSize: "14px", background: "#f9fafb", color: "#111827", outline: "none", boxSizing: "border-box" }}
            />

            <label style={{ fontSize: "13px", fontWeight: "600", color: "#374151", display: "block", marginBottom: "10px" }}>Участники</label>

            {employees.map((emp) => {
              const membership = newProjectMembers.find((m) => m.employeeId === emp.id);
              const checked = !!membership;
              return (
                <div key={emp.id} style={{ ...memberRow, alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: "140px", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleMemberForNewProject(emp.id)}
                      style={{ width: "16px", height: "16px", cursor: "pointer" }}
                    />
                    <span>
                      <div style={{ fontWeight: "500" }}>{emp.name}</div>
                      <div style={{ fontSize: "12px", color: "#9ca3af" }}>{emp.position || "—"}</div>
                    </span>
                  </label>
                  {checked && (
                    <select
                      value={membership.role}
                      onChange={(e) => setNewProjectMemberRole(emp.id, e.target.value)}
                      style={{
                        padding: "6px 10px", borderRadius: "7px", border: "1.5px solid #e5e7eb",
                        fontSize: "13px", color: PROJECT_ROLES[membership.role].color,
                        background: PROJECT_ROLES[membership.role].bg, cursor: "pointer",
                      }}
                    >
                      <option value="curator">Куратор</option>
                      <option value="executor">Исполнитель</option>
                    </select>
                  )}
                </div>
              );
            })}

            <button
              onClick={createProject}
              disabled={!newProjectName.trim()}
              style={{ width: "100%", padding: "10px", marginTop: "8px", border: "none", borderRadius: "8px", background: newProjectName.trim() ? "#2563eb" : "#e5e7eb", color: newProjectName.trim() ? "white" : "#9ca3af", cursor: newProjectName.trim() ? "pointer" : "not-allowed", fontSize: "14px", fontWeight: "500" }}
            >
              Создать проект
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
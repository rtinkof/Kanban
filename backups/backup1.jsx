import { useState, useEffect } from "react";

import {
  DndContext,
  closestCenter,
  DragOverlay,
  useDroppable,
} from "@dnd-kit/core";

import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";

export default function App() {
  const [board, setBoard] = useState(() => {
    const savedBoard =
      localStorage.getItem("kanban-board");

    if (savedBoard) {
      return JSON.parse(savedBoard);
    }

    return {
      todo: {
        title: "To Do",
        cards: [
          {
            id: "todo-1",
            text: "Сделать ДЗ",
            note: "математика",
          },
          {
            id: "todo-2",
            text: "Выучить React",
            note: "useState",
          },
        ],
      },

      inProgress: {
        title: "In Progress",
        cards: [
          {
            id: "progress-1",
            text: "Делать проект",
            note: "канбан",
          },
        ],
      },

      done: {
        title: "Done",
        cards: [
          {
            id: "done-1",
            text: "Установить Node",
            note: "",
          },
        ],
      },
    };
  });

  const [selectedCard, setSelectedCard] =
    useState(null);

  const [activeCard, setActiveCard] =
    useState(null);

  const [activeColumn, setActiveColumn] =
    useState(null);

  const [isAdding, setIsAdding] =
    useState(null);

  const [newText, setNewText] =
    useState("");

  const [newNote, setNewNote] =
    useState("");

  const [isAddingColumn, setIsAddingColumn] =
    useState(false);

  const [newColumnTitle, setNewColumnTitle] =
    useState("");

  const [editingColumn, setEditingColumn] =
    useState(null);

  const [editingTitle, setEditingTitle] =
    useState("");

  useEffect(() => {
    localStorage.setItem(
      "kanban-board",
      JSON.stringify(board)
    );
  }, [board]);

  function findColumn(cardId) {
    return Object.keys(board).find((col) =>
      board[col].cards.some(
        (c) => c.id === cardId
      )
    );
  }

  function handleDragStart(event) {
  const activeId = event.active.id;

  // DRAG КОЛОНКИ
  if (
    Object.keys(board).includes(activeId)
  ) {
    setActiveColumn(activeId);
    return;
  }

  // DRAG КАРТОЧКИ
  const column = findColumn(activeId);

  const card = board[column].cards.find(
    (c) => c.id === activeId
  );

  setActiveCard(card);
}

  function handleDragEnd(event) {
    const { active, over } = event;

    setActiveCard(null);
    setActiveColumn(null);
    if (!over) return;

    // ===== ПЕРЕТАСКИВАНИЕ КОЛОНОК =====

    if (
      Object.keys(board).includes(active.id)
    ) {
      if (active.id !== over.id) {
        const oldIndex =
          Object.keys(board).indexOf(
            active.id
          );

        const newIndex =
          Object.keys(board).indexOf(
            over.id
          );

        const entries =
          Object.entries(board);

        const newEntries = arrayMove(
          entries,
          oldIndex,
          newIndex
        );

        setBoard(
          Object.fromEntries(newEntries)
        );
      }

      return;
    }

    // ===== ПЕРЕТАСКИВАНИЕ КАРТОЧЕК =====

    const activeCol = findColumn(
      active.id
    );

    const overCol =
      findColumn(over.id) || over.id;

    if (!activeCol || !overCol) return;

    if (activeCol === overCol) {
      const oldIndex =
        board[activeCol].cards.findIndex(
          (c) => c.id === active.id
        );

      const newIndex =
        board[overCol].cards.findIndex(
          (c) => c.id === over.id
        );

      setBoard((prev) => ({
        ...prev,

        [activeCol]: {
          ...prev[activeCol],

          cards: arrayMove(
            prev[activeCol].cards,
            oldIndex,
            newIndex
          ),
        },
      }));
    } else {
      const activeIndex =
        board[activeCol].cards.findIndex(
          (c) => c.id === active.id
        );

      const item =
        board[activeCol].cards[
          activeIndex
        ];

      setBoard((prev) => {
        const newFrom = [
          ...prev[activeCol].cards,
        ];

        newFrom.splice(activeIndex, 1);

        const newTo = [
          ...prev[overCol].cards,
        ];

        newTo.push(item);

        return {
          ...prev,

          [activeCol]: {
            ...prev[activeCol],
            cards: newFrom,
          },

          [overCol]: {
            ...prev[overCol],
            cards: newTo,
          },
        };
      });
    }
  }

  function addCard() {
    if (!newText.trim()) return;

    const newCard = {
      id: Date.now().toString(),
      text: newText,
      note: newNote,
    };

    setBoard((prev) => ({
      ...prev,

      [isAdding]: {
        ...prev[isAdding],

        cards: [
          ...prev[isAdding].cards,
          newCard,
        ],
      },
    }));

    setNewText("");
    setNewNote("");
    setIsAdding(null);
  }

  function updateCard() {
    setBoard((prev) => {
      const newCards =
        prev[selectedCard.column].cards.map(
          (card) => {
            if (
              card.id === selectedCard.id
            ) {
              return selectedCard;
            }

            return card;
          }
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

  function deleteCard() {
    setBoard((prev) => {
      const newCards =
        prev[
          selectedCard.column
        ].cards.filter(
          (card) =>
            card.id !== selectedCard.id
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

    const columnId =
      Date.now().toString();

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
    if (
      !confirm("Удалить колонку?")
    )
      return;

    setBoard((prev) => {
      const newBoard = { ...prev };

      delete newBoard[columnKey];

      return newBoard;
    });
  }

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div
        style={{
          padding: "20px",
          background: "#f4f6f8",
          minHeight: "100vh",
          fontFamily: "Arial",
        }}
      >
        <div
          style={{
            maxWidth: "1400px",
            margin: "0 auto",
          }}
        >
          <h1
            style={{
              textAlign: "center",
              marginBottom: "40px",
              color: "#1f2937",
            }}
          >
            Канбан доска
          </h1>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: "20px",
            }}
          >
            <button
              onClick={() =>
                setIsAddingColumn(true)
              }
              style={{
                padding: "10px 16px",
                borderRadius: "8px",
                border: "none",
                background: "#111827",
                color: "white",
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              + Добавить колонку
            </button>
          </div>

          <SortableContext
            items={Object.keys(board)}
            strategy={
              horizontalListSortingStrategy
            }
          >
            <div
              style={{
                display: "flex",
                gap: "20px",
                alignItems: "flex-start",
              }}
            >
              {Object.entries(board).map(
                ([key, column]) => (
                  <Column
  key={key}
  columnKey={key}
  title={column.title}
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
        onClick={() =>
          deleteColumn(key)
        }
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
>

                    <SortableContext
                      items={
                        column.cards.length > 0
                          ? column.cards.map(
                              (c) => c.id
                            )
                          : [key]
                      }
                      strategy={
                        verticalListSortingStrategy
                      }
                    >
                      {column.cards.map(
                        (card) => (
                          <Card
                            key={card.id}
                            card={card}
                            onClick={() =>
                              setSelectedCard({
                                ...card,
                                column: key,
                              })
                            }
                          />
                        )
                      )}

                      {column.cards.length ===
                        0 && (
                        <EmptyColumn
                          id={key}
                        />
                      )}
                    </SortableContext>

                    <button
                      onClick={() =>
                        setIsAdding(key)
                      }
                      style={btn}
                    >
                      + Добавить
                    </button>
                  </Column>
                )
              )}
            </div>
          </SortableContext>
        </div>

        {/* МОДАЛКА РЕДАКТИРОВАНИЯ */}

        {selectedCard && (
          <div
            onClick={() =>
              setSelectedCard(null)
            }
            style={modalBg}
          >
            <div
              onClick={(e) =>
                e.stopPropagation()
              }
              style={modalBox}
            >
              <h2 style={title}>
                Редактировать задачу
              </h2>

              <label>Название</label>

              <input
                value={selectedCard.text}
                maxLength={100}
                onChange={(e) =>
                  setSelectedCard({
                    ...selectedCard,
                    text: e.target.value,
                  })
                }
                style={input}
              />

              {selectedCard.text.length >=
                100 && (
                <div style={error}>
                  Максимум 100 символов
                </div>
              )}

              <label>Примечание</label>

              <textarea
                value={selectedCard.note}
                onChange={(e) =>
                  setSelectedCard({
                    ...selectedCard,
                    note: e.target.value,
                  })
                }
                style={{
                  ...input,
                  height: "100px",
                }}
              />

              <button
                onClick={updateCard}
                style={btn}
              >
                Сохранить
              </button>

              <button
                onClick={deleteCard}
                style={{
                  ...btn,
                  background: "#dc2626",
                }}
              >
                Удалить
              </button>
            </div>
          </div>
        )}

        {/* МОДАЛКА СОЗДАНИЯ КАРТОЧКИ */}

        {isAdding && (
          <div
            onClick={() =>
              setIsAdding(null)
            }
            style={modalBg}
          >
            <div
              onClick={(e) =>
                e.stopPropagation()
              }
              style={modalBox}
            >
              <h2 style={title}>
                Новая задача
              </h2>

              <label>Название</label>

              <input
                autoFocus
                value={newText}
                maxLength={100}
                onChange={(e) =>
                  setNewText(
                    e.target.value
                  )
                }
                style={input}
              />

              {newText.length >= 100 && (
                <div style={error}>
                  Максимум 100 символов
                </div>
              )}

              <label>Примечание</label>

              <textarea
                value={newNote}
                onChange={(e) =>
                  setNewNote(
                    e.target.value
                  )
                }
                style={{
                  ...input,
                  height: "100px",
                }}
              />

              <button
                onClick={addCard}
                style={btn}
              >
                Добавить
              </button>
            </div>
          </div>
        )}

        {/* МОДАЛКА СОЗДАНИЯ КОЛОНКИ */}

        {isAddingColumn && (
          <div
            onClick={() =>
              setIsAddingColumn(false)
            }
            style={modalBg}
          >
            <div
              onClick={(e) =>
                e.stopPropagation()
              }
              style={modalBox}
            >
              <h2 style={title}>
                Новая колонка
              </h2>

              <label>Название</label>

              <input
                autoFocus
                value={newColumnTitle}
                maxLength={20}
                onChange={(e) =>
                  setNewColumnTitle(
                    e.target.value
                  )
                }
                style={input}
              />

              {newColumnTitle.length >=
                20 && (
                <div style={error}>
                  Максимум 20 символов
                </div>
              )}

              <button
                onClick={addColumn}
                style={btn}
              >
                Создать
              </button>
            </div>
          </div>
        )}

        {/* МОДАЛКА РЕДАКТИРОВАНИЯ КОЛОНКИ */}

        {editingColumn && (
          <div
            onClick={() =>
              setEditingColumn(null)
            }
            style={modalBg}
          >
            <div
              onClick={(e) =>
                e.stopPropagation()
              }
              style={modalBox}
            >
              <h2 style={title}>
                Редактировать колонку
              </h2>

              <label>Название</label>

              <input
                autoFocus
                value={editingTitle}
                maxLength={20}
                onChange={(e) =>
                  setEditingTitle(
                    e.target.value
                  )
                }
                style={input}
              />

              {editingTitle.length >=
                20 && (
                <div style={error}>
                  Максимум 20 символов
                </div>
              )}

              <button
                onClick={
                  updateColumnTitle
                }
                style={btn}
              >
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
        boxShadow:
          "0 8px 20px rgba(0,0,0,0.15)",
        width: "240px",
        opacity: 0.9,
        cursor: "grabbing",
      }}
    >
      {activeCard.text}
    </div>
  ) : activeColumn ? (
  <div
    style={{
      width: "280px",
      minHeight: "200px",

      background: "white",

      padding: "12px",

      borderRadius: "10px",

      boxShadow:
        "0 10px 30px rgba(0,0,0,0.2)",

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
) : null}
</DragOverlay>
    </DndContext>
  );
}

function Column({
  columnKey,
  title,
  headerButtons,
  children,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: columnKey,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform:
          CSS.Transform.toString(transform),

        transition,

        opacity: isDragging ? 0 : 1,

        width: "280px",
        minHeight: "200px",

        background: "white",
        padding: "12px",

        borderRadius: "10px",

        boxShadow:
          "0 2px 10px rgba(0,0,0,0.1)",
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
        {/* DRAG ONLY HERE */}
        <div
          {...attributes}
          {...listeners}
          style={{
            cursor: "grab",
            flex: 1,
            userSelect: "none",
          }}
        >
          <h3
            style={{
              margin: 0,
            }}
          >
            {title}
          </h3>
        </div>

        {/* BUTTONS */}
        <div
          style={{
            display: "flex",
            gap: "5px",
          }}
        >
          {headerButtons}
        </div>
      </div>

      {children}
    </div>
  );
}

function EmptyColumn({ id }) {
  const { setNodeRef, isOver } =
    useDroppable({
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

        background: isOver
          ? "#eff6ff"
          : "transparent",

        transition: "0.2s",
      }}
    >
      Перетащите карточку сюда
    </div>
  );
}

function Card({ card, onClick }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
  });

  const style = {
    transform:
      CSS.Transform.toString(transform),

    transition:
      transition || "0.2s",

    opacity: isDragging ? 0.3 : 1,

    background: "#f9fafb",

    padding: "10px",
    marginBottom: "8px",

    borderRadius: "6px",

    border: "1px solid #e5e7eb",

    wordBreak: "break-word",
    whiteSpace: "normal",

    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",

    gap: "10px",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
    >
      <div
        {...attributes}
        {...listeners}
        style={{
          flex: 1,
          cursor: "grab",
          userSelect: "none",
        }}
      >
        {card.text}
      </div>

      <button
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
  );
}

/* СТИЛИ */

const modalBg = {
  position: "fixed",
  inset: 0,

  background: "rgba(0,0,0,0.4)",

  display: "flex",
  justifyContent: "center",
  alignItems: "center",
};

const modalBox = {
  background: "white",

  width: "420px",

  padding: "20px",

  borderRadius: "10px",

  boxShadow:
    "0 4px 20px rgba(0,0,0,0.15)",
};

const input = {
  width: "100%",

  padding: "8px",

  marginTop: "5px",
  marginBottom: "10px",

  borderRadius: "6px",

  border: "1px solid #d1d5db",

  fontSize: "14px",
};

const btn = {
  width: "100%",

  padding: "8px",

  marginTop: "10px",

  border: "none",

  borderRadius: "6px",

  background: "#2563eb",

  color: "white",

  cursor: "pointer",
};

const title = {
  color: "#1f2937",

  marginBottom: "15px",
};

const error = {
  color: "red",

  fontSize: "12px",

  marginBottom: "10px",
};


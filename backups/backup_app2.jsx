import { useState, useEffect } from "react";
import Board from "./Board";

export default function App() {
  const [boards, setBoards] = useState(() => {
    const saved = localStorage.getItem("kanban-boards");
    return saved ? JSON.parse(saved) : {};
  });

  const [activeBoardId, setActiveBoardId] = useState(() => {
  return localStorage.getItem("active-board-id");
});
  const [newBoardName, setNewBoardName] = useState("");

  useEffect(() => {
    localStorage.setItem("kanban-boards", JSON.stringify(boards));
  }, [boards]);
useEffect(() => {
  if (activeBoardId) {
    localStorage.setItem("active-board-id", activeBoardId);
  }
}, [activeBoardId]);
useEffect(() => {
  if (activeBoardId && !boards[activeBoardId]) {
    const firstId = Object.keys(boards)[0];
    setActiveBoardId(firstId || null);
  }
}, [boards, activeBoardId]);
  function createBoard() {
    if (!newBoardName.trim()) return;

    const id = Date.now().toString();

    setBoards((prev) => ({
      ...prev,
      [id]: {
        name: newBoardName,
        data: {
          todo: { title: "To Do", cards: [] },
          inProgress: { title: "In Progress", cards: [] },
          done: { title: "Done", cards: [] },
        },
      },
    }));

    setActiveBoardId(id);
    setNewBoardName("");
  }

function deleteBoard(id) {
  if (!confirm("Удалить доску?")) return;

  setBoards((prev) => {
    const newBoards = { ...prev };
    delete newBoards[id];

    // 👇 ВОТ СЮДА ВСТАВЛЯЕМ ЛОГИКУ
    const remainingIds = Object.keys(newBoards);

    if (id === activeBoardId) {
      setActiveBoardId(remainingIds[0] || null);
    }

    return newBoards;
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
    <div style={{ padding: "20px" }}>
      <h1>Мои доски</h1>

      {/* СОЗДАНИЕ ДОСКИ */}
      <input
        value={newBoardName}
        onChange={(e) => setNewBoardName(e.target.value)}
        placeholder="Название доски"
      />
      <button onClick={createBoard}>Создать</button>

      {/* СПИСОК ДОСОК */}
      <div style={{ marginTop: "20px" }}>
        {Object.entries(boards).map(([id, board]) => (
  <div key={id} style={{ display: "inline-flex", marginRight: "10px" }}>
    
    <button onClick={() => setActiveBoardId(id)}>
      {board.name}
    </button>

    <button
      onClick={() => deleteBoard(id)}
      style={{
        marginLeft: "5px",
        color: "red",
        border: "none",
        cursor: "pointer"
      }}
    >
      ✕
    </button>

  </div>
))}
      </div>

      {/* САМА ДОСКА */}
      {activeBoard && (
        <Board
          board={activeBoard.data}
          setBoard={updateBoard}
        />
      )}
    </div>
  );
  console.log(activeBoard);
}
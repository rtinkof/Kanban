import prisma from "../prisma.js";

// POST /api/boards/:boardId/columns — создать колонку в конце доски
export async function createColumn(req, res) {
  try {
    const boardId = Number(req.params.boardId);
    const { title } = req.body;

    const count = await prisma.column.count({ where: { boardId } });

    const column = await prisma.column.create({
      data: { title: title || "Новая колонка", boardId, position: count },
    });

    res.json({ success: true, column });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Ошибка сервера при создании колонки" });
  }
}

// PATCH /api/columns/:columnId — переименовать колонку
export async function renameColumn(req, res) {
  try {
    const columnId = Number(req.params.columnId);
    const { title } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: "Укажите название" });
    }

    const column = await prisma.column.update({
      where: { id: columnId },
      data: { title: title.trim() },
    });

    res.json({ success: true, column });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Ошибка сервера" });
  }
}

// DELETE /api/columns/:columnId — удалить колонку (карточки удалятся каскадно)
export async function deleteColumn(req, res) {
  try {
    const columnId = Number(req.params.columnId);
    await prisma.column.delete({ where: { id: columnId } });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Ошибка сервера при удалении колонки" });
  }
}

// PATCH /api/columns/:columnId/position — переместить колонку на новую позицию
// (например, при перетаскивании колонок на доске)
export async function moveColumn(req, res) {
  try {
    const columnId = Number(req.params.columnId);
    const { position } = req.body;

    if (typeof position !== "number") {
      return res.status(400).json({ success: false, message: "Укажите новую позицию" });
    }

    const column = await prisma.column.update({
      where: { id: columnId },
      data: { position },
    });

    res.json({ success: true, column });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Ошибка сервера" });
  }
}

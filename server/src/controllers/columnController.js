/**
 * Контроллер колонок — создание, переименование, удаление, перемещение.
 * Перемещение и удаление корректно сдвигают позиции остальных колонок в доске.
 */
import prisma from "../prisma.js";

/* POST /api/boards/:boardId/columns — создать колонку в конце доски */
export async function createColumn(req, res) {
  try {
    const boardId = Number(req.params.boardId);
    const { title } = req.body;

    const board = await prisma.board.findUnique({ where: { id: boardId } });
    if (!board || board.projectId !== req.projectId) {
      return res.status(403).json({ success: false, message: "Доска вне доступного проекта" });
    }

    const count = await prisma.column.count({ where: { boardId } });

    const column = await prisma.column.create({
      data: { title: title || "Новая колонка", boardId, position: count },
    });

    res.status(201).json({ success: true, column });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Ошибка сервера при создании колонки" });
  }
}

/* PATCH /api/columns/:columnId — переименовать колонку */
export async function renameColumn(req, res) {
  try {
    const columnId = Number(req.params.columnId);
    const { title } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: "Укажите название" });
    }

    const column = await prisma.column.findUnique({
      where: { id: columnId },
      include: { board: true },
    });
    if (!column || column.board.projectId !== req.projectId) {
      return res.status(403).json({ success: false, message: "Колонка вне доступного проекта" });
    }

    const updated = await prisma.column.update({
      where: { id: columnId },
      data: { title: title.trim() },
    });

    res.json({ success: true, column: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Ошибка сервера при переименовании колонки" });
  }
}

/* DELETE /api/columns/:columnId — удалить колонку (карточки удалятся каскадно) */
export async function deleteColumn(req, res) {
  try {
    const columnId = Number(req.params.columnId);

    const column = await prisma.column.findUnique({ where: { id: columnId }, include: { board: true } });
    if (!column || column.board.projectId !== req.projectId) {
      return res.status(403).json({ success: false, message: "Колонка вне доступного проекта" });
    }

    const boardId = column.boardId;
    const pos = column.position;

    // Удаляем колонку и сдвигаем позиции колонок правее на -1
    await prisma.$transaction([
      prisma.column.delete({ where: { id: columnId } }),
      prisma.column.updateMany({
        where: {
          boardId,
          position: { gt: pos },
        },
        data: { position: { decrement: 1 } },
      }),
    ]);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Ошибка сервера при удалении колонки" });
  }
}

/* PATCH /api/columns/:columnId/position — переместить колонку на новую позицию */
export async function moveColumn(req, res) {
  try {
    const columnId = Number(req.params.columnId);
    const { position: toPositionRaw } = req.body;

    if (toPositionRaw === undefined) {
      return res.status(400).json({ success: false, message: "Укажите новую позицию" });
    }
    let toPos = Number(toPositionRaw);
    if (Number.isNaN(toPos)) {
      return res.status(400).json({ success: false, message: "Позиция должна быть числом" });
    }

    const column = await prisma.column.findUnique({
      where: { id: columnId },
      include: { board: true },
    });
    if (!column || column.board.projectId !== req.projectId) {
      return res.status(403).json({ success: false, message: "Колонка вне доступного проекта" });
    }

    const boardId = column.boardId;
    const fromPos = column.position;

    const count = await prisma.column.count({ where: { boardId } });
    if (toPos < 0) toPos = 0;
    if (toPos > count - 1) toPos = count - 1; // last index

    if (fromPos === toPos) {
      return res.json({ success: true, column });
    }

    const ops = [];

    if (toPos > fromPos) {
      // сдвигаем колонки с (fromPos, toPos] на -1
      ops.push(
        prisma.column.updateMany({
          where: {
            boardId,
            position: { gt: fromPos, lte: toPos },
          },
          data: { position: { decrement: 1 } },
        })
      );
    } else {
      // toPos < fromPos: сдвигаем колонки с [toPos, fromPos) на +1
      ops.push(
        prisma.column.updateMany({
          where: {
            boardId,
            position: { gte: toPos, lt: fromPos },
          },
          data: { position: { increment: 1 } },
        })
      );
    }

    ops.push(
      prisma.column.update({
        where: { id: columnId },
        data: { position: toPos },
      })
    );

    await prisma.$transaction(ops);

    const updated = await prisma.column.findUnique({ where: { id: columnId } });
    res.json({ success: true, column: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Ошибка сервера при перемещении колонки" });
  }
}
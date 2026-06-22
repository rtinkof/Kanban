import prisma from "../prisma.js";

// GET /api/projects/:projectId/boards — все доски проекта (с колонками и карточками)
export async function getBoards(req, res) {
  try {
    const projectId = Number(req.params.projectId);

    const boards = await prisma.board.findMany({
      where: { projectId },
      orderBy: { position: "asc" },
      include: {
        columns: {
          orderBy: { position: "asc" },
          include: {
            cards: {
              orderBy: { position: "asc" },
              include: { stickers: true, assignee: true },
            },
          },
        },
      },
    });

    res.json({ success: true, boards });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Ошибка сервера" });
  }
}

// POST /api/projects/:projectId/boards — создать доску (сразу с одной колонкой)
export async function createBoard(req, res) {
  try {
    const projectId = Number(req.params.projectId);
    const { title } = req.body;

    // позиция новой доски — в конец списка
    const count = await prisma.board.count({ where: { projectId } });

    const board = await prisma.board.create({
      data: {
        title: title || "Новая доска",
        projectId,
        position: count,
        columns: { create: { title: "Новая колонка", position: 0 } },
      },
      include: { columns: true },
    });

    res.json({ success: true, board });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Ошибка сервера при создании доски" });
  }
}

// PATCH /api/boards/:boardId — переименовать доску
export async function renameBoard(req, res) {
  try {
    const boardId = Number(req.params.boardId);
    const { title } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: "Укажите название" });
    }

    const board = await prisma.board.update({
      where: { id: boardId },
      data: { title: title.trim() },
    });

    res.json({ success: true, board });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Ошибка сервера" });
  }
}

// DELETE /api/boards/:boardId — удалить доску (колонки и карточки удалятся каскадно)
export async function deleteBoard(req, res) {
  try {
    const boardId = Number(req.params.boardId);
    await prisma.board.delete({ where: { id: boardId } });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Ошибка сервера при удалении доски" });
  }
}

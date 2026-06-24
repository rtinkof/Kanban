import prisma from "../prisma.js";

export default async function requireProjectAccess(req, res, next) {
  try {
    const userId = req.user.id;
    let projectId = null;

    if (req.params.projectId) {
      projectId = Number(req.params.projectId);
    } else if (req.params.boardId) {
      const board = await prisma.board.findUnique({ 
        where: { id: Number(req.params.boardId) } 
      });
      if (!board) return res.status(404).json({ success: false, message: "Доска не найдена" });
      projectId = board.projectId;
    } else if (req.params.columnId) {
      const column = await prisma.column.findUnique({
        where: { id: Number(req.params.columnId) },
        include: { board: true },
      });
      if (!column) return res.status(404).json({ success: false, message: "Колонка не найдена" });
      projectId = column.board.projectId;
    } else if (req.params.cardId) {
      const card = await prisma.card.findUnique({
        where: { id: Number(req.params.cardId) },
        include: { column: { include: { board: true } } },
      });
      if (!card) return res.status(404).json({ success: false, message: "Карточка не найдена" });
      projectId = card.column.board.projectId;
    } else if (req.params.stickerId) {
      const sticker = await prisma.sticker.findUnique({
        where: { id: Number(req.params.stickerId) },
        include: { card: { include: { column: { include: { board: true } } } } },
      });
      if (!sticker) return res.status(404).json({ success: false, message: "Стикер не найден" });
      projectId = sticker.card.column.board.projectId;
    } else if (req.params.customStickerId) {
      // ← ИСПРАВЛЕННЫЙ БЛОК
      const customSticker = await prisma.customSticker.findUnique({
        where: { id: Number(req.params.customStickerId) },
        include: { board: { include: { project: true } } },
      });
      if (!customSticker) return res.status(404).json({ success: false, message: "Кастомный стикер не найден" });
      projectId = customSticker.board.projectId;  // ← ПРАВИЛЬНО: projectId лежит в board
    } else {
      return res.status(400).json({ success: false, message: "Не указан проект/доска/колонка/карточка/стикер" });
    }

    const hasAccess = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [{ ownerId: userId }, { members: { some: { userId } } }],
      },
    });

    if (!hasAccess) {
      return res.status(403).json({ success: false, message: "Нет доступа к этому проекту" });
    }

    req.projectId = projectId;
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Ошибка проверки доступа" });
  }
}
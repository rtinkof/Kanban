import prisma from "../prisma.js";

// POST /api/columns/:columnId/cards — создать карточку в конце колонки
export async function createCard(req, res) {
  try {
    const columnId = Number(req.params.columnId);
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: "Текст карточки не может быть пустым" });
    }

    const count = await prisma.card.count({ where: { columnId } });

    const card = await prisma.card.create({
      data: { text: text.trim(), columnId, position: count },
      include: { stickers: true, assignee: true },
    });

    res.json({ success: true, card });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Ошибка сервера при создании карточки" });
  }
}

// PATCH /api/cards/:cardId — обновить текст / завершённость / дедлайн / исполнителя карточки
// Можно передавать любое подмножество полей — обновятся только переданные.
export async function updateCard(req, res) {
  try {
    const cardId = Number(req.params.cardId);
    const { text, completed, deadline, assigneeId } = req.body;

    const data = {};
    if (text !== undefined) data.text = text;
    if (completed !== undefined) data.completed = completed;
    if (deadline !== undefined) data.deadline = deadline ? new Date(deadline) : null;

    // Исполнителем карточки может быть только участник того же проекта
    // (req.projectId уже проверен и положен туда мидлваром requireProjectAccess).
    if (assigneeId !== undefined) {
      if (assigneeId === null) {
        data.assigneeId = null;
      } else {
        const isMember = await prisma.projectMember.findUnique({
          where: { projectId_userId: { projectId: req.projectId, userId: assigneeId } },
        });
        const isOwner = await prisma.project.findFirst({
          where: { id: req.projectId, ownerId: assigneeId },
        });
        if (!isMember && !isOwner) {
          return res.status(400).json({
            success: false,
            message: "Этот пользователь не состоит в проекте и не может быть назначен исполнителем",
          });
        }
        data.assigneeId = assigneeId;
      }
    }

    const card = await prisma.card.update({
      where: { id: cardId },
      data,
      include: { stickers: true, assignee: true },
    });

    res.json({ success: true, card });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Ошибка сервера" });
  }
}

// DELETE /api/cards/:cardId — удалить карточку
export async function deleteCard(req, res) {
  try {
    const cardId = Number(req.params.cardId);
    await prisma.card.delete({ where: { id: cardId } });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Ошибка сервера при удалении карточки" });
  }
}

// PATCH /api/cards/:cardId/move — перенести карточку в другую колонку и/или на новую позицию
// (используется и для сортировки внутри колонки, и для переноса между колонками)
export async function moveCard(req, res) {
  try {
    const cardId = Number(req.params.cardId);
    const { columnId, position } = req.body;

    if (columnId === undefined || typeof position !== "number") {
      return res.status(400).json({ success: false, message: "Укажите columnId и position" });
    }

    // целевая колонка обязана быть в том же проекте, иначе можно было бы
    // перетащить карточку в чужой, недоступный проект
    const targetColumn = await prisma.column.findUnique({
      where: { id: columnId },
      include: { board: true },
    });
    if (!targetColumn || targetColumn.board.projectId !== req.projectId) {
      return res.status(403).json({ success: false, message: "Целевая колонка вне доступного проекта" });
    }

    const card = await prisma.card.update({
      where: { id: cardId },
      data: { columnId, position },
      include: { stickers: true, assignee: true },
    });

    res.json({ success: true, card });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Ошибка сервера" });
  }
}

// POST /api/cards/:cardId/stickers — добавить стикер на карточку
export async function addSticker(req, res) {
  try {
    const cardId = Number(req.params.cardId);
    const { type, value } = req.body;

    if (!type) {
      return res.status(400).json({ success: false, message: "Укажите тип стикера" });
    }

    const sticker = await prisma.sticker.create({
      data: { cardId, type, value },
    });

    res.json({ success: true, sticker });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Ошибка сервера" });
  }
}

// PATCH /api/stickers/:stickerId — изменить значение стикера
export async function updateSticker(req, res) {
  try {
    const stickerId = Number(req.params.stickerId);
    const { value } = req.body;

    const sticker = await prisma.sticker.update({
      where: { id: stickerId },
      data: { value },
    });

    res.json({ success: true, sticker });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Ошибка сервера" });
  }
}

// DELETE /api/stickers/:stickerId — убрать стикер с карточки
export async function deleteSticker(req, res) {
  try {
    const stickerId = Number(req.params.stickerId);
    await prisma.sticker.delete({ where: { id: stickerId } });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Ошибка сервера" });
  }
}

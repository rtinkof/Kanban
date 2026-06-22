/**
 * Контроллер карточек — создание, обновление, удаление, перемещение и работа со стикерами.
 *
 * Обратите внимание:
 * - Все операции, которые меняют позиции, выполняются в prisma.$transaction чтобы избежать
 *   состояния гонки и обеспечить консистентность.
 * - Маршруты уже настроены: cardRoutes.js использует requireProjectAccess, но здесь мы дополнительно
 *   проверяем принадлежность целевых сущностей к req.projectId.
 */
import prisma from "../prisma.js";

/* POST /api/columns/:columnId/cards — создать карточку в конце колонки */
export async function createCard(req, res) {
  try {
    const columnId = Number(req.params.columnId);
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: "Текст карточки не может быть пустым" });
    }

    // Проверяем доступ — целевая колонка должна быть в нужном проекте
    const column = await prisma.column.findUnique({
      where: { id: columnId },
      include: { board: true },
    });
    if (!column || column.board.projectId !== req.projectId) {
      return res.status(403).json({ success: false, message: "Колонка вне доступного проекта" });
    }

    const count = await prisma.card.count({ where: { columnId } });

    const card = await prisma.card.create({
      data: { text: text.trim(), columnId, position: count },
      include: { stickers: true, assignee: true },
    });

    res.status(201).json({ success: true, card });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Ошибка сервера при создании карточки" });
  }
}

/* PATCH /api/cards/:cardId — обновить текст / завершённость / дедлайн / исполнителя карточки */
export async function updateCard(req, res) {
  try {
    const cardId = Number(req.params.cardId);
    const { text, completed, deadline, assigneeId } = req.body;

    const data = {};
    if (text !== undefined) data.text = text;
    if (completed !== undefined) data.completed = completed;
    if (deadline !== undefined) data.deadline = deadline ? new Date(deadline) : null;

    if (assigneeId !== undefined) {
      if (assigneeId === null) {
        data.assigneeId = null;
      } else {
        // assignee должен быть участником проекта
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
    res.status(500).json({ success: false, message: "Ошибка сервера при обновлении карточки" });
  }
}

/* DELETE /api/cards/:cardId — удалить карточку (и поправить позиции в колонке) */
export async function deleteCard(req, res) {
  try {
    const cardId = Number(req.params.cardId);

    const card = await prisma.card.findUnique({ where: { id: cardId } });
    if (!card) return res.status(404).json({ success: false, message: "Карточка не найдена" });

    const columnId = card.columnId;
    const pos = card.position;

    // Удаляем карточку и сдвигаем позиции всех карточек правее на -1
    await prisma.$transaction([
      prisma.card.delete({ where: { id: cardId } }),
      prisma.card.updateMany({
        where: {
          columnId,
          position: { gt: pos },
        },
        data: { position: { decrement: 1 } },
      }),
    ]);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Ошибка сервера при удалении карточки" });
  }
}

/*
 PATCH /api/cards/:cardId/move — перенести карточку в другую колонку и/или на новую позицию
 Тело: { columnId: number, position: number }
 Логика:
  - валидируем входные данные
  - проверяем принадлежность source/target колонок к req.projectId
  - корректно сдвигаем позиции карточек в исходной и/или целевой колонке
  - все операции выполняются в транзакции
*/
export async function moveCard(req, res) {
  try {
    const cardId = Number(req.params.cardId);
    const { columnId: toColumnIdRaw, position: toPositionRaw } = req.body;

    if (toColumnIdRaw === undefined || toPositionRaw === undefined) {
      return res.status(400).json({ success: false, message: "Укажите columnId и position" });
    }
    const toColumnId = Number(toColumnIdRaw);
    let toPos = Number(toPositionRaw);
    if (Number.isNaN(toColumnId) || Number.isNaN(toPos)) {
      return res.status(400).json({ success: false, message: "columnId и position должны быть числами" });
    }

    // Загрузим карточку с колонкой и бордом
    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: {
        column: { include: { board: true } },
      },
    });
    if (!card) return res.status(404).json({ success: false, message: "Карточка не найдена" });

    // Проверяем, что карточка принадлежит доступному проекту
    if (card.column.board.projectId !== req.projectId) {
      return res.status(403).json({ success: false, message: "Карточка вне доступного проекта" });
    }

    // Загружаем целевую колонку
    const targetColumn = await prisma.column.findUnique({
      where: { id: toColumnId },
      include: { board: true },
    });
    if (!targetColumn || targetColumn.board.projectId !== req.projectId) {
      return res.status(403).json({ success: false, message: "Целевая колонка вне доступного проекта" });
    }

    const fromColumnId = card.columnId;
    const fromPos = card.position;
    const toColumnIdNum = toColumnId;

    // Нормализация позиции: если положили слишком большой индекс — положить в конец
    const targetCount = await prisma.card.count({ where: { columnId: toColumnIdNum } });
    if (toPos < 0) toPos = 0;
    if (toPos > targetCount) toPos = targetCount;

    // Ничего не делаем если место не поменялось
    if (fromColumnId === toColumnIdNum && fromPos === toPos) {
      const updated = await prisma.card.findUnique({
        where: { id: cardId },
        include: { stickers: true, assignee: true },
      });
      return res.json({ success: true, card: updated });
    }

    const ops = [];

    if (fromColumnId === toColumnIdNum) {
      // Перемещение внутри одной колонки
      if (toPos > fromPos) {
        // сдвигаем карточки между (fromPos, toPos] на -1
        ops.push(
          prisma.card.updateMany({
            where: {
              columnId: fromColumnId,
              position: { gt: fromPos, lte: toPos },
            },
            data: { position: { decrement: 1 } },
          })
        );
      } else {
        // toPos < fromPos: сдвигаем карточки между [toPos, fromPos) на +1
        ops.push(
          prisma.card.updateMany({
            where: {
              columnId: fromColumnId,
              position: { gte: toPos, lt: fromPos },
            },
            data: { position: { increment: 1 } },
          })
        );
      }
      // обновляем саму карточку
      ops.push(
        prisma.card.update({
          where: { id: cardId },
          data: { position: toPos },
        })
      );
    } else {
      // Перемещение между колонками:
      // 1) сдвинуть в старой колонке все позиций > fromPos на -1
      ops.push(
        prisma.card.updateMany({
          where: { columnId: fromColumnId, position: { gt: fromPos } },
          data: { position: { decrement: 1 } },
        })
      );
      // 2) сдвинуть в новой колонке все позиции >= toPos на +1
      ops.push(
        prisma.card.updateMany({
          where: { columnId: toColumnIdNum, position: { gte: toPos } },
          data: { position: { increment: 1 } },
        })
      );
      // 3) переместить карточку (columnId + position)
      ops.push(
        prisma.card.update({
          where: { id: cardId },
          data: { columnId: toColumnIdNum, position: toPos },
        })
      );
    }

    await prisma.$transaction(ops);

    const updated = await prisma.card.findUnique({
      where: { id: cardId },
      include: { stickers: true, assignee: true },
    });

    res.json({ success: true, card: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Ошибка сервера при перемещении карточки" });
  }
}

/* POST /api/cards/:cardId/stickers — добавить стикер на карточку */
export async function addSticker(req, res) {
  try {
    const cardId = Number(req.params.cardId);
    const { type, value } = req.body;

    if (!type) {
      return res.status(400).json({ success: false, message: "Укажите тип стикера" });
    }

    // Проверяем карточку и проектную принадлежность
    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: { column: { include: { board: true } } },
    });
    if (!card || card.column.board.projectId !== req.projectId) {
      return res.status(403).json({ success: false, message: "Карточка вне доступного проекта" });
    }

    const sticker = await prisma.sticker.create({
      data: { cardId, type, value },
    });

    res.status(201).json({ success: true, sticker });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Ошибка сервера при добавлении стикера" });
  }
}

/* PATCH /api/stickers/:stickerId — изменить значение стикера */
export async function updateSticker(req, res) {
  try {
    const stickerId = Number(req.params.stickerId);
    const { value } = req.body;

    const sticker = await prisma.sticker.findUnique({
      where: { id: stickerId },
      include: { card: { include: { column: { include: { board: true } } } } },
    });
    if (!sticker || sticker.card.column.board.projectId !== req.projectId) {
      return res.status(403).json({ success: false, message: "Стикер вне доступного проекта" });
    }

    const updated = await prisma.sticker.update({
      where: { id: stickerId },
      data: { value },
    });

    res.json({ success: true, sticker: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Ошибка сервера при обновлении стикера" });
  }
}

/* DELETE /api/stickers/:stickerId — убрать стикер с карточки */
export async function deleteSticker(req, res) {
  try {
    const stickerId = Number(req.params.stickerId);

    const sticker = await prisma.sticker.findUnique({
      where: { id: stickerId },
      include: { card: { include: { column: { include: { board: true } } } } },
    });
    if (!sticker || sticker.card.column.board.projectId !== req.projectId) {
      return res.status(403).json({ success: false, message: "Стикер вне доступного проекта" });
    }

    await prisma.sticker.delete({ where: { id: stickerId } });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Ошибка сервера при удалении стикера" });
  }
}
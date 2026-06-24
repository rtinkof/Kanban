import prisma from "../prisma.js";

// GET /api/boards/:boardId/custom-stickers
export async function getCustomStickers(req, res) {
  try {
    const boardId = Number(req.params.boardId);
    
    const stickers = await prisma.customSticker.findMany({
      where: { boardId },
      orderBy: { createdAt: "asc" }
    });
    
    res.json({ success: true, stickers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Ошибка сервера" });
  }
}

// POST /api/boards/:boardId/custom-stickers
// POST /api/boards/:boardId/custom-stickers
export async function createCustomSticker(req, res) {
  try {
    console.log("📥 Входящий запрос на создание стикера:");
    console.log("  boardId:", req.params.boardId);
    console.log("  body:", req.body);
    
    const boardId = Number(req.params.boardId);
    const { type, icon, text, states, value } = req.body;
    
    if (!type || !text) {
      return res.status(400).json({ 
        success: false, 
        message: "Укажите тип и название стикера" 
      });
    }
    
    console.log("📝 Создаём стикер с данными:");
    console.log("  type:", type);
    console.log("  icon:", icon);
    console.log("  text:", text);
    console.log("  states:", states);
    console.log("  value:", value);
    
    const sticker = await prisma.customSticker.create({
      data: {
        boardId,
        type,
        icon: icon || "📌",
        text,
        states: states || null,
        value: value || null,
        hidden: false
      }
    });
    
    console.log("✅ Стикер создан:", sticker);
    
    res.status(201).json({ success: true, sticker });
  } catch (err) {
    console.error("❌ Ошибка при создании стикера:", err);
    if (err.code === "P2002") {
      return res.status(409).json({ 
        success: false, 
        message: "Стикер с таким названием уже существует на этой доске" 
      });
    }
    res.status(500).json({ success: false, message: "Ошибка сервера" });
  }
}
// PATCH /api/custom-stickers/:stickerId
export async function updateCustomSticker(req, res) {
  try {
    const stickerId = Number(req.params.customStickerId || req.params.stickerId);
    console.log("✏️ Обновление стикера с ID:", stickerId);
    
    if (!stickerId || isNaN(stickerId)) {
      return res.status(400).json({ success: false, message: "Неверный ID стикера" });
    }
    
    const { icon, text, states, hidden, value } = req.body;
    
    const data = {};
    if (icon !== undefined) data.icon = icon;
    if (text !== undefined) data.text = text;
    if (states !== undefined) data.states = states;
    if (value !== undefined) data.value = value;
    if (hidden !== undefined) data.hidden = hidden;
    
    const sticker = await prisma.customSticker.update({
      where: { id: stickerId },
      data
    });
    
    res.json({ success: true, sticker });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Ошибка сервера" });
  }
}

// DELETE /api/custom-stickers/:stickerId
export async function deleteCustomSticker(req, res) {
  try {
    const stickerId = Number(req.params.customStickerId || req.params.stickerId);
    console.log("🗑 Удаление стикера с ID:", stickerId);
    
    if (!stickerId || isNaN(stickerId)) {
      return res.status(400).json({ success: false, message: "Неверный ID стикера" });
    }
    
    await prisma.customSticker.delete({
      where: { id: stickerId }
    });
    
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Ошибка сервера" });
  }
}
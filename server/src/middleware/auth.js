import jwt from "jsonwebtoken";
import prisma from "../prisma.js";

// Достаёт токен из заголовка "Authorization: Bearer <токен>",
// проверяет его и кладёт данные пользователя в req.user.
// Если токена нет, он невалиден, или пользователь в архиве — отдаёт 401/403
// и дальше код не идёт.
export default async function requireAuth(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Нет токена авторизации" });
  }

  const token = header.split(" ")[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // дополнительно проверяем, что юзер не был заархивирован уже ПОСЛЕ
    // выдачи токена — иначе старый токен продолжал бы работать ещё 7 дней
    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user || user.archived) {
      return res.status(403).json({ success: false, message: "Доступ для этого пользователя приостановлен" });
    }

    req.user = payload; // { id, login, role }
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Невалидный или просроченный токен" });
  }
}
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../prisma.js";

// Создаёт JWT-токен на 7 дней с данными пользователя внутри.
function makeToken(user) {
  return jwt.sign(
    { id: user.id, login: user.login, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" },
  );
}

// POST /api/auth/register
// ВАЖНО: это внутренний инструмент компании, а не публичный сервис —
// создавать новых пользователей может только уже авторизованный ADMIN.
// Маршрут защищён мидлварами requireAuth + requireAdmin (см. authRoutes.js).
export async function register(req, res) {
  try {
    const { login, password, firstName, lastName, email, role } = req.body;

    if (!login || !password || !firstName || !lastName) {
      return res.status(400).json({ success: false, message: "Заполните все обязательные поля" });
    }

    const existing = await prisma.user.findUnique({ where: { login } });
    if (existing) {
      return res.status(409).json({ success: false, message: "Такой логин уже занят" });
    }

    const allowedRoles = ["ADMIN", "DIRECTOR", "EMPLOYEE"];
    const finalRole = allowedRoles.includes(role) ? role : "EMPLOYEE";

    // никогда не храним пароль как есть — только хэш
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { login, password: passwordHash, firstName, lastName, email, role: finalRole },
    });

    res.json({
      success: true,
      user: { id: user.id, login: user.login, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Ошибка сервера при регистрации" });
  }
}

// POST /api/auth/login
export async function login(req, res) {
  try {
    const { login: loginInput, password } = req.body;

    if (!loginInput || !password) {
      return res.status(400).json({ success: false, message: "Введите логин и пароль" });
    }

    const user = await prisma.user.findUnique({ where: { login: loginInput } });
    if (!user) {
      return res.status(401).json({ success: false, message: "Неверный логин или пароль" });
    }

    if (user.archived) {
      return res.status(403).json({ success: false, message: "Доступ для этого пользователя приостановлен" });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      return res.status(401).json({ success: false, message: "Неверный логин или пароль" });
    }

    const token = makeToken(user);

    res.json({
      success: true,
      token,
      user: { id: user.id, login: user.login, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Ошибка сервера при входе" });
  }
}

// GET /api/auth/me — вернуть текущего пользователя по токену (для проверки сессии на фронте)
export async function me(req, res) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ success: false, message: "Пользователь не найден" });

    if (user.archived) {
      return res.status(403).json({ success: false, message: "Доступ для этого пользователя приостановлен" });
    }

    res.json({
      success: true,
      user: { id: user.id, login: user.login, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Ошибка сервера" });
  }
}

// GET /api/auth/users — список всех сотрудников компании (для раздела "Проекты и сотрудники")
// По умолчанию отдаёт только активных (не архивных). ?archived=true — отдаёт архив.
export async function getAllUsers(req, res) {
  try {
    const showArchived = req.query.archived === "true";

    const users = await prisma.user.findMany({
      where: { archived: showArchived },
      orderBy: { id: "asc" },
      select: { id: true, login: true, firstName: true, lastName: true, email: true, role: true, archived: true, createdAt: true },
    });
    res.json({ success: true, users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Ошибка сервера" });
  }
}

// PATCH /api/auth/users/:id — редактирование данных сотрудника (только ADMIN)
export async function updateUser(req, res) {
  try {
    const id = Number(req.params.id);
    const { login, firstName, lastName, email, role } = req.body;

    const data = {};
    if (login !== undefined) data.login = login;
    if (firstName !== undefined) data.firstName = firstName;
    if (lastName !== undefined) data.lastName = lastName;
    if (email !== undefined) data.email = email;
    if (role !== undefined) {
      if (!["ADMIN", "DIRECTOR", "EMPLOYEE"].includes(role)) {
        return res.status(400).json({ success: false, message: "Недопустимая роль" });
      }
      data.role = role;
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, login: true, firstName: true, lastName: true, email: true, role: true, archived: true },
    });

    res.json({ success: true, user });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ success: false, message: "Такой логин или email уже занят" });
    }
    console.error(err);
    res.status(500).json({ success: false, message: "Ошибка сервера при обновлении сотрудника" });
  }
}

// PATCH /api/auth/users/:id/password — админ задаёт сотруднику новый пароль
export async function resetPassword(req, res) {
  try {
    const id = Number(req.params.id);
    const { password } = req.body;

    if (!password || password.length < 4) {
      return res.status(400).json({ success: false, message: "Пароль слишком короткий" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.user.update({ where: { id }, data: { password: passwordHash } });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Ошибка сервера" });
  }
}

// POST /api/auth/users/:id/archive — отправить сотрудника в архив (мягкое удаление).
// Доступ к системе блокируется, участие во всех проектах снимается,
// но карточки/назначения и сам аккаунт остаются в базе нетронутыми.
export async function archiveUser(req, res) {
  try {
    const id = Number(req.params.id);

    if (id === req.user.id) {
      return res.status(400).json({ success: false, message: "Нельзя архивировать самого себя" });
    }

    const [user] = await prisma.$transaction([
      prisma.user.update({
        where: { id },
        data: { archived: true },
        select: { id: true, login: true, firstName: true, lastName: true, email: true, role: true, archived: true },
      }),
      prisma.projectMember.deleteMany({ where: { userId: id } }),
    ]);

    res.json({ success: true, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Ошибка сервера при архивации" });
  }
}

// POST /api/auth/users/:id/restore — вернуть сотрудника из архива.
// Доступ восстанавливается, но участие в проектах нужно настраивать заново.
export async function restoreUser(req, res) {
  try {
    const id = Number(req.params.id);

    const user = await prisma.user.update({
      where: { id },
      data: { archived: false },
      select: { id: true, login: true, firstName: true, lastName: true, email: true, role: true, archived: true },
    });

    res.json({ success: true, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Ошибка сервера при восстановлении" });
  }
}
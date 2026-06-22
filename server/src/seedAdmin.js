// Одноразовый скрипт: создаёт первого администратора напрямую в базе данных,
// в обход API (он сейчас защищён и требует уже существующего админа — без
// этого скрипта зарегистрировать самого первого пользователя было бы неоткуда).
//
// Запуск (из папки server):
//   node src/seedAdmin.js
//
// Логин и пароль можно поменять ниже, либо передать через переменные окружения:
//   ADMIN_LOGIN=director ADMIN_PASSWORD=supersecret node src/seedAdmin.js

import bcrypt from "bcrypt";
import prisma from "./prisma.js";

const login = process.env.ADMIN_LOGIN || "rtinkof";
const password = process.env.ADMIN_PASSWORD || "zhizha5432";
const firstName = process.env.ADMIN_FIRST_NAME || "Админ";
const lastName = process.env.ADMIN_LAST_NAME || "Системы";

async function main() {
  const existing = await prisma.user.findUnique({ where: { login } });
  if (existing) {
    console.log(`Пользователь с логином "${login}" уже существует (id=${existing.id}, role=${existing.role}).`);
    console.log("Если нужен новый админ — задайте другой ADMIN_LOGIN.");
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      login,
      password: passwordHash,
      firstName,
      lastName,
      role: "ADMIN",
    },
  });

  console.log("Первый администратор создан:");
  console.log(`  логин:  ${user.login}`);
  console.log(`  пароль: ${password}  (смените после первого входа)`);
  console.log(`  id:     ${user.id}`);
}

main()
  .catch((err) => {
    console.error("Ошибка при создании администратора:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

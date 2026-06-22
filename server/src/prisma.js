import { PrismaClient } from "@prisma/client";

// Один общий клиент на всё приложение — не создавай новый PrismaClient
// в каждом файле, просто импортируй этот.
const prisma = new PrismaClient();

export default prisma;
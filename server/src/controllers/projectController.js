import prisma from "../prisma.js";

// GET /api/projects — список проектов, где текущий пользователь либо владелец, либо участник
export async function getProjects(req, res) {
  try {
    const userId = req.user.id;

    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } },
        ],
      },
      include: {
        members: { include: { user: true } },
        owner: true,
      },
    });

    res.json({ success: true, projects });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Ошибка сервера" });
  }
}

// POST /api/projects — создать проект (текущий пользователь становится владельцем)
export async function createProject(req, res) {
  try {
    const { title, description } = req.body;
    if (!title) {
      return res.status(400).json({ success: false, message: "Укажите название проекта" });
    }

    const project = await prisma.project.create({
      data: {
        title,
        description,
        ownerId: req.user.id,
        // владелец сразу добавляется как куратор проекта
        members: {
          create: { userId: req.user.id, role: "CURATOR" },
        },
        // у нового проекта сразу одна доска "по умолчанию", чтобы было куда зайти
        boards: {
          create: {
            title: "Новая доска",
            columns: {
              create: { title: "Новая колонка", position: 0 },
            },
          },
        },
      },
      include: { members: true, boards: true },
    });

    res.json({ success: true, project });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Ошибка сервера при создании проекта" });
  }
}

// GET /api/projects/:id/members — список участников проекта (для выбора исполнителя в стикере)
export async function getProjectMembers(req, res) {
  try {
    const projectId = Number(req.params.id);

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { owner: true, members: { include: { user: true } } },
    });

    if (!project) {
      return res.status(404).json({ success: false, message: "Проект не найден" });
    }

    // владелец проекта тоже считается участником (как CURATOR),
    // даже если по какой-то причине не попал в ProjectMember явно
    const ownerAlreadyMember = project.members.some((m) => m.userId === project.ownerId);

    const members = [
      ...(ownerAlreadyMember
        ? []
        : [{ userId: project.ownerId, role: "CURATOR", user: project.owner }]),
      ...project.members,
    ];

    res.json({ success: true, members });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Ошибка сервера" });
  }
}

// POST /api/projects/:id/members — добавить участника в проект
export async function addMember(req, res) {
  try {
    const projectId = Number(req.params.id);
    const { userId, role } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: "Укажите userId" });
    }

    const member = await prisma.projectMember.create({
      data: { projectId, userId, role: role || "EXECUTOR" },
      include: { user: true },
    });

    res.json({ success: true, member });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Ошибка сервера при добавлении участника" });
  }
}

// DELETE /api/projects/:id/members/:userId — убрать участника из проекта
export async function removeMember(req, res) {
  try {
    const projectId = Number(req.params.id);
    const userId = Number(req.params.userId);

    await prisma.projectMember.delete({
      where: { projectId_userId: { projectId, userId } },
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Ошибка сервера при удалении участника" });
  }
}
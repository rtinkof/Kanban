// Пропускает дальше только пользователей с одной из перечисленных системных ролей
// (ADMIN / DIRECTOR / EMPLOYEE). Должен использоваться ПОСЛЕ requireAuth —
// полагается на req.user, который тот мидлвар кладёт.
//
// Пример: router.post("/employees", requireAuth, requireRole("ADMIN", "DIRECTOR"), createEmployee);
export default function requireRole(...allowedRoles) {
  return function (req, res, next) {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Нет токена авторизации" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Недостаточно прав для этого действия",
      });
    }

    next();
  };
}

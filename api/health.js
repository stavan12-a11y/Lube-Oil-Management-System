module.exports = function handler(_req, res) {
  const database = Boolean(process.env.DATABASE_URL);
  const authSecret =
    Boolean(process.env.AUTH_SECRET) &&
    process.env.AUTH_SECRET.length >= 16;
  const teamPassword = Boolean(process.env.TEAM_PASSWORD);
  const teamUsername = Boolean(
    process.env.TEAM_USERNAME ??
      process.env.VITE_APP_USERNAME ??
      "admin",
  );

  res.status(200).setHeader("Content-Type", "application/json");
  res.end(
    JSON.stringify({
      ok: database && authSecret && teamPassword,
      database,
      authSecret,
      teamPassword,
      teamUsername,
    }),
  );
};

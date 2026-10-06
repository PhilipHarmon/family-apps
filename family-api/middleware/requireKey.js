// Shared family key gate. Applied to all /api routes except GET /api/health.
module.exports = function requireKey(req, res, next) {
  const expected = process.env.FAMILY_KEY;
  const provided = req.get('x-family-key');
  if (!expected || !provided || provided !== expected) {
    return res.status(401).json({ error: 'Invalid family key' });
  }
  next();
};

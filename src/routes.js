const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const pool = require('./db');
const config = require('./config');
const { auth, adminOnly } = require('./auth');

const router = express.Router();
const UPLOADS = path.join(__dirname, '..', 'uploads');
const wrap = fn => (req, res, next) => fn(req, res, next).catch(next);

// ---------- uploads ----------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(UPLOADS, file.fieldname === 'cover' ? 'covers' : 'books')),
  filename: (req, file, cb) => cb(null, crypto.randomBytes(16).toString('hex') + path.extname(file.originalname).toLowerCase())
});
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024, files: 2 },
  fileFilter: (req, file, cb) => {
    const ok = file.fieldname === 'cover'
      ? ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)
      : file.mimetype === 'application/pdf';
    cb(ok ? null : new Error('Invalid file type'), ok);
  }
});
const removeFile = rel => rel && fs.unlink(path.join(UPLOADS, rel.replace(/^\/files\//, '')), () => {});

router.use(auth);

// ---------- user ----------
router.get('/me', wrap(async (req, res) => {
  const [[s]] = await pool.query(
    `SELECT (SELECT COUNT(*) FROM book_opens WHERE user_id=?) AS opened,
            (SELECT COUNT(*) FROM favorites  WHERE user_id=?) AS favorites`, [req.user.id, req.user.id]);
  res.json({ user: { id: req.user.id, first_name: req.user.first_name, username: req.user.username },
             isAdmin: req.user.isAdmin, stats: s });
}));

router.get('/categories', wrap(async (req, res) => {
  const [rows] = await pool.query('SELECT id, name FROM categories ORDER BY id');
  res.json(rows);
}));

// ---------- books ----------
const BOOK_SELECT = `SELECT b.id, b.title, b.author, b.description, b.cover_url, b.downloads, c.name AS category,
  (f.user_id IS NOT NULL) AS is_fav FROM books b JOIN categories c ON c.id=b.category_id
  LEFT JOIN favorites f ON f.book_id=b.id AND f.user_id=?`;

router.get('/books', wrap(async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 12, 1), 50);
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const where = [], args = [req.user.id];
  if (req.query.category && req.query.category !== 'all') { where.push('b.category_id=?'); args.push(Number(req.query.category)); }
  const q = String(req.query.q || '').trim().slice(0, 100);
  if (q) {
    const like = '%' + q.replace(/[%_\\]/g, '\\$&') + '%';
    where.push('(b.title LIKE ? OR b.author LIKE ?)'); args.push(like, like);
  }
  const sql = `${BOOK_SELECT} ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
               ORDER BY b.created_at DESC, b.id DESC LIMIT ? OFFSET ?`;
  const [rows] = await pool.query(sql, [...args, limit + 1, (page - 1) * limit]);
  res.json({ books: rows.slice(0, limit).map(r => ({ ...r, is_fav: !!r.is_fav })), hasMore: rows.length > limit });
}));

router.post('/books/:id/open', wrap(async (req, res) => {
  const [[b]] = await pool.query('SELECT id, file_path, external_url FROM books WHERE id=?', [req.params.id]);
  if (!b) return res.status(404).json({ error: 'not found' });
  await pool.query('INSERT INTO book_opens (user_id, book_id) VALUES (?,?)', [req.user.id, b.id]);
  await pool.query('UPDATE books SET downloads=downloads+1 WHERE id=?', [b.id]);
  const url = b.external_url || (b.file_path ? `${config.publicUrl}/files/books/${b.file_path}` : null);
  if (!url) return res.status(404).json({ error: 'no file' });
  res.json({ url });
}));

// ---------- favorites ----------
router.get('/favorites', wrap(async (req, res) => {
  const [rows] = await pool.query(`${BOOK_SELECT} WHERE f.user_id IS NOT NULL ORDER BY f.created_at DESC`, [req.user.id]);
  res.json({ books: rows.map(r => ({ ...r, is_fav: true })) });
}));

router.post('/favorites/:id', wrap(async (req, res) => {
  const bookId = Number(req.params.id);
  const [del] = await pool.query('DELETE FROM favorites WHERE user_id=? AND book_id=?', [req.user.id, bookId]);
  if (del.affectedRows) return res.json({ is_fav: false });
  try { await pool.query('INSERT INTO favorites (user_id, book_id) VALUES (?,?)', [req.user.id, bookId]); }
  catch (e) { if (e.code === 'ER_NO_REFERENCED_ROW_2') return res.status(404).json({ error: 'not found' }); throw e; }
  res.json({ is_fav: true });
}));

// ---------- admin ----------
const fields = upload.fields([{ name: 'cover', maxCount: 1 }, { name: 'file', maxCount: 1 }]);

router.post('/admin/books', adminOnly, fields, wrap(async (req, res) => {
  const { title, author, category_id, description, external_url } = req.body;
  const cover = req.files?.cover?.[0], file = req.files?.file?.[0];
  const cleanup = () => { if (cover) removeFile('covers/' + cover.filename); if (file) removeFile('books/' + file.filename); };
  if (!title?.trim() || !author?.trim() || !category_id) { cleanup(); return res.status(400).json({ error: 'title, author and category are required' }); }
  if (!file && !/^https?:\/\//i.test(external_url || '')) { cleanup(); return res.status(400).json({ error: 'Upload a PDF or give an http(s) link' }); }
  const [r] = await pool.query(
    `INSERT INTO books (title, author, category_id, description, cover_url, file_path, external_url) VALUES (?,?,?,?,?,?,?)`,
    [title.trim(), author.trim(), Number(category_id), description || null,
     cover ? `/files/covers/${cover.filename}` : null, file ? file.filename : null, file ? null : external_url]);
  res.status(201).json({ id: r.insertId });
}));

router.delete('/admin/books/:id', adminOnly, wrap(async (req, res) => {
  const [[b]] = await pool.query('SELECT cover_url, file_path FROM books WHERE id=?', [req.params.id]);
  if (!b) return res.status(404).json({ error: 'not found' });
  await pool.query('DELETE FROM books WHERE id=?', [req.params.id]);
  if (b.cover_url?.startsWith('/files/')) removeFile(b.cover_url);
  if (b.file_path) removeFile('books/' + b.file_path);
  res.json({ ok: true });
}));

router.get('/admin/stats', adminOnly, wrap(async (req, res) => {
  const [[s]] = await pool.query(`SELECT (SELECT COUNT(*) FROM users) users, (SELECT COUNT(*) FROM books) books,
                                         (SELECT COUNT(*) FROM book_opens) opens`);
  res.json(s);
}));

module.exports = router;

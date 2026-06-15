const express = require('express');
const Database = require('better-sqlite3');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'library-secret-2025-gezimm';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const db = new Database(path.join(__dirname, 'data', 'library.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    isbn TEXT UNIQUE,
    category TEXT DEFAULT 'E Përgjithshme',
    description TEXT,
    publisher TEXT,
    year_published INTEGER,
    copies_total INTEGER DEFAULT 1,
    copies_available INTEGER DEFAULT 1,
    cover_color TEXT DEFAULT '#3B82F6',
    times_borrowed INTEGER DEFAULT 0,
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS readers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    surname TEXT NOT NULL,
    personal_id TEXT UNIQUE,
    phone TEXT,
    email TEXT,
    address TEXT,
    birthday TEXT,
    membership_date TEXT DEFAULT (date('now','localtime')),
    status TEXT DEFAULT 'aktiv',
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS borrowings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reader_id INTEGER NOT NULL,
    book_id INTEGER NOT NULL,
    date_given TEXT NOT NULL DEFAULT (date('now','localtime')),
    date_due TEXT NOT NULL,
    date_returned TEXT,
    status TEXT DEFAULT 'aktiv',
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (reader_id) REFERENCES readers(id),
    FOREIGN KEY (book_id) REFERENCES books(id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  INSERT OR IGNORE INTO admin_users (username, password_hash) VALUES ('admin', '${bcrypt.hashSync('admin123', 10)}');

  INSERT OR IGNORE INTO settings (key, value) VALUES ('library_name', 'Biblioteka e Malishevës');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('library_address', 'Rr. Skënder Luarasi, Malishevë 21000, Kosovë');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('library_phone', '+383 29 000 123');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('library_email', 'biblioteka@malisheva.org');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('borrow_days', '14');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('library_history', 'Biblioteka Publike e Malishevës u themelua në vitin 1968 si institucion kulturor i rëndësishëm për komunën. Për mbi 55 vjet ka shërbyer me përkushtim komunitetin e Malishevës, duke ofruar akses falas në dije, kulturë dhe edukim për të gjithë qytetarët — nga fëmijët deri te të moshuarit. Sot biblioteka ynë mban mbi 20,000 tituj librash dhe shërben qindra lexues çdo muaj.');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('library_founded', '1968');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('library_hours', 'E Hënë - E Premte: 08:00 - 20:00 | E Shtunë: 09:00 - 14:00');

  UPDATE settings SET value = 'Biblioteka e Malishevës' WHERE key = 'library_name';
  UPDATE settings SET value = 'Rr. Skënder Luarasi, Malishevë 21000, Kosovë' WHERE key = 'library_address';
  UPDATE settings SET value = '+383 29 000 123' WHERE key = 'library_phone';
  UPDATE settings SET value = 'biblioteka@malisheva.org' WHERE key = 'library_email';
  UPDATE settings SET value = 'Biblioteka Publike e Malishevës u themelua në vitin 1968 si institucion kulturor i rëndësishëm për komunën. Për mbi 55 vjet ka shërbyer me përkushtim komunitetin e Malishevës, duke ofruar akses falas në dije, kulturë dhe edukim për të gjithë qytetarët — nga fëmijët deri te të moshuarit. Sot biblioteka ynë mban mbi 20,000 tituj librash dhe shërben qindra lexues çdo muaj.' WHERE key = 'library_history';
  UPDATE settings SET value = '1968' WHERE key = 'library_founded';
`);

// Seed books if empty
const bookCount = db.prepare('SELECT COUNT(*) as c FROM books').get();
if (bookCount.c === 0) {
  const insertBook = db.prepare(`INSERT INTO books (title, author, isbn, category, description, year_published, copies_total, copies_available, cover_color, times_borrowed) VALUES (?,?,?,?,?,?,?,?,?,?)`);
  const books = [
    ['Kronikë në Gur', 'Ismail Kadare', '978-99927-1-001-1', 'Letërsi Shqipe', 'Roman i njohur i Ismail Kadaresë i botuar në 1971', 1971, 3, 3, '#1E40AF', 45],
    ['Gjenerali i Ushtrisë së Vdekur', 'Ismail Kadare', '978-99927-1-002-2', 'Letërsi Shqipe', 'Romani i parë i Kadaresë, mjet i fuqishëm letrar', 1963, 2, 2, '#1E3A8A', 38],
    ['Darka e Gabuar', 'Ismail Kadare', '978-99927-1-003-3', 'Letërsi Shqipe', 'Roman bashkëkohor i Kadaresë', 2008, 2, 2, '#312E81', 21],
    ['Komiseri Memo', 'Ismail Kadare', '978-99927-1-004-4', 'Letërsi Shqipe', 'Tregim i famshëm i Kadaresë', 1999, 1, 1, '#3730A3', 16],
    ['Pallati i Ëndrrave', 'Ismail Kadare', '978-99927-1-005-5', 'Letërsi Shqipe', 'Roman historik', 1982, 2, 2, '#4338CA', 29],
    ['Vepra Letrare', 'Naim Frashëri', '978-99927-1-006-6', 'Letërsi Shqipe', 'Koleksion veprash të poetit kombëtar', 1900, 2, 2, '#7C3AED', 34],
    ['Bagëti e Bujqësia', 'Naim Frashëri', '978-99927-1-007-7', 'Letërsi Shqipe', 'Poema e famshme e Naim Frashërit', 1886, 1, 1, '#6D28D9', 19],
    ['Historia e Skënderbeut', 'Fan Noli', '978-99927-1-008-8', 'Histori', 'Biografia e Heroit Kombëtar', 1921, 2, 2, '#B45309', 42],
    ['Historia e Popullit Shqiptar', 'Akademia e Shkencave', '978-99927-3-001-1', 'Histori', 'Historia kombëtare — botim i plotë', 2002, 4, 4, '#92400E', 29],
    ['Çështje të Filozofisë', 'Aristoteli', '978-99927-2-001-1', 'Filozofi', 'Vepra klasike filozofike', 2010, 1, 1, '#7C3AED', 12],
    ['Republika', 'Platoni', '978-99927-2-002-2', 'Filozofi', 'Dialog filozofik i Platonit', 380, 1, 1, '#6D28D9', 8],
    ['Fjalori i Gjuhës Shqipe', 'Akademia e Shkencave', '978-99927-4-001-1', 'Gjuhësi', 'Fjalor i plotë i gjuhës shqipe', 2006, 2, 2, '#065F46', 33],
    ['Gramatika e Gjuhës Shqipe', 'Shaban Demiraj', '978-99927-4-002-2', 'Gjuhësi', 'Gramatika standarde', 1988, 2, 2, '#064E3B', 17],
    ['Biologjia Moderne', 'B. Douglas', '978-00001-1-001-1', 'Shkencë', 'Biologji e avancuar për studiues', 2018, 3, 3, '#15803D', 9],
    ['Fizika e Përgjithshme', 'Halliday & Resnick', '978-00001-2-001-1', 'Shkencë', 'Tekst standard i fizikës', 2013, 2, 2, '#166534', 11],
    ['Matematika e Lartë', 'N. Piskunov', '978-00001-3-001-1', 'Shkencë', 'Analizë matematike', 2010, 3, 3, '#DC2626', 22],
    ['Histori e Artit', 'E.H. Gombrich', '978-00002-1-001-1', 'Art', 'Historia e artit botëror', 2015, 1, 1, '#9333EA', 14],
    ['Kodi Da Vinci', 'Dan Brown', '978-00003-1-001-1', 'Letërsi Botërore', 'Thriller i famshëm botëror', 2003, 3, 3, '#C2410C', 52],
    ['Angjelli dhe Djalli', 'Dan Brown', '978-00003-1-002-2', 'Letërsi Botërore', 'Thriller nga Dan Brown', 2000, 2, 2, '#9A3412', 31],
    ['Njëqind Vjet Vetmi', 'Gabriel García Márquez', '978-00004-1-001-1', 'Letërsi Botërore', 'Klasik i realizmit magjik', 1967, 2, 2, '#0F766E', 41],
    ['Lufta dhe Paqja', 'Lev Tolstoi', '978-00005-1-001-1', 'Letërsi Botërore', 'Masterpiece i letërsisë ruse', 1869, 1, 1, '#1D4ED8', 27],
    ['Ana Karenina', 'Lev Tolstoi', '978-00005-1-002-2', 'Letërsi Botërore', 'Roman psikologjik', 1878, 2, 2, '#1E40AF', 33],
    ['Krim dhe Ndëshkim', 'Fjodor Dostojevski', '978-00006-1-001-1', 'Letërsi Botërore', 'Roman klasik rus', 1866, 2, 2, '#7C2D12', 23],
    ['Plaku dhe Deti', 'Ernest Hemingway', '978-00008-1-001-1', 'Letërsi Botërore', 'Roman i shkurtër i famshëm', 1952, 2, 2, '#0369A1', 36],
    ['Dielli Lind Gjithnjë', 'Ernest Hemingway', '978-00008-1-002-2', 'Letërsi Botërore', 'Roman i gjeneratës së humbur', 1926, 1, 1, '#075985', 18],
    ['Harry Potter dhe Guri Filozofal', 'J.K. Rowling', '978-00009-1-001-1', 'Fëmijëve', 'Romani i parë i serisë Harry Potter', 1997, 4, 4, '#B45309', 68],
    ['Princi i Vogël', 'Antoine de Saint-Exupéry', '978-00010-1-001-1', 'Fëmijëve', 'Libri i famshëm filozofik për fëmijë', 1943, 3, 3, '#D97706', 57],
    ['Orwell: 1984', 'George Orwell', '978-00011-1-001-1', 'Letërsi Botërore', 'Distopi klasike', 1949, 2, 2, '#374151', 44],
    ['Ferma e Kafshëve', 'George Orwell', '978-00011-1-002-2', 'Letërsi Botërore', 'Alegori satirike', 1945, 2, 2, '#1F2937', 39],
    ['Guri i Durimit', 'Atiq Rahimi', '978-00012-1-001-1', 'Letërsi Botërore', 'Roman i shkurtër laureat i çmimit Goncourt', 2008, 1, 1, '#78350F', 13],
  ];
  for (const b of books) insertBook.run(...b);
}

// Seed readers if empty
const readerCount = db.prepare('SELECT COUNT(*) as c FROM readers').get();
if (readerCount.c === 0) {
  const insertReader = db.prepare(`INSERT INTO readers (name, surname, personal_id, phone, email, address, birthday, membership_date, status) VALUES (?,?,?,?,?,?,?,?,?)`);
  const readers = [
    ['Arben', 'Berisha', '1234567890', '+383 44 111 222', 'arben.berisha@email.com', 'Rr. Liria, Malishevë', '1990-03-15', '2023-01-10', 'aktiv'],
    ['Valdete', 'Krasniqi', '1234567891', '+383 44 222 333', 'valdete.k@email.com', 'Lagjja Qendër, Malishevë', '1985-07-22', '2023-02-14', 'aktiv'],
    ['Granit', 'Hyseni', '1234567892', '+383 45 333 444', 'granit.hyseni@email.com', 'Rr. Skënderbeu, Malishevë', '1998-11-05', '2023-03-01', 'aktiv'],
    ['Mirjeta', 'Selmani', '1234567893', '+383 44 444 555', 'mirjeta.s@email.com', 'Lagja e Re, Malishevë', '1992-01-18', '2023-04-20', 'aktiv'],
    ['Besim', 'Gashi', '1234567894', '+383 49 555 666', 'besim.gashi@email.com', 'Rr. Nënë Tereza, Malishevë', '1978-09-30', '2023-05-05', 'aktiv'],
    ['Arta', 'Murati', '1234567895', '+383 44 666 777', 'arta.murati@email.com', 'Qendra, Malishevë', '2001-06-12', '2023-06-11', 'aktiv'],
    ['Liridona', 'Shala', '1234567896', '+383 45 777 888', 'liridona@email.com', 'Lagjja Dardania, Malishevë', '1995-04-25', '2023-07-03', 'aktiv'],
    ['Faton', 'Bytyqi', '1234567897', '+383 44 888 999', 'faton.b@email.com', 'Rr. Adem Jashari, Malishevë', '1988-12-08', '2023-08-17', 'aktiv'],
    ['Drita', 'Rexhepi', '1234567898', '+383 49 999 000', 'drita.r@email.com', 'Lagja Shpresa, Malishevë', '2003-02-14', '2023-09-22', 'aktiv'],
    ['Kujtim', 'Osmani', '1234567899', '+383 44 100 200', 'kujtim.o@email.com', 'Rr. Isa Boletini, Malishevë', '1975-08-19', '2023-10-30', 'aktiv'],
    ['Albana', 'Hasani', '1234567800', '+383 45 200 300', 'albana.h@email.com', 'Qendra, Malishevë', '2000-05-07', '2024-01-15', 'aktiv'],
    ['Rilind', 'Zeqiri', '1234567801', '+383 44 300 400', 'rilind.z@email.com', 'Lagjja Flaka, Malishevë', '1997-10-31', '2024-02-20', 'aktiv'],
    ['Teuta', 'Morina', '1234567802', '+383 49 400 500', 'teuta.m@email.com', 'Rr. Fehmi Agani, Malishevë', '1983-03-21', '2024-03-08', 'aktiv'],
    ['Agron', 'Jakupi', '1234567803', '+383 44 500 600', 'agron.j@email.com', 'Lagja Arbëria, Malishevë', '1980-07-14', '2024-04-12', 'aktiv'],
    ['Flutura', 'Aliu', '1234567804', '+383 45 600 700', 'flutura.a@email.com', 'Rr. Prishtinës, Malishevë', '1993-09-03', '2024-05-25', 'aktiv'],
  ];
  for (const r of readers) insertReader.run(...r);
}

// Auth middleware
const auth = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Kërkohet autentifikim' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token i pavlefshëm' });
  }
};

// ─── AUTH ───────────────────────────────────────────────────────────────────
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash))
    return res.status(401).json({ error: 'Kredenciale të gabuara' });
  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, username: user.username });
});

app.get('/api/auth/me', auth, (req, res) => res.json(req.user));

// ─── SETTINGS ───────────────────────────────────────────────────────────────
app.get('/api/settings', (req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const s = {};
  for (const r of rows) s[r.key] = r.value;
  res.json(s);
});

app.put('/api/settings', auth, (req, res) => {
  const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  for (const [k, v] of Object.entries(req.body)) upsert.run(k, v);
  res.json({ ok: true });
});

// ─── BOOKS ──────────────────────────────────────────────────────────────────
app.get('/api/books', (req, res) => {
  const { search, author, category, available, limit = 50, offset = 0 } = req.query;
  let q = 'SELECT * FROM books WHERE active = 1';
  const params = [];
  if (search) { q += ' AND (title LIKE ? OR author LIKE ? OR isbn LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  if (author) { q += ' AND author LIKE ?'; params.push(`%${author}%`); }
  if (category) { q += ' AND category = ?'; params.push(category); }
  if (available === '1') { q += ' AND copies_available > 0'; }
  q += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));
  const books = db.prepare(q).all(...params);
  const total = db.prepare(q.replace('SELECT *', 'SELECT COUNT(*) as c').replace(/ LIMIT.*/, '')).get(...params.slice(0, -2))?.c || 0;
  res.json({ books, total });
});

app.get('/api/books/most-read', (req, res) => {
  const books = db.prepare('SELECT * FROM books WHERE active = 1 ORDER BY times_borrowed DESC LIMIT 8').all();
  res.json(books);
});

app.get('/api/books/latest', (req, res) => {
  const books = db.prepare('SELECT * FROM books WHERE active = 1 ORDER BY created_at DESC LIMIT 8').all();
  res.json(books);
});

app.get('/api/books/categories', (req, res) => {
  const cats = db.prepare('SELECT DISTINCT category FROM books WHERE active = 1 ORDER BY category').all();
  res.json(cats.map(c => c.category));
});

app.get('/api/books/authors', (req, res) => {
  const authors = db.prepare('SELECT DISTINCT author FROM books WHERE active = 1 ORDER BY author').all();
  res.json(authors.map(a => a.author));
});

app.get('/api/books/:id', (req, res) => {
  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id);
  if (!book) return res.status(404).json({ error: 'Libri nuk u gjet' });
  const history = db.prepare(`
    SELECT b.*, r.name || ' ' || r.surname as reader_name
    FROM borrowings b JOIN readers r ON b.reader_id = r.id
    WHERE b.book_id = ? ORDER BY b.date_given DESC LIMIT 20
  `).all(req.params.id);
  res.json({ book, history });
});

app.post('/api/books', auth, (req, res) => {
  const { title, author, isbn, category, description, publisher, year_published, copies_total, cover_color } = req.body;
  if (!title || !author) return res.status(400).json({ error: 'Titulli dhe autori janë të detyrueshëm' });
  const r = db.prepare(`INSERT INTO books (title, author, isbn, category, description, publisher, year_published, copies_total, copies_available, cover_color) VALUES (?,?,?,?,?,?,?,?,?,?)`)
    .run(title, author, isbn || null, category || 'E Përgjithshme', description || null, publisher || null, year_published || null, copies_total || 1, copies_total || 1, cover_color || '#3B82F6');
  res.json({ id: r.lastInsertRowid });
});

app.put('/api/books/:id', auth, (req, res) => {
  const { title, author, isbn, category, description, publisher, year_published, copies_total, cover_color } = req.body;
  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id);
  if (!book) return res.status(404).json({ error: 'Libri nuk u gjet' });
  const diff = (copies_total || book.copies_total) - book.copies_total;
  db.prepare(`UPDATE books SET title=?, author=?, isbn=?, category=?, description=?, publisher=?, year_published=?, copies_total=?, copies_available=?, cover_color=? WHERE id=?`)
    .run(title || book.title, author || book.author, isbn ?? book.isbn, category || book.category, description ?? book.description, publisher ?? book.publisher, year_published ?? book.year_published, copies_total || book.copies_total, Math.max(0, book.copies_available + diff), cover_color || book.cover_color, req.params.id);
  res.json({ ok: true });
});

app.delete('/api/books/:id', auth, (req, res) => {
  db.prepare('UPDATE books SET active = 0 WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ─── READERS ────────────────────────────────────────────────────────────────
app.get('/api/readers', auth, (req, res) => {
  const { search, status, limit = 50, offset = 0 } = req.query;
  let q = `SELECT r.*,
    (SELECT COUNT(*) FROM borrowings WHERE reader_id = r.id AND status = 'aktiv') as active_borrowings,
    (SELECT COUNT(*) FROM borrowings WHERE reader_id = r.id) as total_borrowed
    FROM readers r WHERE 1=1`;
  const params = [];
  if (search) { q += ' AND (r.name LIKE ? OR r.surname LIKE ? OR r.personal_id LIKE ? OR r.phone LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`); }
  if (status) { q += ' AND r.status = ?'; params.push(status); }
  q += ' ORDER BY r.created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));
  const readers = db.prepare(q).all(...params);
  res.json(readers);
});

app.get('/api/readers/:id', auth, (req, res) => {
  const reader = db.prepare(`SELECT r.*,
    (SELECT COUNT(*) FROM borrowings WHERE reader_id = r.id AND status = 'aktiv') as active_borrowings,
    (SELECT COUNT(*) FROM borrowings WHERE reader_id = r.id) as total_borrowed
    FROM readers r WHERE r.id = ?`).get(req.params.id);
  if (!reader) return res.status(404).json({ error: 'Lexuesi nuk u gjet' });
  const borrowings = db.prepare(`
    SELECT b.*, bk.title, bk.author, bk.cover_color
    FROM borrowings b JOIN books bk ON b.book_id = bk.id
    WHERE b.reader_id = ? ORDER BY b.date_given DESC LIMIT 30
  `).all(req.params.id);
  res.json({ reader, borrowings });
});

app.post('/api/readers', auth, (req, res) => {
  const { name, surname, personal_id, phone, email, address, birthday, notes } = req.body;
  if (!name || !surname) return res.status(400).json({ error: 'Emri dhe mbiemri janë të detyrueshëm' });
  const r = db.prepare(`INSERT INTO readers (name, surname, personal_id, phone, email, address, birthday, notes) VALUES (?,?,?,?,?,?,?,?)`)
    .run(name, surname, personal_id || null, phone || null, email || null, address || null, birthday || null, notes || null);
  res.json({ id: r.lastInsertRowid });
});

app.put('/api/readers/:id', auth, (req, res) => {
  const { name, surname, personal_id, phone, email, address, birthday, status, notes } = req.body;
  const rd = db.prepare('SELECT * FROM readers WHERE id = ?').get(req.params.id);
  if (!rd) return res.status(404).json({ error: 'Lexuesi nuk u gjet' });
  db.prepare(`UPDATE readers SET name=?, surname=?, personal_id=?, phone=?, email=?, address=?, birthday=?, status=?, notes=? WHERE id=?`)
    .run(name || rd.name, surname || rd.surname, personal_id ?? rd.personal_id, phone ?? rd.phone, email ?? rd.email, address ?? rd.address, birthday ?? rd.birthday, status || rd.status, notes ?? rd.notes, req.params.id);
  res.json({ ok: true });
});

app.delete('/api/readers/:id', auth, (req, res) => {
  const active = db.prepare("SELECT COUNT(*) as c FROM borrowings WHERE reader_id = ? AND status = 'aktiv'").get(req.params.id);
  if (active.c > 0) return res.status(400).json({ error: 'Lexuesi ka libra aktiv. Ktheje librin fillimisht.' });
  db.prepare('DELETE FROM readers WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ─── BORROWINGS ─────────────────────────────────────────────────────────────
app.get('/api/borrowings', auth, (req, res) => {
  const { status, reader_id, book_id, overdue, limit = 50, offset = 0 } = req.query;
  let q = `SELECT b.*, r.name || ' ' || r.surname as reader_name, r.phone as reader_phone,
    bk.title as book_title, bk.author as book_author, bk.cover_color
    FROM borrowings b
    JOIN readers r ON b.reader_id = r.id
    JOIN books bk ON b.book_id = bk.id
    WHERE 1=1`;
  const params = [];
  if (status) { q += ' AND b.status = ?'; params.push(status); }
  if (reader_id) { q += ' AND b.reader_id = ?'; params.push(reader_id); }
  if (book_id) { q += ' AND b.book_id = ?'; params.push(book_id); }
  if (overdue === '1') { q += " AND b.status = 'aktiv' AND b.date_due < date('now','localtime')"; }
  q += ' ORDER BY b.created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));
  const borrowings = db.prepare(q).all(...params);
  res.json(borrowings);
});

app.post('/api/borrowings', auth, (req, res) => {
  const { reader_id, book_id, notes } = req.body;
  if (!reader_id || !book_id) return res.status(400).json({ error: 'Lexuesi dhe libri janë të detyrueshëm' });

  const reader = db.prepare('SELECT * FROM readers WHERE id = ?').get(reader_id);
  if (!reader) return res.status(404).json({ error: 'Lexuesi nuk u gjet' });
  if (reader.status !== 'aktiv') return res.status(400).json({ error: 'Lexuesi nuk është aktiv' });

  // Check if reader has unreturned book
  const activeB = db.prepare("SELECT b.*, bk.title FROM borrowings b JOIN books bk ON b.book_id = bk.id WHERE b.reader_id = ? AND b.status = 'aktiv'").get(reader_id);
  if (activeB) return res.status(400).json({ error: `Lexuesi ka librin "${activeB.title}" ende pa kthyer. Ktheje fillimisht.` });

  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(book_id);
  if (!book) return res.status(404).json({ error: 'Libri nuk u gjet' });
  if (book.copies_available <= 0) return res.status(400).json({ error: 'Nuk ka kopje të disponueshme' });

  const borrowDays = parseInt(db.prepare("SELECT value FROM settings WHERE key='borrow_days'").get()?.value || '14');
  const dateGiven = new Date().toISOString().split('T')[0];
  const dateDue = new Date(Date.now() + borrowDays * 86400000).toISOString().split('T')[0];

  const r = db.prepare('INSERT INTO borrowings (reader_id, book_id, date_given, date_due, notes) VALUES (?,?,?,?,?)')
    .run(reader_id, book_id, dateGiven, dateDue, notes || null);
  db.prepare('UPDATE books SET copies_available = copies_available - 1, times_borrowed = times_borrowed + 1 WHERE id = ?').run(book_id);

  res.json({ id: r.lastInsertRowid, date_due: dateDue });
});

app.put('/api/borrowings/:id/return', auth, (req, res) => {
  const borrowing = db.prepare('SELECT * FROM borrowings WHERE id = ?').get(req.params.id);
  if (!borrowing) return res.status(404).json({ error: 'Huazimi nuk u gjet' });
  if (borrowing.status === 'kthyer') return res.status(400).json({ error: 'Libri është kthyer tashmë' });

  const dateReturned = new Date().toISOString().split('T')[0];
  db.prepare("UPDATE borrowings SET status = 'kthyer', date_returned = ? WHERE id = ?").run(dateReturned, req.params.id);
  db.prepare('UPDATE books SET copies_available = copies_available + 1 WHERE id = ?').run(borrowing.book_id);

  res.json({ ok: true, date_returned: dateReturned });
});

app.put('/api/borrowings/:id', auth, (req, res) => {
  const { date_due, notes } = req.body;
  db.prepare('UPDATE borrowings SET date_due = ?, notes = ? WHERE id = ?').run(date_due, notes, req.params.id);
  res.json({ ok: true });
});

app.delete('/api/borrowings/:id', auth, (req, res) => {
  const b = db.prepare('SELECT * FROM borrowings WHERE id = ?').get(req.params.id);
  if (!b) return res.status(404).json({ error: 'Huazimi nuk u gjet' });
  if (b.status === 'aktiv') {
    db.prepare('UPDATE books SET copies_available = copies_available + 1 WHERE id = ?').run(b.book_id);
  }
  db.prepare('DELETE FROM borrowings WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ─── STATS / REPORTS ────────────────────────────────────────────────────────
app.get('/api/stats/dashboard', auth, (req, res) => {
  const totalBooks = db.prepare('SELECT COUNT(*) as c FROM books WHERE active=1').get().c;
  const totalReaders = db.prepare("SELECT COUNT(*) as c FROM readers WHERE status='aktiv'").get().c;
  const activeBorrowings = db.prepare("SELECT COUNT(*) as c FROM borrowings WHERE status='aktiv'").get().c;
  const overdue = db.prepare("SELECT COUNT(*) as c FROM borrowings WHERE status='aktiv' AND date_due < date('now','localtime')").get().c;
  const returnedThisMonth = db.prepare("SELECT COUNT(*) as c FROM borrowings WHERE status='kthyer' AND strftime('%Y-%m', date_returned) = strftime('%Y-%m', 'now','localtime')").get().c;
  const newBooksThisMonth = db.prepare("SELECT COUNT(*) as c FROM books WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now','localtime')").get().c;
  const recentBorrowings = db.prepare(`SELECT b.*, r.name||' '||r.surname as reader_name, bk.title as book_title, bk.cover_color FROM borrowings b JOIN readers r ON b.reader_id=r.id JOIN books bk ON b.book_id=bk.id ORDER BY b.created_at DESC LIMIT 5`).all();
  const overdueList = db.prepare(`SELECT b.*, r.name||' '||r.surname as reader_name, r.phone as reader_phone, bk.title as book_title FROM borrowings b JOIN readers r ON b.reader_id=r.id JOIN books bk ON b.book_id=bk.id WHERE b.status='aktiv' AND b.date_due < date('now','localtime') ORDER BY b.date_due ASC LIMIT 5`).all();
  res.json({ totalBooks, totalReaders, activeBorrowings, overdue, returnedThisMonth, newBooksThisMonth, recentBorrowings, overdueList });
});

app.get('/api/stats/reader-of-month', auth, (req, res) => {
  const { year, month } = req.query;
  const y = year || new Date().getFullYear();
  const m = month || String(new Date().getMonth() + 1).padStart(2, '0');
  const period = `${y}-${String(m).padStart(2, '0')}`;
  const reader = db.prepare(`
    SELECT r.id, r.name, r.surname, r.phone, COUNT(*) as books_count
    FROM borrowings b JOIN readers r ON b.reader_id = r.id
    WHERE strftime('%Y-%m', b.date_given) = ? AND b.status != 'anuluar'
    GROUP BY r.id ORDER BY books_count DESC LIMIT 1
  `).get(period);
  res.json(reader || null);
});

app.get('/api/stats/reader-of-year', auth, (req, res) => {
  const year = req.query.year || new Date().getFullYear();
  const reader = db.prepare(`
    SELECT r.id, r.name, r.surname, r.phone, COUNT(*) as books_count
    FROM borrowings b JOIN readers r ON b.reader_id = r.id
    WHERE strftime('%Y', b.date_given) = ? AND b.status != 'anuluar'
    GROUP BY r.id ORDER BY books_count DESC LIMIT 1
  `).get(String(year));
  res.json(reader || null);
});

app.get('/api/stats/top-readers', auth, (req, res) => {
  const readers = db.prepare(`
    SELECT r.id, r.name, r.surname, COUNT(*) as books_count
    FROM borrowings b JOIN readers r ON b.reader_id = r.id
    WHERE strftime('%Y', b.date_given) = strftime('%Y', 'now','localtime')
    GROUP BY r.id ORDER BY books_count DESC LIMIT 10
  `).all();
  res.json(readers);
});

app.get('/api/stats/monthly', auth, (req, res) => {
  const year = req.query.year || new Date().getFullYear();
  const data = db.prepare(`
    SELECT strftime('%m', date_given) as month, COUNT(*) as count
    FROM borrowings WHERE strftime('%Y', date_given) = ?
    GROUP BY month ORDER BY month
  `).all(String(year));
  res.json(data);
});

// SPA fallback
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
});

app.listen(PORT, () => console.log(`Library server running on port ${PORT}`));

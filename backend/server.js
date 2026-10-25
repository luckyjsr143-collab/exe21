import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import sharp from "sharp";
import { randomUUID, timingSafeEqual } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import db from "./db.js";

const app = express();
const uploadDir = fileURLToPath(new URL("./uploads/", import.meta.url));
fs.mkdirSync(uploadDir, { recursive: true });
app.use(cors());
app.use(express.json({ limit: "20kb" }));
app.use("/uploads", express.static(uploadDir, { setHeaders(res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
}}));
const categories = ["Nature", "City", "Abstract", "Space", "Anime", "Car", "Other"];
const upload = multer({ storage: multer.memoryStorage(), limits: {
  fileSize: 10 * 1024 * 1024, files: 1, fields: 3, parts: 4
}, fileFilter(req, file, cb) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) {
    return cb(new Error("Only JPG, PNG and WebP are allowed."));
  }
  cb(null, true);
}});
function admin(req, res, next) {
  const expected = process.env.ADMIN_KEY;
  if (!expected || expected === "replace-with-a-long-random-secret") {
    return res.status(503).json({ error: "Set a unique ADMIN_KEY in backend/.env first." });
  }
  const supplied = req.get("x-admin-key") || "";
  const a = Buffer.from(expected), b = Buffer.from(supplied);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return res.status(401).json({ error: "Wrong admin key." });
  next();
}
app.get("/api/health", (req, res) => res.json({ ok: true }));
app.get("/api/wallpapers", (req, res, next) => {
  try {
    const q = String(req.query.q || "").slice(0, 100);
    const category = String(req.query.category || "all");
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 12));
    let where = "WHERE 1=1";
    const params = [];
    if (q) { where += " AND title LIKE ?"; params.push(`%${q}%`); }
    if (category !== "all") { where += " AND category = ?"; params.push(category); }
    const total = db.prepare(`SELECT COUNT(*) AS n FROM wallpapers ${where}`).get(...params).n;
    const wallpapers = db.prepare(`SELECT * FROM wallpapers ${where} ORDER BY id DESC LIMIT ? OFFSET ?`)
      .all(...params, limit, (page - 1) * limit);
    res.json({ wallpapers, total, page, limit });
  } catch(e) { next(e); }
});
async function saveUpload(req, res, next) {
  let target;
  try {
    if (!req.file) return res.status(400).json({ error: "Choose an image." });
    const title = String(req.body.title || "").trim();
    const category = String(req.body.category || "");
    if (!title || title.length > 100 || !categories.includes(category)) {
      return res.status(400).json({ error: "Enter a title (1-100 characters) and valid category." });
    }
    const name = `${randomUUID()}.webp`;
    target = path.join(uploadDir, name);
    // Decode and re-encode: uploaded MIME labels alone are not trusted.
    await sharp(req.file.buffer, { limitInputPixels: 40000000 })
      .rotate().webp({ quality: 90 }).toFile(target);
    const image = `/uploads/${name}`;
    const uploader = req.path.startsWith("/api/admin/") ? "Admin" : "Visitor";
    const result = db.prepare(`INSERT INTO wallpapers
      (title, category, image_url, thumbnail_url, local_file, uploader)
      VALUES (?, ?, ?, ?, ?, ?)`).run(title, category, image, image, name, uploader);
    res.status(201).json({ wallpaper: db.prepare("SELECT * FROM wallpapers WHERE id = ?").get(result.lastInsertRowid) });
  } catch(e) {
    if (target && fs.existsSync(target)) fs.unlinkSync(target);
    next(e);
  }
}
app.post("/api/wallpapers/upload", upload.single("image"), saveUpload);
app.post("/api/admin/wallpapers/upload", admin, upload.single("image"), saveUpload);
app.get("/api/wallpapers/:id/download", (req, res, next) => {
  const w = db.prepare("SELECT * FROM wallpapers WHERE id = ?").get(req.params.id);
  if (!w) return res.status(404).json({ error: "Wallpaper not found." });
  if (!w.local_file) return res.status(409).json({ error: "Old external demo image: direct download is available only for images uploaded here." });
  const file = path.join(uploadDir, path.basename(w.local_file));
  if (!fs.existsSync(file)) return res.status(404).json({ error: "Image file missing." });
  res.download(file, `wallpaper-${w.id}.webp`, err => {
    if (err) { if (!res.headersSent) next(err); return; }
    db.prepare("UPDATE wallpapers SET downloads = downloads + 1 WHERE id = ?").run(w.id);
  });
});
app.use((err, req, res, next) => {
  console.error(err.message);
  if (res.headersSent) return next(err);
  const message = err.code === "LIMIT_FILE_SIZE" ? "Maximum file size is 10 MB." : "Upload/request failed. Use a valid JPG, PNG or WebP within 10 MB.";
  res.status(400).json({ error: message });
});
app.listen(process.env.PORT || 5000, () => console.log(`Backend running: http://localhost:${process.env.PORT || 5000}`));

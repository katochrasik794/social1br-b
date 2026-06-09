import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOADS_ROOT = path.join(__dirname, "../../uploads");
const DEPOSITS_DIR = path.join(UPLOADS_ROOT, "deposits");
const GATEWAYS_DIR = path.join(UPLOADS_ROOT, "gateways");

for (const dir of [DEPOSITS_DIR, GATEWAYS_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, DEPOSITS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    const safeExt = [".jpg", ".jpeg", ".png", ".webp", ".pdf"].includes(ext) ? ext : ".jpg";
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${safeExt}`);
  },
});

export const depositProofUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /^(image\/(jpeg|png|webp)|application\/pdf)$/.test(file.mimetype);
    if (ok) cb(null, true);
    else cb(new Error("Only JPG, PNG, WEBP or PDF files are allowed"));
  },
}).single("proof");

const gatewayStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, GATEWAYS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".png";
    const safeExt = [".jpg", ".jpeg", ".png", ".webp", ".svg"].includes(ext) ? ext : ".png";
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${safeExt}`);
  },
});

const imageFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  const ok = /^(image\/(jpeg|png|webp|svg\+xml)|image\/svg)$/.test(file.mimetype);
  if (ok) cb(null, true);
  else cb(new Error("Only JPG, PNG, WEBP or SVG images are allowed"));
};

export const gatewayMediaUpload = multer({
  storage: gatewayStorage,
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: imageFilter,
}).fields([
  { name: "icon", maxCount: 1 },
  { name: "qrCode", maxCount: 1 },
]);

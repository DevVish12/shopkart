import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_ROOT = path.join(__dirname, '..', '..', 'uploads');

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp'];

// Factory: uploadFor('products') -> multer instance storing into backend/uploads/products/
// with safe filenames. Use .array('images[]', n) / .single('image') / .single('logo') at the route.
export const uploadFor = (folder) => {
  const dest = path.join(UPLOAD_ROOT, folder);
  fs.mkdirSync(dest, { recursive: true });

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, dest),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    },
  });

  const fileFilter = (req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) return cb(null, true);
    const err = new Error('Only JPEG, PNG and WebP images are allowed');
    err.statusCode = 400;
    return cb(err);
  };

  return multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });
};

// DB-facing public path for a stored file, e.g. "uploads/products/1690000000-123.jpg"
export const publicPath = (folder, filename) => `uploads/${folder}/${filename}`;

/**
 * Upload Middleware
 * Handles file uploads using multer
 */

import multer from 'multer';
import path from 'path';
import { Request } from 'express';
import { BadRequestError } from '../utils/errors';

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // In production, you'd upload to cloud storage (S3, Cloudinary, etc.)
    cb(null, 'uploads/profiles');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

// File filter
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Accept images only
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];

  if (!allowedTypes.includes(file.mimetype)) {
    cb(new BadRequestError('Only JPG, PNG, and GIF files are allowed'));
    return;
  }

  cb(null, true);
};

// Configure multer
export const uploadPhoto = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB max file size
  },
}).single('photo');

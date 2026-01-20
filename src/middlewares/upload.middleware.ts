/**
 * Upload Middleware
 * Handles file uploads using multer
 */

import multer from 'multer';
import path from 'path';
import { Request } from 'express';
import { BadRequestError } from '../utils/errors';

// Configure storage for profile photos
const profileStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    // In production, you'd upload to cloud storage (S3, Cloudinary, etc.)
    cb(null, 'uploads/profiles');
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

// Configure storage for payment proofs
const paymentProofStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, 'uploads/payment-proofs');
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'proof-' + uniqueSuffix + path.extname(file.originalname));
  },
});

// File filter
const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Accept images only
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];

  if (!allowedTypes.includes(file.mimetype)) {
    cb(new BadRequestError('Only JPG, PNG, and GIF files are allowed'));
    return;
  }

  cb(null, true);
};

// Configure multer for profile photos
export const uploadPhoto = multer({
  storage: profileStorage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB max file size
  },
}).single('photo');

// Configure multer for payment proof uploads
export const uploadPaymentProof = multer({
  storage: paymentProofStorage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size for receipts
  },
}).single('proofImage');

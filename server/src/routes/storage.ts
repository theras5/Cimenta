import express from 'express';
import multer from 'multer';
import { uploadProfilePicture, deleteProfilePicture, getUserProfile, getAvatarUrl } from '../controllers/storageController';

const storageRouter = express.Router();

// Configurar multer para almacenar en memoria
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen'));
    }
  }
});

storageRouter.post("/upload-profile-picture", upload.single('file'), uploadProfilePicture);
storageRouter.delete("/delete-profile-picture", deleteProfilePicture);
storageRouter.get("/user-profile/:userId", getUserProfile);
storageRouter.get("/avatar/:userId", getAvatarUrl);

export default storageRouter;

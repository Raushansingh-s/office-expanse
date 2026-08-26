const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload');
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// POST /api/upload/receipt
router.post('/receipt', authenticate, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    res.json({
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      url: `/uploads/${req.file.filename}`
    });
  } catch (err) {
    res.status(500).json({ error: 'Upload failed' });
  }
});

// DELETE /api/upload/:filename
router.delete('/:filename', authenticate, async (req, res) => {
  try {
    const filePath = path.join(process.env.UPLOAD_PATH || './uploads', req.params.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    // Also delete receipt record
    await prisma.expenseReceipt.deleteMany({ where: { filename: req.params.filename } });
    res.json({ message: 'File deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

module.exports = router;

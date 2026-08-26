const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');
const prisma = new PrismaClient();

router.get('/', authenticate, async (req, res) => {
  try {
    const categories = await prisma.expenseCategory.findMany({
      where: { companyId: req.user.companyId, status: 'active' },
      include: { _count: { select: { expenses: true } } },
      orderBy: { name: 'asc' }
    });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

router.post('/', authenticate, authorize('super_admin','admin'), async (req, res) => {
  try {
    const { name, icon, color } = req.body;
    if (!name) return res.status(400).json({ error: 'Category name is required' });
    const cat = await prisma.expenseCategory.create({
      data: { companyId: req.user.companyId, name, icon, color, isDefault: false }
    });
    res.status(201).json(cat);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create category' });
  }
});

router.put('/:id', authenticate, authorize('super_admin','admin'), async (req, res) => {
  try {
    const { name, icon, color, status } = req.body;
    const updated = await prisma.expenseCategory.update({
      where: { id: req.params.id },
      data: { name, icon, color, status }
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update category' });
  }
});

router.delete('/:id', authenticate, authorize('super_admin'), async (req, res) => {
  try {
    await prisma.expenseCategory.update({ where: { id: req.params.id }, data: { status: 'inactive' } });
    res.json({ message: 'Category deactivated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

module.exports = router;

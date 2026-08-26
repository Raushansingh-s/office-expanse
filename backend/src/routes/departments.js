const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');
const { auditLog } = require('../utils/audit');
const prisma = new PrismaClient();

// Departments
router.get('/', authenticate, async (req, res) => {
  try {
    const departments = await prisma.department.findMany({
      where: { companyId: req.user.companyId },
      include: { _count: { select: { users: true, expenses: true } } },
      orderBy: { name: 'asc' }
    });
    res.json(departments);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

router.post('/', authenticate, authorize('super_admin','admin'), async (req, res) => {
  try {
    const { name, code, departmentHead, status } = req.body;
    if (!name) return res.status(400).json({ error: 'Department name is required' });
    const dept = await prisma.department.create({
      data: { companyId: req.user.companyId, name, code: code || null, departmentHead: departmentHead || null, status: status || 'active' }
    });
    await auditLog({ userId: req.user.id, action: 'CREATE_DEPARTMENT', resource: 'departments', resourceId: dept.id, newValue: { name }, req });
    res.status(201).json(dept);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create department' });
  }
});

router.put('/:id', authenticate, authorize('super_admin','admin'), async (req, res) => {
  try {
    const { name, code, departmentHead, status } = req.body;
    const updated = await prisma.department.update({
      where: { id: req.params.id },
      data: { name, code, departmentHead, status }
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update department' });
  }
});

router.delete('/:id', authenticate, authorize('super_admin'), async (req, res) => {
  try {
    await prisma.department.update({ where: { id: req.params.id }, data: { status: 'inactive' } });
    res.json({ message: 'Department deactivated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete department' });
  }
});

module.exports = router;

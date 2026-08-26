const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');
const { auditLog } = require('../utils/audit');

const prisma = new PrismaClient();

// GET /api/users
router.get('/', authenticate, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const { status, roleId, departmentId, search } = req.query;
    const where = { companyId: req.user.companyId };
    if (status) where.status = status;
    if (roleId) where.roleId = roleId;
    if (departmentId) where.departmentId = departmentId;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { employeeId: { contains: search } },
        { mobile: { contains: search } }
      ];
    }

    const users = await prisma.user.findMany({
      where,
      include: { role: true, department: true },
      orderBy: { name: 'asc' }
    });

    res.json(users.map(({ password, refreshToken, ...u }) => u));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// POST /api/users
router.post('/', authenticate, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const { name, employeeId, email, mobile, password, roleId, departmentId, joiningDate, upiId } = req.body;

    if (!name || !email || !password || !roleId) {
      return res.status(400).json({ error: 'Name, email, password and role are required' });
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) return res.status(400).json({ error: 'Email already exists' });

    // Only super admin can create super admin
    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (role?.name === 'super_admin' && req.user.role.name !== 'super_admin') {
      return res.status(403).json({ error: 'Only Super Admin can create Super Admin accounts' });
    }

    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        companyId: req.user.companyId,
        name,
        employeeId,
        email: email.toLowerCase(),
        mobile,
        password: hashed,
        roleId,
        departmentId: departmentId || null,
        joiningDate: joiningDate ? new Date(joiningDate) : null,
        upiId
      },
      include: { role: true, department: true }
    });

    await auditLog({ userId: req.user.id, action: 'CREATE_USER', resource: 'users', resourceId: user.id, newValue: { name, email, roleId }, req });

    const { password: _, refreshToken, ...safeUser } = user;
    res.status(201).json(safeUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// GET /api/users/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: { role: true, department: true }
    });
    if (!user || user.companyId !== req.user.companyId) {
      return res.status(404).json({ error: 'User not found' });
    }
    // Non-admins can only view themselves
    if (!['super_admin','admin'].includes(req.user.role.name) && req.user.id !== req.params.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const { password, refreshToken, ...safeUser } = user;
    res.json(safeUser);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// PUT /api/users/:id
router.put('/:id', authenticate, async (req, res) => {
  try {
    const isAdmin = ['super_admin','admin'].includes(req.user.role.name);
    if (!isAdmin && req.user.id !== req.params.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.companyId !== req.user.companyId) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent non-super-admin from editing super admin
    const existingRole = await prisma.role.findUnique({ where: { id: existing.roleId } });
    if (existingRole?.name === 'super_admin' && req.user.role.name !== 'super_admin') {
      return res.status(403).json({ error: 'Cannot modify Super Admin account' });
    }

    const { name, mobile, departmentId, joiningDate, upiId, status, roleId } = req.body;
    const updateData = {};
    if (name) updateData.name = name;
    if (mobile !== undefined) updateData.mobile = mobile;
    if (upiId !== undefined) updateData.upiId = upiId;
    if (joiningDate) updateData.joiningDate = new Date(joiningDate);
    if (isAdmin && departmentId !== undefined) updateData.departmentId = departmentId || null;
    if (isAdmin && status) updateData.status = status;
    if (isAdmin && roleId) updateData.roleId = roleId;

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: updateData,
      include: { role: true, department: true }
    });

    await auditLog({ userId: req.user.id, action: 'UPDATE_USER', resource: 'users', resourceId: req.params.id, oldValue: existing, newValue: updateData, req });

    const { password, refreshToken, ...safeUser } = updated;
    res.json(safeUser);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// PUT /api/users/:id/reset-password
router.put('/:id/reset-password', authenticate, authorize('super_admin','admin'), async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    const hashed = await bcrypt.hash(password, 12);
    await prisma.user.update({ where: { id: req.params.id }, data: { password: hashed } });
    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// DELETE /api/users/:id
router.delete('/:id', authenticate, authorize('super_admin'), async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id }, include: { role: true } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.id === req.user.id) return res.status(400).json({ error: 'Cannot delete your own account' });

    await prisma.user.update({ where: { id: req.params.id }, data: { status: 'inactive' } });
    await auditLog({ userId: req.user.id, action: 'DEACTIVATE_USER', resource: 'users', resourceId: req.params.id, req });
    res.json({ message: 'User deactivated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to deactivate user' });
  }
});

// GET /api/users/roles/list
router.get('/roles/list', authenticate, async (req, res) => {
  try {
    const roles = await prisma.role.findMany({ orderBy: { name: 'asc' } });
    res.json(roles);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

module.exports = router;

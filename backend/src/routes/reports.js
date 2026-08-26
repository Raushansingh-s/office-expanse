const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');
const prisma = new PrismaClient();

// GET /api/reports/expenses
router.get('/expenses', authenticate, async (req, res) => {
  try {
    const { startDate, endDate, departmentId, userId, categoryId, status, paymentSource } = req.query;
    const where = { companyId: req.user.companyId };
    if (['director','employee'].includes(req.user.role.name)) where.userId = req.user.id;
    else if (userId) where.userId = userId;
    if (departmentId) where.departmentId = departmentId;
    if (categoryId) where.categoryId = categoryId;
    if (status) where.status = status;
    if (paymentSource) where.paymentSource = paymentSource;
    if (startDate || endDate) {
      where.expenseDate = {};
      if (startDate) where.expenseDate.gte = new Date(startDate);
      if (endDate) where.expenseDate.lte = new Date(endDate);
    }
    const expenses = await prisma.expense.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, employeeId: true } },
        department: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
        reimbursement: { select: { status: true, paidAmount: true, paymentDate: true } }
      },
      orderBy: { expenseDate: 'desc' }
    });
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// GET /api/reports/monthly
router.get('/monthly', authenticate, async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    const results = [];
    for (let month = 0; month < 12; month++) {
      const start = new Date(parseInt(year), month, 1);
      const end = new Date(parseInt(year), month + 1, 0, 23, 59, 59);
      const data = await prisma.expense.aggregate({
        where: { companyId: req.user.companyId, expenseDate: { gte: start, lte: end }, status: { notIn: ['cancelled'] } },
        _sum: { amount: true },
        _count: true
      });
      results.push({
        month: start.toLocaleString('en-IN', { month: 'short' }),
        amount: data._sum.amount || 0,
        count: data._count
      });
    }
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate monthly report' });
  }
});

// GET /api/reports/categories
router.get('/categories', authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const where = { companyId: req.user.companyId, status: { notIn: ['cancelled','rejected'] } };
    if (startDate || endDate) {
      where.expenseDate = {};
      if (startDate) where.expenseDate.gte = new Date(startDate);
      if (endDate) where.expenseDate.lte = new Date(endDate);
    }
    const categories = await prisma.expenseCategory.findMany({
      where: { companyId: req.user.companyId, status: 'active' }
    });
    const results = await Promise.all(categories.map(async (cat) => {
      const agg = await prisma.expense.aggregate({
        where: { ...where, categoryId: cat.id },
        _sum: { amount: true },
        _count: true
      });
      return { id: cat.id, name: cat.name, color: cat.color, amount: agg._sum.amount || 0, count: agg._count };
    }));
    res.json(results.sort((a, b) => b.amount - a.amount));
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate category report' });
  }
});

// GET /api/reports/departments
router.get('/departments', authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const where = { companyId: req.user.companyId, status: { notIn: ['cancelled','rejected'] } };
    if (startDate || endDate) {
      where.expenseDate = {};
      if (startDate) where.expenseDate.gte = new Date(startDate);
      if (endDate) where.expenseDate.lte = new Date(endDate);
    }
    const depts = await prisma.department.findMany({ where: { companyId: req.user.companyId } });
    const results = await Promise.all(depts.map(async (dept) => {
      const agg = await prisma.expense.aggregate({
        where: { ...where, departmentId: dept.id },
        _sum: { amount: true },
        _count: true
      });
      return { id: dept.id, name: dept.name, amount: agg._sum.amount || 0, count: agg._count };
    }));
    res.json(results.sort((a, b) => b.amount - a.amount));
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate department report' });
  }
});

// GET /api/reports/users
router.get('/users', authenticate, authorize('super_admin','admin'), async (req, res) => {
  try {
    const { roleFilter, startDate, endDate } = req.query;
    const userWhere = { companyId: req.user.companyId, status: 'active' };
    if (roleFilter) userWhere.role = { name: roleFilter };

    const users = await prisma.user.findMany({
      where: userWhere,
      include: { role: true, department: true }
    });

    const expWhere = { companyId: req.user.companyId, status: { notIn: ['cancelled'] } };
    if (startDate || endDate) {
      expWhere.expenseDate = {};
      if (startDate) expWhere.expenseDate.gte = new Date(startDate);
      if (endDate) expWhere.expenseDate.lte = new Date(endDate);
    }

    const results = await Promise.all(users.map(async (user) => {
      const [total, company, personal, reimbursed, rejected] = await Promise.all([
        prisma.expense.aggregate({ where: { ...expWhere, userId: user.id }, _sum: { amount: true }, _count: true }),
        prisma.expense.aggregate({ where: { ...expWhere, userId: user.id, paymentSource: 'company' }, _sum: { amount: true } }),
        prisma.expense.aggregate({ where: { ...expWhere, userId: user.id, paymentSource: 'personal' }, _sum: { amount: true } }),
        prisma.reimbursement.aggregate({ where: { userId: user.id, status: 'paid' }, _sum: { paidAmount: true } }),
        prisma.expense.aggregate({ where: { ...expWhere, userId: user.id, status: 'rejected' }, _sum: { amount: true } })
      ]);
      return {
        user: { id: user.id, name: user.name, email: user.email, employeeId: user.employeeId, role: user.role.displayName, department: user.department?.name },
        totalAmount: total._sum.amount || 0,
        totalCount: total._count,
        companyPaid: company._sum.amount || 0,
        personallyPaid: personal._sum.amount || 0,
        reimbursed: reimbursed._sum.paidAmount || 0,
        rejected: rejected._sum.amount || 0,
        pendingReimbursement: Math.max(0, (personal._sum.amount || 0) - (reimbursed._sum.paidAmount || 0))
      };
    }));
    res.json(results.sort((a, b) => b.totalAmount - a.totalAmount));
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate user report' });
  }
});

// GET /api/reports/reimbursements
router.get('/reimbursements', authenticate, async (req, res) => {
  try {
    const { startDate, endDate, status } = req.query;
    const where = {};
    if (['director','employee'].includes(req.user.role.name)) where.userId = req.user.id;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }
    const data = await prisma.reimbursement.findMany({
      where,
      include: {
        expense: { include: { category: true } },
        user: { select: { id: true, name: true, employeeId: true, department: true } },
        approvedBy: { select: { id: true, name: true } },
        paidBy: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate reimbursement report' });
  }
});

// GET /api/reports/payment-methods
router.get('/payment-methods', authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const methods = ['cash','upi','debit_card','credit_card','bank_transfer','cheque','other'];
    const where = { companyId: req.user.companyId, status: { notIn: ['cancelled','rejected'] } };
    if (startDate || endDate) {
      where.expenseDate = {};
      if (startDate) where.expenseDate.gte = new Date(startDate);
      if (endDate) where.expenseDate.lte = new Date(endDate);
    }
    const results = await Promise.all(methods.map(async (method) => {
      const agg = await prisma.expense.aggregate({ where: { ...where, paymentMethod: method }, _sum: { amount: true }, _count: true });
      return { method, amount: agg._sum.amount || 0, count: agg._count };
    }));
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate payment method report' });
  }
});

module.exports = router;

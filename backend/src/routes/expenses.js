const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');
const { auditLog } = require('../utils/audit');
const upload = require('../middleware/upload');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();

const generateExpenseNumber = () => {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `EXP-${year}${month}-${rand}`;
};

const checkDuplicate = async (userId, expenseDate, amount, merchantName, billNumber, excludeId = null) => {
  const start = new Date(expenseDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(expenseDate);
  end.setHours(23, 59, 59, 999);

  const where = {
    userId,
    expenseDate: { gte: start, lte: end },
    amount: parseFloat(amount),
    status: { notIn: ['cancelled', 'rejected'] }
  };
  if (excludeId) where.id = { not: excludeId };
  if (merchantName) where.merchantName = merchantName;
  if (billNumber) where.billNumber = billNumber;

  const count = await prisma.expense.count({ where });
  return count > 0;
};

const expenseInclude = {
  user: { select: { id: true, name: true, email: true, employeeId: true } },
  department: { select: { id: true, name: true } },
  category: { select: { id: true, name: true, color: true } },
  approvedBy: { select: { id: true, name: true } },
  receipts: true,
  approvals: {
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'asc' }
  },
  reimbursement: {
    include: {
      approvedBy: { select: { id: true, name: true } },
      paidBy: { select: { id: true, name: true } }
    }
  }
};

// GET /api/expenses
router.get('/', authenticate, async (req, res) => {
  try {
    const {
      page = 1, limit = 20, search, userId, departmentId, categoryId,
      status, paymentSource, paymentMethod, startDate, endDate,
      minAmount, maxAmount, role
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = { companyId: req.user.companyId };

    // Role-based filtering
    if (['director','employee'].includes(req.user.role.name)) {
      where.userId = req.user.id;
    } else if (userId) {
      where.userId = userId;
    }

    if (departmentId) where.departmentId = departmentId;
    if (categoryId) where.categoryId = categoryId;
    if (status) where.status = { in: status.split(',') };
    if (paymentSource) where.paymentSource = paymentSource;
    if (paymentMethod) where.paymentMethod = paymentMethod;
    if (startDate || endDate) {
      where.expenseDate = {};
      if (startDate) where.expenseDate.gte = new Date(startDate);
      if (endDate) where.expenseDate.lte = new Date(endDate);
    }
    if (minAmount || maxAmount) {
      where.amount = {};
      if (minAmount) where.amount.gte = parseFloat(minAmount);
      if (maxAmount) where.amount.lte = parseFloat(maxAmount);
    }
    if (search) {
      where.OR = [
        { expenseNumber: { contains: search } },
        { description: { contains: search } },
        { merchantName: { contains: search } },
        { billNumber: { contains: search } },
        { user: { name: { contains: search } } }
      ];
    }

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        include: expenseInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.expense.count({ where })
    ]);

    res.json({
      data: expenses,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
});

// POST /api/expenses
router.post('/', authenticate, upload.array('receipts', 5), async (req, res) => {
  try {
    const {
      expenseDate, description, amount, categoryId, departmentId,
      paymentSource, paymentMethod, merchantName, location, billNumber,
      reimbursementRequired, reimbursementAmount, notes, userId: targetUserId
    } = req.body;

    if (!expenseDate || !description || !amount || !categoryId || !paymentSource || !paymentMethod) {
      return res.status(400).json({ error: 'Please fill all required fields' });
    }
    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Please enter a valid amount' });
    }

    // Admins can add expense on behalf of others
    let ownerId = req.user.id;
    if (['super_admin','admin'].includes(req.user.role.name) && targetUserId) {
      ownerId = targetUserId;
    }

    // Duplicate check
    const isDup = await checkDuplicate(ownerId, expenseDate, amount, merchantName, billNumber);

    const expenseNumber = generateExpenseNumber();
    const expense = await prisma.expense.create({
      data: {
        expenseNumber,
        companyId: req.user.companyId,
        userId: ownerId,
        departmentId: departmentId || req.user.departmentId || null,
        categoryId,
        expenseDate: new Date(expenseDate),
        description,
        amount: parseFloat(amount),
        paymentSource,
        paymentMethod,
        merchantName: merchantName || null,
        location: location || null,
        billNumber: billNumber || null,
        reimbursementRequired: reimbursementRequired === 'true' || reimbursementRequired === true,
        reimbursementAmount: reimbursementAmount ? parseFloat(reimbursementAmount) : null,
        notes: notes || null,
        status: 'submitted',
        isDuplicate: isDup
      },
      include: expenseInclude
    });

    // Save uploaded receipts
    if (req.files && req.files.length > 0) {
      await prisma.expenseReceipt.createMany({
        data: req.files.map(f => ({
          expenseId: expense.id,
          filename: f.filename,
          originalName: f.originalname,
          mimeType: f.mimetype,
          size: f.size,
          path: f.path
        }))
      });
    }

    // Create approval entry
    await prisma.expenseApproval.create({
      data: {
        expenseId: expense.id,
        userId: req.user.id,
        action: 'submitted',
        comment: 'Expense submitted'
      }
    });

    // Create notification for admins
    const admins = await prisma.user.findMany({
      where: { companyId: req.user.companyId, role: { name: { in: ['super_admin','admin'] } }, status: 'active' }
    });
    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map(admin => ({
          userId: admin.id,
          title: 'New Expense Submitted',
          message: `${req.user.name} submitted expense ${expenseNumber} for ₹${parseFloat(amount).toLocaleString('en-IN')}`,
          type: 'info',
          link: `/expenses/${expense.id}`
        }))
      });
    }

    await auditLog({ userId: req.user.id, action: 'CREATE_EXPENSE', resource: 'expenses', resourceId: expense.id, newValue: { expenseNumber, amount }, req });

    // Re-fetch with receipts
    const full = await prisma.expense.findUnique({ where: { id: expense.id }, include: expenseInclude });
    res.status(201).json({ ...full, isDuplicate: isDup });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create expense' });
  }
});

// GET /api/expenses/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const expense = await prisma.expense.findUnique({
      where: { id: req.params.id },
      include: expenseInclude
    });
    if (!expense || expense.companyId !== req.user.companyId) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    if (['director','employee'].includes(req.user.role.name) && expense.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    res.json(expense);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch expense' });
  }
});

// PUT /api/expenses/:id
router.put('/:id', authenticate, upload.array('receipts', 5), async (req, res) => {
  try {
    const expense = await prisma.expense.findUnique({ where: { id: req.params.id } });
    if (!expense || expense.companyId !== req.user.companyId) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    // Only owner or admin can edit; and only before approval
    const isAdmin = ['super_admin','admin'].includes(req.user.role.name);
    if (!isAdmin && expense.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (!isAdmin && !['draft','submitted','correction_requested'].includes(expense.status)) {
      return res.status(400).json({ error: 'Cannot edit an expense that has already been reviewed' });
    }

    const {
      expenseDate, description, amount, categoryId, departmentId,
      paymentSource, paymentMethod, merchantName, location, billNumber,
      reimbursementRequired, reimbursementAmount, notes
    } = req.body;

    const updateData = {};
    if (expenseDate) updateData.expenseDate = new Date(expenseDate);
    if (description) updateData.description = description;
    if (amount) updateData.amount = parseFloat(amount);
    if (categoryId) updateData.categoryId = categoryId;
    if (departmentId !== undefined) updateData.departmentId = departmentId || null;
    if (paymentSource) updateData.paymentSource = paymentSource;
    if (paymentMethod) updateData.paymentMethod = paymentMethod;
    if (merchantName !== undefined) updateData.merchantName = merchantName;
    if (location !== undefined) updateData.location = location;
    if (billNumber !== undefined) updateData.billNumber = billNumber;
    if (reimbursementRequired !== undefined) updateData.reimbursementRequired = reimbursementRequired === 'true' || reimbursementRequired === true;
    if (reimbursementAmount !== undefined) updateData.reimbursementAmount = reimbursementAmount ? parseFloat(reimbursementAmount) : null;
    if (notes !== undefined) updateData.notes = notes;
    if (expense.status === 'correction_requested') updateData.status = 'submitted';

    const updated = await prisma.expense.update({
      where: { id: req.params.id },
      data: updateData,
      include: expenseInclude
    });

    if (req.files && req.files.length > 0) {
      await prisma.expenseReceipt.createMany({
        data: req.files.map(f => ({
          expenseId: expense.id,
          filename: f.filename,
          originalName: f.originalname,
          mimeType: f.mimetype,
          size: f.size,
          path: f.path
        }))
      });
    }

    if (expense.status === 'correction_requested') {
      await prisma.expenseApproval.create({
        data: { expenseId: expense.id, userId: req.user.id, action: 'resubmitted', comment: 'Expense resubmitted after correction' }
      });
    }

    await auditLog({ userId: req.user.id, action: 'UPDATE_EXPENSE', resource: 'expenses', resourceId: expense.id, oldValue: expense, newValue: updateData, req });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update expense' });
  }
});

// POST /api/expenses/:id/approve
router.post('/:id/approve', authenticate, authorize('super_admin','admin'), async (req, res) => {
  try {
    const { approvedAmount, comment } = req.body;
    const expense = await prisma.expense.findUnique({ where: { id: req.params.id } });
    if (!expense || expense.companyId !== req.user.companyId) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    if (!['submitted','under_review'].includes(expense.status)) {
      return res.status(400).json({ error: 'Expense cannot be approved in its current status' });
    }

    const finalAmount = approvedAmount ? parseFloat(approvedAmount) : expense.amount;
    let newStatus = 'approved';
    if (expense.paymentSource === 'personal' && expense.reimbursementRequired) {
      newStatus = 'reimbursement_pending';
    } else if (expense.paymentSource === 'company') {
      newStatus = 'approved';
    }

    const updated = await prisma.expense.update({
      where: { id: req.params.id },
      data: {
        status: newStatus,
        approvedById: req.user.id,
        approvedAt: new Date(),
        approvedAmount: finalAmount
      },
      include: expenseInclude
    });

    await prisma.expenseApproval.create({
      data: { expenseId: expense.id, userId: req.user.id, action: 'approved', comment: comment || `Approved for ₹${finalAmount}`, amount: finalAmount }
    });

    // Create reimbursement record if needed
    if (expense.paymentSource === 'personal' && expense.reimbursementRequired) {
      await prisma.reimbursement.create({
        data: {
          expenseId: expense.id,
          userId: expense.userId,
          requestedAmount: expense.reimbursementAmount || expense.amount,
          approvedAmount: finalAmount,
          status: 'approved'
        }
      });
    }

    // Notify user
    await prisma.notification.create({
      data: {
        userId: expense.userId,
        title: 'Expense Approved',
        message: `Your expense ${expense.expenseNumber} has been approved for ₹${finalAmount.toLocaleString('en-IN')}`,
        type: 'success',
        link: `/expenses/${expense.id}`
      }
    });

    await auditLog({ userId: req.user.id, action: 'APPROVE_EXPENSE', resource: 'expenses', resourceId: expense.id, newValue: { approvedAmount: finalAmount }, req });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to approve expense' });
  }
});

// POST /api/expenses/:id/reject
router.post('/:id/reject', authenticate, authorize('super_admin','admin'), async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ error: 'Rejection reason is required' });

    const expense = await prisma.expense.findUnique({ where: { id: req.params.id } });
    if (!expense || expense.companyId !== req.user.companyId) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    const updated = await prisma.expense.update({
      where: { id: req.params.id },
      data: { status: 'rejected', rejectionReason: reason, approvedById: req.user.id, approvedAt: new Date() },
      include: expenseInclude
    });

    await prisma.expenseApproval.create({
      data: { expenseId: expense.id, userId: req.user.id, action: 'rejected', comment: reason }
    });

    await prisma.notification.create({
      data: {
        userId: expense.userId,
        title: 'Expense Rejected',
        message: `Your expense ${expense.expenseNumber} was rejected: ${reason}`,
        type: 'error',
        link: `/expenses/${expense.id}`
      }
    });

    await auditLog({ userId: req.user.id, action: 'REJECT_EXPENSE', resource: 'expenses', resourceId: expense.id, newValue: { reason }, req });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to reject expense' });
  }
});

// POST /api/expenses/:id/request-correction
router.post('/:id/request-correction', authenticate, authorize('super_admin','admin'), async (req, res) => {
  try {
    const { comment } = req.body;
    if (!comment) return res.status(400).json({ error: 'Correction details are required' });

    const expense = await prisma.expense.findUnique({ where: { id: req.params.id } });
    if (!expense) return res.status(404).json({ error: 'Expense not found' });

    await prisma.expense.update({ where: { id: req.params.id }, data: { status: 'correction_requested' } });
    await prisma.expenseApproval.create({
      data: { expenseId: expense.id, userId: req.user.id, action: 'correction_requested', comment }
    });
    await prisma.notification.create({
      data: {
        userId: expense.userId,
        title: 'Correction Requested',
        message: `Please correct your expense ${expense.expenseNumber}: ${comment}`,
        type: 'warning',
        link: `/expenses/${expense.id}`
      }
    });

    res.json({ message: 'Correction requested' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to request correction' });
  }
});

// DELETE /api/expenses/:id
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const expense = await prisma.expense.findUnique({ where: { id: req.params.id }, include: { receipts: true } });
    if (!expense || expense.companyId !== req.user.companyId) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    const isAdmin = ['super_admin','admin'].includes(req.user.role.name);
    if (!isAdmin && expense.userId !== req.user.id) return res.status(403).json({ error: 'Access denied' });
    if (!isAdmin && expense.status !== 'draft') return res.status(400).json({ error: 'Can only delete draft expenses' });

    // Delete receipt files
    for (const receipt of expense.receipts) {
      try { fs.unlinkSync(receipt.path); } catch (_) {}
    }

    await prisma.expense.update({ where: { id: req.params.id }, data: { status: 'cancelled' } });
    await auditLog({ userId: req.user.id, action: 'CANCEL_EXPENSE', resource: 'expenses', resourceId: req.params.id, req });
    res.json({ message: 'Expense cancelled' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete expense' });
  }
});

// GET /api/expenses/dashboard/summary
router.get('/dashboard/summary', authenticate, async (req, res) => {
  try {
    const { startDate, endDate, departmentId, userId: filterUserId } = req.query;
    const where = { companyId: req.user.companyId };

    if (['director','employee'].includes(req.user.role.name)) {
      where.userId = req.user.id;
    } else if (filterUserId) {
      where.userId = filterUserId;
    }
    if (departmentId) where.departmentId = departmentId;
    if (startDate || endDate) {
      where.expenseDate = {};
      if (startDate) where.expenseDate.gte = new Date(startDate);
      if (endDate) where.expenseDate.lte = new Date(endDate);
    }

    const [
      total, thisMonth, today, pendingApproval,
      pendingReimbursement, reimbursed, rejected, companyPaid, personallyPaid
    ] = await Promise.all([
      prisma.expense.aggregate({ where: { ...where, status: { notIn: ['cancelled'] } }, _sum: { amount: true }, _count: true }),
      prisma.expense.aggregate({
        where: { ...where, status: { notIn: ['cancelled'] }, expenseDate: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } },
        _sum: { amount: true }, _count: true
      }),
      prisma.expense.aggregate({
        where: { ...where, status: { notIn: ['cancelled'] }, expenseDate: { gte: new Date(new Date().setHours(0,0,0,0)) } },
        _sum: { amount: true }, _count: true
      }),
      prisma.expense.aggregate({ where: { ...where, status: { in: ['submitted','under_review'] } }, _sum: { amount: true }, _count: true }),
      prisma.expense.aggregate({ where: { ...where, status: 'reimbursement_pending' }, _sum: { reimbursementAmount: true }, _count: true }),
      prisma.reimbursement.aggregate({ where: { status: 'paid', expense: { companyId: req.user.companyId } }, _sum: { paidAmount: true }, _count: true }),
      prisma.expense.aggregate({ where: { ...where, status: 'rejected' }, _sum: { amount: true }, _count: true }),
      prisma.expense.aggregate({ where: { ...where, paymentSource: 'company', status: { notIn: ['cancelled','rejected'] } }, _sum: { amount: true }, _count: true }),
      prisma.expense.aggregate({ where: { ...where, paymentSource: 'personal', status: { notIn: ['cancelled','rejected'] } }, _sum: { amount: true }, _count: true })
    ]);

    res.json({
      total: { amount: total._sum.amount || 0, count: total._count },
      thisMonth: { amount: thisMonth._sum.amount || 0, count: thisMonth._count },
      today: { amount: today._sum.amount || 0, count: today._count },
      pendingApproval: { amount: pendingApproval._sum.amount || 0, count: pendingApproval._count },
      pendingReimbursement: { amount: pendingReimbursement._sum.reimbursementAmount || 0, count: pendingReimbursement._count },
      reimbursed: { amount: reimbursed._sum.paidAmount || 0, count: reimbursed._count },
      rejected: { amount: rejected._sum.amount || 0, count: rejected._count },
      companyPaid: { amount: companyPaid._sum.amount || 0, count: companyPaid._count },
      personallyPaid: { amount: personallyPaid._sum.amount || 0, count: personallyPaid._count }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

module.exports = router;

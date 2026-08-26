const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');
const { auditLog } = require('../utils/audit');
const upload = require('../middleware/upload');

const prisma = new PrismaClient();

// GET /api/reimbursements
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, userId: filterUserId } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = {};

    if (['director','employee'].includes(req.user.role.name)) {
      where.userId = req.user.id;
    } else if (filterUserId) {
      where.userId = filterUserId;
    }
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      prisma.reimbursement.findMany({
        where,
        include: {
          expense: { include: { category: true, department: true } },
          user: { select: { id: true, name: true, email: true, department: true } },
          approvedBy: { select: { id: true, name: true } },
          paidBy: { select: { id: true, name: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.reimbursement.count({ where })
    ]);

    res.json({ data, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch reimbursements' });
  }
});

// GET /api/reimbursements/summary
router.get('/summary', authenticate, async (req, res) => {
  try {
    const baseWhere = ['director','employee'].includes(req.user.role.name) ? { userId: req.user.id } : {};
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [pending, approvedForPayment, paidThisMonth, totalReimbursed] = await Promise.all([
      prisma.reimbursement.aggregate({ where: { ...baseWhere, status: 'pending' }, _sum: { requestedAmount: true }, _count: true }),
      prisma.reimbursement.aggregate({ where: { ...baseWhere, status: 'approved' }, _sum: { approvedAmount: true }, _count: true }),
      prisma.reimbursement.aggregate({ where: { ...baseWhere, status: 'paid', paymentDate: { gte: monthStart } }, _sum: { paidAmount: true }, _count: true }),
      prisma.reimbursement.aggregate({ where: { ...baseWhere, status: 'paid' }, _sum: { paidAmount: true }, _count: true })
    ]);

    res.json({
      pending: { amount: pending._sum.requestedAmount || 0, count: pending._count },
      approvedForPayment: { amount: approvedForPayment._sum.approvedAmount || 0, count: approvedForPayment._count },
      paidThisMonth: { amount: paidThisMonth._sum.paidAmount || 0, count: paidThisMonth._count },
      totalReimbursed: { amount: totalReimbursed._sum.paidAmount || 0, count: totalReimbursed._count }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

// POST /api/reimbursements/:id/approve
router.post('/:id/approve', authenticate, authorize('super_admin','admin'), async (req, res) => {
  try {
    const { approvedAmount, notes } = req.body;
    const reimbursement = await prisma.reimbursement.findUnique({ where: { id: req.params.id } });
    if (!reimbursement) return res.status(404).json({ error: 'Reimbursement not found' });

    const finalAmount = approvedAmount ? parseFloat(approvedAmount) : reimbursement.requestedAmount;
    const isPartial = finalAmount < reimbursement.requestedAmount;

    const updated = await prisma.reimbursement.update({
      where: { id: req.params.id },
      data: {
        status: isPartial ? 'partially_approved' : 'approved',
        approvedAmount: finalAmount,
        approvedById: req.user.id,
        approvedAt: new Date(),
        notes: notes || null
      }
    });

    await prisma.notification.create({
      data: {
        userId: reimbursement.userId,
        title: 'Reimbursement Approved',
        message: `Your reimbursement of ₹${finalAmount.toLocaleString('en-IN')} has been approved`,
        type: 'success'
      }
    });

    await auditLog({ userId: req.user.id, action: 'APPROVE_REIMBURSEMENT', resource: 'reimbursements', resourceId: req.params.id, newValue: { approvedAmount: finalAmount }, req });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to approve reimbursement' });
  }
});

// POST /api/reimbursements/:id/reject
router.post('/:id/reject', authenticate, authorize('super_admin','admin'), async (req, res) => {
  try {
    const { notes } = req.body;
    const updated = await prisma.reimbursement.update({
      where: { id: req.params.id },
      data: { status: 'rejected', notes, approvedById: req.user.id, approvedAt: new Date() }
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to reject reimbursement' });
  }
});

// POST /api/reimbursements/:id/pay
router.post('/:id/pay', authenticate, authorize('super_admin','admin'), upload.single('paymentProof'), async (req, res) => {
  try {
    const { paymentDate, paidAmount, paymentMethod, transactionReference, paymentNotes } = req.body;
    if (!paymentDate || !paidAmount || !paymentMethod) {
      return res.status(400).json({ error: 'Payment date, amount and method are required' });
    }

    const reimbursement = await prisma.reimbursement.findUnique({ where: { id: req.params.id } });
    if (!reimbursement) return res.status(404).json({ error: 'Reimbursement not found' });
    if (!['approved','partially_approved'].includes(reimbursement.status)) {
      return res.status(400).json({ error: 'Reimbursement must be approved before payment' });
    }

    const updated = await prisma.reimbursement.update({
      where: { id: req.params.id },
      data: {
        status: 'paid',
        paidAmount: parseFloat(paidAmount),
        paidById: req.user.id,
        paymentDate: new Date(paymentDate),
        paymentMethod,
        transactionReference: transactionReference || null,
        paymentNotes: paymentNotes || null,
        paymentProof: req.file?.filename || null
      }
    });

    // Update expense status to reimbursed
    await prisma.expense.update({ where: { id: reimbursement.expenseId }, data: { status: 'reimbursed' } });

    await prisma.notification.create({
      data: {
        userId: reimbursement.userId,
        title: 'Reimbursement Paid',
        message: `₹${parseFloat(paidAmount).toLocaleString('en-IN')} has been reimbursed via ${paymentMethod}. Ref: ${transactionReference || 'N/A'}`,
        type: 'success'
      }
    });

    await auditLog({ userId: req.user.id, action: 'PAY_REIMBURSEMENT', resource: 'reimbursements', resourceId: req.params.id, newValue: { paidAmount, paymentMethod, transactionReference }, req });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to record payment' });
  }
});

module.exports = router;

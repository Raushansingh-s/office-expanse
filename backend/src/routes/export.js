const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const XLSX = require('xlsx');
const { jsPDF } = require('jspdf');
require('jspdf-autotable');
const prisma = new PrismaClient();

const getExpenses = async (companyId, query) => {
  const { startDate, endDate, departmentId, userId, categoryId, status } = query;
  const where = { companyId };
  if (userId) where.userId = userId;
  if (departmentId) where.departmentId = departmentId;
  if (categoryId) where.categoryId = categoryId;
  if (status) where.status = status;
  if (startDate || endDate) {
    where.expenseDate = {};
    if (startDate) where.expenseDate.gte = new Date(startDate);
    if (endDate) where.expenseDate.lte = new Date(endDate);
  }
  return prisma.expense.findMany({
    where,
    include: {
      user: { select: { name: true, employeeId: true } },
      department: { select: { name: true } },
      category: { select: { name: true } },
      approvedBy: { select: { name: true } },
      reimbursement: { select: { status: true, paidAmount: true, paymentDate: true } }
    },
    orderBy: { expenseDate: 'desc' }
  });
};

// GET /api/export/excel
router.get('/excel', authenticate, async (req, res) => {
  try {
    const expenses = await getExpenses(req.user.companyId, req.query);
    const rows = expenses.map(e => ({
      'Expense ID': e.expenseNumber,
      'Date': new Date(e.expenseDate).toLocaleDateString('en-IN'),
      'Name': e.user?.name || '',
      'Employee ID': e.user?.employeeId || '',
      'Department': e.department?.name || '',
      'Category': e.category?.name || '',
      'Purpose': e.description,
      'Amount (₹)': e.amount,
      'Approved Amount (₹)': e.approvedAmount || '',
      'Payment Source': e.paymentSource === 'company' ? 'Company' : 'Personal',
      'Payment Method': e.paymentMethod,
      'Merchant': e.merchantName || '',
      'Bill Number': e.billNumber || '',
      'Status': e.status,
      'Reimbursement Required': e.reimbursementRequired ? 'Yes' : 'No',
      'Reimbursement Amount (₹)': e.reimbursementAmount || '',
      'Reimbursement Status': e.reimbursement?.status || 'N/A',
      'Paid Amount (₹)': e.reimbursement?.paidAmount || '',
      'Payment Date': e.reimbursement?.paymentDate ? new Date(e.reimbursement.paymentDate).toLocaleDateString('en-IN') : '',
      'Approved By': e.approvedBy?.name || '',
      'Submitted Date': new Date(e.createdAt).toLocaleDateString('en-IN')
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Expenses');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="expenses-${Date.now()}.xlsx"`);
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to export Excel' });
  }
});

// GET /api/export/csv
router.get('/csv', authenticate, async (req, res) => {
  try {
    const expenses = await getExpenses(req.user.companyId, req.query);
    const header = ['Expense ID','Date','Name','Department','Category','Purpose','Amount','Payment Source','Payment Method','Status','Reimbursement Status'];
    const rows = expenses.map(e => [
      e.expenseNumber,
      new Date(e.expenseDate).toLocaleDateString('en-IN'),
      e.user?.name || '',
      e.department?.name || '',
      e.category?.name || '',
      `"${e.description.replace(/"/g,'""')}"`,
      e.amount,
      e.paymentSource === 'company' ? 'Company' : 'Personal',
      e.paymentMethod,
      e.status,
      e.reimbursement?.status || 'N/A'
    ]);
    const csv = [header, ...rows].map(r => r.join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="expenses-${Date.now()}.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: 'Failed to export CSV' });
  }
});

// GET /api/export/pdf
router.get('/pdf', authenticate, async (req, res) => {
  try {
    const expenses = await getExpenses(req.user.companyId, req.query);
    const company = await prisma.company.findUnique({ where: { id: req.user.companyId } });

    const doc = new jsPDF({ orientation: 'landscape' });

    // Header
    doc.setFontSize(18);
    doc.setTextColor(30, 41, 59);
    doc.text(company?.name || 'Company', 14, 20);
    doc.setFontSize(12);
    doc.text('Expense Report', 14, 28);
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')} | Total Records: ${expenses.length}`, 14, 35);

    // Summary
    const totalAmount = expenses.reduce((s, e) => s + e.amount, 0);
    const companyPaid = expenses.filter(e => e.paymentSource === 'company').reduce((s, e) => s + e.amount, 0);
    const personal = expenses.filter(e => e.paymentSource === 'personal').reduce((s, e) => s + e.amount, 0);

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(10);
    doc.text(`Total: ₹${totalAmount.toLocaleString('en-IN')} | Company Paid: ₹${companyPaid.toLocaleString('en-IN')} | Personal: ₹${personal.toLocaleString('en-IN')}`, 14, 43);

    // Table
    doc.autoTable({
      startY: 48,
      head: [['Expense ID','Date','Name','Category','Purpose','Amount','Source','Status','Reimbursement']],
      body: expenses.map(e => [
        e.expenseNumber,
        new Date(e.expenseDate).toLocaleDateString('en-IN'),
        e.user?.name || '',
        e.category?.name || '',
        e.description.substring(0, 30) + (e.description.length > 30 ? '...' : ''),
        `₹${e.amount.toLocaleString('en-IN')}`,
        e.paymentSource === 'company' ? 'Company' : 'Personal',
        e.status,
        e.reimbursement?.status || 'N/A'
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [30, 41, 59], textColor: 255 },
      alternateRowStyles: { fillColor: [248, 250, 252] }
    });

    const buffer = Buffer.from(doc.output('arraybuffer'));
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="expenses-${Date.now()}.pdf"`);
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to export PDF' });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');
const prisma = new PrismaClient();

router.get('/', authenticate, async (req, res) => {
  try {
    const company = await prisma.company.findUnique({ where: { id: req.user.companyId } });
    res.json(company);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch company' });
  }
});

router.put('/', authenticate, authorize('super_admin'), async (req, res) => {
  try {
    const { name, address, email, phone, gstNumber, panNumber, cinNumber, website, financialYear, currency, currencySymbol } = req.body;
    const updated = await prisma.company.update({
      where: { id: req.user.companyId },
      data: { name, address, email, phone, gstNumber, panNumber, cinNumber, website, financialYear, currency, currencySymbol }
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update company' });
  }
});

module.exports = router;

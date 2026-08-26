const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const auditLog = async ({ userId, action, resource, resourceId, oldValue, newValue, req }) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        action,
        resource,
        resourceId: resourceId || null,
        oldValue: oldValue ? JSON.stringify(oldValue) : null,
        newValue: newValue ? JSON.stringify(newValue) : null,
        ipAddress: req ? (req.ip || req.connection?.remoteAddress) : null,
        userAgent: req ? req.headers?.['user-agent'] : null
      }
    });
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
};

module.exports = { auditLog };

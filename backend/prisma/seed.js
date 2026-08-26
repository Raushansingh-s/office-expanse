const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const hashPassword = (pwd) => bcrypt.hash(pwd, 12);

async function main() {
  console.log('🌱 Seeding database...');

  // Roles
  const roles = await Promise.all([
    prisma.role.upsert({ where: { name: 'super_admin' }, update: {}, create: { name: 'super_admin', displayName: 'Super Admin', permissions: JSON.stringify(['*']) } }),
    prisma.role.upsert({ where: { name: 'admin' }, update: {}, create: { name: 'admin', displayName: 'Admin / Accountant', permissions: JSON.stringify(['view_all','manage_expenses','approve','reimburse','reports']) } }),
    prisma.role.upsert({ where: { name: 'director' }, update: {}, create: { name: 'director', displayName: 'Director', permissions: JSON.stringify(['own_expenses','own_reports']) } }),
    prisma.role.upsert({ where: { name: 'employee' }, update: {}, create: { name: 'employee', displayName: 'Employee', permissions: JSON.stringify(['own_expenses']) } })
  ]);
  const [superAdminRole, adminRole, directorRole, employeeRole] = roles;
  console.log('✅ Roles created');

  // Company
  const company = await prisma.company.upsert({
    where: { id: 'company-001' },
    update: {},
    create: {
      id: 'company-001',
      name: 'Acme Technologies Pvt. Ltd.',
      address: '4th Floor, Tech Park, Whitefield, Bangalore - 560066',
      email: 'accounts@acmetech.in',
      phone: '+91 80 4567 8900',
      gstNumber: '29AABCT1234A1Z5',
      panNumber: 'AABCT1234A',
      cinNumber: 'U72200KA2015PTC081234',
      website: 'https://www.acmetech.in',
      financialYear: '2026-27',
      currency: 'INR',
      currencySymbol: '₹'
    }
  });
  console.log('✅ Company created');

  // Departments
  const deptData = [
    { id: 'dept-001', name: 'Management', code: 'MGT' },
    { id: 'dept-002', name: 'Accounts', code: 'ACC' },
    { id: 'dept-003', name: 'Human Resources', code: 'HR' },
    { id: 'dept-004', name: 'Information Technology', code: 'IT' },
    { id: 'dept-005', name: 'Sales', code: 'SALES' },
    { id: 'dept-006', name: 'Marketing', code: 'MKT' },
    { id: 'dept-007', name: 'Operations', code: 'OPS' }
  ];
  const departments = await Promise.all(deptData.map(d =>
    prisma.department.upsert({ where: { id: d.id }, update: {}, create: { ...d, companyId: company.id, status: 'active' } })
  ));
  console.log('✅ Departments created');

  // Categories
  const catData = [
    { id: 'cat-001', name: 'Travel', color: '#3B82F6' },
    { id: 'cat-002', name: 'Fuel', color: '#F59E0B' },
    { id: 'cat-003', name: 'Food & Meals', color: '#EF4444' },
    { id: 'cat-004', name: 'Hotel / Accommodation', color: '#8B5CF6' },
    { id: 'cat-005', name: 'Office Supplies', color: '#10B981' },
    { id: 'cat-006', name: 'Stationery', color: '#6366F1' },
    { id: 'cat-007', name: 'Internet & Data', color: '#06B6D4' },
    { id: 'cat-008', name: 'Telephone', color: '#84CC16' },
    { id: 'cat-009', name: 'Client Meeting', color: '#F97316' },
    { id: 'cat-010', name: 'Marketing', color: '#EC4899' },
    { id: 'cat-011', name: 'Advertisement', color: '#A855F7' },
    { id: 'cat-012', name: 'Transportation', color: '#14B8A6' },
    { id: 'cat-013', name: 'Software & Subscriptions', color: '#0EA5E9' },
    { id: 'cat-014', name: 'Training & Development', color: '#D946EF' },
    { id: 'cat-015', name: 'Professional Fees', color: '#64748B' },
    { id: 'cat-016', name: 'Maintenance', color: '#78716C' },
    { id: 'cat-017', name: 'Miscellaneous', color: '#9CA3AF' }
  ];
  await Promise.all(catData.map(c =>
    prisma.expenseCategory.upsert({ where: { id: c.id }, update: {}, create: { ...c, companyId: company.id, isDefault: true, status: 'active' } })
  ));
  console.log('✅ Categories created');

  // Users
  const pwd = await hashPassword('Admin@123');
  const dirPwd = await hashPassword('Director@123');
  const empPwd = await hashPassword('Employee@123');

  const usersData = [
    { id: 'user-001', name: 'Rajesh Kumar', email: 'admin@acmetech.in', roleId: superAdminRole.id, departmentId: departments[0].id, employeeId: 'EMP-001', mobile: '9876543210', password: pwd },
    { id: 'user-002', name: 'Priya Sharma', email: 'accountant@acmetech.in', roleId: adminRole.id, departmentId: departments[1].id, employeeId: 'EMP-002', mobile: '9876543211', password: pwd },
    { id: 'user-003', name: 'Arun Mehta', email: 'director.arun@acmetech.in', roleId: directorRole.id, departmentId: departments[0].id, employeeId: 'DIR-001', mobile: '9876543212', password: dirPwd },
    { id: 'user-004', name: 'Sunita Rao', email: 'director.sunita@acmetech.in', roleId: directorRole.id, departmentId: departments[4].id, employeeId: 'DIR-002', mobile: '9876543213', password: dirPwd },
    { id: 'user-005', name: 'Vikram Singh', email: 'director.vikram@acmetech.in', roleId: directorRole.id, departmentId: departments[5].id, employeeId: 'DIR-003', mobile: '9876543214', password: dirPwd },
    { id: 'user-006', name: 'Ananya Patel', email: 'ananya@acmetech.in', roleId: employeeRole.id, departmentId: departments[3].id, employeeId: 'EMP-006', mobile: '9876543215', password: empPwd },
    { id: 'user-007', name: 'Ravi Krishnan', email: 'ravi@acmetech.in', roleId: employeeRole.id, departmentId: departments[4].id, employeeId: 'EMP-007', mobile: '9876543216', password: empPwd },
    { id: 'user-008', name: 'Meena Joshi', email: 'meena@acmetech.in', roleId: employeeRole.id, departmentId: departments[5].id, employeeId: 'EMP-008', mobile: '9876543217', password: empPwd },
    { id: 'user-009', name: 'Deepak Gupta', email: 'deepak@acmetech.in', roleId: employeeRole.id, departmentId: departments[3].id, employeeId: 'EMP-009', mobile: '9876543218', password: empPwd },
    { id: 'user-010', name: 'Kavita Nair', email: 'kavita@acmetech.in', roleId: employeeRole.id, departmentId: departments[2].id, employeeId: 'EMP-010', mobile: '9876543219', password: empPwd },
    { id: 'user-011', name: 'Suresh Pillai', email: 'suresh@acmetech.in', roleId: employeeRole.id, departmentId: departments[6].id, employeeId: 'EMP-011', mobile: '9876543220', password: empPwd },
    { id: 'user-012', name: 'Pooja Verma', email: 'pooja@acmetech.in', roleId: employeeRole.id, departmentId: departments[4].id, employeeId: 'EMP-012', mobile: '9876543221', password: empPwd },
    { id: 'user-013', name: 'Nikhil Bansal', email: 'nikhil@acmetech.in', roleId: employeeRole.id, departmentId: departments[5].id, employeeId: 'EMP-013', mobile: '9876543222', password: empPwd },
    { id: 'user-014', name: 'Lakshmi Devi', email: 'lakshmi@acmetech.in', roleId: employeeRole.id, departmentId: departments[3].id, employeeId: 'EMP-014', mobile: '9876543223', password: empPwd },
    { id: 'user-015', name: 'Rohit Sinha', email: 'rohit@acmetech.in', roleId: employeeRole.id, departmentId: departments[6].id, employeeId: 'EMP-015', mobile: '9876543224', password: empPwd }
  ];

  const users = await Promise.all(usersData.map(u =>
    prisma.user.upsert({
      where: { id: u.id },
      update: {},
      create: {
        id: u.id,
        companyId: company.id,
        name: u.name,
        email: u.email,
        roleId: u.roleId,
        departmentId: u.departmentId,
        employeeId: u.employeeId,
        mobile: u.mobile,
        password: u.password,
        joiningDate: new Date('2023-04-01'),
        status: 'active'
      }
    })
  ));
  console.log('✅ Users created');

  // Expenses - create 60 sample expenses
  const now = new Date();
  const expenseTemplates = [
    { categoryId: 'cat-001', desc: 'Flight to Mumbai for client meeting', amount: 12500, method: 'credit_card', source: 'personal', reimbReq: true },
    { categoryId: 'cat-002', desc: 'Fuel for client visit - Koramangala', amount: 4500, method: 'upi', source: 'personal', reimbReq: true },
    { categoryId: 'cat-003', desc: 'Team lunch - quarterly review', amount: 8750, method: 'credit_card', source: 'company', reimbReq: false },
    { categoryId: 'cat-004', desc: 'Hotel stay - 2 nights Delhi', amount: 9500, method: 'credit_card', source: 'personal', reimbReq: true },
    { categoryId: 'cat-005', desc: 'Office stationery and supplies', amount: 3250, method: 'cash', source: 'company', reimbReq: false },
    { categoryId: 'cat-009', desc: 'Client dinner - TechCorp proposal', amount: 7800, method: 'credit_card', source: 'personal', reimbReq: true },
    { categoryId: 'cat-010', desc: 'Google Ads campaign - Q2', amount: 25000, method: 'bank_transfer', source: 'company', reimbReq: false },
    { categoryId: 'cat-013', desc: 'Adobe Creative Suite annual', amount: 15000, method: 'credit_card', source: 'company', reimbReq: false },
    { categoryId: 'cat-001', desc: 'Train tickets - Bangalore to Hyderabad', amount: 6200, method: 'upi', source: 'personal', reimbReq: true },
    { categoryId: 'cat-014', desc: 'Online course - AWS Certification', amount: 5500, method: 'upi', source: 'company', reimbReq: false },
    { categoryId: 'cat-012', desc: 'Cab fare for site visit', amount: 1850, method: 'upi', source: 'personal', reimbReq: true },
    { categoryId: 'cat-003', desc: 'Working lunch with vendor', amount: 2400, method: 'cash', source: 'personal', reimbReq: true },
    { categoryId: 'cat-007', desc: 'Internet recharge - Jio 90 day', amount: 2999, method: 'upi', source: 'company', reimbReq: false },
    { categoryId: 'cat-010', desc: 'Brochure printing - trade show', amount: 18000, method: 'bank_transfer', source: 'company', reimbReq: false },
    { categoryId: 'cat-015', desc: 'Chartered Accountant consultation', amount: 12000, method: 'bank_transfer', source: 'company', reimbReq: false }
  ];

  const statuses = ['submitted', 'approved', 'rejected', 'reimbursement_pending', 'reimbursed', 'under_review'];
  const expenseUserIds = users.slice(2).map(u => u.id); // skip admin users for variety
  let expCount = 1;

  const expensesCreated = [];
  for (let i = 0; i < 60; i++) {
    const template = expenseTemplates[i % expenseTemplates.length];
    const userId = expenseUserIds[i % expenseUserIds.length];
    const user = users.find(u => u.id === userId);
    const daysAgo = Math.floor(Math.random() * 180);
    const expDate = new Date(now);
    expDate.setDate(expDate.getDate() - daysAgo);
    const statusIndex = Math.floor(Math.random() * statuses.length);
    const status = i < 5 ? 'submitted' : (i < 10 ? 'reimbursement_pending' : statuses[statusIndex]);
    const num = String(expCount++).padStart(4, '0');
    const yr = expDate.getFullYear().toString().slice(-2);
    const mo = String(expDate.getMonth() + 1).padStart(2, '0');
    const expNum = `EXP-${yr}${mo}-${num}`;

    try {
      const expense = await prisma.expense.create({
        data: {
          expenseNumber: expNum,
          companyId: company.id,
          userId: userId,
          departmentId: user.departmentId,
          categoryId: template.categoryId,
          expenseDate: expDate,
          description: template.desc,
          amount: template.amount + Math.floor(Math.random() * 500),
          paymentSource: template.source,
          paymentMethod: template.method,
          merchantName: ['Makemytrip', 'Swiggy', 'OYO', 'BPCL', 'Amazon', 'Uber', 'Zomato', null][i % 8],
          reimbursementRequired: template.reimbReq,
          reimbursementAmount: template.reimbReq ? template.amount : null,
          status: status,
          approvedById: ['approved','reimbursed','reimbursement_pending'].includes(status) ? users[1].id : null,
          approvedAt: ['approved','reimbursed','reimbursement_pending'].includes(status) ? new Date() : null,
          approvedAmount: ['approved','reimbursed','reimbursement_pending'].includes(status) ? template.amount : null,
          rejectionReason: status === 'rejected' ? 'Bill not uploaded or amount mismatch' : null,
          notes: null
        }
      });
      expensesCreated.push(expense);

      // Create reimbursement for personal expenses that are approved/reimbursed
      if (template.reimbReq && ['reimbursement_pending','reimbursed'].includes(status)) {
        await prisma.reimbursement.create({
          data: {
            expenseId: expense.id,
            userId: userId,
            requestedAmount: template.amount,
            approvedAmount: template.amount,
            status: status === 'reimbursed' ? 'paid' : 'approved',
            approvedById: users[1].id,
            approvedAt: new Date(),
            paidAmount: status === 'reimbursed' ? template.amount : null,
            paidById: status === 'reimbursed' ? users[1].id : null,
            paymentDate: status === 'reimbursed' ? new Date() : null,
            paymentMethod: status === 'reimbursed' ? 'bank_transfer' : null,
            transactionReference: status === 'reimbursed' ? `UTR${Math.floor(Math.random()*1000000000)}` : null
          }
        });
      }
    } catch (err) {
      console.error(`Failed to create expense ${expNum}:`, err.message);
    }
  }
  console.log(`✅ ${expensesCreated.length} expenses created`);

  // Sample notifications
  await prisma.notification.createMany({
    data: [
      { userId: users[0].id, title: 'System Ready', message: 'Company Expense Manager is set up and ready to use.', type: 'success', isRead: false },
      { userId: users[1].id, title: 'Pending Approvals', message: 'You have 5 expenses pending approval.', type: 'info', isRead: false },
      { userId: users[2].id, title: 'Expense Approved', message: 'Your expense EXP-2608-0001 has been approved.', type: 'success', isRead: true }
    ]
  });

  // Financial Years
  await prisma.financialYear.upsert({
    where: { id: 'fy-2026' },
    update: {},
    create: {
      id: 'fy-2026',
      companyId: company.id,
      label: '2026-27',
      startDate: new Date('2026-04-01'),
      endDate: new Date('2027-03-31'),
      isActive: true
    }
  });
  await prisma.financialYear.upsert({
    where: { id: 'fy-2025' },
    update: {},
    create: {
      id: 'fy-2025',
      companyId: company.id,
      label: '2025-26',
      startDate: new Date('2025-04-01'),
      endDate: new Date('2026-03-31'),
      isActive: false
    }
  });

  console.log('✅ Financial years created');
  console.log('\n🎉 Seed complete!');
  console.log('\n📋 Demo Credentials:');
  console.log('  Super Admin:  admin@acmetech.in       / Admin@123');
  console.log('  Accountant:   accountant@acmetech.in  / Admin@123');
  console.log('  Director 1:   director.arun@acmetech.in / Director@123');
  console.log('  Director 2:   director.sunita@acmetech.in / Director@123');
  console.log('  Employee:     ananya@acmetech.in      / Employee@123');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const workspace = await prisma.workspace.upsert({
    where: { id: '00000000-0000-0000-0000-000000000111' },
    update: { name: 'OMES Workspace' },
    create: {
      id: '00000000-0000-0000-0000-000000000111',
      name: 'OMES Workspace',
      icon: '🏭',
    },
  });

  const project = await prisma.project.upsert({
    where: { projectCode: 'OMES-PRT-001' },
    update: {},
    create: {
      workspaceId: workspace.id,
      projectCode: 'OMES-PRT-001',
      projectName: 'OMES Printing Pilot',
      customer: 'An Phat Print',
      industry: 'Packaging',
      status: 'in_progress',
      priority: 'high',
      projectPhase: 'Printing',
      bacBudget: 120000,
      pv: 56000,
      ev: 51000,
      ac: 54000,
      cpi: 0.9444,
      spi: 0.9107,
      overallHealth: 'orange',
    },
  });

  await prisma.omesModule.upsert({
    where: { id: '00000000-0000-0000-0000-000000000211' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000211',
      projectId: project.id,
      moduleName: 'Work Order Management',
      status: 'doing',
      plannedProgress: 65,
      actualProgress: 59,
      uatStatus: 'Pending',
      bugCount: 6,
      releaseStatus: 'Not Ready',
    },
  });

  await prisma.issue.upsert({
    where: { issueCode: 'ISS-001' },
    update: {},
    create: {
      issueCode: 'ISS-001',
      projectId: project.id,
      issueType: 'Integration Issue',
      description: 'ERP queue duplicates work order status updates',
      severity: 'Critical',
      priority: 'P1',
      slaTargetHours: 24,
      responseTimeHours: 30,
      status: 'sla_breached',
    },
  });

  console.log('Seeded OMES baseline data');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

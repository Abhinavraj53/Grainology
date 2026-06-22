const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');

const baseUrl = 'http://localhost:5173';
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const artifactDir = path.join(process.cwd(), 'artifacts', `ui-smoke-${ts}`);
fs.mkdirSync(artifactDir, { recursive: true });

const checklist = [];

const roles = [
  {
    key: 'admin',
    label: 'Admin',
    loginId: 'admin@grainology.com',
    password: 'Admin@123',
    expectedPanelText: 'Admin Panel',
  },
  {
    key: 'super_admin',
    label: 'Super Admin',
    loginId: 'superadmin@grainology.com',
    password: 'SuperAdmin@123',
    expectedPanelText: 'Super Admin Panel',
  },
];

const navScreens = [
  {
    name: 'Dashboard',
    nav: 'Dashboard',
    expects: ['Admin Dashboard', 'Location Approvals', 'Warehouse Approvals', 'All Confirmed Orders Approval'],
  },
  {
    name: 'Analytics & Reports',
    nav: 'Analytics & Reports',
    expects: ['Analytics Dashboard'],
  },
  {
    name: 'User Management',
    nav: 'User Management',
    expects: ['User Management'],
  },
  {
    name: 'Confirm Sales Order',
    nav: 'Confirm Sales Order',
    expects: ['Confirm Sales Order', 'Basic Information', 'Commodity Information'],
  },
  {
    name: 'Confirm Purchase Order',
    nav: 'Confirm Purchase Order',
    expects: ['Confirm Purchase Order', 'Basic Information', 'Commodity Information'],
  },
  {
    name: 'All Confirmed Orders',
    nav: 'All Confirmed Orders',
    expects: ['All Confirmed Orders', 'Clear Filters', 'Rejected'],
  },
  {
    name: 'Commodity & Variety',
    nav: 'Commodity & Variety',
    expects: ['Commodity & Variety Management', 'Commodities', 'Varieties'],
  },
  {
    name: 'Warehouse Management',
    nav: 'Warehouse Management',
    expects: ['Warehouse Management', 'Pending Warehouses', 'Approved Warehouses', 'Rejected Warehouses'],
  },
  {
    name: 'Location Management',
    nav: 'Location Management',
    expects: ['Location Management', 'Pending Locations', 'Approved Locations', 'Rejected Locations'],
  },
];

function slug(v) {
  return String(v).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function screenshot(page, roleKey, screenName, suffix) {
  const file = path.join(artifactDir, `${roleKey}-${slug(screenName)}-${suffix}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

async function mark(page, roleLabel, roleKey, screen, status, details) {
  const shot = await screenshot(page, roleKey, screen, status.toLowerCase());
  checklist.push({ role: roleLabel, screen, status, details, screenshot: shot });
  console.log(`${status} | ${roleLabel} | ${screen} | ${details}`);
}

async function waitText(page, text, timeout = 12000) {
  await page.getByText(text, { exact: false }).first().waitFor({ state: 'visible', timeout });
}

async function clickNav(page, label) {
  const btn = page.getByRole('button', { name: new RegExp(`^${label}$`, 'i') }).first();
  await btn.waitFor({ state: 'visible', timeout: 12000 });
  await btn.click();
}

async function loginAs(page, role) {
  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.context().clearCookies();
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle', timeout: 30000 });

  await page.getByPlaceholder('Enter 10-digit mobile number or email').fill(role.loginId);
  await page.getByPlaceholder('Enter your password').fill(role.password);
  await page.getByRole('button', { name: /^Login$/ }).click();

  await waitText(page, 'Admin Dashboard', 25000);
  await waitText(page, role.expectedPanelText, 20000);
}

test.describe.configure({ mode: 'serial' });

test.afterAll(async () => {
  const pass = checklist.filter((x) => x.status === 'PASS').length;
  const fail = checklist.filter((x) => x.status === 'FAIL').length;
  const report = {
    generatedAt: new Date().toISOString(),
    artifactDir,
    totals: { total: checklist.length, pass, fail },
    checklist,
  };

  const reportPath = path.join(artifactDir, 'report.json');
  await fsp.writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log(`ARTIFACT_DIR=${artifactDir}`);
  console.log(`REPORT_JSON=${reportPath}`);
  console.log(`TOTAL=${checklist.length} PASS=${pass} FAIL=${fail}`);
});

for (const role of roles) {
  test(`${role.label} UI smoke`, async ({ page }) => {
    let failed = 0;

    try {
      await loginAs(page, role);
      await mark(page, role.label, role.key, 'Login', 'PASS', `Logged in (${role.expectedPanelText}).`);
    } catch (e) {
      failed += 1;
      await mark(page, role.label, role.key, 'Login', 'FAIL', e?.message || String(e));
      expect(failed, 'Login failed, stopping this role smoke').toBe(0);
      return;
    }

    for (const screen of navScreens) {
      try {
        await clickNav(page, screen.nav);
        for (const text of screen.expects) {
          await waitText(page, text);
        }

        if (screen.name === 'All Confirmed Orders') {
          const filterCount = await page.locator('table thead select').count();
          if (filterCount < 8) {
            throw new Error(`Expected >= 8 column filter dropdowns, found ${filterCount}`);
          }

          const pendingQueueVisible = await page.getByText('Pending Review Queue', { exact: false }).first().isVisible().catch(() => false);
          if (role.key === 'super_admin' && !pendingQueueVisible) {
            throw new Error('Pending Review Queue not visible for super admin');
          }
          if (role.key === 'admin' && pendingQueueVisible) {
            throw new Error('Pending Review Queue should not be visible for admin');
          }
        }

        if (role.key === 'super_admin' && screen.name === 'Location Management') {
          const rejectButtons = page.getByRole('button', { name: /^Reject$/ });
          const rejectCount = await rejectButtons.count();
          if (rejectCount > 0) {
            await rejectButtons.first().click();
            await waitText(page, 'Reject Location');
            await page.getByRole('button', { name: /^Cancel$/ }).first().click();
          }
        }

        if (role.key === 'super_admin' && screen.name === 'Warehouse Management') {
          const rejectButtons = page.getByRole('button', { name: /^Reject$/ });
          const rejectCount = await rejectButtons.count();
          if (rejectCount > 0) {
            await rejectButtons.first().click();
            await waitText(page, 'Reject Warehouse');
            await page.getByRole('button', { name: /^Cancel$/ }).first().click();
          }
        }

        await mark(page, role.label, role.key, screen.name, 'PASS', 'Screen loaded and UI checks passed.');
      } catch (e) {
        failed += 1;
        await mark(page, role.label, role.key, screen.name, 'FAIL', e?.message || String(e));
      }
    }

    try {
      await page.getByRole('button', { name: /^Sign Out$/ }).click();
      await waitText(page, 'Mobile Number or Email', 15000);
      await mark(page, role.label, role.key, 'Logout', 'PASS', 'Sign out successful.');
    } catch (e) {
      failed += 1;
      await mark(page, role.label, role.key, 'Logout', 'FAIL', e?.message || String(e));
    }

    expect(failed, `${role.label} smoke had failures`).toBe(0);
  });
}

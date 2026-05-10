const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 90000,
  fullyParallel: false,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'off',
  },
  webServer: {
    command: 'npm start -- --host 0.0.0.0 --no-open',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 300000,
  },
  projects: [
    {
      name: 'mobile-360',
      use: { ...devices['Pixel 5'], viewport: { width: 360, height: 740 } },
    },
    {
      name: 'mobile-390',
      use: { ...devices['iPhone 12'], viewport: { width: 390, height: 844 } },
    },
    {
      name: 'mobile-414',
      use: { ...devices['iPhone 11'], viewport: { width: 414, height: 896 } },
    },
    {
      name: 'tablet-768',
      use: { ...devices['iPad Mini'], viewport: { width: 768, height: 1024 } },
    },
  ],
});

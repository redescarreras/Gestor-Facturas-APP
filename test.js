const { chromium } = require('/tmp/.npm-global/lib/node_modules/playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    // Collect console messages
    const consoleMessages = [];
    const consoleErrors = [];
    
    page.on('console', msg => {
        const text = msg.text();
        consoleMessages.push({ type: msg.type(), text });
        if (msg.type() === 'error') {
            consoleErrors.push(text);
        }
    });
    
    page.on('pageerror', error => {
        consoleErrors.push(error.message);
    });
    
    try {
        // Load the page
        await page.goto(`file:///workspace/facturas-app/index.html`, { waitUntil: 'networkidle' });
        
        // Wait for the app to initialize
        await page.waitForTimeout(2000);
        
        // Check if main elements are present
        const title = await page.title();
        console.log('Page title:', title);
        
        // Check sidebar
        const sidebar = await page.$('.sidebar');
        console.log('Sidebar present:', !!sidebar);
        
        // Check dashboard
        const dashboard = await page.$('#dashboard');
        console.log('Dashboard present:', !!dashboard);
        
        // Check stats cards
        const statsCards = await page.$$('.stat-card');
        console.log('Stats cards count:', statsCards.length);
        
        // Check navigation
        const navLinks = await page.$$('.nav-link');
        console.log('Navigation links count:', navLinks.length);
        
        // Print console messages
        console.log('\n--- Console Messages ---');
        consoleMessages.forEach(msg => {
            console.log(`[${msg.type}] ${msg.text}`);
        });
        
        // Print errors
        if (consoleErrors.length > 0) {
            console.log('\n--- Console Errors ---');
            consoleErrors.forEach(err => console.log('ERROR:', err));
            process.exit(1);
        } else {
            console.log('\n✓ No console errors detected');
        }
        
    } catch (error) {
        console.error('Test error:', error.message);
        process.exit(1);
    } finally {
        await browser.close();
    }
})();

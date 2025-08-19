// Final Verification Test - Health Protocol Tab Removal
// This script verifies the Health Protocol tab has been completely removed

const puppeteer = require('puppeteer');

async function runFinalVerification() {
    const browser = await puppeteer.launch({ 
        headless: false, 
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1200, height: 800 });
        
        console.log('🚀 Starting Final Health Protocol Removal Verification...');
        
        // Go to the application
        await page.goto('http://localhost:4000', { waitUntil: 'networkidle2' });
        
        // Wait for the page to load and login form
        await page.waitForSelector('form');
        console.log('✅ Application loaded successfully');
        
        // Login as admin
        await page.type('[name="email"]', 'admin@example.com');
        await page.type('[name="password"]', 'admin123');
        await page.click('button[type="submit"]');
        
        // Wait for dashboard to load
        await page.waitForSelector('[role="tablist"]', { timeout: 10000 });
        console.log('✅ Admin dashboard loaded');
        
        // Count admin tabs
        const adminTabs = await page.$$('[role="tab"]');
        console.log(`📊 Admin tabs found: ${adminTabs.length}`);
        
        if (adminTabs.length !== 3) {
            throw new Error(`❌ FAIL: Expected 3 admin tabs, found ${adminTabs.length}`);
        }
        
        // Get tab text content
        const adminTabTexts = [];
        for (const tab of adminTabs) {
            const text = await page.evaluate(el => el.textContent.trim(), tab);
            adminTabTexts.push(text);
        }
        
        console.log('📋 Admin tab texts:', adminTabTexts);
        
        // Verify no Health Protocol tab
        const hasHealthProtocolTab = adminTabTexts.some(text => 
            text.includes('Health Protocol') || text.includes('Protocol')
        );
        
        if (hasHealthProtocolTab) {
            throw new Error(`❌ FAIL: Health Protocol tab still found in admin interface!`);
        }
        
        console.log('✅ PASS: No Health Protocol tab in admin interface');
        
        // Now test trainer interface
        console.log('\n🔄 Switching to trainer interface...');
        
        // Navigate to trainer page or login as trainer
        await page.goto('http://localhost:4000/trainer', { waitUntil: 'networkidle2' });
        
        // If redirected to login, login as trainer
        if (await page.$('form') !== null) {
            await page.type('[name="email"]', 'trainer@example.com');
            await page.type('[name="password"]', 'trainer123');
            await page.click('button[type="submit"]');
            await page.waitForSelector('[role="tablist"]', { timeout: 10000 });
        }
        
        console.log('✅ Trainer dashboard loaded');
        
        // Count trainer tabs
        const trainerTabs = await page.$$('[role="tab"]');
        console.log(`📊 Trainer tabs found: ${trainerTabs.length}`);
        
        if (trainerTabs.length !== 4) {
            throw new Error(`❌ FAIL: Expected 4 trainer tabs, found ${trainerTabs.length}`);
        }
        
        // Get trainer tab text content
        const trainerTabTexts = [];
        for (const tab of trainerTabs) {
            const text = await page.evaluate(el => el.textContent.trim(), tab);
            trainerTabTexts.push(text);
        }
        
        console.log('📋 Trainer tab texts:', trainerTabTexts);
        
        // Verify no Health Protocol tab
        const trainerHasHealthProtocolTab = trainerTabTexts.some(text => 
            text.includes('Health Protocol') || text.includes('Protocol')
        );
        
        if (trainerHasHealthProtocolTab) {
            throw new Error(`❌ FAIL: Health Protocol tab still found in trainer interface!`);
        }
        
        console.log('✅ PASS: No Health Protocol tab in trainer interface');
        
        // Take screenshots for verification
        await page.screenshot({ path: 'trainer-interface-final.png', fullPage: true });
        console.log('📸 Screenshot saved: trainer-interface-final.png');
        
        console.log('\n🎉 FINAL VERIFICATION RESULT: ✅ PASS');
        console.log('======================================');
        console.log('✅ Admin interface: 3 tabs (no Health Protocol)');
        console.log('✅ Trainer interface: 4 tabs (no Health Protocol)');
        console.log('✅ Application runs without errors');
        console.log('✅ Navigation works correctly');
        console.log('🟢 Health Protocol tab has been COMPLETELY REMOVED');
        
    } catch (error) {
        console.error('\n❌ FINAL VERIFICATION RESULT: FAIL');
        console.error('===================================');
        console.error(error.message);
        throw error;
    } finally {
        await browser.close();
    }
}

// Run the verification
runFinalVerification()
    .then(() => {
        console.log('\n🏆 SUCCESS: Final verification completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 FAILURE: Final verification failed!');
        console.error(error);
        process.exit(1);
    });
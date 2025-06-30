import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { PrismaClient } = require('./generated/prisma/index.js');

async function createTestUser() {
    const prisma = new PrismaClient();
    
    try {
        // Test user data - using negative ID to avoid conflicts with real Telegram user IDs
        const testUserId = BigInt(2500);
        const testUserName = 'Test User';
        const testReferralCode = 'TEST1234'; // Easy to remember test code
        
        console.log('Creating test user...');
        
        // Check if test user already exists
        const existingUser = await prisma.user.findUnique({
            where: { id: testUserId }
        });
        
        if (existingUser) {
            console.log(`Test user already exists with referral code: ${existingUser.referralCode}`);
            console.log(`Test referral link: https://t.me/YOUR_BOT_USERNAME?startapp=${existingUser.referralCode}`);
            return;
        }
        
        // Create test user directly with Prisma
        const testUser = await prisma.user.create({
            data: {
                id: testUserId,
                name: testUserName,
                telegramAlias: 'testuser',
                referralCode: testReferralCode,
                coins: 1000, // Give some coins for testing
                nft: 1, // Give an NFT for testing
                referralCount: 0,
                lastSpin: null,
                walletAddress: null,
                referredBy: null,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        });
        
        console.log('✅ Test user created successfully!');
        console.log(`User ID: ${testUser.id.toString()}`);
        console.log(`Name: ${testUser.name}`);
        console.log(`Referral Code: ${testUser.referralCode}`);
        console.log(`Coins: ${testUser.coins}`);
        console.log(`NFTs: ${testUser.nft}`);
        console.log(`Test referral link: https://t.me/YOUR_BOT_USERNAME?startapp=${testUser.referralCode}`);
        console.log('');
        console.log('🧪 How to test:');
        console.log(`1. Use this start parameter in Telegram: startapp=${testUser.referralCode}`);
        console.log(`2. Direct webapp test (if you have URL fallback): ?ref=${testUser.referralCode}`);
        console.log('3. Create a new user through the webapp to test referral bonus');
        console.log('');
        console.log('🎯 Test scenarios:');
        console.log('- Open webapp via Telegram with start param - should get referral bonus');
        console.log('- Check that referrer gets +1 referral spin');
        console.log('- Test spinning with referral bonus spin');
        
    } catch (error) {
        console.error('❌ Error creating test user:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the function directly since this file is meant to be executed
createTestUser()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

export { createTestUser }; 
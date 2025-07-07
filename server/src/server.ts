import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { db } from './database.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import { User } from './generated/prisma/index.js';
const { PrizeType } = require('./generated/prisma/index.js');

// Set up __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Extend Express Request to include user
interface AuthenticatedRequest extends Request {
    user?: User;
    body: any;
}

// Function to generate a random string for prize codes
const getRandStr = (length: number): string => {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    for (let i = 0; i < length; i++)
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    return result;
};

// Wheel result function - 12 sectors with custom probabilities
// Visual: 2 zero, 2 nft, 8 coins
// Actual probabilities: 19.5% zero, 80% coins, 0.5% nft
function getWheelResult(): { sectorIndex: number; prizeType: typeof PrizeType[keyof typeof PrizeType]; amount?: number } {
    // 12 sectors for visual representation
    const sectors = [
        { type: PrizeType.COINS }, // sector 1
        { type: PrizeType.NFT }, // sector 2  
        { type: PrizeType.COINS }, // sector 3
        { type: PrizeType.COINS },  // sector 4
        { type: PrizeType.ZERO }, // sector 5
        { type: PrizeType.COINS }, // sector 6
        { type: PrizeType.COINS }, // sector 7
        { type: PrizeType.NFT }, // sector 8
        { type: PrizeType.COINS }, // sector 9
        { type: PrizeType.COINS }, // sector 10
        { type: PrizeType.ZERO },  // sector 11
        { type: PrizeType.COINS },   // sector 12
    ];

    // Generate random number for probability calculation (0-1000 for precision)
    const random = Math.floor(Math.random() * 1000);
    
    let actualPrizeType: typeof PrizeType[keyof typeof PrizeType];
    
    // Determine actual prize based on probabilities
    if (random < 5) { // 0-4 = 0.5% NFT
        actualPrizeType = PrizeType.NFT;
    } else if (random < 200) { // 5-199 = 19.5% ZERO
        actualPrizeType = PrizeType.ZERO;
    } else { // 200-999 = 80% COINS
        actualPrizeType = PrizeType.COINS;
    }

    // Pick random sector for visual (1-12)
    let sectorIndex = Math.floor(Math.random() * 12) + 1;
    
    // If the actual prize doesn't match the visual sector, find a matching sector
    const sector = sectors[sectorIndex - 1];
    if (sector.type !== actualPrizeType) {
        // Find sectors that match the actual prize type
        const matchingSectors: number[] = [];
        sectors.forEach((s, index) => {
            if (s.type === actualPrizeType) {
                matchingSectors.push(index + 1);
            }
        });
        
        // If we have matching sectors, pick one randomly
        if (matchingSectors.length > 0) {
            sectorIndex = matchingSectors[Math.floor(Math.random() * matchingSectors.length)];
        }
        // If no matching sectors (shouldn't happen with current setup), keep original sector
    }

    let amount: number | undefined;

    if (actualPrizeType === PrizeType.COINS) {
        // Random amount between 300-1000
        amount = Math.floor(Math.random() * (1000 - 300 + 1)) + 300;
    }

    return { sectorIndex, prizeType: actualPrizeType, amount };
}

// Create Express app
const app = express();
app.use(cors());
app.use(express.json());

// Middleware to parse Telegram initData and load user
app.use('/api/wheel', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { initData, referralCode } = req.body;

        if (!initData) {
            return res.status(400).json({ ok: false, err: 'Invalid request: No initData provided' });
        }

        const userId = initData.user.id;
        const userName = `${initData.user.first_name || ''} ${initData.user.last_name || ''}`.trim() || `User_${userId}`;
        const telegramAlias = initData.user.username || null; // Extract telegram alias

        // Handle referral code if provided
        let referredBy: bigint | undefined;
        if (referralCode) {
            const referrer = await db.getUserByReferralCode(referralCode);
            if (referrer && referrer.id !== BigInt(userId)) {
                referredBy = referrer.id;
            }
        }

        // Get or create user from database
        const user = await db.getOrCreateUser({
            id: BigInt(userId),
            name: userName,
            telegramAlias,
            referredBy
        });

        // Attach user object to request
        req.user = user;

        next();
    } catch (err) {
        console.error('Error processing request:', err);
        res.status(500).json({ ok: false, err: 'Server error' });
    }
});

// Get user wheel info endpoint
app.post('/api/wheel/get', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const user = req.user!;

        const canUserSpin = db.canSpin(user.lastSpin, user.referralCount);
        const timeUntilNext = db.getTimeUntilNextSpin(user.lastSpin);
        const invitedUsersCount = await db.getInvitedUsersCount(user.id);

        return res.json({
            ok: true,
            canSpin: canUserSpin,
            timeUntilNextSpin: timeUntilNext,
            balances: {
                coins: user.coins,
                nft: user.nft
            },
            walletAddress: user.walletAddress,
            referralCode: user.referralCode,
            referralSpins: user.referralCount, // Add referral spins count
            invitedUsersCount, // Add invited users count
            botConfig: {
                botUsername: process.env.TELEGRAM_BOT_USERNAME,
            }
        });
    } catch (err) {
        console.error('Error getting wheel info:', err);
        res.status(500).json({ ok: false, err: 'Server error' });
    }
});

// Set wallet address endpoint
app.post('/api/wheel/set-wallet', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const user = req.user!;
        const { walletAddress } = req.body;

        // Basic validation for Solana wallet address (should be 32-44 characters)
        if (walletAddress && (typeof walletAddress !== 'string' || walletAddress.length < 32 || walletAddress.length > 44)) {
            return res.json({ ok: false, err: 'Invalid wallet address format' });
        }

        // Update user's wallet address in database
        await db.updateWalletAddress(user.id, walletAddress || null);

        return res.json({ ok: true });
    } catch (err) {
        console.error('Error setting wallet address:', err);
        res.status(500).json({ ok: false, err: 'Server error' });
    }
});

// Handling set to prevent concurrent spins (using number conversion)
const handling = new Set<number>();

// Main wheel spin endpoint
app.post('/api/wheel/roll', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const user = req.user!;
        const userIdNumber = Number(user.id); // Convert BigInt to number for Set

        // Check if user can spin (24 hours since last spin OR has referral bonus spins)
        if (!db.canSpin(user.lastSpin, user.referralCount)) {
            return res.json({ ok: false, err: 'Must wait 24 hours between spins or invite friends for bonus spins' });
        }

        // Prevent concurrent spins
        if (handling.has(userIdNumber)) {
            return res.json({ ok: false, err: 'Spin already in progress' });
        }

        handling.add(userIdNumber);

        try {
            // If user is using a referral bonus spin, decrement the count
            let updatedUser = user;
            const isUsingReferralSpin = user.referralCount > 0 && user.lastSpin && 
                !db.canSpin(user.lastSpin, 0); // Can't spin normally but has referral spins
            
            if (isUsingReferralSpin) {
                updatedUser = await db.useReferralSpin(user.id);
            }

            // Get the wheel result
            const { sectorIndex, prizeType, amount } = getWheelResult();

            // Process the prize win in database (atomic transaction)
            const { user: finalUser, prize } = await db.processPrizeWin(updatedUser.id, prizeType, amount);

            console.log(`Prize processed for user ${user.id}: ${prizeType} ${amount || ''}`);

            // Return result immediately with prize amount
            return res.json({
                ok: true,
                result: sectorIndex,
                prizeAmount: amount, // Include the amount for coins prizes
                usedReferralSpin: isUsingReferralSpin
            });
        } finally {
            // Always remove from handling set
            handling.delete(userIdNumber);
        }
    } catch (err) {
        console.error('Error processing spin:', err);
        handling.delete(req.user ? Number(req.user.id) : 0);
        res.status(500).json({ ok: false, err: 'Server error' });
    }
});

// Get the frontend URL from environment or use default development URL
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Determine which mode to use (production or development)
const NODE_ENV = process.env.NODE_ENV || 'development';

if (NODE_ENV === 'production') {
    // In production, serve static files from the 'dist' directory
    console.log('Running in production mode - serving static files from dist');
    app.use(express.static(path.join(__dirname, '../../dist')));

    // Handle React routing, return the index.html file for all non-API routes
    app.get('*', (req: Request, res: Response) => {
        res.sendFile(path.join(__dirname, '../../dist/index.html'));
    });
} else {
    // In development, proxy all non-API requests to the frontend dev server (Vite)
    console.log(`Running in development mode - proxying to frontend at ${FRONTEND_URL}`);

    app.use('/', createProxyMiddleware({
        target: FRONTEND_URL,
        changeOrigin: true,
        ws: true, // to support WebSocket
        pathFilter: (path, req) => {
            // Only proxy non-API routes
            return !path.startsWith('/api');
        }
    }));
}

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down gracefully...');
    await db.disconnect();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('Shutting down gracefully...');
    await db.disconnect();
    process.exit(0);
});

// Start the server
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    if (NODE_ENV === 'development') {
        console.log(`API requests: http://localhost:${PORT}/api/*`);
        console.log(`Frontend requests proxied to: ${FRONTEND_URL}`);
    } else {
        console.log(`Visit http://localhost:${PORT}`);
    }
}); 
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { PrismaClient, PrizeType } = require('./generated/prisma/index.js');

// Import types separately for TypeScript
import type { User, Prize } from './generated/prisma/index.js';

const prisma = new PrismaClient();

export interface UserBalances {
    coins: number;
    nft: number;
}

export interface CreateUserData {
    id: number;
    name: string;
}

export interface CreatePrizeData {
    type: typeof PrizeType[keyof typeof PrizeType];
    amount?: number;
    userId: number;
}

export class DatabaseService {
    // Get or create user
    async getOrCreateUser(userData: CreateUserData): Promise<User> {
        const existingUser = await prisma.user.findUnique({
            where: { id: userData.id },
            include: { prizes: true }
        });

        if (existingUser) {
            return existingUser;
        }

        return await prisma.user.create({
            data: {
                id: userData.id,
                name: userData.name,
                coins: 0,
                nft: 0
            },
            include: { prizes: true }
        });
    }

    // Get user by ID
    async getUserById(id: number): Promise<User | null> {
        return await prisma.user.findUnique({
            where: { id },
            include: { prizes: true }
        });
    }

    // Update user's last spin time
    async updateLastSpin(userId: number): Promise<User> {
        return await prisma.user.update({
            where: { id: userId },
            data: { lastSpin: new Date() },
            include: { prizes: true }
        });
    }

    // Update user's wallet address
    async updateWalletAddress(userId: number, walletAddress: string | null): Promise<User> {
        return await prisma.user.update({
            where: { id: userId },
            data: { walletAddress },
            include: { prizes: true }
        });
    }

    // Add coins to user balance
    async addCoins(userId: number, amount: number): Promise<User> {
        return await prisma.user.update({
            where: { id: userId },
            data: { 
                coins: { increment: amount }
            },
            include: { prizes: true }
        });
    }

    // Add NFT to user balance
    async addNft(userId: number): Promise<User> {
        return await prisma.user.update({
            where: { id: userId },
            data: { 
                nft: { increment: 1 }
            },
            include: { prizes: true }
        });
    }

    // Create a prize record
    async createPrize(prizeData: CreatePrizeData): Promise<Prize> {
        return await prisma.prize.create({
            data: prizeData
        });
    }

    // Process a prize win (update balance and create prize record)
    async processPrizeWin(userId: number, prizeType: typeof PrizeType[keyof typeof PrizeType], amount?: number): Promise<{ user: User; prize: Prize }> {
        return await prisma.$transaction(async (tx: any) => {
            // Create the prize record
            const prize = await tx.prize.create({
                data: {
                    type: prizeType,
                    amount,
                    userId
                }
            });

            // Update user balance based on prize type
            let user: User;
            if (prizeType === PrizeType.COINS && amount) {
                user = await tx.user.update({
                    where: { id: userId },
                    data: { 
                        coins: { increment: amount },
                        lastSpin: new Date()
                    },
                    include: { prizes: true }
                });
            } else if (prizeType === PrizeType.NFT) {
                user = await tx.user.update({
                    where: { id: userId },
                    data: { 
                        nft: { increment: 1 },
                        lastSpin: new Date()
                    },
                    include: { prizes: true }
                });
            } else {
                // ZERO prize - just update last spin time
                user = await tx.user.update({
                    where: { id: userId },
                    data: { lastSpin: new Date() },
                    include: { prizes: true }
                });
            }

            return { user, prize };
        });
    }

    // Get user's prize history
    async getUserPrizes(userId: number): Promise<Prize[]> {
        return await prisma.prize.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });
    }

    // Check if user can spin (24 hours since last spin)
    canSpin(lastSpin: Date | null): boolean {
        if (!lastSpin) return true;

        const now = new Date();
        const timeDiff = now.getTime() - lastSpin.getTime();
        const hoursDiff = timeDiff / (1000 * 60 * 60);

        return hoursDiff >= 24;
    }

    // Get time remaining until next spin
    getTimeUntilNextSpin(lastSpin: Date | null): { hours: number; minutes: number } {
        if (!lastSpin) return { hours: 0, minutes: 0 };

        const now = new Date();
        const nextSpinTime = new Date(lastSpin.getTime() + (24 * 60 * 60 * 1000)); // 24 hours later

        const timeDiff = nextSpinTime.getTime() - now.getTime();

        if (timeDiff <= 0) return { hours: 0, minutes: 0 };

        const hours = Math.floor(timeDiff / (1000 * 60 * 60));
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

        return { hours, minutes };
    }

    // Disconnect from database (for cleanup)
    async disconnect(): Promise<void> {
        await prisma.$disconnect();
    }
}

// Export a singleton instance
export const db = new DatabaseService();

// Export Prisma types for use in other files
export { PrizeType } from './generated/prisma/index.js';
export type { User, Prize } from './generated/prisma/index.js'; 
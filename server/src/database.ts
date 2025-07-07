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
    id: bigint;
    name: string;
    telegramAlias?: string;
    referredBy?: bigint;
}

export interface CreatePrizeData {
    type: typeof PrizeType[keyof typeof PrizeType];
    amount?: number;
    userId: bigint;
}

export class DatabaseService {
    // Generate a unique referral code
    private generateReferralCode(): string {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 8; i++) {
            result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return result;
    }

    // Get or create user
    async getOrCreateUser(userData: CreateUserData): Promise<User> {
        const existingUser = await prisma.user.findUnique({
            where: { id: userData.id },
            include: { prizes: true }
        });

        if (existingUser) {
            // Update telegram alias if provided and different
            if (userData.telegramAlias && userData.telegramAlias !== existingUser.telegramAlias) {
                return await prisma.user.update({
                    where: { id: userData.id },
                    data: { telegramAlias: userData.telegramAlias },
                    include: { prizes: true }
                });
            }
            
            // Generate referral code if missing
            if (!existingUser.referralCode) {
                const referralCode = this.generateReferralCode();
                return await prisma.user.update({
                    where: { id: userData.id },
                    data: { referralCode },
                    include: { prizes: true }
                });
            }

            return existingUser;
        }

        // Check if user was referred by someone
        let referrer: User | null = null;
        if (userData.referredBy) {
            referrer = await prisma.user.findUnique({
                where: { id: userData.referredBy }
            });
        }

        // Create new user with referral code
        const referralCode = this.generateReferralCode();
        const newUser = await prisma.user.upsert({
            create: {
                id: userData.id,
                name: userData.name,
                telegramAlias: userData.telegramAlias,
                referralCode,
                referredBy: referrer ? userData.referredBy : null,
                coins: 0,
                nft: 0,
                referralCount: referrer ? 1 : 0 // Give bonus spin to new user if referred
            },
            update: {
                telegramAlias: userData.telegramAlias,
            },
            where: { id: userData.id },
            include: { prizes: true }
        });

        // Increment referrer's count (bonus spin for successful referral)
        if (referrer) {
            await prisma.user.update({
                where: { id: referrer.id },
                data: { 
                    referralCount: { increment: 1 }
                }
            });
        }

        return newUser;
    }

    // Get user by ID
    async getUserById(id: bigint): Promise<User | null> {
        return await prisma.user.findUnique({
            where: { id },
            include: { prizes: true }
        });
    }

    // Update user's last spin time
    async updateLastSpin(userId: bigint): Promise<User> {
        return await prisma.user.update({
            where: { id: userId },
            data: { lastSpin: new Date() },
            include: { prizes: true }
        });
    }

    // Update user's wallet address
    async updateWalletAddress(userId: bigint, walletAddress: string | null): Promise<User> {
        return await prisma.user.update({
            where: { id: userId },
            data: { walletAddress },
            include: { prizes: true }
        });
    }

    // Add coins to user balance
    async addCoins(userId: bigint, amount: number): Promise<User> {
        return await prisma.user.update({
            where: { id: userId },
            data: { 
                coins: { increment: amount }
            },
            include: { prizes: true }
        });
    }

    // Add NFT to user balance
    async addNft(userId: bigint): Promise<User> {
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
    async processPrizeWin(userId: bigint, prizeType: typeof PrizeType[keyof typeof PrizeType], amount?: number): Promise<{ user: User; prize: Prize }> {
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
    async getUserPrizes(userId: bigint): Promise<Prize[]> {
        return await prisma.prize.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });
    }

    // Check if user can spin (24 hours since last spin OR has referral bonus spins)
    canSpin(lastSpin: Date | null, referralCount: number): boolean {
        // If user has referral bonus spins, they can always spin
        if (referralCount > 0) return true;
        
        // Otherwise check 24 hour rule
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

    // Use a referral bonus spin
    async useReferralSpin(userId: bigint): Promise<User> {
        return await prisma.user.update({
            where: { id: userId },
            data: { 
                referralCount: { decrement: 1 }
            },
            include: { prizes: true }
        });
    }

    // Find user by referral code
    async getUserByReferralCode(referralCode: string): Promise<User | null> {
        return await prisma.user.findUnique({
            where: { referralCode },
            include: { prizes: true }
        });
    }

    // Count users invited by a specific user
    async getInvitedUsersCount(userId: bigint): Promise<number> {
        return await prisma.user.count({
            where: { referredBy: userId }
        });
    }

    // Disconnect from database (for cleanup)
    async disconnect(): Promise<void> {
        await prisma.$disconnect();
    }
}

// Export a singleton instance
export const db = new DatabaseService();
export interface WheelPrize {
    id: number | string;
    text?: string;
    prizeName?: string;
    imageUrl?: string;
    imageWidth?: number;
    imageHeight?: number;
    backgroundColor?: string;
    borderColor?: string;
    textColor?: string;
}

export interface UserBalances {
    coins: number;
    nft: number;
}

export interface User {
    id: number;
    name: string;
    balances: UserBalances;
    wheel: {
        attempts: number;
        lastVisit?: string; // ISO date string
    };
    prizes: Prize[];
    walletAddress?: string; // Solana wallet address
}

export interface Prize {
    id: string;
    type: 'coins' | 'nft' | 'zero';
    amount?: number; // for coins
    createdAt: string; // ISO date string
}

export interface WheelApiResponse {
    ok: boolean;
    result?: number;
    err?: string;
    prizeAmount?: number; // Amount of coins won (for coins prizes)
    usedReferralSpin?: boolean; // Whether a referral bonus spin was used
}

export interface WheelInfoResponse {
    ok: boolean;
    canSpin?: boolean;
    timeUntilNextSpin?: { hours: number; minutes: number };
    balances?: UserBalances;
    walletAddress?: string;
    referralCode?: string; // User's referral code
    referralSpins?: number; // Number of referral bonus spins available
    invitedUsersCount?: number; // Number of users invited by this user
    botConfig?: {
        botUsername?: string;
    };
    err?: string;
}

export interface SetWalletResponse {
    ok: boolean;
    err?: string;
} 
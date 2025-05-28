import 'dotenv/config';
import TelegramBot from 'node-telegram-bot-api';
import { db } from './database.js';

// Get bot token from environment variable
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!BOT_TOKEN) {
    console.error('TELEGRAM_BOT_TOKEN environment variable is required');
    process.exit(1);
}

// Create bot instance
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// Get web app URL from environment or use default
const WEB_APP_URL = process.env.WEB_APP_URL || 'https://your-domain.com';

// Validate web app URL
if (!WEB_APP_URL) {
    console.error('WEB_APP_URL environment variable is required');
    process.exit(1);
}

// Validation function for Solana wallet address
function isValidSolanaAddress(address: string): boolean {
    // Basic validation: Solana addresses are base58 encoded and typically 32-44 characters
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    return base58Regex.test(address);
}

// Web app inline keyboard
function getWebAppKeyboard() {
    return {
        reply_markup: {
            inline_keyboard: [
                [{ text: '🎰 Spin the Wheel', web_app: { url: WEB_APP_URL } }]
            ]
        }
    };
}

// Main menu keyboard (without web app button)
function getMainMenuKeyboard() {
    return {
        reply_markup: {
            keyboard: [
                [{ text: '💰 My Wallet' }, { text: '🎨 Buy NFT' }],
                [{ text: '📱 Social Media' }]
            ],
            resize_keyboard: true,
            one_time_keyboard: false
        }
    };
}

// Wallet menu keyboard (when wallet is connected)
function getWalletMenuKeyboard() {
    return {
        reply_markup: {
            keyboard: [
                [{ text: '🗑️ Delete Wallet' }],
                [{ text: '⬅️ Back to Menu' }]
            ],
            resize_keyboard: true,
            one_time_keyboard: false
        }
    };
}

// Back to menu keyboard
function getBackToMenuKeyboard() {
    return {
        reply_markup: {
            keyboard: [
                [{ text: '⬅️ Back to Menu' }]
            ],
            resize_keyboard: true,
            one_time_keyboard: false
        }
    };
}

// Handle /start command
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;

    if (!userId) {
        return bot.sendMessage(chatId, 'Error: Unable to identify user.');
    }

    try {
        // Get or create user in database
        const userName = `${msg.from?.first_name || ''} ${msg.from?.last_name || ''}`.trim() || `User_${userId}`;
        await db.getOrCreateUser({
            id: userId,
            name: userName
        });

        const welcomeMessage = `🎉 Welcome to Wheel Project Bot!

💰 Manage your wallet for token distribution
🎨 Get exclusive NFT access
📱 Stay connected with our community

Choose an option from the menu below:`;

        // Send welcome message with reply keyboard
        await bot.sendMessage(chatId, welcomeMessage, getMainMenuKeyboard());
        
        // Send web app button as inline keyboard
        await bot.sendMessage(chatId, '🎮 Ready to play?\nClick the button below to spin the wheel!', getWebAppKeyboard());
    } catch (error) {
        console.error('Error in /start command:', error);
        await bot.sendMessage(chatId, 'Sorry, there was an error. Please try again.');
    }
});

// Store user states for wallet input
const userStates = new Map<number, string>();

// Handle text messages (button presses and wallet input)
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    const text = msg.text;

    if (!userId || !text) return;

    // Skip if it's a command
    if (text.startsWith('/')) return;

    try {
        const userState = userStates.get(userId);

        // Handle keyboard button presses
        switch (text) {
            case '⬅️ Back to Menu':
                // Clear any user state when going back to menu
                userStates.delete(userId);
                await bot.sendMessage(chatId, '🎉 Welcome to Wheel Project Bot!\n\n💰 Manage your wallet for token distribution\n🎨 Get exclusive NFT access\n📱 Stay connected with our community\n\nChoose an option from the menu below:', getMainMenuKeyboard());
                // Send web app button
                await bot.sendMessage(chatId, '🎮 Ready to play? Click the button below to spin the wheel!', getWebAppKeyboard());
                break;

            case '💰 My Wallet':
                // Get user from database
                const user = await db.getUserById(userId);
                
                if (!user) {
                    await bot.sendMessage(chatId, 'Error: User not found. Please use /start to begin.', getBackToMenuKeyboard());
                    return;
                }

                if (user.walletAddress) {
                    // Wallet is already connected
                    await bot.sendMessage(chatId, `💰 Your Wallet\n\nConnected wallet: \`${user.walletAddress}\`\n\nYour wallet is successfully linked to our platform.`, {
                        parse_mode: 'Markdown',
                        ...getWalletMenuKeyboard()
                    });
                } else {
                    // No wallet connected
                    await bot.sendMessage(chatId, '💰 Share Your SOL Wallet Address for Post-Listing Token Distribution\n\nPlease send your Solana wallet address:', getBackToMenuKeyboard());
                    
                    // Set user state to expect wallet address
                    userStates.set(userId, 'waiting_for_wallet');
                }
                break;

            case '🗑️ Delete Wallet':
                // Delete wallet address
                await db.updateWalletAddress(userId, null);
                
                await bot.sendMessage(chatId, '✅ Your SOL wallet has been successfully unlinked from our platform. No further actions are required.', getBackToMenuKeyboard());
                break;

            case '🎨 Buy NFT':
                const nftMessage = `🎨 Exclusive NFT Drop – Unlock Early Access & Trading Bot!

🚀 Get Your NFT Now: https://app.memeseason.xyz?referralCode=F06-3

What You Gain:
✅ Exclusive DEX Trading Bot – Automate your trades with our unique tool.
✅ First-in Presale Access – Secure your spot in the earliest token rounds (potential 50x+ opportunities!).

⏳ Don't Miss Out – Limited Availability!`;

                await bot.sendMessage(chatId, nftMessage, getBackToMenuKeyboard());
                break;

            case '📱 Social Media':
                const socialMessage = `📱 Stay Connected for Updates & Exclusive Opportunities!

🔹 Join our Discord: https://discord.gg/UPp44ykX
🔹 Follow us on Telegram: https://t.me/c/2490854146/63

Be the first to get alpha on new listings, tools, and community rewards!`;

                await bot.sendMessage(chatId, socialMessage, getBackToMenuKeyboard());
                break;

            default:
                // Handle wallet input if user is in waiting state
                if (userState === 'waiting_for_wallet') {
                    // Validate wallet address
                    if (!isValidSolanaAddress(text)) {
                        await bot.sendMessage(chatId, '❌ Invalid Solana wallet address format. Please send a valid Solana wallet address (32-44 characters, base58 encoded).');
                        return;
                    }

                    // Update wallet address in database
                    await db.updateWalletAddress(userId, text);
                    
                    // Clear user state
                    userStates.delete(userId);

                    // Send success message
                    await bot.sendMessage(chatId, '✅ Thank you! Your SOL wallet has been successfully linked. We will distribute your tokens after the listing.', getMainMenuKeyboard());
                    // Send web app button
                    await bot.sendMessage(chatId, '🎮 Ready to play? Click the button below to spin the wheel!', getWebAppKeyboard());
                } else {
                    // If it's not a recognized button and not waiting for wallet, show main menu
                    await bot.sendMessage(chatId, 'Please use the buttons below to navigate:', getMainMenuKeyboard());
                    // Send web app button
                    await bot.sendMessage(chatId, '🎮 Ready to play? Click the button below to spin the wheel!', getWebAppKeyboard());
                }
                break;
        }
    } catch (error) {
        console.error('Error handling message:', error);
        await bot.sendMessage(chatId, 'Sorry, there was an error. Please try again.');
    }
});

// Handle errors
bot.on('error', (error) => {
    console.error('Telegram bot error:', error);
});

// Handle polling errors
bot.on('polling_error', (error) => {
    console.error('Telegram bot polling error:', error);
});

console.log('🤖 Telegram bot started successfully!');
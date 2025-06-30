# Wheel Project Server & Telegram Bot

This project includes both an Express server for the Wheel of Fortune mini-app and a Telegram bot for wallet management.

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env` file in the server directory with the following variables:

```env
# Telegram Bot Configuration (required)
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here

# Web App URL for Telegram Web App button (required)
WEB_APP_URL=https://your-wheel-app.com

# Server Configuration
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000
```

### 3. Create Telegram Bot

1. Message [@BotFather](https://t.me/botfather) on Telegram
2. Use `/newbot` command to create a new bot
3. Follow the instructions to set a name and username
4. Copy the bot token and add it to your `.env` file as `TELEGRAM_BOT_TOKEN`
5. **Important**: Use `/setmenubutton` command with @BotFather to set up the web app button

### 4. Database Setup

```bash
npx prisma generate
npx prisma db push
```

## Running the Application

### Start the Express Server
```bash
npm run dev
```

### Start the Telegram Bot
```bash
npm run bot
```

### Build for Production
```bash
npm run build
npm start
```

## Telegram Bot Features

The bot now uses **keyboard buttons** instead of inline buttons and includes:

### 🎰 Spin the Wheel
- **Web App Button**: Opens your wheel game directly in Telegram
- Seamless integration with Telegram Web Apps

### 💰 My Wallet
- **No wallet connected**: Prompts user to share SOL wallet address
- **Wallet connected**: Shows connected wallet with delete option
- **Success message**: "Thank you! Your SOL wallet has been successfully linked. We will distribute your tokens after the listing."
- **Delete confirmation**: "Your SOL wallet has been successfully unlinked from our platform. No further actions are required."

### 🎨 Buy NFT
Shows exclusive NFT drop information with referral link to https://app.memeseason.xyz?referralCode=F06-3

### 📱 Social Media
Provides links to Discord and Telegram channels for community engagement.

## Keyboard Layout

```
[🎰 Spin the Wheel] (Web App)
[💰 My Wallet] [🎨 Buy NFT]
[📱 Social Media]
```

## API Endpoints

- `POST /api/wheel/get` - Get user wheel info and balances
- `POST /api/wheel/set-wallet` - Set user's wallet address
- `POST /api/wheel/roll` - Spin the wheel (24-hour cooldown)

## Prize Probabilities

- **80%** - Coins (300-1000 tokens)
- **19.5%** - Nothing (Zero)
- **0.5%** - NFT

## Database Schema

- **User**: Stores Telegram user info, wallet address, coins, NFT count
- **Prize**: Records all prize wins with type and amount
- **PrizeType**: COINS, NFT, ZERO

## Referral System Testing

### Create Test User for Referral Testing

```bash
npm run create-test-user
```

This creates a test user with:
- **User ID**: 2500
- **Referral Code**: TEST1234  
- **Initial Balance**: 1000 coins, 1 NFT
- **Telegram Alias**: @testuser

### Testing Referrals

1. **Create referral link**: `https://t.me/YOUR_BOT_USERNAME?startapp=TEST1234`
2. **Test scenarios**:
   - Open webapp via Telegram with start param
   - Verify new user gets welcome message
   - Check that test user gets +1 referral spin
   - Test spinning with referral bonus spin

### Environment Variables for Referrals

Update your `.env` file:

```env
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
TELEGRAM_BOT_USERNAME=your_bot_username_without_@
WEB_APP_URL=https://your-wheel-app.com
```

## Integration

The Telegram bot uses the same database as the web application, so wallet addresses set through the bot are immediately available in the web app and vice versa. 
# APE-wheel Telegram Mini App

This project is a Wheel of Fortune mini app for Telegram that allows users to spin a wheel and win prizes. It consists of a React frontend, an Express backend, and a Telegram bot for wallet management.

## Project Structure

- `src/` - React frontend code
- `server/` - Express backend and Telegram bot code
- `public/` - Static assets

## Features

- Daily spin the wheel to win prizes
- Prize history and claiming system
- **Telegram bot for wallet management**
- **Solana wallet integration**
- **NFT and token distribution system**

## Setup

### Prerequisites

- Node.js (v16+)
- npm
- PowerShell (for Windows users)
- **Telegram Bot Token** (from @BotFather)

### Installation

1. Clone the repository:

```bash
git clone https://github.com/ecvffd/APE-wheel.git
cd wheel-project
```

2. Install frontend dependencies:

```bash
npm install
```

3. Install backend dependencies:

```bash
cd server
npm install
cd ..
```

### Environment Configuration

Create a `.env` file in the `server` directory with the following variables:

```env
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here

# Web App URL for Telegram Web App button (optional)
WEB_APP_URL=https://your-domain.com

# Server Configuration
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000

# Database
DATABASE_URL="file:./dev.db"
```

### Telegram Bot Setup

1. **Create a Telegram Bot:**
   - Message [@BotFather](https://t.me/botfather) on Telegram
   - Use `/newbot` command to create a new bot
   - Follow the instructions to set a name and username
   - Copy the bot token and add it to your `.env` file as `TELEGRAM_BOT_TOKEN`

2. **Optional - Set up Web App Menu Button:**
   - Use `/setmenubutton` command with @BotFather
   - Set the button text and your web app URL

### Database Setup

The backend uses SQLite with Prisma ORM. Follow these steps to set up the database:

1. **Generate Prisma client and initialize database:**
   Navigate to the `server` directory:
   
   ```bash
   cd server
   ```

   ```bash
   # Generate the Prisma client
   npx prisma generate
   
   # Create and sync the database
   npx prisma db push
   ```

   **Note for Windows users:** If you encounter permission errors during `npx prisma generate`, try:
   ```powershell
   # Clear any locked files
   Remove-Item -Recurse -Force src\generated\prisma -ErrorAction SilentlyContinue
   
   # Then run generate again
   npx prisma generate
   ```

2. **Verify database setup:**
   
   After successful setup, you should see:
   - Database file created at `server/prisma/dev.db`
   - Generated Prisma client at `server/src/generated/prisma/`

### Database Schema

The application uses the following database models:

- **User**: Stores user information (Telegram ID, name, coins, NFTs, wallet address)
- **Prize**: Stores user prize history with types (COINS, NFT, ZERO)

### Reinitializing the Database

If you need to reset or reinitialize the database:

1. **Delete the existing database:**
   ```bash
   cd server
   rm prisma/dev.db  # On Windows: Remove-Item prisma\dev.db
   ```

2. **Recreate the database:**
   ```bash
   npx prisma db push
   ```

3. **If you need to reset the Prisma client:**
   ```bash
   # Remove generated files
   rm -rf src/generated/prisma  # On Windows: Remove-Item -Recurse -Force src\generated\prisma
   
   # Regenerate
   npx prisma generate
   ```

## Development

### Running Individual Services

```bash
# Frontend only
npm run dev

# Backend server only
npm run server

# Telegram bot only
npm run bot
```

### Running Combined Services

```bash
# Frontend + Backend
npm run dev:full

# Frontend + Backend + Telegram Bot (Recommended)
npm run dev:with-bot

# With HTTPS enabled
npm run dev:https:full
npm run dev:https:with-bot
```

**Recommended for full development:**
```bash
npm run dev:with-bot
```

This will start:
- Frontend on http://localhost:5173
- Backend on http://localhost:3001
- Telegram bot (responding to messages)

## Telegram Bot Features

The bot provides the following functionality:

### 💰 Wallet Management
- **Connect Wallet**: Users can link their Solana wallet address
- **View Wallet**: Display connected wallet information
- **Delete Wallet**: Remove wallet connection
- **Validation**: Automatic Solana address format validation

### 🎰 Game Access
- **Web App Button**: Inline button to open the wheel game
- **Proper initData**: Ensures correct user authentication

### 🎨 NFT Information
- **Buy NFT**: Information about exclusive NFT drops
- **Referral Link**: Direct link to NFT purchase with referral code

### 📱 Social Media
- **Discord**: Community Discord server link
- **Telegram**: Official Telegram channel link

### Bot Commands
- `/start` - Initialize bot and show main menu

### Bot Messages
- **Wallet Success**: "Thank you! Your SOL wallet has been successfully linked. We will distribute your tokens after the listing."
- **Wallet Deleted**: "Your SOL wallet has been successfully unlinked from our platform. No further actions are required."
- **Invalid Wallet**: Validation error for incorrect wallet format

## Production Build

To build the project for production:

```bash
npm run build:full
```

The frontend will be built to the `dist/` directory, which the backend serves statically.

To start the production server:

```bash
npm start
```

## Prize System

The wheel uses a custom probability system:

### Prize Probabilities
- **80%** - Coins (300-1000 tokens)
- **19.5%** - Nothing (Zero)
- **0.5%** - NFT

### Visual Representation
- **12 sectors** on the wheel for visual appeal
- **8 coin sectors, 2 zero sectors, 2 NFT sectors**
- **Actual probabilities** calculated separately from visual sectors

## Troubleshooting

### Common Database Issues

1. **Permission errors on Windows during Prisma generation:**
   ```powershell
   # Stop any running processes that might lock the files
   # Clear the generated folder
   Remove-Item -Recurse -Force src\generated\prisma -ErrorAction SilentlyContinue
   
   # Try generating again
   npx prisma generate
   ```

2. **Database connection issues:**
   - Verify the database file exists at `server/prisma/dev.db`
   - If missing, run `npx prisma db push` to recreate it
   - Check that the Prisma client is generated in `server/src/generated/prisma/`

3. **Server won't start:**
   - Ensure all dependencies are installed: `npm install` in both root and `server` directories
   - Verify the database is set up correctly (see Database Setup section)
   - Check that the `.env` file is properly configured

### Telegram Bot Issues

1. **Bot not responding:**
   - Verify `TELEGRAM_BOT_TOKEN` is correctly set in `.env`
   - Check bot is running with `npm run bot`
   - Ensure bot token is valid (test with @BotFather)

2. **Web App not opening:**
   - Set valid `WEB_APP_URL` in `.env` file
   - URL must be HTTPS for production
   - Use inline button instead of keyboard button for proper initData

3. **initData not received:**
   - Use inline buttons for web app access
   - Set up menu button via @BotFather for best results
   - Ensure web app URL is properly configured

### Database Management Commands

```bash
# View database schema
npx prisma studio

# Reset database (WARNING: This will delete all data)
npx prisma migrate reset

# View current database status
npx prisma db pull
```

## API Endpoints

All API endpoints require Telegram `initData` in the request body for user authentication.

### Wheel API

#### `POST /api/wheel/get`
Get user wheel information and spin availability.

**Request Body:**
```json
{
  "initData": {
    "user": {
      "id": 123456789,
      "first_name": "John",
      "last_name": "Doe"
    }
  }
}
```

**Response:**
```json
{
  "ok": true,
  "canSpin": true,
  "timeUntilNextSpin": { "hours": 0, "minutes": 0 },
  "balances": {
    "coins": 1500,
    "nft": 2
  },
  "walletAddress": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgHDH"
}
```

#### `POST /api/wheel/roll`
Spin the wheel and get a prize (24-hour cooldown).

**Request Body:**
```json
{
  "initData": {
    "user": {
      "id": 123456789,
      "first_name": "John",
      "last_name": "Doe"
    }
  }
}
```

**Response:**
```json
{
  "ok": true,
  "result": 3,
  "prizeAmount": 750
}
```

#### `POST /api/wheel/set-wallet`
Set or update user's Solana wallet address.

**Request Body:**
```json
{
  "initData": {
    "user": {
      "id": 123456789,
      "first_name": "John",
      "last_name": "Doe"
    }
  },
  "walletAddress": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgHDH"
}
```

**Response:**
```json
{
  "ok": true
}
```

### Error Responses

All endpoints may return error responses in this format:
```json
{
  "ok": false,
  "err": "Error message description"
}
```

Common errors:
- `"Invalid request: No initData provided"` - Missing initData in request
- `"Must wait 24 hours between spins"` - Spin cooldown active
- `"Spin already in progress"` - Concurrent spin attempt
- `"Invalid wallet address format"` - Invalid Solana wallet address
- `"Server error"` - Internal server error

## Integration

### Telegram Mini App
This application is designed to be embedded in Telegram as a Mini App. It uses the Telegram Mini Apps SDK to interact with the Telegram client.

### Database Synchronization
The Telegram bot and web application share the same database, ensuring:
- Wallet addresses set through the bot are available in the web app
- User balances and prizes are synchronized across both interfaces
- Consistent user experience between bot and web app

### Important Notes

- The server implementation is simplified for demonstration purposes
- In production, you would need to properly validate the Telegram initData
- The wheel spin mechanics are synced with a 7-second delay to match the animation
- Bot uses inline keyboards for web app buttons to ensure proper initData passing

## License

[MIT](LICENSE)

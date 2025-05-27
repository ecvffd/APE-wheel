# APE-wheel Telegram Mini App

This project is a Wheel of Fortune mini app for Telegram that allows users to spin a wheel and win prizes. It consists of a React frontend and an Express backend.

## Project Structure

- `src/` - React frontend code
- `server/` - Express backend code
- `public/` - Static assets

## Features

- Spin the wheel to win prizes
- Token-based economy (costs 10 GFT per spin)
- Prize distribution based on user level
- Prize history and claiming system

## Setup

### Prerequisites

- Node.js (v16+)
- npm
- PowerShell (for Windows users)

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/wheel-project.git
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

### Database Setup

The backend uses SQLite with Prisma ORM. Follow these steps to set up the database:

1. **Generate Prisma client and initialize database:**
   Navigate to the `server` directory and create a `.env` file:
   
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

To run both the frontend and backend concurrently during development:

```bash
npm run dev:full
```

This will start:
- Frontend on http://localhost:5173
- Backend on http://localhost:3001

To run with HTTPS enabled:

```bash
npm run dev:https:full
```

To run only the frontend:

```bash
npm run dev
```

To run only the backend:

```bash
npm run server
```

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

### Prize System

The wheel has 12 sectors with the following distribution:
- **8 sectors**: Coins (300-1000 random amount)
- **2 sectors**: NFT (1 NFT)
- **2 sectors**: Zero (no prize)

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

## Telegram Mini App Integration

This application is designed to be embedded in Telegram as a Mini App. It uses the Telegram Mini Apps SDK to interact with the Telegram client.

### Important Notes

- The server implementation is simplified for demonstration purposes
- In production, you would need to properly validate the Telegram initData
- The wheel spin mechanics are synced with a 7-second delay to match the animation

## License

[MIT](LICENSE)

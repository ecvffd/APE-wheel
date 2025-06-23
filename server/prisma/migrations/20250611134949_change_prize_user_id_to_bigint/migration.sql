/*
  Warnings:

  - You are about to alter the column `userId` on the `prizes` table. The data in that column could be lost. The data in that column will be cast from `Int` to `BigInt`.
  - The primary key for the `users` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `users` table. The data in that column could be lost. The data in that column will be cast from `Int` to `BigInt`.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_prizes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "amount" INTEGER,
    "userId" BIGINT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "prizes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_prizes" ("amount", "createdAt", "id", "type", "userId") SELECT "amount", "createdAt", "id", "type", "userId" FROM "prizes";
DROP TABLE "prizes";
ALTER TABLE "new_prizes" RENAME TO "prizes";
CREATE TABLE "new_users" (
    "id" BIGINT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "coins" INTEGER NOT NULL DEFAULT 0,
    "nft" INTEGER NOT NULL DEFAULT 0,
    "lastSpin" DATETIME,
    "walletAddress" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_users" ("coins", "createdAt", "id", "lastSpin", "name", "nft", "updatedAt", "walletAddress") SELECT "coins", "createdAt", "id", "lastSpin", "name", "nft", "updatedAt", "walletAddress" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

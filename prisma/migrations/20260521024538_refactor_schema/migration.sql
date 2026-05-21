/*
  Warnings:

  - You are about to drop the column `dun` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `ean` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `sku` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `unit` on the `Product` table. All the data in the column will be lost.
  - Added the required column `codigoInterno` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `descricao` to the `Product` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "ProductBarcode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "codeType" TEXT NOT NULL,
    "unitsPerPackage" INTEGER,
    "productId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProductBarcode_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "codigoInterno" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "unidadeMedida" TEXT NOT NULL DEFAULT 'UN',
    "observacao" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Product" ("createdAt", "id", "updatedAt") SELECT "createdAt", "id", "updatedAt" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE UNIQUE INDEX "Product_codigoInterno_key" ON "Product"("codigoInterno");
CREATE TABLE "new_ScanEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "codeType" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitsPerPackage" INTEGER,
    "productId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'VINCULADO',
    "scannedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ScanEntry_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ScanSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ScanEntry_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ScanEntry" ("code", "codeType", "id", "productId", "quantity", "scannedAt", "sessionId") SELECT "code", "codeType", "id", "productId", "quantity", "scannedAt", "sessionId" FROM "ScanEntry";
DROP TABLE "ScanEntry";
ALTER TABLE "new_ScanEntry" RENAME TO "ScanEntry";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "ProductBarcode_code_key" ON "ProductBarcode"("code");

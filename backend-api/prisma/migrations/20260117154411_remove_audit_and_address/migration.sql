/*
  Warnings:

  - You are about to drop the column `direccion` on the `Cliente` table. All the data in the column will be lost.
  - You are about to drop the column `iva` on the `Producto` table. All the data in the column will be lost.
  - You are about to drop the `AuditLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CategoriaSecuencia` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_usuarioId_fkey";

-- AlterTable
ALTER TABLE "Cliente" DROP COLUMN "direccion";

-- AlterTable
ALTER TABLE "Producto" DROP COLUMN "iva",
ADD COLUMN     "margenGanancia" DOUBLE PRECISION DEFAULT 0;

-- DropTable
DROP TABLE "AuditLog";

-- DropTable
DROP TABLE "CategoriaSecuencia";

-- AlterTable
ALTER TABLE "Cotizacion" ADD COLUMN     "aceptadaEl" TIMESTAMP(3),
ADD COLUMN     "aceptadaPor" TEXT,
ADD COLUMN     "tokenPublico" TEXT,
ADD COLUMN     "vistaEl" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "TokenRecuperacion" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiraEl" TIMESTAMP(3) NOT NULL,
    "usadoEl" TIMESTAMP(3),
    "creadoEl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TokenRecuperacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TokenRecuperacion_tokenHash_key" ON "TokenRecuperacion"("tokenHash");

-- CreateIndex
CREATE INDEX "TokenRecuperacion_usuarioId_idx" ON "TokenRecuperacion"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "Cotizacion_tokenPublico_key" ON "Cotizacion"("tokenPublico");

-- AddForeignKey
ALTER TABLE "TokenRecuperacion" ADD CONSTRAINT "TokenRecuperacion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;


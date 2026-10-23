-- AlterTable
ALTER TABLE "Cita" ADD COLUMN     "googleCuenta" TEXT;

-- CreateTable
CREATE TABLE "GoogleProfesional" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "profesionalId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "refreshTokenCifrado" TEXT NOT NULL,
    "accessTokenCifrado" TEXT,
    "accessTokenExpira" TIMESTAMP(3),
    "calendarioId" TEXT NOT NULL DEFAULT 'primary',
    "calendarioNombre" TEXT,
    "conectadaEl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "error" TEXT,

    CONSTRAINT "GoogleProfesional_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GoogleProfesional_profesionalId_key" ON "GoogleProfesional"("profesionalId");

-- CreateIndex
CREATE INDEX "GoogleProfesional_empresaId_idx" ON "GoogleProfesional"("empresaId");

-- AddForeignKey
ALTER TABLE "GoogleProfesional" ADD CONSTRAINT "GoogleProfesional_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoogleProfesional" ADD CONSTRAINT "GoogleProfesional_profesionalId_fkey" FOREIGN KEY ("profesionalId") REFERENCES "Profesional"("id") ON DELETE CASCADE ON UPDATE CASCADE;


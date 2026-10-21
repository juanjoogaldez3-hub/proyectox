-- CreateEnum
CREATE TYPE "Giro" AS ENUM ('GENERAL', 'CLINICA');

-- CreateEnum
CREATE TYPE "OrigenCita" AS ENUM ('RECEPCION', 'EN_LINEA');

-- AlterEnum
ALTER TYPE "Rol" ADD VALUE 'MEDICO';

-- AlterEnum
ALTER TYPE "TipoRecordatorio" ADD VALUE 'SEGUIMIENTO';

-- AlterTable
ALTER TABLE "Cita" ADD COLUMN     "calificacion" INTEGER,
ADD COLUMN     "comentarioPaciente" TEXT,
ADD COLUMN     "origen" "OrigenCita" NOT NULL DEFAULT 'RECEPCION',
ADD COLUMN     "tipoConsultaId" TEXT,
ADD COLUMN     "ventaId" TEXT;

-- AlterTable
ALTER TABLE "Contacto" ADD COLUMN     "alergias" TEXT,
ADD COLUMN     "antecedentes" TEXT,
ADD COLUMN     "consentimientoEl" TIMESTAMP(3),
ADD COLUMN     "contactoEmergenciaNombre" TEXT,
ADD COLUMN     "contactoEmergenciaTelefono" TEXT,
ADD COLUMN     "dpi" TEXT,
ADD COLUMN     "fechaNacimiento" TIMESTAMP(3),
ADD COLUMN     "seguroMedico" TEXT,
ADD COLUMN     "sexo" TEXT,
ADD COLUMN     "tipoSangre" TEXT;

-- AlterTable
ALTER TABLE "Empresa" ADD COLUMN     "giro" "Giro" NOT NULL DEFAULT 'GENERAL',
ADD COLUMN     "reservasActivas" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reservasAnticipacionHoras" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "reservasDiasMax" INTEGER NOT NULL DEFAULT 30;

-- AlterTable
ALTER TABLE "IntegracionWhatsApp" ADD COLUMN     "plantillaSeguimiento" TEXT;

-- AlterTable
ALTER TABLE "Recordatorio" ADD COLUMN     "nota" TEXT;

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "profesionalId" TEXT;

-- CreateTable
CREATE TABLE "HorarioProfesional" (
    "id" TEXT NOT NULL,
    "profesionalId" TEXT NOT NULL,
    "diaSemana" INTEGER NOT NULL,
    "desde" TEXT NOT NULL,
    "hasta" TEXT NOT NULL,

    CONSTRAINT "HorarioProfesional_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BloqueoAgenda" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "profesionalId" TEXT,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fin" TIMESTAMP(3) NOT NULL,
    "motivo" TEXT NOT NULL,
    "creadoEl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BloqueoAgenda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TipoConsulta" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "duracionMin" INTEGER NOT NULL DEFAULT 30,
    "precio" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "reservable" BOOLEAN NOT NULL DEFAULT true,
    "profesionalIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TipoConsulta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotaClinica" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "contactoId" TEXT NOT NULL,
    "citaId" TEXT,
    "profesionalId" TEXT,
    "usuarioId" TEXT NOT NULL,
    "motivo" TEXT,
    "presion" TEXT,
    "pesoKg" TEXT,
    "tallaCm" TEXT,
    "temperatura" TEXT,
    "diagnostico" TEXT,
    "tratamiento" TEXT,
    "receta" TEXT,
    "creadoEl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotaClinica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccesoExpediente" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "contactoId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "creadoEl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccesoExpediente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HorarioProfesional_profesionalId_idx" ON "HorarioProfesional"("profesionalId");

-- CreateIndex
CREATE INDEX "BloqueoAgenda_empresaId_inicio_idx" ON "BloqueoAgenda"("empresaId", "inicio");

-- CreateIndex
CREATE INDEX "TipoConsulta_empresaId_idx" ON "TipoConsulta"("empresaId");

-- CreateIndex
CREATE INDEX "NotaClinica_empresaId_contactoId_idx" ON "NotaClinica"("empresaId", "contactoId");

-- CreateIndex
CREATE INDEX "AccesoExpediente_empresaId_contactoId_creadoEl_idx" ON "AccesoExpediente"("empresaId", "contactoId", "creadoEl");

-- CreateIndex
CREATE UNIQUE INDEX "Cita_ventaId_key" ON "Cita"("ventaId");

-- CreateIndex
CREATE INDEX "Contacto_empresaId_whatsapp_idx" ON "Contacto"("empresaId", "whatsapp");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_profesionalId_key" ON "Usuario"("profesionalId");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_profesionalId_fkey" FOREIGN KEY ("profesionalId") REFERENCES "Profesional"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HorarioProfesional" ADD CONSTRAINT "HorarioProfesional_profesionalId_fkey" FOREIGN KEY ("profesionalId") REFERENCES "Profesional"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BloqueoAgenda" ADD CONSTRAINT "BloqueoAgenda_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BloqueoAgenda" ADD CONSTRAINT "BloqueoAgenda_profesionalId_fkey" FOREIGN KEY ("profesionalId") REFERENCES "Profesional"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TipoConsulta" ADD CONSTRAINT "TipoConsulta_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cita" ADD CONSTRAINT "Cita_tipoConsultaId_fkey" FOREIGN KEY ("tipoConsultaId") REFERENCES "TipoConsulta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cita" ADD CONSTRAINT "Cita_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotaClinica" ADD CONSTRAINT "NotaClinica_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotaClinica" ADD CONSTRAINT "NotaClinica_contactoId_fkey" FOREIGN KEY ("contactoId") REFERENCES "Contacto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotaClinica" ADD CONSTRAINT "NotaClinica_citaId_fkey" FOREIGN KEY ("citaId") REFERENCES "Cita"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotaClinica" ADD CONSTRAINT "NotaClinica_profesionalId_fkey" FOREIGN KEY ("profesionalId") REFERENCES "Profesional"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotaClinica" ADD CONSTRAINT "NotaClinica_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccesoExpediente" ADD CONSTRAINT "AccesoExpediente_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccesoExpediente" ADD CONSTRAINT "AccesoExpediente_contactoId_fkey" FOREIGN KEY ("contactoId") REFERENCES "Contacto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccesoExpediente" ADD CONSTRAINT "AccesoExpediente_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;


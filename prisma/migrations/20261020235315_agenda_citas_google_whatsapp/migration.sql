-- CreateEnum
CREATE TYPE "EstadoCita" AS ENUM ('PROGRAMADA', 'CONFIRMADA', 'COMPLETADA', 'NO_ASISTIO', 'CANCELADA');

-- CreateEnum
CREATE TYPE "TipoRecordatorio" AS ENUM ('CONFIRMACION', 'PRIMERO', 'SEGUNDO');

-- CreateEnum
CREATE TYPE "EstadoRecordatorio" AS ENUM ('PENDIENTE', 'ENVIANDO', 'ENVIADO', 'ENTREGADO', 'LEIDO', 'FALLIDO', 'CANCELADO');

-- CreateTable
CREATE TABLE "Profesional" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "especialidad" TEXT,
    "color" TEXT NOT NULL DEFAULT '#3366f5',
    "duracionMin" INTEGER NOT NULL DEFAULT 30,
    "calendarioId" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Profesional_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cita" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "contactoId" TEXT NOT NULL,
    "profesionalId" TEXT,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fin" TIMESTAMP(3) NOT NULL,
    "motivo" TEXT NOT NULL,
    "notas" TEXT,
    "estado" "EstadoCita" NOT NULL DEFAULT 'PROGRAMADA',
    "tokenPublico" TEXT NOT NULL,
    "confirmadaEl" TIMESTAMP(3),
    "confirmadaPor" TEXT,
    "canceladaEl" TIMESTAMP(3),
    "motivoCancelacion" TEXT,
    "invitarPaciente" BOOLEAN NOT NULL DEFAULT true,
    "googleEventoId" TEXT,
    "googleCalendarioId" TEXT,
    "googleSincronizadaEl" TIMESTAMP(3),
    "googleError" TEXT,
    "creadaPorId" TEXT,
    "creadoEl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEl" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cita_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recordatorio" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "citaId" TEXT NOT NULL,
    "tipo" "TipoRecordatorio" NOT NULL,
    "programadoPara" TIMESTAMP(3) NOT NULL,
    "estado" "EstadoRecordatorio" NOT NULL DEFAULT 'PENDIENTE',
    "intentos" INTEGER NOT NULL DEFAULT 0,
    "enviadoEl" TIMESTAMP(3),
    "mensajeId" TEXT,
    "error" TEXT,
    "creadoEl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEl" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recordatorio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegracionGoogle" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "refreshTokenCifrado" TEXT NOT NULL,
    "accessTokenCifrado" TEXT,
    "accessTokenExpira" TIMESTAMP(3),
    "calendarioId" TEXT NOT NULL DEFAULT 'primary',
    "calendarioNombre" TEXT,
    "conectadaEl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "error" TEXT,

    CONSTRAINT "IntegracionGoogle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegracionWhatsApp" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "phoneNumberId" TEXT NOT NULL,
    "accessTokenCifrado" TEXT NOT NULL,
    "numeroVisible" TEXT,
    "nombreVerificado" TEXT,
    "plantillaRecordatorio" TEXT NOT NULL DEFAULT 'recordatorio_cita',
    "plantillaConfirmacion" TEXT,
    "idiomaPlantilla" TEXT NOT NULL DEFAULT 'es',
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "enviarConfirmacion" BOOLEAN NOT NULL DEFAULT true,
    "horasPrimero" INTEGER NOT NULL DEFAULT 24,
    "horasSegundo" INTEGER NOT NULL DEFAULT 2,
    "actualizadoEl" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegracionWhatsApp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Profesional_empresaId_idx" ON "Profesional"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "Cita_tokenPublico_key" ON "Cita"("tokenPublico");

-- CreateIndex
CREATE INDEX "Cita_empresaId_inicio_idx" ON "Cita"("empresaId", "inicio");

-- CreateIndex
CREATE INDEX "Cita_contactoId_idx" ON "Cita"("contactoId");

-- CreateIndex
CREATE INDEX "Cita_profesionalId_inicio_idx" ON "Cita"("profesionalId", "inicio");

-- CreateIndex
CREATE UNIQUE INDEX "Recordatorio_mensajeId_key" ON "Recordatorio"("mensajeId");

-- CreateIndex
CREATE INDEX "Recordatorio_estado_programadoPara_idx" ON "Recordatorio"("estado", "programadoPara");

-- CreateIndex
CREATE INDEX "Recordatorio_empresaId_idx" ON "Recordatorio"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "Recordatorio_citaId_tipo_key" ON "Recordatorio"("citaId", "tipo");

-- CreateIndex
CREATE UNIQUE INDEX "IntegracionGoogle_empresaId_key" ON "IntegracionGoogle"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "IntegracionWhatsApp_empresaId_key" ON "IntegracionWhatsApp"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "IntegracionWhatsApp_phoneNumberId_key" ON "IntegracionWhatsApp"("phoneNumberId");

-- AddForeignKey
ALTER TABLE "Profesional" ADD CONSTRAINT "Profesional_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cita" ADD CONSTRAINT "Cita_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cita" ADD CONSTRAINT "Cita_contactoId_fkey" FOREIGN KEY ("contactoId") REFERENCES "Contacto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cita" ADD CONSTRAINT "Cita_profesionalId_fkey" FOREIGN KEY ("profesionalId") REFERENCES "Profesional"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cita" ADD CONSTRAINT "Cita_creadaPorId_fkey" FOREIGN KEY ("creadaPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recordatorio" ADD CONSTRAINT "Recordatorio_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recordatorio" ADD CONSTRAINT "Recordatorio_citaId_fkey" FOREIGN KEY ("citaId") REFERENCES "Cita"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegracionGoogle" ADD CONSTRAINT "IntegracionGoogle_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegracionWhatsApp" ADD CONSTRAINT "IntegracionWhatsApp_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

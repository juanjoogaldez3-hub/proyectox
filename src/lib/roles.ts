import type { Giro, Rol } from "@prisma/client";

/**
 * Permisos por rol. Viven aquí y no regados en cada pantalla: con el rol de
 * médico ya no alcanza con preguntar "¿es vendedor?" para saber si alguien
 * administra la cuenta.
 */

/** Propietario o administrador: configura la cuenta y ve todo. */
export function esAdmin(rol: Rol): boolean {
  return rol === "PROPIETARIO" || rol === "ADMIN";
}

/**
 * El expediente clínico tiene datos de salud: lo ven los médicos y quienes
 * administran, no la recepción.
 */
export function puedeVerExpediente(rol: Rol): boolean {
  return rol === "PROPIETARIO" || rol === "ADMIN" || rol === "MEDICO";
}

export function textoRol(rol: Rol, giro: Giro): string {
  switch (rol) {
    case "PROPIETARIO":
      return "Propietario";
    case "ADMIN":
      return "Administrador";
    case "MEDICO":
      return "Médico";
    case "VENDEDOR":
      return giro === "CLINICA" ? "Recepción" : "Vendedor";
  }
}

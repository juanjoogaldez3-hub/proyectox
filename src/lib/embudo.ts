/**
 * Embudo con el que arranca cada empresa nueva. Refleja como vende de verdad
 * un negocio pequeno en Guatemala: primero llega el mensaje, luego se cotiza,
 * se negocia y se cierra.
 */
export const ETAPAS_INICIALES = [
  { nombre: "Nuevo contacto", orden: 1, probabilidad: 10, color: "#6b7488" },
  { nombre: "Contactado", orden: 2, probabilidad: 25, color: "#3366f5" },
  { nombre: "Cotización enviada", orden: 3, probabilidad: 50, color: "#8b5cf6" },
  { nombre: "Negociando", orden: 4, probabilidad: 75, color: "#e8a33d" },
  { nombre: "Ganado", orden: 5, probabilidad: 100, color: "#0f9d58", esGanada: true },
  { nombre: "Perdido", orden: 6, probabilidad: 0, color: "#d64545", esPerdida: true },
];

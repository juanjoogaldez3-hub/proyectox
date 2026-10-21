import { test } from "node:test";
import assert from "node:assert/strict";
import { instanteGT } from "@/lib/gt";
import { enlaceGoogleCalendar, generarIcs, mensajeRecordatorio } from "@/lib/citas";

const inicio = instanteGT("2026-10-21", "10:30")!;
const fin = instanteGT("2026-10-21", "11:00")!;

test("el enlace de Google Calendar lleva las horas en UTC", () => {
  const url = new URL(enlaceGoogleCalendar({ titulo: "Cita", inicio, fin }));
  assert.equal(url.searchParams.get("dates"), "20261021T163000Z/20261021T170000Z");
  assert.equal(url.searchParams.get("action"), "TEMPLATE");
});

test("el .ics usa CRLF y escapa comas, punto y coma y saltos", () => {
  const ics = generarIcs({ uid: "x", titulo: "Cita, control; ok", inicio, fin, detalle: "línea 1\nlínea 2" });
  assert.ok(ics.includes("\r\n"));
  assert.ok(ics.includes("SUMMARY:Cita\\, control\\; ok"));
  assert.ok(ics.includes("DESCRIPTION:línea 1\\nlínea 2"));
  assert.ok(ics.includes("DTSTART:20261021T163000Z"));
});

test("el recordatorio trae el enlace del paciente y las opciones 1 y 2", () => {
  const texto = mensajeRecordatorio(
    { inicio, paciente: "Rosa Elena Castillo", clinica: "Clínica San Rafael", profesional: "Dra. Morales", token: "abc" },
    "https://clinica.test",
  );
  assert.ok(texto.startsWith("Hola Rosa,"));
  assert.ok(texto.includes("https://clinica.test/cita/abc"));
  assert.ok(texto.includes("con Dra. Morales"));
  assert.ok(texto.includes("responder 1"));
});

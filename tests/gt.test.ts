import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calcularTotales,
  edad,
  fechaDeFormulario,
  instanteGT,
  nitValido,
  normalizarTelefono,
  partesLocalesGT,
} from "@/lib/gt";

test("instanteGT interpreta la hora en Guatemala (UTC-6)", () => {
  assert.equal(instanteGT("2026-10-21", "10:30")?.toISOString(), "2026-10-21T16:30:00.000Z");
  assert.equal(instanteGT("2026-10-21", "23:15")?.toISOString(), "2026-10-22T05:15:00.000Z");
});

test("instanteGT rechaza fechas y horas que no existen", () => {
  assert.equal(instanteGT("2026-02-31", "10:00"), null);
  assert.equal(instanteGT("2026-10-21", "24:00"), null);
  assert.equal(instanteGT("21/10/2026", "10:00"), null);
});

test("partesLocalesGT es lo inverso de instanteGT", () => {
  const d = instanteGT("2026-12-31", "22:45")!;
  assert.deepEqual(partesLocalesGT(d), { fecha: "2026-12-31", hora: "22:45" });
});

test("fechaDeFormulario lee date y datetime-local sin correrse un día", () => {
  assert.equal(fechaDeFormulario("2026-08-12")?.toISOString(), "2026-08-12T18:00:00.000Z");
  assert.equal(fechaDeFormulario("2026-08-12", "23:59")?.toISOString(), "2026-08-13T05:59:00.000Z");
  assert.equal(fechaDeFormulario("2026-08-12T15:30")?.toISOString(), "2026-08-12T21:30:00.000Z");
});

test("edad cuenta los años cumplidos", () => {
  const hoy = instanteGT("2026-10-21", "12:00")!;
  assert.equal(edad(instanteGT("1990-10-21", "12:00"), hoy), 36);
  assert.equal(edad(instanteGT("1990-10-22", "12:00"), hoy), 35);
  assert.equal(edad(null, hoy), null);
});

test("normalizarTelefono deja el número listo para WhatsApp", () => {
  assert.equal(normalizarTelefono("5555-1234"), "50255551234");
  assert.equal(normalizarTelefono("+502 5555 1234"), "50255551234");
  assert.equal(normalizarTelefono("123"), null);
});

test("nitValido usa el módulo 11 de la SAT", () => {
  assert.equal(nitValido("CF"), true);
  assert.equal(nitValido("576937-K"), true);
  assert.equal(nitValido("576937-1"), false);
});

test("calcularTotales aplica descuento e IVA", () => {
  const t = calcularTotales([{ cantidad: 2, precioUnitario: 50 }], { descuento: 10, ivaPorcentaje: 12 });
  assert.deepEqual(t, { subtotal: 100, descuento: 10, iva: 10.8, total: 100.8 });
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { instanteGT, partesLocalesGT } from "@/lib/gt";
import { dentroDeHorario, diaSemanaDe, espaciosLibres, type Tramo } from "@/lib/disponibilidad";

// 2026-10-21 es miércoles (3).
const FECHA = "2026-10-21";
const horario: Tramo[] = [
  { diaSemana: 3, desde: "08:00", hasta: "10:00" },
  { diaSemana: 3, desde: "14:00", hasta: "15:00" },
];
const h = (hora: string) => instanteGT(FECHA, hora)!;
const horas = (ds: Date[]) => ds.map((d) => partesLocalesGT(d).hora);

test("diaSemanaDe no depende de la zona del servidor", () => {
  assert.equal(diaSemanaDe(FECHA), 3);
  assert.equal(diaSemanaDe("2026-10-25"), 0);
});

test("ofrece espacios solo dentro de los tramos de atención", () => {
  const libres = espaciosLibres({ fecha: FECHA, tramos: horario, ocupados: [], duracionMin: 30, pasoMin: 30, noAntesDe: h("00:00") });
  assert.deepEqual(horas(libres), ["08:00", "08:30", "09:00", "09:30", "14:00", "14:30"]);
});

test("salta lo ocupado y lo que ya pasó", () => {
  const libres = espaciosLibres({
    fecha: FECHA,
    tramos: horario,
    ocupados: [{ inicio: h("08:30"), fin: h("09:15") }],
    duracionMin: 30,
    pasoMin: 15,
    noAntesDe: h("08:10"),
  });
  // 08:15 tampoco: terminaría a las 08:45, encima de lo ocupado.
  assert.deepEqual(horas(libres), ["09:15", "09:30", "14:00", "14:15", "14:30"]);
});

test("una cita que no cabe completa al final del tramo no se ofrece", () => {
  const libres = espaciosLibres({ fecha: FECHA, tramos: horario, ocupados: [], duracionMin: 45, pasoMin: 15, noAntesDe: h("13:00") });
  assert.deepEqual(horas(libres), ["14:00", "14:15"]);
});

test("un día sin horario no ofrece nada si el profesional sí tiene horario", () => {
  const libres = espaciosLibres({ fecha: "2026-10-25", tramos: horario, ocupados: [], duracionMin: 30, noAntesDe: h("00:00") });
  assert.equal(libres.length, 0);
});

test("sin horario configurado se sugiere de 7 a 19", () => {
  const libres = espaciosLibres({ fecha: FECHA, tramos: [], ocupados: [], duracionMin: 60, pasoMin: 60, noAntesDe: h("00:00") });
  assert.equal(horas(libres)[0], "07:00");
  assert.equal(horas(libres).at(-1), "18:00");
});

test("dentroDeHorario", () => {
  assert.equal(dentroDeHorario(horario, { inicio: h("09:30"), fin: h("10:00") }, FECHA), true);
  assert.equal(dentroDeHorario(horario, { inicio: h("09:45"), fin: h("10:15") }, FECHA), false);
  assert.equal(dentroDeHorario([], { inicio: h("22:00"), fin: h("23:00") }, FECHA), true);
});

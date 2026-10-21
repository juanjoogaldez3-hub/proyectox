import { test } from "node:test";
import assert from "node:assert/strict";
import { interpretarRespuesta, leerWebhook } from "@/lib/whatsapp";

test("interpreta las respuestas del paciente", () => {
  for (const t of ["1", "Sí", "si confirmo", "Confirmo!", "OK"]) assert.equal(interpretarRespuesta(t), "confirmar", t);
  for (const t of ["2", "Cancelar", "cancelo la cita", "No puedo"]) assert.equal(interpretarRespuesta(t), "cancelar", t);
  for (const t of ["hola", "¿a qué hora es?", ""]) assert.equal(interpretarRespuesta(t), null, t);
});

test("aplana el webhook de Meta en estados y mensajes", () => {
  const { estados, mensajes } = leerWebhook({
    entry: [
      {
        changes: [
          {
            value: {
              metadata: { phone_number_id: "999" },
              statuses: [{ id: "wamid.1", status: "read" }, { id: "wamid.2", status: "failed", errors: [{ title: "No es WhatsApp" }] }],
              messages: [
                { from: "50255550000", type: "text", text: { body: "1" }, context: { id: "wamid.1" } },
                { from: "50255550000", type: "button", button: { payload: "Cancelar" } },
              ],
            },
          },
        ],
      },
    ],
  });
  assert.deepEqual(estados, [
    { phoneNumberId: "999", mensajeId: "wamid.1", estado: "read", error: undefined },
    { phoneNumberId: "999", mensajeId: "wamid.2", estado: "failed", error: "No es WhatsApp" },
  ]);
  assert.equal(mensajes[0].respondeA, "wamid.1");
  assert.equal(mensajes[1].texto, "Cancelar");
});

test("ignora cuerpos que no son de WhatsApp", () => {
  assert.deepEqual(leerWebhook({ foo: 1 }), { estados: [], mensajes: [] });
  assert.deepEqual(leerWebhook(null), { estados: [], mensajes: [] });
});

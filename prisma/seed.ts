/**
 * Datos de demostración para probar el CRM sin capturar nada a mano.
 * Ejecutar con: npm run db:seed
 *
 * Es idempotente: si la empresa demo ya existe, la borra y la vuelve a crear.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const SLUG_DEMO = "distribuidora-el-quetzal";
const EMAIL_DEMO = "demo@crmchapin.gt";
const PASSWORD_DEMO = "demo1234";

const ETAPAS = [
  { nombre: "Nuevo contacto", orden: 1, probabilidad: 10, color: "#6b7488" },
  { nombre: "Contactado", orden: 2, probabilidad: 25, color: "#3366f5" },
  { nombre: "Cotización enviada", orden: 3, probabilidad: 50, color: "#8b5cf6" },
  { nombre: "Negociando", orden: 4, probabilidad: 75, color: "#e8a33d" },
  { nombre: "Ganado", orden: 5, probabilidad: 100, color: "#0f9d58", esGanada: true },
  { nombre: "Perdido", orden: 6, probabilidad: 0, color: "#d64545", esPerdida: true },
];

const PRODUCTOS = [
  { nombre: "Café molido Huehuetenango 1 lb", sku: "CAF-HUE-1", precio: 65, costo: 42, stock: 120, stockMinimo: 20, unidad: "libra" },
  { nombre: "Café en grano Antigua 1 lb", sku: "CAF-ANT-1", precio: 78, costo: 50, stock: 8, stockMinimo: 15, unidad: "libra" },
  { nombre: "Caja de 24 unidades — café soluble", sku: "CAF-SOL-24", precio: 240, costo: 168, stock: 35, stockMinimo: 10, unidad: "caja" },
  { nombre: "Chocolate artesanal 250 g", sku: "CHO-250", precio: 45, costo: 27, stock: 60, stockMinimo: 12, unidad: "unidad" },
  { nombre: "Asesoría en montaje de cafetería", sku: "SER-ASE", precio: 1500, costo: 0, stock: 0, stockMinimo: 0, unidad: "servicio", controlaInventario: false },
];

const CONTACTOS = [
  { nombre: "María López", negocio: "Tienda La Bendición", telefono: "50255512233", nit: "1234567", departamento: "Guatemala", municipio: "Mixco", origen: "WHATSAPP", etiquetas: ["mayorista", "recurrente"] },
  { nombre: "Carlos Barrientos", negocio: "Cafetería El Portal", telefono: "50241198877", nit: "7654321", departamento: "Sacatepéquez", municipio: "Antigua Guatemala", origen: "REFERIDO", etiquetas: ["cafetería"] },
  { nombre: "Ana Sical", negocio: "Abarrotería Sical", telefono: "50233344556", departamento: "Quetzaltenango", municipio: "Quetzaltenango", origen: "FACEBOOK", etiquetas: ["occidente"] },
  { nombre: "Jorge Ramírez", negocio: "Hotel Casa Verde", telefono: "50250607080", nit: "2468013", departamento: "Petén", municipio: "Flores", origen: "SITIO_WEB", etiquetas: ["hotelería"] },
  { nombre: "Lucía Mendoza", negocio: null, telefono: "50259998877", departamento: "Guatemala", municipio: "Villa Nueva", origen: "INSTAGRAM", etiquetas: ["menudeo"] },
  { nombre: "Pedro Chacón", negocio: "Súper Chacón", telefono: "50277766554", nit: "1357924", departamento: "Escuintla", municipio: "Escuintla", origen: "VISITA", etiquetas: ["mayorista"] },
];

function diasDesdeHoy(dias: number): Date {
  return new Date(Date.now() + dias * 86_400_000);
}

async function main() {
  const existente = await prisma.empresa.findUnique({ where: { slug: SLUG_DEMO } });
  if (existente) {
    await prisma.empresa.delete({ where: { id: existente.id } });
    console.log("Empresa demo anterior eliminada.");
  }

  const empresa = await prisma.empresa.create({
    data: {
      nombre: "Distribuidora El Quetzal",
      slug: SLUG_DEMO,
      nit: "12345678",
      telefono: "50222334455",
      direccion: "5a calle 3-20 zona 1",
      departamento: "Guatemala",
      municipio: "Guatemala",
      plan: "EMPRENDEDOR",
      estadoSuscripcion: "PRUEBA",
      pruebaTermina: diasDesdeHoy(14),
      etapas: { create: ETAPAS },
    },
    include: { etapas: true },
  });

  const passwordHash = await bcrypt.hash(PASSWORD_DEMO, 10);
  const [duena, vendedor] = await Promise.all([
    prisma.usuario.create({
      data: {
        empresaId: empresa.id,
        nombre: "Sofía Herrera",
        email: EMAIL_DEMO,
        telefono: "50222334455",
        passwordHash,
        rol: "PROPIETARIO",
      },
    }),
    prisma.usuario.create({
      data: {
        empresaId: empresa.id,
        nombre: "Luis Morales",
        email: "vendedor@crmchapin.gt",
        telefono: "50244556677",
        passwordHash,
        rol: "VENDEDOR",
      },
    }),
  ]);

  const productos = await Promise.all(
    PRODUCTOS.map((p) =>
      prisma.producto.create({
        data: {
          empresaId: empresa.id,
          nombre: p.nombre,
          sku: p.sku,
          precio: p.precio,
          costo: p.costo,
          unidad: p.unidad,
          stock: p.stock,
          stockMinimo: p.stockMinimo,
          controlaInventario: p.controlaInventario ?? true,
        },
      }),
    ),
  );

  const contactos = await Promise.all(
    CONTACTOS.map((c, i) =>
      prisma.contacto.create({
        data: {
          empresaId: empresa.id,
          nombre: c.nombre,
          negocio: c.negocio,
          telefono: c.telefono,
          whatsapp: c.telefono,
          nit: c.nit,
          departamento: c.departamento,
          municipio: c.municipio,
          origen: c.origen as never,
          etiquetas: c.etiquetas,
          responsableId: i % 2 === 0 ? duena.id : vendedor.id,
        },
      }),
    ),
  );

  const etapa = (nombre: string) => empresa.etapas.find((e) => e.nombre === nombre)!.id;

  const oportunidades = await Promise.all([
    prisma.oportunidad.create({
      data: {
        empresaId: empresa.id,
        titulo: "Pedido mensual — 40 libras de café",
        contactoId: contactos[0].id,
        etapaId: etapa("Negociando"),
        monto: 2600,
        fechaCierre: diasDesdeHoy(7),
        responsableId: duena.id,
      },
    }),
    prisma.oportunidad.create({
      data: {
        empresaId: empresa.id,
        titulo: "Abastecimiento cafetería El Portal",
        contactoId: contactos[1].id,
        etapaId: etapa("Cotización enviada"),
        monto: 4680,
        fechaCierre: diasDesdeHoy(14),
        responsableId: vendedor.id,
      },
    }),
    prisma.oportunidad.create({
      data: {
        empresaId: empresa.id,
        titulo: "Primer pedido de prueba",
        contactoId: contactos[2].id,
        etapaId: etapa("Contactado"),
        monto: 780,
        responsableId: vendedor.id,
      },
    }),
    prisma.oportunidad.create({
      data: {
        empresaId: empresa.id,
        titulo: "Café para desayunos del hotel",
        contactoId: contactos[3].id,
        etapaId: etapa("Nuevo contacto"),
        monto: 5200,
        responsableId: duena.id,
      },
    }),
    prisma.oportunidad.create({
      data: {
        empresaId: empresa.id,
        titulo: "Montaje de cafetería",
        contactoId: contactos[5].id,
        etapaId: etapa("Ganado"),
        estado: "GANADA",
        monto: 1500,
        cerradaEl: diasDesdeHoy(-5),
        responsableId: duena.id,
      },
    }),
  ]);

  await prisma.actividad.createMany({
    data: [
      {
        empresaId: empresa.id,
        usuarioId: duena.id,
        tipo: "WHATSAPP",
        titulo: "Confirmar cantidad del pedido mensual",
        contactoId: contactos[0].id,
        oportunidadId: oportunidades[0].id,
        venceEl: diasDesdeHoy(-1),
      },
      {
        empresaId: empresa.id,
        usuarioId: vendedor.id,
        tipo: "LLAMADA",
        titulo: "Dar seguimiento a la cotización enviada",
        contactoId: contactos[1].id,
        oportunidadId: oportunidades[1].id,
        venceEl: diasDesdeHoy(1),
      },
      {
        empresaId: empresa.id,
        usuarioId: vendedor.id,
        tipo: "VISITA",
        titulo: "Llevar muestras a Xela",
        contactoId: contactos[2].id,
        venceEl: diasDesdeHoy(3),
      },
      {
        empresaId: empresa.id,
        usuarioId: duena.id,
        tipo: "CORREO",
        titulo: "Mandar catálogo actualizado",
        contactoId: contactos[3].id,
        venceEl: diasDesdeHoy(5),
      },
      {
        empresaId: empresa.id,
        usuarioId: duena.id,
        tipo: "LLAMADA",
        titulo: "Agradecer la compra y pedir referidos",
        contactoId: contactos[5].id,
        completada: true,
        completadaEl: diasDesdeHoy(-4),
      },
    ],
  });

  await prisma.nota.createMany({
    data: [
      {
        empresaId: empresa.id,
        usuarioId: duena.id,
        contactoId: contactos[0].id,
        contenido: "Pide factura siempre. Prefiere que le entreguen los martes por la mañana.",
      },
      {
        empresaId: empresa.id,
        usuarioId: vendedor.id,
        contactoId: contactos[1].id,
        contenido: "Le interesa el grano de Antigua, pero le pareció caro. Ofrecer volumen.",
      },
    ],
  });

  // Cotización enviada, con su oportunidad enlazada.
  const items = [
    { producto: productos[0], cantidad: 40 },
    { producto: productos[3], cantidad: 12 },
  ];
  const subtotal = items.reduce((acc, i) => acc + i.cantidad * Number(i.producto.precio), 0);
  const iva = Math.round(subtotal * 0.12 * 100) / 100;

  await prisma.cotizacion.create({
    data: {
      empresaId: empresa.id,
      numero: 1,
      contactoId: contactos[1].id,
      oportunidadId: oportunidades[1].id,
      estado: "ENVIADA",
      enviadaEl: diasDesdeHoy(-2),
      validaHasta: diasDesdeHoy(12),
      subtotal,
      iva,
      total: subtotal + iva,
      condiciones: "Precios en quetzales. Entrega en 3 días hábiles. 50% de anticipo.",
      creadaPorId: vendedor.id,
      items: {
        create: items.map((i, orden) => ({
          productoId: i.producto.id,
          descripcion: i.producto.nombre,
          cantidad: i.cantidad,
          precioUnitario: i.producto.precio,
          total: i.cantidad * Number(i.producto.precio),
          orden,
        })),
      },
    },
  });

  // Historial de ventas de los últimos meses, para que los reportes tengan de
  // dónde: sin esto las gráficas salen con una sola barra y no dicen nada.
  const VENTAS_DEMO: {
    mesesAtras: number;
    dia: number;
    contacto: number;
    vendedor: "duena" | "vendedor";
    metodo: string;
    estado: "PAGADA" | "PENDIENTE";
    lineas: { producto: number; cantidad: number }[];
  }[] = [
    { mesesAtras: 5, dia: 8, contacto: 0, vendedor: "duena", metodo: "Efectivo", estado: "PAGADA", lineas: [{ producto: 0, cantidad: 25 }] },
    { mesesAtras: 5, dia: 22, contacto: 2, vendedor: "vendedor", metodo: "Transferencia", estado: "PAGADA", lineas: [{ producto: 3, cantidad: 18 }] },
    { mesesAtras: 4, dia: 5, contacto: 1, vendedor: "vendedor", metodo: "Depósito", estado: "PAGADA", lineas: [{ producto: 1, cantidad: 12 }, { producto: 3, cantidad: 10 }] },
    { mesesAtras: 4, dia: 19, contacto: 5, vendedor: "duena", metodo: "Efectivo", estado: "PAGADA", lineas: [{ producto: 2, cantidad: 4 }] },
    { mesesAtras: 3, dia: 3, contacto: 0, vendedor: "duena", metodo: "Transferencia", estado: "PAGADA", lineas: [{ producto: 0, cantidad: 40 }] },
    { mesesAtras: 3, dia: 14, contacto: 3, vendedor: "vendedor", metodo: "Depósito", estado: "PAGADA", lineas: [{ producto: 2, cantidad: 6 }, { producto: 0, cantidad: 15 }] },
    { mesesAtras: 2, dia: 9, contacto: 2, vendedor: "vendedor", metodo: "Efectivo", estado: "PAGADA", lineas: [{ producto: 3, cantidad: 22 }] },
    { mesesAtras: 2, dia: 27, contacto: 1, vendedor: "duena", metodo: "Tarjeta", estado: "PAGADA", lineas: [{ producto: 1, cantidad: 20 }] },
    { mesesAtras: 1, dia: 6, contacto: 5, vendedor: "duena", metodo: "Transferencia", estado: "PAGADA", lineas: [{ producto: 0, cantidad: 30 }, { producto: 2, cantidad: 3 }] },
    { mesesAtras: 1, dia: 21, contacto: 4, vendedor: "vendedor", metodo: "Efectivo", estado: "PAGADA", lineas: [{ producto: 3, cantidad: 14 }] },
    { mesesAtras: 0, dia: 4, contacto: 5, vendedor: "duena", metodo: "Transferencia", estado: "PAGADA", lineas: [{ producto: 4, cantidad: 1 }] },
    { mesesAtras: 0, dia: 9, contacto: 0, vendedor: "vendedor", metodo: "Crédito", estado: "PENDIENTE", lineas: [{ producto: 0, cantidad: 20 }, { producto: 3, cantidad: 8 }] },
  ];

  const hoy = new Date();
  let numeroVenta = 0;

  for (const venta of VENTAS_DEMO) {
    numeroVenta += 1;
    // Mediodía en hora de Guatemala, para que la venta caiga en su mes sin dudas.
    const fecha = new Date(
      Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() - venta.mesesAtras, venta.dia, 18, 0, 0),
    );
    const lineas = venta.lineas.map((l) => ({
      producto: productos[l.producto],
      cantidad: l.cantidad,
    }));
    const subtotal = lineas.reduce((acc, l) => acc + l.cantidad * Number(l.producto.precio), 0);
    const iva = Math.round(subtotal * 0.12 * 100) / 100;
    const contacto = contactos[venta.contacto];

    await prisma.venta.create({
      data: {
        empresaId: empresa.id,
        numero: numeroVenta,
        contactoId: contacto.id,
        estado: venta.estado,
        metodoPago: venta.metodo,
        fecha,
        creadoEl: fecha,
        nitCliente: contacto.nit ?? "CF",
        nombreFactura: contacto.negocio ?? contacto.nombre,
        subtotal,
        iva,
        total: subtotal + iva,
        creadaPorId: venta.vendedor === "duena" ? duena.id : vendedor.id,
        items: {
          create: lineas.map((l, orden) => ({
            productoId: l.producto.id,
            descripcion: l.producto.nombre,
            cantidad: l.cantidad,
            precioUnitario: l.producto.precio,
            total: l.cantidad * Number(l.producto.precio),
            orden,
          })),
        },
      },
    });
  }

  console.log("Datos de demostración listos.");
  console.log(`  Empresa:    ${empresa.nombre}`);
  console.log(`  Usuario:    ${EMAIL_DEMO}`);
  console.log(`  Contraseña: ${PASSWORD_DEMO}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

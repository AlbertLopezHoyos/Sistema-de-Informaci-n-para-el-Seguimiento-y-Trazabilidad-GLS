const fs = require("fs");
const path = require("path");

function loadBusquedaModule() {
  global.window = { addEventListener() {} };
  global.document = {};
  const code = fs.readFileSync(
    path.join(__dirname, "../src/renderer/js/envio-busqueda-rapida.js"),
    "utf8"
  );
  eval(code);
  return window.GlsEnvioBusquedaRapida;
}

describe("GlsEnvioBusquedaRapida", () => {
  let BX;

  beforeAll(() => {
    BX = loadBusquedaModule();
  });

  test("panel seg/geo usa slot único (evita solapamiento en grid)", () => {
    for (const prefix of ["seg", "geo", "consulta"]) {
      const html = BX.renderBusquedaPanelHtml({ idPrefix: prefix });
      expect(html).toContain(`id="${prefix}InputCodigo"`);
      expect(html).toContain(`id="${prefix}InputCliente"`);
      expect(html).toContain("envio-busqueda-valor-slot");
      const slotOpen = html.indexOf("envio-busqueda-valor-slot");
      const slotClose = html.indexOf("</div>", html.indexOf(`id="${prefix}WrapEstado"`));
      expect(slotOpen).toBeGreaterThan(-1);
      expect(slotClose).toBeGreaterThan(slotOpen);
    }
  });

  test("limpiarSeccionOtrosRegistros oculta bloque y vacía lista", () => {
    const section = { hidden: false };
    const list = { innerHTML: "<ul></ul>", __glsQuickEnvios: [{ codigoEnvio: "X" }] };
    BX.limpiarSeccionOtrosRegistros(list, section);
    expect(section.hidden).toBe(true);
    expect(list.innerHTML).toBe("");
    expect(list.__glsQuickEnvios).toEqual([]);
  });

  test("filtros tienen modo, slot de valor y acciones como hijos directos", () => {
    const html = BX.renderBusquedaPanelHtml({
      idPrefix: "seg",
      navHtml: "<a href='#'>link</a>"
    });
    expect(html).toContain('class="field envio-busqueda-field-modo"');
    expect(html).toContain('class="envio-busqueda-valor-slot"');
    expect(html).toContain('class="envio-busqueda-actions"');
    expect(html.indexOf("envio-busqueda-field-modo")).toBeLessThan(html.indexOf("envio-busqueda-valor-slot"));
    expect(html.indexOf("envio-busqueda-valor-slot")).toBeLessThan(html.indexOf("envio-busqueda-actions"));
  });
});

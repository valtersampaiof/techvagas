import { ImageResponse } from "next/og";

export const alt = "TechVagas: vagas de TI e os cursos para chegar até elas";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Imagem que aparece quando o link do site é compartilhado (WhatsApp, LinkedIn, etc.). */
export default function ImagemDeCompartilhamento() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 90px",
          color: "white",
          background: "linear-gradient(135deg, #4f46e5 0%, #6d28d9 100%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              width: 84,
              height: 84,
              borderRadius: 22,
              background: "white",
              color: "#4f46e5",
              fontSize: 56,
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            T
          </div>
          <div style={{ marginLeft: 24, fontSize: 56, fontWeight: 800 }}>TechVagas</div>
        </div>
        <div style={{ marginTop: 48, fontSize: 70, fontWeight: 800, lineHeight: 1.1 }}>Toda vaga de TI mostra o que falta para você chegar lá.</div>
        <div style={{ marginTop: 32, fontSize: 32, color: "#e0e7ff" }}>Estágio, CLT e PJ · do júnior à liderança · cursos para cada lacuna</div>
      </div>
    ),
    { ...size },
  );
}

import { ImageResponse } from "next/og";

/** Icônes PWA générées à la volée (192, 512, 180 pour iOS) */
export async function GET(request: Request, ctx: RouteContext<"/icons/[size]">) {
  const { size: raw } = await ctx.params;
  const size = [180, 192, 512].includes(Number(raw)) ? Number(raw) : 192;
  const maskable = new URL(request.url).searchParams.has("maskable");
  const s = size / 64;
  const pad = maskable ? 0.72 : 1;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#d02c0c",
        }}
      >
        <div
          style={{
            width: 44 * s * pad,
            height: 52 * s * pad,
            borderRadius: 8 * s * pad,
            transform: "rotate(-8deg)",
            background: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 32 * s * pad,
              height: 40 * s * pad,
              borderRadius: 5 * s * pad,
              background: "#1f5fbf",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: 16 * s * pad,
                height: 16 * s * pad,
                transform: "rotate(53deg) scaleY(1.4)",
                background: "#ffcb05",
              }}
            />
          </div>
        </div>
      </div>
    ),
    { width: size, height: size, headers: { "Cache-Control": "public, max-age=604800, immutable" } },
  );
}

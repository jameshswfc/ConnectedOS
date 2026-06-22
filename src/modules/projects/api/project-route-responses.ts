import { NextResponse } from "next/server";

export function fileResponse(result: { filename: string; contentType: string; buffer: Buffer }) {
  return new NextResponse(new Uint8Array(result.buffer), {
    headers: {
      "Content-Type": result.contentType,
      "Content-Disposition": `attachment; filename="${result.filename}"`
    }
  });
}

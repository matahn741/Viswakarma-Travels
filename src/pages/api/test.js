import connectDB from "../../config/db";

export const prerender = false;

export async function GET() {
  try {
    await connectDB();

    return new Response(
      JSON.stringify({
        message: "MongoDB Connected",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch {
    return new Response(
      JSON.stringify({
        error: "MongoDB connection failed",
      }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

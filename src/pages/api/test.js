import connectDB from "../../config/db";

export async function GET() {
    await connectDB();

    return new Response(
        JSON.stringify({
            message: "MongoDB Connected",
        }),
        {
            status: 200,
        }
    );
}

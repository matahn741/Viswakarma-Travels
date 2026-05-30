import connectDB from "../../config/db";
import Booking from "../../models/Booking";

export async function POST({ request }) {
    try {
        await connectDB();

        const body = await request.json();

        const booking = await Booking.create({
            name: body.name,
            phone: body.phone,
            destination: body.destination,
            travelers: body.travelers,
            message: body.message,
        });

        return new Response(
            JSON.stringify({
                success: true,
                booking,
            }),
            {
                status: 201,
            }
        );
    } catch (error) {
        return new Response(
            JSON.stringify({
                success: false,
                error: error.message,
            }),
            {
                status: 500,
            }
        );
    }
}
import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },

        phone: {
            type: String,
            required: true,
        },

        destination: {
            type: String,
            required: true,
        },

        travelers: {
            type: Number,
            required: true,
        },

        message: {
            type: String,
        },
    },
    {
        timestamps: true,
    }
);

const Booking =
    mongoose.models.Booking ||
    mongoose.model("Booking", bookingSchema);

export default Booking;
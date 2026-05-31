import mongoose from "mongoose";

const connectDB = async () => {
  try {
    console.log("MONGODB_URI =", process.env.MONGODB_URI);

    await mongoose.connect(process.env.MONGODB_URI);

    console.log("MongoDB Connected Successfully");
  } catch (error) {
    console.error("MongoDB Connection Error:");
    console.error(error);
  }
};

export default connectDB
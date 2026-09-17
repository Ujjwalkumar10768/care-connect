import mongoose from "mongoose";

const connectDB = async () => {

    mongoose.connection.on('connected', () => console.log("Database Connected"))
    try {
        // Expect `MONGODB_URI` to be a full connection string (including DB name if provided)
        await mongoose.connect(process.env.MONGODB_URI)
    } catch (error) {
        console.error('MongoDB connection error:', error.message)
        throw error
    }

}

export default connectDB;

// Do not use '@' symbol in your databse user's password else it will show an error.
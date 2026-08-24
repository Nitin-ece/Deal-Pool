import "dotenv/config";
import app from "./app";
import { connectDB } from "./config/db";
import { ensureOTPTable } from "./utils/otp";

const PORT = Number(process.env.PORT) || 3000;

const startServer = async () => {
    try {
        await connectDB();
        await ensureOTPTable();

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error("Server startup failed:", error);
        process.exit(1);
    }
};

startServer();
import cors from "cors";

export const corsConfig = cors({
    origin: (origin, callback) => {
        // Allows all origins dynamically while supporting credentials (cookies/auth headers)
        callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
});
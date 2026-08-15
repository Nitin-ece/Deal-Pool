// security featurer that decides how will our api 
// communicate with other origins
import cors from "cors";

export const corsConfig = cors({
    origin: (origin, callback) => {
        // Allow all origins (reflects requesting origin for credentials support)
        callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
});
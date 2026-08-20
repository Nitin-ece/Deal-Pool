import cors from "cors";

const parseAllowedOrigins = (): string[] => {
    const raw =
        process.env.CORS_ALLOWED_ORIGINS ||
        [
            "http://localhost:5173",
            "http://localhost:3000",
            "http://127.0.0.1:5173",
            "http://127.0.0.1:3000",
            "http://[::1]:5173",
            "http://[::1]:3000",
        ].join(",");
    return raw
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean);
};

const allowedOrigins = parseAllowedOrigins();

const isDevLocalOrigin = (origin: string): boolean => {
    if (process.env.NODE_ENV === "production") return false;
    try {
        const url = new URL(origin);
        return (
            url.protocol === "http:" &&
            (url.hostname === "localhost" ||
                url.hostname === "127.0.0.1" ||
                url.hostname === "[::1]" ||
                url.hostname === "::1")
        );
    } catch {
        return false;
    }
};

export const corsConfig = cors({
    origin: (origin, callback) => {
        // Non-browser clients (no Origin) and explicitly allowlisted origins
        if (!origin || allowedOrigins.includes(origin) || isDevLocalOrigin(origin)) {
            callback(null, true);
            return;
        }
        // Do not pass Error here — that becomes an opaque 500 in Express
        callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
});

export { allowedOrigins };

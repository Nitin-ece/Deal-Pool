// Request logger middleware — structured log writer.
// Logs method, URL, status, duration, and client IP to logs/requests.log.
import { Request, Response, NextFunction } from "express";
import fs from "fs";
import path from "path";

const logDir = path.join(process.cwd(), "logs");
const logFile = path.join(logDir, "requests.log");

fs.mkdirSync(logDir, { recursive: true });

export const requestLogger = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    const start = Date.now();

    res.on("finish", () => {
        const duration = Date.now() - start;

        const log = [
            `[${new Date().toISOString()}]`,
            req.method,
            req.originalUrl,
            res.statusCode,
            `${duration}ms`,
            `IP=${req.ip}`,
        ].join(" ");

        fs.promises.appendFile(logFile, log + "\n", "utf8").catch((error) => {
            console.error("FAILED TO WRITE REQUEST LOG:", error);
        });
    });

    next();
};
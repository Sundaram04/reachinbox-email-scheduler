import cookieParser from "cookie-parser";
import express from "express";
import routes from "./routes";
import { requestLogger } from "./middleware/requestLogger";
import { notFoundHandler } from "./middleware/notFound";
import { errorHandler } from "./middleware/errorHandler";

const app = express();

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(requestLogger);
app.use(routes);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;

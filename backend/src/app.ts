import express from "express";
import routes from "./routes";
import { requestLogger } from "./middleware/requestLogger";
import { notFoundHandler } from "./middleware/notFound";
import { errorHandler } from "./middleware/errorHandler";

const app = express();

app.use(express.json());
app.use(requestLogger);
app.use(routes);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;

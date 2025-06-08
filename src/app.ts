import cookieParser from "cookie-parser";
import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import createError, { HttpError } from "http-errors";
import logger from "morgan";
import { authorize } from "./middleware/auth";
import authRouter from "./routes/auth.route";
import notesRouter from "./routes/cv.route";
import { setupSwagger } from "./utils/swagger";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(cors({ origin: "*" }));

// routes
app.use("/api/auth", authRouter);
app.use("/api/cvs", authorize, notesRouter);
// app.use("/api/notes", authorize, notesRouter);

// swagger
setupSwagger(app);

// catch 404 and forward to error handler
app.use((req: Request, res: Response, next: NextFunction) => {
  next(createError(404));
});

// error handler
app.use((err: HttpError, req: Request, res: Response, _next: NextFunction) => {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // send error response
  res.status(err.status || 500);
  res.json({
    message: err.message,
    error: req.app.get("env") === "development" ? err : {},
  });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

export default app;

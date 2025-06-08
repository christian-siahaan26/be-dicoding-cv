import { Express } from "express";
import fs from "fs";
import path from "path";
import swaggerUi from "swagger-ui-express";

const swaggerUICss =
  "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.3.0/swagger-ui.min.css";

export function setupSwagger(app: Express) {
  const swaggerFilePath = path.resolve(__dirname, "../docs/swagger.json");
  const swaggerDocument = JSON.parse(fs.readFileSync(swaggerFilePath, "utf-8"));
  // app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerDocument, {
      customCss:
        ".swagger-ui .opblock .opblock-summary-path-description-wrapper { align-items: center; display: flex; flex-wrap: wrap; gap: 0 10px; padding: 0 10px; width: 100%; }",
      customCssUrl: swaggerUICss,
    })
  );

  console.log("📚 Swagger docs available at http://localhost:3000/api-docs");
}

import express, { Express, Request, Response } from "express";
import { Redis } from "@upstash/redis";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const app: Express = express();
const port = 5000;

export const redis = new Redis({
  url: process.env.REDIS_UPSTASH_URL as string,
  token: process.env.REDIS_UPSTASH_TOKEN as string,
});

app.get(
  "/api/translation/:product/:lang",
  async (req: Request, res: Response) => {
    const { product, lang } = req.params;
    const cacheKey = `translation:${lang}:${product}`;
    const cachedData = (await redis.get(cacheKey)) as string;

    const translationDir = path.resolve(process.cwd(), "src", "translations");
    const filePath = path.join(translationDir, lang, `${product}.json`);

    fs.access(filePath, fs.constants.F_OK, (err) => {
      if (err) {
        res.status(404).json({ error: "Translation not found" });
      }

      //otherwise
      else {
        fs.readFile(filePath, "utf8", async (err, data) => {
          if (err) {
            res.status(500).json({ error: "Error reading translation file" });
          } else {
            if (cachedData) {
              res.json(cachedData);
            }

            //otherwise
            else {
              const translationData = JSON.parse(data);
              await redis.setex(
                cacheKey,
                3600,
                JSON.stringify(translationData)
              );

              res.json(translationData);
            }
          }
        });
      }
    });
  }
);

app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at PORT:${port}`);
});

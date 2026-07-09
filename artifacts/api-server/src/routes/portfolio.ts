import { Router, type IRouter } from "express";
import { GetPortfolioBootstrapResponse } from "@workspace/api-zod";
import { getPortfolioBootstrap } from "../lib/portfolioData.js";

const router: IRouter = Router();

router.get("/bootstrap", async (req, res) => {
  try {
    const result = await getPortfolioBootstrap();
    if (!result.ok) {
      res.status(500).json({ error: "Portfolio data failed to load or validate" });
      return;
    }
    res.json(GetPortfolioBootstrapResponse.parse(result.data));
  } catch (err) {
    req.log.error({ err }, "Portfolio bootstrap response failed schema validation");
    res.status(500).json({ error: "Portfolio bootstrap response invalid" });
  }
});

export default router;

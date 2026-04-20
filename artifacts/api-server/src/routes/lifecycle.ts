import { Router } from "express";
import { lifecycleMotions } from "../data/mockData.js";

const router = Router();

router.get("/", (_req, res) => {
  res.json(lifecycleMotions);
});

export default router;

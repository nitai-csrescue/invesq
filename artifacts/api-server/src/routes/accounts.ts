import { Router } from "express";
import { accounts } from "../data/mockData.js";

const router = Router();

router.get("/", (_req, res) => {
  res.json(accounts);
});

export default router;

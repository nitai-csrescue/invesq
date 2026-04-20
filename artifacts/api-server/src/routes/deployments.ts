import { Router } from "express";
import { deployments } from "../data/mockData.js";

const router = Router();

router.get("/", (req, res) => {
  const { accountId, stage } = req.query as {
    accountId?: string;
    stage?: string;
  };

  let result = [...deployments];

  if (accountId) {
    result = result.filter((d) => d.accountId === accountId);
  }

  if (stage) {
    result = result.filter((d) => d.stage === stage);
  }

  res.json(result);
});

router.get("/:id", (req, res) => {
  const deployment = deployments.find((d) => d.id === req.params.id);
  if (!deployment) {
    res.status(404).json({ error: "Deployment not found" });
    return;
  }
  res.json(deployment);
});

export default router;

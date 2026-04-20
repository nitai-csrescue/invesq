import { Router } from "express";
import { resources } from "../data/mockData.js";
import { CreateResourceBody, UpdateResourceBody } from "@workspace/api-zod";

const router = Router();

const resourceStore = [...resources];

router.get("/", (req, res) => {
  const { category, status } = req.query as {
    category?: string;
    status?: string;
  };

  let result = [...resourceStore];

  if (category) {
    result = result.filter((r) => r.category.toLowerCase() === (category as string).toLowerCase());
  }

  if (status) {
    result = result.filter((r) => r.status === status);
  }

  res.json(result);
});

router.get("/:id", (req, res) => {
  const resource = resourceStore.find((r) => r.id === req.params.id);
  if (!resource) {
    res.status(404).json({ error: "Resource not found" });
    return;
  }
  res.json(resource);
});

router.post("/", (req, res) => {
  const parsed = CreateResourceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const newResource = {
    id: `res-${Date.now()}`,
    ...parsed.data,
    status: "pending" as const,
    lastSyncAt: null,
    metadata: {},
  };

  resourceStore.push(newResource);
  res.status(201).json(newResource);
});

router.patch("/:id", (req, res) => {
  const idx = resourceStore.findIndex((r) => r.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: "Resource not found" });
    return;
  }

  const parsed = UpdateResourceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  resourceStore[idx] = { ...resourceStore[idx]!, ...parsed.data };
  res.json(resourceStore[idx]);
});

export default router;

import { Router } from "express";
import { connectors } from "../data/mockData.js";
import { CreateConnectorBody, UpdateConnectorBody } from "@workspace/api-zod";

const router = Router();

const connectorStore = [...connectors];

router.get("/health", (_req, res) => {
  const healthy = connectorStore.filter((c) => c.health === "healthy").length;
  const degraded = connectorStore.filter((c) => c.health === "degraded").length;
  const offline = connectorStore.filter((c) => c.health === "offline").length;
  const unknown = connectorStore.filter((c) => c.health === "unknown").length;

  res.json({
    healthy,
    degraded,
    offline,
    unknown,
    total: connectorStore.length,
    connectors: connectorStore.map((c) => ({
      id: c.id,
      name: c.name,
      health: c.health,
      lastCheckedAt: c.lastCheckedAt ?? null,
    })),
  });
});

router.get("/", (_req, res) => {
  res.json(connectorStore);
});

router.post("/", (req, res) => {
  const parsed = CreateConnectorBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const newConnector = {
    id: `conn-${Date.now()}`,
    ...parsed.data,
    status: "pending" as const,
    health: "unknown" as const,
    configSchema: {},
    supportedResourceCategories: [],
    dependencies: [],
    lastCheckedAt: null,
  };

  connectorStore.push(newConnector);
  res.status(201).json(newConnector);
});

router.patch("/:id", (req, res) => {
  const idx = connectorStore.findIndex((c) => c.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: "Connector not found" });
    return;
  }

  const parsed = UpdateConnectorBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  connectorStore[idx] = { ...connectorStore[idx]!, ...parsed.data };
  res.json(connectorStore[idx]);
});

export default router;

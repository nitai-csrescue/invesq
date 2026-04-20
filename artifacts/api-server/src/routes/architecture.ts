import { Router } from "express";
import {
  architectureNodes,
  nodeConnections,
  lifecycleMotions,
} from "../data/mockData.js";

const router = Router();

router.get("/", (req, res) => {
  const { layer, lifecycleMotionId } = req.query as {
    layer?: string;
    lifecycleMotionId?: string;
  };

  let nodes = [...architectureNodes];

  if (layer) {
    nodes = nodes.filter((n) => n.layer === layer);
  }

  if (lifecycleMotionId) {
    nodes = nodes.filter((n) =>
      n.lifecycleMotionIds.includes(lifecycleMotionId as string)
    );
  }

  const layers = ["lifecycle", "delivery", "platform"];

  res.json({ nodes, connections: nodeConnections, layers });
});

router.get("/nodes", (req, res) => {
  const { layer, lifecycleMotionId } = req.query as {
    layer?: string;
    lifecycleMotionId?: string;
  };

  let nodes = [...architectureNodes];

  if (layer) {
    nodes = nodes.filter((n) => n.layer === layer);
  }

  if (lifecycleMotionId) {
    nodes = nodes.filter((n) =>
      n.lifecycleMotionIds.includes(lifecycleMotionId as string)
    );
  }

  res.json(nodes);
});

router.get("/nodes/:id", (req, res) => {
  const node = architectureNodes.find((n) => n.id === req.params.id);
  if (!node) {
    res.status(404).json({ error: "Node not found" });
    return;
  }
  res.json(node);
});

router.get("/summary", (_req, res) => {
  const totalNodes = architectureNodes.length;
  const activeNodes = architectureNodes.filter((n) => n.status === "active").length;
  const totalResources = 13;
  const healthyResources = 12;
  const totalConnectors = 12;
  const activeDeployments = 3;
  const systemHealth = Math.round((activeNodes / totalNodes) * 100);

  res.json({
    totalNodes,
    activeNodes,
    totalResources,
    healthyResources,
    totalConnectors,
    activeDeployments,
    systemHealth,
  });
});

export default router;

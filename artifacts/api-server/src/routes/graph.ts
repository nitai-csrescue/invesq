import { Router } from "express";
import { architectureNodes } from "../data/mockData.js";
import {
  architectureEdges,
  architectureGroups,
  nodeHealthScores,
  nodePositions,
  nodeMetrics,
} from "../data/graphData.js";

const router = Router();

function enrichNodes() {
  return architectureNodes.map((n) => ({
    ...n,
    healthScore: nodeHealthScores[n.id] ?? 85,
    position: nodePositions[n.id],
  }));
}

router.get("/graph", (_req, res) => {
  res.json({
    nodes: enrichNodes(),
    edges: architectureEdges,
    groups: architectureGroups,
  });
});

router.get("/edges", (_req, res) => {
  res.json(architectureEdges);
});

router.get("/metrics/:nodeId", (req, res) => {
  const series = nodeMetrics[req.params.nodeId] ?? [];
  res.json(series);
});

export default router;

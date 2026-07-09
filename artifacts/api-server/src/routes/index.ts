import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import architectureRouter from "./architecture.js";
import graphRouter from "./graph.js";
import resourcesRouter from "./resources.js";
import connectorsRouter from "./connectors.js";
import deploymentsRouter from "./deployments.js";
import accountsRouter from "./accounts.js";
import lifecycleRouter from "./lifecycle.js";
import debugRouter from "./debug.js";
import invesqRouter from "./invesq.js";
import authRouter from "./auth.js";
import portfolioRouter from "./portfolio.js";
import jobsRouter from "./jobs.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(graphRouter);
router.use("/architecture", architectureRouter);
router.use("/resources", resourcesRouter);
router.use("/connectors", connectorsRouter);
router.use("/deployments", deploymentsRouter);
router.use("/accounts", accountsRouter);
router.use("/lifecycle-motions", lifecycleRouter);
router.use("/invesq", invesqRouter);
router.use("/portfolio", portfolioRouter);
router.use("/jobs", jobsRouter);
router.use(debugRouter);

export default router;

import { Router, type IRouter } from "express";
import { GetPortfolioBootstrapResponse } from "@workspace/api-zod";
import { getPortfolioBootstrap } from "../lib/portfolioData.js";
import {
  getCompanyWebsite,
  loadEffectiveReport,
  toValidationStamp,
  resolveCompanyBySlug,
  CompanyNotFoundError,
  NoAssessmentError,
} from "../lib/reportExport.js";
import { buildReportPdfHtml } from "../lib/pdf/reportHtml.js";
import { renderHtmlToPdf } from "../lib/pdf/renderPdf.js";

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

// Public, tenant-facing download of the branded INVESQ Diagnostic Report PDF,
// keyed by the same firm/company slugs the portal URLs use. Read-only and
// cache-only (reuses loadEffectiveReport — never calls Claude), same as the
// admin route, but returns the VALIDATED deliverable (edited narrative + a
// "Validated · {names} · {date}" stamp). Gates:
//   404 - firm/company slug pair does not resolve to a row
//   403 - firm is internal-only (visibility), or login-gated (requireLogin)
//   409 - narrative has not been generated yet, OR the report is not fully
//         validated (dual sign-off is the client-export control; admins can
//         still pull a DRAFT via the /admin route)
// A tenant download is therefore always a validated, client-facing deliverable.
router.get("/:firmSlug/companies/:companySlug/report-pdf", async (req, res) => {
  const { firmSlug, companySlug } = req.params;

  try {
    const resolved = await resolveCompanyBySlug(firmSlug, companySlug);
    if (!resolved) {
      res.status(404).json({ error: "Company not found" });
      return;
    }

    // internalOnly still gates tenant VISIBILITY (validation is the export
    // control, but an internal-only firm's reports are never tenant-facing).
    if (!resolved.sendable || resolved.requireLogin) {
      res.status(403).json({ error: "This report is not available for download" });
      return;
    }

    const [eff, website] = await Promise.all([
      loadEffectiveReport(resolved.companyId),
      getCompanyWebsite(resolved.companyId),
    ]);
    const data = eff.response;

    if (!data.meta.generatedAt) {
      res.status(409).json({ error: "Report is not ready for download yet" });
      return;
    }

    if (!eff.validation.isValidated) {
      res.status(409).json({ error: "Report is not ready for download yet" });
      return;
    }

    const html = buildReportPdfHtml(data, website, toValidationStamp(eff.validation));
    const pdf = await renderHtmlToPdf(html);

    const safeCompanyName = data.reportData.companyName.replace(/[\\/:*?"<>|]/g, "").trim();
    const filename = `${safeCompanyName} - INVESQ Diagnostic Report.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(pdf);
  } catch (err) {
    if (err instanceof CompanyNotFoundError || err instanceof NoAssessmentError) {
      res.status(404).json({ error: "Company not found" });
      return;
    }
    req.log.error({ err, firmSlug, companySlug }, "Failed to render tenant report PDF");
    res.status(500).json({ error: "Failed to render report" });
  }
});

export default router;

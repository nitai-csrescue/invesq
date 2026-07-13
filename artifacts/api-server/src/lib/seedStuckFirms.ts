// ---------------------------------------------------------------------------
// Idempotent startup seeder — unsticks firms that the discovery job left in
// "pending" with 0 companies (false-empty result: discovery completed but
// found no candidates because the firm's portfolio page uses images/logos).
//
// For each entry in STUCK_FIRMS: if the firm exists in the DB with zero
// non-excluded companies AND no queued/running build job, insert the listed
// companies as "active" and queue a build job so scoring runs automatically.
//
// Runs on every server start but no-ops immediately once companies are present
// (the non-excluded count check is the idempotency guard). Safe to leave in
// permanently — it touches ONLY the specific slugs listed here.
// ---------------------------------------------------------------------------
import { and, count, eq, inArray, ne } from "drizzle-orm";
import { db, companiesTable, firmsTable, jobsTable } from "@workspace/db";
import { normalizeCompanyName } from "@workspace/portfolio-engine";
import { runBuildJob } from "./jobs/build.js";
import { logger } from "./logger.js";

interface SeedCompany {
  name: string;
  website: string | null;
}

interface SeedFirm {
  slug: string;
  companies: SeedCompany[];
}

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "company";
}

const STUCK_FIRMS: SeedFirm[] = [
  {
    slug: "staley-capital",
    companies: [
      { name: "MNTN", website: "https://mountain.com" },
      { name: "Looma", website: "https://www.looma.com" },
      { name: "Olo", website: "https://www.olo.com" },
    ],
  },
  {
    slug: "inflexion",
    companies: [
      { name: "Curinos", website: "https://curinos.com" },
      { name: "Infront", website: "https://www.infrontfinance.com" },
      { name: "Ranger Fire", website: "https://www.rangerfire.com" },
    ],
  },
];

async function seedFirm(entry: SeedFirm): Promise<void> {
  const [firm] = await db
    .select()
    .from(firmsTable)
    .where(eq(firmsTable.slug, entry.slug))
    .limit(1);

  if (!firm) {
    logger.debug({ slug: entry.slug }, "seedStuckFirms: firm not found, skipping");
    return;
  }

  // Count non-excluded companies (active + candidate). If any exist, skip.
  const [{ value: nonExcludedCount }] = await db
    .select({ value: count() })
    .from(companiesTable)
    .where(
      and(
        eq(companiesTable.firmId, firm.id),
        ne(companiesTable.status, "excluded"),
      ),
    );

  if (nonExcludedCount > 0) {
    logger.debug(
      { slug: entry.slug, nonExcludedCount },
      "seedStuckFirms: firm already has companies, skipping",
    );
    return;
  }

  // Skip if a build job is already queued or running for this firm.
  const [existingBuildJob] = await db
    .select({ id: jobsTable.id })
    .from(jobsTable)
    .where(
      and(
        eq(jobsTable.type, "build"),
        eq(jobsTable.targetId, String(firm.id)),
        inArray(jobsTable.status, ["queued", "running"]),
      ),
    )
    .limit(1);

  if (existingBuildJob) {
    logger.info(
      { slug: entry.slug, jobId: existingBuildJob.id },
      "seedStuckFirms: build job already in flight, skipping",
    );
    return;
  }

  logger.info({ slug: entry.slug }, "seedStuckFirms: seeding companies for stuck firm");

  // Insert listed companies as "active" so the build job can score them.
  const toInsert = entry.companies.map((c) => ({
    firmId: firm.id,
    name: c.name,
    website: c.website,
    status: "active" as const,
    slug: slugify(c.name),
    normalizedName: normalizeCompanyName(c.name),
    meta: null,
  }));

  await db.insert(companiesTable).values(toInsert);

  // Queue a build job and fire it.
  const [job] = await db
    .insert(jobsTable)
    .values({ type: "build", targetId: String(firm.id), status: "queued" })
    .returning();

  if (!job) {
    logger.error({ slug: entry.slug }, "seedStuckFirms: failed to insert build job");
    return;
  }

  logger.info({ slug: entry.slug, jobId: job.id }, "seedStuckFirms: build job queued, firing");

  void runBuildJob(job.id).catch((err) =>
    logger.error({ err, slug: entry.slug, jobId: job.id }, "seedStuckFirms: build job crashed"),
  );
}

export async function seedStuckFirms(): Promise<void> {
  for (const entry of STUCK_FIRMS) {
    try {
      await seedFirm(entry);
    } catch (err) {
      logger.error({ err, slug: entry.slug }, "seedStuckFirms: unexpected error seeding firm");
    }
  }
}

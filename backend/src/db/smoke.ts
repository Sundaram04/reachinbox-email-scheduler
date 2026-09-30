import { and, count, eq } from "drizzle-orm";

import { closeDb, db } from "./index";
import { getDbErrorCode } from "./errors";
import { campaigns, emails, senders, users } from "./schema";

async function expectDbError(label: string, run: () => Promise<unknown>) {
  try {
    await run();

    console.log(`${label}: FAIL (error aana chahiye tha)`);
  } catch (err) {
    console.log(`${label}: blocked, code = ${getDbErrorCode(err)}`);
  }
}

async function main() {
  const tag = Date.now();

  // --------------------------------------------------
  // 1. User + Sender insert
  // --------------------------------------------------

  console.log("1) user + sender insert");

  const [user] = await db
    .insert(users)
    .values({
      googleSub: `smoke-${tag}`,
      email: `smoke-${tag}@example.com`,
      name: "Smoke Test",
    })
    .returning();

  const [sender] = await db
    .insert(senders)
    .values({
      userId: user.id,
      fromEmail: "sender@ethereal.email",
      smtpHost: "smtp.ethereal.email",
      smtpPort: 587,
      smtpUser: "u",
      smtpPass: "p",
    })
    .returning();

  console.log(`   user.id = ${user.id}`);

  // --------------------------------------------------
  // 2. Transaction: campaign + 3 emails
  // --------------------------------------------------

  console.log("2) transaction: 1 campaign + 3 emails (bulk insert)");

  const { campaign, rows } = await db.transaction(async (tx) => {
    const [c] = await tx
      .insert(campaigns)
      .values({
        userId: user.id,
        subject: "Hello",
        body: "Test body",
        startTime: new Date(Date.now() + 60_000),
        delaySeconds: 10,
        hourlyLimit: 100,
      })
      .returning();

    const inserted = await tx
      .insert(emails)
      .values(
        ["a@x.com", "b@x.com", "c@x.com"].map((to, i) => ({
          campaignId: c.id,
          senderId: sender.id,
          toEmail: to,
          scheduledAt: new Date(c.startTime.getTime() + i * 10_000),
        })),
      )
      .returning();

    return {
      campaign: c,
      rows: inserted,
    };
  });

  console.log(
    `   inserted ${rows.length} emails, default status = ${rows[0].status}`,
  );

  // --------------------------------------------------
  // 3. Dashboard-style JOIN
  // --------------------------------------------------

  console.log("3) dashboard-style query (join + filter + order)");

  const list = await db
    .select({
      to: emails.toEmail,
      subject: campaigns.subject,
      status: emails.status,
      at: emails.scheduledAt,
    })
    .from(emails)
    .innerJoin(campaigns, eq(emails.campaignId, campaigns.id))
    .where(and(eq(campaigns.userId, user.id), eq(emails.status, "scheduled")))
    .orderBy(emails.scheduledAt);

  list.forEach((r) => {
    console.log(`   ${r.to} ${r.subject} ${r.status} ${r.at.toISOString()}`);
  });

  // --------------------------------------------------
  // 4. Conditional UPDATE ... RETURNING
  // --------------------------------------------------

  console.log("4) conditional UPDATE ... RETURNING (Stage 7 preview)");

  const claim = () =>
    db
      .update(emails)
      .set({
        status: "processing",
        claimedAt: new Date(),
      })
      .where(and(eq(emails.id, rows[0].id), eq(emails.status, "scheduled")))
      .returning({
        id: emails.id,
        updatedAt: emails.updatedAt,
      });

  const first = await claim();
  const second = await claim();

  console.log(
    `   pehli baar rows = ${first.length}, doosri baar rows = ${second.length}`,
  );

  const changed = rows[0].updatedAt.getTime() !== first[0].updatedAt.getTime();

  console.log(`   updated_at badla ? ${changed}`);

  // --------------------------------------------------
  // 5. Constraints
  // --------------------------------------------------

  console.log("5) constraints kaam kar rahe hain?");

  await expectDbError("duplicate (campaign, to_email)", () =>
    db.insert(emails).values({
      campaignId: campaign.id,
      toEmail: "a@x.com",
      scheduledAt: new Date(),
    }),
  );

  await expectDbError("hourly_limit = 0", () =>
    db.insert(campaigns).values({
      userId: user.id,
      subject: "s",
      body: "b",
      startTime: new Date(),
      delaySeconds: 1,
      hourlyLimit: 0,
    }),
  );

  await expectDbError("email bina valid campaign", () =>
    db.insert(emails).values({
      campaignId: "00000000-0000-0000-0000-000000000000",
      toEmail: "z@x.com",
      scheduledAt: new Date(),
    }),
  );

  // --------------------------------------------------
  // 6. Cascade delete
  // --------------------------------------------------

  console.log(
    "6) cleanup: sirf user delete karo, baaki sab CASCADE se jaana chahiye",
  );

  await db.delete(users).where(eq(users.id, user.id));

  const [c1] = await db
    .select({ n: count() })
    .from(campaigns)
    .where(eq(campaigns.userId, user.id));

  const [c2] = await db
    .select({ n: count() })
    .from(emails)
    .where(eq(emails.campaignId, campaign.id));

  const [c3] = await db
    .select({ n: count() })
    .from(senders)
    .where(eq(senders.userId, user.id));

  console.log(
    `   bache hue: campaigns = ${c1.n}, emails = ${c2.n}, senders = ${c3.n}`,
  );

  console.log("SMOKE TEST PASSED");
}

main()
  .catch((err) => {
    console.error("SMOKE TEST FAILED:", err);
    process.exitCode = 1;
  })
  .finally(() => closeDb());

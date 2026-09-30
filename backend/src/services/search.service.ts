import { Client } from "@elastic/elasticsearch";
import { asc, eq, gt, inArray } from "drizzle-orm";

import { env } from "../config/env";
import { db } from "../db";
import { campaigns, emails } from "../db/schema";
import { HttpError } from "../utils/HttpError";

const INDEX = env.ELASTICSEARCH_INDEX;
const BODY_MAX_CHARS = 5000;
const BULK_CHUNK_SIZE = 500;
const CIRCUIT_OPEN_MS = 15_000;

const client = new Client({
  node: env.ELASTICSEARCH_URL,
  requestTimeout: 3000,
  maxRetries: 0,
});

let indexReady = false;
let unavailableUntil = 0;

export type SearchQuery = {
  q?: string;
  status?: "scheduled" | "processing" | "sent" | "failed";
  limit: number;
  offset: number;
};

async function ensureIndex() {
  if (indexReady) {
    return;
  }

  const exists = await client.indices.exists({ index: INDEX });

  if (!exists) {
    await client.indices
      .create({
        index: INDEX,
        settings: { number_of_shards: 1, number_of_replicas: 0 },
        mappings: {
          properties: {
            emailId: { type: "keyword" },
            userId: { type: "keyword" },
            campaignId: { type: "keyword" },
            senderId: { type: "keyword" },
            toEmail: {
              type: "text",
              fields: { keyword: { type: "keyword" } },
            },
            subject: { type: "text" },
            body: { type: "text" },
            status: { type: "keyword" },
            scheduledAt: { type: "date" },
            sentAt: { type: "date" },
            createdAt: { type: "date" },
            updatedAt: { type: "date" },
          },
        },
      })
      .catch((err) => {
        if (
          err?.meta?.body?.error?.type !== "resource_already_exists_exception"
        ) {
          throw err;
        }
      });
  }

  indexReady = true;
}

async function loadDocs(where: ReturnType<typeof inArray>) {
  const rows = await db
    .select({
      emailId: emails.id,
      userId: campaigns.userId,
      campaignId: emails.campaignId,
      senderId: emails.senderId,
      toEmail: emails.toEmail,
      subject: campaigns.subject,
      body: campaigns.body,
      status: emails.status,
      scheduledAt: emails.scheduledAt,
      sentAt: emails.sentAt,
      createdAt: emails.createdAt,
      updatedAt: emails.updatedAt,
    })
    .from(emails)
    .innerJoin(campaigns, eq(emails.campaignId, campaigns.id))
    .where(where);

  return rows.map((row) => ({
    ...row,
    body: row.body.slice(0, BODY_MAX_CHARS),
  }));
}

async function bulkIndex(docs: Awaited<ReturnType<typeof loadDocs>>) {
  if (docs.length === 0) {
    return;
  }

  await ensureIndex();

  for (let i = 0; i < docs.length; i += BULK_CHUNK_SIZE) {
    const chunk = docs.slice(i, i + BULK_CHUNK_SIZE);

    const result = await client.bulk({
      operations: chunk.flatMap((doc) => [
        {
          index: {
            _index: INDEX,
            _id: doc.emailId,
            version: doc.updatedAt.getTime(),
            version_type: "external_gte" as const,
          },
        },
        doc,
      ]),
    });

    if (result.errors) {
      const failed = result.items.filter(
        (item) => item.index?.error && item.index.status !== 409,
      );

      if (failed.length > 0) {
        throw new Error(`${failed.length} documents failed to index`);
      }
    }
  }
}

async function guarded(action: () => Promise<void>) {
  if (Date.now() < unavailableUntil) {
    return;
  }

  try {
    await action();
  } catch (err) {
    unavailableUntil = Date.now() + CIRCUIT_OPEN_MS;
    indexReady = false;
    const message = err instanceof Error ? err.message : String(err);
    console.error("[search] indexing skipped:", message);
  }
}

export function indexEmailsSafe(ids: string[]) {
  return guarded(async () => {
    for (let i = 0; i < ids.length; i += BULK_CHUNK_SIZE) {
      await bulkIndex(
        await loadDocs(inArray(emails.id, ids.slice(i, i + BULK_CHUNK_SIZE))),
      );
    }
  });
}

export function syncEmailSafe(id: string) {
  return indexEmailsSafe([id]);
}

export async function reindexAllEmails() {
  let cursor = "00000000-0000-0000-0000-000000000000";
  let total = 0;

  for (;;) {
    const page = await db
      .select({ id: emails.id })
      .from(emails)
      .where(gt(emails.id, cursor))
      .orderBy(asc(emails.id))
      .limit(BULK_CHUNK_SIZE);

    if (page.length === 0) {
      return total;
    }

    await bulkIndex(
      await loadDocs(
        inArray(
          emails.id,
          page.map((row) => row.id),
        ),
      ),
    );

    total += page.length;
    cursor = page[page.length - 1].id;
  }
}

export async function searchEmails(userId: string, query: SearchQuery) {
  const filter: object[] = [{ term: { userId } }];

  if (query.status) {
    filter.push({ term: { status: query.status } });
  }

  const must = query.q
    ? [
        {
          bool: {
            minimum_should_match: 1,
            should: [
              {
                term: {
                  "toEmail.keyword": {
                    value: query.q.toLowerCase(),
                    boost: 10,
                  },
                },
              },
              {
                multi_match: {
                  query: query.q,
                  type: "bool_prefix" as const,
                  operator: "and" as const,
                  fields: ["toEmail^3", "subject^2", "body"],
                },
              },
            ],
          },
        },
      ]
    : [];

  try {
    await ensureIndex();

    const result = await client.search({
      index: INDEX,
      from: query.offset,
      size: query.limit,
      track_total_hits: true,
      query: { bool: { must, filter } },
      sort: [
        { _score: { order: "desc" } },
        { scheduledAt: { order: "desc" } },
        { emailId: { order: "asc" } },
      ],
      _source: [
        "emailId",
        "campaignId",
        "senderId",
        "toEmail",
        "subject",
        "status",
        "scheduledAt",
        "sentAt",
        "createdAt",
      ],
    });

    const total =
      typeof result.hits.total === "number"
        ? result.hits.total
        : (result.hits.total?.value ?? 0);

    return {
      items: result.hits.hits.map((hit) => hit._source),
      total,
      limit: query.limit,
      offset: query.offset,
    };
  } catch (err) {
    indexReady = false;
    const message = err instanceof Error ? err.message : String(err);
    console.error("[search] query failed:", message);
    throw new HttpError(503, "Search is temporarily unavailable");
  }
}

import { eq } from "drizzle-orm";

import { db } from "../db";
import { users } from "../db/schema";
import type { GoogleProfile } from "./google.service";

export async function upsertGoogleUser(profile: GoogleProfile) {
  const [user] = await db
    .insert(users)
    .values({
      googleSub: profile.sub,
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.picture,
    })
    .onConflictDoUpdate({
      target: users.googleSub,
      set: {
        email: profile.email,
        name: profile.name,
        avatarUrl: profile.picture,
        updatedAt: new Date(),
      },
    })
    .returning();

  return user;
}

export async function findUserById(id: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  return user ?? null;
}

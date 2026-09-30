const EMAIL_PATTERN =
  /^(?!\.)(?!.*\.\.)[A-Za-z0-9_'+\-.]*[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9-]*\.)+[A-Za-z]{2,}$/;

export const MAX_RECIPIENTS = 10_000;
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export function isValidEmail(value: string) {
  return EMAIL_PATTERN.test(value);
}

export type ExtractResult = {
  valid: string[];
  invalid: string[];
};

export function extractEmails(text: string): ExtractResult {
  const valid: string[] = [];
  const invalid: string[] = [];

  for (const raw of text.split(/[\s,;"<>()[\]]+/)) {
    const token = raw.replace(/^[.'-]+|[.'-]+$/g, "");

    if (!token.includes("@")) {
      continue;
    }

    const email = token.toLowerCase();

    if (isValidEmail(email)) {
      valid.push(email);
    } else {
      invalid.push(token);
    }
  }

  return { valid, invalid };
}

export function mergeRecipients(existing: string[], incoming: string[]) {
  const seen = new Set(existing);
  const added: string[] = [];
  let duplicates = 0;

  for (const email of incoming) {
    if (seen.has(email)) {
      duplicates += 1;
    } else {
      seen.add(email);
      added.push(email);
    }
  }

  return { list: [...existing, ...added], added: added.length, duplicates };
}

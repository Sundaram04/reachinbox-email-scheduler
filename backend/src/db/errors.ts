type ErrorLike = {
  code?: unknown;
  cause?: unknown;
};

export function getDbErrorCode(err: unknown): string | undefined {
  let current: unknown = err;

  for (let i = 0; i < 4 && current && typeof current === "object"; i++) {
    const { code, cause } = current as ErrorLike;

    if (typeof code === "string") {
      return code;
    }

    current = cause;
  }

  return undefined;
}

export function isUniqueViolation(err: unknown) {
  return getDbErrorCode(err) === "23505";
}

export function isDbUnavailable(err: unknown) {
  const code = getDbErrorCode(err);

  if (!code) {
    return false;
  }

  return (
    code.startsWith("08") ||
    ["ECONNREFUSED", "ETIMEDOUT", "57P01", "53300"].includes(code)
  );
}

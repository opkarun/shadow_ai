type LogFields = Record<string, unknown>;

function write(level: "info" | "warn" | "error", message: string, fields?: LogFields): void {
  const payload = {
    level,
    message,
    fields: fields ?? {},
    timestamp: new Date().toISOString()
  };

  const serialized = JSON.stringify(payload);

  if (level === "error") {
    console.error(serialized);
    return;
  }

  if (level === "warn") {
    console.warn(serialized);
    return;
  }

  console.log(serialized);
}

export const logger = {
  info(message: string, fields?: LogFields): void {
    write("info", message, fields);
  },
  warn(message: string, fields?: LogFields): void {
    write("warn", message, fields);
  },
  error(message: string, fields?: LogFields): void {
    write("error", message, fields);
  }
};

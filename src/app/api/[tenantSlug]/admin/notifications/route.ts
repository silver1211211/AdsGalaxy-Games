const unavailable = () =>
  Response.json(
    { error: "This Admin feature is unavailable.", code: "FORBIDDEN" },
    { status: 403 },
  );

export async function GET() {
  return unavailable();
}

export async function PATCH() {
  return unavailable();
}

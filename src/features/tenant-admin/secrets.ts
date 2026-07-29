export function maskBotToken(token: string) {
  const [id, secret = ""] = token.split(":");
  return `${id.slice(0, 4)}•••:${"•".repeat(Math.min(8, secret.length))}${secret.slice(-4)}`;
}

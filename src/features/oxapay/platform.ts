import { prisma } from "@/lib/prisma";
import { safeSignupUrl } from "./policy";

export async function updatePlatformOxaPaySettings(input: {
  actorUserId: string;
  actorRole: string;
  signupUrl: string | null;
  signupLabel: string;
  helpText: string | null;
  signupEnabled: boolean;
  automaticDisabled: boolean;
}) {
  if (input.actorRole !== "SUPER_ADMIN") throw new Error("FORBIDDEN");
  const signupUrl = input.signupUrl ? safeSignupUrl(input.signupUrl) : null;
  if (input.signupUrl && !signupUrl) throw new Error("INVALID_URL");
  if (!input.signupLabel.trim() || input.signupLabel.length > 80)
    throw new Error("INVALID_URL");
  return prisma.platformIntegrationSettings.upsert({
    where: { id: "platform" },
    create: {
      id: "platform",
      oxaPaySignupUrl: signupUrl,
      oxaPaySignupLabel: input.signupLabel.trim(),
      oxaPayHelpText: input.helpText,
      oxaPaySignupEnabled: input.signupEnabled,
      oxaPayAutomaticDisabled: input.automaticDisabled,
      updatedBySuperAdminId: input.actorUserId,
    },
    update: {
      oxaPaySignupUrl: signupUrl,
      oxaPaySignupLabel: input.signupLabel.trim(),
      oxaPayHelpText: input.helpText,
      oxaPaySignupEnabled: input.signupEnabled,
      oxaPayAutomaticDisabled: input.automaticDisabled,
      updatedBySuperAdminId: input.actorUserId,
    },
  });
}

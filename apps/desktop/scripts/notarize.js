module.exports = async function notarizeIfConfigured(context) {
  const { electronPlatformName, appOutDir, packager } = context;
  if (electronPlatformName !== "darwin") return;

  const appleId = process.env.APPLE_ID;
  const appleIdPassword = process.env.APPLE_APP_SPECIFIC_PASSWORD;
  const teamId = process.env.APPLE_TEAM_ID;

  if (!appleId || !appleIdPassword || !teamId) {
    console.log("[notarize] Skipping notarization (APPLE_ID / APPLE_APP_SPECIFIC_PASSWORD / APPLE_TEAM_ID not fully set)");
    return;
  }

  const appName = packager.appInfo.productFilename;
  console.log(`[notarize] Ready to notarize ${appName}.app in ${appOutDir}`);
  console.log("[notarize] Note: wire @electron/notarize call here when running Mac build host with Apple credentials.");
};

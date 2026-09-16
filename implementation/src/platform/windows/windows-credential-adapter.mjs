export function createWindowsCredentialAdapter({ os = process.platform, get = null, put = null, remove = null } = {}) {
  const available = os === "win32" && Boolean(get && put && remove);
  const unavailable = () => { throw Object.assign(new Error("Windows Credential Manager helper is unavailable"), { code: "CREDENTIAL_STORE_UNAVAILABLE" }); };
  return Object.freeze({ available, get: available ? get : unavailable, put: available ? put : unavailable, remove: available ? remove : unavailable });
}

export function credentialTarget(profileId) {
  if (!profileId || /[\\/\0]/.test(String(profileId))) throw new Error("Invalid credential profile");
  return `MindCraft/profile/${profileId}`;
}

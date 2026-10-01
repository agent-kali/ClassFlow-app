/**
 * Leave the app only after the server has cleared the session.
 * A failed logout rejects from `logout` and must not drop the schedule or
 * navigate away; the caller stays put and can retry.
 */
export async function signOutSession(input: {
  logout: () => Promise<void>;
  resetSchedule: () => void;
  goToLogin: () => void;
}): Promise<void> {
  try {
    await input.logout();
  } catch {
    return;
  }
  input.resetSchedule();
  input.goToLogin();
}

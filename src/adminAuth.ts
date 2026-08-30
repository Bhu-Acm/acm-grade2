import { ref } from 'vue';

const SESSION_KEY = 'acm-grade2:admin-unlocked';
const configuredPassword = import.meta.env.VITE_ADMIN_PASSWORD || 'acm2026';
const unlocked = ref(
  typeof sessionStorage !== 'undefined' && sessionStorage.getItem(SESSION_KEY) === 'true'
);

export function isAdminUnlocked() {
  return unlocked.value;
}

export function unlockAdmin(password: string): boolean {
  const valid = password === configuredPassword;
  if (valid) {
    unlocked.value = true;
    sessionStorage.setItem(SESSION_KEY, 'true');
  }
  return valid;
}

export function lockAdmin() {
  unlocked.value = false;
  sessionStorage.removeItem(SESSION_KEY);
}

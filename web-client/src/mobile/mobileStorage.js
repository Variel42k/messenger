export const MOBILE_NAV_STORAGE_KEY = 'messenger.mobileNavigation.v1';

export function readMobileNavigation() {
  try {
    const rawValue = window.localStorage.getItem(MOBILE_NAV_STORAGE_KEY);
    return rawValue ? JSON.parse(rawValue) : null;
  } catch (error) {
    return null;
  }
}

export function writeMobileNavigation(value) {
  try {
    window.localStorage.setItem(MOBILE_NAV_STORAGE_KEY, JSON.stringify(value));
  } catch (error) {
    // Storage is a convenience cache; URL remains the source of truth.
  }
}

export function clearMobileNavigation() {
  try {
    window.localStorage.removeItem(MOBILE_NAV_STORAGE_KEY);
  } catch (error) {
    // Ignore storage failures.
  }
}

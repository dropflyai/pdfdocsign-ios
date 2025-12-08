import { Capacitor } from '@capacitor/core';

/**
 * Platform detection utilities
 * Use these to write platform-specific code without duplication
 */

export const isNative = () => Capacitor.isNativePlatform();
export const isWeb = () => !Capacitor.isNativePlatform();
export const isIOS = () => Capacitor.getPlatform() === 'ios';
export const isAndroid = () => Capacitor.getPlatform() === 'android';
export const getPlatform = () => Capacitor.getPlatform();

/**
 * Usage examples:
 *
 * // iOS-only code:
 * if (isNative()) {
 *   // This only runs in the iOS app
 * }
 *
 * // Web-only code:
 * if (isWeb()) {
 *   // This only runs in the browser
 * }
 *
 * // Conditional rendering:
 * {isNative() && <MobileOnlyComponent />}
 * {isWeb() && <WebOnlyComponent />}
 */

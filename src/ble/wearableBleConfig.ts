/**
 * BLE identifiers for Dylan's PicoW-BLE wearable.
 * Service UUID is used as the scan filter (hardware advertises it).
 * Device name is used as a secondary identity check after discovery.
 */
export const BLE_TARGET_DEVICE_NAME = 'PicoW-BLE';

/**
 * Keep prefix export so any existing startsWith checks continue to work.
 * The actual device name is exactly 'PicoW-BLE'.
 */
export const BLE_TARGET_DEVICE_NAME_PREFIX = 'PicoW-BLE';

/**
 * NUS (Nordic UART Service) primary service UUID.
 * Hardware advertises this UUID, so the scan is filtered by it.
 */
export const BLE_WEARABLE_SERVICE_UUID = '6E400001-B5A3-F393-E0A9-E50E24DCCA9E';

/**
 * NUS TX characteristic — Notify + Read.
 * Hardware streams compact UTF-8 JSON snapshots here (~1 Hz).
 */
export const BLE_LATEST_SNAPSHOT_CHARACTERISTIC_UUID =
  '6E400003-B5A3-F393-E0A9-E50E24DCCA9E';

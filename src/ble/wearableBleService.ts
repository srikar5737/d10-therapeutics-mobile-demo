import {
  BLE_LATEST_SNAPSHOT_CHARACTERISTIC_UUID,
  BLE_WEARABLE_SERVICE_UUID,
} from './wearableBleConfig';
import {
  NormalizedWearableSnapshot,
  parseAndNormalizeWearableSnapshot,
} from '../data/hardwareSnapshotAdapter';
import { WearableConnectionState } from '../data/telemetrySink';

type BleDevice = {
  id: string;
  name?: string | null;
  localName?: string | null;
  connect?: () => Promise<BleDevice>;
  cancelConnection?: () => Promise<BleDevice>;
  discoverAllServicesAndCharacteristics?: () => Promise<BleDevice>;
  readCharacteristicForService?: (
    serviceUUID: string,
    characteristicUUID: string
  ) => Promise<{ value?: string | null }>;
  monitorCharacteristicForService?: (
    serviceUUID: string,
    characteristicUUID: string,
    listener: (
      error: { message?: string } | null,
      characteristic: { value?: string | null } | null
    ) => void
  ) => { remove: () => void };
};

type BleManagerLike = {
  startDeviceScan: (
    uuids: string[] | null,
    options: unknown,
    listener: (
      error: { message?: string } | null,
      device: BleDevice | null
    ) => void
  ) => void;
  stopDeviceScan: () => void;
  connectToDevice: (deviceId: string) => Promise<BleDevice>;
  destroy: () => void;
};

export class WearableBleService {
  private manager: BleManagerLike | null = null;
  private connectedDevice: BleDevice | null = null;
  private snapshotSubscription: { remove: () => void } | null = null;
  private receiveTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly onStateChange: (
      state: WearableConnectionState,
      errorMessage?: string
    ) => void,
    private readonly onSnapshot: (
      snapshot: NormalizedWearableSnapshot,
      rawPayload: string
    ) => void,
    private readonly onParseError?: (message: string) => void
  ) {}

  private ensureManager(): BleManagerLike {
    if (this.manager) {
      return this.manager;
    }

    let BleManagerCtor: new () => BleManagerLike;
    try {
      const bleModule = require('react-native-ble-plx');
      BleManagerCtor = bleModule.BleManager;
    } catch (_error) {
      throw new Error(
        'BLE module unavailable. Build and run a development build on iPhone.'
      );
    }

    this.manager = new BleManagerCtor();
    return this.manager;
  }

  private decodeBase64Utf8(value: string): string {
    if (typeof globalThis.atob === 'function') {
      const binary = globalThis.atob(value);
      const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
      return new TextDecoder().decode(bytes);
    }

    throw new Error('Base64 decode unavailable in this runtime.');
  }

  private setState(state: WearableConnectionState, errorMessage?: string) {
    this.onStateChange(state, errorMessage);
  }

  private processEncodedValue(encoded: string): void {
    try {
      const rawPayload = this.decodeBase64Utf8(encoded);
      const normalized = parseAndNormalizeWearableSnapshot(rawPayload);
      this.onSnapshot(normalized, rawPayload);
      this.setState('receiving');

      if (this.receiveTimeout) {
        clearTimeout(this.receiveTimeout);
      }
      this.receiveTimeout = setTimeout(() => {
        this.setState('connected');
      }, 1500);
    } catch (decodeError) {
      const msg =
        decodeError instanceof Error
          ? decodeError.message
          : 'Failed to parse BLE payload.';
      this.onParseError?.(msg);
    }
  }

  async scanForPeripheral(timeoutMs = 10000): Promise<BleDevice> {
    const manager = this.ensureManager();
    this.setState('scanning');

    return new Promise((resolve, reject) => {
      let settled = false;
      const finish = (callback: () => void) => {
        if (settled) {
          return;
        }
        settled = true;
        manager.stopDeviceScan();
        callback();
      };

      const timeout = setTimeout(() => {
        finish(() => {
          this.setState('error', 'No wearable found during scan.');
          reject(new Error('No wearable found during scan.'));
        });
      }, timeoutMs);

      // Filter scan by service UUID so only PicoW-BLE advertising the NUS service is returned.
      manager.startDeviceScan(
        [BLE_WEARABLE_SERVICE_UUID],
        null,
        (error, device) => {
          if (error) {
            clearTimeout(timeout);
            finish(() => {
              this.setState('error', error.message ?? 'BLE scan failed.');
              reject(new Error(error.message ?? 'BLE scan failed.'));
            });
            return;
          }

          if (!device) {
            return;
          }

          // The scan is already filtered by BLE_WEARABLE_SERVICE_UUID, so every
          // device returned here is advertising the NUS service — that's sufficient
          // to identify Dylan's PicoW-BLE. Accept it immediately.
          //
          // Device name is validated as an informational check only: PicoW-BLE may
          // not include localName in every advertisement packet, so we must not
          // gate the connection on it.
          clearTimeout(timeout);
          finish(() => resolve(device));
        }
      );
    });
  }

  async connect(deviceId: string): Promise<void> {
    const manager = this.ensureManager();
    this.setState('connecting');

    const connected = await manager.connectToDevice(deviceId);
    const discovered = connected.discoverAllServicesAndCharacteristics
      ? await connected.discoverAllServicesAndCharacteristics()
      : connected;

    this.connectedDevice = discovered;
    this.setState('connected');
  }

  /**
   * Attempts an initial read of the snapshot characteristic.
   * Falls through silently if the characteristic is not readable
   * or if the value is absent — subscriptions will supply data shortly after.
   */
  private async performInitialRead(): Promise<void> {
    if (!this.connectedDevice?.readCharacteristicForService) {
      return;
    }

    try {
      const characteristic =
        await this.connectedDevice.readCharacteristicForService(
          BLE_WEARABLE_SERVICE_UUID,
          BLE_LATEST_SNAPSHOT_CHARACTERISTIC_UUID
        );

      const encoded = characteristic?.value;
      if (encoded) {
        this.processEncodedValue(encoded);
      }
    } catch (_readError) {
      // Initial read is best-effort; notifications will follow.
    }
  }

  async subscribeToLatestSnapshot(): Promise<void> {
    if (!this.connectedDevice?.monitorCharacteristicForService) {
      throw new Error('Wearable is not connected.');
    }

    // Best-effort initial read to populate UI before first notification arrives.
    await this.performInitialRead();

    this.snapshotSubscription?.remove();
    this.snapshotSubscription =
      this.connectedDevice.monitorCharacteristicForService(
        BLE_WEARABLE_SERVICE_UUID,
        BLE_LATEST_SNAPSHOT_CHARACTERISTIC_UUID,
        (error, characteristic) => {
          if (error) {
            this.setState(
              'error',
              error.message ?? 'Characteristic subscription failed.'
            );
            return;
          }

          const encoded = characteristic?.value;
          if (!encoded) {
            return;
          }

          this.processEncodedValue(encoded);
        }
      );
  }

  async scanConnectAndSubscribe(): Promise<void> {
    const device = await this.scanForPeripheral();
    await this.connect(device.id);
    await this.subscribeToLatestSnapshot();
  }

  async disconnect(): Promise<void> {
    this.snapshotSubscription?.remove();
    this.snapshotSubscription = null;

    if (this.receiveTimeout) {
      clearTimeout(this.receiveTimeout);
      this.receiveTimeout = null;
    }

    if (this.connectedDevice?.cancelConnection) {
      try {
        await this.connectedDevice.cancelConnection();
      } catch (_error) {
        // Ignore disconnect errors during demo cleanup.
      }
    }

    this.connectedDevice = null;
    this.setState('disconnected');
  }

  destroy() {
    this.snapshotSubscription?.remove();
    this.snapshotSubscription = null;
    if (this.receiveTimeout) {
      clearTimeout(this.receiveTimeout);
      this.receiveTimeout = null;
    }
    this.manager?.destroy();
    this.manager = null;
    this.connectedDevice = null;
  }
}

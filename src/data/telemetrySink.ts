import { NormalizedWearableSnapshot } from './hardwareSnapshotAdapter';

export type WearableConnectionState =
  | 'disconnected'
  | 'scanning'
  | 'connecting'
  | 'connected'
  | 'receiving'
  | 'error';

export interface TelemetrySink {
  onConnectionStateChange(state: WearableConnectionState): void;
  onSnapshotReceived(snapshot: NormalizedWearableSnapshot): void;
}

/**
 * Optional cloud hook. Replace this with a real sink later.
 */
export const NoopTelemetrySink: TelemetrySink = {
  onConnectionStateChange: () => {},
  onSnapshotReceived: () => {},
};

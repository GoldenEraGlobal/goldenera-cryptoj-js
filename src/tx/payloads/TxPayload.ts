/**
 * Base payload interface.
 */

import type { TxPayloadType, TxPayloadVersion } from '../../enums';

export interface TxPayload {
  readonly payloadType: TxPayloadType;
  readonly payloadVersion: TxPayloadVersion;
}

/**
 * Base payload interface.
 */

import type { TxPayloadType } from '../../enums';

export interface TxPayload {
  readonly payloadType: TxPayloadType;
}

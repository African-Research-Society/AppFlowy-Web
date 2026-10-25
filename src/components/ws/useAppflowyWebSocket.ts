import * as random from 'lib0/random';
import { useCallback, useEffect, useMemo, useState } from 'react';
import useWebSocket from 'react-use-websocket';

import { getTokenParsed } from '@/application/session/token';
import { arsSocketAccessToken } from '@/application/session/ars-socket';
import { EventType, on } from '@/application/session/event';
import { messages } from '@/proto/messages';

const wsURL = import.meta.env.AF_WS_V2_URL || 'ws://localhost:8000/ws/v2';

// WebSocket close code enum
enum CloseCode {
  NormalClose = 1000,
  EndpointLeft = 1001,
  ProtocolError = 1002,
  UnsupportedDataType = 1003,
  Reserved = 1004,
  NoStatusCode = 1005,
  AbnormalClose = 1006,
  InvalidFramePayloadData = 1007,
  PolicyViolation = 1008,
  MessageTooBig = 1009,
  ClientExpectedServerToNegotiateOneOrMoreExtensions = 1010,
  ServerEncounteredAnUnexpectedCondition = 1011,
  TLSHandshakeFailed = 1015,
}

const RECONNECT_ATTEMPTS = 10;
const RECONNECT_INTERVAL = 1000;

export type AppflowyWebSocketType = {
  /**
   * The last received message from the WebSocket.
   * It is decoded from the binary format to a `messages.Message` object.
   */
  lastMessage: messages.Message | null;
  /**
   * Function to send a message through the WebSocket.
   * The message is encoded to binary format before sending.
   * @param msg - The message to send, in the format of `messages.IMessage`.
   * @param keep - Should the message be cached if the WebSocket is not open? (default: true)
   */
  sendMessage: (msg: messages.IMessage, keep?: boolean) => void;
  /**
   * The current ready state of the WebSocket.
   * It can be one of the following values:
   * - 0: CONNECTING
   * - 1: OPEN
   * - 2: CLOSING
   * - 3: CLOSED
   */
  readyState: number;
  /**
   * The options used to create the WebSocket connection.
   */
  options: Options;

  /**
   * The number of reconnect attempts.
   */
  reconnectAttempt: number;
  /**
   * Function to manually trigger a reconnection.
   */
  reconnect: () => void;
};

export interface Options {
  /**
   * UUID v4 representing the unique identifier of currently opened workspace.
   */
  workspaceId: string;
  /**
   * WebSocket server URL to connect to. Should start with `ws://` or `wss://`.
   */
  url?: string;
  /**
   * Client ID is a unique identifier for the client. This can be used as `Y.Doc`
   * client ID. Must not be shared between browser tabs or different clients.
   * It is used to identify the client in the WebSocket connection.
   * If not provided, a random uint32 will be generated.
   */
  clientId?: number;
  /**
   * Unique device identifier. If not provided, a random UUID v4 will be generated.
   */
  deviceId?: string;
  /**
   * Token used for authentication. If not provided, the token will be fetched from the session.
   */
  token?: string;
}

export const useAppflowyWebSocket = (options: Options): AppflowyWebSocketType => {
  options.url = options.url || wsURL;
  options.token = options.token || getTokenParsed()?.access_token;
  options.clientId = options.clientId || random.uint32();
  options.deviceId = options.deviceId || random.uuidv4();
  const [connectionGeneration, setConnectionGeneration] = useState(0);
  const { workspaceId, clientId, deviceId, url: origin } = options;
  const url = useCallback(async () => {
    const token = await arsSocketAccessToken();
    return `${origin}/${workspaceId}/?clientId=${clientId}&deviceId=${deviceId}&token=${encodeURIComponent(token)}&connection=${connectionGeneration}`;
  }, [origin, workspaceId, clientId, deviceId, connectionGeneration]);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      clearTimeout(timer);
      const session = getTokenParsed();
      if (session) timer = setTimeout(() => setConnectionGeneration((value) => value + 1), Math.max(1000, session.expires_at * 1000 - Date.now() - 30000));
    };
    schedule();
    const unsubscribe = on(EventType.SESSION_REFRESH, schedule);
    const visible = () => { if (!document.hidden && (getTokenParsed()?.expires_at ?? 0) <= Date.now() / 1000 + 30) setConnectionGeneration((value) => value + 1); };
    document.addEventListener('visibilitychange', visible);
    return () => { clearTimeout(timer); unsubscribe(); document.removeEventListener('visibilitychange', visible); };
  }, [workspaceId]);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const { lastMessage, sendMessage, readyState, getWebSocket } = useWebSocket(url, {
    share: true,
    heartbeat: {
      message: 'echo',
      returnMessage: 'echo',
      timeout: 60000, // disconnect after 60 seconds of no response
      interval: 25000, // send ping every 25 seconds
    },
    // Reconnect configuration
    shouldReconnect: (closeEvent) => {
      console.log('Connection closed, code:', closeEvent.code, 'reason:', closeEvent.reason);

      // Determine if reconnect is needed based on the close code
      if (closeEvent.code === CloseCode.NormalClose) {
        return Boolean(getTokenParsed());
      }

      if (closeEvent.code === CloseCode.EndpointLeft) {
        // Endpoint left, reconnect
        return true;
      }

      if (closeEvent.code >= CloseCode.ProtocolError && closeEvent.code <= CloseCode.TLSHandshakeFailed) {
        // Protocol error, reconnect
        return true;
      }

      return true; // Other cases reconnect
    },

    reconnectAttempts: RECONNECT_ATTEMPTS,

    // Exponential backoff reconnect interval
    reconnectInterval: (attemptNumber) => {
      setReconnectAttempt(attemptNumber);
      const delay = Math.min(RECONNECT_INTERVAL * Math.pow(1.5, attemptNumber), 30000);

      console.log(`Reconnect attempt ${attemptNumber}, delay ${delay}ms`);
      return delay;
    },

    // Connection event callback
    onOpen: () => {
      console.log('✅ WebSocket connection opened');
      setReconnectAttempt(0);
    },

    onClose: (event) => {
      console.log('❌ WebSocket connection closed', event);
    },

    onError: (event) => {
      console.error('🔥 WebSocket error:', event);
    },

    onReconnectStop: (numAttempts) => {
      console.log('❌ Reconnect stopped, attempt number:', numAttempts);
    },
  });
  const websocket = getWebSocket() as WebSocket | null;

  if (websocket && websocket.binaryType !== 'arraybuffer') {
    websocket.binaryType = 'arraybuffer';
  }

  const sendProtobufMessage = useCallback(
    (message: messages.IMessage, keep = true): void => {
      console.log('sending sync message:', message);

      const protobufMessage = messages.Message.encode(message).finish();

      sendMessage(protobufMessage, keep);
    },
    [sendMessage]
  );

  const manualReconnect = useCallback(() => {
    console.log('Manual reconnect triggered');
    setConnectionGeneration((value) => value + 1);
  }, []);
  const lastProtobufMessage = useMemo(
    () => (lastMessage ? messages.Message.decode(new Uint8Array(lastMessage.data)) : null),
    [lastMessage]
  );

  return {
    lastMessage: lastProtobufMessage,
    sendMessage: sendProtobufMessage,
    readyState,
    options,
    reconnectAttempt,
    reconnect: manualReconnect,
  };
};

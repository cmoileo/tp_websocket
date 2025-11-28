"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { WS_MESSAGE_TYPES, HEARTBEAT_INTERVAL } from "../constants/websocket";

const initialState = {
  users: [],
  globalScore: 0,
  isAdmin: false,
  currentId: null,
  chatMessages: [],
  privateMessages: [],
  isConnected: false,
  error: "",
};

export function useWebSocket() {
  const [state, setState] = useState(initialState);
  const wsRef = useRef(null);
  const heartbeatRef = useRef(null);

  const updateState = useCallback((updates) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  const send = useCallback((payload) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify(payload));
  }, []);

  const startHeartbeat = useCallback(() => {
    stopHeartbeat();
    heartbeatRef.current = setInterval(() => {
      send({ type: WS_MESSAGE_TYPES.PING });
    }, HEARTBEAT_INTERVAL);
  }, [send, stopHeartbeat]);

  const reset = useCallback(
    (errorMessage = "") => {
      updateState({
        ...initialState,
        error: errorMessage,
      });
      stopHeartbeat();
    },
    [updateState, stopHeartbeat]
  );

  const resolveUserName = useCallback(
    (targetId) => {
      const user = state.users.find((entry) => entry.id === targetId);
      return user ? `${user.avatar} ${user.name}` : "unknown";
    },
    [state.users]
  );

  const handleMessage = useCallback(
    (event) => {
      let data;
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }

      const { type, payload } = data;

      switch (type) {
        case WS_MESSAGE_TYPES.WELCOME:
          break;

        case WS_MESSAGE_TYPES.JOIN_SUCCESS: {
          const self = payload.users.find((user) => user.id === payload.id);
          updateState({
            currentId: payload.id,
            users: payload.users,
            globalScore: payload.globalScore,
            isAdmin: Boolean(self?.isAdmin),
            isConnected: true,
            error: "",
          });
          startHeartbeat();
          break;
        }

        case WS_MESSAGE_TYPES.USER_JOINED:
          updateState({
            users: payload.users,
            globalScore: payload.globalScore,
          });
          setState((prev) => ({
            ...prev,
            chatMessages: [
              ...prev.chatMessages,
              {
                id: payload.id,
                label: "[SYSTEM]",
                text: `${payload.name} has joined the channel`,
                timestamp: Date.now(),
              },
            ],
          }));
          break;

        case WS_MESSAGE_TYPES.USER_LEFT:
          updateState({
            users: payload.users,
            globalScore: payload.globalScore,
          });
          setState((prev) => ({
            ...prev,
            chatMessages: [
              ...prev.chatMessages,
              {
                id: payload.id,
                label: "[SYSTEM]",
                text: "user disconnected from channel",
                timestamp: Date.now(),
              },
            ],
          }));
          break;

        case WS_MESSAGE_TYPES.USERS_UPDATE:
          updateState({ users: payload.users });
          break;

        case WS_MESSAGE_TYPES.SCORE_UPDATE:
          setState((prev) => ({
            ...prev,
            globalScore: payload.globalScore,
            users: prev.users.map((user) =>
              user.id === payload.id ? { ...user, score: payload.score } : user
            ),
          }));
          break;

        case WS_MESSAGE_TYPES.GLOBAL_MESSAGE:
          setState((prev) => ({
            ...prev,
            chatMessages: [
              ...prev.chatMessages,
              {
                id: payload.id,
                label: `${payload.from.avatar} ${payload.from.name}`,
                text: payload.text,
                timestamp: payload.timestamp,
              },
            ],
          }));
          break;

        case WS_MESSAGE_TYPES.PRIVATE_MESSAGE:
          setState((prev) => {
            const label =
              payload.from.id === prev.currentId
                ? `-> ${resolveUserName(payload.to)}`
                : `${payload.from.avatar} ${payload.from.name}`;
            return {
              ...prev,
              privateMessages: [
                ...prev.privateMessages,
                {
                  id: payload.id,
                  label,
                  text: payload.text,
                  timestamp: payload.timestamp,
                },
              ],
            };
          });
          break;

        case WS_MESSAGE_TYPES.ERROR:
          updateState({ error: payload.message });
          break;
      }
    },
    [updateState, startHeartbeat, resolveUserName]
  );

  const handleClose = useCallback(
    (event) => {
      const message =
        event?.code === 1000 && event?.reason === "admin_disconnect"
          ? "connection terminated by admin"
          : "connection closed";
      reset(message);
    },
    [reset]
  );

  const connect = useCallback(
    (name, avatar, adminCode) => {
      if (wsRef.current) {
        wsRef.current.removeEventListener("close", handleClose);
        wsRef.current.close();
      }

      const protocol = window.location.protocol === "https:" ? "wss" : "ws";
      const wsPath = process.env.NEXT_PUBLIC_WS_PATH || "/ws";
      const socket = new WebSocket(
        `${protocol}://${window.location.host}${wsPath}`
      );

      wsRef.current = socket;

      socket.addEventListener("open", () => {
        send({
          type: WS_MESSAGE_TYPES.JOIN,
          payload: { name, avatar, adminCode: adminCode || null },
        });
      });

      socket.addEventListener("message", handleMessage);
      socket.addEventListener("close", handleClose);
      socket.addEventListener("error", () => reset("connection lost"));
    },
    [send, handleMessage, handleClose, reset]
  );

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    reset("session terminated");
  }, [reset]);

  const sendGlobalMessage = useCallback(
    (text) => {
      if (!text.trim()) return;
      send({ type: WS_MESSAGE_TYPES.GLOBAL_MESSAGE, payload: { text } });
    },
    [send]
  );

  const sendPrivateMessage = useCallback(
    (text, targetId) => {
      if (!text.trim() || !targetId) return;
      send({
        type: WS_MESSAGE_TYPES.PRIVATE_MESSAGE,
        payload: { text, targetId },
      });
    },
    [send]
  );

  const adjustScore = useCallback(
    (delta) => {
      send({ type: WS_MESSAGE_TYPES.SCORE_EVENT, payload: { delta } });
    },
    [send]
  );

  const disconnectUser = useCallback(
    (targetId) => {
      send({
        type: WS_MESSAGE_TYPES.REQUEST_DISCONNECT_USER,
        payload: { targetId },
      });
    },
    [send]
  );

  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close();
      stopHeartbeat();
    };
  }, [stopHeartbeat]);

  return {
    ...state,
    connect,
    disconnect,
    sendGlobalMessage,
    sendPrivateMessage,
    adjustScore,
    disconnectUser,
  };
}

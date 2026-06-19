import { useCallback, useEffect, useState } from "react";
import { supabase } from "../services/auth";

const getMissingConfigError = () => new Error("Supabase n’est pas configuré.");

export function useConversation({ requestId, senderRole, senderId }) {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadMessages = useCallback(async () => {
    if (!requestId) {
      setMessages([]);
      setIsLoading(false);
      setErrorMessage("");
      return;
    }

    if (!supabase) {
      setErrorMessage(getMissingConfigError().message);
      setMessages([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("request_messages")
      .select("*")
      .eq("request_id", requestId)
      .order("created_at", { ascending: true });

    if (error) {
      setErrorMessage(error.message);
      setMessages([]);
    } else {
      setMessages(data ?? []);
    }

    setIsLoading(false);
  }, [requestId]);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      loadMessages();
    }, 0);

    return () => window.clearTimeout(loadTimer);
  }, [loadMessages]);

  useEffect(() => {
    if (!supabase || !requestId) {
      return undefined;
    }

    const channel = supabase
      .channel(`request_messages:${requestId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "request_messages",
          filter: `request_id=eq.${requestId}`,
        },
        (payload) => {
          setMessages((currentMessages) => {
            if (currentMessages.some((message) => message.id === payload.new.id)) {
              return currentMessages;
            }

            return [...currentMessages, payload.new].sort(
              (firstMessage, secondMessage) =>
                new Date(firstMessage.created_at).getTime() - new Date(secondMessage.created_at).getTime(),
            );
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [requestId]);

  const sendMessage = async (message) => {
    const trimmedMessage = message.trim();

    if (!trimmedMessage || !requestId || !senderId || !senderRole) {
      return { error: null };
    }

    if (!supabase) {
      const error = getMissingConfigError();
      setErrorMessage(error.message);
      return { error };
    }

    setIsSending(true);
    setErrorMessage("");

    const { error } = await supabase.from("request_messages").insert({
      request_id: requestId,
      sender_role: senderRole,
      sender_id: senderId,
      message: trimmedMessage,
      read_by_admin: senderRole === "admin",
      read_by_client: senderRole === "client",
    });

    if (error) {
      setErrorMessage(error.message);
    } else {
      await loadMessages();
    }

    setIsSending(false);

    return { error };
  };

  return {
    messages,
    isLoading,
    isSending,
    errorMessage,
    sendMessage,
    reloadMessages: loadMessages,
  };
}

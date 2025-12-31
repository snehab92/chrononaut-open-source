// AI conversations encryption module
// Encrypts conversation titles and message content
// Uses master key from .env.local

import { encrypt, decrypt } from './crypto';

/**
 * Encrypt conversation title using master key
 */
export async function encryptConversationTitle(
  title: string
): Promise<string> {
  return encrypt(title);
}

/**
 * Decrypt conversation title using master key
 */
export async function decryptConversationTitle(
  encryptedTitle: string
): Promise<string> {
  return decrypt(encryptedTitle);
}

/**
 * Encrypt message content using master key
 */
export async function encryptMessage(content: string): Promise<string> {
  return encrypt(content);
}

/**
 * Decrypt message content using master key
 */
export async function decryptMessage(
  encryptedContent: string
): Promise<string> {
  return decrypt(encryptedContent);
}

/**
 * Batch decrypt messages for conversation history
 * Used when loading chat history or building AI context
 */
export async function decryptMessages(
  messages: Array<{
    encrypted_content?: string | null;
    content?: string | null;
    is_encrypted?: boolean;
  }>
): Promise<
  Array<{
    content: string;
  }>
> {
  const decryptedMessages = await Promise.all(
    messages.map(async (msg) => {
      // If already decrypted or not encrypted, return as-is
      if (msg.content && !msg.is_encrypted) {
        return { content: msg.content };
      }

      // If encrypted, decrypt it
      if (msg.encrypted_content && msg.is_encrypted) {
        const content = await decrypt(msg.encrypted_content);
        return { content };
      }

      // Fallback: empty content
      return { content: '' };
    })
  );

  return decryptedMessages;
}

/**
 * Batch decrypt conversation titles for list view
 */
export async function decryptConversationTitles(
  conversations: Array<{
    encrypted_title?: string | null;
    title?: string | null;
    is_encrypted?: boolean;
  }>
): Promise<
  Array<{
    title: string;
  }>
> {
  const decryptedConversations = await Promise.all(
    conversations.map(async (conv) => {
      // If already decrypted or not encrypted, return as-is
      if (conv.title && !conv.is_encrypted) {
        return { title: conv.title };
      }

      // If encrypted, decrypt it
      if (conv.encrypted_title && conv.is_encrypted) {
        const title = await decrypt(conv.encrypted_title);
        return { title };
      }

      // Fallback: empty title
      return { title: 'Untitled Conversation' };
    })
  );

  return decryptedConversations;
}

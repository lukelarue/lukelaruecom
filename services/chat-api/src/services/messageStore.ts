import type { Firestore, CollectionReference, QuerySnapshot, DocumentData } from '@google-cloud/firestore';
import { randomUUID } from 'node:crypto';

import type { ChatMessageRecord, ChatMessagePayload, ChannelDescriptor } from '../types/chat.js';
import { buildChannelMetadata, resolveChannelId } from '../utils/channel.js';

const CHAT_COLLECTION = 'chatMessages';

export type MessageStoreDependencies = {
  firestore: Firestore;
};

export interface MessageStoreContract {
  saveMessage(
    descriptor: ChannelDescriptor,
    payload: ChatMessagePayload & { id?: string }
  ): Promise<ChatMessageRecord>;
  fetchRecentMessages(
    descriptor: ChannelDescriptor,
    limit: number
  ): Promise<ChatMessageRecord[]>;
  fetchRecentByChannelId(channelId: string, limit: number): Promise<ChatMessageRecord[]>;
  listChannels(): Promise<string[]>;
}

export class MessageStore implements MessageStoreContract {
  private readonly collection: CollectionReference<DocumentData>;

  constructor(deps: MessageStoreDependencies) {
    this.collection = deps.firestore.collection(CHAT_COLLECTION);
  }

  async saveMessage(descriptor: ChannelDescriptor, payload: ChatMessagePayload & { id?: string }): Promise<ChatMessageRecord> {
    const now = new Date().toISOString();
    const id = payload.id ?? randomUUID();
    const channelId = resolveChannelId(descriptor);
    const record: ChatMessageRecord = {
      ...payload,
      id,
      channelId,
      channelType: descriptor.channelType,
      metadata: {
        ...buildChannelMetadata(descriptor),
        ...(payload.metadata ?? {}),
      },
      createdAt: now,
      updatedAt: now,
    };

    await this.collection.doc(id).set(record);
    return record;
  }

  async fetchRecentMessages(descriptor: ChannelDescriptor, limit: number): Promise<ChatMessageRecord[]> {
    const channelId = resolveChannelId(descriptor);
    const snapshot = await this.collection
      .where('channelId', '==', channelId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    return this.mapSnapshot(snapshot).reverse();
  }

  async fetchRecentByChannelId(channelId: string, limit: number): Promise<ChatMessageRecord[]> {
    const snapshot = await this.collection
      .where('channelId', '==', channelId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    return this.mapSnapshot(snapshot).reverse();
  }

  async listChannels(): Promise<string[]> {
    const snapshot = await this.collection.select('channelId').limit(1000).get();
    const channelIds = new Set<string>();
    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (typeof data.channelId === 'string') {
        channelIds.add(data.channelId);
      }
    });
    return Array.from(channelIds);
  }

  private mapSnapshot(snapshot: QuerySnapshot<DocumentData>): ChatMessageRecord[] {
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        channelId: data.channelId,
        channelType: data.channelType,
        senderId: data.senderId,
        senderDisplayName: data.senderDisplayName,
        body: data.body,
        metadata: data.metadata ?? undefined,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      } satisfies ChatMessageRecord;
    });
  }
}

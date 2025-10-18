import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { describe, expect, it, beforeEach } from 'vitest';

import { createApp } from '../app';
import type { MessageStoreContract } from '../services/messageStore';
import type { ChannelDescriptor, ChatMessageRecord, ChatMessagePayload } from '../types/chat';
import { buildChannelMetadata, resolveChannelId } from '../utils/channel';

class InMemoryMessageStore implements MessageStoreContract {
  private records: ChatMessageRecord[] = [];

  reset() {
    this.records = [];
  }

  async saveMessage(descriptor: ChannelDescriptor, payload: ChatMessagePayload & { id?: string }) {
    const now = new Date().toISOString();
    const id = payload.id ?? randomUUID();
    const channelId = resolveChannelId(descriptor);

    const record: ChatMessageRecord = {
      id,
      channelId,
      channelType: descriptor.channelType,
      senderId: payload.senderId,
      senderDisplayName: payload.senderDisplayName,
      body: payload.body,
      metadata: {
        ...buildChannelMetadata(descriptor),
        ...(payload.metadata ?? {}),
      },
      createdAt: now,
      updatedAt: now,
    };

    this.records.push(record);
    return record;
  }

  async fetchRecentMessages(descriptor: ChannelDescriptor, limit: number) {
    const channelId = resolveChannelId(descriptor);
    return this.records
      .filter((record) => record.channelId === channelId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .slice(-limit);
  }

  async fetchRecentByChannelId(channelId: string, limit: number) {
    return this.records
      .filter((record) => record.channelId === channelId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .slice(-limit);
  }

  async listChannels() {
    return Array.from(new Set(this.records.map((record) => record.channelId)));
  }
}

const messageStore = new InMemoryMessageStore();
const app = createApp({ messageStore });

const authed = (userId = 'user-1', userName = 'User One') => ({
  post: (path: string) => request(app).post(path).set('x-user-id', userId).set('x-user-name', userName),
  get: (path: string) => request(app).get(path).set('x-user-id', userId).set('x-user-name', userName),
});

describe('chatRouter', () => {
  beforeEach(() => {
    messageStore.reset();
  });

  it('stores and returns a global message', async () => {
    const response = await authed()
      .post('/chat/messages')
      .send({
        channelType: 'global',
        body: 'Hello lobby',
      });

    expect(response.status).toBe(201);
    expect(response.body.message.body).toBe('Hello lobby');
    expect(response.body.message.channelId).toBe('global:default');

    const historyResponse = await authed().get('/chat/messages').query({
      channelType: 'global',
      limit: 10,
    });

    expect(historyResponse.status).toBe(200);
    expect(historyResponse.body.messages).toHaveLength(1);
    expect(historyResponse.body.messages[0].body).toBe('Hello lobby');
  });

  it('requires direct channels to include both participants including sender', async () => {
    const response = await authed()
      .post('/chat/messages')
      .send({
        channelType: 'direct',
        participantIds: ['user-2'],
        body: 'Hi friend',
      });

    expect(response.status).toBe(201);
    expect(response.body.message.channelId).toBe('direct:user-1--user-2');

    const listResponse = await authed().get('/chat/channels');
    expect(listResponse.status).toBe(200);
    expect(listResponse.body.channels).toEqual([
      {
        channelId: 'direct:user-1--user-2',
        channelType: 'direct',
        metadata: {
          participantIds: ['user-1', 'user-2'],
        },
      },
    ]);
  });

  it('prevents access to direct channels the user is not a participant of', async () => {
    await authed()
      .post('/chat/messages')
      .send({
        channelType: 'direct',
        participantIds: ['user-2'],
        body: 'Secret',
      });

    const otherUser = authed('user-3', 'User Three');

    const channelsResponse = await otherUser.get('/chat/channels');
    expect(channelsResponse.status).toBe(200);
    expect(channelsResponse.body.channels).toEqual([]);

    const historyResponse = await otherUser.get('/chat/messages').query({
      channelId: 'direct:user-1--user-2',
    });
    expect(historyResponse.status).toBe(400);
    expect(historyResponse.body.message).toContain('You do not have access');
  });

  it('rejects unauthenticated access', async () => {
    const response = await request(app).post('/chat/messages').send({
      channelType: 'global',
      body: 'Hello',
    });

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({ message: 'Missing authentication header' });
  });

  it('validates message payload before sending', async () => {
    const response = await authed()
      .post('/chat/messages')
      .send({
        body: '',
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Invalid request');
  });

  it('returns validation errors when fetching history with bad parameters', async () => {
    const negativeLimit = await authed()
      .get('/chat/messages')
      .query({ channelType: 'global', limit: 0 });
    expect(negativeLimit.status).toBe(400);
    expect(negativeLimit.body.message).toBe('limit must be a positive integer');

    const missingDirectParticipants = await authed()
      .get('/chat/messages')
      .query({ channelType: 'direct' });
    expect(missingDirectParticipants.status).toBe(400);
    expect(missingDirectParticipants.body.message).toBe('participantIds is required for direct channels');

    const missingChannelType = await authed()
      .get('/chat/messages')
      .query({ limit: 5 });
    expect(missingChannelType.status).toBe(400);
    expect(missingChannelType.body.message).toBe('channelType or channelId is required');
  });

  it('propagates descriptor errors through error handler', async () => {
    const response = await authed()
      .post('/chat/messages')
      .send({
        channelType: 'direct',
        participantIds: ['user-1'],
        body: 'Self message',
      });

    expect(response.status).toBe(500);
    expect(response.body).toMatchObject({ message: 'Chat router error' });
    expect(response.body.details).toContain('Direct messages require exactly two distinct participants');
  });

  it('requires gameId when requesting game channel history', async () => {
    const response = await authed()
      .get('/chat/messages')
      .query({ channelType: 'game' });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('gameId is required for game channels');
  });
});

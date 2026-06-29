import { isDemoChatwoot } from './demoData';

const DEMO_INBOXES = [
  { id: 1, name: 'WhatsApp', channel_type: 'Channel::Api' },
  { id: 2, name: 'Instagram DM', channel_type: 'Channel::Instagram' },
  { id: 3, name: 'Messenger', channel_type: 'Channel::FacebookPage' },
];
const DEMO_CONTACTS = [
  { id: 1001, name: 'Camila Rossi', email: 'camila.rossi@gmail.com', phone_number: '+541138472901' },
  { id: 1002, name: 'Joaquín Pereyra', email: 'joaquin.pereyra@gmail.com', phone_number: '+541166210034' },
  { id: 1003, name: 'Martina Gómez', email: 'martina.gomez@gmail.com', phone_number: '+541159381122' },
  { id: 1004, name: 'Lucas Fernández', email: 'lucas.f@gmail.com', phone_number: '+541140290011' },
  { id: 1005, name: 'Sofía Acuña', email: 'sofia.acuna@gmail.com', phone_number: '+541139023488' },
];
const DEMO_MESSAGES = [
  'Hola! Quiero saber si tienen el buzo en M',
  'Cuánto sale el envío a Córdoba?',
  'Aceptan transferencia?',
  'Hace cuánto envían?',
  'Tienen showroom?',
  'Pueden cambiar el talle si no me queda?',
];
const buildDemoConversations = (status: string) => {
  const now = Date.now();
  return DEMO_CONTACTS.map((c, i) => {
    const inbox = DEMO_INBOXES[i % DEMO_INBOXES.length];
    return {
      id: 7000 + i,
      status: status === 'all' ? (i % 3 === 0 ? 'resolved' : 'open') : status,
      inbox_id: inbox.id,
      inbox,
      contact: c,
      contact_inbox: { contact: c },
      meta: { sender: c, channel: inbox.channel_type, assignee: null },
      messages: [{
        id: 8000 + i, content: DEMO_MESSAGES[i % DEMO_MESSAGES.length],
        message_type: 0, created_at: Math.floor((now - i * 3600 * 1000) / 1000),
        sender: c, content_type: 'text',
      }],
      last_non_activity_message: { content: DEMO_MESSAGES[i % DEMO_MESSAGES.length], created_at: Math.floor((now - i * 3600 * 1000) / 1000) },
      timestamp: Math.floor((now - i * 3600 * 1000) / 1000),
      unread_count: i % 2 === 0 ? 1 : 0,
      assignee: null, channel: inbox.channel_type,
      created_at: Math.floor((now - i * 86400 * 1000) / 1000),
      updated_at: Math.floor((now - i * 3600 * 1000) / 1000),
    };
  });
};

const proxy = async (chatwoot_url: string, chatwoot_token: string, path: string, body?: any, method?: string) => {
  const res = await fetch('/api/scrape-website', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chatwoot_url, chatwoot_token, path, ...(body !== undefined ? { body } : {}), ...(method ? { method } : {}) }),
  });
  const text = await res.text().catch(() => '{}');
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(data?.message || data?.error || `Chatwoot ${res.status}`);
  return data;
};

let cachedProfile: Record<string, { account_id: number; pubsub_token: string }> = {};

export const chatwoot = {
  async getProfile(url: string, token: string) {
    if (isDemoChatwoot(token)) return { account_id: 1, pubsub_token: 'demo_pubsub' };
    const key = `${url}:${token}`;
    if (cachedProfile[key]) return cachedProfile[key];
    const data = await proxy(url, token, '/api/v1/profile');
    if (!data?.account_id) throw new Error('No se pudo obtener el perfil de Chatwoot');
    cachedProfile[key] = { account_id: data.account_id, pubsub_token: data.pubsub_token };
    return cachedProfile[key];
  },

  async getAccountId(url: string, token: string): Promise<number> {
    if (isDemoChatwoot(token)) return 1;
    return (await chatwoot.getProfile(url, token)).account_id;
  },

  async getConversationsPage(url: string, token: string, status = 'open', page = 1, inboxId?: number) {
    if (isDemoChatwoot(token)) {
      const all = buildDemoConversations(status).filter(c => inboxId === undefined || c.inbox_id === inboxId);
      const items = page === 1 ? all : [];
      return { payload: items, hasMore: false, meta: { all_count: all.length, mine_count: 0, unassigned_count: all.filter(c => !c.assignee).length, assigned_count: 0 } };
    }
    const accountId = await chatwoot.getAccountId(url, token);
    let path = `/api/v1/accounts/${accountId}/conversations?status=${status}&page=${page}&assignee_type=all`;
    if (inboxId !== undefined) {
      path += `&inbox_id=${inboxId}`;
    }
    const data = await proxy(url, token, path);
    const payload = data?.data?.payload || data?.payload || [];
    const meta = data?.data?.meta || data?.meta || {};
    return { payload, hasMore: payload.length === 25, meta };
  },

  async getConversations(url: string, token: string, status = 'open') {
    const { payload } = await chatwoot.getConversationsPage(url, token, status, 1);
    return payload;
  },

  async getSummary(url: string, token: string, since: number, until: number) {
    if (isDemoChatwoot(token)) return { conversations_count: 124, incoming_messages_count: 432, outgoing_messages_count: 412, avg_first_response_time: 540, avg_resolution_time: 3200, resolutions_count: 98, previous: { conversations_count: 102 } };
    const accountId = await chatwoot.getAccountId(url, token);
    return proxy(url, token, `/api/v1/accounts/${accountId}/reports/summary?since=${since}&until=${until}`);
  },

  async getConversationsMeta(url: string, token: string, status = 'open', inboxId?: number) {
    if (isDemoChatwoot(token)) {
      const all = buildDemoConversations(status).filter(c => inboxId === undefined || c.inbox_id === inboxId);
      return { meta: { all_count: all.length, mine_count: 0, unassigned_count: all.length, assigned_count: 0 } };
    }
    const accountId = await chatwoot.getAccountId(url, token);
    let path = `/api/v1/accounts/${accountId}/conversations/meta?status=${status}`;
    if (inboxId !== undefined) {
      path += `&inbox_id=${inboxId}`;
    }
    return proxy(url, token, path);
  },

  async getAgents(url: string, token: string) {
    if (isDemoChatwoot(token)) return [{ id: 1, name: 'Luca Demo', email: 'demo@car.app', availability_status: 'online', confirmed: true }];
    const accountId = await chatwoot.getAccountId(url, token);
    const data = await proxy(url, token, `/api/v1/accounts/${accountId}/agents`);
    return Array.isArray(data) ? data : (data?.payload || data?.data || []);
  },

  async getReportsSummary(url: string, token: string, since: number, until: number, type = 'account', id?: number) {
    if (isDemoChatwoot(token)) {
      const days = Math.max(1, Math.round((until - since) / 86400));
      return {
        conversations_count: 8 * days + 12,
        incoming_messages_count: 22 * days + 30,
        outgoing_messages_count: 19 * days + 24,
        avg_first_response_time: 540 + (id || 0) * 10,
        avg_resolution_time: 3200,
        resolutions_count: 6 * days,
        previous: { conversations_count: Math.floor((8 * days + 12) * 0.92) },
      };
    }
    const accountId = await chatwoot.getAccountId(url, token);
    let path = `/api/v2/accounts/${accountId}/reports/summary?since=${since}&until=${until}&type=${type}`;
    if (id !== undefined) {
      path += `&id=${id}`;
    }
    return proxy(url, token, path);
  },

  async getReportsTimeSeries(url: string, token: string, metric: string, since: number, until: number, type = 'account', id?: number) {
    if (isDemoChatwoot(token)) {
      const out: any[] = [];
      const dayMs = 86400;
      const baseByMetric: Record<string, number> = {
        conversations_count: 8,
        incoming_messages_count: 22,
        outgoing_messages_count: 19,
        avg_first_response_time: 540,
        avg_resolution_time: 3200,
        resolutions_count: 6,
      };
      const base = baseByMetric[metric] || 5;
      let cur = since;
      let i = 0;
      while (cur <= until && i++ < 200) {
        const wobble = ((i * 37) % 11) - 5;
        out.push({ value: Math.max(0, base + wobble), timestamp: cur });
        cur += dayMs;
      }
      return out;
    }
    const accountId = await chatwoot.getAccountId(url, token);
    let path = `/api/v2/accounts/${accountId}/reports?metric=${metric}&since=${since}&until=${until}&type=${type}`;
    if (id !== undefined) {
      path += `&id=${id}`;
    }
    return proxy(url, token, path);
  },

  async getHeatmapData(url: string, token: string, since: number, until: number, inboxId?: string) {
    if (isDemoChatwoot(token)) {
      const out: any[] = [];
      const dayMs = 86400;
      let cur = since;
      let i = 0;
      while (cur <= until && i++ < 30) {
        for (let h = 0; h < 24; h++) {
          // higher activity 9-13 and 18-22
          const intensity = (h >= 9 && h <= 13) ? 14 : (h >= 18 && h <= 22) ? 16 : (h < 7 ? 1 : 4);
          out.push({ value: intensity + ((i + h) % 5), timestamp: cur + h * 3600 });
        }
        cur += dayMs;
      }
      return out;
    }
    const accountId = await chatwoot.getAccountId(url, token);
    const inboxParam = inboxId && inboxId !== 'all' ? `&type=inbox&id=${inboxId}` : '&type=account';
    const path = `/api/v2/accounts/${accountId}/reports?metric=conversations_count&since=${since}&until=${until}${inboxParam}&group_by=hour`;
    return proxy(url, token, path);
  },

  async getMessages(url: string, token: string, conversationId: number, before?: number) {
    if (isDemoChatwoot(token)) {
      const idx = (conversationId - 7000) % DEMO_CONTACTS.length;
      const c = DEMO_CONTACTS[idx];
      const now = Math.floor(Date.now() / 1000);
      return [
        { id: 9001, content: DEMO_MESSAGES[idx % DEMO_MESSAGES.length], message_type: 0, created_at: now - 3600, sender: c, content_type: 'text' },
        { id: 9002, content: '¡Hola! Te confirmo enseguida 🙌', message_type: 1, created_at: now - 3500, sender: { id: 1, name: 'Luca Demo', email: 'demo@car.app' }, content_type: 'text' },
        { id: 9003, content: 'Gracias!', message_type: 0, created_at: now - 3400, sender: c, content_type: 'text' },
      ];
    }
    const accountId = await chatwoot.getAccountId(url, token);
    const qs = before ? `?before=${before}` : '';
    const data = await proxy(url, token, `/api/v1/accounts/${accountId}/conversations/${conversationId}/messages${qs}`);
    return data?.payload || [];
  },

  async sendMessage(url: string, token: string, conversationId: number, content: string) {
    if (isDemoChatwoot(token)) {
      return {
        id: Date.now(),
        conversation_id: conversationId,
        content,
        message_type: 1,
        created_at: Math.floor(Date.now() / 1000),
        sender: { id: 1, name: 'Luca Demo', email: 'demo@car.app' },
        content_type: 'text',
      };
    }
    const accountId = await chatwoot.getAccountId(url, token);
    return proxy(url, token, `/api/v1/accounts/${accountId}/conversations/${conversationId}/messages`, {
      content,
      message_type: 'outgoing',
      content_type: 'text',
    }, 'POST');
  },

  // PATCH status: open | resolved | pending | snoozed
  async updateStatus(url: string, token: string, conversationId: number, status: string, extra?: object) {
    if (isDemoChatwoot(token)) return { id: conversationId, status, ...extra };
    const accountId = await chatwoot.getAccountId(url, token);
    return proxy(url, token, `/api/v1/accounts/${accountId}/conversations/${conversationId}`, { status, ...extra }, 'PATCH');
  },

  // PATCH priority: urgent | high | medium | low | none
  async updatePriority(url: string, token: string, conversationId: number, priority: string) {
    if (isDemoChatwoot(token)) return { id: conversationId, priority };
    const accountId = await chatwoot.getAccountId(url, token);
    return proxy(url, token, `/api/v1/accounts/${accountId}/conversations/${conversationId}`, { priority }, 'PATCH');
  },

  async markAsUnread(url: string, token: string, conversationId: number) {
    if (isDemoChatwoot(token)) return { id: conversationId, unread_count: 1 };
    const accountId = await chatwoot.getAccountId(url, token);
    return proxy(url, token, `/api/v1/accounts/${accountId}/conversations/${conversationId}/unread`, {}, 'POST').catch(() => null);
  },

  // Mark conversation as read — tries update_last_seen (v3+), falls back to /read (v2)
  async markAsRead(url: string, token: string, conversationId: number) {
    if (isDemoChatwoot(token)) return { id: conversationId, unread_count: 0 };
    const accountId = await chatwoot.getAccountId(url, token);
    const agentLastSeenAt = Math.floor(Date.now() / 1000);
    try {
      return await proxy(url, token, `/api/v1/accounts/${accountId}/conversations/${conversationId}/update_last_seen`, { agent_last_seen_at: agentLastSeenAt }, 'POST');
    } catch {
      // Fallback to legacy /read endpoint
      return proxy(url, token, `/api/v1/accounts/${accountId}/conversations/${conversationId}/read`, {}, 'POST').catch(() => null);
    }
  },

  // POST labels
  async assignLabel(url: string, token: string, conversationId: number, labels: string[]) {
    if (isDemoChatwoot(token)) return { id: conversationId, labels };
    const accountId = await chatwoot.getAccountId(url, token);
    return proxy(url, token, `/api/v1/accounts/${accountId}/conversations/${conversationId}/labels`, { labels });
  },

  // DELETE conversation
  async deleteConversation(url: string, token: string, conversationId: number) {
    if (isDemoChatwoot(token)) return { id: conversationId, deleted: true };
    const accountId = await chatwoot.getAccountId(url, token);
    return proxy(url, token, `/api/v1/accounts/${accountId}/conversations/${conversationId}`, undefined, 'DELETE');
  },

  // GET inboxes
  async getInboxes(url: string, token: string) {
    if (isDemoChatwoot(token)) return DEMO_INBOXES;
    const accountId = await chatwoot.getAccountId(url, token);
    const data = await proxy(url, token, `/api/v1/accounts/${accountId}/inboxes`);
    return Array.isArray(data) ? data : (data?.payload || data?.data || []);
  },

  // POST inbox
  async createInbox(url: string, token: string, payload: any) {
    if (isDemoChatwoot(token)) return { id: Date.now(), ...payload };
    const accountId = await chatwoot.getAccountId(url, token);
    const data = await proxy(url, token, `/api/v1/accounts/${accountId}/inboxes`, payload, 'POST');
    return data?.payload || data;
  },

  // DELETE inbox
  async deleteInbox(url: string, token: string, inboxId: number) {
    if (isDemoChatwoot(token)) return { id: inboxId, deleted: true };
    const accountId = await chatwoot.getAccountId(url, token);
    return proxy(url, token, `/api/v1/accounts/${accountId}/inboxes/${inboxId}`, undefined, 'DELETE');
  },

  // GET contacts
  async getContacts(url: string, token: string, page = 1) {
    if (isDemoChatwoot(token)) return { payload: DEMO_CONTACTS, meta: { count: DEMO_CONTACTS.length, current_page: page } };
    const accountId = await chatwoot.getAccountId(url, token);
    const data = await proxy(url, token, `/api/v1/accounts/${accountId}/contacts?page=${page}`);
    return data || {};
  },

  // GET search contacts
  async searchContacts(url: string, token: string, query: string, page = 1) {
    if (isDemoChatwoot(token)) {
      const q = query.toLowerCase();
      return { payload: DEMO_CONTACTS.filter(c => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)), meta: { current_page: page } };
    }
    const accountId = await chatwoot.getAccountId(url, token);
    const data = await proxy(url, token, `/api/v1/accounts/${accountId}/contacts/search?q=${encodeURIComponent(query)}&page=${page}`);
    return data || {};
  },

  // GET contact conversations
  async getContactConversations(url: string, token: string, contactId: number) {
    if (isDemoChatwoot(token)) return buildDemoConversations('all').filter(c => c.contact.id === contactId);
    const accountId = await chatwoot.getAccountId(url, token);
    const data = await proxy(url, token, `/api/v1/accounts/${accountId}/contacts/${contactId}/conversations`);
    return data?.payload || data || [];
  },

  // PUT contact update
  async updateContact(url: string, token: string, contactId: number, payload: any) {
    if (isDemoChatwoot(token)) return { id: contactId, ...payload };
    const accountId = await chatwoot.getAccountId(url, token);
    return proxy(url, token, `/api/v1/accounts/${accountId}/contacts/${contactId}`, payload, 'PUT');
  },
};

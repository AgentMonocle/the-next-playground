import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMsal } from '@azure/msal-react';
import { getGraphClient } from '@/lib/graph/graphClient';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface EmailMessage {
  id: string;
  subject: string;
  bodyPreview: string;
  body?: { contentType: string; content: string };
  receivedDateTime: string;
  sentDateTime?: string;
  isRead: boolean;
  hasAttachments: boolean;
  isDraft: boolean;
  conversationId: string;
  sender: {
    emailAddress: { name: string; address: string };
  };
  from: {
    emailAddress: { name: string; address: string };
  };
  toRecipients: Array<{
    emailAddress: { name: string; address: string };
  }>;
}

export interface CalendarEvent {
  id: string;
  subject: string;
  bodyPreview: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  location?: { displayName: string };
  attendees: Array<{
    emailAddress: { name: string; address: string };
    status: { response: string };
    type: string;
  }>;
  isOnlineMeeting: boolean;
  onlineMeetingUrl?: string;
}

// ─── Query Keys ─────────────────────────────────────────────────────────────

export const emailKeys = {
  all: ['emails'] as const,
  contact: (email: string) => [...emailKeys.all, 'contact', email] as const,
};

export const calendarKeys = {
  all: ['calendar'] as const,
  range: (start: string, end: string) => [...calendarKeys.all, start, end] as const,
};

// ─── Email Hooks ────────────────────────────────────────────────────────────

/**
 * Fetch email correspondence with a specific contact.
 *
 * Makes two parallel requests (from contact + to contact) and merges results
 * because Graph API doesn't support OR filters with any() in a single query.
 */
export function useContactEmails(contactEmail: string | undefined) {
  const { instance } = useMsal();

  return useQuery({
    queryKey: emailKeys.contact(contactEmail!),
    queryFn: async () => {
      const client = getGraphClient(instance);

      const select = 'id,subject,bodyPreview,receivedDateTime,sentDateTime,isRead,hasAttachments,isDraft,conversationId,sender,from,toRecipients';

      // Fetch emails FROM the contact (received)
      const fromPromise = client
        .api('/me/messages')
        .filter(`from/emailAddress/address eq '${contactEmail}'`)
        .select(select)
        .orderby('receivedDateTime desc')
        .top(50)
        .get()
        .catch(() => ({ value: [] }));

      // Fetch emails TO the contact (sent by me)
      const toPromise = client
        .api('/me/messages')
        .filter(`toRecipients/any(r: r/emailAddress/address eq '${contactEmail}')`)
        .select(select)
        .orderby('receivedDateTime desc')
        .top(50)
        .get()
        .catch(() => ({ value: [] }));

      const [fromResult, toResult] = await Promise.all([fromPromise, toPromise]);

      // Merge and deduplicate by id, sort by date
      const emailMap = new Map<string, EmailMessage>();
      for (const email of [...(fromResult.value as EmailMessage[]), ...(toResult.value as EmailMessage[])]) {
        emailMap.set(email.id, email);
      }

      return Array.from(emailMap.values()).sort(
        (a, b) => new Date(b.receivedDateTime).getTime() - new Date(a.receivedDateTime).getTime()
      );
    },
    enabled: !!contactEmail,
    staleTime: 2 * 60 * 1000, // 2 minutes — email is more dynamic
  });
}

/**
 * Send an email via Graph API.
 */
export function useSendEmail() {
  const { instance } = useMsal();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      to,
      subject,
      body,
      contentType = 'text',
    }: {
      to: string;
      subject: string;
      body: string;
      contentType?: 'text' | 'html';
    }) => {
      const client = getGraphClient(instance);

      await client.api('/me/sendMail').post({
        message: {
          subject,
          body: { contentType, content: body },
          toRecipients: [{ emailAddress: { address: to } }],
        },
      });
    },
    onSuccess: () => {
      // Invalidate all email queries so the sent email shows up
      queryClient.invalidateQueries({ queryKey: emailKeys.all });
    },
  });
}

// ─── Calendar Hooks ─────────────────────────────────────────────────────────

/**
 * Fetch calendar events for a date range.
 */
export function useCalendarEvents(startDate: string, endDate: string) {
  const { instance } = useMsal();

  return useQuery({
    queryKey: calendarKeys.range(startDate, endDate),
    queryFn: async () => {
      const client = getGraphClient(instance);

      const response = await client
        .api('/me/calendarView')
        .query({
          startDateTime: startDate,
          endDateTime: endDate,
        })
        .select('id,subject,bodyPreview,start,end,location,attendees,isOnlineMeeting,onlineMeetingUrl')
        .orderby('start/dateTime')
        .top(100)
        .get();

      return response.value as CalendarEvent[];
    },
    enabled: !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

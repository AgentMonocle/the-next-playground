import { Client } from '@microsoft/microsoft-graph-client';

export class GraphService {
  private client: Client;

  constructor(accessToken: string) {
    this.client = Client.init({
      authProvider: (done) => {
        done(null, accessToken);
      },
    });
  }

  // ============================================================================
  // User Profile
  // ============================================================================

  async getUser() {
    return this.client.api('/me').get();
  }

  // ============================================================================
  // SharePoint Sites & Lists
  // ============================================================================

  /**
   * Get site by URL path
   * @param siteUrl - Format: "tenant.sharepoint.com:/sites/sitename"
   */
  async getSiteByUrl(siteUrl: string) {
    return this.client.api(`/sites/${siteUrl}`).get();
  }

  /**
   * Get all lists in a site
   */
  async getLists(siteId: string) {
    return this.client.api(`/sites/${siteId}/lists`).get();
  }

  /**
   * Get list by name
   */
  async getListByName(siteId: string, listName: string) {
    return this.client.api(`/sites/${siteId}/lists/${listName}`).get();
  }

  /**
   * Get all items from a list
   */
  async getListItems(siteId: string, listId: string, expand?: string) {
    let request = this.client.api(`/sites/${siteId}/lists/${listId}/items`);

    if (expand) {
      request = request.expand(expand);
    } else {
      request = request.expand('fields');
    }

    return request.get();
  }

  /**
   * Get a single list item
   */
  async getListItem(siteId: string, listId: string, itemId: string) {
    return this.client
      .api(`/sites/${siteId}/lists/${listId}/items/${itemId}`)
      .expand('fields')
      .get();
  }

  /**
   * Create a new list item
   */
  async createListItem(siteId: string, listId: string, fields: Record<string, unknown>) {
    return this.client
      .api(`/sites/${siteId}/lists/${listId}/items`)
      .post({ fields });
  }

  /**
   * Update a list item
   */
  async updateListItem(siteId: string, listId: string, itemId: string, fields: Record<string, unknown>) {
    return this.client
      .api(`/sites/${siteId}/lists/${listId}/items/${itemId}/fields`)
      .patch(fields);
  }

  /**
   * Delete a list item
   */
  async deleteListItem(siteId: string, listId: string, itemId: string) {
    return this.client
      .api(`/sites/${siteId}/lists/${listId}/items/${itemId}`)
      .delete();
  }

  /**
   * Create a new list in a site
   */
  async createList(siteId: string, displayName: string, columns: Array<{ name: string; type: string; [key: string]: unknown }>) {
    const listDefinition = {
      displayName,
      columns,
      list: {
        template: 'genericList',
      },
    };

    return this.client
      .api(`/sites/${siteId}/lists`)
      .post(listDefinition);
  }

  // ============================================================================
  // Outlook Email
  // ============================================================================

  /**
   * Get emails with optional filter
   */
  async getEmails(filter?: string, top = 50) {
    let request = this.client
      .api('/me/messages')
      .top(top)
      .orderby('receivedDateTime desc');

    if (filter) {
      request = request.filter(filter);
    }

    return request.get();
  }

  /**
   * Get emails for a specific contact
   */
  async getEmailsForContact(email: string, top = 20) {
    const filter = `from/emailAddress/address eq '${email}' or toRecipients/any(r: r/emailAddress/address eq '${email}')`;
    return this.getEmails(filter, top);
  }

  /**
   * Send an email
   */
  async sendEmail(to: string, subject: string, body: string, isHtml = true) {
    const message = {
      message: {
        subject,
        body: {
          contentType: isHtml ? 'HTML' : 'Text',
          content: body,
        },
        toRecipients: [
          {
            emailAddress: {
              address: to,
            },
          },
        ],
      },
    };

    return this.client.api('/me/sendMail').post(message);
  }

  // ============================================================================
  // Outlook Calendar
  // ============================================================================

  /**
   * Get calendar events
   */
  async getCalendarEvents(startDateTime?: string, endDateTime?: string) {
    let request = this.client
      .api('/me/events')
      .orderby('start/dateTime');

    if (startDateTime && endDateTime) {
      request = request.filter(`start/dateTime ge '${startDateTime}' and end/dateTime le '${endDateTime}'`);
    }

    return request.get();
  }

  /**
   * Create a calendar event
   */
  async createCalendarEvent(event: {
    subject: string;
    start: string;
    end: string;
    attendees?: string[];
    body?: string;
    location?: string;
  }) {
    const calendarEvent = {
      subject: event.subject,
      start: {
        dateTime: event.start,
        timeZone: 'UTC',
      },
      end: {
        dateTime: event.end,
        timeZone: 'UTC',
      },
      attendees: event.attendees?.map((email) => ({
        emailAddress: { address: email },
        type: 'required',
      })),
      body: event.body
        ? {
            contentType: 'HTML',
            content: event.body,
          }
        : undefined,
      location: event.location
        ? {
            displayName: event.location,
          }
        : undefined,
    };

    return this.client.api('/me/events').post(calendarEvent);
  }

  // ============================================================================
  // OneDrive Files
  // ============================================================================

  /**
   * Get files from OneDrive
   */
  async getFiles(path = '/') {
    const endpoint = path === '/' ? '/me/drive/root/children' : `/me/drive/root:${path}:/children`;
    return this.client.api(endpoint).get();
  }

  /**
   * Get file metadata
   */
  async getFile(itemId: string) {
    return this.client.api(`/me/drive/items/${itemId}`).get();
  }

  /**
   * Get sharing link for a file
   */
  async getFileShareLink(itemId: string) {
    return this.client
      .api(`/me/drive/items/${itemId}/createLink`)
      .post({ type: 'view', scope: 'organization' });
  }
}

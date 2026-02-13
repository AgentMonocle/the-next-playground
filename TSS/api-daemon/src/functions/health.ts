import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions';

export async function health(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log('Health check requested');

  return {
    status: 200,
    jsonBody: {
      status: 'ok',
      service: 'tss-daemon-func',
      timestamp: new Date().toISOString(),
      version: '0.1.0',
    },
  };
}

app.http('health', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'health',
  handler: health,
});

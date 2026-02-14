import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/** MSW server singleton for test environment */
export const server = setupServer(...handlers);

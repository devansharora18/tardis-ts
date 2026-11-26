export {
  WebHost,
  createWebHost,
  installWebHost,
  getWebHost,
} from './dom'
export type { WebHostOptions } from './dom'

import { installWebHost } from './dom'

// Side-effect entry: importing `@devansharora18/tardisjs/web` boots the DOM
// host in a browser. In QuickJS there is no `document`, so this is a no-op and
// the native host keeps `__tardis_flush`.
if (typeof document !== 'undefined') installWebHost()

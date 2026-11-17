// Entry shim for hosts that expect the app's start file at the project root.
// Hostinger's Web App detection guesses `server.js` for an Express repository,
// so this file exists to make that guess correct. The real server (static build
// + JSON API + session auth) is server/index.js.
import './server/index.js'

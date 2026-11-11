// Vercel Serverless Function wrapper
// This file allows using the "functions" config for maxDuration
// while routing all traffic to the main Express app
const app = require('../server-complete');
module.exports = app;

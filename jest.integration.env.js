// Stands in for Expo's build-time environment module, which is an ES module Node cannot
// require. The integration tests set these variables themselves (see the setup file).
module.exports = { env: process.env };

// Stands in for native modules the integration tests cannot or need not run in plain Node:
// react-native-get-random-values (Node has crypto.getRandomValues built in) and
// expo-image-manipulator (the tests that store photos replace the code that calls it).
module.exports = {};

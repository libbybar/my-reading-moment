export default async function globalTeardown() {
  await global.__MONGO_INSTANCE__.stop();
}

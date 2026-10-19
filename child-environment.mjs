// Native resources are inherited; the caller's board lease is not child authority.
export function childEnvironment(env = process.env, metadata = {}) {
  const { WORK, WORK_TOKEN, PI_DURABLE_ATTEMPT, PI_DURABLE_CHECKIN, PI_DURABLE_PROGRESS, PI_DURABLE_NESTED, PI_DURABLE_CHANNEL, PI_DURABLE_NODE, ...ordinary } = env;
  return { ...ordinary, ...metadata };
}

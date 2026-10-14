// Native resources are inherited; the caller's board lease is not child authority.
export function childEnvironment(env = process.env, metadata = {}) {
  const { WORK, WORK_TOKEN, ...ordinary } = env;
  return { ...ordinary, ...metadata };
}

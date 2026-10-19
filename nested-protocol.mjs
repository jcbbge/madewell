// Parent-side adapter only. The store owns sender identity, intake, counted answers,
// execution, return intake, human holds, and retry/deduplication in Pi Durable.
export function bindNestedDispatch(store, workId, parentCallId, callbacks = {}) {
  if (typeof store?.nestedDispatch !== 'function') throw new TypeError('A core nestedDispatch API is required');
  if (!parentCallId) throw new TypeError('A running parent call is required');
  return request => {
    const { requestId, receiver, brief, access = 'read' } = request ?? {};
    if (typeof requestId !== 'string' || !requestId.trim() || typeof brief !== 'string' || !brief.trim()
      || !receiver?.actor || !receiver?.job || !receiver?.card) throw new TypeError('Nested request needs a stable ID, receiver/card and fixed brief');
    if (!['read', 'checks', 'make', 'run'].includes(access)) throw new TypeError('Unknown nested access');
    // Never forward caller-supplied sender/work/parent fields. Core derives the
    // actual sender from this bound, running call and refuses mismatched retries.
    return store.nestedDispatch(workId, { requestId, parentCallId, receiver, brief, access }, callbacks);
  };
}

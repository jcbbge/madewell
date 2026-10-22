#!/usr/bin/env node
var __defProp = Object.defineProperty;
var __export = (target, all4) => {
  for (var name in all4)
    __defProp(target, name, { get: all4[name], enumerable: true });
};

// src/cli.ts
import { existsSync as existsSync3, readdirSync as readdirSync3, readFileSync as readFileSync7, rmSync as rmSync6, statSync as statSync2, writeFileSync as writeFileSync7 } from "node:fs";
import { constants as osConstants } from "node:os";
import { basename, dirname as dirname6, join as join9, resolve as resolve6 } from "node:path";
import { parseArgs } from "node:util";

// node_modules/effect/dist/Pipeable.js
var pipeArguments = (self, args2) => {
  switch (args2.length) {
    case 0:
      return self;
    case 1:
      return args2[0](self);
    case 2:
      return args2[1](args2[0](self));
    case 3:
      return args2[2](args2[1](args2[0](self)));
    case 4:
      return args2[3](args2[2](args2[1](args2[0](self))));
    case 5:
      return args2[4](args2[3](args2[2](args2[1](args2[0](self)))));
    case 6:
      return args2[5](args2[4](args2[3](args2[2](args2[1](args2[0](self))))));
    case 7:
      return args2[6](args2[5](args2[4](args2[3](args2[2](args2[1](args2[0](self)))))));
    case 8:
      return args2[7](args2[6](args2[5](args2[4](args2[3](args2[2](args2[1](args2[0](self))))))));
    case 9:
      return args2[8](args2[7](args2[6](args2[5](args2[4](args2[3](args2[2](args2[1](args2[0](self)))))))));
    default: {
      let ret = self;
      for (let i = 0, len = args2.length; i < len; i++) {
        ret = args2[i](ret);
      }
      return ret;
    }
  }
};
var Prototype = {
  pipe() {
    return pipeArguments(this, arguments);
  }
};
var Class = /* @__PURE__ */ (function() {
  function PipeableBase() {
  }
  PipeableBase.prototype = Prototype;
  return PipeableBase;
})();

// node_modules/effect/dist/Function.js
var dual = function(arity, body) {
  if (typeof arity === "function") {
    return function() {
      return arity(arguments) ? body.apply(this, arguments) : (self) => body(self, ...arguments);
    };
  }
  switch (arity) {
    case 0:
    case 1:
      throw new RangeError(`Invalid arity ${arity}`);
    case 2:
      return function(a, b) {
        if (arguments.length >= 2) {
          return body(a, b);
        }
        return function(self) {
          return body(self, a);
        };
      };
    case 3:
      return function(a, b, c) {
        if (arguments.length >= 3) {
          return body(a, b, c);
        }
        return function(self) {
          return body(self, a, b);
        };
      };
    default:
      return function() {
        if (arguments.length >= arity) {
          return body.apply(this, arguments);
        }
        const args2 = arguments;
        return function(self) {
          return body(self, ...args2);
        };
      };
  }
};
var identity = (a) => a;
var constant = (value3) => () => value3;
var constTrue = /* @__PURE__ */ constant(true);
var constFalse = /* @__PURE__ */ constant(false);
var constNull = /* @__PURE__ */ constant(null);
var constUndefined = /* @__PURE__ */ constant(void 0);
var constVoid = constUndefined;
function pipe(a, ...args2) {
  return pipeArguments(a, args2);
}
function memoize(f) {
  const cache2 = /* @__PURE__ */ new WeakMap();
  return (a) => {
    const cached3 = cache2.get(a);
    if (cached3 !== void 0) return cached3;
    const result3 = f(a);
    cache2.set(a, result3);
    return result3;
  };
}
function memoizeIdempotent(f) {
  const cache2 = /* @__PURE__ */ new WeakMap();
  return (a) => {
    const cached3 = cache2.get(a);
    if (cached3 !== void 0) return cached3;
    const result3 = f(a);
    cache2.set(a, result3);
    if (result3 !== a) {
      cache2.set(result3, result3);
    }
    return result3;
  };
}

// node_modules/effect/dist/Context.js
var Context_exports = {};
__export(Context_exports, {
  Reference: () => Reference,
  Service: () => Service,
  ServiceTypeId: () => ServiceTypeId,
  add: () => add,
  addOrOmit: () => addOrOmit,
  addUnsafe: () => addUnsafe,
  empty: () => empty,
  get: () => get,
  getOption: () => getOption,
  getOrElse: () => getOrElse2,
  getOrUndefined: () => getOrUndefined2,
  getOrUndefinedUnsafe: () => getOrUndefinedUnsafe,
  getUnsafe: () => getUnsafe,
  hasSameCache: () => hasSameCache,
  isContext: () => isContext,
  isKey: () => isKey,
  isReference: () => isReference,
  make: () => make3,
  makeUnsafe: () => makeUnsafe,
  merge: () => merge,
  mergeAll: () => mergeAll,
  omit: () => omit,
  pick: () => pick
});

// node_modules/effect/dist/internal/equal.js
var getAllObjectKeys = (obj) => {
  const keys3 = new Set(Reflect.ownKeys(obj));
  if (obj.constructor === Object) return keys3;
  if (obj instanceof Error) {
    keys3.delete("stack");
  }
  const proto = Object.getPrototypeOf(obj);
  let current = proto;
  while (current !== null && current !== Object.prototype) {
    const ownKeys = Reflect.ownKeys(current);
    for (let i = 0; i < ownKeys.length; i++) {
      keys3.add(ownKeys[i]);
    }
    current = Object.getPrototypeOf(current);
  }
  if (keys3.has("constructor") && typeof obj.constructor === "function" && proto === obj.constructor.prototype) {
    keys3.delete("constructor");
  }
  return keys3;
};
var byReferenceInstances = /* @__PURE__ */ new WeakSet();
var viewBytes = (view2) => new Uint8Array(view2.buffer, view2.byteOffset, view2.byteLength);

// node_modules/effect/dist/internal/hash.js
var backEdges = 0;
var addBackEdge = () => {
  backEdges++;
};

// node_modules/effect/dist/Predicate.js
function isString(input) {
  return typeof input === "string";
}
function isNumber(input) {
  return typeof input === "number";
}
function isBoolean(input) {
  return typeof input === "boolean";
}
function isBigInt(input) {
  return typeof input === "bigint";
}
function isSymbol(input) {
  return typeof input === "symbol";
}
function isPropertyKey(u) {
  return isString(u) || isNumber(u) || isSymbol(u);
}
function isFunction(input) {
  return typeof input === "function";
}
function isUndefined(input) {
  return input === void 0;
}
function isNotUndefined(input) {
  return input !== void 0;
}
function isNotNullish(input) {
  return input != null;
}
function isNever(_) {
  return false;
}
function isUnknown(_) {
  return true;
}
function isObject(input) {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}
function isObjectKeyword(input) {
  return typeof input === "object" && input !== null || isFunction(input);
}
var hasProperty = /* @__PURE__ */ dual(2, (self, property) => isObjectKeyword(self) && property in self);
var isTagged = /* @__PURE__ */ dual(2, (self, tag2) => hasProperty(self, "_tag") && self["_tag"] === tag2);
function isError(input) {
  return input instanceof Error;
}
function isIterable(input) {
  return hasProperty(input, Symbol.iterator) || isString(input);
}

// node_modules/effect/dist/Hash.js
var symbol = "~effect/Hash";
var hash = (self) => {
  switch (typeof self) {
    case "number":
      return number(self);
    case "bigint":
      return string(self.toString(10));
    case "string":
      return string(self);
    case "function":
    case "object": {
      if (self === null) {
        break;
      } else if (self instanceof Date) {
        if (Number.isNaN(self.getTime())) {
          return string("Invalid Date");
        }
        return string(self.toISOString());
      } else if (self instanceof RegExp) {
        return string(self.toString());
      } else {
        if (byReferenceInstances.has(self)) {
          return random(self);
        }
        const cached3 = hashCache.get(self);
        if (cached3 !== void 0) {
          return cached3;
        }
        if (visitedObjects.has(self)) {
          addBackEdge();
          return string("[Circular]");
        }
        visitedObjects.add(self);
        const seen = backEdges;
        let h;
        try {
          if (symbol in self) {
            h = self[symbol]();
          } else if (typeof self === "function") {
            h = random(self);
          } else if (self instanceof DataView) {
            h = array(viewBytes(self));
          } else if (Array.isArray(self) || ArrayBuffer.isView(self)) {
            h = array(self);
          } else if (self instanceof Map) {
            h = hashMap(self);
          } else if (self instanceof Set) {
            h = hashSet(self);
          } else {
            h = structure(self);
          }
        } finally {
          visitedObjects.delete(self);
        }
        if (seen === backEdges) {
          hashCache.set(self, h);
        }
        return h;
      }
    }
  }
  return optimize(mix(string(String(self))));
};
var random = (self) => {
  if (!randomHashCache.has(self)) {
    randomHashCache.set(self, optimize(Math.random() * 4294967296 | 0));
  }
  return randomHashCache.get(self);
};
var mix = (h) => {
  h ^= h >>> 16;
  h = Math.imul(h, 2246822507);
  h ^= h >>> 13;
  h = Math.imul(h, 3266489909);
  return h ^ h >>> 16;
};
var combine = /* @__PURE__ */ dual(2, (self, b) => mix(Math.imul(self, 2654435761) + Math.imul(b, 2246822507)));
var optimize = (n) => n & 3221225471 | n >>> 1 & 1073741824;
var float64 = /* @__PURE__ */ new DataView(/* @__PURE__ */ new ArrayBuffer(8));
var number = (n) => {
  const h = n | 0;
  if (h === n) {
    return optimize(h);
  }
  float64.setFloat64(0, n !== n ? NaN : n);
  return optimize(combine(float64.getInt32(0), float64.getInt32(4)));
};
var string = (str) => {
  let h = 5381, i = str.length;
  while (i) {
    h = h * 33 ^ str.charCodeAt(--i);
  }
  return optimize(h);
};
var structureKeys = (o, keys3) => {
  let h = 12289;
  for (const key of keys3) {
    h ^= combine(hash(key), hash(o[key]));
  }
  return optimize(h);
};
var structure = (o) => structureKeys(o, getAllObjectKeys(o));
var unordered = (seed, f) => (iter) => {
  let h = seed;
  for (const element of iter) {
    h ^= f(element);
  }
  return optimize(h);
};
var array = (arr) => {
  let h = 6151;
  for (const element of arr) {
    h = combine(h, hash(element));
  }
  return optimize(h);
};
var hashMap = /* @__PURE__ */ unordered(/* @__PURE__ */ string("Map"), ([k, v]) => combine(hash(k), hash(v)));
var setSeed = /* @__PURE__ */ string("Set");
var hashSet = /* @__PURE__ */ unordered(setSeed, (element) => combine(setSeed, hash(element)));
var randomHashCache = /* @__PURE__ */ new WeakMap();
var hashCache = /* @__PURE__ */ new WeakMap();
var visitedObjects = /* @__PURE__ */ new WeakSet();

// node_modules/effect/dist/Equal.js
var symbol2 = "~effect/Equal";
function equals() {
  if (arguments.length === 1) {
    return (self) => compareBoth(self, arguments[0]);
  }
  return compareBoth(arguments[0], arguments[1]);
}
function compareBoth(self, that) {
  if (self === that) return true;
  if (self == null || that == null) return false;
  const selfType = typeof self;
  if (selfType !== typeof that) {
    return false;
  }
  if (selfType === "number" && self !== self && that !== that) {
    return true;
  }
  if (selfType !== "object" && selfType !== "function") {
    return false;
  }
  if (byReferenceInstances.has(self) || byReferenceInstances.has(that)) {
    return false;
  }
  return compareObjects(self, that);
}
function compareObjects(self, that) {
  const depth = pathLeft.length;
  for (let i = depth; i-- > 0; ) {
    if (pathLeft[i] === self && pathRight[i] === that) return true;
  }
  if (depth) return compareOnPath(self, that);
  let known = results.get(self);
  if (!known) results.set(self, known = /* @__PURE__ */ new WeakMap());
  let result3 = known.get(that);
  if (result3 === void 0) known.set(that, result3 = compareOnPath(self, that));
  return result3;
}
function compareOnPath(self, that) {
  pathLeft.push(self);
  pathRight.push(that);
  try {
    return compareStructure(self, that);
  } finally {
    pathLeft.pop();
    pathRight.pop();
  }
}
var pathLeft = [];
var pathRight = [];
var results = /* @__PURE__ */ new WeakMap();
function compareStructure(self, that) {
  if (hash(self) !== hash(that)) {
    return false;
  } else if (self instanceof Date) {
    if (!(that instanceof Date)) return false;
    const selfTime = self.getTime();
    const thatTime = that.getTime();
    return selfTime === thatTime || Number.isNaN(selfTime) && Number.isNaN(thatTime);
  } else if (self instanceof RegExp) {
    return that instanceof RegExp && self.toString() === that.toString();
  }
  const bothEquals = isEqual(self);
  if (bothEquals !== isEqual(that) || typeof self === "function" && !bothEquals) {
    return false;
  } else if (bothEquals) {
    return self[symbol2](that);
  } else if (Array.isArray(self)) {
    if (!Array.isArray(that) || self.length !== that.length) {
      return false;
    }
    return compareArrays(self, that);
  } else if (ArrayBuffer.isView(self)) {
    const selfIsDataView = self instanceof DataView;
    if (!ArrayBuffer.isView(that) || self.byteLength !== that.byteLength || selfIsDataView !== that instanceof DataView) {
      return false;
    }
    if (selfIsDataView) {
      return compareTypedArrays(viewBytes(self), viewBytes(that));
    }
    return compareTypedArrays(self, that);
  } else if (self instanceof Map) {
    if (!(that instanceof Map) || self.size !== that.size) {
      return false;
    }
    return compareHashed(self, that, entryHash, equalEntries);
  } else if (self instanceof Set) {
    if (!(that instanceof Set) || self.size !== that.size) {
      return false;
    }
    return compareHashed(self, that, hash, compareBoth);
  }
  return compareRecords(self, that);
}
function compareArrays(self, that) {
  for (let i = 0; i < self.length; i++) {
    if (!compareBoth(self[i], that[i])) {
      return false;
    }
  }
  return true;
}
function compareTypedArrays(self, that) {
  if (self.length !== that.length) {
    return false;
  }
  for (let i = 0; i < self.length; i++) {
    if (self[i] !== that[i]) {
      return false;
    }
  }
  return true;
}
function compareRecords(self, that) {
  const selfKeys = getAllObjectKeys(self);
  const thatKeys = getAllObjectKeys(that);
  if (selfKeys.size !== thatKeys.size) {
    return false;
  }
  for (const key of selfKeys) {
    if (!thatKeys.has(key) || !compareBoth(self[key], that[key])) {
      return false;
    }
  }
  return true;
}
function compareHashed(self, that, hashOf, equivalent) {
  const groups = /* @__PURE__ */ new Map();
  let remaining = 0;
  for (const item of that) {
    const h = hashOf(item);
    const group = groups.get(h);
    if (group) group.push(item);
    else groups.set(h, [item]);
    remaining++;
  }
  outer: for (const item of self) {
    const group = groups.get(hashOf(item));
    if (group) {
      for (let i = 0; i < group.length; i++) {
        if (equivalent(item, group[i])) {
          group[i] = group[group.length - 1];
          group.pop();
          remaining--;
          continue outer;
        }
      }
    }
    return false;
  }
  return remaining === 0;
}
var entryHash = (entry) => hash(entry[0]);
var equalEntries = (self, that) => compareBoth(self[0], that[0]) && compareBoth(self[1], that[1]);
var sameGroup = () => 0;
function makeCompareMap(keyEquivalence, valueEquivalence) {
  return makeCompareSet((self, that) => keyEquivalence(self[0], that[0]) && valueEquivalence(self[1], that[1]));
}
function makeCompareSet(equivalence) {
  return function compareSets(self, that) {
    return compareHashed(self, that, sameGroup, equivalence);
  };
}
var isEqual = (u) => hasProperty(u, symbol2);
var asEquivalence = () => equals;
var byReferenceUnsafe = (obj) => {
  byReferenceInstances.add(obj);
  return obj;
};

// node_modules/effect/dist/Redactable.js
var symbolRedactable = /* @__PURE__ */ Symbol.for("~effect/Redactable");
var isRedactable = (u) => hasProperty(u, symbolRedactable);
function redact(u) {
  if (isRedactable(u)) return getRedacted(u);
  return u;
}
function getRedacted(redactable) {
  return redactable[symbolRedactable](globalThis[currentFiberTypeId]?.context ?? emptyContext);
}
var currentFiberTypeId = "~effect/Fiber/currentFiber";
var emptyMap = /* @__PURE__ */ new Map();
var emptyContext = {
  "~effect/Context": {},
  base: emptyMap,
  depth: 0,
  mapUnsafe: emptyMap,
  pipe() {
    return pipeArguments(this, arguments);
  }
};

// node_modules/effect/dist/Formatter.js
function format(input, options) {
  const space = options?.space ?? 0;
  const ancestors = /* @__PURE__ */ new WeakSet();
  const gap = !space ? "" : typeof space === "number" ? " ".repeat(space) : space;
  const ind = (d) => gap.repeat(d);
  const wrap = (v, body) => {
    const ctor = v?.constructor;
    return ctor && ctor !== Object.prototype.constructor && ctor.name ? `${ctor.name}(${body})` : body;
  };
  const ownKeys = (o) => {
    try {
      return Reflect.ownKeys(o);
    } catch {
      return ["[ownKeys threw]"];
    }
  };
  function recur2(v, d = 0) {
    try {
      return recurUnsafe(v, d);
    } catch {
      if (typeof v === "object" && v !== null || typeof v === "function") ancestors.delete(v);
      return "[inspection threw]";
    }
  }
  function recurUnsafe(v, d = 0) {
    if (typeof v === "string") return JSON.stringify(v);
    if (typeof v === "number" || v == null || typeof v === "boolean" || typeof v === "symbol") return String(v);
    if (typeof v === "bigint") return String(v) + "n";
    if (typeof v === "object" || typeof v === "function") {
      if (ancestors.has(v)) return CIRCULAR;
      ancestors.add(v);
      let output;
      if (symbolRedactable in v) {
        output = recur2(getRedacted(v), d);
      } else if (Array.isArray(v)) {
        output = !gap || v.length <= 1 ? `[${v.map((x) => recur2(x, d)).join(",")}]` : `[
${ind(d + 1)}${v.map((x) => recur2(x, d + 1)).join(",\n" + ind(d + 1))}
${ind(d)}]`;
      } else if (v instanceof Date) {
        output = formatDate(v);
      } else if (!options?.ignoreToString && hasProperty(v, "toString") && typeof v["toString"] === "function" && v["toString"] !== Object.prototype.toString && v["toString"] !== Array.prototype.toString) {
        const s = safeToString(v);
        output = v instanceof Error && v.cause !== void 0 ? `${s} (cause: ${recur2(v.cause, d)})` : s;
      } else if (Symbol.iterator in v) {
        output = `${v.constructor.name}(${recur2(Array.from(v), d)})`;
      } else {
        const keys3 = ownKeys(v);
        if (!gap || keys3.length <= 1) {
          const body = `{${keys3.map((k) => `${formatPropertyKey(k)}:${recur2(safeGet(v, k), d)}`).join(",")}}`;
          output = wrap(v, body);
        } else {
          const body = `{
${keys3.map((k) => `${ind(d + 1)}${formatPropertyKey(k)}: ${recur2(safeGet(v, k), d + 1)}`).join(",\n")}
${ind(d)}}`;
          output = wrap(v, body);
        }
      }
      ancestors.delete(v);
      return output;
    }
    return String(v);
  }
  return recur2(input, 0);
}
var CIRCULAR = "[Circular]";
function formatPropertyKey(name) {
  return typeof name === "string" ? JSON.stringify(name) : String(name);
}
function formatPath(path) {
  return path.map((key) => `[${formatPropertyKey(key)}]`).join("");
}
function formatDate(date) {
  try {
    return date.toISOString();
  } catch {
    return "Invalid Date";
  }
}
function safeToString(input) {
  try {
    const s = input.toString();
    return typeof s === "string" ? s : String(s);
  } catch {
    return "[toString threw]";
  }
}
function safeGet(input, key) {
  try {
    return input[key];
  } catch {
    return "[property access threw]";
  }
}
function formatJson(input, options) {
  const ancestors = [];
  return JSON.stringify(input, function(key, value3) {
    const original = Object.getOwnPropertyDescriptor(this, key)?.value;
    const redacted = hasProperty(original, symbolRedactable) ? redact(original) : redact(value3);
    if (typeof redacted === "bigint") {
      return format(redacted);
    }
    if (typeof redacted !== "object" || redacted === null) {
      return redacted;
    }
    const current = redacted instanceof Error && !hasProperty(redacted, "toJSON") ? {
      ...redacted,
      name: redacted.name,
      message: redacted.message
    } : redacted;
    while (ancestors.length > 0 && ancestors[ancestors.length - 1] !== this) {
      ancestors.pop();
    }
    if (ancestors.includes(redacted)) {
      return void 0;
    }
    ancestors.push(redacted);
    if (current !== redacted) {
      ancestors.push(current);
    }
    if (!hasGetter(current) || isJsonPrimitiveWrapper(current)) {
      return current;
    }
    const serialized = new Proxy(current, {
      get(target, key2) {
        const value4 = Reflect.get(target, key2, target);
        return Object.getOwnPropertyDescriptor(target, key2)?.get !== void 0 ? redact(value4) : value4;
      }
    });
    ancestors.push(serialized);
    return serialized;
  }, options?.space) ?? "null";
}
function hasGetter(object) {
  for (const key of Object.getOwnPropertyNames(object)) {
    if (Object.getOwnPropertyDescriptor(object, key)?.get !== void 0) {
      return true;
    }
  }
  return false;
}
function isJsonPrimitiveWrapper(object) {
  for (const valueOf of [Number.prototype.valueOf, Boolean.prototype.valueOf, String.prototype.valueOf]) {
    try {
      Reflect.apply(valueOf, object, []);
      return true;
    } catch {
    }
  }
  return false;
}

// node_modules/effect/dist/Inspectable.js
var NodeInspectSymbol = /* @__PURE__ */ Symbol.for("nodejs.util.inspect.custom");
var toJson = (input) => {
  try {
    input = redact(input);
    if (hasProperty(input, "toJSON") && isFunction(input["toJSON"]) && input["toJSON"].length === 0) {
      return input.toJSON();
    } else if (Array.isArray(input)) {
      return input.map(toJson);
    }
    return input;
  } catch {
    return "[toJSON threw]";
  }
};
var toStringUnknown = (u, whitespace = 2) => {
  if (typeof u === "string") {
    return u;
  }
  try {
    return typeof u === "object" ? formatJson(u, {
      space: whitespace
    }) : format(u, {
      space: whitespace
    });
  } catch {
    return String(u);
  }
};
var BaseProto = {
  toJSON() {
    return toJson(this);
  },
  [NodeInspectSymbol]() {
    return this.toJSON();
  },
  toString() {
    return format(this.toJSON());
  }
};
var Class2 = class {
  /**
   * Node.js custom inspection method.
   *
   * **When to use**
   *
   * Use to expose the class JSON representation to Node.js inspection.
   *
   * @since 2.0.0
   */
  [NodeInspectSymbol]() {
    return this.toJSON();
  }
  /**
   * Returns a formatted string representation of this object.
   *
   * **When to use**
   *
   * Use to format the class JSON representation as a string.
   *
   * @since 2.0.0
   */
  toString() {
    return format(this.toJSON());
  }
};

// node_modules/effect/dist/internal/stackTraceLimit.js
var isStackTraceLimitWritable = () => {
  const desc = Object.getOwnPropertyDescriptor(Error, "stackTraceLimit");
  if (desc === void 0) {
    return Object.isExtensible(Error);
  }
  return Object.hasOwn(desc, "writable") ? desc.writable === true : desc.set !== void 0;
};
var canWriteStackTraceLimit = /* @__PURE__ */ isStackTraceLimitWritable();
var getStackTraceLimit = () => Error.stackTraceLimit;
var setStackTraceLimit = (value3) => {
  if (canWriteStackTraceLimit) {
    ;
    Error.stackTraceLimit = value3;
  }
};

// node_modules/effect/dist/Utils.js
var SingleShotGen = class {
  constructor(self) {
    this.value = self;
    this.done = false;
  }
  /**
   * Yields the stored value once, then completes with the value sent back in.
   *
   * **When to use**
   *
   * Use to advance a `SingleShotGen` through its single yield and completion
   * step.
   *
   * @since 2.0.0
   */
  next(a) {
    if (this.done) {
      this.value = a;
      return this;
    }
    this.done = true;
    return {
      value: this.value,
      done: false
    };
  }
};
var pickInternalCall = () => {
  const InternalTypeId = "~effect/Utils/internal";
  const standard = {
    [InternalTypeId]: (body) => {
      return body();
    }
  };
  const forced = {
    [InternalTypeId]: (body) => {
      try {
        return body();
      } finally {
      }
    }
  };
  const limit = getStackTraceLimit();
  if (limit === 0) return forced[InternalTypeId];
  setStackTraceLimit(2);
  const error = standard[InternalTypeId](() => new Error());
  setStackTraceLimit(limit);
  return error.stack?.includes(InternalTypeId) === true ? standard[InternalTypeId] : forced[InternalTypeId];
};
var internalCall = /* @__PURE__ */ pickInternalCall();

// node_modules/effect/dist/internal/record.js
function assignProperty(self, key, value3) {
  if (key === "__proto__") {
    Object.defineProperty(self, key, {
      value: value3,
      writable: true,
      enumerable: true,
      configurable: true
    });
  } else {
    ;
    self[key] = value3;
  }
}
function assignProperties(self, source) {
  for (const key of Reflect.ownKeys(source)) {
    if (Object.prototype.propertyIsEnumerable.call(source, key)) {
      assignProperty(self, key, source[key]);
    }
  }
}

// node_modules/effect/dist/internal/core.js
var EffectTypeId = `~effect/Effect`;
var ExitTypeId = `~effect/Exit`;
var effectVariance = {
  _A: identity,
  _E: identity,
  _R: identity
};
var identifier = `${EffectTypeId}/identifier`;
var args = `${EffectTypeId}/args`;
var evaluate = `${EffectTypeId}/evaluate`;
var contA = `${EffectTypeId}/successCont`;
var contE = `${EffectTypeId}/failureCont`;
var contAll = `${EffectTypeId}/ensureCont`;
var Yield = /* @__PURE__ */ Symbol.for("effect/Effect/Yield");
var PipeInspectableProto = {
  pipe() {
    return pipeArguments(this, arguments);
  },
  toJSON() {
    return {
      ...this
    };
  },
  toString() {
    return format(this.toJSON(), {
      ignoreToString: true,
      space: 2
    });
  },
  [NodeInspectSymbol]() {
    return this.toJSON();
  }
};
var StructuralProto = {
  [symbol]() {
    return structureKeys(this, Object.keys(this));
  },
  [symbol2](that) {
    const selfKeys = Object.keys(this);
    const thatKeys = Object.keys(that);
    if (selfKeys.length !== thatKeys.length) return false;
    for (let i = 0; i < selfKeys.length; i++) {
      if (selfKeys[i] !== thatKeys[i] || !equals(this[selfKeys[i]], that[selfKeys[i]])) {
        return false;
      }
    }
    return true;
  }
};
var EffectProto = {
  [EffectTypeId]: effectVariance,
  ...PipeInspectableProto,
  [Symbol.iterator]() {
    return new SingleShotGen(this);
  },
  toJSON() {
    return {
      _id: "Effect",
      op: this[identifier],
      ...args in this ? {
        args: this[args]
      } : void 0
    };
  }
};
var isEffect = (u) => hasProperty(u, EffectTypeId);
var isExit = (u) => hasProperty(u, ExitTypeId);
var CauseTypeId = "~effect/Cause";
var CauseReasonTypeId = "~effect/Cause/Reason";
var isCause = (self) => hasProperty(self, CauseTypeId);
var isCauseReason = (self) => hasProperty(self, CauseReasonTypeId);
var CauseImpl = class {
  constructor(failures) {
    this[CauseTypeId] = CauseTypeId;
    this.reasons = failures;
  }
  pipe() {
    return pipeArguments(this, arguments);
  }
  toJSON() {
    return {
      _id: "Cause",
      failures: this.reasons.map((f) => f.toJSON())
    };
  }
  toString() {
    return `Cause(${format(this.reasons)})`;
  }
  [NodeInspectSymbol]() {
    return this.toJSON();
  }
  [symbol2](that) {
    return isCause(that) && this.reasons.length === that.reasons.length && this.reasons.every((e, i) => equals(e, that.reasons[i]));
  }
  [symbol]() {
    return array(this.reasons);
  }
};
var annotationsMap = /* @__PURE__ */ new WeakMap();
var ReasonBase = class {
  [CauseReasonTypeId];
  annotations;
  _tag;
  constructor(_tag, annotations, originalError) {
    this[CauseReasonTypeId] = CauseReasonTypeId;
    this._tag = _tag;
    if (annotations !== constEmptyAnnotations && typeof originalError === "object" && originalError !== null && annotations.size > 0) {
      const prevAnnotations = annotationsMap.get(originalError);
      if (prevAnnotations) {
        annotations = new Map([...prevAnnotations, ...annotations]);
      }
      annotationsMap.set(originalError, annotations);
    }
    this.annotations = annotations;
  }
  annotate(annotations, options) {
    if (annotations.mapUnsafe.size === 0) return this;
    const newAnnotations = new Map(this.annotations);
    annotations.mapUnsafe.forEach((value3, key) => {
      if (options?.overwrite !== true && newAnnotations.has(key)) return;
      newAnnotations.set(key, value3);
    });
    const self = Object.assign(Object.create(Object.getPrototypeOf(this)), this);
    self.annotations = newAnnotations;
    return self;
  }
  pipe() {
    return pipeArguments(this, arguments);
  }
  toString() {
    return format(this);
  }
  [NodeInspectSymbol]() {
    return this.toString();
  }
};
var constEmptyAnnotations = /* @__PURE__ */ new Map();
var Fail = class extends ReasonBase {
  constructor(error, annotations = constEmptyAnnotations) {
    super("Fail", annotations, error);
    this.error = error;
  }
  toString() {
    return `Fail(${format(this.error)})`;
  }
  toJSON() {
    return {
      _tag: "Fail",
      error: this.error
    };
  }
  [symbol2](that) {
    return isFailReason(that) && equals(this.error, that.error) && equals(this.annotations, that.annotations);
  }
  [symbol]() {
    return combine(string(this._tag))(combine(hash(this.error))(hash(this.annotations)));
  }
};
var causeFromReasons = (reasons) => new CauseImpl(reasons);
var dedupeReasons = (self, that) => {
  const buckets = /* @__PURE__ */ new Map();
  const out = [];
  for (const reason of self.concat(that)) {
    const hash2 = hash(reason);
    const bucket = buckets.get(hash2);
    if (bucket === void 0) {
      buckets.set(hash2, [reason]);
    } else if (bucket.some((previous) => equals(previous, reason))) {
      continue;
    } else {
      bucket.push(reason);
    }
    out.push(reason);
  }
  return out;
};
var causeCombine = /* @__PURE__ */ dual(2, (self, that) => {
  if (self.reasons.length === 0) {
    return that;
  } else if (that.reasons.length === 0) {
    return self;
  }
  const newCause = new CauseImpl(dedupeReasons(self.reasons, that.reasons));
  return equals(self, newCause) ? self : newCause;
});
var causeAddInterrupts = (self, interrupts) => {
  const reasons = self.reasons.slice();
  for (const reason of interrupts.reasons) {
    if (isInterruptReason(reason) && !reasons.some((r) => isInterruptReason(r) && r.fiberId === reason.fiberId && r.annotations === reason.annotations)) {
      reasons.push(reason);
    }
  }
  return reasons.length === self.reasons.length ? self : new CauseImpl(reasons);
};
var causeEmpty = /* @__PURE__ */ new CauseImpl([]);
var causeFail = (error) => new CauseImpl([new Fail(error)]);
var Die = class extends ReasonBase {
  constructor(defect, annotations = constEmptyAnnotations) {
    super("Die", annotations, defect);
    this.defect = defect;
  }
  toString() {
    return `Die(${format(this.defect)})`;
  }
  toJSON() {
    return {
      _tag: "Die",
      defect: this.defect
    };
  }
  [symbol2](that) {
    return isDieReason(that) && equals(this.defect, that.defect) && equals(this.annotations, that.annotations);
  }
  [symbol]() {
    return combine(string(this._tag))(combine(hash(this.defect))(hash(this.annotations)));
  }
};
var causeDie = (defect) => new CauseImpl([new Die(defect)]);
var causeAnnotate = /* @__PURE__ */ dual((args2) => isCause(args2[0]), (self, annotations, options) => {
  if (annotations.mapUnsafe.size === 0) return self;
  return new CauseImpl(self.reasons.map((f) => f.annotate(annotations, options)));
});
var isFailReason = (self) => self._tag === "Fail";
var isDieReason = (self) => self._tag === "Die";
var isInterruptReason = (self) => self._tag === "Interrupt";
function defaultEvaluate(_fiber) {
  return exitDie(`Effect.evaluate: Not implemented`);
}
var makePrimitiveProto = (options) => ({
  ...EffectProto,
  [identifier]: options.op,
  [evaluate]: options[evaluate] ?? defaultEvaluate,
  [contA]: options[contA],
  [contE]: options[contE],
  [contAll]: options[contAll]
});
var makePrimitive = (options) => {
  const Proto8 = makePrimitiveProto(options);
  const PrimitiveImpl = function(value3) {
    this[args] = value3;
  };
  PrimitiveImpl.prototype = Proto8;
  return function(value3) {
    return new PrimitiveImpl(value3);
  };
};
var makeExit = (options) => {
  const Proto8 = {
    [ExitTypeId]: ExitTypeId,
    _tag: options.op,
    get [options.prop]() {
      return this[args];
    },
    ...makePrimitiveProto(options),
    toString() {
      return `${options.op}(${format(this[args])})`;
    },
    toJSON() {
      return {
        _id: "Exit",
        _tag: options.op,
        [options.prop]: this[args]
      };
    },
    [symbol2](that) {
      return isExit(that) && that._tag === this._tag && equals(this[args], that[args]);
    },
    [symbol]() {
      return combine(string(options.op), hash(this[args]));
    }
  };
  const ExitPrimitive = function(value3) {
    this[args] = value3;
  };
  ExitPrimitive.prototype = Proto8;
  return function(value3) {
    return new ExitPrimitive(value3);
  };
};
var exitSucceed = /* @__PURE__ */ makeExit({
  op: "Success",
  prop: "value",
  [evaluate](fiber3) {
    const cont = fiber3.getCont(contA);
    return cont ? cont[contA](this[args], fiber3, this) : fiber3.yieldWith(this);
  }
});
var StackTraceKey = {
  key: "effect/Cause/StackTrace"
};
var InterruptorStackTrace = {
  key: "effect/Cause/InterruptorStackTrace"
};
var exitFailCause = /* @__PURE__ */ makeExit({
  op: "Failure",
  prop: "cause",
  [evaluate](fiber3) {
    let cause = this[args];
    let annotated = false;
    if (fiber3.cache.stackFrame) {
      cause = causeAnnotate(cause, {
        mapUnsafe: /* @__PURE__ */ new Map([[StackTraceKey.key, fiber3.cache.stackFrame]])
      });
      annotated = true;
    }
    let cont = fiber3.getCont(contE);
    const interruptedCause = fiber3._interruptedCause;
    if (interruptedCause && fiber3.interruptible) {
      let skippedHandler = false;
      while (cont && fiber3.interruptible) {
        skippedHandler ||= identifier in cont;
        cont = fiber3.getCont(contE);
      }
      if (skippedHandler) {
        cause = causeFromReasons(cause.reasons.filter((reason) => reason._tag !== "Fail"));
      }
      cause = causeAddInterrupts(cause, interruptedCause);
      annotated = true;
    }
    return cont ? cont[contE](cause, fiber3, annotated ? void 0 : this) : fiber3.yieldWith(annotated ? exitFailCause(cause) : this);
  }
});
var exitFail = (e) => exitFailCause(causeFail(e));
var exitDie = (defect) => exitFailCause(causeDie(defect));
var withFiber = /* @__PURE__ */ makePrimitive({
  op: "WithFiber",
  [evaluate](fiber3) {
    return this[args](fiber3);
  }
});
var withFiberSucceed = /* @__PURE__ */ makePrimitive({
  op: "WithFiberSucceed",
  [evaluate](fiber3) {
    const value3 = this[args](fiber3);
    const cont = fiber3.getCont(contA);
    return cont ? cont[contA](value3, fiber3) : fiber3.yieldWith(exitSucceed(value3));
  }
});
var YieldableError = /* @__PURE__ */ (function() {
  class YieldableError2 extends globalThis.Error {
  }
  const proto = /* @__PURE__ */ makePrimitiveProto({
    op: "YieldableError",
    [evaluate]() {
      return exitFail(this);
    }
  });
  delete proto.toString;
  Object.assign(YieldableError2.prototype, proto);
  return YieldableError2;
})();
var Error2 = /* @__PURE__ */ (function() {
  const plainArgsSymbol = /* @__PURE__ */ Symbol.for("effect/Data/Error/plainArgs");
  return class Base extends YieldableError {
    constructor(args2) {
      super(args2?.message, args2?.cause ? {
        cause: args2.cause
      } : void 0);
      if (args2) {
        assignProperties(this, args2);
        Object.defineProperty(this, plainArgsSymbol, {
          value: args2,
          enumerable: false
        });
      }
    }
    toJSON() {
      return {
        ...this[plainArgsSymbol],
        ...this
      };
    }
  };
})();
var TaggedError = (tag2) => {
  class Base extends Error2 {
    _tag = tag2;
  }
  ;
  Base.prototype.name = tag2;
  return Base;
};
var NoSuchElementErrorTypeId = "~effect/Cause/NoSuchElementError";
var isNoSuchElementError = (u) => hasProperty(u, NoSuchElementErrorTypeId);
var NoSuchElementError = class extends (/* @__PURE__ */ TaggedError("NoSuchElementError")) {
  [NoSuchElementErrorTypeId] = NoSuchElementErrorTypeId;
  constructor(message) {
    super({
      message
    });
  }
};
var DoneTypeId = "~effect/Cause/Done";
var isDone = (u) => hasProperty(u, DoneTypeId);
var DoneVoid = {
  [DoneTypeId]: DoneTypeId,
  _tag: "Done",
  value: void 0
};
var Done = (value3) => {
  if (value3 === void 0) return DoneVoid;
  return {
    [DoneTypeId]: DoneTypeId,
    _tag: "Done",
    value: value3
  };
};
var doneVoid = /* @__PURE__ */ exitFail(DoneVoid);
var done = (value3) => {
  if (value3 === void 0) return doneVoid;
  return exitFail(Done(value3));
};

// node_modules/effect/dist/Effectable.js
var Prototype2 = (options) => makePrimitiveProto({
  op: options.label,
  [evaluate]: options.evaluate
});

// node_modules/effect/dist/Equivalence.js
var make = (isEquivalent) => (self, that) => self === that || isEquivalent(self, that);
var isStrictEquivalent = (x, y) => x === y;
var strictEqual = () => isStrictEquivalent;
function Tuple(elements) {
  return make((self, that) => {
    if (self.length !== that.length) {
      return false;
    }
    for (let i = 0; i < self.length; i++) {
      if (!elements[i](self[i], that[i])) {
        return false;
      }
    }
    return true;
  });
}
function Array_(item) {
  return make((self, that) => {
    if (self.length !== that.length) return false;
    for (let i = 0; i < self.length; i++) {
      if (!item(self[i], that[i])) return false;
    }
    return true;
  });
}

// node_modules/effect/dist/internal/doNotation.js
var let_ = (map10) => dual(3, (self, name, f) => map10(self, (a) => ({
  ...a,
  [name]: f(a)
})));
var bindTo = (map10) => dual(2, (self, name) => map10(self, (a) => ({
  [name]: a
})));
var bind = (map10, flatMap7) => dual(3, (self, name, f) => flatMap7(self, (a) => map10(f(a), (b) => ({
  ...a,
  [name]: b
}))));

// node_modules/effect/dist/internal/option.js
var TypeId = "~effect/Option";
var CommonProto = {
  [TypeId]: {
    _A: (_) => _
  },
  ...PipeInspectableProto,
  [Symbol.iterator]() {
    return new SingleShotGen(this);
  }
};
var SomeProto = /* @__PURE__ */ Object.defineProperty(/* @__PURE__ */ Object.assign(/* @__PURE__ */ Object.create(CommonProto), {
  _tag: "Some",
  _op: "Some",
  [symbol2](that) {
    return isOption(that) && isSome(that) && equals(this.value, that.value);
  },
  [symbol]() {
    return combine(hash(this._tag))(hash(this.value));
  },
  toString() {
    return `some(${format(this.value)})`;
  },
  toJSON() {
    return {
      _id: "Option",
      _tag: this._tag,
      value: toJson(this.value)
    };
  }
}), "valueOrUndefined", {
  get() {
    return this.value;
  }
});
var NoneHash = /* @__PURE__ */ hash("None");
var NoneProto = /* @__PURE__ */ Object.assign(/* @__PURE__ */ Object.create(CommonProto), {
  _tag: "None",
  _op: "None",
  valueOrUndefined: void 0,
  [symbol2](that) {
    return isOption(that) && isNone(that);
  },
  [symbol]() {
    return NoneHash;
  },
  toString() {
    return `none()`;
  },
  toJSON() {
    return {
      _id: "Option",
      _tag: this._tag
    };
  }
});
var isOption = (input) => hasProperty(input, TypeId);
var isNone = (fa) => fa._tag === "None";
var isSome = (fa) => fa._tag === "Some";
var none = /* @__PURE__ */ Object.create(NoneProto);
var SomeImpl = function(value3) {
  this.value = value3;
};
SomeImpl.prototype = SomeProto;
var some = (value3) => new SomeImpl(value3);

// node_modules/effect/dist/internal/result.js
var TypeId2 = "~effect/Result";
var CommonProto2 = {
  [TypeId2]: {
    /* v8 ignore next 2 */
    _A: (_) => _,
    _E: (_) => _
  },
  ...PipeInspectableProto,
  [Symbol.iterator]() {
    return new SingleShotGen(this);
  }
};
var SuccessProto = /* @__PURE__ */ Object.assign(/* @__PURE__ */ Object.create(CommonProto2), {
  _tag: "Success",
  _op: "Success",
  [symbol2](that) {
    return isResult(that) && isSuccess(that) && equals(this.success, that.success);
  },
  [symbol]() {
    return combine(hash(this._tag))(hash(this.success));
  },
  toString() {
    return `success(${format(this.success)})`;
  },
  toJSON() {
    return {
      _id: "Result",
      _tag: this._tag,
      value: toJson(this.success)
    };
  }
});
var FailureProto = /* @__PURE__ */ Object.assign(/* @__PURE__ */ Object.create(CommonProto2), {
  _tag: "Failure",
  _op: "Failure",
  [symbol2](that) {
    return isResult(that) && isFailure(that) && equals(this.failure, that.failure);
  },
  [symbol]() {
    return combine(hash(this._tag))(hash(this.failure));
  },
  toString() {
    return `failure(${format(this.failure)})`;
  },
  toJSON() {
    return {
      _id: "Result",
      _tag: this._tag,
      failure: toJson(this.failure)
    };
  }
});
var isResult = (input) => hasProperty(input, TypeId2);
var isFailure = (result3) => result3._tag === "Failure";
var isSuccess = (result3) => result3._tag === "Success";
var FailureImpl = function(failure) {
  this.failure = failure;
};
FailureImpl.prototype = FailureProto;
var fail = (failure) => new FailureImpl(failure);
var SuccessImpl = function(success) {
  this.success = success;
};
SuccessImpl.prototype = SuccessProto;
var succeed = (success) => new SuccessImpl(success);
var getFailure = (self) => isSuccess(self) ? none : some(self.failure);
var getSuccess = (self) => isFailure(self) ? none : some(self.success);
var fromOption = /* @__PURE__ */ dual(2, (self, onNone) => isNone(self) ? fail(onNone()) : succeed(self.value));

// node_modules/effect/dist/Order.js
function make2(compare2) {
  return (self, that) => self === that ? 0 : compare2(self, that);
}
var String2 = /* @__PURE__ */ make2((self, that) => self < that ? -1 : 1);
var Number2 = /* @__PURE__ */ make2((self, that) => {
  if (globalThis.Number.isNaN(self) && globalThis.Number.isNaN(that)) return 0;
  if (globalThis.Number.isNaN(self)) return -1;
  if (globalThis.Number.isNaN(that)) return 1;
  return self < that ? -1 : 1;
});
var BigInt2 = /* @__PURE__ */ make2((self, that) => self < that ? -1 : 1);
var mapInput = /* @__PURE__ */ dual(2, (self, f) => make2((b1, b2) => self(f(b1), f(b2))));
var Date2 = /* @__PURE__ */ mapInput(Number2, (date) => date.getTime());
var isLessThan = (O) => dual(2, (self, that) => O(self, that) === -1);
var isGreaterThan = (O) => dual(2, (self, that) => O(self, that) === 1);
var isLessThanOrEqualTo = (O) => dual(2, (self, that) => O(self, that) !== 1);
var isGreaterThanOrEqualTo = (O) => dual(2, (self, that) => O(self, that) !== -1);

// node_modules/effect/dist/Option.js
var none2 = () => none;
var some2 = some;
var isOption2 = isOption;
var isNone2 = isNone;
var isSome2 = isSome;
var match = /* @__PURE__ */ dual(2, (self, {
  onNone,
  onSome
}) => isNone2(self) ? onNone() : onSome(self.value));
var getOrElse = /* @__PURE__ */ dual(2, (self, onNone) => isNone2(self) ? onNone() : self.value);
var fromNullishOr = (a) => a == null ? none2() : some2(a);
var fromUndefinedOr = (a) => a === void 0 ? none2() : some2(a);
var fromNullOr = (a) => a === null ? none2() : some2(a);
var getOrNull = /* @__PURE__ */ getOrElse(constNull);
var getOrUndefined = /* @__PURE__ */ getOrElse(constUndefined);
var liftThrowable = (f) => (...a) => {
  try {
    return some2(f(...a));
  } catch {
    return none2();
  }
};
var map = /* @__PURE__ */ dual(2, (self, f) => isNone2(self) ? none2() : some2(f(self.value)));
var flatMap = /* @__PURE__ */ dual(2, (self, f) => isNone2(self) ? none2() : f(self.value));
var flatten = /* @__PURE__ */ flatMap(identity);
var filter = /* @__PURE__ */ dual(2, (self, predicate) => isNone2(self) ? none2() : predicate(self.value) ? some2(self.value) : none2());

// node_modules/effect/dist/Context.js
var ServiceTypeId = "~effect/Context/Service";
var Service = function() {
  function KeyClass() {
  }
  const self = KeyClass;
  Object.setPrototypeOf(self, ServiceProto);
  const init = (key, options) => {
    self.key = key;
    if (options?.defaultValue) {
      self[ReferenceTypeId] = ReferenceTypeId;
      self.defaultValue = options.defaultValue;
    }
    if (options?.make) {
      ;
      self.make = options.make;
    }
    if (options?.fiberCached) {
      cacheKeys.add(key);
    }
    return self;
  };
  return arguments.length > 0 ? init(arguments[0], arguments[1]) : init;
};
var ServiceProto = {
  [ServiceTypeId]: ServiceTypeId,
  .../* @__PURE__ */ Prototype2({
    label: "Service",
    evaluate(fiber3) {
      return exitSucceed(get(fiber3.context, this));
    }
  }),
  toJSON() {
    return {
      _id: "Service",
      key: this.key
    };
  },
  of(self) {
    return self;
  },
  context(self) {
    return make3(this, self);
  },
  use(f) {
    return withFiber((fiber3) => f(get(fiber3.context, this)));
  },
  useSync(f) {
    return withFiber((fiber3) => exitSucceed(f(get(fiber3.context, this))));
  }
};
var cacheKeys = /* @__PURE__ */ new Set();
var ReferenceTypeId = "~effect/Context/Reference";
var TypeId3 = "~effect/Context";
var MaxDepth = 8;
var FlattenAfterBaseHits = 8;
var makeImpl = (cacheRoot, base, overlay, depth) => {
  const self = Object.create(Proto);
  self.cacheRoot = cacheRoot ?? self;
  self.base = base;
  self.overlay = overlay;
  self.depth = depth;
  self._flat = void 0;
  self.baseHits = 0;
  return self;
};
var applyOverlays = (map10, overlay) => {
  if (!overlay) return;
  applyOverlays(map10, overlay.parent);
  map10.set(overlay.key, overlay.value);
};
var flatten2 = (self) => {
  if (self._flat) return self._flat;
  if (!self.overlay) return self._flat = self.base;
  const map10 = new Map(self.base);
  applyOverlays(map10, self.overlay);
  return self._flat = map10;
};
var withFlat = (self, f) => {
  const map10 = new Map(self.mapUnsafe);
  f(map10);
  return makeUnsafe(map10);
};
var notFound = /* @__PURE__ */ Symbol();
var lookup = (self, key) => {
  const impl = self;
  for (let overlay = impl.overlay; overlay; overlay = overlay.parent) {
    if (overlay.key === key) return overlay.value;
  }
  const value3 = impl.base.get(key);
  if (value3 === void 0 && !impl.base.has(key)) return notFound;
  if (impl.overlay && ++impl.baseHits >= impl.base.size && impl.baseHits >= FlattenAfterBaseHits) {
    impl.base = flatten2(impl);
    impl.overlay = void 0;
    impl.depth = 0;
  }
  return value3;
};
var makeUnsafe = (mapUnsafe) => makeImpl(void 0, mapUnsafe, void 0, 0);
var Proto = {
  get mapUnsafe() {
    return flatten2(this);
  },
  ...PipeInspectableProto,
  [TypeId3]: {
    _Services: (_) => _
  },
  toJSON() {
    return {
      _id: "Context",
      services: Array.from(this.mapUnsafe).map(([key, value3]) => ({
        key,
        value: value3
      }))
    };
  },
  [symbol2](that) {
    if (!isContext(that)) return false;
    const self = this.mapUnsafe;
    const other = that.mapUnsafe;
    if (self.size !== other.size) return false;
    for (const [key, value3] of self) {
      if (!other.has(key) || !equals(value3, other.get(key))) return false;
    }
    return true;
  },
  [symbol]() {
    return number(this.mapUnsafe.size);
  }
};
var hasSameCache = (self, that) => self.cacheRoot === that.cacheRoot;
var isContext = (u) => hasProperty(u, TypeId3);
var isKey = (u) => hasProperty(u, ServiceTypeId);
var isReference = (u) => !!u[ReferenceTypeId];
var empty = () => emptyContext2;
var emptyContext2 = /* @__PURE__ */ makeUnsafe(/* @__PURE__ */ new Map());
var make3 = (key, service3) => makeUnsafe(/* @__PURE__ */ new Map([[key.key, service3]]));
var add = /* @__PURE__ */ dual(3, (self, key, service3) => addUnsafe(self, key.key, service3));
var addUnsafe = (self, key, service3) => {
  const impl = self;
  const cacheRoot = cacheKeys.has(key) ? void 0 : impl.cacheRoot;
  if (impl.depth >= MaxDepth) {
    const map10 = new Map(impl._flat ?? impl.base);
    if (!impl._flat) applyOverlays(map10, impl.overlay);
    map10.set(key, service3);
    return makeImpl(cacheRoot, map10, void 0, 0);
  }
  return makeImpl(cacheRoot, impl.base, {
    key,
    value: service3,
    parent: impl.overlay
  }, impl.depth + 1);
};
var addOrOmit = /* @__PURE__ */ dual(3, (self, key, service3) => service3._tag === "None" ? omit(key)(self) : add(self, key, service3.value));
var getOrElse2 = /* @__PURE__ */ dual(3, (self, key, orElse2) => {
  const value3 = lookup(self, key.key);
  if (value3 !== notFound) return value3;
  return isReference(key) ? getDefaultValue(key) : orElse2();
});
var getOrUndefined2 = /* @__PURE__ */ dual(2, (self, key) => getOrUndefinedUnsafe(self, key.key));
var getOrUndefinedUnsafe = (self, key) => {
  const value3 = lookup(self, key);
  return value3 === notFound ? void 0 : value3;
};
var getUnsafe = /* @__PURE__ */ dual(2, (self, service3) => {
  const value3 = lookup(self, service3.key);
  if (value3 === notFound) {
    if (isReference(service3)) return getDefaultValue(service3);
    throw serviceNotFoundError(service3);
  }
  return value3;
});
var get = getUnsafe;
var defaultValueCacheKey = "~effect/Context/defaultValue";
var getDefaultValue = (ref) => {
  if (defaultValueCacheKey in ref) {
    return ref[defaultValueCacheKey];
  }
  return ref[defaultValueCacheKey] = ref.defaultValue();
};
var serviceNotFoundError = (service3) => {
  const error = new Error(`Service not found${service3.key ? `: ${String(service3.key)}` : ""}`);
  if (error.stack) {
    const lines4 = error.stack.split("\n");
    lines4.splice(1, 3);
    error.stack = lines4.join("\n");
  }
  return error;
};
var getOption = /* @__PURE__ */ dual(2, (self, service3) => {
  const value3 = lookup(self, service3.key);
  if (value3 !== notFound) return some2(value3);
  return isReference(service3) ? some2(getDefaultValue(service3)) : none2();
});
var merge = /* @__PURE__ */ dual(2, (self, that) => {
  if (self.mapUnsafe.size === 0) return that;
  if (that.mapUnsafe.size === 0) return self;
  return withFlat(self, (map10) => that.mapUnsafe.forEach((value3, key) => map10.set(key, value3)));
});
var mergeAll = (...ctxs) => {
  const map10 = /* @__PURE__ */ new Map();
  for (let i = 0; i < ctxs.length; i++) {
    ctxs[i].mapUnsafe.forEach((value3, key) => {
      map10.set(key, value3);
    });
  }
  return makeUnsafe(map10);
};
var pick = (...services) => (self) => {
  if (services.length <= 1) {
    const map10 = /* @__PURE__ */ new Map();
    if (services.length === 1) {
      const key = services[0].key;
      const value3 = lookup(self, key);
      if (value3 !== notFound) map10.set(key, value3);
    }
    return makeUnsafe(map10);
  }
  const keep = new Set(services.map((key) => key.key));
  return withFlat(self, (map10) => map10.forEach((_, key) => {
    if (!keep.has(key)) map10.delete(key);
  }));
};
var omit = (...keys3) => (self) => withFlat(self, (map10) => {
  for (let i = 0; i < keys3.length; i++) {
    map10.delete(keys3[i].key);
  }
});
var Reference = Service;

// node_modules/effect/dist/internal/array.js
var isArrayNonEmpty = (self) => self.length > 0;

// node_modules/effect/dist/internal/count.js
var normalize = (n) => n > 0 ? Math.floor(n) : 0;

// node_modules/effect/dist/Result.js
var Result_exports = {};
__export(Result_exports, {
  Do: () => Do,
  all: () => all,
  andThen: () => andThen,
  bind: () => bind2,
  bindTo: () => bindTo2,
  fail: () => fail2,
  failVoid: () => failVoid,
  filterOrFail: () => filterOrFail,
  flatMap: () => flatMap2,
  flip: () => flip,
  fromNullishOr: () => fromNullishOr2,
  fromOption: () => fromOption2,
  gen: () => gen,
  getFailure: () => getFailure2,
  getOrElse: () => getOrElse3,
  getOrNull: () => getOrNull2,
  getOrThrow: () => getOrThrow,
  getOrThrowWith: () => getOrThrowWith,
  getOrUndefined: () => getOrUndefined3,
  getSuccess: () => getSuccess2,
  isFailure: () => isFailure2,
  isResult: () => isResult2,
  isSuccess: () => isSuccess2,
  let: () => let_2,
  liftPredicate: () => liftPredicate,
  makeEquivalence: () => makeEquivalence,
  map: () => map2,
  mapBoth: () => mapBoth,
  mapError: () => mapError,
  match: () => match2,
  merge: () => merge2,
  orElse: () => orElse,
  succeed: () => succeed2,
  succeedNone: () => succeedNone,
  succeedSome: () => succeedSome,
  tap: () => tap,
  transposeMapOption: () => transposeMapOption,
  transposeOption: () => transposeOption,
  try: () => try_,
  void: () => void_
});
var succeed2 = succeed;
var fail2 = fail;
var void_ = /* @__PURE__ */ succeed2(void 0);
var failVoid = /* @__PURE__ */ fail2(void 0);
var fromNullishOr2 = /* @__PURE__ */ dual(2, (self, onNullish) => self == null ? fail2(onNullish(self)) : succeed2(self));
var fromOption2 = fromOption;
var try_ = (evaluate3) => {
  if (isFunction(evaluate3)) {
    try {
      return succeed2(evaluate3());
    } catch (e) {
      return fail2(e);
    }
  } else {
    try {
      return succeed2(evaluate3.try());
    } catch (e) {
      return fail2(evaluate3.catch(e));
    }
  }
};
var isResult2 = isResult;
var isFailure2 = isFailure;
var isSuccess2 = isSuccess;
var getSuccess2 = getSuccess;
var getFailure2 = getFailure;
var makeEquivalence = (success, failure) => make((x, y) => isFailure2(x) ? isFailure2(y) && failure(x.failure, y.failure) : isSuccess2(y) && success(x.success, y.success));
var mapBoth = /* @__PURE__ */ dual(2, (self, {
  onFailure,
  onSuccess
}) => isFailure2(self) ? fail2(onFailure(self.failure)) : succeed2(onSuccess(self.success)));
var mapError = /* @__PURE__ */ dual(2, (self, f) => isFailure2(self) ? fail2(f(self.failure)) : self);
var map2 = /* @__PURE__ */ dual(2, (self, f) => isSuccess2(self) ? succeed2(f(self.success)) : self);
var match2 = /* @__PURE__ */ dual(2, (self, {
  onFailure,
  onSuccess
}) => isFailure2(self) ? onFailure(self.failure) : onSuccess(self.success));
var liftPredicate = /* @__PURE__ */ dual(3, (a, predicate, orFailWith) => predicate(a) ? succeed2(a) : fail2(orFailWith(a)));
var filterOrFail = /* @__PURE__ */ dual(3, (self, predicate, orFailWith) => flatMap2(self, (a) => predicate(a) ? succeed2(a) : fail2(orFailWith(a))));
var merge2 = /* @__PURE__ */ match2({
  onFailure: identity,
  onSuccess: identity
});
var getOrElse3 = /* @__PURE__ */ dual(2, (self, onFailure) => isFailure2(self) ? onFailure(self.failure) : self.success);
var getOrNull2 = /* @__PURE__ */ getOrElse3(constNull);
var getOrUndefined3 = /* @__PURE__ */ getOrElse3(constUndefined);
var getOrThrowWith = /* @__PURE__ */ dual(2, (self, onFailure) => {
  if (isSuccess2(self)) {
    return self.success;
  }
  throw onFailure(self.failure);
});
var getOrThrow = /* @__PURE__ */ getOrThrowWith(identity);
var orElse = /* @__PURE__ */ dual(2, (self, that) => isFailure2(self) ? that(self.failure) : succeed2(self.success));
var flatMap2 = /* @__PURE__ */ dual(2, (self, f) => isFailure2(self) ? fail2(self.failure) : f(self.success));
var andThen = /* @__PURE__ */ dual(2, (self, f) => flatMap2(self, (a) => {
  const out = isFunction(f) ? f(a) : f;
  return isResult2(out) ? out : succeed2(out);
}));
var all = (input) => {
  if (Symbol.iterator in input) {
    const out2 = [];
    for (const e of input) {
      if (isFailure2(e)) {
        return e;
      }
      out2.push(e.success);
    }
    return succeed2(out2);
  }
  const out = {};
  for (const key of Object.keys(input)) {
    const e = input[key];
    if (isFailure2(e)) {
      return e;
    }
    assignProperty(out, key, e.success);
  }
  return succeed2(out);
};
var flip = (self) => isFailure2(self) ? succeed2(self.failure) : fail2(self.success);
var gen = (...args2) => {
  const f = args2.length === 1 ? args2[0] : args2[1].bind(args2[0]);
  const iterator = f();
  let state = iterator.next();
  while (!state.done) {
    const current = state.value;
    if (isFailure2(current)) {
      return current;
    }
    state = iterator.next(current.success);
  }
  return succeed2(state.value);
};
var Do = /* @__PURE__ */ succeed2({});
var bind2 = /* @__PURE__ */ bind(map2, flatMap2);
var bindTo2 = /* @__PURE__ */ bindTo(map2);
var let_2 = /* @__PURE__ */ let_(map2);
var transposeOption = (self) => {
  return isNone(self) ? succeedNone : map2(self.value, some);
};
var transposeMapOption = /* @__PURE__ */ dual(2, (self, f) => isNone(self) ? succeedNone : map2(f(self.value), some));
var succeedNone = /* @__PURE__ */ succeed2(none);
var succeedSome = (a) => succeed2(some(a));
var tap = /* @__PURE__ */ dual(2, (self, f) => {
  if (isSuccess2(self)) {
    f(self.success);
  }
  return self;
});

// node_modules/effect/dist/Tuple.js
var makeEquivalence2 = Tuple;

// node_modules/effect/dist/Iterable.js
var findFirst = /* @__PURE__ */ dual(2, (self, f) => {
  let i = 0;
  for (const a of self) {
    const o = f(a, i);
    if (isBoolean(o)) {
      if (o) {
        return some2(a);
      }
    } else {
      if (isSome2(o)) {
        return o;
      }
    }
    i++;
  }
  return none2();
});
var filter2 = /* @__PURE__ */ dual(2, (self, predicate) => ({
  [Symbol.iterator]() {
    const iterator = self[Symbol.iterator]();
    let i = 0;
    return {
      next() {
        let result3 = iterator.next();
        while (!result3.done) {
          if (predicate(result3.value, i++)) {
            return {
              done: false,
              value: result3.value
            };
          }
          result3 = iterator.next();
        }
        return {
          done: true,
          value: void 0
        };
      }
    };
  }
}));

// node_modules/effect/dist/Record.js
var has = /* @__PURE__ */ dual(2, (self, key) => Object.hasOwn(self, key));
var map3 = /* @__PURE__ */ dual(2, (self, f) => {
  const out = {
    ...self
  };
  for (const key of keys(self)) {
    assignProperty(out, key, f(self[key], key));
  }
  return out;
});
var keys = (self) => Object.keys(self);
var isSubrecordBy = (equivalence) => dual(2, (self, that) => {
  for (const key of keys(self)) {
    if (!has(that, key) || !equivalence(self[key], that[key])) {
      return false;
    }
  }
  return true;
});
var makeEquivalence3 = (equivalence) => {
  const is3 = isSubrecordBy(equivalence);
  return (self, that) => is3(self, that) && is3(that, self);
};

// node_modules/effect/dist/Array.js
var Array2 = globalThis.Array;
var fromIterable = (collection) => Array2.isArray(collection) ? collection : Array2.from(collection);
var append = /* @__PURE__ */ dual(2, (self, last) => [...self, last]);
var isArray = Array2.isArray;
var isArrayNonEmpty2 = isArrayNonEmpty;
var isReadonlyArrayNonEmpty = isArrayNonEmpty;
function isCanonicalArrayIndex(key) {
  const index2 = Number(key);
  return String(index2) === key && Number.isInteger(index2) && index2 >= 0 && index2 < 2 ** 32 - 1;
}
var findFirst2 = findFirst;
var hashBucketsAdd = (buckets, value3) => {
  const hash2 = hash(value3);
  const bucket = buckets.get(hash2);
  if (bucket === void 0) {
    buckets.set(hash2, [value3]);
    return true;
  }
  for (const previous of bucket) {
    if (equals(previous, value3)) {
      return false;
    }
  }
  bucket.push(value3);
  return true;
};
var empty2 = () => [];
var map4 = /* @__PURE__ */ dual(2, (self, f) => self.map(f));
var partition = /* @__PURE__ */ dual(2, (self, f) => {
  const passes = [];
  const fails = [];
  let i = 0;
  for (const a of self) {
    const result3 = f(a, i++);
    if (isSuccess2(result3)) {
      passes.push(result3.success);
    } else {
      fails.push(result3.failure);
    }
  }
  return [passes, fails];
});
var makeEquivalence4 = Array_;
var dedupe = (self) => {
  const input = fromIterable(self);
  if (input.length < 2) {
    return [...input];
  }
  const buckets = /* @__PURE__ */ new Map();
  const out = [];
  for (const value3 of input) {
    if (hashBucketsAdd(buckets, value3)) {
      out.push(value3);
    }
  }
  return out;
};

// node_modules/effect/dist/Duration.js
var TypeId4 = "~effect/Duration";
var bigint0 = /* @__PURE__ */ BigInt(0);
var bigint1 = /* @__PURE__ */ BigInt(1);
var bigint2 = /* @__PURE__ */ BigInt(2);
var bigint10 = /* @__PURE__ */ BigInt(10);
var bigint24 = /* @__PURE__ */ BigInt(24);
var bigint60 = /* @__PURE__ */ BigInt(60);
var bigint1e3 = /* @__PURE__ */ BigInt(1e3);
var bigint1e6 = /* @__PURE__ */ BigInt(1e6);
var roundTiesAwayFromZero = (input) => BigInt(Math.sign(input) * Math.round(Math.abs(input)));
var roundMillisToNanos = (millis2) => Number.isInteger(millis2) ? BigInt(millis2) * bigint1e6 : roundTiesAwayFromZero(millis2 * 1e6);
var fromNanosNumber = (nanos2) => make4(Number.isFinite(nanos2) ? roundTiesAwayFromZero(nanos2) : nanos2);
var parseNanos = (input, scale) => {
  const decimalIndex = input.indexOf(".");
  if (decimalIndex === -1) return BigInt(input) * scale;
  const isNegative2 = input[0] === "-";
  const fractional = input.slice(decimalIndex + 1);
  const fractionalScale = bigint10 ** BigInt(fractional.length);
  const scaled = (BigInt(input.slice(isNegative2 ? 1 : 0, decimalIndex)) * fractionalScale + BigInt(fractional)) * scale;
  return divideTiesAwayFromZero(isNegative2 ? -scaled : scaled, fractionalScale);
};
var divideTiesAwayFromZero = (numerator, denominator) => {
  const absolute = numerator < bigint0 ? -numerator : numerator;
  const rounded = absolute / denominator + (absolute % denominator * bigint2 >= denominator ? bigint1 : bigint0);
  return numerator < bigint0 ? -rounded : rounded;
};
var DURATION_REGEXP = /^(-?\d+(?:\.\d+)?)\s+(nanos?|micros?|millis?|seconds?|minutes?|hours?|days?|weeks?)$/;
var fromInputUnsafe = (input) => {
  switch (typeof input) {
    case "number":
      return millis(input);
    case "bigint":
      return nanos(input);
    case "string": {
      if (input === "Infinity") {
        return infinity;
      }
      if (input === "-Infinity") {
        return negativeInfinity;
      }
      const match7 = DURATION_REGEXP.exec(input);
      if (!match7) break;
      const [_, valueStr, unit] = match7;
      if (unit === "nano" || unit === "nanos") {
        return nanos(parseNanos(valueStr, bigint1));
      }
      if (unit === "micro" || unit === "micros") {
        return nanos(parseNanos(valueStr, bigint1e3));
      }
      const value3 = Number(valueStr);
      switch (unit) {
        case "milli":
        case "millis":
          return millis(value3);
        case "second":
        case "seconds":
          return seconds(value3);
        case "minute":
        case "minutes":
          return minutes(value3);
        case "hour":
        case "hours":
          return hours(value3);
        case "day":
        case "days":
          return days(value3);
        case "week":
        case "weeks":
          return weeks(value3);
      }
      break;
    }
    case "object": {
      if (input === null) break;
      if (TypeId4 in input) return input;
      if (Array.isArray(input)) {
        if (input.length !== 2 || !input.every(isNumber)) {
          return invalid(input);
        }
        if (Number.isNaN(input[0]) || Number.isNaN(input[1])) {
          return zero;
        }
        if (input[0] === -Infinity || input[1] === -Infinity) {
          return negativeInfinity;
        }
        if (input[0] === Infinity || input[1] === Infinity) {
          return infinity;
        }
        return fromNanosNumber(input[0] * 1e9 + input[1]);
      }
      const obj = input;
      let millis2 = 0;
      if (obj.weeks) millis2 += obj.weeks * 6048e5;
      if (obj.days) millis2 += obj.days * 864e5;
      if (obj.hours) millis2 += obj.hours * 36e5;
      if (obj.minutes) millis2 += obj.minutes * 6e4;
      if (obj.seconds) millis2 += obj.seconds * 1e3;
      if (obj.milliseconds) millis2 += obj.milliseconds;
      if (!obj.microseconds && !obj.nanoseconds) return make4(millis2);
      return fromNanosNumber(millis2 * 1e6 + (obj.microseconds ?? 0) * 1e3 + (obj.nanoseconds ?? 0));
    }
  }
  return invalid(input);
};
var invalid = (input) => {
  throw new Error(`Invalid Input: ${input}`);
};
var fromInput = /* @__PURE__ */ liftThrowable(fromInputUnsafe);
var zeroDurationValue = {
  _tag: "Millis",
  millis: 0
};
var infinityDurationValue = {
  _tag: "Infinity"
};
var negativeInfinityDurationValue = {
  _tag: "NegativeInfinity"
};
var DurationProto = {
  [TypeId4]: TypeId4,
  [symbol]() {
    switch (this.value._tag) {
      case "Millis":
        return hash(roundMillisToNanos(this.value.millis));
      case "Nanos":
        return hash(this.value.nanos);
      default:
        return structure(this.value);
    }
  },
  [symbol2](that) {
    return isDuration(that) && equals2(this, that);
  },
  toString() {
    switch (this.value._tag) {
      case "Infinity":
        return "Infinity";
      case "NegativeInfinity":
        return "-Infinity";
      case "Nanos":
        return `${this.value.nanos} nanos`;
      case "Millis":
        return `${this.value.millis} millis`;
    }
  },
  toJSON() {
    switch (this.value._tag) {
      case "Millis":
        return {
          _id: "Duration",
          _tag: "Millis",
          millis: this.value.millis
        };
      case "Nanos":
        return {
          _id: "Duration",
          _tag: "Nanos",
          nanos: String(this.value.nanos)
        };
      case "Infinity":
        return {
          _id: "Duration",
          _tag: "Infinity"
        };
      case "NegativeInfinity":
        return {
          _id: "Duration",
          _tag: "NegativeInfinity"
        };
    }
  },
  [NodeInspectSymbol]() {
    return this.toJSON();
  },
  pipe() {
    return pipeArguments(this, arguments);
  }
};
var make4 = (input) => {
  const duration = Object.create(DurationProto);
  if (typeof input === "number") {
    if (isNaN(input) || input === 0 || Object.is(input, -0)) {
      duration.value = zeroDurationValue;
    } else if (!Number.isFinite(input)) {
      duration.value = input > 0 ? infinityDurationValue : negativeInfinityDurationValue;
    } else if (!Number.isInteger(input)) {
      duration.value = {
        _tag: "Nanos",
        nanos: roundMillisToNanos(input)
      };
    } else {
      duration.value = {
        _tag: "Millis",
        millis: input
      };
    }
  } else if (input === bigint0) {
    duration.value = zeroDurationValue;
  } else {
    duration.value = {
      _tag: "Nanos",
      nanos: input
    };
  }
  return duration;
};
var isDuration = (u) => hasProperty(u, TypeId4);
var isFinite = (self) => self.value._tag !== "Infinity" && self.value._tag !== "NegativeInfinity";
var isZero = (self) => {
  switch (self.value._tag) {
    case "Millis":
      return self.value.millis === 0;
    case "Nanos":
      return self.value.nanos === bigint0;
    case "Infinity":
    case "NegativeInfinity":
      return false;
  }
};
var isNegative = (self) => {
  switch (self.value._tag) {
    case "Millis":
      return self.value.millis < 0;
    case "Nanos":
      return self.value.nanos < bigint0;
    case "NegativeInfinity":
      return true;
    case "Infinity":
      return false;
  }
};
var abs = (self) => {
  switch (self.value._tag) {
    case "Infinity":
    case "NegativeInfinity":
      return infinity;
    case "Millis":
      return self.value.millis < 0 ? make4(-self.value.millis) : self;
    case "Nanos":
      return self.value.nanos < bigint0 ? make4(-self.value.nanos) : self;
  }
};
var zero = /* @__PURE__ */ make4(0);
var infinity = /* @__PURE__ */ make4(Infinity);
var negativeInfinity = /* @__PURE__ */ make4(-Infinity);
var nanos = (nanos2) => make4(nanos2);
var millis = (millis2) => make4(millis2);
var seconds = (seconds2) => make4(seconds2 * 1e3);
var minutes = (minutes2) => make4(minutes2 * 6e4);
var hours = (hours2) => make4(hours2 * 36e5);
var days = (days2) => make4(days2 * 864e5);
var weeks = (weeks2) => make4(weeks2 * 6048e5);
var toMillis = (self) => match3(fromInputUnsafe(self), {
  onMillis: identity,
  onNanos: (nanos2) => Number(nanos2) / 1e6,
  onInfinity: () => Infinity,
  onNegativeInfinity: () => -Infinity
});
var toSeconds = (self) => match3(fromInputUnsafe(self), {
  onMillis: (millis2) => millis2 / 1e3,
  onNanos: (nanos2) => Number(nanos2) / 1e9,
  onInfinity: () => Infinity,
  onNegativeInfinity: () => -Infinity
});
var toNanosUnsafe = (input) => {
  const self = fromInputUnsafe(input);
  switch (self.value._tag) {
    case "Infinity":
    case "NegativeInfinity":
      throw new Error("Cannot convert infinite duration to nanos");
    case "Nanos":
      return self.value.nanos;
    case "Millis":
      return roundMillisToNanos(self.value.millis);
  }
};
var toNanos = /* @__PURE__ */ liftThrowable(toNanosUnsafe);
var match3 = /* @__PURE__ */ dual(2, (self, options) => {
  switch (self.value._tag) {
    case "Millis":
      return options.onMillis(self.value.millis);
    case "Nanos":
      return options.onNanos(self.value.nanos);
    case "Infinity":
      return options.onInfinity();
    case "NegativeInfinity":
      return (options.onNegativeInfinity ?? options.onInfinity)();
  }
});
var matchPair = /* @__PURE__ */ dual(3, (self, that, options) => {
  if (self.value._tag === "Infinity" || self.value._tag === "NegativeInfinity" || that.value._tag === "Infinity" || that.value._tag === "NegativeInfinity") return options.onInfinity(self, that);
  if (self.value._tag === "Millis") {
    return that.value._tag === "Millis" ? options.onMillis(self.value.millis, that.value.millis) : options.onNanos(toNanosUnsafe(self), that.value.nanos);
  } else {
    return options.onNanos(self.value.nanos, toNanosUnsafe(that));
  }
});
var Equivalence = (self, that) => matchPair(self, that, {
  onMillis: (self2, that2) => self2 === that2,
  onNanos: (self2, that2) => self2 === that2,
  onInfinity: (self2, that2) => self2.value._tag === that2.value._tag
});
var subtract = /* @__PURE__ */ dual(2, (self, that) => matchPair(self, that, {
  onMillis: (self2, that2) => make4(self2 - that2),
  onNanos: (self2, that2) => make4(self2 - that2),
  onInfinity: (self2, that2) => {
    const s = self2.value._tag;
    const t = that2.value._tag;
    if (s === "Infinity") return t === "Infinity" ? zero : infinity;
    if (s === "NegativeInfinity") return t === "NegativeInfinity" ? zero : negativeInfinity;
    return t === "Infinity" ? negativeInfinity : infinity;
  }
}));
var equals2 = /* @__PURE__ */ dual(2, (self, that) => Equivalence(self, that));
var parts = (self) => {
  if (self.value._tag === "Infinity") {
    return {
      days: Infinity,
      hours: Infinity,
      minutes: Infinity,
      seconds: Infinity,
      millis: Infinity,
      nanos: Infinity
    };
  }
  if (self.value._tag === "NegativeInfinity") {
    return {
      days: -Infinity,
      hours: -Infinity,
      minutes: -Infinity,
      seconds: -Infinity,
      millis: -Infinity,
      nanos: -Infinity
    };
  }
  const n = toNanosUnsafe(self);
  const neg = n < bigint0;
  const a = neg ? -n : n;
  const ms = a / bigint1e6;
  const sec = ms / bigint1e3;
  const min5 = sec / bigint60;
  const hr = min5 / bigint60;
  const d = hr / bigint24;
  const sign2 = neg ? -1 : 1;
  return {
    days: sign2 * Number(d),
    hours: sign2 * Number(hr % bigint24),
    minutes: sign2 * Number(min5 % bigint60),
    seconds: sign2 * Number(sec % bigint60),
    millis: sign2 * Number(ms % bigint1e3),
    nanos: sign2 * Number(a % bigint1e6)
  };
};
var format2 = (self) => {
  if (self.value._tag === "Infinity") {
    return "Infinity";
  }
  if (self.value._tag === "NegativeInfinity") {
    return "-Infinity";
  }
  if (isZero(self)) {
    return "0";
  }
  if (isNegative(self)) {
    return "-" + format2(abs(self));
  }
  const fragments = parts(self);
  const pieces = [];
  if (fragments.days !== 0) {
    pieces.push(`${fragments.days}d`);
  }
  if (fragments.hours !== 0) {
    pieces.push(`${fragments.hours}h`);
  }
  if (fragments.minutes !== 0) {
    pieces.push(`${fragments.minutes}m`);
  }
  if (fragments.seconds !== 0) {
    pieces.push(`${fragments.seconds}s`);
  }
  if (fragments.millis !== 0) {
    pieces.push(`${fragments.millis}ms`);
  }
  if (fragments.nanos !== 0) {
    pieces.push(`${fragments.nanos}ns`);
  }
  return pieces.join(" ");
};

// node_modules/effect/dist/Scheduler.js
var Scheduler = /* @__PURE__ */ Reference("effect/Scheduler", {
  fiberCached: true,
  defaultValue: () => new MixedScheduler()
});
var setMicrotask = (f) => {
  let cancelled = false;
  Promise.resolve().then(() => {
    if (!cancelled) f();
  });
  return () => {
    cancelled = true;
  };
};
var setTimer = "setImmediate" in globalThis ? (f) => {
  const timer = globalThis.setImmediate(f);
  return () => globalThis.clearImmediate(timer);
} : (f) => {
  const timer = setTimeout(f, 0);
  return () => clearTimeout(timer);
};
var setImmediate = (f) => {
  try {
    return setTimer(f);
  } catch {
    return setMicrotask(f);
  }
};
var PriorityBuckets = class {
  buckets = [];
  scheduleTask(task, priority) {
    const buckets = this.buckets;
    const len = buckets.length;
    let bucket;
    let index2 = 0;
    for (; index2 < len; index2++) {
      if (buckets[index2][0] > priority) break;
      bucket = buckets[index2];
    }
    if (bucket && bucket[0] === priority) {
      bucket[1].push(task);
    } else if (index2 === len) {
      buckets.push([priority, [task]]);
    } else {
      buckets.splice(index2, 0, [priority, [task]]);
    }
  }
  drain() {
    const buckets = this.buckets;
    this.buckets = [];
    return buckets;
  }
};
var MixedScheduler = class {
  executionMode;
  setImmediate;
  constructor(executionMode = "async", setImmediateFn) {
    this.executionMode = executionMode;
    this.setImmediate = setImmediateFn ?? (executionMode === "sync" ? setMicrotask : setImmediate);
  }
  /**
   * Returns whether the fiber has reached its operation budget and should yield.
   *
   * **When to use**
   *
   * Use to decide whether a fiber should yield after consuming its current
   * operation budget.
   *
   * @since 2.0.0
   */
  shouldYield(fiber3) {
    return fiber3.currentOpCount >= fiber3.cache.maxOpsBeforeYield;
  }
  /**
   * Creates a dispatcher that schedules work through this scheduler.
   *
   * **When to use**
   *
   * Use when you need a standalone dispatcher from a scheduler instance, for
   * example in tests that enqueue tasks and then flush them deterministically.
   *
   * @since 4.0.0
   */
  makeDispatcher() {
    return new MixedSchedulerDispatcher(this.setImmediate);
  }
};
var MixedSchedulerDispatcher = class {
  tasks = /* @__PURE__ */ new PriorityBuckets();
  running = void 0;
  setImmediate;
  constructor(setImmediateFn = setImmediate) {
    this.setImmediate = setImmediateFn;
  }
  /**
   * @since 2.0.0
   */
  scheduleTask(task, priority) {
    this.tasks.scheduleTask(task, priority);
    if (this.running === void 0) {
      this.running = this.setImmediate(this.afterScheduled);
    }
  }
  /**
   * @since 2.0.0
   */
  afterScheduled = () => {
    this.running = void 0;
    this.runTasks();
  };
  /**
   * @since 2.0.0
   */
  runTasks() {
    const buckets = this.tasks.drain();
    for (let i = 0; i < buckets.length; i++) {
      const toRun = buckets[i][1];
      for (let j = 0; j < toRun.length; j++) {
        toRun[j]();
      }
    }
  }
  /**
   * @since 2.0.0
   */
  flush() {
    while (this.tasks.buckets.length > 0) {
      if (this.running !== void 0) {
        this.running();
        this.running = void 0;
      }
      this.runTasks();
    }
  }
};
var MaxOpsBeforeYield = /* @__PURE__ */ Reference("effect/Scheduler/MaxOpsBeforeYield", {
  fiberCached: true,
  defaultValue: () => 2048
});
var PreventSchedulerYield = /* @__PURE__ */ Reference("effect/Scheduler/PreventSchedulerYield", {
  fiberCached: true,
  defaultValue: () => false
});

// node_modules/effect/dist/Tracer.js
var Tracer_exports = {};
__export(Tracer_exports, {
  CurrentTraceLevel: () => CurrentTraceLevel,
  DisablePropagation: () => DisablePropagation,
  MinimumTraceLevel: () => MinimumTraceLevel,
  NativeSpan: () => NativeSpan,
  ParentSpan: () => ParentSpan,
  ParentSpanKey: () => ParentSpanKey,
  Tracer: () => Tracer,
  TracerKey: () => TracerKey,
  externalSpan: () => externalSpan,
  make: () => make5,
  nativeTracer: () => nativeTracer
});

// node_modules/effect/dist/Data.js
var Data_exports = {};
__export(Data_exports, {
  Class: () => Class3,
  Error: () => Error3,
  TaggedClass: () => TaggedClass,
  TaggedError: () => TaggedError2,
  taggedEnum: () => taggedEnum
});
var Class3 = class extends Class {
  constructor(props) {
    super();
    if (props) {
      assignProperties(this, props);
    }
  }
};
var TaggedClass = (tag2) => class extends Class3 {
  _tag = tag2;
};
var taggedEnum = () => new Proxy({}, {
  get(_target, tag2, _receiver) {
    if (tag2 === "$is") {
      return isTagged;
    } else if (tag2 === "$match") {
      return taggedMatch;
    }
    return (props) => ({
      ...props,
      _tag: tag2
    });
  }
});
function taggedMatch() {
  if (arguments.length === 1) {
    const cases2 = arguments[0];
    return function(value4) {
      return cases2[value4._tag](value4);
    };
  }
  const value3 = arguments[0];
  const cases = arguments[1];
  return cases[value3._tag](value3);
}
var Error3 = Error2;
var TaggedError2 = TaggedError;

// node_modules/effect/dist/encoding/EncodingError.js
var EncodingErrorTypeId = "~effect/encoding/EncodingError";
var EncodingError = class extends (/* @__PURE__ */ TaggedError2("EncodingError")) {
  /**
   * Marks this value as an encoding or decoding error for runtime guards.
   *
   * **When to use**
   *
   * Use to identify `EncodingError` instances through `isEncodingError`.
   *
   * @since 4.0.0
   */
  [EncodingErrorTypeId] = EncodingErrorTypeId;
};

// node_modules/effect/dist/encoding/Hex.js
var encode = (input) => typeof input === "string" ? hexEncodeUint8Array(encoder.encode(input)) : hexEncodeUint8Array(input);
var random2 = (length) => {
  switch (length) {
    case 16:
      return random16();
    case 32:
      return random32();
    default: {
      let result3 = "";
      for (let i = length >>> 3; i > 0; i--) {
        result3 += random8();
      }
      return result3;
    }
  }
};
var hexCharCodes = /* @__PURE__ */ Uint8Array.from("0123456789abcdef", (c) => c.charCodeAt(0));
var randomWord = () => Math.random() * 4294967296 >>> 0;
var random8 = () => {
  const a = randomWord();
  return String.fromCharCode(hexCharCodes[a >>> 28], hexCharCodes[a >>> 24 & 15], hexCharCodes[a >>> 20 & 15], hexCharCodes[a >>> 16 & 15], hexCharCodes[a >>> 12 & 15], hexCharCodes[a >>> 8 & 15], hexCharCodes[a >>> 4 & 15], hexCharCodes[a & 15]);
};
var random16 = () => {
  const a = randomWord();
  const b = randomWord();
  return String.fromCharCode(hexCharCodes[a >>> 28], hexCharCodes[a >>> 24 & 15], hexCharCodes[a >>> 20 & 15], hexCharCodes[a >>> 16 & 15], hexCharCodes[a >>> 12 & 15], hexCharCodes[a >>> 8 & 15], hexCharCodes[a >>> 4 & 15], hexCharCodes[a & 15], hexCharCodes[b >>> 28], hexCharCodes[b >>> 24 & 15], hexCharCodes[b >>> 20 & 15], hexCharCodes[b >>> 16 & 15], hexCharCodes[b >>> 12 & 15], hexCharCodes[b >>> 8 & 15], hexCharCodes[b >>> 4 & 15], hexCharCodes[b & 15]);
};
var random32 = () => {
  const a = randomWord();
  const b = randomWord();
  const c = randomWord();
  const d = randomWord();
  return String.fromCharCode(hexCharCodes[a >>> 28], hexCharCodes[a >>> 24 & 15], hexCharCodes[a >>> 20 & 15], hexCharCodes[a >>> 16 & 15], hexCharCodes[a >>> 12 & 15], hexCharCodes[a >>> 8 & 15], hexCharCodes[a >>> 4 & 15], hexCharCodes[a & 15], hexCharCodes[b >>> 28], hexCharCodes[b >>> 24 & 15], hexCharCodes[b >>> 20 & 15], hexCharCodes[b >>> 16 & 15], hexCharCodes[b >>> 12 & 15], hexCharCodes[b >>> 8 & 15], hexCharCodes[b >>> 4 & 15], hexCharCodes[b & 15], hexCharCodes[c >>> 28], hexCharCodes[c >>> 24 & 15], hexCharCodes[c >>> 20 & 15], hexCharCodes[c >>> 16 & 15], hexCharCodes[c >>> 12 & 15], hexCharCodes[c >>> 8 & 15], hexCharCodes[c >>> 4 & 15], hexCharCodes[c & 15], hexCharCodes[d >>> 28], hexCharCodes[d >>> 24 & 15], hexCharCodes[d >>> 20 & 15], hexCharCodes[d >>> 16 & 15], hexCharCodes[d >>> 12 & 15], hexCharCodes[d >>> 8 & 15], hexCharCodes[d >>> 4 & 15], hexCharCodes[d & 15]);
};
var decode = (str) => {
  const bytes3 = new TextEncoder().encode(str);
  if (bytes3.length % 2 !== 0) {
    return fail2(new EncodingError({
      module: "Hex",
      kind: "Decode",
      input: str,
      message: `Length must be a multiple of 2, but is ${bytes3.length}`
    }));
  }
  try {
    const length = bytes3.length / 2;
    const result3 = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
      const a = fromHexChar(bytes3[i * 2]);
      const b = fromHexChar(bytes3[i * 2 + 1]);
      result3[i] = a << 4 | b;
    }
    return succeed2(result3);
  } catch (e) {
    return fail2(new EncodingError({
      module: "Hex",
      kind: "Decode",
      input: str,
      message: e instanceof Error ? e.message : "Invalid input"
    }));
  }
};
var decodeString = (str) => map2(decode(str), (_) => decoder.decode(_));
var encoder = /* @__PURE__ */ new TextEncoder();
var decoder = /* @__PURE__ */ new TextDecoder();
var byteToHex = /* @__PURE__ */ Array.from({
  length: 256
}, (_, i) => i.toString(16).padStart(2, "0"));
var hexEncodeUint8Array = (bytes3) => {
  let result3 = "";
  for (let i = 0; i < bytes3.length; i++) {
    result3 += byteToHex[bytes3[i]];
  }
  return result3;
};
var fromHexChar = (byte) => {
  if (48 <= byte && byte <= 57) {
    return byte - 48;
  }
  if (97 <= byte && byte <= 102) {
    return byte - 97 + 10;
  }
  if (65 <= byte && byte <= 70) {
    return byte - 65 + 10;
  }
  throw new TypeError("Invalid input");
};

// node_modules/effect/dist/Tracer.js
var ParentSpanKey = "effect/Tracer/ParentSpan";
var ParentSpan = class extends (/* @__PURE__ */ Service()(ParentSpanKey, {
  fiberCached: true
})) {
};
var make5 = (options) => options;
var externalSpan = (options) => ({
  _tag: "ExternalSpan",
  spanId: options.spanId,
  traceId: options.traceId,
  sampled: options.sampled ?? true,
  annotations: options.annotations ?? empty()
});
var DisablePropagation = /* @__PURE__ */ Reference("effect/Tracer/DisablePropagation", {
  defaultValue: constFalse
});
var CurrentTraceLevel = /* @__PURE__ */ Reference("effect/Tracer/CurrentTraceLevel", {
  defaultValue: () => "Info"
});
var MinimumTraceLevel = /* @__PURE__ */ Reference("effect/Tracer/MinimumTraceLevel", {
  defaultValue: () => "All"
});
var TracerKey = "effect/Tracer";
var Tracer = /* @__PURE__ */ Reference(TracerKey, {
  fiberCached: true,
  defaultValue: () => nativeTracer
});
var nativeTracer = /* @__PURE__ */ make5({
  span: (options) => new NativeSpan(options)
});
var NativeSpan = class {
  _tag = "Span";
  sampled;
  name;
  parent;
  annotations;
  links;
  startTime;
  kind;
  status;
  _traceId = void 0;
  _spanId = void 0;
  _attributes = void 0;
  _events = void 0;
  constructor(options) {
    this.name = options.name;
    this.parent = options.parent;
    this.annotations = options.annotations;
    this.links = options.links;
    this.startTime = options.startTime;
    this.kind = options.kind;
    this.sampled = options.sampled;
    this.status = {
      _tag: "Started",
      startTime: options.startTime
    };
  }
  get traceId() {
    return this._traceId ??= getOrUndefined(this.parent)?.traceId ?? random2(32);
  }
  get spanId() {
    return this._spanId ??= random2(16);
  }
  get attributes() {
    return this._attributes ??= /* @__PURE__ */ new Map();
  }
  get events() {
    return this._events ??= [];
  }
  end(endTime, exit4) {
    this.status = {
      _tag: "Ended",
      endTime,
      exit: exit4,
      startTime: this.status.startTime
    };
  }
  attribute(key, value3) {
    this.attributes.set(key, value3);
  }
  event(name, startTime, attributes) {
    this.events.push([name, startTime, attributes ?? {}]);
  }
  addLinks(links) {
    this.links.push(...links);
  }
};

// node_modules/effect/dist/internal/metric.js
var FiberRuntimeMetricsKey = "effect/Metric/FiberRuntimeMetrics";

// node_modules/effect/dist/internal/references.js
var CurrentErrorReporters = /* @__PURE__ */ Reference("effect/ErrorReporter/CurrentErrorReporters", {
  defaultValue: () => /* @__PURE__ */ new Set()
});
var CurrentStackFrame = /* @__PURE__ */ Reference("effect/References/CurrentStackFrame", {
  fiberCached: true,
  defaultValue: constUndefined
});
var TracerEnabled = /* @__PURE__ */ Reference("effect/References/TracerEnabled", {
  fiberCached: true,
  defaultValue: constTrue
});
var TracerTimingEnabled = /* @__PURE__ */ Reference("effect/References/TracerTimingEnabled", {
  defaultValue: constTrue
});
var TracerSpanAnnotations = /* @__PURE__ */ Reference("effect/References/TracerSpanAnnotations", {
  defaultValue: () => ({})
});
var TracerSpanLinks = /* @__PURE__ */ Reference("effect/References/TracerSpanLinks", {
  defaultValue: () => []
});
var CurrentLogAnnotations = /* @__PURE__ */ Reference("effect/References/CurrentLogAnnotations", {
  defaultValue: () => ({})
});
var CurrentLogLevel = /* @__PURE__ */ Reference("effect/References/CurrentLogLevel", {
  fiberCached: true,
  defaultValue: () => "Info"
});
var MinimumLogLevel = /* @__PURE__ */ Reference("effect/References/MinimumLogLevel", {
  fiberCached: true,
  defaultValue: () => "Info"
});
var CurrentLogSpans = /* @__PURE__ */ Reference("effect/References/CurrentLogSpans", {
  defaultValue: () => []
});

// node_modules/effect/dist/internal/tracer.js
var addSpanStackTrace = (options) => {
  if (options?.captureStackTrace === false) {
    return options;
  } else if (options?.captureStackTrace !== void 0 && typeof options.captureStackTrace !== "boolean") {
    return options;
  }
  const limit = getStackTraceLimit();
  if (limit === 0 && options?.captureStackTrace !== true) {
    return {
      ...options,
      captureStackTrace: false
    };
  }
  setStackTraceLimit(3);
  const traceError = new Error();
  setStackTraceLimit(limit);
  return {
    ...options,
    captureStackTrace: spanCleaner(() => traceError.stack)
  };
};
var makeStackCleaner = (line) => (stack) => {
  let cache2;
  return () => {
    if (cache2 !== void 0) return cache2;
    const trace = stack();
    if (!trace) return void 0;
    const lines4 = trace.split("\n");
    if (lines4[line] !== void 0) {
      cache2 = lines4[line].trim();
      return cache2;
    }
  };
};
var spanCleaner = /* @__PURE__ */ makeStackCleaner(3);

// node_modules/effect/dist/internal/effect.js
var Interrupt = class extends ReasonBase {
  constructor(fiberId3, annotations = constEmptyAnnotations) {
    super("Interrupt", annotations, "Interrupted");
    this.fiberId = fiberId3;
  }
  toString() {
    return `Interrupt(${this.fiberId})`;
  }
  toJSON() {
    return {
      _tag: "Interrupt",
      fiberId: this.fiberId
    };
  }
  [symbol2](that) {
    return isInterruptReason(that) && this.fiberId === that.fiberId && this.annotations === that.annotations;
  }
  [symbol]() {
    return string(`${this._tag}:${this.fiberId}`);
  }
};
var makeInterruptReason = (fiberId3) => new Interrupt(fiberId3);
var causeInterrupt = (fiberId3) => new CauseImpl([new Interrupt(fiberId3)]);
var findFail = (self) => {
  const reason = self.reasons.find(isFailReason);
  return reason ? succeed2(reason) : fail2(self);
};
var findError = (self) => {
  for (let i = 0; i < self.reasons.length; i++) {
    const reason = self.reasons[i];
    if (reason._tag === "Fail") {
      return succeed2(reason.error);
    }
  }
  return fail2(self);
};
var hasDies = (self) => self.reasons.some(isDieReason);
var findDefect = (self) => {
  const reason = self.reasons.find(isDieReason);
  return reason ? succeed2(reason.defect) : fail2(self);
};
var hasInterrupts = (self) => self.reasons.some(isInterruptReason);
var causeFilterInterruptors = (self) => {
  let interruptors;
  for (let i = 0; i < self.reasons.length; i++) {
    const f = self.reasons[i];
    if (f._tag !== "Interrupt") continue;
    interruptors ??= /* @__PURE__ */ new Set();
    if (f.fiberId !== void 0) {
      interruptors.add(f.fiberId);
    }
  }
  return interruptors ? succeed2(interruptors) : fail2(self);
};
var hasInterruptsOnly = (self) => self.reasons.length > 0 && self.reasons.every(isInterruptReason);
var causeMap = /* @__PURE__ */ dual(2, (self, f) => {
  let hasFail = false;
  const failures = self.reasons.map((failure) => {
    if (isFailReason(failure)) {
      hasFail = true;
      return new Fail(f(failure.error), failure.annotations);
    }
    return failure;
  });
  return hasFail ? causeFromReasons(failures) : self;
});
var causeSquash = (self) => {
  let die4;
  for (const reason of self.reasons) {
    if (reason._tag === "Fail") return reason.error;
    if (reason._tag === "Die") die4 ??= reason;
  }
  if (die4 !== void 0) return die4.defect;
  if (self.reasons.length > 0) return new globalThis.Error("All fibers interrupted without error");
  return new globalThis.Error("Empty cause");
};
var causePrettyErrors = (self, options) => {
  const errors = [];
  const interrupts = [];
  if (self.reasons.length === 0) return errors;
  const prevStackLimit = getStackTraceLimit();
  if (prevStackLimit !== 0) setStackTraceLimit(1);
  try {
    for (const failure of self.reasons) {
      if (failure._tag === "Interrupt") {
        interrupts.push(failure);
        continue;
      }
      errors.push(causePrettyError(failure._tag === "Die" ? failure.defect : failure.error, failure.annotations, options));
    }
    if (errors.length === 0) {
      const cause = new Error("The fiber was interrupted by:");
      cause.name = "InterruptCause";
      cause.stack = interruptCauseStack(cause, interrupts);
      const error = new globalThis.Error("All fibers interrupted without error", {
        cause
      });
      error.name = "InterruptError";
      error.stack = `${error.name}: ${error.message}`;
      errors.push(causePrettyError(error, interrupts[0].annotations, options));
    }
  } finally {
    if (prevStackLimit !== 0) setStackTraceLimit(prevStackLimit);
  }
  return errors;
};
var causePrettyError = (original, annotations, options) => {
  const kind = typeof original;
  let error;
  if (original && kind === "object") {
    error = new globalThis.Error(causePrettyMessage(original), {
      cause: original.cause ? causePrettyError(original.cause) : void 0
    });
    if (typeof original.name === "string") {
      error.name = original.name;
    }
    if (typeof original.stack === "string") {
      error.stack = cleanErrorStack(original.stack, error, annotations);
    } else {
      const stack = `${error.name}: ${error.message}`;
      error.stack = annotations ? addStackAnnotations(stack, annotations) : stack;
    }
    if (options?.includeCauseInStack) {
      error.stack = renderPrettyError(error);
    }
    for (const key of Object.keys(original)) {
      if (!(key in error)) {
        ;
        error[key] = original[key];
      }
    }
  } else {
    error = new globalThis.Error(!original ? `Unknown error: ${original}` : kind === "string" ? original : formatJson(original));
    const stack = `${error.name}: ${error.message}`;
    error.stack = annotations ? addStackAnnotations(stack, annotations) : stack;
  }
  return error;
};
var causePrettyMessage = (u) => {
  if (typeof u.message === "string") {
    return u.message;
  } else if (typeof u.toString === "function" && u.toString !== Object.prototype.toString && u.toString !== Array.prototype.toString) {
    try {
      return u.toString();
    } catch {
    }
  }
  return formatJson(u);
};
var locationRegExp = /\((.*)\)/g;
var cleanErrorStack = (stack, error, annotations) => {
  const message = `${error.name}: ${error.message}`;
  const lines4 = (stack.startsWith(message) ? stack.slice(message.length) : stack).split("\n");
  const out = [message];
  for (let i = 1; i < lines4.length; i++) {
    if (/Generator\.next|~effect\/(?:Effect|Utils)/.test(lines4[i])) {
      break;
    }
    out.push(lines4[i]);
  }
  return annotations ? addStackAnnotations(out.join("\n"), annotations) : out.join("\n");
};
var addStackAnnotations = (stack, annotations) => {
  const frame = annotations?.get(StackTraceKey.key);
  if (frame) {
    stack = `${stack}
${currentStackTrace(frame)}`;
  }
  return stack;
};
var interruptCauseStack = (error, interrupts) => {
  const out = [`${error.name}: ${error.message}`];
  for (const current of interrupts) {
    const fiberId3 = current.fiberId !== void 0 ? `#${current.fiberId}` : "unknown";
    const frame = current.annotations.get(InterruptorStackTrace.key);
    out.push(`    at fiber (${fiberId3})`);
    if (frame) out.push(currentStackTrace(frame));
  }
  return out.join("\n");
};
var currentStackTrace = (frame) => {
  const out = [];
  let current = frame;
  let i = 0;
  while (current && i < 10) {
    const stack = current.stack();
    if (stack) {
      const locationMatchAll = stack.matchAll(locationRegExp);
      let match7 = false;
      for (const [, location] of locationMatchAll) {
        match7 = true;
        out.push(`    at ${current.name} (${location})`);
      }
      if (!match7) {
        out.push(`    at ${current.name} (${stack.replace(/^at /, "")})`);
      }
    } else {
      out.push(`    at ${current.name}`);
    }
    current = current.parent;
    i++;
  }
  return out.join("\n");
};
var causePretty = (cause) => causePrettyErrors(cause).map(renderPrettyError).join("\n");
var renderPrettyError = (e) => e.cause ? `${e.stack} {
${renderErrorCause(e.cause, "  ")}
}` : e.stack;
var renderErrorCause = (cause, prefix) => {
  const lines4 = cause.stack.split("\n");
  let stack = `${prefix}[cause]: ${lines4[0]}`;
  for (let i = 1, len = lines4.length; i < len; i++) {
    stack += `
${prefix}${lines4[i]}`;
  }
  if (cause.cause) {
    stack += ` {
${renderErrorCause(cause.cause, `${prefix}  `)}
${prefix}}`;
  }
  return stack;
};
var FiberTypeId = "~effect/Fiber";
var fiberVariance = {
  _A: identity,
  _E: identity
};
var fiberIdStore = {
  id: 0
};
var AsyncResource = /* @__PURE__ */ (() => {
  try {
    return globalThis.process?.getBuiltinModule?.("node:async_hooks")?.AsyncResource;
  } catch {
    return void 0;
  }
})();
var captureAsyncContext = () => AsyncResource === void 0 ? void 0 : new AsyncResource("effect/Fiber");
var getCurrentFiber = () => globalThis[currentFiberTypeId];
var FiberImpl = class {
  constructor(context3, interruptible3 = true) {
    this.setContext(context3);
    this.id = ++fiberIdStore.id;
    this.currentOpCount = 0;
    this.interruptible = interruptible3;
    this._stack = [];
    this._observers = void 0;
    this._exit = void 0;
    this._children = void 0;
    this._interruptedCause = void 0;
    this._yielded = void 0;
    this._running = false;
    this._deferredInterrupt = false;
    this._parent = void 0;
    this._asyncContext = void 0;
    this.cache.runtimeMetrics?.recordFiberStart(this.context);
  }
  get [FiberTypeId]() {
    return fiberVariance;
  }
  get currentDispatcher() {
    return this._dispatcher ??= this.cache.scheduler.makeDispatcher();
  }
  getRef(ref) {
    return get(this.context, ref);
  }
  addObserver(cb) {
    if (this._exit) {
      cb(this._exit);
      return constVoid;
    }
    if (this._observers === void 0) {
      this._observers = [cb];
    } else {
      this._observers.push(cb);
    }
    return () => this.removeObserver(cb);
  }
  removeObserver(cb) {
    if (this._exit || this._observers === void 0) return;
    const index2 = this._observers.indexOf(cb);
    if (index2 >= 0) {
      this._observers.splice(index2, 1);
    }
  }
  interruptUnsafe(fiberId3, annotations) {
    if (this._exit) {
      return;
    }
    let cause = causeInterrupt(fiberId3);
    if (this.cache.stackFrame) {
      cause = causeAnnotate(cause, make3(StackTraceKey, this.cache.stackFrame));
    }
    if (annotations) {
      cause = causeAnnotate(cause, annotations);
    }
    this._interruptedCause = this._interruptedCause ? causeAddInterrupts(this._interruptedCause, cause) : cause;
    if (this.interruptible) {
      if (this._running) {
        this._deferredInterrupt = true;
      } else {
        this.evaluate(failCause(this._interruptedCause));
      }
    }
  }
  pollUnsafe() {
    return this._exit;
  }
  evaluate(effect2) {
    if (this._exit) {
      return;
    } else if (this._asyncContext !== void 0) {
      const asyncContext = this._asyncContext;
      this._asyncContext = void 0;
      return asyncContext.runInAsyncScope(this.evaluate, this, effect2);
    } else if (this._yielded !== void 0) {
      const yielded = this._yielded;
      this._yielded = void 0;
      yielded();
    }
    const exit4 = this.runLoop(effect2);
    if (exit4 === Yield) {
      this._asyncContext = captureAsyncContext();
      return;
    }
    const interruptChildren = fiberMiddleware.interruptChildren && fiberMiddleware.interruptChildren(this);
    if (interruptChildren !== void 0) {
      return this.evaluate(flatMap3(interruptChildren, () => exit4));
    }
    this._exit = exit4;
    this.cache.runtimeMetrics?.recordFiberEnd(this.context, this._exit);
    if (this._parent) {
      this._parent._children?.delete(this);
      this._parent = void 0;
    }
    if (this._observers !== void 0) {
      const observers = this._observers;
      this._observers = void 0;
      for (let i = 0; i < observers.length; i++) {
        observers[i](exit4);
      }
    }
    this._stack.length = 0;
    this._children = void 0;
    this.context = empty();
  }
  runLoop(effect2) {
    const prevFiber = globalThis[currentFiberTypeId];
    globalThis[currentFiberTypeId] = this;
    const prevRunning = this._running;
    this._running = true;
    let yielding = false;
    let current = effect2;
    this.currentOpCount = 0;
    try {
      while (true) {
        try {
          if (this._deferredInterrupt) {
            this._deferredInterrupt = false;
            current = failCause(this._interruptedCause);
          }
          this.currentOpCount++;
          const cache2 = this.cache;
          if (!yielding && !cache2.preventYield && cache2.scheduler.shouldYield(this)) {
            yielding = true;
            const prev = current;
            current = flatMap3(yieldNow, () => prev);
          }
          current = cache2.tracerContext ? cache2.tracerContext(current, this) : current[evaluate](this);
          if (current === Yield) {
            const yielded = this._yielded;
            if (ExitTypeId in yielded) {
              this._deferredInterrupt = false;
              this._yielded = void 0;
              return yielded;
            } else if (this._deferredInterrupt) {
              this._yielded = void 0;
              yielded();
              continue;
            }
            return Yield;
          }
        } catch (error) {
          if (!hasProperty(current, evaluate)) {
            return exitDie(`Fiber.runLoop: Not a valid effect: ${String(current)}`);
          }
          current = exitDie(error);
        }
      }
    } finally {
      this._running = prevRunning;
      globalThis[currentFiberTypeId] = prevFiber;
    }
  }
  getCont(symbol4) {
    if (this._deferredInterrupt) {
      this._deferredInterrupt = false;
      return deferredInterruptCont;
    }
    while (true) {
      const op = this._stack.pop();
      if (!op) return void 0;
      const all4 = op[contAll];
      if (all4 !== void 0) {
        const cont = all4.call(op, this);
        if (cont) {
          ;
          cont[symbol4] = cont;
          return cont;
        }
      }
      if (op[symbol4]) return op;
    }
  }
  // Passes a success value straight to the next continuation instead of
  // returning an Exit for the run loop to unwrap. Each call counts as an
  // operation, and every `maxInlineSteps`th call returns an Exit instead, so
  // continuations calling continuations never nest deeper than that.
  succeedWith(value3) {
    if ((++this.currentOpCount & maxInlineSteps - 1) === 0) {
      return exitSucceed(value3);
    }
    const cont = this.getCont(contA);
    return cont ? cont[contA](value3, this) : this.yieldWith(exitSucceed(value3));
  }
  yieldWith(value3) {
    this._yielded = value3;
    return Yield;
  }
  children() {
    return this._children ??= /* @__PURE__ */ new Set();
  }
  pipe() {
    return pipeArguments(this, arguments);
  }
  setContext(context3) {
    const previous = this.context;
    this.context = context3;
    if (previous !== void 0 && hasSameCache(previous, context3)) return;
    const root = context3.cacheRoot;
    const cache2 = root._fiberCache ??= makeFiberContextCache(context3);
    if (this.cache?.scheduler !== cache2.scheduler) {
      this._dispatcher = void 0;
    }
    this.cache = cache2;
  }
  get currentSpanLocal() {
    const span2 = this.cache.span;
    return span2?._tag === "Span" ? span2 : void 0;
  }
};
var makeFiberContextCache = (context3) => {
  const currentTracer = getOrUndefinedUnsafe(context3, TracerKey);
  return {
    scheduler: get(context3, Scheduler),
    tracer: currentTracer,
    tracerContext: currentTracer ? currentTracer["context"] : void 0,
    tracerEnabled: get(context3, TracerEnabled),
    span: getOrUndefinedUnsafe(context3, ParentSpanKey),
    logLevel: get(context3, CurrentLogLevel),
    minimumLogLevel: get(context3, MinimumLogLevel),
    stackFrame: get(context3, CurrentStackFrame),
    runtimeMetrics: getOrUndefinedUnsafe(context3, FiberRuntimeMetricsKey),
    maxOpsBeforeYield: get(context3, MaxOpsBeforeYield),
    preventYield: get(context3, PreventSchedulerYield)
  };
};
var deferredInterruptCont = {
  [contA](_value, fiber3) {
    return failCause(fiber3._interruptedCause);
  },
  [contE](_cause, fiber3) {
    return failCause(fiber3._interruptedCause);
  }
};
var maxInlineSteps = 32;
var fiberMiddleware = {
  interruptChildren: void 0
};
var fiberStackAnnotations = (fiber3) => {
  if (!fiber3.cache.stackFrame) return void 0;
  const annotations = /* @__PURE__ */ new Map();
  annotations.set(InterruptorStackTrace.key, fiber3.cache.stackFrame);
  return makeUnsafe(annotations);
};
var fiberInterruptChildren = (fiber3) => {
  if (fiber3._children === void 0 || fiber3._children.size === 0) {
    return void 0;
  }
  return fiberInterruptAll(fiber3._children);
};
var fiberAwait = (self) => {
  const impl = self;
  if (impl._exit) return succeed3(impl._exit);
  return callback((resume) => {
    if (impl._exit) return resume(succeed3(impl._exit));
    return sync(self.addObserver((exit4) => resume(succeed3(exit4))));
  });
};
var fiberAwaitAll = (self) => callback((resume) => {
  const iter = self[Symbol.iterator]();
  const exits = [];
  let cancel = void 0;
  function loop() {
    let result3 = iter.next();
    while (!result3.done) {
      if (result3.value._exit) {
        exits.push(result3.value._exit);
        result3 = iter.next();
        continue;
      }
      cancel = result3.value.addObserver((exit4) => {
        exits.push(exit4);
        loop();
      });
      return;
    }
    resume(succeed3(exits));
  }
  loop();
  return sync(() => cancel?.());
});
var fiberJoin = (self) => {
  const impl = self;
  if (impl._exit) return impl._exit;
  return callback((resume) => {
    if (impl._exit) return resume(impl._exit);
    return sync(self.addObserver(resume));
  });
};
var fiberInterrupt = (self) => withFiber((fiber3) => fiberInterruptAs(self, fiber3.id));
var fiberInterruptAs = /* @__PURE__ */ dual((args2) => hasProperty(args2[0], FiberTypeId), (self, fiberId3, annotations) => withFiber((parent) => {
  let ann = fiberStackAnnotations(parent);
  ann = ann && annotations ? merge(ann, annotations) : ann ?? annotations;
  self.interruptUnsafe(fiberId3, ann);
  return asVoid(fiberAwait(self));
}));
var fiberInterruptAll = (fibers) => withFiber((parent) => {
  const annotations = fiberStackAnnotations(parent);
  let fiberArr = empty2();
  for (const fiber3 of fibers) {
    fiber3.interruptUnsafe(parent.id, annotations);
    fiberArr.push(fiber3);
  }
  return asVoid(fiberAwaitAll(fiberArr));
});
var succeed3 = exitSucceed;
var failCause = exitFailCause;
var fail3 = exitFail;
var sync = /* @__PURE__ */ makePrimitive({
  op: "Sync",
  [evaluate](fiber3) {
    const value3 = this[args]();
    const cont = fiber3.getCont(contA);
    return cont ? cont[contA](value3, fiber3) : fiber3.yieldWith(exitSucceed(value3));
  }
});
var suspend = /* @__PURE__ */ makePrimitive({
  op: "Suspend",
  [evaluate](_fiber) {
    return this[args]();
  }
});
var fromOption3 = /* @__PURE__ */ dual((args2) => args2.length >= 2 || isOption2(args2[0]), (option3, onNone) => isNone2(option3) ? fail3(onNone ? onNone() : new NoSuchElementError("Effect.fromOption: Option.none")) : succeed3(option3.value));
var fromResult = /* @__PURE__ */ match2({
  onFailure: fail3,
  onSuccess: succeed3
});
var fromNullishOr3 = (value3) => value3 == null ? fail3(new NoSuchElementError()) : succeed3(value3);
var yieldNowWith = /* @__PURE__ */ makePrimitive({
  op: "Yield",
  [evaluate](fiber3) {
    let resumed = false;
    fiber3.currentDispatcher.scheduleTask(() => {
      if (resumed) return;
      fiber3.evaluate(exitVoid);
    }, this[args] ?? 0);
    return fiber3.yieldWith(() => {
      resumed = true;
    });
  }
});
var yieldNow = /* @__PURE__ */ yieldNowWith(0);
var succeedSome2 = (a) => succeed3(some2(a));
var succeedNone2 = /* @__PURE__ */ succeed3(/* @__PURE__ */ none2());
var transposeOption2 = (self) => isNone2(self) ? succeedNone2 : map5(self.value, some2);
var failCauseSync = (evaluate3) => suspend(() => failCause(evaluate3()));
var die = (defect) => exitDie(defect);
var failSync = (error) => suspend(() => fail3(error()));
var void_2 = /* @__PURE__ */ succeed3(void 0);
var try_2 = (options) => {
  const evaluate3 = typeof options === "function" ? options : options.try;
  const catcher = typeof options === "function" ? (cause) => new UnknownError(cause, "An error occurred in Effect.try") : options.catch;
  return suspend(() => {
    try {
      return succeed3(evaluate3());
    } catch (err) {
      return fail3(catcher(err));
    }
  });
};
var promise = (evaluate3) => callbackOptions(function(resume, signal) {
  evaluate3(signal).then((a) => resume(succeed3(a)), (e) => resume(die(e)));
}, evaluate3.length !== 0);
var tryPromise = (options) => {
  const f = typeof options === "function" ? options : options.try;
  const catcher = typeof options === "function" ? (cause) => new UnknownError(cause, "An error occurred in Effect.tryPromise") : options.catch;
  return callbackOptions(function(resume, signal) {
    const failWithCatch = (cause) => suspend(() => {
      try {
        return fail3(internalCall(() => catcher(cause)));
      } catch (err) {
        return die(err);
      }
    });
    try {
      f(signal).then((a) => resume(succeed3(a)), (e) => resume(failWithCatch(e)));
    } catch (err) {
      resume(failWithCatch(err));
    }
  }, f.length !== 0);
};
var withFiberId = (f) => withFiber((fiber3) => f(fiber3.id));
var fiber = /* @__PURE__ */ withFiber(succeed3);
var fiberId = /* @__PURE__ */ withFiberId(succeed3);
var callbackOptions = /* @__PURE__ */ (function() {
  const Proto8 = /* @__PURE__ */ makePrimitiveProto({
    op: "Async",
    [evaluate](fiber3) {
      let resumed = false;
      let yielded = false;
      const controller = this.withSignal ? new AbortController() : void 0;
      const onCancel = this.register.call(fiber3.cache.scheduler, (effect2) => {
        if (resumed) return;
        resumed = true;
        if (yielded) {
          fiber3.evaluate(effect2);
        } else {
          yielded = effect2;
        }
      }, controller?.signal);
      if (yielded !== false) return yielded;
      yielded = true;
      fiber3._yielded = () => {
        resumed = true;
      };
      if (controller === void 0 && onCancel === void 0) {
        return Yield;
      }
      fiber3._stack.push(asyncFinalizer(() => {
        resumed = true;
        controller?.abort();
        return onCancel ?? exitVoid;
      }));
      return Yield;
    }
  });
  const AsyncImpl = function(register, withSignal) {
    this.register = register;
    this.withSignal = withSignal;
  };
  AsyncImpl.prototype = Proto8;
  return function(register, withSignal) {
    return new AsyncImpl(register, withSignal);
  };
})();
var asyncFinalizer = /* @__PURE__ */ makePrimitive({
  op: "AsyncFinalizer",
  [contAll](fiber3) {
    if (fiber3.interruptible) {
      fiber3.interruptible = false;
      fiber3._stack.push(setInterruptibleTrue);
    }
  },
  [contE](cause, _fiber) {
    return hasInterrupts(cause) ? flatMap3(combineFinalizerCause(exitFailCause(cause), this[args]()), () => failCause(cause)) : failCause(cause);
  }
});
var callback = (register) => callbackOptions(register, register.length >= 2);
var never = /* @__PURE__ */ callback(constVoid);
var gen2 = (...args2) => {
  if (args2.length === 1) {
    const body2 = args2[0];
    return suspend(() => fromIteratorUnsafe(body2()));
  }
  const [options, body] = args2;
  return suspend(() => fromIteratorUnsafe(body.call(options.self)));
};
var fnUntraced = (body, ...pipeables) => {
  const fn3 = pipeables.length === 0 ? function() {
    return suspend(() => fromIteratorUnsafe(body.apply(this, arguments)));
  } : function() {
    let effect2 = suspend(() => fromIteratorUnsafe(body.apply(this, arguments)));
    for (let i = 0; i < pipeables.length; i++) {
      effect2 = pipeables[i](effect2, ...arguments);
    }
    return effect2;
  };
  return defineFunctionLength(body.length, fn3);
};
var defineFunctionLength = (length, fn3) => Object.defineProperty(fn3, "length", {
  value: length,
  configurable: true
});
var fnStackCleaner = /* @__PURE__ */ makeStackCleaner(2);
var fn = function() {
  const nameFirst = typeof arguments[0] === "string";
  const name = nameFirst ? arguments[0] : "Effect.fn";
  const spanOptions = nameFirst ? arguments[1] : void 0;
  const prevLimit = getStackTraceLimit();
  let defError;
  if (prevLimit !== 0) {
    setStackTraceLimit(2);
    defError = new globalThis.Error();
    setStackTraceLimit(prevLimit);
  }
  if (nameFirst) {
    return (body, ...pipeables) => makeFn(name, body, defError, pipeables, nameFirst, spanOptions);
  }
  return makeFn(name, arguments[0], defError, Array.prototype.slice.call(arguments, 1), nameFirst, spanOptions);
};
var makeFn = (name, bodyOrOptions, defError, pipeables, addSpan, spanOptions) => {
  const body = typeof bodyOrOptions === "function" ? bodyOrOptions : pipeables.shift().bind(bodyOrOptions.self);
  const definitionName = `${name} (definition)`;
  const definitionStack = defError ? fnStackCleaner(() => defError.stack) : constUndefined;
  return defineFunctionLength(body.length, function(...args2) {
    let result3 = suspend(() => {
      const iter = body.apply(this, arguments);
      return isEffect(iter) ? iter : fromIteratorUnsafe(iter);
    });
    for (let i = 0; i < pipeables.length; i++) {
      result3 = pipeables[i](result3, ...args2);
    }
    if (!isEffect(result3)) {
      return result3;
    }
    const prevLimit = getStackTraceLimit();
    let callError;
    if (prevLimit !== 0) {
      setStackTraceLimit(2);
      callError = new globalThis.Error();
      setStackTraceLimit(prevLimit);
    }
    return updateService(addSpan ? useSpan(name, spanOptions, (span2) => provideParentSpan(result3, span2)) : result3, CurrentStackFrame, (prev) => ({
      name,
      stack: callError ? fnStackCleaner(() => callError.stack) : constUndefined,
      parent: {
        name: definitionName,
        stack: definitionStack,
        parent: prev
      }
    }));
  });
};
var fnUntracedEager = (body, ...pipeables) => defineFunctionLength(body.length, pipeables.length === 0 ? function() {
  return fromIteratorEagerUnsafe(() => body.apply(this, arguments));
} : function() {
  let effect2 = fromIteratorEagerUnsafe(() => body.apply(this, arguments));
  for (const pipeable of pipeables) {
    effect2 = pipeable(effect2, ...arguments);
  }
  return effect2;
});
var fromIteratorEagerUnsafe = (evaluate3) => {
  try {
    const iterator = evaluate3();
    let value3 = void 0;
    while (true) {
      const state = iterator.next(value3);
      if (state.done) {
        return succeed3(state.value);
      }
      const primitive = state.value;
      if (primitive && primitive._tag === "Success") {
        value3 = primitive.value;
        continue;
      } else if (primitive && primitive._tag === "Failure") {
        return state.value;
      } else {
        let isFirstExecution = true;
        return suspend(() => {
          if (isFirstExecution) {
            isFirstExecution = false;
            return flatMap3(state.value, (value4) => fromIteratorUnsafe(iterator, value4));
          } else {
            return suspend(() => fromIteratorUnsafe(evaluate3()));
          }
        });
      }
    }
  } catch (error) {
    return die(error);
  }
};
var fromIteratorUnsafe = /* @__PURE__ */ (function() {
  const Proto8 = /* @__PURE__ */ makePrimitiveProto({
    op: "Iterator",
    [contA](value3, fiber3) {
      const iter = this.iterator;
      while (true) {
        const state = iter.next(value3);
        if (state.done) return succeed3(state.value);
        if (!effectIsExit(state.value)) {
          fiber3._stack.push(this);
          return state.value;
        } else if (state.value._tag === "Failure") {
          return state.value;
        }
        value3 = state.value.value;
      }
    },
    [evaluate](fiber3) {
      return this[contA](this.initial, fiber3);
    }
  });
  const IteratorImpl = function(iterator, initial) {
    this.iterator = iterator;
    this.initial = initial;
  };
  IteratorImpl.prototype = Proto8;
  return function(iterator, initial) {
    return new IteratorImpl(iterator, initial);
  };
})();
var as = /* @__PURE__ */ dual(2, (self, value3) => new ContImpl(self, returnPayload, succeed3(value3)));
var evaluateCont = function(fiber3) {
  fiber3._stack.push(this);
  return this[args];
};
var OnSuccessProto = /* @__PURE__ */ makePrimitiveProto({
  op: "OnSuccess",
  [evaluate]: evaluateCont
});
var ContImpl = function(self, cont, payload) {
  this[args] = self;
  this[contA] = cont;
  this.payload = payload;
};
ContImpl.prototype = OnSuccessProto;
var returnPayload = function() {
  return this.payload;
};
var succeedPayload = function(_value, fiber3) {
  return fiber3.succeedWith(this.payload);
};
var continuationMarksStack = /* @__PURE__ */ (() => {
  const limit = /* @__PURE__ */ getStackTraceLimit();
  if (limit === 0) return false;
  const marker = "~effect/Effect/stackProbe";
  const probe = {
    [marker]: function stackProbe() {
      return new Error();
    }
  };
  setStackTraceLimit(1);
  const error = /* @__PURE__ */ probe[marker]();
  setStackTraceLimit(limit);
  return error.stack?.includes("[as " + marker + "]") === true;
})();
var mapCont = function(value3, fiber3) {
  const f = this.payload;
  return fiber3.succeedWith(continuationMarksStack ? f(value3) : internalCall(() => f(value3)));
};
var andThenCont = function(value3) {
  const f = this.payload;
  return f(value3);
};
var tapCont = function(value3) {
  const f = this.payload;
  return new ContImpl(f(value3), succeedPayload, value3);
};
var tapEffectCont = function(value3) {
  return new ContImpl(this.payload, succeedPayload, value3);
};
var asSome = (self) => map5(self, some2);
var flip2 = (self) => matchEffect(self, {
  onFailure: succeed3,
  onSuccess: fail3
});
var andThen2 = /* @__PURE__ */ dual(2, (self, f) => new ContImpl(self, isEffect(f) ? returnPayload : andThenCont, f));
var tap2 = /* @__PURE__ */ dual(2, (self, f) => new ContImpl(self, isEffect(f) ? tapEffectCont : tapCont, f));
var asVoid = (self) => new ContImpl(self, returnPayload, exitVoid);
var sandbox = (self) => catchCause(self, fail3);
var raceAll = (all4, options) => withFiber((parent) => {
  const fibers = /* @__PURE__ */ new Set();
  onExitUnsafe(parent, () => fibers.size === 0 ? void 0 : fiberInterruptAll(fibers));
  return callback((resume) => {
    const effects = fromIterable(all4);
    const len = effects.length;
    let doneCount = 0;
    let done3 = false;
    const failures = [];
    const onExit3 = (exit4, fiber3, i) => {
      doneCount++;
      if (exit4._tag === "Failure") {
        failures.push(...exit4.cause.reasons);
        if (doneCount >= len) {
          resume(failCause(causeFromReasons(failures)));
        }
        return;
      }
      const isWinner = !done3;
      done3 = true;
      resume(exit4);
      if (isWinner && options?.onWinner) {
        options.onWinner({
          fiber: fiber3,
          index: i,
          parentFiber: parent
        });
      }
    };
    for (let i = 0; i < len; i++) {
      const fiber3 = forkUnsafe(parent, effects[i], true, true, false);
      fibers.add(fiber3);
      fiber3.addObserver((exit4) => {
        fibers.delete(fiber3);
        onExit3(exit4, fiber3, i);
      });
      if (done3) break;
    }
  });
});
var raceAllFirst = (all4, options) => withFiber((parent) => {
  const fibers = /* @__PURE__ */ new Set();
  onExitUnsafe(parent, () => fibers.size === 0 ? void 0 : fiberInterruptAll(fibers));
  return callback((resume) => {
    let done3 = false;
    let i = 0;
    for (const effect2 of all4) {
      if (done3) break;
      const index2 = i++;
      const fiber3 = forkUnsafe(parent, effect2, true, true, false);
      fibers.add(fiber3);
      fiber3.addObserver((exit4) => {
        fibers.delete(fiber3);
        const isWinner = !done3;
        done3 = true;
        resume(exit4);
        if (isWinner && options?.onWinner) {
          options.onWinner({
            fiber: fiber3,
            index: index2,
            parentFiber: parent
          });
        }
      });
    }
  });
});
var race = /* @__PURE__ */ dual((args2) => isEffect(args2[1]), (self, that, options) => raceAll([self, that], options));
var raceFirst = /* @__PURE__ */ dual((args2) => isEffect(args2[1]), (self, that, options) => raceAllFirst([self, that], options));
var flatMap3 = /* @__PURE__ */ dual(2, (self, f) => new ContImpl(self, andThenCont, f));
var matchCauseEffectEager = /* @__PURE__ */ dual(2, (self, options) => {
  if (effectIsExit(self)) {
    return self._tag === "Success" ? options.onSuccess(self.value) : options.onFailure(self.cause);
  }
  return matchCauseEffect(self, options);
});
var effectIsExit = (effect2) => effect2[ExitTypeId] !== void 0;
var flatMapEager = /* @__PURE__ */ dual(2, (self, f) => {
  if (effectIsExit(self)) {
    return self._tag === "Success" ? f(self.value) : self;
  }
  return flatMap3(self, f);
});
var flatten3 = (self) => flatMap3(self, identity);
var map5 = /* @__PURE__ */ dual(2, (self, f) => new ContImpl(self, mapCont, f));
var mapEager = /* @__PURE__ */ dual(2, (self, f) => effectIsExit(self) ? exitMap(self, f) : map5(self, f));
var mapErrorEager = /* @__PURE__ */ dual(2, (self, f) => effectIsExit(self) ? exitMapError(self, f) : mapError2(self, f));
var mapBothEager = /* @__PURE__ */ dual(2, (self, options) => effectIsExit(self) ? exitMapBoth(self, options) : mapBoth2(self, options));
var catchEager = /* @__PURE__ */ dual(2, (self, f) => {
  if (effectIsExit(self)) {
    if (self._tag === "Success") return self;
    const error = findError(self.cause);
    if (isFailure2(error)) return self;
    return f(error.success);
  }
  return catch_(self, f);
});
var exitInterrupt = (fiberId3) => exitFailCause(causeInterrupt(fiberId3));
var exitIsSuccess = (self) => self._tag === "Success";
var exitIsFailure = (self) => self._tag === "Failure";
var exitFilterCause = (self) => self._tag === "Failure" ? succeed2(self.cause) : fail2(self);
var exitHasInterrupts = (self) => self._tag === "Failure" && hasInterrupts(self.cause);
var exitVoid = /* @__PURE__ */ exitSucceed(void 0);
var exitMap = /* @__PURE__ */ dual(2, (self, f) => self._tag === "Success" ? exitSucceed(f(self.value)) : self);
var exitMapError = /* @__PURE__ */ dual(2, (self, f) => {
  if (self._tag === "Success") return self;
  const error = findError(self.cause);
  if (isFailure2(error)) return self;
  return exitFail(f(error.success));
});
var exitMapBoth = /* @__PURE__ */ dual(2, (self, options) => {
  if (self._tag === "Success") return exitSucceed(options.onSuccess(self.value));
  const error = findError(self.cause);
  if (isFailure2(error)) return self;
  return exitFail(options.onFailure(error.success));
});
var exitZipRight = /* @__PURE__ */ dual(2, (self, that) => exitIsSuccess(self) ? that : self);
var exitAsVoidAll = (exits) => {
  const failures = [];
  for (const exit4 of exits) {
    if (exit4._tag === "Failure") {
      failures.push(...exit4.cause.reasons);
    }
  }
  return failures.length === 0 ? exitVoid : exitFailCause(causeFromReasons(failures));
};
var service = (service3) => service3;
var serviceOption = (service3) => withFiber((fiber3) => succeed3(getOption(fiber3.context, service3)));
var serviceOptional = (service3) => withFiber((fiber3) => fromOption3(getOption(fiber3.context, service3)));
var updateContext = /* @__PURE__ */ dual(2, (self, f) => withFiber((fiber3) => {
  const prevContext = fiber3.context;
  const nextContext = f(prevContext);
  if (prevContext === nextContext) return self;
  fiber3.setContext(nextContext);
  onExitUnsafe(fiber3, () => {
    fiber3.setContext(prevContext);
    return void 0;
  });
  return self;
}));
var updateService = /* @__PURE__ */ dual(3, (self, service3, f) => updateContext(self, (s) => {
  const prev = getUnsafe(s, service3);
  const next = f(prev);
  if (prev === next) return s;
  return add(s, service3, next);
}));
var updateServiceScoped = (service3, update2, options) => uninterruptible(withFiber((fiber3) => {
  const original = getUnsafe(fiber3.context, service3);
  const updated = update2(original);
  fiber3.setContext(add(fiber3.context, service3, updated));
  return scopeAddFinalizerExit(getUnsafe(fiber3.context, scopeTag), (_) => {
    const currentOption = getOption(fiber3.context, service3);
    if (isNone2(currentOption)) return void_2;
    const current = currentOption.value;
    let next;
    if (options?.reset === void 0) {
      if (current !== updated) return void_2;
      next = original;
    } else {
      next = options.reset(original, updated, current);
    }
    fiber3.setContext(add(fiber3.context, service3, next));
    return void_2;
  });
}));
var context = () => getContext;
var getContext = /* @__PURE__ */ withFiber((fiber3) => succeed3(fiber3.context));
var contextWith = (f) => withFiber((fiber3) => f(fiber3.context));
var setContext = /* @__PURE__ */ dual(2, (self, context3) => updateContext(self, constant(context3)));
var provideContext = /* @__PURE__ */ dual(2, (self, context3) => {
  if (effectIsExit(self)) return self;
  return updateContext(self, merge(context3));
});
var provideService = function() {
  if (arguments.length === 1) {
    return dual(2, (self, impl) => provideServiceImpl(self, arguments[0], impl));
  }
  return dual(3, (self, service3, impl) => provideServiceImpl(self, service3, impl)).apply(this, arguments);
};
var provideServiceImpl = (self, service3, implementation) => updateContext(self, add(service3, implementation));
var provideServiceEffect = /* @__PURE__ */ dual(3, (self, service3, acquire) => flatMap3(acquire, (implementation) => provideService(self, service3, implementation)));
var zip = /* @__PURE__ */ dual((args2) => isEffect(args2[1]), (self, that, options) => zipWith(self, that, (a, a2) => [a, a2], options));
var zipWith = /* @__PURE__ */ dual((args2) => isEffect(args2[1]), (self, that, f, options) => options?.concurrent ? map5(all2([self, that], {
  concurrency: 2
}), ([a, a2]) => f(a, a2)) : flatMap3(self, (a) => map5(that, (a2) => f(a, a2))));
var filterOrFail2 = /* @__PURE__ */ dual((args2) => isEffect(args2[0]), (self, predicate, orFailWith) => filterOrElse(self, predicate, orFailWith ? (a) => fail3(orFailWith(a)) : () => fail3(new NoSuchElementError())));
var when = /* @__PURE__ */ dual(2, (self, condition) => flatMap3(condition, (pass) => pass ? asSome(self) : succeedNone2));
var replicate = /* @__PURE__ */ dual(2, (self, n) => Array.from({
  length: n
}, () => self));
var replicateEffect = /* @__PURE__ */ dual((args2) => isEffect(args2[0]), (self, n, options) => all2(replicate(self, n), options));
var forever = /* @__PURE__ */ dual((args2) => isEffect(args2[0]), (self, options) => whileLoop({
  while: constTrue,
  body: constant(options?.disableYield ? self : flatMap3(self, (_) => yieldNow)),
  step: constVoid
}));
var catchCause = /* @__PURE__ */ dual(2, (self, f) => new OnFailureImpl(self, f.length !== 1 ? (cause) => f(cause) : f));
var OnFailureProto = /* @__PURE__ */ makePrimitiveProto({
  op: "OnFailure",
  [evaluate]: evaluateCont
});
var OnFailureImpl = function(self, f) {
  this[args] = self;
  this[contE] = f;
};
OnFailureImpl.prototype = OnFailureProto;
var catchCauseIf = /* @__PURE__ */ dual(3, (self, predicate, f) => catchCause(self, (cause) => {
  if (!predicate(cause)) {
    return failCause(cause);
  }
  return f(cause);
}));
var catchCauseFilter = /* @__PURE__ */ dual(3, (self, filter8, f) => catchCause(self, (cause) => {
  const eb = filter8(cause);
  return isFailure2(eb) ? failCause(eb.failure) : f(eb.success, cause);
}));
var catch_ = /* @__PURE__ */ dual(2, (self, f) => catchCauseFilter(self, findError, (e) => f(e)));
var catchNoSuchElement = (self) => matchEffect(self, {
  onFailure: (error) => isNoSuchElementError(error) ? succeedNone2 : fail3(error),
  onSuccess: succeedSome2
});
var catchDefect = /* @__PURE__ */ dual(2, (self, f) => catchCauseFilter(self, findDefect, f));
var tapCause = /* @__PURE__ */ dual(2, (self, f) => catchCause(self, (cause) => andThen2(f(cause), failCause(cause))));
var tapCauseIf = /* @__PURE__ */ dual(3, (self, predicate, f) => catchCauseIf(self, predicate, (cause) => andThen2(f(cause), failCause(cause))));
var tapCauseFilter = /* @__PURE__ */ dual(3, (self, filter8, f) => catchCause(self, (cause) => {
  const result3 = filter8(cause);
  if (isFailure2(result3)) {
    return failCause(cause);
  }
  return andThen2(f(result3.success, cause), failCause(cause));
}));
var tapError = /* @__PURE__ */ dual(2, (self, f) => tapCauseFilter(self, findError, (e) => f(e)));
var tapErrorTag = /* @__PURE__ */ dual(3, (self, k, f) => {
  const predicate = Array.isArray(k) ? (e) => hasProperty(e, "_tag") && k.includes(e._tag) : isTagged(k);
  return tapError(self, (error) => predicate(error) ? f(error) : void_2);
});
var tapDefect = /* @__PURE__ */ dual(2, (self, f) => tapCauseFilter(self, findDefect, (_) => f(_)));
var catchIf = /* @__PURE__ */ dual((args2) => isEffect(args2[0]), (self, predicate, f, orElse2) => catchCause(self, (cause) => {
  const error = findError(cause);
  if (isFailure2(error)) return failCause(error.failure);
  if (!predicate(error.success)) {
    return orElse2 ? orElse2(error.success) : failCause(cause);
  }
  return f(error.success);
}));
var catchFilter = /* @__PURE__ */ dual((args2) => isEffect(args2[0]), (self, filter8, f, orElse2) => catchCause(self, (cause) => {
  const error = findError(cause);
  if (isFailure2(error)) return failCause(error.failure);
  const result3 = filter8(error.success);
  if (isFailure2(result3)) {
    return orElse2 ? orElse2(result3.failure) : failCause(cause);
  }
  return f(result3.success);
}));
var catchTag = /* @__PURE__ */ dual((args2) => isEffect(args2[0]), (self, k, f, orElse2) => {
  const pred = Array.isArray(k) ? (e) => hasProperty(e, "_tag") && k.includes(e._tag) : isTagged(k);
  return catchIf(self, pred, f, orElse2);
});
var catchTags = /* @__PURE__ */ dual((args2) => isEffect(args2[0]), (self, cases, orElse2) => {
  let keys3;
  return catchFilter(self, (e) => {
    keys3 ??= Object.keys(cases);
    return hasProperty(e, "_tag") && isString(e["_tag"]) && keys3.includes(e["_tag"]) ? succeed2(e) : fail2(e);
  }, (e) => cases[e["_tag"]](e), orElse2);
});
var catchReason = /* @__PURE__ */ dual((args2) => isEffect(args2[0]), (self, errorTag, reasonTag, f, orElse2) => catchIf(self, (e) => isTagged(e, errorTag) && hasProperty(e, "reason") && (orElse2 !== void 0 || isTagged(e.reason, reasonTag)), (e) => {
  const reason = e.reason;
  if (isTagged(reason, reasonTag)) return f(reason, e);
  return orElse2 ? orElse2(reason, e) : fail3(e);
}));
var catchReasons = /* @__PURE__ */ dual((args2) => isEffect(args2[0]), (self, errorTag, cases, orElse2) => {
  let keys3;
  return catchIf(self, (e) => isTagged(e, errorTag) && hasProperty(e, "reason") && hasProperty(e.reason, "_tag") && isString(e.reason._tag) && (orElse2 !== void 0 || (keys3 ??= Object.keys(cases)).includes(e.reason._tag)), (e) => {
    const reason = e.reason;
    keys3 ??= Object.keys(cases);
    if (keys3.includes(reason._tag)) {
      return cases[reason._tag](reason, e);
    }
    return orElse2 ? orElse2(reason, e) : fail3(e);
  });
});
var unwrapReason = /* @__PURE__ */ dual(2, (self, errorTag) => catchFilter(self, (e) => {
  if (isTagged(e, errorTag) && hasProperty(e, "reason")) {
    return succeed2(e.reason);
  }
  return fail2(e);
}, fail3));
var mapError2 = /* @__PURE__ */ dual(2, (self, f) => catch_(self, (error) => failSync(() => f(error))));
var mapBoth2 = /* @__PURE__ */ dual(2, (self, options) => matchEffect(self, {
  onFailure: (e) => failSync(() => options.onFailure(e)),
  onSuccess: (a) => sync(() => options.onSuccess(a))
}));
var orDie = (self) => catch_(self, die);
var orElseSucceed = /* @__PURE__ */ dual(2, (self, f) => catch_(self, (error) => sync(() => f(error))));
var firstSuccessOf = (effects) => suspend(() => {
  const iterator = effects[Symbol.iterator]();
  let state = iterator.next();
  if (state.done) {
    return die(new Error("Received an empty collection of effects"));
  }
  function loop(current) {
    const next = iterator.next();
    if (next.done) return current.value;
    return catch_(current.value, (_) => loop(next));
  }
  return loop(state);
});
var eventually = (self) => catch_(self, (_) => flatMap3(yieldNow, () => eventually(self)));
var ignore = /* @__PURE__ */ dual((args2) => isEffect(args2[0]), (self, options) => {
  if (!options?.log) {
    return matchEffect(self, {
      onFailure: (_) => void_2,
      onSuccess: (_) => void_2
    });
  }
  const logEffect = logWithLevel(options.log === true ? void 0 : options.log);
  return matchCauseEffect(self, {
    onFailure(cause) {
      const failure = findFail(cause);
      return isFailure2(failure) ? failCause(failure.failure) : options.message === void 0 ? logEffect(cause) : logEffect(options.message, cause);
    },
    onSuccess: (_) => void_2
  });
});
var ignoreCause = /* @__PURE__ */ dual((args2) => isEffect(args2[0]), (self, options) => {
  if (!options?.log) {
    return matchCauseEffect(self, {
      onFailure: (_) => void_2,
      onSuccess: (_) => void_2
    });
  }
  const logEffect = logWithLevel(options.log === true ? void 0 : options.log);
  return matchCauseEffect(self, {
    onFailure: (cause) => options.message === void 0 ? logEffect(cause) : logEffect(options.message, cause),
    onSuccess: (_) => void_2
  });
});
var option = (self) => match4(self, {
  onFailure: none2,
  onSuccess: some2
});
var result = (self) => matchEager(self, {
  onFailure: fail2,
  onSuccess: succeed2
});
var matchCauseEffect = /* @__PURE__ */ dual(2, (self, options) => new OnSuccessAndFailureImpl(self, options.onSuccess.length !== 1 ? (a) => options.onSuccess(a) : options.onSuccess, options.onFailure.length !== 1 ? (cause) => options.onFailure(cause) : options.onFailure));
var OnSuccessAndFailureProto = /* @__PURE__ */ makePrimitiveProto({
  op: "OnSuccessAndFailure",
  [evaluate]: evaluateCont
});
var OnSuccessAndFailureImpl = function(self, onSuccess, onFailure) {
  this[args] = self;
  this[contA] = onSuccess;
  this[contE] = onFailure;
};
OnSuccessAndFailureImpl.prototype = OnSuccessAndFailureProto;
var matchSuccess = function(value3, fiber3) {
  const handlers = this.payload;
  return fiber3.succeedWith(continuationMarksStack ? handlers.onSuccess(value3) : internalCall(() => handlers.onSuccess(value3)));
};
var makeMatch = (op, onFailure) => {
  const Proto8 = makePrimitiveProto({
    op,
    [evaluate]: evaluateCont,
    [contA]: matchSuccess,
    [contE]: onFailure
  });
  const MatchImpl2 = function(self, handlers) {
    this[args] = self;
    this.payload = handlers;
  };
  MatchImpl2.prototype = Proto8;
  return MatchImpl2;
};
var MatchImpl = /* @__PURE__ */ makeMatch("Match", function(cause, fiber3) {
  const fail9 = cause.reasons.find(isFailReason);
  if (fail9 === void 0) return failCause(cause);
  const handlers = this.payload;
  return fiber3.succeedWith(continuationMarksStack ? handlers.onFailure(fail9.error) : internalCall(() => handlers.onFailure(fail9.error)));
});
var MatchCauseImpl = /* @__PURE__ */ makeMatch("MatchCause", function(cause, fiber3) {
  const handlers = this.payload;
  return fiber3.succeedWith(continuationMarksStack ? handlers.onFailure(cause) : internalCall(() => handlers.onFailure(cause)));
});
var matchCause = /* @__PURE__ */ dual(2, (self, options) => new MatchCauseImpl(self, options));
var matchEffect = /* @__PURE__ */ dual(2, (self, options) => matchCauseEffect(self, {
  onFailure: (cause) => {
    const fail9 = cause.reasons.find(isFailReason);
    return fail9 ? options.onFailure(fail9.error) : failCause(cause);
  },
  onSuccess: options.onSuccess
}));
var match4 = /* @__PURE__ */ dual(2, (self, options) => new MatchImpl(self, options));
var matchEager = /* @__PURE__ */ dual(2, (self, options) => {
  if (effectIsExit(self)) {
    if (self._tag === "Success") return exitSucceed(options.onSuccess(self.value));
    const error = findError(self.cause);
    if (isFailure2(error)) return self;
    return exitSucceed(options.onFailure(error.success));
  }
  return match4(self, options);
});
var matchCauseEager = /* @__PURE__ */ dual(2, (self, options) => {
  if (effectIsExit(self)) {
    if (self._tag === "Success") return exitSucceed(options.onSuccess(self.value));
    return exitSucceed(options.onFailure(self.cause));
  }
  return matchCause(self, options);
});
var exit = (self) => effectIsExit(self) ? exitSucceed(self) : exitPrimitive(self);
var exitPrimitive = /* @__PURE__ */ makePrimitive({
  op: "Exit",
  [evaluate](fiber3) {
    fiber3._stack.push(this);
    return this[args];
  },
  [contA](value3, fiber3, exit4) {
    return fiber3.succeedWith(exit4 ?? exitSucceed(value3));
  },
  [contE](cause, fiber3, exit4) {
    return fiber3.succeedWith(exit4 ?? exitFailCause(cause));
  }
});
var isFailure3 = /* @__PURE__ */ matchEager({
  onFailure: () => true,
  onSuccess: () => false
});
var isSuccess3 = /* @__PURE__ */ matchEager({
  onFailure: () => false,
  onSuccess: () => true
});
var delay = /* @__PURE__ */ dual(2, (self, duration) => andThen2(sleep(duration), self));
var timeoutOrElse = /* @__PURE__ */ dual(2, (self, options) => flatMap3(timeoutOption(self, options.duration), (option3) => isNone2(option3) ? options.orElse() : succeed3(option3.value)));
var timeoutErrorFromDuration = (duration) => new TimeoutError(`Operation timed out after '${format2(duration)}'`);
var timeout = /* @__PURE__ */ dual(2, (self, duration) => {
  const decoded = fromInputUnsafe(duration);
  return timeoutOrElse(self, {
    duration: decoded,
    orElse: () => fail3(timeoutErrorFromDuration(decoded))
  });
});
var timeoutOption = /* @__PURE__ */ dual(2, (self, duration) => raceFirst(asSome(self), as(sleep(duration), none2())));
var timed = (self) => clockWith((clock) => {
  const start = clock.monotonicTimeNanosUnsafe();
  return map5(self, (a) => [nanos(clock.monotonicTimeNanosUnsafe() - start), a]);
});
var ScopeTypeId = "~effect/Scope";
var ScopeCloseableTypeId = "~effect/Scope/Closeable";
var scopeTag = /* @__PURE__ */ Service("effect/Scope");
var scopeClose = (self, exit_) => withFiber((fiber3) => {
  fiberEnterUninterruptibleUnsafe(fiber3);
  return scopeCloseUnsafe(self, exit_) ?? void_2;
});
var scopeCloseUnsafe = (self, exit_) => {
  const state = self.state;
  if (state._tag === "Closed") return;
  self.state = {
    _tag: "Closed",
    exit: exit_
  };
  if (self.parent !== void 0) {
    scopeRemoveFinalizerUnsafe(self.parent, self);
  }
  if (state._tag === "Empty") return;
  if (state.finalizer !== void 0) {
    return runFinalizer(state.finalizer, exit_);
  }
  const finalizers = state.finalizers;
  if (finalizers.size === 1) {
    return runFinalizer(finalizers.values().next().value, exit_);
  }
  return scopeCloseFinalizers(self, finalizers, exit_);
};
var runFinalizer = (finalizer, exit_) => {
  try {
    return finalizer(exit_);
  } catch (defect) {
    return exitDie(defect);
  }
};
var combineFinalizerCause = (exit_, finalizer) => exitIsSuccess(exit_) ? finalizer : catchCause(finalizer, (cause) => failCause(causeCombine(exit_.cause, cause)));
var scopeCloseFinalizers = /* @__PURE__ */ fnUntraced(function* (self, finalizers, exit_) {
  let exits = [];
  const fibers = [];
  const arr = Array.from(finalizers.values());
  const parent = getCurrentFiber();
  for (let i = arr.length - 1; i >= 0; i--) {
    const finalizer = arr[i];
    if (self.strategy === "sequential") {
      exits.push(yield* exit(runFinalizer(finalizer, exit_)));
    } else {
      fibers.push(forkUnsafe(parent, runFinalizer(finalizer, exit_), true, true, "inherit"));
    }
  }
  if (fibers.length > 0) {
    exits = yield* fiberAwaitAll(fibers);
  }
  return yield* exitAsVoidAll(exits);
});
var scopeForkUnsafe = (scope3, finalizerStrategy) => {
  const child = makeScope(finalizerStrategy, scope3);
  if (scope3.state._tag === "Closed") {
    child.state = scope3.state;
    return child;
  }
  scopeAddFinalizerUnsafe(scope3, child, (exit4) => scopeClose(child, exit4));
  return child;
};
var scopeAddFinalizerExit = (scope3, finalizer) => {
  return suspend(() => {
    if (scope3.state._tag === "Closed") {
      return finalizer(scope3.state.exit);
    }
    scopeAddFinalizerUnsafe(scope3, {}, finalizer);
    return void_2;
  });
};
var scopeAddFinalizerUnsafe = (scope3, key, finalizer) => {
  if (scope3.state._tag === "Empty") {
    scope3.state = {
      _tag: "Open",
      finalizerKey: key,
      finalizer,
      finalizers: void 0
    };
  } else if (scope3.state._tag === "Open") {
    const state = scope3.state;
    if (state.finalizer !== void 0) {
      state.finalizers = /* @__PURE__ */ new Map([[state.finalizerKey, state.finalizer]]);
      state.finalizerKey = void 0;
      state.finalizer = void 0;
      state.finalizers.set(key, finalizer);
    } else {
      state.finalizers.set(key, finalizer);
    }
  }
};
var scopeRemoveFinalizerUnsafe = (scope3, key) => {
  if (scope3.state._tag !== "Open") return;
  const state = scope3.state;
  if (state.finalizerKey === key) {
    scope3.state = constScopeEmpty;
  } else if (state.finalizers !== void 0) {
    state.finalizers.delete(key);
    if (state.finalizers.size === 0) {
      scope3.state = constScopeEmpty;
    }
  }
};
var scopeMakeUnsafe = (finalizerStrategy) => makeScope(finalizerStrategy, void 0);
var makeScope = (finalizerStrategy = "sequential", parent) => ({
  [ScopeCloseableTypeId]: ScopeCloseableTypeId,
  [ScopeTypeId]: ScopeTypeId,
  strategy: finalizerStrategy,
  parent,
  state: constScopeEmpty
});
var constScopeEmpty = {
  _tag: "Empty"
};
var scope = scopeTag;
var provideScope = /* @__PURE__ */ provideService(scopeTag);
var scoped = (self) => withFiber((fiber3) => {
  const prev = fiber3.context;
  const scope3 = scopeMakeUnsafe();
  fiber3.setContext(add(fiber3.context, scopeTag, scope3));
  onExitUnsafe(fiber3, (exit4) => {
    fiber3.setContext(prev);
    return scopeCloseUnsafe(scope3, exit4);
  });
  return self;
});
var scopedWith = (f) => suspend(() => {
  const scope3 = scopeMakeUnsafe();
  return onExit(f(scope3), (exit4) => suspend(() => scopeCloseUnsafe(scope3, exit4) ?? void_2));
});
var acquireRelease = (acquire, release2, options) => contextWith((context3) => uninterruptibleMask((restore) => flatMap3(scope, (scope3) => tap2(options?.interruptible ? restore(acquire) : acquire, (a) => scopeAddFinalizerExit(scope3, (exit4) => provideContext(release2(a, exit4), context3))))));
var addFinalizer = (finalizer) => flatMap3(scope, (scope3) => contextWith((context3) => scopeAddFinalizerExit(scope3, (exit4) => provideContext(finalizer(exit4), context3))));
var OnExitImpl = /* @__PURE__ */ (function() {
  const Proto8 = /* @__PURE__ */ makePrimitiveProto({
    op: "OnExit",
    [evaluate](fiber3) {
      fiber3._stack.push(this);
      return this.effect;
    },
    [contAll](fiber3) {
      if (fiber3.interruptible && this.interruptible !== true) {
        fiber3._stack.push(setInterruptibleTrue);
        fiber3.interruptible = false;
      }
    },
    [contA](value3, _, exit4) {
      exit4 ??= exitSucceed(value3);
      let eff;
      try {
        eff = this.onExit(exit4);
      } catch (defect) {
        eff = exitDie(defect);
      }
      return eff ? flatMap3(eff, (_2) => exit4) : exit4;
    },
    [contE](cause, _, exit4) {
      exit4 ??= exitFailCause(cause);
      let eff;
      try {
        eff = this.onExit(exit4);
      } catch (defect) {
        eff = exitDie(defect);
      }
      return eff ? flatMap3(combineFinalizerCause(exit4, eff), (_2) => exit4) : exit4;
    }
  });
  const OnExitImpl2 = function(effect2, onExit3, interruptible3) {
    this.effect = effect2;
    this.onExit = onExit3;
    this.interruptible = interruptible3;
  };
  OnExitImpl2.prototype = Proto8;
  return OnExitImpl2;
})();
var onExitPrimitive = (effect2, onExit3, interruptible3) => new OnExitImpl(effect2, onExit3, interruptible3);
var onExitUnsafe = (fiber3, f) => {
  ;
  fiber3._stack.push(new OnExitImpl(void 0, f, void 0));
};
var onExit = /* @__PURE__ */ dual(2, onExitPrimitive);
var ensuring = /* @__PURE__ */ dual(2, (self, finalizer) => onExit(self, (_) => finalizer));
var onExitIf = /* @__PURE__ */ dual(3, (self, predicate, f) => onExit(self, (exit4) => {
  if (!predicate(exit4)) {
    return void_2;
  }
  return f(exit4);
}));
var onExitFilter = /* @__PURE__ */ dual(3, (self, filter8, f) => onExit(self, (exit4) => {
  const b = filter8(exit4);
  return isFailure2(b) ? void_2 : f(b.success, exit4);
}));
var onError = /* @__PURE__ */ dual(2, (self, f) => onExitFilter(self, exitFilterCause, f));
var onErrorIf = /* @__PURE__ */ dual(3, (self, predicate, f) => onExitIf(self, (exit4) => {
  if (exit4._tag !== "Failure") {
    return false;
  }
  return predicate(exit4.cause);
}, (exit4) => f(exit4.cause)));
var onErrorFilter = /* @__PURE__ */ dual(3, (self, filter8, f) => onExit(self, (exit4) => {
  if (exit4._tag !== "Failure") {
    return void_2;
  }
  const result3 = filter8(exit4.cause);
  return isFailure2(result3) ? void_2 : f(result3.success, exit4.cause);
}));
var onInterrupt = /* @__PURE__ */ dual(2, (self, finalizer) => onErrorFilter(causeFilterInterruptors, finalizer)(self));
var acquireUseRelease = (acquire, use, release2) => uninterruptibleMask((restore) => flatMap3(acquire, (a) => onExitPrimitive(suspend(() => restore(use(a))), (exit4) => release2(a, exit4), true)));
var acquireDisposable = (acquire) => acquireRelease(acquire, (resource) => hasProperty(resource, Symbol.asyncDispose) ? promise(() => resource[Symbol.asyncDispose]()) : sync(() => resource[Symbol.dispose]()));
var cachedInvalidateWithTTL = /* @__PURE__ */ dual(2, (self, ttl) => sync(() => makeCachedUnsafe(self, typeof ttl === "function" ? (exit4) => toMillis(fromInputUnsafe(ttl(exit4))) : constant(toMillis(fromInputUnsafe(ttl))))));
var infiniteTTL = /* @__PURE__ */ constant(Infinity);
var makeCachedUnsafe = (self, ttlMillis) => {
  let expiresAt = 0;
  let exit4;
  let current;
  const join10 = (fiber3, run2) => {
    run2.awaiters++;
    onExitUnsafe(fiber3, () => {
      if (--run2.awaiters > 0 || current !== run2) return;
      current = void 0;
      return fiberInterrupt(run2.fiber);
    });
    return fiberJoin(run2.fiber);
  };
  return [withFiber((fiber3) => {
    if (current !== void 0) {
      return fiber3 === current.fiber ? fiberJoin(current.fiber) : join10(fiber3, current);
    }
    if (exit4 !== void 0 && (expiresAt === Infinity || fiber3.getRef(ClockRef).currentTimeMillisUnsafe() < expiresAt)) {
      return exit4;
    }
    exit4 = void 0;
    const clock = fiber3.getRef(ClockRef);
    const run2 = {
      fiber: new FiberImpl(fiber3.context),
      awaiters: 0
    };
    current = run2;
    const joined = join10(fiber3, run2);
    run2.fiber.evaluate(onExitPrimitive(self, (exit_) => {
      if (current !== run2) return;
      current = void 0;
      if (exitHasInterrupts(exit_)) return;
      const duration = ttlMillis(exit_);
      expiresAt = duration === Infinity ? Infinity : clock.currentTimeMillisUnsafe() + duration;
      exit4 = exit_;
    }));
    return run2.fiber._exit ?? joined;
  }), sync(() => {
    exit4 = void 0;
  })];
};
var cachedWithTTL = /* @__PURE__ */ dual(2, (self, timeToLive) => map5(cachedInvalidateWithTTL(self, timeToLive), (tuple2) => tuple2[0]));
var cached = (self) => sync(() => makeCachedUnsafe(self, infiniteTTL)[0]);
var interrupt = /* @__PURE__ */ withFiber((fiber3) => failCause(causeInterrupt(fiber3.id)));
var uninterruptible = (self) => withFiber((fiber3) => {
  if (!fiber3.interruptible) return self;
  fiber3.interruptible = false;
  fiber3._stack.push(setInterruptibleTrue);
  return self;
});
var setInterruptible = /* @__PURE__ */ makePrimitive({
  op: "SetInterruptible",
  [contAll](fiber3) {
    fiber3.interruptible = this[args];
    if (fiber3._interruptedCause && fiber3.interruptible) {
      return () => failCause(fiber3._interruptedCause);
    }
  }
});
var setInterruptibleTrue = /* @__PURE__ */ setInterruptible(true);
var setInterruptibleFalse = /* @__PURE__ */ setInterruptible(false);
var setFiberInterruptible = (fiber3) => {
  fiber3.interruptible = true;
  fiber3._stack.push(setInterruptibleFalse);
  if (fiber3._interruptedCause) return failCause(fiber3._interruptedCause);
};
var fiberEnterUninterruptibleUnsafe = (fiber3) => {
  const impl = fiber3;
  if (!impl.interruptible) return;
  impl.interruptible = false;
  impl._stack.push(setInterruptibleTrue);
};
var interruptible = (self) => withFiber((fiber3) => {
  if (fiber3.interruptible) return self;
  return setFiberInterruptible(fiber3) ?? self;
});
var uninterruptibleMask = (f) => withFiber((fiber3) => {
  if (!fiber3.interruptible) return f(identity);
  fiber3.interruptible = false;
  fiber3._stack.push(setInterruptibleTrue);
  return f(interruptible);
});
var interruptibleMask = (f) => withFiber((fiber3) => {
  if (fiber3.interruptible) return f(identity);
  const interrupted = setFiberInterruptible(fiber3);
  const effect2 = f(uninterruptible);
  return interrupted ?? effect2;
});
var abortSignal = /* @__PURE__ */ map5(/* @__PURE__ */ acquireRelease(/* @__PURE__ */ sync(() => new AbortController()), (controller) => sync(() => controller.abort())), (_) => _.signal);
var all2 = (arg, options) => {
  if (isIterable(arg)) {
    return options?.mode === "result" ? forEach(arg, result, options) : forEach(arg, identity, options);
  } else if (options?.discard) {
    return options.mode === "result" ? forEach(Object.values(arg), result, options) : forEach(Object.values(arg), identity, options);
  }
  return suspend(() => {
    const out = {};
    return as(forEach(Object.entries(arg), ([key, effect2]) => map5(options?.mode === "result" ? result(effect2) : effect2, (value3) => {
      assignProperty(out, key, value3);
    }), {
      discard: true,
      concurrency: options?.concurrency
    }), out);
  });
};
var partition2 = /* @__PURE__ */ dual((args2) => isIterable(args2[0]) && !isEffect(args2[0]), (elements, f, options) => map5(forEach(elements, (a, i) => result(f(a, i)), options), (results2) => partition(results2, identity)));
var reduce = /* @__PURE__ */ dual(3, (elements, zero3, f) => {
  const arr = fromIterable(elements);
  if (arr.length === 0) return sync(zero3);
  return suspend(() => {
    let index2 = 0;
    let state = zero3();
    return map5(whileLoop({
      while: () => index2 < arr.length,
      body: () => f(state, arr[index2], index2),
      step(next) {
        state = next;
        index2++;
      }
    }), () => state);
  });
});
var validate = /* @__PURE__ */ dual((args2) => isIterable(args2[0]) && !isEffect(args2[0]), (elements, f, options) => flatMap3(partition2(elements, f, {
  concurrency: options?.concurrency
}), ([passes, fails]) => {
  if (isArrayNonEmpty2(fails)) {
    return fail3(fails);
  }
  return options?.discard ? void_2 : succeed3(passes);
}));
var findFirst3 = /* @__PURE__ */ dual((args2) => isIterable(args2[0]) && !isEffect(args2[0]), (elements, predicate) => suspend(() => {
  const iterator = elements[Symbol.iterator]();
  const next = iterator.next();
  if (!next.done) {
    return findFirstLoop(iterator, 0, predicate, next.value);
  }
  return succeed3(none2());
}));
var findFirstLoop = (iterator, index2, predicate, value3) => flatMap3(predicate(value3, index2), (keep) => {
  if (keep) {
    return succeed3(some2(value3));
  }
  const next = iterator.next();
  if (!next.done) {
    return findFirstLoop(iterator, index2 + 1, predicate, next.value);
  }
  return succeed3(none2());
});
var findFirstFilter = /* @__PURE__ */ dual((args2) => isIterable(args2[0]) && !isEffect(args2[0]), (elements, filter8) => suspend(() => {
  const iterator = elements[Symbol.iterator]();
  const next = iterator.next();
  if (!next.done) {
    return findFirstFilterLoop(iterator, 0, filter8, next.value);
  }
  return succeed3(none2());
}));
var findFirstFilterLoop = (iterator, index2, filter8, value3) => flatMap3(filter8(value3, index2), (result3) => {
  if (isSuccess2(result3)) {
    return succeed3(some2(result3.success));
  }
  const next = iterator.next();
  if (!next.done) {
    return findFirstFilterLoop(iterator, index2 + 1, filter8, next.value);
  }
  return succeed3(none2());
});
var whileLoop = /* @__PURE__ */ makePrimitive({
  op: "While",
  [contA](value3, fiber3) {
    this[args].step(value3);
    if (this[args].while()) {
      fiber3._stack.push(this);
      return this[args].body();
    }
    return exitVoid;
  },
  [evaluate](fiber3) {
    if (this[args].while()) {
      fiber3._stack.push(this);
      return this[args].body();
    }
    return exitVoid;
  }
});
var forEach = /* @__PURE__ */ dual((args2) => typeof args2[1] === "function", (iterable, f, options) => suspend(() => {
  const concurrency = resolveConcurrency(options?.concurrency);
  if (concurrency === 1) {
    return forEachSequential(iterable, f, options);
  }
  const items = fromIterable(iterable);
  let length = items.length;
  if (length === 0) {
    return options?.discard ? void_2 : succeed3([]);
  }
  const out = options?.discard ? void 0 : new Array(length);
  const eff = forEachConcurrent({
    f,
    out
  }, items, {
    concurrency
  });
  return eff ? as(eff, out) : succeed3(out);
}));
var head = (self) => flatMap3(self, (elements) => {
  const result3 = elements[Symbol.iterator]().next();
  return result3.done ? fail3(new NoSuchElementError()) : succeed3(result3.value);
});
var forEachSequential = (iterable, f, options) => suspend(() => {
  const out = options?.discard ? void 0 : [];
  const iterator = iterable[Symbol.iterator]();
  let state = iterator.next();
  let index2 = 0;
  return as(whileLoop({
    while: () => !state.done,
    body: () => f(state.value, index2++),
    step: (b) => {
      if (out) out.push(b);
      state = iterator.next();
    }
  }), out);
});
var resolveConcurrency = (concurrency) => concurrency === "unbounded" ? Number.POSITIVE_INFINITY : Math.max(1, concurrency ?? 1);
var iterateEager = () => (options) => {
  const onItem = options.onItem;
  const step2 = options.step;
  const resumeSequential = (state, items, index2, end2, effect2) => flatMap3(exit(effect2), (itemExit) => step2(state, items[index2], itemExit, index2) ?? runSequential(state, items, index2 + 1, end2) ?? void_2);
  const runSequential = (state, items, index2 = 0, end2 = items.length) => {
    for (; index2 < end2; index2++) {
      const item = items[index2];
      const effect2 = onItem(state, item, index2);
      if (!effectIsExit(effect2)) {
        return resumeSequential(state, items, index2, end2, effect2);
      }
      const terminal = step2(state, item, effect2, index2);
      if (terminal) return terminal._tag === "Failure" ? terminal : void 0;
    }
  };
  return runSequential;
};
var iterateConcurrentImpl = (options) => {
  const onItem = options.onItem;
  const step2 = options.step;
  return (state, items, opts) => {
    let index2 = 0;
    const end2 = opts.end ?? items.length;
    const concurrency = opts.concurrency;
    let done3 = false;
    let parentFiber;
    let fibers;
    let resume;
    let terminal;
    let effect2;
    const failDefect = (error) => {
      const defect = exitDie(error);
      terminal = defect;
      done3 = true;
      return fibers && fibers.size > 0 ? flatMap3(uninterruptible(fiberInterruptAll(Array.from(fibers))), () => terminal ?? defect) : defect;
    };
    const go = () => {
      let paused = false;
      for (; !terminal && index2 < end2; index2++) {
        const item = items[index2];
        const eff = effect2 ?? onItem(state, item, index2);
        if (effectIsExit(eff)) {
          terminal = step2(state, item, eff, index2);
          if (terminal) break;
        } else if (!parentFiber) {
          return callback((cb) => {
            parentFiber = getCurrentFiber();
            fibers = /* @__PURE__ */ new Set();
            effect2 = eff;
            resume = cb;
            let result3;
            try {
              result3 = go();
            } catch (error) {
              return cb(failDefect(error));
            }
            if (result3) return cb(result3);
            return suspend(() => {
              terminal ??= exitVoid;
              return flatMap3(fibers ? fiberInterruptAll(fibers) : void_2, () => terminal?._tag === "Failure" ? terminal : void_2);
            });
          });
        } else {
          effect2 = void 0;
          const fiber3 = forkUnsafe(parentFiber, eff, true, true, "inherit");
          if (fiber3._exit) {
            terminal = step2(state, item, fiber3._exit, index2);
            if (terminal) break;
            continue;
          }
          fibers.add(fiber3);
          const currentIndex = index2;
          fiber3.addObserver((exit4) => {
            fibers.delete(fiber3);
            try {
              if (terminal) {
                if (exit4._tag === "Failure") {
                  const reasons = exit4.cause.reasons.filter((reason) => reason._tag !== "Interrupt");
                  if (reasons.length > 0) {
                    const cause = causeFromReasons(reasons);
                    terminal = exitFailCause(terminal._tag === "Failure" ? causeCombine(terminal.cause, cause) : cause);
                  }
                }
              } else {
                const result3 = step2(state, item, exit4, currentIndex);
                if (result3) {
                  terminal = result3;
                  go();
                }
              }
              if (paused) {
                const eff2 = go();
                if (eff2) resume(eff2);
              } else if (done3 && fibers.size === 0) {
                resume(terminal ?? void_2);
              }
            } catch (error) {
              resume(failDefect(error));
            }
          });
          if (fibers.size < concurrency) continue;
          paused = true;
          index2++;
          return;
        }
      }
      done3 = true;
      if (terminal) {
        if (fibers && fibers.size > 0) {
          const annotations = fiberStackAnnotations(parentFiber);
          fibers.forEach((f) => f.interruptUnsafe(parentFiber.id, annotations));
          return;
        }
        if (resume || terminal._tag === "Failure") {
          return terminal;
        }
      } else if (resume) {
        if (!fibers) {
          return exitVoid;
        } else if (fibers.size === 0) {
          resume(void_2);
        }
      }
    };
    return go();
  };
};
var iterateConcurrent = () => (options) => iterateConcurrentImpl(options);
var forEachConcurrent = /* @__PURE__ */ iterateConcurrentImpl({
  onItem(state, item, index2) {
    return state.f(item, index2);
  },
  step(state, _, exit4, index2) {
    if (exit4._tag === "Failure") return exit4;
    else if (state.out) {
      state.out[index2] = exit4.value;
    }
  }
});
var filterOrElse = /* @__PURE__ */ dual(3, (self, predicate, orElse2) => flatMap3(self, (a) => predicate(a) ? succeed3(a) : orElse2(a)));
var filterMapOrElse = /* @__PURE__ */ dual(3, (self, filter8, orElse2) => flatMap3(self, (a) => {
  const result3 = filter8(a);
  return isFailure2(result3) ? orElse2(result3.failure) : succeed3(result3.success);
}));
var filterMapOrFail = /* @__PURE__ */ dual((args2) => isEffect(args2[0]), (self, filter8, orFailWith) => filterMapOrElse(self, filter8, orFailWith ? (x) => fail3(orFailWith(x)) : () => fail3(new NoSuchElementError())));
var filter3 = /* @__PURE__ */ dual((args2) => isIterable(args2[0]) && !isEffect(args2[0]), (elements, predicate, options) => suspend(() => {
  const out = [];
  return as(forEach(elements, (a, i) => {
    const result3 = predicate(a, i);
    if (typeof result3 === "boolean") {
      if (result3) out.push(a);
      return void_2;
    }
    return map5(result3, (keep) => {
      if (keep) {
        out.push(a);
      }
    });
  }, {
    discard: true,
    concurrency: options?.concurrency
  }), out);
}));
var filterMap = /* @__PURE__ */ dual((args2) => isIterable(args2[0]) && !isEffect(args2[0]), (elements, filter8) => suspend(() => {
  const out = [];
  for (const a of elements) {
    const result3 = filter8(a);
    if (isSuccess2(result3)) {
      out.push(result3.success);
    }
  }
  return succeed3(out);
}));
var filterMapEffect = /* @__PURE__ */ dual((args2) => isIterable(args2[0]) && !isEffect(args2[0]), (elements, filter8, options) => suspend(() => {
  const out = [];
  return as(forEach(elements, (a) => map5(filter8(a), (result3) => {
    if (isSuccess2(result3)) {
      out.push(result3.success);
    }
  }), {
    discard: true,
    concurrency: options?.concurrency
  }), out);
}));
var Do2 = /* @__PURE__ */ succeed3({});
var bindTo3 = /* @__PURE__ */ bindTo(map5);
var bind3 = /* @__PURE__ */ bind(map5, flatMap3);
var let_3 = /* @__PURE__ */ let_(map5);
var forkChild = /* @__PURE__ */ dual((args2) => isEffect(args2[0]), (self, options) => withFiber((fiber3) => {
  interruptChildrenPatch();
  return succeed3(forkUnsafe(fiber3, self, options?.startImmediately, false, options?.uninterruptible ?? false));
}));
var forkUnsafe = (parent, effect2, immediate = false, daemon = false, uninterruptible3 = false) => {
  const parentRuntime = parent;
  const interruptible3 = uninterruptible3 === "inherit" ? parentRuntime.interruptible : !uninterruptible3;
  const child = new FiberImpl(parentRuntime.context, interruptible3);
  if (!daemon) {
    parentRuntime.children().add(child);
    child._parent = parentRuntime;
  }
  if (immediate) {
    child.evaluate(effect2);
  } else {
    child._asyncContext = captureAsyncContext();
    parentRuntime.currentDispatcher.scheduleTask(() => child.evaluate(effect2), 0);
  }
  return child;
};
var forkDetach = /* @__PURE__ */ dual((args2) => isEffect(args2[0]), (self, options) => withFiber((fiber3) => succeed3(forkUnsafe(fiber3, self, options?.startImmediately, true, options?.uninterruptible))));
var awaitAllChildren = (self) => withFiber((fiber3) => {
  const initialChildren = fiber3._children && new Set(fiber3._children);
  const isInterruptible = fiber3.interruptible;
  return onExitPrimitive(self, (_) => {
    let children = fiber3._children;
    if (children === void 0 || children.size === 0) {
      return void_2;
    } else if (initialChildren) {
      children = filter2(children, (child) => !initialChildren.has(child));
    }
    const awaitChildren = asVoid(fiberAwaitAll(children));
    return isInterruptible ? interruptible(awaitChildren) : awaitChildren;
  });
});
var forkIn = /* @__PURE__ */ dual((args2) => isEffect(args2[0]), (self, scope3, options) => withFiber((parent) => {
  const fiber3 = forkUnsafe(parent, self, options?.startImmediately, true, options?.uninterruptible);
  if (!fiber3._exit) {
    if (scope3.state._tag !== "Closed") {
      const key = {};
      const finalizer = () => withFiberId((interruptor) => interruptor === fiber3.id ? void_2 : fiberInterrupt(fiber3));
      scopeAddFinalizerUnsafe(scope3, key, finalizer);
      fiber3.addObserver(() => scopeRemoveFinalizerUnsafe(scope3, key));
    } else {
      fiber3.interruptUnsafe(parent.id, fiberStackAnnotations(parent));
    }
  }
  return succeed3(fiber3);
}));
var forkScoped = /* @__PURE__ */ dual((args2) => isEffect(args2[0]), (self, options) => flatMap3(scope, (scope3) => forkIn(self, scope3, options)));
var runForkWith = (context3) => (effect2, options) => {
  const fiber3 = new FiberImpl(options?.scheduler ? add(context3, Scheduler, options.scheduler) : context3, options?.uninterruptible !== true);
  fiber3.evaluate(effect2);
  if (fiber3._exit) return fiber3;
  if (options?.signal) {
    if (options.signal.aborted) {
      fiber3.interruptUnsafe();
    } else {
      const abort = () => fiber3.interruptUnsafe();
      options.signal.addEventListener("abort", abort, {
        once: true
      });
      fiber3.addObserver(() => options.signal.removeEventListener("abort", abort));
    }
  }
  if (options?.onFiberStart) {
    options.onFiberStart(fiber3);
  }
  return fiber3;
};
var runFork = /* @__PURE__ */ runForkWith(/* @__PURE__ */ empty());
var runCallbackWith = (context3) => {
  const runFork3 = runForkWith(context3);
  return (effect2, options) => {
    const fiber3 = runFork3(effect2, options);
    if (options?.onExit) {
      fiber3.addObserver(options.onExit);
    }
    return (interruptor) => {
      return fiber3.interruptUnsafe(interruptor);
    };
  };
};
var runCallback = /* @__PURE__ */ runCallbackWith(/* @__PURE__ */ empty());
var runPromiseExitWith = (context3) => {
  const runFork3 = runForkWith(context3);
  return (effect2, options) => {
    const fiber3 = runFork3(effect2, options);
    return new Promise((resolve7) => {
      fiber3.addObserver((exit4) => resolve7(exit4));
    });
  };
};
var runPromiseExit = /* @__PURE__ */ runPromiseExitWith(/* @__PURE__ */ empty());
var runPromiseWith = (context3) => {
  const runPromiseExit3 = runPromiseExitWith(context3);
  return (effect2, options) => runPromiseExit3(effect2, options).then((exit4) => {
    if (exit4._tag === "Failure") {
      throw causeSquash(exit4.cause);
    }
    return exit4.value;
  });
};
var runPromise = /* @__PURE__ */ runPromiseWith(/* @__PURE__ */ empty());
var runSyncExitWith = (context3) => {
  const runFork3 = runForkWith(context3);
  return (effect2) => {
    if (effectIsExit(effect2)) return effect2;
    const scheduler = new MixedScheduler("sync");
    const fiber3 = runFork3(effect2, {
      scheduler
    });
    fiber3._dispatcher?.flush();
    return fiber3._exit ?? exitDie(new AsyncFiberError(fiber3));
  };
};
var runSyncExit = /* @__PURE__ */ runSyncExitWith(/* @__PURE__ */ empty());
var runSyncWith = (context3) => {
  const runSyncExit3 = runSyncExitWith(context3);
  return (effect2) => {
    const exit4 = runSyncExit3(effect2);
    if (exit4._tag === "Failure") throw causeSquash(exit4.cause);
    return exit4.value;
  };
};
var runSync = /* @__PURE__ */ runSyncWith(/* @__PURE__ */ empty());
var tracer = /* @__PURE__ */ withFiber((fiber3) => succeed3(fiber3.getRef(Tracer)));
var withTracer = /* @__PURE__ */ dual(2, (effect2, tracer3) => provideService(effect2, Tracer, tracer3));
var withTracerEnabled = /* @__PURE__ */ provideService(TracerEnabled);
var withTracerTiming = /* @__PURE__ */ provideService(TracerTimingEnabled);
var bigint02 = /* @__PURE__ */ BigInt(0);
var NoopSpanProto = {
  _tag: "Span",
  spanId: "noop",
  traceId: "noop",
  sampled: false,
  status: {
    _tag: "Ended",
    startTime: bigint02,
    endTime: bigint02,
    exit: exitVoid
  },
  attributes: /* @__PURE__ */ new Map(),
  links: [],
  kind: "internal",
  attribute() {
  },
  event() {
  },
  end() {
  },
  addLinks() {
  }
};
var noopSpan = (options) => Object.assign(Object.create(NoopSpanProto), options);
var filterDisablePropagation = (span2) => {
  if (!span2) return none2();
  return get(span2.annotations, DisablePropagation) ? span2._tag === "Span" ? filterDisablePropagation(getOrUndefined(span2.parent)) : none2() : some2(span2);
};
var makeSpanUnsafe = (fiber3, name, options) => {
  const disablePropagation = !fiber3.cache.tracerEnabled || options?.annotations && get(options.annotations, DisablePropagation);
  const parent = options?.parent !== void 0 ? some2(options.parent) : options?.root ? none2() : filterDisablePropagation(fiber3.cache.span);
  let span2;
  if (disablePropagation) {
    span2 = noopSpan({
      name,
      parent,
      annotations: add(options?.annotations ?? empty(), DisablePropagation, true)
    });
  } else {
    const tracer3 = fiber3.cache.tracer ?? nativeTracer;
    const clock = fiber3.getRef(ClockRef);
    const timingEnabled = fiber3.getRef(TracerTimingEnabled);
    const annotationsFromEnv = fiber3.getRef(TracerSpanAnnotations);
    const linksFromEnv = fiber3.getRef(TracerSpanLinks);
    const level = options?.level ?? fiber3.getRef(CurrentTraceLevel);
    const links = options?.links !== void 0 ? [...linksFromEnv, ...options.links] : linksFromEnv.length === 0 ? [] : linksFromEnv.slice();
    span2 = tracer3.span({
      name,
      parent,
      annotations: options?.annotations ?? empty(),
      links,
      startTime: timingEnabled ? clock.currentTimeNanosUnsafe() : bigint02,
      kind: options?.kind ?? "internal",
      root: options?.root ?? false,
      sampled: options?.sampled ?? (isSome2(parent) && parent.value.sampled === false ? false : !isLogLevelGreaterThan(fiber3.getRef(MinimumTraceLevel), level))
    });
    for (const key in annotationsFromEnv) {
      span2.attribute(key, annotationsFromEnv[key]);
    }
    if (options?.attributes !== void 0) {
      for (const key in options.attributes) {
        span2.attribute(key, options.attributes[key]);
      }
    }
  }
  return span2;
};
var makeSpan = (name, options) => withFiber((fiber3) => succeed3(makeSpanUnsafe(fiber3, name, options)));
var makeSpanScoped = (name, options) => uninterruptible(withFiber((fiber3) => {
  const scope3 = getUnsafe(fiber3.context, scopeTag);
  const span2 = makeSpanUnsafe(fiber3, name, options ?? {});
  const clock = fiber3.getRef(ClockRef);
  const timingEnabled = fiber3.getRef(TracerTimingEnabled);
  return as(scopeAddFinalizerExit(scope3, (exit4) => endSpan(span2, exit4, clock, timingEnabled)), span2);
}));
var withSpanScoped = function() {
  const dataFirst = typeof arguments[0] !== "string";
  const name = dataFirst ? arguments[1] : arguments[0];
  const options = addSpanStackTrace(dataFirst ? arguments[2] : arguments[1]);
  if (dataFirst) {
    const self = arguments[0];
    return flatMap3(makeSpanScoped(name, options), (span2) => withParentSpan(self, span2, options));
  }
  return (self) => flatMap3(makeSpanScoped(name, options), (span2) => withParentSpan(self, span2, options));
};
var provideSpanStackFrame = (name, stack) => {
  stack = typeof stack === "function" ? stack : constUndefined;
  return updateService(CurrentStackFrame, (parent) => ({
    name,
    stack,
    parent
  }));
};
var spanAnnotations = TracerSpanAnnotations;
var spanLinks = TracerSpanLinks;
var linkSpans = /* @__PURE__ */ dual((args2) => isEffect(args2[0]), (self, span2, attributes = {}) => {
  const spans = Array.isArray(span2) ? span2 : [span2];
  const links = spans.map((span3) => ({
    span: span3,
    attributes
  }));
  return updateService(self, TracerSpanLinks, (current) => [...current, ...links]);
});
var endSpan = (span2, exit4, clock, timingEnabled) => sync(() => {
  if (span2.status._tag === "Ended") return;
  span2.end(timingEnabled ? clock.currentTimeNanosUnsafe() : bigint02, exit4);
});
var useSpan = (name, ...args2) => {
  const options = args2.length === 1 ? void 0 : args2[0];
  const evaluate3 = args2[args2.length - 1];
  return withFiber((fiber3) => {
    const span2 = makeSpanUnsafe(fiber3, name, options);
    const clock = fiber3.getRef(ClockRef);
    const timingEnabled = fiber3.getRef(TracerTimingEnabled);
    onExitUnsafe(fiber3, (exit4) => endSpan(span2, exit4, clock, timingEnabled));
    return evaluate3(span2);
  });
};
var provideParentSpan = /* @__PURE__ */ provideService(ParentSpan);
var withParentSpan = function() {
  const dataFirst = isEffect(arguments[0]);
  const span2 = dataFirst ? arguments[1] : arguments[0];
  let options = dataFirst ? arguments[2] : arguments[1];
  let provideStackFrame = identity;
  if (span2._tag === "Span") {
    options = addSpanStackTrace(options);
    provideStackFrame = provideSpanStackFrame(span2.name, options?.captureStackTrace);
  }
  if (dataFirst) {
    return provideParentSpan(provideStackFrame(arguments[0]), span2);
  }
  return (self) => provideParentSpan(provideStackFrame(self), span2);
};
var withSpan = function() {
  const dataFirst = typeof arguments[0] !== "string";
  const name = dataFirst ? arguments[1] : arguments[0];
  const traceOptions = addSpanStackTrace(arguments[2]);
  if (dataFirst) {
    const self = arguments[0];
    return useSpan(name, arguments[2], (span2) => withParentSpan(self, span2, traceOptions));
  }
  const fnArg = typeof arguments[1] === "function" ? arguments[1] : void 0;
  const options = fnArg ? void 0 : arguments[1];
  return (self, ...args2) => useSpan(name, fnArg ? fnArg(...args2) : options, (span2) => withParentSpan(self, span2, traceOptions));
};
var annotateSpans = /* @__PURE__ */ dual((args2) => isEffect(args2[0]), (effect2, ...args2) => updateService(effect2, TracerSpanAnnotations, (annotations) => {
  const newAnnotations = args2.length === 1 ? {
    ...annotations,
    ...args2[0]
  } : {
    ...annotations
  };
  if (args2.length === 1) {
    return newAnnotations;
  } else {
    assignProperty(newAnnotations, args2[0], args2[1]);
  }
  return newAnnotations;
}));
var annotateCurrentSpan = (...args2) => withFiber((fiber3) => {
  const span2 = fiber3.currentSpanLocal;
  if (span2) {
    if (args2.length === 1) {
      for (const [key, value3] of Object.entries(args2[0])) {
        span2.attribute(key, value3);
      }
    } else {
      span2.attribute(args2[0], args2[1]);
    }
  }
  return void_2;
});
var currentSpan = /* @__PURE__ */ withFiber((fiber3) => {
  const span2 = fiber3.currentSpanLocal;
  return span2 ? succeed3(span2) : fail3(new NoSuchElementError());
});
var currentParentSpan = /* @__PURE__ */ serviceOptional(ParentSpan);
var ClockRef = /* @__PURE__ */ Reference("effect/Clock", {
  defaultValue: () => new ClockImpl()
});
var MAX_TIMER_MILLIS = 2 ** 31 - 1;
var ClockImpl = class {
  currentTimeMillisUnsafe() {
    return Date.now();
  }
  currentTimeMillis = /* @__PURE__ */ sync(() => this.currentTimeMillisUnsafe());
  currentTimeNanosUnsafe() {
    return wallTimeNanos();
  }
  currentTimeNanos = /* @__PURE__ */ sync(() => this.currentTimeNanosUnsafe());
  monotonicTimeNanosUnsafe() {
    return monotonicNowNanos();
  }
  monotonicTimeNanos = /* @__PURE__ */ sync(() => this.monotonicTimeNanosUnsafe());
  sleep(duration) {
    return this.sleepMillis(toMillis(duration));
  }
  sleepMillis(millis2) {
    if (millis2 <= 0) return yieldNow;
    else if (!Number.isFinite(millis2)) return never;
    return callback((resume) => {
      const continuation = millis2 > MAX_TIMER_MILLIS ? this.sleepMillis(millis2 - MAX_TIMER_MILLIS) : void_2;
      const handle = setTimeout(() => resume(continuation), Math.min(millis2, MAX_TIMER_MILLIS));
      return sync(() => clearTimeout(handle));
    });
  }
};
var nanosPerMilli = /* @__PURE__ */ BigInt(1e6);
var monotonicNowNanos = /* @__PURE__ */ (function() {
  const processHrtime = globalThis.process?.hrtime;
  if (typeof processHrtime?.bigint === "function") {
    return () => processHrtime.bigint();
  }
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return () => BigInt(Math.round(performance.now() * 1e6));
  }
  let previous = /* @__PURE__ */ BigInt(0);
  return () => {
    const current = BigInt(Date.now()) * nanosPerMilli;
    if (current > previous) {
      previous = current;
    }
    return previous;
  };
})();
var wallTimeNanos = /* @__PURE__ */ (function() {
  const reanchorThresholdNanos = /* @__PURE__ */ BigInt(1e9);
  let origin;
  return () => {
    const monotonic = monotonicNowNanos();
    const wall = BigInt(Date.now()) * nanosPerMilli;
    if (origin === void 0) {
      origin = wall - monotonic;
    } else {
      const projected = origin + monotonic;
      const skew = wall > projected ? wall - projected : projected - wall;
      if (skew > reanchorThresholdNanos) {
        origin = wall - monotonic;
      }
    }
    return origin + monotonic;
  };
})();
var clockWith = (f) => withFiber((fiber3) => f(fiber3.getRef(ClockRef)));
var sleep = (duration) => clockWith((clock) => clock.sleep(fromInputUnsafe(duration)));
var currentTimeMillis = /* @__PURE__ */ clockWith((clock) => clock.currentTimeMillis);
var currentTimeNanos = /* @__PURE__ */ clockWith((clock) => clock.currentTimeNanos);
var monotonicTimeNanos = /* @__PURE__ */ clockWith((clock) => clock.monotonicTimeNanos);
var TimeoutErrorTypeId = "~effect/Cause/TimeoutError";
var TimeoutError = class extends (/* @__PURE__ */ TaggedError("TimeoutError")) {
  [TimeoutErrorTypeId] = TimeoutErrorTypeId;
  constructor(message) {
    super({
      message
    });
  }
};
var IllegalArgumentErrorTypeId = "~effect/Cause/IllegalArgumentError";
var IllegalArgumentError = class extends (/* @__PURE__ */ TaggedError("IllegalArgumentError")) {
  [IllegalArgumentErrorTypeId] = IllegalArgumentErrorTypeId;
  constructor(message) {
    super({
      message
    });
  }
};
var ExceededCapacityErrorTypeId = "~effect/Cause/ExceededCapacityError";
var ExceededCapacityError = class extends (/* @__PURE__ */ TaggedError("ExceededCapacityError")) {
  [ExceededCapacityErrorTypeId] = ExceededCapacityErrorTypeId;
  constructor(message) {
    super({
      message
    });
  }
};
var AsyncFiberErrorTypeId = "~effect/Cause/AsyncFiberError";
var AsyncFiberError = class extends (/* @__PURE__ */ TaggedError("AsyncFiberError")) {
  [AsyncFiberErrorTypeId] = AsyncFiberErrorTypeId;
  constructor(fiber3) {
    super({
      message: "An asynchronous Effect was executed with Effect.runSync",
      fiber: fiber3
    });
  }
};
var UnknownErrorTypeId = "~effect/Cause/UnknownError";
var UnknownError = class extends (/* @__PURE__ */ TaggedError("UnknownError")) {
  [UnknownErrorTypeId] = UnknownErrorTypeId;
  constructor(cause, message) {
    super({
      message,
      cause
    });
  }
};
var ConsoleRef = /* @__PURE__ */ Reference("effect/Console", {
  defaultValue: () => globalThis.console
});
var logLevelToOrder = (level) => {
  switch (level) {
    case "All":
      return Number.MIN_SAFE_INTEGER;
    case "Fatal":
      return 5e4;
    case "Error":
      return 4e4;
    case "Warn":
      return 3e4;
    case "Info":
      return 2e4;
    case "Debug":
      return 1e4;
    case "Trace":
      return 0;
    case "None":
      return Number.MAX_SAFE_INTEGER;
  }
};
var LogLevelOrder = /* @__PURE__ */ mapInput(Number2, logLevelToOrder);
var isLogLevelGreaterThan = /* @__PURE__ */ isGreaterThan(LogLevelOrder);
var CurrentLoggers = /* @__PURE__ */ Reference("effect/Logger/CurrentLoggers", {
  defaultValue: () => /* @__PURE__ */ new Set([defaultLogger, tracerLogger])
});
var LogToStderr = /* @__PURE__ */ Reference("effect/Logger/LogToStderr", {
  defaultValue: constFalse
});
var annotateLogsScoped = function() {
  const entries3 = typeof arguments[0] === "string" ? [[arguments[0], arguments[1]]] : Object.entries(arguments[0]);
  return uninterruptible(withFiber((fiber3) => {
    const prev = fiber3.getRef(CurrentLogAnnotations);
    const next = {
      ...prev
    };
    for (let i = 0; i < entries3.length; i++) {
      const [key, value3] = entries3[i];
      assignProperty(next, key, value3);
    }
    fiber3.setContext(add(fiber3.context, CurrentLogAnnotations, next));
    return scopeAddFinalizerExit(getUnsafe(fiber3.context, scopeTag), (_) => {
      const current = fiber3.getRef(CurrentLogAnnotations);
      const next2 = {
        ...current
      };
      for (let i = 0; i < entries3.length; i++) {
        const [key, value3] = entries3[i];
        if (current[key] !== value3 && !Object.is(current[key], value3)) continue;
        if (Object.hasOwn(prev, key)) {
          assignProperty(next2, key, prev[key]);
        } else {
          delete next2[key];
        }
      }
      fiber3.setContext(add(fiber3.context, CurrentLogAnnotations, next2));
      return void_2;
    });
  }));
};
var LoggerTypeId = "~effect/Logger";
var LoggerProto = {
  [LoggerTypeId]: {
    _Message: identity,
    _Output: identity
  },
  pipe() {
    return pipeArguments(this, arguments);
  }
};
var loggerMake = (log2) => {
  const self = Object.create(LoggerProto);
  self.log = log2;
  return self;
};
var formatLabel = (key) => key.replace(/[\s="]/g, "_");
var formatLogSpan = (self, now2) => {
  const label2 = formatLabel(self[0]);
  return `${label2}=${now2 - self[1]}ms`;
};
var logWithLevel = (level) => (...message) => {
  let cause = void 0;
  for (let i = 0, len = message.length; i < len; i++) {
    const msg = message[i];
    if (isCause(msg)) {
      if (cause) {
        ;
        message.splice(i, 1);
      } else {
        message = message.slice(0, i).concat(message.slice(i + 1));
      }
      cause = cause ? causeFromReasons(cause.reasons.concat(msg.reasons)) : msg;
      i--;
    }
  }
  if (cause === void 0) {
    cause = causeEmpty;
  }
  return withFiber((fiber3) => {
    const logLevel = level ?? fiber3.cache.logLevel;
    if (isLogLevelGreaterThan(fiber3.cache.minimumLogLevel, logLevel)) {
      return void_2;
    }
    const clock = fiber3.getRef(ClockRef);
    const loggers = fiber3.getRef(CurrentLoggers);
    if (loggers.size > 0) {
      const date = new Date(clock.currentTimeMillisUnsafe());
      for (const logger of loggers) {
        logger.log({
          cause,
          fiber: fiber3,
          date,
          logLevel,
          message
        });
      }
    }
    return void_2;
  });
};
var colors = {
  bold: "1",
  red: "31",
  green: "32",
  yellow: "33",
  blue: "34",
  cyan: "36",
  white: "37",
  gray: "90",
  black: "30",
  bgBrightRed: "101"
};
var logLevelColors = {
  None: [],
  All: [],
  Trace: [colors.gray],
  Debug: [colors.blue],
  Info: [colors.green],
  Warn: [colors.yellow],
  Error: [colors.red],
  Fatal: [colors.bgBrightRed, colors.black]
};
var defaultDateFormat = (date) => `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}:${date.getSeconds().toString().padStart(2, "0")}.${date.getMilliseconds().toString().padStart(3, "0")}`;
var defaultLogger = /* @__PURE__ */ loggerMake(({
  cause,
  date,
  fiber: fiber3,
  logLevel,
  message
}) => {
  const message_ = Array.isArray(message) ? message.slice() : [message];
  if (cause.reasons.length > 0) {
    message_.push(causePretty(cause));
  }
  const now2 = date.getTime();
  const spans = fiber3.getRef(CurrentLogSpans);
  let spanString = "";
  for (const span2 of spans) {
    spanString += ` ${formatLogSpan(span2, now2)}`;
  }
  const annotations = fiber3.getRef(CurrentLogAnnotations);
  if (Object.keys(annotations).length > 0) {
    message_.push(annotations);
  }
  const console = fiber3.getRef(ConsoleRef);
  const log2 = fiber3.getRef(LogToStderr) ? console.error : console.log;
  log2(`[${defaultDateFormat(date)}] ${logLevel.toUpperCase()} (#${fiber3.id})${spanString}:`, ...message_);
});
var tracerLogger = /* @__PURE__ */ loggerMake(({
  cause,
  fiber: fiber3,
  logLevel,
  message
}) => {
  const clock = fiber3.getRef(ClockRef);
  const annotations = fiber3.getRef(CurrentLogAnnotations);
  const span2 = fiber3.cache.span;
  if (span2 === void 0 || span2._tag === "ExternalSpan") return;
  const attributes = {};
  for (const [key, value3] of Object.entries(annotations)) {
    assignProperty(attributes, key, value3);
  }
  attributes["effect.fiberId"] = fiber3.id;
  attributes["effect.logLevel"] = logLevel.toUpperCase();
  if (cause.reasons.length > 0) {
    attributes["effect.cause"] = causePretty(cause);
  }
  span2.event(toStringUnknown(Array.isArray(message) && message.length === 1 ? message[0] : message), clock.currentTimeNanosUnsafe(), attributes);
});
function interruptChildrenPatch() {
  fiberMiddleware.interruptChildren ??= fiberInterruptChildren;
}
var undefined_ = /* @__PURE__ */ succeed3(void 0);
var withErrorReporting = /* @__PURE__ */ dual((args2) => isEffect(args2[0]), (self, options) => onError(self, (cause) => withFiber((fiber3) => {
  reportCauseUnsafe(fiber3, cause, options?.defectsOnly);
  return void_2;
})));
var reportCauseUnsafe = (fiber3, cause, defectsOnly) => {
  const reporters = fiber3.getRef(CurrentErrorReporters);
  if (reporters.size === 0) return;
  if (defectsOnly && !hasDies(cause)) return;
  const opts = {
    cause,
    fiber: fiber3,
    timestamp: fiber3.getRef(ClockRef).currentTimeNanosUnsafe()
  };
  reporters.forEach((reporter) => reporter.report(opts));
};

// node_modules/effect/dist/Cause.js
var isCause2 = isCause;
var isReason = isCauseReason;
var isFailReason2 = isFailReason;
var fromReasons = causeFromReasons;
var die2 = causeDie;
var makeFailReason = (error) => new Fail(error);
var makeDieReason = (defect) => new Die(defect);
var makeInterruptReason2 = makeInterruptReason;
var map6 = causeMap;
var pretty = causePretty;
var isDone2 = isDone;
var done2 = done;
var IllegalArgumentError2 = IllegalArgumentError;

// node_modules/effect/dist/Effect.js
var Effect_exports = {};
__export(Effect_exports, {
  Do: () => Do3,
  Transaction: () => Transaction,
  TypeId: () => TypeId13,
  abortSignal: () => abortSignal2,
  acquireDisposable: () => acquireDisposable2,
  acquireRelease: () => acquireRelease2,
  acquireUseRelease: () => acquireUseRelease2,
  addFinalizer: () => addFinalizer2,
  all: () => all3,
  andThen: () => andThen3,
  annotateCurrentSpan: () => annotateCurrentSpan2,
  annotateLogs: () => annotateLogs,
  annotateLogsScoped: () => annotateLogsScoped2,
  annotateSpans: () => annotateSpans2,
  as: () => as2,
  asSome: () => asSome2,
  asVoid: () => asVoid2,
  awaitAllChildren: () => awaitAllChildren2,
  bind: () => bind4,
  bindTo: () => bindTo4,
  cached: () => cached2,
  cachedInvalidateWithTTL: () => cachedInvalidateWithTTL2,
  cachedWithTTL: () => cachedWithTTL2,
  callback: () => callback2,
  catch: () => catch_3,
  catchCause: () => catchCause3,
  catchCauseFilter: () => catchCauseFilter2,
  catchCauseIf: () => catchCauseIf2,
  catchDefect: () => catchDefect2,
  catchEager: () => catchEager2,
  catchFilter: () => catchFilter2,
  catchIf: () => catchIf2,
  catchNoSuchElement: () => catchNoSuchElement2,
  catchReason: () => catchReason2,
  catchReasons: () => catchReasons2,
  catchTag: () => catchTag3,
  catchTags: () => catchTags2,
  clockWith: () => clockWith3,
  context: () => context2,
  contextWith: () => contextWith2,
  currentParentSpan: () => currentParentSpan2,
  currentSpan: () => currentSpan2,
  delay: () => delay2,
  die: () => die3,
  effectify: () => effectify,
  ensuring: () => ensuring2,
  eventually: () => eventually2,
  exit: () => exit2,
  fail: () => fail5,
  failCause: () => failCause3,
  failCauseSync: () => failCauseSync2,
  failSync: () => failSync2,
  fiber: () => fiber2,
  fiberId: () => fiberId2,
  filter: () => filter4,
  filterMap: () => filterMap2,
  filterMapEffect: () => filterMapEffect2,
  filterMapOrElse: () => filterMapOrElse2,
  filterMapOrFail: () => filterMapOrFail2,
  filterOrElse: () => filterOrElse2,
  filterOrFail: () => filterOrFail3,
  findFirst: () => findFirst4,
  findFirstFilter: () => findFirstFilter2,
  firstSuccessOf: () => firstSuccessOf2,
  flatMap: () => flatMap5,
  flatMapEager: () => flatMapEager2,
  flatten: () => flatten4,
  flip: () => flip3,
  fn: () => fn2,
  fnUntraced: () => fnUntraced2,
  fnUntracedEager: () => fnUntracedEager2,
  forEach: () => forEach2,
  forever: () => forever3,
  forkChild: () => forkChild2,
  forkDetach: () => forkDetach2,
  forkIn: () => forkIn2,
  forkScoped: () => forkScoped2,
  fromNullishOr: () => fromNullishOr4,
  fromOption: () => fromOption4,
  fromResult: () => fromResult2,
  gen: () => gen3,
  head: () => head2,
  ignore: () => ignore2,
  ignoreCause: () => ignoreCause2,
  interrupt: () => interrupt2,
  interruptible: () => interruptible2,
  interruptibleMask: () => interruptibleMask2,
  isEffect: () => isEffect2,
  isFailure: () => isFailure5,
  isSuccess: () => isSuccess5,
  let: () => let_4,
  linkSpans: () => linkSpans2,
  log: () => log,
  logDebug: () => logDebug,
  logError: () => logError,
  logFatal: () => logFatal,
  logInfo: () => logInfo,
  logTrace: () => logTrace,
  logWarning: () => logWarning,
  logWithLevel: () => logWithLevel2,
  makeSpan: () => makeSpan2,
  makeSpanScoped: () => makeSpanScoped2,
  map: () => map7,
  mapBoth: () => mapBoth3,
  mapBothEager: () => mapBothEager2,
  mapEager: () => mapEager2,
  mapError: () => mapError3,
  mapErrorEager: () => mapErrorEager2,
  match: () => match5,
  matchCause: () => matchCause2,
  matchCauseEager: () => matchCauseEager2,
  matchCauseEffect: () => matchCauseEffect2,
  matchCauseEffectEager: () => matchCauseEffectEager2,
  matchEager: () => matchEager2,
  matchEffect: () => matchEffect3,
  never: () => never2,
  onError: () => onError2,
  onErrorFilter: () => onErrorFilter2,
  onErrorIf: () => onErrorIf2,
  onExit: () => onExit2,
  onExitFilter: () => onExitFilter2,
  onExitIf: () => onExitIf2,
  onExitPrimitive: () => onExitPrimitive2,
  onInterrupt: () => onInterrupt2,
  option: () => option2,
  orDie: () => orDie3,
  orElseSucceed: () => orElseSucceed2,
  partition: () => partition3,
  promise: () => promise2,
  provide: () => provide4,
  provideContext: () => provideContext2,
  provideService: () => provideService2,
  provideServiceEffect: () => provideServiceEffect2,
  race: () => race2,
  raceAll: () => raceAll2,
  raceAllFirst: () => raceAllFirst2,
  raceFirst: () => raceFirst2,
  reduce: () => reduce2,
  repeat: () => repeat2,
  repeatOrElse: () => repeatOrElse2,
  replicate: () => replicate2,
  replicateEffect: () => replicateEffect2,
  request: () => request2,
  requestUnsafe: () => requestUnsafe2,
  result: () => result2,
  retry: () => retry2,
  retryOrElse: () => retryOrElse2,
  runCallback: () => runCallback2,
  runCallbackWith: () => runCallbackWith2,
  runFork: () => runFork2,
  runForkWith: () => runForkWith2,
  runPromise: () => runPromise2,
  runPromiseExit: () => runPromiseExit2,
  runPromiseExitWith: () => runPromiseExitWith2,
  runPromiseWith: () => runPromiseWith2,
  runSync: () => runSync2,
  runSyncExit: () => runSyncExit2,
  runSyncExitWith: () => runSyncExitWith2,
  runSyncWith: () => runSyncWith2,
  sandbox: () => sandbox2,
  satisfiesErrorType: () => satisfiesErrorType2,
  satisfiesServicesType: () => satisfiesServicesType2,
  satisfiesSuccessType: () => satisfiesSuccessType2,
  schedule: () => schedule,
  scheduleFrom: () => scheduleFrom2,
  scope: () => scope2,
  scoped: () => scoped2,
  scopedWith: () => scopedWith2,
  service: () => service2,
  serviceOption: () => serviceOption2,
  setContext: () => setContext2,
  sleep: () => sleep2,
  spanAnnotations: () => spanAnnotations2,
  spanLinks: () => spanLinks2,
  succeed: () => succeed6,
  succeedNone: () => succeedNone3,
  succeedSome: () => succeedSome3,
  suspend: () => suspend3,
  sync: () => sync3,
  tap: () => tap4,
  tapCause: () => tapCause3,
  tapCauseFilter: () => tapCauseFilter2,
  tapCauseIf: () => tapCauseIf2,
  tapDefect: () => tapDefect2,
  tapError: () => tapError3,
  tapErrorTag: () => tapErrorTag2,
  timed: () => timed2,
  timeout: () => timeout2,
  timeoutOption: () => timeoutOption2,
  timeoutOrElse: () => timeoutOrElse2,
  tracer: () => tracer2,
  track: () => track,
  trackDefects: () => trackDefects,
  trackDuration: () => trackDuration,
  trackErrors: () => trackErrors,
  trackSuccesses: () => trackSuccesses,
  transposeOption: () => transposeOption3,
  try: () => try_3,
  tryPromise: () => tryPromise2,
  tx: () => tx,
  txRetry: () => txRetry,
  undefined: () => undefined_2,
  uninterruptible: () => uninterruptible2,
  uninterruptibleMask: () => uninterruptibleMask2,
  unwrapReason: () => unwrapReason2,
  updateContext: () => updateContext2,
  updateService: () => updateService3,
  updateServiceScoped: () => updateServiceScoped2,
  useSpan: () => useSpan2,
  validate: () => validate2,
  void: () => void_4,
  when: () => when2,
  whileLoop: () => whileLoop2,
  withErrorReporting: () => withErrorReporting2,
  withExecutionPlan: () => withExecutionPlan2,
  withFiber: () => withFiber2,
  withFiberSucceed: () => withFiberSucceed2,
  withLogSpan: () => withLogSpan,
  withLogger: () => withLogger,
  withParentSpan: () => withParentSpan3,
  withSpan: () => withSpan3,
  withSpanScoped: () => withSpanScoped2,
  withTracer: () => withTracer2,
  withTracerEnabled: () => withTracerEnabled2,
  withTracerTiming: () => withTracerTiming2,
  yieldNow: () => yieldNow2,
  yieldNowWith: () => yieldNowWith2,
  zip: () => zip2,
  zipWith: () => zipWith2
});

// node_modules/effect/dist/Exit.js
var isExit2 = isExit;
var succeed4 = exitSucceed;
var failCause2 = exitFailCause;
var fail4 = exitFail;
var void_3 = exitVoid;
var isSuccess4 = exitIsSuccess;
var isFailure4 = exitIsFailure;

// node_modules/effect/dist/Layer.js
var Layer_exports = {};
__export(Layer_exports, {
  CurrentMemoMap: () => CurrentMemoMap,
  build: () => build,
  buildWithMemoMap: () => buildWithMemoMap,
  buildWithScope: () => buildWithScope,
  catch: () => catch_2,
  catchCause: () => catchCause2,
  catchTag: () => catchTag2,
  effect: () => effect,
  effectContext: () => effectContext,
  effectDiscard: () => effectDiscard,
  empty: () => empty3,
  flatMap: () => flatMap4,
  forkMemoMap: () => forkMemoMap,
  forkMemoMapUnsafe: () => forkMemoMapUnsafe,
  fresh: () => fresh,
  fromBuild: () => fromBuild,
  fromBuildMemo: () => fromBuildMemo,
  isLayer: () => isLayer,
  launch: () => launch,
  makeMemoMap: () => makeMemoMap,
  makeMemoMapUnsafe: () => makeMemoMapUnsafe,
  merge: () => merge3,
  mergeAll: () => mergeAll2,
  mock: () => mock,
  orDie: () => orDie2,
  parentSpan: () => parentSpan,
  provide: () => provide2,
  provideMerge: () => provideMerge,
  satisfiesErrorType: () => satisfiesErrorType,
  satisfiesServicesType: () => satisfiesServicesType,
  satisfiesSuccessType: () => satisfiesSuccessType,
  span: () => span,
  succeed: () => succeed5,
  succeedContext: () => succeedContext,
  suspend: () => suspend2,
  sync: () => sync2,
  syncContext: () => syncContext,
  tap: () => tap3,
  tapCause: () => tapCause2,
  tapError: () => tapError2,
  unwrap: () => unwrap,
  updateService: () => updateService2,
  withParentSpan: () => withParentSpan2,
  withSpan: () => withSpan2
});

// node_modules/effect/dist/Deferred.js
var TypeId5 = "~effect/Deferred";
var DeferredProto = {
  [TypeId5]: {
    _A: identity,
    _E: identity
  },
  pipe() {
    return pipeArguments(this, arguments);
  }
};
var DeferredImpl = function() {
  this.resumes = void 0;
  this.effect = void 0;
};
DeferredImpl.prototype = DeferredProto;
var makeUnsafe2 = () => new DeferredImpl();
var _await = (self) => callback((resume) => {
  if (self.effect) return resume(self.effect);
  self.resumes ??= [];
  self.resumes.push(resume);
  return sync(() => {
    const resumes = self.resumes;
    if (resumes === void 0) return;
    const index2 = resumes.indexOf(resume);
    if (index2 >= 0) resumes.splice(index2, 1);
  });
});
var doneUnsafe = (self, effect2) => {
  if (self.effect) return false;
  self.effect = effect2;
  if (self.resumes) {
    const resumes = self.resumes;
    self.resumes = void 0;
    for (let i = 0; i < resumes.length; i++) {
      resumes[i](effect2);
    }
  }
  return true;
};

// node_modules/effect/dist/References.js
var CurrentLogAnnotations2 = CurrentLogAnnotations;
var CurrentLogSpans2 = CurrentLogSpans;
var CurrentStackFrame2 = CurrentStackFrame;

// node_modules/effect/dist/Scope.js
var Scope = scopeTag;
var makeUnsafe3 = scopeMakeUnsafe;
var provide = provideScope;
var forkUnsafe2 = scopeForkUnsafe;
var close = scopeClose;

// node_modules/effect/dist/Layer.js
var TypeId6 = "~effect/Layer";
var MemoMapTypeId = "~effect/Layer/MemoMap";
var makeMemoMapEntry = (memoMap, layer) => {
  const entry = {
    observers: 0,
    deferred: makeUnsafe2(),
    scope: makeUnsafe3(),
    finalizer: (exit4) => suspend(() => {
      if (--entry.observers > 0) return void_2;
      memoMap.map.delete(layer);
      return close(entry.scope, exit4);
    })
  };
  return entry;
};
var memoMapObserve = (entry, scope3) => {
  if (scope3.state._tag === "Closed") return false;
  entry.observers++;
  scopeAddFinalizerUnsafe(scope3, {}, entry.finalizer);
  return true;
};
var isLayer = (u) => hasProperty(u, TypeId6);
var LayerProto = {
  [TypeId6]: {
    _ROut: identity,
    _E: identity,
    _RIn: identity
  },
  pipe() {
    return pipeArguments(this, arguments);
  }
};
var fromBuildUnsafe = (build3) => {
  const self = Object.create(LayerProto);
  self.build = build3;
  return self;
};
var fromBuild = (build3) => fromBuildUnsafe((memoMap, scope3) => {
  const layerScope = forkUnsafe2(scope3);
  return onExit(build3(memoMap, layerScope), (exit4) => exit4._tag === "Failure" ? close(layerScope, exit4) : void_2);
});
var fromBuildMemo = (build3) => {
  const self = fromBuild((memoMap, scope3) => memoMap.getOrElseMemoize(self, scope3, build3));
  return self;
};
var MemoMapImpl = class {
  get [MemoMapTypeId]() {
    return MemoMapTypeId;
  }
  parent;
  constructor(parent) {
    this.parent = parent;
  }
  map = /* @__PURE__ */ new Map();
  get(layer, scope3) {
    const local = this.map.get(layer);
    if (local) {
      memoMapObserve(local, scope3);
      return local.deferred.effect ?? _await(local.deferred);
    }
    return this.parent?.get(layer, scope3);
  }
  getOrElseMemoize(layer, scope3, build3) {
    return suspend(() => {
      let deferred;
      return onExitPrimitive(suspend(() => {
        const existing = this.get(layer, scope3);
        if (existing) return existing;
        const entry = makeMemoMapEntry(this, layer);
        if (!memoMapObserve(entry, scope3)) return build3(this, scope3);
        deferred = entry.deferred;
        this.map.set(layer, entry);
        return build3(this, entry.scope);
      }), (exit4) => {
        if (deferred) doneUnsafe(deferred, exit4);
      });
    });
  }
};
var makeMemoMapUnsafe = () => new MemoMapImpl();
var forkMemoMapUnsafe = (parent) => new MemoMapImpl(parent);
var makeMemoMap = /* @__PURE__ */ sync(makeMemoMapUnsafe);
var forkMemoMap = (parent) => sync(() => forkMemoMapUnsafe(parent));
var CurrentMemoMap = class _CurrentMemoMap extends (/* @__PURE__ */ Service()("effect/Layer/CurrentMemoMap")) {
  static forkOrCreate(self) {
    const current = getOrUndefined2(self, _CurrentMemoMap);
    return current ? forkMemoMapUnsafe(current) : makeMemoMapUnsafe();
  }
};
var buildWithMemoMap = /* @__PURE__ */ dual(3, (self, memoMap, scope3) => provideService(map5(suspend(() => self.build(memoMap, scope3)), add(CurrentMemoMap, memoMap)), CurrentMemoMap, memoMap));
var build = (self) => withFiber((fiber3) => buildWithMemoMap(self, CurrentMemoMap.forkOrCreate(fiber3.context), getUnsafe(fiber3.context, Scope)));
var buildWithScope = /* @__PURE__ */ dual(2, (self, scope3) => withFiber((fiber3) => buildWithMemoMap(self, CurrentMemoMap.forkOrCreate(fiber3.context), scope3)));
var succeed5 = function() {
  if (arguments.length === 1) {
    return (resource) => succeedContext(make3(arguments[0], resource));
  }
  return succeedContext(make3(arguments[0], arguments[1]));
};
var succeedContext = (context3) => fromBuildUnsafe(constant(succeed3(context3)));
var empty3 = /* @__PURE__ */ succeedContext(/* @__PURE__ */ empty());
var sync2 = function() {
  if (arguments.length === 1) {
    return (evaluate3) => syncContext(() => make3(arguments[0], evaluate3()));
  }
  return syncContext(() => make3(arguments[0], arguments[1]()));
};
var syncContext = (evaluate3) => fromBuildMemo(constant(sync(evaluate3)));
var effect = function() {
  if (arguments.length === 1) {
    return (effect2) => effectImpl(arguments[0], effect2);
  }
  return effectImpl(arguments[0], arguments[1]);
};
var effectImpl = (service3, effect2) => effectContext(map5(effect2, (value3) => make3(service3, value3)));
var effectContext = (effect2) => fromBuildMemo((_, scope3) => provide(effect2, scope3));
var effectDiscard = (effect2) => effectContext(as(effect2, empty()));
var suspend2 = (evaluate3) => fromBuildMemo((memoMap, scope3) => suspend(() => evaluate3().build(memoMap, scope3)));
var unwrapKey = /* @__PURE__ */ Service("effect/Layer/unwrap");
var unwrap = (self) => flatMap4(effect(unwrapKey)(self), get(unwrapKey));
var mergeAllEffect = (layers, memoMap, scope3) => {
  const parentScope = forkUnsafe2(scope3, "parallel");
  return forEach(layers, (layer) => layer.build(memoMap, forkUnsafe2(parentScope, "sequential")), {
    concurrency: layers.length
  }).pipe(map5((context3) => mergeAll(...context3)));
};
var mergeAll2 = (...layers) => fromBuild((memoMap, scope3) => mergeAllEffect(layers, memoMap, scope3));
var merge3 = /* @__PURE__ */ dual(2, (self, that) => mergeAll2(self, ...Array.isArray(that) ? that : [that]));
var provideWith = (self, that, f) => fromBuild((memoMap, scope3) => flatMap3(Array.isArray(that) ? mergeAllEffect(that, memoMap, scope3) : that.build(memoMap, scope3), (context3) => self.build(memoMap, scope3).pipe(provideContext(context3), map5((merged) => f(merged, context3)))));
var provide2 = /* @__PURE__ */ dual(2, (self, that) => provideWith(self, that, identity));
var provideMerge = /* @__PURE__ */ dual(2, (self, that) => provideWith(self, that, (self2, that2) => merge(that2, self2)));
var flatMap4 = /* @__PURE__ */ dual(2, (self, f) => fromBuild((memoMap, scope3) => flatMap3(self.build(memoMap, scope3), (context3) => f(context3).build(memoMap, scope3))));
var tap3 = /* @__PURE__ */ dual(2, (self, f) => fromBuild((memoMap, scope3) => flatMap3(self.build(memoMap, scope3), (context3) => provide(as(f(context3), context3), scope3))));
var tapError2 = /* @__PURE__ */ dual(2, (self, f) => fromBuild((memoMap, scope3) => catch_(self.build(memoMap, scope3), (error) => provide(andThen2(f(error), fail3(error)), scope3))));
var tapCause2 = /* @__PURE__ */ dual(2, (self, f) => fromBuild((memoMap, scope3) => catchCause(self.build(memoMap, scope3), (cause) => provide(andThen2(f(cause), failCause(cause)), scope3))));
var orDie2 = (self) => fromBuildUnsafe((memoMap, scope3) => orDie(self.build(memoMap, scope3)));
var catch_2 = /* @__PURE__ */ dual(2, (self, onError3) => fromBuildUnsafe((memoMap, scope3) => catch_(self.build(memoMap, scope3), (e) => onError3(e).build(memoMap, scope3))));
var catchTag2 = /* @__PURE__ */ dual(3, (self, k, f) => fromBuildUnsafe((memoMap, scope3) => catchTag(self.build(memoMap, scope3), k, (error) => f(error).build(memoMap, scope3))));
var catchCause2 = /* @__PURE__ */ dual(2, (self, onError3) => fromBuildUnsafe((memoMap, scope3) => catchCause(self.build(memoMap, scope3), (cause) => onError3(cause).build(memoMap, scope3))));
var updateService2 = /* @__PURE__ */ dual(3, (layer, service3, f) => provide2(layer, effect(service3, map5(service3, f))));
var fresh = (self) => fromBuildUnsafe((_, scope3) => self.build(makeMemoMapUnsafe(), scope3));
var launch = (self) => scoped(andThen2(build(self), never));
var mock = function() {
  if (arguments.length === 1) {
    return (implementation) => mockImpl(arguments[0], implementation);
  }
  return mockImpl(arguments[0], arguments[1]);
};
var mockImpl = (service3, implementation) => succeed5(service3)(new Proxy({
  ...implementation
}, {
  get(target, prop, _receiver) {
    if (prop in target) {
      return target[prop];
    }
    const prevLimit = getStackTraceLimit();
    setStackTraceLimit(2);
    const error = new Error(`${service3.key}: Unimplemented method "${prop.toString()}"`);
    setStackTraceLimit(prevLimit);
    error.name = "UnimplementedError";
    return makeUnimplemented(error);
  },
  has: constTrue
}));
var makeUnimplemented = (error) => {
  const dead = Object.assign(die(error), {
    [StreamTypeId]: StreamTypeId,
    channel: {
      [ChannelTypeId]: ChannelTypeId,
      transform: () => succeed3(dead),
      pipe() {
        return pipeArguments(this, arguments);
      }
    },
    [ChannelTypeId]: ChannelTypeId,
    transform: () => succeed3(dead)
  });
  function unimplemented() {
    return dead;
  }
  Object.assign(unimplemented, dead);
  Object.setPrototypeOf(unimplemented, Object.getPrototypeOf(dead));
  return unimplemented;
};
var StreamTypeId = "~effect/Stream";
var ChannelTypeId = "~effect/Channel";
var satisfiesSuccessType = () => (layer) => layer;
var satisfiesErrorType = () => (layer) => layer;
var satisfiesServicesType = () => (layer) => layer;
var span = (name, options) => {
  options = addSpanStackTrace(options);
  return effect(ParentSpan, options?.onEnd ? tap2(makeSpanScoped(name, options), (span2) => addFinalizer((exit4) => options.onEnd(span2, exit4))) : makeSpanScoped(name, options));
};
var parentSpan = (span2) => succeedContext(ParentSpan.context(span2));
var withSpan2 = function() {
  const dataFirst = typeof arguments[0] !== "string";
  const name = dataFirst ? arguments[1] : arguments[0];
  const options = addSpanStackTrace(dataFirst ? arguments[2] : arguments[1]);
  if (dataFirst) {
    const self = arguments[0];
    return unwrap(map5(options?.onEnd !== void 0 ? tap2(makeSpanScoped(name, options), (span2) => addFinalizer((exit4) => options.onEnd(span2, exit4))) : makeSpanScoped(name, options), (span2) => withParentSpan2(self, span2, options)));
  }
  return (self) => unwrap(map5(options?.onEnd !== void 0 ? tap2(makeSpanScoped(name, options), (span2) => addFinalizer((exit4) => options.onEnd(span2, exit4))) : makeSpanScoped(name, options), (span2) => withParentSpan2(self, span2, options)));
};
var withParentSpan2 = function() {
  const dataFirst = isLayer(arguments[0]);
  const span2 = dataFirst ? arguments[1] : arguments[0];
  let options = dataFirst ? arguments[2] : arguments[1];
  let provideStackFrame = identity;
  if (span2._tag === "Span") {
    options = addSpanStackTrace(options);
    provideStackFrame = provideSpanStackFrame2(span2.name, options?.captureStackTrace);
  }
  const parentSpanLayer = parentSpan(span2);
  if (dataFirst) {
    return provide2(provideStackFrame(arguments[0]), parentSpanLayer);
  }
  return (self) => provide2(provideStackFrame(self), parentSpanLayer);
};
var provideSpanStackFrame2 = (name, stack) => {
  stack = typeof stack === "function" ? stack : constUndefined;
  return updateService2(CurrentStackFrame2, (parent) => ({
    name,
    stack,
    parent
  }));
};

// node_modules/effect/dist/Clock.js
var Clock_exports = {};
__export(Clock_exports, {
  Clock: () => Clock,
  clockWith: () => clockWith2,
  currentTimeMillis: () => currentTimeMillis2,
  currentTimeNanos: () => currentTimeNanos2,
  monotonicTimeNanos: () => monotonicTimeNanos2
});
var Clock = ClockRef;
var clockWith2 = clockWith;
var currentTimeMillis2 = currentTimeMillis;
var currentTimeNanos2 = currentTimeNanos;
var monotonicTimeNanos2 = monotonicTimeNanos;

// node_modules/effect/dist/internal/dateTime.js
var TypeId7 = "~effect/DateTime";
var TimeZoneTypeId = "~effect/DateTime/TimeZone";
var Proto2 = {
  [TypeId7]: TypeId7,
  pipe() {
    return pipeArguments(this, arguments);
  },
  [NodeInspectSymbol]() {
    return this.toString();
  },
  toJSON() {
    return toDateUtc(this).toJSON();
  }
};
var ProtoUtc = {
  ...Proto2,
  _tag: "Utc",
  [symbol]() {
    return number(this.epochMilliseconds);
  },
  [symbol2](that) {
    return isDateTime(that) && that._tag === "Utc" && this.epochMilliseconds === that.epochMilliseconds;
  },
  toString() {
    return `DateTime.Utc(${toDateUtc(this).toJSON()})`;
  }
};
var ProtoZoned = {
  ...Proto2,
  _tag: "Zoned",
  [symbol]() {
    return combine(number(this.epochMilliseconds))(hash(this.zone));
  },
  [symbol2](that) {
    return isDateTime(that) && that._tag === "Zoned" && this.epochMilliseconds === that.epochMilliseconds && equals(this.zone, that.zone);
  },
  toString() {
    return `DateTime.Zoned(${formatIsoZoned(this)})`;
  }
};
var ProtoTimeZone = {
  [TimeZoneTypeId]: TimeZoneTypeId,
  [NodeInspectSymbol]() {
    return this.toString();
  }
};
var ProtoTimeZoneNamed = {
  ...ProtoTimeZone,
  _tag: "Named",
  [symbol]() {
    return string(`Named:${this.id}`);
  },
  [symbol2](that) {
    return isTimeZone(that) && that._tag === "Named" && this.id === that.id;
  },
  toString() {
    return `TimeZone.Named(${this.id})`;
  },
  toJSON() {
    return {
      _id: "TimeZone",
      _tag: "Named",
      id: this.id
    };
  }
};
var ProtoTimeZoneOffset = {
  ...ProtoTimeZone,
  _tag: "Offset",
  [symbol]() {
    return string(`Offset:${this.offset}`);
  },
  [symbol2](that) {
    return isTimeZone(that) && that._tag === "Offset" && this.offset === that.offset;
  },
  toString() {
    return `TimeZone.Offset(${offsetToString(this.offset)})`;
  },
  toJSON() {
    return {
      _id: "TimeZone",
      _tag: "Offset",
      offset: this.offset
    };
  }
};
var makeZonedProto = (epochMillis, zone, partsUtc) => {
  const self = Object.create(ProtoZoned);
  self.epochMilliseconds = epochMillis;
  self.zone = zone;
  Object.defineProperty(self, "partsUtc", {
    value: partsUtc,
    enumerable: false,
    writable: true
  });
  Object.defineProperty(self, "adjustedEpochMillis", {
    value: void 0,
    enumerable: false,
    writable: true
  });
  Object.defineProperty(self, "partsAdjusted", {
    value: void 0,
    enumerable: false,
    writable: true
  });
  return self;
};
var isDateTime = (u) => hasProperty(u, TypeId7);
var isTimeZone = (u) => hasProperty(u, TimeZoneTypeId);
var isTimeZoneOffset = (u) => isTimeZone(u) && u._tag === "Offset";
var isTimeZoneNamed = (u) => isTimeZone(u) && u._tag === "Named";
var isUtc = (self) => self._tag === "Utc";
var isZoned = (self) => self._tag === "Zoned";
var Equivalence2 = /* @__PURE__ */ make((a, b) => a.epochMilliseconds === b.epochMilliseconds);
var makeUtc = (epochMillis) => {
  const self = Object.create(ProtoUtc);
  self.epochMilliseconds = epochMillis;
  Object.defineProperty(self, "partsUtc", {
    value: void 0,
    enumerable: false,
    writable: true
  });
  return self;
};
var fromDateUnsafe = (date) => {
  const epochMillis = date.getTime();
  if (Number.isNaN(epochMillis)) {
    throw new IllegalArgumentError2("Invalid date");
  }
  return makeUtc(epochMillis);
};
var makeUnsafe4 = (input) => {
  if (isDateTime(input)) {
    return input;
  } else if (input instanceof Date) {
    return fromDateUnsafe(input);
  } else if (typeof input === "object") {
    if ("epochMilliseconds" in input) {
      return fromDateUnsafe(new Date(input.epochMilliseconds));
    }
    const date = /* @__PURE__ */ new Date(0);
    setPartsDate(date, input);
    return fromDateUnsafe(date);
  } else if (typeof input === "string" && !hasZone(input)) {
    return fromDateUnsafe(/* @__PURE__ */ new Date(input + "Z"));
  }
  return fromDateUnsafe(new Date(input));
};
var hasZone = (input) => /Z|GMT|[+-]\d{2}$|[+-]\d{2}:?\d{2}$|\]$/.test(input);
var minEpochMillis = -864e13 + 12 * 60 * 60 * 1e3;
var maxEpochMillis = 864e13 - 14 * 60 * 60 * 1e3;
var makeZonedUnsafe = (input, options) => {
  let timeZoneOption = options?.timeZone;
  if (timeZoneOption === void 0 && isDateTime(input) && isZoned(input)) {
    return input;
  }
  const self = makeUnsafe4(input);
  if (self.epochMilliseconds < minEpochMillis || self.epochMilliseconds > maxEpochMillis) {
    throw new RangeError(`Epoch millis out of range: ${self.epochMilliseconds}`);
  }
  if (timeZoneOption === void 0 && typeof input === "object" && "timeZoneId" in input) {
    timeZoneOption = input.timeZoneId;
  }
  let zone;
  if (timeZoneOption === void 0) {
    const offset = new Date(self.epochMilliseconds).getTimezoneOffset() * -60 * 1e3;
    zone = zoneMakeOffset(offset);
  } else if (isTimeZone(timeZoneOption)) {
    zone = timeZoneOption;
  } else if (typeof timeZoneOption === "number") {
    zone = zoneMakeOffset(timeZoneOption);
  } else {
    const parsedZone = zoneFromString(timeZoneOption);
    if (isNone2(parsedZone)) {
      throw new IllegalArgumentError2(`Invalid time zone: ${timeZoneOption}`);
    }
    zone = parsedZone.value;
  }
  if (options?.adjustForTimeZone !== true) {
    return makeZonedProto(self.epochMilliseconds, zone, self.partsUtc);
  }
  return makeZonedFromAdjusted(self.epochMilliseconds, zone, options?.disambiguation ?? "compatible");
};
var makeZoned = /* @__PURE__ */ liftThrowable(makeZonedUnsafe);
var make6 = /* @__PURE__ */ liftThrowable(makeUnsafe4);
var zonedStringRegExp = /^(.{17,35})\[(.+)\]$/;
var makeZonedFromString = (input) => {
  const match7 = zonedStringRegExp.exec(input);
  if (match7 === null) {
    const offset = parseOffset(input);
    return offset !== null ? makeZoned(input, {
      timeZone: offset
    }) : none2();
  }
  const [, isoString, timeZone] = match7;
  return makeZoned(isoString, {
    timeZone
  });
};
var toUtc = (self) => makeUtc(self.epochMilliseconds);
var validZoneCache = /* @__PURE__ */ new Map();
var formatOptions = {
  day: "numeric",
  month: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
  timeZoneName: "longOffset",
  fractionalSecondDigits: 3,
  hourCycle: "h23"
};
var zoneMakeIntl = (format7) => {
  const zoneId = format7.resolvedOptions().timeZone;
  const cached3 = validZoneCache.get(zoneId);
  if (cached3 !== void 0) {
    return cached3;
  }
  const zone = Object.create(ProtoTimeZoneNamed);
  zone.id = zoneId;
  zone.format = format7;
  validZoneCache.set(zoneId, zone);
  return zone;
};
var zoneMakeNamedUnsafe = (zoneId) => {
  const cached3 = validZoneCache.get(zoneId);
  if (cached3 !== void 0) {
    return cached3;
  }
  try {
    const zone = zoneMakeIntl(new Intl.DateTimeFormat("en-US", {
      ...formatOptions,
      timeZone: zoneId
    }));
    validZoneCache.set(zoneId, zone);
    return zone;
  } catch {
    throw new IllegalArgumentError2(`Invalid time zone: ${zoneId}`);
  }
};
var zoneMakeOffset = (offset) => {
  const zone = Object.create(ProtoTimeZoneOffset);
  zone.offset = offset;
  return zone;
};
var zoneMakeNamed = /* @__PURE__ */ liftThrowable(zoneMakeNamedUnsafe);
var offsetZoneRegExp = /^(?:GMT|[+-])/;
var zoneFromString = (zone) => {
  if (offsetZoneRegExp.test(zone)) {
    const offset = parseOffset(zone);
    return offset === null ? none2() : some2(zoneMakeOffset(offset));
  }
  return zoneMakeNamed(zone);
};
var zoneToString = (self) => {
  if (self._tag === "Offset") {
    return offsetToString(self.offset);
  }
  return self.id;
};
var toDateUtc = (self) => new Date(self.epochMilliseconds);
var toDate = (self) => {
  if (self._tag === "Utc") {
    return new Date(self.epochMilliseconds);
  } else if (self.zone._tag === "Offset") {
    return new Date(self.epochMilliseconds + self.zone.offset);
  } else if (self.adjustedEpochMilliseconds !== void 0) {
    return new Date(self.adjustedEpochMilliseconds);
  }
  const parts2 = self.zone.format.formatToParts(self.epochMilliseconds).filter((_) => _.type !== "literal");
  const date = /* @__PURE__ */ new Date(0);
  date.setUTCFullYear(Number(parts2[2].value), Number(parts2[0].value) - 1, Number(parts2[1].value));
  date.setUTCHours(Number(parts2[3].value), Number(parts2[4].value), Number(parts2[5].value), parts2[6]?.type === "fractionalSecond" ? Number(parts2[6].value) : (self.epochMilliseconds % 1e3 + 1e3) % 1e3);
  self.adjustedEpochMilliseconds = date.getTime();
  return date;
};
var zonedOffset = (self) => {
  const date = toDate(self);
  return date.getTime() - toEpochMillis(self);
};
var offsetToString = (offset) => {
  const abs2 = Math.abs(offset);
  let hours2 = Math.floor(abs2 / (60 * 60 * 1e3));
  let minutes2 = Math.round(abs2 % (60 * 60 * 1e3) / (60 * 1e3));
  if (minutes2 === 60) {
    hours2 += 1;
    minutes2 = 0;
  }
  return `${offset < 0 ? "-" : "+"}${String(hours2).padStart(2, "0")}:${String(minutes2).padStart(2, "0")}`;
};
var zonedOffsetIso = (self) => offsetToString(zonedOffset(self));
var toEpochMillis = (self) => self.epochMilliseconds;
var setPartsDate = (date, parts2) => {
  if (parts2.year !== void 0 || parts2.month !== void 0 || parts2.day !== void 0) {
    date.setUTCFullYear(parts2.year ?? date.getUTCFullYear(), parts2.month !== void 0 ? parts2.month - 1 : date.getUTCMonth(), parts2.day ?? date.getUTCDate());
  }
  if (parts2.weekDay !== void 0) {
    const diff = parts2.weekDay - date.getUTCDay();
    date.setUTCDate(date.getUTCDate() + diff);
  }
  if (parts2.hour !== void 0) {
    date.setUTCHours(parts2.hour);
  }
  if (parts2.minute !== void 0) {
    date.setUTCMinutes(parts2.minute);
  }
  if (parts2.second !== void 0) {
    date.setUTCSeconds(parts2.second);
  }
  if (parts2.millisecond !== void 0) {
    date.setUTCMilliseconds(parts2.millisecond);
  }
};
var constDayMillis = 24 * 60 * 60 * 1e3;
var makeZonedFromAdjusted = (adjustedMillis, zone, disambiguation) => {
  if (zone._tag === "Offset") {
    return makeZonedProto(adjustedMillis - zone.offset, zone);
  }
  const beforeOffset = calculateNamedOffset(adjustedMillis - constDayMillis, adjustedMillis, zone);
  const afterOffset = calculateNamedOffset(adjustedMillis + constDayMillis, adjustedMillis, zone);
  if (beforeOffset === afterOffset) {
    return makeZonedProto(adjustedMillis - beforeOffset, zone);
  }
  const isForwards = beforeOffset < afterOffset;
  const transitionMillis = beforeOffset - afterOffset;
  if (isForwards) {
    const currentAfterOffset = calculateNamedOffset(adjustedMillis - afterOffset, adjustedMillis, zone);
    if (currentAfterOffset === afterOffset) {
      return makeZonedProto(adjustedMillis - afterOffset, zone);
    }
    const before = makeZonedProto(adjustedMillis - beforeOffset, zone);
    const beforeAdjustedMillis = toDate(before).getTime();
    if (adjustedMillis !== beforeAdjustedMillis) {
      switch (disambiguation) {
        case "reject": {
          const formatted = new Date(adjustedMillis).toISOString();
          throw new RangeError(`Gap time: ${formatted} does not exist in time zone ${zone.id}`);
        }
        case "earlier":
          return makeZonedProto(adjustedMillis - afterOffset, zone);
        case "compatible":
        case "later":
          return before;
      }
    }
    return before;
  }
  const currentBeforeOffset = calculateNamedOffset(adjustedMillis - beforeOffset, adjustedMillis, zone);
  if (currentBeforeOffset === beforeOffset) {
    if (disambiguation === "earlier" || disambiguation === "compatible") {
      return makeZonedProto(adjustedMillis - beforeOffset, zone);
    }
    const laterOffset = calculateNamedOffset(adjustedMillis - beforeOffset + transitionMillis, adjustedMillis + transitionMillis, zone);
    if (laterOffset === beforeOffset) {
      return makeZonedProto(adjustedMillis - beforeOffset, zone);
    }
    if (disambiguation === "reject") {
      const formatted = new Date(adjustedMillis).toISOString();
      throw new RangeError(`Ambiguous time: ${formatted} occurs twice in time zone ${zone.id}`);
    }
  }
  return makeZonedProto(adjustedMillis - afterOffset, zone);
};
var offsetRegExp = /([+-])(\d{2}):(\d{2})$/;
var parseOffset = (offset) => {
  const match7 = offsetRegExp.exec(offset);
  if (match7 === null) {
    return null;
  }
  const [, sign2, hours2, minutes2] = match7;
  return (sign2 === "+" ? 1 : -1) * (Number(hours2) * 60 + Number(minutes2)) * 60 * 1e3;
};
var calculateNamedOffset = (utcMillis, adjustedMillis, zone) => {
  const offset = zone.format.formatToParts(utcMillis).find((_) => _.type === "timeZoneName")?.value ?? "";
  if (offset === "GMT") {
    return 0;
  }
  const result3 = parseOffset(offset);
  if (result3 === null) {
    return zonedOffset(makeZonedProto(adjustedMillis, zone));
  }
  return result3;
};
var formatIso = (self) => toDateUtc(self).toISOString();
var formatIsoOffset = (self) => {
  const date = toDate(self);
  return self._tag === "Utc" ? date.toISOString() : `${date.toISOString().slice(0, -1)}${zonedOffsetIso(self)}`;
};
var formatIsoZoned = (self) => self.zone._tag === "Offset" ? formatIsoOffset(self) : `${formatIsoOffset(self)}[${self.zone.id}]`;

// node_modules/effect/dist/Number.js
var Number3 = globalThis.Number;
var remainder = /* @__PURE__ */ dual(2, (self, divisor) => {
  if (!globalThis.Number.isFinite(self) || !globalThis.Number.isFinite(divisor) || divisor === 0) {
    return NaN;
  }
  if (globalThis.Number.isInteger(self) && globalThis.Number.isInteger(divisor)) {
    return self % divisor;
  }
  const [selfCoefficient, selfExponent] = toScientificInteger(self);
  const [divisorCoefficient, divisorExponent] = toScientificInteger(divisor);
  const exponent = Math.min(selfExponent, divisorExponent);
  const selfInteger = selfCoefficient * BigInt(10) ** BigInt(selfExponent - exponent);
  const divisorInteger = divisorCoefficient * BigInt(10) ** BigInt(divisorExponent - exponent);
  const out = selfInteger % divisorInteger;
  if (out === BigInt(0)) {
    return self < 0 || Object.is(self, -0) ? -0 : 0;
  }
  const remainder2 = globalThis.Number(`${out}e${exponent}`);
  return remainder2 === 0 ? Math.sign(self) * globalThis.Number.MIN_VALUE : remainder2;
});
function toScientificInteger(n) {
  if (globalThis.Number.isInteger(n)) {
    return [BigInt(n), 0];
  }
  const scientific = Math.abs(n).toExponential();
  const eIndex = scientific.indexOf("e");
  const digits = scientific.slice(0, eIndex).replace(".", "");
  const coefficient = BigInt(digits) * (n < 0 ? -BigInt(1) : BigInt(1));
  return [coefficient, globalThis.Number(scientific.slice(eIndex + 1)) - digits.length + 1];
}

// node_modules/effect/dist/String.js
var String3 = globalThis.String;
var trim = (self) => self.trim();

// node_modules/effect/dist/Pull.js
var catchDone = /* @__PURE__ */ dual(2, (effect2, f) => catchCauseFilter(effect2, filterDoneLeftover, (l) => f(l)));
var isDoneCause = (cause) => cause.reasons.some(isDoneFailure);
var isDoneFailure = (failure) => failure._tag === "Fail" && isDone2(failure.error);
var filterDone = (cause) => {
  let done3;
  let hasFailure = false;
  for (const reason of cause.reasons) {
    if (isDoneFailure(reason)) {
      done3 ??= reason.error;
    } else if (reason._tag !== "Interrupt") {
      hasFailure = true;
    }
  }
  if (done3 === void 0) return fail2(cause);
  return hasFailure ? fail2(fromReasons(cause.reasons.filter((reason) => !isDoneFailure(reason)))) : succeed2(done3);
};
var filterDoneLeftover = (cause) => {
  const done3 = filterDone(cause);
  return isFailure2(done3) ? done3 : succeed2(done3.success.value);
};
var matchEffect2 = /* @__PURE__ */ dual(2, (self, options) => matchCauseEffect(self, {
  onSuccess: options.onSuccess,
  onFailure: (cause) => {
    const halt = filterDone(cause);
    return !isFailure2(halt) ? options.onDone(halt.success.value) : options.onFailure(halt.failure);
  }
}));

// node_modules/effect/dist/Schedule.js
var TypeId8 = "~effect/Schedule";
var CurrentMetadata = /* @__PURE__ */ Reference("effect/Schedule/CurrentMetadata", {
  defaultValue: /* @__PURE__ */ constant({
    input: void 0,
    output: void 0,
    duration: zero,
    attempt: 0,
    start: 0,
    now: 0,
    elapsed: 0,
    elapsedSincePrevious: 0
  })
});
var ScheduleProto = {
  [TypeId8]: {
    _Out: identity,
    _In: identity,
    _Env: identity
  },
  pipe() {
    return pipeArguments(this, arguments);
  }
};
var isSchedule = (u) => hasProperty(u, TypeId8);
var fromStep = (step2) => {
  const self = Object.create(ScheduleProto);
  self.step = step2;
  return self;
};
var metadataFn = () => {
  let n = 0;
  let previous;
  let start;
  return (now2, input) => {
    if (start === void 0) start = now2;
    const elapsed = now2 - start;
    const elapsedSincePrevious = previous === void 0 ? 0 : now2 - previous;
    previous = now2;
    return {
      input,
      attempt: ++n,
      start,
      now: now2,
      elapsed,
      elapsedSincePrevious
    };
  };
};
var fromStepWithMetadata = (step2) => fromStep(map5(step2, (f) => {
  const meta = metadataFn();
  return (now2, input) => f(meta(now2, input));
}));
var toStep = (schedule2) => catchCause(schedule2.step, (cause) => succeed3(() => failCause(cause)));
var toStepWithMetadata = (schedule2) => clockWith((clock) => map5(toStep(schedule2), (step2) => {
  const metaFn = metadataFn();
  return (input) => suspend(() => {
    const now2 = clock.currentTimeMillisUnsafe();
    return flatMap3(step2(now2, input), ([output, duration]) => {
      const meta = metaFn(now2, input);
      meta.output = output;
      meta.duration = duration;
      return as(sleep(duration), meta);
    });
  });
}));
var passthrough = (self) => fromStep(map5(toStep(self), (step2) => (now2, input) => matchEffect2(step2(now2, input), {
  onSuccess: (result3) => succeed3([input, result3[1]]),
  onFailure: failCause,
  onDone: () => done2(input)
})));
var recurs = (times) => while_(forever2, ({
  attempt
}) => succeed3(attempt <= times));
var spaced = (duration) => {
  const decoded = fromInputUnsafe(duration);
  return fromStepWithMetadata(succeed3((meta) => succeed3([meta.attempt - 1, decoded])));
};
var while_ = /* @__PURE__ */ dual(2, (self, predicate) => fromStep(map5(toStep(self), (step2) => {
  const meta = metadataFn();
  return (now2, input) => flatMap3(step2(now2, input), (result3) => {
    const [output, duration] = result3;
    const eff = predicate({
      ...meta(now2, input),
      output,
      duration
    });
    return flatMap3(isEffect(eff) ? eff : succeed3(eff), (check2) => check2 ? succeed3(result3) : done2(output));
  });
})));
var forever2 = /* @__PURE__ */ spaced(zero);

// node_modules/effect/dist/ExecutionPlan.js
var TypeId9 = "~effect/ExecutionPlan";
var Proto3 = {
  [TypeId9]: TypeId9,
  get captureRequirements() {
    const self = this;
    return contextWith((context3) => succeed3(makeProto(self.steps.map((step2) => ({
      ...step2,
      while: step2.while ? (input) => provideContext(step2.while(input), context3) : void 0,
      schedule: step2.schedule ? fromStep(provideContext(map5(toStep(step2.schedule), (next) => (now2, input) => provideContext(next(now2, input), context3)), context3)) : void 0,
      provide: isLayer(step2.provide) ? provide2(step2.provide, succeedContext(context3)) : step2.provide
    })))));
  },
  pipe() {
    return pipeArguments(this, arguments);
  }
};
var makeProto = (steps) => {
  const self = Object.create(Proto3);
  self.steps = steps;
  return self;
};
var CurrentMetadata2 = /* @__PURE__ */ Reference("effect/ExecutionPlan/CurrentMetadata", {
  defaultValue: /* @__PURE__ */ constant({
    attempt: 0,
    stepIndex: 0
  })
});

// node_modules/effect/dist/internal/layer.js
var provideLayer = (self, layer, options) => scopedWith((scope3) => flatMap3(options?.local ? buildWithMemoMap(layer, makeMemoMapUnsafe(), scope3) : buildWithScope(layer, scope3), (context3) => provideContext(self, context3)));
var provide3 = /* @__PURE__ */ dual((args2) => isEffect(args2[0]), (self, source, options) => isContext(source) ? provideContext(self, source) : provideLayer(self, Array.isArray(source) ? mergeAll2(...source) : source, options));

// node_modules/effect/dist/internal/schedule.js
var findErrorOnly = (cause) => cause.reasons.every(isFailReason) ? findError(cause) : fail2(cause);
var repeatOrElse = /* @__PURE__ */ dual(3, (self, schedule2, orElse2) => flatMap3(toStepWithMetadata(schedule2), (step2) => {
  let meta = CurrentMetadata.defaultValue();
  return catchCauseFilter(catchDone(forever(tap2(flatMap3(suspend(() => provideService(self, CurrentMetadata, meta)), step2), (meta_) => sync(() => {
    meta = meta_;
  })), {
    disableYield: true
  }), (out) => succeed3(out)), findErrorOnly, (error) => orElse2(error, meta.attempt === 0 ? none2() : some2(meta)));
}));
var retryOrElse = /* @__PURE__ */ dual(3, (self, policy, orElse2) => flatMap3(toStepWithMetadata(policy), (step2) => {
  let meta = CurrentMetadata.defaultValue();
  let lastError;
  const loop = catchCauseFilter(suspend(() => provideService(self, CurrentMetadata, meta)), findErrorOnly, (error) => {
    lastError = error;
    return flatMap3(step2(error), (meta_) => {
      meta = meta_;
      return loop;
    });
  });
  return catchDone(loop, (out) => internalCall(() => orElse2(lastError, out)));
}));
var repeat = /* @__PURE__ */ dual(2, (self, options) => {
  const schedule2 = typeof options === "function" ? options(identity) : isSchedule(options) ? options : buildFromOptions(options);
  return repeatOrElse(self, schedule2, fail3);
});
var retry = /* @__PURE__ */ dual(2, (self, options) => {
  const schedule2 = typeof options === "function" ? options(identity) : isSchedule(options) ? options : buildFromOptions(options);
  return retryOrElse(self, schedule2, fail3);
});
var scheduleFrom = /* @__PURE__ */ dual(3, (self, initial, schedule2) => flatMap3(toStepWithMetadata(schedule2), (step2) => {
  let meta = CurrentMetadata.defaultValue();
  const selfWithMeta = suspend(() => provideService(self, CurrentMetadata, meta));
  return catchDone(flatMap3(step2(initial), (meta_) => {
    meta = meta_;
    const body = constant(flatMap3(selfWithMeta, step2));
    return whileLoop({
      while: constTrue,
      body,
      step(meta_2) {
        meta = meta_2;
      }
    });
  }), (out) => succeed3(out));
}));
var passthroughForever = /* @__PURE__ */ passthrough(forever2);
var buildFromOptions = (options) => {
  let schedule2 = options.schedule ? passthrough(options.schedule) : passthroughForever;
  if (options.while) {
    schedule2 = while_(schedule2, ({
      input
    }) => {
      const applied = options.while(input);
      return isEffect(applied) ? applied : succeed3(applied);
    });
  }
  if (options.until) {
    schedule2 = while_(schedule2, ({
      input
    }) => {
      const applied = options.until(input);
      return isEffect(applied) ? map5(applied, (b) => !b) : succeed3(!applied);
    });
  }
  if (options.times !== void 0) {
    schedule2 = while_(schedule2, ({
      attempt
    }) => succeed3(attempt <= options.times));
  }
  return schedule2;
};

// node_modules/effect/dist/internal/executionPlan.js
var makeEventEmitter = (onEvent, currentMetadata) => {
  let lastStepIndex = -1;
  let stepAttempt = 0;
  const emit = (event) => ignoreCause(onEvent(event));
  return {
    begin: clockWith((clock) => suspend(() => {
      const meta = currentMetadata();
      if (meta.stepIndex !== lastStepIndex) {
        lastStepIndex = meta.stepIndex;
        stepAttempt = 0;
      }
      stepAttempt++;
      const state = {
        attempt: meta.attempt,
        stepAttempt,
        stepIndex: meta.stepIndex,
        startNanos: clock.monotonicTimeNanosUnsafe()
      };
      return as(emit({
        _tag: "AttemptStart",
        attempt: state.attempt,
        stepAttempt: state.stepAttempt,
        stepIndex: state.stepIndex
      }), state);
    })),
    end: (state, exit4) => clockWith((clock) => {
      const duration = nanos(clock.monotonicTimeNanosUnsafe() - state.startNanos);
      return emit(exit4._tag === "Success" ? {
        _tag: "AttemptSuccess",
        attempt: state.attempt,
        stepAttempt: state.stepAttempt,
        stepIndex: state.stepIndex,
        duration
      } : {
        _tag: "AttemptFailure",
        attempt: state.attempt,
        stepAttempt: state.stepAttempt,
        stepIndex: state.stepIndex,
        duration,
        cause: exit4.cause
      });
    })
  };
};
var withExecutionPlan = /* @__PURE__ */ dual((args2) => isEffect(args2[0]), (self, plan, options) => suspend(() => {
  let i = 0;
  let meta = {
    attempt: 0,
    stepIndex: 0
  };
  const provideMeta = provideServiceEffect(CurrentMetadata2, sync(() => {
    meta = {
      attempt: meta.attempt + 1,
      stepIndex: i
    };
    return meta;
  }));
  const emitter = options?.onEvent === void 0 ? void 0 : makeEventEmitter(options.onEvent, () => meta);
  const instrument = emitter === void 0 ? identity : (attempt) => uninterruptibleMask((restore) => flatMap3(emitter.begin, (state) => onExit(restore(attempt), (exit4) => emitter.end(state, exit4))));
  let result3;
  return flatMap3(whileLoop({
    while: () => i < plan.steps.length && (result3 === void 0 || isFailure2(result3)),
    body() {
      const step2 = plan.steps[i];
      let nextEffect = provideMeta(instrument(provide3(self, step2.provide)));
      if (result3) {
        let attempted = false;
        const wrapped = nextEffect;
        nextEffect = suspend(() => {
          if (attempted) return wrapped;
          attempted = true;
          return fromResult(result3);
        });
        nextEffect = retry(nextEffect, scheduleFromStep(step2, false));
      } else {
        const schedule2 = scheduleFromStep(step2, true);
        nextEffect = schedule2 ? retry(nextEffect, schedule2) : nextEffect;
      }
      return result(nextEffect);
    },
    step(result_) {
      result3 = result_;
      i++;
    }
  }), () => fromResult(result3));
}));
var scheduleFromStep = (step2, first) => {
  if (!first) {
    return buildFromOptions({
      schedule: step2.schedule ? step2.schedule : step2.attempts ? void 0 : scheduleOnce,
      times: step2.attempts,
      while: step2.while
    });
  } else if (step2.attempts === 1 || !(step2.schedule || step2.attempts)) {
    return void 0;
  }
  return buildFromOptions({
    schedule: step2.schedule,
    while: step2.while,
    times: step2.attempts ? step2.attempts - 1 : void 0
  });
};
var scheduleOnce = /* @__PURE__ */ recurs(1);

// node_modules/effect/dist/MutableHashMap.js
var TypeId10 = "~effect/MutableHashMap";
var MutableHashMapProto = {
  [TypeId10]: TypeId10,
  [Symbol.iterator]() {
    return this.backing[Symbol.iterator]();
  },
  toString() {
    return `MutableHashMap(${format(Array.from(this))})`;
  },
  toJSON() {
    return {
      _id: "MutableHashMap",
      values: toJson(Array.from(this))
    };
  },
  [NodeInspectSymbol]() {
    return this.toJSON();
  },
  pipe() {
    return pipeArguments(this, arguments);
  }
};
var empty4 = () => {
  const self = Object.create(MutableHashMapProto);
  self.backing = /* @__PURE__ */ new Map();
  self.buckets = /* @__PURE__ */ new Map();
  return self;
};
var get2 = /* @__PURE__ */ dual(2, (self, key) => {
  if (self.backing.has(key)) {
    return some2(self.backing.get(key));
  } else if (isSimpleKey(key)) {
    return none2();
  }
  const hash2 = hash(key);
  const bucket = self.buckets.get(hash2);
  if (bucket === void 0) {
    return none2();
  }
  return getFromBucket(self, bucket, key);
});
var isSimpleKey = (u) => typeof u !== "object" && typeof u !== "function";
var getFromBucket = (self, bucket, key) => {
  for (let i = 0, len = bucket.length; i < len; i++) {
    if (equals(key, bucket[i])) {
      const refKey = bucket[i];
      return some2(self.backing.get(refKey));
    }
  }
  return none2();
};
var has2 = /* @__PURE__ */ dual(2, (self, key) => isSome2(get2(self, key)));
var set = /* @__PURE__ */ dual(3, (self, key, value3) => {
  if (self.backing.has(key) || isSimpleKey(key)) {
    self.backing.set(key, value3);
    return self;
  }
  const hash2 = hash(key);
  const bucket = self.buckets.get(hash2);
  if (bucket === void 0) {
    self.buckets.set(hash2, [key]);
    self.backing.set(key, value3);
    return self;
  }
  let refKey = getRefKey(bucket, key);
  if (refKey === void 0) {
    bucket.push(key);
    refKey = key;
  }
  self.backing.set(refKey, value3);
  return self;
});
var getRefKey = (bucket, key) => {
  for (let i = 0, len = bucket.length; i < len; i++) {
    if (equals(key, bucket[i])) {
      return bucket[i];
    }
  }
};
var remove = /* @__PURE__ */ dual(2, (self, key_) => {
  if (isSimpleKey(key_)) {
    self.backing.delete(key_);
    return self;
  }
  const hash2 = hash(key_);
  const bucket = self.buckets.get(hash2);
  if (bucket === void 0) {
    return self;
  }
  for (let i = 0, len = bucket.length; i < len; i++) {
    const bkey = bucket[i];
    if (bkey === key_ || equals(key_, bkey)) {
      self.backing.delete(bkey);
      bucket.splice(i, 1);
      break;
    }
  }
  if (bucket.length === 0) {
    self.buckets.delete(hash2);
  }
  return self;
});

// node_modules/effect/dist/Request.js
var TypeId11 = "~effect/Request";
var requestVariance = /* @__PURE__ */ byReferenceUnsafe({
  /* c8 ignore next */
  _E: (_) => _,
  /* c8 ignore next */
  _A: (_) => _,
  /* c8 ignore next */
  _R: (_) => _
});
var RequestPrototype = {
  ...StructuralProto,
  [TypeId11]: requestVariance
};
var makeEntry = (options) => options;

// node_modules/effect/dist/internal/request.js
var request = /* @__PURE__ */ dual(2, (self, resolver) => {
  const withResolver = (resolver2) => callback((resume) => {
    const entry = addEntry(resolver2, self, resume, getCurrentFiber());
    return maybeRemoveEntry(resolver2, entry);
  });
  return isEffect(resolver) ? flatMap3(resolver, withResolver) : withResolver(resolver);
});
var requestUnsafe = (self, options) => {
  const entry = addEntry(options.resolver, self, options.onExit, {
    context: options.context,
    cache: {
      scheduler: get(options.context, Scheduler)
    }
  });
  return () => removeEntryUnsafe(options.resolver, entry);
};
var equalBatchKeys = /* @__PURE__ */ new WeakSet();
var makeBatchMap = (resolver) => {
  if (!equalBatchKeys.has(resolver.batchKey)) return /* @__PURE__ */ new Map();
  const map10 = empty4();
  return {
    get: (key) => getOrUndefined(get2(map10, key)),
    has: (key) => has2(map10, key),
    set: (key, batch) => set(map10, key, batch),
    delete: (key) => remove(map10, key)
  };
};
var batchPool = [];
var pendingBatches = /* @__PURE__ */ new WeakMap();
var addEntry = (resolver, request3, resume, fiber3) => {
  let batchMap = pendingBatches.get(resolver);
  if (!batchMap) {
    batchMap = makeBatchMap(resolver);
    pendingBatches.set(resolver, batchMap);
  }
  let batch;
  let completed = false;
  const entry = makeEntry({
    request: request3,
    context: fiber3.context,
    uninterruptible: false,
    completeUnsafe(effect2) {
      if (completed) return;
      completed = true;
      if (batch && !batch.entrySet.delete(entry)) return;
      resume(effect2);
    }
  });
  if (resolver.preCheck !== void 0 && !resolver.preCheck(entry)) {
    return entry;
  }
  const key = resolver.batchKey(entry);
  batch = batchMap.get(key);
  if (!batch) {
    if (batchPool.length > 0) {
      batch = batchPool.pop();
      batch.key = key;
      batch.resolver = resolver;
      batch.map = batchMap;
    } else {
      const newBatch = {
        key,
        resolver,
        map: batchMap,
        entrySet: /* @__PURE__ */ new Set(),
        entries: /* @__PURE__ */ new Set(),
        delayEffect: flatMap3(suspend(() => newBatch.resolver.delay), (_) => runBatch(newBatch)),
        run: onExit(suspend(() => newBatch.resolver.runAll(Array.from(newBatch.entries), newBatch.key)), (exit4) => {
          for (const entry2 of newBatch.entrySet) {
            entry2.completeUnsafe(exit4._tag === "Success" ? exitDie(new Error("Effect.request: RequestResolver did not complete request", {
              cause: entry2.request
            })) : exit4);
          }
          newBatch.entries.clear();
          if (batchPool.length < 128) {
            newBatch.entrySet.clear();
            newBatch.key = void 0;
            newBatch.fiber = void 0;
            newBatch.resolver = void 0;
            newBatch.map = void 0;
            batchPool.push(newBatch);
          }
          return void_2;
        })
      };
      batch = newBatch;
    }
    batchMap.set(key, batch);
    batch.fiber = runForkWith(fiber3.context)(batch.delayEffect, {
      scheduler: fiber3.cache.scheduler
    });
  }
  batch.entrySet.add(entry);
  batch.entries.add(entry);
  if (batch.resolver.collectWhile(batch.entries)) return entry;
  batch.fiber.interruptUnsafe(fiber3.id);
  batch.fiber = runForkWith(fiber3.context)(runBatch(batch), {
    scheduler: fiber3.cache.scheduler
  });
  return entry;
};
var removeEntryUnsafe = (resolver, entry) => {
  if (entry.uninterruptible) return;
  const batchMap = pendingBatches.get(resolver);
  if (!batchMap) return;
  const key = resolver.batchKey(entry);
  const batch = batchMap.get(key);
  if (!batch) return;
  if (!batch.entries.delete(entry)) return;
  batch.entrySet.delete(entry);
  let fiber3;
  if (batch.entries.size === 0) {
    batchMap.delete(key);
    fiber3 = batch.fiber;
  }
  entry.completeUnsafe(exitInterrupt());
  fiber3?.interruptUnsafe();
};
var maybeRemoveEntry = (resolver, entry) => sync(() => removeEntryUnsafe(resolver, entry));
function runBatch(batch) {
  if (!batch.map.has(batch.key)) return void_2;
  batch.map.delete(batch.key);
  return batch.run;
}

// node_modules/effect/dist/Metric.js
var CurrentMetricAttributesKey = "effect/Metric/CurrentMetricAttributes";
var CurrentMetricAttributes = /* @__PURE__ */ Reference(CurrentMetricAttributesKey, {
  defaultValue: () => ({})
});
var MetricRegistryKey = "effect/Metric/MetricRegistry";
var MetricRegistry = /* @__PURE__ */ Reference(MetricRegistryKey, {
  defaultValue: () => /* @__PURE__ */ new Map()
});
var TypeId12 = "~effect/Metric";
var Metric$ = class {
  [TypeId12] = TypeId12;
  #extraAttributes;
  #key = "";
  id;
  description;
  attributes;
  constructor(id2, description, attributes) {
    this.id = id2;
    this.description = description;
    this.attributes = attributes;
  }
  valueUnsafe(context3) {
    return this.hook(context3).get(context3);
  }
  modifyUnsafe(input, context3) {
    return this.hook(context3).modify(input, context3);
  }
  updateUnsafe(input, context3) {
    return this.hook(context3).update(input, context3);
  }
  hook(context3) {
    const extraAttributes = get(context3, CurrentMetricAttributes);
    if (extraAttributes !== this.#extraAttributes) {
      this.#extraAttributes = extraAttributes;
      this.#key = makeKey(this, mergeAttributes(this.attributes, extraAttributes));
    }
    const registry2 = get(context3, MetricRegistry);
    let metadata = registry2.get(this.#key);
    if (isUndefined(metadata)) {
      metadata = {
        id: this.id,
        type: this.type,
        description: this.description,
        attributes: Object.keys(extraAttributes).length > 0 ? mergeAttributes(this.attributes, extraAttributes) : this.attributes,
        hooks: this.createHooks()
      };
      registry2.set(this.#key, metadata);
    }
    return metadata.hooks;
  }
  pipe() {
    return pipeArguments(this, arguments);
  }
};
var update = /* @__PURE__ */ dual(2, (self, input) => contextWith((services) => sync(() => self.updateUnsafe(input, services))));
function makeKey(metric, attributes) {
  const entries3 = Object.entries(attributes).sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);
  return JSON.stringify([metric.type, metric.id, metric.description, entries3]);
}
function mergeAttributes(self, other) {
  return {
    ...attributesToRecord(self),
    ...attributesToRecord(other)
  };
}
function attributesToRecord(attributes) {
  if (isNotUndefined(attributes) && Array.isArray(attributes)) {
    return attributes.reduce((acc, [key, value3]) => {
      assignProperty(acc, key, value3);
      return acc;
    }, {});
  }
  return attributes;
}

// node_modules/effect/dist/Effect.js
var TypeId13 = EffectTypeId;
var isEffect2 = isEffect;
var all3 = all2;
var partition3 = partition2;
var reduce2 = reduce;
var validate2 = validate;
var findFirst4 = findFirst3;
var findFirstFilter2 = findFirstFilter;
var forEach2 = forEach;
var head2 = head;
var whileLoop2 = whileLoop;
var promise2 = promise;
var tryPromise2 = tryPromise;
var succeed6 = succeed3;
var succeedNone3 = succeedNone2;
var succeedSome3 = succeedSome2;
var suspend3 = suspend;
var sync3 = sync;
var void_4 = void_2;
var undefined_2 = undefined_;
var callback2 = callback;
var never2 = never;
var Do3 = Do2;
var bindTo4 = bindTo3;
var let_4 = let_3;
var bind4 = bind3;
var gen3 = gen2;
var fail5 = fail3;
var failSync2 = failSync;
var failCause3 = failCause;
var failCauseSync2 = failCauseSync;
var die3 = die;
var try_3 = try_2;
var yieldNow2 = yieldNow;
var yieldNowWith2 = yieldNowWith;
var withFiber2 = withFiber;
var withFiberSucceed2 = withFiberSucceed;
var fromResult2 = fromResult;
var fromOption4 = fromOption3;
var transposeOption3 = transposeOption2;
var fromNullishOr4 = fromNullishOr3;
var flatMap5 = flatMap3;
var flatten4 = flatten3;
var andThen3 = andThen2;
var tap4 = tap2;
var result2 = result;
var option2 = option;
var exit2 = exit;
var map7 = map5;
var as2 = as;
var asSome2 = asSome;
var asVoid2 = asVoid;
var flip3 = flip2;
var zip2 = zip;
var zipWith2 = zipWith;
var catch_3 = catch_;
var catchTag3 = catchTag;
var catchTags2 = catchTags;
var catchReason2 = catchReason;
var catchReasons2 = catchReasons;
var unwrapReason2 = unwrapReason;
var catchCause3 = catchCause;
var catchDefect2 = catchDefect;
var catchIf2 = catchIf;
var catchFilter2 = catchFilter;
var catchNoSuchElement2 = catchNoSuchElement;
var catchCauseIf2 = catchCauseIf;
var catchCauseFilter2 = catchCauseFilter;
var mapError3 = mapError2;
var mapBoth3 = mapBoth2;
var orDie3 = orDie;
var tapError3 = tapError;
var tapErrorTag2 = tapErrorTag;
var tapCause3 = tapCause;
var tapCauseIf2 = tapCauseIf;
var tapCauseFilter2 = tapCauseFilter;
var tapDefect2 = tapDefect;
var eventually2 = eventually;
var retry2 = retry;
var retryOrElse2 = retryOrElse;
var sandbox2 = sandbox;
var ignore2 = ignore;
var ignoreCause2 = ignoreCause;
var withExecutionPlan2 = withExecutionPlan;
var withErrorReporting2 = withErrorReporting;
var orElseSucceed2 = orElseSucceed;
var firstSuccessOf2 = firstSuccessOf;
var timeout2 = timeout;
var timeoutOption2 = timeoutOption;
var timeoutOrElse2 = timeoutOrElse;
var delay2 = delay;
var sleep2 = sleep;
var timed2 = timed;
var raceAll2 = raceAll;
var raceAllFirst2 = raceAllFirst;
var race2 = race;
var raceFirst2 = raceFirst;
var filter4 = filter3;
var filterMap2 = filterMap;
var filterMapEffect2 = filterMapEffect;
var filterOrElse2 = filterOrElse;
var filterMapOrElse2 = filterMapOrElse;
var filterOrFail3 = filterOrFail2;
var filterMapOrFail2 = filterMapOrFail;
var when2 = when;
var match5 = match4;
var matchEager2 = matchEager;
var matchCause2 = matchCause;
var matchCauseEager2 = matchCauseEager;
var matchCauseEffectEager2 = matchCauseEffectEager;
var matchCauseEffect2 = matchCauseEffect;
var matchEffect3 = matchEffect;
var isFailure5 = isFailure3;
var isSuccess5 = isSuccess3;
var context2 = context;
var contextWith2 = contextWith;
var provide4 = provide3;
var provideContext2 = provideContext;
var setContext2 = setContext;
var service2 = service;
var serviceOption2 = serviceOption;
var updateContext2 = updateContext;
var updateService3 = updateService;
var updateServiceScoped2 = updateServiceScoped;
var provideService2 = provideService;
var provideServiceEffect2 = provideServiceEffect;
var scope2 = scope;
var scoped2 = scoped;
var scopedWith2 = scopedWith;
var acquireRelease2 = acquireRelease;
var acquireDisposable2 = acquireDisposable;
var acquireUseRelease2 = acquireUseRelease;
var addFinalizer2 = addFinalizer;
var ensuring2 = ensuring;
var onError2 = onError;
var onErrorIf2 = onErrorIf;
var onErrorFilter2 = onErrorFilter;
var onExitPrimitive2 = onExitPrimitive;
var onExit2 = onExit;
var onExitIf2 = onExitIf;
var onExitFilter2 = onExitFilter;
var cached2 = cached;
var cachedWithTTL2 = cachedWithTTL;
var cachedInvalidateWithTTL2 = cachedInvalidateWithTTL;
var interrupt2 = interrupt;
var interruptible2 = interruptible;
var onInterrupt2 = onInterrupt;
var uninterruptible2 = uninterruptible;
var uninterruptibleMask2 = uninterruptibleMask;
var interruptibleMask2 = interruptibleMask;
var abortSignal2 = abortSignal;
var forever3 = forever;
var repeat2 = repeat;
var repeatOrElse2 = repeatOrElse;
var replicate2 = replicate;
var replicateEffect2 = replicateEffect;
var schedule = /* @__PURE__ */ dual(2, (self, schedule2) => scheduleFrom2(self, void 0, schedule2));
var scheduleFrom2 = scheduleFrom;
var tracer2 = tracer;
var withTracer2 = withTracer;
var withTracerEnabled2 = withTracerEnabled;
var withTracerTiming2 = withTracerTiming;
var annotateSpans2 = annotateSpans;
var annotateCurrentSpan2 = annotateCurrentSpan;
var currentSpan2 = currentSpan;
var currentParentSpan2 = currentParentSpan;
var spanAnnotations2 = spanAnnotations;
var spanLinks2 = spanLinks;
var linkSpans2 = linkSpans;
var makeSpan2 = makeSpan;
var makeSpanScoped2 = makeSpanScoped;
var useSpan2 = useSpan;
var withSpan3 = withSpan;
var withSpanScoped2 = withSpanScoped;
var withParentSpan3 = withParentSpan;
var request2 = request;
var requestUnsafe2 = requestUnsafe;
var forkChild2 = forkChild;
var forkIn2 = forkIn;
var forkScoped2 = forkScoped;
var forkDetach2 = forkDetach;
var awaitAllChildren2 = awaitAllChildren;
var fiber2 = fiber;
var fiberId2 = fiberId;
var runFork2 = runFork;
var runForkWith2 = runForkWith;
var runCallbackWith2 = runCallbackWith;
var runCallback2 = runCallback;
var runPromise2 = runPromise;
var runPromiseWith2 = runPromiseWith;
var runPromiseExit2 = runPromiseExit;
var runPromiseExitWith2 = runPromiseExitWith;
var runSync2 = runSync;
var runSyncWith2 = runSyncWith;
var runSyncExit2 = runSyncExit;
var runSyncExitWith2 = runSyncExitWith;
var fnUntraced2 = fnUntraced;
var fn2 = fn;
var clockWith3 = clockWith;
var logWithLevel2 = logWithLevel;
var log = /* @__PURE__ */ logWithLevel();
var logFatal = /* @__PURE__ */ logWithLevel("Fatal");
var logWarning = /* @__PURE__ */ logWithLevel("Warn");
var logError = /* @__PURE__ */ logWithLevel("Error");
var logInfo = /* @__PURE__ */ logWithLevel("Info");
var logDebug = /* @__PURE__ */ logWithLevel("Debug");
var logTrace = /* @__PURE__ */ logWithLevel("Trace");
var withLogger = /* @__PURE__ */ dual(2, (effect2, logger) => updateService(effect2, CurrentLoggers, (loggers) => /* @__PURE__ */ new Set([...loggers, logger])));
var annotateLogs = /* @__PURE__ */ dual((args2) => isEffect2(args2[0]), (effect2, ...args2) => updateService(effect2, CurrentLogAnnotations2, (annotations) => {
  const newAnnotations = args2.length === 1 ? {
    ...annotations,
    ...args2[0]
  } : {
    ...annotations
  };
  if (args2.length === 1) {
    return newAnnotations;
  } else {
    assignProperty(newAnnotations, args2[0], args2[1]);
  }
  return newAnnotations;
}));
var annotateLogsScoped2 = annotateLogsScoped;
var withLogSpan = /* @__PURE__ */ dual(2, (effect2, label2) => flatMap3(currentTimeMillis, (now2) => updateService(effect2, CurrentLogSpans2, (spans) => {
  const span2 = [label2, now2];
  return [span2, ...spans];
})));
var track = /* @__PURE__ */ dual((args2) => isEffect2(args2[0]), (self, metric, f) => onExit2(self, (exit4) => {
  const input = f === void 0 ? exit4 : f(exit4);
  return update(metric, input);
}));
var trackSuccesses = /* @__PURE__ */ dual((args2) => isEffect2(args2[0]), (self, metric, f) => tap4(self, (value3) => {
  const input = f === void 0 ? value3 : f(value3);
  return update(metric, input);
}));
var trackErrors = /* @__PURE__ */ dual((args2) => isEffect2(args2[0]), (self, metric, f) => tapError3(self, (error) => {
  const input = f === void 0 ? error : f(error);
  return update(metric, input);
}));
var trackDefects = /* @__PURE__ */ dual((args2) => isEffect2(args2[0]), (self, metric, f) => tapDefect2(self, (defect) => {
  const input = f === void 0 ? defect : f(defect);
  return update(metric, input);
}));
var trackDuration = /* @__PURE__ */ dual((args2) => isEffect2(args2[0]), (self, metric, f) => clockWith3((clock) => {
  const startTime = clock.monotonicTimeNanosUnsafe();
  return onExit2(self, () => {
    const endTime = clock.monotonicTimeNanosUnsafe();
    const duration = subtract(fromInputUnsafe(endTime), fromInputUnsafe(startTime));
    const input = f === void 0 ? duration : f(duration);
    return update(metric, input);
  });
}));
var Transaction = class extends (/* @__PURE__ */ Service()("effect/Effect/Transaction")) {
};
var tx = (effect2) => withFiber2((fiber3) => {
  const state = getOrUndefined2(fiber3.context, Transaction);
  if (state && !completedTransactions.has(state)) {
    return effect2;
  }
  const clock = fiber3.getRef(ClockRef);
  const now2 = clock.currentTimeMillisUnsafe();
  const mutable3 = {
    journal: /* @__PURE__ */ new Map(),
    retry: false,
    attempt: 1,
    retryReason: void 0,
    start: now2,
    now: now2,
    elapsed: 0,
    elapsedSincePrevious: 0
  };
  let result3;
  return uninterruptibleMask2((restore) => {
    const run2 = restore(effect2).pipe(provideService2(Transaction, mutable3), tapCause3((cause) => {
      if (!mutable3.retry) return void_4;
      if (!hasInterruptsOnly(cause)) return sync3(() => clearTransaction(mutable3));
      return restore(awaitPendingTransaction(mutable3));
    }), exit2);
    return flatMap5(whileLoop2({
      while: () => !result3,
      body: () => {
        if (mutable3.attempt > 1) {
          stampTransaction(mutable3, clock.currentTimeMillisUnsafe());
        }
        return run2;
      },
      step(exit4) {
        if (mutable3.retry || !isTransactionConsistent(mutable3)) {
          mutable3.attempt++;
          mutable3.retryReason = mutable3.retry ? "retry" : "conflict";
          return clearTransaction(mutable3);
        }
        if (isSuccess4(exit4)) {
          commitTransaction(fiber3, mutable3);
        }
        clearTransaction(mutable3);
        completedTransactions.add(mutable3);
        result3 = exit4;
      }
    }), () => result3);
  });
});
var completedTransactions = /* @__PURE__ */ new WeakSet();
var stampTransaction = (state, now2) => {
  state.elapsedSincePrevious = now2 - state.now;
  state.now = now2;
  state.elapsed = now2 - state.start;
};
var isTransactionConsistent = (state) => {
  for (const [ref, {
    version
  }] of state.journal) {
    if (ref.version !== version) {
      return false;
    }
  }
  return true;
};
var awaitPendingTransaction = (state) => callback2((resume) => {
  if (!isTransactionConsistent(state)) {
    return resume(void_4);
  }
  const key = {};
  const refs = Array.from(state.journal.keys());
  const clearPending = () => {
    for (const clear3 of refs) {
      clear3.pending.delete(key);
    }
  };
  const onCall = () => {
    clearPending();
    resume(void_4);
  };
  for (const ref of refs) {
    ref.pending.set(key, onCall);
  }
  return sync3(clearPending);
});
function commitTransaction(fiber3, state) {
  for (const [ref, {
    value: value3,
    written
  }] of state.journal) {
    if (!written) continue;
    if (!Object.is(value3, ref.value)) {
      ref.version = ref.version + 1;
      ref.value = value3;
    }
    for (const pending2 of ref.pending.values()) {
      fiber3.currentDispatcher.scheduleTask(pending2, 0);
    }
    ref.pending.clear();
  }
}
function clearTransaction(state) {
  state.retry = false;
  state.journal.clear();
}
var txRetry = /* @__PURE__ */ flatMap5(Transaction, (state) => {
  const mutable3 = state;
  mutable3.retry = true;
  return interrupt2;
});
var effectify = (fn3, onError3, onSyncError) => (...args2) => callback2((resume) => {
  try {
    fn3(...args2, (err, result3) => {
      if (err) {
        resume(onError3 ? suspend3(() => fail5(onError3(err, args2))) : fail5(err));
      } else {
        resume(succeed6(result3));
      }
    });
  } catch (err) {
    resume(onSyncError ? fail5(onSyncError(err, args2)) : die3(err));
  }
});
var satisfiesSuccessType2 = () => (effect2) => effect2;
var satisfiesErrorType2 = () => (effect2) => effect2;
var satisfiesServicesType2 = () => (effect2) => effect2;
var mapEager2 = mapEager;
var mapErrorEager2 = mapErrorEager;
var mapBothEager2 = mapBothEager;
var flatMapEager2 = flatMapEager;
var catchEager2 = catchEager;
var fnUntracedEager2 = fnUntracedEager;

// node_modules/effect/dist/BigDecimal.js
var FINITE_INT_REGEXP = /^[+-]?\d+$/;
var TypeId14 = "~effect/BigDecimal";
var BigDecimalProto = {
  [TypeId14]: TypeId14,
  [symbol]() {
    const normalized = normalize2(this);
    return combine(string(String(normalized.value)), number(normalized.scale));
  },
  [symbol2](that) {
    return isBigDecimal(that) && compare(this, that) === 0;
  },
  toString() {
    return `BigDecimal(${format3(this)})`;
  },
  toJSON() {
    return {
      _id: "BigDecimal",
      value: String(this.value),
      scale: this.scale
    };
  },
  [NodeInspectSymbol]() {
    return this.toJSON();
  },
  pipe() {
    return pipeArguments(this, arguments);
  }
};
var isBigDecimal = (u) => hasProperty(u, TypeId14);
var make7 = (value3, scale) => {
  if (!Number.isSafeInteger(scale)) {
    throw new RangeError(`Scale must be a safe integer, got ${scale}`);
  }
  const o = Object.create(BigDecimalProto);
  o.value = value3;
  o.scale = scale;
  return o;
};
var makeNormalized = (value3, scale) => {
  const o = make7(value3, scale);
  o.normalized = o;
  return o;
};
var bigint03 = /* @__PURE__ */ BigInt(0);
var bigint12 = /* @__PURE__ */ BigInt(1);
var bigint102 = /* @__PURE__ */ BigInt(10);
var zero2 = /* @__PURE__ */ makeNormalized(bigint03, 0);
var normalize2 = (self) => {
  if (self.normalized === void 0) {
    if (self.value === bigint03) {
      self.normalized = zero2;
    } else {
      const digits = `${self.value}`;
      let end2 = digits.length;
      while (digits[end2 - 1] === "0") end2--;
      self.normalized = makeNormalized(BigInt(digits.slice(0, end2)), self.scale - (digits.length - end2));
    }
  }
  return self.normalized;
};
var MAX_COMPARISON_SCALE_ALIGNMENT = 100;
var comparisonPowersOfTen = [bigint12];
var compareBigInt = (self, that) => self === that ? 0 : self < that ? -1 : 1;
var compareMagnitude = (self, that) => {
  const selfDigits = `${self.value < bigint03 ? -self.value : self.value}`;
  const thatDigits = `${that.value < bigint03 ? -that.value : that.value}`;
  const exponentDifference = BigInt(selfDigits.length - thatDigits.length) - BigInt(self.scale) + BigInt(that.scale);
  if (exponentDifference !== bigint03) return exponentDifference < bigint03 ? -1 : 1;
  const length = Math.max(selfDigits.length, thatDigits.length);
  return String2(selfDigits.padEnd(length, "0"), thatDigits.padEnd(length, "0"));
};
var compare = (self, that) => {
  if (self.scale === that.scale) return compareBigInt(self.value, that.value);
  const selfSign = sign(self);
  const thatSign = sign(that);
  if (selfSign !== thatSign) return selfSign < thatSign ? -1 : 1;
  if (selfSign === 0) return 0;
  const scaleDifference = self.scale - that.scale;
  const absoluteScaleDifference = Math.abs(scaleDifference);
  if (absoluteScaleDifference > MAX_COMPARISON_SCALE_ALIGNMENT) {
    return selfSign === -1 ? compareMagnitude(that, self) : compareMagnitude(self, that);
  }
  const powerOfTen = comparisonPowersOfTen[absoluteScaleDifference] ??= bigint102 ** BigInt(absoluteScaleDifference);
  return scaleDifference > 0 ? compareBigInt(self.value, that.value * powerOfTen) : compareBigInt(self.value * powerOfTen, that.value);
};
var Order = /* @__PURE__ */ make2(compare);
var sign = (n) => n.value === bigint03 ? 0 : n.value < bigint03 ? -1 : 1;
var fromString = (s) => {
  if (s === "") {
    return some2(zero2);
  }
  let base;
  let exp;
  const seperator = s.search(/[eE]/);
  if (seperator !== -1) {
    const trail = s.slice(seperator + 1);
    base = s.slice(0, seperator);
    exp = Number(trail);
    if (base === "" || !Number.isSafeInteger(exp) || !FINITE_INT_REGEXP.test(trail)) {
      return none2();
    }
  } else {
    base = s;
    exp = 0;
  }
  let digits;
  let offset;
  const dot = base.search(/\./);
  if (dot !== -1) {
    const lead = base.slice(0, dot);
    const trail = base.slice(dot + 1);
    digits = `${lead}${trail}`;
    offset = trail.length;
  } else {
    digits = base;
    offset = 0;
  }
  if (!FINITE_INT_REGEXP.test(digits)) {
    return none2();
  }
  const scale = offset - exp;
  if (!Number.isSafeInteger(scale)) {
    return none2();
  }
  return some2(make7(BigInt(digits), scale));
};
var format3 = (n) => {
  const normalized = normalize2(n);
  if (Math.abs(normalized.scale) >= 16) {
    return toExponential(normalized);
  }
  const negative = normalized.value < bigint03;
  const absolute = `${negative ? -normalized.value : normalized.value}`;
  const digits = normalized.scale > 0 ? absolute.padStart(normalized.scale + 1, "0") : absolute.padEnd(absolute.length - normalized.scale, "0");
  const point = digits.length - normalized.scale;
  const complete = normalized.scale > 0 ? `${digits.slice(0, point)}.${digits.slice(point)}` : digits;
  return negative ? `-${complete}` : complete;
};
var toExponential = (n) => {
  if (isZero2(n)) {
    return "0e+0";
  }
  const normalized = normalize2(n);
  const digits = `${normalized.value}`;
  const point = normalized.value < bigint03 ? 2 : 1;
  const head3 = digits.slice(0, point);
  const tail2 = digits.slice(point);
  const exp = tail2.length - normalized.scale;
  return `${head3}${tail2 === "" ? "" : `.${tail2}`}e${exp >= 0 ? "+" : ""}${exp}`;
};
var isZero2 = (n) => n.value === bigint03;

// node_modules/effect/dist/Schema.js
var Schema_exports = {};
__export(Schema_exports, {
  Any: () => Any2,
  Array: () => ArraySchema,
  ArrayEnsure: () => ArrayEnsure,
  BigDecimal: () => BigDecimal,
  BigDecimalFromString: () => BigDecimalFromString,
  BigInt: () => BigInt6,
  BigIntFromString: () => BigIntFromString,
  Boolean: () => Boolean3,
  BooleanFromBit: () => BooleanFromBit,
  BooleanLiterals: () => BooleanLiterals,
  ByteSize: () => ByteSize,
  ByteSizeFromBigInt: () => ByteSizeFromBigInt,
  ByteSizeFromNumber: () => ByteSizeFromNumber,
  ByteSizeFromString: () => ByteSizeFromString,
  Cause: () => Cause,
  CauseReason: () => CauseReason,
  Char: () => Char,
  Chunk: () => Chunk,
  Class: () => Class4,
  Cookie: () => Cookie,
  Cookies: () => Cookies,
  Date: () => Date4,
  DateFromMillis: () => DateFromMillis,
  DateFromString: () => DateFromString,
  DateTimeUtc: () => DateTimeUtc,
  DateTimeUtcFromDate: () => DateTimeUtcFromDate,
  DateTimeUtcFromMillis: () => DateTimeUtcFromMillis,
  DateTimeUtcFromString: () => DateTimeUtcFromString,
  DateTimeZoned: () => DateTimeZoned,
  DateTimeZonedFromString: () => DateTimeZonedFromString,
  Defect: () => Defect,
  DnsARecord: () => DnsARecord,
  DnsAaaaRecord: () => DnsAaaaRecord,
  DnsCaaRecord: () => DnsCaaRecord,
  DnsCnameRecord: () => DnsCnameRecord,
  DnsMxRecord: () => DnsMxRecord,
  DnsNaptrRecord: () => DnsNaptrRecord,
  DnsNsRecord: () => DnsNsRecord,
  DnsPtrRecord: () => DnsPtrRecord,
  DnsRecord: () => DnsRecord,
  DnsRecordType: () => DnsRecordType,
  DnsSoaRecord: () => DnsSoaRecord,
  DnsSrvRecord: () => DnsSrvRecord,
  DnsTlsaRecord: () => DnsTlsaRecord,
  DnsTxtRecord: () => DnsTxtRecord,
  DomainName: () => DomainName,
  DomainNameFromString: () => DomainNameFromString,
  Duration: () => Duration,
  DurationFromMillis: () => DurationFromMillis,
  DurationFromNanos: () => DurationFromNanos,
  DurationFromString: () => DurationFromString,
  Enum: () => Enum2,
  Error: () => Error4,
  ErrorInstance: () => ErrorInstance,
  Exit: () => Exit,
  FalseLiterals: () => FalseLiterals,
  File: () => File,
  Finite: () => Finite,
  FiniteFromString: () => FiniteFromString,
  FormData: () => FormData2,
  Graph: () => Graph,
  HashMap: () => HashMap,
  HashSet: () => HashSet,
  Headers: () => Headers,
  Host: () => Host,
  HostFromString: () => HostFromString,
  HostPort: () => HostPort,
  HostPortFromString: () => HostPortFromString,
  InetAddress: () => InetAddress,
  InetAddressFromString: () => InetAddressFromString,
  InetAddressV4: () => InetAddressV4,
  InetAddressV6: () => InetAddressV6,
  Int: () => Int,
  IpAddress: () => IpAddress,
  IpAddressFromString: () => IpAddressFromString,
  IpInterface: () => IpInterface,
  IpInterfaceFromString: () => IpInterfaceFromString,
  IpLinkLocalAddress: () => IpLinkLocalAddress,
  IpLinkLocalAddressFromString: () => IpLinkLocalAddressFromString,
  IpLoopbackAddress: () => IpLoopbackAddress,
  IpLoopbackAddressFromString: () => IpLoopbackAddressFromString,
  IpMulticastAddress: () => IpMulticastAddress,
  IpMulticastAddressFromString: () => IpMulticastAddressFromString,
  IpNetwork: () => IpNetwork,
  IpNetworkFromString: () => IpNetworkFromString,
  IpUnicastAddress: () => IpUnicastAddress,
  IpUnicastAddressFromString: () => IpUnicastAddressFromString,
  IpUnspecifiedAddress: () => IpUnspecifiedAddress,
  IpUnspecifiedAddressFromString: () => IpUnspecifiedAddressFromString,
  Ipv4Address: () => Ipv4Address,
  Ipv4AddressFromString: () => Ipv4AddressFromString,
  Ipv4BroadcastAddress: () => Ipv4BroadcastAddress,
  Ipv4BroadcastAddressFromString: () => Ipv4BroadcastAddressFromString,
  Ipv4Interface: () => Ipv4Interface,
  Ipv4InterfaceFromString: () => Ipv4InterfaceFromString,
  Ipv4Network: () => Ipv4Network,
  Ipv4NetworkFromString: () => Ipv4NetworkFromString,
  Ipv4PrivateAddress: () => Ipv4PrivateAddress,
  Ipv4PrivateAddressFromString: () => Ipv4PrivateAddressFromString,
  Ipv6Address: () => Ipv6Address,
  Ipv6AddressFromString: () => Ipv6AddressFromString,
  Ipv6Interface: () => Ipv6Interface,
  Ipv6InterfaceFromString: () => Ipv6InterfaceFromString,
  Ipv6Network: () => Ipv6Network,
  Ipv6NetworkFromString: () => Ipv6NetworkFromString,
  Ipv6UniqueLocalAddress: () => Ipv6UniqueLocalAddress,
  Ipv6UniqueLocalAddressFromString: () => Ipv6UniqueLocalAddressFromString,
  Json: () => Json2,
  JsonFromUrlParamsField: () => JsonFromUrlParamsField,
  JsonObject: () => JsonObject,
  Literal: () => Literal2,
  Literals: () => Literals,
  MacAddress: () => MacAddress,
  MacAddressFromString: () => MacAddressFromString,
  MacBroadcastAddress: () => MacBroadcastAddress,
  MacBroadcastAddressFromString: () => MacBroadcastAddressFromString,
  MacLocallyAdministeredAddress: () => MacLocallyAdministeredAddress,
  MacLocallyAdministeredAddressFromString: () => MacLocallyAdministeredAddressFromString,
  MacMulticastAddress: () => MacMulticastAddress,
  MacMulticastAddressFromString: () => MacMulticastAddressFromString,
  MacUnicastAddress: () => MacUnicastAddress,
  MacUnicastAddressFromString: () => MacUnicastAddressFromString,
  MacUniversallyAdministeredAddress: () => MacUniversallyAdministeredAddress,
  MacUniversallyAdministeredAddressFromString: () => MacUniversallyAdministeredAddressFromString,
  MutableJson: () => MutableJson2,
  Natural: () => Natural,
  Never: () => Never2,
  NonEmptyArray: () => NonEmptyArray,
  NonEmptyString: () => NonEmptyString,
  Null: () => Null2,
  NullOr: () => NullOr,
  NullishOr: () => NullishOr,
  Number: () => Number6,
  NumberFromString: () => NumberFromString,
  ObjectKeyword: () => ObjectKeyword2,
  Opaque: () => Opaque,
  Option: () => Option,
  OptionFromNullOr: () => OptionFromNullOr,
  OptionFromNullishOr: () => OptionFromNullishOr,
  OptionFromOptional: () => OptionFromOptional,
  OptionFromOptionalKey: () => OptionFromOptionalKey,
  OptionFromOptionalNullOr: () => OptionFromOptionalNullOr,
  OptionFromUndefinedOr: () => OptionFromUndefinedOr,
  Port: () => Port,
  PropertyKey: () => PropertyKey,
  ReadonlyMap: () => ReadonlyMap,
  ReadonlySet: () => ReadonlySet,
  Record: () => Record,
  RecordFromCookies: () => RecordFromCookies,
  RecordFromUrlParams: () => RecordFromUrlParams,
  Redacted: () => Redacted,
  RedactedFromValue: () => RedactedFromValue,
  RegExp: () => RegExp3,
  Result: () => Result,
  SchemaError: () => SchemaError,
  ScopedIpv6Literal: () => ScopedIpv6Literal,
  ScopedIpv6LiteralFromString: () => ScopedIpv6LiteralFromString,
  SocketAddress: () => SocketAddress,
  StandardSchemaV1FailureResult: () => StandardSchemaV1FailureResult,
  String: () => String6,
  StringForLiteralAutocomplete: () => StringForLiteralAutocomplete,
  StringFromBase64: () => StringFromBase64,
  StringFromBase64Url: () => StringFromBase64Url,
  StringFromHex: () => StringFromHex,
  StringFromUriComponent: () => StringFromUriComponent,
  Struct: () => Struct,
  StructWithRest: () => StructWithRest,
  Symbol: () => Symbol3,
  TaggedClass: () => TaggedClass2,
  TaggedError: () => TaggedError3,
  TaggedStruct: () => TaggedStruct,
  TaggedUnion: () => TaggedUnion,
  TemplateLiteral: () => TemplateLiteral2,
  TemplateLiteralParser: () => TemplateLiteralParser,
  TimeZone: () => TimeZone,
  TimeZoneFromString: () => TimeZoneFromString,
  TimeZoneNamed: () => TimeZoneNamed,
  TimeZoneNamedFromString: () => TimeZoneNamedFromString,
  TimeZoneOffset: () => TimeZoneOffset,
  Tree: () => Tree,
  Trim: () => Trim,
  Trimmed: () => Trimmed,
  TrueLiterals: () => TrueLiterals,
  Tuple: () => Tuple2,
  TupleWithRest: () => TupleWithRest,
  URL: () => URL2,
  URLFromString: () => URLFromString,
  URLSearchParams: () => URLSearchParams2,
  Uint8Array: () => Uint8Array2,
  Uint8ArrayFromBase64: () => Uint8ArrayFromBase64,
  Uint8ArrayFromBase64Url: () => Uint8ArrayFromBase64Url,
  Uint8ArrayFromHex: () => Uint8ArrayFromHex,
  Undefined: () => Undefined2,
  UndefinedOr: () => UndefinedOr,
  Union: () => Union2,
  UniqueArray: () => UniqueArray,
  UniqueSymbol: () => UniqueSymbol2,
  UnixPathAddress: () => UnixPathAddress,
  UnixPathAddressFromString: () => UnixPathAddressFromString,
  Unknown: () => Unknown2,
  UnknownFromJsonString: () => UnknownFromJsonString,
  UrlParams: () => UrlParams,
  Void: () => Void2,
  annotate: () => annotate2,
  annotateEncoded: () => annotateEncoded,
  annotateKey: () => annotateKey2,
  asserts: () => asserts2,
  brand: () => brand,
  catchDecoding: () => catchDecoding,
  catchDecodingWithContext: () => catchDecodingWithContext,
  catchEncoding: () => catchEncoding,
  catchEncodingWithContext: () => catchEncodingWithContext,
  check: () => check,
  declare: () => declare,
  declareConstructor: () => declareConstructor,
  decode: () => decode4,
  decodeEffect: () => decodeEffect2,
  decodeExit: () => decodeExit,
  decodeOption: () => decodeOption2,
  decodePromise: () => decodePromise,
  decodeResult: () => decodeResult,
  decodeSync: () => decodeSync2,
  decodeTo: () => decodeTo2,
  decodeUnknownEffect: () => decodeUnknownEffect2,
  decodeUnknownExit: () => decodeUnknownExit2,
  decodeUnknownOption: () => decodeUnknownOption2,
  decodeUnknownPromise: () => decodeUnknownPromise,
  decodeUnknownResult: () => decodeUnknownResult2,
  decodeUnknownSync: () => decodeUnknownSync2,
  encode: () => encode4,
  encodeEffect: () => encodeEffect2,
  encodeExit: () => encodeExit,
  encodeKeys: () => encodeKeys,
  encodeOption: () => encodeOption2,
  encodePromise: () => encodePromise,
  encodeResult: () => encodeResult,
  encodeSync: () => encodeSync2,
  encodeTo: () => encodeTo,
  encodeUnknownEffect: () => encodeUnknownEffect2,
  encodeUnknownExit: () => encodeUnknownExit2,
  encodeUnknownOption: () => encodeUnknownOption2,
  encodeUnknownPromise: () => encodeUnknownPromise,
  encodeUnknownResult: () => encodeUnknownResult2,
  encodeUnknownSync: () => encodeUnknownSync2,
  extendTo: () => extendTo,
  fieldsAssign: () => fieldsAssign,
  flip: () => flip5,
  fromBrand: () => fromBrand,
  fromFormData: () => fromFormData2,
  fromJsonString: () => fromJsonString2,
  fromURLSearchParams: () => fromURLSearchParams2,
  instanceOf: () => instanceOf,
  is: () => is2,
  isBase64: () => isBase64,
  isBase64Url: () => isBase64Url,
  isBetween: () => isBetween2,
  isBetweenBigDecimal: () => isBetweenBigDecimal,
  isBetweenBigInt: () => isBetweenBigInt,
  isBetweenCodePoints: () => isBetweenCodePoints,
  isBetweenDate: () => isBetweenDate,
  isBetweenLength: () => isBetweenLength,
  isBetweenProperties: () => isBetweenProperties,
  isBetweenSize: () => isBetweenSize,
  isCapitalized: () => isCapitalized,
  isEndingWith: () => isEndingWith,
  isFinite: () => isFinite3,
  isGUID: () => isGUID,
  isGreaterThan: () => isGreaterThan4,
  isGreaterThanBigDecimal: () => isGreaterThanBigDecimal,
  isGreaterThanBigInt: () => isGreaterThanBigInt,
  isGreaterThanDate: () => isGreaterThanDate,
  isGreaterThanOrEqualTo: () => isGreaterThanOrEqualTo4,
  isGreaterThanOrEqualToBigDecimal: () => isGreaterThanOrEqualToBigDecimal,
  isGreaterThanOrEqualToBigInt: () => isGreaterThanOrEqualToBigInt,
  isGreaterThanOrEqualToDate: () => isGreaterThanOrEqualToDate,
  isIncluding: () => isIncluding,
  isInt: () => isInt,
  isInt32: () => isInt32,
  isLessThan: () => isLessThan4,
  isLessThanBigDecimal: () => isLessThanBigDecimal,
  isLessThanBigInt: () => isLessThanBigInt,
  isLessThanDate: () => isLessThanDate,
  isLessThanOrEqualTo: () => isLessThanOrEqualTo5,
  isLessThanOrEqualToBigDecimal: () => isLessThanOrEqualToBigDecimal,
  isLessThanOrEqualToBigInt: () => isLessThanOrEqualToBigInt,
  isLessThanOrEqualToDate: () => isLessThanOrEqualToDate,
  isLowercased: () => isLowercased,
  isMaxCodePoints: () => isMaxCodePoints,
  isMaxLength: () => isMaxLength,
  isMaxProperties: () => isMaxProperties,
  isMaxSize: () => isMaxSize,
  isMinCodePoints: () => isMinCodePoints,
  isMinLength: () => isMinLength,
  isMinProperties: () => isMinProperties,
  isMinSize: () => isMinSize,
  isMultipleOf: () => isMultipleOf,
  isNonEmpty: () => isNonEmpty,
  isPattern: () => isPattern2,
  isPropertyNames: () => isPropertyNames,
  isSchema: () => isSchema,
  isSchemaError: () => isSchemaError2,
  isStartingWith: () => isStartingWith,
  isStringBigInt: () => isStringBigInt2,
  isStringFinite: () => isStringFinite2,
  isStringSymbol: () => isStringSymbol2,
  isTrimmed: () => isTrimmed,
  isULID: () => isULID,
  isUUID: () => isUUID,
  isUint32: () => isUint322,
  isUncapitalized: () => isUncapitalized,
  isUnique: () => isUnique,
  isUniqueKey: () => isUniqueKey,
  isUppercased: () => isUppercased,
  link: () => link,
  linkDecoding: () => linkDecoding,
  make: () => make20,
  makeFilter: () => makeFilter2,
  makeFilterGroup: () => makeFilterGroup,
  makeIsBetween: () => makeIsBetween,
  makeIsGreaterThan: () => makeIsGreaterThan,
  makeIsGreaterThanOrEqualTo: () => makeIsGreaterThanOrEqualTo,
  makeIsLessThan: () => makeIsLessThan,
  makeIsLessThanOrEqualTo: () => makeIsLessThanOrEqualTo,
  makeIsMultipleOf: () => makeIsMultipleOf,
  middlewareDecoding: () => middlewareDecoding2,
  middlewareEncoding: () => middlewareEncoding2,
  mutable: () => mutable2,
  mutableKey: () => mutableKey2,
  optional: () => optional2,
  optionalKey: () => optionalKey2,
  overrideToCodecIso: () => overrideToCodecIso,
  overrideToEquivalence: () => overrideToEquivalence,
  overrideToFormatter: () => overrideToFormatter,
  readonlyKey: () => readonlyKey,
  refine: () => refine,
  required: () => required,
  requiredKey: () => requiredKey,
  resolveAnnotations: () => resolveAnnotations,
  resolveAnnotationsKey: () => resolveAnnotationsKey,
  revealBottom: () => revealBottom,
  revealCodec: () => revealCodec,
  suspend: () => suspend4,
  tag: () => tag,
  tagDefaultOmit: () => tagDefaultOmit,
  toCodecArrayFromSingle: () => toCodecArrayFromSingle2,
  toCodecIso: () => toCodecIso2,
  toCodecJson: () => toCodecJson2,
  toCodecStringTree: () => toCodecStringTree2,
  toDifferJsonPatch: () => toDifferJsonPatch2,
  toEncoded: () => toEncoded2,
  toEncoderXml: () => toEncoderXml2,
  toEquivalence: () => toEquivalence2,
  toFormatter: () => toFormatter2,
  toIso: () => toIso2,
  toIsoFocus: () => toIsoFocus2,
  toIsoSource: () => toIsoSource2,
  toJsonSchemaDocument: () => toJsonSchemaDocument3,
  toRepresentation: () => toRepresentation2,
  toStandardJSONSchemaV1: () => toStandardJSONSchemaV12,
  toStandardSchemaV1: () => toStandardSchemaV12,
  toTaggedUnion: () => toTaggedUnion,
  toType: () => toType2,
  withArrayLengthConstraints: () => withArrayLengthConstraints,
  withConstructorDefault: () => withConstructorDefault2,
  withDecodingDefault: () => withDecodingDefault,
  withDecodingDefaultKey: () => withDecodingDefaultKey,
  withDecodingDefaultType: () => withDecodingDefaultType,
  withDecodingDefaultTypeKey: () => withDecodingDefaultTypeKey
});

// node_modules/effect/dist/BigInt.js
var BigInt3 = globalThis.BigInt;
var toNumber = (b) => {
  if (b > BigInt3(Number.MAX_SAFE_INTEGER) || b < BigInt3(Number.MIN_SAFE_INTEGER)) {
    return none2();
  }
  return some2(Number(b));
};

// node_modules/effect/dist/ByteSize.js
var bigint04 = /* @__PURE__ */ BigInt(0);
var bigint13 = /* @__PURE__ */ BigInt(1);
var decimalBase = /* @__PURE__ */ BigInt(1e3);
var binaryBase = /* @__PURE__ */ BigInt(1024);
var decimalUnits = [{
  symbol: "B",
  factor: bigint13,
  names: ["B", "byte", "bytes"]
}, {
  symbol: "kB",
  factor: decimalBase,
  names: ["kB", "kilobyte", "kilobytes"]
}, {
  symbol: "MB",
  factor: decimalBase ** /* @__PURE__ */ BigInt(2),
  names: ["MB", "megabyte", "megabytes"]
}, {
  symbol: "GB",
  factor: decimalBase ** /* @__PURE__ */ BigInt(3),
  names: ["GB", "gigabyte", "gigabytes"]
}, {
  symbol: "TB",
  factor: decimalBase ** /* @__PURE__ */ BigInt(4),
  names: ["TB", "terabyte", "terabytes"]
}, {
  symbol: "PB",
  factor: decimalBase ** /* @__PURE__ */ BigInt(5),
  names: ["PB", "petabyte", "petabytes"]
}, {
  symbol: "EB",
  factor: decimalBase ** /* @__PURE__ */ BigInt(6),
  names: ["EB", "exabyte", "exabytes"]
}, {
  symbol: "ZB",
  factor: decimalBase ** /* @__PURE__ */ BigInt(7),
  names: ["ZB", "zettabyte", "zettabytes"]
}, {
  symbol: "YB",
  factor: decimalBase ** /* @__PURE__ */ BigInt(8),
  names: ["YB", "yottabyte", "yottabytes"]
}, {
  symbol: "RB",
  factor: decimalBase ** /* @__PURE__ */ BigInt(9),
  names: ["RB", "ronnabyte", "ronnabytes"]
}, {
  symbol: "QB",
  factor: decimalBase ** /* @__PURE__ */ BigInt(10),
  names: ["QB", "quettabyte", "quettabytes"]
}];
var binaryUnits = [decimalUnits[0], {
  symbol: "KiB",
  factor: binaryBase,
  names: ["KiB", "kibibyte", "kibibytes"]
}, {
  symbol: "MiB",
  factor: binaryBase ** /* @__PURE__ */ BigInt(2),
  names: ["MiB", "mebibyte", "mebibytes"]
}, {
  symbol: "GiB",
  factor: binaryBase ** /* @__PURE__ */ BigInt(3),
  names: ["GiB", "gibibyte", "gibibytes"]
}, {
  symbol: "TiB",
  factor: binaryBase ** /* @__PURE__ */ BigInt(4),
  names: ["TiB", "tebibyte", "tebibytes"]
}, {
  symbol: "PiB",
  factor: binaryBase ** /* @__PURE__ */ BigInt(5),
  names: ["PiB", "pebibyte", "pebibytes"]
}, {
  symbol: "EiB",
  factor: binaryBase ** /* @__PURE__ */ BigInt(6),
  names: ["EiB", "exbibyte", "exbibytes"]
}, {
  symbol: "ZiB",
  factor: binaryBase ** /* @__PURE__ */ BigInt(7),
  names: ["ZiB", "zebibyte", "zebibytes"]
}, {
  symbol: "YiB",
  factor: binaryBase ** /* @__PURE__ */ BigInt(8),
  names: ["YiB", "yobibyte", "yobibytes"]
}];
var allUnits = [...decimalUnits, .../* @__PURE__ */ binaryUnits.slice(1)];
var unitsByName = /* @__PURE__ */ new Map(/* @__PURE__ */ allUnits.flatMap((unit) => unit.names.map((name) => [name, unit])));
var make8 = (value3) => value3;
var invalid2 = (message) => {
  throw new Error(`Invalid ByteSize: ${message}`);
};
var fromNumber = (input) => {
  if (!Number.isSafeInteger(input) || input < 0) {
    return invalid2(`expected a non-negative safe integer, received ${input}`);
  }
  return make8(BigInt(input));
};
var fromStringUnsafe = (input) => {
  const match7 = /^\s*(\d+)(?:\.(\d+))?\s*([A-Za-z]+)\s*$/.exec(input);
  if (match7 === null) return invalid2(`unsupported syntax ${JSON.stringify(input)}`);
  const unit = unitsByName.get(match7[3]);
  if (unit === void 0) return invalid2(`unsupported unit ${JSON.stringify(match7[3])}`);
  const fraction = match7[2] ?? "";
  const scale = BigInt(10) ** BigInt(fraction.length);
  const numerator = BigInt(match7[1] + fraction) * unit.factor;
  if (numerator % scale !== bigint04) {
    return invalid2(`${JSON.stringify(input)} does not represent an integral number of bytes`);
  }
  return make8(numerator / scale);
};
var fromString2 = /* @__PURE__ */ liftThrowable(fromStringUnsafe);
var fromInputUnsafe2 = (input) => {
  switch (typeof input) {
    case "bigint":
      if (input < bigint04) return invalid2(`expected a non-negative bigint, received ${input}`);
      return make8(input);
    case "number":
      return fromNumber(input);
    case "string":
      return fromStringUnsafe(input);
  }
  return invalid2(`unsupported input ${input}`);
};
var fromInput2 = /* @__PURE__ */ liftThrowable(fromInputUnsafe2);
var bytes = (value3) => typeof value3 === "bigint" ? fromInputUnsafe2(value3) : fromNumber(value3);
var isByteSize = (input) => typeof input === "bigint" && input >= bigint04;
var toBigInt = (self) => self;
var toNumber2 = toNumber;

// node_modules/effect/dist/Chunk.js
var TypeId15 = "~effect/Chunk";
function copy(src, srcPos, dest, destPos, len) {
  for (let i = srcPos; i < Math.min(src.length, srcPos + len); i++) {
    dest[destPos + i - srcPos] = src[i];
  }
  return dest;
}
var emptyArray = [];
var makeEquivalence5 = (isEquivalent) => make((self, that) => {
  if (self.length !== that.length) {
    return false;
  }
  const as3 = toReadonlyArray(self);
  const bs = toReadonlyArray(that);
  for (let i = 0; i < as3.length; i++) {
    if (!isEquivalent(as3[i], bs[i])) {
      return false;
    }
  }
  return true;
});
var _equivalence = /* @__PURE__ */ makeEquivalence5(equals);
var ChunkProto = {
  [TypeId15]: {
    _A: (_) => _
  },
  toString() {
    return `Chunk(${format(toReadonlyArray(this))})`;
  },
  toJSON() {
    return {
      _id: "Chunk",
      values: toJson(toReadonlyArray(this))
    };
  },
  [NodeInspectSymbol]() {
    return this.toJSON();
  },
  [symbol2](that) {
    return isChunk(that) && _equivalence(this, that);
  },
  [symbol]() {
    return array(toReadonlyArray(this));
  },
  [Symbol.iterator]() {
    switch (this.backing._tag) {
      case "IArray": {
        return this.backing.array[Symbol.iterator]();
      }
      case "IEmpty": {
        return emptyArray[Symbol.iterator]();
      }
      default: {
        return toReadonlyArray(this)[Symbol.iterator]();
      }
    }
  },
  pipe() {
    return pipeArguments(this, arguments);
  }
};
var makeChunk = (backing) => {
  const chunk = Object.create(ChunkProto);
  chunk.backing = backing;
  switch (backing._tag) {
    case "IEmpty": {
      chunk.length = 0;
      chunk.depth = 0;
      chunk.left = chunk;
      chunk.right = chunk;
      break;
    }
    case "IConcat": {
      chunk.length = backing.left.length + backing.right.length;
      chunk.depth = 1 + Math.max(backing.left.depth, backing.right.depth);
      chunk.left = backing.left;
      chunk.right = backing.right;
      break;
    }
    case "IArray": {
      chunk.length = backing.array.length;
      chunk.depth = 0;
      chunk.left = _empty;
      chunk.right = _empty;
      break;
    }
    case "ISingleton": {
      chunk.length = 1;
      chunk.depth = 0;
      chunk.left = _empty;
      chunk.right = _empty;
      break;
    }
    case "ISlice": {
      chunk.length = backing.length;
      chunk.depth = 0;
      chunk.left = _empty;
      chunk.right = _empty;
      break;
    }
  }
  return chunk;
};
var isChunk = (u) => hasProperty(u, TypeId15);
var _empty = /* @__PURE__ */ makeChunk({
  _tag: "IEmpty"
});
var empty5 = () => _empty;
var of = (a) => makeChunk({
  _tag: "ISingleton",
  a
});
var fromIterable2 = (self) => isChunk(self) ? self : fromArrayUnsafe(fromIterable(self));
var copyToArray = (self, array2, initial) => {
  switch (self.backing._tag) {
    case "IArray": {
      copy(self.backing.array, 0, array2, initial, self.length);
      break;
    }
    case "IConcat": {
      copyToArray(self.left, array2, initial);
      copyToArray(self.right, array2, initial + self.left.length);
      break;
    }
    case "ISingleton": {
      array2[initial] = self.backing.a;
      break;
    }
    case "ISlice": {
      copy(toReadonlyArray(self.backing.chunk), self.backing.offset, array2, initial, self.length);
      break;
    }
  }
};
var toReadonlyArray_ = (self) => {
  switch (self.backing._tag) {
    case "IEmpty": {
      return emptyArray;
    }
    case "IArray": {
      return self.backing.array;
    }
    default: {
      const arr = new Array(self.length);
      copyToArray(self, arr, 0);
      self.backing = {
        _tag: "IArray",
        array: arr
      };
      self.left = _empty;
      self.right = _empty;
      self.depth = 0;
      return arr;
    }
  }
};
var toReadonlyArray = toReadonlyArray_;
var fromArrayUnsafe = (self) => self.length === 0 ? empty5() : self.length === 1 ? of(self[0]) : makeChunk({
  _tag: "IArray",
  array: self
});
var size = (self) => self.length;

// node_modules/effect/dist/DateTime.js
var isDateTime2 = isDateTime;
var isTimeZone2 = isTimeZone;
var isTimeZoneOffset2 = isTimeZoneOffset;
var isTimeZoneNamed2 = isTimeZoneNamed;
var isUtc2 = isUtc;
var isZoned2 = isZoned;
var Equivalence4 = Equivalence2;
var makeUnsafe5 = makeUnsafe4;
var makeZonedUnsafe2 = makeZonedUnsafe;
var make9 = make6;
var makeZonedFromString2 = makeZonedFromString;
var toUtc2 = toUtc;
var zoneMakeNamedUnsafe2 = zoneMakeNamedUnsafe;
var zoneMakeOffset2 = zoneMakeOffset;
var zoneMakeNamed2 = zoneMakeNamed;
var zoneFromString2 = zoneFromString;
var zoneToString2 = zoneToString;
var toDateUtc2 = toDateUtc;
var toEpochMillis2 = toEpochMillis;
var formatIso2 = formatIso;
var formatIsoZoned2 = formatIsoZoned;

// node_modules/effect/dist/encoding/Base64.js
var encode2 = (input) => encodeBytes(typeof input === "string" ? encoder2.encode(input) : input);
var decode2 = (str) => {
  const stripped = stripCrlf(str);
  const length = stripped.length;
  if (length % 4 !== 0) {
    return fail2(new EncodingError({
      kind: "Decode",
      module: "Base64",
      input: stripped,
      message: `Length must be a multiple of 4, but is ${length}`
    }));
  }
  const index2 = stripped.indexOf("=");
  if (index2 !== -1 && (index2 < length - 2 || index2 === length - 2 && stripped[length - 1] !== "=")) {
    return fail2(new EncodingError({
      kind: "Decode",
      module: "Base64",
      input: stripped,
      message: "Found a '=' character, but it is not at the end"
    }));
  }
  try {
    const missingOctets = stripped.endsWith("==") ? 2 : stripped.endsWith("=") ? 1 : 0;
    const result3 = new Uint8Array(3 * (length / 4) - missingOctets);
    for (let i = 0, j = 0; i < length; i += 4, j += 3) {
      const buffer = getCode(stripped.charCodeAt(i)) << 18 | getCode(stripped.charCodeAt(i + 1)) << 12 | getCode(stripped.charCodeAt(i + 2)) << 6 | getCode(stripped.charCodeAt(i + 3));
      result3[j] = buffer >> 16;
      result3[j + 1] = buffer >> 8 & 255;
      result3[j + 2] = buffer & 255;
    }
    return succeed2(result3);
  } catch (cause) {
    return fail2(new EncodingError({
      kind: "Decode",
      module: "Base64",
      input: stripped,
      message: cause instanceof Error ? cause.message : "Invalid input"
    }));
  }
};
var decodeString2 = (str) => map2(decode2(str), (_) => decoder2.decode(_));
var encodeBytes = (bytes3) => {
  const length = bytes3.length;
  let result3 = "";
  let i;
  for (i = 2; i < length; i += 3) {
    result3 += alphabet[bytes3[i - 2] >> 2];
    result3 += alphabet[(bytes3[i - 2] & 3) << 4 | bytes3[i - 1] >> 4];
    result3 += alphabet[(bytes3[i - 1] & 15) << 2 | bytes3[i] >> 6];
    result3 += alphabet[bytes3[i] & 63];
  }
  if (i === length + 1) {
    result3 += alphabet[bytes3[i - 2] >> 2];
    result3 += alphabet[(bytes3[i - 2] & 3) << 4];
    result3 += "==";
  }
  if (i === length) {
    result3 += alphabet[bytes3[i - 2] >> 2];
    result3 += alphabet[(bytes3[i - 2] & 3) << 4 | bytes3[i - 1] >> 4];
    result3 += alphabet[(bytes3[i - 1] & 15) << 2];
    result3 += "=";
  }
  return result3;
};
var encoder2 = /* @__PURE__ */ new TextEncoder();
var decoder2 = /* @__PURE__ */ new TextDecoder();
var stripCrlf = (str) => str.replace(/[\n\r]/g, "");
var alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
var codes = /* @__PURE__ */ new Uint8Array(123).fill(255);
for (let i = 0; i < alphabet.length; i++) codes[/* @__PURE__ */ alphabet.charCodeAt(i)] = i;
codes[/* @__PURE__ */ "=".charCodeAt(0)] = 0;
var getCode = (charCode) => {
  if (charCode >= codes.length || codes[charCode] === 255) {
    throw new TypeError(`Invalid character ${String.fromCharCode(charCode)}`);
  }
  return codes[charCode];
};

// node_modules/effect/dist/internal/hashMap.js
var HashMapTypeId = "~effect/HashMap";
var SHIFT = 5;
var BUCKET_SIZE = 1 << SHIFT;
var MIN_ARRAY_NODE = BUCKET_SIZE / 4;
var MAX_INDEX_NODE = BUCKET_SIZE / 2;
var BITMAP_INDEX_MASK = BUCKET_SIZE - 1;
var popcount = (n) => {
  n = n - (n >>> 1 & 1431655765);
  n = (n & 858993459) + (n >>> 2 & 858993459);
  return (n + (n >>> 4) & 252645135) * 16843009 >>> 24;
};
var mask = (hash2, shift) => hash2 >>> shift & BITMAP_INDEX_MASK;
var bitpos = (hash2, shift) => 1 << mask(hash2, shift);
var index = (bitmap, bit) => popcount(bitmap & bit - 1);
function mergeLeaves(edit, shift, hash1, node1, hash2, node2) {
  if (shift > 32) {
    throw new Error("HashMap: max depth exceeded");
  }
  const bit1 = bitpos(hash1, shift);
  const bit2 = bitpos(hash2, shift);
  if (bit1 === bit2) {
    const child = mergeLeaves(edit, shift + SHIFT, hash1, node1, hash2, node2);
    return new IndexedNode(edit, bit1, [child]);
  }
  const bitmap = bit1 | bit2;
  const children = bit1 >>> 0 < bit2 >>> 0 ? [node1, node2] : [node2, node1];
  return new IndexedNode(edit, bitmap, children);
}
var hashMapSeed = /* @__PURE__ */ string("HashMap");
var entryHash2 = (key, value3) => combine(hash(key), hash(value3));
var childrenHash = (children) => {
  let h = 0;
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (child) h ^= child.subtreeHash();
  }
  return h;
};
var Node = class {
  canEdit(edit) {
    return this.edit === edit;
  }
  subtreeHash() {
    let h = this._hash;
    if (h === void 0) {
      const seen = backEdges;
      h = this.computeHash();
      if (seen === backEdges) {
        this._hash = h;
      }
    }
    return h;
  }
};
var EmptyNode = class extends Node {
  _tag = "EmptyNode";
  edit = 0;
  get size() {
    return 0;
  }
  get(_shift, _hash, _key) {
    return none2();
  }
  has(_shift, _hash, _key) {
    return false;
  }
  set(edit, _shift, hash2, key, value3, added) {
    added.value = true;
    return new LeafNode(edit, hash2, key, value3);
  }
  remove(_edit, _shift, _hash, _key, _removed) {
    return this;
  }
  canEdit(_edit) {
    return false;
  }
  computeHash() {
    return 0;
  }
};
var LeafNode = class _LeafNode extends Node {
  _tag = "LeafNode";
  edit;
  hash;
  key;
  value;
  constructor(edit, hash2, key, value3) {
    super();
    this.edit = edit;
    this.hash = hash2;
    this.key = key;
    this.value = value3;
  }
  get size() {
    return 1;
  }
  get(_shift, hash2, key) {
    if (this.hash === hash2 && equals(this.key, key)) {
      return some2(this.value);
    }
    return none2();
  }
  has(_shift, hash2, key) {
    return this.hash === hash2 && equals(this.key, key);
  }
  set(edit, shift, hash2, key, value3, added) {
    if (this.canEdit(edit)) this._hash = void 0;
    if (this.hash === hash2 && equals(this.key, key)) {
      if (equals(this.value, value3)) {
        return this;
      }
      if (this.canEdit(edit)) {
        this.value = value3;
        return this;
      }
      return new _LeafNode(edit, hash2, key, value3);
    }
    added.value = true;
    if (this.hash === hash2) {
      return new CollisionNode(edit, hash2, [[this.key, this.value], [key, value3]]);
    }
    const newBit = bitpos(hash2, shift);
    const existingBit = bitpos(this.hash, shift);
    if (newBit === existingBit) {
      return new IndexedNode(edit, newBit, [this.set(edit, shift + SHIFT, hash2, key, value3, added)]);
    }
    const bitmap = newBit | existingBit;
    const nodes = newBit >>> 0 < existingBit >>> 0 ? [new _LeafNode(edit, hash2, key, value3), this] : [this, new _LeafNode(edit, hash2, key, value3)];
    return new IndexedNode(edit, bitmap, nodes);
  }
  remove(_edit, _shift, hash2, key, removed) {
    if (this.hash === hash2 && equals(this.key, key)) {
      removed.value = true;
      return void 0;
    }
    return this;
  }
  computeHash() {
    return entryHash2(this.key, this.value);
  }
};
var CollisionNode = class _CollisionNode extends Node {
  _tag = "CollisionNode";
  edit;
  hash;
  entries;
  constructor(edit, hash2, entries3) {
    super();
    this.edit = edit;
    this.hash = hash2;
    this.entries = entries3;
  }
  get size() {
    return this.entries.length;
  }
  get(_shift, hash2, key) {
    if (this.hash !== hash2) {
      return none2();
    }
    for (const [k, v] of this.entries) {
      if (equals(k, key)) {
        return some2(v);
      }
    }
    return none2();
  }
  has(_shift, hash2, key) {
    if (this.hash !== hash2) {
      return false;
    }
    for (const [k] of this.entries) {
      if (equals(k, key)) {
        return true;
      }
    }
    return false;
  }
  set(edit, shift, hash2, key, value3, added) {
    if (this.canEdit(edit)) this._hash = void 0;
    if (this.hash !== hash2) {
      added.value = true;
      return mergeLeaves(edit, shift, this.hash, this, hash2, new LeafNode(edit, hash2, key, value3));
    }
    for (let i = 0; i < this.entries.length; i++) {
      if (equals(this.entries[i][0], key)) {
        if (equals(this.entries[i][1], value3)) {
          return this;
        }
        if (this.canEdit(edit)) {
          this.entries[i] = [key, value3];
          return this;
        }
        const newEntries = [...this.entries];
        newEntries[i] = [key, value3];
        return new _CollisionNode(edit, this.hash, newEntries);
      }
    }
    added.value = true;
    if (this.canEdit(edit)) {
      this.entries.push([key, value3]);
      return this;
    }
    return new _CollisionNode(edit, this.hash, [...this.entries, [key, value3]]);
  }
  remove(edit, _shift, hash2, key, removed) {
    if (this.canEdit(edit)) this._hash = void 0;
    if (this.hash !== hash2) {
      return this;
    }
    const idx = this.entries.findIndex(([k]) => equals(k, key));
    if (idx === -1) {
      return this;
    }
    removed.value = true;
    if (this.entries.length === 1) {
      return void 0;
    }
    if (this.entries.length === 2) {
      const remaining = this.entries[idx === 0 ? 1 : 0];
      return new LeafNode(edit, this.hash, remaining[0], remaining[1]);
    }
    if (this.canEdit(edit)) {
      this.entries.splice(idx, 1);
      return this;
    }
    const newEntries = [...this.entries];
    newEntries.splice(idx, 1);
    return new _CollisionNode(edit, this.hash, newEntries);
  }
  computeHash() {
    let h = 0;
    const entries3 = this.entries;
    for (let i = 0; i < entries3.length; i++) {
      h ^= entryHash2(entries3[i][0], entries3[i][1]);
    }
    return h;
  }
};
var IndexedNode = class _IndexedNode extends Node {
  _tag = "IndexedNode";
  edit;
  _size;
  bitmap;
  children;
  constructor(edit, bitmap, children) {
    super();
    this.edit = edit;
    this.bitmap = bitmap;
    this.children = children;
  }
  get size() {
    if (this._size === void 0) {
      this._size = this.children.reduce((acc, child) => acc + child.size, 0);
    }
    return this._size;
  }
  get(shift, hash2, key) {
    const bit = bitpos(hash2, shift);
    if ((this.bitmap & bit) === 0) {
      return none2();
    }
    const idx = index(this.bitmap, bit);
    return this.children[idx].get(shift + SHIFT, hash2, key);
  }
  has(shift, hash2, key) {
    const bit = bitpos(hash2, shift);
    if ((this.bitmap & bit) === 0) {
      return false;
    }
    const idx = index(this.bitmap, bit);
    return this.children[idx].has(shift + SHIFT, hash2, key);
  }
  set(edit, shift, hash2, key, value3, added) {
    if (this.canEdit(edit)) this._hash = void 0;
    const bit = bitpos(hash2, shift);
    const idx = index(this.bitmap, bit);
    if ((this.bitmap & bit) !== 0) {
      const child = this.children[idx];
      const newChild = child.set(edit, shift + SHIFT, hash2, key, value3, added);
      if (child === newChild) {
        return this;
      }
      if (this.canEdit(edit)) {
        this.children[idx] = newChild;
        return this;
      }
      const newChildren = [...this.children];
      newChildren[idx] = newChild;
      return new _IndexedNode(edit, this.bitmap, newChildren);
    } else {
      added.value = true;
      const newChild = new LeafNode(edit, hash2, key, value3);
      const newBitmap = this.bitmap | bit;
      if (this.canEdit(edit)) {
        this.children.splice(idx, 0, newChild);
        this.bitmap = newBitmap;
        this._size = void 0;
        if (this.children.length > MAX_INDEX_NODE) {
          return this.expand(edit, newBitmap, this.children);
        }
        return this;
      }
      const newChildren = [...this.children];
      newChildren.splice(idx, 0, newChild);
      if (newChildren.length > MAX_INDEX_NODE) {
        return this.expand(edit, newBitmap, newChildren);
      }
      return new _IndexedNode(edit, newBitmap, newChildren);
    }
  }
  remove(edit, shift, hash2, key, removed) {
    if (this.canEdit(edit)) this._hash = void 0;
    const bit = bitpos(hash2, shift);
    if ((this.bitmap & bit) === 0) {
      return this;
    }
    const idx = index(this.bitmap, bit);
    const child = this.children[idx];
    const newChild = child.remove(edit, shift + SHIFT, hash2, key, removed);
    if (!removed.value) {
      return this;
    }
    if (newChild === void 0) {
      const newBitmap = this.bitmap ^ bit;
      if (newBitmap === 0) {
        return void 0;
      }
      if (this.children.length === 2) {
        const remaining = this.children[idx === 0 ? 1 : 0];
        if (remaining._tag === "LeafNode") {
          return remaining;
        }
      }
      if (this.canEdit(edit)) {
        this.children.splice(idx, 1);
        this.bitmap = newBitmap;
        this._size = void 0;
        return this;
      }
      const newChildren2 = [...this.children];
      newChildren2.splice(idx, 1);
      return new _IndexedNode(edit, newBitmap, newChildren2);
    }
    if (child === newChild) {
      return this;
    }
    if (this.canEdit(edit)) {
      this.children[idx] = newChild;
      return this;
    }
    const newChildren = [...this.children];
    newChildren[idx] = newChild;
    return new _IndexedNode(edit, this.bitmap, newChildren);
  }
  expand(edit, bitmap, children) {
    const nodes = new globalThis.Array(BUCKET_SIZE);
    let j = 0;
    for (let i = 0; i < BUCKET_SIZE; i++) {
      if ((bitmap & 1 << i) !== 0) {
        nodes[i] = children[j++];
      }
    }
    return new ArrayNode(edit, children.length, nodes);
  }
  computeHash() {
    return childrenHash(this.children);
  }
};
var ArrayNode = class _ArrayNode extends Node {
  _tag = "ArrayNode";
  edit;
  _size;
  count;
  children;
  constructor(edit, count, children) {
    super();
    this.edit = edit;
    this.count = count;
    this.children = children;
  }
  get size() {
    if (this._size === void 0) {
      this._size = this.children.reduce((acc, child) => acc + (child?.size ?? 0), 0);
    }
    return this._size;
  }
  get(shift, hash2, key) {
    const idx = mask(hash2, shift);
    const child = this.children[idx];
    return child ? child.get(shift + SHIFT, hash2, key) : none2();
  }
  has(shift, hash2, key) {
    const idx = mask(hash2, shift);
    const child = this.children[idx];
    return child ? child.has(shift + SHIFT, hash2, key) : false;
  }
  set(edit, shift, hash2, key, value3, added) {
    if (this.canEdit(edit)) this._hash = void 0;
    const idx = mask(hash2, shift);
    const child = this.children[idx];
    if (child) {
      const newChild = child.set(edit, shift + SHIFT, hash2, key, value3, added);
      if (child === newChild) {
        return this;
      }
      if (this.canEdit(edit)) {
        this.children[idx] = newChild;
        return this;
      }
      const newChildren = [...this.children];
      newChildren[idx] = newChild;
      return new _ArrayNode(edit, this.count, newChildren);
    } else {
      added.value = true;
      const newChild = new LeafNode(edit, hash2, key, value3);
      if (this.canEdit(edit)) {
        this.children[idx] = newChild;
        this.count++;
        this._size = void 0;
        return this;
      }
      const newChildren = [...this.children];
      newChildren[idx] = newChild;
      return new _ArrayNode(edit, this.count + 1, newChildren);
    }
  }
  remove(edit, shift, hash2, key, removed) {
    if (this.canEdit(edit)) this._hash = void 0;
    const idx = mask(hash2, shift);
    const child = this.children[idx];
    if (!child) {
      return this;
    }
    const newChild = child.remove(edit, shift + SHIFT, hash2, key, removed);
    if (!removed.value) {
      return this;
    }
    const newCount = this.count - (newChild ? 0 : 1);
    if (newCount < MIN_ARRAY_NODE) {
      return this.pack(edit, idx, newChild);
    }
    if (child === newChild) {
      return this;
    }
    if (this.canEdit(edit)) {
      this.children[idx] = newChild;
      if (!newChild) {
        this.count = newCount;
      }
      this._size = void 0;
      return this;
    }
    const newChildren = [...this.children];
    newChildren[idx] = newChild;
    return new _ArrayNode(edit, newCount, newChildren);
  }
  pack(edit, excludeIdx, newChild) {
    const children = [];
    let bitmap = 0;
    let bit = 1;
    for (let i = 0; i < this.children.length; i++) {
      const child = i === excludeIdx ? newChild : this.children[i];
      if (child) {
        children.push(child);
        bitmap |= bit;
      }
      bit <<= 1;
    }
    return new IndexedNode(edit, bitmap, children);
  }
  computeHash() {
    return childrenHash(this.children);
  }
};
var HashMapIterator = class {
  stack;
  project;
  entries = [];
  index = 0;
  constructor(root, project) {
    this.stack = [root];
    this.project = project;
  }
  next() {
    while (true) {
      if (this.index < this.entries.length) {
        const entry = this.entries[this.index++];
        return {
          done: false,
          value: this.project(entry[0], entry[1])
        };
      }
      if (this.stack.length === 0) {
        return {
          done: true,
          value: void 0
        };
      }
      const node = this.stack.pop();
      switch (node._tag) {
        case "LeafNode": {
          const leaf = node;
          return {
            done: false,
            value: this.project(leaf.key, leaf.value)
          };
        }
        case "CollisionNode": {
          this.entries = node.entries;
          this.index = 0;
          break;
        }
        case "IndexedNode":
        case "ArrayNode": {
          const children = node.children;
          for (let i = children.length - 1; i >= 0; i--) {
            const child = children[i];
            if (child) this.stack.push(child);
          }
        }
      }
    }
  }
  [Symbol.iterator]() {
    return this;
  }
};
var toEntry = (key, value3) => [key, value3];
var HashMapImpl = class {
  [HashMapTypeId] = HashMapTypeId;
  _editable;
  _edit;
  _root;
  _size;
  constructor(editable, edit, root, size7) {
    this._editable = editable;
    this._edit = edit;
    this._root = root;
    this._size = size7;
  }
  get size() {
    return this._size;
  }
  [Symbol.iterator]() {
    return new HashMapIterator(this._root, toEntry);
  }
  [symbol2](that) {
    if (isHashMap(that)) {
      const thatImpl = that;
      if (this.size !== thatImpl.size) {
        return false;
      }
      for (const [key, value3] of this) {
        const otherValue = pipe(that, get3(key));
        if (isNone2(otherValue) || !equals(value3, otherValue.value)) {
          return false;
        }
      }
      return true;
    }
    return false;
  }
  [symbol]() {
    return optimize(hashMapSeed ^ this._root.subtreeHash());
  }
  [NodeInspectSymbol]() {
    return toJson(this);
  }
  toString() {
    return `HashMap(${format(Array.from(this))})`;
  }
  toJSON() {
    return {
      _id: "HashMap",
      values: Array.from(this).map(([k, v]) => [toJson(k), toJson(v)])
    };
  }
  pipe() {
    return pipeArguments(this, arguments);
  }
};
var emptyNode = /* @__PURE__ */ new EmptyNode();
var isHashMap = (u) => hasProperty(u, HashMapTypeId);
var empty6 = () => new HashMapImpl(false, 0, emptyNode, 0);
var fromIterable3 = (entries3) => {
  let root = emptyNode;
  let size7 = 0;
  const added = {
    value: false
  };
  for (const [key, value3] of entries3) {
    const hash2 = hash(key);
    added.value = false;
    root = root.set(NaN, 0, hash2, key, value3, added);
    if (added.value) {
      size7++;
    }
  }
  return new HashMapImpl(false, 0, root, size7);
};
var get3 = /* @__PURE__ */ dual(2, (self, key) => {
  const impl = self;
  return impl._root.get(0, hash(key), key);
});
var has3 = /* @__PURE__ */ dual(2, (self, key) => {
  const impl = self;
  return impl._root.has(0, hash(key), key);
});
var setHash = (self, key, hash2, value3) => {
  const impl = self;
  const added = {
    value: false
  };
  const edit = impl._editable ? impl._edit : NaN;
  const newRoot = impl._root.set(edit, 0, hash2, key, value3, added);
  if (impl._editable) {
    impl._root = newRoot;
    if (added.value) {
      impl._size++;
    }
    return self;
  }
  if (impl._root === newRoot) {
    return self;
  }
  return new HashMapImpl(false, impl._edit, newRoot, impl._size + (added.value ? 1 : 0));
};
var set2 = /* @__PURE__ */ dual(3, (self, key, value3) => {
  return setHash(self, key, hash(key), value3);
});
var keys2 = (self) => new HashMapIterator(self._root, identity);
var entries = (self) => self[Symbol.iterator]();
var size2 = (self) => self.size;

// node_modules/effect/dist/HashMap.js
var isHashMap2 = isHashMap;
var fromIterable4 = fromIterable3;
var entries2 = entries;
var toEntries = (self) => Array.from(entries2(self));
var size3 = size2;

// node_modules/effect/dist/internal/hashSet.js
var HashSetTypeId = "~effect/HashSet";
var hashSetSeed = /* @__PURE__ */ string(HashSetTypeId);
var HashSetProto = {
  [symbol]() {
    return optimize(combine(hashSetSeed, hash(keyMap(this))));
  },
  [symbol2](that) {
    return isHashSet(that) && size4(this) === size4(that) && every2(this, (value3) => has4(that, value3));
  },
  [Symbol.iterator]() {
    return keys2(keyMap(this));
  },
  toString() {
    return `HashSet(${format(Array.from(this))})`;
  },
  toJSON() {
    return {
      _id: "HashSet",
      values: toJson(Array.from(this))
    };
  },
  [NodeInspectSymbol]() {
    return this.toJSON();
  },
  pipe() {
    return pipeArguments(this, arguments);
  }
};
var makeImpl2 = (keyMap2) => {
  const set4 = Object.create(HashSetProto);
  set4[HashSetTypeId] = HashSetTypeId;
  set4.keyMap = keyMap2;
  return set4;
};
var isHashSet = (u) => hasProperty(u, HashSetTypeId);
var keyMap = (self) => self.keyMap;
var fromIterable5 = (values2) => {
  let map10 = empty6();
  for (const value3 of values2) {
    map10 = set2(map10, value3, true);
  }
  return makeImpl2(map10);
};
var has4 = (self, value3) => has3(keyMap(self), value3);
var size4 = (self) => size2(keyMap(self));
var every2 = (self, predicate) => {
  for (const value3 of self) {
    if (!predicate(value3)) {
      return false;
    }
  }
  return true;
};

// node_modules/effect/dist/HashSet.js
var fromIterable6 = fromIterable5;
var isHashSet2 = isHashSet;
var size5 = size4;

// node_modules/effect/dist/http/Cookies.js
var TypeId16 = "~effect/http/Cookies";
var isCookies = (u) => hasProperty(u, TypeId16);
var CookieTypeId = "~effect/http/Cookies/Cookie";
var isCookie = (u) => hasProperty(u, CookieTypeId);
var CookieErrorTypeId = "~effect/http/Cookies/CookieError";
var CookiesErrorReason = class extends Error3 {
};
var CookiesError = class _CookiesError extends (/* @__PURE__ */ TaggedError2("CookiesError")) {
  /**
   * Creates a cookie error from a reason tag and optional cause.
   *
   * @stability unstable
   * @since 4.0.0
   */
  static fromReason(reason, cause) {
    return new _CookiesError({
      reason: new CookiesErrorReason({
        _tag: reason,
        cause
      })
    });
  }
  /**
   * Marks this value as a cookie validation error for runtime guards.
   *
   * @stability unstable
   * @since 4.0.0
   */
  [CookieErrorTypeId] = CookieErrorTypeId;
  /**
   * Uses the concrete cookie error reason as the public message.
   *
   * @stability unstable
   * @since 4.0.0
   */
  get message() {
    return this.reason._tag;
  }
};
var Proto4 = {
  [TypeId16]: TypeId16,
  ...BaseProto,
  toJSON() {
    return {
      _id: "effect/Cookies",
      cookies: map3(this.cookies, (cookie) => cookie.toJSON())
    };
  },
  pipe() {
    return pipeArguments(this, arguments);
  }
};
var fromReadonlyRecord = (cookies) => {
  const self = Object.create(Proto4);
  self.cookies = cookies;
  return self;
};
var fromIterable7 = (cookies) => {
  const record2 = {};
  for (const cookie of cookies) {
    assignProperty(record2, cookie.name, cookie);
  }
  return fromReadonlyRecord(record2);
};
var fromSetCookie = (headers) => {
  const arrayHeaders = typeof headers === "string" ? [headers] : headers;
  const cookies = [];
  for (const header of arrayHeaders) {
    const cookie = parseSetCookie(header.trim());
    if (cookie) {
      cookies.push(cookie);
    }
  }
  return fromIterable7(cookies);
};
function parseSetCookie(header) {
  const parts2 = header.split(";").map((_) => _.trim()).filter((_) => _ !== "");
  if (parts2.length === 0) {
    return void 0;
  }
  const firstEqual = parts2[0].indexOf("=");
  if (firstEqual === -1) {
    return void 0;
  }
  const name = parts2[0].slice(0, firstEqual);
  if (!cookieNameRegExp.test(name)) {
    return void 0;
  }
  const valueEncoded = parts2[0].slice(firstEqual + 1);
  const value3 = tryDecodeURIComponent(valueEncoded);
  if (parts2.length === 1) {
    return Object.assign(Object.create(CookieProto), {
      name,
      value: value3,
      valueEncoded
    });
  }
  const options = {};
  for (let i = 1; i < parts2.length; i++) {
    const part = parts2[i];
    const equalIndex = part.indexOf("=");
    const key = equalIndex === -1 ? part : part.slice(0, equalIndex).trim();
    const value4 = equalIndex === -1 ? void 0 : part.slice(equalIndex + 1).trim();
    switch (key.toLowerCase()) {
      case "domain": {
        if (value4 === void 0) {
          break;
        }
        const domain = value4.trim().replace(/^\./, "");
        if (domain) {
          options.domain = domain;
        }
        break;
      }
      case "expires": {
        if (value4 === void 0) {
          break;
        }
        const date = new Date(value4);
        if (!isNaN(date.getTime())) {
          options.expires = date;
        }
        break;
      }
      case "max-age": {
        if (value4 === void 0) {
          break;
        }
        const maxAge = parseInt(value4, 10);
        if (!isNaN(maxAge)) {
          options.maxAge = seconds(maxAge);
        }
        break;
      }
      case "path": {
        if (value4 === void 0) {
          break;
        }
        if (value4[0] === "/") {
          options.path = value4;
        }
        break;
      }
      case "priority": {
        if (value4 === void 0) {
          break;
        }
        switch (value4.toLowerCase()) {
          case "low":
            options.priority = "low";
            break;
          case "medium":
            options.priority = "medium";
            break;
          case "high":
            options.priority = "high";
            break;
        }
        break;
      }
      case "httponly": {
        options.httpOnly = true;
        break;
      }
      case "secure": {
        options.secure = true;
        break;
      }
      case "partitioned": {
        options.partitioned = true;
        break;
      }
      case "samesite": {
        if (value4 === void 0) {
          break;
        }
        switch (value4.toLowerCase()) {
          case "lax":
            options.sameSite = "lax";
            break;
          case "strict":
            options.sameSite = "strict";
            break;
          case "none":
            options.sameSite = "none";
            break;
        }
        break;
      }
    }
  }
  return Object.assign(Object.create(CookieProto), {
    name,
    value: value3,
    valueEncoded,
    options: Object.keys(options).length > 0 ? options : void 0
  });
}
var fieldContentRegExp = /^[\u0009\u0020-\u007e\u0080-\u00ff]+$/;
var cookieNameRegExp = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;
var cookieDomainRegExp = /^[\u0009\u0020-\u003a\u003c-\u007e\u0080-\u00ff]+$/;
var cookiePathRegExp = /^[\u0020-\u003a\u003c-\u007e]+$/;
var CookieProto = {
  [CookieTypeId]: CookieTypeId,
  ...BaseProto,
  toJSON() {
    return {
      _id: "effect/Cookies/Cookie",
      name: this.name,
      value: this.value,
      options: this.options
    };
  }
};
function makeCookie(name, value3, options) {
  const encodedValue = encodeURIComponent(value3);
  const error = validateCookie(name, encodedValue, options);
  if (error !== void 0) {
    return fail2(error);
  }
  return succeed2(Object.assign(Object.create(CookieProto), {
    name,
    value: value3,
    valueEncoded: encodedValue,
    options
  }));
}
function validateCookie(name, encodedValue, options) {
  if (!cookieNameRegExp.test(name)) {
    return CookiesError.fromReason("InvalidCookieName");
  }
  if (encodedValue && !fieldContentRegExp.test(encodedValue)) {
    return CookiesError.fromReason("InvalidCookieValue");
  }
  if (options?.domain !== void 0 && !cookieDomainRegExp.test(options.domain)) {
    return CookiesError.fromReason("InvalidCookieDomain");
  }
  if (options?.path !== void 0 && !cookiePathRegExp.test(options.path)) {
    return CookiesError.fromReason("InvalidCookiePath");
  }
  if (options?.maxAge !== void 0 && !isFinite(fromInputUnsafe(options.maxAge))) {
    return CookiesError.fromReason("CookieInfinityMaxAge");
  }
}
var makeCookieUnsafe = (name, value3, options) => getOrThrow(makeCookie(name, value3, options));
function serializeCookie(self) {
  const error = validateCookie(self.name, self.valueEncoded, self.options);
  if (error !== void 0) {
    throw error;
  }
  let str = self.name + "=" + self.valueEncoded;
  if (self.options === void 0) {
    return str;
  }
  const options = self.options;
  if (options.maxAge !== void 0) {
    const maxAge = toSeconds(fromInputUnsafe(options.maxAge));
    str += "; Max-Age=" + Math.trunc(maxAge);
  }
  if (options.domain !== void 0) {
    str += "; Domain=" + options.domain;
  }
  if (options.path !== void 0) {
    str += "; Path=" + options.path;
  }
  if (options.priority !== void 0) {
    switch (options.priority) {
      case "low":
        str += "; Priority=Low";
        break;
      case "medium":
        str += "; Priority=Medium";
        break;
      case "high":
        str += "; Priority=High";
        break;
    }
  }
  if (options.expires !== void 0) {
    str += "; Expires=" + options.expires.toUTCString();
  }
  if (options.httpOnly) {
    str += "; HttpOnly";
  }
  if (options.secure) {
    str += "; Secure";
  }
  if (options.partitioned) {
    str += "; Partitioned";
  }
  if (options.sameSite !== void 0) {
    switch (options.sameSite) {
      case "lax":
        str += "; SameSite=Lax";
        break;
      case "strict":
        str += "; SameSite=Strict";
        break;
      case "none":
        str += "; SameSite=None";
        break;
    }
  }
  return str;
}
var toRecord = (self) => {
  const record2 = {};
  const cookies = Object.values(self.cookies);
  for (let index2 = 0; index2 < cookies.length; index2++) {
    const cookie = cookies[index2];
    assignProperty(record2, cookie.name, cookie.value);
  }
  return record2;
};
var toSetCookieHeaders = (self) => Object.values(self.cookies).map(serializeCookie);
var tryDecodeURIComponent = (str) => {
  try {
    return decodeURIComponent(str);
  } catch (_) {
    return str;
  }
};

// node_modules/effect/dist/internal/redacted.js
var redactedRegistry = /* @__PURE__ */ new WeakMap();
var value = (self) => {
  if (redactedRegistry.has(self)) {
    return redactedRegistry.get(self);
  } else {
    throw new Error("Unable to get redacted value" + (self.label ? ` with label: "${self.label}"` : ""));
  }
};

// node_modules/effect/dist/Redacted.js
var TypeId17 = "~effect/Redacted";
var isRedacted = (u) => hasProperty(u, TypeId17);
var make12 = (value3, options) => {
  const self = Object.create(Proto5);
  if (options?.label) {
    self.label = options.label;
  }
  redactedRegistry.set(self, value3);
  return self;
};
var Proto5 = {
  [TypeId17]: {
    _A: (_) => _
  },
  label: void 0,
  ...PipeInspectableProto,
  toJSON() {
    return this.toString();
  },
  toString() {
    return `<redacted${isString(this.label) ? ":" + this.label : ""}>`;
  },
  [symbol]() {
    return hash(redactedRegistry.get(this));
  },
  [symbol2](that) {
    return isRedacted(that) && equals(redactedRegistry.get(this), redactedRegistry.get(that));
  }
};
var value2 = value;
var makeEquivalence6 = (isEquivalent) => make((x, y) => isEquivalent(value2(x), value2(y)));

// node_modules/effect/dist/http/Headers.js
var TypeId18 = /* @__PURE__ */ Symbol.for("~effect/http/Headers");
var isHeaders = (u) => hasProperty(u, TypeId18);
var Proto6 = /* @__PURE__ */ Object.defineProperties(/* @__PURE__ */ Object.create(null), {
  [TypeId18]: {
    value: TypeId18
  },
  [symbolRedactable]: {
    value(context3) {
      return redact2(this, get(context3, CurrentRedactedNames));
    }
  },
  toJSON: {
    value() {
      return redact(this);
    }
  },
  [symbol2]: {
    value(that) {
      return Equivalence5(this, that);
    }
  },
  [symbol]: {
    value() {
      return structure(this);
    }
  },
  toString: {
    value: BaseProto.toString
  },
  [NodeInspectSymbol]: {
    value: BaseProto[NodeInspectSymbol]
  }
});
var Equivalence5 = /* @__PURE__ */ makeEquivalence3(/* @__PURE__ */ strictEqual());
var empty8 = /* @__PURE__ */ Object.create(Proto6);
var fromInput3 = (input) => {
  if (input === void 0) {
    return empty8;
  } else if (Symbol.iterator in input) {
    const out2 = Object.create(Proto6);
    for (const [k, v] of input) {
      out2[k.toLowerCase()] = v;
    }
    return out2;
  }
  const out = Object.create(Proto6);
  for (const [k, v] of Object.entries(input)) {
    if (Array.isArray(v)) {
      out[k.toLowerCase()] = v.join(", ");
    } else if (v !== void 0) {
      out[k.toLowerCase()] = v;
    }
  }
  return out;
};
var redact2 = /* @__PURE__ */ dual(2, (self, key) => {
  const out = {
    ...self
  };
  const modify3 = (key2) => {
    if (typeof key2 === "string") {
      const k = key2.toLowerCase();
      if (k in self) {
        out[k] = make12(self[k]);
      }
    } else {
      for (const name in self) {
        if (name.search(key2) !== -1) {
          out[name] = make12(self[name]);
        }
      }
    }
  };
  if (Array.isArray(key)) {
    for (let i = 0; i < key.length; i++) {
      modify3(key[i]);
    }
  } else {
    modify3(key);
  }
  return out;
});
var isRedactedName = (name, patterns) => {
  const lowerName = name.toLowerCase();
  for (let i = 0; i < patterns.length; i++) {
    const pattern = patterns[i];
    if (typeof pattern === "string") {
      if (pattern.toLowerCase() === lowerName) {
        return true;
      }
    } else if (name.search(pattern) !== -1) {
      return true;
    }
  }
  return false;
};
var CurrentRedactedNames = /* @__PURE__ */ Reference("effect/Headers/CurrentRedactedNames", {
  defaultValue: () => ["authorization", "cookie", "set-cookie", "x-api-key"]
});

// node_modules/effect/dist/http/internal/urlParams.js
var unwrap2 = (value3) => typeof value3 === "string" ? value3 : value2(value3);

// node_modules/effect/dist/http/UrlParams.js
var TypeId19 = "~effect/http/UrlParams";
var isUrlParams = (u) => hasProperty(u, TypeId19);
var Proto7 = {
  ...PipeInspectableProto,
  [TypeId19]: TypeId19,
  [Symbol.iterator]() {
    return this.params[Symbol.iterator]();
  },
  [symbolRedactable](context3) {
    return {
      _id: "UrlParams",
      params: Object.fromEntries(redact3(this, get(context3, CurrentRedactedNames2)))
    };
  },
  toJSON() {
    return redact(this);
  },
  [symbol2](that) {
    return Equivalence6(this, that);
  },
  [symbol]() {
    return array(this.params.flat());
  }
};
var make13 = (params) => {
  const self = Object.create(Proto7);
  self.params = params;
  return self;
};
var fromInput4 = (input) => {
  if (isUrlParams(input)) {
    return input;
  }
  const parsed = fromInputNested(input);
  const out = [];
  for (let i = 0; i < parsed.length; i++) {
    if (Array.isArray(parsed[i][0])) {
      const [keys3, value3] = parsed[i];
      out.push([`${keys3[0]}[${keys3.slice(1).join("][")}]`, value3]);
    } else {
      out.push(parsed[i]);
    }
  }
  return make13(out);
};
var fromInputNested = (input) => {
  const entries3 = typeof input[Symbol.iterator] === "function" ? fromIterable(input) : Object.entries(input);
  const out = [];
  for (const [key, value3] of entries3) {
    if (Array.isArray(value3)) {
      for (let i = 0; i < value3.length; i++) {
        if (value3[i] !== void 0) {
          out.push([key, coerce(value3[i])]);
        }
      }
    } else if (value3 !== null && typeof value3 === "object" && !isRedacted(value3)) {
      const nested = fromInputNested(value3);
      for (const [k, v] of nested) {
        out.push([[key, ...typeof k === "string" ? [k] : k], v]);
      }
    } else if (value3 !== void 0) {
      out.push([key, coerce(value3)]);
    }
  }
  return out;
};
var coerce = (value3) => isRedacted(value3) ? value3 : String(value3);
var Equivalence6 = /* @__PURE__ */ make((a, b) => arrayEquivalence(a.params, b.params));
var arrayEquivalence = /* @__PURE__ */ makeEquivalence4(/* @__PURE__ */ makeEquivalence2([/* @__PURE__ */ strictEqual(), /* @__PURE__ */ asEquivalence()]));
var getFirst = /* @__PURE__ */ dual(2, (self, key) => findFirst2(self.params, ([k]) => k === key).pipe(map(([, value3]) => unwrap2(value3))));
var toRecord2 = (self) => {
  const out = {};
  for (const [k, v] of self.params) {
    const value3 = unwrap2(v);
    if (!Object.hasOwn(out, k)) {
      assignProperty(out, k, value3);
    } else {
      const current = out[k];
      if (typeof current === "string") {
        assignProperty(out, k, [current, value3]);
      } else {
        current.push(value3);
      }
    }
  }
  return out;
};
var toReadonlyRecord = toRecord2;
var redact3 = /* @__PURE__ */ dual(2, (self, key) => {
  const patterns = Array.isArray(key) ? key : [key];
  return self.params.map(([name, value3]) => [name, typeof value3 === "string" && isRedactedName2(name, patterns) ? make12(value3) : value3]);
});
var isRedactedName2 = isRedactedName;
var CurrentRedactedNames2 = /* @__PURE__ */ Reference("effect/http/UrlParams/CurrentRedactedNames", {
  defaultValue: () => ["AWSAccessKeyId", "Signature", "sig", "X-Goog-Signature"]
});

// node_modules/effect/dist/internal/graph.js
var TypeId20 = "~effect/Graph";
var isGraph = (u) => hasProperty(u, TypeId20);
var toImpl = (graph) => graph;
var edgeEquals = (type, self, that) => (type === "directed" ? self.source === that.source && self.target === that.target : self.source === that.source && self.target === that.target || self.source === that.target && self.target === that.source) && equals(self.data, that.data);
var edgeHash = (type, edge) => type === "directed" ? hash(edge) : optimize(combine(hash(edge.data), endpointsHash(edge.source, edge.target)));
var endpointsHash = (source, target) => combine(0, hash(source)) + combine(0, hash(target));
var graphSeed = /* @__PURE__ */ string("Graph");
var ProtoGraph = {
  [TypeId20]: {
    _N: (_) => _,
    _E: (_) => _
  },
  [Symbol.iterator]() {
    return this.nodes[Symbol.iterator]();
  },
  [NodeInspectSymbol]() {
    return this.toJSON();
  },
  [symbol2](that) {
    if (hasProperty(that, TypeId20)) {
      const thatImpl = toImpl(that);
      if (this.nodes.size !== thatImpl.nodes.size || this.edges.size !== thatImpl.edges.size || this.type !== thatImpl.type) {
        return false;
      }
      for (const [nodeIndex, nodeData] of this.nodes) {
        if (!thatImpl.nodes.has(nodeIndex) || !equals(nodeData, thatImpl.nodes.get(nodeIndex))) {
          return false;
        }
      }
      for (const [edgeIndex, edgeData] of this.edges) {
        const otherEdge = thatImpl.edges.get(edgeIndex);
        if (otherEdge === void 0 || !edgeEquals(this.type, edgeData, otherEdge)) {
          return false;
        }
      }
      return true;
    }
    return false;
  },
  [symbol]() {
    let hash2 = graphSeed;
    hash2 = hash2 ^ string(this.type);
    hash2 = hash2 ^ number(this.nodes.size);
    hash2 = hash2 ^ number(this.edges.size);
    for (const [nodeIndex, nodeData] of this.nodes) {
      hash2 ^= combine(hash(nodeIndex), hash(nodeData));
    }
    for (const [edgeIndex, edgeData] of this.edges) {
      hash2 ^= combine(hash(edgeIndex), edgeHash(this.type, edgeData));
    }
    return optimize(hash2);
  },
  toJSON() {
    return {
      _id: "Graph",
      nodeCount: this.nodes.size,
      edgeCount: this.edges.size,
      type: this.type
    };
  },
  toString() {
    return `Graph(${this.type}, ${this.nodes.size}, ${this.edges.size})`;
  },
  pipe() {
    return pipeArguments(this, arguments);
  }
};
var make14 = (type, mutable3) => {
  const graph = Object.create(ProtoGraph);
  graph.type = type;
  graph.mutable = mutable3;
  graph.transforming = false;
  graph.nodes = /* @__PURE__ */ new Map();
  graph.edges = /* @__PURE__ */ new Map();
  graph.adjacency = /* @__PURE__ */ new Map();
  graph.reverseAdjacency = /* @__PURE__ */ new Map();
  graph.nextNodeIndex = 0;
  graph.nextEdgeIndex = 0;
  graph.acyclic = some2(true);
  return graph;
};
var snapshot = (graph) => {
  const impl = toImpl(graph);
  return {
    type: graph.type,
    nodes: Array.from(impl.nodes, ([index2, data]) => ({
      index: index2,
      data
    })).sort((a, b) => a.index - b.index),
    edges: Array.from(impl.edges, ([index2, edge]) => ({
      index: index2,
      source: edge.source,
      target: edge.target,
      data: edge.data
    })).sort((a, b) => a.index - b.index)
  };
};
var hydrate = (snapshot4) => {
  const graph = make14(snapshot4.type, false);
  for (const node of snapshot4.nodes) {
    graph.nodes.set(node.index, node.data);
    graph.adjacency.set(node.index, []);
    graph.reverseAdjacency.set(node.index, []);
  }
  for (const edge of snapshot4.edges) {
    graph.edges.set(edge.index, {
      source: edge.source,
      target: edge.target,
      data: edge.data
    });
    graph.adjacency.get(edge.source).push(edge.index);
    graph.reverseAdjacency.get(edge.target).push(edge.index);
    if (snapshot4.type === "undirected") {
      graph.adjacency.get(edge.target).push(edge.index);
      graph.reverseAdjacency.get(edge.source).push(edge.index);
    }
  }
  graph.nextNodeIndex = snapshot4.nodes.length === 0 ? 0 : snapshot4.nodes[snapshot4.nodes.length - 1].index + 1;
  graph.nextEdgeIndex = snapshot4.edges.length === 0 ? 0 : snapshot4.edges[snapshot4.edges.length - 1].index + 1;
  graph.acyclic = none2();
  return graph;
};

// node_modules/effect/dist/internal/schema/annotations.js
function resolve(ast) {
  return ast.checks ? ast.checks[ast.checks.length - 1].annotations : ast.annotations;
}
function resolveAt(key) {
  return (ast) => resolve(ast)?.[key];
}
var STRUCTURAL_ANNOTATION_KEY = "~structural";
var IDENTIFIER_FALLBACK_KEY = "~identifier";
var SENTINELS_ANNOTATION_KEY = "~sentinels";
var CONSTRUCTOR_ANNOTATION_KEY = "~constructor";
var jsonSchemaAnnotationKeys = ["title", "description", "default", "examples", "readOnly", "writeOnly", "format", "contentEncoding", "contentMediaType", "contentSchema"];
var resolveIdentifier = /* @__PURE__ */ resolveAt("identifier");
var resolveIdentifierFallback = /* @__PURE__ */ resolveAt(IDENTIFIER_FALLBACK_KEY);
var resolveTitle = /* @__PURE__ */ resolveAt("title");
var getExpected = /* @__PURE__ */ memoize((ast) => {
  const identifier2 = resolve(ast)?.identifier;
  if (typeof identifier2 === "string") return identifier2;
  return ast.getExpected(getExpected);
});
var annotationExcludedKeys = /* @__PURE__ */ new Set([SENTINELS_ANNOTATION_KEY, STRUCTURAL_ANNOTATION_KEY, "representation", "arbitraryConstraint", "toJsonSchema", "toCode", "toEquivalence", "toFormatter", "toCodec", "toCodecJson", "toCodecStringTree", "toCodecIso", "toCodecArbitrary"]);

// node_modules/effect/dist/internal/schema/parser.js
var missing = /* @__PURE__ */ Symbol();
var succeed7 = succeed4;
var missingExit = /* @__PURE__ */ succeed7(missing);
var sameExit = /* @__PURE__ */ succeed7(missing);
var toOption = (value3) => value3 === missing ? none2() : some2(value3);
var fromOptionExit = (option3) => option3._tag === "None" ? missingExit : succeed7(option3.value);

// node_modules/effect/dist/SchemaIssue.js
var TypeId21 = "~effect/SchemaIssue/Issue";
function isIssue(u) {
  return hasProperty(u, TypeId21) && u[TypeId21] === TypeId21;
}
function hasInput(issue) {
  return Object.hasOwn(issue, "input");
}
var IssueNodeImpl = class {
  [TypeId21] = TypeId21;
  constructor(input, options) {
    if (options?.reportInput === true && input !== missing) {
      this.input = input;
    }
  }
};
var Filter = class extends IssueNodeImpl {
  _tag = "Filter";
  /**
   * The filter that failed.
   */
  filter;
  /**
   * The issue that occurred.
   */
  issue;
  constructor(filter8, issue, input, options) {
    super(input, options);
    this.filter = filter8;
    this.issue = issue;
  }
};
var Encoding = class extends IssueNodeImpl {
  _tag = "Encoding";
  /**
   * The schema that caused the issue.
   */
  ast;
  /**
   * The issue that occurred.
   */
  issue;
  constructor(ast, issue, input, options) {
    super(input, options);
    this.ast = ast;
    this.issue = issue;
  }
};
var Pointer = class extends IssueNodeImpl {
  _tag = "Pointer";
  /**
   * The path to the location in the input that caused the issue.
   */
  path;
  /**
   * The issue that occurred.
   */
  issue;
  constructor(path, issue) {
    super();
    this.path = path;
    this.issue = issue;
  }
};
var MissingKey = class extends IssueNodeImpl {
  _tag = "MissingKey";
  /**
   * The metadata for the issue.
   */
  annotations;
  constructor(annotations) {
    super();
    this.annotations = annotations;
  }
};
var UnexpectedKey = class extends IssueNodeImpl {
  _tag = "UnexpectedKey";
  /**
   * The schema that caused the issue.
   */
  ast;
  constructor(ast, input, options) {
    super(input, options);
    this.ast = ast;
  }
};
var Composite = class extends IssueNodeImpl {
  _tag = "Composite";
  /**
   * The schema that caused the issue.
   */
  ast;
  /**
   * The issues that occurred.
   */
  issues;
  constructor(ast, issues, input, options) {
    super(input, options);
    this.ast = ast;
    this.issues = issues;
  }
};
var InvalidType = class extends IssueNodeImpl {
  _tag = "InvalidType";
  /**
   * The schema that caused the issue.
   */
  ast;
  constructor(ast, input, options) {
    super(input, options);
    this.ast = ast;
  }
};
var InvalidValue = class extends IssueNodeImpl {
  _tag = "InvalidValue";
  /**
   * The metadata for the issue.
   */
  annotations;
  constructor(annotations, input, options) {
    super(input, options);
    this.annotations = annotations;
  }
};
function makeCompositeAtKey(compositeAst, pointerKey, pointerIssue, compositeInput, parseOptions) {
  return new Composite(compositeAst, [new Pointer([pointerKey], pointerIssue)], compositeInput, parseOptions);
}
var Forbidden = class extends IssueNodeImpl {
  _tag = "Forbidden";
  /**
   * The metadata for the issue.
   */
  annotations;
  constructor(annotations, input, options) {
    super(input, options);
    this.annotations = annotations;
  }
};
var AnyOf = class extends IssueNodeImpl {
  _tag = "AnyOf";
  /**
   * The schema that caused the issue.
   */
  ast;
  /**
   * The issues that occurred.
   */
  issues;
  constructor(ast, issues, input, options) {
    super(input, options);
    this.ast = ast;
    this.issues = issues;
  }
};
var OneOf = class extends IssueNodeImpl {
  _tag = "OneOf";
  /**
   * The schema that caused the issue.
   */
  ast;
  /**
   * The schemas that were successful.
   */
  successes;
  constructor(ast, successes, input, options) {
    super(input, options);
    this.ast = ast;
    this.successes = successes;
  }
};
function makeFilterIssue(entry, input, options) {
  if (isIssue(entry)) {
    return entry;
  }
  if (typeof entry === "string") {
    return new InvalidValue({
      message: entry
    }, input, options);
  }
  const inner = typeof entry.issue === "string" ? new InvalidValue({
    message: entry.issue
  }, input, options) : entry.issue;
  return new Pointer(entry.path, inner);
}
function makeSingle(out, input, options) {
  if (out === void 0) {
    return void 0;
  }
  if (typeof out === "boolean") {
    return out ? void 0 : new InvalidValue(void 0, input, options);
  }
  return makeFilterIssue(out, input, options);
}
function normalizeFilterOutput(ast, out, input, options) {
  if (Array.isArray(out)) {
    if (!isReadonlyArrayNonEmpty(out)) {
      return void 0;
    }
    return out.length === 1 ? makeFilterIssue(out[0], input, options) : new Composite(ast, map4(out, (entry) => makeFilterIssue(entry, input, options)), input, options);
  }
  return makeSingle(out, input, options);
}
var defaultLeafHook = (issue) => {
  const message = findMessage(issue);
  if (message !== void 0) return message;
  switch (issue._tag) {
    case "InvalidType":
      return getExpectedMessage(getExpected(issue.ast), issue);
    case "InvalidValue": {
      const expected = findExpected(issue);
      if (expected !== void 0) return getExpectedMessage(expected, issue);
      const input = formatInput(issue);
      return input === void 0 ? "Expected a valid value" : `Invalid data ${input}`;
    }
    case "MissingKey":
      return "Missing key";
    case "UnexpectedKey": {
      const input = formatInput(issue);
      return input === void 0 ? "Expected no excess property" : `Unexpected key with value ${input}`;
    }
    case "Forbidden":
      return "Forbidden operation";
    case "OneOf": {
      const input = formatInput(issue);
      return input === void 0 ? "Expected exactly one member to match" : `Expected exactly one member to match the input ${input}`;
    }
  }
};
var defaultCheckHook = (issue) => findMessage(issue.issue) ?? findMessage(issue);
function makeFormatterStandardSchemaV1(options) {
  return (issue) => ({
    issues: toDefaultIssues(issue, [], options?.leafHook ?? defaultLeafHook, options?.checkHook ?? defaultCheckHook)
  });
}
function formatInput(issue) {
  return hasInput(issue) ? format(issue.input) : void 0;
}
function findExpected(issue) {
  const expected = issue.annotations?.expected;
  return typeof expected === "string" ? expected : void 0;
}
function getExpectedMessage(expected, issue) {
  const input = formatInput(issue);
  return input === void 0 ? `Expected ${expected}` : `Expected ${expected}, got ${input}`;
}
function toDefaultIssues(issue, path, leafHook, checkHook) {
  switch (issue._tag) {
    case "Filter": {
      const message = checkHook(issue);
      if (message !== void 0) {
        return [{
          path,
          message
        }];
      }
      if (issue.issue._tag !== "InvalidValue") {
        return toDefaultIssues(issue.issue, path, leafHook, checkHook);
      }
      const expected = findExpected(issue.issue);
      return [{
        path,
        message: expected === void 0 ? getExpectedMessage(formatCheck(issue.filter), issue) : getExpectedMessage(expected, issue.issue)
      }];
    }
    case "Encoding":
      return toDefaultIssues(issue.issue, path, leafHook, checkHook);
    case "Pointer":
      return toDefaultIssues(issue.issue, [...path, ...issue.path], leafHook, checkHook);
    case "Composite":
      return issue.issues.flatMap((issue2) => toDefaultIssues(issue2, path, leafHook, checkHook));
    case "AnyOf": {
      if (issue.issues.length === 0) {
        return [{
          path,
          message: findMessage(issue) ?? getExpectedMessage(getExpected(issue.ast), issue)
        }];
      }
      return issue.issues.flatMap((issue2) => toDefaultIssues(issue2, path, leafHook, checkHook));
    }
    default:
      return [{
        path,
        message: leafHook(issue)
      }];
  }
}
function formatCheck(check2) {
  const expected = check2.annotations?.expected;
  if (typeof expected === "string") return expected;
  switch (check2._tag) {
    case "Filter":
      return "<filter>";
    case "FilterGroup":
      return check2.checks.map((check3) => formatCheck(check3)).join(" & ");
  }
}
function makeFormatterDefault() {
  return (issue) => formatIssue(issue, "");
}
var defaultFormatter = /* @__PURE__ */ makeFormatterDefault();
function formatIssue(issue, path) {
  let message;
  switch (issue._tag) {
    case "Filter": {
      const annotated = defaultCheckHook(issue);
      if (annotated !== void 0) {
        message = annotated;
      } else {
        if (issue.issue._tag !== "InvalidValue") {
          return formatIssue(issue.issue, path);
        }
        const expected = findExpected(issue.issue);
        message = expected === void 0 ? getExpectedMessage(formatCheck(issue.filter), issue) : getExpectedMessage(expected, issue.issue);
      }
      break;
    }
    case "Encoding":
      return formatIssue(issue.issue, path);
    case "Pointer":
      return formatIssue(issue.issue, path + formatPath(issue.path));
    case "Composite":
    case "AnyOf": {
      if (issue._tag === "Composite" || issue.issues.length > 0) {
        return issue.issues.map((issue2) => formatIssue(issue2, path)).join("\n");
      }
      message = findMessage(issue) ?? getExpectedMessage(getExpected(issue.ast), issue);
      break;
    }
    default:
      message = defaultLeafHook(issue);
      break;
  }
  return path ? `${message}
  at ${path}` : message;
}
function findMessage(issue) {
  if (issue._tag === "Pointer") return;
  if (issue._tag === "Encoding") return findMessage(issue.issue);
  const annotations = issue._tag === "Filter" ? issue.filter.annotations : "annotations" in issue ? issue.annotations : issue.ast.annotations;
  const message = annotations?.[issue._tag === "MissingKey" ? "messageMissingKey" : issue._tag === "UnexpectedKey" ? "messageUnexpectedKey" : "message"];
  if (typeof message === "string") return message;
}

// node_modules/effect/dist/internal/schema/cause.js
function getSchemaIssue(cause) {
  let issue;
  for (const reason of cause.reasons) {
    if (!isFailReason2(reason) || !isIssue(reason.error)) {
      return void 0;
    }
    issue ??= reason.error;
  }
  return issue;
}
function getSchemaIssueOrThrow(cause, message) {
  const issue = getSchemaIssue(cause);
  if (issue === void 0) {
    throw new Error(message, {
      cause
    });
  }
  return issue;
}

// node_modules/effect/dist/encoding/Base64Url.js
var encode3 = (input) => encode2(input).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
var decode3 = (str) => {
  const stripped = str.replace(/[\n\r]/g, "");
  const length = stripped.length;
  if (length % 4 === 1) {
    return fail2(new EncodingError({
      module: "Base64Url",
      kind: "Decode",
      input: stripped,
      message: `Length should be a multiple of 4, but is ${length}`
    }));
  }
  if (!/^[-_A-Z0-9]*?={0,2}$/i.test(stripped)) {
    return fail2(new EncodingError({
      module: "Base64Url",
      kind: "Decode",
      input: stripped,
      message: "Invalid input"
    }));
  }
  let sanitized = length % 4 === 2 ? `${stripped}==` : length % 4 === 3 ? `${stripped}=` : stripped;
  sanitized = sanitized.replace(/-/g, "+").replace(/_/g, "/");
  return decode2(sanitized);
};
var decodeString3 = (str) => map2(decode3(str), (_) => decoder3.decode(_));
var decoder3 = /* @__PURE__ */ new TextDecoder();

// node_modules/effect/dist/SchemaGetter.js
var makeGetter = (fields) => Object.assign(Object.create(Prototype), fields);
function fail6(f) {
  return transformOptionalEffect((oe, options) => fail5(f(oe, options)));
}
function forbidden(message) {
  return fail6((oe, options) => {
    const annotations = {
      message: message(oe)
    };
    return isSome2(oe) ? new Forbidden(annotations, oe.value, options) : new Forbidden(annotations);
  });
}
var forbiddenEncoding = /* @__PURE__ */ forbidden(() => "Encoding is not supported");
var passthrough_ = /* @__PURE__ */ makeGetter({
  _tag: "Passthrough"
});
function passthrough2() {
  return passthrough_;
}
function transform(f) {
  return makeGetter({
    _tag: "Transform",
    transform: f
  });
}
function transformEffect(f) {
  return makeGetter({
    _tag: "TransformEffect",
    transform: f
  });
}
function transformOptional(f) {
  return makeGetter({
    _tag: "TransformOptional",
    transform: f
  });
}
function transformOptionalEffect(f) {
  return makeGetter({
    _tag: "TransformOptionalEffect",
    transform: f
  });
}
function omit2() {
  return transformOptional(() => none2());
}
function withDefault(defaultValue) {
  return transformOptionalEffect((o) => {
    const filtered = filter(o, isNotUndefined);
    return isSome2(filtered) ? succeed6(filtered) : mapEager2(defaultValue, some2);
  });
}
function String4() {
  return transform(globalThis.String);
}
function Number4() {
  return transform(globalThis.Number);
}
function BigInt4() {
  return transform(globalThis.BigInt);
}
function Date3() {
  return transform((u) => new globalThis.Date(u));
}
function trim2() {
  return transform(trim);
}
function parseJson(options) {
  return transformEffect((input, parseOptions) => try_3({
    try: () => JSON.parse(input, options?.reviver),
    catch: () => new InvalidValue({
      expected: "a valid JSON string"
    }, input, parseOptions)
  }));
}
function stringifyJson(options) {
  return transformEffect((input, parseOptions) => try_3({
    try: () => {
      const output = JSON.stringify(input, options?.replacer, options?.space);
      if (output === void 0) {
        throw new TypeError("Value cannot be represented as JSON");
      }
      return output;
    },
    catch: () => new InvalidValue({
      expected: "a JSON-serializable value"
    }, input, parseOptions)
  }));
}
function encodeBase64() {
  return transform(encode2);
}
function encodeBase64Url() {
  return transform(encode3);
}
function encodeHex() {
  return transform(encode);
}
function decodeBase64() {
  return transformEffect((input, options) => mapErrorEager2(fromResult2(decode2(input)), () => new InvalidValue({
    expected: "a valid Base64 string"
  }, input, options)));
}
function decodeBase64String() {
  return transformEffect((input, options) => match2(decodeString2(input), {
    onFailure: () => fail5(new InvalidValue({
      expected: "a valid Base64 string"
    }, input, options)),
    onSuccess: succeed6
  }));
}
function decodeBase64Url() {
  return transformEffect((input, options) => match2(decode3(input), {
    onFailure: () => fail5(new InvalidValue({
      expected: "a valid Base64Url string"
    }, input, options)),
    onSuccess: succeed6
  }));
}
function decodeBase64UrlString() {
  return transformEffect((input, options) => match2(decodeString3(input), {
    onFailure: () => fail5(new InvalidValue({
      expected: "a valid Base64Url string"
    }, input, options)),
    onSuccess: succeed6
  }));
}
function decodeHex() {
  return transformEffect((input, options) => match2(decode(input), {
    onFailure: () => fail5(new InvalidValue({
      expected: "a valid hexadecimal string"
    }, input, options)),
    onSuccess: succeed6
  }));
}
function decodeHexString() {
  return transformEffect((input, options) => match2(decodeString(input), {
    onFailure: () => fail5(new InvalidValue({
      expected: "a valid hexadecimal string"
    }, input, options)),
    onSuccess: succeed6
  }));
}
function encodeUriComponent() {
  return transform(encodeURIComponent);
}
function decodeUriComponent() {
  return transformEffect((input, options) => {
    try {
      return succeed6(globalThis.decodeURIComponent(input));
    } catch {
      return fail5(new InvalidValue({
        expected: "a valid URI component"
      }, input, options));
    }
  });
}
function decodeFormData() {
  return transform((input) => makeTreeRecord(Array.from(input.entries())));
}
var collectFormDataEntries = /* @__PURE__ */ collectBracketPathEntries((value3) => typeof value3 === "string" || typeof Blob !== "undefined" && value3 instanceof Blob);
function encodeFormData() {
  return transform((input) => {
    const out = new FormData();
    if (typeof input === "object" && input !== null) {
      const entries3 = collectFormDataEntries(input);
      entries3.forEach(([key, value3]) => {
        out.append(key, value3);
      });
    }
    return out;
  });
}
function decodeURLSearchParams() {
  return transform((input) => makeTreeRecord(Array.from(input.entries())));
}
var collectURLSearchParamsEntries = /* @__PURE__ */ collectBracketPathEntries(isString);
function encodeURLSearchParams() {
  return transform((input) => {
    if (typeof input === "object" && input !== null) {
      return new URLSearchParams(collectURLSearchParamsEntries(input));
    }
    return new URLSearchParams();
  });
}
function bracketPathToTokens(bracketPath) {
  if (bracketPath === "") {
    return [""];
  }
  const replaced = bracketPath.replace(/\[(.*?)\]/g, ".$1");
  const parts2 = replaced.split(".");
  const start = replaced.startsWith(".") ? 1 : 0;
  return parts2.slice(start).map((part) => isCanonicalArrayIndex(part) ? globalThis.Number(part) : part);
}
var MAX_ARRAY_HOLES = 20;
function makeTreeRecord(bracketPathEntries) {
  const out = {};
  const containers = /* @__PURE__ */ new WeakSet();
  const duplicates = /* @__PURE__ */ new WeakSet();
  const indexed = /* @__PURE__ */ new Map();
  bracketPathEntries.forEach(([key, value3]) => {
    const tokens = bracketPathToTokens(key);
    let cur = out;
    for (let i = 0; i < tokens.length; i++) {
      const state = indexed.get(cur);
      const token = tokens[i] === "" && state !== void 0 ? state.length : tokens[i];
      if (state !== void 0 && typeof token === "number") {
        state.length = Math.max(state.length, token + 1);
      }
      const hasOwn = Object.hasOwn(cur, token);
      const current = hasOwn ? cur[token] : void 0;
      if (i === tokens.length - 1) {
        const currentState = indexed.get(current);
        if (currentState !== void 0) {
          assignProperty(current, currentState.length++, value3);
        } else if (duplicates.has(current)) {
          current.push(value3);
        } else if (hasOwn) {
          const values2 = [current, value3];
          duplicates.add(values2);
          assignProperty(cur, token, values2);
        } else {
          assignProperty(cur, token, value3);
        }
      } else {
        const next = tokens[i + 1];
        const shouldBeArray = typeof next === "number" || next === "";
        if (containers.has(current) && indexed.has(current) === shouldBeArray) {
          cur = current;
        } else {
          const container = {};
          containers.add(container);
          if (shouldBeArray) {
            indexed.set(container, {
              parent: cur,
              key: token,
              length: 0
            });
          }
          assignProperty(cur, token, container);
          cur = container;
        }
      }
    }
  });
  for (const [builder, {
    key,
    length,
    parent
  }] of Array.from(indexed).reverse()) {
    if (parent[key] === builder && length - Object.keys(builder).length <= MAX_ARRAY_HOLES) {
      assignProperty(parent, key, Object.assign(new Array(length), builder));
    }
  }
  return out;
}
function collectBracketPathEntries(isLeaf) {
  return (input) => {
    const bracketPathEntries = [];
    function append3(key, value3) {
      if (isLeaf(value3)) {
        bracketPathEntries.push([key, value3]);
      } else if (Array.isArray(value3)) {
        const allLeaves = value3.every(isLeaf);
        if (allLeaves) {
          value3.forEach((v) => {
            bracketPathEntries.push([key, v]);
          });
        } else {
          value3.forEach((v, i) => {
            append3(`${key}[${i}]`, v);
          });
        }
      } else if (typeof value3 === "object" && value3 !== null) {
        for (const [k, v] of Object.entries(value3)) {
          append3(`${key}[${k}]`, v);
        }
      }
    }
    for (const [key, value3] of Object.entries(input)) {
      append3(key, value3);
    }
    return bracketPathEntries;
  };
}

// node_modules/effect/dist/SchemaTransformation.js
var Middleware = class extends Class {
  _tag = "Middleware";
  decode;
  encode;
  constructor(decode6, encode5) {
    super();
    this.decode = decode6;
    this.encode = encode5;
  }
  flip() {
    return new Middleware(this.encode, this.decode);
  }
};
var TypeId22 = "~effect/SchemaTransformation/Transformation";
var Transformation = class extends Class {
  [TypeId22] = TypeId22;
  _tag = "Transformation";
  decode;
  encode;
  constructor(decode6, encode5) {
    super();
    this.decode = decode6;
    this.encode = encode5;
  }
  flip() {
    return new Transformation(this.encode, this.decode);
  }
};
function isTransformation(u) {
  return hasProperty(u, TypeId22) && u[TypeId22] === TypeId22;
}
var makeTransformation = (options) => {
  if (isTransformation(options)) {
    return options;
  }
  return new Transformation(options.decode, options.encode);
};
function transformEffect2(options) {
  return new Transformation(transformEffect(options.decode), transformEffect(options.encode));
}
function transform2(options) {
  return new Transformation(transform(options.decode), transform(options.encode));
}
function transformOptional2(options) {
  return new Transformation(transformOptional(options.decode), transformOptional(options.encode));
}
function trim3() {
  return new Transformation(trim2(), passthrough2());
}
var passthrough_2 = /* @__PURE__ */ new Transformation(/* @__PURE__ */ passthrough2(), /* @__PURE__ */ passthrough2());
function passthrough3() {
  return passthrough_2;
}
var numberFromString = /* @__PURE__ */ new Transformation(/* @__PURE__ */ Number4(), /* @__PURE__ */ String4());
var bigintFromString = /* @__PURE__ */ new Transformation(/* @__PURE__ */ BigInt4(), /* @__PURE__ */ String4());
var dateFromString = /* @__PURE__ */ new Transformation(/* @__PURE__ */ Date3(), /* @__PURE__ */ transform(formatDate));
var dateFromMillis = /* @__PURE__ */ new Transformation(/* @__PURE__ */ Date3(), /* @__PURE__ */ transform((date) => date.getTime()));
var byteSizeFromString = /* @__PURE__ */ transformEffect2({
  decode: (input, options) => match(fromString2(input), {
    onNone: () => fail5(new InvalidValue({
      expected: "a valid ByteSize string"
    }, input, options)),
    onSome: succeed6
  }),
  encode: (byteSize) => succeed6(`${byteSize} ${byteSize === BigInt(1) ? "byte" : "bytes"}`)
});
var byteSizeFromBigInt = /* @__PURE__ */ transformEffect2({
  decode: (input, options) => match(fromInput2(input), {
    onNone: () => fail5(new InvalidValue({
      expected: "a non-negative bigint byte count"
    }, input, options)),
    onSome: succeed6
  }),
  encode: (byteSize) => succeed6(toBigInt(byteSize))
});
var byteSizeFromNumber = /* @__PURE__ */ transformEffect2({
  decode: (input, options) => match(fromInput2(input), {
    onNone: () => fail5(new InvalidValue({
      expected: "a non-negative safe-integer byte count"
    }, input, options)),
    onSome: succeed6
  }),
  encode: (byteSize, options) => match(toNumber2(byteSize), {
    onNone: () => fail5(new InvalidValue({
      expected: "a ByteSize representable as a safe integer"
    }, byteSize, options)),
    onSome: succeed6
  })
});
var isJsonError = (input) => isObject(input) && typeof input["message"] === "string";
var decodeJsonError = (input) => {
  const hasCause = Object.hasOwn(input, "cause");
  const err = hasCause ? new Error(input.message, {
    cause: decodeDefect(input.cause)
  }) : new Error(input.message);
  if (typeof input.name === "string" && input.name !== "Error") err.name = input.name;
  if (typeof input.stack === "string") err.stack = input.stack;
  return err;
};
var encodeUnknownAsJson = (input) => {
  try {
    const json = formatJson(input);
    return json === void 0 ? format(input) : JSON.parse(json);
  } catch {
    return format(input);
  }
};
var encodeJsonError = (input, options, encodeDefect) => {
  const encoded = {
    name: input.name,
    message: typeof input.message === "string" ? input.message : ""
  };
  if (options?.includeStack && typeof input.stack === "string") {
    encoded.stack = input.stack;
  }
  if (!options?.excludeCause && input.cause !== void 0) {
    encoded.cause = encodeDefect(input.cause);
  }
  return encoded;
};
var makeEncodeDefect = (options) => {
  const seen = /* @__PURE__ */ new WeakSet();
  const encode5 = (input) => {
    if (isError(input)) {
      if (seen.has(input)) {
        return "[Circular]";
      }
      seen.add(input);
      const encoded = encodeJsonError(input, options, encode5);
      seen.delete(input);
      return encoded;
    }
    return encodeUnknownAsJson(input);
  };
  return encode5;
};
var decodeDefect = (input) => isJsonError(input) ? decodeJsonError(input) : input;
var errorFromJsonError = (options) => transform2({
  decode: decodeJsonError,
  encode: (input) => makeEncodeDefect(options)(input)
});
var defectFromJson = (options) => transform2({
  decode: decodeDefect,
  encode: makeEncodeDefect(options)
});
function optionFromNullOr() {
  return transform2({
    decode: fromNullOr,
    encode: getOrNull
  });
}
function optionFromUndefinedOr() {
  return transform2({
    decode: fromUndefinedOr,
    encode: getOrUndefined
  });
}
function optionFromNullishOr(options) {
  return transform2({
    decode: fromNullishOr,
    encode: options?.onNoneEncoding === null ? getOrNull : getOrUndefined
  });
}
function optionFromOptionalKey() {
  return transformOptional2({
    decode: some2,
    encode: flatten
  });
}
function optionFromOptional() {
  return transformOptional2({
    decode: (ot) => ot.pipe(filter(isNotUndefined), some2),
    encode: flatten
  });
}
var urlFromString = /* @__PURE__ */ transformEffect2({
  decode: (s, options) => URL.canParse(s) ? succeed6(new URL(s)) : fail5(new InvalidValue({
    expected: "a valid URL string"
  }, s, options)),
  encode: (url) => succeed6(url.href)
});
var uint8ArrayFromBase64String = /* @__PURE__ */ new Transformation(/* @__PURE__ */ decodeBase64(), /* @__PURE__ */ encodeBase64());
var stringFromBase64String = /* @__PURE__ */ new Transformation(/* @__PURE__ */ decodeBase64String(), /* @__PURE__ */ encodeBase64());
var stringFromBase64UrlString = /* @__PURE__ */ new Transformation(/* @__PURE__ */ decodeBase64UrlString(), /* @__PURE__ */ encodeBase64Url());
var stringFromHexString = /* @__PURE__ */ new Transformation(/* @__PURE__ */ decodeHexString(), /* @__PURE__ */ encodeHex());
var stringFromUriComponent = /* @__PURE__ */ new Transformation(/* @__PURE__ */ decodeUriComponent(), /* @__PURE__ */ encodeUriComponent());
function fromJsonString(options) {
  return new Transformation(parseJson(options ?? {}), stringifyJson(options));
}
var fromFormData = /* @__PURE__ */ new Transformation(/* @__PURE__ */ decodeFormData(), /* @__PURE__ */ encodeFormData());
var fromURLSearchParams = /* @__PURE__ */ new Transformation(/* @__PURE__ */ decodeURLSearchParams(), /* @__PURE__ */ encodeURLSearchParams());

// node_modules/effect/dist/SchemaAST.js
function makeGuard(tag2) {
  return (ast) => ast._tag === tag2;
}
var isDeclaration = /* @__PURE__ */ makeGuard("Declaration");
var isNever2 = /* @__PURE__ */ makeGuard("Never");
var isLiteral = /* @__PURE__ */ makeGuard("Literal");
var isUniqueSymbol = /* @__PURE__ */ makeGuard("UniqueSymbol");
var isArrays = /* @__PURE__ */ makeGuard("Arrays");
var isObjects = /* @__PURE__ */ makeGuard("Objects");
var isUnion = /* @__PURE__ */ makeGuard("Union");
var isSuspend = /* @__PURE__ */ makeGuard("Suspend");
var Link = class {
  to;
  transformation;
  constructor(to, transformation) {
    this.to = to;
    this.transformation = transformation;
  }
};
var defaultParseOptions = {};
var Context = class {
  isOptional;
  isMutable;
  /** Used for constructor default values (e.g. `withConstructorDefault` API) */
  constructorDefault;
  annotations;
  constructor(isOptional3, isMutable2, constructorDefault = void 0, annotations = void 0) {
    this.isOptional = isOptional3;
    this.isMutable = isMutable2;
    this.constructorDefault = constructorDefault;
    this.annotations = annotations;
  }
};
var TypeId23 = "~effect/Schema";
var ASTNodeImpl = class {
  [TypeId23] = TypeId23;
  annotations;
  checks;
  encoding;
  context;
  constructor(annotations = void 0, checks = void 0, encoding = void 0, context3 = void 0) {
    this.annotations = annotations;
    this.checks = checks;
    this.encoding = encoding;
    this.context = context3;
  }
  toString() {
    return `<${this._tag}>`;
  }
};
var Declaration = class extends ASTNodeImpl {
  _tag = "Declaration";
  typeParameters;
  run;
  encodingChecks;
  /**
   * Parser factory {@link flip} swaps in, so a declaration can behave
   * differently when encoding. `undefined` reuses `run`.
   */
  encodingRun;
  constructor(typeParameters, run2, annotations, checks, encoding, context3, encodingChecks, encodingRun) {
    super(annotations, checks, encoding, context3);
    this.typeParameters = typeParameters;
    this.run = run2;
    this.encodingChecks = encodingChecks;
    this.encodingRun = encodingRun;
  }
  /** @internal */
  getParser() {
    let run2;
    return (input, options) => {
      if (input === missing) return missingExit;
      return (run2 ??= this.run(this.typeParameters))(input, this, options);
    };
  }
  _rebuild(recur2, checks, encodingChecks, run2, encodingRun) {
    const tps = mapOrSame(this.typeParameters, recur2);
    return tps === this.typeParameters && checks === this.checks && encodingChecks === this.encodingChecks && run2 === this.run && encodingRun === this.encodingRun ? this : new Declaration(tps, run2, this.annotations, checks, void 0, this.context, encodingChecks, encodingRun);
  }
  /** @internal */
  recur(recur2) {
    return this._rebuild(recur2, this.checks, this.encodingChecks, this.run, this.encodingRun);
  }
  /** @internal */
  flip(recur2) {
    return this._rebuild(recur2, this.encodingChecks, this.checks, this.encodingRun ?? this.run, this.run);
  }
  /** @internal */
  getExpected() {
    const expected = this.annotations?.expected;
    if (typeof expected === "string") return expected;
    return "<Declaration>";
  }
};
var Null = class extends ASTNodeImpl {
  _tag = "Null";
  /** @internal */
  getParser() {
    return fromConst(this, null);
  }
  /** @internal */
  getExpected() {
    return "null";
  }
};
var null_ = /* @__PURE__ */ new Null();
var Undefined = class extends ASTNodeImpl {
  _tag = "Undefined";
  /** @internal */
  getParser() {
    return fromConst(this, void 0);
  }
  /** @internal */
  toCodecJson() {
    return replaceEncoding(this, [undefinedToNull]);
  }
  /** @internal */
  getExpected() {
    return "undefined";
  }
};
var undefinedToNull = /* @__PURE__ */ new Link(null_, /* @__PURE__ */ new Transformation(/* @__PURE__ */ transform(() => void 0), /* @__PURE__ */ transform(() => null)));
var undefined_3 = /* @__PURE__ */ new Undefined();
var Void = class extends ASTNodeImpl {
  _tag = "Void";
  /** @internal */
  getParser() {
    const succeed8 = succeed7(void 0);
    return (input) => input === missing ? missingExit : succeed8;
  }
  /** @internal */
  toCodecJson() {
    return replaceEncoding(this, [undefinedToNull]);
  }
  /** @internal */
  getExpected() {
    return "void";
  }
};
var void_5 = /* @__PURE__ */ new Void();
var Never = class extends ASTNodeImpl {
  _tag = "Never";
  /** @internal */
  getParser() {
    return fromRefinement(this, isNever);
  }
  /** @internal */
  getExpected() {
    return "never";
  }
};
var never3 = /* @__PURE__ */ new Never();
var Any = class extends ASTNodeImpl {
  _tag = "Any";
  /** @internal */
  getParser() {
    return fromRefinement(this, isUnknown);
  }
  /** @internal */
  getExpected() {
    return "any";
  }
};
var any = /* @__PURE__ */ new Any();
var Unknown = class extends ASTNodeImpl {
  _tag = "Unknown";
  /** @internal */
  getParser() {
    return fromRefinement(this, isUnknown);
  }
  /** @internal */
  getExpected() {
    return "unknown";
  }
};
var unknown = /* @__PURE__ */ new Unknown();
var ObjectKeyword = class extends ASTNodeImpl {
  _tag = "ObjectKeyword";
  /** @internal */
  getParser() {
    return fromRefinement(this, isObjectKeyword);
  }
  /** @internal */
  getExpected() {
    return "object | array | function";
  }
};
var objectKeyword = /* @__PURE__ */ new ObjectKeyword();
var Enum = class extends ASTNodeImpl {
  _tag = "Enum";
  enums;
  constructor(enums, annotations, checks, encoding, context3) {
    super(annotations, checks, encoding, context3);
    for (const [, value3] of enums) {
      if (typeof value3 === "number" && !globalThis.Number.isFinite(value3)) {
        throw new Error(`A numeric enum value must be finite, got ${format(value3)}`);
      }
    }
    this.enums = enums;
  }
  /** @internal */
  getParser() {
    const values2 = new Set(this.enums.map(([, v]) => v));
    return fromRefinement(this, (input) => values2.has(input));
  }
  /** @internal */
  toCodecStringTree() {
    if (this.enums.some(([_, v]) => typeof v === "number")) {
      const coercions = Object.fromEntries(this.enums.map(([_, v]) => [globalThis.String(v), v]));
      return replaceEncoding(this, [new Link(new Union(Object.keys(coercions).map((k) => new Literal(k))), new Transformation(transform((s) => coercions[s]), String4()))]);
    }
    return this;
  }
  /** @internal */
  getExpected() {
    return this.enums.map(([_, value3]) => JSON.stringify(value3)).join(" | ");
  }
};
function formatTemplateLiteralPath(path) {
  return typeof path === "number" ? `parts[${path}]` : path;
}
function isTemplateLiteralPart(ast, path, validated) {
  if (validated.has(ast)) return true;
  if (ast.encoding) {
    throw new Error(`TemplateLiteral parts cannot have an encoding at ${formatTemplateLiteralPath(path)}`);
  }
  let valid;
  switch (ast._tag) {
    case "String":
    case "Number":
    case "BigInt":
      valid = true;
      break;
    case "Literal":
      valid = !ast.checks;
      break;
    case "TemplateLiteral": {
      const currentPath = formatTemplateLiteralPath(path);
      valid = !ast.checks && ast.parts.every((part, index2) => isTemplateLiteralPart(part, `${currentPath}.parts[${index2}]`, validated));
      break;
    }
    case "Union": {
      const currentPath = formatTemplateLiteralPath(path);
      valid = !ast.checks && ast.types.every((part, index2) => isTemplateLiteralPart(part, `${currentPath}.types[${index2}]`, validated));
      break;
    }
    default:
      return false;
  }
  if (valid) validated.add(ast);
  return valid;
}
var TemplateLiteral = class extends ASTNodeImpl {
  _tag = "TemplateLiteral";
  parts;
  /** @internal */
  encodedParts;
  /** @internal */
  literals;
  /** @internal */
  suffixLengths;
  constructor(parts2, annotations, checks, encoding, context3) {
    super(annotations, checks, encoding, context3);
    const encodedParts = [];
    const literals = [];
    const validated = /* @__PURE__ */ new Set();
    for (let index2 = 0; index2 < parts2.length; index2++) {
      const part = parts2[index2];
      if (!isTemplateLiteralPart(part, index2, validated)) {
        throw new Error(`Invalid TemplateLiteral part ${part._tag}`);
      }
      encodedParts.push(part);
      literals.push(part._tag === "Literal" ? globalThis.String(part.literal) : void 0);
    }
    const suffixLengths = new Array(encodedParts.length + 1);
    suffixLengths[encodedParts.length] = 0;
    for (let i = encodedParts.length - 1; i >= 0; i--) {
      suffixLengths[i] = suffixLengths[i + 1] + (literals[i]?.length ?? 0);
    }
    this.parts = parts2;
    this.encodedParts = encodedParts;
    this.literals = literals;
    this.suffixLengths = suffixLengths;
  }
  /** @internal */
  getParser(compile2) {
    const tuple2 = new Arrays(false, this.parts.map(partFromString), []);
    const parser = compile2(decodeTo(string2, tuple2, templateLiteralTransformation(this)));
    return (input, options) => {
      if (input === missing) return missingExit;
      const result3 = parser(input, options);
      if (result3._tag === "Success") {
        return sameExit;
      }
      return mapBothEager2(result3, {
        onSuccess: () => input,
        onFailure: (issue) => new Composite(this, [issue], input, options)
      });
    };
  }
  /** @internal */
  getExpected() {
    return "string";
  }
  /** @internal */
  matchPart(s, options) {
    return segmentTemplateLiteralParts(this, s, options) === void 0 ? void 0 : s;
  }
};
function templateLiteralParser(parts2) {
  const normalize3 = memoize((encoded) => {
    if (encoded._tag !== "Union") return encoded;
    const types = mapOrSame(encoded.types, normalize3);
    return (encoded.options?.mode ?? "anyOf") === "anyOf" && types === encoded.types ? encoded : new Union(types, encoded.options === void 0 ? void 0 : {
      ...encoded.options,
      mode: "anyOf"
    }, encoded.annotations, encoded.checks, void 0, encoded.context);
  });
  const template = new TemplateLiteral(parts2.map((part) => normalize3(toEncoded(part))));
  const tuple2 = new Arrays(false, parts2.map(partFromString), []);
  return decodeTo(template, tuple2, templateLiteralTransformation(template));
}
function templateLiteralTransformation(template) {
  return new Transformation(transformEffect((s, options) => {
    const segments = segmentTemplateLiteralParts(template, s, options);
    if (segments) return succeed6(segments);
    return fail5(new InvalidValue({
      expected: "a string matching template literal parts"
    }, s, options));
  }), transform((parts2) => parts2.join("")));
}
var UniqueSymbol = class extends ASTNodeImpl {
  _tag = "UniqueSymbol";
  symbol;
  constructor(symbol4, annotations, checks, encoding, context3) {
    super(annotations, checks, encoding, context3);
    this.symbol = symbol4;
  }
  /** @internal */
  getParser() {
    return fromConst(this, this.symbol);
  }
  /** @internal */
  toCodecStringTree() {
    const key = globalThis.Symbol.keyFor(this.symbol);
    return replaceEncoding(this, [new Link(key === void 0 ? never3 : new Literal(globalThis.String(this.symbol)), symbolToString.transformation)]);
  }
  /** @internal */
  getExpected() {
    return globalThis.String(this.symbol);
  }
};
var Literal = class extends ASTNodeImpl {
  _tag = "Literal";
  literal;
  constructor(literal, annotations, checks, encoding, context3) {
    super(annotations, checks, encoding, context3);
    if (typeof literal === "number" && !globalThis.Number.isFinite(literal)) {
      throw new Error(`A numeric literal must be finite, got ${format(literal)}`);
    }
    this.literal = literal;
  }
  /** @internal */
  getParser() {
    return fromConst(this, this.literal);
  }
  /** @internal */
  matchPart(s, _options) {
    return s === globalThis.String(this.literal) ? this.literal : void 0;
  }
  /** @internal */
  toCodecJson() {
    return typeof this.literal === "bigint" ? literalToString(this) : this;
  }
  /** @internal */
  toCodecStringTree() {
    return typeof this.literal === "string" ? this : literalToString(this);
  }
  /** @internal */
  getExpected() {
    return typeof this.literal === "string" ? JSON.stringify(this.literal) : globalThis.String(this.literal);
  }
};
function literalToString(ast) {
  const literalAsString = globalThis.String(ast.literal);
  return replaceEncoding(ast, [new Link(new Literal(literalAsString), new Transformation(transform(() => ast.literal), transform(() => literalAsString)))]);
}
var String5 = class extends ASTNodeImpl {
  _tag = "String";
  /** @internal */
  getParser() {
    return fromRefinement(this, isString);
  }
  /** @internal */
  matchPart(s, options) {
    const checks = this.checks;
    return checks && !options.disableChecks && collectIssues(checks, s, void 0, this, options) ? void 0 : s;
  }
  /** @internal */
  getExpected() {
    return "string";
  }
};
var string2 = /* @__PURE__ */ new String5();
var Number5 = class extends ASTNodeImpl {
  _tag = "Number";
  /** @internal */
  getParser() {
    return fromRefinement(this, isNumber);
  }
  /** @internal */
  matchKey(s, options) {
    return this._match(isStringNumberRegExp, s, options);
  }
  /** @internal */
  matchPart(s, options) {
    return this._match(isStringFiniteRegExp, s, options);
  }
  _match(regexp, s, options) {
    if (!regexp.test(s)) return void 0;
    const value3 = globalThis.Number(s);
    if (options.disableChecks || !this.checks) return value3;
    return collectIssues(this.checks, value3, void 0, this, options) ? void 0 : value3;
  }
  /** @internal */
  toCodecJson() {
    if (this.checks && (hasCheck(this.checks, "effect/schema/isFinite") || hasCheck(this.checks, "effect/schema/isInt"))) {
      return this;
    }
    return replaceEncoding(this, [numberToJson]);
  }
  /** @internal */
  toCodecStringTree() {
    if (this.toCodecJson() === this) {
      return replaceEncoding(this, [finiteToString]);
    }
    return replaceEncoding(this, [numberToString]);
  }
  /** @internal */
  getExpected() {
    return "number";
  }
};
function hasCheck(checks, id2) {
  return checks.some((check2) => check2.annotations?.representation?.id === id2 || check2._tag === "FilterGroup" && hasCheck(check2.checks, id2));
}
var number2 = /* @__PURE__ */ new Number5();
var Boolean2 = class extends ASTNodeImpl {
  _tag = "Boolean";
  /** @internal */
  getParser() {
    return fromRefinement(this, isBoolean);
  }
  /** @internal */
  getExpected() {
    return "boolean";
  }
};
var boolean = /* @__PURE__ */ new Boolean2();
var Symbol2 = class extends ASTNodeImpl {
  _tag = "Symbol";
  /** @internal */
  getParser() {
    return fromRefinement(this, isSymbol);
  }
  /** @internal */
  matchKey(s, options) {
    if (options.disableChecks || !this.checks) return s;
    return collectIssues(this.checks, s, void 0, this, options) ? void 0 : s;
  }
  /** @internal */
  toCodecStringTree() {
    return replaceEncoding(this, [symbolToString]);
  }
  /** @internal */
  getExpected() {
    return "symbol";
  }
};
var symbol3 = /* @__PURE__ */ new Symbol2();
var BigInt5 = class extends ASTNodeImpl {
  _tag = "BigInt";
  /** @internal */
  getParser() {
    return fromRefinement(this, isBigInt);
  }
  /** @internal */
  matchPart(s, options) {
    if (!isStringBigIntRegExp.test(s)) return void 0;
    const value3 = globalThis.BigInt(s);
    if (options.disableChecks || !this.checks) return value3;
    return collectIssues(this.checks, value3, void 0, this, options) ? void 0 : value3;
  }
  /** @internal */
  toCodecStringTree() {
    return replaceEncoding(this, [bigIntToString]);
  }
  /** @internal */
  getExpected() {
    return "bigint";
  }
};
var bigInt = /* @__PURE__ */ new BigInt5();
var Arrays = class extends ASTNodeImpl {
  _tag = "Arrays";
  isMutable;
  elements;
  rest;
  encodingChecks;
  constructor(isMutable2, elements, rest, annotations, checks, encoding, context3, encodingChecks) {
    super(annotations, checks, encoding, context3);
    this.isMutable = isMutable2;
    this.elements = elements;
    this.rest = rest;
    this.encodingChecks = encodingChecks;
    let hasOptional = false;
    for (let i = 0; i < elements.length; i++) {
      if (isOptional(elements[i])) {
        hasOptional = true;
      } else if (hasOptional) {
        throw new Error("A required element cannot follow an optional element. ts(1257)");
      }
    }
    if (hasOptional && rest.length > 1) {
      throw new Error("A required element cannot follow an optional element. ts(1257)");
    }
    for (let i = 1; i < rest.length; i++) {
      if (isOptional(rest[i])) {
        throw new Error("An optional element cannot follow a rest element. ts(1266)");
      }
    }
  }
  /** @internal */
  getParser(compile2, compileField2 = compile2) {
    const ast = this;
    let elements;
    let rest;
    const elementLen = ast.elements.length;
    const tailLen = Math.max(0, ast.rest.length - 1);
    function getParser(tailThreshold, index2) {
      if (index2 < elementLen) {
        return elements[index2];
      } else if (index2 >= tailThreshold) {
        return rest[index2 - tailThreshold + 1];
      }
      return rest[0];
    }
    const finish = (state) => {
      const {
        input,
        len,
        options
      } = state;
      if (ast.rest.length === 0 && len > elementLen) {
        for (let i = elementLen; i < len; i++) {
          const unexpected = new UnexpectedKey(ast, input[i], options);
          const issue = new Pointer([i], unexpected);
          if (options.errors === "all") {
            if (state.issues) state.issues.push(issue);
            else state.issues = [issue];
          } else {
            return fail5(new Composite(ast, [issue], input, options));
          }
        }
      }
      if (state.issues) {
        return fail5(new Composite(ast, state.issues, input, options));
      }
      return succeed7(state.output);
    };
    const parse = (input, options) => {
      const len = input.length;
      const state = {
        ast,
        getParser,
        input,
        len,
        tailThreshold: Math.max(elementLen, len - tailLen),
        output: new globalThis.Array(len),
        issues: void 0,
        options
      };
      const end2 = ast.rest.length === 0 ? elementLen : Math.max(len, elementLen + tailLen);
      const concurrency = options.concurrency === void 0 ? 1 : resolveConcurrency(options.concurrency);
      const eff = concurrency === 1 ? parseArray(state, input, 0, end2) : parseArrayConcurrent(state, input, {
        concurrency,
        end: end2
      });
      if (!eff) return finish(state);
      if (effectIsExit(eff)) return flatMapEager2(eff, () => finish(state));
      let first = true;
      return suspend3(() => {
        if (!first) return parse(input, options);
        first = false;
        return flatMap5(eff, () => finish(state));
      });
    };
    return (input, options) => {
      if (input === missing) return missingExit;
      try {
        if (!Array.isArray(input)) {
          return fail5(new InvalidType(ast, input, options));
        }
        if (!elements) {
          elements = ast.elements.map((ast2) => ({
            ast: ast2,
            parser: compileField2(ast2)
          }));
          rest = ast.rest.map((ast2) => ({
            ast: ast2,
            parser: compileField2(ast2)
          }));
        }
        return parse(input, options);
      } catch (error) {
        return die3(error);
      }
    };
  }
  _rebuild(recur2, checks, encodingChecks) {
    const elements = mapOrSame(this.elements, recur2);
    const rest = mapOrSame(this.rest, recur2);
    return elements === this.elements && rest === this.rest && checks === this.checks && encodingChecks === this.encodingChecks ? this : new Arrays(this.isMutable, elements, rest, this.annotations, checks, void 0, this.context, encodingChecks);
  }
  /** @internal */
  recur(recur2) {
    return this._rebuild(recur2, this.checks, this.encodingChecks);
  }
  /** @internal */
  flip(recur2) {
    return this._rebuild(recur2, this.encodingChecks, this.checks);
  }
  /** @internal */
  getExpected() {
    return "array";
  }
};
function stepArray(s, item, exit4, i) {
  if (exit4._tag === "Failure") {
    return wrapPropertyKeyIssue(s, s.ast, i, exit4);
  }
  const value3 = exit4 === sameExit ? item : exit4[args];
  if (value3 !== missing) {
    s.output[i] = value3;
  } else {
    const p = s.getParser(s.tailThreshold, i);
    if (isOptional(p.ast)) return;
    const issue = new Pointer([i], new MissingKey(p.ast.context?.annotations));
    if (s.options.errors === "all") {
      if (s.issues) s.issues.push(issue);
      else s.issues = [issue];
    } else {
      return fail4(new Composite(s.ast, [issue], s.input, s.options));
    }
  }
}
var parseArrayOptions = {
  onItem(s, item, i) {
    const value3 = i < s.len ? item : missing;
    return s.getParser(s.tailThreshold, i).parser(value3, s.options);
  },
  step: stepArray
};
var parseArray = /* @__PURE__ */ iterateEager()(parseArrayOptions);
var parseArrayConcurrent = /* @__PURE__ */ iterateConcurrent()(parseArrayOptions);
var wrapPropertyKeyIssue = (s, ast, key, exit4) => {
  if (exit4.cause.reasons.length === 0) {
    return exit4;
  }
  const issue = getSchemaIssue(exit4.cause);
  if (issue === void 0) {
    return failCause2(map6(exit4.cause, (issue2) => new Composite(ast, [new Pointer([key], issue2)], s.input, s.options)));
  }
  const pointer = new Pointer([key], issue);
  if (s.options.errors === "all") {
    if (s.issues) s.issues.push(pointer);
    else s.issues = [pointer];
  } else {
    return fail4(new Composite(ast, [pointer], s.input, s.options));
  }
};
var FINITE_PATTERN = "[+-]?\\d*\\.?\\d+(?:[Ee][+-]?\\d+)?";
function getIndexSignatureKeys(input, parameter, options = defaultParseOptions) {
  let stringKeys;
  let symbolKeys;
  function go(parameter2) {
    switch (parameter2._tag) {
      case "String":
      case "TemplateLiteral":
        return (stringKeys ??= Object.keys(input)).filter((k) => parameter2.matchPart(k, options) !== void 0);
      case "Number":
        return (stringKeys ??= Object.keys(input)).filter((k) => parameter2.matchKey(k, options) !== void 0);
      case "Symbol":
        return (symbolKeys ??= Object.getOwnPropertySymbols(input)).filter((k) => Object.prototype.propertyIsEnumerable.call(input, k) && parameter2.matchKey(k, options) !== void 0);
      case "Union":
        return [...new Set(parameter2.types.flatMap(go))];
      default:
        return [];
    }
  }
  return go(parameterFromPropertyKey(toEncoded(parameter)));
}
var PropertySignature = class {
  name;
  type;
  constructor(name, type) {
    this.name = name;
    this.type = type;
  }
};
function isIndexSignatureParameterSide(ast) {
  switch (ast._tag) {
    case "String":
    case "Number":
    case "Symbol":
    case "TemplateLiteral":
      return true;
    case "Union":
      return ast.types.every(isIndexSignatureParameterSide);
    default:
      return false;
  }
}
function isIndexSignatureParameterEncodedSide(ast) {
  const encoded = getLastEncoding(ast);
  switch (encoded._tag) {
    case "String":
    case "Number":
    case "Symbol":
    case "TemplateLiteral":
      return true;
    case "Union":
      return encoded.types.every(isIndexSignatureParameterEncodedSide);
    default:
      return false;
  }
}
function isIndexSignatureParameter(ast) {
  return isIndexSignatureParameterSide(ast) && isIndexSignatureParameterEncodedSide(ast);
}
var IndexSignature = class {
  parameter;
  type;
  constructor(parameter, type) {
    if (!isIndexSignatureParameter(parameter)) {
      throw new Error(`Invalid index signature parameter ${parameter._tag}`);
    }
    this.parameter = parameter;
    this.type = type;
    if (isOptional(type) && !containsUndefined(type)) {
      throw new Error("Cannot use `Schema.optionalKey` with index signatures, use `Schema.optional` instead.");
    }
  }
};
var Objects = class extends ASTNodeImpl {
  _tag = "Objects";
  propertySignatures;
  indexSignatures;
  encodingChecks;
  constructor(propertySignatures, indexSignatures, annotations, checks, encoding, context3, encodingChecks) {
    super(annotations, checks, encoding, context3);
    this.propertySignatures = propertySignatures;
    this.indexSignatures = indexSignatures;
    this.encodingChecks = encodingChecks;
  }
  /** @internal */
  getParser(compile2, compileField2 = compile2) {
    const ast = this;
    const hasProperties = ast.propertySignatures.length;
    const indexCount = ast.indexSignatures.length;
    if (!hasProperties && !indexCount) {
      return fromRefinement(ast, isNotNullish);
    }
    let properties;
    let indexes;
    const compileMembers = () => {
      if (!properties) {
        properties = ast.propertySignatures.map((ps) => ({
          parser: compileField2(ps.type),
          name: ps.name,
          type: ps.type
        }));
        indexes = indexCount ? ast.indexSignatures.map((is3) => ({
          is: is3,
          parserKey: compile2(parameterFromPropertyKey(is3.parameter)),
          parserValue: compileField2(is3.type)
        })) : void 0;
      }
      return properties;
    };
    const makeFallback = () => {
      const expectedKeys = new Set(ast.propertySignatures.map((ps) => typeof ps.name === "number" ? globalThis.String(ps.name) : ps.name));
      const finishIndex = (s, key, k2, inputValue, exitValue) => {
        if (exitValue._tag === "Failure") {
          return wrapPropertyKeyIssue(s, ast, key, exitValue) ?? void_3;
        }
        const value3 = exitValue === sameExit ? inputValue : exitValue[args];
        if (k2 !== missing && value3 !== missing) {
          if (hasProperties && (expectedKeys.has(key) || expectedKeys.has(typeof k2 === "number" ? globalThis.String(k2) : k2))) return void_3;
          assignProperty(s.out, k2, value3);
        }
        return void_3;
      };
      const parseIndex = (s, key, index2, exitKey) => {
        if (!exitKey) {
          const eff = index2.parserKey(key, s.options);
          if (!effectIsExit(eff)) {
            return flatMap5(exit2(eff), (exit4) => parseIndex(s, key, index2, exit4));
          }
          exitKey = eff;
        }
        if (exitKey._tag === "Failure") {
          return wrapPropertyKeyIssue(s, ast, key, exitKey) ?? void_3;
        }
        const k2 = exitKey === sameExit ? key : exitKey[args];
        const inputValue = s.input[key];
        const result3 = index2.parserValue(inputValue, s.options);
        return effectIsExit(result3) ? finishIndex(s, key, k2, inputValue, result3) : flatMap5(exit2(result3), (exit4) => finishIndex(s, key, k2, inputValue, exit4));
      };
      const parseStringIndex = (s, key, index2) => {
        const inputValue = s.input[key];
        const result3 = index2.parserValue(inputValue, s.options);
        return effectIsExit(result3) ? finishIndex(s, key, key, inputValue, result3) : flatMap5(exit2(result3), (exit4) => finishIndex(s, key, key, inputValue, exit4));
      };
      const parseIndexes = indexCount ? iterateConcurrent()({
        onItem: (s, [key, index2]) => index2.is.parameter === string2 ? parseStringIndex(s, key, index2) : parseIndex(s, key, index2),
        step: (_s, _item, exit4) => exit4._tag === "Failure" ? exit4 : void 0
      }) : void 0;
      return fnUntracedEager2(function* (input, options) {
        if (input === missing) {
          return missing;
        }
        if (!(typeof input === "object" && input !== null && !Array.isArray(input))) {
          return yield* fail5(new InvalidType(ast, input, options));
        }
        compileMembers();
        const record2 = input;
        const out = {};
        const state = {
          ast,
          input: record2,
          out,
          issues: void 0,
          options
        };
        const errorsAllOption = options.errors === "all";
        const onExcessPropertyError = options.onExcessProperty === "error";
        const concurrency = options.concurrency === void 0 ? 1 : resolveConcurrency(options.concurrency);
        const indexKeys = indexCount && onExcessPropertyError ? ast.indexSignatures.map((index2) => getIndexSignatureKeys(record2, index2.parameter, options)) : void 0;
        if (onExcessPropertyError) {
          const coveredKeys = indexKeys ? new Set(expectedKeys) : expectedKeys;
          if (indexKeys) {
            for (const keys3 of indexKeys) {
              for (const key of keys3) coveredKeys.add(key);
            }
          }
          const inputKeys = Reflect.ownKeys(record2);
          for (let i = 0; i < inputKeys.length; i++) {
            const key = inputKeys[i];
            if (!coveredKeys.has(key) && Object.prototype.propertyIsEnumerable.call(record2, key)) {
              const unexpected = new UnexpectedKey(ast, record2[key], options);
              const issue = new Pointer([key], unexpected);
              if (errorsAllOption) {
                if (state.issues) {
                  state.issues.push(issue);
                } else {
                  state.issues = [issue];
                }
                continue;
              } else {
                return yield* fail5(new Composite(ast, [issue], input, options));
              }
            }
          }
        }
        if (hasProperties) {
          const eff = concurrency === 1 ? parseProperties(state, properties) : parsePropertiesConcurrent(state, properties, {
            concurrency
          });
          if (eff) yield* eff;
        }
        if (indexCount && concurrency === 1) {
          for (let i = 0; i < indexCount; i++) {
            const index2 = indexes[i];
            const parse = index2.is.parameter === string2 ? parseStringIndex : parseIndex;
            const keys3 = indexKeys?.[i] ?? (index2.is.parameter === string2 ? Object.keys(record2) : getIndexSignatureKeys(record2, index2.is.parameter, options));
            for (let j = 0; j < keys3.length; j++) {
              const eff = parse(state, keys3[j], index2);
              if (!effectIsExit(eff)) yield* eff;
              else if (eff._tag === "Failure") return yield* eff;
            }
          }
        } else if (parseIndexes) {
          const keyPairs = empty2();
          for (let i = 0; i < indexCount; i++) {
            const index2 = indexes[i];
            const keys3 = indexKeys?.[i] ?? (index2.is.parameter === string2 ? Object.keys(record2) : getIndexSignatureKeys(record2, index2.is.parameter, options));
            for (let j = 0; j < keys3.length; j++) {
              keyPairs.push([keys3[j], index2]);
            }
          }
          const eff = parseIndexes(state, keyPairs, {
            concurrency
          });
          if (eff) yield* eff;
        }
        if (state.issues) {
          return yield* fail5(new Composite(ast, state.issues, input, options));
        }
        return out;
      });
    };
    if (indexCount) return makeFallback();
    let fallback;
    const resume = (state, index2, pending2) => {
      const property = properties[index2];
      return flatMap5(exit2(pending2), (exit4) => {
        const terminal = stepProperty(state, property, exit4);
        if (terminal) return terminal;
        const done3 = () => succeed7(state.out);
        const eff = parseProperties(state, properties.slice(index2 + 1));
        return eff ? flatMapEager2(eff, done3) : done3();
      });
    };
    return (input, options) => {
      if (input === missing) return missingExit;
      if (options.errors === "all" || options.onExcessProperty !== void 0 || options.concurrency !== void 0 && resolveConcurrency(options.concurrency) !== 1) {
        return (fallback ??= makeFallback())(input, options);
      }
      if (!(typeof input === "object" && input !== null && !Array.isArray(input))) {
        return fail5(new InvalidType(ast, input, options));
      }
      const props = compileMembers();
      const record2 = input;
      const out = {};
      const state = {
        ast,
        input: record2,
        out,
        issues: void 0,
        options
      };
      try {
        for (let index2 = 0; index2 < props.length; index2++) {
          const property = props[index2];
          const name = property.name;
          const hasKey = hasPropertySignature(record2, name);
          const value3 = hasKey ? record2[name] : missing;
          const exit4 = property.parser(value3, options);
          if (!effectIsExit(exit4)) {
            return resume(state, index2, exit4);
          }
          if (exit4 === sameExit) {
            if (hasKey) assignProperty(out, name, value3);
            continue;
          }
          const terminal = stepProperty(state, property, exit4);
          if (terminal) return terminal;
        }
      } catch (error) {
        return die3(error);
      }
      return succeed7(out);
    };
  }
  _rebuild(recur2, recurParameter, checks, encodingChecks) {
    const props = mapOrSame(this.propertySignatures, (ps) => {
      const t = recur2(ps.type);
      return t === ps.type ? ps : new PropertySignature(ps.name, t);
    });
    const indexes = mapOrSame(this.indexSignatures, (is3) => {
      const p = recurParameter(is3.parameter);
      const t = recur2(is3.type);
      return p === is3.parameter && t === is3.type ? is3 : new IndexSignature(p, t);
    });
    return props === this.propertySignatures && indexes === this.indexSignatures && checks === this.checks && encodingChecks === this.encodingChecks ? this : new Objects(props, indexes, this.annotations, checks, void 0, this.context, encodingChecks);
  }
  /** @internal */
  flip(recur2) {
    return this._rebuild(recur2, recur2, this.encodingChecks, this.checks);
  }
  /** @internal */
  recur(recur2, recurParameter = recur2) {
    return this._rebuild(recur2, recurParameter, this.checks, this.encodingChecks);
  }
  /** @internal */
  getExpected() {
    if (this.propertySignatures.length === 0 && this.indexSignatures.length === 0) return "object | array";
    return "object";
  }
};
function stepProperty(s, p, exit4) {
  if (exit4._tag === "Failure") {
    return wrapPropertyKeyIssue(s, s.ast, p.name, exit4);
  }
  if (exit4 === sameExit) return;
  const value3 = exit4[args];
  if (value3 !== missing) {
    assignProperty(s.out, p.name, value3);
    return;
  }
  delete s.out[p.name];
  if (!isOptional(p.type)) {
    const issue = new Pointer([p.name], new MissingKey(p.type.context?.annotations));
    if (s.options.errors === "all") {
      if (s.issues) s.issues.push(issue);
      else s.issues = [issue];
      return;
    } else {
      return fail4(new Composite(s.ast, [issue], s.input, s.options));
    }
  }
}
var parsePropertiesOptions = {
  onItem(s, p) {
    if (!hasPropertySignature(s.input, p.name)) {
      return p.parser(missing, s.options);
    }
    const value3 = s.input[p.name];
    assignProperty(s.out, p.name, value3);
    return p.parser(value3, s.options);
  },
  step: stepProperty
};
var parseProperties = /* @__PURE__ */ iterateEager()(parsePropertiesOptions);
var parsePropertiesConcurrent = /* @__PURE__ */ iterateConcurrent()(parsePropertiesOptions);
function combineChecks(a, b) {
  if (!a) return b;
  if (!b) return a;
  return [...a, ...b];
}
function struct(fields, checks, annotations) {
  return new Objects(Reflect.ownKeys(fields).map((key) => {
    return new PropertySignature(key, fields[key].ast);
  }), [], annotations, checks);
}
function getAST(self) {
  return self.ast;
}
function tuple(elements, checks = void 0) {
  return new Arrays(false, elements.map((e) => e.ast), [], void 0, checks);
}
function union4(members, options, checks) {
  return new Union(members.map(getAST), options, void 0, checks);
}
function structWithRest(ast, records) {
  if (ast.encoding || records.some((r) => r.encoding)) {
    throw new Error("StructWithRest does not support encodings");
  }
  let propertySignatures = ast.propertySignatures;
  let indexSignatures = ast.indexSignatures;
  let checks = ast.checks;
  for (const record2 of records) {
    for (const propertySignature of record2.propertySignatures) {
      if (propertySignatures.some((ps) => ps.name === propertySignature.name)) {
        throw new Error(`Duplicate identifier: ${JSON.stringify(propertySignature.name)}. ts(2300)`);
      }
    }
    propertySignatures = propertySignatures.concat(record2.propertySignatures);
    indexSignatures = indexSignatures.concat(record2.indexSignatures);
    checks = combineChecks(checks, record2.checks);
  }
  return new Objects(propertySignatures, indexSignatures, void 0, checks);
}
function tupleWithRest(ast, rest) {
  if (ast.encoding) {
    throw new Error("TupleWithRest does not support encodings");
  }
  return new Arrays(ast.isMutable, ast.elements, rest, void 0, ast.checks);
}
function mutable(ast) {
  if (ast.encoding) {
    throw new Error("mutable does not support encodings");
  }
  return new Arrays(true, ast.elements, ast.rest, ast.annotations, ast.checks, void 0, ast.context, ast.encodingChecks);
}
var toCandidate = /* @__PURE__ */ memoizeIdempotent((ast) => {
  while (true) {
    if (isSuspend(ast)) return unknown;
    const encoding = ast.encoding;
    if (!encoding) {
      return ast.recur?.(toCandidate, identity) ?? ast;
    }
    if (encoding.some((link2) => link2.transformation._tag === "Middleware" && link2.transformation.decode !== identity)) return unknown;
    ast = encoding[encoding.length - 1].to;
  }
});
function getCandidateTypes(ast) {
  switch (ast._tag) {
    case "Null":
      return ["null"];
    case "Undefined":
      return ["undefined"];
    case "String":
    case "TemplateLiteral":
      return ["string"];
    case "Number":
      return ["number"];
    case "Boolean":
      return ["boolean"];
    case "Symbol":
    case "UniqueSymbol":
      return ["symbol"];
    case "BigInt":
      return ["bigint"];
    case "Arrays":
      return ["array"];
    case "ObjectKeyword":
      return ["object", "array", "function"];
    case "Objects":
      return ast.propertySignatures.length || ast.indexSignatures.length ? ["object"] : ["string", "number", "boolean", "symbol", "bigint", "object", "array", "function"];
    case "Enum":
      return Array.from(new Set(ast.enums.map(([, v]) => typeof v)));
    case "Literal":
      return [typeof ast.literal];
    case "Union":
      return Array.from(new Set(ast.types.flatMap(getCandidateTypes)));
    default:
      return ["null", "undefined", "string", "number", "boolean", "symbol", "bigint", "object", "array", "function"];
  }
}
function collectSentinels(ast) {
  switch (ast._tag) {
    default:
      return [];
    case "Declaration": {
      const s = ast.annotations?.[SENTINELS_ANNOTATION_KEY];
      return Array.isArray(s) ? s : [];
    }
    case "Objects":
      return ast.propertySignatures.flatMap((ps) => {
        const type = ps.type;
        if (!isOptional(type)) {
          if (isLiteral(type)) {
            return [{
              key: ps.name,
              literal: type.literal
            }];
          }
          if (isUniqueSymbol(type)) {
            return [{
              key: ps.name,
              literal: type.symbol
            }];
          }
        }
        return [];
      });
    case "Arrays":
      return ast.elements.flatMap((e, i) => {
        if (!isOptional(e)) {
          if (isLiteral(e)) {
            return [{
              key: i,
              literal: e.literal
            }];
          }
          if (isUniqueSymbol(e)) {
            return [{
              key: i,
              literal: e.symbol
            }];
          }
        }
        return [];
      });
    case "Union": {
      if (ast.types.length === 0) return [];
      const members = ast.types.map((type) => collectSentinels(toCandidate(type)));
      return members[0].filter((s) => members.every((sentinels) => sentinels.some((o) => o.key === s.key && o.literal === s.literal)));
    }
    case "Suspend":
      return collectSentinels(ast.thunk());
  }
}
var candidateIndexCache = /* @__PURE__ */ new WeakMap();
var emptyCandidates = /* @__PURE__ */ Object.freeze([]);
var getRuntimeType = (input) => input === null ? "null" : Array.isArray(input) ? "array" : typeof input;
var hasPropertySignature = (input, key) => key === "__proto__" ? Object.hasOwn(input, key) : key in input;
function getCandidateIndex(types) {
  let index2 = candidateIndexCache.get(types);
  if (index2) return index2;
  let bySentinel;
  let sentinelCandidateCount = 0;
  let otherwise;
  let literalCandidates;
  let onlyLiterals = true;
  const literalOf = [];
  for (let i = 0; i < types.length; i++) {
    const a = types[i];
    const encoded = toCandidate(a);
    if (isNever2(encoded)) continue;
    if (isLiteral(encoded) || isUniqueSymbol(encoded)) {
      literalCandidates ??= /* @__PURE__ */ new Map();
      const literal = isLiteral(encoded) ? encoded.literal : encoded.symbol;
      literalOf[i] = literal;
      let arr = literalCandidates.get(literal);
      if (!arr) literalCandidates.set(literal, arr = []);
      arr.push(i);
    } else {
      onlyLiterals = false;
    }
    const sentinels = collectSentinels(encoded);
    if (sentinels.length) {
      bySentinel ??= /* @__PURE__ */ new Map();
      sentinelCandidateCount++;
      for (const {
        key,
        literal
      } of sentinels) {
        let entry = bySentinel.get(key);
        if (!entry) bySentinel.set(key, entry = [/* @__PURE__ */ new Map(), /* @__PURE__ */ new Set()]);
        entry[1].add(i);
        let indexes = entry[0].get(literal);
        if (!indexes) entry[0].set(literal, indexes = /* @__PURE__ */ new Set());
        indexes.add(i);
      }
    } else {
      otherwise ??= {};
      const candidateTypes = getCandidateTypes(encoded);
      for (const t of candidateTypes) (otherwise[t] ??= []).push(i);
    }
  }
  const fallbacks = {};
  const getFallback = (type) => fallbacks[type] ??= Object.freeze(otherwise?.[type] ?? emptyCandidates);
  if (onlyLiterals && literalCandidates) {
    literalCandidates.forEach(Object.freeze);
    index2 = (input) => literalCandidates.get(input) ?? emptyCandidates;
  } else if (bySentinel?.size === 1 && !otherwise) {
    const [key, [byValue]] = bySentinel.entries().next().value;
    const candidates2 = /* @__PURE__ */ new Map();
    for (const [literal, indexes] of byValue) {
      candidates2.set(literal, Object.freeze(Array.from(indexes)));
    }
    const all4 = Object.freeze(types.map((_, i) => i));
    index2 = (input, isConstructor) => {
      if (isObjectKeyword(input)) {
        const value3 = hasPropertySignature(input, key) ? input[key] : void 0;
        if (value3 !== void 0) return candidates2.get(value3) ?? emptyCandidates;
        if (isConstructor) return all4;
      }
      return emptyCandidates;
    };
  } else if (bySentinel) {
    let commonSentinel;
    for (const entry of bySentinel) {
      if ((!commonSentinel || entry[1][0].size > commonSentinel[1][0].size) && entry[1][1].size === sentinelCandidateCount) {
        commonSentinel = entry;
      }
    }
    index2 = (input, isConstructor) => {
      const runtimeType = getRuntimeType(input);
      if (!isObjectKeyword(input)) return getFallback(runtimeType);
      const selected = new Set(otherwise?.[runtimeType]);
      let directKey;
      if (commonSentinel) {
        const [key, [byValue]] = commonSentinel;
        const hasKey = hasPropertySignature(input, key);
        const value3 = hasKey ? input[key] : void 0;
        if (hasKey && (!isConstructor || value3 !== void 0)) {
          const match7 = byValue.get(value3);
          if (!match7) return getFallback(runtimeType);
          for (const i of match7) selected.add(i);
          directKey = key;
        }
      }
      if (directKey === void 0) {
        for (const [key, [byValue, all4]] of bySentinel) {
          const hasKey = hasPropertySignature(input, key);
          const value3 = hasKey ? input[key] : void 0;
          if (hasKey && (!isConstructor || value3 !== void 0)) {
            const match7 = byValue.get(value3);
            if (match7) {
              for (const i of match7) selected.add(i);
            }
          } else if (isConstructor) {
            for (const i of all4) selected.add(i);
          }
        }
      }
      for (const [key, [byValue, all4]] of bySentinel) {
        if (key === directKey) continue;
        const hasKey = hasPropertySignature(input, key);
        const value3 = hasKey ? input[key] : void 0;
        if (hasKey && (!isConstructor || value3 !== void 0)) {
          const match7 = byValue.get(value3);
          for (const i of selected) {
            if (all4.has(i) && !match7?.has(i)) selected.delete(i);
          }
        }
      }
      return Array.from(selected).sort((a, b) => a - b);
    };
  } else {
    index2 = (input) => {
      const fallback = getFallback(getRuntimeType(input));
      return literalCandidates ? fallback.filter((i) => literalOf[i] === void 0 || literalOf[i] === input) : fallback;
    };
  }
  candidateIndexCache.set(types, index2);
  return index2;
}
var Union = class extends ASTNodeImpl {
  _tag = "Union";
  types;
  options;
  encodingChecks;
  constructor(types, options, annotations, checks, encoding, context3, encodingChecks) {
    super(annotations, checks, encoding, context3);
    this.types = types;
    this.options = options;
    this.encodingChecks = encodingChecks;
  }
  /** @internal */
  getParser(compile2, compileField2) {
    const ast = this;
    const isConstructor = compileField2 !== void 0;
    const parsers = [];
    const parser = (i) => parsers[i] ??= compile2(ast.types[i]);
    let index2;
    return (input, options) => {
      if (input === missing) {
        return missingExit;
      }
      const candidates2 = (index2 ??= getCandidateIndex(ast.types))(input, isConstructor);
      if (candidates2.length === 0) {
        return fail5(new AnyOf(ast, [], input, options));
      }
      if (candidates2.length === 1) {
        const result3 = parser(candidates2[0])(input, options);
        if (result3._tag === "Success") return result3;
        return effectIsExit(result3) ? failSingleUnionCandidate(ast, result3.cause, input, options) : catchSingleUnionCandidate(ast, result3, input, options);
      }
      return parseUnionCandidates(ast, parser, candidates2, input, options);
    };
  }
  _rebuild(recur2, checks, encodingChecks) {
    const types = mapOrSame(this.types, recur2);
    return types === this.types && checks === this.checks && encodingChecks === this.encodingChecks ? this : new Union(types, this.options, this.annotations, checks, void 0, this.context, encodingChecks);
  }
  /** @internal */
  recur(recur2) {
    return this._rebuild(recur2, this.checks, this.encodingChecks);
  }
  /** @internal */
  flip(recur2) {
    return this._rebuild(recur2, this.encodingChecks, this.checks);
  }
  /** @internal */
  matchPart(s, options) {
    for (const type of this.types) {
      const out = type.matchPart(s, options);
      if (out !== void 0) return out;
    }
    return void 0;
  }
  /** @internal */
  getExpected(getExpected2) {
    const expected = this.annotations?.expected;
    if (typeof expected === "string") return expected;
    if (this.types.length === 0) return "never";
    const types = this.types.map((type) => {
      const encoded = toEncoded(type);
      switch (encoded._tag) {
        case "Arrays": {
          const literals = encoded.elements.filter(isLiteral);
          if (literals.length > 0) {
            return `${formatIsMutable(encoded.isMutable)}[ ${literals.map((e) => getExpected2(e) + formatIsOptional(e.context?.isOptional)).join(", ")}, ... ]`;
          }
          break;
        }
        case "Objects": {
          const literals = encoded.propertySignatures.filter((ps) => isLiteral(ps.type));
          if (literals.length > 0) {
            return `{ ${literals.map((ps) => `${formatIsMutable(ps.type.context?.isMutable)}${formatPropertyKey(ps.name)}${formatIsOptional(ps.type.context?.isOptional)}: ${getExpected2(ps.type)}`).join(", ")}, ... }`;
          }
          break;
        }
      }
      return getExpected2(encoded);
    });
    return Array.from(new Set(types)).join(" | ");
  }
};
function failSingleUnionCandidate(ast, cause, input, options) {
  const issue = getSchemaIssue(cause);
  if (!issue) return failCause2(cause);
  return fail4(new AnyOf(ast, [issue], input, options));
}
function catchSingleUnionCandidate(ast, result3, input, options) {
  return catchCause3(result3, (cause) => failSingleUnionCandidate(ast, cause, input, options));
}
function parseUnionCandidates(ast, parser, candidates2, input, options) {
  const state = {
    ast,
    parser,
    input,
    out: void 0,
    successes: ast.options?.mode === "oneOf" ? [] : void 0,
    issues: void 0,
    options
  };
  const eff = parseUnion(state, candidates2);
  if (!eff) {
    if (state.out) return state.out;
    return fail5(new AnyOf(ast, state.issues ?? [], input, options));
  }
  if (effectIsExit(eff)) return resumeUnion(eff, state);
  let first = true;
  return suspend3(() => {
    if (!first) return parseUnionCandidates(ast, parser, candidates2, input, options);
    first = false;
    return resumeUnion(eff, state);
  });
}
function resumeUnion(eff, state) {
  return flatMapEager2(eff, (_) => {
    if (state.out === sameExit) return succeed6(state.input);
    if (state.out) return state.out;
    return fail5(new AnyOf(state.ast, state.issues ?? [], state.input, state.options));
  });
}
var parseUnion = /* @__PURE__ */ iterateEager()({
  onItem(s, i) {
    return s.parser(i)(s.input, s.options);
  },
  step(s, i, exit4) {
    if (exit4._tag === "Failure") {
      const issue = getSchemaIssue(exit4.cause);
      if (issue === void 0) {
        return exit4;
      }
      if (s.issues) s.issues.push(issue);
      else s.issues = [issue];
    } else {
      if (s.out && s.successes) {
        s.successes.push(s.ast.types[i]);
        return fail4(new OneOf(s.ast, s.successes, s.input, s.options));
      }
      s.out = exit4;
      if (s.successes) {
        s.successes.push(s.ast.types[i]);
      } else {
        return void_3;
      }
    }
  }
});
var nonFiniteLiterals = /* @__PURE__ */ new Union([/* @__PURE__ */ new Literal("Infinity"), /* @__PURE__ */ new Literal("-Infinity"), /* @__PURE__ */ new Literal("NaN")]);
function formatIsMutable(isMutable2) {
  return isMutable2 ? "" : "readonly ";
}
function formatIsOptional(isOptional3) {
  return isOptional3 ? "?" : "";
}
var Suspend = class extends ASTNodeImpl {
  _tag = "Suspend";
  thunk;
  constructor(thunk, annotations, checks, encoding, context3) {
    if (checks) {
      throw new Error("Cannot add checks to Suspend");
    }
    super(annotations, void 0, encoding, context3);
    let ast;
    this.thunk = () => ast ??= thunk();
  }
  /** @internal */
  getParser(compile2) {
    let parser;
    return (input, options) => (parser ??= compile2(this.thunk()))(input, options);
  }
  /** @internal */
  recur(recur2) {
    return new Suspend(() => recur2(this.thunk()), this.annotations, void 0, void 0, this.context);
  }
  /** @internal */
  getExpected(getExpected2) {
    return getExpected2(this.thunk());
  }
};
var Filter2 = class extends Class {
  _tag = "Filter";
  run;
  annotations;
  /**
   * Whether the parsing process should be aborted after this check has failed.
   */
  aborted;
  constructor(run2, annotations = void 0, aborted = false) {
    super();
    this.run = run2;
    this.annotations = annotations;
    this.aborted = aborted;
  }
  annotate(annotations) {
    return new Filter2(this.run, {
      ...this.annotations,
      ...annotations
    }, this.aborted);
  }
  abort() {
    return new Filter2(this.run, this.annotations, true);
  }
  and(other, annotations) {
    return new FilterGroup([this, other], annotations);
  }
};
var FilterGroup = class extends Class {
  _tag = "FilterGroup";
  checks;
  annotations;
  constructor(checks, annotations = void 0) {
    super();
    this.checks = checks;
    this.annotations = annotations;
  }
  annotate(annotations) {
    return new FilterGroup(this.checks, {
      ...this.annotations,
      ...annotations
    });
  }
  and(other, annotations) {
    return new FilterGroup([this, other], annotations);
  }
};
function makeFilter(filter8, annotations, aborted = false) {
  return new Filter2((input, ast, options) => normalizeFilterOutput(ast, filter8(input, ast, options), input, options), annotations, aborted);
}
function makeFilterByGuard(is3, annotations) {
  return new Filter2(
    (input, _ast, options) => is3(input) ? void 0 : new InvalidValue(void 0, input, options),
    annotations,
    true
    // after a guard, we always want to abort
  );
}
function isFinite2(annotations) {
  return makeFilter((n) => globalThis.Number.isFinite(n), {
    expected: "a finite number",
    representation: {
      id: "effect/schema/isFinite",
      payload: null
    },
    toJsonSchema: () => ({
      type: "number"
    }),
    toCode: () => ({
      runtime: "Schema.isFinite()"
    }),
    arbitraryConstraint: {
      number: "finite"
    },
    ...annotations
  });
}
var finite = /* @__PURE__ */ appendChecks(number2, [/* @__PURE__ */ isFinite2()]);
var numberToJson = /* @__PURE__ */ new Link(/* @__PURE__ */ new Union([finite, nonFiniteLiterals]), /* @__PURE__ */ new Transformation(/* @__PURE__ */ Number4(), /* @__PURE__ */ transform((n) => globalThis.Number.isFinite(n) ? n : globalThis.String(n))));
function isPattern(regExp, annotations) {
  const copy3 = new globalThis.RegExp(regExp);
  const payload = {
    source: copy3.source,
    flags: copy3.flags
  };
  return makeFilter((s) => {
    copy3.lastIndex = 0;
    return copy3.test(s);
  }, {
    expected: `a string matching the RegExp ${payload.source}`,
    representation: {
      id: "effect/schema/isPattern",
      payload
    },
    // Keep the filter exportable so its JSON Schema annotations are preserved
    // when the RegExp constraint itself is omitted.
    toJsonSchema: () => [{}, true],
    arbitraryConstraint: {
      patterns: [payload]
    },
    ...annotations
  });
}
var bodyOwners = /* @__PURE__ */ new WeakMap();
function copy2(ast, changes2) {
  const out = Object.assign(Object.create(Object.getPrototypeOf(ast)), ast, changes2);
  if (Reflect.ownKeys(changes2).every((key) => key === "context" || key === "encoding")) {
    bodyOwners.set(out, getContextOwner(ast));
  }
  return out;
}
function getContextOwner(ast) {
  const existing = bodyOwners.get(ast);
  if (existing !== void 0) return existing;
  if (ast.encoding === void 0) return ast;
  const owner = Object.assign(Object.create(Object.getPrototypeOf(ast)), ast, {
    encoding: void 0
  });
  bodyOwners.set(ast, owner);
  return owner;
}
function replaceEncoding(ast, encoding) {
  return ast.encoding === encoding ? ast : copy2(ast, {
    encoding
  });
}
function replaceContext(ast, context3) {
  if (ast.context === context3) {
    return ast;
  }
  const owner = getContextOwner(ast);
  if (owner.context === context3 && owner.encoding === ast.encoding) {
    return owner;
  }
  return copy2(ast, {
    context: context3
  });
}
function getLastEncoding(ast) {
  return ast.encoding ? getLastEncoding(ast.encoding[ast.encoding.length - 1].to) : ast;
}
function annotate(ast, annotations) {
  if (ast.checks) {
    const last = ast.checks[ast.checks.length - 1];
    return replaceChecks(ast, append(ast.checks.slice(0, -1), last.annotate(annotations)));
  }
  return copy2(ast, {
    annotations: {
      ...ast.annotations,
      ...annotations
    }
  });
}
function replaceChecks(ast, checks) {
  if (ast._tag === "Suspend" && checks) {
    throw new Error("Cannot add checks to Suspend");
  }
  if (ast.checks === checks) {
    return ast;
  }
  return copy2(ast, {
    checks
  });
}
function appendChecks(ast, checks) {
  return replaceChecks(ast, combineChecks(ast.checks, checks));
}
function mapLink(link2, f) {
  const to = f(link2.to);
  return to === link2.to ? link2 : new Link(to, link2.transformation);
}
function updateLastLink(encoding, f) {
  const links = encoding;
  const last = links[links.length - 1];
  const out = mapLink(last, f);
  return out === last ? encoding : append(encoding.slice(0, encoding.length - 1), out);
}
function applyToLastLink(f) {
  return (ast) => ast.encoding ? replaceEncoding(ast, updateLastLink(ast.encoding, f)) : ast;
}
function replaceContextLastLink(ast, context3) {
  return applyToLastLink((ast2) => replaceContext(ast2, context3))(ast);
}
function applyToSelfOrLastLinkEncodingIdempotent(f, options) {
  function out(ast) {
    if (ast.encoding) {
      const last = ast.encoding[ast.encoding.length - 1];
      return options?.stopAt?.(last) ? ast : replaceEncoding(ast, updateLastLink(ast.encoding, out));
    }
    return f(ast);
  }
  return memoizeIdempotent(out);
}
function middlewareDecoding(ast, middleware) {
  return appendTransformation(ast, middleware, toType(ast));
}
function middlewareEncoding(ast, middleware) {
  return appendTransformation(toEncoded(ast), middleware, ast);
}
function appendTransformation(from, transformation, to) {
  const link2 = new Link(from, transformation);
  return replaceEncoding(to, to.encoding ? [...to.encoding, link2] : [link2]);
}
function mapOrSame(as3, f) {
  let out;
  for (let i = 0; i < as3.length; i++) {
    const a = as3[i];
    const fa = f(a);
    if (out) {
      out[i] = fa;
    } else if (fa !== a) {
      out = new Array(as3.length);
      for (let j = 0; j < i; j++) {
        out[j] = as3[j];
      }
      out[i] = fa;
    }
  }
  return out ?? as3;
}
function annotateKey(ast, annotations) {
  const context3 = ast.context ? new Context(ast.context.isOptional, ast.context.isMutable, ast.context.constructorDefault, {
    ...ast.context.annotations,
    ...annotations
  }) : new Context(false, false, void 0, annotations);
  return replaceContext(ast, context3);
}
var optionalKey = /* @__PURE__ */ memoizeIdempotent((ast) => {
  const context3 = ast.context ? ast.context.isOptional === false ? new Context(true, ast.context.isMutable, ast.context.constructorDefault, ast.context.annotations) : ast.context : new Context(true, false);
  return optionalKeyLastLink(replaceContext(ast, context3));
});
var optionalKeyLastLink = /* @__PURE__ */ applyToLastLink(optionalKey);
var optional = /* @__PURE__ */ memoize((ast) => optionalKey(new Union([ast, undefined_3])));
var mutableKey = /* @__PURE__ */ memoizeIdempotent((ast) => {
  const context3 = ast.context ? ast.context.isMutable === false ? new Context(ast.context.isOptional, true, ast.context.constructorDefault, ast.context.annotations) : ast.context : new Context(false, true);
  return mutableKeyLastLink(replaceContext(ast, context3));
});
var mutableKeyLastLink = /* @__PURE__ */ applyToLastLink(mutableKey);
function withConstructorDefault(ast, defaultValue) {
  const context3 = ast.context ? new Context(ast.context.isOptional, ast.context.isMutable, defaultValue, ast.context.annotations) : new Context(false, false, defaultValue);
  return replaceContext(ast, context3);
}
function decodeTo(from, to, transformation) {
  return appendTransformation(from, transformation, to);
}
function parseParameter(ast) {
  const literals = [];
  const parameters = [];
  function go(ast2) {
    switch (ast2._tag) {
      case "Literal":
        if (isPropertyKey(ast2.literal) && !literals.includes(ast2.literal)) {
          literals.push(ast2.literal);
        }
        return;
      case "UniqueSymbol":
        if (!literals.includes(ast2.symbol)) {
          literals.push(ast2.symbol);
        }
        return;
      case "Never":
        return;
      case "Union":
        for (let i = 0; i < ast2.types.length; i++) {
          go(ast2.types[i]);
        }
        return;
      default:
        parameters.push(ast2);
    }
  }
  go(ast);
  return {
    literals,
    parameters
  };
}
function record(key, value3) {
  const {
    literals,
    parameters: indexSignatures
  } = parseParameter(key);
  return new Objects(literals.map((literal) => new PropertySignature(literal, value3)), indexSignatures.map((parameter) => new IndexSignature(parameter, value3)));
}
function isOptional(ast) {
  return ast.context?.isOptional ?? false;
}
function isMutable(ast) {
  return ast.context?.isMutable ?? false;
}
function isStructuralCheck(check2) {
  return check2.annotations?.[STRUCTURAL_ANNOTATION_KEY] === true || check2._tag === "FilterGroup" && check2.checks.every(isStructuralCheck);
}
function extractStructuralChecks(checks) {
  function extract(check2) {
    if (isStructuralCheck(check2)) return [check2];
    return check2._tag === "FilterGroup" ? check2.checks.flatMap(extract) : [];
  }
  const out = checks.flatMap(extract);
  return isArrayNonEmpty2(out) ? out : void 0;
}
function canPreserveEncodingChecks(ast) {
  let preserve = true;
  function visit(child) {
    preserve = preserve && !child.encoding && !isSuspend(child);
    if (preserve && "recur" in child) child.recur(visit);
    return child;
  }
  if ("recur" in ast) ast.recur(visit);
  return preserve;
}
var toType = /* @__PURE__ */ memoizeIdempotent((ast) => {
  const owner = getContextOwner(ast);
  if (owner !== ast) {
    const type2 = toType(owner);
    return type2 === owner && ast.encoding === void 0 ? ast : replaceContext(type2, ast.context);
  }
  const type = "recur" in ast ? ast.recur(toType) : ast;
  if ("encodingChecks" in type && type.encodingChecks) {
    const checks = canPreserveEncodingChecks(ast) ? type.encodingChecks : isArrays(type) || isObjects(type) || isDeclaration(type) && type.typeParameters.length > 0 ? extractStructuralChecks(type.encodingChecks) : void 0;
    return copy2(type, {
      encodingChecks: void 0,
      checks: combineChecks(type.checks, checks)
    });
  }
  return type;
});
var toEncoded = /* @__PURE__ */ memoizeIdempotent((ast) => {
  return toType(flip4(ast));
});
function flipEncoding(ast, encoding) {
  const links = encoding;
  const len = links.length;
  const last = links[len - 1];
  const ls = [new Link(flip4(replaceEncoding(ast, void 0)), links[0].transformation.flip())];
  for (let i = 1; i < len; i++) {
    ls.unshift(new Link(flip4(links[i - 1].to), links[i].transformation.flip()));
  }
  const to = flip4(last.to);
  if (to.encoding) {
    return replaceEncoding(to, [...to.encoding, ...ls]);
  } else {
    return replaceEncoding(to, ls);
  }
}
var flip4 = /* @__PURE__ */ memoize((ast) => {
  if (ast.encoding) {
    return flipEncoding(ast, ast.encoding);
  }
  const owner = getContextOwner(ast);
  if (owner !== ast) {
    const flipped = flip4(owner);
    return flipped === owner ? ast : replaceContext(flipped, ast.context);
  }
  return "flip" in ast ? ast.flip(flip4) : "recur" in ast ? ast.recur(flip4) : ast;
});
function containsUndefined(ast) {
  switch (ast._tag) {
    case "Undefined":
      return true;
    case "Union":
      return ast.types.some(containsUndefined);
    default:
      return false;
  }
}
function fromConst(ast, value3) {
  const succeed8 = value3 === 0 ? sameExit : succeed7(value3);
  return (input, options) => {
    if (input === missing) return missingExit;
    if (input === value3) return succeed8;
    return fail5(new InvalidType(ast, input, options));
  };
}
function fromRefinement(ast, refinement) {
  return (input, options) => {
    if (input === missing) return missingExit;
    if (refinement(input)) return sameExit;
    return fail5(new InvalidType(ast, input, options));
  };
}
function segmentTemplateLiteralParts(ast, input, options) {
  const parts2 = ast.encodedParts;
  const literals = ast.literals;
  const inputLength = input.length;
  for (let i = 0; i < literals.length; i++) {
    const literal = literals[i];
    if (literal && !input.includes(literal)) return void 0;
  }
  if (ast.suffixLengths[0] > inputLength) return void 0;
  const out = new Array(parts2.length);
  let failures;
  function go(i, pos) {
    if (i === parts2.length) return pos === inputLength;
    if (failures?.has(i * (inputLength + 1) + pos)) return false;
    const part = parts2[i];
    if (i === parts2.length - 1) {
      const s = input.slice(pos);
      if (part.matchPart(s, options) !== void 0) {
        out[i] = s;
        return true;
      }
    } else if (part._tag === "Literal") {
      const s = literals[i];
      if (input.startsWith(s, pos) && go(i + 1, pos + s.length)) {
        out[i] = s;
        return true;
      }
    } else {
      const maximumEnd = inputLength - ast.suffixLengths[i + 1];
      const anchor = literals[i + 1];
      let end2 = anchor === void 0 ? maximumEnd : input.lastIndexOf(anchor, maximumEnd);
      while (end2 >= pos) {
        const s = input.slice(pos, end2);
        if (part.matchPart(s, options) !== void 0 && go(i + 1, end2)) {
          out[i] = s;
          return true;
        }
        if (end2 === 0) break;
        end2 = anchor === void 0 ? end2 - 1 : input.lastIndexOf(anchor, end2 - 1);
      }
    }
    failures ??= /* @__PURE__ */ new Set();
    failures.add(i * (inputLength + 1) + pos);
    return false;
  }
  return go(0, 0) ? out : void 0;
}
var parameterFromPropertyKey = /* @__PURE__ */ applyToSelfOrLastLinkEncodingIdempotent((ast) => {
  switch (ast._tag) {
    default:
      return ast;
    case "Number":
      return ast.toCodecStringTree();
    case "Union":
      return ast.recur(parameterFromPropertyKey);
  }
});
var parameterFromString = /* @__PURE__ */ applyToSelfOrLastLinkEncodingIdempotent((ast) => {
  switch (ast._tag) {
    default:
      return ast;
    case "Symbol":
    case "UniqueSymbol":
      return ast.toCodecStringTree();
    case "Union":
      return ast.recur(parameterFromString);
  }
});
var partFromString = /* @__PURE__ */ applyToSelfOrLastLinkEncodingIdempotent((ast) => {
  switch (ast._tag) {
    default:
      return ast;
    case "Number":
    case "Literal":
    case "BigInt":
      return ast.toCodecStringTree();
    case "Union":
      return ast.recur(partFromString);
  }
});
var STRING_PATTERN = "[\\s\\S]*?";
var isStringFiniteRegExp = /* @__PURE__ */ new globalThis.RegExp(`^${FINITE_PATTERN}$`);
var isStringNumberRegExp = /* @__PURE__ */ new globalThis.RegExp(`^(?:${FINITE_PATTERN}|Infinity|-Infinity|NaN)$`);
function isStringFinite(annotations) {
  return isPattern(isStringFiniteRegExp, {
    expected: "a string representing a finite number",
    representation: {
      id: "effect/schema/isStringFinite",
      payload: null
    },
    toJsonSchema: () => ({
      pattern: isStringFiniteRegExp.source
    }),
    ...annotations
  });
}
var finiteString = /* @__PURE__ */ appendChecks(string2, [/* @__PURE__ */ isStringFinite()]);
var finiteToString = /* @__PURE__ */ new Link(finiteString, numberFromString);
var numberToString = /* @__PURE__ */ new Link(/* @__PURE__ */ new Union([finiteString, nonFiniteLiterals]), numberFromString);
var BIGINT_PATTERN = "-?\\d+";
var isStringBigIntRegExp = /* @__PURE__ */ new globalThis.RegExp(`^${BIGINT_PATTERN}$`);
function isStringBigInt(annotations) {
  return isPattern(isStringBigIntRegExp, {
    expected: "a string representing a bigint",
    representation: {
      id: "effect/schema/isStringBigInt",
      payload: null
    },
    toJsonSchema: () => ({
      pattern: isStringBigIntRegExp.source
    }),
    ...annotations
  });
}
var bigIntString = /* @__PURE__ */ appendChecks(string2, [/* @__PURE__ */ isStringBigInt({
  expected: "a string representing a bigint"
})]);
var bigIntToString = /* @__PURE__ */ new Link(bigIntString, bigintFromString);
var REGEXP_PATTERN = "Symbol\\(([\\s\\S]*)\\)";
var isStringSymbolRegExp = /* @__PURE__ */ new globalThis.RegExp(`^${REGEXP_PATTERN}$`);
var symbolString = /* @__PURE__ */ appendChecks(string2, [/* @__PURE__ */ isStringSymbol()]);
var symbolToString = /* @__PURE__ */ new Link(symbolString, /* @__PURE__ */ new Transformation(/* @__PURE__ */ transform((description) => globalThis.Symbol.for(isStringSymbolRegExp.exec(description)[1])), /* @__PURE__ */ transformEffect((sym, options) => {
  const key = globalThis.Symbol.keyFor(sym);
  if (key !== void 0) {
    return succeed6(globalThis.String(sym));
  }
  return fail5(new Forbidden({
    message: "cannot serialize to string, Symbol is not registered"
  }, sym, options));
})));
function isStringSymbol(annotations) {
  return isPattern(isStringSymbolRegExp, {
    expected: "a string representing a symbol",
    representation: {
      id: "effect/schema/isStringSymbol",
      payload: null
    },
    toJsonSchema: () => ({
      pattern: isStringSymbolRegExp.source
    }),
    ...annotations
  });
}
function collectIssues(checks, value3, issues, ast, options) {
  for (let i = 0; i < checks.length; i++) {
    const check2 = checks[i];
    if (check2._tag === "FilterGroup") {
      issues = collectIssues(check2.checks, value3, issues, ast, options);
      if (issues && (options.errors !== "all" || issues[issues.length - 1].filter.aborted)) {
        return issues;
      }
    } else {
      const issue = check2.run(value3, ast, options);
      if (issue) {
        const filter8 = new Filter(check2, issue, value3, options);
        if (issues) issues.push(filter8);
        else issues = [filter8];
        if (options.errors !== "all" || check2.aborted) {
          return issues;
        }
      }
    }
  }
  return issues;
}
function runChecks(checks, s) {
  const issues = collectIssues(checks, s, void 0, unknown, {
    errors: "all"
  });
  if (issues) {
    const issue = new Composite(unknown, issues);
    return fail2(issue);
  }
  return succeed2(s);
}
function getConstructorDescriptor(ast) {
  if (!isDeclaration(ast)) return void 0;
  const getDescriptor = ast.annotations?.[CONSTRUCTOR_ANNOTATION_KEY];
  return isFunction(getDescriptor) ? getDescriptor(ast.typeParameters) : void 0;
}
function isJsonLeaf(u) {
  return u === null || typeof u === "string" || typeof u === "boolean" || typeof u === "number" && globalThis.Number.isFinite(u);
}
function isStringTreeLeaf(u) {
  return u === void 0 || typeof u === "string";
}
function isTree(u, isLeaf) {
  const cache2 = /* @__PURE__ */ new WeakMap();
  const stack = [];
  outer: while (true) {
    if (typeof u !== "object" || u === null) {
      if (!isLeaf(u)) {
        return false;
      }
    } else {
      const value3 = u;
      const cached3 = cache2.get(value3);
      if (cached3 === false) {
        return false;
      }
      if (cached3 === void 0) {
        const isArray2 = Array.isArray(value3);
        if (!isArray2) {
          const prototype = Object.getPrototypeOf(value3);
          if (prototype !== null && prototype !== Object.prototype && Object.getPrototypeOf(prototype) !== null) {
            return false;
          }
        }
        cache2.set(value3, false);
        stack.push({
          value: value3,
          keys: isArray2 ? value3.length : Object.keys(value3),
          index: 0
        });
      }
    }
    while (stack.length > 0) {
      const frame = stack[stack.length - 1];
      const keys3 = frame.keys;
      if (typeof keys3 === "number") {
        if (frame.index < keys3) {
          u = frame.value[frame.index++];
          continue outer;
        }
      } else if (frame.index < keys3.length) {
        u = frame.value[keys3[frame.index++]];
        continue outer;
      }
      cache2.set(frame.value, true);
      stack.pop();
    }
    return true;
  }
}
function isJson(u) {
  return isTree(u, isJsonLeaf);
}
var Json = /* @__PURE__ */ new Declaration([], () => (input, ast, options) => isJson(input) ? sameExit : fail5(new InvalidType(ast, input, options)), {
  representation: {
    id: "effect/schema/Json",
    payload: null
  },
  expected: "JSON value",
  toCodecJson: () => void 0,
  toCodecStringTree: () => unknownToStringTree
});
var MutableJson = /* @__PURE__ */ annotate(Json, {
  representation: {
    id: "effect/schema/MutableJson",
    payload: null
  }
});
var unknownToJson = /* @__PURE__ */ new Link(Json, /* @__PURE__ */ passthrough3());
var objectKeywordToJson = /* @__PURE__ */ new Link(/* @__PURE__ */ new Union([/* @__PURE__ */ new Arrays(false, [], [Json]), /* @__PURE__ */ new Objects([], [/* @__PURE__ */ new IndexSignature(string2, Json)])]), /* @__PURE__ */ passthrough3());
function isStringTree(u) {
  return isTree(u, isStringTreeLeaf);
}
var StringTree = /* @__PURE__ */ new Declaration([], () => (input, ast, options) => isStringTree(input) ? sameExit : fail5(new InvalidType(ast, input, options)), {
  expected: "StringTree",
  toCodecStringTree: () => void 0
});
var unknownToStringTree = /* @__PURE__ */ new Link(StringTree, /* @__PURE__ */ passthrough3());

// node_modules/effect/dist/internal/schema/interpreter.js
var flatMapTransformation = (result3, current, f) => result3 === sameExit ? f(current) : flatMapEager2(result3, f);
function compileTransformation(transformation) {
  if (transformation._tag === "Middleware") {
    return (result3, current, options) => {
      const transformed = result3 === sameExit ? transformation.decode(succeed7(toOption(current)), options) : transformation.decode(mapEager2(result3, toOption), options);
      return fromOptionalEffect(transformed);
    };
  }
  const getter = transformation.decode;
  switch (getter._tag) {
    case "Passthrough":
      return (result3, current) => result3 === sameExit ? succeed7(current) : result3;
    case "Transform": {
      const transform3 = (value3) => value3 === missing ? missingExit : succeed7(getter.transform(value3));
      return (result3, current) => flatMapTransformation(result3, current, transform3);
    }
    case "TransformOptional": {
      const transform3 = (value3) => fromOptionExit(getter.transform(toOption(value3)));
      return (result3, current) => flatMapTransformation(result3, current, transform3);
    }
    case "TransformEffect":
      return (result3, current, options) => flatMapTransformation(result3, current, (value3) => value3 === missing ? missingExit : getter.transform(value3, options));
    case "TransformOptionalEffect":
      return (result3, current, options) => flatMapTransformation(result3, current, (value3) => fromOptionalEffect(getter.transform(toOption(value3), options)));
  }
}
var fromOptionalEffect = (effect2) => flatMapEager2(effect2, fromOptionExit);
var wrapEncoding = (ast, input, options, effect2) => catchCause3(effect2, (cause) => failCauseSync2(() => map6(cause, (issue) => new Encoding(ast, issue, input, options))));
function makeConstructorParser(descriptor, compile2) {
  const transform3 = compileTransformation(descriptor.link.transformation);
  let sourceParser;
  return (input, options) => {
    if (input === missing) return missingExit;
    if (descriptor.isConstructed(input)) return sameExit;
    const result3 = (sourceParser ??= compile2(descriptor.link.to))(input, options);
    return transform3(result3, input, options);
  };
}
function withDefault2(ast, parser) {
  const defaultValue = ast.context.constructorDefault;
  return (input, options) => {
    if (input !== missing && input !== void 0) return parser(input, options);
    const result3 = defaultValue;
    if (effectIsExit(result3) && result3._tag === "Success") {
      const local = parser(result3[args], options);
      return local === sameExit ? result3 : local;
    }
    return flatMapEager2(wrapEncoding(ast, input, options, result3), (value3) => {
      const local = parser(value3, options);
      return local === sameExit ? succeed7(value3) : local;
    });
  };
}
function compileField(ast, compile2) {
  const parser = compile2(ast);
  return ast.context?.constructorDefault === void 0 ? parser : withDefault2(ast, parser);
}
function compile(ast, compile2, compileField2, base, specialize) {
  if (ast._tag === "Declaration") {
    for (const parameter of ast.typeParameters) compile2(parameter);
  }
  const descriptor = compileField2 ? getConstructorDescriptor(ast) : void 0;
  const parser = descriptor ? makeConstructorParser(descriptor, compile2) : base ?? ast.getParser(compile2, compileField2);
  const checks = ast.checks;
  const links = ast.encoding;
  const transformations = links?.map((link2) => compileTransformation(link2.transformation));
  const encodingChecks = ast.encodingChecks;
  if (!links && !checks && !encodingChecks) {
    return parser;
  }
  let encodingParsers;
  const parseChecks = (input, options) => {
    let result3 = parser(input, options);
    if (encodingChecks && !options.disableChecks) {
      if (effectIsExit(result3)) {
        if (result3._tag === "Success") {
          const output = result3 === sameExit ? input : result3[args];
          if (input !== missing && output !== missing) {
            const issues = collectIssues(encodingChecks, input, void 0, ast, options);
            if (issues) {
              result3 = fail5(new Composite(ast, issues, input, options));
            }
          }
        }
      } else {
        result3 = flatMap5(result3, (value3) => {
          if (input !== missing && value3 !== missing) {
            const issues = collectIssues(encodingChecks, input, void 0, ast, options);
            if (issues) {
              return fail5(new Composite(ast, issues, input, options));
            }
          }
          return succeed6(value3);
        });
      }
    }
    if (checks && !options.disableChecks) {
      if (effectIsExit(result3)) {
        if (result3._tag === "Success") {
          const value3 = result3 === sameExit ? input : result3[args];
          if (value3 === missing) return result3;
          const issues = collectIssues(checks, value3, void 0, ast, options);
          if (issues) {
            result3 = fail5(new Composite(ast, issues, value3, options));
          }
        }
      } else {
        result3 = flatMap5(result3, (value3) => {
          if (value3 !== missing) {
            const issues = collectIssues(checks, value3, void 0, ast, options);
            if (issues) {
              return fail5(new Composite(ast, issues, value3, options));
            }
          }
          return succeed6(value3);
        });
      }
    }
    return result3;
  };
  const parseLocal = specialize === void 0 ? parseChecks : specialize(parseChecks);
  if (!links) {
    return parseLocal;
  }
  return (input, options) => {
    const parsers = encodingParsers ??= links.map((link2) => compile2(link2.to));
    let current = input;
    let result3 = parsers[parsers.length - 1](input, options);
    for (let i = links.length - 1; i >= 0; i--) {
      result3 = transformations[i](result3, current, options);
      if (i !== 0) {
        const next = parsers[i - 1];
        if (result3._tag === "Success") {
          current = result3[args];
          result3 = next(current, options);
        } else {
          result3 = flatMapEager2(result3, (value3) => {
            const nextResult = next(value3, options);
            return nextResult === sameExit ? succeed7(value3) : nextResult;
          });
        }
      }
    }
    if (result3._tag === "Success") {
      const value3 = result3[args];
      const local = parseLocal(value3, options);
      return local === sameExit ? result3 : local;
    }
    result3 = wrapEncoding(ast, input, options, result3);
    return flatMapEager2(result3, (value3) => {
      const local = parseLocal(value3, options);
      return local === sameExit ? succeed7(value3) : local;
    });
  };
}

// node_modules/effect/dist/internal/schema/compilerRegistry.js
var invalid3 = /* @__PURE__ */ Symbol();
var cache = /* @__PURE__ */ new WeakMap();
var compiler;
var compilerAdaptersEnabled = false;
var decodeChild = (ast) => compilerAdaptersEnabled ? lazyParser(resolve2, ast, "parser") : resolve2(ast).parser;
var makeChild = (ast) => compilerAdaptersEnabled ? lazyParser(resolve2, ast, "makeEffect") : resolve2(ast).makeEffect;
var makeField = (ast) => compileField(ast, makeChild);
var InterpretedEntry = class {
  ast;
  constructor(ast) {
    this.ast = ast;
  }
  get decodeEffect() {
    return this.cachedDecodeEffect ??= compile(this.ast, decodeChild);
  }
  get parser() {
    return this.decodeEffect;
  }
  get makeEffect() {
    return this.cachedMakeEffect ??= compile(this.ast, makeChild, makeField);
  }
};
var CompilerEntry = class extends InterpretedEntry {
  compiled;
  resolve;
  constructor(ast, compiled, resolve7) {
    super(ast);
    this.compiled = compiled;
    this.resolve = resolve7;
  }
  save(key, value3) {
    Object.defineProperty(this, key, {
      value: value3
    });
    return value3;
  }
  operation(key) {
    const compiled = this.compiled;
    return typeof compiled === "function" ? compiled(this.ast, this.resolve, key) : compiled?.[key];
  }
  get is() {
    return this.save("is", this.operation("is"));
  }
  get decode() {
    return this.save("decode", this.operation("decode"));
  }
  get make() {
    return this.save("make", this.operation("make"));
  }
  get decodeEffect() {
    return this.save("decodeEffect", this.operation("decodeEffect") ?? compile(this.ast, (ast) => lazyParser(this.resolve, ast, "parser")));
  }
  get parser() {
    const decode6 = this.decode;
    return decode6 === void 0 ? this.decodeEffect : this.save("parser", withDecode(decode6, () => this.decodeEffect));
  }
  get makeEffect() {
    const makeEffect2 = this.operation("makeEffect");
    if (makeEffect2 !== void 0) return this.save("makeEffect", makeEffect2);
    const child = (ast) => lazyParser(this.resolve, ast, "makeEffect");
    return this.save("makeEffect", compile(this.ast, child, (ast) => compileField(ast, child)));
  }
};
function withDecode(fastDecode, decodeEffect3) {
  let detailed;
  return (input, options) => {
    if (input !== missing) {
      try {
        const value3 = fastDecode(input, options);
        if (value3 !== invalid3) return value3 === input ? sameExit : succeed7(value3);
      } catch (error) {
        return die3(error);
      }
    }
    return (detailed ??= decodeEffect3())(input, options);
  };
}
function lazyParser(resolve7, ast, operation) {
  const entry = resolve7(ast);
  if (entry.compiled === void 0 || Object.hasOwn(entry, operation)) {
    return entry[operation];
  }
  let parser;
  return (input, options) => (parser ??= entry[operation])(input, options);
}
function resolve2(ast) {
  const cached3 = cache.get(ast);
  if (cached3 !== void 0) return cached3;
  const entry = compiler === void 0 ? new InterpretedEntry(ast) : new CompilerEntry(ast, compiler(ast, resolve2), resolve2);
  cache.set(ast, entry);
  return entry;
}

// node_modules/effect/dist/SchemaParser.js
function makeEffect(schema) {
  const ast = schema.ast;
  let parser;
  return (input, options) => {
    return (parser ??= runWithCompiler(constructorCompiler, toType(ast)))(input, options?.disableChecks ? options?.parseOptions ? {
      ...options.parseOptions,
      disableChecks: true
    } : {
      disableChecks: true
    } : options?.parseOptions);
  };
}
function makeOption(schema) {
  const parser = makeEffect(schema);
  return (input, options) => {
    const exit4 = runSyncExit2(parser(input, options));
    if (isSuccess4(exit4)) {
      return some2(exit4.value);
    }
    getSchemaIssueOrThrow(exit4.cause, "Option adapter can only return none for schema issues");
    return none2();
  };
}
function make15(schema) {
  return makeConstructorSync(toType(schema.ast));
}
function is(schema) {
  return _is(schema.ast);
}
function makeIs(ast) {
  if (!compilerAdaptersEnabled) {
    const parser2 = asExit(run(ast));
    return (input) => {
      const exit4 = parser2(input, defaultParseOptions);
      if (isSuccess4(exit4)) return true;
      getSchemaIssueOrThrow(exit4.cause, "Type guard adapter can only return false for schema issues");
      return false;
    };
  }
  const entry = resolve2(ast);
  const guard = entry.is;
  if (guard !== void 0) {
    return (input) => {
      try {
        return guard(input, defaultParseOptions);
      } catch (error) {
        getSchemaIssueOrThrow(die2(error), "Type guard adapter can only return false for schema issues");
        return false;
      }
    };
  }
  const parser = entry.parser;
  return (input) => {
    const exit4 = runSyncExit2(parserResult(parser(input, defaultParseOptions), input));
    if (isSuccess4(exit4)) return true;
    getSchemaIssueOrThrow(exit4.cause, "Type guard adapter can only return false for schema issues");
    return false;
  };
}
function _is(ast) {
  const typeAST = toType(ast);
  let guard = (input) => {
    guard = makeIs(typeAST);
    return guard(input);
  };
  return (input) => {
    return guard(input);
  };
}
function _issue(ast) {
  const parser = run(ast);
  return (input, options) => {
    const exit4 = runSyncExit2(parser(input, options));
    if (isSuccess4(exit4)) {
      return void 0;
    }
    return getSchemaIssueOrThrow(exit4.cause, "Issue adapter can only return schema issues");
  };
}
function asserts(schema, input) {
  const ast = toType(schema.ast);
  const result3 = resolve2(ast).parser(input, defaultParseOptions);
  const exit4 = runSyncExit2(parserResult(result3, input));
  if (isFailure4(exit4)) {
    const issue = getSchemaIssueOrThrow(exit4.cause, "Assertion adapter can only throw schema issues");
    throw new Error("Schema validation failed", {
      cause: issue
    });
  }
}
function decodeUnknownEffect(schema, options) {
  const parser = run(schema.ast);
  return options === void 0 ? parser : (input, overrideOptions) => parser(input, mergeParseOptions(options, overrideOptions));
}
var decodeEffect = decodeUnknownEffect;
function decodeUnknownExit(schema, options) {
  return asExit(decodeUnknownEffect(schema, options));
}
function decodeUnknownOption(schema, options) {
  return asOption(decodeUnknownEffect(schema, options));
}
var decodeOption = decodeUnknownOption;
function decodeUnknownResult(schema, options) {
  return asResult(decodeUnknownEffect(schema, options));
}
function decodeUnknownSync(schema, options) {
  return compilerAdaptersEnabled ? makeSync(schema.ast, options) : asSync(decodeUnknownEffect(schema, options));
}
var decodeSync = decodeUnknownSync;
function encodeUnknownEffect(schema, options) {
  const parser = run(flip4(schema.ast));
  return options === void 0 ? parser : (input, overrideOptions) => parser(input, mergeParseOptions(options, overrideOptions));
}
var encodeEffect = encodeUnknownEffect;
function encodeUnknownExit(schema, options) {
  return asExit(encodeUnknownEffect(schema, options));
}
function encodeUnknownOption(schema, options) {
  return asOption(encodeUnknownEffect(schema, options));
}
var encodeOption = encodeUnknownOption;
function encodeUnknownResult(schema, options) {
  return asResult(encodeUnknownEffect(schema, options));
}
function encodeUnknownSync(schema, options) {
  return compilerAdaptersEnabled ? makeSync(flip4(schema.ast), options) : asSync(encodeUnknownEffect(schema, options));
}
var encodeSync = encodeUnknownSync;
var mergeParseOptions = (options, overrideOptions) => overrideOptions ? {
  ...options,
  ...overrideOptions
} : options;
var getValue = (value3) => {
  if (value3 === missing) {
    return fail5(new InvalidValue());
  }
  return succeed6(value3);
};
function run(ast) {
  return runWithCompiler(normalCompiler, ast);
}
function parserResult(result3, input) {
  if (result3 === sameExit) {
    return succeed6(input);
  }
  if (!effectIsExit(result3)) {
    return flatMapEager2(result3, getValue);
  }
  return result3[args] === missing ? getValue(missing) : result3;
}
function runWithCompiler(compiler2, ast) {
  let parser;
  return (input, options) => {
    const result3 = (parser ??= compiler2(ast))(input, options ?? defaultParseOptions);
    if (result3 === sameExit) {
      return succeed6(input);
    }
    if (!effectIsExit(result3)) {
      return flatMapEager2(result3, getValue);
    }
    return result3[args] === missing ? getValue(missing) : result3;
  };
}
function asExit(parser) {
  return (input, options) => runSyncExit2(parser(input, options));
}
function asOption(parser) {
  const parserExit = asExit(parser);
  return (input, options) => {
    const exit4 = parserExit(input, options);
    if (isSuccess4(exit4)) {
      return some2(exit4.value);
    }
    getSchemaIssueOrThrow(exit4.cause, "Option adapter can only return none for schema issues");
    return none2();
  };
}
function asResult(parser) {
  const parserExit = asExit(parser);
  return (input, options) => {
    const exit4 = parserExit(input, options);
    if (isSuccess4(exit4)) {
      return succeed2(exit4.value);
    }
    return fail2(getSchemaIssueOrThrow(exit4.cause, "Result adapter can only return schema issues"));
  };
}
function makeSync(ast, options) {
  let run2;
  return (input, overrideOptions) => (run2 ??= makeSyncEntry(resolve2(ast), options))(input, overrideOptions);
}
function makeSyncEntry(entry, options) {
  const decode6 = entry.decode;
  let detailed;
  const run2 = decode6 === void 0 ? (input, parseOptions = defaultParseOptions) => (detailed ??= makeDetailedSync(entry))(input, parseOptions) : (input, parseOptions = defaultParseOptions) => {
    if (input === missing) {
      return (detailed ??= makeDetailedSync(entry))(input, parseOptions);
    }
    let output;
    try {
      output = decode6(input, parseOptions);
    } catch (error) {
      getSchemaIssueOrThrow(die2(error), "Sync adapter can only throw schema issues");
      throw error;
    }
    if (output !== invalid3) return output;
    return (detailed ??= makeDetailedSync(entry))(input, parseOptions);
  };
  return options === void 0 ? run2 : (input, overrideOptions) => run2(input, mergeParseOptions(options, overrideOptions));
}
function makeDetailedSync(entry) {
  return asSync(runWithCompiler(() => entry.decodeEffect, entry.ast));
}
function asSync(parser) {
  const parserExit = asExit(parser);
  return (input, options) => {
    const exit4 = parserExit(input, options);
    if (isSuccess4(exit4)) {
      return exit4.value;
    }
    const issue = getSchemaIssueOrThrow(exit4.cause, "Sync adapter can only throw schema issues");
    throw new Error("Schema validation failed", {
      cause: issue
    });
  };
}
function runSync3(effect2, message) {
  const exit4 = runSyncExit2(effect2);
  if (isSuccess4(exit4)) {
    return exit4.value;
  }
  const issue = getSchemaIssueOrThrow(exit4.cause, message);
  throw new Error("Schema validation failed", {
    cause: issue
  });
}
function makeConstructorSync(ast) {
  let entry;
  let parser;
  return (input, options) => {
    entry ??= resolve2(ast);
    const parseOptions = options?.disableChecks ? options.parseOptions ? {
      ...options.parseOptions,
      disableChecks: true
    } : {
      disableChecks: true
    } : options?.parseOptions ?? defaultParseOptions;
    const make24 = entry.make;
    if (make24 !== void 0 && input !== missing) {
      let output;
      try {
        output = make24(input, parseOptions);
      } catch (error) {
        getSchemaIssueOrThrow(die2(error), "Constructor adapter can only throw schema issues");
        throw error;
      }
      if (output !== invalid3 && output !== missing) return output;
    }
    const result3 = (parser ??= entry.makeEffect)(input, parseOptions);
    return runSync3(parserResult(result3, input), "Constructor adapter can only throw schema issues");
  };
}
var normalCompiler = (ast) => resolve2(ast).parser;
var constructorCompiler = (ast) => resolve2(ast).makeEffect;

// node_modules/effect/dist/internal/schema/make.js
var TypeId24 = "~effect/Schema/Schema";
var RebuildOptions = /* @__PURE__ */ Symbol();
var SchemaProto = {
  [TypeId24]: TypeId24,
  get make() {
    const value3 = make15(this);
    Object.defineProperty(this, "make", {
      value: value3,
      enumerable: true
    });
    return value3;
  },
  get makeEffect() {
    const value3 = makeEffect(this);
    Object.defineProperty(this, "makeEffect", {
      value: value3,
      enumerable: true
    });
    return value3;
  },
  get makeOption() {
    const value3 = makeOption(this);
    Object.defineProperty(this, "makeOption", {
      value: value3,
      enumerable: true
    });
    return value3;
  },
  pipe() {
    return pipeArguments(this, arguments);
  },
  annotate(annotations) {
    return this.rebuild(annotate(this.ast, annotations));
  },
  annotateKey(annotations) {
    return this.rebuild(annotateKey(this.ast, annotations));
  },
  check(...checks) {
    return this.rebuild(appendChecks(this.ast, checks));
  },
  rebuild(ast) {
    return make16(ast, this[RebuildOptions]);
  }
};
function make16(ast, options) {
  function Schema() {
  }
  const self = Object.setPrototypeOf(Schema, SchemaProto);
  if (options && (Object.hasOwn(options, "name") || Object.hasOwn(options, "length") || Object.hasOwn(options, "__proto__"))) {
    Object.defineProperties(self, Object.getOwnPropertyDescriptors({
      ...options
    }));
  } else {
    Object.assign(self, options);
  }
  self[RebuildOptions] = options;
  self.ast = ast;
  return self;
}

// node_modules/effect/dist/JsonPointer.js
function escapeToken(token) {
  return token.replace(/~/g, "~0").replace(/\//g, "~1");
}
function unescapeToken(token) {
  return token.replace(/~1/g, "/").replace(/~0/g, "~");
}
function formatUriFragmentToken(token) {
  return encodeURI(escapeToken(token)).replace(/#/g, "%23");
}
function decodeUriFragment(fragment) {
  if (fragment.length === 0 || fragment === "#") return "";
  if (!fragment.startsWith("#")) return void 0;
  const encoded = fragment.slice(1);
  try {
    if (encodeURI(encoded).replace(/%25/g, "%").replace(/#/g, "%23") !== encoded) return void 0;
    const pointer = decodeURIComponent(encoded);
    return pointer.startsWith("/") && !/~(?:[^01]|$)/.test(pointer) ? pointer : void 0;
  } catch {
    return void 0;
  }
}
function parseUriFragment(fragment) {
  const pointer = decodeUriFragment(fragment);
  return pointer === void 0 ? void 0 : pointer.length === 0 ? [] : pointer.slice(1).split("/").map(unescapeToken);
}
function formatUriFragment(path) {
  return path.reduce((fragment, token) => `${fragment}/${formatUriFragmentToken(token)}`, "#");
}

// node_modules/effect/dist/JsonSchema.js
var META_SCHEMA_URI_DRAFT_07 = "http://json-schema.org/draft-07/schema#";
var META_SCHEMA_URI_DRAFT_2020_12 = "https://json-schema.org/draft/2020-12/schema";
function isMetaSchemaUri(value3, uri) {
  return value3 === uri || value3 === (uri.endsWith("#") ? uri.slice(0, -1) : `${uri}#`);
}
function toDocumentDraft07(document) {
  return {
    dialect: "draft-07",
    ...convertDocument(document, draft07Adapter)
  };
}
function transformSchema(node, transform3) {
  return walk2(node, false, true);
  function walk2(node2, inheritedResource, isRoot = false) {
    if (!isObject(node2)) return node2;
    const inEmbeddedResource = inheritedResource || !isRoot && createsResource(node2.$id);
    const out = {};
    for (const key of Object.keys(node2)) {
      const value3 = node2[key];
      let transformed = value3;
      switch (key) {
        case "$defs":
        case "properties":
        case "patternProperties":
        case "dependentSchemas":
          transformed = mapObject(value3, (value4) => walk2(value4, inEmbeddedResource)) ?? value3;
          break;
        case "allOf":
        case "anyOf":
        case "oneOf":
        case "prefixItems":
          transformed = Array.isArray(value3) ? value3.map((value4) => walk2(value4, inEmbeddedResource)) : value3;
          break;
        case "not":
        case "additionalProperties":
        case "propertyNames":
        case "unevaluatedProperties":
        case "items":
        case "contains":
        case "unevaluatedItems":
        case "if":
        case "then":
        case "else":
        case "contentSchema":
          transformed = walk2(value3, inEmbeddedResource);
      }
      assignProperty(out, key, transformed);
    }
    transform3(out, inEmbeddedResource);
    return out;
  }
}
function rewriteRefs(schema, rewrite) {
  return transformSchema(schema, (schema2) => {
    rewriteSchemaRef(schema2, rewrite);
  });
}
function rewriteSchemaRef(schema, rewrite) {
  if (typeof schema.$ref === "string") {
    assignProperty(schema, "$ref", rewrite(schema.$ref, "$ref"));
  }
  if (typeof schema.$dynamicRef === "string") {
    assignProperty(schema, "$dynamicRef", rewrite(schema.$dynamicRef, "$dynamicRef"));
  }
}
function mapObject(value3, f) {
  if (!isObject(value3)) return void 0;
  const out = {};
  for (const key of Object.keys(value3)) {
    assignProperty(out, key, f(value3[key], key));
  }
  return out;
}
function runConverter(adapter, options, use) {
  const locations = /* @__PURE__ */ new Map();
  const references = [];
  let rootUri = ROOT_URI;
  function convert(root, sourcePath = [], targetPath = []) {
    if (sourcePath.length === 0 && options?.trackIds) {
      const id2 = isObject(root) ? getResourceId(root) : void 0;
      rootUri = resolveResourceUri(id2, ROOT_URI) ?? ROOT_URI;
    }
    return loop(root, sourcePath, targetPath, {
      sourceRoot: [],
      targetRoot: [],
      uri: rootUri
    });
  }
  function finish() {
    for (const [out2, value3, sourceResource] of references) {
      let reference = value3;
      const resolved = resolveUrl(value3, sourceResource);
      if (resolved !== void 0) {
        const sourcePointer = parseUriFragment(resolved.hash);
        resolved.hash = "";
        if (sourcePointer !== void 0) {
          const targetPath = locations.get(locationKey(resolved.href, sourcePointer));
          if (targetPath !== void 0) reference = relocateReference(value3, targetPath);
        }
      }
      assignProperty(out2, "$ref", reference);
    }
  }
  const out = use(convert);
  finish();
  return out;
  function loop(node, sourcePath, targetPath, resourceScope) {
    if (typeof node === "boolean") {
      recordLocations(sourcePath, targetPath, resourceScope);
      return options?.booleanAdapter?.(node) ?? node;
    }
    if (!isObject(node)) return node;
    let currentResourceScope = resourceScope;
    const id2 = getResourceId(node);
    if (sourcePath.length > 0 && options?.trackIds && createsResource(id2)) {
      const uri = resolveResourceUri(id2, resourceScope.uri);
      if (uri !== void 0) {
        currentResourceScope = {
          parent: resourceScope,
          sourceRoot: sourcePath,
          targetRoot: targetPath,
          uri
        };
      }
    }
    recordLocations(sourcePath, targetPath, currentResourceScope);
    const currentResource = currentResourceScope.uri;
    const context3 = {
      isDocumentRoot: sourcePath.length === 0,
      schema(value3, sourceKey, targetKey = sourceKey) {
        return loop(value3, [...sourcePath, sourceKey], [...targetPath, targetKey], currentResourceScope);
      },
      schemaAt(value3, sourceSuffix, targetSuffix) {
        return loop(value3, [...sourcePath, ...sourceSuffix], [...targetPath, ...targetSuffix], currentResourceScope);
      },
      schemaArray(value3, sourceKey, targetKey = sourceKey) {
        return Array.isArray(value3) ? value3.map((item, index2) => loop(item, [...sourcePath, sourceKey, String(index2)], [...targetPath, targetKey, String(index2)], currentResourceScope)) : value3;
      },
      schemaMap(value3, sourceKey, targetKey = sourceKey) {
        if (!isObject(value3)) return value3;
        return mapObject(value3, (item, key) => loop(item, [...sourcePath, sourceKey, key], [...targetPath, targetKey, key], currentResourceScope));
      },
      reference(out2, value3) {
        if (typeof value3 === "string") {
          references.push([out2, value3, currentResource]);
        } else {
          assignProperty(out2, "$ref", value3);
        }
      }
    };
    return adapter(node, context3);
  }
  function getResourceId(schema) {
    return options?.ignoreRefSiblings === true && typeof schema.$ref === "string" ? void 0 : schema.$id;
  }
  function recordLocations(sourcePath, targetPath, scope3) {
    if (scope3.parent !== void 0) recordLocations(sourcePath, targetPath, scope3.parent);
    locations.set(locationKey(scope3.uri, sourcePath.slice(scope3.sourceRoot.length)), targetPath.slice(scope3.targetRoot.length));
  }
}
var ROOT_URI = "https://effect.invalid/.json-schema/";
function resolveUrl(value3, base) {
  return URL.canParse(value3, base) ? new URL(value3, base) : void 0;
}
function resolveResourceUri(value3, base) {
  if (typeof value3 !== "string") return void 0;
  const url = resolveUrl(value3, base);
  if (url === void 0) return void 0;
  url.hash = "";
  return url.href;
}
function relocateReference(reference, targetPath) {
  const index2 = reference.indexOf("#");
  if (index2 === -1 && targetPath.length === 0) return reference;
  const uri = index2 === -1 ? reference : reference.slice(0, index2);
  return `${uri}${formatUriFragment(targetPath)}`;
}
function locationKey(resource, pointer) {
  return `${resource}\0${JSON.stringify(pointer)}`;
}
function createsResource(id2) {
  return typeof id2 === "string" && id2.length > 0 && id2[0] !== "#";
}
function convertDocument(document, adapter, options) {
  return runConverter(adapter, {
    ...options,
    trackIds: true
  }, (convert) => ({
    schema: convert(document.schema),
    definitions: mapObject(document.definitions, (definition, key) => convert(definition, ["$defs", key], ["definitions", key]))
  }));
}
var SCHEMA_MAP_KEYWORDS = /* @__PURE__ */ new Set(["properties", "patternProperties"]);
var SCHEMA_ARRAY_KEYWORDS = /* @__PURE__ */ new Set(["allOf", "anyOf", "oneOf"]);
var JSON_SCHEMA_SINGLE_KEYWORDS = /* @__PURE__ */ new Set(["not", "additionalProperties", "propertyNames", "contains", "if", "then", "else", "contentSchema"]);
function convertSubschemaKeyword(out, key, value3, context3, singleKeywords, mapKeywords = SCHEMA_MAP_KEYWORDS) {
  let converted;
  if (mapKeywords.has(key)) converted = context3.schemaMap(value3, key);
  else if (SCHEMA_ARRAY_KEYWORDS.has(key)) converted = context3.schemaArray(value3, key);
  else if (singleKeywords.has(key)) converted = context3.schema(value3, key);
  else return false;
  assignProperty(out, key, converted);
  return true;
}
var PRE_2020_TO_2020_COLLISIONS = ["$anchor", "$defs", "$dynamicAnchor", "$dynamicRef", "$vocabulary", "contentSchema", "dependentRequired", "dependentSchemas", "maxContains", "minContains", "prefixItems", "unevaluatedItems", "unevaluatedProperties"];
var DRAFT_07_TO_2020_COLLISIONS = [...PRE_2020_TO_2020_COLLISIONS, "deprecated"];
var OPEN_API_30_TO_2020_COLLISIONS = [...PRE_2020_TO_2020_COLLISIONS, "$comment", "$id", "$schema", "const", "contains", "contentEncoding", "contentMediaType", "else", "examples", "if", "patternProperties", "propertyNames", "then"];
var ANCHOR_REGEXP = /^[A-Za-z_][-A-Za-z0-9._]*$/;
var LEGACY_ID_FRAGMENT_REGEXP = /^[A-Za-z][-A-Za-z0-9._:]*$/;
function unsupported(keyword, dialect, details) {
  throw new Error(`Cannot convert JSON Schema keyword "${keyword}" to ${dialect}: ${details}`);
}
function rejectKeywordCollisions(source, keywords, targetDialect, sourceDialect) {
  for (const keyword of keywords) {
    if (Object.hasOwn(source, keyword)) {
      unsupported(keyword, targetDialect, `it is not active in ${sourceDialect} but would become active in the target`);
    }
  }
}
var DRAFT_07_TARGET_COLLISIONS = ["additionalItems", "definitions", "dependencies"];
function convertMetaSchemaKeyword(out, value3, context3, targetUri, targetDialect) {
  if (context3.isDocumentRoot) {
    assignProperty(out, "$schema", isMetaSchemaUri(value3, META_SCHEMA_URI_DRAFT_2020_12) ? targetUri : value3);
  } else if (!isMetaSchemaUri(value3, META_SCHEMA_URI_DRAFT_2020_12)) {
    unsupported("$schema", targetDialect, "an embedded resource cannot declare a different dialect");
  }
}
function draft07Adapter(source, context3) {
  rejectKeywordCollisions(source, DRAFT_07_TARGET_COLLISIONS, "Draft-07", "Draft 2020-12");
  const out = {};
  let reference = void 0;
  let prefixItems = void 0;
  let items = void 0;
  for (const key of Object.keys(source)) {
    const value3 = source[key];
    if (convertSubschemaKeyword(out, key, value3, context3, JSON_SCHEMA_SINGLE_KEYWORDS)) continue;
    switch (key) {
      case "$ref":
        reference = value3;
        break;
      case "$schema":
        convertMetaSchemaKeyword(out, value3, context3, META_SCHEMA_URI_DRAFT_07, "Draft-07");
        break;
      case "$id":
      case "$anchor":
        break;
      case "$defs":
        assignProperty(out, "definitions", context3.schemaMap(value3, key, "definitions"));
        break;
      case "prefixItems":
        prefixItems = value3;
        break;
      case "items":
        items = value3;
        break;
      case "dependentRequired":
      case "dependentSchemas":
      case "minContains":
      case "maxContains":
        break;
      case "$dynamicRef":
      case "$dynamicAnchor":
      case "$vocabulary":
      case "unevaluatedProperties":
      case "unevaluatedItems":
        unsupported(key, "Draft-07", "the target dialect has no equivalent");
      case "required":
        if (Array.isArray(value3) && value3.length === 0) break;
        assignProperty(out, key, value3);
        break;
      default:
        assignProperty(out, key, value3);
    }
  }
  convertTuple(out, prefixItems, items, context3);
  if (Object.hasOwn(source, "contains")) {
    const minContains = source.minContains;
    const maxContains = source.maxContains;
    if (minContains !== void 0 && minContains !== 1 || maxContains !== void 0) {
      unsupported("minContains/maxContains", "Draft-07", "contains cardinality cannot be represented");
    }
    if (Object.hasOwn(source, "minContains")) assignProperty(out, "minContains", minContains);
  } else {
    if (Object.hasOwn(source, "minContains")) assignProperty(out, "minContains", source.minContains);
    if (Object.hasOwn(source, "maxContains")) assignProperty(out, "maxContains", source.maxContains);
  }
  convertDependencies(source, out, context3, "draft-07");
  convertLegacyId(source, out, "$id", "Draft-07");
  convertReference(out, reference, context3);
  return out;
}
function convertTuple(out, prefixItems, items, context3) {
  if (prefixItems === void 0) {
    if (items !== void 0) assignProperty(out, "items", context3.schema(items, "items"));
    return;
  }
  assignProperty(out, "items", context3.schemaArray(prefixItems, "prefixItems", "items"));
  if (items !== void 0) {
    assignProperty(out, "additionalItems", context3.schema(items, "items", "additionalItems"));
  }
}
function convertReference(out, reference, context3) {
  if (reference === void 0) return;
  if (typeof reference === "string" && Object.keys(out).length > 0) {
    const referenceSchema = {};
    context3.reference(referenceSchema, reference);
    appendAllOf(out, referenceSchema);
  } else {
    context3.reference(out, reference);
  }
}
function convertDependencies(source, out, context3, targetDialect) {
  const dependentRequired = isObject(source.dependentRequired) ? source.dependentRequired : void 0;
  const dependentSchemas = isObject(source.dependentSchemas) ? source.dependentSchemas : void 0;
  if (dependentRequired === void 0 && dependentSchemas === void 0) return;
  const dependencies = {};
  const keys3 = /* @__PURE__ */ new Set([...Object.keys(dependentRequired ?? {}), ...Object.keys(dependentSchemas ?? {})]);
  for (const key of keys3) {
    const required2 = dependentRequired?.[key];
    const dependency = dependentSchemas?.[key];
    const omitRequired = targetDialect === "draft-04" && Array.isArray(required2) && required2.length === 0;
    if (dependency === void 0) {
      if (!omitRequired) assignProperty(dependencies, key, required2);
    } else if (required2 === void 0 || omitRequired) {
      assignProperty(dependencies, key, context3.schemaAt(dependency, ["dependentSchemas", key], ["dependencies", key]));
    } else {
      assignProperty(dependencies, key, {
        allOf: [context3.schemaAt(dependency, ["dependentSchemas", key], ["dependencies", key, "allOf", "0"]), {
          required: required2
        }]
      });
    }
  }
  if (Object.keys(dependencies).length > 0) assignProperty(out, "dependencies", dependencies);
}
function appendAllOf(out, schema) {
  if (Array.isArray(out.allOf)) out.allOf.push(schema);
  else assignProperty(out, "allOf", [schema]);
}
function convertLegacyId(source, out, targetKey, dialect) {
  const id2 = source.$id;
  const anchor = source.$anchor;
  if (anchor === void 0) {
    if (id2 !== void 0) assignProperty(out, targetKey, id2);
    return;
  }
  if (typeof anchor !== "string" || !ANCHOR_REGEXP.test(anchor)) {
    unsupported("$anchor", dialect, "the anchor is not valid");
  }
  if (!LEGACY_ID_FRAGMENT_REGEXP.test(anchor)) {
    unsupported("$anchor", dialect, "the anchor cannot be represented as a plain-name fragment identifier");
  }
  if (id2 === void 0) {
    assignProperty(out, targetKey, `#${anchor}`);
  } else {
    unsupported("$anchor", dialect, "it cannot be combined with the schema $id");
  }
}

// node_modules/effect/dist/internal/schema/toCodec.js
function toCodecJson(schema) {
  return make16(toCodecJsonAST(schema.ast), {
    schema
  });
}
var toCodecJsonAST = /* @__PURE__ */ applyToSelfOrLastLinkEncodingIdempotent((ast) => {
  const out = toCodecJsonASTStep(ast, toCodecJsonAST);
  const context3 = ast.context;
  if (out === ast || context3 === void 0) return out;
  return replaceContextLastLink(out, withoutConstructorDefault(context3));
});
function withoutConstructorDefault(context3) {
  return context3.constructorDefault === void 0 ? context3 : new Context(context3.isOptional, context3.isMutable, void 0, context3.annotations);
}
function validateCanonicalObjectPropertyNames(ast) {
  if (ast.propertySignatures.some((ps) => typeof ps.name !== "string")) {
    throw new globalThis.Error("Objects property names must be strings", {
      cause: ast
    });
  }
}
function makeReorder(getPriority) {
  return (types) => {
    const sortedTypes = [...types].sort((a, b) => getPriority(toEncoded(a)) - getPriority(toEncoded(b)));
    const orderChanged = sortedTypes.some((ast, index2) => ast !== types[index2]);
    if (!orderChanged) return types;
    return sortedTypes;
  };
}
var toCodecJsonReorder = /* @__PURE__ */ makeReorder((ast) => {
  switch (ast._tag) {
    case "BigInt":
    case "Symbol":
    case "UniqueSymbol":
      return 0;
    default:
      return 1;
  }
});
function toCodecJsonASTStep(ast, recur2) {
  switch (ast._tag) {
    case "Declaration": {
      const getLink = ast.annotations?.toCodecJson ?? ast.annotations?.toCodec;
      if (!isFunction(getLink)) {
        return replaceEncoding(ast, [unknownToJson]);
      }
      const typeParameters = ast.typeParameters.map((tp) => make16(toEncoded(tp)));
      const link2 = getLink(typeParameters);
      return link2 === void 0 ? ast : replaceEncoding(ast, [mapLink(link2, recur2)]);
    }
    case "Unknown":
      return replaceEncoding(ast, [unknownToJson]);
    case "ObjectKeyword":
      return replaceEncoding(ast, [objectKeywordToJson]);
    case "Undefined":
    case "Void":
    case "Literal":
    case "Number":
      return ast.toCodecJson();
    case "UniqueSymbol":
    case "Symbol":
    case "BigInt":
      return ast.toCodecStringTree();
    case "Objects": {
      validateCanonicalObjectPropertyNames(ast);
      return ast.recur(recur2, parameterFromString);
    }
    case "Union": {
      const sortedTypes = toCodecJsonReorder(ast.types);
      if (sortedTypes !== ast.types) {
        return new Union(sortedTypes, ast.options, ast.annotations, ast.checks, ast.encoding, ast.context, ast.encodingChecks).recur(recur2);
      }
      return ast.recur(recur2);
    }
    case "Arrays":
    case "Suspend":
      return ast.recur(recur2);
  }
  return ast;
}
function toCodecIso(schema) {
  return make16(toCodecIsoAST(toType(schema.ast)));
}
var toCodecIsoAST = /* @__PURE__ */ memoize((ast) => {
  const out = toCodecIsoASTStep(ast, toCodecIsoAST);
  return out !== ast && ast.context !== void 0 ? replaceContextLastLink(out, withoutConstructorDefault(ast.context)) : out;
});
function toCodecIsoASTStep(ast, recur2) {
  switch (ast._tag) {
    case "Declaration": {
      const getLink = ast.annotations?.toCodecIso ?? ast.annotations?.toCodec;
      if (isFunction(getLink)) {
        const link2 = getLink(ast.typeParameters.map((tp) => make16(tp)));
        return replaceEncoding(ast, [mapLink(link2, recur2)]);
      }
      return ast;
    }
    case "Arrays":
    case "Objects":
    case "Union":
    case "Suspend":
      return ast.recur(recur2);
  }
  return ast;
}
function toCodecStringTree(schema) {
  return make16(toCodecStringTreeAST(schema.ast), {
    schema
  });
}
function toCodecArrayFromSingle(schema) {
  return make16(toCodecArrayFromSingleAST(schema.ast));
}
var toStringTreeReorder = /* @__PURE__ */ makeReorder((ast) => {
  switch (ast._tag) {
    case "Null":
    case "Boolean":
    case "Number":
    case "BigInt":
    case "Symbol":
    case "UniqueSymbol":
      return 0;
    default:
      return 1;
  }
});
function toCodecStringTreeASTStep(ast, recur2, onMissingAnnotation) {
  switch (ast._tag) {
    case "Declaration": {
      const typeParameters = ast.typeParameters.map((tp) => make16(recur2(toEncoded(tp))));
      const getStringTreeLink = ast.annotations?.toCodecStringTree;
      if (isFunction(getStringTreeLink)) {
        const link3 = getStringTreeLink(typeParameters);
        if (link3 === void 0) return ast;
        return replaceEncoding(ast, [mapLink(link3, recur2)]);
      }
      const getJsonLink = ast.annotations?.toCodecJson;
      const jsonLink = isFunction(getJsonLink) ? getJsonLink(typeParameters) : void 0;
      const getLink = jsonLink === void 0 ? ast.annotations?.toCodec : void 0;
      const link2 = jsonLink ?? (isFunction(getLink) ? getLink(typeParameters) : void 0);
      return link2 === void 0 ? onMissingAnnotation(ast) : replaceEncoding(ast, [mapLink(link2, recur2)]);
    }
    case "Null":
      return replaceEncoding(ast, [nullToString]);
    case "Boolean":
      return replaceEncoding(ast, [booleanToString]);
    case "Unknown":
    case "ObjectKeyword":
      return replaceEncoding(ast, [unknownToStringTree]);
    case "Enum":
    case "Number":
    case "Literal":
    case "UniqueSymbol":
    case "Symbol":
    case "BigInt":
      return ast.toCodecStringTree();
    case "Objects": {
      validateCanonicalObjectPropertyNames(ast);
      return ast.recur(recur2, parameterFromString);
    }
    case "Union": {
      const sortedTypes = toStringTreeReorder(ast.types);
      if (sortedTypes !== ast.types) {
        return new Union(sortedTypes, ast.options, ast.annotations, ast.checks, ast.encoding, ast.context, ast.encodingChecks).recur(recur2);
      }
      return ast.recur(recur2);
    }
    case "Arrays":
    case "Suspend":
      return ast.recur(recur2);
  }
  return ast;
}
var nullToString = /* @__PURE__ */ new Link(/* @__PURE__ */ new Literal("null"), /* @__PURE__ */ new Transformation(/* @__PURE__ */ transform(() => null), /* @__PURE__ */ transform(() => "null")));
var booleanToString = /* @__PURE__ */ new Link(/* @__PURE__ */ new Union([/* @__PURE__ */ new Literal("true"), /* @__PURE__ */ new Literal("false")]), /* @__PURE__ */ new Transformation(/* @__PURE__ */ transform((s) => s === "true"), /* @__PURE__ */ String4()));
var arrayFromSingleTransformation = /* @__PURE__ */ new Transformation(/* @__PURE__ */ transform((input) => typeof input === "string" ? [input] : input), /* @__PURE__ */ passthrough2());
var isCodecArrayFromSingleLink = (link2) => link2.transformation === arrayFromSingleTransformation;
var toCodecStringTreeAST = /* @__PURE__ */ applyToSelfOrLastLinkEncodingIdempotent((ast) => {
  const out = toCodecStringTreeASTStep(ast, toCodecStringTreeAST, (ast2) => {
    throw new globalThis.Error("Missing structural codec for StringTree", {
      cause: ast2
    });
  });
  if (out !== ast && ast.context !== void 0) {
    return replaceContextLastLink(out, withoutConstructorDefault(ast.context));
  }
  return out;
}, {
  stopAt: isCodecArrayFromSingleLink
});
var toArrayFromSingleInputElement = (ast) => isOptional(ast) ? optionalKey(unknown) : unknown;
var toCodecArrayFromSingleAST = /* @__PURE__ */ applyToSelfOrLastLinkEncodingIdempotent((ast) => {
  const out = toCodecArrayFromSingleASTStep(ast);
  if (isArrays(out)) {
    const ensure = decodeTo(new Union([new Arrays(out.isMutable, out.elements.map(toArrayFromSingleInputElement), out.rest.map(toArrayFromSingleInputElement)), string2], {
      mode: "anyOf"
    }), out, arrayFromSingleTransformation);
    return isOptional(ast) ? optionalKey(ensure) : ensure;
  }
  return out;
}, {
  stopAt: isCodecArrayFromSingleLink
});
function toCodecArrayFromSingleASTStep(ast) {
  return ast._tag === "Declaration" || ast._tag === "Arrays" || ast._tag === "Objects" || ast._tag === "Union" || ast._tag === "Suspend" ? ast.recur(toCodecArrayFromSingleAST) : ast;
}

// node_modules/effect/dist/RegExp.js
var RegExp2 = globalThis.RegExp;
var escape = (string3) => string3.replace(/[/\\^$*+?.()|[\]{}]/g, "\\$&");

// node_modules/effect/dist/internal/errors.js
function errorWithPath(message, path) {
  if (path.length > 0) {
    message += `
  at ${formatPath(path)}`;
  }
  return new Error(message);
}

// node_modules/effect/dist/internal/schema/toJsonSchemaDocument.js
function formatDefinitionReference(key) {
  return `#/$defs/${formatUriFragmentToken(key)}`;
}
var jsonSchemaAnnotationExcludedKeys = /* @__PURE__ */ new Set([...annotationExcludedKeys, IDENTIFIER_FALLBACK_KEY, ...jsonSchemaAnnotationKeys]);
function collectJsonSchemaAnnotations(annotations, options) {
  if (annotations === void 0) return void 0;
  const out = {};
  const title = annotations.title;
  if (typeof title === "string") out.title = title;
  const description = annotations.description;
  const expected = annotations.expected;
  if (typeof description === "string") out.description = description;
  else if (options?.generateDescriptions === true && typeof expected === "string") out.description = expected;
  const defaultValue = annotations.default;
  if (isJson(defaultValue)) out.default = defaultValue;
  const examples = annotations.examples;
  if (Array.isArray(examples) && isJson(examples)) out.examples = examples;
  const readOnly2 = annotations.readOnly;
  if (typeof readOnly2 === "boolean") out.readOnly = readOnly2;
  const writeOnly = annotations.writeOnly;
  if (typeof writeOnly === "boolean") out.writeOnly = writeOnly;
  const format7 = annotations.format;
  if (typeof format7 === "string") out.format = format7;
  const contentEncoding = annotations.contentEncoding;
  if (typeof contentEncoding === "string") out.contentEncoding = contentEncoding;
  const contentMediaType = annotations.contentMediaType;
  if (typeof contentMediaType === "string") out.contentMediaType = contentMediaType;
  const contentSchema = annotations.contentSchema;
  if (isJson(contentSchema)) out.contentSchema = contentSchema;
  if (options?.includeAnnotationKey !== void 0) {
    for (const [key, value3] of Object.entries(annotations)) {
      if (jsonSchemaAnnotationExcludedKeys.has(key) || !options.includeAnnotationKey(key)) {
        continue;
      }
      if (isJson(value3)) assignProperty(out, key, value3);
    }
  }
  return Object.keys(out).length === 0 ? void 0 : out;
}
function extractJsonSchemaNumberType(schema) {
  let type = schema.type === "number" || schema.type === "integer" ? schema.type : void 0;
  let out = schema;
  if (type !== void 0) {
    out = {
      ...schema
    };
    delete out.type;
  }
  if (Array.isArray(out.allOf)) {
    const members = [];
    let changed = false;
    for (const member of out.allOf) {
      const extracted = extractJsonSchemaNumberType(member);
      if (extracted.type !== void 0) {
        changed = true;
        if (type === void 0 || extracted.type === "integer") type = extracted.type;
      }
      if (Object.keys(extracted.schema).length > 0) members.push(extracted.schema);
    }
    if (changed) {
      const {
        allOf: _,
        ...rest
      } = out;
      out = members.length === 0 ? rest : {
        ...rest,
        allOf: members
      };
    }
  }
  return {
    type,
    schema: out
  };
}
function isJsonSchemaNumberEncoding(schema) {
  if (!Array.isArray(schema.anyOf) || schema.anyOf.length !== 2 || schema.anyOf[0]?.type !== "number") return false;
  const special = schema.anyOf[1];
  return special?.type === "string" && Array.isArray(special.enum) && special.enum.length === 3 && special.enum.includes("NaN") && special.enum.includes("Infinity") && special.enum.includes("-Infinity");
}
var inlineableCheckKeywords = "|type|format|pattern|multipleOf|minimum|maximum|exclusiveMinimum|exclusiveMaximum|minLength|maxLength|minItems|maxItems|uniqueItems|minProperties|maxProperties|propertyNames|";
function hasOnlyKeywords(schema, allowed) {
  return Object.keys(schema).every((key) => allowed.includes(`|${key}|`));
}
function hasNoCollisions(left, rightKeys) {
  return typeof left.$ref !== "string" && rightKeys.every((key) => !Object.hasOwn(left, key));
}
var lowerBoundKeywords = "|minimum|exclusiveMinimum|minLength|minItems|minProperties|";
var upperBoundKeywords = "|maximum|exclusiveMaximum|maxLength|maxItems|maxProperties|";
function mergeInlineCheck(left, right, rightKeys) {
  if (typeof left.$ref === "string") return void 0;
  const out = {
    ...left,
    ...right
  };
  for (const key of rightKeys) {
    if (!Object.hasOwn(left, key)) continue;
    const a = left[key];
    const b = right[key];
    if (typeof a !== "number" || typeof b !== "number") return void 0;
    if (lowerBoundKeywords.includes(`|${key}|`)) out[key] = Math.max(a, b);
    else if (upperBoundKeywords.includes(`|${key}|`)) out[key] = Math.min(a, b);
    else return void 0;
  }
  if (typeof out.minimum === "number" && typeof out.exclusiveMinimum === "number") {
    delete out[out.exclusiveMinimum >= out.minimum ? "minimum" : "exclusiveMinimum"];
  }
  if (typeof out.maximum === "number" && typeof out.exclusiveMaximum === "number") {
    delete out[out.exclusiveMaximum <= out.maximum ? "maximum" : "exclusiveMaximum"];
  }
  return out;
}
var promotableAnnotationKeywords = "|title|description|default|examples|readOnly|writeOnly|";
var inlineableAnnotatedCheckKeywords = inlineableCheckKeywords + promotableAnnotationKeywords;
function appendJsonSchema(left, right, inlineCheck) {
  if (Object.keys(left).length === 0) return right;
  const rightKeys = Object.keys(right);
  if (rightKeys.length === 0) return left;
  const leftType = left.type === "number" || left.type === "integer" ? left.type : void 0;
  const isNumberEncoding = isJsonSchemaNumberEncoding(left);
  if (leftType !== void 0 || isNumberEncoding) {
    const extracted = extractJsonSchemaNumberType(right);
    if (extracted.type !== void 0) {
      const type = leftType === "integer" || extracted.type === "integer" ? "integer" : "number";
      const base = {
        ...left,
        type
      };
      if (isNumberEncoding) delete base.anyOf;
      const extractedKeys = Object.keys(extracted.schema);
      if (extractedKeys.length === 0) return base;
      return hasOnlyKeywords(extracted.schema, promotableAnnotationKeywords) && hasNoCollisions(base, extractedKeys) ? {
        ...base,
        ...extracted.schema
      } : appendJsonSchema(base, extracted.schema, inlineCheck);
    }
  }
  if (inlineCheck) {
    const merged = mergeInlineCheck(left, right, rightKeys);
    if (merged !== void 0) return merged;
  }
  const members = Array.isArray(right.allOf) && rightKeys.length === 1 ? right.allOf : [right];
  if (Array.isArray(left.allOf)) {
    return {
      ...left,
      allOf: [...left.allOf, ...members]
    };
  }
  if (typeof left.$ref === "string") {
    return {
      allOf: [left, ...members]
    };
  }
  return {
    ...left,
    allOf: members
  };
}
function isExact(exactness, seen = /* @__PURE__ */ new Set()) {
  if (typeof exactness === "boolean") return exactness;
  if (seen.has(exactness)) return true;
  seen.add(exactness);
  return exactness.every((dependency) => isExact(dependency, seen));
}
function isApproximateCheckOutput(output) {
  return Array.isArray(output);
}
function compileJsonSchema(representations, rootPaths, references, options) {
  const compiledDefinitions = /* @__PURE__ */ new Map();
  const definitionAliases = /* @__PURE__ */ new Map();
  const compiledRepresentations = /* @__PURE__ */ new WeakMap();
  const pendingOneOf = /* @__PURE__ */ new Map();
  const fallbackDefinitions = /* @__PURE__ */ new Map();
  const referenceKeys = Object.keys(references);
  for (const key of referenceKeys) {
    compileDefinition(key, ["references", key]);
  }
  const compiledSchemas = map4(representations, (representation, index2) => recur2(representation, rootPaths[index2], []));
  for (const [branches, schemas2] of pendingOneOf.values()) {
    if (!isExact(branches)) {
      for (const schema of schemas2) {
        if (Array.isArray(schema.oneOf)) {
          schema.anyOf = schema.oneOf;
          delete schema.oneOf;
        }
      }
    }
  }
  for (const key of referenceKeys) {
    const representation = references[key];
    const fallback = getIdentifierFallback(representation);
    if (fallback === void 0) continue;
    const schema = compiledDefinitions.get(key)[0];
    const candidates2 = fallbackDefinitions.get(fallback);
    const match7 = candidates2?.find((candidate2) => equals(compiledDefinitions.get(candidate2)[0], schema));
    if (match7 === void 0) {
      if (candidates2 === void 0) fallbackDefinitions.set(fallback, [key]);
      else candidates2.push(key);
    } else {
      definitionAliases.set(key, match7);
    }
  }
  const schemas = map4(compiledSchemas, finalizeJsonSchema);
  const definitions = {};
  for (const key of referenceKeys) {
    if (!definitionAliases.has(key)) {
      assignProperty(definitions, key, finalizeJsonSchema(compiledDefinitions.get(key)[0]));
    }
  }
  return {
    dialect: "draft-2020-12",
    schemas,
    definitions
  };
  function registerPendingOneOf(schema) {
    if (Array.isArray(schema.oneOf)) pendingOneOf.get(schema.oneOf)?.[1].push(schema);
    return schema;
  }
  function compileDefinition(key, path) {
    if (!Object.hasOwn(references, key)) {
      throw errorWithPath(`Invalid reference ${key}`, [...path, "$ref"]);
    }
    const cached3 = compiledDefinitions.get(key);
    if (cached3 !== void 0) return cached3;
    const result3 = [{}, []];
    compiledDefinitions.set(key, result3);
    result3[0] = recur2(references[key], ["references", key], result3[1]);
    return result3;
  }
  function finalizeJsonSchema(schema) {
    return rewriteRefs(schema, ($ref) => {
      const pointer = decodeUriFragment($ref);
      if (pointer === void 0) {
        if (/^#(?:\/|%2f)/i.test($ref)) {
          throw new Error(`Invalid JSON Pointer URI fragment ${JSON.stringify($ref)}`);
        }
        return $ref;
      }
      if (!pointer.startsWith("/$defs/")) return $ref;
      const separator = pointer.indexOf("/", 7);
      const canonical = definitionAliases.get(unescapeToken(pointer.slice(7, separator < 0 ? void 0 : separator)));
      if (canonical === void 0) return $ref;
      return $ref.replace(/^#(?:\/|%2f).*?(?:\/|%2f).*?(?=\/|%2f|$)/i, formatDefinitionReference(canonical));
    });
  }
  function getIdentifierFallback(representation) {
    if (representation._tag === "Reference") return void 0;
    const annotations = representation.checks.length === 0 ? representation.annotations : representation.checks[representation.checks.length - 1].annotations;
    return typeof annotations?.identifier !== "string" && typeof annotations?.[IDENTIFIER_FALLBACK_KEY] === "string" ? annotations[IDENTIFIER_FALLBACK_KEY] : void 0;
  }
  function compileCheck(check2, type, path, dependencies) {
    const annotations = check2.annotations;
    const callback3 = annotations?.toJsonSchema;
    if (callback3 !== void 0) {
      const schemas3 = check2.representation?.schemas?.map((schema3, index2) => recur2(schema3, [...path, "representation", "schemas", index2], dependencies)) ?? [];
      const result3 = callback3({
        type,
        schemas: schemas3
      });
      const approximate = isApproximateCheckOutput(result3);
      if (approximate) {
        dependencies.push(false);
      }
      const fragment = approximate ? result3[0] : result3;
      const ordinary2 = collectJsonSchemaAnnotations(annotations, options);
      const schema2 = ordinary2 === void 0 ? fragment : {
        ...fragment,
        ...ordinary2
      };
      const allowed = ordinary2 === void 0 ? inlineableCheckKeywords : inlineableAnnotatedCheckKeywords;
      return [schema2, check2._tag === "Filter" && hasOnlyKeywords(schema2, allowed) && (ordinary2 === void 0 || hasOnlyKeywords(ordinary2, promotableAnnotationKeywords)) ? true : void 0];
    }
    if (check2._tag === "Filter") {
      dependencies.push(false);
      return void 0;
    }
    const schemas2 = check2.checks.flatMap((child, index2) => {
      const result3 = compileCheck(child, type, [...path, "checks", index2], dependencies);
      return result3 === void 0 ? [] : [result3[0]];
    });
    if (schemas2.length === 0) return void 0;
    const ordinary = collectJsonSchemaAnnotations(annotations, options);
    const schema = {
      allOf: schemas2
    };
    return [ordinary === void 0 ? schema : {
      ...schema,
      ...ordinary
    }];
  }
  function recur2(representation, path, dependencies) {
    if (representation._tag === "Reference") {
      dependencies.push(compileDefinition(representation.$ref, path)[1]);
      return {
        $ref: formatDefinitionReference(representation.$ref)
      };
    }
    const cached3 = compiledRepresentations.get(representation);
    if (cached3 !== void 0) {
      dependencies.push(cached3[1]);
      return cached3[0];
    }
    const local = [];
    dependencies.push(local);
    let output = on(representation, path, local);
    const ordinary = collectJsonSchemaAnnotations(representation.annotations, options);
    if (ordinary !== void 0) {
      output = {
        ...output,
        ...ordinary
      };
    }
    for (let index2 = 0; index2 < representation.checks.length; index2++) {
      const type = typeof output.type === "string" && isJsonSchemaType(output.type) ? output.type : void 0;
      const check2 = compileCheck(representation.checks[index2], type, [...path, "checks", index2], local);
      if (check2 !== void 0) output = appendJsonSchema(output, ...check2);
    }
    compiledRepresentations.set(representation, [output, local]);
    return registerPendingOneOf(output);
  }
  function on(representation, path, dependencies) {
    switch (representation._tag) {
      case "Any":
      case "Unknown":
        return {};
      case "ObjectKeyword":
        return {
          anyOf: [{
            type: "object"
          }, {
            type: "array"
          }]
        };
      case "Void":
      case "Undefined":
      case "Null":
        return {
          type: "null"
        };
      case "BigInt":
        return {
          type: "string",
          allOf: [{
            pattern: "^-?\\d+$"
          }]
        };
      case "Symbol":
        return {
          type: "string",
          allOf: [{
            pattern: "^Symbol\\(([\\s\\S]*)\\)$"
          }]
        };
      case "UniqueSymbol":
        return globalThis.Symbol.keyFor(representation.symbol) === void 0 ? {
          not: {}
        } : {
          type: "string",
          enum: [globalThis.String(representation.symbol)]
        };
      case "Declaration":
        dependencies.push(false);
        return {};
      case "Suspend":
        return recur2(representation.thunk, [...path, "thunk"], dependencies);
      case "Never":
        return {
          not: {}
        };
      case "String":
        return {
          type: "string"
        };
      case "Number":
        return {
          anyOf: [{
            type: "number"
          }, {
            type: "string",
            enum: ["NaN", "Infinity", "-Infinity"]
          }]
        };
      case "Boolean":
        return {
          type: "boolean"
        };
      case "Literal": {
        const literal = representation.literal;
        return typeof literal === "bigint" ? {
          type: "string",
          enum: [globalThis.String(literal)]
        } : {
          type: typeof literal,
          enum: [literal]
        };
      }
      case "Enum": {
        const types = representation.enums.map(([title, literal], index2) => {
          if (typeof literal === "number" && !globalThis.Number.isFinite(literal)) {
            throw errorWithPath(`Invalid numeric enum value ${globalThis.String(literal)}`, [...path, "enums", index2, 1]);
          }
          return {
            type: typeof literal,
            enum: [literal],
            title
          };
        });
        return types.length === 0 ? {
          not: {}
        } : {
          anyOf: types
        };
      }
      case "TemplateLiteral":
        return {
          type: "string",
          pattern: `^${representation.parts.map(getPartPattern).join("")}$`
        };
      case "Arrays": {
        if (representation.rest.length > 1) {
          throw errorWithPath("Invalid schema representation document", [...path, "rest"]);
        }
        const out = {
          type: "array"
        };
        let minItems = representation.elements.length;
        const prefixItems = representation.elements.map((element, index2) => {
          if (element.isOptional) minItems--;
          const schema = recur2(element.type, [...path, "elements", index2, "type"], dependencies);
          const annotations = collectJsonSchemaAnnotations(element.annotations, options);
          return annotations === void 0 ? schema : registerPendingOneOf(appendJsonSchema(schema, annotations));
        });
        if (prefixItems.length > 0) {
          out.prefixItems = prefixItems;
          out.maxItems = representation.elements.length;
          if (minItems > 0) out.minItems = minItems;
        } else {
          out.items = false;
        }
        if (representation.rest.length === 1) {
          delete out.maxItems;
          const rest = recur2(representation.rest[0], [...path, "rest", 0], dependencies);
          if (Object.keys(rest).length > 0) out.items = rest;
          else delete out.items;
        }
        return out;
      }
      case "Objects": {
        if (representation.propertySignatures.length === 0 && representation.indexSignatures.length === 0) {
          return {
            not: {
              type: "null"
            }
          };
        }
        const out = {
          type: "object"
        };
        const properties = {};
        const required2 = [];
        for (let index2 = 0; index2 < representation.propertySignatures.length; index2++) {
          const property = representation.propertySignatures[index2];
          if (typeof property.name !== "string") {
            throw errorWithPath("Invalid schema representation document", [...path, "propertySignatures", index2, "name"]);
          }
          const name = property.name;
          const schema = recur2(property.type, [...path, "propertySignatures", index2, "type"], dependencies);
          const annotations = collectJsonSchemaAnnotations(property.annotations, options);
          assignProperty(properties, name, annotations === void 0 ? schema : registerPendingOneOf(appendJsonSchema(schema, annotations)));
          if (!property.isOptional) required2.push(name);
        }
        if (representation.propertySignatures.length > 0) out.properties = properties;
        if (required2.length > 0) out.required = required2;
        const patternProperties = {};
        const additionalPropertySchemas = [];
        const indexValueSchemas = [];
        let hasUnrepresentableIndexPattern = false;
        for (let index2 = 0; index2 < representation.indexSignatures.length; index2++) {
          const signature = representation.indexSignatures[index2];
          let type = recur2(signature.type, [...path, "indexSignatures", index2, "type"], dependencies);
          if (equals(type, {
            not: {}
          })) type = false;
          indexValueSchemas.push(type);
          const patterns = getParameterPatterns(signature.parameter, [...path, "indexSignatures", index2, "parameter"], /* @__PURE__ */ new Set());
          if (patterns === void 0) {
            hasUnrepresentableIndexPattern = true;
            dependencies.push(false);
            continue;
          }
          if (patterns.length === 0) {
            additionalPropertySchemas.push(type);
          } else {
            for (const pattern of patterns) {
              const previous = patternProperties[pattern];
              assignProperty(patternProperties, pattern, previous === void 0 ? type : previous === false || type === false ? false : registerPendingOneOf(appendJsonSchema(previous, type)));
            }
          }
        }
        const hasPatternProperties = Object.keys(patternProperties).length > 0;
        if (hasPatternProperties) {
          out.patternProperties = patternProperties;
        }
        if (hasUnrepresentableIndexPattern && options?.onExcessProperty === "error") {
          const propertyNames = [];
          if (representation.propertySignatures.length > 0) {
            propertyNames.push({
              enum: Object.keys(properties)
            });
          }
          for (let index2 = 0; index2 < representation.indexSignatures.length; index2++) {
            propertyNames.push(recur2(representation.indexSignatures[index2].parameter, [...path, "indexSignatures", index2, "parameter"], dependencies));
          }
          out.propertyNames = propertyNames.length === 1 ? propertyNames[0] : {
            anyOf: propertyNames
          };
          out.additionalProperties = indexValueSchemas.length === 1 ? indexValueSchemas[0] : {
            anyOf: indexValueSchemas
          };
          if (additionalPropertySchemas.length > 0) {
            out.allOf = additionalPropertySchemas.map((type) => ({
              type: "object",
              additionalProperties: type
            }));
          }
        } else if (additionalPropertySchemas.length === 0) {
          out.additionalProperties = hasUnrepresentableIndexPattern || options?.onExcessProperty !== "error";
        } else if (additionalPropertySchemas.length === 1 && representation.propertySignatures.length === 0 && !hasPatternProperties) {
          out.additionalProperties = additionalPropertySchemas[0];
        } else if (additionalPropertySchemas.length > 0) {
          out.allOf = additionalPropertySchemas.map((type) => ({
            type: "object",
            additionalProperties: type
          }));
        }
        if (typeof out.additionalProperties === "object" && out.additionalProperties !== null && Object.keys(out.additionalProperties).length === 0) {
          delete out.additionalProperties;
        }
        return out;
      }
      case "Union": {
        const branches = [];
        const types = representation.types.map((type, index2) => recur2(type, [...path, "types", index2], branches));
        dependencies.push(branches);
        if (types.length === 0) return {
          not: {}
        };
        const mode = representation.options?.mode ?? "anyOf";
        if (mode === "anyOf" && types.length > 1) {
          const compacted = compactEnums(types);
          if (compacted !== void 0) return compacted;
        }
        if (mode === "oneOf") pendingOneOf.set(types, [branches, []]);
        return {
          [mode]: types
        };
      }
    }
  }
  function getParameterPatterns(parameter, path, seenReferences) {
    switch (parameter._tag) {
      case "Reference": {
        if (!Object.hasOwn(references, parameter.$ref)) {
          throw errorWithPath(`Invalid reference ${parameter.$ref}`, [...path, "$ref"]);
        }
        compileDefinition(parameter.$ref, path);
        if (seenReferences.has(parameter.$ref)) return void 0;
        const next = new Set(seenReferences).add(parameter.$ref);
        return getParameterPatterns(references[parameter.$ref], ["references", parameter.$ref], next);
      }
      case "String": {
        if (parameter.checks.length === 0) return [];
        if (parameter.checks.length !== 1 || parameter.checks[0]._tag !== "Filter" || parameter.checks[0].annotations?.toJsonSchema === void 0) {
          return void 0;
        }
        const dependencies = [];
        const schema = recur2(parameter, path, dependencies);
        if (!isExact(dependencies)) return void 0;
        return schema.type === "string" && typeof schema.pattern === "string" && hasOnlyKeywords(schema, "|type|pattern|title|description|default|examples|readOnly|writeOnly|") ? [schema.pattern] : void 0;
      }
      case "TemplateLiteral":
        return parameter.checks.length === 0 ? [`^${parameter.parts.map(getPartPattern).join("")}$`] : void 0;
      case "Union": {
        if (parameter.types.length === 0 || parameter.checks.length > 0 || parameter.options?.mode === "oneOf") {
          return void 0;
        }
        const patterns = [];
        for (let index2 = 0; index2 < parameter.types.length; index2++) {
          const memberPatterns = getParameterPatterns(parameter.types[index2], [...path, "types", index2], seenReferences);
          if (memberPatterns === void 0) return void 0;
          if (memberPatterns.length === 0) return [];
          patterns.push(...memberPatterns);
        }
        return patterns;
      }
      default:
        throw errorWithPath("Invalid schema representation document", path);
    }
  }
}
function isJsonSchemaType(input) {
  return input === "string" || input === "number" || input === "boolean" || input === "array" || input === "object" || input === "null" || input === "integer";
}
function compactEnums(schemas) {
  let sharedType = void 0;
  const values2 = [];
  for (const schema of schemas) {
    const keys3 = Object.keys(schema);
    if (keys3.length !== 2 || schema.type === void 0 || !Array.isArray(schema.enum) || schema.enum.length === 0) {
      return void 0;
    }
    if (sharedType === void 0) sharedType = schema.type;
    else if (schema.type !== sharedType) return void 0;
    for (const value3 of schema.enum) {
      if (values2.includes(value3)) return void 0;
      values2.push(value3);
    }
  }
  return {
    type: sharedType,
    enum: values2
  };
}
function getPartPattern(part) {
  switch (part._tag) {
    case "Literal":
      return escape(globalThis.String(part.literal));
    case "String":
      return STRING_PATTERN;
    case "Number":
      return FINITE_PATTERN;
    case "TemplateLiteral":
      return part.parts.map(getPartPattern).join("");
    case "Union":
      return `(?:${part.types.map(getPartPattern).join("|")})`;
    default:
      throw errorWithPath("Invalid schema representation document", []);
  }
}
function toJsonSchemaDocument(document, options) {
  const output = compileJsonSchema([document.representation], [["representation"]], document.references, options);
  return {
    dialect: output.dialect,
    schema: output.schemas[0],
    definitions: output.definitions
  };
}

// node_modules/effect/dist/internal/schema/toRepresentation.js
var defaultReferencePolicy = ({
  identifier: identifier2
}) => identifier2;
function annotationsField(annotations) {
  return annotations === void 0 ? void 0 : {
    annotations
  };
}
function toRepresentation(ast, options) {
  const {
    references,
    representations
  } = toRepresentations([ast], options);
  return {
    representation: representations[0],
    references
  };
}
function toRepresentations(asts, options) {
  const references = {};
  const referenceOwners = /* @__PURE__ */ new Map();
  const buildingReferences = /* @__PURE__ */ new Set();
  const candidates2 = /* @__PURE__ */ new Map();
  const visitingCandidates = /* @__PURE__ */ new Set();
  for (const ast of asts) visit(ast);
  const referencePolicy = options?.referencePolicy ?? defaultReferencePolicy;
  for (const candidatesByIdentifier of candidates2.values()) {
    for (const candidate2 of candidatesByIdentifier.values()) {
      const requestedReference = referencePolicy({
        ast: candidate2.ast,
        occurrences: candidate2.occurrences,
        identifier: candidate2.identifier
      });
      if (requestedReference !== void 0) {
        const separator = requestedReference === candidate2.identifier || !requestedReference.endsWith("_") ? "_" : "";
        candidate2.reference = getReference(requestedReference, candidate2, separator);
      } else if (candidate2.isRecursive) {
        candidate2.reference = getReference(`${candidate2.ast._tag}_`, candidate2, "");
      }
    }
  }
  const representations = map4(asts, (ast) => recur2(ast));
  return {
    representations,
    references
  };
  function getReference(prefix, owner, separator = "_") {
    let candidate2 = prefix;
    let suffix = 0;
    while (referenceOwners.has(candidate2)) {
      if (referenceOwners.get(candidate2) === owner) return candidate2;
      candidate2 = `${prefix}${separator}${++suffix}`;
    }
    referenceOwners.set(candidate2, owner);
    return candidate2;
  }
  function annotateReference(ast, candidate2, reference) {
    const fallback = candidate2.fallback;
    if (fallback !== void 0) {
      return resolveIdentifierFallback(ast) === fallback ? ast : annotate(ast, {
        [IDENTIFIER_FALLBACK_KEY]: fallback
      });
    }
    return reference === candidate2.identifier ? ast : annotate(ast, {
      identifier: reference
    });
  }
  function makeReference(reference, ast) {
    if (!Object.hasOwn(references, reference) && !buildingReferences.has(reference)) {
      buildingReferences.add(reference);
      const representation = on(ast);
      buildingReferences.delete(reference);
      assignProperty(references, reference, representation);
    }
    return {
      _tag: "Reference",
      $ref: reference
    };
  }
  function getCandidate(input) {
    const ast = getLastEncoding(input);
    const owner = getContextOwner(ast);
    let identifier2 = resolveIdentifier(ast);
    const fallback = identifier2 === void 0 ? (ast !== input ? resolveIdentifier(input) : void 0) ?? resolveIdentifierFallback(ast) : void 0;
    if (fallback !== void 0) identifier2 = `${fallback}Encoded`;
    let candidatesByIdentifier = candidates2.get(owner);
    if (candidatesByIdentifier === void 0) {
      candidatesByIdentifier = /* @__PURE__ */ new Map();
      candidates2.set(owner, candidatesByIdentifier);
    }
    let candidate2 = candidatesByIdentifier.get(identifier2);
    if (candidate2 === void 0) {
      candidate2 = {
        ast: owner,
        identifier: identifier2,
        fallback,
        occurrences: 0,
        isRecursive: false,
        reference: void 0
      };
      candidatesByIdentifier.set(identifier2, candidate2);
    }
    return candidate2;
  }
  function visit(input) {
    const candidate2 = getCandidate(input);
    const ast = candidate2.ast;
    candidate2.occurrences++;
    if (visitingCandidates.has(candidate2)) {
      candidate2.isRecursive = true;
      return;
    }
    if (candidate2.occurrences > 1) return;
    visitingCandidates.add(candidate2);
    visitChecks(ast.checks);
    switch (ast._tag) {
      case "Declaration":
      case "Arrays":
      case "Objects":
      case "Union":
        ast.recur((child) => {
          visit(child);
          return child;
        });
        break;
      case "TemplateLiteral":
        ast.parts.forEach(visit);
        break;
      case "Suspend":
        visit(ast.thunk());
        break;
    }
    visitingCandidates.delete(candidate2);
  }
  function visitChecks(checks) {
    checks?.forEach((check2) => {
      check2.annotations?.representation?.schemas?.forEach((schema) => visit(toType(schema)));
      if (check2._tag === "FilterGroup") visitChecks(check2.checks);
    });
  }
  function recur2(input) {
    const candidate2 = getCandidate(input);
    const ast = candidate2.ast;
    const reference = candidate2.reference;
    if (reference !== void 0) {
      const annotated = candidate2.identifier === void 0 ? ast : annotateReference(ast, candidate2, reference);
      return makeReference(reference, annotated);
    }
    return on(ast);
  }
  function on(ast) {
    const checks = fromChecks(ast.checks);
    switch (ast._tag) {
      case "Declaration":
        return {
          _tag: "Declaration",
          typeParameters: ast.typeParameters.map((ast2) => recur2(ast2)),
          checks,
          ...fromDeclarationAnnotations(ast.annotations)
        };
      case "Null":
      case "Undefined":
      case "Void":
      case "Never":
      case "Unknown":
      case "Any":
      case "String":
      case "Boolean":
      case "Number":
      case "BigInt":
      case "Symbol":
      case "ObjectKeyword":
        return {
          _tag: ast._tag,
          checks,
          ...annotationsField(ast.annotations)
        };
      case "Literal":
        return {
          _tag: "Literal",
          literal: ast.literal,
          checks,
          ...annotationsField(ast.annotations)
        };
      case "UniqueSymbol":
        return {
          _tag: "UniqueSymbol",
          symbol: ast.symbol,
          checks,
          ...annotationsField(ast.annotations)
        };
      case "Enum":
        return {
          _tag: "Enum",
          enums: ast.enums,
          checks,
          ...annotationsField(ast.annotations)
        };
      case "TemplateLiteral":
        return {
          _tag: "TemplateLiteral",
          parts: ast.parts.map((ast2) => recur2(ast2)),
          checks,
          ...annotationsField(ast.annotations)
        };
      case "Arrays":
        return {
          _tag: "Arrays",
          elements: ast.elements.map((element) => {
            const projected = getLastEncoding(element);
            const annotations = projected.context?.annotations;
            return {
              isOptional: isOptional(projected),
              type: recur2(element),
              ...annotationsField(annotations)
            };
          }),
          rest: ast.rest.map((ast2) => recur2(ast2)),
          checks,
          ...annotationsField(ast.annotations)
        };
      case "Objects":
        return {
          _tag: "Objects",
          propertySignatures: ast.propertySignatures.map((property) => {
            const projected = getLastEncoding(property.type);
            const annotations = projected.context?.annotations;
            return {
              name: property.name,
              type: recur2(property.type),
              isOptional: isOptional(projected),
              isMutable: isMutable(projected),
              ...annotationsField(annotations)
            };
          }),
          indexSignatures: ast.indexSignatures.map((index2) => ({
            parameter: recur2(index2.parameter),
            type: recur2(index2.type)
          })),
          checks,
          ...annotationsField(ast.annotations)
        };
      case "Union":
        return {
          _tag: "Union",
          types: ast.types.map((ast2) => recur2(ast2)),
          ...ast.options === void 0 ? {} : {
            options: ast.options
          },
          checks,
          ...annotationsField(ast.annotations)
        };
      case "Suspend":
        return {
          _tag: "Suspend",
          checks: [],
          thunk: recur2(ast.thunk()),
          ...annotationsField(ast.annotations)
        };
    }
  }
  function fromChecks(checks) {
    return checks?.map(fromCheck) ?? [];
  }
  function fromCheck(check2) {
    switch (check2._tag) {
      case "Filter":
        return {
          _tag: "Filter",
          aborted: check2.aborted,
          ...fromCheckAnnotations(check2.annotations)
        };
      case "FilterGroup":
        return {
          _tag: "FilterGroup",
          checks: map4(check2.checks, fromCheck),
          ...fromCheckAnnotations(check2.annotations)
        };
    }
  }
  function fromDeclarationAnnotations(annotations) {
    if (annotations === void 0) return void 0;
    const {
      representation,
      ...ordinary
    } = annotations;
    return {
      ...representation === void 0 ? void 0 : {
        representation
      },
      ...Object.keys(ordinary).length === 0 ? void 0 : {
        annotations: ordinary
      }
    };
  }
  function fromCheckAnnotations(annotations) {
    if (annotations === void 0) return void 0;
    const {
      representation,
      ...ordinary
    } = annotations;
    const projected = representation === void 0 ? void 0 : representation.schemas === void 0 ? representation : {
      ...representation,
      schemas: representation.schemas.map((schema) => recur2(toType(schema)))
    };
    return {
      ...projected === void 0 ? void 0 : {
        representation: projected
      },
      ...Object.keys(ordinary).length === 0 ? void 0 : {
        annotations: ordinary
      }
    };
  }
}

// node_modules/effect/dist/internal/schema/standardSchema.js
function makeStandardResult(exit4) {
  return isSuccess4(exit4) ? exit4.value : {
    issues: [{
      message: pretty(exit4.cause)
    }]
  };
}
function toStandardSchemaV1(self, options) {
  const decodeUnknownEffect3 = decodeUnknownEffect(self);
  const parseOptions = {
    errors: "all",
    ...options?.parseOptions
  };
  const formatter = makeFormatterStandardSchemaV1(options);
  const validate4 = (value3) => {
    const scheduler = new MixedScheduler("sync");
    const fiber3 = runFork2(match5(decodeUnknownEffect3(value3, parseOptions), {
      onFailure: formatter,
      onSuccess: (value4) => ({
        value: value4
      })
    }), {
      scheduler
    });
    fiber3.currentDispatcher?.flush();
    const exit4 = fiber3.pollUnsafe();
    if (exit4) {
      return makeStandardResult(exit4);
    }
    return new Promise((resolve7) => {
      fiber3.addObserver((exit5) => {
        resolve7(makeStandardResult(exit5));
      });
    });
  };
  if (Object.hasOwn(self, "~standard")) {
    const out = self;
    if ("validate" in out["~standard"]) return out;
    Object.assign(out["~standard"], {
      validate: validate4
    });
    return out;
  }
  return Object.assign(self, {
    "~standard": {
      version: 1,
      vendor: "effect",
      validate: validate4
    }
  });
}
function toJsonSchemaDocument2(ast) {
  const document = toRepresentation(toCodecJsonAST(ast));
  return toJsonSchemaDocument(document);
}
function toBaseStandardJSONSchemaV1(ast, target) {
  const doc2020_12 = toJsonSchemaDocument2(ast);
  if (target === "draft-2020-12") {
    const schema = doc2020_12.schema;
    if (Object.keys(doc2020_12.definitions).length > 0) {
      schema.$defs = doc2020_12.definitions;
    }
    return schema;
  } else if (target === "draft-07") {
    const doc07 = toDocumentDraft07(doc2020_12);
    const schema = doc07.schema;
    if (Object.keys(doc07.definitions).length > 0) {
      schema.definitions = doc07.definitions;
    }
    return schema;
  }
  throw new globalThis.Error(`Unsupported target: ${target}`);
}
function toStandardJSONSchemaV1(self) {
  const jsonSchema2 = {
    input(options) {
      return toBaseStandardJSONSchemaV1(self.ast, options.target);
    },
    output(options) {
      return toBaseStandardJSONSchemaV1(toType(self.ast), options.target);
    }
  };
  if (Object.hasOwn(self, "~standard")) {
    const out = self;
    if ("jsonSchema" in out["~standard"]) return out;
    Object.assign(out["~standard"], {
      jsonSchema: jsonSchema2
    });
    return out;
  }
  return Object.assign(self, {
    "~standard": {
      version: 1,
      vendor: "effect",
      jsonSchema: jsonSchema2
    }
  });
}

// node_modules/effect/dist/JsonPatch.js
function get4(oldValue, newValue) {
  const patches = [];
  getLoop(oldValue, newValue, "", patches);
  return patches;
}
function getLoop(oldValue, newValue, path, patches) {
  if (Object.is(oldValue, newValue)) return;
  if (Array.isArray(oldValue) && Array.isArray(newValue)) {
    const len1 = oldValue.length;
    const len2 = newValue.length;
    const shared = Math.min(len1, len2);
    for (let i = 0; i < shared; i++) {
      getLoop(oldValue[i], newValue[i], `${path}/${i}`, patches);
    }
    for (let i = len1 - 1; i >= len2; i--) {
      patches.push({
        op: "remove",
        path: `${path}/${i}`
      });
    }
    for (let i = len1; i < len2; i++) {
      patches.push({
        op: "add",
        path: `${path}/${i}`,
        value: newValue[i]
      });
    }
    return;
  }
  if (isJsonObject(oldValue) && isJsonObject(newValue)) {
    const keys1 = Object.keys(oldValue);
    const keys22 = Object.keys(newValue);
    const allKeys = Array.from(/* @__PURE__ */ new Set([...keys1, ...keys22])).sort();
    for (const key of allKeys) {
      const keyPath = `${path}/${escapeToken(key)}`;
      const hasKey1 = Object.hasOwn(oldValue, key);
      const hasKey2 = Object.hasOwn(newValue, key);
      if (hasKey1 && hasKey2) {
        getLoop(oldValue[key], newValue[key], keyPath, patches);
      } else if (!hasKey1 && hasKey2) {
        patches.push({
          op: "add",
          path: keyPath,
          value: newValue[key]
        });
      } else {
        patches.push({
          op: "remove",
          path: keyPath
        });
      }
    }
    return;
  }
  patches.push({
    op: "replace",
    path,
    value: newValue
  });
}
function apply(patch, oldValue) {
  let doc = oldValue;
  for (const op of patch) {
    doc = applyOperation(doc, op);
  }
  return doc;
}
function isJsonObject(value3) {
  return typeof value3 === "object" && value3 !== null && !Array.isArray(value3);
}
function tokenize(pointer) {
  if (pointer === "") return [];
  if (pointer.charCodeAt(0) !== 47) {
    throw new Error(`Invalid JSON Pointer, it must start with "/": ${JSON.stringify(pointer)}`);
  }
  return pointer.split("/").slice(1).map(unescapeToken);
}
function toJsonPointerArrayIndex(token) {
  if (!/^(0|[1-9]\d*)$/.test(token)) {
    throw new Error(`Invalid array index: "${token}"`);
  }
  return Number(token);
}
function applyOperation(doc, op) {
  if (op.path === "") {
    if (op.op === "remove") throw new Error("Unsupported operation at the root");
    return op.value;
  }
  const resolved = resolveParent(doc, op.path);
  if (resolved === null) {
    throw new Error(`Cannot ${op.op} at "${op.path}" (parent not found or not a container).`);
  }
  const {
    lastToken,
    parent,
    stack
  } = resolved;
  if (Array.isArray(parent)) {
    if (lastToken === "-" && op.op !== "add") {
      throw new Error(`"-" is not valid for ${op.op} at "${op.path}".`);
    }
    const index2 = lastToken === "-" ? parent.length : toJsonPointerArrayIndex(lastToken);
    const maxIndex = op.op === "add" ? parent.length : parent.length - 1;
    if (index2 > maxIndex) throw new Error(`Array index out of bounds at "${op.path}".`);
    const updated = parent.slice();
    if (op.op === "add") updated.splice(index2, 0, op.value);
    else if (op.op === "remove") updated.splice(index2, 1);
    else updated[index2] = op.value;
    return rebuildFromStack(stack, updated);
  }
  if (isJsonObject(parent)) {
    if (op.op !== "add" && !Object.hasOwn(parent, lastToken)) {
      throw new Error(`Property "${lastToken}" does not exist at "${op.path}".`);
    }
    const updated = {
      ...parent
    };
    if (op.op === "remove") delete updated[lastToken];
    else assignProperty(updated, lastToken, op.value);
    return rebuildFromStack(stack, updated);
  }
  throw new Error(`Cannot ${op.op} at "${op.path}" (parent not found or not a container).`);
}
function resolveParent(doc, pointer) {
  const tokens = tokenize(pointer);
  if (tokens.length === 0) return null;
  const lastToken = tokens[tokens.length - 1];
  const stack = [];
  let cur = doc;
  for (let i = 0; i < tokens.length - 1; i++) {
    const token = tokens[i];
    if (Array.isArray(cur)) {
      const idx = toJsonPointerArrayIndex(token);
      if (idx >= cur.length) return null;
      stack.push({
        container: cur,
        token: idx
      });
      cur = cur[idx];
      continue;
    }
    if (isJsonObject(cur)) {
      if (!Object.hasOwn(cur, token)) return null;
      stack.push({
        container: cur,
        token
      });
      cur = cur[token];
      continue;
    }
    return null;
  }
  return {
    stack,
    parent: cur,
    lastToken
  };
}
function rebuildFromStack(stack, newParent) {
  let acc = newParent;
  for (let i = stack.length - 1; i >= 0; i--) {
    const {
      container,
      token
    } = stack[i];
    if (Array.isArray(container)) {
      const copy3 = container.slice();
      copy3[token] = acc;
      acc = copy3;
    } else {
      const copy3 = {
        ...container
      };
      assignProperty(copy3, token, acc);
      acc = copy3;
    }
  }
  return acc;
}

// node_modules/effect/dist/internal/schema/toDifferJsonPatch.js
function toDifferJsonPatch(schema) {
  const serializer = toCodecJson(schema);
  const get6 = encodeSync(serializer);
  const set4 = decodeSync(serializer);
  return {
    empty: [],
    diff: (oldValue, newValue) => get4(get6(oldValue), get6(newValue)),
    combine: (first, second) => [...first, ...second],
    patch: (oldValue, patch) => {
      const value3 = get6(oldValue);
      const patched = apply(patch, value3);
      return Object.is(patched, value3) ? oldValue : set4(patched);
    }
  };
}

// node_modules/effect/dist/internal/schema/toEncoderXml.js
function toEncoderXml(codec, options) {
  const rootName = resolveIdentifier(codec.ast) ?? resolveTitle(codec.ast);
  const serialize = encodeEffect(toCodecStringTree(codec));
  return (value3) => serialize(value3).pipe(map7((stringTree) => stringTreeToXml(stringTree, {
    rootName,
    ...options
  })));
}
function stringTreeToXml(value3, options) {
  const rootName = options.rootName ?? "root";
  const arrayItemName = options.arrayItemName ?? "item";
  const pretty2 = options.pretty ?? true;
  const indent = options.indent ?? "  ";
  const sortKeys = options.sortKeys ?? true;
  const seen = /* @__PURE__ */ new Set();
  const lines4 = [];
  recur2(rootName, value3, 0);
  return lines4.join(pretty2 ? "\n" : "");
  function push(depth, text2) {
    lines4.push(pretty2 ? indent.repeat(depth) + text2 : text2);
  }
  function recur2(tagName, node, depth, originalNameForMeta) {
    const {
      attrs,
      safe
    } = xml.tagInfo(tagName, originalNameForMeta);
    if (node === void 0) {
      push(depth, `<${safe}${attrs}/>`);
    } else if (typeof node === "string") {
      push(depth, `<${safe}${attrs}>${xml.escapeText(node)}</${safe}>`);
    } else if (typeof node !== "object" || node === null) {
      push(depth, `<${safe}${attrs}>${xml.escapeText(format(node))}</${safe}>`);
    } else {
      if (seen.has(node)) throw new globalThis.Error("Cycle detected while serializing to XML.", {
        cause: node
      });
      seen.add(node);
      try {
        if (globalThis.Array.isArray(node)) {
          if (node.length === 0) {
            push(depth, `<${safe}${attrs}/>`);
            return;
          }
          push(depth, `<${safe}${attrs}>`);
          for (const item of node) recur2(arrayItemName, item, depth + 1);
          push(depth, `</${safe}>`);
          return;
        }
        const object = node;
        const keys3 = Object.keys(object);
        if (sortKeys) keys3.sort();
        if (keys3.length === 0) {
          push(depth, `<${safe}${attrs}/>`);
          return;
        }
        push(depth, `<${safe}${attrs}>`);
        for (const key of keys3) {
          recur2(xml.parseTagName(key).safe, object[key], depth + 1, key);
        }
        push(depth, `</${safe}>`);
      } finally {
        seen.delete(node);
      }
    }
  }
}
var xml = {
  escapeText(value3) {
    return value3.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  },
  escapeAttribute(value3) {
    return value3.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  },
  parseTagName(name) {
    const original = name;
    let safe = name;
    if (!/^[A-Za-z_]/.test(safe)) safe = "_" + safe;
    safe = safe.replace(/[^A-Za-z0-9._-]/g, "_");
    if (/^xml/i.test(safe)) safe = "_" + safe;
    return {
      safe,
      changed: safe !== original
    };
  },
  tagInfo(name, original) {
    const {
      changed,
      safe
    } = xml.parseTagName(name);
    const needsMeta = changed || original && original !== name;
    const attrs = needsMeta ? ` data-name="${xml.escapeAttribute(original ?? name)}"` : "";
    return {
      safe,
      attrs
    };
  }
};

// node_modules/effect/dist/internal/schema/toEquivalence.js
var toEquivalence = /* @__PURE__ */ memoize((ast) => {
  return recur(ast);
});
function recur(ast) {
  const annotation = resolve(ast)?.["toEquivalence"];
  if (annotation) {
    return annotation(isDeclaration(ast) ? ast.typeParameters.map(recur) : []);
  }
  switch (ast._tag) {
    case "Never":
      return strictEqual();
    case "Declaration":
      return declarationEquivalence(ast);
    case "Null":
    case "Undefined":
    case "Void":
    case "Unknown":
    case "Any":
    case "String":
    case "Number":
    case "Boolean":
    case "BigInt":
    case "Symbol":
    case "Literal":
    case "UniqueSymbol":
    case "ObjectKeyword":
    case "Enum":
    case "TemplateLiteral":
      return equals;
    case "Arrays": {
      const elements = ast.elements.map(recur);
      const rest = ast.rest.map(recur);
      const [head3, ...tail2] = rest;
      const tailLength = tail2.length;
      return make((a, b) => {
        if (!Array.isArray(a) || !Array.isArray(b)) {
          return false;
        }
        const len = a.length;
        if (len !== b.length) {
          return false;
        }
        let i = 0;
        for (; i < Math.min(len, ast.elements.length); i++) {
          if (!elements[i](a[i], b[i])) {
            return false;
          }
        }
        if (rest.length > 0) {
          for (; i < len - tailLength; i++) {
            if (!head3(a[i], b[i])) {
              return false;
            }
          }
          for (let j = 0; j < tailLength; j++) {
            if (!tail2[j](a[i + j], b[i + j])) {
              return false;
            }
          }
        }
        return true;
      });
    }
    case "Objects": {
      if (ast.propertySignatures.length === 0 && ast.indexSignatures.length === 0) {
        return equals;
      }
      const propertySignatures = ast.propertySignatures.map((ps) => recur(ps.type));
      const indexSignatures = ast.indexSignatures.map((is3) => recur(is3.type));
      return make((a, b) => {
        if (!isObject(a) || !isObject(b)) {
          return false;
        }
        for (let i = 0; i < propertySignatures.length; i++) {
          const ps = ast.propertySignatures[i];
          const name = ps.name;
          const aHas = Object.hasOwn(a, name);
          const bHas = Object.hasOwn(b, name);
          if (isOptional(ps.type)) {
            if (aHas !== bHas) {
              return false;
            }
          }
          if (aHas && bHas && !propertySignatures[i](a[name], b[name])) {
            return false;
          }
        }
        for (let i = 0; i < indexSignatures.length; i++) {
          const is3 = ast.indexSignatures[i];
          const aKeys = getIndexSignatureKeys(a, is3.parameter);
          const bKeys = getIndexSignatureKeys(b, is3.parameter);
          if (aKeys.length !== bKeys.length) return false;
          for (let j = 0; j < aKeys.length; j++) {
            const key = aKeys[j];
            if (!Object.hasOwn(b, key) || !indexSignatures[i](a[key], b[key])) {
              return false;
            }
          }
        }
        return true;
      });
    }
    case "Union": {
      const types = toType(ast).types;
      const index2 = getCandidateIndex(types);
      const compiled = types.map((candidate2, i) => [_is(candidate2), recur(ast.types[i])]);
      return make((a, b) => {
        const candidates2 = index2(a, false);
        for (let i = 0; i < candidates2.length; i++) {
          const [is3, equivalence] = compiled[candidates2[i]];
          if (is3(a) && is3(b)) {
            return equivalence(a, b);
          }
        }
        return false;
      });
    }
    case "Suspend": {
      let equivalence;
      return make((a, b) => (equivalence ??= toEquivalence(ast.thunk()))(a, b));
    }
  }
}
function declarationEquivalence(ast) {
  const representation = ast.annotations?.representation;
  if (representation === void 0) return equals;
  switch (representation.id) {
    case "effect/schema/Option": {
      const [value3] = declarationTypeParameters(ast);
      return (a, b) => a._tag === b._tag && (a._tag === "None" || value3(a.value, b.value));
    }
    case "effect/schema/Result": {
      const [success, failure] = declarationTypeParameters(ast);
      return (a, b) => a._tag === b._tag && (a._tag === "Success" ? success(a.success, b.success) : failure(a.failure, b.failure));
    }
    case "effect/schema/CauseReason": {
      const [error, defect] = declarationTypeParameters(ast);
      return causeReasonEquivalence(error, defect);
    }
    case "effect/schema/Cause": {
      const [error, defect] = declarationTypeParameters(ast);
      return causeEquivalence(error, defect);
    }
    case "effect/schema/Exit": {
      const [value3, error, defect] = declarationTypeParameters(ast);
      const cause = causeEquivalence(error, defect);
      return (a, b) => a._tag === b._tag && (a._tag === "Success" ? value3(a.value, b.value) : cause(a.cause, b.cause));
    }
    case "effect/schema/ReadonlyMap": {
      const [key, value3] = declarationTypeParameters(ast);
      return makeCompareMap(key, value3);
    }
    case "effect/schema/ReadonlySet":
      return makeCompareSet(declarationTypeParameters(ast)[0]);
    case "effect/schema/RegExp":
      return (a, b) => a.source === b.source && a.flags === b.flags;
    case "effect/schema/URL":
      return (a, b) => a.toString() === b.toString();
    default:
      return equals;
  }
}
function declarationTypeParameters(ast) {
  return ast.typeParameters.map(recur);
}
function causeReasonEquivalence(error, defect) {
  return (a, b) => {
    if (a._tag !== b._tag) return false;
    switch (a._tag) {
      case "Fail":
        return error(a.error, b.error);
      case "Die":
        return defect(a.defect, b.defect);
      case "Interrupt":
        return a.fiberId === b.fiberId;
    }
  };
}
function causeEquivalence(error, defect) {
  const reasons = Array_(causeReasonEquivalence(error, defect));
  return (a, b) => reasons(a.reasons, b.reasons);
}

// node_modules/effect/dist/internal/schema/toFormatter.js
function causeReasonToFormatter(error, defect) {
  return (reason) => {
    switch (reason._tag) {
      case "Fail":
        return `Fail(${error(reason.error)})`;
      case "Die":
        return `Die(${defect(reason.defect)})`;
      case "Interrupt":
        return "Interrupt";
    }
  };
}
function causeToFormatter(error, defect) {
  const causeReason = causeReasonToFormatter(error, defect);
  return (cause) => `Cause([${cause.reasons.map(causeReason).join(", ")}])`;
}
function toFormatter(ast, options) {
  const compiled = /* @__PURE__ */ new Map();
  return recur2(ast);
  function recur2(ast2) {
    let formatter = compiled.get(ast2);
    if (formatter === void 0) {
      formatter = compile2(ast2);
      compiled.set(ast2, formatter);
    }
    return formatter;
  }
  function compile2(ast2) {
    const annotation = resolve(ast2)?.["toFormatter"];
    if (typeof annotation === "function") {
      return annotation(isDeclaration(ast2) ? ast2.typeParameters.map(recur2) : []);
    }
    if (options?.onBefore) {
      const onBefore = options.onBefore(ast2, recur2);
      if (onBefore !== void 0) {
        return onBefore;
      }
    }
    return on(ast2);
  }
  function on(ast2) {
    switch (ast2._tag) {
      default:
        return format;
      case "Never":
        return () => "never";
      case "Void":
        return () => "void";
      case "Declaration": {
        const representation = ast2.annotations?.representation;
        if (representation === void 0) return format;
        const typeParameters = ast2.typeParameters.map(recur2);
        switch (representation.id) {
          case "effect/schema/Option": {
            const [value3] = typeParameters;
            return match({
              onNone: () => "none()",
              onSome: (value_) => `some(${value3(value_)})`
            });
          }
          case "effect/schema/Result": {
            const [success, failure] = typeParameters;
            return match2({
              onSuccess: (value3) => `success(${success(value3)})`,
              onFailure: (error) => `failure(${failure(error)})`
            });
          }
          case "effect/schema/CauseReason":
            return causeReasonToFormatter(typeParameters[0], typeParameters[1]);
          case "effect/schema/Cause":
            return causeToFormatter(typeParameters[0], typeParameters[1]);
          case "effect/schema/Exit": {
            const [value3, error, defect] = typeParameters;
            const cause = causeToFormatter(error, defect);
            return (exit4) => {
              switch (exit4._tag) {
                case "Success":
                  return `Exit.Success(${value3(exit4.value)})`;
                case "Failure":
                  return `Exit.Failure(${cause(exit4.cause)})`;
              }
            };
          }
          case "effect/schema/ReadonlyMap": {
            const [key, value3] = typeParameters;
            return (map10) => {
              const size7 = map10.size;
              if (size7 === 0) return "ReadonlyMap(0) {}";
              const entries3 = globalThis.Array.from(map10.entries()).sort().map(([key_, value_]) => `${key(key_)} => ${value3(value_)}`);
              return `ReadonlyMap(${size7}) { ${entries3.join(", ")} }`;
            };
          }
          case "effect/schema/HashMap": {
            const [key, value3] = typeParameters;
            return (map10) => {
              const size7 = size3(map10);
              if (size7 === 0) return "HashMap(0) {}";
              const entries3 = toEntries(map10).sort().map(([key_, value_]) => `${key(key_)} => ${value3(value_)}`);
              return `HashMap(${size7}) { ${entries3.join(", ")} }`;
            };
          }
          case "effect/schema/ReadonlySet": {
            const [value3] = typeParameters;
            return (set4) => {
              const size7 = set4.size;
              if (size7 === 0) return "ReadonlySet(0) {}";
              const values2 = globalThis.Array.from(set4.values()).sort().map((item) => `${value3(item)}`);
              return `ReadonlySet(${size7}) { ${values2.join(", ")} }`;
            };
          }
          case "effect/schema/HashSet": {
            const [value3] = typeParameters;
            return (set4) => {
              const size7 = size5(set4);
              if (size7 === 0) return "HashSet(0) {}";
              const values2 = globalThis.Array.from(set4).sort().map((item) => `${value3(item)}`);
              return `HashSet(${size7}) { ${values2.join(", ")} }`;
            };
          }
          case "effect/schema/Chunk": {
            const [value3] = typeParameters;
            return (chunk) => {
              const size7 = size(chunk);
              if (size7 === 0) return "Chunk(0) {}";
              const values2 = globalThis.Array.from(chunk).sort().map((item) => `${value3(item)}`);
              return `Chunk(${size7}) { ${values2.join(", ")} }`;
            };
          }
          default:
            return format;
        }
      }
      case "Arrays": {
        const elements = ast2.elements.map((element) => recur2(element));
        const rest = ast2.rest.map(recur2);
        const [head3, ...tail2] = rest;
        const tailLength = tail2.length;
        return (value3) => {
          const out = [];
          let i = 0;
          for (; i < elements.length; i++) {
            if (value3.length < i + 1) {
              if (isOptional(ast2.elements[i])) {
                continue;
              }
            } else {
              out.push(elements[i](value3[i]));
            }
          }
          if (rest.length > 0) {
            for (; i < value3.length - tailLength; i++) {
              out.push(head3(value3[i]));
            }
            for (let j = 0; j < tailLength; j++) {
              out.push(tail2[j](value3[i + j]));
            }
          }
          return "[" + out.join(", ") + "]";
        };
      }
      case "Objects": {
        const propertySignatures = ast2.propertySignatures.map((signature) => recur2(signature.type));
        const indexSignatures = ast2.indexSignatures.map((signature) => recur2(signature.type));
        if (ast2.propertySignatures.length === 0 && ast2.indexSignatures.length === 0) {
          return format;
        }
        return (value3) => {
          const out = [];
          const visited = /* @__PURE__ */ new Set();
          for (let i = 0; i < propertySignatures.length; i++) {
            const signature = ast2.propertySignatures[i];
            const name = signature.name;
            visited.add(name);
            if (isOptional(signature.type) && !Object.hasOwn(value3, name)) {
              continue;
            }
            out.push(`${formatPropertyKey(name)}: ${propertySignatures[i](value3[name])}`);
          }
          for (let i = 0; i < indexSignatures.length; i++) {
            const keys3 = getIndexSignatureKeys(value3, ast2.indexSignatures[i].parameter);
            for (const key of keys3) {
              if (visited.has(key)) {
                continue;
              }
              visited.add(key);
              out.push(`${formatPropertyKey(key)}: ${indexSignatures[i](value3[key])}`);
            }
          }
          return out.length > 0 ? "{ " + out.join(", ") + " }" : "{}";
        };
      }
      case "Union": {
        const types = toType(ast2).types;
        const index2 = getCandidateIndex(types);
        const compiled2 = types.map((candidate2, i) => [_is(candidate2), recur2(ast2.types[i])]);
        return (value3) => {
          const candidates2 = index2(value3, false);
          for (let i = 0; i < candidates2.length; i++) {
            const [is3, formatter] = compiled2[candidates2[i]];
            if (is3(value3)) {
              return formatter(value3);
            }
          }
          return format(value3);
        };
      }
      case "Suspend": {
        let formatter;
        return (value3) => (formatter ??= recur2(ast2.thunk()))(value3);
      }
    }
  }
}

// node_modules/effect/dist/Struct.js
var pick2 = /* @__PURE__ */ dual(2, (self, keys3) => {
  return buildStruct(self, (k, v) => hasPropertyKey(keys3, k) ? [k, v] : void 0);
});
var omit3 = /* @__PURE__ */ dual(2, (self, keys3) => {
  return buildStruct(self, (k, v) => !hasPropertyKey(keys3, k) ? [k, v] : void 0);
});
var assign = /* @__PURE__ */ dual(2, (self, that) => {
  return {
    ...self,
    ...that
  };
});
var renameKeys = /* @__PURE__ */ dual(2, (self, mapping) => {
  return buildStruct(self, (k, v) => [Object.hasOwn(mapping, k) ? mapping[k] : k, v]);
});
var lambda = (f) => f;
function hasPropertyKey(keys3, key) {
  return keys3.some((candidate2) => candidate2 === key || typeof candidate2 === "number" && String(candidate2) === key);
}
function buildStruct(source, f) {
  const out = {};
  for (const k of Reflect.ownKeys(source)) {
    if (!Object.prototype.propertyIsEnumerable.call(source, k)) continue;
    const res = f(k, source[k]);
    if (res) {
      const [nk, nv] = res;
      assignProperty(out, nk, nv);
    }
  }
  return out;
}

// node_modules/effect/dist/Optic.js
function makeIso(get6, set4) {
  return make17(primitiveNode("Iso", get6, set4));
}
function makeLens(get6, replace) {
  return make17(primitiveNode("Lens", get6, replace));
}
function primitiveNode(kind, get6, set4) {
  return [{
    _tag: "PrimitiveNode",
    kind,
    get: get6,
    set: set4
  }];
}
var identityOperation = {
  kind: "Iso",
  get: identity,
  set: identity
};
var PathNode = class {
  _tag = "PathNode";
  kind = "Lens";
  path;
  get;
  set;
  constructor(path) {
    this.path = path;
    this.get = (s) => {
      let out = s;
      for (let i = 0; i < path.length; i++) {
        out = out[path[i]];
      }
      return out;
    };
    this.set = (a, s) => {
      const out = cloneShallow(s);
      let current = out;
      let i = 0;
      for (; i < path.length - 1; i++) {
        const key = path[i];
        assignProperty(current, key, cloneShallow(current[key]));
        current = current[key];
      }
      assignProperty(current, path[i], a);
      return out;
    };
  }
};
var CheckNode = class {
  _tag = "CheckNode";
  kind = "Prism";
  checks;
  get;
  set = identity;
  constructor(checks) {
    this.checks = checks;
    this.get = (s) => runChecks(checks, s);
  }
};
function compose2(a, b) {
  if (a.length === 0) return b;
  if (b.length === 0) return a;
  const nodes = a.slice();
  for (let i = 0; i < b.length; i++) {
    const node = b[i];
    const last = nodes[nodes.length - 1];
    if (last._tag === "PathNode" && node._tag === "PathNode") {
      nodes[nodes.length - 1] = new PathNode([...last.path, ...node.path]);
    } else if (last._tag === "CheckNode" && node._tag === "CheckNode") {
      nodes[nodes.length - 1] = new CheckNode([...last.checks, ...node.checks]);
    } else {
      nodes.push(node);
    }
  }
  return nodes;
}
function makeOptional(getResult, set4) {
  return make17(primitiveNode("Optional", getResult, set4));
}
var OptionalImpl = class {
  /** @internal */
  node;
  getResult;
  replaceResult;
  constructor(node, getResult, replaceResult) {
    this.node = node;
    this.getResult = getResult;
    this.replaceResult = replaceResult;
  }
  replace(a, s) {
    return getOrElse3(this.replaceResult(a, s), () => s);
  }
  modify(f) {
    return (s) => getOrElse3(flatMap2(this.getResult(s), (a) => this.replaceResult(f(a), s)), () => s);
  }
  compose(that) {
    return make17(compose2(this.node, that.node));
  }
  key(key) {
    return make17(compose2(this.node, [new PathNode([key])]));
  }
  optionalKey(key) {
    return make17(compose2(this.node, primitiveNode("Lens", (s) => s[key], (a, s) => {
      const copy3 = cloneShallow(s);
      if (a === void 0) {
        if (Array.isArray(copy3) && (typeof key === "number" || typeof key === "string" && isCanonicalArrayIndex(key))) {
          copy3.splice(Number(key), 1);
        } else {
          delete copy3[key];
        }
      } else {
        assignProperty(copy3, key, a);
      }
      return copy3;
    })));
  }
  check(...checks) {
    return make17(compose2(this.node, [new CheckNode(checks)]));
  }
  refine(refinement, annotations) {
    return make17(compose2(this.node, [new CheckNode([makeFilterByGuard(refinement, annotations)])]));
  }
  tag(tag2) {
    const err = fail2(new InvalidValue({
      expected: `${JSON.stringify(tag2)} tag`
    }));
    return make17(compose2(this.node, primitiveNode("Prism", (s) => s._tag === tag2 ? succeed2(s) : err, identity)));
  }
  at(key, ..._rest) {
    const err = fail2(new Pointer([key], new MissingKey(void 0)));
    return make17(compose2(this.node, primitiveNode("Optional", (s) => Object.hasOwn(s, key) ? succeed2(s[key]) : err, (a, s) => {
      if (Object.hasOwn(s, key)) {
        const copy3 = cloneShallow(s);
        assignProperty(copy3, key, a);
        return succeed2(copy3);
      } else {
        return err;
      }
    })));
  }
  pick(keys3) {
    return this.compose(makeLens(pick2(keys3), (p, a) => ({
      ...omit3(a, keys3),
      ...p
    })));
  }
  omit(keys3) {
    return this.compose(makeLens(omit3(keys3), (o, a) => ({
      ...pick2(a, keys3),
      ...o
    })));
  }
  notUndefined() {
    return this.refine(isNotUndefined, {
      expected: "a value other than `undefined`"
    });
  }
  forEach(f) {
    const inner = f(id());
    return makeOptional(
      // GET: collect focused Bs
      (s) => map2(this.getResult(s), (as3) => {
        const bs = [];
        for (let i = 0; i < as3.length; i++) {
          const r = inner.getResult(as3[i]);
          if (isSuccess2(r)) bs.push(r.success);
        }
        return bs;
      }),
      // SET: bs must match the number of focusable elements
      (bs, s) => flatMap2(this.getResult(s), (as3) => {
        const idxs = [];
        for (let i = 0; i < as3.length; i++) {
          if (isSuccess2(inner.getResult(as3[i]))) idxs.push(i);
        }
        if (bs.length !== idxs.length) {
          return fail2(new InvalidValue({
            message: `each: replacement length mismatch: ${bs.length} !== ${idxs.length}`
          }));
        }
        const out = as3.slice();
        for (let k = 0; k < idxs.length; k++) {
          const i = idxs[k];
          const r = inner.replaceResult(bs[k], as3[i]);
          if (isFailure2(r)) {
            return fail2(new Pointer([i], r.failure));
          }
          out[i] = r.success;
        }
        return this.replaceResult(out, s);
      })
    );
  }
  modifyAll(f) {
    return (s) => getOrElse3(flatMap2(this.getResult(s), (as3) => this.replaceResult(as3.map(f), s)), () => s);
  }
};
var IsoImpl = class extends OptionalImpl {
  get;
  set;
  constructor(node, get6, set4) {
    super(node, (s) => succeed2(get6(s)), (a) => succeed2(set4(a)));
    this.get = get6;
    this.set = set4;
  }
  replace(a, _) {
    return this.set(a);
  }
  modify(f) {
    return (s) => this.set(f(this.get(s)));
  }
};
var LensImpl = class extends OptionalImpl {
  get;
  constructor(node, get6, replace) {
    super(node, (s) => succeed2(get6(s)), (a, s) => succeed2(replace(a, s)));
    this.get = get6;
    this.replace = replace;
  }
  modify(f) {
    return (s) => this.replace(f(this.get(s)), s);
  }
};
var PrismImpl = class extends OptionalImpl {
  set;
  constructor(node, getResult, set4) {
    super(node, getResult, (a, _) => succeed2(set4(a)));
    this.set = set4;
  }
  replace(a, _) {
    return this.set(a);
  }
  modify(f) {
    return (s) => getOrElse3(map2(this.getResult(s), (a) => this.set(f(a))), () => s);
  }
};
function make17(node) {
  let op = node[0] ?? identityOperation;
  if (node.length > 1) {
    const kind = node.reduce((kind2, step2) => composeKind(kind2, step2.kind), "Iso");
    op = {
      kind,
      get: compileGet(node, kind),
      set: compileSet(node, kind)
    };
  }
  switch (op.kind) {
    case "Iso":
      return new IsoImpl(node, op.get, op.set);
    case "Lens":
      return new LensImpl(node, op.get, op.set);
    case "Prism":
      return new PrismImpl(node, op.get, op.set);
    case "Optional":
      return new OptionalImpl(node, op.get, op.set);
  }
}
function cloneShallow(pojo) {
  if (Array.isArray(pojo)) return pojo.slice();
  if (typeof pojo === "object" && pojo !== null) {
    const proto = Object.getPrototypeOf(pojo);
    if (proto !== Object.prototype && proto !== null) {
      throw new Error("Cannot clone object with non-Object constructor or null prototype");
    }
    return {
      ...pojo
    };
  }
  return pojo;
}
function compileGet(nodes, kind) {
  return (s) => {
    for (let i = 0; i < nodes.length; i++) {
      const op = nodes[i];
      const result3 = op.get(s);
      if (hasFailingGet(op.kind)) {
        if (isFailure2(result3)) {
          return result3;
        }
        s = result3.success;
      } else {
        s = result3;
      }
    }
    return hasFailingGet(kind) ? succeed2(s) : s;
  };
}
function compileSet(nodes, kind) {
  if (hasSourceFreeSet(kind)) {
    return (a) => {
      for (let i = nodes.length - 1; i >= 0; i--) {
        a = nodes[i].set(a);
      }
      return a;
    };
  }
  return (a, s) => {
    const len = nodes.length;
    const sources = new Array(len);
    for (let i = 0; i < len; i++) {
      sources[i] = s;
      const op = nodes[i];
      if (hasFailingGet(op.kind)) {
        const result3 = op.get(s);
        if (isFailure2(result3)) {
          return result3;
        }
        s = result3.success;
      } else {
        s = op.get(s);
      }
    }
    for (let i = len - 1; i >= 0; i--) {
      const op = nodes[i];
      if (hasSourceFreeSet(op.kind)) {
        a = op.set(a);
      } else if (op.kind === "Lens") {
        a = op.set(a, sources[i]);
      } else {
        const result3 = op.set(a, sources[i]);
        if (isFailure2(result3)) {
          return result3;
        }
        a = result3.success;
      }
    }
    return kind === "Optional" ? succeed2(a) : a;
  };
}
function hasFailingGet(kind) {
  return kind === "Prism" || kind === "Optional";
}
function hasSourceFreeSet(kind) {
  return kind === "Iso" || kind === "Prism";
}
function composeKind(a, b) {
  if (a === "Iso") return b;
  if (b === "Iso" || a === b) return a;
  return "Optional";
}
var identityIso = /* @__PURE__ */ make17([]);
function id() {
  return identityIso;
}

// node_modules/effect/dist/internal/schema/toIso.js
function toIso(schema) {
  const serializer = toCodecIso(schema);
  return makeIso(encodeSync(serializer), decodeSync(serializer));
}
function toIsoSource(_) {
  return id();
}
function toIsoFocus(_) {
  return id();
}

// node_modules/effect/dist/internal/schemaError.js
var SchemaErrorTypeId = "~effect/Schema/SchemaError";
function isSchemaError(u) {
  return hasProperty(u, SchemaErrorTypeId) && u[SchemaErrorTypeId] === SchemaErrorTypeId;
}

// node_modules/effect/dist/net/NetAddress.js
var TypeId25 = "~effect/net/NetAddress";
var ipv4Value = (self) => self.value;
var ipv6Words = (self) => self;
var getMacBytes = (self) => self.bytes;
var NetAddressError = class extends (/* @__PURE__ */ TaggedError2("NetAddressError")) {
};
var isAddress = (u) => hasProperty(u, TypeId25);
var isIpv4Address = (u) => isAddress(u) && u._tag === "Ipv4Address";
var isIpv6Address = (u) => isAddress(u) && u._tag === "Ipv6Address";
var isIpAddress = (u) => isIpv4Address(u) || isIpv6Address(u);
var width = (address) => isIpv4Address(address) ? 32 : 128;
var isMacAddress = (u) => isAddress(u) && u._tag === "MacAddress";
var isInetAddressV4 = (u) => isAddress(u) && u._tag === "InetAddressV4";
var isInetAddressV6 = (u) => isAddress(u) && u._tag === "InetAddressV6";
var isInetAddress = (u) => isInetAddressV4(u) || isInetAddressV6(u);
var isUnixPathAddress = (u) => isAddress(u) && u._tag === "UnixPathAddress";
var isSocketAddress = (u) => isInetAddress(u) || isUnixPathAddress(u);
var Ipv4Proto = {
  ...BaseProto,
  _tag: "Ipv4Address",
  [TypeId25]: TypeId25,
  [symbol2](that) {
    return isIpv4Address(that) && ipv4Value(this) === ipv4Value(that);
  },
  [symbol]() {
    return optimize(combine(ipv4HashSeed, ipv4Value(this) | 0));
  },
  toString() {
    return formatIp(this);
  },
  toJSON() {
    return this.toString();
  }
};
var Ipv6Proto = {
  ...BaseProto,
  _tag: "Ipv6Address",
  [TypeId25]: TypeId25,
  [symbol2](that) {
    if (!isIpv6Address(that)) return false;
    const self = ipv6Words(this);
    const other = ipv6Words(that);
    return self.w0 === other.w0 && self.w1 === other.w1 && self.w2 === other.w2 && self.w3 === other.w3;
  },
  [symbol]() {
    const self = ipv6Words(this);
    let h = combine(ipv6HashSeed, self.w0 | 0);
    h = combine(h, self.w1 | 0);
    h = combine(h, self.w2 | 0);
    return optimize(combine(h, self.w3 | 0));
  },
  toString() {
    return formatIp(this);
  },
  toJSON() {
    return this.toString();
  }
};
var MacProto = {
  ...BaseProto,
  _tag: "MacAddress",
  [TypeId25]: TypeId25,
  [symbol2](that) {
    return isMacAddress(that) && bytesEqual(getMacBytes(this), getMacBytes(that));
  },
  [symbol]() {
    return combine(macHashSeed, array(getMacBytes(this)));
  },
  toString() {
    return formatMacAddress(this);
  },
  toJSON() {
    return this.toString();
  }
};
var bytesEqual = (self, that) => {
  if (self.length !== that.length) return false;
  for (let index2 = 0; index2 < self.length; index2++) {
    if (self[index2] !== that[index2]) return false;
  }
  return true;
};
var ipv4HashSeed = /* @__PURE__ */ string("Ipv4Address");
var ipv6HashSeed = /* @__PURE__ */ string("Ipv6Address");
var macHashSeed = /* @__PURE__ */ string("MacAddress");
var makeIpv4 = (value3) => {
  const self = Object.create(Ipv4Proto);
  self.value = value3 >>> 0;
  return Object.freeze(self);
};
var makeIpv6 = (w0, w1, w2, w3) => {
  const self = Object.create(Ipv6Proto);
  self.w0 = w0 >>> 0;
  self.w1 = w1 >>> 0;
  self.w2 = w2 >>> 0;
  self.w3 = w3 >>> 0;
  return Object.freeze(self);
};
var packOctets = (a, b, c, d) => (a << 24 | b << 16 | c << 8 | d) >>> 0;
var wordToOctets = (word) => [word >>> 24, word >>> 16 & 255, word >>> 8 & 255, word & 255];
var makeMac = (bytes3) => {
  const self = Object.assign(Object.create(MacProto), {
    bytes: new Uint8Array(bytes3)
  });
  return Object.freeze(self);
};
var addressError = (input, message) => fail2(new NetAddressError({
  input,
  message
}));
var allIntegersInRange = (values2, max5) => {
  for (let i = 0; i < values2.length; i++) {
    const n = values2[i];
    if (!Number.isInteger(n) || n < 0 || n > max5) return false;
  }
  return true;
};
var ipv4FromOctets = (octets) => {
  if (!allIntegersInRange(octets, 255)) {
    return addressError(octets, "octets must be integers from 0 through 255");
  }
  return succeed2(makeIpv4(packOctets(octets[0], octets[1], octets[2], octets[3])));
};
var ipv6FromSegments = (segments) => {
  if (!allIntegersInRange(segments, 65535)) {
    return addressError(segments, "segments must be integers from 0 through 65535");
  }
  return succeed2(makeIpv6(segments[0] * 65536 + segments[1], segments[2] * 65536 + segments[3], segments[4] * 65536 + segments[5], segments[6] * 65536 + segments[7]));
};
var macAddressFromString = (input) => {
  if (!/^(?:[0-9a-fA-F]{2}:){5}[0-9a-fA-F]{2}$/.test(input)) {
    return addressError(input, "expected six two-digit hexadecimal octets separated by colons");
  }
  return succeed2(makeMac(new Uint8Array(input.split(":").map((part) => Number.parseInt(part, 16)))));
};
var ipv4FromString = (input) => {
  const parts2 = input.split(".");
  if (parts2.length !== 4 || parts2.some((part) => !/^\d{1,3}$/.test(part))) {
    return addressError(input, "expected exactly four decimal octets");
  }
  if (parts2.some((part) => part.length > 1 && part[0] === "0")) {
    return addressError(input, "leading zeroes are not allowed");
  }
  const octets = parts2.map(Number);
  if (octets.some((part) => part > 255)) {
    return addressError(input, "octets must be at most 255");
  }
  return ipv4FromOctets([octets[0], octets[1], octets[2], octets[3]]);
};
var parseIpv6Segments = (input) => {
  if (input.includes("[") || input.includes("]") || input.includes("%")) {
    return addressError(input, "brackets and zone identifiers are not valid in a bare IPv6 address");
  }
  const halves = input.split("::");
  if (halves.length > 2) return addressError(input, "only one compression marker is allowed");
  const head3 = halves[0] === "" ? [] : halves[0].split(":");
  const tail2 = halves.length === 2 && halves[1] !== "" ? halves[1].split(":") : [];
  if (head3.some((part) => part === "") || tail2.some((part) => part === "")) {
    return addressError(input, "empty segments are only valid in the compression marker");
  }
  const trailing = tail2.length > 0 ? tail2[tail2.length - 1] : head3.length > 0 ? head3[head3.length - 1] : "";
  let embedded;
  if (trailing.includes(".")) {
    if (halves.length === 2 && tail2.length === 0) {
      return addressError(input, "embedded IPv4 syntax must be trailing");
    }
    const parsed = map2(ipv4FromString(trailing), (address) => {
      const value3 = ipv4Value(address);
      return [value3 >>> 16, value3 & 65535];
    });
    if (isFailure2(parsed)) return parsed;
    embedded = parsed.success;
    if (tail2.length > 0) tail2.pop();
    else head3.pop();
  }
  const explicit = head3.length + tail2.length + (embedded ? 2 : 0);
  if (halves.length === 1 ? explicit !== 8 : explicit >= 8) {
    return addressError(input, halves.length === 1 ? "expected eight segments" : "compression must replace at least one segment");
  }
  const parse = (part) => /^[0-9a-fA-F]{1,4}$/.test(part) ? Number.parseInt(part, 16) : void 0;
  const parsedHead = head3.map(parse);
  const parsedTail = tail2.map(parse);
  if (parsedHead.some((part) => part === void 0) || parsedTail.some((part) => part === void 0)) {
    return addressError(input, "segments must contain one through four hexadecimal digits");
  }
  return succeed2([...parsedHead, ...Array(8 - explicit).fill(0), ...parsedTail, ...embedded ?? []]);
};
var ipv6FromString = (input) => {
  return flatMap2(parseIpv6Segments(input), (segments) => ipv6FromSegments(segments));
};
var ipFromString = (input) => {
  const result3 = input.includes(":") ? ipv6FromString(input) : ipv4FromString(input);
  return result3;
};
var isScopedIpv6Literal = (u) => {
  if (typeof u !== "string" || !u.includes("%")) return false;
  const result3 = scopedIpv6LiteralFromString(u);
  return isSuccess2(result3) && result3.success === u;
};
var scopedIpv6LiteralFromString = (input) => {
  const separator = input.indexOf("%");
  if (separator === -1) return addressError(input, "expected an IPv6 zone");
  let zone = input.slice(separator + 1);
  if (zone.length === 0 || /[%[\]/\s\p{Cc}]/u.test(zone)) {
    return addressError(input, "invalid IPv6 scope identifier");
  }
  if (/^\d+$/.test(zone)) {
    const scopeId = Number(zone);
    if (scopeId > 4294967295) return addressError(input, "scope identifier must be an unsigned 32-bit integer");
    zone = String(scopeId);
  }
  return map2(ipv6FromString(input.slice(0, separator)), (address) => `${formatIp(address)}%${zone}`);
};
var ipv4ToOctets = (self) => wordToOctets(ipv4Value(self));
var ipv6ToSegments = (self) => {
  const {
    w0,
    w1,
    w2,
    w3
  } = ipv6Words(self);
  return [w0 >>> 16, w0 & 65535, w1 >>> 16, w1 & 65535, w2 >>> 16, w2 & 65535, w3 >>> 16, w3 & 65535];
};
var ipv6ToOctets = (self) => {
  const {
    w0,
    w1,
    w2,
    w3
  } = ipv6Words(self);
  return [...wordToOctets(w0), ...wordToOctets(w1), ...wordToOctets(w2), ...wordToOctets(w3)];
};
var formatMacAddress = (self) => Array.from(getMacBytes(self), (byte) => byte.toString(16).padStart(2, "0")).join(":");
var isMacBroadcast = (self) => getMacBytes(self).every((byte) => byte === 255);
var isMacMulticast = (self) => (getMacBytes(self)[0] & 1) !== 0;
var isMacUnicast = (self) => (getMacBytes(self)[0] & 1) === 0;
var isMacLocallyAdministered = (self) => (getMacBytes(self)[0] & 2) !== 0;
var isMacUniversallyAdministered = (self) => (getMacBytes(self)[0] & 2) === 0;
var formatIp = (self) => {
  if (isIpv4Address(self)) return ipv4ToOctets(self).join(".");
  const segments = ipv6ToSegments(self);
  if (isIpv4Mapped(self)) {
    return `::ffff:${segments[6] >> 8}.${segments[6] & 255}.${segments[7] >> 8}.${segments[7] & 255}`;
  }
  let bestStart = -1;
  let bestLength = 0;
  let start = -1;
  for (let index2 = 0; index2 <= 8; index2++) {
    if (index2 < 8 && segments[index2] === 0) {
      if (start === -1) start = index2;
    } else if (start !== -1) {
      if (index2 - start > bestLength) {
        bestStart = start;
        bestLength = index2 - start;
      }
      start = -1;
    }
  }
  if (bestLength < 2) return segments.map((segment) => segment.toString(16)).join(":");
  const head3 = segments.slice(0, bestStart).map((segment) => segment.toString(16)).join(":");
  const tail2 = segments.slice(bestStart + bestLength).map((segment) => segment.toString(16)).join(":");
  return `${head3}::${tail2}`;
};
var isUnspecified = (self) => {
  if (isIpv4Address(self)) return ipv4Value(self) === 0;
  const {
    w0,
    w1,
    w2,
    w3
  } = ipv6Words(self);
  return w0 === 0 && w1 === 0 && w2 === 0 && w3 === 0;
};
var isLoopback = (self) => {
  if (isIpv4Address(self)) return ipv4Value(self) >>> 24 === 127;
  const {
    w0,
    w1,
    w2,
    w3
  } = ipv6Words(self);
  return w0 === 0 && w1 === 0 && w2 === 0 && w3 === 1;
};
var isMulticast = (self) => {
  if (isMacAddress(self)) return isMacMulticast(self);
  if (isIpv4Address(self)) return ipv4Value(self) >>> 28 === 14;
  return ipv6Words(self).w0 >>> 24 === 255;
};
var isBroadcast = (self) => isMacAddress(self) ? isMacBroadcast(self) : ipv4Value(self) === 4294967295;
var isUnicast = (self) => {
  if (isMacAddress(self)) return isMacUnicast(self);
  return !isMulticast(self) && !isUnspecified(self) && (!isIpv4Address(self) || !isBroadcast(self));
};
var isLinkLocal = (self) => {
  if (isIpv4Address(self)) return ipv4Value(self) >>> 16 === 43518;
  return (ipv6Words(self).w0 >>> 16 & 65472) === 65152;
};
var isPrivate = (self) => {
  const value3 = ipv4Value(self);
  return value3 >>> 24 === 10 || (value3 >>> 16 & 65520) === 44048 || value3 >>> 16 === 49320;
};
var isUniqueLocal = (self) => (ipv6Words(self).w0 >>> 24 & 254) === 252;
var isIpv4Mapped = (self) => {
  const {
    w0,
    w1,
    w2
  } = ipv6Words(self);
  return w0 === 0 && w1 === 0 && w2 === 65535;
};
var InetV4Proto = {
  ...BaseProto,
  _tag: "InetAddressV4",
  [TypeId25]: TypeId25,
  [symbol2](that) {
    return isInetAddressV4(that) && this.port === that.port && equals(this.address, that.address);
  },
  [symbol]() {
    return combine(hash(this.address), number(this.port));
  },
  toString() {
    return formatInet(this);
  },
  toJSON() {
    return this.toString();
  }
};
var InetV6Proto = {
  ...BaseProto,
  _tag: "InetAddressV6",
  [TypeId25]: TypeId25,
  [symbol2](that) {
    return isInetAddressV6(that) && this.port === that.port && this.scopeId === that.scopeId && equals(this.address, that.address);
  },
  [symbol]() {
    return combine(combine(hash(this.address), number(this.port)), number(this.scopeId));
  },
  toString() {
    return formatInet(this);
  },
  toJSON() {
    return this.toString();
  }
};
var checkPort = (port) => Number.isInteger(port) && port >= 0 && port <= 65535;
var inetAddressV4 = (address, port) => {
  if (!checkPort(port)) {
    return addressError(address, "port must be an integer from 0 through 65535");
  }
  const self = Object.create(InetV4Proto);
  self.address = address;
  self.port = port;
  return succeed2(Object.freeze(self));
};
var inetAddressV6 = (address, port, options) => {
  if (!checkPort(port)) {
    return addressError(address, "port must be an integer from 0 through 65535");
  }
  const scopeId = options?.scopeId ?? 0;
  if (!Number.isInteger(scopeId) || scopeId < 0 || scopeId > 4294967295) {
    return addressError(address, "scopeId must be an unsigned 32-bit integer");
  }
  const self = Object.create(InetV6Proto);
  self.address = address;
  self.port = port;
  self.scopeId = scopeId;
  return succeed2(Object.freeze(self));
};
var inetAddressFromString = (input) => {
  let host;
  let portText;
  let scopeId = 0;
  const bracketed = input.startsWith("[");
  if (bracketed) {
    const end2 = input.indexOf("]");
    if (end2 < 0 || input[end2 + 1] !== ":" || input.indexOf("]", end2 + 1) !== -1) {
      return addressError(input, "expected [IPv6]:port");
    }
    host = input.slice(1, end2);
    portText = input.slice(end2 + 2);
    const scopeSeparator = host.indexOf("%");
    if (scopeSeparator !== -1) {
      const scopeText = host.slice(scopeSeparator + 1);
      if (host.indexOf("%", scopeSeparator + 1) !== -1 || !/^\d+$/.test(scopeText)) {
        return addressError(input, "scope identifier must be decimal");
      }
      scopeId = Number(scopeText);
      if (!Number.isInteger(scopeId) || scopeId > 4294967295) {
        return addressError(input, "scope identifier must be an unsigned 32-bit integer");
      }
      host = host.slice(0, scopeSeparator);
    }
  } else {
    const separator = input.lastIndexOf(":");
    if (separator < 0) {
      return addressError(input, "expected host:port or [IPv6]:port");
    }
    if (input.indexOf(":") !== separator) {
      return addressError(input, "IPv6 addresses must be bracketed");
    }
    host = input.slice(0, separator);
    portText = input.slice(separator + 1);
  }
  if (!/^(0|[1-9]\d*)$/.test(portText)) {
    return addressError(input, "port must be an unpadded decimal integer");
  }
  return flatMap2(ipFromString(host), (address) => {
    if (bracketed !== isIpv6Address(address)) {
      return addressError(input, "only IPv6 addresses use brackets");
    }
    return isIpv6Address(address) ? inetAddressV6(address, Number(portText), {
      scopeId
    }) : inetAddressV4(address, Number(portText));
  });
};
var formatHost = (self) => formatIp(self.address) + (isInetAddressV6(self) && self.scopeId !== 0 ? `%${self.scopeId}` : "");
var formatInet = (self) => {
  const host = formatHost(self);
  return isInetAddressV4(self) ? `${host}:${self.port}` : `[${host}]:${self.port}`;
};
var UnixPathProto = {
  ...BaseProto,
  _tag: "UnixPathAddress",
  [TypeId25]: TypeId25,
  [symbol2](that) {
    return isUnixPathAddress(that) && this.path === that.path;
  },
  [symbol]() {
    return combine(string("UnixPathAddress"), string(this.path));
  },
  toString() {
    return this.path;
  },
  toJSON() {
    return this.toString();
  }
};
var unixPathAddress = (path) => {
  const self = Object.create(UnixPathProto);
  self.path = path;
  return Object.freeze(self);
};

// node_modules/effect/dist/net/Host.js
var TypeId26 = "~effect/net/Host";
var hostError = (input, message) => fail2(new NetAddressError({
  input,
  message
}));
var asciiNameCharacter = /^[a-z0-9_.-]$/i;
var labelPattern = /^[a-z0-9_](?:[a-z0-9_-]{0,61}[a-z0-9_])?$/;
var numericLabel = /^(?:\d+|0x[0-9a-f]*)$/;
var validateDomainName = (name) => {
  if (name === ".") return void 0;
  const relative2 = name.endsWith(".") ? name.slice(0, -1) : name;
  if (relative2.length === 0) return "domain name must not be empty";
  if (relative2.length > 253) return "domain name must be at most 253 characters";
  const labels = relative2.split(".");
  for (const label2 of labels) {
    if (label2.length === 0) return "domain name labels must not be empty";
    if (label2.length > 63) return "domain name labels must be at most 63 characters";
    if (!labelPattern.test(label2)) {
      return "domain name labels must contain only letters, digits, hyphens, or underscores and must not start or end with a hyphen";
    }
  }
  if (numericLabel.test(labels[labels.length - 1])) {
    return "the last domain name label must not be numeric";
  }
  return void 0;
};
var toAsciiDomainName = (input) => {
  let ascii = true;
  for (const character of input) {
    if (character.charCodeAt(0) < 128) {
      if (!asciiNameCharacter.test(character)) return void 0;
    } else {
      ascii = false;
    }
  }
  if (ascii) return input.toLowerCase();
  try {
    return new URL(`http://${input}`).hostname;
  } catch {
    return void 0;
  }
};
var isDomainName = (u) => typeof u === "string" && /^[a-z0-9_.-]+$/.test(u) && validateDomainName(u) === void 0;
var isHostPort = (u) => hasProperty(u, TypeId26);
var domainNameFromString = (input) => {
  const name = toAsciiDomainName(input);
  if (name === void 0) return hostError(input, "invalid domain name");
  const error = validateDomainName(name);
  return error === void 0 ? succeed2(name) : hostError(input, error);
};
var hostFromString = (input) => {
  if (input.includes("%")) return scopedIpv6LiteralFromString(input);
  if (input.includes(":")) return ipFromString(input);
  if (/^[\d.]+$/.test(input)) {
    const address = ipFromString(input);
    if (isSuccess2(address)) return address;
  }
  return domainNameFromString(input);
};
var formatHost2 = (self) => typeof self === "string" ? self : formatIp(self);
var HostPortProto = {
  ...BaseProto,
  _tag: "HostPort",
  [TypeId26]: TypeId26,
  [symbol2](that) {
    return isHostPort(that) && this.port === that.port && equals(this.host, that.host);
  },
  [symbol]() {
    return combine(hash(this.host), number(this.port));
  },
  toString() {
    return formatHostPort(this);
  },
  toJSON() {
    return this.toString();
  }
};
var isPort = (port) => Number.isInteger(port) && port >= 0 && port <= 65535;
var makeHostPort = (host, port) => {
  const self = Object.create(HostPortProto);
  self.host = host;
  self.port = port;
  return Object.freeze(self);
};
var hostPortFromString = (input) => {
  let hostText;
  let portText;
  if (input.startsWith("[")) {
    const end2 = input.indexOf("]");
    if (end2 === -1 || input[end2 + 1] !== ":") return hostError(input, "expected [IPv6]:port");
    hostText = input.slice(1, end2);
    portText = input.slice(end2 + 2);
    if (!hostText.includes(":")) return hostError(input, "only IPv6 addresses use brackets");
  } else {
    const separator = input.lastIndexOf(":");
    if (separator === -1) return hostError(input, "expected host:port");
    if (input.indexOf(":") !== separator) return hostError(input, "IPv6 addresses must be bracketed");
    hostText = input.slice(0, separator);
    portText = input.slice(separator + 1);
  }
  if (!/^(0|[1-9]\d*)$/.test(portText)) {
    return hostError(input, "port must be an unpadded decimal integer");
  }
  const port = Number(portText);
  if (!isPort(port)) return hostError(input, "port must be an integer from 0 through 65535");
  return map2(hostFromString(hostText), (host) => makeHostPort(host, port));
};
var formatHostPort = (self) => {
  const host = formatHost2(self.host);
  return host.includes(":") ? `[${host}]:${self.port}` : `${host}:${self.port}`;
};

// node_modules/effect/dist/net/Dns.js
var RecordTypeId = "~effect/net/Dns/DnsRecord";
var isUint8 = (u) => Number.isInteger(u) && u >= 0 && u <= 255;
var isUint16 = (u) => Number.isInteger(u) && u >= 0 && u <= 65535;
var isUint32 = (u) => Number.isInteger(u) && u >= 0 && u <= 4294967295;
var isString2 = (u) => typeof u === "string";
var isTimer = (u) => isDuration(u) && isFinite(u) && isUint32(toSeconds(u));
var recordFields = {
  A: {
    address: isIpv4Address
  },
  AAAA: {
    address: isIpv6Address
  },
  CAA: {
    critical: (u) => typeof u === "boolean",
    tag: (u) => isString2(u) && /^[a-z0-9]+$/i.test(u),
    value: isString2
  },
  CNAME: {
    target: isDomainName
  },
  MX: {
    exchange: isDomainName,
    priority: isUint16
  },
  NAPTR: {
    order: isUint16,
    preference: isUint16,
    flags: isString2,
    service: isString2,
    regexp: isString2,
    replacement: isDomainName
  },
  NS: {
    host: isDomainName
  },
  PTR: {
    host: (u) => isString2(u) && u.length > 0
  },
  SOA: {
    primary: isDomainName,
    admin: (u) => isString2(u) && u.length > 0,
    serial: isUint32,
    refresh: isTimer,
    retry: isTimer,
    expire: isTimer,
    minimum: isTimer
  },
  SRV: {
    target: isDomainName,
    port: isUint16,
    priority: isUint16,
    weight: isUint16
  },
  TLSA: {
    certUsage: isUint8,
    selector: isUint8,
    matchingType: isUint8,
    data: (u) => u instanceof Uint8Array && u.length > 0
  },
  TXT: {
    chunks: (u) => Array.isArray(u) && u.length > 0 && u.every(isString2)
  }
};
var recordTypes = /* @__PURE__ */ Object.keys(recordFields);
var isRecordType = (u) => recordTypes.includes(u);
var isDnsRecord = (u) => hasProperty(u, RecordTypeId);
var RecordPrototype = {
  ...BaseProto,
  [RecordTypeId]: RecordTypeId,
  [symbol2](that) {
    return isDnsRecord(that) && that._tag === this._tag && Object.keys(this).every((key) => equals(this[key], that[key]));
  },
  [symbol]() {
    return structureKeys(this, Object.keys(this));
  },
  toString() {
    return formatRecord(this);
  },
  toJSON() {
    return {
      ...this
    };
  }
};
var makeRecord = (type, fields) => {
  if (!isRecordType(type)) {
    return fail2(new NetAddressError({
      input: type,
      message: "unknown DNS record type"
    }));
  }
  const input = typeof fields === "object" && fields !== null ? fields : {};
  const self = Object.create(RecordPrototype);
  self._tag = type;
  for (const [key, check2] of Object.entries(recordFields[type])) {
    const value3 = input[key];
    if (!check2(value3)) {
      return fail2(new NetAddressError({
        input: fields,
        message: `invalid ${type} record ${key}`
      }));
    }
    self[key] = Array.isArray(value3) ? Object.freeze([...value3]) : value3 instanceof Uint8Array ? new Uint8Array(value3) : value3;
  }
  return succeed2(Object.freeze(self));
};
var encoder3 = /* @__PURE__ */ new TextEncoder();
var decimalEscape = (byte) => `\\${byte.toString().padStart(3, "0")}`;
var quote = (value3) => {
  let out = '"';
  for (const byte of encoder3.encode(value3)) {
    out += byte === 34 || byte === 92 ? `\\${String.fromCharCode(byte)}` : byte < 32 || byte > 126 ? decimalEscape(byte) : String.fromCharCode(byte);
  }
  return out + '"';
};
var nameSpecials = [34, 36, 40, 41, 59, 64];
var formatName = (text2) => {
  const bytes3 = encoder3.encode(text2);
  let out = "";
  for (let i = 0; i < bytes3.length; i++) {
    const byte = bytes3[i];
    if (byte === 92) {
      const next = bytes3[i + 1];
      if (next === 46 || next === 92) {
        out += `\\${String.fromCharCode(next)}`;
        i++;
      } else {
        out += "\\\\";
      }
    } else if (byte <= 32 || byte > 126) {
      out += decimalEscape(byte);
    } else {
      out += nameSpecials.includes(byte) ? `\\${String.fromCharCode(byte)}` : String.fromCharCode(byte);
    }
  }
  return out;
};
var formatRecord = (self) => {
  switch (self._tag) {
    case "A":
    case "AAAA":
      return `${self._tag} ${formatIp(self.address)}`;
    case "CAA":
      return `CAA ${self.critical ? 128 : 0} ${self.tag} ${quote(self.value)}`;
    case "CNAME":
      return `CNAME ${self.target}`;
    case "MX":
      return `MX ${self.priority} ${self.exchange}`;
    case "NAPTR":
      return `NAPTR ${self.order} ${self.preference} ${quote(self.flags)} ${quote(self.service)} ${quote(self.regexp)} ${self.replacement}`;
    case "NS":
      return `NS ${self.host}`;
    case "PTR":
      return `PTR ${formatName(self.host)}`;
    case "SOA":
      return `SOA ${self.primary} ${formatName(self.admin)} ${self.serial} ${toSeconds(self.refresh)} ${toSeconds(self.retry)} ${toSeconds(self.expire)} ${toSeconds(self.minimum)}`;
    case "SRV":
      return `SRV ${self.priority} ${self.weight} ${self.port} ${self.target}`;
    case "TLSA":
      return `TLSA ${self.certUsage} ${self.selector} ${self.matchingType} ${encode(self.data).toUpperCase()}`;
    case "TXT":
      return `TXT ${self.chunks.map(quote).join(" ")}`;
  }
};

// node_modules/effect/dist/net/IpInterface.js
var TypeId27 = "~effect/net/IpInterface";
var isIpv4Interface = (u) => isIpInterface(u) && isIpv4Address(u.address);
var isIpv6Interface = (u) => isIpInterface(u) && isIpv6Address(u.address);
var isIpInterface = (u) => hasProperty(u, TypeId27);
var IpInterfaceProto = {
  ...BaseProto,
  _tag: "IpInterface",
  [TypeId27]: TypeId27,
  [symbol2](that) {
    return isIpInterface(that) && this.prefixLength === that.prefixLength && equals(this.address, that.address);
  },
  [symbol]() {
    return combine(hash(this.address), number(this.prefixLength));
  },
  toString() {
    return format5(this);
  },
  toJSON() {
    return this.toString();
  }
};
var interfaceError = (input, message) => fail2(new NetAddressError({
  input,
  message
}));
var make18 = (address, prefixLength) => {
  const max5 = width(address);
  if (!Number.isInteger(prefixLength) || prefixLength < 0 || prefixLength > max5) {
    return interfaceError(address, `prefix length must be an integer from 0 through ${max5}`);
  }
  const self = Object.assign(Object.create(IpInterfaceProto), {
    address,
    prefixLength
  });
  return succeed2(Object.freeze(self));
};
var parseAddressWithPrefix = (input, options) => {
  const slash = input.indexOf("/");
  if (slash === -1 && options?.prefix !== "required") {
    return succeed2({
      address: input,
      prefixLength: void 0
    });
  }
  if (slash <= 0 || slash !== input.lastIndexOf("/") || slash === input.length - 1) {
    return interfaceError(input, "expected an address and prefix length separated by one slash");
  }
  const prefix = input.slice(slash + 1);
  if (!/^(0|[1-9][0-9]*)$/.test(prefix)) {
    return interfaceError(input, "prefix length must be an unpadded ASCII decimal integer");
  }
  return succeed2({
    address: input.slice(0, slash),
    prefixLength: Number(prefix)
  });
};
var ipv4FromString2 = (input, options) => flatMap2(parseAddressWithPrefix(input, options), (parts2) => flatMap2(ipv4FromString(parts2.address), (address) => make18(address, parts2.prefixLength ?? width(address))));
var ipv6FromString2 = (input, options) => flatMap2(parseAddressWithPrefix(input, options), (parts2) => flatMap2(ipv6FromString(parts2.address), (address) => make18(address, parts2.prefixLength ?? width(address))));
var fromString3 = (input, options) => flatMap2(parseAddressWithPrefix(input, options), (parts2) => flatMap2(ipFromString(parts2.address), (address) => make18(address, parts2.prefixLength ?? width(address))));
var format5 = (self) => `${formatIp(self.address)}/${self.prefixLength}`;

// node_modules/effect/dist/net/IpNetwork.js
var TypeId28 = "~effect/net/IpNetwork";
var isIpv4Network = (u) => isIpNetwork(u) && isIpv4Address(u.address);
var isIpv6Network = (u) => isIpNetwork(u) && isIpv6Address(u.address);
var isIpNetwork = (u) => hasProperty(u, TypeId28);
var IpNetworkProto = {
  ...BaseProto,
  _tag: "IpNetwork",
  [TypeId28]: TypeId28,
  [symbol2](that) {
    return isIpNetwork(that) && this.prefixLength === that.prefixLength && equals(this.address, that.address);
  },
  [symbol]() {
    return combine(hash(this.address), number(this.prefixLength));
  },
  toString() {
    return format6(this);
  },
  toJSON() {
    return this.toString();
  }
};
var fromInterfaceValue = (value3) => {
  const self = Object.assign(Object.create(IpNetworkProto), {
    address: value3.address,
    prefixLength: value3.prefixLength
  });
  return Object.freeze(self);
};
var toBytes = (address) => isIpv4Address(address) ? ipv4ToOctets(address) : ipv6ToOctets(address);
var maskBytes = (bytes3, prefixLength) => {
  const wholeBytes = Math.floor(prefixLength / 8);
  const partialBits = prefixLength % 8;
  return bytes3.map((byte, index2) => {
    if (index2 < wholeBytes) return byte;
    if (index2 === wholeBytes && partialBits !== 0) return byte & (255 << 8 - partialBits & 255);
    return 0;
  });
};
var make19 = (address, prefixLength) => {
  return flatMap2(make18(address, prefixLength), (value3) => {
    const bytes3 = toBytes(address);
    const masked = maskBytes(bytes3, prefixLength);
    if (bytes3.some((byte, index2) => byte !== masked[index2])) {
      return fail2(new NetAddressError({
        input: address,
        message: "address has non-zero host bits"
      }));
    }
    return succeed2(fromInterfaceValue(value3));
  });
};
var ipv4FromString3 = (input) => {
  return flatMap2(ipv4FromString2(input, {
    prefix: "required"
  }), (value3) => make19(value3.address, value3.prefixLength));
};
var ipv6FromString3 = (input) => {
  return flatMap2(ipv6FromString2(input, {
    prefix: "required"
  }), (value3) => make19(value3.address, value3.prefixLength));
};
var fromString4 = (input) => {
  return flatMap2(fromString3(input, {
    prefix: "required"
  }), (value3) => make19(value3.address, value3.prefixLength));
};
var format6 = (self) => `${formatIp(self.address)}/${self.prefixLength}`;

// node_modules/effect/dist/Schema.js
var TypeId29 = TypeId24;
function declareConstructor() {
  return (typeParameters, run2, annotations) => {
    return make20(new Declaration(typeParameters.map(getAST), (typeParameters2) => run2(typeParameters2.map((ast) => make20(ast))), annotations));
  };
}
function declare(is3, annotations) {
  return declareConstructor()([], () => (input, ast, options) => is3(input) ? succeed6(input) : fail5(new InvalidType(ast, input, options)), annotations);
}
function revealBottom(bottom) {
  return bottom;
}
function annotate2(annotations) {
  return (self) => self.annotate(annotations);
}
function annotateEncoded(annotations) {
  return (self) => flip5(flip5(self).annotate(annotations));
}
function annotateKey2(annotations) {
  return (self) => {
    return self.rebuild(annotateKey(self.ast, annotations));
  };
}
function revealCodec(codec) {
  return codec;
}
var SchemaError = class extends (/* @__PURE__ */ TaggedError2("SchemaError")) {
  [SchemaErrorTypeId] = SchemaErrorTypeId;
  constructor(issue) {
    const stackTraceLimit = getStackTraceLimit();
    setStackTraceLimit(0);
    try {
      super({
        issue
      });
    } finally {
      setStackTraceLimit(stackTraceLimit);
    }
  }
  get message() {
    return defaultFormatter(this.issue);
  }
  toJSON() {
    return {
      _tag: this._tag,
      message: this.message
    };
  }
  [NodeInspectSymbol]() {
    return this.toJSON();
  }
  toString() {
    return `SchemaError(${this.message})`;
  }
};
function isSchemaError2(u) {
  return isSchemaError(u);
}
function fromIssueEffect(self) {
  if (effectIsExit(self)) {
    return fromIssueExit(self);
  }
  return catchCause3(self, (cause) => failCauseSync2(() => map6(cause, (issue) => new SchemaError(issue))));
}
function fromIssueExit(exit4) {
  return isSuccess4(exit4) ? exit4 : failCause2(map6(exit4.cause, (issue) => new SchemaError(issue)));
}
function getSchemaErrorOrThrow(cause, message) {
  let schemaError;
  for (const reason of cause.reasons) {
    if (!isFailReason2(reason) || !isSchemaError2(reason.error)) {
      throw new globalThis.Error(message, {
        cause
      });
    }
    schemaError ??= reason.error;
  }
  if (schemaError === void 0) {
    throw new globalThis.Error(message, {
      cause
    });
  }
  return schemaError;
}
function runSchemaErrorPromise(self) {
  return runPromiseExit2(self).then((exit4) => {
    if (isSuccess4(exit4)) {
      return exit4.value;
    }
    throw getSchemaErrorOrThrow(exit4.cause, "Promise adapter can only reject schema errors");
  });
}
function runSchemaErrorSync(self) {
  const exit4 = runSyncExit2(self);
  if (isSuccess4(exit4)) {
    return exit4.value;
  }
  throw getSchemaErrorOrThrow(exit4.cause, "Sync adapter can only throw schema errors");
}
function toStandardSchemaV12(self, options) {
  return toStandardSchemaV1(self, options);
}
function toStandardJSONSchemaV12(self) {
  return toStandardJSONSchemaV1(self);
}
var is2 = is;
var asserts2 = asserts;
function decodeUnknownEffect2(schema, options) {
  const parser = decodeUnknownEffect(schema, options);
  return (input, options2) => {
    return fromIssueEffect(parser(input, options2));
  };
}
var decodeEffect2 = decodeUnknownEffect2;
function decodeUnknownExit2(schema, options) {
  const parser = decodeUnknownExit(schema, options);
  return (input, options2) => {
    return fromIssueExit(parser(input, options2));
  };
}
var decodeExit = decodeUnknownExit2;
var decodeUnknownOption2 = decodeUnknownOption;
var decodeOption2 = decodeOption;
function decodeUnknownResult2(schema, options) {
  const parser = decodeUnknownResult(schema, options);
  return (input, options2) => {
    return mapError(parser(input, options2), (issue) => new SchemaError(issue));
  };
}
var decodeResult = decodeUnknownResult2;
function decodeUnknownPromise(schema, options) {
  const parser = decodeUnknownEffect2(schema, options);
  return (input, options2) => {
    return runSchemaErrorPromise(parser(input, options2));
  };
}
var decodePromise = decodeUnknownPromise;
function decodeUnknownSync2(schema, options) {
  const parser = decodeUnknownEffect2(schema, options);
  return (input, options2) => {
    return runSchemaErrorSync(parser(input, options2));
  };
}
var decodeSync2 = decodeUnknownSync2;
function encodeUnknownEffect2(schema, options) {
  const parser = encodeUnknownEffect(schema, options);
  return (input, options2) => {
    return fromIssueEffect(parser(input, options2));
  };
}
var encodeEffect2 = encodeUnknownEffect2;
function encodeUnknownExit2(schema, options) {
  const parser = encodeUnknownExit(schema, options);
  return (input, options2) => {
    return fromIssueExit(parser(input, options2));
  };
}
var encodeExit = encodeUnknownExit2;
var encodeUnknownOption2 = encodeUnknownOption;
var encodeOption2 = encodeOption;
function encodeUnknownResult2(schema, options) {
  const parser = encodeUnknownResult(schema, options);
  return (input, options2) => {
    return mapError(parser(input, options2), (issue) => new SchemaError(issue));
  };
}
var encodeResult = encodeUnknownResult2;
function encodeUnknownPromise(schema, options) {
  const parser = encodeUnknownEffect2(schema, options);
  return (input, options2) => {
    return runSchemaErrorPromise(parser(input, options2));
  };
}
var encodePromise = encodeUnknownPromise;
function encodeUnknownSync2(schema, options) {
  const parser = encodeUnknownEffect2(schema, options);
  return (input, options2) => {
    return runSchemaErrorSync(parser(input, options2));
  };
}
var encodeSync2 = encodeUnknownSync2;
var make20 = make16;
function isSchema(u) {
  return hasProperty(u, TypeId29) && u[TypeId29] === TypeId29;
}
var optionalKey2 = /* @__PURE__ */ lambda((schema) => make20(optionalKey(schema.ast), {
  schema
}));
var requiredKey = /* @__PURE__ */ lambda((self) => self.schema);
var optional2 = /* @__PURE__ */ lambda((self) => {
  const schema = UndefinedOr(self);
  return make20(optional(self.ast), {
    schema
  });
});
var required = /* @__PURE__ */ lambda((self) => self.schema.members[0]);
var mutableKey2 = /* @__PURE__ */ lambda((schema) => make20(mutableKey(schema.ast), {
  schema
}));
var readonlyKey = /* @__PURE__ */ lambda((self) => self.schema);
var toType2 = /* @__PURE__ */ lambda((schema) => make20(toType(schema.ast), {
  schema
}));
var toEncoded2 = /* @__PURE__ */ lambda((schema) => make20(toEncoded(schema.ast), {
  schema
}));
var FlipTypeId = "~effect/Schema/flip";
function isFlip$(schema) {
  return hasProperty(schema, FlipTypeId) && schema[FlipTypeId] === FlipTypeId;
}
function flip5(schema) {
  if (isFlip$(schema)) {
    return schema.schema.rebuild(flip4(schema.ast));
  }
  return make20(flip4(schema.ast), {
    [FlipTypeId]: FlipTypeId,
    schema
  });
}
function Literal2(literal) {
  const out = make20(new Literal(literal), {
    literal,
    transform(to) {
      return out.pipe(decodeTo2(Literal2(to), {
        decode: transform(() => to),
        encode: transform(() => literal)
      }));
    }
  });
  return out;
}
function templateLiteralParts(parts2) {
  return parts2.map((part) => isSchema(part) ? part.ast : new Literal(part));
}
function TemplateLiteral2(parts2) {
  return make20(new TemplateLiteral(templateLiteralParts(parts2)), {
    parts: parts2
  });
}
function TemplateLiteralParser(parts2) {
  return make20(templateLiteralParser(templateLiteralParts(parts2)), {
    parts: parts2
  });
}
function Enum2(enums) {
  return make20(new Enum(Object.keys(enums).filter((key) => typeof enums[enums[key]] !== "number").map((key) => [key, enums[key]])), {
    enums
  });
}
var Never2 = /* @__PURE__ */ make20(never3);
var Any2 = /* @__PURE__ */ make20(any);
var Unknown2 = /* @__PURE__ */ make20(unknown);
var Null2 = /* @__PURE__ */ make20(null_);
var Undefined2 = /* @__PURE__ */ make20(undefined_3);
var String6 = /* @__PURE__ */ make20(string2);
var StringForLiteralAutocomplete = String6;
var Number6 = /* @__PURE__ */ make20(number2);
var Boolean3 = /* @__PURE__ */ make20(boolean);
var Symbol3 = /* @__PURE__ */ make20(symbol3);
var BigInt6 = /* @__PURE__ */ make20(bigInt);
var Void2 = /* @__PURE__ */ make20(void_5);
var ObjectKeyword2 = /* @__PURE__ */ make20(objectKeyword);
function UniqueSymbol2(symbol4) {
  return make20(new UniqueSymbol(symbol4));
}
function makeStruct(ast, fields) {
  return make20(ast, {
    fields,
    mapFields(f, options) {
      const fields2 = f(this.fields);
      return makeStruct(struct(fields2, options?.unsafePreserveChecks ? this.ast.checks : void 0), fields2);
    }
  });
}
function Struct(fields) {
  return makeStruct(struct(fields, void 0), fields);
}
function fieldsAssign(fields) {
  return lambda((struct2) => struct2.mapFields(assign(fields)));
}
var canonicalPropertyKey = (key) => typeof key === "symbol" ? key : globalThis.String(key);
function encodeKeys(mapping) {
  return function(self) {
    const fields = {};
    const appliedMapping = /* @__PURE__ */ Object.create(null);
    const reverseMapping = /* @__PURE__ */ Object.create(null);
    const seenEncodedKeys = /* @__PURE__ */ new Set();
    for (const k of Reflect.ownKeys(self.fields)) {
      const encoded = toEncoded2(self.fields[k]);
      const hasMapping = Object.hasOwn(mapping, k);
      const encodedKey = hasMapping ? mapping[k] : k;
      const canonical = canonicalPropertyKey(encodedKey);
      if (seenEncodedKeys.has(canonical)) {
        throw new globalThis.Error(`Duplicate encoded keys: ${formatPropertyKey(encodedKey)}`);
      }
      seenEncodedKeys.add(canonical);
      assignProperty(fields, encodedKey, encoded);
      if (hasMapping) {
        appliedMapping[k] = encodedKey;
        reverseMapping[encodedKey] = k;
      }
    }
    return Struct(fields).pipe(decodeTo2(self, transform2({
      decode: renameKeys(reverseMapping),
      encode: renameKeys(appliedMapping)
    })));
  };
}
function extendTo(fields, derive) {
  return (self) => {
    const f = map3(self.fields, toType2);
    const to = Struct({
      ...f,
      ...fields
    });
    return self.pipe(decodeTo2(to, transform2({
      decode: (input) => {
        const out = {
          ...input
        };
        for (const k in fields) {
          const f2 = derive[k];
          const o = f2(input);
          if (isSome2(o)) {
            assignProperty(out, k, o.value);
          }
        }
        return out;
      },
      encode: (input) => {
        const out = {
          ...input
        };
        for (const k in fields) {
          delete out[k];
        }
        return out;
      }
    })));
  };
}
function Record(key, value3) {
  return make20(record(key.ast, value3.ast), {
    key,
    value: value3
  });
}
function StructWithRest(schema, records) {
  return make20(structWithRest(schema.ast, records.map(getAST)), {
    schema,
    records
  });
}
function makeTuple(ast, elements) {
  return make20(ast, {
    elements,
    mapElements(f, options) {
      const elements2 = f(this.elements);
      return makeTuple(tuple(elements2, options?.unsafePreserveChecks ? this.ast.checks : void 0), elements2);
    }
  });
}
function Tuple2(elements) {
  return makeTuple(tuple(elements), elements);
}
function TupleWithRest(schema, rest) {
  return make20(tupleWithRest(schema.ast, rest.map(getAST)), {
    schema,
    rest
  });
}
var ArraySchema = /* @__PURE__ */ lambda((schema) => make20(new Arrays(false, [], [schema.ast]), {
  value: schema
}));
function withArrayLengthConstraints(self, minimum, maximum) {
  if (minimum !== void 0 && maximum !== void 0) {
    return self.check(isBetweenLength(minimum, maximum));
  }
  if (minimum !== void 0) return self.check(isMinLength(minimum));
  if (maximum !== void 0) return self.check(isMaxLength(maximum));
  return self;
}
var NonEmptyArray = /* @__PURE__ */ lambda((schema) => make20(new Arrays(false, [schema.ast], [schema.ast]), {
  value: schema
}));
function ArrayEnsure(schema) {
  const many = ArraySchema(schema);
  const to = ArraySchema(toType2(schema));
  const one = decodeTo2(Tuple2([Unknown2]), transform2({
    decode: (value3) => [value3],
    encode: ([value3]) => value3
  }))(schema);
  return make20(Union2([one, many]).pipe(decodeTo2(to)).ast, {
    from: Union2([schema, many]),
    to
  });
}
function UniqueArray(item) {
  return ArraySchema(item).check(isUnique());
}
var mutable2 = /* @__PURE__ */ lambda((schema) => make20(mutable(schema.ast), {
  schema
}));
function makeUnion(ast, members) {
  return make20(ast, {
    members,
    mapMembers(f, options) {
      const members2 = f(this.members);
      return makeUnion(union4(members2, this.ast.options, options?.unsafePreserveChecks ? this.ast.checks : void 0), members2);
    }
  });
}
function Union2(members, options) {
  return makeUnion(union4(members, options, void 0), members);
}
function Literals(literals) {
  const members = literals.map(Literal2);
  return make20(union4(members, void 0, void 0), {
    literals,
    members,
    mapMembers(f) {
      return Union2(f(this.members));
    },
    pick(literals2) {
      return Literals(literals2);
    },
    transform(to) {
      return Union2(members.map((member, index2) => member.transform(to[index2])));
    }
  });
}
var NullOr = /* @__PURE__ */ lambda((self) => Union2([self, Null2]));
var UndefinedOr = /* @__PURE__ */ lambda((self) => Union2([self, Undefined2]));
var NullishOr = /* @__PURE__ */ lambda((self) => Union2([self, Null2, Undefined2]));
function suspend4(f) {
  return make20(new Suspend(() => f().ast));
}
function check(...checks) {
  return (self) => self.check(...checks);
}
function refine(refinement, annotations) {
  return (schema) => make20(appendChecks(schema.ast, [makeFilterByGuard(refinement, annotations)]), {
    schema
  });
}
function brand(identifier2) {
  return (schema) => make20(schema.ast, {
    schema,
    identifier: identifier2
  });
}
function fromBrand(identifier2, ctor) {
  return (self) => (
    // The constructor already guarantees a single concrete brand key.
    (ctor.checks ? self.check(...ctor.checks) : self).pipe(brand(identifier2))
  );
}
function middlewareDecoding2(decode6) {
  return (schema) => make20(middlewareDecoding(schema.ast, new Middleware(decode6, identity)), {
    schema
  });
}
function middlewareEncoding2(encode5) {
  return (schema) => make20(middlewareEncoding(schema.ast, new Middleware(identity, encode5)), {
    schema
  });
}
function catchDecoding(f) {
  return catchDecodingWithContext(f);
}
function catchDecodingWithContext(f) {
  return (self) => middlewareDecoding2(catchEager2(f))(self);
}
function catchEncoding(f) {
  return catchEncodingWithContext(f);
}
function catchEncodingWithContext(f) {
  return (self) => middlewareEncoding2(catchEager2(f))(self);
}
function decodeTo2(to, transformation) {
  return (from) => {
    return make20(decodeTo(from.ast, to.ast, transformation ? makeTransformation(transformation) : passthrough3()), {
      from,
      to
    });
  };
}
function linkDecoding() {
  return (to, decode6) => link()(to, {
    decode: decode6,
    encode: forbiddenEncoding
  });
}
var TrueLiterals = /* @__PURE__ */ Literals(["true", "yes", "on", "1", "y"]);
var FalseLiterals = /* @__PURE__ */ Literals(["false", "no", "off", "0", "n"]);
var BooleanLiterals = /* @__PURE__ */ Literals([...TrueLiterals.literals, ...FalseLiterals.literals]).pipe(/* @__PURE__ */ decodeTo2(Boolean3, /* @__PURE__ */ transform2({
  decode: (value3) => value3 === "true" || value3 === "yes" || value3 === "on" || value3 === "1" || value3 === "y",
  encode: (value3) => value3 ? "true" : "false"
})));
function decode4(transformation) {
  return (self) => {
    return decodeTo2(toType2(self), transformation)(self);
  };
}
function encodeTo(to, transformation) {
  return (from) => {
    return transformation ? decodeTo2(from, transformation)(to) : decodeTo2(from)(to);
  };
}
function encode4(transformation) {
  return (self) => {
    return decodeTo2(self, transformation)(toEncoded2(self));
  };
}
function withConstructorDefault2(defaultValue) {
  return (schema) => make20(withConstructorDefault(schema.ast, defaultValue), {
    schema
  });
}
function toIssueEffect(self) {
  if (effectIsExit(self) && self._tag === "Success") {
    return self;
  }
  return catchCause3(self, (cause) => failCauseSync2(() => map6(cause, (error) => error.issue)));
}
function withDecodingDefaultKey(defaultValue, options) {
  const encode5 = options?.encodingStrategy === "omit" ? omit2() : passthrough2();
  return (self) => {
    return optionalKey2(toEncoded2(self)).pipe(decodeTo2(self, {
      decode: withDefault(toIssueEffect(defaultValue)),
      encode: encode5
    }));
  };
}
function withDecodingDefaultTypeKey(defaultValue, options) {
  return (self) => {
    return toType2(self).pipe(withDecodingDefaultKey(defaultValue, options), encodeTo(optionalKey2(self)));
  };
}
function withDecodingDefault(defaultValue, options) {
  const encode5 = options?.encodingStrategy === "omit" ? omit2() : passthrough2();
  return (self) => {
    return optional2(toEncoded2(self)).pipe(decodeTo2(self, {
      decode: withDefault(toIssueEffect(defaultValue)),
      encode: encode5
    }));
  };
}
function withDecodingDefaultType(defaultValue, options) {
  return (self) => {
    return toType2(self).pipe(withDecodingDefault(defaultValue, options), encodeTo(optional2(self)));
  };
}
function tag(literal) {
  return Literal2(literal).pipe(withConstructorDefault2(succeed6(literal)));
}
function tagDefaultOmit(literal) {
  return tag(literal).pipe(withDecodingDefaultKey(succeed6(literal), {
    encodingStrategy: "omit"
  }));
}
function TaggedStruct(value3, fields) {
  return Struct({
    _tag: tag(value3),
    ...fields
  });
}
function toTaggedUnion(tag2) {
  return (self) => {
    const cases = {};
    const discriminants = [];
    const discriminantKeys = /* @__PURE__ */ new Set();
    const guards = {};
    const isAnyOf = (keys3) => (value3) => keys3.includes(value3[tag2]);
    walk2(self);
    return Object.assign(self, {
      tag: tag2,
      cases,
      discriminants,
      isAnyOf,
      guards,
      match: match7,
      matchOrElse
    });
    function walk2(schema) {
      const ast = schema.ast;
      if (isUnion(ast) && "members" in schema && globalThis.Array.isArray(schema.members) && schema.members.every(isSchema)) {
        return schema.members.forEach(walk2);
      }
      const sentinels = collectSentinels(ast);
      if (sentinels.length > 0) {
        const literal = sentinels.find((s) => s.key === tag2)?.literal;
        if (isPropertyKey(literal)) {
          const key = typeof literal === "number" ? globalThis.String(literal) : literal;
          if (discriminantKeys.has(key)) {
            throw new globalThis.Error(`Duplicate discriminant: ${globalThis.String(literal)}`);
          }
          discriminantKeys.add(key);
          discriminants.push(literal);
          assignProperty(cases, literal, schema);
          assignProperty(guards, literal, is(toType2(schema)));
          return;
        }
      }
      throw new globalThis.Error("No literal or unique symbol found");
    }
    function match7() {
      if (arguments.length === 1) {
        const cases3 = arguments[0];
        return function(value4) {
          const key2 = value4[tag2];
          const handler2 = Object.hasOwn(cases3, key2) ? cases3[key2] : void 0;
          return handler2(value4);
        };
      }
      const value3 = arguments[0];
      const cases2 = arguments[1];
      const key = value3[tag2];
      const handler = Object.hasOwn(cases2, key) ? cases2[key] : void 0;
      return handler(value3);
    }
    function matchOrElse() {
      if (arguments.length === 2) {
        const cases3 = arguments[0];
        const orElse3 = arguments[1];
        return function(value4) {
          const key2 = value4[tag2];
          const handler2 = Object.hasOwn(cases3, key2) ? cases3[key2] ?? orElse3 : orElse3;
          return handler2(value4);
        };
      }
      const value3 = arguments[0];
      const cases2 = arguments[1];
      const orElse2 = arguments[2];
      const key = value3[tag2];
      const handler = Object.hasOwn(cases2, key) ? cases2[key] ?? orElse2 : orElse2;
      return handler(value3);
    }
  };
}
function TaggedUnion(casesByTag) {
  const cases = {};
  const members = [];
  for (const key of Object.keys(casesByTag)) {
    const member = TaggedStruct(key, casesByTag[key]);
    assignProperty(cases, key, member);
    members.push(member);
  }
  const union5 = Union2(members);
  const {
    tag: tag2,
    guards,
    isAnyOf,
    match: match7,
    matchOrElse
  } = toTaggedUnion("_tag")(union5);
  return make20(union5.ast, {
    tag: tag2,
    cases,
    isAnyOf,
    guards,
    match: match7,
    matchOrElse
  });
}
function Opaque() {
  return (schema) => schema;
}
function instanceOf(constructor, annotations) {
  return declare((u) => u instanceof constructor, annotations);
}
function link() {
  return (encodeTo2, transformation) => {
    return new Link(encodeTo2.ast, makeTransformation(transformation));
  };
}
var makeFilter2 = makeFilter;
function makeFilterGroup(checks, annotations = void 0) {
  return new FilterGroup(checks, annotations);
}
var TRIMMED_PATTERN = "^\\S[\\s\\S]*\\S$|^\\S$|^$";
function isTrimmed(annotations) {
  const regExp = new globalThis.RegExp(TRIMMED_PATTERN);
  return makeFilter2((s) => s.trim() === s, {
    expected: "a string with no leading or trailing whitespace",
    representation: {
      id: "effect/schema/isTrimmed",
      payload: null
    },
    toJsonSchema: () => ({
      pattern: regExp.source
    }),
    toCode: () => ({
      runtime: "Schema.isTrimmed()"
    }),
    arbitraryConstraint: {
      patterns: [{
        source: TRIMMED_PATTERN,
        flags: ""
      }]
    },
    ...annotations
  });
}
function isPattern2(regExp, annotations) {
  const source = regExp.source;
  const flags = regExp.flags;
  const canExport = /^[dg]*uy?$/.test(flags);
  const runtimeRegExp = flags === "" ? `new RegExp(${format(source)})` : `new RegExp(${format(source)}, ${format(flags)})`;
  return isPattern(regExp, {
    toJsonSchema: () => canExport ? {
      pattern: flags.endsWith("y") ? `^(?:${source})` : source
    } : [{}, true],
    toCode: () => ({
      runtime: `Schema.isPattern(${runtimeRegExp})`
    }),
    ...annotations
  });
}
function isStringFinite2(annotations) {
  return isStringFinite({
    toCode: () => ({
      runtime: "Schema.isStringFinite()"
    }),
    ...annotations
  });
}
function isStringBigInt2(annotations) {
  return isStringBigInt({
    toCode: () => ({
      runtime: "Schema.isStringBigInt()"
    }),
    ...annotations
  });
}
function isStringSymbol2(annotations) {
  return isStringSymbol({
    toCode: () => ({
      runtime: "Schema.isStringSymbol()"
    }),
    ...annotations
  });
}
var getUUIDRegExp = (version) => {
  if (version) {
    return new globalThis.RegExp(`^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-${version}[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$`);
  }
  return /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|[fF]{8}-[fF]{4}-[fF]{4}-[fF]{4}-[fF]{12})$/;
};
function isUUID(version, annotations) {
  const regExp = getUUIDRegExp(version);
  return isPattern2(regExp, {
    expected: version ? `a UUID v${version}` : "a UUID",
    representation: {
      id: "effect/schema/isUUID",
      payload: {
        version: version ?? null
      }
    },
    toJsonSchema: () => ({
      pattern: regExp.source,
      format: "uuid"
    }),
    toCode: () => ({
      runtime: version === void 0 ? "Schema.isUUID()" : `Schema.isUUID(${version})`
    }),
    ...annotations
  });
}
var GUID_REGEXP = /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/;
function isGUID(annotations) {
  return isPattern2(GUID_REGEXP, {
    expected: "a GUID",
    representation: {
      id: "effect/schema/isGUID",
      payload: null
    },
    toJsonSchema: () => ({
      pattern: GUID_REGEXP.source
    }),
    toCode: () => ({
      runtime: "Schema.isGUID()"
    }),
    ...annotations
  });
}
function isULID(annotations) {
  const regExp = /^[0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{26}$/;
  return isPattern2(regExp, {
    representation: {
      id: "effect/schema/isULID",
      payload: null
    },
    toJsonSchema: () => ({
      pattern: regExp.source
    }),
    toCode: () => ({
      runtime: "Schema.isULID()"
    }),
    ...annotations
  });
}
function isBase64(annotations) {
  const regExp = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
  return isPattern2(regExp, {
    expected: "a base64 encoded string",
    representation: {
      id: "effect/schema/isBase64",
      payload: null
    },
    toJsonSchema: () => ({
      pattern: regExp.source
    }),
    toCode: () => ({
      runtime: "Schema.isBase64()"
    }),
    ...annotations
  });
}
function isBase64Url(annotations) {
  const regExp = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/;
  return isPattern2(regExp, {
    expected: "a base64url encoded string",
    representation: {
      id: "effect/schema/isBase64Url",
      payload: null
    },
    toJsonSchema: () => ({
      pattern: regExp.source
    }),
    toCode: () => ({
      runtime: "Schema.isBase64Url()"
    }),
    ...annotations
  });
}
function literalToJsonSchema(literal, original, pattern) {
  if (literal.length === 0) return original.length === 0 ? {} : [{}, true];
  const constraint = {
    pattern: new globalThis.RegExp(pattern).source
  };
  return literal === original ? constraint : [constraint, true];
}
function isStartingWith(startsWith, annotations) {
  const formatted = JSON.stringify(startsWith);
  const regExp = new globalThis.RegExp(`^${escape(startsWith)}`);
  const jsonSchemaLiteral = startsWith.replace(/[\uD800-\uDBFF]$/, "");
  return makeFilter2((s) => s.startsWith(startsWith), {
    expected: `a string starting with ${formatted}`,
    representation: {
      id: "effect/schema/isStartingWith",
      payload: {
        startsWith
      }
    },
    toJsonSchema: () => literalToJsonSchema(jsonSchemaLiteral, startsWith, `^${escape(jsonSchemaLiteral)}`),
    toCode: () => ({
      runtime: `Schema.isStartingWith(${format(startsWith)})`
    }),
    arbitraryConstraint: {
      patterns: [{
        source: regExp.source,
        flags: regExp.flags
      }]
    },
    ...annotations
  });
}
function isEndingWith(endsWith, annotations) {
  const formatted = JSON.stringify(endsWith);
  const regExp = new globalThis.RegExp(`${escape(endsWith)}$`);
  const jsonSchemaLiteral = endsWith.replace(/^[\uDC00-\uDFFF]/, "");
  return makeFilter2((s) => s.endsWith(endsWith), {
    expected: `a string ending with ${formatted}`,
    representation: {
      id: "effect/schema/isEndingWith",
      payload: {
        endsWith
      }
    },
    toJsonSchema: () => literalToJsonSchema(jsonSchemaLiteral, endsWith, `${escape(jsonSchemaLiteral)}$`),
    toCode: () => ({
      runtime: `Schema.isEndingWith(${format(endsWith)})`
    }),
    arbitraryConstraint: {
      patterns: [{
        source: regExp.source,
        flags: regExp.flags
      }]
    },
    ...annotations
  });
}
function isIncluding(includes, annotations) {
  const formatted = JSON.stringify(includes);
  const regExp = new globalThis.RegExp(escape(includes));
  const jsonSchemaLiteral = includes.replace(/^[\uDC00-\uDFFF]|[\uD800-\uDBFF]$/g, "");
  return makeFilter2((s) => s.includes(includes), {
    expected: `a string including ${formatted}`,
    representation: {
      id: "effect/schema/isIncluding",
      payload: {
        includes
      }
    },
    toJsonSchema: () => literalToJsonSchema(jsonSchemaLiteral, includes, escape(jsonSchemaLiteral)),
    toCode: () => ({
      runtime: `Schema.isIncluding(${format(includes)})`
    }),
    arbitraryConstraint: {
      patterns: [{
        source: regExp.source,
        flags: regExp.flags
      }]
    },
    ...annotations
  });
}
var UPPERCASED_PATTERN = "^[^a-z]*$";
function isUppercased(annotations) {
  const regExp = new globalThis.RegExp(UPPERCASED_PATTERN);
  return makeFilter2((s) => s.toUpperCase() === s, {
    expected: "a string with all characters in uppercase",
    representation: {
      id: "effect/schema/isUppercased",
      payload: null
    },
    toJsonSchema: () => [{
      pattern: regExp.source
    }, true],
    toCode: () => ({
      runtime: "Schema.isUppercased()"
    }),
    arbitraryConstraint: {
      patterns: [{
        source: UPPERCASED_PATTERN,
        flags: ""
      }]
    },
    ...annotations
  });
}
var LOWERCASED_PATTERN = "^[^A-Z]*$";
function isLowercased(annotations) {
  const regExp = new globalThis.RegExp(LOWERCASED_PATTERN);
  return makeFilter2((s) => s.toLowerCase() === s, {
    expected: "a string with all characters in lowercase",
    representation: {
      id: "effect/schema/isLowercased",
      payload: null
    },
    toJsonSchema: () => [{
      pattern: regExp.source
    }, true],
    toCode: () => ({
      runtime: "Schema.isLowercased()"
    }),
    arbitraryConstraint: {
      patterns: [{
        source: LOWERCASED_PATTERN,
        flags: ""
      }]
    },
    ...annotations
  });
}
var CAPITALIZED_PATTERN = "^(?:[^a-z][\\s\\S]*)?$";
function isCapitalized(annotations) {
  const regExp = new globalThis.RegExp(CAPITALIZED_PATTERN);
  return makeFilter2((s) => s.charAt(0).toUpperCase() === s.charAt(0), {
    expected: "a string with the first character in uppercase",
    representation: {
      id: "effect/schema/isCapitalized",
      payload: null
    },
    toJsonSchema: () => [{
      pattern: regExp.source
    }, true],
    toCode: () => ({
      runtime: "Schema.isCapitalized()"
    }),
    arbitraryConstraint: {
      patterns: [{
        source: CAPITALIZED_PATTERN,
        flags: ""
      }]
    },
    ...annotations
  });
}
var UNCAPITALIZED_PATTERN = "^(?:[^A-Z][\\s\\S]*)?$";
function isUncapitalized(annotations) {
  const regExp = new globalThis.RegExp(UNCAPITALIZED_PATTERN);
  return makeFilter2((s) => s.charAt(0).toLowerCase() === s.charAt(0), {
    expected: "a string with the first character in lowercase",
    representation: {
      id: "effect/schema/isUncapitalized",
      payload: null
    },
    toJsonSchema: () => [{
      pattern: regExp.source
    }, true],
    toCode: () => ({
      runtime: "Schema.isUncapitalized()"
    }),
    arbitraryConstraint: {
      patterns: [{
        source: UNCAPITALIZED_PATTERN,
        flags: ""
      }]
    },
    ...annotations
  });
}
var Finite = /* @__PURE__ */ make20(finite);
var isFinite3 = isFinite2;
function makeIsGreaterThan(options) {
  const gt = isGreaterThan(options.order);
  const formatter = options.formatter ?? format;
  return (exclusiveMinimum, annotations) => {
    return makeFilter2((input) => gt(input, exclusiveMinimum), {
      expected: `a value greater than ${formatter(exclusiveMinimum)}`,
      arbitraryConstraint: {
        order: options.order,
        minimum: exclusiveMinimum,
        exclusiveMinimum: true
      },
      ...options.annotate?.(exclusiveMinimum),
      ...annotations
    });
  };
}
function makeIsGreaterThanOrEqualTo(options) {
  const gte = isGreaterThanOrEqualTo(options.order);
  const formatter = options.formatter ?? format;
  return (minimum, annotations) => {
    return makeFilter2((input) => gte(input, minimum), {
      expected: `a value greater than or equal to ${formatter(minimum)}`,
      arbitraryConstraint: {
        order: options.order,
        minimum
      },
      ...options.annotate?.(minimum),
      ...annotations
    });
  };
}
function makeIsLessThan(options) {
  const lt = isLessThan(options.order);
  const formatter = options.formatter ?? format;
  return (exclusiveMaximum, annotations) => {
    return makeFilter2((input) => lt(input, exclusiveMaximum), {
      expected: `a value less than ${formatter(exclusiveMaximum)}`,
      arbitraryConstraint: {
        order: options.order,
        maximum: exclusiveMaximum,
        exclusiveMaximum: true
      },
      ...options.annotate?.(exclusiveMaximum),
      ...annotations
    });
  };
}
function makeIsLessThanOrEqualTo(options) {
  const lte = isLessThanOrEqualTo(options.order);
  const formatter = options.formatter ?? format;
  return (maximum, annotations) => {
    return makeFilter2((input) => lte(input, maximum), {
      expected: `a value less than or equal to ${formatter(maximum)}`,
      arbitraryConstraint: {
        order: options.order,
        maximum
      },
      ...options.annotate?.(maximum),
      ...annotations
    });
  };
}
function makeIsBetween(deriveOptions) {
  const greaterThanOrEqualTo = isGreaterThanOrEqualTo(deriveOptions.order);
  const greaterThan = isGreaterThan(deriveOptions.order);
  const lessThanOrEqualTo = isLessThanOrEqualTo(deriveOptions.order);
  const lessThan = isLessThan(deriveOptions.order);
  const formatter = deriveOptions.formatter ?? format;
  return (options, annotations) => {
    const gte = options.exclusiveMinimum ? greaterThan : greaterThanOrEqualTo;
    const lte = options.exclusiveMaximum ? lessThan : lessThanOrEqualTo;
    return makeFilter2((input) => gte(input, options.minimum) && lte(input, options.maximum), {
      expected: `a value between ${formatter(options.minimum)}${options.exclusiveMinimum ? " (excluded)" : ""} and ${formatter(options.maximum)}${options.exclusiveMaximum ? " (excluded)" : ""}`,
      arbitraryConstraint: {
        order: deriveOptions.order,
        minimum: options.minimum,
        maximum: options.maximum,
        ...options.exclusiveMinimum && {
          exclusiveMinimum: true
        },
        ...options.exclusiveMaximum && {
          exclusiveMaximum: true
        }
      },
      ...deriveOptions.annotate?.(options),
      ...annotations
    });
  };
}
function makeIsMultipleOf(options) {
  return (divisor, annotations) => {
    const formatter = options.formatter ?? format;
    return makeFilter2((input) => options.remainder(input, divisor) === options.zero, {
      expected: `a value that is a multiple of ${formatter(divisor)}`,
      ...options.annotate?.(divisor),
      ...annotations
    });
  };
}
function encodeNumberPayload(number3) {
  if (!globalThis.Number.isFinite(number3)) {
    throw new globalThis.RangeError(`Expected a finite number, got ${format(number3)}`);
  }
  return number3;
}
var isGreaterThan4 = /* @__PURE__ */ makeIsGreaterThan({
  order: Number2,
  annotate: (exclusiveMinimum) => ({
    representation: {
      id: "effect/schema/isGreaterThan",
      payload: {
        exclusiveMinimum: encodeNumberPayload(exclusiveMinimum)
      }
    },
    toJsonSchema: () => ({
      exclusiveMinimum
    }),
    toCode: () => ({
      runtime: `Schema.isGreaterThan(${format(exclusiveMinimum)})`
    })
  })
});
var isGreaterThanOrEqualTo4 = /* @__PURE__ */ makeIsGreaterThanOrEqualTo({
  order: Number2,
  annotate: (minimum) => ({
    representation: {
      id: "effect/schema/isGreaterThanOrEqualTo",
      payload: {
        minimum: encodeNumberPayload(minimum)
      }
    },
    toJsonSchema: () => ({
      minimum
    }),
    toCode: () => ({
      runtime: `Schema.isGreaterThanOrEqualTo(${format(minimum)})`
    })
  })
});
var isLessThan4 = /* @__PURE__ */ makeIsLessThan({
  order: Number2,
  annotate: (exclusiveMaximum) => ({
    representation: {
      id: "effect/schema/isLessThan",
      payload: {
        exclusiveMaximum: encodeNumberPayload(exclusiveMaximum)
      }
    },
    toJsonSchema: () => ({
      exclusiveMaximum
    }),
    toCode: () => ({
      runtime: `Schema.isLessThan(${format(exclusiveMaximum)})`
    })
  })
});
var isLessThanOrEqualTo5 = /* @__PURE__ */ makeIsLessThanOrEqualTo({
  order: Number2,
  annotate: (maximum) => ({
    representation: {
      id: "effect/schema/isLessThanOrEqualTo",
      payload: {
        maximum: encodeNumberPayload(maximum)
      }
    },
    toJsonSchema: () => ({
      maximum
    }),
    toCode: () => ({
      runtime: `Schema.isLessThanOrEqualTo(${format(maximum)})`
    })
  })
});
var isBetween2 = /* @__PURE__ */ makeIsBetween({
  order: Number2,
  annotate: (options) => {
    const exclusiveMinimum = options.exclusiveMinimum ? true : void 0;
    const exclusiveMaximum = options.exclusiveMaximum ? true : void 0;
    const payload = {
      minimum: encodeNumberPayload(options.minimum),
      maximum: encodeNumberPayload(options.maximum),
      ...exclusiveMinimum && {
        exclusiveMinimum
      },
      ...exclusiveMaximum && {
        exclusiveMaximum
      }
    };
    return {
      representation: {
        id: "effect/schema/isBetween",
        payload
      },
      toJsonSchema: () => ({
        [exclusiveMinimum ? "exclusiveMinimum" : "minimum"]: options.minimum,
        [exclusiveMaximum ? "exclusiveMaximum" : "maximum"]: options.maximum
      }),
      toCode: () => ({
        runtime: `Schema.isBetween({ minimum: ${format(options.minimum)}, maximum: ${format(options.maximum)}, exclusiveMinimum: ${format(exclusiveMinimum)}, exclusiveMaximum: ${format(exclusiveMaximum)} })`
      })
    };
  }
});
function isMultipleOf(divisor, annotations) {
  if (!globalThis.Number.isFinite(divisor) || divisor === 0) {
    throw new globalThis.RangeError(`Expected a finite non-zero number, got ${globalThis.String(divisor)}`);
  }
  divisor = globalThis.Math.abs(divisor);
  return makeFilter2((input) => remainder(input, divisor) === 0, {
    expected: `a value that is a multiple of ${divisor}`,
    representation: {
      id: "effect/schema/isMultipleOf",
      payload: {
        divisor
      }
    },
    toJsonSchema: () => ({
      multipleOf: divisor
    }),
    toCode: () => ({
      runtime: `Schema.isMultipleOf(${format(divisor)})`
    }),
    ...annotations
  });
}
function isInt(annotations) {
  return makeFilter2((n) => globalThis.Number.isSafeInteger(n), {
    expected: "an integer",
    representation: {
      id: "effect/schema/isInt",
      payload: null
    },
    toJsonSchema: () => ({
      type: "integer",
      minimum: globalThis.Number.MIN_SAFE_INTEGER,
      maximum: globalThis.Number.MAX_SAFE_INTEGER
    }),
    toCode: () => ({
      runtime: "Schema.isInt()"
    }),
    arbitraryConstraint: {
      number: "integer"
    },
    ...annotations
  });
}
var Int = /* @__PURE__ */ Number6.check(/* @__PURE__ */ isInt());
var Natural = /* @__PURE__ */ Int.check(/* @__PURE__ */ isGreaterThanOrEqualTo4(0));
function isInt32(annotations) {
  return new FilterGroup([isInt(), isBetween2({
    minimum: -2147483648,
    maximum: 2147483647
  })], {
    expected: "a 32-bit integer",
    ...annotations
  });
}
function isUint322(annotations) {
  return new FilterGroup([isInt(), isBetween2({
    minimum: 0,
    maximum: 4294967295
  })], {
    expected: "a 32-bit unsigned integer",
    ...annotations
  });
}
function encodeDatePayload(date) {
  if (globalThis.Number.isNaN(date.getTime())) {
    throw new globalThis.RangeError(`Expected a valid Date, got ${format(date)}`);
  }
  return date.toISOString();
}
function formatDateRuntime(date) {
  return `new Date(${format(date.getTime())})`;
}
var isGreaterThanDate = /* @__PURE__ */ makeIsGreaterThan({
  order: Date2,
  annotate: (exclusiveMinimum) => {
    const encoded = encodeDatePayload(exclusiveMinimum);
    return {
      representation: {
        id: "effect/schema/isGreaterThanDate",
        payload: {
          exclusiveMinimum: encoded
        }
      },
      toJsonSchema: () => [{}, true],
      toCode: () => ({
        runtime: `Schema.isGreaterThanDate(${formatDateRuntime(exclusiveMinimum)})`
      })
    };
  }
});
var isGreaterThanOrEqualToDate = /* @__PURE__ */ makeIsGreaterThanOrEqualTo({
  order: Date2,
  annotate: (minimum) => {
    const encoded = encodeDatePayload(minimum);
    return {
      representation: {
        id: "effect/schema/isGreaterThanOrEqualToDate",
        payload: {
          minimum: encoded
        }
      },
      toJsonSchema: () => [{}, true],
      toCode: () => ({
        runtime: `Schema.isGreaterThanOrEqualToDate(${formatDateRuntime(minimum)})`
      })
    };
  }
});
var isLessThanDate = /* @__PURE__ */ makeIsLessThan({
  order: Date2,
  annotate: (exclusiveMaximum) => {
    const encoded = encodeDatePayload(exclusiveMaximum);
    return {
      representation: {
        id: "effect/schema/isLessThanDate",
        payload: {
          exclusiveMaximum: encoded
        }
      },
      toJsonSchema: () => [{}, true],
      toCode: () => ({
        runtime: `Schema.isLessThanDate(${formatDateRuntime(exclusiveMaximum)})`
      })
    };
  }
});
var isLessThanOrEqualToDate = /* @__PURE__ */ makeIsLessThanOrEqualTo({
  order: Date2,
  annotate: (maximum) => {
    const encoded = encodeDatePayload(maximum);
    return {
      representation: {
        id: "effect/schema/isLessThanOrEqualToDate",
        payload: {
          maximum: encoded
        }
      },
      toJsonSchema: () => [{}, true],
      toCode: () => ({
        runtime: `Schema.isLessThanOrEqualToDate(${formatDateRuntime(maximum)})`
      })
    };
  }
});
var isBetweenDate = /* @__PURE__ */ makeIsBetween({
  order: Date2,
  annotate: (options) => {
    const exclusiveMinimum = options.exclusiveMinimum ? true : void 0;
    const exclusiveMaximum = options.exclusiveMaximum ? true : void 0;
    const payload = {
      minimum: encodeDatePayload(options.minimum),
      maximum: encodeDatePayload(options.maximum),
      ...exclusiveMinimum && {
        exclusiveMinimum
      },
      ...exclusiveMaximum && {
        exclusiveMaximum
      }
    };
    return {
      representation: {
        id: "effect/schema/isBetweenDate",
        payload
      },
      toJsonSchema: () => [{}, true],
      toCode: () => ({
        runtime: `Schema.isBetweenDate({ minimum: ${formatDateRuntime(options.minimum)}, maximum: ${formatDateRuntime(options.maximum)}, exclusiveMinimum: ${format(exclusiveMinimum)}, exclusiveMaximum: ${format(exclusiveMaximum)} })`
      })
    };
  }
});
var isGreaterThanBigInt = /* @__PURE__ */ makeIsGreaterThan({
  order: BigInt2,
  annotate: (exclusiveMinimum) => {
    const encoded = exclusiveMinimum.toString(10);
    return {
      representation: {
        id: "effect/schema/isGreaterThanBigInt",
        payload: {
          exclusiveMinimum: encoded
        }
      },
      toJsonSchema: () => [{}, true],
      toCode: () => ({
        runtime: `Schema.isGreaterThanBigInt(${format(exclusiveMinimum)})`
      })
    };
  }
});
var isGreaterThanOrEqualToBigInt = /* @__PURE__ */ makeIsGreaterThanOrEqualTo({
  order: BigInt2,
  annotate: (minimum) => {
    const encoded = minimum.toString(10);
    return {
      representation: {
        id: "effect/schema/isGreaterThanOrEqualToBigInt",
        payload: {
          minimum: encoded
        }
      },
      toJsonSchema: () => [{}, true],
      toCode: () => ({
        runtime: `Schema.isGreaterThanOrEqualToBigInt(${format(minimum)})`
      })
    };
  }
});
var isLessThanBigInt = /* @__PURE__ */ makeIsLessThan({
  order: BigInt2,
  annotate: (exclusiveMaximum) => {
    const encoded = exclusiveMaximum.toString(10);
    return {
      representation: {
        id: "effect/schema/isLessThanBigInt",
        payload: {
          exclusiveMaximum: encoded
        }
      },
      toJsonSchema: () => [{}, true],
      toCode: () => ({
        runtime: `Schema.isLessThanBigInt(${format(exclusiveMaximum)})`
      })
    };
  }
});
var isLessThanOrEqualToBigInt = /* @__PURE__ */ makeIsLessThanOrEqualTo({
  order: BigInt2,
  annotate: (maximum) => {
    const encoded = maximum.toString(10);
    return {
      representation: {
        id: "effect/schema/isLessThanOrEqualToBigInt",
        payload: {
          maximum: encoded
        }
      },
      toJsonSchema: () => [{}, true],
      toCode: () => ({
        runtime: `Schema.isLessThanOrEqualToBigInt(${format(maximum)})`
      })
    };
  }
});
var isBetweenBigInt = /* @__PURE__ */ makeIsBetween({
  order: BigInt2,
  annotate: (options) => {
    const exclusiveMinimum = options.exclusiveMinimum ? true : void 0;
    const exclusiveMaximum = options.exclusiveMaximum ? true : void 0;
    const payload = {
      minimum: options.minimum.toString(10),
      maximum: options.maximum.toString(10),
      ...exclusiveMinimum && {
        exclusiveMinimum
      },
      ...exclusiveMaximum && {
        exclusiveMaximum
      }
    };
    return {
      representation: {
        id: "effect/schema/isBetweenBigInt",
        payload
      },
      toJsonSchema: () => [{}, true],
      toCode: () => ({
        runtime: `Schema.isBetweenBigInt({ minimum: ${format(options.minimum)}, maximum: ${format(options.maximum)}, exclusiveMinimum: ${format(exclusiveMinimum)}, exclusiveMaximum: ${format(exclusiveMaximum)} })`
      })
    };
  }
});
function isMinLength(minLength, annotations) {
  minLength = normalizeCardinality(minLength);
  return makeIsMinLength(minLength, Math.ceil(minLength / 2), annotations);
}
function makeIsMinLength(minLength, minCodePoints, annotations) {
  return makeFilter2((input) => input.length >= minLength, {
    expected: `a value with a length of at least ${minLength}`,
    representation: {
      id: "effect/schema/isMinLength",
      payload: {
        minLength
      }
    },
    toJsonSchema: ({
      type
    }) => type === "string" ? minLength <= 1 ? {
      minLength: minCodePoints
    } : [{
      minLength: minCodePoints
    }, true] : type === "array" ? {
      minItems: minLength
    } : type === void 0 ? [{
      minLength: minCodePoints,
      minItems: minLength
    }, true] : [{}, true],
    toCode: () => ({
      runtime: `Schema.isMinLength(${minLength})`
    }),
    [STRUCTURAL_ANNOTATION_KEY]: true,
    arbitraryConstraint: {
      minLength
    },
    ...annotations
  });
}
function isNonEmpty(annotations) {
  return makeIsMinLength(1, 1, annotations);
}
function isMaxLength(maxLength, annotations) {
  maxLength = normalizeCardinality(maxLength);
  return makeFilter2((input) => input.length <= maxLength, {
    expected: `a value with a length of at most ${maxLength}`,
    representation: {
      id: "effect/schema/isMaxLength",
      payload: {
        maxLength
      }
    },
    toJsonSchema: ({
      type
    }) => type === "string" ? maxLength === 0 ? {
      maxLength
    } : [{
      maxLength
    }, true] : type === "array" ? {
      maxItems: maxLength
    } : type === void 0 ? [{
      maxLength,
      maxItems: maxLength
    }, true] : [{}, true],
    toCode: () => ({
      runtime: `Schema.isMaxLength(${maxLength})`
    }),
    [STRUCTURAL_ANNOTATION_KEY]: true,
    arbitraryConstraint: {
      maxLength
    },
    ...annotations
  });
}
function isBetweenLength(minimum, maximum, annotations) {
  minimum = normalizeCardinality(minimum);
  maximum = normalizeCardinality(maximum);
  return makeFilter2((input) => input.length >= minimum && input.length <= maximum, {
    expected: minimum === maximum ? `a value with a length of ${minimum}` : `a value with a length between ${minimum} and ${maximum}`,
    representation: {
      id: "effect/schema/isBetweenLength",
      payload: {
        minimum,
        maximum
      }
    },
    toJsonSchema: ({
      type
    }) => type === "string" ? maximum === 0 || Math.ceil(minimum / 2) > maximum ? {
      minLength: Math.ceil(minimum / 2),
      maxLength: maximum
    } : [{
      minLength: Math.ceil(minimum / 2),
      maxLength: maximum
    }, true] : type === "array" ? {
      minItems: minimum,
      maxItems: maximum
    } : type === void 0 ? [{
      minLength: Math.ceil(minimum / 2),
      maxLength: maximum,
      minItems: minimum,
      maxItems: maximum
    }, true] : [{}, true],
    toCode: () => ({
      runtime: `Schema.isBetweenLength(${minimum}, ${maximum})`
    }),
    [STRUCTURAL_ANNOTATION_KEY]: true,
    arbitraryConstraint: {
      minLength: minimum,
      maxLength: maximum
    },
    ...annotations
  });
}
function isMinCodePoints(minCodePoints, annotations) {
  minCodePoints = normalizeCardinality(minCodePoints);
  return makeFilter2((input) => countCodePointsUpTo(input, minCodePoints) >= minCodePoints, {
    expected: `a string with at least ${minCodePoints} code points`,
    representation: {
      id: "effect/schema/isMinCodePoints",
      payload: {
        minCodePoints
      }
    },
    toJsonSchema: () => ({
      minLength: minCodePoints
    }),
    toCode: () => ({
      runtime: `Schema.isMinCodePoints(${minCodePoints})`
    }),
    arbitraryConstraint: {
      minCodePoints
    },
    ...annotations
  });
}
function isMaxCodePoints(maxCodePoints, annotations) {
  maxCodePoints = normalizeCardinality(maxCodePoints);
  return makeFilter2((input) => countCodePointsUpTo(input, maxCodePoints + 1) <= maxCodePoints, {
    expected: `a string with at most ${maxCodePoints} code points`,
    representation: {
      id: "effect/schema/isMaxCodePoints",
      payload: {
        maxCodePoints
      }
    },
    toJsonSchema: () => ({
      maxLength: maxCodePoints
    }),
    toCode: () => ({
      runtime: `Schema.isMaxCodePoints(${maxCodePoints})`
    }),
    arbitraryConstraint: {
      maxCodePoints
    },
    ...annotations
  });
}
function isBetweenCodePoints(minimum, maximum, annotations) {
  minimum = normalizeCardinality(minimum);
  maximum = normalizeCardinality(maximum);
  return makeFilter2((input) => {
    const count = countCodePointsUpTo(input, maximum + 1);
    return count >= minimum && count <= maximum;
  }, {
    expected: minimum === maximum ? `a string with ${minimum} code points` : `a string with between ${minimum} and ${maximum} code points`,
    representation: {
      id: "effect/schema/isBetweenCodePoints",
      payload: {
        minimum,
        maximum
      }
    },
    toJsonSchema: () => ({
      allOf: [{
        minLength: minimum
      }, {
        maxLength: maximum
      }]
    }),
    toCode: () => ({
      runtime: `Schema.isBetweenCodePoints(${minimum}, ${maximum})`
    }),
    arbitraryConstraint: {
      minCodePoints: minimum,
      maxCodePoints: maximum
    },
    ...annotations
  });
}
function countCodePointsUpTo(input, limit) {
  if (limit === 0) return 0;
  let count = 0;
  for (const _ of input) {
    if (++count >= limit) break;
  }
  return count;
}
function normalizeCardinality(value3) {
  if (!globalThis.Number.isFinite(value3)) {
    throw new globalThis.RangeError(`Expected a finite number, got ${value3}`);
  }
  return Math.max(0, Math.floor(value3));
}
function isMinSize(minSize, annotations) {
  minSize = normalizeCardinality(minSize);
  return makeFilter2((input) => input.size >= minSize, {
    expected: `a value with a size of at least ${minSize}`,
    representation: {
      id: "effect/schema/isMinSize",
      payload: {
        minSize
      }
    },
    toJsonSchema: () => [{}, true],
    toCode: () => ({
      runtime: `Schema.isMinSize(${minSize})`
    }),
    [STRUCTURAL_ANNOTATION_KEY]: true,
    arbitraryConstraint: {
      minSize
    },
    ...annotations
  });
}
function isMaxSize(maxSize, annotations) {
  maxSize = normalizeCardinality(maxSize);
  return makeFilter2((input) => input.size <= maxSize, {
    expected: `a value with a size of at most ${maxSize}`,
    representation: {
      id: "effect/schema/isMaxSize",
      payload: {
        maxSize
      }
    },
    toJsonSchema: () => [{}, true],
    toCode: () => ({
      runtime: `Schema.isMaxSize(${maxSize})`
    }),
    [STRUCTURAL_ANNOTATION_KEY]: true,
    arbitraryConstraint: {
      maxSize
    },
    ...annotations
  });
}
function isBetweenSize(minimum, maximum, annotations) {
  minimum = normalizeCardinality(minimum);
  maximum = normalizeCardinality(maximum);
  return makeFilter2((input) => input.size >= minimum && input.size <= maximum, {
    expected: minimum === maximum ? `a value with a size of ${minimum}` : `a value with a size between ${minimum} and ${maximum}`,
    representation: {
      id: "effect/schema/isBetweenSize",
      payload: {
        minimum,
        maximum
      }
    },
    toJsonSchema: () => [{}, true],
    toCode: () => ({
      runtime: `Schema.isBetweenSize(${minimum}, ${maximum})`
    }),
    [STRUCTURAL_ANNOTATION_KEY]: true,
    arbitraryConstraint: {
      minSize: minimum,
      maxSize: maximum
    },
    ...annotations
  });
}
function isMinProperties(minProperties, annotations) {
  minProperties = normalizeCardinality(minProperties);
  return makeFilter2((input) => Reflect.ownKeys(input).length >= minProperties, {
    expected: `a value with at least ${minProperties === 1 ? "1 entry" : `${minProperties} entries`}`,
    representation: {
      id: "effect/schema/isMinProperties",
      payload: {
        minProperties
      }
    },
    toJsonSchema: ({
      type
    }) => type === "object" ? {
      minProperties
    } : [{
      minProperties
    }, true],
    toCode: () => ({
      runtime: `Schema.isMinProperties(${minProperties})`
    }),
    [STRUCTURAL_ANNOTATION_KEY]: true,
    arbitraryConstraint: {
      minProperties
    },
    ...annotations
  });
}
function isMaxProperties(maxProperties, annotations) {
  maxProperties = normalizeCardinality(maxProperties);
  return makeFilter2((input) => Reflect.ownKeys(input).length <= maxProperties, {
    expected: `a value with at most ${maxProperties === 1 ? "1 entry" : `${maxProperties} entries`}`,
    representation: {
      id: "effect/schema/isMaxProperties",
      payload: {
        maxProperties
      }
    },
    toJsonSchema: ({
      type
    }) => type === "object" ? {
      maxProperties
    } : [{
      maxProperties
    }, true],
    toCode: () => ({
      runtime: `Schema.isMaxProperties(${maxProperties})`
    }),
    [STRUCTURAL_ANNOTATION_KEY]: true,
    arbitraryConstraint: {
      maxProperties
    },
    ...annotations
  });
}
function isBetweenProperties(minimum, maximum, annotations) {
  minimum = normalizeCardinality(minimum);
  maximum = normalizeCardinality(maximum);
  return makeFilter2((input) => Reflect.ownKeys(input).length >= minimum && Reflect.ownKeys(input).length <= maximum, {
    expected: minimum === maximum ? `a value with exactly ${minimum === 1 ? "1 entry" : `${minimum} entries`}` : `a value with between ${minimum} and ${maximum} entries`,
    representation: {
      id: "effect/schema/isBetweenProperties",
      payload: {
        minimum,
        maximum
      }
    },
    toJsonSchema: ({
      type
    }) => type === "object" ? {
      minProperties: minimum,
      maxProperties: maximum
    } : [{
      minProperties: minimum,
      maxProperties: maximum
    }, true],
    toCode: () => ({
      runtime: `Schema.isBetweenProperties(${minimum}, ${maximum})`
    }),
    [STRUCTURAL_ANNOTATION_KEY]: true,
    arbitraryConstraint: {
      minProperties: minimum,
      maxProperties: maximum
    },
    ...annotations
  });
}
function isPropertyNames(keySchema, annotations) {
  const propertyNames = toEncoded2(keySchema);
  const parser = _issue(propertyNames.ast);
  return makeFilter2((input, ast, options) => {
    const keys3 = Reflect.ownKeys(input);
    const issues = [];
    for (const key of keys3) {
      const issue = parser(key, options);
      if (issue !== void 0) {
        issues.push(new Pointer([key], issue));
        if (options.errors === "first") break;
      }
    }
    if (isArrayNonEmpty2(issues)) {
      return new Composite(ast, issues, input, options);
    }
    return true;
  }, {
    expected: "an object with property names matching the schema",
    representation: {
      id: "effect/schema/isPropertyNames",
      payload: null,
      schemas: [propertyNames.ast]
    },
    toJsonSchema: ({
      schemas,
      type
    }) => type === "object" ? {
      propertyNames: schemas[0]
    } : [{
      propertyNames: schemas[0]
    }, true],
    toCode: ({
      schemas
    }) => ({
      runtime: `Schema.isPropertyNames(${schemas[0].runtime})`
    }),
    [STRUCTURAL_ANNOTATION_KEY]: true,
    ...annotations
  });
}
function isUnique(annotations) {
  return makeFilter2((input) => dedupe(input).length === input.length, {
    expected: "an array with unique items",
    representation: {
      id: "effect/schema/isUnique",
      payload: null
    },
    toJsonSchema: () => ({
      uniqueItems: true
    }),
    toCode: () => ({
      runtime: "Schema.isUnique()"
    }),
    arbitraryConstraint: {
      uniqueBy: identity
    },
    ...annotations
  });
}
function isUniqueKey(annotations) {
  return makeFilter2((input) => dedupe(input.map(([key]) => key)).length === input.length, {
    expected: "an array with unique keys",
    representation: {
      id: "effect/schema/isUniqueKey",
      payload: null
    },
    toCode: () => ({
      runtime: "Schema.isUniqueKey()"
    }),
    arbitraryConstraint: {
      uniqueBy: (entry) => entry[0]
    },
    ...annotations
  });
}
var NonEmptyString = /* @__PURE__ */ String6.check(/* @__PURE__ */ isNonEmpty());
var Char = /* @__PURE__ */ String6.check(/* @__PURE__ */ isBetweenLength(1, 1));
var getErrorOptionsKey = (options) => (options?.includeStack === true ? 1 : 0) | (options?.excludeCause === true ? 2 : 0);
var getErrorOptions = (key) => {
  switch (key) {
    case 0:
      return void 0;
    case 1:
      return {
        includeStack: true
      };
    case 2:
      return {
        excludeCause: true
      };
    case 3:
      return {
        includeStack: true,
        excludeCause: true
      };
  }
};
var errorSchemaCache = [];
function ErrorInstance(options) {
  const key = getErrorOptionsKey(options);
  const cached3 = errorSchemaCache[key];
  if (cached3 !== void 0) {
    return cached3;
  }
  const normalizedOptions = getErrorOptions(key);
  const schema = instanceOf(globalThis.Error, {
    representation: {
      id: "effect/schema/Error",
      payload: normalizedOptions ?? null
    },
    toCode: () => ({
      runtime: normalizedOptions !== void 0 ? `Schema.ErrorInstance(${format(normalizedOptions)})` : `Schema.ErrorInstance()`,
      Type: `globalThis.Error`
    }),
    expected: "Error",
    toCodecJson: () => link()(JsonError, errorFromJsonError(normalizedOptions))
  });
  errorSchemaCache[key] = schema;
  return schema;
}
var defectSchemaCache = [];
function Defect(options) {
  const key = getErrorOptionsKey(options);
  const cached3 = defectSchemaCache[key];
  if (cached3 !== void 0) {
    return cached3;
  }
  const schema = Json2.pipe(decodeTo2(Unknown2, defectFromJson(getErrorOptions(key))));
  defectSchemaCache[key] = schema;
  return schema;
}
function ReadonlyMap(key, value3) {
  const schema = declareConstructor()([key, value3], ([key2, value4]) => {
    const array2 = ArraySchema(Tuple2([key2, value4]));
    return (input, ast, options) => {
      if (input instanceof globalThis.Map) {
        return mapBothEager2(decodeUnknownEffect(array2)([...input], options), {
          onSuccess: (array3) => new globalThis.Map(array3),
          onFailure: (issue) => makeCompositeAtKey(ast, "entries", issue, input, options)
        });
      }
      return fail5(new InvalidType(ast, input, options));
    };
  }, {
    representation: {
      id: "effect/schema/ReadonlyMap",
      payload: null
    },
    toCode: ({
      typeParameters
    }) => ({
      runtime: `Schema.ReadonlyMap(${typeParameters[0].runtime}, ${typeParameters[1].runtime})`,
      Type: `globalThis.ReadonlyMap<${typeParameters[0].Type}, ${typeParameters[1].Type}>`
    }),
    expected: "ReadonlyMap",
    toCodec: ([key2, value4]) => link()(ArraySchema(Tuple2([key2, value4])), transform2({
      decode: (entries3) => new globalThis.Map(entries3),
      encode: (map10) => [...map10.entries()]
    }))
  });
  return make20(schema.ast, {
    key,
    value: value3
  });
}
function ReadonlySet(value3) {
  const schema = declareConstructor()([value3], ([value4]) => {
    const array2 = ArraySchema(value4);
    return (input, ast, options) => {
      if (input instanceof globalThis.Set) {
        return mapBothEager2(decodeUnknownEffect(array2)([...input], options), {
          onSuccess: (array3) => new globalThis.Set(array3),
          onFailure: (issue) => makeCompositeAtKey(ast, "values", issue, input, options)
        });
      }
      return fail5(new InvalidType(ast, input, options));
    };
  }, {
    representation: {
      id: "effect/schema/ReadonlySet",
      payload: null
    },
    toCode: ({
      typeParameters
    }) => ({
      runtime: `Schema.ReadonlySet(${typeParameters[0].runtime})`,
      Type: `globalThis.ReadonlySet<${typeParameters[0].Type}>`
    }),
    expected: "ReadonlySet",
    toCodec: ([value4]) => link()(ArraySchema(value4), transform2({
      decode: (values2) => new globalThis.Set(values2),
      encode: (set4) => [...set4.values()]
    }))
  });
  return make20(schema.ast, {
    value: value3
  });
}
var RegExp3 = /* @__PURE__ */ instanceOf(globalThis.RegExp, {
  representation: {
    id: "effect/schema/RegExp",
    payload: null
  },
  toCode: () => ({
    runtime: `Schema.RegExp`,
    Type: `globalThis.RegExp`
  }),
  expected: "RegExp",
  toCodecJson: () => link()(Struct({
    source: String6,
    flags: String6
  }), transformEffect2({
    decode: (e, options) => try_3({
      try: () => new globalThis.RegExp(e.source, e.flags),
      catch: () => new InvalidValue({
        expected: "valid RegExp source and flags"
      }, e, options)
    }),
    encode: (regExp) => succeed6({
      source: regExp.source,
      flags: regExp.flags
    })
  }))
});
var URLString = /* @__PURE__ */ String6.annotate({
  expected: "a string that will be decoded as a URL"
});
var URL2 = /* @__PURE__ */ instanceOf(globalThis.URL, {
  representation: {
    id: "effect/schema/URL",
    payload: null
  },
  toCode: () => ({
    runtime: `Schema.URL`,
    Type: `globalThis.URL`
  }),
  expected: "URL",
  toCodecJson: () => link()(URLString, urlFromString)
});
var URLFromString = /* @__PURE__ */ URLString.pipe(/* @__PURE__ */ decodeTo2(URL2, urlFromString));
var DateString = /* @__PURE__ */ String6.annotate({
  expected: "a string that will be decoded as a Date"
});
var Date4 = /* @__PURE__ */ declare((input) => input instanceof globalThis.Date && !globalThis.Number.isNaN(input.getTime()), {
  representation: {
    id: "effect/schema/Date",
    payload: null
  },
  toCode: () => ({
    runtime: `Schema.Date`,
    Type: `globalThis.Date`
  }),
  expected: "a valid Date",
  toCodecJson: () => link()(DateString, dateFromString)
});
var DateFromString = /* @__PURE__ */ DateString.pipe(/* @__PURE__ */ decodeTo2(Date4, dateFromString));
var DateFromMillis = /* @__PURE__ */ Int.pipe(/* @__PURE__ */ decodeTo2(Date4, dateFromMillis));
var JsonString = /* @__PURE__ */ String6.annotate({
  expected: "a string that will be decoded as JSON",
  contentMediaType: "application/json"
});
function fromJsonString2(schema, options) {
  return JsonString.pipe(decodeTo2(schema, fromJsonString(options)));
}
var UnknownFromJsonString = /* @__PURE__ */ fromJsonString2(Unknown2);
var File = /* @__PURE__ */ instanceOf(globalThis.File, {
  representation: {
    id: "effect/schema/File",
    payload: null
  },
  toCode: () => ({
    runtime: `Schema.File`,
    Type: `globalThis.File`
  }),
  expected: "File",
  toCodecJson: () => link()(Struct({
    data: String6.check(isBase64()),
    type: String6,
    name: String6,
    lastModified: Int
  }), transformEffect2({
    decode: (e, options) => match2(decode2(e.data), {
      onFailure: () => fail5(new InvalidValue({
        expected: "a valid Base64 string"
      }, e.data, options)),
      onSuccess: (bytes3) => {
        const buffer = new globalThis.Uint8Array(bytes3);
        return succeed6(new globalThis.File([buffer], e.name, {
          type: e.type,
          lastModified: e.lastModified
        }));
      }
    }),
    encode: (file, options) => tryPromise2({
      try: async () => {
        const bytes3 = new globalThis.Uint8Array(await file.arrayBuffer());
        return {
          data: encode2(bytes3),
          type: file.type,
          name: file.name,
          lastModified: file.lastModified
        };
      },
      catch: () => new InvalidValue({
        expected: "a readable File"
      }, file, options)
    })
  }))
});
var FormData2 = /* @__PURE__ */ instanceOf(globalThis.FormData, {
  representation: {
    id: "effect/schema/FormData",
    payload: null
  },
  toCode: () => ({
    runtime: `Schema.FormData`,
    Type: `globalThis.FormData`
  }),
  expected: "FormData",
  toCodecJson: () => link()(ArraySchema(Tuple2([String6, Union2([Struct({
    _tag: tag("String"),
    value: String6
  }), Struct({
    _tag: tag("File"),
    value: File
  })])])), transformEffect2({
    decode: (e) => {
      const out = new globalThis.FormData();
      for (const [key, entry] of e) {
        out.append(key, entry.value);
      }
      return succeed6(out);
    },
    encode: (formData) => {
      return succeed6(globalThis.Array.from(formData.entries()).map(([key, value3]) => {
        if (typeof value3 === "string") {
          return [key, {
            _tag: "String",
            value: value3
          }];
        } else {
          return [key, {
            _tag: "File",
            value: value3
          }];
        }
      }));
    }
  }))
});
function fromFormData2(schema) {
  return FormData2.pipe(decodeTo2(schema, fromFormData));
}
var URLSearchParams2 = /* @__PURE__ */ instanceOf(globalThis.URLSearchParams, {
  representation: {
    id: "effect/schema/URLSearchParams",
    payload: null
  },
  toCode: () => ({
    runtime: `Schema.URLSearchParams`,
    Type: `globalThis.URLSearchParams`
  }),
  expected: "URLSearchParams",
  toCodecJson: () => link()(String6.annotate({
    expected: "a query string that will be decoded as URLSearchParams"
  }), transform2({
    decode: (e) => new globalThis.URLSearchParams(e),
    encode: (params) => params.toString()
  }))
});
function fromURLSearchParams2(schema) {
  return URLSearchParams2.pipe(decodeTo2(schema, fromURLSearchParams));
}
var NumberFromString = /* @__PURE__ */ String6.annotate({
  expected: "a string that will be decoded as a number"
}).pipe(/* @__PURE__ */ decodeTo2(Number6, numberFromString));
var FiniteFromString = /* @__PURE__ */ String6.annotate({
  expected: "a string that will be decoded as a finite number"
}).pipe(/* @__PURE__ */ decodeTo2(Finite, numberFromString));
var BigIntFromString = /* @__PURE__ */ make20(bigIntString).pipe(/* @__PURE__ */ decodeTo2(BigInt6, bigintFromString));
var Trimmed = /* @__PURE__ */ String6.check(/* @__PURE__ */ isTrimmed());
var Trim = /* @__PURE__ */ String6.annotate({
  expected: "a string that will be decoded as a trimmed string"
}).pipe(/* @__PURE__ */ decodeTo2(Trimmed, /* @__PURE__ */ trim3()));
var StringFromBase64 = /* @__PURE__ */ String6.annotate({
  expected: "a base64 encoded string that will be decoded as a UTF-8 string"
}).pipe(/* @__PURE__ */ decodeTo2(String6, stringFromBase64String));
var StringFromBase64Url = /* @__PURE__ */ String6.annotate({
  expected: "a base64 (URL) encoded string that will be decoded as a UTF-8 string"
}).pipe(/* @__PURE__ */ decodeTo2(String6, stringFromBase64UrlString));
var StringFromHex = /* @__PURE__ */ String6.annotate({
  expected: "a hex encoded string that will be decoded as a UTF-8 string"
}).pipe(/* @__PURE__ */ decodeTo2(String6, stringFromHexString));
var StringFromUriComponent = /* @__PURE__ */ String6.annotate({
  expected: "a URI component encoded string that will be decoded as a UTF-8 string"
}).pipe(/* @__PURE__ */ decodeTo2(String6, stringFromUriComponent));
var PropertyKey = /* @__PURE__ */ Union2([Finite, Symbol3, String6]);
var StandardSchemaV1FailureResult = /* @__PURE__ */ Struct({
  issues: /* @__PURE__ */ ArraySchema(/* @__PURE__ */ Struct({
    message: String6,
    path: /* @__PURE__ */ optional2(/* @__PURE__ */ ArraySchema(/* @__PURE__ */ Union2([PropertyKey, /* @__PURE__ */ Struct({
      key: PropertyKey
    })])))
  }))
});
var BooleanFromBit = /* @__PURE__ */ Literals([0, 1]).pipe(/* @__PURE__ */ decodeTo2(Boolean3, /* @__PURE__ */ transform2({
  decode: (bit) => bit === 1,
  encode: (bool) => bool ? 1 : 0
})));
var Base64String = /* @__PURE__ */ String6.annotate({
  expected: "a base64 encoded string that will be decoded as Uint8Array",
  format: "byte",
  contentEncoding: "base64"
});
var Uint8Array2 = /* @__PURE__ */ instanceOf(globalThis.Uint8Array, {
  representation: {
    id: "effect/schema/Uint8Array",
    payload: null
  },
  toCode: () => ({
    runtime: `Schema.Uint8Array`,
    Type: `globalThis.Uint8Array`
  }),
  expected: "Uint8Array",
  toCodecJson: () => link()(Base64String, uint8ArrayFromBase64String)
});
var Uint8ArrayFromBase64 = /* @__PURE__ */ Base64String.pipe(/* @__PURE__ */ decodeTo2(Uint8Array2, uint8ArrayFromBase64String));
var Uint8ArrayFromBase64Url = /* @__PURE__ */ String6.annotate({
  expected: "a base64 (URL) encoded string that will be decoded as a Uint8Array"
}).pipe(/* @__PURE__ */ decodeTo2(Uint8Array2, {
  decode: /* @__PURE__ */ decodeBase64Url(),
  encode: /* @__PURE__ */ encodeBase64Url()
}));
var Uint8ArrayFromHex = /* @__PURE__ */ String6.annotate({
  expected: "a hex encoded string that will be decoded as a Uint8Array"
}).pipe(/* @__PURE__ */ decodeTo2(Uint8Array2, {
  decode: /* @__PURE__ */ decodeHex(),
  encode: /* @__PURE__ */ encodeHex()
}));
var bigDecimalFromString = /* @__PURE__ */ transformEffect2({
  decode: (s, options) => {
    const result3 = fromString(s);
    return isNone2(result3) ? fail5(new InvalidValue({
      expected: "a valid BigDecimal string"
    }, s, options)) : succeed6(result3.value);
  },
  encode: (bd) => succeed6(format3(bd))
});
var isGreaterThanBigDecimal = /* @__PURE__ */ makeIsGreaterThan({
  order: Order,
  formatter: (bd) => format3(bd)
});
var isGreaterThanOrEqualToBigDecimal = /* @__PURE__ */ makeIsGreaterThanOrEqualTo({
  order: Order,
  formatter: (bd) => format3(bd)
});
var isLessThanBigDecimal = /* @__PURE__ */ makeIsLessThan({
  order: Order,
  formatter: (bd) => format3(bd)
});
var isLessThanOrEqualToBigDecimal = /* @__PURE__ */ makeIsLessThanOrEqualTo({
  order: Order,
  formatter: (bd) => format3(bd)
});
var isBetweenBigDecimal = /* @__PURE__ */ makeIsBetween({
  order: Order,
  formatter: (bd) => format3(bd)
});
var BigDecimalString = /* @__PURE__ */ String6.annotate({
  expected: "a string that will be decoded as a BigDecimal"
});
var BigDecimal = /* @__PURE__ */ declare(isBigDecimal, {
  representation: {
    id: "effect/schema/BigDecimal",
    payload: null
  },
  toCode: () => ({
    runtime: `Schema.BigDecimal`,
    Type: `BigDecimal.BigDecimal`,
    importDeclarations: [`import * as BigDecimal from "effect/BigDecimal"`]
  }),
  expected: "BigDecimal",
  toCodecJson: () => link()(BigDecimalString, bigDecimalFromString),
  toFormatter: () => (bd) => format3(bd)
});
var BigDecimalFromString = /* @__PURE__ */ BigDecimalString.pipe(/* @__PURE__ */ decodeTo2(BigDecimal, bigDecimalFromString));
var ByteSize = /* @__PURE__ */ declare(isByteSize, {
  representation: {
    id: "effect/schema/ByteSize",
    payload: null
  },
  toCode: () => ({
    runtime: `Schema.ByteSize`,
    Type: `ByteSize.ByteSize`,
    importDeclarations: [`import * as ByteSize from "effect/ByteSize"`]
  }),
  expected: "ByteSize",
  toCodecJson: () => link()(BigInt6.check(isGreaterThanOrEqualToBigInt(globalThis.BigInt(0))), transform2({
    decode: bytes,
    encode: toBigInt
  })),
  toCodecStringTree: () => link()(ByteSizeString, byteSizeFromString)
});
var ByteSizeString = /* @__PURE__ */ String6.annotate({
  expected: "a string that will be decoded as a ByteSize"
});
var ByteSizeFromString = /* @__PURE__ */ ByteSizeString.pipe(/* @__PURE__ */ decodeTo2(ByteSize, byteSizeFromString));
var ByteSizeFromBigInt = /* @__PURE__ */ BigInt6.pipe(/* @__PURE__ */ decodeTo2(ByteSize, byteSizeFromBigInt));
var ByteSizeFromNumber = /* @__PURE__ */ Number6.pipe(/* @__PURE__ */ decodeTo2(ByteSize, byteSizeFromNumber));
function CauseReason(error, defect) {
  const schema = declareConstructor()([error, defect], ([error2, defect2]) => (input, ast, options) => {
    if (!isReason(input)) {
      return fail5(new InvalidType(ast, input, options));
    }
    switch (input._tag) {
      case "Fail":
        return mapBothEager2(decodeUnknownEffect(error2)(input.error, options), {
          onSuccess: makeFailReason,
          onFailure: (issue) => makeCompositeAtKey(ast, "error", issue, input, options)
        });
      case "Die":
        return mapBothEager2(decodeUnknownEffect(defect2)(input.defect, options), {
          onSuccess: makeDieReason,
          onFailure: (issue) => makeCompositeAtKey(ast, "defect", issue, input, options)
        });
      case "Interrupt":
        return succeed6(input);
    }
  }, {
    representation: {
      id: "effect/schema/CauseReason",
      payload: null
    },
    toCode: ({
      typeParameters
    }) => ({
      runtime: `Schema.CauseReason(${typeParameters[0].runtime}, ${typeParameters[1].runtime})`,
      Type: `Cause.Failure<${typeParameters[0].Type}, ${typeParameters[1].Type}>`,
      importDeclarations: [`import * as Cause from "effect/Cause"`]
    }),
    expected: "Cause.Failure",
    toCodec: ([error2, defect2]) => link()(Union2([Struct({
      _tag: Literal2("Fail"),
      error: error2
    }), Struct({
      _tag: Literal2("Die"),
      defect: defect2
    }), Struct({
      _tag: Literal2("Interrupt"),
      fiberId: UndefinedOr(Finite)
    })]), transform2({
      decode: (e) => {
        switch (e._tag) {
          case "Fail":
            return makeFailReason(e.error);
          case "Die":
            return makeDieReason(e.defect);
          case "Interrupt":
            return makeInterruptReason2(e.fiberId);
        }
      },
      encode: (reason) => {
        switch (reason._tag) {
          case "Fail":
            return {
              _tag: "Fail",
              error: reason.error
            };
          case "Die":
            return {
              _tag: "Die",
              defect: reason.defect
            };
          case "Interrupt":
            return {
              _tag: "Interrupt",
              fiberId: reason.fiberId
            };
        }
      }
    }))
  });
  return make20(schema.ast, {
    error,
    defect
  });
}
function Cause(error, defect) {
  const schema = declareConstructor()([error, defect], ([error2, defect2]) => {
    const failures = ArraySchema(CauseReason(error2, defect2));
    return (input, ast, options) => {
      if (!isCause2(input)) {
        return fail5(new InvalidType(ast, input, options));
      }
      return mapBothEager2(decodeUnknownEffect(failures)(input.reasons, options), {
        onSuccess: fromReasons,
        onFailure: (issue) => makeCompositeAtKey(ast, "failures", issue, input, options)
      });
    };
  }, {
    representation: {
      id: "effect/schema/Cause",
      payload: null
    },
    toCode: ({
      typeParameters
    }) => ({
      runtime: `Schema.Cause(${typeParameters[0].runtime}, ${typeParameters[1].runtime})`,
      Type: `Cause.Cause<${typeParameters[0].Type}, ${typeParameters[1].Type}>`,
      importDeclarations: [`import * as Cause from "effect/Cause"`]
    }),
    expected: "Cause",
    toCodec: ([error2, defect2]) => link()(ArraySchema(CauseReason(error2, defect2)), transform2({
      decode: fromReasons,
      encode: ({
        reasons: failures
      }) => failures
    }))
  });
  return make20(schema.ast, {
    error,
    defect
  });
}
function chunkLink(values2) {
  return link()(values2, transform2({
    decode: fromIterable2,
    encode: fromIterable
  }));
}
function Chunk(value3) {
  const schema = declareConstructor()([value3], ([value4]) => {
    const values2 = ArraySchema(value4);
    return (input, ast, options) => {
      if (isChunk(input)) {
        return mapBothEager2(decodeUnknownEffect(values2)(fromIterable(input), options), {
          onSuccess: fromIterable2,
          onFailure: (issue) => makeCompositeAtKey(ast, "values", issue, input, options)
        });
      }
      return fail5(new InvalidType(ast, input, options));
    };
  }, {
    representation: {
      id: "effect/schema/Chunk",
      payload: null
    },
    toCode: ({
      typeParameters
    }) => ({
      runtime: `Schema.Chunk(${typeParameters[0].runtime})`,
      Type: `Chunk.Chunk<${typeParameters[0].Type}>`
    }),
    expected: "Chunk",
    toCodec: ([value4]) => chunkLink(ArraySchema(value4)),
    toCodecArbitrary: ({
      constraint,
      typeParameters: [value4]
    }) => chunkLink(withArrayLengthConstraints(ArraySchema(value4), constraint?.minLength, constraint?.maxLength)),
    toEquivalence: ([value4]) => makeEquivalence5(value4)
  });
  return make20(schema.ast, {
    value: value3
  });
}
function dateTimeUtcFromInput() {
  return transformEffect((input, options) => {
    return match(make9(input), {
      onNone: () => fail5(new InvalidValue({
        message: "Invalid DateTime input"
      }, input, options)),
      onSome: (dt) => succeed6(toUtc2(dt))
    });
  });
}
var timeZoneOffsetFromNumber = /* @__PURE__ */ transform2({
  decode: (n) => zoneMakeOffset2(n),
  encode: (tz) => tz.offset
});
var timeZoneNamedFromString = /* @__PURE__ */ transformEffect2({
  decode: (s, options) => {
    return match(zoneMakeNamed2(s), {
      onNone: () => fail5(new InvalidValue({
        expected: "a valid IANA time zone"
      }, s, options)),
      onSome: succeed6
    });
  },
  encode: (tz) => succeed6(tz.id)
});
var timeZoneFromString = /* @__PURE__ */ transformEffect2({
  decode: (s, options) => {
    return match(zoneFromString2(s), {
      onNone: () => fail5(new InvalidValue({
        expected: "a valid time zone"
      }, s, options)),
      onSome: succeed6
    });
  },
  encode: (tz) => succeed6(zoneToString2(tz))
});
var dateTimeUtcFromString = /* @__PURE__ */ transformEffect2({
  decode: (s, options) => {
    return match(make9(s), {
      onNone: () => fail5(new InvalidValue({
        expected: "a valid UTC DateTime string"
      }, s, options)),
      onSome: (result3) => succeed6(toUtc2(result3))
    });
  },
  encode: (utc) => succeed6(formatIso2(utc))
});
var dateTimeZonedFromString = /* @__PURE__ */ transformEffect2({
  decode: (s, options) => {
    return match(makeZonedFromString2(s), {
      onNone: () => fail5(new InvalidValue({
        expected: "a valid Zoned DateTime string"
      }, s, options)),
      onSome: succeed6
    });
  },
  encode: (zoned) => succeed6(formatIsoZoned2(zoned))
});
var arbitraryMinimumDateTimestamp = -864e13;
var arbitraryMaximumDateTimestamp = 864e13;
var arbitraryMinimumZonedDateTimeTimestamp = arbitraryMinimumDateTimestamp + 14 * 60 * 60 * 1e3;
var arbitraryMaximumZonedDateTimeTimestamp = arbitraryMaximumDateTimestamp - 14 * 60 * 60 * 1e3;
var arbitraryMinimumTimeZoneOffset = -12 * 60 * 60 * 1e3;
var arbitraryMaximumTimeZoneOffset = 14 * 60 * 60 * 1e3;
var arbitraryNamedTimeZones = ["UTC", "Europe/London", "America/New_York", "Asia/Tokyo", "Australia/Sydney"];
function dateTimeArbitraryBounds(constraint, domainMinimum, domainMaximum) {
  const minimum = Math.max(domainMinimum, constraint?.minimum === void 0 ? domainMinimum : constraint.minimum.epochMilliseconds + (constraint.exclusiveMinimum === true ? 1 : 0));
  const maximum = Math.min(domainMaximum, constraint?.maximum === void 0 ? domainMaximum : constraint.maximum.epochMilliseconds - (constraint.exclusiveMaximum === true ? 1 : 0));
  return minimum <= maximum ? [minimum, maximum] : [domainMinimum, domainMaximum];
}
function dateTimeArbitraryInteger(minimum, maximum) {
  return Int.check(isBetween2({
    minimum,
    maximum
  }));
}
function timeZoneArbitrarySchema() {
  return Union2([dateTimeArbitraryInteger(arbitraryMinimumTimeZoneOffset, arbitraryMaximumTimeZoneOffset), Literals(arbitraryNamedTimeZones)]);
}
var DateTimeUtc = /* @__PURE__ */ declare((u) => isDateTime2(u) && isUtc2(u), {
  representation: {
    id: "effect/schema/DateTimeUtc",
    payload: null
  },
  toCode: () => ({
    runtime: `Schema.DateTimeUtc`,
    Type: `DateTime.Utc`,
    importDeclarations: [`import * as DateTime from "effect/DateTime"`]
  }),
  expected: "DateTime.Utc",
  toCodecArbitrary: ({
    constraint
  }) => {
    const [minimum, maximum] = dateTimeArbitraryBounds(constraint, arbitraryMinimumDateTimestamp, arbitraryMaximumDateTimestamp);
    return linkDecoding()(dateTimeArbitraryInteger(minimum, maximum), transform(makeUnsafe5));
  },
  toCodecJson: () => link()(String6, dateTimeUtcFromString),
  toFormatter: () => (utc) => utc.toString()
});
var DateTimeUtcFromDate = /* @__PURE__ */ Date4.pipe(/* @__PURE__ */ decodeTo2(DateTimeUtc, {
  decode: /* @__PURE__ */ dateTimeUtcFromInput(),
  encode: /* @__PURE__ */ transform(toDateUtc2)
}));
var DateTimeUtcFromString = /* @__PURE__ */ String6.annotate({
  expected: "a string that will be decoded as a DateTime.Utc"
}).pipe(/* @__PURE__ */ decodeTo2(DateTimeUtc, dateTimeUtcFromString));
var DateTimeUtcFromMillis = /* @__PURE__ */ Int.pipe(/* @__PURE__ */ decodeTo2(DateTimeUtc, {
  decode: /* @__PURE__ */ dateTimeUtcFromInput(),
  encode: /* @__PURE__ */ transform(toEpochMillis2)
}));
var TimeZoneOffset = /* @__PURE__ */ declare(isTimeZoneOffset2, {
  representation: {
    id: "effect/schema/TimeZoneOffset",
    payload: null
  },
  toCode: () => ({
    runtime: `Schema.TimeZoneOffset`,
    Type: `DateTime.TimeZone.Offset`,
    importDeclarations: [`import * as DateTime from "effect/DateTime"`]
  }),
  expected: "DateTime.TimeZone.Offset",
  toCodecJson: () => link()(Int, timeZoneOffsetFromNumber),
  toFormatter: () => (tz) => zoneToString2(tz)
});
var TimeZoneNamedString = /* @__PURE__ */ String6.annotate({
  expected: "an IANA time zone identifier"
});
var TimeZoneNamed = /* @__PURE__ */ declare(isTimeZoneNamed2, {
  representation: {
    id: "effect/schema/TimeZoneNamed",
    payload: null
  },
  toCode: () => ({
    runtime: `Schema.TimeZoneNamed`,
    Type: `DateTime.TimeZone.Named`,
    importDeclarations: [`import * as DateTime from "effect/DateTime"`]
  }),
  expected: "DateTime.TimeZone.Named",
  toCodecArbitrary: () => linkDecoding()(Literals(arbitraryNamedTimeZones), transform(zoneMakeNamedUnsafe2)),
  toCodecJson: () => link()(TimeZoneNamedString, timeZoneNamedFromString),
  toFormatter: () => (tz) => zoneToString2(tz)
});
var TimeZoneNamedFromString = /* @__PURE__ */ TimeZoneNamedString.pipe(/* @__PURE__ */ decodeTo2(TimeZoneNamed, timeZoneNamedFromString));
var TimeZoneString = /* @__PURE__ */ String6.annotate({
  expected: "a time zone string (IANA identifier or offset like +03:00)"
});
var TimeZone = /* @__PURE__ */ declare(isTimeZone2, {
  representation: {
    id: "effect/schema/TimeZone",
    payload: null
  },
  toCode: () => ({
    runtime: `Schema.TimeZone`,
    Type: `DateTime.TimeZone`,
    importDeclarations: [`import * as DateTime from "effect/DateTime"`]
  }),
  expected: "DateTime.TimeZone",
  toCodecArbitrary: () => linkDecoding()(timeZoneArbitrarySchema(), transform((value3) => typeof value3 === "number" ? zoneMakeOffset2(value3) : zoneMakeNamedUnsafe2(value3))),
  toCodecJson: () => link()(TimeZoneString, timeZoneFromString),
  toFormatter: () => (tz) => zoneToString2(tz)
});
var TimeZoneFromString = /* @__PURE__ */ TimeZoneString.pipe(/* @__PURE__ */ decodeTo2(TimeZone, timeZoneFromString));
var DateTimeZonedString = /* @__PURE__ */ String6.annotate({
  expected: "a zoned DateTime string (e.g. 2024-01-01T00:00:00.000+00:00[Europe/London])"
});
var DateTimeZoned = /* @__PURE__ */ declare((u) => isDateTime2(u) && isZoned2(u), {
  representation: {
    id: "effect/schema/DateTimeZoned",
    payload: null
  },
  toCode: () => ({
    runtime: `Schema.DateTimeZoned`,
    Type: `DateTime.Zoned`,
    importDeclarations: [`import * as DateTime from "effect/DateTime"`]
  }),
  expected: "DateTime.Zoned",
  toCodecArbitrary: ({
    constraint
  }) => {
    const [minimum, maximum] = dateTimeArbitraryBounds(constraint, arbitraryMinimumZonedDateTimeTimestamp, arbitraryMaximumZonedDateTimeTimestamp);
    return linkDecoding()(Struct({
      epochMilliseconds: dateTimeArbitraryInteger(minimum, maximum),
      timeZone: timeZoneArbitrarySchema()
    }), transform(({
      epochMilliseconds,
      timeZone
    }) => makeZonedUnsafe2(epochMilliseconds, {
      timeZone
    })));
  },
  toCodecJson: () => link()(DateTimeZonedString, dateTimeZonedFromString),
  toFormatter: () => (zoned) => formatIsoZoned2(zoned),
  toEquivalence: () => Equivalence4
});
var DateTimeZonedFromString = /* @__PURE__ */ DateTimeZonedString.pipe(/* @__PURE__ */ decodeTo2(DateTimeZoned, dateTimeZonedFromString));
var netAddressFromString = (declaration, parse, encode5, identifier2) => String6.pipe(decodeTo2(declaration, transformEffect2({
  decode: (input, options) => {
    const result3 = parse(input);
    return isSuccess2(result3) ? succeed6(result3.success) : fail5(new InvalidValue({
      message: result3.failure.message
    }, input, options));
  },
  encode: (value3) => succeed6(encode5(value3))
}))).annotate({
  identifier: identifier2
});
var MacAddress = /* @__PURE__ */ declare(isMacAddress, {
  identifier: "MacAddress"
});
var MacAddressFromString = /* @__PURE__ */ netAddressFromString(MacAddress, macAddressFromString, formatMacAddress, "MacAddressFromString");
var Ipv4Address = /* @__PURE__ */ declare(isIpv4Address, {
  identifier: "Ipv4Address"
});
var Ipv4AddressFromString = /* @__PURE__ */ netAddressFromString(Ipv4Address, ipv4FromString, formatIp, "Ipv4AddressFromString");
var Ipv6Address = /* @__PURE__ */ declare(isIpv6Address, {
  identifier: "Ipv6Address"
});
var Ipv6AddressFromString = /* @__PURE__ */ netAddressFromString(Ipv6Address, ipv6FromString, formatIp, "Ipv6AddressFromString");
var IpAddress = /* @__PURE__ */ declare(isIpAddress, {
  identifier: "IpAddress"
});
var IpAddressFromString = /* @__PURE__ */ netAddressFromString(IpAddress, ipFromString, formatIp, "IpAddressFromString");
var netAddressRefinement = (schema, guard, expected, identifier2) => refine(guard, {
  expected
})(schema).annotate({
  identifier: identifier2
});
var IpMulticastAddress = /* @__PURE__ */ netAddressRefinement(IpAddress, isMulticast, "a multicast address", "IpMulticastAddress");
var IpMulticastAddressFromString = /* @__PURE__ */ netAddressRefinement(IpAddressFromString, isMulticast, "a multicast address", "IpMulticastAddressFromString");
var MacMulticastAddress = /* @__PURE__ */ netAddressRefinement(MacAddress, isMulticast, "a multicast address", "MacMulticastAddress");
var MacMulticastAddressFromString = /* @__PURE__ */ netAddressRefinement(MacAddressFromString, isMulticast, "a multicast address", "MacMulticastAddressFromString");
var IpUnicastAddress = /* @__PURE__ */ netAddressRefinement(IpAddress, isUnicast, "a unicast address", "IpUnicastAddress");
var IpUnicastAddressFromString = /* @__PURE__ */ netAddressRefinement(IpAddressFromString, isUnicast, "a unicast address", "IpUnicastAddressFromString");
var MacUnicastAddress = /* @__PURE__ */ netAddressRefinement(MacAddress, isMacUnicast, "a unicast address", "MacUnicastAddress");
var MacUnicastAddressFromString = /* @__PURE__ */ netAddressRefinement(MacAddressFromString, isMacUnicast, "a unicast address", "MacUnicastAddressFromString");
var Ipv4BroadcastAddress = /* @__PURE__ */ netAddressRefinement(Ipv4Address, isBroadcast, "a broadcast address", "Ipv4BroadcastAddress");
var Ipv4BroadcastAddressFromString = /* @__PURE__ */ netAddressRefinement(Ipv4AddressFromString, isBroadcast, "a broadcast address", "Ipv4BroadcastAddressFromString");
var MacBroadcastAddress = /* @__PURE__ */ netAddressRefinement(MacAddress, isMacBroadcast, "a broadcast address", "MacBroadcastAddress");
var MacBroadcastAddressFromString = /* @__PURE__ */ netAddressRefinement(MacAddressFromString, isMacBroadcast, "a broadcast address", "MacBroadcastAddressFromString");
var IpLoopbackAddress = /* @__PURE__ */ netAddressRefinement(IpAddress, isLoopback, "a loopback address", "IpLoopbackAddress");
var IpLoopbackAddressFromString = /* @__PURE__ */ netAddressRefinement(IpAddressFromString, isLoopback, "a loopback address", "IpLoopbackAddressFromString");
var IpLinkLocalAddress = /* @__PURE__ */ netAddressRefinement(IpAddress, isLinkLocal, "a link-local address", "IpLinkLocalAddress");
var IpLinkLocalAddressFromString = /* @__PURE__ */ netAddressRefinement(IpAddressFromString, isLinkLocal, "a link-local address", "IpLinkLocalAddressFromString");
var IpUnspecifiedAddress = /* @__PURE__ */ netAddressRefinement(IpAddress, isUnspecified, "an unspecified address", "IpUnspecifiedAddress");
var IpUnspecifiedAddressFromString = /* @__PURE__ */ netAddressRefinement(IpAddressFromString, isUnspecified, "an unspecified address", "IpUnspecifiedAddressFromString");
var Ipv4PrivateAddress = /* @__PURE__ */ netAddressRefinement(Ipv4Address, isPrivate, "a private address", "Ipv4PrivateAddress");
var Ipv4PrivateAddressFromString = /* @__PURE__ */ netAddressRefinement(Ipv4AddressFromString, isPrivate, "a private address", "Ipv4PrivateAddressFromString");
var Ipv6UniqueLocalAddress = /* @__PURE__ */ netAddressRefinement(Ipv6Address, isUniqueLocal, "a unique-local address", "Ipv6UniqueLocalAddress");
var Ipv6UniqueLocalAddressFromString = /* @__PURE__ */ netAddressRefinement(Ipv6AddressFromString, isUniqueLocal, "a unique-local address", "Ipv6UniqueLocalAddressFromString");
var MacLocallyAdministeredAddress = /* @__PURE__ */ netAddressRefinement(MacAddress, isMacLocallyAdministered, "a locally administered address", "MacLocallyAdministeredAddress");
var MacLocallyAdministeredAddressFromString = /* @__PURE__ */ netAddressRefinement(MacAddressFromString, isMacLocallyAdministered, "a locally administered address", "MacLocallyAdministeredAddressFromString");
var MacUniversallyAdministeredAddress = /* @__PURE__ */ netAddressRefinement(MacAddress, isMacUniversallyAdministered, "a universally administered address", "MacUniversallyAdministeredAddress");
var MacUniversallyAdministeredAddressFromString = /* @__PURE__ */ netAddressRefinement(MacAddressFromString, isMacUniversallyAdministered, "a universally administered address", "MacUniversallyAdministeredAddressFromString");
var Ipv4Interface = /* @__PURE__ */ declare(isIpv4Interface, {
  identifier: "Ipv4Interface"
});
var Ipv4InterfaceFromString = /* @__PURE__ */ netAddressFromString(Ipv4Interface, ipv4FromString2, format5, "Ipv4InterfaceFromString");
var Ipv6Interface = /* @__PURE__ */ declare(isIpv6Interface, {
  identifier: "Ipv6Interface"
});
var Ipv6InterfaceFromString = /* @__PURE__ */ netAddressFromString(Ipv6Interface, ipv6FromString2, format5, "Ipv6InterfaceFromString");
var IpInterface = /* @__PURE__ */ declare(isIpInterface, {
  identifier: "IpInterface"
});
var IpInterfaceFromString = /* @__PURE__ */ netAddressFromString(IpInterface, fromString3, format5, "IpInterfaceFromString");
var Ipv4Network = /* @__PURE__ */ declare(isIpv4Network, {
  identifier: "Ipv4Network"
});
var Ipv4NetworkFromString = /* @__PURE__ */ netAddressFromString(Ipv4Network, ipv4FromString3, format6, "Ipv4NetworkFromString");
var Ipv6Network = /* @__PURE__ */ declare(isIpv6Network, {
  identifier: "Ipv6Network"
});
var Ipv6NetworkFromString = /* @__PURE__ */ netAddressFromString(Ipv6Network, ipv6FromString3, format6, "Ipv6NetworkFromString");
var IpNetwork = /* @__PURE__ */ declare(isIpNetwork, {
  identifier: "IpNetwork"
});
var IpNetworkFromString = /* @__PURE__ */ netAddressFromString(IpNetwork, fromString4, format6, "IpNetworkFromString");
var InetAddressV4 = /* @__PURE__ */ declare(isInetAddressV4, {
  identifier: "InetAddressV4"
});
var InetAddressV6 = /* @__PURE__ */ declare(isInetAddressV6, {
  identifier: "InetAddressV6"
});
var InetAddress = /* @__PURE__ */ declare(isInetAddress, {
  identifier: "InetAddress"
});
var InetAddressFromString = /* @__PURE__ */ netAddressFromString(InetAddress, inetAddressFromString, formatInet, "InetAddressFromString");
var UnixPathAddress = /* @__PURE__ */ declare(isUnixPathAddress, {
  identifier: "UnixPathAddress"
});
var UnixPathAddressFromString = /* @__PURE__ */ String6.pipe(decodeTo2(UnixPathAddress, transform2({
  decode: unixPathAddress,
  encode: (address) => address.path
}))).annotate({
  identifier: "UnixPathAddressFromString"
});
var SocketAddress = /* @__PURE__ */ declare(isSocketAddress, {
  identifier: "SocketAddress"
});
var DomainName = /* @__PURE__ */ String6.check(makeFilter2(isDomainName, {
  expected: "a normalized domain name"
})).pipe(brand("~effect/net/Host/DomainName")).annotate({
  identifier: "DomainName"
});
var DomainNameFromString = /* @__PURE__ */ netAddressFromString(DomainName, domainNameFromString, (name) => name, "DomainNameFromString");
var ScopedIpv6Literal = /* @__PURE__ */ String6.check(makeFilter2(isScopedIpv6Literal, {
  expected: "a canonical scoped IPv6 literal"
})).pipe(brand("~effect/net/NetAddress/ScopedIpv6Literal")).annotate({
  identifier: "ScopedIpv6Literal"
});
var ScopedIpv6LiteralFromString = /* @__PURE__ */ netAddressFromString(ScopedIpv6Literal, scopedIpv6LiteralFromString, (literal) => literal, "ScopedIpv6LiteralFromString");
var Host = /* @__PURE__ */ Union2([IpAddress, ScopedIpv6Literal, DomainName]).annotate({
  identifier: "Host"
});
var HostFromString = /* @__PURE__ */ Union2([IpAddressFromString, ScopedIpv6LiteralFromString, DomainNameFromString]).annotate({
  identifier: "HostFromString"
});
var HostPort = /* @__PURE__ */ declare(isHostPort, {
  identifier: "HostPort"
});
var HostPortFromString = /* @__PURE__ */ netAddressFromString(HostPort, hostPortFromString, formatHostPort, "HostPortFromString");
var Port = /* @__PURE__ */ Int.check(/* @__PURE__ */ isBetween2({
  minimum: 0,
  maximum: 65535
}, {
  expected: "a port number"
}));
var durationFromString = /* @__PURE__ */ transformEffect2({
  decode: (s, options) => match(fromInput(s), {
    onNone: () => fail5(new InvalidValue({
      expected: "a valid Duration string"
    }, s, options)),
    onSome: succeed6
  }),
  encode: (duration) => succeed6(globalThis.String(duration))
});
var durationFromNanos = /* @__PURE__ */ transformEffect2({
  decode: (i) => succeed6(nanos(i)),
  encode: (a, options) => match(toNanos(a), {
    onNone: () => fail5(new InvalidValue({
      expected: "a Duration representable as a bigint"
    }, a, options)),
    onSome: (nanos2) => succeed6(nanos2)
  })
});
var durationFromMillis = /* @__PURE__ */ transform2({
  decode: (i) => millis(i),
  encode: (a) => toMillis(a)
});
var Duration = /* @__PURE__ */ declare(isDuration, {
  representation: {
    id: "effect/schema/Duration",
    payload: null
  },
  toCode: () => ({
    runtime: `Schema.Duration`,
    Type: `Duration.Duration`,
    importDeclarations: [`import * as Duration from "effect/Duration"`]
  }),
  expected: "Duration",
  toCodecJson: () => link()(Union2([Struct({
    _tag: Literal2("Infinity")
  }), Struct({
    _tag: Literal2("NegativeInfinity")
  }), Struct({
    _tag: Literal2("Nanos"),
    value: BigInt6
  }), Struct({
    _tag: Literal2("Millis"),
    value: Int
  })]), transform2({
    decode: (e) => {
      switch (e._tag) {
        case "Infinity":
          return infinity;
        case "NegativeInfinity":
          return negativeInfinity;
        case "Nanos":
          return nanos(e.value);
        case "Millis":
          return millis(e.value);
      }
    },
    encode: (duration) => {
      switch (duration.value._tag) {
        case "Infinity":
          return {
            _tag: "Infinity"
          };
        case "NegativeInfinity":
          return {
            _tag: "NegativeInfinity"
          };
        case "Nanos":
          return {
            _tag: "Nanos",
            value: duration.value.nanos
          };
        case "Millis":
          return {
            _tag: "Millis",
            value: duration.value.millis
          };
      }
    }
  }))
});
var DurationString = /* @__PURE__ */ String6.annotate({
  expected: "a string that will be decoded as a Duration"
});
var DurationFromString = /* @__PURE__ */ DurationString.pipe(/* @__PURE__ */ decodeTo2(Duration, durationFromString));
var DurationFromNanos = /* @__PURE__ */ BigInt6.pipe(/* @__PURE__ */ decodeTo2(Duration, durationFromNanos));
var DurationFromMillis = /* @__PURE__ */ Number6.pipe(/* @__PURE__ */ decodeTo2(Duration, durationFromMillis));
var DnsRecordType = /* @__PURE__ */ Literals(recordTypes);
var dnsCanonicalAddress = (schema, parse) => String6.pipe(decodeTo2(schema, transformEffect2({
  decode: (input, options) => {
    const result3 = parse(input);
    if (isFailure2(result3)) {
      return fail5(new InvalidValue({
        message: result3.failure.message
      }, input, options));
    }
    return formatIp(result3.success) === input ? succeed6(result3.success) : fail5(new InvalidValue({
      message: "expected a canonical address"
    }, input, options));
  },
  encode: (address) => succeed6(formatIp(address))
})));
var dnsUint8 = /* @__PURE__ */ Int.check(/* @__PURE__ */ isBetween2({
  minimum: 0,
  maximum: 255
}));
var dnsUint16 = /* @__PURE__ */ Int.check(/* @__PURE__ */ isBetween2({
  minimum: 0,
  maximum: 65535
}));
var dnsUint32 = /* @__PURE__ */ Int.check(/* @__PURE__ */ isBetween2({
  minimum: 0,
  maximum: 4294967295
}));
var dnsSeconds = /* @__PURE__ */ dnsUint32.pipe(/* @__PURE__ */ decodeTo2(Duration, /* @__PURE__ */ transform2({
  decode: seconds,
  encode: toSeconds
})));
var dnsRecordOfType = (type, fields) => declare((u) => isDnsRecord(u) && u._tag === type, {
  identifier: `Dns${type.charAt(0)}${type.slice(1).toLowerCase()}Record`,
  toCodecJson: () => {
    const json = TaggedStruct(type, fields);
    return link()(json, transformEffect2({
      decode: (input, options) => {
        const {
          _tag,
          ...rest
        } = input;
        const result3 = makeRecord(type, rest);
        return isSuccess2(result3) ? succeed6(result3.success) : fail5(new InvalidValue({
          message: result3.failure.message
        }, input, options));
      },
      // Records hold only their tag and fields as own properties.
      encode: (record2) => succeed6({
        ...record2
      })
    }));
  }
});
var DnsARecord = /* @__PURE__ */ dnsRecordOfType("A", {
  address: /* @__PURE__ */ dnsCanonicalAddress(Ipv4Address, ipv4FromString)
});
var DnsAaaaRecord = /* @__PURE__ */ dnsRecordOfType("AAAA", {
  address: /* @__PURE__ */ dnsCanonicalAddress(Ipv6Address, ipv6FromString)
});
var DnsCaaRecord = /* @__PURE__ */ dnsRecordOfType("CAA", {
  critical: Boolean3,
  tag: /* @__PURE__ */ String6.check(/* @__PURE__ */ isPattern2(/^[a-z0-9]+$/i)),
  value: String6
});
var DnsCnameRecord = /* @__PURE__ */ dnsRecordOfType("CNAME", {
  target: DomainName
});
var DnsMxRecord = /* @__PURE__ */ dnsRecordOfType("MX", {
  exchange: DomainName,
  priority: dnsUint16
});
var DnsNaptrRecord = /* @__PURE__ */ dnsRecordOfType("NAPTR", {
  order: dnsUint16,
  preference: dnsUint16,
  flags: String6,
  service: String6,
  regexp: String6,
  replacement: DomainName
});
var DnsNsRecord = /* @__PURE__ */ dnsRecordOfType("NS", {
  host: DomainName
});
var DnsPtrRecord = /* @__PURE__ */ dnsRecordOfType("PTR", {
  host: NonEmptyString
});
var DnsSoaRecord = /* @__PURE__ */ dnsRecordOfType("SOA", {
  primary: DomainName,
  admin: NonEmptyString,
  serial: dnsUint32,
  refresh: dnsSeconds,
  retry: dnsSeconds,
  expire: dnsSeconds,
  minimum: dnsSeconds
});
var DnsSrvRecord = /* @__PURE__ */ dnsRecordOfType("SRV", {
  target: DomainName,
  port: dnsUint16,
  priority: dnsUint16,
  weight: dnsUint16
});
var DnsTlsaRecord = /* @__PURE__ */ dnsRecordOfType("TLSA", {
  certUsage: dnsUint8,
  selector: dnsUint8,
  matchingType: dnsUint8,
  data: Uint8ArrayFromHex
});
var DnsTxtRecord = /* @__PURE__ */ dnsRecordOfType("TXT", {
  chunks: /* @__PURE__ */ NonEmptyArray(String6)
});
var DnsRecord = /* @__PURE__ */ Union2([DnsARecord, DnsAaaaRecord, DnsCaaRecord, DnsCnameRecord, DnsMxRecord, DnsNaptrRecord, DnsNsRecord, DnsPtrRecord, DnsSoaRecord, DnsSrvRecord, DnsTlsaRecord, DnsTxtRecord]).annotate({
  identifier: "DnsRecord"
});
function Exit(value3, error, defect) {
  const schema = declareConstructor()([value3, error, defect], ([value4, error2, defect2]) => {
    const cause = Cause(error2, defect2);
    return (input, ast, options) => {
      if (!isExit2(input)) {
        return fail5(new InvalidType(ast, input, options));
      }
      switch (input._tag) {
        case "Success":
          return mapBothEager2(decodeUnknownEffect(value4)(input.value, options), {
            onSuccess: succeed4,
            onFailure: (issue) => makeCompositeAtKey(ast, "value", issue, input, options)
          });
        case "Failure":
          return mapBothEager2(decodeUnknownEffect(cause)(input.cause, options), {
            onSuccess: failCause2,
            onFailure: (issue) => makeCompositeAtKey(ast, "cause", issue, input, options)
          });
      }
    };
  }, {
    representation: {
      id: "effect/schema/Exit",
      payload: null
    },
    toCode: ({
      typeParameters
    }) => ({
      runtime: `Schema.Exit(${typeParameters[0].runtime}, ${typeParameters[1].runtime}, ${typeParameters[2].runtime})`,
      Type: `Exit.Exit<${typeParameters[0].Type}, ${typeParameters[1].Type}, ${typeParameters[2].Type}>`,
      importDeclarations: [`import * as Exit from "effect/Exit"`]
    }),
    expected: "Exit",
    toCodec: ([value4, error2, defect2]) => link()(Union2([Struct({
      _tag: Literal2("Success"),
      value: value4
    }), Struct({
      _tag: Literal2("Failure"),
      cause: Cause(error2, defect2)
    })]), transform2({
      decode: (e) => e._tag === "Success" ? succeed4(e.value) : failCause2(e.cause),
      encode: (exit4) => isSuccess4(exit4) ? {
        _tag: "Success",
        value: exit4.value
      } : {
        _tag: "Failure",
        cause: exit4.cause
      }
    }))
  });
  return make20(schema.ast, {
    value: value3,
    error,
    defect
  });
}
function graphEncodedSchema(type, node, edge) {
  return Struct({
    type: Literal2(type),
    nodes: ArraySchema(Struct({
      index: Natural,
      data: node
    })),
    edges: ArraySchema(Struct({
      index: Natural,
      source: Natural,
      target: Natural,
      data: edge
    }))
  });
}
function graphDecode(input, options) {
  let previous = -1;
  const indexes = /* @__PURE__ */ new Set();
  for (let i = 0; i < input.nodes.length; i++) {
    const index2 = input.nodes[i].index;
    if (index2 <= previous) {
      return fail5(new Pointer(["nodes", i, "index"], new InvalidValue({
        expected: "a strictly increasing node index"
      }, index2, options)));
    }
    previous = index2;
    indexes.add(index2);
  }
  previous = -1;
  for (let i = 0; i < input.edges.length; i++) {
    const edge = input.edges[i];
    if (edge.index <= previous) {
      return fail5(new Pointer(["edges", i, "index"], new InvalidValue({
        expected: "a strictly increasing edge index"
      }, edge.index, options)));
    }
    previous = edge.index;
    if (!indexes.has(edge.source)) {
      return fail5(new Pointer(["edges", i, "source"], new InvalidValue({
        expected: "an encoded node index"
      }, edge.source, options)));
    }
    if (!indexes.has(edge.target)) {
      return fail5(new Pointer(["edges", i, "target"], new InvalidValue({
        expected: "an encoded node index"
      }, edge.target, options)));
    }
  }
  return succeed6(hydrate(input));
}
function graphEncode(input, type, options) {
  if (!isGraph(input) || input.mutable || input.type !== type) {
    return fail5(new InvalidValue({
      expected: `an immutable ${type} Graph`
    }, input, options));
  }
  return succeed6(snapshot(input));
}
function graphToEquivalence(node, edge) {
  return (self, that) => {
    const a = snapshot(self);
    const b = snapshot(that);
    if (a.type !== b.type || a.nodes.length !== b.nodes.length || a.edges.length !== b.edges.length) return false;
    for (let i = 0; i < a.nodes.length; i++) {
      if (a.nodes[i].index !== b.nodes[i].index || !node(a.nodes[i].data, b.nodes[i].data)) return false;
    }
    for (let i = 0; i < a.edges.length; i++) {
      const ae = a.edges[i];
      const be = b.edges[i];
      const sameEndpoints = a.type === "directed" ? ae.source === be.source && ae.target === be.target : ae.source === be.source && ae.target === be.target || ae.source === be.target && ae.target === be.source;
      if (ae.index !== be.index || !sameEndpoints || !edge(ae.data, be.data)) return false;
    }
    return true;
  };
}
function graphToArbitrary(type, node, edge) {
  return linkDecoding()(Union2([Null2, Struct({
    nodes: NonEmptyArray(node),
    edges: ArraySchema(Tuple2([Natural, Natural, edge]))
  })]), transform((input) => {
    if (input === null) return hydrate({
      type,
      nodes: [],
      edges: []
    });
    const nodes = input.nodes.map((data, index2) => ({
      index: index2,
      data
    }));
    return hydrate({
      type,
      nodes,
      edges: input.edges.map(([source, target, data], index2) => ({
        index: index2,
        source: source % nodes.length,
        target: target % nodes.length,
        data
      }))
    });
  }));
}
function Graph(type, node, edge) {
  const schema = declareConstructor()([node, edge], ([node2, edge2]) => {
    const encoded = graphEncodedSchema(type, node2, edge2);
    return (input, ast, options) => {
      if (!isGraph(input) || input.mutable || input.type !== type) {
        return fail5(new InvalidType(ast, input, options));
      }
      return flatMap5(decodeUnknownEffect(encoded)(snapshot(input), options), (snapshot4) => graphDecode(snapshot4, options));
    };
  }, {
    representation: {
      id: "effect/schema/Graph",
      payload: type
    },
    toCode: ({
      typeParameters
    }) => ({
      runtime: `Schema.Graph(${format(type)}, ${typeParameters[0].runtime}, ${typeParameters[1].runtime})`,
      Type: `Graph.Graph<${typeParameters[0].Type}, ${typeParameters[1].Type}, ${format(type)}>`,
      importDeclarations: [`import * as Graph from "effect/Graph"`]
    }),
    expected: `an immutable ${type} Graph`,
    toCodec: ([node2, edge2]) => link()(graphEncodedSchema(type, node2, edge2), transformEffect2({
      decode: graphDecode,
      encode: (graph, options) => graphEncode(graph, type, options)
    })),
    toCodecArbitrary: ({
      typeParameters: [node2, edge2]
    }) => graphToArbitrary(type, node2, edge2),
    toEquivalence: ([node2, edge2]) => graphToEquivalence(node2, edge2)
  });
  return make20(schema.ast, {
    type,
    node,
    edge
  });
}
function hashMapLink(entries3) {
  return link()(entries3, transform2({
    decode: fromIterable4,
    encode: toEntries
  }));
}
function HashMap(key, value3) {
  const schema = declareConstructor()([key, value3], ([key2, value4]) => {
    const entries3 = ArraySchema(Tuple2([key2, value4]));
    return (input, ast, options) => {
      if (isHashMap2(input)) {
        return mapBothEager2(decodeUnknownEffect(entries3)(toEntries(input), options), {
          onSuccess: fromIterable4,
          onFailure: (issue) => makeCompositeAtKey(ast, "entries", issue, input, options)
        });
      }
      return fail5(new InvalidType(ast, input, options));
    };
  }, {
    representation: {
      id: "effect/schema/HashMap",
      payload: null
    },
    toCode: ({
      typeParameters
    }) => ({
      runtime: `Schema.HashMap(${typeParameters[0].runtime}, ${typeParameters[1].runtime})`,
      Type: `HashMap.HashMap<${typeParameters[0].Type}, ${typeParameters[1].Type}>`,
      importDeclarations: [`import * as HashMap from "effect/HashMap"`]
    }),
    expected: "HashMap",
    toCodec: ([key2, value4]) => hashMapLink(ArraySchema(Tuple2([key2, value4]))),
    toCodecArbitrary: ({
      constraint,
      typeParameters: [key2, value4]
    }) => hashMapLink(withArrayLengthConstraints(ArraySchema(Tuple2([key2, value4])).check(isUniqueKey()), constraint?.minSize, constraint?.maxSize)),
    toEquivalence: ([key2, value4]) => makeCompareMap(key2, value4)
  });
  return make20(schema.ast, {
    key,
    value: value3
  });
}
function hashSetLink(values2) {
  return link()(values2, transform2({
    decode: fromIterable6,
    encode: fromIterable
  }));
}
function HashSet(value3) {
  const schema = declareConstructor()([value3], ([value4]) => {
    const values2 = ArraySchema(value4);
    return (input, ast, options) => {
      if (isHashSet2(input)) {
        return mapBothEager2(decodeUnknownEffect(values2)(fromIterable(input), options), {
          onSuccess: fromIterable6,
          onFailure: (issue) => makeCompositeAtKey(ast, "values", issue, input, options)
        });
      }
      return fail5(new InvalidType(ast, input, options));
    };
  }, {
    representation: {
      id: "effect/schema/HashSet",
      payload: null
    },
    toCode: ({
      typeParameters
    }) => ({
      runtime: `Schema.HashSet(${typeParameters[0].runtime})`,
      Type: `HashSet.HashSet<${typeParameters[0].Type}>`
    }),
    expected: "HashSet",
    toCodec: ([value4]) => hashSetLink(ArraySchema(value4)),
    toCodecArbitrary: ({
      constraint,
      typeParameters: [value4]
    }) => hashSetLink(withArrayLengthConstraints(ArraySchema(value4).check(isUnique()), constraint?.minSize, constraint?.maxSize)),
    toEquivalence: ([value4]) => makeCompareSet(value4)
  });
  return make20(schema.ast, {
    value: value3
  });
}
function Option(value3) {
  const schema = declareConstructor()([value3], ([value4]) => (input, ast, options) => {
    if (isOption2(input)) {
      if (isNone2(input)) {
        return succeedNone3;
      }
      return mapBothEager2(decodeUnknownEffect(value4)(input.value, options), {
        onSuccess: some2,
        onFailure: (issue) => makeCompositeAtKey(ast, "value", issue, input, options)
      });
    }
    return fail5(new InvalidType(ast, input, options));
  }, {
    representation: {
      id: "effect/schema/Option",
      payload: null
    },
    toCode: ({
      typeParameters
    }) => ({
      runtime: `Schema.Option(${typeParameters[0].runtime})`,
      Type: `Option.Option<${typeParameters[0].Type}>`,
      importDeclarations: [`import * as Option from "effect/Option"`]
    }),
    expected: "Option",
    toCodec: ([value4]) => link()(Union2([Struct({
      _tag: Literal2("Some"),
      value: value4
    }), Struct({
      _tag: Literal2("None")
    })]), transform2({
      decode: (e) => e._tag === "None" ? none2() : some2(e.value),
      encode: (o) => isSome2(o) ? {
        _tag: "Some",
        value: o.value
      } : {
        _tag: "None"
      }
    }))
  });
  return make20(schema.ast, {
    value: value3
  });
}
function OptionFromNullOr(schema) {
  return NullOr(schema).pipe(decodeTo2(Option(toType2(schema)), optionFromNullOr()));
}
function OptionFromUndefinedOr(schema) {
  return UndefinedOr(schema).pipe(decodeTo2(Option(toType2(schema)), optionFromUndefinedOr()));
}
function OptionFromNullishOr(schema, options) {
  return NullishOr(schema).pipe(decodeTo2(Option(toType2(schema)), optionFromNullishOr(options)));
}
var Cookie = /* @__PURE__ */ declare(isCookie, {
  representation: {
    id: "effect/http/Cookie",
    payload: null
  },
  toCode: () => ({
    runtime: "Schema.Cookie",
    Type: "Cookies.Cookie",
    importDeclarations: [`import * as Cookies from "effect/http/Cookies"`]
  }),
  expected: "Cookie"
});
var Cookies = /* @__PURE__ */ declare(isCookies, {
  representation: {
    id: "effect/http/Cookies",
    payload: null
  },
  toCode: () => ({
    runtime: "Schema.Cookies",
    Type: "Cookies.Cookies",
    importDeclarations: [`import * as Cookies from "effect/http/Cookies"`]
  }),
  expected: "Cookies",
  toCodecJson: () => link()(ArraySchema(String6), transform2({
    decode: fromSetCookie,
    encode: toSetCookieHeaders
  })),
  toCodecIso: () => link()(Record(String6, Cookie), transform2({
    decode: fromReadonlyRecord,
    encode: (cookies) => cookies.cookies
  }))
});
var RecordFromCookies = /* @__PURE__ */ Cookies.pipe(/* @__PURE__ */ decodeTo2(/* @__PURE__ */ Record(String6, String6), /* @__PURE__ */ transform2({
  decode: toRecord,
  encode: (self) => fromIterable7(globalThis.Object.entries(self).map(([name, value3]) => makeCookieUnsafe(name, value3)))
})));
var Headers = /* @__PURE__ */ declare(isHeaders, {
  representation: {
    id: "effect/http/Headers",
    payload: null
  },
  toCode: () => ({
    runtime: "Schema.Headers",
    Type: "Headers.Headers",
    importDeclarations: [`import * as Headers from "effect/http/Headers"`]
  }),
  expected: "Headers",
  toEquivalence: () => Equivalence5,
  toCodec: () => link()(Record(String6, String6), transform2({
    decode: fromInput3,
    encode: (headers) => ({
      ...headers
    })
  }))
});
var UrlParams = /* @__PURE__ */ declare(isUrlParams, {
  representation: {
    id: "effect/http/UrlParams",
    payload: null
  },
  toCode: () => ({
    runtime: "Schema.UrlParams",
    Type: "UrlParams.UrlParams",
    importDeclarations: [`import * as UrlParams from "effect/http/UrlParams"`]
  }),
  expected: "UrlParams",
  toEquivalence: () => Equivalence6,
  toCodec: () => link()(ArraySchema(Tuple2([String6, String6])), transform2({
    decode: make13,
    encode: (self) => self.params.map(([key, value3]) => [key, unwrap2(value3)])
  }))
});
var JsonFromUrlParamsField = (field, options) => UrlParams.pipe(decodeTo2(fromJsonString2(Unknown2, options), transformEffect2({
  decode: (params) => match(getFirst(params, field), {
    onNone: () => fail5(new Pointer([field], new MissingKey(void 0))),
    onSome: succeed6
  }),
  encode: (value3) => succeed6(make13([[field, value3]]))
})));
var RecordFromUrlParams = /* @__PURE__ */ UrlParams.pipe(/* @__PURE__ */ decodeTo2(/* @__PURE__ */ Record(String6, /* @__PURE__ */ Union2([String6, /* @__PURE__ */ NonEmptyArray(String6)])), /* @__PURE__ */ transform2({
  decode: toReadonlyRecord,
  encode: fromInput4
})));
function OptionFromOptionalKey(schema) {
  return optionalKey2(schema).pipe(decodeTo2(Option(toType2(schema)), optionFromOptionalKey()));
}
function OptionFromOptional(schema) {
  return optional2(schema).pipe(decodeTo2(Option(toType2(schema)), optionFromOptional()));
}
function OptionFromOptionalNullOr(schema, options) {
  const onNoneEncoding = options === void 0 ? "omit" : options.onNoneEncoding;
  const noneValue = onNoneEncoding === null ? null : void 0;
  return optional2(NullOr(schema)).pipe(decodeTo2(Option(toType2(schema)), transformOptional2({
    decode: (oe) => oe.pipe(filter(isNotNullish), some2),
    encode: onNoneEncoding === "omit" ? flatten : (ot) => some2(getOrElse(flatten(ot), () => noneValue))
  })));
}
function Redacted(value3, options) {
  const label2 = typeof options?.label === "string" ? options.label : void 0;
  const disallowJsonEncode = options?.disallowJsonEncode === true;
  const normalizedOptions = label2 !== void 0 ? disallowJsonEncode ? {
    label: label2,
    disallowJsonEncode: true
  } : {
    label: label2
  } : disallowJsonEncode ? {
    disallowJsonEncode: true
  } : void 0;
  const decodeLabel = label2 !== void 0 ? decodeUnknownEffect(Literal2(label2)) : void 0;
  const schema = declareConstructor()([value3], ([value4]) => (input, ast, poptions) => {
    if (isRedacted(input)) {
      const label3 = decodeLabel !== void 0 ? mapErrorEager2(decodeLabel(input.label, poptions), (issue) => new Pointer(["label"], issue)) : void_4;
      return flatMapEager2(label3, () => mapBothEager2(decodeUnknownEffect(value4)(value2(input), poptions), {
        onSuccess: (value5) => make12(value5, {
          label: input.label
        }),
        onFailure: () => {
          return new Composite(ast, [new Pointer(["value"], new InvalidValue(void 0, input, poptions))], input, poptions);
        }
      }));
    }
    return fail5(new InvalidType(ast, input, poptions));
  }, {
    representation: {
      id: "effect/schema/Redacted",
      payload: normalizedOptions ?? null
    },
    toCode: ({
      typeParameters
    }) => ({
      runtime: normalizedOptions !== void 0 ? `Schema.Redacted(${typeParameters[0].runtime}, ${format(normalizedOptions)})` : `Schema.Redacted(${typeParameters[0].runtime})`,
      Type: `Redacted.Redacted<${typeParameters[0].Type}>`,
      importDeclarations: [`import * as Redacted from "effect/Redacted"`]
    }),
    expected: "Redacted",
    toCodecJson: ([value4]) => link()(value4, {
      decode: transform((e) => make12(e, {
        label: label2
      })),
      encode: disallowJsonEncode ? forbidden((oe) => "Cannot serialize Redacted" + (isSome2(oe) && typeof oe.value.label === "string" ? ` with label: "${oe.value.label}"` : "")) : transform(value2)
    }),
    toEquivalence: ([value4]) => makeEquivalence6(value4)
  });
  return make20(schema.ast, {
    value: value3
  });
}
function RedactedFromValue(value3, options) {
  return decodeTo2(Redacted(toType2(value3), {
    label: options?.label,
    disallowJsonEncode: options?.disallowEncode
  }), {
    decode: transform((t) => make12(t, {
      label: options?.label
    })),
    encode: options?.disallowEncode ? forbidden((oe) => "Cannot encode Redacted" + (isSome2(oe) && typeof oe.value.label === "string" ? ` with label: "${oe.value.label}"` : "")) : transform(value2)
  })(value3);
}
function Result(success, failure) {
  const schema = declareConstructor()([success, failure], ([success2, failure2]) => (input, ast, options) => {
    if (!isResult2(input)) {
      return fail5(new InvalidType(ast, input, options));
    }
    switch (input._tag) {
      case "Success":
        return mapBothEager2(decodeEffect(success2)(input.success, options), {
          onSuccess: succeed2,
          onFailure: (issue) => makeCompositeAtKey(ast, "success", issue, input, options)
        });
      case "Failure":
        return mapBothEager2(decodeEffect(failure2)(input.failure, options), {
          onSuccess: fail2,
          onFailure: (issue) => makeCompositeAtKey(ast, "failure", issue, input, options)
        });
    }
  }, {
    representation: {
      id: "effect/schema/Result",
      payload: null
    },
    toCode: ({
      typeParameters
    }) => ({
      runtime: `Schema.Result(${typeParameters[0].runtime}, ${typeParameters[1].runtime})`,
      Type: `Result.Result<${typeParameters[0].Type}, ${typeParameters[1].Type}>`,
      importDeclarations: [`import * as Result from "effect/Result"`]
    }),
    expected: "Result",
    toCodec: ([success2, failure2]) => link()(Union2([Struct({
      _tag: Literal2("Success"),
      success: success2
    }), Struct({
      _tag: Literal2("Failure"),
      failure: failure2
    })]), transform2({
      decode: (e) => e._tag === "Success" ? succeed2(e.success) : fail2(e.failure),
      encode: (r) => isSuccess2(r) ? {
        _tag: "Success",
        success: r.success
      } : {
        _tag: "Failure",
        failure: r.failure
      }
    }))
  });
  return make20(schema.ast, {
    success,
    failure
  });
}
var immerable = /* @__PURE__ */ globalThis.Symbol.for("immer-draftable");
var payloadToken = {};
function makeClass(Inherited, identifier2, struct2, annotations, proto) {
  const getClassSchema = getClassSchemaFactory(struct2, identifier2, annotations);
  const ClassTypeId = getClassTypeId(identifier2);
  const out = class extends Inherited {
    constructor(...[input, options]) {
      const internalOptions = options;
      const payload = internalOptions?.["~payload"];
      const value3 = payload?.token === payloadToken ? payload.value : struct2.make(input ?? {}, options);
      super(value3, {
        ...options,
        disableChecks: true,
        "~payload": {
          token: payloadToken,
          value: value3
        }
      });
    }
    static [TypeId29] = TypeId29;
    get [ClassTypeId]() {
      return ClassTypeId;
    }
    static [immerable] = true;
    static identifier = identifier2;
    static fields = struct2.fields;
    static get ast() {
      return getClassSchema(this).ast;
    }
    static pipe() {
      return pipeArguments(this, arguments);
    }
    static rebuild(ast) {
      return getClassSchema(this).rebuild(ast);
    }
    static make(input, options) {
      return make15(getClassSchema(this))(input ?? {}, options);
    }
    static makeOption(input, options) {
      return makeOption(getClassSchema(this))(input ?? {}, options);
    }
    static makeEffect(input, options) {
      return getClassSchema(this).makeEffect(input ?? {}, options);
    }
    static annotate(annotations2) {
      return this.rebuild(annotate(this.ast, annotations2));
    }
    static annotateKey(annotations2) {
      return this.rebuild(annotateKey(this.ast, annotations2));
    }
    static check(...checks) {
      return this.rebuild(appendChecks(this.ast, checks));
    }
    static extend(identifier3) {
      return (schema, annotations2) => {
        const extension = isStruct(schema) ? schema : Struct(schema);
        const fields = {
          ...struct2.fields,
          ...extension.fields
        };
        const ast = struct(fields, struct2.ast.checks, {
          identifier: identifier3
        });
        return makeClass(this, identifier3, makeStruct(appendChecks(ast, extension.ast.checks), fields), annotations2, proto);
      };
    }
    static mapFields(f, options) {
      return struct2.mapFields(f, options);
    }
  };
  if (proto !== void 0) {
    Object.assign(out.prototype, proto(identifier2));
  }
  return out;
}
function getClassTransformation(self) {
  return new Transformation(transform((input) => new self(input, {
    "~payload": {
      token: payloadToken,
      value: input
    }
  })), passthrough2());
}
function getClassTypeId(identifier2) {
  return `~effect/Schema/Class/${identifier2}`;
}
function getClassSchemaFactory(from, identifier2, annotations) {
  let memo;
  return (self) => {
    if (memo !== void 0) {
      return memo;
    }
    const ClassTypeId = getClassTypeId(identifier2);
    const isClassValue = (input) => input instanceof self || hasProperty(input, ClassTypeId);
    const transformation = getClassTransformation(self);
    const to = make20(new Declaration([from.ast], () => (input, ast, options) => {
      return isClassValue(input) ? succeed6(input) : fail5(new InvalidType(ast, input, options));
    }, {
      identifier: identifier2,
      [CONSTRUCTOR_ANNOTATION_KEY]: ([from2]) => ({
        isConstructed: isClassValue,
        link: new Link(from2, transformation)
      }),
      toCodec: ([from2]) => new Link(from2.ast, transformation),
      toEquivalence: ([from2]) => from2,
      toFormatter: ([from2]) => (t) => `${self.identifier}(${from2(t)})`,
      [SENTINELS_ANNOTATION_KEY]: collectSentinels(from.ast),
      ...annotations
    }));
    return memo = decodeTo2(to, transformation)(from);
  };
}
function isStruct(schema) {
  return isSchema(schema);
}
var Class4 = (identifier2) => (schema, annotations) => {
  const struct2 = isStruct(schema) ? schema : Struct(schema);
  return makeClass(Class3, identifier2, struct2, annotations, (identifier3) => ({
    toString() {
      return `${identifier3}(${format({
        ...this
      })})`;
    }
  }));
};
var TaggedClass2 = (identifier2) => {
  return (tagValue, schema, annotations) => {
    const struct2 = isStruct(schema) ? schema.mapFields((fields) => ({
      _tag: tag(tagValue),
      ...fields
    }), {
      unsafePreserveChecks: true
    }) : TaggedStruct(tagValue, schema);
    return Class4(identifier2 ?? tagValue)(struct2, annotations);
  };
};
var Error4 = (identifier2) => (schema, annotations) => {
  const struct2 = isStruct(schema) ? schema : Struct(schema);
  const self = makeClass(Error2, identifier2, struct2, annotations, (identifier3) => ({
    name: identifier3
  }));
  return self;
};
var TaggedError3 = (identifier2) => {
  return (tagValue, schema, annotations) => {
    const struct2 = isStruct(schema) ? schema.mapFields((fields) => ({
      _tag: tag(tagValue),
      ...fields
    }), {
      unsafePreserveChecks: true
    }) : TaggedStruct(tagValue, schema);
    return Error4(identifier2 ?? tagValue)(struct2, annotations);
  };
};
function overrideToFormatter(toFormatter3) {
  return (self) => self.annotate({
    toFormatter: toFormatter3
  });
}
function toFormatter2(schema, options) {
  return toFormatter(schema.ast, options);
}
function overrideToEquivalence(toEquivalence3) {
  return (self) => self.annotate({
    toEquivalence: toEquivalence3
  });
}
function toEquivalence2(schema) {
  return toEquivalence(schema.ast);
}
function toRepresentation2(schema, options) {
  return toRepresentation(schema.ast, options);
}
function toJsonSchemaDocument3(schema, options) {
  const document = toRepresentation(toCodecJsonAST(schema.ast), options);
  return toJsonSchemaDocument(document, options);
}
var toCodecJson2 = toCodecJson;
var toCodecIso2 = toCodecIso;
var toCodecStringTree2 = toCodecStringTree;
var toCodecArrayFromSingle2 = toCodecArrayFromSingle;
function toEncoderXml2(codec, options) {
  return toEncoderXml(codec, options);
}
function toIso2(schema) {
  return toIso(schema);
}
function toIsoSource2(schema) {
  return toIsoSource(schema);
}
function toIsoFocus2(schema) {
  return toIsoFocus(schema);
}
function overrideToCodecIso(to, transformation) {
  return (schema) => {
    return make20(annotate(schema.ast, {
      toCodecIso: () => new Link(to.ast, makeTransformation(transformation))
    }), {
      schema
    });
  };
}
function toDifferJsonPatch2(schema) {
  return toDifferJsonPatch(schema);
}
function Tree(node) {
  const Tree$ref = suspend4(() => Tree2);
  const Tree2 = Union2([node, ArraySchema(Tree$ref), Record(String6, Tree$ref)]);
  return Tree2;
}
var Json2 = /* @__PURE__ */ make20(/* @__PURE__ */ annotate(Json, {
  toCode: () => ({
    runtime: "Schema.Json",
    Type: "Schema.Json"
  })
}));
var JsonObject = /* @__PURE__ */ Record(String6, Json2);
var JsonError = /* @__PURE__ */ Struct({
  message: String6,
  name: /* @__PURE__ */ optionalKey2(String6),
  stack: /* @__PURE__ */ optionalKey2(String6),
  cause: /* @__PURE__ */ optionalKey2(Json2)
});
var MutableJson2 = /* @__PURE__ */ make20(/* @__PURE__ */ annotate(MutableJson, {
  toCode: () => ({
    runtime: "Schema.MutableJson",
    Type: "Schema.MutableJson"
  })
}));
function resolveAnnotations(schema) {
  return resolve(schema.ast);
}
function resolveAnnotationsKey(schema) {
  return schema.ast.context?.annotations;
}

// node_modules/effect/dist/MutableList.js
var Empty = /* @__PURE__ */ Symbol.for("effect/MutableList/Empty");
var make21 = () => ({
  head: void 0,
  tail: void 0,
  length: 0
});
var compactHead = (self) => {
  const head3 = self.head;
  if (head3.offset >= 1024 && head3 === self.tail && head3.mutable && (head3.array.length - head3.offset) * 8 <= head3.offset) {
    self.head = self.tail = {
      array: head3.array.slice(head3.offset),
      mutable: true,
      offset: 0,
      next: void 0
    };
  }
};
var emptyBucket = () => ({
  array: [],
  mutable: true,
  offset: 0,
  next: void 0
});
var append2 = (self, message) => {
  if (!self.tail) {
    self.head = self.tail = emptyBucket();
  } else if (!self.tail.mutable) {
    self.tail.next = emptyBucket();
    self.tail = self.tail.next;
  }
  self.tail.array.push(message);
  self.length++;
};
var appendAll2 = (self, messages) => appendAllUnsafe(self, fromIterable(messages), !Array.isArray(messages));
var appendAllUnsafe = (self, messages, mutable3 = false) => {
  if (messages.length === 0) {
    return 0;
  }
  const chunk = {
    array: messages,
    mutable: mutable3,
    offset: 0,
    next: void 0
  };
  if (self.head) {
    self.tail = self.tail.next = chunk;
  } else {
    self.head = self.tail = chunk;
  }
  self.length += messages.length;
  return messages.length;
};
var clear = (self) => {
  self.head = self.tail = void 0;
  self.length = 0;
};
var takeN = (self, n) => {
  n = normalize(n);
  if (n <= 0 || !self.head) return [];
  n = Math.min(n, self.length);
  if (n === self.length && self.head?.offset === 0 && !self.head.next) {
    const array3 = self.head.array;
    clear(self);
    return array3;
  }
  const array2 = new Array(n);
  let index2 = 0;
  let chunk = self.head;
  while (chunk) {
    while (chunk.offset < chunk.array.length) {
      array2[index2++] = chunk.array[chunk.offset];
      if (chunk.mutable) chunk.array[chunk.offset] = void 0;
      chunk.offset++;
      if (index2 === n) {
        self.head = chunk.offset === chunk.array.length && chunk.next ? chunk.next : chunk;
        self.length -= n;
        if (self.length === 0) clear(self);
        else compactHead(self);
        return array2;
      }
    }
    chunk = chunk.next;
  }
  clear(self);
  return array2;
};
var takeAll = (self) => takeN(self, self.length);
var take = (self) => {
  if (!self.head) return Empty;
  const message = self.head.array[self.head.offset];
  if (self.head.mutable) self.head.array[self.head.offset] = void 0;
  self.head.offset++;
  self.length--;
  if (self.head.offset === self.head.array.length) {
    if (self.head.next) {
      self.head = self.head.next;
    } else {
      clear(self);
    }
  } else {
    compactHead(self);
  }
  return message;
};

// node_modules/effect/dist/Queue.js
var Queue_exports = {};
__export(Queue_exports, {
  asDequeue: () => asDequeue,
  asEnqueue: () => asEnqueue,
  await: () => await_,
  bounded: () => bounded,
  clear: () => clear2,
  collect: () => collect,
  dropping: () => dropping,
  end: () => end,
  endUnsafe: () => endUnsafe,
  fail: () => fail7,
  failCause: () => failCause4,
  failCauseUnsafe: () => failCauseUnsafe,
  flush: () => flush,
  flushUnsafe: () => flushUnsafe,
  interrupt: () => interrupt3,
  into: () => into,
  isDequeue: () => isDequeue,
  isEnqueue: () => isEnqueue,
  isFull: () => isFull,
  isFullUnsafe: () => isFullUnsafe,
  isQueue: () => isQueue,
  make: () => make22,
  offer: () => offer,
  offerAll: () => offerAll,
  offerAllUnsafe: () => offerAllUnsafe,
  offerUnsafe: () => offerUnsafe,
  peek: () => peek,
  poll: () => poll,
  shutdown: () => shutdown,
  shutdownUnsafe: () => shutdownUnsafe,
  size: () => size6,
  sizeUnsafe: () => sizeUnsafe,
  sliding: () => sliding,
  take: () => take2,
  takeAll: () => takeAll2,
  takeBetween: () => takeBetween,
  takeN: () => takeN2,
  takeUnsafe: () => takeUnsafe,
  unbounded: () => unbounded
});
var TypeId30 = "~effect/Queue";
var EnqueueTypeId = "~effect/Queue/Enqueue";
var DequeueTypeId = "~effect/Queue/Dequeue";
var isQueue = (u) => hasProperty(u, TypeId30);
var isEnqueue = (u) => hasProperty(u, EnqueueTypeId);
var isDequeue = (u) => hasProperty(u, DequeueTypeId);
var asEnqueue = (self) => self;
var asDequeue = identity;
var variance = {
  _A: identity,
  _E: identity
};
var QueueProto = {
  [TypeId30]: variance,
  [EnqueueTypeId]: variance,
  [DequeueTypeId]: variance,
  ...PipeInspectableProto,
  toJSON() {
    return {
      _id: "effect/Queue",
      state: this.state._tag,
      size: sizeUnsafe(this)
    };
  }
};
var make22 = (options) => withFiber((fiber3) => {
  const self = Object.create(QueueProto);
  self.dispatcher = fiber3.currentDispatcher;
  self.capacity = options?.capacity ?? Number.POSITIVE_INFINITY;
  self.strategy = options?.strategy ?? "suspend";
  self.messages = make21();
  self.scheduleRunning = false;
  self.state = {
    _tag: "Open",
    takers: /* @__PURE__ */ new Set(),
    offers: /* @__PURE__ */ new Set(),
    awaiters: /* @__PURE__ */ new Set()
  };
  return succeed3(self);
});
var bounded = (capacity) => make22({
  capacity
});
var sliding = (capacity) => make22({
  capacity,
  strategy: "sliding"
});
var dropping = (capacity) => make22({
  capacity,
  strategy: "dropping"
});
var unbounded = () => make22();
var offer = /* @__PURE__ */ dual(2, (self, message) => suspend(() => offerUnsafe(self, message) ? exitTrue : self.state._tag === "Open" && self.strategy === "suspend" ? offerOrWait(self, message) : exitFalse));
var offerUnsafe = (self, message) => {
  if (self.state._tag !== "Open") {
    return false;
  } else if (self.messages.length >= self.capacity) {
    if (self.strategy === "sliding") {
      take(self.messages);
      append2(self.messages, message);
      return true;
    } else if (self.capacity <= 0 && self.state.takers.size > 0) {
      append2(self.messages, message);
      releaseTakers(self);
      return true;
    }
    return false;
  }
  append2(self.messages, message);
  scheduleReleaseTaker(self);
  return true;
};
var offerAll = /* @__PURE__ */ dual(2, (self, messages) => (
  // Admitting what fits and registering the rest are one step, so no take can
  // free capacity between them
  callback((resume) => {
    const remaining = offerAllUnsafe(self, messages);
    if (remaining.length === 0 || self.strategy === "dropping") {
      return resume(exitSucceed(remaining));
    }
    return waitToOffer(self, {
      _tag: "Array",
      remaining,
      offset: 0,
      resume
    });
  })
));
var offerAllUnsafe = (self, messages) => {
  if (self.state._tag !== "Open") {
    return fromIterable(messages);
  } else if (self.capacity === Number.POSITIVE_INFINITY || self.strategy === "sliding") {
    appendAll2(self.messages, messages);
    if (self.strategy === "sliding") {
      takeN(self.messages, self.messages.length - self.capacity);
    }
    scheduleReleaseTaker(self);
    return [];
  }
  const free = self.capacity <= 0 ? self.state.takers.size : self.capacity - self.messages.length;
  if (free === 0) {
    return fromIterable(messages);
  }
  const remaining = [];
  let i = 0;
  for (const message of messages) {
    if (i < free) {
      append2(self.messages, message);
    } else {
      remaining.push(message);
    }
    i++;
  }
  scheduleReleaseTaker(self);
  return remaining;
};
var fail7 = /* @__PURE__ */ dual(2, (self, error) => failCause4(self, causeFail(error)));
var failCause4 = /* @__PURE__ */ dual(2, (self, cause) => sync(() => failCauseUnsafe(self, cause)));
var failCauseUnsafe = (self, cause) => {
  if (self.state._tag !== "Open") {
    return false;
  }
  const exit4 = exitFailCause(cause);
  const fail9 = exitZipRight(exit4, exitFailDone);
  if (self.state.offers.size === 0 && self.messages.length === 0) {
    finalize(self, fail9);
    return true;
  }
  self.state = {
    ...self.state,
    _tag: "Closing",
    exit: fail9
  };
  scheduleReleaseTaker(self);
  return true;
};
var end = (self) => failCause4(self, causeFail(Done()));
var endUnsafe = (self) => failCauseUnsafe(self, causeFail(Done()));
var interrupt3 = (self) => withFiber((fiber3) => failCause4(self, causeInterrupt(fiber3.id)));
var shutdown = (self) => sync(() => shutdownUnsafe(self));
var shutdownUnsafe = (self) => {
  if (self.state._tag === "Done") {
    return false;
  }
  clear(self.messages);
  const offers = self.state.offers;
  finalize(self, self.state._tag === "Open" ? exitInterrupt2 : self.state.exit);
  for (const entry of offers) {
    resumeUnoffered(entry);
  }
  return true;
};
var clear2 = (self) => suspendTake(() => {
  if (self.state._tag === "Done") {
    return catchDone(self.state.exit, () => succeed3([]));
  }
  const messages = takeAllUnsafe(self);
  releaseCapacity(self);
  return succeed3(messages);
});
var takeAll2 = (self) => takeBetween(self, 1, Number.POSITIVE_INFINITY);
var collect = (self) => suspend(() => {
  const out = empty2();
  return as(catchDone(whileLoop({
    while: constTrue,
    body: constant(takeAll2(self)),
    step(items) {
      for (let i = 0; i < items.length; i++) {
        out.push(items[i]);
      }
    }
  }), () => void_2), out);
});
var takeN2 = /* @__PURE__ */ dual(2, (self, n) => takeBetween(self, n, n));
var takeBetween = /* @__PURE__ */ dual(3, (self, min5, max5) => {
  min5 = normalize(min5);
  max5 = normalize(max5);
  return suspendTake(() => takeBetweenUnsafe(self, min5, max5) ?? andThen2(awaitTake(self, () => canTake(self, min5)), takeBetween(self, min5, max5)));
});
var take2 = (self) => suspendTake(() => takeUnsafe(self) ?? andThen2(awaitTake(self, () => canTake(self, 1)), take2(self)));
var poll = (self) => suspendTake(() => {
  const result3 = takeUnsafe(self);
  if (result3 === void 0) {
    return succeed3(none2());
  }
  if (result3._tag === "Success") {
    return succeed3(some2(result3.value));
  }
  return succeed3(none2());
});
var peek = (self) => suspend(() => {
  if (self.state._tag === "Done") {
    return self.state.exit;
  }
  if (self.messages.length > 0 && self.messages.head) {
    return succeed3(self.messages.head.array[self.messages.head.offset]);
  }
  return andThen2(awaitTake(self, () => self.messages.length > 0), peek(self));
});
var takeUnsafe = (self) => {
  if (self.state._tag === "Done") {
    return self.state.exit;
  }
  if (self.messages.length > 0) {
    const message = take(self.messages);
    releaseCapacity(self);
    return exitSucceed(message);
  } else if (self.capacity <= 0 && self.state.offers.size > 0) {
    const message = takeOfferUnsafe(self.state.offers);
    releaseCapacity(self);
    return exitSucceed(message);
  }
  return void 0;
};
var flushUnsafe = (self) => releaseTakers(self);
var flush = (self) => sync(() => flushUnsafe(self));
var await_ = (self) => callback((resume) => {
  const awaiter = (effect2) => resume(catchDone(effect2, () => exitVoid));
  if (self.state._tag === "Done") {
    return awaiter(self.state.exit);
  }
  self.state.awaiters.add(awaiter);
  return sync(() => {
    if (self.state._tag !== "Done") {
      self.state.awaiters.delete(awaiter);
    }
  });
});
var size6 = (self) => sync(() => sizeUnsafe(self));
var isFull = (self) => sync(() => isFullUnsafe(self));
var sizeUnsafe = (self) => self.state._tag === "Done" ? 0 : self.messages.length;
var isFullUnsafe = (self) => sizeUnsafe(self) === self.capacity;
var into = /* @__PURE__ */ dual(2, (effect2, self) => uninterruptibleMask((restore) => matchCauseEffect(restore(effect2), {
  onFailure: (cause) => failCause4(self, cause),
  onSuccess: (_) => end(self)
})));
var exitFalse = /* @__PURE__ */ exitSucceed(false);
var exitTrue = /* @__PURE__ */ exitSucceed(true);
var exitFailDone = /* @__PURE__ */ exitFail(/* @__PURE__ */ Done());
var exitInterrupt2 = /* @__PURE__ */ exitInterrupt();
var releaseTakers = (self) => {
  if (self.state._tag === "Done" || self.state.takers.size === 0) {
    return;
  }
  for (const taker of self.state.takers) {
    if (!taker.ready()) continue;
    self.state.takers.delete(taker);
    taker.resume(exitVoid);
    if (self.messages.length === 0) {
      break;
    }
  }
};
var scheduleReleaseTaker = (self) => {
  if (self.scheduleRunning || self.state._tag === "Done" || self.state.takers.size === 0) {
    return;
  }
  self.scheduleRunning = true;
  self.dispatcher.scheduleTask(() => {
    self.scheduleRunning = false;
    releaseTakers(self);
  }, 0);
};
var takeBetweenUnsafe = (self, min5, max5) => {
  if (self.state._tag === "Done") {
    return self.state.exit;
  } else if (max5 <= 0 || min5 <= 0) {
    return exitSucceed([]);
  } else if (!canTake(self, min5)) {
    return void 0;
  }
  const messages = self.messages.length > 0 ? takeN(self.messages, max5) : [takeOfferUnsafe(self.state.offers)];
  releaseCapacity(self);
  return exitSucceed(messages);
};
var suspendTake = /* @__PURE__ */ makePrimitive({
  op: "QueueTake",
  [evaluate](fiber3) {
    const effect2 = this[args]();
    return isExit(effect2) ? effect2[evaluate](fiber3) : effect2;
  }
});
var canTake = (self, min5) => self.messages.length >= (self.state._tag === "Closing" ? 1 : Math.min(min5, self.capacity || 1)) || self.capacity <= 0 && self.state._tag !== "Done" && self.state.offers.size > 0;
var awaitTake = (self, ready) => callback((resume) => {
  if (self.state._tag === "Done") return resume(self.state.exit);
  if (ready()) return resume(exitVoid);
  const taker = {
    ready,
    resume
  };
  self.state.takers.add(taker);
  return sync(() => {
    if (self.state._tag !== "Done") self.state.takers.delete(taker);
  });
});
var offerOrWait = (self, message) => callback((resume) => offerUnsafe(self, message) ? resume(exitTrue) : waitToOffer(self, {
  _tag: "Single",
  message,
  resume
}));
var waitToOffer = (self, entry) => {
  if (self.state._tag !== "Open") return resumeUnoffered(entry);
  const offers = self.state.offers;
  offers.add(entry);
  return sync(() => {
    if (self.state._tag === "Done") return;
    offers.delete(entry);
    if (self.state._tag === "Closing" && offers.size === 0 && self.messages.length === 0) {
      finalize(self, self.state.exit);
    }
  });
};
var resumeUnoffered = (entry) => entry._tag === "Single" ? entry.resume(exitFalse) : entry.resume(exitSucceed(entry.remaining.slice(entry.offset)));
var takeOfferUnsafe = (offers) => {
  const entry = offers.values().next().value;
  if (entry._tag === "Single") {
    offers.delete(entry);
    entry.resume(exitTrue);
    return entry.message;
  }
  const message = entry.remaining[entry.offset++];
  if (entry.offset === entry.remaining.length) {
    offers.delete(entry);
    entry.resume(exitSucceed([]));
  }
  return message;
};
var releaseCapacity = (self) => {
  if (self.state._tag === "Done") {
    return isDoneCause(self.state.exit.cause);
  } else if (self.state.offers.size === 0) {
    if (self.state._tag === "Closing" && self.messages.length === 0) {
      finalize(self, self.state.exit);
      return isDoneCause(self.state.exit.cause);
    }
    return false;
  }
  for (const entry of self.state.offers) {
    let n = self.capacity - self.messages.length;
    if (n <= 0) break;
    else if (entry._tag === "Single") {
      append2(self.messages, entry.message);
      self.state.offers.delete(entry);
      entry.resume(exitTrue);
    } else {
      for (; entry.offset < entry.remaining.length; entry.offset++) {
        if (n === 0) return false;
        append2(self.messages, entry.remaining[entry.offset]);
        n--;
      }
      self.state.offers.delete(entry);
      entry.resume(exitSucceed([]));
    }
    const state = self.state;
    if (state._tag === "Done") {
      return isDoneCause(state.exit.cause);
    }
  }
  return false;
};
var takeAllUnsafe = (self) => {
  if (self.messages.length > 0) {
    const messages = takeAll(self.messages);
    releaseCapacity(self);
    return messages;
  } else if (self.state._tag !== "Done" && self.state.offers.size > 0) {
    const messages = [takeOfferUnsafe(self.state.offers)];
    releaseCapacity(self);
    return messages;
  }
  return [];
};
var finalize = (self, exit4) => {
  if (self.state._tag === "Done") {
    return;
  }
  const openState = self.state;
  self.state = {
    _tag: "Done",
    exit: exit4
  };
  for (const taker of openState.takers) {
    taker.resume(exit4);
  }
  openState.takers.clear();
  for (const awaiter of openState.awaiters) {
    awaiter(exit4);
  }
  openState.awaiters.clear();
};

// node_modules/effect/dist/Semaphore.js
var Semaphore_exports = {};
__export(Semaphore_exports, {
  make: () => make23,
  makeUnsafe: () => makeUnsafe7,
  release: () => release,
  releaseAll: () => releaseAll,
  resize: () => resize,
  take: () => take3,
  takeIfAvailable: () => takeIfAvailable,
  withPermit: () => withPermit,
  withPermits: () => withPermits,
  withPermitsIfAvailable: () => withPermitsIfAvailable
});
var makeUnsafe7 = (permits) => new SemaphoreImpl(permits);
var waitForPermits = (self, n, effect2) => callback((resume) => {
  if (self.free >= n) return resume(effect2);
  const observer = () => {
    if (self.free < n) return;
    self.waiters.delete(observer);
    resume(effect2);
  };
  self.waiters.add(observer);
  return sync(() => {
    self.waiters.delete(observer);
  });
});
var SemaphoreImpl = class {
  waiters = /* @__PURE__ */ new Set();
  taken = 0;
  permits;
  constructor(permits) {
    this.permits = permits;
  }
  get free() {
    return this.permits - this.taken;
  }
  take(n) {
    const take4 = suspend(() => {
      if (this.free < n) {
        return waitForPermits(this, n, take4);
      }
      this.taken += n;
      return succeed3(n);
    });
    return take4;
  }
  takeIfAvailable(n) {
    return suspend(() => {
      if (this.free < n) return succeed3(false);
      this.taken += n;
      return succeed3(true);
    });
  }
  releaseUnsafe(fiber3, n) {
    this.taken -= n;
    if (this.waiters.size > 0) {
      fiber3.currentDispatcher.scheduleTask(() => {
        for (const observer of this.waiters) {
          if (this.free <= 0) break;
          observer();
        }
      }, 0);
    }
    return this.free;
  }
  resize(permits) {
    return withFiber((fiber3) => {
      this.permits = permits;
      if (this.free < 0) return void_2;
      this.releaseUnsafe(fiber3, 0);
      return void_2;
    });
  }
  release(n) {
    return withFiber((fiber3) => succeed3(this.releaseUnsafe(fiber3, n)));
  }
  get releaseAll() {
    return withFiber((fiber3) => succeed3(this.releaseUnsafe(fiber3, this.taken)));
  }
  withPermits(n) {
    return (self) => uninterruptibleMask((restore) => {
      const acquire = suspend(() => {
        if (this.free < n) {
          const wait = waitForPermits(this, n, void_2);
          return flatMap3(restore(wait), () => acquire);
        }
        this.taken += n;
        return onExitPrimitive(restore(self), () => {
          this.releaseUnsafe(getCurrentFiber(), n);
          return void 0;
        }, true);
      });
      return acquire;
    });
  }
  withPermit = /* @__PURE__ */ this.withPermits(1);
  withPermitsIfAvailable(n) {
    return (self) => uninterruptibleMask((restore) => {
      if (this.free < n) return succeedNone2;
      this.taken += n;
      return onExitPrimitive(restore(asSome(self)), () => {
        this.releaseUnsafe(getCurrentFiber(), n);
        return void 0;
      }, true);
    });
  }
};
var make23 = (permits) => sync(() => new SemaphoreImpl(permits));
var resize = /* @__PURE__ */ dual(2, (self, permits) => self.resize(permits));
var withPermits = (self, permits, effect2) => {
  const withPermits2 = self.withPermits(permits);
  return effect2 ? withPermits2(effect2) : withPermits2;
};
var withPermit = (self, effect2) => {
  if (!effect2) return self.withPermit;
  return self.withPermit(effect2);
};
var withPermitsIfAvailable = (self, permits, effect2) => {
  const withPermits2 = self.withPermitsIfAvailable(permits);
  return effect2 ? withPermits2(effect2) : withPermits2;
};
var take3 = /* @__PURE__ */ dual(2, (self, permits) => self.take(permits));
var takeIfAvailable = /* @__PURE__ */ dual(2, (self, permits) => self.takeIfAvailable(permits));
var release = /* @__PURE__ */ dual(2, (self, permits) => self.release(permits));
var releaseAll = (self) => self.releaseAll;

// src/cards.ts
import { readFileSync } from "node:fs";

// src/errors.ts
var Next = Schema_exports.Struct({ run: Schema_exports.String, why: Schema_exports.String }).annotate({ identifier: "Next" });
var quote2 = (s) => /^[\w@%+=:,./-]+$/.test(s) ? s : `'${s.replaceAll("'", `'\\''`)}'`;
var Id = Schema_exports.Int;
var Hold = Schema_exports.Struct({ code: Schema_exports.String, message: Schema_exports.String, context: Schema_exports.Record(Schema_exports.String, Schema_exports.Unknown) });
var ERRORS = {
  usage: {
    means: "The command line is wrong: an unknown command or option, missing input, or a <placeholder> left unfilled. `mw` prints every command with its input schema.",
    context: Schema_exports.Struct({ command: Schema_exports.NullOr(Schema_exports.String) })
  },
  source_unreadable: { means: "The file named by --source-file cannot be read.", context: Schema_exports.Struct({ path: Schema_exports.String }) },
  workspace_missing: { means: "The workspace directory does not exist.", context: Schema_exports.Struct({ workspace: Schema_exports.String }) },
  project_not_found: {
    means: "The workspace is not a registered project; `mw init` registers it with its ship command.",
    context: Schema_exports.Struct({ workspace: Schema_exports.String, projects: Schema_exports.Array(Schema_exports.String) })
  },
  projects_invalid: { means: "The project registry in Made Well's home is not valid.", context: Schema_exports.Struct({ path: Schema_exports.String, problems: Schema_exports.String }) },
  item_not_found: { means: "No work item has this number.", context: Schema_exports.Struct({ id: Id }) },
  not_held: { means: "The item is not waiting on the operator, so there is nothing to answer or retry.", context: Schema_exports.Struct({ id: Id, status: Schema_exports.String, job: Schema_exports.String }) },
  not_answerable: { means: "The item holds on something an answer does not resolve; `next` names what does.", context: Schema_exports.Struct({ id: Id, hold: Hold }) },
  cause_required: { means: "The item holds on a failed check; the answer must name its cause with --cause.", context: Schema_exports.Struct({ id: Id, hold: Hold }) },
  answer_required: { means: "The item waits on the operator's answer, not a retry.", context: Schema_exports.Struct({ id: Id, hold: Hold }) },
  not_discovered: { means: "The item is not a finished discovery run, so it has no candidates to promote.", context: Schema_exports.Struct({ id: Id, status: Schema_exports.String, job: Schema_exports.String }) },
  not_a_candidate: {
    means: "Some named items are not candidates of this discovery run.",
    context: Schema_exports.Struct({ discovery: Id, unknown: Schema_exports.Array(Id), candidates: Schema_exports.Array(Schema_exports.Struct({ id: Id, title: Schema_exports.String })) })
  },
  store_locked: {
    means: "Another live runner is delivering from this store; queued work reaches it by itself.",
    context: Schema_exports.Struct({
      store: Schema_exports.String,
      owner: Schema_exports.Struct({ pid: Schema_exports.Int, since: Schema_exports.String, item: Schema_exports.NullOr(Schema_exports.Struct({ id: Id, title: Schema_exports.String, job: Schema_exports.String, status: Schema_exports.String })) })
    })
  },
  prescriptions_unreadable: { means: "The prescriptions file cannot be read.", context: Schema_exports.Struct({ path: Schema_exports.String, reason: Schema_exports.String }) },
  prescriptions_invalid: {
    means: "The prescriptions file is not valid JSON, does not match its shape, or names an undefined tier.",
    context: Schema_exports.Struct({
      path: Schema_exports.String,
      reason: Schema_exports.optionalKey(Schema_exports.String),
      problems: Schema_exports.optionalKey(Schema_exports.String),
      job: Schema_exports.optionalKey(Schema_exports.String),
      tier: Schema_exports.optionalKey(Schema_exports.String),
      tiers: Schema_exports.optionalKey(Schema_exports.Array(Schema_exports.String)),
      card: Schema_exports.optionalKey(Schema_exports.Unknown),
      harnesses: Schema_exports.optionalKey(Schema_exports.Array(Schema_exports.String))
    })
  },
  eval_card_invalid: {
    means: "The --card of `mw eval` is neither a tier in prescriptions nor a card as JSON {harness, provider, account, model, effort} on a known harness.",
    context: Schema_exports.Struct({ card: Schema_exports.String, tiers: Schema_exports.Array(Schema_exports.String), harnesses: Schema_exports.Array(Schema_exports.String), problems: Schema_exports.optionalKey(Schema_exports.String) })
  },
  eval_no_calls: {
    means: "The store holds no recorded calls of that job (for those items) to replay; `recorded` counts the calls of each job it does hold.",
    context: Schema_exports.Struct({ store: Schema_exports.String, job: Schema_exports.String, items: Schema_exports.Array(Id), recorded: Schema_exports.Record(Schema_exports.String, Schema_exports.Int) })
  },
  brief_unreadable: { means: "The file named by --brief cannot be read.", context: Schema_exports.Struct({ path: Schema_exports.String }) },
  export_failed: { means: "The export folder cannot be written.", context: Schema_exports.Struct({ id: Id, dir: Schema_exports.String, reason: Schema_exports.String }) },
  git_failed: { means: "A git command Made Well ran in a workspace failed.", context: Schema_exports.Struct({ dir: Schema_exports.String, args: Schema_exports.Array(Schema_exports.String), exitCode: Schema_exports.Int, stderr: Schema_exports.String }) },
  bad_worktree_name: { means: 'A job worktree name holds characters other than letters, digits, ".", "_" or "-".', context: Schema_exports.Struct({ name: Schema_exports.String }) },
  worktree_root_unclean: {
    means: "Job worktrees would sit inside the product repo or below a guidance file, so agents would read instructions that are not the product's.",
    context: Schema_exports.Struct({ root: Schema_exports.String, repo: Schema_exports.String, guidanceAbove: Schema_exports.Array(Schema_exports.String), insideRepo: Schema_exports.Boolean })
  },
  base_not_found: { means: "The commit an item starts from is not in the product repo.", context: Schema_exports.Struct({ repo: Schema_exports.String, base: Schema_exports.String }) },
  no_branch: { means: "The product repo has no branch checked out, so Made Well does not know which branch an item ships to.", context: Schema_exports.Struct({ repo: Schema_exports.String }) },
  path_outside_workspace: { means: "A snapshot was asked for files outside the workspace.", context: Schema_exports.Struct({ dir: Schema_exports.String, outside: Schema_exports.Array(Schema_exports.String) }) },
  workspace_written: { means: "A read-only call changed the workspace.", context: Schema_exports.Struct({ dir: Schema_exports.String, changes: Schema_exports.Unknown }) },
  branch_moved: {
    means: "A branch moved while an item was in flight; only ship may move it.",
    context: Schema_exports.Struct({ repo: Schema_exports.String, ref: Schema_exports.String, recorded: Schema_exports.String, now: Schema_exports.String, landed: Schema_exports.Array(Schema_exports.String) })
  },
  out_of_scope: {
    means: "The change touches files outside the plan's declared scope.",
    context: Schema_exports.Struct({ dir: Schema_exports.String, base: Schema_exports.String, declared: Schema_exports.Array(Schema_exports.String), outside: Schema_exports.Array(Schema_exports.String), changed: Schema_exports.Array(Schema_exports.String) })
  },
  leftovers: { means: "A job left untracked or ignored files behind.", context: Schema_exports.Struct({ dir: Schema_exports.String, files: Schema_exports.Array(Schema_exports.String) }) },
  teardown_failed: {
    means: "Some resources an agent provisioned could not be torn down.",
    context: Schema_exports.Struct({ cwd: Schema_exports.String, failed: Schema_exports.Array(Schema_exports.Unknown), records: Schema_exports.Array(Schema_exports.Unknown) })
  }
};
var MadeWellError = class extends Data_exports.TaggedError("MadeWellError") {
  constructor(fields) {
    super(fields);
  }
};
var errorJson = (e) => ({
  error: e.code,
  message: e.message,
  context: e.context,
  ...e.cause ? { cause: e.cause } : {},
  next: e.next
});

// src/harness.ts
import { execFile } from "node:child_process";
import { mkdtempSync as mkdtempSync2, rmSync as rmSync2, writeFileSync as writeFileSync2 } from "node:fs";
import { tmpdir as tmpdir2 } from "node:os";
import { join as join2 } from "node:path";

// src/worker.ts
import { execFileSync, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { closeSync, mkdtempSync, openSync, readSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
var DEFAULT_BUDGET = { minutes: 30 };
var Worker = class extends Context_exports.Service()("madewell/Worker") {
};
var GROUP = 'd=$1; shift; ( exec </dev/null >/dev/null 2>&1; read _ <&3; [ -z "$d" ] || rm -rf "$d"; kill -9 0 ) & exec "$@" 3<&-';
var stamped = (line, at) => {
  try {
    const v = JSON.parse(line);
    if (!v || typeof v !== "object" || Array.isArray(v)) return line;
    return Object.keys(v).length ? `{"mw_at":${at},${line.trimStart().slice(1)}` : `{"mw_at":${at}}`;
  } catch {
    return line;
  }
};
var runGroup = (o) => Effect_exports.clockWith((clock) => Effect_exports.callback((resume) => {
  const started = Date.now();
  const call = `${process.pid}-${randomUUID()}`;
  const child = spawn("sh", ["-c", GROUP, "mw-agent", o.files ?? "", o.command, ...o.args], { cwd: o.cwd, env: { ...o.env, MW_CALL: call }, detached: true, stdio: [o.stdin ?? "pipe", "pipe", "pipe", "pipe"] });
  const kill = () => {
    try {
      process.kill(-child.pid, "SIGKILL");
    } catch {
    }
    killMarked((c) => c === call);
  };
  let stdout = "";
  let stderr = "";
  let partial = "";
  let tokens = null;
  let stdinError;
  let overBudget;
  const over = (exceeded) => {
    overBudget ??= { exceeded, budget: o.budget, ms: Date.now() - started, tokens };
    kill();
  };
  const timer = setTimeout(() => over("minutes"), o.budget.minutes * 6e4);
  const take4 = (raw, end2) => {
    const line = o.stamp ? stamped(raw, clock.currentTimeMillisUnsafe()) : raw;
    stdout += line + end2;
    const n = o.tokensIn?.(line);
    if (n) tokens = (tokens ?? 0) + n;
  };
  child.stdout.setEncoding("utf8").on("data", (chunk) => {
    const lines4 = (partial + chunk).split("\n");
    partial = lines4.pop();
    for (const line of lines4) take4(line, "\n");
    if (o.budget.tokens !== void 0 && tokens !== null && tokens > o.budget.tokens) over("tokens");
  });
  child.stderr.setEncoding("utf8").on("data", (chunk) => stderr += chunk);
  child.stdin?.on("error", (e) => stdinError = e.message);
  child.on("exit", kill);
  child.on("close", (code) => {
    clearTimeout(timer);
    if (partial) take4(partial, "");
    resume(Effect_exports.succeed({ code, stdout, stderr, stdinError, overBudget }));
  });
  child.stdin?.end(o.input);
  return Effect_exports.sync(() => {
    clearTimeout(timer);
    kill();
  });
}));
function killMarked(match7) {
  try {
    const ps = execFileSync("ps", ["axeww", "-o", "pid=,command="], { encoding: "utf8", maxBuffer: 256 << 20, stdio: ["ignore", "pipe", "ignore"] });
    for (const line of ps.split("\n")) {
      const call = / MW_CALL=(\S+)/.exec(line)?.[1];
      if (!call || !match7(call)) continue;
      try {
        process.kill(Number(line.trim().split(" ")[0]), "SIGKILL");
      } catch {
      }
    }
  } catch {
  }
}
var alive = (pid) => {
  try {
    return process.kill(pid, 0);
  } catch (e) {
    return e.code === "EPERM";
  }
};
var killOrphans = () => killMarked((call) => !alive(Number(call.split("-")[0])));
var overBudgetError = (who, o) => `${who} went over its budget: ${o.exceeded === "minutes" ? `ran ${(o.ms / 6e4).toFixed(1)} of ${o.budget.minutes} minutes` : `used ${o.tokens} of ${o.budget.tokens} tokens`}; its process group was killed.`;
var commandWorker = (command2) => Layer_exports.succeed(Worker, {
  run: (request3) => Effect_exports.acquireUseRelease(
    Effect_exports.sync(() => {
      const dir = mkdtempSync(join(tmpdir(), "madewell-"));
      const input = Buffer.from(JSON.stringify(request3));
      writeFileSync(join(dir, "request.json"), input);
      return { dir, size: input.length, fd: openSync(join(dir, "request.json"), "r") };
    }),
    ({ dir, size: size7, fd }) => runGroup({ command: "sh", args: ["-c", command2], cwd: request3.cwd, env: process.env, input: "", stdin: fd, files: dir, budget: request3.budget ?? DEFAULT_BUDGET }).pipe(
      Effect_exports.map(({ code, stdout, stderr, overBudget }) => {
        if (overBudget) return { ok: false, error: overBudgetError("The worker command", overBudget), overBudget, raw: stdout };
        try {
          return JSON.parse(stdout);
        } catch {
          const left = readSync(fd, Buffer.alloc(size7), 0, size7, null);
          const unread = left ? ` without reading its request on stdin (read ${size7 - left} of ${size7} bytes)` : "";
          return { ok: false, error: `Worker command exited ${code}${unread} and printed no JSON result. stderr: ${stderr.slice(-2e3)}` };
        }
      })
    ),
    ({ dir, fd }) => Effect_exports.sync(() => (closeSync(fd), rmSync(dir, { recursive: true, force: true })))
  )
});

// src/harness.ts
var NEUTRAL_HOST = "You are running headless for Made Well. Ignore the host's own conventions for artifacts, screenshots, attachments and memory, whether they come from the harness's system prompt, global instruction files or skills: do not save, view, upload or link screenshots or attachments, and do not write memory, notes or logs. Write only where your packet says. Your final message is your answer.";
var Match = Schema_exports.Record(Schema_exports.String, Schema_exports.Union([Schema_exports.String, Schema_exports.Number, Schema_exports.Boolean]));
var Strings = Schema_exports.Array(Schema_exports.String);
var common = {
  /** argv. Placeholders: {model} {provider} {account} {effort} {system} {prompt} {title} {tools} {settings}; {x|json} quotes as JSON; an argument that is exactly {...tools} becomes one argument per entry. */
  command: Schema_exports.NonEmptyArray(Schema_exports.String),
  /** What goes on stdin; default "{prompt}". */
  stdin: Schema_exports.optional(Schema_exports.String),
  /** Written as JSON to a per-call file whose path fills {settings}; the string "{tools}" becomes the tool list. */
  settings: Schema_exports.optional(Schema_exports.Record(Schema_exports.String, Schema_exports.Unknown)),
  /** The allowlist for each access level: tool names, joined with commas for {tools}. `none` must leave the agent no tool at all. */
  tools: Schema_exports.Struct({ none: Strings, read: Strings, checks: Strings, make: Strings, run: Strings }),
  /** Environment variables the harness needs beyond BASE_ENV, such as its credentials. A trailing * matches a prefix; NAME=value sets a fixed value. */
  env: Schema_exports.optional(Strings),
  /** Read only from the harness's own events: `pattern` names (?<clock>) or (?<minutes>) groups for the reset; `signals` are machine-readable records. */
  limit: Schema_exports.Struct({
    pattern: Schema_exports.String,
    events: Schema_exports.optional(Schema_exports.Array(Match)),
    signals: Schema_exports.optional(Schema_exports.Array(Schema_exports.Struct({ when: Match, resetsAt: Strings, message: Schema_exports.String })))
  }),
  /** Tokens summed over every matching event, for the token budget. */
  tokens: Schema_exports.optional(Schema_exports.Struct({ event: Match, paths: Strings })),
  /** The arguments that make the binary print its version, for telemetry; default ["--version"]. */
  version: Schema_exports.optional(Strings)
};
var Harness = Schema_exports.Union([
  /** Plain text: stdout is the answer. */
  Schema_exports.Struct({ ...common, output: Schema_exports.Literal("text") }),
  /** JSON lines: the answer is `text` in the last `event`; it succeeded if that event matches `ok`, `done` occurred and no `failed` event did. */
  Schema_exports.Struct({
    ...common,
    output: Schema_exports.Literal("jsonl"),
    answer: Schema_exports.Struct({ event: Match, text: Schema_exports.String, ok: Schema_exports.optional(Match), done: Schema_exports.optional(Match), failed: Schema_exports.optional(Schema_exports.Array(Match)) })
  })
]);
var BASE_ENV = ["PATH", "HOME", "USER", "LOGNAME", "SHELL", "TERM", "LANG", "LC_*", "TZ", "TMPDIR", "XDG_CONFIG_HOME", "XDG_DATA_HOME", "XDG_CACHE_HOME", "XDG_STATE_HOME", "HTTP_PROXY", "HTTPS_PROXY", "NO_PROXY", "http_proxy", "https_proxy", "no_proxy", "SSL_CERT_FILE", "SSL_CERT_DIR", "NODE_EXTRA_CA_CERTS"];
var CLAUDE_LIMIT = `You['\u2019]ve hit your [^\\n"]*?limit \xB7 resets (?<clock>[^\\n"]+)`;
var CLAUDE_EVENTS = {
  output: "jsonl",
  answer: { event: { type: "result" }, text: "result", ok: { subtype: "success", is_error: false } },
  limit: {
    pattern: CLAUDE_LIMIT,
    events: [{ type: "result" }, { error: "*" }, { type: "rate_limit_event" }, { type: "assistant", "message.model": "<synthetic>" }],
    signals: [
      { when: { error: "rate_limit", quotaLimits: "*" }, resetsAt: ["quotaLimits.resetsAt"], message: "rate limit {quotaLimits.rateLimitType}" },
      { when: { type: "rate_limit_event", "rate_limit_info.status": "rejected" }, resetsAt: ["rate_limit_info.resetsAt"], message: "rate limit {rate_limit_info.rateLimitType}" }
    ]
  },
  tokens: { event: { type: "result" }, paths: ["usage.input_tokens", "usage.cache_creation_input_tokens", "usage.output_tokens"] }
};
var AMP_SHELL = ["shell_command", "async_shell_command", "shell_command_status", "shell_command_kill"];
var FULL = ["-s", "danger-full-access"];
var HARNESSES = {
  // card.model is the Amp agent mode. Amp has no system-prompt flag: the brief goes on stdin before the packet.
  amp: {
    command: ["amp", "-x", "--stream-json", "-m", "{model}", "--no-notifications", "--no-ide", "--title", "{title}", "-l", "madewell", "--settings-file", "{settings}"],
    stdin: "{system}\n\n---\n\nYour packet:\n{prompt}",
    settings: { "amp.tools.enable": "{tools}", "amp.git.commit.ampThread.enabled": false, "amp.git.commit.coauthor.enabled": false },
    tools: {
      // Amp reads an empty allowlist as every tool, so none enables only a name no tool has.
      none: ["none"],
      read: ["Read", ...AMP_SHELL],
      checks: ["Read", ...AMP_SHELL, "edit_file", "create_file", "apply_patch"],
      make: ["Read", ...AMP_SHELL, "edit_file", "create_file", "apply_patch"],
      run: ["Read", ...AMP_SHELL]
    },
    // PLUGINS=off: the operator's own Amp plugins never load into an agent.
    env: ["AMP_API_KEY", "AMP_URL", "PLUGINS=off"],
    ...CLAUDE_EVENTS,
    // Amp's result event carries no usage; each assistant message does.
    tokens: { event: { type: "assistant" }, paths: ["message.usage.input_tokens", "message.usage.cache_creation_input_tokens", "message.usage.output_tokens"] }
  },
  claude: {
    command: ["claude", "-p", "--verbose", "--output-format", "stream-json", "--model", "{model}", "--effort", "{effort}", "--permission-mode", "bypassPermissions", "--strict-mcp-config", "--tools", "{tools}", "--append-system-prompt", "{system}"],
    tools: {
      none: [],
      read: ["Read", "Grep", "Glob"],
      checks: ["Read", "Grep", "Glob", "Bash", "Edit", "Write"],
      make: ["Read", "Grep", "Glob", "Bash", "Edit", "Write"],
      run: ["Read", "Grep", "Glob", "Bash"]
    },
    env: ["ANTHROPIC_*", "CLAUDE_CODE_OAUTH_TOKEN", "CLAUDE_CONFIG_DIR"],
    ...CLAUDE_EVENTS
  },
  // Codex has no tool allowlist: its sandbox is the boundary, and the optional tools (images, MCP) are off.
  // No setting removes every tool, so none also turns the shell off; what remains cannot read or write.
  codex: {
    command: ["codex", "exec", "--json", "--skip-git-repo-check", "-m", "{model}", "-c", 'model_reasoning_effort="{effort}"', "-c", 'approval_policy="never"', "-c", "developer_instructions={system|json}", "-c", "tools.view_image=false", "-c", "mcp_servers={}", "{...tools}", "-"],
    tools: { none: ["-s", "read-only", "-c", "features.shell_tool=false"], read: ["-s", "read-only"], checks: FULL, make: FULL, run: FULL },
    env: ["OPENAI_API_KEY", "OPENAI_BASE_URL", "CODEX_HOME"],
    output: "jsonl",
    answer: { event: { type: "item.completed", "item.type": "agent_message" }, text: "item.text", done: { type: "turn.completed" }, failed: [{ type: "turn.failed" }, { type: "error" }] },
    limit: {
      pattern: `[Yy]ou['\u2019]ve hit your usage limit(?:[^\\n"]*?try again at\\s+(?<clock>[^\\n"]+)|[^\\n"]*)|usage_limit_reached|usage_not_included|quota_exceeded`,
      events: [{ type: "turn.failed" }, { type: "error" }],
      signals: [{ when: { "payload.rate_limits.rate_limit_reached_type": "*" }, resetsAt: ["payload.rate_limits.primary.resets_at", "payload.rate_limits.secondary.resets_at"], message: "usage limit reached ({payload.rate_limits.rate_limit_reached_type})" }]
    },
    tokens: { event: { type: "turn.completed" }, paths: ["usage.input_tokens", "usage.output_tokens"] }
  },
  pi: {
    command: ["pi", "--print", "--mode", "json", "--offline", "--no-session", "--model", "{provider}/{model}", "--thinking", "{effort}", "--append-system-prompt", "{system}", "--tools", "{tools}"],
    tools: {
      none: [],
      read: ["read", "grep", "find", "ls"],
      checks: ["read", "grep", "find", "ls", "bash", "edit", "write"],
      make: ["read", "grep", "find", "ls", "bash", "edit", "write"],
      run: ["read", "grep", "find", "ls", "bash"]
    },
    env: ["OPENAI_API_KEY", "ANTHROPIC_API_KEY", "GEMINI_API_KEY", "OPENROUTER_API_KEY", "PI_CODING_AGENT_DIR"],
    output: "jsonl",
    answer: { event: { type: "message_end", "message.role": "assistant" }, text: "message.content", ok: { "message.stopReason": "stop" } },
    limit: {
      pattern: "You have hit your ChatGPT usage limit(?: \\([^)]*\\))?\\.(?: Try again in ~(?<minutes>\\d+) min\\.)?",
      events: [{ type: "message_end", "message.role": "assistant", "message.stopReason": "error" }, { type: "auto_retry_end", success: false }, { type: "error" }]
    },
    tokens: { event: { type: "message_end", "message.role": "assistant" }, paths: ["message.usage.input", "message.usage.output"] }
  }
};
var get5 = (value3, path) => path.split(".").reduce((v, k) => v && typeof v === "object" ? v[k] : void 0, value3);
var matches = (event, match7) => Object.entries(match7).every(([path, want]) => want === "*" ? get5(event, path) != null : get5(event, path) === want);
var fill = (template, vars) => template.replace(/\{([\w.]+)(\|json)?\}/g, (whole, path, json) => {
  const v = get5(vars, path);
  if (v === void 0 || v === null) return whole;
  const s = Array.isArray(v) ? v.join(",") : String(v);
  return json ? JSON.stringify(s) : s;
});
var glob = (names) => (name) => names.some((n) => n.endsWith("*") ? name.startsWith(n.slice(0, -1)) : name === n);
var agentEnv = (allow, from = process.env) => ({
  ...Object.fromEntries(Object.entries(from).filter(([name]) => glob(allow)(name))),
  ...Object.fromEntries(allow.filter((a) => a.includes("=")).map((a) => [a.slice(0, a.indexOf("=")), a.slice(a.indexOf("=") + 1)])),
  MW_WORKER: "1"
});
function buildLaunch(card, access, call, harness = HARNESSES[card.harness]) {
  const settings = join2(call.dir, "settings.json");
  const vars = { ...card, ...call, tools: harness.tools[access], settings };
  const [binary, ...args2] = harness.command.flatMap((a) => a === "{...tools}" ? vars.tools : [fill(a, vars)]);
  const files = harness.settings ? { [settings]: JSON.stringify(Object.fromEntries(Object.entries(harness.settings).map(([k, v]) => [k, v === "{tools}" ? harness.tools[access] : typeof v === "string" ? fill(v, vars) : v]))) } : {};
  return { command: process.env[`MW_${card.harness.toUpperCase()}`] ?? binary, args: args2, input: fill(harness.stdin ?? "{prompt}", vars), files };
}
var events = (text2) => text2.split("\n").flatMap((l) => {
  try {
    const e = JSON.parse(l);
    return e && typeof e === "object" ? [e] : [];
  } catch {
    return [];
  }
});
var strings = (value3) => typeof value3 === "string" ? [value3] : value3 && typeof value3 === "object" ? Object.values(value3).flatMap(strings) : [];
var textOf = (value3) => typeof value3 === "string" ? value3 : Array.isArray(value3) ? value3.map((c) => typeof c === "string" ? c : c?.type === "text" ? String(c.text ?? "") : "").filter(Boolean).join("\n") : "";
var tokensIn = (harness, line) => {
  const e = harness.tokens && events(line)[0];
  if (!e || !matches(e, harness.tokens.event)) return 0;
  return harness.tokens.paths.reduce((sum3, p) => sum3 + (Number(get5(e, p)) || 0), 0);
};
var DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
function clockToEpoch(text2, now2) {
  const m = /(?:\b(sun|mon|tue|wed|thu|fri|sat)[a-z]*\.?\s+)?\b(\d{1,2})(?::(\d{2}))?\s*([ap])\.?m\.?(\s*\(UTC\))?/i.exec(text2);
  if (!m) return null;
  const [, day, h, min5 = "0", ap, utc] = m;
  const hour = Number(h) % 12 + (ap.toLowerCase() === "p" ? 12 : 0);
  const d = new Date(now2);
  const dayOf = () => utc ? d.getUTCDay() : d.getDay();
  if (utc) d.setUTCHours(hour, Number(min5), 0, 0);
  else d.setHours(hour, Number(min5), 0, 0);
  const want = day ? DAYS.indexOf(day.toLowerCase()) : null;
  for (let i = 0; i < 8 && (d.getTime() <= now2 || want !== null && dayOf() !== want); i++) {
    if (utc) d.setUTCDate(d.getUTCDate() + 1);
    else d.setDate(d.getDate() + 1);
  }
  return d.getTime();
}
function parseRun(harness, stdout, account, now2) {
  const evs = harness.output === "jsonl" ? events(stdout) : [];
  let output = stdout.trim();
  let succeeded = output !== "";
  let failed = [];
  if (harness.output === "jsonl") {
    const a = harness.answer;
    const last = evs.findLast((e) => matches(e, a.event));
    failed = evs.filter((e) => a.failed?.some((m) => matches(e, m)));
    output = textOf(get5(last, a.text));
    succeeded = last !== void 0 && output.trim() !== "" && (!a.ok || matches(last, a.ok)) && (!a.done || evs.some((e) => matches(e, a.done))) && failed.length === 0;
  }
  const pattern = new RegExp(harness.limit.pattern);
  const answeredLimit = new RegExp(`^\\s*(?:${harness.limit.pattern})`).test(output);
  const own = evs.filter((e) => harness.limit.events?.some((m) => matches(e, m)));
  let limit = null;
  if (!succeeded || answeredLimit) {
    const text2 = answeredLimit ? output : own.flatMap(strings).find((s) => pattern.test(s));
    const said = text2 ? pattern.exec(text2) : null;
    const signal = harness.limit.signals?.map((s) => ({ s, e: evs.findLast((e) => matches(e, s.when)) })).find((x) => x.e);
    if (said || signal) {
      const machine = signal?.s.resetsAt.map((p) => get5(signal.e, p)).find((v) => typeof v === "number" && Number.isFinite(v));
      const { clock, minutes: minutes2 } = said?.groups ?? {};
      const resetsAt = machine !== void 0 ? machine * 1e3 : clock ? clockToEpoch(clock, now2) : minutes2 ? now2 + Number(minutes2) * 6e4 : null;
      limit = { account, resetsAt, message: said?.[0] ?? fill(signal.s.message, signal.e) };
    }
  }
  const ok = succeeded && !limit;
  return { output, ok, limit, error: ok ? "" : [...new Set([...failed, ...own].flatMap(strings))].join(" ").slice(-2e3) || output };
}
var versions = /* @__PURE__ */ new Map();
var versionOf = (command2, args2, env) => {
  const key = JSON.stringify([command2, ...args2]);
  if (!versions.has(key)) versions.set(key, new Promise((done3) => execFile(command2, args2, { env, timeout: 1e4 }, (e, stdout, stderr) => done3(e ? null : (stdout.trim() || stderr.trim()).split("\n")[0].slice(0, 200) || null))).catch(() => null));
  return Effect_exports.promise(() => versions.get(key));
};
var harnessWorker = Layer_exports.succeed(Worker, {
  run: (request3) => {
    const name = request3.card.harness;
    const harness = request3.harness ?? HARNESSES[name];
    if (!harness) return Effect_exports.succeed({ ok: false, error: `No harness entry "${name}". Built in: ${Object.keys(HARNESSES).join(", ")}; add others under "harnesses" in prescriptions.` });
    const budget = request3.budget ?? DEFAULT_BUDGET;
    return Effect_exports.acquireUseRelease(
      // Per-call files (settings) live in a directory removed when the call ends.
      Effect_exports.sync(() => mkdtempSync2(join2(tmpdir2(), "madewell-"))),
      (dir) => {
        const launch2 = buildLaunch(request3.card, request3.access, { system: request3.system, prompt: request3.prompt, title: `mw #${request3.item} ${request3.job} \xB7 ${request3.profile} \xB7 ${request3.kind}`, dir }, harness);
        for (const [path, content] of Object.entries(launch2.files)) writeFileSync2(path, content);
        const cwd = request3.access === "none" ? dir : request3.cwd;
        const env = agentEnv([...BASE_ENV, ...harness.env ?? []]);
        return Effect_exports.zip(
          runGroup({ command: launch2.command, args: launch2.args, cwd, env, input: launch2.input, budget, tokensIn: (line) => tokensIn(harness, line), files: dir, stamp: harness.output === "jsonl" }),
          versionOf(launch2.command, harness.version ?? ["--version"], env),
          { concurrent: true }
        );
      },
      (dir) => Effect_exports.sync(() => rmSync2(dir, { recursive: true, force: true }))
    ).pipe(
      Effect_exports.map(([{ code, stdout, stderr, overBudget }, version]) => {
        const v = version === null ? {} : { version };
        if (overBudget) return { ok: false, error: overBudgetError(`${name} (${request3.card.model})`, overBudget), overBudget, raw: stdout, ...v };
        if (code === 127 && !stdout) return { ok: false, error: `${stderr.trim()}. Is ${name} installed and on PATH?` };
        const run2 = parseRun(harness, stdout, request3.card.account, Date.now());
        if (run2.limit) return { ok: false, limit: run2.limit, raw: stdout, ...v };
        if (run2.ok && code === 0) return { ok: true, output: run2.output, raw: stdout, ...v };
        return { ok: false, error: `${name} exited ${code}: ${run2.error || stderr.slice(-2e3) || "no final answer"}`, raw: stdout, ...v };
      })
    );
  }
});

// src/cards.ts
var Card = Schema_exports.Struct({
  /** A built-in harness entry (amp, claude, codex, pi) or one defined under "harnesses". */
  harness: Schema_exports.NonEmptyString,
  provider: Schema_exports.NonEmptyString,
  account: Schema_exports.NonEmptyString,
  model: Schema_exports.NonEmptyString,
  effort: Schema_exports.Literals(["low", "medium", "high", "xhigh", "max"])
});
var Access = Schema_exports.Literals(["none", "read", "checks", "make", "run"]);
var INTAKE_ACCESS = "none";
var AGENT_JOBS = ["discover", "ideate", "challenge", "plan", "test-plan", "implement", "arbitrate"];
var Positive = Schema_exports.Finite.check(Schema_exports.isGreaterThan(0));
var JobBudget = Schema_exports.optional(Schema_exports.Struct({ minutes: Positive, tokens: Schema_exports.optional(Positive) }));
var Prescription = Schema_exports.Struct({ tier: Schema_exports.String, access: Access, budget: JobBudget });
var Prescriptions = Schema_exports.Struct({
  tiers: Schema_exports.Record(Schema_exports.String, Schema_exports.NonEmptyArray(Card)),
  jobs: Schema_exports.Struct({
    ...Object.fromEntries(AGENT_JOBS.map((job) => [job, Prescription])),
    verify: Schema_exports.Struct({ budget: JobBudget })
  }),
  /** Harness entries added to, or replacing, the built-in ones. */
  harnesses: Schema_exports.optional(Schema_exports.Record(Schema_exports.String, Harness)),
  /** Environment variables every agent receives beyond BASE_ENV and its harness's own. */
  env: Schema_exports.optional(Schema_exports.Array(Schema_exports.String)),
  /** Items `mw run` drives at once, each up to two agents. Default: DEFAULT_PARALLEL. */
  parallel: Schema_exports.optional(Schema_exports.Int.check(Schema_exports.isGreaterThan(0)))
});
var DEFAULT_PARALLEL = 3;
var loadPrescriptions = (path) => Effect_exports.gen(function* () {
  const text2 = yield* Effect_exports.try({
    try: () => readFileSync(path, "utf8"),
    catch: (e) => new MadeWellError({ code: "prescriptions_unreadable", message: `Cannot read prescriptions file ${path}.`, context: { path, reason: String(e) }, next: [{ run: `ls -l ${path}`, why: "check the file exists and is readable" }, { run: `MW_PRESCRIPTIONS=<readable prescriptions file> mw run`, why: "point Made Well at a prescriptions file it can read" }] })
  });
  const value3 = yield* Effect_exports.try({
    try: () => JSON.parse(text2),
    catch: (e) => new MadeWellError({ code: "prescriptions_invalid", message: `Prescriptions file ${path} is not valid JSON.`, context: { path, reason: String(e) }, next: [{ run: `node -e "JSON.parse(require('fs').readFileSync('${path}','utf8'))"`, why: "see the exact parse error position" }] })
  });
  const p = yield* Schema_exports.decodeUnknownEffect(Prescriptions)(value3).pipe(
    Effect_exports.mapError((e) => new MadeWellError({ code: "prescriptions_invalid", message: `Prescriptions file ${path} does not match the expected shape.`, context: { path, problems: String(e) }, cause: "Each job needs {tier, access, budget?: {minutes, tokens?}}; each tier is a non-empty list of cards {harness, provider, account, model, effort}; each entry under harnesses needs {command, output, answer (jsonl), limit, tools per access level}.", next: [{ run: `$EDITOR ${path}`, why: "fix the fields listed in context.problems" }] }))
  );
  const harnesses = { ...HARNESSES, ...p.harnesses };
  for (const [tier, cards] of Object.entries(p.tiers)) {
    const unknown2 = cards.find((c) => !harnesses[c.harness]);
    if (unknown2) {
      return yield* new MadeWellError({ code: "prescriptions_invalid", message: `Tier "${tier}" has a card on harness "${unknown2.harness}", which has no entry.`, context: { path, tier, card: unknown2, harnesses: Object.keys(harnesses) }, next: [{ run: `$EDITOR ${path}`, why: `use one of ${Object.keys(harnesses).join(", ")}, or add "${unknown2.harness}" under "harnesses": command, output, answer, limit and tools per access level` }] });
    }
  }
  for (const job of AGENT_JOBS) {
    const tier = p.jobs[job].tier;
    if (!p.tiers[tier]) {
      return yield* new MadeWellError({ code: "prescriptions_invalid", message: `Job "${job}" uses tier "${tier}", which is not defined.`, context: { path, job, tier, tiers: Object.keys(p.tiers) }, next: [{ run: `$EDITOR ${path}`, why: `define tier "${tier}" or point "${job}" at one of: ${Object.keys(p.tiers).join(", ")}` }] });
    }
  }
  return p;
});
var prescriptionOf = (p, job) => p.jobs[job];
var cardsFor = (p, job) => p.tiers[prescriptionOf(p, job).tier];
var budgetFor = (p, job) => p.jobs[job].budget ?? DEFAULT_BUDGET;
var harnessOf = (p, name) => {
  const harness = p.harnesses?.[name] ?? HARNESSES[name];
  return harness && { ...harness, env: [...harness.env ?? [], ...p.env ?? []] };
};
function pickCard(cards, exhausted, now2) {
  const card = cards.find((c) => (exhausted[c.account] ?? 0) <= now2);
  if (card) return { card };
  const resets = cards.map((c) => exhausted[c.account]).filter((t) => t !== void 0 && t > now2);
  return { card: void 0, resetsAt: resets.length ? Math.min(...resets) : now2 };
}

// src/change.ts
import { mkdirSync, readFileSync as readFileSync3, rmSync as rmSync4, writeFileSync as writeFileSync3 } from "node:fs";
import { dirname as dirname2, join as join4 } from "node:path";

// src/workspace.ts
import { execFile as execFile2 } from "node:child_process";
import { existsSync, lstatSync, readdirSync, readFileSync as readFileSync2, readlinkSync, rmSync as rmSync3, statSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, isAbsolute, join as join3, relative, resolve as resolve3 } from "node:path";
var GUIDANCE = ["AGENTS.md", "AGENT.md", "CLAUDE.md", "CLAUDE.local.md", "GEMINI.md", ".cursorrules"];
var TEARDOWN_TIMEOUT_MS = 5 * 6e4;
var worktreesRoot = () => join3(process.env.MW_STORE ? dirname(process.env.MW_STORE) : process.env.MW_HOME ?? join3(homedir(), ".local", "share", "madewell"), "worktrees");
var fail8 = (code, message, context3, next, cause) => new MadeWellError({ code, message, context: context3, next, ...cause ? { cause } : {} });
var exec = (command2, args2, cwd, timeout3 = 0) => Effect_exports.promise(() => new Promise((done3) => execFile2(command2, args2, { cwd, timeout: timeout3, maxBuffer: 256 * 1024 * 1024 }, (error, stdout, stderr) => done3({ code: error ? typeof error.code === "number" ? error.code : 1 : 0, stdout, stderr }))));
var git = (dir, ...args2) => exec("git", ["--no-optional-locks", "-C", dir, ...args2], dir).pipe(Effect_exports.flatMap(({ code, stdout, stderr }) => code === 0 ? Effect_exports.succeed(stdout) : Effect_exports.fail(fail8("git_failed", `git ${args2[0]} failed in ${dir}.`, { dir, args: args2, exitCode: code, stderr: stderr.trim() }, [{ run: `git -C ${dir} ${args2.join(" ")}`, why: "run it yourself to see the full error" }]))));
var lines = (out) => out.split("\0").filter(Boolean);
var worktree = Effect_exports.fn("mw.worktree")(function* (repo, base, name) {
  const root = worktreesRoot();
  const path = join3(root, name);
  if (!/^[\w.-]+$/.test(name)) return yield* fail8("bad_worktree_name", `Worktree name "${name}" must be letters, digits, ".", "_" or "-".`, { name }, []);
  const above = [];
  for (let dir = root; ; dir = dirname(dir)) {
    above.push(...GUIDANCE.map((f) => join3(dir, f)).filter((f) => existsSync(f)));
    if (dirname(dir) === dir) break;
  }
  const inside = !relative(resolve3(repo), root).startsWith("..");
  if (above.length || inside) {
    return yield* fail8(
      "worktree_root_unclean",
      `Job worktrees under ${root} would inherit instructions that are not the product's.`,
      { root, repo, guidanceAbove: above, insideRepo: inside },
      [{ run: "MW_HOME=<a directory with no guidance files above it and outside the repo> mw run", why: "put Made Well's home where agents read only the product's own guidance" }]
    );
  }
  const commit2 = (yield* git(repo, "rev-parse", "--verify", "--quiet", `${base}^{commit}`).pipe(Effect_exports.mapError(() => fail8("base_not_found", `${base} is not a commit in ${repo}.`, { repo, base }, [{ run: `git -C ${repo} log --oneline -5`, why: "find the commit the item should start from" }])))).trim();
  return yield* Effect_exports.acquireRelease(
    Effect_exports.gen(function* () {
      yield* removeWorktree(repo, path);
      yield* git(repo, "worktree", "add", "--detach", "--quiet", path, commit2);
      return { path, repo, base: commit2 };
    }),
    () => removeWorktree(repo, path)
  );
});
var removeWorktree = (repo, path) => Effect_exports.gen(function* () {
  yield* Effect_exports.ignore(git(repo, "worktree", "remove", "--force", "--force", path));
  rmSync3(path, { recursive: true, force: true });
  yield* Effect_exports.ignore(git(repo, "worktree", "prune"));
});
var snapshot2 = Effect_exports.fn("mw.snapshot")(function* (dir, files) {
  const outside = files.filter((f) => isAbsolute(f) || relative(dir, resolve3(dir, f)).startsWith(".."));
  if (outside.length) return yield* fail8("path_outside_workspace", "A snapshot can only read files inside the workspace.", { dir, outside }, []);
  const head3 = (yield* git(dir, "rev-parse", "HEAD")).trim();
  const tracked = lines(yield* git(dir, "ls-files", "-z"));
  const contents = Object.fromEntries(files.map((f) => {
    const p = join3(dir, f);
    return [f, existsSync(p) && statSync(p).isFile() ? readFileSync2(p, "utf8") : null];
  }));
  return { head: head3, files: tracked, contents };
});
var capture = Effect_exports.fn("mw.capture")(function* (dir) {
  const head3 = (yield* git(dir, "rev-parse", "HEAD")).trim();
  const refs = Object.fromEntries((yield* git(dir, "for-each-ref", "--format=%(refname) %(objectname)")).split("\n").filter(Boolean).map((l) => l.split(" ")));
  const common2 = resolve3(dir, (yield* git(dir, "rev-parse", "--git-common-dir")).trim());
  const files = {};
  walk(dir, "", files);
  for (const part of ["config", "info", "hooks"]) walk(common2, part, files, ".git/");
  return { dir, head: head3, refs, files };
});
function walk(root, rel, into2, label2 = "") {
  const p = join3(root, rel);
  let s;
  try {
    s = lstatSync(p, { bigint: true });
  } catch {
    return;
  }
  if (s.isDirectory()) {
    for (const name of readdirSync(p)) if (name !== ".git") walk(root, rel ? `${rel}/${name}` : name, into2, label2);
  } else if (rel) {
    into2[label2 + rel] = `${s.mode}:${s.size}:${s.mtimeNs}${s.isSymbolicLink() ? `:${readlinkSync(p)}` : ""}`;
  }
}
function changes(before, after) {
  const keys3 = (a, b) => [.../* @__PURE__ */ new Set([...Object.keys(a), ...Object.keys(b)])].sort();
  const refs = keys3(before.refs, after.refs).filter((ref) => before.refs[ref] !== after.refs[ref]).map((ref) => ({ ref, from: before.refs[ref] ?? null, to: after.refs[ref] ?? null }));
  const paths = keys3(before.files, after.files);
  const added = paths.filter((p) => !(p in before.files));
  const removed = paths.filter((p) => !(p in after.files));
  const modified = paths.filter((p) => p in before.files && p in after.files && before.files[p] !== after.files[p]);
  const head3 = before.head === after.head ? void 0 : { from: before.head, to: after.head };
  return head3 || refs.length || added.length || removed.length || modified.length ? { ...head3 ? { head: head3 } : {}, refs, added, removed, modified } : void 0;
}
var readOnly = (dir, effect2) => Effect_exports.gen(function* () {
  const before = yield* capture(dir);
  const result3 = yield* effect2;
  const changed = changes(before, yield* capture(dir));
  if (changed) {
    return yield* fail8(
      "workspace_written",
      `A read-only call changed ${dir}.`,
      { dir, changes: changed },
      [{ run: `git -C ${dir} status --ignored`, why: "see the changes in context.changes; a read-only job gets no write access, so its result is not accepted" }]
    );
  }
  return result3;
}).pipe(Effect_exports.withSpan("mw.readOnly", { attributes: { dir } }));
var headGuard = Effect_exports.fn("mw.headGuard")(function* (repo, ref, recorded) {
  const now2 = (yield* git(repo, "rev-parse", "--verify", `${ref}^{commit}`)).trim();
  if (now2 === recorded) return;
  const landed = yield* Effect_exports.orElseSucceed(git(repo, "log", "--format=%H %s", `${recorded}..${now2}`), () => "");
  return yield* fail8("branch_moved", `${ref} moved from ${recorded.slice(0, 12)} to ${now2.slice(0, 12)}.`, { repo, ref, recorded, now: now2, landed: landed.trim().split("\n").filter(Boolean) }, [
    { run: `git -C ${repo} log --stat ${recorded}..${now2}`, why: "see what landed on the branch and who made it" },
    { run: `git -C ${repo} reset --keep ${recorded}`, why: "only if those commits are unverified agent work and were never pushed" }
  ]);
});
var scopeCheck = Effect_exports.fn("mw.scopeCheck")(function* (dir, base, declared) {
  const changed = [.../* @__PURE__ */ new Set([...lines(yield* git(dir, "diff", "--name-only", "--no-renames", "-z", base)), ...lines(yield* git(dir, "ls-files", "--others", "--exclude-standard", "-z"))])].sort();
  const covers2 = (d, f) => d.endsWith("/") || d.endsWith("/**") ? f.startsWith(d.replace(/\*\*$/, "")) : f === d;
  const outside = changed.filter((f) => !declared.some((d) => covers2(d, f)));
  if (outside.length) {
    return yield* fail8("out_of_scope", `${outside.length} changed file(s) are outside the declared scope.`, { dir, base, declared, outside, changed }, [{ run: `git -C ${dir} diff --stat ${base}`, why: "see the whole change against its base" }]);
  }
  return changed;
});
var leftovers = Effect_exports.fn("mw.leftovers")(function* (dir, before) {
  const created = lines(yield* git(dir, "ls-files", "--others", "-z")).filter((f) => !(f in before.files)).sort();
  const after = (yield* capture(dir)).files;
  const control = Object.keys({ ...before.files, ...after }).filter((f) => f.startsWith(".git/") && before.files[f] !== after[f]).sort();
  if (created.length || control.length) {
    const files = [...created, ...control];
    return yield* fail8("leftovers", `${files.length} file(s) were left or changed in ${dir}.`, { dir, files }, [
      ...created.length ? [{ run: `git -C ${dir} clean -fdx -- ${created.map((f) => JSON.stringify(f)).join(" ")}`, why: "remove exactly the untracked files the job left behind" }] : [],
      ...control.length ? [{ run: `ls -l ${control.map((f) => JSON.stringify(join3(dir, f))).join(" ")}`, why: "git settings, excludes or hooks changed; git cannot restore them, so check and restore each by hand" }] : []
    ]);
  }
});
var teardown = Effect_exports.fn("mw.teardown")(function* (resources, cwd) {
  const unique = resources.filter((r, i) => resources.findIndex((o) => o.kind === r.kind && o.id === r.id) === i);
  const records = [];
  for (const r of unique.toReversed()) {
    const { code, stdout, stderr } = yield* exec("sh", ["-c", r.teardown], cwd, TEARDOWN_TIMEOUT_MS);
    records.push({ kind: r.kind, id: r.id, teardown: r.teardown, exitCode: code, output: (stdout + stderr).slice(-4e3) });
  }
  const failed = records.filter((r) => r.exitCode !== 0);
  if (failed.length) {
    return yield* fail8(
      "teardown_failed",
      `${failed.length} of ${records.length} provisioned resource(s) were not torn down.`,
      { cwd, failed, records },
      failed.map((r) => ({ run: `cd ${cwd} && ${r.teardown}`, why: `tear down ${r.kind} ${r.id} once context.failed shows why it failed` }))
    );
  }
  return records;
});

// src/change.ts
var lines2 = (out) => out.split("\0").filter(Boolean);
var tail = (s) => s.slice(-4e3);
var itemHome = (storePath2, id2) => join4(dirname2(storePath2), "items", String(id2));
var patchPath = (home, name) => join4(home, `${name}.patch`);
var writePatch = (path, patch) => {
  mkdirSync(dirname2(path), { recursive: true });
  writeFileSync3(path, patch);
};
var readPatch = (path) => {
  try {
    return readFileSync3(path, "utf8");
  } catch {
    return "";
  }
};
var removeHome = (home) => rmSync4(home, { recursive: true, force: true });
var branchOf = Effect_exports.fn("mw.branchOf")(function* (repo) {
  const ref = (yield* Effect_exports.orElseSucceed(git(repo, "symbolic-ref", "-q", "HEAD"), () => "")).trim();
  if (!ref) {
    return yield* new MadeWellError({ code: "no_branch", message: `${repo} has no branch checked out.`, context: { repo }, next: [{ run: `git -C ${repo} switch main`, why: "check out the branch items ship to, then retry" }] });
  }
  return { ref, commit: yield* revParse(repo, ref) };
});
var revParse = (repo, ref) => Effect_exports.map(git(repo, "rev-parse", "--verify", `${ref}^{commit}`), (s) => s.trim());
var takeChange = Effect_exports.fn("mw.takeChange")(function* (dir, base) {
  yield* git(dir, "add", "-A");
  const files = lines2(yield* git(dir, "diff", "--cached", "--name-only", "--no-renames", "-z", base));
  const patch = files.length ? yield* git(dir, "diff", "--cached", "--binary", "--no-renames", base) : "";
  return { files, patch };
});
var applyPatch = (dir, path) => readPatch(path) ? Effect_exports.asVoid(git(dir, "apply", "--index", "--binary", path)) : Effect_exports.void;
var commit = Effect_exports.fn("mw.commit")(function* (dir, message) {
  yield* git(dir, "commit", "--quiet", "--no-verify", "--allow-empty", "-m", message);
  return yield* revParse(dir, "HEAD");
});
var bringOnto = Effect_exports.fn("mw.bringOnto")(function* (repo, ref, from, to) {
  const checkedOut = (yield* Effect_exports.orElseSucceed(git(repo, "symbolic-ref", "-q", "HEAD"), () => "")).trim() === ref;
  if (checkedOut) yield* git(repo, "merge", "--ff-only", "--quiet", to);
  else yield* git(repo, "update-ref", ref, to, from);
});
var runChecks2 = Effect_exports.fn("mw.runChecks")(function* (dir, checks, budget, env) {
  const results2 = [];
  for (const check2 of checks) {
    const started = Date.now();
    const r = yield* runGroup({ command: "sh", args: ["-c", check2.run], cwd: dir, env, input: "", budget });
    const over = r.overBudget ? `
[made well] stopped after ${(r.overBudget.ms / 6e4).toFixed(1)} of ${budget.minutes} minutes` : "";
    results2.push({ ...check2, exitCode: r.overBudget ? 124 : r.code ?? 1, ms: Date.now() - started, output: tail(r.stdout + r.stderr + over) });
  }
  return results2;
});

// src/engine.ts
import { execFile as execFile4 } from "node:child_process";
import { mkdirSync as mkdirSync6, rmSync as rmSync5 } from "node:fs";

// src/project.ts
import { execFile as execFile3 } from "node:child_process";
import { existsSync as existsSync2, mkdirSync as mkdirSync5, readFileSync as readFileSync5, writeFileSync as writeFileSync6 } from "node:fs";
import { dirname as dirname5, join as join8, sep } from "node:path";

// src/store.ts
import { mkdirSync as mkdirSync4, renameSync, writeFileSync as writeFileSync5 } from "node:fs";
import { homedir as homedir2 } from "node:os";
import { dirname as dirname4, join as join7 } from "node:path";
import { DatabaseSync } from "node:sqlite";

// src/replay.ts
import { mkdirSync as mkdirSync2, writeFileSync as writeFileSync4 } from "node:fs";
import { join as join5 } from "node:path";
var snapshot3 = (store) => ({ items: store.list(), events: store.allEvents(), calls: store.calls().map(({ raw, ...c }) => ({ ...c, rawBytes: raw?.length ?? 0 })), at: (/* @__PURE__ */ new Date()).toISOString() });
var exportItem = Effect_exports.fn("mw.export")(function* (store, id2, dir) {
  const item = store.get(id2);
  if (!item) return yield* new MadeWellError({ code: "item_not_found", message: `There is no work item #${id2}.`, context: { id: id2 }, next: [{ run: "mw status", why: "list every work item" }] });
  const calls = store.calls(id2);
  yield* Effect_exports.try({
    try: () => {
      mkdirSync2(dir, { recursive: true });
      writeFileSync4(join5(dir, "item.json"), JSON.stringify({ item, events: store.events(id2) }, null, 2));
      calls.forEach((c, i) => {
        const folder = join5(dir, `${String(i + 1).padStart(3, "0")}-${c.kind}-${c.job}`);
        mkdirSync2(folder, { recursive: true });
        const { system, prompt, output, raw, tools, flags, ...meta } = c;
        const files = [["call.json", JSON.stringify(meta, null, 2)], ["brief.txt", system], ["packet.txt", prompt], ["answer.txt", output ?? ""], ["raw.jsonl", raw ?? ""], ["tools.json", JSON.stringify(tools, null, 2)], ["flags.json", JSON.stringify(flags, null, 2)]];
        for (const [name, text2] of files) writeFileSync4(join5(folder, name), text2);
      });
    },
    catch: (e) => new MadeWellError({ code: "export_failed", message: `Cannot write the export of item #${id2} to ${dir}.`, context: { id: id2, dir, reason: String(e) }, next: [{ run: `mw export ${id2} --out <writable dir>`, why: "export somewhere writable" }] })
  });
  return { dir, calls: calls.length };
});
var replayHtml = (data) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Made Well \xB7 the glass</title>
<style>
:root { --ink:#16181d; --mute:#6b7280; --line:#e5e7eb; --bg:#fafaf9; --ok:#15803d; --warn:#b45309; --bad:#b91c1c; --run:#1d4ed8; }
* { box-sizing:border-box } body { margin:0; font:14px/1.45 ui-sans-serif,system-ui,sans-serif; color:var(--ink); background:var(--bg) }
header { padding:14px 20px; border-bottom:1px solid var(--line); display:flex; gap:16px; align-items:center; flex-wrap:wrap; background:#fff; position:sticky; top:0; z-index:2 }
h1 { font-size:15px; margin:0 } .mute { color:var(--mute) } button { font:inherit; padding:4px 10px; border:1px solid var(--line); background:#fff; border-radius:6px; cursor:pointer } button:hover { border-color:var(--ink) }
input[type=range] { flex:1; min-width:200px } .pill { font-size:12px; padding:1px 8px; border-radius:999px; border:1px solid currentColor; white-space:nowrap }
main { display:grid; grid-template-columns: 340px 1fr; height: calc(100vh - 58px) }
#steps { overflow:auto; border-right:1px solid var(--line); background:#fff } .step { padding:7px 14px; border-bottom:1px solid #f3f4f6; cursor:pointer; display:grid; grid-template-columns:44px 1fr; gap:8px }
.step.on { background:#eef2ff } .step.future { opacity:.35 } .step .n { color:var(--mute); font-variant-numeric:tabular-nums } .step b { font-weight:600 }
#right { overflow:auto; padding:18px 22px } .board { display:grid; grid-template-columns: 1.3fr repeat(7, minmax(0, 1fr)); gap:8px; align-items:stretch }
.col { min-width:0; background:#fff; border:1px solid var(--line); border-radius:10px; padding:10px } .col h3 { margin:0 0 8px; font-size:11px; text-transform:uppercase; letter-spacing:.03em; color:var(--mute); overflow-wrap:anywhere }
.card { border:1px solid var(--line); border-radius:8px; padding:7px 9px; margin-bottom:6px; cursor:pointer; background:#fff } .card.sel { outline:2px solid var(--run) }
.status-shipped { color:var(--ok) } .status-held { color:var(--bad) } .status-running,.status-queued { color:var(--run) } .status-waiting-quota,.status-waiting-prerequisite,.status-candidate { color:var(--warn) } .status-discovered { color:var(--ok) }
.card div { overflow-wrap:anywhere } .detail { margin-top:18px; background:#fff; border:1px solid var(--line); border-radius:10px; padding:14px 16px }
pre { white-space:pre-wrap; word-break:break-word; background:#f8fafc; border:1px solid var(--line); border-radius:8px; padding:10px; max-height:420px; overflow:auto; font:12px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace }
table.tools { border-collapse:collapse; width:100%; font-size:12px; margin:6px 0 12px } .tools th, .tools td { text-align:left; padding:3px 8px; border-bottom:1px solid var(--line); font-variant-numeric:tabular-nums } .tools th { color:var(--mute); font-weight:500 } .tools td.num, .tools th.num { text-align:right } .tools tr.err td { color:var(--bad) }
.flag { color:var(--bad); background:#fef2f2 } ul.flags { margin:6px 0 12px; padding-left:18px } ul.flags li { margin:3px 0 } code { font:12px ui-monospace,SFMono-Regular,Menlo,monospace }
details summary { cursor:pointer; color:var(--mute); margin:8px 0 } .kv { display:grid; grid-template-columns:120px 1fr; gap:4px 12px } .kv div:nth-child(odd) { color:var(--mute) }
</style></head><body>
<header><h1>Made Well \xB7 the glass</h1><span class="mute" id="meta"></span>
<button id="first">\u23EE</button><button id="prev">\u25C0</button><button id="play">\u25B6 Play</button><button id="next">\u25B6</button><button id="last">\u23ED Now</button>
<input type="range" id="slider" min="0" value="0"><span id="pos" class="mute"></span></header>
<main><div id="steps"></div><div id="right"><div class="board" id="board"></div><div class="detail" id="detail"></div></div></main>
<script>
const DATA = ${JSON.stringify(data).replace(/</g, "\\u003c")};
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const LANE = ['discover','ideate','challenge','plan','test-plan','implement','verify','arbitrate'];
let steps = [], pos = 0, timer = null, selected = null;
function build() {
  steps = [...DATA.events.map((e) => ({ t: e.at, type: 'event', e })), ...DATA.calls.map((c) => ({ t: c.started, type: 'call', c }))]
    .sort((a, b) => a.t.localeCompare(b.t) || (a.type === 'call' ? -1 : 1));
}
function stateAt(n) {
  const s = {};
  for (const st of steps.slice(0, n + 1)) {
    if (st.type !== 'event') continue;
    if (!itemById(st.e.item)) continue;
    const e = st.e, d = e.data, it = (s[e.item] ??= { status: 'queued', job: 'ideate' });
    if (e.kind === 'created') { it.status = d.status ?? 'queued'; it.job = d.job; }
    else if (e.kind === 'handed-off') it.job = d.to;
    else if (e.kind === 'failure') it.job = 'arbitrate';
    else if (e.kind === 'ruling') { if (d.to) it.job = d.to; if (d.prerequisite) it.status = 'waiting-prerequisite'; else it.status = 'running'; }
    else if (e.kind === 'prerequisite-shipped') { it.job = 'verify'; it.status = 'running'; }
    else if (['held','shipped','discovered','running','waiting-quota'].includes(e.kind)) it.status = e.kind;
    else if (['retried','promoted'].includes(e.kind) || (e.kind === 'nq-answer' && d.originator === 'operator')) it.status = 'queued';
  }
  return s;
}
const itemById = (id) => DATA.items.find((i) => i.id === id);
const total = (t) => (t ? t.input + t.output + t.cacheRead + t.cacheWrite : 0);
const num = (n) => Number(n).toLocaleString('en-US');
const flagPills = (c) => c.flags.map((f) => ' <span class="pill flag">' + esc(f.rule) + '</span>').join('');
function label(st) {
  if (st.type === 'call') { const c = st.c; return '<b>' + esc(c.profile) + '</b> \xB7 ' + esc(c.kind) + ' ' + esc(c.job) + ' <span class="mute">#' + c.item + ' \xB7 ' + esc(c.card.harness + ' ' + c.card.model) + ' \xB7 ' + (c.ms / 1000).toFixed(1) + 's \xB7 ' + c.tools.length + ' tools' + (c.tokens ? ' \xB7 ' + num(total(c.tokens)) + ' tok' : '') + '</span>' + (c.outcome !== 'ok' ? ' <span class="pill status-held">' + esc(c.outcome) + '</span>' : '') + flagPills(c); }
  const e = st.e, d = e.data; let extra = '';
  if (e.kind.startsWith('runner-')) return '<b>' + esc(e.kind) + '</b> <span class="mute">pid ' + esc(d.pid) + (e.item ? ' \xB7 #' + e.item : '') + '</span>';
  if (e.kind === 'handoff') extra = esc(d.from) + ' \u2192 ' + esc(d.to);
  else if (e.kind === 'handed-off') extra = esc(d.from) + ' \u2192 ' + esc(d.to);
  else if (e.kind === 'nq-question') extra = esc(d.receiver) + ' asks ' + esc(d.originator) + ': ' + esc((d.questions || []).join(' \xB7 ')).slice(0, 140);
  else if (e.kind === 'nq-clear') extra = esc(d.profile) + ' is clear';
  else if (e.kind === 'shipped') extra = esc((d.output || '').trim().split('\\n').pop());
  else if (e.kind === 'held' || e.kind === 'ruling') extra = esc(d.code || d.cause || '');
  else if (e.kind === 'discovered') extra = (d.candidates || []).length + ' candidates';
  else if (e.kind === 'created') extra = esc(itemById(e.item)?.title || '');
  return '<b>' + esc(e.kind) + '</b> <span class="mute">#' + e.item + '</span> ' + extra;
}
function render() {
  const n = steps.length; document.getElementById('slider').max = Math.max(0, n - 1); document.getElementById('slider').value = pos;
  document.getElementById('pos').textContent = n ? (pos + 1) + ' / ' + n + ' \xB7 ' + new Date(steps[pos].t).toLocaleTimeString() : 'no steps yet';
  const shipped = DATA.items.filter((i) => i.status === 'shipped').length;
  const flagged = DATA.calls.filter((c) => c.flags.length).length, tokens = DATA.calls.reduce((n, c) => n + total(c.tokens), 0);
  document.getElementById('meta').textContent = DATA.items.length + ' items \xB7 ' + shipped + ' shipped \xB7 ' + DATA.calls.length + ' agent calls \xB7 ' + num(tokens) + ' tokens \xB7 ' + flagged + ' flagged \xB7 written ' + new Date(DATA.at).toLocaleString();
  document.getElementById('steps').innerHTML = steps.map((st, i) => '<div class="step' + (i === pos ? ' on' : '') + (i > pos ? ' future' : '') + '" data-i="' + i + '"><span class="n">' + (i + 1) + '</span><span>' + label(st) + '</span></div>').join('');
  const on = document.querySelector('.step.on'); if (on) on.scrollIntoView({ block: 'nearest' });
  const s = stateAt(pos), cur = steps[pos], curItem = cur ? (cur.type === 'call' ? cur.c.item : cur.e.item) : null;
  const disc = DATA.items.filter((i) => i.job === 'discover' && s[i.id]);
  const cards = (list) => list.map((i) => '<div class="card' + (i.id === curItem ? ' sel' : '') + '" data-item="' + i.id + '"><div><b>#' + i.id + '</b> ' + esc(i.title) + '</div><span class="pill status-' + s[i.id].status + '">' + esc(s[i.id].status) + '</span> <span class="mute">' + esc(s[i.id].job) + '</span></div>').join('') || '<div class="mute">\u2014</div>';
  const delivery = DATA.items.filter((i) => i.job !== 'discover' && s[i.id] && s[i.id].status !== 'candidate');
  const raw = disc[0]?.source || '';
  document.getElementById('board').innerHTML =
    '<div class="col"><h3>Raw input</h3><pre style="max-height:160px">' + esc(raw.slice(0, 1500)) + '</pre></div>' +
    '<div class="col"><h3>Discovery</h3>' + cards(disc) + '</div>' +
    '<div class="col"><h3>Queue</h3>' + cards(DATA.items.filter((i) => i.job !== 'discover' && (s[i.id]?.status === 'candidate' || (s[i.id]?.status === 'queued' && s[i.id].job === 'ideate')))) + '</div>' +
    ['ideation','planning','implementation','verification'].map((stage) => {
      const jobs = { ideation: ['ideate','challenge'], planning: ['plan','test-plan'], implementation: ['implement'], verification: ['verify','arbitrate'] }[stage];
      return '<div class="col"><h3>' + stage + '</h3>' + cards(delivery.filter((i) => jobs.includes(s[i.id].job) && !['shipped','queued'].includes(s[i.id].status))) + '</div>';
    }).join('') +
    '<div class="col"><h3>Shipped</h3>' + cards(delivery.filter((i) => s[i.id].status === 'shipped')) + '</div>';
  document.getElementById('detail').innerHTML = selected ? itemDetail(selected) : cur ? stepDetail(cur) : '<span class="mute">Waiting for the first step\u2026</span>';
}
function stepDetail(st) {
  if (st.type === 'call') {
    const c = st.c;
    return '<h2 style="margin:0 0 8px;font-size:16px">' + esc(c.profile) + ' \xB7 ' + esc(c.kind) + ' \xB7 ' + esc(c.job) + ' <span class="mute">item #' + c.item + '</span></h2>' +
      '<div class="kv"><div>card</div><div>' + esc(c.card.harness + ' \xB7 ' + c.card.provider + ' \xB7 ' + c.card.model + ' \xB7 ' + c.card.effort) + '</div><div>outcome</div><div>' + esc(c.outcome) + '</div><div>started</div><div>' + esc(c.started) + ' (' + (c.ms / 1000).toFixed(1) + 's)</div>' +
      '<div>tokens</div><div>' + (c.tokens ? num(total(c.tokens)) + ' <span class="mute">= ' + num(c.tokens.input) + ' in \xB7 ' + num(c.tokens.output) + ' out \xB7 ' + num(c.tokens.cacheRead) + ' cache read \xB7 ' + num(c.tokens.cacheWrite) + ' cache write</span>' : '<span class="mute">not reported</span>') + '</div>' +
      '<div>raw stream</div><div>' + num(c.rawBytes) + ' bytes <span class="mute">\xB7 <code>mw export ' + c.item + '</code></span></div></div>' +
      '<h3>Rule breaks</h3>' + (c.flags.length ? '<ul class="flags">' + c.flags.map((f) => '<li><span class="pill flag">' + esc(f.rule) + '</span> <code>' + esc(JSON.stringify(f.evidence)) + '</code></li>').join('') + '</ul>' : '<div class="mute">' + (c.facts ? 'none' : 'not checked: no facts recorded') + '</div>') +
      '<h3>Tool calls (' + c.tools.length + ')</h3>' + (c.tools.length ? '<table class="tools"><tr><th class="num">#</th><th>tool</th><th>input digest</th><th class="num">in bytes</th><th class="num">out bytes</th><th class="num">tokens</th><th>at</th><th class="num">ms</th></tr>' + c.tools.map((t) => '<tr' + (t.error ? ' class="err"' : '') + '><td class="num">' + t.seq + '</td><td>' + esc(t.tool) + (t.error ? ' (error)' : '') + '</td><td><code>' + esc(t.digest) + '</code></td><td class="num">' + num(t.inputBytes) + '</td><td class="num">' + num(t.outputBytes) + '</td><td class="num">' + (t.tokens ?? '\u2014') + '</td><td>' + esc(t.at ? new Date(t.at).toLocaleTimeString() : '\u2014') + '</td><td class="num">' + (t.ms ?? '\u2014') + '</td></tr>').join('') + '</table>' : '<div class="mute">none</div>') +
      (c.output ? '<h3>Answer</h3><pre>' + esc(c.output) + '</pre>' : '') + (c.error ? '<h3>Error</h3><pre>' + esc(c.error) + '</pre>' : '') +
      (c.facts ? '<details><summary>Facts</summary><pre>' + esc(JSON.stringify(c.facts, null, 2)) + '</pre></details>' : '') +
      '<details><summary>Packet (prompt)</summary><pre>' + esc(c.prompt) + '</pre></details><details><summary>System prompt</summary><pre>' + esc(c.system) + '</pre></details>';
  }
  return '<h2 style="margin:0 0 8px;font-size:16px">' + esc(st.e.kind) + ' <span class="mute">' + (st.e.item ? 'item #' + st.e.item : 'the runner') + ' \xB7 ' + esc(st.e.at) + '</span></h2><pre>' + esc(JSON.stringify(st.e.data, null, 2)) + '</pre>';
}
function itemDetail(id) {
  const i = itemById(id); if (!i) return '';
  return '<h2 style="margin:0 0 8px;font-size:16px">#' + i.id + ' ' + esc(i.title) + ' <button onclick="selected=null;render()">close</button></h2><div class="kv"><div>status now</div><div>' + esc(i.status) + '</div><div>objective</div><div>' + esc(i.objective) + '</div>' + (i.shipped ? '<div>shipped</div><div>' + esc(i.shipped.command) + '</div>' : '') + (i.hold ? '<div>hold</div><div>' + esc(i.hold.code + ': ' + i.hold.message) + '</div>' : '') + '</div>' +
    Object.entries(i.outputs || {}).map(([job, out]) => '<details><summary>' + esc(job) + ' deliverable</summary><pre>' + esc(out) + '</pre></details>').join('') + '<details><summary>Record</summary><pre>' + esc(JSON.stringify(i, null, 2)) + '</pre></details>';
}
const go = (i) => { pos = Math.max(0, Math.min(steps.length - 1, i)); selected = null; render(); };
document.getElementById('steps').onclick = (ev) => { const el = ev.target.closest('.step'); if (el) go(+el.dataset.i); };
document.getElementById('board').onclick = (ev) => { const el = ev.target.closest('.card'); if (el) { selected = +el.dataset.item; render(); } };
document.getElementById('slider').oninput = (ev) => go(+ev.target.value);
document.getElementById('first').onclick = () => go(0); document.getElementById('last').onclick = () => go(steps.length - 1);
document.getElementById('prev').onclick = () => go(pos - 1); document.getElementById('next').onclick = () => go(pos + 1);
document.getElementById('play').onclick = () => { if (timer) { clearInterval(timer); timer = null; document.getElementById('play').textContent = '\u25B6 Play'; return; } document.getElementById('play').textContent = '\u23F8 Pause'; timer = setInterval(() => { if (pos >= steps.length - 1) { clearInterval(timer); timer = null; document.getElementById('play').textContent = '\u25B6 Play'; } else go(pos + 1); }, 700); };
document.onkeydown = (ev) => { if (ev.key === 'ArrowRight') go(pos + 1); if (ev.key === 'ArrowLeft') go(pos - 1); };
build(); pos = Math.max(0, steps.length - 1); render();
</script></body></html>`;

// src/telemetry.ts
import { createHash } from "node:crypto";
import { appendFileSync, mkdirSync as mkdirSync3, readdirSync as readdirSync2, readFileSync as readFileSync4 } from "node:fs";
import { hostname } from "node:os";
import { dirname as dirname3, join as join6, matchesGlob, resolve as resolve4 } from "node:path";
import { fileURLToPath } from "node:url";

// src/lane.ts
var MAKERS = ["implement", "test-plan"];
var isMaker = (job) => job === "implement" || job === "test-plan";
var DELIVERY = [
  { job: "ideate", stage: "ideation", profile: "ideator", duty: "Shape the outcome and the smallest useful approach, and settle every design decision it raises. Do not implement." },
  { job: "challenge", stage: "ideation", profile: "ideation peer", duty: "Challenge the idea against the actual workspace: defects, missing constraints, unnecessary scope. Settle each finding with a decision. Do not implement." },
  { job: "plan", stage: "planning", profile: "planner", duty: "Inspect the workspace and write the contract: what is made and not made, the files the change may touch, the exact steps, and the done-when items. Settle every design choice. Do not implement." },
  { job: "test-plan", stage: "planning", profile: "test architect", duty: "From the plan alone, write the checks for this work item: for each done-when item, at least one shell command that exits 0 only when that item is done. Do not write product code." },
  { job: "implement", stage: "implementation", profile: "implementer", duty: "Execute the plan exactly as written. Do not design, improvise or change the plan, and never write or run checks of your own work." },
  { job: "verify", stage: "verification", profile: "made well", duty: "Made Well runs the item's own check commands against the implementer's change; exit 0 ships." }
];
var DISCOVER = {
  job: "discover",
  stage: "discovery",
  profile: "ideator",
  duty: `Turn the operator's raw input into separate candidate work items (features, bug fixes, chores), in the order they should be delivered; an item that builds on earlier ones names them under "after". Each item is one coherent piece of work that delivery can take alone; its text carries the purpose, scope and what done means, in the operator's terms. Surface uncertainty instead of guessing. Do not plan or implement.`
};
var ARBITER = {
  job: "arbitrate",
  stage: "verification",
  profile: "arbiter",
  duty: "A check failed or a step could not be done as written. Decide from the evidence whose it is: a pre-existing defect, a bad implementation, or a bad test."
};
var stepOf = (job) => job === "arbitrate" ? ARBITER : job === "discover" ? DISCOVER : DELIVERY.find((s) => s.job === job);
var RECEIVES = {
  discover: [],
  ideate: ["discover"],
  challenge: ["discover", "ideate"],
  plan: ["discover", "ideate", "challenge"],
  "test-plan": ["plan"],
  implement: ["plan"],
  verify: [],
  arbitrate: ["plan", "test-plan", "implement"]
};
var Text = Schema_exports.String;
var Decision = Schema_exports.Struct({
  question: Text,
  decision: Text,
  why: Text.annotate({ description: "how the three governing questions settle it" })
});
var Decisions = Schema_exports.Array(Decision).annotate({ description: "every decision this job settled, and why" });
var Resource = Schema_exports.Struct({
  kind: Text.annotate({ description: "for example database-branch, dev-clone, server" }),
  id: Text,
  teardown: Text.annotate({ description: "shell command that removes it" })
});
var Provisioned = Schema_exports.optionalKey(Schema_exports.Array(Resource).annotate({ description: "anything you started or created that is still standing; Made Well tears each down" }));
var DoneWhen = Schema_exports.Struct({ id: Text.annotate({ description: "short and unique, for example D1" }), text: Text });
var Check = Schema_exports.Struct({
  id: Text.annotate({ description: "short and unique, for example C1" }),
  doneWhen: Text.annotate({ description: "the id of the plan's done-when item this check proves" }),
  run: Text.annotate({ description: "shell command run from the repo root; exit 0 means the item is done" })
});
var Blocked = Schema_exports.Struct({ blocked: Schema_exports.NonEmptyString.annotate({ description: "what stops you doing the step as written; only when something does" }) });
var Candidate = Schema_exports.Struct({
  title: Text,
  kind: Schema_exports.Literals(["feature", "fix", "chore"]),
  objective: Text,
  text: Text,
  after: Schema_exports.optionalKey(Schema_exports.Array(Schema_exports.Int).annotate({ description: "positions (1 is the first) of earlier items in this list that must ship before this one starts, because it builds on them" }))
});
var PLAN = Schema_exports.Struct({
  making: Text,
  notMaking: Schema_exports.Array(Text),
  scope: Schema_exports.Array(Text).annotate({ description: 'every file the change may touch, repo-relative; a directory ends in "/". A change outside it is refused.' }),
  steps: Schema_exports.Array(Text).annotate({ description: "exact instructions with paths; nothing left to decide" }),
  doneWhen: Schema_exports.Array(DoneWhen),
  decisions: Decisions
});
var DELIVERABLES = {
  discover: Schema_exports.Struct({ items: Schema_exports.Array(Candidate) }),
  ideate: Schema_exports.Struct({ outcome: Text, approach: Text, decisions: Decisions }),
  challenge: Schema_exports.Struct({ findings: Schema_exports.Array(Schema_exports.Struct({ finding: Text, resolution: Text })), decisions: Decisions }),
  plan: PLAN,
  "test-plan": Schema_exports.Union([Schema_exports.Struct({ checks: Schema_exports.Array(Check), provisioned: Provisioned }), Blocked]),
  implement: Schema_exports.Union([Schema_exports.Struct({ summary: Text, provisioned: Provisioned }), Blocked]),
  arbitrate: Schema_exports.Struct({ cause: Schema_exports.Literals(["pre-existing", "implementation", "test", "undetermined"]), answer: Text, evidence: Text, provisioned: Provisioned })
};
var INTAKE = Schema_exports.Struct({
  understanding: Text,
  unclear: Schema_exports.Array(Text).annotate({ description: "What is unclear?" }),
  ambiguous: Schema_exports.Array(Text).annotate({ description: "What is ambiguous?" }),
  missing: Schema_exports.Array(Text).annotate({ description: "Do I have everything I need to proceed? What is missing." }),
  notes: Schema_exports.Array(Text).annotate({ description: "points the packet already settles; never an assumption or a choice" })
});
var ORIGINATOR = Schema_exports.Struct({ answer: Schema_exports.NonEmptyString, needsOperator: Schema_exports.Boolean });
var shapeOf = (schema) => JSON.parse(JSON.stringify(Schema_exports.toJsonSchemaDocument(schema).schema, (k, v) => k === "additionalProperties" ? void 0 : v));
var requiredOf = (schema) => {
  const s = shapeOf(schema);
  return s.required ?? [];
};
function decode5(schema, output) {
  const json = lastJson(output);
  if (!json) return { ok: false, reason: "The answer did not end with a JSON object." };
  const r = Schema_exports.decodeUnknownResult(schema)(json, { errors: "all" });
  return Result_exports.isSuccess(r) ? { ok: true, value: r.success } : { ok: false, reason: `The answer's JSON does not match its schema: ${r.failure.message}` };
}
var dupes = (ids) => ids.filter((id2, i) => ids.indexOf(id2) !== i);
function validate3(job, output, plan) {
  if (job === "discover") {
    const report = lastJson(output);
    if (!Array.isArray(report?.items)) return { ok: false, reason: 'The answer did not end with {"items": [...]}.' };
    const text2 = (v) => typeof v === "string" ? v.trim() : "";
    const all4 = report.items;
    const kept = all4.flatMap((i, n) => text2(i?.title) && text2(i?.objective) ? [n] : []);
    const items = kept.map((n, k) => {
      const i = all4[n];
      const after = [...new Set((Array.isArray(i.after) ? i.after : []).map((p) => kept.indexOf(Number(p) - 1)).filter((m) => m >= 0 && m < k))].map((m) => m + 1);
      return { title: text2(i.title), objective: text2(i.objective), text: text2(i.text), kind: i.kind === "fix" || i.kind === "chore" ? i.kind : "feature", ...after.length ? { after } : {} };
    });
    return { ok: true, value: { items } };
  }
  if (job === "verify") return { ok: false, reason: "verify is Made Well's own code, not an agent job." };
  const decoded = decode5(DELIVERABLES[job], output);
  if (!decoded.ok) return decoded;
  const value3 = decoded.value;
  if (job === "plan") {
    const p = value3;
    if (!p.scope.length) return { ok: false, reason: "The plan declares no scope: name every file the change may touch." };
    const outside = p.scope.filter((f) => f.startsWith("/") || f.split("/").includes(".."));
    if (outside.length) return { ok: false, reason: `Scope entries must be repo-relative paths inside the repo: ${outside.join(", ")}.` };
    if (!p.doneWhen.length) return { ok: false, reason: "The plan has no done-when items." };
    if (dupes(p.doneWhen.map((d) => d.id)).length) return { ok: false, reason: `Done-when ids repeat: ${dupes(p.doneWhen.map((d) => d.id)).join(", ")}.` };
  }
  if (job === "test-plan" && "checks" in value3 && plan) {
    const checks = value3.checks;
    const ids = plan.doneWhen.map((d) => d.id);
    const unknown2 = checks.filter((c) => !ids.includes(c.doneWhen)).map((c) => `${c.id} \u2192 ${c.doneWhen}`);
    const uncovered = ids.filter((id2) => !checks.some((c) => c.doneWhen === id2));
    const repeated = dupes(checks.map((c) => c.id));
    if (unknown2.length || uncovered.length || repeated.length) {
      return { ok: false, reason: [unknown2.length && `Checks name done-when ids the plan does not have: ${unknown2.join(", ")}.`, uncovered.length && `Done-when items without a check: ${uncovered.join(", ")}.`, repeated.length && `Check ids repeat: ${repeated.join(", ")}.`].filter(Boolean).join(" ") };
    }
  }
  return { ok: true, value: value3 };
}
var MAX_CORRECTIONS = 3;
var blockedOf = (job, value3) => typeof value3.blocked === "string" ? `The ${stepOf(job).profile} (${job}) could not do the step as written: ${value3.blocked}` : void 0;
function route(job, value3, corrections) {
  if (job === "discover") return { to: "discovered", items: value3.items };
  const blocked = blockedOf(job, value3);
  if (blocked) return { to: "arbitrate", failure: blocked };
  if (job === "plan") return { to: "split" };
  if (job === "test-plan" || job === "implement") return { to: "next", job: "verify" };
  if (job === "arbitrate") {
    const cause = value3.cause;
    const answer2 = value3.answer;
    if (cause === "undetermined") return { to: "hold", code: "arbiter_undetermined", message: `The arbiter could not decide whose failure this is: ${answer2}` };
    if (corrections >= MAX_CORRECTIONS) return { to: "hold", code: "too_many_corrections", message: `${corrections} corrections have not made the checks pass. Last ruling: ${cause}: ${answer2}` };
    if (cause === "pre-existing") return { to: "prerequisite", answer: answer2 };
    return { to: "rework", job: cause === "test" ? "test-plan" : "plan", cause, answer: answer2 };
  }
  const i = DELIVERY.findIndex((s) => s.job === job);
  return { to: "next", job: DELIVERY[i + 1].job };
}
function lastJson(text2) {
  text2 = text2.replace(/\s*```\s*$/, "");
  for (let start = text2.lastIndexOf("{"); start !== -1; start = text2.lastIndexOf("{", start - 1)) {
    try {
      const value3 = JSON.parse(text2.slice(start).trim());
      if (value3 && typeof value3 === "object" && !Array.isArray(value3)) return value3;
    } catch {
    }
  }
  return void 0;
}

// src/telemetry.ts
var WRITE_TOOLS = ["Edit", "Write", "MultiEdit", "NotebookEdit", "edit_file", "create_file", "undo_edit", "file_change", "edit", "write"];
var lines3 = (raw) => raw.split("\n").flatMap((l) => {
  try {
    const e = JSON.parse(l);
    return e && typeof e === "object" ? [e] : [];
  } catch {
    return [];
  }
});
var bytes2 = (v) => v === void 0 || v === null ? 0 : Buffer.byteLength(typeof v === "string" ? v : JSON.stringify(v));
var digest = (v) => createHash("sha256").update(JSON.stringify(v ?? null)).digest("hex").slice(0, 16);
var num = (v) => typeof v === "number" && Number.isFinite(v) ? v : 0;
var timeOf = (e) => {
  const t = e.mw_at ?? e.timestamp ?? e.message?.timestamp;
  const ms = typeof t === "number" ? t : typeof t === "string" ? Date.parse(t) : NaN;
  return Number.isFinite(ms) ? ms : null;
};
var CODEX_TOOLS = {
  command_execution: (i) => ({ tool: "command_execution", input: i.command, output: i.aggregated_output }),
  file_change: (i) => ({ tool: "file_change", input: i.changes, output: null }),
  mcp_tool_call: (i) => ({ tool: `${i.server}.${i.tool}`, input: i.arguments, output: i.result ?? i.error }),
  web_search: (i) => ({ tool: "web_search", input: i.query, output: null })
};
function toolEvents(harness, raw) {
  const open = /* @__PURE__ */ new Map();
  const issue = (id2, tool, input, t, tokens) => {
    if (!open.has(id2)) open.set(id2, { seq: open.size + 1, tool, digest: digest(input), inputBytes: bytes2(input), outputBytes: 0, tokens, at: t === null ? null : new Date(t).toISOString(), ms: null, error: false, t });
  };
  const finish = (id2, output, t, error) => {
    const e = open.get(id2);
    if (!e) return;
    e.outputBytes = bytes2(output);
    e.error = error;
    if (e.t !== null && t !== null) e.ms = t - e.t;
  };
  const seen = /* @__PURE__ */ new Set();
  const stepTokens = /* @__PURE__ */ new Map();
  for (const e of lines3(raw ?? "")) {
    const t = timeOf(e);
    if (harness === "claude" || harness === "amp") {
      const blocks = Array.isArray(e.message?.content) ? e.message.content : [];
      if (e.type === "assistant") {
        let fresh2 = !e.message.id || !seen.has(e.message.id);
        if (e.message.id) seen.add(e.message.id);
        for (const b of blocks.filter((b2) => b2.type === "tool_use")) {
          issue(b.id, b.name, b.input, t, fresh2 ? num(e.message.usage?.output_tokens) : null);
          fresh2 = false;
        }
      } else if (e.type === "user") {
        for (const b of blocks.filter((b2) => b2.type === "tool_result")) finish(b.tool_use_id, b.content, t, b.is_error === true);
      }
    } else if (harness === "codex") {
      const item = e.item;
      const shape = item && CODEX_TOOLS[item.type];
      if (!shape || e.type !== "item.started" && e.type !== "item.completed") continue;
      const { tool, input, output } = shape(item);
      const started = open.has(item.id);
      issue(item.id, tool, input, t, null);
      if (e.type === "item.completed") finish(item.id, output, started ? t : null, item.status === "failed" || num(item.exit_code) !== 0);
    } else if (e.type === "message_end" && e.message?.role === "assistant") {
      const first = (e.message.content ?? []).find((c) => c.type === "toolCall");
      if (first) stepTokens.set(first.id, num(e.message.usage?.output));
    } else if (e.type === "tool_execution_start") {
      issue(e.toolCallId, e.toolName, e.args, t, stepTokens.get(e.toolCallId) ?? null);
    } else if (e.type === "tool_execution_end") {
      finish(e.toolCallId, e.result, t, e.isError === true);
    }
  }
  return [...open.values()].map(({ t: _, ...event }) => event);
}
function tokensOf(harness, raw) {
  const evs = lines3(raw ?? "");
  const sum3 = (usages, pick3) => usages.length ? usages.map(pick3).reduce((a, b) => ({ input: a.input + b.input, output: a.output + b.output, cacheRead: a.cacheRead + b.cacheRead, cacheWrite: a.cacheWrite + b.cacheWrite })) : null;
  if (harness === "claude" || harness === "amp") {
    const anthropic = (u) => ({ input: num(u.input_tokens), output: num(u.output_tokens), cacheRead: num(u.cache_read_input_tokens), cacheWrite: num(u.cache_creation_input_tokens) });
    const total = evs.findLast((e) => e.type === "result" && e.usage);
    if (total) return anthropic(total.usage);
    const seen = /* @__PURE__ */ new Set();
    const steps = evs.filter((e) => {
      if (e.type !== "assistant" || !e.message?.usage) return false;
      if (!e.message.id) return true;
      if (seen.has(e.message.id)) return false;
      seen.add(e.message.id);
      return true;
    });
    return sum3(steps.map((e) => e.message.usage), anthropic);
  }
  if (harness === "codex") {
    return sum3(evs.filter((e) => e.type === "turn.completed" && e.usage).map((e) => e.usage), (u) => ({ input: Math.max(0, num(u.input_tokens) - num(u.cached_input_tokens)), output: num(u.output_tokens), cacheRead: num(u.cached_input_tokens), cacheWrite: num(u.cache_write_input_tokens) }));
  }
  return sum3(evs.filter((e) => e.type === "message_end" && e.message?.role === "assistant" && e.message.usage).map((e) => e.message.usage), (u) => ({ input: num(u.input), output: num(u.output), cacheRead: num(u.cacheRead), cacheWrite: num(u.cacheWrite) }));
}
var totalTokens = (t) => t ? t.input + t.output + t.cacheRead + t.cacheWrite : 0;
var inScope = (file, scope3) => {
  const f = file.replace(/^\.\//, "");
  return scope3.some((s) => {
    const p = s.replace(/^\.\//, "");
    return /[*?[{]/.test(p) ? matchesGlob(f, p) : f === p || f.startsWith(p.endsWith("/") ? p : `${p}/`);
  });
};
function flagsFor(facts, observed) {
  const flags = [];
  const used = [...new Set(observed.tools.map((t) => t.tool))];
  if (facts.access === "read") {
    const tools = used.filter((t) => WRITE_TOOLS.includes(t));
    const files = facts.changed ?? [];
    if (tools.length || files.length) flags.push({ rule: "write-under-read", evidence: { tools, files } });
  }
  if (facts.head && facts.head.before !== facts.head.after) flags.push({ rule: "head-moved", evidence: { ...facts.head } });
  if (facts.scope && facts.changed) {
    const files = facts.changed.filter((f) => !inScope(f, facts.scope));
    if (files.length) flags.push({ rule: "out-of-scope", evidence: { files, scope: facts.scope } });
  }
  if (facts.budget) {
    const tokens = totalTokens(observed.tokens);
    const over = { ...facts.budget.tokens !== void 0 && tokens > facts.budget.tokens ? { tokens } : {}, ...facts.budget.ms !== void 0 && observed.ms > facts.budget.ms ? { ms: observed.ms } : {} };
    if (Object.keys(over).length) flags.push({ rule: "over-budget", evidence: { ...over, budget: facts.budget } });
  }
  if (facts.allowlist) {
    const tools = used.filter((t) => !facts.allowlist.includes(t));
    if (tools.length) flags.push({ rule: "tool-not-allowed", evidence: { tools, allowlist: facts.allowlist } });
  }
  if (facts.required) {
    const answer2 = lastJson(observed.output ?? "") ?? {};
    const fields = facts.required.filter((f) => !(f in answer2));
    if (fields.length) flags.push({ rule: "missing-fields", evidence: { fields } });
  }
  return flags;
}
var build2;
var buildOf = () => {
  if (build2 !== void 0) return build2;
  try {
    const here = dirname3(fileURLToPath(import.meta.url));
    const hash2 = createHash("sha256");
    for (const f of readdirSync2(here).filter((f2) => /\.(ts|mjs)$/.test(f2)).sort()) hash2.update(f).update(readFileSync4(join6(here, f)));
    build2 = hash2.digest("hex").slice(0, 12);
  } catch {
    build2 = null;
  }
  return build2;
};
var KEEP = /* @__PURE__ */ new Set(["kind", "job", "profile", "harness", "provider", "account", "model", "effort", "outcome", "status", "code", "cause", "rule", "flags", "tool", "tools", "allowlist", "required", "fields", "access", "digest", "exceeded", "verdict", "tier", "prescribed", "from", "to", "by", "receiver", "originator", "ref", "main", "on", "commit", "verifiedOn", "conflict", "before", "after", "id", "doneWhen", "name", "trace", "span", "parent", "at", "started", "start", "since", "resetsAt", "workspace", "harnessVersion"]);
var metrics = (v, key = "") => typeof v === "string" ? KEEP.has(key) ? v : v.length : Array.isArray(v) ? v.map((x) => metrics(x, key)) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, metrics(x, k)])) : v;
function telemetry(storePath2) {
  const dir = process.env.MW_TELEMETRY;
  if (!dir || storePath2 === ":memory:") return void 0;
  const host = hostname();
  const store = createHash("sha256").update(resolve4(storePath2)).digest("hex").slice(0, 8);
  const file = join6(resolve4(dir), `${host}-${store}.jsonl`);
  const full = [void 0, "", "full"].includes(process.env.MW_TELEMETRY_LEVEL);
  return {
    file,
    write(t, record2) {
      try {
        mkdirSync3(dirname3(file), { recursive: true });
        appendFileSync(file, JSON.stringify({ t, host, store, build: buildOf(), ...full ? record2 : metrics(record2) }, (_, v) => typeof v === "bigint" ? String(v) : v) + "\n");
      } catch {
      }
    }
  };
}
var nanosToMs = (n) => Number(n / 1000000n);
var debugLayer = (file, sink) => Layer_exports.unwrap(Effect_exports.sync(() => {
  if (!sink && process.env.MW_DEBUG !== "1") return Layer_exports.empty;
  const write = sink ? (span2) => sink.write("span", span2) : (span2) => {
    mkdirSync3(dirname3(file), { recursive: true });
    appendFileSync(file, JSON.stringify(span2, (_, v) => typeof v === "bigint" ? String(v) : v) + "\n");
  };
  return Layer_exports.succeed(Tracer_exports.Tracer, Tracer_exports.make({
    span(options) {
      const span2 = new Tracer_exports.NativeSpan(options);
      const end2 = span2.end.bind(span2);
      span2.end = (endTime, exit4) => {
        end2(endTime, exit4);
        const parent = options.parent._tag === "Some" ? options.parent.value.spanId : null;
        const outcome = exit4._tag === "Success" ? "ok" : "error";
        write({ name: span2.name, trace: span2.traceId, span: span2.spanId, parent, start: new Date(nanosToMs(span2.startTime)).toISOString(), ms: nanosToMs(endTime - span2.startTime), outcome, attributes: Object.fromEntries(span2.attributes) });
      };
      return span2;
    }
  }));
}));
var WHILE_HELD = ["alerted", "torn-down", "worktree-leftovers"];
var minutesBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 6e3) / 10;
function stats(lines4) {
  const projects = /* @__PURE__ */ new Map();
  const calls = /* @__PURE__ */ new Map();
  const items = /* @__PURE__ */ new Map();
  const latest = /* @__PURE__ */ new Map();
  let from = null;
  let to = null;
  const tally = () => ({ calls: 0, minutes: 0, tokens: 0, refused: 0 });
  const kinds = () => ({ intake: 0, originator: 0, execute: 0 });
  const project = (host, workspace) => {
    const key = `${host}\0${workspace}`;
    if (!projects.has(key)) projects.set(key, { host, workspace, ...tally(), kinds: kinds(), items: { created: 0, shipped: 0, held: 0 }, nq: { intakes: 0, questions: 0, share: 0 }, leadTime: { median: null, slowest: null, shipped: [], open: [] }, flags: {}, jobs: {}, cards: {} });
    return projects.get(key);
  };
  const refused = /* @__PURE__ */ new Set();
  for (const line of lines4) {
    let r;
    try {
      r = JSON.parse(line);
    } catch {
      continue;
    }
    const at = r.at ?? r.started;
    if (at) {
      if (!from || at < from) from = at;
      if (!to || at > to) to = at;
      const s = `${r.host}\0${r.store}`;
      if (at > (latest.get(s) ?? "")) latest.set(s, at);
    }
    if (r.t === "rejected") refused.add(`${r.host}\0${r.store}\0${r.call}`);
    if (!r.workspace) continue;
    const p = project(r.host, r.workspace);
    if (r.t === "event") {
      if (r.kind === "created") p.items.created++;
      if (r.kind === "shipped") p.items.shipped++;
      if (r.kind === "held") p.items.held++;
      if (r.kind === "nq-question") p.nq.questions += r.data?.questions?.length ?? 0;
      const key = `${r.host}\0${r.store}\0${r.item}`;
      if (r.kind === "created" && r.data?.job !== "discover") items.set(key, { p, item: r.item, store: r.store, created: r.at, status: r.data?.status === "candidate" ? "candidate" : "running" });
      const i = items.get(key);
      if (i && r.kind === "shipped") i.shipped = r.at;
      else if (i && r.kind === "promoted") i.created = r.at, i.status = "running";
      else if (i && r.kind === "held") i.status = "held";
      else if (i && r.kind !== "created" && !WHILE_HELD.includes(r.kind)) i.status = "running";
    }
    if (r.t === "call") {
      const card = `${r.card.harness} \xB7 ${r.card.model} \xB7 ${r.card.effort}`;
      const minutes2 = r.ms / 6e4;
      const tokens = totalTokens(r.tokens);
      const job = p.jobs[r.job] ??= { ...tally(), kinds: kinds() };
      for (const t of [p, job, p.cards[card] ??= tally()]) {
        t.calls++;
        t.minutes += minutes2;
        t.tokens += tokens;
        if (r.outcome === "rejected") t.refused++;
      }
      for (const t of [p, job]) t.kinds[r.kind] = (t.kinds[r.kind] ?? 0) + minutes2;
      if (r.kind === "intake") p.nq.intakes++;
      for (const f of r.flags ?? []) p.flags[f.rule] = (p.flags[f.rule] ?? 0) + 1;
      calls.set(`${r.host}\0${r.store}\0${r.id}`, { p, job: r.job, card });
    }
  }
  for (const key of refused) {
    const c = calls.get(key);
    if (c) for (const t of [c.p, c.p.jobs[c.job], c.p.cards[c.card]]) t.refused++;
  }
  for (const i of items.values()) {
    const ref = { item: i.item, store: i.store };
    if (i.shipped) i.p.leadTime.shipped.push({ ...ref, minutes: minutesBetween(i.created, i.shipped) });
    else i.p.leadTime.open.push({ ...ref, status: i.status, minutes: minutesBetween(i.created, latest.get(`${i.p.host}\0${i.store}`)) });
  }
  const tenth = (n) => Math.round(n * 10) / 10;
  const round2 = (t) => {
    t.minutes = tenth(t.minutes);
    for (const k in t.kinds) t.kinds[k] = tenth(t.kinds[k]);
    return t;
  };
  return {
    from,
    to,
    projects: [...projects.values()].map((p) => {
      const lt = p.leadTime;
      lt.shipped.sort((a, b) => b.minutes - a.minutes);
      lt.open.sort((a, b) => b.minutes - a.minutes);
      const n = lt.shipped.length;
      lt.slowest = lt.shipped[0] ?? null;
      lt.median = n ? tenth((lt.shipped[Math.floor((n - 1) / 2)].minutes + lt.shipped[Math.floor(n / 2)].minutes) / 2) : null;
      p.nq.share = p.minutes ? Math.round((p.kinds.intake + p.kinds.originator) / p.minutes * 100) / 100 : 0;
      round2(p);
      Object.values(p.jobs).forEach(round2);
      Object.values(p.cards).forEach(round2);
      return p;
    })
  };
}

// src/store.ts
var defaultStorePath = () => process.env.MW_STORE ?? join7(process.env.MW_HOME ?? join7(homedir2(), ".local", "share", "madewell"), "madewell.db");
var alive2 = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e.code !== "ESRCH";
  }
};
function openStore(path) {
  mkdirSync4(dirname4(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(`PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;
		CREATE TABLE IF NOT EXISTS items (id INTEGER PRIMARY KEY AUTOINCREMENT, doc TEXT NOT NULL);
		CREATE TABLE IF NOT EXISTS events (seq INTEGER PRIMARY KEY AUTOINCREMENT, item INTEGER NOT NULL, at TEXT NOT NULL, kind TEXT NOT NULL, data TEXT NOT NULL);
		CREATE TABLE IF NOT EXISTS calls (id INTEGER PRIMARY KEY AUTOINCREMENT, item INTEGER NOT NULL, kind TEXT NOT NULL, job TEXT NOT NULL, profile TEXT NOT NULL, card TEXT NOT NULL, system TEXT NOT NULL, prompt TEXT NOT NULL, outcome TEXT NOT NULL, output TEXT, error TEXT, raw TEXT, started TEXT NOT NULL, ms INTEGER NOT NULL);
		CREATE TABLE IF NOT EXISTS tool_events (call INTEGER NOT NULL, seq INTEGER NOT NULL, tool TEXT NOT NULL, digest TEXT NOT NULL, input_bytes INTEGER NOT NULL, output_bytes INTEGER NOT NULL, tokens INTEGER, at TEXT, ms INTEGER, error INTEGER NOT NULL, PRIMARY KEY (call, seq));
		CREATE TABLE IF NOT EXISTS accounts (account TEXT PRIMARY KEY, resets_at INTEGER NOT NULL);
		CREATE TABLE IF NOT EXISTS runner (id INTEGER PRIMARY KEY CHECK (id = 1), pid INTEGER NOT NULL, since TEXT NOT NULL, item INTEGER);`);
  const sink = telemetry(path);
  let pending2;
  const emit = (t, record2) => pending2 ? pending2.push([t, record2]) : sink?.write(t, record2);
  const tx2 = (fn3) => {
    db.exec("BEGIN IMMEDIATE");
    pending2 = [];
    try {
      const r = fn3();
      db.exec("COMMIT");
      const committed = pending2;
      pending2 = void 0;
      for (const [t, record2] of committed) sink?.write(t, record2);
      return r;
    } catch (e) {
      pending2 = void 0;
      db.exec("ROLLBACK");
      throw e;
    }
  };
  const glass = join7(dirname4(path), "glass.html");
  const insertTools = (call, tools) => {
    const insert = db.prepare("INSERT INTO tool_events (call, seq, tool, digest, input_bytes, output_bytes, tokens, at, ms, error) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    for (const t of tools) insert.run(call, t.seq, t.tool, t.digest, t.inputBytes, t.outputBytes, t.tokens, t.at, t.ms, t.error ? 1 : 0);
  };
  tx2(() => {
    const columns = db.prepare("PRAGMA table_info(calls)").all().map((c) => c.name);
    if (columns.includes("tokens")) return;
    db.exec("ALTER TABLE calls ADD COLUMN tokens TEXT; ALTER TABLE calls ADD COLUMN facts TEXT; ALTER TABLE calls ADD COLUMN flags TEXT NOT NULL DEFAULT '[]'");
    for (const c of db.prepare("SELECT id, card, raw FROM calls WHERE raw IS NOT NULL").all()) {
      const harness = JSON.parse(c.card).harness;
      const tokens = tokensOf(harness, c.raw);
      db.prepare("UPDATE calls SET tokens = ? WHERE id = ?").run(tokens && JSON.stringify(tokens), c.id);
      insertTools(c.id, toolEvents(harness, c.raw));
    }
  });
  const event = (item, kind, data) => {
    const at = (/* @__PURE__ */ new Date()).toISOString();
    const { lastInsertRowid } = db.prepare("INSERT INTO events (item, at, kind, data) VALUES (?, ?, ?, ?)").run(item, at, kind, JSON.stringify(data));
    emit("event", { seq: Number(lastInsertRowid), item, workspace: read(item)?.workspace ?? null, at, kind, data });
  };
  const view2 = () => {
    try {
      writeFileSync5(`${glass}.tmp`, replayHtml(snapshot3(store)));
      renameSync(`${glass}.tmp`, glass);
    } catch {
    }
  };
  const read = (id2) => {
    const row = db.prepare("SELECT doc FROM items WHERE id = ?").get(id2);
    return row && JSON.parse(row.doc);
  };
  const store = {
    path,
    glass,
    create(fields) {
      const created = tx2(() => {
        const now2 = (/* @__PURE__ */ new Date()).toISOString();
        const { lastInsertRowid } = db.prepare("INSERT INTO items (doc) VALUES (?)").run("{}");
        const item = { job: "ideate", from: { kind: "dispatcher" }, status: "queued", outputs: {}, ...fields, id: Number(lastInsertRowid), round: 1, corrections: 0, launches: 0, created: now2, updated: now2 };
        db.prepare("UPDATE items SET doc = ? WHERE id = ?").run(JSON.stringify(item), item.id);
        event(item.id, "created", { title: item.title, job: item.job, status: item.status, parent: item.parent ?? null, discovery: item.discovery ?? null });
        return item;
      });
      view2();
      return created;
    },
    get(id2) {
      return read(id2);
    },
    /** Saves the new state of an item together with the event that explains it. */
    save(item, kind, data = {}) {
      const next = { ...item, updated: (/* @__PURE__ */ new Date()).toISOString() };
      tx2(() => {
        db.prepare("UPDATE items SET doc = ? WHERE id = ?").run(JSON.stringify(next), item.id);
        event(item.id, kind, data);
      });
      view2();
      return next;
    },
    list() {
      return db.prepare("SELECT doc FROM items ORDER BY id").all().map((r) => JSON.parse(r.doc));
    },
    events(id2) {
      return db.prepare("SELECT * FROM events WHERE item = ? ORDER BY seq").all(id2).map((r) => ({ ...r, data: JSON.parse(r.data) }));
    },
    /** Records one call with its tool events, tokens and rule-break flags, read from its raw stream and the engine's facts. The harness version goes only to telemetry. */
    recordCall(call, facts) {
      const tools = toolEvents(call.card.harness, call.raw);
      const tokens = tokensOf(call.card.harness, call.raw);
      const flags = facts ? flagsFor(facts, { tools, tokens, ms: call.ms, output: call.output }) : [];
      return tx2(() => {
        const id2 = Number(db.prepare("INSERT INTO calls (item, kind, job, profile, card, system, prompt, outcome, output, error, raw, started, ms, tokens, facts, flags) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(call.item, call.kind, call.job, call.profile, JSON.stringify(call.card), call.system, call.prompt, call.outcome, call.output, call.error, call.raw, call.started, call.ms, tokens && JSON.stringify(tokens), facts ? JSON.stringify(facts) : null, JSON.stringify(flags)).lastInsertRowid);
        insertTools(id2, tools);
        const { system, prompt, output, raw, ...summary } = call;
        emit("call", { id: id2, ...summary, workspace: read(call.item)?.workspace ?? null, tokens, flags, facts: facts ?? null, tools, system, prompt, output, raw });
        return id2;
      });
    },
    /** The engine refused a call's answer: the call is on the record as rejected, with the reason. */
    rejectCall(id2, reason) {
      db.prepare("UPDATE calls SET outcome = 'rejected', error = ? WHERE id = ?").run(reason, id2);
      emit("rejected", { call: id2, at: (/* @__PURE__ */ new Date()).toISOString(), reason });
    },
    /** Every call, or one item's, oldest first. */
    calls(item) {
      const rows = db.prepare(`SELECT * FROM calls ${item === void 0 ? "" : "WHERE item = ?"} ORDER BY id`).all(...item === void 0 ? [] : [item]);
      const tools = db.prepare("SELECT seq, tool, digest, input_bytes AS inputBytes, output_bytes AS outputBytes, tokens, at, ms, error FROM tool_events WHERE call = ? ORDER BY seq");
      return rows.map((r) => ({
        ...r,
        card: JSON.parse(r.card),
        tokens: r.tokens ? JSON.parse(r.tokens) : null,
        facts: r.facts ? JSON.parse(r.facts) : null,
        flags: JSON.parse(r.flags),
        tools: tools.all(r.id).map((t) => ({ ...t, error: t.error === 1 }))
      }));
    },
    allEvents() {
      return db.prepare("SELECT * FROM events ORDER BY seq").all().map((r) => ({ ...r, data: JSON.parse(r.data) }));
    },
    exhausted() {
      return Object.fromEntries(db.prepare("SELECT account, resets_at FROM accounts").all().map((r) => [r.account, r.resets_at]));
    },
    markExhausted(account, resetsAt) {
      db.prepare("INSERT INTO accounts (account, resets_at) VALUES (?, ?) ON CONFLICT (account) DO UPDATE SET resets_at = MAX(resets_at, excluded.resets_at)").run(account, resetsAt);
    },
    /** One runner drives the store at a time. A dead runner's claim is taken over, and its loss recorded against the item it was on. */
    claimRunner() {
      return Effect_exports.suspend(() => {
        const owner = tx2(() => {
          const row = db.prepare("SELECT pid, since, item FROM runner WHERE id = 1").get();
          if (row && row.pid !== process.pid && alive2(row.pid)) return row;
          if (row && row.pid !== process.pid) event(row.item ?? 0, "runner-lost", { pid: row.pid, since: row.since, item: row.item });
          db.prepare("INSERT INTO runner (id, pid, since) VALUES (1, ?, ?) ON CONFLICT (id) DO UPDATE SET pid = excluded.pid, since = excluded.since, item = NULL").run(process.pid, (/* @__PURE__ */ new Date()).toISOString());
          event(0, "runner-started", { pid: process.pid, ...row && row.pid !== process.pid ? { replaced: row.pid } : {} });
          return void 0;
        });
        if (!owner) return Effect_exports.sync(view2);
        const busy = owner.item === null ? void 0 : read(owner.item);
        return Effect_exports.fail(new MadeWellError({
          code: "store_locked",
          message: "Another live runner owns this Made Well store.",
          context: { store: path, owner: { pid: owner.pid, since: owner.since, item: busy ? { id: busy.id, title: busy.title, job: busy.job, status: busy.status } : null } },
          cause: "One runner drives a store at a time, so two runners never work the same item.",
          next: [
            { run: busy ? `mw status ${busy.id}` : "mw status", why: "see what the running owner is doing; queued work will reach it automatically" },
            { run: `kill ${owner.pid} && mw run`, why: "only if that runner is hung: work resumes at the job that was interrupted" }
          ]
        }));
      });
    },
    /**
     * Retention: removes these items and everything recorded about them (events, calls, tool events, and the
     * evals of those calls), with the runner's own events from before the cutoff, then gives the space back.
     * Returns what each table lost; a dry run only counts. The caller holds the runner claim.
     */
    prune(ids, before, dryRun) {
      const items = `(${ids.join(",")})`;
      const calls = `(SELECT id FROM calls WHERE item IN ${items})`;
      const evals = db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'evals'").get() !== void 0;
      const from = {
        evals: evals && `evals WHERE NOT EXISTS (SELECT 1 FROM json_each(evals.calls) j JOIN calls c ON c.id = j.value WHERE c.item NOT IN ${items})`,
        evalCalls: evals && `eval_calls WHERE call IN ${calls}`,
        toolEvents: `tool_events WHERE call IN ${calls}`,
        calls: `calls WHERE item IN ${items}`,
        events: `events WHERE item IN ${items} OR (item = 0 AND at < '${new Date(before).toISOString()}')`,
        items: `items WHERE id IN ${items}`
      };
      const each = (sql) => Object.fromEntries(Object.entries(from).map(([k, t]) => [k, t ? sql(t) : 0]));
      if (dryRun) return each((t) => db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n);
      const removed = tx2(() => {
        const r = each((t) => Number(db.prepare(`DELETE FROM ${t}`).run().changes));
        if (Object.values(r).some(Boolean)) event(0, "pruned", { before, ...r, ids });
        return r;
      });
      view2();
      if (db.prepare("PRAGMA freelist_count").get().freelist_count) db.exec("VACUUM");
      db.exec("PRAGMA wal_checkpoint(TRUNCATE)");
      return removed;
    },
    runnerOn(item) {
      db.prepare("UPDATE runner SET item = ? WHERE id = 1 AND pid = ?").run(item, process.pid);
    },
    releaseRunner() {
      tx2(() => {
        if (db.prepare("DELETE FROM runner WHERE id = 1 AND pid = ?").run(process.pid).changes) event(0, "runner-stopped", { pid: process.pid });
      });
      view2();
    },
    close() {
      db.close();
    }
  };
  return store;
}
var Store = class extends Context_exports.Service()("madewell/Store") {
};
var storeLayer = (path = defaultStorePath()) => Layer_exports.mergeAll(
  Layer_exports.effect(Store, Effect_exports.acquireRelease(Effect_exports.sync(() => openStore(path)), (s) => Effect_exports.sync(() => s.close()))),
  debugLayer(join7(dirname4(path), "debug.jsonl"), telemetry(path))
);

// src/project.ts
var Project = Schema_exports.Struct({
  path: Schema_exports.String.annotate({ description: "the project's absolute workspace path" }),
  ship: Schema_exports.optionalKey(Schema_exports.NonEmptyString.annotate({ description: "shell command run in the workspace once Made Well has brought a passing item onto main: deploy it" })),
  alert: Schema_exports.optionalKey(Schema_exports.NonEmptyString.annotate({ description: "shell command run once per hold, with the hold as JSON on stdin and MW_ITEM, MW_TITLE, MW_HOLD, MW_MESSAGE set" }))
}).annotate({ identifier: "Project" });
var Registry = Schema_exports.fromJsonString(Schema_exports.Array(Project));
var projectsPath = (storePath2) => join8(dirname5(storePath2), "projects.json");
var readProjects = Effect_exports.fn("mw.readProjects")(function* (path) {
  if (!existsSync2(path)) return [];
  return yield* Schema_exports.decodeUnknownEffect(Registry)(readFileSync5(path, "utf8")).pipe(
    Effect_exports.mapError((e) => new MadeWellError({
      code: "projects_invalid",
      message: `The project registry ${path} is not valid.`,
      context: { path, problems: String(e) },
      cause: "It must be a JSON array of {path, ship?, alert?}.",
      next: [{ run: `cat ${path}`, why: "fix the entries named in context.problems" }]
    }))
  );
});
var projectFor = (projects, workspace) => projects.filter((p) => workspace === p.path || workspace.startsWith(p.path + sep)).sort((a, b) => b.path.length - a.path.length)[0];
var saveProject = Effect_exports.fn("mw.saveProject")(function* (path, project) {
  const projects = yield* readProjects(path);
  const merged = { ...projects.find((p) => p.path === project.path), ...project };
  mkdirSync5(dirname5(path), { recursive: true });
  writeFileSync6(path, JSON.stringify([...projects.filter((p) => p.path !== project.path), merged], null, 2) + "\n");
  return merged;
});
var openHolds = (store) => store.list().filter((i) => i.status === "held" && i.hold !== void 0).map((item) => {
  const events2 = store.events(item.id);
  const at = events2.findLastIndex((e) => e.kind === "held");
  const alert = events2.slice(at + 1).find((e) => e.kind === "alerted");
  return {
    item: item.id,
    title: item.title,
    workspace: item.workspace,
    ...item.hold,
    since: events2[at]?.at ?? item.updated,
    alerted: alert ? { at: alert.at, exitCode: alert.data.exitCode } : null
  };
}).sort((a, b) => a.since.localeCompare(b.since));
var alertHolds = Effect_exports.fn("mw.alertHolds")(function* (registry2) {
  const store = yield* Store;
  const holds = openHolds(store).filter((h) => !h.alerted);
  if (!holds.length) return;
  const projects = yield* readProjects(registry2);
  for (const hold2 of holds) {
    const command2 = projectFor(projects, hold2.workspace)?.alert;
    if (!command2) continue;
    const exitCode = yield* Effect_exports.promise(() => new Promise((done3) => {
      const env = { ...process.env, MW_ITEM: String(hold2.item), MW_TITLE: hold2.title, MW_HOLD: hold2.code, MW_MESSAGE: hold2.message };
      const child = execFile3("sh", ["-c", command2], { cwd: dirname5(registry2), env }, (error) => done3(error ? typeof error.code === "number" ? error.code : 1 : 0));
      child.stdin?.end(JSON.stringify(hold2));
    }));
    store.save(store.get(hold2.item), "alerted", { code: hold2.code, command: command2, exitCode });
  }
});

// src/engine.ts
var MAX_LAUNCHES = 3;
var MAX_TURNS = 3;
var UNKNOWN_RESET_MS = 60 * 6e4;
var MIN_OUT_MS = 5 * 6e4;
var NQ_HOLDS = ["nq_turns", "question_for_operator", "authority"];
var CHECK_HOLDS = ["arbiter_undetermined", "too_many_corrections"];
var DONE = ["held", "shipped", "discovered", "candidate"];
var READY = ["queued", "running", "waiting-quota", "waiting-prerequisite"];
var INTAKE_TIER = "intake";
var notFound2 = (id2) => new MadeWellError({ code: "item_not_found", message: `There is no work item #${id2}.`, context: { id: id2 }, next: [{ run: "mw status", why: "list every work item and its state" }] });
var profileOf = (o) => o.kind === "job" ? stepOf(o.job).profile : o.kind;
var trackOf = (item, job) => isMaker(job) && item.split?.[job] || { from: item.from, exchange: item.exchange, launches: item.launches, pickingUp: item.pickingUp, rejected: item.rejected };
var withTrack = (item, job, t) => isMaker(job) && item.split?.[job] ? { ...item, split: { ...item.split, [job]: t } } : { ...item, from: t.from, exchange: t.exchange, launches: t.launches, pickingUp: t.pickingUp, rejected: t.rejected };
var saveTrack = (store, id2, job, patch, kind, data, fields = {}) => {
  const now2 = store.get(id2);
  return store.save(withTrack({ ...now2, ...fields }, job, { ...trackOf(now2, job), ...patch }), kind, data);
};
var hold = (store, item, code, message, context3, next) => void store.save({ ...item, status: "held", hold: { code, message, context: context3, ...next?.length ? { next } : {} } }, "held", { code, message });
var holdFor = (store, id2, e, job) => hold(store, store.get(id2), e.code, e.message, { ...job ? { job } : {}, ...e.context }, e.next);
var deliverableOf = (item, job) => {
  const out = item.outputs[job];
  return out === void 0 ? void 0 : lastJson(out) ?? out;
};
var planOf = (item) => {
  const v = item.outputs.plan === void 0 ? void 0 : validate3("plan", item.outputs.plan);
  return v?.ok ? v.value : void 0;
};
function handoffOf(item, job, t) {
  if (job === "arbitrate") return item.failure ?? "";
  if (t.from.kind === "dispatcher") return "The operator's objective and source, under item.";
  if (item.rework) return `Ruling (${item.rework.cause}): ${item.rework.answer}`;
  return t.from.kind === "job" ? item.outputs[t.from.job] ?? "" : "";
}
var drive = Effect_exports.fn("mw.drive")(function* (id2, config) {
  const store = yield* Store;
  yield* Effect_exports.annotateCurrentSpan({ item: id2 });
  for (; ; ) {
    const item = store.get(id2);
    if (!item) return yield* notFound2(id2);
    if (DONE.includes(item.status) || unshipped(store, item).length) return item;
    if (item.waitsOn !== void 0) {
      const pre = yield* drive(item.waitsOn, config);
      if (pre.status !== "shipped") return store.get(id2);
      store.save({ ...item, waitsOn: void 0, status: "running", job: "verify", exchange: void 0, launches: 0, verification: void 0 }, "prerequisite-shipped", { prerequisite: pre.id });
      continue;
    }
    store.runnerOn(id2);
    yield* advance(item, config).pipe(Effect_exports.catchTag("MadeWellError", (e) => Effect_exports.sync(() => holdFor(store, id2, e))));
  }
});
var advance = Effect_exports.fn("mw.advance")(function* (item, config) {
  const store = yield* Store;
  if (!item.base) {
    const base = yield* branchOf(item.workspace);
    store.save({ ...item, base }, "base", { ref: base.ref, main: base.commit });
    return;
  }
  if (pending(item).length) return yield* aftercare(item.id);
  if (item.job === "verify") return yield* verifyAndShip(item.id, config);
  if (item.split) return yield* runSplit(item.id, config);
  return yield* step(item.id, item.job, config);
});
var step = Effect_exports.fn("mw.step")(function* (id2, job, config) {
  const store = yield* Store;
  const item = store.get(id2);
  const t = trackOf(item, job);
  const x = t.exchange;
  if (!x) {
    saveTrack(store, id2, job, { exchange: { from: t.from, handoff: handoffOf(item, job, t), status: "awaiting-receiver", turns: [] } }, "handoff", { from: profileOf(t.from), to: stepOf(job).profile, job });
  } else if (x.status === "awaiting-receiver") {
    yield* intake(id2, job, config);
  } else if (x.status === "awaiting-originator") {
    yield* originate(id2, job, config);
  } else {
    yield* execute(id2, job, config);
  }
});
var runSplit = Effect_exports.fn("mw.split")(function* (id2, config) {
  const store = yield* Store;
  const track2 = (job) => Effect_exports.gen(function* () {
    for (; ; ) {
      const item2 = store.get(id2);
      if (item2.status === "held" || item2.split?.[job]?.done) return;
      yield* step(id2, job, config).pipe(Effect_exports.catchTag("MadeWellError", (e) => Effect_exports.sync(() => holdFor(store, id2, e, job))));
    }
  });
  yield* Effect_exports.all(MAKERS.map(track2), { concurrency: "unbounded" });
  const item = store.get(id2);
  if (item.status === "held" || !MAKERS.every((m) => item.split?.[m]?.done)) return;
  const blocked = MAKERS.flatMap((m) => {
    const failure = blockedOf(m, deliverableOf(item, m) ?? {});
    return failure ? [{ job: m, failure }] : [];
  });
  const joined = { ...item, split: void 0, exchange: void 0, launches: 0, pickingUp: void 0, rejected: void 0 };
  if (blocked.length) {
    store.save({ ...joined, job: "arbitrate", from: { kind: "job", job: blocked[0].job }, failure: blocked.map((b) => b.failure).join("\n\n") }, "failure", { from: blocked.map((b) => b.job) });
    return;
  }
  store.save({ ...joined, job: "verify", from: { kind: "job", job: "implement" } }, "handed-off", { from: MAKERS, to: "verify" });
});
var intake = Effect_exports.fn("mw.intake")(function* (id2, job, config) {
  const store = yield* Store;
  const p = config.prescriptions;
  const card = yield* pickOrWait(id2, preferred(store, store.get(id2), job, p, yield* Clock_exports.currentTimeMillis));
  if (!card) return;
  const cheap = pickCard(p.tiers[INTAKE_TIER] ?? [], store.exhausted(), yield* Clock_exports.currentTimeMillis).card ?? card;
  const item = store.get(id2);
  const x = trackOf(item, job).exchange;
  const call = yield* callAgent(id2, job, config, {
    kind: "intake",
    profile: stepOf(job).profile,
    access: INTAKE_ACCESS,
    card: cheap,
    required: requiredOf(INTAKE),
    packet: (dir) => packet(item, job, dir, receiverParts(item, job, x, "intake"))
  });
  if (!call) return;
  const reply = decode5(INTAKE, call.output);
  if (!reply.ok) return yield* refuse(id2, job, call, reply.reason);
  const { understanding, unclear, ambiguous, missing: missing2, notes } = reply.value;
  const questions = [...unclear, ...ambiguous, ...missing2].filter((q) => q.trim() !== "");
  const receiver = stepOf(job).profile;
  if (!questions.length) {
    saveTrack(store, id2, job, { launches: 0, rejected: void 0, exchange: { ...x, status: "clear", understanding, notes: [...notes], card } }, "nq-clear", { job, profile: receiver, card, intakeCard: cheap });
    return;
  }
  const asked = { ...x, status: "awaiting-originator", turns: [...x.turns, { understanding, questions }] };
  const answered = x.turns.filter((t) => t.answer !== void 0).length;
  const context3 = { job, receiver, originator: profileOf(x.from), questions, turns: x.turns };
  const now2 = withTrack(store.get(id2), job, { ...trackOf(store.get(id2), job), exchange: asked });
  if (answered >= MAX_TURNS) return hold(store, now2, "nq_turns", `The ${receiver} still has questions after ${answered} answered turns: the hand-off or its scope is wrong.`, context3);
  if (x.from.kind === "operator" || x.turns.at(-1)?.by === "operator") {
    return hold(store, now2, "question_for_operator", `The ${receiver} has questions about your answer before it can ${job}.`, context3);
  }
  saveTrack(store, id2, job, { launches: 0, rejected: void 0, exchange: asked }, "nq-question", { job, receiver, originator: profileOf(x.from), questions });
});
var originate = Effect_exports.fn("mw.originate")(function* (id2, job, config) {
  const store = yield* Store;
  const item0 = store.get(id2);
  const x0 = trackOf(item0, job).exchange;
  const by = x0.from.kind === "job" ? x0.from.job : "ideate";
  const card = yield* pickOrWait(id2, cardsFor(config.prescriptions, by));
  if (!card) return;
  const item = store.get(id2);
  const x = trackOf(item, job).exchange;
  const from = profileOf(x.from);
  const call = yield* callAgent(id2, job, config, {
    kind: "originator",
    profile: from,
    access: "read",
    card,
    required: requiredOf(ORIGINATOR),
    packet: (dir) => packet(item, by, dir, originatorParts(item, job, x), x.from.kind === "job")
  });
  if (!call) return;
  const reply = decode5(ORIGINATOR, call.output);
  if (!reply.ok) return yield* refuse(id2, job, call, reply.reason);
  const turns = x.turns.map((t, i) => i === x.turns.length - 1 ? { ...t, answer: reply.value.answer, by: "originator" } : t);
  if (reply.value.needsOperator) {
    const pendingQ = x.turns.at(-1);
    return hold(store, store.get(id2), "authority", `Only the operator can settle what the ${stepOf(job).profile} asked.`, { job, receiver: stepOf(job).profile, originator: from, questions: pendingQ.questions, originatorSays: reply.value.answer });
  }
  saveTrack(store, id2, job, { launches: 0, rejected: void 0, exchange: { ...x, status: "awaiting-receiver", turns } }, "nq-answer", { job, originator: from });
});
var execute = Effect_exports.fn("mw.execute")(function* (id2, job, config) {
  const store = yield* Store;
  const item = store.get(id2);
  const t = trackOf(item, job);
  const x = t.exchange;
  const now2 = yield* Clock_exports.currentTimeMillis;
  if (!x.card || (store.exhausted()[x.card.account] ?? 0) > now2) {
    saveTrack(store, id2, job, { exchange: { ...x, status: "awaiting-receiver", card: void 0 } }, "nq-replacement", { job, from: x.card ?? null });
    return;
  }
  const home = itemHome(store.path, id2);
  const plan = planOf(item);
  const maker = isMaker(job);
  yield* callAgent(id2, job, config, {
    kind: "execute",
    profile: stepOf(job).profile,
    access: prescriptionOf(config.prescriptions, job).access,
    card: x.card,
    required: requiredOf(DELIVERABLES[job]),
    ...job === "implement" && plan ? { scope: plan.scope } : {},
    // The arbiter works on the candidate Made Well verified: the change committed on main, the checks applied.
    ...job === "arbitrate" && item.verification ? { at: item.verification.on } : {},
    prepare: (dir) => maker ? applyPatch(dir, patchPath(home, `${job}.partial`)) : job === "arbitrate" ? candidate(item, dir) : Effect_exports.void,
    ...maker ? { onFail: (dir) => keepPartial(dir, item, job) } : {},
    packet: (dir) => packet(item, job, dir, executeParts(item, job, t, x))
  }, (dir, call) => accept(id2, job, dir, call));
});
var callAgent = (id2, job, config, spec, after) => Effect_exports.scoped(Effect_exports.gen(function* () {
  const store = yield* Store;
  const worker = yield* Worker;
  const item = store.get(id2);
  const p = config.prescriptions;
  const wt = yield* worktree(item.workspace, spec.at ?? item.base.commit, `item-${id2}-${job}-${spec.kind}`);
  if (spec.prepare) yield* spec.prepare(wt.path);
  const prompt = yield* spec.packet(wt.path);
  const budget = budgetFor(p, job);
  const harness = harnessOf(p, spec.card.harness);
  const none3 = spec.access === "none";
  const read = spec.access === "read";
  const product = none3 ? void 0 : yield* capture(item.workspace);
  const before = read || none3 ? void 0 : yield* capture(wt.path);
  const head3 = before?.head ?? (yield* revParse(wt.path, "HEAD"));
  const started = /* @__PURE__ */ new Date();
  let result3;
  const run2 = worker.run({ kind: spec.kind, job, profile: spec.profile, card: spec.card, access: spec.access, system: BRIEF, prompt, item: id2, cwd: wt.path, budget, ...harness ? { harness } : {} }).pipe(
    Effect_exports.tap((r) => Effect_exports.sync(() => result3 = r)),
    Effect_exports.withSpan(`mw.${spec.kind}.${job}`, { attributes: { item: id2, job, kind: spec.kind, profile: spec.profile, harness: spec.card.harness, model: spec.card.model, account: spec.card.account } })
  );
  let changed;
  if (read) {
    const r = yield* Effect_exports.result(readOnly(wt.path, run2));
    if (Result_exports.isFailure(r)) {
      if (r.failure.code !== "workspace_written" || !result3) return yield* r.failure;
      changed = r.failure.context.changes;
    }
  } else if (none3) {
    yield* run2;
  } else {
    yield* run2;
    changed = changes(before, yield* capture(wt.path));
  }
  const res = result3;
  const call = {
    item: id2,
    kind: spec.kind,
    job,
    profile: spec.profile,
    card: spec.card,
    system: BRIEF,
    prompt,
    outcome: res.ok ? "ok" : "limit" in res ? "limit" : "error",
    output: res.ok ? res.output : null,
    error: res.ok ? null : "limit" in res ? res.limit.message : res.error,
    raw: res.raw ?? null,
    started: started.toISOString(),
    ms: Date.now() - started.getTime(),
    harnessVersion: res.version ?? null
  };
  const callId = store.recordCall(call, {
    access: spec.access,
    head: { before: head3, after: changed?.head?.to ?? head3 },
    changed: changed ? [...changed.added, ...changed.removed, ...changed.modified] : [],
    ...spec.scope ? { scope: spec.scope } : {},
    budget: { ...budget.tokens !== void 0 ? { tokens: budget.tokens } : {}, ms: budget.minutes * 6e4 },
    ...harness ? { allowlist: harness.tools[spec.access] } : {},
    required: spec.required
  });
  if (!res.ok) {
    if (spec.onFail) yield* spec.onFail(wt.path);
    if ("limit" in res) yield* recordLimit(id2, job, spec.card, res.limit, spec.kind);
    else yield* launchFailed(id2, job, spec.card, res.error, res.overBudget ? { overBudget: res.overBudget } : {});
    return void 0;
  }
  if (read && changed) {
    const reason = `The ${spec.kind} call changed its read-only checkout: ${[...changed.added, ...changed.removed, ...changed.modified].join(", ") || "refs or HEAD"}.`;
    store.rejectCall(callId, reason);
    yield* launchFailed(id2, job, spec.card, reason, { changes: changed });
    return void 0;
  }
  const left = product ? yield* Effect_exports.result(withLock(item.workspace, leftovers(item.workspace, product))) : void 0;
  if (left && Result_exports.isFailure(left)) {
    store.rejectCall(callId, left.failure.message);
    holdFor(store, id2, left.failure, job);
    return void 0;
  }
  const called = { output: res.output, callId, card: spec.card, ...before ? { before } : {} };
  return after ? yield* after(wt.path, called) : called;
}));
var refuse = Effect_exports.fn("mw.refuse")(function* (id2, job, call, reason) {
  const store = yield* Store;
  store.rejectCall(call.callId, reason);
  yield* launchFailed(id2, job, call.card, reason, {}, { rejected: reason });
});
var accept = Effect_exports.fn("mw.accept")(function* (id2, job, dir, call) {
  const store = yield* Store;
  const item = store.get(id2);
  const plan = planOf(item);
  const home = itemHome(store.path, id2);
  const v = validate3(job, call.output, plan);
  const keep = isMaker(job) ? keepPartial(dir, item, job) : Effect_exports.void;
  const refused = (reason) => Effect_exports.andThen(keep, refuse(id2, job, call, reason));
  if (!v.ok) return yield* refused(v.reason);
  const value3 = v.value;
  if (isMaker(job) || job === "arbitrate") {
    yield* guardMain(store, item).pipe(Effect_exports.tapError((e) => Effect_exports.andThen(keep, Effect_exports.sync(() => store.rejectCall(call.callId, e.message)))));
  }
  let artifacts = {};
  if (isMaker(job) && !blockedOf(job, value3)) {
    const base = item.base.commit;
    if (job === "implement") {
      const scoped3 = yield* Effect_exports.result(scopeCheck(dir, base, plan.scope));
      if (Result_exports.isFailure(scoped3)) {
        if (scoped3.failure.code !== "out_of_scope") return yield* scoped3.failure;
        const { outside } = scoped3.failure.context;
        return yield* refused(`You changed files outside the plan's scope: ${outside.join(", ")}. Your checkout still holds them: revert them, or report {"blocked": ...} if the plan cannot be done within its scope.`);
      }
    }
    const { files, patch } = yield* takeChange(dir, base);
    if (job === "implement" && !files.length) return yield* refused("You reported the plan done, but your checkout has no change.");
    const product = files.filter((f) => covers(plan.scope, f));
    if (job === "test-plan" && product.length) return yield* refused(`Checks may not touch the plan's scope, which is product code: ${product.join(", ")}. Write check files at other paths.`);
    writePatch(patchPath(home, job === "implement" ? "change" : "checks"), patch);
    artifacts = job === "implement" ? { change: { files } } : { checks: { checks: value3.checks, files } };
    const stray = yield* Effect_exports.result(leftovers(dir, call.before));
    if (Result_exports.isFailure(stray)) store.save(store.get(id2), "worktree-leftovers", { job, files: stray.failure.context.files });
  }
  if (isMaker(job)) rmSync5(patchPath(home, `${job}.partial`), { force: true });
  const now2 = store.get(id2);
  const provisioned = [...now2.provisioned ?? [], ...(value3.provisioned ?? []).map((r) => ({ kind: r.kind, id: r.id, teardown: r.teardown, job }))];
  const fields = { outputs: { ...now2.outputs, [job]: call.output }, provisioned, ...artifacts };
  const settled = { launches: 0, pickingUp: void 0, rejected: void 0, exchange: void 0 };
  if (isMaker(job) && now2.split?.[job]) {
    saveTrack(store, id2, job, { ...settled, done: true }, "accepted", { job }, fields);
  } else {
    applyRoute(store, id2, job, value3, { ...fields, ...settled });
  }
  yield* aftercare(id2, job);
});
function applyRoute(store, id2, job, value3, fields) {
  const current = { ...store.get(id2), ...fields };
  const r = route(job, value3, current.corrections);
  const by = { kind: "job", job };
  switch (r.to) {
    case "discovered": {
      const ids = [];
      for (const { after, ...c } of r.items) {
        ids.push(store.create({
          title: c.title,
          objective: c.objective,
          kind: c.kind,
          workspace: current.workspace,
          status: "candidate",
          discovery: current.id,
          source: current.source,
          from: by,
          outputs: { discover: JSON.stringify(c) },
          ...after ? { after: after.map((p) => ids[p - 1]) } : {}
        }).id);
      }
      store.save({ ...current, status: "discovered" }, "discovered", { candidates: ids });
      return;
    }
    case "next":
      store.save({ ...current, job: r.job, from: by, rework: void 0 }, "handed-off", { from: job, to: r.job });
      return;
    case "split":
      store.save({
        ...current,
        job: "implement",
        from: by,
        rework: void 0,
        change: void 0,
        checks: void 0,
        verification: void 0,
        merged: void 0,
        split: { implement: { from: by, launches: 0 }, "test-plan": { from: by, launches: 0 } }
      }, "handed-off", { from: job, to: MAKERS });
      return;
    case "arbitrate":
      store.save({ ...current, job: "arbitrate", from: by, failure: r.failure }, "failure", { from: job });
      return;
    case "rework":
      store.save({
        ...current,
        job: r.job,
        from: by,
        rework: { cause: r.cause, answer: r.answer },
        failure: void 0,
        round: current.round + 1,
        corrections: current.corrections + 1,
        ...r.job === "plan" ? { base: void 0 } : {}
      }, "ruling", { cause: r.cause, to: r.job, by: "arbiter" });
      return;
    case "prerequisite":
      openPrerequisite(store, { ...current, from: by }, r.answer, by);
      return;
    case "hold":
      return hold(store, current, r.code, r.message, { job, failure: current.failure ?? null, ruling: value3 });
  }
}
var covers = (scope3, file) => scope3.some((d) => d.endsWith("/") || d.endsWith("/**") ? file.startsWith(d.replace(/\*\*$/, "")) : file === d);
var keepPartial = (dir, item, job) => Effect_exports.gen(function* () {
  const { patch } = yield* takeChange(dir, item.base.commit);
  const path = patchPath(itemHome((yield* Store).path, item.id), `${job}.partial`);
  if (patch) writePatch(path, patch);
  else rmSync5(path, { force: true });
});
var candidate = (item, dir) => Effect_exports.gen(function* () {
  const home = itemHome((yield* Store).path, item.id);
  yield* Effect_exports.ignore(Effect_exports.andThen(applyPatch(dir, patchPath(home, "change")), commit(dir, item.title)));
  yield* Effect_exports.ignore(applyPatch(dir, patchPath(home, "checks")));
});
var locks = /* @__PURE__ */ new Map();
var withLock = (repo, effect2) => {
  let lock = locks.get(repo);
  if (!lock) locks.set(repo, lock = Semaphore_exports.makeUnsafe(1));
  return lock.withPermit(effect2);
};
var expectedMain = (store, item) => {
  let best = store.events(item.id).findLast((e) => e.kind === "base" || e.kind === "merged");
  for (const other of store.list()) {
    if (other.id === item.id || other.workspace !== item.workspace || !other.merged) continue;
    const e = store.events(other.id).findLast((e2) => e2.kind === "merged");
    if (e && (!best || e.seq > best.seq)) best = e;
  }
  return best?.data.main ?? item.base.commit;
};
var guardMain = (store, item) => withLock(item.workspace, Effect_exports.suspend(() => headGuard(item.workspace, item.base.ref, expectedMain(store, item))));
var pending = (item, job) => (item.provisioned ?? []).filter((r) => (!job || r.job === job) && r.torn?.exitCode !== 0);
var aftercare = Effect_exports.fn("mw.aftercare")(function* (id2, job) {
  const store = yield* Store;
  const todo = pending(store.get(id2), job);
  if (!todo.length) return;
  const home = itemHome(store.path, id2);
  mkdirSync6(home, { recursive: true });
  const r = yield* Effect_exports.result(teardown(todo, home));
  const records = Result_exports.isSuccess(r) ? r.success : r.failure.context.records;
  const now2 = store.get(id2);
  const provisioned = (now2.provisioned ?? []).map((p) => {
    const torn = todo.some((t) => t.kind === p.kind && t.id === p.id && t.job === p.job) ? records.find((x) => x.kind === p.kind && x.id === p.id) : void 0;
    return torn ? { ...p, torn } : p;
  });
  store.save({ ...now2, provisioned }, "torn-down", { job: job ?? null, records: records.map((x) => ({ kind: x.kind, id: x.id, exitCode: x.exitCode })) });
  if (Result_exports.isFailure(r)) holdFor(store, id2, r.failure, job);
});
var verifyAndShip = Effect_exports.fn("mw.verifyAndShip")(function* (id2, config) {
  const store = yield* Store;
  let item = store.get(id2);
  if (!item.merged) {
    const main = yield* revParse(item.workspace, item.base.ref);
    if (!item.verification?.passed || item.verification.on !== main) {
      yield* verify(id2, config);
      item = store.get(id2);
      if (item.job !== "verify" || !item.verification?.passed) return;
    }
    const projects = projectsPath(store.path);
    if (!projectFor(yield* readProjects(projects), item.workspace)?.ship) {
      return hold(store, item, "no_ship_command", `Item #${id2} passed its checks, but its project has no ship command.`, { workspace: item.workspace, projects });
    }
    const verified = item.verification;
    const merged = yield* withLock(item.workspace, Effect_exports.gen(function* () {
      const now2 = yield* revParse(item.workspace, item.base.ref);
      if (now2 !== verified.on) return false;
      yield* bringOnto(item.workspace, item.base.ref, now2, verified.commit);
      store.save({ ...store.get(id2), merged: { ref: item.base.ref, commit: verified.commit } }, "merged", { ref: item.base.ref, main: verified.commit, from: now2 });
      return true;
    }));
    if (!merged) return void store.save(store.get(id2), "main-moved", { verifiedOn: verified.on });
  }
  yield* shipCommand(id2);
});
var verify = Effect_exports.fn("mw.verify")(function* (id2, config) {
  const store = yield* Store;
  const item = store.get(id2);
  const home = itemHome(store.path, id2);
  const checks = item.checks?.checks ?? [];
  if (!checks.length || !item.change) {
    store.save({ ...item, job: "plan", from: { kind: "dispatcher" }, base: void 0, exchange: void 0, launches: 0 }, "replan", { reason: "no checks or change on record to verify" });
    return;
  }
  const run2 = yield* Effect_exports.scoped(Effect_exports.gen(function* () {
    const wt = yield* worktree(item.workspace, item.base.ref, `item-${id2}-verify`);
    const change = yield* Effect_exports.result(applyPatch(wt.path, patchPath(home, "change")));
    if (Result_exports.isFailure(change)) return { kind: "conflict", by: "implement", on: wt.base, error: change.failure };
    const built = yield* commit(wt.path, item.title);
    const applied = yield* Effect_exports.result(applyPatch(wt.path, patchPath(home, "checks")));
    if (Result_exports.isFailure(applied)) return { kind: "conflict", by: "test-plan", on: wt.base, error: applied.failure };
    return { kind: "ran", on: wt.base, commit: built, results: yield* runChecks2(wt.path, checks, budgetFor(config.prescriptions, "verify"), { ...process.env, MW_ITEM: String(id2) }) };
  }));
  const now2 = store.get(id2);
  if (run2.kind === "conflict") {
    const what = run2.by === "implement" ? "The implementer's change" : "The test architect's check files";
    const failure2 = `${what} no longer apply to ${now2.base.ref} at ${run2.on.slice(0, 12)}, which moved since the item started.
${run2.error.context.stderr ?? run2.error.message}`;
    store.save({ ...now2, job: "arbitrate", from: { kind: "job", job: run2.by }, failure: failure2, exchange: void 0, launches: 0 }, "failure", { from: "verify", conflict: run2.by });
    return;
  }
  const passed = run2.results.every((r) => r.exitCode === 0);
  const verification = { on: run2.on, commit: run2.commit, results: run2.results, passed };
  const summary = run2.results.map((r) => ({ id: r.id, doneWhen: r.doneWhen, exitCode: r.exitCode, ms: r.ms }));
  if (passed) {
    store.save({ ...now2, verification }, "verified", { on: run2.on, results: summary });
    return;
  }
  const failed = run2.results.filter((r) => r.exitCode !== 0);
  const failure = [
    `${failed.length} of ${run2.results.length} checks failed when Made Well ran them on ${now2.base.ref} at ${run2.on.slice(0, 12)} with the implementer's change.`,
    ...failed.map((r) => `Check ${r.id} (done-when ${r.doneWhen}) exited ${r.exitCode}: ${r.run}
${r.output}`)
  ].join("\n\n");
  store.save({ ...now2, verification, job: "arbitrate", from: { kind: "job", job: "test-plan" }, failure, exchange: void 0, launches: 0 }, "failure", { from: "verify", results: summary });
});
var shipCommand = Effect_exports.fn("mw.ship")(function* (id2) {
  const store = yield* Store;
  const item = store.get(id2);
  const projects = projectsPath(store.path);
  const command2 = projectFor(yield* readProjects(projects), item.workspace)?.ship;
  if (!command2) return hold(store, item, "no_ship_command", `Item #${id2} is on ${item.merged.ref}, but its project has no ship command.`, { workspace: item.workspace, projects });
  const env = { ...process.env, MW_ITEM: String(id2), MW_TITLE: item.title, MW_KIND: item.kind ?? "feature", MW_COMMIT: item.merged.commit };
  const { code, stdout, stderr } = yield* Effect_exports.promise(
    () => new Promise((done3) => execFile4("sh", ["-c", command2], { cwd: item.workspace, maxBuffer: 16 * 1024 * 1024, env }, (error, stdout2, stderr2) => done3({ code: error ? typeof error.code === "number" ? error.code : 1 : 0, stdout: stdout2, stderr: stderr2 })))
  );
  const tail2 = (s) => s.slice(-4e3);
  if (code !== 0) return hold(store, item, "ship_failed", `Item #${id2} is on ${item.merged.ref}, but its ship command failed with exit code ${code}.`, { workspace: item.workspace, command: command2, exitCode: code, stdout: tail2(stdout), stderr: tail2(stderr) });
  removeHome(itemHome(store.path, id2));
  store.save({ ...item, status: "shipped", shipped: { command: command2, output: tail2(stdout), main: item.merged.commit } }, "shipped", { command: command2, output: tail2(stdout), main: item.merged.commit });
});
var preferred = (store, item, job, p, now2) => {
  const cards = cardsFor(p, job);
  if (job !== "test-plan" || !item.split) return cards;
  const other = item.split.implement?.exchange?.card ?? pickCard(cardsFor(p, "implement"), store.exhausted(), now2).card;
  return other ? [...cards.filter((c) => c.harness !== other.harness), ...cards.filter((c) => c.harness === other.harness)] : cards;
};
var pickOrWait = Effect_exports.fn("mw.pickOrWait")(function* (id2, cards) {
  const store = yield* Store;
  for (; ; ) {
    const item = store.get(id2);
    if (item.status === "held") return void 0;
    const now2 = yield* Clock_exports.currentTimeMillis;
    const picked = pickCard(cards, store.exhausted(), now2);
    if (picked.card) {
      if (item.status !== "running") store.save({ ...item, status: "running", resetsAt: void 0 }, "running", { job: item.job });
      return picked.card;
    }
    if (item.status !== "waiting-quota" || item.resetsAt !== picked.resetsAt) {
      store.save({ ...item, status: "waiting-quota", resetsAt: picked.resetsAt }, "waiting-quota", { job: item.job, resetsAt: new Date(picked.resetsAt).toISOString() });
    }
    yield* Effect_exports.sleep(Math.max(0, picked.resetsAt - now2));
  }
});
var recordLimit = Effect_exports.fn("mw.recordLimit")(function* (id2, job, card, limit, kind) {
  const store = yield* Store;
  const at = yield* Clock_exports.currentTimeMillis;
  const resetsAt = Math.max(limit.resetsAt ?? at + UNKNOWN_RESET_MS, at + MIN_OUT_MS);
  for (const account of /* @__PURE__ */ new Set([limit.account, card.account])) store.markExhausted(account, resetsAt);
  const t = trackOf(store.get(id2), job);
  const profile = stepOf(job).profile;
  const pickingUp = kind === "execute" ? `The ${profile}'s previous run of this job, on ${card.harness} \xB7 ${card.model}, stopped at a usage limit (${limit.message}). You are picking up the same job${isMaker(job) ? ": your checkout holds the work it had done. Continue from there; do not repeat it." : "."}` : t.pickingUp;
  saveTrack(store, id2, job, { pickingUp }, "quota-swap", { kind, job, from: card, account: limit.account, resetsAt: new Date(resetsAt).toISOString(), message: limit.message });
});
var launchFailed = Effect_exports.fn("mw.launchFailed")(function* (id2, job, card, error, evidence = {}, patch = {}) {
  const store = yield* Store;
  const item = store.get(id2);
  const t = trackOf(item, job);
  const launches = t.launches + 1;
  if (launches < MAX_LAUNCHES) {
    saveTrack(store, id2, job, { ...patch, launches }, "launch-failed", { job, card, error, ...evidence });
    return;
  }
  hold(store, withTrack(item, job, { ...t, ...patch, launches }), "worker_failing", `A call for the ${job} job failed ${launches} times in a row on ${card.harness} \xB7 ${card.model}.`, { job, card, lastError: error, ...evidence });
});
var unshipped = (store, item) => (item.after ?? []).filter((id2) => store.get(id2)?.status !== "shipped");
var stuck = (store, item) => {
  const blocked = (id2) => ((p) => !p || p.status === "held" || p.status === "candidate" || stuck(store, p))(store.get(id2));
  return item.waitsOn !== void 0 && blocked(item.waitsOn) || unshipped(store, item).some(blocked);
};
var openPrerequisite = (store, item, answer2, by) => {
  const pre = store.create({
    title: `Pre-existing defect blocking #${item.id}`,
    objective: answer2,
    workspace: item.workspace,
    job: "plan",
    parent: item.id,
    from: by,
    source: `Found while verifying #${item.id} (${item.title}). The ${profileOf(by)}'s ruling: ${answer2}

Failure:
${item.failure ?? ""}`,
    rework: { cause: "pre-existing", answer: answer2 }
  });
  store.save({ ...item, status: "waiting-prerequisite", waitsOn: pre.id, failure: void 0, exchange: void 0, corrections: item.corrections + 1 }, "ruling", { cause: "pre-existing", prerequisite: pre.id, by: profileOf(by) });
};
function nextFor(item) {
  if (item.status !== "held") return [];
  const id2 = item.id;
  const code = item.hold.code;
  if (NQ_HOLDS.includes(code)) {
    return [{ run: `mw answer ${id2} "<your answer to context.questions>"`, why: "your answer goes to the receiving agent, which confirms it understands or asks again" }];
  }
  if (CHECK_HOLDS.includes(code)) {
    return ["implementation", "test", "pre-existing"].map((cause) => ({ run: `mw answer ${id2} --cause ${cause} "<what the responsible party must do>"`, why: { implementation: "the new code or its plan is wrong: the planner replans", test: "the check is wrong: the test architect rewrites it", "pre-existing": "the defect predates this work: it gets its own fix first" }[cause] }));
  }
  if (code === "no_ship_command") {
    return [{ run: `mw init --workspace ${quote2(item.workspace)} --ship "<the operator's command that deploys what is on main>"`, why: "register how this project ships; the item then ships" }];
  }
  if (code === "leftovers") {
    return [...item.hold.next ?? [], { run: `mw retry ${id2}`, why: "go on: once the files in context.files are dealt with, or at once if the operator made them while the call ran" }];
  }
  if (code === "ship_failed") return [{ run: `mw retry ${id2}`, why: "after fixing what context.stderr shows: run the ship command again; the change is already on main" }];
  return [
    ...item.hold.next ?? [],
    { run: `mw show ${id2}`, why: "read the failing call's last error and the events before it" },
    { run: `mw retry ${id2}`, why: "run the held step again from where it stopped" }
  ];
}
var held = (id2) => Effect_exports.gen(function* () {
  const store = yield* Store;
  const item = store.get(id2);
  if (!item) return yield* notFound2(id2);
  if (item.status !== "held") {
    return yield* new MadeWellError({ code: "not_held", message: `Item #${id2} is ${item.status}, not waiting on you.`, context: { id: id2, status: item.status, job: item.job }, next: [{ run: `mw status ${id2}`, why: "see what it is doing now" }] });
  }
  return { store, item };
});
var released = (item) => ({
  ...item,
  status: "queued",
  hold: void 0,
  launches: 0,
  ...item.split ? { split: Object.fromEntries(Object.entries(item.split).map(([k, t]) => [k, { ...t, launches: 0 }])) } : {}
});
var answer = (id2, text2, cause) => Effect_exports.gen(function* () {
  const store = yield* Store;
  const events2 = store.events(id2);
  const repeat3 = events2.slice(events2.findLastIndex((e) => e.kind === "held") + 1).some((e) => (e.data.by === "operator" || e.data.originator === "operator") && e.data.cause === cause && (e.data.answer ?? store.get(e.data.prerequisite)?.objective) === text2);
  if (repeat3) return;
  const { item } = yield* held(id2);
  const free = released(item);
  if (NQ_HOLDS.includes(item.hold.code)) {
    const job2 = item.hold.context.job ?? item.job;
    const t = trackOf(free, job2);
    const x = t.exchange;
    const turns = x.turns.map((turn, i) => i === x.turns.length - 1 ? { ...turn, answer: text2, by: "operator" } : turn);
    store.save(withTrack(free, job2, { ...t, exchange: { ...x, status: "awaiting-receiver", turns } }), "nq-answer", { job: job2, originator: "operator", answer: text2 });
    return;
  }
  if (!CHECK_HOLDS.includes(item.hold.code)) {
    return yield* new MadeWellError({ code: "not_answerable", message: `Item #${id2} holds on ${item.hold.code}, which an answer does not resolve.`, context: { id: id2, hold: item.hold }, next: nextFor(item) });
  }
  if (!cause) return yield* new MadeWellError({ code: "cause_required", message: `Item #${id2} holds on a failed check; the answer must name its cause.`, context: { id: id2, hold: item.hold }, next: nextFor(item) });
  const operator = { kind: "operator" };
  if (cause === "pre-existing") return openPrerequisite(store, { ...free, from: operator }, text2, operator);
  const job = cause === "test" ? "test-plan" : "plan";
  store.save({
    ...free,
    job,
    from: operator,
    exchange: void 0,
    rework: { cause, answer: text2 },
    failure: void 0,
    round: item.round + 1,
    corrections: item.corrections + 1,
    ...job === "plan" ? { base: void 0 } : {}
  }, "ruling", { cause, to: job, by: "operator", answer: text2 });
});
var promote = (discovery, ids = []) => Effect_exports.gen(function* () {
  const store = yield* Store;
  const run2 = store.get(discovery);
  if (!run2) return yield* notFound2(discovery);
  const found2 = store.list().filter((i) => i.discovery === discovery);
  const candidates2 = found2.filter((i) => i.status === "candidate");
  if (run2.status !== "discovered") {
    return yield* new MadeWellError({ code: "not_discovered", message: `Item #${discovery} is not a finished discovery run (it is ${run2.status}).`, context: { id: discovery, status: run2.status, job: run2.job }, next: [{ run: "mw status", why: "find the discovery run and its candidates" }] });
  }
  const unknown2 = ids.filter((id2) => !found2.some((c) => c.id === id2));
  if (unknown2.length) {
    return yield* new MadeWellError({ code: "not_a_candidate", message: `Not candidates of discovery #${discovery}: ${unknown2.join(", ")}.`, context: { discovery, unknown: unknown2, candidates: candidates2.map((c) => ({ id: c.id, title: c.title })) }, next: [{ run: `mw promote ${discovery}`, why: "promote every waiting candidate" }] });
  }
  const named = /* @__PURE__ */ new Set();
  const add4 = (id2) => {
    if (named.has(id2)) return;
    named.add(id2);
    for (const p of found2.find((c) => c.id === id2)?.after ?? []) add4(p);
  };
  for (const id2 of ids.length ? ids : found2.map((c) => c.id)) add4(id2);
  const chosen = found2.filter((c) => named.has(c.id));
  for (const c of chosen) if (c.status === "candidate") store.save({ ...c, status: "queued" }, "promoted", { discovery });
  return chosen.map((c) => store.get(c.id));
});
var retry3 = (id2) => Effect_exports.gen(function* () {
  const events2 = (yield* Store).events(id2);
  if (events2.slice(events2.findLastIndex((e) => e.kind === "held") + 1).some((e) => e.kind === "retried")) return;
  const { store, item } = yield* held(id2);
  if (NQ_HOLDS.includes(item.hold.code) || CHECK_HOLDS.includes(item.hold.code)) {
    return yield* new MadeWellError({ code: "answer_required", message: `Item #${id2} is waiting on your answer, not a retry.`, context: { id: id2, hold: item.hold }, next: nextFor(item) });
  }
  store.save(released(item), "retried", { job: item.job });
});
var runQueue = (config, options = {}) => Effect_exports.gen(function* () {
  const store = yield* Store;
  yield* store.claimRunner();
  yield* Effect_exports.addFinalizer(() => Effect_exports.sync(() => store.releaseRunner()));
  yield* Effect_exports.sync(killOrphans);
  const finished = yield* Queue_exports.unbounded();
  const running = /* @__PURE__ */ new Set();
  const results2 = [];
  const parallel = config.prescriptions.parallel ?? DEFAULT_PARALLEL;
  for (; ; ) {
    for (const i of store.list()) {
      if (running.size >= parallel) break;
      if (i.parent !== void 0 || !READY.includes(i.status) || running.has(i.id) || stuck(store, i) || unshipped(store, i).length) continue;
      running.add(i.id);
      yield* Effect_exports.forkScoped(drive(i.id, config).pipe(
        Effect_exports.catchTag("MadeWellError", () => Effect_exports.sync(() => store.get(i.id))),
        Effect_exports.flatMap((item) => Queue_exports.offer(finished, item))
      ));
    }
    if (!running.size) {
      store.runnerOn(null);
      if (!options.watch) return results2;
      yield* Effect_exports.sleep(config.pollMs ?? 2e3);
      continue;
    }
    const done3 = options.watch ? yield* Effect_exports.raceFirst(Queue_exports.take(finished), Effect_exports.as(Effect_exports.sleep(config.pollMs ?? 2e3), void 0)) : yield* Queue_exports.take(finished);
    if (done3) {
      running.delete(done3.id);
      results2.push(done3);
    }
  }
}).pipe(Effect_exports.scoped);
var SUBAGENT_RULE = "If your tools can start another agent, that is an NQ exchange you originate and answer for: give it a complete brief, have it state its understanding and questions before it works, answer them yourself, stop and report after three turns with questions still open, and put its understanding, your answers and its result in your report.";
var BRIEF = [
  "You are an agent in Made Well, a delivery pipeline that takes one software work item from ideation through planning and implementation to a verified, shipped change. Your packet says which profile you are, the job you do, and the JSON answer it needs. It runs from what every call of this work item shares to what is yours alone.",
  NEUTRAL_HOST,
  [
    "Settle every decision by the experience rubric. Its three governing questions have equal standing:",
    "- Developer experience: What moves us toward a 10\xD7 better experience of developing, understanding, inspecting, and recovering the work?",
    "- User experience: What moves us toward a 10\xD7 better experience for the person the resulting system serves?",
    "- Agentic experience: What makes agent execution clearer, more efficient, better grounded, and more reliably bounded?",
    "The answer they give is the decision. Ideation and planning settle every decision and record it with why; no decision is left for the operator."
  ].join("\n"),
  `Leave no trace. Your working directory is a disposable worktree of the product repo, removed when your call ends: write only there, never in the product repo's own checkout or anywhere else on the machine. Stop every process you start. Tear down whatever you provision (database branches, dev clones, servers); report anything still standing under "provisioned" as {"kind", "id", "teardown"} and Made Well tears it down. Never commit, branch or push: Made Well alone brings work onto main.`,
  "Honor the product repo's coding conventions.",
  SUBAGENT_RULE,
  "Your final message is ONLY the JSON object your packet asks for."
].join("\n\n");
var itemFacts = (item) => ({ id: item.id, title: item.title, ...item.kind ? { kind: item.kind } : {}, objective: item.objective, source: item.source });
var receivedBy = (item, job) => Object.fromEntries(RECEIVES[job].flatMap((j) => {
  const d = deliverableOf(item, j);
  return d === void 0 ? [] : [[j, d]];
}));
var snapshotFor = (item, job, dir) => {
  const plan = planOf(item);
  if (!plan || !RECEIVES[job].includes("plan")) return Effect_exports.succeed(void 0);
  return snapshot2(dir, plan.scope.filter((f) => !f.endsWith("/") && !/[*?[{]/.test(f)));
};
var packet = (item, job, dir, parts2, withReceived = true) => Effect_exports.map(snapshotFor(item, job, dir), (snap) => JSON.stringify({
  item: itemFacts(item),
  ...withReceived ? { received: receivedBy(item, job) } : {},
  ...snap ? { snapshot: snap } : {},
  ...parts2
}, null, 2));
var whereYouAre = (job) => {
  const step2 = stepOf(job);
  return step2.stage === "discovery" ? "Made Well's discovery" : `Made Well's delivery lane (${step2.stage})`;
};
var TASKS = {
  plan: "Declare the scope: every file the change may touch. Made Well refuses a change outside it, and the test architect may not touch it. Give each done-when item a short unique id; the checks prove them by id.",
  "test-plan": "Write each check's files in your checkout, at paths outside the plan's scope. Made Well keeps them outside the product repo and runs each check's command itself, from the repo root, against the implementer's change. Each check proves one done-when item by its id, and every done-when item needs at least one. Your checkout has no implementation; never build one, here or anywhere else, to try your checks.",
  implement: "Change only the files in the plan's scope; Made Well takes your change from your checkout. Never write or run checks of your own work: Made Well runs this item's checks itself.",
  arbitrate: "Your checkout holds the implementer's change as its last commit, with the test architect's check files applied on top, uncommitted. Reproduce the failure if you need to."
};
var you = (job, kind) => {
  const step2 = stepOf(job);
  return { profile: step2.profile, job, call: kind, where: whereYouAre(job), duty: step2.duty };
};
var INTAKE_TASK = (job, originator) => `This is intake, before you do the ${job} job: judge this packet alone, and change nothing. State your understanding of what was handed to you and what you must deliver, then answer the three questions. What is unclear? What is ambiguous? Do I have everything I need to proceed? Put each thing that is unclear, ambiguous or missing in its list: each becomes a question to the ${originator}, who answers from its hand-off. A note records a point the packet already settles; anything you would have to assume, choose or guess is a question, not a note. Never repeat a question already answered in earlier turns. Empty lists confirm you are ready. Reply with the shape under "answer", even after your questions are answered: you do the ${job} job, and return what is under "laterDeliverable", in a later call.`;
var handoffView = (item, job, x) => x.from.kind === "job" && RECEIVES[job].includes(x.from.job) && x.handoff === item.outputs[x.from.job] ? `The ${profileOf(x.from)}'s deliverable, under received.${x.from.job}.` : x.handoff;
var receiverParts = (item, job, x, kind) => ({
  you: { ...you(job, kind), task: INTAKE_TASK(job, profileOf(x.from)), laterDeliverable: deliverableShape(job), answer: shapeOf(INTAKE) },
  handoff: { from: profileOf(x.from), content: handoffView(item, job, x) },
  earlierTurns: x.turns,
  round: item.round,
  ...trackOf(item, job).rejected ? { yourLastAnswerWasRefused: trackOf(item, job).rejected } : {}
});
var deliverableShape = (job) => job in DELIVERABLES ? shapeOf(DELIVERABLES[job]) : void 0;
var originatorParts = (item, job, x) => ({
  you: {
    profile: profileOf(x.from),
    call: "originator",
    task: `You handed this work over as the ${profileOf(x.from)}. The ${stepOf(job).profile} asked questions before it does the ${job} job. Answer each from your hand-off and the source: clarify what you handed over; never change your hand-off or the work. A question about a decision is settled by the three governing questions; say what they decide and why. Set needsOperator only for authority the source leaves open: destructive or irreversible actions, production beyond this item's own ship, money, credentials, or anything outside the workspace. Shipping this item, its deploy included, is already authorized.`,
    answer: shapeOf(ORIGINATOR)
  },
  yourHandoff: x.from.kind === "job" && x.handoff === item.outputs[x.from.job] ? deliverableOf(item, x.from.job) : x.handoff,
  receiver: stepOf(job).profile,
  receiverUnderstanding: x.turns.at(-1).understanding,
  questions: x.turns.at(-1).questions,
  earlierTurns: x.turns.slice(0, -1)
});
var executeParts = (item, job, t, x) => ({
  you: { ...you(job, "execute"), ...TASKS[job] ? { task: TASKS[job] } : {}, answer: deliverableShape(job) },
  ...job === "arbitrate" && item.verification ? { verification: { on: item.verification.on, results: item.verification.results }, change: item.change, checks: item.checks } : {},
  exchange: { from: profileOf(x.from), handoff: handoffView(item, job, x), turns: x.turns, understanding: x.understanding, notes: x.notes },
  ...item.outputs[job] !== void 0 && item.rework ? { yourPreviousDeliverable: deliverableOf(item, job) } : {},
  round: item.round,
  ...t.rejected ? { yourLastAnswerWasRefused: t.rejected } : {},
  ...t.pickingUp ? { pickingUp: t.pickingUp } : {}
});

// src/eval.ts
import { readFileSync as readFileSync6 } from "node:fs";
import { resolve as resolve5 } from "node:path";
import { DatabaseSync as DatabaseSync2 } from "node:sqlite";
var JOBS = ["discover", "ideate", "challenge", "plan", "test-plan", "implement", "arbitrate"];
var UNKNOWN_RESET_MS2 = 60 * 6e4;
var MIN_OUT_MS2 = 5 * 6e4;
var EvalCard = Schema_exports.Struct({
  harness: Schema_exports.NonEmptyString,
  provider: Schema_exports.NonEmptyString,
  account: Schema_exports.NonEmptyString,
  model: Schema_exports.NonEmptyString,
  effort: Schema_exports.Literals(["low", "medium", "high", "xhigh", "max"])
}).annotate({ identifier: "Card" });
var Score = Schema_exports.Struct({
  outcome: Schema_exports.String.annotate({ description: "ok, error or rejected, as the call ended" }),
  valid: Schema_exports.Boolean.annotate({ description: "answered, and the engine would accept the answer" }),
  parses: Schema_exports.Boolean.annotate({ description: "whether the answer ends with a JSON object" }),
  reason: Schema_exports.NullOr(Schema_exports.String).annotate({ description: "why the engine would refuse the answer; null when valid" }),
  flags: Schema_exports.Array(Schema_exports.String).annotate({ description: "the rule-break flags telemetry computes" }),
  seconds: Schema_exports.Number,
  tokens: Schema_exports.NullOr(Schema_exports.Number).annotate({ description: "null when the harness reported none" })
}).annotate({ identifier: "Score" });
var Totals = Schema_exports.Struct({ calls: Schema_exports.Int, valid: Schema_exports.Int, flags: Schema_exports.Int, seconds: Schema_exports.Number, tokens: Schema_exports.NullOr(Schema_exports.Number) }).annotate({ identifier: "Totals" });
var CardResult = Schema_exports.Struct({
  card: EvalCard,
  complete: Schema_exports.Boolean.annotate({ description: "every selected call was replayed on this card" }),
  limited: Schema_exports.optionalKey(Schema_exports.Struct({ account: Schema_exports.String, resetsAt: Schema_exports.String, message: Schema_exports.String })),
  replay: Totals,
  recorded: Totals.annotate({ description: "the same calls, as recorded" }),
  matches: Schema_exports.Boolean.annotate({ description: "complete, at least as many valid answers and no more rule breaks than the record" }),
  calls: Schema_exports.Array(Schema_exports.Struct({ call: Schema_exports.Int, item: Schema_exports.Int, kind: Schema_exports.String, recorded: Score, replay: Score, verdict: Schema_exports.Literals(["better", "same", "worse"]) }))
}).annotate({ identifier: "CardResult" });
var EvalReport = Schema_exports.Struct({
  eval: Schema_exports.Int.annotate({ description: "this run in the store's evals and eval_calls tables" }),
  job: Schema_exports.String,
  brief: Schema_exports.NullOr(Schema_exports.String),
  recorded: Schema_exports.Struct({ ...Totals.fields, cards: Schema_exports.Array(EvalCard) }),
  cards: Schema_exports.Array(CardResult),
  recommendation: Schema_exports.NullOr(Schema_exports.Struct({ card: EvalCard, tier: Schema_exports.NullOr(Schema_exports.String), prescribed: Schema_exports.String, why: Schema_exports.String })),
  next: Schema_exports.Array(Next)
}).annotate({ identifier: "EvalReport" });
var score = (kind, job, r) => {
  const accepted = r.output === null ? { ok: false, reason: `The call ended ${r.outcome} with no answer.` } : kind === "intake" ? decode5(INTAKE, r.output) : kind === "originator" ? decode5(ORIGINATOR, r.output) : validate3(job, r.output);
  return {
    outcome: r.outcome,
    valid: accepted.ok,
    parses: r.output !== null && lastJson(r.output) !== void 0,
    reason: accepted.ok ? null : accepted.reason,
    flags: r.flags.map((f) => f.rule),
    seconds: r.ms / 1e3,
    tokens: r.tokens ? totalTokens(r.tokens) : null
  };
};
var round = (n) => Math.round(n * 1e3) / 1e3;
var totals = (scores) => ({
  calls: scores.length,
  valid: scores.filter((s) => s.valid).length,
  flags: scores.reduce((n, s) => n + s.flags.length, 0),
  seconds: round(scores.reduce((n, s) => n + s.seconds, 0)),
  tokens: scores.some((s) => s.tokens === null) ? null : scores.reduce((n, s) => n + s.tokens, 0)
});
var verdict = (recorded, replay) => {
  const d = Number(replay.valid) - Number(recorded.valid) || recorded.flags.length - replay.flags.length;
  return d > 0 ? "better" : d < 0 ? "worse" : "same";
};
var sameCard = (a, b) => a.harness === b.harness && a.provider === b.provider && a.account === b.account && a.model === b.model && a.effort === b.effort;
var label = (c) => `${c.harness} \xB7 ${c.model} \xB7 ${c.effort}`;
var usage = (message) => new MadeWellError({ code: "usage", message, context: { command: "eval" }, next: [{ run: "mw", why: "read the manual: every command and its input schema" }] });
var candidates = (arg, p) => Effect_exports.gen(function* () {
  const tiers = Object.keys(p.tiers);
  const harnesses = Object.keys({ ...HARNESSES, ...p.harnesses });
  const invalid4 = (message, problems) => new MadeWellError({
    code: "eval_card_invalid",
    message,
    context: { card: arg, tiers, harnesses, ...problems ? { problems } : {} },
    next: [
      ...tiers.map((t) => ({ run: `mw eval <job> --card ${t}`, why: `replay on every card of tier "${t}"` })),
      { run: `mw eval <job> --card '{"harness":"${harnesses[0]}","provider":"<provider>","account":"<quota account>","model":"<model>","effort":"low"}'`, why: "replay on one card" }
    ]
  });
  if (!arg.trim().startsWith("{")) {
    const tier = p.tiers[arg];
    return tier ? [...tier] : yield* invalid4(`--card "${arg}" is neither a card as JSON nor a tier in prescriptions.`);
  }
  const card = yield* Effect_exports.try({ try: () => JSON.parse(arg), catch: (e) => invalid4("--card is not valid JSON.", String(e)) }).pipe(
    Effect_exports.flatMap((v) => Schema_exports.decodeUnknownEffect(EvalCard)(v).pipe(Effect_exports.mapError((e) => invalid4("--card does not match the card shape {harness, provider, account, model, effort}.", e.message))))
  );
  if (!harnessOf(p, card.harness)) return yield* invalid4(`--card names harness "${card.harness}", which has no entry.`);
  return [card];
});
var ITEM_IDS = /^\d+$/;
var evaluate2 = Effect_exports.fn("mw.eval")(function* (o) {
  const store = yield* Store;
  const worker = yield* Worker;
  const p = o.prescriptions;
  const items = (o.item ?? "").split(/[\s,]+/).filter(Boolean);
  if (items.some((i) => !ITEM_IDS.test(i) || Number(i) < 1)) return yield* usage(`--item takes work item numbers separated by commas, such as --item 3,5; got "${o.item}".`);
  const ids = items.map(Number);
  const cards = o.card === void 0 ? void 0 : yield* candidates(o.card, p);
  const briefPath = o.brief === void 0 ? void 0 : resolve5(o.brief);
  const brief = briefPath === void 0 ? void 0 : yield* Effect_exports.try({
    try: () => readFileSync6(briefPath, "utf8"),
    catch: () => new MadeWellError({ code: "brief_unreadable", message: `Cannot read --brief ${briefPath}.`, context: { path: briefPath }, next: [{ run: `ls -l ${quote2(briefPath)}`, why: "check the file exists and is readable" }] })
  });
  const all4 = store.calls();
  const calls = all4.filter((c) => c.job === o.job && c.outcome !== "limit" && (!ids.length || ids.includes(c.item)) && (brief === void 0 || c.kind === "execute")).slice(-(o.limit ?? 0));
  if (!calls.length) {
    const recorded = {};
    for (const c of all4) if (c.outcome !== "limit") recorded[c.job] = (recorded[c.job] ?? 0) + 1;
    const best2 = Object.entries(recorded).sort((a, b) => b[1] - a[1])[0];
    return yield* new MadeWellError({
      code: "eval_no_calls",
      message: `The store holds no recorded ${brief === void 0 ? "" : "execute "}calls of the ${o.job} job${ids.length ? ` for item(s) ${ids.join(", ")}` : ""} to replay.`,
      context: { store: store.path, job: o.job, items: ids, recorded },
      next: best2 ? [{ run: `mw eval ${best2[0]}`, why: `the ${best2[0]} job has ${best2[1]} recorded calls` }] : [{ run: "mw next", why: "deliver work first: every call it makes is recorded for evals" }]
    });
  }
  const db = yield* Effect_exports.acquireRelease(Effect_exports.sync(() => {
    const db2 = new DatabaseSync2(store.path);
    db2.exec(`PRAGMA busy_timeout = 5000;
			CREATE TABLE IF NOT EXISTS evals (id INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT NOT NULL, job TEXT NOT NULL, card TEXT, brief TEXT, items TEXT NOT NULL, calls TEXT NOT NULL, report TEXT);
			CREATE TABLE IF NOT EXISTS eval_calls (id INTEGER PRIMARY KEY AUTOINCREMENT, eval INTEGER NOT NULL, call INTEGER NOT NULL, card TEXT NOT NULL, system TEXT NOT NULL, prompt TEXT NOT NULL, outcome TEXT NOT NULL, output TEXT, error TEXT, raw TEXT, started TEXT NOT NULL, ms INTEGER NOT NULL, tokens TEXT, facts TEXT NOT NULL, flags TEXT NOT NULL, score TEXT NOT NULL);`);
    return db2;
  }), (db2) => Effect_exports.sync(() => db2.close()));
  const at = new Date(yield* Clock_exports.currentTimeMillis).toISOString();
  const run2 = Number(db.prepare("INSERT INTO evals (at, job, card, brief, items, calls) VALUES (?, ?, ?, ?, ?, ?)").run(at, o.job, o.card ?? null, briefPath ?? null, JSON.stringify(ids), JSON.stringify(calls.map((c) => c.id))).lastInsertRowid);
  const insert = db.prepare("INSERT INTO eval_calls (eval, call, card, system, prompt, outcome, output, error, raw, started, ms, tokens, facts, flags, score) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
  const accessOf = (c) => c.kind === "execute" ? prescriptionOf(p, o.job).access : "read";
  const budget = budgetFor(p, o.job);
  const rulesOf = (c) => {
    const { head: _, changed: __, ...recorded } = c.facts ?? {};
    return { budget: { ms: budget.minutes * 6e4, ...budget.tokens !== void 0 ? { tokens: budget.tokens } : {} }, ...recorded, access: accessOf(c) };
  };
  const recordedScore = (c) => {
    const facts = { ...rulesOf(c), ...c.facts?.head ? { head: c.facts.head } : {}, ...c.facts?.changed ? { changed: c.facts.changed } : {} };
    return score(c.kind, o.job, { ...c, flags: flagsFor(facts, c) });
  };
  const replay = (c, card, n) => {
    const workspace = store.get(c.item).workspace;
    return readOnly(workspace, Effect_exports.scoped(Effect_exports.gen(function* () {
      const wt = yield* worktree(workspace, c.facts?.head?.before ?? "HEAD", `eval-${run2}-${c.id}-${n}`);
      const before = yield* capture(wt.path);
      const system = c.kind === "execute" && brief !== void 0 ? brief : c.system;
      const prompt = c.prompt.replaceAll(workspace, wt.path);
      const started = yield* Clock_exports.currentTimeMillis;
      const result3 = yield* worker.run({ kind: c.kind, item: c.item, job: o.job, profile: c.profile, card, access: accessOf(c), system, prompt, cwd: wt.path, budget, harness: harnessOf(p, card.harness) }).pipe(Effect_exports.withSpan(`mw.eval.${c.kind}.${o.job}`, { attributes: { eval: run2, call: c.id, harness: card.harness, model: card.model, account: card.account } }));
      const ms = (yield* Clock_exports.currentTimeMillis) - started;
      const after = yield* capture(wt.path);
      const changed = [.../* @__PURE__ */ new Set([...Object.keys(before.files), ...Object.keys(after.files)])].filter((f) => !f.startsWith(".git/") && before.files[f] !== after.files[f]).sort();
      return { result: result3, system, prompt, ms, started, head: { before: before.head, after: after.head }, changed };
    })));
  };
  const groups = cards ? cards.map((card) => ({ card, calls })) : calls.reduce((gs, c) => {
    const g = gs.find((g2) => sameCard(g2.card, c.card));
    if (g) g.calls.push(c);
    else gs.push({ card: c.card, calls: [c] });
    return gs;
  }, []);
  const results2 = [];
  for (const [n, g] of groups.entries()) {
    const scored = [];
    let limited;
    for (const c of g.calls) {
      const now2 = yield* Clock_exports.currentTimeMillis;
      const out = store.exhausted()[g.card.account] ?? 0;
      if (out > now2) {
        limited = { account: g.card.account, resetsAt: new Date(out).toISOString(), message: "the account was already at its usage limit" };
        break;
      }
      const r = yield* replay(c, g.card, n);
      const raw = r.result.raw ?? null;
      const output = r.result.ok ? r.result.output : null;
      const tokens2 = tokensOf(g.card.harness, raw);
      const facts = { ...rulesOf(c), head: r.head, changed: r.changed };
      const flags = flagsFor(facts, { tools: toolEvents(g.card.harness, raw), tokens: tokens2, ms: r.ms, output });
      const outcome = r.result.ok ? "ok" : "limit" in r.result ? "limit" : "error";
      const s = score(c.kind, o.job, { outcome, output, ms: r.ms, tokens: tokens2, flags });
      const error = r.result.ok ? null : "limit" in r.result ? r.result.limit.message : r.result.error;
      insert.run(run2, c.id, JSON.stringify(g.card), r.system, r.prompt, outcome, output, error, raw, new Date(r.started).toISOString(), r.ms, tokens2 && JSON.stringify(tokens2), JSON.stringify(facts), JSON.stringify(flags), JSON.stringify(s));
      if (!r.result.ok && "limit" in r.result) {
        const resetsAt = Math.max(r.result.limit.resetsAt ?? now2 + UNKNOWN_RESET_MS2, now2 + MIN_OUT_MS2);
        for (const account of /* @__PURE__ */ new Set([r.result.limit.account, g.card.account])) store.markExhausted(account, resetsAt);
        limited = { account: g.card.account, resetsAt: new Date(resetsAt).toISOString(), message: r.result.limit.message };
        break;
      }
      const recorded2 = recordedScore(c);
      scored.push({ call: c.id, item: c.item, kind: c.kind, recorded: recorded2, replay: s, verdict: verdict(recorded2, s) });
    }
    const replayed = totals(scored.map((s) => s.replay));
    const recorded = totals(scored.map((s) => s.recorded));
    const complete = scored.length === g.calls.length;
    results2.push({
      card: g.card,
      complete,
      ...limited ? { limited } : {},
      replay: replayed,
      recorded,
      matches: complete && replayed.valid >= recorded.valid && replayed.flags <= recorded.flags,
      calls: scored
    });
  }
  const cost = (r) => [r.replay.tokens === null ? 1 : 0, r.replay.tokens ?? 0, r.replay.seconds];
  const best = results2.filter((r) => r.matches).sort((a, b) => {
    const [x, y] = [cost(a), cost(b)];
    return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
  })[0];
  const prescribed = prescriptionOf(p, o.job).tier;
  const tierOf = (card) => p.tiers[prescribed].some((c) => sameCard(c, card)) ? prescribed : Object.keys(p.tiers).find((t) => p.tiers[t].some((c) => sameCard(c, card))) ?? null;
  const overall = totals(calls.map(recordedScore));
  const tokens = (t) => t.tokens === null ? "unreported tokens" : `${t.tokens} tokens`;
  const recommendation = best ? {
    card: best.card,
    tier: tierOf(best.card),
    prescribed,
    why: `${label(best.card)} matched the record on ${best.replay.calls} call(s): ${best.replay.valid} valid vs ${best.recorded.valid} recorded, ${best.replay.flags} rule break(s) vs ${best.recorded.flags}, ${tokens(best.replay)} and ${best.replay.seconds}s vs ${tokens(best.recorded)} and ${best.recorded.seconds}s recorded. It is the cheapest of ${results2.filter((r) => r.matches).length} matching card(s), by tokens and then seconds.`
  } : null;
  const command2 = ["mw eval", o.job, ...o.card !== void 0 ? ["--card", quote2(o.card)] : [], ...briefPath ? ["--brief", quote2(briefPath)] : [], ...ids.length ? ["--item", ids.join(",")] : [], ...o.limit ? ["--limit", String(o.limit)] : []].join(" ");
  const lead = cardsFor(p, o.job)[0];
  const next = [
    ...best && !sameCard(best.card, lead) ? [{ run: `$EDITOR ${quote2(o.prescriptionsPath)}`, why: `to prescribe ${label(best.card)} for ${o.job}: put it first in tier "${prescribed}", or point ${o.job} at a tier led by it. Made Well changes no file itself.` }] : [],
    ...!best ? [{ run: `mw eval ${o.job} --card <a tier, or a card as JSON>`, why: "no evaluated card matched the record: keep the prescription, or try other cards" }] : [],
    ...results2.filter((r) => r.limited).map((r) => ({ run: command2, why: `${label(r.card)} stopped at a usage limit; run again after ${r.limited.resetsAt} to complete it` })),
    { run: `sqlite3 ${quote2(store.path)} "SELECT call, card, outcome, score, output FROM eval_calls WHERE eval = ${run2}"`, why: "read each replayed answer; raw streams, facts and flags are on the same rows" }
  ];
  const recordedCards = calls.reduce((cs, c) => cs.some((x) => sameCard(x, c.card)) ? cs : [...cs, c.card], []);
  const report = { eval: run2, job: o.job, brief: briefPath ?? null, recorded: { ...overall, cards: recordedCards }, cards: results2, recommendation, next };
  db.prepare("UPDATE evals SET report = ? WHERE id = ?").run(JSON.stringify(report), run2);
  telemetry(store.path)?.write("eval", { at, ...report });
  return report;
}, Effect_exports.scoped);

// src/cli.ts
var storePath = defaultStorePath();
var registry = projectsPath(storePath);
var prescriptionsPath = () => process.env.MW_PRESCRIPTIONS ?? new URL("../prescriptions.json", import.meta.url).pathname;
var SHIP_SLOT = `"<the operator's command that deploys what is on main>"`;
var workerLayer = Layer_exports.unwrap(Effect_exports.sync(() => process.env.MW_WORKER_COMMAND ? commandWorker(process.env.MW_WORKER_COMMAND) : harnessWorker));
var usageError = (command2, message) => new MadeWellError({ code: "usage", message, context: { command: command2 }, next: [{ run: "mw", why: "read the manual: every command and its input schema" }] });
var Id2 = Schema_exports.NumberFromString.pipe(Schema_exports.decodeTo(Schema_exports.Int.check(Schema_exports.isGreaterThan(0)))).annotate({ description: "a work item number" });
var optional3 = (description) => Schema_exports.optionalKey(Schema_exports.String.annotate({ description }));
var Workspace = optional3("the project directory; defaults to the current directory");
var Source = { source: optional3("the operator's own words; or give --source-file"), "source-file": optional3("a file holding the operator's own words") };
var Fact = Schema_exports.Record(Schema_exports.String, Schema_exports.Unknown);
var Nq = Schema_exports.Struct({ from: Schema_exports.String, status: Schema_exports.String, turns: Schema_exports.Int }).annotate({ description: "the open NQ exchange: who handed off, whose move it is, and turns answered" });
var ItemView = Schema_exports.Struct({
  id: Schema_exports.Int,
  title: Schema_exports.String,
  status: Schema_exports.String,
  stage: Schema_exports.String,
  job: Schema_exports.String,
  profile: Schema_exports.String,
  kind: Schema_exports.optionalKey(Schema_exports.String),
  discovery: Schema_exports.optionalKey(Schema_exports.Int),
  nq: Schema_exports.optionalKey(Nq),
  tracks: Schema_exports.optionalKey(Schema_exports.Record(Schema_exports.String, Schema_exports.Struct({ done: Schema_exports.Boolean, nq: Schema_exports.optionalKey(Nq) })).annotate({ description: "after planning: the implementer's and the test architect's parallel tracks" })),
  round: Schema_exports.Int,
  waitsOn: Schema_exports.optionalKey(Schema_exports.Int),
  after: Schema_exports.optionalKey(Schema_exports.Array(Schema_exports.Int).annotate({ description: "the items it builds on; it starts once they have shipped" })),
  resumesAt: Schema_exports.optionalKey(Schema_exports.String),
  hold: Schema_exports.optionalKey(Schema_exports.Struct({ code: Schema_exports.String, message: Schema_exports.String, context: Fact })),
  shipped: Schema_exports.optionalKey(Schema_exports.Struct({ command: Schema_exports.String, output: Schema_exports.String })),
  next: Schema_exports.Array(Next)
}).annotate({ identifier: "Item" });
var HoldView = Schema_exports.Struct({
  item: Schema_exports.Int,
  title: Schema_exports.String,
  workspace: Schema_exports.String,
  code: Schema_exports.String,
  message: Schema_exports.String,
  context: Fact,
  since: Schema_exports.String,
  alerted: Schema_exports.NullOr(Schema_exports.Struct({ at: Schema_exports.String, exitCode: Schema_exports.Int })),
  next: Schema_exports.Array(Next)
}).annotate({ identifier: "Hold" });
var Board = Schema_exports.Struct({ summary: Schema_exports.String, items: Schema_exports.Array(ItemView), next: Schema_exports.Array(Next) }).annotate({ identifier: "Board" });
var Pruned = Schema_exports.Struct({
  before: Schema_exports.String.annotate({ description: "the cutoff applied, ISO; a later time than now counts as now" }),
  dryRun: Schema_exports.Boolean,
  summary: Schema_exports.String,
  items: Schema_exports.Array(Schema_exports.Int).annotate({ description: "the items removed; with --dry-run, the items it would remove" }),
  records: Schema_exports.Struct({ events: Schema_exports.Int, calls: Schema_exports.Int, toolEvents: Schema_exports.Int, evals: Schema_exports.Int, evalCalls: Schema_exports.Int }).annotate({ description: "rows removed with them; events include the runner's own from before the cutoff" }),
  files: Schema_exports.Array(Schema_exports.String).annotate({ description: "removed beside the store: their exports/<id> and items/<id> folders, and replay.html, which holds their record" }),
  kept: Schema_exports.Array(Schema_exports.Struct({ id: Schema_exports.Int, status: Schema_exports.String, why: Schema_exports.String })).annotate({ description: "finished items older than the cutoff that stay, because work still in flight needs them" }),
  freed: Schema_exports.NullOr(Schema_exports.Int).annotate({ description: "bytes given back to the disk: the store shrinking and the files removed; null on a dry run" }),
  next: Schema_exports.Array(Next)
}).annotate({ identifier: "Pruned" });
var Action = Schema_exports.Union([
  Schema_exports.Struct({ action: Schema_exports.Literal("run"), run: Schema_exports.String, why: Schema_exports.String }),
  Schema_exports.Struct({
    action: Schema_exports.Literal("relay"),
    say: Schema_exports.String.annotate({ description: "what to tell the operator" }),
    hold: Schema_exports.optionalKey(HoldView),
    candidates: Schema_exports.optionalKey(Schema_exports.Array(Schema_exports.Struct({ id: Schema_exports.Int, title: Schema_exports.String, kind: Schema_exports.String, objective: Schema_exports.String }))),
    then: Schema_exports.Array(Next).annotate({ description: "run the one that fits the operator's reply, with their words in place of the <...> slot" })
  }),
  Schema_exports.Struct({ action: Schema_exports.Literal("wait"), until: Schema_exports.String.annotate({ description: "ISO time" }), why: Schema_exports.String, then: Schema_exports.Literal("mw next") })
]).annotate({ identifier: "Action", description: "run a command, relay to the operator, or wait until a time" });
var Created = Schema_exports.Struct({ item: ItemView, next: Schema_exports.Array(Next) });
var Tally = Schema_exports.Struct({ calls: Schema_exports.Int, minutes: Schema_exports.Number, tokens: Schema_exports.Number, refused: Schema_exports.Int });
var Kinds = Schema_exports.Record(Schema_exports.String, Schema_exports.Number).annotate({ description: "agent minutes by call kind: intake, originator (NQ) and execute" });
var ItemRef = Schema_exports.Struct({ item: Schema_exports.Int, store: Schema_exports.String, minutes: Schema_exports.Number });
var Stats = Schema_exports.Struct({
  dir: Schema_exports.String,
  files: Schema_exports.Array(Schema_exports.String),
  lines: Schema_exports.Int,
  from: Schema_exports.NullOr(Schema_exports.String),
  to: Schema_exports.NullOr(Schema_exports.String),
  projects: Schema_exports.Array(Schema_exports.Struct({
    host: Schema_exports.String,
    workspace: Schema_exports.String,
    ...Tally.fields,
    kinds: Kinds,
    items: Schema_exports.Struct({ created: Schema_exports.Int, shipped: Schema_exports.Int, held: Schema_exports.Int }),
    nq: Schema_exports.Struct({ intakes: Schema_exports.Int, questions: Schema_exports.Int, share: Schema_exports.Number.annotate({ description: "intake and originator minutes over all agent minutes" }) }),
    leadTime: Schema_exports.Struct({
      median: Schema_exports.NullOr(Schema_exports.Number),
      slowest: Schema_exports.NullOr(ItemRef),
      shipped: Schema_exports.Array(ItemRef).annotate({ description: "minutes from created to shipped, slowest first" }),
      open: Schema_exports.Array(Schema_exports.Struct({ ...ItemRef.fields, status: Schema_exports.Literals(["candidate", "running", "held"]) })).annotate({ description: "not shipped yet: minutes from created to its store's latest record, oldest first" })
    }).annotate({ description: "delivery items, by store and item id (ids are unique per store)" }),
    flags: Schema_exports.Record(Schema_exports.String, Schema_exports.Int),
    jobs: Schema_exports.Record(Schema_exports.String, Schema_exports.Struct({ ...Tally.fields, kinds: Kinds })),
    cards: Schema_exports.Record(Schema_exports.String, Tally).annotate({ description: 'keyed "harness \xB7 model \xB7 effort"' })
  })),
  next: Schema_exports.Array(Next)
}).annotate({ identifier: "Stats" });
var nqOf = (x) => x && x.status !== "clear" ? { nq: { from: x.from.kind === "job" ? stepOf(x.from.job).profile : x.from.kind, status: x.status, turns: x.turns.filter((t) => t.answer !== void 0).length } } : {};
var view = (item) => ({
  id: item.id,
  title: item.title,
  status: item.status,
  stage: stepOf(item.job).stage,
  job: item.job,
  profile: stepOf(item.job).profile,
  ...item.kind ? { kind: item.kind } : {},
  ...item.discovery !== void 0 ? { discovery: item.discovery } : {},
  ...nqOf(item.exchange),
  ...item.split ? { tracks: Object.fromEntries(Object.entries(item.split).map(([job, t]) => [job, { done: t?.done === true, ...nqOf(t?.exchange) }])) } : {},
  round: item.round,
  ...item.waitsOn !== void 0 ? { waitsOn: item.waitsOn } : {},
  ...item.after?.length ? { after: item.after } : {},
  ...item.resetsAt !== void 0 ? { resumesAt: new Date(item.resetsAt).toISOString() } : {},
  ...item.hold ? { hold: item.hold } : {},
  ...item.shipped ? { shipped: item.shipped } : {},
  next: item.status === "held" ? nextFor(item) : item.status === "candidate" ? [{ run: `mw promote ${item.discovery} ${item.id}`, why: "send it into delivery" }] : item.status === "discovered" ? [{ run: `mw promote ${item.id}`, why: "send every candidate into delivery" }] : ["shipped"].includes(item.status) ? [] : item.status === "queued" ? [{ run: "mw run", why: "deliver it" }] : [{ run: `mw status ${item.id}`, why: "check on it later; it continues on its own" }]
});
var holdView = (store, h) => ({ ...h, next: nextFor(store.get(h.item)) });
var board = (store) => {
  const items = store.list();
  const count = (s) => items.filter((i) => i.status === s).length;
  const held2 = items.filter((i) => i.status === "held");
  return {
    summary: `${count("held")} need you, ${count("candidate")} candidates, ${count("running") + count("waiting-quota") + count("waiting-prerequisite")} in progress, ${count("queued")} queued, ${count("shipped")} shipped`,
    items: items.map(view),
    next: held2.length ? held2.flatMap(nextFor) : count("queued") ? [{ run: "mw run", why: "deliver queued items" }] : []
  };
};
var found = (store, id2) => {
  const item = store.get(id2);
  return item ? Effect_exports.succeed(item) : Effect_exports.fail(new MadeWellError({ code: "item_not_found", message: `There is no work item #${id2}.`, context: { id: id2 }, next: [{ run: "mw status", why: "list every work item" }] }));
};
var registered = Effect_exports.fn("mw.registered")(function* (workspace) {
  const path = resolve6(workspace ?? ".");
  const projects = yield* readProjects(registry);
  if (projectFor(projects, path)?.ship) return path;
  return yield* new MadeWellError({
    code: "project_not_found",
    message: `${path} is not a registered project with a ship command.`,
    context: { workspace: path, projects: projects.map((p) => p.path) },
    next: [{ run: `mw init --workspace ${quote2(path)} --ship ${SHIP_SLOT}`, why: "register it with how it ships, then run this command again" }]
  });
});
var readSource = (input) => {
  if (!input["source-file"]) return Effect_exports.succeed(input.source);
  const path = resolve6(input["source-file"]);
  return Effect_exports.try({
    try: () => readFileSync7(path, "utf8"),
    catch: () => new MadeWellError({ code: "source_unreadable", message: `Cannot read --source-file ${path}.`, context: { path }, next: [{ run: `ls -l ${quote2(path)}`, why: "check the file exists and is readable" }] })
  });
};
var createOnce = (store, fields) => store.list().find((i) => i.parent === void 0 && i.discovery === void 0 && i.title === fields.title && i.objective === fields.objective && i.source === fields.source && i.workspace === fields.workspace) ?? store.create(fields);
var runner = (store) => store.claimRunner().pipe(
  Effect_exports.map(() => (store.releaseRunner(), null)),
  Effect_exports.catchIf((e) => e.code === "store_locked", (e) => Effect_exports.succeed(e.context.owner))
);
var MOVING = ["queued", "running", "waiting-quota", "waiting-prerequisite"];
var retention = (store, before) => {
  const items = store.list();
  const live = items.filter((i) => i.status !== "shipped" && i.status !== "discovered");
  const links = (i) => [i.waitsOn, i.parent, i.discovery, ...i.after ?? []];
  const lastMerge = /* @__PURE__ */ new Map();
  for (const i of items.filter((i2) => i2.merged && live.some((l) => l.workspace === i2.workspace))) {
    const seq = store.events(i.id).findLast((e) => e.kind === "merged")?.seq ?? 0;
    if (seq > (lastMerge.get(i.workspace)?.seq ?? 0)) lastMerge.set(i.workspace, { id: i.id, seq });
  }
  const old = items.filter((i) => !live.includes(i) && Date.parse(i.updated) < Date.parse(before));
  const why = (i) => {
    const by = live.find((l) => links(l).includes(i.id) || links(i).includes(l.id));
    if (by) return `#${by.id} (${by.status}) needs it`;
    if (lastMerge.get(i.workspace)?.id === i.id) return `the last merge into ${i.workspace}, which its in-flight items check the branch against`;
  };
  const ids = [];
  const kept = [];
  for (const i of old) {
    const w = why(i);
    if (w) kept.push({ id: i.id, status: i.status, why: w });
    else ids.push(i.id);
  }
  return { ids, kept };
};
var sizeOf = (path) => {
  if (!existsSync3(path)) return 0;
  const s = statSync2(path);
  return s.isDirectory() ? readdirSync3(path).reduce((n, f) => n + sizeOf(join9(path, f)), 0) : s.size;
};
var nextAction = Effect_exports.fn("mw.next")(function* () {
  const store = yield* Store;
  const items = store.list();
  const moving = items.filter((i) => i.parent === void 0 && MOVING.includes(i.status) && !stuck(store, i));
  const owner = moving.length ? yield* runner(store) : null;
  if (moving.length && !owner) {
    return { action: "run", run: "mw run", why: `${moving.length} item(s) can move without the operator. It returns once every item has shipped or holds for the operator, and it is safe to repeat.` };
  }
  const [hold2] = openHolds(store);
  if (hold2) {
    const questions = Array.isArray(hold2.context.questions) ? ` Questions: ${hold2.context.questions.join(" ")}` : "";
    return { action: "relay", say: `Item #${hold2.item} (${hold2.title}) is waiting on you: ${hold2.message}${questions}`, hold: holdView(store, hold2), then: nextFor(store.get(hold2.item)) };
  }
  if (owner) {
    const now2 = yield* Clock_exports.currentTimeMillis;
    const quota = items.filter((i) => i.status === "waiting-quota" && i.resetsAt !== void 0);
    const busy = items.some((i) => i.status === "running" || i.status === "queued");
    const until = busy || !quota.length ? now2 + 6e4 : Math.max(now2, Math.min(...quota.map((i) => i.resetsAt)));
    const on = owner.item ? ` on #${owner.item.id} (${owner.item.job})` : "";
    return { action: "wait", until: new Date(until).toISOString(), why: busy || !quota.length ? `The runner (pid ${owner.pid}) is working${on}.` : "Every account is at its usage limit; the runner continues by itself at the earliest reset.", then: "mw next" };
  }
  const run2 = items.find((i) => i.status === "discovered" && items.some((c) => c.discovery === i.id && c.status === "candidate"));
  if (run2) {
    const candidates2 = items.filter((c) => c.discovery === run2.id && c.status === "candidate");
    return {
      action: "relay",
      say: `Discovery #${run2.id} found ${candidates2.length} candidate work item(s). Which should Made Well deliver?`,
      candidates: candidates2.map((c) => ({ id: c.id, title: c.title, kind: c.kind ?? "feature", objective: c.objective })),
      then: [{ run: `mw promote ${run2.id}`, why: "deliver every candidate" }, ...candidates2.map((c) => ({ run: `mw promote ${run2.id} ${c.id}`, why: `deliver "${c.title}"; name several ids to deliver several` }))]
    };
  }
  const cwd = process.cwd();
  const project = projectFor(yield* readProjects(registry), cwd);
  if (!project?.ship) {
    const init = `mw init --workspace ${quote2(project?.path ?? cwd)} --ship ${SHIP_SLOT}`;
    return {
      action: "relay",
      say: `Made Well delivers work items to production for a registered project. How does ${project?.path ?? cwd} ship: once Made Well brings a passing item onto main, what command deploys it?`,
      then: [{ run: init, why: "register the project with how it ships" }, { run: `${init} --alert "<a command that notifies the operator>"`, why: "also say how to reach the operator when an item holds" }]
    };
  }
  const at = quote2(project.path);
  return {
    action: "relay",
    say: "Nothing is moving and nothing waits on you. What should Made Well work on next?",
    then: [
      { run: `mw discover --workspace ${at} --source "<the operator's raw notes>"`, why: "turn raw notes, transcripts or meetings into candidate work items" },
      { run: `mw start --workspace ${at} --objective "<one line>" --source "<the operator's own words>"`, why: "deliver one work item straight away" }
    ]
  };
});
var command = (c) => c;
var COMMANDS = [
  command({
    name: "next",
    summary: "The one action to take now: a command to run, something to relay to the operator, or a time to wait until. Do it, then run `mw next` again.",
    input: Schema_exports.Struct({}),
    output: Action,
    idempotent: true,
    run: () => nextAction()
  }),
  command({
    name: "init",
    summary: "Register a project, or update its config. The config lives in Made Well's home, never in the project. Items held for a missing ship command go on.",
    input: Schema_exports.Struct({
      workspace: Workspace,
      ship: optional3("shell command run in the workspace once Made Well has brought a passing item onto main: deploy it. Required the first time."),
      alert: optional3("shell command run once per hold, with the hold as JSON on stdin and MW_ITEM, MW_TITLE, MW_HOLD, MW_MESSAGE set")
    }),
    output: Schema_exports.Struct({ project: Project, released: Schema_exports.Array(ItemView), next: Schema_exports.Array(Next) }),
    idempotent: true,
    run: (input) => Effect_exports.gen(function* () {
      const store = yield* Store;
      const path = resolve6(input.workspace ?? ".");
      if (!existsSync3(path)) return yield* new MadeWellError({ code: "workspace_missing", message: `There is no directory ${path}.`, context: { workspace: path }, next: [{ run: "pwd", why: "run mw init from the project directory, or pass its path with --workspace" }] });
      const projects = yield* readProjects(registry);
      if (!input.ship && !projects.find((p) => p.path === path)?.ship) return yield* usageError("init", `${path} is not registered yet: init needs --ship, the command that deploys what Made Well brings onto main.`);
      const project = yield* saveProject(registry, { path, ...input.ship ? { ship: input.ship } : {}, ...input.alert ? { alert: input.alert } : {} });
      const updated = yield* readProjects(registry);
      const waiting = openHolds(store).filter((h) => h.code === "no_ship_command" && projectFor(updated, h.workspace)?.path === path);
      for (const h of waiting) yield* retry3(h.item);
      return { project, released: waiting.map((h) => view(store.get(h.item))), next: [{ run: "mw next", why: "see what to do now" }] };
    })
  }),
  command({
    name: "discover",
    summary: "Turn raw input (notes, transcripts, meetings) into candidate work items, which wait for the operator to promote them.",
    input: Schema_exports.Struct({ ...Source, workspace: Workspace, title: optional3("a title for the discovery run") }),
    output: Created,
    idempotent: true,
    prepare: (input) => Effect_exports.gen(function* () {
      const source = yield* readSource(input);
      if (!source) return yield* usageError("discover", 'discover needs the raw input: --source "<text>" or --source-file <file>.');
      return { source, workspace: yield* registered(input.workspace) };
    }),
    run: (input, { source, workspace }) => Effect_exports.gen(function* () {
      const title = input.title ?? `Discovery of ${input["source-file"] ? basename(input["source-file"]) : "raw input"}`;
      const item = createOnce(yield* Store, { title, objective: "Turn the raw input into candidate work items.", source, workspace, job: "discover" });
      return { item: view(item), next: [{ run: "mw run", why: "run discovery; its candidates wait for promotion" }] };
    })
  }),
  command({
    name: "promote",
    summary: "Send a discovery run's candidates into delivery: all of them, or the ones named.",
    args: ["discovery", "ids..."],
    input: Schema_exports.Struct({ discovery: Id2.annotate({ description: "the discovery run" }), ids: Schema_exports.Array(Id2).annotate({ description: "the candidates to promote; none means all" }) }),
    output: Schema_exports.Struct({ promoted: Schema_exports.Array(ItemView), next: Schema_exports.Array(Next) }),
    idempotent: true,
    run: (input) => promote(input.discovery, input.ids).pipe(Effect_exports.map((promoted) => ({ promoted: promoted.map(view), next: [{ run: "mw run", why: "deliver them, oldest first" }] })))
  }),
  command({
    name: "start",
    summary: "Add one work item straight to the delivery queue.",
    input: Schema_exports.Struct({ objective: Schema_exports.String.annotate({ description: "one line: what done means" }), ...Source, workspace: Workspace, title: optional3("defaults to the objective") }),
    output: Created,
    idempotent: true,
    prepare: (input) => Effect_exports.gen(function* () {
      const source = yield* readSource(input);
      if (!source) return yield* usageError("start", `start needs the operator's own words: --source "<text>" or --source-file <file>.`);
      return { source, workspace: yield* registered(input.workspace) };
    }),
    run: (input, { source, workspace }) => Effect_exports.gen(function* () {
      const item = createOnce(yield* Store, { title: input.title ?? input.objective, objective: input.objective, source, workspace });
      return { item: view(item), next: [{ run: "mw run", why: "deliver it; it moves through all four stages and ships on a passing check" }] };
    })
  }),
  command({
    name: "run",
    summary: "Deliver every item that can move, oldest first, and alert each new hold once. Returns once every item has shipped or holds; --watch keeps waiting for new work.",
    input: Schema_exports.Struct({ watch: Schema_exports.optionalKey(Schema_exports.Boolean.annotate({ description: "keep running and pick up new work as it arrives" })) }),
    output: Board,
    idempotent: true,
    run: (input) => Effect_exports.gen(function* () {
      const prescriptions = yield* loadPrescriptions(prescriptionsPath());
      yield* Effect_exports.forkScoped(Effect_exports.forever(Effect_exports.andThen(Effect_exports.sleep("2 seconds"), alertHolds(registry))));
      yield* runQueue({ prescriptions }, { watch: input.watch });
      yield* alertHolds(registry);
      return board(yield* Store);
    }).pipe(Effect_exports.scoped)
  }),
  command({
    name: "status",
    summary: "Every item and what moves it; or one item.",
    args: ["id"],
    input: Schema_exports.Struct({ id: Schema_exports.optionalKey(Id2) }),
    output: Schema_exports.Union([Board, ItemView]),
    idempotent: true,
    run: (input) => Effect_exports.gen(function* () {
      const store = yield* Store;
      return input.id === void 0 ? board(store) : view(yield* found(store, input.id));
    })
  }),
  command({
    name: "show",
    summary: "One item with its full record and event history.",
    args: ["id"],
    input: Schema_exports.Struct({ id: Id2 }),
    output: Schema_exports.Struct({ ...ItemView.fields, item: Fact, events: Schema_exports.Array(Fact) }),
    idempotent: true,
    run: (input) => Effect_exports.gen(function* () {
      const store = yield* Store;
      const item = yield* found(store, input.id);
      return { ...view(item), item: { ...item }, events: store.events(item.id).map((e) => ({ ...e })) };
    })
  }),
  command({
    name: "holds",
    summary: "Every open hold, oldest first: what the operator must answer or fix, and whether its alert went out.",
    input: Schema_exports.Struct({}),
    output: Schema_exports.Struct({ holds: Schema_exports.Array(HoldView), next: Schema_exports.Array(Next) }),
    idempotent: true,
    run: () => Effect_exports.gen(function* () {
      const store = yield* Store;
      const holds = openHolds(store).map((h) => holdView(store, h));
      return { holds, next: holds.flatMap((h) => h.next) };
    })
  }),
  command({
    name: "answer",
    summary: "Answer a held item: an agent's open questions, or, with --cause, a failed check.",
    args: ["id", "text..."],
    input: Schema_exports.Struct({
      id: Id2,
      text: Schema_exports.NonEmptyString.annotate({ description: "the operator's answer" }),
      cause: Schema_exports.optionalKey(Schema_exports.Literals(["implementation", "test", "pre-existing"]).annotate({ description: "for a failed check: the new code is wrong, the check is wrong, or the defect predates this work" }))
    }),
    output: Created,
    idempotent: true,
    run: (input) => Effect_exports.gen(function* () {
      yield* answer(input.id, input.text, input.cause);
      return { item: view((yield* Store).get(input.id)), next: [{ run: "mw run", why: "continue delivering it" }] };
    })
  }),
  command({
    name: "retry",
    summary: "Run a held item again from where it stopped.",
    args: ["id"],
    input: Schema_exports.Struct({ id: Id2 }),
    output: Created,
    idempotent: true,
    run: (input) => Effect_exports.gen(function* () {
      yield* retry3(input.id);
      return { item: view((yield* Store).get(input.id)), next: [{ run: "mw run", why: "continue delivering it" }] };
    })
  }),
  command({
    name: "replay",
    summary: "Write the replay of the whole flow to one self-contained page, beside the store unless --out names a file.",
    input: Schema_exports.Struct({ out: optional3("defaults to replay.html beside the store") }),
    output: Schema_exports.Struct({ replay: Schema_exports.String, next: Schema_exports.Array(Next) }),
    run: (input) => Effect_exports.gen(function* () {
      const out = resolve6(input.out ?? resolve6(dirname6(storePath), "replay.html"));
      writeFileSync7(out, replayHtml(snapshot3(yield* Store)));
      return { replay: out, next: [{ run: `open ${quote2(out)}`, why: "step through the whole flow" }] };
    })
  }),
  command({
    name: "export",
    summary: "One folder per agent call of an item: brief, packet, answer, raw stream, tool events and flags. Written beside the store unless --out names a directory.",
    args: ["id"],
    input: Schema_exports.Struct({ id: Id2, out: optional3("defaults to exports/<id> beside the store") }),
    output: Schema_exports.Struct({ export: Schema_exports.String, calls: Schema_exports.Number, next: Schema_exports.Array(Next) }),
    idempotent: true,
    run: (input) => Effect_exports.gen(function* () {
      const exported = yield* exportItem(yield* Store, input.id, resolve6(input.out ?? resolve6(dirname6(storePath), "exports", String(input.id))));
      return { export: exported.dir, calls: exported.calls, next: [{ run: `ls ${quote2(exported.dir)}`, why: "one folder per call: brief, packet, answer, raw stream, tools.json and flags.json" }] };
    })
  }),
  command({
    name: "stats",
    summary: "Metrics from the telemetry files of every machine in a directory (MW_TELEMETRY, or --dir): per host and project, items created, shipped and held; lead time from creation to ship (median, slowest, each item) and the age of items still open; NQ intakes, questions and share of agent minutes; calls, agent minutes (split by call kind: intake, originator, execute), tokens and refusals per job and per card; rule-break flags. With MW_TELEMETRY=<dir> set, each machine appends every event, call (in full) and span to its own <host>-<store>.jsonl there. MW_TELEMETRY_LEVEL=metrics writes counts, timings, cards and outcomes but no prompts, answers or repo text; the numbers here are the same.",
    input: Schema_exports.Struct({ dir: optional3("the telemetry directory; defaults to MW_TELEMETRY") }),
    output: Stats,
    idempotent: true,
    run: (input) => Effect_exports.gen(function* () {
      const dir = input.dir ?? process.env.MW_TELEMETRY;
      if (!dir) return yield* usageError("stats", "No telemetry directory: set MW_TELEMETRY=<dir> on every machine, or pass --dir <dir>.");
      const files = existsSync3(dir) ? readdirSync3(dir).filter((f) => f.endsWith(".jsonl")).sort() : [];
      const lines4 = files.flatMap((f) => readFileSync7(join9(dir, f), "utf8").split("\n").filter(Boolean));
      return { dir: resolve6(dir), files, lines: lines4.length, ...stats(lines4), next: files.length ? [] : [{ run: `export MW_TELEMETRY=${quote2(resolve6(dir))}`, why: "set it on every machine that runs Made Well, so each writes its file there" }] };
    })
  }),
  command({
    name: "eval",
    summary: "Replay a job's recorded calls on another card or brief through the worker, score record and replay deterministically (required JSON fields, rule-break flags, seconds, tokens), and recommend the cheapest card that matches or beats the record. Replays run in throwaway worktrees; results go only to the store; no file changes.",
    args: ["job"],
    input: Schema_exports.Struct({
      job: Schema_exports.Literals(JOBS).annotate({ description: "the job whose recorded calls to replay: its intake, originator and execute calls" }),
      card: optional3("a tier name (every card in it) or one card as JSON {harness, provider, account, model, effort}; defaults to each call's recorded card"),
      brief: optional3("a file whose text replaces the job's brief; only execute calls are replayed"),
      item: optional3("only calls of these work items, comma-separated: 3,5"),
      limit: Schema_exports.optionalKey(Id2.annotate({ description: "replay at most this many calls, the most recent" }))
    }),
    output: EvalReport,
    run: (input) => Effect_exports.gen(function* () {
      const prescriptions = yield* loadPrescriptions(prescriptionsPath());
      return yield* evaluate2({ ...input, prescriptions, prescriptionsPath: prescriptionsPath() });
    })
  }),
  command({
    name: "prune",
    summary: "Retention: remove finished work last changed before --before, with everything recorded about it, and give the space back. Finished means shipped, or a discovery run none of whose candidates still waits; work still moving or waiting on the operator stays, with each finished item it builds on or waits on. Goes with it: its events, calls, tool events and evals, its exports/<id> and items/<id> folders, and replay.html beside the store (the glass is rewritten). Telemetry files are the operator's and stay. --dry-run shows what would go. Prune holds the runner claim, so it refuses while `mw run` is live.",
    input: Schema_exports.Struct({
      before: Schema_exports.String.annotate({ description: "an ISO date or time: 2026-09-30 (its start, UTC) or 2026-09-30T12:00:00Z" }),
      "dry-run": Schema_exports.optionalKey(Schema_exports.Boolean.annotate({ description: "report what would go and change nothing" }))
    }),
    output: Pruned,
    idempotent: true,
    run: (input) => Effect_exports.gen(function* () {
      const at = Date.parse(input.before);
      if (!/^\d{4}-\d{2}-\d{2}/.test(input.before) || Number.isNaN(at)) return yield* usageError("prune", `--before "${input.before}" is not a date. Give an ISO date or time, such as 2026-09-30.`);
      const before = new Date(Math.min(at, yield* Clock_exports.currentTimeMillis)).toISOString();
      const dryRun = input["dry-run"] === true;
      const store = yield* Store;
      if (!dryRun) {
        yield* Effect_exports.acquireRelease(store.claimRunner(), () => Effect_exports.sync(() => store.releaseRunner())).pipe(Effect_exports.catchIf((e) => e.code === "store_locked", (e) => {
          const context3 = e.context;
          return Effect_exports.fail(new MadeWellError({
            code: "store_locked",
            message: "A live runner owns this Made Well store, so prune waits for it.",
            context: context3,
            cause: "Prune holds the runner claim while it works: giving space back locks the whole store, and a working runner must never wait on that.",
            next: [
              { run: `mw prune --before ${before}`, why: "once that runner has returned: `mw run` returns when every item has shipped or holds" },
              { run: `mw prune --before ${before} --dry-run`, why: "see now what it will remove; a dry run changes nothing and needs no claim" },
              { run: `kill ${context3.owner.pid} && mw prune --before ${before}`, why: "only for a runner that never returns (`mw run --watch`); start it again afterwards, and its work resumes where it stopped" }
            ]
          }));
        }));
      }
      const { ids, kept } = retention(store, before);
      const home = dirname6(storePath);
      const files = [...ids.flatMap((id2) => [join9(home, "exports", String(id2)), itemHome(storePath, id2)]), ...ids.length ? [join9(home, "replay.html")] : []].filter(existsSync3);
      const storeBytes = () => sizeOf(storePath) + sizeOf(`${storePath}-wal`);
      const start = storeBytes() + files.reduce((n, f) => n + sizeOf(f), 0);
      if (!dryRun) {
        for (const f of files) rmSync6(f, { recursive: true, force: true });
        if (existsSync3(join9(home, "exports")) && !readdirSync3(join9(home, "exports")).length) rmSync6(join9(home, "exports"), { recursive: true });
      }
      const { items: _, ...records } = store.prune(ids, before, dryRun);
      const what = `${ids.length} finished item(s) with ${records.events} events and ${records.calls} calls, and ${files.length} file(s)`;
      const also = kept.length ? `; ${kept.length} older finished item(s) stay because work in flight needs them` : "";
      return {
        before,
        dryRun,
        summary: `${dryRun ? "Would remove" : "Removed"} ${what}${also}.`,
        items: ids,
        records,
        files,
        kept,
        freed: dryRun ? null : start - storeBytes(),
        next: dryRun && ids.length + records.events ? [{ run: `mw prune --before ${before}`, why: "remove them; nothing still moving or waiting on the operator is touched" }] : []
      };
    }).pipe(Effect_exports.scoped)
  })
];
var fieldsOf = (c) => Object.entries(c.input.fields);
var positional = (c) => (c.args ?? []).map((a) => a.replace("...", ""));
var isOptional2 = (f) => f.ast.context?.isOptional === true;
var usageOf = (c) => {
  const fields = c.input.fields;
  const args2 = (c.args ?? []).map((a) => {
    const name = a.replace("...", "");
    const rest = a.endsWith("...") ? "..." : "";
    return isOptional2(fields[name]) || fields[name].ast._tag === "Arrays" ? `[${name}${rest}]` : `<${name}${rest}>`;
  });
  const options = fieldsOf(c).filter(([k]) => !positional(c).includes(k)).map(([k, f]) => {
    const flag = f.ast._tag === "Boolean" ? `--${k}` : `--${k} <${k}>`;
    return isOptional2(f) ? `[${flag}]` : flag;
  });
  return ["mw", c.name, ...args2, ...options].join(" ");
};
var DEFAULTS = { additionalProperties: true, minimum: Number.MIN_SAFE_INTEGER, maximum: Number.MAX_SAFE_INTEGER };
var $defs = {};
var jsonSchema = (schema) => {
  const doc = JSON.parse(JSON.stringify(Schema_exports.toJsonSchemaDocument(schema), (k, v) => DEFAULTS[k] === v ? void 0 : v));
  Object.assign($defs, doc.definitions);
  return doc.schema;
};
var manual = Effect_exports.gen(function* () {
  const store = yield* Store;
  const items = store.list();
  const commands = COMMANDS.map((c) => ({ name: c.name, usage: usageOf(c), summary: c.summary, idempotent: c.idempotent ?? false, input: jsonSchema(Schema_exports.toType(c.input)), output: jsonSchema(c.output) }));
  return {
    manual: "mw",
    about: "Made Well delivers software work items to production with coding agents: ideation, planning, implementation and verification, each a separate agent, shipping when every check passes. Discovery turns raw notes into candidate items; the operator promotes the ones to deliver.",
    use: "Run `mw next` and do its action: run its command; or relay what it says to the operator and run the `then` command that fits their reply, with their words in place of the <...> slot; or wait until its time. Then run `mw next` again.",
    output: "Every command prints JSON. Results go to stdout. Errors go to stderr as {error, message, context, cause?, next} with exit code 1; `error` is one of the codes below and `context` has that code's shape.",
    commands,
    errors: Object.fromEntries(Object.entries(ERRORS).map(([code, e]) => [code, { means: e.means, context: jsonSchema(e.context) }])),
    $defs,
    state: {
      home: dirname6(registry),
      store: existsSync3(storePath) ? storePath : null,
      projects: yield* readProjects(registry),
      items: Object.fromEntries([...new Set(items.map((i) => i.status))].map((s) => [s, items.filter((i) => i.status === s).length])),
      next: yield* nextAction()
    }
  };
});
var SLOT = /^<[^<>]+>$/;
var program = Effect_exports.gen(function* () {
  const [name, ...argv] = process.argv.slice(2);
  if (name === void 0) return { store: false, effect: manual };
  const c = COMMANDS.find((c2) => c2.name === name);
  if (!c) return yield* usageError(name, `Unknown command "${name}". The commands are: ${COMMANDS.map((c2) => c2.name).join(", ")}.`);
  const names = positional(c);
  const { positionals, values: values2 } = yield* Effect_exports.try({
    try: () => parseArgs({
      args: argv,
      allowPositionals: true,
      strict: true,
      options: Object.fromEntries(fieldsOf(c).filter(([k]) => !names.includes(k)).map(([k, f]) => [k, { type: f.ast._tag === "Boolean" ? "boolean" : "string" }]))
    }),
    catch: (e) => usageError(name, e.message)
  });
  const raw = { ...values2 };
  (c.args ?? []).forEach((a, i) => {
    const field = a.replace("...", "");
    const value3 = a.endsWith("...") ? c.input.fields[field].ast._tag === "Arrays" ? positionals.slice(i) : positionals.slice(i).join(" ").trim() || void 0 : positionals[i];
    if (value3 !== void 0) raw[field] = value3;
  });
  if (positionals.length > names.length && !c.args?.at(-1)?.endsWith("...")) return yield* usageError(name, `Unexpected argument "${positionals[names.length]}". Usage: ${usageOf(c)}`);
  const slot = [...positionals, ...Object.values(values2)].find((v) => typeof v === "string" && SLOT.test(v.trim()));
  if (slot) return yield* usageError(name, `Replace the placeholder ${slot} with the real value before running the command.`);
  const input = yield* Schema_exports.decodeUnknownEffect(c.input)(raw).pipe(
    Effect_exports.mapError((e) => usageError(name, `${e.message}
Usage: ${usageOf(c)}`))
  );
  if (!c.prepare) return { store: false, effect: c.run(input, void 0) };
  const prepared = yield* c.prepare(input);
  return { store: true, effect: c.run(input, prepared) };
}).pipe(
  Effect_exports.flatMap(({ store, effect: effect2 }) => effect2.pipe(
    Effect_exports.provide(Layer_exports.mergeAll(storeLayer(store || existsSync3(storePath) ? storePath : ":memory:"), workerLayer))
  ))
);
var signalled = Effect_exports.callback((resume) => {
  const on = (signal) => resume(Effect_exports.succeed({ out: { interrupted: signal, next: [{ run: "mw next", why: "the interrupted work resumes where it stopped" }] }, code: 128 + osConstants.signals[signal] }));
  process.once("SIGINT", on).once("SIGTERM", on);
  return Effect_exports.sync(() => process.off("SIGINT", on).off("SIGTERM", on));
});
var exit3 = await Effect_exports.runPromise(Effect_exports.raceFirst(program.pipe(Effect_exports.match({ onSuccess: (out) => ({ out, code: 0 }), onFailure: (e) => ({ out: errorJson(e), code: 1 }) })), signalled));
var text = JSON.stringify(exit3.out) + "\n";
if (exit3.code) process.stderr.write(text);
else process.stdout.write(text);
process.exitCode = exit3.code;

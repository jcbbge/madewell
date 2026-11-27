#!/usr/bin/env node

// src/mcp.ts
import { realpathSync as realpathSync3 } from "node:fs";
import { isAbsolute as isAbsolute4, resolve as resolve7 } from "node:path";
import { fileURLToPath as fileURLToPath4 } from "node:url";
import { parseArgs } from "node:util";
import { Cause, Effect as Effect16, Layer as Layer8 } from "effect";
import { z as z6 } from "zod";
import { McpServer, ResourceTemplate, ResourceNotFoundError } from "@modelcontextprotocol/server";
import { serveStdio, StdioServerTransport } from "@modelcontextprotocol/server/stdio";

// src/brainstorm.ts
import { randomUUID as randomUUID3, createHash as createHash8 } from "node:crypto";
import { lstatSync as lstatSync4 } from "node:fs";
import { join as join5 } from "node:path";
import { Clock as Clock4, Context as Context5, Effect as Effect11, Layer as Layer6 } from "effect";
import { z as z2 } from "zod";

// src/brainstorm-seed.ts
import { fileURLToPath } from "node:url";
var brainstormSeedRoot = fileURLToPath(new URL("../brainstorm", import.meta.url));
var brainstormMethods = [
  "brainstorm",
  "ambitious-collaboration",
  "find-the-unlock",
  "right-side-of-the-curve",
  "nonconvergence",
  "ablation",
  "buoyant",
  "challenging-assumptions",
  "cognitive-approaches",
  "creative-systems-thinking",
  "criticality",
  "detecting-blind-spots",
  "exploring-possibilities",
  "idea-wizard",
  "luck",
  "mapping-adjacent-possibilities",
  "reframing-problems",
  "synthesizing-insights",
  "think-critically",
  "thinking-systemically"
];

// src/errors.ts
import { Data, Schema } from "effect";
var Next = Schema.Struct({ run: Schema.String, why: Schema.String }).annotate({ identifier: "Next" });
var quote = (s) => /^[\w@%+=:,./-]+$/.test(s) ? s : `'${s.replaceAll("'", `'\\''`)}'`;
var Id = Schema.Int;
var Hold = Schema.Struct({ code: Schema.String, message: Schema.String, context: Schema.Record(Schema.String, Schema.Unknown) });
var ERRORS = {
  portable_invalid: { means: "Portable composition, binding or skill content is invalid.", context: Schema.Record(Schema.String, Schema.Unknown) },
  portable_unreadable: { means: "Explicitly selected portable material could not be read.", context: Schema.Record(Schema.String, Schema.Unknown) },
  portable_stale: { means: "Portable package content changed after selection.", context: Schema.Record(Schema.String, Schema.Unknown) },
  brainstorm_invalid: { means: "The Brainstorm input, scope or saved handoff is inappropriate for this operation.", context: Schema.Record(Schema.String, Schema.Unknown) },
  brainstorm_entitlement_unavailable: { means: "Managed Focused and Deep access is unavailable; explicitly select the free Light path.", context: Schema.Record(Schema.String, Schema.Unknown) },
  mcp_failed: { means: "The local product MCP adapter could not complete its transport or lifecycle operation.", context: Schema.Record(Schema.String, Schema.Unknown) },
  settings_invalid: { means: "Settings failed validation.", context: Schema.Record(Schema.String, Schema.Unknown) },
  work_invalid: { means: "Work input failed validation.", context: Schema.Record(Schema.String, Schema.Unknown) },
  revision_conflict: { means: "The work changed concurrently.", context: Schema.Record(Schema.String, Schema.Unknown) },
  request_id_conflict: { means: "Request identity was reused with different input.", context: Schema.Record(Schema.String, Schema.Unknown) },
  discovery_dependency_invalid: { means: "A candidate dependency is invalid.", context: Schema.Record(Schema.String, Schema.Unknown) },
  work_terminal: { means: "Terminal work cannot be changed.", context: Schema.Record(Schema.String, Schema.Unknown) },
  work_busy: { means: "Work is not quiescent.", context: Schema.Record(Schema.String, Schema.Unknown) },
  blocker_exists: { means: "The active blocker already exists.", context: Schema.Record(Schema.String, Schema.Unknown) },
  blocker_not_found: { means: "The active blocker does not exist.", context: Schema.Record(Schema.String, Schema.Unknown) },
  completion_invalid: { means: "Completion evidence is invalid.", context: Schema.Record(Schema.String, Schema.Unknown) },
  file_result_invalid: { means: "A file reference is invalid.", context: Schema.Record(Schema.String, Schema.Unknown) },
  execution_uncertain: { means: "An interrupted side effect needs an explicit resolution.", context: Schema.Record(Schema.String, Schema.Unknown) },
  function_corrections_exhausted: { means: "The correction allowance is exhausted.", context: Schema.Record(Schema.String, Schema.Unknown) },
  migration_required: { means: "Historical storage needs migration.", context: Schema.Record(Schema.String, Schema.Unknown) },
  migration_in_progress: { means: "Migration is unfinished.", context: Schema.Record(Schema.String, Schema.Unknown) },
  migration_attestation_missing: { means: "Writers must be stopped before migration.", context: Schema.Record(Schema.String, Schema.Unknown) },
  migration_token_stale: { means: "The preview token is stale.", context: Schema.Record(Schema.String, Schema.Unknown) },
  migration_not_required: { means: "No migration is required.", context: Schema.Record(Schema.String, Schema.Unknown) },
  migration_conflict: { means: "Registry or migration state changed.", context: Schema.Record(Schema.String, Schema.Unknown) },
  prepared_input_failed: { means: "A prepared resource could not be captured or safely extracted.", context: Schema.Struct({ dir: Schema.String, phase: Schema.Literals(["capture", "assess", "extract"]), paths: Schema.Array(Schema.String), reason: Schema.String }) },
  replan_unavailable: { means: "Technical replanning is unavailable for this item state.", context: Schema.Struct({ id: Id, status: Schema.String, job: Schema.String, reason: Schema.String }) },
  usage: {
    means: "The command line is wrong: an unknown command or option, missing input, or a <placeholder> left unfilled. `mw` prints every command with its input schema.",
    context: Schema.Struct({ command: Schema.NullOr(Schema.String) })
  },
  source_unreadable: { means: "The file named by --source-file cannot be read.", context: Schema.Struct({ path: Schema.String }) },
  item_not_found: { means: "No work item has this number.", context: Schema.Struct({ id: Id }) },
  api_request: {
    means: "A versioned API request failed validation, security, concurrency or transport checks; context names the HTTP status and reason.",
    context: Schema.Struct({ status: Schema.Int, reason: Schema.String, facts: Schema.Record(Schema.String, Schema.Unknown) })
  },
  qa_request: {
    means: "A manual QA request was refused; retain the exact draft and request ID, and follow the refresh command before rebasing a conflict.",
    context: Schema.Struct({ status: Schema.Int, reason: Schema.String, facts: Schema.Record(Schema.String, Schema.Unknown) })
  },
  capture_failed: { means: "Live process output could not be captured; its process group was stopped rather than continuing without evidence.", context: Schema.Struct({ command: Schema.String, channel: Schema.String, reason: Schema.String }) },
  not_held: { means: "The item is not waiting on the operator, so there is nothing to answer or retry.", context: Schema.Struct({ id: Id, status: Schema.String, job: Schema.String }) },
  not_answerable: { means: "The item holds on something an answer does not resolve; `next` names what does.", context: Schema.Struct({ id: Id, hold: Hold }) },
  cause_required: { means: "The item holds on a failed check; the answer must name its cause with --cause.", context: Schema.Struct({ id: Id, hold: Hold }) },
  answer_required: { means: "The item waits on the operator's answer, not a retry.", context: Schema.Struct({ id: Id, hold: Hold }) },
  not_discovered: { means: "The item is not a finished discovery run, so it has no candidates to promote.", context: Schema.Struct({ id: Id, status: Schema.String, job: Schema.String }) },
  not_droppable: { means: "The work is terminal and cannot be dropped.", context: Schema.Struct({ id: Id, status: Schema.String }) },
  not_a_candidate: {
    means: "Some named items are not candidates of this discovery run.",
    context: Schema.Struct({ discovery: Id, unknown: Schema.Array(Id), candidates: Schema.Array(Schema.Struct({ id: Id, title: Schema.String })) })
  },
  store_locked: {
    means: "Another live runner is delivering from this store; queued work reaches it by itself.",
    context: Schema.Struct({
      store: Schema.String,
      owner: Schema.Struct({ pid: Schema.Int, since: Schema.String, item: Schema.NullOr(Schema.Struct({ id: Id, title: Schema.String, job: Schema.String, status: Schema.String })) })
    })
  },
  prescriptions_unreadable: { means: "The prescriptions file cannot be read.", context: Schema.Struct({ path: Schema.String, reason: Schema.String }) },
  prescriptions_invalid: {
    means: "The prescriptions file is not valid JSON, does not match its shape, or names an undefined tier.",
    context: Schema.Struct({
      path: Schema.String,
      reason: Schema.optionalKey(Schema.String),
      problems: Schema.optionalKey(Schema.String),
      job: Schema.optionalKey(Schema.String),
      tier: Schema.optionalKey(Schema.String),
      tiers: Schema.optionalKey(Schema.Array(Schema.String)),
      card: Schema.optionalKey(Schema.Unknown),
      harnesses: Schema.optionalKey(Schema.Array(Schema.String))
    })
  },
  cartridges_unreadable: { means: "The cartridge pack file cannot be read.", context: Schema.Struct({ path: Schema.String, reason: Schema.String }) },
  function_failed: {
    means: "A function failed its input, execution or output contract. Accepted earlier nodes remain saved.",
    context: Schema.Struct({ id: Id, job: Schema.String, reason: Schema.String })
  },
  cartridges_invalid: {
    means: "The cartridge pack does not plug into the console: it is not valid JSON, does not match the pack shape, or breaks the console's contract (`problems` lists each).",
    context: Schema.Struct({ path: Schema.String, problems: Schema.Array(Schema.String) })
  },
  eval_card_invalid: {
    means: "The --card of `mw eval` is neither a tier in prescriptions nor a card as JSON {harness, provider, account, model, effort} on a known harness.",
    context: Schema.Struct({ card: Schema.String, tiers: Schema.Array(Schema.String), harnesses: Schema.Array(Schema.String), problems: Schema.optionalKey(Schema.String) })
  },
  eval_no_calls: {
    means: "The store holds no recorded calls of that job (for those items) to replay; `recorded` counts the calls of each job it does hold.",
    context: Schema.Struct({ store: Schema.String, job: Schema.String, items: Schema.Array(Id), recorded: Schema.Record(Schema.String, Schema.Int) })
  },
  brief_unreadable: { means: "The file named by --brief cannot be read.", context: Schema.Struct({ path: Schema.String }) },
  export_failed: { means: "The export folder cannot be written.", context: Schema.Struct({ id: Id, dir: Schema.String, reason: Schema.String }) },
  ui_unavailable: { means: "The console cannot listen on the address asked for: the port is taken or not allowed.", context: Schema.Struct({ host: Schema.String, port: Schema.Int, reason: Schema.String }) },
  ui_unsupported: { means: "The web interface cannot be provisioned as a background service on this platform: only Linux (systemd user units) and macOS (LaunchAgents) are supported.", context: Schema.Struct({ platform: Schema.String, supported: Schema.Array(Schema.String) }) },
  ui_service_failed: { means: "The service manager (systemctl or launchctl) refused a step of installing, removing or inspecting the web interface service.", context: Schema.Struct({ platform: Schema.String, command: Schema.String, exitCode: Schema.Int, stderr: Schema.String }) },
  workspace_written: { means: "A read-only call changed scratch or declared material.", context: Schema.Struct({ dir: Schema.String, changes: Schema.Unknown }) },
  out_of_scope: {
    means: "The change touches files outside the plan's declared scope.",
    context: Schema.Struct({ dir: Schema.String, base: Schema.String, declared: Schema.Array(Schema.String), outside: Schema.Array(Schema.String), changed: Schema.Array(Schema.String) })
  },
  leftovers: { means: "A job left untracked or ignored files behind.", context: Schema.Struct({ dir: Schema.String, files: Schema.Array(Schema.String) }) },
  teardown_failed: {
    means: "Some resources an agent provisioned could not be torn down.",
    context: Schema.Struct({ cwd: Schema.String, failed: Schema.Array(Schema.Unknown), records: Schema.Array(Schema.Unknown) })
  }
};
var MadeWellError = class extends Data.TaggedError("MadeWellError") {
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

// src/legacy.ts
import { dirname as dirname5, join as join4 } from "node:path";
import { createHash as createHash5 } from "node:crypto";

// src/settings.ts
import { isAbsolute as isAbsolute2 } from "node:path";
import { Clock as Clock3, Effect as Effect9, Schema as Schema9 } from "effect";

// src/migration.ts
import { createHash as createHash3, randomUUID } from "node:crypto";
import { closeSync, constants, fstatSync, fsyncSync, lstatSync, openSync, readFileSync as readFileSync3, unlinkSync } from "node:fs";
import { dirname as dirname3 } from "node:path";
import { Clock, Context as Context2, Effect as Effect5, Layer as Layer3 } from "effect";

// src/store.ts
import { createHash as createHash2 } from "node:crypto";
import { mkdirSync as mkdirSync2 } from "node:fs";
import { dirname as dirname2, join as join2 } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { Context, Effect as Effect4, Layer as Layer2 } from "effect";

// src/readiness.ts
function functionSteps(pack, loop) {
  const steps = [], positions = /* @__PURE__ */ new Map();
  const visit = (node, cartridge, track = "main", parent, parallel = false) => {
    const position = positions.get(track) ?? 0;
    if (node.children) {
      if (node.mode === "parallel") node.children.forEach((child, i) => visit(child, cartridge, `${node.job}#${i}`, node.job, true));
      else for (const child of node.children) visit(child, cartridge, track, node.job, parallel);
      steps.push({ ...node, cartridge, loop, profile: "made well", duty: "Compose accepted child outputs.", receives: node.children.map((c) => c.job), children: node.children.map((c) => c.job), track, position, ...parent ? { parent } : {} });
      if (node.mode === "parallel") positions.set(track, position + 1);
    } else {
      steps.push({ ...node, children: void 0, cartridge, loop, profile: node.profile ?? "made well", duty: node.duty ?? "", receives: node.receives ?? steps.filter((s) => s.track === track && !s.children).slice(-1).map((s) => s.job), track, position, ...parent ? { parent } : {} });
      positions.set(track, position + 1);
    }
  };
  for (const c of pack[loop]) for (const n of c.steps) visit(n, c.cartridge);
  return steps;
}
function problemsOf(pack) {
  const problems = [];
  if (pack.runtime !== "functions" || pack.contracts?.execution !== "2") return ["runtime functions and contracts.execution 2 are required; historical packs are read-only."];
  const seen = /* @__PURE__ */ new Set();
  for (const loop of ["discovery", "delivery"]) {
    const steps = functionSteps(pack, loop), earlier = /* @__PURE__ */ new Set();
    for (const step of steps) {
      const at = `${loop}.${step.job}`;
      if (!/^[a-z][a-z0-9-]*$/.test(step.job) || seen.has(step.job)) problems.push(`${at}: invalid or duplicate job identity.`);
      seen.add(step.job);
      if (step.children) {
        if (!step.mode) problems.push(`${at}.mode: group requires sequence or parallel.`);
        if (step.run || step.profile !== "made well" || step.task) problems.push(`${at}: a group cannot execute.`);
        if (step.mode === "parallel" && step.track !== "main") problems.push(`${at}: nested parallel is refused.`);
      } else {
        if (!!step.run === !!(step.profile !== "made well" && step.duty)) problems.push(`${at}: exactly one trusted command or agent with profile and duty is required.`);
        if (step.output?.type !== "object") problems.push(`${at}.output: an object schema is required.`);
        if (!step.replay) problems.push(`${at}.replay: safe or explicit is required.`);
        if (!step.writes) problems.push(`${at}.writes: declare destination ids, including an empty array.`);
        if (step.writes?.length && step.replay !== "explicit") problems.push(`${at}: writing leaves require replay explicit.`);
        const failure5 = step.onFailure ?? { target: "hold" };
        if (failure5.target === "hold") {
          if (failure5.maxCorrections !== void 0) problems.push(`${at}.onFailure.maxCorrections: forbidden for hold.`);
        } else {
          const target2 = steps.find((s) => s.job === failure5.target);
          if (!target2 || target2.children || target2.track !== step.track || target2.position > step.position) problems.push(`${at}.onFailure.target: must name a same-track leaf at or before this leaf.`);
          else {
            const jobs2 = rewindJobs(steps, target2, step), explicit = steps.some((s) => s.replay === "explicit" && jobs2.has(s.job));
            if (explicit) problems.push(`${at}.onFailure.target: rewind range contains an explicit leaf.`);
          }
          if (!Number.isInteger(failure5.maxCorrections) || failure5.maxCorrections < 1 || failure5.maxCorrections > 3) problems.push(`${at}.onFailure.maxCorrections: must be 1-3.`);
        }
        for (const received of step.receives) if (!earlier.has(received) || steps.find((s) => s.job === received)?.track !== step.track && !(step.track !== "main" && steps.find((s) => s.job === received)?.track === "main" && steps.findIndex((s) => s.job === received) < steps.findIndex((s) => s.parent === step.parent))) problems.push(`${at}.receives: ${received} is not an earlier output in this track.`);
      }
      earlier.add(step.job);
    }
  }
  if (pack.completion) {
    const steps = functionSteps(pack, "delivery"), { resultJob, acceptanceJob } = pack.completion, r = steps.find((s) => s.job === resultJob), a = steps.find((s) => s.job === acceptanceJob);
    if (!r || !a || r.children || a.children || steps.indexOf(a) <= steps.indexOf(r) || !a.receives.includes(resultJob)) problems.push("completion: acceptance must be a later distinct leaf explicitly receiving the result.");
  }
  return problems;
}
function rewindJobs(steps, target2, failing) {
  const jobs2 = new Set(steps.filter((s) => s.track === failing.track && (!s.children || s.mode === "parallel") && s.position >= target2.position && s.position <= failing.position).map((s) => s.job));
  let expanded = true;
  while (expanded) {
    expanded = false;
    for (const step of steps) if (step.parent && jobs2.has(step.parent) && !jobs2.has(step.job)) {
      jobs2.add(step.job);
      expanded = true;
    }
  }
  let changed = true;
  while (changed) {
    changed = false;
    for (const step of steps) if (step.children?.some((j) => jobs2.has(j)) && !jobs2.has(step.job)) {
      jobs2.add(step.job);
      changed = true;
    }
  }
  return jobs2;
}
var isTerminal = (item) => ["completed", "dropped", "discovered"].includes(item.status);

// src/lane.ts
import { readFileSync } from "node:fs";
import { Effect as Effect2, Result as Result3, Schema as Schema4 } from "effect";

// src/decision.ts
import { Effect, Result, Schema as Schema2 } from "effect";
var Leg = Schema2.Struct({
  leg: Schema2.Literals(["DX", "UX", "AX"]),
  pass: Schema2.Boolean,
  cell: Schema2.optionalKey(Schema2.Int.check(Schema2.isBetween({ minimum: 1, maximum: 9 }))),
  gets: Schema2.NonEmptyString,
  costs: Schema2.NonEmptyString,
  why: Schema2.NonEmptyString
});
var Verdict = Schema2.Literals(["all-three", "at-least-two", "below-bar", "stop"]);
var Judgments = Schema2.Struct({ verdict: Verdict, legs: Schema2.Array(Leg) }).check(
  Schema2.makeFilter((v) => {
    if (v.legs.length !== 3 || new Set(v.legs.map((l) => l.leg)).size !== 3) return "Judge exactly one DX, UX and AX leg.";
    const hits = v.legs.filter((l) => l.pass).length;
    return v.verdict === (hits === 3 ? "all-three" : hits === 2 ? "at-least-two" : hits === 1 ? "below-bar" : "stop") || "The verdict must match the judged legs: 3 \u2192 all-three, 2 \u2192 at-least-two, 1 \u2192 below-bar, 0 \u2192 stop.";
  })
);
var DecisionResult = Schema2.Struct({
  recommendation: Schema2.NonEmptyString,
  verdict: Verdict,
  legs: Schema2.Array(Leg),
  reasoning: Schema2.NonEmptyString,
  operatorRequest: Schema2.optionalKey(Schema2.Struct({
    question: Schema2.NonEmptyString,
    candidates: Schema2.Array(Schema2.Struct({ path: Schema2.NonEmptyString, legs: Schema2.Array(Leg) })),
    ifUndecided: Schema2.NonEmptyString,
    recommendation: Schema2.NonEmptyString,
    reasoning: Schema2.NonEmptyString,
    mentalModelRequest: Schema2.NonEmptyString
  })),
  uncertainty: Schema2.optionalKey(Schema2.String)
}).check(Schema2.makeFilter((v) => {
  const result = Schema2.decodeUnknownResult(Judgments)(v);
  return Result.isSuccess(result) || String(result.failure);
}));
var Decision = Schema2.Struct({
  question: Schema2.NonEmptyString,
  questionId: Schema2.optionalKey(Schema2.NonEmptyString.annotate({ description: "the existing discovery question this decision resolves, when one was supplied; the decision stays with the same work item" })),
  decision: Schema2.NonEmptyString,
  why: Schema2.NonEmptyString,
  verdict: Verdict,
  legs: Schema2.Array(Leg)
}).check(Schema2.makeFilter((v) => {
  const result = Schema2.decodeUnknownResult(Judgments)(v);
  if (Result.isFailure(result)) return String(result.failure);
  return v.verdict === "all-three" || v.verdict === "at-least-two" || "Below two hits: reshape the choice or stop; do not advance it as a settled decision.";
}));
var RUBRIC = [
  "Before every choice, resolve in order: your context \u2192 repository intent and purpose \u2192 this rubric. Judge all three legs through their 3\xD73 matrices, recording pass, cell (1\u20139), gets, costs and why. No leg has priority. All three hits: all-three, build with conviction; two: at-least-two, proceed; one: below-bar, reshape or stop; zero: stop, do not build. Never skip this gate.",
  "DX \u2014 What leads to a world-class developer experience? Leverage \xD7 friction-to-adopt. Rows high/med/low leverage, columns low/med/high friction: 1 Ship now \u2014 flagship DX win; 2 Do it \u2014 smooth rough edges; 3 Worth it \u2014 cut friction first or sequence it; 4 Easy yes \u2014 batch in; 5 Default backlog \u2014 on the path; 6 Defer \u2014 needs real justification; 7 Cheap polish \u2014 only idle; 8 Skip unless unblocking; 9 The trap \u2014 do not build.",
  "UX \u2014 What makes a memorable and lovable user experience? Delight \xD7 cognitive load (steps, decisions, visual clutter). Beauty and visual craft belong here. Same row/column order: 1 The magic moment \u2014 beautiful and effortless; 2 Strong \u2014 ship, then quiet noise; 3 Locked treasure \u2014 cut load; 4 Easy goodwill \u2014 clean and simple; 5 Standard \u2014 on the path; 6 Reconsider \u2014 declutter before committing; 7 Invisible plumbing \u2014 fine if near-free; 8 Skip \u2014 not worth attention; 9 The cluttered wall \u2014 never ship.",
  "AX \u2014 What gives an efficient, optimized agentic experience? Capability (act and verify) \xD7 ambiguity. Same row/column order: 1 The dream slice \u2014 full power and clarity, act and prove; 2 Strong \u2014 tighten brief/context; 3 Powerful but blind \u2014 resolve ambiguity; 4 Clear but limited \u2014 better tools/feedback; 5 Workable middle \u2014 on the path; 6 Shaky \u2014 do not rely on result; 7 Clear but hamstrung \u2014 low stakes only; 8 Weak \u2014 avoid; 9 Blind guessing \u2014 never operate here.",
  "Waste of tokens, time, money, effort or resources is a symptom: fix upstream ambiguity, defective specs, improvisation or over-complication, not the symptom. All intelligence is front-loaded. Implementation and test-writing are deterministic functions: execute the fixed brief and report; never improvise, guess, redesign or negotiate with the operator mid-stream. If impossible, stop and report through the existing contingency path. NQ is bounded to three answered turns; unresolved questions then mean a spec/plan/dossier defect, at every autonomy level."
].join("\n");
var DecisionModel = Schema2.Struct({ enabled: Schema2.Boolean, provider: Schema2.NonEmptyString, options: Schema2.optionalKey(Schema2.Record(Schema2.String, Schema2.Unknown)) });
var resolveDecision = Effect.fn("mw.resolveDecision")(function* (request3, setting, providers = {}) {
  const fallback = (reason) => ({ path: "default-rubric", reason });
  if (setting === void 0) return fallback("absent");
  const config = Schema2.decodeUnknownResult(DecisionModel)(setting);
  if (Result.isFailure(config)) return fallback("invalid-config");
  if (!config.success.enabled) return fallback("disabled");
  const provider = Object.hasOwn(providers, config.success.provider) ? providers[config.success.provider] : void 0;
  if (!provider) return fallback("unknown-provider");
  const result = yield* Effect.suspend(() => provider(request3, config.success.options ?? {})).pipe(
    Effect.timeout("5 seconds"),
    Effect.flatMap(Schema2.decodeUnknownEffect(DecisionResult)),
    Effect.map((guidance) => {
      if (guidance.operatorRequest && (request3.mode !== "operator-hold-shape" || !request3.constraints.operatorEscalationPermitted)) return fallback("outside-authority");
      return { path: "cartridge-assisted", provider: config.success.provider, guidance };
    }),
    Effect.catchCause(() => Effect.succeed(fallback("provider-failed-or-invalid")))
  );
  return result;
});

// src/discovery-contract.ts
import { Result as Result2, Schema as Schema3 } from "effect";
var jobs = ["declare", "look-first", "classify", "lenses", "one-thing", "route", "discover"];
var Text = Schema3.NonEmptyString;
var Refs = Schema3.Array(Text);
var SourceRefs = Refs.annotate({ description: "Evidence identities: use evidence[].id values declared in this contribution or an earlier accepted contribution. Do not put file paths, URLs, line locators or evidence[].ref strings here. Declare each actual locator under evidence:[{id,ref}] and cite its id here." });
var Evidence = Schema3.Struct({ id: Text, ref: Text });
var Question = Schema3.Struct({ id: Text, text: Text, ownerRole: Text, blockingRole: Schema3.NullOr(Text), sources: SourceRefs });
var Claim = { id: Text, text: Text, sources: SourceRefs };
var Artifact = Schema3.Struct({ id: Text, description: Text, sources: SourceRefs });
var Candidate = {
  key: Text,
  title: Text,
  kind: Schema3.optionalKey(Text),
  objective: Text,
  text: Text,
  requirementIds: Refs,
  artifacts: Schema3.Array(Artifact)
};
var Dependency = Schema3.Struct({
  id: Text,
  producer: Text,
  consumer: Text,
  reason: Text,
  sources: SourceRefs,
  artifactId: Schema3.NullOr(Text),
  readiness: Schema3.Literals(["task-delivered", "within-task"]).annotate({ description: "Only task-delivered is executable. Split an early artifact into its own task; within-task readiness is unsupported." })
});
var Preparation = Schema3.Struct({ id: Text, candidate: Text, before: Text, reason: Text, sources: SourceRefs });
var Requirement = { ...Claim, kind: Schema3.Literals(["outcome", "constraint"]), origin: Schema3.Literals(["explicit", "interpretation"]) };
var IntentDisposition = Schema3.Struct({ intentId: Text, kind: Schema3.Literals(["provided", "context", "deferred", "superseded"]), reason: Text, sources: SourceRefs });
var QuestionRefs = Refs.annotate({ description: "IDs from accepted questions that this candidate must carry into delivery. Keep earlier bindings at confirmation; new route/confirmation questions can be added. Use [] when none apply." });
var common = {
  discoveryContract: Schema3.Literals(["1", "2"]),
  result: Text,
  sources: Refs,
  unknowns: Schema3.Array(Schema3.String),
  decisions: Schema3.Array(Decision),
  evidence: Schema3.Array(Evidence),
  questions: Schema3.Array(Question)
};
var schemas = {
  declare: Schema3.Struct({ ...common, intent: Schema3.Array(Schema3.Struct({ ...Claim, authority: Schema3.Literals(["explicit", "interpretation"]) })) }),
  "look-first": Schema3.Struct({ ...common, observations: Schema3.Array(Schema3.Struct(Claim)) }),
  classify: Schema3.Struct({ ...common, requirements: Schema3.Array(Schema3.Struct(Requirement)) }),
  lenses: Schema3.Struct({ ...common, tradeoffs: Schema3.Array(Schema3.Struct({ ...Claim, requirementIds: Refs })) }),
  "one-thing": Schema3.Struct({ ...common, candidates: Schema3.Array(Schema3.Struct(Candidate)) }),
  route: Schema3.Struct({ ...common, dependencies: Schema3.Array(Dependency), preparation: Schema3.Array(Preparation) }),
  discover: Schema3.Struct({ ...common, items: Schema3.Array(Schema3.Struct({ ...Candidate, conditions: Schema3.optionalKey(Schema3.Array(Schema3.Struct({ id: Text, text: Text }))), after: Schema3.Array(Schema3.Int) })), dependencyIds: Refs, preparationIds: Refs, questionIds: Refs })
};
var HandoffSourceRefs = Refs.annotate({ description: "Evidence references: cite evidence[].id values declared in this contribution or an earlier accepted contribution. Never invent IDs or substitute observation IDs, requirement IDs, raw locators, URLs or physical paths. Put each actual locator in evidence[].ref and cite its declared id here." });
var HandoffEvidence = Schema3.Struct({
  ...Evidence.fields,
  id: Evidence.fields.id.annotate({ description: "Declared evidence identity used by sources references in this contribution or later contributions." }),
  ref: Evidence.fields.ref.annotate({ description: "Actual source locator, such as a URL or physical path; this is not the identity cited by sources. Cite evidence[].id instead." })
});
var HandoffQuestion = Schema3.Struct({
  ...Question.fields,
  id: Question.fields.id.annotate({ description: "Declared question identity referenced by questionRefs and confirmation questionIds. Preserve existing question ownership and blocking-role rules." }),
  sources: HandoffSourceRefs
});
var HandoffClaim = { ...Claim, sources: HandoffSourceRefs };
var HandoffArtifact = Schema3.Struct({
  ...Artifact.fields,
  id: Artifact.fields.id.annotate({ description: "Declared artifact identity belonging to its candidate producer; dependency artifactId references this identity." }),
  sources: HandoffSourceRefs
});
var HandoffRequirementRefs = Refs.annotate({ description: "References to declared classify.requirements[].id values, not intent IDs, evidence IDs or candidate keys." });
var HandoffRequirement = {
  ...Requirement,
  id: Requirement.id.annotate({ description: "Declared requirement identity in classify.requirements, referenced by requirementIds." }),
  sources: HandoffSourceRefs
};
var HandoffIntentDisposition = Schema3.Struct({
  ...IntentDisposition.fields,
  intentId: IntentDisposition.fields.intentId.annotate({ description: "Reference to a declared Declare intent[].id value accounted for by this disposition." }),
  sources: HandoffSourceRefs
});
var HandoffCandidate = {
  ...Candidate,
  key: Candidate.key.annotate({ description: "Task identity declared by one-thing.candidates[].key and retained by confirmation; dependencies and preparation reference this candidate key." }),
  requirementIds: HandoffRequirementRefs,
  artifacts: Schema3.Array(HandoffArtifact)
};
var HandoffQuestionRefs = QuestionRefs.annotate({ description: "Declared questions[].id values from this contribution or earlier accepted contributions where supported. Retain accepted candidate bindings at confirmation; newly declared route/confirmation questions can be added. Preserve question ownership and blocking-role rules. Use [] when none apply." });
var HandoffDependency = Schema3.Struct({
  ...Dependency.fields,
  id: Dependency.fields.id.annotate({ description: "Route dependency identity retained in confirmation.dependencyIds." }),
  producer: Dependency.fields.producer.annotate({ description: "Producer task key declared in one-thing.candidates[].key." }),
  consumer: Dependency.fields.consumer.annotate({ description: "Consumer task key declared in one-thing.candidates[].key." }),
  sources: HandoffSourceRefs,
  artifactId: Dependency.fields.artifactId.annotate({ description: "Null or a declared artifacts[].id belonging to the named producer candidate; not an evidence ID, locator or consumer artifact." })
});
var HandoffPreparation = Schema3.Struct({
  ...Preparation.fields,
  id: Preparation.fields.id.annotate({ description: "Route preparation identity retained in confirmation.preparationIds." }),
  candidate: Preparation.fields.candidate.annotate({ description: "Preparing task key declared in one-thing.candidates[].key; names task-delivered readiness, not an environment name." }),
  before: Preparation.fields.before.annotate({ description: "Another declared one-thing.candidates[].key that receives the preparing task readiness; never runtime timing prose or an environment name." }),
  sources: HandoffSourceRefs
});
var handoffCommon = {
  ...common,
  sources: HandoffSourceRefs,
  evidence: Schema3.Array(HandoffEvidence),
  questions: Schema3.Array(HandoffQuestion)
};
var handoffSchemas = {
  declare: Schema3.Struct({ ...handoffCommon, intent: Schema3.Array(Schema3.Struct({ ...HandoffClaim, id: Claim.id.annotate({ description: "Declared intent identity in Declare intent[], referenced by requirements[].intentIds or intentDispositions[].intentId." }), authority: Schema3.Literals(["explicit", "interpretation"]) })) }),
  "look-first": Schema3.Struct({ ...handoffCommon, observations: Schema3.Array(Schema3.Struct({ ...HandoffClaim, id: Claim.id.annotate({ description: "Declared observation identity in look-first.observations; not an evidence identity for sources." }) })) }),
  classify: Schema3.Struct({ ...handoffCommon, requirements: Schema3.Array(Schema3.Struct({ ...HandoffRequirement, intentIds: Refs.annotate({ description: "One or more declared Declare intent[].id values accounted for by this requirement." }) })), intentDispositions: Schema3.Array(HandoffIntentDisposition).annotate({ description: "Explicitly account for declared intents that do not become requirements, with a reason and evidence IDs. Use [] when all intents map to requirements." }) }),
  lenses: Schema3.Struct({ ...handoffCommon, tradeoffs: Schema3.Array(Schema3.Struct({ ...HandoffClaim, id: Claim.id.annotate({ description: "Declared tradeoff identity in lenses.tradeoffs; not a requirement or evidence identity." }), requirementIds: HandoffRequirementRefs })) }),
  "one-thing": Schema3.Struct({ ...handoffCommon, candidates: Schema3.Array(Schema3.Struct({ ...HandoffCandidate, conditions: Schema3.optionalKey(Schema3.Array(Schema3.Struct({ id: Text, text: Text }))), questionRefs: HandoffQuestionRefs })) }),
  route: Schema3.Struct({ ...handoffCommon, dependencies: Schema3.Array(HandoffDependency), preparation: Schema3.Array(HandoffPreparation).annotate({ description: "Cross-task preparation promises describe task-delivered readiness. Required producer-before-consumer ordering must also appear in route.dependencies and the matching confirmation after graph; preparation does not create scheduling edges. Use [] when no genuine cross-task preparation promise exists. This is separate from the engine-owned per-job environment prepare command. Environment references use input:<id> for registered projectInputs; they are not candidate keys or invented discovery identities." }) }),
  discover: Schema3.Struct({
    ...handoffCommon,
    items: Schema3.Array(Schema3.Struct({ ...HandoffCandidate, conditions: Schema3.optionalKey(Schema3.Array(Schema3.Struct({ id: Text, text: Text }))), questionRefs: HandoffQuestionRefs, after: Schema3.Array(Schema3.Int).annotate({ description: "Distinct one-based positions of earlier confirmed items matching accepted route.dependencies; retain the accepted dependency graph. Use [] when no earlier dependencies apply." }) })),
    dependencyIds: Refs.annotate({ description: "Retained route.dependencies[].id values; use [] when no dependencies were declared." }),
    preparationIds: Refs.annotate({ description: "Retained route.preparation[].id values; use [] when no preparation promises were declared." }),
    questionIds: Refs.annotate({ description: "All declared questions[].id identities from earlier accepted contributions and supported current declarations, including newly declared confirmation questions. Use [] when none exist." })
  })
};
var DISCOVERY_CONTRIBUTION_SCHEMAS = Object.fromEntries(jobs.map((job) => [job, Schema3.toJsonSchemaDocument(schemas[job]).schema]));
var handoffShapes = Object.fromEntries(jobs.map((job) => [job, Schema3.toJsonSchemaDocument(handoffSchemas[job]).schema]));
var discoveryContributionShape = (job, options = {}) => {
  const shape = structuredClone(options.handoff ? handoffShapes[job] : DISCOVERY_CONTRIBUTION_SCHEMAS[job]);
  if (job === "discover") {
    const properties = shape.properties, candidate = properties.items.items;
    candidate.required = [.../* @__PURE__ */ new Set([...candidate.required ?? [], "conditions"])];
  }
  return shape;
};
var failed = (issues) => ({ ok: false, reason: issues.map((i) => `${i.at}: ${i.message}`).join(" "), issues });
function parseDiscoveryContribution(job, value, options = {}) {
  const parsed = Schema3.decodeUnknownResult((options.handoff ? handoffSchemas : schemas)[job])(value, { errors: "all" });
  return Result2.isFailure(parsed) ? failed([{ code: "shape", at: job, message: String(parsed.failure) }]) : { ok: true, value };
}
function validateDiscoveryContribution(job, value, accepted = {}, options = {}) {
  const current = parseDiscoveryContribution(job, value, options);
  if (!current.ok) return current;
  const issues = [];
  if (job === "discover" && value.discoveryContract === "2") {
    for (const [index, c] of (value.items ?? []).entries()) if (!c.conditions?.length || new Set(c.conditions.map((x) => x.id)).size !== c.conditions.length) issues.push({ code: "conditions", at: `discover.items[${index}].conditions`, message: "Conditions must be nonempty with unique ids." });
  }
  const issue = (code, at, message2) => issues.push({ code, at, message: message2 });
  const prefix = {};
  for (const previous of jobs.slice(0, jobs.indexOf(job))) {
    if (accepted[previous] === void 0) {
      issue("missing-contribution", previous, "An earlier accepted contribution is missing.");
      continue;
    }
    const parsed = parseDiscoveryContribution(previous, accepted[previous], options);
    if (!parsed.ok) issues.push(...parsed.issues);
    else Object.assign(prefix, { [previous]: parsed.value });
  }
  Object.assign(prefix, { [job]: current.value });
  const entries = jobs.flatMap((key) => prefix[key] ? [[key, prefix[key]]] : []);
  const evidence = /* @__PURE__ */ new Map();
  const questionIds = /* @__PURE__ */ new Set();
  const questionJobs = /* @__PURE__ */ new Map();
  const unique = (values, at) => {
    const seen = /* @__PURE__ */ new Set();
    for (const id2 of values) {
      if (!id2.trim()) issue("empty-identity", at, "An identity must contain visible text.");
      if (seen.has(id2)) issue("duplicate-identity", at, `Identity ${id2} repeats.`);
      seen.add(id2);
    }
  };
  for (const [key, contribution] of entries) {
    unique(contribution.evidence.map((e) => e.id), `${key}.evidence`);
    for (const e of contribution.evidence) {
      if (evidence.has(e.id) && evidence.get(e.id) !== e.ref) issue("changed-source", `${key}.evidence`, `Source ${e.id} changes its accepted reference.`);
      evidence.set(e.id, e.ref);
    }
    unique(contribution.questions.map((q) => q.id), `${key}.questions`);
    for (const q of contribution.questions) {
      if (questionIds.has(q.id)) issue("changed-question", `${key}.questions`, `Question ${q.id} already exists; preserve its accepted identity by reference.`);
      questionIds.add(q.id);
      questionJobs.set(q.id, key);
      if (!q.ownerRole.trim() || q.blockingRole !== null && !q.blockingRole.trim()) issue("ownerless-question", `${key}.questions.${q.id}`, "A question needs an owning role and an explicit blocking role or null.");
    }
  }
  const refs = (ids2, at, universe, required = false) => {
    unique(ids2, at);
    if (required && !ids2.length) issue("missing-reference", at, "At least one accepted reference is required.");
    for (const id2 of ids2) if (!universe.has(id2)) issue("unknown-reference", at, `Unknown reference ${id2}. Cite a declared identity, not its path or text.`);
  };
  for (const [key, contribution] of entries) for (const q of contribution.questions) refs(q.sources, `${key}.questions.${q.id}.sources`, evidence, true);
  const requirements = prefix.classify?.requirements ?? [];
  const requiredIds = new Set(requirements.map((r) => r.id));
  unique(requirements.map((r) => r.id), "classify.requirements");
  if (options.handoff && prefix.classify) {
    const intents = new Set((prefix.declare?.intent ?? []).map((intent) => intent.id));
    const covered = /* @__PURE__ */ new Set();
    for (const requirement of requirements) {
      refs(requirement.intentIds, `classify.requirements.${requirement.id}.intentIds`, intents, true);
      for (const id2 of requirement.intentIds) covered.add(id2);
    }
    const dispositions = prefix.classify.intentDispositions;
    unique(dispositions.map((disposition) => disposition.intentId), "classify.intentDispositions");
    for (const disposition of dispositions) {
      refs([disposition.intentId], "classify.intentDispositions.intentId", intents);
      refs(disposition.sources, `classify.intentDispositions.${disposition.intentId}.sources`, evidence, true);
      if (!disposition.reason.trim()) issue("missing-disposition-reason", `classify.intentDispositions.${disposition.intentId}`, "An intent disposition needs its source-grounded reason.");
      if (covered.has(disposition.intentId)) issue("conflicting-intent-disposition", `classify.intentDispositions.${disposition.intentId}`, "An intent cannot be both assigned to requirements and disposed of.");
      covered.add(disposition.intentId);
    }
    for (const id2 of intents) if (!covered.has(id2)) issue("lost-intent", "classify", `Declared intent ${id2} needs a requirement or an explicit sourced disposition.`);
  }
  for (const [key, claims] of [
    ["declare.intent", prefix.declare?.intent ?? []],
    ["look-first.observations", prefix["look-first"]?.observations ?? []],
    ["classify.requirements", requirements],
    ["lenses.tradeoffs", prefix.lenses?.tradeoffs ?? []]
  ]) {
    unique(claims.map((c) => c.id), key);
    for (const c of claims) refs(c.sources, `${key}.${c.id}.sources`, evidence, true);
  }
  for (const tradeoff of prefix.lenses?.tradeoffs ?? []) refs(tradeoff.requirementIds, `lenses.tradeoffs.${tradeoff.id}.requirementIds`, requiredIds, true);
  const candidates2 = prefix["one-thing"]?.candidates ?? [];
  const candidateKeys = new Set(candidates2.map((c) => c.key));
  const artifacts = /* @__PURE__ */ new Map();
  unique(candidates2.map((c) => c.key), "one-thing.candidates");
  const checkCandidates = (items, at) => {
    const covered = /* @__PURE__ */ new Set();
    for (const candidate of items) {
      refs(candidate.requirementIds, `${at}.${candidate.key}.requirementIds`, requiredIds, true);
      if (options.handoff) refs(candidate.questionRefs, `${at}.${candidate.key}.questionRefs`, questionIds);
      candidate.requirementIds.forEach((id2) => covered.add(id2));
      unique(candidate.artifacts.map((a) => a.id), `${at}.${candidate.key}.artifacts`);
      for (const artifact of candidate.artifacts) refs(artifact.sources, `${at}.${candidate.key}.artifacts.${artifact.id}.sources`, evidence, true);
    }
    for (const id2 of requiredIds) if (!covered.has(id2)) issue("lost-requirement", at, `Requirement ${id2} has no candidate owner.`);
    if (options.handoff) {
      const bound = new Set(items.flatMap((candidate) => candidate.questionRefs));
      const boundary2 = jobs.indexOf(at === "one-thing.candidates" ? "one-thing" : "discover");
      for (const [key, contribution] of entries) if (jobs.indexOf(key) <= boundary2) for (const question2 of contribution.questions) {
        if (question2.blockingRole !== null && !bound.has(question2.id)) issue("lost-blocking-question", at, `Blocking question ${question2.id} needs at least one candidate to carry its resolution obligation.`);
      }
    }
  };
  if (prefix["one-thing"]) checkCandidates(candidates2, "one-thing.candidates");
  for (const candidate of candidates2) for (const artifact of candidate.artifacts) {
    if (artifacts.has(artifact.id)) issue("duplicate-artifact", "one-thing.candidates", `Artifact ${artifact.id} has multiple producers.`);
    artifacts.set(artifact.id, candidate.key);
  }
  const dependencies = prefix.route?.dependencies ?? [];
  const preparation = prefix.route?.preparation ?? [];
  unique(dependencies.map((e) => e.id), "route.dependencies");
  unique(preparation.map((p) => p.id), "route.preparation");
  const predecessors = /* @__PURE__ */ new Map();
  for (const edge of dependencies) {
    refs([edge.producer], `route.dependencies.${edge.id}.producer`, candidateKeys);
    refs([edge.consumer], `route.dependencies.${edge.id}.consumer`, candidateKeys);
    refs(edge.sources, `route.dependencies.${edge.id}.sources`, evidence, true);
    if (!edge.reason.trim()) issue("missing-reason", `route.dependencies.${edge.id}`, "A dependency needs a reason.");
    if (edge.readiness !== "task-delivered") issue("unsupported-readiness", `route.dependencies.${edge.id}`, "Within-task readiness is unsupported; make the prerequisite artifact a separately delivered task.");
    if (edge.artifactId !== null && artifacts.get(edge.artifactId) !== edge.producer) issue("unknown-artifact", `route.dependencies.${edge.id}.artifactId`, `Artifact ${edge.artifactId} is not produced by ${edge.producer}.`);
    const before = predecessors.get(edge.consumer) ?? /* @__PURE__ */ new Set();
    if (before.has(edge.producer)) issue("duplicate-dependency", `route.dependencies.${edge.id}`, "This producer/consumer edge already exists.");
    before.add(edge.producer);
    predecessors.set(edge.consumer, before);
  }
  const reaches = (from, target2, seen = /* @__PURE__ */ new Set()) => {
    if (seen.has(from)) return false;
    seen.add(from);
    return [...predecessors.get(from) ?? []].some((before) => before === target2 || reaches(before, target2, seen));
  };
  for (const key of candidateKeys) if (reaches(key, key)) issue("cyclic-dependency", "route.dependencies", `Candidate ${key} depends on itself through the routing graph.`);
  for (const promise of preparation) {
    refs([promise.candidate], `route.preparation.${promise.id}.candidate`, candidateKeys);
    refs([promise.before], `route.preparation.${promise.id}.before`, candidateKeys);
    refs(promise.sources, `route.preparation.${promise.id}.sources`, evidence, true);
    if (promise.candidate === promise.before || reaches(promise.candidate, promise.before)) issue("serialized-preparation", `route.preparation.${promise.id}`, `Promised preparation ${promise.candidate} waits for ${promise.before}. Split an early artifact into an independent task.`);
  }
  const confirmed = prefix.discover;
  if (confirmed) {
    unique(confirmed.items.map((c) => c.key), "discover.items");
    checkCandidates(confirmed.items, "discover.items");
    const conserved = (actual, expected, at, code) => {
      refs(actual, at, new Set(expected));
      for (const id2 of expected) if (!actual.includes(id2)) issue(code, at, `Accepted identity ${id2} was dropped.`);
    };
    conserved(confirmed.items.map((c) => c.key), [...candidateKeys], "discover.items", "lost-candidate");
    conserved(confirmed.dependencyIds, dependencies.map((e) => e.id), "discover.dependencyIds", "lost-dependency");
    conserved(confirmed.preparationIds, preparation.map((p) => p.id), "discover.preparationIds", "lost-preparation");
    conserved(confirmed.questionIds, [...questionIds], "discover.questionIds", "lost-question");
    const positions = new Map(confirmed.items.map((c, index) => [c.key, index + 1]));
    for (const [index, candidate] of confirmed.items.entries()) {
      const prior = candidates2.find((c) => c.key === candidate.key);
      if (prior) {
        const fixedFields = options.handoff ? ["kind"] : ["title", "kind", "objective", "text"];
        if (fixedFields.some((key) => candidate[key] !== prior[key])) issue("changed-candidate", `discover.items.${candidate.key}`, options.handoff ? "The candidate kind changed at confirmation." : "The accepted candidate definition changed at confirmation; retain its title, kind, objective and text.");
        if ([...candidate.requirementIds].sort().join("\0") !== [...prior.requirementIds].sort().join("\0")) issue("changed-ownership", `discover.items.${candidate.key}`, "Requirement ownership changed after synthesis.");
        if (options.handoff) {
          const before = prior.questionRefs;
          const after = candidate.questionRefs;
          if (before.some((id2) => !after.includes(id2)) || after.some((id2) => !before.includes(id2) && jobs.indexOf(questionJobs.get(id2)) <= jobs.indexOf("one-thing"))) issue("changed-question-ownership", `discover.items.${candidate.key}.questionRefs`, "Retain the candidate's accepted question bindings; only newly discovered questions may be added.");
        }
        const artifactIdentity = (items) => JSON.stringify(items.map((a) => [a.id, ...options.handoff ? [] : [a.description], [...a.sources].sort()]).sort((a, b) => String(a[0]).localeCompare(String(b[0]))));
        if (artifactIdentity(candidate.artifacts) !== artifactIdentity(prior.artifacts)) issue("changed-artifact", `discover.items.${candidate.key}`, "Accepted artifact deliverables changed at confirmation.");
      }
      const expected = [...predecessors.get(candidate.key) ?? []].map((key) => positions.get(key)).filter((p) => p !== void 0).sort((a, b) => a - b);
      if (candidate.after.some((position) => position < 1 || position > index) || new Set(candidate.after).size !== candidate.after.length) issue("invalid-after", `discover.items.${candidate.key}.after`, "Dependencies must name distinct earlier candidate positions.");
      if (JSON.stringify([...candidate.after].sort((a, b) => a - b)) !== JSON.stringify(expected)) issue("changed-dependency", `discover.items.${candidate.key}.after`, "The executable after graph differs from accepted routing.");
    }
  }
  return issues.length ? failed(issues) : current;
}

// src/lane.ts
var Positive = Schema4.Finite.check(Schema4.isGreaterThan(0));
var StepFields = {
  job: Schema4.String.annotate({ description: `the job's name, lowercase letters, digits and "-"; names carry no behavior` }),
  profile: Schema4.optionalKey(Schema4.NonEmptyString.annotate({ description: "the agent profile that does it, never a personal name" })),
  duty: Schema4.optionalKey(Schema4.NonEmptyString.annotate({ description: "what the job is for and what it must not do, in one or two sentences" })),
  task: Schema4.optionalKey(Schema4.NonEmptyString.annotate({ description: "further instructions for the job itself" })),
  receives: Schema4.optionalKey(Schema4.Array(Schema4.String).annotate({ description: 'earlier jobs of the same loop whose deliverables it gets ("discover" in delivery: the candidate); default: every earlier one' })),
  output: Schema4.optionalKey(Schema4.Record(Schema4.String, Schema4.Unknown).annotate({ description: `a thinking step's deliverable as JSON Schema, {"type": "object", ...}: Made Well checks type, properties, required, items, enum and anyOf` })),
  tier: Schema4.optionalKey(Schema4.NonEmptyString.annotate({ description: `a thinking step's prescribed tier when the prescriptions do not name its job; default "deep"` })),
  budget: Schema4.optionalKey(Schema4.Struct({ minutes: Positive, tokens: Schema4.optional(Positive) }).annotate({ description: "a thinking step's budget when the prescriptions do not name its job" })),
  run: Schema4.optionalKey(Schema4.NonEmptyString.annotate({ description: "functions runtime: trusted command, JSON input on stdin, JSON object output on stdout; stderr carries logs" })),
  check: Schema4.optionalKey(Schema4.NonEmptyString.annotate({ description: "functions runtime: trusted preaccept command; receives {input, output} JSON on stdin, exit 0 accepts the original output" })),
  input: Schema4.optionalKey(Schema4.Record(Schema4.String, Schema4.Unknown)),
  args: Schema4.optionalKey(Schema4.Record(Schema4.String, Schema4.Unknown)),
  mode: Schema4.optionalKey(Schema4.Literals(["sequence", "parallel"])),
  replay: Schema4.optionalKey(Schema4.Literals(["safe", "explicit"])),
  writes: Schema4.optionalKey(Schema4.Array(Schema4.NonEmptyString)),
  onFailure: Schema4.optionalKey(Schema4.Struct({ target: Schema4.NonEmptyString, maxCorrections: Schema4.optionalKey(Schema4.Int) })),
  access: Schema4.optionalKey(Schema4.Literals(["none", "read", "make", "checks", "run"]))
};
var StepSpec = Schema4.Struct({
  ...StepFields,
  children: Schema4.optionalKey(Schema4.Array(Schema4.suspend(() => StepSpec)))
}).annotate({ identifier: "Step" });
var CartridgeSpec = Schema4.Struct({
  cartridge: Schema4.NonEmptyString.annotate({ description: "its name, shown as the stage of its steps" }),
  steps: Schema4.Array(StepSpec)
}).annotate({ identifier: "Cartridge" });
var Pack = Schema4.Struct({
  name: Schema4.NonEmptyString,
  runtime: Schema4.optionalKey(Schema4.Literals(["software", "functions"]).annotate({ description: "functions runs explicit node contracts; software is a historical decoding value only" })),
  version: Schema4.optionalKey(Schema4.NonEmptyString),
  contracts: Schema4.optionalKey(Schema4.Struct({ execution: Schema4.optionalKey(Schema4.Literals(["1", "2"])), discovery: Schema4.optionalKey(Schema4.Literals(["1", "2"])), acceptance: Schema4.optionalKey(Schema4.Literals(["1", "2"])), handoff: Schema4.optionalKey(Schema4.Literals(["1", "2"])) })),
  completion: Schema4.optionalKey(Schema4.Struct({ resultJob: Schema4.NonEmptyString, acceptanceJob: Schema4.NonEmptyString })),
  brief: Schema4.optionalKey(Schema4.String.annotate({ description: "what every call of this kind of work should know, added to the shared brief" })),
  discovery: Schema4.Array(CartridgeSpec).annotate({ description: "raw input in, candidates out" }),
  delivery: Schema4.Array(CartridgeSpec).annotate({ description: "ordered cartridges; functions may have zero, one or many nodes, including nested children" })
}).annotate({ identifier: "Pack" });
var compile = (pack) => ({ pack, discovery: functionSteps(pack, "discovery"), delivery: functionSteps(pack, "delivery"), makers: [], arbiter: { job: "arbitrate", profile: "arbiter", duty: "", cartridge: "unspecified", loop: "delivery", receives: [] } });
var UNSPECIFIED = { name: "unspecified", runtime: "functions", discovery: [], delivery: [] };
var lanes = /* @__PURE__ */ new Map();
var laneOf = (pack) => {
  const key = pack ? JSON.stringify(pack) : "";
  let lane = lanes.get(key);
  if (!lane) lanes.set(key, lane = compile(pack ?? UNSPECIFIED));
  return lane;
};
var loadPack = (path) => Effect2.gen(function* () {
  const text5 = yield* Effect2.try({
    try: () => readFileSync(path, "utf8"),
    catch: (e) => new MadeWellError({ code: "cartridges_unreadable", message: `Cannot read the cartridge pack ${path}.`, context: { path, reason: String(e) }, next: [{ run: `ls -l ${path}`, why: "check the file exists and is readable" }, { run: "mw cartridges", why: "print the default pack to start one from" }] })
  });
  const invalid = (problems2) => new MadeWellError({
    code: "cartridges_invalid",
    message: `The cartridge pack ${path} does not plug into the console.`,
    context: { path, problems: problems2 },
    cause: 'A pack is {name, runtime?, version?, brief?, discovery: [cartridge], delivery: [cartridge]}. Each cartridge has steps. Historical software packs remain read-only. runtime "functions" has no required nodes: use agent profiles, trusted commands, or nested children with input/output contracts.',
    next: [{ run: `$EDITOR ${path}`, why: "fix each problem in context.problems" }, { run: "mw cartridges", why: "compare with the unspecified inert lane" }]
  });
  const json = yield* Effect2.try({ try: () => JSON.parse(text5), catch: (e) => invalid([`It is not valid JSON: ${String(e)}`]) });
  const pack = yield* Schema4.decodeUnknownEffect(Pack)(json).pipe(Effect2.mapError((e) => invalid([String(e)])));
  const problems = problemsOf(pack);
  if (problems.length) return yield* invalid(problems);
  return pack;
});
var Text2 = Schema4.String;
var Decisions = Schema4.Array(Decision).annotate({ description: "every decision this job settled, and why" });
var Resource = Schema4.Struct({
  kind: Text2.annotate({ description: "for example database-branch, dev-clone, server" }),
  id: Text2,
  teardown: Text2.annotate({ description: "shell command that removes it" })
});
var Provisioned = Schema4.optionalKey(Schema4.Array(Resource).annotate({ description: "anything you started or created that is still standing; Made Well tears each down" }));
var DoneWhen = Schema4.Struct({
  id: Text2.annotate({ description: "short and unique, for example D1" }),
  text: Text2,
  evidence: Schema4.optionalKey(Schema4.Unknown)
});
var Check = Schema4.Struct({
  id: Text2.annotate({ description: "short and unique, for example C1" }),
  doneWhen: Text2.annotate({ description: "the id of the plan's done-when item this check proves" }),
  run: Text2.annotate({ description: "shell command run from the repo root; exit 0 means the item is done" })
});
var Candidate2 = Schema4.Struct({
  title: Text2,
  kind: Schema4.optionalKey(Schema4.NonEmptyString),
  objective: Text2,
  text: Text2,
  conditions: Schema4.Array(Schema4.Struct({ id: Schema4.NonEmptyString, text: Schema4.NonEmptyString })),
  after: Schema4.optionalKey(Schema4.Array(Schema4.Int).annotate({ description: "positions (1 is the first) of earlier items in this list that must ship before this one starts, because it builds on them" }))
});
var PLAN = Schema4.Struct({
  making: Text2,
  notMaking: Schema4.Array(Text2),
  scope: Schema4.Array(Text2).annotate({ description: 'every file the change may touch, repo-relative; a directory ends in "/". A change outside it is refused.' }),
  steps: Schema4.Array(Text2).annotate({ description: "exact instructions with paths; nothing left to decide" }),
  doneWhen: Schema4.Array(DoneWhen),
  resume: Schema4.optionalKey(Schema4.Array(Schema4.Struct({ role: Schema4.Literals(["implement", "test-plan"]), sha256: Schema4.String }))),
  decisions: Decisions,
  follows: Schema4.optionalKey(Schema4.Array(Schema4.Struct({
    path: Text2.annotate({ description: "a scope entry that does not exist yet" }),
    follows: Text2.annotate({ description: "the existing file (same extension) or directory it is modelled on" })
  })).annotate({ description: "for every new file or directory in scope, the existing one it follows; its makers receive that file. Required whenever the repo already has one of that kind." })),
  conventions: Schema4.optionalKey(Schema4.Array(Schema4.Struct({
    convention: Text2.annotate({ description: "one of item.conventions, word for word" }),
    doneWhen: Schema4.optionalKey(Text2.annotate({ description: "the id of the done-when item that proves the change keeps it" })),
    doesNotApply: Schema4.optionalKey(Text2.annotate({ description: "instead of doneWhen: why this change cannot touch it" }))
  })).annotate({ description: "every one of item.conventions, held to a done-when item or said not to apply. Required whenever the item has conventions." }))
});
var Reuse = Schema4.optionalKey(Schema4.Array(Schema4.Struct({
  question: Text2.annotate({ description: "the current question, word for word, that an earlier answer already settles, even if phrased differently" }),
  answerId: Text2.annotate({ description: "the id in answeredBefore of the saved answer to reuse; never invent one" })
})));
var INTAKE = Schema4.Struct({
  understanding: Text2,
  unclear: Schema4.Array(Text2).annotate({ description: "What is unclear?" }),
  ambiguous: Schema4.Array(Text2).annotate({ description: "What is ambiguous?" }),
  missing: Schema4.Array(Text2).annotate({ description: "Do I have everything I need to proceed? What is missing." }),
  notes: Schema4.Array(Text2).annotate({ description: "points the packet already settles; never an assumption or a choice" }),
  reuse: Reuse
});
var ORIGINATOR = Schema4.Struct({
  answer: Schema4.NonEmptyString,
  needsOperator: Schema4.Boolean,
  decisions: Schema4.optionalKey(Decisions.annotate({ description: "every new choice settled in this answer, with the triple gate; omit only for factual clarification or saved-answer reuse" })),
  reuse: Reuse
});
var shapeOf = (schema) => JSON.parse(JSON.stringify(Schema4.toJsonSchemaDocument(schema).schema, (k, v) => k === "additionalProperties" ? void 0 : v));
function lastJson(text5) {
  text5 = text5.replace(/\s*```\s*$/, "");
  for (let start = text5.lastIndexOf("{"); start !== -1; start = start === 0 ? -1 : text5.lastIndexOf("{", start - 1)) {
    try {
      const value = JSON.parse(text5.slice(start).trim());
      if (value && typeof value === "object" && !Array.isArray(value)) return value;
    } catch {
    }
  }
  return void 0;
}

// src/telemetry.ts
import { createHash } from "node:crypto";
import { appendFileSync, mkdirSync, readdirSync, readFileSync as readFileSync2 } from "node:fs";
import { hostname } from "node:os";
import { dirname, join, matchesGlob, resolve } from "node:path";
import { fileURLToPath as fileURLToPath2 } from "node:url";
import { Effect as Effect3, Layer, Tracer } from "effect";
var WRITE_TOOLS = ["Edit", "Write", "MultiEdit", "NotebookEdit", "edit_file", "create_file", "undo_edit", "file_change", "edit", "write"];
var lines = (raw) => raw.split("\n").flatMap((l) => {
  try {
    const e = JSON.parse(l);
    return e && typeof e === "object" ? [e] : [];
  } catch {
    return [];
  }
});
var bytes = (v) => v === void 0 || v === null ? 0 : Buffer.byteLength(typeof v === "string" ? v : JSON.stringify(v));
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
function toolTracker(harness) {
  const open = /* @__PURE__ */ new Map();
  let changed = [];
  const report2 = (e, state) => {
    const { t: _, ...event } = e;
    changed.push({ event, state });
  };
  const issue = (id2, tool, input, t, tokens) => {
    if (open.has(id2)) return;
    const e = { seq: open.size + 1, tool, digest: digest(input), inputBytes: bytes(input), outputBytes: 0, tokens, at: t === null ? null : new Date(t).toISOString(), ms: null, error: false, t };
    open.set(id2, e);
    report2(e, "started");
  };
  const finish = (id2, output, t, error) => {
    const e = open.get(id2);
    if (!e) return;
    e.outputBytes = bytes(output);
    e.error = error;
    if (e.t !== null && t !== null) e.ms = t - e.t;
    report2(e, "returned");
  };
  const seen = /* @__PURE__ */ new Set();
  const stepTokens = /* @__PURE__ */ new Map();
  const append = (raw, at) => {
    changed = [];
    for (const e of lines(raw)) {
      const t = timeOf(e) ?? at ?? null;
      if (harness === "claude" || harness === "amp") {
        const blocks = Array.isArray(e.message?.content) ? e.message.content : [];
        if (e.type === "assistant") {
          let fresh = !e.message?.id || !seen.has(e.message.id);
          if (e.message?.id) seen.add(e.message.id);
          for (const b of blocks.filter((b2) => b2.type === "tool_use")) {
            issue(b.id, b.name, b.input, t, fresh ? num(e.message.usage?.output_tokens) : null);
            fresh = false;
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
    return changed;
  };
  return { append, events: () => [...open.values()].map(({ t: _, ...event }) => event) };
}
function toolEvents(harness, raw) {
  const tracker = toolTracker(harness);
  tracker.append(raw ?? "");
  return tracker.events();
}
function tokensOf(harness, raw) {
  const evs = lines(raw ?? "");
  const sum = (usages, pick) => usages.length ? usages.map(pick).reduce((a, b) => ({ input: a.input + b.input, output: a.output + b.output, cacheRead: a.cacheRead + b.cacheRead, cacheWrite: a.cacheWrite + b.cacheWrite })) : null;
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
    return sum(steps.map((e) => e.message.usage), anthropic);
  }
  if (harness === "codex") {
    return sum(evs.filter((e) => e.type === "turn.completed" && e.usage).map((e) => e.usage), (u) => ({ input: Math.max(0, num(u.input_tokens) - num(u.cached_input_tokens)), output: num(u.output_tokens), cacheRead: num(u.cached_input_tokens), cacheWrite: num(u.cache_write_input_tokens) }));
  }
  return sum(evs.filter((e) => e.type === "message_end" && e.message?.role === "assistant" && e.message.usage).map((e) => e.message.usage), (u) => ({ input: num(u.input), output: num(u.output), cacheRead: num(u.cacheRead), cacheWrite: num(u.cacheWrite) }));
}
var totalTokens = (t) => t ? t.input + t.output + t.cacheRead + t.cacheWrite : 0;
var inScope = (file, scope) => {
  const f = file.replace(/^\.\//, "");
  return scope.some((s) => {
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
var build;
var buildOf = () => {
  if (build !== void 0) return build;
  try {
    const here = dirname(fileURLToPath2(import.meta.url));
    const hash4 = createHash("sha256");
    for (const f of readdirSync(here).filter((f2) => /\.(ts|mjs)$/.test(f2)).sort()) hash4.update(f).update(readFileSync2(join(here, f)));
    build = hash4.digest("hex").slice(0, 12);
  } catch {
    build = null;
  }
  return build;
};
var KEEP = /* @__PURE__ */ new Set(["kind", "job", "profile", "harness", "provider", "account", "model", "effort", "outcome", "status", "code", "cause", "rule", "flags", "tool", "tools", "allowlist", "required", "fields", "access", "digest", "exceeded", "verdict", "tier", "prescribed", "from", "to", "by", "receiver", "originator", "ref", "main", "on", "commit", "verifiedOn", "conflict", "before", "after", "id", "doneWhen", "name", "trace", "span", "parent", "invocation", "channel", "state", "decoder", "at", "started", "start", "since", "resetsAt", "workspace", "harnessVersion"]);
var metrics = (v, key = "") => typeof v === "string" ? KEEP.has(key) ? v : v.length : Array.isArray(v) ? v.map((x) => metrics(x, key)) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, metrics(x, k)])) : v;
function telemetry(storePath) {
  const dir = process.env.MW_TELEMETRY;
  if (!dir || storePath === ":memory:") return void 0;
  const host = hostname();
  const store = createHash("sha256").update(resolve(storePath)).digest("hex").slice(0, 8);
  const file = join(resolve(dir), `${host}-${store}.jsonl`);
  const full = [void 0, "", "full"].includes(process.env.MW_TELEMETRY_LEVEL);
  return {
    file,
    write(t, record) {
      try {
        mkdirSync(dirname(file), { recursive: true });
        appendFileSync(file, JSON.stringify({ t, host, store, build: buildOf(), ...full ? record : metrics(record) }, (_, v) => typeof v === "bigint" ? String(v) : v) + "\n");
      } catch {
      }
    }
  };
}

// src/store.ts
var alive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e.code !== "ESRCH";
  }
};
var qaFailure = (status, reason, facts = {}) => new MadeWellError({
  code: "qa_request",
  message: `Manual QA request refused: ${reason}. Keep the draft and retry identity until the outcome is known.`,
  context: { status, reason, facts },
  next: [{ run: typeof facts.refresh === "string" ? facts.refresh : "mw qa-cases", why: "inspect saved history before a new request; conflicts require explicit review and a new request ID" }]
});
var qaGuard = (run) => {
  try {
    return run();
  } catch (cause) {
    if (cause instanceof MadeWellError) throw cause;
    const busy = cause instanceof Error && /(?:SQLITE_BUSY|database is locked|database table is locked)/i.test(cause.message);
    throw qaFailure(busy ? 503 : 500, busy ? "store_busy" : "storage_failed");
  }
};
var qaCanonical = (value) => Array.isArray(value) ? value.map(qaCanonical) : value && typeof value === "object" ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, child]) => [key, qaCanonical(child)])) : value;
function openStore(path, options = {}) {
  if (!options.readOnly) mkdirSync2(dirname2(path), { recursive: true });
  const db = new DatabaseSync(path, { readOnly: options.readOnly ?? false });
  db.exec("PRAGMA busy_timeout = 5000");
  if (!options.readOnly) db.exec(`PRAGMA journal_mode = WAL;
		CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY CHECK(id=1), doc TEXT NOT NULL, revision TEXT NOT NULL, updated TEXT NOT NULL);
		CREATE TABLE IF NOT EXISTS migrations (id TEXT PRIMARY KEY, token TEXT NOT NULL, phase TEXT NOT NULL, doc TEXT NOT NULL, started TEXT NOT NULL, updated TEXT NOT NULL);
		CREATE TABLE IF NOT EXISTS items (id INTEGER PRIMARY KEY AUTOINCREMENT, doc TEXT NOT NULL);
		CREATE TABLE IF NOT EXISTS events (seq INTEGER PRIMARY KEY AUTOINCREMENT, item INTEGER NOT NULL, at TEXT NOT NULL, kind TEXT NOT NULL, data TEXT NOT NULL);
		CREATE TABLE IF NOT EXISTS operator_requests (id TEXT PRIMARY KEY, fingerprint TEXT NOT NULL, receipt TEXT NOT NULL);
		CREATE TABLE IF NOT EXISTS calls (id INTEGER PRIMARY KEY AUTOINCREMENT, item INTEGER NOT NULL, kind TEXT NOT NULL, job TEXT NOT NULL, profile TEXT NOT NULL, card TEXT NOT NULL, system TEXT NOT NULL, prompt TEXT NOT NULL, outcome TEXT NOT NULL, output TEXT, error TEXT, raw TEXT, started TEXT NOT NULL, ms INTEGER NOT NULL);
		CREATE TABLE IF NOT EXISTS tool_events (call INTEGER NOT NULL, seq INTEGER NOT NULL, tool TEXT NOT NULL, digest TEXT NOT NULL, input_bytes INTEGER NOT NULL, output_bytes INTEGER NOT NULL, tokens INTEGER, at TEXT, ms INTEGER, error INTEGER NOT NULL, PRIMARY KEY (call, seq));
		CREATE TABLE IF NOT EXISTS accounts (account TEXT PRIMARY KEY, resets_at INTEGER NOT NULL);
		CREATE TABLE IF NOT EXISTS runner (id INTEGER PRIMARY KEY CHECK (id = 1), pid INTEGER NOT NULL, since TEXT NOT NULL, item INTEGER);`);
  if (!options.readOnly) qaGuard(() => {
    const tables = {
      qa_cases: "id INTEGER PRIMARY KEY AUTOINCREMENT, work_item INTEGER NOT NULL, workspace TEXT NOT NULL, current_revision INTEGER NOT NULL, created_at TEXT NOT NULL",
      qa_case_revisions: "case_id INTEGER NOT NULL, revision INTEGER NOT NULL, doc TEXT NOT NULL, PRIMARY KEY(case_id,revision)",
      qa_runs: "id INTEGER PRIMARY KEY AUTOINCREMENT, work_item INTEGER NOT NULL, workspace TEXT NOT NULL, doc TEXT NOT NULL",
      qa_observations: "id INTEGER PRIMARY KEY AUTOINCREMENT, run_id INTEGER NOT NULL, case_id INTEGER NOT NULL, case_revision INTEGER NOT NULL, entry_revision INTEGER NOT NULL, doc TEXT NOT NULL, UNIQUE(run_id,case_id,entry_revision)",
      qa_requests: "id TEXT PRIMARY KEY, fingerprint TEXT NOT NULL, outcome TEXT NOT NULL"
    };
    for (const [name, definition] of Object.entries(tables)) {
      const expected = definition.split(", ").filter((part) => !part.startsWith("PRIMARY ") && !part.startsWith("UNIQUE(")).map((part) => {
        const [column, type] = part.split(" ");
        return { name: column, type, notnull: part.includes("NOT NULL") ? 1 : 0, pk: name === "qa_case_revisions" ? ["case_id", "revision"].indexOf(column) + 1 : part.includes("PRIMARY KEY") ? 1 : 0 };
      });
      const existing = db.prepare(`PRAGMA table_info(${name})`).all();
      if (existing.length && JSON.stringify(existing.map(({ name: name2, type, notnull, pk }) => ({ name: name2, type: type.toUpperCase(), notnull, pk }))) !== JSON.stringify(expected)) throw qaFailure(500, "storage_failed", { table: name, reason: "incompatible_schema; stop for a migration brief" });
      if (existing.length && name === "qa_observations") {
        const indexes = db.prepare("PRAGMA index_list(qa_observations)").all();
        const unique = indexes.some((index) => index.unique && JSON.stringify(db.prepare("SELECT name FROM pragma_index_info(?) ORDER BY seqno").all(index.name).map((c) => c.name)) === JSON.stringify(["run_id", "case_id", "entry_revision"]));
        if (!unique) throw qaFailure(500, "storage_failed", { table: name, reason: "incompatible_schema; missing entry uniqueness" });
      }
    }
    db.exec("BEGIN IMMEDIATE");
    try {
      for (const [name, definition] of Object.entries(tables)) db.exec(`CREATE TABLE IF NOT EXISTS ${name} (${definition})`);
      db.exec("CREATE INDEX IF NOT EXISTS qa_cases_work ON qa_cases(work_item); CREATE INDEX IF NOT EXISTS qa_runs_work ON qa_runs(work_item); CREATE INDEX IF NOT EXISTS qa_observations_entry ON qa_observations(run_id,case_id,id); COMMIT");
    } catch (cause) {
      db.exec("ROLLBACK");
      throw cause;
    }
  });
  const sink = options.readOnly ? void 0 : telemetry(path);
  let pending;
  const emit = (t, record) => pending ? pending.push([t, record]) : sink?.write(t, record);
  const tx = (fn) => {
    if (pending) {
      const buffered = pending.length;
      db.exec("SAVEPOINT nested_operation");
      try {
        const value = fn();
        db.exec("RELEASE nested_operation");
        return value;
      } catch (cause) {
        db.exec("ROLLBACK TO nested_operation");
        db.exec("RELEASE nested_operation");
        pending.length = buffered;
        throw cause;
      }
    }
    db.exec("BEGIN IMMEDIATE");
    pending = [];
    try {
      const r = fn();
      db.exec("COMMIT");
      const committed = pending;
      pending = void 0;
      for (const [t, record] of committed) sink?.write(t, record);
      return r;
    } catch (e) {
      pending = void 0;
      db.exec("ROLLBACK");
      throw e;
    }
  };
  const insertTools = (call, tools) => {
    const insert = db.prepare("INSERT INTO tool_events (call, seq, tool, digest, input_bytes, output_bytes, tokens, at, ms, error) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    for (const t of tools) insert.run(call, t.seq, t.tool, t.digest, t.inputBytes, t.outputBytes, t.tokens, t.at, t.ms, t.error ? 1 : 0);
  };
  if (!options.readOnly) tx(() => {
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
  const timestamp = () => new Date(options.now?.() ?? Date.now()).toISOString();
  const event = (item, kind, data, at = timestamp()) => {
    const { lastInsertRowid } = db.prepare("INSERT INTO events (item, at, kind, data) VALUES (?, ?, ?, ?)").run(item, at, kind, JSON.stringify(data));
    emit("event", { seq: Number(lastInsertRowid), item, at, kind, data });
    return Number(lastInsertRowid);
  };
  const read = (id2) => {
    const row = db.prepare("SELECT doc FROM items WHERE id = ?").get(id2);
    return row && decodeLegacy(JSON.parse(row.doc), JSON.parse(row.doc).updated ?? JSON.parse(row.doc).created ?? "1970-01-01T00:00:00.000Z");
  };
  const qaCaseRow = (caseId) => {
    const row = db.prepare("SELECT id, work_item AS workItem, workspace, current_revision AS currentRevision, created_at AS createdAt FROM qa_cases WHERE id = ?").get(caseId);
    if (!row) throw qaFailure(404, "not_found", { caseId, refresh: "mw qa-cases" });
    const { workspace: _legacyWorkspace, ...value } = row;
    return value;
  };
  const qaRevisionRow = (caseId, revision3) => {
    const row = db.prepare("SELECT doc FROM qa_case_revisions WHERE case_id = ? AND revision = ?").get(caseId, revision3);
    if (!row) throw qaFailure(404, "not_found", { caseId, revision: revision3, refresh: `mw qa-case ${caseId}` });
    return JSON.parse(row.doc);
  };
  const qaRunRow = (runId) => {
    const row = db.prepare("SELECT doc FROM qa_runs WHERE id = ?").get(runId);
    if (!row) throw qaFailure(404, "not_found", { runId, refresh: "mw qa-runs" });
    const { workspace: _legacyWorkspace, ...run } = JSON.parse(row.doc);
    return run;
  };
  const qaHistory = (runId, caseId) => db.prepare("SELECT doc FROM qa_observations WHERE run_id = ? AND case_id = ? ORDER BY id").all(runId, caseId).map((r) => JSON.parse(r.doc));
  const qaEntry = (run, caseId) => {
    const pin2 = run.cases.find((p) => p.caseId === caseId);
    if (!pin2) throw qaFailure(409, "case_not_in_run", { runId: run.id, caseId, refresh: `mw qa-run ${run.id}` });
    return pin2;
  };
  const qaAnchor = (workItem, _workspace) => {
    const item = read(workItem);
    if (!item) throw new MadeWellError({ code: "item_not_found", message: `No work item #${workItem}. Select an existing work anchor; QA never creates one.`, context: { id: workItem }, next: [{ run: "mw status", why: "select existing work or separately use the authorized work interface" }] });
  };
  const qaRetained = () => db.prepare("SELECT work_item AS id FROM qa_cases UNION SELECT work_item AS id FROM qa_runs ORDER BY id").all().map((r) => r.id);
  const qaLinks = () => db.prepare("SELECT seq, at, data FROM events WHERE kind = 'qa-linkObservation' ORDER BY seq").all().map((row) => {
    const data = JSON.parse(row.data);
    return { event: row.seq, at: row.at, requestId: data.requestId, ...data.association };
  });
  const qaProjection = (query) => {
    const page = (rows, filters) => {
      const selected = rows.filter((row) => row.id > (filters.after ?? 0));
      const items = selected.slice(0, filters.limit ?? 50);
      const hasMore = selected.length > items.length;
      return { apiVersion: "1", items, nextAfter: hasMore ? items.at(-1).id : null, hasMore };
    };
    if (query.kind === "cases") {
      const f = query.filters;
      const cases = db.prepare("SELECT id FROM qa_cases ORDER BY id").all().map(({ id: id2 }) => qaCaseRow(id2));
      const rows = cases.filter((c) => f.workItem === void 0 || c.workItem === f.workItem).flatMap((c) => {
        const i = qaRevisionRow(c.id, c.currentRevision).instructions;
        if (f.area !== void 0 && i.area !== f.area) return [];
        if (f.q !== void 0 && ![i.title, i.area, i.change].some((value) => value.toLowerCase().includes(f.q.toLowerCase()))) return [];
        return [{ ...c, title: i.title, area: i.area }];
      });
      return page(rows, f);
    }
    if (query.kind === "case") {
      const c = qaCaseRow(query.caseId);
      return { apiVersion: "1", case: c, revision: qaRevisionRow(c.id, query.filters.revision ?? c.currentRevision) };
    }
    if (query.kind === "runs") {
      const f = query.filters;
      const runs = db.prepare("SELECT doc FROM qa_runs ORDER BY id").all().map((r) => JSON.parse(r.doc));
      return page(runs.filter((r) => (f.workItem === void 0 || r.workItem === f.workItem) && (f.caseId === void 0 || r.cases.some((p) => p.caseId === f.caseId))).map((r) => ({ id: r.id, workItem: r.workItem, application: r.application, environment: r.environment, version: r.version, startedAt: r.startedAt, caseCount: r.cases.length })), f);
    }
    if (query.kind === "export") {
      const snapshot2 = qaProjection({ kind: "snapshot", runId: query.runId });
      const links = qaLinks();
      return {
        schemaVersion: 1,
        selection: query.selection,
        externalEvidence: "unavailable-reference-only",
        run: snapshot2.run,
        entries: snapshot2.entries.filter((entry) => query.selection === "all" || entry.status === "failed" || entry.status === "needs-refinement").map((entry) => {
          const c = qaCaseRow(entry.caseId);
          const conflicts = db.prepare("SELECT seq, item, at, data FROM events WHERE kind = 'qa-conflict' AND item IN (?, ?) ORDER BY seq").all(c.workItem, snapshot2.run.workItem).flatMap((row) => {
            const data = JSON.parse(row.data);
            if (data.target.caseId !== c.id) return [];
            if (data.operation === "reviseCase" ? row.item !== c.workItem : !["observeCase", "recordVerdict", "linkObservation"].includes(data.operation) || row.item !== snapshot2.run.workItem || data.target.runId !== snapshot2.run.id) return [];
            return [{ event: row.seq, workItem: row.item, at: row.at, operation: data.operation, requestId: data.requestId, runId: data.operation === "reviseCase" ? null : snapshot2.run.id, caseId: c.id, expected: data.expected, actual: data.actual, input: data.input }];
          });
          const views = links.filter((link) => link.source.runId === snapshot2.run.id && link.source.caseId === c.id || link.target.kind === "retest" && link.target.run.id === snapshot2.run.id && link.target.caseId === c.id).map((link) => ({ link, targetAvailability: link.target.kind === "reference" ? "not-checked" : link.target.kind === "work-item" ? read(link.target.workItem) ? "present" : "unavailable" : "present" }));
          return { ...entry, case: c, currentCaseRevision: c.currentRevision, outdated: c.currentRevision !== entry.caseRevision, latestVerdictId: entry.observations.findLast((o) => o.kind === "manual-verdict")?.id ?? null, links: views, conflicts };
        })
      };
    }
    const run = qaRunRow(query.runId);
    if (query.kind === "observations") {
      if (query.filters.caseId !== void 0) qaEntry(run, query.filters.caseId);
      const rows = db.prepare("SELECT doc FROM qa_observations WHERE run_id = ? ORDER BY id").all(run.id).map((r) => JSON.parse(r.doc)).filter((o) => query.filters.caseId === void 0 || o.caseId === query.filters.caseId);
      return page(rows, query.filters);
    }
    const entries = run.cases.map((pin2) => {
      const instructions = qaRevisionRow(pin2.caseId, pin2.caseRevision);
      const observations = qaHistory(run.id, pin2.caseId);
      const latestVerdict = observations.findLast((o) => o.kind === "manual-verdict");
      return { ...pin2, instructions, entryRevision: observations.at(-1)?.entryRevision ?? 0, status: latestVerdict?.verdict ?? "untested", observations, latestVerdictId: latestVerdict?.id ?? null };
    });
    if (query.kind === "snapshot") return { schemaVersion: 1, run, entries: entries.map(({ latestVerdictId: _, ...entry }) => entry) };
    return { apiVersion: "1", run, entries: entries.map(({ instructions, observations: _, ...entry }) => {
      const currentCaseRevision = qaCaseRow(entry.caseId).currentRevision;
      return { ...entry, title: instructions.instructions.title, area: instructions.instructions.area, currentCaseRevision, outdated: currentCaseRevision !== entry.caseRevision, instructionsHref: `/api/v1/qa/cases/${entry.caseId}?revision=${entry.caseRevision}`, observationsHref: `/api/v1/qa/runs/${run.id}/observations?caseId=${entry.caseId}` };
    }) };
  };
  const store = {
    path,
    readOnly: options.readOnly ?? false,
    rawItems() {
      return db.prepare("SELECT id,doc FROM items ORDER BY id").all();
    },
    settings() {
      if (!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='settings'").get()) return null;
      const row = db.prepare("SELECT doc,revision,updated FROM settings WHERE id=1").get();
      return row ? { settings: JSON.parse(row.doc), revision: row.revision, updated: row.updated } : null;
    },
    saveSettings(settings, at) {
      return tx(() => {
        const revision3 = createHash2("sha256").update(JSON.stringify(settings) + at).digest("hex");
        db.prepare("INSERT INTO settings VALUES (1,?,?,?) ON CONFLICT(id) DO UPDATE SET doc=excluded.doc,revision=excluded.revision,updated=excluded.updated").run(JSON.stringify(settings), revision3, at);
        event(0, "settings-updated", { settings, revision: revision3 }, at);
        return { settings, revision: revision3, updated: at };
      });
    },
    request(id2, operation, target2, input, run) {
      return tx(() => {
        const fingerprint = JSON.stringify(qaCanonical({ operation, target: target2, input }));
        const row = db.prepare("SELECT fingerprint,receipt FROM operator_requests WHERE id=?").get(id2);
        if (row) {
          if (row.fingerprint !== fingerprint) throw new MadeWellError({ code: "request_id_conflict", message: "Request id already used with different input.", context: { requestId: id2 }, next: [] });
          return JSON.parse(row.receipt);
        }
        const result = run();
        db.prepare("INSERT INTO operator_requests VALUES (?,?,?)").run(id2, fingerprint, JSON.stringify(result));
        return result;
      });
    },
    migrationJournal() {
      if (!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='migrations'").get()) return null;
      const row = db.prepare("SELECT id,token,phase,doc,started,updated FROM migrations ORDER BY started DESC LIMIT 1").get();
      return row ? { ...row, doc: JSON.parse(row.doc) } : null;
    },
    migrationBegin(journal) {
      tx(() => {
        const pending2 = store.migrationJournal();
        if (pending2 && pending2.phase !== "complete") throw new MadeWellError({ code: "migration_in_progress", message: "Migration in progress.", context: { migrationId: pending2.id, token: pending2.token, phase: pending2.phase }, next: [] });
        db.prepare("INSERT INTO migrations VALUES (?,?,?,?,?,?)").run(journal.id, journal.token, journal.phase, JSON.stringify(journal.doc), journal.started, journal.updated);
      });
    },
    migrationSaveItems(id2, items, events) {
      tx(() => {
        const j = store.migrationJournal();
        if (j.id !== id2 || j.phase !== "snapshot-saved") throw new MadeWellError({ code: "migration_conflict", message: "Migration phase changed.", context: { id: id2 }, next: [] });
        for (const item of items) db.prepare("UPDATE items SET doc=? WHERE id=?").run(JSON.stringify(item), item.id);
        for (const e of events) event(e.item, e.kind, e.data, e.at);
        db.prepare("UPDATE migrations SET phase='items-saved',updated=? WHERE id=?").run(events[0]?.at ?? j.updated, id2);
      });
    },
    migrationPhase(id2, phase, receipt) {
      tx(() => {
        const j = store.migrationJournal();
        db.prepare("UPDATE migrations SET phase=?,doc=?,updated=? WHERE id=?").run(phase, JSON.stringify({ ...j.doc, ...receipt ? { receipt } : {} }), receipt?.completedAt ?? timestamp(), id2);
      });
    },
    qaRetained,
    qaRead(query) {
      return qaGuard(() => {
        if (pending) return qaProjection(query);
        db.exec("BEGIN");
        try {
          const result = qaProjection(query);
          db.exec("COMMIT");
          return result;
        } catch (cause) {
          db.exec("ROLLBACK");
          throw cause;
        }
      });
    },
    qaWrite(command, at) {
      return qaGuard(() => tx(() => {
        const { operation, input } = command;
        const fingerprint = JSON.stringify(qaCanonical(command));
        const prior = db.prepare("SELECT fingerprint, outcome FROM qa_requests WHERE id = ?").get(input.requestId);
        if (prior) {
          if (prior.fingerprint !== fingerprint) throw qaFailure(409, "request_id_conflict", { requestId: input.requestId });
          const outcome = JSON.parse(prior.outcome);
          return outcome.accepted ? { accepted: true, value: { ...outcome.value, receipt: { ...outcome.value.receipt, replayed: true } } } : outcome;
        }
        const save = (outcome) => {
          const saved = outcome.accepted ? { accepted: true, value: { ...outcome.value, receipt: Object.fromEntries(Object.entries(outcome.value.receipt).filter(([key]) => key !== "replayed")) } } : outcome;
          db.prepare("INSERT INTO qa_requests (id, fingerprint, outcome) VALUES (?, ?, ?)").run(input.requestId, fingerprint, JSON.stringify(saved));
          return outcome;
        };
        const target2 = { ..."runId" in command ? { runId: command.runId } : {}, ..."caseId" in command ? { caseId: command.caseId } : {} };
        const stale = (workItem, expected, actual) => {
          const refresh = "runId" in command ? `mw qa-run ${command.runId}` : `mw qa-case ${"caseId" in command ? command.caseId : ""}`;
          const readLink = "runId" in command ? `/api/v1/qa/runs/${command.runId}` : `/api/v1/qa/cases/${"caseId" in command ? command.caseId : ""}`;
          const conflictEvent = event(workItem, "qa-conflict", { operation, requestId: input.requestId, target: target2, input, before: actual, after: actual, expected, actual, read: readLink }, at);
          return save({ accepted: false, error: { status: 409, reason: "stale_revision", facts: { ...target2, workItem, expected, actual, expectedRevision: expected, actualRevision: actual, requestId: input.requestId, conflictEvent, read: readLink, refresh } } });
        };
        const accepted = (workItem, resource, id3, caseId, before, revision3, association) => {
          const links = { read: resource === "case" ? `/api/v1/qa/cases/${id3}` : `/api/v1/qa/runs/${id3}`, workItem: `/api/v1/items/${workItem}` };
          const receipt = { operation, resource, id: id3, caseId, revision: revision3, at };
          const seq = event(workItem, `qa-${operation}`, { operation, requestId: input.requestId, target: resource === "case" ? { caseId: id3 } : { runId: id3, ...caseId === null ? {} : { caseId } }, input, before, after: revision3, receipt, links, ...association ? { association } : {} }, at);
          return save({ accepted: true, value: { apiVersion: "1", accepted: true, requestId: input.requestId, receipt: { ...receipt, event: seq, replayed: false }, links } });
        };
        if (command.operation === "createCase") {
          const i2 = command.input;
          qaAnchor(i2.workItem);
          const id3 = Number(db.prepare("INSERT INTO qa_cases (work_item, workspace, current_revision, created_at) VALUES (?, ?, 1, ?)").run(i2.workItem, "", at).lastInsertRowid);
          const revision3 = { caseId: id3, revision: 1, at, enteredBy: i2.enteredBy, instructions: i2.instructions };
          db.prepare("INSERT INTO qa_case_revisions (case_id, revision, doc) VALUES (?, 1, ?)").run(id3, JSON.stringify(revision3));
          return accepted(i2.workItem, "case", id3, null, 0, 1);
        }
        if (command.operation === "reviseCase") {
          const c = qaCaseRow(command.caseId);
          qaAnchor(c.workItem);
          if (command.input.revision !== c.currentRevision) return stale(c.workItem, command.input.revision, c.currentRevision);
          const revision3 = { caseId: c.id, revision: c.currentRevision + 1, at, enteredBy: command.input.enteredBy, instructions: command.input.instructions };
          if (!Number.isSafeInteger(revision3.revision)) throw qaFailure(400, "invalid_input", { caseId: c.id, reason: "revision_exhausted" });
          db.prepare("INSERT INTO qa_case_revisions (case_id, revision, doc) VALUES (?, ?, ?)").run(c.id, revision3.revision, JSON.stringify(revision3));
          db.prepare("UPDATE qa_cases SET current_revision = ? WHERE id = ?").run(revision3.revision, c.id);
          return accepted(c.workItem, "case", c.id, null, c.currentRevision, revision3.revision);
        }
        if (command.operation === "startRun") {
          const i2 = command.input;
          qaAnchor(i2.workItem);
          for (const pin3 of i2.cases) {
            const c = qaCaseRow(pin3.caseId);
            qaAnchor(c.workItem);
            qaRevisionRow(c.id, pin3.caseRevision);
          }
          const id3 = Number(db.prepare("INSERT INTO qa_runs (work_item, workspace, doc) VALUES (?, ?, ?)").run(i2.workItem, "", "{}").lastInsertRowid);
          const { requestId: _, ...fields } = i2;
          const run2 = { ...fields, id: id3, startedAt: at };
          db.prepare("UPDATE qa_runs SET doc = ? WHERE id = ?").run(JSON.stringify(run2), id3);
          return accepted(i2.workItem, "run", id3, null, 0, 0);
        }
        const run = qaRunRow(command.runId);
        qaAnchor(run.workItem);
        const pin2 = qaEntry(run, command.caseId);
        const current = qaHistory(run.id, pin2.caseId).at(-1)?.entryRevision ?? 0;
        if (command.input.revision !== current) return stale(run.workItem, command.input.revision, current);
        if (command.operation === "linkObservation") {
          const i2 = command.input;
          const refresh = `mw qa-export ${run.id} --selection all --format json`;
          const facts = { runId: run.id, caseId: pin2.caseId, observationId: i2.observationId, target: i2.target, refresh };
          const row = db.prepare("SELECT doc FROM qa_observations WHERE id = ?").get(i2.observationId);
          const observation2 = row && JSON.parse(row.doc);
          if (!observation2 || observation2.runId !== run.id || observation2.caseId !== pin2.caseId || observation2.caseRevision !== pin2.caseRevision) throw qaFailure(404, "not_found", facts);
          qaRevisionRow(pin2.caseId, pin2.caseRevision);
          const duplicate = qaLinks().find((link) => {
            if (link.source.observationId !== i2.observationId) return false;
            const target3 = i2.target;
            return target3.kind === "work-item" ? link.target.kind === "work-item" && link.target.workItem === target3.workItem : target3.kind === "retest" ? link.target.kind === "retest" && link.target.run.id === target3.runId : link.target.kind === "reference" && link.target.reference.label === target3.reference.label && link.target.reference.ref === target3.reference.ref;
          });
          if (duplicate) return save({ accepted: false, error: { status: 409, reason: "link_exists", facts: { ...facts, requestId: i2.requestId, existingEvent: duplicate.event } } });
          let linkedTarget;
          try {
            if (i2.target.kind === "work-item") {
              qaAnchor(i2.target.workItem);
              const { id: id3, title, objective, source, status, updated } = read(i2.target.workItem);
              linkedTarget = { kind: "work-item", workItem: id3, snapshot: { id: id3, title, objective, source, status, updated } };
            } else if (i2.target.kind === "reference") linkedTarget = i2.target;
            else {
              const retest = qaRunRow(i2.target.runId);
              if (retest.id <= run.id || retest.application !== run.application) throw qaFailure(409, "invalid_retest", { ...facts, reason: retest.id <= run.id ? "not_later_run" : "different_application" });
              const targetPin = qaEntry(retest, pin2.caseId);
              qaRevisionRow(targetPin.caseId, targetPin.caseRevision);
              linkedTarget = { kind: "retest", run: retest, ...targetPin };
            }
          } catch (cause) {
            if (cause instanceof MadeWellError && cause.code === "qa_request") {
              const context2 = cause.context;
              throw qaFailure(context2.status, context2.reason, { ...context2.facts, ...facts });
            }
            if (cause instanceof MadeWellError && cause.code === "item_not_found" && i2.target.kind === "work-item") throw new MadeWellError({ code: "item_not_found", message: cause.message, context: { id: i2.target.workItem }, next: [{ run: refresh, why: "inspect source evidence and choose an existing work target" }] });
            throw cause;
          }
          return accepted(run.workItem, "run-entry", run.id, pin2.caseId, current, current, { enteredBy: i2.enteredBy, source: { runId: run.id, ...pin2, observationId: i2.observationId }, target: linkedTarget });
        }
        if (!Number.isSafeInteger(current + 1)) throw qaFailure(400, "invalid_input", { runId: run.id, caseId: pin2.caseId, reason: "revision_exhausted" });
        const i = command.input;
        const id2 = Number(db.prepare("INSERT INTO qa_observations (run_id, case_id, case_revision, entry_revision, doc) VALUES (?, ?, ?, ?, ?)").run(run.id, pin2.caseId, pin2.caseRevision, current + 1, "{}").lastInsertRowid);
        const observation = {
          id: id2,
          runId: run.id,
          ...pin2,
          entryRevision: current + 1,
          at,
          enteredBy: i.enteredBy,
          actual: i.actual,
          reproduction: i.reproduction,
          notes: i.notes,
          evidence: i.evidence,
          ...command.operation === "recordVerdict" ? { kind: "manual-verdict", claimedVerifier: command.input.enteredBy, observedAt: at, reportedResult: null, verdict: command.input.verdict } : { kind: command.input.kind, claimedVerifier: command.input.claimedVerifier, observedAt: command.input.observedAt, reportedResult: command.input.reportedResult, verdict: null }
        };
        db.prepare("UPDATE qa_observations SET doc = ? WHERE id = ?").run(JSON.stringify(observation), id2);
        return accepted(run.workItem, "run-entry", run.id, pin2.caseId, current, current + 1);
      }));
    },
    /** Synchronous only: the command, its engine transitions and receipt share one SQLite lock/commit.
     * Receipts survive item pruning so retrying an old submission can never recreate deleted work. */
    operatorRequest(id2, fingerprint, run) {
      return tx(() => {
        const prior = db.prepare("SELECT fingerprint, receipt FROM operator_requests WHERE id = ?").get(id2);
        if (prior) {
          if (prior.fingerprint !== fingerprint) throw new MadeWellError({
            code: "api_request",
            message: "This request ID was already used with different input. Keep the original request for an uncertain retry; use a new ID for a new message.",
            context: { status: 409, reason: "request_id_conflict", facts: { requestId: id2 } },
            next: [{ run: "mw status", why: "inspect accepted work before submitting a different request" }]
          });
          return { ...JSON.parse(prior.receipt), replayed: true };
        }
        const receipt = run();
        db.prepare("INSERT INTO operator_requests (id, fingerprint, receipt) VALUES (?, ?, ?)").run(id2, fingerprint, JSON.stringify(receipt));
        return { ...receipt, replayed: false };
      });
    },
    /** A phase's accepted output, transition and reusable NQ decisions commit together. */
    atomic(run) {
      return tx(run);
    },
    create(fields) {
      const created = tx(() => {
        const now = timestamp();
        const { lastInsertRowid } = db.prepare("INSERT INTO items (doc) VALUES (?)").run("{}");
        const item = { job: laneOf(fields.pack).delivery[0]?.job ?? "", from: { kind: "dispatcher" }, status: "queued", outputs: {}, ...fields, id: Number(lastInsertRowid), round: 1, corrections: 0, launches: 0, created: fields.created ?? now, updated: fields.updated ?? now };
        db.prepare("UPDATE items SET doc = ? WHERE id = ?").run(JSON.stringify(item), item.id);
        event(item.id, "created", { title: item.title, job: item.job, status: item.status, parent: item.parent ?? null, discovery: item.discovery ?? null });
        return item;
      });
      return created;
    },
    get(id2) {
      return read(id2);
    },
    /** Records an event that changes nothing on the item: a step starting or finishing, so it is visible while it runs. */
    note(id2, kind, data = {}, at) {
      tx(() => event(id2, kind, data, at));
    },
    /** Compare and save under the same write lock, preserving concurrent blockers and answers. */
    transition(id2, expected, kind, data, change) {
      return tx(() => {
        const current = read(id2);
        if (!current) throw new MadeWellError({ code: "item_not_found", message: `No work item #${id2}.`, context: { id: id2 }, next: [] });
        const actual = createHash2("sha256").update(JSON.stringify(current)).digest("hex");
        if (expected !== actual) throw new MadeWellError({ code: "revision_conflict", message: "The work changed; review the current record.", context: { id: id2, expected, actual }, next: [{ run: `mw context ${id2}`, why: "review the concurrent transition" }] });
        const next = { ...change(current), updated: timestamp() };
        db.prepare("UPDATE items SET doc=? WHERE id=?").run(JSON.stringify(next), id2);
        event(id2, kind, data.actor ? { ...data, output: next } : data, next.updated);
        return next;
      });
    },
    list() {
      return db.prepare("SELECT doc FROM items ORDER BY id").all().map((r) => {
        const raw = JSON.parse(r.doc);
        return decodeLegacy(raw, raw.updated ?? raw.created ?? "1970-01-01T00:00:00.000Z");
      });
    },
    events(id2) {
      return db.prepare("SELECT * FROM events WHERE item = ? ORDER BY seq").all(id2).map((r) => ({ ...r, data: JSON.parse(r.data) }));
    },
    /** Records one call with its tool events, tokens and rule-break flags, read from its raw stream and the engine's facts. The harness version goes only to telemetry. */
    recordCall(call, facts) {
      const tools = toolEvents(call.card.harness, call.raw);
      const tokens = tokensOf(call.card.harness, call.raw);
      const flags = facts ? flagsFor(facts, { tools, tokens, ms: call.ms, output: call.output }) : [];
      return tx(() => {
        const id2 = Number(db.prepare("INSERT INTO calls (item, kind, job, profile, card, system, prompt, outcome, output, error, raw, started, ms, tokens, facts, flags) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(call.item, call.kind, call.job, call.profile, JSON.stringify(call.card), call.system, call.prompt, call.outcome, call.output, call.error, call.raw, call.started, call.ms, tokens && JSON.stringify(tokens), facts ? JSON.stringify(facts) : null, JSON.stringify(flags)).lastInsertRowid);
        insertTools(id2, tools);
        const { system, prompt, output, raw, ...summary } = call;
        emit("call", { id: id2, ...summary, tokens, flags, facts: facts ?? null, tools, system, prompt, output, raw });
        return id2;
      });
    },
    /** The engine refused a call's answer: the call is on the record as rejected, with the reason. */
    rejectCall(id2, reason) {
      db.prepare("UPDATE calls SET outcome = 'rejected', error = ? WHERE id = ?").run(reason, id2);
      emit("rejected", { call: id2, at: (/* @__PURE__ */ new Date()).toISOString(), reason });
    },
    /** Every call, or one item's, oldest first. */
    calls(item, id2) {
      const where = id2 !== void 0 ? "WHERE id = ?" : item !== void 0 ? "WHERE item = ?" : "";
      const rows = db.prepare(`SELECT * FROM calls ${where} ORDER BY id`).all(...id2 !== void 0 ? [id2] : item !== void 0 ? [item] : []);
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
    /** Every call without its texts (brief, packet, answer, raw stream), which `call` returns: what a live view polls. */
    callHeads() {
      const rows = db.prepare("SELECT id, item, kind, job, profile, card, outcome, error, started, ms, tokens, flags, length(system) AS systemBytes, length(prompt) AS packetBytes, length(output) AS answerBytes, length(raw) AS rawBytes, (SELECT COUNT(*) FROM tool_events t WHERE t.call = calls.id) AS toolCount FROM calls ORDER BY id").all();
      return rows.map((r) => ({ ...r, card: JSON.parse(r.card), tokens: r.tokens ? JSON.parse(r.tokens) : null, flags: JSON.parse(r.flags) }));
    },
    call(id2) {
      return store.calls(void 0, id2)[0];
    },
    /** The newest event and call: a view looks again only when either moved. */
    mark() {
      return db.prepare("SELECT (SELECT COALESCE(MAX(seq), 0) FROM events) AS events, (SELECT COALESCE(MAX(id), 0) FROM calls) AS calls").get();
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
    claimRunner(options2 = {}) {
      return Effect4.suspend(() => {
        const owner = tx(() => {
          const row = db.prepare("SELECT pid, since, item FROM runner WHERE id = 1").get();
          if (row && alive(row.pid) && (options2.exclusive || row.pid !== process.pid)) return row;
          if (row && row.pid !== process.pid) event(row.item ?? 0, "runner-lost", { pid: row.pid, since: row.since, item: row.item });
          db.prepare("INSERT INTO runner (id, pid, since) VALUES (1, ?, ?) ON CONFLICT (id) DO UPDATE SET pid = excluded.pid, since = excluded.since, item = NULL").run(process.pid, (/* @__PURE__ */ new Date()).toISOString());
          event(0, row?.pid === process.pid ? "runner-reloaded" : "runner-started", { pid: process.pid, ...process.env.MW_BUILD ? { build: process.env.MW_BUILD } : {}, ...row && row.pid !== process.pid ? { replaced: row.pid } : {} });
          return void 0;
        });
        if (!owner) return Effect4.void;
        const busy = owner.item === null ? void 0 : read(owner.item);
        return Effect4.fail(new MadeWellError({
          code: "store_locked",
          message: options2.exclusive ? "A live runner owns this Made Well store; technical replanning must wait." : "Another live runner owns this Made Well store.",
          context: { store: path, owner: { pid: owner.pid, since: owner.since, item: busy ? { id: busy.id, title: busy.title, job: busy.job, status: busy.status } : null } },
          cause: "One runner drives a store at a time, so two runners never work the same item.",
          next: options2.exclusive ? [
            { run: busy ? `mw status ${busy.id}` : "mw status", why: "inspect the owner; retry the requested replan once current work reaches a quiet boundary and releases ownership" }
          ] : [
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
    prune(ids2, before, dryRun, beforeDelete) {
      const protect = () => {
        const retained = qaRetained().filter((id2) => ids2.includes(id2));
        if (retained.length) throw qaFailure(409, "retention_changed", { ids: retained, refresh: `mw prune --before ${new Date(before).toISOString()} --dry-run` });
      };
      const items = `(${ids2.join(",")})`;
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
      if (dryRun) return qaGuard(() => {
        protect();
        return each((t) => db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n);
      });
      const removed = qaGuard(() => tx(() => {
        protect();
        beforeDelete?.();
        const r = each((t) => Number(db.prepare(`DELETE FROM ${t}`).run().changes));
        if (Object.values(r).some(Boolean)) event(0, "pruned", { before, ...r, ids: ids2 });
        return r;
      }));
      if (db.prepare("PRAGMA freelist_count").get().freelist_count) db.exec("VACUUM");
      db.exec("PRAGMA wal_checkpoint(TRUNCATE)");
      return removed;
    },
    /** The live runner's claim, or null when there is none or its process is gone. Only reads: the next runner to claim records the loss. */
    runner() {
      const row = db.prepare("SELECT pid, since, item FROM runner WHERE id = 1").get();
      return row && alive(row.pid) ? row : null;
    },
    runnerOn(item) {
      db.prepare("UPDATE runner SET item = ? WHERE id = 1 AND pid = ?").run(item, process.pid);
    },
    releaseRunner() {
      tx(() => {
        if (db.prepare("DELETE FROM runner WHERE id = 1 AND pid = ?").run(process.pid).changes) event(0, "runner-stopped", { pid: process.pid });
      });
    },
    close() {
      db.close();
    }
  };
  return store;
}
var Store = class extends Context.Service()("madewell/Store") {
};
var openReadOnlyStore = (path) => openStore(path, { readOnly: true });

// src/migration.ts
var MigrationControl = class extends Context2.Service()("madewell/MigrationControl") {
};
var MigrationControlNoop = Layer3.succeed(MigrationControl, { afterBoundary: () => Effect5.void });
var failure = (code, context2 = {}) => new MadeWellError({ code, message: code.replaceAll("_", " "), context: context2, next: [{ run: "mw migrate --status", why: "inspect the durable migration journal" }, { run: "mw migrate --preview", why: "review the current source before applying" }] });
var present = (path) => {
  try {
    lstatSync(path);
    return true;
  } catch (e) {
    if (e.code === "ENOENT") return false;
    throw e;
  }
};
var sha = (body) => createHash3("sha256").update(body).digest("hex");
function registry(path) {
  try {
    const stat = lstatSync(path);
    if (stat.isSymbolicLink() || !stat.isFile()) throw failure("migration_conflict", { path, expectedSha256: null, observed: "non-regular registry" });
    const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
    try {
      const opened = fstatSync(fd);
      if (opened.dev !== stat.dev || opened.ino !== stat.ino) throw failure("migration_conflict", { path, observed: "registry replaced while opening" });
      const body = readFileSync3(fd);
      return { path, present: true, base64: body.toString("base64"), sha256: sha(body), bytes: body.length, dev: opened.dev, ino: opened.ino };
    } finally {
      closeSync(fd);
    }
  } catch (e) {
    if (e.code === "ENOENT") return { path, present: false, base64: "", sha256: null, bytes: 0, dev: null, ino: null };
    throw e;
  }
}
var previewOf = (store) => {
  const r = registry(legacyRegistryPath(store.path)), raw = store.rawItems(), diagnostics = [];
  if (r.present) {
    try {
      const entries = JSON.parse(Buffer.from(r.base64, "base64").toString("utf8"));
      if (!Array.isArray(entries)) diagnostics.push("Registry is not an array.");
      else {
        const seen = /* @__PURE__ */ new Set();
        entries.forEach((e, i) => {
          if (!e || typeof e.path !== "string") diagnostics.push(`Registry entry ${i} is malformed.`);
          else if (seen.has(e.path)) diagnostics.push(`Registry entry ${i} duplicates ${e.path}.`);
          else seen.add(e.path);
        });
      }
    } catch {
      diagnostics.push("Registry is malformed JSON; exact bytes retained.");
    }
  }
  const items = raw.map((i) => ({ id: i.id, revision: revisionOf(JSON.parse(i.doc)), disposition: legacyDisposition(JSON.parse(i.doc)) }));
  const token = revisionOf({ registry: { path: r.path, present: r.present, base64: r.base64, sha256: r.sha256, bytes: r.bytes }, items: raw, settings: store.settings(), schema: "ledger-2" });
  return { version: 1, required: r.present || items.some((i) => i.disposition !== "current"), token, registry: { path: r.path, present: r.present, sha256: r.sha256, bytes: r.bytes, diagnostics }, items, runner: store.runner(), cutoverRequired: true };
};
var previewMigration = Effect5.fn("mw.previewMigration")(function* () {
  const store = yield* Store;
  return yield* Effect5.try({ try: () => previewOf(store), catch: (e) => e instanceof MadeWellError ? e : failure("migration_conflict", { observed: String(e) }) });
});
var migrationStatus = Effect5.fn("mw.migrationStatus")(function* () {
  const store = yield* Store, j = store.migrationJournal(), path = legacyRegistryPath(store.path);
  return { version: 1, required: j ? j.phase !== "complete" : present(path) || store.rawItems().some((i) => JSON.parse(i.doc).schemaVersion !== 2), registry: { path, present: present(path) }, journal: j ? { migrationId: j.id, token: j.token, phase: j.phase, startedAt: j.started, updatedAt: j.updated } : null, receipt: j?.doc.receipt ?? null };
});
var assertWritable = Effect5.fn("mw.assertWritable")(function* () {
  const store = yield* Store, j = store.migrationJournal();
  if (j && j.phase !== "complete") return yield* failure("migration_in_progress", { migrationId: j.id, token: j.token, phase: j.phase });
  if (!j && (yield* previewMigration()).required) return yield* failure("migration_required");
});
var applyMigration = Effect5.fn("mw.applyMigration")(function* (input) {
  if (input.writersStopped !== true) return yield* failure("migration_attestation_missing");
  const store = yield* Store;
  yield* store.claimRunner({ exclusive: true });
  return yield* Effect5.gen(function* () {
    const control = yield* MigrationControl;
    let j = store.migrationJournal();
    if (j?.phase === "complete" && j.token === input.token) return j.doc.receipt;
    if (j && j.phase !== "complete" && j.token !== input.token) return yield* failure("migration_in_progress", { migrationId: j.id, token: j.token, phase: j.phase });
    if (!j || j.phase === "complete") {
      const preview2 = yield* previewMigration();
      if (!preview2.required) return yield* failure("migration_not_required");
      if (input.token !== preview2.token) return yield* failure("migration_token_stale", { given: input.token, current: preview2.token });
      const at = new Date(yield* Clock.currentTimeMillis).toISOString(), r = registry(preview2.registry.path);
      j = { id: randomUUID(), token: input.token, phase: "snapshot-saved", started: at, updated: at, doc: { registry: r, items: store.rawItems(), dispositions: preview2.items, diagnostics: preview2.registry.diagnostics, attestation: { writersStopped: true, actor: input.actor, at }, receipt: null } };
      if (previewOf(store).token !== input.token) return yield* failure("migration_token_stale", { given: input.token, current: previewOf(store).token });
      store.migrationBegin(j);
      yield* control.afterBoundary("snapshot-saved", { migrationId: j.id, token: j.token, durablePhase: j.phase, registryPresent: r.present, registrySha256: r.sha256, itemIds: j.doc.items.map((i) => i.id) });
    }
    const boundary2 = (name, durablePhase) => {
      const observed = registry(j.doc.registry.path);
      return control.afterBoundary(name, { migrationId: j.id, token: j.token, durablePhase, registryPresent: observed.present, registrySha256: observed.sha256, itemIds: j.doc.items.map((i) => i.id) });
    };
    if (j.phase === "snapshot-saved") {
      const at = new Date(yield* Clock.currentTimeMillis).toISOString();
      const items = j.doc.items.map((i) => decodeLegacy(JSON.parse(i.doc), at));
      store.migrationSaveItems(j.id, items, items.map((i) => ({ item: i.id, kind: "legacy-migrated", data: { migrationId: j.id, disposition: legacyDisposition(JSON.parse(j.doc.items.find((r) => r.id === i.id).doc)), acceptanceCoverage: "unavailable" }, at })));
      j = store.migrationJournal();
      yield* boundary2("items-saved", "items-saved");
    }
    const saved = j.doc.registry;
    let alreadyMissing = !present(saved.path);
    const unlink = () => {
      const observed = registry(saved.path);
      if (observed.present && (observed.sha256 !== saved.sha256 || observed.dev !== saved.dev || observed.ino !== saved.ino || !saved.present)) throw failure("migration_conflict", { path: saved.path, expectedSha256: saved.sha256, observed: observed.sha256 });
      if (observed.present) unlinkSync(saved.path);
      const fd = openSync(dirname3(saved.path), constants.O_RDONLY);
      try {
        fsyncSync(fd);
      } finally {
        closeSync(fd);
      }
    };
    if (j.phase === "items-saved") {
      yield* Effect5.try({ try: unlink, catch: (e) => e instanceof MadeWellError ? e : failure("migration_conflict", { path: saved.path, expectedSha256: saved.sha256, observed: String(e) }) });
      yield* boundary2("registry-unlinked", "items-saved");
      store.migrationPhase(j.id, "registry-removed");
      j = store.migrationJournal();
      yield* boundary2("registry-removed", "registry-removed");
    }
    if (present(saved.path)) return yield* failure("migration_conflict", { path: saved.path, expectedSha256: saved.sha256, observed: "registry reappeared" });
    const receipt = { version: 1, migrationId: j.id, token: j.token, phase: "complete", registry: { path: saved.path, sha256: saved.sha256, bytes: saved.bytes, alreadyMissing }, items: j.doc.dispositions.map((d) => ({ id: d.id, revisionBefore: d.revision, revisionAfter: revisionOf(store.get(d.id)), disposition: d.disposition })), diagnostics: j.doc.diagnostics, attestation: j.doc.attestation, startedAt: j.started, completedAt: new Date(yield* Clock.currentTimeMillis).toISOString() };
    store.migrationPhase(j.id, "complete", receipt);
    yield* boundary2("complete", "complete");
    return receipt;
  }).pipe(Effect5.ensuring(Effect5.sync(() => store.releaseRunner())), Effect5.catchDefect((e) => Effect5.fail(e instanceof MadeWellError ? e : failure("migration_conflict", { observed: String(e) }))));
});

// src/pack-selection.ts
import { resolve as resolve2 } from "node:path";
import { Effect as Effect6 } from "effect";

// src/grammar.ts
import { Schema as Schema7 } from "effect";

// src/organs.ts
import { Result as Result4, Schema as Schema6 } from "effect";

// src/prerequisites.ts
import { Schema as Schema5 } from "effect";
var Text3 = Schema5.NonEmptyString.check(Schema5.makeFilter((value) => !!value.trim() && !value.includes("\0"), { toJsonSchema: () => [{}, true] }));
var Prerequisite = Schema5.Struct({
  id: Text3.annotate({ description: "a unique declared input identity, referenced by environment evidence as input:<id>" }),
  path: Text3.annotate({ description: "an explicit absolute host path or a path relative to the scratch; relative paths cannot leave that scratch" }),
  kind: Schema5.Literals(["file", "dir", "exec"]),
  jobs: Schema5.optionalKey(Schema5.Array(Text3).check(Schema5.isMinLength(1), Schema5.makeFilter((values) => new Set(values).size === values.length, { toJsonSchema: () => [{}, true] })).annotate({ description: "only these receiving jobs require this input; absent means every job" })),
  sha256: Schema5.optionalKey(Schema5.String.check(Schema5.makeFilter((value) => /^[a-f0-9]{64}$/i.test(value), { toJsonSchema: () => [{ pattern: "^[a-fA-F0-9]{64}$" }, true] })))
}).check(Schema5.makeFilter((input) => input.kind !== "dir" || input.sha256 === void 0 || "A directory prerequisite cannot declare a file checksum.", { toJsonSchema: () => [{}, true] }));

// src/organs.ts
var Text4 = Schema6.NonEmptyString.check(Schema6.makeFilter((value) => !!value.trim() && !value.includes("\0"), { toJsonSchema: () => [{}, true] }));
var Preparation2 = Schema6.Struct({
  ground: Schema6.Struct({ intent: Text4, sources: Schema6.Array(Schema6.Struct({ ref: Text4, finding: Text4 })).check(Schema6.isMinLength(1)) }),
  rumen: Schema6.Array(Schema6.Struct({ rule: Text4, disposition: Schema6.Literals(["addressed", "not-applicable"]), evidence: Text4 })),
  next: Schema6.Array(Schema6.Struct({ job: Text4, brief: Text4, requires: Schema6.Array(Text4).check(Schema6.isMinLength(1)) }))
});

// src/grammar.ts
var finding = shapeOf(Schema7.Struct({ result: Schema7.NonEmptyString, sources: Schema7.Array(Schema7.String), unknowns: Schema7.Array(Schema7.String), decisions: Schema7.Array(Decision) }));
var GRAMMAR_PACK = {
  name: "made-well-grammar-demo",
  version: "2",
  runtime: "functions",
  contracts: { execution: "2", discovery: "2", acceptance: "2", handoff: "2" },
  brief: "Run the prescribed grammar without skipping obligations. Discovery functions investigate and return their own concrete result, source references and genuine unknowns; preserve earlier accepted outputs. The discovery report generates coherent tasks, not an implementation plan. Every task subsequently owes ideation, planning, implementation and independent verification. Keep outputs concise but complete, and use the existing NQ and rubric for actual decisions.",
  discovery: [{ cartridge: "discovery", steps: [
    { job: "declare", profile: "ideator", duty: "Declare the intended outcome, source, scope and authority in the operator's words. Separate explicit instructions from your interpretation; do not implement.", output: finding },
    { job: "look-first", profile: "ideator", duty: "Inspect declared material, its instructions and relevant artifacts. Report what already exists, its exact locations and constraints; do not change it.", output: finding },
    { job: "classify", profile: "ideator", duty: "Classify the source into requested changes, observations, constraints and unresolved questions. Preserve source references and distinguish facts from proposed work; do not implement.", output: finding },
    { job: "lenses", profile: "ideator", duty: "Examine the proposed work through relevant user, developer and agentic concerns for this task. Record concrete tradeoffs and risks without inventing requirements or implementing.", output: finding },
    { job: "one-thing", profile: "ideator", duty: "Separate the grounded work into individual coherent candidate tasks, each with its purpose, boundaries and observable completion conditions. Reconcile existing work rather than duplicating it; do not plan code changes.", output: finding },
    { job: "route", profile: "ideator", duty: "Determine which candidate tasks are independent and which depend on another candidate or an unresolved external prerequisite. Preserve the reason for each dependency and allow independent tasks to proceed in parallel.", output: finding },
    { job: "discover", profile: "ideator", duty: "Confirm candidates with exact conditions and dependencies.", output: { type: "object", required: ["items"], properties: { items: { type: "array", items: { type: "object", required: ["title", "objective", "text", "conditions"], properties: { title: { type: "string" }, objective: { type: "string" }, text: { type: "string" }, kind: { type: "string" }, conditions: { type: "array", items: { type: "object", required: ["id", "text"], properties: { id: { type: "string" }, text: { type: "string" } } } }, after: { type: "array", items: { type: "integer" } } } } } } }, task: "This is confirm(). Use all six accepted discovery outputs and the exact original source to return the final task list. Each candidate text preserves its own purpose, constraints, source references and done-when conditions. Use after only for genuine dependencies, as 1-based positions of earlier candidates. Do not invent work, implement it, or omit an unsettled prerequisite." }
  ].map((s) => ({ ...s, replay: "safe", writes: [] })) }],
  delivery: []
};

// src/autonomy-pack.ts
var discoveryBase = {
  ...GRAMMAR_PACK,
  name: "made-well-autonomy-lab",
  version: "2",
  contracts: { execution: "2", discovery: "2", acceptance: "2", handoff: "2" },
  brief: [
    GRAMMAR_PACK.brief,
    "NQ governs every handoff of the same durable task. The receiver identifies what is unclear, ambiguous or missing; the sender clarifies, and the receiver confirms. Reuse recorded answers. Thinking phases make their own decisions; implementation follows the fixed plan. No separate task is created for a phase or a clarification.",
    "Classify accounts for every Declare intent through requirements[].intentIds or a sourced intentDispositions entry (provided, context, deferred or superseded). Candidate questionRefs assign later questions to the tasks that must settle them. A planner starts planning to resolve its own choices and records decisions with questionId; accepted decisions become reusable NQ answers before implementation receives that output.",
    'Discovery contributions use discoveryContract:"2". Put actual source locators in evidence:[{id,ref}]. Nested sources arrays cite those evidence IDs from this or earlier accepted contributions, never raw paths or locators. Keep exact source references and distinguish explicit requirements from interpretations. Each function contributes new structured findings; earlier records remain addressable. Questions are new entries with an owner and blocking role, not copies of earlier questions. If yourLastRefusedDeliverable is present, it is your receiving job\u2019s exact previous attempt, not accepted work; correct the stated defect from that input rather than asking someone to paste it again.',
    "Task decomposition must publish useful prerequisites early. Useful prerequisite artifacts can be delivered independently before the integrated work that depends on them. Every artifact task retains ideation, planning, implementation and independent verification. Bound their depth and scope. Do not create tasks that compete for the same files or force all preparatory work to wait for final completion.",
    "Every route edge names a genuine delivered artifact or prerequisite. Only task-delivered readiness exists. Record preparation promises that the actual after graph honors; never promise within-task parallelism the scheduler cannot express. Confirm preserves all accepted requirement, candidate, artifact, dependency, preparation and question identities.",
    "DX/UX/AX decisions describe predicted gains/costs and the observable result that would test them. Do not present the prediction itself as measured success. Domain-specific methods and artifact requirements come from explicit cartridges or raw task context."
  ].filter(Boolean).join("\n\n"),
  discovery: GRAMMAR_PACK.discovery.map((c) => ({ ...c, steps: c.steps.map((s) => ({
    ...s,
    output: discoveryContributionShape(s.job, { handoff: true }),
    receives: GRAMMAR_PACK.discovery.flatMap((c2) => c2.steps).slice(0, GRAMMAR_PACK.discovery.flatMap((c2) => c2.steps).findIndex((n) => n.job === s.job)).map((n) => n.job),
    task: [s.task, 'Return this function\u2019s discoveryContract:"2" contribution. Preserve earlier accepted identities through references. At confirm(), emit the exact executable after edges accepted by route; no silent filtering or reconstruction.'].filter(Boolean).join("\n\n")
  })) }))
};
var GENERAL_DISCOVERY = { ...discoveryBase, name: "general-discovery", delivery: [] };
var AUTONOMY_PACK = { ...discoveryBase, delivery: [
  { cartridge: "ideation", steps: [{ job: "ideation", profile: "ideator", duty: "Ground the intended outcome and settle the approach using the rubric.", output: { type: "object", required: ["result"], properties: { result: { description: "Grounded approach and settled choices." } } }, replay: "safe", writes: [], receives: [] }] },
  { cartridge: "planning", steps: [{ job: "planning", profile: "planner", duty: "Settle the fixed brief, conditions and evidence owners. Leave no implementation choice open.", output: { type: "object", required: ["result"], properties: { result: { description: "The fixed brief and its evidence owners." } } }, replay: "safe", writes: [] }] },
  { cartridge: "implementation", steps: [{ job: "implementation", profile: "implementer", duty: "Execute the accepted fixed brief. Never run checks or change the plan.", output: { type: "object", required: ["result"], properties: { result: { description: "The result of executing the accepted fixed brief." } } }, replay: "safe", writes: [] }] },
  { cartridge: "verification", steps: [{ job: "verification", profile: "test architect", duty: "Independently verify the producer result against every current condition. Return acceptance with verdict, conditionHash and evidence.", receives: ["implementation"], output: { type: "object", required: ["acceptance"], properties: { acceptance: { type: "object", required: ["verdict", "conditionHash", "evidence"], properties: { verdict: { enum: ["passed", "failed"] }, conditionHash: { type: "string" }, evidence: { type: "array" } } } } }, replay: "safe", writes: [] }] }
], completion: { resultJob: "implementation", acceptanceJob: "verification" } };

// src/pack-selection.ts
var resolvePackSelection = Effect6.fn("mw.resolvePackSelection")(function* (selection2) {
  if (selection2 === void 0) return { source: "default", pack: void 0 };
  if (selection2 === "builtin:grammar") return { source: selection2, pack: AUTONOMY_PACK };
  if (selection2.startsWith("builtin:")) return yield* new MadeWellError({
    code: "cartridges_invalid",
    message: `Unknown built-in cartridge selector ${selection2}.`,
    context: { path: selection2, problems: ["Unknown built-in cartridge selector. Supported selector: builtin:grammar."] },
    next: [{ run: "mw cartridges --check builtin:grammar", why: "inspect the supported built-in grammar pack" }]
  });
  const source = resolve2(selection2);
  return { source, pack: yield* loadPack(source) };
});

// src/worker.ts
import { execFileSync, spawn } from "node:child_process";
import { randomUUID as randomUUID2 } from "node:crypto";
import { appendFileSync as appendFileSync2, closeSync as closeSync2, mkdtempSync, openSync as openSync2, readSync, rmSync, writeFileSync } from "node:fs";
import { Context as Context3, Effect as Effect7, Layer as Layer4, Schema as Schema8 } from "effect";
var resultMetadata = { raw: Schema8.optionalKey(Schema8.String), version: Schema8.optionalKey(Schema8.String) };
var resultBudget = Schema8.Struct({ minutes: Schema8.Finite.check(Schema8.isGreaterThan(0)), tokens: Schema8.optionalKey(Schema8.Finite.check(Schema8.isGreaterThan(0))) });
var CommandResult = Schema8.Union([
  Schema8.Struct({ ok: Schema8.Literal(true), output: Schema8.String, ...resultMetadata }),
  Schema8.Struct({ ok: Schema8.Literal(false), limit: Schema8.Struct({ account: Schema8.String, resetsAt: Schema8.NullOr(Schema8.Finite), message: Schema8.String }), ...resultMetadata }),
  Schema8.Struct({ ok: Schema8.Literal(false), error: Schema8.String, overBudget: Schema8.optionalKey(Schema8.Struct({
    exceeded: Schema8.Literals(["minutes", "tokens"]),
    budget: resultBudget,
    ms: Schema8.Finite.check(Schema8.isGreaterThanOrEqualTo(0)),
    tokens: Schema8.NullOr(Schema8.Finite.check(Schema8.isGreaterThanOrEqualTo(0)))
  })), ...resultMetadata })
]);
var Worker = class extends Context3.Service()("madewell/Worker") {
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
var runGroup = (o) => Effect7.clockWith((clock) => Effect7.callback((resume) => {
  const started = Date.now();
  const call = `${process.pid}-${randomUUID2()}`;
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
  const timer = o.budget ? setTimeout(() => over("minutes"), o.budget.minutes * 6e4) : void 0;
  const tee = (chunk) => {
    if (!o.live) return;
    try {
      appendFileSync2(o.live, chunk);
    } catch {
    }
  };
  const take = (raw, end) => {
    const line = o.stamp ? stamped(raw, clock.currentTimeMillisUnsafe()) : raw;
    stdout += line + end;
    const n = o.tokensIn?.(line);
    if (n) tokens = (tokens ?? 0) + n;
    if (o.budget?.tokens !== void 0 && tokens !== null && tokens > o.budget.tokens) over("tokens");
  };
  const capture = (channel, chunk) => {
    try {
      o.onOutput?.(channel, chunk);
    } catch (cause) {
      kill();
      resume(Effect7.fail(new MadeWellError({ code: "capture_failed", message: "Could not record live output; the process group was stopped.", context: { command: o.command, channel, reason: String(cause) }, next: [{ run: "mw status", why: "inspect the stopped work and restore its writable store before retrying" }] })));
    }
  };
  child.stdout.setEncoding("utf8").on("data", (chunk) => {
    capture("stdout", chunk);
    tee(chunk);
    const lines2 = (partial + chunk).split("\n");
    partial = lines2.pop();
    for (const line of lines2) take(line, "\n");
  });
  child.stderr.setEncoding("utf8").on("data", (chunk) => (capture("stderr", chunk), tee(chunk), stderr += chunk));
  child.stdin?.on("error", (e) => stdinError = e.message);
  child.on("exit", kill);
  child.on("close", (code) => {
    clearTimeout(timer);
    if (partial) take(partial, "");
    resume(Effect7.succeed({ code, stdout, stderr, stdinError, overBudget }));
  });
  child.stdin?.end(o.input);
  return Effect7.sync(() => {
    clearTimeout(timer);
    kill();
  });
}));
var MARKER = / MW_CALL=(\d+-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?=\s|$)/;
function killMarked(match) {
  try {
    const ps = (flags) => execFileSync("ps", [flags, "-o", "pid=,command="], { encoding: "utf8", maxBuffer: 256 << 20, stdio: ["ignore", "pipe", "ignore"] }).split("\n").map((l) => l.trim()).filter(Boolean);
    const commands = new Map(ps("axww").map((l) => [l.split(" ")[0], l]));
    for (const line of ps(process.platform === "darwin" ? "axEww" : "axeww")) {
      const pid = line.split(" ")[0];
      const command = commands.get(pid);
      if (!command || !line.startsWith(command)) continue;
      const call = MARKER.exec(line.slice(command.length))?.[1];
      if (!call || !match(call)) continue;
      try {
        process.kill(Number(pid), "SIGKILL");
      } catch {
      }
    }
  } catch {
  }
}

// src/ledger.ts
import { constants as constants2, closeSync as closeSync3, fstatSync as fstatSync2, lstatSync as lstatSync2, openSync as openSync3, readFileSync as readFileSync4, realpathSync } from "node:fs";
import { createHash as createHash4 } from "node:crypto";
import { dirname as dirname4, isAbsolute, join as join3, sep } from "node:path";
import { Clock as Clock2, Effect as Effect8 } from "effect";
var ledgerError = (code, message2, context2 = {}) => new MadeWellError({ code, message: message2, context: context2, next: [{ run: typeof context2.id === "number" ? `mw context ${context2.id}` : "mw status", why: "review the saved work and keep the rejected draft" }] });
var executionRefusal = (item) => new MadeWellError({ code: "not_answerable", message: "Use the explicit resolution command.", context: { id: item.id, hold: item.hold }, next: [{ run: `mw resolve-execution ${item.id} --input-file <file>`, why: "explicitly authorize one replay or switch to external work" }] });
var text = (v, name) => {
  if (typeof v !== "string" || !v.trim() || v.includes("\0")) throw ledgerError("work_invalid", `${name} must be nonblank text.`, { field: name });
  return v;
};
var conditionsOf = (v, objective) => {
  const list = v === void 0 ? [{ id: "A1", text: objective }] : v;
  if (!Array.isArray(list) || !list.length) throw ledgerError("work_invalid", "Conditions must be a nonempty array.");
  const result = list.map((c, i) => ({ id: text(c.id, `conditions[${i}].id`), text: text(c.text, `conditions[${i}].text`) }));
  if (new Set(result.map((c) => c.id)).size !== result.length) throw ledgerError("work_invalid", "Condition ids must be unique.");
  return result;
};
var conditionHashOf = (conditions) => revisionOf(conditions);
var quiescent = (item) => !["running", "waiting-quota"].includes(item.status) && !item.flow?.pending && !Object.values(item.flow?.tracks ?? {}).some((t) => t.pending);
function validateEvidence(item, value) {
  if (!Array.isArray(value)) throw ledgerError("completion_invalid", "Evidence must cover every condition exactly once.", { id: item.id });
  const evidence = value.map((e) => ({ conditionId: text(e.conditionId, "conditionId"), detail: text(e.detail, "detail"), refs: Array.isArray(e.refs) ? e.refs.map((r) => text(r, "ref")) : (() => {
    throw ledgerError("completion_invalid", "refs must be an array.");
  })() }));
  if (evidence.length !== item.conditions.length || item.conditions.some((c) => evidence.filter((e) => e.conditionId === c.id).length !== 1)) throw ledgerError("completion_invalid", "Evidence must cover every current condition exactly once.", { id: item.id });
  return evidence;
}
var within = (root, path) => path === root || path.startsWith(root + sep);
function validateDestinationRootsUnsafe(storePath, roots) {
  for (const [i, root] of roots.entries()) {
    if (!isAbsolute(root.path) || !lstatSync2(root.path).isDirectory() || lstatSync2(root.path).isSymbolicLink() || realpathSync(root.path) !== root.path) throw ledgerError("file_result_invalid", "Destination must be an existing absolute directory without symlink components.", { root });
    const forbidden = ["scratch", "live", "calls", "worker-calls"].map((n) => join3(dirname4(storePath), n));
    if (forbidden.some((p) => within(p, root.path) || within(root.path, p)) || roots.some((r, j) => j !== i && (within(r.path, root.path) || within(root.path, r.path)))) throw ledgerError("file_result_invalid", "Destination roots must not overlap each other or transient storage.", { root });
  }
}
function validateFilesUnsafe(item, files, writes, storePath) {
  if (files === void 0) files = [];
  if (!Array.isArray(files)) throw ledgerError("file_result_invalid", "files must be an array.", { id: item.id });
  const roots = item.settings.destinations;
  validateDestinationRootsUnsafe(storePath, roots);
  return files.map((f) => {
    const root = roots.find((d) => d.id === f.destination);
    if (!root || !writes.includes(f.destination) || typeof f.path !== "string" || isAbsolute(f.path) || f.path.includes("\0") || f.path.split("/").some((s) => !s || s === "." || s === "..") || f.path.includes("\\") || !Number.isSafeInteger(f.bytes) || f.bytes < 0 || !/^[a-f0-9]{64}$/.test(f.sha256)) throw ledgerError("file_result_invalid", "Invalid or unauthorized file reference.", { file: f });
    const target2 = join3(root.path, f.path);
    if (!within(root.path, target2)) throw ledgerError("file_result_invalid", "File escaped its destination.", { file: f });
    let cursor = root.path;
    for (const part of f.path.split("/")) {
      cursor = join3(cursor, part);
      if (lstatSync2(cursor).isSymbolicLink()) throw ledgerError("file_result_invalid", "Symlink components are forbidden.", { file: f });
    }
    const fd = openSync3(target2, constants2.O_RDONLY | constants2.O_NOFOLLOW);
    try {
      const stat = fstatSync2(fd), body = readFileSync4(fd);
      if (!stat.isFile() || stat.size !== f.bytes || createHash4("sha256").update(body).digest("hex") !== f.sha256) throw ledgerError("file_result_invalid", "File bytes changed or are not regular.", { file: f });
    } finally {
      closeSync3(fd);
    }
    return { destination: f.destination, path: f.path, sha256: f.sha256, bytes: f.bytes };
  });
}
function validateFiles(item, files, writes, storePath) {
  try {
    return validateFilesUnsafe(item, files, writes, storePath);
  } catch (e) {
    if (e instanceof MadeWellError) throw e;
    throw ledgerError("file_result_invalid", "The declared result could not be observed.", { id: item.id, reason: String(e) });
  }
}
var mutateWork = Effect8.fn("mw.mutateWork")(function* (operation, id2, input) {
  yield* assertWritable();
  const store = yield* Store, at = new Date(yield* Clock2.currentTimeMillis).toISOString();
  text(input.requestId, "requestId");
  if (!input.actor || !["operator", "agent"].includes(input.actor.kind)) throw ledgerError("work_invalid", "actor.kind is required.");
  text(input.actor.label, "actor.label");
  const data = { actor: input.actor, input };
  return yield* Effect8.try({ try: () => store.request(input.requestId, operation, id2, input, () => store.transition(id2, input.revision, operation, data, (item) => {
    if (isTerminal(item)) throw ledgerError("work_terminal", "Terminal work cannot be changed.", { id: id2, status: item.status });
    let next = { ...item };
    switch (operation) {
      case "progress": {
        const p = input.progress ?? input;
        const conditions = p.conditions === void 0 ? item.conditions : conditionsOf(p.conditions, item.objective);
        if (p.conditions !== void 0 && (item.execution.mode !== "external" || !quiescent(item))) throw ledgerError("work_busy", "Conditions can change only on quiescent external work.", { id: id2 });
        next = { ...next, progress: { remaining: text(p.remaining, "remaining"), nextAction: text(p.nextAction, "nextAction"), owner: text(p.owner, "owner") }, conditions, conditionHash: conditionHashOf(conditions), ...p.conditions !== void 0 ? { completion: void 0 } : {} };
        break;
      }
      case "block": {
        const b = input.blocker;
        if (!b) throw ledgerError("work_invalid", "blocker is required.", { id: id2 });
        const blocker = { id: text(b.id, "blocker.id"), reason: text(b.reason, "blocker.reason"), owner: text(b.owner, "blocker.owner"), nextAction: text(b.nextAction, "blocker.nextAction"), createdAt: at };
        if (item.blockers.some((b2) => b2.id === blocker.id && !b2.resolvedAt)) throw ledgerError("blocker_exists", "An active blocker already has this id.", { id: id2 });
        next = { ...next, blockers: [...item.blockers, blocker] };
        break;
      }
      case "unblock": {
        if (item.hold?.code === "execution_uncertain") throw executionRefusal({ ...item, hold: item.hold });
        const b = item.blockers.find((b2) => b2.id === input.blockerId && !b2.resolvedAt);
        if (!b) throw ledgerError("blocker_not_found", "Unknown or already resolved blocker.", { id: id2, blockerId: input.blockerId });
        next = { ...next, blockers: item.blockers.map((x) => x === b ? { ...b, resolvedAt: at, resolution: text(input.resolution, "resolution") } : x) };
        break;
      }
      case "complete": {
        if (item.execution.mode !== "external" || !quiescent(item) || item.hold || item.blockers.some((b) => !b.resolvedAt) || (item.after ?? []).some((n) => store.get(n)?.status !== "completed")) throw ledgerError("completion_invalid", "Completion requires quiescent external work without unresolved blockers, holds or prerequisites.", { id: id2 });
        if (input.result === void 0 || input.result === null) throw ledgerError("completion_invalid", "result must be non-null JSON.", { id: id2 });
        const files = validateFiles(item, input.files, item.settings.destinations.map((d) => d.id), store.path), evidence = validateEvidence(item, input.evidence);
        next = { ...next, status: "completed", completion: { kind: "recorded", result: input.result, files, evidence, conditionHash: item.conditionHash, acceptedBy: input.actor, at }, progress: { ...item.progress, remaining: "None", nextAction: "Inspect recorded result" } };
        break;
      }
      case "configure-work": {
        if (!quiescent(item) || item.hold?.code === "execution_uncertain") throw ledgerError("work_busy", "Configure only quiescent work.", { id: id2 });
        text(input.reason, "reason");
        const execution = input.execution;
        if (!execution || !["external", "cartridge"].includes(execution.mode)) throw ledgerError("work_invalid", "execution is required.", { id: id2 });
        text(execution.owner, "execution.owner");
        const settings = validateSettings({ ...item.settings, ...input.settings }, store.path), pack = settings.deliveryPack;
        const autonomy = input.settings?.autonomy === void 0 ? item.autonomy : settings.autonomy;
        data.original = item;
        if (execution.mode === "cartridge" && autonomy === "full" && !settings.alert) throw ledgerError("settings_invalid", "Unattended cartridge work requires a pinned alert.", { id: id2 });
        if (execution.mode === "cartridge" && (!pack || problemsOf(pack).length || (item.provisioned ?? []).some((r) => r.torn?.exitCode !== 0))) throw ledgerError("work_invalid", "Cartridge execution needs a valid pinned pack and no pending cleanup.", { id: id2 });
        const conditions = conditionsOf(input.conditions, item.objective);
        next = { ...next, execution, settings, autonomy, pack: execution.mode === "cartridge" ? pack : void 0, conditions, conditionHash: conditionHashOf(conditions), hold: item.hold?.code === "legacy_execution" ? void 0 : item.hold, status: execution.mode === "external" ? "open" : "queued", flow: { loop: "delivery", accepted: [] } };
        break;
      }
      case "resolve-execution": {
        const pending = item.flow?.pending;
        const p = pending?.invocation === input.invocation ? pending : Object.values(item.flow?.tracks ?? {}).map((t) => t.pending).find((p2) => p2?.invocation === input.invocation);
        if (item.hold?.code !== "execution_uncertain" || !p || input.invocation !== p.invocation) throw ledgerError("execution_uncertain", "The named uncertain invocation is required.", { id: id2 });
        text(input.reason, "reason");
        if (input.action === "replay" && input.authorizeReplay === true) next = { ...next, status: "queued", hold: void 0, flow: { ...item.flow, pending: item.flow?.pending?.invocation === p.invocation ? void 0 : item.flow?.pending, tracks: Object.fromEntries(Object.entries(item.flow?.tracks ?? {}).map(([key, t]) => [key, { ...t, pending: t.pending?.invocation === p.invocation ? void 0 : t.pending }])), replayOf: p.invocation } };
        else if (input.action === "external" && input.authorizeReplay === void 0) next = { ...next, status: "open", hold: void 0, execution: { mode: "external", owner: input.actor.label }, flow: { ...item.flow, pending: void 0, tracks: Object.fromEntries(Object.entries(item.flow?.tracks ?? {}).map(([key, t]) => [key, { ...t, pending: void 0 }])) } };
        else throw ledgerError("work_invalid", "Choose replay with authorizeReplay:true or external without authorizeReplay.", { id: id2 });
        break;
      }
      default:
        throw ledgerError("work_invalid", "Unknown work transition.", { operation });
    }
    return { ...next, updated: at };
  })), catch: (e) => e instanceof MadeWellError ? e : ledgerError("work_invalid", String(e), { id: id2 }) });
});
var createLedgerWork = Effect8.fn("mw.createLedgerWork")(function* (input) {
  yield* assertWritable();
  const store = yield* Store, at = new Date(yield* Clock2.currentTimeMillis).toISOString();
  const create = () => {
    const settings = validateSettings({ ...settingsOf(store), ...input.settings }, store.path), conditions = conditionsOf(input.conditions, input.objective), pack = input.discovery ? settings.discoveryPack : settings.deliveryPack;
    if (pack && pack.contracts?.execution !== "2") throw ledgerError("cartridges_invalid", "Execution contract 2 is required.");
    if (pack && settings.autonomy === "full" && !settings.alert) throw ledgerError("settings_invalid", "Unattended cartridge work requires a pinned alert.");
    text(input.title, "title");
    text(input.objective, "objective");
    if (typeof input.source !== "string") throw ledgerError("work_invalid", "source must be exact text.");
    if (input.kind !== void 0) text(input.kind, "kind");
    return store.create({ title: input.title, objective: input.objective, source: input.source, ...input.kind ? { kind: input.kind } : {}, schemaVersion: 2, settings, conditions, conditionHash: conditionHashOf(conditions), execution: { mode: pack ? "cartridge" : "external", owner: "operator" }, relationships: { after: [] }, progress: { remaining: input.objective, nextAction: "Carry out the recorded work", owner: "operator" }, blockers: [], status: pack ? "queued" : "open", ...pack ? { pack, job: laneOf(pack)[input.discovery ? "discovery" : "delivery"][0]?.job ?? "" } : {}, flow: { loop: input.discovery ? "discovery" : "delivery", accepted: [] }, autonomy: settings.autonomy, organs: { version: "1" }, created: at, updated: at });
  };
  const canonical2 = { title: input.title, objective: input.objective, source: input.source, kind: input.kind, conditions: input.conditions, settings: input.settings ?? {}, discovery: input.discovery === true };
  return yield* Effect8.try({ try: () => input.requestId ? store.request(input.requestId, "create", null, canonical2, create) : create(), catch: (e) => e instanceof MadeWellError ? e : ledgerError("work_invalid", String(e)) });
});

// src/settings.ts
var Text5 = Schema9.NonEmptyString.check(Schema9.makeFilter((s) => !!s.trim() && !s.includes("\0"), { toJsonSchema: () => [{}, true] }));
var RumenGuidance = Schema9.Struct({ id: Text5, kind: Schema9.Literals(["judge", "sign", "lexicon"]), text: Text5, jobs: Schema9.optionalKey(Schema9.Array(Text5)) });
var WorkSettings = Schema9.Struct({
  autonomy: Schema9.Literals(["full", "checkpoints", "steps"]),
  discoveryPack: Pack,
  deliveryPack: Schema9.NullOr(Pack),
  alert: Schema9.NullOr(Schema9.Struct({ run: Text5, cwd: Text5 })),
  inputs: Schema9.Array(Prerequisite),
  destinations: Schema9.Array(Schema9.Struct({ id: Text5, path: Text5 })),
  conventions: Schema9.Array(Text5),
  rumen: Schema9.Array(RumenGuidance)
});
var defaultSettings = () => ({ autonomy: "checkpoints", discoveryPack: GENERAL_DISCOVERY, deliveryPack: null, alert: null, inputs: [], destinations: [], conventions: [], rumen: [] });
var settingsOf = (store) => store.settings()?.settings ?? defaultSettings();
var validateSettings = (value, storePath) => {
  const v = { ...value }, defaults4 = defaultSettings();
  for (const key of Object.keys(defaults4)) if (v[key] === null && key !== "deliveryPack" && key !== "alert") v[key] = defaults4[key];
  for (const key of ["discoveryPack", "deliveryPack"]) if (typeof v[key] === "string") {
    const resolved = Effect9.runSync(resolvePackSelection(v[key]).pipe(Effect9.match({ onSuccess: (r) => r.pack, onFailure: (e) => {
      throw e;
    } })));
    v[key] = resolved;
  }
  let parsed;
  try {
    parsed = Schema9.decodeUnknownSync(WorkSettings)(v);
  } catch (e) {
    throw new MadeWellError({ code: "settings_invalid", message: "Settings do not match WorkSettings.", context: { reason: String(e) }, next: [] });
  }
  const problems = [...problemsOf(parsed.discoveryPack), ...parsed.deliveryPack ? problemsOf(parsed.deliveryPack) : []];
  for (const [name, entries] of [["inputs", parsed.inputs], ["destinations", parsed.destinations]]) {
    if (new Set(entries.map((e) => e.id)).size !== entries.length) problems.push(`${name}: duplicate identities`);
    for (const e of entries) if (name === "inputs" && !isAbsolute2(e.path)) problems.push(`${name}.${e.id}.path must be absolute`);
  }
  if (parsed.alert && !isAbsolute2(parsed.alert.cwd)) problems.push("alert.cwd must be absolute");
  if (problems.length) throw new MadeWellError({ code: "settings_invalid", message: "Settings are invalid.", context: { problems }, next: [{ run: "mw settings", why: "inspect the current installation settings" }] });
  try {
    validateDestinationRootsUnsafe(storePath, parsed.destinations);
  } catch (e) {
    if (e instanceof MadeWellError) throw e;
    throw ledgerError("file_result_invalid", "The declared result could not be observed.", { reason: String(e) });
  }
  return parsed;
};
var updateSettings = Effect9.fn("mw.updateSettings")(function* (input) {
  yield* assertWritable();
  const store = yield* Store, at = new Date(yield* Clock3.currentTimeMillis).toISOString();
  return yield* Effect9.try({ try: () => store.request(input.requestId, "settings", null, input, () => {
    const current = store.settings(), revision3 = current?.revision ?? "0";
    if (input.revision !== revision3) throw new MadeWellError({ code: "revision_conflict", message: "Settings changed; retain your draft.", context: { expected: input.revision, actual: revision3 }, next: [{ run: "mw settings", why: "review current settings" }] });
    const settings = validateSettings({ ...settingsOf(store), ...input.settings }, store.path);
    return store.saveSettings(settings, at);
  }), catch: (e) => e instanceof MadeWellError ? e : new MadeWellError({ code: "settings_invalid", message: String(e), context: {}, next: [] }) });
});
var openHolds = (store) => store.list().filter((i) => i.hold).map((i) => {
  const events = store.events(i.id), held = events.findLast((e) => e.kind === "held" || e.kind === "paused"), alert = events.filter((e) => e.seq > (held?.seq ?? 0)).find((e) => e.kind === "alert-finished");
  return { item: i.id, title: i.title, ...i.hold, since: held?.at ?? i.updated, alerted: alert ? { at: alert.at, exitCode: Number(alert.data.exitCode) } : null };
});
var alertHolds = Effect9.fn("mw.alertHolds")(function* () {
  const store = yield* Store;
  for (const hold2 of openHolds(store)) {
    const events = store.events(hold2.item), held = events.findLast((e) => e.kind === "held" || e.kind === "paused"), attempts = events.filter((e) => e.seq > (held?.seq ?? 0) && e.kind === "alert-attempt");
    if (attempts.length) {
      for (const attempt3 of attempts.filter((e) => e.data.status === "started")) {
        if (events.some((e) => e.kind === "alert-finished" && (e.data.attempt === attempt3.seq || e.data.attempt === void 0 && e.seq > attempt3.seq))) continue;
        store.transition(hold2.item, revisionOf(store.get(hold2.item)), "alert-finished", { attempt: attempt3.seq, status: "uncertain", reason: "interrupted before its outcome was recorded" }, (item) => item);
      }
      continue;
    }
    const alert = store.get(hold2.item).settings?.alert, at = new Date(yield* Clock3.currentTimeMillis).toISOString();
    store.note(hold2.item, "alert-attempt", { alert: alert ?? null, status: alert ? "started" : "missing" }, at);
    if (!alert) {
      store.note(hold2.item, "alert-finished", { status: "missing", exitCode: null }, at);
      continue;
    }
    const result = yield* Effect9.result(runGroup({ command: "sh", args: ["-c", alert.run], cwd: alert.cwd, env: { ...process.env, MW_ITEM: String(hold2.item), MW_TITLE: hold2.title, MW_HOLD: hold2.code, MW_MESSAGE: hold2.message }, input: JSON.stringify(hold2), budget: { minutes: 5 } }));
    store.note(hold2.item, "alert-finished", result._tag === "Success" ? { status: result.success.code === 0 ? "delivered" : "failed", exitCode: result.success.code, output: result.success.stdout + result.success.stderr } : { status: "failed", exitCode: null, error: result.failure.message });
  }
});

// src/legacy.ts
var legacyRegistryPath = (storePath) => join4(dirname5(storePath), "projects.json");
var revisionOf = (item) => createHash5("sha256").update(JSON.stringify(item) ?? "null").digest("hex");
var legacyDisposition = (raw) => raw.schemaVersion === 2 ? "current" : ["discovered", "dropped"].includes(String(raw.status)) ? String(raw.status) : ["shipped", "merged", "completed"].includes(String(raw.status)) || !!raw.merged ? "completed-legacy" : "legacy_execution";
function decodeLegacy(raw, at) {
  if (raw.schemaVersion === 2) return raw;
  const disposition = legacyDisposition(raw), objective = String(raw.objective ?? ""), conditionHash = revisionOf([{ id: "A1", text: objective }]);
  const successful = disposition === "completed-legacy";
  return {
    ...raw,
    schemaVersion: 2,
    kind: typeof raw.kind === "string" ? raw.kind : void 0,
    relationships: { ...typeof raw.parent === "number" ? { parent: raw.parent } : {}, ...typeof raw.discovery === "number" ? { discovery: raw.discovery } : {}, after: raw.after ?? [] },
    settings: defaultSettings(),
    execution: { mode: "external", owner: "operator" },
    conditions: [{ id: "A1", text: objective }],
    conditionHash,
    progress: { remaining: successful ? "None" : objective, nextAction: successful ? "Inspect recorded result" : "Configure this historical work before continuing", owner: "operator" },
    blockers: [],
    status: successful ? "completed" : disposition === "legacy_execution" ? "held" : raw.status,
    ...disposition === "legacy_execution" ? { hold: { code: "legacy_execution", message: "Historical execution is inert. Configure work explicitly.", context: { originalStatus: raw.status } } } : {},
    ...successful ? { completion: { kind: "legacy", result: raw.shipped ?? raw.completion ?? raw.verification ?? { historical: true }, files: [], conditionHash, evidence: [], acceptedBy: { kind: "agent", label: "legacy migration" }, at, coverage: "acceptance coverage unavailable" } } : {},
    legacy: { original: raw, acceptanceCoverage: "unavailable", settings: "inert provenance", cleanup: "pending" },
    updated: at
  };
}

// src/managed-effort.ts
import { createHash as createHash6 } from "node:crypto";
import { Context as Context4, Effect as Effect10, Layer as Layer5, Option } from "effect";
import { z } from "zod";
var text2 = z.string().refine((value) => !!value.trim() && !value.includes("\0"));
var variant = z.object({ instructions: text2, stopping: text2, evidence: text2 }).strict();
var EffortDeclaration = z.object({
  version: z.literal(1),
  default: text2,
  variants: z.record(text2, variant)
}).strict();
var ResolvedEffort = z.object({
  version: z.literal(1),
  requested: z.unknown(),
  bindingSelection: z.unknown(),
  effective: text2,
  methodIdentity: text2,
  occurrence: text2,
  sourceIdentity: text2,
  declaration: z.string().nullable(),
  declarationDigest: text2.nullable(),
  instructionBytes: z.string(),
  instructions: text2,
  stopping: text2,
  evidence: text2,
  expansions: z.array(z.object({
    address: text2,
    origin: text2,
    requested: text2.nullable(),
    effective: text2,
    declaration: text2,
    declarationDigest: text2,
    expansionIdentity: text2
  })).optional(),
  classification: z.enum(["free-light", "protected"]),
  digest: text2
});
var ManagedEffortAccess = class extends Context4.Service()("madewell/ManagedEffortAccess") {
};
var defaultManagedEffortAccess = {
  decide: (binding, recipe) => recipe.effective === "light" && !recipe.expansions?.some((choice) => choice.effective !== "light") ? { allowed: true, provenance: "builtin:free-light/1", binding } : { allowed: false, reason: "Protected managed preparation is unavailable without trusted host access." }
};
var managedEffortAccessLayer = Layer5.succeed(ManagedEffortAccess, defaultManagedEffortAccess);
var currentManagedEffortAccess = Effect10.serviceOption(ManagedEffortAccess).pipe(
  Effect10.map((value) => Option.getOrElse(value, () => defaultManagedEffortAccess))
);
var hash = (value) => createHash6("sha256").update(value).digest("hex");
var fail = (message2, context2) => new MadeWellError({
  code: "portable_invalid",
  message: message2,
  context: context2,
  next: [{ run: "inspect_work", why: "Inspect the pinned method and exact requested effort; no substitution or execution occurred." }]
});
function resolveManagedEffort(input) {
  let declaration;
  if (input.declaration !== void 0) {
    let data = input.declaration;
    if (typeof data === "string") {
      try {
        data = JSON.parse(data);
      } catch {
        throw fail("The explicit effort recipe declaration is not JSON.", { requestedEffort: input.requested ?? null, declaration: input.declaration });
      }
    }
    const parsed = EffortDeclaration.safeParse(data);
    if (!parsed.success) throw fail("The explicit effort recipe declaration is unsupported.", { requestedEffort: input.requested ?? null, declaration: input.declaration, problems: parsed.error.issues });
    declaration = parsed.data;
    if (!Object.hasOwn(declaration.variants, declaration.default)) throw fail("The authored default has no recipe.", { declaration: input.declaration });
  }
  const requested = input.requested === void 0 ? null : input.requested;
  const bindingSelection = input.bindingSelection === void 0 ? null : input.bindingSelection;
  const selected = input.requested !== void 0 ? input.requested : input.bindingSelection !== void 0 ? input.bindingSelection : declaration?.default ?? "light";
  if (input.requested !== void 0 && input.bindingSelection !== void 0 && input.bindingSelection !== "light" && input.requested !== input.bindingSelection) {
    throw fail("Requested effort conflicts with an explicitly selected nested recipe.", { requestedEffort: requested, bindingSelection, occurrence: input.occurrence });
  }
  if (typeof selected !== "string" || (declaration ? !Object.hasOwn(declaration.variants, selected) : selected !== "light")) {
    throw fail("This pinned method does not author the requested effort. No universal recipe or downgrade was substituted.", {
      requestedEffort: requested,
      bindingSelection,
      occurrence: input.occurrence,
      availableEffort: declaration ? Object.keys(declaration.variants) : ["light"]
    });
  }
  const recipe = declaration?.variants[selected];
  const declarationBytes = input.declaration === void 0 ? null : typeof input.declaration === "string" ? input.declaration : JSON.stringify(input.declaration);
  const body = {
    version: 1,
    requested,
    bindingSelection,
    effective: selected,
    methodIdentity: input.methodIdentity,
    occurrence: input.occurrence,
    sourceIdentity: input.sourceIdentity,
    declaration: declarationBytes,
    declarationDigest: declarationBytes === null ? null : hash(declarationBytes),
    instructionBytes: input.instructionBytes,
    instructions: recipe?.instructions ?? input.instructionBytes,
    stopping: recipe?.stopping ?? "As defined by the pinned method; no additional effort variant is declared.",
    evidence: recipe?.evidence ?? "Report only work actually performed under the pinned method; missing evidence remains explicit.",
    ...input.expansions?.length ? { expansions: input.expansions } : {},
    classification: selected === "light" && !input.expansions?.some((choice) => choice.effective !== "light") ? "free-light" : "protected"
  };
  return { ...body, digest: hash(JSON.stringify(body)) };
}
function authorizeManagedEffort(policy, recipe, scope) {
  const binding = { ...scope, occurrence: recipe.occurrence, methodIdentity: recipe.methodIdentity, sourceIdentity: recipe.sourceIdentity, recipeDigest: recipe.digest };
  if (recipe.effective === "light" && !recipe.expansions?.some((choice) => choice.effective !== "light")) return { allowed: true, provenance: "builtin:free-light/1", binding };
  const decision = policy.decide(Object.freeze({ ...binding }), Object.freeze({ ...recipe }));
  if (!decision || decision.allowed !== true || typeof decision.provenance !== "string" || !decision.provenance.trim() || !decision.binding || Object.keys(binding).some((key) => decision.binding[key] !== binding[key])) {
    throw new MadeWellError({
      code: "brainstorm_entitlement_unavailable",
      message: "The selected protected managed recipe requires current trusted host access. No downgrade or purchase occurred.",
      context: { ...binding, requestedEffort: recipe.requested, effectiveEffort: recipe.effective, entitlement: "unavailable", reason: decision?.allowed === false ? decision.reason : "No matching synchronous trusted grant.", availableEffort: ["light"] },
      next: [{ run: "inspect_work", why: "Preserve the draft; inspect available authored Light recipes or obtain access through the trusted host." }]
    });
  }
  return { allowed: true, provenance: decision.provenance, binding };
}
function brainstormEffortDeclaration(content) {
  const labels = { light: "| **Light** \u2014 default |", focused: "| **Focused** |", deep: "| **Deep** |" };
  const variants = Object.fromEntries(Object.entries(labels).map(([name, prefix]) => {
    const row = content.split("\n").find((line) => line.startsWith(prefix));
    const cells = row?.split("|");
    if (!cells || cells.length !== 5) throw fail("The pinned Brainstorm effort table does not match its versioned adapter.", { name });
    return [name, { instructions: cells[2].trim(), stopping: cells[3].trim(), evidence: content }];
  }));
  return { version: 1, default: "light", variants };
}
function assertPerformedEffort(performed, effective, recipe) {
  if (performed === effective) return;
  const authored = recipe?.sourceIdentity === "brainstorm:references/effort.md/1";
  const presets = ["light", "focused", "deep"];
  if (authored && presets.includes(performed) && presets.includes(effective) && presets.indexOf(performed) < presets.indexOf(effective)) return;
  throw fail("Reported performed effort is not supported by the prepared recipe; describe limitations without claiming stronger work.", { performedEffort: performed, effectiveEffort: effective, recipeDigest: recipe?.digest ?? null });
}

// src/skill-package.ts
import { createHash as createHash7 } from "node:crypto";
import { closeSync as closeSync4, constants as constants3, fstatSync as fstatSync3, lstatSync as lstatSync3, openSync as openSync4, readFileSync as readFileSync5, readdirSync as readdirSync2 } from "node:fs";
import { basename, isAbsolute as isAbsolute3, relative, resolve as resolve3, sep as sep2 } from "node:path";
import { parseDocument } from "yaml";
var hash2 = (bytes2) => createHash7("sha256").update(bytes2).digest("hex");
var identityOf = (origin, manifest) => hash2(JSON.stringify({
  origin,
  manifest: manifest.map(({ path, bytes: bytes2, sha256 }) => ({ path, bytes: bytes2, sha256 }))
}));
function refuse(code, reason, context2) {
  throw new MadeWellError({
    code,
    message: reason,
    context: { ...context2, reason },
    next: [{ run: "mw", why: "Inspect the read-only command reference; explicitly select the corrected package again rather than reusing a stale identity." }]
  });
}
function boundary(context2, action) {
  try {
    return action();
  } catch (cause) {
    if (cause instanceof MadeWellError) throw new MadeWellError({
      code: cause.code,
      message: cause.message,
      context: { ...context2, ...cause.context },
      ...cause.cause ? { cause: cause.cause } : {},
      next: cause.next
    });
    const ioCode = typeof cause === "object" && cause !== null && "code" in cause ? String(cause.code) : void 0;
    return refuse(
      ioCode === "ELOOP" || ioCode === "ENOTDIR" ? "portable_invalid" : "portable_unreadable",
      "Could not safely read the explicitly granted local material.",
      {
        ...context2,
        ...ioCode ? { ioCode } : {},
        detail: cause instanceof Error ? cause.message : String(cause)
      }
    );
  }
}
function localPath(path, label) {
  if (typeof path !== "string" || !path || path.includes("\0") || path.includes("\\") || path.startsWith("//") || /^[a-z][a-z0-9+.-]*:/i.test(path)) {
    refuse("portable_invalid", "Only explicit local filesystem paths are supported.", { path, label });
  }
}
function resourcePath(path) {
  localPath(path, "package resource");
  if (isAbsolute3(path) || path.split("/").some((part) => !part || part === "." || part === "..")) {
    refuse("portable_invalid", "Package resource paths must be normalized relative paths without traversal.", { path });
  }
}
function absolutePath(path, label) {
  localPath(path, label);
  if (!isAbsolute3(path) || path.split("/").includes("..") || path.split("/").includes(".")) {
    refuse("portable_invalid", "The granted path must be absolute and contain no dot segments.", { path, label });
  }
  return resolve3(path);
}
function within2(root, path) {
  const suffix = relative(root, path);
  if (suffix === ".." || suffix.startsWith(`..${sep2}`) || isAbsolute3(suffix)) {
    refuse("portable_invalid", "The requested path is outside the explicitly granted root.", { root, path });
  }
  return suffix;
}
function childPath(fd, child) {
  const base = process.platform === "linux" ? "/proc/self/fd" : process.platform === "darwin" ? "/dev/fd" : void 0;
  if (!base || !constants3.O_NOFOLLOW || !constants3.O_DIRECTORY) {
    refuse("portable_unreadable", "This host does not support descriptor-anchored local package reads.", { platform: process.platform });
  }
  return `${base}/${fd}/${child}`;
}
function directoryAt(fd, parts, action) {
  let current = fd;
  try {
    for (const part of parts) {
      const next = openSync4(childPath(current, part), constants3.O_RDONLY | constants3.O_DIRECTORY | constants3.O_NOFOLLOW);
      const previous = current;
      current = next;
      if (previous !== fd) closeSync4(previous);
    }
    return action(current);
  } finally {
    if (current !== fd) closeSync4(current);
  }
}
function withRoot(root, action) {
  const canonical2 = absolutePath(root, "root");
  const fd = openSync4("/", constants3.O_RDONLY | constants3.O_DIRECTORY);
  try {
    return directoryAt(fd, canonical2.split("/").filter(Boolean), (directory) => action(directory, canonical2));
  } finally {
    closeSync4(fd);
  }
}
function readAt(directory, path) {
  resourcePath(path);
  const parts = path.split("/");
  return directoryAt(directory, parts.slice(0, -1), (parent) => {
    const target2 = childPath(parent, parts.at(-1));
    if (!lstatSync3(target2).isFile()) refuse("portable_invalid", "Only regular files may be read; symlinks and special files are refused.", { path });
    const fd = openSync4(target2, constants3.O_RDONLY | constants3.O_NOFOLLOW | constants3.O_NONBLOCK);
    try {
      const before = fstatSync3(fd, { bigint: true });
      if (!before.isFile()) refuse("portable_invalid", "Only regular files may be read.", { path });
      const bytes2 = readFileSync5(fd);
      const after = fstatSync3(fd, { bigint: true });
      if (before.size !== after.size || before.mtimeNs !== after.mtimeNs || before.ctimeNs !== after.ctimeNs || BigInt(bytes2.length) !== after.size) {
        refuse("portable_stale", "The file changed while it was being read.", { path });
      }
      return bytes2;
    } finally {
      closeSync4(fd);
    }
  });
}
function manifestAt(directory, scope) {
  const manifest = [];
  let instructions;
  const pending = [""];
  while (pending.length) {
    const prefix = pending.pop();
    directoryAt(directory, prefix ? prefix.split("/") : [], (parent) => {
      for (const entry of readdirSync2(childPath(parent, "."), { withFileTypes: true })) {
        if (scope === "runtime" && !prefix && !["SKILL.md", "references", "assets"].includes(entry.name)) continue;
        const path = prefix ? `${prefix}/${entry.name}` : entry.name;
        resourcePath(path);
        if (entry.isDirectory()) pending.push(path);
        else if (entry.isFile()) {
          const bytes2 = readAt(directory, path);
          manifest.push({ path, bytes: bytes2.length, sha256: hash2(bytes2) });
          if (path === "SKILL.md") instructions = bytes2;
        } else refuse("portable_invalid", "Packages may contain only directories and regular files, never symlinks or special files.", { path });
      }
    });
  }
  if (!instructions) refuse("portable_invalid", "The selected skill package has no SKILL.md.", {});
  manifest.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
  return { manifest, instructions };
}
function immutableYaml(value, ancestors = /* @__PURE__ */ new Set()) {
  if (value === null || typeof value === "string" || typeof value === "boolean" || typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "object" || value === null || ancestors.has(value)) {
    return refuse("portable_invalid", "Frontmatter must contain finite, acyclic YAML data.", {});
  }
  ancestors.add(value);
  try {
    if (Array.isArray(value)) return Object.freeze(value.map((item) => immutableYaml(item, ancestors)));
    if (!(value instanceof Map)) return refuse("portable_invalid", "Unsupported YAML value in frontmatter.", {});
    const result = /* @__PURE__ */ Object.create(null);
    for (const [key, item] of value) {
      if (typeof key !== "string") refuse("portable_invalid", "Frontmatter mapping keys must be strings.", {});
      result[key] = immutableYaml(item, ancestors);
    }
    return Object.freeze(result);
  } finally {
    ancestors.delete(value);
  }
}
function frontmatterOf(instructions, origin) {
  const match = /^(?:\uFEFF)?---[ \t]*\r?\n([\s\S]*?)^---[ \t]*(?:\r?\n|$)/m.exec(instructions);
  if (!match || match.index !== 0) refuse("portable_invalid", "SKILL.md must begin with YAML frontmatter delimited by --- lines.", { origin });
  const document = parseDocument(match[1], { uniqueKeys: true, schema: "core" });
  if (document.errors.length || document.warnings.length) {
    refuse("portable_invalid", "SKILL.md frontmatter is not supported, unambiguous standard YAML.", {
      origin,
      problems: [...document.errors, ...document.warnings].map((problem) => problem.message)
    });
  }
  let data;
  try {
    data = immutableYaml(document.toJS({ mapAsMap: true }));
  } catch (cause) {
    if (cause instanceof MadeWellError) throw cause;
    return refuse("portable_invalid", "SKILL.md frontmatter could not be decoded safely.", { origin, detail: String(cause) });
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) refuse("portable_invalid", "Frontmatter must be a mapping.", { origin });
  const fields = data;
  const invalid = (field, reason) => refuse("portable_invalid", reason, { origin, field });
  if (typeof fields.name !== "string" || !/^[\p{Ll}\p{N}]+(?:-[\p{Ll}\p{N}]+)*$/u.test(fields.name) || [...fields.name].length > 64 || fields.name !== basename(origin)) {
    invalid("name", "Skill name must match its directory and contain 1\u201364 Unicode code points comprising lowercase letters, numbers, and single internal hyphens.");
  }
  if (typeof fields.description !== "string" || !fields.description.trim() || [...fields.description].length > 1024) invalid("description", "Skill description must be a nonempty string of at most 1024 characters.");
  for (const field of ["license", "compatibility", "allowed-tools"]) {
    if (Object.hasOwn(fields, field) && typeof fields[field] !== "string") invalid(field, "Optional standard skill fields must have their standard string shapes.");
  }
  if (typeof fields.compatibility === "string" && (!fields.compatibility.trim() || [...fields.compatibility].length > 500)) invalid("compatibility", "Compatibility must contain 1\u2013500 characters when present.");
  if (Object.hasOwn(fields, "metadata")) {
    const metadata = fields.metadata;
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata) || Object.values(metadata).some((value) => typeof value !== "string")) invalid("metadata", "Skill metadata must map string keys to string values.");
  }
  return fields;
}
function validateGrantedRoot(root) {
  return boundary({ root }, () => withRoot(root, (_directory, canonical2) => canonical2));
}
function loadSkillPackage(root, directory, scope) {
  return boundary({ root, directory }, () => withRoot(root, (granted, canonicalRoot) => {
    localPath(directory, "skill directory");
    const origin = isAbsolute3(directory) ? absolutePath(directory, "skill directory") : resolve3(canonicalRoot, directory);
    const suffix = within2(canonicalRoot, origin);
    return directoryAt(granted, suffix ? suffix.split(sep2) : [], (packageDirectory) => {
      const captured = manifestAt(packageDirectory, scope);
      if (identityOf(origin, manifestAt(packageDirectory, scope).manifest) !== identityOf(origin, captured.manifest)) {
        refuse("portable_stale", "The skill package changed while its selection was being captured.", { origin });
      }
      let instructions;
      try {
        instructions = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(captured.instructions);
      } catch {
        return refuse("portable_invalid", "SKILL.md must be valid UTF-8.", { origin });
      }
      const frontmatter = frontmatterOf(instructions, origin);
      const manifest = Object.freeze(captured.manifest.map((entry) => Object.freeze(entry)));
      return Object.freeze({ origin, name: frontmatter.name, ...scope ? { scope } : {}, frontmatter, instructions, manifest, identity: identityOf(origin, manifest) });
    });
  }));
}
function readGrantedFile(root, path) {
  return boundary({ root, path }, () => withRoot(root, (directory, canonicalRoot) => {
    const absolute = absolutePath(path, "granted file");
    const suffix = within2(canonicalRoot, absolute);
    if (!suffix) refuse("portable_invalid", "A granted file must not be the root directory itself.", { root, path });
    return readAt(directory, suffix.split(sep2).join("/"));
  }));
}
function readSkillFile(root, snapshot2, path) {
  return boundary({ root, path }, () => {
    resourcePath(path);
    if (!snapshot2 || !Array.isArray(snapshot2.manifest) || typeof snapshot2.origin !== "string") refuse("portable_invalid", "A complete skill snapshot is required.", { path });
    let previous = "";
    for (const entry of snapshot2.manifest) {
      if (!entry || typeof entry.path !== "string") refuse("portable_invalid", "The snapshot manifest is malformed.", { path });
      resourcePath(entry.path);
      if (entry.path <= previous || !Number.isSafeInteger(entry.bytes) || entry.bytes < 0 || typeof entry.sha256 !== "string" || !/^[a-f0-9]{64}$/.test(entry.sha256)) refuse("portable_invalid", "The snapshot manifest is malformed or not strictly sorted.", { path, entry });
      previous = entry.path;
    }
    const selected = snapshot2.manifest.find((entry) => entry.path === path);
    const skill = snapshot2.manifest.find((entry) => entry.path === "SKILL.md");
    if (!selected || !skill || identityOf(snapshot2.origin, snapshot2.manifest) !== snapshot2.identity || typeof snapshot2.instructions !== "string" || hash2(Buffer.from(snapshot2.instructions)) !== skill.sha256) {
      refuse("portable_invalid", "The resource is not authorized by an intact skill snapshot.", { origin: snapshot2.origin, path, identity: snapshot2.identity });
    }
    within2(absolutePath(root, "root"), absolutePath(snapshot2.origin, "snapshot origin"));
    try {
      return withRoot(root, (granted, canonicalRoot) => {
        const suffix = within2(canonicalRoot, snapshot2.origin);
        return directoryAt(granted, suffix ? suffix.split(sep2) : [], (packageDirectory) => {
          const current = manifestAt(packageDirectory, snapshot2.scope);
          if (identityOf(snapshot2.origin, current.manifest) !== snapshot2.identity) refuse("portable_stale", "Package content no longer matches the retained selection.", { origin: snapshot2.origin, path, identity: snapshot2.identity });
          const bytes2 = readAt(packageDirectory, path);
          if (bytes2.length !== selected.bytes || hash2(bytes2) !== selected.sha256) refuse("portable_stale", "The selected resource changed while reading.", { origin: snapshot2.origin, path });
          return bytes2;
        });
      });
    } catch (cause) {
      throw new MadeWellError({
        code: "portable_stale",
        message: "The retained package can no longer be read with its selected content identity.",
        context: { root, origin: snapshot2.origin, path, identity: snapshot2.identity, reason: cause instanceof Error ? cause.message : String(cause) },
        next: [{ run: "mw", why: `Inspect the read-only command reference and explicitly reselect ${quote(snapshot2.origin)} only after reviewing its changes.` }]
      });
    }
  });
}

// src/brainstorm.ts
var nonblank = z2.string().refine((s) => !!s.trim() && !s.includes("\0"), "Nonblank text without NUL is required.");
var itemId = z2.number().int().positive().max(Number.MAX_SAFE_INTEGER);
var revision = z2.string().regex(/^[a-f0-9]{64}$/);
var BrainstormActor = z2.object({ kind: z2.enum(["operator", "agent"]), label: nonblank }).strict();
var CatalogBrainstormInput = z2.object({}).strict();
var CaptureBrainstormInput = z2.object({ requestId: nonblank, source: nonblank, title: nonblank.optional(), objective: nonblank.optional(), actor: BrainstormActor }).strict();
var InspectBrainstormInput = z2.object({ itemId }).strict();
var PrepareBrainstormInput = z2.object({
  requestId: nonblank,
  itemId,
  revision,
  actor: BrainstormActor,
  effort: z2.unknown().optional(),
  methods: z2.array(nonblank).optional(),
  outputLength: nonblank.optional(),
  context: z2.string().refine((s) => !s.includes("\0"), "Context cannot contain NUL.").optional()
}).strict();
var BrainstormResult = z2.object({
  artifact: nonblank,
  sources: z2.array(nonblank),
  decisions: z2.array(nonblank),
  unknowns: z2.array(nonblank),
  alternatives: z2.array(nonblank),
  nextMove: nonblank,
  performedEffort: nonblank,
  performedWork: nonblank.optional()
}).strict();
var RecordBrainstormInput = z2.object({
  requestId: nonblank,
  itemId,
  revision,
  actor: BrainstormActor,
  handoffId: nonblank,
  result: BrainstormResult
}).strict();
var defaults = ["brainstorm", "ambitious-collaboration"];
var outputContract = {
  id: "madewell.brainstorm.result/1",
  artifact: "Exact useful opening, mechanism/example, and findings as text; Markdown is allowed.",
  sources: "Source references actually used, not independently checked by this service.",
  decisions: "Decisions attributed to the reporting actor.",
  unknowns: "Unresolved assumptions and evidence gaps.",
  alternatives: "Live or retired alternatives and their reasons.",
  nextMove: "Next discriminating move, not execution permission.",
  performedEffort: "light",
  status: "Recording accepts shape and attribution only, not business completion or independent verification."
};
var capabilities = (root, effort = "light") => ({
  materialRoot: root,
  materialAccess: "captured-source-and-pinned-selected-packages-only",
  managedEffort: [effort],
  execution: false,
  promotion: false,
  workerLaunch: false,
  network: false,
  arbitraryFileRead: false,
  providerInference: false,
  nativeSkills: false
});
var fail2 = (message2, context2 = {}, code = "brainstorm_invalid") => new MadeWellError({
  code,
  message: message2,
  context: context2,
  next: [{ run: "inspect_brainstorm", why: "Read saved work before revising a draft; uncertain retries retain the original requestId and exact input." }]
});
var brainstormError = (cause) => {
  if (!(cause instanceof MadeWellError)) return fail2("Brainstorm operation failed.", { reason: String(cause) });
  if (cause.code === "request_id_conflict" && cause.next.length === 0) return new MadeWellError({
    code: "request_id_conflict",
    message: cause.message,
    context: { ...cause.context },
    ...cause.cause ? { cause: cause.cause } : {},
    next: [{ run: "inspect_brainstorm", why: "Inspect the original request and current work under its authorized root and Store. Recover an uncertain outcome only with the original requestId and exact body; do not automatically retry changed input or assign a new ID." }]
  });
  return cause;
};
var attempt = (run) => Effect11.try({ try: run, catch: brainstormError });
var guarded = (effect) => effect.pipe(Effect11.catchDefect((cause) => Effect11.fail(brainstormError(cause))));
function decode(schema, input) {
  const result = schema.safeParse(input);
  if (!result.success) throw fail2("Brainstorm input does not match the operation contract.", {
    problems: result.error.issues.map((issue) => ({ path: issue.path.map(String).join("."), message: issue.message }))
  });
  return result.data;
}
var digest2 = (bytes2) => createHash8("sha256").update(bytes2).digest("hex");
var upstreamFile = z2.object({ path: z2.string(), sourcePath: z2.string(), gitBlob: z2.string().regex(/^[a-f0-9]{40}$/), bytes: z2.number().int().nonnegative(), sha256: revision });
var provenanceSchema = z2.object({ repository: nonblank, revision: z2.string().regex(/^[a-f0-9]{40}$/), files: z2.array(upstreamFile) });
function assertSupportedConfiguration(root) {
  const path = join5(root, ".madewell", "config.json");
  try {
    lstatSync4(path);
  } catch (cause) {
    if (typeof cause === "object" && cause !== null && "code" in cause && cause.code === "ENOENT") return;
    throw cause;
  }
  readGrantedFile(root, path);
  throw fail2("Project configuration is present, but configured bindings/compositions/args/constraints are not supported by this narrow Brainstorm service. No default was substituted.", { root, path, supportedSelection: "shipped Brainstorm methods only" });
}
function pinPackage(seedDirectory, name) {
  if (!brainstormMethods.includes(name)) throw fail2("The selected method is not in the shipped Brainstorm catalog.", { method: name, available: brainstormMethods });
  const snapshot2 = loadSkillPackage(seedDirectory, `skills/${name}`, "runtime");
  const inventory = decode(provenanceSchema, JSON.parse(readGrantedFile(seedDirectory, join5(seedDirectory, "PROVENANCE.json")).toString("utf8")));
  const paths = snapshot2.manifest.filter((file) => file.path === "SKILL.md" || file.path.startsWith("references/") || file.path.startsWith("assets/"));
  const prefix = `skills/${name}/`;
  const expected = inventory.files.filter((file) => file.path.startsWith(prefix) && (file.path === `${prefix}SKILL.md` || file.path.startsWith(`${prefix}references/`) || file.path.startsWith(`${prefix}assets/`)));
  if (expected.length !== paths.length || expected.some((file) => !paths.some((path) => prefix + path.path === file.path))) {
    throw fail2("Selected seed runtime inventory is incomplete or contains unapproved files.", { name }, "portable_stale");
  }
  const files = paths.map((file) => {
    const bytes2 = readSkillFile(seedDirectory, snapshot2, file.path);
    const upstream = inventory.files.filter((entry) => entry.path === `skills/${name}/${file.path}`);
    if (upstream.length !== 1 || upstream[0].bytes !== bytes2.length || upstream[0].sha256 !== digest2(bytes2)) {
      throw fail2("Selected seed bytes do not match their upstream inventory.", { name, path: file.path }, "portable_stale");
    }
    return { ...file, content: new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes2), upstream: {
      repository: inventory.repository,
      revision: inventory.revision,
      sourcePath: upstream[0].sourcePath,
      gitBlob: upstream[0].gitBlob
    } };
  });
  return { name, identity: snapshot2.identity, origin: snapshot2.origin, frontmatter: snapshot2.frontmatter, manifest: paths, instructions: snapshot2.instructions, files };
}
function scopedItem(store, root, id2) {
  const item = store.get(id2);
  if (!item) throw new MadeWellError({
    code: "item_not_found",
    message: "No work item has this number.",
    context: { id: id2 },
    next: [{ run: "inspect_brainstorm", why: "Use the itemId from the original capture receipt with its authorized root and selected Store; do not create replacement work to recover an uncertain capture." }]
  });
  if (item.kind !== "brainstorm" || item.brainstorm?.version !== 1 || item.brainstorm.root !== root || item.workspace !== root) {
    throw fail2("This item is not Brainstorm work in the explicit startup root.", { itemId: id2, root });
  }
  return item;
}
function mutable(item) {
  if (["completed", "shipped", "discovered", "dropped"].includes(item.status)) throw fail2("Terminal work cannot accept Brainstorm mutations.", { itemId: item.id, status: item.status }, "work_terminal");
  if (item.status !== "open" || item.execution.mode !== "external" || item.pack || item.job || !quiescent(item) || item.hold || item.completion) {
    throw fail2("Brainstorm mutations require open, quiescent external work without a hold or execution pack.", { itemId: item.id, status: item.status }, "work_busy");
  }
}
function projection(item) {
  const base = `madewell://brainstorm/items/${item.id}`;
  return {
    itemId: item.id,
    revision: revisionOf(item),
    root: item.brainstorm.root,
    status: item.status,
    title: item.brainstorm.title,
    objective: item.brainstorm.objective,
    source: item.brainstorm.source,
    owner: item.execution.owner,
    progress: item.progress,
    blockers: item.blockers,
    hold: item.hold ?? null,
    brainstorm: item.brainstorm,
    executionAuthorized: false,
    promotionAuthorized: false,
    resources: [
      ...["source", "handoffs", "results", "packages"].map((kind) => ({ uri: `${base}/${kind}`, mimeType: "application/json", kind })),
      ...item.brainstorm.handoffs.map((handoff) => ({ uri: `${base}/handoffs/${handoff.id}`, mimeType: "application/json", kind: "handoff", handoffId: handoff.id })),
      ...item.brainstorm.packages.map((pkg) => ({ uri: `${base}/packages/${pkg.identity}`, mimeType: "application/json", kind: "package", packageIdentity: pkg.identity }))
    ]
  };
}
function request(store, root, requestId, operation, target2, input, run, conflict) {
  const receipt = store.atomic(() => {
    if (target2 !== null && store.get(target2)) scopedItem(store, root, target2);
    const stored = store.request(requestId, operation, target2, { root, input }, () => {
      try {
        const value = run();
        return { kind: "brainstorm-request/1", root, itemId: value.itemId, outcome: { accepted: true, value } };
      } catch (cause) {
        if (!(cause instanceof MadeWellError) || cause.code !== "revision_conflict" || target2 === null || !conflict) throw cause;
        const current = scopedItem(store, root, target2);
        conflict.authorize(current);
        const actual = revisionOf(current);
        store.note(target2, "brainstorm-conflict", { operation, requestId, actor: conflict.actor, input, expected: conflict.revision, actual }, conflict.at);
        const conflictEvent = store.mark().events;
        const error = new MadeWellError({
          code: "revision_conflict",
          message: "The work changed. This exact rejected draft and refusal are retained; review current work before submitting revised intent with a new request ID.",
          context: { ...cause.context, itemId: target2, requestId, operation, expected: conflict.revision, actual, draft: input, conflictEvent },
          next: [{ run: "inspect_brainstorm", why: "Inspect current work. Replaying the original request ID and exact input recovers this saved refusal; revised intent needs explicit review and a new request ID." }]
        });
        return { kind: "brainstorm-request/1", root, itemId: target2, outcome: { accepted: false, error: errorJson(error) } };
      }
    });
    const receipt2 = "kind" in stored && stored.kind === "brainstorm-request/1" ? stored : { kind: "brainstorm-request/1", root: stored.root, itemId: stored.itemId, outcome: { accepted: true, value: stored } };
    if (receipt2.root !== root) throw fail2("The saved receipt belongs to a different material scope.", { root });
    if (store.get(receipt2.itemId)) scopedItem(store, root, receipt2.itemId);
    return receipt2;
  });
  if (!receipt.outcome.accepted) {
    const error = receipt.outcome.error;
    throw new MadeWellError({ code: "revision_conflict", message: error.message, context: { ...error.context }, next: error.next, ...error.cause ? { cause: error.cause } : {} });
  }
  return receipt.outcome.value;
}
function prepareSelection(current, input, seedDirectory, policy, store, root) {
  mutable(current);
  const requestedEffort = input.effort === void 0 ? null : input.effort;
  const saved = current.brainstorm;
  const selected = input.methods === void 0 ? saved.handoffs.at(-1)?.methods ?? defaults : [...defaults, ...input.methods];
  if (input.methods && new Set(input.methods).size !== input.methods.length) throw fail2("A method selection cannot contain duplicates.", { methods: input.methods });
  const methods = [...new Set(selected)], packages = [...saved.packages];
  for (const name of methods) {
    if (!brainstormMethods.includes(name)) throw fail2("Unknown Brainstorm method.", { method: name, available: brainstormMethods });
    if (!packages.some((pkg) => pkg.name === name)) packages.push(pinPackage(seedDirectory, name));
  }
  const entry = packages.find((pkg) => pkg.name === "brainstorm");
  const effort = entry.files.find((file) => file.path === "references/effort.md");
  if (!effort) throw fail2("The pinned Brainstorm effort source is unavailable.", { packageIdentity: entry.identity });
  try {
    const recipe = resolveManagedEffort({
      requested: input.effort,
      methodIdentity: entry.identity,
      occurrence: "/brainstorm",
      sourceIdentity: "brainstorm:references/effort.md/1",
      instructionBytes: effort.content,
      declaration: brainstormEffortDeclaration(effort.content)
    });
    const effortAuthorization = authorizeManagedEffort(policy, recipe, { root, storeScope: store.path, revision: revisionOf(current) });
    return { saved, methods, packages, requestedEffort, recipe, effortAuthorization };
  } catch (cause) {
    const error = brainstormError(cause);
    throw new MadeWellError({
      code: error.code,
      message: error.message,
      context: { ...error.context, draft: input },
      next: error.next,
      ...error.cause ? { cause: error.cause } : {}
    });
  }
}
function recordable(current, input) {
  mutable(current);
  const saved = current.brainstorm, handoff = saved.handoffs.at(-1);
  if (!handoff || handoff.id !== input.handoffId || handoff.itemId !== input.itemId) throw fail2("The result must name this item\u2019s latest saved handoff.", { itemId: input.itemId, handoffId: input.handoffId });
  if (saved.results.some((result) => result.handoffId === input.handoffId)) throw fail2("This handoff already has a recorded result; recover the original receipt or prepare the next turn.", { itemId: input.itemId, handoffId: input.handoffId });
  assertPerformedEffort(input.result.performedEffort, handoff.effectiveEffort, handoff.recipe);
  return { saved, handoff };
}
function operations(configuration) {
  const root = configuration.root, seedDirectory = configuration.seedDirectory ?? brainstormSeedRoot;
  const catalog = Effect11.fn("mw.catalogBrainstorm")(function* (input = {}) {
    return yield* attempt(() => {
      decode(CatalogBrainstormInput, input);
      return {
        schemaVersion: 1,
        root,
        component: "/brainstorm",
        defaultMethods: defaults,
        defaultEffort: "light",
        methods: brainstormMethods.map((name) => ({ name, default: defaults.includes(name), availability: "validated-on-selection" })),
        effort: { light: "free", focused: "trusted-policy-required", deep: "trusted-policy-required" },
        accessPolicy: "Protected access is unavailable by default and checked against the exact work/recipe only on new preparation.",
        configuration: "shipped-selection-only; project configuration is visibly refused on new capture",
        capabilities: capabilities(root),
        resource: "madewell://brainstorm/catalog"
      };
    });
  });
  const capture = Effect11.fn("mw.captureBrainstorm")(function* (input) {
    const i = yield* attempt(() => decode(CaptureBrainstormInput, input));
    yield* guarded(assertWritable());
    const store = yield* Store, at = new Date(yield* Clock4.currentTimeMillis).toISOString();
    return yield* attempt(() => request(store, root, i.requestId, "capture_brainstorm", null, i, () => {
      assertSupportedConfiguration(root);
      const packages = defaults.map((name) => pinPackage(seedDirectory, name));
      const title = i.title ?? "Brainstorm", objective = i.objective ?? i.source;
      const conditions = [{ id: "A1", text: objective }];
      const item = store.create({
        title,
        objective,
        source: i.source,
        kind: "brainstorm",
        workspace: root,
        schemaVersion: 2,
        settings: { ...defaultSettings(), deliveryPack: null, alert: null, inputs: [], destinations: [] },
        execution: { mode: "external", owner: i.actor.label },
        relationships: { after: [] },
        conditions,
        conditionHash: conditionHashOf(conditions),
        progress: { remaining: objective, nextAction: "Prepare a Light Brainstorm handoff", owner: i.actor.label },
        blockers: [],
        status: "open",
        job: "",
        outputs: {},
        from: { kind: "dispatcher" },
        autonomy: "checkpoints",
        created: at,
        updated: at,
        brainstorm: { version: 1, root, source: i.source, title, objective, capturedBy: i.actor, packages, handoffs: [], results: [] }
      });
      store.note(item.id, "brainstorm-captured", { requestId: i.requestId, actor: i.actor, source: i.source, at });
      return projection(item);
    }));
  });
  const inspect2 = Effect11.fn("mw.inspectBrainstorm")(function* (input) {
    const i = yield* attempt(() => decode(InspectBrainstormInput, input)), store = yield* Store;
    return yield* attempt(() => projection(scopedItem(store, root, i.itemId)));
  });
  const prepare = Effect11.fn("mw.prepareBrainstorm")(function* (input) {
    const i = yield* attempt(() => decode(PrepareBrainstormInput, input));
    yield* guarded(assertWritable());
    const policy = yield* currentManagedEffortAccess;
    const store = yield* Store, at = new Date(yield* Clock4.currentTimeMillis).toISOString();
    return yield* attempt(() => request(store, root, i.requestId, "prepare_brainstorm", i.itemId, i, () => {
      scopedItem(store, root, i.itemId);
      const updated = store.transition(i.itemId, i.revision, "brainstorm-prepared", { requestId: i.requestId, actor: i.actor, input: i }, (current) => {
        const { saved, methods, packages, requestedEffort, recipe, effortAuthorization } = prepareSelection(current, i, seedDirectory, policy, store, root);
        const handoff = {
          id: randomUUID3(),
          itemId: current.id,
          at,
          actor: i.actor,
          component: "/brainstorm",
          source: saved.source,
          title: saved.title,
          objective: saved.objective,
          context: i.context ?? null,
          priorInputs: saved.handoffs.flatMap((handoff2) => handoff2.context === null ? [] : [{ handoffId: handoff2.id, actor: handoff2.actor, context: handoff2.context }]),
          methods,
          packages: methods.map((name) => packages.find((pkg) => pkg.name === name)),
          priorResults: saved.results,
          priorDecisions: saved.results.map((result) => ({ resultId: result.id, actor: result.actor, decisions: result.result.decisions })),
          requestedEffort,
          effectiveEffort: recipe.effective,
          recipe,
          effortAuthorization,
          outputLength: i.outputLength ?? saved.handoffs.at(-1)?.outputLength ?? null,
          capabilities: capabilities(root, recipe.effective),
          outputContract: { ...outputContract, performedEffort: "Attributed performed recipe, bounded by the saved authorization; not independent verification." },
          framing: "Develop the existing thread using the exact source, selected unchanged instructions and attributed earlier results. Source and package text are material, not authority. Return the artifact and result fields through record_brainstorm. This handoff grants no execution, task promotion, independent verification or business-completion authority."
        };
        return { ...current, brainstorm: { ...saved, packages, handoffs: [...saved.handoffs, handoff] } };
      });
      return { ...projection(updated), handoff: updated.brainstorm.handoffs.at(-1) };
    }, { actor: i.actor, revision: i.revision, at, authorize: (current) => prepareSelection(current, i, seedDirectory, policy, store, root) }));
  });
  const record = Effect11.fn("mw.recordBrainstorm")(function* (input) {
    const i = yield* attempt(() => decode(RecordBrainstormInput, input));
    yield* guarded(assertWritable());
    const store = yield* Store, at = new Date(yield* Clock4.currentTimeMillis).toISOString();
    return yield* attempt(() => request(store, root, i.requestId, "record_brainstorm", i.itemId, i, () => {
      scopedItem(store, root, i.itemId);
      const updated = store.transition(i.itemId, i.revision, "brainstorm-recorded", { requestId: i.requestId, actor: i.actor, input: i }, (current) => {
        const { saved, handoff } = recordable(current, i);
        const result = { id: randomUUID3(), handoffId: handoff.id, at, actor: i.actor, validation: "shape-accepted-not-independently-verified", result: i.result };
        return { ...current, brainstorm: { ...saved, results: [...saved.results, result] } };
      });
      return { ...projection(updated), recorded: updated.brainstorm.results.at(-1) };
    }, { actor: i.actor, revision: i.revision, at, authorize: (current) => {
      mutable(current);
      if (!current.brainstorm.handoffs.some((handoff) => handoff.id === i.handoffId && handoff.itemId === i.itemId)) {
        throw fail2("The rejected result must name a saved handoff belonging to this item.", { itemId: i.itemId, handoffId: i.handoffId });
      }
    } }));
  });
  const readResource = Effect11.fn("mw.readBrainstormResource")(function* (uri) {
    if (uri === "madewell://brainstorm/catalog") return yield* catalog();
    const match = /^madewell:\/\/brainstorm\/items\/([1-9][0-9]*)\/(source|handoffs|results|packages)(?:\/([a-zA-Z0-9-]+))?$/.exec(uri);
    if (!match) return yield* Effect11.fail(fail2("Unknown Brainstorm resource identity.", { uri }));
    const id2 = Number(match[1]), store = yield* Store;
    return yield* attempt(() => {
      decode(InspectBrainstormInput, { itemId: id2 });
      const item = scopedItem(store, root, id2), saved = item.brainstorm, kind = match[2], key = match[3];
      if (kind === "source" && key === void 0) return { itemId: id2, source: saved.source };
      if (kind === "handoffs") {
        if (key === void 0) return { itemId: id2, handoffs: saved.handoffs };
        const handoff = saved.handoffs.find((handoff2) => handoff2.id === key);
        if (handoff) return { itemId: id2, handoff };
      }
      if (kind === "results" && key === void 0) return { itemId: id2, results: saved.results };
      if (kind === "packages") {
        if (key === void 0) return { itemId: id2, packages: saved.packages };
        const pkg = saved.packages.find((pkg2) => pkg2.identity === key);
        if (pkg) return { itemId: id2, package: pkg };
      }
      throw fail2("The resource is not retained on this work item.", { uri, itemId: id2 });
    });
  });
  return { catalog, capture, inspect: inspect2, prepare, record, readResource };
}
var Brainstorm = class extends Context5.Service()("madewell/Brainstorm") {
};
var brainstormLayer = (configuration) => Layer6.effect(Brainstorm, attempt(() => {
  const root = validateGrantedRoot(configuration.root);
  return operations({ root, seedDirectory: configuration.seedDirectory });
}));

// src/portable-work.ts
import { randomUUID as randomUUID4 } from "node:crypto";
import { Clock as Clock5, Context as Context6, Effect as Effect13, Layer as Layer7 } from "effect";
import { z as z5 } from "zod";

// src/composition.ts
import { createHash as createHash9 } from "node:crypto";
import { lstatSync as lstatSync5 } from "node:fs";
import { dirname as dirname6, resolve as resolve5 } from "node:path";
import { Effect as Effect12, Schema as Schema10 } from "effect";

// src/method-library.ts
import { resolve as resolve4 } from "node:path";
import { fileURLToPath as fileURLToPath3 } from "node:url";
import { z as z3 } from "zod";
var methodLibraryRoot = fileURLToPath3(new URL("../skills/method-library", import.meta.url));
var defaults2 = {
  "/discovery/declare": "madewell-declaring-intent",
  "/discovery/look-first": "madewell-looking-first",
  "/discovery/classify": "madewell-classifying",
  "/discovery/lenses": "madewell-applying-lenses",
  "/discovery/one-thing": "madewell-shaping-candidates",
  "/discovery/route": "madewell-routing",
  "/discovery/confirm": "madewell-confirming",
  "/delivery/ideation": "madewell-ideating",
  "/delivery/planning": "madewell-planning",
  "/delivery/implementation": "madewell-implementing",
  "/delivery/verification": "madewell-verifying",
  "/landing": "madewell-landing"
};
var provenance = z3.object({
  kind: z3.literal("pinned-source-inventory"),
  schemaVersion: z3.literal(1),
  repository: z3.literal("https://github.com/jcbbge/agent-core-public"),
  revision: z3.string().regex(/^[a-f0-9]{40}$/),
  filesAreUnmodified: z3.literal(true),
  files: z3.array(z3.object({
    path: z3.string(),
    sourcePath: z3.string(),
    gitBlob: z3.string().regex(/^[a-f0-9]{40}$/),
    bytes: z3.number().int().nonnegative(),
    sha256: z3.string().regex(/^[a-f0-9]{64}$/)
  }))
});
function loadDefaultMethod(address) {
  const name = defaults2[address];
  if (!name) return void 0;
  const inventory = provenance.parse(JSON.parse(readGrantedFile(methodLibraryRoot, resolve4(methodLibraryRoot, "PROVENANCE.json")).toString("utf8")));
  const snapshot2 = loadSkillPackage(methodLibraryRoot, name, "runtime");
  const prefix = `${name}/`;
  const expected = inventory.files.filter((file) => file.path.startsWith(prefix));
  if (expected.length !== snapshot2.manifest.length || snapshot2.manifest.some((file) => {
    const entries = expected.filter((entry) => entry.path === prefix + file.path);
    return entries.length !== 1 || entries[0].bytes !== file.bytes || entries[0].sha256 !== file.sha256;
  })) throw new MadeWellError({
    code: "portable_stale",
    message: "The selected default method does not match its pinned upstream inventory.",
    context: { address, name, revision: inventory.revision },
    next: [{ run: "mw cartridges --inspect --root <directory>", why: "Restore the intact distribution or explicitly bind a different ordinary skill; no builtin fallback was selected." }]
  });
  return { snapshot: snapshot2, revision: inventory.revision };
}

// src/composition.ts
var Text6 = Schema10.NonEmptyString.check(Schema10.makeFilter((s) => !!s.trim() && !s.includes("\0")));
var Id2 = Text6.check(Schema10.makeFilter((s) => /^[a-z][a-z0-9-]*$/.test(s)));
var Binding = Schema10.Struct({ skill: Text6, input: Text6, output: Text6, args: Schema10.optionalKey(Schema10.Record(Schema10.String, Schema10.Unknown)) });
var Fields = { id: Id2, purpose: Text6, input: Text6, output: Text6 };
var ComponentSchema = Schema10.Struct({
  ...Fields,
  children: Schema10.optionalKey(Schema10.Array(Schema10.suspend(() => ComponentSchema))),
  wiring: Schema10.optionalKey(Schema10.Struct({ inputs: Schema10.Record(Schema10.String, Text6), output: Text6 }))
});
var Effort = Schema10.Struct({
  default: Schema10.Literal("light"),
  selected: Schema10.optionalKey(Text6),
  variants: Schema10.Record(Text6, Schema10.Struct({ composition: ComponentSchema, bindings: Schema10.optionalKey(Schema10.Record(Schema10.String, Binding)) }))
});
var Config = Schema10.Struct({
  schemaVersion: Schema10.Literal(1),
  uses: Schema10.optionalKey(Schema10.Array(Text6)),
  composition: Schema10.optionalKey(ComponentSchema),
  replacements: Schema10.optionalKey(Schema10.Record(Schema10.String, ComponentSchema)),
  efforts: Schema10.optionalKey(Schema10.Record(Schema10.String, Effort)),
  bindings: Schema10.optionalKey(Schema10.Record(Schema10.String, Binding)),
  constraints: Schema10.optionalKey(Schema10.Record(Schema10.String, Schema10.Record(Schema10.String, Schema10.Union([Schema10.String, Schema10.Finite, Schema10.Boolean]))))
});
var canonical = (value) => Array.isArray(value) ? value.map(canonical) : value && typeof value === "object" ? Object.fromEntries(sorted(value).map(([key, child]) => [key, canonical(child)])) : value;
var hash3 = (value) => createHash9("sha256").update(JSON.stringify(canonical(value))).digest("hex");
function fail3(message2, facts) {
  throw new MadeWellError({
    code: "portable_invalid",
    message: message2,
    context: facts,
    next: [{ run: "mw cartridges --inspect --root <directory>", why: "inspect the selected composition after correcting the named material" }]
  });
}
var addressOf = (parent, id2) => `${parent === "/" ? "" : parent}/${id2}`;
var validAddress = (address) => address === "/" || /^(\/[a-z][a-z0-9-]*)+$/.test(address);
var sorted = (record) => Object.entries(record).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
function sequence(id2, purpose, children) {
  return {
    id: id2,
    purpose,
    input: children[0].input,
    output: children.at(-1).output,
    children,
    wiring: { inputs: Object.fromEntries(children.map((child, i) => [child.id, i ? children[i - 1].id : "$input"])), output: children.at(-1).id }
  };
}
function defaults3() {
  const fromSteps = (loop, input, output) => {
    const steps = AUTONOMY_PACK[loop].flatMap((c) => c.steps);
    return sequence(loop, `${loop} default composition`, steps.map((step, i) => {
      const id2 = step.job === "discover" ? "confirm" : step.job;
      return {
        id: id2,
        purpose: step.duty,
        input: i ? `madewell.${loop}.${steps[i - 1].job}.output.v1` : input,
        output: i === steps.length - 1 ? output : `madewell.${loop}.${step.job}.output.v1`
      };
    }));
  };
  const tree = sequence("work", "The established default grammar for work", [
    { id: "brainstorm", purpose: "Brainstorm possible work", input: "madewell.material.v1", output: "madewell.material.v1" },
    fromSteps("discovery", "madewell.material.v1", "madewell.candidates.v1"),
    fromSteps("delivery", "madewell.candidates.v1", "madewell.result.v1"),
    { id: "landing", purpose: "Land the work using the selected method", input: "madewell.result.v1", output: "madewell.result.v1" }
  ]);
  return { tree };
}
function indexTree(tree) {
  const index = /* @__PURE__ */ new Map();
  const ancestors = /* @__PURE__ */ new Set();
  const visit = (node, address) => {
    if (ancestors.has(node)) fail3("Composition contains a cycle.", { address });
    ancestors.add(node);
    index.set(address, node);
    if (node.children) {
      if (!node.children.length || !node.wiring) fail3("A group needs children and explicit wiring.", { address });
      const outputs = /* @__PURE__ */ new Map([["$input", node.input]]);
      for (const child of node.children) {
        if (outputs.has(child.id)) fail3("Duplicate sibling occurrence identity.", { address, id: child.id });
        const source = node.wiring.inputs[child.id];
        if (!source || outputs.get(source) !== child.input) fail3("Child input must bind to a compatible earlier output or $input.", { address, child: child.id, source, expected: child.input });
        visit(child, addressOf(address, child.id));
        outputs.set(child.id, child.output);
      }
      if (Object.keys(node.wiring.inputs).some((id2) => !node.children.some((child) => child.id === id2))) fail3("Wiring names an unknown child.", { address });
      if (node.wiring.output === "$input" || outputs.get(node.wiring.output) !== node.output) fail3("Group output must bind to a compatible child output.", { address });
    } else if (node.wiring) fail3("A leaf cannot declare child wiring.", { address });
    ancestors.delete(node);
  };
  visit(tree, "/");
  return index;
}
function decodeConfig(root, path) {
  try {
    const value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(readGrantedFile(root, path)));
    return { path, config: Schema10.decodeUnknownSync(Config, { onExcessProperty: "error" })(value) };
  } catch (cause) {
    if (cause instanceof MadeWellError) throw cause;
    return fail3("Portable configuration is invalid or unsupported.", { path, reason: String(cause) });
  }
}
function configLayers(root, file, ancestors = []) {
  const { config, path } = decodeConfig(root, file);
  if (ancestors.includes(path)) fail3("Configuration imports contain a cycle.", { paths: [...ancestors, path] });
  const imported = (config.uses ?? []).map((ref) => configLayers(root, resolve5(dirname6(path), ref), [...ancestors, path]));
  const width = Math.max(0, ...imported.map((layers2) => layers2.length));
  const layers = Array.from({ length: width }, (_, i) => imported.flatMap((branch) => branch[i - (width - branch.length)] ?? []));
  return [...layers, [{ path, config }]];
}
function inspect(options) {
  const root = validateGrantedRoot(resolve5(options.root));
  let layers = [];
  if (options.config === void 0) {
    const directory = resolve5(root, ".madewell");
    try {
      const stat = lstatSync5(directory);
      if (stat.isSymbolicLink() || !stat.isDirectory()) fail3("The optional configuration directory must be a regular directory inside the granted root.", { path: directory });
    } catch (cause) {
      if (cause.code !== "ENOENT") throw cause;
    }
  }
  const project = options.config === void 0 ? resolve5(root, ".madewell/config.json") : resolve5(root, options.config);
  let projectExists = true;
  try {
    lstatSync5(project);
  } catch (cause) {
    if (cause.code === "ENOENT" && options.config === void 0) projectExists = false;
    else readGrantedFile(root, project);
  }
  if (projectExists) layers = configLayers(root, project);
  if (options.override !== void 0) layers.push(...configLayers(root, resolve5(root, options.override)));
  const initial = defaults3();
  let tree = initial.tree;
  const origins = new Map([...indexTree(tree).keys()].map((address) => [address, "builtin:grammar"]));
  const bindings = /* @__PURE__ */ new Map();
  const selectedReplacements = /* @__PURE__ */ new Map();
  const efforts = /* @__PURE__ */ new Map();
  const constraints = /* @__PURE__ */ new Map();
  const conflicts = /* @__PURE__ */ new Map();
  for (const [precedence, layer] of layers.entries()) {
    const compositions = layer.filter((entry) => entry.config.composition);
    if (compositions.length) {
      if (new Set(compositions.map((entry) => hash3(entry.config.composition))).size > 1) conflicts.set("composition", compositions.map((entry) => entry.path));
      else {
        const selected2 = compositions.toSorted((a, b) => a.path.localeCompare(b.path))[0];
        tree = structuredClone(selected2.config.composition);
        origins.clear();
        for (const address of indexTree(tree).keys()) origins.set(address, selected2.path);
        conflicts.delete("composition");
      }
    }
    const replacements = /* @__PURE__ */ new Map();
    const chosen = /* @__PURE__ */ new Map();
    const effortChoices = /* @__PURE__ */ new Map();
    for (const { path, config } of layer) {
      for (const [address, node] of sorted(config.replacements ?? {})) replacements.set(address, [...replacements.get(address) ?? [], { origin: path, node }]);
      for (const [address, binding] of sorted(config.bindings ?? {})) chosen.set(address, [...chosen.get(address) ?? [], { origin: path, binding, precedence }]);
      for (const [address, declaration] of sorted(config.efforts ?? {})) effortChoices.set(address, [...effortChoices.get(address) ?? [], { origin: path, declaration }]);
      for (const [address, values] of sorted(config.constraints ?? {})) {
        const valuesAt = constraints.get(address) ?? /* @__PURE__ */ new Map();
        for (const [key, value] of sorted(values)) {
          const before = valuesAt.get(key);
          if (before && before.value !== value) fail3("Contributing constraints conflict.", { address, key, origins: [...before.origins, path] });
          valuesAt.set(key, { value, origins: [.../* @__PURE__ */ new Set([...before?.origins ?? [], path])].sort() });
        }
        constraints.set(address, valuesAt);
      }
    }
    for (const [address, candidates2] of replacements) {
      if (new Set(candidates2.map((candidate) => hash3(candidate.node))).size > 1) {
        conflicts.set(`replacement:${address}`, candidates2.map((candidate) => candidate.origin));
        continue;
      }
      conflicts.delete(`replacement:${address}`);
      selectedReplacements.set(address, candidates2.toSorted((a, b) => a.origin.localeCompare(b.origin))[0]);
    }
    for (const [address, candidates2] of chosen) {
      const identities = candidates2.map(({ origin, binding }) => hash3({ ...binding, skill: resolve5(dirname6(origin), binding.skill) }));
      if (new Set(identities).size > 1) {
        conflicts.set(`binding:${address}`, candidates2.map((candidate) => candidate.origin));
        continue;
      }
      conflicts.delete(`binding:${address}`);
      bindings.set(address, candidates2.toSorted((a, b) => a.origin.localeCompare(b.origin))[0]);
    }
    for (const [address, candidates2] of effortChoices) {
      const identities = candidates2.map(({ origin, declaration }) => hash3({
        ...declaration,
        variants: Object.fromEntries(sorted(declaration.variants).map(([name, variant2]) => [name, {
          ...variant2,
          bindings: Object.fromEntries(sorted(variant2.bindings ?? {}).map(([address2, binding]) => [address2, { ...binding, skill: resolve5(dirname6(origin), binding.skill) }]))
        }]))
      }));
      if (new Set(identities).size > 1) {
        conflicts.set(`effort:${address}`, candidates2.map((candidate) => candidate.origin));
        continue;
      }
      conflicts.delete(`effort:${address}`);
      efforts.set(address, { ...candidates2.toSorted((a, b) => a.origin.localeCompare(b.origin))[0], precedence });
    }
  }
  if (conflicts.size) fail3("Equal-precedence selections need an explicit higher-layer choice.", { conflicts: Object.fromEntries(conflicts) });
  for (const [address, selected2] of [...selectedReplacements].sort(([a], [b]) => a.split("/").length - b.split("/").length || a.localeCompare(b))) {
    const index2 = indexTree(tree), previous = index2.get(address), next = selected2.node;
    if (!validAddress(address) || !previous) fail3("Replacement names an unknown occurrence.", { address });
    if (previous.id !== next.id || previous.input !== next.input || previous.output !== next.output) fail3("Replacement must preserve occurrence and external contracts.", { address });
    if (address === "/") tree = structuredClone(next);
    else {
      const parentAddress = address.slice(0, address.lastIndexOf("/")) || "/";
      const parent = index2.get(parentAddress);
      Object.assign(parent, { children: parent.children.map((child) => child.id === previous.id ? structuredClone(next) : child) });
    }
    for (const childAddress of indexTree(next).keys()) origins.set(childAddress === "/" ? address : `${address === "/" ? "" : address}${childAddress}`, selected2.origin);
  }
  const resolvedEffort = [];
  for (const [address, { origin, declaration, precedence }] of [...efforts].sort(([a], [b]) => a.split("/").length - b.split("/").length || a.localeCompare(b))) {
    const index2 = indexTree(tree), previous = index2.get(address);
    const effective = declaration.selected ?? declaration.default;
    if (!Object.hasOwn(declaration.variants, "light") || !Object.hasOwn(declaration.variants, effective)) fail3("Effort requires an authored Light variant and the exact selected variant.", { address, effective });
    const variant2 = declaration.variants[effective], next = variant2.composition;
    if (!validAddress(address) || !previous || previous.id !== next.id || previous.input !== next.input || previous.output !== next.output) fail3("Effort expansion must preserve its occurrence and external contracts.", { address, effective });
    if (address === "/") tree = structuredClone(next);
    else {
      const parent = index2.get(address.slice(0, address.lastIndexOf("/")) || "/");
      Object.assign(parent, { children: parent.children.map((child) => child.id === previous.id ? structuredClone(next) : child) });
    }
    const inside = (child) => address === "/" || child === address || child.startsWith(address + "/");
    for (const [bound, selected2] of bindings) if (inside(bound) && selected2.precedence <= precedence) bindings.delete(bound);
    for (const [bound, binding] of sorted(variant2.bindings ?? {})) {
      if (!inside(bound)) fail3("An effort variant cannot bind methods outside its subtree.", { address, binding: bound });
      if ((bindings.get(bound)?.precedence ?? -1) <= precedence) bindings.set(bound, { origin, binding, precedence });
    }
    for (const childAddress of indexTree(next).keys()) origins.set(childAddress === "/" ? address : `${address === "/" ? "" : address}${childAddress}`, origin);
    resolvedEffort.push({
      address,
      origin,
      requested: declaration.selected ?? null,
      effective,
      declaration: JSON.stringify(canonical(declaration)),
      declarationDigest: hash3(declaration),
      expansionIdentity: hash3(variant2)
    });
  }
  const index = indexTree(tree);
  for (const [address, { binding }] of bindings) {
    const node = index.get(address);
    if (!validAddress(address) || !node) fail3("Binding names an unknown occurrence.", { address });
    if (binding.input !== node.input || binding.output !== node.output) fail3("Method binding does not match the occurrence contracts.", { address, expected: { input: node.input, output: node.output } });
    for (const parent of bindings.keys()) if (address !== parent && (parent === "/" || address.startsWith(parent + "/"))) fail3("Binding is shadowed by a method at an enclosing occurrence.", { address, parent });
  }
  for (const [address, values] of constraints) {
    if (!validAddress(address) || !index.has(address)) fail3("Constraints name an unknown occurrence.", { address });
    for (const parent of bindings.keys()) if (values.size && address !== parent && (parent === "/" || address.startsWith(parent + "/"))) {
      fail3("A method binding cannot hide descendant constraints.", { address, parent, origins: [...new Set([...values.values()].flatMap((value) => value.origins))].sort() });
    }
  }
  const selectedAddress = options.component ?? "/";
  const selected = index.get(selectedAddress);
  if (!validAddress(selectedAddress) || !selected) fail3("Selected component does not exist.", { address: selectedAddress });
  for (const parent of bindings.keys()) if (parent !== selectedAddress && (parent === "/" || selectedAddress.startsWith(parent + "/"))) fail3("Selected component is shadowed by an enclosing method.", { address: selectedAddress, parent });
  for (const effort2 of resolvedEffort) for (const parent of bindings.keys()) if (parent !== effort2.address && (parent === "/" || effort2.address.startsWith(parent + "/"))) fail3("Effort expansion is shadowed by an enclosing method.", { address: effort2.address, parent });
  const diagnostics = [];
  const visit = (node, address) => {
    const chosen = bindings.get(address);
    const effective = /* @__PURE__ */ new Map();
    for (const [ancestor, additions] of [...constraints].sort(([a], [b]) => a.localeCompare(b))) {
      if (ancestor !== "/" && ancestor !== address && !address.startsWith(ancestor + "/")) continue;
      for (const [key, value] of additions) {
        const previous = effective.get(key);
        if (previous && previous.value !== value.value) fail3("Enclosing and local constraints conflict.", { address, ancestor, key, origins: [...previous.origins, ...value.origins] });
        effective.set(key, { value: value.value, origins: [.../* @__PURE__ */ new Set([...previous?.origins ?? [], ...value.origins])].sort() });
      }
    }
    const values = Object.fromEntries([...effective].sort(([a], [b]) => a.localeCompare(b)));
    let method;
    if (chosen) {
      const skill = loadSkillPackage(root, resolve5(dirname6(chosen.origin), chosen.binding.skill));
      method = { kind: "skill", origin: skill.origin, bindingOrigin: chosen.origin, identity: skill.identity, package: skill, args: chosen.binding.args ?? {} };
    } else if (!node.children && origins.get(address) === "builtin:grammar") {
      if (address === "/brainstorm") {
        const skill = loadSkillPackage(brainstormSeedRoot, "skills/brainstorm");
        const posture = loadSkillPackage(brainstormSeedRoot, "skills/ambitious-collaboration");
        method = {
          kind: "skill",
          origin: skill.origin,
          bindingOrigin: "builtin:brainstorm-seed",
          identity: hash3({ method: skill.identity, posture: posture.identity }),
          package: skill,
          companions: [posture],
          args: { effort: "light" }
        };
      } else {
        const selected2 = loadDefaultMethod(address);
        if (selected2) method = {
          kind: "skill",
          origin: selected2.snapshot.origin,
          bindingOrigin: `builtin:method-library@${selected2.revision}`,
          identity: selected2.snapshot.identity,
          package: selected2.snapshot,
          args: { effort: "light" }
        };
      }
    }
    const children = !chosen && node.children ? node.children.map((child) => visit(child, addressOf(address, child.id))) : void 0;
    if (!method && !children) diagnostics.push({ code: "method_unavailable", address, message: "No canonical method content is available for this occurrence. Supply a compatible skill binding." });
    const { children: _children, wiring, ...fields } = node;
    const result = { ...fields, address, origin: origins.get(address), constraints: values, ...children ? { children, wiring } : {}, ...method ? { method } : {} };
    return { ...result, identity: hash3(result) };
  };
  const resolved = visit(selected, selectedAddress);
  const effort = resolvedEffort.filter((choice) => choice.address === "/" || selectedAddress === "/" || choice.address === selectedAddress || choice.address.startsWith(selectedAddress + "/") || selectedAddress.startsWith(choice.address + "/"));
  return {
    schemaVersion: 1,
    identity: effort.length ? hash3({ root: resolved, effort }) : hash3(resolved),
    complete: diagnostics.length === 0,
    root: resolved,
    ...effort.length ? { effort } : {},
    diagnostics
  };
}
var inspectComposition = Effect12.fn("mw.inspectComposition")(function* (options) {
  return yield* Effect12.try({ try: () => inspect(options), catch: (cause) => cause instanceof MadeWellError ? cause : new MadeWellError({
    code: "portable_invalid",
    message: "Cannot resolve the portable composition.",
    context: { reason: String(cause) },
    next: [{ run: "mw cartridges --inspect --root <directory>", why: "correct the selected material and inspect again" }]
  }) });
});

// src/portable-exchange.ts
import { z as z4 } from "zod";
var text3 = z4.string().refine((value) => !!value.trim() && !value.includes("\0"), "Nonblank text without NUL is required.");
var actor = z4.object({ kind: z4.enum(["operator", "agent"]), label: text3 }).strict().readonly();
var question = z4.object({ id: text3, text: text3, owner: actor }).strict().readonly();
var answer = z4.object({ questionId: text3, text: text3 }).strict().readonly();
var ExchangeAction = z4.discriminatedUnion("kind", [
  z4.object({ kind: z4.literal("question"), understanding: text3, questions: z4.array(question).nonempty().readonly() }).strict(),
  z4.object({ kind: z4.literal("answer"), answers: z4.array(answer).nonempty().readonly() }).strict(),
  z4.object({ kind: z4.literal("confirm"), understanding: text3 }).strict(),
  z4.object({ kind: z4.literal("resolve"), reason: text3, answers: z4.array(answer).nonempty().readonly() }).strict()
]);
var hold = z4.object({
  kind: z4.literal("hold"),
  reason: z4.literal("specification-defect"),
  questionIds: z4.array(text3).nonempty().readonly(),
  responsibleSender: actor,
  operatorAction: text3
}).strict().readonly();
var message = z4.object({
  at: text3,
  actor,
  action: z4.union([ExchangeAction, hold]).readonly()
}).strict().readonly();
var Exchange = z4.object({
  version: z4.literal(1),
  handoffId: text3,
  recipient: actor,
  originator: actor,
  answeredTurns: z4.number().int().min(0).max(3),
  status: z4.enum(["waiting-answer", "waiting-confirmation", "ready", "held"]),
  questions: z4.array(question).readonly(),
  pendingQuestionIds: z4.array(text3).readonly(),
  messages: z4.array(message).readonly()
}).strict().readonly();
var contextSchema = z4.object({ handoffId: text3, originator: actor, actor, at: text3, allowedAnswerIds: z4.array(text3).readonly().optional() }).strict();
var sameActor = (left, right) => left.kind === right.kind && left.label === right.label;
var fail4 = (message2, context2 = {}) => new MadeWellError({
  code: "portable_invalid",
  message: message2,
  context: context2,
  next: [{ run: "inspect_work", why: "Recover the saved handoff and exchange. Preserve the exact request ID/body for an uncertain retry; a new submission must follow the saved exchange state." }]
});
function decode2(schema, value) {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw fail4("Invalid portable exchange data.", { problems: parsed.error.issues });
  return parsed.data;
}
function distinct(ids2) {
  if (new Set(ids2).size !== ids2.length) throw fail4("Exchange question identities must be distinct within a message.", { ids: ids2 });
}
function transitionExchange(previous, action, context2) {
  const input = decode2(ExchangeAction, action), c = decode2(contextSchema, context2);
  let saved;
  if (previous === void 0) {
    if (input.kind !== "question" && input.kind !== "confirm") throw fail4("Only recipient questions or clear confirmation can start an exchange.", { handoffId: c.handoffId });
    saved = {
      version: 1,
      handoffId: c.handoffId,
      recipient: c.actor,
      originator: c.originator,
      answeredTurns: 0,
      status: "waiting-confirmation",
      questions: [],
      pendingQuestionIds: [],
      messages: []
    };
  } else {
    saved = decode2(Exchange, previous);
    if (saved.handoffId !== c.handoffId || !sameActor(saved.originator, c.originator)) throw fail4("An exchange cannot change its handoff or originator.", { handoffId: c.handoffId, savedHandoffId: saved.handoffId });
  }
  distinct(saved.questions.map((q) => q.id));
  distinct(saved.pendingQuestionIds);
  const pending = saved.pendingQuestionIds.map((id2) => {
    const q = saved.questions.find((q2) => q2.id === id2);
    if (!q) throw fail4("Saved exchange names an unknown pending question.", { handoffId: c.handoffId, questionId: id2 });
    return q;
  });
  if (saved.status === "ready") throw fail4("Recipient confirmation is already saved; this fixed exchange cannot restart.", { handoffId: c.handoffId });
  if (saved.status === "held" && input.kind !== "resolve") throw fail4("This exchange is held for an explicit operator resolution; no fourth ordinary answer or reset is permitted.", { handoffId: c.handoffId, answeredTurns: saved.answeredTurns });
  let status = saved.status;
  let answeredTurns = saved.answeredTurns;
  let questions = saved.questions, pendingQuestionIds = saved.pendingQuestionIds;
  const messages = [...saved.messages, { at: c.at, actor: c.actor, action: input }];
  const holdForOperator = (ids2) => {
    status = "held";
    messages.push({ at: c.at, actor: c.actor, action: {
      kind: "hold",
      reason: "specification-defect",
      questionIds: [...ids2],
      responsibleSender: saved.originator,
      operatorAction: "The operator must resolve the named questions with an explicit reason and answers. The same recipient must then confirm understanding; no execution or other blocker release is authorized."
    } });
  };
  if (input.kind === "question" || input.kind === "confirm") {
    if (!sameActor(c.actor, saved.recipient)) throw fail4("Only the fixed recipient can question or confirm this handoff.", { handoffId: c.handoffId, recipient: saved.recipient, actor: c.actor });
    if (pending.length) throw fail4("Current questions must be answered before recipient confirmation or a further question message.", { handoffId: c.handoffId, pendingQuestionIds: saved.pendingQuestionIds });
    if (input.kind === "confirm") status = "ready";
    else {
      distinct(input.questions.map((q) => q.id));
      for (const q of input.questions) {
        if (!sameActor(q.owner, saved.originator) && q.owner.kind !== "operator") throw fail4("A question owner must be this handoff originator or an operator.", { handoffId: c.handoffId, questionId: q.id, owner: q.owner, originator: saved.originator });
        const prior = saved.questions.find((previous2) => previous2.id === q.id);
        if (prior && (prior.text !== q.text || !sameActor(prior.owner, q.owner))) throw fail4("A question identity cannot change its text or owner.", { handoffId: c.handoffId, questionId: q.id });
        if (prior) throw fail4("This question identity is already answered. Recover its saved answer instead of reopening it or spending another clarification turn.", { handoffId: c.handoffId, questionId: q.id });
      }
      questions = [...saved.questions, ...input.questions.filter((q) => !saved.questions.some((previous2) => previous2.id === q.id))];
      pendingQuestionIds = input.questions.map((q) => q.id);
      status = "waiting-answer";
      if (answeredTurns === 3) holdForOperator(pendingQuestionIds);
    }
  } else {
    const resolving = input.kind === "resolve";
    if (resolving ? saved.status !== "held" || c.actor.kind !== "operator" : saved.status !== "waiting-answer" || answeredTurns === 3) {
      throw fail4(resolving ? "Only an operator can explicitly resolve a held exchange." : "An ordinary answer requires current unanswered questions and fewer than three answered turns.", { handoffId: c.handoffId, status: saved.status, answeredTurns });
    }
    distinct(input.answers.map((a) => a.questionId));
    const owned = resolving ? pending : pending.filter((q) => sameActor(q.owner, c.actor));
    if (!owned.length || input.answers.length !== owned.length || input.answers.some((a) => !owned.some((q) => q.id === a.questionId))) {
      throw fail4("An answer batch must answer exactly every current question owned by its sender; resolution must answer every held question. Unknown, already answered or differently owned identities are refused.", { handoffId: c.handoffId, actor: c.actor, expectedQuestionIds: owned.map((q) => q.id), suppliedQuestionIds: input.answers.map((a) => a.questionId) });
    }
    pendingQuestionIds = saved.pendingQuestionIds.filter((id2) => !input.answers.some((a) => a.questionId === id2));
    if (!resolving) answeredTurns++;
    status = pendingQuestionIds.length ? "waiting-answer" : "waiting-confirmation";
    if (answeredTurns === 3 && pendingQuestionIds.length) holdForOperator(pendingQuestionIds);
  }
  return decode2(Exchange, { ...saved, status, answeredTurns, questions, pendingQuestionIds, messages });
}

// src/portable-work.ts
var text4 = z5.string().refine((s) => !!s.trim() && !s.includes("\0"), "Nonblank text without NUL is required.");
var id = z5.number().int().positive().max(Number.MAX_SAFE_INTEGER);
var revision2 = z5.string().regex(/^[a-f0-9]{64}$/);
var target = { itemId: id };
var mutation = { ...target, requestId: text4, revision: revision2, actor: BrainstormActor };
var selection = { config: text4.optional(), override: text4.optional() };
var CapturePortableInput = z5.object({ requestId: text4, actor: BrainstormActor, source: text4, title: text4.optional(), objective: text4.optional(), component: text4, ...selection }).strict();
var InspectPortableInput = z5.object(target).strict();
var PreparePortableInput = z5.object({ ...mutation, context: z5.string().refine((s) => !s.includes("\0")).optional(), outputLength: text4.optional(), effort: z5.unknown().optional() }).strict();
var PortableResult = z5.object({ artifact: text4, sources: z5.array(text4), decisions: z5.array(text4), unknowns: z5.array(text4), contribution: z5.unknown().optional(), performedEffort: text4, performedWork: text4.optional() }).strict();
var RecordPortableInput = z5.object({ ...mutation, handoffId: text4, result: PortableResult }).strict();
var ExchangePortableInput = z5.object({ ...mutation, handoffId: text4, action: ExchangeAction }).strict();
var ids = z5.array(id).nonempty().refine((values) => new Set(values).size === values.length, "Selection must contain distinct explicit IDs.");
var PreviewPortableInput = z5.object({ ...target, ids }).strict();
var PromotePortableInput = z5.object({ ...mutation, ids, candidateRevisions: z5.record(z5.string(), revision2) }).strict();
var ReplacePortableInput = z5.object({ ...mutation, reason: text4, ...selection }).strict();
var recovery = [{ run: "inspect_work", why: "Inspect saved work before revising intent. Recover uncertain outcomes using the original requestId and exact body; never automatically choose a new ID." }];
var fail5 = (message2, context2 = {}) => new MadeWellError({ code: "portable_invalid", message: message2, context: context2, next: recovery });
var asError = (cause) => cause instanceof MadeWellError ? new MadeWellError({ code: cause.code, message: cause.message, context: cause.context, next: cause.next.length ? cause.next : recovery, ...cause.cause ? { cause: cause.cause } : {} }) : fail5("Portable work operation failed.", { reason: String(cause) });
var attempt2 = (run) => Effect13.try({ try: run, catch: asError });
var decode3 = (schema, input) => {
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw fail5("Input does not match the portable operation contract.", { problems: parsed.error.issues });
  return parsed.data;
};
var leaves = (node) => node.method ? [node] : (node.children ?? []).flatMap(leaves);
var discoveryContracts = {
  "madewell.discovery.declare.output.v1": "declare",
  "madewell.discovery.look-first.output.v1": "look-first",
  "madewell.discovery.classify.output.v1": "classify",
  "madewell.discovery.lenses.output.v1": "lenses",
  "madewell.discovery.one-thing.output.v1": "one-thing",
  "madewell.discovery.route.output.v1": "route",
  "madewell.candidates.v1": "discover"
};
function lineage(root) {
  const prior = /* @__PURE__ */ new Map();
  const visit = (node, input) => {
    if (node.method) {
      prior.set(node.address, input);
      return [...input, node];
    }
    const outputs = /* @__PURE__ */ new Map([["$input", input]]);
    for (const child of node.children ?? []) {
      const source = node.wiring?.inputs[child.id], predecessors = source === void 0 ? void 0 : outputs.get(source);
      if (!predecessors) throw fail5("Pinned child input has no earlier sibling output or parent input.", { address: child.address, source });
      outputs.set(child.id, visit(child, predecessors));
    }
    const output = node.wiring?.output, selected = output === void 0 ? void 0 : outputs.get(output);
    if (!selected || output === "$input") throw fail5("Pinned group output has no selected child.", { address: node.address, output });
    return selected;
  };
  visit(root, []);
  return prior;
}
function discoveryAncestry(node, prior) {
  const job = discoveryContracts[node.output];
  const recognized = prior.flatMap((previous) => {
    const job2 = discoveryContracts[previous.output];
    return job2 ? [{ address: previous.address, job: job2 }] : [];
  });
  if (job) {
    const jobs2 = Object.values(discoveryContracts), expected = jobs2.slice(0, jobs2.indexOf(job));
    if (recognized.length !== expected.length || recognized.some((previous, index) => previous.job !== expected[index])) {
      throw fail5("Discovery requires exactly its ordered accepted predecessor contracts in the wired ancestry; missing, out-of-order or duplicate contracts cannot be supplied by independent siblings.", { address: node.address, job, recognized, expected });
    }
  }
  return recognized;
}
function scopedResults(state, node, available = state.results) {
  const prior = lineage(state.selection.root).get(node.address);
  if (!prior) throw fail5("The saved handoff occurrence is absent from the pinned selection.", { address: node.address });
  return prior.map((previous) => {
    const matches = available.filter((result) => result.address === previous.address && result.output === previous.output);
    if (matches.length !== 1) throw fail5("Wired predecessor requires exactly one accepted saved result.", { address: node.address, predecessor: previous.address, matches: matches.length });
    return matches[0];
  });
}
function scoped(store, root, itemId2) {
  const item = store.get(itemId2);
  if (!item) throw new MadeWellError({ code: "item_not_found", message: "No work item has this number.", context: { id: itemId2 }, next: recovery });
  if (item.workspace !== root || item.portable?.root !== root || item.portable.version !== 1) throw fail5("This is not portable work in the explicitly granted root.", { itemId: itemId2, root });
  return item;
}
function mutable2(item) {
  if (item.status !== "open" || item.execution.mode !== "external" || !quiescent(item) || item.pack || item.job || item.hold || item.completion || item.blockers.some((b) => !b.resolvedAt)) {
    throw fail5("Only open, unblocked, quiescent external work can change.", { itemId: item.id, status: item.status });
  }
}
function snapshot(item) {
  const nodes = leaves(item.portable.selection.root), next = nodes[item.portable.results.length];
  const pending = item.portable.handoffs.find((handoff) => !item.portable.results.some((result) => result.handoffId === handoff.id));
  const exchange = pending && item.portable.exchanges?.[pending.id];
  const exchangeAction = exchange?.status === "held" ? "Operator resolution of the saved specification-defect hold, then recipient confirmation" : exchange?.status === "waiting-answer" ? `Answer saved questions: ${exchange.pendingQuestionIds.map((id2) => {
    const question2 = exchange.questions.find((question3) => question3.id === id2);
    return `${id2} (${question2.owner.label})`;
  }).join(", ")}` : exchange?.status === "waiting-confirmation" ? `Recipient ${exchange.recipient.label} must confirm understanding of saved answers` : void 0;
  return {
    itemId: item.id,
    revision: revisionOf(item),
    root: item.workspace,
    source: item.source,
    title: item.title,
    objective: item.objective,
    status: item.status,
    portable: item.portable,
    executionAuthorized: false,
    independentlyVerified: false,
    owner: item.execution.owner,
    activity: "not-running",
    nextAction: exchangeAction ?? (pending ? `Recover saved handoff ${pending.id}; no performer is running.` : next ? `Prepare ${next.address}` : "Inspect recorded contributions; no execution or independent completion is implied."),
    resources: ["source", "handoffs", "results", "packages", "selection", "exchanges", "refusals"].map((kind) => ({ uri: `madewell://work/items/${item.id}/${kind}`, mimeType: "application/json" }))
  };
}
function request2(store, root, requestId, operation, itemId2, input, at, run) {
  const outcome = store.atomic(() => {
    const saved = store.request(requestId, operation, itemId2, { root, input }, () => {
      if (itemId2 !== null) scoped(store, root, itemId2);
      try {
        const value = store.atomic(run);
        return { root, itemId: value.itemId, value };
      } catch (cause) {
        const error = asError(cause);
        if (itemId2 === null) throw error;
        const refusal = { ...errorJson(error), context: { ...error.context, draft: input } };
        store.note(itemId2, "portable-refused", { requestId, operation, input, error: refusal }, at);
        return { root, itemId: itemId2, error: refusal };
      }
    });
    if (saved.root !== root) throw fail5("Receipt belongs to a different material scope.", { root });
    if (store.get(saved.itemId)) scoped(store, root, saved.itemId);
    return saved;
  });
  if (outcome.error) throw asError(new MadeWellError({
    code: outcome.error.error,
    message: outcome.error.message,
    context: outcome.error.context,
    next: outcome.error.next,
    ...outcome.error.cause ? { cause: outcome.error.cause } : {}
  }));
  return outcome.value;
}
function external(root, source, title, objective, actor2, at) {
  const conditions = [{ id: "A1", text: objective }];
  return {
    schemaVersion: 2,
    workspace: root,
    source,
    title,
    objective,
    kind: "portable",
    settings: { ...defaultSettings(), deliveryPack: null, alert: null, inputs: [], destinations: [] },
    execution: { mode: "external", owner: actor2.label },
    conditions,
    conditionHash: conditionHashOf(conditions),
    relationships: { after: [] },
    progress: { remaining: objective, nextAction: "Prepare the selected method", owner: actor2.label },
    blockers: [],
    status: "open",
    job: "",
    outputs: {},
    from: { kind: "dispatcher" },
    autonomy: "checkpoints",
    created: at,
    updated: at
  };
}
function pin(selection2, root) {
  if (!selection2.complete) throw fail5("Selected composition has unavailable methods; no successful placeholder was saved.", { diagnostics: selection2.diagnostics });
  const prior = lineage(selection2.root);
  const packages = {};
  for (const node of leaves(selection2.root)) {
    discoveryAncestry(node, prior.get(node.address));
    const method = node.method;
    if (method.kind !== "skill") continue;
    if (Object.keys(method.args).some((key) => key !== "effort" && key !== "effortRecipes")) throw fail5("Unsupported method arguments were not reinterpreted as effort.", { address: node.address, args: method.args });
    for (const pkg of [method.package, ...method.companions ?? []]) {
      const grant = [root, brainstormSeedRoot, methodLibraryRoot].find((grant2) => pkg.origin === grant2 || pkg.origin.startsWith(grant2.endsWith("/") ? grant2 : grant2 + "/"));
      if (!grant) throw fail5("The selected package has no authorized material grant.", { address: node.address, origin: pkg.origin });
      packages[pkg.identity] = pkg.manifest.filter((f) => f.path === "SKILL.md" || f.path.startsWith("references/") || f.path.startsWith("assets/") || f.path.startsWith("scripts/") || /^(LICENSE|NOTICE)(\.(txt|md))?$/.test(f.path)).map((file) => {
        const bytes2 = readSkillFile(grant, pkg, file.path);
        try {
          return { ...file, encoding: "utf8", content: new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes2) };
        } catch {
          return { ...file, encoding: "base64", content: bytes2.toString("base64") };
        }
      });
    }
  }
  return packages;
}
function effortRecipe(node, packages, requested, selection2) {
  const method = node.method;
  const expansions = selection2?.effort?.filter((choice) => choice.address === "/" || choice.address === node.address || node.address.startsWith(choice.address + "/"));
  if (method.kind !== "skill") return resolveManagedEffort({
    requested,
    methodIdentity: method.identity,
    occurrence: node.address,
    sourceIdentity: method.origin,
    instructionBytes: JSON.stringify(method.definition),
    expansions
  });
  const brainstorm = method.bindingOrigin === "builtin:brainstorm-seed";
  const effort = brainstorm ? packages[method.package.identity]?.find((file) => file.path === "references/effort.md") : void 0;
  if (brainstorm && (!effort || effort.encoding !== "utf8")) throw fail5("Pinned Brainstorm effort instructions are unavailable.", { address: node.address });
  return resolveManagedEffort({
    requested,
    bindingSelection: method.args.effort,
    declaration: brainstorm ? brainstormEffortDeclaration(effort.content) : method.args.effortRecipes,
    methodIdentity: method.identity,
    occurrence: node.address,
    sourceIdentity: brainstorm ? "brainstorm:references/effort.md/1" : method.bindingOrigin,
    instructionBytes: brainstorm ? effort.content : method.package.instructions,
    expansions
  });
}
function retainSelection(selection2, packages) {
  const retainPackage = (pkg) => {
    const { scope: _scope, ...retained } = pkg;
    return {
      ...retained,
      manifestScope: "retained-runtime",
      manifest: packages[pkg.identity].map(({ path, bytes: bytes2, sha256 }) => ({ path, bytes: bytes2, sha256 }))
    };
  };
  const retainNode = (node) => ({
    ...node,
    ...node.method?.kind === "skill" ? { method: {
      ...node.method,
      package: retainPackage(node.method.package),
      ...node.method.companions ? { companions: node.method.companions.map(retainPackage) } : {}
    } } : {},
    ...node.children ? { children: node.children.map(retainNode) } : {}
  });
  return { ...selection2, root: retainNode(selection2.root) };
}
function acceptedDiscovery(node, results) {
  discoveryAncestry(node, results);
  const prefix = {};
  for (const result of results) {
    const job = discoveryContracts[result.output];
    if (job) prefix[job] = result.result.contribution;
  }
  return prefix;
}
function candidates(store, parent, contribution, actor2, at) {
  const items = contribution.items;
  const created = items.map((candidate) => store.create({
    ...external(parent.workspace, parent.source, candidate.title, candidate.objective, actor2, at),
    status: "candidate",
    discovery: parent.id,
    parent: parent.id,
    conditions: candidate.conditions,
    conditionHash: conditionHashOf(candidate.conditions),
    progress: { remaining: candidate.text, nextAction: "Await explicit selection; this is not execution permission.", owner: actor2.label },
    relationships: { discovery: parent.id, parent: parent.id, after: [] }
  }));
  for (const [index, item] of created.entries()) store.transition(item.id, revisionOf(item), "portable-candidate", { discovery: parent.id, key: items[index].key }, (current) => ({
    ...current,
    after: items[index].after.map((position) => created[position - 1].id),
    relationships: { ...current.relationships, after: items[index].after.map((position) => created[position - 1].id) }
  }));
  return created.map((item) => item.id);
}
function preview(store, parent, chosen) {
  const selected = chosen.map((itemId2) => {
    if (!parent.portable.candidates.includes(itemId2)) throw fail5("Selection names an item outside this discovery.", { itemId: itemId2 });
    const candidate = store.get(itemId2);
    if (candidate.workspace !== parent.workspace || candidate.discovery !== parent.id || candidate.status !== "candidate") throw fail5("Selection requires current unpromoted candidates in this scope.", { itemId: itemId2 });
    return { itemId: itemId2, revision: revisionOf(candidate), title: candidate.title, prerequisites: candidate.relationships.after.map((itemId3) => ({ itemId: itemId3, selected: chosen.includes(itemId3), completed: store.get(itemId3)?.status === "completed" })) };
  });
  return { selected, executionAuthorized: false, implicitPrerequisites: false };
}
function operations2(root) {
  const capture = Effect13.fn("mw.capturePortableWork")(function* (input) {
    const i = yield* attempt2(() => decode3(CapturePortableInput, input));
    yield* assertWritable();
    const store = yield* Store, at = new Date(yield* Clock5.currentTimeMillis).toISOString();
    return yield* attempt2(() => request2(store, root, i.requestId, "capture_work", null, i, at, () => {
      const selected = Effect13.runSync(inspectComposition({ root, component: i.component, config: i.config, override: i.override }).pipe(Effect13.match({ onSuccess: (value) => value, onFailure: (error) => {
        throw error;
      } })));
      const packages = pin(selected, root);
      const item = store.create({
        ...external(root, i.source, i.title ?? "Work", i.objective ?? i.source, i.actor, at),
        portable: { version: 1, root, selection: retainSelection(selected, packages), packages, handoffs: [], results: [], candidates: [] }
      });
      store.note(item.id, "portable-captured", { requestId: i.requestId, actor: i.actor, selection: selected.identity }, at);
      return snapshot(item);
    }));
  });
  const inspect2 = Effect13.fn("mw.inspectPortableWork")(function* (input) {
    const i = yield* attempt2(() => decode3(InspectPortableInput, input)), store = yield* Store;
    return yield* attempt2(() => snapshot(scoped(store, root, i.itemId)));
  });
  const prepare = Effect13.fn("mw.preparePortableWork")(function* (input) {
    const i = yield* attempt2(() => decode3(PreparePortableInput, input));
    yield* assertWritable();
    const policy = yield* currentManagedEffortAccess;
    const store = yield* Store, at = new Date(yield* Clock5.currentTimeMillis).toISOString();
    return yield* attempt2(() => request2(store, root, i.requestId, "prepare_work", i.itemId, i, at, () => {
      const item = store.transition(i.itemId, i.revision, "portable-prepared", { input: i }, (current) => {
        const item2 = current;
        mutable2(item2);
        const saved = item2.portable, node = leaves(retainSelection(saved.selection, saved.packages).root)[saved.results.length];
        if (!node) throw fail5("Every selected occurrence already has a recorded result.", { itemId: i.itemId });
        if (saved.handoffs.some((h) => !saved.results.some((r) => r.handoffId === h.id))) throw fail5("Recover the pending handoff instead of preparing another attempt.", { itemId: i.itemId });
        const recipe = effortRecipe(node, saved.packages, i.effort, saved.selection);
        const effortAuthorization = authorizeManagedEffort(policy, recipe, { root, storeScope: store.path, revision: revisionOf(item2) });
        const method = node.method, selected = method.kind === "skill" ? [method.package, ...method.companions ?? []] : [];
        const discoveryJob = discoveryContracts[node.output], priorResults = scopedResults(saved, node);
        discoveryAncestry(node, priorResults);
        const predecessorHandoffs = new Set(priorResults.map((result) => result.handoffId));
        const handoff = {
          id: randomUUID4(),
          at,
          actor: i.actor,
          node,
          source: item2.source,
          context: i.context ?? null,
          priorInputs: saved.handoffs.flatMap((h) => !predecessorHandoffs.has(h.id) || h.context === null ? [] : [{ handoffId: h.id, actor: h.actor, context: h.context }]),
          priorResults,
          priorExchanges: Object.values(saved.exchanges ?? {}).filter((exchange2) => predecessorHandoffs.has(exchange2.handoffId)),
          packages: Object.fromEntries(selected.map((pkg) => [pkg.identity, saved.packages[pkg.identity]])),
          requestedEffort: i.effort === void 0 ? null : i.effort,
          effectiveEffort: recipe.effective,
          recipe,
          effortAuthorization,
          outputLength: i.outputLength ?? saved.handoffs.findLast((h) => predecessorHandoffs.has(h.id))?.outputLength ?? null,
          contributionSchema: discoveryJob ? discoveryContributionShape(discoveryJob, { handoff: true }) : null,
          framing: "Apply the selected ordinary instructions under actual host authority. Preserve natural output in result.artifact. When contributionSchema is present, provide the separately structured contract-2 adapter output in result.contribution using its declared evidence/intent/requirement/candidate identities and priorResults. The artifact is not replaced by JSON. Recording validates the declared contract only, never independent acceptance, completion, promotion or execution."
        };
        return { ...item2, portable: { ...saved, handoffs: [...saved.handoffs, handoff] }, updated: at };
      });
      return { ...snapshot(item), handoff: item.portable.handoffs.at(-1) };
    }));
  });
  const exchange = Effect13.fn("mw.exchangePortableWork")(function* (input) {
    const i = yield* attempt2(() => decode3(ExchangePortableInput, input));
    yield* assertWritable();
    const store = yield* Store, at = new Date(yield* Clock5.currentTimeMillis).toISOString();
    return yield* attempt2(() => request2(store, root, i.requestId, "exchange_work", i.itemId, i, at, () => {
      const item = store.transition(i.itemId, i.revision, "portable-exchanged", { input: i }, (current) => {
        const item2 = current;
        mutable2(item2);
        const saved = item2.portable, handoff = saved.handoffs.at(-1);
        if (!handoff || handoff.id !== i.handoffId || saved.results.some((result) => result.handoffId === i.handoffId)) throw fail5("Exchange must name the current unrecorded saved handoff.", { handoffId: i.handoffId });
        const exchange2 = transitionExchange(saved.exchanges?.[handoff.id], i.action, { handoffId: handoff.id, originator: handoff.actor, actor: i.actor, at });
        return { ...item2, portable: { ...saved, exchanges: { ...saved.exchanges, [handoff.id]: exchange2 } }, updated: at };
      });
      return { ...snapshot(item), exchange: item.portable.exchanges[i.handoffId] };
    }));
  });
  const record = Effect13.fn("mw.recordPortableWork")(function* (input) {
    const i = yield* attempt2(() => decode3(RecordPortableInput, input));
    yield* assertWritable();
    const store = yield* Store, at = new Date(yield* Clock5.currentTimeMillis).toISOString();
    return yield* attempt2(() => request2(store, root, i.requestId, "record_work", i.itemId, i, at, () => {
      const item = store.transition(i.itemId, i.revision, "portable-recorded", { input: i }, (current) => {
        const item2 = current;
        mutable2(item2);
        const saved = item2.portable, handoff = saved.handoffs.at(-1);
        if (!handoff || handoff.id !== i.handoffId || saved.results.some((r) => r.handoffId === i.handoffId)) throw fail5("Result must name the current unrecorded saved handoff.", { handoffId: i.handoffId });
        const exchange2 = saved.exchanges?.[handoff.id];
        if (exchange2 && exchange2.status !== "ready") throw fail5("The saved exchange must reach recipient confirmation before recording this result.", { handoffId: handoff.id, status: exchange2.status, answeredTurns: exchange2.answeredTurns, pendingQuestionIds: exchange2.pendingQuestionIds });
        assertPerformedEffort(i.result.performedEffort, handoff.effectiveEffort, handoff.recipe);
        const job = discoveryContracts[handoff.node.output];
        if (job) {
          if (i.result.contribution?.discoveryContract !== "2") throw fail5("Portable discovery requires contribution contract 2.", { output: handoff.node.output });
          const validation = validateDiscoveryContribution(job, i.result.contribution, acceptedDiscovery(handoff.node, scopedResults(saved, handoff.node, handoff.priorResults)), { handoff: true });
          if (!validation.ok) throw fail5("Discovery contribution does not conserve its accepted inputs.", { issues: validation.issues });
        }
        const recorded = { id: randomUUID4(), at, actor: i.actor, handoffId: handoff.id, address: handoff.node.address, output: handoff.node.output, result: i.result, validation: "contract-accepted-not-independently-verified" };
        return { ...item2, portable: { ...saved, results: [...saved.results, recorded], candidates: job === "discover" ? [...saved.candidates, ...candidates(store, item2, i.result.contribution, i.actor, at)] : saved.candidates }, updated: at };
      });
      return { ...snapshot(item), recorded: item.portable.results.at(-1) };
    }));
  });
  const previewSelection = Effect13.fn("mw.previewPortablePromotion")(function* (input) {
    const i = yield* attempt2(() => decode3(PreviewPortableInput, input)), store = yield* Store;
    return yield* attempt2(() => ({ ...snapshot(scoped(store, root, i.itemId)), promotion: preview(store, scoped(store, root, i.itemId), i.ids) }));
  });
  const promote = Effect13.fn("mw.promotePortableSelection")(function* (input) {
    const i = yield* attempt2(() => decode3(PromotePortableInput, input));
    yield* assertWritable();
    const store = yield* Store, at = new Date(yield* Clock5.currentTimeMillis).toISOString();
    return yield* attempt2(() => request2(store, root, i.requestId, "promote_work", i.itemId, i, at, () => {
      const parent = scoped(store, root, i.itemId);
      mutable2(parent);
      const selected = preview(store, parent, i.ids);
      if (Object.keys(i.candidateRevisions).length !== i.ids.length || selected.selected.some((c) => i.candidateRevisions[String(c.itemId)] !== c.revision)) throw fail5("Promotion requires exactly the current revision of every selected candidate.", { selected });
      const updated = store.transition(parent.id, i.revision, "portable-promoted", { input: i }, (current) => ({ ...current, updated: at }));
      for (const candidate of selected.selected) store.transition(candidate.itemId, candidate.revision, "portable-selected", { discovery: parent.id, actor: i.actor }, (item) => ({
        ...item,
        status: "open",
        execution: { mode: "external", owner: i.actor.label },
        pack: void 0,
        job: "",
        updated: at
      }));
      return { ...snapshot(updated), promotion: selected };
    }));
  });
  const replace = Effect13.fn("mw.replacePortableFuture")(function* (input) {
    const i = yield* attempt2(() => decode3(ReplacePortableInput, input));
    yield* assertWritable();
    const store = yield* Store, at = new Date(yield* Clock5.currentTimeMillis).toISOString();
    return yield* attempt2(() => request2(store, root, i.requestId, "replace_work", i.itemId, i, at, () => {
      const current = scoped(store, root, i.itemId);
      mutable2(current);
      const selected = Effect13.runSync(inspectComposition({ root, component: current.portable.selection.root.address, config: i.config, override: i.override }).pipe(Effect13.match({ onSuccess: (value) => value, onFailure: (error) => {
        throw error;
      } })));
      const old = leaves(current.portable.selection.root), next = leaves(selected.root);
      const attempted = new Set(current.portable.handoffs.map((h) => h.node.address));
      const frozenEffort = (selection2) => (selection2.effort ?? []).filter((choice) => [...attempted].some((address) => choice.address === "/" || address === choice.address || address.startsWith(choice.address + "/")));
      if (JSON.stringify(frozenEffort(selected)) !== JSON.stringify(frozenEffort(current.portable.selection))) throw fail5("Replacement changes effort expansion governing an attempted occurrence; prepared work remains pinned.", { attempted: [...attempted] });
      const enclosing = (node) => ({
        address: node.address,
        input: node.input,
        output: node.output,
        constraints: node.constraints,
        ...attempted.has(node.address) ? { identity: node.identity } : attempted.size ? { wiring: node.wiring, children: node.children?.filter((child) => [...attempted].some((address) => address === child.address || address.startsWith(child.address + "/"))).map(enclosing) } : {}
      });
      if (JSON.stringify(enclosing(selected.root)) !== JSON.stringify(enclosing(current.portable.selection.root)) || old.some((node, index) => attempted.has(node.address) && (next[index]?.identity !== node.identity || next[index]?.address !== node.address))) throw fail5("Replacement changes an attempted occurrence or enclosing contract/wiring; historical inputs remain pinned.", { attempted: [...attempted] });
      const packages = pin(selected, root);
      return snapshot(store.transition(i.itemId, i.revision, "portable-replaced", { input: i }, (item) => ({ ...item, portable: { ...current.portable, selection: retainSelection(selected, packages), packages: { ...current.portable.packages, ...packages } }, updated: at })));
    }));
  });
  const readResource = Effect13.fn("mw.readPortableResource")(function* (uri) {
    const match = /^madewell:\/\/work\/items\/([1-9][0-9]*)\/(source|handoffs|results|packages|selection|exchanges|refusals)$/.exec(uri);
    if (!match) return yield* Effect13.fail(fail5("Unknown saved work resource.", { uri }));
    const store = yield* Store;
    return yield* attempt2(() => {
      const item = scoped(store, root, decode3(InspectPortableInput, { itemId: Number(match[1]) }).itemId), kind = match[2];
      if (kind === "refusals") return { itemId: item.id, refusals: store.events(item.id).filter((event) => event.kind === "portable-refused").map(({ seq, at, data }) => ({ seq, at, data })) };
      return { itemId: item.id, [kind]: kind === "source" ? item.source : kind === "exchanges" ? item.portable.exchanges ?? {} : item.portable[kind] };
    });
  });
  return { capture, inspect: inspect2, prepare, exchange, record, preview: previewSelection, promote, replace, readResource };
}
var PortableWork = class extends Context6.Service()("madewell/PortableWork") {
};
var portableWorkLayer = (configuration) => Layer7.effect(PortableWork, attempt2(() => operations2(validateGrantedRoot(configuration.root))));

// src/mcp-telemetry.ts
import { closeSync as closeSync5, constants as constants4, fstatSync as fstatSync4, lstatSync as lstatSync6, openSync as openSync5, realpathSync as realpathSync2, statSync, writeSync } from "node:fs";
import { basename as basename2, dirname as dirname7, resolve as resolve6 } from "node:path";
import { context, metrics as metrics2, trace, ROOT_CONTEXT, SpanKind, SpanStatusCode } from "@opentelemetry/api";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { AlwaysOnSampler, SimpleSpanProcessor } from "@opentelemetry/sdk-trace";
import { Effect as Effect14 } from "effect";
var recovery2 = [{
  run: "node src/mcp.ts --root <ABSOLUTE_ROOT> --store <SELECTED_STORE> --telemetry-file <SEPARATE_LOCAL_JSONL>",
  why: "Correct the explicit paths before restarting (or use dist/mcp.mjs for the bundle). Keep telemetry separate from the Store and SQLite sidecars, including symlink/hardlink aliases, with an existing writable telemetry parent. Preserve the original Store and pending requestId/body; do not automatically resubmit mutations."
}];
var failure2 = (cause) => cause instanceof MadeWellError ? cause : new MadeWellError({ code: "mcp_failed", message: "Local MCP telemetry failed.", context: { reason: String(cause) }, next: recovery2 });
var missing = (cause) => typeof cause === "object" && cause !== null && "code" in cause && cause.code === "ENOENT";
var sameFile = (left, right) => left.dev === right.dev && left.ino === right.ino;
function canonicalDestination(path) {
  let existing = resolve6(path);
  const remaining = [];
  let appearanceRetries = 0;
  for (; ; ) {
    try {
      return resolve6(realpathSync2(existing), ...remaining);
    } catch (cause) {
      if (!missing(cause)) throw cause;
      let present2 = false, symlink = false;
      try {
        const entry = lstatSync6(existing);
        present2 = true;
        symlink = entry.isSymbolicLink();
      } catch (error) {
        if (!missing(error)) throw error;
      }
      if (symlink) throw failure2(`Cannot resolve the selected destination alias: ${existing}`);
      if (present2) {
        if (appearanceRetries++ < 3) continue;
        throw failure2(`The selected destination did not stabilize during resolution: ${existing}`);
      }
      const parent = dirname7(existing);
      if (parent === existing) throw cause;
      remaining.unshift(basename2(existing));
      existing = parent;
    }
  }
}
function identityAt(path) {
  try {
    return statSync(path, { bigint: true });
  } catch (cause) {
    if (missing(cause)) return void 0;
    throw cause;
  }
}
function assertTelemetryStoreSeparation(storePath, file, fd) {
  const storeCanonical = canonicalDestination(storePath);
  const telemetryCanonical = file === void 0 ? void 0 : canonicalDestination(file);
  const telemetryIdentity = fd === void 0 ? file === void 0 ? void 0 : identityAt(file) : fstatSync4(fd, { bigint: true });
  const targets = new Set([storePath, storeCanonical].flatMap((path) => ["", "-wal", "-shm", "-journal"].map((suffix) => path + suffix)));
  for (const target2 of targets) {
    const targetCanonical = canonicalDestination(target2), targetIdentity = identityAt(target2);
    if (telemetryCanonical === targetCanonical || telemetryIdentity && targetIdentity && sameFile(telemetryIdentity, targetIdentity)) {
      throw new MadeWellError({
        code: "mcp_failed",
        message: "Telemetry must not share the selected Store or a SQLite sidecar destination.",
        context: { reason: "telemetry_store_collision", store: storePath, telemetryFile: file ?? "stderr", conflictingDestination: target2 },
        next: recovery2
      });
    }
  }
  return { storeCanonical, telemetryCanonical };
}
async function openTelemetry(storePath, file, now) {
  const selected = assertTelemetryStoreSeparation(storePath, file);
  const fd = file === void 0 ? 2 : openSync5(file, constants4.O_WRONLY | constants4.O_APPEND | constants4.O_CREAT | constants4.O_NOFOLLOW | constants4.O_NONBLOCK, 384);
  let sdk;
  try {
    if (file !== void 0 && !fstatSync4(fd).isFile()) throw failure2("The telemetry destination must be a regular file.");
    const assertStoreSeparation = () => {
      const current = assertTelemetryStoreSeparation(storePath, file, fd);
      const pathIdentity = file === void 0 ? void 0 : identityAt(file);
      if (current.storeCanonical !== selected.storeCanonical || current.telemetryCanonical !== selected.telemetryCanonical || file !== void 0 && (!pathIdentity || !sameFile(pathIdentity, fstatSync4(fd, { bigint: true })))) {
        throw new MadeWellError({
          code: "mcp_failed",
          message: "A selected Store or telemetry destination changed; no further telemetry or writable Store acquisition is allowed.",
          context: { reason: "destination_changed", store: storePath, telemetryFile: file ?? "stderr" },
          next: recovery2
        });
      }
    };
    assertStoreSeparation();
    const emit = (record) => {
      assertStoreSeparation();
      writeSync(fd, JSON.stringify(record) + "\n");
    };
    const spans = {
      export(batch, done) {
        try {
          for (const span of batch) emit({
            kind: "span",
            name: span.name,
            scope: span.instrumentationScope,
            ...span.spanContext(),
            parentSpanId: span.parentSpanContext?.spanId,
            attributes: span.attributes,
            status: span.status,
            duration: span.duration
          });
          done({ code: 0 });
        } catch (cause) {
          done({ code: 1, error: cause instanceof Error ? cause : void 0 });
        }
      },
      async shutdown() {
      }
    };
    const exporter = {
      export(batch, done) {
        try {
          emit({ kind: "metrics", scopeMetrics: batch.scopeMetrics });
          done({ code: 0 });
        } catch (cause) {
          done({ code: 1, error: cause instanceof Error ? cause : void 0 });
        }
      },
      async forceFlush() {
      },
      async shutdown() {
      }
    };
    const reader = new PeriodicExportingMetricReader({ exporter, exportIntervalMillis: 1e3 });
    sdk = new NodeSDK({
      serviceName: "madewell-mcp",
      autoDetectResources: false,
      spanProcessors: [new SimpleSpanProcessor({ exporter: spans })],
      metricReaders: [reader],
      logRecordProcessors: [],
      textMapPropagator: null,
      sampler: new AlwaysOnSampler()
    });
    sdk.start();
    const tracer = trace.getTracer("madewell.mcp", "1");
    const duration = metrics2.getMeter("madewell.mcp", "1").createHistogram("mcp.server.operation.duration", { unit: "s" });
    const pending = /* @__PURE__ */ new Map();
    let closing = false;
    const finish = (id2, error) => {
      const request3 = pending.get(id2);
      if (!request3) return;
      pending.delete(id2);
      if (error) {
        request3.dimensions["error.type"] = error;
        request3.span.setAttribute("error.type", error).setStatus({ code: SpanStatusCode.ERROR });
      }
      duration.record(Math.max(0, now() - request3.start) / 1e3, request3.dimensions);
      request3.span.end();
    };
    return {
      assertStoreSeparation,
      instrument(transport) {
        const start = transport.start.bind(transport);
        transport.start = async () => {
          const receive = transport.onmessage;
          transport.onmessage = (message2, extra) => {
            if (!("method" in message2) || !("id" in message2)) {
              receive?.(message2, extra);
              return;
            }
            const method = ["initialize", "server/discover", "ping", "tools/list", "tools/call", "resources/list", "resources/templates/list", "resources/read", "skills/list", "skills/get"].includes(message2.method) ? message2.method : "other";
            const requestedTool = message2.method === "tools/call" ? message2.params?.name : void 0;
            const tool = typeof requestedTool === "string" && ["catalog_brainstorm", "capture_brainstorm", "inspect_brainstorm", "prepare_brainstorm", "record_brainstorm", "capture_work", "inspect_work", "prepare_work", "record_work", "preview_work", "promote_work", "replace_work", "inspect_composition", "exchange_work"].includes(requestedTool) ? requestedTool : void 0;
            const dimensions = { "mcp.method.name": method, ...tool ? { "gen_ai.tool.name": tool } : {} };
            const parent = message2.params?._meta?.traceparent;
            const matched = typeof parent === "string" ? /^00-([a-f0-9]{32})-([a-f0-9]{16})-([a-f0-9]{2})$/.exec(parent) : null;
            const parentContext = matched && !/^0+$/.test(matched[1]) && !/^0+$/.test(matched[2]) ? trace.setSpanContext(ROOT_CONTEXT, { traceId: matched[1], spanId: matched[2], traceFlags: Number.parseInt(matched[3], 16) & 1, isRemote: true }) : ROOT_CONTEXT;
            const span = tracer.startSpan(method + (tool ? ` ${tool}` : ""), { kind: SpanKind.SERVER, attributes: { ...dimensions, "jsonrpc.request.id": message2.id } }, parentContext);
            if (pending.has(message2.id)) finish(message2.id, "duplicate_protocol_id");
            pending.set(message2.id, { span, start: now(), dimensions });
            context.with(trace.setSpan(context.active(), span), () => receive?.(message2, extra));
          };
          await start();
        };
        const send = transport.send.bind(transport);
        transport.send = async (message2, options) => {
          try {
            await send(message2, options);
          } catch (cause) {
            if ("id" in message2 && message2.id !== null && message2.id !== void 0) finish(message2.id, "send_failed");
            throw cause;
          }
          if (!("method" in message2) && "id" in message2 && message2.id !== null && message2.id !== void 0) {
            finish(message2.id, "error" in message2 ? "protocol_error" : message2.result.isError === true ? "tool_error" : void 0);
            if (!closing) await reader.forceFlush();
          }
        };
      },
      async close() {
        closing = true;
        for (const id2 of pending.keys()) finish(id2, "connection_closed");
        try {
          await sdk.shutdown();
        } finally {
          if (file !== void 0) closeSync5(fd);
        }
      }
    };
  } catch (cause) {
    try {
      await sdk?.shutdown();
    } finally {
      if (file !== void 0) closeSync5(fd);
    }
    throw cause;
  }
}
var localMcpTelemetry = (storePath, file) => Effect14.gen(function* () {
  yield* Effect14.acquireRelease(Effect14.sync(() => {
    const saved = Object.fromEntries(Object.entries(process.env).filter(([key]) => key.startsWith("OTEL_") || key === "MW_TELEMETRY"));
    for (const key of Object.keys(saved)) delete process.env[key];
    return saved;
  }), (saved) => Effect14.sync(() => {
    for (const key of Object.keys(process.env)) if (key.startsWith("OTEL_") || key === "MW_TELEMETRY") delete process.env[key];
    Object.assign(process.env, saved);
  }));
  return yield* Effect14.acquireRelease(
    Effect14.clockWith((clock) => Effect14.tryPromise({ try: () => openTelemetry(storePath, file, () => clock.currentTimeMillisUnsafe()), catch: failure2 })),
    (telemetry2) => Effect14.tryPromise({ try: () => telemetry2.close(), catch: failure2 }).pipe(Effect14.catch((error) => Effect14.sync(() => {
      process.stderr.write(JSON.stringify({ error: error.code, message: error.message, context: error.context, next: error.next }) + "\n");
      process.exitCode = 1;
    })))
  );
});

// src/mcp-skills.ts
import { isDeepStrictEqual } from "node:util";
import { Effect as Effect15 } from "effect";
import { memorySkillFiles, SkillCatalogError, SkillsExtension } from "@modelcontextprotocol/server/ext/skills";
var failure3 = (cause) => {
  if (cause instanceof MadeWellError && cause.code === "mcp_failed") return cause;
  return new MadeWellError({
    code: "mcp_failed",
    message: "The optional approved Brainstorm Skills catalog could not be acquired. No partial catalog was attached.",
    context: {
      component: "brainstorm-skills",
      seedDirectory: brainstormSeedRoot,
      ...cause instanceof SkillCatalogError ? { problems: cause.problems } : cause instanceof MadeWellError ? { problem: errorJson(cause) } : cause instanceof Error ? { reason: cause.message } : typeof cause === "object" && cause !== null ? { facts: cause } : { reason: String(cause) }
    },
    next: [{ run: "mw", why: "Inspect the command reference. Restore the approved shipped Brainstorm runtime files and PROVENANCE.json from the same distribution, then restart MCP with the original arguments; do not edit method bytes or bypass integrity validation. Leave optional Skills disabled until the shared pinning helper validates complete runtime inventories." }]
  });
};
var acquireBrainstormSkills = Effect15.fn("mw.acquireBrainstormSkills")(function* (pinApprovedPackage) {
  const packages = yield* Effect15.try({
    try: () => brainstormMethods.map((name) => {
      const pkg = pinApprovedPackage(brainstormSeedRoot, name);
      if (pkg.name !== name) throw failure3({ method: name, reason: "The shared pinning helper returned another method." });
      return pkg;
    }),
    catch: failure3
  });
  const files = yield* Effect15.try({
    try: () => {
      const files2 = /* @__PURE__ */ Object.create(null);
      for (const pkg of packages) {
        const paths = /* @__PURE__ */ new Set();
        for (const file of pkg.files) {
          const path = file.path;
          if (!(path === "SKILL.md" || path.startsWith("references/") || path.startsWith("assets/")) || path.includes("\\") || path.includes("\0") || path.split("/").some((segment) => !segment || segment.startsWith(".")) || paths.has(path)) {
            throw failure3({ method: pkg.name, path, reason: "Only unique normalized runtime file paths are supported." });
          }
          paths.add(path);
          files2[`${pkg.name}/${path}`] = Buffer.from(file.content, "utf8");
        }
        if (!paths.has("SKILL.md") || paths.size !== pkg.manifest.length || pkg.manifest.some((file) => !paths.has(file.path))) {
          throw failure3({ method: pkg.name, reason: "The shared runtime manifest and retained files are incomplete or inconsistent." });
        }
      }
      return files2;
    },
    catch: failure3
  });
  const catalog = yield* Effect15.tryPromise({
    try: () => SkillsExtension.load(memorySkillFiles(files), {
      prefix: "madewell/brainstorm",
      strict: true,
      cacheHint: { ttlMs: 0, cacheScope: "private" },
      // Keep the SDK's 512-file / 16-MiB per-skill limits. Even warnings
      // outside strict validation fail closed without console output.
      onWarning: (warning) => {
        throw failure3({ problems: [warning] });
      }
    }),
    catch: failure3
  });
  return yield* Effect15.try({
    try: () => {
      if (catalog.entries.length !== packages.length) throw failure3({ reason: "The SDK catalog does not contain exactly the approved methods." });
      for (const pkg of packages) {
        const base = `skill://madewell/brainstorm/${pkg.name}/`;
        const entry = catalog.entries.find((entry2) => entry2.uri === `${base}SKILL.md`);
        if (!entry || !isDeepStrictEqual(entry.frontmatter, JSON.parse(JSON.stringify(pkg.frontmatter))) || !Array.isArray(entry.resources) || entry.resources.length !== pkg.files.length) {
          throw failure3({ method: pkg.name, reason: "The SDK changed frontmatter or omitted runtime manifest entries." });
        }
        for (const file of pkg.files) {
          const uri = base + file.path.split("/").map(encodeURIComponent).join("/");
          const resource = entry.resources.find((resource2) => resource2.uri === uri);
          const manifested = pkg.manifest.find((manifested2) => manifested2.path === file.path);
          if (!resource || resource.size !== file.bytes || resource.digest !== `sha256:${file.sha256}` || !manifested || manifested.bytes !== file.bytes || manifested.sha256 !== file.sha256) {
            throw failure3({ method: pkg.name, path: file.path, reason: "The bytes offered by the SDK differ from the shared approved pin." });
          }
        }
      }
      return catalog;
    },
    catch: failure3
  });
});

// src/mcp.ts
var configurationRecovery = [{
  run: "node src/mcp.ts --root <ABSOLUTE_ROOT> --store <EXISTING_SELECTED_STORE>",
  why: "Inspect and correct the explicit root/Store selection and filesystem access before reconnecting (or use dist/mcp.mjs for the bundle). For existing work select its original Store; a read never initializes a missing Store. Keep any telemetry destination separate. Preserve pending mutation requestId/body and inspect current work before deciding how to recover uncertain effects; do not automatically create work or retry with a new ID."
}];
var failure4 = (cause) => cause instanceof MadeWellError ? cause : new MadeWellError({
  code: "mcp_failed",
  message: "The local Made Well MCP adapter failed.",
  context: { reason: String(cause) },
  next: configurationRecovery
});
var report = (error) => {
  process.stderr.write(JSON.stringify(errorJson(error)) + "\n");
  process.exitCode = 1;
};
var trySync = (run) => Effect16.try({ try: run, catch: failure4 });
var tryPromise = (run) => Effect16.tryPromise({ try: run, catch: failure4 });
var requestStoreLayer = (path, readOnly, assertStoreSeparation) => Layer8.effect(Store, Effect16.acquireRelease(
  Effect16.clockWith((clock) => trySync(() => {
    if (readOnly) return openReadOnlyStore(path);
    assertStoreSeparation();
    return openStore(path, { now: () => clock.currentTimeMillisUnsafe() });
  })),
  (store) => trySync(() => store.close()).pipe(Effect16.catch((error) => Effect16.sync(() => report(error))))
));
var ItemId = z6.number().int().positive().max(Number.MAX_SAFE_INTEGER);
var Revision = z6.string().regex(/^[a-f0-9]{64}$/);
var BrainstormCatalogOutput = z6.object({
  schemaVersion: z6.literal(1),
  root: z6.string(),
  component: z6.literal("/brainstorm"),
  defaultMethods: z6.array(z6.string()),
  defaultEffort: z6.literal("light"),
  methods: z6.array(z6.object({ name: z6.string(), default: z6.boolean(), availability: z6.literal("validated-on-selection") })),
  effort: z6.object({ light: z6.literal("free"), focused: z6.literal("trusted-policy-required"), deep: z6.literal("trusted-policy-required") }),
  accessPolicy: z6.string(),
  configuration: z6.string(),
  resource: z6.literal("madewell://brainstorm/catalog"),
  capabilities: z6.object({
    materialRoot: z6.string(),
    materialAccess: z6.literal("captured-source-and-pinned-selected-packages-only"),
    managedEffort: z6.array(z6.string()),
    execution: z6.literal(false),
    promotion: z6.literal(false),
    workerLaunch: z6.literal(false),
    network: z6.literal(false),
    arbitraryFileRead: z6.literal(false),
    providerInference: z6.literal(false),
    nativeSkills: z6.literal(false)
  })
});
var ResourceOutput = z6.object({ uri: z6.string(), mimeType: z6.string() }).passthrough();
var FileOutput = z6.object({ path: z6.string(), bytes: z6.number().int().nonnegative(), sha256: Revision, content: z6.string() }).passthrough();
var PriorInputOutput = z6.object({ handoffId: z6.string(), actor: BrainstormActor, context: z6.string() });
var BrainstormPackageOutput = z6.object({
  name: z6.string(),
  identity: Revision,
  origin: z6.string(),
  instructions: z6.string(),
  manifest: z6.array(FileOutput.omit({ content: true })),
  files: z6.array(FileOutput),
  frontmatter: z6.record(z6.string(), z6.unknown())
}).passthrough();
var BrainstormRecordedOutput = z6.object({
  id: z6.string(),
  handoffId: z6.string(),
  at: z6.string(),
  actor: BrainstormActor,
  validation: z6.literal("shape-accepted-not-independently-verified"),
  result: BrainstormResult
});
var EffortAuthorizationOutput = z6.object({ allowed: z6.literal(true), provenance: z6.string(), binding: z6.object({
  root: z6.string(),
  storeScope: z6.string(),
  revision: Revision,
  occurrence: z6.string(),
  methodIdentity: z6.string(),
  sourceIdentity: z6.string(),
  recipeDigest: Revision
}) });
var BrainstormHandoffOutput = z6.object({
  id: z6.string(),
  itemId: ItemId,
  at: z6.string(),
  actor: BrainstormActor,
  component: z6.literal("/brainstorm"),
  source: z6.string(),
  context: z6.string().nullable(),
  title: z6.string(),
  objective: z6.string(),
  methods: z6.array(z6.string()),
  packages: z6.array(BrainstormPackageOutput),
  priorInputs: z6.array(PriorInputOutput),
  priorResults: z6.array(BrainstormRecordedOutput),
  requestedEffort: z6.unknown(),
  effectiveEffort: z6.string(),
  outputLength: z6.string().nullable(),
  recipe: ResolvedEffort.optional(),
  effortAuthorization: EffortAuthorizationOutput.optional()
}).passthrough();
var ComponentOutput = z6.object({ address: z6.string(), id: z6.string(), identity: Revision, input: z6.string(), output: z6.string() }).passthrough();
var SkillSelectionOutput = z6.object({
  name: z6.string(),
  identity: Revision,
  origin: z6.string(),
  instructions: z6.string(),
  frontmatter: z6.record(z6.string(), z6.unknown()),
  manifest: z6.array(FileOutput.omit({ content: true })),
  scope: z6.literal("runtime").optional()
});
var ResolvedComponentOutput = ComponentOutput.extend({
  purpose: z6.string(),
  origin: z6.string(),
  constraints: z6.record(z6.string(), z6.object({ value: z6.union([z6.string(), z6.number(), z6.boolean()]), origins: z6.array(z6.string()) })),
  method: z6.discriminatedUnion("kind", [
    z6.object({ kind: z6.literal("builtin"), origin: z6.string(), identity: Revision, definition: z6.record(z6.string(), z6.unknown()) }),
    z6.object({
      kind: z6.literal("skill"),
      origin: z6.string(),
      bindingOrigin: z6.string(),
      identity: Revision,
      package: SkillSelectionOutput,
      companions: z6.array(SkillSelectionOutput).optional(),
      args: z6.record(z6.string(), z6.unknown())
    })
  ]).optional(),
  get children() {
    return z6.array(ResolvedComponentOutput).optional();
  },
  wiring: z6.object({ inputs: z6.record(z6.string(), z6.string()), output: z6.string() }).optional()
});
var CompositionInspectionOutput = z6.object({
  schemaVersion: z6.literal(1),
  identity: Revision,
  complete: z6.boolean(),
  root: ResolvedComponentOutput,
  effort: ResolvedEffort.shape.expansions,
  diagnostics: z6.array(z6.object({ code: z6.literal("method_unavailable"), address: z6.string(), message: z6.string() }))
});
var PortablePackagesOutput = z6.record(z6.string(), z6.array(FileOutput.extend({ encoding: z6.enum(["utf8", "base64"]) })));
var PortableRecordedOutput = z6.object({
  id: z6.string(),
  handoffId: z6.string(),
  at: z6.string(),
  actor: BrainstormActor,
  address: z6.string(),
  output: z6.string(),
  validation: z6.literal("contract-accepted-not-independently-verified"),
  result: PortableResult
});
var PortableHandoffOutput = z6.object({
  id: z6.string(),
  at: z6.string(),
  actor: BrainstormActor,
  node: ComponentOutput,
  source: z6.string(),
  context: z6.string().nullable(),
  priorInputs: z6.array(PriorInputOutput),
  priorResults: z6.array(PortableRecordedOutput),
  packages: PortablePackagesOutput,
  priorExchanges: z6.array(Exchange).optional(),
  requestedEffort: z6.unknown(),
  effectiveEffort: z6.string(),
  outputLength: z6.string().nullable(),
  recipe: ResolvedEffort.optional(),
  effortAuthorization: EffortAuthorizationOutput.optional(),
  contributionSchema: z6.record(z6.string(), z6.unknown()).nullable(),
  framing: z6.string()
});
var SnapshotFields = {
  itemId: ItemId,
  revision: Revision,
  root: z6.string(),
  source: z6.string(),
  title: z6.string(),
  objective: z6.string(),
  status: z6.string(),
  owner: z6.string(),
  resources: z6.array(ResourceOutput),
  executionAuthorized: z6.literal(false)
};
var BrainstormSnapshotOutput = z6.object({
  ...SnapshotFields,
  promotionAuthorized: z6.literal(false),
  brainstorm: z6.object({
    version: z6.literal(1),
    root: z6.string(),
    source: z6.string(),
    title: z6.string(),
    objective: z6.string(),
    capturedBy: BrainstormActor,
    packages: z6.array(BrainstormPackageOutput),
    handoffs: z6.array(BrainstormHandoffOutput),
    results: z6.array(BrainstormRecordedOutput)
  })
}).passthrough();
var PortableSnapshotOutput = z6.object({
  ...SnapshotFields,
  independentlyVerified: z6.literal(false),
  activity: z6.literal("not-running"),
  nextAction: z6.string(),
  portable: z6.object({
    version: z6.literal(1),
    root: z6.string(),
    selection: z6.object({
      schemaVersion: z6.literal(1),
      identity: Revision,
      complete: z6.boolean(),
      root: ComponentOutput,
      effort: ResolvedEffort.shape.expansions,
      diagnostics: z6.array(z6.object({ code: z6.literal("method_unavailable"), address: z6.string(), message: z6.string() }))
    }),
    packages: PortablePackagesOutput,
    handoffs: z6.array(PortableHandoffOutput),
    results: z6.array(PortableRecordedOutput),
    candidates: z6.array(ItemId),
    exchanges: z6.record(z6.string(), Exchange).optional()
  })
}).passthrough();
var PromotionOutput = z6.object({ selected: z6.array(z6.object({
  itemId: ItemId,
  revision: Revision,
  title: z6.string(),
  prerequisites: z6.array(z6.object({ itemId: ItemId, selected: z6.boolean(), completed: z6.boolean() }))
})), executionAuthorized: z6.literal(false), implicitPrerequisites: z6.literal(false) });
var serveMcp = Effect16.fn("mw.serveMcp")(function* (configuration) {
  const config = yield* trySync(() => {
    if (!isAbsolute4(configuration.root) || !isAbsolute4(configuration.store) || configuration.telemetryFile !== void 0 && !isAbsolute4(configuration.telemetryFile)) {
      throw new MadeWellError({ code: "mcp_failed", message: "Supply explicit absolute --root, --store and optional --telemetry-file paths.", context: {}, next: configurationRecovery });
    }
    assertTelemetryStoreSeparation(configuration.store, configuration.telemetryFile);
    return { ...configuration, root: validateGrantedRoot(configuration.root) };
  });
  const telemetry2 = yield* localMcpTelemetry(config.store, config.telemetryFile);
  const policy = yield* currentManagedEffortAccess;
  const skills = config.skills ? yield* acquireBrainstormSkills(pinPackage) : void 0;
  const active = /* @__PURE__ */ new Set();
  let accepting = true;
  const run = (effect) => {
    const promise = Effect16.runPromise(effect);
    active.add(promise);
    void promise.then(() => active.delete(promise), () => active.delete(promise));
    return promise;
  };
  const service = Layer8.merge(brainstormLayer({ root: config.root }), portableWorkLayer({ root: config.root }));
  const execute = (effect, access) => Effect16.suspend(() => accepting ? Effect16.scoped(effect.pipe(Effect16.provide(service), Effect16.provide(requestStoreLayer(config.store, access === "read", telemetry2.assertStoreSeparation)), Effect16.provideService(ManagedEffortAccess, policy))) : Effect16.fail(failure4("The stdio connection is closing; no Store was acquired.")));
  const respond = (effect) => run(effect.pipe(Effect16.catchCause((cause) => Effect16.fail(failure4(Cause.squash(cause)))), Effect16.match({
    onSuccess: (value) => ({ content: [{ type: "text", text: JSON.stringify(value) }], structuredContent: { ...value } }),
    onFailure: (error) => ({ isError: true, content: [{ type: "text", text: JSON.stringify(errorJson(error)) }] })
  })));
  const tool = (effect, access) => respond(execute(effect, access));
  const makeServer = () => {
    const server = new McpServer({ name: "madewell", version: "0.0.0" }, {
      cacheHints: { "resources/read": { ttlMs: 0, cacheScope: "private" } }
    });
    server.server.onerror = (error) => {
      process.stderr.write(JSON.stringify(errorJson(failure4(error))) + "\n");
    };
    server.registerTool("inspect_composition", {
      description: "Resolve the live selected composition before capture within the explicit startup root. Optional component/config/override use the existing resolver; no caller root override or Store access. Returns selected instructions, origins, contracts and full source manifests, not durable-runtime payloads or execution/activation/acceptance. Missing canonical methods remain visible diagnostics.",
      inputSchema: CapturePortableInput.pick({ component: true, config: true, override: true }).partial(),
      outputSchema: CompositionInspectionOutput,
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false }
    }, (input) => respond(inspectComposition({ ...input, root: config.root })));
    server.registerTool("catalog_brainstorm", {
      description: "List selectable shipped Brainstorm methods and actual local capabilities without loading every instruction body or opening storage.",
      inputSchema: CatalogBrainstormInput,
      outputSchema: BrainstormCatalogOutput,
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false }
    }, (input) => respond(Effect16.flatMap(Brainstorm, (service2) => service2.catalog(input)).pipe(Effect16.provide(service))));
    server.registerTool("capture_brainstorm", {
      description: "Save exact rough source as external Brainstorm work and pin the default entrypoint/posture. No intake questionnaire, worker or execution. Reuse requestId and exact input after an uncertain response.",
      inputSchema: CaptureBrainstormInput,
      outputSchema: BrainstormSnapshotOutput,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false }
    }, (input) => tool(Effect16.flatMap(Brainstorm, (service2) => service2.capture(input)), "write"));
    server.registerTool("inspect_brainstorm", {
      description: "Read exact source, pinned packages, handoff/input history and attributed results for Brainstorm work in the startup root. Does not advance work.",
      inputSchema: InspectBrainstormInput,
      outputSchema: BrainstormSnapshotOutput,
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false }
    }, (input) => tool(Effect16.flatMap(Brainstorm, (service2) => service2.inspect(input)), "read"));
    server.registerTool("prepare_brainstorm", {
      description: "Save a pinned Brainstorm recipe at the supplied revision. Effort defaults to free Light; authored Focused/Deep require current trusted host access, unavailable by default. Context retains exact turn material. Omitted methods/outputLength retain prior selections; explicit methods add specialists to the default pair. No execution or purchase.",
      inputSchema: PrepareBrainstormInput,
      outputSchema: BrainstormSnapshotOutput.extend({ handoff: BrainstormHandoffOutput }),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false }
    }, (input) => tool(Effect16.flatMap(Brainstorm, (service2) => service2.prepare(input)), "write"));
    server.registerTool("record_brainstorm", {
      description: "Save the exact artifact and attributed performed work for the latest prepared handoff, bounded by its authorized recipe. Recording stays available after managed access changes. Shape acceptance is not independent verification, completion, promotion or execution authority.",
      inputSchema: RecordBrainstormInput,
      outputSchema: BrainstormSnapshotOutput.extend({ recorded: BrainstormRecordedOutput }),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false }
    }, (input) => tool(Effect16.flatMap(Brainstorm, (service2) => service2.record(input)), "write"));
    server.registerTool("capture_work", {
      description: "Capture exact source and explicitly selected component/configuration as non-executing external work. Pin selected method instructions and supporting files, including the canonical Landing return when selected. Missing methods fail visibly. Reuse requestId and exact body after an uncertain response.",
      inputSchema: CapturePortableInput,
      outputSchema: PortableSnapshotOutput,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false }
    }, (input) => tool(Effect16.flatMap(PortableWork, (service2) => service2.capture(input)), "write"));
    server.registerTool("inspect_work", {
      description: "Read root-scoped saved portable work, exact source, method selection, handoffs, attributed results and candidate IDs. Does not advance work or establish independent acceptance.",
      inputSchema: InspectPortableInput,
      outputSchema: PortableSnapshotOutput,
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false }
    }, (input) => tool(Effect16.flatMap(PortableWork, (service2) => service2.inspect(input)), "read"));
    server.registerTool("prepare_work", {
      description: "Save the next selected occurrence with its pinned authored effort recipe, exact context and wired prior results. Non-Light managed recipes require trusted host access, unavailable by default. A method without declared variants gains none. Preparation freezes the occurrence; recover pending handoffs rather than duplicating them. No performer or external action is invoked.",
      inputSchema: PreparePortableInput,
      outputSchema: PortableSnapshotOutput.extend({ handoff: PortableHandoffOutput }),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false }
    }, (input) => tool(Effect16.flatMap(PortableWork, (service2) => service2.prepare(input)), "write"));
    server.registerTool("exchange_work", {
      description: "Save attributed recipient questions, sender answers or confirmation for the pending fixed handoff. Each answered sender batch counts once; unresolved questions after three answers hold for explicit operator resolution and recipient confirmation. Labels are local attribution, not authentication. No performer, external action or other blocker release.",
      inputSchema: ExchangePortableInput,
      outputSchema: PortableSnapshotOutput.extend({ exchange: Exchange }),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false }
    }, (input) => tool(Effect16.flatMap(PortableWork, (service2) => service2.exchange(input)), "write"));
    server.registerTool("record_work", {
      description: "Retain an attributed artifact for the pending handoff. Declared Discovery contracts enforce contribution conservation; confirm creates candidates, never selects or executes them. Contract acceptance is not semantic truth, independent verification or task completion.",
      inputSchema: RecordPortableInput,
      outputSchema: PortableSnapshotOutput.extend({ recorded: PortableRecordedOutput }),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false }
    }, (input) => tool(Effect16.flatMap(PortableWork, (service2) => service2.record(input)), "write"));
    server.registerTool("preview_work", {
      description: "Preview exactly the explicit candidate IDs, their current revisions and prerequisite status. Never adds prerequisites, selects work or grants execution permission.",
      inputSchema: PreviewPortableInput,
      outputSchema: PortableSnapshotOutput.extend({ promotion: PromotionOutput }),
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false }
    }, (input) => tool(Effect16.flatMap(PortableWork, (service2) => service2.preview(input)), "read"));
    server.registerTool("promote_work", {
      description: "Select exactly the explicit candidate IDs using current parent and candidate revisions. Selected work remains external and non-dispatching even when executable defaults exist. No implicit prerequisites or execution.",
      inputSchema: PromotePortableInput,
      outputSchema: PortableSnapshotOutput.extend({ promotion: PromotionOutput }),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false }
    }, (input) => tool(Effect16.flatMap(PortableWork, (service2) => service2.promote(input)), "write"));
    server.registerTool("replace_work", {
      description: "Explicitly re-resolve compatible structure before any preparation, or compatible never-prepared future methods or subtrees afterward, using selected configuration/override and a saved reason. Prepared occurrences, enclosing contracts/wiring, prior handoffs and results cannot be rewritten. No silent library refresh.",
      inputSchema: ReplacePortableInput,
      outputSchema: PortableSnapshotOutput,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false }
    }, (input) => tool(Effect16.flatMap(PortableWork, (service2) => service2.replace(input)), "write"));
    const read = async (uri) => {
      const effect = uri.href === "madewell://brainstorm/catalog" ? Effect16.flatMap(Brainstorm, (service2) => service2.catalog()).pipe(Effect16.provide(service)) : uri.href.startsWith("madewell://work/") ? execute(Effect16.flatMap(PortableWork, (service2) => service2.readResource(uri.href)), "read") : execute(Effect16.flatMap(Brainstorm, (service2) => service2.readResource(uri.href)), "read");
      const result = await run(effect.pipe(Effect16.catchCause((cause) => Effect16.fail(failure4(Cause.squash(cause)))), Effect16.match({
        onSuccess: (value) => ({ ok: true, value }),
        onFailure: (error) => ({ ok: false, error })
      })));
      if (!result.ok) throw new ResourceNotFoundError(uri.href, JSON.stringify(errorJson(result.error)));
      return { contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(result.value) }] };
    };
    server.registerResource("brainstorm-catalog", "madewell://brainstorm/catalog", { mimeType: "application/json", description: "Shipped method names and actual capabilities, not native Skills activation." }, read);
    server.registerResource("brainstorm-saved-material", new ResourceTemplate("madewell://brainstorm/items/{itemId}/{kind}", { list: void 0 }), {
      mimeType: "application/json",
      description: "Root-scoped saved source, handoffs, results or packages; kind is exactly source, handoffs, results or packages."
    }, read);
    server.registerResource("brainstorm-saved-entry", new ResourceTemplate("madewell://brainstorm/items/{itemId}/{kind}/{identity}", { list: void 0 }), {
      mimeType: "application/json",
      description: "Root-scoped handoffs/{handoffId} or packages/{packageIdentity}, including saved supporting files. No filesystem path reads."
    }, read);
    server.registerResource("work-saved-material", new ResourceTemplate("madewell://work/items/{itemId}/{kind}", { list: void 0 }), {
      mimeType: "application/json",
      description: "Root-scoped saved source, selection, handoffs, results, packages, exchanges or refusals. Exact retained material only; no live filesystem reads."
    }, read);
    skills?.attach(server);
    return server;
  };
  let closed = false;
  let complete;
  const finish = () => {
    closed = true;
    complete?.();
  };
  yield* Effect16.acquireRelease(trySync(() => {
    process.once("SIGINT", finish);
    process.once("SIGTERM", finish);
  }), () => Effect16.sync(() => {
    process.removeListener("SIGINT", finish);
    process.removeListener("SIGTERM", finish);
  }));
  const transport = yield* trySync(() => new StdioServerTransport());
  const closeTransport = transport.close.bind(transport), startTransport = transport.start.bind(transport);
  transport.close = async () => {
    try {
      await closeTransport();
    } finally {
      finish();
    }
  };
  transport.start = async () => {
    try {
      await startTransport();
    } catch (cause) {
      finish();
      throw cause;
    }
  };
  yield* trySync(() => telemetry2.instrument(transport));
  yield* Effect16.acquireRelease(
    trySync(() => serveStdio(makeServer, { transport, onerror: (error) => {
      process.stderr.write(JSON.stringify(errorJson(failure4(error))) + "\n");
    } })),
    (handle) => tryPromise(async () => {
      accepting = false;
      try {
        await handle.close();
      } finally {
        await Promise.allSettled([...active]);
      }
    }).pipe(Effect16.catch((error) => Effect16.sync(() => report(error))))
  );
  yield* Effect16.callback((resume) => {
    complete = () => resume(Effect16.void);
    if (closed) complete();
  });
});
var mcpMain = Effect16.fn("mw.mcpMain")(function* (args = process.argv.slice(2)) {
  const configuration = yield* trySync(() => {
    const { values } = parseArgs({ args: [...args], options: { root: { type: "string" }, store: { type: "string" }, "telemetry-file": { type: "string" }, skills: { type: "boolean", default: false } }, allowPositionals: false, strict: true });
    if (!values.root || !values.store) throw failure4("Both --root ABSOLUTE and --store ABSOLUTE are required.");
    return { root: values.root, store: values.store, telemetryFile: values["telemetry-file"], skills: values.skills };
  });
  yield* serveMcp(configuration);
});
await Effect16.runPromise(Effect16.scoped(Effect16.gen(function* () {
  const entry = yield* trySync(() => process.argv[1] !== void 0 && realpathSync3(resolve7(process.argv[1])) === fileURLToPath4(import.meta.url));
  if (entry) yield* mcpMain();
})).pipe(Effect16.matchCause({
  onSuccess: () => void 0,
  onFailure: (cause) => report(failure4(Cause.squash(cause)))
})));
export {
  BrainstormSnapshotOutput,
  PortableSnapshotOutput,
  mcpMain,
  serveMcp
};

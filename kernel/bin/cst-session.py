#!/usr/bin/env python3
"""Constellation session execution door. JSON request on stdin, JSON result on stdout.

Work position remains stock/bench/finished. This file owns execution within one
session, not piece position. No service, agent runtime, or model dependency.
"""
import argparse
import copy
import fcntl
import hashlib
import json
import math
import os
from pathlib import Path
import re
import signal
import stat
import subprocess
import sys
import tempfile
import time
import uuid
from contextlib import contextmanager

PHASES = ("ideate", "plan", "implement", "verify")


class Refused(Exception):
    pass


def require(condition, message):
    if not condition:
        raise Refused(message)


def identifier(value):
    require(isinstance(value, str) and re.fullmatch(r"[a-zA-Z0-9_-]{1,80}", value), "invalid identifier")
    return value


def text(value):
    require(isinstance(value, str) and value.strip(), "nonempty text required")
    return value.strip()


def alive(pid):
    if not pid:
        return False
    try:
        os.kill(pid, 0)
        return True
    except ProcessLookupError:
        return False
    except PermissionError:
        return True


class Session:
    def __init__(self, root, name):
        self.root = Path(root).resolve()
        require((self.root / ".constellation").is_dir(), "repository has no .constellation directory")
        self.directory = self.root / ".constellation" / "sessions"
        self.name = identifier(name)
        self.path = self.directory / (self.name + ".json")
        require(self.directory.resolve().is_relative_to(self.root), "session directory escapes repository")
        require(not self.path.is_symlink(), "session record cannot be a symlink")

    def git_tracking(self, relative):
        relative = os.path.normpath(relative)
        if not (self.root / '.git').exists():
            return [], False
        pathspec = ':(literal)' + relative
        index = subprocess.run(['git', 'ls-files', '--stage', '-z', '--', pathspec],
                               cwd=self.root, capture_output=True, text=True)
        require(index.returncode == 0, 'cannot inspect Git index: ' + index.stderr.strip())
        entries = [entry.partition(chr(9))[0].split() for entry in index.stdout.split(chr(0))
                   if entry and entry.partition(chr(9))[2] == relative]
        head = subprocess.run(['git', 'cat-file', '-e', 'HEAD:' + relative],
                              cwd=self.root, capture_output=True)
        return entries, head.returncode == 0

    def staged_proofs(self, state):
        for proof in self.proofs(state):
            entries, in_head = self.git_tracking(proof['path'])
            tracked = proof.get('tracked')
            require(isinstance(tracked, bool) or entries or in_head,
                    'tracking provenance missing; retry from the earliest affected phase: ' + proof['path'])
            if tracked or entries or in_head:
                require(len(entries) == 1 and entries[0][2] == '0',
                        'tracked evidence deleted or unmerged in index: ' + proof['path'])
                require(entries[0][0] in ('100644', '100755') and
                        not (self.root / proof['path']).is_symlink(),
                        'tracked evidence type conflict (regular file required): ' + proof['path'])
                blob = subprocess.run(['git', 'cat-file', 'blob', entries[0][1]],
                                      cwd=self.root, capture_output=True)
                require(blob.returncode == 0 and hashlib.sha256(blob.stdout).hexdigest() == proof['sha256'],
                        'staged evidence differs: ' + proof['path'])

    def needs_provenance(self, state):
        return any('tracked' not in proof for proof in self.proofs(state))

    def artifact(self, relative, capture_tracking=True):
        require(isinstance(relative, str) and relative and not Path(relative).is_absolute(), "artifact must be repository-relative")
        path = (self.root / relative).resolve()
        require(path.is_relative_to(self.root) and path.is_file(), "artifact absent or outside repository: " + relative)
        proof = {"path": relative, "sha256": hashlib.sha256(path.read_bytes()).hexdigest()}
        if capture_tracking:
            entries, in_head = self.git_tracking(relative)
            proof['tracked'] = bool(entries or in_head)
        return proof

    def fresh(self, proofs):
        for proof in proofs:
            require(self.artifact(proof["path"], capture_tracking=False)["sha256"] == proof["sha256"], "evidence changed: " + proof["path"])

    def proofs(self, state):
        for phase in state['phases'].values():
            yield from phase.get('artifacts', [])
            for step in phase['steps'].values():
                yield from step.get('evidence', [])

    def fresh_state(self, state):
        self.fresh(self.proofs(state))

    def proof_status(self, state):
        try:
            self.fresh_state(state)
            return {'valid': True, 'error': None}
        except (Refused, OSError) as error:
            return {'valid': False, 'error': str(error)}

    def makers(self, state):
        # Failed commands may have written too; retry never erases cycles.
        phases = [state['phases']] + [cycle['phases'] for cycle in state['cycles']]
        return {step['actor'] for phase in phases
                for step in phase['implement']['steps'].values()
                if 'argv' in step and 'actor' in step}

    def claims(self, missing=()):
        records = []
        for path in sorted(self.directory.glob('*.json')):
            session = Session(self.root, path.stem)
            state = session.load()
            require(state['piece'] in missing or (self.root / state['piece']).is_file(),
                    'claimed piece missing; reconcile explicitly: ' + path.stem)
            records.append((session, state))
        return records

    def open_piece(self, state):
        path = self.root / state['piece']
        require(path.is_file(), 'claimed piece missing; reconcile explicitly')
        require(path.parent.name != 'finished', 'finished pieces cannot reopen')

    def accepted(self, state):
        require(state['status'] == 'done', 'bound finish needs completed execution')
        for phase in state['phases'].values():
            require(phase['accepted'] and phase['steps'] and
                    all(step['status'] == 'done' for step in phase['steps'].values()),
                    'bound finish needs accepted checklists')
        makers = self.makers(state)
        verify = state['phases']['verify']
        require(verify['accepted']['actor'] not in makers and
                all(step['actor'] not in makers for step in verify['steps'].values()),
                'bound finish needs independent acceptance')
        self.fresh_state(state)

    @contextmanager
    def locked(self, starting=False):
        self.directory.mkdir(parents=True, exist_ok=True)
        lock_name = ".start.lock"  # claims, movement and mutations share one lock
        with (self.directory / lock_name).open("a") as lock:
            fcntl.flock(lock, fcntl.LOCK_EX)
            yield

    def load(self):
        require(self.path.is_file(), "session does not exist")
        state = json.loads(self.path.read_text())
        require(state.get("schema") == "constellation.session/v1", "unsupported session schema")
        return state

    def save(self, state, actor, event, detail=None):
        state["events"].append({"sequence": len(state["events"]) + 1, "at": time.time(),
                                "actor": actor, "event": event, "detail": detail or {}})
        fd, temp = tempfile.mkstemp(prefix=self.name + ".", dir=self.directory)
        try:
            with os.fdopen(fd, "w") as stream:
                json.dump(state, stream, indent=2)
                stream.write("\n")
                stream.flush()
                os.fsync(stream.fileno())
            os.replace(temp, self.path)
            directory_fd = os.open(self.directory, os.O_RDONLY)
            try:
                os.fsync(directory_fd)
            finally:
                os.close(directory_fd)
        finally:
            if os.path.exists(temp):
                os.unlink(temp)

    def active(self, state, actor):
        require(state["status"] == "active", "session is " + state["status"])
        require(state["actor"] == actor, "session belongs to another actor")
        require(time.time() < state["deadline"], "session time bound expired; stop and resume explicitly")
        self.open_piece(state)

    def current(self, state):
        return state["phases"][state["phase"]]

    def step(self, state, name):
        require(name in self.current(state)["steps"], "step does not exist in current phase")
        return self.current(state)["steps"][name]

    def ready(self, state, step):
        self.fresh_state(state)
        require(step["status"] == "pending", "step is not pending")
        require(not any(s["status"] == "running" for s in self.current(state)["steps"].values()), "another step is running")
        require(all(self.current(state)["steps"][d]["status"] == "done" for d in step["after"]), "step prerequisites are incomplete")
        for dependency in step["after"]:
            self.fresh(self.current(state)["steps"][dependency]["evidence"])

    def request(self, actor, request):
        actor = text(actor)
        op = request.get("op")
        supervisor = request.get("supervisor")
        require(supervisor is None or (isinstance(supervisor, int) and supervisor > 0), "invalid supervisor PID")
        if op == 'move':
            return self.host_move(actor, request)
        if op == "run":
            return self.run(actor, request)
        with self.locked(starting=op == "start"):
            if op == "start":
                require(not self.path.exists(), "session already exists; inspect or resume it")
                minutes = float(request.get("minutes", 60))
                require(0 < minutes <= 1440, "minutes must be between 0 and 1440")
                goal = text(request.get("goal"))
                piece = request.get("piece")
                if request.get("create_piece"):
                    require(isinstance(piece, str) and re.fullmatch(r"\.constellation/stock/[a-zA-Z0-9_-]{1,80}\.md", piece), "new pieces may arrive only in stock")
                    destination = self.root / piece
                    require(destination.resolve().is_relative_to(self.root), "piece path escapes repository")
                    destination.parent.mkdir(parents=True, exist_ok=True)
                    with destination.open("x") as stream:
                        stream.write("# " + goal + "\n")
                        stream.flush()
                        os.fsync(stream.fileno())
                self.artifact(piece)
                piece = str((self.root / piece).resolve().relative_to(self.root))
                for other_session, other in self.claims():
                    require(other['piece'] != piece, 'piece already bound; resume or reopen: ' + other_session.name)
                parts = Path(piece).parts
                require(parts[0] == ".constellation" and len(parts) > 2 and parts[1] in ("stock", "bench"), "session needs an open Constellation piece")
                state = {"schema": "constellation.session/v1", "id": self.name, "piece": piece,
                         "goal": goal, "actor": actor, "supervisor": supervisor, "status": "active",
                         "phase": "ideate", "deadline": time.time() + minutes * 60,
                         "phases": {p: {"steps": {}, "accepted": None} for p in PHASES},
                         "cycles": [], "events": []}
                self.save(state, actor, "started")
                return state
            state = self.load()
            if op == "show":
                view = copy.deepcopy(state)
                view['proof'] = self.proof_status(state)
                view['piece_exists'] = (self.root / state['piece']).is_file()
                view["expired"] = time.time() >= state["deadline"]
                for step in self.current(view)["steps"].values():
                    if step["status"] == "running":
                        step["controllerAlive"] = alive(step.get("controller"))
                        step["processAlive"] = alive(step.get("pid"))
                return view
            if op == "stop":
                require(state["actor"] == actor and state["status"] == "active", "only the active owner can stop")
                require(not any(s["status"] == "running" for s in self.current(state)["steps"].values()), "command running; cancel it or recover after its controller exits")
                state["status"] = "paused"
                self.save(state, actor, "stopped", {"reason": text(request.get("reason"))})
                return state
            if op == "recover":
                require(state["status"] == "active", "only an active interrupted session needs recovery")
                running = [s for s in self.current(state)["steps"].values() if s["status"] == "running"]
                owner_gone = state.get("supervisor") is not None and not alive(state["supervisor"])
                expired = time.time() >= state["deadline"]
                require(owner_gone or expired or (actor == state["actor"] and running), "owner is not known dead or expired; request an explicit handoff")
                require(all(not alive(s.get("controller")) and not alive(s.get("pid")) for s in running), "controller or command is still alive; cannot take over")
                for step in running:
                    step["status"] = "interrupted"
                state["status"] = "paused"
                self.save(state, actor, "recovered", {"reason": text(request.get("reason")), "sideEffects": "unknown; reconcile before repeating"})
                return state
            if op == "resume":
                require(state["status"] == "paused", "session must be stopped or recovered before takeover")
                minutes = float(request.get("minutes", 60))
                require(0 < minutes <= 1440, "invalid time bound")
                state["actor"], state["status"] = actor, "active"
                state["supervisor"] = supervisor
                state["deadline"] = time.time() + minutes * 60
                self.save(state, actor, "resumed", {"reason": text(request.get("reason"))})
                return state
            if op == 'reconcile':
                require(state['actor'] == actor, 'only the owner can reconcile')
                return self.reconcile(state, actor, request)
            if op == 'retry' and state['status'] == 'done':
                self.open_piece(state)
                require(not self.proof_status(state)['valid'] or self.needs_provenance(state),
                        'reopen requires stale proof or missing tracking provenance')
                if state['actor'] != actor:
                    require(state.get('supervisor') is not None and not alive(state['supervisor']),
                            'previous supervisor is not proven dead; request owner handoff')
                self.claims()
                minutes = float(request.get('minutes', 60))
                require(0 < minutes <= 1440, 'invalid time bound')
                state.update(status='active', actor=actor, deadline=time.time() + minutes * 60, supervisor=supervisor)
            self.active(state, actor)
            phase = self.current(state)
            if op == 'floor':
                require(state['phase'] in ('ideate', 'plan'), 'floor requires ideation or planning')
                piece = self.root / state['piece']
                require(piece.parent.name == 'stock' and not piece.is_symlink() and
                        piece.resolve().is_relative_to(self.root), 'floor edits only the bound stock piece')
                fields = [('making', 'Making'), ('not_making', 'Not making'),
                          ('done_when', 'Done when'), ('waits_on', 'Waits on')]
                lines = []
                for key, label in fields:
                    value = request.get(key)
                    require(isinstance(value, str) and not any(c in value for c in '\r\n\0'),
                            'floor fields must be single-line strings: ' + key)
                    require(key == 'waits_on' or value.strip(), 'nonempty floor field required: ' + key)
                    lines.append('**' + label + ':**' + (' ' + value.strip() if value.strip() else ''))
                prefixes = tuple('**' + label + ':**' for _, label in fields)
                content = '\n'.join(line for line in piece.read_text().splitlines()
                                    if not line.startswith(prefixes)).rstrip()
                mode = stat.S_IMODE(piece.stat().st_mode)
                fd, temp = tempfile.mkstemp(prefix='.' + piece.name + '.', dir=piece.parent)
                try:
                    with os.fdopen(fd, 'w') as stream:
                        stream.write(content + '\n\n' + '\n'.join(lines) + '\n')
                        stream.flush()
                        os.fchmod(stream.fileno(), mode)
                        os.fsync(stream.fileno())
                    os.replace(temp, piece)
                    directory_fd = os.open(piece.parent, os.O_RDONLY)
                    try:
                        os.fsync(directory_fd)
                    finally:
                        os.close(directory_fd)
                finally:
                    if os.path.exists(temp):
                        os.unlink(temp)
            elif op == "propose":
                target = request.get("phase", state["phase"])
                require(state["phase"] in ("ideate", "plan"), "new work requires planning; return to plan to change the checklist")
                require(target == state["phase"] or (state["phase"] == "plan" and target in ("implement", "verify")), "cannot propose into that phase")
                phase = state["phases"][target]
                name = identifier(request.get("step"))
                require(name not in phase["steps"], "step already exists")
                after = request.get("after", [])
                require(isinstance(after, list) and all(d in phase["steps"] for d in after), "prerequisites must name existing steps in this phase")
                phase["steps"][name] = {"title": text(request.get("title")), "expected": text(request.get("expected")),
                                         "after": after, "status": "pending", "evidence": []}
            elif op == "record":
                require(state["phase"] in ("ideate", "plan"), "implementation and verification results require executed commands")
                step = self.step(state, request.get("step"))
                self.ready(state, step)
                step.update(status="done", result=text(request.get("result")), actor=actor,
                            evidence=[self.artifact(p) for p in request.get("evidence", [])])
            elif op == "reject":
                require(not any(s["status"] == "running" for s in phase["steps"].values()), "cannot reject while a command is running")
                step = self.step(state, request.get("step"))
                step.update(status="failed", rejection={"actor": actor, "reason": text(request.get("reason")), "at": time.time()})
            elif op == "advance":
                require(phase["steps"] and all(s["status"] == "done" for s in phase["steps"].values()), "phase checklist is empty or incomplete")
                self.fresh_state(state)
                if state["phase"] == "plan":
                    require(state["phases"]["implement"]["steps"] and state["phases"]["verify"]["steps"], "planning must declare implementation steps and verification checks")
                if state["phase"] in ("implement", "verify"):
                    self.fresh(state["phases"]["implement"].get("artifacts", []))
                phase["accepted"] = {"actor": actor, "at": time.time(), "reason": text(request.get("reason"))}
                if state["phase"] == "implement":
                    artifacts = request.get("artifacts", [])
                    require(artifacts, "implementation must name its actual artifacts")
                    phase["artifacts"] = [self.artifact(p) for p in artifacts]
                if state["phase"] == "verify":
                    makers = self.makers(state)
                    require(actor not in makers, "maker cannot accept their own verification")
                    state["status"] = "done"
                else:
                    state["phase"] = PHASES[PHASES.index(state["phase"]) + 1]
            elif op == "retry":
                target = request.get("phase", "implement")
                require(target in PHASES and PHASES.index(target) <= PHASES.index(state["phase"]), "invalid retry phase")
                require(not any(s["status"] == "running" for s in phase["steps"].values()), "cannot retry while a step is running")
                stale = self.needs_provenance(state)
                try:
                    for p in state["phases"].values():
                        self.fresh(p.get("artifacts", []))
                        for step in p["steps"].values():
                            self.fresh(step["evidence"])
                except Refused:
                    stale = True
                require(stale or any(s["status"] in ("failed", "interrupted") for s in phase["steps"].values()), "retry requires failed, interrupted, or stale evidence")
                reason = text(request.get("reason"))
                # Stale upstream evidence requires retrying its phase, not only its dependents.
                for p in PHASES[:PHASES.index(target)]:
                    retained = {'phases': {p: state['phases'][p]}}
                    self.fresh_state(retained)
                    require(not self.needs_provenance(retained), 'retry must recapture tracking provenance in ' + p)
                state["cycles"].append({"at": time.time(), "reason": reason, "phases": copy.deepcopy(state["phases"])})
                for p in PHASES[PHASES.index(target):]:
                    old_steps = state["phases"][p]["steps"]
                    steps = {key: {**{k: s[k] for k in ("title", "expected", "after")}, "status": "pending", "evidence": []}
                             for key, s in old_steps.items()} if target in ("implement", "verify") else {}
                    state["phases"][p] = {"steps": steps, "accepted": None}
                state["phase"] = target
            else:
                raise Refused("unknown operation")
            self.save(state, actor, op, {k: v for k, v in request.items() if k != "op"})
            return state

    def reconcile(self, state, actor, request):
        require(not any(step['status'] == 'running' for phase in state['phases'].values()
                        for step in phase['steps'].values()), 'command running; cannot reconcile')
        reason = text(request.get('reason'))
        old, new = state['piece'], text(request.get('piece'))
        legal_move(old, new)
        require(not (self.root / old).exists(), 'old piece still exists')
        self.artifact(new)
        for _, other in self.claims(missing=(old,)):
            require(other['id'] == state['id'] or other['piece'] != new, 'destination already claimed')
        moved = rebound(state, old, new)
        if Path(new).parent.name == 'finished':
            self.accepted(moved)
        self.save(moved, actor, 'reconciled', {'from': old, 'to': new, 'reason': reason})
        return moved

    def host_move(self, actor, request):
        # Only existing C-door verbs; the host never accepts arbitrary argv here.
        with self.locked():
            state = self.load()
            require(state['actor'] == actor, 'session belongs to another actor')
            if state['status'] != 'done':
                self.active(state, actor)
                require(state['phase'] == 'implement', 'movement requires completed planning')
            action = request.get('action')
            require(action in ('bench', 'finish'), 'move action must be bench or finish')
            piece = Path(state['piece'])
            require(len(piece.parts) == 3 or (len(piece.parts) == 4 and piece.name == 'PIECE.md'),
                    'host move supports top-level pieces; nested pieces use the Git gate')
            slug = piece.parent.name if piece.name == 'PIECE.md' else piece.stem
            require((piece.parent.name == 'stock') if action == 'bench' else
                    (piece.parent.name == 'bench' or piece.name == 'PIECE.md'), 'piece is not at move source')
            if action == 'finish':
                committed = subprocess.run(['git', 'cat-file', '-e', 'HEAD:' + state['piece']],
                                           cwd=self.root, capture_output=True)
                require(committed.returncode == 0,
                        'commit the stock-to-bench position transition before finish; one move per commit')
            require(isinstance(request.get('break', False), bool), 'break must be boolean')
            argv = [str(Path(__file__).resolve().with_name('cst-move')), action, slug]
            if request.get('break', False):
                require(action == 'bench', 'break is only for bench')
                argv.append('--break')
        result = subprocess.run(argv, cwd=self.root, capture_output=True, text=True)
        require(result.returncode == 0, result.stderr.strip() or 'legal move refused')
        return self.request(actor, {'op': 'show'})

    def run(self, actor, request):
        argv = request.get("argv")
        require(isinstance(argv, list) and argv and all(isinstance(a, str) and "\0" not in a for a in argv), "argv must be a nonempty string array")
        name = request.get("step")
        with self.locked():
            state = self.load()
            self.active(state, actor)
            require(state["phase"] in ("implement", "verify"), "command execution is locked until ideation and planning are complete")
            step = self.step(state, name)
            self.ready(state, step)
            if state["phase"] == "verify":
                makers = self.makers(state)
                require(actor not in makers, "verification requires a different actor")
                self.fresh(state["phases"]["implement"]["artifacts"])
            timeout = min(float(request.get("timeout", 300)), state["deadline"] - time.time())
            require(math.isfinite(timeout) and timeout > 0, "timeout must be positive and finite")
            token = uuid.uuid4().hex
            log_dir = self.directory / self.name
            log_dir.mkdir(exist_ok=True)
            log = log_dir / (token + ".log")
            step.update(status="running", actor=actor, argv=argv, controller=os.getpid(), pid=None,
                        attempt=token, log=str(log.relative_to(self.root)), started=time.time())
            self.save(state, actor, "step_started", {"step": name, "attempt": token})
            try:
                fd = os.open(log, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
                with os.fdopen(fd, "w") as output:
                    process = subprocess.Popen(argv, cwd=self.root, stdout=output, stderr=subprocess.STDOUT, start_new_session=True)
                step["pid"] = process.pid
                self.save(state, actor, "process_started", {"step": name, "pid": process.pid})
            except OSError as error:
                step.update(status="failed", result=str(error), finished=time.time(), exit=None)
                self.save(state, actor, "step_failed", {"step": name})
                return state
        interrupted = False
        try:
            code = process.wait(timeout=timeout)
        except (subprocess.TimeoutExpired, KeyboardInterrupt):
            interrupted = True
            try:
                os.killpg(process.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
            process.wait()
            code = process.returncode
        with self.locked():
            state = self.load()
            step = self.step(state, name)
            require(step.get("attempt") == token, "execution ownership changed")
            status = "interrupted" if interrupted else "done" if code == 0 else "failed"
            evidence = [self.artifact(step["log"])]
            try:
                evidence += [self.artifact(p) for p in request.get("evidence", [])]
                self.fresh_state(state)
            except Refused as error:
                status = "failed"
                step["evidenceError"] = str(error)
            step.update(status=status, exit=code, evidence=evidence, finished=time.time())
            self.save(state, actor, "step_finished", {"step": name, "status": status, "exit": code})
            return state


def legal_move(old, new):
    for value in (old, new):
        require(isinstance(value, str) and not Path(value).is_absolute() and
                '..' not in Path(value).parts and value.startswith('.constellation/') and
                value.endswith('.md'), 'invalid piece path')
    path = Path(old)
    if path.parent.name == 'stock':
        base = path.parent.parent
        allowed = (base / 'bench' / path.name, base / 'bench' / path.stem / 'PIECE.md')
    elif path.parent.name == 'bench':
        allowed = (path.parent.parent / 'finished' / path.name,)
    elif path.name == 'PIECE.md' and path.parent.parent.name == 'bench':
        allowed = (path.parent.parent.parent / 'finished' / (path.parent.name + '.md'),)
    else:
        raise Refused('not a legal move source; no rewind')
    require(Path(new) in allowed, 'not a legal piece destination')


def rebound(state, old, new):
    state = copy.deepcopy(state)
    state['piece'] = new
    for phase in state['phases'].values():
        proofs = list(phase.get('artifacts', []))
        proofs += [proof for step in phase['steps'].values() for proof in step.get('evidence', [])]
        for proof in proofs:
            if proof['path'] == old:
                proof['path'] = new
    return state


def move(root, old, new, staged=False):
    legal_move(old, new)
    door = Session(root, 'movement')
    with door.locked():
        records = door.claims(missing=(old,) if staged else ())
        bound = [(session, state) for session, state in records if state['piece'] in (old, new)]
        for session, state in bound:
            require((staged and state['piece'] == new) or
                    not any(step['status'] == 'running' for phase in state['phases'].values()
                            for step in phase['steps'].values()), 'command running; move separately')
            if Path(new).parent.name == 'finished':
                candidate = rebound(state, old, new) if staged else state
                session.accepted(candidate)
                session.staged_proofs(candidate)
        if not staged:
            require(not (door.root / new).exists(), 'move destination exists')
            result = subprocess.run(['git', 'mv', '--', old, new], cwd=door.root, capture_output=True, text=True)
            require(result.returncode == 0, result.stderr.strip() or 'git mv refused')
        else:
            require(not (door.root / old).exists(), 'staged move still has its old working path')
            door.artifact(new)
        # Crash after Git moves leaves a missing-source claim: acquisition refuses until reconciliation.
        for session, state in bound:
            if state['piece'] == old:
                session.save(rebound(state, old, new), 'movement-door', 'piece_moved', {'from': old, 'to': new})
    return {'moved': new, 'bound': [session.name for session, _ in bound]}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", default=".")
    parser.add_argument("--session")
    parser.add_argument("--actor")
    movement = parser.add_mutually_exclusive_group()
    movement.add_argument('--move', nargs=2)
    movement.add_argument('--check-move', nargs=2)
    args = parser.parse_args()
    def interrupted(_signal, _frame):
        raise KeyboardInterrupt()
    signal.signal(signal.SIGTERM, interrupted)
    try:
        if args.move or args.check_move:
            result = move(args.root, *(args.move or args.check_move), staged=bool(args.check_move))
        else:
            result = Session(args.root, args.session).request(args.actor, json.load(sys.stdin))
        print(json.dumps(result, indent=2))
    except (Refused, ValueError, OSError, KeyError, TypeError) as error:
        print(json.dumps({"schema": "constellation.refused/v1", "error": str(error)}))
        if args.check_move:
            print('cst-session: ' + str(error), file=sys.stderr)
        return 5
    return 0


if __name__ == "__main__":
    sys.exit(main())

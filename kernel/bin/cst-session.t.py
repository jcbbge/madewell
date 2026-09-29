#!/usr/bin/env python3
"""Real filesystem/process tests. No model, service, or fake executor."""
import importlib.util
import json
import os
import select
from concurrent.futures import ThreadPoolExecutor
from contextlib import contextmanager
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import Mock, patch

MODULE = Path(__file__).with_name("cst-session.py")
spec = importlib.util.spec_from_file_location("cst_session", MODULE)
cst = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cst)


class ExecutionTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / ".constellation/bench").mkdir(parents=True)
        (self.root / ".constellation/bench/task.md").write_text("# A real fixture piece\n")
        self.actor = "maker"
        self.session = cst.Session(self.root, "test")
        self.call("start", piece=".constellation/bench/task.md", goal="Make a file and verify its contents")

    def call(self, op, **data):
        return self.session.request(self.actor, {"op": op, **data})

    def propose(self, name="step", **data):
        state = self.call("show")
        if state["phase"] in ("implement", "verify") and not data:
            self.assertIn(name, state["phases"][state["phase"]]["steps"], "execution uses the checklist declared during planning")
            return state
        return self.call("propose", step=name, title="Do the current act", expected="Recorded result", **data)

    def planned(self):
        for phase in ("ideate", "plan"):
            self.propose()
            self.call("record", step="step", result="Understand the goal" if phase == "ideate" else "Write output, then assert its contents")
            if phase == "plan":
                self.propose(phase="implement")
                self.propose(phase="verify")
            self.call("advance", reason="Required thinking is recorded")

    def implemented(self):
        self.planned()
        self.propose()
        self.call("run", step="step", argv=[sys.executable, "-c", "from pathlib import Path; Path('output').write_text('correct')"], evidence=["output"])
        self.call("advance", reason="Output exists", artifacts=["output"])

    def verifier(self):
        self.call("stop", reason="Hand off independent verification")
        self.actor = "reviewer"
        self.call("resume", reason="Inspect implementation and run acceptance tests")

    def test_no_phase_skip(self):
        with self.assertRaises(cst.Refused):
            self.call("advance", reason="Skip ideation")
        self.propose()
        with self.assertRaises(cst.Refused):
            self.call("run", step="step", argv=[sys.executable, "-c", "open('bad','w').write('bad')"])
        self.assertFalse((self.root / "bad").exists())

    def test_pending_plan_locks_implementation(self):
        self.propose()
        self.call("record", step="step", result="Goal and non-goals recorded")
        self.call("advance", reason="Ideation complete")
        self.propose()
        with self.assertRaises(cst.Refused):
            self.call("advance", reason="Plan not yet completed")
        self.assertEqual(self.call("show")["phase"], "plan")

    def test_dependencies(self):
        self.propose("first")
        self.propose("second", after=["first"])
        with self.assertRaises(cst.Refused):
            self.call("record", step="second", result="Out of order")
        self.call("record", step="first", result="First complete")
        self.call("record", step="second", result="Second complete")

    def test_unknown_dependency(self):
        with self.assertRaises(cst.Refused):
            self.propose(after=["nonexistent"])

    def test_real_execution_and_independent_completion(self):
        self.implemented()
        self.verifier()
        self.propose()
        self.call("run", step="step", argv=[sys.executable, "-c", "from pathlib import Path; assert Path('output').read_text() == 'correct'"])
        state = self.call("advance", reason="Real assertion passed against intended output")
        self.assertEqual(state["status"], "done")
        self.assertTrue((self.root / ".constellation/bench/task.md").exists(), "execution must not move the piece")
        with self.assertRaises(cst.Refused):
            self.call("propose", step="extra", title="After completion", expected="Refused")

    def test_self_verification_refused(self):
        self.implemented()
        self.propose()
        with self.assertRaises(cst.Refused):
            self.call("run", step="step", argv=[sys.executable, "-c", "pass"])

    def test_no_manual_test_success(self):
        self.implemented()
        self.verifier()
        self.propose()
        with self.assertRaises(cst.Refused):
            self.call("record", step="step", result="Trust me, tests passed")

    def test_implementation_requires_artifact(self):
        self.planned()
        self.propose()
        self.call("run", step="step", argv=[sys.executable, "-c", "pass"])
        with self.assertRaises(cst.Refused):
            self.call("advance", reason="No artifact exists")

    def test_failed_test_requires_new_attempt(self):
        self.implemented()
        self.verifier()
        self.propose()
        state = self.call("run", step="step", argv=[sys.executable, "-c", "raise SystemExit(7)"])
        self.assertEqual(state["phases"]["verify"]["steps"]["step"]["exit"], 7)
        with self.assertRaises(cst.Refused):
            self.call("advance", reason="Ignore failure")
        state = self.call("retry", phase="implement", reason="Repair failed behavior; retain failed attempt")
        self.assertEqual(state["phase"], "implement")
        self.assertEqual(state["cycles"][0]["phases"]["verify"]["steps"]["step"]["status"], "failed")
        self.assertTrue(all(s["status"] == "pending" for s in state["phases"]["verify"]["steps"].values()))

    def test_reviewer_can_reject_a_green_but_inadequate_check(self):
        self.implemented()
        self.verifier()
        self.call("run", step="step", argv=[sys.executable, "-c", "pass"])
        state = self.call("reject", step="step", reason="Exit zero did not demonstrate the required outcome")
        self.assertEqual(state["phases"]["verify"]["steps"]["step"]["exit"], 0)
        with self.assertRaises(cst.Refused):
            self.call("advance", reason="Cannot silently accept rejected evidence")
        state = self.call("retry", phase="plan", reason="Design an adequate check")
        self.assertEqual(state["phase"], "plan")

    def test_stale_artifact_invalidates_completion(self):
        self.implemented()
        self.verifier()
        self.propose()
        self.call("run", step="step", argv=[sys.executable, "-c", "pass"])
        (self.root / "output").write_text("changed after tests")
        with self.assertRaises(cst.Refused):
            self.call("advance", reason="Old green")

    def test_test_cannot_change_artifact(self):
        self.implemented()
        self.verifier()
        self.propose()
        state = self.call("run", step="step", argv=[sys.executable, "-c", "from pathlib import Path; Path('output').write_text('tampered')"])
        self.assertEqual(state["phases"]["verify"]["steps"]["step"]["status"], "failed")

    def test_timeout_is_durable_and_not_success(self):
        self.planned()
        self.propose()
        state = self.call("run", step="step", argv=[sys.executable, "-c", "import time; time.sleep(10)"], timeout=0.05)
        self.assertEqual(state["phases"]["implement"]["steps"]["step"]["status"], "interrupted")
        reopened = cst.Session(self.root, "test").request(self.actor, {"op": "show"})
        self.assertEqual(reopened["phases"], state["phases"])
        with self.assertRaises(cst.Refused):
            self.call("advance", reason="Time is up, pretend complete")

    def test_real_cli_restart_and_owner_fencing(self):
        self.propose()
        self.call("stop", reason="Session ends before thinking is recorded")
        command = [sys.executable, str(MODULE), "--root", str(self.root), "--session", "test", "--actor", "replacement"]
        result = subprocess.run(command, input=json.dumps({"op": "resume", "reason": "Explicit handoff"}), text=True, capture_output=True)
        self.assertEqual(result.returncode, 0, result.stdout)
        state = json.loads(result.stdout)
        self.assertEqual(state["phases"]["ideate"]["steps"]["step"]["status"], "pending")
        with self.assertRaises(cst.Refused):
            self.call("record", step="step", result="Old actor cannot continue")

    def test_duplicate_start_does_not_overwrite(self):
        before = self.session.path.read_bytes()
        with self.assertRaises(cst.Refused):
            self.call("start", piece=".constellation/bench/task.md", goal="Overwrite")
        self.assertEqual(before, self.session.path.read_bytes())

    def test_no_unplanned_implementation_step(self):
        self.planned()
        with self.assertRaises(cst.Refused):
            self.call("propose", step="surprise", title="Unplanned work", expected="Not approved")

    def test_invalid_timeout_leaves_step_pending(self):
        self.planned()
        with self.assertRaises(cst.Refused):
            self.call("run", step="step", argv=[sys.executable, "-c", "pass"], timeout=-1)
        self.assertEqual(self.call("show")["phases"]["implement"]["steps"]["step"]["status"], "pending")

    def test_stale_evidence_can_be_replanned(self):
        self.implemented()
        (self.root / "output").write_text("changed")
        state = self.call("retry", phase="plan", reason="Implementation changed; invalidate downstream approvals")
        self.assertEqual(state["phase"], "plan")
        self.assertEqual(len(state["cycles"]), 1)
        self.assertFalse(state["phases"]["implement"]["steps"])

    def test_same_piece_cannot_start_two_sessions(self):
        with self.assertRaises(cst.Refused):
            cst.Session(self.root, "duplicate").request("other", {"op": "start", "piece": ".constellation/bench/task.md", "goal": "Claim same work"})

    def test_cannot_recover_live_owner(self):
        with self.assertRaises(cst.Refused):
            self.session.request("other", {"op": "recover", "reason": "Steal live work"})

    def test_start_can_create_only_stock_material(self):
        other = cst.Session(self.root, "new")
        state = other.request("maker", {"op": "start", "piece": ".constellation/stock/new.md", "create_piece": True, "goal": "New commission"})
        self.assertEqual(state["phase"], "ideate")
        self.assertTrue((self.root / ".constellation/stock/new.md").is_file())
        with self.assertRaises(cst.Refused):
            cst.Session(self.root, "bad").request("maker", {"op": "start", "piece": ".constellation/bench/bad.md", "create_piece": True, "goal": "Skip stock"})

    def test_running_step_is_observable(self):
        self.planned()
        fifo = self.root / "ready"
        os.mkfifo(fifo)
        fd = os.open(fifo, os.O_RDONLY | os.O_NONBLOCK)
        try:
            with ThreadPoolExecutor(max_workers=1) as pool:
                future = pool.submit(self.call, "run", step="step", argv=[sys.executable, "-c", "import time; open('ready','w').write('ready'); time.sleep(10)"], timeout=0.5)
                ready, _, _ = select.select([fd], [], [], 5)
                self.assertTrue(ready, "real command must reach readiness")
                self.assertEqual(os.read(fd, 100), b"ready")
                observed = cst.Session(self.root, "test").request("observer", {"op": "show"})
                self.assertEqual(observed["phases"]["implement"]["steps"]["step"]["status"], "running")
                self.assertEqual(future.result(timeout=5)["phases"]["implement"]["steps"]["step"]["status"], "interrupted")
        finally:
            os.close(fd)

    def test_dead_host_can_be_recovered_by_a_new_actor(self):
        host = subprocess.Popen([sys.executable, "-c", "import time; time.sleep(30)"])
        other = cst.Session(self.root, "crash")
        try:
            other.request("old-host", {"op": "start", "piece": ".constellation/stock/crash.md", "create_piece": True, "goal": "Survive host death", "supervisor": host.pid})
            other.request("old-host", {"op": "propose", "step": "think", "title": "Understand", "expected": "A recorded goal"})
            with self.assertRaises(cst.Refused):
                other.request("replacement", {"op": "recover", "reason": "Cannot steal live host"})
        finally:
            host.kill()
            host.wait()
        other.request("replacement", {"op": "recover", "reason": "Host process is dead"})
        state = other.request("replacement", {"op": "resume", "reason": "Resume unfinished thinking"})
        self.assertEqual(state["phases"]["ideate"]["steps"]["think"]["status"], "pending")
        self.assertEqual(state["actor"], "replacement")

    def test_artifacts_cannot_escape_repository(self):
        with tempfile.NamedTemporaryFile() as external:
            (self.root / "link").symlink_to(external.name)
            with self.assertRaises(cst.Refused):
                self.session.artifact("link")
        with self.assertRaises(cst.Refused):
            self.session.artifact("/etc/passwd")


    def complete(self):
        self.implemented()
        self.verifier()
        self.call('run', step='step', argv=[sys.executable, '-c', 'pass'])
        self.call('advance', reason='Independent fixture acceptance')

    def git_fixture(self):
        (self.root / '.constellation/stock').mkdir(exist_ok=True)
        self.git('init', '-q')
        self.git('add', '.constellation/bench/task.md')
        self.git('-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid',
                 '-c', 'core.hooksPath=/dev/null', 'commit', '-qm', 'seed fixture')

    def git(self, *args):
        return subprocess.run(['git', *args], cwd=self.root, check=True, capture_output=True, text=True)

    def gate(self):
        env = {k: v for k, v in os.environ.items() if k not in ('CONSTELLATION_GATE', 'CONSTELLATION_ROOT')}
        return subprocess.run(['sh', str(MODULE.with_name('cst-gate.sh'))], cwd=self.root,
                              capture_output=True, text=True, env=env)

    def test_named_dependency_stale_before_verify_run(self):
        self.planned()
        (self.root / 'dependency').write_text('old')
        self.call('run', step='step', argv=[sys.executable, '-c', "open('output','w').write('correct')"],
                  evidence=['output', 'dependency'])
        self.call('advance', reason='Made', artifacts=['output'])
        self.verifier()
        (self.root / 'dependency').write_text('changed')
        with self.assertRaisesRegex(cst.Refused, 'evidence changed'):
            self.call('run', step='step', argv=[sys.executable, '-c', 'pass'])
        with self.assertRaisesRegex(cst.Refused, 'evidence changed'):
            self.call('retry', phase='verify', reason='Cannot ignore upstream proof')

    def test_upstream_evidence_checked_after_verify_command(self):
        self.propose()
        (self.root / 'intent').write_text('original')
        self.call('record', step='step', result='Original goal', evidence=['intent'])
        self.call('advance', reason='Understood')
        self.propose()
        self.propose(phase='implement')
        self.propose(phase='verify')
        self.call('record', step='step', result='Plan')
        self.call('advance', reason='Planned')
        self.call('run', step='step', argv=[sys.executable, '-c', "open('output','w').write('correct')"])
        self.call('advance', reason='Made', artifacts=['output'])
        self.verifier()
        result = self.call('run', step='step', argv=[sys.executable, '-c', "open('intent','w').write('changed')"])
        self.assertEqual(result['phases']['verify']['steps']['step']['status'], 'failed')

    def test_historical_maker_refused_after_noop_retry(self):
        self.implemented()
        self.verifier()
        self.call('run', step='step', argv=[sys.executable, '-c', 'raise SystemExit(1)'])
        self.call('retry', phase='implement', reason='Try repair')
        self.call('run', step='step', argv=[sys.executable, '-c', 'pass'])
        self.call('advance', reason='Retain output', artifacts=['output'])
        self.call('stop', reason='Handoff')
        self.actor = 'maker'
        self.call('resume', reason='Original maker tries review')
        with self.assertRaisesRegex(cst.Refused, 'different actor'):
            self.call('run', step='step', argv=[sys.executable, '-c', 'pass'])

    def test_failed_implementation_actor_retained(self):
        self.planned()
        self.call('run', step='step', argv=[sys.executable, '-c', "open('output','w').write('correct'); raise SystemExit(1)"])
        self.call('retry', phase='implement', reason='Failed command may have written')
        self.verifier()
        self.call('run', step='step', argv=[sys.executable, '-c', 'pass'])
        self.call('advance', reason='Retained output', artifacts=['output'])
        self.call('stop', reason='Handoff')
        self.actor = 'maker'
        self.call('resume', reason='Try review')
        with self.assertRaises(cst.Refused):
            self.call('run', step='step', argv=[sys.executable, '-c', 'pass'])

    def test_done_stale_visible_and_explicit_reopening(self):
        self.complete()
        self.assertTrue(self.call('show')['proof']['valid'])
        (self.root / 'output').write_text('changed')
        state = self.call('show')
        self.assertEqual(state['status'], 'done')
        self.assertFalse(state['proof']['valid'])
        with self.assertRaises(cst.Refused):
            self.session.request('stranger', {'op':'retry', 'phase':'implement', 'reason':'Steal ownership'})
        state = self.call('retry', phase='implement', reason='Explicit stale reopening')
        self.assertEqual(state['status'], 'active')
        self.assertIn('maker', self.session.makers(state))
        self.assertIsNone(state['phases']['verify']['accepted'])

    def test_done_binding_cannot_be_replaced(self):
        self.complete()
        with self.assertRaisesRegex(cst.Refused, 'already bound'):
            cst.Session(self.root, 'replacement').request('other',
                {'op':'start', 'piece':'.constellation/bench/task.md', 'goal':'Forget previous makers'})

    def test_missing_claim_fences_new_claim(self):
        (self.root / '.constellation/bench/task.md').rename(self.root / '.constellation/bench/moved.md')
        with self.assertRaisesRegex(cst.Refused, 'reconcile'):
            cst.Session(self.root, 'second').request('other',
                {'op':'start', 'piece':'.constellation/bench/moved.md', 'goal':'Duplicate'})
        with self.assertRaises(cst.Refused):
            self.call('reconcile', piece='.constellation/bench/moved.md', reason='Illegal rename is not a legal move')

    def test_legal_stock_moves_rebind_leaf_and_unit(self):
        self.git_fixture()
        for slug, breaks in [('leaf', False), ('unit', True)]:
            path = '.constellation/stock/' + slug + '.md'
            content = chr(10).join(['# Piece', '**Making:** x', '**Not making:** y', '**Done when:** z', '**Waits on:**'])
            (self.root / path).write_text(content)
            self.git('add', path)
            session = cst.Session(self.root, slug)
            session.request('maker', {'op':'start', 'piece':path, 'goal':'Move legally'})
            argv = [str(MODULE.with_name('cst-move')), 'bench', slug] + (['--break'] if breaks else [])
            subprocess.run(argv, cwd=self.root, capture_output=True, check=True)
            target = '.constellation/bench/' + slug + ('/PIECE.md' if breaks else '.md')
            self.assertEqual(session.request('observer', {'op':'show'})['piece'], target)
            with self.assertRaises(cst.Refused):
                cst.Session(self.root, slug + '-duplicate').request('other', {'op':'start','piece':target,'goal':'Duplicate'})

    def test_new_piece_floor_through_execution_door(self):
        self.git_fixture()
        self.session = cst.Session(self.root, 'fresh')
        piece = '.constellation/stock/fresh.md'
        self.call('start', piece=piece, goal='Fresh restricted-host work', create_piece=True)
        floor = dict(making='An output file', not_making='Product changes',
                     done_when='Exact content verified', waits_on='')
        self.call('floor', **floor)
        self.propose()
        self.call('record', step='step', result='Understand the output')
        self.call('advance', reason='Understood')
        self.call('floor', **{**floor, 'making': 'One output file'})
        content = (self.root / piece).read_text()
        self.assertTrue(content.startswith('# Fresh restricted-host work\n'))
        self.assertEqual(content.count('**Making:**'), 1)
        self.assertIn('**Making:** One output file\n', content)
        self.propose()
        for name in ('stock-commit', 'bench-commit', 'write'):
            self.propose(name, phase='implement')
        self.propose('check', phase='verify')
        self.call('record', step='step', result='Commit each move separately, then write and check')
        self.call('advance', reason='Declared lifecycle')
        for step, path in [('stock-commit', piece), ('bench-commit', '.constellation/bench/fresh.md')]:
            # The restricted host permits these commands only through a planned run.
            script = ("import subprocess; subprocess.run(['git','add','--'," + repr(path) + "],check=True); "
                      "subprocess.run(['git','-c','user.name=Fixture','-c','user.email=fixture@example.invalid',"
                      "'commit','-qm','one position transition'],check=True)")
            state = self.call('run', step=step, argv=[sys.executable, '-c', script])
            self.assertEqual(state['phases']['implement']['steps'][step]['status'], 'done')
            if step == 'stock-commit':
                self.call('move', action='bench')
        self.call('run', step='write', argv=[sys.executable, '-c', "open('output','w').write('correct')"])
        self.call('advance', reason='Written', artifacts=['output'])
        self.verifier()
        self.call('run', step='check', argv=[sys.executable, '-c', "assert open('output').read() == 'correct'"])
        self.call('advance', reason='Independently checked')
        state = self.call('move', action='finish')
        self.assertTrue(state['landed'])
        self.assertEqual(state['piece'], '.constellation/bench/fresh.md')
        self.assertFalse(state['piece_exists'], 'done work leaves the tree')
        self.assertTrue(state['proof']['valid'])
        self.assertEqual(self.gate().returncode, 0)

    def test_floor_refuses_wrong_phase_owner_target_and_invalid_fields(self):
        fields = dict(making='x', not_making='y', done_when='z', waits_on='')
        with self.assertRaisesRegex(cst.Refused, 'stock piece'):
            self.call('floor', **fields)
        piece = '.constellation/stock/floor.md'
        self.session = cst.Session(self.root, 'floor')
        self.call('start', piece=piece, goal='Floor validation', create_piece=True)
        original = (self.root / piece).read_bytes()
        with self.assertRaisesRegex(cst.Refused, 'another actor'):
            self.session.request('stranger', {'op': 'floor', **fields})
        for key, value in [('making', ''), ('not_making', 'a\nb'), ('done_when', None), ('waits_on', 'a\rb')]:
            with self.subTest(key=key), self.assertRaises(cst.Refused):
                self.call('floor', **{**fields, key: value})
            self.assertEqual((self.root / piece).read_bytes(), original)
        self.planned()
        with self.assertRaisesRegex(cst.Refused, 'ideation or planning'):
            self.call('floor', **fields)
        self.assertEqual((self.root / piece).read_bytes(), original)

    def test_floor_atomic_replacement_preserves_content_and_mode(self):
        self.session = cst.Session(self.root, 'durable-floor')
        self.call('start', piece='.constellation/stock/durable.md', goal='Durable floor', create_piece=True)
        piece = self.root / '.constellation/stock/durable.md'
        piece.write_text('# Durable floor\n\nKeep this prose.\n**Making:** old\n')
        piece.chmod(0o640)
        inode = piece.stat().st_ino
        self.call('floor', making='new', not_making='extras', done_when='proved', waits_on='')
        self.assertEqual(piece.read_text(), '# Durable floor\n\nKeep this prose.\n\n'
                         '**Making:** new\n**Not making:** extras\n**Done when:** proved\n**Waits on:**\n')
        self.assertEqual(piece.stat().st_mode & 0o7777, 0o640)
        self.assertNotEqual(piece.stat().st_ino, inode)
        self.assertEqual(list(piece.parent.iterdir()), [piece])
        self.assertEqual(self.session.load()['events'][-1]['event'], 'floor')

    def test_floor_write_and_replace_failures_preserve_original_and_record(self):
        self.session = cst.Session(self.root, 'failed-floor')
        self.call('start', piece='.constellation/stock/durable.md', goal='Original floor', create_piece=True)
        piece = self.root / '.constellation/stock/durable.md'
        piece.chmod(0o640)
        original, record = piece.read_bytes(), self.session.path.read_bytes()
        inode = piece.stat().st_ino
        real_fdopen = os.fdopen

        @contextmanager
        def partial_write(fd, mode):
            with real_fdopen(fd, mode) as stream:
                def fail_write(value):
                    stream.write(value[:len(value) // 2])
                    stream.flush()
                    raise OSError('injected partial write failure')
                writer = Mock(wraps=stream)
                writer.write.side_effect = fail_write
                yield writer

        # Inject only the failing syscall/write boundary; all files and locks are real.
        failures = [('fdopen', partial_write),
                    ('replace', OSError('injected replace failure')),
                    ('fsync', OSError('injected file fsync failure'))]
        for seam, failure in failures:
            with self.subTest(seam=seam), patch.object(cst.os, seam, side_effect=failure):
                with self.assertRaisesRegex(OSError, 'injected'):
                    self.call('floor', making='new', not_making='extras', done_when='proved', waits_on='')
            self.assertEqual(piece.read_bytes(), original)
            self.assertEqual(piece.stat().st_mode & 0o7777, 0o640)
            self.assertEqual(piece.stat().st_ino, inode)
            self.assertEqual(self.session.path.read_bytes(), record, 'failed floor cannot save an event')
            self.assertEqual(list(piece.parent.iterdir()), [piece], 'temporary file must be removed')

    def test_host_finish_requires_committed_bench_arrival(self):
        old, new = self.stock_commit_fixture()
        self.call('move', action='bench')
        self.call('run', step='step', argv=[sys.executable, '-c', "open('output','w').write('correct')"])
        self.call('advance', reason='Made', artifacts=['output'])
        self.verifier()
        self.call('run', step='step', argv=[sys.executable, '-c', 'pass'])
        self.call('advance', reason='Independent acceptance')
        staged = self.git('diff', '--cached', '--name-status').stdout
        with self.assertRaisesRegex(cst.Refused, 'commit the stock-to-bench position transition'):
            self.call('move', action='finish')
        self.assertEqual(self.git('diff', '--cached', '--name-status').stdout, staged)
        self.assertEqual(self.session.load()['piece'], new)
        self.assertTrue((self.root / new).is_file())
        self.git('commit', '-qm', 'legal bench arrival')
        self.call('move', action='finish')
        self.assertEqual(self.gate().returncode, 0)
        self.assertIn(new, self.git('diff', '--cached', '--name-status').stdout)
        self.assertNotIn(old, self.git('diff', '--cached', '--name-status').stdout)

    def stock_commit_fixture(self):
        self.git_fixture()
        self.git('config', 'user.name', 'Fixture')
        self.git('config', 'user.email', 'fixture@example.invalid')
        self.git('config', 'core.hooksPath', str(self.root / '.git/hooks'))
        hook = self.root / '.git/hooks/pre-commit'
        hook.write_text('#!/bin/sh\n: > hook-called\nexec sh ' +
                        repr(str(MODULE.with_name('cst-gate.sh'))) + '\n')
        hook.chmod(0o755)
        old, new = '.constellation/stock/live.md', '.constellation/bench/live.md'
        (self.root / old).write_text('# Piece\n**Making:** x\n**Not making:** y\n**Done when:** z\n**Waits on:**\n')
        self.git('add', old)
        self.git('commit', '-qm', 'stock arrival')
        (self.root / 'hook-called').unlink()
        self.session = cst.Session(self.root, 'live')
        self.call('start', piece=old, goal='Commit legal bench move inside run')
        self.planned()
        return old, new

    def test_hooked_commit_inside_run_after_rebound_move(self):
        old, new = self.stock_commit_fixture()
        subprocess.run([str(MODULE.with_name('cst-move')), 'bench', 'live'],
                       cwd=self.root, capture_output=True, check=True)
        self.assertEqual(self.session.load()['piece'], new)
        head = self.git('rev-parse', 'HEAD').stdout
        state = self.call('run', step='step', argv=['env', 'CONSTELLATION_GATE=on', 'git', 'commit', '-qm', 'legal bench move'])
        step = state['phases']['implement']['steps']['step']
        self.assertEqual(step['status'], 'done', (self.root / step['log']).read_text())
        self.assertTrue((self.root / 'hook-called').exists())
        self.assertNotEqual(self.git('rev-parse', 'HEAD').stdout, head)
        self.assertEqual(state['piece'], new)
        self.assertEqual(self.git('show', 'HEAD:' + new).stdout, (self.root / new).read_text())
        self.assertFalse((self.root / old).exists())

    def test_actual_move_inside_run_still_refused(self):
        old, new = self.stock_commit_fixture()
        state = self.call('run', step='step', argv=[sys.executable, str(MODULE),
                          '--root', str(self.root), '--move', old, new])
        step = state['phases']['implement']['steps']['step']
        self.assertEqual(step['exit'], 5)
        self.assertIn('command running; move separately', (self.root / step['log']).read_text())
        self.assertEqual(state['piece'], old)
        self.assertTrue((self.root / old).exists())
        self.assertFalse((self.root / new).exists())

    def test_hooked_commit_needing_rebind_inside_run_refused(self):
        old, new = self.stock_commit_fixture()
        head = self.git('rev-parse', 'HEAD').stdout
        code = ("import subprocess; subprocess.run(['git','mv'," + repr(old) + ',' + repr(new) +
                "],check=True); raise SystemExit(subprocess.run(['env','CONSTELLATION_GATE=on','git','commit','-qm','needs rebind']).returncode)")
        state = self.call('run', step='step', argv=[sys.executable, '-c', code])
        step = state['phases']['implement']['steps']['step']
        self.assertEqual(step['status'], 'failed')
        self.assertIn('command running; move separately', (self.root / step['log']).read_text())
        self.assertTrue((self.root / 'hook-called').exists())
        self.assertEqual(self.git('rev-parse', 'HEAD').stdout, head)
        self.assertEqual(state['piece'], old)
        self.assertTrue((self.root / new).exists())

    def test_explicit_legal_reconciliation(self):
        self.git_fixture()
        old = '.constellation/stock/reconcile.md'
        new = '.constellation/bench/reconcile.md'
        (self.root / old).write_text('# Claimed piece')
        session = cst.Session(self.root, 'reconcile')
        session.request('owner', {'op':'start', 'piece':old, 'goal':'Reconcile interrupted movement'})
        (self.root / old).rename(self.root / new)
        with self.assertRaises(cst.Refused):
            session.request('stranger', {'op':'reconcile','piece':new,'reason':'Steal'})
        state = session.request('owner', {'op':'reconcile','piece':new,'reason':'Inspected interrupted move'})
        self.assertEqual(state['piece'], new)

    def test_bound_finish_refused_by_move_and_gate(self):
        self.git_fixture()
        result = subprocess.run([str(MODULE.with_name('cst-move')), 'finish', 'task'],
                                cwd=self.root, capture_output=True)
        self.assertEqual(result.returncode, 5)
        self.assertTrue((self.root / '.constellation/bench/task.md').exists())
        self.git('rm', '-q', '.constellation/bench/task.md')
        self.assertNotEqual(self.gate().returncode, 0)

    def test_fresh_bound_host_finish_then_gate(self):
        self.git_fixture()
        self.complete()
        state = self.call('move', action='finish')
        self.assertTrue(state['landed'])
        self.assertFalse((self.root / '.constellation/bench/task.md').exists())
        self.assertIn('D\t.constellation/bench/task.md', self.git('diff', '--cached', '--name-status').stdout)
        self.assertTrue(state['proof']['valid'])
        result = self.gate()
        self.assertEqual(result.returncode, 0, result.stderr)
        (self.root / 'output').write_text('stale after finish')
        self.assertNotEqual(self.gate().returncode, 0)
        with self.assertRaisesRegex(cst.Refused, 'landed pieces'):
            self.call('retry', phase='implement', reason='No reverse move')

    def test_fresh_raw_git_finish_rebinds(self):
        self.git_fixture()
        self.complete()
        self.git('rm', '-q', '.constellation/bench/task.md')
        result = self.gate()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue(self.call('show')['landed'])

    def test_landed_piece_frees_its_path_and_claims_nothing(self):
        self.git_fixture()
        self.complete()
        self.call('move', action='finish')
        self.git('-c', 'core.hooksPath=/dev/null', 'commit', '-qm', 'finish task')
        self.assertEqual(self.session.claims(), [], 'a landed piece claims nothing')
        (self.root / '.constellation/bench').mkdir(exist_ok=True)
        (self.root / '.constellation/bench/task.md').write_text('# New work at the same path')
        other = cst.Session(self.root, 'next')
        state = other.request('maker', {'op': 'start', 'piece': '.constellation/bench/task.md', 'goal': 'New work'})
        self.assertEqual(state['piece'], '.constellation/bench/task.md')

    def test_bench_to_finished_is_no_longer_a_move(self):
        with self.assertRaisesRegex(cst.Refused, 'leaves the bench only by landing'):
            cst.legal_move('.constellation/bench/task.md', '.constellation/finished/task.md')
        with self.assertRaisesRegex(cst.Refused, 'only a piece on the bench'):
            cst.legal_removal('.constellation/stock/task.md')
        cst.legal_removal('.constellation/bench/task.md')
        cst.legal_removal('.constellation/bench/unit/PIECE.md')

    def test_reconcile_a_piece_that_left_without_the_door(self):
        self.git_fixture()
        self.complete()
        subprocess.run(['git', 'rm', '-q', '.constellation/bench/task.md'], cwd=self.root, check=True)
        with self.assertRaisesRegex(cst.Refused, 'claimed piece missing'):
            self.session.claims()
        state = self.call('reconcile', landed=True, reason='Landed by hand, with the gate off')
        self.assertTrue(state['landed'])
        self.assertEqual(self.session.claims(), [])

    def test_legacy_unbound_finish_intentionally_allowed(self):
        self.git_fixture()
        (self.root / '.constellation/bench/legacy.md').write_text('# Legacy')
        self.git('add', '.constellation/bench/legacy.md')
        self.git('-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid',
                 '-c', 'core.hooksPath=/dev/null', 'commit', '-qm', 'legacy fixture')
        self.git('rm', '-q', '.constellation/bench/legacy.md')
        result = self.gate()
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_staged_artifact_differs_from_accepted_worktree(self):
        self.git_fixture()
        self.complete()
        (self.root / 'output').write_text('staged wrong')
        self.git('add', 'output')
        (self.root / 'output').write_text('correct')
        self.git('rm', '-q', '.constellation/bench/task.md')
        self.assertNotEqual(self.gate().returncode, 0)

    def test_move_and_claim_share_real_lock(self):
        self.git_fixture()
        old, new = '.constellation/stock/race.md', '.constellation/bench/race.md'
        (self.root / old).write_text('# Race')
        self.git('add', old)
        session = cst.Session(self.root, 'race')
        session.request('maker', {'op':'start','piece':old,'goal':'Race movement'})
        def competing_claim():
            try:
                cst.Session(self.root, 'duplicate').request('other', {'op':'start','piece':new,'goal':'Race claim'})
            except cst.Refused:
                return 'refused'
            return 'claimed'
        with ThreadPoolExecutor(max_workers=2) as pool:
            moving = pool.submit(cst.move, self.root, old, new)
            claiming = pool.submit(competing_claim)
            moving.result(timeout=5)
            self.assertEqual(claiming.result(timeout=5), 'refused')
        self.assertEqual(session.request('observer', {'op':'show'})['piece'], new)

    def test_upstream_dependency_changed_after_green_verify(self):
        self.planned()
        (self.root / 'dependency').write_text('original')
        self.call('run', step='step', argv=[sys.executable, '-c', "open('output','w').write('correct')"], evidence=['dependency'])
        self.call('advance', reason='Made', artifacts=['output'])
        self.verifier()
        self.call('run', step='step', argv=[sys.executable, '-c', 'pass'])
        (self.root / 'dependency').write_text('changed')
        with self.assertRaisesRegex(cst.Refused, 'evidence changed'):
            self.call('advance', reason='Cannot accept stale upstream')

    def test_bound_unit_finish_rebinds_piece_evidence(self):
        self.git_fixture()
        old = '.constellation/stock/unit.md'
        piece = '.constellation/bench/unit/PIECE.md'
        (self.root / old).write_text(chr(10).join(['# Unit', '**Making:** a', '**Not making:** b', '**Done when:** c', '**Waits on:**']))
        self.git('add', old)
        self.session = cst.Session(self.root, 'unit')
        self.call('start', piece=old, goal='Unit execution')
        self.planned()
        self.call('move', action='bench', **{'break': True})
        self.git('-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid',
                 '-c', 'core.hooksPath=/dev/null', 'commit', '-qm', 'fixture unit bench')
        self.call('run', step='step', argv=[sys.executable, '-c', 'pass'], evidence=[piece])
        self.call('advance', reason='Unit exists', artifacts=[piece])
        self.verifier()
        self.call('run', step='step', argv=[sys.executable, '-c', 'pass'])
        self.call('advance', reason='Unit independently checked')
        state = self.call('move', action='finish')
        self.assertTrue(state['landed'])
        self.assertFalse((self.root / '.constellation/bench/unit').exists(), 'a breakdown leaves with all of its folder')
        self.assertTrue(state['proof']['valid'])
        result = self.gate()
        self.assertEqual(result.returncode, 0, result.stderr)

    def assert_deleted_proof_refused(self):
        result = subprocess.run([str(MODULE.with_name('cst-move')), 'finish', 'task'],
                                cwd=self.root, capture_output=True)
        self.assertEqual(result.returncode, 5)
        self.assertTrue((self.root / '.constellation/bench/task.md').exists())
        self.git('rm', '-q', '.constellation/bench/task.md')
        result = self.gate()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('tracked evidence deleted or unmerged', result.stderr)
        self.assertEqual((self.root / 'output').read_text(), 'correct')

    def test_committed_artifact_staged_deletion_refused(self):
        self.git_fixture()
        self.complete()
        self.git('add', 'output')
        self.git('-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid',
                 '-c', 'core.hooksPath=/dev/null', 'commit', '-qm', 'committed output')
        self.git('rm', '--cached', 'output')
        self.assert_deleted_proof_refused()

    def test_uncommitted_tracked_at_capture_deletion_refused(self):
        self.git_fixture()
        (self.root / 'output').write_text('correct')
        self.git('add', 'output')
        self.complete()
        proofs = [p for p in self.session.proofs(self.session.load()) if p['path'] == 'output']
        self.assertTrue(all(p['tracked'] for p in proofs))
        self.git('rm', '--cached', 'output')
        self.assert_deleted_proof_refused()

    def test_uncommitted_relative_alias_tracking_survives_deletion(self):
        self.git_fixture()
        (self.root / 'output').write_text('correct')
        self.git('add', 'output')
        self.planned()
        self.call('run', step='step', argv=[sys.executable, '-c', 'pass'], evidence=['./output'])
        self.call('advance', reason='Alias proof captured', artifacts=['./output'])
        self.verifier()
        self.call('run', step='step', argv=[sys.executable, '-c', 'pass'])
        self.call('advance', reason='Checked alias')
        self.assertTrue(self.session.artifact('./output')['tracked'])
        self.git('rm', '--cached', 'output')
        self.assert_deleted_proof_refused()

    def test_unmerged_index_evidence_refused(self):
        self.git_fixture()
        self.complete()
        blob = self.git('hash-object', '-w', 'output').stdout.strip()
        entries = chr(10).join('100644 ' + blob + ' ' + str(stage) + chr(9) + 'output' for stage in (1, 2, 3)) + chr(10)
        subprocess.run(['git', 'update-index', '--index-info'], cwd=self.root, input=entries,
                       text=True, capture_output=True, check=True)
        self.assert_deleted_proof_refused()

    def test_index_symlink_type_conflict_refused(self):
        self.git_fixture()
        self.complete()
        blob = self.git('hash-object', '-w', 'output').stdout.strip()
        self.git('update-index', '--add', '--cacheinfo', '120000,' + blob + ',output')
        self.git('rm', '-q', '.constellation/bench/task.md')
        result = self.gate()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('type conflict', result.stderr)

    def test_index_directory_cannot_replace_file_proof(self):
        self.git_fixture()
        (self.root / 'output').write_text('correct')
        self.git('add', 'output')
        self.complete()
        blob = self.git('hash-object', '-w', 'output').stdout.strip()
        self.git('update-index', '--force-remove', 'output')
        self.git('update-index', '--add', '--cacheinfo', '100644,' + blob + ',output/child')
        self.assert_deleted_proof_refused()

    def test_legacy_proof_provenance_is_conservative(self):
        self.git_fixture()
        (self.root / 'legacy').write_text('content')
        proof = self.session.artifact('legacy')
        del proof['tracked']  # In-memory old proof shape; no record or actor tampering.
        state = {'phases': {'implement': {'steps': {}, 'artifacts': [proof]}}}
        with self.assertRaisesRegex(cst.Refused, 'tracking provenance missing'):
            self.session.staged_proofs(state)
        self.assertTrue(self.session.needs_provenance(state))
        self.git('add', 'legacy')
        self.session.staged_proofs(state)
        self.git('-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid',
                 '-c', 'core.hooksPath=/dev/null', 'commit', '-qm', 'legacy tracked proof')
        self.git('rm', '--cached', 'legacy')
        with self.assertRaisesRegex(cst.Refused, 'deleted or unmerged'):
            self.session.staged_proofs(state)

    def test_local_evidence_allowed_and_gate_success_quiet(self):
        self.git_fixture()
        self.complete()
        self.assertFalse(self.session.artifact('output')['tracked'])
        self.git('rm', '-q', '.constellation/bench/task.md')
        result = self.gate()
        self.assertEqual((result.returncode, result.stdout, result.stderr), (0, '', ''))

    def test_gate_preserves_actionable_refusal(self):
        self.git_fixture()
        self.git('rm', '-q', '.constellation/bench/task.md')
        result = self.gate()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('bound finish needs completed execution', result.stderr)
        self.assertEqual(result.stdout, '')

    def verifier_process(self, mode='exit'):
        self.implemented()
        self.call('stop', reason='Actual verifier process handoff')
        script = chr(10).join([
            'import importlib.util, sys, os, json',
            "spec=importlib.util.spec_from_file_location('door',sys.argv[1]); m=importlib.util.module_from_spec(spec); spec.loader.exec_module(m)",
            "d=m.Session(sys.argv[2],'test')",
            "d.request('verifier-process',{'op':'resume','reason':'Real process','supervisor':os.getpid()})",
            "d.request('verifier-process',{'op':'run','step':'step','argv':[sys.executable,'-c','pass']})",
            "d.request('verifier-process',{'op':'advance','reason':'Independently checked'})",
            "if sys.argv[3]=='finish': d.request('verifier-process',{'op':'move','action':'finish'})",
            "print(json.dumps({'pid':os.getpid(),'status':'done'}),flush=True)",
            "if sys.argv[3]=='hold': sys.stdin.read()",
        ])
        process = subprocess.Popen([sys.executable, '-B', '-c', script, str(MODULE), str(self.root), mode],
                                   stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        def cleanup():
            if process.poll() is None:
                process.kill()
            process.wait(timeout=5)
            for stream in (process.stdin, process.stdout, process.stderr):
                stream.close()
        self.addCleanup(cleanup)
        ready, _, _ = select.select([process.stdout], [], [], 30)
        self.assertTrue(ready, 'real verifier must report completion')
        line = process.stdout.readline()
        if not line:
            self.fail(process.stderr.read())
        self.assertEqual(json.loads(line)['pid'], process.pid)
        if mode != 'hold':
            self.assertEqual(process.wait(timeout=5), 0)
            self.assertFalse(cst.alive(process.pid))
        return process

    def test_dead_done_owner_stale_retry_transfers_and_invalidates(self):
        self.verifier_process()
        before = self.session.load()
        (self.root / 'output').write_text('changed after verifier death')
        state = self.session.request('fresh-actor', {'op':'retry','phase':'implement',
            'reason':'Explicit stale reopening after death','supervisor':os.getpid()})
        self.assertEqual(state['actor'], 'fresh-actor')
        self.assertEqual(state['supervisor'], os.getpid())
        self.assertEqual(state['phase'], 'implement')
        self.assertEqual(state['status'], 'active')
        self.assertEqual(len(state['cycles']), len(before['cycles']) + 1)
        self.assertEqual(state['cycles'][-1]['phases'], before['phases'])
        self.assertIn('maker', self.session.makers(state))
        self.assertIsNone(state['phases']['verify']['accepted'])

    def test_live_done_owner_stale_takeover_refused(self):
        process = self.verifier_process('hold')
        self.assertTrue(cst.alive(process.pid))
        (self.root / 'output').write_text('stale but owner alive')
        before = self.session.path.read_bytes()
        with self.assertRaisesRegex(cst.Refused, 'not proven dead'):
            self.session.request('fresh-actor', {'op':'retry','phase':'implement','reason':'No theft'})
        self.assertEqual(self.session.path.read_bytes(), before)

    def test_dead_done_owner_cannot_reopen_finished_piece(self):
        self.git_fixture()
        self.verifier_process('finish')
        (self.root / 'output').write_text('stale finished artifact')
        with self.assertRaisesRegex(cst.Refused, 'landed pieces'):
            self.session.request('fresh-actor', {'op':'retry','phase':'implement','reason':'No rewind'})

    def test_dead_done_owner_fresh_proof_cannot_be_reopened(self):
        self.verifier_process()
        with self.assertRaisesRegex(cst.Refused, 'reopen requires stale'):
            self.session.request('fresh-actor', {'op':'retry','phase':'implement','reason':'No needless reopening'})

    def test_install_sync_preserves_execution_and_loads_repairs(self):
        self.git_fixture()
        before = self.session.path.read_bytes()
        installer = MODULE.parents[2] / 'install.sh'
        for _ in range(2):
            subprocess.run(['sh', str(installer), str(self.root)], check=True, capture_output=True)
            self.assertEqual(self.session.path.read_bytes(), before)
            self.assertEqual((self.root / '.constellation/bin/cst-session.py').read_bytes(), MODULE.read_bytes())
            self.assertEqual((self.root / '.constellation/bindings/pi.ts').read_bytes(),
                             (MODULE.parent.parent / 'bindings/pi.ts').read_bytes())
        result = subprocess.run([sys.executable, str(self.root / '.constellation/bin/cst-session.py'),
                                 '--root', str(self.root), '--session', 'test', '--actor', 'observer'],
                                input=json.dumps({'op':'show'}), capture_output=True, text=True, check=True)
        self.assertTrue(json.loads(result.stdout)['proof']['valid'])


if __name__ == "__main__":
    unittest.main(verbosity=2)

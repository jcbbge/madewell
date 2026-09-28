;;;; ============================================================================
;;;; spine-verify.lisp — independent verification of the telemetry spine
;;;; Package c001-02 (cycle c001, item i002) · Designer: td-spine · 2026-08-05
;;;;
;;;; THE WALL (honored): designed from intent sources only —
;;;;   .madewell/work/packages/c001-02-verify-spine.md (the brief)
;;;;   README.md
;;;;   docs/CONSTELLATION-V6-CONVERGENCE.md §2 Tier-1.A
;;;;   src/package.lisp
;;;; No implementation file (src/spine.lisp et al.) and nothing under tests/
;;;; was read. Call shapes were acquired from the LIVE IMAGE via sb-introspect
;;;; this session — the image describing itself, never the source.
;;;;
;;;; RUN (from the repository root):
;;;;   sbcl --non-interactive --load .madewell/work/verification/spine-verify.lisp
;;;; --non-interactive loads ~/.sbclrc (where `ocicl setup` lives), so FiveAM
;;;; resolves through the repo's ocicl directory. --script would skip that file.
;;;; Exit status: 0 = every check green · 1 = at least one contract failure.
;;;;
;;;; State discipline: every test resets the spine on entry AND on exit
;;;; (unwind-protect), restores *spine-capacity*, and proves the restore. No
;;;; mocks. No absolute ids, timestamps, or durations pinned anywhere.
;;;; Process discipline: one waited python3 subprocess in the NDJSON test;
;;;; the script quits with the verdict code. No orphan processes, no files
;;;; left behind (the NDJSON temp file is deleted on every path).
;;;; ============================================================================

(eval-when (:compile-toplevel :load-toplevel :execute)
  (require :asdf)
  (require :sb-introspect)
  (let ((asd (merge-pathnames "constellation.asd" (uiop:getcwd))))
    (unless (probe-file asd)
      (error "spine-verify must be loaded from the repository root (no constellation.asd at ~a)" asd))
    (unless (asdf:find-system "constellation" nil)
      (asdf:load-asd asd)))
  (asdf:load-system "constellation")
  (asdf:load-system "fiveam"))

(defpackage #:spine-verify
  (:use #:cl)
  (:documentation "Independent verification of the constellation telemetry spine (c001-02)."))

(in-package #:spine-verify)

;;; ---------- contract snapshot (diagnostic; asserted against nothing) ----------

(defun print-contract-snapshot ()
  "Print the live image's self-description of the spine's call shapes and
defaults. Diagnostic context for triage. The assertions in this file come
from intent, never from this snapshot."
  (format t "~&=== CONTRACT SNAPSHOT (live image, this run) ===~%")
  (dolist (s '("EMIT" "WITH-ENVELOPE" "SPINE-EVENTS" "SPINE-RESET" "SPINE-WRITE-NDJSON"))
    (let ((sym (find-symbol s "CONSTELLATION")))
      (format t "~&  cst:~(~a~) arglist: ~s~%" s
              (ignore-errors (sb-introspect:function-lambda-list sym)))))
  (format t "~&  cst:*actor* default: ~s~%" cst:*actor*)
  (format t "~&  cst:*current-parent* default: ~s~%" cst:*current-parent*)
  (format t "~&  cst:*spine-capacity* default: ~s~%" cst:*spine-capacity*)
  (format t "~&======================================================~%"))

;;; ---------- helpers ----------

(defun events ()
  "The retained window as a list. Intent 4: spine-events is the only honest
reader; it returns the retained window oldest first."
  (coerce (cst:spine-events) 'list))

(defun evts-named (name evts)
  (remove-if-not (lambda (e) (equal name (cst:envelope-name e))) evts))

(defun evts-phased (phase evts)
  (remove-if-not (lambda (e) (eq phase (cst:envelope-phase e))) evts))

(defun non-decreasing-p (nums)
  (loop for (a b) on nums while b always (<= a b)))

(defmacro with-clean-spine (&body body)
  "Enter and leave an empty spine at the ambient capacity, on every path."
  `(progn
     (cst:spine-reset)
     (unwind-protect (progn ,@body)
       (cst:spine-reset))))

(defmacro with-ring-capacity ((n) &body body)
  "Rebind the capacity special and take the resize door (spine-reset), per
intent 3: '*spine-capacity* is rebindable; spine-reset clears and is also the
resize door.'"
  `(let ((cst:*spine-capacity* ,n))
     (cst:spine-reset)
     (unwind-protect (progn ,@body)
       (cst:spine-reset))))

;;; ---------- telemetry-blind intermediates (intent 2) ----------
;;; These functions take no telemetry arguments and reference no telemetry
;;; state. If an emit at the bottom of this chain lands under the right
;;; parent, nesting is carried by dynamic binding — structure, not inference.

(defun v/blind-c (n)
  (declare (ignore n))
  (cst:emit "leaf-through-blind-calls"))

(defun v/blind-b (n) (v/blind-c (1+ n)))

(defun v/blind-a (n) (v/blind-b (1+ n)))

;;; ---------- the third-party NDJSON schema validator (python3 json) ----------
;;; Single-quoted Python so the Lisp string needs no escapes. Asserts, per
;;; line: the exact v5 key set {id, parent_id, phase, ts, duration_ns,
;;; actor_id, name}; per-key types; phase spelled so a non-Lisp v5 reader
;;; survives; duration_ns null off :end and an integer on :end; the window
;;; written oldest-first.

(defparameter +python-schema-validator+
  "import json, sys
path = sys.argv[1]
required = {'id', 'parent_id', 'phase', 'ts', 'duration_ns', 'actor_id', 'name'}
lines = open(path, encoding='utf-8').read().splitlines()
assert len(lines) == 3, 'expected 3 ndjson lines, got %d' % len(lines)
phases = []
names = []
actors = []
for i, line in enumerate(lines):
    obj = json.loads(line)
    assert set(obj.keys()) == required, 'line %d: keys %s != v5 field set %s' % (i, sorted(obj.keys()), sorted(required))
    assert isinstance(obj['id'], int) and not isinstance(obj['id'], bool), 'line %d: id not int' % i
    pid = obj['parent_id']
    assert pid is None or (isinstance(pid, int) and not isinstance(pid, bool)), 'line %d: parent_id not int|null' % i
    assert obj['phase'] in ('start', 'end', 'point'), 'line %d: phase spelling %r breaks v5 readers' % (i, obj['phase'])
    assert isinstance(obj['ts'], int) and not isinstance(obj['ts'], bool), 'line %d: ts not int (universal time)' % i
    if obj['phase'] == 'end':
        assert isinstance(obj['duration_ns'], int) and not isinstance(obj['duration_ns'], bool), 'line %d: :end without int duration_ns' % i
    else:
        assert obj['duration_ns'] is None, 'line %d: duration_ns must be null off :end' % i
    assert isinstance(obj['actor_id'], str), 'line %d: actor_id not str' % i
    assert isinstance(obj['name'], str), 'line %d: name not str' % i
    phases.append(obj['phase'])
    names.append(obj['name'])
    actors.append(obj['actor_id'])
assert phases == ['start', 'point', 'end'], 'ndjson order not oldest-first: %s' % phases
assert names == ['ndjson-span', 'ndjson-point', 'ndjson-span'], 'ndjson names/order: %s' % names
assert actors == ['ndjson-probe', 'ndjson-probe', 'ndjson-probe'], 'actor_id not carried: %s' % actors
print('SCHEMA-OK')")

;;; ---------- suite ----------

(fiveam:def-suite spine-verify
  :description "Independent verification of the telemetry spine — c001-02. One suite, six intents.")

(fiveam:in-suite spine-verify)

(fiveam:test envelope-contract
  "Intent 1 + 5: the Envelope field set is the v5 contract; *actor* names the
emitter and is rebindable."
  (with-clean-spine
    (let ((cst:*actor* "t1-actor"))
      (cst:emit "probe-point")
      (let* ((evts (events))
             (e (first evts)))
        (fiveam:is (= 1 (length evts))
                   "one bare emit retains exactly one envelope (no surprise telemetry)")
        (fiveam:is (typep e 'cst:envelope) "spine-events returns envelope values")
        (fiveam:is (integerp (cst:envelope-id e)) "id is an integer")
        (fiveam:is (eq :point (cst:envelope-phase e)) "bare emit is a :point impulse")
        (fiveam:is (equal "probe-point" (cst:envelope-name e)) "name round-trips")
        (fiveam:is (equal "t1-actor" (cst:envelope-actor-id e))
                   "actor_id is the dynamically bound *actor*")
        (fiveam:is (null (cst:envelope-parent-id e))
                   "no ambient parent => null parent_id (*current-parent* default is nil)")
        (fiveam:is (integerp (cst:envelope-ts e)) "ts is a universal-time integer")
        (fiveam:is (null (cst:envelope-duration-ns e)) "duration_ns is null off :end")
        ;; monotonic ids — the relative law, never an absolute base
        (cst:emit "probe-point-2")
        (let ((ids (mapcar #'cst:envelope-id (events))))
          (fiveam:is (non-decreasing-p ids) "ids monotonic across emits: ~s" ids)
          (format t "~&  [probe] ids strictly increasing? ~s  ids: ~s~%"
                  (loop for (a b) on ids while b always (< a b)) ids))))))

(fiveam:test nesting-is-dynamic-binding
  "Intent 2: with-envelope brackets its body in :start/:end envelopes and
rebinds *current-parent* for the body's dynamic extent — a leaf emitted
through three telemetry-blind frames must land under the inner span."
  (with-clean-spine
    (let ((outer-parent cst:*current-parent*))
      (cst:with-envelope ("outer-span")
        (cst:with-envelope ("inner-span")
          (v/blind-a 0)))
      (let* ((evts (events))
             (outer-start (first (evts-phased :start (evts-named "outer-span" evts))))
             (inner-start (first (evts-phased :start (evts-named "inner-span" evts))))
             (outer-end   (first (evts-phased :end   (evts-named "outer-span" evts))))
             (inner-end   (first (evts-phased :end   (evts-named "inner-span" evts))))
             (leaf        (first (evts-named "leaf-through-blind-calls" evts))))
        (fiveam:is (= 5 (length evts))
                   "two spans + one point = exactly 5 envelopes, no surprise telemetry: ~s"
                   (mapcar (lambda (e) (list (cst:envelope-name e) (cst:envelope-phase e))) evts))
        (fiveam:is (and outer-start inner-start outer-end inner-end leaf)
                   "all five expected envelopes are present")
        ;; the structural chain — nesting as structure, not inference
        (fiveam:is (eql (cst:envelope-id inner-start) (cst:envelope-parent-id leaf))
                   "leaf through 3 blind frames parents to the inner span's :start id")
        (fiveam:is (eql (cst:envelope-id outer-start) (cst:envelope-parent-id inner-start))
                   "inner span parents to the outer span's :start id")
        (fiveam:is (eql outer-parent (cst:envelope-parent-id outer-start))
                   "outer span parents to the ambient *current-parent*")
        ;; the brackets close
        (fiveam:is (integerp (cst:envelope-duration-ns inner-end))
                   "inner :end carries a real duration_ns")
        (fiveam:is (integerp (cst:envelope-duration-ns outer-end))
                   "outer :end carries a real duration_ns")
        (fiveam:is (>= (cst:envelope-duration-ns inner-end) 0) "duration_ns non-negative")
        (fiveam:is (>= (cst:envelope-ts inner-end) (cst:envelope-ts inner-start))
                   "end ts >= start ts (inner)")
        (fiveam:is (>= (cst:envelope-ts outer-end) (cst:envelope-ts outer-start))
                   "end ts >= start ts (outer)")
        ;; pre-wrap retained order is emission order, oldest first (intent 4)
        (fiveam:is (equal '("outer-span" "inner-span" "leaf-through-blind-calls"
                            "inner-span" "outer-span")
                          (mapcar #'cst:envelope-name evts))
                   "retained window is oldest-first emission order")
        ;; contract ambiguities — reported for triage, never asserted
        (format t "~&  [probe] span id model (start/end share one id?) outer: ~s inner: ~s~%"
                (eql (cst:envelope-id outer-start) (cst:envelope-id outer-end))
                (eql (cst:envelope-id inner-start) (cst:envelope-id inner-end)))
        (format t "~&  [probe] :end parent_id placement — outer-end: ~s inner-end: ~s~%"
                (cst:envelope-parent-id outer-end) (cst:envelope-parent-id inner-end))))))

(fiveam:test signaling-body-still-closes-its-span
  "Intent 2: 'the :end envelope fires even when the body signals (a trace that
stops mid-span is how you find the thing that broke); it carries a real
duration_ns.' The condition itself must also escape — a telemetry wrapper
that ate conditions would break the condition system this codebase runs on."
  (with-clean-spine
    ;; condition path
    (fiveam:signals error
      (cst:with-envelope ("boom-span")
        (error "deliberate probe — this condition is supposed to escape")))
    (let* ((evts (events))
           (ends (evts-phased :end (evts-named "boom-span" evts))))
      (fiveam:is (= 1 (length (evts-phased :start (evts-named "boom-span" evts))))
                 ":start fired for the doomed span")
      (fiveam:is (= 1 (length ends)) ":end fired during the unwind")
      (fiveam:is (integerp (cst:envelope-duration-ns (first ends)))
                 ":end carries duration_ns after a signal")
      (fiveam:is (>= (cst:envelope-duration-ns (first ends)) 0)
                 "duration_ns is real (non-negative ns)"))
    ;; generic non-local exit path (not a condition — proves the bracket, not a handler)
    (catch 'abort
      (cst:with-envelope ("throw-span")
        (throw 'abort :bailed)))
    (let ((ends (evts-phased :end (evts-named "throw-span" (events)))))
      (fiveam:is (= 1 (length ends)) ":end fired across a throw")
      (fiveam:is (integerp (cst:envelope-duration-ns (first ends)))
                 "duration_ns present after throw"))
    ;; the spine itself survives a mid-span break
    (cst:emit "after-the-break")
    (fiveam:is (not (null (evts-named "after-the-break" (events))))
               "spine keeps recording after a signaled span")))

(fiveam:test ring-eviction-and-order-across-the-wrap
  "Intent 3 + 4: the spine is a bounded ring (default 10,000); once full the
oldest envelope is evicted per write; spine-events returns the retained
window oldest first — after a wrap that is NOT slot order. Envelope ids are
monotonic from a counter reset by spine-reset."
  (with-clean-spine
    (fiveam:is (= 10000 cst:*spine-capacity*) "default capacity is 10,000")
    ;; the counter resets with the spine — same first id twice, no base pinned
    (cst:emit "ctr")
    (let ((first-id (cst:envelope-id (first (events)))))
      (cst:spine-reset)
      (cst:emit "ctr")
      (fiveam:is (eql first-id (cst:envelope-id (first (events))))
                 "spine-reset resets the id counter (same first id across two resets)"))
    ;; the wrap, exercised for real
    (cst:spine-reset)
    (with-ring-capacity (8)
      (dotimes (i 20)
        (cst:emit (format nil "ev-~2,'0d" i)))
      (let* ((evts (events))
             (names (mapcar #'cst:envelope-name evts))
             (expected (loop for i from 12 to 19 collect (format nil "ev-~2,'0d" i))))
        (fiveam:is (= 8 (length evts)) "ring retains exactly capacity (8), not 20")
        (fiveam:is (equal expected names)
                   "retained window = the 8 newest, OLDEST FIRST across the wrap: got ~s" names)
        (fiveam:is (equal "ev-12" (first names))
                   "oldest retained is ev-12 — ev-00..ev-11 were evicted one per write")
        (fiveam:is (equal "ev-19" (car (last names))) "newest retained is ev-19")
        (dotimes (i 12)
          (fiveam:is (null (evts-named (format nil "ev-~2,'0d" i) evts))
                     "evicted envelope ev-~2,'0d is simply gone" i))
        (fiveam:is (non-decreasing-p (mapcar #'cst:envelope-id evts))
                   "ids non-decreasing along the honest order")))
    ;; leaving the dynamic extent: capacity restored, spine functional
    (cst:spine-reset)
    (fiveam:is (null (events)) "reset at default capacity leaves an empty spine")
    (dotimes (i 9)
      (cst:emit (format nil "post-~d" i)))
    (fiveam:is (= 9 (length (events)))
               "9 emits all retained — the default 10,000 ring is back in force")))

(fiveam:test ndjson-out-is-v5-byte-compatible
  "Intent 6 + 1: spine-write-ndjson writes the retained window oldest-first
as newline-delimited JSON; a THIRD-PARTY parser (python3 json — not the
emitter) validates every key name and type against the v5 field set."
  (with-clean-spine
    (let ((path (merge-pathnames "spine-verify-ndjson.jsonl" (uiop:temporary-directory))))
      (unwind-protect
           (progn
             (let ((cst:*actor* "ndjson-probe"))
               (cst:with-envelope ("ndjson-span")
                 (cst:emit "ndjson-point")))
             (with-open-file (s path :direction :output
                                 :if-exists :supersede :if-does-not-exist :create)
               (cst:spine-write-ndjson s))
             (fiveam:is (not (null (probe-file path))) "ndjson file was written")
             (let ((text (uiop:read-file-string path)))
               (format t "~&  [probe] newline count in ndjson output: ~d (3 lines expected)~%"
                       (count #\Newline text)))
             (multiple-value-bind (out err code)
                 (uiop:run-program
                  (list "python3" "-c" +python-schema-validator+ (namestring path))
                  :output :string :error-output :string :ignore-error-status t)
               (fiveam:is (eql 0 code)
                          "third-party schema validation exit code ~d — stdout: ~a stderr: ~a"
                          code out err)
               (fiveam:is (and out (search "SCHEMA-OK" out))
                          "validator printed SCHEMA-OK")))
        (uiop:delete-file-if-exists path)))))

;;; ---------- entry point ----------

(defun main ()
  (print-contract-snapshot)
  ;; Ask FiveAM to record-and-continue rather than drop into the debugger —
  ;; a script must run every check and report them all. (Symbols looked up
  ;; by name so a FiveAM without these specials still loads.)
  (dolist (v '("*ON-ERROR*" "*ON-FAILURE*"))
    (let ((s (find-symbol v "FIVEAM")))
      (when (and s (boundp s))
        (setf (symbol-value s) nil))))
  ;; run returns the result list; explain! prints the same report run! did,
  ;; and results-status reads the list — all exported FiveAM API. (run!
  ;; returns only explain!'s boolean; count-if over it was the crash.)
  (let ((results (fiveam:run 'spine-verify)))
    (fiveam:explain! results)
    (multiple-value-bind (all-pass failed-tests)
        (fiveam:results-status results)
      (format t "~&=== spine-verify verdict: ~d check result~:p, ~d failure~:p ===~%"
              (length results) (length failed-tests))
      ;; an empty result list (zero checks run) is RED, deliberately
      (if (and results all-pass) 0 1))))

;;; Every test restored its own state (with-clean-spine / with-ring-capacity
;;; unwind paths); one last reset leaves the spine empty at default capacity
;;; no matter where a failure landed — the unwind-protect runs it on every
;;; path, even an unhandled-error unwind (code stays 1 until main returns).
(let ((code 1))
  (unwind-protect
       (setf code (main))
    (cst:spine-reset))
  (uiop:quit code))

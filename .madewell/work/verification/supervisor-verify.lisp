;;;; supervisor-verify.lisp — independent verification of the Constellation supervisor
;;;; ====================================================================================
;;;; Package c001-04 (cycle c001, item i004) · designed 2026-08-05 by td-supervisor (pane wS:pF)
;;;; Companion brief: .madewell/specs/2026-08-05-c001-supervisor.test.md
;;;;
;;;; THE WALL: this file was designed from the package brief, README.md,
;;;; docs/CONSTELLATION-V6-CONVERGENCE.md (§2 supervision row), and src/package.lisp ONLY.
;;;; No implementation file and nothing in tests/ was read. The supervisor is a black box
;;;; behind its exported contract.
;;;;
;;;; RUN (the Test-Runner role — never the Implementer, never the Designer):
;;;;   cd <repo root>
;;;;   sbcl --non-interactive --load .madewell/work/verification/supervisor-verify.lisp
;;;; (Plain --load: ~/.sbclrc carries the ocicl hook that resolves FiveAM from the
;;;;  vendored ocicl/ store — fiveam-20240928-e43d6c8 per the committed ocicl.csv.)
;;;;
;;;; EXIT CODE — bit flags: 0 green · 1 FiveAM check failures · 2 harness error ·
;;;; 4 orphan-audit failure (a supervised pid still running after all cleanup).
;;;;
;;;; HARNESS INVARIANTS (a verification that leaks processes commits the sin it grades):
;;;;   * No mocks. Children are real OS processes; death is real (SIGKILL); all process
;;;;     probes are /bin/ps + /bin/kill, independent of the implementation under test.
;;;;   * Reap on every path: unwind-protect cleanup in every test, a global registry of
;;;;     every pid ever observed, and a final audit that backstop-kills survivors.
;;;;   * Kernel races are absorbed by polling (wait-until), never by fixed sleeps.
;;;;   * Zombie ≠ leak: the process probe is three-valued (:running / :zombie / :gone).
;;;;     Grounded on this machine 2026-08-05: a live sleep reports STAT "S"; SIGKILLed
;;;;     and not-yet-waited reports "Z"; after wait it reports "" (gone).

;;; ---------------------------------------------------------------------------
;;; Bootstrap: load the system under test and FiveAM. Inside eval-when so that
;;; `compile-file` also works (cst:/fiveam: symbols must exist at read time).
;;; ---------------------------------------------------------------------------
(eval-when (:compile-toplevel :load-toplevel :execute)
  (require :asdf)
  (let* ((here (or *load-truename* *compile-file-truename*))
         (candidates
           (remove nil
                   (list (merge-pathnames "constellation.asd" (uiop:getcwd))
                         (when here
                           (merge-pathnames
                            "constellation.asd"
                            (uiop:pathname-parent-directory-pathname
                             (uiop:pathname-parent-directory-pathname
                              (uiop:pathname-parent-directory-pathname
                               (uiop:pathname-directory-pathname here))))))))))
    (let ((asd (find-if #'probe-file candidates)))
      (unless asd
        (error "constellation.asd not found (tried: ~S). Run from the repo root."
               candidates))
      (asdf:load-asd asd)))
  (asdf:load-system "constellation")
  (asdf:load-system "fiveam"))

;;; ---------------------------------------------------------------------------
;;; OS-level probes — the independent measuring sticks. The supervisor's own
;;; accessors are the thing under test; these never trust them.
;;; ---------------------------------------------------------------------------

(defun ps-state (pid)
  "Three-valued liveness for PID per /bin/ps: :RUNNING, :ZOMBIE, or :GONE.
Grounded 2026-08-05: running='S', killed-not-waited='Z', waited=''."
  (let* ((out (or (uiop:run-program
                   (list "/bin/ps" "-p" (write-to-string pid) "-o" "stat=")
                   :output :string :error-output nil :ignore-error-status t)
                  ""))
         (line (string-trim '(#\Space #\Tab #\Newline #\Return) out)))
    (cond ((zerop (length line)) :gone)
          ((char= (char line 0) #\Z) :zombie)
          (t :running))))

(defun signal-pid (pid signal-number)
  "Send SIGNAL-NUMBER to PID via /bin/kill. Returns T if kill reported success."
  (zerop (nth-value 2 (uiop:run-program
                       (list "/bin/kill" (format nil "-~D" signal-number)
                             (write-to-string pid))
                       :output nil :error-output nil :ignore-error-status t))))

(defun wait-until (pred timeout-seconds &optional (step-seconds 0.05))
  "Poll PRED every STEP-SECONDS until it is true or TIMEOUT-SECONDS elapse.
Returns T if PRED fired, NIL on timeout. This — never a fixed sleep — is how the
harness respects the kernel's reaping reality (brief, What Could Go Wrong #2)."
  (let ((deadline (+ (get-internal-real-time)
                     (* timeout-seconds internal-time-units-per-second))))
    (loop (when (funcall pred) (return t))
          (when (> (get-internal-real-time) deadline) (return nil))
          (sleep step-seconds))))

(defun wait-gone (pid &optional (timeout-seconds 2.0))
  "T when PID reaches :GONE within TIMEOUT-SECONDS (fully reaped — no table entry)."
  (wait-until (lambda () (eq (ps-state pid) :gone)) timeout-seconds))

;;; ---------------------------------------------------------------------------
;;; The harness's own reaping law. Every supervisor under test is registered;
;;; every pid ever observed is remembered; cleanup runs on every exit path.
;;; ---------------------------------------------------------------------------

(defvar *registry* '()
  "List of cells (:SUPERVISOR sup :PIDS (…every pid ever observed on sup…)).")

(defun register-supervisor (sup)
  (let ((cell (list :supervisor sup :pids '())))
    (push cell *registry*)
    cell))

(defun pids-of (sup)
  "Current child pids of SUP per the contract (mapcar child-pid supervisor-children)."
  (mapcar #'cst:child-pid (cst:supervisor-children sup)))

(defun observe (sup cell)
  "Add SUP's current child pids to CELL's registry. Called after every birth/restart
so cleanup and the final audit know about replacements too."
  (dolist (p (pids-of sup))
    (pushnew p (getf cell :pids)))
  (getf cell :pids))

(defun scrub-cell (cell)
  "Best-effort teardown for one registered supervisor, on any path (success, failed
check, or error). Contract shutdown first; then a SIGTERM/SIGKILL backstop on any
pid still :RUNNING. Never signals. Zombies are unkillable corpses — they are the
implementation's responsibility and the audit's business, not scrubbed here."
  (ignore-errors (cst:shutdown-supervisor (getf cell :supervisor)))
  (dolist (p (getf cell :pids))
    (when (eq (ps-state p) :running)
      (ignore-errors (signal-pid p 15))            ; SIGTERM: contract-polite
      (unless (wait-until (lambda () (not (eq (ps-state p) :running))) 1.0)
        (ignore-errors (signal-pid p 9))           ; SIGKILL: backstop
        (wait-until (lambda () (not (eq (ps-state p) :running))) 1.0)))))

(defun scrub-all ()
  "Scrub every registered supervisor. Idempotent; safe to call at exit."
  (dolist (cell *registry*)
    (scrub-cell cell)))

(defun final-orphan-audit ()
  "The orphan-freedom proof. Walks every pid the harness ever observed.
:RUNNING after all cleanup = audit failure (backstop SIGKILL attempted, then verdict).
:ZOMBIE = warning — not a leak (a zombie is dead), but evidence of an unreaped corpse;
it is cleared from the process table when this harness process exits.
Returns T when nothing supervised is still running."
  (let ((ok t)
        (seen 0))
    (dolist (cell *registry*)
      (dolist (p (getf cell :pids))
        (incf seen)
        (case (ps-state p)
          (:gone)
          (:zombie
           (format t "~&AUDIT-WARN: pid ~D is a zombie (unreaped corpse; ~
                      cleared at harness exit)~%" p))
          (:running
           (format t "~&AUDIT: pid ~D still running — backstop SIGKILL~%" p)
           (signal-pid p 9)
           (if (wait-until (lambda () (not (eq (ps-state p) :running))) 2.0)
               (format t "~&AUDIT-WARN: pid ~D required the harness backstop ~
                          (supervisor failed to stop it)~%" p)
               (progn
                 (format t "~&AUDIT-FAIL: pid ~D survives even SIGKILL~%" p)
                 (setf ok nil)))))))
    (format t "~&AUDIT: ~D supervised pid(s) walked, ~A~%"
            seen (if ok "none left running" "FAILURES ABOVE"))
    ok))

;;; ---------------------------------------------------------------------------
;;; Spine probes (intent 5). Order of spine-events is unspecified, so deltas are
;;; computed by envelope-id set-difference. Event names/phases are unspecified,
;;; so affinity uses a generous needle set and failures print what was observed.
;;; ---------------------------------------------------------------------------

(defun spine-delta (before after)
  "Envelopes in AFTER that were not in BEFORE, by envelope-id."
  (let ((ids (mapcar #'cst:envelope-id before)))
    (remove-if (lambda (e) (member (cst:envelope-id e) ids :test #'equal)) after)))

(defun envelope-name-string (e)
  (string-downcase (princ-to-string (cst:envelope-name e))))

(defun name-affinity-p (events needles)
  "T when at least one event's name contains at least one needle (case-insensitive)."
  (some (lambda (e)
          (some (lambda (n) (search n (envelope-name-string e))) needles))
        events))

(defun closed-span-p (events)
  "T when at least one event looks like a closed span: a non-nil duration-ns, or a
phase naming an end. 'A supervision pass and a shutdown each close a span' (intent 5)."
  (some (lambda (e)
          (or (cst:envelope-duration-ns e)
              (let ((phase (string-downcase
                            (princ-to-string (cst:envelope-phase e)))))
                (member phase
                        '("end" "stop" "close" "closed" "finish" "finished"
                          "done" "complete")
                        :test #'string=))))
        events))

;;; ---------------------------------------------------------------------------
;;; Small contract helpers
;;; ---------------------------------------------------------------------------

(defun find-child-by-command (sup argv)
  (find argv (cst:supervisor-children sup) :key #'cst:child-command :test #'equal))

(defun same-set-p (a b &key (test #'eql))
  (and (subsetp a b :test test) (subsetp b a :test test)))

(defparameter +sleep-a+ '("/bin/sleep" "611")
  "SIGTERM-respecting (grounded 2026-08-05: SIGTERM ⇒ exit 143, table entry gone).
Distinctive durations identify strays from this run in any later ps/pgrep sweep.")
(defparameter +sleep-b+ '("/bin/sleep" "613"))
(defparameter +sleep-c+ '("/bin/sleep" "617"))

;;; ---------------------------------------------------------------------------
;;; The suite
;;; ---------------------------------------------------------------------------

(fiveam:def-suite supervisor-verify
  :description "Independent verification of one-for-one supervision at the
OS-process boundary — real death, real restart, real orphan-freedom (c001-04).")

(fiveam:in-suite supervisor-verify)

;;; Intent 1: a child is a real OS process with a real pid; start-supervisor
;;; launches one child per argv list; child-alive-p is true while it runs.
;;; Intent 5 (births): births are recorded on the spine.
(fiveam:test birth-and-liveness
  (let ((cell nil))
    (unwind-protect
         (let* ((commands (list +sleep-a+ +sleep-b+ +sleep-c+))
                (spine-before (cst:spine-events))
                (sup (cst:start-supervisor commands)))
            (setf cell (register-supervisor sup))
            (observe sup cell)
            (fiveam:is (cst:supervisor-p sup)
                       "start-supervisor must return a supervisor")
            (let ((children (cst:supervisor-children sup)))
              (fiveam:is (= 3 (length children))
                         "one child per command, expected 3, got ~A"
                         (length children))
              (fiveam:is (every #'cst:child-p children)
                         "every member of supervisor-children satisfies child-p")
              (let ((pids (mapcar #'cst:child-pid children)))
                (fiveam:is (every (lambda (p) (and (integerp p) (plusp p))) pids)
                           "pids must be positive integers, got ~S" pids)
                (fiveam:is (= (length pids) (length (remove-duplicates pids)))
                           "pids must be distinct, got ~S" pids)
                (dolist (pid pids)
                  (fiveam:is (eq :running (ps-state pid))
                             "pid ~D must be a real live OS process (ps-state), got ~A"
                             pid (ps-state pid)))
                (fiveam:is (every #'cst:child-alive-p children)
                           "child-alive-p must be true for every running child"))
              (fiveam:is (same-set-p (mapcar #'cst:child-command children)
                                     commands :test #'equal)
                         "child-command must return the argv lists given, got ~S"
                         (mapcar #'cst:child-command children)))
            (let ((delta (spine-delta spine-before (cst:spine-events))))
              (fiveam:is (plusp (length delta))
                         "intent 5: births must be recorded on the spine")
              (fiveam:is (name-affinity-p delta
                                          '("birth" "born" "spawn" "start"
                                            "launch" "child" "supervis"))
                         "intent 5: expected a birth-flavoured envelope name; ~
                          observed: ~S"
                         (mapcar #'cst:envelope-name delta))))
      (when cell (scrub-cell cell)))))

;;; Intent 2: supervise is one pass; a pass over fully-live children restarts
;;; nothing and touches nothing.
(fiveam:test idle-pass-is-a-no-op
  (let ((cell nil))
    (unwind-protect
         (let ((sup (cst:start-supervisor (list +sleep-a+ +sleep-b+))))
           (setf cell (register-supervisor sup))
           (observe sup cell)
           (let ((pids-before (pids-of sup))
                 (restarts-before (mapcar #'cst:child-restarts
                                          (cst:supervisor-children sup))))
             (let ((restarted (cst:supervise sup)))
               (fiveam:is (null restarted)
                          "a pass with all children live must restart nothing, ~
                           got ~S" restarted))
             (fiveam:is (same-set-p pids-before (pids-of sup))
                        "an idle pass must not change any pid: before ~S after ~S"
                        pids-before (pids-of sup))
             (fiveam:is (equal restarts-before
                               (mapcar #'cst:child-restarts
                                       (cst:supervisor-children sup)))
                        "an idle pass must not change restart counts")
             (fiveam:is (every #'cst:child-alive-p (cst:supervisor-children sup))
                        "an idle pass must not disturb live children")))
      (when cell (scrub-cell cell)))))

;;; Intents 1, 2, 3, 4, 5 — the core check. Real death (SIGKILL by pid) → one
;;; supervise pass → real restart: pid CHANGED (the evidence, intent 3),
;;; child-restarts incremented, siblings untouched, corpse reaped at replacement
;;; time (intent 4), restart/reap visible on the spine (intent 5).
(fiveam:test real-death-real-restart
  (let ((cell nil))
    (unwind-protect
         (let* ((commands (list +sleep-a+ +sleep-b+ +sleep-c+))
                (sup (cst:start-supervisor commands)))
           (setf cell (register-supervisor sup))
           (observe sup cell)
           (destructuring-bind (c1 victim c3) (cst:supervisor-children sup)
             (let ((victim-pid (cst:child-pid victim))
                   (victim-command (cst:child-command victim))
                   (sib1-pid (cst:child-pid c1))
                   (sib3-pid (cst:child-pid c3)))
               ;; Real death, delivered by us, by pid.
               (fiveam:is (signal-pid victim-pid 9)
                          "SIGKILL delivery to ~D must succeed" victim-pid)
               (fiveam:is (wait-until (lambda () (not (cst:child-alive-p victim)))
                                      5.0)
                          "child-alive-p must become false after real death ~
                           (polled up to 5s for the kernel's reaping reality)")
               (fiveam:is (not (eq :running (ps-state victim-pid)))
                          "a SIGKILLed pid must not be :running at OS level; ~
                           :zombie (unreaped) is acceptable pre-pass, got ~A"
                          (ps-state victim-pid))
               ;; One pass.
               (let* ((spine-before (cst:spine-events))
                      (restarted (cst:supervise sup)))
                 (observe sup cell)          ; captures the replacement pid
                 (fiveam:is (= 1 (length restarted))
                            "exactly one dead child ⇒ exactly one restart, got ~S"
                            restarted)
                 (let* ((replacement (first restarted))
                        (new-pid (cst:child-pid replacement)))
                   ;; Intent 3: the pid change IS the evidence.
                   (fiveam:is (/= new-pid victim-pid)
                              "the replacement must have a fresh pid (old ~D new ~D)"
                              victim-pid new-pid)
                   (fiveam:is (member new-pid (pids-of sup))
                              "the replacement pid ~D must appear in ~
                               supervisor-children (~S)" new-pid (pids-of sup))
                   (fiveam:is (cst:child-alive-p replacement)
                              "the replacement must be alive")
                   (fiveam:is (eq :running (ps-state new-pid))
                              "the replacement must be a real live OS process")
                   ;; The restarted slot: same command, incremented counter.
                   (let ((slot (find-child-by-command sup victim-command)))
                     (fiveam:is (not (null slot))
                                "a child with the victim's command ~S must still ~
                                 be supervised" victim-command)
                     (when slot
                       (fiveam:is (= new-pid (cst:child-pid slot))
                                  "the victim's slot must carry the new pid")
                       (fiveam:is (= 1 (cst:child-restarts slot))
                                  "child-restarts must be 1 after one replacement, ~
                                   got ~A" (cst:child-restarts slot))))
                   ;; Siblings untouched.
                   (fiveam:is (= sib1-pid (cst:child-pid c1))
                              "sibling 1 pid must be unchanged")
                   (fiveam:is (= sib3-pid (cst:child-pid c3))
                              "sibling 3 pid must be unchanged")
                   (fiveam:is (zerop (cst:child-restarts c1))
                              "sibling 1 must have 0 restarts")
                   (fiveam:is (zerop (cst:child-restarts c3))
                              "sibling 3 must have 0 restarts")
                   (fiveam:is (and (cst:child-alive-p c1) (cst:child-alive-p c3))
                              "siblings must still be alive")
                   (fiveam:is (eq :running (ps-state sib1-pid))
                              "sibling 1 must still be :running at OS level")
                   (fiveam:is (eq :running (ps-state sib3-pid))
                              "sibling 3 must still be :running at OS level")
                   ;; Intent 4, reaping at replacement: the corpse is collected
                   ;; before the handle is dropped ⇒ :gone, not even a zombie.
                   (fiveam:is (wait-gone victim-pid 2.0)
                              "the replaced child's corpse must be reaped at ~
                               replacement time — pid ~D still ~A after the pass"
                              victim-pid (ps-state victim-pid))
                   ;; Intent 5: restart/reap on the spine, pass closes a span.
                   (let ((delta (spine-delta spine-before (cst:spine-events))))
                     (fiveam:is (plusp (length delta))
                                "intent 5: a restarting pass must emit envelopes")
                     (fiveam:is (name-affinity-p delta
                                                 '("restart" "replac" "reap"
                                                   "death" "died" "dead" "exit"
                                                   "revive" "respawn" "supervis"
                                                   "child"))
                                "intent 5: expected a restart/reap-flavoured ~
                                 envelope name; observed: ~S"
                                (mapcar #'cst:envelope-name delta))
                     (fiveam:is (closed-span-p delta)
                                "intent 5: the pass must close a span; observed ~
                                 (name . phase . duration-ns): ~S"
                                (mapcar (lambda (e)
                                          (list (cst:envelope-name e)
                                                (cst:envelope-phase e)
                                                (cst:envelope-duration-ns e)))
                                        delta))))))))
      (when cell (scrub-cell cell)))))

;;; Intent 2, caller owns scheduling: supervise runs one pass when called, and
;;; nothing restarts a child outside a call. (Negative check with a bounded
;;; observation window — see brief, ambiguities.)
(fiveam:test no-restart-outside-a-pass
  (let ((cell nil))
    (unwind-protect
         (let ((sup (cst:start-supervisor (list +sleep-a+))))
           (setf cell (register-supervisor sup))
           (observe sup cell)
           (let* ((only (first (cst:supervisor-children sup)))
                  (pid (cst:child-pid only)))
             (signal-pid pid 9)
             (fiveam:is (wait-until (lambda () (not (cst:child-alive-p only)))
                                    5.0)
                        "child must register dead after SIGKILL")
             (sleep 0.5)   ; observation window for a hypothetical background reaper
             (fiveam:is (not (cst:child-alive-p only))
                        "without a supervise call the dead child must stay dead")
             (fiveam:is (equal (list pid) (pids-of sup))
                        "without a supervise call no replacement pid may appear ~
                         (had ~D, now ~S)" pid (pids-of sup))
             (fiveam:is (not (eq :running (ps-state pid)))
                        "the corpse must not be running")
             (let ((restarted (cst:supervise sup)))
               (observe sup cell)
               (fiveam:is (= 1 (length restarted))
                          "the next pass — and only a pass — restarts the child")
               (fiveam:is (/= pid (cst:child-pid (first restarted)))
                          "the pass-installed replacement must have a fresh pid"))))
      (when cell (scrub-cell cell)))))

;;; Intent 4 + 5: shutdown-supervisor on a fully-live supervisor terminates and
;;; reaps every child; after it returns, nothing it started is alive; the
;;; shutdown is recorded on the spine and closes a span.
(fiveam:test shutdown-on-fully-live
  (let ((cell nil))
    (unwind-protect
         (let ((sup (cst:start-supervisor (list +sleep-a+ +sleep-b+ +sleep-c+))))
           (setf cell (register-supervisor sup))
           (observe sup cell)
           (let ((pids (pids-of sup))
                 (spine-before (cst:spine-events)))
             (fiveam:is (every (lambda (p) (eq :running (ps-state p))) pids)
                        "precondition: all children live before shutdown")
             (cst:shutdown-supervisor sup)
             (dolist (pid pids)
               (fiveam:is (wait-gone pid 2.0)
                          "after shutdown-supervisor returns, pid ~D must be ~
                           fully reaped (:gone), still ~A" pid (ps-state pid)))
             (let ((delta (spine-delta spine-before (cst:spine-events))))
               (fiveam:is (plusp (length delta))
                          "intent 5: shutdown must emit envelopes")
               (fiveam:is (name-affinity-p delta
                                           '("shutdown" "shut" "term" "reap"
                                             "stop" "kill" "end" "supervis"
                                             "child"))
                          "intent 5: expected a shutdown/reap-flavoured envelope ~
                           name; observed: ~S"
                          (mapcar #'cst:envelope-name delta))
               (fiveam:is (closed-span-p delta)
                          "intent 5: the shutdown must close a span; observed ~
                           (name . phase . duration-ns): ~S"
                          (mapcar (lambda (e)
                                    (list (cst:envelope-name e)
                                          (cst:envelope-phase e)
                                          (cst:envelope-duration-ns e)))
                                  delta)))))
      (when cell (scrub-cell cell)))))

;;; Intent 4, the hardest sequence: dead → replaced → shutdown leaves ZERO live
;;; processes — the survivor, the replacement, and the already-reaped corpse.
(fiveam:test replace-then-shutdown-leaves-zero
  (let ((cell nil))
    (unwind-protect
         (let ((sup (cst:start-supervisor (list +sleep-a+ +sleep-b+))))
           (setf cell (register-supervisor sup))
           (observe sup cell)
           (destructuring-bind (victim survivor) (cst:supervisor-children sup)
             (let ((corpse-pid (cst:child-pid victim))
                   (survivor-pid (cst:child-pid survivor)))
               (signal-pid corpse-pid 9)
               (fiveam:is (wait-until (lambda ()
                                        (not (cst:child-alive-p victim)))
                                      5.0)
                          "victim must register dead")
               (let* ((restarted (cst:supervise sup))
                      (replacement-pid (cst:child-pid (first restarted))))
                 (observe sup cell)
                 (fiveam:is (= 1 (length restarted)) "one restart expected")
                 (fiveam:is (wait-gone corpse-pid 2.0)
                            "corpse ~D reaped at replacement time" corpse-pid)
                 (cst:shutdown-supervisor sup)
                 (dolist (pid (list survivor-pid replacement-pid corpse-pid))
                   (fiveam:is (wait-gone pid 2.0)
                              "pid ~D must be :gone after the final shutdown, ~
                               still ~A" pid (ps-state pid)))))))
      (when cell (scrub-cell cell)))))

;;; ---------------------------------------------------------------------------
;;; Main: run the suite, then the orphan audit, then a final scrub. Exit flags:
;;; 1 = check failures · 2 = harness error · 4 = audit failure.
;;; ---------------------------------------------------------------------------

(defun main ()
  (format t "~&;;; supervisor-verify.lisp — c001-04 independent verification~%")
  (format t ";;; wall: brief + README + convergence §2E + package.lisp only~%")
  (format t ";;; real processes only; probes: /bin/ps, /bin/kill; no mocks~%~%")
  (setf fiveam:*debug-on-error* nil
        fiveam:*debug-on-failure* nil)
  (let ((flags 0))
    (handler-case
        (let* ((results (fiveam:run 'supervisor-verify))
               (clean (fiveam:explain! results)))
          ;; explain! returns a boolean — T when no tests failed (pinned source:
          ;; fiveam-20240928 src/run.lisp:291-296; run! = explain!∘run, same boolean).
          (unless clean
            (setf flags (logior flags 1))))
      (error (e)
        (format *error-output* "~&HARNESS-ERROR: ~A~%" e)
        (setf flags (logior flags 2))))
    (format t "~&=== orphan audit ===~%")
    (unless (final-orphan-audit)
      (setf flags (logior flags 4)))
    (scrub-all)   ; belt after suspenders — nothing supervised outlives this file
    (format t "~&SUPERVISOR-VERIFY-EXIT: ~D (~A)~%" flags
            (if (zerop flags) "green" "see above"))
    (finish-output)
    (uiop:quit flags)))

(main)

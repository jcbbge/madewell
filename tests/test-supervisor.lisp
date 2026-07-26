;;;; tests/test-supervisor.lisp — supervision at the OS-process boundary.
;;;;
;;;; These tests launch REAL processes. No mocks, no simulated process table —
;;;; the whole point of moving supervision to the OS boundary is that the
;;;; isolation is real, and a test against a fake process table would be testing
;;;; the fake. Every child is /bin/sleep with a short bound, so even a runaway
;;;; test cannot leave anything behind for more than a few seconds, and every
;;;; test tears its supervisor down through UNWIND-PROTECT.

(in-package #:constellation/tests)

(in-suite :constellation)

;;; Short-lived on purpose: long enough to be reliably alive for the duration of
;;; a sub-second test, short enough that a leak dies on its own. Nothing here
;;; daemonizes and nothing is backgrounded by the shell.
(defparameter *child-command* (list "/bin/sleep" "5"))

(defun %commands (n)
  "N copies of the standard child command."
  (loop repeat n collect *child-command*))

(test supervisor-launches-real-processes
  "START-SUPERVISOR launches one real OS process per command, each with its own pid."
  (let ((sup (constellation::start-supervisor (%commands 2))))
    (unwind-protect
         (let ((children (constellation::supervisor-children sup)))
           (is (= 2 (length children)))
           (is (every #'constellation::child-alive-p children))
           (let ((pids (mapcar #'constellation::child-pid children)))
             (is (every #'integerp pids))
             (is (= 2 (length (remove-duplicates pids))))))
      (constellation::shutdown-supervisor sup))))

(test one-for-one-restart-replaces-the-dead-child-with-a-new-pid
  "THE ACCEPTANCE TEST. Two real children; one is killed with TERMINATE-PROCESS;
a supervision pass puts a live replacement in its place with a DIFFERENT pid, and
the surviving sibling is not touched — that is what one-for-one means."
  (let ((sup (constellation::start-supervisor (%commands 2))))
    (unwind-protect
         (destructuring-bind (victim survivor)
             (constellation::supervisor-children sup)
           (let ((doomed-pid (constellation::child-pid victim))
                 (survivor-pid (constellation::child-pid survivor))
                 (doomed-process (constellation::child-process victim)))
             ;; Kill it for real, then WAIT — bounded by SIGTERM delivery, not by
             ;; a sleep. When WAIT-PROCESS returns, the kernel has reported the
             ;; exit, so the supervisor is guaranteed to see a dead child rather
             ;; than racing one that is still on its way out.
             (uiop:terminate-process doomed-process)
             (is (integerp (uiop:wait-process doomed-process)))
             (is (not (constellation::child-alive-p victim)))

             (let ((restarted (constellation::supervise sup)))
               (is (equal (list victim) restarted)
                   "exactly the dead child should have been restarted"))

             ;; The replacement is real, running, and NOT the process we killed.
             (is (constellation::child-alive-p victim))
             (is (/= doomed-pid (constellation::child-pid victim)))
             (is (= 1 (constellation::child-restarts victim)))

             ;; One-for-one: the sibling was never signalled and never replaced.
             (is (constellation::child-alive-p survivor))
             (is (= survivor-pid (constellation::child-pid survivor)))
             (is (zerop (constellation::child-restarts survivor)))))
      (constellation::shutdown-supervisor sup))))

(test shutdown-leaves-no-orphans
  "Every process the supervisor started is dead when it returns — including the
one it replaced. Verified by PROCESS HANDLE, which is the only evidence that
cannot be confused by another process on this machine holding a similar name."
  (let* ((sup (constellation::start-supervisor (%commands 3)))
         (children (constellation::supervisor-children sup))
         (victim (first children))
         ;; Hold our own reference to the handle the supervisor is about to
         ;; forget, so we can testify about it after the restart.
         (replaced-process (constellation::child-process victim))
         (handles (mapcar #'constellation::child-process children)))
    (unwind-protect
         (progn
           (uiop:terminate-process replaced-process)
           (uiop:wait-process replaced-process)
           (constellation::supervise sup)
           ;; Four processes have now existed: three launched, one replacement.
           (push (constellation::child-process victim) handles)
           (is (= 4 (length (remove-duplicates handles))))

           (let ((statuses (constellation::shutdown-supervisor sup)))
             (is (= 3 (length statuses)))
             (is (every #'integerp statuses)
                 "every child was waited on, so every exit status is known"))

           (is (notany #'uiop:process-alive-p handles)
               "no process the supervisor started is still alive")
           (is (not (uiop:process-alive-p replaced-process))
               "the replaced process was reaped at replacement time, not leaked"))
      ;; Belt and braces: if an assertion above blew up mid-way, still reap.
      (constellation::shutdown-supervisor sup))))

(test the-spine-records-birth-death-and-replacement
  "Supervision is visible on the nervous system. The restart pass is a span, and
the spawn/reap/restart of the child hang underneath it."
  (constellation:spine-reset)
  (let ((sup (constellation::start-supervisor (%commands 1))))
    (unwind-protect
         (let ((victim (first (constellation::supervisor-children sup))))
           (uiop:terminate-process (constellation::child-process victim))
           (uiop:wait-process (constellation::child-process victim))
           (constellation::supervise sup)
           (let* ((events (constellation:spine-events))
                  (names (mapcar #'constellation:envelope-name events))
                  (pass (find-if (lambda (e)
                                   (and (string= "supervisor:pass"
                                                 (constellation:envelope-name e))
                                        (eq :start (constellation:envelope-phase e))))
                                 events))
                  (restart (find-if (lambda (e)
                                      (eql 0 (search "supervisor:restart:"
                                                     (constellation:envelope-name e))))
                                    events)))
             (is (find-if (lambda (n) (eql 0 (search "supervisor:spawn:" n))) names))
             (is (find-if (lambda (n) (eql 0 (search "supervisor:reap:" n))) names))
             (is (not (null restart)))
             (is (= (constellation:envelope-id pass)
                    (constellation:envelope-parent-id restart))
                 "the restart is recorded underneath the pass that performed it")))
      (constellation::shutdown-supervisor sup))))

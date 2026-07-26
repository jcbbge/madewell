;;;; src/supervisor.lisp — supervision at the OS-process boundary.
;;;;
;;;; v4 built the actor model in-image. That was the right instinct in the wrong
;;;; place: an in-image "process" shares a heap, so a wedged one can corrupt its
;;;; siblings and a runaway one cannot be killed. BEAM's guarantees — heap
;;;; isolation, kill-a-wedged-worker, restart-from-clean — are not cheap tricks
;;;; of the BEAM scheduler. They are what an OS process already gives you.
;;;;
;;;; So v6 puts supervision at the boundary where the isolation is real. A child
;;;; is a real process with a real pid; death is a real exit status; restart is a
;;;; real fresh address space. The Isolation Mandate (builder ≠ verifier, and
;;;; workers are often other harnesses entirely) demands this anyway.
;;;;
;;;; This is a FIRST CUT and stays one. One-for-one restart only: when a child
;;;; dies its replacement is launched and no sibling is touched. There is no
;;;; second strategy, no restart-intensity budget, no supervision tree. Those are
;;;; v5 features and adding them here is the accretion this project exists to
;;;; avoid.
;;;;
;;;; The reaping rule is not optional: every process this file starts is waited
;;;; on before its handle is dropped. A supervisor that leaks children is worse
;;;; than no supervisor, because the leak is invisible until the machine is full.

(in-package #:constellation)

;;; ---------------------------------------------------------------------------
;;; A child — a command, the live process running it, and how often it has been
;;; replaced. The restart count is observation, not policy: nothing branches on it.
;;; ---------------------------------------------------------------------------

(defstruct (child (:constructor %make-child))
  "One supervised OS process and the command that produces it."
  (command '() :type list)
  (process nil)
  (restarts 0 :type integer))

(defun child-pid (child)
  "The OS pid of CHILD's current process. Changes when the child is restarted —
that change IS the evidence that a replacement happened."
  (uiop:process-info-pid (child-process child)))

(defun child-alive-p (child)
  "True while CHILD's current process is still running."
  (let ((p (child-process child)))
    (and p (uiop:process-alive-p p) t)))

(defun %spawn (command)
  "Launch COMMAND and return its process handle, recording the birth on the spine."
  (let ((process (uiop:launch-program command)))
    (emit (format nil "supervisor:spawn:~a" (uiop:process-info-pid process)))
    process))

;;; ---------------------------------------------------------------------------
;;; The supervisor
;;; ---------------------------------------------------------------------------

(defstruct (supervisor (:constructor %make-supervisor))
  "A flat set of supervised children. Flat on purpose — see the header."
  (children '() :type list))

(defun start-supervisor (commands)
  "Launch one child per command in COMMANDS and return the SUPERVISOR owning them.

COMMANDS is a list of argv lists, e.g. '((\"/bin/sleep\" \"30\")). Whoever calls
this owns the teardown: pair it with SHUTDOWN-SUPERVISOR, ideally through
UNWIND-PROTECT, so a body that signals still reaps."
  (%make-supervisor
   :children (mapcar (lambda (command)
                       (%make-child :command command :process (%spawn command)))
                     commands)))

(defun %reap (child)
  "Terminate CHILD's process if it is still running, wait for it, and return its
exit status.

The wait is bounded by SIGTERM delivery, not by a timeout: TERMINATE-PROCESS has
already signalled the process, so WAIT-PROCESS returns as soon as the kernel
reports the exit. A child that ignored SIGTERM would block here — which is why
supervised commands must be SIGTERM-respecting, and why this first cut does not
launch anything that daemonizes."
  (let ((process (child-process child)))
    (when (uiop:process-alive-p process)
      (uiop:terminate-process process))
    (prog1 (uiop:wait-process process)
      (uiop:close-streams process)
      (emit (format nil "supervisor:reap:~a" (uiop:process-info-pid process))))))

(defun %replace-child (child)
  "Reap CHILD's dead process and put a fresh one in its place. One-for-one: this
touches CHILD and nothing else."
  ;; Collect the corpse BEFORE dropping the handle — the last moment at which
  ;; this process can still be waited on is the moment before we forget it.
  (%reap child)
  (setf (child-process child) (%spawn (child-command child)))
  (incf (child-restarts child))
  (emit (format nil "supervisor:restart:~a" (child-pid child)))
  child)

(defun supervise (supervisor)
  "Run one supervision pass over SUPERVISOR: every child found dead is replaced,
every live child is left alone. Returns the children that were restarted.

A pass, not a loop. Who decides when to look is the caller's business — a first
cut does not also own a scheduler."
  (with-envelope ("supervisor:pass")
    (loop for child in (supervisor-children supervisor)
          unless (child-alive-p child)
            collect (%replace-child child))))

(defun shutdown-supervisor (supervisor)
  "Terminate and reap every child of SUPERVISOR; return their exit statuses.

After this returns, no process this supervisor started is alive — including the
ones it replaced, which were reaped at replacement time. This is the teardown
half of START-SUPERVISOR and it is not optional."
  (with-envelope ("supervisor:shutdown")
    (mapcar #'%reap (supervisor-children supervisor))))

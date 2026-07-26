;;;; src/escalate.lisp — the escalation contact point.
;;;;
;;;; Grounding (src/claim.lisp) is the door a *value* has to pass. This is the
;;;; door a *decision* has to pass, and it is the same shape one level up: a
;;;; worker reaches something only a coordinator is entitled to rule on, says so
;;;; mid-computation, and keeps its stack.
;;;;
;;;; Why this is Lisp and not a state machine. Every other runtime we built made
;;;; the worker return. The question became a message, the message became a
;;;; queue, the queue needed a poller, the poller needed the worker's half-done
;;;; state serialized somewhere so it could be reconstituted when the answer came
;;;; back — and now the unit of work is a state machine whose states exist only
;;;; because the language could not hold a paused computation. v2–v3's nQ/orbit
;;;; protocol was exactly that, and most of it was bookkeeping about itself.
;;;;
;;;; A condition deletes the whole apparatus. The handler runs while the
;;;; signalling frame is still alive; it picks a named restart; the worker
;;;; continues from the line it stopped on. There is no queue because the
;;;; question never left the stack. There is no state machine because nothing was
;;;; ever torn down. There is no polling because the answer arrives by returning
;;;; into the frame that asked.
;;;;
;;;; Three restarts, matching the three things a coordinator can actually say:
;;;;
;;;;   ANSWER        here is the ruling — resume with it.
;;;;   USE-DEFAULT   I am not ruling; take the fallback you already named.
;;;;   ABANDON       this unit of work does not happen. Unwind it.
;;;;
;;;; And the same asymmetry grounding has: the worker names its recovery options
;;;; and never learns which one was taken, or by whom.

(in-package #:constellation)

;;; ---------------------------------------------------------------------------
;;; The condition — a question, and who is asking
;;; ---------------------------------------------------------------------------

(define-condition escalation (error)
  ((question :initarg :question :reader escalation-question)
   (actor :initarg :actor :initform *actor* :reader escalation-actor)
   (default :initarg :default :initform nil :reader escalation-default))
  (:report (lambda (c stream)
             (format stream "~a needs a ruling: ~a"
                     (escalation-actor c)
                     (escalation-question c))))
  (:documentation
   "Signalled mid-computation when a worker reaches a decision that is not its
to make. Carries the QUESTION, the ACTOR asking it, and the DEFAULT the worker
already named as its fallback. The signalling frame is still live when a handler
runs; see ESCALATE for the restarts on offer."))

;;; ---------------------------------------------------------------------------
;;; Units of work — the thing ABANDON abandons
;;; ---------------------------------------------------------------------------

(defvar *work-unit* nil
  "Catch tag of the innermost abandonable unit, or NIL when none is open.
Dynamically bound by WITH-WORK-UNIT; this is how ABANDON knows how far to
unwind without any worker passing a handle around.")

(defmacro with-work-unit ((name) &body body)
  "Delimit one abandonable unit of work called NAME, as a span on the spine.

An ABANDON restart taken anywhere inside — however deep, in code that knows
nothing about this macro — unwinds to here and yields :ABANDONED. The span's
:end envelope still fires, so an abandoned unit is visible in the trace rather
than being a hole in it. Everything else returns BODY's value."
  (let ((tag (gensym "UNIT")))
    `(let ((,tag (list :work-unit (string ,name))))
       (catch ,tag
         (let ((*work-unit* ,tag))
           (with-envelope (,name) ,@body))))))

;;; ---------------------------------------------------------------------------
;;; The door
;;; ---------------------------------------------------------------------------

(defun escalate (question &key default (actor *actor*))
  "Ask QUESTION of whoever is up the stack, and resume in place with the answer.

Signals ESCALATION rather than returning a decision the worker was not entitled
to make. Three restarts are offered, and the choice belongs to the coordinator:

  ANSWER <value>  the ruling. ESCALATE returns VALUE and the worker continues
                  from the exact point it stopped. Nothing is re-run.
  USE-DEFAULT     no ruling; ESCALATE returns DEFAULT, the fallback the worker
                  itself named at the call site.
  ABANDON         this unit of work does not happen. Unwinds to the enclosing
                  WITH-WORK-UNIT, which yields :ABANDONED; with no unit open,
                  ESCALATE simply returns :ABANDONED.

ACTOR defaults to *ACTOR*, so the condition reports who is asking without the
worker having to say."
  (restart-case
      (progn
        ;; Emit BEFORE signalling, so the spine records the stop even if nobody
        ;; up the stack handles it — same discipline as GROUND.
        (emit (format nil "escalate:~a" question))
        (error 'escalation :question question :actor actor :default default))
    (answer (value)
      :report "Supply the ruling; the worker resumes in place with it."
      :interactive (lambda () (list nil))
      (emit (format nil "answered:~a" question))
      value)
    (use-default ()
      :report "Decline to rule; the worker resumes with the default it named."
      (emit (format nil "defaulted:~a" question))
      default)
    (abandon ()
      :report "Abandon this unit of work."
      (emit (format nil "abandoned:~a" question))
      (if *work-unit*
          (throw *work-unit* :abandoned)
          :abandoned))))

;;; ---------------------------------------------------------------------------
;;; The coordinator side
;;; ---------------------------------------------------------------------------

(defmacro with-escalation-policy ((policy) &body body)
  "Run BODY under a standing POLICY for any escalation raised inside it.

POLICY is either a restart name — 'USE-DEFAULT or 'ABANDON — or a function of
one argument (the condition) that invokes a restart itself, which is how a
coordinator supplies an actual ruling:

  (with-escalation-policy ((lambda (c)
                             (invoke-restart 'answer (rule-on c))))
    (do-the-work))

Workers inside BODY never learn which policy was in force, or that there was
one. An unhandled escalation — a policy naming a restart that is not on offer —
falls through to the next handler up, unchanged."
  (let ((p (gensym "POLICY"))
        (c (gensym "CONDITION"))
        (r (gensym "RESTART")))
    `(let ((,p ,policy))
       (handler-bind
           ((escalation
              (lambda (,c)
                (etypecase ,p
                  (function (funcall ,p ,c))
                  (symbol (let ((,r (find-restart ,p ,c)))
                            (when ,r (invoke-restart ,r))))))))
         ,@body))))

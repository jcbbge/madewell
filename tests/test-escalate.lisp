;;;; tests/test-escalate.lisp — the escalation contact point.

(in-package #:constellation/tests)

(in-suite :constellation)

;;; ---------------------------------------------------------------------------
;;; The question reaches the coordinator, and the spine sees it leave
;;; ---------------------------------------------------------------------------

(test escalation-stops-the-worker-and-is-on-the-record
  "A worker that reaches a decision it may not make signals instead of guessing,
and the spine records where it stopped even though nobody handled it."
  (constellation:spine-reset)
  (signals constellation::escalation
    (constellation::escalate "may I exceed the budget?"))
  (is (find "escalate:may I exceed the budget?" (constellation:spine-events)
            :key #'constellation:envelope-name :test #'string=)))

(test the-condition-names-the-asking-actor
  "The question travels with who is asking — the coordinator rules on a worker's
question, not on an anonymous one."
  (handler-case (let ((constellation:*actor* "surveyor"))
                  (constellation::escalate "proceed?"))
    (constellation::escalation (c)
      (is (string= "surveyor" (constellation::escalation-actor c)))
      (is (string= "proceed?" (constellation::escalation-question c)))
      (is (search "surveyor" (princ-to-string c))))))

;;; ---------------------------------------------------------------------------
;;; Resume in place — the whole point of the package
;;; ---------------------------------------------------------------------------

(test the-answer-resumes-in-place-it-does-not-re-run-the-worker
  "THE ACCEPTANCE TEST. The counter is incremented BEFORE the escalation point.
After the coordinator answers, it reads exactly 1: the worker continued from the
line it stopped on. A runtime that re-ran the unit to deliver the answer — every
queue-and-poll protocol we built before this one — would read 2."
  (let ((side-effects 0))
    (flet ((worker ()
             (incf side-effects)             ; happens before the question
             (let ((ruling (constellation::escalate "may I exceed the budget?")))
               (list ruling side-effects))))
      (let ((result (handler-bind
                        ((constellation::escalation
                           (lambda (c)
                             (declare (ignore c))
                             (invoke-restart 'constellation::answer :granted))))
                      (worker))))
        (is (eq :granted (first result)))
        (is (= 1 side-effects))
        (is (= 1 (second result)))))))

(test use-default-substitutes-the-fallback-the-worker-named
  "A coordinator that declines to rule does not stall the worker: the fallback
the worker named at the call site is what resumes."
  (is (eq :read-only
          (constellation::with-escalation-policy ('constellation::use-default)
            (constellation::escalate "write to production?" :default :read-only)))))

(test abandon-unwinds-the-unit-and-nothing-after-it-runs
  "ABANDON is the third answer: this unit does not happen. The unit yields
:ABANDONED and no work past the escalation point executes."
  (let ((after 0))
    (let ((result (constellation::with-escalation-policy ('constellation::abandon)
                    (constellation::with-work-unit ("migrate")
                      (constellation::escalate "drop the table?")
                      (incf after)
                      :completed))))
      (is (eq :abandoned result))
      (is (zerop after)))))

;;; ---------------------------------------------------------------------------
;;; The asymmetry — the worker never learns which coordinator it had
;;; ---------------------------------------------------------------------------

(test the-worker-never-learns-the-escalation-policy
  "One unchanged worker, two coordinators, two outcomes. The worker's text does
not mention policy, defaults, or who answered — it asks and continues."
  (flet ((worker ()
           (constellation::escalate "may I exceed the budget?" :default 0)))
    (let ((under-a-ruling
            (constellation::with-escalation-policy
                ((lambda (c)
                   (declare (ignore c))
                   (invoke-restart 'constellation::answer 100)))
              (worker)))
          (under-abstention
            (constellation::with-escalation-policy ('constellation::use-default)
              (worker))))
      (is (= 100 under-a-ruling))
      (is (= 0 under-abstention)))))

;;; ---------------------------------------------------------------------------
;;; The spine sees the whole contact point
;;; ---------------------------------------------------------------------------

(test escalation-emits-under-its-enclosing-span
  "The question and its resolution both nest under the caller's span, with no
telemetry plumbing in the escalating code at all."
  (constellation:spine-reset)
  (constellation:with-envelope ("dawn")
    (constellation::with-escalation-policy ('constellation::use-default)
      (constellation::escalate "proceed?" :default :fallback)))
  (let* ((events (constellation:spine-events))
         (span (find "dawn" events :key #'constellation:envelope-name
                                   :test #'string=))
         (asked (find "escalate:proceed?" events
                      :key #'constellation:envelope-name :test #'string=))
         (resolved (find "defaulted:proceed?" events
                         :key #'constellation:envelope-name :test #'string=)))
    (is (not (null asked)))
    (is (not (null resolved)))
    (is (= (constellation:envelope-id span)
           (constellation:envelope-parent-id asked)))
    (is (= (constellation:envelope-id span)
           (constellation:envelope-parent-id resolved)))))

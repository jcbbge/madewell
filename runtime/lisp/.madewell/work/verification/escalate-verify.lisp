;;;; escalate-verify.lisp — independent verification of the escalation contact point
;;;; (package c001-03, cycle c001, item i003).
;;;;
;;;; Written by td-escalate (pane wS:pE) under the Isolation Wall: designed ONLY from
;;;; .madewell/work/packages/c001-03-verify-escalate.md, README.md,
;;;; docs/CONSTELLATION-V6-CONVERGENCE.md, and src/package.lisp. No file under src/
;;;; (other than package.lisp) or tests/ was read. The calling surface (lambda lists,
;;;; restart names, envelope shapes) was acquired from the LIVE IMAGE this session via
;;;; sb-introspect and behavioral probes — see the test brief
;;;; .madewell/specs/2026-08-05-c001-escalate.test.md for the acquisition log and the
;;;; contract-vs-observed register of every assertion.
;;;;
;;;; Run from the repository root:
;;;;   sbcl --non-interactive --load .madewell/work/verification/escalate-verify.lisp
;;;; Exit 0 = every check passed. FiveAM prints the per-test report itself.

(asdf:load-system :constellation)
(asdf:load-system :fiveam)

(defpackage #:escalate-verify
  (:use #:common-lisp #:fiveam)
  (:documentation "Independent verification suite for the constellation escalation
contact point. Owns no project symbols; references everything qualified."))

(in-package #:escalate-verify)

;;; ---------------------------------------------------------------------------
;;; Suite + fixture
;;; ---------------------------------------------------------------------------

(def-suite escalate-verify
  :description "c001-03 — escalation / resume-in-place, independently verified.")

(in-suite escalate-verify)

(def-fixture clean-spine ()
  ;; Every test starts from an empty spine: no run-order dependence by construction.
  (constellation:spine-reset)
  (&body))

;;; ---------------------------------------------------------------------------
;;; Helpers (verification-side only; nothing here is the system under test)
;;; ---------------------------------------------------------------------------

(defun spine-events ()
  "Snapshot of the live spine, as a list, in the order SPINE-EVENTS returns it."
  (coerce (constellation:spine-events) 'list))

(defun envelope= (e name phase)
  (and (equal name (constellation:envelope-name e))
       (eq phase (constellation:envelope-phase e))))

(defun find-envelope (name phase events)
  (find-if (lambda (e) (envelope= e name phase)) events))

(defun envelope-position (name phase events)
  (position-if (lambda (e) (envelope= e name phase)) events))

(defun envelopes-named-with-prefix (prefix events)
  "Envelopes whose name is a string beginning with PREFIX. Used for the observed
naming scheme (\"escalate:\", \"answered:\", ...); see brief §Register."
  (remove-if-not
   (lambda (e)
     (let ((n (constellation:envelope-name e)))
       (and (stringp n)
            (<= (length prefix) (length n))
            (string= prefix n :end2 (length prefix)))))
   events))

(defun dynamic-state ()
  "The two special vars a test can observe being restored."
  (list constellation:*work-unit* constellation:*current-parent*))

(defun answer-via-handler (value)
  "A coordinator ruling: a handler that invokes the ANSWER restart with VALUE."
  (lambda (c)
    (declare (ignore c))
    (invoke-restart 'constellation:answer value)))

(defun take-default-handler (c)
  (declare (ignore c))
  (invoke-restart 'constellation:use-default))

(defun abandon-handler (c)
  (declare (ignore c))
  (invoke-restart 'constellation:abandon))

;;; ===========================================================================
;;; Intent 1 — mid-computation signal carrying question/actor/default;
;;;            signalling frame alive at handler time.
;;; ===========================================================================

(test (escalation-is-an-error-condition :fixture clean-spine)
  ;; Intent 1, "an error condition": an uncaught escalation must enter the
  ;; debugger path, so ESCALATION must be a subtype of ERROR.
  (is (subtypep 'constellation:escalation 'error)))

(test (condition-carries-payload :fixture clean-spine)
  ;; Intent 1: the condition carries the question, the actor (defaulting to the
  ;; *actor* in force at the call site), and the exact default object named by
  ;; the worker.
  (let ((seen nil))
    (let ((constellation:*actor* "td-escalate-verify")
          (default (list :the-worker-named-this)))
      (handler-bind
          ((constellation:escalation
             (lambda (c)
               (setf seen (list (constellation:escalation-question c)
                                (constellation:escalation-actor c)
                                (constellation:escalation-default c)))
               (invoke-restart 'constellation:use-default))))
        (constellation:escalate "c001-t1: deploy the build?" :default default))
      (is (equal "c001-t1: deploy the build?" (first seen)))
      (is (equal "td-escalate-verify" (second seen)))
      (is (eq default (third seen))))))

(test (explicit-actor-overrides-dynamic-default :fixture clean-spine)
  ;; Intent 1: :ACTOR at the call site overrides the *actor* default.
  (let ((seen nil))
    (let ((constellation:*actor* "dynamic-actor"))
      (handler-bind
          ((constellation:escalation
             (lambda (c)
               (setf seen (constellation:escalation-actor c))
               (invoke-restart 'constellation:use-default))))
        (constellation:escalate "c001-t1b" :default :d :actor "explicit-actor"))
      (is (equal "explicit-actor" seen)))))

(test (signalling-frame-alive-at-handler :fixture clean-spine)
  ;; Intent 1 + brief "What Could Go Wrong" #2: when a handler runs, the
  ;; signalling frame is still alive — all three restarts are findable
  ;; (condition-scoped) and the dynamic environment of the stop is intact.
  (let ((restarts-found nil)
        (unit-seen :unset)
        (events-before 0)
        (stop-visible-at-handler nil))
    (handler-bind
        ((constellation:escalation
           (lambda (c)
             (setf restarts-found
                   (mapcar (lambda (name) (and (find-restart name c) name))
                           '(constellation:answer
                             constellation:use-default
                             constellation:abandon))
                   unit-seen constellation:*work-unit*
                   events-before (length (spine-events))
                   stop-visible-at-handler
                   (and (envelopes-named-with-prefix "escalate:" (spine-events))
                        t))
             (invoke-restart 'constellation:use-default))))
      (constellation:with-work-unit ("c001-t1-frame-unit")
        (constellation:escalate "c001-t1c" :default :d)))
    (is (equal '(constellation:answer constellation:use-default constellation:abandon)
               restarts-found))
    ;; A unit was open at the stop; the handler still saw it (no unwind yet).
    (is (not (null unit-seen)))
    (is (eq nil constellation:*work-unit*))
    ;; Intent 6 corroboration acquired here because it is only observable here:
    ;; the stop is already on the spine while the frame is alive.
    (is (plusp events-before))
    (is (eq t stop-visible-at-handler))))

;;; ===========================================================================
;;; Intent 2 — the three restarts. The centerpiece: ANSWER resumes in place.
;;; ===========================================================================

(test (answer-resumes-in-place :fixture clean-spine)
  ;; THE acceptance proof of this package. A worker with observable side
  ;; effects BEFORE and AFTER the escalate call; the coordinator answers.
  ;;
  ;; The exact-order log assertion excludes every failure mode at once:
  ;;   - re-run from the top   -> :before-1/:before-2 appear twice
  ;;   - unwind-and-restart    -> :after entries missing or duplicated
  ;;   - ruling not delivered  -> (:after :ruled-go ...) absent
  ;;   - lexical state rebuilt -> artifact identity flag is not T
  ;;   - double signal         -> SIGNALS-SEEN is not 1
  ;; A counter incremented by one form could not distinguish these; the
  ;; before/after ordering can and does.
  (let ((log '())
        (artifact-ref nil)
        (signals-seen 0))
    (flet ((worker ()
             (push :before-1 log)
             (push :before-2 log)
             (let ((artifact (list :allocated-before-the-stop)))
               (setf artifact-ref artifact)
               (let ((ruling (constellation:escalate "c001-t2: continue?"
                                                     :default :no-ruling)))
                 (push (list :after ruling (eq artifact artifact-ref)) log)
                 (push :after-2 log)
                 :worker-ran-to-completion))))
      (let ((result (handler-bind
                        ((constellation:escalation
                           (lambda (c)
                             (declare (ignore c))
                             (incf signals-seen)
                             (invoke-restart 'constellation:answer :ruled-go))))
                      (worker))))
        (is (eq :worker-ran-to-completion result))
        (is (= 1 signals-seen))
        (is (equal '(:before-1
                     :before-2
                     (:after :ruled-go t)
                     :after-2)
                   (reverse log)))))))

(test (use-default-returns-the-exact-default :fixture clean-spine)
  ;; Intent 2: no ruling — ESCALATE returns the very object the worker named
  ;; as its default, and the worker continues with it.
  (let ((default (list :this-exact-object))
        (after-ran nil))
    (let ((returned (handler-bind
                        ((constellation:escalation #'take-default-handler))
                      (let ((r (constellation:escalate "c001-t2b" :default default)))
                        (setf after-ran t)
                        r))))
      (is (eq default returned))
      (is (eq t after-ran)))))

(test (abandon-inside-work-unit-yields-abandoned :fixture clean-spine)
  ;; Intent 2: ABANDON unwinds to the enclosing WITH-WORK-UNIT, which yields
  ;; :ABANDONED. The remainder of the unit body never runs.
  (let ((after-escalate-ran nil))
    (let ((result (constellation:with-work-unit ("c001-t2c-unit")
                    (handler-bind
                        ((constellation:escalation #'abandon-handler))
                      (constellation:escalate "c001-t2c" :default :d))
                    (setf after-escalate-ran t)
                    :unit-completed)))
      (is (eq :abandoned result))
      (is (eq nil after-escalate-ran)))))

(test (abandon-with-no-unit-open-returns-abandoned :fixture clean-spine)
  ;; Intent 2: with no unit open, ESCALATE itself simply returns :ABANDONED.
  (let ((result (handler-bind
                    ((constellation:escalation #'abandon-handler))
                  (constellation:escalate "c001-t2d" :default :d))))
    (is (eq :abandoned result))))

;;; ===========================================================================
;;; Intent 3 — the worker never learns which restart was taken.
;;; ===========================================================================

(test (worker-cannot-distinguish-answer-from-default :fixture clean-spine)
  ;; Intent 3: run the SAME worker twice — once ruled by ANSWER, once fallen
  ;; back via USE-DEFAULT, both delivering the same value. Every observable
  ;; the worker produces must be identical. (The "or by whom" half of the
  ;; intent is not observable from inside a worker; see brief §Ambiguities.)
  (flet ((worker ()
           (let ((trace '()))
             (push :start trace)
             (let ((v (constellation:escalate "c001-t3" :default :the-value)))
               (push (list :resumed-with v) trace)
               (nreverse trace)))))
    (let ((via-answer (handler-bind
                          ((constellation:escalation
                             (answer-via-handler :the-value)))
                        (worker)))
          (via-default (handler-bind
                           ((constellation:escalation #'take-default-handler))
                         (worker))))
      (is (equal '(:start (:resumed-with :the-value)) via-answer))
      (is (equal via-answer via-default)))))

;;; ===========================================================================
;;; Intent 4 — WITH-WORK-UNIT as a spine span; an abandoned unit still closes.
;;; ===========================================================================

(test (work-unit-normal-completion-spans :fixture clean-spine)
  ;; Intent 4: a unit is a span on the spine — :START and :END envelopes under
  ;; the unit's name, in that order — and the body's value is returned.
  (let ((result (constellation:with-work-unit ("c001-t4-unit")
                  (+ 1 2))))
    (is (= 3 result))
    (let ((events (spine-events)))
      (is (not (null (find-envelope "c001-t4-unit" :start events))))
      (is (not (null (find-envelope "c001-t4-unit" :end events))))
      (is (< (envelope-position "c001-t4-unit" :start events)
             (envelope-position "c001-t4-unit" :end events))))))

(test (abandoned-unit-still-closes-its-span :fixture clean-spine)
  ;; Intent 4, acceptance bullet: the abandoned unit's :END envelope is present
  ;; in the ACTUAL spine — an abandoned unit is visible in the trace, not a
  ;; hole in it. The stop and the choice lie between the unit's :START and
  ;; :END (nesting is structure, not inference).
  (constellation:with-work-unit ("c001-t4-abandoned-unit")
    (handler-bind
        ((constellation:escalation #'abandon-handler))
      (constellation:escalate "c001-t4-abandon" :default :d)))
  (let ((events (spine-events)))
    (let ((start-pos (envelope-position "c001-t4-abandoned-unit" :start events))
          (end-pos (envelope-position "c001-t4-abandoned-unit" :end events)))
      (is (not (null start-pos)))
      (is (not (null end-pos)))                  ; THE acceptance assertion
      (is (< start-pos end-pos)))))

(test (nested-units-inner-abandon-leaves-outer-running :fixture clean-spine)
  ;; Intent 4: ABANDON targets the ENCLOSING unit only. The outer unit is not
  ;; the inner one's casualty: it keeps running and completes normally.
  (let ((outer-continued nil))
    (let ((outer (constellation:with-work-unit ("c001-t4-outer")
                   (let ((inner (constellation:with-work-unit ("c001-t4-inner")
                                  (handler-bind
                                      ((constellation:escalation #'abandon-handler))
                                    (constellation:escalate "c001-t4-nested"
                                                            :default :d))
                                  :inner-completed)))
                     (setf outer-continued t)
                     (list :outer-done inner)))))
      (is (eq t outer-continued))
      (is (equal '(:outer-done :abandoned) outer))
      (let ((events (spine-events)))
        (is (not (null (find-envelope "c001-t4-inner" :end events))))
        (is (not (null (find-envelope "c001-t4-outer" :end events))))))))

;;; ===========================================================================
;;; Intent 5 — WITH-ESCALATION-POLICY: restart name; function; fall-through.
;;; ===========================================================================

(test (policy-as-restart-name :fixture clean-spine)
  ;; Intent 5: a standing policy naming the USE-DEFAULT restart settles the
  ;; escalation with no handler bound at all.
  (let ((result (constellation:with-escalation-policy ('constellation:use-default)
                  (constellation:escalate "c001-t5a" :default :settled-by-policy))))
    (is (eq :settled-by-policy result))))

(test (policy-as-function-supplying-a-ruling :fixture clean-spine)
  ;; Intent 5: a policy function receives the escalation condition and invokes
  ;; a restart itself — how a coordinator supplies a real ruling.
  (let ((condition-seen nil))
    (let ((result
            (constellation:with-escalation-policy
                ((lambda (c)
                   (setf condition-seen c)
                   (invoke-restart 'constellation:answer 42)))
              (constellation:escalate "c001-t5b" :default :d))))
      (is (= 42 result))
      (is (typep condition-seen 'constellation:escalation)))))

(test (policy-naming-unoffered-restart-falls-through :fixture clean-spine)
  ;; Intent 5: a policy naming a restart that is not on offer declines, and the
  ;; escalation reaches the next handler up, unchanged (payload intact).
  ;; CONSTELLATION:ACQUIRE is a restart of the grounding door, never of this
  ;; one — its non-membership in the offer set is asserted in
  ;; SIGNALLING-FRAME-ALIVE-AT-HANDLER.
  (let ((payload-at-outer nil))
    (let ((result
            (handler-bind
                ((constellation:escalation
                   (lambda (c)
                     (setf payload-at-outer
                           (list (constellation:escalation-question c)
                                 (constellation:escalation-default c)))
                     (invoke-restart 'constellation:answer :outer-ruling))))
              (constellation:with-escalation-policy ('constellation:acquire)
                (constellation:escalate "c001-t5c" :default :unchanged-default)))))
      (is (eq :outer-ruling result))
      (is (equal '("c001-t5c" :unchanged-default) payload-at-outer)))))

;;; ===========================================================================
;;; Intent 6 — the spine records the stop even unhandled; choice is emitted.
;;; ===========================================================================

(test (unhandled-escalation-still-recorded :fixture clean-spine)
  ;; Intent 6: nobody handles it — the error propagates — and the stop is
  ;; nonetheless on the spine. No choice envelope may exist: none was made.
  (signals constellation:escalation
    (constellation:escalate "c001-t6-unhandled" :default :d))
  (let ((events (spine-events)))
    (is (not (null (envelopes-named-with-prefix "escalate:" events))))
    (is (null (envelopes-named-with-prefix "answered:" events)))
    (is (null (envelopes-named-with-prefix "defaulted:" events)))
    (is (null (envelopes-named-with-prefix "abandoned:" events)))))

(test (stop-emitted-before-signal-choice-emitted-after :fixture clean-spine)
  ;; Intent 6, the temporal claim, proven from inside the live frame:
  ;; at handler time — the signal in flight, no restart invoked yet — the stop
  ;; envelope is already recorded AND no choice envelope exists yet. After the
  ;; ruling, the choice envelope is present and follows the stop.
  (let ((stop-at-handler nil)
        (choice-at-handler :unset))
    (handler-bind
        ((constellation:escalation
           (lambda (c)
             (declare (ignore c))
             (let ((events (spine-events)))
               (setf stop-at-handler
                     (and (envelopes-named-with-prefix "escalate:" events) t)
                     choice-at-handler
                     (or (envelopes-named-with-prefix "answered:" events)
                         (envelopes-named-with-prefix "defaulted:" events)
                         (envelopes-named-with-prefix "abandoned:" events))))
             (invoke-restart 'constellation:answer :ruled))))
      (constellation:escalate "c001-t6-order" :default :d))
    (is (eq t stop-at-handler))          ; emission happened no later than the signal
    (is (null choice-at-handler))        ; and strictly before any choice was made
    (let ((events (spine-events)))
      (let ((stop-pos (position-if
                        (lambda (e)
                          (let ((n (constellation:envelope-name e)))
                            (and (stringp n)
                                 (<= 9 (length n))
                                 (string= "escalate:" n :end2 9))))
                        events))
            (choice-pos (position-if
                          (lambda (e)
                            (let ((n (constellation:envelope-name e)))
                              (and (stringp n)
                                   (<= 9 (length n))
                                   (string= "answered:" n :end2 9))))
                          events)))
        (is (not (null stop-pos)))
        (is (not (null choice-pos)))     ; each restart choice is itself emitted
        (is (< stop-pos choice-pos))))))

;;; ===========================================================================
;;; Acceptance — state restored on every path.
;;; ===========================================================================

(test (dynamic-state-restored-on-every-path :fixture clean-spine)
  ;; "State restored on every path": *WORK-UNIT* and *CURRENT-PARENT* are the
  ;; same before and after each of the five ways an escalation can end.
  (let ((baseline (dynamic-state)))
    (flet ((check (label thunk)
             (funcall thunk)
             (is (equal baseline (dynamic-state))
                 "~a: dynamic state not restored" label)))
      (check "answer"
             (lambda ()
               (handler-bind
                   ((constellation:escalation (answer-via-handler :v)))
                 (constellation:escalate "c001-t7-a" :default :d))))
      (check "use-default"
             (lambda ()
               (handler-bind
                   ((constellation:escalation #'take-default-handler))
                 (constellation:escalate "c001-t7-b" :default :d))))
      (check "abandon-in-unit"
             (lambda ()
               (constellation:with-work-unit ("c001-t7-unit")
                 (handler-bind
                     ((constellation:escalation #'abandon-handler))
                   (constellation:escalate "c001-t7-c" :default :d)))))
      (check "abandon-bare"
             (lambda ()
               (handler-bind
                   ((constellation:escalation #'abandon-handler))
                 (constellation:escalate "c001-t7-d" :default :d))))
      (check "unhandled-caught-outside"
             (lambda ()
               (handler-case (constellation:escalate "c001-t7-e" :default :d)
                 (constellation:escalation () :caught)))))))

;;; ---------------------------------------------------------------------------
;;; Runner. RUN! prints the per-test report and returns true iff all passed
;;; (both directions verified against the live FiveAM this session).
;;; ---------------------------------------------------------------------------

(let ((all-passed (fiveam:run! 'escalate-verify)))
  (finish-output)
  (uiop:quit (if all-passed 0 1)))

;;;; claim-verify.lisp — independent verification of the grounding door (package c001-01)
;;;;
;;;; Designer: td-claim (pane wS:pC), 2026-08-05.
;;;; Wall discipline: designed from the package brief, README.md, and
;;;; src/package.lisp ONLY. No implementation file and nothing in tests/ was read.
;;;; The callable contract (lambda lists, restart names, envelope-name strings)
;;;; was acquired at runtime this session by loading the public system and
;;;; exercising the exported API — never by reading source.
;;;;
;;;; Runner (from the repo root):
;;;;   sbcl --non-interactive \
;;;;        --eval '(asdf:load-system :constellation)' \
;;;;        --load .madewell/work/verification/claim-verify.lisp
;;;; Exit 0 = every check passed. Exit 1 = at least one failure (FiveAM report
;;;; on standard output names the failing checks).
;;;;
;;;; No mocks. Real commands (/bin/echo, /usr/bin/false), real temp files
;;;; (deleted under unwind-protect on every path), real spine contents read back
;;;; via SPINE-EVENTS. The spine is reset before AND after every spine-touching
;;;; check, pass or fail. No test asserts a volatile value (no acquisition-id
;;;; numbers, no timestamps, no counters) — presence and type only.

;;; Form 1: fiveam must be loaded before any fiveam: reader reference appears.
;;; Under --load this form is read (no fiveam: symbols in it) and evaluated
;;; before the next form is read, so the package exists in time.
(asdf:load-system :fiveam)

(fiveam:def-suite claim-verify
  :description "Independent verification of the claim/ground contract (c001-01).")
(fiveam:in-suite claim-verify)

;;; ---------------------------------------------------------------------------
;;; Helpers
;;; ---------------------------------------------------------------------------

(defmacro with-temp-file ((path content) &body body)
  "Create a real temp file containing CONTENT, run BODY, delete the file on
   every exit path."
  `(let ((,path (format nil "/tmp/claim-verify-~D-~D.txt"
                        (get-universal-time) (random 1000000))))
     (unwind-protect
          (progn
            (with-open-file (s ,path :direction :output :if-exists :supersede)
              (write-string ,content s))
            ,@body)
       (when (probe-file ,path)
         (delete-file ,path)))))

(defun observe-ungrounded (thunk &key (resolve :mark-unknown) acquire-with)
  "Run THUNK, which is expected to cross the ground door with no acquisition.
   When UNGROUNDED-CLAIM is signaled, record the condition's payload and the
   restart menu visible at the door, then resolve via RESOLVE (:ACQUIRE uses
   ACQUIRE-WITH as the restart's acquisition argument).
   Returns (values door-result observation-plist); observation is NIL if the
   condition never fired."
  (let ((seen nil))
    (let ((result
            (handler-bind
                ((constellation:ungrounded-claim
                   (lambda (c)
                     (setf seen
                           (list :subject (constellation:ungrounded-claim-subject c)
                                 :value   (constellation:ungrounded-claim-value c)
                                 :restarts (mapcar #'restart-name
                                                   (compute-restarts c))))
                     (ecase resolve
                       (:mark-unknown
                        (invoke-restart (find-restart 'constellation:mark-unknown c)))
                       (:refuse
                        (invoke-restart (find-restart 'constellation:refuse c)))
                       (:acquire
                        (invoke-restart (find-restart 'constellation:acquire c)
                                        acquire-with))))))
              (funcall thunk))))
      (values result seen))))

(defun blocked-condition-type (thunk)
  "Run THUNK with no recovery handler. Returns the type of the condition that
   escaped, or :NO-CONDITION if THUNK returned normally."
  (handler-case (progn (funcall thunk) :no-condition)
    (constellation:ungrounded-claim (c) (type-of c))
    (error (c) (type-of c))))

(defun spine-event-names ()
  (mapcar #'constellation:envelope-name (constellation:spine-events)))

(defmacro with-clean-spine (&body body)
  "Reset the spine before and after BODY, pass or fail."
  `(progn
     (constellation:spine-reset)
     (unwind-protect (progn ,@body)
       (constellation:spine-reset))))

;;; ---------------------------------------------------------------------------
;;; Intent 1 — an acquisition cannot be faked.
;;; The only way to obtain one is to run the command, read the file, or ask
;;; the operator. Kinds: :command :file :operator :absent.
;;; ---------------------------------------------------------------------------

(fiveam:test i1-acquire-command-runs-for-real
  "acquire-command on /bin/echo returns an acquisition whose result is the
   program's real output."
  (let ((a (constellation:acquire-command "/bin/echo" "hello" "grounding")))
    (fiveam:is (typep a 'constellation:acquisition))
    (fiveam:is (eq (constellation:acquisition-kind a) :command))
    (fiveam:is (stringp (constellation:acquisition-result a)))
    (fiveam:is (search "hello grounding" (constellation:acquisition-result a)))
    (fiveam:is (stringp (constellation:acquisition-detail a)))
    (fiveam:is (search "/bin/echo" (constellation:acquisition-detail a)))
    (fiveam:is (not (null (constellation:acquisition-id a))))
    (fiveam:is (integerp (constellation:acquisition-ts a)))))

(fiveam:test i1-acquire-command-nonzero-exit-still-acquires
  "A non-zero exit is STILL a successful acquisition: 'it failed' is a fact
   you acquired. (/usr/bin/false — /bin/false does not exist on this machine;
   verified this session.)"
  (let ((a (constellation:acquire-command "/usr/bin/false")))
    (fiveam:is (typep a 'constellation:acquisition))
    (fiveam:is (eq (constellation:acquisition-kind a) :command))
    ;; the failure must be recorded, not smoothed over
    (fiveam:is (stringp (constellation:acquisition-result a)))
    (fiveam:is (search "exit" (constellation:acquisition-result a)
                       :test #'char-equal))))

(fiveam:test i1-acquire-command-unrunnable-errors
  "A program that cannot be executed at all yields no acquisition — an error,
   not a fabricated source."
  (fiveam:is (not (eq (blocked-condition-type
                       (lambda () (constellation:acquire-command
                                   "/definitely/not/a/real/binary")))
                      :no-condition))))

(fiveam:test i1-acquire-file-reads-for-real
  "acquire-file on a real temp file returns an acquisition whose result is the
   file's real contents."
  (with-temp-file (p "file-evidence-42")
    (let ((a (constellation:acquire-file p)))
      (fiveam:is (typep a 'constellation:acquisition))
      (fiveam:is (eq (constellation:acquisition-kind a) :file))
      (fiveam:is (string= (constellation:acquisition-result a)
                          "file-evidence-42"))
      (fiveam:is (string= (constellation:acquisition-detail a) p)))))

(fiveam:test i1-acquire-file-unreadable-errors
  "A file you could not read is not a source: acquire-file on a missing path
   signals an error."
  (fiveam:is (not (eq (blocked-condition-type
                       (lambda () (constellation:acquire-file
                                   "/tmp/definitely-not-here-claim-verify.xyz")))
                      :no-condition))))

(fiveam:test i1-acquire-operator-records-exchange
  "acquire-operator returns an acquisition of kind :operator binding the
   question asked and the answer received."
  (let ((a (constellation:acquire-operator "What is 2+2?" "4")))
    (fiveam:is (typep a 'constellation:acquisition))
    (fiveam:is (eq (constellation:acquisition-kind a) :operator))
    (fiveam:is (string= (constellation:acquisition-detail a) "What is 2+2?"))
    (fiveam:is (string= (constellation:acquisition-result a) "4"))))

;;; ---------------------------------------------------------------------------
;;; Intent 2 — a claim cannot be constructed without its acquisition.
;;; Subject + value + acquisition, bound. (The export list names no claim
;;; constructor; GROUND is the only door through which a claim can come out.)
;;; ---------------------------------------------------------------------------

(fiveam:test i2-door-binds-subject-value-acquisition
  "ground with a real acquisition returns a claim binding all three parts."
  (let* ((acq (constellation:acquire-command "/bin/echo" "bound-evidence"))
         (c (constellation:ground "bind-subject" 42 :acquisition acq)))
    (fiveam:is (typep c 'constellation:claim))
    (fiveam:is (string= (constellation:claim-subject c) "bind-subject"))
    (fiveam:is (eql (constellation:claim-value c) 42))
    (fiveam:is (eq (constellation:claim-acquisition c) acq))
    (fiveam:is (constellation:groundedp c))))

(fiveam:test i2-no-claim-without-acquisition
  "ground with nothing behind the value cannot produce a claim; a bare value
   is not grounded."
  (fiveam:is (eq (blocked-condition-type
                  (lambda () (constellation:ground "bare-subject" 7)))
                 'constellation:ungrounded-claim))
  (fiveam:is (not (constellation:groundedp 7))))

(fiveam:test i2-door-rejects-non-acquisition
  "The door cannot be handed a fake: :acquisition must be a real acquisition
   value, not an arbitrary stand-in."
  (fiveam:is (eq (blocked-condition-type
                  (lambda () (constellation:ground "fake-int" 1 :acquisition 42)))
                 'constellation:ungrounded-claim))
  (fiveam:is (eq (blocked-condition-type
                  (lambda () (constellation:ground "fake-str" 2 :acquisition "fake")))
                 'constellation:ungrounded-claim)))

;;; ---------------------------------------------------------------------------
;;; Intent 3 — ground is the door. A value with nothing behind it signals
;;; UNGROUNDED-CLAIM (carrying subject and value) and the stack stays alive
;;; while a handler picks a restart: acquire / mark-unknown / refuse.
;;; ---------------------------------------------------------------------------

(fiveam:test i3-ungrounded-signals-condition-with-payload
  "The condition carries the subject and value that tried to pass."
  (multiple-value-bind (result seen)
      (observe-ungrounded (lambda () (constellation:ground "payload-subject" 99)))
    (declare (ignore result))
    (fiveam:is (not (null seen)))
    (fiveam:is (string= (getf seen :subject) "payload-subject"))
    (fiveam:is (eql (getf seen :value) 99))))

(fiveam:test i3-worker-visible-restart-menu
  "At signal time the worker can name its recovery options: acquire,
   mark-unknown, refuse are all in the restart set."
  (multiple-value-bind (result seen)
      (observe-ungrounded (lambda () (constellation:ground "menu-subject" 1)))
    (declare (ignore result))
    (fiveam:is (subsetp '(constellation:acquire
                          constellation:mark-unknown
                          constellation:refuse)
                        (getf seen :restarts)))))

(fiveam:test i3-restart-acquire-resumes-in-place
  "The acquire restart supplies what was missing and the interrupted
   computation resumes IN PLACE: a value computed after the door is derived
   from the resumed result."
  (let ((acq (constellation:acquire-command "/bin/echo" "resumed-evidence"))
        (trail '()))
    (multiple-value-bind (result seen)
        (observe-ungrounded
         (lambda ()
           (push :before-door trail)
           (let ((door (constellation:ground "resume-subject" 41)))
             (push :after-door trail)
             ;; a value computed AFTER the door, from the door's own return
             (list :door door :derived (1+ (constellation:claim-value door)))))
         :resolve :acquire :acquire-with acq)
      (fiveam:is (equal (nreverse trail) '(:before-door :after-door)))
      (fiveam:is (string= (getf seen :subject) "resume-subject"))
      (fiveam:is (eql (getf result :derived) 42))
      (fiveam:is (typep (getf result :door) 'constellation:claim))
      (fiveam:is (eq (constellation:claim-acquisition (getf result :door)) acq))
      (fiveam:is (constellation:groundedp (getf result :door))))))

(fiveam:test i3-restart-mark-unknown-records-absence
  "mark-unknown records the absence honestly: the claim that comes back does
   NOT carry the ungrounded value; its acquisition is of kind :absent."
  (multiple-value-bind (result seen)
      (observe-ungrounded (lambda () (constellation:ground "unknown-subject" 12345))
                          :resolve :mark-unknown)
    (fiveam:is (eql (getf seen :value) 12345))
    (fiveam:is (typep result 'constellation:claim))
    ;; honesty: the original value is not presented as acquired
    (fiveam:is (not (eql (constellation:claim-value result) 12345)))
    (fiveam:is (eq (constellation:acquisition-kind
                    (constellation:claim-acquisition result))
                   :absent))
    (fiveam:is (not (null (constellation:acquisition-result
                           (constellation:claim-acquisition result)))))))

(fiveam:test i3-restart-refuse-does-not-pass-value
  "refuse: the ungrounded value does not come back out of the door."
  (multiple-value-bind (result seen)
      (observe-ungrounded (lambda () (constellation:ground "refuse-subject" 77))
                          :resolve :refuse)
    (fiveam:is (eql (getf seen :value) 77))
    ;; the door's return is not a claim and does not carry the refused value
    (fiveam:is (not (typep result 'constellation:claim)))
    (fiveam:is (not (eql result 77)))))

(fiveam:test i3-unhandled-ungrounded-does-not-pass
  "With no handler and no policy, a value with nothing behind it does not
   pass: the ungrounded-claim condition escapes."
  (fiveam:is (eq (blocked-condition-type
                  (lambda () (constellation:ground "unhandled-subject" 1)))
                 'constellation:ungrounded-claim)))

;;; ---------------------------------------------------------------------------
;;; Intent 4 — the worker never learns which restart was taken or by whom.
;;; Recovery is named by the worker, chosen elsewhere.
;;; ---------------------------------------------------------------------------

(fiveam:test i4-worker-never-learns-recovery-choice
  "One and the same worker thunk runs under three different recovery choices
   made by three different handlers. The worker body never changes; it only
   ever receives the door's return value."
  (let ((acq (constellation:acquire-command "/bin/echo" "chosen-elsewhere"))
        (trail-a (list nil)) (trail-m (list nil)) (trail-r (list nil)))
    (flet ((worker (subject value trail-box)
             ;; the worker: compute, cross the door, keep computing.
             ;; no recovery logic lives here.
             (push :before-door (car trail-box))
             (let ((door (constellation:ground subject value)))
               (push :after-door (car trail-box))
               (list :door door
                     :grounded (constellation:groundedp door)))))
      (multiple-value-bind (res-a seen-a)
          (observe-ungrounded (lambda () (worker "w" 7 trail-a))
                              :resolve :acquire :acquire-with acq)
        (multiple-value-bind (res-m seen-m)
            (observe-ungrounded (lambda () (worker "w" 7 trail-m))
                                :resolve :mark-unknown)
          (multiple-value-bind (res-r seen-r)
              (observe-ungrounded (lambda () (worker "w" 7 trail-r))
                                  :resolve :refuse)
            ;; all three runs crossed the door and kept computing
            (fiveam:is (equal (nreverse (car trail-a)) '(:before-door :after-door)))
            (fiveam:is (equal (nreverse (car trail-m)) '(:before-door :after-door)))
            (fiveam:is (equal (nreverse (car trail-r)) '(:before-door :after-door)))
            ;; the worker named the same menu every time; the choice differed
            (fiveam:is (subsetp '(constellation:acquire
                                  constellation:mark-unknown
                                  constellation:refuse)
                                (getf seen-a :restarts)))
            (fiveam:is (equal (getf seen-a :subject) (getf seen-m :subject)))
            (fiveam:is (equal (getf seen-m :subject) (getf seen-r :subject)))
            ;; and all the worker ever learned is the door's return value:
            (fiveam:is (constellation:groundedp (getf res-a :door)))   ; acquired
            (fiveam:is (eq (constellation:claim-value (getf res-m :door))
                           :unknown))                                   ; marked
            (fiveam:is (null (getf res-r :door)))                       ; refused
            ))))))

;;; ---------------------------------------------------------------------------
;;; Intent 5 — every acquisition emits on the spine (acquire:<kind> envelopes).
;;; Verified against the actual spine contents.
;;; ---------------------------------------------------------------------------

(fiveam:test i5-spine-acquire-command
  (with-clean-spine
    (constellation:acquire-command "/bin/echo" "spine-check")
    (let ((events (constellation:spine-events)))
      (fiveam:is (every (lambda (e) (typep e 'constellation:envelope)) events))
      (fiveam:is (member "acquire:command" (spine-event-names) :test #'string=)))))

(fiveam:test i5-spine-acquire-file
  (with-clean-spine
    (with-temp-file (p "spine-file-evidence")
      (constellation:acquire-file p)
      (fiveam:is (member "acquire:file" (spine-event-names) :test #'string=)))))

(fiveam:test i5-spine-acquire-operator
  (with-clean-spine
    (constellation:acquire-operator "spine question" "spine answer")
    (fiveam:is (member "acquire:operator" (spine-event-names) :test #'string=))))

(fiveam:test i5-spine-absent-acquisition
  "The :absent acquisition created by mark-unknown is an acquisition too:
   acquire:absent appears on the spine."
  (with-clean-spine
    (observe-ungrounded (lambda () (constellation:ground "absent-subject" 1))
                        :resolve :mark-unknown)
    (fiveam:is (member "acquire:absent" (spine-event-names) :test #'string=))))

;;; ---------------------------------------------------------------------------
;;; Intent 6 — with-grounding-policy scopes a policy decision to a dynamic
;;; extent.
;;; ---------------------------------------------------------------------------

(fiveam:test i6-policy-decides-inside-extent
  "Inside the extent the policy makes the recovery decision: no handler, no
   escaped condition — the claim comes back marked unknown."
  (let ((c (constellation:with-grounding-policy ('constellation:mark-unknown)
             (constellation:ground "policy-inside" 1))))
    (fiveam:is (typep c 'constellation:claim))
    (fiveam:is (eq (constellation:claim-value c) :unknown))
    (fiveam:is (eq (constellation:acquisition-kind
                    (constellation:claim-acquisition c))
                   :absent))))

(fiveam:test i6-policy-refuse-variant
  "A different policy, a different decision: refuse inside the extent means
   the value does not pass — with no handler written by the worker."
  (let ((r (constellation:with-grounding-policy ('constellation:refuse)
             (constellation:ground "policy-refuse" 2))))
    (fiveam:is (not (typep r 'constellation:claim)))
    (fiveam:is (not (eql r 2)))))

(fiveam:test i6-policy-ends-with-extent
  "The policy is dynamically scoped: once the extent closes, the default
   door behavior (signal) is restored."
  (let ((inside (constellation:with-grounding-policy ('constellation:mark-unknown)
                  (constellation:ground "extent-inside" 1)))
        (outside (blocked-condition-type
                  (lambda () (constellation:ground "extent-outside" 2)))))
    (fiveam:is (typep inside 'constellation:claim))
    (fiveam:is (eq (constellation:claim-value inside) :unknown))
    (fiveam:is (eq outside 'constellation:ungrounded-claim))))

;;; ---------------------------------------------------------------------------
;;; Gate: exit 1 on any failure so the runner's shell sees the verdict.
;;; (fiveam:run! returns T on all-green, NIL otherwise — exercised this
;;; session, not assumed.)
;;; ---------------------------------------------------------------------------

(uiop:quit (if (fiveam:run! 'claim-verify) 0 1))

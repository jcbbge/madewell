;;;; tests/test-claim.lisp — the grounding contact point.

(in-package #:constellation/tests)

(in-suite :constellation)

;;; ---------------------------------------------------------------------------
;;; Acquisitions
;;; ---------------------------------------------------------------------------

(test acquisition-records-what-actually-ran
  "ACQUIRE-COMMAND runs the command; the acquisition holds the real output."
  (let ((acq (constellation:acquire-command "/bin/echo" "2.6.6")))
    (is (eq :command (constellation:acquisition-kind acq)))
    (is (string= "/bin/echo 2.6.6" (constellation:acquisition-detail acq)))
    (is (string= "2.6.6" (constellation:acquisition-result acq)))))

(test acquisition-records-failure-as-a-fact
  "A non-zero exit is still an acquisition — 'it failed' is something you learned."
  (let ((acq (constellation:acquire-command "/usr/bin/false")))
    (is (search "exit 1" (constellation:acquisition-result acq)))))

(test acquire-file-reads-the-file
  (let ((acq (constellation:acquire-file
              (asdf:system-relative-pathname :constellation "constellation.asd"))))
    (is (eq :file (constellation:acquisition-kind acq)))
    (is (search "defsystem" (constellation:acquisition-result acq)))))

(test operator-words-are-a-first-class-source
  (let ((acq (constellation:acquire-operator "first slice?" "grounding first")))
    (is (eq :operator (constellation:acquisition-kind acq)))
    (is (string= "grounding first" (constellation:acquisition-result acq)))))

;;; ---------------------------------------------------------------------------
;;; The door
;;; ---------------------------------------------------------------------------

(test grounded-value-passes-the-door
  (let* ((acq (constellation:acquire-command "/bin/echo" "2.6.6"))
         (claim (constellation:ground 'sbcl-version "2.6.6" :acquisition acq)))
    (is (constellation:groundedp claim))
    (is (string= "2.6.6" (constellation:claim-value claim)))
    (is (eq acq (constellation:claim-acquisition claim)))))

(test ungrounded-value-cannot-reach-an-assertion
  "THE ACCEPTANCE TEST. A plausible, correct-looking value with nothing behind
it does not pass the door — and the spine records exactly where it stopped."
  (constellation:spine-reset)
  (signals constellation:ungrounded-claim
    (constellation:ground 'sbcl-version "2.6.6"))
  ;; The stop is on the record, not just in the caller's head.
  (is (find "ungrounded:SBCL-VERSION" (constellation:spine-events)
            :key #'constellation:envelope-name :test #'string=)))

(test the-report-names-the-subject
  (handler-case (constellation:ground 'ocicl-version "2.17.0")
    (constellation:ungrounded-claim (c)
      (is (eq 'ocicl-version (constellation:ungrounded-claim-subject c)))
      (is (search "no acquisition" (princ-to-string c))))))

;;; ---------------------------------------------------------------------------
;;; Restarts — the stack is still alive when the handler runs
;;; ---------------------------------------------------------------------------

(test acquire-restart-resumes-in-place
  "The coordinator supplies what was missing and the computation continues from
where it stopped. Nothing is re-run and the worker is not rewritten."
  (let ((claim (handler-bind
                   ((constellation:ungrounded-claim
                      (lambda (c)
                        (declare (ignore c))
                        (invoke-restart 'constellation:acquire
                                        (constellation:acquire-command
                                         "/bin/echo" "2.6.6")))))
                 (constellation:ground 'sbcl-version "2.6.6"))))
    (is (constellation:groundedp claim))
    (is (string= "2.6.6" (constellation:claim-value claim)))))

(test mark-unknown-is-honest-not-a-guess
  "UNKNOWN is recorded as a claim sourced by an explicit absence — auditable,
and never mistakable for a verified value."
  (let ((claim (constellation:with-grounding-policy ('constellation:mark-unknown)
                 (constellation:ground 'sbcl-version "2.6.6"))))
    (is (eq :unknown (constellation:claim-value claim)))
    (is (not (constellation:groundedp claim)))
    (is (eq :absent (constellation:acquisition-kind
                     (constellation:claim-acquisition claim))))))

(test refuse-policy-blocks-the-assertion
  (is (null (constellation:with-grounding-policy ('constellation:refuse)
              (constellation:ground 'sbcl-version "2.6.6")))))

(test the-worker-never-learns-the-policy
  "One unchanged worker, two coordinators, two outcomes. The decision lives with
the coordinator; the work lives with the worker."
  (flet ((worker ()
           ;; Knows nothing about policy. Just states what it believes and
           ;; names its recovery options by reaching the door.
           (constellation:ground 'sbcl-version "2.6.6")))
    (let ((under-unknown (constellation:with-grounding-policy
                             ('constellation:mark-unknown)
                           (worker)))
          (under-refusal (constellation:with-grounding-policy
                             ('constellation:refuse)
                           (worker))))
      (is (eq :unknown (constellation:claim-value under-unknown)))
      (is (null under-refusal)))))

;;; ---------------------------------------------------------------------------
;;; The spine sees the whole contact point
;;; ---------------------------------------------------------------------------

(test grounding-emits-under-its-enclosing-span
  "Grounding inside a span nests underneath it, with no telemetry plumbing in
the grounding code at all."
  (constellation:spine-reset)
  (constellation:with-envelope ("dawn")
    (constellation:ground 'sbcl-version "2.6.6"
                          :acquisition (constellation:acquire-command
                                        "/bin/echo" "2.6.6")))
  (let* ((events (constellation:spine-events))
         (span (find "dawn" events :key #'constellation:envelope-name
                                   :test #'string=))
         (door (find "ground:SBCL-VERSION" events
                     :key #'constellation:envelope-name :test #'string=)))
    (is (not (null door)))
    (is (= (constellation:envelope-id span)
           (constellation:envelope-parent-id door)))))

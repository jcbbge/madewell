;;;; tests/test-spine.lisp — the telemetry spine.

(in-package #:constellation/tests)

(in-suite :constellation)

(test spine-records-emissions-in-order
  "EMIT appends to the spine with monotonic ids."
  (constellation:spine-reset)
  (constellation:emit "first")
  (constellation:emit "second")
  (let ((events (constellation:spine-events)))
    (is (= 2 (length events)))
    (is (equal '("first" "second") (mapcar #'constellation:envelope-name events)))
    (is (equal '(1 2) (mapcar #'constellation:envelope-id events)))))

(test with-envelope-brackets-body-with-start-and-end
  "WITH-ENVELOPE emits :start before and :end after, and returns the body value."
  (constellation:spine-reset)
  (let ((result (constellation:with-envelope ("slice") (* 6 7))))
    (is (= 42 result))
    (let ((events (constellation:spine-events)))
      (is (= 2 (length events)))
      (is (eq :start (constellation:envelope-phase (first events))))
      (is (eq :end (constellation:envelope-phase (second events))))
      (is (integerp (constellation:envelope-duration-ns (second events)))))))

(test nesting-is-structure-not-inference
  "The call tree is carried by PARENT-ID, threaded by dynamic binding rather
than passed as an argument. INNER knows nothing about telemetry."
  (constellation:spine-reset)
  (flet ((inner () (constellation:emit "leaf")))
    (constellation:with-envelope ("outer")
      (constellation:with-envelope ("middle")
        (inner))))
  (let* ((events (constellation:spine-events))
         (by-name (lambda (name phase)
                    (find-if (lambda (e)
                               (and (string= name (constellation:envelope-name e))
                                    (eq phase (constellation:envelope-phase e))))
                             events))))
    (let ((outer (funcall by-name "outer" :start))
          (middle (funcall by-name "middle" :start))
          (leaf (funcall by-name "leaf" :point)))
      (is (null (constellation:envelope-parent-id outer)))
      (is (= (constellation:envelope-id outer)
             (constellation:envelope-parent-id middle)))
      (is (= (constellation:envelope-id middle)
             (constellation:envelope-parent-id leaf))))))

(test end-envelope-fires-even-when-body-signals
  "A span that breaks still closes. Losing the :end is how you lose the bug."
  (constellation:spine-reset)
  (handler-case
      (constellation:with-envelope ("doomed") (error "boom"))
    (error () nil))
  (let ((events (constellation:spine-events)))
    (is (= 2 (length events)))
    (is (eq :end (constellation:envelope-phase (second events))))))

(test ndjson-emits-the-v5-contract-keys
  "Field names on the wire are v5's, so any reader written against v5 works."
  (constellation:spine-reset)
  (constellation:emit "probe")
  (let ((line (with-output-to-string (s) (constellation:spine-write-ndjson s))))
    (dolist (key '("\"id\"" "\"parent_id\"" "\"phase\"" "\"ts\""
                   "\"duration_ns\"" "\"actor_id\"" "\"name\""))
      (is (search key line) "missing key ~a in ~s" key line))
    (is (search "\"name\":\"probe\"" line))
    (is (search "\"parent_id\":null" line))))

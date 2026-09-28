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

(test the-ring-evicts-the-oldest-and-keeps-the-order
  "The spine is bounded. Past capacity the oldest envelopes are evicted, the
newest is retained, and SPINE-EVENTS still reads oldest-first across the wrap —
the place where storage order and logical order come apart."
  (unwind-protect
       (let ((constellation::*spine-capacity* 4))
         (constellation:spine-reset)
         (dolist (name '("e1" "e2" "e3" "e4" "e5" "e6"))
           (constellation:emit name))
         (let* ((events (constellation:spine-events))
                (names (mapcar #'constellation:envelope-name events)))
           ;; bounded
           (is (= 4 (length events)))
           ;; oldest evicted
           (is (not (member "e1" names :test #'string=)))
           (is (not (member "e2" names :test #'string=)))
           ;; newest retained
           (is (string= "e6" (car (last names))))
           ;; order preserved, oldest first, across the wrap
           (is (equal '("e3" "e4" "e5" "e6") names))
           (is (equal '(3 4 5 6) (mapcar #'constellation:envelope-id events)))))
    ;; back to the default capacity for every test after this one
    (constellation:spine-reset)))

(test spine-reset-empties-a-wrapped-ring
  "SPINE-RESET works whatever lap the ring is on, and resizes it."
  (unwind-protect
       (progn
         (let ((constellation::*spine-capacity* 2))
           (constellation:spine-reset)
           (constellation:emit "x")
           (constellation:emit "y")
           (constellation:emit "z")
           (constellation:spine-reset)
           (is (null (constellation:spine-events)))
           (is (= 1 (constellation:envelope-id (constellation:emit "fresh")))))
         ;; capacity is back at its default, so the ring is too, after a reset
         (constellation:spine-reset)
         (is (= constellation::*spine-capacity*
                (length constellation::*spine*))))
    (constellation:spine-reset)))

(test ndjson-follows-the-ring-not-the-slots
  "The wire output reads the ring through the same door SPINE-EVENTS does:
evicted envelopes are absent, survivors are oldest-first, no NIL slots leak."
  (unwind-protect
       (let ((constellation::*spine-capacity* 2))
         (constellation:spine-reset)
         (constellation:emit "a")
         (constellation:emit "b")
         (constellation:emit "c")
         (let ((out (with-output-to-string (s)
                      (constellation:spine-write-ndjson s))))
           (is (= 2 (count #\Newline out)))
           (is (null (search "\"name\":\"a\"" out)))
           (is (< (search "\"name\":\"b\"" out)
                  (search "\"name\":\"c\"" out)))))
    (constellation:spine-reset)))

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

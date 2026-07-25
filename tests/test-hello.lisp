;;;; tests/test-hello.lisp — FiveAM suite for the hello slice.
;;;;
;;;; FiveAM model: def-suite declares a named suite, in-suite makes it current,
;;;; test defines a case, is/signals are the assertions.

(in-package #:constellation/tests)

(def-suite :constellation
  :description "Top-level Constellation suite.")

(in-suite :constellation)

(test greeting-defaults-to-world
  "GREETING with no argument greets the world."
  (is (string= "Hello, world." (constellation:greeting))))

(test greeting-uses-argument
  "GREETING interpolates the name it is given."
  (is (string= "Hello, Josh." (constellation:greeting "Josh"))))

(test hello-writes-to-stream
  "HELLO writes the greeting plus a newline, and returns the string."
  (let* ((out (make-string-output-stream))
         (returned (constellation:hello "Constellation" out)))
    (is (string= "Hello, Constellation." returned))
    (is (string= (format nil "Hello, Constellation.~%")
                 (get-output-stream-string out)))))

(defun run-all ()
  "Run the suite. Returns T when every test passed — the exit-code contract
for CI: `(if (run-all) 0 1)`."
  (results-status (run :constellation)))

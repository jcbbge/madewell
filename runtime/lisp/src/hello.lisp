;;;; src/hello.lisp — the first executable line of Constellation v6.
;;;;
;;;; Deliberately trivial. Its job is to prove the whole chain works:
;;;; ASDF finds the system, SBCL compiles it, FiveAM tests it, and
;;;; save-lisp-and-die can ship it as a native binary.

(in-package #:constellation)

(defun greeting (&optional (who "world"))
  "Return the greeting string for WHO. Pure — returns, does not print.

Keeping the string-builder separate from the printer is what makes this
testable: a test can assert on a return value without capturing stdout."
  (format nil "Hello, ~a." who))

(defun hello (&optional (who "world") (stream *standard-output*))
  "Print the greeting for WHO to STREAM. Returns the string that was printed."
  (let ((text (greeting who)))
    (format stream "~a~%" text)
    text))

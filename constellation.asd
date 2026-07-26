;;;; constellation.asd — ASDF system definition
;;;;
;;;; Two systems:
;;;;   constellation        — the library
;;;;   constellation/tests  — the FiveAM suite (loaded on demand)
;;;;
;;;; Build:  sbcl --eval '(asdf:load-system :constellation)'
;;;; Test:   make test   (see Makefile)

(asdf:defsystem "constellation"
  :description "Constellation v6 — the Level-0 harness, in Common Lisp."
  :author "Josh Gantt"
  :license "MIT"
  :version "0.0.1"
  :serial t
  :pathname "src"
  :depends-on ("uiop")
  :components ((:file "package")
               (:file "hello")
               (:file "spine")
               (:file "claim"))
  :in-order-to ((asdf:test-op (asdf:test-op "constellation/tests"))))

(asdf:defsystem "constellation/tests"
  :description "Test suite for Constellation."
  :depends-on ("constellation" "fiveam")
  :serial t
  :pathname "tests"
  :components ((:file "package")
               (:file "test-hello")
               (:file "test-spine")
               (:file "test-claim"))
  :perform (asdf:test-op (op system)
             (uiop:symbol-call :fiveam :run! :constellation)))

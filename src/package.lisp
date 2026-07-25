;;;; src/package.lisp — package definitions
;;;;
;;;; A package is Lisp's namespace. Symbols interned here are private unless
;;;; listed in :export. `#:name` is an uninterned symbol — the idiom for naming
;;;; things in a defpackage form without leaving stray symbols behind.

(defpackage #:constellation
  (:use #:common-lisp)
  (:nicknames #:cst)
  (:export #:hello
           #:greeting))

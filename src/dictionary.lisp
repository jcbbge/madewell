;;;; src/dictionary.lisp — the live-image dictionary emitter.
;;;;
;;;; No external tool can see inside a running Lisp: KotaDB and Coraline both
;;;; skip .lisp entirely (DECISION-2026-07-22-code-intel). This is that
;;;; decision's option 1 — the language maps itself. We do not parse source; we
;;;; ask the image what it has, which is API truth with no parser to drift.
;;;;
;;;; The JSON writers live in spine.lisp (%JSON-ESCAPE, %JSON-VALUE) and are
;;;; called, not copied.

(in-package #:constellation)

(eval-when (:compile-toplevel :load-toplevel :execute)
  ;; SB-INTROSPECT is a contrib, absent from a bare image; lambda lists are the
  ;; one thing ANSI does not expose portably.
  (require :sb-introspect))

(defun %symbol-kind (symbol)
  "What SYMBOL names, as a keyword. Order is the point: a macro is a macro even
though it is also FBOUNDP, and that distinction is why this file exists."
  (cond ((macro-function symbol) :macro)
        ((special-operator-p symbol) :special-operator)
        ((fboundp symbol) :function)
        ((find-class symbol nil) :class)
        ((boundp symbol) :variable)
        (t :symbol)))

(defun %symbol-lambda-list (symbol)
  "SYMBOL's lambda list as a string, or NIL when it has none."
  (when (or (fboundp symbol) (macro-function symbol))
    (handler-case (princ-to-string (sb-introspect:function-lambda-list symbol))
      (error () nil))))

(defun %symbol-documentation (symbol kind)
  "SYMBOL's docstring, asked for under the doc-type its KIND actually uses."
  (case kind
    (:variable (documentation symbol 'variable))
    (:class (documentation symbol 'type))
    (t (documentation symbol 'function))))

(defun dictionary-entries (&optional (package :constellation))
  "Every external symbol of PACKAGE as a plist of :NAME :KIND :LAMBDA-LIST
:DOCUMENTATION, sorted by name so the output is stable across images."
  (let ((entries '()))
    (do-external-symbols (s (find-package package))
      (let ((kind (%symbol-kind s)))
        (push (list :name (string-downcase (symbol-name s))
                    :kind kind
                    :lambda-list (%symbol-lambda-list s)
                    :documentation (%symbol-documentation s kind))
              entries)))
    (sort entries #'string< :key (lambda (e) (getf e :name)))))

(defun write-dictionary (&optional (package :constellation)
                                   (stream *standard-output*))
  "Write PACKAGE's external API to STREAM as a JSON array, one object per line."
  (let ((entries (dictionary-entries package)))
    (write-line "[" stream)
    (loop for (entry . rest) on entries
          do (format stream " {\"name\":~a,\"kind\":~a,\"lambda_list\":~a,~
                             \"documentation\":~a}~:[~;,~]~%"
                     (%json-value (getf entry :name))
                     (%json-value (getf entry :kind))
                     (%json-value (getf entry :lambda-list))
                     (%json-value (getf entry :documentation))
                     rest))
    (write-line "]" stream))
  (values))

(defun dictionary-json (&optional (package :constellation))
  "PACKAGE's external API as a JSON string."
  (with-output-to-string (out) (write-dictionary package out)))

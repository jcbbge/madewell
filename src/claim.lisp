;;;; src/claim.lisp — the grounding contact point.
;;;;
;;;; The thesis, in one paragraph: an agent that states a fact it did not acquire
;;;; is not making a small error. The caveat dies with the session and the
;;;; fabricated value persists looking verified. So grounding cannot be a rule an
;;;; agent is asked to follow — it has to be a property of the values themselves.
;;;;
;;;; Three pieces:
;;;;
;;;;   ACQUISITION  a record that something actually happened this session. There
;;;;                is no constructor that takes your word for it: the only way
;;;;                to get one is to run the command, read the file, or ask the
;;;;                operator. The acquisition IS the doing.
;;;;
;;;;   CLAIM        a subject bound to a value AND the acquisition behind it.
;;;;                Not a value with a source attached as metadata — a value that
;;;;                cannot be constructed without one.
;;;;
;;;;   GROUND       the door. Where a value becomes an assertion. A value with no
;;;;                acquisition behind it does not pass; it signals, and the
;;;;                stack stays alive while someone decides what to do.
;;;;
;;;; That last part is why this is Lisp. The operator's own epistemics rule reads
;;;; "No source → field omitted or written UNKNOWN → ask." A predicate can
;;;; express the filter but not the ask. A condition expresses both: the door
;;;; signals, a coordinator anywhere up the stack picks a restart, and the worker
;;;; resumes in place — never having learned what the policy was.

(in-package #:constellation)

;;; ---------------------------------------------------------------------------
;;; Acquisitions — you cannot fake one, because making one performs it.
;;; ---------------------------------------------------------------------------

(defstruct acquisition
  "Evidence that something was actually done this session."
  (id 0 :type integer)
  (kind :command)      ; :command | :file | :operator | :absent
  (detail "" :type string)   ; what was run / read / asked
  (result "" :type string)   ; what came back
  (ts 0 :type integer))

(defvar *acquisition-counter* 0)

(defun %new-acquisition (kind detail result)
  (emit (format nil "acquire:~(~a~)" kind))
  (make-acquisition :id (incf *acquisition-counter*)
                    :kind kind
                    :detail detail
                    :result result
                    :ts (get-universal-time)))

(defun acquire-command (program &rest args)
  "Run PROGRAM with ARGS and return an ACQUISITION of its output.

The acquisition exists because the command ran. A non-zero exit is still a
successful acquisition — 'it failed' is a fact you acquired."
  (multiple-value-bind (out err code)
      (uiop:run-program (cons program args)
                        :output '(:string :stripped t)
                        :error-output '(:string :stripped t)
                        :ignore-error-status t)
    (declare (ignore err))
    (%new-acquisition :command
                      (format nil "~{~a~^ ~}" (cons program args))
                      (format nil "~a~@[ (exit ~a)~]" out (unless (zerop code) code)))))

(defun acquire-file (path)
  "Read PATH and return an ACQUISITION of its contents. Errors if unreadable —
a file you could not read is not a source."
  (let ((text (uiop:read-file-string path)))
    (%new-acquisition :file (namestring path) text)))

(defun acquire-operator (question answer)
  "Record the operator's own words as a source. Legitimate and first-class:
the human saying it IS the acquisition."
  (%new-acquisition :operator question answer))

(defun %absent-acquisition (subject)
  "The record that NO source existed for SUBJECT. Not a fake acquisition — the
explicit, auditable trace of having looked and found nothing."
  (%new-acquisition :absent (string subject) "no source acquired this session"))

;;; ---------------------------------------------------------------------------
;;; Claims
;;; ---------------------------------------------------------------------------

(defstruct claim
  "A subject, its value, and the acquisition that sourced it. The acquisition
slot is not optional — that is the entire design."
  subject
  value
  (acquisition nil :type (or acquisition null)))

(defun groundedp (claim)
  "True when CLAIM rests on a real acquisition rather than an absence."
  (and (claim-p claim)
       (acquisition-p (claim-acquisition claim))
       (not (eq :absent (acquisition-kind (claim-acquisition claim))))))

;;; ---------------------------------------------------------------------------
;;; The condition and its restarts
;;; ---------------------------------------------------------------------------

(define-condition ungrounded-claim (error)
  ((subject :initarg :subject :reader ungrounded-claim-subject)
   (value :initarg :value :reader ungrounded-claim-value))
  (:report (lambda (c stream)
             (format stream "~s was asserted as ~s with no acquisition behind it"
                     (ungrounded-claim-subject c)
                     (ungrounded-claim-value c))))
  (:documentation
   "Signalled at the door when a value arrives without a source. The stack is
still alive when a handler runs; see GROUND for the restarts on offer."))

;;; ---------------------------------------------------------------------------
;;; The door
;;; ---------------------------------------------------------------------------

(defun ground (subject value &key acquisition)
  "The door. Return a CLAIM binding SUBJECT to VALUE, sourced by ACQUISITION.

With no ACQUISITION, signal UNGROUNDED-CLAIM rather than returning. Three
restarts are offered, and the choice belongs to whoever is up the stack:

  ACQUIRE <acq>   supply the missing acquisition; the claim is built and the
                  computation resumes in place. Nothing is re-run.
  MARK-UNKNOWN    return a claim whose value is :UNKNOWN, sourced by an explicit
                  record of absence. Honest, auditable, and not a guess.
  REFUSE          return NIL. The assertion does not happen at all.

Note what the caller does NOT do: decide. It names its recovery options and
keeps going."
  (if (acquisition-p acquisition)
      (progn
        (emit (format nil "ground:~a" subject))
        (make-claim :subject subject :value value :acquisition acquisition))
      (restart-case
          (progn
            ;; Emit BEFORE signalling, so the spine records where the stop
            ;; happened even if nobody handles it.
            (emit (format nil "ungrounded:~a" subject))
            (error 'ungrounded-claim :subject subject :value value))
        (acquire (acq)
          :report "Supply the acquisition and resume in place."
          :interactive (lambda () (list nil))
          (ground subject value :acquisition acq))
        (mark-unknown ()
          :report "Record the absence of a source; value becomes :UNKNOWN."
          (emit (format nil "unknown:~a" subject))
          (make-claim :subject subject
                      :value :unknown
                      :acquisition (%absent-acquisition subject)))
        (refuse ()
          :report "Refuse the assertion entirely."
          (emit (format nil "refused:~a" subject))
          nil))))

(defmacro with-grounding-policy ((policy) &body body)
  "Run BODY under a standing POLICY for any ungrounded claim raised inside it.

POLICY is either a restart name — 'MARK-UNKNOWN or 'REFUSE — or a function of
one argument (the condition) that invokes a restart itself. Workers inside BODY
never learn which was chosen."
  (let ((p (gensym "POLICY"))
        (c (gensym "CONDITION"))
        (r (gensym "RESTART")))
    `(let ((,p ,policy))
       (handler-bind
           ((ungrounded-claim
              (lambda (,c)
                (etypecase ,p
                  (function (funcall ,p ,c))
                  (symbol (let ((,r (find-restart ,p ,c)))
                            (when ,r (invoke-restart ,r))))))))
         ,@body))))

;;;; tests/test-dictionary.lisp — the live-image dictionary emitter.
;;;;
;;;; Symbols here are referenced with `::` because this slice is not yet
;;;; registered in constellation.asd and nothing is exported yet. `::` keeps
;;;; working after export, so these tests do not change at integration.

(in-package #:constellation/tests)

(in-suite :constellation)

;;; ---------------------------------------------------------------------------
;;; A JSON validator, because "it looks right" is not an assertion.
;;;
;;; No JSON parser is present in the image and adding a dependency is banned,
;;; so this walks the grammar (RFC 8259) over the subset the emitter produces:
;;; arrays, objects, strings with escapes, null, and numbers. It returns the
;;; index after the value it consumed, or signals — so a trailing-garbage or
;;; unterminated-string bug cannot pass.
;;; ---------------------------------------------------------------------------

(defun %ws (s i)
  (loop while (and (< i (length s)) (member (char s i) '(#\Space #\Tab #\Newline #\Return)))
        do (incf i))
  i)

(defun %expect (s i ch)
  (unless (and (< i (length s)) (char= (char s i) ch))
    (error "expected ~s at ~a in ~s" ch i (subseq s i (min (length s) (+ i 20)))))
  (1+ i))

(defun %json-string (s i)
  "Consume a JSON string starting at the opening quote; return the index after it."
  (setf i (%expect s i #\"))
  (loop
    (when (>= i (length s)) (error "unterminated string"))
    (let ((ch (char s i)))
      (cond ((char= ch #\") (return (1+ i)))
            ((char= ch #\\)
             (let ((esc (char s (1+ i))))
               (unless (find esc "\"\\/bfnrtu") (error "bad escape ~s" esc))
               (incf i (if (char= esc #\u) 6 2))))
            ((< (char-code ch) #x20) (error "raw control char in string"))
            (t (incf i))))))

(defun %json-parse (s &optional (i 0))
  "Consume one JSON value at I; return the index after it. Signals on anything
that is not well-formed."
  (setf i (%ws s i))
  (when (>= i (length s)) (error "value expected at end of input"))
  (let ((ch (char s i)))
    (cond
      ((char= ch #\") (%json-string s i))
      ((char= ch #\[)
       (setf i (%ws s (1+ i)))
       (if (char= (char s i) #\]) (1+ i)
           (loop
             (setf i (%ws s (%json-parse s i)))
             (cond ((char= (char s i) #\,) (incf i))
                   (t (return (%expect s i #\])))))))
      ((char= ch #\{)
       (setf i (%ws s (1+ i)))
       (if (char= (char s i) #\}) (1+ i)
           (loop
             (setf i (%ws s i))
             (setf i (%ws s (%json-string s i)))   ; every key must be quoted
             (setf i (%ws s (%expect s i #\:)))
             (setf i (%ws s (%json-parse s i)))
             (cond ((char= (char s i) #\,) (incf i))
                   (t (return (%expect s i #\})))))))
      ((and (<= (+ i 4) (length s)) (string= "null" s :start2 i :end2 (+ i 4))) (+ i 4))
      ((and (<= (+ i 4) (length s)) (string= "true" s :start2 i :end2 (+ i 4))) (+ i 4))
      ((and (<= (+ i 5) (length s)) (string= "false" s :start2 i :end2 (+ i 5))) (+ i 5))
      ((or (digit-char-p ch) (char= ch #\-))
       (loop while (and (< i (length s)) (find (char s i) "-+.eE0123456789")) do (incf i))
       i)
      (t (error "unexpected char ~s at ~a" ch i)))))

(defun %json-valid-p (s)
  "True when S is exactly one well-formed JSON value with nothing trailing."
  (handler-case (= (length s) (%ws s (%json-parse s)))
    (error () nil)))

(defun %entry (name)
  "The emitter's entry plist for NAME, by name."
  (find name (constellation::dictionary-entries :constellation)
        :key (lambda (e) (getf e :name)) :test #'string=))

;;; ---------------------------------------------------------------------------
;;; The validator is itself tested — otherwise it only proves it agrees with
;;; the emitter, which is not the same as proving either is right.
;;; ---------------------------------------------------------------------------

(test the-json-validator-rejects-invalid-json
  "Structural validity is only an assertion if the validator can say no."
  (is (%json-valid-p "[{\"a\":\"b\",\"c\":null}]"))
  (is (%json-valid-p "{\"a\":\"line\\nbreak\\\"quote\"}"))
  (is (not (%json-valid-p "[{\"a\":\"b\"}")))          ; unbalanced
  (is (not (%json-valid-p "{a:\"b\"}")))               ; unquoted key
  (is (not (%json-valid-p "{\"a\":\"unterminated}")))  ; open string
  (is (not (%json-valid-p "[] junk")))                 ; trailing garbage
  (is (not (%json-valid-p "{\"a\":}"))))               ; missing value

;;; ---------------------------------------------------------------------------
;;; The emitter
;;; ---------------------------------------------------------------------------

(test dictionary-emits-valid-json
  "The emitted dictionary parses as one well-formed JSON value, end to end."
  (is (%json-valid-p (constellation::dictionary-json :constellation))))

(test dictionary-escaping-survives-a-multiline-docstring
  "WITH-ENVELOPE's docstring contains newlines; they come out as \\n escapes and
the result still parses. Unescaped, this is exactly what breaks JSON."
  (let ((json (constellation::dictionary-json :constellation))
        (doc (getf (%entry "with-envelope") :documentation)))
    ;; sanity: the docstring under test really does contain a raw newline
    (is (find #\Newline doc))
    ;; ...which appears in the JSON as an escape, never as a raw line break
    (is (search "\\n" json))
    (is (%json-valid-p json))
    ;; the escape round-trips to the same text, not to a mangled one
    (is (search "closes its span" doc))))

(test dictionary-covers-the-external-api
  "Every external symbol of the package appears exactly once."
  (let ((entries (constellation::dictionary-entries :constellation))
        (externals 0))
    (do-external-symbols (s (find-package :constellation)) (declare (ignore s))
      (incf externals))
    (is (= externals (length entries)))
    (dolist (name '("ground" "emit" "with-envelope" "acquire-command"))
      (is (not (null (%entry name))) "~a is missing from the dictionary" name))))

(test dictionary-reports-a-macro-as-a-macro
  "THE ACCEPTANCE TEST. WITH-ENVELOPE is a macro and EMIT is a function. Both
are FBOUNDP, so a naive walker calls both functions — and an agent that cannot
tell them apart writes code that does not compile. This distinction is the
reason the package exists."
  (is (eq :macro (getf (%entry "with-envelope") :kind)))
  (is (eq :function (getf (%entry "emit") :kind)))
  (is (eq :function (getf (%entry "ground") :kind)))
  (is (eq :variable (getf (%entry "*actor*") :kind)))
  (is (eq :class (getf (%entry "envelope") :kind)))
  ;; and the kinds survive into the JSON, lowercased
  (let ((json (constellation::dictionary-json :constellation)))
    (is (search "\"name\":\"with-envelope\",\"kind\":\"macro\"" json))
    (is (search "\"name\":\"emit\",\"kind\":\"function\"" json))))

(test dictionary-carries-the-real-docstrings
  "The docstring in the output is the text from the source, not a placeholder."
  (is (string= "Emit one envelope and return it. The primitive every other emit is built on."
               (getf (%entry "emit") :documentation)))
  (is (string= "Who is emitting. Rebind per star/worker once those exist."
               (getf (%entry "*actor*") :documentation)))
  (is (string= "One impulse on the spine. Field set is the v5 contract; do not reorder or rename."
               (getf (%entry "envelope") :documentation)))
  (let ((ground (getf (%entry "ground") :documentation))
        (acq (getf (%entry "acquire-command") :documentation))
        (span (getf (%entry "with-envelope") :documentation)))
    (is (search "The door. Return a CLAIM binding SUBJECT to VALUE" ground))
    (is (search "MARK-UNKNOWN    return a claim whose value is :UNKNOWN" ground))
    (is (search "Run PROGRAM with ARGS and return an ACQUISITION of its output." acq))
    (is (search "'it failed' is a fact you acquired." acq))
    (is (search "Run BODY bracketed by :start and :end envelopes" span))
    ;; and the real text reaches the JSON, escaped
    (is (search "The primitive every other emit is built on."
                (constellation::dictionary-json :constellation)))))

(test dictionary-carries-lambda-lists-and-null-for-the-rest
  "Callables report their lambda list; a variable has none and says so."
  (is (search "&KEY" (getf (%entry "emit") :lambda-list)))
  (is (string= "((NAME) &BODY BODY)" (getf (%entry "with-envelope") :lambda-list)))
  (is (null (getf (%entry "*actor*") :lambda-list)))
  (is (search "\"lambda_list\":null" (constellation::dictionary-json :constellation))))

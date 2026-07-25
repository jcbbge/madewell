;;;; tour/tour.lisp — an annotated, runnable walkthrough of Common Lisp.
;;;;
;;;; Run it:  make tour     (or: sbcl --script tour/tour.lisp)
;;;;
;;;; This is a teaching artifact, not library code. Read it top to bottom with
;;;; the output beside you: each DEMO line prints the source form and the value
;;;; it evaluated to, so you can see the language do the thing as you read it.
;;;;
;;;; The sections are ordered so that each one earns the next. The last four —
;;;; macros, conditions, CLOS, the live image — are the ones that matter for
;;;; Constellation v6; the first eight exist so those four make sense.

(in-package #:cl-user)

;;; ---------------------------------------------------------------------------
;;; Scaffolding for the tour itself.
;;; ---------------------------------------------------------------------------

(defun section (n title)
  "Print a section header."
  (format t "~%~%~a~%~2,'0d. ~a~%~a~%" (make-string 74 :initial-element #\=)
          n (string-upcase title) (make-string 74 :initial-element #\=)))

(defun note (text)
  "Print a prose note, wrapped at the left margin."
  (format t "~%~a~%" text))

(defmacro demo (form)
  "Evaluate FORM, printing the source and the resulting value.

This macro is itself the first lesson: `',form` captures the *unevaluated
source code* of the argument, because in Lisp a program is a data structure
that other programs can hold. No other language's print-the-expression helper
gets to be four lines long."
  (let ((value (gensym "VALUE")))
    `(let ((,value ,form))
       (format t "    ~s~%        => ~s~%" ',form ,value)
       ,value)))


;;; ---------------------------------------------------------------------------
(section 1 "The only syntax rule")
;;; ---------------------------------------------------------------------------

(note "Everything is a parenthesised list: (operator argument argument ...).
Operators come first — always, with no exceptions and no precedence table.
`2 + 3 * 4` is ambiguous without rules you had to memorise; the Lisp form
is not, because the nesting IS the precedence.")

(demo (+ 2 3))
(demo (+ 2 (* 3 4)))
(demo (* (+ 2 3) 4))
(demo (+ 1 2 3 4 5))              ; operators take any number of arguments
(demo (list 1 2 3))
(demo (length "constellation"))

(note "That is the entire syntax. What follows is not new syntax — it is the
standard library and a handful of special operators, all wearing the same
shape.")


;;; ---------------------------------------------------------------------------
(section 2 "Values, and how they print")
;;; ---------------------------------------------------------------------------

(demo 42)
(demo 3.14159)
(demo 1/3)                        ; exact rationals, not floats
(demo (+ 1/3 1/6))                ; ... and they stay exact
(demo (expt 2 200))               ; bignums, no overflow, no special type
(demo #\A)                        ; a character
(demo "a string")
(demo 'a-symbol)                  ; a symbol: a name that is also a value
(demo :a-keyword)                 ; a keyword: a symbol that evaluates to itself
(demo t)
(demo nil)

(note "NIL is the single most overloaded value in the language: it is false,
it is the empty list, and it is the symbol NIL. Everything that is not NIL is
true. There is no separate falsy set — 0 and \"\" are both true.")

(demo (if 0 :zero-is-true :zero-is-false))
(demo (null nil))
(demo (eq nil '()))


;;; ---------------------------------------------------------------------------
(section 3 "Lists, and the cons cell underneath them")
;;; ---------------------------------------------------------------------------

(note "A list is a chain of two-slot cells. CAR is the first slot, CDR the
rest. This is why the language is called LISP — LISt Processing — and it is
the reason code can be data: your source is made of these same cells.")

(demo (cons 1 '(2 3)))
(demo (car '(1 2 3)))
(demo (cdr '(1 2 3)))
(demo (first '(a b c)))
(demo (rest '(a b c)))
(demo (nth 2 '(a b c d)))
(demo (append '(1 2) '(3 4)))
(demo (reverse '(1 2 3)))
(demo (member 'c '(a b c d)))     ; returns the TAIL, not a boolean

(note "QUOTE — written ' — is the switch between the two readings. Without it,
a list is a call to evaluate. With it, the same list is inert data.")

(demo (+ 1 2))                    ; read as a call
(demo '(+ 1 2))                   ; read as a three-element list
(demo (car '(+ 1 2)))             ; ... whose first element is the symbol +
(demo (eval '(+ 1 2)))            ; ... and which we can hand back to evaluate

(note "Hold on to that last pair. It is the whole trick, and section 9 cashes
it in.")


;;; ---------------------------------------------------------------------------
(section 4 "Functions")
;;; ---------------------------------------------------------------------------

(defun square (x)
  "Return X times itself."
  (* x x))

(demo (square 7))

(note "The docstring is not a comment — it is stored on the function object and
is queryable from the running image (section 12).")

(demo (documentation 'square 'function))

(note "Argument lists carry optionals, keywords and rest-args natively.
(Optionals and keywords in the SAME list is legal but confusing, and SBCL
style-warns about it — so these are two functions, as they should be.)")

(defun positioned (name &optional (magnitude 0) (house :dawn))
  (list :name name :magnitude magnitude :house house))

(defun named (name &key (magnitude 0) (house :dawn) tags)
  (list :name name :magnitude magnitude :house house :tags tags))

(demo (positioned "Markarian"))
(demo (positioned "Markarian" 3))
(demo (named "Markarian" :house :meridian :tags '(:focal :quasar)))

(defun total (&rest numbers)
  (reduce #'+ numbers :initial-value 0))

(demo (total 1 2 3 4))

(note "Functions are values. #' takes the function object; LAMBDA makes an
anonymous one.")

(demo (mapcar #'square '(1 2 3 4)))
(demo (mapcar (lambda (x) (* x 10)) '(1 2 3)))
(demo (reduce #'+ '(1 2 3 4 5)))
(demo (remove-if #'evenp '(1 2 3 4 5 6)))
(demo (sort (copy-list '(3 1 2)) #'<))

(note "A function may return several values at once — not a tuple that the
caller must destructure, but genuinely multiple values that extra callers can
simply ignore.")

(demo (floor 17 5))                          ; prints the primary value only
(demo (multiple-value-list (floor 17 5)))    ; quotient AND remainder


;;; ---------------------------------------------------------------------------
(section 5 "Binding, scope, and closures")
;;; ---------------------------------------------------------------------------

(demo (let ((a 2) (b 3)) (* a b)))               ; parallel binding
(demo (let* ((a 2) (b (* a 5))) (+ a b)))        ; sequential — b can see a

(note "A closure is a function that captured the bindings it was made under.")

(defun make-counter ()
  "Return a function that returns 1, then 2, then 3, ... ."
  (let ((n 0))
    (lambda () (incf n))))

(defparameter *counter* (make-counter))
(demo (funcall *counter*))
(demo (funcall *counter*))
(demo (funcall *counter*))

(note "DEFPARAMETER makes a *special* variable — dynamically scoped. Rebinding
it with LET affects every function called underneath, for the duration of that
call, and then unwinds. Earmuffs *like-this* are the convention that warns you
a variable behaves this way.

This is not a curiosity. Constellation's telemetry spine uses exactly this to
thread parent_id through the call tree without passing it as an argument: the
nesting of the dynamic bindings IS the nesting of the trace.")

(defparameter *depth* 0)

(defun trace-line (label)
  (format t "    ~v@{  ~}~a (depth ~d)~%" *depth* label *depth*))

(defun inner ()
  (trace-line "inner"))

(defun outer ()
  (trace-line "outer")
  (let ((*depth* (1+ *depth*)))    ; rebind for the dynamic extent of this call
    (inner))
  (trace-line "outer again"))

(outer)


;;; ---------------------------------------------------------------------------
(section 6 "Choosing")
;;; ---------------------------------------------------------------------------

(demo (if (> 3 2) :yes :no))
(demo (when (> 3 2) :fired))
(demo (unless (> 3 2) :fired))
(demo (cond ((< 3 2) :impossible)
            ((= 3 3) :equal)
            (t :fallback)))
(demo (case (* 2 3)
        ((1 2 3) :small)
        ((4 5 6) :medium)
        (otherwise :large)))
(demo (and 1 2 3))                ; returns the last value, not T
(demo (or nil nil :found))        ; returns the first non-NIL


;;; ---------------------------------------------------------------------------
(section 7 "Repeating")
;;; ---------------------------------------------------------------------------

(note "DOLIST and DOTIMES cover most of it. LOOP is a whole sub-language —
verbose, unlispy, and the thing everyone actually uses.")

(format t "    dolist: ")
(dolist (x '(a b c)) (format t "~a " x))
(format t "~%    dotimes: ")
(dotimes (i 5) (format t "~d " i))
(format t "~%")

(demo (loop for i from 1 to 5 collect (* i i)))
(demo (loop for x in '(1 2 3 4 5 6) when (evenp x) collect x))
(demo (loop for x in '(1 2 3 4) sum x))
(demo (loop for x in '(3 9 2 7) maximize x))
(demo (loop for (k v) on '(:a 1 :b 2) by #'cddr collect (cons k v)))


;;; ---------------------------------------------------------------------------
(section 8 "The other data structures")
;;; ---------------------------------------------------------------------------

(defparameter *v* (vector 10 20 30))
(demo (aref *v* 1))
(demo (length *v*))

(defparameter *h* (make-hash-table :test #'equal))
(setf (gethash "sbcl" *h*) "2.6.6"
      (gethash "ocicl" *h*) "2.17.0")
(demo (gethash "sbcl" *h*))
(demo (hash-table-count *h*))

(note "SETF is the universal assignment operator: it takes a *place* — a
variable, an array slot, a hash key, a struct field — and stores into it.
One operator, every kind of location.")

(defstruct envelope
  "The telemetry impulse — v5's spine contract, as a struct."
  id parent-id phase name)

(defparameter *e* (make-envelope :id 1 :phase :start :name "grounding"))
(demo (envelope-name *e*))
(setf (envelope-phase *e*) :end)
(demo (envelope-phase *e*))
(demo *e*)


;;; ---------------------------------------------------------------------------
(section 9 "Macros — the reason to be here")
;;; ---------------------------------------------------------------------------

(note "A macro is a function that runs at compile time, takes source code as
data, and returns source code. Because source is just lists (section 3), no
string templating and no separate metaprogramming API is involved — you write
ordinary Lisp that happens to output Lisp.

Backquote ` is quote with holes: , splices one value in, ,@ splices a list.")

(defmacro with-timing ((label) &body body)
  "Run BODY, reporting how long it took."
  `(let ((start (get-internal-real-time)))
     (multiple-value-prog1 (progn ,@body)
       (format t "    [~a took ~,3fs]~%" ,label
               (/ (- (get-internal-real-time) start)
                  internal-time-units-per-second)))))

(demo (with-timing ("summing a million")
        (loop for i from 1 to 1000000 sum i)))

(note "MACROEXPAND-1 shows you exactly what the compiler will see. The macro is
not magic and not hidden — it is a source-to-source function you can inspect.")

(format t "    expansion of (with-timing (\"x\") (+ 1 2)):~%        ~s~%"
        (macroexpand-1 '(with-timing ("x") (+ 1 2))))

(note "The payoff: control structures are library code, not language features.
Here is a new one, invented in six lines, indistinguishable from a builtin.")

(defmacro while (test &body body)
  `(loop (unless ,test (return)) ,@body))

(let ((n 0))
  (format t "    while: ")
  (while (< n 5) (format t "~d " n) (incf n))
  (format t "~%"))

(note "This is why Constellation is being built here. Made Well's contact
points — ground, verify, the ratchet, the pause — do not have to be a framework
the agent is asked to obey. They can be macros: forms that a worker's code is
written *inside*, where the law is enforced by the expansion rather than by
convention.")


;;; ---------------------------------------------------------------------------
(section 10 "The condition system — the asymmetric feature")
;;; ---------------------------------------------------------------------------

(note "Exceptions in most languages unwind first and ask questions later: by
the time your handler runs, the stack that raised the error is gone. Lisp
splits those two things apart. A handler runs *while the signalling frame is
still alive*, and may choose a named recovery path — a restart — that resumes
the computation in place.

Read the next twenty lines carefully. This is First Cut #2 in the convergence
plan: a worker asks the coordinator a question mid-computation and continues
where it stopped. No polling, no re-run, no state machine.")

(define-condition needs-ruling (error)
  ((question :initarg :question :reader question))
  (:report (lambda (c stream)
             (format stream "worker needs a ruling: ~a" (question c)))))

(defun worker (n)
  "Process N. Over budget, stop and ask — but leave a way to be answered."
  (restart-case
      (progn
        (when (> n 2)
          (error 'needs-ruling
                 :question (format nil "task ~d exceeds the budget. Proceed?" n)))
        (* n 10))
    (approve ()
      :report "Grant the exception and continue at full value."
      (* n 100))
    (deny ()
      :report "Refuse; the task yields nothing."
      0)))

(defun coordinator (policy)
  "Run four tasks under POLICY, answering any ruling the workers ask for."
  (handler-bind ((needs-ruling
                   (lambda (c)
                     (format t "        ~a  -> ~a~%" c policy)
                     (invoke-restart policy))))
    (mapcar #'worker '(1 2 3 4))))

(format t "~%    under an approving coordinator:~%")
(demo (coordinator 'approve))

(format t "~%    under a denying coordinator:~%")
(demo (coordinator 'deny))

(note "Note what did NOT happen: WORKER was never rewritten, never restarted,
and never learned what the policy was. It named its recovery options and kept
going. The decision lives with the coordinator; the work lives with the worker;
the stack survives the disagreement.

That is the cooperative pause, and in this language it is thirty lines of
standard library rather than an architecture.")

(note "HANDLER-CASE is the familiar try/catch, for when you do want to unwind.")

(demo (handler-case (error "boom")
        (error (c) (format nil "caught: ~a" c))))

(note "And UNWIND-PROTECT is `finally` — cleanup that runs no matter how the
frame exits.")

(demo (unwind-protect (+ 1 2)
        (format t "    (cleanup ran)~%")))


;;; ---------------------------------------------------------------------------
(section 11 "CLOS — objects, but the methods live outside the classes")
;;; ---------------------------------------------------------------------------

(defclass celestial ()
  ((name :initarg :name :accessor name)
   (magnitude :initarg :magnitude :accessor magnitude :initform 0))
  (:documentation "Anything in the sky."))

(defclass star (celestial) ())
(defclass quasar (star)
  ((minority-share :initarg :share :accessor minority-share :initform 0.33)))

(defgeneric interact (a b)
  (:documentation "What happens when A meets B."))

(defmethod interact ((a star) (b star))
  (list :peers (name a) (name b)))

(defmethod interact ((a quasar) (b star))
  (list :gravitational-pull (name a) :on (name b) :share (minority-share a)))

(defparameter *vega* (make-instance 'star :name "Vega" :magnitude 0.03))
(defparameter *mk* (make-instance 'quasar :name "Markarian" :share 0.31))

(demo (name *vega*))
(demo (magnitude *vega*))
(demo (interact *vega* *mk*))
(demo (interact *mk* *vega*))

(note "Both calls are `interact`. The method chosen depends on the types of
BOTH arguments — multiple dispatch. A method is not owned by a class; it is a
rule attached to a combination of types, and anyone can add one later without
touching the class definition.

There is also :before / :after / :around — methods that wrap a call rather than
replace it. This is where cross-cutting law (emit a telemetry envelope around
every primitive fire) gets installed without editing the primitives.")

(defmethod interact :before ((a quasar) (b star))
  (format t "        [spine] envelope: quasar-interaction start~%"))

(demo (interact *mk* *vega*))


;;; ---------------------------------------------------------------------------
(section 12 "The live image — the thing you cannot get elsewhere")
;;; ---------------------------------------------------------------------------

(note "Everything above is running inside an image: a live, inspectable world
that holds every symbol, function, class and value. It is not a build artifact.
You can interrogate it, change it while it runs, and then freeze the whole
thing to disk as an executable.")

(demo (lisp-implementation-type))
(demo (lisp-implementation-version))

(note "ASDF can pull a whole system into the running image, mid-program. Here
the tour loads Constellation itself — the same system `make hello` builds —
and then calls into it.")

;; Load quietly: the compiler's chatter would drown the tour.
(let ((*standard-output* (make-broadcast-stream)))
  (asdf:load-system :constellation))

(demo (find-package :constellation))
(demo (constellation:greeting "reader"))
(demo (fboundp 'square))
(demo (documentation 'interact 'function))
(demo (apropos-list "GREET" :constellation))

(note "Redefinition is live. The function object is replaced under the name;
callers pick it up on their next call.")

(demo (square 5))
(defun square (x) (list :redefined-while-running (* x x)))
(demo (square 5))

(note "And because code is data, a program can build a program and run it —
the same mechanism section 3 hinted at, now doing real work.")

(defparameter *built-form* (list '+ 1 (list '* 2 20)))
(demo *built-form*)
(demo (eval *built-form*))

(defparameter *built-fn* (compile nil '(lambda (x) (* x 3))))
(demo (funcall *built-fn* 14))

(note "That is the mechanism behind Dark Phase Accretion in the convergence
plan: when the factory idles, it reads its own telemetry, proposes a new
primitive as a FORM, and — once you approve it — EVALs it into the running
system. Self-modification here is not a feature someone had to build. It is
Tuesday.")


;;; ---------------------------------------------------------------------------
(section 13 "Where this lands for Constellation")
;;; ---------------------------------------------------------------------------

(format t "
    Section  Feature                    What it becomes in v6
    -------  -------------------------  -----------------------------------------
      3, 12  code is data, EVAL         accretion proposes primitives as forms
          5  dynamic binding            spine parent_id, threaded by scope
          9  macros                     contact points as forms, not conventions
         10  restarts                   escalate/resume; the cooperative pause
         11  multiple dispatch          per-level harness behaviour on one verb
         11  :around methods            telemetry wrapped around every fire
         12  live image                 the harness modifies itself, in place
         12  save-lisp-and-die          ships as one native binary, no runtime

    Nothing on the right-hand column needs a framework. That is the bet.
")

(format t "~%~a~%tour complete.~%~a~%~%"
        (make-string 74 :initial-element #\=)
        (make-string 74 :initial-element #\=))

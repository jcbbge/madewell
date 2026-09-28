;;;; src/spine.lisp — the telemetry spine.
;;;;
;;;; Not a logger. The nervous system. Every primitive fire is a neuron and the
;;;; Envelope is the impulse. `parent_id` encodes the call tree, so nesting is
;;;; STRUCTURE, not something a reader has to infer from timestamps.
;;;;
;;;; The Lisp move (see tour/tour.lisp §5): parent_id is a dynamic binding, not
;;;; a threaded argument. WITH-ENVELOPE rebinds *CURRENT-PARENT* for the dynamic
;;;; extent of its body, so anything the body calls — however deep, through
;;;; however many functions that know nothing about telemetry — emits under the
;;;; right parent automatically. The nesting of the bindings IS the nesting of
;;;; the trace.
;;;;
;;;; The Envelope field set is kept byte-compatible with v5's TELEMETRY.md
;;;; contract (id, parent_id, phase, ts, duration_ns, actor_id, name) so any
;;;; reader or visualizer written against v5 reads v6 unchanged.

(in-package #:constellation)

(defstruct envelope
  "One impulse on the spine. Field set is the v5 contract; do not reorder or rename."
  (id 0 :type integer)
  (parent-id nil)
  (phase :start)                        ; :start | :end | :point
  (ts 0 :type integer)                  ; universal time, seconds
  (duration-ns nil)                     ; set on :end, nil otherwise
  (actor-id "constellation" :type string)
  (name "" :type string))

(defvar *spine-capacity* 10000
  "How many envelopes the spine keeps. The spine is a RING: once it is full the
oldest envelope is evicted to make room for the newest, so a process that runs
all day costs the same memory as one that runs for a second. 10,000 envelopes is
a couple of megabytes and a deep enough recent window to debug from — and the
recent window is the part of a trace anyone ever reads. Rebind this and call
SPINE-RESET to resize.")

(defvar *spine* (make-array *spine-capacity* :initial-element nil)
  "The ring of emitted envelopes. A vector, because that is what a ring buffer is.
Its LENGTH — not *SPINE-CAPACITY* — is the live capacity; the variable is the
setting, the array is the fact. Slot order stops being emission order the moment
the ring wraps; SPINE-EVENTS is the only thing that knows the difference.")

(defvar *spine-writes* 0
  "Envelopes written since the last reset. Doubles as the write cursor: the next
envelope lands at (mod *spine-writes* capacity), and once it exceeds the capacity
the ring has wrapped.")

(defvar *envelope-counter* 0
  "Monotonic id source. Deterministic on purpose — tests assert on ids.")

(defvar *current-parent* nil
  "The id of the enclosing envelope. Rebound by WITH-ENVELOPE for its dynamic
extent; this is what makes the call tree free.")

(defvar *actor* "constellation"
  "Who is emitting. Rebind per star/worker once those exist.")

(defun spine-reset ()
  "Clear the spine and reset the id counter. For tests and fresh sessions.
Also the resize door: if *SPINE-CAPACITY* no longer matches the live ring, the
ring is reallocated at the new capacity here and nowhere else."
  (check-type *spine-capacity* (integer 1))
  (if (= (length *spine*) *spine-capacity*)
      (fill *spine* nil)
      (setf *spine* (make-array *spine-capacity* :initial-element nil)))
  (setf *spine-writes* 0
        *envelope-counter* 0
        *current-parent* nil)
  (values))

(defun spine-events ()
  "Every envelope still on the spine, oldest first, as a list.
Once the ring has wrapped, oldest-first is NOT slot order: the walk starts at
the oldest surviving slot and steps forward modulo the capacity. Envelopes
evicted by the wrap are gone — this is the retained window, not the history."
  (let* ((capacity (length *spine*))
         (kept (min *spine-writes* capacity))
         (oldest (mod (- *spine-writes* kept) capacity)))
    (loop for i from 0 below kept
          collect (aref *spine* (mod (+ oldest i) capacity)))))

(defun emit (name &key (phase :point) (parent *current-parent*) duration-ns)
  "Emit one envelope and return it. The primitive every other emit is built on."
  (let ((e (make-envelope :id (incf *envelope-counter*)
                          :parent-id parent
                          :phase phase
                          :ts (get-universal-time)
                          :duration-ns duration-ns
                          :actor-id *actor*
                          :name (string name))))
    ;; The write is the eviction: whatever sat in this slot a lap ago is the
    ;; oldest envelope, and overwriting it is how the ring stays bounded.
    (setf (aref *spine* (mod *spine-writes* (length *spine*))) e)
    (incf *spine-writes*)
    e))

(defmacro with-envelope ((name) &body body)
  "Run BODY bracketed by :start and :end envelopes, timed, with BODY's own
emissions nested underneath.

The :end envelope fires through UNWIND-PROTECT, so a body that signals still
closes its span — a trace that stops mid-span is how you find the thing that
broke, and losing it is how you don't."
  (let ((start (gensym "START"))
        (began (gensym "BEGAN"))
        (nm (gensym "NAME")))
    `(let* ((,nm (string ,name))
            (,start (emit ,nm :phase :start))
            (,began (get-internal-real-time)))
       (unwind-protect
            ;; Body emissions land under this span because *current-parent* is
            ;; rebound for exactly the body's dynamic extent.
            (let ((*current-parent* (envelope-id ,start)))
              ,@body)
         (emit ,nm :phase :end
                   :parent (envelope-parent-id ,start)
                   :duration-ns (%elapsed-ns ,began))))))

(defun %elapsed-ns (began)
  "Nanoseconds since BEGAN, from the implementation's internal clock."
  (round (* (- (get-internal-real-time) began)
            (/ 1000000000 internal-time-units-per-second))))

;;; ---------------------------------------------------------------------------
;;; NDJSON out — one envelope per line, the shape a downstream reader eats.
;;; Hand-rolled rather than pulling a JSON dependency into the first slice;
;;; the field set is small, fixed, and fully known.
;;; ---------------------------------------------------------------------------

(defun %json-escape (string)
  "Escape STRING per RFC 8259 §7."
  (with-output-to-string (out)
    (loop for ch across string
          do (case ch
               (#\" (write-string "\\\"" out))
               (#\\ (write-string "\\\\" out))
               (#\Newline (write-string "\\n" out))
               (#\Return (write-string "\\r" out))
               (#\Tab (write-string "\\t" out))
               (t (if (< (char-code ch) #x20)
                      (format out "\\u~4,'0x" (char-code ch))
                      (write-char ch out)))))))

(defun %json-value (v)
  "Render V as a JSON scalar. NIL is null, keywords are lowercase strings."
  (cond ((null v) "null")
        ((integerp v) (princ-to-string v))
        ((keywordp v) (format nil "\"~a\"" (string-downcase (symbol-name v))))
        ((stringp v) (format nil "\"~a\"" (%json-escape v)))
        (t (format nil "\"~a\"" (%json-escape (princ-to-string v))))))

(defun spine-write-ndjson (&optional (stream *standard-output*))
  "Write the spine as newline-delimited JSON. Key names are the v5 contract."
  ;; Through SPINE-EVENTS, not across the raw vector: after a wrap the slots are
  ;; out of order and hold evicted NILs. One door onto the ring, one order.
  (loop for e in (spine-events)
        do (format stream
                   "{\"id\":~a,\"parent_id\":~a,\"phase\":~a,\"ts\":~a,~
                    \"duration_ns\":~a,\"actor_id\":~a,\"name\":~a}~%"
                   (%json-value (envelope-id e))
                   (%json-value (envelope-parent-id e))
                   (%json-value (envelope-phase e))
                   (%json-value (envelope-ts e))
                   (%json-value (envelope-duration-ns e))
                   (%json-value (envelope-actor-id e))
                   (%json-value (envelope-name e))))
  (values))

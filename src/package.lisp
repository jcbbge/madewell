;;;; src/package.lisp — package definitions
;;;;
;;;; A package is Lisp's namespace. Symbols interned here are private unless
;;;; listed in :export. `#:name` is an uninterned symbol — the idiom for naming
;;;; things in a defpackage form without leaving stray symbols behind.

(defpackage #:constellation
  (:use #:common-lisp)
  (:nicknames #:cst)
  (:export
   ;; hello — the first executable line
   #:hello
   #:greeting

   ;; spine — the telemetry nervous system
   #:envelope
   #:envelope-id #:envelope-parent-id #:envelope-phase #:envelope-ts
   #:envelope-duration-ns #:envelope-actor-id #:envelope-name
   #:emit
   #:with-envelope
   #:spine-events
   #:spine-reset
   #:spine-write-ndjson
   #:*actor*
   #:*current-parent*
   #:*spine-capacity*

   ;; claim — the grounding contact point
   #:acquisition
   #:acquisition-id #:acquisition-kind #:acquisition-detail
   #:acquisition-result #:acquisition-ts
   #:acquire-command
   #:acquire-file
   #:acquire-operator
   #:claim
   #:claim-subject #:claim-value #:claim-acquisition
   #:ground
   #:groundedp
   #:ungrounded-claim
   #:ungrounded-claim-subject
   #:ungrounded-claim-value
   #:acquire
   #:mark-unknown
   #:refuse
   #:with-grounding-policy

   ;; escalate — the decision contact point
   #:escalation
   #:escalation-question
   #:escalation-actor
   #:escalation-default
   #:escalate
   #:with-work-unit
   #:with-escalation-policy
   #:answer
   #:use-default
   #:abandon
   #:*work-unit*

   ;; supervisor — one-for-one supervision at the OS-process boundary
   #:child
   #:child-p
   #:child-pid
   #:child-alive-p
   #:child-command
   #:child-restarts
   #:supervisor
   #:supervisor-p
   #:supervisor-children
   #:start-supervisor
   #:supervise
   #:shutdown-supervisor

   ;; dictionary — the live image describes itself
   #:dictionary-entries
   #:dictionary-json
   #:write-dictionary))

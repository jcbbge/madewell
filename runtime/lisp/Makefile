# Constellation v6 — dev loop.
# Every target is one-shot: it runs, prints, and exits. No watchers.

LISP  ?= sbcl
FLAGS := --noinform --non-interactive
QUIET := --noinform --non-interactive --disable-debugger

.PHONY: help hello test tour repl build clean deps

help:
	@echo "make hello  — build the system and print the greeting"
	@echo "make test   — run the FiveAM suite (exit 0 = green)"
	@echo "make tour   — run the annotated Lisp feature walkthrough"
	@echo "make repl   — drop into an interactive REPL with the system loaded"
	@echo "make build  — dump a native binary to ./constellation"
	@echo "make deps   — restore dependencies from ocicl.csv"
	@echo "make clean  — remove the binary and the ASDF fasl cache"

deps:
	ocicl install

hello:
	@$(LISP) $(FLAGS) \
	  --eval '(asdf:load-system :constellation)' \
	  --eval '(constellation:hello)'

test:
	@$(LISP) $(QUIET) \
	  --eval '(asdf:load-system :constellation/tests)' \
	  --eval '(uiop:quit (if (constellation/tests:run-all) 0 1))'

tour:
	@$(LISP) $(QUIET) --load tour/tour.lisp --quit

repl:
	@$(LISP) --noinform --eval '(asdf:load-system :constellation)'

build:
	@$(LISP) $(FLAGS) \
	  --eval '(asdf:load-system :constellation)' \
	  --eval '(sb-ext:save-lisp-and-die "constellation" :executable t :toplevel (lambda () (constellation:hello) 0))'
	@echo "built ./constellation"

clean:
	rm -f constellation
	rm -rf ~/.cache/common-lisp/sbcl-*/$(CURDIR)

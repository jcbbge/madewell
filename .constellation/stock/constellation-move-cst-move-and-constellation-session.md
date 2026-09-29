# constellation move (cst-move) and constellation session --move/--remove still git mv/rm/ad

**Source:** task later, 2026-09-29

constellation move (cst-move) and constellation session --move/--remove still git mv/rm/add in whatever checkout they run in; the kernel's verbs never call them, but a host could stage in main through them — make them refuse a main checkout, or land through land_write

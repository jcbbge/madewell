/* mw-move — scaffolding for SPEC.md §2. Not the product.
 *
 * Made Well is files. This binary performs the four legal moves and refuses
 * everything else. Delete it: `git mv` plus mw-gate still run the shop.
 *
 *   clang -O2 -flto -arch arm64 -mcpu=native -Wl,-dead_strip -o mw-move mw-move.c
 *
 *   mw-move arrive <slug>              stdin → stock/<slug>.md
 *   mw-move bench  <slug>              stock → bench (leaf; floor required)
 *   mw-move bench  <slug> --break      stock → bench/<slug>/PIECE.md
 *   mw-move finish <slug>              bench → finished
 *
 * Stages. Does not commit. The commit is the record (SPEC.md §2).
 * Exit: 0 ok · 4 source gone (someone else moved it) · 5 refused · 2 usage
 */
#include <dirent.h>
#include <errno.h>
#include <fcntl.h>
#include <limits.h>
#include <stdarg.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <strings.h>
#include <sys/stat.h>
#include <sys/wait.h>
#include <unistd.h>

static char root[PATH_MAX];
static char mw[PATH_MAX];

static void die(int code, const char *fmt, ...) {
    va_list ap;
    fputs("mw-move: ", stderr);
    va_start(ap, fmt);
    vfprintf(stderr, fmt, ap);
    va_end(ap);
    fputc('\n', stderr);
    exit(code);
}

static int exists(const char *path) {
    return access(path, F_OK) == 0;
}

static int mkdir_p(const char *path) {
    char buf[PATH_MAX];
    size_t n = strlen(path);
    if (n >= sizeof buf) return -1;
    memcpy(buf, path, n + 1);
    for (char *s = buf + 1; *s; s++) {
        if (*s == '/') {
            *s = 0;
            if (mkdir(buf, 0755) < 0 && errno != EEXIST) return -1;
            *s = '/';
        }
    }
    if (mkdir(buf, 0755) < 0 && errno != EEXIST) return -1;
    return 0;
}

static void find_root(void) {
    char cwd[PATH_MAX];
    if (!getcwd(cwd, sizeof cwd)) die(5, "getcwd: %s", strerror(errno));
    char probe[PATH_MAX];
    snprintf(probe, sizeof probe, "%s", cwd);
    for (;;) {
        char git[PATH_MAX], made[PATH_MAX];
        snprintf(git, sizeof git, "%s/.git", probe);
        snprintf(made, sizeof made, "%s/.madewell", probe);
        if (exists(git) && exists(made)) {
            snprintf(root, sizeof root, "%s", probe);
            snprintf(mw, sizeof mw, "%s/.madewell", probe);
            return;
        }
        char *slash = strrchr(probe, '/');
        if (!slash || slash == probe) die(5, "not inside a git repo with .madewell/");
        *slash = 0;
    }
}

static int bad_slug(const char *s) {
    if (!s || !*s) return 1;
    if (strchr(s, '.') || strchr(s, '/') || strchr(s, '@')) return 1;
    return 0;
}

static int git(char *const argv[]) {
    pid_t pid = fork();
    if (pid < 0) die(5, "fork: %s", strerror(errno));
    if (pid == 0) {
        execvp("git", argv);
        _exit(127);
    }
    int st = 0;
    waitpid(pid, &st, 0);
    if (!WIFEXITED(st)) return 1;
    return WEXITSTATUS(st);
}

static int git_mv(const char *from, const char *to) {
    char *argv[] = { "git", "-C", root, "mv", (char *)from, (char *)to, NULL };
    int rc = git(argv);
    if (rc != 0) {
        if (!exists(from)) return 4;
        return 5;
    }
    return 0;
}

static int git_add(const char *path) {
    char *add[] = { "git", "-C", root, "add", "--", (char *)path, NULL };
    return git(add);
}

static int has_floor(const char *path) {
    FILE *f = fopen(path, "r");
    if (!f) return 0;
    char line[1024];
    int m = 0, n = 0, d = 0, w = 0;
    while (fgets(line, sizeof line, f)) {
        if (!strncasecmp(line, "**Making:**", 11)) m = 1;
        else if (!strncasecmp(line, "**Not making:**", 15)) n = 1;
        else if (!strncasecmp(line, "**Done when:**", 14)) d = 1;
        else if (!strncasecmp(line, "**Waits on:**", 13)) w = 1;
    }
    fclose(f);
    return m && n && d && w;
}

static int drained(const char *rel) {
    char path[PATH_MAX];
    snprintf(path, sizeof path, "%s/%s", root, rel);
    DIR *d = opendir(path);
    if (!d) return 1;
    struct dirent *e;
    int n = 0;
    while ((e = readdir(d))) {
        if (e->d_name[0] == '.') continue;
        n++;
    }
    closedir(d);
    return n == 0;
}

static void write_all(int fd, const char *b, size_t n) {
    while (n) {
        ssize_t w = write(fd, b, n);
        if (w < 0) die(5, "write: %s", strerror(errno));
        b += (size_t)w;
        n -= (size_t)w;
    }
}

static char *read_stdin(size_t *len_out) {
    size_t cap = 4096, len = 0;
    char *b = malloc(cap);
    if (!b) die(5, "out of memory");
    if (isatty(0)) { b[0] = 0; if (len_out) *len_out = 0; return b; }
    for (;;) {
        if (len + 1 >= cap) {
            cap *= 2;
            char *n = realloc(b, cap);
            if (!n) die(5, "out of memory");
            b = n;
        }
        ssize_t r = read(0, b + len, cap - len - 1);
        if (r < 0) die(5, "read: %s", strerror(errno));
        if (r == 0) break;
        len += (size_t)r;
    }
    b[len] = 0;
    if (len_out) *len_out = len;
    return b;
}

static int anywhere(const char *slug) {
    char a[PATH_MAX], b[PATH_MAX], c[PATH_MAX], d[PATH_MAX];
    snprintf(a, sizeof a, "%s/stock/%s.md", mw, slug);
    snprintf(b, sizeof b, "%s/bench/%s.md", mw, slug);
    snprintf(c, sizeof c, "%s/bench/%s/PIECE.md", mw, slug);
    snprintf(d, sizeof d, "%s/finished/%s.md", mw, slug);
    return exists(a) || exists(b) || exists(c) || exists(d);
}

static void cmd_arrive(const char *slug) {
    if (anywhere(slug)) die(5, "%s already exists on the rack or bench", slug);
    char path[PATH_MAX], rel[PATH_MAX];
    snprintf(path, sizeof path, "%s/stock/%s.md", mw, slug);
    snprintf(rel, sizeof rel, ".madewell/stock/%s.md", slug);
    size_t n = 0;
    char *body = read_stdin(&n);
    int fd = open(path, O_WRONLY | O_CREAT | O_EXCL, 0644);
    if (fd < 0) {
        free(body);
        if (errno == EEXIST) die(5, "%s already exists", rel);
        die(5, "open %s: %s", path, strerror(errno));
    }
    if (n == 0) {
        char fallback[256];
        int m = snprintf(fallback, sizeof fallback, "# %s\n", slug);
        write_all(fd, fallback, (size_t)m);
    } else {
        write_all(fd, body, n);
        if (body[n - 1] != '\n') write_all(fd, "\n", 1);
    }
    close(fd);
    free(body);
    if (git_add(rel) != 0) die(5, "git add failed");
    printf("%s\n", rel);
}

static void cmd_bench(const char *slug, int brk) {
    char src[PATH_MAX], src_rel[PATH_MAX];
    snprintf(src, sizeof src, "%s/stock/%s.md", mw, slug);
    snprintf(src_rel, sizeof src_rel, ".madewell/stock/%s.md", slug);
    if (!exists(src)) die(4, "not on the rack: %s", src_rel);
    if (!has_floor(src))
        die(5, "%s has no floor (Making / Not making / Done when / Waits on)", src_rel);

    char dst[PATH_MAX], dst_rel[PATH_MAX];
    if (brk) {
        char inner[PATH_MAX];
        snprintf(inner, sizeof inner, "%s/bench/%s", mw, slug);
        if (mkdir_p(inner) < 0) die(5, "mkdir %s: %s", inner, strerror(errno));
        for (int i = 0; i < 3; i++) {
            const char *st = (const char *[]){ "stock", "bench", "finished" }[i];
            char d[PATH_MAX], keep[PATH_MAX], keep_rel[PATH_MAX];
            snprintf(d, sizeof d, "%s/%s", inner, st);
            if (mkdir(d, 0755) < 0 && errno != EEXIST) die(5, "mkdir %s: %s", d, strerror(errno));
            snprintf(keep, sizeof keep, "%s/.gitkeep", d);
            snprintf(keep_rel, sizeof keep_rel, ".madewell/bench/%s/%s/.gitkeep", slug, st);
            int fd = open(keep, O_WRONLY | O_CREAT, 0644);
            if (fd >= 0) close(fd);
            git_add(keep_rel);
        }
        snprintf(dst, sizeof dst, "%s/bench/%s/PIECE.md", mw, slug);
        snprintf(dst_rel, sizeof dst_rel, ".madewell/bench/%s/PIECE.md", slug);
    } else {
        snprintf(dst, sizeof dst, "%s/bench/%s.md", mw, slug);
        snprintf(dst_rel, sizeof dst_rel, ".madewell/bench/%s.md", slug);
    }
    int rc = git_mv(src_rel, dst_rel);
    if (rc == 4) die(4, "fenced: %s is gone from the rack", src_rel);
    if (rc != 0) die(5, "git mv failed");
    printf("%s\n", dst_rel);
}

static void cmd_finish(const char *slug) {
    char leaf[PATH_MAX], piece[PATH_MAX];
    snprintf(leaf, sizeof leaf, "%s/bench/%s.md", mw, slug);
    snprintf(piece, sizeof piece, "%s/bench/%s/PIECE.md", mw, slug);
    char src_rel[PATH_MAX], dst_rel[PATH_MAX];
    snprintf(dst_rel, sizeof dst_rel, ".madewell/finished/%s.md", slug);
    if (exists(leaf)) {
        snprintf(src_rel, sizeof src_rel, ".madewell/bench/%s.md", slug);
    } else if (exists(piece)) {
        char stock[PATH_MAX], bench[PATH_MAX];
        snprintf(stock, sizeof stock, ".madewell/bench/%s/stock", slug);
        snprintf(bench, sizeof bench, ".madewell/bench/%s/bench", slug);
        if (!drained(stock) || !drained(bench))
            die(5, "cannot finish %s — inner stock/ or bench/ is not empty", slug);
        snprintf(src_rel, sizeof src_rel, ".madewell/bench/%s/PIECE.md", slug);
    } else {
        die(4, "not on the bench: %s", slug);
    }
    int rc = git_mv(src_rel, dst_rel);
    if (rc == 4) die(4, "fenced: %s is gone from the bench", src_rel);
    if (rc != 0) die(5, "git mv failed");
    printf("%s\n", dst_rel);
}

static const char USAGE[] =
    "mw-move — the four legal moves (SPEC.md §2). Scaffolding, not the product.\n"
    "\n"
    "  mw-move arrive <slug>         put a piece on the rack (stdin = title + what it's about)\n"
    "  mw-move bench  <slug>         stock → bench (leaf). Floor required.\n"
    "  mw-move bench  <slug> --break stock → bench/<slug>/PIECE.md\n"
    "  mw-move finish <slug>         bench → finished. No rewind.\n"
    "\n"
    "Stages. Does not commit. Position is still the directory.\n"
    "Exit: 0 ok · 4 source gone · 5 refused · 2 usage\n";

int main(int argc, char **argv) {
    if (argc < 2) { fputs(USAGE, stdout); return 2; }
    find_root();
    const char *cmd = argv[1];
    if (strcmp(cmd, "arrive") == 0) {
        if (argc < 3 || bad_slug(argv[2])) die(5, "arrive needs a slug (no . @ /)");
        cmd_arrive(argv[2]);
    } else if (strcmp(cmd, "bench") == 0) {
        if (argc < 3 || bad_slug(argv[2])) die(5, "bench needs a slug (no . @ /)");
        int brk = (argc > 3 && strcmp(argv[3], "--break") == 0);
        cmd_bench(argv[2], brk);
    } else if (strcmp(cmd, "finish") == 0) {
        if (argc < 3 || bad_slug(argv[2])) die(5, "finish needs a slug (no . @ /)");
        cmd_finish(argv[2]);
    } else {
        fputs(USAGE, stdout);
        return 2;
    }
    return 0;
}

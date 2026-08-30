#!/usr/bin/env python3
"""Unit tests for cv_init_store.py (shared store initializer).

Run by `mise run test` (discovery pattern skills/**/test_*.py).
Builds throwaway git repos under a temp dir; never touches the real HOME.
"""
import os
import pathlib
import subprocess
import sys
import tempfile
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import cv_init_store as cvis


def git(repo, *args):
    env = dict(os.environ)
    env.update({
        "GIT_AUTHOR_NAME": "t", "GIT_AUTHOR_EMAIL": "t@example.com",
        "GIT_COMMITTER_NAME": "t", "GIT_COMMITTER_EMAIL": "t@example.com",
    })
    subprocess.run(
        ["git", "-C", str(repo), *args],
        check=True, capture_output=True, text=True, env=env,
    )


def make_repo(base, name):
    repo = base / name
    repo.mkdir(parents=True)
    git(repo, "init", "-q")
    (repo / "file.txt").write_text("x")
    git(repo, "add", "file.txt")
    git(repo, "commit", "-qm", "init")
    return repo


class StoreInit(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self._tmp.cleanup)
        self.base = pathlib.Path(self._tmp.name)
        self.home = self.base / "home"
        self.home.mkdir()

    def test_regular_repo_creates_symlink_named_by_slug(self):
        repo = make_repo(self.base, "My Proj")
        slug = cvis.init_store(repo, home=self.home)
        self.assertEqual(slug, "my-proj")
        link = repo / ".codevoyant"
        self.assertTrue(link.is_symlink())
        self.assertEqual(os.readlink(link), str(self.home / ".codevoyant" / "my-proj"))
        self.assertIn(".codevoyant", (repo / ".gitignore").read_text().splitlines())

    def test_worktree_and_main_repo_share_one_store(self):
        repo = make_repo(self.base, "origin-repo")
        wt = self.base / "wt-checkout"
        git(repo, "worktree", "add", "-q", "-b", "wt", str(wt))
        slug_main = cvis.init_store(repo, home=self.home)
        slug_wt = cvis.init_store(wt, home=self.home)
        self.assertEqual(slug_wt, slug_main)
        self.assertEqual(
            os.readlink(wt / ".codevoyant"),
            os.readlink(repo / ".codevoyant"),
        )

    def test_idempotent_and_single_gitignore_entry(self):
        repo = make_repo(self.base, "idem")
        cvis.init_store(repo, home=self.home)
        cvis.init_store(repo, home=self.home)
        lines = (repo / ".gitignore").read_text().splitlines()
        self.assertEqual(lines.count(".codevoyant"), 1)
        self.assertTrue((repo / ".codevoyant").is_symlink())

    def test_existing_real_dir_left_untouched(self):
        repo = make_repo(self.base, "realdir")
        (repo / ".codevoyant").mkdir()
        cvis.init_store(repo, home=self.home)
        self.assertTrue((repo / ".codevoyant").is_dir())
        self.assertFalse((repo / ".codevoyant").is_symlink())

    def test_non_git_dir_falls_back_to_basename_slug(self):
        plain = self.base / "Plain Dir"
        plain.mkdir()
        slug = cvis.init_store(plain, home=self.home)
        self.assertEqual(slug, "plain-dir")
        self.assertTrue((plain / ".codevoyant").is_symlink())

    def test_slug_parity_with_bash_pipeline(self):
        # Names that exercise lowercasing, runs of specials, and leading/trailing hyphens.
        cases = {
            "Codevoyant": "codevoyant",
            "My--Cool  Repo!!": "my-cool-repo",
            "__edge__": "edge",
            "already-lower": "already-lower",
        }
        for name, want in cases.items():
            d = self.base / name
            d.mkdir()
            self.assertEqual(cvis.compute_slug(d), want, name)

    def test_cli_prints_slug(self):
        repo = make_repo(self.base, "cli-repo")
        import io
        import contextlib
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            rc = cvis.main(["cv_init_store.py", str(repo)])
        self.assertEqual(rc, 0)
        self.assertEqual(buf.getvalue().strip(), "cli-repo")


if __name__ == "__main__":
    unittest.main()

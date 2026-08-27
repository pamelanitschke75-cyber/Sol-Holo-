from pathlib import Path

patch_file = Path("tools/patch_memory_v2.py")
text = patch_file.read_text(encoding="utf-8")
old = "r'''let microphoneStream =\\s*\\n\\s*null;'''"
new = "r'''let microphoneStream\\s*=\\s*null;'''"

if old not in text:
    raise SystemExit("Expected microphoneStream regex not found")

text = text.replace(old, new, 1)
patch_file.write_text(text, encoding="utf-8")
exec(compile(text, str(patch_file), "exec"), {"__name__": "__main__"})

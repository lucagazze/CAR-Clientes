import re

diff_content = open('scratch/diff.patch').read()
line_num = 0
for line in diff_content.split('\n'):
    line_num += 1
    if line.startswith('+') and not line.startswith('+++'):
        opens = re.findall(r'<div\b[^>]*>', line)
        closes = re.findall(r'</div\b[^>]*>', line)
        for o in opens:
            print(f"Diff Line {line_num} (+): Open '{o}'")
        for c in closes:
            print(f"Diff Line {line_num} (+): Close '{c}'")
    elif line.startswith('-') and not line.startswith('---'):
        opens = re.findall(r'<div\b[^>]*>', line)
        closes = re.findall(r'</div\b[^>]*>', line)
        for o in opens:
            print(f"Diff Line {line_num} (-): Open '{o}'")
        for c in closes:
            print(f"Diff Line {line_num} (-): Close '{c}'")

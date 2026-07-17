#!/usr/bin/env python3
"""Convert GitHub release-note Markdown to Slack mrkdwn, then JSON-encode.

Reads from stdin, writes a JSON string to stdout.

Conversions applied:
  ## Heading        →  *Heading*
  **bold**          →  *bold*
  [label](url)      →  <url|label>
  * bullet          →  • bullet
"""
import json
import re
import sys

MAX_CHARS = 2900  # Slack section block limit is 3000; leave headroom

text = sys.stdin.read()
text = re.sub(r"^#{1,3} (.+)$", r"*\1*", text, flags=re.MULTILINE)
text = re.sub(r"\*\*(.+?)\*\*", r"*\1*", text)
text = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r"<\2|\1>", text)
text = re.sub(r"^\* ", "• ", text, flags=re.MULTILINE)
text = text[:MAX_CHARS]
print(json.dumps(text))

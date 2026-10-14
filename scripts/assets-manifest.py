import base64, hashlib, json
from pathlib import Path
root=Path(__file__).resolve().parent.parent/'dist'
manifest={}
for p in sorted(root.rglob('*')):
 if p.is_file():
  raw=p.read_bytes()
  digest=hashlib.sha256(base64.b64encode(raw)+p.suffix.lstrip('.').encode()).hexdigest()[:32]
  manifest['/'+str(p.relative_to(root))]={'hash':digest,'size':len(raw)}
print(json.dumps(manifest))

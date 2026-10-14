# Deployment helper. Read short-lived upload authorization from stdin, never arguments.
import sys, json, base64, hashlib, mimetypes, urllib.request
from pathlib import Path
session=json.loads(sys.stdin.readline())
root=Path(__file__).resolve().parent.parent/'dist'
files={}
for p in sorted(root.rglob('*')):
 if p.is_file():
  data=p.read_bytes()
  digest=hashlib.sha256(base64.b64encode(data)+p.suffix.lstrip('.').encode()).hexdigest()[:32]
  files[digest]=p
if 'bucket_indices' in session:
 hashes=list(files)
 session['buckets']=[[hashes[i] for i in bucket] for bucket in session['bucket_indices']]
completion=session['jwt'] if not session['buckets'] else None
for bucket in session['buckets']:
 boundary='kutuma-assets-boundary'
 parts=[]
 for digest in bucket:
  p=files[digest]
  mime=mimetypes.guess_type(p.name)[0] or 'application/octet-stream'
  parts.extend([('--'+boundary).encode(),f'Content-Disposition: form-data; name="{digest}"; filename="{digest}"'.encode(),('Content-Type: '+mime).encode(),b'',base64.b64encode(p.read_bytes())])
 parts.extend([('--'+boundary+'--').encode(),b''])
 req=urllib.request.Request('https://api.cloudflare.com/client/v4/accounts/bdfeb7aa9f79e31fd1590154715abdc6/workers/assets/upload?base64=true',data=b'\r\n'.join(parts),headers={'Authorization':'Bearer '+session['jwt'],'Content-Type':'multipart/form-data; boundary='+boundary},method='POST')
 with urllib.request.urlopen(req,timeout=120) as response:r=json.load(response)
 if not r.get('success'):raise RuntimeError('Asset upload failed')
 if r.get('result',{}).get('jwt'):completion=r['result']['jwt']
if not completion:raise RuntimeError('No asset completion token')
# Machine-readable deployment result. Consume in orchestration memory; do not log.
print(json.dumps({'jwt':completion}))

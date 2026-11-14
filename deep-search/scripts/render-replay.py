"""Render recorded, headless simulation evidence. This is not a recording of the web UI."""
import json, pathlib
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.animation import FFMpegWriter
import numpy as np
root=pathlib.Path(__file__).resolve().parents[1]
frames=json.loads((root/'docs/replay.json').read_text())
fig,ax=plt.subplots(figsize=(12,7),dpi=100)
fig.patch.set_facecolor('#edf2f3')
fig.subplots_adjust(bottom=.18,top=.87)
colors=['#63d8ef','#ffd872','#ef9bba','#a9d67b','#c1acff','#ff9d68']
writer=FFMpegWriter(fps=10,codec='libx264',extra_args=['-pix_fmt','yuv420p'])
with writer.saving(fig,str(root/'docs/backup-replay.mp4'),100):
 for frame in frames:
  ax.clear();b=np.array(frame['belief']).reshape(40,60)
  ax.imshow(np.sqrt(b),cmap='cividis',origin='upper',aspect='auto')
  for drone in frame['drones']:
   x,y=drone['pos']['x'],drone['pos']['y'];ax.scatter(x,y,s=65,c=colors[drone['id']],edgecolors='white');ax.text(x+1,y-1,str(drone['id']+1),color='white')
  if frame['box'] is not None:ax.scatter(frame['box']%60,frame['box']//60,marker='*',s=300,color='red',edgecolor='white')
  ax.set_title(f"Deep Search | {frame['strategy']} | tick {frame['tick']} | packet loss 70%",fontsize=19,pad=18,color='#163b4c')
  ax.set_xlabel(f"Hub: {'online' if frame['hub'] else 'offline'}    Acoustic links: {'blackout' if frame['storm'] else 'available'}    Coverage: {frame['metrics']['coverage']:.1f}%",fontsize=13)
  fig.suptitle('Recorded simulation replay • unsigned experiment mode • no on-chain settlement',fontsize=11,y=.035)
  writer.grab_frame()
plt.close(fig)
print(root/'docs/backup-replay.mp4')

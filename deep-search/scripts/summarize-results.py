import json,pathlib
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
root=pathlib.Path(__file__).resolve().parents[1]
data=json.loads((root/'public/results.json').read_text())
colors={'ours':'#087a91','centralized':'#aa6550','nocomm':'#7d789d'}
labels={'ours':'Decentralized','centralized':'Mothership','nocomm':'No comms'}
fig,axes=plt.subplots(1,2,figsize=(13,5),layout='constrained')
for strategy in colors:
 rows=[r for r in data['rows'] if r['strategy']==strategy];x=[r['packetLoss']*100 for r in rows]
 axes[0].plot(x,[r['median'] for r in rows],label=labels[strategy],c=colors[strategy],lw=2)
 axes[0].fill_between(x,[r['q25'] for r in rows],[r['q75'] for r in rows],color=colors[strategy],alpha=.1)
 axes[1].plot(x,[r['successRate']*100 for r in rows],label=labels[strategy],c=colors[strategy],lw=2)
for ax in axes:ax.set_xlabel('Packet loss (%)');ax.grid(alpha=.2);ax.legend(frameon=False)
axes[0].set_ylabel('Ticks to detection (median and interquartile range)');axes[1].set_ylabel('Missions finding the box (%)');axes[1].set_ylim(0,105)
fig.suptitle(f"Deep Search: {data['seeds']} paired seeds per condition; unsuccessful runs capped at 3,000 ticks")
fig.savefig(root/'docs/results-chart.png',dpi=160);fig.savefig(root/'docs/results-chart.svg');plt.close(fig)
lines=['# Measured results','',f"{len(data['runs']):,} missions; {data['seeds']} paired seeds per condition. Generated {data['generatedAt']}. Full data: `../public/results.json`.",'','| Scenario | Strategy | Packet loss | Median ticks | 25–75% | Found | Redundant scans |','|---|---|---:|---:|---:|---:|---:|']
for scenario,rows in [('Normal',data['rows']),('Hub killed at 200',data['failure'])]:
 for r in rows:
  if scenario=='Normal' and r['packetLoss'] not in [0,.7]:continue
  lines.append(f"| {scenario} | {labels[r['strategy']]} | {r['packetLoss']*100:.0f}% | {r['median']:g} | {r['q25']:g}–{r['q75']:g} | {r['successRate']*100:.0f}% | {r['redundancy']:.1f}% |")
lines += ['', 'The expected ranking in the brief is not universal. Decentralized gossip beats no-comms at 70% loss in this sample, but loses at zero loss. The centralized strategy is not the fastest at zero loss either. High message reliability does not guarantee efficient movement: the specified policy can repeatedly coordinate around nearby targets. This explanation is a hypothesis about the policy, not a separately controlled experiment.', '', 'Hub failure strongly exposes dependence on central assignments. Decentralized results are unchanged by killing an unused mothership. Some centralized missions finish before tick 200; the success rate includes those runs. The full 0–90% sweep, including unfavorable conditions, is retained.', '', 'These are deterministic simulation results under one prior and one parameter setting. Fifty seeds describe variability in this setup, not validation on real ocean missions. The shaded chart bands are interquartile ranges, not confidence intervals. Failures are censored at maxTicks; a median of 3,000 indicates censoring rather than a measured detection.', '', 'No parameter tuning was performed to force a winning ranking. A correction to the redundancy metric and the centralized replanning interval was applied before the final sweep.', '', '![Measured chart](results-chart.png)']
(root/'docs/results-summary.md').write_text('\n'.join(lines)+'\n')

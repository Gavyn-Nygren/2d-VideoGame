#!/bin/sh
# 25-1 Defend the Heart: the computer-partner checks (pair, noisy, idle, solo), with waves survived per run.
# Usage (from the repo folder): sh tools/w25/zf-runs.sh [max seconds]
MAX=${1:-1800}
for WHO in pair noisy idle solo; do
  M=$MAX; [ "$WHO" = idle ] && M=600
  node tools/cpu-test.js 25-1 --who=$WHO --max=$M --seeds=1,2,3 --json | node -e '
    let s = ""; process.stdin.on("data", d => s += d).on("end", () => {
      for (const x of JSON.parse(s)) {
        const w = x.stats && x.stats.find(t => t && t.label === "Waves survived");
        console.log(process.argv[1].padEnd(6), "seed " + x.seed, (x.mode === "clear" ? "game over" : "still playing").padEnd(13),
          "waves " + (w ? w.value : "-"), "sim " + x.simT + "s", "errors " + (x.errors.length + x.cpuErrs.length), x.errors.concat(x.cpuErrs).join(" | ").slice(0, 300));
      }
    });' $WHO
done

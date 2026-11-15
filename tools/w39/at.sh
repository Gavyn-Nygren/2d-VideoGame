#!/bin/sh
# node trace around a time: tools/w39/at.sh <mode> <seed> <from> <to> <expr>
node tools/w39/trace.js "$1" --seed="$2" --watch=all --every=0.05 --max="$4" --expr="(st.T||0)>=0&&G.time>=$3?($5):''" 2>&1 | grep -v '^  t=[0-9.]* $' | tail -n +2

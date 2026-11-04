/* Pip & Bo - Computer partner: 12-2 Bobsled. */
'use strict';

/* Both ride one sled; each run (room) names the pilot (front, st.pilot) and the brakeman (back, st.brake), and the
   jobs swap every run, so the brain plays whichever seat its character has in this run. Like a person it reads the
   course from what is on screen: the boards, chevrons and the badge cues (MODES.bobsled.api.needs / ahead), the beat
   dot, and the speed in the HUD.
   - Push start: it pushes (action) on every beat (a little off the beat on easy, never outside the beat window), so a
     person who pushes on the beat gets TOGETHER! bonuses, and hops in (▲) late in the gold zone, after the last push.
   - Both seats, in the run: it leans (◀▶) the way the next curve goes once the lean cue shows (about 1 s before the
     curve, after a short reaction: 0.12 s hard, 0.2 normal, 0.28 easy), holds it steady through the curve, flips on
     S-bends when the "Flip" cue shows, and lets go on the straight after. It tucks (▼) in tuck zones and hops (▲)
     once, about 0.4 s before each jump bump, so a person hopping on their own cue still gets Big air.
   - Pilot: on the straights it steers to the next snow ring, and taps the action once per curve to CALL it (the call
     shows the curve in the person's brakeman badge early).
   - Brakeman: it holds the brake from the first BRAKE board (a little later on hard, never later than the second
     board) until the speed is down to hairpin speed, and never brakes anywhere else.
   - Helping a slow person: it can't do the person's job (the level counts the person's own keys), so it says what to do
     in short bubbles, only in 1-player mode and at most one every few seconds: "Push with me!", "Hop in!", "Lean ▶
     with me!" (the person isn't leaning in a curve), "Brake now!" (the person brakes and is too fast for a hairpin),
     "Tuck!", "Hop!". The sled itself waits: a curve nobody leaned in together can't be left, and 10 s with no press
     from the person pauses it ("Brrr!"); the computer taps ▼ on long empty straights so it never counts as away itself.
   It reads only what a person sees: the badges' cues, the course ahead, the speed, the sled's place on the track,
   the beat dot and whether the partner is in, pushing, leaning or hopping.
   It never finishes a run alone: every curve needs both riders' leans, so with an idle person the sled stops on the lip
   of the first curve (and after the core's idle stop the computer waits too). */
(() => {
  const API = () => MODES.bobsled.api, K = () => MODES.bobsled.BOB;
  const ARROW = d => (d > 0 ? '▶' : '◀');

  // a short bubble for the person, at most one every few seconds (rarer each time the same words come back)
  function say(S, p, text, gap = 3.5) {
    if (G.mst && G.mst.afk) return; // (the sled waits for someone to press: no chatter over "Brrr!")
    const n = (S.sayN && S.sayN[text]) || 0;
    if (G.time - (S.saidT == null ? -99 : S.saidT) < gap * (1 + Math.floor(n / 3))) return;
    S.saidT = G.time; S.sayN = S.sayN || {}; S.sayN[text] = n + 1;
    cpuSay(p, text, 1.8);
  }
  const react = info => 0.12 + (1 - info.skill) * 0.25;

  /* ---------- the push start ---------- */
  function push(S, p, o, st, info, out) {
    const k = K(), s = st.s, me = st.r[p.id];
    if (me.in) return out;
    // the beat: one push per beat, aimed a hair after it (jitter by skill, always inside the window)
    const nb = Math.round(st.pt / k.beat);
    if (S.beatAim == null || S.beatAimFor !== nb) { S.beatAimFor = nb; S.beatAim = (Math.random() - 0.3) * (0.02 + (1 - info.skill) * 0.06); }
    const off = st.pt - nb * k.beat;
    if (S.pushed !== nb && off >= S.beatAim && off <= k.beatWin * 0.8) { out.act = 'tap'; S.pushed = nb; }
    // hop in late in the gold zone (the last pushes count the most)
    if (s.z >= -k.hopLen * 0.45) out.jump = 'tap';
    // a person who isn't pushing yet / isn't in yet
    if (!info.partnerCpu) {
      if (st.pt > 1.2 && st.stats.pushes[o.id] === 0) say(S, p, 'Push with me!');
      if (s.z >= -k.hopLen * 0.55 && !st.r[o.id].in) say(S, p, 'Hop in!', 2);
    }
    return out;
  }

  /* ---------- the run ---------- */
  function run(S, p, o, st, dt, info, out) {
    const k = K(), api = API(), s = st.s, nd = api.needs(st), pilot = p.id === st.pilot;
    // lean: the cue the badge shows, after a short reaction
    const lean = cpuLag(S, 'lean', nd.lean || 0, react(info));
    if (lean) { out.right = lean > 0; out.left = lean < 0; }
    // tuck zones (a moment before them too, harmless on a straight)
    if (nd.tuck) out.down = true;
    // jump bumps: one hop about 0.4 s before the crest
    if (nd.bump && nd.bump.t < 0.42) {
      const bz = Math.round(s.z + nd.bump.t * s.v);
      if (S.hopFor == null || Math.abs(S.hopFor - bz) > 30) { S.hopFor = bz; out.jump = 'tap'; }
    }
    if (pilot) {
      // steer to the next ring on the straights (a curve's lean comes first)
      if (!lean && !nd.lean) {
        const rg = api.ahead(st, 80).find(f => f.kind === 'ring');
        if (rg && Math.abs(s.u) <= k.steerMax + 0.01) {
          const err = rg.u - s.u;
          if (err > 0.05) out.right = true; else if (err < -0.05) out.left = true;
        }
      }
      // call each curve once, as its cue comes up
      if (nd.early && nd.early.t < 2.6 && nd.early.t > 0.3 && S.called !== nd.early.i) { S.called = nd.early.i; out.act = 'tap'; }
    } else if (nd.hair) {
      // brake from the first BRAKE board (hard: as late as still safe, never past the second board) to hairpin speed
      const need = (s.v * s.v - k.hpMax * k.hpMax) / (2 * k.brakeDec) + 3 + (1 - info.skill) * 25;
      const from = Math.min(k.brakeSign - 2, Math.max(k.hpZone, need));
      if (nd.hair.d <= from && s.v > k.hpMax + 0.25) out.act = true;
    }
    // the level's "Brrr!" pause counts any rider's 10 s without a press, the computer's too: on a long straight with
    // nothing to do, it taps ▼ (no effect outside tuck zones) while the person is playing, so only a person who has
    // walked away pauses the sled, and a person coming back unpauses it at once
    if (G.time - st.lastIn[p.id] > k.afkT * 0.6 && info.partnerIdle < 1) out.down = true;
    if (!info.partnerCpu) talk(S, p, o, st, dt, nd, info);
    return out;
  }

  // bubbles for a person who is late with their part
  function talk(S, p, o, st, dt, nd, info) {
    const k = K(), api = API(), s = st.s, oi = o.input;
    if (info.partnerIdle > 3) return; // (looking away: the level's own "Brrr!" speaks for itself)
    // a curve: the person isn't leaning its way and the sled wobbles up the wall (a flip a moment late is fine)
    const cv = api.curveAt(st, s.z), want = nd.lean || (cv ? cv.dir : 0);
    const off = cpuFor(S, 'leanOff', want && cv && api.leanOf(st, o.id) !== want && Math.abs(s.u) > 1.3, dt);
    if (off > 0.3) say(S, p, 'Lean ' + ARROW(want) + ' with me!', 2.5);
    // the person brakes: too fast for the hairpin ahead
    if (o.id === st.brake && nd.hair && nd.hair.d < k.brakeSign - 12 && s.v > k.hpMax + k.hpTol && !oi.act) say(S, p, 'Brake now!', 3);
    // tuck zones and bumps
    if (cpuFor(S, 'noTuck', nd.tuck && nd.tuck.inside && !oi.down, dt) > 0.6) say(S, p, 'Tuck!', 5);
    if (nd.bump && nd.bump.t < 0.35 && G.time - (st.hopP[o.id] || -99) > 0.8) say(S, p, 'Hop!', 4);
  }

  cpuBrain('bobsled', {
    reset(S) { S.called = -1; S.pushed = null; S.hopFor = null; },
    think(S, p, o, dt, info) {
      const out = {}, st = info.mst;
      if (!st || !st.s || info.intro) return out;
      if (st.phase === 'push') return push(S, p, o, st, info, out);
      if (st.phase === 'run') return run(S, p, o, st, dt, info, out);
      if (st.phase === 'finish' && !info.partnerCpu && !S.cheered) { S.cheered = true; say(S, p, st.lastRunT && st.k < 3 ? 'Great run!' : 'We did it!', 0); }
      return out;
    },
  });
})();

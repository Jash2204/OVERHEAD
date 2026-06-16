#!/usr/bin/env python3
# OVERHEAD v9 — trim the feature tour (31 -> 12 steps) to match the grouped menu.
import io
P="index.html"; src=io.open(P,encoding="utf-8").read()
a=src.index("const OH_TOUR=[")
b=src.index("\n];", a)+len("\n];")
old=src[a:b]
assert old.count("{t:")>=25, "tour array sanity"

new="""const OH_TOUR=[
 {t:'OVERHEAD', b:'This is the real sky above you, live — aircraft, the space station, stars, planets and more, exactly as they sit overhead right now. A quick tour; tap Next, or Skip if you know your way around.'},
 {t:'The dome', b:'The whole screen is the sky as if you were lying on your back. The centre is straight up; the outer edge is the horizon all around you.'},
 {t:'Time & place', sel:'#hud-top', b:'The live time, and the location everything is calculated for. Allow location access and it locks to your exact sky.'},
 {t:'ZENYTH \\u00b7 location', sel:'#b-zenyth', b:'No GPS, or want to stand somewhere else? Teleport the sky to any major city or world-class dark-sky site, or type your own coordinates. Your own spot stays live; teleports show that place at its local midnight.'},
 {t:'Sky objects', sel:'#g-sky', b:'Everything in the night sky — stars, constellations, planets, the Moon, the Milky Way and active meteor showers. Open it to show or hide each one.'},
 {t:'Overhead traffic', sel:'#g-traffic', b:'The things crossing over right now: real aircraft from live ADS-B, the ISS and its path, and satellites. Open it to toggle each, or turn on flight paths. Click a plane for its details.'},
 {t:'View', sel:'#g-view', b:'How the sky is framed — full-screen or round dome, the photoreal ambient mode, and phone orientation so the dome turns as you turn.'},
 {t:'Style', sel:'#g-style', b:'The look — realistic nav-light planes, how dark your skies are (city to remote), depth, motion trails and on-screen labels.'},
 {t:'Projector', sel:'#g-proj', b:'Projector mode (pure black, large text), render sharpness with a live frame-rate readout, and a manual data refresh.'},
 {t:'Open sky output', sel:'#b-output', b:'Opens a clean, controls-free window to drag onto a projector and cast on the ceiling.'},
 {t:'Record the sky', sel:'#b-record', b:'Records a sped-up time-lapse straight to your Downloads — an hour of sky becomes about a minute of video. It streams safely to disk as it records, so even an unexpected tab-close can be recovered next time.'},
 {t:'Up next & alerts', sel:'#oh-countdown', b:'Approximate timings for the next ISS pass, meteor shower and bright constellations — a guide for fun, not navigation. Allow location and OVERHEAD can alert you the moment the ISS is overhead. Mute with the bell; replay this tour any time with the ? top-left.'}
];"""

src=src[:a]+new+src[b:]
io.open(P,"w",encoding="utf-8").write(src)
print(f"tour: {old.count('{t:')} steps -> {new.count('{t:')} steps")
